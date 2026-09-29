// Shelter line: leanto "szałas" (leaning-pole teepee), wooden_hut "drewniana chata" (notched log cabin, thatch),
// stone_house "kamienny dom" (rubble masonry, timber roof) and the standalone bed.
// Local frame: origin = footprint centre on the ground, +Z = front/door. Beds are placed inside (interact.bed).
// Damage is done by removing pieces via B.D (deterministic by seed) + wall openings (wearOpenings) + a light overall lean.
import * as THREE from 'three';
import { blob, stone, log, beam, band, rope, anchor, pebble, slab, roofSlope, subtract, shear, wearOpenings, masonry, bedGeoms, chimney, rubble, xf, finish, PAL, pick, shade, lerp, clamp, TAU, V3, frand } from './kit.js';

// ---- bed --------------------------------------------------------------------------------------------------------
export function bed(B) {
  B.add(anchor({ hw: 0.45, hd: 0.9, top: 0.0, bottom: -1, seed: 8, x: 0, z: 0 }));
  B.add(bedGeoms({ seed: B.seed }));
  B.interact.bed = { x: 0, z: 0 }; B.interact.use = { x: 0, z: 0 };
  B.box(0, 0, 0.52, 0.98, 0);
}

// ---- leanto: teepee of leaning poles covered with layered leaves, open front ------------------------------------------
function teepeeCover(B, { R0, apexY, apexZ, openHalf, rings = 5, around = 12 }) {
  const D = B.D, tri = [], colr = [];
  const rad = (y) => R0 * (1 - y / apexY) + 0.1;
  const P = (th, y, sag = 0) => { const rr = rad(y) + sag; return V3(Math.sin(th) * rr, y, Math.cos(th) * rr + apexZ * (y / apexY)); };
  const th0 = openHalf + 0.02, th1 = TAU - openHalf - 0.02, dth = (th1 - th0) / around;
  const push = (a, b, c, N, ca, cb, cc) => {
    const nn = b.clone().sub(a).cross(c.clone().sub(a));
    if (nn.dot(N) < 0) { [b, c] = [c, b]; [cb, cc] = [cc, cb]; }
    for (const [q, cq] of [[a, ca], [b, cb], [c, cc]]) { tri.push(q.x, q.y, q.z); colr.push(cq.r, cq.g, cq.b); }
  };
  const inner = new THREE.Color(0x4a3c24), innerB = new THREE.Color(0x5a4a2c);
  for (let j = 0; j < rings; j++) {
    const y0 = (j / rings) * apexY * 0.97 - 0.05, y1 = ((j + 1) / rings) * apexY * 0.97;
    for (let i = 0; i < around; i++) {
      const id = j * around + i;
      if (D.gone(id, 0.35 + 1.0 * (j / rings))) continue;
      const ta = th0 + i * dth, tb = ta + dth, tm = (ta + tb) / 2;
      const N = V3(Math.sin(tm), 0.35, Math.cos(tm));
      const sg = (frand(B.seed, id, 1) - 0.5) * 0.08;
      const a = P(ta, y0, sg), b = P(tb, y0, sg * 0.5), c = P(tb, y1, sg), d = P(ta, y1, sg * 0.4);
      const ci = inner.clone().lerp(innerB, frand(B.seed, id, 2));
      push(a, b, c, N, ci, ci, ci); push(a, c, d, N, ci, ci, ci);
      const co = pick(PAL.leaf, frand(B.seed, id, 3)).valueOf(), cs = new THREE.Color(0x35502a).lerp(new THREE.Color(0x4a3f26), 0.5);
      push(a, b, c, N.clone().negate(), cs, cs, cs); push(a, c, d, N.clone().negate(), cs, cs, cs);
      // two rows of drooping leaf-bundle tufts
      for (let rw = 0; rw < 2; rw++) {
        const yt = lerp(y0, y1, rw === 0 ? 0.55 : 1.0), rr = rad(yt), arc = dth * rr, n = Math.max(1, Math.round(arc / 0.42));
        for (let k = 0; k < n; k++) {
          const key = id * 17 + rw * 5 + k, tc = ta + ((k + 0.5) / n) * dth + (frand(B.seed, key, 4) - 0.5) * dth * 0.25;
          const wa = (dth / n) * (0.55 + frand(B.seed, key, 5) * 0.4);
          const dr = 0.55 + frand(B.seed, key, 6) * 0.25, dl = dr * (0.8 + frand(B.seed, key, 7) * 0.3);
          const lift = 0.05 + 0.02 * rw;
          const tl = P(tc - wa, yt).addScaledVector(N, lift), tr = P(tc + wa, yt).addScaledVector(N, lift);
          const bl = P(tc - wa * 0.8, yt - dl).addScaledVector(N, lift + 0.16), br = P(tc + wa * 0.8, yt - dr).addScaledVector(N, lift + 0.16);
          const c0 = new THREE.Color(pick(frand(B.seed, key, 8) < 0.22 ? PAL.dryLeaf : PAL.leaf, frand(B.seed, key, 9))), top = c0.clone().multiplyScalar(0.65), tip = c0.clone().multiplyScalar(1.08);
          push(tl, tr, br, N, top, top, tip); push(tl, br, bl, N, top, tip, tip);
        }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  B.add(finish(g));
}

export function leanto(B) {
  const r = B.r, D = B.D, R0 = 1.5, apex = V3(0.05, 2.1, -0.15), openHalf = 0.98, nP = 13;
  B.add(anchor({ hw: 1.3, hd: 1.3, top: 0.0, bottom: -1, seed: 4, color: 0x3a2e22 }));
  // poles: leaning from a ring on the ground (sunk in) up to the apex, crossing there
  for (let i = 0; i < nP; i++) {
    if (i > 0 && i < nP - 1 && D.gone(100 + i, 0.55)) continue;
    const th = openHalf + (i / (nP - 1)) * (TAU - 2 * openHalf) + (r() - 0.5) * 0.12 + D.lean(i, 0, 0.6);
    const rb = R0 * (0.95 + 0.12 * r()), base = V3(Math.sin(th) * rb, 0, Math.cos(th) * rb);
    const top = apex.clone().add(V3((r() - 0.5) * 0.16, (r() - 0.5) * 0.1, (r() - 0.5) * 0.16));
    const dir = base.clone().sub(top), ext = 1.42;
    const lo = top.clone().addScaledVector(dir, ext), hi = top.clone().addScaledVector(dir, -0.18);
    const door = i === 0 || i === nP - 1;
    let brk = D.broken(i, 0.5) && !door; const mid = brk ? 0.55 : 1;
    B.add(log({ a: lo, b: brk ? top.clone().addScaledVector(dir, 0.45) : hi, r: door ? 0.075 : 0.05 + r() * 0.02, rt: door ? 0.05 : 0.035, segs: 5, rows: 2, seed: i + 10 * B.seed, bark: pick(PAL.wood, r()), bark2: pick(PAL.bark, r()), caps: brk ? 3 : 2, wobble: 0.03, bend: (r() - 0.5) * 0.08 }));
  }
  teepeeCover(B, { R0, apexY: apex.y - 0.1, apexZ: apex.z, openHalf, rings: 5, around: 12 });
  // door poles lashed with rope; a couple of horizontal binding withies
  for (const s of [-1, 1]) for (const h of [0.55, 1.15, 1.7]) {
    const th = s > 0 ? openHalf : TAU - openHalf, y = h, rr = R0 * (1 - y / apex.y) + 0.1;
    B.add(band({ c: [Math.sin(th) * rr, y, Math.cos(th) * rr + apex.z * (y / apex.y)], d: [Math.cos(th) * 0.3, 1, -Math.sin(th) * 0.3], r: 0.085 - h * 0.012, h: 0.06, color: PAL.rope, seed: h * 9 + s }));
  }
  // hide flap tied back at one door pole
  const sgn = B.seed % 2 ? 1 : -1;
  B.add(slab({ p: [V3(sgn * 0.75, 1.75, 1.2), V3(sgn * 1.15, 1.7, 0.75), V3(sgn * 1.25, 0.65, 0.85), V3(sgn * 0.9, 0.7, 1.28)], thick: 0.04, N: V3(sgn * 0.5, 0.2, 1), color: 0x8a6a4a, color2: 0x6f5238, seed: 4 }));
  // weight stones on the leaf skirt
  for (let i = 0; i < 7; i++) {
    const th = openHalf + 0.25 + (i / 6) * (TAU - 2 * openHalf - 0.5) + (r() - 0.5) * 0.2, rr = R0 * 1.02 + 0.12, sz = 0.16 + r() * 0.16;
    B.add(stone({ p: [Math.sin(th) * rr, sz * 0.25, Math.cos(th) * rr], s: [sz * 1.3, sz, sz * 1.1], rot: [0, th, 0], seed: 40 + i, color: pick(PAL.stone, r()), round: r() < 0.5, moss: 0.4 }));
  }
  // bedroll along the back-right, small fire-stones at the door
  B.add(bedGeoms({ seed: B.seed + 2, roll: true, sc: 0.85 }).map((g) => xf(g, { pos: [0.05, 0, -0.62], rot: [0, Math.PI / 2 + 0.05, 0] })));
  if (B.level >= 2) rubble(B.parts, { cx: 0, cz: 1.9, n: B.level * 2, spread: 1.4, seed: 31, kind: 'log', size: 0.6 });
  if (B.level > 0) shear(B.parts, D.lean(1, 5, 0.9), D.lean(2, 6, 0.5));
  // colliders: back arc as chord boxes; the front sector (approx 1.9*R wide at the base) stays open
  const segs = 6, th0 = openHalf + 0.05, span = TAU - 2 * openHalf - 0.1;
  for (let i = 0; i < segs; i++) {
    const ta = th0 + (i / segs) * span, tb = th0 + ((i + 1) / segs) * span, tm = (ta + tb) / 2, Rr = 1.42, chord = 2 * Rr * Math.sin((tb - ta) / 2);
    B.box(Math.sin(tm) * Rr, Math.cos(tm) * Rr - 0.1, chord / 2 + 0.12, 0.2, tm);
  }
  B.interact.door = { x: 0, z: 1.6 }; B.interact.bed = { x: 0.05, z: -0.62 };
}

// ---- wooden hut ---------------------------------------------------------------------------------------------------------
const barkOf = (r) => { const c = pick(PAL.bark, r); return c; };
function logWallFront(B, o) { /* placeholder replaced below */ }

export function wooden_hut(B) {
  const r = B.r, D = B.D, s = B.seed, L = B.level;
  const HW = 2.2, yE = 2.1, yR = 3.2, xr = 0.2 + (s % 3 - 1) * 0.08, xL = -2.78, xR = 2.7, y0 = 0.14;
  const roofY = (x) => (x < xr ? yE + (yR - yE) * (x - xL) / (xr - xL) : yR - (yR - yE - 0.05) * (x - xr) / (xR - xr));
  const woodPal = (i) => pick(PAL.log, frand(s, i, 30));
  // ---- courses (shared radii for the 4 walls so corners interlock at half-offsets)
  const courses = []; let y = y0;
  for (let k = 0; k < 14; k++) { const rho = 0.15 + frand(s, k, 31) * 0.07, yc = y + rho; courses.push({ y: yc, rho }); y = yc + rho * 0.9; if (y > 3.05) break; }
  const fallen = [];
  // openings per wall (wall-local coords along wall: x for front/back, z for sides)
  const wear = (w, len) => wearOpenings({ seed: s * 7 + w, level: L, len, H: yE + 0.2, holes: 1, holeW: 0.7, holeH: 0.7, crown: 1, steps: 5 });
  const wearOf = [wear(0, 5), wear(1, 5), wear(2, 5), wear(3, 5)];
  const wallLog = (id, wall, a, b, yc, rho, k, ax) => {
    // a,b along-wall coordinates; wall 0=front(z+), 1=back(z-), 2=left(x-), 3=right(x+); yc = centre height
    const bias = 0.25 + 0.75 * clamp(yc / 2.6);
    if (D.gone(id, bias)) { if (L >= 2 && frand(s, id, 40) < 0.6) fallen.push([wall, (a + b) / 2, rho]); return; }
    const sag = (D.lean(id, 1, 0.9) + (frand(s, id, 35) - 0.5) * 0.02) * (b - a) * 0.5, tw = D.lean(id, 2, 0.6) + (frand(s, id, 36) - 0.5) * 0.02;
    const ext = (a <= -2.4 ? -(frand(s, id, 37) * 0.22) : 0), ext2 = (b >= 2.4 ? frand(s, id, 38) * 0.22 : 0); a += ext; b += ext2;
    const yA = yc + sag, yB = yc - sag;
    const p = (u, yy) => (wall < 2 ? [u, yy, (wall === 0 ? HW : -HW) + tw * (u - (a + b) / 2)] : [(wall === 2 ? -HW : HW) + tw * (u - (a + b) / 2), yy, u]);
    B.add(log({ a: p(a, yA), b: p(b, yB), r: rho, rt: rho * (0.82 + frand(s, id, 32) * 0.16), segs: 5, rows: b - a > 3 ? 2 : 1, seed: id * 3 + s, bark: woodPal(id), bark2: shade(woodPal(id + 1), 1.08), cap: 0xc4a274, wobble: 0.02 + 0.01 * frand(s, id, 33), bend: (frand(s, id, 34) - 0.5) * 0.06 * (b - a) / 5, jit: 0.1 }));
  };
  B.label = 'logs';
  courses.forEach((c, k) => {
    // X-running logs (front/back walls) at c.y; gables above eave height follow the roof line
    for (const wall of [0, 1]) {
      let segs = [[-2.48, 2.48]];
      const top = c.y + c.rho + 0.1;
      if (top > yE + 0.05) {
        const xl = xL + (top - yE) / (yR - yE) * (xr - xL) + 0.08, xrr = xR - (top - yE - 0.05) / (yR - yE - 0.05) * (xR - xr) - 0.08;
        if (xrr - xl < 0.6) return;
        segs = [[Math.max(xl, -2.48), Math.min(xrr, 2.48)]];
      }
      const holes = [];
      if (wall === 0 && c.y - c.rho < 1.98) holes.push([-0.68, 0.68]);
      for (const o of wearOf[wall]) if (o[2] < c.y + c.rho && o[3] > c.y - c.rho) holes.push([o[0], o[1]]);
      subtract(segs, holes, 0.25).forEach(([a, b], si) => wallLog(k * 8 + wall * 2 + si + 200, wall, a, b, c.y, c.rho, k));
    }
    // Z-running logs (side walls) at half offset
    const yz = c.y + c.rho * 0.8;
    if (yz + c.rho > yE + 0.02) return;
    for (const wall of [2, 3]) {
      const holes = [];
      if (wall === 3 && yz > 1.02 && yz < 1.62) holes.push([-0.55, 0.45]);
      if (wall === 2 && yz > 1.05 && yz < 1.55 && s % 2) holes.push([0.3, 1.0]);
      for (const o of wearOf[wall]) if (o[2] < yz + c.rho && o[3] > yz - c.rho) holes.push([o[0], o[1]]);
      subtract([[-2.48, 2.48]], holes, 0.25).forEach(([a, b], si) => wallLog(k * 8 + wall * 2 + si + 400, wall, a, b, yz, c.rho, k));
    }
  });
  B.label = 'foundation/floor';
  // foundation piers (stone under corners and door jambs) reaching deep
  for (const [x, z] of [[-2.28, -2.28], [2.28, -2.28], [-2.28, 2.28], [2.28, 2.28], [0, -2.3], [-2.3, 0], [2.3, 0.1]]) {
    B.add(stone({ p: [x, -0.42, z], s: [0.62 + (frand(s, x * 9 + z, 50)) * 0.2, 1.1, 0.62 + frand(s, x * 5 + z, 51) * 0.2], seed: Math.abs(x * 13 + z * 7) | 0, color: pick(PAL.stone, frand(s, x + z, 52)), rot: [0, frand(s, x * 3 + z, 53), 0], moss: 0.5, bevel: 0.18 }));
  }
  // earth/plank floor
  B.add(stone({ p: [0, -0.01, 0], s: [4.1, 0.12, 4.1], color: 0x5a4a36, jit: 0.04, bevel: 0.02, seed: 5 }));
  for (let i = 0; i < 3; i++) B.add(beam({ a: [-1.95, 0.07, -1.5 + i * 0.36], b: [1.95, 0.07, -1.5 + i * 0.36 + (frand(s, i, 55) - 0.5) * 0.06], w: 0.3, t: 0.03, color: pick(PAL.grey, frand(s, i, 56)), seed: i, endCol: PAL.cutOld, up: [0, 1, 0] }));
  B.label = 'door/window';
  // door frame: crooked jamb planks + heavy header + threshold stone
  for (const sx of [-1, 1]) if (!D.gone(60 + (sx > 0), 0.3)) B.add(beam({ a: [sx * 0.74, -0.05, HW + 0.02], b: [sx * (0.72 + D.lean(70, sx, 0.3)), 2.0, HW], w: 0.17, t: 0.14, color: pick(PAL.wood, frand(s, sx, 57)), seed: 3 + sx, endCol: PAL.cutOld, up: [0, 0, 1] }));
  if (!D.gone(62, 0.25)) B.add(beam({ a: [-1.05, 2.06, HW + 0.2], b: [1.05, 2.09 + D.lean(63, 0, 0.1), HW + 0.2], w: 0.18, t: 0.14, color: pick(PAL.wood, 0.3), seed: 9, endCol: PAL.cutOld, up: [0, 0, 1] }));
  B.add(stone({ p: [0.05, 0.02, HW + 0.62], s: [1.2, 0.14, 0.62], seed: 33, color: 0x8a857a, jit: 0.1, bevel: 0.1, rot: [0, 0.06, 0] }));
  // window: sill, jambs and a loose shutter (right wall)
  B.add(beam({ a: [HW + 0.22, 0.98, -0.62], b: [HW + 0.22, 0.98 + 0.02, 0.55], w: 0.16, t: 0.06, color: 0x7a5d40, seed: 13, endCol: PAL.cutOld, up: [0, 1, 0] }));
  for (const z of [-0.6, 0.5]) B.add(beam({ a: [HW + 0.05, 0.9, z], b: [HW + 0.05, 1.8, z + (z > 0 ? 0.02 : -0.01)], w: 0.08, t: 0.1, color: pick(PAL.wood, 0.6), seed: 14 + z, endCol: PAL.cutOld, up: [1, 0, 0] }));
  if (!D.gone(64, 0.5)) B.add(beam({ a: [HW + 0.3, 1.72, 0.52], b: [HW + 0.62, 1.05, 0.9 + D.lean(65, 0, 1)], w: 0.44, t: 0.035, color: pick(PAL.grey, 0.4), seed: 21, endCol: PAL.cutOld, up: [1, 0, 0.3] }));
  B.label = 'roof';
  // ---- roof: rafters, ridge roll, two slopes of ragged thatch (asymmetric, sagging), verge poles
  const zb = -2.98, zf = 3.0, Lz = zf - zb;
  const slopes = [
    { O: V3(xL - 0.05, yE - 0.06, zb), V: V3(xr - xL + 0.05, yR - yE + 0.06, 0), out: V3(-1, 1, 0), id: 1000, left: true },
    { O: V3(xR + 0.1, yE - 0.14, zb), V: V3(xr - xR - 0.1, yR - yE + 0.14, 0), out: V3(1, 1, 0), id: 2000, left: false },
  ];
  for (const sl of slopes) {
    const nrm = V3(sl.left ? -(sl.V.y) : sl.V.y, sl.left ? sl.V.x : -sl.V.x, 0).normalize();
    for (let i = 0; i < 4; i++) {
      if (D.gone(sl.id + 500 + i, 0.6)) continue;
      const z = zb + 0.35 + (i / 3) * (Lz - 0.7) + (frand(s, i, 60) - 0.5) * 0.2;
      const a = sl.O.clone().add(V3(0, 0, z - zb)).addScaledVector(nrm, -0.12), b = a.clone().add(sl.V.clone().multiplyScalar(0.985));
      B.add(beam({ a, b, w: 0.11, t: 0.13, color: pick(PAL.wood, frand(s, i + sl.id, 61)), seed: i + sl.id, up: nrm, endCol: PAL.cutOld, jit: 0.1 }));
    }
    B.add(roofSlope({ O: sl.O.clone(), U: V3(0, 0, Lz), V: sl.V, out: sl.out, nu: 3, nv: 2, rows: 5, tw: 0.36, drop: 0.5, thick: 0.2, seed: s * 5 + (sl.left ? 1 : 2), D, idBase: sl.id, holeBias: 0.85, style: 'thatch', ragged: 0.5,
      colors: PAL.thatch, baseColor: 0x6a5a34, warp: (u, v) => -0.1 * Math.sin(u * Math.PI) * (0.4 + v * 0.6) + 0.06 * Math.sin(u * 9 + v * 5 + s) * Math.sin(v * 3 + u) }));
  }
  if (!D.gone(3000, 0.3)) {
    for (let i = 0; i < 2; i++) B.add(log({ a: [xr + (i - 0.5) * 0.2, yR + 0.02 + i * 0.03, zb - 0.15], b: [xr + (i - 0.5) * 0.2 + 0.04, yR + 0.02 + i * 0.03, zf + 0.15], r: 0.17, rt: 0.15, segs: 6, rows: 3, seed: 7 + i, bark: 0xa8914a, bark2: 0x8f7a3c, cap: 0xc9b062, wobble: 0.05, bend: 0.06, faceVar: 0.14 }));
    for (const z of [-2.2, -0.7, 0.9, 2.4]) B.add(band({ c: [xr + 0.02, yR + 0.08, z], d: [0, 0, 1], r: 0.29, h: 0.09, color: PAL.ropeDark, seed: z * 9, segs: 6 }));
  }
  B.add(log({ a: [xr - 0.02, yR - 0.08, zb - 0.55], b: [xr, yR - 0.1, zf + 0.55], r: 0.1, rt: 0.085, segs: 5, rows: 2, seed: 4, bark: 0x5a4432, caps: 3, wobble: 0.03 }));
  B.label = 'chimney';
  // ---- stone & clay chimney stub on the back wall (outside), leaning slightly with damage
  const chx = -1.15 + (s % 2) * 0.1;
  B.add(chimney({ x: chx, z: -2.82, w: 0.95, d: 0.85, h: 3.05, seed: s + 3, D, idBase: 5000, taper: 0.72, rowH: 0.55 }));
  B.label = 'interior';
  // ---- bed inside (left/back), a stool, hanging herbs
  B.add(bedGeoms({ seed: s + 1, light: true }).map((g) => xf(g, { pos: [-1.5, 0, -1.02] })));
  B.add(log({ a: [1.2, 0.0, -1.5], b: [1.2, 0.36, -1.5], r: 0.2, rt: 0.19, segs: 6, rows: 1, seed: 8, bark: 0x7a5a3c, cap: PAL.cut, caps: 2 }));
  // stacked firewood by the front wall
  for (let i = 0; i < 6; i++) { const x = -2.0 - 0.32 * (i % 3) + (i > 2 ? 0.16 : 0), yy = 0.11 + (i > 2 ? 0.19 : 0); B.add(log({ a: [x, yy, 2.62 - (i % 2) * 0.05], b: [x + 0.02, yy, 3.5], r: 0.085, segs: 5, rows: 1, seed: 90 + i, bark: pick(PAL.bark, frand(s, i, 80)), cap: PAL.cut, caps: 3 })); }
  // ---- rubble / fallen logs
  for (const [wall, u, rho] of fallen) {
    const ox = wall === 3 ? 2.9 : wall === 2 ? -2.9 : u, oz = wall === 0 ? 3.0 : wall === 1 ? -3.0 : u;
    const a = frand(s, wall * 9 + u, 81) * 0.6 - 0.3;
    B.add(log({ a: [ox - 0.9 * (wall > 1 ? 0.15 : 1), 0.06 + rho * 0.8, oz - 0.9 * (wall > 1 ? 1 : 0.15) + a], b: [ox + 0.9 * (wall > 1 ? 0.15 : 1), rho * 0.8, oz + 0.9 * (wall > 1 ? 1 : 0.15) - a], r: rho, segs: 5, rows: 1, seed: (u * 10) | 0, bark: pick(PAL.bark, frand(s, u, 82)), caps: 3 }));
  }
  if (L >= 2) rubble(B.parts, { cx: 0, cz: 0, n: L * 2, spread: 2.0, seed: 33, kind: 'plank', size: 0.5 });
  if (L > 0) shear(B.parts, D.lean(1, 7, 1), D.lean(2, 8, 0.8));
  // colliders (walls), door gap 1.36 m, window not walkable; chimney box
  B.box(-1.59, HW, 0.91 + 0.28, 0.28, 0); B.box(1.59, HW, 0.91 + 0.28, 0.28, 0);
  B.box(0, -HW, 2.78, 0.28, 0); B.box(-HW, 0, 0.28, 2.5, 0); B.box(HW, 0, 0.28, 2.5, 0);
  B.box(chx, -2.82, 0.5, 0.45, 0);
  B.interact.door = { x: 0, z: 2.5 }; B.interact.bed = { x: -1.5, z: -1.02 };
  B.size = { w: 5, d: 5, h: 3.2 };
}


// ---- stone house ------------------------------------------------------------------------------------------------------------
const SLATE = [0x6b6a66, 0x7a776f, 0x5f5e5c, 0x86796a, 0x74706a, 0x8d8a82];
const place = (list, x, z, rot = 0) => { for (const g of list) xf(g, { pos: [x, 0, z], rot: [0, rot, 0] }); return list; };

function windowFrame(B, { u, cy, w, h, wall, s }) {
  // wall = {x,z,rot,lx}: builds timber lintel, sill and bars in wall-local coords then places them
  const parts = [], zf = 0.3, c = pick(PAL.wood, frand(s, u * 10, 90));
  const lx = wall.lx(u);
  parts.push(beam({ a: [lx - w / 2 - 0.16, cy + h / 2 + 0.08, zf * 0.6], b: [lx + w / 2 + 0.16, cy + h / 2 + 0.09, zf * 0.6], w: 0.2, t: 0.14, color: c, seed: 3, endCol: PAL.cutOld, up: [0, 0, 1] }));
  parts.push(beam({ a: [lx - w / 2 - 0.12, cy - h / 2 - 0.06, zf * 0.7], b: [lx + w / 2 + 0.12, cy - h / 2 - 0.05, zf * 0.7], w: 0.16, t: 0.12, color: shade(c, 0.9), seed: 4, endCol: PAL.cutOld, up: [0, 1, 0] }));
  for (const k of [-0.28, 0.28]) parts.push(beam({ a: [lx + k * w, cy - h / 2, 0.0], b: [lx + k * w + 0.01, cy + h / 2, 0.02], w: 0.05, t: 0.05, color: 0x3a2e24, seed: 5 + k, up: [0, 0, 1] }));
  place(parts, wall.x, wall.z, wall.rot);
  B.add(parts);
}

export function stone_house(B) {
  const r = B.r, D = B.D, s = B.seed, L = B.level;
  const yE = 2.5, yR = 3.7, HWL = 2.75;
  const W = {
    front: { x: 0, z: HWL, rot: 0, lx: (u) => u }, back: { x: 0, z: -HWL, rot: Math.PI, lx: (u) => -u },
    left: { x: -HWL, z: 0, rot: Math.PI / 2, lx: (u) => -u }, right: { x: HWL, z: 0, rot: -Math.PI / 2, lx: (u) => u },
  };
  const wins = { front: [{ u: 1.75, cy: 1.55, w: 0.62, h: 0.55 }], back: [{ u: 0.2, cy: 1.55, w: 0.62, h: 0.55 }], left: [{ u: 0.1, cy: 1.55, w: 0.62, h: 0.55 }, { u: -1.6, cy: 1.5, w: 0.5, h: 0.5 }], right: [] };
  const gable = (idx) => { // stepped gable profile for the side walls, local x = along the wall
    const out = [], steps = 6, half = 2.5;
    const prof = (z) => yE + (yR - yE + 0.05) * (1 - Math.abs(z) / 3.4) - 0.3;
    for (const sg of [-1, 1]) for (let i = 0; i < steps; i++) { const xa = i * half / steps, xb = (i + 1) * half / steps; const a = sg > 0 ? xa : -xb, b = sg > 0 ? xb : -xa; out.push([a - 0.005, b + 0.005, prof(xb) - 0.02, 5]); }
    return out;
  };
  B.label = 'walls';
  const wallCfg = { front: { len: 5, H: yE }, back: { len: 5, H: yE }, left: { len: 5, H: 3.3 }, right: { len: 5, H: 3.3 } };
  let wi = 0;
  for (const name of ['front', 'back', 'left', 'right']) {
    const w = W[name], cfg = wallCfg[name], open = [];
    for (const o of wins[name]) { const a = w.lx(o.u - o.w / 2), b = w.lx(o.u + o.w / 2); open.push([Math.min(a, b), Math.max(a, b), o.cy - o.h / 2, o.cy + o.h / 2]); }
    if (name === 'front') open.push([-0.7, 0.7, 0.02, 2.1]);
    if (name === 'left' || name === 'right') open.push(...gable());
    open.push(...wearOpenings({ seed: s * 11 + wi, level: L, len: 5, H: cfg.H, holes: 2, holeW: 0.8, holeH: 0.85, crown: name === 'left' || name === 'right' ? 0.8 : 1.15, steps: 5 }));
    const parts = masonry({ len: cfg.len, H: cfg.H, d: 0.52, seed: s * 31 + wi * 5 + 1, openings: open, minW: 0.8, maxW: 1.9, minH: 0.62, maxH: 0.9, D, idBase: 1000 * (wi + 1), colors: PAL.stone, moss: 0.4, firstTop: 0.36, stagger: 0.45 });
    B.add(place(parts, w.x, w.z, w.rot));
    wins[name].forEach((o) => windowFrame(B, { ...o, wall: w, s }));
    wi++;
  }
  // corner quoins: big alternating blocks
  for (const [cx, cz] of [[-HWL, -HWL], [HWL, -HWL], [-HWL, HWL], [HWL, HWL]]) {
    let y = -1, k = 0;
    while (y < 2.45) {
      const h = k === 0 ? 1.4 : 0.5 + frand(s, cx * 7 + cz * 3 + k, 95) * 0.2, alt = k % 2;
      const id = 800 + k + (cx > 0 ? 20 : 0) + (cz > 0 ? 40 : 0);
      if (!(D.gone(id, 0.35 + 0.65 * (y / 2.5)) && k > 0)) B.add(stone({ p: [cx, y + h / 2, cz], s: [alt ? 1.0 : 0.66, h * 0.97, alt ? 0.66 : 1.0], seed: id, color: shade(pick(PAL.stone, frand(s, id, 96)), 1.05), rot: [0, (frand(s, id, 97) - 0.5) * 0.08, 0], jit: 0.1, bevel: 0.12, moss: y < 0.7 ? 0.4 : 0 }));
      y += h; k++;
    }
  }
  // ---- door frame (heavy timber), step
  B.label = 'timber';
  for (const sx of [-1, 1]) if (!D.gone(60 + (sx > 0), 0.2)) B.add(beam({ a: [sx * 0.8, -0.6, HWL + 0.05], b: [sx * (0.78 + D.lean(70, sx, 0.2)), 2.12, HWL + 0.04], w: 0.24, t: 0.36, color: pick(PAL.wood, frand(s, sx, 57)), seed: 3 + sx, endCol: PAL.cutOld, up: [0, 0, 1] }));
  if (!D.gone(62, 0.2)) B.add(beam({ a: [-1.12, 2.18, HWL + 0.02], b: [1.12, 2.2, HWL + 0.02], w: 0.3, t: 0.42, color: pick(PAL.wood, 0.25), seed: 9, endCol: PAL.cutOld, up: [0, 0, 1] }));
  B.add(stone({ p: [0.05, 0.02, HWL + 0.7], s: [1.5, 0.16, 0.8], seed: 33, color: 0x8a857a, jit: 0.1, bevel: 0.1, rot: [0, 0.05, 0] }));
  B.add(stone({ p: [-0.1, 0.0, HWL + 1.35], s: [0.9, 0.12, 0.6], seed: 34, color: 0x7f7a70, jit: 0.1, bevel: 0.1, rot: [0, -0.2, 0], round: true }));
  // ---- roof frame: wall plates, ridge beam, tie beams, rafters (tails stick out past the eaves)
  const zf = 3.45, zbk = -3.4, zr = -0.1, x0 = -3.35, x1 = 3.35, Lx = x1 - x0;
  B.label = 'roof';
  for (const [z, y] of [[2.75, 2.4], [-2.75, 2.4]]) B.add(beam({ a: [-3.0, y, z], b: [3.0, y + 0.01, z], w: 0.3, t: 0.2, color: PAL.wood[2], seed: z, endCol: PAL.cutOld, up: [0, 1, 0] }));
  if (!D.gone(3001, 0.15)) B.add(beam({ a: [x0 + 0.1, yR - 0.22, zr], b: [x1 - 0.1, yR - 0.22, zr], w: 0.3, t: 0.3, color: PAL.wood[0], seed: 3, endCol: PAL.cutOld, up: [0, 1, 0], sagY: -0.04, segs: 2 }));
  for (let i = 0; i < 3; i++) if (!D.gone(3010 + i, 0.4)) B.add(beam({ a: [-1.6 + i * 1.6 - 1.6, 2.3, 2.6], b: [-1.6 + i * 1.6 - 1.6 + 0.02, 2.28, -2.6], w: 0.24, t: 0.2, color: pick(PAL.wood, frand(s, i, 98)), seed: 20 + i, endCol: PAL.cutOld, up: [0, 1, 0] }));
  const slopes = [
    { O: V3(x0, yE - 0.14, zf), V: V3(0, yR - yE + 0.14, zr - zf), out: V3(0, 1, 1), id: 1000, front: true },
    { O: V3(x0, yE - 0.1, zbk), V: V3(0, yR - yE + 0.1, zr - zbk), out: V3(0, 1, -1), id: 2000, front: false },
  ];
  for (const sl of slopes) {
    const nrm = V3(0, sl.front ? sl.V.z * -1 : -sl.V.z, 0); nrm.set(0, Math.abs(sl.V.z), (sl.front ? 1 : -1) * sl.V.y).normalize();
    for (let i = 0; i < 6; i++) {
      if (D.gone(sl.id + 500 + i, 0.55)) continue;
      const x = x0 + 0.3 + (i / 5) * (Lx - 0.6) + (frand(s, i, 99) - 0.5) * 0.12;
      const a = sl.O.clone().add(V3(x - x0, 0, 0)).addScaledVector(nrm, -0.16), b = a.clone().add(sl.V.clone().multiplyScalar(0.99));
      B.add(beam({ a, b, w: 0.16, t: 0.2, color: pick(PAL.wood, frand(s, i + sl.id, 61)), seed: i + sl.id, up: nrm, endCol: PAL.cutOld, jit: 0.1 }));
    }
    B.add(roofSlope({ O: sl.O.clone(), U: V3(Lx, 0, 0), V: sl.V, out: sl.out, nu: 3, nv: 2, rows: 3, tw: 0.55, drop: 0.7, thick: 0.1, seed: s * 5 + (sl.front ? 1 : 2), D, idBase: sl.id, holeBias: 0.85, style: 'tile', colors: SLATE, baseColor: 0x4a3f34, droop: 0.06,
      warp: (u, v) => -0.05 * Math.sin(u * Math.PI) * (0.3 + v) + 0.03 * Math.sin(u * 11 + v * 5 + s) }));
  }
  // ---- chimney at the right gable, outside
  B.label = 'chimney';
  B.add(chimney({ x: 3.5, z: -0.35, w: 0.95, d: 1.2, h: 3.95, seed: s + 5, D, idBase: 5000, taper: 0.7, rowH: 0.75 }));
  for (const sx of [-1, 1]) B.add(beam({ a: [sx * 3.4, yE - 0.14, zf + 0.05], b: [sx * 3.4, yR + 0.04, zr], w: 0.26, t: 0.16, color: PAL.wood[3], seed: 30 + sx, endCol: PAL.cutOld, up: [1, 0, 0] })), B.add(beam({ a: [sx * 3.4, yE - 0.1, zbk - 0.05], b: [sx * 3.4, yR + 0.04, zr], w: 0.26, t: 0.16, color: PAL.wood[3], seed: 34 + sx, endCol: PAL.cutOld, up: [1, 0, 0] }));
  // ---- interior
  B.label = 'interior';
  B.add(stone({ p: [0, -0.02, 0], s: [5.0, 0.12, 5.0], color: 0x6a6358, jit: 0.03, bevel: 0.02, seed: 5 }));
  B.add(bedGeoms({ seed: s + 1, light: true }).map((g) => xf(g, { pos: [-1.85, 0, -1.4] })));
  // ---- foundation piers reaching deep (under door jambs + wall middles)
  B.label = 'foundation';
  for (const [x, z] of [[-1.4, 2.9], [1.4, 2.9], [0, -2.9], [-2.9, 0], [2.9, 1.2]]) B.add(anchor({ x, z, hw: 0.45, hd: 0.45, top: 0.05, bottom: -1, seed: Math.abs(x * 3 + z * 5) | 0, color: 0x4a4238 }));
  // ---- rubble
  if (L >= 1) rubble(B.parts, { cx: 0, cz: 0, n: 5 + L * 4, spread: 3.7, seed: 41 + s, kind: 'stone', size: 0.5 });
  if (L >= 2) rubble(B.parts, { cx: 0, cz: 0, n: 3 + L * 2, spread: 3.2, seed: 61 + s, kind: 'plank', size: 0.6 });
  if (L > 0) shear(B.parts, D.lean(1, 7, 0.6), D.lean(2, 8, 0.5));
  // colliders
  B.box(-1.98, HWL, 1.3, 0.34, 0); B.box(1.98, HWL, 1.3, 0.34, 0);
  B.box(0, -HWL, 3.28, 0.34, 0); B.box(-HWL, 0, 0.34, 2.5, 0); B.box(HWL, 0, 0.34, 2.5, 0);
  B.box(3.5, -0.35, 0.5, 0.65, 0);
  B.interact.door = { x: 0, z: 3.0 }; B.interact.bed = { x: -1.85, z: -1.4 };
  B.size = { w: 6, d: 6, h: 3.8 };
}

export const builders = { bed, leanto, wooden_hut, stone_house };
