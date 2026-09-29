// AI brains: small state machines choosing modes/goals for an Entity. All numbers live in data/animals.js.
// Modes used: idle, eat, wander, flee, chase, circle, stalk, freeze, retreat, sleep, howl, hide, windup/attack/recover (set by Entity).
import { clamp, angleDiff, lerp, smoothstep } from '../engine/util.js';

const TAU = Math.PI * 2;
const P = (e) => e.game.player;

// pick a walkable random point around (cx,cz)
function pickPoint(e, cx, cz, radius, tries = 6) {
  const g = e.game;
  for (let i = 0; i < tries; i++) {
    const a = e.rng() * TAU, r = 2 + e.rng() * radius;
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (e.walkableAt(x, z, e.x, e.z) && !g.colliders.overlaps(x, z, e.radius + 0.2)) return { x, z };
  }
  return { x: cx, z: cz };
}
function away(e, fromX, fromZ, dist = 14, jitter = 0) {
  let dx = e.x - fromX, dz = e.z - fromZ; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  if (jitter) { const c = Math.cos(jitter), s = Math.sin(jitter); [dx, dz] = [dx * c - dz * s, dx * s + dz * c]; }
  return { x: e.x + dx * dist, z: e.z + dz * dist };
}

// ---------------------------------------------------------------------------------------------------
class PreyBrain {
  init(e) { e.wanderT = e.rng() * 4; e.zig = 1; e.zigT = 0; e.leapT = 1; }
  think(e, dt) {
    const g = e.game, def = e.def, night = g.clock.isNight;
    if (night && def.night === 'vanish') { e.despawning = true; e.stop(); return; }
    if (night && def.night === 'hide') {
      const d = e.distTo(e.home.x, e.home.z);
      if (d < 1.2) { e.setMode('hide'); e.stop(); e.despawning = true; return; }
      e.moveTo(e.home.x, e.home.z, def.run * 0.7); e.setMode('flee'); return;
    }
    const dist = e.playerDist, p = P(e);
    const threat = dist < e.detectRange() || e.anger > 0 && dist < def.safe;
    if (threat) {
      if (e.mode !== 'flee') { e.setMode('flee'); e.zigT = 0; }
      e.zigT -= dt; if (e.zigT <= 0) { e.zig = -e.zig; e.zigT = 0.35 + e.rng() * 0.5; }
      const tgt = away(e, p.pos.x, p.pos.z, 14, e.zig * (e.kind === 'rabbit' ? 0.55 : 0.25));
      if (def.leaps) {                                   // goats: prefer higher ground and leap over obstacles
        const up = pickPoint(e, e.x + (tgt.x - e.x), e.z + (tgt.z - e.z), 4, 4);
        e.moveTo(up.x, up.z, def.run);
        e.leapT -= dt;
        if (e.leapT <= 0 && e.grounded && e.speed2() > 3) { e.vy = 6.5; e.grounded = false; e.leapT = 1.6 + e.rng() * 2.4; }
      } else e.moveTo(tgt.x, tgt.z, def.run);
      return;
    }
    if (e.mode === 'flee') { e.setMode('idle'); e.wanderT = 1 + e.rng() * 2; e.stop(); }
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      if (e.mode === 'wander' || e.rng() < 0.35) { e.setMode(e.rng() < 0.7 ? 'eat' : 'idle'); e.stop(); e.wanderT = 2 + e.rng() * 5; }
      else { const pt = pickPoint(e, e.home.x, e.home.z, 14); e.setMode('wander'); e.moveTo(pt.x, pt.z, def.walk); e.wanderT = 4 + e.rng() * 6; }
    }
    if (e.mode === 'wander' && !e.goal) { e.setMode('idle'); e.wanderT = 1 + e.rng() * 3; }
  }
}

// ---------------------------------------------------------------------------------------------------
class BoarBrain extends PreyBrain {
  onHurt(e) { e.hostileTarget = true; }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e), night = g.clock.isNight, dist = e.playerDist;
    const angry = e.anger > 0 || (night && dist < def.aggroRange);
    e.aggro = lerp(e.aggro, angry ? 1 : 0, 0.08);
    if (!angry) { super.think(e, dt); return; }
    if (p.dead) { e.stop(); e.setMode('idle'); return; }
    e.setMode('chase');
    const stopDist = 1.2;
    e.moveTo(p.pos.x, p.pos.z, def.run);
    if (e.canAttack() && dist < 8.5 && dist > 2.2) e.startAttack(p.pos.x, p.pos.z);
    else if (e.canAttack() && dist <= 2.2) e.startAttack(p.pos.x, p.pos.z);
    if (dist > def.aggroRange * 1.8 && !night) e.anger = 0;
  }
}

// ---------------------------------------------------------------------------------------------------
class CrabBrain {
  init(e) { e.sideways = true; e.wanderT = e.rng() * 3; }
  onHurt(e) { if (e.pack) e.pack.hunting = true; }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e), night = g.clock.isNight, dist = e.playerDist;
    const hostile = (night && dist < def.aggroRange) || e.anger > 0 || (e.pack && e.pack.hunting && dist < def.aggroRange * 1.5);
    e.aggro = lerp(e.aggro, hostile ? 1 : 0, 0.1);
    if (hostile && !p.dead) {
      if (e.pack) e.pack.hunting = true;
      e.setMode('chase'); e.faceTarget = { x: p.pos.x, z: p.pos.z };
      e.moveTo(p.pos.x, p.pos.z, def.run);
      if (e.canAttack() && dist < def.attack.range + 0.8) e.startAttack(p.pos.x, p.pos.z);
      return;
    }
    e.faceTarget = null;
    if (dist < 2.5) { const t = away(e, p.pos.x, p.pos.z, 3); e.setMode('flee'); e.moveTo(t.x, t.z, def.run * 0.7); return; }   // day: shy but harmless
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      if (e.mode === 'wander') { e.setMode('idle'); e.stop(); e.wanderT = 1.5 + e.rng() * 3; }
      else { const pt = pickPoint(e, e.home.x, e.home.z, 6); e.setMode('wander'); e.moveTo(pt.x, pt.z, def.walk); e.wanderT = 3 + e.rng() * 4; }
    }
    if (e.mode === 'wander' && !e.goal) { e.setMode('idle'); e.wanderT = 1 + e.rng() * 2; }
  }
}

// ---------------------------------------------------------------------------------------------------
// Wolf packs coordinate: circle the player, one (or more at high nights) attacks at a time.
export class Pack {
  constructor(game) { this.game = game; this.members = []; this.hunting = false; this.huntT = 0; this.attackers = new Set(); this.nextAttack = 0; this.howled = false; this.lastTick = -1; this.leader = null; this.circleDir = Math.random() < 0.5 ? 1 : -1; this.angle = Math.random() * TAU; }
  add(e) { this.members.push(e); e.pack = this; if (!this.leader) this.leader = e; }
  alive() { return this.members.filter((m) => !m.dead && !m.remove); }
  alert(e) { this.hunting = true; this.huntT = 30; }
  onMemberDeath(e) { this.attackers.delete(e); if (this.leader === e) this.leader = this.alive()[0] || null; }
  maxAttackers() { const n = this.game.clock.day; return 1 + (n >= 4 ? 1 : 0) + (n >= 8 ? 1 : 0); }
  tick(t, dt) {
    if (t === this.lastTick) return; this.lastTick = t;
    const g = this.game, p = g.player, night = g.clock.isNight;
    const alive = this.alive();
    const near = alive.some((m) => m.playerDist < m.def.aggroRange);
    if (this.huntT > 0) this.huntT -= dt;
    const shouldHunt = (night && near) || this.huntT > 0;
    if (shouldHunt && !this.hunting) { this.hunting = true; this.howled = false; }
    if (!shouldHunt && this.hunting && !near) { this.hunting = false; this.attackers.clear(); }
    if (!this.hunting) return;
    this.angle += this.circleDir * dt * 0.55;
    for (const a of [...this.attackers]) if (a.dead || a.remove || a.cooldown > 0 && !a.atk && a.mode !== 'chase') this.attackers.delete(a);
    if (g.time > this.nextAttack && this.attackers.size < this.maxAttackers()) {
      const cand = alive.filter((m) => !this.attackers.has(m) && m.cooldown <= 0 && m.playerDist < 16 && !m.atk && m.stun <= 0).sort((a, b) => a.playerDist - b.playerDist)[0];
      if (cand) { this.attackers.add(cand); cand.attackToken = g.time + 6; this.nextAttack = g.time + 1.6 + Math.random() * 1.8; }
    }
    if (!this.howled && alive.length) { this.howled = true; const h = alive[0]; h.howlT = 2.4; g.audio?.play('howl', { pos: h, vol: 1.6 }); }
  }
}

class WolfBrain {
  init(e) { e.wanderT = e.rng() * 3; e.offset = { a: e.rng() * TAU, r: 2 + e.rng() * 4 }; e.circleJit = e.rng() * 2 - 1; }
  onHurt(e) { if (e.pack) { e.pack.hunting = true; e.pack.huntT = 40; } }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e), pk = e.pack, dist = e.playerDist;
    if (pk) pk.tick(g.time, dt);
    if (e.howlT > 0) { e.howlT -= dt; e.setMode('howl'); e.stop(); return; }
    const hunting = pk ? pk.hunting : (g.clock.isNight && dist < def.aggroRange);
    e.aggro = lerp(e.aggro, hunting ? 1 : 0, 0.06);
    e.faceTarget = null;
    if (!hunting) {
      // daytime: shy pack animals
      if (dist < e.detectRange() * 0.8) {
        const t = away(e, p.pos.x, p.pos.z, 16, (e.circleJit) * 0.4);
        e.setMode('flee'); e.moveTo(t.x, t.z, def.run * 0.85); return;
      }
      if (e.mode === 'flee' && dist < def.safe) { const t = away(e, p.pos.x, p.pos.z, 12); e.moveTo(t.x, t.z, def.run * 0.6); return; }
      e.wanderT -= dt;
      if (e.wanderT <= 0) {
        const lead = pk && pk.leader;
        if (lead && lead !== e && !lead.dead) { const t = { x: lead.x + Math.cos(e.offset.a) * e.offset.r, z: lead.z + Math.sin(e.offset.a) * e.offset.r }; e.setMode('wander'); e.moveTo(t.x, t.z, def.walk * 1.15); e.wanderT = 1.5 + e.rng() * 2; }
        else if (e.mode === 'wander' || e.rng() < 0.3) { e.setMode('idle'); e.stop(); e.wanderT = 2 + e.rng() * 5; }
        else { const t = pickPoint(e, e.home.x, e.home.z, 22); e.setMode('wander'); e.moveTo(t.x, t.z, def.walk); e.wanderT = 5 + e.rng() * 6; }
      }
      if (e.mode === 'flee' && dist > def.safe) { e.setMode('idle'); e.wanderT = 2; e.stop(); }
      return;
    }
    if (p.dead) { e.setMode('idle'); e.stop(); return; }
    // ---- hunting ----
    const isAttacker = pk ? pk.attackers.has(e) : true;
    if (isAttacker) {
      e.setMode('chase'); e.moveTo(p.pos.x, p.pos.z, def.run * 0.95);
      if (e.canAttack() && dist < 4.2) { e.startAttack(p.pos.x, p.pos.z); if (pk) pk.attackers.delete(e); }
      if (pk && g.time > (e.attackToken || 0)) pk.attackers.delete(e);
      return;
    }
    if (dist > def.circleR + 8) { e.setMode('chase'); e.moveTo(p.pos.x, p.pos.z, def.run * 0.85); return; }
    e.setMode('circle');
    const idx = pk ? pk.members.indexOf(e) : 0;
    const ang = (pk ? pk.angle : 0) + (idx / Math.max(1, pk ? pk.members.length : 1)) * TAU;
    const R = def.circleR + e.circleJit * 1.5;
    const tx = p.pos.x + Math.sin(ang) * R, tz = p.pos.z + Math.cos(ang) * R;
    e.faceTarget = { x: p.pos.x, z: p.pos.z };
    e.moveTo(tx, tz, def.walk * 2.1);
  }
}

// ---------------------------------------------------------------------------------------------------
class PantherBrain {
  init(e) { e.setMode('sleep'); e.retreatT = 0; e.lair = { x: e.x, z: e.z }; }
  onHurt(e) { e.woken = true; }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e), night = g.clock.isNight, dist = e.playerDist;
    if (e.mode === 'sleep') {
      e.stop();
      if (night) { e.setMode('idle'); return; }
      const noisy = p.sprinting ? 1.6 : p.sneaking ? 0.15 : 0.7;
      if (e.anger > 0 || (dist < 6 && e.rng() < dt * noisy * 1.4) || dist < 2.2) { e.setMode('idle'); e.woken = true; e.anger = 1; e.angerT = 40; g.audio?.play('growl', { pos: e, vol: 0.9, pitch: 0.8 }); }
      return;
    }
    const hunting = night ? dist < def.aggroRange : (e.woken && dist < def.aggroRange * 1.3);
    e.aggro = lerp(e.aggro, hunting ? 1 : 0, 0.05);
    if (!hunting) {
      if (!night && e.woken && dist > def.aggroRange * 1.3) { e.woken = false; }
      if (!night && !e.woken) { const d = e.distTo(e.lair.x, e.lair.z); if (d > 2) { e.setMode('wander'); e.moveTo(e.lair.x, e.lair.z, def.walk); } else { e.setMode('sleep'); e.stop(); } return; }
      e.wanderT = (e.wanderT ?? 0) - dt;
      if (e.wanderT <= 0) { const t = pickPoint(e, e.lair.x, e.lair.z, 18); e.setMode('wander'); e.moveTo(t.x, t.z, def.walk); e.wanderT = 6 + e.rng() * 6; }
      if (e.mode === 'wander' && !e.goal) e.setMode('idle');
      return;
    }
    if (p.dead) { e.stop(); e.setMode('idle'); return; }
    if (e.retreatT > 0) { e.retreatT -= dt; const t = away(e, p.pos.x, p.pos.z, 10); e.setMode('retreat'); e.moveTo(t.x, t.z, def.walk * 1.4); return; }
    // stalk: creep closer while the player is not looking; freeze when watched
    const cy = g.cameraRig ? g.cameraRig.yaw : p.yaw;
    const toE = Math.atan2(e.x - p.pos.x, e.z - p.pos.z);
    const seen = Math.abs(angleDiff(cy, toE)) < 0.85 && dist < 26;
    if (dist > def.attack.leapRange + 0.5) {
      if (seen && dist > 6 && !e.woken) { e.setMode('freeze'); e.stop(); }
      else { e.setMode('stalk'); const s = seen ? def.stalkSpeed * 0.6 : def.stalkSpeed * (dist > 18 ? 1.8 : 1); e.moveTo(p.pos.x, p.pos.z, e.woken ? def.run * 0.8 : s); }
    } else {
      e.setMode('stalk'); e.moveTo(p.pos.x, p.pos.z, def.stalkSpeed * 0.8);
      if (e.canAttack()) { e.startAttack(p.pos.x, p.pos.z); e.retreatT = 0; e.afterAttackRetreat = true; }
    }
  }
}

// ---------------------------------------------------------------------------------------------------
class ShadowBrain {
  init(e) { e.courage = 0.22 + e.game.clock.day * 0.05 + e.rng() * 0.15; e.wanderT = 0; }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e), dist = e.playerDist;
    if (g.atmos.dayness > 0.45 && !g.fogActive) { e.despawning = true; e.stop(); return; }
    const src = e._src || (e._src = { x: 0, z: 0 });
    const light = g.lights.scareAt(e.x, e.z, src);
    const pLight = g.lights.scareAt(p.pos.x, p.pos.z);
    e.aggro = lerp(e.aggro, 1, 0.05);
    if (light > e.courage) {                                   // light-shy: flee away from the light source
      e.setMode('flee'); const t = away(e, src.x, src.z, 10); e.moveTo(t.x, t.z, def.run * 1.1); return;
    }
    if (p.dead) { e.stop(); e.setMode('idle'); return; }
    // don't walk into light: probe the next step
    if (pLight > e.courage && dist < 11) {                     // the player stands in the light: lurk at its edge
      e.setMode('circle'); e.faceTarget = { x: p.pos.x, z: p.pos.z };
      const a = Math.atan2(e.x - p.pos.x, e.z - p.pos.z) + dt * 0.4;
      e.moveTo(p.pos.x + Math.sin(a) * 10.5, p.pos.z + Math.cos(a) * 10.5, def.walk); return;
    }
    e.faceTarget = null;
    e.setMode('chase');
    const target = e.game.pickMonsterTarget ? e.game.pickMonsterTarget(e) : p.pos;
    const td = Math.hypot(target.x - e.x, target.z - e.z) - (target.half || 0);
    e.moveTo(target.x, target.z, td > 16 ? def.walk : def.run * 0.9);
    if (e.canAttack() && td < def.attack.range + 0.4) e.startAttack(target.x, target.z, target.struct || null);
  }
}

// ---------------------------------------------------------------------------------------------------
class BatBrain {
  init(e) { e.circleA = e.rng() * TAU; e.circleDir = e.rng() < 0.5 ? 1 : -1; e.courage = 0.3 + e.rng() * 0.2; e.altitude = e.def.flyHeight; }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e), dist = e.playerDist;
    if (g.atmos.dayness > 0.45 && !g.fogActive) { e.despawning = true; e.stop(); return; }
    const src = e._src || (e._src = { x: 0, z: 0 });
    const light = g.lights.scareAt(e.x, e.z, src);
    e.altitude = lerp(e.altitude, def.flyHeight + Math.sin(g.time * 1.7 + e.id) * 0.9, 0.05);
    if (light > e.courage) { e.setMode('flee'); const t = away(e, src.x, src.z, 12); e.moveTo(t.x, t.z, def.run); e.altitude = def.flyHeight + 2; return; }
    if (p.dead) { e.setMode('idle'); e.stop(); return; }
    const target = e.game.pickMonsterTarget ? e.game.pickMonsterTarget(e) : p.pos;
    e.circleA += e.circleDir * dt * 0.9;
    e.setMode('circle');
    const R = 6 + Math.sin(e.id) * 2;
    e.moveTo(target.x + Math.sin(e.circleA) * R, target.z + Math.cos(e.circleA) * R, def.run * 0.75);
    if (e.canAttack() && dist < 11 && e.rng() < dt * 1.2) e.startAttack(target.x, target.z);
  }
}

class BossBrain {
  init(e) { e.fbT = 3; }
  think(e, dt) {
    const g = e.game, def = e.def, p = P(e);
    e.aggro = 1; e.fbT -= dt;
    if (p.dead && !(g.ending && g.ending.active)) { e.stop(); e.setMode('idle'); return; }
    if (g.atmos.dayness > 0.5 && !g.fogActive && !(g.ending && g.ending.active)) { e.despawning = true; return; }
    const target = e.forcedTarget || (g.ending?.active && g.ending.struct && g.buildings.list.includes(g.ending.struct) ? { x: g.ending.struct.x, z: g.ending.struct.z, struct: g.ending.struct, half: 2.2 } : g.pickMonsterTarget ? g.pickMonsterTarget(e) : p.pos);
    let tgt = target;
    // the player who gets too close draws the boss' attention
    if (e.playerDist < 9 && !p.dead) tgt = p.pos;
    const td = Math.hypot(tgt.x - e.x, tgt.z - e.z) - (tgt.half || 0);
    e.setMode('chase');
    e.moveTo(tgt.x, tgt.z, td > 20 ? def.run : def.walk);
    if (e.canAttack() && td < def.attack.range - 0.4) { e.startAttack(tgt.x, tgt.z, tgt.struct || null); return; }
    if (def.attack.fireballs && e.fbT <= 0 && td > 9 && td < 34 && !e.atk) { e.fbT = 4.5 + Math.random() * 2; e.shootFireball(tgt.x, tgt.z); }
  }
}

const BRAINS = { boss: BossBrain, prey: PreyBrain, boar: BoarBrain, crab: CrabBrain, wolf: WolfBrain, panther: PantherBrain, shadow: ShadowBrain, bat: BatBrain };
export function makeBrain(name) { return new (BRAINS[name] || PreyBrain)(); }
