// Wolf (wolf variants: grey / dark / white-tipped / tan). Quadruped rig from quad.js. Faces +Z.
// telegraph 'bite'/'pounce' = low crouch, hind legs coil, lips curl (jaw ajar), hackles rise, growl shudder; 'howl' = head thrown up, jaws open;
// 'sleep' = curled up; 'circle'/'stalk' = low prowl.
import { Quad } from './quad.js';
import { THREE, B, loft, torso, limb, limbL, along, back, up, spike, fur, merge, cached, col, mix, shade, clamp, lerp, smoothstep, ease, sn, TAU } from './kit.js';

const PAL = [
  { back: 0x6f7173, belly: 0xbdb8ac, dark: 0x3a3b3d, tip: 0x6f7173, leg: 0x8a8378, muzzle: 0xb9b2a4 },
  { back: 0x35322f, belly: 0x5f574f, dark: 0x1c1a19, tip: 0x35322f, leg: 0x4a423b, muzzle: 0x6a6157 },
  { back: 0x8c8983, belly: 0xe2ddd2, dark: 0x4a4744, tip: 0xf2eee4, leg: 0xcfc9bd, muzzle: 0xe0dbd0 },
  { back: 0x8d7b62, belly: 0xd3c4a8, dark: 0x4a3d2e, tip: 0x3d3228, leg: 0xa39072, muzzle: 0xcbbb9c },
];
const CFG = {
  H: 0.64, bodyR: 0.17, legLen: 0.6, maxSpeed: 9,
  hind: { x: 0.095, y: -0.09, z: -0.4, l1: 0.27, l2: 0.26, l3: 0.15, bend: 1, fz: -0.06 },
  fore: { x: 0.095, y: -0.06, z: 0.34, l1: 0.24, l2: 0.24, l3: 0.17, bend: -1, fz: 0.05 },
  neck: { y: 0.09, z: 0.49, l1: 0.15, l2: 0.13, e1: 0.95, e2: 0.6, hp: 0.32 },
  tail: { y: 0.09, z: 0.6, l: [0.17, 0.17, 0.16], p: -0.55, curl: -0.22 },
  ears: { x: 0.058, y: 0.085, z: -0.035, rx: 0.05, rz: 0.22, pinRx: -0.95, pinRz: 0.7 },
  jaw: { y: -0.04, z: 0.045 },
  gait: { gT: [0.22, 0.42], gG: [0.62, 0.85], walk: 1.85, trot: 2.9, gallop: 4.5, liftW: 0.14, liftT: 0.2, liftG: 0.3 },
};

function geo(v) {
  const p = PAL[v], g = {}, s = v * 10;
  const prof = [[-0.68, 0.02, 0.03, 0.07], [-0.58, 0.1, 0.11, 0.07], [-0.44, 0.17, 0.18, 0.04], [-0.24, 0.15, 0.145, 0.045], [-0.05, 0.132, 0.14, 0.05], [0.16, 0.165, 0.205, 0.005], [0.34, 0.182, 0.25, -0.01], [0.5, 0.14, 0.2, 0.0], [0.62, 0.065, 0.1, 0.02]];
  const dark = col(p.dark), bk = col(p.back), bl = col(p.belly), tmp = new THREE.Color();
  const body = (x, y, z, fr) => { const tb = smoothstep(0.02, -0.14, y); tmp.copy(bk); if (y > 0.05 && z > -0.3 && z < 0.4) tmp.lerp(dark, 0.45 * smoothstep(0.05, 0.16, y)); return tmp.lerp(bl, tb).clone(); };
  { const t = torso(prof, -0.68, 0.62, { steps: 4, color: body, seed: s + 1, jit: 0.012 }); g.rump = t.rear; g.chest = t.front; }
  g.barrel = new THREE.BufferGeometry();
  g.hackles = merge([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => spike(0.03, 0.085 - Math.abs(i - 2) * 0.006, shade(p.back, 0.75), shade(p.back, 1.05), s + i, { segs: 4, pos: [((i * 37) % 5 - 2) * 0.006, 0, 0.12 - i * 0.055], rot: [0.3 + i * 0.03, 0, ((i * 13) % 5 - 2) * 0.05] })));
  g.ruff = merge([B(0.11, [0, 0.0, 0], [0.95, 1, 1.15], fur(p.back, p.belly, 0, 0.13), s + 6), B(0.06, [0, -0.11, 0.08], [1, 1, 1], p.belly, s + 7, { detail: 0 })]);
  g.neck1 = up(0.2, 0.125, 0.105, p.back, p.back, s + 7, { segs: 6 });
  g.neck2 = up(0.17, 0.105, 0.085, p.back, p.back, s + 8, { segs: 6 });
  g.head = merge([
    B(0.118, [0, 0.02, 0.035], [0.86, 0.84, 1.05], fur(p.back, p.muzzle, 0.02, 0.1), s + 9),
    along(0.19, 0.06, 0.034, p.muzzle, p.muzzle, s + 10, { segs: 5, pos: [0, -0.012, 0.085], squash: [1, 1, 0.82] }),
    B(0.024, [0, 0.0, 0.272], [1, 0.75, 0.8], 0x151212, s + 11, { detail: 0 }),
    B(0.04, [0.075, -0.02, 0.0], [0.6, 0.8, 1.2], p.muzzle, s + 12, { detail: 0 }), B(0.04, [-0.075, -0.02, 0.0], [0.6, 0.8, 1.2], p.muzzle, s + 13, { detail: 0 }),
    spike(0.008, 0.032, 0xf2eee0, 0xfffff4, s + 16, { segs: 3, pos: [0.024, -0.034, 0.225], rot: [Math.PI, 0, 0] }), spike(0.008, 0.032, 0xf2eee0, 0xfffff4, s + 17, { segs: 3, pos: [-0.024, -0.034, 0.225], rot: [Math.PI, 0, 0] }),
  ]);
  g.jaw = merge([along(0.16, 0.038, 0.024, p.muzzle, p.muzzle, s + 18, { segs: 5, pos: [0, 0, 0.0], squash: [1, 1, 0.8] }),
    spike(0.007, 0.028, 0xf2eee0, 0xfffff4, s + 19, { segs: 3, pos: [0.02, 0.008, 0.15] }), spike(0.007, 0.028, 0xf2eee0, 0xfffff4, s + 20, { segs: 3, pos: [-0.02, 0.008, 0.15] })]);
  g.eyes = merge([B(0.016, [0.05, 0.03, 0.09], [0.55, 0.8, 1.4], 0xffffff, s + 21, { detail: 0, rot: [0, 0.3, 0] }), B(0.016, [-0.05, 0.03, 0.09], [0.55, 0.8, 1.4], 0xffffff, s + 22, { detail: 0, rot: [0, -0.3, 0] })]);
  g.ear = merge([up(0.12, 0.048, 0.006, shade(p.back, 0.95), p.tip, s + 23, { segs: 3, squash: [1, 1, 0.42], jit: 0.01 })]);
  const H = CFG.hind, F = CFG.fore, pd = mix(p.leg, p.dark, 0.3);
  g.hUp = limbL(H.l1 + 0.02, [0.118, 0.088, 0.050], p.back, p.leg, s + 24, { sq: 1.25, shift: 0.02, mid: 0.3, sides: 5 });
  g.hLo = merge([limbL(H.l2 + 0.01, [0.050, 0.045, 0.031], p.leg, p.leg, s + 26, { sq: 1.1 })]);
  g.hFt = merge([limbL(H.l3 * 0.85, [0.031, 0.026, 0.024], p.leg, p.leg, s + 28), B(0.042, [0, -H.l3 + 0.02, 0.025], [0.85, 0.55, 1.5], pd, s + 29, { detail: 0 })]);
  g.fUp = limbL(F.l1 + 0.02, [0.100, 0.071, 0.045], p.back, p.leg, s + 30, { sq: 1.2, shift: 0.0, mid: 0.3, sides: 5 });
  g.fLo = merge([limbL(F.l2 + 0.01, [0.045, 0.040, 0.031], p.leg, p.leg, s + 32, { sq: 1.1 })]);
  g.fFt = merge([limbL(F.l3 * 0.85, [0.031, 0.027, 0.024], p.leg, p.leg, s + 34), B(0.044, [0, -F.l3 + 0.02, 0.026], [0.85, 0.55, 1.5], pd, s + 35, { detail: 0 })]);
  const tp = [[0, 0.045, 0.045, 0], [0.17, 0.07, 0.07, 0], [0.34, 0.078, 0.078, 0], [0.5, 0.06, 0.06, 0], [0.56, 0.015, 0.015, 0]];
  const tc = (z0, z1, k) => (x, y, z) => { const u = (z + 0.0) ; return mix(p.back, p.tip, smoothstep(0.35, 0.56, -z + 0.0)).clone().lerp(col(p.belly), 0.0); };
  const tseg = (a, b, k) => { const gg = loft(tp.map((q) => [-q[0], q[1], q[2], q[3]]).reverse(), -b - (k < 2 ? 0.02 : 0), -a, { steps: 2, sides: 5, color: (x, y, z) => mix(p.back, p.tip, smoothstep(0.34, 0.54, -z)).clone(), seed: s + 40 + k, jit: 0.008 }); return gg; };
  g.tail = [tseg(0, 0.175, 0), tseg(0.175, 0.345, 1), tseg(0.345, 0.56, 2)].map((gg, k) => { const off = [0, 0.175, 0.345][k]; gg.translate(0, 0, off); return gg; });
  return g;
}

export class Wolf extends Quad {
  constructor(opts) {
    super('wolf', { radius: 0.4, height: 0.85, length: 1.4, eyeHeight: 0.78 }, opts, CFG, { eye: 0xffb020, eyeMin: 0.9, eyeGain: 3.5, telGlow: 1 });
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('wolf' + v, () => geo(v));
    this.add(this.rear, G.rump); this.add(this.front, G.chest);
    this.hackles = this.add(this.front, G.hackles); this.hackles.position.set(0, 0.2, 0.46);
    
    this.add(this.neck1, G.neck1); this.add(this.neck2, G.neck2);
    this.add(this.head, G.head); this.add(this.jaw, G.jaw); this.add(this.head, G.eyes, 'eye');
    this.ears.forEach((e) => this.add(e, G.ear));
    this.legs.forEach((l, i) => { const f = i % 2; this.add(l.hip, f ? G.fUp : G.hUp); this.add(l.knee, f ? G.fLo : G.hLo); this.add(l.ank, f ? G.fFt : G.hFt); });
    this.tail.forEach((j, i) => this.add(j, G.tail[i]));
    this._telGlowOn = true;
    this.curl = 0;
  }
  tuckTarget(i, Lh) {
    const sx = this.legs[i].sx, fore = i % 2;
    return fore ? [sx * 0.03, -Lh * 0.42, Lh * 0.5] : [sx * 0.06, -Lh * 0.36, Lh * 0.25];
  }
  posing(T, c) {
    const w = c.w, t = c.t, tel = ease(c.tel), atk = c.atk, ak = c.ak, S = c.S;
    const pounce = ak === 'pounce';
    // baseline temperament
    T.pin = 0.1 + c.aggro * 0.7 + w.flee * 0.5;
    T.jaw = 0.02 + c.aggro * 0.12;
    T.hack = c.aggro * 0.9;
    T.tailP += -w.flee * 0.5 * 0; T.tailC += 0;
    T.earSw = sn(t * 0.6, 3) * 0.25 * c.calm;
    // idle: sniff, look around, occasional head tilt
    const sniff = w.idle * (0.5 + 0.5 * Math.sin(t * 0.37)) * 0.5;
    T.hp += -0.1 * w.idle + Math.sin(t * 7) * 0.03 * sniff; T.e1 += -0.1 * sniff; T.hr = 0.08 * sn(t * 0.4, 1) * w.idle;
    T.tailWag = 0.1 + 0.08 * w.idle + 0.1 * c.r; T.tailF = 2 + c.r * 4;
    // run posture
    T.e1 += -0.25 * c.r; T.hp += 0.05 * c.r + 0.2 * w.flee; T.tailP += 0.25 * c.r; T.tailC += 0.1 * c.r;
    // prowl (stalk/circle): low, head down, tail low
    const low = w.stalk * 0.24 + w.circle * 0.17;
    T.H -= low; T.e1 -= low * 2.0; T.hp += low * 1.3; T.pitch += low * 0.25; T.tailP -= low * 0.6; T.liftK = 1 + low * 1.5; T.pin += low * 0.6; T.hack += w.stalk * 0.4; T.jaw += w.circle * 0.08;
    T.scap = 0.03 * low * 4;
    // eating: head at the ground
    T.e1 += -0.75 * w.eat; T.hp += 0.9 * w.eat; T.pitch += 0.08 * w.eat; T.jaw += w.eat * (0.1 + 0.12 * Math.max(0, Math.sin(t * 9)));
    // howl: head thrown up, mouth open, chest forward
    const how = w.howl;
    T.e1 += 0.55 * how; T.e2 += 0.3 * how; T.hp += -1.05 * how; T.jaw += how * (0.5 + 0.06 * Math.sin(t * 5)); T.front += -0.14 * how; T.pitch += -0.14 * how; T.pin += how * 0.4; T.tailP += 0.3 * how;
    // stunned: dazed sway
    T.hy += w.stunned * sn(t * 2.2, 5) * 0.5; T.hp += w.stunned * 0.35; T.spread += 0.035 * w.stunned; T.H -= 0.06 * w.stunned; T.roll += w.stunned * sn(t * 1.7, 2) * 0.06; T.e1 -= 0.25 * w.stunned;
    // hide/flee cowering
    T.H -= 0.1 * w.hide; T.pin += 0.4 * w.hide; T.tailP -= 0.5 * w.hide;
    // sleep: curled up, nose on tail
    const sl = w.sleep;
    T.H = lerp(T.H, 0.31, sl); T.tuck = sl; T.rearYaw += 0.75 * sl; T.frontYaw += -0.6 * sl; T.pitch += 0.05 * sl;
    T.e1 = lerp(T.e1, 0.4, sl); T.e2 = lerp(T.e2, 0.2, sl); T.hp += 0.6 * sl; T.hy += -0.95 * sl; T.hr += 0.2 * sl; T.tailP = lerp(T.tailP, -0.05, sl); T.tailC += 0.25 * sl; T.tailYaw += 1.1 * sl; T.pin = lerp(T.pin, 0.85, sl); T.breath = 1 + sl * 1.5; T.hack = 0; T.tailWag *= 1 - sl;
    // ---- telegraph: crouch, coil, curl lips, hackles, growl shudder ----
    if (c.tel > 0 && w.attack < 0.5) {
      const tp = pounce ? 1.25 : 1;
      T.H -= 0.30 * tel * tp; T.pitch += 0.10 * tel; T.front += 0.1 * tel; T.rear += -0.12 * tel * tp;
      T.e1 += -0.5 * tel; T.hp += 0.25 * tel; T.jaw += 0.2 * tel; T.pin += 0.65 * tel; T.hack = Math.max(T.hack, tel); T.tailP += 0.35 * tel; T.tailC += 0.15 * tel; T.tailWag += 0.12 * tel;
      T.shake = tel * tel; T.spread += 0.03 * tel;
      // hind-leg shuffle (pounce coil): rear feet paddle forward under the body
      T.fwd[0] = -0.05 * tel + Math.sin(t * 16) * 0.02 * tel * (pounce ? 1 : 0); T.fwd[2] = -0.05 * tel + Math.cos(t * 16) * 0.02 * tel * (pounce ? 1 : 0);
      T.fwd[1] = 0.06 * tel; T.fwd[3] = 0.06 * tel;
      T.jaw += Math.max(0, Math.sin(t * 14)) * 0.05 * tel;
    }
    // ---- attacks ----
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      if (pounce) {
        const lo = smoothstep(0, 0.12, atk), fly = smoothstep(0.08, 0.28, atk) * (1 - smoothstep(0.72, 0.92, atk));
        T.H += -0.22 * (1 - fly) * lo * (1 - smoothstep(.72, 1, atk)); T.wAir = fly; T.airK = 1; T.pitch += -0.22 * fly + 0.32 * smoothstep(0.55, 0.85, atk) * (1 - smoothstep(0.85, 1, atk));
        T.e1 += -0.45 * fly; T.hp += 0.1 * fly; T.jaw += 0.55 * smoothstep(0.35, 0.6, atk) * (1 - smoothstep(0.65, 0.75, atk)); T.rear += 0.22 * fly; T.front += -0.15 * fly; T.tailP += 0.5 * fly; T.pin += 0.4; T.hack = Math.max(T.hack, 0.8);
        T.H -= 0.15 * smoothstep(0.85, 0.95, atk) * (1 - smoothstep(0.95, 1, atk));
      } else {
        // bite: quick lunge with a snap
        const lunge = smoothstep(0, 0.25, atk) * (1 - smoothstep(0.5, 1, atk));
        T.dz += 0.08 * lunge; T.H -= 0.08 * lunge; T.pitch += 0.12 * lunge; T.e1 += -0.55 * lunge; T.e2 += -0.2 * lunge; T.hp += 0.25 * lunge; T.front += 0.06 * lunge;
        T.jaw += 0.75 * smoothstep(0, 0.22, atk) * (1 - smoothstep(0.3, 0.42, atk)) + 0.1 * lunge;
        T.pin += 0.5; T.hack = Math.max(T.hack, 0.8);
      }
    }
  }
  extras(c, P) { this.hackles.scale.y = 0.35 + clamp(P.hack, 0, 1) * 1.2; }
}
