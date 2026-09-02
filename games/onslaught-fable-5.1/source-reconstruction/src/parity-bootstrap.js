import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { PerformanceGovernor } from './game/performance.js';

const sleepFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
while (!window.game?.scene || !window.game?.renderer || !window.game?.camera) await sleepFrame();

const { scene, camera, renderer, state } = window.game;
const touch = navigator.maxTouchPoints > 0 || matchMedia?.('(pointer:coarse)').matches;

const findViewmodelRoot = () => camera.children.find(child => child.isGroup && child.children.some(n => n.isMesh || n.isGroup));
let viewmodelRoot = findViewmodelRoot();

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.25 : 1.6));
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), touch ? 0.42 : 0.62, 0.52, 0.78);
composer.addPass(bloom);

const cinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    aberration: { value: touch ? 0.00075 : 0.00115 },
    radial: { value: 0 },
    vignette: { value: 0.36 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float aberration;
    uniform float radial;
    uniform float vignette;
    varying vec2 vUv;
    void main(){
      vec2 c=vUv-.5;
      float d=length(c);
      vec2 dir=normalize(c+vec2(1e-5));
      vec2 ca=dir*aberration*(.35+d*1.4);
      vec2 blur=dir*radial*d*.012;
      vec3 col;
      col.r=texture2D(tDiffuse,vUv+ca-blur).r;
      col.g=texture2D(tDiffuse,vUv).g;
      col.b=texture2D(tDiffuse,vUv-ca+blur).b;
      float vig=smoothstep(.82,.18,d);
      col*=mix(1.0,vig,vignette);
      gl_FragColor=vec4(col,1.0);
    }
  `
};
const cinematic = new ShaderPass(cinematicShader);
composer.addPass(cinematic);

const nativeRender = renderer.render.bind(renderer);
const originalAutoClear = renderer.autoClear;
let rendering = false;

function renderViewmodelOverlay(){
  viewmodelRoot = viewmodelRoot || findViewmodelRoot();
  if (!viewmodelRoot) return;
  const visible = [];
  for (const child of scene.children) {
    if (child === camera || child.isLight) continue;
    visible.push([child, child.visible]);
    child.visible = false;
  }
  viewmodelRoot.visible = true;
  renderer.autoClear = false;
  renderer.clearDepth();
  nativeRender(scene, camera);
  renderer.autoClear = originalAutoClear;
  for (const [child, wasVisible] of visible) child.visible = wasVisible;
}

function parityRender(targetScene, targetCamera){
  if (rendering || targetScene !== scene || targetCamera !== camera) return nativeRender(targetScene, targetCamera);
  rendering = true;
  viewmodelRoot = viewmodelRoot || findViewmodelRoot();
  const vmWasVisible = viewmodelRoot?.visible;
  if (viewmodelRoot) viewmodelRoot.visible = false;
  renderer.render = nativeRender;
  composer.render();
  renderer.render = parityRender;
  if (viewmodelRoot) viewmodelRoot.visible = vmWasVisible ?? true;
  renderViewmodelOverlay();
  rendering = false;
}
renderer.render = parityRender;

const tracked = new WeakMap();
const dissolving = new Set();
function cloneEnemyMaterials(root){
  root.traverse?.(obj => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map(mat => {
      const c = mat?.clone?.() || mat;
      if (c) c.transparent = c.transparent || false;
      return c;
    });
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });
}
function flash(root){
  root.traverse?.(obj => {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat?.color) continue;
      mat.userData ||= {};
      if (!mat.userData.parityBaseColor) mat.userData.parityBaseColor = mat.color.clone();
      mat.color.set(0xffffff);
      if (mat.emissive) { mat.userData.parityBaseEmissive ||= mat.emissive.clone(); mat.emissive.set(0x5ef2ff); }
    }
  });
  setTimeout(() => root.traverse?.(obj => {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (mat?.userData?.parityBaseColor) mat.color.copy(mat.userData.parityBaseColor);
      if (mat?.emissive && mat?.userData?.parityBaseEmissive) mat.emissive.copy(mat.userData.parityBaseEmissive);
    }
  }), 55);
}
function dissolve(root){
  if (!root || dissolving.has(root)) return;
  dissolving.add(root);
  const start = performance.now();
  const duration = touch ? 180 : 260;
  const tick = now => {
    const t = Math.min(1, (now-start)/duration);
    root.scale.setScalar(1 + t*.08);
    root.position.y -= .8 * (1/60) * t;
    root.traverse?.(obj => {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) if (mat) { mat.transparent = true; mat.opacity = 1-t; mat.depthWrite = t < .55; }
    });
    if (t < 1 && root.parent) requestAnimationFrame(tick);
    else dissolving.delete(root);
  };
  requestAnimationFrame(tick);
}

function effectsWatchdog(){
  for (const root of state?.enemies || []) {
    const hp = root.userData?.hp;
    if (!tracked.has(root)) { cloneEnemyMaterials(root); tracked.set(root, hp); continue; }
    const prev = tracked.get(root);
    if (typeof hp === 'number' && typeof prev === 'number' && hp < prev) flash(root);
    tracked.set(root, hp);
    const dist = root.position.distanceTo(camera.position);
    root.traverse?.(obj => { if (obj.isMesh) obj.visible = dist < 58 || !touch; });
  }
  requestAnimationFrame(effectsWatchdog);
}
requestAnimationFrame(effectsWatchdog);

window.addEventListener('resize', () => {
  composer.setSize(innerWidth, innerHeight);
  cinematic.uniforms.resolution.value.set(innerWidth, innerHeight);
});

(function driveRadial(){
  const sliding = state?.sliding ? 1 : 0;
  const sprinting = state?.running && (state?.velocity?.length?.() || 0) > 6.5 ? 1 : 0;
  cinematic.uniforms.radial.value = THREE.MathUtils.lerp(cinematic.uniforms.radial.value, sliding ? .85 : sprinting ? .34 : 0, .12);
  requestAnimationFrame(driveRadial);
})();

const governor = new PerformanceGovernor({ renderer, composer, camera, state, bloom, cinematic });
governor.start();

window.game.parity = Object.assign(window.game.parity || {}, {
  composer, bloom, cinematic, governor,
  flashEnemy: flash,
  dissolveEnemy: dissolve,
  renderMode: 'postprocessed-world + depth-cleared-viewmodel',
  lowPower: touch
});
