// Crab: orange-red shore crab. 8 IK legs, 2 jointed claws, eyes on stalks. Faces +Z (claws/eyes); it scuttles SIDEWAYS along local X
// (the leg cycle follows the measured direction of root motion along X; default +X). Own rig (not the quadruped one).
// Idle: claws wave, eyestalks wobble. telegraph 'pinch': claws lifted wide open, body raised onto tiptoes. attack 'pinch': claws thrust in and snap shut.
// Death: flips onto its back, legs curl and twitch.
import { THREE, CreatureBase, Leg, B, limbL, along, up, spike, merge, cached, col, mix, shade, cone, xf, clamp, lerp, damp, smoothstep, ease, easeOutBack, sn, TAU, Pulse } from './kit.js';

const PAL = [
  { top: 0xd4552b, edge: 0x9c3a20, belly: 0xe9a464, claw: 0xe0662f, tip: 0xf3d7a0 },
  { top: 0xb8402a, edge: 0x7c2a1e, belly: 0xdb8f5c, claw: 0xc94e32, tip: 0xeecfa0 },
  { top: 0xd98a3a, edge: 0xa2571f, belly: 0xf0c890, claw: 0xe89a4a, tip: 0xf6e2b8 },
  { top: 0xa8483a, edge: 0x6f2c26, belly: 0xd09070, claw: 0xb85a44, tip: 0xead0b0 },
];
const H0 = 0.1, LEGZ = [0.075, 0.025, -0.025, -0.075], DELTA = [0.6, 0.2, -0.2, -0.55], L1 = 0.13, L2 = 0.15, L3 = 0.035;

function geo(v) {
  const p = PAL[v], g = {}, s = 500 + v * 10;
  const top = col(p.top), edge = col(p.edge), bel = col(p.belly), tmp = new THREE.Color();
  g.body = merge([
    B(0.16, [0, 0, 0], [1.22, 0.5, 0.95], (x, y, z) => tmp.copy(top).lerp(edge, smoothstep(0.1, 0.19, Math.abs(x) + Math.abs(z) * 0.3)).lerp(bel, smoothstep(-0.01, -0.06, y)).clone(), s + 1, { jit: 0.07, fv: 0.09 }),
    B(0.07, [0, 0.03, -0.02], [1.2, 0.5, 1.1], shade(p.top, 1.1), s + 2, { detail: 0, jit: 0.15 }),
    ...[-1, 1].flatMap((sx) => [0, 1, 2].map((i) => spike(0.014, 0.04, p.edge, p.tip, s + 10 + i + (sx > 0 ? 5 : 0), { segs: 3, pos: [sx * (0.17 - i * 0.012), 0.02, 0.07 - i * 0.05], rot: [0.2, 0, -sx * 0.9] }))),
  ]);
  g.eye = merge([up(0.06, 0.008, 0.006, p.belly, p.belly, s + 20, { segs: 4 }), B(0.016, [0, 0.065, 0], [1, 1, 1], 0x0e0a08, s + 21, { detail: 0 }), B(0.006, [0.006, 0.072, 0.008], [1, 1, 1], 0xffffff, s + 22, { detail: 0 })]);
  // legs (hang down from the joint; IK aims them)
  g.legU = limbL(L1 + 0.01, [0.03, 0.026, 0.02], p.top, shade(p.top, 0.85), s + 30, { sides: 5, sq: 0.9 });
  g.legL = merge([limbL(L2 + L3, [0.02, 0.014, 0.005], shade(p.top, 0.9), p.tip, s + 31, { sides: 5 })]);
  // arm: along +Z. upper arm, forearm, claw (palm + fixed finger), movable finger
  g.arm1 = merge([along(0.11, 0.024, 0.02, p.top, p.edge, s + 40, { segs: 5 })]);
  g.arm2 = merge([along(0.11, 0.02, 0.026, p.edge, p.top, s + 42, { segs: 5 })]);
  g.claw = merge([B(0.06, [-0.004, 0.0, 0.05], [0.95, 0.75, 1.3], p.claw, s + 44, { jit: 0.1 }),
    spike(0.026, 0.11, p.claw, p.tip, s + 45, { segs: 4, pos: [-0.03, 0, 0.09], rot: [Math.PI / 2 - 0.05, 0, 0.12], scale: [1, 1, 0.6] })]);
  g.dact = spike(0.026, 0.105, p.claw, p.tip, s + 46, { segs: 4, pos: [0, 0, 0], rot: [Math.PI / 2 - 0.05, 0, 0], scale: [1, 1, 0.6] });
  return g;
}

export class Crab extends CreatureBase {
  constructor(opts) {
    super('crab', { radius: 0.3, height: 0.25, length: 0.5, eyeHeight: 0.2 }, opts, {});
    this.defaultMax = 2.2;
    const v = ((opts.seed ?? 1) >>> 0) % 4, G = cached('crab' + v, () => geo(v));
    this.flop = this.joint(this.rig); this.body = this.joint(this.flop, 0, H0, 0);
    this.add(this.body, G.body);
    this.headJoint = this.body;
    this.legs = [];
    this.hipRest = [];
    for (let i = 0; i < 8; i++) {
      const sx = i < 4 ? 1 : -1, k = i % 4;
      const hy = this.joint(this.body, sx * 0.12, -0.005, LEGZ[k]); hy.rotation.y = sx * (Math.PI / 2 - DELTA[k]);
      const leg = new Leg(hy, 0, 0, 0, L1, L2, L3, 1); leg.hy = hy; leg.sx = sx; leg.k = k;
      leg.dir = new THREE.Vector3(sx * Math.cos(DELTA[k]), 0, Math.sin(DELTA[k]));
      leg.rest = new THREE.Vector3(sx * 0.12, H0 - 0.005, LEGZ[k]).addScaledVector(leg.dir, 0.165 + (k === 3 ? 0.015 : 0));
      this.add(leg.hip, G.legU); this.add(leg.knee, G.legL);
      this.legs.push(leg);
    }
    this.arms = [1, -1].map((sx) => {
      const root = this.joint(this.body, sx * 0.13, 0.0, 0.11); root.scale.x = sx;
      const sh = this.joint(root, 0, 0, 0), el = this.joint(sh, 0, 0, 0.11), cl = this.joint(el, 0, 0, 0.11), dact = this.joint(cl, 0.03, 0, 0.09);
      this.add(sh, G.arm1); this.add(el, G.arm2); this.add(cl, G.claw); this.add(dact, G.dact);
      return { sh, el, cl, dact, s: { yaw: 0.35, pitch: 0, elbow: -0.9, open: 0.1, roll: 0 } };
    });
    this.eyes = [1, -1].map((sx) => { const j = this.joint(this.body, sx * 0.055, 0.045, 0.125); this.add(j, G.eye); return j; });
    this.phase = this.rand(); this.sp = 0; this.dirS = 1; this.P = { H: 1, tip: 0, shake: 0 };
    this.foot = this.legs.map(() => ({ x: 0, y: 0 }));
    this.waveP = new Pulse(this.seed + 3, 1.5, 4, 2.2); this.eyeP = [new Pulse(this.seed + 4, 1, 3, 1.2), new Pulse(this.seed + 5, 1, 3, 1.4)];
    this.armS = this.arms.map((a) => ({ ...a.s })); this.lay = 0; this.layDir = this.rand() < 0.5 ? 1 : -1;
    this._m = new THREE.Matrix4(); this._v = new THREE.Vector3();
  }
  tick(dt, S) {
    const t = this.time, w = this.mw, P = this.P, dead = S.dead;
    this.sp = damp(this.sp, S.speed, 10, dt);
    if (this.sp > 0.05 && this._mv) this.dirS = damp(this.dirS, this._mv, 10, dt);
    const r = clamp(this.sp / S.maxSpeed, 0, 1.2), tel = ease(S.telegraph), atk = S.attackT, hu = S.hurt;
    const alive = dead < 0 ? 1 : 1 - smoothstep(0, 0.2, dead);
    // ---- target posture ----
    let H = 1, tip = 0, pitch = 0, dz = 0, yaw = 0, shake = 0;
    const A = [{ yaw: 0.35, pitch: 0, elbow: -0.9, open: 0.12, roll: 0 }, { yaw: 0.35, pitch: 0, elbow: -0.9, open: 0.12, roll: 0 }];
    // idle: claws wave (out of phase), eyestalks wobble
    const wave = this.waveP.update(dt, S.mode !== 'idle');
    for (let k = 0; k < 2; k++) { const a = A[k]; const ph = t * 5 + k * 2.4; a.pitch += -0.5 * wave * (0.5 + 0.5 * Math.sin(ph)) - 0.1 * w.idle * Math.sin(t * 0.9 + k); a.yaw += 0.25 * wave * Math.sin(ph * 0.8); a.open += 0.25 * wave * (0.5 + 0.5 * Math.sin(ph * 1.7)) + 0.05 * w.idle * Math.sin(t * 1.3 + k * 2); }
    // scuttle: claws held forward and slightly up
    for (const a of A) { a.pitch += -0.15 * r; a.open += 0.1 * r; }
    // flee: claws up
    for (const a of A) { a.pitch += -0.5 * w.flee; a.yaw += 0.3 * w.flee; a.open += 0.3 * w.flee; }
    // chase/circle: aggressive open claws
    for (const a of A) { a.open += 0.35 * (w.chase + w.circle + w.stalk) * 0.6 + 0.4 * S.aggro; a.yaw += 0.1 * S.aggro; }
    // hide / sleep: pulled in, body low
    const hid = Math.max(w.hide, w.sleep);
    H *= 1 - 0.4 * hid; for (const a of A) { a.yaw = lerp(a.yaw, -0.1, hid); a.elbow = lerp(a.elbow, -1.5, hid); a.open = lerp(a.open, 0, hid); }
    // stunned
    for (const a of A) { a.pitch += 0.3 * w.stunned * Math.sin(t * 3); a.open += 0.2 * w.stunned; } shake += 0.4 * w.stunned; H *= 1 - 0.15 * w.stunned;
    // howl -> raised claws
    for (const a of A) { a.pitch += -0.9 * w.howl; a.open += 0.6 * w.howl; a.yaw += 0.5 * w.howl; }
    // eat: claws to mouth
    for (let k = 0; k < 2; k++) { const a = A[k]; a.yaw = lerp(a.yaw, -0.2, w.eat); a.elbow = lerp(a.elbow, -1.1, w.eat); a.open += 0.2 * w.eat * (0.5 + 0.5 * Math.sin(t * 9 + k * 3)); a.pitch += 0.2 * w.eat; }
    // ---- telegraph: claws lifted high & wide, body up on tiptoes, trembling ----
    if (S.telegraph > 0 && w.attack < 0.5) {
      for (let k = 0; k < 2; k++) { const a = A[k]; a.pitch = lerp(a.pitch, -1.05, tel); a.yaw = lerp(a.yaw, 0.95, tel); a.elbow = lerp(a.elbow, -0.35, tel); a.open = lerp(a.open, 0.85, tel); a.roll = 0; }
      tip = tel; pitch = -0.2 * tel; shake += tel * tel * 0.7; dz = -0.02 * tel;
    }
    // ---- attack: claws thrust in and snap ----
    if (atk > 0 && (w.attack > 0.2 || w.recover > 0.2 || S.mode === 'attack')) {
      const thrust = smoothstep(0, 0.22, atk) * (1 - smoothstep(0.55, 1, atk)), snap = smoothstep(0.16, 0.3, atk) * (1 - smoothstep(0.6, 0.9, atk));
      for (let k = 0; k < 2; k++) { const a = A[k]; a.pitch = lerp(a.pitch, 0.1, thrust); a.yaw = lerp(a.yaw, -0.15 - 0.1 * (k ? 0 : 0), thrust); a.elbow = lerp(a.elbow, 0.1, thrust); a.open = lerp(a.open, 0.9 - 0.85 * snap, thrust); }
      dz += 0.08 * thrust; H *= 1 - 0.1 * thrust; pitch += 0.2 * thrust; tip *= 1 - thrust;
      yaw += 0.15 * thrust * Math.sin(atk * 6);
    }
    if (dead >= 0) for (const a of A) { a.pitch = 0.2; a.elbow = -1.25; a.yaw = 0.5; a.open = 0.25; }
    // flinch
    for (const a of A) { a.elbow = lerp(a.elbow, -1.3, hu * 0.8); a.open += 0.2 * hu; a.yaw = lerp(a.yaw, 0.0, hu * 0.7); } H *= 1 - 0.12 * hu; dz -= 0.03 * hu; shake += hu * 1.5;
    // smooth
    const k1 = 1 - Math.exp(-(S.mode === 'attack' ? 30 : 12) * dt);
    P.H += (H - P.H) * k1; P.tip += (tip - P.tip) * k1; P.pitch = (P.pitch ?? 0) + (pitch - (P.pitch ?? 0)) * k1; P.dz = (P.dz ?? 0) + (dz - (P.dz ?? 0)) * k1; P.yaw = (P.yaw ?? 0) + (yaw - (P.yaw ?? 0)) * k1; P.shake += (shake - P.shake) * k1;
    for (let k = 0; k < 2; k++) for (const key in A[k]) this.armS[k][key] += (A[k][key] - this.armS[k][key]) * k1;
    // ---- gait (sideways) ----
    const cyc = 0.26 + 0.1 * r, duty = 0.62, stride = cyc * duty * this.dirS;
    if (this.sp > 0.02) this.phase = (this.phase + this.sp * dt / cyc) % 1;
    const env = smoothstep(0.02, 0.35, this.sp) * (1 - clamp(this.lay, 0, 1)) * alive;
    const lift = (0.035 + 0.03 * r) * (1 + P.tip);
    this.legs.forEach((l, i) => {
      const off = ((l.k + (l.sx > 0 ? 0 : 1)) % 2) * 0.5, u = (this.phase + off) % 1, f = this.foot[i];
      if (u < duty) { const q = u / duty; f.x = stride * (0.5 - q); f.y = 0; }
      else { const q = (u - duty) / (1 - duty), e = q - Math.sin(TAU * q) / TAU; f.x = stride * (-0.5 + e); f.y = lift * Math.sin(Math.PI * q); }
      f.x *= env; f.y *= env;
    });
    // ---- apply ----
    const bre = Math.sin(t * (2.2 + r * 6)) * alive;
    let lay = 0;
    if (dead >= 0) { const f = clamp((dead - 0.05) / 0.5, 0, 1); lay = Math.max(0, easeOutBack(f)); } this.lay = lay;
    const bob = env * 0.006 * Math.sin(this.phase * TAU * 4);
    this.flop.position.set(0, lay * 0.07, 0);
    this.flop.rotation.set(0, 0, this.layDir * lay * Math.PI * 0.96);
    const hh = H0 * (1 + 0.55 * P.tip) * P.H;
    this.body.position.set(0, lerp(hh + bob + bre * 0.002, 0, clamp(lay, 0, 1)), 0);
    this.rig.position.z = P.dz;
    this.body.rotation.set(P.pitch + 0.02 * bre, P.yaw + Math.sin(t * 40) * P.shake * 0.03 + (env * 0.05 * Math.sin(this.phase * TAU)) , -this.dirS * env * 0.05 * Math.min(1, r * 3) + Math.sin(t * 33) * P.shake * 0.02);
    this.arms.forEach((a, k) => {
      const s = this.armS[k], flick = Math.sin(t * 30 + k) * P.shake * 0.05;
      a.sh.rotation.set(s.pitch + flick, s.yaw, s.roll);
      a.el.rotation.set(0, s.elbow, 0);
      a.cl.rotation.set(0.0, 0.0, 0);
      a.dact.rotation.set(0, -s.open, 0);
    });
    this.eyes.forEach((e, k) => { const env2 = this.eyeP[k].update(dt); e.rotation.set(0.15 * Math.sin(t * 1.3 + k * 2) + 0.3 * env2 * this.eyeP[k].dir, 0.3 * (k ? -1 : 1) * 0 + 0.25 * Math.sin(t * 0.9 + k) , (k ? 1 : -1) * 0.35 + 0.2 * Math.sin(t * 1.7 + k)); if (dead >= 0) e.rotation.x = 0.6 * smoothstep(0.2, 0.8, dead); });
    // legs
    this.rig.updateMatrixWorld(true);
    const M = this._m, v = this._v;
    this.legs.forEach((l, i) => {
      const f = this.foot[i];
      M.copy(l.hy.matrixWorld).invert().multiply(this.rig.matrixWorld);
      // spread reach with tip-toe: legs straighten as the body rises
      v.set(l.rest.x + f.x + l.dir.x * P.tip * 0.02, f.y, l.rest.z + l.dir.z * P.tip * 0.02).applyMatrix4(M);
      let dx = v.x, dy = v.y, dz = v.z, psi = 0.25;
      const dl = smoothstep(0.05, 0.5, dead < 0 ? 0 : dead);
      if (dl > 0 || hid > 0.01) {
        // dead: legs curl up (in local frame they point down -> after the flip up), twitching
        const tw = dl * Math.max(0, 1 - dead * 0.5) * Math.sin(dead * 22 + i * 1.3) * 0.02;
        const hk = clamp(hid, 0, 1);
        // tucked: legs pulled under the body
        const cx = 0.1 * (1 - hk * 0.4) + tw, cy = -(0.11 - 0.05 * Math.max(dl, hk) + tw), cz = 0.04 + 0.02 * dl;
        const a = Math.max(dl, hk * 0.7);
        dx = lerp(dx, cx, a); dy = lerp(dy, cy, a); dz = lerp(dz, cz, a);
      }
      l.solve(dx, dy, dz, psi);
    });
  }
}
