// The player: movement on terrain, jumping, sprinting, dodge roll, melee combo, blocking/parrying,
// gathering, interaction. Simulated at a fixed step; rendered with interpolation.
import * as THREE from 'three';
import { CONFIG } from '../../data/config.js';
import { ITEMS } from '../../data/items.js';
import { RESOURCES, LOOT } from '../../data/resources.js';
import { weaponFor } from '../../data/weapons.js';
import { Inventory } from '../inventory/inventory.js';
import { HumanRig } from '../gfx/rig.js';
import { HumanAnimator } from './anim.js';
import { heldModel } from '../gfx/itemmodels.js';
import { inMeleeArc, SwingTracker, stagePhase, stageDuration, stageTiming } from '../combat/melee.js';
import { clamp, lerp, damp, dampAngle, angleDiff, smoothstep } from '../engine/util.js';

const C = CONFIG.player;
const HOLD_CLASS = { axe: 'axe', pickaxe: 'pickaxe', spear: 'spear', sword: 'sword', torch: 'torch', bow: 'bow' };

export class Player {
  constructor(game) {
    this.game = game;
    const sp = game.world.spawn;
    this.pos = { x: sp.x, y: sp.y, z: sp.z };
    this.prev = { x: sp.x, y: sp.y, z: sp.z };
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = Math.PI;                       // facing (forward = (sin yaw, cos yaw)); starts facing north (-Z)
    this.prevYaw = this.yaw;
    this.grounded = true;
    this.radius = C.radius;
    this.inventory = new Inventory();
    this.stats = { health: C.maxHealth, maxHealth: C.maxHealth, stamina: C.maxStamina, maxStamina: C.maxStamina, hunger: 100, thirst: 100, temp: 50, fear: 0, xp: 0, level: 1 };
    this.staminaDelay = 0; this.exhausted = false;
    this.dead = false; this.deadT = -1;
    this.state = 'free';
    this.atk = null; this.comboIdx = 0; this.comboTimer = 0; this.atkBuffer = 0;
    this.dodge = null; this.dodgeCd = 0; this.invuln = 0;
    this.block = 0; this.blocking = false; this.blockT = 0; this.parryFlash = null;
    this.interact = null;
    this.hurt = null; this.stun = 0;
    this.wading = false; this.sneaking = false; this.sprinting = false; this.speed = 0;
    this.landHard = false;
    this.aimYaw = this.yaw;
    this.stats_ = { kills: 0, crafted: 0, chopped: 0 };
    this.skills = { hunter: 0, stealth: 0, crafter: 0, hungerRes: 0, vitality: 0 };
    this.equipment = { chest: null };
    this.aiming = false; this.bowDraw = 0; this.bowRecover = 0;
    this.msgCooldown = 0;
    // visuals
    this.rig = new HumanRig();
    this.anim = new HumanAnimator(this.rig);
    this.rig.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    game.scene.add(this.rig.root);
    this.heldId = undefined;
    this.syncHeld();
    this.inventory.onChange = () => { this.syncHeld(); game.ui?.onInventoryChanged?.(); };
  }

  get weaponItem() { return this.inventory.selectedItem(); }
  get weaponId() { const s = this.weaponItem; return s && (s.id in ITEMS) ? s.id : null; }
  get weapon() { return weaponFor(this.weaponId); }

  syncHeld() {
    const id = this.weaponId;
    const geo = id ? heldModel(id) : null;
    const key = geo ? id : null;
    if (this.heldId === key) return;
    this.heldId = key;
    this.rig.heldId = undefined;
    this.rig.setHeld(key, geo, key === 'torch' ? this.makeFlame() : null, key === 'bow' || key === 'crossbow' ? 'L' : 'R');
    const cls = id ? weaponFor(id).cls : null;
    this.holdClass = cls && HOLD_CLASS[cls] ? HOLD_CLASS[cls] : null;
  }

  // Flame mesh for the torch (additive cone, flickers in updateVisual)
  makeFlame() {
    const g = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 7), new THREE.MeshBasicMaterial({ color: 0xff8a20, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.17, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending }));
    outer.position.y = 0.8; inner.position.y = 0.77;
    g.add(outer, inner); g.userData.flame = [outer, inner];
    this.flame = g;
    return g;
  }

  // --- helpers ------------------------------------------------------------------------------------
  say(msg, kind = 'info') { if (this.msgCooldown > 0 && kind === 'hint') return; if (kind === 'hint') this.msgCooldown = 2.5; this.game.notify?.(msg, kind); }
  spendStamina(n) { this.stats.stamina = Math.max(0, this.stats.stamina - n); this.staminaDelay = 0.7; if (this.stats.stamina <= 0) this.exhausted = true; }
  get armorDef() { const a = this.equipment.chest && ITEMS[this.equipment.chest.id]?.armor; return a ? a.def : 0; }
  get armorWarm() { const a = this.equipment.chest && ITEMS[this.equipment.chest.id]?.armor; return a ? a.warm : 0; }
  armorMul() { return 1 - this.armorDef; }
  equip(idx) {
    const inv = this.inventory, it = inv.slots[idx]; if (!it || !ITEMS[it.id]?.armor) return false;
    const old = this.equipment.chest;
    this.equipment.chest = { id: it.id, dur: it.dur }; inv.slots[idx] = old ? { id: old.id, n: 1, dur: old.dur } : null; inv.changed();
    this.rig.setArmor?.(it.id); this.game.audio?.play('craft', { vol: 0.5 }); return true;
  }
  unequip() {
    const old = this.equipment.chest; if (!old) return;
    if (this.inventory.add(old.id, 1, { dur: old.dur }) > 0) { this.say('Ekwipunek jest pełny.', 'warn'); return; }
    this.equipment.chest = null; this.rig.setArmor?.(null);
  }
  applySkills() { const v = this.skills.vitality || 0; this.stats.maxHealth = CONFIG.player.maxHealth + 10 * v; }
  get busy() { return !!(this.atk || this.dodge || this.interact || this.dead || this.stun > 0); }

  walkable(fx, fz, tx, tz) {
    const w = this.game.world;
    if (!w.inBounds(tx, tz, 3)) return false;
    const dx = tx - fx, dz = tz - fz, len = Math.hypot(dx, dz);
    if (len < 1e-6) return true;
    const h1 = w.getHeight(tx, tz);
    const nx = dx / len, nz = dz / len;
    if (this.grounded) {
      const ahead = w.getHeight(tx + nx * 0.5, tz + nz * 0.5);
      if ((ahead - h1) / 0.5 > C.maxSlope && ahead - this.pos.y > 0.35) return false;      // too steep to climb
    } else if (h1 - this.pos.y > 0.4) return false;                                          // airborne into a wall of earth
    const d0 = w.waterDepth(fx, fz), d1 = w.waterDepth(tx, tz);
    if (d1 > C.maxWadeDepth && d1 > d0) return false;
    return true;
  }

  // Move with terrain/collider constraints; slides along blocked axes.
  moveBy(dx, dz) {
    const p = this.pos;
    let nx = p.x + dx, nz = p.z + dz;
    if (!this.walkable(p.x, p.z, nx, nz)) {
      if (dx !== 0 && this.walkable(p.x, p.z, p.x + dx, p.z)) { nz = p.z; }
      else if (dz !== 0 && this.walkable(p.x, p.z, p.x, p.z + dz)) { nx = p.x; }
      else { nx = p.x; nz = p.z; }
    }
    p.x = nx; p.z = nz;
    this.game.colliders.resolveCircle(p, this.radius);
    // resolving may have pushed us into water/steep terrain: keep the previous legal position in that case
    if (!this.walkable(p.x, p.z, p.x, p.z)) { p.x = nx - 0; p.z = nz - 0; }
  }

  // --- combat --------------------------------------------------------------------------------------
  facingVec() { return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }

  findAssistTarget(reach) {
    const g = this.game;
    let best = null, bs = 1e9;
    const camYaw = g.cameraRig ? g.cameraRig.yaw : this.yaw;
    const list = g.entities ? g.entities.list : [];
    for (const e of list) {
      if (e.dead || !e.hostileTarget) continue;
      const dx = e.x - this.pos.x, dz = e.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > reach * 2.2) continue;
      const a = Math.abs(angleDiff(camYaw, Math.atan2(dx, dz)));
      if (a > 0.9) continue;
      const score = d + a * 3;
      if (score < bs) { bs = score; best = e; }
    }
    return best;
  }

  startAttack(idx) {
    const wpn = this.weapon;
    const st = wpn.combo[idx % wpn.combo.length];
    if (this.stats.stamina < 4) { this.say('Brak tchu…', 'hint'); return false; }
    this.spendStamina(st.stamina);
    const wish = this.wishDir;
    const g = this.game;
    let face = g.cameraRig ? g.cameraRig.yaw : this.yaw;
    const tgt = this.findAssistTarget(wpn.reach);
    if (tgt) face = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
    else if (wish && (wish.x || wish.z) && this.speed > 0.5) face = Math.atan2(wish.x, wish.z);
    this.yaw = face;
    this.atk = { i: idx % wpn.combo.length, t: 0, st, wpn, tracker: new SwingTracker(), dur: stageDuration(st), timing: stageTiming(st), queued: false, hitAny: false, wornSlot: this.inventory.selected, sound: false };
    this.comboIdx = (idx + 1) % wpn.combo.length;
    this.comboTimer = 0.9;
    this.state = 'attack';
    g.audio?.play('swing', { pos: this.pos, pitch: 0.9 + this.atk.i * 0.08 });
    return true;
  }

  updateAttack(dt) {
    const a = this.atk;
    a.t += dt;
    const st = a.st, phase = stagePhase(st, a.t);
    const f = this.facingVec();
    // lunge into the swing
    if (a.t < st.windup + st.active) { const s = st.lunge * (a.t < st.windup ? 0.6 : 1); this.vx = f.x * s; this.vz = f.z * s; }
    if (this.game.input.mousePressed(0)) this.atkBuffer = 0.35;
    if (phase === 'active') this.swingHits(a);
    if (phase === 'recover' || phase === 'done') {
      const chainAt = st.windup + st.active + st.recover * st.chain;
      if (this.atkBuffer > 0 && a.t >= chainAt) { this.atkBuffer = 0; this.atk = null; this.state = 'free'; this.startAttack(this.comboIdx); return; }
    }
    if (phase === 'done') { this.atk = null; this.state = 'free'; }
  }

  swingHits(a) {
    const g = this.game, wpn = a.wpn, st = a.st;
    const f = this.facingVec();
    const px = this.pos.x, pz = this.pos.z;
    // entities (animals, monsters)
    if (g.entities) {
      for (const e of g.entities.list) {
        if (e.dead || e.untargetable) continue;
        if (!inMeleeArc(px, pz, this.yaw, e.x, e.z, e.radius, wpn.reach, wpn.arc) || Math.abs(e.y - this.pos.y) > 2.2) continue;
        if (!a.tracker.first(e)) continue;
        this.dealDamageToEntity(e, a);
      }
    }
    // resource nodes
    const hitR = wpn.reach + 1.2;
    g.field.near(px + f.x * wpn.reach * 0.5, pz + f.z * wpn.reach * 0.5, hitR, (n) => {
      if (n.state !== 'alive' || !n.res || n.res.kind !== 'tool') return;
      if (!inMeleeArc(px, pz, this.yaw, n.x, n.z, n.res.radius * n.scale, wpn.reach + 0.3, 150)) return;
      if (!a.tracker.first(n)) return;
      this.hitNode(n, a);
    });
  }

  toolPower(a) {
    const item = this.weaponItem, def = item && ITEMS[item.id];
    if (def && def.tool) return { type: def.tool.type, power: def.tool.power, tier: def.tool.tier };
    return { type: 'fist', power: 3, tier: 0 };
  }

  hitNode(n, a) {
    const g = this.game, res = n.res, tool = this.toolPower(a);
    const dirX = n.x - this.pos.x, dirZ = n.z - this.pos.z, dl = Math.hypot(dirX, dirZ) || 1;
    let dmg = tool.power * a.st.dmg;
    if (tool.type !== res.tool) { dmg = res.tool === 'axe' ? 1.5 : 0.7; this.say(res.tool === 'axe' ? 'Do ścinania potrzebna jest siekiera.' : 'Do kruszenia potrzebny jest kilof.', 'hint'); }
    else if (res.tier && tool.tier < res.tier) { dmg = 0.8; this.say('To jest zbyt twarde — potrzebny lepszy kilof.', 'hint'); }
    const r = g.field.damage(n, dmg, dirX / dl, dirZ / dl);
    a.hitAny = true;
    g.fx?.nodeHit(n, res, dirX / dl, dirZ / dl, r.destroyed);
    g.audio?.play(res.tool === 'axe' ? 'chop' : 'mine', { pos: { x: n.x, y: n.y + 1, z: n.z }, pitch: 0.9 + Math.random() * 0.2 });
    g.cameraRig?.shake(r.destroyed ? 0.22 : 0.08);
    if (tool.type === res.tool) {
      const broke = this.inventory.wear(a.wornSlot, 1);
      if (broke) this.say('Twoje narzędzie się rozpadło!', 'warn');
    }
    if (r.destroyed) {
      g.drops.spawnRolls(res.drops, n.x + (res.fall ? dirX / dl * 2.4 : 0), n.z + (res.fall ? dirZ / dl * 2.4 : 0), Math.random, 1.8);
      this.gainXp(res.xp || 0);
      this.stats_.chopped++;
      g.hitStop?.(0.05);
    }
  }

  dealDamageToEntity(e, a) {
    const g = this.game;
    const tool = this.toolPower(a);
    const wpn = a.wpn;
    const base = (this.weaponItem && ITEMS[this.weaponItem.id]?.tool) ? Math.max(wpn.base, tool.power * 0.9) : wpn.base;
    const dmg = base * a.st.dmg * (1 + (this.skills?.hunter || 0) * 0.08);
    const dir = Math.atan2(e.x - this.pos.x, e.z - this.pos.z);
    a.hitAny = true;
    const heavy = a.st.dmg > 1.3;
    const killed = e.takeHit?.({ damage: dmg, dir, knock: a.st.knock, source: this, heavy });
    g.fx?.hitEntity(e, dir, heavy);
    g.audio?.play('hit', { pos: { x: e.x, y: e.y + 1, z: e.z }, pitch: heavy ? 0.8 : 1 });
    g.hitStop?.(heavy ? 0.085 : 0.05);
    g.cameraRig?.shake(heavy ? 0.3 : 0.14);
    const item = this.weaponItem; if (item && item.dur !== undefined) this.inventory.wear(a.wornSlot, 1);
  }

  gainXp(n) { if (n > 0) this.game.onXp?.(n); }

  // Called by enemies. info: {damage, dir (radians, direction of the attack travel), source, attackId}
  // Returns 'hit' | 'dodged' | 'blocked' | 'parried' | 'dead'.
  takeHit(info) {
    if (this.dead) return 'dead';
    if (this.game.debug?.god) return 'dodged';
    const C2 = CONFIG.player;
    if (this.invuln > 0) { this.game.audio?.play('whoosh', { pos: this.pos }); this.game.onPerfectDodge?.(info); return 'dodged'; }
    const from = info.dir;                                     // where the attacker is looking (toward us)
    const frontal = Math.abs(angleDiff(this.yaw, from + Math.PI)) < 1.35;
    if (this.blocking && frontal && !this.busyForBlock) {
      if (this.blockT <= C2.parryWindow) {
        this.parryFlash = { t: 0 };
        this.game.audio?.play('parry', { pos: this.pos });
        this.game.fx?.parry(this.pos, from);
        this.game.hitStop?.(0.1); this.game.cameraRig?.shake(0.3);
        info.source?.onParried?.(this);
        return 'parried';
      }
      const cost = info.damage * C2.blockStaminaPerDamage;
      if (this.stats.stamina >= cost) {
        this.spendStamina(cost);
        this.stats.health -= info.damage * 0.25;
        this.game.audio?.play('block', { pos: this.pos });
        this.game.fx?.block(this.pos, from);
        this.vx += Math.sin(from) * 3; this.vz += Math.cos(from) * 3;
        this.game.cameraRig?.shake(0.16);
        if (this.stats.health <= 0) this.die(info);
        return 'blocked';
      }
      // guard broken
      this.stats.stamina = 0; this.exhausted = true; this.stun = 0.5;
    }
    let dmg = info.damage;
    dmg *= this.armorMul ? this.armorMul(info) : 1;
    this.stats.health -= dmg;
    this.hurt = { t: 0, back: !frontal, side: Math.sign(angleDiff(this.yaw, from)) || 1 };
    this.stun = Math.max(this.stun, 0.22);
    this.vx += Math.sin(from) * (info.knock ?? 4); this.vz += Math.cos(from) * (info.knock ?? 4);
    if (this.atk) { this.atk = null; this.state = 'free'; }
    this.interact = null;
    this.game.audio?.play('hurt', { pos: this.pos });
    this.game.fx?.playerHit(this.pos, from);
    this.game.cameraRig?.shake(0.35);
    this.game.hitStop?.(0.07);
    this.game.onPlayerHurt?.(dmg);
    if (this.stats.health <= 0) this.die(info);
    return 'hit';
  }

  die(info) {
    if (this.dead) return;
    this.stats.health = 0; this.dead = true; this.deadT = 0; this.atk = null; this.dodge = null; this.interact = null; this.blocking = false;
    this.deadBack = info ? Math.abs(angleDiff(this.yaw, info.dir + Math.PI)) < 1.6 : true;
    this.game.onPlayerDied?.(info);
  }

  respawn(pos) {
    this.dead = false; this.deadT = -1; this.stats.health = this.stats.maxHealth * 0.6; this.stats.stamina = this.stats.maxStamina;
    this.pos.x = pos.x; this.pos.y = pos.y; this.pos.z = pos.z; this.prev = { ...this.pos }; this.vx = this.vy = this.vz = 0; this.hurt = null;
  }

  // --- interaction ---------------------------------------------------------------------------------
  startInteract(clip, dur, onHit, hitAt = 0.5) {
    this.interact = { clip, t: 0, dur, onHit, fired: false, hitAt, timing: { wind: 0.3, hit: hitAt, follow: Math.min(0.95, hitAt + 0.2) } };
    this.state = 'interact';
  }

  // --- fixed update --------------------------------------------------------------------------------
  update(dt, input, camYaw) {
    this.prev.x = this.pos.x; this.prev.y = this.pos.y; this.prev.z = this.pos.z; this.prevYaw = this.yaw;
    const st = this.stats;
    this.msgCooldown = Math.max(0, this.msgCooldown - dt);
    if (this.dead) { this.deadT += dt; this.vx *= 0.9; this.vz *= 0.9; this.applyPhysics(dt); return; }
    this.comboTimer = Math.max(0, this.comboTimer - dt); if (this.comboTimer <= 0 && !this.atk) this.comboIdx = 0;
    this.atkBuffer = Math.max(0, this.atkBuffer - dt);
    this.invuln = Math.max(0, this.invuln - dt); this.dodgeCd = Math.max(0, this.dodgeCd - dt); this.stun = Math.max(0, this.stun - dt);
    if (this.hurt) { this.hurt.t += dt / 0.4; if (this.hurt.t >= 1) this.hurt = null; }
    if (this.parryFlash) { this.parryFlash.t += dt / 0.35; if (this.parryFlash.t >= 1) this.parryFlash = null; }

    if (this.heldId === 'torch') { const it = this.weaponItem; if (it && it.dur !== undefined) { it.dur -= dt; if (it.dur <= 0) { this.inventory.slots[this.inventory.selected] = null; this.inventory.changed(); this.say('Pochodnia dogasła.', 'warn'); } } }
    // stamina regeneration
    this.staminaDelay = Math.max(0, this.staminaDelay - dt);
    if (this.staminaDelay <= 0 && !this.sprinting) st.stamina = Math.min(st.maxStamina, st.stamina + C.staminaRegen * (this.blocking ? 0.4 : 1) * dt);
    if (this.exhausted && st.stamina > 22) this.exhausted = false;

    // movement intent relative to the camera
    const ax = input.axis();
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw), rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    let wx = fx * ax.z + rx * ax.x, wz = fz * ax.z + rz * ax.x;
    const wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    this.wishDir = { x: wx, z: wz };
    const moving = wl > 0.05;

    // ---- discrete actions ----
    const free = !this.busy;
    this.sneaking = input.isDown('sneak') && !this.atk && !this.dodge;
    this.blocking = false;
    const isBow = this.holdClass === 'bow';
    this.bowRecover = Math.max(0, this.bowRecover - dt);
    this.aiming = false;
    if (isBow && !this.dead && !this.atk && !this.dodge && !this.interact && this.stun <= 0 && input.mouseDown(2) && this.bowRecover <= 0) {
      this.aiming = true; this.bowDraw = Math.min(1, this.bowDraw + dt / 0.85);
      if (input.mousePressed(0) && this.bowDraw >= 0.25) this.shoot();
    } else this.bowDraw = Math.max(0, this.bowDraw - dt * 3);
    if (!isBow && !this.dead && !this.atk && !this.dodge && !this.interact && this.stun <= 0 && input.mouseDown(2) && !this.exhaustedBlock()) {
      this.blocking = true;
      this.blockT += dt;
    } else this.blockT = 0;
    this.block = damp(this.block, this.blocking ? 1 : 0, 22, dt);

    if (free) {
      if (input.pressed('dodge') && this.dodgeCd <= 0 && st.stamina >= 8 && (this.grounded)) this.startDodge(wx, wz, moving);
      else if (input.mousePressed(0) || this.atkBuffer > 0) { this.atkBuffer = 0; this.startAttack(this.comboIdx); }
      else if (input.pressed('jump') && this.grounded && st.stamina >= C.jumpCost) { this.vy = C.jumpSpeed; this.grounded = false; this.spendStamina(C.jumpCost); this.game.audio?.play('jump', { pos: this.pos }); }
    }
    if (this.atk) this.updateAttack(dt);
    if (this.dodge) this.updateDodge(dt);
    if (this.interact) this.updateInteract(dt);

    // ---- horizontal velocity ----
    let speedMul = 1, target = C.walkSpeed;
    this.sprinting = false;
    if (!this.busy || this.interact) {
      if (this.sneaking) target = C.sneakSpeed;
      else if (input.sprintHeld() && moving && !this.exhausted && st.stamina > 1 && !this.blocking) { target = C.sprintSpeed; this.sprinting = true; this.spendStamina(C.sprintCost * dt); this.staminaDelay = 0.5; }
      if (this.blocking) target *= 0.5;
      if (this.aiming) target *= 0.45;
      if (this.interact) target *= 0.15;
      if (this.wading) target *= C.wadeSlow;
      const tvx = wx * target, tvz = wz * target;
      const acc = (this.grounded ? 42 : 12) * dt;
      this.vx += clamp(tvx - this.vx, -acc, acc); this.vz += clamp(tvz - this.vz, -acc, acc);
    } else if (this.dodge) {
      // handled by updateDodge
    } else if (this.atk) {
      // lunge is set by updateAttack; friction afterwards
      if (this.atk.t > this.atk.st.windup + this.atk.st.active) { const k = Math.exp(-14 * dt); this.vx *= k; this.vz *= k; }
    } else { const k = Math.exp(-10 * dt); this.vx *= k; this.vz *= k; }
    this.speed = Math.hypot(this.vx, this.vz);

    // facing
    if (!this.atk && !this.dodge && !this.dead) {
      if (this.blocking || this.aiming) this.yaw = dampAngle(this.yaw, camYaw, 20, dt);
      else if (moving && this.speed > 0.4) this.yaw = dampAngle(this.yaw, Math.atan2(this.vx, this.vz), 13, dt);
    }
    this.applyPhysics(dt);
  }

  shoot() {
    const g = this.game, inv = this.inventory;
    const ammoIds = this.holdClass === 'bow' && this.weaponId === 'crossbow' ? ['bolt'] : ['fire_arrow', 'arrow'];
    const ammo = ammoIds.find((a) => inv.has(a));
    if (!ammo) { this.say('Nie masz strzał.', 'hint'); this.bowDraw = 0; return; }
    inv.remove(ammo, 1);
    const cam = g.camera, dir = this._sd || (this._sd = new THREE.Vector3());
    cam.getWorldDirection(dir);
    const ox = this.pos.x + Math.sin(this.yaw) * 0.4, oy = this.pos.y + 1.5, oz = this.pos.z + Math.cos(this.yaw) * 0.4;
    const tx = cam.position.x + dir.x * 45, ty = cam.position.y + dir.y * 45, tz = cam.position.z + dir.z * 45;
    let dx = tx - ox, dy = ty - oy, dz = tz - oz; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    const d = this.bowDraw, speed = 20 + 26 * d, dmg = (12 + 24 * d) * (1 + 0.08 * (this.skills.hunter || 0)) * (ammo === 'bolt' ? 1.5 : 1);
    g.projectiles.fire(ox, oy, oz, dx, dy, dz, speed, dmg, ammo, this);
    g.audio?.play('swing', { pos: this.pos, pitch: 1.6, vol: 0.7 });
    this.bowDraw = 0; this.bowRecover = 0.32; this.yaw = Math.atan2(dx, dz);
    g.cameraRig?.shake(0.06);
  }

  exhaustedBlock() { return this.stats.stamina <= 0 && this.exhausted; }

  applyPhysics(dt) {
    const w = this.game.world;
    const p = this.pos;
    const before = { x: p.x, z: p.z };
    this.moveBy(this.vx * dt, this.vz * dt);
    // if blocked, kill the velocity component so we do not keep pushing
    const ex = (p.x - before.x) / dt, ez = (p.z - before.z) / dt;
    if (Math.hypot(this.vx, this.vz) > 0.1) {
      const dotv = (ex * this.vx + ez * this.vz) / (Math.hypot(this.vx, this.vz) * Math.max(1e-4, Math.hypot(ex, ez)));
      if (Math.hypot(ex, ez) < Math.hypot(this.vx, this.vz) * 0.35) { this.vx *= 0.6; this.vz *= 0.6; }
    }
    // vertical (terrain, or a tower platform we stand on)
    let ground = w.getHeight(p.x, p.z);
    const plat = this.game.buildings?.platformY(p.x, p.z, p.y);
    if (plat !== null && plat !== undefined && plat > ground) ground = plat;
    if (this.grounded) {
      const diff = ground - p.y;
      if (diff > -0.45) { p.y = ground; this.vy = 0; }          // follow the terrain (also uphill)
      else { this.grounded = false; }                           // walked off a ledge
    }
    if (!this.grounded) {
      this.vy -= C.gravity * dt; p.y += this.vy * dt;
      if (p.y <= ground) { this.landHard = this.vy < -9; p.y = ground; this.grounded = true; if (this.vy < -6) { this.game.audio?.play('land', { pos: p }); if (this.vy < -13) this.fallDamage(-this.vy); } this.vy = 0; }
    }
    this.wading = w.waterDepth(p.x, p.z) > 0.25 && this.grounded;
    if (this.onTower && plat === null) this.onTower = null;
  }

  fallDamage(v) { const d = (v - 13) * 5; if (d > 0 && !this.dead) { this.stats.health -= d; this.hurt = { t: 0, back: false, side: 1 }; this.game.audio?.play('hurt', { pos: this.pos }); if (this.stats.health <= 0) this.die(null); } }

  // --- dodge roll ----------------------------------------------------------------------------------
  startDodge(wx, wz, moving) {
    const dir = moving ? Math.atan2(wx, wz) : this.yaw + Math.PI;             // no input: hop backwards
    this.spendStamina(C.dodgeCost);
    this.dodge = { t: 0, dir, back: !moving };
    this.yaw = moving ? dir : this.yaw;
    this.invuln = C.dodgeInvuln; this.dodgeCd = C.dodgeTime + 0.12;
    this.state = 'dodge'; this.atk = null;
    this.game.audio?.play('roll', { pos: this.pos });
  }
  updateDodge(dt) {
    const d = this.dodge;
    d.t += dt;
    const k = clamp(d.t / C.dodgeTime, 0, 1);
    const sp = C.dodgeSpeed * (1 - k * 0.65) * (this.wading ? 0.6 : 1);
    this.vx = Math.sin(d.dir) * sp * (d.back ? 0.8 : 1); this.vz = Math.cos(d.dir) * sp * (d.back ? 0.8 : 1);
    if (d.t >= C.dodgeTime) { this.dodge = null; this.state = 'free'; }
  }

  updateInteract(dt) {
    const it = this.interact;
    it.t += dt / it.dur;
    if (!it.fired && it.t >= it.hitAt) { it.fired = true; it.onHit?.(); }
    if (it.t >= 1) { this.interact = null; this.state = 'free'; }
  }

  // --- per-frame visuals (called with interpolation alpha) ------------------------------------------
  renderPos(alpha, out = { x: 0, y: 0, z: 0 }) {
    out.x = lerp(this.prev.x, this.pos.x, alpha); out.y = lerp(this.prev.y, this.pos.y, alpha); out.z = lerp(this.prev.z, this.pos.z, alpha);
    return out;
  }
  updateTorch(dt) {
    const g = this.game, lit = this.heldId === 'torch' && !this.dead;
    if (lit && !this.torchSrc) this.torchSrc = g.lights.add({ x: 0, y: 0, z: 0, color: 0xffa347, intensity: 5.0, radius: 18, flicker: 1, scare: 0.85, scareRadius: 8 });
    if (!lit && this.torchSrc) { g.lights.remove(this.torchSrc); this.torchSrc = null; }
    if (!lit || !this.flame) return;
    const v = this._tv || (this._tv = new THREE.Vector3());
    this.flame.getWorldPosition(v);
    const flick = 1 + Math.sin(g.time * 23) * 0.12 + Math.sin(g.time * 37) * 0.08;
    this.flame.userData.flame[0].scale.set(1, flick, 1); this.flame.userData.flame[1].scale.set(1, flick * 1.1, 1);
    this.torchSrc.x = v.x; this.torchSrc.y = v.y + 0.35; this.torchSrc.z = v.z;
    this.torchSrc.dim = g.weather?.raining ? 0.7 : 1;
    if (Math.random() < dt * 14) g.fx.ember(v.x, v.y + 0.5, v.z);
    if (Math.random() < dt * 4) g.fx.smoke(v.x, v.y + 0.7, v.z, 0.35);
  }
  updateVisual(dt, alpha) {
    const rp = this.renderPos(alpha, this._rp || (this._rp = { x: 0, y: 0, z: 0 }));
    this.rig.root.position.set(rp.x, rp.y, rp.z);
    this.rig.root.rotation.y = this.prevYaw + angleDiff(this.prevYaw, this.yaw) * alpha;
    const a = this.atk;
    const state = {
      speed: this.speed, walkSpeed: C.walkSpeed, sprintSpeed: C.sprintSpeed, grounded: this.grounded, vy: this.vy, sneak: this.sneaking, wade: this.wading, landHard: this.landHard,
      holding: this.holdClass,
      attack: a ? { clip: a.st.clip, t: Math.min(1, a.t / a.dur), timing: a.timing, dur: a.dur } : null,
      interact: this.interact ? { clip: this.interact.clip, t: Math.min(1, this.interact.t), timing: this.interact.timing, dur: this.interact.dur } : null,
      dodge: this.dodge ? { t: this.dodge.t / C.dodgeTime, back: this.dodge.back } : null,
      block: this.block, parry: this.parryFlash, hurt: this.hurt, dead: this.dead ? this.deadT : -1, deadBack: this.deadBack,
      aim: this.aiming || this.bowRecover > 0 ? { draw: this.bowDraw || 0 } : null,
    };
    this.anim.update(dt, state);
    this.updateTorch(dt);
  }

  serialize() {
    return { x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, stats: { ...this.stats }, inv: this.inventory.serialize(), counters: { ...this.stats_ }, skills: { ...this.skills }, equipment: { chest: this.equipment.chest ? { ...this.equipment.chest } : null } };
  }
  restore(d) {
    if (!d) return;
    this.pos.x = d.x; this.pos.y = d.y; this.pos.z = d.z; this.prev = { ...this.pos }; this.yaw = d.yaw;
    Object.assign(this.stats, d.stats); this.inventory.restore(d.inv); Object.assign(this.stats_, d.counters || {});
    if (d.skills) Object.assign(this.skills, d.skills);
    if (d.equipment) { this.equipment.chest = d.equipment.chest; this.rig.setArmor?.(this.equipment.chest?.id || null); }
    this.applySkills();
  }
}
