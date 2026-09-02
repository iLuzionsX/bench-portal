import * as THREE from 'three';

const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
while (!window.game?.state || !window.game?.camera) await waitFrame();

const { state, camera } = window.game;
const touch = navigator.maxTouchPoints > 0 || matchMedia?.('(pointer:coarse)').matches;
let frame = 0;

function tierForDistance(d) {
  if (d < 16) return 0;
  if (d < (touch ? 28 : 34)) return 1;
  if (d < (touch ? 42 : 54)) return 2;
  return 3;
}

function applyTier(root, tier) {
  if (root.userData.__lodTier === tier) return;
  root.userData.__lodTier = tier;
  let meshIndex = 0;
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const important = meshIndex++ < 2 || obj.material?.emissive;
    obj.visible = tier === 0 || (tier === 1 && (important || meshIndex % 2 === 0)) || (tier === 2 && important);
    obj.frustumCulled = true;
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if ('flatShading' in mat && tier >= 2) mat.flatShading = true;
      }
    }
  });
}

function update() {
  frame++;
  const enemies = state.enemies || [];
  const stride = enemies.length > 48 ? 4 : enemies.length > 24 ? 2 : 1;
  for (let i = frame % stride; i < enemies.length; i += stride) {
    const root = enemies[i];
    const d = root.position.distanceTo(camera.position);
    applyTier(root, tierForDistance(d));
    root.matrixAutoUpdate = d < 38;
    if (!root.matrixAutoUpdate) root.updateMatrix();
  }
  requestAnimationFrame(update);
}
requestAnimationFrame(update);

window.game.hordeOptimizer = {
  mode: 'adaptive-mesh-lod',
  touch,
  tierForDistance
};
