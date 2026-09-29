// Shadow / "Cieniak": ~2.1 m tall, thin, ragged violet-black humanoid built from jagged shards and dangling rag strips, long arms,
// glowing white-blue eyes. Own rig (not the quadruped one). Faces +Z.
// Joints: hips > spine > chest > neck > head; arms sh(YXZ: y sweep, x pitch (- = forward raise), z roll (+ = out on the left)) > el > wr;
// legs use the IK Leg class (bend forward). Walk = jerky stalk (long holds, snapping swings, stepped head/torso twitches).
// telegraph 'swipe' = right arm cocked far back overhead, torso twisted away, body stretches; attack 'swipe' = arm sweeps across in one whip.
// mode 'flee'/'hide' = cowering (crouched, arms over the head); death = knees buckle, then the shards drift up as wisps and a dark stain remains.
import { THREE, CreatureBase, Leg, B, up, spike, strut, tris, fan, limbL, trunk, merge, xf, paint, cached, col, mix, shade, cone, leaf, clamp, lerp, damp, smoothstep, ease, easeOutBack, sn, TAU, Pulse } from './kit.js';

const PAL = [
  { body: 0x1b1226, mid: 0x2b1b3f, edge: 0x4d3070, rag: 0x1a1024, tip: 0x5a3c86 },
  { body: 0x10131f, mid: 0x1b2438, edge: 0x2f4a72, rag: 0x0e1220, tip: 0x3a5c8f },
  { body: 0x1e1020, mid: 0x321a36, edge: 0x6a2f66, rag: 0x1c0f1e, tip: 0x7d3a78 },
  { body: 0x151517, mid: 0x25252a, edge: 0x45454f, rag: 0x131316, tip: 0x5b5b68 },
];
const HIP = 1.0, L1 = 0.5, L2 = 0.5, L3 = 0.1;
const rr = (n, s) => { const x = Math.sin(n * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };

function geo(v) {
  const p = PAL[v], g = {}, s = 700 + v * 10;
  const grad = (a, b, y0, y1) => { const ca = col(a), cb = col(b), t = new THREE.Color(); return (x, y) => t.copy(ca).lerp(cb, clamp((y - y0) / (y1 - y0), 0, 1)).clone(); };
  const shards = (n, r, h, yr, seed, up0 = 0.3) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU + rr(i, seed) * 0.6, y = yr[0] + rr(i + 9, seed) * (yr[1] - yr[0]);
    return spike(0.03 + rr(i + 3, seed) * 0.02, h * (0.6 + rr(i + 5, seed) * 0.8), p.mid, p.edge, seed + i, { segs: 3, jit: 0.2, pos: [Math.cos(a) * r, y, Math.sin(a) * r * 0.8], rot: [Math.sin(a) * 1.2 - up0, 0, -Math.cos(a) * 1.2] }); });
  g.pelvis = merge([
    xf(trunk({ rb: 0.1, rt: 0.13, h: 0.24, segs: 5, rows: 2, jit: 0.03, wobble: 0.01, seed: s + 1, pos: [0, -0.02, 0], colorBase: p.body, colorTop: p.mid, faceVar: 0.1 }), { scale: [1, 1, 0.75] }),
    ...shards(6, 0.12, 0.2, [0.0, 0.1], s + 2, 2.2),
  ]);
  g.spine = merge([xf(trunk({ rb: 0.1, rt: 0.12, h: 0.3, segs: 5, rows: 2, jit: 0.035, wobble: 0.015, seed: s + 3, colorBase: p.mid, colorTop: p.body, faceVar: 0.1 }), { scale: [0.95, 1, 0.7] })]);
  g.chest = merge([
    xf(trunk({ rb: 0.12, rt: 0.2, h: 0.36, segs: 6, rows: 2, jit: 0.04, wobble: 0.015, seed: s + 4, colorBase: p.body, colorTop: p.mid, faceVar: 0.1 }), { scale: [1.1, 1, 0.65] }),
    ...shards(9, 0.2, 0.22, [0.02, 0.34], s + 5, 0.9),
    // jagged pauldron shards
    spike(0.05, 0.22, p.mid, p.edge, s + 6, { segs: 4, jit: 0.2, pos: [0.24, 0.32, 0], rot: [0, 0, -1.0] }), spike(0.05, 0.22, p.mid, p.edge, s + 7, { segs: 4, jit: 0.2, pos: [-0.24, 0.32, 0], rot: [0, 0, 1.0] }),
  ]);
  g.neck = merge([up(0.16, 0.05, 0.04, p.body, p.mid, s + 8, { segs: 5, jit: 0.01 })]);
  g.head = merge([
    B(0.1, [0, 0.16, 0.0], [0.78, 1.4, 0.95], grad(p.body, p.mid, 0.04, 0.3), s + 9, { jit: 0.14, fv: 0.1 }),
    B(0.05, [0, 0.05, 0.075], [0.7, 1.3, 0.8], p.body, s + 10, { detail: 0, jit: 0.2 }),           // sunken jaw/cheek
    // swept-back crown of shards
    ...[0, 1, 2, 3].map((i) => spike(0.026, 0.16 - i * 0.02, p.mid, p.tip, s + 11 + i, { segs: 3, jit: 0.2, pos: [(i - 1.5) * 0.045, 0.27 - Math.abs(i - 1.5) * 0.03, -0.03], rot: [-1.15 - i * 0.05, 0, (i - 1.5) * 0.35] })),
  ]);
  g.eyes = merge([B(0.02, [0.04, 0.2, 0.075], [1.7, 0.45, 0.6], 0xffffff, s + 20, { detail: 0, rot: [0, 0.3, -0.35] }), B(0.02, [-0.04, 0.2, 0.075], [1.7, 0.45, 0.6], 0xffffff, s + 21, { detail: 0, rot: [0, -0.3, 0.35] })]);
  // arms: hang down from the joint
  g.uarm = merge([limbL(0.55, [0.05, 0.042, 0.032], p.body, p.mid, s + 22, { sides: 5, jit: 0.008, mid: 0.4 })]);
  g.farm = merge([limbL(0.58, [0.034, 0.03, 0.016], p.mid, p.body, s + 23, { sides: 5, jit: 0.008, mid: 0.3 }), spike(0.03, 0.14, p.mid, p.edge, s + 24, { segs: 3, jit: 0.25, pos: [0.0, -0.1, -0.03], rot: [-2.6, 0, 0.3] })]);
  g.hand = merge([strut([0, 0, 0], [0.03, -0.26, 0.05], 0.018, 0.003, p.body, p.tip, s + 25, 3), strut([0, 0, 0], [0, -0.3, 0.02], 0.02, 0.003, p.body, p.tip, s + 26, 3), strut([0, 0, 0], [-0.03, -0.24, 0.05], 0.018, 0.003, p.body, p.tip, s + 27, 3), strut([0, 0, 0], [0.05, -0.1, -0.05], 0.014, 0.003, p.body, p.tip, s + 28, 3)]);
  g.thigh = merge([limbL(L1 + 0.02, [0.075, 0.055, 0.04], p.body, p.mid, s + 30, { sides: 5, jit: 0.008, mid: 0.3 })]);
  g.shin = merge([limbL(L2 + 0.01, [0.04, 0.038, 0.024], p.mid, p.body, s + 31, { sides: 5, jit: 0.008 }), B(0.04, [0, 0, 0.01], [1, 1, 1], p.mid, s + 32, { detail: 0, jit: 0.2 }), spike(0.028, 0.16, p.mid, p.edge, s + 33, { segs: 3, jit: 0.2, pos: [0, -0.08, -0.04], rot: [2.3, 0, 0] })]);
  g.foot = merge([strut([0, 0, -0.01], [0, -0.1, 0.02], 0.024, 0.016, p.body, p.body, s + 34, 4), spike(0.03, 0.2, p.body, p.edge, s + 35, { segs: 4, jit: 0.1, pos: [0, -0.095, -0.03], rot: [Math.PI / 2 - 0.04, 0, 0], scale: [1, 1, 0.5] })]);
  // rag strips (double sided)
  const strip = (len, w, k, colr) => { const l = leaf({ len, w, droop: 0.15, seg: 4, seed: s + 40 + k, colorBase: colr, colorTip: mix(colr, p.tip, 0.35).getHex(), faceVar: 0.1 }); xf(l, { rot: [Math.PI / 2, 0, 0] }); return l; };
  g.stripA = strip(0.7, 0.1, 0, p.rag); g.stripB = strip(0.55, 0.09, 1, p.body); g.stripC = strip(0.45, 0.08, 2, p.mid); g.stripD = strip(0.65, 0.12, 3, p.rag);
  g.puddle = B(0.55, [0, 0.0, 0], [1.2, 0.02, 1.0], p.body, s + 50, { jit: 0.2, detail: 1 });
  return g;
}

const STRIPS = [ // parent, offset, geometry key, phase
  ['chest', [0.17, 0.3, -0.1], 'stripA', 0.0], ['chest', [-0.17, 0.3, -0.1], 'stripD', 1.3], ['chest', [0.0, 0.1, -0.15], 'stripB', 2.1],
  ['hips', [0.1, 0.02, 0.12], 'stripC', 0.7], ['hips', [-0.1, 0.02, 0.12], 'stripB', 2.9], ['hips', [0.0, 0.02, -0.14], 'stripA', 4.0], ['hips', [0.13, 0.0, -0.05], 'stripD', 5.1], ['hips', [-0.13, 0.0, -0.05], 'stripC', 3.3],
];

export class Shadow extends CreatureBase {
  constructor(opts) {
    super('shadow', { radius: 0.35, height: 2.1, length: 0.6, eyeHeight: 1.85 }, opts, { eye: 0xa8d8ff, eyeMin: 1.3, eyeGain: 4, telGlow: 1, wing: true });
    this.defaultMax = 3.4;
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('shadow' + v, () => geo(v));
    this.mats.body.emissive.setRGB(0.03, 0.015, 0.05); this._baseEm = new THREE.Color(0.03, 0.015, 0.05);
    this.parts = [];
    const add = (parent, geo_, mat) => { const m = this.add(parent, geo_, mat); this.parts.push({ m, d: new THREE.Vector3(rr(this.parts.length, 1) - 0.5, 0.6 + rr(this.parts.length, 2), rr(this.parts.length, 3) - 0.5), delay: rr(this.parts.length, 4) * 0.7 }); return m; };
    this.flop = this.joint(this.rig);
    const J = this.J = {};
    J.hips = this.joint(this.flop, 0, HIP, 0, 'YXZ');
    J.spine = this.joint(J.hips, 0, 0.16, 0, 'YXZ'); J.chest = this.joint(J.spine, 0, 0.3, 0, 'YXZ'); J.neck = this.joint(J.chest, 0, 0.36, 0, 'YXZ'); J.head = this.joint(J.neck, 0, 0.14, 0, 'YXZ');
    this.headJoint = J.head;
    add(J.hips, G.pelvis); add(J.spine, G.spine); add(J.chest, G.chest); add(J.neck, G.neck); add(J.head, G.head); this.add(J.head, G.eyes, 'eye');
    this.arms = [1, -1].map((sx) => {
      const sh = this.joint(J.chest, sx * 0.25, 0.3, 0, 'YXZ'), el = this.joint(sh, 0, -0.55, 0, 'YXZ'), wr = this.joint(el, 0, -0.58, 0, 'YXZ');
      add(sh, G.uarm); add(el, G.farm); add(wr, G.hand);
      return { sx, sh, el, wr, x: 0, vx: 0, z: 0, vz: 0, ex: 0, vex: 0, y: 0, vy: 0 };
    });
    this.legs = [1, -1].map((sx) => {
      const l = new Leg(J.hips, sx * 0.1, -0.02, 0, L1, L2, L3, 1); l.sx = sx; add(l.hip, G.thigh); add(l.knee, G.shin); add(l.ank, G.foot); return l;
    });
    this.strips = STRIPS.map(([par, o, key, ph]) => { const j = this.joint(J[par], o[0], o[1], o[2], 'YXZ'); add(j, G[key], 'wing'); return { j, ph, x: 0, vx: 0, z: 0, vz: 0, yaw: rr(ph * 7, 1) * TAU }; });
    this.puddle = this.add(this.rig, G.puddle); this.puddle.scale.setScalar(0.001); this.puddle.castShadow = false; this.puddle.visible = false;
    this.phase = this.rand(); this.sp = 0; this.acc = 0; this.spRaw = 0; this.turnS = 0;
    this.P = { H: 1, pitch: 0, cpitch: 0, cyaw: 0, hpitch: 0, hyaw: 0, hroll: 0, cower: 0, R: [0, 0, 0, 0], L: [0, 0, 0, 0], shake: 0, stoop: 0 };
    this.jt = { next: 0, tick: 0, v: [0, 0, 0, 0], cur: [0, 0, 0, 0] };
    this.foot = [{ z: 0, y: 0, psi: 0 }, { z: 0, y: 0, psi: 0 }];
    this.twitchP = new Pulse(this.seed + 8, 1.2, 4, 0.25); this.lookP = new Pulse(this.seed + 9, 2, 5, 1.6);
    this._m = new THREE.Matrix4(); this._v = new THREE.Vector3(); this.deadDone = false;
  }
  setFlash(v) { this.flash = clamp(v, 0, 1); this.mats.body.emissive.setRGB(this._baseEm.r + this.flash * 0.9, this._baseEm.g + this.flash * 0.62, this._baseEm.b + this.flash * 0.6); this.mats.wing.emissive.setRGB(this.flash * 0.9, this.flash * 0.6, this.flash * 0.6); }
  tick(dt, S) {
    const t = this.time, w = this.mw, P = this.P, J = this.J, dead = S.dead, tel = ease(S.telegraph), atk = S.attackT, hu = S.hurt, ak = S.attackKind;
    this.sp = damp(this.sp, S.speed, 8, dt);
    this.acc = damp(this.acc, clamp((S.speed - this.spRaw) / dt, -25, 25), 6, dt); this.spRaw = S.speed;
    this.turnS = damp(this.turnS, S.turn, 8, dt);
    const r = clamp(this.sp / S.maxSpeed, 0, 1.3), alive = dead < 0 ? 1 : 1 - smoothstep(0, 0.3, dead);
    // ---- stepped twitches: new random target every ~0.1-0.35 s, followed with a fast spring -> jerky, unnatural look ----
    const jt = this.jt, rate = 0.28 - 0.14 * Math.max(w.stalk, r, w.stunned);
    jt.next -= dt;
    if (jt.next <= 0) { jt.tick++; jt.next = rate * (0.5 + rr(jt.tick, 5)); for (let i = 0; i < 4; i++) jt.v[i] = (rr(jt.tick, i + 1) - 0.5) * 2; }
    for (let i = 0; i < 4; i++) jt.cur[i] += (jt.v[i] - jt.cur[i]) * (1 - Math.exp(-38 * dt));
    const tw = this.twitchP.update(dt), look = this.lookP.update(dt, S.mode !== 'idle' && S.mode !== 'wander');
    // ---- target posture ----
    const T = { H: 1, pitch: 0, cpitch: 0, cyaw: 0, hpitch: 0.1, hyaw: 0, hroll: 0, cower: 0, shake: 0, stoop: 0, R: [0.05, 0.0, 0.08, 0], L: [0.05, 0.0, 0.08, 0] };   // arms: [fwd raise, out, elbow bend, sweep yaw]
    const stalk = Math.max(w.stalk, w.chase * 0.7, w.circle * 0.8, r > 0.05 ? 0.6 : 0);
    T.pitch += 0.12 + 0.18 * stalk + 0.1 * r; T.cpitch += 0.12 + 0.2 * stalk; T.hpitch += 0.25 * stalk + 0.15; T.H -= 0.06 + 0.05 * stalk;
    const lookY = clamp(S.lookYaw, -1, 1) * 0.8 + clamp(this.turnS * 0.2, -0.4, 0.4);
    T.hyaw = lookY + jt.cur[0] * (0.25 + 0.35 * stalk) + 0.7 * look * Math.sin(t * 0.8) * w.idle;
    T.hpitch += jt.cur[1] * 0.15 * (0.4 + stalk) + 0.35 * tw * this.twitchP.dir * w.idle;
    T.hroll = jt.cur[2] * 0.2 + 0.2 * sn(t * 0.9, 2) * w.idle;
    T.cyaw += jt.cur[3] * 0.12 * (0.4 + stalk);
    for (const a of [T.L, T.R]) { a[0] += 0.15 * stalk; a[2] += 0.15 * stalk; }
    T.R[3] = 0; T.L[3] = 0;
    // flee/hide = cower: deep crouch, arms up over the head, shaking
    const cw = Math.max(w.flee, w.hide, w.sleep * 0.6);
    T.cower = cw; T.H -= 0.4 * cw; T.cpitch += 0.7 * cw; T.pitch += 0.3 * cw; T.hpitch += 0.5 * cw; T.shake += 0.7 * cw * (1 - w.sleep);
    for (const a of [T.L, T.R]) { a[0] = lerp(a[0], 2.5, cw); a[1] = lerp(a[1], 0.1, cw); a[2] = lerp(a[2], 2.0, cw); }
    // sleep: slumped crouch
    T.H -= 0.2 * w.sleep; T.cpitch += 0.4 * w.sleep; T.hpitch += 0.4 * w.sleep;
    // howl: head back, arms spread, trembling
    const how = w.howl; T.hpitch += -0.9 * how; T.cpitch += -0.35 * how; T.H += 0.04 * how; T.shake += 0.5 * how;
    for (const a of [T.L, T.R]) { a[0] += 0.2 * how; a[1] += 1.3 * how; a[2] += 0.3 * how; }
    // eat: hunched over the ground
    T.cpitch += 0.7 * w.eat; T.pitch += 0.25 * w.eat; T.hpitch += 0.5 * w.eat; T.H -= 0.2 * w.eat; T.L[0] += 0.5 * w.eat; T.R[0] += 0.5 * w.eat; T.hyaw += Math.sin(t * 6) * 0.15 * w.eat;
    // stunned: lolling and swaying
    T.cyaw += 0.3 * sn(t * 1.7, 4) * w.stunned; T.hroll += 0.5 * sn(t * 2.1, 3) * w.stunned; T.hpitch += 0.4 * w.stunned; T.cpitch += 0.3 * w.stunned; T.H -= 0.1 * w.stunned; T.shake += 0.3 * w.stunned;
    // ---- telegraph: right arm cocked back overhead, torso twisted away, body stretching tall, eyes flare ----
    if (S.telegraph > 0 && w.attack < 0.5) {
      T.R[0] = lerp(T.R[0], 2.7, tel); T.R[1] = lerp(T.R[1], 0.55, tel); T.R[2] = lerp(T.R[2], 1.0, tel); T.R[3] = 0.5 * tel;
      T.L[0] = lerp(T.L[0], 1.0, tel); T.L[1] = lerp(T.L[1], 0.9, tel); T.L[2] = lerp(T.L[2], 0.4, tel);
      T.cyaw += 0.95 * tel; T.cpitch += -0.32 * tel; T.pitch += -0.1 * tel; T.hpitch += 0.15 * tel; T.hroll += 0.25 * tel; T.H += 0.03 * tel; T.shake += 0.5 * tel * tel;
      T.hyaw -= 0.5 * tel;
    }
    // ---- attack: whip the arm across the body ----
    let lunge = 0;
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      const sweep = smoothstep(0.02, 0.3, atk), back = smoothstep(0.55, 1, atk);
      const k = sweep * (1 - back);
      T.cyaw = lerp(T.cyaw, -1.05, sweep) * (1 - back) + T.cyaw * back * 0.0;
      T.R[0] = lerp(T.R[0], 1.45, sweep); T.R[1] = lerp(T.R[1], 0.15, sweep); T.R[2] = lerp(T.R[2], 0.12, sweep); T.R[3] = lerp(T.R[3], -1.2, sweep);
      T.L[0] = lerp(T.L[0], 0.4, sweep); T.L[1] = lerp(T.L[1], 0.5, sweep);
      T.cpitch += 0.35 * k; T.pitch += 0.15 * k; T.hpitch += 0.1 * k; T.hyaw += 0.7 * k; lunge = 0.12 * k; T.H -= 0.08 * k;
      if (back > 0) { T.cyaw = lerp(-1.05, 0, back); T.R[3] = lerp(-1.2, 0, back); T.R[0] = lerp(1.45, 0.1, back); }
    }
    // hurt flinch: recoil and head snap
    T.cpitch += -0.4 * hu; T.hpitch += -0.6 * hu; T.hyaw += 0.5 * hu * Math.sin(t * 40); T.H -= 0.06 * hu; T.shake += hu;
    // ---- smooth (fast: attack) ----
    const k1 = 1 - Math.exp(-(S.mode === 'attack' ? 40 : S.telegraph > 0 ? 14 : 9) * dt);
    for (const key of ['H', 'pitch', 'cpitch', 'cyaw', 'hpitch', 'hyaw', 'hroll', 'cower', 'shake']) P[key] += (T[key] - P[key]) * k1;
    P.lunge = (P.lunge ?? 0) + (lunge - (P.lunge ?? 0)) * k1;
    for (let i = 0; i < 4; i++) { P.R[i] += (T.R[i] - P.R[i]) * k1; P.L[i] += (T.L[i] - P.L[i]) * k1; }
    // ---- gait: long holds, snapping swings ----
    const cyc = 1.9 * 1.1 * (0.9 + 0.3 * r), duty = 0.66;
    if (this.sp > 0.03) this.phase = (this.phase + this.sp * dt / cyc) % 1;
    const env = smoothstep(0.03, 0.4, this.sp) * alive * (1 - P.cower * 0.5);
    const stride = cyc * duty * 0.9;
    const lift = 0.2 * (0.6 + r * 0.6);
    for (let i = 0; i < 2; i++) {
      const p = (this.phase + i * 0.5) % 1, f = this.foot[i];
      if (p < duty) { const u = p / duty; f.z = stride * (0.5 - u); f.y = 0; f.psi = lerp(0.2, -0.45, u); }
      else { const q = (p - duty) / (1 - duty), e = 1 - Math.pow(1 - q, 3); f.z = stride * (-0.5 + e); f.y = lift * Math.sin(Math.PI * Math.min(1, q * 1.15)); f.psi = lerp(-0.45, 0.3, e); }
      f.z *= env; f.y *= env; f.psi *= env;
    }
    const ph = this.phase * TAU;
    // ---- apply ----
    const breathe = Math.sin(t * 1.4) * alive;
    let hipsY = HIP * P.H + 0.012 * breathe, hipsZ = P.lunge;
    // plant twitch: small snap down at each footfall
    const snap = Math.max(0, Math.sin(ph * 2 - 0.3)); hipsY -= 0.025 * env * snap * snap;
    let dropK = 0, wisp = 0;
    if (dead >= 0) {
      const f = clamp((dead - 0.05) / 0.55, 0, 1); dropK = easeOutBack(f);
      hipsY = lerp(hipsY, 0.32, clamp(dropK, 0, 1.05)); wisp = smoothstep(0.5, 2.2, dead);
    }
    J.hips.position.set(0, hipsY, hipsZ);
    const sh = P.shake * alive;
    J.hips.rotation.set(P.pitch * 0.5 + 0.03 * Math.sin(ph * 2) * env + (dead >= 0 ? 0.5 * clamp(dropK, 0, 1) : 0), Math.sin(ph) * 0.12 * env + Math.sin(t * 43) * sh * 0.03, -this.turnS * 0.02 + Math.sin(ph) * 0.04 * env);
    J.spine.rotation.set(P.cpitch * 0.4 + P.pitch * 0.3, P.cyaw * 0.3, Math.sin(t * 37) * sh * 0.02);
    J.chest.rotation.set(P.cpitch * 0.6, P.cyaw * 0.7 - Math.sin(ph) * 0.1 * env, Math.sin(t * 29) * sh * 0.03);
    J.neck.rotation.set(P.hpitch * 0.3 + (dead >= 0 ? 0.6 * clamp(dropK, 0, 1) : 0), P.hyaw * 0.4, P.hroll * 0.4);
    J.head.rotation.set(P.hpitch * 0.7 - (P.cpitch + P.pitch) * 0.2, P.hyaw * 0.6, P.hroll * 0.6 + Math.sin(t * 47) * sh * 0.06);
    // arms: spring-driven toward posture; body acceleration and walking swing add lag
    const armDt = Math.min(dt, 1 / 60);
    for (let s = 0; s < Math.max(1, Math.round(dt / armDt)); s++) this.arms.forEach((a, k) => {
      const A = k === 0 ? P.L : P.R, sgn = a.sx;
      const swing = Math.sin(ph + (k ? Math.PI : 0)) * 0.35 * env * (1 - P.cower);
      const kx = 90, cx = 9;
      const tx = -A[0] - swing * 0.6 + (dead >= 0 ? -0.2 : 0), tz = sgn * A[1], te = -A[2] + (dead >= 0 ? 0.4 : 0);
      const dead_ = dead >= 0;
      const ax = -kx * (a.x - tx) - cx * a.vx - this.acc * 0.9 * (1 - P.cower) ;
      a.vx += ax * armDt; a.x += a.vx * armDt;
      const az = -kx * (a.z - tz) - cx * a.vz - this.turnS * 2.5 * sgn;
      a.vz += az * armDt; a.z += a.vz * armDt;
      const ae = -60 * (a.ex - te) - 7 * a.vex - this.acc * 0.5;
      a.vex += ae * armDt; a.ex += a.vex * armDt;
      const ty = k === 1 ? A[3] : -A[3] * 0.4; const ay = -kx * (a.y - ty) - cx * a.vy; a.vy += ay * armDt; a.y += a.vy * armDt;
    });
    this.arms.forEach((a, k) => {
      const sgn = a.sx;
      a.sh.rotation.set(a.x, a.y, a.z + Math.sin(t * 1.3 + k * 2) * 0.03);
      a.el.rotation.set(a.ex + 0.1, 0, 0);
      a.wr.rotation.set(0.15 * Math.sin(t * 2.1 + k) + 0.2 * (a.ex), 0, 0);
    });
    // legs
    this.flop.updateMatrixWorld(true);
    this.rig.updateMatrixWorld(true);
    const M = this._m, v = this._v;
    this.legs.forEach((l, i) => {
      const f = this.foot[i];
      M.copy(J.hips.matrixWorld).invert().multiply(this.rig.matrixWorld);
      v.set(l.sx * 0.11, f.y, f.z + 0.02).applyMatrix4(M);
      let dx = v.x - l.hip.position.x, dy = v.y - l.hip.position.y, dz = v.z - l.hip.position.z, psi = 0.15 + f.psi;
      if (dead >= 0) {
        const a = smoothstep(0.05, 0.6, dead);
        dx = lerp(dx, l.sx * 0.16, a); dy = lerp(dy, -0.32, a); dz = lerp(dz, 0.45, a); psi = lerp(psi, 0.2, a);
      }
      l.solve(dx, dy, dz, psi);
    });
    // rag strips: pendulums that trail the motion + eternal ghostly sway
    this.strips.forEach((s, i) => {
      const sway = Math.sin(t * 1.6 + s.ph) * 0.12 + Math.sin(t * 3.1 + s.ph * 2) * 0.05;
      const tx = -clamp(this.acc * 0.05 + this.sp * 0.1, -0.7, 0.9) + sway * 0.5 + 0.12 * Math.sin(ph * 2 + s.ph) * env, tz = sway + clamp(this.turnS * 0.15, -0.5, 0.5) * (i % 2 ? -1 : 1);
      const kx = 40, cx = 3.5;
      s.vx += (-kx * (s.x - tx) - cx * s.vx) * dt; s.x += s.vx * dt; s.vz += (-kx * (s.z - tz) - cx * s.vz) * dt; s.z += s.vz * dt;
      s.j.rotation.set(s.x + 0.15, s.yaw, s.z);
    });
    // dissolve: shards drift up as wisps and shrink; a stain remains
    if (dead >= 0) {
      const dt2 = dead - 0.35;
      for (const p of this.parts) {
        const k = smoothstep(p.delay, p.delay + 1.0, dt2);
        p.m.position.set(p.d.x * 0.8 * k, p.d.y * 1.6 * k, p.d.z * 0.8 * k); p.m.scale.setScalar(Math.max(0.0001, 1 - k)); p.m.visible = k < 0.999;
      }
      this.puddle.visible = true; const pk = smoothstep(0.3, 1.6, dead); this.puddle.scale.setScalar(Math.max(0.001, 0.15 + 0.85 * pk));
      this.deadDone = true;
    } else if (this.deadDone) { for (const p of this.parts) { p.m.position.set(0, 0, 0); p.m.scale.setScalar(1); p.m.visible = true; } this.puddle.visible = false; this.deadDone = false; }
  }
}
