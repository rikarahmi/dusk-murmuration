// Synthesised sound only — no audio files, no network. Every effect is a
// small WebAudio patch built on the fly. The context is created lazily on
// the first player gesture, because browsers block audio before one.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Call from any gesture handler (click, key, pointer). Safe to call often.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  tone(freq, at, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A mote chime that climbs the scale with the combo: x1 low, x5 high.
  chime(combo) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0];
    const base = scale[Math.max(0, Math.min(4, combo - 1))];
    this.tone(base, 0, 0.22, 'sine', 0.22);
    this.tone(base * 2, 0, 0.14, 'sine', 0.07);
  }

  // A low thud for a storm hit, with a short filtered-noise rumble.
  thud() {
    this.tone(110, 0, 0.35, 'sine', 0.5, 42);
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.25);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // A soft warning whoosh just before a gust arrives.
  whoosh() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.7);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, t0);
    filter.frequency.exponentialRampToValueAtTime(1800, t0 + 0.7);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  // The dawn chord: a slow major arpeggio when the night is survived.
  dawnChord() {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => this.tone(freq, i * 0.14, 1.4, 'triangle', 0.14));
  }
}
