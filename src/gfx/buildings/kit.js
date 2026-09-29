// Building kit: hand-built, slightly crooked primitives used by src/gfx/buildings.js.
// Conventions
//  * Units are metres. Local origin = footprint centre ON the ground (y = 0), +Z = front (door side), +Y up.
//  * Every primitive returns a non-indexed BufferGeometry with position/normal/color (vertex colours only), so
//    everything can be merged with meshkit.merge(). Primitives are placed in world-local space directly.
//  * Nothing here is random by itself: all variation comes from explicit seeds, so models are deterministic.
//  * makeDmg(seed, level) gives DETERMINISTIC per-piece fates: a piece removed at damage k is removed at k+1.
import * as THREE from 'three';
import { blob, merge, xf, finish, col, rng } from '../meshkit.js';

export { blob, merge, xf, finish, col, rng };
export const TAU = Math.PI * 2;
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const toV = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(p[0], p[1], p[2]));
const _c = new THREE.Color();

// ---- hashing / randomness ----------------------------------------------------------------------
export function hash3(x, y, z, seed) {
  let h = (Math.imul((x * 997) | 0, 374761393) + Math.imul((y * 997) | 0, 668265263) + Math.imul((z * 997) | 0, 1274126177) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function frand(seed, i, k = 0) { const r = rng((seed | 0) * 7919 + (i | 0) * 104729 + k * 15485863 + 12345); r(); return r(); }
export const pick = (arr, t) => arr[Math.min(arr.length - 1, Math.floor(t * arr.length))];
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---- palette (muted, weathered) ------------------------------------------------------------------
export const PAL = {
  log: [0x8a6a4a, 0x7f6244, 0x9a7a56, 0x9a866a, 0x846648, 0x8f7050],
  wood: [0x6f4f36, 0x7b5a3d, 0x62452f, 0x86664a, 0x5a4230, 0x76573a],
  bark: [0x5e4632, 0x6a4e37, 0x53402f, 0x715339, 0x655039],
  grey: [0x8a8478, 0x9b9486, 0x7c766a, 0xa39c8c, 0x736d63],       // silvered old planks
  cut: 0xc9a97a, cutOld: 0xb59a72,
  thatch: [0xb8a057, 0xa48c48, 0x93803f, 0xc4ac62, 0x8a7440, 0xaa9350],
  leaf: [0x4f7a34, 0x5f8a3a, 0x3f6a2e, 0x718f3e, 0x8a9a45],
  dryLeaf: [0x8a8a3c, 0x9a8a3e, 0x7a6a34],
  stone: [0x9d978a, 0x88837a, 0xaaa393, 0x77746c, 0x94908a, 0xb3ab98],
  basalt: [0x3b3b41, 0x2d2d33, 0x46464e, 0x34343a, 0x50505a],
  lime: 0xbfb69f, clay: 0x9c6c4c, soil: 0x4a3a2a, soilDark: 0x2e241b, ash: 0x5a564f, ashLight: 0x8a857b, char: 0x24201d,
  rope: 0xb59a68, ropeDark: 0x8a7248, iron: 0x4c4f54, ironLight: 0x6a6e75, rust: 0x7a4a2c,
  hide: [0x8a6a4a, 0x9a7a55, 0x6f5238], straw: [0xcfb96a, 0xbfa85a, 0xd8c47a],
};
export const shade = (hex, f) => { const c = new THREE.Color(hex); c.r = clamp(c.r * f, 0, 1); c.g = clamp(c.g * f, 0, 1); c.b = clamp(c.b * f, 0, 1); return c; };
export const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

// ---- painting helper --------------------------------------------------------------------------------
// colour(x,y,z,fr) -> Color|hex ; fr = per-triangle random (0..1). faceVar = brightness variation per triangle.
export function paintTris(g, colorFn, faceVar = 0.08, seed = 5) {
  const p = g.getAttribute('position');
  let cols = g.getAttribute('color');
  if (!cols) { cols = new THREE.BufferAttribute(new Float32Array(p.count * 3), 3); g.setAttribute('color', cols); }
  for (let i = 0; i < p.count; i += 3) {
    const cx = p.getX(i) + p.getX(i + 1) + p.getX(i + 2), cy = p.getY(i) + p.getY(i + 1) + p.getY(i + 2), cz = p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2);
    const fr = hash3(cx, cy, cz, seed);
    const v = 1 + (fr - 0.5) * 2 * faceVar;
    for (let k = 0; k < 3; k++) {
      const r = colorFn(p.getX(i + k), p.getY(i + k), p.getZ(i + k), fr, i + k);
      if (r && r.isColor) _c.copy(r); else _c.set(r);
      cols.setXYZ(i + k, _c.r * v, _c.g * v, _c.b * v);
    }
  }
  return g;
}

function nonIdx(g) { const o = g.index ? g.toNonIndexed() : g; o.deleteAttribute('uv'); o.deleteAttribute('normal'); return o; }

const _m4 = new THREE.Matrix4();
// Maps the geometry's +Y axis onto direction a->b, origin at a. `up` orients the local Z/X (for flat beams).
export function orient(g, a, b, up) {
  const A = toV(a), B = toV(b), d = B.sub(A).normalize();
  let u = up ? toV(up) : V3(0, 1, 0);
  if (Math.abs(u.dot(d)) > 0.94) u = Math.abs(d.z) < 0.9 ? V3(0, 0, 1) : V3(1, 0, 0);
  const x = d.clone().cross(u).normalize();
  const z = x.clone().cross(d).normalize();
  _m4.makeBasis(x, d, z).setPosition(A);
  g.applyMatrix4(_m4);
  return g;
}

// ---- primitives ---------------------------------------------------------------------------------------
// Log with closed, pale, cut ends (rings), bark streaks, wobble. from a to b, radius r at a, rt at b.
export function log({ a, b, r = 0.15, rt = null, segs = 6, rows = 2, seed = 1, bark = 0x6b4a33, bark2 = null, cap = 0xc9a97a, caps = 3, wobble = 0.02, jit = 0.09, faceVar = 0.1, bend = 0 }) {
  const A = toV(a), B = toV(b), len = A.distanceTo(B);
  rt = rt ?? r;
  let g = new THREE.CylinderGeometry(rt, r, len, segs, rows, false);
  g.translate(0, len / 2, 0);
  g = nonIdx(g);
  const torso = segs * rows * 2, pos = g.getAttribute('position');
  // drop unwanted caps (top cap = triangles [torso, torso+segs), bottom = [torso+segs, torso+2segs))
  const keep = [];
  for (let t = 0; t < pos.count / 3; t++) {
    if (t >= torso + segs && !(caps & 1)) continue; // bottom cap == end a
    if (t >= torso && t < torso + segs && !(caps & 2)) continue;
    keep.push(t);
  }
  const np = new Float32Array(keep.length * 9), kind = [];
  keep.forEach((t, j) => { for (let k = 0; k < 9; k++) np[j * 9 + k] = pos.array[t * 9 + k]; kind.push(t < torso ? 0 : (t < torso + segs ? 2 : 1)); });
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(np, 3));
  const p = g.getAttribute('position');
  const cb = new THREE.Color(bark), ct = new THREE.Color(bark2 ?? bark), cc = new THREE.Color(cap);
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = y / len, w = 1 + (hash3(x, y, z, seed) - 0.5) * 2 * jit;
    const off = Math.sin(t * Math.PI) * bend;
    p.setXYZ(i, x * w + Math.sin(y * 2.3 + seed * 1.7) * wobble + off, y, z * w + Math.cos(y * 1.9 + seed) * wobble);
  }
  for (let i = 0; i < p.count; i += 3) {
    const tri = i / 3;
    const cxx = p.getX(i) + p.getX(i + 1) + p.getX(i + 2), cyy = p.getY(i) + p.getY(i + 1) + p.getY(i + 2), czz = p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2);
    const fr = hash3(cxx, cyy, czz, seed + 3), v = 1 + (fr - 0.5) * 2 * faceVar;
    for (let k = 0; k < 3; k++) {
      const y = p.getY(i + k);
      if (kind[tri] === 0) _c.copy(cb).lerp(ct, clamp(y / len)); else { _c.copy(cc); const rr = Math.hypot(p.getX(i + k), p.getZ(i + k)) / r; _c.multiplyScalar(0.8 + 0.2 * clamp(rr, 0, 1)); }
      cols[(i + k) * 3] = _c.r * v; cols[(i + k) * 3 + 1] = _c.g * v; cols[(i + k) * 3 + 2] = _c.b * v;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  orient(g, A, B);
  return finish(g);
}

// Crooked sawn/split plank or beam: a box from a to b (w across, t thick), corners jittered, tapered, optional bow.
export function beam({ a, b, w = 0.2, t = 0.1, taper = 1, up, jit = 0.08, seed = 1, color = 0x7a5a3c, color2 = null, faceVar = 0.08, bow = 0, segs = 1, sagY = 0, endCol = null, wave = null }) {
  const A = toV(a), B = toV(b), len = A.distanceTo(B);
  let g = nonIdx(new THREE.BoxGeometry(1, 1, 1, 1, segs, 1));
  g.translate(0, 0.5, 0);
  const p = g.getAttribute('position'), m = Math.min(w, t), c1 = new THREE.Color(color), c2 = new THREE.Color(color2 ?? color);
  const ec = endCol != null ? new THREE.Color(endCol) : null;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ts = 1 + (taper - 1) * y, jx = (hash3(x, y, z, seed) - 0.5) * 2 * jit * m, jy = (hash3(x, y, z, seed + 7) - 0.5) * 2 * jit * m, jz = (hash3(x, y, z, seed + 13) - 0.5) * 2 * jit * m;
    const bo = Math.sin(y * Math.PI) * bow;
    const wv = wave ? wave[0] * Math.sin(y * len * wave[1]) : 0;
    p.setXYZ(i, x * w * ts + jx + bo, y * len + jy * 0.8 + Math.sin(y * Math.PI) * sagY, z * t * ts + jz + bo * 0.5 + wv);
  }
  paintTris(g, (x, y, z, fr, i) => {
    const yy = p.getY(i) / len;
    if (ec && (yy < 0.02 || yy > 0.98)) return ec;
    return _c.copy(c1).lerp(c2, clamp(yy)).clone();
  }, faceVar, seed);
  orient(g, A, B, up);
  return finish(g);
}

// Irregular stone: jittered hexahedron (or icosahedron when round). p = centre, s = full size [x,y,z].
export function stone({ p = [0, 0, 0], s = [0.5, 0.3, 0.4], seed = 1, color = 0x9a958a, jit = 0.16, rot, round = false, faceVar = 0.09, bevel = 0.14, moss = 0, drop = 0 }) {
  let g;
  if (round) { g = new THREE.IcosahedronGeometry(0.5, 0); g = nonIdx(g); } else { g = nonIdx(new THREE.BoxGeometry(1, 1, 1)); }
  const pp = g.getAttribute('position');
  for (let i = 0; i < pp.count; i++) {
    let x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i);
    if (!round && y > 0.1) { x *= 1 - bevel; z *= 1 - bevel * 1.2; }
    else if (!round) { x *= 1 - bevel * 0.4; z *= 1 - bevel * 0.4; }
    const j = round ? jit * 1.3 : jit;
    pp.setXYZ(i, x + (hash3(x, y, z, seed) - 0.5) * 2 * j, y + (hash3(x, y, z, seed + 7) - 0.5) * 2 * j * 0.8, z + (hash3(x, y, z, seed + 13) - 0.5) * 2 * j);
  }
  const c = new THREE.Color(color), mo = new THREE.Color(0x56703a);
  paintTris(g, (x, y) => {
    _c.copy(c).multiplyScalar(0.86 + 0.24 * clamp(y + 0.5));
    if (moss > 0) _c.lerp(mo, moss * (1 - clamp(y + 0.5)) * 0.8);
    return _c.clone();
  }, faceVar, seed);
  xf(g, { pos: p, rot, scale: s });
  if (drop) g.translate(0, -drop, 0);
  return finish(g);
}

// Boulder-ish blob (uses meshkit blob) with vertical shading.
export function pebble({ p, r = 0.15, seed = 1, color = 0x8a857a, squash = [1.2, 0.7, 1], jit = 0.25, detail = 0 }) {
  return blob({ r, detail, jit, seed, squash, pos: p, color: (x, y) => shade(color, 0.85 + 0.25 * clamp((y - p[1]) / (r * squash[1]) * 0.5 + 0.5)), faceVar: 0.1 });
}

// Quad slab from 4 top corners (p00,p10,p11,p01, counter-clockwise seen from +N), extruded opposite N.
export function slab({ p, thick = 0.1, N, seed = 1, color = 0x7a6a3a, color2 = null, jit = 0.02, faceVar = 0.06, sides = true }) {
  const P = p.map(toV), n = toV(N).normalize();
  const v = [];
  for (let i = 0; i < 4; i++) v.push(P[i].clone());
  for (let i = 0; i < 4; i++) v.push(P[i].clone().addScaledVector(n, -thick * (0.8 + hash3(P[i].x, P[i].y, P[i].z, seed) * 0.4)));
  const idx = [[0, 1, 2], [0, 2, 3], [4, 6, 5], [4, 7, 6], [0, 4, 5], [0, 5, 1], [1, 5, 6], [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 4], [3, 4, 0]];
  const arr = [];
  for (const t of (sides ? idx : idx.slice(0, 4))) {
    const a = v[t[0]], b = v[t[1]], c = v[t[2]];
    const nn = b.clone().sub(a).cross(c.clone().sub(a));
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const mid = v.reduce((s, q) => s.add(q), V3()).multiplyScalar(1 / 8);
    const flip = nn.dot(cen.sub(mid)) < 0;
    const o = flip ? [a, c, b] : [a, b, c];
    o.forEach((q) => arr.push(q.x, q.y, q.z));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const c1 = new THREE.Color(color), c2 = new THREE.Color(color2 ?? color);
  paintTris(g, (x, y, z, fr) => c1.clone().lerp(c2, fr), faceVar, seed);
  return finish(g);
}

// A short cylinder band (rope lashing) around an axis at centre c with the axis direction d.
export function band({ c, d = [0, 1, 0], r = 0.16, h = 0.07, color = 0xb59a68, seed = 1, segs = 5 }) {
  const C = toV(c), D = toV(d).normalize();
  let g = nonIdx(new THREE.CylinderGeometry(r, r, h, segs, 1, false));
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), w = 1 + (hash3(x, y, z, seed) - 0.5) * 0.12; p.setXYZ(i, x * w, y + (hash3(x, y, z, seed + 5) - 0.5) * 0.02, z * w); }
  paintTris(g, () => color, 0.12, seed);
  g.translate(0, h / 2, 0);
  const a = C.clone().addScaledVector(D, -h / 2), b = C.clone().addScaledVector(D, h / 2);
  orient(g, a, b);
  return finish(g);
}

// Thin rope run through a list of points (zig-zag lashings).
export function rope(points, { w = 0.035, color = 0xb59a68, seed = 1, up } = {}) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) out.push(beam({ a: points[i], b: points[i + 1], w, t: w * 0.9, jit: 0.15, seed: seed + i, color, color2: shade(color, 0.85), faceVar: 0.1, up }));
  return out;
}

// Light "earth" anchor reaching below ground: dark soil lump (hidden when terrain is flat).
export function anchor({ x = 0, z = 0, hw = 0.5, hd = 0.5, top = 0.1, bottom = -1, color = 0x3a2e22, seed = 1 }) {
  top = Math.min(top, -0.04);   // never coplanar with / above the ground: invisible on flat terrain, filler on slopes
  return stone({ p: [x, (top + bottom) / 2, z], s: [hw * 2, top - bottom, hd * 2], seed, color, jit: 0.1, bevel: 0.25, faceVar: 0.08 });
}

// Ragged thatch / leaf / tile cover for a sloped surface. O = eave start, U = eave vector, V = up-slope vector.
// `out` (optional) = hint for the outward normal (U is flipped if needed). The surface is a grid (nu x nv) of thin slabs
// (so holes can open), each covered by rows of drooping tufts (style 'thatch': pointed straw, 'tile': slate/shingle quads).
// warp(u,v) -> offset along the normal (sag / lumps).
export function roofSlope({ O, U, V, out, nu = 4, nv = 3, rows = 3, tw = 0.42, drop = 0.4, thick = 0.09, seed = 1, D, idBase = 0, colors = PAL.thatch, baseColor = 0x8f7a48, droop = 0.05, holeBias = 1, ragged = 0.35, style = 'thatch', warp = null, skipCells = null }) {
  let Ov = toV(O), Uv = toV(U);
  const Vv = toV(V);
  if (out && Uv.clone().cross(Vv).dot(toV(out)) < 0) { Ov = Ov.clone().add(Uv); Uv = Uv.clone().multiplyScalar(-1); }
  const N = Uv.clone().cross(Vv).normalize(), Vh = Vv.clone().normalize(), Uh = Uv.clone().normalize(), ulen = Uv.length(), vlen = Vv.length();
  const P = (u, v) => { const q = Ov.clone().addScaledVector(Uv, u).addScaledVector(Vv, v); if (warp) q.addScaledVector(N, warp(u, v)); return q; };
  const parts = [], tri = [], triC = [];
  const pushTri = (a, b, c, ca, cb, cc) => {
    const nn = b.clone().sub(a).cross(c.clone().sub(a));
    if (nn.dot(N) < 0) { [b, c] = [c, b]; [cb, cc] = [cc, cb]; }
    for (const [q, cq] of [[a, ca], [b, cb], [c, cc]]) { tri.push(q.x, q.y, q.z); triC.push(cq.r, cq.g, cq.b); }
  };
  const cols = colors.map((c) => new THREE.Color(c));
  for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
    const id = idBase + iu * nv + iv;
    if (skipCells && skipCells(iu, iv)) continue;
    if (D && D.gone(id, holeBias * (0.7 + 0.6 * iv / nv))) continue;
    const u0 = iu / nu, u1 = (iu + 1) / nu, v0 = iv / nv, v1 = (iv + 1) / nv;
    parts.push(slab({ p: [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], thick, N, seed: seed + id, color: baseColor, color2: shade(baseColor, 0.8), faceVar: 0.08, sides: false }));
    for (let r = 0; r < rows; r++) {
      const vt = lerp(v0, v1, (r + 1) / rows) + (frand(seed, id * 13 + r, 60) - 0.5) * (v1 - v0) / rows * 0.4, off = (r % 2) * 0.5;
      const cw = tw / ulen, lift = 0.018 * (r + 1);
      if (style === 'tile') {
        const n = Math.max(1, Math.round((u1 - u0) / cw));
        for (let k = 0; k < n + 1; k++) {
          const key = id * 31 + r * 7 + k;
          const uc = u0 + ((k + off) / n) * (u1 - u0) + (frand(seed, key, 1) - 0.5) * cw * 0.4;
          if (uc < u0 - cw * 0.3 || uc > u1 + cw * 0.3) continue;
          const wu = cw * (0.6 + frand(seed, key, 2) * 0.5) * 0.5;
          const tl = P(uc - wu, vt), tr = P(uc + wu, vt);
          tl.addScaledVector(N, thick * 0.4 + lift); tr.addScaledVector(N, thick * 0.4 + lift);
          const c0 = cols[Math.floor(frand(seed, key, 7) * cols.length)], top = shade(c0.getHex(), 0.72), tip = shade(c0.getHex(), 1.0 + 0.1 * frand(seed, key, 8));
          const sx = (frand(seed, key, 5) - 0.5) * 0.22;
          const dl = drop * (0.85 + 0.15 * frand(seed, key, 3)), dr = drop * (0.85 + 0.15 * frand(seed, key, 4));
          const bl = tl.clone().addScaledVector(Vh, -dl).addScaledVector(N, droop * dl + 0.02).addScaledVector(Uh, sx), br = tr.clone().addScaledVector(Vh, -dr).addScaledVector(N, droop * dr + 0.02).addScaledVector(Uh, sx);
          pushTri(tl, tr, br, top, top, tip); pushTri(tl, br, bl, top, tip, tip);
        }
      } else {
        // thatch: irregular pointed straw bundles, alternating rows staggered, low-frequency colour patches
        let u = u0 + off * cw * frand(seed, id * 17 + r, 61) - cw * 0.3, k = 0;
        while (u < u1) {
          const key = id * 131 + r * 17 + k++;
          const w = cw * (0.6 + frand(seed, key, 2) * 1.0), uc = u + w / 2;
          u += w * 0.88;
          if (uc < u0 - cw * 0.2 || uc > u1 + cw * 0.2) continue;
          const tl = P(uc - w / 2, vt), tr = P(uc + w / 2, vt);
          tl.addScaledVector(N, thick * 0.4 + lift); tr.addScaledVector(N, thick * 0.4 + lift);
          const dd = drop * (1 - ragged * frand(seed, key, 3)), sx = (frand(seed, key, 5) - 0.5) * w * 1.1 * ulen / ulen;
          const tip = tl.clone().add(tr).multiplyScalar(0.5).addScaledVector(Vh, -dd).addScaledVector(N, droop * dd + 0.04).addScaledVector(Uh, sx * ulen);
          const c0 = cols[Math.floor(frand(seed, key, 7) * cols.length)];
          const patch = 0.82 + 0.34 * frand(seed, Math.floor(uc * ulen / 0.9) * 97 + Math.floor((vt) * vlen / 0.8) + id * 3, 62);
          const tt = shade(c0.getHex(), 0.7 * patch), tp = shade(c0.getHex(), (1.02 + 0.2 * frand(seed, key, 9)) * patch);
          pushTri(tl, tr, tip, tt, tt, tp);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  if (tri.length) { g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(triC, 3)); parts.push(finish(g)); }
  return parts;
}

// Interval helpers for walls with openings (doors, windows, damage holes): segs [[a,b]] minus holes [[a,b]].
export function subtract(segs, holes, minW = 0.2) {
  let cur = segs;
  for (const [ha, hb] of holes) {
    const nx = [];
    for (const [a, b] of cur) {
      if (hb <= a || ha >= b) { nx.push([a, b]); continue; }
      if (ha > a) nx.push([a, ha]);
      if (hb < b) nx.push([hb, b]);
    }
    cur = nx;
  }
  return cur.filter(([a, b]) => b - a >= minW);
}

// Rotate geometries about a pivot [x,y,z] by Euler rot [rx,ry,rz] (order YXZ, like xf).
export function rotAbout(list, pivot, rot) {
  for (const g of list) { xf(g, { pos: [-pivot[0], -pivot[1], -pivot[2]] }); xf(g, { rot }); xf(g, { pos: pivot }); }
  return list;
}

// Lean every geometry above y=0 by (sx, sz) per metre of height (whole-structure tilt for damaged buildings).
export function shear(list, sx, sz) {
  for (const g of list) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const y = Math.max(0, p.getY(i)); p.setXYZ(i, p.getX(i) + y * sx, p.getY(i), p.getZ(i) + y * sz); }
  }
  return list;
}

// Damage openings for a straight wall (wall-local x along the wall, y up). Nested: larger at higher level.
// Level 1 crown chips, level 2 holes + crown collapse, level 3 large holes + deep collapse.
export function wearOpenings({ seed, level, len, H, holes = 1, holeW = 0.6, holeH = 0.7, crown = 1, steps = 4 }) {
  const out = [];
  if (level < 1) return out;
  const amp = [0, 0.28, 0.85, 1.7][level] * crown;
  for (let i = 0; i < steps; i++) {
    const xa = -len / 2 + (i / steps) * len, xb = xa + len / steps, dep = amp * frand(seed, i, 310) * (level === 1 && frand(seed, i, 311) < 0.5 ? 0 : 1);
    if (dep > 0.12) out.push([xa - 0.01, xb + 0.01, H - dep, H + 2]);
  }
  if (level >= 2) for (let h = 0; h < holes; h++) {
    const cx = (frand(seed, h, 320) - 0.5) * len * 0.66, cy = 0.55 + frand(seed, h, 321) * (H * 0.4), s = level === 2 ? 0.55 : 1.0;
    out.push([cx - holeW * s / 2, cx + holeW * s / 2, cy - holeH * s / 2, cy + holeH * s / 2]);
  }
  return out;
}

// Irregular masonry wall in wall-local coords: x along the wall (-len/2..len/2), z thickness (centred), y from y0 (buried) to H.
// Courses of stones of varied size, staggered, with a recessed mortar core. `openings` = [[x0,x1,y0,y1]] rects left empty.
export function masonry({ len, H, d = 0.5, y0 = -1, seed = 1, openings = [], colors = PAL.stone, minW = 0.55, maxW = 1.15, minH = 0.42, maxH = 0.66, D, idBase = 0, firstTop = 0.34, moss = 0.35, core = false, sc = 0.965, cap = false, flatTop = true, stagger = 0, dark = 1, splitP = 0.42 }) {
  const parts = [], rows = [];
  let y = y0, rr = 0;
  rows.push([y0, firstTop + frand(seed, 0, 400) * 0.12]); y = rows[0][1];
  const capH = cap ? 0.2 : 0;
  while (y < H - capH - 0.25) {
    const h = minH + frand(seed, rr + 1, 401) * (maxH - minH);
    let yb = y + h; if (yb > H - capH - 0.2) yb = H - capH;
    rows.push([y, yb]); y = yb; rr++;
  }
  rows.forEach(([ya, yb], ri) => {
    // cell boundaries
    const cells = []; let x = -len / 2 + (ri % 2 ? stagger : 0);
    let first = -len / 2;
    while (x < len / 2 - 0.01) {
      const w = minW + frand(seed, ri * 50 + cells.length, 402) * (maxW - minW);
      const a = Math.max(first, x), b = Math.min(len / 2, x + w);
      if (b - a > 0.05) cells.push([a, b]);
      x = b;
      if (len / 2 - x < minW * 0.6 && x < len / 2) { if (cells.length) cells[cells.length - 1][1] = len / 2; x = len / 2; }
    }
    if (ri % 2 && cells.length && cells[0][0] > -len / 2 + 0.01) cells.unshift([-len / 2, cells[0][0]]);
    const holes = openings.filter((o) => o[2] < yb - 0.03 && o[3] > ya + 0.03).map((o) => [o[0], o[1]]);
    const runs = [];
    const emit = (pa, pb, ya2, yb2, id, sub) => {
      const w = pb - pa, h = yb2 - ya2, r1 = frand(seed, id, 403 + sub), r2 = frand(seed, id, 404 + sub), r3 = frand(seed, id, 405 + sub);
      parts.push(stone({ p: [(pa + pb) / 2 + (r2 - 0.5) * 0.03, (ya2 + yb2) / 2, (r3 - 0.5) * 0.07], s: [w * sc, h * sc, d * (0.88 + 0.2 * r2)], seed: seed * 97 + id * 3 + sub, color: shade(pick(colors, r1), dark * (1 - 0.1 * (1 - ri / rows.length))), rot: [(r2 - 0.5) * 0.07, (r3 - 0.5) * 0.08, (r1 - 0.5) * 0.1], moss: ya2 < 0.7 ? moss : 0, jit: 0.17, bevel: 0.16, faceVar: 0.08 }));
    };
    cells.forEach(([a, b], ci) => {
      for (const [pa, pb] of subtract([[a, b]], holes, 0.2)) {
        const id = idBase + ri * 40 + ci;
        const isCut = pa > a + 0.01 || pb < b - 0.01;
        // erosion from the top down (per column) so no stone is left floating over a gap
        const gone = D && D.level > 0 && !isCut && (((ya - y0) / (H - y0)) > 1 - D.thr * 1.3 * frand(seed, Math.floor(((pa + pb) / 2 + len / 2) / 0.6), 440));
        runs.push([pa, pb, gone]);
        if (gone) continue;
        const w = pb - pa, h = yb - ya;
        if (ri > 0 && w >= 0.8 && h >= 0.42 && frand(seed, id, 406) < splitP) {
          // split: tall stone + short stone with a small stone on top of it
          const f = 0.38 + frand(seed, id, 407) * 0.26, left = frand(seed, id, 408) < 0.5, xm = pa + w * f, hs = h * (0.6 + frand(seed, id, 409) * 0.15);
          if (left) { emit(pa, xm, ya, yb, id, 0); emit(xm, pb, ya, ya + hs, id, 1); emit(xm, pb, ya + hs, yb, id, 2); }
          else { emit(pa, xm, ya, ya + hs, id, 0); emit(pa, xm, ya + hs, yb, id, 1); emit(xm, pb, ya, yb, id, 2); }
        } else emit(pa, pb, ya, yb, id, 0);
      }
    });
    if (core) {
      // one recessed mortar block per contiguous run of pieces (broken up every ~2.2 m)
      let cur = null;
      const flush = () => { if (cur && cur[1] - cur[0] > 0.2 && yb - ya > 0.1) parts.push(beam({ a: [cur[0], (ya + yb) / 2, 0], b: [cur[1], (ya + yb) / 2, 0], w: (yb - ya) * 0.86, t: d * 0.6, up: [0, 0, 1], jit: 0.03, seed: seed + ri, color: shade(PAL.lime, 0.72 * dark), faceVar: 0.06 })); cur = null; };
      for (const [pa, pb, gone] of runs) {
        if (cur && (pa - cur[1] > 0.06 || pb - cur[0] > 2.4)) flush();
        if (!cur) cur = [pa, pb]; else cur[1] = pb;
      }
      flush();
    }
  });
  if (cap) {
    // flat capstones overhanging slightly
    let x = -len / 2, ci = 0;
    const holes = openings.filter((o) => o[3] > H - capH * 0.5).map((o) => [o[0], o[1]]);
    while (x < len / 2 - 0.05) {
      const w = 0.55 + frand(seed, ci, 410) * 0.5, b = Math.min(len / 2, x + w);
      for (const [pa, pb] of subtract([[x, b]], holes, 0.2)) {
        if (D && D.gone(idBase + 900 + ci, 0.7)) continue;
        parts.push(stone({ p: [(pa + pb) / 2, H - capH * 0.42, (frand(seed, ci, 411) - 0.5) * 0.06], s: [(pb - pa) * 1.02, capH * 1.05, d * (1.12 + 0.1 * frand(seed, ci, 412))], seed: seed + 555 + ci, color: shade(pick(colors, frand(seed, ci, 413)), 1.08), rot: [0, 0, (frand(seed, ci, 414) - 0.5) * 0.06], jit: 0.1, bevel: 0.16 }));
      }
      x = b; ci++;
    }
  }
  return parts;
}

// Straw-and-hide bed. Length along +Z (head at -Z), 1.1 wide, 0.6 high; legs go down into the ground. roll = ground bedroll.
export function bedGeoms({ seed = 1, roll = false, sc = 1, light = false }) {
  const p = [], r = rng(seed * 13 + 7);
  if (!roll) {
    for (const [x, z, h] of (light === 2 ? [[-0.48, -0.92, 0.62], [0.48, -0.92, 0.55]] : [[-0.48, -0.92, 0.62], [0.48, -0.92, 0.55], [-0.48, 0.92, 0.32], [0.48, 0.92, 0.3]])) p.push(log({ a: [x + (r() - 0.5) * 0.03, -1, z], b: [x, h, z + (r() - 0.5) * 0.03], r: 0.05, rt: 0.045, segs: 5, rows: 1, seed: seed + x * 7 + z, bark: pick(PAL.wood, r()), caps: 2 }));
    for (const x of [-0.5, 0.5]) p.push(log({ a: [x, 0.27, -0.98], b: [x + (r() - 0.5) * 0.04, 0.3 + (r() - 0.5) * 0.02, 0.98], r: 0.045, rt: 0.04, segs: 5, rows: 1, seed: seed + 3 + x, bark: pick(PAL.wood, r()), bark2: pick(PAL.wood, r()), bend: (r() - 0.5) * 0.04 }));
    p.push(beam({ a: [-0.55, 0.6, -0.93], b: [0.55, 0.56, -0.93], w: 0.16, t: 0.04, seed: seed + 1, color: pick(PAL.wood, r()), up: [0, 0, 1], endCol: PAL.cutOld }));
    for (let i = 0; i < (light === 2 ? 0 : light ? 2 : 5); i++) p.push(beam({ a: [-0.5, 0.285 + r() * 0.01, (light ? -0.5 + i : -0.75 + i * 0.4) + (r() - 0.5) * 0.06], b: [0.5, 0.285, (light ? -0.5 + i : -0.75 + i * 0.4) + (r() - 0.5) * 0.06], w: 0.1 + r() * 0.05, t: 0.03, seed: seed + 20 + i, color: pick(PAL.grey, r()), endCol: PAL.cutOld, up: [0, 1, 0] }));
  }
  const y0 = roll ? 0.08 : 0.34;
  p.push(blob({ r: 0.5, detail: light ? 0 : 1, jit: 0.12, seed: seed + 5, squash: [0.98, 0.16, 1.7], pos: [0, y0 + 0.02, 0], color: (x, y, z, fr) => pick(PAL.straw, fr), faceVar: 0.1 }));
  p.push(blob({ r: 0.5, detail: light ? 0 : 1, jit: 0.09, seed: seed + 6, squash: [0.99, 0.12, 1.02], pos: [0, y0 + 0.1, 0.42], color: (x, y, z, fr) => shade(pick(PAL.hide, fr), 0.95), faceVar: 0.14 }));
  p.push(blob({ r: 0.2, detail: 1, jit: 0.15, seed: seed + 7, squash: [1.4, 0.6, 1], pos: [0.02, y0 + 0.16, -0.72], color: (x, y, z, fr) => shade(pick(PAL.hide, fr), 1.1), faceVar: 0.12 }));
  if (sc !== 1) for (const g of p) xf(g, { scale: [sc, 1, sc] });
  return p;
}

// Stone-and-clay chimney stack of stacked irregular stones (2 per course), clay cap. x,z = base centre.
export function chimney({ x = 0, z = 0, w = 0.9, d = 0.8, h = 3, seed = 1, D, idBase = 0, taper = 0.75, colors = PAL.stone, y0 = -1, yawJ = 0.1, rowH = 0.42 }) {
  const p = [], rows = Math.max(3, Math.round((h - y0) / rowH));
  const cut = D && D.level ? 1 - D.thr * 0.85 * (0.6 + 0.8 * frand(seed, idBase, 430)) : 1;   // top part collapses first
  let y = y0, ytop = y0;
  for (let i = 0; i < rows; i++) {
    const t = (y - y0) / (h - y0), s = lerp(1, taper, t * t), hh = (h - y0) / rows * (0.9 + frand(seed, i, 420) * 0.25);
    if (t > cut) break;
    const split = 0.35 + frand(seed, i, 421) * 0.3, ww = w * s;
    for (let k = 0; k < 2; k++) {
      const wa = k ? ww * (1 - split) : ww * split;
      const cx = x + (k ? (-ww / 2 + ww * split + wa / 2) : (-ww / 2 + wa / 2)) + (frand(seed, i, 422) - 0.5) * 0.05;
      p.push(stone({ p: [cx, y + hh / 2, z + (frand(seed, i * 2 + k, 423) - 0.5) * 0.05], s: [wa * 1.02, hh * 1.02, d * s * (0.95 + 0.1 * frand(seed, i, 424))], seed: seed * 31 + i * 2 + k, color: pick(colors, frand(seed, i * 2 + k, 425)), rot: [0, (frand(seed, i, 426) - 0.5) * yawJ * 2, (frand(seed, i, 427) - 0.5) * 0.06], jit: 0.12, moss: y < 0.6 ? 0.3 : 0 }));
    }
    y += hh; ytop = y;
  }
  if (cut >= 0.999) {
    const cs = taper;
    p.push(stone({ p: [x, ytop + 0.06, z], s: [w * cs * 1.2, 0.16, d * cs * 1.2], seed: seed + 9, color: 0x7a6a58, jit: 0.1, bevel: 0.2 }));
    p.push(stone({ p: [x, ytop + 0.13, z], s: [w * cs * 0.55, 0.05, d * cs * 0.55], seed: seed + 10, color: 0x1e1a17, jit: 0.1, bevel: 0.1 }));
  } else if (ytop > 0.2) {
    // ragged broken top: a couple of leaning stones and fallen ones
    p.push(stone({ p: [x + 0.12, ytop + 0.1, z], s: [w * 0.4, 0.28, d * 0.5], seed: seed + 11, color: pick(colors, 0.3), rot: [0, 0.4, 0.2], jit: 0.16 }));
  }
  return p;
}

// ---- damage --------------------------------------------------------------------------------------------
// Deterministic per-piece fates. gone(i, bias): bias<1 = sturdier piece. Pieces gone at level k stay gone at k+1.
export function makeDmg(seed, level) {
  const thr = [0, 0.10, 0.32, 0.58][level] || 0;
  const amp = [0, 0.05, 0.14, 0.3][level] || 0;
  const forced = new Set();
  const D = {
    level,
    f: (i, k = 0) => frand(seed, i, 100 + k),
    gone: (i, bias = 1) => level > 0 && (forced.has(i) || frand(seed, i, 101) < thr * bias),
    // signed random lean (radians) that grows with level
    lean: (i, k = 0, s = 1) => (frand(seed, i, 110 + k) - 0.5) * 2 * amp * s,
    // extra bite: pieces that are also shortened/broken at higher levels (a few splintered tops already at level 1)
    broken: (i, bias = 1) => level > 0 && frand(seed, i, 120) < [0, 0.07, 0.3, 0.55][level] * bias,
    // guarantees that the weakest of n pieces (ids base..base+n-1) is gone from level 1 on (small pieces, visible damage)
    force: (n, base = 0) => { let bi = base, bv = 2; for (let i = base; i < base + n; i++) { const v = frand(seed, i, 101); if (v < bv) { bv = v; bi = i; } } forced.add(bi); return bi; },
    amp, thr,
  };
  return D;
}

// Weathering / scorch / cracks by damage level, applied to the finished merged geometry.
export function weather(g, level, seed, { scorch = true } = {}) {
  const p = g.getAttribute('position'), c = g.getAttribute('color');
  const sx = (frand(seed, 900) - 0.5) * 3, sz = (frand(seed, 901) - 0.5) * 3, sy = 0.4 + frand(seed, 902) * 1.6;
  const base = 1 - 0.05 * level, crackP = [0, 0.06, 0.14, 0.2][level] || 0;
  const grey = new THREE.Color(0x6a655c);
  for (let i = 0; i < p.count; i += 3) {
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const fr = hash3(cx, cy, cz, 77);
    let m = base;
    if (level > 0 && fr < crackP) m *= 0.62;
    if (scorch && level > 0) { const d = Math.hypot(cx - sx, cy - sy, cz - sz); m *= 1 - 0.5 * smooth(0.4 + 0.3 * level, 0.15, d) * (level / 3 + 0.3); }
    for (let k = 0; k < 3; k++) {
      _c.setRGB(c.getX(i + k), c.getY(i + k), c.getZ(i + k));
      if (level > 0) _c.lerp(grey, 0.06 * level);
      c.setXYZ(i + k, _c.r * m, _c.g * m, _c.b * m);
    }
  }
  return g;
}

// Scatter small debris (fallen stones / planks) on the ground around (cx,cz). n items, deterministic.
export function rubble(parts, { cx = 0, cz = 0, n = 3, spread = 0.6, seed = 1, kind = 'stone', size = 0.3, color }) {
  for (let i = 0; i < n; i++) {
    const a = frand(seed, i, 200) * TAU, d = frand(seed, i, 201) * spread, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    const sz = size * (0.55 + frand(seed, i, 202) * 0.7);
    if (kind === 'stone') parts.push(stone({ p: [x, sz * 0.3, z], s: [sz * 1.2, sz * 0.7, sz], seed: seed + i, color: color ?? pick(PAL.stone, frand(seed, i, 203)), rot: [0, frand(seed, i, 204) * TAU, 0], round: frand(seed, i, 205) < 0.4 }));
    else if (kind === 'plank') { const ya = frand(seed, i, 206) * TAU, len = size * (1.1 + frand(seed, i, 207) * 1.6); parts.push(beam({ a: [x - Math.cos(ya) * len / 2, 0.06 + frand(seed, i, 208) * 0.12, z - Math.sin(ya) * len / 2], b: [x + Math.cos(ya) * len / 2, 0.05, z + Math.sin(ya) * len / 2], w: 0.16, t: 0.05, seed: seed + i, color: color ?? pick(PAL.grey, frand(seed, i, 209)), color2: shade(color ?? PAL.grey[1], 0.85), endCol: PAL.cutOld, up: [0, 1, 0] })); }
    else parts.push(log({ a: [x - Math.cos(a) * size * 0.6, 0.11, z - Math.sin(a) * size * 0.6], b: [x + Math.cos(a) * size * 0.6, 0.09, z + Math.sin(a) * size * 0.6], r: 0.09 + frand(seed, i, 210) * 0.05, segs: 5, rows: 1, seed: seed + i, bark: pick(PAL.bark, frand(seed, i, 211)) }));
  }
}

// Vertical, slightly leaning, sharpened stake / post with pointed top. base->top. Returns a log with a cone tip.
export function stake({ x, z, y0 = -0.4, y1 = 2, r = 0.1, lean = [0, 0], seed = 1, bark = 0x6b4a33, tip = 0.35, cap = PAL.cut, segs = 5, rows = 1, bend = 0 }) {
  const top = [x + lean[0] * (y1 - y0), y1, z + lean[1] * (y1 - y0)];
  const body = log({ a: [x, y0, z], b: [top[0], y1 - tip, top[2]].map((v, i) => v), r, rt: r * 0.85, segs, rows, seed, bark, bark2: shade(bark, 1.1), caps: 1, wobble: 0.012, bend });
  const pt = log({ a: [top[0], y1 - tip, top[2]], b: top, r: r * 0.85, rt: 0.012, segs, rows: 1, seed: seed + 1, bark: cap, bark2: shade(cap, 1.05), caps: 0, wobble: 0, jit: 0.05 });
  return [body, pt];
}
