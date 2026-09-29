// Weather: clear / cloudy / rain / storm (lightning, thunder, wind) / fog (night monsters roam by day).
// Drives Atmosphere.weather, wind, rain particles, campfire soaking (via .raining/.intensity) and lightning strikes that can reveal ore.
import * as THREE from 'three';
import { shared } from '../gfx/materials.js';
import { clamp, lerp, damp } from '../engine/util.js';

const RAIN_N = 1400;
export class Weather {
  constructor(game) {
    this.game = game;
    this.kind = 'clear';           // clear | cloudy | rain | storm | fog
    this.timer = 90;               // seconds until the next weather decision
    this.intensity = 0;            // 0..1 smoothed strength of the current bad weather
    this.target = 0;
    this.raining = false; this.storm = false; this.fogged = false;
    this.flash = 0; this.nextBolt = 10; this.thunderQ = [];
    this.bolt = null;
    // rain streaks follow the camera
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(RAIN_N * 6); this.vel = new Float32Array(RAIN_N);
    for (let i = 0; i < RAIN_N; i++) this.reset(i, true);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: 0xaac8ff, transparent: true, opacity: 0.0, depthWrite: false });
    this.rain = new THREE.LineSegments(g, this.mat); this.rain.frustumCulled = false; this.rain.renderOrder = 6; this.rain.visible = false;
    game.scene.add(this.rain);
  }
  reset(i, init) {
    const R = 22;
    const x = (Math.random() - 0.5) * 2 * R, z = (Math.random() - 0.5) * 2 * R, y = init ? Math.random() * 18 : 18 + Math.random() * 3;
    const o = i * 6; this.pos[o] = x; this.pos[o + 1] = y; this.pos[o + 2] = z; this.pos[o + 3] = x; this.pos[o + 4] = y + 0.9; this.pos[o + 5] = z;
    this.vel[i] = 22 + Math.random() * 8;
  }
  set(kind, dur = null) {
    if (this.kind === 'storm' && kind !== 'storm') this.game.events?.onStormEnd();
    this.kind = kind;
    this.target = { clear: 0, cloudy: 0.3, rain: 0.65, storm: 1, fog: 0.75 }[kind];
    this.timer = dur ?? (kind === 'clear' ? 150 + Math.random() * 200 : 70 + Math.random() * 110);
    const names = { rain: 'Zaczyna padać deszcz…', storm: 'Nadciąga burza!', fog: 'Gęsta mgła spowija wyspę… Coś w niej się porusza.', clear: 'Niebo się przejaśnia.' };
    if (names[kind] && this.game.hud) this.game.hud.banner(kind === 'storm' ? 'Burza' : kind === 'fog' ? 'Mgła' : kind === 'rain' ? 'Deszcz' : 'Pogoda', names[kind], 3);
  }
  decide() {
    const g = this.game, day = g.clock.day, r = Math.random();
    if (this.kind !== 'clear' && this.kind !== 'cloudy') return this.set('clear');
    if (r < 0.20) return this.set('cloudy');
    if (r < 0.42) return this.set('rain');
    if (r < 0.56 && day >= 2) return this.set('storm');
    if (r < 0.68 && day >= 3) return this.set('fog');
    this.set('clear');
  }
  update(dt) {
    const g = this.game, atm = g.atmos;
    this.timer -= dt; if (this.timer <= 0) this.decide();
    this.intensity = damp(this.intensity, this.target, 0.35, dt);
    const k = this.intensity;
    this.raining = (this.kind === 'rain' || this.kind === 'storm') && k > 0.25;
    this.storm = this.kind === 'storm' && k > 0.5;
    this.fogged = this.kind === 'fog' && k > 0.35;
    g.fogActive = this.fogged;
    const w = atm.weather;
    const wet = this.raining ? k : 0;
    w.cloud = lerp(0.42, 0.95, clamp(k * 1.3, 0, 1) * (this.kind === 'clear' ? 0 : 1)) * (this.kind === 'fog' ? 0.9 : 1) + (this.kind === 'cloudy' ? 0.2 * k / 0.3 : 0);
    w.dark = this.kind === 'storm' ? k * 0.85 : this.kind === 'rain' ? k * 0.5 : this.kind === 'fog' ? k * 0.35 : this.kind === 'cloudy' ? k * 0.25 : 0;
    w.fogMul = this.fogged ? lerp(1, 0.16, clamp((k - 0.3) / 0.45, 0, 1)) : this.raining ? lerp(1, 0.55, k) : 1;
    w.lightMul = 1 - w.dark * 0.35;
    shared.uWindGust.value = 1 + (this.storm ? 2.6 * k : this.raining ? 0.8 * k : 0);
    shared.uWind.value.set(0.8 + k * 1.2, 0.35 + k * 0.5);
    // rain streaks
    const cam = g.camera.position;
    this.rain.visible = this.raining;
    this.mat.opacity = this.raining ? 0.16 + 0.22 * k : 0;
    if (this.raining) {
      this.rain.position.set(cam.x, Math.max(0, cam.y - 8), cam.z);
      const sp = 1 + this.storm * 0.5, slant = this.storm ? 0.28 : 0.1;
      for (let i = 0; i < RAIN_N; i++) {
        const o = i * 6, v = this.vel[i] * sp * dt;
        this.pos[o + 1] -= v; this.pos[o + 4] -= v; this.pos[o] += slant * v; this.pos[o + 3] += slant * v;
        if (this.pos[o + 1] < -4) this.reset(i, false);
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      // fewer visible drops in light rain: hide by collapsing every other segment
    }
    // lightning
    this.flash = Math.max(0, this.flash - dt * 2.4);
    atm.flash = this.flash;
    if (this.storm) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) { this.strike(); this.nextBolt = 5 + Math.random() * 11; }
    }
    for (let i = this.thunderQ.length - 1; i >= 0; i--) { this.thunderQ[i].t -= dt; if (this.thunderQ[i].t <= 0) { g.audio?.play('thunder', { pos: this.thunderQ[i].pos, vol: this.thunderQ[i].vol }); this.thunderQ.splice(i, 1); } }
    if (this.bolt) { this.bolt.life -= dt; this.bolt.mesh.material.opacity = clamp(this.bolt.life / 0.25, 0, 1); if (this.bolt.life <= 0) { g.scene.remove(this.bolt.mesh); this.bolt.mesh.geometry.dispose(); this.bolt = null; } }
    // fire soaking is handled in BuildingSystem (uses .raining/.intensity)
  }
  strike(atX = null, atZ = null) {
    const g = this.game, w = g.world, p = g.player.pos;
    const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 110;
    const x = atX ?? p.x + Math.cos(a) * d, z = atZ ?? p.z + Math.sin(a) * d;
    const gy = Math.max(0, w.getHeight(x, z));
    // jagged bolt from the clouds
    const pts = []; let cx = x + (Math.random() - 0.5) * 30, cz = z + (Math.random() - 0.5) * 30;
    for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(lerpV(cx, x, t) + (i < 12 ? (Math.random() - 0.5) * 6 * (1 - t) : 0), 90 * (1 - t) + gy * t, lerpV(cz, z, t) + (i < 12 ? (Math.random() - 0.5) * 6 * (1 - t) : 0)); }
    const segs = []; for (let i = 0; i < pts.length - 3; i += 3) segs.push(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    if (this.bolt) { g.scene.remove(this.bolt.mesh); this.bolt.mesh.geometry.dispose(); }
    const mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 1, depthWrite: false, fog: false }));
    mesh.frustumCulled = false; g.scene.add(mesh); this.bolt = { mesh, life: 0.3 };
    this.flash = 1;
    const dist = Math.hypot(x - p.x, z - p.z);
    this.thunderQ.push({ t: dist / 90, pos: { x, y: 4, z }, vol: clamp(3.2 - dist / 60, 0.6, 3) });
    g.fx.dust(x, gy + 0.3, z, 2); g.fx.burst('glow', x, gy + 0.5, z, 20, { color: ['#ffffff', '#bcd0ff'], speed: [2, 8], up: [1, 6], size: [0.4, 1.0], life: [0.2, 0.5], grav: 6 });
    // a strike next to a boulder splits it and reveals ore
    g.field.revealNear?.(x, z, 9);
    if (dist < 14) g.cameraRig?.shake(0.4);
    // strike on a tree sets it... just scorches (no fire mechanics yet)
  }
}
const lerpV = (a, b, t) => a + (b - a) * t;
