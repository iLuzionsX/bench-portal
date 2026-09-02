import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const ASSET_MANIFEST = {
  weapons: {
    vk7: '/models/weapons/vk7.glb',
    hammer12: '/models/weapons/hammer12.glb',
    longshot: '/models/weapons/longshot.glb'
  },
  enemies: {
    swarm: '/models/enemies/swarm.glb',
    rusher: '/models/enemies/rusher.glb',
    heavy: '/models/enemies/heavy.glb',
    ranged: '/models/enemies/ranged.glb'
  }
};

const loader = new GLTFLoader();
const cache = new Map();

export async function loadGLTF(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = new Promise((resolve, reject) => loader.load(path, resolve, undefined, reject));
  cache.set(path, promise);
  try { return await promise; } catch (error) { cache.delete(path); throw error; }
}

export async function loadOptionalModel(path, { scale = 1, rotationY = 0 } = {}) {
  try {
    const gltf = await loadGLTF(path);
    const root = gltf.scene.clone(true);
    root.scale.setScalar(scale);
    root.rotation.y = rotationY;
    root.traverse(obj => {
      if (!obj.isMesh) return;
      obj.castShadow = false;
      obj.receiveShadow = false;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) {
        if (!mat) continue;
        mat = mat.clone?.() || mat;
        if ('metalness' in mat) mat.metalness = Math.max(mat.metalness ?? 0, 0.48);
        if ('roughness' in mat) mat.roughness = Math.min(Math.max(mat.roughness ?? 0.55, 0.3), 0.76);
      }
    });
    return { root, animations: gltf.animations || [] };
  } catch {
    return null;
  }
}

export function fitModelToBounds(root, targetSize = 1) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  root.scale.multiplyScalar(targetSize / maxAxis);
  const box2 = new THREE.Box3().setFromObject(root);
  const center = box2.getCenter(new THREE.Vector3());
  root.position.sub(center);
  return root;
}
