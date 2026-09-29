// Procedural low-poly geometry toolkit: jittered primitives with baked vertex colours.
// Everything returns non-indexed BufferGeometry with position/normal/color so pieces can be merged freely.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../engine/rng.js';

const _c = new THREE.Color();
export const col = (hex) => new THREE.Color(hex);

// Position-based hash so vertices shared by several faces move together (no cracks).
function hash3(x, y, z, seed) {
  let h = (Math.imul((x * 997) | 0, 374761393) + Math.imul((y * 997) | 0, 668265263) + Math.imul((z * 997) | 0, 1274126177) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function stripUV(g) { g.deleteAttribute('uv'); return g; }

// Turns any geometry into flat-shaded, non-indexed geometry with a colour attribute.
export function finish(g) {
  let out = g.index ? g.toNonIndexed() : g;
  stripUV(out);
  out.deleteAttribute('normal');
  out.computeVertexNormals();
  if (!out.getAttribute('color')) paint(out, () => 0xffffff);
  return out;
}

// Displace vertices with position-hashed noise (amt in world units, per axis scale optional).
export function jitter(g, amt, seed = 1, axes = [1, 1, 1]) {
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setXYZ(i,
      x + (hash3(x, y, z, seed) - 0.5) * 2 * amt * axes[0],
      y + (hash3(x, y, z, seed + 7) - 0.5) * 2 * amt * axes[1],
      z + (hash3(x, y, z, seed + 13) - 0.5) * 2 * amt * axes[2]);
  }
  return g;
}

// Colour by a function (x,y,z,faceRand) -> hex | THREE.Color. Per-face variation gives the faceted hand-made look.
export function paint(g, fn, faceVar = 0.0, seed = 5) {
  const p = g.getAttribute('position');
  const nonIndexed = !g.index;
  let colors = g.getAttribute('color');
  if (!colors) { colors = new THREE.BufferAttribute(new Float32Array(p.count * 3), 3); g.setAttribute('color', colors); }
  for (let i = 0; i < p.count; i++) {
    let fr = 0.5;
    if (nonIndexed && faceVar > 0) {
      const f = Math.floor(i / 3) * 3;
      fr = hash3(p.getX(f) + p.getX(f + 1) + p.getX(f + 2), p.getY(f) + p.getY(f + 1) + p.getY(f + 2), p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2), seed);
    }
    const r = fn(p.getX(i), p.getY(i), p.getZ(i), fr);
    if (r && r.isColor) _c.copy(r); else _c.set(r);
    const v = 1 + (fr - 0.5) * 2 * faceVar;
    colors.setXYZ(i, _c.r * v, _c.g * v, _c.b * v);
  }
  return g;
}

export function xf(g, { pos, rot, scale } = {}) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0, 'YXZ'));
  const s = Array.isArray(scale) ? scale : [scale ?? 1, scale ?? 1, scale ?? 1];
  m.compose(new THREE.Vector3(...(pos || [0, 0, 0])), q, new THREE.Vector3(...s));
  g.applyMatrix4(m);
  return g;
}

export const merge = (list) => finish(mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)), false));

// --- primitives --------------------------------------------------------------------------------
// Rock/foliage blob: jittered icosahedron. colorFn(x,y,z,fr) gets local coordinates.
export function blob({ r = 1, detail = 1, jit = 0.2, squash = [1, 1, 1], seed = 1, color = 0x808080, faceVar = 0.06, pos, rot }) {
  let g = new THREE.IcosahedronGeometry(r, detail);
  g = stripUV(g.index ? g.toNonIndexed() : g);
  jitter(g, r * jit, seed);
  g = xf(g, { pos, rot, scale: squash });
  g.deleteAttribute('normal'); g.computeVertexNormals();
  paint(g, typeof color === 'function' ? color : () => color, faceVar, seed);
  return g;
}

// Tapered, wobbling log. Base at origin, grows along +Y. bend = [dx,dz] total lateral offset at the top.
export function trunk({ rb = 0.3, rt = 0.15, h = 4, segs = 7, rows = 4, jit = 0.06, wobble = 0.05, bend = [0, 0], seed = 1, colorBase = 0x6b4a2f, colorTop = 0x7d5a3a, faceVar = 0.08, pos, rot, flare = 0 }) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs, rows, true);
  g.translate(0, h / 2, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / h;
    const bx = bend[0] * t * t, bz = bend[1] * t * t;
    let x = p.getX(i), z = p.getZ(i);
    const w = 1 + (hash3(x, y, z, seed) - 0.5) * 2 * (jit / Math.max(rb, 0.05)) + flare * Math.pow(1 - t, 4);
    p.setXYZ(i, x * w + bx + Math.sin(y * 2.1 + seed) * wobble, y, z * w + bz + Math.cos(y * 1.7 + seed) * wobble);
  }
  let out = g.toNonIndexed(); stripUV(out);
  out = xf(out, { pos, rot });
  out.computeVertexNormals();
  const cb = col(colorBase), ct = col(colorTop);
  paint(out, (x, y) => _c.copy(cb).lerp(ct, Math.min(1, Math.max(0, y / h))).clone(), faceVar, seed);
  // cap the top so the silhouette is closed
  return out;
}

export function cone({ r = 1, h = 2, segs = 7, rows = 1, jit = 0.12, seed = 1, colorBase = 0x2d5a2a, colorTop = 0x3f7a35, faceVar = 0.07, pos, rot, scale, droop = 0 }) {
  const g = new THREE.ConeGeometry(r, h, segs, rows, false);
  g.translate(0, h / 2, 0);
  const p = g.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + (hash3(x, y, z, seed) - 0.5) * 2 * jit;
    p.setXYZ(i, x * k, y + (hash3(x, y, z, seed + 3) - 0.5) * jit * h * 0.5 - droop * (Math.hypot(x, z) / r) * (Math.hypot(x, z) / r) * 0.3, z * k);
  }
  let out = g.toNonIndexed(); stripUV(out);
  out = xf(out, { pos, rot, scale });
  out.computeVertexNormals();
  const cb = col(colorBase), ct = col(colorTop);
  paint(out, (x, y) => _c.copy(cb).lerp(ct, Math.min(1, Math.max(0, (y - (pos?.[1] || 0)) / h))).clone(), faceVar, seed);
  return out;
}

// Flat, slightly curved leaf/blade (double-sided by construction: two mirrored quads). Points along +Z with droop.
export function leaf({ len = 2, w = 0.4, droop = 0.6, seg = 3, seed = 1, colorBase = 0x3a7a30, colorTip = 0x5a9a3a, pos, rot, faceVar = 0.05 }) {
  const verts = [], cols = [];
  const cb = col(colorBase), ct = col(colorTip);
  const rowsP = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, ww = w * Math.sin(Math.PI * (0.15 + 0.85 * t)) * (1 - t * 0.35);
    rowsP.push([[-ww, -droop * t * t * len * 0.5, t * len], [ww, -droop * t * t * len * 0.5, t * len], t]);
  }
  const tri = (a, b, c, t1, t2, t3) => { verts.push(...a, ...b, ...c); [t1, t2, t3].forEach((t) => { const k = _c.copy(cb).lerp(ct, t); cols.push(k.r, k.g, k.b); }); };
  for (let i = 0; i < seg; i++) {
    const [a1, b1, t1] = rowsP[i], [a2, b2, t2] = rowsP[i + 1];
    tri(a1, b1, a2, t1, t1, t2); tri(b1, b2, a2, t1, t2, t2);          // top
    tri(b1, a1, a2, t1, t1, t2); tri(b1, a2, b2, t1, t2, t2);          // bottom (reverse winding)
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  xf(g, { pos, rot });
  jitter(g, len * 0.02, seed);
  g.computeVertexNormals();
  return g;
}

export function rng(seed) { return mulberry32(seed); }
