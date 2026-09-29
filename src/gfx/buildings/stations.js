// Crafting stations & furnishings: workbench, furnace, forge, alchemy, chest, drying_rack, rain_barrel, garden, lantern_post.
// Local +Z = front (where the player stands). Glowing parts (kiln mouth, forge coals + seams, lantern flame, potion) go to B.addGlow.
import * as THREE from 'three';
import { leaf } from '../meshkit.js';
import { blob, stone, log, beam, band, anchor, pebble, slab, roofSlope, shear, rotAbout, rubble, subtract, xf, finish, paintTris, PAL, pick, shade, mix, lerp, clamp, TAU, V3, frand } from './kit.js';

const OBS = [0x3a3746, 0x46425a, 0x2e2b3a, 0x544e66, 0x403c52];
const IRON = PAL.iron;

// ring of stones (one masonry course of a round structure); skip = array of indices to leave out
function ringCourse(B, { y0, h, R, n, thick = 0.34, seed = 1, colors = PAL.stone, skip = [], rot0 = 0, moss = 0, jit = 0.14, wobble = 0.06, gapFrac = 1.06 }) {
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const th = rot0 + (i / n) * TAU + (frand(seed, i, 1) - 0.5) * 0.08, rr = R + (frand(seed, i, 2) - 0.5) * wobble;
    const arc = (TAU / n) * R * gapFrac * (0.92 + frand(seed, i, 3) * 0.16), hh = h * (0.92 + frand(seed, i, 4) * 0.16);
    B.add(stone({ p: [Math.sin(th) * rr, y0 + hh / 2, Math.cos(th) * rr], s: [arc, hh, thick * (0.92 + frand(seed, i, 5) * 0.2)], rot: [(frand(seed, i, 6) - 0.5) * 0.06, th, (frand(seed, i, 7) - 0.5) * 0.06], seed: seed * 53 + i, color: pick(colors, frand(seed, i, 8)), jit, moss: y0 < 0.7 ? moss : 0, bevel: 0.12 }));
  }
}

// ---- workbench ------------------------------------------------------------------------------------------------------------------
export function workbench(B) {
  const D = B.D, s = B.seed, L = B.level, r = B.r;
  const top = [], rest = [];
  B.add(anchor({ hw: 0.85, hd: 0.3, top: -0.05, bottom: -1, seed: 5, color: 0x33291f }));
  // legs (slightly splayed, crooked), stretchers, apron, lower shelf
  const legs = [[-0.78, -0.33], [0.78, -0.33], [-0.78, 0.33], [0.78, 0.33]];
  const legGone = legs.map((_, i) => D.gone(10 + i, 0.5) && L >= 2);
  legs.forEach(([x, z], i) => {
    if (legGone[i]) return;
    const lx = D.lean(20 + i, 0, 0.5) * 0.4;
    B.add(log({ a: [x + Math.sign(x) * 0.03, -1, z + Math.sign(z) * 0.03], b: [x + lx, 0.97, z], r: 0.075, rt: 0.06, segs: 5, rows: 2, seed: i + 4 * s, bark: pick(PAL.wood, frand(s, i, 1)), bark2: PAL.wood[3], caps: 2, wobble: 0.015 }));
  });
  for (const z of [-0.33, 0.33]) if (!D.gone(30 + (z > 0), 0.6)) B.add(beam({ a: [-0.78, 0.36 + (frand(s, z * 9, 2) - 0.5) * 0.04, z], b: [0.78, 0.34, z], w: 0.09, t: 0.06, color: pick(PAL.wood, frand(s, z * 9, 3)), seed: 3, endCol: PAL.cutOld, up: [0, 0, 1] }));
  for (const x of [-0.78, 0.78]) if (!D.gone(32 + (x > 0), 0.6)) B.add(beam({ a: [x, 0.3, -0.33], b: [x, 0.32, 0.33], w: 0.09, t: 0.06, color: pick(PAL.wood, frand(s, x * 9, 4)), seed: 4, endCol: PAL.cutOld, up: [1, 0, 0] }));
  for (const z of [-0.36, 0.36]) if (!D.gone(34 + (z > 0), 0.6)) B.add(beam({ a: [-0.8, 0.86, z], b: [0.8, 0.87, z], w: 0.13, t: 0.06, color: PAL.wood[2], seed: 6, endCol: PAL.cutOld, up: [0, 0, 1] }));
  for (let i = 0; i < 4; i++) if (!D.gone(40 + i, 0.6)) B.add(beam({ a: [-0.7 + i * 0.47 + (frand(s, i, 5) - 0.5) * 0.04, 0.4, -0.3], b: [-0.7 + i * 0.47, 0.4 + (frand(s, i, 6) - 0.5) * 0.02, 0.3], w: 0.16 + frand(s, i, 7) * 0.04, t: 0.035, color: pick(PAL.grey, frand(s, i, 8)), seed: 20 + i, endCol: PAL.cutOld, up: [0, 1, 0] }));
  // top: 5 planks, uneven thickness, gaps
  for (let i = 0; i < 5; i++) {
    const z = -0.4 + i * 0.2 + (frand(s, i, 9) - 0.5) * 0.02, id = 50 + i;
    if (D.gone(id, 0.9)) continue;
    const t = 0.065 + frand(s, i, 10) * 0.03, y = 0.985 + (frand(s, i, 11) - 0.5) * 0.02, x0 = -0.96 + frand(s, i, 12) * 0.04, x1 = 0.96 - frand(s, i, 13) * 0.05;
    const sag = D.lean(id, 1, 0.5) * 0.2;
    B.add(beam({ a: [x0, y + sag, z], b: [x1, y - sag, z + (frand(s, i, 14) - 0.5) * 0.02], w: 0.185 - frand(s, i, 15) * 0.015, t, color: pick(PAL.grey, frand(s, i, 16)), color2: pick(PAL.wood, frand(s, i, 17)), seed: id, endCol: PAL.cutOld, up: [0, 1, 0], jit: 0.08, bow: 0.006, segs: 2 }));
  }
  // vice (front-left): fixed jaw, moving jaw, screw + handle
  if (!D.gone(60, 0.6)) {
    const vx = -0.66, vz = 0.38;
    B.add(beam({ a: [vx, 1.005, vz], b: [vx, 1.19, vz], w: 0.2, t: 0.1, color: 0x4a3626, seed: 3, up: [0, 0, 1], endCol: 0x5a4636 }));
    B.add(beam({ a: [vx, 1.005, vz + 0.19], b: [vx, 1.17, vz + 0.19], w: 0.2, t: 0.06, color: PAL.iron, seed: 4, up: [0, 0, 1] }));
    B.add(log({ a: [vx, 1.08, vz + 0.44], b: [vx, 1.08, vz + 0.03], r: 0.018, segs: 4, rows: 1, seed: 5, bark: PAL.ironLight, caps: 3 }));
    B.add(log({ a: [vx - 0.09, 1.08, vz + 0.45], b: [vx + 0.09, 1.09, vz + 0.45], r: 0.012, segs: 4, rows: 1, seed: 6, bark: PAL.iron, caps: 3 }));
  }
  // tools & shavings
  if (!D.gone(61, 0.7)) { B.add(log({ a: [0.02, 1.03, 0.02], b: [0.34, 1.03, 0.1], r: 0.016, segs: 4, rows: 1, seed: 7, bark: 0x7a5a3c, caps: 3 })); B.add(beam({ a: [0.02, 1.05, 0.02], b: [0.06, 1.05, 0.02], w: 0.05, t: 0.05, color: PAL.iron, seed: 9, up: [0, 1, 0] })); }
  if (!D.gone(62, 0.7)) { B.add(beam({ a: [0.5, 1.02, -0.12], b: [0.95, 1.02, -0.02], w: 0.1, t: 0.006, taper: 0.5, color: PAL.ironLight, seed: 8, up: [0, 1, 0], faceVar: 0.1 })); B.add(beam({ a: [0.42, 1.03, -0.14], b: [0.52, 1.03, -0.12], w: 0.03, t: 0.03, color: 0x6a4a30, seed: 8, up: [0, 1, 0] })); }
  if (!D.gone(63, 0.7)) B.add(beam({ a: [0.1, 1.03, -0.28], b: [0.7, 1.03, -0.26], w: 0.09, t: 0.045, color: PAL.cut, color2: PAL.cutOld, seed: 11, up: [0, 1, 0] }));   // a half-worked plank
  B.add(beam({ a: [-0.3, 1.02, 0.15], b: [-0.12, 1.02, 0.2], w: 0.02, t: 0.02, color: PAL.iron, seed: 3, up: [0, 1, 0] }));
  for (let i = 0; i < 4; i++) B.add(blob({ r: 0.045 + frand(s, i, 18) * 0.03, detail: 0, jit: 0.3, seed: 70 + i, squash: [1.4, 0.3, 1], pos: [-0.35 + i * 0.35 + (frand(s, i, 19) - 0.5) * 0.2, i < 2 ? 1.03 : 0.03, i < 2 ? 0.0 : 0.55 + frand(s, i, 20) * 0.2], rot: [0, frand(s, i, 21) * TAU, 0], color: (x, y, z, fr) => (fr < 0.5 ? PAL.cut : PAL.cutOld), faceVar: 0.1 }));
  if (L >= 1) rubble(B.parts, { cx: 0, cz: 0.6, n: L, spread: 0.7, seed: 11 + s, kind: 'plank', size: 0.3 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 0.5) * 0.5, D.lean(2, 9, 0.4) * 0.4);
  B.box(0, 0, 0.97, 0.45, 0);
  B.interact.use = { x: 0, z: 0.85 };
}

// ---- furnace (rounded stone kiln with chimney, arched mouth, anvil stand) ----------------------------------------------------
export function furnace(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.7, hd: 0.7, top: 0.0, bottom: -1, seed: 8, color: 0x3a2e22 }));
  const C = [[-1, 1.3, 0.62, 8], [0.3, 0.32, 0.62, 8], [0.62, 0.3, 0.58, 8], [0.92, 0.28, 0.5, 7], [1.2, 0.25, 0.4, 6]];
  C.forEach(([y0, h, R, n], k) => ringCourse(B, { y0, h, R, n, thick: 0.36, seed: s * 7 + k + 1, colors: k < 2 ? PAL.stone : [0xa8a08e, 0x9d9482, 0xb0a794, 0x8f8878, 0x968f7c], skip: k < 2 ? [0] : [], rot0: k >= 2 && k % 2 ? 0.2 : 0, moss: 0.35, wobble: 0.04 }));
  ringCourse(B, { y0: 1.45, h: 0.24, R: 0.26, n: 5, thick: 0.22, seed: s + 40, colors: [0x6a5e50, 0x776a5a], jit: 0.1 });
  ringCourse(B, { y0: 1.69, h: 0.22, R: 0.235, n: 4, thick: 0.2, seed: s + 41, colors: [0x6a5e50, 0x776a5a], rot0: 0.4, jit: 0.1 });
  B.add(stone({ p: [0, 1.435, 0], s: [0.85, 0.08, 0.85], seed: 55, color: 0x6a5e50, jit: 0.1, round: true }));
  B.add(stone({ p: [0, 1.9, 0], s: [0.4, 0.06, 0.4], seed: 56, color: 0x2a2521, jit: 0.1, round: true }));
  // arched mouth: 7 voussoir stones around a half circle, dark fire chamber behind, glowing coals
  for (let k = 0; k < 7; k++) {
    const a = (k / 6) * Math.PI, ax = Math.cos(a) * 0.36, ay = 0.3 + Math.sin(a) * 0.34;
    B.add(stone({ p: [ax, ay, 0.66], s: [0.16, 0.2, 0.34], rot: [0, 0, a - Math.PI / 2], seed: 60 + k, color: pick([0x9c9484, 0xb0a794, 0x8a8270], frand(s, k, 30)), jit: 0.1, bevel: 0.08 }));
  }
  B.add(stone({ p: [0, 0.32, 0.36], s: [0.74, 0.62, 0.2], seed: 70, color: 0x120d0a, jit: 0.05, bevel: 0 }));
  B.add(stone({ p: [0, 0.03, 0.5], s: [0.7, 0.06, 0.4], seed: 71, color: 0x1a1410, jit: 0.05, bevel: 0 }));
  B.addGlow(blob({ r: 0.3, detail: 1, jit: 0.15, seed: 72, squash: [1.0, 0.72, 0.3], pos: [0, 0.34, 0.5], color: (x, y, z, fr) => (y > 0.36 ? 0xffb040 : 0xff7a24), faceVar: 0.16 }));
  B.addGlow(blob({ r: 0.2, detail: 0, jit: 0.2, seed: 73, squash: [1.2, 0.4, 0.8], pos: [0, 0.08, 0.6], color: (x, y, z, fr) => (fr < 0.5 ? 0xff9a30 : 0xd84a12), faceVar: 0.2 }));
  // anvil stand (front right): stump + iron anvil + ingots
  B.add(log({ a: [0.6, -0.3, 0.58], b: [0.6, 0.38, 0.6], r: 0.17, rt: 0.15, segs: 6, rows: 1, seed: 9, bark: 0x6a4e37, cap: 0xb59a72, caps: 2 }));
  B.add(beam({ a: [0.6, 0.38, 0.6], b: [0.6, 0.5, 0.6], w: 0.16, t: 0.13, color: IRON, seed: 4, up: [0, 0, 1] }));
  B.add(beam({ a: [0.6, 0.5, 0.6], b: [0.6, 0.56, 0.6], w: 0.32, t: 0.14, color: PAL.ironLight, taper: 0.9, seed: 5, up: [0, 0, 1] }));
  B.add(beam({ a: [0.4, 0.545, 0.6], b: [0.3, 0.54, 0.6], w: 0.1, t: 0.09, color: PAL.ironLight, taper: 0.3, seed: 6, up: [0, 0, 1] }));
  for (let i = 0; i < 3; i++) B.add(beam({ a: [-0.75 + i * 0.03, 0.06 + i * 0.045, 0.62], b: [-0.45 + i * 0.03, 0.06 + i * 0.045, 0.62 + 0.04], w: 0.09, t: 0.035, color: 0x6a5a52, color2: PAL.ironLight, seed: 12 + i, up: [0, 1, 0] }));
  B.fireAnchor = [0, 0.35, 0.55];
  B.circle(0, 0, 0.82);
  B.interact.use = { x: 0, z: 1.15 };
}

// ---- forge (obsidian/basalt, glowing seams, bellows, black-stone anvil) -----------------------------------------------------
export function forge(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.9, hd: 0.7, top: 0.0, bottom: -1, x: 0, z: -0.2, seed: 9, color: 0x2a2320 }));
  const ob = (i) => pick(OBS, frand(s, i, 50));
  // main block: 4 courses of chunky angular basalt (irregular widths), back-heavy; front opening = hearth trough
  const rows = [[-1, 0.4, 1.6], [0.4, 0.75, 1.5], [0.75, 1.05, 1.4]];
  let id = 0;
  rows.forEach(([y0, y1, w], ri) => {
    // cells with irregular widths; the middle course has an arched, glowing firebox mouth in the front
    let cells = [], x = -w / 2;
    while (x < w / 2 - 0.05) { const cw = Math.min(w / 2 - x, 0.42 + frand(s, ri * 20 + cells.length, 51) * 0.36); cells.push([x, x + cw]); x += cw; }
    const holes = ri === 1 ? [[-0.36, 0.36]] : [];
    cells.forEach(([a, b]) => {
      for (const [pa, pb] of subtract([[a, b]], holes, 0.18)) {
        const cw = pb - pa;
        B.add(stone({ p: [(pa + pb) / 2, (y0 + y1) / 2, -0.4 + (frand(s, id, 52) - 0.5) * 0.06], s: [cw * 1.02, (y1 - y0) * 0.98, 0.9 + frand(s, id, 53) * 0.12], seed: 100 + id, color: ob(id), jit: 0.14, bevel: 0.1, rot: [0, (frand(s, id, 54) - 0.5) * 0.06, (frand(s, id, 55) - 0.5) * 0.06] }));
        if (ri > 0 && frand(s, id, 56) < 0.8) B.addGlow(beam({ a: [pb + (frand(s, id, 57) - 0.5) * 0.04, y0 + 0.02, 0.06], b: [pb + 0.02 + (frand(s, id, 58) - 0.5) * 0.06, y1 - 0.02, 0.06], w: 0.035, t: 0.03, color: frand(s, id, 59) < 0.5 ? 0xff7a24 : 0xffa540, seed: id, up: [0, 0, 1], wave: [0.008, 20], segs: 3 }));
        id++;
      }
    });
    if (ri === 1) {
      // firebox: dark chamber + arch stones + glowing coals inside
      B.add(stone({ p: [0, 0.58, -0.35], s: [0.78, 0.42, 0.5], seed: 190, color: 0x100c10, jit: 0.04, bevel: 0 }));
      for (let k = 0; k < 6; k++) { const an = (k / 5) * Math.PI; B.add(stone({ p: [Math.cos(an) * 0.4, 0.62 + Math.sin(an) * 0.2, 0.06], s: [0.16, 0.16, 0.22], rot: [0, 0, an - Math.PI / 2], seed: 195 + k, color: ob(20 + k), jit: 0.08, bevel: 0.1 })); }
      B.addGlow(blob({ r: 0.3, detail: 1, jit: 0.15, seed: 191, squash: [1.05, 0.55, 0.4], pos: [0, 0.6, -0.05], color: (xx, yy, zz, fr) => (yy > 0.62 ? 0xffb040 : 0xe8601a), faceVar: 0.18 }));
    }
    if (ri < 2) B.addGlow(beam({ a: [-w / 2 + 0.1, y1 + 0.005, 0.07], b: [w / 2 - 0.1, y1 + 0.01 + (frand(s, ri, 60) - 0.5) * 0.02, 0.07], w: 0.028, t: 0.025, color: 0xff6a1a, seed: 300 + ri, up: [0, 0, 1], wave: [0.01, 14], segs: 6 }));
  });
  // hearth rim + trough on top of the block (front half), coals
  for (const [x0, z0, x1, z1] of [[-0.75, 0.0, 0.75, 0.0], [-0.75, 0.0, -0.75, -0.7], [0.75, 0.0, 0.75, -0.7]]) {
    B.add(stone({ p: [(x0 + x1) / 2, 1.14, (z0 + z1) / 2 - (x0 === x1 ? 0 : 0)], s: [x0 === x1 ? 0.24 : Math.abs(x1 - x0) + 0.2, 0.2, z0 === z1 ? 0.24 : Math.abs(z1 - z0) + 0.2], seed: 160 + x0 * 3 + z1, color: ob(id++), jit: 0.1 }));
  }
  B.add(stone({ p: [0, 1.06, -0.4], s: [1.2, 0.08, 0.6], seed: 170, color: 0x120e10, jit: 0.05, bevel: 0 }));
  B.addGlow(blob({ r: 0.5, detail: 1, jit: 0.16, seed: 171, squash: [1.05, 0.14, 0.62], pos: [0, 1.12, -0.36], color: (x, y, z, fr) => (fr < 0.4 ? 0xffb040 : 0xe8601a), faceVar: 0.2 }));
  for (let i = 0; i < 5; i++) B.addGlow(blob({ r: 0.07, detail: 0, jit: 0.25, seed: 180 + i, squash: [1.2, 0.8, 1], pos: [-0.4 + i * 0.2 + (frand(s, i, 61) - 0.5) * 0.1, 1.2, -0.36 + (frand(s, i, 62) - 0.5) * 0.25], color: 0xffc050, faceVar: 0.15 }));
  // hood / chimney stack rising from the back of the block
  const hood = [[1.14, 0.42, 1.2, 0.7], [1.5, 0.32, 1.0, 0.55], [1.78, 0.3, 0.82, 0.45]];
  hood.forEach(([y, h, w, d], k) => {
    for (let i = 0; i < 2; i++) B.add(stone({ p: [(i - 0.5) * w * 0.5 + (frand(s, k * 2 + i, 63) - 0.5) * 0.06, y + h / 2, -0.62], s: [w * 0.52, h * 1.02, d], seed: 200 + k * 2 + i, color: ob(k * 2 + i + 9), jit: 0.14, rot: [0, (frand(s, k * 3 + i, 64) - 0.5) * 0.1, 0] }));
  });
  B.add(stone({ p: [0, 2.08, -0.62], s: [0.7, 0.14, 0.42], seed: 230, color: ob(3), jit: 0.1 }));
  B.addGlow(beam({ a: [-0.25, 1.66, -0.28], b: [0.3, 1.68, -0.27], w: 0.03, t: 0.02, color: 0xff7a24, seed: 5, up: [0, 0, 1], wave: [0.006, 18], segs: 4 }));
  // bellows (left): boards + leather + nozzle
  B.add(log({ a: [-1.12, -0.3, 0.05], b: [-1.12, 0.32, 0.05], r: 0.06, segs: 4, rows: 1, seed: 6, bark: PAL.wood[0], caps: 2 }));
  B.add(log({ a: [-0.85, -0.3, 0.05], b: [-0.85, 0.32, 0.05], r: 0.06, segs: 4, rows: 1, seed: 7, bark: PAL.wood[0], caps: 2 }));
  B.add(beam({ a: [-1.0, 0.35, 0.65], b: [-1.0, 0.38, -0.3], w: 0.36, t: 0.05, color: PAL.wood[3], seed: 8, up: [0, 1, 0], endCol: PAL.cutOld }));
  B.add(beam({ a: [-1.0, 0.62, 0.6], b: [-1.0, 0.44, -0.3], w: 0.36, t: 0.05, color: PAL.wood[1], seed: 9, up: [0, 1, 0], endCol: PAL.cutOld }));
  B.add(blob({ r: 0.2, detail: 0, jit: 0.15, seed: 10, squash: [1.0, 0.65, 1.7], pos: [-1.0, 0.48, 0.15], color: (x, y, z, fr) => shade(0x5a3a26, 0.85 + fr * 0.4), faceVar: 0.14 }));
  B.add(log({ a: [-1.0, 0.65, 0.62], b: [-1.0, 1.1, 0.62], r: 0.018, segs: 4, rows: 1, seed: 11, bark: PAL.wood[2], caps: 3 }));
  B.add(log({ a: [-0.98, 0.45, -0.32], b: [-0.6, 0.62, -0.3], r: 0.03, rt: 0.02, segs: 4, rows: 1, seed: 12, bark: PAL.ironLight, caps: 3 }));
  // anvil of black stone on a stump (front right)
  B.add(log({ a: [0.95, -0.3, 0.55], b: [0.95, 0.4, 0.55], r: 0.24, rt: 0.22, segs: 6, rows: 1, seed: 13, bark: 0x6a4e37, cap: 0xb59a72, caps: 2 }));
  B.add(stone({ p: [0.95, 0.5, 0.55], s: [0.42, 0.22, 0.28], seed: 240, color: OBS[2], jit: 0.08, bevel: 0.18 }));
  B.add(stone({ p: [0.95, 0.65, 0.55], s: [0.26, 0.14, 0.2], seed: 241, color: OBS[4], jit: 0.08, bevel: 0.1 }));
  B.add(stone({ p: [0.95, 0.77, 0.55], s: [0.66, 0.13, 0.28], seed: 242, color: OBS[3], jit: 0.06, bevel: 0.1 }));
  B.add(beam({ a: [1.2, 0.77, 0.55], b: [1.4, 0.75, 0.55], w: 0.22, t: 0.12, color: OBS[3], taper: 0.25, seed: 243, up: [0, 1, 0] }));
  B.add(log({ a: [0.55, 0.06, 0.85], b: [0.95, 0.06, 0.95], r: 0.012, segs: 4, rows: 1, seed: 14, bark: PAL.iron, caps: 3 }));
  B.add(log({ a: [0.8, 0.86, 0.5], b: [1.0, 0.86, 0.6], r: 0.014, segs: 4, rows: 1, seed: 15, bark: PAL.wood[2], caps: 3 }));
  B.addGlow(beam({ a: [0.96, 0.905, 0.5], b: [1.05, 0.905, 0.55], w: 0.06, t: 0.02, color: 0xff8030, seed: 3, up: [0, 1, 0] }));
  B.fireAnchor = [0, 1.25, -0.36];
  B.box(0, -0.35, 0.85, 0.55, 0); B.box(-1.0, 0.2, 0.32, 0.55, 0); B.circle(0.95, 0.55, 0.34);
  B.interact.use = { x: 0, z: 1.15 };
}

// ---- alchemy table --------------------------------------------------------------------------------------------------------------
export function alchemy(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.65, hd: 0.3, top: -0.05, bottom: -1, seed: 10, color: 0x33291f }));
  for (const [x, z] of [[-0.65, -0.28], [0.65, -0.28], [-0.65, 0.28], [0.65, 0.28]]) B.add(log({ a: [x + Math.sign(x) * 0.03, -1, z + Math.sign(z) * 0.03], b: [x, 0.86, z], r: 0.06, rt: 0.05, segs: 5, rows: 2, seed: (x * 7 + z * 3) | 0, bark: pick(PAL.wood, frand(s, x * 9 + z, 1)), caps: 2, wobble: 0.012 }));
  for (let i = 0; i < 3; i++) B.add(beam({ a: [-0.74, 0.885 + (frand(s, i, 2) - 0.5) * 0.01, -0.3 + i * 0.3], b: [0.74 - frand(s, i, 3) * 0.03, 0.885, -0.3 + i * 0.3], w: 0.29, t: 0.05 + frand(s, i, 4) * 0.015, color: pick(PAL.wood, frand(s, i, 5)), color2: PAL.wood[3], seed: i + 3, endCol: PAL.cutOld, up: [0, 1, 0] }));
  for (const z of [-0.28, 0.28]) B.add(beam({ a: [-0.65, 0.32, z], b: [0.65, 0.33, z], w: 0.08, t: 0.05, color: PAL.wood[2], seed: 9, up: [0, 0, 1], endCol: PAL.cutOld }));
  B.add(beam({ a: [-0.66, 0.36, -0.3], b: [0.66, 0.36, 0.3 - 0.6], w: 0.5, t: 0.03, color: pick(PAL.grey, 0.5), seed: 5, up: [0, 1, 0], endCol: PAL.cutOld }));
  // bottles: varied glass colours
  const bc = [0x3a7a52, 0x3a5a8a, 0x9a6a2a, 0x6a3a6a, 0x4a8a8a, 0x8a3a2a];
  for (let i = 0; i < 5; i++) {
    const x = -0.6 + i * 0.16 + (frand(s, i, 6) - 0.5) * 0.04, z = -0.18 + (frand(s, i, 7) - 0.5) * 0.14, h = 0.11 + frand(s, i, 8) * 0.07, c = bc[(i + s) % bc.length];
    B.add(log({ a: [x, 0.91, z], b: [x, 0.91 + h, z], r: 0.038 + frand(s, i, 9) * 0.014, rt: 0.032, segs: 6, rows: 1, seed: i, bark: c, bark2: shade(c, 1.3), caps: 2, wobble: 0.003, faceVar: 0.14 }));
    B.add(log({ a: [x, 0.91 + h, z], b: [x, 0.91 + h + 0.07, z], r: 0.016, rt: 0.013, segs: 5, rows: 1, seed: i + 9, bark: shade(c, 1.15), caps: 2, wobble: 0.002 }));
    B.add(log({ a: [x, 0.91 + h + 0.065, z], b: [x, 0.91 + h + 0.095, z], r: 0.015, segs: 4, rows: 1, seed: i + 19, bark: 0x9a7a52, caps: 2 }));
  }
  for (let i = 0; i < 2; i++) B.addGlow(blob({ r: 0.028, detail: 0, jit: 0.1, seed: 30 + i, squash: [1, 1.6, 1], pos: [-0.6 + (i * 2 + 1) * 0.16, 0.99 + i * 0.02, -0.18], color: i ? 0x70ffb0 : 0xa0e0ff, faceVar: 0.1 }));
  // mortar & pestle, cauldron, book
  B.add(blob({ r: 0.1, detail: 1, jit: 0.1, seed: 40, squash: [1, 0.7, 1], pos: [0.28, 0.96, 0.15], color: (x, y) => shade(0x8a8478, 0.85 + (y - 0.9) * 2), faceVar: 0.08 }));
  B.add(log({ a: [0.3, 0.98, 0.16], b: [0.2, 1.16, 0.06], r: 0.018, rt: 0.025, segs: 5, rows: 1, seed: 41, bark: 0x9a9284, caps: 3 }));
  B.add(blob({ r: 0.15, detail: 1, jit: 0.07, seed: 42, squash: [1, 0.85, 1], pos: [0.55, 1.0, 0.1], color: (x, y) => shade(0x2a2b2e, 0.7 + (y - 0.85) * 1.5), faceVar: 0.1 }));
  for (const a of [0.5, 2.6, 4.7]) B.add(log({ a: [0.55 + Math.cos(a) * 0.1, 0.9, 0.1 + Math.sin(a) * 0.1], b: [0.55 + Math.cos(a) * 0.12, 0.97, 0.1 + Math.sin(a) * 0.12], r: 0.02, segs: 4, rows: 1, seed: 45, bark: PAL.iron, caps: 2 }));
  B.addGlow(blob({ r: 0.115, detail: 0, jit: 0.1, seed: 43, squash: [1, 0.12, 1], pos: [0.55, 1.1, 0.1], color: 0x66e0a0, faceVar: 0.1 }));
  B.add(beam({ a: [-0.15, 0.915, 0.15], b: [0.05, 0.915, 0.14], w: 0.16, t: 0.035, color: 0x5a3a26, color2: 0x7a5a3a, seed: 46, up: [0, 1, 0] }));
  // herb rack behind the table
  for (const x of [-0.7, 0.7]) B.add(log({ a: [x, -1, -0.38], b: [x + (frand(s, x * 4, 10) - 0.5) * 0.04, 1.2, -0.38], r: 0.04, rt: 0.034, segs: 4, rows: 1, seed: 12, bark: PAL.wood[0], caps: 2 }));
  B.add(log({ a: [-0.8, 1.16, -0.38], b: [0.8, 1.17, -0.38], r: 0.03, segs: 4, rows: 2, seed: 13, bark: PAL.wood[1], caps: 3, bend: 0.02 }));
  for (let i = 0; i < 6; i++) {
    const x = -0.6 + i * 0.24 + (frand(s, i, 11) - 0.5) * 0.06, ln = 0.2 + frand(s, i, 12) * 0.14, c = pick(i % 3 ? PAL.leaf : PAL.dryLeaf, frand(s, i, 13));
    B.add(beam({ a: [x, 1.15, -0.38], b: [x, 1.15 - 0.06, -0.38], w: 0.012, t: 0.012, color: PAL.rope, seed: i, up: [0, 0, 1] }));
    B.add(blob({ r: 0.06, detail: 0, jit: 0.3, seed: 60 + i, squash: [0.75, ln / 0.06 * 0.5, 0.7], pos: [x, 1.09 - ln * 0.5, -0.38], color: (xx, y, z, fr) => shade(c, 0.8 + fr * 0.4), faceVar: 0.14 }));
  }
  B.box(0, 0, 0.78, 0.4, 0);
  B.interact.use = { x: 0, z: 0.8 };
}

// ---- chest -------------------------------------------------------------------------------------------------------------------------
export function chest(B) {
  const D = B.D, s = B.seed, L = B.level, open = B.state === 'open';
  B.add(anchor({ hw: 0.4, hd: 0.28, top: 0.0, bottom: -1, seed: 11, color: 0x33291f }));
  const W = 0.86, Dp = 0.54, H = 0.4;
  const body = [];
  // 4 walls of 2-3 planks each + bottom; open box (inside visible when the lid is up)
  for (let k = 0; k < 3; k++) {
    const y = 0.04 + k * 0.125 + 0.06, tone = pick(PAL.wood, frand(s, k, 1));
    for (const [z, sd] of [[Dp / 2, 1], [-Dp / 2, -1]]) if (!D.gone(20 + k + (sd > 0) * 3, 0.5)) body.push(beam({ a: [-W / 2 + 0.01, y, z], b: [W / 2 - 0.01, y + (frand(s, k + sd, 2) - 0.5) * 0.01, z + (frand(s, k, 3) - 0.5) * 0.01], w: 0.125, t: 0.04, color: tone, color2: shade(tone, 1.08), seed: k + sd * 5, endCol: PAL.cutOld, up: [0, 0, 1], jit: 0.05 }));
    for (const [x, sd] of [[W / 2, 1], [-W / 2, -1]]) if (!D.gone(30 + k + (sd > 0) * 3, 0.5)) body.push(beam({ a: [x, y, -Dp / 2 + 0.02], b: [x, y, Dp / 2 - 0.02], w: 0.125, t: 0.04, color: shade(tone, 0.95), seed: k + sd * 7, endCol: PAL.cutOld, up: [1, 0, 0], jit: 0.05 }));
  }
  body.push(beam({ a: [-W / 2 + 0.03, 0.05, 0], b: [W / 2 - 0.03, 0.05, 0], w: Dp - 0.06, t: 0.03, color: 0x3a2a1c, seed: 7, up: [0, 1, 0] }));
  for (const [x, z] of [[-W / 2, -Dp / 2], [W / 2, -Dp / 2], [-W / 2, Dp / 2], [W / 2, Dp / 2]]) body.push(beam({ a: [x, -0.02, z], b: [x, H + 0.03, z], w: 0.05, t: 0.05, color: PAL.wood[2], seed: (x * 5 + z * 3) | 0, endCol: PAL.cutOld, up: [1, 0, 1] }));
  // iron bands round the body (front + both sides) with a lock plate
  for (const x of [-0.27, 0.27]) if (!D.gone(40 + (x > 0), 0.5)) { body.push(beam({ a: [x, 0.02, Dp / 2 + 0.03], b: [x, H + 0.02, Dp / 2 + 0.03], w: 0.06, t: 0.02, color: PAL.iron, color2: PAL.ironLight, seed: 5, up: [0, 0, 1] })); }
  body.push(beam({ a: [-0.04, 0.16, Dp / 2 + 0.035], b: [0.04, 0.24, Dp / 2 + 0.035], w: 0.07, t: 0.02, color: PAL.ironLight, seed: 6, up: [0, 0, 1] }));
  // lid: arched (4 slats) + end caps, hinged at back-top edge
  const lid = [];
  const arc = [-62, -21, 21, 62], R = 0.27;
  arc.forEach((deg, k) => { const a = deg * Math.PI / 180, yy = Math.cos(a) * R * 0.9, zz = Math.sin(a) * R * 1.04; lid.push(beam({ a: [-W / 2 - 0.02, yy, zz], b: [W / 2 + 0.02, yy, zz], w: 0.16, t: 0.035, color: pick(PAL.wood, frand(s, k, 4)), color2: PAL.wood[3], seed: 50 + k, endCol: PAL.cutOld, up: [0, Math.cos(a), Math.sin(a)], jit: 0.06 })); });
  for (const x of [-W / 2 + 0.005, W / 2 - 0.005]) lid.push(stone({ p: [x, 0.09, 0], s: [0.04, 0.2, 0.6], seed: 60, color: PAL.wood[1], jit: 0.05, bevel: 0.3 }));
  for (const x of [-0.27, 0.27]) if (!D.gone(45 + (x > 0), 0.5)) lid.push(beam({ a: [x, 0.13, 0.3], b: [x, 0.13, -0.3], w: 0.06, t: 0.02, color: PAL.iron, seed: 8, up: [0, 1, 0], bow: 0.0, segs: 1, sagY: 0 }));
  lid.push(beam({ a: [-0.04, 0.05, 0.3], b: [0.04, 0.06, 0.3], w: 0.08, t: 0.03, color: PAL.ironLight, seed: 9, up: [0, 1, 0] }));
  let lidRot = 0;
  if (open) lidRot = -(Math.PI * 0.6) - (L >= 2 ? D.lean(70, 0, 1) * 1.2 : 0);
  else if (L >= 2) lidRot = -0.28 - D.lean(71, 0, 1);
  for (const g of lid) xf(g, { pos: [0, 0.42, 0] });
  rotAbout(lid, [0, 0.42, -Dp / 2], [lidRot, 0, L >= 2 ? D.lean(72, 0, 0.5) : 0]);
  B.add(body); B.add(lid);
  if (open) { for (let i = 0; i < 3; i++) B.add(blob({ r: 0.06 + frand(s, i, 12) * 0.03, detail: 0, jit: 0.25, seed: 80 + i, squash: [1.3, 0.5, 1], pos: [-0.2 + i * 0.2, 0.2, (frand(s, i, 13) - 0.5) * 0.2], color: i === 0 ? 0xc9a04a : i === 1 ? 0x8a6a4a : 0x9a9284, faceVar: 0.12 })); }
  rotAbout(B.parts, [0, 0, 0], [0, (frand(s, 1, 600) - 0.5) * 0.1, (frand(s, 2, 600) - 0.5) * 0.06]);   // sits a little crooked
  if (L >= 1) rubble(B.parts, { cx: 0, cz: 0.5, n: L, spread: 0.5, seed: 21 + s, kind: 'plank', size: 0.22 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 0.6) * 0.5, D.lean(2, 9, 0.5) * 0.4);
  B.box(0, 0, 0.47, 0.3, 0);
  B.interact.use = { x: 0, z: 0.6 };
}

// ---- drying rack -------------------------------------------------------------------------------------------------------------------
export function drying_rack(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.85, hd: 0.25, top: -0.05, bottom: -1, seed: 12, color: 0x33291f }));
  for (const sx of [-0.78, 0.78]) {
    const j = (frand(s, sx * 9, 1) - 0.5) * 0.06;
    for (const sz of [-1, 1]) B.add(log({ a: [sx + j, -1, sz * 0.36], b: [sx + j * 2, 1.62, sz * 0.025], r: 0.055, rt: 0.045, segs: 5, rows: 2, seed: (sx * 9 + sz) | 0, bark: pick(PAL.wood, frand(s, sx * 3 + sz, 2)), bark2: PAL.wood[3], caps: 2, wobble: 0.015 }));
    B.add(band({ c: [sx + j * 2, 1.55, 0.0], d: [0, 1, 0], r: 0.08, h: 0.07, color: PAL.rope, seed: sx * 5, segs: 5 }));
    B.add(log({ a: [sx + j, 0.08, -0.29], b: [sx + j, 0.1, 0.29], r: 0.03, segs: 4, rows: 1, seed: 8, bark: PAL.wood[2], caps: 3 }));
  }
  B.add(log({ a: [-1.02, 1.57, 0.0], b: [1.02, 1.58, 0.01], r: 0.038, rt: 0.032, segs: 5, rows: 3, seed: 9 + s, bark: PAL.wood[1], bark2: PAL.wood[3], caps: 3, wobble: 0.01, bend: 0.03 }));
  B.add(log({ a: [-0.95, 0.85, 0.0], b: [0.95, 0.86, 0.0], r: 0.026, segs: 4, rows: 2, seed: 10, bark: PAL.wood[0], caps: 3, bend: -0.02 }));
  // meat strips: dark red/brown, tapered, hanging from cords; a few hides
  for (let i = 0; i < 7; i++) {
    const x = -0.72 + i * 0.24 + (frand(s, i, 3) - 0.5) * 0.08, ln = 0.34 + frand(s, i, 4) * 0.3, y0 = 1.53;
    const c = pick([0x7a2f28, 0x8a3a30, 0x6a2a26, 0x8a4a38, 0x5a2a22], frand(s, i, 5));
    B.add(beam({ a: [x, y0, 0.0], b: [x + (frand(s, i, 6) - 0.5) * 0.05, y0 - ln, (frand(s, i, 7) - 0.5) * 0.04], w: 0.07 + frand(s, i, 8) * 0.04, t: 0.02 + frand(s, i, 9) * 0.02, taper: 0.55, color: shade(c, 1.15), color2: c, seed: 20 + i, up: [0, 0, 1], jit: 0.18, faceVar: 0.14 }));
    B.add(beam({ a: [x, y0 + 0.01, 0.0], b: [x, y0 - 0.07, 0.0], w: 0.01, t: 0.01, color: PAL.rope, seed: 3, up: [0, 0, 1] }));
  }
  for (let i = 0; i < 2; i++) {
    const x = -0.5 + i * 1.0 + (frand(s, i, 10) - 0.5) * 0.1;
    B.add(slab({ p: [V3(x - 0.2, 0.86, 0.03), V3(x + 0.2, 0.86, 0.03), V3(x + 0.26 + frand(s, i, 11) * 0.06, 0.28 + frand(s, i, 12) * 0.1, 0.03), V3(x - 0.24, 0.32, 0.03)], thick: 0.02, N: V3(0, 0, 1), color: pick(PAL.hide, frand(s, i, 13)), color2: 0xb8a078, seed: 30 + i, faceVar: 0.12 }));
  }
  for (let i = 0; i < 3; i++) B.add(blob({ r: 0.05, detail: 0, jit: 0.3, seed: 50 + i, squash: [1.4, 0.3, 1], pos: [-0.3 + i * 0.4, 0.03, 0.5], rot: [0, i, 0], color: 0x4a3a2a, faceVar: 0.14 }));   // drips / ash spots
  B.box(0, 0, 0.93, 0.3, 0);
  B.interact.use = { x: 0, z: 0.7 };
}

// ---- rain barrel ---------------------------------------------------------------------------------------------------------------------
export function rain_barrel(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.4, hd: 0.4, top: 0.0, bottom: -1, seed: 13, color: 0x33291f }));
  // stone/timber plinth
  for (let i = 0; i < 3; i++) B.add(stone({ p: [Math.cos(i * 2.1 + 0.4) * 0.28, 0.05, Math.sin(i * 2.1 + 0.4) * 0.28], s: [0.3, 0.16, 0.26], seed: 4 + i, color: pick(PAL.stone, frand(s, i, 1)), round: i === 1, moss: 0.4, rot: [0, i, 0] }));
  // staved body: bulging lathe, coloured per stave
  const prof = [[0.36, 0.06], [0.41, 0.3], [0.44, 0.52], [0.41, 0.76], [0.37, 0.96]], N = 12;
  const pos = [], colr = [];
  const P = (k, j) => { const a = (k / N) * TAU + 0.12 * (j % 2 ? 0 : 0), [rr, y] = prof[j], w = 1 + (frand(s, k * 9 + j, 2) - 0.5) * 0.04; return [Math.sin(a) * rr * w, y + (frand(s, k, 3) - 0.5) * 0.01, Math.cos(a) * rr * w]; };
  const cols = [PAL.wood[3], PAL.wood[0], PAL.grey[4], PAL.wood[1], PAL.wood[5], PAL.grey[0]];
  for (let k = 0; k < N; k++) {
    const tone = new THREE.Color(cols[(k * 5 + s) % cols.length]).multiplyScalar(0.92 + frand(s, k, 4) * 0.2);
    for (let j = 0; j < prof.length - 1; j++) {
      const a = P(k, j), b = P(k + 1, j), c = P(k + 1, j + 1), d = P(k, j + 1);
      for (const t of [a, b, c, a, c, d]) { pos.push(...t); colr.push(tone.r, tone.g, tone.b); }
    }
  }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  // inner wall (reverse winding) so the open top shows staves from inside
  const pos2 = [], col2 = [];
  for (let i = 0; i < pos.length; i += 9) { pos2.push(pos[i], pos[i + 1], pos[i + 2], pos[i + 6], pos[i + 7], pos[i + 8], pos[i + 3], pos[i + 4], pos[i + 5]); for (let k = 0; k < 3; k++) col2.push(0.2, 0.15, 0.1); }
  B.add(finish(bg));
  const ig = new THREE.BufferGeometry(); ig.setAttribute('position', new THREE.Float32BufferAttribute(pos2.map((v, i) => (i % 3 === 1 ? v : v * 0.93)), 3)); ig.setAttribute('color', new THREE.Float32BufferAttribute(col2, 3)); B.add(finish(ig));
  for (const [y, rr] of [[0.2, 0.395], [0.5, 0.447], [0.86, 0.395]]) B.add(band({ c: [0, y, 0], d: [0, 1, 0], r: rr, h: 0.055, color: PAL.iron, seed: y * 9, segs: 12 }));
  B.add(band({ c: [0, 0.95, 0], d: [0, 1, 0], r: 0.375, h: 0.05, color: shade(PAL.wood[3], 0.9), seed: 7, segs: 12 }));
  B.add(blob({ r: 0.34, detail: 1, jit: 0.04, seed: 8, squash: [1, 0.03, 1], pos: [0, 0.83, 0], color: (x, y, z, fr) => (fr < 0.5 ? 0x2f5a66 : 0x3a6a72), faceVar: 0.1 }));
  // leaf canopy on two posts with a gutter feeding the barrel
  for (const sx of [-0.46, 0.46]) {
    B.add(log({ a: [sx, -1, -0.42], b: [sx + (frand(s, sx * 9, 5) - 0.5) * 0.04, 1.28, -0.42], r: 0.045, rt: 0.04, segs: 5, rows: 1, seed: 20 + (sx > 0), bark: PAL.wood[0], caps: 2, wobble: 0.01 }));
    B.add(log({ a: [sx, -1, 0.42], b: [sx, 0.98, 0.42], r: 0.04, rt: 0.036, segs: 5, rows: 1, seed: 30 + (sx > 0), bark: PAL.wood[2], caps: 2 }));
  }
  B.add(beam({ a: [-0.55, 1.24, -0.42], b: [0.55, 1.25, -0.42], w: 0.05, t: 0.05, color: PAL.wood[1], seed: 40, up: [0, 0, 1], endCol: PAL.cutOld }));
  B.add(beam({ a: [-0.55, 0.96, 0.42], b: [0.55, 0.97, 0.42], w: 0.05, t: 0.05, color: PAL.wood[1], seed: 41, up: [0, 0, 1], endCol: PAL.cutOld }));
  B.add(roofSlope({ O: V3(-0.56, 0.94, 0.5), U: V3(1.12, 0, 0), V: V3(0, 0.33, -1.0), out: V3(0, 1, 0.3), nu: 1, nv: 1, rows: 4, tw: 0.3, drop: 0.36, thick: 0.05, seed: 3 + s, colors: [...PAL.leaf, 0x6a8a3a], baseColor: 0x4a5a2a, ragged: 0.5, droop: 0.1 }));
  B.add(beam({ a: [0.0, 0.93, 0.5], b: [0.0, 0.8, 0.2], w: 0.16, t: 0.03, color: PAL.wood[3], seed: 44, up: [0, 0, 1], taper: 0.5, endCol: PAL.cutOld }));   // gutter/funnel plank
  B.add(log({ a: [0.0, 0.9, 0.16], b: [0.0, 0.8, 0.16], r: 0.14, rt: 0.04, segs: 6, rows: 1, seed: 45, bark: 0x6a5238, caps: 0 }));
  B.circle(0, 0, 0.5);
  B.interact.use = { x: 0, z: 0.85 };
}

// ---- garden ---------------------------------------------------------------------------------------------------------------------------
export function garden(B) {
  const s = B.seed, r = B.r, g = B.growth;   // 0..1 (quantised to 6 steps)
  B.add(anchor({ hw: 1.05, hd: 1.05, top: -0.05, bottom: -1, seed: 14, color: 0x33291f }));
  // log border: 2 stacked crooked logs per side, corner stakes
  const S = 1.12;
  [[-S, -S, S, -S], [S, -S, S, S], [S, S, -S, S], [-S, S, -S, -S]].forEach(([x0, z0, x1, z1], i) => {
    const dx = Math.sign(x1 - x0), dz = Math.sign(z1 - z0);
    for (let k = 0; k < 2; k++) B.add(log({ a: [x0 - dx * 0.08, 0.11 + k * 0.19 + (frand(s, i * 2 + k, 1) - 0.5) * 0.02, z0 - dz * 0.08], b: [x1 + dx * 0.08, 0.11 + k * 0.19 + (frand(s, i * 2 + k, 2) - 0.5) * 0.03, z1 + dz * 0.08], r: 0.1 + frand(s, i * 2 + k, 3) * 0.03, rt: 0.09 + frand(s, i * 2 + k, 4) * 0.02, segs: 5, rows: 2, seed: i * 3 + k + s, bark: pick(PAL.log, frand(s, i * 2 + k, 5)), bark2: PAL.log[1], cap: PAL.cutOld, caps: 3, wobble: 0.02, bend: (frand(s, i, 6) - 0.5) * 0.05 }));
  });
  for (const [x, z] of [[-S, -S], [S, -S], [S, S], [-S, S]]) B.add(log({ a: [x, -1, z], b: [x + (frand(s, x * 5 + z, 7) - 0.5) * 0.03, 0.62 + frand(s, x + z * 7, 8) * 0.12, z], r: 0.065, rt: 0.045, segs: 5, rows: 1, seed: (x * 4 + z) | 0, bark: PAL.wood[0], bark2: PAL.wood[3], cap: PAL.cut, caps: 2 }));
  // soil bed with furrows
  B.add(stone({ p: [0, 0.16, 0], s: [2.05, 0.28, 2.05], seed: 20, color: 0x3d2f22, jit: 0.05, bevel: 0.03, faceVar: 0.12 }));
  const rowsX = [-0.7, -0.23, 0.24, 0.72];
  rowsX.forEach((x, i) => B.add(blob({ r: 0.2, detail: 1, jit: 0.15, seed: 30 + i, squash: [0.5, 0.22, 4.7], pos: [x, 0.3, 0], color: (px, py, pz, fr) => shade(0x5a4632, 0.75 + fr * 0.5), faceVar: 0.14 })));
  // plants: herb rows (front 3 rows) and berry bushes (back row)
  const gg = clamp(g), k = gg;
  if (gg > 0.02) {
    const herb = (x, z, sz, seed) => {
      const n = gg < 0.3 ? 2 : 5;
      for (let j = 0; j < n; j++) {
        const a = (j / n) * TAU + frand(s, seed, 10 + j) * 0.8, len = (0.1 + 0.3 * sz) * (0.85 + frand(s, seed, 20 + j) * 0.3);
        B.add(leaf({ len, w: 0.045 + 0.05 * sz, droop: 0.5 + 0.5 * sz, seg: 1, seed: seed + j, colorBase: 0x3e7a30, colorTip: gg > 0.75 ? 0x86b04a : 0x6aa640, pos: [x, 0.36, z], rot: [-0.9 - 0.35 * sz, a, 0], faceVar: 0.1 }));
      }
    };
    let idx = 0;
    for (const x of [-0.7, -0.23, 0.24]) for (let zz = 0; zz < 3; zz++) {
      const z = -0.05 + zz * 0.55 - 0.3 + 0.3, sz = clamp(gg * (0.75 + frand(s, idx, 30) * 0.5));
      if (gg < 0.99 && frand(s, idx, 31) < 0.15) { idx++; continue; }
      herb(x + (frand(s, idx, 32) - 0.5) * 0.08, z + 0.15 + (frand(s, idx, 33) - 0.5) * 0.12, sz, 100 + idx * 7); idx++;
    }
    // berry bushes along the back furrow
    for (let b = 0; b < 3; b++) {
      const bz = -0.75 + b * 0.62 + (frand(s, b, 40) - 0.5) * 0.15, bx = 0.74, sz = clamp((gg - 0.15) / 0.85);
      if (sz <= 0.02) break;
      const rad = 0.06 + 0.2 * sz;
      B.add(blob({ r: rad, detail: 0, jit: 0.3, seed: 120 + b, squash: [1.1, 0.9, 1.1], pos: [bx, 0.32 + rad * 0.7, bz], color: (x, y, z, fr) => shade(pick(PAL.leaf, fr), 0.9), faceVar: 0.14 }));
      if (sz > 0.45) B.add(blob({ r: rad * 0.7, detail: 0, jit: 0.3, seed: 130 + b, squash: [1, 0.9, 1], pos: [bx + 0.1, 0.32 + rad * 0.5, bz + 0.09], color: (x, y, z, fr) => shade(pick(PAL.leaf, fr), 1.0), faceVar: 0.14 }));
      if (gg > 0.85) for (let q = 0; q < 4; q++) { const a = frand(s, b * 9 + q, 41) * TAU, e = 0.2 + frand(s, b * 9 + q, 42) * 0.7; B.add(blob({ r: 0.03, detail: 0, jit: 0.15, seed: 140 + b * 5 + q, pos: [bx + Math.cos(a) * rad * 1.02 * Math.cos(e), 0.32 + rad * 0.7 + Math.sin(e) * rad * 0.9, bz + Math.sin(a) * rad * 1.02 * Math.cos(e)], color: q % 3 ? 0xc0243a : 0x8c1f4a, faceVar: 0.1 })); }
    }
  } else {
    for (let i = 0; i < 6; i++) B.add(blob({ r: 0.02, detail: 0, jit: 0.2, seed: 150 + i, squash: [1, 0.6, 1], pos: [rowsX[i % 4] + (frand(s, i, 50) - 0.5) * 0.06, 0.33, -0.7 + i * 0.28], color: 0xcfb96a, faceVar: 0.1 }));
  }
  // a marker stick with a rag
  B.add(log({ a: [-0.95, -0.2, 1.0], b: [-0.95, 0.75, 1.0], r: 0.02, segs: 4, rows: 1, seed: 6, bark: PAL.wood[1], caps: 2 }));
  B.add(beam({ a: [-0.95, 0.72, 1.0], b: [-0.95, 0.5, 1.02], w: 0.1, t: 0.005, taper: 0.4, color: 0xb0a080, seed: 5, up: [1, 0, 0] }));
  B.box(0, 0, 1.2, 1.2, 0);
  B.interact.use = { x: 0, z: 1.55 };
}

// ---- lantern post ---------------------------------------------------------------------------------------------------------------------
export function lantern_post(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.22, hd: 0.22, top: 0.0, bottom: -1, seed: 15, color: 0x33291f }));
  for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.5; B.add(stone({ p: [Math.cos(a) * 0.17, 0.08, Math.sin(a) * 0.17], s: [0.22, 0.2, 0.2], seed: 4 + i, color: pick(PAL.stone, frand(s, i, 1)), round: i % 2 === 0, rot: [0, a, 0], moss: 0.4 })); }
  B.add(log({ a: [0, -1, 0], b: [0.03, 2.3, -0.01], r: 0.095, rt: 0.065, segs: 5, rows: 4, seed: 3 + s, bark: PAL.log[0], bark2: PAL.log[3], caps: 2, wobble: 0.02, bend: 0.05, cap: PAL.cut }));
  B.add(beam({ a: [0.03, 2.02, 0.0], b: [0.55, 2.06, 0.0], w: 0.07, t: 0.06, color: PAL.wood[2], seed: 5, up: [0, 0, 1], endCol: PAL.cutOld, taper: 0.8 }));
  B.add(beam({ a: [0.03, 1.6, 0.0], b: [0.36, 2.0, 0.0], w: 0.05, t: 0.05, color: PAL.wood[0], seed: 6, up: [0, 0, 1], endCol: PAL.cutOld }));
  B.add(band({ c: [0.06, 2.03, 0], d: [0, 1, 0], r: 0.08, h: 0.06, color: PAL.rope, seed: 8, segs: 5 }));
  // hook + chain + lantern (iron frame, glowing housing)
  const lx = 0.5;
  B.add(beam({ a: [lx, 2.05, 0.0], b: [lx, 1.96, 0.0], w: 0.02, t: 0.02, color: PAL.iron, seed: 3 }));
  for (let i = 0; i < 2; i++) B.add(beam({ a: [lx + (i % 2) * 0.008, 1.96 - i * 0.06, 0], b: [lx, 1.9 - i * 0.06, 0], w: 0.022, t: 0.02, color: PAL.ironLight, seed: 10 + i }));
  B.add(log({ a: [lx, 1.78, 0], b: [lx, 1.9, 0], r: 0.075, rt: 0.02, segs: 5, rows: 1, seed: 20, bark: PAL.iron, bark2: PAL.ironLight, caps: 0 }));
  B.add(log({ a: [lx, 1.58, 0], b: [lx, 1.6, 0], r: 0.085, segs: 5, rows: 1, seed: 21, bark: PAL.iron, caps: 3 }));
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4 + 0.4; B.add(beam({ a: [lx + Math.cos(a) * 0.085, 1.6, Math.sin(a) * 0.085], b: [lx + Math.cos(a) * 0.075, 1.79, Math.sin(a) * 0.075], w: 0.018, t: 0.018, color: PAL.iron, seed: 30 + k })); }
  B.addGlow(blob({ r: 0.075, detail: 1, jit: 0.1, seed: 40, squash: [0.9, 1.35, 0.9], pos: [lx, 1.69, 0], color: (x, y, z, fr) => (y > 1.7 ? 0xffd070 : 0xffa030), faceVar: 0.1 }));
  B.fireAnchor = [lx, 1.7, 0];
  B.circle(0, 0, 0.16);
  B.interact.use = { x: 0, z: 0.5 };
}

export const builders = { workbench, furnace, forge, alchemy, chest, drying_rack, rain_barrel, garden, lantern_post };
