// Chunked heightfield terrain with LOD, skirts and baked vertex colours (biome / height / slope / noise).
import * as THREE from 'three';
import { WORLD, BIOME } from './worldgen.js';
import { Noise2D } from '../engine/noise.js';
import { smoothstep, clamp } from '../engine/util.js';
import { hash2 } from '../engine/rng.js';
import { mats } from '../gfx/materials.js';

export const CHUNK = 32;
const NC = WORLD.size / CHUNK;               // chunks per side
const c3 = (h) => new THREE.Color(h);
const PAL = {
  sandDry: c3(0xe8d59c), sandWet: c3(0xb9a271), seabed: c3(0x8a8060), deep: c3(0x203a55),
  meadowA: c3(0x86b445), meadowB: c3(0x6a9a3a), meadowC: c3(0xa4c052),
  jungleA: c3(0x3c7a38), jungleB: c3(0x2b6234), jungleSoil: c3(0x54402c),
  rockA: c3(0x8a857c), rockB: c3(0x6c675f), rockHi: c3(0xb0aba0), cliff: c3(0x77726a),
  ashA: c3(0x3d3537), ashB: c3(0x574745), rust: c3(0x7d3f24), obs: c3(0x1e1a22),
};

export class Terrain {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    scene.add(this.group);
    this.chunks = new Map();                  // key -> {mesh, lod}
    this.colorMap = this.buildColorMap();
    this.buildQueue = [];
  }

  // Pre-blurred RGB map so biome borders are soft.
  buildColorMap() {
    const w = this.world, n = w.n, half = WORLD.half;
    const nA = new Noise2D(w.seed + 55), nB = new Noise2D(w.seed + 66);
    const map = new Float32Array(n * n * 3);
    const c = new THREE.Color();
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix, x = ix - half, z = iz - half, h = w.heights[i], b = w.biomes[i];
        const a = nA.fbm(x * 0.045, z * 0.045, 2) * 0.5 + 0.5, bb = nB.noise(x * 0.21, z * 0.21) * 0.5 + 0.5;
        switch (b) {
          case BIOME.WATER: {
            const d = clamp(-h / 7, 0, 1);
            c.copy(PAL.sandWet).lerp(PAL.seabed, smoothstep(0, 0.35, d)).lerp(PAL.deep, smoothstep(0.3, 1, d));
            if (w.lake[i]) c.lerp(c3(0x3f5a3a), 0.45);
            break;
          }
          case BIOME.BEACH:
            c.copy(PAL.sandDry).lerp(PAL.sandWet, smoothstep(0.9, 0.0, h)).lerp(c3(0xd6c088), a * 0.45);
            if (bb > 0.75) c.lerp(c3(0xa8987a), 0.25);
            break;
          case BIOME.MEADOW:
            c.copy(PAL.meadowB).lerp(PAL.meadowA, a).lerp(PAL.meadowC, smoothstep(0.62, 0.9, bb) * 0.55);
            if (h < 2.4) c.lerp(PAL.sandDry, smoothstep(2.4, 1.6, h) * 0.6);
            break;
          case BIOME.JUNGLE:
            c.copy(PAL.jungleB).lerp(PAL.jungleA, a).lerp(PAL.jungleSoil, smoothstep(0.55, 0.85, bb) * 0.6);
            break;
          case BIOME.ROCK:
            c.copy(PAL.rockB).lerp(PAL.rockA, a).lerp(PAL.rockHi, smoothstep(18, 40, h) * 0.6);
            if (bb > 0.7) c.lerp(PAL.meadowB, 0.22);
            break;
          case BIOME.VOLCANO:
            c.copy(PAL.ashA).lerp(PAL.ashB, a).lerp(PAL.rust, smoothstep(24, 38, h) * (0.3 + 0.5 * bb));
            if (bb > 0.86) c.lerp(PAL.obs, 0.6);
            break;
        }
        map[i * 3] = c.r; map[i * 3 + 1] = c.g; map[i * 3 + 2] = c.b;
      }
    }
    // two cheap box-blur passes (3x3)
    const tmp = new Float32Array(map.length);
    for (let pass = 0; pass < 2; pass++) {
      for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
        let r = 0, g = 0, b = 0, cnt = 0;
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
          const x = ix + dx, z = iz + dz;
          if (x < 0 || z < 0 || x >= n || z >= n) continue;
          const k = (z * n + x) * 3; r += map[k]; g += map[k + 1]; b += map[k + 2]; cnt++;
        }
        const k = (iz * n + ix) * 3; tmp[k] = r / cnt; tmp[k + 1] = g / cnt; tmp[k + 2] = b / cnt;
      }
      map.set(tmp);
    }
    return map;
  }

  chunkKey(cx, cz) { return cx * 64 + cz; }

  lodFor(dist) { return dist < 110 ? 0 : dist < 210 ? 1 : 2; }

  buildChunk(cx, cz, lod) {
    const w = this.world, n = w.n, half = WORLD.half;
    const step = 1 << lod, segs = CHUNK / step;
    const ix0 = cx * CHUNK, iz0 = cz * CHUNK;                // texel index of chunk origin
    const V = segs + 1;
    const pos = [], colr = [];
    const H = (ix, iz) => w.heights[Math.min(n - 1, iz) * n + Math.min(n - 1, ix)];
    const C = (ix, iz, out) => { const k = (Math.min(n - 1, iz) * n + Math.min(n - 1, ix)) * 3; out.r = this.colorMap[k]; out.g = this.colorMap[k + 1]; out.b = this.colorMap[k + 2]; };
    const tmp = { r: 0, g: 0, b: 0 };
    const cache = new Array(V * V);
    for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
      const ix = ix0 + i * step, iz = iz0 + j * step;
      C(ix, iz, tmp);
      // slope-based cliff tint
      const hL = H(ix - step, iz), hR = H(ix + step, iz), hU = H(ix, iz - step), hD = H(ix, iz + step);
      const sl = Math.hypot(hR - hL, hD - hU) / (2 * step);
      const cl = smoothstep(0.7, 1.25, sl) * 0.85;
      const rr = tmp.r + (PAL.cliff.r - tmp.r) * cl, gg = tmp.g + (PAL.cliff.g - tmp.g) * cl, bb = tmp.b + (PAL.cliff.b - tmp.b) * cl;
      cache[j * V + i] = { x: ix - half, y: H(ix, iz), z: iz - half, r: rr, g: gg, b: bb, ix, iz };
    }
    const push = (v, k) => { pos.push(v.x, v.y, v.z); colr.push(v.r * k, v.g * k, v.b * k); };
    for (let j = 0; j < segs; j++) for (let i = 0; i < segs; i++) {
      const a = cache[j * V + i], b = cache[j * V + i + 1], c = cache[(j + 1) * V + i], d = cache[(j + 1) * V + i + 1];
      const fv = (s) => 1 + (hash2(a.ix * 3 + s, a.iz * 7 + s, w.seed) - 0.5) * 0.085;   // per-face variation
      // winding: counter-clockwise seen from above (+Y)
      if (((((a.ix / step) | 0) + ((a.iz / step) | 0)) & 1) === 0) {
        push(a, fv(1)); push(c, fv(1)); push(d, fv(1));
        push(a, fv(2)); push(d, fv(2)); push(b, fv(2));
      } else {
        push(a, fv(1)); push(c, fv(1)); push(b, fv(1));
        push(b, fv(2)); push(c, fv(2)); push(d, fv(2));
      }
    }
    // skirts hide LOD cracks
    const skirt = 2.5 + lod * 2;
    const edge = (list) => {
      for (let k = 0; k < list.length - 1; k++) {
        const a = list[k], b = list[k + 1];
        const a2 = { ...a, y: a.y - skirt }, b2 = { ...b, y: b.y - skirt };
        push(a, 0.8); push(b, 0.8); push(a2, 0.6);
        push(b, 0.8); push(b2, 0.6); push(a2, 0.6);
        push(a, 0.8); push(a2, 0.6); push(b, 0.8);
        push(b, 0.8); push(a2, 0.6); push(b2, 0.6);
      }
    };
    const row = (j) => Array.from({ length: V }, (_, i) => cache[j * V + i]);
    const colm = (i) => Array.from({ length: V }, (_, j) => cache[j * V + i]);
    edge(row(0)); edge(row(V - 1)); edge(colm(0)); edge(colm(V - 1));

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    g.computeVertexNormals();
    // blend flat normals with smooth heightfield normals for a soft-faceted look
    const nrm = g.getAttribute('normal');
    const p = g.getAttribute('position');
    const tn = { x: 0, y: 1, z: 0 };
    for (let i = 0; i < nrm.count; i++) {
      w.getNormal(p.getX(i), p.getZ(i), tn);
      const fx = nrm.getX(i), fy = nrm.getY(i), fz = nrm.getZ(i);
      // skirt faces keep their own normal
      const mx = fx * 0.55 + tn.x * 0.45, my = fy * 0.55 + tn.y * 0.45, mz = fz * 0.55 + tn.z * 0.45;
      const l = Math.hypot(mx, my, mz) || 1;
      nrm.setXYZ(i, mx / l, my / l, mz / l);
    }
    g.computeBoundingSphere(); g.computeBoundingBox();
    const mesh = new THREE.Mesh(g, mats.terrain);
    mesh.receiveShadow = true;
    mesh.castShadow = lod === 0;
    mesh.matrixAutoUpdate = false;
    return mesh;
  }

  // Ensure the right chunks/LODs exist around (x,z). `budget` limits chunk builds per call (Infinity = build everything).
  update(x, z, budget = 3) {
    const range = 330;
    let built = 0;
    const want = [];
    const cx0 = Math.max(0, Math.floor((x + WORLD.half - range) / CHUNK)), cx1 = Math.min(NC - 1, Math.floor((x + WORLD.half + range) / CHUNK));
    const cz0 = Math.max(0, Math.floor((z + WORLD.half - range) / CHUNK)), cz1 = Math.min(NC - 1, Math.floor((z + WORLD.half + range) / CHUNK));
    for (let cz = cz0; cz <= cz1; cz++) for (let cx = cx0; cx <= cx1; cx++) {
      const mx = cx * CHUNK - WORLD.half + CHUNK / 2, mz = cz * CHUNK - WORLD.half + CHUNK / 2;
      const d = Math.hypot(mx - x, mz - z);
      if (d > range) continue;
      want.push({ cx, cz, d, lod: this.lodFor(d) });
    }
    want.sort((a, b) => a.d - b.d);
    const keep = new Set();
    for (const c of want) {
      const k = this.chunkKey(c.cx, c.cz);
      keep.add(k);
      const cur = this.chunks.get(k);
      if (cur && cur.lod === c.lod) continue;
      if (cur && Math.abs(cur.lod - c.lod) < 1) continue;
      if (built >= budget) continue;
      // skip chunks that are entirely deep water
      const ix = c.cx * CHUNK + CHUNK / 2, iz = c.cz * CHUNK + CHUNK / 2;
      const w = this.world;
      let maxH = -1e9;
      for (let j = 0; j <= CHUNK; j += 8) for (let i = 0; i <= CHUNK; i += 8) maxH = Math.max(maxH, w.heights[Math.min(w.n - 1, c.cz * CHUNK + j) * w.n + Math.min(w.n - 1, c.cx * CHUNK + i)]);
      if (maxH < -6.5) { this.chunks.set(k, { mesh: null, lod: c.lod }); continue; }
      const mesh = this.buildChunk(c.cx, c.cz, c.lod);
      if (cur && cur.mesh) { this.group.remove(cur.mesh); cur.mesh.geometry.dispose(); }
      this.group.add(mesh);
      this.chunks.set(k, { mesh, lod: c.lod });
      built++;
    }
    for (const [k, v] of this.chunks) {
      if (!keep.has(k)) { if (v.mesh) { this.group.remove(v.mesh); v.mesh.geometry.dispose(); } this.chunks.delete(k); }
    }
    return built;
  }
}
