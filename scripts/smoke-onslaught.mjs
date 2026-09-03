import { chromium } from 'playwright';

const base = process.env.ONSLAUGHT_SMOKE_URL || 'http://127.0.0.1:4176/games/onslaught-fable-5.1/reconstructed-build/';
const productionBase = 'http://127.0.0.1:4176/games/onslaught-fable-5.1/';
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
});

async function runDesktop() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game?.renderer && window.game?.scene && window.game?.state, null, { timeout: 15000 });
  await page.waitForSelector('canvas');
  await page.waitForSelector('#start', { state: 'visible' });

  const boot = await page.evaluate(() => ({
    reconstructed: window.game?.reconstructed,
    hasRenderer: !!window.game?.renderer,
    hasScene: !!window.game?.scene,
    startText: document.querySelector('#start')?.textContent
  }));
  if (!boot.reconstructed || !boot.hasRenderer || !boot.hasScene) throw new Error(`Desktop boot failed: ${JSON.stringify(boot)}`);

  await page.click('#start');
  await page.waitForFunction(() => window.game?.state?.running === true, null, { timeout: 5000 });
  await page.waitForFunction(() => (window.game?.state?.enemies?.length || 0) > 0, null, { timeout: 7000 });

  const beforeAmmo = await page.evaluate(() => {
    const g = window.game;
    const id = ['vk7', 'hammer12', 'longshot'][g.state.weaponIndex];
    return g.state.ammo[id];
  });
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })));
  await page.waitForTimeout(120);
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true })));
  const after = await page.evaluate(() => {
    const g = window.game;
    const id = ['vk7', 'hammer12', 'longshot'][g.state.weaponIndex];
    return {
      ammo: g.state.ammo[id],
      enemies: g.state.enemies.length,
      hudHidden: document.querySelector('#hud')?.classList.contains('hidden'),
      parity: !!g.parity
    };
  });
  if (!(after.ammo < beforeAmmo)) throw new Error(`Firing did not consume ammo (${beforeAmmo} -> ${after.ammo})`);
  if (after.hudHidden) throw new Error('HUD stayed hidden after starting');
  if (!after.parity) throw new Error('Parity/render bootstrap did not attach');
  if (pageErrors.length) throw new Error(`Desktop page errors: ${pageErrors.join(' | ')}`);

  console.log('desktop smoke: PASS', { beforeAmmo, afterAmmo: after.ammo, enemies: after.enemies });
  await page.close();
}

async function runMobile() {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game?.renderer && window.game?.state, null, { timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('script[data-reconstruction-bridge="production-mobile-controls"]'), null, { timeout: 7000 });
  await page.waitForTimeout(1200);

  const mobile = await page.evaluate(() => ({
    bridge: !!document.querySelector('script[data-reconstruction-bridge="production-mobile-controls"]'),
    controls: !!document.querySelector('[class*="mobile"], [id*="mobile"], [class*="joystick"], [class*="touch"]'),
    lowPower: window.game?.parity?.lowPower,
    canvas: !!document.querySelector('canvas')
  }));
  if (!mobile.bridge || !mobile.canvas || mobile.lowPower !== true) throw new Error(`Mobile bootstrap failed: ${JSON.stringify(mobile)}`);
  if (!mobile.controls) throw new Error('Production mobile controls script loaded but no touch-control UI was detected');
  if (pageErrors.length) throw new Error(`Mobile page errors: ${pageErrors.join(' | ')}`);

  console.log('mobile smoke: PASS', mobile);
  await context.close();
}

async function runProductionIntegration() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(productionBase, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game?.renderer && window.game?.scene && window.game?.enemies, null, { timeout: 15000 });
  await page.waitForFunction(() => window.onslaughtLightMapTheme?.ready === true, null, { timeout: 20000 });
  await page.waitForFunction(() => window.onslaughtRobotAsset?.ready === true, null, { timeout: 20000 });

  await page.evaluate(() => {
    const game = window.game;
    if (game.enemies.list.length === 0) {
      const gate = game.arena.gates[0];
      game.enemies.spawn('runner', gate, 1);
    }
  });
  await page.waitForFunction(() => (window.game?.enemies?.list?.length || 0) > 0, null, { timeout: 3000 });
  await page.waitForFunction(() => {
    let found = false;
    window.game.scene.traverse((node) => {
      if (node.userData?.onslaughtDownloadedRobot) found = true;
    });
    return found;
  }, null, { timeout: 5000 });

  const integration = await page.evaluate(() => {
    let downloaded = 0;
    window.game.scene.traverse((node) => {
      if (node.userData?.onslaughtDownloadedRobot) downloaded += 1;
    });
    const proceduralHidden = Object.values(window.game.enemies.types).every((type) =>
      (type.meshes || []).every((part) => part.mesh?.visible === false)
    );

    const arenaMaterials = [];
    for (const [name, value] of Object.entries(window.game.arena.mats || {})) {
      const materials = Array.isArray(value) ? value : [value];
      for (const material of materials) {
        if (!material?.isMaterial || !material.color) continue;
        const namedAccent = /em|glow|cyan|orange|red|warning|light|white/i.test(name);
        const emissiveHex = material.emissive?.getHex?.() ?? 0;
        const glowingAccent = emissiveHex !== 0 && material.emissiveIntensity > 0.2;
        if (namedAccent || glowingAccent) continue;
        arenaMaterials.push({
          name,
          rgb: [material.color.r, material.color.g, material.color.b],
        });
      }
    }
    const lightArenaMaterials = arenaMaterials.filter(({ rgb }) => (rgb[0] + rgb[1] + rgb[2]) / 3 > 0.7).length;
    const daylight = window.game.scene.children.filter((node) =>
      ['LightArenaHemisphere', 'LightArenaSun', 'LightArenaFill'].includes(node.name)
    ).length;

    return {
      asset: window.onslaughtRobotAsset,
      downloaded,
      enemies: window.game.enemies.list.length,
      proceduralHidden,
      theme: window.onslaughtLightMapTheme,
      background: window.game.scene.background?.getHexString?.(),
      fog: window.game.scene.fog?.color?.getHexString?.(),
      skyHidden: window.game.sky?.mesh?.visible === false,
      arenaMaterials: arenaMaterials.length,
      lightArenaMaterials,
      daylight,
    };
  });

  if (!integration.asset?.ready) throw new Error(`Robot asset did not report ready: ${JSON.stringify(integration)}`);
  if (integration.downloaded < 1) throw new Error(`No downloaded robot scene objects found: ${JSON.stringify(integration)}`);
  if (!integration.proceduralHidden) throw new Error(`Procedural robot meshes remained visible: ${JSON.stringify(integration)}`);
  if (!integration.theme?.ready) throw new Error(`Light map theme did not report ready: ${JSON.stringify(integration)}`);
  if (integration.background !== 'f3f5f7' || integration.fog !== 'f3f5f7') throw new Error(`Light background/fog mismatch: ${JSON.stringify(integration)}`);
  if (!integration.skyHidden) throw new Error(`Dark sky mesh remained visible: ${JSON.stringify(integration)}`);
  if (integration.arenaMaterials < 1 || integration.lightArenaMaterials !== integration.arenaMaterials) throw new Error(`Arena materials were not fully converted to the light palette: ${JSON.stringify(integration)}`);
  if (integration.daylight < 3) throw new Error(`Light arena daylight rig is incomplete: ${JSON.stringify(integration)}`);
  if (pageErrors.length) throw new Error(`Production integration page errors: ${pageErrors.join(' | ')}`);

  console.log('production robot + light arena smoke: PASS', integration);
  await page.close();
}

try {
  await runDesktop();
  await runMobile();
  await runProductionIntegration();
  console.log('ONSLAUGHT SMOKE: PASS');
} finally {
  await browser.close();
}
