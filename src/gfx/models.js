// Procedural models of the natural world. Every builder takes a seed and returns geometry standing on y = 0.
// Variants come from seeds; the placement code adds scale, yaw, tilt and tint on top, so no two objects look alike.
import * as THREE from 'three';
import { blob, trunk, cone, leaf, merge, xf, paint, jitter, finish, col, rng } from './meshkit.js';

const TAU = Math.PI * 2;
const grad = (a, b, y0, y1) => { const ca = col(a), cb = col(b); return (x, y) => ca.clone().lerp(cb, Math.min(1, Math.max(0, (y - y0) / (y1 - y0)))); };

export function pine(seed) {
  const r = rng(seed), h = 7 + r() * 3.5, parts = [];
  parts.push(trunk({ rb: 0.34, rt: 0.12, h: h * 0.9, segs: 7, rows: 5, jit: 0.05, wobble: 0.06, bend: [(r() - 0.5) * 0.6, (r() - 0.5) * 0.6], seed, colorBase: 0x5b4030, colorTop: 0x6d4f38, flare: 0.5 }));
  const layers = 5 + ((r() * 2) | 0);
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1), y = h * 0.26 + t * h * 0.66;
    const rad = (2.05 - t * 1.45) * (0.82 + r() * 0.36);
    parts.push(cone({ r: rad, h: 1.9 - t * 0.7, segs: 7, rows: 2, jit: 0.2, seed: seed + i * 11, pos: [(r() - 0.5) * 0.25, y, (r() - 0.5) * 0.25], rot: [(r() - 0.5) * 0.14, r() * TAU, (r() - 0.5) * 0.14], colorBase: i % 2 ? 0x2b5a3a : 0x2f6339, colorTop: 0x4f8b49, droop: 0.9 }));
  }
  parts.push(cone({ r: 0.3, h: 1.1, segs: 5, rows: 1, jit: 0.1, seed: seed + 99, pos: [0, h * 0.9, 0], colorBase: 0x3d7a42, colorTop: 0x5f9b4c }));
  return merge(parts);
}

export function oak(seed) {
  const r = rng(seed), parts = [];
  const h = 2.8 + r() * 1.2;
  parts.push(trunk({ rb: 0.42, rt: 0.24, h, segs: 7, rows: 4, jit: 0.07, wobble: 0.1, bend: [(r() - 0.5) * 1.2, (r() - 0.5) * 1.2], seed, colorBase: 0x5e4630, colorTop: 0x6f5238, flare: 0.8 }));
  for (let i = 0; i < 2; i++) {
    const a = r() * TAU;
    parts.push(trunk({ rb: 0.18, rt: 0.08, h: 2.0, segs: 5, rows: 2, jit: 0.03, seed: seed + i, pos: [0, h * 0.62, 0], rot: [0.75, a, 0], colorBase: 0x604832, colorTop: 0x6a4e37 }));
  }
  const cy = h + 1.2;
  const n = 4 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.6, d = 0.6 + r() * 1.2;
    const rad = 1.4 + r() * 0.9;
    parts.push(blob({ r: rad, detail: 1, jit: 0.24, seed: seed + i * 5, squash: [1.15, 0.85, 1.1], pos: [Math.cos(a) * d, cy + (r() - 0.3) * 0.9, Math.sin(a) * d], color: grad(0x5c9a34, 0x9bc850, cy - 1.2, cy + 2), faceVar: 0.08 }));
  }
  return merge(parts);
}

export function jungleTree(seed) {
  const r = rng(seed), parts = [];
  const h = 8.5 + r() * 4;
  const b = [(r() - 0.5) * 1.6, (r() - 0.5) * 1.6];
  parts.push(trunk({ rb: 0.55, rt: 0.28, h, segs: 8, rows: 6, jit: 0.07, wobble: 0.12, bend: b, seed, colorBase: 0x4f4335, colorTop: 0x625041, flare: 1.4 }));
  // buttress roots
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + r() * 0.8;
    parts.push(trunk({ rb: 0.22, rt: 0.02, h: 1.6, segs: 4, rows: 2, jit: 0.03, seed: seed + i, pos: [Math.cos(a) * 0.3, 0.0, Math.sin(a) * 0.3], rot: [1.05, -a + Math.PI / 2, 0], colorBase: 0x4a3f33, colorTop: 0x55483a }));
  }
  const n = 5 + ((r() * 3) | 0);
  const top = [b[0], h, b[1]];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r() * 0.7, d = 1.0 + r() * 2.0;
    const rad = 2.0 + r() * 1.5;
    parts.push(blob({ r: rad, detail: 1, jit: 0.28, seed: seed + i * 9, squash: [1.25, 0.7, 1.25], pos: [top[0] + Math.cos(a) * d, top[1] - 0.6 + (r() - 0.4) * 1.3, top[2] + Math.sin(a) * d], color: grad(0x1e5f34, 0x4fae4a, top[1] - 2.4, top[1] + 1.8), faceVar: 0.09 }));
  }
  return merge(parts);
}

export function palm(seed) {
  const r = rng(seed), parts = [];
  const h = 6 + r() * 2.5, bend = [(r() - 0.5) * 3.2, (r() - 0.5) * 3.2];
  parts.push(trunk({ rb: 0.26, rt: 0.15, h, segs: 6, rows: 8, jit: 0.03, wobble: 0.05, bend, seed, colorBase: 0x8a6a48, colorTop: 0x9a7a54, faceVar: 0.12, flare: 0.6 }));
  const top = [bend[0], h, bend[1]];
  const n = 7 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const yaw = (i / n) * TAU + r() * 0.4;
    parts.push(leaf({ len: 3.1 + r() * 1.2, w: 0.42, droop: 1.3 + r() * 0.7, seg: 4, seed: seed + i, colorBase: 0x2f7f36, colorTip: 0x6bb34a, pos: top, rot: [-0.45 - r() * 0.3, yaw, 0] }));
  }
  for (let i = 0; i < 3; i++) parts.push(blob({ r: 0.2, detail: 1, jit: 0.1, seed: seed + 50 + i, pos: [top[0] + (r() - 0.5) * 0.4, top[1] - 0.25, top[2] + (r() - 0.5) * 0.4], color: 0x5a4028 }));
  return merge(parts);
}

export function deadTree(seed) {
  const r = rng(seed), parts = [];
  const h = 4.2 + r() * 2;
  parts.push(trunk({ rb: 0.3, rt: 0.06, h, segs: 6, rows: 5, jit: 0.05, wobble: 0.16, bend: [(r() - 0.5) * 1.6, (r() - 0.5) * 1.6], seed, colorBase: 0x655a4d, colorTop: 0x8a7e70, flare: 0.7 }));
  const nb = 4 + ((r() * 3) | 0);
  for (let i = 0; i < nb; i++) {
    const y = h * (0.35 + r() * 0.55), a = r() * TAU, len = 1.3 + r() * 1.5;
    parts.push(trunk({ rb: 0.09, rt: 0.015, h: len, segs: 4, rows: 3, jit: 0.02, wobble: 0.09, bend: [(r() - 0.5) * 0.9, (r() - 0.5) * 0.9], seed: seed + i, pos: [0, y, 0], rot: [0.7 + r() * 0.5, a, 0], colorBase: 0x6d6155, colorTop: 0x8f8375 }));
  }
  return merge(parts);
}

export function stump(seed) {
  const r = rng(seed);
  const g = trunk({ rb: 0.42, rt: 0.34, h: 0.55, segs: 8, rows: 2, jit: 0.06, wobble: 0.02, seed, colorBase: 0x5b4030, colorTop: 0xb69062, flare: 0.5, faceVar: 0.1 });
  return merge([g, cone({ r: 0.34, h: 0.05, segs: 8, rows: 1, jit: 0.1, seed, pos: [0, 0.55, 0], colorBase: 0xc19c6a, colorTop: 0xc9a675 })]);
}

// --- rocks ---------------------------------------------------------------------------------------
const ROCK_PAL = {
  grey: [0x5f5f66, 0x9a9aa0], sand: [0x9b8b6a, 0xd0c39c], basalt: [0x2f2b30, 0x5a5158], brown: [0x5b4a3c, 0x8d7660], mossy: [0x55584e, 0x7f8f5c],
};
export function rock(seed, pal = 'grey') {
  const r = rng(seed), [c0, c1] = ROCK_PAL[pal] || ROCK_PAL.grey, parts = [];
  parts.push(blob({ r: 1, detail: 1, jit: 0.34, seed, squash: [1.25 + r() * 0.4, 0.75 + r() * 0.35, 1.0 + r() * 0.3], pos: [0, 0.4, 0], rot: [0, r() * TAU, 0], color: grad(c0, c1, -0.3, 1.3), faceVar: 0.1 }));
  const n = (r() * 3) | 0;
  for (let i = 0; i < n; i++) {
    const a = r() * TAU;
    parts.push(blob({ r: 0.35 + r() * 0.35, detail: 1, jit: 0.3, seed: seed + i * 3, squash: [1, 0.8, 1], pos: [Math.cos(a) * 0.95, 0.18, Math.sin(a) * 0.95], color: grad(c0, c1, -0.2, 0.7), faceVar: 0.1 }));
  }
  return merge(parts);
}
export function pebbles(seed) {
  const r = rng(seed), parts = [];
  const n = 2 + ((r() * 2) | 0);
  for (let i = 0; i < n; i++) parts.push(blob({ r: 0.13 + r() * 0.1, detail: 1, jit: 0.25, seed: seed + i, squash: [1.2, 0.7, 1], pos: [(r() - 0.5) * 0.45, 0.06, (r() - 0.5) * 0.45], color: grad(0x6a6a70, 0xa8a8ae, 0, 0.2), faceVar: 0.1 }));
  return merge(parts);
}
export function ore(seed, kind = 'iron') {
  const r = rng(seed), parts = [];
  const base = kind === 'obsidian' ? 'basalt' : kind === 'sulfur' ? 'sand' : 'grey';
  parts.push(rock(seed, base));
  const spec = { iron: [0xb4562b, 0xe08a4a], obsidian: [0x140f22, 0x4a3a78], sulfur: [0xd9c93a, 0xf6ee74] }[kind];
  const n = 5 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = r() * 0.7;
    if (kind === 'iron') parts.push(blob({ r: 0.2 + r() * 0.14, detail: 0, jit: 0.3, seed: seed + i, pos: [Math.cos(a) * d, 0.5 + r() * 0.55, Math.sin(a) * d], color: grad(spec[0], spec[1], 0.4, 1.1), faceVar: 0.15 }));
    else parts.push(cone({ r: 0.13 + r() * 0.08, h: 0.55 + r() * 0.65, segs: 5, jit: 0.1, seed: seed + i, pos: [Math.cos(a) * d, 0.35 + r() * 0.3, Math.sin(a) * d], rot: [(r() - 0.5) * 0.9, r() * TAU, (r() - 0.5) * 0.9], colorBase: spec[0], colorTop: spec[1], faceVar: 0.14 }));
  }
  return merge(parts);
}

// --- plants ------------------------------------------------------------------------------------
export function bush(seed, berries = false) {
  const r = rng(seed), parts = [];
  const n = 4 + ((r() * 2) | 0);
  const spots = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r(), d = i === 0 ? 0 : 0.35 + r() * 0.3, rad = 0.45 + r() * 0.3;
    const p = [Math.cos(a) * d, rad * 0.75, Math.sin(a) * d];
    spots.push([p, rad]);
    parts.push(blob({ r: rad, detail: 1, jit: 0.25, seed: seed + i * 7, squash: [1.1, 0.85, 1.1], pos: p, color: grad(0x2c7a35, 0x62b048, 0, 1.4), faceVar: 0.09 }));
  }
  if (berries) {
    for (let i = 0; i < 12; i++) {
      const [p, rad] = spots[(r() * spots.length) | 0], a = r() * TAU, e = (r() - 0.2) * 1.2;
      parts.push(blob({ r: 0.075, detail: 0, jit: 0.1, seed: seed + 200 + i, pos: [p[0] + Math.cos(a) * Math.cos(e) * rad * 1.02, p[1] + Math.sin(e) * rad * 0.9, p[2] + Math.sin(a) * Math.cos(e) * rad * 1.02], color: i % 3 ? 0xc0243a : 0x8c1f4a, faceVar: 0.1 }));
    }
  }
  return merge(parts);
}
export function fern(seed) {
  const r = rng(seed), parts = [], n = 7 + ((r() * 3) | 0);
  for (let i = 0; i < n; i++) parts.push(leaf({ len: 1.3 + r() * 0.6, w: 0.22, droop: 0.9, seg: 3, seed: seed + i, colorBase: 0x1f6a30, colorTip: 0x5aa640, rot: [-0.35 - r() * 0.3, (i / n) * TAU + r() * 0.3, 0], pos: [0, 0.05, 0] }));
  return merge(parts);
}
export function reed(seed) {
  const r = rng(seed), parts = [], n = 10 + ((r() * 5) | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = r() * 0.35, len = 1.6 + r() * 1.0;
    parts.push(leaf({ len, w: 0.045, droop: 0.4 + r() * 0.5, seg: 3, seed: seed + i, colorBase: 0x6f8a3a, colorTip: 0xb2b866, pos: [Math.cos(a) * d, 0, Math.sin(a) * d], rot: [-1.25 - r() * 0.25, a, 0] }));
    if (i % 4 === 0) parts.push(trunk({ rb: 0.05, rt: 0.045, h: 0.32, segs: 5, rows: 1, jit: 0.01, seed: seed + i, pos: [Math.cos(a) * d + Math.cos(a) * len * 0.22, len * 0.7, Math.sin(a) * d + Math.sin(a) * len * 0.22], colorBase: 0x5a3a22, colorTop: 0x4a2f1c }));
  }
  return merge(parts);
}
export function liana(seed) {
  const r = rng(seed), parts = [];
  parts.push(blob({ r: 0.7, detail: 1, jit: 0.3, seed, squash: [1.3, 0.9, 1.3], pos: [0, 0.65, 0], color: grad(0x1f5f33, 0x4aa040, 0, 1.4), faceVar: 0.1 }));
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = 0.3 + r() * 0.5;
    parts.push(trunk({ rb: 0.035, rt: 0.02, h: 1.7 + r() * 1.3, segs: 4, rows: 6, jit: 0.005, wobble: 0.1, bend: [(r() - 0.5) * 1.6, (r() - 0.5) * 1.6], seed: seed + i, pos: [Math.cos(a) * d, 0.05, Math.sin(a) * d], rot: [0.0, 0, 0], colorBase: 0x3f8f36, colorTop: 0x7bbf4a, faceVar: 0.1 }));
  }
  return merge(parts);
}
export function bones(seed) {
  const r = rng(seed), parts = [];
  const cb = 0xd9cfb8, ct = 0xf1ead8;
  for (let i = 0; i < 6; i++) {
    const a = r() * TAU, d = r() * 0.6, len = 0.45 + r() * 0.5;
    parts.push(trunk({ rb: 0.05, rt: 0.045, h: len, segs: 5, rows: 1, jit: 0.01, seed: seed + i, pos: [Math.cos(a) * d, 0.06, Math.sin(a) * d], rot: [Math.PI / 2 - 0.15 + r() * 0.3, r() * TAU, 0], colorBase: cb, colorTop: ct, faceVar: 0.06 }));
    parts.push(blob({ r: 0.075, detail: 0, jit: 0.15, seed: seed + 30 + i, pos: [Math.cos(a) * d, 0.07, Math.sin(a) * d], color: ct }));
  }
  for (let i = 0; i < 4; i++) parts.push(trunk({ rb: 0.035, rt: 0.03, h: 0.55, segs: 4, rows: 3, jit: 0.005, bend: [0.4, 0], seed: seed + 60 + i, pos: [-0.15 + i * 0.1, 0.03, -0.25], rot: [0.1, 0, 0.0], colorBase: cb, colorTop: ct }));
  parts.push(blob({ r: 0.2, detail: 1, jit: 0.12, seed: seed + 90, squash: [1, 0.85, 1.15], pos: [0.35, 0.16, 0.25], color: grad(0xc9bfa6, 0xf1ead8, 0, 0.35) }));
  parts.push(blob({ r: 0.06, detail: 0, jit: 0.1, seed: seed + 91, pos: [0.3, 0.2, 0.42], color: 0x2a2320 }));
  parts.push(blob({ r: 0.06, detail: 0, jit: 0.1, seed: seed + 92, pos: [0.42, 0.2, 0.4], color: 0x2a2320 }));
  return merge(parts);
}
export function sticks(seed) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < 4; i++) parts.push(trunk({ rb: 0.04, rt: 0.025, h: 0.8 + r() * 0.5, segs: 4, rows: 3, jit: 0.006, wobble: 0.03, seed: seed + i, pos: [(r() - 0.5) * 0.3, 0.05 + i * 0.03, (r() - 0.5) * 0.3], rot: [Math.PI / 2 - 0.1, r() * TAU, 0], colorBase: 0x5b4330, colorTop: 0x7a5c40 }));
  return merge(parts);
}

// --- wrecks --------------------------------------------------------------------------------------
function box(w, h, d, jit, seed, color, pos, rot) {
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  g.deleteAttribute('uv');
  jitter(g, jit, seed);
  xf(g, { pos, rot });
  const ng = g.toNonIndexed(); ng.deleteAttribute('normal'); ng.computeVertexNormals();
  paint(ng, typeof color === 'function' ? color : () => color, 0.08, seed);
  return ng;
}
export function crate(seed) {
  const r = rng(seed), parts = [];
  parts.push(box(0.95, 0.6, 0.62, 0.02, seed, grad(0x6b4a2a, 0x8a6338, 0, 0.6), [0, 0.3, 0]));
  parts.push(box(0.98, 0.16, 0.66, 0.015, seed + 1, grad(0x5a3d22, 0x7b5630, 0, 0.2), [0, 0.68, 0], [0, 0, 0]));
  for (const x of [-0.32, 0.32]) parts.push(box(0.07, 0.7, 0.68, 0.008, seed + 2, 0x3b3b40, [x, 0.36, 0]));
  parts.push(box(0.12, 0.14, 0.05, 0.005, seed + 3, 0xb89a3a, [0, 0.55, 0.33]));
  return merge(parts);
}
export function barrel(seed) {
  const r = rng(seed), parts = [];
  parts.push(trunk({ rb: 0.34, rt: 0.34, h: 0.9, segs: 9, rows: 4, jit: 0.02, seed, colorBase: 0x6e4a2a, colorTop: 0x8a6035, faceVar: 0.1, flare: 0 }));
  for (const y of [0.15, 0.7]) parts.push(trunk({ rb: 0.355, rt: 0.355, h: 0.06, segs: 9, rows: 1, jit: 0.005, seed, pos: [0, y, 0], colorBase: 0x3a3a3f, colorTop: 0x3a3a3f }));
  return merge(parts);
}
export function hull(seed) {
  // A beached ship lying on its side: planked half-hull following an elliptical cross-section, ribs, keel, broken bow and a mast stump.
  const r = rng(seed), parts = [];
  const L = 12 + r() * 2, beam = 1.7 + r() * 0.3, depth = 1.6;
  const wood = [0x5a4230, 0x7a5a3a, 0x8a6b48, 0x4a3828];
  const secW = (z) => { const t = (z + L / 2) / L; return Math.sin(Math.PI * Math.min(1, Math.max(0.02, t * 0.92 + 0.04))) ** 0.6; };
  parts.push(trunk({ rb: 0.26, rt: 0.24, h: L, segs: 6, rows: 8, jit: 0.02, wobble: 0.04, seed, pos: [0, 0.15, -L / 2], rot: [Math.PI / 2, 0, 0], colorBase: 0x4a3524, colorTop: 0x55402c }));
  const rows = 5, cols = 10;
  for (const side of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const th = (0.22 + (row / (rows - 1)) * 1.15);          // angle from the keel up the side
      for (let c = 0; c < cols; c++) {
        if (r() < (side > 0 ? 0.12 + row * 0.1 : 0.3 + row * 0.12)) continue;      // broken-out planks
        const z0 = -L / 2 + (c / cols) * L, z1 = -L / 2 + ((c + 1) / cols) * L, zc = (z0 + z1) / 2;
        const w = secW(zc), rx = beam * w, ry = depth * w;
        const x = side * Math.sin(th) * rx, y = 0.2 + (1 - Math.cos(th)) * ry * 0.9 + 0.1;
        const g = new THREE.BoxGeometry(0.09 + r() * 0.03, 0.36, (z1 - z0) * (0.9 + r() * 0.08), 1, 1, 1); g.deleteAttribute('uv');
        xf(g, { pos: [x, y, zc + (r() - 0.5) * 0.08], rot: [(r() - 0.5) * 0.04, 0, side * (Math.PI / 2 - th) * 0.95 + (r() - 0.5) * 0.06] });
        jitter(g, 0.012, seed + row * 9 + c + (side > 0 ? 50 : 0));
        const ng = g.toNonIndexed(); ng.deleteAttribute('normal'); ng.computeVertexNormals();
        paint(ng, () => wood[(r() * wood.length) | 0], 0.1, seed + c);
        parts.push(ng);
      }
    }
  }
  // ribs
  for (let i = 0; i < 7; i++) {
    const z = -L / 2 + 1.2 + (i / 6) * (L - 2.4), w = secW(z);
    for (const side of [-1, 1]) {
      if (r() < 0.2) continue;
      parts.push(trunk({ rb: 0.07, rt: 0.05, h: 1.9 * w + 0.2, segs: 4, rows: 5, jit: 0.01, wobble: 0.01, bend: [side * 0.55 * w, 0], seed: seed + i * 3, pos: [side * 0.32 * w, 0.28, z], rot: [0, 0, -side * 0.6], colorBase: 0x4a3828, colorTop: 0x5a4632 }));
    }
  }
  parts.push(trunk({ rb: 0.16, rt: 0.11, h: 4.2, segs: 6, rows: 4, jit: 0.02, wobble: 0.03, seed: seed + 77, pos: [0.2, 0.4, 1.4], rot: [0.12, 0, -0.5], colorBase: 0x5b4330, colorTop: 0x7a5c40 }));
  parts.push(trunk({ rb: 0.05, rt: 0.05, h: 2.6, segs: 4, rows: 3, jit: 0.02, wobble: 0.1, bend: [0.5, 0.2], seed: seed + 88, pos: [0.4, 0.3, 2.2], rot: [1.3, 0.5, 0], colorBase: 0xb59a6a, colorTop: 0xa08858 }));
  parts.push(box(1.1, 0.06, 0.5, 0.01, seed + 91, 0xa89a7a, [-0.3, 0.14, -2.5], [0.05, 0.5, 0.05]));
  return merge(parts);
}

// ---------------------------------------------------------------------------------------------------
// Later additions: cave, endgame and event props
export function crystal(seed) {
  const r = rng(seed), parts = [];
  const hue = [[0x3a7bff, 0x9ad0ff], [0x8a4aff, 0xd6a8ff], [0x2ad0c0, 0xa0fff0]][seed % 3];
  const n = 5 + ((r() * 4) | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = r() * 0.5, h = 0.5 + r() * 1.1;
    parts.push(cone({ r: 0.09 + r() * 0.1, h, segs: 5, jit: 0.08, seed: seed + i, pos: [Math.cos(a) * d, 0.02, Math.sin(a) * d], rot: [(r() - 0.5) * 0.7, r() * TAU, (r() - 0.5) * 0.7], colorBase: hue[0], colorTop: hue[1], faceVar: 0.16 }));
  }
  parts.push(blob({ r: 0.32, detail: 1, jit: 0.3, seed, squash: [1.3, 0.5, 1.3], pos: [0, 0.05, 0], color: 0x3a3630 }));
  return merge(parts);
}
export function noteProp(seed) {
  const parts = [blob({ r: 0.5, detail: 1, jit: 0.3, seed, squash: [1.2, 0.5, 1.0], pos: [0, 0.18, 0], color: grad(0x5f5f66, 0x9a9aa0, 0, 0.5) })];
  parts.push(box(0.36, 0.05, 0.28, 0.008, seed + 1, 0xefe4c4, [0, 0.46, 0], [0.12, 0.3, 0.06]));
  parts.push(box(0.4, 0.04, 0.32, 0.008, seed + 2, 0x6b4a2a, [0.01, 0.43, 0.01], [0.12, 0.3, 0.06]));
  return merge(parts);
}
export function caveMouth(seed) {
  // an arch of big boulders around a black opening, facing +Z
  const r = rng(seed), parts = [];
  const rockPal = ['grey', 'brown', 'grey'];
  for (let i = 0; i < 9; i++) {
    const t = i / 8, a = Math.PI * t, x = Math.cos(a) * 2.6, y = Math.sin(a) * 2.7 + 0.2;
    parts.push(xf(rock(seed * 7 + i, rockPal[i % 3]), { pos: [x, y - 0.4, (r() - 0.5) * 0.7], rot: [0, r() * TAU, 0], scale: [1.6 + r() * 0.7, 1.5 + r() * 0.8, 1.6 + r() * 0.7] }));
  }
  for (let i = 0; i < 5; i++) parts.push(xf(rock(seed * 11 + i, 'brown'), { pos: [(r() - 0.5) * 6.4, 2.3 + r() * 1.2, -1.2 - r() * 1.2], rot: [0, r() * TAU, 0], scale: [2.2 + r(), 1.8 + r(), 2.2 + r()] }));
  const g = merge(parts);
  return g;
}
export function caveVoid() {
  const g = new THREE.CircleGeometry(2.3, 14); g.deleteAttribute('uv'); const ng = g.toNonIndexed();
  paint(ng, () => 0x030303, 0, 1); ng.deleteAttribute('normal'); ng.computeVertexNormals();
  return ng;
}
export function raftModel(seed = 5) {
  const r = rng(seed), parts = [];
  // logs lashed side by side
  for (let i = -3; i <= 3; i++) parts.push(trunk({ rb: 0.2 + r() * 0.04, rt: 0.19 + r() * 0.03, h: 4.4 + r() * 0.5, segs: 7, rows: 3, jit: 0.02, wobble: 0.03, seed: seed + i, pos: [i * 0.42, 0.14, -2.2], rot: [Math.PI / 2, 0, 0], colorBase: 0x6a4a2c, colorTop: 0x7d5a38, faceVar: 0.1 }));
  for (const z of [-1.4, 0.4, 1.7]) parts.push(trunk({ rb: 0.09, rt: 0.09, h: 3.2, segs: 6, rows: 1, jit: 0.01, seed: seed + 20, pos: [-1.6, 0.44, z], rot: [0, 0, -Math.PI / 2], colorBase: 0x5b4330, colorTop: 0x7a5c40 }));
  for (const z of [-1.4, 0.4, 1.7]) for (const x of [-1.2, 0, 1.2]) parts.push(blob({ r: 0.09, detail: 0, jit: 0.1, seed: seed + z * 10 + x, pos: [x, 0.5, z], color: 0xb59a6a }));
  parts.push(trunk({ rb: 0.12, rt: 0.09, h: 4.6, segs: 6, rows: 3, jit: 0.015, wobble: 0.02, seed: seed + 30, pos: [0, 0.5, -0.4], colorBase: 0x6b4a2f, colorTop: 0x8a6338 }));
  return merge(parts);
}
export function raftSail(seed = 3) {
  const g = leaf({ len: 2.6, w: 1.4, droop: 0.05, seg: 4, seed, colorBase: 0xc8b48a, colorTip: 0xe4d2a4, pos: [0, 0, 0], rot: [0, 0, 0] });
  xf(g, { pos: [0, 1.0, -0.4], rot: [-Math.PI / 2 + 0.05, 0, 0], scale: [1.1, 1, 1.5] });
  return finish(g);
}
export function raftRudder(seed = 3) {
  const parts = [trunk({ rb: 0.06, rt: 0.05, h: 1.8, segs: 6, rows: 1, jit: 0.01, seed, pos: [0, 0.2, 2.5], rot: [-0.9, 0, 0], colorBase: 0x2a2040, colorTop: 0x4a3a78 })];
  parts.push(xf(blob({ r: 0.4, detail: 1, jit: 0.15, seed: seed + 1, squash: [0.12, 1.2, 0.5], color: 0x1c1430 }), { pos: [0, -0.2, 3.1] }));
  return merge(parts);
}
export function signalFireModel(seed = 4) {
  const r = rng(seed), parts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU * 2, ring = i < 12 ? 1.0 : 0.55, y = 0.2 + Math.floor(i / 8) * 0.55 + ((i % 8) > 3 ? 0.15 : 0);
    parts.push(trunk({ rb: 0.12, rt: 0.1, h: 1.7 + r() * 0.5, segs: 5, rows: 2, jit: 0.02, wobble: 0.03, seed: seed + i, pos: [Math.cos(a) * ring, y, Math.sin(a) * ring], rot: [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], colorBase: 0x5b4030, colorTop: 0x8a6338 }));
  }
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; parts.push(blob({ r: 0.35 + r() * 0.18, detail: 1, jit: 0.3, seed: seed + 50 + i, squash: [1.1, 0.8, 1.0], pos: [Math.cos(a) * 2.0, 0.25, Math.sin(a) * 2.0], color: grad(0x5f5f66, 0x9a9aa0, 0, 0.6) })); }
  return merge(parts);
}
export function traderBoat(seed = 2) {
  const r = rng(seed), parts = [];
  const L = 6.2;
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let c = 0; c < 8; c++) {
    const z0 = -L / 2 + (c / 8) * L, z1 = z0 + L / 8, zc = (z0 + z1) / 2, t = (zc + L / 2) / L, w = Math.sin(Math.PI * (0.06 + 0.88 * t)) ** 0.7;
    const th = 0.25 + row * 0.42, x = side * Math.sin(th) * 1.2 * w, y = 0.08 + (1 - Math.cos(th)) * 1.0 * w + 0.2;
    parts.push(xf(box(0.09, 0.4, (z1 - z0) * 0.98, 0.01, seed + row * 9 + c, [0x6b4a2a, 0x8a6338, 0x5a3d22][(r() * 3) | 0], [0, 0, 0], [0, 0, 0]), { pos: [x, y, zc], rot: [0, 0, side * (Math.PI / 2 - th)] }));
  }
  parts.push(trunk({ rb: 0.11, rt: 0.08, h: 4.8, segs: 6, rows: 3, jit: 0.015, seed: seed + 9, pos: [0, 0.3, 0.4], colorBase: 0x5b4330, colorTop: 0x7a5c40 }));
  parts.push(xf(leaf({ len: 3.0, w: 1.3, droop: 0.05, seg: 3, seed: seed + 4, colorBase: 0xd8c8a0, colorTip: 0xeee0b8 }), { pos: [0, 2.1, 0.3], rot: [-Math.PI / 2 + 0.05, 0, 0], scale: [1, 1, 1.2] }));
  parts.push(blob({ r: 0.5, detail: 1, jit: 0.15, seed: seed + 5, squash: [1.4, 0.5, 1.6], pos: [0, 0.45, -2.2], color: 0x8a5f38 }));
  return merge(parts);
}
