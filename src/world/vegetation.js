// Renders all resource nodes / scenery with per-cell instancing and manages their gameplay state
// (damage, felling, respawn, hand-harvest depletion). Nodes always sit on the terrain (y from the heightmap).
import * as THREE from 'three';
import * as M from '../gfx/models.js';
import { foliage, mats, occlusionFade } from '../gfx/materials.js';
import { RESOURCES } from '../../data/resources.js';
import { easeOutCubic, clamp } from '../engine/util.js';

const CELL = 64;
const MAT = {
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }), tall: foliage(0.62, 10), mid: foliage(0.4, 6), low: foliage(0.09, 1.2), reed: foliage(0.32, 2, 0.02), palm: foliage(0.75, 7), prop: occlusionFade(new THREE.MeshLambertMaterial({ vertexColors: true }), 'propfade'),
};
// type -> {build(variant, pal), mat, shadow, sink}
const DEFS = {
  tree_pine: { build: (v) => M.pine(100 + v * 7), mat: 'tall', shadow: true, sink: 0.15 },
  tree_oak: { build: (v) => M.oak(200 + v * 7), mat: 'mid', shadow: true, sink: 0.15 },
  tree_jungle: { build: (v) => M.jungleTree(300 + v * 7), mat: 'tall', shadow: true, sink: 0.2 },
  tree_palm: { build: (v) => M.palm(400 + v * 7), mat: 'palm', shadow: true, sink: 0.1 },
  tree_dead: { build: (v) => M.deadTree(500 + v * 7), mat: 'mid', shadow: true, sink: 0.1 },
  rock: { build: (v, pal) => M.rock(600 + v * 7, pal || 'grey'), mat: 'prop', shadow: true, sink: 0.22 },
  ore_iron: { build: (v) => M.ore(700 + v * 7, 'iron'), mat: 'prop', shadow: true, sink: 0.2 },
  ore_obsidian: { build: (v) => M.ore(720 + v * 7, 'obsidian'), mat: 'prop', shadow: true, sink: 0.2 },
  ore_sulfur: { build: (v) => M.ore(740 + v * 7, 'sulfur'), mat: 'prop', shadow: true, sink: 0.2 },
  bush_berry: { build: (v) => M.bush(800 + v * 7, true), mat: 'low', shadow: false, sink: 0.05, alt: (v) => M.bush(800 + v * 7, false) },
  bush: { build: (v) => M.bush(820 + v * 7, false), mat: 'low', shadow: false, sink: 0.05 },
  fern: { build: (v) => M.fern(840 + v * 7), mat: 'low', shadow: false, sink: 0.0 },
  liana: { build: (v) => M.liana(860 + v * 7), mat: 'low', shadow: false, sink: 0.05 },
  reed: { build: (v) => M.reed(880 + v * 7), mat: 'reed', shadow: false, sink: 0.08 },
  bones: { build: (v) => M.bones(900 + v * 7), mat: 'prop', shadow: false, sink: 0.0 },
  sticks: { build: (v) => M.sticks(920 + v * 7), mat: 'prop', shadow: false, sink: 0.0 },
  stone_small: { build: (v) => M.pebbles(940 + v * 7), mat: 'prop', shadow: false, sink: 0.0 },
  crate: { build: () => M.crate(960), mat: 'prop', shadow: true, sink: 0.05 },
  barrel: { build: () => M.barrel(970), mat: 'prop', shadow: true, sink: 0.05 },
  hull: { build: (v) => M.hull(980 + v * 3), mat: 'prop', shadow: true, sink: 0 },
  crystal: { build: (v) => M.crystal(1000 + v), mat: 'glow', shadow: false, sink: 0.02 },
  note: { build: () => M.noteProp(1010), mat: 'prop', shadow: true, sink: 0.0 },
};
const STUMP_TYPES = new Set(['tree_pine', 'tree_oak', 'tree_jungle', 'tree_palm', 'tree_dead']);

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class ResourceField {
  constructor({ scene, world, colliders, nodes }) {
    this.scene = scene; this.world = world; this.colliders = colliders; this.nodes = nodes;
    this.group = new THREE.Group(); this.group.name = 'vegetation'; scene.add(this.group);
    this.geoCache = new Map();
    this.cells = new Map();
    this.hash = new Map();                    // 8u cells for queries
    this.time = 0;
    this.falling = [];
    this.shaking = new Set();
    this.growing = new Set();
    this.respawning = [];
    this.byId = new Map();
    this.stats = { instances: 0, meshes: 0 };
    this.build();
  }

  geo(key, fn) { let g = this.geoCache.get(key); if (!g) { g = fn(); this.geoCache.set(key, g); } return g; }
  modelKey(n) { return `${n.type}:${n.pal || ''}:${n.variant}`; }
  nodeGeo(n) { return this.geo(this.modelKey(n), () => DEFS[n.type].build(n.variant, n.pal)); }

  build() {
    const groups = new Map();                 // cellKey -> Map(modelKey -> nodes[])
    for (const n of this.nodes) {
      if (!DEFS[n.type]) continue;
      this.byId.set(n.id, n);
      const cx = Math.floor((n.x + 256) / CELL), cz = Math.floor((n.z + 256) / CELL), ck = cx * 16 + cz;
      let g = groups.get(ck); if (!g) groups.set(ck, g = { cx, cz, models: new Map() });
      const list = g.models.get(this.modelKey(n)) || g.models.set(this.modelKey(n), []).get(this.modelKey(n));
      list.push(n);
      const hk = Math.floor(n.x / 8) * 4099 + Math.floor(n.z / 8);
      (this.hash.get(hk) || this.hash.set(hk, []).get(hk)).push(n);
      this.initNode(n);
    }
    for (const [ck, g] of groups) {
      const grp = new THREE.Group(); grp.userData.center = new THREE.Vector3((g.cx + 0.5) * CELL - 256, 0, (g.cz + 0.5) * CELL - 256);
      this.group.add(grp);
      const cell = { grp, meshes: [] };
      this.cells.set(ck, cell);
      const stumps = [];
      for (const [mk, list] of g.models) {
        const def = DEFS[list[0].type];
        const mesh = this.makeMesh(this.geo(mk, () => def.build(list[0].variant, list[0].pal)), MAT[def.mat], list.length, def.shadow);
        list.forEach((n, i) => { n._mesh = mesh; n._idx = i; this.writeNode(n); });
        if (def.alt) {
          const altMesh = this.makeMesh(this.geo('alt:' + mk, () => def.alt(list[0].variant)), MAT[def.mat], list.length, def.shadow);
          list.forEach((n, i) => { n._altMesh = altMesh; n._altIdx = i; altMesh.setMatrixAt(i, ZERO); altMesh.setColorAt(i, _c.setRGB(1, 1, 1)); });
          altMesh.instanceMatrix.needsUpdate = true; altMesh.computeBoundingSphere(); grp.add(altMesh); cell.meshes.push(altMesh);
        }
        for (const n of list) if (STUMP_TYPES.has(n.type)) stumps.push(n);
        grp.add(mesh); cell.meshes.push(mesh);
        this.stats.instances += list.length;
      }
      if (stumps.length) {
        const sm = this.makeMesh(this.geo('stump', () => M.stump(11)), MAT.prop, stumps.length, false);
        stumps.forEach((n, i) => { n._stump = sm; n._stumpIdx = i; sm.setMatrixAt(i, ZERO); });
        sm.instanceMatrix.needsUpdate = true; sm.computeBoundingSphere();
        grp.add(sm); cell.meshes.push(sm);
      }
      for (const m of cell.meshes) { m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      this.stats.meshes += cell.meshes.length;
    }
  }

  makeMesh(geo, mat, count, shadow) {
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.castShadow = shadow; m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, _c.setRGB(1, 1, 1));
    return m;
  }

  initNode(n) {
    const res = RESOURCES[n.type];
    n.state = 'alive';
    n.hp = res ? res.hp : 1;
    n.res = res || null;
    n.grow = 1; n.shake = 0;
    n.baseY = n.y - (DEFS[n.type]?.sink ?? 0) * n.scale;
    if (n.hidden) { n.state = 'gone'; n.grow = 0; return; }
    this.makeColliders(n);
  }
  makeColliders(n) {
    const res = n.res;
    if (res && res.radius > 0 && !n.decor) {
      const solid = res.kind === 'tool' || res.kind === 'loot';
      if (solid) n.collider = this.colliders.add({ x: n.x, z: n.z, r: res.radius * n.scale, top: res.height * n.scale, base: n.y, tag: 'node', ref: n });
    }
    if (n.type === 'hull') {
      n.colliders = [];
      const L = 12;
      for (let s = -L / 2 + 1; s <= L / 2 - 1; s += 2.2) {
        const lx = Math.sin(n.yaw) * s, lz = Math.cos(n.yaw) * s;
        n.colliders.push(this.colliders.add({ x: n.x + lx, z: n.z + lz, r: 0.9, top: 2.5, base: n.y, tag: 'wreck', noCamera: true, ref: n }));
      }
    }
  }
  // a hidden node (washed-up wreck, lightning ore) appears
  revealNode(n) {
    if (!n.hidden) return;
    n.hidden = false; n.state = 'alive'; n.hp = n.res ? n.res.hp : 1; n.grow = 0.1;
    this.makeColliders(n); this.growing.add(n); this.writeNode(n);
  }

  // Compose the instance matrix for a node in its current state.
  writeNode(n) {
    const g = n.state === 'alive' ? n.grow : 0;
    const s = n.scale * g;
    _e.set(n.tilt[0], n.yaw, n.tilt[1] + (n.shake ? Math.sin(this.time * 38) * n.shake * 0.05 : 0));
    _q.setFromEuler(_e);
    const sxz = s * (1 + (n.tintH || 0) * 1.5);
    _p.set(n.x, n.baseY, n.z); _s.set(sxz, s, sxz);
    const mesh = n.depleted && n._altMesh ? n._altMesh : n._mesh;
    const other = n.depleted && n._altMesh ? n._mesh : n._altMesh;
    if (s <= 0.0001) mesh.setMatrixAt(n.depleted && n._altMesh ? n._altIdx : n._idx, ZERO);
    else mesh.setMatrixAt(n.depleted && n._altMesh ? n._altIdx : n._idx, _m.compose(_p, _q, _s));
    if (other) other.setMatrixAt(n.depleted && n._altMesh ? n._idx : n._altIdx, ZERO);
    mesh.instanceMatrix.needsUpdate = true; if (other) other.instanceMatrix.needsUpdate = true;
    // tint (instance colour)
    const t = n.tint;
    for (const [mm, idx] of [[n._mesh, n._idx], [n._altMesh, n._altIdx]]) if (mm) { mm.setColorAt(idx, _c.setRGB(t * (1 + (n.tintH || 0)), t, t * (1 - (n.tintH || 0)))); if (mm.instanceColor) mm.instanceColor.needsUpdate = true; }
    if (n._stump) {
      const showStump = n.state === 'felled';
      const rs = (n.res ? n.res.radius : 0.4) / 0.4 * n.scale;
      _s.set(rs, n.scale * 0.9, rs);
      n._stump.setMatrixAt(n._stumpIdx, showStump ? _m.compose(_p.set(n.x, n.y - 0.05, n.z), _q.setFromEuler(_e.set(0, n.yaw, 0)), _s) : ZERO);
      n._stump.instanceMatrix.needsUpdate = true;
    }
  }

  // --- queries -------------------------------------------------------------------------------------
  near(x, z, r, fn) {
    const x0 = Math.floor((x - r) / 8), x1 = Math.floor((x + r) / 8), z0 = Math.floor((z - r) / 8), z1 = Math.floor((z + r) / 8);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      const arr = this.hash.get(cx * 4099 + cz);
      if (!arr) continue;
      for (const n of arr) if (Math.hypot(n.x - x, n.z - z) <= r + (n.res ? n.res.radius * n.scale : 0)) fn(n);
    }
  }

  // --- gameplay ------------------------------------------------------------------------------------
  // Apply tool damage to a `kind:'tool'` node. Returns {destroyed}. dir = direction the blow travels (for falling trees).
  damage(n, dmg, dirX, dirZ) {
    if (n.state !== 'alive') return { destroyed: false, hit: false };
    n.hp -= dmg;
    n.shake = 0.6; this.shaking.add(n);
    if (n.hp > 0) return { destroyed: false, hit: true };
    this.remove(n, dirX, dirZ);
    return { destroyed: true, hit: true };
  }

  remove(n, dirX = 1, dirZ = 0) {
    const res = n.res;
    if (n.collider) { this.colliders.remove(n.collider); n.collider = null; }
    if (res && res.fall) {
      n.state = 'felled';
      this.startFall(n, dirX, dirZ);
      // small stump collider
      n.collider = this.colliders.add({ x: n.x, z: n.z, r: 0.3, top: 0.6, base: n.y, tag: 'stump', ref: n });
    } else {
      n.state = 'gone';
    }
    n.respawnAt = res && res.respawn > 0 ? this.time + res.respawn * (0.85 + Math.random() * 0.3) : 0;
    if (n.respawnAt) this.respawning.push(n);
    this.shaking.delete(n);
    this.writeNode(n);
  }

  // hand-harvest node: keep=true plants stay (depleted look), others vanish until respawn
  harvest(n) {
    if (n.state !== 'alive' || n.depleted) return false;
    const res = n.res;
    if (res.keep) {
      if (n._altMesh) { n.depleted = true; this.writeNode(n); }
      else { n.state = 'gone'; this.writeNode(n); }
    } else { n.state = 'gone'; if (n.collider) { this.colliders.remove(n.collider); n.collider = null; } this.writeNode(n); }
    n.respawnAt = this.time + res.respawn * (0.85 + Math.random() * 0.3);
    if (res.respawn > 0) this.respawning.push(n);
    return true;
  }

  markLooted(n) { n.looted = true; }

  // hidden ore veins near (x,z) become visible (used by lightning)
  revealNear(x, z, r) {
    let found = 0;
    for (const n of this.nodes) {
      if (!n.hidden || n.state !== 'gone' || Math.hypot(n.x - x, n.z - z) > r) continue;
      n.hidden = false; n.state = 'alive'; n.hp = n.res.hp; n.grow = 0.1;
      n.collider = this.colliders.add({ x: n.x, z: n.z, r: n.res.radius * n.scale, top: n.res.height * n.scale, base: n.y, tag: 'node', ref: n });
      this.growing.add(n); this.writeNode(n); found++;
    }
    if (found) this.game?.notify?.('Piorun rozłupał skałę i odsłonił rudę!', 'good');
    return found;
  }

  restoreNode(n) {
    n.state = 'alive'; n.depleted = false; n.hp = n.res ? n.res.hp : 1; n.grow = 0.12; n.respawnAt = 0;
    if (n.collider && n.collider.tag === 'stump') { this.colliders.remove(n.collider); n.collider = null; }
    const res = n.res;
    if (res && res.radius > 0 && !n.decor && (res.kind === 'tool' || res.kind === 'loot') && !n.collider) n.collider = this.colliders.add({ x: n.x, z: n.z, r: res.radius * n.scale, top: res.height * n.scale, base: n.y, tag: 'node', ref: n });
    this.growing.add(n); this.writeNode(n);
  }

  startFall(n, dirX, dirZ) {
    const geo = this.nodeGeo(n);
    const def = DEFS[n.type];
    const mesh = new THREE.Mesh(geo, MAT[def.mat]);
    mesh.castShadow = true;
    mesh.position.set(n.x, n.baseY, n.z);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.set(n.tilt[0], n.yaw, n.tilt[1]);
    mesh.scale.set(n.scale, n.scale, n.scale);
    const inst = new THREE.Group();          // pivot at the base, oriented so local +X is the fall direction
    inst.position.set(n.x, n.baseY, n.z);
    const az = Math.atan2(dirX, dirZ);
    inst.rotation.y = az;
    mesh.position.set(0, 0, 0);
    inst.add(mesh);
    this.group.add(inst);
    this.falling.push({ inst, mesh, t: 0, node: n, dur: 1.5, az, done: false, life: 0, landed: false });
  }

  update(dt, camPos) {
    this.time += dt;
    // falling trees: accelerate like a real tree, bounce softly on impact
    for (let i = this.falling.length - 1; i >= 0; i--) {
      const f = this.falling[i];
      f.t += dt;
      const k = clamp(f.t / f.dur, 0, 1);
      let ang;
      if (k < 1) ang = (Math.PI / 2 - 0.12) * (k * k * (0.35 + 0.65 * k));
      else { const b = f.t - f.dur; ang = (Math.PI / 2 - 0.12) - Math.exp(-b * 6) * Math.sin(b * 22) * 0.06 * (b < 0.6 ? 1 : 0); f.landed = true; }
      f.inst.rotation.x = ang;
      if (f.t > f.dur + 9) { f.life += dt; const s = clamp(1 - (f.life) / 1.2, 0, 1); f.inst.scale.setScalar(s); if (s <= 0) { this.group.remove(f.inst); this.falling.splice(i, 1); } }
    }
    for (const n of this.shaking) {
      n.shake -= dt * 1.8;
      if (n.shake <= 0) { n.shake = 0; this.shaking.delete(n); }
      this.writeNode(n);
    }
    for (const n of this.growing) {
      n.grow = Math.min(1, n.grow + dt / 4);
      if (n.grow >= 1) this.growing.delete(n);
      this.writeNode(n);
    }
    // respawn timers
    for (let i = this.respawning.length - 1; i >= 0; i--) {
      const n = this.respawning[i];
      if (this.time >= n.respawnAt) {
        // do not regrow on top of the player
        if (camPos && Math.hypot(n.x - camPos.x, n.z - camPos.z) < 6) continue;
        this.respawning.splice(i, 1); this.restoreNode(n);
      }
    }
    if (camPos) for (const cell of this.cells.values()) { const c = cell.grp.userData.center; cell.grp.visible = Math.hypot(c.x - camPos.x, c.z - camPos.z) < 330 + CELL; }
  }

  // --- save / load -----------------------------------------------------------------------------------
  serialize() {
    const out = { t: this.time, gone: [], looted: [] };
    for (const n of this.nodes) {
      if (n.looted) out.looted.push(n.id);
      if (n.state && n.state !== 'alive' || n.depleted) out.gone.push([n.id, n.state, Math.max(0, (n.respawnAt || 0) - this.time), !!n.depleted]);
    }
    return out;
  }
  restore(data) {
    if (!data) return;
    const lookup = this.byId;
    for (const id of data.looted || []) { const n = lookup.get(id); if (n) n.looted = true; }
    for (const [id, state, remain, depleted] of data.gone || []) {
      const n = lookup.get(id); if (!n || !DEFS[n.type]) continue;
      if (depleted) n.depleted = true;
      if (state === 'felled' || state === 'gone') {
        if (n.collider) { this.colliders.remove(n.collider); n.collider = null; }
        n.state = state;
        if (state === 'felled') n.collider = this.colliders.add({ x: n.x, z: n.z, r: 0.3, top: 0.6, base: n.y, tag: 'stump', ref: n });
      }
      n.respawnAt = this.time + remain;
      if (remain > 0 || state !== 'alive') this.respawning.push(n);
      this.writeNode(n);
    }
  }
}
