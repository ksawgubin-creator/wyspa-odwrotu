// Generic quadruped rig + animator (rabbit, boar, goat, wolf, panther share it). See kit.js for axis conventions.
// Hierarchy: root > rig(scale) > flop(lie/death roll) > body(bob/pitch) > rear | front > legs, neck1>neck2>head(>jaw, ears), tail chain.
// Legs (order HL, FL, HR, FR; L = +X) are solved with two-bone IK to foot targets that follow a distance-driven gait
// (walk -> trot -> gallop blend), so feet stay planted on y=0. Species supply geometry + a `posing(T, c)` hook that edits a
// target posture object; the posture is smoothed (critically damped) so every state change blends without popping.
import { THREE, CreatureBase, Leg, clamp, lerp, damp, smoothstep, TAU, Pulse, sn, smoothInto, easeOutBack, ease } from './kit.js';

const HL = 0, FL = 1, HR = 2, FR = 3;
const OFF = { walk: [0, 0.25, 0.5, 0.75], trot: [0, 0.5, 0.5, 1.0], gallop: [0, 0.6, 0.08, 0.5] };
const DUTY = { walk: 0.66, trot: 0.5, gallop: 0.34 };
const _v = new THREE.Vector3(), _Mr = new THREE.Matrix4(), _Mf = new THREE.Matrix4();

export class Quad extends CreatureBase {
  constructor(kind, info, opts, cfg, matSpec) {
    super(kind, info, opts, matSpec);
    this.cfg = cfg; const C = cfg;
    this.defaultMax = C.maxSpeed;
    this.flop = this.joint(this.rig, 0, 0, 0);
    this.body = this.joint(this.flop, 0, C.H, 0);
    this.rear = this.joint(this.body, 0, 0, 0);
    this.front = this.joint(this.body, 0, 0, 0);
    const N = C.neck;
    this.neck1 = this.joint(this.front, 0, N.y, N.z);
    this.neck2 = this.joint(this.neck1, 0, N.l1, 0);
    this.head = this.joint(this.neck2, 0, N.l2, 0);
    this.headJoint = this.head;
    if (C.jaw) this.jaw = this.joint(this.head, 0, C.jaw.y, C.jaw.z);
    this.tail = [];
    if (C.tail) { let p = this.rear; C.tail.l.forEach((l, i) => { const j = this.joint(p, 0, i ? 0 : C.tail.y, i ? -C.tail.l[i - 1] : -C.tail.z); this.tail.push(j); p = j; }); }
    if (C.ears) {
      const E = C.ears;
      this.ears = [this.joint(this.head, E.x, E.y, E.z), this.joint(this.head, -E.x, E.y, E.z)];
    }
    // legs
    this.legs = []; this.hipRest = [];
    const mkLeg = (parent, sx, S) => {
      const l = new Leg(parent, sx * S.x, S.y, S.z, S.l1, S.l2, S.l3, S.bend);
      l.fz = S.fz || 0; l.sx = sx; l.baseZ = S.z;
      this.hipRest.push(new THREE.Vector3(sx * S.x, C.H + S.y, S.z));
      return l;
    };
    this.legs[HL] = mkLeg(this.rear, 1, C.hind); this.legs[FL] = mkLeg(this.front, 1, C.fore);
    this.legs[HR] = mkLeg(this.rear, -1, C.hind); this.legs[FR] = mkLeg(this.front, -1, C.fore);
    // state
    this.phase = this.rand(); this.sp = 0; this.acc = 0; this.spRaw = 0; this.air = 0; this.turnS = 0;
    this.foot = [0, 1, 2, 3].map(() => ({ z: 0, y: 0, psi: 0 }));
    this.P = {}; this.layDir = this.rand() < 0.5 ? 1 : -1;
    this.lookP = new Pulse(this.seed + 1, 2.5, 6, 2.2);
    this.earTw = [new Pulse(this.seed + 2, 1.5, 5, 0.35), new Pulse(this.seed + 3, 2, 6, 0.35)];
    this.tailTw = new Pulse(this.seed + 4, 2, 6, 0.7);
    this.G = { yaw: 0, bob: 0, pitch: 0, roll: 0, rear: 0, front: 0, rearYaw: 0, frontYaw: 0, env: 0, gG: 0 };
    this.X = { lay: 0, dead: 0, alive: 1 };
    this.settled = false;
  }

  // species hooks -------------------------------------------------------------------------------------------------
  posing(T, c) { }
  extras(c) { }
  tuckTarget(i, Lh) { return i % 2 ? [0.02 * this.legs[i].sx, -Lh * 0.5, Lh * 0.55] : [0.05 * this.legs[i].sx, -Lh * 0.5, Lh * 0.22]; }

  // gait ----------------------------------------------------------------------------------------------------------
  gait(dt, S, c) {
    const C = this.cfg, gc = C.gait, sp = this.sp, r = sp / S.maxSpeed;
    const gG = smoothstep(gc.gG[0], gc.gG[1], r), gW = 1 - smoothstep(gc.gT[0], gc.gT[1], r);
    let gT = Math.max(0, (1 - gW) * (1 - gG)); const tot = gW + gT + gG || 1;
    // gait weights are low-passed so a sudden speed change morphs the gait over ~0.3 s instead of snapping the feet
    const gs = this.gs || (this.gs = { W: gW / tot, T: gT / tot, G: gG / tot });
    gs.W = damp(gs.W, gW / tot, 6, dt); gs.T = damp(gs.T, gT / tot, 6, dt); gs.G = damp(gs.G, gG / tot, 6, dt);
    const gsum = gs.W + gs.T + gs.G || 1, wW = gs.W / gsum, wT = gs.T / gsum, wG = gs.G / gsum;
    const cyc = C.legLen * (gc.walk * wW + gc.trot * wT + gc.gallop * wG);
    if (sp > 0.02) this.phase = (this.phase + sp * dt / cyc) % 1;
    const env = smoothstep(0.02, 0.4, sp) * (1 - this.X.lay) * this.X.alive * (1 - this.airW);
    const duty = DUTY.walk * wW + DUTY.trot * wT + DUTY.gallop * wG;
    const stride = cyc * duty * (C.stanceMul || 1);
    const lift = C.legLen * (gc.liftW * wW + gc.liftT * wT + gc.liftG * wG) * (this.P.liftK ?? 1);
    for (let i = 0; i < 4; i++) {
      const off = OFF.walk[i] * wW + OFF.trot[i] * wT + OFF.gallop[i] * wG;
      const p = (this.phase + off) % 1, f = this.foot[i];
      if (p < duty) { const u = p / duty; f.z = stride * (0.5 - u); f.y = 0; f.psi = lerp(0.25, -0.5, u); f.sw = 0; }
      else { const q = (p - duty) / (1 - duty), e = q - Math.sin(TAU * q) / TAU; f.z = stride * (-0.5 + e); f.y = lift * Math.pow(Math.sin(Math.PI * Math.pow(q, 0.85)), 0.9); f.psi = lerp(-0.5, 0.25, ease(q)); f.sw = q; }
      f.z *= env; f.y *= env; f.psi *= env; f.env = env;
    }
    const ph = this.phase * TAU, G = this.G;
    const bobA = C.legLen * 0.045 * env;
    G.bob = -bobA * ((1 - wG) * Math.cos(4 * ph) * 0.6 + wG * (0.3 - Math.sin(ph + 0.6)));
    G.pitch = env * (wG * 0.09 * Math.sin(ph + 1.2) + (1 - wG) * 0.012 * Math.sin(4 * ph));
    G.rear = env * wG * 0.2 * Math.sin(ph + 0.3); G.front = -G.rear * 0.9;
    G.roll = env * (1 - wG) * 0.025 * Math.sin(2 * ph + 0.5);
    G.rearYaw = env * (1 - wG * 0.7) * 0.07 * Math.sin(2 * ph); G.frontYaw = -G.rearYaw * 0.8;
    G.env = env; G.gG = wG;
    this.gw = { W: wW, T: wT, G: wG };
  }

  // per-frame ------------------------------------------------------------------------------------------------------
  tick(dt, S) {
    const C = this.cfg, t = this.time, w = this.mw;
    const spOld = this.sp;
    this.sp = damp(this.sp, S.speed, 10, dt);
    this.acc = damp(this.acc, clamp((S.speed - this.spRaw) / dt, -20, 20), 5, dt); this.spRaw = S.speed;
    this.turnS = damp(this.turnS, S.turn, 8, dt);
    const airT = (!S.grounded && S.dead < 0) ? 1 : 0;
    this.air = damp(this.air, airT, 16, dt); this.airW = this.air;
    const r = clamp(this.sp / S.maxSpeed, 0, 1.3);
    const X = this.X, dead = S.dead;
    X.alive = dead < 0 ? 1 : 1 - smoothstep(0, 0.25, dead);
    const c = { dt, t, w, S, sp: this.sp, r, tel: S.telegraph, atk: S.attackT, ak: S.attackKind, hurt: S.hurt, aggro: S.aggro, air: this.air, dead, acc: this.acc, turn: this.turnS, mode: S.mode, self: this };
    this.gait(dt, S, c);
    const G = this.G;

    // idle behaviours
    const calm = 1 - Math.max(w.flee, w.chase, w.windup, w.attack, w.stalk, w.circle, w.dead, w.sleep) ;
    const look = this.lookP.update(dt, S.mode !== 'idle' && S.mode !== 'wander'), lookDir = this.lookP.dir;
    const tw0 = this.earTw[0].update(dt), tw1 = this.earTw[1].update(dt), tailTw = this.tailTw.update(dt);
    c.calm = clamp(calm, 0, 1); c.look = look; c.lookDir = lookDir; c.tw = [tw0, tw1]; c.tailTw = tailTw;
    const breathRate = 1.7 + r * 5 + S.aggro * 1.5;

    // target posture
    const N = C.neck, T = {
      H: 1, dy: 0, pitch: 0, roll: -clamp(this.turnS, -3, 3) * 0.035 * Math.min(1, this.sp / 2.5), yaw: 0,
      rear: 0, front: 0, rearYaw: 0, frontYaw: clamp(this.turnS * 0.03, -0.15, 0.15),
      e1: N.e1, e2: N.e2, hp: N.hp ?? 0.1, hy: 0, hr: 0, jaw: 0,
      tailP: C.tail ? C.tail.p : 0, tailC: C.tail ? C.tail.curl : 0, tailWag: 0.12, tailF: 2.2, tailYaw: 0,
      pin: 0, earUp: 0, earSw: 0,
      lay: 0, tuck: 0, spread: 0, wAir: 0, airK: 0, layAng: 0,
      lift: [0, 0, 0, 0], fwd: [0, 0, 0, 0], liftK: 1, tuckF: 0, tailFlick: 0, breath: 1, scap: 0, dz: 0, shake: 0, headBob: 0,
    };
    // generic look tracking + turn lead
    T.hy = clamp(S.lookYaw, -0.9, 0.9) * 0.9 + clamp(this.turnS * 0.15, -0.35, 0.35) + lookDir * 0.7 * look * w.idle;
    T.hp += -look * 0.05;
    // airborne posture (goat jump / pounce): k > 0 rising & tucked, < 0 falling & reaching
    T.wAir = 0; T.airK = clamp(-S.vy / 5, -1, 1) * 0.6 - 0.1;
    this.posing(T, c);

    // hit flinch (unsmoothed, decays with s.hurt)
    const hu = S.hurt;
    T.pitch += -hu * 0.12; T.hp += -hu * 0.45; T.e1 += hu * 0.15; T.dz -= hu * 0.06; T.H *= 1 - hu * 0.04;

    smoothInto(this.P, T, S.mode === 'attack' ? 26 : 11, dt);
    const P = this.P;

    // death: unsmoothed time curve
    let dPitchHead = 0, deadLegs = 0, deadTail = 0, deadNeck = 0, deadEar = 0;
    if (dead >= 0) {
      const f = clamp((dead - 0.06) / 0.55, 0, 1);
      X.lay = f < 1 ? easeOutBack(f) : 1 + 0.02 * Math.exp(-(dead - 0.6) * 5) * Math.sin((dead - 0.6) * 18);
      X.lay = Math.max(0, X.lay);
      deadLegs = smoothstep(0.05, 0.5, dead); deadTail = smoothstep(0.2, 1.0, dead); deadNeck = smoothstep(0.1, 0.8, dead); deadEar = smoothstep(0.2, 0.9, dead);
    } else X.lay = damp(X.lay, 0, 10, dt);

    // ------ apply to joints -------------------------------------------------------------------------------------
    const lay = Math.max(P.lay, X.lay), aliveK = X.alive;
    const sway = this.layDir;
    this.flop.position.set(0, lay * C.bodyR, 0);
    this.flop.rotation.set(0, 0, sway * lay * Math.PI * 0.5 * 0.94 + P.layAng * P.lay);
    const bre = Math.sin(t * breathRate) * P.breath * aliveK;
    const jitterY = Math.sin(t * 61) * (S.hurt * S.hurt) * 0.012;
    this.body.position.set(0, lerp(C.H * P.H + P.dy + G.bob + jitterY, 0, clamp(lay, 0, 1)) + (lay > 1 ? 0 : 0), 0);
    this.rig.position.z = P.dz;
    this.body.rotation.set(P.pitch + G.pitch, P.yaw + G.yaw + P.shake * Math.sin(t * 38) * 0.05, P.roll + G.roll);
    this.body.scale.set(1 + bre * 0.006, 1 + bre * 0.022, 1 + bre * 0.01);
    this.rear.rotation.set(P.rear + G.rear, P.rearYaw + G.rearYaw, 0);
    this.front.rotation.set(P.front + G.front, P.frontYaw + G.frontYaw, 0);
    const e1 = P.e1 - deadNeck * 0.5, e2 = P.e2 - deadNeck * 0.4;
    const bodyPitch = this.body.rotation.x + this.front.rotation.x;
    this.neck1.rotation.set(Math.PI / 2 - e1, P.hy * 0.3, 0);
    this.neck2.rotation.set(e1 - e2, P.hy * 0.3, 0);
    this.head.rotation.set(P.hp + deadNeck * 0.5 - (Math.PI / 2 - e2) - bodyPitch, P.hy * 0.4, P.hr);
    if (this.jaw) this.jaw.rotation.x = P.jaw;
    // tail chain: drooping/raised base pitch, curl per joint, travelling wag, lag against turning
    if (this.tail.length) {
      const n = this.tail.length, tt = t * P.tailF;
      for (let i = 0; i < n; i++) {
        const wave = Math.sin(tt - i * 0.9) * P.tailWag * (0.5 + i * 0.5);
        const flick = this.tailTw.env * this.tailTw.dir * 0.35 * (i + 1) / n * w.idle;
        const pitch = (i === 0 ? P.tailP : P.tailC) - deadTail * (i === 0 ? 0.7 : 0.2) + (i === 0 ? -this.acc * 0.012 : 0);
        this.tail[i].rotation.set(pitch + Math.sin(tt * 0.7 + 1.3 - i) * 0.04, (P.tailYaw / n) + wave + flick + Math.sin(t * 13 - i * 0.8) * P.tailFlick * i / n - (i === 0 ? this.turnS * 0.05 : 0), 0);
      }
    }
    // ears
    if (this.ears) {
      const E = C.ears;
      for (let k = 0; k < 2; k++) {
        const sg = k === 0 ? 1 : -1, tw = c.tw[k] * this.earTw[k].dir;
        const pin = clamp(P.pin + deadEar * 0.8, 0, 1);
        const rx = lerp(E.rx, E.pinRx, pin) + P.earUp * 0.25 + tw * 0.5 * (1 - pin);
        const rz = lerp(E.rz, E.pinRz, pin) + tw * 0.3 * (1 - pin);
        this.ears[k].rotation.set(rx, sg * P.earSw * 0.8, -sg * rz);
      }
    }
    this.extras(c, P);

    // ------ legs (IK) -------------------------------------------------------------------------------------------
    this.rig.updateMatrixWorld(true);
    _Mr.copy(this.rear.matrixWorld).invert().multiply(this.rig.matrixWorld);
    _Mf.copy(this.front.matrixWorld).invert().multiply(this.rig.matrixWorld);
    const scapK = P.scap * G.env;
    const wAir = clamp(Math.max(this.air, P.wAir), 0, 1);
        for (let i = 0; i < 4; i++) {
      const leg = this.legs[i], f = this.foot[i], fore = i % 2 === 1, M = fore ? _Mf : _Mr;
      // scapula roll / hip lift during swing
      leg.hip.position.y = leg.baseY + scapK * (fore ? 1 : 0.4) * Math.sin(Math.PI * clamp(f.sw || 0, 0, 1)) * (f.sw > 0 ? 1 : 0);
      const hr = this.hipRest[i];
      _v.set(hr.x + leg.sx * (P.spread + (fore ? 0 : 0)), f.y + P.lift[i] * (1 - wAir), hr.z + leg.fz + f.z + P.fwd[i]).applyMatrix4(M);
      let dx = _v.x - leg.hip.position.x, dy = _v.y - leg.hip.position.y, dz = _v.z - leg.hip.position.z;
      let psi = f.psi;
      // local (hip-relative) styles: tuck (lying/crouch), air, dead
      const Lh = leg.reach * 0.93;
      let wl = 0, lx = 0, ly = 0, lz = 0;
      const add = (wt, tx, ty, tz) => { wl += wt; lx += tx * wt; ly += ty * wt; lz += tz * wt; };
      const wTuck = clamp(P.tuck + (fore ? P.tuckF : 0), 0, 1), lieK = clamp(Math.max(P.lay, X.lay), 0, 1);
      const downK = leg.sx * this.layDir < 0 ? 1 - 0.62 * lieK : 1;   // legs under a lying body fold up instead of piercing the ground
      if (wTuck > 0.001) { const q = this.tuckTarget(i, Lh); add(wTuck, q[0], q[1] * downK, q[2] * downK); }
      if (wAir > 0.001) {
        const k = P.airK, ex = k;   // ex>0 reaching/extended, <0 tucked
        const tz = fore ? Lh * (0.12 + 0.45 * Math.max(ex, 0) - 0.1 * Math.min(ex, 0)) : Lh * (-0.05 - 0.5 * Math.max(ex, 0) + 0.05 * Math.min(ex, 0));
        const ty = -Lh * (0.82 + 0.16 * Math.max(ex, 0) + 0.35 * Math.min(ex, 0));
        add(wAir, leg.sx * 0.03, ty, tz);
      }
      if (deadLegs > 0.001) {
        const tw = deadLegs * Math.max(0, 1 - dead * 0.45) * Math.sin(dead * 24 + i * 1.7) * 0.06;
        add(deadLegs, leg.sx * 0.12 + tw, -Lh * (fore ? 0.85 : 0.8) * downK, (fore ? Lh * (0.4 + tw * 2) : -Lh * 0.15 + tw) * downK);
      }
      if (wl > 0.001) {
        const k = Math.min(wl, 1) / wl;   // normalise weights, blend ground -> local by min(wl,1)
        const a = Math.min(wl, 1);
        dx = lerp(dx, lx * k, a); dy = lerp(dy, ly * k, a); dz = lerp(dz, lz * k, a); psi = lerp(psi, 0.45, a);
      }
      leg.solve(dx, dy, dz, psi);
    }
  }
}
