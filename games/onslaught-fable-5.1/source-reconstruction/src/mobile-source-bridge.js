const coarse = navigator.maxTouchPoints > 0 || matchMedia?.('(pointer:coarse)').matches;
if (coarse) {
  const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  while (!window.game?.renderer) await waitFrame();
  const script = document.createElement('script');
  script.src = '../assets/mobile-controls.js';
  script.async = true;
  script.dataset.reconstructionBridge = 'production-mobile-controls';
  document.body.appendChild(script);
}
