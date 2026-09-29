// Shared toolkit for the procedural creatures (src/gfx/creatures.js).
// Conventions: every creature faces +Z, Y is up, +X is the creature's LEFT. Joints are THREE.Group nodes.
//  - limb meshes hang DOWN from their joint (-Y); a joint rotation.x > 0 swings a hanging limb toward -Z (backwards).
//  - neck/ear/spine meshes grow UP (+Y); rotation.x > 0 tips them forward (+Z).
//  - tail meshes grow BACK (-Z); rotation.x > 0 raises the tail.
//  - head/snout/jaw meshes point +Z; rotation.x > 0 pitches the nose DOWN.
import * as THREE from 'three';
import { blob, trunk, cone, leaf, merge, xf, paint, jitter, col, rng } from '../meshkit.js';
import { clamp, lerp, damp, smoothstep, TAU } from '../../engine/util.js';

export { blob, trunk, cone, leaf, merge, xf, paint, jitter, col, rng, THREE, clamp, lerp, damp, smoothstep, TAU };

// ---------------------------------------------------------------------------------------------------------------
// geometry cache + build helpers
const cache = new Map();
export function cached(key, fn) { let g = cache.get(key); if (!g) { g = fn(); cache.set(key, g); } return g; }

export const shade = (hex, k) => col(hex).multiplyScalar(k);
export const mix = (a, b, t) => col(a).lerp(col(b), t);
export const hex = (c) => (c.isColor ? c.getHex() : c);

// Furry two-tone gradient: back colour on top, belly colour underneath, relative to a centre height cy and radius r.
export function fur(back, belly, cy = 0, r = 0.2) {
  const cb = col(back), cl = col(belly), t = new THREE.Color();
  return (x, y) => t.copy(cb).lerp(cl, smoothstep(cy + r * 0.1, cy - r * 0.85, y)).clone();
}

// Jittered blob with house defaults.
export function B(r, pos, squash, color, seed = 1, o = {}) {
  return blob({ r, pos, squash: squash || [1, 1, 1], color, seed, detail: o.detail ?? 1, jit: o.jit ?? 0.1, faceVar: o.fv ?? 0.07, rot: o.rot });
}


// Lofted body: elliptical rings along Z through control profile [[z, rx, ry, cy, cx?], ...] (Catmull-Rom smoothed).
// Renders z0..z1 only, so a torso can be split across the spine joint with matching ring shapes at the seam.
export function profileAt(ctrl, z) {
  const n = ctrl.length; let i = 0;
  while (i < n - 2 && z > ctrl[i + 1][0]) i++;
  const a = ctrl[Math.max(i - 1, 0)], b = ctrl[i], c = ctrl[i + 1], d = ctrl[Math.min(i + 2, n - 1)];
  const t = clamp((z - b[0]) / (c[0] - b[0] || 1), 0, 1), t2 = t * t, t3 = t2 * t;
  const out = [];
  for (let k = 1; k < 5; k++) {
    const p0 = a[k] ?? 0, p1 = b[k] ?? 0, p2 = c[k] ?? 0, p3 = d[k] ?? 0;
    out.push(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3));
  }
  return out;   // rx, ry, cy, cx
}
export function loft(ctrl, z0, z1, o = {}) {
  const zs = o.zs || Array.from({ length: (o.steps ?? 4) + 1 }, (_, k) => lerp(z0, z1, k / (o.steps ?? 4)));
  const steps = zs.length - 1, sides = o.sides ?? 7, pos = [];
  const rings = [];
  for (let k = 0; k <= steps; k++) {
    const z = zs[k], pr = profileAt(ctrl, z), sc = o.ringScale ? o.ringScale(z) : 1, rx = pr[0] * sc, ry = pr[1] * sc, cy = pr[2], cx = pr[3], ring = [];
    for (let j = 0; j < sides; j++) { const a = (j / sides) * TAU + 0.3; ring.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), z]); }
    rings.push({ ring, c: [cx, cy, z] });
  }
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let k = 0; k < steps; k++) for (let j = 0; j < sides; j++) {
    const j1 = (j + 1) % sides, p00 = rings[k].ring[j], p10 = rings[k].ring[j1], p01 = rings[k + 1].ring[j], p11 = rings[k + 1].ring[j1];
    tri(p00, p10, p11); tri(p00, p11, p01);
  }
  if (o.capStart !== false) for (let j = 0; j < sides; j++) tri(rings[0].c, rings[0].ring[(j + 1) % sides], rings[0].ring[j]);
  if (o.capEnd !== false) for (let j = 0; j < sides; j++) tri(rings[steps].c, rings[steps].ring[j], rings[steps].ring[(j + 1) % sides]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  jitter(g, o.jit ?? 0.01, o.seed ?? 1);
  g.computeVertexNormals();
  const color = o.color || 0x808080;
  paint(g, typeof color === 'function' ? color : () => color, o.fv ?? 0.07, o.seed ?? 1);
  return g;
}


// Torso split at the spine pivot (z = 0): returns { rear, front } lofts whose ring shapes match at the seam. The rear half continues a
// little into the front half at 95% size, so bending the spine never opens a crack.
export function torso(ctrl, zMin, zMax, o = {}) {
  const n = o.steps ?? 4, zr = Array.from({ length: n + 1 }, (_, k) => lerp(zMin, 0, k / n)); zr.push(0.06);
  const zf = Array.from({ length: n + 1 }, (_, k) => lerp(0, zMax, k / n));
  return { rear: loft(ctrl, 0, 0, { ...o, zs: zr, capEnd: false, ringScale: (z) => (z > 0.001 ? 0.95 : 1) }), front: loft(ctrl, 0, 0, { ...o, zs: zf, capStart: false, seed: (o.seed ?? 1) + 2 }) };
}

// Lofted limb hanging down from its joint. radii = [top, mid, bottom]; sq = front/back ratio; shift = forward offset of mid ring.
export function limbL(len, radii, c0, c1 = c0, seed = 1, o = {}) {
  const [a, m, b] = radii, sq = o.sq ?? 1, sh = o.shift ?? 0, ext = o.ext ?? 0.02;
  const ctrl = [[-ext, a, a * sq, sh * 0.3], [len * (o.mid ?? 0.4), m, m * sq, sh], [len, b, b * sq, 0]];
  const c0c = col(c0), c1c = col(c1), tmp = new THREE.Color();
  const g = loft(ctrl, -ext, len, { steps: o.steps ?? (o.mid ? 2 : 1), sides: o.sides ?? 5, jit: o.jit ?? 0.004, seed, fv: o.fv ?? 0.07, capStart: o.capStart !== false, color: (x, y, z) => tmp.copy(c0c).lerp(c1c, clamp(z / len, 0, 1)).clone() });
  xf(g, { rot: [Math.PI / 2, 0, 0] });
  return g;
}

// Tapered limb segment hanging down from the origin: radius r0 at the joint, r1 at the far end.
export function limb(len, r0, r1, c0, c1 = c0, seed = 1, o = {}) {
  const g = trunk({ rb: r0, rt: r1, h: len, segs: o.segs ?? 5, rows: o.rows ?? 1, jit: o.jit ?? 0.006, wobble: 0, seed, colorBase: c0, colorTop: c1, faceVar: o.fv ?? 0.07 });
  xf(g, { rot: [Math.PI, 0, 0], scale: o.squash });
  return g;
}
// Tapered piece growing along +Z (snouts, jaws): radius r0 at origin, r1 at the tip.
export function along(len, r0, r1, c0, c1 = c0, seed = 1, o = {}) {
  const g = trunk({ rb: r0, rt: r1, h: len, segs: o.segs ?? 5, rows: o.rows ?? 1, jit: o.jit ?? 0.006, wobble: 0, seed, colorBase: c0, colorTop: c1, faceVar: o.fv ?? 0.07 });
  xf(g, { rot: [Math.PI / 2, 0, 0], scale: o.squash, pos: o.pos });
  return g;
}
// Tapered piece growing along -Z (tails).
export function back(len, r0, r1, c0, c1 = c0, seed = 1, o = {}) {
  const g = trunk({ rb: r0, rt: r1, h: len, segs: o.segs ?? 5, rows: o.rows ?? 1, jit: o.jit ?? 0.006, wobble: 0, seed, colorBase: c0, colorTop: c1, faceVar: o.fv ?? 0.07 });
  xf(g, { rot: [-Math.PI / 2, 0, 0], scale: o.squash, pos: o.pos });
  return g;
}
// Tapered piece growing UP (necks, horns, spikes). Optional bend [dx,dz] at the tip.
export function up(len, r0, r1, c0, c1 = c0, seed = 1, o = {}) {
  const g = trunk({ rb: r0, rt: r1, h: len, segs: o.segs ?? 5, rows: o.rows ?? 1, jit: o.jit ?? 0.006, wobble: 0, bend: o.bend || [0, 0], seed, colorBase: c0, colorTop: c1, faceVar: o.fv ?? 0.07 });
  xf(g, { scale: o.squash, pos: o.pos, rot: o.rot });
  return g;
}
export const spike = (r, h, c0, c1, seed = 1, o = {}) => cone({ r, h, segs: o.segs ?? 4, rows: 1, jit: o.jit ?? 0.1, seed, colorBase: c0, colorTop: c1 ?? c0, faceVar: o.fv ?? 0.06, pos: o.pos, rot: o.rot, scale: o.scale });

// ---------------------------------------------------------------------------------------------------------------
// smooth pseudo-noise and random pulses (idle behaviours)
export const sn = (t, s = 0) => 0.5 * Math.sin(t + s * 12.9898) + 0.3 * Math.sin(t * 2.17 + s * 7.13 + 1.3) + 0.2 * Math.sin(t * 4.63 + s * 3.7 + 2.1);
export const ease = (t) => t * t * (3 - 2 * t);
export const easeOutBack = (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// Random one-shot event: returns a 0..1 bell envelope while an event is running; `dir` is random -1..1 per event.
export class Pulse {
  constructor(seed, min, max, dur) { this.r = rng(seed * 7919 + 13); this.min = min; this.max = max; this.dur = dur; this.wait = min + this.r() * (max - min); this.u = -1; this.dir = 1; this.env = 0; }
  update(dt, suppress = false) {
    if (this.u >= 0) { this.u += dt / this.dur; if (this.u >= 1) { this.u = -1; this.wait = this.min + this.r() * (this.max - this.min); } }
    else if (!suppress) { this.wait -= dt; if (this.wait <= 0) { this.u = 0; this.dir = this.r() * 2 - 1; } }
    this.env = this.u >= 0 ? Math.sin(Math.PI * this.u) : 0;
    return this.env;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Two-bone + foot leg with analytic IK in the leg's sagittal plane. Segment meshes hang down (-Y) from hip/knee/ank.
// The IK effector is the ground-contact point (end of the foot bone). `bend` = +1 knee points forward, -1 backward.
export class Leg {
  constructor(parent, x, y, z, l1, l2, l3, bend) {
    this.l1 = l1; this.l2 = l2; this.l3 = l3; this.bend = bend;
    this.hip = new THREE.Group(); this.hip.position.set(x, y, z); parent.add(this.hip);
    this.knee = new THREE.Group(); this.knee.position.y = -l1; this.hip.add(this.knee);
    this.ank = new THREE.Group(); this.ank.position.y = -l2; this.knee.add(this.ank);
    this.hip.rotation.order = 'ZXY';
    this.baseY = y;
    this.reach = l1 + l2 + l3;
  }
  // (dx,dy,dz) contact point relative to the hip joint, in the hip's parent frame. psi = world foot pitch (toe forward +).
  solve(dx, dy, dz, psi) {
    const down = Math.max(-dy, 0.04);
    const alpha = Math.atan2(dx, down);
    const rho = Math.hypot(dx, down);
    let hv = dz - this.l3 * Math.sin(psi), hd = rho - this.l3 * Math.cos(psi);
    const l1 = this.l1, l2 = this.l2;
    let D = Math.hypot(hv, hd);
    if (D > l1 + l2 - 0.003) {   // out of reach: extend fully and re-aim the foot so the toe still lands on the target instead of digging in
      const s = (l1 + l2 - 0.003) / D; hv *= s; hd *= s; D = l1 + l2 - 0.003;
      const ex = dz - hv, ed = rho - hd;   // keep the toe at ground height: the foot bone's vertical drop must equal ed
      psi = clamp(Math.abs(ed) < this.l3 ? Math.sign(ex || 1) * Math.acos(clamp(ed / this.l3, -1, 1)) : Math.atan2(ex, ed), -1.4, 1.55);
    }
    const Dc = clamp(D, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.002);
    const phit = Math.atan2(hv, hd);
    const gam = Math.acos(clamp((l1 * l1 + Dc * Dc - l2 * l2) / (2 * l1 * Dc), -1, 1));
    const p1 = phit + this.bend * gam;
    const kv = l1 * Math.sin(p1), kd = l1 * Math.cos(p1);
    // if the target is out of reach the hock direction is the straight line
    const p2 = D > l1 + l2 - 0.002 ? p1 : Math.atan2(hv - kv, hd - kd);
    this.hip.rotation.set(-p1, 0, alpha);
    this.knee.rotation.x = -(p2 - p1);
    this.ank.rotation.x = -(psi - p2);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Base creature: root/rig hierarchy, per-instance materials, flash/glow/opacity, mode weights, state normalisation.
export const MODES = ['idle', 'wander', 'flee', 'chase', 'stalk', 'circle', 'windup', 'attack', 'recover', 'stunned', 'sleep', 'howl', 'eat', 'hide', 'dead'];

export class CreatureBase {
  // matSpec: { eye: hex|null (glowing eye colour), eyeMin, eyeGain, wing: bool (extra double-sided material) }
  constructor(kind, info, opts = {}, matSpec = {}) {
    this.kind = kind;
    this.seed = (opts.seed ?? 1) | 0;
    const r = rng(this.seed * 2654435 + 17);
    this.rand = r;
    this.size = (opts.scale ?? 1) * (0.92 + r() * 0.16);
    this.tint = new THREE.Color().setRGB(0.93 + r() * 0.14, 0.93 + r() * 0.14, 0.93 + r() * 0.14);
    this.root = new THREE.Group(); this.root.name = 'creature_' + kind;
    this.rig = new THREE.Group(); this.rig.scale.setScalar(this.size); this.root.add(this.rig);
    const sz = this.size;
    this.info = {
      radius: info.radius * sz, height: info.height * sz, length: info.length * sz, eyeHeight: (info.eyeHeight ?? info.height * 0.9) * sz,
      _self: this,
      get headPos() { return this._self._headPos(); },
    };
    this.mats = { body: new THREE.MeshLambertMaterial({ vertexColors: true, color: this.tint, emissive: 0x000000 }) };
    this.mats.body.userData.tint = this.tint.clone();
    this._all = [this.mats.body];
    if (matSpec.wing) { this.mats.wing = new THREE.MeshLambertMaterial({ vertexColors: true, color: this.tint, emissive: 0x000000, side: THREE.DoubleSide }); this._all.push(this.mats.wing); }
    this.eyeBase = matSpec.eye != null ? new THREE.Color(matSpec.eye) : null;
    this.eyeMin = matSpec.eyeMin ?? 0.7; this.eyeGain = matSpec.eyeGain ?? 3.5; this.telGlow = matSpec.telGlow ?? 1;
    if (this.eyeBase) { this.mats.eye = new THREE.MeshBasicMaterial({ color: this.eyeBase.clone().multiplyScalar(this.eyeMin), toneMapped: false }); this._all.push(this.mats.eye); }
    this.flash = 0; this.glow = 0; this.opacity = 1; this._telGlowOn = !!this.eyeBase;
    this.t = 0; this.time = 0;
    this.mw = {}; for (const m of MODES) this.mw[m] = m === 'idle' ? 1 : 0;
    this._hp = new THREE.Vector3();
    this._lastGlow = -1;
    this._pos = new THREE.Vector3(); this._havePos = false; this._mv = 0; // measured local movement along X (crab)
  }
  add(parent, geo, mat = 'body') {
    const m = new THREE.Mesh(geo, this.mats[mat]); m.castShadow = true; m.receiveShadow = false; parent.add(m); return m;
  }
  joint(parent, x = 0, y = 0, z = 0, order = 'YXZ') { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.order = order; parent.add(g); return g; }

  setFlash(v) {
    this.flash = clamp(v, 0, 1);
    for (const m of this._all) if (m.emissive) m.emissive.setRGB(this.flash * 0.75, this.flash * 0.5, this.flash * 0.42);
  }
  setGlow(v) { this.glow = clamp(v, 0, 1); }
  setOpacity(v) {
    this.opacity = clamp(v, 0, 1);
    for (const m of this._all) { const tr = this.opacity < 0.999; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = this.opacity; m.depthWrite = !tr || this.opacity > 0.6; }
  }
  dispose() { for (const m of this._all) m.dispose(); }
  _headPos() {
    const h = this.headJoint || this.rig;
    this.rig.updateMatrixWorld(true);
    h.getWorldPosition(this._hp);
    return this.root.worldToLocal(this._hp);
  }
  _applyGlow(v) {
    if (!this.eyeBase) return;
    v = clamp(v, 0, 1);
    if (Math.abs(v - this._lastGlow) < 1e-3) return;
    this._lastGlow = v;
    this.mats.eye.color.copy(this.eyeBase).multiplyScalar(this.eyeMin + v * this.eyeGain);
  }

  animate(dt, s = {}) {
    dt = clamp(dt || 0, 0, 0.1);
    if (dt <= 0) dt = 1e-4;
    this.time += dt;
    const dead = s.dead != null && s.dead >= 0 ? s.dead : -1;
    const S = {
      speed: Math.max(0, s.speed || 0), maxSpeed: s.maxSpeed > 0 ? s.maxSpeed : (this.defaultMax || 5), mode: dead >= 0 ? 'dead' : (s.mode || 'idle'),
      telegraph: clamp(s.telegraph || 0, 0, 1), attackKind: s.attackKind || 'bite', attackT: clamp(s.attackT || 0, 0, 1), hurt: clamp(s.hurt || 0, 0, 1),
      dead, height: s.height || 0, turn: s.turn || 0, vy: s.vy || 0, grounded: s.grounded !== false, aggro: clamp(s.aggro || 0, 0, 1), lookYaw: s.lookYaw || 0,
    };
    for (const m of MODES) this.mw[m] = damp(this.mw[m], m === S.mode ? 1 : 0, 6, dt);
    // measured local-X motion of the root (used by the crab to know which way it is scuttling)
    const p = this.root.position;
    if (this._havePos) {
      const dx = p.x - this._pos.x, dz = p.z - this._pos.z, yaw = this.root.rotation.y;
      const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      if (Math.abs(lx) > 1e-5) this._mv = Math.sign(lx);
    }
    this._pos.copy(p); this._havePos = true;
    this.tick(dt, S);
    this._applyGlow(Math.max(this.glow, S.telegraph * this.telGlow * (this._telGlowOn ? 1 : 0)));
  }
}

// Smooth every numeric field of T toward target values (frame-rate independent).
export function smoothInto(P, T, lam, dt) {
  const k = 1 - Math.exp(-lam * dt);
  for (const key in T) {
    const v = T[key];
    if (typeof v === 'number') { if (P[key] === undefined) P[key] = v; else P[key] += (v - P[key]) * k; }
    else if (Array.isArray(v)) { if (!P[key]) P[key] = v.slice(); else for (let i = 0; i < v.length; i++) P[key][i] += (v[i] - P[key][i]) * k; }
  }
}

// Thin tapered strut between two points (bones, claws, fingers). Returns geometry with baked colours.
export function strut(a, b, r0, r1, c0, c1 = c0, seed = 1, segs = 4) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const g = trunk({ rb: r0, rt: r1, h: len, segs, rows: 1, jit: 0, wobble: 0, seed, colorBase: c0, colorTop: c1, faceVar: 0.04 });
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, 1, 1)));
  g.computeVertexNormals();
  return g;
}
// Flat double-sided polygon fan (membranes, rags): pts = [[x,y,z],...] around the outline, centre = fan origin. colour fn (x,y,z)->Color|hex.
export function fan(centre, pts, colorFn, jitAmt = 0, seed = 1) {
  const pos = [];
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; pos.push(...centre, ...p, ...q); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (jitAmt) jitter(g, jitAmt, seed);
  g.computeVertexNormals();
  paint(g, colorFn, 0.05, seed);
  return g;
}
export function tris(list, colorFn, seed = 1) {   // list of triangles [[a],[b],[c]]
  const pos = []; for (const t of list) for (const v of t) pos.push(...v);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); paint(g, colorFn, 0.05, seed); return g;
}
