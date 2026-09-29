// Dropped items lying on the ground: settle on terrain, bob gently, get magnetised to the player.
import * as THREE from 'three';
import { ITEMS } from '../../data/items.js';
import { dropModel, itemMaterial } from '../gfx/itemmodels.js';
import { hash2 } from '../engine/rng.js';

export class Drops {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.group = new THREE.Group(); this.group.name = 'drops'; game.scene.add(this.group);
  }
  spawn(id, n, x, z, opts = {}) {
    const w = this.game.world;
    const d = ITEMS[id]; if (!d) return null;
    const y = Math.max(w.getHeight(x, z), 0) + (opts.height ?? 0.6);
    const mesh = new THREE.Mesh(dropModel(d.shape || 'blob', d.color || '#999'), itemMaterial);
    mesh.castShadow = false;
    const drop = {
      id, n, dur: opts.dur, x, y, z, vx: opts.vx ?? (Math.random() - 0.5) * 2.2, vy: opts.vy ?? 3 + Math.random() * 1.5, vz: opts.vz ?? (Math.random() - 0.5) * 2.2,
      age: 0, delay: opts.delay ?? 0.55, mesh, spin: Math.random() * 6, settled: false, ttl: 420, glow: d.cat === 'tool' || d.cat === 'weapon',
    };
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.list.push(drop);
    return drop;
  }
  // scatter a loot roll [{item,min,max,chance}] around (x,z)
  spawnRolls(rolls, x, z, rng = Math.random, spread = 1.4) {
    const out = [];
    for (const r of rolls) {
      if (r.chance !== undefined && rng() > r.chance) continue;
      const n = r.min + Math.floor(rng() * (r.max - r.min + 1));
      if (n <= 0) continue;
      const a = rng() * Math.PI * 2, d = rng() * spread;
      out.push(this.spawn(r.item, n, x + Math.cos(a) * d * 0.5, z + Math.sin(a) * d * 0.5, { vx: Math.cos(a) * d, vz: Math.sin(a) * d }));
    }
    return out;
  }
  remove(drop) {
    const i = this.list.indexOf(drop); if (i < 0) return;
    this.list.splice(i, 1); this.group.remove(drop.mesh);
  }
  update(dt, player) {
    const w = this.game.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.age += dt; d.ttl -= dt;
      if (d.ttl <= 0) { this.remove(d); continue; }
      const ground = Math.max(w.getHeight(d.x, d.z), -0.05) + 0.02;
      if (!d.settled) {
        d.vy -= 16 * dt; d.x += d.vx * dt; d.z += d.vz * dt; d.y += d.vy * dt;
        d.vx *= 1 - 2.2 * dt; d.vz *= 1 - 2.2 * dt;
        if (d.y <= ground) { d.y = ground; if (Math.abs(d.vy) < 1.2) { d.settled = true; d.vy = 0; } else d.vy = -d.vy * 0.35; }
        if (this.game.colliders && this.game.colliders.overlaps(d.x, d.z, 0.1)) { d.vx = d.vz = 0; }
      } else d.y = ground;
      const bob = d.settled ? Math.sin(this.game.time * 2.2 + d.spin) * 0.03 + 0.06 : 0;
      d.mesh.position.set(d.x, d.y + bob, d.z);
      d.mesh.rotation.y = d.spin + (d.settled ? this.game.time * 0.6 : this.game.time * 4);
      // magnet + pickup
      if (player && !player.dead && d.age > d.delay) {
        const dx = player.pos.x - d.x, dz = player.pos.z - d.z, dist = Math.hypot(dx, dz);
        if (dist < 2.6 && Math.abs(player.pos.y - d.y) < 2.2 && player.inventory.freeSpaceFor(d.id) >= d.n) {
          const pull = (1 - dist / 2.6) * 7 * dt;
          d.x += (dx / (dist || 1)) * pull; d.z += (dz / (dist || 1)) * pull; d.settled = true;
          if (dist < 0.85) { this.pickup(d, player); }
        }
      }
    }
  }
  pickup(d, player) {
    const left = player.inventory.add(d.id, d.n, { dur: d.dur });
    if (left < d.n) this.game.onPickup?.(d.id, d.n - left);
    if (left <= 0) this.remove(d); else d.n = left;
  }
  nearest(x, z, r) {
    let best = null, bd = r;
    for (const d of this.list) { const dist = Math.hypot(d.x - x, d.z - z); if (dist < bd) { bd = dist; best = d; } }
    return best;
  }
}
