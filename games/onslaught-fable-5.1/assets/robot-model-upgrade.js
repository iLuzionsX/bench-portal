const MODEL_URL = './assets/Animated_Robot.glb';
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
const GLTF_LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm';
const SKELETON_UTILS_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js/+esm';
const MODEL_YAW_OFFSET = Math.PI;

const waitForGame = async (timeoutMs = 15000) => {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (window.game?.scene && window.game?.enemies?.list && window.game?.enemies?.types) {
      return window.game;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the live Onslaught game instance');
};

const run = async () => {
  try {
    const [THREE, loaderModule, skeletonModule, game] = await Promise.all([
      import(THREE_URL),
      import(GLTF_LOADER_URL),
      import(SKELETON_UTILS_URL),
      waitForGame(),
    ]);

    const { GLTFLoader } = loaderModule;
    const cloneSkinned = skeletonModule.clone;
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(MODEL_URL);
    const source = gltf.scene;

    source.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const sourceHeight = Math.max(size.y, 0.001);

    // Normalize the downloaded model around a ground-level pivot so the game's
    // existing enemy positions, hitboxes, AI and death motion stay authoritative.
    source.position.x -= center.x;
    source.position.z -= center.z;
    source.position.y -= bounds.min.y;

    const template = new THREE.Group();
    template.name = 'QuaterniusAnimatedRobotTemplate';
    template.add(source);
    template.updateMatrixWorld(true);

    source.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = false; // Important for mobile when a wave reaches dozens of enemies.
      node.receiveShadow = true;
      node.frustumCulled = true;
    });

    const visuals = new Map();
    let proceduralHidden = false;

    const hideProceduralEnemyMeshes = () => {
      if (proceduralHidden) return;
      for (const type of Object.values(game.enemies.types)) {
        for (const part of type.meshes || []) {
          if (part?.mesh) part.mesh.visible = false;
        }
      }
      proceduralHidden = true;
    };

    const typeDimensions = (enemy) => {
      if (enemy.def?.big || enemy.type === 'brute') {
        return { height: 2.7, width: 1.16 };
      }
      if (enemy.type === 'spitter') {
        return { height: 1.95, width: 1.04 };
      }
      return { height: 1.82, width: 1 };
    };

    const createVisual = (enemy) => {
      const root = cloneSkinned(template);
      root.name = `DownloadedRobot_${enemy.id}`;
      root.userData.onslaughtDownloadedRobot = true;
      root.traverse((node) => {
        if (!node.isMesh) return;
        node.castShadow = false;
        node.receiveShadow = true;
        node.frustumCulled = true;
      });
      game.scene.add(root);
      const visual = { root };
      visuals.set(enemy.id, visual);
      return visual;
    };

    const removeVisual = (id) => {
      const visual = visuals.get(id);
      if (!visual) return;
      game.scene.remove(visual.root);
      visuals.delete(id);
    };

    // The original instanced robots are hidden only after the actual downloaded
    // GLB has loaded and can be cloned. If loading ever fails, the old robots remain.
    hideProceduralEnemyMeshes();

    const sync = () => {
      const enemies = game.enemies?.list || [];
      const active = new Set();

      for (const enemy of enemies) {
        active.add(enemy.id);
        const visual = visuals.get(enemy.id) || createVisual(enemy);
        const dims = typeDimensions(enemy);
        const variation = enemy.def?.scale ? enemy.scale / enemy.def.scale : 1;
        const baseScale = (dims.height / sourceHeight) * variation;
        const deathCompression = enemy.state === 'die' ? Math.max(0.82, 1 - enemy.dissolve * 0.1) : 1;

        visual.root.visible = true;
        visual.root.position.set(
          enemy.pos.x,
          enemy.pos.y + Math.abs(Math.sin(enemy.phase || 0)) * 0.025 * (enemy.moveBlend || 0),
          enemy.pos.z,
        );
        visual.root.rotation.set(
          enemy.toppleX || 0,
          (enemy.yaw || 0) + MODEL_YAW_OFFSET,
          enemy.toppleZ || 0,
        );
        visual.root.scale.set(
          baseScale * dims.width * deathCompression,
          baseScale * deathCompression,
          baseScale * dims.width * deathCompression,
        );
      }

      for (const id of [...visuals.keys()]) {
        if (!active.has(id)) removeVisual(id);
      }

      requestAnimationFrame(sync);
    };

    window.onslaughtRobotAsset = {
      ready: true,
      model: 'Animated Robot by Quaternius',
      license: 'CC0',
      localUrl: MODEL_URL,
      sourceHeight,
    };

    requestAnimationFrame(sync);
  } catch (error) {
    console.warn('Downloaded robot model upgrade did not initialize; keeping original enemy visuals.', error);
    window.onslaughtRobotAsset = { ready: false, error: String(error) };
  }
};

run();
