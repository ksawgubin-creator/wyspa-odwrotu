// EntityManager: owns all creatures, a spatial hash for queries, habitat slots (daytime population) and the night director
// (waves of monsters that get bigger every night). Numbers are ROBOCZE.
import { ANIMALS } from '../../data/animals.js';
import { Entity } from './entity.js';
import { Pack } from '../ai/brains.js';
import { mulberry32 } from '../engine/rng.js';
import { WORLD, BIOME, LAYOUT } from '../world/worldgen.js';
import { clamp, angleDiff } from '../engine/util.js';

const ACTIVE_R = 105, DESPAWN_R = 140, CELL = 8;

export class EntityManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.grid = new Map();
    this.slots = [];
    this.frame = 0;
    this.slotT = 0;
    this.director = new NightDirector(this);
    this.buildSlots();
  }

  // ---- habitat slots -------------------------------------------------------------------------------
  buildSlots() {
    const w = this.game.world, rng = mulberry32(w.seed ^ 0xa11ce);
    for (const [kind, def] of Object.entries(ANIMALS)) {
      if (!def.slots) continue;
      let made = 0, tries = 0;
      while (made < def.slots && tries++ < def.slots * 400) {
        const x = (rng() - 0.5) * 420, z = (rng() - 0.5) * 420;
        const b = w.getBiome(x, z), h = w.getHeight(x, z);
        if (!def.biomes.includes(b) || h < 0.9 || !w.inBounds(x, z, 12)) continue;
        if (w.getSlope(x, z) > (def.leaps ? 1.6 : 0.7)) continue;
        if (Math.hypot(x - w.spawn.x, z - w.spawn.z) < (kind === 'crab' ? 30 : kind === 'rabbit' ? 22 : 70)) continue;
        if (kind === 'crab' && h > 2.2) continue;
        if (kind === 'goat' && h < 8) continue;
        // keep species spread out
        if (this.slots.some((s) => s.kind === kind && Math.hypot(s.x - x, s.z - z) < 28)) continue;
        this.slots.push({ kind, x, z, entities: [], respawnAt: 0, n: def.group[0] + Math.floor(rng() * (def.group[1] - def.group[0] + 1)), rng });
        made++;
      }
    }
  }
  slotDeath(slot) {
    if (slot.entities.every((e) => e.dead)) slot.respawnAt = this.game.time + ANIMALS[slot.kind].respawn * (0.8 + Math.random() * 0.5);
  }
  manageSlots() {
    const g = this.game, p = g.player, night = g.clock.isNight, day = g.atmos.dayness;
    for (const s of this.slots) {
      const def = ANIMALS[s.kind], dist = Math.hypot(s.x - p.pos.x, s.z - p.pos.z);
      s.entities = s.entities.filter((e) => !e.remove);
      if (s.entities.length && dist > DESPAWN_R && s.entities.every((e) => !e.atk && (e.mode === 'idle' || e.mode === 'wander' || e.mode === 'eat' || e.mode === 'sleep' || e.dead))) {
        for (const e of s.entities) this.remove(e); s.entities = []; continue;
      }
      if (s.entities.length || dist > ACTIVE_R || dist < 22 || g.time < s.respawnAt) continue;
      if (def.night === 'vanish' && day < 0.6) continue;
      if (def.night === 'hide' && day < 0.6) continue;
      this.spawnSlot(s);
    }
  }
  spawnSlot(s) {
    const g = this.game, def = ANIMALS[s.kind];
    const pack = s.kind === 'wolf' || s.kind === 'crab' || s.kind === 'boar' ? new Pack(g) : null;
    for (let i = 0; i < s.n; i++) {
      const a = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 1.5 + Math.random() * 3;
      const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
      if (g.world.getHeight(x, z) < 0.2 && s.kind !== 'crab') continue;
      const e = this.spawn(s.kind, x, z, { pack: s.kind === 'boar' ? null : pack, slot: { onDeath: () => this.slotDeath(s) } });
      e.home = { x: s.x, z: s.z };
      s.entities.push(e);
    }
  }

  // ---- lifecycle -----------------------------------------------------------------------------------
  spawn(kind, x, z, opts = {}) {
    const e = new Entity(this.game, kind, x, z, opts);
    if (opts.pack) opts.pack.add(e);
    this.list.push(e);
    return e;
  }
  remove(e) { e.remove = true; }
  nearestAlive(x, z, r, pred) { let best = null, bd = r; for (const e of this.list) { if (e.dead) continue; if (pred && !pred(e)) continue; const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; best = e; } } return best; }
  near(x, z, r, fn) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) { const a = this.grid.get(cx * 4099 + cz); if (a) for (const e of a) fn(e); }
  }
  countHostileNight() { let n = 0; for (const e of this.list) if (e.nightSpawned && !e.dead) n++; return n; }

  update(dt) {
    const g = this.game;
    this.frame++;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (e.remove) { e.dispose(); this.list.splice(i, 1); continue; }
      // distant creatures think less often
      if (e.playerDist > 75 && !e.atk && !e.dead) { if ((this.frame + e.id) % 4 !== 0) continue; e.update(dt * 4); }
      else e.update(dt);
    }
    // rebuild the spatial hash
    this.grid.clear();
    for (const e of this.list) { const k = Math.floor(e.x / CELL) * 4099 + Math.floor(e.z / CELL); (this.grid.get(k) || this.grid.set(k, []).get(k)).push(e); }
    // soft separation so creatures do not stack
    for (const e of this.list) {
      if (e.dead || e.def.flyHeight) continue;
      this.near(e.x, e.z, e.radius * 2.2, (o) => {
        if (o === e || o.dead || o.def.flyHeight) return;
        const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = e.radius + o.radius;
        if (d < min && d > 1e-4) { const push = (min - d) * 0.5; e.x += (dx / d) * push * 0.5; e.z += (dz / d) * push * 0.5; }
      });
    }
    this.slotT -= dt; if (this.slotT <= 0) { this.slotT = 0.6; this.manageSlots(); }
    this.director.update(dt);
  }
  updateVisual(dt, alpha) { for (const e of this.list) e.updateVisual(dt, alpha); }
  dispose() { for (const e of this.list) e.dispose(); this.list.length = 0; }
  clearNightMonsters() { for (const e of this.list) if (e.nightSpawned) e.despawning = true; }
}

// ---------------------------------------------------------------------------------------------------
class NightDirector {
  constructor(mgr) { this.mgr = mgr; this.budget = 0; this.wave = 8; this.active = false; }
  onDusk() {
    const g = this.mgr.game, n = g.clock.day;
    this.active = true; this.bruteDone = false;
    this.budget = (8 + 4 * n) * g.diff.spawn * (g.bloodMoonTonight() ? 1.6 : 1);                 // ROBOCZE
    this.wave = 5;
  }
  onDawn() { this.active = false; this.mgr.clearNightMonsters(); }
  cap() { return Math.min(26, 6 + 2 * this.mgr.game.clock.day); }
  update(dt) {
    const g = this.mgr.game;
    const fog = g.fogActive && !g.clock.isNight;
    if (g.clock.isNight && !this.active && g.clock.nightProgress < 0.5) this.onDusk();
    else if (fog && !this.active) { this.active = true; this.budget = (5 + 2 * g.clock.day) * g.diff.spawn; this.wave = 4; }
    if (!g.clock.isNight && !fog && this.active) this.onDawn();
    if (!this.active || g.player.dead) return;
    if (g.bloodMoonTonight() && !this.bruteDone && g.clock.nightProgress > 0.2 && !(g.ending && g.ending.active)) {
      this.bruteDone = true;
      const pt = this.spawnPoint(55, 70) || this.spawnPoint(35, 60);
      if (pt) { const e = this.mgr.spawn('brute', pt.x, pt.z, { nightSpawned: true, hpMul: 1 + 0.15 * Math.floor(g.clock.day / 7 - 1), dmgMul: 1 + 0.1 * Math.floor(g.clock.day / 7 - 1) }); e.fade = 1; g.hud.banner('Rozbijacz', 'Wielki cień rusza na bazę.', 3.5); g.audio?.play('roar', { pos: e, vol: 1.6, pitch: 0.6 }); }
    }
    this.wave -= dt;
    if (this.wave > 0 || this.budget <= 0 || this.mgr.countHostileNight() >= this.cap()) return;
    this.spawnWave();
    this.wave = (12 + Math.random() * 10) / (1 + 0.06 * g.clock.day);
  }
  spawnPoint(minD = 30, maxD = 48) {
    const g = this.mgr.game, p = g.player, w = g.world;
    const camYaw = g.cameraRig ? g.cameraRig.yaw : 0;
    for (let i = 0; i < 24; i++) {
      // prefer spots outside the camera's view cone
      const a = camYaw + Math.PI + (Math.random() - 0.5) * 4.2, d = minD + Math.random() * (maxD - minD);
      const x = p.pos.x + Math.sin(a) * d, z = p.pos.z + Math.cos(a) * d;
      if (!w.inBounds(x, z, 10) || w.getHeight(x, z) < 0.4 || w.getSlope(x, z) > 0.9) continue;
      if (g.colliders.overlaps(x, z, 0.8)) continue;
      if (g.lights.scareAt(x, z) > 0.05) continue;
      return { x, z };
    }
    return null;
  }
  spawnWave() {
    const g = this.mgr.game, n = g.clock.day, mgr = this.mgr;
    const opts = { nightSpawned: true, hpMul: 1 + 0.12 * (n - 1), dmgMul: 1 + 0.07 * (n - 1) };
    const table = [
      { kind: 'shadow', cost: 2, w: 5, count: () => 1 + Math.floor(Math.random() * (1 + n * 0.4)), min: 1 },
      { kind: 'bat', cost: 2, w: 3, count: () => 1 + Math.floor(Math.random() * 2), min: 1 },
      { kind: 'wolf', cost: 6, w: 2, count: () => 2 + Math.min(3, Math.floor(n / 3)), min: 2, pack: true },
      { kind: 'panther', cost: 9, w: 1, count: () => 1, min: 3 },
    ].filter((t) => n >= t.min && t.cost <= this.budget + 3);
    if (!table.length) { this.budget = 0; return; }
    let r = Math.random() * table.reduce((a, t) => a + t.w, 0), pick = table[0];
    for (const t of table) { r -= t.w; if (r <= 0) { pick = t; break; } }
    const pt = this.spawnPoint(pick.kind === 'bat' ? 26 : 32, pick.kind === 'bat' ? 40 : 50); if (!pt) return;
    const cnt = pick.count(), pack = pick.pack ? new Pack(g) : null;
    for (let i = 0; i < cnt; i++) {
      const e = mgr.spawn(pick.kind, pt.x + (Math.random() - 0.5) * 4, pt.z + (Math.random() - 0.5) * 4, { ...opts, pack, nightSpawned: true });
      e.home = { x: pt.x, z: pt.z };
      if (pack) { pack.hunting = true; pack.huntT = 40; }
      e.fade = 0.01;
    }
    this.budget -= pick.cost * (pick.pack ? 1 : Math.max(1, cnt * 0.6));
  }
}
