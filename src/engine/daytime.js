// Pure day/night clock. `phase` in [0,1): [0, dayFrac) = daylight, the rest = night.
import { CONFIG } from '../../data/config.js';

export class DayClock {
  constructor(opts = {}) {
    this.dayLength = opts.dayLength ?? CONFIG.dayLength;
    this.nightLength = opts.nightLength ?? CONFIG.nightLength;
    this.cycle = this.dayLength + this.nightLength;
    this.dayFrac = this.dayLength / this.cycle;
    this.t = (opts.start ?? CONFIG.startTimeOfDay) * this.cycle;   // seconds inside the current day
    this.day = opts.day ?? 1;                                       // day counter (1-based)
    this.prevNight = this.isNight;
  }
  get phase() { return this.t / this.cycle; }
  get isNight() { return this.phase >= this.dayFrac; }
  // night number (1-based) belonging to the current day
  get nightNumber() { return this.day; }
  // Progress through the current night [0,1] (0 outside night).
  get nightProgress() { return this.isNight ? (this.phase - this.dayFrac) / (1 - this.dayFrac) : 0; }
  get secondsToDusk() { return this.isNight ? 0 : this.dayLength - this.t; }
  get secondsToDawn() { return this.isNight ? this.cycle - this.t : this.cycle - this.t; }
  // Advances time; returns events fired: 'dusk' | 'dawn'.
  advance(dt) {
    const events = [];
    const wasNight = this.isNight;
    this.t += dt;
    if (this.t >= this.cycle) { this.t -= this.cycle; this.day++; }
    const nowNight = this.isNight;
    if (!wasNight && nowNight) events.push('dusk');
    if (wasNight && !nowNight) events.push('dawn');
    return events;
  }
  // Astronomical angle: sun rises at phase 0, sets at dayFrac; the moon covers the same arc during the night.
  get sunAngle() {
    const p = this.phase;
    return p < this.dayFrac ? Math.PI * (p / this.dayFrac) : Math.PI + Math.PI * ((p - this.dayFrac) / (1 - this.dayFrac));
  }
  // Unit vectors pointing TOWARDS the sun / moon.
  sunDir(out = { x: 0, y: 0, z: 0 }) {
    const a = this.sunAngle, tilt = 0.28;
    const x = Math.cos(a), y = Math.sin(a), z = tilt;
    const l = Math.hypot(x, y, z);
    out.x = x / l; out.y = y / l; out.z = z / l;
    return out;
  }
  moonDir(out = { x: 0, y: 0, z: 0 }) {
    this.sunDir(out);
    out.x = -out.x; out.y = -out.y; out.z = -out.z * 0.6 - 0.2;
    return out;
  }
  // Clock face angle: 0 = dawn ... 1 = next dawn
  serialize() { return { t: this.t, day: this.day }; }
  restore(s) { this.t = s.t; this.day = s.day; this.prevNight = this.isNight; }
}
