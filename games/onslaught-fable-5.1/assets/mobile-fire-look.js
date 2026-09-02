(() => {
  const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
  if (!touchCapable) return;

  const LOOK_GAIN = 1.18;
  let activePointer = null;
  let lastX = 0;
  let lastY = 0;

  const bind = () => {
    const fireButton = document.querySelector('[data-control="fire"]');
    if (!(fireButton instanceof HTMLButtonElement)) return false;

    fireButton.addEventListener('pointerdown', (event) => {
      if (activePointer !== null) return;
      activePointer = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
    });

    fireButton.addEventListener('pointermove', (event) => {
      if (event.pointerId !== activePointer || !window.game?.input) return;

      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      // Keep firing through the existing control handler while feeding the same
      // look deltas used by the normal right-side drag zone. Pointer capture on
      // the FIRE button means aiming continues even if the thumb slides beyond it.
      window.game.input.dx += dx * LOOK_GAIN;
      window.game.input.dy += dy * LOOK_GAIN;
    });

    const end = (event) => {
      if (activePointer === null) return;
      if (event.pointerId !== activePointer && event.type !== 'lostpointercapture') return;
      activePointer = null;
    };

    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => {
      fireButton.addEventListener(type, end);
    });

    return true;
  };

  if (bind()) return;

  const waitForControls = () => {
    if (!bind()) requestAnimationFrame(waitForControls);
  };
  requestAnimationFrame(waitForControls);
})();
