// Traps (low, flat): spike_trap, snare (sidła), pit_trap (open/covered), bear_trap (armed/sprung).
// Each carries a buried earth block so it never floats over uneven terrain. Colliders are omitted on purpose
// (traps are walk-over triggers) except the bear trap chain stake. Local +Z = front.
import * as THREE from 'three';
import { blob, stone, log, beam, band, anchor, pebble, slab, xf, finish, paintTris, orient, PAL, pick, shade, lerp, TAU, V3, frand, hash3, cone } from './kit.js';

const LEAF_SOLID = (fr) => pick(fr < 0.3 ? PAL.dryLeaf : PAL.leaf, fr * 3.3 % 1);
function leafPatch(B, x, z, r, seed, y = 0.03) {
  B.add(blob({ r, detail: 0, jit: 0.3, seed, squash: [1.2, 0.12, 0.9], pos: [x, y, z], rot: [0, frand(B.seed, seed, 1) * TAU, 0], color: (px, py, pz, fr) => LEAF_SOLID(fr), faceVar: 0.14 }));
}
const stakeUp = ({ x, z, y = 0, len = 0.5, r = 0.035, tilt = [0, 0], seed = 1, bark = 0x7a6244 }) =>
  log({ a: [x, y - 0.12, z], b: [x + Math.sin(tilt[0]) * len, y + Math.cos(tilt[0]) * Math.cos(tilt[1]) * len, z + Math.sin(tilt[1]) * len], r, rt: 0.006, segs: 4, rows: 1, seed, bark, bark2: PAL.cut, caps: 1, wobble: 0.004, jit: 0.1, faceVar: 0.14 });

export function spike_trap(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.62, hd: 0.62, top: 0.03, bottom: -1, seed: 4, color: 0x3a2e22 }));
  // timber frame: four crooked logs with crossed ends + a plank grid to seat the stakes
  const fr = 0.66;
  [[-fr, -fr, fr, -fr], [fr, -fr, fr, fr], [fr, fr, -fr, fr], [-fr, fr, -fr, -fr]].forEach(([x0, z0, x1, z1], i) => {
    const e = (v) => v + (v > 0 ? 0.08 : -0.08);
    B.add(log({ a: [x0 + (x0 === x1 ? 0 : (x1 > x0 ? -0.1 : 0.1)), 0.075 + (i % 2) * 0.06, z0 + (z0 === z1 ? 0 : (z1 > z0 ? -0.1 : 0.1))], b: [x1 + (x0 === x1 ? 0 : (x1 > x0 ? 0.1 : -0.1)), 0.075 + (i % 2) * 0.06, z1 + (z0 === z1 ? 0 : (z1 > z0 ? 0.1 : -0.1))], r: 0.07 + frand(s, i, 1) * 0.02, segs: 5, rows: 1, seed: i + s * 5, bark: pick(PAL.log, frand(s, i, 2)), bark2: PAL.log[1], caps: 3, wobble: 0.015 }));
  });
  for (let i = 0; i < 3; i++) B.add(beam({ a: [-0.6, 0.11, -0.4 + i * 0.4 + (frand(s, i, 3) - 0.5) * 0.06], b: [0.6, 0.12, -0.4 + i * 0.4], w: 0.11, t: 0.04, color: pick(PAL.grey, frand(s, i, 4)), seed: i, endCol: PAL.cutOld, up: [0, 1, 0] }));
  // stakes: 3x3 grid, jittered, tilted outwards/upwards
  for (let i = 0; i < 9; i++) {
    const gx = (i % 3) - 1, gz = Math.floor(i / 3) - 1, x = gx * 0.4 + (frand(s, i, 5) - 0.5) * 0.12, z = gz * 0.4 + (frand(s, i, 6) - 0.5) * 0.12;
    const tl = 0.12 + frand(s, i, 7) * 0.22;
    B.add(stakeUp({ x, z, y: 0.1, len: 0.42 + frand(s, i, 8) * 0.16, r: 0.04 + frand(s, i, 9) * 0.015, tilt: [gx * tl + (frand(s, i, 10) - 0.5) * 0.1, gz * tl + (frand(s, i, 11) - 0.5) * 0.1], seed: i + 4 * s }));
  }
  for (let i = 0; i < 4; i++) leafPatch(B, (frand(s, i, 12) - 0.5) * 1.4, (frand(s, i, 13) - 0.5) * 1.4, 0.16 + frand(s, i, 14) * 0.1, 30 + i, 0.02);
  B.interact.use = { x: 0, z: 0.95 };
}

export function snare(B) {
  const s = B.seed, r = B.r;
  B.add(anchor({ hw: 0.45, hd: 0.45, top: 0.02, bottom: -1, seed: 5, color: 0x3a2e22 }));
  // bent sapling rooted at the back-left, arching over the trap and held down by a trigger stick
  const bx = -0.32, bz = -0.28;
  B.add(log({ a: [bx, -0.9, bz], b: [0.12, 0.62, 0.06], r: 0.05, rt: 0.012, segs: 5, rows: 6, seed: 3 + s, bark: 0x6a5238, bark2: 0x7f6a48, caps: 2, wobble: 0.01, bend: -0.34 }));
  for (let i = 0; i < 4; i++) B.add(blob({ r: 0.07 + r() * 0.03, detail: 0, jit: 0.3, seed: 50 + i, squash: [1.4, 0.35, 1], pos: [bx + 0.06 + i * 0.09, 0.28 + i * 0.13 + (r() - 0.5) * 0.05, bz + 0.05 + i * 0.09], rot: [0.3, r() * TAU, 0.2], color: (x, y, z, fr) => LEAF_SOLID(fr), faceVar: 0.12 }));
  // cord from the sapling tip down to the noose, a trigger peg + notched stick
  B.add(beam({ a: [0.12, 0.6, 0.06], b: [0.2, 0.09, 0.32], w: 0.014, t: 0.014, color: PAL.rope, seed: 2, faceVar: 0.1 }));
  B.add(beam({ a: [0.26, -0.5, 0.36], b: [0.26, 0.14, 0.36], w: 0.05, t: 0.05, color: 0x6a5238, seed: 5, endCol: PAL.cutOld, up: [1, 0, 0] }));
  B.add(beam({ a: [0.14, 0.15, 0.36], b: [0.4, 0.13, 0.34], w: 0.035, t: 0.035, color: 0x7a6244, seed: 4, endCol: PAL.cutOld }));
  // noose: rope ring lying on the ground, hidden under twigs and leaves
  const tor = new THREE.TorusGeometry(0.2, 0.014, 4, 9); tor.deleteAttribute('uv');
  const tg = tor.toNonIndexed(); tg.deleteAttribute('normal');
  paintTris(tg, () => PAL.rope, 0.14, 3); xf(tg, { pos: [0.16, 0.05, 0.3], rot: [Math.PI / 2 + 0.06, 0, 0], scale: [1.05, 1.0, 1] }); B.add(finish(tg));
  for (let i = 0; i < 6; i++) { const a = r() * TAU, d = 0.12 + r() * 0.3; B.add(log({ a: [0.16 + Math.cos(a) * d - 0.12, 0.04, 0.3 + Math.sin(a) * d - 0.05], b: [0.16 + Math.cos(a) * d + 0.14, 0.05, 0.3 + Math.sin(a) * d + 0.09], r: 0.012, segs: 3, rows: 1, seed: 20 + i, bark: pick(PAL.bark, r()), caps: 0 })); }
  leafPatch(B, 0.05, 0.42, 0.2, 60, 0.03); leafPatch(B, 0.3, 0.2, 0.16, 61, 0.03); leafPatch(B, -0.1, 0.12, 0.18, 62, 0.04); leafPatch(B, 0.4, 0.45, 0.12, 63, 0.03);
  for (let i = 0; i < 3; i++) B.add(pebble({ p: [-0.2 + i * 0.25, 0.04, 0.44 + (r() - 0.5) * 0.1], r: 0.06, seed: 70 + i, color: pick(PAL.stone, r()) }));
  B.interact.use = { x: 0.2, z: 0.75 };
}

export function pit_trap(B) {
  const s = B.seed, r = B.r, open = B.state !== 'covered';
  B.add(anchor({ hw: 0.85, hd: 0.85, top: -0.02, bottom: -1, seed: 6, color: 0x2a2018 }));
  // raised earth rim of lumps and stones around the hole
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * 0.3, rr = 0.88 + (r() - 0.5) * 0.08, sz = 0.2 + r() * 0.12;
    B.add(blob({ r: sz, detail: 0, jit: 0.3, seed: 10 + i, squash: [1.3, 0.55, 1.1], pos: [Math.cos(a) * rr, 0.06 + sz * 0.15, Math.sin(a) * rr], rot: [0, -a, 0], color: (x, y, z, fr) => (fr < 0.6 ? pick(PAL.soil ? [0x5a4632, 0x4a3a2a, 0x6a5238] : [0x5a4632], fr / 0.6) : PAL.leaf[1]), faceVar: 0.12 }));
    if (i % 3 === 0) B.add(stone({ p: [Math.cos(a) * (rr + 0.06), 0.1, Math.sin(a) * (rr + 0.06)], s: [0.3, 0.2, 0.24], rot: [0, -a, 0], seed: 40 + i, color: pick(PAL.stone, r()), round: true, moss: 0.4 }));
  }
  if (open) {
    // dark pit floor + stakes rising out of it
    B.add(blob({ r: 0.8, detail: 1, jit: 0.06, seed: 21, squash: [1, 0.05, 1], pos: [0, 0.035, 0], color: (x, y, z, fr) => shade(0x1c150f, 0.8 + 0.5 * fr), faceVar: 0.2 }));
    B.add(blob({ r: 0.74, detail: 1, jit: 0.1, seed: 22, squash: [1, 0.05, 1], pos: [0, 0.06, 0], color: (x, y, z, fr) => shade(0x0e0a07, 0.8 + 0.6 * fr), faceVar: 0.2 }));
    for (let i = 0; i < 9; i++) {
      const a = i === 0 ? 0 : (i / 8) * TAU + r() * 0.3, d = i === 0 ? 0.05 : 0.28 + r() * 0.32;
      const x = Math.cos(a) * d, z = Math.sin(a) * d, tl = 0.05 + r() * 0.18;
      B.add(stakeUp({ x, z, y: 0.04, len: 0.5 + r() * 0.16, r: 0.04 + r() * 0.015, tilt: [Math.cos(a) * tl, Math.sin(a) * tl], seed: i + 8 * s, bark: pick(PAL.log, r()) }));
    }
    // a few bones / rag for menace
    B.add(log({ a: [-0.3, 0.08, 0.3], b: [-0.1, 0.1, 0.42], r: 0.02, segs: 3, rows: 1, seed: 8, bark: 0xd8cfb8, caps: 3 }));
  } else {
    // thin cover of crossed twigs, sagging in the middle, dusted with leaves and earth
    for (let i = 0; i < 11; i++) {
      const off = -0.7 + i * 0.14 + (r() - 0.5) * 0.06, half = Math.sqrt(Math.max(0.05, 0.74 * 0.74 - off * off)), tilt = (r() - 0.5) * 0.2;
      B.add(log({ a: [off + tilt * half, 0.1, -half], b: [off - tilt * half, 0.1, half], r: 0.018 + r() * 0.012, segs: 3, rows: 3, seed: i + 30, bark: pick(PAL.bark, r()), bark2: PAL.wood[1], caps: 0, wobble: 0.01, bend: -0.05 }));
    }
    for (let i = 0; i < 7; i++) { const off = -0.6 + i * 0.2 + (r() - 0.5) * 0.06, half = Math.sqrt(Math.max(0.05, 0.72 * 0.72 - off * off)); B.add(log({ a: [-half, 0.115, off], b: [half, 0.115, off + (r() - 0.5) * 0.1], r: 0.014, segs: 3, rows: 3, seed: i + 40, bark: pick(PAL.wood, r()), caps: 0, bend: -0.04 })); }
    for (let i = 0; i < 9; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.7; leafPatch(B, Math.cos(a) * d, Math.sin(a) * d, 0.12 + r() * 0.12, 90 + i, 0.115); }
    B.add(blob({ r: 0.4, detail: 0, jit: 0.3, seed: 50, squash: [1, 0.06, 1], pos: [0.1, 0.13, -0.05], color: (x, y, z, fr) => (fr < 0.5 ? 0x5a4632 : 0x6a5a3c), faceVar: 0.14 }));
  }
  B.interact.use = { x: 0, z: 1.2 };
}

// bear trap: plate + two toothed jaw rings hinged on the plate; 'armed' = jaws splayed flat, 'sprung' = closed, teeth interlocked
export function bear_trap(B) {
  const s = B.seed, r = B.r, sprung = B.state === 'sprung';
  B.add(anchor({ hw: 0.4, hd: 0.4, top: 0.0, bottom: -1, seed: 7, color: 0x3a2e22 }));
  const iron = (t) => shade(PAL.iron, 0.9 + t * 0.4);
  B.add(beam({ a: [0, 0.03, -0.16], b: [0, 0.03, 0.16], w: 0.26, t: 0.05, color: PAL.rust, color2: PAL.iron, seed: 3, up: [0, 1, 0], jit: 0.05 }));
  B.add(beam({ a: [-0.13, 0.062, 0], b: [0.13, 0.062, 0], w: 0.06, t: 0.03, color: 0x5a3a26, seed: 4, up: [0, 1, 0] }));   // pan
  const jaw = (side, k) => {
    // jaw = half-ring in its own frame: hinge axis along Z through the origin; the ring bulges toward +X (mirrored by `side`)
    const parts = [], R = 0.27, N = 7;
    const tor = new THREE.TorusGeometry(R, 0.02, 4, N, Math.PI); tor.deleteAttribute('uv');
    const tg = tor.toNonIndexed(); tg.deleteAttribute('normal');
    paintTris(tg, (x, y, z, fr) => (fr < 0.3 ? PAL.rust : PAL.iron), 0.15, 5 + k);
    // torus lies in XY plane, arc from angle 0..PI (through +Y). Rotate so the arc lies in the XZ plane, bulging +X:
    xf(tg, { rot: [0, 0, -Math.PI / 2] });      // now arc endpoints on the Z axis? (0..PI over +Y -> +X)
    parts.push(finish(tg));
    // teeth along the inner side, pointing toward the centre of the ring
    for (let i = 1; i < 8; i++) {
      const a = (i / 8) * Math.PI, py = Math.sin(a) * R, pz = -Math.cos(a) * R;    // point on arc (x=py, z=pz) after rotation
      const c = new THREE.ConeGeometry(0.022, 0.09, 3, 1, false); c.deleteAttribute('uv');
      const cg = c.toNonIndexed(); cg.deleteAttribute('normal'); paintTris(cg, (x, y, z) => PAL.ironLight, 0.12, 9 + i);
      // cone axis +Y -> point toward -X (inwards)
      xf(cg, { pos: [py - 0.04, 0, pz], rot: [0, 0, Math.PI / 2 + (frand(s, i, 1) - 0.5) * 0.3] });
      parts.push(finish(cg));
    }
    return parts;
  };
  for (const side of [-1, 1]) {
    const parts = jaw(side, side);
    // hinge on the plate edge at x = side*0.13
    const ang = sprung ? side * (Math.PI / 2 - 0.16) : side * 0.03;
    for (const g of parts) {
      if (side < 0) xf(g, { rot: [0, Math.PI, 0] });        // mirror bulge toward -X
      xf(g, { pos: [side * 0.13, 0.05, 0], rot: [0, 0, sprung ? -side * (Math.PI / 2 - 0.14) : 0] });
    }
    B.add(parts);
    B.add(log({ a: [side * 0.12, 0.05, -0.28], b: [side * 0.12, 0.05, 0.28], r: 0.022, segs: 4, rows: 1, seed: 5, bark: PAL.iron, caps: 3, wobble: 0.004 }));
  }
  // springs, chain and stake
  for (const side of [-1, 1]) B.add(beam({ a: [side * 0.1, 0.06, -0.26], b: [side * 0.22, 0.05, -0.12], w: 0.03, t: 0.02, color: PAL.ironLight, seed: 6, up: [0, 1, 0] }));
  let px = 0.02, pz = -0.18;
  for (let i = 0; i < 5; i++) { const nx = px - 0.04 - (r() * 0.05), nz = pz - 0.11 - r() * 0.03; B.add(beam({ a: [px, 0.045, pz], b: [nx, 0.045, nz], w: 0.035, t: 0.02, color: i % 2 ? PAL.iron : PAL.ironLight, seed: 20 + i, up: [0, 1, 0] })); px = nx; pz = nz; }
  B.add(log({ a: [px, -0.9, pz - 0.05], b: [px, 0.14, pz - 0.05], r: 0.03, rt: 0.026, segs: 4, rows: 1, seed: 33, bark: PAL.iron, bark2: PAL.ironLight, caps: 2 }));
  for (let i = 0; i < 4; i++) leafPatch(B, (r() - 0.5) * 0.9, (r() - 0.5) * 0.9, 0.09 + r() * 0.08, 70 + i, 0.02);
  B.interact.use = { x: 0, z: 0.7 };
}

export const builders = { spike_trap, snare, pit_trap, bear_trap };
