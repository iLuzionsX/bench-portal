import * as THREE from 'three';
import './style.css';
import { WEAPONS, WEAPON_ORDER } from './game/weapons.js';
import { archetypeForWave } from './game/enemies.js';
import { CombatAudio } from './game/audio.js';
import { spawnTracer, spawnImpact, spawnShell } from './game/fx.js';
import { ViewmodelSpring } from './game/viewmodel.js';
import { ASSET_MANIFEST, loadOptionalModel, fitModelToBounds } from './game/assets.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="menu" id="menu"><div class="panel">
    <div class="kicker">ARENA PROTOCOL // SECTOR 7</div><h1>ONSLAUGHT</h1>
    <p class="sub">HOLD THE LINE AGAINST THE SWARM</p>
    <button class="start" id="start">ENTER ARENA</button>
    <div class="hint">WASD MOVE · SHIFT SPRINT · C SLIDE · RMB ADS · R RELOAD · 1/2/3 WEAPONS</div>
  </div></div>
  <div class="hud hidden" id="hud">
    <div class="top"><div class="stat">WAVE<b id="wave">1</b></div><div class="stat">HOSTILES<b id="hostiles">0</b></div><div class="stat">KILLS<b id="kills">0</b></div></div>
    <div class="health"><div class="health-label">VITALS <span id="hp">100</span></div><div class="bar"><i id="hpbar"></i></div></div>
    <div class="weapon"><div class="weapon-name" id="weaponName"></div><div class="ammo"><span id="ammo"></span><small> / <span id="reserve"></span></small></div></div>
    <div class="crosshair"></div>
  </div><div class="damage" id="damage"></div>`;

const ui = {
  menu: document.querySelector('#menu'), start: document.querySelector('#start'), hud: document.querySelector('#hud'),
  wave: document.querySelector('#wave'), hostiles: document.querySelector('#hostiles'), kills: document.querySelector('#kills'),
  hp: document.querySelector('#hp'), hpbar: document.querySelector('#hpbar'), weaponName: document.querySelector('#weaponName'),
  ammo: document.querySelector('#ammo'), reserve: document.querySelector('#reserve'), damage: document.querySelector('#damage')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070c);
scene.fog = new THREE.FogExp2(0x05070c, 0.024);
const camera = new THREE.PerspectiveCamera(78, innerWidth / innerHeight, 0.05, 220);
camera.position.set(0, 1.72, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x8ddcff, 0x111318, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 2.3); key.position.set(5, 10, 7); scene.add(key);
const cyan = new THREE.PointLight(0x5ef2ff, 30, 22, 2); cyan.position.set(0, 5, 0); scene.add(cyan);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90, 20, 20), new THREE.MeshStandardMaterial({ color: 0x10161d, metalness: .25, roughness: .82 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const grid = new THREE.GridHelper(90, 45, 0x24424e, 0x17242c); grid.position.y = .01; scene.add(grid);
for (let i = 0; i < 28; i++) {
  const w = 1 + Math.random() * 3, h = 1 + Math.random() * 4, d = 1 + Math.random() * 3;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x151e26, metalness: .6, roughness: .62 }));
  const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 24;
  m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); m.rotation.y = Math.random() * Math.PI; scene.add(m);
}

const state = {
  running: false, hp: 100, wave: 1, kills: 0, weaponIndex: 0, ammo: {}, reserve: {}, reloading: false,
  nextShot: 0, enemies: [], spawnLeft: 0, nextWaveAt: 0, yaw: 0, pitch: 0, ads: false,
  fireHeld: false, sliding: false, slideTime: 0, slideDir: new THREE.Vector3(), velocity: new THREE.Vector3()
};
for (const id of WEAPON_ORDER) { state.ammo[id] = WEAPONS[id].magSize; state.reserve[id] = WEAPONS[id].reserve; }
const keys = new Set();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const audio = new CombatAudio();
const fx = [];

function currentWeapon() { return WEAPONS[WEAPON_ORDER[state.weaponIndex]]; }
function updateHud() {
  const w = currentWeapon();
  ui.weaponName.textContent = w.name; ui.ammo.textContent = state.ammo[w.id]; ui.reserve.textContent = state.reserve[w.id];
  ui.hp.textContent = Math.max(0, Math.ceil(state.hp)); ui.hpbar.style.width = `${Math.max(0, state.hp)}%`;
  ui.wave.textContent = state.wave; ui.hostiles.textContent = state.enemies.length; ui.kills.textContent = state.kills;
}

function makeProceduralViewModel() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x182129, metalness: .78, roughness: .36 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0b1117, metalness: .7, roughness: .48 });
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x5ef2ff, emissive: 0x5ef2ff, emissiveIntensity: 2.2, metalness: .2, roughness: .25 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(.18, .16, .78), bodyMat); body.position.set(.27, -.23, -.62); g.add(body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .55), darkMat); barrel.position.set(.27, -.19, -1.24); g.add(barrel);
  const optic = new THREE.Mesh(new THREE.BoxGeometry(.1, .08, .12), glowMat); optic.position.set(.27, -.11, -.56); g.add(optic);
  return g;
}

const viewModelRoot = new THREE.Group();
camera.add(viewModelRoot); scene.add(camera);
let weaponVisual = makeProceduralViewModel(); viewModelRoot.add(weaponVisual);
const viewSpring = new ViewmodelSpring(viewModelRoot);

async function refreshWeaponVisual() {
  const id = currentWeapon().id;
  const loaded = await loadOptionalModel(ASSET_MANIFEST.weapons[id]);
  let next = makeProceduralViewModel();
  if (loaded?.root) {
    next = fitModelToBounds(loaded.root, 0.85);
    next.position.set(.27, -.23, -.83);
    next.rotation.y = Math.PI;
  }
  viewModelRoot.remove(weaponVisual);
  weaponVisual = next;
  viewModelRoot.add(weaponVisual);
}

function makeProceduralEnemy(archetype) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(archetype.color), metalness: .72, roughness: .48 });
  const em = new THREE.MeshStandardMaterial({ color: new THREE.Color(archetype.emissive), emissive: new THREE.Color(archetype.emissive), emissiveIntensity: 2.1, roughness: .25 });
  const s = archetype.radius * 2;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(s * .8, s * 1.35, s * .55), mat); torso.position.y = s * .95; root.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(s * .55, s * .42, s * .5), mat); head.position.set(0, s * 1.75, 0); root.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(s * .34, s * .09, s * .04), em); visor.position.set(0, s * 1.78, -s * .27); root.add(visor);
  for (const x of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(s * .2, s * .75, s * .2), mat); leg.position.set(x * s * .23, s * .38, 0); root.add(leg); }
  return root;
}

async function makeEnemy(archetype, pos) {
  const root = new THREE.Group();
  root.position.copy(pos);
  root.userData = { archetype, hp: archetype.hp, attack: 0 };
  const loaded = await loadOptionalModel(ASSET_MANIFEST.enemies[archetype.id]);
  const visual = loaded?.root ? fitModelToBounds(loaded.root, archetype.radius * 3.4) : makeProceduralEnemy(archetype);
  visual.traverse(obj => { if (obj.isMesh) obj.userData.enemyRoot = root; });
  root.add(visual);
  scene.add(root); state.enemies.push(root); updateHud();
  return root;
}

function startWave() { state.spawnLeft = 5 + state.wave * 3; spawnBatch(); }
function spawnBatch() {
  if (!state.running || state.spawnLeft <= 0) return;
  const count = Math.min(3, state.spawnLeft);
  for (let i = 0; i < count; i++) {
    const idx = state.spawnLeft - i, a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 12;
    makeEnemy(archetypeForWave(state.wave, idx), new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  state.spawnLeft -= count;
  if (state.spawnLeft > 0) setTimeout(spawnBatch, 700);
}
function nextWave() { state.wave++; startWave(); updateHud(); }

function fire() {
  const w = currentWeapon(), now = performance.now();
  if (!state.running || state.reloading || now < state.nextShot || state.sliding) return;
  if (state.ammo[w.id] <= 0) { reload(); return; }
  state.nextShot = now + 60000 / w.rpm; state.ammo[w.id]--; audio.shot(w.id); updateHud();
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  fx.push(spawnShell(scene, origin.clone().addScaledVector(right, .28), right));
  const shots = w.pellets || 1;
  for (let i = 0; i < shots; i++) {
    const spread = state.ads ? w.spreadAds : w.spreadHip;
    const dir = new THREE.Vector3((Math.random() - .5) * spread, (Math.random() - .5) * spread, -1).normalize().applyQuaternion(camera.quaternion);
    raycaster.set(origin, dir);
    const hits = raycaster.intersectObjects(state.enemies, true);
    const end = hits.length ? hits[0].point : origin.clone().addScaledVector(dir, 45);
    if (i === 0 || shots <= 2) fx.push(spawnTracer(scene, origin.clone().addScaledVector(dir, .55), end));
    if (hits.length) {
      fx.push(spawnImpact(scene, hits[0].point, hits[0].face?.normal?.clone().transformDirection(hits[0].object.matrixWorld)));
      const root = hits[0].object.userData.enemyRoot;
      if (root) {
        audio.hit(); root.userData.hp -= w.damage;
        if (root.userData.hp <= 0) {
          scene.remove(root); state.enemies.splice(state.enemies.indexOf(root), 1); state.kills++;
          if (!state.enemies.length && state.spawnLeft <= 0) { clearTimeout(state.nextWaveAt); state.nextWaveAt = setTimeout(nextWave, 1300); }
        }
      }
    }
  }
  const yawKick = (Math.random() - .5) * w.recoil.yaw;
  state.pitch = Math.max(-1.3, state.pitch - w.recoil.pitch);
  state.yaw += yawKick;
  viewSpring.kick(w.recoil.pitch, yawKick, w.id === 'hammer12' ? .11 : .055);
}

function reload() {
  const w = currentWeapon();
  if (state.reloading || state.ammo[w.id] >= w.magSize || state.reserve[w.id] <= 0) return;
  state.reloading = true; audio.reload();
  setTimeout(() => {
    const need = w.magSize - state.ammo[w.id], give = Math.min(need, state.reserve[w.id]);
    state.reserve[w.id] -= give; state.ammo[w.id] += give; state.reloading = false; updateHud();
  }, w.reload * 1000);
}

function startSlide() {
  const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
  if (!state.running || state.sliding || !sprinting || !keys.has('KeyW')) return;
  state.sliding = true; state.slideTime = .62;
  state.slideDir.set(Math.sin(state.yaw), 0, -Math.cos(state.yaw)).normalize();
}

function damagePlayer(v) {
  state.hp -= v; audio.hurt(); ui.damage.classList.add('on'); setTimeout(() => ui.damage.classList.remove('on'), 90);
  if (state.hp <= 0) {
    state.running = false; document.exitPointerLock?.(); ui.menu.classList.remove('hidden'); ui.start.textContent = 'REDEPLOY'; ui.hud.classList.add('hidden');
  }
  updateHud();
}

addEventListener('keydown', e => {
  keys.add(e.code);
  if (e.code === 'KeyR') reload();
  if (e.code === 'KeyC' || e.code === 'ControlLeft') startSlide();
  if (/^Digit[123]$/.test(e.code)) { state.weaponIndex = Number(e.code.slice(-1)) - 1; refreshWeaponVisual(); updateHud(); }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('mousedown', e => {
  audio.ensure();
  if (e.button === 0) { state.fireHeld = true; fire(); }
  if (e.button === 2) state.ads = true;
});
addEventListener('mouseup', e => { if (e.button === 0) state.fireHeld = false; if (e.button === 2) state.ads = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement) return;
  state.yaw -= e.movementX * .0022; state.pitch -= e.movementY * .0022;
  state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch));
});

ui.start.addEventListener('click', () => {
  audio.ensure(); state.running = true; state.hp = 100; state.wave = 1; state.kills = 0; state.sliding = false;
  state.enemies.forEach(e => scene.remove(e)); state.enemies.length = 0;
  for (const id of WEAPON_ORDER) { state.ammo[id] = WEAPONS[id].magSize; state.reserve[id] = WEAPONS[id].reserve; }
  ui.menu.classList.add('hidden'); ui.hud.classList.remove('hidden'); renderer.domElement.requestPointerLock?.(); startWave(); updateHud(); refreshWeaponVisual();
});
renderer.domElement.addEventListener('click', () => { if (state.running && document.pointerLockElement !== renderer.domElement) renderer.domElement.requestPointerLock?.(); });

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), .05), now = performance.now();
  for (let i = fx.length - 1; i >= 0; i--) if (!fx[i].update(now, dt)) fx.splice(i, 1);
  if (state.running) {
    camera.rotation.order = 'YXZ'; camera.rotation.y = state.yaw; camera.rotation.x = state.pitch;
    const forward = new THREE.Vector3(Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    const right = new THREE.Vector3(Math.cos(state.yaw), 0, Math.sin(state.yaw));
    const move = new THREE.Vector3();
    if (keys.has('KeyW')) move.add(forward); if (keys.has('KeyS')) move.sub(forward); if (keys.has('KeyD')) move.add(right); if (keys.has('KeyA')) move.sub(right);
    if (move.lengthSq()) move.normalize();
    const sprinting = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && keys.has('KeyW') && !state.ads && !state.sliding;
    let speed = sprinting ? 8.5 : 5.6;
    if (state.sliding) {
      state.slideTime -= dt; speed = THREE.MathUtils.lerp(10.5, 6.8, 1 - Math.max(0, state.slideTime) / .62);
      camera.position.addScaledVector(state.slideDir, speed * dt);
      if (state.slideTime <= 0) state.sliding = false;
    } else camera.position.addScaledVector(move, speed * dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, state.sliding ? 1.08 : 1.72, 18, dt);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -40, 40); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -40, 40);

    const targetFov = state.sliding ? 84 : sprinting ? 82 : state.ads ? currentWeapon().adsFov : 78;
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, dt); camera.updateProjectionMatrix();
    viewSpring.update(dt, { yaw: state.yaw, pitch: state.pitch, moving: move.lengthSq() > 0, sprinting, ads: state.ads, speed01: sprinting ? 1 : .65 });
    if (state.fireHeld && currentWeapon().fireMode === 'auto') fire();

    for (const enemy of [...state.enemies]) {
      const a = enemy.userData.archetype, delta = new THREE.Vector3().subVectors(camera.position, enemy.position); delta.y = 0;
      const dist = delta.length();
      if (dist > 1.15) { enemy.position.addScaledVector(delta.normalize(), a.speed * dt); enemy.lookAt(camera.position.x, enemy.position.y, camera.position.z); }
      else { enemy.userData.attack -= dt; if (enemy.userData.attack <= 0) { damagePlayer(a.damage); enemy.userData.attack = .85; } }
    }
  }
  renderer.render(scene, camera);
}
tick();

addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

window.game = {
  scene, camera, renderer, state, WEAPONS, reconstructed: true, assetManifest: ASSET_MANIFEST,
  artDirection: { palette: { gunmetal: '#182129', dark: '#0b1117', cyan: '#5ef2ff', warn: '#ff9d3c', danger: '#ff3b3b' } }
};
