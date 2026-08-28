export const audio = {
  ctx: null as AudioContext | null,
  master: null as GainNode | null,
  eng: null as OscillatorNode | null,
  engG: null as GainNode | null,
  windG: null as GainNode | null,
  muted: false,
  started: false,
  rwrUntil: 0,
  lastRwr: 0,

  async start(): Promise<void> {
    if (this.started) {
      await this.ctx?.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.2;
    this.master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 58;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = 480;
    this.engG = ctx.createGain();
    this.engG.gain.value = 0;
    osc.connect(filt);
    filt.connect(this.engG);
    this.engG.connect(this.master);
    osc.start();
    this.eng = osc;

    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = "bandpass";
    wf.frequency.value = 980;
    this.windG = ctx.createGain();
    this.windG.gain.value = 0;
    noise.connect(wf);
    wf.connect(this.windG);
    this.windG.connect(this.master);
    noise.start();
    this.started = true;
    await ctx.resume();
  },

  update(speed: number, throttle: number): void {
    if (!this.ctx || !this.eng || this.muted) {
      if (this.engG) this.engG.gain.setTargetAtTime(0, this.ctx?.currentTime || 0, 0.05);
      return;
    }
    const t = this.ctx.currentTime;
    this.eng.frequency.setTargetAtTime(50 + throttle * 95 + speed * 0.22, t, 0.08);
    this.engG!.gain.setTargetAtTime(0.025 + throttle * 0.13, t, 0.06);
    this.windG!.gain.setTargetAtTime(Math.min(0.11, (speed / 90) * 0.09), t, 0.1);
  },

  beep(freq: number, dur: number, gain = 0.07, type: OscillatorType = "square"): void {
    if (!this.ctx || this.muted || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(this.master);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.stop(this.ctx.currentTime + dur + 0.02);
  },

  gun(): void {
    this.beep(240, 0.055, 0.07, "square");
  },
  boom(): void {
    if (!this.ctx || this.muted || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = 88;
    g.gain.value = 0.22;
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.frequency.exponentialRampToValueAtTime(28, this.ctx.currentTime + 0.42);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.48);
    o.stop(this.ctx.currentTime + 0.5);
  },
  hit(): void {
    this.beep(150, 0.16, 0.1, "triangle");
  },
  lock(): void {
    this.beep(880, 0.07, 0.05, "sine");
  },
  missile(): void {
    this.beep(140, 0.22, 0.12, "sawtooth");
  },
  flare(): void {
    this.beep(620, 0.12, 0.06, "triangle");
  },
  rwr(nowMs: number): void {
    if (nowMs < this.lastRwr + 280) return;
    this.lastRwr = nowMs;
    this.beep(980, 0.08, 0.09, "square");
  },
  installUnlock() {
    const go = () => {
      void this.start();
    };
    window.addEventListener("pointerdown", go, { once: true });
    window.addEventListener("keydown", go, { once: true });
  },
  setMuted(v: boolean): void {
    this.muted = v;
    if (this.master) this.master.gain.value = v ? 0 : 0.2;
  },
};
