// A living creature in the world: state, steering, attack state machine, damage, death. Brains (src/ai/brains.js) decide
// what to do; the Entity executes it (movement with terrain/collider constraints, telegraphed attacks, animation state).
import * as THREE from 'three';
import { ANIMALS } from '../../data/animals.js';
import { createCreature } from '../gfx/creatures.js';
import { makeBrain } from '../ai/brains.js';
import { clamp, lerp, damp, dampAngle, angleDiff, smoothstep } from '../engine/util.js';
import { mulberry32 } from '../engine/rng.js';

let NEXT_ID = 1;
const TWO_PI = Math.PI * 2;

export class Entity {
  constructor(game, kind, x, z, opts = {}) {
    const def = ANIMALS[kind];
    this.game = game; this.kind = kind; this.def = def; this.id = NEXT_ID++;
    this.seed = opts.seed ?? ((Math.random() * 1e6) | 0);
    this.rng = mulberry32(this.seed);
    this.x = x; this.z = z; this.y = opts.y ?? Math.max(game.world.getHeight(x, z), 0);
    this.px = x; this.py = this.y; this.pz = z;
    this.yaw = opts.yaw ?? this.rng() * TWO_PI; this.pyaw = this.yaw;
    this.vx = 0; this.vz = 0; this.vy = 0; this.grounded = true;
    const mul = opts.hpMul ?? 1;
    this.maxHp = def.hp * mul; this.hp = this.maxHp; this.dmgMul = opts.dmgMul ?? 1;
    this.radius = def.radius; this.height = def.height;
    this.dead = false; this.deadT = -1; this.mode = 'idle'; this.modeT = 0;
    this.home = { x, z }; this.pack = opts.pack || null; this.slot = opts.slot || null;
    this.stun = 0; this.hurtT = 0; this.flash = 0; this.telegraph = 0; this.attackT = 0; this.attackKind = null; this.atk = null;
    this.cooldown = 1 + this.rng() * 2; this.anger = 0; this.turnRate = 0; this.lookYaw = 0; this.aggro = 0;
    this.goal = null;                            // {x,z,speed}
    this.faceTarget = null;                       // {x,z} to face while moving (circling)
    this.sideways = false;
    this.fade = 1; this.despawning = false; this.remove = false;
    this.nightSpawned = !!opts.nightSpawned;
    this.hostileTarget = def.brain !== 'prey' || false;
    this.creature = createCreature(def.creature || kind, { seed: this.seed, scale: def.scale || 1 });
    this.creature.root.position.set(x, this.y, z);
    if (def.scale) this.creature.root.scale.setScalar(def.scale);
    game.scene.add(this.creature.root);
    this.brain = makeBrain(def.brain);
    this.brain.init?.(this);
    this.stuckT = 0; this.lastPos = { x, z }; this.avoid = null; this.avoidT = 0;
    this.altitude = def.flyHeight ? def.flyHeight : 0;
    this.sound = def.sound; this.bloodColor = def.bloodColor;
    this.lod = 1; this.tick = 0;
    this.playerDist = 999;
    this.setMode('idle');
  }

  get pos() { return this; }
  speed2() { return Math.hypot(this.vx, this.vz); }
  get asleep() { return this.mode === 'sleep'; }
  get isVulnerable() { return this.stun > 0 || (this.atk && this.atk.phase === 'recover') || this.asleep; }

  setMode(m) { if (this.mode !== m) { this.mode = m; this.modeT = 0; } }
  distTo(x, z) { return Math.hypot(x - this.x, z - this.z); }
  angleTo(x, z) { return Math.atan2(x - this.x, z - this.z); }

  // ---- perception -------------------------------------------------------------------------------
  // How far can this creature notice the player right now?
  detectRange() {
    const p = this.game.player, d = this.def;
    let r = d.alert;
    if (p.sprinting) r *= 1.5; else if (p.sneaking) r *= 0.5 * (1 - 0.1 * (p.skills?.stealth || 0));
    if (p.heldId === 'torch') r *= 1.25;
    if (this.game.clock.isNight && (d.brain === 'wolf' || d.brain === 'panther' || d.brain === 'boar')) r = Math.max(r, d.aggroRange || r);
    return r;
  }

  // ---- steering ---------------------------------------------------------------------------------
  // Brain calls one of these each think(); the entity moves toward the goal in update().
  moveTo(x, z, speed) { this.goal = { x, z, speed }; }
  stop() { this.goal = null; }

  walkableAt(x, z, fromX, fromZ) {
    const w = this.game.world;
    if (!w.inBounds(x, z, 6)) return false;
    if (this.def.flyHeight) return true;
    const h = w.getHeight(x, z);
    const maxSlope = this.def.leaps ? 1.9 : 1.1;
    const dx = x - fromX, dz = z - fromZ, len = Math.hypot(dx, dz);
    if (len > 1e-4 && this.grounded) { const h0 = w.getHeight(fromX, fromZ); if ((h - h0) / len > maxSlope * 1.3) return false; }
    const depth = Math.max(0, -h);
    if (depth > (this.kind === 'crab' ? 0.7 : 0.3)) return false;
    return true;
  }

  // Obstacle-aware steering: bend the wanted direction around trees/rocks/water using whisker probes.
  steer(dirx, dirz, look) {
    const g = this.game;
    const probe = (ang) => {
      const c = Math.cos(ang), s = Math.sin(ang), dx = dirx * c - dirz * s, dz = dirx * s + dirz * c;
      const px = this.x + dx * look, pz = this.z + dz * look;
      if (!this.walkableAt(px, pz, this.x, this.z)) return null;
      if (g.colliders.overlaps(px, pz, this.radius * 0.9, (c2) => c2.ref !== this)) return null;
      return [dx, dz];
    };
    let r = probe(0); if (r) return r;
    const side = this.avoid ?? (this.rng() < 0.5 ? 1 : -1);
    for (const a of [0.5, 1.0, 1.5, 2.1]) {
      r = probe(a * side) || probe(-a * side);
      if (r) { this.avoid = side; this.avoidT = 0.6; return r; }
    }
    return [dirx, dirz];
  }

  // ---- attacks ----------------------------------------------------------------------------------
  canAttack() { return this.def.attack && this.cooldown <= 0 && !this.atk && this.stun <= 0 && !this.dead; }
  startAttack(tx, tz, struct = null) {
    const a = this.def.attack; if (!a || this.atk) return false;
    this.atk = { phase: 'windup', t: 0, hit: false, tx, tz, kind: a.kind, dirx: 0, dirz: 0, struct };
    this.attackKind = a.kind; this.goal = null;
    this.setMode('windup');
    this.game.audio?.play(this.sound === 'screech' ? 'screech' : 'growl', { pos: this, pitch: this.kind === 'wolf' ? 1.25 : this.kind === 'boar' ? 0.8 : 1, vol: 0.9 });
    return true;
  }
  cancelAttack() { this.atk = null; this.telegraph = 0; this.attackT = 0; this.attackKind = null; if (this.warn) this.warn.visible = false; }

  updateAttack(dt) {
    const a = this.atk, d = this.def.attack, p = this.game.player;
    a.t += dt;
    if (a.phase === 'windup') {
      this.telegraph = clamp(a.t / d.windup, 0, 1);
      // keep tracking the target with limited turn speed, then lock the direction for the strike
      if (d.kind === 'dive') this.altitude = this.def.flyHeight + 1.1 * this.telegraph;
      if (d.kind === 'slam') this.updateWarnRing(d.aoe, this.telegraph);
      if (this.telegraph < 0.7) { const tx = a.struct ? a.struct.x : p.pos.x, tz = a.struct ? a.struct.z : p.pos.z; const ty = this.angleTo(tx, tz); this.yaw = dampAngle(this.yaw, ty, 5, dt); a.tx = tx; a.tz = tz; }
      this.vx *= Math.exp(-10 * dt); this.vz *= Math.exp(-10 * dt);
      if (a.t >= d.windup) {
        a.phase = 'active'; a.t = 0; this.telegraph = 0; this.setMode('attack');
        a.dirx = Math.sin(this.yaw); a.dirz = Math.cos(this.yaw);
        if (d.kind === 'pounce') {
          const dist = clamp(this.distTo(a.tx, a.tz), 2, d.leapRange), dir = this.angleTo(a.tx, a.tz);
          this.yaw = dir; a.dirx = Math.sin(dir); a.dirz = Math.cos(dir);
          this.vy = d.leapVy; this.grounded = false;
          const airTime = (2 * d.leapVy) / 20; a.leapSpeed = clamp(dist / airTime, 4, d.leapSpeed);
        }
        this.game.audio?.play(d.kind === 'slam' ? 'roar' : 'whoosh', { pos: this, vol: 0.9 });
        if (d.kind === 'slam' && d.fireballs && Math.random() < 0.0) this.shootFireball();
      }
    } else if (a.phase === 'active') {
      this.attackT = clamp(a.t / d.active, 0, 1) * 0.6;
      let sp = 0;
      if (d.kind === 'charge') sp = this.def.chargeSpeed * (1 - a.t / d.dashTime * 0.25) * (a.t < d.dashTime ? 1 : 0);
      else if (d.kind === 'bite') sp = a.t < d.dashTime ? d.dashSpeed : 0;
      else if (d.kind === 'pounce') sp = a.leapSpeed;
      else if (d.kind === 'slam') sp = 0;
      else if (d.kind === 'dive') { sp = d.diveSpeed; this.altitude = damp(this.altitude, 0.9, 9, dt); }
      this.vx = a.dirx * sp; this.vz = a.dirz * sp;
      this.checkAttackHit(a, d);
      const over = d.kind === 'pounce' ? (this.grounded && a.t > 0.15) || a.t > d.active + 0.6 : a.t >= d.active;
      if (over) { a.phase = 'recover'; a.t = 0; this.setMode('recover'); }
    } else if (a.phase === 'recover') {
      this.attackT = 0.6 + clamp(a.t / d.recover, 0, 1) * 0.4;
      const k = Math.exp(-9 * dt); this.vx *= k; this.vz *= k;
      if (this.def.flyHeight) this.altitude = damp(this.altitude, this.def.flyHeight, 3, dt);
      if (a.t >= d.recover) { this.cooldown = d.cooldown * (0.8 + this.rng() * 0.5); this.cancelAttack(); this.setMode('idle'); }
    }
  }

  checkAttackHit(a, d) {
    if (a.hit) return;
    const g = this.game;
    if (a.struct && d.kind !== 'slam') {             // attacking a base structure
      const s = a.struct; if (!g.buildings.list.includes(s)) { a.hit = true; return; }
      const half = Math.max(s.info?.size?.w || 1, s.info?.size?.d || 1) / 2;
      if (Math.hypot(s.x - this.x, s.z - this.z) - half > d.range + this.radius + 0.3) return;
      a.hit = true; g.buildings.damage(s, d.damage * this.dmgMul * 1.6, this); return;
    }
    const p = this.game.player;
    if (d.kind === 'slam') {
      if (!a.slammed) {
        a.slammed = true;
        g.fx.ring(this.x, this.y, this.z, d.aoe, 0.5, this.def.fire ? 0xff7a20 : 0xc02030);
        g.fx.dust(this.x, this.y + 0.3, this.z, 4); g.cameraRig?.shake(Math.max(0, 0.6 - this.playerDist * 0.03));
        g.audio?.play('tree_fall', { pos: this, vol: 0.9 });
        for (const s of [...g.buildings.list]) { if (s.def.walkable) continue; if (Math.hypot(s.x - this.x, s.z - this.z) < d.aoe + 1.6) g.buildings.damage(s, d.damage * this.dmgMul * 3, this); }
      }
      if (p.dead) return;
      const dist2 = Math.hypot(p.pos.x - this.x, p.pos.z - this.z);
      if (dist2 <= d.aoe + p.radius && p.pos.y - this.y < 0.7) {
        a.hit = true;
        const res = p.takeHit({ damage: d.damage * this.dmgMul * g.diff.dmgIn, dir: Math.atan2(p.pos.x - this.x, p.pos.z - this.z) + Math.PI, knock: d.knock, source: this, kind: 'slam' });
        g.onEnemyHit?.(this, res);
      }
      return;
    }
    if (p.dead) return;
    const dx = p.pos.x - this.x, dz = p.pos.z - this.z, dist = Math.hypot(dx, dz);
    let reach = d.range + p.radius + this.radius;
    if (dist > reach) return;
    if (d.kind !== 'pounce' && Math.abs(angleDiff(this.yaw, Math.atan2(dx, dz))) > 1.1) return;
    if (Math.abs(p.pos.y - this.y) > 2.1 + (this.altitude ? this.altitude : 0)) return;
    a.hit = true;
    const info = { damage: d.damage * this.dmgMul * this.game.diff.dmgIn, dir: Math.atan2(dx, dz), knock: d.knock, source: this, kind: d.kind };
    const res = p.takeHit(info);
    if (res === 'hit' || res === 'blocked') this.game.audio?.play('hit', { pos: p.pos, vol: 0.7 });
    this.game.onEnemyHit?.(this, res);
    if (d.kind === 'pounce' && res !== 'parried') { this.vx *= 0.3; this.vz *= 0.3; }
  }

  updateWarnRing(r, k) {
    if (!this.warn) {
      const THREE_ = this.game.fx.THREE;
      this.warn = new THREE_.Mesh(new THREE_.RingGeometry(0.85, 1.0, 40).rotateX(-Math.PI / 2), new THREE_.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.0, depthWrite: false, side: THREE_.DoubleSide, blending: THREE_.AdditiveBlending }));
      this.game.scene.add(this.warn);
    }
    this.warn.visible = k > 0.001; this.warn.position.set(this.x, this.game.world.getHeight(this.x, this.z) + 0.12, this.z);
    this.warn.scale.setScalar(Math.max(0.1, r * (0.35 + 0.65 * k))); this.warn.material.opacity = 0.25 + 0.6 * k;
  }
  shootFireball(tx, tz) {
    const g = this.game, p = g.player;
    const sx = this.x + Math.sin(this.yaw) * this.radius, sz = this.z + Math.cos(this.yaw) * this.radius, sy = this.y + this.height * 0.7;
    const dx = tx - sx, dz = tz - sz, dy = (g.world.getHeight(tx, tz) + 1.0) - sy, l = Math.hypot(dx, dy, dz);
    g.projectiles.fireHostile(sx, sy, sz, dx / l, dy / l, dz / l, 15, 26 * this.dmgMul * g.diff.dmgIn, this);
    g.audio?.play('roar', { pos: this, vol: 0.7, pitch: 1.3 });
  }
  onParried(player) {
    if (this.dead) return;
    this.cancelAttack(); this.stun = 1.5; this.setMode('stunned'); this.vx = -Math.sin(this.yaw) * 3; this.vz = -Math.cos(this.yaw) * 3;
    this.game.onParrySuccess?.(this);
  }

  // ---- damage -----------------------------------------------------------------------------------
  takeHit(info) {
    if (this.dead) return false;
    let dmg = info.damage;
    if (this.asleep) { dmg *= 3; this.game.hud?.floatText('Cios z zaskoczenia!'); }
    else if (this.isVulnerable) dmg *= 1.35;
    this.hp -= dmg; this.flash = 1; this.hurtT = 1;
    const k = (info.knock || 0) / Math.max(0.6, this.radius * 1.4 + 0.4);
    this.vx += Math.sin(info.dir) * k; this.vz += Math.cos(info.dir) * k;
    this.game.audio?.play(this.sound === 'screech' ? 'screech' : 'squeal', { pos: this, pitch: this.kind === 'boar' ? 0.7 : 1, vol: 0.8 });
    if (info.heavy && this.def.brain !== 'boss') { if (this.atk && this.atk.phase === 'windup') { this.cancelAttack(); } this.stun = Math.max(this.stun, 0.45); }
    if (this.asleep) this.setMode('idle');
    this.provoke(info.source);
    if (this.hp <= 0) { this.die(info); return true; }
    return false;
  }
  provoke(source) { this.anger = 1; this.angerT = 25; this.brain.onHurt?.(this, source); if (this.pack) this.pack.alert?.(this); }

  die(info) {
    this.dead = true; this.deadT = 0; this.hp = 0; this.cancelAttack(); this.goal = null; this.setMode('dead'); this.hostileTarget = false; this.untargetable = true;
    const g = this.game;
    g.audio?.play('hit', { pos: this, pitch: 0.7 });
    if (this.def.drops) g.drops.spawnRolls(this.def.drops, this.x, this.z, Math.random, 1.4);
    if (info && info.source === g.player) { g.player.gainXp(this.def.xp || 0); g.player.stats_.kills = (g.player.stats_.kills || 0) + 1; g.onAnimalKilled?.(this); }
    this.slot && this.slot.onDeath?.(this);
    if (this.pack) this.pack.onMemberDeath?.(this);
  }

  // ---- update -----------------------------------------------------------------------------------
  update(dt) {
    const g = this.game, p = g.player, w = g.world;
    this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw;
    this.playerDist = Math.hypot(p.pos.x - this.x, p.pos.z - this.z);
    this.modeT += dt;
    if (this.dead) {
      this.deadT += dt; this.vx *= Math.exp(-6 * dt); this.vz *= Math.exp(-6 * dt);
      this.integrate(dt);
      if (this.deadT > 45) this.fade = Math.max(0, 1 - (this.deadT - 45) / 4);
      if (this.deadT > 49) this.remove = true;
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - dt); this.stun = Math.max(0, this.stun - dt);
    if (this.trapped > 0) { this.trapped -= dt; this.stun = Math.max(this.stun, 0.1); }
    if (this.burn > 0) { this.burn -= dt; this.hp -= 6 * dt; this.game.fx?.ember(this.x, this.y + 0.6, this.z); if (this.hp <= 0) { this.die({ source: this.game.player }); return; } }
    this.hurtT = Math.max(0, this.hurtT - dt * 2.4); this.flash = Math.max(0, this.flash - dt * 5);
    if (this.angerT > 0) { this.angerT -= dt; if (this.angerT <= 0) this.anger = 0; }
    this.avoidT = Math.max(0, this.avoidT - dt); if (this.avoidT <= 0) this.avoid = null;
    if (this.stun > 0) {
      this.setMode('stunned');
      const k = Math.exp(-6 * dt); this.vx *= k; this.vz *= k;
    } else {
      if (this.mode === 'stunned') this.setMode('idle');
      if (this.atk) this.updateAttack(dt);
      else { this.brain.think(this, dt); this.followGoal(dt); }
    }
    this.integrate(dt);
    // despawn / fading
    if (this.despawning) { this.fade = Math.max(0, this.fade - dt / 2.2); if (this.fade <= 0) this.remove = true; }
    else if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / 1.2);
  }

  // Accelerate toward the goal with a turn-rate limit; slow down in tight turns.
  followGoal(dt) {
    const d = this.def;
    if (!this.goal) { const k = Math.exp(-8 * dt); this.vx *= k; this.vz *= k; this.turnRate = damp(this.turnRate, 0, 8, dt); return; }
    const gx = this.goal.x - this.x, gz = this.goal.z - this.z, gl = Math.hypot(gx, gz);
    if (gl < 0.15) { this.goal = null; return; }
    let dirx = gx / gl, dirz = gz / gl;
    if (this.def.flyHeight == null) [dirx, dirz] = this.steer(dirx, dirz, this.radius + 1.3 + this.goal.speed * 0.18);
    const want = Math.atan2(dirx, dirz);
    let speed = this.goal.speed;
    if (this.sideways) {
      // crab: face the target, scuttle along local X
      const fy = this.faceTarget ? Math.atan2(this.faceTarget.x - this.x, this.faceTarget.z - this.z) : want + Math.PI / 2;
      this.yaw = dampAngle(this.yaw, fy, d.turn, dt);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const side = dirx * rx + dirz * rz, fwd = dirx * Math.sin(this.yaw) + dirz * Math.cos(this.yaw);
      const tvx = (rx * side + Math.sin(this.yaw) * fwd * 0.5) * speed, tvz = (rz * side + Math.cos(this.yaw) * fwd * 0.5) * speed;
      this.vx += clamp(tvx - this.vx, -30 * dt, 30 * dt); this.vz += clamp(tvz - this.vz, -30 * dt, 30 * dt);
      return;
    }
    const faceDir = this.faceTarget ? Math.atan2(this.faceTarget.x - this.x, this.faceTarget.z - this.z) : want;
    const before = this.yaw;
    if (this.faceTarget) { this.lookYaw = clamp(angleDiff(want, faceDir), -1.1, 1.1); this.yaw = dampAngle(this.yaw, want, d.turn, dt); }
    else { this.yaw = dampAngle(this.yaw, want, d.turn, dt); this.lookYaw = 0; }
    this.turnRate = damp(this.turnRate, angleDiff(before, this.yaw) / Math.max(dt, 1e-3), 10, dt);
    const misalign = Math.abs(angleDiff(this.yaw, want));
    speed *= clamp(1 - misalign / 1.6, 0.25, 1);
    const tvx = Math.sin(this.yaw) * speed, tvz = Math.cos(this.yaw) * speed;
    const acc = (this.grounded ? 26 : 5) * dt;
    this.vx += clamp(tvx - this.vx, -acc, acc); this.vz += clamp(tvz - this.vz, -acc, acc);
  }

  integrate(dt) {
    const g = this.game, w = g.world;
    const sp0 = Math.hypot(this.vx, this.vz);
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    if (!this.walkableAt(nx, nz, this.x, this.z) && !this.dead) {
      if (this.walkableAt(nx, this.z, this.x, this.z)) nz = this.z;
      else if (this.walkableAt(this.x, nz, this.x, this.z)) nx = this.x;
      else { nx = this.x; nz = this.z; this.vx *= 0.3; this.vz *= 0.3; }
    }
    const beforeX = nx, beforeZ = nz;
    this._p = this._p || { x: 0, z: 0 };
    this._p.x = nx; this._p.z = nz;
    if (!this.def.flyHeight) {
      g.colliders.resolveCircle(this._p, this.radius, -1e9, (c) => c.ref !== this);
      // charging into something solid: crash & stun
      const pushed = Math.hypot(this._p.x - beforeX, this._p.z - beforeZ);
      if (this.atk && this.atk.phase === 'active' && this.attackKind === 'charge' && pushed > 0.04 && sp0 > 6) this.crash();
    }
    this.x = this._p.x; this.z = this._p.z;
    // vertical
    const ground = Math.max(w.getHeight(this.x, this.z), this.def.flyHeight ? -0.3 : (this.kind === 'crab' ? -0.6 : -0.25));
    if (this.def.flyHeight) { this.y = damp(this.y, ground + this.altitude, 4, dt); this.grounded = false; }
    else if (this.grounded) {
      if (ground - this.y > -0.5) this.y = ground; else this.grounded = false;
    }
    if (!this.grounded && !this.def.flyHeight) {
      this.vy -= 20 * dt; this.y += this.vy * dt;
      if (this.y <= ground) { this.y = ground; this.grounded = true; if (this.vy < -4) g.fx?.dust(this.x, this.y, this.z, 0.8); this.vy = 0; }
    }
  }

  crash() {
    this.cancelAttack(); this.stun = 1.6; this.vx = this.vz = 0;
    this.game.fx?.dust(this.x + Math.sin(this.yaw) * 0.8, this.y + 0.4, this.z + Math.cos(this.yaw) * 0.8, 1.6);
    this.game.audio?.play('hit', { pos: this, pitch: 0.6 });
    this.game.cameraRig?.shake(Math.max(0, 0.3 - this.playerDist * 0.02));
  }

  // ---- rendering --------------------------------------------------------------------------------
  updateVisual(dt, alpha) {
    const c = this.creature, r = c.root;
    r.position.set(lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), lerp(this.pz, this.z, alpha));
    r.rotation.y = this.pyaw + angleDiff(this.pyaw, this.yaw) * alpha;
    const speed = Math.hypot(this.vx, this.vz);
    const d = this.def;
    let mode = this.mode;
    if (this.stun > 0) mode = 'stunned';
    c.animate(dt, {
      speed, maxSpeed: d.run, mode, telegraph: this.telegraph, attackKind: this.attackKind, attackT: this.attackT, hurt: this.hurtT, dead: this.dead ? this.deadT : -1,
      turn: this.turnRate, vy: this.vy, grounded: this.grounded, height: this.def.flyHeight ? Math.max(0, this.y - Math.max(0, this.game.world.getHeight(this.x, this.z))) : 0, aggro: Math.max(this.aggro, this.anger), lookYaw: this.lookYaw,
    });
    c.setFlash(this.flash);
    const night = 1 - this.game.atmos.dayness;
    c.setGlow(clamp(this.telegraph * 1.6 + (this.def.night_only ? 0.8 : night * 0.5) + (this.mode === 'chase' ? 0.3 : 0), 0, 1.5));
    c.setOpacity(this.fade);
    r.visible = this.playerDist < 130;
  }
  dispose() { this.game.scene.remove(this.creature.root); this.creature.dispose(); if (this.warn) { this.game.scene.remove(this.warn); this.warn.geometry.dispose(); } }
}
