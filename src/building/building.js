// Base building system: placement mode (grid snap + neighbour snap + validity preview), structures with HP and damage stages,
// fires with fuel and light, stations, storage, traps, garden, drying rack, sleeping, repair. ALL numbers ROBOCZE (see data/buildings.js).
import * as THREE from 'three';
import { BUILDINGS, BASE_LEVELS, BUILD_ORDER } from '../../data/buildings.js';
import { ITEMS, itemName } from '../../data/items.js';
import { Inventory } from '../inventory/inventory.js';
import { clamp, lerp, damp, smoothstep } from '../engine/util.js';
import { Colliders } from '../world/colliders.js';
import * as GM from '../gfx/models.js';
import { mats } from '../gfx/materials.js';
import { LAYOUT } from '../world/worldgen.js';

let NEXT = 1;
const GREEN = new THREE.MeshBasicMaterial({ color: 0x55ff77, transparent: true, opacity: 0.42, depthWrite: false });
const RED = new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.42, depthWrite: false });

export class BuildingSystem {
  constructor(game, models) {
    this.game = game; this.models = models;
    this.list = [];
    this.group = new THREE.Group(); this.group.name = 'buildings'; game.scene.add(this.group);
    this.level = 0;
    this.placing = null;
    this.stationCache = { t: -1, set: new Set() };
    this.sleepTarget = null;
  }
  get def() { return BUILDINGS; }

  // ---- geometry helpers ------------------------------------------------------------------------------
  // local footprint point -> world, for a structure/ghost at (x,z) rotated by ry (three.js rotation.y)
  static toWorld(x, z, ry, lx, lz) { const c = Math.cos(ry), s = Math.sin(ry); return { x: x + lx * c + lz * s, z: z - lx * s + lz * c }; }

  // Raft and signal fire are built here (not part of the buildings module).
  endgameModel(type, o = {}) {
    const g = new THREE.Group();
    if (type === 'raft') {
      const m = new THREE.Mesh(GM.raftModel(o.seed || 5), mats.prop); m.castShadow = true; g.add(m);
      g.userData = { type, size: { w: 3.6, d: 5.0, h: 1.2 }, colliders: [{ kind: 'box', x: 0, z: 0, hw: 1.8, hd: 2.3, rot: 0 }], platform: { y: 0.55, hw: 1.7, hd: 2.2 } };
    } else {
      const m = new THREE.Mesh(GM.signalFireModel(o.seed || 4), mats.prop); m.castShadow = true; g.add(m);
      g.userData = { type, size: { w: 3, d: 3, h: 2.6 }, colliders: [{ kind: 'circle', x: 0, z: 0, r: 1.5 }], fireAnchor: new THREE.Vector3(0, 1.6, 0) };
    }
    return g;
  }
  model(type, o = {}) {
    if (type === 'raft' || type === 'signal_fire') return this.endgameModel(type, o);
    if (this.models?.buildModel) { try { return this.models.buildModel(type, o); } catch (e) { console.warn('buildModel failed', type, e); } }
    return this.fallback(type);
  }
  fallback(type) {
    const d = BUILDINGS[type], [w, dd] = d.size || [1.2, 1.2];
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, dd), new THREE.MeshLambertMaterial({ color: 0x8a6a48 })); m.position.y = 0.7; g.add(m);
    g.userData = { type, size: { w, d: dd, h: 1.4 }, colliders: [{ kind: 'box', x: 0, z: 0, hw: w / 2, hd: dd / 2, rot: 0 }], fireAnchor: new THREE.Vector3(0, 0.6, 0) };
    return g;
  }

  // ---- placement -----------------------------------------------------------------------------------
  canUse(def) { return def.level <= this.level && !def.upgradeOnly && (!def.item); }
  affordable(def) { return this.game.player.inventory.hasAll(def.cost); }
  startPlacement(type) {
    const def = BUILDINGS[type]; if (!def) return false;
    if (def.level > this.level) { this.game.notify(`Wymaga poziomu bazy: ${BASE_LEVELS[def.level].name}.`, 'warn'); return false; }
    this.cancelPlacement();
    const ghost = this.model(type, { seed: 1, damage: 0, state: def.gate ? 'closed' : undefined });
    ghost.traverse((o) => { if (o.isMesh) { o.material = GREEN; o.castShadow = false; o.receiveShadow = false; } });
    this.group.add(ghost);
    this.placing = { type, def, ry: 0, ghost, valid: false, x: 0, z: 0, y: 0, reason: '', snapped: false, seed: Math.floor(Math.random() * 1000) };
    this.game.notify('LPM – postaw · R – obróć · PPM lub Esc – anuluj');
    return true;
  }
  cancelPlacement() { if (!this.placing) return; this.group.remove(this.placing.ghost); this.placing = null; }
  rotatePlacement() { if (this.placing) this.placing.ry += (this.placing.def.snap ? Math.PI / 4 : Math.PI / 12); }

  // ray from the camera through the screen centre -> ground point
  aimPoint(maxD = 15) {
    const g = this.game, cam = g.camera, w = g.world;
    const dir = this._dir || (this._dir = new THREE.Vector3()); cam.getWorldDirection(dir);
    let last = null;
    for (let t = 2; t <= maxD + 6; t += 0.3) {
      const x = cam.position.x + dir.x * t, y = cam.position.y + dir.y * t, z = cam.position.z + dir.z * t;
      const h = w.getHeight(x, z);
      if (y <= h) { last = { x, z }; break; }
    }
    if (!last) { const p = g.player.pos; const f = g.player.facingVec(); last = { x: p.x + f.x * 5, z: p.z + f.z * 5 }; }
    // clamp distance from the player
    const p = g.player.pos, dx = last.x - p.x, dz = last.z - p.z, d = Math.hypot(dx, dz);
    if (d > maxD) { last.x = p.x + dx / d * maxD; last.z = p.z + dz / d * maxD; }
    return last;
  }

  // endpoints of a wall-like piece (local x = ±w/2)
  static endpoints(x, z, ry, w) { return [BuildingSystem.toWorld(x, z, ry, -w / 2, 0), BuildingSystem.toWorld(x, z, ry, w / 2, 0)]; }

  computePlacement() {
    const P = this.placing, g = this.game, w = g.world, def = P.def;
    const [sw, sd] = def.size || (P.ghost.userData.size ? [P.ghost.userData.size.w, P.ghost.userData.size.d] : [1.2, 1.2]);
    const ap = this.aimPoint(def.tower || def.size?.[0] > 4 ? 16 : 14);
    let x = ap.x, z = ap.z, ry = P.ry, snapped = false;
    if (def.snap) {
      // stick to the ends of neighbouring wall pieces
      let best = null, bd = 1.5;
      const mine = BuildingSystem.endpoints(x, z, ry, sw);
      for (const s of this.list) {
        if (!s.def.snap) continue;
        const sw2 = s.def.size[0];
        for (const e of BuildingSystem.endpoints(s.x, s.z, s.ry, sw2)) for (let i = 0; i < 2; i++) { const d = Math.hypot(mine[i].x - e.x, mine[i].z - e.z); if (d < bd) { bd = d; best = { e, i, s }; } }
      }
      if (best) {
        // shift so my endpoint i coincides with the neighbour's end; keep parallel/perpendicular alignment when close
        const dAng = ((ry - best.s.ry) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        if (Math.abs(dAng) < 0.6) ry = best.s.ry; else if (Math.abs(Math.abs(dAng) - Math.PI / 2) < 0.6) ry = best.s.ry + Math.sign(dAng) * Math.PI / 2;
        const m2 = BuildingSystem.endpoints(x, z, ry, sw)[best.i];
        x += best.e.x - m2.x; z += best.e.z - m2.z; snapped = true;
      }
    } else { x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2; }
    // terrain under the footprint
    let hmin = 1e9, hmax = -1e9, water = false;
    const nx = Math.max(2, Math.ceil(sw / 0.8)), nz = Math.max(2, Math.ceil(sd / 0.8));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const p = BuildingSystem.toWorld(x, z, ry, (i / nx - 0.5) * sw, (j / nz - 0.5) * sd);
      const h = w.getHeight(p.x, p.z); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
      if (h < 0.35 || !w.inBounds(p.x, p.z, 6)) water = true;
    }
    const y = hmin + 0.02;
    let valid = true, reason = '';
    const pl = g.player.pos;
    if (water) { valid = false; reason = 'Za blisko wody.'; }
    else if (hmax - hmin > (def.snap ? 1.1 : 0.75)) { valid = false; reason = 'Teren jest zbyt nierówny.'; }
    else if (Math.hypot(x - pl.x, z - pl.z) > 17) { valid = false; reason = 'Za daleko.'; }
    if (valid) {
      // overlap with anything solid: sample the footprint of the model's collider boxes
      const cols = P.ghost.userData.colliders || [];
      const test = (cx, cz, r) => g.colliders.overlaps(cx, cz, r);
      outer: for (const c of cols) {
        if (c.kind === 'circle') { const p = BuildingSystem.toWorld(x, z, ry, c.x, c.z); if (test(p.x, p.z, c.r)) { valid = false; break; } }
        else {
          const stepx = Math.max(0.4, c.hw * 2 / Math.ceil(c.hw * 2 / 0.5)), stepz = Math.max(0.4, c.hd * 2 / Math.ceil(c.hd * 2 / 0.5));
          for (let ix = -c.hw; ix <= c.hw + 1e-6; ix += stepx) for (let iz = -c.hd; iz <= c.hd + 1e-6; iz += stepz) {
            const cr = Math.cos(-(c.rot || 0)), sr = Math.sin(-(c.rot || 0));
            const p = BuildingSystem.toWorld(x, z, ry, c.x + ix * cr + iz * sr, c.z - ix * sr + iz * cr);
            if (test(p.x, p.z, 0.32)) { valid = false; break outer; }
          }
        }
      }
      if (!valid) reason = 'Coś stoi na drodze.';
      if (valid && !def.walkable && Math.hypot(x - pl.x, z - pl.z) < 0.9 + (sw + sd) * 0.15 && cols.length) { valid = false; reason = 'Stoisz w tym miejscu.'; }
    }
    if (valid && def.walkable) { for (const s of this.list) if (s.def.walkable && Math.hypot(s.x - x, s.z - z) < 1.2) { valid = false; reason = 'Za blisko innej pułapki.'; } }
    if (valid && def.peak) { const pk = g.world.peak; if (Math.hypot(x - pk.x, z - pk.z) > 11) { valid = false; reason = 'Ognisko sygnałowe stawia się na szczycie góry (zaznaczony na mapie).'; } }
    if (valid && def.beach) {
      let seaward = false; for (let a = 0; a < 6.28 && !seaward; a += 0.5) if (w.getHeight(x + Math.cos(a) * 6, z + Math.sin(a) * 6) < -0.3) seaward = true;
      if (!seaward || hmin > 1.6) { valid = false; reason = 'Tratwę stawia się na plaży, tuż przy wodzie.'; }
    }
    if (valid && def.needsNear) { const has = this.list.some((s) => s.type === def.needsNear && Math.hypot(s.x - x, s.z - z) < 14); if (!has) { valid = false; reason = `Postaw w pobliżu: ${BUILDINGS[def.needsNear].name}.`; } }
    if (valid && !this.affordable(def)) { valid = false; reason = 'Brakuje surowców.'; }
    Object.assign(P, { x, z, y, ry, valid, reason, snapped });
  }

  updatePlacement() {
    const P = this.placing; if (!P) return;
    this.computePlacement();
    P.ghost.position.set(P.x, P.y, P.z); P.ghost.rotation.y = P.ry;
    P.ghost.traverse((o) => { if (o.isMesh) o.material = P.valid ? GREEN : RED; });
    this.game.hud?.setBuildHint?.(P);
  }

  confirmPlacement() {
    const P = this.placing, g = this.game; if (!P) return;
    if (!P.valid) { g.notify(P.reason || 'Nie można tu postawić.', 'warn'); g.audio?.play('block', { vol: 0.4 }); return; }
    const inv = g.player.inventory;
    inv.removeCost(P.def.cost);
    const s = this.place(P.type, P.x, P.z, P.ry, { seed: P.seed, y: P.y });
    P.seed = Math.floor(Math.random() * 1000);
    g.audio?.play('craft', { pos: { x: P.x, y: P.y, z: P.z }, vol: 0.8 });
    g.fx.dust(P.x, P.y + 0.3, P.z, 2);
    g.player.gainXp(P.def.hp > 200 ? 6 : 3);
    g.onBuilt?.(s);
    if (!this.affordable(P.def)) this.cancelPlacement();
    return s;
  }

  // ---- structures ----------------------------------------------------------------------------------
  place(type, x, z, ry, o = {}) {
    const def = BUILDINGS[type], g = this.game, w = g.world;
    const s = { id: NEXT++, type, def, x, z, ry, y: o.y ?? w.getHeight(x, z), seed: o.seed ?? 1, hp: o.hp ?? def.hp, maxHp: def.hp, stage: 0, state: o.state ?? (def.gate ? 'closed' : undefined), colliders: [], lit: o.lit ?? true, fuel: o.fuel ?? (def.fuel ? def.fuel.max * 0.4 : 0), inv: null, rack: o.rack || [], garden: o.garden || null, trapArmed: true, cooldown: 0, extinguished: false };
    if (def.storage) { s.inv = new Inventory(def.storage); if (o.inv) s.inv.restore(o.inv); }
    s.stage = this.stageFor(s);
    this.buildVisual(s);
    this.list.push(s);
    this.registerColliders(s);
    if (def.light) s.src = g.lights.add({ x: s.x, y: s.y + 1.1, z: s.z, color: def.light.color, intensity: def.light.i, radius: def.light.r, flicker: 1, scare: def.light.scare, scareRadius: def.light.scareR, warm: def.light.warm, on: this.isBurning(s) });
    this.stationCache.t = -1;
    return s;
  }
  isBurning(s) { const d = s.def; if (!d.light) return false; if (d.station === 'campfire' || d.fuel) return s.lit && s.fuel > 0; return d.station === 'furnace' || d.station === 'forge' ? s.lit : true; }
  stageFor(s) { const f = s.hp / s.maxHp; return f > 0.75 ? 0 : f > 0.5 ? 1 : f > 0.25 ? 2 : 3; }
  buildVisual(s) {
    if (s.group) { this.group.remove(s.group); }
    const gr = this.model(s.type, { seed: s.seed, damage: s.stage, state: s.state, lit: this.isBurning(s), growth: s.garden ? this.gardenGrowth(s) : 0 });
    gr.position.set(s.x, s.y, s.z); gr.rotation.y = s.ry;
    gr.traverse((o) => { if (o.isMesh) { o.userData.struct = s; } });
    if (s.type === 'raft') { if (s.sail) { const sm = new THREE.Mesh(GM.raftSail(3), mats.prop); sm.castShadow = true; sm.position.set(0, 0.7, 0.2); gr.add(sm); const mast = gr; } if (s.rudder) { const rm = new THREE.Mesh(GM.raftRudder(3), mats.prop); rm.castShadow = true; gr.add(rm); } }
    this.group.add(gr); s.group = gr; s.info = gr.userData;
    this.updateGlow(s);
  }
  updateGlow(s) {
    const gl = s.info?.glow; if (!gl) return;
    const on = this.isBurning(s);
    for (const m of gl) m.visible = on;
  }
  registerColliders(s) {
    for (const c of s.colliders) this.game.colliders.remove(c);
    s.colliders = [];
    if (s.def.walkable) return;
    let cols = s.info?.colliders || [];
    if (s.def.gate && s.state === 'open') cols = cols.filter((c) => c.kind === 'circle' || c.open === true);   // open gate: only posts stay solid
    for (const c of cols) {
      const p = BuildingSystem.toWorld(s.x, s.z, s.ry, c.x, c.z);
      const base = s.y, top = s.info?.size?.h ?? 2.5;
      if (c.kind === 'circle') s.colliders.push(this.game.colliders.add({ x: p.x, z: p.z, r: c.r, base, top, tag: 'building', ref: s, noCamera: false }));
      else s.colliders.push(this.game.colliders.add({ x: p.x, z: p.z, hw: c.hw, hd: c.hd, rot: -(s.ry) + (c.rot || 0), base, top, tag: 'building', ref: s }));
    }
  }
  remove(s) {
    const g = this.game;
    g.colliders && s.colliders.forEach((c) => g.colliders.remove(c));
    if (s.src) g.lights.remove(s.src);
    if (s.group) this.group.remove(s.group);
    const i = this.list.indexOf(s); if (i >= 0) this.list.splice(i, 1);
    this.stationCache.t = -1;
  }

  damage(s, amount, source) {
    if (!this.list.includes(s)) return false;
    s.hp -= amount * (s.def.dmgMul ?? 1);
    s.hitFlash = 0.25;
    const g = this.game;
    g.audio?.play('chop', { pos: { x: s.x, y: s.y + 1, z: s.z }, pitch: 0.7, vol: 0.9 });
    g.fx.chips(s.x, s.y + 1.2, s.z, 0, 0, s.def.cat === 'wall' && s.type !== 'palisade_wall' ? 'rock' : 'wood');
    if (s.hp <= 0) { this.destroy(s); return true; }
    const st = this.stageFor(s);
    if (st !== s.stage) { s.stage = st; this.buildVisual(s); this.registerColliders(s); g.notify(`${s.def.name}: uszkodzenia!`, 'warn'); }
    return false;
  }
  destroy(s) {
    const g = this.game;
    g.notify(`${s.def.name} został zniszczony!`, 'warn');
    g.audio?.play('tree_fall', { pos: { x: s.x, y: s.y, z: s.z }, vol: 0.7 });
    for (let i = 0; i < 3; i++) g.fx.chips(s.x + (Math.random() - 0.5) * 2, s.y + 1 + Math.random(), s.z + (Math.random() - 0.5) * 2, 0, 0, s.def.cat === 'wall' ? 'rock' : 'wood');
    g.fx.dust(s.x, s.y + 0.5, s.z, 3);
    // debris + salvage (25% of the materials)
    if (this.models?.buildDebris) { const d = this.models.buildDebris(s.type, s.seed); d.position.set(s.x, s.y, s.z); d.rotation.y = s.ry; this.group.add(d); setTimeout(() => this.group.remove(d), 60000); }
    for (const [id, n] of Object.entries(s.def.cost)) { const k = Math.floor(n * 0.25); if (k > 0) g.drops.spawn(id, k, s.x + (Math.random() - 0.5) * 1.5, s.z + (Math.random() - 0.5) * 1.5, {}); }
    if (s.inv) for (const it of s.inv.slots) if (it) g.drops.spawn(it.id, it.n, s.x, s.z, { dur: it.dur });
    g.onStructureDestroyed?.(s);
    this.remove(s);
  }
  repairCost(s) { const c = {}; const frac = 1 - s.hp / s.maxHp; for (const [id, n] of Object.entries(s.def.cost)) { const k = Math.ceil(n * 0.35 * frac); if (k > 0) c[id] = k; } return c; }
  repair(s) {
    const g = this.game, inv = g.player.inventory;
    if (s.hp >= s.maxHp) return g.notify('Nie wymaga naprawy.');
    if (g.clock.isNight) return g.notify('Naprawy prowadź za dnia.', 'warn');
    const cost = this.repairCost(s);
    if (!inv.hasAll(cost)) return g.notify('Brakuje surowców: ' + Object.entries(cost).map(([id, n]) => `${n}× ${itemName(id)}`).join(', '), 'warn');
    inv.removeCost(cost); s.hp = s.maxHp; s.stage = 0; this.buildVisual(s); this.registerColliders(s);
    g.audio?.play('craft', { pos: s, vol: 0.7 }); g.notify(`Naprawiono: ${s.def.name}.`, 'good');
  }
  demolish(s) {
    const g = this.game;
    for (const [id, n] of Object.entries(s.def.cost)) { const k = Math.floor(n * 0.5); if (k > 0) g.giveItem(id, k); }
    if (s.inv) for (const it of s.inv.slots) if (it) g.giveItem(it.id, it.n);
    this.remove(s); g.audio?.play('craft', { vol: 0.5 });
  }

  // Height of a walkable tower platform under (x,z) if the entity is standing at/above it, else null.
  platformY(x, z, y) {
    for (const s of this.list) {
      const pf = s.info?.platform; if (!pf) continue;
      const dx = x - s.x, dz = z - s.z, lx = dx * Math.cos(s.ry) - dz * Math.sin(s.ry), lz = dx * Math.sin(s.ry) + dz * Math.cos(s.ry);
      if (Math.abs(lx) <= pf.hw && Math.abs(lz) <= pf.hd && y >= s.y + pf.y - 0.7) return s.y + pf.y;
    }
    return null;
  }

  // ---- queries -------------------------------------------------------------------------------------
  near(x, z, r, fn) { for (const s of this.list) if (Math.hypot(s.x - x, s.z - z) <= r) fn(s); }
  nearestTarget(x, z, r, pred) {
    let best = null, bd = r;
    for (const s of this.list) { if (s.def.walkable || s.type === 'bed') continue; if (pred && !pred(s)) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  count(type) { let n = 0; for (const s of this.list) if (s.type === type) n++; return n; }
  stationsNear(x, z, r = 8) {
    const t = this.game.time;
    if (this.stationCache.t > 0 && t - this.stationCache.t < 0.4 && Math.hypot(x - this.stationCache.x, z - this.stationCache.z) < 0.5) return this.stationCache.set;
    const set = new Set();
    for (const s of this.list) {
      const st = s.def.station; if (!st) continue;
      if (Math.hypot(s.x - x, s.z - z) > r) continue;
      if (st === 'campfire' && !this.isBurning(s)) continue;
      if ((st === 'furnace' || st === 'forge') && !s.lit) continue;
      set.add(st);
    }
    Object.assign(this.stationCache, { t, x, z, set });
    return set;
  }

  // ---- base level ----------------------------------------------------------------------------------
  nextLevel() { return BASE_LEVELS[this.level + 1] || null; }
  upgradeCheck() {
    const n = this.nextLevel(); if (!n) return { ok: false, reason: 'Maksymalny poziom bazy.' };
    const inv = this.game.player.inventory;
    const miss = [];
    for (const [t, c] of n.needs || []) if (this.count(t) < c) miss.push(`${c}× ${BUILDINGS[t].name}`);
    if (!inv.hasAll(n.requires)) for (const [id, c] of Object.entries(n.requires)) if (!inv.has(id, c)) miss.push(`${c}× ${itemName(id)}`);
    return { ok: miss.length === 0, reason: miss.length ? 'Brakuje: ' + miss.join(', ') : '', next: n };
  }
  upgradeBase() {
    const g = this.game, c = this.upgradeCheck();
    if (!c.ok) return g.notify(c.reason, 'warn');
    g.player.inventory.removeCost(c.next.requires);
    this.level++;
    g.hud?.banner(`Twój obóz stał się: ${c.next.name}`, c.next.desc, 4); g.audio?.play('dawn', { vol: 0.8 });
    g.player.gainXp(30);
  }

  // ---- gardens -------------------------------------------------------------------------------------
  gardenGrowth(s) { if (!s.garden) return 0; return clamp((this.game.time - s.garden.t0) / s.garden.dur, 0, 1); }

  // ---- per-frame update ----------------------------------------------------------------------------
  update(dt) {
    const g = this.game, t = g.time, night = g.clock.isNight;
    for (const s of this.list) {
      const d = s.def;
      if (s.hitFlash > 0) s.hitFlash -= dt;
      // fires
      if (d.fuel && s.lit) {
        const burning = s.fuel > 0;
        if (burning) { s.fuel = Math.max(0, s.fuel - dt); if (g.weather?.raining && !d.upgradeOnly) s.fuel = Math.max(0, s.fuel - dt * 1.5 * g.weather.intensity); }
        if (!burning || s.fuel <= 0) { if (s.src?.on) { s.src.on = false; this.updateGlow(s); g.notify(`${d.name} dogasa.`); } s.lit = false; }
      }
      const burning = this.isBurning(s);
      if (s.src) { if (s.src.on !== burning) { s.src.on = burning; this.updateGlow(s); } if (burning && s.fuel > 0 && d.fuel) s.src.dim = 0.55 + 0.45 * smoothstep(0, 120, s.fuel); else s.src.dim = 1; }
      if (burning && d.light?.flame) {
        const fa = s.info?.fireAnchor;
        const p = fa ? BuildingSystem.toWorld(s.x, s.z, s.ry, fa.x, fa.z) : { x: s.x, z: s.z };
        const y = s.y + (fa ? fa.y : 0.5);
        s._fxT = (s._fxT || 0) - dt;
        if (s._fxT <= 0) { s._fxT = 0.04; g.fx.flame(p.x, y, p.z, d.light.flame); if (Math.random() < 0.4) g.fx.smoke(p.x, y + 0.9 * d.light.flame, p.z, 0.9 + d.light.flame * 0.4); if (Math.random() < 0.3) g.fx.ember(p.x, y + 0.5, p.z); }
      }
      // drying rack
      if (d.rack) for (const r of s.rack) if (!r.done && t >= r.t0 + 90) r.done = true;
      // garden regrowth visual (rebuild at coarse steps)
      if (d.garden && s.garden) { const gr = Math.floor(this.gardenGrowth(s) * 4); if (gr !== s._gr) { s._gr = gr; this.buildVisual(s); } }
      // traps
      if (d.trap && g.entities) this.updateTrap(s, dt);
      // rain barrel
      if (d.barrel) { s.water = s.water || 0; if (g.weather?.raining) s.water = Math.min(6, s.water + dt * 0.03 * g.weather.intensity); }
    }
    if (this.placing) { /* ghost updated per render frame */ }
  }

  updateTrap(s, dt) {
    const tr = s.def.trap, g = this.game;
    s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.sprung || s.cooldown > 0) return;
    g.entities.near(s.x, s.z, tr.radius + 1.5, (e) => {
      if (s.sprung || s.cooldown > 0 || e.dead || e.def.flyHeight || e.trapped > 0) return;
      if (Math.hypot(e.x - s.x, e.z - s.z) > tr.radius + e.radius * 0.5) return;
      e.takeHit({ damage: tr.damage, dir: 0, knock: 0, source: g.player });
      if (tr.hold) { e.trapped = tr.hold; e.stun = Math.max(e.stun, tr.hold); }
      g.audio?.play(tr.kind === 'bear' ? 'block' : 'hit', { pos: e, vol: 0.9 }); g.fx.hitEntity(e, 0, true);
      if (s.def.oneShot || tr.kind === 'bear') { s.sprung = true; if (tr.kind === 'bear') { s.state = 'sprung'; this.buildVisual(s); setTimeout(() => this.remove(s), tr.hold * 1000 + 800); } else setTimeout(() => this.remove(s), 400); }
      else s.cooldown = tr.cooldown;
    });
  }

  // ---- placement ghost rendering, called every frame from the game ----
  frame(dt) { if (this.placing) this.updatePlacement(); }

  // ---- interaction ---------------------------------------------------------------------------------
  // returns the closest interactable structure in front of the player within `reach`
  interactable(p, f, reach) {
    let best = null, bs = 1e9;
    for (const s of this.list) {
      if (s.def.walkable) continue;
      const half = Math.max(s.info?.size?.w || 1, s.info?.size?.d || 1) / 2;
      const dx = s.x - p.x, dz = s.z - p.z, d = Math.hypot(dx, dz) - half;
      if (d > reach) continue;
      const dot = (dx * f.x + dz * f.z) / (Math.hypot(dx, dz) || 1);
      if (dot < -0.2 && d > 0.5) continue;
      const score = d - dot * 0.6;
      if (score < bs) { bs = score; best = s; }
    }
    return best;
  }

  // Actions offered by a structure: [{label, enabled, hint, run}]
  actions(s) {
    const g = this.game, inv = g.player.inventory, d = s.def, out = [];
    const add = (label, run, enabled = true, hint = '') => out.push({ label, run, enabled, hint });
    if (d.station === 'campfire') {
      if (!this.isBurning(s)) {
        const can = inv.has('flint') || inv.has('torch');
        add('Rozpal ogień', () => { if (s.fuel <= 0) { if (!inv.has('wood')) return g.notify('Potrzebujesz drewna na opał.', 'warn'); inv.remove('wood', 1); s.fuel = d.fuel.per; } s.lit = true; if (!inv.has('torch') && inv.has('flint')) inv.wear(inv.slots.findIndex((x) => x && x.id === 'flint'), 0); g.audio?.play('craft'); g.notify('Ogień płonie.'); this.updateGlow(s); }, can, can ? '' : 'Potrzebujesz krzemienia lub pochodni');
      } else add('Gotuj', () => g.openCraft(new Set(['campfire'])));
      const room = s.fuel < d.fuel.max * 0.85;
      add(`Dorzuć drewna (+${Math.round(d.fuel.per / 60)} min)`, () => { if (inv.remove('wood', 1)) { s.fuel = Math.min(d.fuel.max, s.fuel + d.fuel.per); g.audio?.play('pickup'); if (!s.lit) { s.lit = true; this.updateGlow(s); } } }, inv.has('wood') && room, inv.has('wood') ? (room ? '' : 'Ognisko jest pełne') : 'Brak drewna');
      if (d.upgradeTo) {
        const up = BUILDINGS[d.upgradeTo];
        const ok = up.level <= this.level && inv.hasAll(up.upgradeCost || up.cost);
        add(`Ulepsz do: ${up.name}`, () => this.upgradeStruct(s, up), ok, up.level > this.level ? `Wymaga: ${BASE_LEVELS[up.level].name}` : ok ? '' : 'Brakuje surowców');
      }
    }
    if (d.station && d.station !== 'campfire') {
      if (d.station === 'furnace' || d.station === 'forge') {
        add(s.lit ? 'Użyj' : 'Rozpal', () => { if (!s.lit) { if (!inv.has('wood')) return g.notify('Potrzebujesz drewna.', 'warn'); inv.remove('wood', 1); s.lit = true; s.src && (s.src.on = true); this.updateGlow(s); } g.openCraft(this.stationsNear(s.x, s.z)); });
      } else add('Użyj', () => g.openCraft(this.stationsNear(s.x, s.z)));
    }
    if (d.storage) add('Otwórz', () => g.openContainer(s));
    if (d.bed) {
      const enemies = g.entities ? g.entities.nearestAlive(s.x, s.z, 40, (e) => e.def.brain !== 'prey' && e.mode !== 'idle' && e.mode !== 'sleep') : null;
      add('Prześpij noc', () => g.sleepIn(s), g.clock.isNight && !enemies, !g.clock.isNight ? 'Spać można tylko w nocy' : enemies ? 'Wrogowie są w pobliżu!' : '');
      add('Ustaw punkt odrodzenia', () => { g.respawnPoint = { x: s.x, z: s.z }; g.notify('Punkt odrodzenia ustawiony.', 'good'); g.audio?.play('craft'); });
    }
    if (d.raft) {
      add(s.sail ? 'Żagiel: zamontowany ✔' : 'Zamontuj żagiel', () => { if (inv.remove('raft_sail', 1)) { s.sail = true; this.buildVisual(s); g.audio?.play('craft'); g.notify('Żagiel zamontowany.', 'good'); } }, !s.sail && inv.has('raft_sail'), s.sail ? '' : 'Potrzebujesz: Żagiel ze skór');
      add(s.rudder ? 'Ster: zamontowany ✔' : 'Zamontuj obsydianowy ster', () => { if (inv.remove('obsidian_rudder', 1)) { s.rudder = true; this.buildVisual(s); g.audio?.play('craft'); g.notify('Ster zamontowany.', 'good'); } }, !s.rudder && inv.has('obsidian_rudder'), s.rudder ? '' : 'Potrzebujesz: Obsydianowy ster');
      add('Odpłyń — zacznij ostatnią noc', () => g.ending.begin(s), s.sail && s.rudder && !g.ending.active, !(s.sail && s.rudder) ? 'Brakuje żagla lub steru' : '');
    }
    if (d.signal) add('Rozpal — zacznij ostatnią noc', () => g.ending.begin(s), !g.ending.active, g.ending.active ? 'Trwa ostatnia noc' : '');
    if (d.gate) add(s.state === 'open' ? 'Zamknij bramę' : 'Otwórz bramę', () => { s.state = s.state === 'open' ? 'closed' : 'open'; this.buildVisual(s); this.registerColliders(s); g.audio?.play('block', { pos: s, vol: 0.6 }); });
    if (d.tower) add(g.player.onTower === s ? 'Zejdź z wieży' : 'Wejdź na wieżę', () => g.toggleTower(s));
    if (d.rack) {
      const done = s.rack.filter((r) => r.done).length;
      add('Powieś surowe mięso', () => { if (inv.remove('raw_meat', 1)) { s.rack.push({ t0: g.time, done: false }); g.notify('Mięso zaczyna schnąć.'); } }, inv.has('raw_meat') && s.rack.length < 6, inv.has('raw_meat') ? (s.rack.length >= 6 ? 'Suszarka pełna' : '') : 'Brak surowego mięsa');
      add(`Zbierz suszone mięso (${done})`, () => { const n = s.rack.filter((r) => r.done).length; s.rack = s.rack.filter((r) => !r.done); g.giveItem('dried_meat', n); }, done > 0, done ? '' : `Schnie: ${s.rack.length}`);
    }
    if (d.barrel) {
      add('Napełnij bukłak', () => { if (inv.has('waterskin') && s.water >= 1) { inv.remove('waterskin', 1); s.water -= 1; g.giveItem('waterskin_full', 1); } }, inv.has('waterskin') && (s.water || 0) >= 1, (s.water || 0) < 1 ? 'Zbiornik jest pusty (deszcz go napełni)' : inv.has('waterskin') ? '' : 'Potrzebujesz pustego bukłaka');
      add('Napij się', () => { if (s.water >= 0.5) { s.water -= 0.5; g.survival.drinkWater(true); } }, (s.water || 0) >= 0.5);
    }
    if (d.garden) {
      const gr = this.gardenGrowth(s);
      if (!s.garden) add('Zasadź jagody', () => { if (inv.remove('berries', 2)) { s.garden = { t0: g.time, dur: 420, crop: 'berries' }; this.buildVisual(s); g.notify('Zasadzono jagody.'); } }, inv.has('berries', 2), 'Potrzebujesz 2 jagód');
      if (!s.garden) add('Zasadź zioła', () => { if (inv.remove('herb', 2)) { s.garden = { t0: g.time, dur: 360, crop: 'herb' }; this.buildVisual(s); g.notify('Zasadzono zioła.'); } }, inv.has('herb', 2), 'Potrzebujesz 2 ziół');
      if (s.garden) add(gr >= 1 ? 'Zbierz plon' : `Rośnie… ${Math.floor(gr * 100)}%`, () => { g.giveItem(s.garden.crop, 4 + Math.floor(Math.random() * 3)); s.garden = null; this.buildVisual(s); }, gr >= 1);
    }
    if (d.fuelItem) add('Dolej tłuszczu', () => { if (inv.remove('fat', 1)) { s.fuel = Math.min(d.fuel.max, s.fuel + d.fuel.per); s.lit = true; s.src && (s.src.on = true); g.audio?.play('pickup'); } }, inv.has('fat'), inv.has('fat') ? '' : 'Potrzebujesz tłuszczu');
    if (s.hp < s.maxHp) { const c = this.repairCost(s); add('Napraw (' + Object.entries(c).map(([id, n]) => `${n}× ${itemName(id)}`).join(', ') + ')', () => this.repair(s), !g.clock.isNight && inv.hasAll(c), g.clock.isNight ? 'Naprawy prowadź za dnia' : inv.hasAll(c) ? '' : 'Brakuje surowców'); }
    if (!(g.ending.active && g.ending.struct === s)) add('Zburz (zwrot 50%)', () => this.demolish(s));
    return out;
  }
  upgradeStruct(s, up) {
    const g = this.game, inv = g.player.inventory;
    inv.removeCost(up.upgradeCost || up.cost);
    const st = { x: s.x, z: s.z, ry: s.ry, fuel: s.fuel };
    this.remove(s);
    const n = this.place(up.id, st.x, st.z, st.ry, { fuel: Math.min(up.fuel.max, st.fuel + up.fuel.per), lit: true });
    g.audio?.play('craft', { vol: 0.9 }); g.notify(`${up.name} gotowe.`, 'good'); g.player.gainXp(10);
    return n;
  }

  // ---- save / load ---------------------------------------------------------------------------------
  serialize() {
    const g = this.game;
    return { level: this.level, list: this.list.map((s) => ({ type: s.type, x: s.x, z: s.z, ry: s.ry, hp: s.hp, seed: s.seed, state: s.state, fuel: s.fuel, lit: s.lit, y: s.y, inv: s.inv ? s.inv.serialize() : null, rack: s.rack.map((r) => ({ done: r.done, age: g.time - r.t0 })), garden: s.garden ? { ...s.garden, t0: s.garden.t0 - this.game.time } : null, water: s.water || 0, sail: !!s.sail, rudder: !!s.rudder })) };
  }
  restore(d) {
    if (!d) return;
    for (const s of [...this.list]) this.remove(s);
    this.level = d.level || 0;
    for (const r of d.list || []) {
      if (!BUILDINGS[r.type]) continue;
      const s = this.place(r.type, r.x, r.z, r.ry, { seed: r.seed, hp: r.hp, state: r.state, fuel: r.fuel, lit: r.lit, y: r.y, inv: r.inv, rack: (r.rack || []).map((x) => ({ done: x.done, t0: this.game.time - (x.age || 0) })), garden: r.garden ? { ...r.garden, t0: this.game.time + r.garden.t0 } : null });
      s.water = r.water || 0; s.sail = !!r.sail; s.rudder = !!r.rudder; if (s.sail || s.rudder) this.buildVisual(s);
      s.stage = this.stageFor(s); this.buildVisual(s); this.registerColliders(s);
    }
  }
  dispose() { for (const s of [...this.list]) this.remove(s); this.cancelPlacement(); this.game.scene.remove(this.group); }
}
