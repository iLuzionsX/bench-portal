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
  await page.waitForFunction(() => document.querySelector('#source-touch-controls'), null, { timeout: 7000 });

  const beforeStart = await page.evaluate(() => {
    const root = document.querySelector('#source-touch-controls');
    const look = document.querySelector('#src-look');
    const viewport = document.querySelector('meta[name="viewport"]')?.content || '';
    return {
      active: root?.classList.contains('is-active') || false,
      ariaHidden: root?.getAttribute('aria-hidden'),
      visibility: root ? getComputedStyle(root).visibility : '',
      lookPointerEvents: look ? getComputedStyle(look).pointerEvents : '',
      controls: [...document.querySelectorAll('#source-touch-controls [data-control]')].map(el => el.getAttribute('data-control')).sort(),
      productionAdapter: !!document.querySelector('script[data-reconstruction-bridge="production-mobile-controls"]'),
      viewport,
      lowPower: window.game?.parity?.lowPower,
      canvas: !!document.querySelector('canvas')
    };
  });

  if (!beforeStart.canvas || beforeStart.lowPower !== true) throw new Error(`Mobile bootstrap failed: ${JSON.stringify(beforeStart)}`);
  if (beforeStart.productionAdapter) throw new Error(`Production mobile adapter unexpectedly loaded: ${JSON.stringify(beforeStart)}`);
  if (beforeStart.active || beforeStart.ariaHidden !== 'true' || beforeStart.visibility !== 'hidden' || beforeStart.lookPointerEvents !== 'none') {
    throw new Error(`Touch UI must not intercept the start menu: ${JSON.stringify(beforeStart)}`);
  }
  if (!beforeStart.viewport.includes('maximum-scale=1.0') || !beforeStart.viewport.includes('user-scalable=no') || !beforeStart.viewport.includes('viewport-fit=cover')) {
    throw new Error(`Mobile viewport guards missing: ${beforeStart.viewport}`);
  }
  for (const required of ['move', 'look', 'fire', 'ads', 'reload', 'slide', 'weapon']) {
    if (!beforeStart.controls.includes(required)) throw new Error(`Missing mobile control ${required}: ${JSON.stringify(beforeStart.controls)}`);
  }

  // If the inactive look layer were intercepting the menu, this click would not
  // transition the reconstruction into the running state.
  await page.click('#start');
  await page.waitForFunction(() => window.game?.state?.running === true, null, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector('#source-touch-controls')?.classList.contains('is-active'), null, { timeout: 5000 });

  const active = await page.evaluate(() => ({
    ariaHidden: document.querySelector('#source-touch-controls')?.getAttribute('aria-hidden'),
    visibility: getComputedStyle(document.querySelector('#source-touch-controls')).visibility,
    lookPointerEvents: getComputedStyle(document.querySelector('#src-look')).pointerEvents,
    firePointerEvents: getComputedStyle(document.querySelector('#src-fire')).pointerEvents
  }));
  if (active.ariaHidden !== 'false' || active.visibility !== 'visible' || active.lookPointerEvents === 'none' || active.firePointerEvents === 'none') {
    throw new Error(`Touch UI did not activate with gameplay: ${JSON.stringify(active)}`);
  }

  const beforeAmmo = await page.evaluate(() => {
    const g = window.game;
    const id = ['vk7', 'hammer12', 'longshot'][g.state.weaponIndex];
    return g.state.ammo[id];
  });
  await page.dispatchEvent('#src-fire', 'pointerdown', { pointerId: 41, pointerType: 'touch', clientX: 350, clientY: 760 });
  await page.waitForTimeout(120);
  await page.dispatchEvent('#src-fire', 'pointerup', { pointerId: 41, pointerType: 'touch', clientX: 350, clientY: 760 });
  const afterAmmo = await page.evaluate(() => {
    const g = window.game;
    const id = ['vk7', 'hammer12', 'longshot'][g.state.weaponIndex];
    return g.state.ammo[id];
  });
  if (!(afterAmmo < beforeAmmo)) throw new Error(`Mobile FIRE did not reach existing game input (${beforeAmmo} -> ${afterAmmo})`);
  if (pageErrors.length) throw new Error(`Mobile page errors: ${pageErrors.join(' | ')}`);

  console.log('mobile smoke: PASS', { controls: beforeStart.controls, beforeAmmo, afterAmmo, active });
  await context.close();
}

async function runProductionRobotModel() {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(productionBase, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.game?.renderer && window.game?.scene && window.game?.enemies, null, { timeout: 15000 });
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

  const robot = await page.evaluate(() => {
    let downloaded = 0;
    window.game.scene.traverse((node) => {
      if (node.userData?.onslaughtDownloadedRobot) downloaded += 1;
    });
    const proceduralHidden = Object.values(window.game.enemies.types).every((type) =>
      (type.meshes || []).every((part) => part.mesh?.visible === false)
    );
    return {
      asset: window.onslaughtRobotAsset,
      downloaded,
      enemies: window.game.enemies.list.length,
      proceduralHidden,
    };
  });

  if (!robot.asset?.ready) throw new Error(`Robot asset did not report ready: ${JSON.stringify(robot)}`);
  if (robot.downloaded < 1) throw new Error(`No downloaded robot scene objects found: ${JSON.stringify(robot)}`);
  if (!robot.proceduralHidden) throw new Error(`Procedural robot meshes remained visible: ${JSON.stringify(robot)}`);
  if (pageErrors.length) throw new Error(`Production robot page errors: ${pageErrors.join(' | ')}`);

  console.log('production robot asset smoke: PASS', robot);
  await page.close();
}

try {
  await runDesktop();
  await runMobile();
  await runProductionRobotModel();
  console.log('ONSLAUGHT SMOKE: PASS');
} finally {
  await browser.close();
}
