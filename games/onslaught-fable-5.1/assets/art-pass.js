(() => {
  const GUNMETAL = '#182129';
  const DARK = '#0b1117';
  const CYAN = '#5ef2ff';
  const WARN = '#ff9d3c';
  const DANGER = '#ff3b3b';

  const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
  const lowPower = touchCapable || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

  const style = document.createElement('style');
  style.textContent = `
    .art-pass-badge{position:fixed;left:max(14px,env(safe-area-inset-left));top:max(14px,env(safe-area-inset-top));z-index:12;pointer-events:none;font:700 10px/1.2 Rajdhani,Arial,sans-serif;letter-spacing:2.2px;color:${CYAN};background:rgba(4,8,16,.72);border:1px solid rgba(94,242,255,.24);padding:7px 10px;backdrop-filter:blur(5px);box-shadow:0 0 20px rgba(94,242,255,.08)}
    .art-pass-badge b{color:#fff;font-weight:700}
    .touch-ui .art-pass-badge{font-size:9px;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));opacity:.72}
  `;
  document.head.appendChild(style);

  const badge = document.createElement('div');
  badge.className = 'art-pass-badge';
  badge.innerHTML = '<b>ONSLAUGHT</b> // CC0 ART PASS';
  document.body.appendChild(badge);

  const waitForGame = () => {
    if (!window.game) return requestAnimationFrame(waitForGame);
    const game = window.game;

    // Expose a compact, non-invasive art-direction contract for future source rebuilds.
    game.artDirection = Object.freeze({
      palette: { gunmetal: GUNMETAL, dark: DARK, cyan: CYAN, warn: WARN, danger: DANGER },
      lowPower,
      weapons: {
        'VK-7': { silhouette: 'angular modular assault rifle', optic: 'cyan emissive', body: GUNMETAL },
        'HAMMER-12': { silhouette: 'short wide pump shotgun', accent: WARN, body: DARK },
        'LONGSHOT': { silhouette: 'long clean DMR', optic: 'cyan ADS-only emphasis', body: GUNMETAL }
      },
      enemies: {
        swarm: { silhouette: 'lean angular humanoid bot', emissive: CYAN },
        rusher: { silhouette: 'low tripod/quadruped bot', emissive: CYAN },
        heavy: { silhouette: 'broad armored bot', emissive: WARN },
        ranged: { silhouette: 'turret/drone', emissive: DANGER }
      }
    });

    // Production-build-safe enhancement: normalize material colors on generated meshes
    // where possible without mutating gameplay, transforms, animation, or shaders.
    const recolorMaterial = (material) => {
      if (!material || material.userData?.artPassLocked) return;
      material.userData = material.userData || {};
      material.userData.artPassLocked = true;

      // Preserve custom ShaderMaterials and hit/dissolve effects.
      if (material.isShaderMaterial || !material.color) return;

      const name = `${material.name || ''} ${material.userData?.role || ''}`.toLowerCase();
      if (/eye|optic|screen|energy|emiss|glow|sight/.test(name)) {
        material.color.set(CYAN);
        if (material.emissive) {
          material.emissive.set(CYAN);
          material.emissiveIntensity = Math.max(material.emissiveIntensity || 0, 1.4);
        }
      } else if (/heat|warning|heavy|barrel/.test(name)) {
        material.color.set(WARN);
        if (material.emissive) material.emissive.set(WARN);
      } else {
        const l = material.color.getHSL({ h: 0, s: 0, l: 0 }).l;
        material.color.set(l > 0.42 ? GUNMETAL : DARK);
        if ('metalness' in material) material.metalness = Math.max(material.metalness || 0, .58);
        if ('roughness' in material) material.roughness = Math.min(Math.max(material.roughness ?? .55, .32), .72);
      }
      material.needsUpdate = true;
    };

    const seen = new WeakSet();
    const scan = () => {
      const roots = [game.scene, game.world?.scene, game.viewmodelScene, game.viewScene, game.weaponScene].filter(Boolean);
      for (const root of roots) {
        root.traverse?.((obj) => {
          if (!obj?.isMesh || seen.has(obj)) return;
          seen.add(obj);
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(recolorMaterial);
        });
      }
      setTimeout(scan, lowPower ? 1800 : 900);
    };
    scan();

    // Keep the benchmark identity visible in metadata while acknowledging the retrofit.
    const foot = document.querySelector('.menu-foot');
    if (foot && !foot.textContent.includes('CC0 ART PASS')) foot.textContent += ' · CC0 ART PASS';
  };

  requestAnimationFrame(waitForGame);
})();
