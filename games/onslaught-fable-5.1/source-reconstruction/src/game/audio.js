export class CombatAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  ensure() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.34;
    this.master.connect(this.ctx.destination);
  }

  burst({ frequency = 90, duration = 0.08, gain = 0.35, type = 'sawtooth' } = {}) {
    this.ensure();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * 0.42), now + duration);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.master);
    osc.start(now);
    osc.stop(now + duration);
  }

  noise(duration = 0.06, gain = 0.18) {
    this.ensure();
    const size = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = this.ctx.createBufferSource();
    const amp = this.ctx.createGain();
    amp.gain.value = gain;
    src.buffer = buffer;
    src.connect(amp).connect(this.master);
    src.start();
  }

  shot(id) {
    if (id === 'hammer12') {
      this.noise(0.14, 0.34); this.burst({ frequency: 68, duration: 0.15, gain: 0.44 });
    } else if (id === 'longshot') {
      this.noise(0.07, 0.22); this.burst({ frequency: 118, duration: 0.11, gain: 0.36, type: 'square' });
    } else {
      this.noise(0.045, 0.17); this.burst({ frequency: 96, duration: 0.065, gain: 0.29 });
    }
  }

  reload() { this.burst({ frequency: 520, duration: 0.035, gain: 0.08, type: 'square' }); }
  hit() { this.burst({ frequency: 760, duration: 0.028, gain: 0.07, type: 'sine' }); }
  hurt() { this.burst({ frequency: 54, duration: 0.12, gain: 0.18, type: 'triangle' }); }
}
