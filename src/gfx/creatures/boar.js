// Boar (dzik): heavy front, bristly dorsal ridge, snout disc, ivory tusks. Quadruped rig from quad.js. Faces +Z.
// idle = rooting/sniffing with the head down; telegraph 'charge' = paws the ground with a front hoof, head lowers, tusks point forward,
// snorting shake; attack 'charge' = head-down low sprint; 'bite' = quick tusk jerk.
import { Quad } from './quad.js';
import { THREE, B, loft, torso, limbL, along, up, back, spike, profileAt, merge, cached, col, mix, shade, clamp, lerp, smoothstep, ease, sn, TAU } from './kit.js';

const PAL = [
  { back: 0x5a493d, belly: 0x7d6a58, leg: 0x3a302a, tip: 0x8a7a66, hoof: 0x1e1a18 },
  { back: 0x5a3f2c, belly: 0x7a5a42, leg: 0x3e2c20, tip: 0x9a7a55, hoof: 0x1e1a18 },
  { back: 0x54544e, belly: 0x77766c, leg: 0x3a3a36, tip: 0xa4a294, hoof: 0x1e1a18 },
  { back: 0x2f2925, belly: 0x4b423a, leg: 0x241f1c, tip: 0x6d6055, hoof: 0x141210 },
];
const CFG = {
  H: 0.6, bodyR: 0.22, legLen: 0.54, maxSpeed: 9,
  hind: { x: 0.11, y: -0.1, z: -0.36, l1: 0.2, l2: 0.2, l3: 0.14, bend: 1, fz: -0.05 },
  fore: { x: 0.115, y: -0.1, z: 0.34, l1: 0.2, l2: 0.2, l3: 0.14, bend: -1, fz: 0.04 },
  neck: { y: 0.1, z: 0.52, l1: 0.11, l2: 0.09, e1: 0.5, e2: 0.2, hp: 0.5 },
  tail: { y: 0.12, z: 0.6, l: [0.14, 0.14], p: -0.3, curl: -0.3 },
  ears: { x: 0.075, y: 0.11, z: -0.03, rx: -0.25, rz: 0.4, pinRx: -1.0, pinRz: 0.95 },
  jaw: { y: -0.05, z: 0.05 },
  gait: { gT: [0.22, 0.42], gG: [0.62, 0.85], walk: 1.9, trot: 2.9, gallop: 4.2, liftW: 0.12, liftT: 0.18, liftG: 0.25 },
};
const PROF = [[-0.64, 0.03, 0.04, 0.09], [-0.52, 0.15, 0.16, 0.06], [-0.36, 0.205, 0.21, 0.03], [-0.1, 0.215, 0.235, 0.04], [0.14, 0.24, 0.275, 0.05], [0.34, 0.245, 0.305, 0.04], [0.5, 0.2, 0.26, 0.0], [0.62, 0.11, 0.15, -0.02]];

function geo(v) {
  const p = PAL[v], g = {}, s = 200 + v * 10;
  const bk = col(p.back), bl = col(p.belly), tmp = new THREE.Color();
  const body = (x, y, z, fr) => tmp.copy(bk).lerp(bl, smoothstep(0.02, -0.2, y)).clone();
  { const t = torso(PROF, -0.64, 0.62, { steps: 4, sides: 8, color: body, seed: s + 1, jit: 0.014 }); g.rump = t.rear; g.chest = t.front; }
  // bristle ridge along the spine: jittered spikes, tallest at the withers
  const sp = [];
  for (let i = 0; i < 15; i++) {
    const z = 0.52 - i * 0.075, [rx, ry, cy] = profileAt(PROF, z), h = 0.085 + 0.05 * Math.exp(-Math.pow((z - 0.2) / 0.3, 2)) + ((i * 7) % 5) * 0.006;
    sp.push(spike(0.022, h, shade(p.back, 0.7), p.tip, s + i, { segs: 3, jit: 0.25, pos: [((i * 5) % 3 - 1) * 0.008, cy + ry - 0.03 - 0.27, z], rot: [-0.25 + ((i * 3) % 4) * 0.08, 0, ((i * 7) % 5 - 2) * 0.09] }));
  }
  g.bristles = merge(sp);
  g.neck1 = up(0.16, 0.16, 0.14, p.back, p.back, s + 7, { segs: 6 });
  g.neck2 = up(0.12, 0.14, 0.12, p.back, p.back, s + 8, { segs: 6 });
  g.head = merge([
    B(0.15, [0, 0.0, 0.03], [0.92, 0.88, 1.1], fur0(p), s + 9, { jit: 0.08 }),
    along(0.25, 0.105, 0.06, mix(p.back, p.belly, 0.4), mix(p.back, p.belly, 0.5), s + 10, { segs: 6, pos: [0, -0.035, 0.1], squash: [1, 1, 0.85] }),
    B(0.065, [0, -0.035, 0.36], [1, 0.9, 0.5], 0x8a6a62, s + 11, { detail: 0, jit: 0.06 }),
    B(0.012, [0.02, -0.03, 0.385], [1, 1, 0.5], 0x1a1211, s + 12, { detail: 0 }), B(0.012, [-0.02, -0.03, 0.385], [1, 1, 0.5], 0x1a1211, s + 13, { detail: 0 }),
    B(0.03, [0.06, 0.08, 0.08], [1.1, 0.6, 1.2], shade(p.back, 0.8), s + 14, { detail: 0 }), B(0.03, [-0.06, 0.08, 0.08], [1.1, 0.6, 1.2], shade(p.back, 0.8), s + 15, { detail: 0 }),
    B(0.016, [0.07, 0.055, 0.09], [0.6, 1, 1], 0x0d0a09, s + 16, { detail: 0 }), B(0.016, [-0.07, 0.055, 0.09], [0.6, 1, 1], 0x0d0a09, s + 17, { detail: 0 }),
    // ivory tusks curving up and forward from the lower jaw corners
    up(0.11, 0.016, 0.004, 0xe9e0c8, 0xfff8e4, s + 18, { segs: 4, bend: [0, 0.05], pos: [0.07, -0.05, 0.2], rot: [1.15, 0, -0.25] }),
    up(0.11, 0.016, 0.004, 0xe9e0c8, 0xfff8e4, s + 19, { segs: 4, bend: [0, 0.05], pos: [-0.07, -0.05, 0.2], rot: [1.15, 0, 0.25] }),
  ]);
  g.jaw = along(0.18, 0.05, 0.035, mix(p.back, p.belly, 0.3), mix(p.back, p.belly, 0.4), s + 20, { segs: 5, squash: [1, 1, 0.75] });
  g.ear = up(0.09, 0.05, 0.008, shade(p.back, 0.85), shade(p.back, 0.6), s + 23, { segs: 3, squash: [1, 1, 0.45], jit: 0.01 });
  const H = CFG.hind, F = CFG.fore, hf = p.hoof;
  g.hUp = limbL(H.l1 + 0.02, [0.12, 0.09, 0.055], p.back, p.leg, s + 24, { sq: 1.2, shift: 0.02, mid: 0.3, sides: 5 });
  g.hLo = merge([limbL(H.l2 + 0.01, [0.055, 0.048, 0.036], p.leg, p.leg, s + 26, { sq: 1.1 })]);
  g.hFt = merge([limbL(H.l3 * 0.75, [0.036, 0.034, 0.034], p.leg, p.leg, s + 28), B(0.05, [0, -H.l3 + 0.03, 0.012], [0.85, 0.7, 1.2], hf, s + 29, { detail: 0 })]);
  g.fUp = limbL(F.l1 + 0.02, [0.115, 0.085, 0.052], p.back, p.leg, s + 30, { sq: 1.15, mid: 0.3, sides: 5 });
  g.fLo = merge([limbL(F.l2 + 0.01, [0.052, 0.046, 0.036], p.leg, p.leg, s + 32, { sq: 1.1 })]);
  g.fFt = merge([limbL(F.l3 * 0.75, [0.036, 0.034, 0.034], p.leg, p.leg, s + 34), B(0.052, [0, -F.l3 + 0.03, 0.012], [0.85, 0.7, 1.2], hf, s + 35, { detail: 0 })]);
  g.tail = [back(0.15, 0.03, 0.02, p.back, p.back, s + 40, { segs: 4 }), merge([back(0.15, 0.02, 0.012, p.back, p.back, s + 41, { segs: 4 }), spike(0.028, 0.09, p.tip, shade(p.back, 0.6), s + 42, { segs: 4, pos: [0, 0, -0.14], rot: [-Math.PI / 2 - 0.1, 0, 0] })])];
  return g;
}
const fur0 = (p) => { const bk = col(p.back), bl = col(p.belly), t = new THREE.Color(); return (x, y) => t.copy(bk).lerp(bl, smoothstep(0.03, -0.1, y)).clone(); };

export class Boar extends Quad {
  constructor(opts) {
    super('boar', { radius: 0.55, height: 0.9, length: 1.3, eyeHeight: 0.75 }, opts, CFG, {});
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('boar' + v, () => geo(v));
    this.add(this.rear, G.rump); this.add(this.front, G.chest);
    this.bristles = this.add(this.body, G.bristles); this.bristles.position.y = 0.27;
    this.add(this.neck1, G.neck1); this.add(this.neck2, G.neck2);
    this.add(this.head, G.head); this.add(this.jaw, G.jaw);
    this.ears.forEach((e) => this.add(e, G.ear));
    this.legs.forEach((l, i) => { const f = i % 2; this.add(l.hip, f ? G.fUp : G.hUp); this.add(l.knee, f ? G.fLo : G.hLo); this.add(l.ank, f ? G.fFt : G.hFt); });
    this.tail.forEach((j, i) => this.add(j, G.tail[i]));
  }
  tuckTarget(i, Lh) { const sx = this.legs[i].sx, fore = i % 2; return fore ? [sx * 0.05, -Lh * 0.45, Lh * 0.5] : [sx * 0.08, -Lh * 0.4, Lh * 0.2]; }
  posing(T, c) {
    const w = c.w, t = c.t, tel = ease(c.tel), atk = c.atk, S = c.S, ak = c.ak;
    T.pin = 0.05 + c.aggro * 0.6; T.jaw = c.aggro * 0.06; T.bristle = c.aggro * 0.9;
    T.earSw = sn(t * 0.7, 3) * 0.3 * c.calm;
    T.tailWag = 0.25 + 0.15 * c.r; T.tailF = 3 + c.r * 5; T.tailP = -0.3 + 0.9 * c.r;
    // idle: rooting/sniffing with the snout at the ground, then lifting to look around
    const rootW = w.idle * smoothstep(-0.1, 0.35, Math.sin(t * 0.33 + this.seed));
    T.e1 = lerp(T.e1, 0.02, rootW * 0.9); T.e2 = lerp(T.e2, -0.3, rootW * 0.9); T.hp = lerp(T.hp, 1.15, rootW * 0.9) + Math.sin(t * 3.4) * 0.09 * rootW; T.pitch += 0.05 * rootW; T.hy += Math.sin(t * 1.7) * 0.18 * rootW;
    T.e1 += -0.25 * c.r; T.hp += 0.15 * c.r;
    T.e1 += -0.5 * w.eat; T.hp += 0.55 * w.eat + Math.sin(t * 5) * 0.08 * w.eat; T.jaw += w.eat * 0.1 * Math.max(0, Math.sin(t * 8));
    T.e1 -= w.stalk * 0.2; T.H -= 0.05 * (w.stalk + w.circle) ; T.hp += 0.2 * (w.circle + w.stalk);
    T.hy += w.stunned * sn(t * 2.2, 5) * 0.5; T.hp += w.stunned * 0.35; T.spread += 0.04 * w.stunned; T.H -= 0.06 * w.stunned;
    T.H -= 0.12 * w.hide; T.pin += 0.4 * w.hide;
    const how = w.howl; T.e1 += 0.3 * how; T.hp += -0.7 * how; T.jaw += 0.5 * how * (0.7 + 0.3 * Math.sin(t * 10)); T.shake += 0.5 * how;
    const sl = w.sleep;
    T.H = lerp(T.H, 0.33, sl); T.tuck = sl; T.e1 = lerp(T.e1, 0.1, sl); T.hp = lerp(T.hp, 0.9, sl); T.pin = lerp(T.pin, 0.8, sl); T.tailWag *= 1 - sl; T.breath = 1 + 1.5 * sl; T.hy += 0.4 * sl; T.rearYaw += 0.25 * sl;
    // ---- telegraph: paw with a front hoof, lower the head, tusks forward, snort shakes ----
    if (c.tel > 0 && w.attack < 0.5) {
      const a = Math.sin(t * TAU * 2.3), stroke = tel;
      T.pitch += 0.12 * tel; T.H -= 0.05 * tel; T.rear += -0.05 * tel; T.front += 0.06 * tel;
      T.e1 += -0.3 * tel; T.e2 += -0.15 * tel; T.hp += (0.35 - Math.max(0, Math.sin(t * 7.5)) * 0.35) * tel; T.jaw += 0.06 * tel + 0.07 * Math.max(0, Math.sin(t * 7.5)) * tel;
      T.pin += 0.5 * tel; T.bristle = Math.max(T.bristle, tel); T.tailP += 0.4 * tel; T.tailWag += 0.15 * tel; T.tailF += 4 * tel;
      T.shake += tel * tel * 0.7;
      T.lift[1] = Math.max(0, a) * 0.15 * stroke; T.fwd[1] = (a > 0 ? 0.13 * a : 0.16 * a) * stroke;    // paw forward, then scrape back along the ground
      T.fwd[0] = -0.03 * tel; T.fwd[2] = -0.03 * tel; T.spread += 0.02 * tel;
    }
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      if (ak === 'charge') {
        const k = smoothstep(0, 0.15, atk) * (1 - smoothstep(0.85, 1, atk));
        T.H -= 0.09 * k; T.pitch += 0.12 * k; T.e1 += -0.4 * k; T.e2 += -0.2 * k; T.hp += 0.6 * k; T.pin += 0.7 * k; T.bristle = Math.max(T.bristle, k); T.tailP += 0.4 * k; T.dz += 0.04 * k;
        T.hy += Math.sin(atk * 20) * 0.12 * k;    // tusk sweep
      } else {
        const lunge = smoothstep(0, 0.25, atk) * (1 - smoothstep(0.5, 1, atk));
        T.dz += 0.07 * lunge; T.pitch += 0.1 * lunge; T.e1 += -0.5 * lunge; T.hp += 0.6 * lunge - 1.0 * smoothstep(0.15, 0.4, atk) * (1 - smoothstep(0.4, 0.7, atk)); T.jaw += 0.5 * smoothstep(0.1, 0.35, atk) * (1 - smoothstep(0.4, 0.5, atk)); T.pin += 0.6;
      }
    }
  }
  extras(c, P) { this.bristles.scale.set(1, 0.7 + clamp(P.bristle ?? 0, 0, 1) * 0.9, 1); }
}
