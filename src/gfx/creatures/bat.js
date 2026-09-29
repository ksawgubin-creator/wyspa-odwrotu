// Bat: small furry body, membrane wings on a 3-joint arm (shoulder, elbow, wrist; the right wing is the left one mirrored via scale.x = -1
// so both use identical joint angles), red glowing eyes. Faces +Z. Wing axes: +X outward; shoulder.z = flap (+ raises the tip),
// .y = sweep (+ swings the tip backwards); elbow/wrist .y fold the wing back, .z add the whip-like lagging flex.
// Flapping rate follows speed. telegraph 'dive': wings pulled back, hovers higher, eyes flare. attack 'dive': folded plunge, then flap out.
// Optional state: s.height = metres above ground (only used to let a dead bat fall that far); 'sleep' = roosting upside-down with folded wings.
import { THREE, CreatureBase, B, up, spike, strut, fan, tris, merge, cached, col, mix, shade, clamp, lerp, damp, smoothstep, ease, easeOutBack, sn, TAU, Pulse, limbL } from './kit.js';

const PAL = [
  { fur: 0x4a3d3a, fur2: 0x6b5a52, mem: 0x3b2836, mem2: 0x5a3d4d, bone: 0x2a1c22 },
  { fur: 0x2e2a30, fur2: 0x4a4550, mem: 0x2a2233, mem2: 0x463a55, bone: 0x1c1620 },
  { fur: 0x5a4030, fur2: 0x84644a, mem: 0x4a3028, mem2: 0x6e4a3a, bone: 0x2c1e18 },
  { fur: 0x3c3a34, fur2: 0x62604f, mem: 0x33302a, mem2: 0x55503f, bone: 0x201e18 },
];

function geo(v) {
  const p = PAL[v], g = {}, s = 600 + v * 10;
  const fur = (x, y, z) => mix(p.fur, p.fur2, smoothstep(0.0, -0.06, y)).clone();
  g.body = merge([
    B(0.07, [0, 0, 0], [0.85, 0.85, 1.3], fur, s + 1, { jit: 0.1 }),
    B(0.05, [0, 0.005, 0.07], [1, 0.95, 0.9], fur, s + 2, { detail: 0, jit: 0.1 }),       // shoulders
    // uropatagium (tail membrane)
    tris([[[0.03, -0.03, -0.07], [-0.03, -0.03, -0.07], [0.0, -0.03, -0.2]], [[0.03, -0.03, -0.07], [0.075, -0.03, -0.17], [0.0, -0.03, -0.2]], [[-0.03, -0.03, -0.07], [0.0, -0.03, -0.2], [-0.075, -0.03, -0.17]]], () => col(p.mem), s + 3),
  ]);
  g.head = merge([
    B(0.05, [0, 0.0, 0.03], [1, 0.95, 1.05], fur, s + 4, { jit: 0.08 }),
    B(0.028, [0, -0.012, 0.07], [0.9, 0.75, 1.0], mix(p.fur2, 0xd0a090, 0.3), s + 5, { detail: 0 }),
    B(0.012, [0, 0.0, 0.098], [1.3, 0.8, 0.9], 0x1a1012, s + 6, { detail: 0 }),
    up(0.11, 0.028, 0.004, p.fur, p.mem2, s + 7, { segs: 3, squash: [1, 1, 0.35], pos: [0.03, 0.035, -0.005], rot: [0, 0, -0.25], jit: 0.01 }),
    up(0.11, 0.028, 0.004, p.fur, p.mem2, s + 8, { segs: 3, squash: [1, 1, 0.35], pos: [-0.03, 0.035, -0.005], rot: [0, 0, 0.25], jit: 0.01 }),
    spike(0.006, 0.02, 0xf0e8d8, 0xffffff, s + 9, { segs: 3, pos: [0.012, -0.03, 0.08], rot: [Math.PI, 0, 0] }), spike(0.006, 0.02, 0xf0e8d8, 0xffffff, s + 10, { segs: 3, pos: [-0.012, -0.03, 0.08], rot: [Math.PI, 0, 0] }),
  ]);
  g.eyes = merge([B(0.011, [0.024, 0.014, 0.062], [0.8, 0.9, 1], 0xffffff, s + 11, { detail: 0 }), B(0.011, [-0.024, 0.014, 0.062], [0.8, 0.9, 1], 0xffffff, s + 12, { detail: 0 })]);
  g.leg = merge([limbL(0.07, [0.012, 0.01, 0.007], p.fur, p.fur2, s + 13, { sides: 4 }), spike(0.006, 0.025, p.bone, p.bone, s + 14, { segs: 3, pos: [0, -0.07, 0.006], rot: [-2.2, 0, 0] })]);
  // wing pieces
  const mc = (x, y, z) => mix(p.mem, p.mem2, clamp(0.3 + x * 2.2, 0, 1)).clone();
  const bo = () => col(p.bone);
  g.wA = merge([
    tris([[[0, 0, 0.02], [0.12, 0, -0.01], [0.12, 0, -0.13]], [[0, 0, 0.02], [0.12, 0, -0.13], [0.0, 0, -0.11]]], mc, s + 20),
    strut([0, 0, 0.02], [0.125, 0, -0.01], 0.011, 0.008, p.bone, p.bone, s + 21, 4),
  ]);
  g.wB = merge([
    tris([[[0, 0, 0], [0.15, 0, 0.02], [0.13, 0, -0.16]], [[0, 0, 0], [0.13, 0, -0.16], [0, 0, -0.13]], [[0, 0, 0.0], [0, 0, -0.13], [-0.12, 0, -0.13]]], (x, y, z) => mc(x + 0.12, y, z), s + 22),
    strut([0, 0, 0], [0.155, 0, 0.02], 0.008, 0.006, p.bone, p.bone, s + 23, 4),
  ]);
  const P = [[0.22, 0, 0.11], [0.2, 0, 0.0], [0.28, 0, -0.03], [0.21, 0, -0.08], [0.24, 0, -0.16], [0.14, 0, -0.11], [0.12, 0, -0.18], [-0.02, 0, -0.16]];
  g.wC = merge([
    fan([0, 0, 0], P, (x, y, z) => mix(p.mem, p.mem2, clamp(x * 3.2 + 0.2, 0, 1)).clone(), 0.004, s + 24),
    strut([0, 0, 0], [0.22, 0, 0.11], 0.006, 0.003, p.bone, p.bone, s + 25, 3), strut([0, 0, 0], [0.28, 0, -0.03], 0.006, 0.003, p.bone, p.bone, s + 26, 3),
    strut([0, 0, 0], [0.24, 0, -0.16], 0.005, 0.003, p.bone, p.bone, s + 27, 3), strut([0, 0, 0], [0.12, 0, -0.18], 0.005, 0.003, p.bone, p.bone, s + 28, 3),
    spike(0.007, 0.03, p.bone, p.bone, s + 29, { segs: 3, pos: [-0.005, 0.003, 0.0], rot: [Math.PI / 2 + 0.6, 0, 0.2] }),      // thumb claw
  ]);
  return g;
}

export class Bat extends CreatureBase {
  constructor(opts) {
    super('bat', { radius: 0.3, height: 0.3, length: 0.5, eyeHeight: 0.15 }, opts, { eye: 0xff3018, eyeMin: 1.0, eyeGain: 4, telGlow: 1, wing: true });
    this.defaultMax = 6;
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('bat' + v, () => geo(v));
    this.flop = this.joint(this.rig); this.body = this.joint(this.flop, 0, 0, 0, 'YXZ');
    this.add(this.body, G.body);
    this.head = this.joint(this.body, 0, 0.02, 0.085); this.headJoint = this.head;
    this.add(this.head, G.head); this.add(this.head, G.eyes, 'eye');
    this.legJ = [1, -1].map((sx) => { const j = this.joint(this.body, sx * 0.03, -0.03, -0.075); this.add(j, G.leg); return j; });
    this.wings = [1, -1].map((sx) => {
      const root = this.joint(this.body, sx * 0.045, 0.02, 0.03, 'YXZ'); root.scale.x = sx;
      const sh = this.joint(root, 0, 0, 0, 'ZYX'), el = this.joint(sh, 0.12, 0, -0.01, 'ZYX'), wr = this.joint(el, 0.155, 0, 0.02, 'ZYX');
      this.add(sh, G.wA, 'wing'); this.add(el, G.wB, 'wing'); this.add(wr, G.wC, 'wing');
      return { sh, el, wr };
    });
    this.phase = this.rand(); this.sp = 0; this.P = { fold: 0, hov: 0, pitch: 0, amp: 1, roost: 0 }; this.turnS = 0;
    this.earP = new Pulse(this.seed + 1, 1, 3, 0.4);
    this.fall = 0; this.vy = 0; this.tumble = 0;
  }
  tick(dt, S) {
    const t = this.time, w = this.mw, P = this.P, dead = S.dead, tel = ease(S.telegraph), atk = S.attackT, hu = S.hurt;
    this.sp = damp(this.sp, S.speed, 4, dt);
    this.turnS = damp(this.turnS, S.turn, 6, dt);
    const alive = dead < 0 ? 1 : 0;
    // ---- target posture: fold (0 = spread, 1 = tucked), hover offset, pitch ----
    let fold = 0, hov = 0, pitch = -0.25 + 0.05 * Math.min(this.sp, 6), amp = 1, fmul = 1, shake = 0, roost = 0, shy = 0;
    pitch += 0.1 * S.aggro;
    fold += 0.0;
    roost = Math.max(w.sleep, w.hide * 0.0);
    const diving = S.attackKind === 'dive';
    if (S.telegraph > 0 && w.attack < 0.5) { fold = 0.55 * tel; hov = 0.16 * tel; pitch += -0.5 * tel; amp = 1 - 0.55 * tel; fmul = 1 + 0.7 * tel; shake = tel * tel; shy = 0.7 * tel; }
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      const plunge = smoothstep(0, 0.12, atk) * (1 - smoothstep(0.55, 0.75, atk)), out = smoothstep(0.55, 0.8, atk);
      fold = lerp(fold, 1, plunge); pitch = lerp(pitch, 1.25, plunge) - 0.5 * out * (1 - smoothstep(0.85, 1, atk)); amp = lerp(amp, 0.2, plunge) + 0.6 * out; hov = lerp(hov, -0.05, plunge); fmul = 1 + 0.6 * out; shy = 0;
    }
    if (w.flee > 0.3) { fmul += 0.4 * w.flee; pitch += 0.15 * w.flee; }
    // chase: forward lean
    pitch += 0.12 * (w.chase + w.circle);
    if (w.stunned > 0.05) { fold = Math.max(fold, 0.2 * w.stunned); pitch += 0.3 * w.stunned * Math.sin(t * 5); amp *= 1 - 0.3 * w.stunned; shake += 0.4 * w.stunned; }
    if (w.eat > 0.05 || w.howl > 0.05) { pitch += -0.3 * w.howl; fmul += 0.2 * w.howl; }
    const k1 = 1 - Math.exp(-(S.mode === 'attack' ? 26 : 10) * dt);
    P.fold += (fold - P.fold) * k1; P.hov += (hov - P.hov) * k1; P.pitch += (pitch - P.pitch) * k1; P.amp += (amp - P.amp) * k1; P.roost += (roost - P.roost) * damp(0, 1, 6, dt); P.fmul = (P.fmul ?? 1) + (fmul - (P.fmul ?? 1)) * k1; P.shake = (P.shake ?? 0) + (shake - (P.shake ?? 0)) * k1;
    // ---- flap ----
    const freq = clamp(5.2 + 0.5 * this.sp, 4, 11) * P.fmul * (1 - 0.8 * P.roost) * alive;
    this.phase += dt * freq;
    const ph = this.phase * TAU, fl = 1 - clamp(P.fold + P.roost, 0, 1);
    const A = 0.95 * P.amp * (1 - 0.25 * Math.min(1, this.sp / 6));
    // whip: shoulder leads, elbow and wrist lag
    const shz = (0.1 + A * Math.cos(ph) * 0.9) * fl + (-0.9) * (1 - fl) * 0 ;
    const foldK = clamp(P.fold + P.roost, 0, 1);
    const up_ = 0.5 + 0.5 * Math.cos(ph);       // 1 at top of upstroke
    const wingPose = (side) => ({
      shz: shz * (1 - foldK) + (-0.5 * foldK), shy: 0.15 + 1.05 * foldK * 0.7 + 0.15 * (1 - up_) * (1 - foldK) + P.hov * 0,
      elz: (-0.55 * Math.sin(ph - 0.7) * A) * (1 - foldK) + 0.0, ely: 0.1 + 2.2 * foldK * 0.75 + 0.0,
      wrz: (0.7 * Math.sin(ph - 1.5) * A) * (1 - foldK), wry: 0.1 + 1.9 * foldK * 0.7 + 0.25 * up_ * (1 - foldK),
    });
    const wp = wingPose();
    for (const W of this.wings) {
      W.sh.rotation.set(0, wp.shy, wp.shz); W.el.rotation.set(0, wp.ely, wp.elz); W.wr.rotation.set(0, wp.wry, wp.wrz);
    }
    // ---- body ----
    const bobA = 0.022 * fl * P.amp;
    let by = -bobA * Math.cos(ph - 0.3) * alive + P.hov;
    let bp = P.pitch + 0.06 * Math.sin(ph - 0.2) * fl, br = -clamp(this.turnS, -3, 3) * 0.13, bx = 0;
    // hurt: tumble flinch
    br += hu * 0.7 * Math.sin(t * 30); bp += -hu * 0.4; by += 0 - hu * 0.03;
    // roost (sleep): hang upside-down
    this.flop.rotation.set(0, 0, Math.PI * P.roost);
    this.flop.position.y = 0.07 * P.roost;
    // dead: tumble, fall, crumple
    if (dead >= 0) {
      const h = S.height || 0, fallT = Math.sqrt(2 * Math.max(h, 0.001) / 9.8), f = Math.min(dead, fallT);
      by += -Math.min(Math.max(h - 0.05, 0), 4.9 * dead * dead);
      const spin = Math.min(dead / (h > 0 ? Math.max(fallT, 0.4) : 0.6), 1);
      const settle = smoothstep(0, 1, spin);
      bp = lerp(bp, 1.35, settle); br = lerp(br, Math.PI * 0.8, easeOutBack(clamp(dead / 0.7, 0, 1)));
      if (h > 0) { const bounce = dead > fallT ? Math.exp(-(dead - fallT) * 9) * Math.abs(Math.sin((dead - fallT) * 14)) * 0.05 : 0; by += bounce; }
      const cr = smoothstep(0.05, 0.6, dead);
      const dw = { shz: -0.6, shy: 1.3, elz: 0.2, ely: 1.9, wrz: -0.3, wry: 1.6 };
      for (const W of this.wings) { W.sh.rotation.set(0, lerp(wp.shy, dw.shy, cr), lerp(wp.shz, dw.shz, cr)); W.el.rotation.set(0, lerp(wp.ely, dw.ely, cr), lerp(wp.elz, dw.elz, cr)); W.wr.rotation.set(0, lerp(wp.wry, dw.wry, cr), lerp(wp.wrz, dw.wrz, cr)); }
    }
    this.body.position.set(0, by, 0);
    this.body.rotation.set(bp, Math.sin(t * 40) * P.shake * 0.08, br + Math.sin(t * 35) * P.shake * 0.05);
    // head follows the pitch loosely, looks around, ears via head roll
    const lk = S.lookYaw ? clamp(S.lookYaw, -0.8, 0.8) : 0.25 * sn(t * 0.7, 2);
    const hp = -bp * 0.6 + (dead >= 0 ? 0.3 * smoothstep(0.2, 0.8, dead) : 0) - 0.15 * shy;
    this.head.rotation.set(hp, lk, 0.1 * sn(t * 1.1, 4));
    const legSwing = -0.5 - 0.3 * Math.min(1, this.sp / 5) + 0.35 * Math.sin(ph - 0.4) * fl;
    this.legJ.forEach((j, k) => j.rotation.set(dead >= 0 ? 0.6 : legSwing + (P.roost > 0.5 ? 2.2 : 0), 0, (k ? -1 : 1) * 0.1));
  }
}
