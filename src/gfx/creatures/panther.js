// Panther: sleek, low-slung, glowing yellow-green eyes, very long tail. Quadruped rig from quad.js. Faces +Z.
// stalk = belly-low creep with scapula roll; telegraph 'pounce' = crouch, hind-leg shuffle, tail-tip flick, eyes flare;
// attack 'pounce' = full-body stretch mid-air; 'sleep' = lying on its side breathing; 'howl' = roar.
import { Quad } from './quad.js';
import { THREE, B, loft, torso, limbL, along, up, spike, merge, cached, col, mix, shade, clamp, lerp, smoothstep, ease, sn, TAU } from './kit.js';

const PAL = [
  { back: 0x2e2e34, belly: 0x3b3a40, rose: 0x46454c, leg: 0x2b2a2f, pad: 0x161518, muzzle: 0x3b3a3f },
  { back: 0x3a2a22, belly: 0x54402f, rose: 0x5a4436, leg: 0x3f2f26, pad: 0x1b1310, muzzle: 0x5b4636 },
  { back: 0x2b2f38, belly: 0x3d424c, rose: 0x4a5060, leg: 0x30343d, pad: 0x15171c, muzzle: 0x454a55 },
  { back: 0x312d24, belly: 0x4a4335, rose: 0x554c3a, leg: 0x37332a, pad: 0x171510, muzzle: 0x53493a },
];
const CFG = {
  H: 0.6, bodyR: 0.16, legLen: 0.55, maxSpeed: 10,
  hind: { x: 0.09, y: -0.08, z: -0.44, l1: 0.26, l2: 0.25, l3: 0.15, bend: 1, fz: -0.06 },
  fore: { x: 0.085, y: -0.05, z: 0.38, l1: 0.24, l2: 0.24, l3: 0.16, bend: -1, fz: 0.05 },
  neck: { y: 0.06, z: 0.5, l1: 0.13, l2: 0.11, e1: 0.6, e2: 0.35, hp: 0.3 },
  tail: { y: 0.06, z: 0.66, l: [0.2, 0.2, 0.2, 0.2], p: -0.5, curl: 0.12 },
  ears: { x: 0.062, y: 0.09, z: -0.03, rx: 0.1, rz: 0.2, pinRx: -0.7, pinRz: 0.75 },
  jaw: { y: -0.04, z: 0.04 },
  gait: { gT: [0.2, 0.4], gG: [0.6, 0.85], walk: 1.9, trot: 3.0, gallop: 4.8, liftW: 0.13, liftT: 0.2, liftG: 0.3 },
};

function geo(v) {
  const p = PAL[v], g = {}, s = 100 + v * 10;
  const prof = [[-0.74, 0.02, 0.03, 0.06], [-0.64, 0.09, 0.1, 0.05], [-0.48, 0.16, 0.17, 0.03], [-0.26, 0.135, 0.14, 0.035], [-0.05, 0.125, 0.13, 0.03], [0.16, 0.155, 0.185, 0.0], [0.34, 0.17, 0.205, -0.01], [0.5, 0.13, 0.17, 0.0], [0.64, 0.065, 0.09, 0.02]];
  const bk = col(p.back), bl = col(p.belly), rs = col(p.rose), tmp = new THREE.Color();
  const body = (x, y, z, fr) => {
    tmp.copy(bk).lerp(bl, smoothstep(0.0, -0.13, y));
    const spot = Math.sin(x * 55 + z * 9) * Math.sin(z * 47 - y * 31 + 1.3) * Math.sin(y * 40 + z * 13);   // subtle rosette pattern
    if (spot > 0.35) tmp.lerp(rs, 0.85);
    return tmp.clone();
  };
  { const t = torso(prof, -0.74, 0.64, { steps: 4, color: body, seed: s + 1, jit: 0.01 }); g.rump = t.rear; g.chest = t.front; }
  g.neck1 = up(0.2, 0.12, 0.1, p.back, p.back, s + 7, { segs: 6 });
  g.neck2 = up(0.15, 0.1, 0.09, p.back, p.back, s + 8, { segs: 6 });
  g.head = merge([
    B(0.112, [0, 0.015, 0.03], [0.95, 0.88, 1.0], body, s + 9, { jit: 0.07 }),
    along(0.11, 0.075, 0.05, p.muzzle, p.muzzle, s + 10, { segs: 6, pos: [0, -0.03, 0.09], squash: [1.05, 1, 0.8] }),
    B(0.024, [0, -0.005, 0.2], [1.2, 0.75, 0.8], 0x25171a, s + 11, { detail: 0 }),
    B(0.04, [0.055, -0.03, 0.04], [0.8, 0.8, 1.2], p.muzzle, s + 12, { detail: 0 }), B(0.04, [-0.055, -0.03, 0.04], [0.8, 0.8, 1.2], p.muzzle, s + 13, { detail: 0 }),
    spike(0.01, 0.045, 0xece6d4, 0xffffff, s + 16, { segs: 3, pos: [0.03, -0.055, 0.15], rot: [Math.PI, 0, 0] }), spike(0.01, 0.045, 0xece6d4, 0xffffff, s + 17, { segs: 3, pos: [-0.03, -0.055, 0.15], rot: [Math.PI, 0, 0] }),
  ]);
  g.jaw = merge([along(0.12, 0.05, 0.035, p.muzzle, p.muzzle, s + 18, { segs: 5, squash: [1, 1, 0.75] }),
    spike(0.009, 0.04, 0xece6d4, 0xffffff, s + 19, { segs: 3, pos: [0.028, 0.006, 0.105] }), spike(0.009, 0.04, 0xece6d4, 0xffffff, s + 20, { segs: 3, pos: [-0.028, 0.006, 0.105] })]);
  g.eyes = merge([B(0.017, [0.052, 0.035, 0.085], [0.6, 0.7, 1.4], 0xffffff, s + 21, { detail: 0, rot: [0, 0.35, 0] }), B(0.017, [-0.052, 0.035, 0.085], [0.6, 0.7, 1.4], 0xffffff, s + 22, { detail: 0, rot: [0, -0.35, 0] })]);
  g.ear = merge([up(0.07, 0.05, 0.02, p.back, shade(p.back, 1.3), s + 23, { segs: 5, squash: [1, 1, 0.5], jit: 0.006 })]);
  const H = CFG.hind, F = CFG.fore;
  g.hUp = limbL(H.l1 + 0.02, [0.118, 0.087, 0.050], p.back, p.leg, s + 24, { sq: 1.25, shift: 0.02, mid: 0.3, sides: 5 });
  g.hLo = merge([limbL(H.l2 + 0.01, [0.049, 0.045, 0.034], p.leg, p.leg, s + 26, { sq: 1.1 })]);
  g.hFt = merge([limbL(H.l3 * 0.8, [0.034, 0.031, 0.034], p.leg, p.leg, s + 28), B(0.05, [0, -H.l3 + 0.024, 0.03], [0.9, 0.6, 1.4], p.pad, s + 29, { detail: 0 })]);
  g.fUp = limbL(F.l1 + 0.02, [0.101, 0.078, 0.047], p.back, p.leg, s + 30, { sq: 1.2, mid: 0.3, sides: 5 });
  g.fLo = merge([limbL(F.l2 + 0.01, [0.047, 0.045, 0.036], p.leg, p.leg, s + 32, { sq: 1.1 })]);
  g.fFt = merge([limbL(F.l3 * 0.8, [0.036, 0.034, 0.036], p.leg, p.leg, s + 34), B(0.054, [0, -F.l3 + 0.024, 0.03], [0.95, 0.6, 1.4], p.pad, s + 35, { detail: 0 })]);
  // long tail: 4 segments, slightly thicker at the base, curled end lighter
  const tr = [0.048, 0.044, 0.04, 0.036, 0.03];
  g.tail = [0, 1, 2, 3].map((k) => {
    const ctrl = [[-0.21, tr[k + 1], tr[k + 1], 0, 0], [0, tr[k], tr[k], 0, 0]];
    const gg = loft([[-0.22, tr[k + 1], tr[k + 1], 0], [-0.11, (tr[k] + tr[k + 1]) / 2, (tr[k] + tr[k + 1]) / 2, 0], [0.02, tr[k], tr[k], 0]], -0.22, 0, { steps: 2, sides: 5, color: (x, y, z) => mix(p.back, p.belly, k === 3 ? 0.4 : 0.1).clone(), seed: s + 40 + k, jit: 0.006, capStart: k === 3, capEnd: false });
    return gg;
  });
  return g;
}

export class Panther extends Quad {
  constructor(opts) {
    super('panther', { radius: 0.45, height: 0.8, length: 1.6, eyeHeight: 0.62 }, opts, CFG, { eye: 0xd8ff30, eyeMin: 1.0, eyeGain: 4.0, telGlow: 1 });
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('panther' + v, () => geo(v));
    this.add(this.rear, G.rump); this.add(this.front, G.chest);
    this.add(this.neck1, G.neck1); this.add(this.neck2, G.neck2);
    this.add(this.head, G.head); this.add(this.jaw, G.jaw); this.add(this.head, G.eyes, 'eye');
    this.ears.forEach((e) => this.add(e, G.ear));
    this.legs.forEach((l, i) => { const f = i % 2; this.add(l.hip, f ? G.fUp : G.hUp); this.add(l.knee, f ? G.fLo : G.hLo); this.add(l.ank, f ? G.fFt : G.hFt); });
    this.tail.forEach((j, i) => this.add(j, G.tail[i]));
    this._telGlowOn = true;
  }
  tuckTarget(i, Lh) {
    const sx = this.legs[i].sx, fore = i % 2;
    return fore ? [sx * 0.04, -Lh * 0.5, Lh * 0.62] : [sx * 0.07, -Lh * 0.42, Lh * 0.3];
  }
  posing(T, c) {
    const w = c.w, t = c.t, tel = ease(c.tel), atk = c.atk, S = c.S;
    T.pin = 0.12 + c.aggro * 0.6 + w.flee * 0.4; T.jaw = c.aggro * 0.1;
    T.earSw = sn(t * 0.5, 4) * 0.2 * c.calm;
    T.tailWag = 0.12 + 0.05 * w.idle; T.tailF = 1.6 + c.r * 2; T.tailP = -0.6 + 0.9 * c.r + 0.1 * Math.sin(t * 0.8);
    T.tailC = 0.16 + 0.1 * Math.sin(t * 0.9 + 1);
    T.hp += -0.08 * w.idle * (0.5 + 0.5 * Math.sin(t * 0.31)); T.hr = 0.06 * sn(t * 0.4, 1) * w.idle;
    T.e1 += -0.2 * c.r; T.hp += 0.05 * c.r + 0.15 * w.flee;
    // stalk: belly low, slow scapula-roll creep, head level with the back, tail low
    const low = w.stalk * 0.27 + w.circle * 0.2;
    T.H -= low; T.e1 -= low * 1.2; T.hp += low * 0.9; T.pitch += low * 0.28; T.tailP -= low * 0.35; T.tailC -= low * 0.1; T.liftK = 1 + low * 1.6; T.scap = 0.045 * clamp(low * 4, 0, 1.2); T.spread += 0.02 * low * 3; T.pin += low * 0.5; T.tailWag *= 1 - low * 1.5;
    T.e1 += -0.55 * w.eat; T.hp += 0.8 * w.eat; T.jaw += w.eat * (0.1 + 0.12 * Math.max(0, Math.sin(t * 9)));
    // roar
    const how = w.howl;
    T.e1 += 0.35 * how; T.hp += -0.45 * how; T.jaw += how * (0.85 + 0.05 * Math.sin(t * 22)); T.front += -0.1 * how; T.pin += how * 0.4; T.H -= 0.06 * how; T.shake += how * 0.5; T.tailP += 0.3 * how;
    T.hy += w.stunned * sn(t * 2.2, 5) * 0.5; T.hp += w.stunned * 0.35; T.spread += 0.04 * w.stunned; T.H -= 0.08 * w.stunned; T.e1 -= 0.3 * w.stunned;
    T.H -= 0.12 * w.hide; T.pin += 0.4 * w.hide;
    // sleep: lying on its side, legs loose, head resting; breathing deepens
    const sl = w.sleep;
    T.lay = sl * 0.85; T.tuck = sl; T.H = lerp(T.H, 0.45, sl); T.e1 = lerp(T.e1, 0.35, sl); T.e2 = lerp(T.e2, 0.2, sl); T.hp += 0.5 * sl; T.hy += 0.0; T.tailP = lerp(T.tailP, -0.15, sl); T.tailYaw += 0.9 * sl * this.layDir; T.tailC += 0.2 * sl;
    T.pin = lerp(T.pin, 0.6, sl); T.breath = 1 + 2.2 * sl; T.rearYaw += 0.25 * sl; T.frontYaw += -0.15 * sl; T.tailWag *= 1 - sl; T.rear += 0.12 * sl;
    // ---- telegraph: coil, hind shuffle, tail-tip flick, eyes flare (glow via telegraph) ----
    if (c.tel > 0 && w.attack < 0.5) {
      T.H -= 0.27 * tel; T.pitch += 0.13 * tel; T.front += 0.08 * tel; T.rear += -0.1 * tel;
      T.e1 += -0.45 * tel; T.hp += 0.2 * tel; T.jaw += 0.15 * tel; T.pin += 0.7 * tel; T.tailP += 0.15 * tel - 0.25 * tel; T.tailFlick = tel * 0.9; T.tailWag += 0.1 * tel; T.tailF += 2 * tel;
      T.shake += tel * tel * 0.5; T.spread += 0.03 * tel;
      const sh = tel * (0.6 + 0.4 * tel);
      T.fwd[0] = -0.04 * tel + Math.sin(t * 15) * 0.035 * sh; T.fwd[2] = -0.04 * tel + Math.sin(t * 15 + Math.PI) * 0.035 * sh;
      T.lift[0] = Math.max(0, Math.sin(t * 15)) * 0.02 * sh; T.lift[2] = Math.max(0, -Math.sin(t * 15)) * 0.02 * sh;
    }
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      const lo = smoothstep(0, 0.1, atk), fly = smoothstep(0.08, 0.26, atk) * (1 - smoothstep(0.7, 0.9, atk));
      const land = smoothstep(0.85, 0.95, atk) * (1 - smoothstep(0.96, 1, atk));
      T.H -= 0.22 * (1 - fly) * lo; T.wAir = fly; T.airK = 1.0 - 1.4 * smoothstep(0.55, 0.85, atk);
      T.pitch += -0.16 * fly + 0.4 * smoothstep(0.5, 0.85, atk) * (1 - smoothstep(0.85, 1, atk)); T.e1 += -0.4 * fly; T.e2 += 0.1 * fly; T.hp += 0.05;
      T.jaw += 0.7 * smoothstep(0.3, 0.55, atk) * (1 - smoothstep(0.75, 0.9, atk)); T.rear += 0.28 * fly; T.front += -0.22 * fly; T.tailP += 0.35 * fly; T.pin += 0.5; T.H -= 0.14 * land;
      T.rearYaw *= 0.5;
    }
  }
}
