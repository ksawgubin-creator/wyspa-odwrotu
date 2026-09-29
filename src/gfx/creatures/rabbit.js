// Rabbit: tiny hopper with big independently twitching ears and a cotton tail. Quadruped rig from quad.js with its own hop gait. Faces +Z.
// Hop cycle (distance-driven): gather -> push-off (nose up, hind legs kick back) -> flight (stretched) -> fore paws land first -> hind feet tuck in.
// Idle: nose twitch, occasional sit-up; 'hide' flattens and pins the ears.
import { Quad } from './quad.js';
import { THREE, B, loft, torso, limbL, up, back, spike, merge, cached, col, mix, shade, clamp, lerp, smoothstep, ease, sn, TAU, Pulse } from './kit.js';

const PAL = [
  { back: 0x8a6a4a, belly: 0xdccab0, dark: 0x4a3524, leg: 0x7a5c40 },
  { back: 0x8c8b87, belly: 0xdad8d0, dark: 0x494846, leg: 0x7e7d79 },
  { back: 0xc2a67a, belly: 0xf0e4ca, dark: 0x6b5638, leg: 0xb59a70 },
  { back: 0x5e4633, belly: 0xc4b092, dark: 0x2c2018, leg: 0x50392a },
];
const CFG = {
  H: 0.17, bodyR: 0.1, legLen: 0.2, maxSpeed: 5,
  hind: { x: 0.06, y: -0.04, z: -0.095, l1: 0.1, l2: 0.1, l3: 0.085, bend: 1, fz: 0.0 },
  fore: { x: 0.04, y: -0.02, z: 0.09, l1: 0.065, l2: 0.07, l3: 0.05, bend: -1, fz: 0.02 },
  neck: { y: 0.045, z: 0.13, l1: 0.045, l2: 0.04, e1: 0.9, e2: 0.7, hp: 0.15 },
  tail: { y: 0.06, z: 0.19, l: [0.05], p: 0.5, curl: 0 },
  ears: { x: 0.03, y: 0.05, z: -0.02, rx: -0.1, rz: 0.14, pinRx: -1.3, pinRz: 0.08 },
  gait: { gT: [0.3, 0.5], gG: [0.6, 0.85], walk: 1.8, trot: 2.9, gallop: 4.5, liftW: 0.2, liftT: 0.25, liftG: 0.3 },
};
const PROF = [[-0.2, 0.02, 0.03, 0.05], [-0.16, 0.085, 0.095, 0.05], [-0.08, 0.11, 0.12, 0.055], [0.0, 0.095, 0.105, 0.05], [0.08, 0.08, 0.09, 0.045], [0.15, 0.055, 0.065, 0.04], [0.19, 0.03, 0.04, 0.04]];

function geo(v) {
  const p = PAL[v], g = {}, s = 400 + v * 10;
  const bk = col(p.back), bl = col(p.belly), tmp = new THREE.Color();
  const body = (x, y, z) => tmp.copy(bk).lerp(bl, smoothstep(0.03, -0.08, y)).clone();
  { const t = torso(PROF, -0.2, 0.19, { steps: 4, sides: 8, color: body, seed: s + 1, jit: 0.006 }); g.rump = t.rear; g.chest = t.front; }
  g.neck1 = up(0.07, 0.06, 0.05, p.back, p.back, s + 7, { segs: 6 });
  g.neck2 = up(0.06, 0.05, 0.045, p.back, p.back, s + 8, { segs: 6 });
  g.head = merge([
    B(0.058, [0, 0.0, 0.02], [0.85, 0.95, 1.05], (x, y) => mix(p.back, p.belly, smoothstep(0.0, -0.05, y)).clone(), s + 9, { jit: 0.06 }),
    B(0.036, [0, -0.02, 0.065], [0.85, 0.8, 1], mix(p.back, p.belly, 0.6), s + 10, { jit: 0.06, detail: 1 }),
    B(0.014, [0, -0.008, 0.1], [1.1, 0.8, 0.8], 0xd49a94, s + 11, { detail: 0 }),
    B(0.03, [0.032, -0.03, 0.05], [1, 0.8, 1], p.belly, s + 12, { detail: 0 }), B(0.03, [-0.032, -0.03, 0.05], [1, 0.8, 1], p.belly, s + 13, { detail: 0 }),
    B(0.016, [0.043, 0.02, 0.04], [0.7, 1.1, 1], 0x120c08, s + 14, { detail: 0 }), B(0.016, [-0.043, 0.02, 0.04], [0.7, 1.1, 1], 0x120c08, s + 15, { detail: 0 }),
  ]);
  g.ear = merge([up(0.17, 0.03, 0.012, p.back, p.dark, s + 23, { segs: 4, rows: 2, squash: [1, 1, 0.42], jit: 0.006 }), up(0.14, 0.02, 0.008, 0xd9a49b, 0xe8bdb4, s + 24, { segs: 4, squash: [1, 1, 0.3], pos: [0, 0.005, 0.006], jit: 0.004 })]);
  g.hUp = merge([limbL(0.11, [0.07, 0.052, 0.028], p.back, p.leg, s + 25, { sq: 1.15, shift: 0.02, mid: 0.3, sides: 5 })]);
  g.hLo = merge([limbL(0.105, [0.03, 0.026, 0.02], p.leg, p.leg, s + 26, { sq: 1.1 })]);
  g.hFt = merge([limbL(0.07, [0.022, 0.024, 0.026], p.leg, p.leg, s + 28), B(0.03, [0, -0.082, 0.014], [0.8, 0.6, 1.5], mix(p.leg, p.belly, 0.3), s + 29, { detail: 0 })]);
  g.fUp = limbL(0.075, [0.04, 0.032, 0.022], p.back, p.leg, s + 30, { sq: 1.15, mid: 0.3 });
  g.fLo = merge([limbL(0.075, [0.022, 0.02, 0.016], p.leg, p.leg, s + 32)]);
  g.fFt = merge([limbL(0.03, [0.016, 0.016, 0.016], p.leg, p.leg, s + 34), B(0.022, [0, -0.048, 0.012], [0.8, 0.6, 1.4], mix(p.leg, p.belly, 0.3), s + 35, { detail: 0 })]);
  g.tail = B(0.048, [0, 0.01, -0.03], [1, 1.05, 1], 0xf4f0e6, s + 40, { jit: 0.12 });
  return g;
}

export class Rabbit extends Quad {
  constructor(opts) {
    super('rabbit', { radius: 0.25, height: 0.4, length: 0.5, eyeHeight: 0.28 }, opts, CFG, {});
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('rabbit' + v, () => geo(v));
    this.add(this.rear, G.rump); this.add(this.front, G.chest);
    this.add(this.neck1, G.neck1); this.add(this.neck2, G.neck2);
    this.add(this.head, G.head);
    this.ears.forEach((e) => this.add(e, G.ear));
    this.legs.forEach((l, i) => { const f = i % 2; this.add(l.hip, f ? G.fUp : G.hUp); this.add(l.knee, f ? G.fLo : G.hLo); this.add(l.ank, f ? G.fFt : G.hFt); });
    this.add(this.tail[0], G.tail);
    this.sitP = new Pulse(this.seed + 9, 5, 12, 4.5);
    this.noseP = new Pulse(this.seed + 5, 0.6, 2.5, 1.4);
    this.hopQ = 0;
  }
  tuckTarget(i, Lh) { const sx = this.legs[i].sx, fore = i % 2; return fore ? [sx * 0.02, -Lh * 0.42, Lh * 0.22] : [sx * 0.04, -Lh * 0.45, Lh * 0.3]; }
  // Hop gait: one full hop per phase cycle, driven by distance.
  gait(dt, S, c) {
    const sp = this.sp, r = clamp(sp / S.maxSpeed, 0, 1.2);
    const hopLen = 0.2 + 0.3 * Math.min(r, 1.2), hopH = 0.04 + 0.09 * Math.min(r, 1.2);
    if (sp > 0.03) this.phase = (this.phase + sp * dt / hopLen) % 1;
    const env = smoothstep(0.05, 0.4, sp) * (1 - this.X.lay) * this.X.alive * (1 - this.airW);
    const u = this.phase, FF = 0.42, G = this.G;
    const Sc = hopLen * (1 - FF);
    let h = 0, q = 0, cc = 0;
    const inFlight = u < FF;
    if (inFlight) { q = u / FF; h = hopH * Math.pow(Math.sin(Math.PI * q), 0.85); } else cc = (u - FF) / (1 - FF);
    this.hopQ = inFlight ? Math.sin(Math.PI * q) : 0;
    const F = this.foot;
    for (const i of [0, 2]) {           // hind feet: push off together, swing forward in flight
      const f = F[i];
      if (inFlight) { f.z = lerp(-Sc / 2 - 0.03, Sc / 2, smoothstep(0.35, 1, q)); f.y = Math.max(0, h * 0.9 + 0.01) * env; f.psi = lerp(0.5, 1.1, q); f.sw = q; }
      else { f.z = Sc * (0.5 - cc); f.y = 0; f.psi = lerp(1.25, 0.55, cc * cc); f.sw = 0; }
      f.z *= env; f.psi = lerp(1.15, f.psi, env);
    }
    for (const i of [1, 3]) {           // fore feet: reach out, touch down first, lift as the hind feet push
      const f = F[i], Sf = Sc * 0.55, cf = clamp((u - 0.36) / 0.36, 0, 1), inS = u > 0.36 && u < 0.72;
      if (inS) { f.z = Sf * (0.5 - cf); f.y = 0; f.psi = lerp(0.3, -0.3, cf); f.sw = 0; }
      else { const a = u >= 0.72 ? (u - 0.72) / 0.64 : (u + 0.28) / 0.64; f.z = lerp(-Sf / 2, Sf / 2 + 0.02, smoothstep(0.2, 1, a)); f.y = Math.max(0, h * 0.85 + 0.015 + 0.02 * Math.sin(Math.PI * a)) * env; f.psi = 0.3; f.sw = a; }
      f.z *= env; f.psi *= env;
    }
    const fl = inFlight ? Math.sin(Math.PI * q) : 0, bunch = inFlight ? 0 : Math.sin(Math.PI * cc);
    G.bob = h * env - 0.012 * bunch * env;
    G.pitch = env * 0.34 * (inFlight ? -Math.cos(Math.PI * q) : Math.cos(Math.PI * cc));
    G.rear = env * (0.18 * fl - 0.2 * bunch); G.front = env * (-0.12 * fl + 0.12 * bunch);
    G.roll = 0; G.rearYaw = 0; G.frontYaw = 0; G.yaw = 0; G.env = env; G.gG = 0;
  }
  posing(T, c) {
    const w = c.w, t = c.t, atk = c.atk, S = c.S;
    // sit-up, nose twitch
    this.sitP.update(c.dt, !(S.mode === 'idle') || c.aggro > 0.3);
    const su = this.sitP.u, sit = (su < 0 ? 0 : smoothstep(0, 0.14, su) * (1 - smoothstep(0.86, 1, su))) * w.idle;
    const nose = this.noseP.update(c.dt) + 0.35 * w.idle;
    T.pin = 0.05 + c.aggro * 0.5 + w.flee * 0.45 + this.hopQ * c.r * 0.6; T.earSw = sn(t * 0.8, 2) * 0.3 * c.calm * (1 - sit * 0.5); T.earUp = sit * 0.6;
    T.tailP = 0.45 + 0.4 * c.r; T.tailWag = 0.03;
    T.hp += Math.sin(t * 24) * 0.035 * nose * w.idle; T.e1 += Math.sin(t * 24 + 1) * 0.03 * nose * w.idle;
    T.hy += 0.35 * sn(t * 0.7, 1) * w.idle * (1 - sit);
    // sit up on the haunches, forepaws to the chest
    T.pitch += -0.85 * sit; T.dy += 0.06 * sit; T.tuckF = sit; T.e1 += -0.5 * sit; T.e2 += -0.5 * sit; T.hp += -0.15 * sit; T.H *= 1 + 0.05 * sit;
    T.e1 += -0.2 * w.eat; T.hp += 0.6 * w.eat; T.e2 -= 0.3 * w.eat;
    // hide: flatten against the ground, ears pinned
    const hd = w.hide; T.H *= 1 - 0.42 * hd; T.pin = Math.max(T.pin, hd); T.e1 -= 0.5 * hd; T.hp += 0.4 * hd; T.spread += 0.03 * hd; T.tailP -= 0.3 * hd; T.pitch += 0.05 * hd; T.breath = 1 + 2 * hd;
    T.H *= 1 - 0.1 * (w.stalk + w.circle);
    T.hy += w.stunned * sn(t * 2.2, 5) * 0.6; T.hp += w.stunned * 0.4; T.spread += 0.03 * w.stunned; T.H *= 1 - 0.1 * w.stunned;
    const sl = w.sleep; T.H = lerp(T.H, 0.4, sl); T.tuck = sl; T.pin = lerp(T.pin, 0.9, sl); T.e1 = lerp(T.e1, 0.4, sl); T.hp += 0.5 * sl; T.breath = 1 + 2 * sl;
    if (c.tel > 0 && w.attack < 0.5) { const tel = ease(c.tel); T.H *= 1 - 0.25 * tel; T.pitch += 0.15 * tel; T.pin += 0.3 * tel; T.shake += tel * 0.5; T.tailP += 0.3 * tel; }
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      const l = smoothstep(0, 0.25, atk) * (1 - smoothstep(0.5, 1, atk)); T.dz += 0.06 * l; T.e1 += -0.4 * l; T.hp += 0.35 * l; T.pitch += 0.15 * l;
    }
  }
}
