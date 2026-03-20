/**
 * SoundManager — procedurally generated sounds via Web Audio API.
 * No external files needed; works fully offline.
 */
export class SoundManager {
  constructor() {
    this._enabled = true;
    this._ctx     = null;
  }

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  get enabled() { return this._enabled; }
  toggle() { this._enabled = !this._enabled; return this._enabled; }

  // ── Sound primitives ────────────────────

  _noise(duration, freq, type = 'square', gainVal = 0.3) {
    if (!this._enabled) return;
    try {
      const ctx  = this._getCtx();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type      = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  _whiteNoise(duration, gainVal = 0.2) {
    if (!this._enabled) return;
    try {
      const ctx    = this._getCtx();
      const bufLen = ctx.sampleRate * duration;
      const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data   = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type            = 'bandpass';
      filt.frequency.value = 600;
      filt.Q.value         = 0.5;

      src.buffer = buf;
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      src.connect(filt);
      filt.connect(gain);
      gain.connect(ctx.destination);
      src.start(ctx.currentTime);
      src.stop(ctx.currentTime + duration);
    } catch (_) {}
  }

  // ── Public sound events ──────────────────

  playFire() {
    // Cannon shot: deep thud + short noise burst
    this._noise(0.25, 80,  'sawtooth', 0.5);
    this._whiteNoise(0.15, 0.3);
  }

  playHit() {
    // Explosion: low rumble + noisy burst
    this._noise(0.4, 60,  'sawtooth', 0.6);
    this._whiteNoise(0.4, 0.4);
    this._noise(0.2, 120, 'square',   0.2);
  }

  playSunk() {
    // Big explosion: multiple overlapping hits
    this._noise(0.6,  50, 'sawtooth', 0.7);
    this._whiteNoise(0.6, 0.5);
    setTimeout(() => this._noise(0.3, 80, 'sawtooth', 0.4), 80);
  }

  playMiss() {
    // Splash: high-pitched noise
    this._whiteNoise(0.25, 0.15);
    this._noise(0.2, 800, 'sine', 0.08);
  }

  playVictory() {
    // Ascending tones
    const notes = [261, 329, 392, 523];
    notes.forEach((f, i) => {
      setTimeout(() => this._noise(0.25, f, 'sine', 0.3), i * 130);
    });
  }

  playDefeat() {
    // Descending tones
    const notes = [392, 329, 261, 196];
    notes.forEach((f, i) => {
      setTimeout(() => this._noise(0.3, f, 'sawtooth', 0.25), i * 150);
    });
  }

  playPlace() {
    this._noise(0.1, 440, 'sine', 0.15);
  }
}
