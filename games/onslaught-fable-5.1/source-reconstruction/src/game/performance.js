import * as THREE from 'three';

export class PerformanceGovernor {
  constructor({ renderer, composer, camera, state, bloom, cinematic }) {
    this.renderer = renderer;
    this.composer = composer;
    this.camera = camera;
    this.state = state;
    this.bloom = bloom;
    this.cinematic = cinematic;
    this.touch = navigator.maxTouchPoints > 0 || matchMedia?.('(pointer:coarse)').matches;
    this.baseDpr = Math.min(devicePixelRatio, this.touch ? 1.3 : 1.7);
    this.scale = 1;
    this.samples = [];
    this.last = performance.now();
    this.lastTune = this.last;
    this.minScale = this.touch ? .62 : .72;
    this.maxScale = 1;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const frame = now => {
      if (!this.running) return;
      const dt = now - this.last;
      this.last = now;
      if (dt < 120) this.samples.push(dt);
      if (this.samples.length > 90) this.samples.shift();
      if (now - this.lastTune > 1800 && this.samples.length > 30) {
        this.tune();
        this.lastTune = now;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  tune() {
    const sorted = [...this.samples].sort((a,b)=>a-b);
    const p75 = sorted[Math.floor(sorted.length * .75)] || 16.7;
    const enemyPressure = this.state?.enemies?.length || 0;
    const target = this.touch ? 22.5 : 18.5;
    let next = this.scale;
    if (p75 > target * 1.18 || enemyPressure > (this.touch ? 22 : 38)) next -= .08;
    else if (p75 < target * .82 && enemyPressure < (this.touch ? 14 : 26)) next += .045;
    next = THREE.MathUtils.clamp(next, this.minScale, this.maxScale);
    if (Math.abs(next - this.scale) < .025) return;
    this.scale = next;
    const dpr = this.baseDpr * this.scale;
    this.renderer.setPixelRatio(dpr);
    this.composer.setPixelRatio(dpr);
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.composer.setSize(innerWidth, innerHeight);
    if (this.bloom) this.bloom.strength = (this.touch ? .42 : .62) * THREE.MathUtils.lerp(.72, 1, this.scale);
    if (this.cinematic?.uniforms?.aberration) {
      this.cinematic.uniforms.aberration.value = (this.touch ? .00075 : .00115) * THREE.MathUtils.lerp(.7, 1, this.scale);
    }
  }

  stop() { this.running = false; }
}
