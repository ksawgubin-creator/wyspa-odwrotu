// Fire line: campfire -> hearth (palenisko) -> great fire (wielkie ognisko).
// Builders receive the build context B (see buildings.js): B.add/B.addGlow geometry, B.r rng, B.box/B.circle colliders.
// No flame is modelled; when opts.lit is true the glow mesh (coals) is shown. Fire anchor = where flames/light belong.
import { blob, stone, log, beam, band, rope, anchor, pebble, PAL, pick, shade, TAU, V3, frand } from './kit.js';

const CHAR = 0x2b2420;
function stoneRing(B, { n, rad, szMin, szMax, hMul = 0.85, sink = 0.3, seed }) {
  const r = B.r;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (r() - 0.5) * (TAU / n) * 0.55, rr = rad * (0.92 + r() * 0.16);
    const sz = szMin + r() * (szMax - szMin), h = sz * hMul * (0.7 + r() * 0.6);
    B.add(stone({ p: [Math.cos(a) * rr, h * (0.5 - sink), Math.sin(a) * rr], s: [sz * 1.25, h, sz * 1.05], rot: [(r() - 0.5) * 0.35, -a + (r() - 0.5) * 0.6, (r() - 0.5) * 0.35], seed: seed + i * 3, color: pick(PAL.stone, r()), round: r() < 0.3, moss: 0.3, jit: 0.18 }));
  }
}
function coals(B, { n, rad, y = 0.08, size = 0.07 }) {
  const r = B.r;
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * rad, s = size * (0.6 + r() * 0.8);
    B.addGlow(blob({ r: s, detail: 0, jit: 0.25, seed: 300 + i, squash: [1.3, 0.7, 1.1], pos: [Math.cos(a) * d, y + r() * 0.06, Math.sin(a) * d], color: (x, yy) => (r() < 0.5 ? 0xff8a2a : 0xffc04a), faceVar: 0.18 }));
  }
  B.addGlow(blob({ r: rad * 0.85, detail: 1, jit: 0.15, seed: 77, squash: [1, 0.08, 1], pos: [0, y - 0.03, 0], color: 0xc83e10, faceVar: 0.15 }));
}
function ashBed(B, rad, y = 0.03) {
  B.add(blob({ r: rad, detail: 1, jit: 0.15, seed: 21, squash: [1, 0.1, 1], pos: [0, y, 0], color: (x, yy, z, fr) => (fr < 0.3 ? PAL.ashLight : PAL.ash), faceVar: 0.14 }));
  B.add(blob({ r: rad * 0.6, detail: 0, jit: 0.2, seed: 22, squash: [1, 0.1, 1], pos: [0.05, y + 0.03, -0.03], color: PAL.char, faceVar: 0.2 }));
}

export function campfire(B) {
  const r = B.r;
  B.add(anchor({ hw: 0.36, hd: 0.36, top: 0.05, seed: 3 }));
  stoneRing(B, { n: 8, rad: 0.42, szMin: 0.16, szMax: 0.27, seed: B.seed * 11 + 1 });
  ashBed(B, 0.33);
  // crossed logs (leaning together over the coals), charred at the inner end
  const a0 = r() * TAU;
  for (let i = 0; i < 3; i++) {
    const a = a0 + i * (TAU / 3) + (r() - 0.5) * 0.4, rr = 0.06 + r() * 0.03, L = 0.35 + r() * 0.1;
    B.add(log({ a: [Math.cos(a) * 0.42, 0.13, Math.sin(a) * 0.42], b: [-Math.cos(a) * 0.06 * 1.2, 0.24 + i * 0.045, -Math.sin(a) * 0.06 * 1.2], r: rr, rt: rr * 0.8, segs: 5, rows: 1, seed: i + B.seed * 5, bark: pick(PAL.bark, r()), bark2: CHAR, cap: 0x8a6d4a }));
  }
  B.add(log({ a: [-0.22, 0.06, 0.12], b: [0.2, 0.07, -0.1], r: 0.05, segs: 5, rows: 1, seed: 9, bark: CHAR, bark2: 0x4a3a2c, cap: 0x3a3028 }));
  if (r() < 0.6) B.add(pebble({ p: [0.62, 0.05, 0.3], r: 0.06, seed: 4, color: 0x8a857a }));
  B.add(anchor({ hw: 0.1, hd: 0.1, x: 0.4, z: -0.3, top: -0.3, bottom: -1, seed: 5 }));
  coals(B, { n: 5, rad: 0.2, y: 0.07, size: 0.07 });
  B.fireAnchor = [0, 0.28, 0];
  B.circle(0, 0, 0.42);
  B.interact.use = { x: 0, z: 0.75 };
}

export function hearth(B) {
  const r = B.r;
  B.add(anchor({ hw: 0.7, hd: 0.7, top: 0.05, seed: 4 }));
  // pit floor + stone lining: a ring of larger, taller rim stones
  B.add(blob({ r: 0.72, detail: 1, jit: 0.1, seed: 31, squash: [1, 0.08, 1], pos: [0, 0.02, 0], color: (x, y, z, fr) => (fr < 0.5 ? PAL.soilDark : 0x3a3129), faceVar: 0.15 }));
  stoneRing(B, { n: 13, rad: 0.82, szMin: 0.26, szMax: 0.42, hMul: 0.9, sink: 0.22, seed: B.seed * 17 + 2 });
  stoneRing(B, { n: 8, rad: 0.62, szMin: 0.14, szMax: 0.22, hMul: 0.5, sink: 0.45, seed: B.seed * 19 + 5 });
  ashBed(B, 0.55, 0.04);
  // log pile
  const a0 = r() * TAU;
  for (let i = 0; i < 5; i++) {
    const a = a0 + i * (TAU / 5) + (r() - 0.5) * 0.5, rr = 0.07 + r() * 0.03;
    B.add(log({ a: [Math.cos(a) * 0.55, 0.16, Math.sin(a) * 0.55], b: [-Math.cos(a) * 0.05, 0.36 + (i % 3) * 0.06, -Math.sin(a) * 0.05], r: rr, rt: rr * 0.85, segs: 5, rows: 1, seed: i + B.seed * 5, bark: pick(PAL.bark, r()), bark2: CHAR, cap: 0x8a6d4a }));
  }
  for (let i = 0; i < 2; i++) { const a = r() * TAU; B.add(log({ a: [Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4], b: [-Math.cos(a) * 0.4, 0.12, -Math.sin(a) * 0.4], r: 0.09, segs: 5, rows: 1, seed: 20 + i, bark: CHAR, bark2: 0x4a3a2c, cap: 0x3a3028 })); }
  // tripod with a hanging pot: legs stand outside the stone ring, meet at the top with a rope lashing
  const top = V3(0.05, 1.78, -0.05), la = 1.0 + r() * 2;
  for (let i = 0; i < 3; i++) {
    const a = la + (i / 3) * TAU + (r() - 0.5) * 0.3, rr = 1.1 + r() * 0.15;
    const base = V3(Math.cos(a) * rr, -0.35, Math.sin(a) * rr);
    const t2 = top.clone().add(V3((r() - 0.5) * 0.12, (i - 1) * 0.07, (r() - 0.5) * 0.12));
    B.add(log({ a: base, b: t2, r: 0.065, rt: 0.045, segs: 5, rows: 2, seed: i + 40, bark: pick(PAL.wood, r()), bark2: pick(PAL.wood, r()), caps: 2, wobble: 0.02 }));
    B.add(log({ a: t2, b: t2.clone().add(V3(Math.cos(a) * -0.05, 0.16 + r() * 0.1, Math.sin(a) * -0.05)), r: 0.04, rt: 0.025, segs: 5, rows: 1, seed: 45 + i, bark: 0x6a4e37, caps: 2 }));
  }
  B.add(band({ c: [0.05, 1.7, -0.05], d: [0.05, 1, 0.1], r: 0.1, h: 0.13, color: PAL.rope, seed: 3 }));
  B.add(band({ c: [0.05, 1.6, -0.05], d: [0.0, 1, 0.1], r: 0.12, h: 0.07, color: PAL.ropeDark, seed: 4 }));
  // chain + hook + pot
  const hx = 0.05, hz = -0.05;
  for (let k = 0; k < 5; k++) B.add(beam({ a: [hx + (k % 2) * 0.012, 1.66 - k * 0.14, hz], b: [hx - (k % 2) * 0.012, 1.55 - k * 0.14, hz], w: 0.035, t: 0.03, color: PAL.iron, seed: k }));
  B.add(beam({ a: [hx, 0.98, hz], b: [hx + 0.12, 0.84, hz], w: 0.04, t: 0.035, color: PAL.ironLight, seed: 7 }));
  B.add(blob({ r: 0.22, detail: 1, jit: 0.08, seed: 12, squash: [1, 0.78, 1], pos: [hx + 0.12, 0.66, hz], color: (x, y) => shade(0x2a2b2e, 0.8 + (y - 0.5) * 0.5), faceVar: 0.1 }));
  B.add(beam({ a: [hx - 0.13, 0.82, hz - 0.02], b: [hx + 0.35, 0.82, hz + 0.02], w: 0.035, t: 0.03, color: PAL.iron, seed: 2, bow: 0.05 }));
  coals(B, { n: 7, rad: 0.36, y: 0.1, size: 0.075 });
  B.fireAnchor = [0, 0.4, 0];
  B.circle(0, 0, 0.9);
  B.interact.use = { x: 0, z: 1.15 };
}

export function great_fire(B) {
  const r = B.r;
  B.add(anchor({ hw: 1.3, hd: 1.3, top: 0.05, seed: 6 }));
  B.add(blob({ r: 1.25, detail: 1, jit: 0.1, seed: 33, squash: [1, 0.07, 1], pos: [0, 0.03, 0], color: (x, y, z, fr) => (fr < 0.4 ? PAL.ash : 0x3a3129), faceVar: 0.15 }));
  stoneRing(B, { n: 15, rad: 1.42, szMin: 0.42, szMax: 0.72, hMul: 0.85, sink: 0.22, seed: B.seed * 23 + 3 });
  stoneRing(B, { n: 9, rad: 1.05, szMin: 0.16, szMax: 0.26, hMul: 0.5, sink: 0.5, seed: B.seed * 29 + 1 });
  // pyre: leaning logs + crossing layers
  const a0 = r() * TAU;
  for (let i = 0; i < 9; i++) {
    const a = a0 + (i / 9) * TAU + (r() - 0.5) * 0.4, rb = 0.17 - r() * 0.05;
    B.add(log({ a: [Math.cos(a) * 1.0, 0.1, Math.sin(a) * 1.0], b: [Math.cos(a) * 0.08 + (r() - 0.5) * 0.1, 1.5 + r() * 0.15, Math.sin(a) * 0.08 + (r() - 0.5) * 0.1], r: rb, rt: rb * 0.5, segs: 5, rows: 2, seed: i + B.seed * 7, bark: pick(PAL.bark, r()), bark2: shade(pick(PAL.bark, r()), 0.7), cap: 0xb59870, wobble: 0.03 }));
  }
  for (let L = 0; L < 4; L++) {
    const cnt = L < 2 ? 3 : 2, y = 0.26 + L * 0.34, len = 1.5 - L * 0.28;
    const a1 = r() * TAU;
    for (let i = 0; i < cnt; i++) {
      const a = a1 + (i / cnt) * Math.PI + (r() - 0.5) * 0.3, off = (r() - 0.5) * 0.4, rr = 0.11 + r() * 0.05;
      const dx = Math.cos(a), dz = Math.sin(a), ox = -dz * off, oz = dx * off;
      B.add(log({ a: [ox - dx * len * 0.5, y + (r() - 0.5) * 0.06, oz - dz * len * 0.5], b: [ox + dx * len * 0.5, y + 0.06 + (r() - 0.5) * 0.08, oz + dz * len * 0.5], r: rr, rt: rr * 0.9, segs: 5, rows: 1, seed: 60 + L * 5 + i, bark: pick(PAL.bark, r()), bark2: L < 2 ? CHAR : pick(PAL.bark, r()), cap: 0xb59870 }));
    }
  }
  // charred inner surface + kindling sticks poking out
  for (let i = 0; i < 6; i++) { const a = r() * TAU; B.add(log({ a: [Math.cos(a) * 0.9, 0.12, Math.sin(a) * 0.9], b: [Math.cos(a) * 0.3, 0.7 + r() * 0.5, Math.sin(a) * 0.3], r: 0.035, rt: 0.02, segs: 4, rows: 1, seed: 90 + i, bark: 0x5b4330, caps: 0 })); }
  coals(B, { n: 10, rad: 0.85, y: 0.09, size: 0.11 });
  B.fireAnchor = [0, 0.75, 0];
  B.circle(0, 0, 1.4);
  B.interact.use = { x: 0, z: 1.9 };
}

export const builders = { campfire, hearth, great_fire };
