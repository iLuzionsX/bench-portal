(() => {
  const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
  if (!touchCapable) return;

  const STORAGE_KEY = 'onslaught-mobile-look-sensitivity';
  const MIN = 0.5;
  const MAX = 2;
  const STEP = 0.05;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const stored = Number.parseFloat(localStorage.getItem(STORAGE_KEY) || '1');
  let multiplier = Number.isFinite(stored) ? clamp(stored, MIN, MAX) : 1;
  let game = null;
  let baseSensitivity = null;

  const style = document.createElement('style');
  style.textContent = `
    .mobile-settings-button,
    .mobile-settings-panel { display: none; }

    html.touch-ui .mobile-settings-button {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 10px);
      left: calc(50% + 28px);
      z-index: 80;
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      padding: 0;
      border: 0;
      color: var(--ui, #eef4ff);
      background: rgba(4, 8, 16, 0.58);
      box-shadow: 0 7px 22px rgba(0, 0, 0, 0.34), inset 0 0 0 1px rgba(238, 244, 255, 0.16);
      clip-path: polygon(17% 0, 100% 0, 100% 76%, 82% 100%, 0 100%, 0 24%);
      font: 800 18px/1 var(--font-title, Orbitron, sans-serif);
      pointer-events: auto;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
      transition: transform 70ms ease, filter 70ms ease, background 70ms ease;
    }

    html.touch-ui .mobile-settings-button::before {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      top: 6px;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(94, 242, 255, 0.7), transparent);
    }

    html.touch-ui .mobile-settings-button:active,
    html.touch-ui .mobile-settings-button.is-open {
      transform: scale(0.93);
      filter: brightness(1.2);
      background: rgba(8, 20, 30, 0.9);
    }

    html.touch-ui .mobile-settings-panel {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 60px);
      left: 50%;
      z-index: 81;
      display: block;
      width: min(310px, calc(100vw - 28px));
      padding: 14px 15px 13px;
      color: var(--ui, #eef4ff);
      background: linear-gradient(145deg, rgba(7, 18, 28, 0.97), rgba(3, 7, 14, 0.94));
      border: 1px solid rgba(94, 242, 255, 0.38);
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.56), inset 0 0 24px rgba(94, 242, 255, 0.03);
      clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
      font-family: var(--font-ui, Rajdhani, sans-serif);
      pointer-events: auto;
      touch-action: none;
      opacity: 0;
      visibility: hidden;
      transform: translate(-50%, -7px);
      transition: opacity 100ms ease, transform 100ms ease, visibility 100ms ease;
    }

    html.touch-ui .mobile-settings-panel.is-open {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, 0);
    }

    .mobile-settings-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 11px;
    }

    .mobile-settings-title {
      font: 800 12px/1 var(--font-title, Orbitron, sans-serif);
      letter-spacing: 2px;
      color: #eef4ff;
    }

    .mobile-settings-value {
      font: 800 13px/1 var(--font-ui, Rajdhani, sans-serif);
      letter-spacing: 1.5px;
      color: #5ef2ff;
      text-shadow: 0 0 10px rgba(94, 242, 255, 0.25);
    }

    .mobile-settings-range {
      width: 100%;
      height: 28px;
      margin: 0;
      accent-color: #5ef2ff;
      touch-action: none;
    }

    .mobile-settings-scale {
      display: flex;
      justify-content: space-between;
      margin-top: -2px;
      color: rgba(238, 244, 255, 0.45);
      font: 700 9px/1 var(--font-ui, Rajdhani, sans-serif);
      letter-spacing: 1.6px;
    }

    .mobile-settings-note {
      margin-top: 10px;
      color: rgba(238, 244, 255, 0.58);
      font: 600 10px/1.25 var(--font-ui, Rajdhani, sans-serif);
      letter-spacing: 0.7px;
    }
  `;
  document.head.appendChild(style);

  const button = document.createElement('button');
  button.className = 'mobile-settings-button';
  button.type = 'button';
  button.setAttribute('aria-label', 'Look sensitivity settings');
  button.setAttribute('aria-expanded', 'false');
  button.textContent = '⚙';

  const panel = document.createElement('div');
  panel.className = 'mobile-settings-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Look sensitivity');
  panel.innerHTML = `
    <div class="mobile-settings-head">
      <div class="mobile-settings-title">LOOK SENSITIVITY</div>
      <div class="mobile-settings-value">100%</div>
    </div>
    <input class="mobile-settings-range" type="range" min="${MIN}" max="${MAX}" step="${STEP}" value="${multiplier}" aria-label="Look sensitivity" />
    <div class="mobile-settings-scale"><span>LOW</span><span>DEFAULT</span><span>HIGH</span></div>
    <div class="mobile-settings-note">Adjusts touch camera speed instantly. Your setting is saved on this device.</div>
  `;

  document.body.append(button, panel);

  const range = panel.querySelector('.mobile-settings-range');
  const value = panel.querySelector('.mobile-settings-value');

  const updateLabel = () => {
    value.textContent = `${Math.round(multiplier * 100)}%`;
  };

  const applySensitivity = () => {
    if (!window.game?.input) return false;
    game = window.game;
    const current = Number(game.input.sensitivity);

    if (baseSensitivity === null && Number.isFinite(current) && current > 0) {
      baseSensitivity = current;
    }

    if (baseSensitivity !== null) {
      game.input.sensitivity = baseSensitivity * multiplier;
      return true;
    }

    return false;
  };

  const setOpen = (open) => {
    button.classList.toggle('is-open', open);
    panel.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(!panel.classList.contains('is-open'));
    try { navigator.vibrate?.(5); } catch (_) {}
  });

  range.addEventListener('input', (event) => {
    multiplier = clamp(Number.parseFloat(event.currentTarget.value), MIN, MAX);
    localStorage.setItem(STORAGE_KEY, String(multiplier));
    updateLabel();
    applySensitivity();
    event.stopPropagation();
  });

  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => {
    panel.addEventListener(type, (event) => event.stopPropagation());
  });

  document.addEventListener('pointerdown', (event) => {
    if (!panel.classList.contains('is-open')) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    setOpen(false);
  }, true);

  updateLabel();

  const sync = () => {
    applySensitivity();
    requestAnimationFrame(sync);
  };
  requestAnimationFrame(sync);
})();
