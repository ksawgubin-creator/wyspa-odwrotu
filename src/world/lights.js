// Dynamic light pool: many light sources (torch, campfires, lava, lanterns) register themselves, but only the nearest
// few get a real PointLight per frame; the rest fall back to a cheap additive glow sprite.
import * as THREE from 'three';

const POOL = 6;
export class LightPool {
  constructor(game) {
    this.game = game;
    this.sources = new Set();
    this.lights = [];
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight(0xffa040, 0, 12, 1.6);
      l.castShadow = false;
      game.scene.add(l); this.lights.push(l);
    }
    // faint cool fill on the player so the silhouette never disappears at night
    this.fill = new THREE.PointLight(0x7f9cff, 0, 7, 1.5);
    game.scene.add(this.fill);
    this.t = 0;
  }
  // src: {x,y,z, color (hex), intensity, radius, flicker (0..1), on:true, glow:true}
  add(src) { src.on = src.on !== false; src.phase = Math.random() * 100; this.sources.add(src); return src; }
  remove(src) { this.sources.delete(src); }
  // 0..1 how strongly light-fearing monsters are repelled at (x,z); returns also the nearest scary source via out
  scareAt(x, z, out = null) {
    let best = 0;
    for (const s of this.sources) {
      if (!s.on || !s.scare) continue;
      const d = Math.hypot(s.x - x, s.z - z), R = s.scareRadius || s.radius * 0.6;
      if (d >= R) continue;
      const k = s.scare * (1 - d / R);
      if (k > best) { best = k; if (out) { out.x = s.x; out.z = s.z; } }
    }
    return best;
  }
  update(dt, camPos, playerPos, dayness) {
    this.t += dt;
    const list = [];
    for (const s of this.sources) {
      if (!s.on) continue;
      const d = Math.hypot(s.x - camPos.x, s.z - camPos.z);
      s._d = d; s._score = d / Math.max(0.5, s.radius / 10);
      list.push(s);
    }
    list.sort((a, b) => a._score - b._score);
    for (let i = 0; i < POOL; i++) {
      const l = this.lights[i], s = list[i];
      if (!s || s._d > 90) { l.intensity = 0; continue; }
      const f = 1 + (s.flicker || 0) * (Math.sin(this.t * 13 + s.phase) * 0.12 + Math.sin(this.t * 7.3 + s.phase * 2) * 0.1 + Math.sin(this.t * 31 + s.phase) * 0.06);
      l.position.set(s.x, s.y, s.z); l.color.setHex(s.color); l.distance = s.radius; l.intensity = s.intensity * f * (s.dim ?? 1);
    }
    this.fill.position.set(playerPos.x, playerPos.y + 2.4, playerPos.z);
    this.fill.intensity = (1 - dayness) * 0.9;
  }
}
