// Reconstruction-specific mobile controls.
// This intentionally does not load the production mobile-control scripts: the
// reconstructed game exposes a different window.game/input surface. Instead it
// reuses the existing keyboard/mouse listeners and public yaw/pitch state.
(() => {
  const coarse = navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches === true;
  if (!coarse) return;

  let framesWaited = 0;
  const MAX_BOOT_FRAMES = 360;

  const boot = () => {
    if (window.game?.renderer?.domElement && window.game?.state) {
      init(window.game);
      return;
    }
    framesWaited += 1;
    if (framesWaited >= MAX_BOOT_FRAMES) {
      window.gameTouchBridge = { active: false, reason: 'boot-timeout' };
      return;
    }
    requestAnimationFrame(boot);
  };

  requestAnimationFrame(boot);

  function init(game) {
    if (game.__sourceTouchInit) return;
    game.__sourceTouchInit = true;

    const canvas = game.renderer.domElement;
    const state = game.state;

    // Pointer lock is a desktop input mechanism. The source build's start/canvas
    // handlers may request it; neutralize only on touch-capable devices.
    try { canvas.requestPointerLock = () => undefined; } catch (_) {}
    try { document.exitPointerLock?.(); } catch (_) {}

    document.documentElement.classList.add('source-touch');

    const style = document.createElement('style');
    style.dataset.sourceTouch = 'bridge';
    style.textContent = `
      html.source-touch,
      html.source-touch body {
        overscroll-behavior: none;
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }

      #source-touch-controls {
        position: fixed;
        inset: 0;
        z-index: 30;
        visibility: hidden;
        opacity: 0;
        pointer-events: none;
        touch-action: none;
        transition: opacity 100ms ease;
      }

      #source-touch-controls.is-active {
        visibility: visible;
        opacity: 1;
      }

      #source-touch-controls * {
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
      }

      #source-touch-controls #src-look,
      #source-touch-controls #src-move,
      #source-touch-controls .src-btn {
        pointer-events: none;
        touch-action: none;
      }

      #source-touch-controls.is-active #src-look,
      #source-touch-controls.is-active #src-move,
      #source-touch-controls.is-active .src-btn {
        pointer-events: auto;
      }

      #src-look {
        position: absolute;
        top: 0;
        right: 0;
        width: 58vw;
        height: 100%;
      }

      #src-move {
        position: absolute;
        left: calc(env(safe-area-inset-left, 0px) + 18px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
        width: clamp(120px, 25vw, 146px);
        aspect-ratio: 1;
        border-radius: 50%;
        border: 1px solid rgba(94, 242, 255, .32);
        background: radial-gradient(circle, rgba(10, 27, 37, .22), rgba(3, 8, 16, .42));
        box-shadow: inset 0 0 28px rgba(94, 242, 255, .04);
      }

      .src-stick-thumb {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 48%;
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        border: 1px solid rgba(94, 242, 255, .62);
        background: rgba(5, 14, 24, .84);
        box-shadow: 0 0 20px rgba(94, 242, 255, .08);
      }

      .src-btn {
        position: absolute;
        display: grid;
        place-items: center;
        width: 58px;
        height: 58px;
        padding: 0;
        border: 1px solid rgba(94, 242, 255, .36);
        color: #eef4ff;
        background: linear-gradient(145deg, rgba(8, 22, 31, .82), rgba(3, 8, 15, .72));
        box-shadow: 0 8px 24px rgba(0, 0, 0, .28), inset 0 0 18px rgba(94, 242, 255, .03);
        clip-path: polygon(13% 0, 100% 0, 100% 78%, 82% 100%, 0 100%, 0 18%);
        font: 800 10px/1 Orbitron, Rajdhani, system-ui, sans-serif;
        letter-spacing: 1.1px;
        text-transform: uppercase;
      }

      .src-btn.is-held {
        transform: scale(.93);
        filter: brightness(1.25);
        background: rgba(13, 36, 48, .92);
      }

      #src-fire {
        right: calc(env(safe-area-inset-right, 0px) + 18px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);
        width: clamp(76px, 16vw, 88px);
        height: clamp(76px, 16vw, 88px);
        border-color: rgba(94, 242, 255, .58);
      }

      #src-ads {
        right: calc(env(safe-area-inset-right, 0px) + 112px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 28px);
      }

      #src-reload {
        right: calc(env(safe-area-inset-right, 0px) + 26px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 112px);
      }

      #src-slide {
        right: calc(env(safe-area-inset-right, 0px) + 194px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
      }

      #src-weapon {
        right: calc(env(safe-area-inset-right, 0px) + 184px);
        bottom: calc(env(safe-area-inset-bottom, 0px) + 96px);
        width: 50px;
        height: 50px;
      }

      html.source-touch .weapon {
        right: max(14px, env(safe-area-inset-right));
        bottom: calc(env(safe-area-inset-bottom, 0px) + 118px) !important;
      }

      html.source-touch .health {
        left: max(14px, env(safe-area-inset-left));
        bottom: calc(env(safe-area-inset-bottom, 0px) + 122px) !important;
      }

      @media (orientation: landscape) and (max-height: 520px) {
        #src-move { width: 116px; }
        #src-fire { width: 72px; height: 72px; }
        #src-ads { right: calc(env(safe-area-inset-right, 0px) + 100px); }
        #src-slide { right: calc(env(safe-area-inset-right, 0px) + 170px); }
        #src-weapon { right: calc(env(safe-area-inset-right, 0px) + 166px); bottom: calc(env(safe-area-inset-bottom, 0px) + 82px); }
        #src-reload { bottom: calc(env(safe-area-inset-bottom, 0px) + 96px); }
      }

      @media (prefers-reduced-motion: reduce) {
        #source-touch-controls { transition: none; }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'source-touch-controls';
    root.setAttribute('aria-label', 'Touch combat controls');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div id="src-look" data-control="look" aria-label="Drag to look"></div>
      <div id="src-move" data-control="move" aria-label="Movement stick"><div class="src-stick-thumb"></div></div>
      <button type="button" id="src-fire" class="src-btn" data-control="fire" aria-label="Fire">FIRE</button>
      <button type="button" id="src-ads" class="src-btn" data-control="ads" aria-label="Aim down sights">ADS</button>
      <button type="button" id="src-reload" class="src-btn" data-control="reload" aria-label="Reload">RLD</button>
      <button type="button" id="src-slide" class="src-btn" data-control="slide" aria-label="Slide">SLIDE</button>
      <button type="button" id="src-weapon" class="src-btn" data-control="weapon" aria-label="Switch weapon">WPN</button>
    `;
    document.body.appendChild(root);

    const movePad = root.querySelector('#src-move');
    const moveThumb = root.querySelector('.src-stick-thumb');
    const lookZone = root.querySelector('#src-look');
    const fireButton = root.querySelector('#src-fire');
    const adsButton = root.querySelector('#src-ads');
    const reloadButton = root.querySelector('#src-reload');
    const slideButton = root.querySelector('#src-slide');
    const weaponButton = root.querySelector('#src-weapon');

    const heldKeys = new Set();
    let movePointer = null;
    let lookPointer = null;
    let lookX = 0;
    let lookY = 0;

    const emitKey = (type, code) => {
      window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true, cancelable: true }));
    };

    const keyDown = (code) => {
      if (heldKeys.has(code)) return;
      heldKeys.add(code);
      emitKey('keydown', code);
    };

    const keyUp = (code) => {
      if (!heldKeys.delete(code)) return;
      emitKey('keyup', code);
    };

    const tapKey = (code) => {
      emitKey('keydown', code);
      window.setTimeout(() => emitKey('keyup', code), 45);
    };

    const emitMouse = (type, button) => {
      canvas.dispatchEvent(new MouseEvent(type, { button, bubbles: true, cancelable: true }));
    };

    const clearMove = () => {
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'].forEach(keyUp);
      movePointer = null;
      if (moveThumb) moveThumb.style.transform = 'translate(-50%, -50%)';
    };

    const releaseAll = () => {
      for (const code of [...heldKeys]) keyUp(code);
      try { emitMouse('mouseup', 0); } catch (_) {}
      try { emitMouse('mouseup', 2); } catch (_) {}
      state.fireHeld = false;
      state.ads = false;
      movePointer = null;
      lookPointer = null;
      if (moveThumb) moveThumb.style.transform = 'translate(-50%, -50%)';
      root.querySelectorAll('.is-held').forEach((el) => el.classList.remove('is-held'));
    };

    const setMoveFromPointer = (event) => {
      const rect = movePad.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width * 0.34;
      let x = event.clientX - centerX;
      let y = event.clientY - centerY;
      const length = Math.hypot(x, y) || 1;
      if (length > radius) {
        x = x / length * radius;
        y = y / length * radius;
      }

      const nx = x / radius;
      const ny = y / radius;
      const deadzone = 0.18;
      const active = (value) => Math.abs(value) > deadzone;

      if (active(nx) && nx < 0) keyDown('KeyA'); else keyUp('KeyA');
      if (active(nx) && nx > 0) keyDown('KeyD'); else keyUp('KeyD');
      if (active(ny) && ny < 0) keyDown('KeyW'); else keyUp('KeyW');
      if (active(ny) && ny > 0) keyDown('KeyS'); else keyUp('KeyS');
      if (ny < -0.78 && Math.abs(nx) < 0.72) keyDown('ShiftLeft'); else keyUp('ShiftLeft');

      if (moveThumb) {
        moveThumb.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      }
    };

    movePad.addEventListener('pointerdown', (event) => {
      if (movePointer !== null) return;
      movePointer = event.pointerId;
      try { movePad.setPointerCapture?.(event.pointerId); } catch (_) {}
      setMoveFromPointer(event);
      event.preventDefault();
      event.stopPropagation();
    });

    movePad.addEventListener('pointermove', (event) => {
      if (event.pointerId !== movePointer) return;
      setMoveFromPointer(event);
      event.preventDefault();
      event.stopPropagation();
    });

    const endMove = (event) => {
      if (movePointer === null) return;
      if (event.pointerId !== movePointer && event.type !== 'lostpointercapture') return;
      clearMove();
      event.preventDefault?.();
      event.stopPropagation?.();
    };

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => movePad.addEventListener(type, endMove));

    lookZone.addEventListener('pointerdown', (event) => {
      if (lookPointer !== null) return;
      lookPointer = event.pointerId;
      lookX = event.clientX;
      lookY = event.clientY;
      try { lookZone.setPointerCapture?.(event.pointerId); } catch (_) {}
      event.preventDefault();
      event.stopPropagation();
    });

    lookZone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== lookPointer) return;
      const dx = event.clientX - lookX;
      const dy = event.clientY - lookY;
      lookX = event.clientX;
      lookY = event.clientY;
      state.yaw -= dx * 0.0026;
      state.pitch = Math.max(-1.45, Math.min(1.45, state.pitch - dy * 0.0026));
      event.preventDefault();
      event.stopPropagation();
    });

    const endLook = (event) => {
      if (lookPointer === null) return;
      if (event.pointerId !== lookPointer && event.type !== 'lostpointercapture') return;
      lookPointer = null;
      event.preventDefault?.();
      event.stopPropagation?.();
    };

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => lookZone.addEventListener(type, endLook));

    const bindHold = (element, onDown, onUp) => {
      let pointerId = null;

      element.addEventListener('pointerdown', (event) => {
        if (pointerId !== null) return;
        pointerId = event.pointerId;
        try { element.setPointerCapture?.(event.pointerId); } catch (_) {}
        element.classList.add('is-held');
        onDown();
        event.preventDefault();
        event.stopPropagation();
      });

      const end = (event) => {
        if (pointerId === null) return;
        if (event.pointerId !== pointerId && event.type !== 'lostpointercapture') return;
        pointerId = null;
        element.classList.remove('is-held');
        onUp();
        event.preventDefault?.();
        event.stopPropagation?.();
      };

      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => element.addEventListener(type, end));
    };

    bindHold(fireButton, () => emitMouse('mousedown', 0), () => emitMouse('mouseup', 0));
    bindHold(adsButton, () => emitMouse('mousedown', 2), () => emitMouse('mouseup', 2));
    bindHold(slideButton, () => keyDown('KeyC'), () => keyUp('KeyC'));

    reloadButton.addEventListener('pointerdown', (event) => {
      tapKey('KeyR');
      event.preventDefault();
      event.stopPropagation();
    });

    weaponButton.addEventListener('pointerdown', (event) => {
      const nextSlot = ((Number(state.weaponIndex) || 0) + 1) % 3 + 1;
      tapKey(`Digit${nextSlot}`);
      event.preventDefault();
      event.stopPropagation();
    });

    for (const element of [reloadButton, weaponButton]) {
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
        element.addEventListener(type, (event) => {
          event.preventDefault?.();
          event.stopPropagation?.();
        });
      });
    }

    // Suppress compatibility mouse/click events generated by physical touches on
    // the control overlay. Synthetic mouse events sent to the canvas are outside
    // this subtree and still reach the game's existing window listeners.
    ['mousedown', 'mouseup', 'click', 'dblclick'].forEach((type) => {
      root.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
      }, true);
    });
    root.addEventListener('contextmenu', (event) => event.preventDefault());

    document.addEventListener('gesturestart', (event) => {
      if (root.classList.contains('is-active')) event.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (event) => {
      if (root.classList.contains('is-active')) event.preventDefault();
    }, { passive: false });

    let wasRunning = false;
    const syncActive = () => {
      const running = Boolean(state.running);
      if (running !== wasRunning) {
        wasRunning = running;
        root.classList.toggle('is-active', running);
        root.setAttribute('aria-hidden', String(!running));
        if (!running) releaseAll();
      }
      requestAnimationFrame(syncActive);
    };
    requestAnimationFrame(syncActive);

    window.addEventListener('blur', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) releaseAll();
    });

    window.gameTouchBridge = {
      active: true,
      rootId: root.id,
      controls: ['move', 'look', 'fire', 'ads', 'reload', 'slide', 'weapon']
    };
  }
})();
