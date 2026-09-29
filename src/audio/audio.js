// Web Audio: every sound is synthesised in code (no assets). Positional sounds use a panner relative to the camera.
import * as THREE from 'three';

export class AudioManager {
  constructor(game) {
    this.game = game;
    this.ctx = null; this.master = null; this.sfx = null; this.amb = null;
    this.vol = { master: 0.8, sfx: 0.9, ambient: 0.7 };
    this.noiseBuf = null; this.ready = false;
    this.ambientState = { birdT: 2, cricketT: 1, howlT: 25 };
    this._fwd = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
  }
  // Must be called from a user gesture (menu click).
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.sfx = ctx.createGain(); this.amb = ctx.createGain();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.sfx.connect(this.master); this.amb.connect(this.master); this.master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.setVolumes();
    this.startAmbient();
    this.ready = true;
  }
  setVolumes(v) {
    if (v) Object.assign(this.vol, v);
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master; this.sfx.gain.value = this.vol.sfx; this.amb.gain.value = this.vol.ambient;
  }
  noise(loop = false) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = loop; if (loop) s.loopStart = Math.random(); return s; }
  // route: optional panner for positional sounds
  out(pos, vol = 1, maxDist = 60) {
    const ctx = this.ctx, g = ctx.createGain(); g.gain.value = vol;
    if (pos) {
      const p = ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 3; p.maxDistance = maxDist; p.rolloffFactor = 1.4;
      if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y ?? 1; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y ?? 1, pos.z);
      g.connect(p); p.connect(this.sfx); return g;
    }
    g.connect(this.sfx); return g;
  }
  env(g, t0, a, d, peak = 1) { g.gain.cancelScheduledValues(t0); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d); }
  tone(o, dst, type, f0, f1, t0, dur, peak = 0.5) {
    const ctx = this.ctx, osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = type;
    osc.frequency.setValueAtTime(f0, t0); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    this.env(g, t0, 0.004, dur, peak); osc.connect(g); g.connect(dst); osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  burst(dst, t0, dur, type, freq, q, peak = 0.6, sweepTo = null) {
    const ctx = this.ctx, n = this.noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    this.env(g, t0, 0.005, dur, peak); n.connect(f); f.connect(g); g.connect(dst); n.start(t0, Math.random()); n.stop(t0 + dur + 0.05);
  }

  play(name, o = {}) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, pitch = o.pitch || 1, vol = o.vol ?? 1;
    const dst = this.out(o.pos ? { x: o.pos.x, y: (o.pos.y || 0) + 1, z: o.pos.z } : null, vol);
    switch (name) {
      case 'swing': this.burst(dst, t, 0.22, 'bandpass', 500 * pitch, 1.2, 0.45, 1800 * pitch); break;
      case 'whoosh': this.burst(dst, t, 0.3, 'bandpass', 900, 0.8, 0.35, 300); break;
      case 'chop': this.tone(0, dst, 'sine', 210 * pitch, 70, t, 0.16, 0.9); this.burst(dst, t, 0.09, 'bandpass', 1300 * pitch, 2, 0.6); this.burst(dst, t + 0.012, 0.22, 'lowpass', 700, 1, 0.3); break;
      case 'mine': this.burst(dst, t, 0.07, 'highpass', 2500, 1, 0.7); this.tone(0, dst, 'square', 1500 * pitch, 900, t, 0.1, 0.16); this.tone(0, dst, 'sine', 180, 60, t, 0.14, 0.7); break;
      case 'hit': this.tone(0, dst, 'sine', 150 * pitch, 45, t, 0.2, 1.0); this.burst(dst, t, 0.12, 'lowpass', 1800, 1, 0.8); break;
      case 'parry': for (const [f, a] of [[1240, 0.5], [1870, 0.4], [2760, 0.3], [3610, 0.2]]) this.tone(0, dst, 'sine', f * pitch, f * pitch * 0.98, t, 0.5, a * 0.6); this.burst(dst, t, 0.05, 'highpass', 3000, 1, 0.7); break;
      case 'block': this.tone(0, dst, 'triangle', 320, 120, t, 0.18, 0.7); this.burst(dst, t, 0.08, 'bandpass', 2200, 2, 0.5); break;
      case 'hurt': { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 1.5; f.connect(dst); this.tone(0, f, 'sawtooth', 190 * pitch, 110, t, 0.26, 0.8); this.burst(dst, t, 0.1, 'lowpass', 900, 1, 0.5); break; }
      case 'roll': this.burst(dst, t, 0.4, 'bandpass', 600, 0.7, 0.35, 250); this.tone(0, dst, 'sine', 90, 50, t + 0.3, 0.12, 0.4); break;
      case 'jump': this.burst(dst, t, 0.12, 'bandpass', 700, 1, 0.2, 1400); break;
      case 'land': this.tone(0, dst, 'sine', 100, 45, t, 0.14, 0.6); this.burst(dst, t, 0.1, 'lowpass', 600, 1, 0.5); break;
      case 'pickup': this.tone(0, dst, 'sine', 660, 990, t, 0.09, 0.3); this.tone(0, dst, 'sine', 990, 1320, t + 0.07, 0.12, 0.3); break;
      case 'ui': this.tone(0, dst, 'sine', 520, 700, t, 0.06, 0.22); break;
      case 'step_sand': this.burst(dst, t, 0.11, 'lowpass', 900 * pitch, 0.6, 0.22); break;
      case 'step_grass': this.burst(dst, t, 0.1, 'bandpass', 2400 * pitch, 0.7, 0.16); this.burst(dst, t, 0.07, 'lowpass', 500, 1, 0.1); break;
      case 'step_rock': this.burst(dst, t, 0.05, 'bandpass', 1900 * pitch, 2.5, 0.3); this.tone(0, dst, 'sine', 140, 80, t, 0.05, 0.18); break;
      case 'step_water': this.burst(dst, t, 0.22, 'bandpass', 1100 * pitch, 0.8, 0.28, 400); break;
      case 'crack': this.burst(dst, t, 0.4, 'bandpass', 400, 1.5, 0.7, 120); this.tone(0, dst, 'sawtooth', 80, 40, t, 0.5, 0.4); break;
      case 'tree_fall': this.burst(dst, t, 1.2, 'lowpass', 300, 1, 0.5, 90); this.tone(0, dst, 'sine', 70, 35, t + 1.35, 0.4, 1.0); this.burst(dst, t + 1.35, 0.5, 'lowpass', 500, 1, 0.8); break;
      case 'bird': { const f0 = 2200 + Math.random() * 1500; for (let i = 0; i < 3; i++) this.tone(0, dst, 'sine', f0, f0 * (1.2 + Math.random() * 0.4), t + i * 0.11, 0.09, 0.12); break; }
      case 'cricket': for (let i = 0; i < 5; i++) this.tone(0, dst, 'square', 4300, 4300, t + i * 0.055, 0.03, 0.03); break;
      case 'howl': { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 3; f.connect(dst); const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(260, t); osc.frequency.linearRampToValueAtTime(520, t + 0.9); osc.frequency.linearRampToValueAtTime(480, t + 1.8); osc.frequency.linearRampToValueAtTime(300, t + 3.0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.5); g.gain.linearRampToValueAtTime(0.4, t + 2.0); g.gain.linearRampToValueAtTime(0.0001, t + 3.1); osc.connect(g); g.connect(f); osc.start(t); osc.stop(t + 3.2); break; }
      case 'roar': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(dst); this.tone(0, f, 'sawtooth', 110 * pitch, 55, t, 0.7, 0.9); this.tone(0, f, 'square', 78 * pitch, 40, t, 0.7, 0.4); this.burst(dst, t, 0.6, 'lowpass', 700, 1, 0.5); break; }
      case 'squeal': this.tone(0, dst, 'sawtooth', 900 * pitch, 500, t, 0.3, 0.4); this.tone(0, dst, 'square', 1300 * pitch, 700, t, 0.25, 0.15); break;
      case 'growl': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.connect(dst); this.tone(0, f, 'sawtooth', 70 * pitch, 55, t, 0.6, 0.9); break; }
      case 'screech': this.tone(0, dst, 'sawtooth', 2000 * pitch, 3200, t, 0.16, 0.25); this.tone(0, dst, 'square', 2600 * pitch, 3600, t + 0.05, 0.12, 0.1); break;
      case 'thunder': this.burst(dst, t, 2.6, 'lowpass', 220, 0.8, 1.0, 60); break;
      case 'craft': this.tone(0, dst, 'triangle', 440, 440, t, 0.06, 0.4); this.tone(0, dst, 'triangle', 660, 660, t + 0.08, 0.06, 0.4); this.tone(0, dst, 'triangle', 880, 880, t + 0.16, 0.14, 0.4); break;
      case 'eat': this.burst(dst, t, 0.06, 'bandpass', 1000, 2, 0.4); this.burst(dst, t + 0.1, 0.06, 'bandpass', 900, 2, 0.4); this.burst(dst, t + 0.2, 0.06, 'bandpass', 1100, 2, 0.4); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone(0, dst, 'sine', 500 + i * 60, 300, t + i * 0.13, 0.1, 0.25); break;
      case 'dusk': this.tone(0, dst, 'sine', 196, 196, t, 2.2, 0.35); this.tone(0, dst, 'sine', 294, 294, t + 0.3, 2.0, 0.3); this.tone(0, dst, 'sine', 247, 247, t + 0.8, 2.0, 0.25); break;
      case 'dawn': this.tone(0, dst, 'sine', 392, 392, t, 1.6, 0.3); this.tone(0, dst, 'sine', 523, 523, t + 0.25, 1.8, 0.3); this.tone(0, dst, 'sine', 659, 659, t + 0.55, 2.0, 0.3); break;
    }
  }

  // continuous ambience: waves, wind, rain
  startAmbient() {
    const ctx = this.ctx;
    const mk = (type, f, q) => { const n = this.noise(true), fl = ctx.createBiquadFilter(), g = ctx.createGain(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; n.connect(fl); fl.connect(g); g.connect(this.amb); n.start(); return { n, fl, g }; };
    this.waves = mk('lowpass', 520, 0.5);
    this.wind = mk('bandpass', 420, 0.6);
    this.rain = mk('highpass', 1800, 0.4);
    this.fire = mk('bandpass', 900, 0.9);
  }
  update(dt, cam, player, atmos, weather) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, L = ctx.listener;
    cam.getWorldDirection(this._fwd);
    if (L.positionX) { L.positionX.value = cam.position.x; L.positionY.value = cam.position.y; L.positionZ.value = cam.position.z; L.forwardX.value = this._fwd.x; L.forwardY.value = this._fwd.y; L.forwardZ.value = this._fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
    else { L.setPosition(cam.position.x, cam.position.y, cam.position.z); L.setOrientation(this._fwd.x, this._fwd.y, this._fwd.z, 0, 1, 0); }
    const w = this.game.world, p = player.pos;
    // distance to the shoreline: sample 8 directions for the nearest sea
    let near = 60;
    for (let a = 0; a < 6.28; a += 0.785) for (let d = 4; d < near; d += 6) if (w.getHeight(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d) < -0.2) { near = Math.min(near, d); break; }
    const waveVol = Math.max(0, 1 - near / 60) * 0.5 * (0.7 + 0.3 * Math.sin(t * 0.35));
    this.waves.g.gain.setTargetAtTime(waveVol, t, 0.3); this.waves.fl.frequency.setTargetAtTime(380 + 250 * Math.sin(t * 0.32) ** 2, t, 0.2);
    const alt = Math.min(1, Math.max(0, (p.y - 3) / 40));
    const gust = 0.5 + 0.5 * Math.sin(t * 0.21 + Math.sin(t * 0.07) * 2);
    const storm = weather ? weather.intensity : 0;
    this.wind.g.gain.setTargetAtTime((0.05 + alt * 0.16 + gust * 0.05 + storm * 0.25) * (atmos.dayness > 0.5 ? 1 : 1.3), t, 0.4);
    this.wind.fl.frequency.setTargetAtTime(300 + gust * 350 + storm * 300, t, 0.5);
    this.rain.g.gain.setTargetAtTime(weather && weather.raining ? 0.16 * weather.intensity : 0, t, 0.6);
    // day/night wildlife
    const s = this.ambientState;
    s.birdT -= dt; s.cricketT -= dt; s.howlT -= dt;
    const day = atmos.dayness;
    const b = this.game.world.getBiome(p.x, p.z);
    if (day > 0.6 && s.birdT <= 0 && b !== 0 && (!weather || !weather.raining)) { s.birdT = 2 + Math.random() * 6; const a = Math.random() * 6.28; this.play('bird', { pos: { x: p.x + Math.cos(a) * 18, y: 8, z: p.z + Math.sin(a) * 18 }, vol: 0.6 }); }
    if (day < 0.35 && s.cricketT <= 0) { s.cricketT = 0.5 + Math.random() * 2; const a = Math.random() * 6.28; this.play('cricket', { pos: { x: p.x + Math.cos(a) * 9, y: 0.3, z: p.z + Math.sin(a) * 9 }, vol: 0.8 }); }
    if (day < 0.25 && s.howlT <= 0) { s.howlT = 22 + Math.random() * 30; const a = Math.random() * 6.28; this.play('howl', { pos: { x: p.x + Math.cos(a) * 70, y: 3, z: p.z + Math.sin(a) * 70 }, vol: 2.0 }); }
  }
  // fire crackle loop volume driven externally
  setFire(v) { if (this.ready) this.fire.g.gain.setTargetAtTime(v * 0.18, this.ctx.currentTime, 0.2); }
}
