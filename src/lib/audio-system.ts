/**
 * AudioSystem — Web Audio API procedural cinematic audio.
 *
 * All sounds generated at runtime — zero external audio files.
 *
 * Voices:
 *   wind     → brown noise with LFO (storm, gusts)
 *   door     → filtered creak/thud (interaction)
 *   fire     → crackling noise with flicker LFO (tavern)
 *   ambient  → low rumble filtered noise (tavern interior)
 *
 * Master gain control for mute/unmute.
 * Autoplay policy: AudioContext created on first user gesture.
 */

export type SceneName = 'storm' | 'door-creak' | 'door-open' | 'tavern' | 'silence';

interface Voice {
  stop(): void;
  ramp(to: number, duration: number): void;
}

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Map<string, Voice>();
  private _muted = true;
  private _ready = false;

  /** Initialize AudioContext. Call from user gesture handler. */
  init(): void {
    if (this._ready) return;
    try {
      const Ctor =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const master = ctx.createGain();
      this.master = master;
      master.gain.value = 0;
      master.connect(ctx.destination);
      this._ready = true;
    } catch {
      console.warn('[Audio] Web Audio API not available');
    }
  }

  get muted(): boolean { return this._muted; }
  get ready(): boolean { return this._ready; }

  resume(): void {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setMuted(muted: boolean, rampMs = 300): void {
    this._muted = muted;
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(
      muted ? 0 : 0.45,
      now + rampMs / 1000,
    );
  }

  toggleMute(): boolean {
    this.setMuted(!this._muted);
    return this._muted;
  }

  /** Crossfade to a scene */
  transitionTo(scene: SceneName, fadeMs = 1500): void {
    this.resume();
    switch (scene) {
      case 'storm':
        this._startWind();
        this._stop('fire');
        this._stop('ambient');
        break;
      case 'door-creak':
        this._playCreak();
        break;
      case 'door-open':
        this._rampWind(0.15, fadeMs / 1000);
        this._startFire();
        break;
      case 'tavern':
        this._rampWind(0, 2.0);
        this._startFire();
        this._startAmbient();
        break;
      case 'silence':
        this._stopAll();
        if (this.master && this.ctx) {
          const now = this.ctx.currentTime;
          this.master.gain.cancelScheduledValues(now);
          this.master.gain.linearRampToValueAtTime(0, now + 0.5);
        }
        break;
    }
  }

  playCreak(): void {
    this._playCreak();
  }

  destroy(): void {
    this._stopAll();
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
    this._ready = false;
  }

  // ---- Private: Wind ----

  private _startWind(): void {
    if (this.voices.has('wind') || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const len = 2 * sr;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = (last + 0.02 * w) / 1.02;
      last = d[i];
      d[i] *= 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = 0.15;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    // Wind gust LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 200;
    lfo.connect(lfoG);
    lfoG.connect(filter.frequency);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();

    this.voices.set('wind', {
      stop: () => { try { src.stop(); } catch {} try { lfo.stop(); } catch {} src.disconnect(); filter.disconnect(); gain.disconnect(); lfo.disconnect(); lfoG.disconnect(); },
      ramp: (to, dur) => { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.linearRampToValueAtTime(to, ctx.currentTime + dur); },
    });
  }

  private _rampWind(to: number, dur: number): void {
    this.voices.get('wind')?.ramp(to, dur);
  }

  // ---- Private: Door Creak ----

  private _playCreak(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Wood creak
    const len = Math.floor(ctx.sampleRate * 0.3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700 + Math.random() * 400;
    bp.Q.value = 2.5;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(now);
    src.stop(now + 0.4);

    // Low thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 85;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0, now);
    og.gain.linearRampToValueAtTime(0.05, now + 0.05);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(og);
    og.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  // ---- Private: Fire ----

  private _startFire(): void {
    if (this.voices.has('fire') || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(Math.random(), 4) * 0.5;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 550;
    bp.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0.035;

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 3 + Math.random() * 2;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.025;
    lfo.connect(lfoG);
    lfoG.connect(gain.gain);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(this.master);
    src.start();
    lfo.start();

    this.voices.set('fire', {
      stop: () => { try { src.stop(); } catch {} try { lfo.stop(); } catch {} src.disconnect(); bp.disconnect(); gain.disconnect(); lfo.disconnect(); lfoG.disconnect(); },
      ramp: (to, dur) => { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.linearRampToValueAtTime(to, ctx.currentTime + dur); },
    });
  }

  // ---- Private: Tavern Ambient ----

  private _startAmbient(): void {
    if (this.voices.has('ambient') || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 3);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.25;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 200;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 70;

    const gain = ctx.createGain();
    gain.gain.value = 0.015;

    src.connect(lp);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(this.master);
    src.start();

    this.voices.set('ambient', {
      stop: () => { try { src.stop(); } catch {} src.disconnect(); lp.disconnect(); hp.disconnect(); gain.disconnect(); },
      ramp: (to, dur) => { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.linearRampToValueAtTime(to, ctx.currentTime + dur); },
    });
  }

  // ---- Helpers ----

  private _stop(name: string): void {
    const v = this.voices.get(name);
    if (v) {
      v.ramp(0, 0.3);
      setTimeout(() => { v.stop(); this.voices.delete(name); }, 400);
    }
  }

  private _stopAll(): void {
    this.voices.forEach((v) => v.stop());
    this.voices.clear();
  }
}

export const audioSystem = new AudioSystem();
