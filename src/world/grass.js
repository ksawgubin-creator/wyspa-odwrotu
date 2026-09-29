// Wind-swayed grass tufts scattered around the camera (16 m cells, instanced, created and disposed on demand).
import * as THREE from 'three';
import { BIOME } from './worldgen.js';
import { hash2 } from '../engine/rng.js';
import { foliage } from '../gfx/materials.js';
import { CONFIG } from '../../data/config.js';

const CELL = 16;
const TUFTS = 380;                                // ROBOCZE density (per cell)

function tuftGeometry() {
  // 5 slightly curved blades in a fan; vertex colour dark at the root, bright at the tip
  const pos = [], col = [];
  const cb = new THREE.Color(0x56782c), ct = new THREE.Color(0xb4d068);
  const blades = 5;
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.7, lean = 0.12 + (b % 3) * 0.08, h = 0.34 + (b % 2) * 0.22, w = 0.036;
    const dx = Math.cos(a), dz = Math.sin(a);
    const px = -dz, pz = dx;
    const ox = dx * 0.05, oz = dz * 0.05;
    const pts = [[0, 0, w], [lean * 0.4, h * 0.5, w * 0.7], [lean, h, 0]];
    const v = (i, side) => [ox + dx * pts[i][0] + px * pts[i][2] * side, pts[i][1], oz + dz * pts[i][0] + pz * pts[i][2] * side];
    // every triangle is emitted twice with opposite winding so it is lit from above whichever side the camera sees
    const tri = (A, B, C, tA, tB, tC) => { for (const [p1, p2, p3, t1, t2, t3] of [[A, B, C, tA, tB, tC], [A, C, B, tA, tC, tB]]) { pos.push(...p1, ...p2, ...p3); for (const t of [t1, t2, t3]) { const c = cb.clone().lerp(ct, t); col.push(c.r, c.g, c.b); } } };
    tri(v(0, -1), v(0, 1), v(1, -1), 0, 0, 0.5); tri(v(0, 1), v(1, 1), v(1, -1), 0, 0.5, 0.5); tri(v(1, -1), v(1, 1), v(2, 1), 0.5, 0.5, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < nrm.length; i += 3) { nrm[i] = 0; nrm[i + 1] = 1; nrm[i + 2] = 0; }   // lit from above like the ground beneath
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g;
}

export class Grass {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.group = new THREE.Group(); this.group.name = 'grass'; scene.add(this.group);
    this.geo = tuftGeometry();
    this.mat = foliage(0.14, 0.6, 0.0, [CONFIG.world.grassRadius - 12, CONFIG.world.grassRadius], false); this.mat.side = THREE.FrontSide;
    this.cells = new Map();
    this.enabled = true;
    this.density = 1;
  }
  cellMesh(cx, cz) {
    const w = this.world, seed = w.seed;
    const list = [];
    const target = Math.floor(TUFTS * this.density);
    for (let i = 0; i < target; i++) {
      const x = cx * CELL + hash2(cx * 977 + i, cz * 313, seed + 11) * CELL, z = cz * CELL + hash2(cx * 421 + i, cz * 719, seed + 12) * CELL;
      if (!w.inBounds(x, z, 4)) continue;
      const b = w.getBiome(x, z);
      const h = w.getHeight(x, z);
      if (b === BIOME.WATER || b === BIOME.CAVE || b === BIOME.ROCK && h > 16 || b === BIOME.VOLCANO) continue;
      const sl = w.getSlope(x, z);
      if (sl > 0.85) continue;
      const beachThin = b === BIOME.BEACH ? hash2(i, cx + cz, seed) : 0;
      if (b === BIOME.BEACH && (beachThin > 0.12 || h < 1.3)) continue;
      if (b === BIOME.ROCK && hash2(i * 3, cz, seed) > 0.35) continue;
      list.push([x, h, z, b]);
    }
    if (!list.length) return null;
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ'), c = new THREE.Color();
    list.forEach(([x, h, z, b], i) => {
      const r = hash2(i, cx * 31 + cz, seed + 5), r2 = hash2(i + 9, cz * 17 + cx, seed + 6);
      const s = (b === BIOME.JUNGLE ? 0.85 : 1.0) * (0.75 + r * 0.8);
      e.set((r2 - 0.5) * 0.25, r * 40, (r - 0.5) * 0.25);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, h - 0.03, z), q, new THREE.Vector3(s, s * (0.85 + r2 * 0.5), s));
      mesh.setMatrixAt(i, m);
      const t = 0.75 + r2 * 0.5;
      if (b === BIOME.JUNGLE) c.setRGB(0.55 * t, 0.85 * t, 0.6 * t); else if (b === BIOME.BEACH) c.setRGB(1.25 * t, 1.1 * t, 0.7 * t); else c.setRGB((0.9 + r * 0.25) * t, t, 0.7 * t);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = true; mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
  update(x, z, budget = 4) {
    if (!this.enabled) { this.group.visible = false; return; }
    this.group.visible = true;
    const R = CONFIG.world.grassRadius + 8;
    const cx0 = Math.floor((x - R) / CELL), cx1 = Math.floor((x + R) / CELL), cz0 = Math.floor((z - R) / CELL), cz1 = Math.floor((z + R) / CELL);
    let built = 0;
    const keep = new Set();
    const wanted = [];
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const d = Math.hypot((cx + 0.5) * CELL - x, (cz + 0.5) * CELL - z);
      if (d < R) wanted.push({ cx, cz, d });
    }
    wanted.sort((a, b) => a.d - b.d);
    for (const { cx, cz } of wanted) {
      const k = cx * 4099 + cz; keep.add(k);
      if (this.cells.has(k)) continue;
      if (built >= budget) continue;
      const mesh = this.cellMesh(cx, cz);
      this.cells.set(k, mesh); built++;
      if (mesh) this.group.add(mesh);
    }
    for (const [k, mesh] of this.cells) {
      if (keep.has(k)) continue;
      if (mesh) { this.group.remove(mesh); mesh.dispose(); }
      this.cells.delete(k);
    }
  }
  clear() { for (const [, m] of this.cells) if (m) { this.group.remove(m); m.dispose(); } this.cells.clear(); }
}
