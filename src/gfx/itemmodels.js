// Procedural models for held tools/weapons and small world pickups. Held items: handle grip at the origin, blade along +Y.
import * as THREE from 'three';
import { blob, trunk, cone, merge, xf, paint, col, jitter, finish } from './meshkit.js';
import { mats } from './materials.js';

const WOOD = [0x6b4a2f, 0x8a6338];
function box(w, h, d, color, pos, rot, seed = 1, jit = 0.004) {
  const g = new THREE.BoxGeometry(w, h, d, 1, 1, 1); g.deleteAttribute('uv'); jitter(g, jit, seed); xf(g, { pos, rot });
  const n = g.toNonIndexed(); n.deleteAttribute('normal'); n.computeVertexNormals(); paint(n, () => color, 0.06, seed); return n;
}
const handle = (len, r = 0.03, seed = 3) => trunk({ rb: r * 1.15, rt: r, h: len, segs: 6, rows: 3, jit: 0.004, wobble: 0.006, seed, colorBase: WOOD[0], colorTop: WOOD[1] });

export function axeModel(kind = 'rusty') {
  const head = { rusty: [0x6a5a50, 0x8a6a4a], stone: [0x77777d, 0xa4a4aa], iron: [0x8e949c, 0xc8ced6], obsidian: [0x15101f, 0x4a3a78] }[kind] || [0x777777, 0xaaaaaa];
  const parts = [handle(0.78, 0.03, 4)];
  parts.push(blob({ r: 0.1, detail: 1, jit: 0.2, seed: 5, squash: [0.5, 1.15, 1.0], pos: [0, 0.7, 0.07], color: (x, y) => col(head[0]).lerp(col(head[1]), Math.max(0, Math.min(1, (x + 0.06) / 0.12))), faceVar: 0.1 }));
  parts.push(box(0.03, 0.09, 0.14, head[0], [0, 0.7, 0.015], [0, 0, 0], 6));
  if (kind === 'stone') parts.push(trunk({ rb: 0.014, rt: 0.014, h: 0.2, segs: 4, rows: 1, jit: 0.002, seed: 8, pos: [0, 0.6, 0], colorBase: 0xb59a6a, colorTop: 0xb59a6a }));
  return merge(parts);
}
export function pickaxeModel(kind = 'stone') {
  const head = { stone: [0x77777d, 0xa4a4aa], iron: [0x8e949c, 0xc8ced6], obsidian: [0x15101f, 0x4a3a78] }[kind] || [0x777777, 0xaaaaaa];
  const parts = [handle(0.82, 0.03, 9)];
  for (const s of [-1, 1]) parts.push(cone({ r: 0.035, h: 0.28, segs: 5, rows: 1, jit: 0.08, seed: 12 + s, pos: [s * 0.03, 0.78, 0], rot: [0, 0, -s * 1.35], colorBase: head[0], colorTop: head[1] }));
  parts.push(blob({ r: 0.05, detail: 0, jit: 0.2, seed: 15, squash: [1.3, 0.8, 0.9], pos: [0, 0.78, 0], color: head[0] }));
  return merge(parts);
}
export function spearModel(kind = 'stone') {
  const tip = { stone: [0x77777d, 0xa4a4aa], bone: [0xd9cfb8, 0xf1ead8], iron: [0x8e949c, 0xc8ced6] }[kind] || [0x777777, 0xaaaaaa];
  const parts = [trunk({ rb: 0.03, rt: 0.022, h: 1.5, segs: 6, rows: 5, jit: 0.004, wobble: 0.008, seed: 21, pos: [0, -0.25, 0], colorBase: WOOD[0], colorTop: WOOD[1] })];
  parts.push(cone({ r: 0.05, h: 0.26, segs: 4, rows: 1, jit: 0.05, seed: 22, pos: [0, 1.25, 0], colorBase: tip[0], colorTop: tip[1], faceVar: 0.1 }));
  parts.push(trunk({ rb: 0.03, rt: 0.03, h: 0.05, segs: 6, rows: 1, jit: 0.002, seed: 23, pos: [0, 1.22, 0], colorBase: 0xb59a6a, colorTop: 0xb59a6a }));
  return merge(parts);
}
export function swordModel(kind = 'iron') {
  const blade = { iron: [0x8e949c, 0xd6dce4], obsidian: [0x15101f, 0x5a4a98], bone: [0xd9cfb8, 0xf1ead8] }[kind] || [0x8e949c, 0xd6dce4];
  const parts = [trunk({ rb: 0.028, rt: 0.026, h: 0.22, segs: 6, rows: 1, jit: 0.002, seed: 30, pos: [0, -0.06, 0], colorBase: 0x3a2a1e, colorTop: 0x4a3626 })];
  parts.push(box(0.2, 0.035, 0.05, 0x9a7a3a, [0, 0.17, 0], [0, 0, 0], 31));
  parts.push(box(0.055, 0.78, 0.014, blade[0], [0, 0.6, 0], [0, 0, 0], 32, 0.002));
  parts.push(cone({ r: 0.03, h: 0.1, segs: 4, rows: 1, jit: 0.02, seed: 33, pos: [0, 0.99, 0], colorBase: blade[1], colorTop: blade[1], scale: [1, 1, 0.3] }));
  return merge(parts);
}
export function torchModel() {
  const parts = [trunk({ rb: 0.035, rt: 0.045, h: 0.62, segs: 6, rows: 3, jit: 0.005, wobble: 0.01, seed: 40, colorBase: WOOD[0], colorTop: 0x4a3626 })];
  parts.push(blob({ r: 0.07, detail: 1, jit: 0.15, seed: 41, pos: [0, 0.66, 0], squash: [1, 1.2, 1], color: 0x2a1f18 }));
  return merge(parts);
}
export function bowModel() {
  const parts = [];
  parts.push(trunk({ rb: 0.024, rt: 0.02, h: 0.62, segs: 5, rows: 6, jit: 0.002, wobble: 0.004, bend: [0.0, 0.16], seed: 50, pos: [0, 0, 0], colorBase: WOOD[0], colorTop: WOOD[1] }));
  parts.push(trunk({ rb: 0.024, rt: 0.02, h: 0.62, segs: 5, rows: 6, jit: 0.002, wobble: 0.004, bend: [0.0, 0.16], seed: 51, pos: [0, 0, 0], rot: [Math.PI, 0, 0], colorBase: WOOD[0], colorTop: WOOD[1] }));
  parts.push(trunk({ rb: 0.03, rt: 0.03, h: 0.16, segs: 6, rows: 1, jit: 0.002, seed: 52, pos: [0, -0.08, 0.0], colorBase: 0x3a2a1e, colorTop: 0x3a2a1e }));
  return merge(parts);
}
export function arrowModel() {
  const parts = [trunk({ rb: 0.008, rt: 0.008, h: 0.7, segs: 4, rows: 1, jit: 0.001, seed: 60, pos: [0, 0, 0], colorBase: 0x8a6a48, colorTop: 0x8a6a48 })];
  parts.push(cone({ r: 0.02, h: 0.07, segs: 4, rows: 1, jit: 0.01, seed: 61, pos: [0, 0.7, 0], colorBase: 0x888890, colorTop: 0xb8b8c0 }));
  parts.push(box(0.05, 0.1, 0.004, 0xd8d0c0, [0, 0.06, 0], [0, 0, 0], 62));
  return merge(parts);
}

export function heldModel(id) {
  switch (id) {
    case 'rusty_axe': return axeModel('rusty');
    case 'stone_axe': return axeModel('stone');
    case 'iron_axe': return axeModel('iron');
    case 'stone_pickaxe': return pickaxeModel('stone');
    case 'iron_pickaxe': return pickaxeModel('iron');
    case 'stone_spear': return spearModel('stone');
    case 'bone_spear': return spearModel('bone');
    case 'iron_sword': return swordModel('iron');
    case 'obsidian_sword': return swordModel('obsidian');
    case 'torch': return torchModel();
    case 'bow': return bowModel();
    default: return null;
  }
}

// Small pickup shapes for dropped items (shape id from data/items.js).
const cache = new Map();
export function dropModel(shape, color = '#999999') {
  const key = shape + color;
  if (cache.has(key)) return cache.get(key);
  const c = new THREE.Color(color);
  let g;
  switch (shape) {
    case 'log': g = trunk({ rb: 0.09, rt: 0.09, h: 0.55, segs: 6, rows: 1, jit: 0.01, seed: 1, rot: [Math.PI / 2, 0, 0], pos: [0, 0.09, -0.27], colorBase: c.getHex(), colorTop: c.getHex() }); break;
    case 'stick': g = trunk({ rb: 0.025, rt: 0.02, h: 0.5, segs: 4, rows: 2, jit: 0.005, seed: 2, rot: [Math.PI / 2, 0.4, 0], pos: [0, 0.04, -0.2], colorBase: c.getHex(), colorTop: c.getHex() }); break;
    case 'bone': g = trunk({ rb: 0.03, rt: 0.03, h: 0.3, segs: 5, rows: 1, jit: 0.005, seed: 3, rot: [Math.PI / 2, 0.8, 0], pos: [0, 0.04, -0.12], colorBase: c.getHex(), colorTop: c.getHex() }); break;
    case 'leaf': g = merge([blob({ r: 0.16, detail: 0, jit: 0.1, seed: 4, squash: [1, 0.15, 1.5], pos: [0, 0.03, 0], color: c.getHex() })]); break;
    case 'bar': g = merge([box(0.24, 0.07, 0.09, c.getHex(), [0, 0.04, 0], [0, 0, 0], 5, 0.004)]); break;
    case 'can': g = trunk({ rb: 0.07, rt: 0.07, h: 0.16, segs: 7, rows: 1, jit: 0.004, seed: 6, colorBase: c.getHex(), colorTop: c.getHex() }); break;
    case 'stone': g = blob({ r: 0.12, detail: 1, jit: 0.25, seed: 7, squash: [1.1, 0.75, 1], pos: [0, 0.07, 0], color: c.getHex() }); break;
    default: g = blob({ r: 0.1, detail: 1, jit: 0.2, seed: 8, pos: [0, 0.09, 0], color: c.getHex() });
  }
  g = finish(g);
  cache.set(key, g);
  return g;
}
export const itemMaterial = mats.prop;
