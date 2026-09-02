export class CombatMusic {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.running = false;
    this.next = 0;
    this.step = 0;
    this.intensity = 0;
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.05;
    this.master.connect(this.ctx.destination);
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  start() {
    this.ensure();
    this.running = true;
    this.next = this.ctx.currentTime + 0.03;
    this.schedule();
  }

  stop() { this.running = false; }

  pulse(time, freq, gain, decay = .11, type = 'sine') {
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + .004);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(amp).connect(this.master);
    osc.start(time);
    osc.stop(time + decay + .03);
  }

  schedule() {
    if (!this.running || !this.ctx) return;
    const lookahead = this.ctx.currentTime + .22;
    const bpm = 92 + this.intensity * 34;
    const stepLen = 60 / bpm / 2;
    while (this.next < lookahead) {
      const accent = this.step % 8 === 0;
      const sync = this.step % 2 === 0;
      if (sync) this.pulse(this.next, accent ? 52 : 46, accent ? .12 : .065, .12, 'triangle');
      if (this.intensity > .28 && this.step % 4 === 2) this.pulse(this.next, 104, .026 + this.intensity * .02, .08, 'square');
      if (this.intensity > .62 && this.step % 2 === 1) this.pulse(this.next, 208, .015, .045, 'sawtooth');
      this.step++;
      this.next += stepLen;
    }
    setTimeout(() => this.schedule(), 55);
  }
}
