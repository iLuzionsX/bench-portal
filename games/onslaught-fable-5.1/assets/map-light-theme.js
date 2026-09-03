const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';

const waitForGame = async (timeoutMs = 15000) => {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    if (window.game?.scene && window.game?.renderer && window.game?.arena?.mats) {
      return window.game;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for the live Onslaught arena');
};

const colorForMaterial = (name) => {
  const key = name.toLowerCase();
  if (/floor|ground|pad|platform/.test(key)) return 0xe7ebef;
  if (/crate|box|cover/.test(key)) return 0xd8dee5;
  if (/wall|barrier|pillar|column|frame/.test(key)) return 0xf5f6f7;
  if (/metal|steel|panel|trim|rail/.test(key)) return 0xe1e6eb;
  return 0xedf0f3;
};

const isAccentMaterial = (name, material) => {
  const key = name.toLowerCase();
  if (/em|glow|cyan|orange|red|warning|light|white/.test(key)) return true;
  if (material?.emissiveIntensity > 0.2) return true;
  return false;
};

const applyLightArena = async () => {
  try {
    const [THREE, game] = await Promise.all([import(THREE_URL), waitForGame()]);
    const bg = 0xf3f5f7;

    // Replace the dark space/void treatment with a clean pale environment.
    game.renderer.setClearColor(bg, 1);
    game.scene.background = new THREE.Color(bg);
    game.scene.fog = new THREE.FogExp2(bg, 0.0065);
    if (game.sky?.mesh) game.sky.mesh.visible = false;
    if ('environmentIntensity' in game.scene) game.scene.environmentIntensity = 0.34;

    // The arena already centralizes its structural materials here. Recolor only
    // those shared map materials so weapons, robots, tracers and HUD keep their identity.
    const changed = [];
    for (const [name, value] of Object.entries(game.arena.mats)) {
      const materials = Array.isArray(value) ? value : [value];
      for (const material of materials) {
        if (!material?.isMaterial || !material.color?.setHex) continue;

        if (isAccentMaterial(name, material)) {
          // Keep cyan/orange emissive language, just make reflective accents sit
          // naturally inside the brighter arena.
          if (typeof material.roughness === 'number') material.roughness = Math.max(material.roughness, 0.4);
          if (typeof material.metalness === 'number') material.metalness = Math.min(material.metalness, 0.45);
          material.needsUpdate = true;
          continue;
        }

        const color = colorForMaterial(name);
        material.color.setHex(color);
        if (material.emissive?.setHex) material.emissive.setHex(0x000000);
        if (typeof material.emissiveIntensity === 'number') material.emissiveIntensity = 0;
        if (typeof material.metalness === 'number') material.metalness = Math.min(material.metalness, 0.16);
        if (typeof material.roughness === 'number') material.roughness = Math.max(material.roughness, 0.7);
        material.needsUpdate = true;
        changed.push({ name, color });
      }
    }

    // Soft white daylight prevents the new pale materials from reading flat or gray.
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0xd6dde5, 2.25);
    hemisphere.name = 'LightArenaHemisphere';
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.name = 'LightArenaSun';
    sun.position.set(14, 22, 9);
    sun.castShadow = false;
    const fill = new THREE.DirectionalLight(0xd9efff, 0.65);
    fill.name = 'LightArenaFill';
    fill.position.set(-12, 9, -10);
    fill.castShadow = false;
    game.scene.add(hemisphere, sun, fill);

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', '#f3f5f7');

    window.onslaughtLightMapTheme = {
      ready: true,
      background: '#f3f5f7',
      changedMaterials: changed.length,
      preservedCombatAccents: true,
    };
  } catch (error) {
    console.warn('Light arena theme did not initialize.', error);
    window.onslaughtLightMapTheme = { ready: false, error: String(error) };
  }
};

applyLightArena();
