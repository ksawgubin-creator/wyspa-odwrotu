// Fortifications: palisade_wall, stone_wall, spike_wall (all 2.0 m modules, snap end-to-end along local X),
// gate (closed/open) and watchtower. Local +Z = outside/front. Damage: pieces removed/tilted/broken via B.D,
// wall openings via wearOpenings (holes + crown collapse), rubble at the base, whole-structure lean via shear().
import { blob, stone, log, beam, band, anchor, slab, roofSlope, subtract, shear, wearOpenings, masonry, rubble, xf, PAL, pick, shade, lerp, clamp, TAU, V3, frand, stake } from './kit.js';

const ROPE = PAL.rope;
const spike = ({ a, b, r = 0.08, seed = 1, bark = 0x6b4a33, cap = PAL.cut }) => log({ a, b, r, rt: 0.012, segs: 5, rows: 1, seed, bark, bark2: shade(cap, 0.92), caps: 1, wobble: 0.01, jit: 0.08, faceVar: 0.12 });

// ---- palisade ---------------------------------------------------------------------------------------------------------------
export function palisade_wall(B) {
  const r = B.r, D = B.D, s = B.seed, L = B.level, N = 8;
  const fallen = [];
  B.add(anchor({ hw: 0.9, hd: 0.2, top: -0.2, bottom: -1, seed: 2, color: 0x33291f }));
  for (let i = 0; i < N; i++) {
    const x = -0.905 + i * (1.81 / (N - 1)) + (frand(s, i, 1) - 0.5) * 0.05, rad = 0.115 + frand(s, i, 2) * 0.075;
    const zc = (i % 2 ? 0.085 : -0.085) + (frand(s, i, 3) - 0.5) * 0.05;
    const h = 2.3 + frand(s, i, 4) * 0.5 + (i % 3 === 1 ? 0.0 : 0.0);
    const bark = pick(frand(s, i, 5) < 0.25 ? PAL.grey : PAL.log, frand(s, i, 6));
    if (D.gone(i, 0.9)) { if (L >= 2 && frand(s, i, 7) < 0.6) fallen.push([x, zc, rad]); continue; }
    const lx = D.lean(i, 0, 1) / 2 + (frand(s, i, 8) - 0.5) * 0.035, lz = D.lean(i, 1, 0.9) / 2 + (frand(s, i, 9) - 0.5) * 0.02;
    if (D.broken(i, 0.95)) {
      const hb = h * (0.35 + frand(s, i, 10) * 0.35), top = [x + lx * (hb + 1), hb, zc + lz * (hb + 1)];
      B.add(log({ a: [x, -1, zc], b: top, r: rad, rt: rad * 0.85, segs: 5, rows: 1, seed: i + s * 9, bark, bark2: shade(bark, 1.08), cap: PAL.cut, caps: 2, wobble: 0.015 }));
      // jagged splinter
      B.add(log({ a: [top[0] + 0.03, hb - 0.02, top[2]], b: [top[0] + 0.1 + lx * 2, hb + 0.3 + frand(s, i, 11) * 0.25, top[2] + 0.03], r: rad * 0.55, rt: 0.01, segs: 4, rows: 1, seed: i + 60, bark: PAL.cutOld, caps: 0, jit: 0.15 }));
      if (L >= 2 && frand(s, i, 12) < 0.7) fallen.push([x + 0.1, zc, rad * 0.9, h - hb]);
      continue;
    }
    B.add(stake({ x, z: zc, y0: -1, y1: h, r: rad, lean: [lx, lz], seed: i + s * 9, bark, tip: 0.3 + frand(s, i, 13) * 0.15 }));
  }
  // horizontal rails at the back, bound to the logs with rope (rope hangs slack between logs)
  const rails = [0.65, 1.7];
  rails.forEach((y, k) => {
    const gone = D.gone(50 + k, 0.5), yy = y + (frand(s, k, 20) - 0.5) * 0.1;
    if (!gone) B.add(beam({ a: [-1.0, yy, -0.27], b: [1.0, yy + (frand(s, k, 21) - 0.5) * 0.12 + D.lean(70 + k, 0, 0.4), -0.27], w: 0.1, t: 0.08, color: pick(PAL.wood, frand(s, k, 22)), seed: 5 + k, bow: 0.02, endCol: PAL.cutOld, up: [0, 0, 1] }));
    if (!D.gone(52 + k, 0.7)) {
      const x0 = D.gone(54 + k, 0.4) ? 0.1 : -0.98, y2 = yy + 0.04;
      B.add(beam({ a: [x0, y2, 0.29], b: [0.98, y2 + (frand(s, k, 23) - 0.5) * 0.06, 0.29], w: 0.045, t: 0.05, color: k ? PAL.rope : PAL.ropeDark, seed: 9 + k, wave: [0.028, 12.5], segs: Math.round((0.98 - x0) * 4), up: [0, 0, 1], faceVar: 0.15 }));
    }
  });
  // stones wedged at the foot, an odd knot of rope on the end log
  for (let i = 0; i < 3; i++) B.add(stone({ p: [-0.75 + i * 0.7 + (frand(s, i, 30) - 0.5) * 0.2, 0.06, 0.32 + frand(s, i, 31) * 0.05], s: [0.3, 0.2, 0.22], seed: 40 + i, color: pick(PAL.stone, frand(s, i, 32)), rot: [0, frand(s, i, 33), 0], round: true, moss: 0.4 }));
  for (const [x, z, rad, len] of fallen) {
    const a = frand(s, x * 10, 34) * TAU, l = len ?? (1.6 + frand(s, x * 7, 35) * 0.8), sd = frand(s, x * 3, 36) < 0.5 ? 1 : -1;
    B.add(log({ a: [x + Math.cos(a) * 0.1, rad * 0.9, sd * (0.5 + 0.2 * frand(s, x, 37)) + Math.sin(a) * 0.1], b: [x + Math.cos(a) * l * 0.9, rad * 0.9 + 0.03, sd * (0.6 + 0.6 * frand(s, x * 2, 38)) + Math.sin(a) * l * 0.4], r: rad, rt: rad * 0.8, segs: 5, rows: 1, seed: (x * 40) | 0, bark: pick(PAL.log, frand(s, x, 39)), caps: 3 }));
  }
  if (L >= 3) rubble(B.parts, { cx: 0, cz: 0, n: 3, spread: 0.9, seed: 11 + s, kind: 'plank', size: 0.35 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 0.5), D.lean(2, 9, 0.35));
  B.box(0, 0, 1.0, 0.3, 0);
}

// ---- stone wall --------------------------------------------------------------------------------------------------------------
function stoneBase(B, { H, d, seed, holes = 1, crown = 1 }) {
  const L = B.level, D = B.D, s = B.seed;
  const open = wearOpenings({ seed: s * 13 + seed, level: L, len: 2.0, H, holes, holeW: 0.55, holeH: 0.65, crown, steps: 4 });
  return masonry({ len: 2.0, H, d, seed: s * 31 + seed, openings: open, minW: 0.5, maxW: 1.0, minH: 0.42, maxH: 0.62, D, idBase: 100 * seed, colors: PAL.stone, moss: 0.45, firstTop: 0.36, cap: true, stagger: 0.3 });
}
export function stone_wall(B) {
  const D = B.D, s = B.seed, L = B.level;
  B.add(stoneBase(B, { H: 2.6, d: 0.7, seed: 1, holes: 1 }));
  for (let i = 0; i < 3; i++) B.add(stone({ p: [-0.7 + i * 0.7 + (frand(s, i, 30) - 0.5) * 0.3, 0.09, 0.44 + frand(s, i, 31) * 0.1], s: [0.32, 0.22, 0.26], seed: 40 + i, color: pick(PAL.stone, frand(s, i, 32)), rot: [0, frand(s, i, 33), 0], round: true, moss: 0.5 }));
  if (L >= 1) rubble(B.parts, { cx: 0, cz: 0.75, n: L * 2 + 1, spread: 0.9, seed: 21 + s, kind: 'stone', size: 0.34 });
  if (L >= 2) rubble(B.parts, { cx: 0, cz: -0.75, n: L * 2, spread: 0.9, seed: 31 + s, kind: 'stone', size: 0.34 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 0.25), D.lean(2, 9, 0.2));
  B.box(0, 0, 1.0, 0.38, 0);
}

// ---- spike wall ---------------------------------------------------------------------------------------------------------------
export function spike_wall(B) {
  const D = B.D, s = B.seed, L = B.level, r = B.r;
  B.add(stoneBase(B, { H: 1.9, d: 0.72, seed: 2, holes: 1, crown: 0.7 }));
  let n = 0;
  for (const [yb, tipY, tipZ, cnt] of [[0.95, 2.2, 0.95, 6], [1.45, 2.78, 0.8, 5]]) {
    for (let i = 0; i < cnt; i++) {
      const id = n++;
      const x = -0.85 + (i + (cnt === 5 ? 0.5 : 0)) * (1.7 / (cnt - 1 + (cnt === 5 ? 1 : 0))) + (frand(s, id, 1) - 0.5) * 0.08;
      if (D.gone(id, 0.9)) continue;
      const bent = D.lean(id, 0, 1.2) * 1.5, len = D.broken(id, 0.6) ? 0.45 : 1.0;
      const tx = x + (frand(s, id, 2) - 0.5) * 0.18 + bent, ty = lerp(yb, tipY + (frand(s, id, 3) - 0.5) * 0.15, len), tz = lerp(0.0, tipZ + (frand(s, id, 4) - 0.5) * 0.12, len) - D.lean(id, 1, 1) * 0.6;
      B.add(spike({ a: [x, yb, -0.1], b: [tx, ty, tz], r: 0.085 + frand(s, id, 5) * 0.03, seed: id + 1 + s * 7, bark: pick(PAL.log, frand(s, id, 6)) }));
      if (len === 1.0 && frand(s, id, 7) < 0.85) {   // iron barb
        const t = 0.62, px = lerp(x, tx, t), py = lerp(yb, ty, t), pz = lerp(-0.1, tz, t), sd = frand(s, id, 8) < 0.5 ? 1 : -1;
        B.add(log({ a: [px, py, pz], b: [px + sd * 0.17, py - 0.09, pz + 0.06], r: 0.022, rt: 0.004, segs: 3, rows: 1, seed: id, bark: PAL.iron, bark2: PAL.ironLight, caps: 1 }));
      }
    }
  }
  // iron strap across the spike bases + stones at the foot
  if (!D.gone(80, 0.6)) B.add(beam({ a: [-0.98, 1.22, 0.4], b: [0.98, 1.24, 0.4], w: 0.09, t: 0.045, color: PAL.iron, color2: PAL.ironLight, seed: 8, up: [0, 0, 1], wave: [0.02, 9], segs: 6 }));
  for (let i = 0; i < 3; i++) B.add(stone({ p: [-0.7 + i * 0.7 + (frand(s, i, 30) - 0.5) * 0.3, 0.09, 0.5 + frand(s, i, 31) * 0.1], s: [0.32, 0.22, 0.26], seed: 40 + i, color: pick(PAL.stone, frand(s, i, 32)), rot: [0, frand(s, i, 33), 0], round: true, moss: 0.5 }));
  if (L >= 1) rubble(B.parts, { cx: 0, cz: 1.0, n: L * 2, spread: 0.8, seed: 21 + s, kind: 'stone', size: 0.32 });
  if (L >= 2) rubble(B.parts, { cx: 0, cz: -0.7, n: L * 2, spread: 0.9, seed: 31 + s, kind: 'plank', size: 0.34 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 0.25), D.lean(2, 9, 0.2));
  B.box(0, 0.1, 1.0, 0.5, 0);
}

// ---- gate ---------------------------------------------------------------------------------------------------------------------
function gateLeaf(B, sgn, k) {
  // leaf built with the hinge at the origin, extending along sgn*x (0..0.95); 5 uneven planks, 3 cross bars, brace, iron straps
  const D = B.D, s = B.seed, parts = [];
  const cols = [PAL.wood[3], PAL.grey[0], PAL.wood[1], PAL.grey[1], PAL.wood[5]];
  for (let i = 0; i < 5; i++) {
    const id = 300 + k * 10 + i;
    if (D.gone(id, 0.9)) continue;
    const x = sgn * (0.09 + i * 0.19), h = 2.28 + frand(s, id, 1) * 0.22 - (D.broken(id, 0.8) ? 0.5 : 0);
    parts.push(beam({ a: [x, 0.04 + frand(s, id, 2) * 0.03, 0.0], b: [x + (frand(s, id, 3) - 0.5) * 0.03 + D.lean(id, 0, 0.3), h, 0.0], w: 0.185 - frand(s, id, 4) * 0.02, t: 0.07 + frand(s, id, 5) * 0.02, color: pick(cols, frand(s, id, 6)), taper: 0.94, seed: id, endCol: PAL.cutOld, up: [0, 0, 1], jit: 0.1 }));
  }
  for (const [y, w] of [[0.45, 0.14], [1.2, 0.14], [2.0, 0.14]]) {
    const id = 340 + k * 5 + (y * 3 | 0);
    if (D.gone(id, 0.5)) continue;
    parts.push(beam({ a: [sgn * 0.0, y, 0.085], b: [sgn * 0.97, y + (frand(s, id, 7) - 0.5) * 0.05, 0.085], w, t: 0.06, color: pick(PAL.wood, frand(s, id, 8)), seed: id, endCol: PAL.cutOld, up: [0, 0, 1] }));
  }
  if (!D.gone(360 + k, 0.5)) parts.push(beam({ a: [sgn * 0.05, 0.5, 0.12], b: [sgn * 0.92, 1.95, 0.12], w: 0.12, t: 0.05, color: PAL.wood[2], seed: 7 + k, endCol: PAL.cutOld, up: [0, 0, 1] }));
  for (const y of [0.75, 1.72]) if (!D.gone(370 + k * 3 + (y * 2 | 0), 0.6)) parts.push(beam({ a: [sgn * 0.0, y, 0.135], b: [sgn * 0.78, y, 0.135], w: 0.1, t: 0.03, color: PAL.iron, color2: PAL.ironLight, seed: 12 + k, taper: 0.7, up: [0, 0, 1] }));
  return parts;
}
export function gate(B) {
  const D = B.D, s = B.seed, L = B.level, open = B.state === 'open', r = B.r;
  const px = 1.15;
  for (const sx of [-1, 1]) {
    const id = 390 + (sx > 0), lean = D.lean(id, 0, 0.5);
    B.add(log({ a: [sx * px, -1, 0], b: [sx * px + lean * 4, 2.72, 0], r: 0.22, rt: 0.2, segs: 6, rows: 2, seed: 4 + (sx > 0) + s, bark: pick(PAL.log, frand(s, id, 1)), bark2: shade(PAL.log[0], 1.05), caps: 2, wobble: 0.02, jit: 0.08 }));
    B.add(spike({ a: [sx * px + lean * 4, 2.68, 0], b: [sx * px + lean * 4.2, 3.02, 0.02], r: 0.2, seed: 9 + (sx > 0), bark: PAL.cutOld }));
    for (const y of [0.55, 1.45, 2.4]) B.add(band({ c: [sx * px + lean * (y + 1), y, 0], d: [0, 1, 0], r: 0.235 - y * 0.008, h: 0.09, color: y === 1.45 ? PAL.iron : ROPE, seed: y * 7 + sx, segs: 6 }));
    for (let i = 0; i < 3; i++) B.add(stone({ p: [sx * (px + 0.02) + Math.cos(i * 2.1 + sx) * 0.3, 0.1, Math.sin(i * 2.1 + sx) * 0.3], s: [0.34, 0.24, 0.3], seed: 50 + i + (sx > 0) * 5, color: pick(PAL.stone, frand(s, i + sx, 2)), rot: [0, i, 0], round: i > 0, moss: 0.4 }));
    B.add(anchor({ x: sx * px, hw: 0.32, hd: 0.32, top: -0.05, bottom: -1, seed: 5, color: 0x33291f }));
  }
  if (!D.gone(393, 0.35)) B.add(log({ a: [-1.5, 2.7, 0.02], b: [1.5, 2.78 + D.lean(394, 0, 0.6), -0.02], r: 0.13, rt: 0.12, segs: 5, rows: 2, seed: 6 + s, bark: pick(PAL.log, 0.6), bark2: PAL.log[2], caps: 3, wobble: 0.03 }));
  for (const sx of [-1, 1]) if (!D.gone(395 + (sx > 0), 0.6)) B.add(beam({ a: [sx * 1.0, 2.2, 0.0], b: [sx * 0.55, 2.68, 0.0], w: 0.11, t: 0.09, color: PAL.wood[2], seed: 3, endCol: PAL.cutOld, up: [0, 0, 1] }));
  // leaves
  const pivot = { l: -0.93, r: 0.93 };
  for (const sgn of [1, -1]) {
    const hingeX = sgn > 0 ? pivot.l : pivot.r;
    const parts = gateLeaf(B, sgn, sgn > 0 ? 0 : 1);
    let ang = 0;
    if (open) ang = sgn * (Math.PI / 2 - 0.16 - frand(s, sgn, 40) * 0.1);
    else if (L >= 2) ang = sgn * D.lean(41 + (sgn > 0), 0, 3);
    const zz = open ? -0.05 : 0.0;
    for (const g of parts) xf(g, { pos: [hingeX, 0, zz], rot: [0, ang, L >= 2 ? D.lean(45 + sgn, 0, 0.4) : 0] });
    B.add(parts);
  }
  if (!open) {
    if (!D.gone(398, 0.4)) B.add(beam({ a: [-0.52, 1.18, 0.2], b: [0.52, 1.2, 0.2], w: 0.1, t: 0.07, color: PAL.wood[0], seed: 3, endCol: PAL.cutOld, up: [0, 0, 1] }));   // bolt bar
  } else {
    B.add(stone({ p: [0, -0.02, 0], s: [1.7, 0.1, 0.9], color: 0x5a4a36, jit: 0.05, bevel: 0.05, seed: 3 }));
  }
  if (L >= 2) rubble(B.parts, { cx: 0, cz: 0.7, n: L, spread: 1.0, seed: 61 + s, kind: 'plank', size: 0.4 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 0.3), D.lean(2, 9, 0.2));
  B.circle(-px, 0, 0.25); B.circle(px, 0, 0.25);
  if (!open) B.box(0, 0, 0.93, 0.13, 0);
  B.interact.door = { x: 0, z: 0.5 };
}

// ---- watchtower ----------------------------------------------------------------------------------------------------------------
export function watchtower(B) {
  const D = B.D, s = B.seed, L = B.level, r = B.r;
  const LEG = 1.3, TOP = 5.0, PLAT = 4.8, dx = (y) => 1.34 - (Math.max(y, 0) / TOP) * 0.24;
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const legPt = (i, y) => { const [sx, sz] = legs[i], d = dx(y); return [sx * d, y, sz * d]; };
  const lean = (i, k) => D.lean(600 + i, k, 1.0);
  B.label = 'legs';
  legs.forEach(([sx, sz], i) => {
    B.add(log({ a: legPt(i, -1), b: legPt(i, TOP + 0.1), r: 0.185, rt: 0.135, segs: 5, rows: 3, seed: 3 + i + s, bark: pick(PAL.log, frand(s, i, 1)), bark2: shade(PAL.log[1], 1.1), caps: 2, wobble: 0.03, bend: (frand(s, i, 2) - 0.5) * 0.08 }));
    B.add(stone({ p: [sx * (LEG + 0.16), 0.08, sz * (LEG + 0.16)], s: [0.5, 0.26, 0.42], seed: 70 + i, color: pick(PAL.stone, frand(s, i, 3)), rot: [0, i, 0], moss: 0.5, round: i % 2 === 0 }));
    B.add(anchor({ x: sx * 1.34, z: sz * 1.34, hw: 0.28, hd: 0.28, top: -0.05, bottom: -1, seed: i, color: 0x33291f }));
    B.circle(sx * 1.34, sz * 1.34, 0.23);
  });
  B.label = 'braces';
  const ring = (i, j, y, id, w = 0.16) => { if (D.gone(id, 0.55)) return; const a = legPt(i, y), b = legPt(j, y); B.add(beam({ a, b, w, t: 0.13, color: pick(PAL.wood, frand(s, id, 4)), seed: id, endCol: PAL.cutOld, up: [0, 1, 0], jit: 0.1, sagY: -0.02 * (D.level), segs: 2 })); };
  const pairs = [[0, 1], [1, 3], [3, 2], [2, 0]];
  pairs.forEach(([i, j], k) => { ring(i, j, 2.3, 700 + k); ring(i, j, 3.7, 710 + k); ring(i, j, 4.6, 720 + k, 0.2); });
  const diag = (i, j, y0, y1, id) => { if (D.gone(id, 0.6)) return; B.add(log({ a: legPt(i, y0), b: legPt(j, y1), r: 0.055, rt: 0.045, segs: 4, rows: 1, seed: id, bark: pick(PAL.wood, frand(s, id, 5)), caps: 3, wobble: 0.015 })); };
  pairs.forEach(([i, j], k) => { diag(i, j, 2.3, 3.7, 730 + k * 2); diag(j, i, 2.3, 3.7, 731 + k * 2); diag(i, j, 3.7, 4.6, 740 + k); });
  B.label = 'ladder';
  const lz = LEG + 0.35;
  for (const sx of [-1, 1]) B.add(log({ a: [sx * 0.34, -0.3, lz + 0.22], b: [sx * 0.34, 5.65, lz - 0.12 + lean(9, 0) * 2], r: 0.05, rt: 0.045, segs: 4, rows: 2, seed: 80 + (sx > 0), bark: PAL.wood[0], caps: 3, wobble: 0.01 }));
  for (let i = 0; i < 12; i++) {
    const y = 0.35 + i * 0.4, z = lz + 0.22 - (y + 0.3) / 5.95 * 0.34;
    if (D.gone(760 + i, 0.55)) continue;
    B.add(beam({ a: [-0.36, y, z], b: [0.36, y + (frand(s, i, 6) - 0.5) * 0.04, z], w: 0.05, t: 0.05, color: pick(PAL.wood, frand(s, i, 7)), seed: i, endCol: PAL.cutOld, up: [0, 1, 0], jit: 0.12 }));
  }
  B.label = 'deck';
  // deck boards along X with gaps; ladder hole at the front
  const joist = (x, id) => { if (D.gone(id, 0.4)) return; B.add(beam({ a: [x, PLAT - 0.16, -1.65], b: [x + 0.02, PLAT - 0.16, 1.65], w: 0.14, t: 0.16, color: PAL.wood[2], seed: id, endCol: PAL.cutOld, up: [0, 1, 0] })); };
  joist(-1.0, 770); joist(0.0, 771); joist(1.0, 772);
  for (let i = 0; i < 8; i++) {
    const z = -1.45 + i * 0.415 + (frand(s, i, 8) - 0.5) * 0.04;
    const segs = z > 0.85 ? subtract([[-1.56, 1.56]], [[-0.34, 0.34]], 0.2) : [[-1.56, 1.56]];
    segs.forEach(([a, b], j) => { if (D.gone(780 + i * 2 + j, 0.75)) return; B.add(beam({ a: [a, PLAT - 0.05, z], b: [b, PLAT - 0.05 + (frand(s, i, 9) - 0.5) * 0.02, z + (frand(s, i, 10) - 0.5) * 0.03], w: 0.37, t: 0.06, color: pick(PAL.grey, frand(s, i * 2 + j, 11)), seed: i * 3 + j, endCol: PAL.cutOld, up: [0, 1, 0], jit: 0.07 })); });
  }
  B.label = 'parapet';
  // parapet: corner posts, two plank rails per side (gap at the ladder), plus a few stakes on the outside
  const posts = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];
  posts.forEach(([x, z], i) => { if (D.gone(800 + i, 0.4)) return; B.add(log({ a: [x, PLAT - 0.3, z], b: [x + lean(10 + i, 2), 6.2, z + lean(14 + i, 3)], r: 0.075, rt: 0.065, segs: 5, rows: 1, seed: 90 + i, bark: pick(PAL.log, frand(s, i, 12)), caps: 3 })); });
  const rail = (axis, at, y, id, gap) => {
    const segs = gap ? subtract([[-1.5, 1.5]], [gap], 0.25) : [[-1.5, 1.5]];
    segs.forEach(([u, v], j) => {
      if (D.gone(id + j * 7, 0.7)) return;
      const A = axis === 'x' ? [u, y, at] : [at, y, u], Bp = axis === 'x' ? [v, y + 0.03, at] : [at, y - 0.02, v];
      B.add(beam({ a: A, b: Bp, w: 0.2, t: 0.045, color: pick(PAL.grey, frand(s, id + j, 13)), seed: id + j, endCol: PAL.cutOld, up: axis === 'x' ? [0, 0, 1] : [1, 0, 0] }));
    });
  };
  for (const [k, y] of [[0, 5.2], [1, 5.62]]) {
    rail('x', -1.52, y, 820 + k, null); rail('x', 1.52, y, 840 + k, [-0.42, 0.42]); rail('z', -1.52, y, 860 + k, null); rail('z', 1.52, y, 880 + k, null);
  }
  B.label = 'roof';
  // small gable roof of ragged thatch over the platform
  const yE = 6.12, yR = 6.85, zf = 1.85, ex = 1.95;
  if (!D.gone(900, 0.2)) B.add(beam({ a: [-ex - 0.1, yR - 0.14, 0], b: [ex + 0.1, yR - 0.14, 0.02], w: 0.14, t: 0.16, color: PAL.wood[0], seed: 5, endCol: PAL.cutOld, up: [0, 1, 0] }));
  for (const [front, id] of [[true, 1000], [false, 2000]]) {
    const O = V3(-ex, yE, front ? zf : -zf), V = V3(0, yR - yE, front ? -zf : zf);
    B.add(roofSlope({ O, U: V3(ex * 2, 0, 0), V, out: V3(0, 1, front ? 1 : -1), nu: 2, nv: 2, rows: 3, tw: 0.4, drop: 0.5, thick: 0.1, seed: s * 5 + (front ? 1 : 2), D, idBase: id, holeBias: 0.9, colors: PAL.thatch, baseColor: 0x6a5a34, ragged: 0.5 }));
  }
  if (L >= 1) rubble(B.parts, { cx: 0, cz: 0, n: L * 3, spread: 2.6, seed: 91 + s, kind: 'plank', size: 0.6 });
  if (L >= 2) rubble(B.parts, { cx: 0, cz: 0, n: L * 2, spread: 2.4, seed: 95 + s, kind: 'log', size: 0.8 });
  if (L > 0) shear(B.parts, D.lean(1, 9, 1.0) * 0.6, D.lean(2, 9, 1.0) * 0.6);
  B.platform = { y: PLAT, hw: 1.4, hd: 1.4 };
  B.interact.use = { x: 0, z: 2.1 };
}

export const builders = { palisade_wall, stone_wall, spike_wall, gate, watchtower };
