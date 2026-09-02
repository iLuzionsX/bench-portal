import { CombatMusic } from './game/music.js';

const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
while (!window.game?.state) await waitFrame();

const { state } = window.game;
const music = new CombatMusic();
let armed = false;

function arm() {
  if (armed) return;
  armed = true;
  music.start();
}
window.addEventListener('pointerdown', arm, { once: true });
window.addEventListener('keydown', arm, { once: true });

function update() {
  const hostiles = state.enemies?.length || 0;
  const wavePressure = Math.min(1, Math.max(0, (state.wave - 1) / 10));
  const hordePressure = Math.min(1, hostiles / 28);
  const healthPressure = Math.min(1, Math.max(0, (55 - state.hp) / 55));
  const intensity = state.running ? Math.min(1, wavePressure * .38 + hordePressure * .48 + healthPressure * .28) : 0;
  music.setIntensity(intensity);
  requestAnimationFrame(update);
}
requestAnimationFrame(update);

window.game.music = music;
