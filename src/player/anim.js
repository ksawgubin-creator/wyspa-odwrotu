// Procedural animation for the humanoid rig: locomotion cycle, keyframed action clips (attacks, roll, block, gather...),
// additive hit reaction and death. Angles in the specs are DEGREES; see conventions below.
//  torso joints [pitch(+fwd), yaw(+left), roll(+right)]   shoulders [fwd, out, sweep(+left)]   elbow: bend
//  hips [fwd, twist, out]                                   knee: bend
import { JOINTS, JI } from '../gfx/rig.js';
import { clamp, lerp, smoothstep, easeInCubic, easeOutCubic, easeInOutCubic, easeOutQuad, deg, damp } from '../engine/util.js';

const D = Math.PI / 180;
export function newPose() { return { rot: new Float32Array(JOINTS.length * 3), ox: 0, oy: 0, oz: 0, pitch: 0, roll: 0, pyaw: 0, pivotY: 0 }; }
export function copyPose(a, b) { a.rot.set(b.rot); a.ox = b.ox; a.oy = b.oy; a.oz = b.oz; a.pitch = b.pitch; a.roll = b.roll; a.pyaw = b.pyaw; a.pivotY = b.pivotY; return a; }

const setJ = (p, name, x, y, z) => { const i = JI[name] * 3; p.rot[i] = x; p.rot[i + 1] = y; p.rot[i + 2] = z; };
// Build a pose from a readable spec (degrees).
export function S(o = {}, into = newPose()) {
  into.rot.fill(0);
  const t3 = (n) => { const v = o[n]; if (v) setJ(into, n, (v[0] || 0) * D, (v[1] || 0) * D, (v[2] || 0) * D); };
  ['hips', 'spine', 'chest', 'head'].forEach(t3);
  for (const side of ['L', 'R']) {
    const sg = side === 'L' ? 1 : -1;
    const sh = o['sh' + side]; if (sh) setJ(into, 'sh' + side, -(sh[0] || 0) * D, (sh[2] || 0) * D, sg * (sh[1] || 0) * D);
    const el = o['el' + side]; if (el !== undefined) setJ(into, 'el' + side, -el * D, 0, 0);
    const hp = o['hip' + side]; if (hp) setJ(into, 'hip' + side, -(hp[0] || 0) * D, (hp[1] || 0) * D, sg * (hp[2] || 0) * D);
    const kn = o['kn' + side]; if (kn !== undefined) setJ(into, 'kn' + side, kn * D, 0, 0);
  }
  into.rot[JI.wrR * 3] = Math.PI - (o.wr ?? 70) * D;    // wrist: angle of the blade from the forearm's extension (0 = in line, 90 = perpendicular)
  into.ox = o.ox || 0; into.oy = o.oy || 0; into.oz = o.oz || 0; into.pitch = (o.pitch || 0) * D; into.roll = (o.roll || 0) * D; into.pyaw = (o.pyaw || 0) * D; into.pivotY = o.pivotY || 0;
  return into;
}
export function lerpPose(out, a, b, t) {
  for (let i = 0; i < out.rot.length; i++) out.rot[i] = a.rot[i] + (b.rot[i] - a.rot[i]) * t;
  out.ox = lerp(a.ox, b.ox, t); out.oy = lerp(a.oy, b.oy, t); out.oz = lerp(a.oz, b.oz, t);
  out.pitch = lerp(a.pitch, b.pitch, t); out.roll = lerp(a.roll, b.roll, t); out.pyaw = lerp(a.pyaw, b.pyaw, t); out.pivotY = lerp(a.pivotY, b.pivotY, t);
  return out;
}
const LEG = new Set([JI.hipL, JI.knL, JI.hipR, JI.knR]);
// Blend `over` onto `base` with separate weights for upper body and legs.
export function layer(base, over, wu, wl = wu) {
  for (let j = 0; j < JOINTS.length; j++) {
    const w = LEG.has(j) ? wl : wu;
    for (let k = 0; k < 3; k++) base.rot[j * 3 + k] += (over.rot[j * 3 + k] - base.rot[j * 3 + k]) * w;
  }
  base.ox = lerp(base.ox, over.ox, wu); base.oy = lerp(base.oy, over.oy, wu); base.oz = lerp(base.oz, over.oz, wu);
  base.pitch = lerp(base.pitch, over.pitch, wu); base.roll = lerp(base.roll, over.roll, wu); base.pyaw = lerp(base.pyaw, over.pyaw, wu); base.pivotY = lerp(base.pivotY, over.pivotY, wu);
  return base;
}

// --- clips ------------------------------------------------------------------------------------------
// Keyframes are anchored to the attack's own timing so animation and hit window always agree:
//  start -> wind (end of windup) -> hit (middle of the active window) -> follow (end of active) -> end
const EASE = { in: easeInCubic, out: easeOutCubic, io: easeInOutCubic, lin: (t) => t, q: easeOutQuad };
const P = {};   // canonical clip definitions
const guardR = { wr: 60, shR: [30, 18, 0], elR: 60, shL: [25, 22, 0], elL: 55, chest: [4, 0, 0] };
P.slashR = { keys: [
  { at: 'start', s: { wr: 60, ...guardR } },
  { at: 'wind', ease: 'out', s: { wr: 55, ox: 0.02, oy: -0.06, chest: [-4, -58, 6], spine: [0, -14, 0], hips: [0, 10, 0], head: [0, 40, 0], shR: [55, 70, -55], elR: 75, shL: [35, 25, 0], elL: 60, hipL: [18, 0, 0], knL: 25, hipR: [-16, 0, 0], knR: 20, pitch: 0 } },
  { at: 'hit', ease: 'in', s: { wr: 8, oy: -0.1, oz: 0.16, chest: [10, 48, -4], spine: [0, 16, 0], hips: [0, -14, 0], head: [0, -30, 0], shR: [92, 26, 62], elR: 14, shL: [-10, 40, 0], elL: 80, hipL: [30, 0, 0], knL: 40, hipR: [-24, 0, 0], knR: 26 } },
  { at: 'follow', ease: 'out', s: { wr: 6, oy: -0.08, oz: 0.2, chest: [8, 66, -6], spine: [0, 20, 0], hips: [0, -18, 0], head: [0, -38, 0], shR: [88, 18, 88], elR: 30, shL: [-16, 40, 0], elL: 85, hipL: [30, 0, 0], knL: 40, hipR: [-24, 0, 0], knR: 26 } },
  { at: 'end', ease: 'io', s: { wr: 60, ...guardR } },
] };
P.slashL = { keys: [
  { at: 'start', s: { wr: 60, ...guardR } },
  { at: 'wind', ease: 'out', s: { wr: 55, oy: -0.05, chest: [-2, 46, -4], spine: [0, 14, 0], hips: [0, -8, 0], head: [0, -34, 0], shR: [70, 55, 70], elR: 60, shL: [30, 30, 0], elL: 60, hipL: [-14, 0, 0], knL: 20, hipR: [20, 0, 0], knR: 26 } },
  { at: 'hit', ease: 'in', s: { wr: 25, oy: -0.1, oz: 0.18, chest: [10, -52, 4], spine: [0, -18, 0], hips: [0, 14, 0], head: [0, 34, 0], shR: [88, 8, -58], elR: 22, shL: [10, 30, 0], elL: 70, hipL: [-20, 0, 0], knL: 26, hipR: [32, 0, 0], knR: 42 } },
  { at: 'follow', ease: 'out', s: { wr: 6, oy: -0.08, oz: 0.22, chest: [8, -70, 6], spine: [0, -22, 0], hips: [0, 16, 0], head: [0, 40, 0], shR: [80, 8, -84], elR: 34, shL: [10, 30, 0], elL: 70, hipL: [-20, 0, 0], knL: 26, hipR: [32, 0, 0], knR: 42 } },
  { at: 'end', ease: 'io', s: { wr: 60, ...guardR } },
] };
P.overhead = { keys: [
  { at: 'start', s: { wr: 60, ...guardR } },
  { at: 'wind', ease: 'out', s: { wr: 100, oy: -0.02, pitch: -8, chest: [-16, 0, 0], spine: [-6, 0, 0], head: [-14, 0, 0], shR: [168, 12, 0], elR: 70, shL: [150, 18, 0], elL: 80, hipL: [10, 0, 0], knL: 14, hipR: [-12, 0, 0], knR: 16 } },
  { at: 'hit', ease: 'in', s: { wr: 40, oy: -0.16, oz: 0.24, pitch: 10, chest: [30, 0, 0], spine: [10, 0, 0], head: [14, 0, 0], shR: [52, 10, 0], elR: 8, shL: [55, 18, 0], elL: 14, hipL: [42, 0, 0], knL: 56, hipR: [-28, 0, 0], knR: 22 } },
  { at: 'follow', ease: 'out', s: { wr: 35, oy: -0.18, oz: 0.26, pitch: 12, chest: [34, 0, 0], spine: [12, 0, 0], head: [16, 0, 0], shR: [36, 10, 0], elR: 12, shL: [40, 18, 0], elL: 20, hipL: [44, 0, 0], knL: 60, hipR: [-30, 0, 0], knR: 24 } },
  { at: 'end', ease: 'io', s: { wr: 60, ...guardR } },
] };
P.thrust = { keys: [
  { at: 'start', s: { wr: 60, ...guardR } },
  { at: 'wind', ease: 'out', s: { wr: 70, oy: -0.08, chest: [4, -34, 0], spine: [0, -10, 0], head: [0, 30, 0], shR: [20, 34, -10], elR: 110, shL: [78, 20, 20], elL: 40, hipL: [22, 0, 0], knL: 34, hipR: [-24, 0, 0], knR: 24 } },
  { at: 'hit', ease: 'in', s: { wr: 4, oy: -0.16, oz: 0.32, pitch: 6, chest: [12, 24, 0], spine: [4, 10, 0], head: [0, -20, 0], shR: [86, 10, 8], elR: 6, shL: [88, 14, 12], elL: 14, hipL: [44, 0, 0], knL: 58, hipR: [-30, 0, 0], knR: 20 } },
  { at: 'follow', ease: 'out', s: { wr: 4, oy: -0.16, oz: 0.34, pitch: 6, chest: [12, 26, 0], spine: [4, 10, 0], head: [0, -22, 0], shR: [86, 10, 8], elR: 8, shL: [88, 14, 12], elL: 14, hipL: [44, 0, 0], knL: 58, hipR: [-30, 0, 0], knR: 20 } },
  { at: 'end', ease: 'io', s: { wr: 60, ...guardR } },
] };
// tool chopping: heavy downward diagonal, used for axes / pickaxes on trees and rocks
P.chop = { keys: [
  { at: 'start', s: { wr: 60, ...guardR } },
  { at: 'wind', ease: 'out', s: { wr: 100, oy: -0.04, pitch: -6, chest: [-12, -14, 0], spine: [-4, -6, 0], head: [-10, 10, 0], shR: [158, 26, -12], elR: 78, shL: [120, 24, 0], elL: 90, hipL: [14, 0, 0], knL: 18, hipR: [-14, 0, 0], knR: 18 } },
  { at: 'hit', ease: 'in', s: { wr: 38, oy: -0.17, oz: 0.16, pitch: 12, chest: [32, 6, 0], spine: [12, 4, 0], head: [16, 0, 0], shR: [58, 12, 4], elR: 16, shL: [58, 18, 0], elL: 24, hipL: [38, 0, 0], knL: 52, hipR: [-24, 0, 0], knR: 22 } },
  { at: 'follow', ease: 'out', s: { wr: 34, oy: -0.18, oz: 0.16, pitch: 14, chest: [34, 6, 0], spine: [14, 4, 0], head: [16, 0, 0], shR: [50, 12, 4], elR: 20, shL: [52, 18, 0], elL: 26, hipL: [38, 0, 0], knL: 52, hipR: [-24, 0, 0], knR: 22 } },
  { at: 'end', ease: 'io', s: { wr: 60, ...guardR } },
] };
P.punch = { keys: [
  { at: 'start', s: { wr: 60, ...guardR } },
  { at: 'wind', ease: 'out', s: { wr: 60, chest: [0, -30, 0], spine: [0, -8, 0], shR: [40, 30, -10], elR: 125, shL: [50, 20, 0], elL: 100, hipL: [14, 0, 0], knL: 20, hipR: [-16, 0, 0], knR: 18 } },
  { at: 'hit', ease: 'in', s: { wr: 60, oz: 0.16, oy: -0.05, chest: [6, 26, 0], spine: [0, 8, 0], shR: [88, 6, 10], elR: 8, shL: [50, 20, 0], elL: 100, hipL: [30, 0, 0], knL: 36, hipR: [-22, 0, 0], knR: 20 } },
  { at: 'follow', ease: 'out', s: { wr: 60, oz: 0.18, oy: -0.05, chest: [6, 30, 0], shR: [86, 6, 10], elR: 12, shL: [50, 20, 0], elL: 100, hipL: [30, 0, 0], knL: 36, hipR: [-22, 0, 0], knR: 20 } },
  { at: 'end', ease: 'io', s: { wr: 60, ...guardR } },
] };
// bending down to pick something up / open a crate
P.pick = { keys: [
  { at: 'start', s: {} },
  { at: 'wind', ease: 'io', s: { oy: -0.3, chest: [40, 8, 0], spine: [16, 0, 0], head: [-10, 0, 0], shR: [72, 12, 0], elR: 30, shL: [30, 22, 0], elL: 40, hipL: [46, 0, 0], knL: 90, hipR: [30, 0, 0], knR: 80 } },
  { at: 'hit', ease: 'lin', s: { oy: -0.32, chest: [44, 8, 0], spine: [18, 0, 0], head: [-12, 0, 0], shR: [76, 12, 0], elR: 24, shL: [30, 22, 0], elL: 40, hipL: [48, 0, 0], knL: 94, hipR: [32, 0, 0], knR: 84 } },
  { at: 'follow', ease: 'io', s: { oy: -0.2, chest: [24, 4, 0], spine: [8, 0, 0], shR: [50, 14, 0], elR: 50, shL: [30, 22, 0], elL: 40, hipL: [30, 0, 0], knL: 60, hipR: [20, 0, 0], knR: 50 } },
  { at: 'end', ease: 'io', s: {} },
] };

const clipCache = new Map();
function bakeClip(name, timing) {
  const def = P[name] || P.slashR;
  const key = name + timing.wind.toFixed(3) + timing.hit.toFixed(3) + timing.follow.toFixed(3);
  let c = clipCache.get(key);
  if (c) return c;
  const anchors = { start: 0, wind: timing.wind, hit: timing.hit, follow: timing.follow, end: 1 };
  c = def.keys.map((k) => ({ t: anchors[k.at], ease: EASE[k.ease || 'io'], pose: S(k.s) }));
  clipCache.set(key, c);
  return c;
}
const _tmp = newPose();
function evalClip(keys, t, out) {
  t = clamp(t, 0, 1);
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1];
  const k = b.t > a.t ? clamp((t - a.t) / (b.t - a.t), 0, 1) : 1;
  return lerpPose(out, a.pose, b.pose, b.ease(k));
}

// --- static poses ---------------------------------------------------------------------------------
const blockPose = S({ oy: -0.07, chest: [4, -18, 0], spine: [0, -6, 0], shR: [82, 26, -46], elR: 100, shL: [70, 14, 20], elL: 96, hipL: [16, 0, 0], knL: 26, hipR: [-14, 0, 0], knR: 22 });
const parryPose = S({ oz: 0.18, oy: -0.1, chest: [10, 22, 0], spine: [0, 10, 0], shR: [98, 8, -12], elR: 26, shL: [80, 14, 24], elL: 40, hipL: [34, 0, 0], knL: 42, hipR: [-22, 0, 0], knR: 24 });
const tuckPose = S({ pitch: 0, chest: [46, 0, 0], spine: [20, 0, 0], head: [30, 0, 0], shR: [62, 10, 0], elR: 118, shL: [62, 10, 0], elL: 118, hipL: [92, 0, 0], knL: 128, hipR: [92, 0, 0], knR: 128 });
const jumpUp = S({ oy: 0, chest: [-4, 0, 0], shR: [42, 44, 0], elR: 40, shL: [42, 44, 0], elL: 40, hipL: [34, 0, 0], knL: 62, hipR: [-8, 0, 0], knR: 24 });
const fallPose = S({ chest: [2, 0, 0], shR: [24, 62, 0], elR: 30, shL: [24, 62, 0], elL: 30, hipL: [14, 0, 6], knL: 14, hipR: [-12, 0, 6], knR: 10 });

const IDLE_BASE = S({ shR: [4, 8, 0], elR: 14, shL: [4, 8, 0], elL: 14 });

// Direction the character crouches lower with the knees bent (h = drop in metres).
function crouch(p, h) {
  const th = Math.acos(clamp(1 - h / 0.88, 0.3, 1));
  p.oy += -h;
  for (const s of ['L', 'R']) { const i = JI['hip' + s] * 3, k = JI['kn' + s] * 3; p.rot[i] += -th; p.rot[k] += th * 2; }
  p.rot[JI.spine * 3] += th * 0.35; p.rot[JI.chest * 3] += th * 0.3;
}

export class HumanAnimator {
  constructor(rig) {
    this.rig = rig;
    this.pose = newPose(); this.tmp = newPose(); this.tmp2 = newPose();
    this.phase = 0; this.t = Math.random() * 10; this.sp = 0; this.run = 0; this.crouch = 0; this.air = 0; this.landT = 0; this.wasGrounded = true; this.lookYaw = 0;
    this.holdPose = 0;
  }

  // s: see file header. Returns nothing; applies to the rig.
  update(dt, s) {
    this.t += dt;
    const p = this.pose;
    const speedNow = s.speed || 0;
    this.sp = damp(this.sp, speedNow, 14, dt);
    const walkMax = s.walkSpeed || 4.2;
    const w = clamp(this.sp / walkMax, 0, 1);
    const run = clamp((this.sp - walkMax) / ((s.sprintSpeed || 7) - walkMax), 0, 1);
    this.run = damp(this.run, run, 8, dt);
    this.crouch = damp(this.crouch, s.sneak ? 1 : 0, 12, dt);
    // step phase advances with distance, so feet do not slide
    const stride = s.sneak ? 0.62 : 0.86;
    if (this.sp > 0.15 && s.grounded) this.phase += (this.sp * dt / stride) * Math.PI * 1.0;
    else this.phase = damp(this.phase, Math.round(this.phase / Math.PI) * Math.PI, 6, dt);
    if (s.grounded && !this.wasGrounded) this.landT = 1;
    this.wasGrounded = s.grounded;
    this.landT = Math.max(0, this.landT - dt * 3.2);

    // ---- base locomotion / idle ----
    S({}, p);
    const ph = this.phase, r = this.run, wl = smoothstep(0.02, 0.5, w);
    const t = this.t;
    // idle
    p.rot.set(IDLE_BASE.rot);
    const br = Math.sin(t * 1.9);
    setJ(p, 'chest', (0.015 + 0.02 * br) , Math.sin(t * 0.5) * 0.03, 0);
    setJ(p, 'head', -0.02 * br + Math.sin(t * 0.7) * 0.02, Math.sin(t * 0.31) * 0.22 * (1 - wl), Math.sin(t * 0.4) * 0.02);
    setJ(p, 'hips', 0, 0, Math.sin(t * 0.6) * 0.025 * (1 - wl));
    p.oy = 0.006 * br * (1 - wl);
    // walk / run cycle blended in
    if (wl > 0.001) {
      const A = lerp(0.46, 0.92, r), K = lerp(0.85, 1.25, r), arm = lerp(0.42, 0.85, r), el = lerp(0.3, 1.1, r);
      const sL = Math.sin(ph), sR = -sL;
      const mixJ = (idx, full) => { p.rot[idx] = lerp(p.rot[idx], full, wl); };
      const legs = (side, sn, cs) => {
        mixJ(JI['hip' + side] * 3, -(A * sn) - 0.04);
        mixJ(JI['kn' + side] * 3, K * Math.max(0, cs) * 0.9 + 0.1 + r * 0.25);
      };
      legs('L', sL, Math.cos(ph)); legs('R', sR, Math.cos(ph + Math.PI));
      // arms swing opposite to the legs
      mixJ(JI.shL * 3, -(arm * sR)); mixJ(JI.shR * 3, -(arm * sL));
      mixJ(JI.elL * 3, -(el * (0.6 + 0.4 * Math.max(0, -sR)))); mixJ(JI.elR * 3, -(el * (0.6 + 0.4 * Math.max(0, -sL))));
      p.rot[JI.hips * 3 + 1] += -0.16 * A * sL * wl;
      p.rot[JI.spine * 3 + 1] += 0.2 * A * sL * wl;
      p.rot[JI.chest * 3 + 1] += 0.08 * A * sL * wl;
      p.rot[JI.hips * 3 + 2] += 0.035 * Math.sin(ph) * wl;
      p.rot[JI.head * 3 + 1] -= 0.16 * A * sL * wl;
      p.oy += (-0.5 * (0.5 - 0.5 * Math.cos(2 * ph)) * lerp(0.055, 0.1, r)) * wl;
      p.ox += 0.012 * Math.sin(ph) * wl;
      const lean = (0.04 + 0.3 * r) * wl;
      p.rot[JI.hips * 3] += lean * 0.6; p.rot[JI.chest * 3] += lean * 0.5;
      p.rot[JI.head * 3] -= lean * 0.7;
    }
    // sneaking: lower stance
    if (this.crouch > 0.01) { crouch(p, 0.2 * this.crouch); p.rot[JI.head * 3] -= 0.2 * this.crouch; }
    // holding a tool: right arm bent forward
    const hold = s.holding;
    if (hold && !s.attack && !s.interact) {
      const k = 1 - wl * 0.55;
      if (hold === 'torch') { setJ(p, 'shR', -(52 * D), 0, -12 * D * 1); p.rot[JI.elR * 3] = -(84 * D); p.rot[JI.wrR * 3] = Math.PI - 88 * D; }
      else if (hold === 'bow') { setJ(p, 'shL', -(20 * D), 0, 14 * D); p.rot[JI.elL * 3] = -(34 * D); }
      else { p.rot[JI.shR * 3] = lerp(p.rot[JI.shR * 3], -(28 * D), k); p.rot[JI.elR * 3] = lerp(p.rot[JI.elR * 3], -(54 * D), k); p.rot[JI.wrR * 3] = Math.PI - (hold === 'spear' ? 92 : hold === 'sword' ? 55 : 72) * D; }
    }
    // airborne
    if (!s.grounded) {
      const up = clamp((s.vy || 0) / 6, -1, 1);
      const a = smoothstep(-0.4, 0.5, up);
      layer(p, jumpUp, 0.8 * a, 0.9 * a); layer(p, fallPose, 0.8 * (1 - a), 0.8 * (1 - a));
    }
    if (this.landT > 0.01) { const k = Math.sin(this.landT * Math.PI) * 0.5 + this.landT * 0.5; crouch(p, 0.22 * k * (s.landHard ? 1.4 : 1)); }
    // wading: knees up
    if (s.wade) { p.rot[JI.hipL * 3] -= 0.25 * wl; p.rot[JI.hipR * 3] -= 0.25 * wl; }

    // ---- actions ----
    if (s.dead >= 0) return this.finish(this.death(p, s));
    if (s.dodge) return this.finish(this.roll(p, s.dodge));

    if (s.block > 0.001) { const k = easeOutCubic(clamp(s.block, 0, 1)); layer(p, blockPose, k, k * 0.6); }
    if (s.parry) {
      const k = s.parry.t < 0.25 ? easeOutCubic(s.parry.t / 0.25) : 1 - easeInOutCubic((s.parry.t - 0.25) / 0.75);
      layer(p, parryPose, clamp(k, 0, 1), clamp(k, 0, 1) * 0.7);
    }
    if (s.aim) this.aimPose(p, s.aim, wl);
    const act = s.attack || s.interact;
    if (act) {
      const keys = bakeClip(act.clip, act.timing);
      evalClip(keys, act.t, this.tmp);
      const dur = act.dur || 0.5;
      const secs = act.t * dur;
      const wIn = clamp(secs / Math.min(0.09, dur * 0.3), 0, 1), wOut = clamp((dur - secs) / Math.min(0.14, dur * 0.3), 0, 1);
      const wgt = easeOutCubic(Math.min(wIn, wOut));
      layer(p, this.tmp, wgt, wgt * lerp(0.95, 0.35, wl));
    }
    if (s.hurt) this.hurt(p, s.hurt);
    this.finish(p);
  }

  aimPose(p, a, wl) {
    const d = clamp(a.draw, 0, 1);
    const q = S({ oy: -0.04, chest: [2, 40, 0], spine: [0, 12, 0], head: [0, -46, 0], shL: [88, 8, 8], elL: 6 + (1 - d) * 4, shR: [78 + d * 4, 44, -54 - d * 28], elR: 108 - d * 40, hipL: [14, 0, 0], knL: 16, hipR: [-12, 0, 0], knR: 14 });
    layer(p, q, 1, 0.6 - wl * 0.3);
  }

  hurt(p, h) {
    // additive recoil: torso snaps back (or forward when hit from behind), arms fling, quick decay
    const k = Math.sin(clamp(h.t, 0, 1) * Math.PI) * (1 - h.t * 0.4);
    const dir = h.back ? -1 : 1;
    p.rot[JI.chest * 3] += -0.5 * k * dir; p.rot[JI.spine * 3] += -0.2 * k * dir; p.rot[JI.head * 3] += -0.4 * k * dir;
    p.rot[JI.chest * 3 + 2] += 0.12 * k * (h.side || 1);
    p.rot[JI.shL * 3] += 0.5 * k; p.rot[JI.shR * 3] += 0.5 * k;
    p.rot[JI.shL * 3 + 2] += 0.5 * k; p.rot[JI.shR * 3 + 2] -= 0.5 * k;
    p.oy += -0.05 * k; p.oz += -0.06 * k * dir;
  }

  roll(p, d) {
    const t = clamp(d.t, 0, 1);
    const tk = smoothstep(0.0, 0.2, t) * (1 - smoothstep(0.78, 1.0, t));
    S({}, this.tmp2);
    lerpPose(this.tmp, this.tmp2, tuckPose, tk);
    copyPose(p, this.tmp);
    p.pitch = (d.back ? -1 : 1) * Math.PI * 2 * easeInOutCubic(smoothstep(0.08, 0.92, t));
    p.pivotY = -0.36 * tk;
    p.oy = 0.0;
    return p;
  }

  death(p, s) {
    const t = s.dead, dir = s.deadBack === false ? 1 : -1;
    const k1 = smoothstep(0, 0.45, t), k2 = easeInCubic(smoothstep(0.2, 1.0, t)), k3 = smoothstep(1.0, 1.5, t);
    S({ chest: [-18 * dir * -1 * 0.0, 0, 0] }, this.tmp2);
    const pose = S({ chest: [dir * 14, 0, 6], head: [dir * 20, 0, 0], shR: [20, 60, 0], elR: 30, shL: [10, 70, 0], elL: 20, hipL: [-6, 0, 4], knL: 26, hipR: [10, 0, 4], knR: 38 });
    lerpPose(this.tmp, this.tmp2, pose, k1);
    // buckle knees before collapsing
    p.rot.set(this.tmp.rot);
    p.rot[JI.knL * 3] += 0.9 * k2; p.rot[JI.knR * 3] += 0.7 * k2;
    p.rot[JI.hipL * 3] -= 0.5 * k2 * -dir * 0; 
    p.pitch = dir * (Math.PI / 2 - 0.05) * k2;
    p.pivotY = -0.72 * k2 - 0.0 * k3;
    p.oy = -0.05 * k1;
    p.roll = 0.08 * k3;
    return p;
  }

  finish(p) { this.rig.apply(p); }
}
