// Goat (kozica): slim, nimble mountain goat with curved horns, beard and a short tail. Quadruped rig from quad.js. Faces +Z.
// Alert head-up idle with chewing; quick gallop; leaps use s.grounded/s.vy (legs tuck while rising, reach while falling);
// telegraph 'charge' = head lowered with horns levelled, pawing; attack 'charge' = head-down dash.
import { Quad } from './quad.js';
import { THREE, B, loft, torso, limbL, along, up, back, spike, merge, cached, col, mix, shade, clamp, lerp, smoothstep, ease, sn, TAU } from './kit.js';

const PAL = [
  { back: 0xa88a62, belly: 0xe6dcc4, dark: 0x4b3b2a, leg: 0xb59b74, horn: 0xcbb98f },
  { back: 0x8e8c86, belly: 0xe2ded2, dark: 0x3d3a36, leg: 0x9b9890, horn: 0xbdb59c },
  { back: 0x9a6a44, belly: 0xdcc7a4, dark: 0x3c2618, leg: 0xa87a54, horn: 0xc6b088 },
  { back: 0x6c5644, belly: 0xd8ccb2, dark: 0x2c2118, leg: 0x7a6350, horn: 0xb4a684 },
];
const CFG = {
  H: 0.63, bodyR: 0.16, legLen: 0.58, maxSpeed: 9,
  hind: { x: 0.085, y: -0.08, z: -0.3, l1: 0.22, l2: 0.22, l3: 0.17, bend: 1, fz: -0.05 },
  fore: { x: 0.08, y: -0.05, z: 0.28, l1: 0.21, l2: 0.22, l3: 0.18, bend: -1, fz: 0.04 },
  neck: { y: 0.08, z: 0.4, l1: 0.18, l2: 0.13, e1: 1.1, e2: 0.85, hp: 0.05 },
  tail: { y: 0.1, z: 0.5, l: [0.08, 0.06], p: 0.55, curl: 0.35 },
  ears: { x: 0.05, y: 0.06, z: -0.025, rx: -0.05, rz: 1.15, pinRx: -0.5, pinRz: 1.5 },
  jaw: { y: -0.03, z: 0.04 },
  gait: { gT: [0.22, 0.42], gG: [0.6, 0.82], walk: 1.7, trot: 2.7, gallop: 4.4, liftW: 0.15, liftT: 0.22, liftG: 0.32 },
};
const PROF = [[-0.5, 0.025, 0.04, 0.08], [-0.42, 0.115, 0.14, 0.06], [-0.28, 0.16, 0.185, 0.04], [-0.08, 0.145, 0.17, 0.04], [0.14, 0.15, 0.19, 0.02], [0.3, 0.16, 0.215, 0.0], [0.42, 0.125, 0.175, 0.01], [0.5, 0.06, 0.09, 0.03]];

function geo(v) {
  const p = PAL[v], g = {}, s = 300 + v * 10;
  const bk = col(p.back), bl = col(p.belly), dk = col(p.dark), tmp = new THREE.Color();
  const body = (x, y, z) => { tmp.copy(bk).lerp(bl, smoothstep(0.02, -0.13, y)); if (y > 0.1) tmp.lerp(dk, 0.5 * smoothstep(0.1, 0.19, y)); return tmp.clone(); };
  { const t = torso(PROF, -0.5, 0.5, { steps: 4, color: body, seed: s + 1, jit: 0.008 }); g.rump = t.rear; g.chest = t.front; }
  g.neck1 = up(0.2, 0.085, 0.07, p.back, p.back, s + 7, { segs: 6 });
  g.neck2 = up(0.15, 0.07, 0.06, p.back, mix(p.back, p.belly, 0.4), s + 8, { segs: 6 });
  const hc = (x, y) => mix(p.back, p.belly, smoothstep(0.02, -0.04, y)).clone();
  g.head = merge([
    B(0.075, [0, 0.015, 0.03], [0.85, 0.95, 1.05], hc, s + 9, { jit: 0.07 }),
    along(0.14, 0.05, 0.032, mix(p.back, p.belly, 0.5), mix(p.belly, p.back, 0.3), s + 10, { segs: 5, pos: [0, -0.015, 0.06], squash: [1, 1, 0.9] }),
    B(0.022, [0, -0.012, 0.205], [1.1, 0.8, 0.8], 0x2a1f1a, s + 11, { detail: 0 }),
    B(0.018, [0.05, 0.03, 0.06], [0.6, 1, 1.2], 0x1a130e, s + 12, { detail: 0 }), B(0.018, [-0.05, 0.03, 0.06], [0.6, 1, 1.2], 0x1a130e, s + 13, { detail: 0 }),
    B(0.02, [0, 0.03, 0.1], [0.5, 0.6, 1.6], p.dark, s + 14, { detail: 0 }),      // face stripe
    // curved horns: sweep up, then back
    up(0.27, 0.034, 0.006, p.horn, shade(p.horn, 0.6), s + 15, { segs: 5, rows: 3, bend: [0, -0.3], pos: [0.038, 0.075, -0.015], rot: [0.0, 0, -0.16] }),
    up(0.27, 0.034, 0.006, p.horn, shade(p.horn, 0.6), s + 16, { segs: 5, rows: 3, bend: [0, -0.3], pos: [-0.038, 0.075, -0.015], rot: [0.0, 0, 0.16] }),
  ]);
  g.jaw = merge([along(0.13, 0.03, 0.022, mix(p.back, p.belly, 0.6), p.belly, s + 18, { segs: 5, squash: [1, 1, 0.8] }),
    spike(0.012, 0.075, p.dark, shade(p.dark, 1.2), s + 19, { segs: 4, pos: [0, -0.005, 0.105], rot: [Math.PI, 0, 0] })]);      // beard
  g.ear = up(0.085, 0.036, 0.012, shade(p.back, 0.9), p.dark, s + 23, { segs: 4, squash: [1, 1, 0.4], jit: 0.008 });
  const H = CFG.hind, F = CFG.fore, hf = 0x1c1714;
  g.hUp = limbL(H.l1 + 0.02, [0.092, 0.069, 0.039], p.back, p.leg, s + 24, { sq: 1.25, shift: 0.015, mid: 0.3, sides: 5 });
  g.hLo = merge([limbL(H.l2 + 0.01, [0.039, 0.034, 0.023], p.leg, p.leg, s + 26, { sq: 1.1 })]);
  g.hFt = merge([limbL(H.l3 * 0.78, [0.023, 0.021, 0.023], p.leg, mix(p.leg, p.dark, 0.5), s + 28), B(0.03, [0, -H.l3 + 0.024, 0.008], [0.8, 0.75, 1.3], hf, s + 29, { detail: 0 })]);
  g.fUp = limbL(F.l1 + 0.02, [0.081, 0.057, 0.034], p.back, p.leg, s + 30, { sq: 1.2, mid: 0.3, sides: 5 });
  g.fLo = merge([limbL(F.l2 + 0.01, [0.034, 0.032, 0.023], p.leg, p.leg, s + 32, { sq: 1.1 })]);
  g.fFt = merge([limbL(F.l3 * 0.78, [0.023, 0.021, 0.023], p.leg, mix(p.leg, p.dark, 0.5), s + 34), B(0.03, [0, -F.l3 + 0.024, 0.008], [0.8, 0.75, 1.3], hf, s + 35, { detail: 0 })]);
  g.tail = [merge([back(0.09, 0.03, 0.026, p.dark, p.dark, s + 40, { segs: 4 })]), back(0.07, 0.026, 0.006, p.dark, p.dark, s + 41, { segs: 4 })];
  return g;
}

export class Goat extends Quad {
  constructor(opts) {
    super('goat', { radius: 0.45, height: 0.9, length: 1.1, eyeHeight: 0.85 }, opts, CFG, {});
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('goat' + v, () => geo(v));
    this.add(this.rear, G.rump); this.add(this.front, G.chest);
    this.add(this.neck1, G.neck1); this.add(this.neck2, G.neck2);
    this.add(this.head, G.head); this.add(this.jaw, G.jaw);
    this.ears.forEach((e) => this.add(e, G.ear));
    this.legs.forEach((l, i) => { const f = i % 2; this.add(l.hip, f ? G.fUp : G.hUp); this.add(l.knee, f ? G.fLo : G.hLo); this.add(l.ank, f ? G.fFt : G.hFt); });
    this.tail.forEach((j, i) => this.add(j, G.tail[i]));
  }
  tuckTarget(i, Lh) { const sx = this.legs[i].sx, fore = i % 2; return fore ? [sx * 0.03, -Lh * 0.42, Lh * 0.55] : [sx * 0.06, -Lh * 0.38, Lh * 0.25]; }
  posing(T, c) {
    const w = c.w, t = c.t, tel = ease(c.tel), atk = c.atk, S = c.S, ak = c.ak;
    T.pin = 0.0 + c.aggro * 0.5 + w.flee * 0.5; T.earSw = sn(t * 0.9, 3) * 0.5 * c.calm;
    T.tailWag = 0.15; T.tailF = 4; T.tailP = 0.5 + 0.3 * c.r;
    // alert idle: head high, ears swivelling, chewing in bursts
    const chewK = w.idle * smoothstep(-0.2, 0.5, Math.sin(t * 0.27 + this.seed * 2));
    T.jaw += chewK * (0.06 + 0.06 * Math.max(0, Math.sin(t * 8.5))); T.hy += Math.sin(t * 8.5) * 0.02 * chewK;
    T.e1 += 0.06 * Math.sin(t * 0.4) * w.idle; T.hp += -0.08 * w.idle;
    T.e1 += -0.3 * c.r; T.hp += 0.2 * c.r + 0.2 * w.flee;
    // jump posture
    T.pitch += -clamp(S.vy / 5, -1, 1) * 0.28 * c.air; T.rear += 0.08 * c.air; T.e1 += 0.1 * c.air;
    T.e1 += -0.9 * w.eat; T.e2 += -0.6 * w.eat; T.hp += 1.1 * w.eat; T.jaw += w.eat * (0.08 + 0.1 * Math.max(0, Math.sin(t * 8)));
    const low = w.stalk * 0.12 + w.circle * 0.1; T.H -= low; T.e1 -= low * 2; T.hp += low;
    T.hy += w.stunned * sn(t * 2.2, 5) * 0.5; T.hp += w.stunned * 0.35; T.spread += 0.04 * w.stunned; T.H -= 0.08 * w.stunned; T.e1 -= 0.4 * w.stunned;
    T.H -= 0.14 * w.hide; T.pin += 0.5 * w.hide; T.e1 -= 0.4 * w.hide;
    const how = w.howl; T.e1 += 0.2 * how; T.hp += -0.6 * how; T.jaw += how * (0.35 + 0.15 * Math.sin(t * 9)); T.shake += 0.3 * how;
    const sl = w.sleep;
    T.H = lerp(T.H, 0.34, sl); T.tuck = sl; T.e1 = lerp(T.e1, 0.5, sl); T.e2 = lerp(T.e2, 0.2, sl); T.hp = lerp(T.hp, 0.7, sl); T.hy += 0.9 * sl; T.pin = lerp(T.pin, 0.6, sl); T.breath = 1 + 1.4 * sl; T.tailWag *= 1 - sl;
    // ---- telegraph: lower the horns, paw the ground, tail flicks ----
    if (c.tel > 0 && w.attack < 0.5) {
      const a = Math.sin(t * TAU * 2.6);
      T.H -= 0.03 * tel; T.pitch += 0.12 * tel; T.front += 0.05 * tel; T.rear += -0.06 * tel;
      T.e1 += -0.65 * tel; T.e2 += -0.4 * tel; T.hp += 0.8 * tel; T.pin += 0.4 * tel; T.tailP += 0.3 * tel; T.tailWag += 0.35 * tel; T.tailF += 8 * tel; T.shake += tel * tel * 0.4;
      T.lift[1] = Math.max(0, a) * 0.13 * tel; T.fwd[1] = (a > 0 ? 0.12 * a : 0.15 * a) * tel; T.fwd[0] = -0.03 * tel; T.fwd[2] = -0.03 * tel;
    }
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      const k = smoothstep(0, 0.15, atk) * (1 - smoothstep(0.75, 1, atk));
      T.H -= 0.06 * k; T.pitch += 0.1 * k; T.e1 += -0.7 * k; T.e2 += -0.4 * k; T.hp += 0.9 * k; T.pin += 0.5 * k; T.dz += 0.05 * k; T.tailP += 0.3 * k;
      // headbutt: upward toss at the end of the strike
      T.hp += -1.3 * smoothstep(0.4, 0.55, atk) * (1 - smoothstep(0.55, 0.85, atk)); T.e1 += 0.3 * smoothstep(0.4, 0.55, atk) * (1 - smoothstep(0.55, 0.85, atk));
    }
  }
}
