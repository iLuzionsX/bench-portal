(() => {
  const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
  if (!touchCapable) return;

  document.documentElement.classList.add('touch-ui');

  const root = document.createElement('div');
  root.id = 'mobile-controls';
  root.className = 'mobile-controls';
  root.setAttribute('aria-label', 'Mobile combat controls');
  root.innerHTML = `
    <div class="mobile-look-zone" data-control="look" aria-label="Drag to look">
      <div class="mobile-look-marker"></div>
    </div>

    <div class="mobile-stick" data-control="move" aria-label="Movement stick">
      <div class="mobile-stick-thumb"></div>
    </div>

    <button class="mobile-action mobile-action-fire" data-control="fire" aria-label="Fire">
      <span class="mobile-action-icon icon-fire"></span>FIRE
    </button>
    <button class="mobile-action mobile-action-ads" data-control="ads" aria-label="Aim down sights">
      <span class="mobile-action-icon icon-ads"></span>ADS
    </button>
    <button class="mobile-action mobile-action-jump" data-control="jump" aria-label="Jump">
      <span class="mobile-action-icon icon-jump"></span>JUMP
    </button>
    <button class="mobile-action mobile-action-reload" data-control="reload" aria-label="Reload">
      <span class="mobile-action-icon icon-reload"></span>RLD
    </button>
    <button class="mobile-action mobile-action-slide" data-control="slide" aria-label="Slide or crouch">
      <span class="mobile-action-icon icon-slide"></span>SLIDE
    </button>
    <button class="mobile-action mobile-action-weapon" data-control="weapon" aria-label="Switch weapon">
      <span class="mobile-action-icon icon-weapon"></span>WPN
    </button>
    <button class="mobile-action mobile-action-pause" data-control="pause" aria-label="Pause">Ⅱ</button>
  `;
  document.body.appendChild(root);

  const orientationNote = document.createElement('div');
  orientationNote.className = 'mobile-orientation-note';
  orientationNote.textContent = 'LANDSCAPE RECOMMENDED · COMBAT DISPLAY';
  document.body.appendChild(orientationNote);

  const movePad = root.querySelector('[data-control="move"]');
  const moveThumb = root.querySelector('.mobile-stick-thumb');
  const lookZone = root.querySelector('[data-control="look"]');
  const lookMarker = root.querySelector('.mobile-look-marker');
  const buttons = Object.fromEntries(
    [...root.querySelectorAll('[data-control]')]
      .filter((el) => el instanceof HTMLButtonElement)
      .map((el) => [el.dataset.control, el])
  );

  let game = null;
  let movePointer = null;
  let lookPointer = null;
  let lookX = 0;
  let lookY = 0;
  let mobileInitialized = false;
  const heldKeys = new Set();
  const heldMouse = new Set();

  const haptic = (duration = 7) => {
    try { navigator.vibrate?.(duration); } catch (_) {}
  };

  const keyDown = (code) => {
    if (!game) return;
    const input = game.input;
    if (!input.keys.has(code)) {
      input.keys.add(code);
      input.pressed.add(code);
      input.onKeyDown?.(code);
    }
    heldKeys.add(code);
  };

  const keyUp = (code) => {
    if (!game) return;
    game.input.keys.delete(code);
    heldKeys.delete(code);
  };

  const tapKey = (code) => {
    keyDown(code);
    window.setTimeout(() => keyUp(code), 45);
  };

  const mouseDown = (button) => {
    if (!game) return;
    const input = game.input;
    if (!input.mouseDown[button]) input.mousePressed[button] = true;
    input.mouseDown[button] = true;
    heldMouse.add(button);
  };

  const mouseUp = (button) => {
    if (!game) return;
    game.input.mouseDown[button] = false;
    heldMouse.delete(button);
  };

  const clearDigitalInput = () => {
    if (!game) return;
    for (const code of heldKeys) game.input.keys.delete(code);
    for (const button of heldMouse) game.input.mouseDown[button] = false;
    heldKeys.clear();
    heldMouse.clear();
    game.input.mouseDown[0] = false;
    game.input.mouseDown[2] = false;
    game.input.wheel = 0;
    moveThumb.style.transform = 'translate(-50%, -50%)';
    movePad.classList.remove('is-sprinting');
  };

  const setMoveFromPointer = (event) => {
    if (!game) return;
    const rect = movePad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width * 0.34;
    let x = event.clientX - cx;
    let y = event.clientY - cy;
    const len = Math.hypot(x, y);
    if (len > radius) {
      x = x / len * radius;
      y = y / len * radius;
    }

    const nx = x / radius;
    const ny = y / radius;
    const dead = 0.18;
    const on = (v, threshold = dead) => Math.abs(v) > threshold;

    if (on(nx) && nx < 0) keyDown('KeyA'); else keyUp('KeyA');
    if (on(nx) && nx > 0) keyDown('KeyD'); else keyUp('KeyD');
    if (on(ny) && ny < 0) keyDown('KeyW'); else keyUp('KeyW');
    if (on(ny) && ny > 0) keyDown('KeyS'); else keyUp('KeyS');

    // Auto-sprint removes a dedicated sprint button: push the stick hard forward.
    const sprint = ny < -0.78 && Math.abs(nx) < 0.72;
    if (sprint) keyDown('ShiftLeft'); else keyUp('ShiftLeft');
    movePad.classList.toggle('is-sprinting', sprint);

    moveThumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  };

  const endMove = () => {
    ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].forEach(keyUp);
    moveThumb.style.transform = 'translate(-50%, -50%)';
    movePad.classList.remove('is-sprinting');
    movePointer = null;
  };

  movePad.addEventListener('pointerdown', (event) => {
    if (movePointer !== null) return;
    movePointer = event.pointerId;
    movePad.setPointerCapture?.(event.pointerId);
    setMoveFromPointer(event);
    haptic(5);
    event.preventDefault();
  });

  movePad.addEventListener('pointermove', (event) => {
    if (event.pointerId !== movePointer) return;
    setMoveFromPointer(event);
    event.preventDefault();
  });

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
    movePad.addEventListener(type, (event) => {
      if (movePointer !== null && event.pointerId !== movePointer && type !== 'lostpointercapture') return;
      endMove();
      event.preventDefault?.();
    });
  });

  lookZone.addEventListener('pointerdown', (event) => {
    if (!game || lookPointer !== null) return;
    lookPointer = event.pointerId;
    lookX = event.clientX;
    lookY = event.clientY;
    lookZone.setPointerCapture?.(event.pointerId);
    const lookRect = lookZone.getBoundingClientRect();
    lookMarker.style.left = `${lookX - lookRect.left}px`;
    lookMarker.style.top = `${lookY - lookRect.top}px`;
    lookZone.classList.add('is-looking');
    event.preventDefault();
  });

  lookZone.addEventListener('pointermove', (event) => {
    if (!game || event.pointerId !== lookPointer) return;
    const dx = event.clientX - lookX;
    const dy = event.clientY - lookY;
    lookX = event.clientX;
    lookY = event.clientY;

    // Feed the same delta fields consumed by the native mouse-look path.
    // A modest multiplier compensates for the shorter physical travel of a thumb.
    game.input.dx += dx * 1.18;
    game.input.dy += dy * 1.18;

    const lookRect = lookZone.getBoundingClientRect();
    lookMarker.style.left = `${event.clientX - lookRect.left}px`;
    lookMarker.style.top = `${event.clientY - lookRect.top}px`;
    event.preventDefault();
  });

  const endLook = (event) => {
    if (lookPointer === null) return;
    if (event && event.pointerId !== lookPointer && event.type !== 'lostpointercapture') return;
    lookPointer = null;
    lookZone.classList.remove('is-looking');
  };

  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
    lookZone.addEventListener(type, (event) => {
      endLook(event);
      event.preventDefault?.();
    });
  });

  const bindHold = (el, down, up) => {
    let activePointer = null;
    el.addEventListener('pointerdown', (event) => {
      if (activePointer !== null) return;
      activePointer = event.pointerId;
      el.setPointerCapture?.(event.pointerId);
      el.classList.add('is-held');
      down();
      haptic(6);
      event.preventDefault();
      event.stopPropagation();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
      el.addEventListener(type, (event) => {
        if (activePointer === null) return;
        if (event.pointerId !== activePointer && type !== 'lostpointercapture') return;
        activePointer = null;
        el.classList.remove('is-held');
        up();
        event.preventDefault?.();
        event.stopPropagation?.();
      });
    });
  };

  bindHold(buttons.fire, () => mouseDown(0), () => mouseUp(0));
  bindHold(buttons.ads, () => mouseDown(2), () => mouseUp(2));
  bindHold(buttons.slide, () => keyDown('KeyC'), () => keyUp('KeyC'));

  buttons.jump.addEventListener('pointerdown', (event) => {
    tapKey('Space');
    haptic(6);
    event.preventDefault();
    event.stopPropagation();
  });

  buttons.reload.addEventListener('pointerdown', (event) => {
    tapKey('KeyR');
    haptic(8);
    event.preventDefault();
    event.stopPropagation();
  });

  buttons.weapon.addEventListener('pointerdown', (event) => {
    if (game) game.input.wheel = 1;
    haptic(6);
    event.preventDefault();
    event.stopPropagation();
  });

  buttons.pause.addEventListener('pointerdown', (event) => {
    if (game?.state === 'playing') {
      game.pause();
      game.input.locked = false;
      clearDigitalInput();
    }
    haptic(5);
    event.preventDefault();
    event.stopPropagation();
  });

  // Never allow long-press selection/context menus to steal a combat touch.
  root.addEventListener('contextmenu', (event) => event.preventDefault());
  root.addEventListener('dragstart', (event) => event.preventDefault());

  const initializeGameBridge = () => {
    if (mobileInitialized || !window.game?.input) return false;
    game = window.game;
    mobileInitialized = true;

    // Pointer lock is a desktop mechanism. On touch devices, mark the game's
    // input layer as active without asking the browser for pointer lock.
    game.input.lock = () => {
      game.input.locked = true;
      game.input.onLockChange?.(true);
    };
    game.input.unlock = () => {
      game.input.locked = false;
      clearDigitalInput();
    };

    // Replace keyboard-centric briefing copy with the actual mobile gestures.
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.innerHTML = `
        <div><b>LEFT STICK</b> move · push forward to sprint &nbsp;·&nbsp; <b>SLIDE</b> crouch / slide</div>
        <div><b>RIGHT SIDE</b> drag to look &nbsp;·&nbsp; <b>FIRE</b> shoot &nbsp;·&nbsp; <b>ADS</b> aim</div>
        <div><b>JUMP</b> vault &nbsp;·&nbsp; <b>RLD</b> reload &nbsp;·&nbsp; <b>WPN</b> switch weapon</div>
      `;
    }

    // Strip desktop keycap references from contextual combat hints.
    const originalHint = game.hud?.hint?.bind(game.hud);
    if (originalHint) {
      game.hud.hint = (text, warn = false, duration = 2) => {
        const mobileText = String(text)
          .replace(/\s*\[R\]/g, '')
          .replace(/\s*\[SPACE\]/gi, '')
          .replace(/\s*\[E\]/gi, '');
        originalHint(mobileText, warn, duration);
      };
    }

    // Backgrounding a phone should pause rather than leaving the wave running.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game?.state === 'playing') {
        game.pause();
        game.input.locked = false;
        clearDigitalInput();
      }
    });

    window.addEventListener('pagehide', clearDigitalInput);
    window.addEventListener('blur', clearDigitalInput);

    return true;
  };

  const syncVisibility = () => {
    if (!mobileInitialized) initializeGameBridge();
    const active = !!game && game.state === 'playing';
    root.classList.toggle('is-active', active);
    root.setAttribute('aria-hidden', String(!active));
    if (!active) {
      endMove();
      endLook();
      if (game) {
        mouseUp(0);
        mouseUp(2);
        keyUp('KeyC');
      }
    }
    requestAnimationFrame(syncVisibility);
  };

  requestAnimationFrame(syncVisibility);
})();
