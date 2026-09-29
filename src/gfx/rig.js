// Procedural low-poly humanoid built from jittered primitives on an articulated joint hierarchy.
// Character faces +Z; its right side is -X. Joint rotations are driven by src/player/anim.js.
import * as THREE from 'three';
import { blob, trunk, merge, xf, paint, col, jitter } from './meshkit.js';
import { mats } from './materials.js';

export const JOINTS = ['hips', 'spine', 'chest', 'head', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR', 'wrR'];
export const JI = Object.fromEntries(JOINTS.map((n, i) => [n, i]));

const flipDown = (g) => xf(g, { rot: [Math.PI, 0, 0] });

// Geometry cache keyed by palette so several NPCs can share it.
const geoCache = new Map();
function make(name, key, fn) { const k = name + key; if (!geoCache.has(k)) geoCache.set(k, fn()); return geoCache.get(k); }

export const DEFAULT_LOOK = { skin: 0xd8a273, hair: 0x33251b, shirt: 0x6f8fa3, pants: 0x5b4a39, boots: 0x2c231d, accent: 0xb5432f, belt: 0x46331f, pack: 0x7a5a36 };

export class HumanRig {
  constructor(look = {}) {
    this.look = { ...DEFAULT_LOOK, ...look };
    const L = this.look, key = JSON.stringify(L);
    this.root = new THREE.Group();
    this.pivot = new THREE.Group(); this.pivot.position.y = 0.9; this.root.add(this.pivot);       // whole-body rotation centre (rolls, falls)
    this.body = new THREE.Group(); this.body.position.y = -0.9; this.pivot.add(this.body);
    const mk = (parent, x, y, z) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
    const J = this.joints = {};
    J.hips = mk(this.body, 0, 0.95, 0);
    J.spine = mk(J.hips, 0, 0.04, 0);
    J.chest = mk(J.spine, 0, 0.26, 0);
    const neck = mk(J.chest, 0, 0.4, 0);
    J.head = mk(neck, 0, 0.06, 0);
    J.shL = mk(J.chest, 0.245, 0.33, 0); J.elL = mk(J.shL, 0, -0.29, 0);
    J.shR = mk(J.chest, -0.245, 0.33, 0); J.elR = mk(J.shR, 0, -0.29, 0); J.wrR = mk(J.elR, 0, -0.27, 0);
    J.hipL = mk(J.hips, 0.11, -0.02, 0); J.knL = mk(J.hipL, 0, -0.45, 0);
    J.hipR = mk(J.hips, -0.11, -0.02, 0); J.knR = mk(J.hipR, 0, -0.45, 0);
    for (const n of JOINTS) J[n].rotation.order = n.startsWith('sh') ? 'YXZ' : 'XYZ';
    this.sockets = { handR: mk(J.wrR, 0, 0, 0), handL: mk(J.elL, 0, -0.27, 0), back: mk(J.chest, 0, 0.2, -0.17), head: mk(J.head, 0, 0.1, 0) };

    const add = (parent, geo, shadow = true) => { const m = new THREE.Mesh(geo, mats.prop); m.castShadow = shadow; m.receiveShadow = false; parent.add(m); return m; };
    const shirt = L.shirt, sk = L.skin;
    // pelvis + abdomen + chest
    add(J.hips, make('pelvis', key, () => merge([
      blob({ r: 0.17, detail: 1, jit: 0.06, seed: 1, squash: [1.08, 0.75, 0.82], pos: [0, 0.0, 0], color: L.pants }),
      trunk({ rb: 0.185, rt: 0.185, h: 0.06, segs: 8, rows: 1, jit: 0.004, seed: 2, pos: [0, 0.1, 0], colorBase: L.belt, colorTop: L.belt, faceVar: 0.05 }),
    ])));
    add(J.spine, make('abdomen', key, () => merge([
      xf(trunk({ rb: 0.165, rt: 0.175, h: 0.3, segs: 8, rows: 2, jit: 0.012, wobble: 0.01, seed: 3, pos: [0, -0.02, 0], colorBase: shirt, colorTop: shirt, faceVar: 0.07 }), { scale: [1.05, 1, 0.82] }),
    ])));
    add(J.chest, make('chest', key, () => merge([
      xf(trunk({ rb: 0.19, rt: 0.235, h: 0.36, segs: 8, rows: 2, jit: 0.014, wobble: 0.008, seed: 4, colorBase: shirt, colorTop: col(shirt).lerp(col(0xffffff), 0.08).getHex(), faceVar: 0.07 }), { scale: [1.12, 1, 0.78] }),
      blob({ r: 0.11, detail: 1, jit: 0.1, seed: 5, squash: [1.2, 0.6, 0.9], pos: [0.2, 0.34, 0], color: shirt }),
      blob({ r: 0.11, detail: 1, jit: 0.1, seed: 6, squash: [1.2, 0.6, 0.9], pos: [-0.2, 0.34, 0], color: shirt }),
      // tattered hem / torn cloth accents
      blob({ r: 0.05, detail: 0, jit: 0.3, seed: 7, squash: [1.4, 0.7, 0.4], pos: [0.1, -0.05, 0.17], color: col(shirt).multiplyScalar(0.8).getHex() }),
      blob({ r: 0.05, detail: 0, jit: 0.3, seed: 8, squash: [1.4, 0.7, 0.4], pos: [-0.12, -0.06, 0.16], color: col(shirt).multiplyScalar(0.75).getHex() }),
    ])));
    // backpack (readable from behind the shoulder cam)
    add(this.sockets.back, make('pack', key, () => merge([
      blob({ r: 0.2, detail: 1, jit: 0.12, seed: 9, squash: [0.95, 1.05, 0.65], pos: [0, 0.0, -0.06], color: L.pack }),
      blob({ r: 0.13, detail: 1, jit: 0.12, seed: 10, squash: [1.0, 0.6, 0.7], pos: [0, -0.16, -0.14], color: col(L.pack).multiplyScalar(0.85).getHex() }),
      blob({ r: 0.09, detail: 1, jit: 0.12, seed: 11, squash: [1.4, 0.7, 0.8], pos: [0, 0.2, -0.03], color: col(L.pack).multiplyScalar(1.15).getHex() }),
    ])));
    // neck + head
    add(J.head, make('head', key, () => merge([
      trunk({ rb: 0.06, rt: 0.055, h: 0.1, segs: 6, rows: 1, jit: 0.004, seed: 12, pos: [0, -0.08, 0], colorBase: sk, colorTop: sk }),
      blob({ r: 0.155, detail: 1, jit: 0.05, seed: 13, squash: [0.92, 1.04, 0.98], pos: [0, 0.14, 0], color: (x, y) => col(sk).lerp(col(0xf0c090), Math.max(0, y - 0.12) * 0.4) }),
      blob({ r: 0.028, detail: 0, jit: 0.1, seed: 14, squash: [0.9, 1.1, 1], pos: [0, 0.12, 0.15], color: col(sk).multiplyScalar(0.94).getHex() }),                 // nose
      blob({ r: 0.026, detail: 0, jit: 0.05, seed: 15, pos: [0.055, 0.17, 0.135], color: 0x1b1512 }), blob({ r: 0.026, detail: 0, jit: 0.05, seed: 16, pos: [-0.055, 0.17, 0.135], color: 0x1b1512 }),
      blob({ r: 0.165, detail: 1, jit: 0.1, seed: 17, squash: [1.02, 0.7, 1.05], pos: [0, 0.22, -0.03], color: L.hair, faceVar: 0.1 }),                      // hair cap
      blob({ r: 0.1, detail: 1, jit: 0.15, seed: 18, squash: [1.1, 0.9, 0.8], pos: [0, 0.14, -0.13], color: L.hair, faceVar: 0.1 }),                       // hair back
      trunk({ rb: 0.16, rt: 0.16, h: 0.045, segs: 8, rows: 1, jit: 0.006, seed: 19, pos: [0, 0.2, -0.005], colorBase: L.accent, colorTop: L.accent }),         // bandana
      blob({ r: 0.045, detail: 0, jit: 0.3, seed: 20, squash: [1.2, 0.5, 1.6], pos: [0.02, 0.19, -0.19], color: L.accent }),
    ])));
    // arms & legs (built for the left side then mirrored by geometry x flip for the right)
    const arm = (side, s) => {
      const up = flipDown(trunk({ rb: 0.07, rt: 0.085, h: 0.3, segs: 6, rows: 2, jit: 0.006, wobble: 0.005, seed: 21 + s, colorBase: shirt, colorTop: shirt, faceVar: 0.06 }));
      return merge([up, blob({ r: 0.085, detail: 1, jit: 0.06, seed: 24, pos: [0, 0, 0], color: shirt })]);
    };
    const forearm = (s) => merge([
      flipDown(trunk({ rb: 0.052, rt: 0.062, h: 0.28, segs: 6, rows: 2, jit: 0.005, wobble: 0.004, seed: 25 + s, colorBase: sk, colorTop: col(sk).multiplyScalar(0.96).getHex(), faceVar: 0.05 })),
      blob({ r: 0.058, detail: 1, jit: 0.08, seed: 26, squash: [0.9, 1.1, 1], pos: [0, -0.3, 0], color: sk }),
      blob({ r: 0.05, detail: 0, jit: 0.1, seed: 27, pos: [0.0, -0.24, 0.02], squash: [1.1, 0.7, 1], color: col(0xe8dcc0).getHex() }),
    ]);
    add(J.shL, make('armL', key, () => arm('L', 0))); add(J.elL, make('foreL', key, () => forearm(0)));
    add(J.shR, make('armR', key, () => arm('R', 1))); add(J.elR, make('foreR', key, () => forearm(1)));
    const thigh = (s) => flipDown(trunk({ rb: 0.088, rt: 0.11, h: 0.46, segs: 7, rows: 2, jit: 0.008, wobble: 0.006, seed: 30 + s, colorBase: L.pants, colorTop: L.pants, faceVar: 0.07 }));
    const shin = (s) => merge([
      flipDown(trunk({ rb: 0.062, rt: 0.082, h: 0.44, segs: 7, rows: 2, jit: 0.007, wobble: 0.005, seed: 34 + s, colorBase: L.pants, colorTop: L.pants, faceVar: 0.07 })),
      xf(flipDown(trunk({ rb: 0.083, rt: 0.07, h: 0.2, segs: 7, rows: 1, jit: 0.006, seed: 36, colorBase: L.boots, colorTop: L.boots, faceVar: 0.05 })), { pos: [0, -0.26, 0] }),
      blob({ r: 0.085, detail: 1, jit: 0.07, seed: 38, squash: [0.95, 0.65, 1.75], pos: [0, -0.43, 0.06], color: L.boots }),
    ]);
    add(J.hipL, make('thighL', key, () => thigh(0))); add(J.knL, make('shinL', key, () => shin(0)));
    add(J.hipR, make('thighR', key, () => thigh(1))); add(J.knR, make('shinR', key, () => shin(1)));
    this.heldMesh = null; this.heldId = null;
    this.tmpQ = new THREE.Quaternion();
  }

  // Attach a held item model to a hand (id null = empty). Bows go to the left hand, everything else to the right.
  setHeld(id, geometry, extra = null, hand = 'R') {
    if (this.heldId === id && this.heldHand === hand) return;
    this.heldId = id; this.heldHand = hand;
    if (this.heldMesh) { this.heldMesh.parent?.remove(this.heldMesh); this.heldMesh = null; }
    if (!geometry) return;
    const g = new THREE.Group();
    const m = new THREE.Mesh(geometry, mats.prop); m.castShadow = true;
    g.add(m);
    if (extra) g.add(extra);
    if (hand === 'L') { g.rotation.set(Math.PI / 2, 0, 0); g.position.set(0, -0.02, 0.02); this.sockets.handL.add(g); }
    else { g.position.set(0, -0.02, 0.0); this.sockets.handR.add(g); }       // blade direction is steered by the wrist joint (wrR)
    this.heldMesh = g;
  }

  // Armour is drawn on the body: a set of extra meshes on the chest / shoulders / legs (removed with setArmor(null)).
  setArmor(id) {
    for (const m of this.armorMeshes || []) m.parent?.remove(m);
    this.armorMeshes = [];
    if (!id) return;
    const J = this.joints;
    const LOOK = {
      hide_armor: { main: 0x8a5f38, alt: 0x5e3f24, trim: 0x2e2118, metal: false },
      iron_armor: { main: 0x9aa2ac, alt: 0x6c747e, trim: 0x3a3f46, metal: true },
      obsidian_armor: { main: 0x2a2140, alt: 0x171226, trim: 0xd9622a, metal: true },
    }[id];
    if (!LOOK) return;
    const add = (parent, geo) => { const m = new THREE.Mesh(geo, mats.prop); m.castShadow = true; parent.add(m); this.armorMeshes.push(m); return m; };
    const key = 'armor' + id;
    add(J.chest, make('achest', key, () => merge([
      xf(trunk({ rb: 0.2, rt: 0.25, h: 0.34, segs: 8, rows: 2, jit: LOOK.metal ? 0.008 : 0.016, wobble: 0.006, seed: 41, pos: [0, 0.01, 0], colorBase: LOOK.main, colorTop: LOOK.alt, faceVar: 0.09 }), { scale: [1.15, 1, 0.84] }),
      blob({ r: 0.15, detail: 1, jit: 0.1, seed: 42, squash: [1.15, 0.6, 1.0], pos: [0.27, 0.34, 0], color: LOOK.main, faceVar: 0.1 }),
      blob({ r: 0.15, detail: 1, jit: 0.1, seed: 43, squash: [1.15, 0.6, 1.0], pos: [-0.27, 0.34, 0], color: LOOK.main, faceVar: 0.1 }),
      trunk({ rb: 0.235, rt: 0.235, h: 0.05, segs: 8, rows: 1, jit: 0.004, seed: 44, pos: [0, 0.06, 0], colorBase: LOOK.trim, colorTop: LOOK.trim }),
    ])));
    add(J.spine, make('aabd', key, () => merge([
      xf(trunk({ rb: 0.19, rt: 0.2, h: 0.24, segs: 8, rows: 1, jit: 0.01, seed: 45, pos: [0, -0.02, 0], colorBase: LOOK.alt, colorTop: LOOK.main }), { scale: [1.08, 1, 0.86] }),
    ])));
    if (id !== 'hide_armor') {
      for (const s of ['L', 'R']) {
        add(J['hip' + s], make('athigh' + s, key, () => xf(trunk({ rb: 0.098, rt: 0.118, h: 0.3, segs: 7, rows: 1, jit: 0.006, seed: 46, pos: [0, 0, 0], colorBase: LOOK.alt, colorTop: LOOK.main }), { rot: [Math.PI, 0, 0] })));
        add(J['kn' + s], make('ashin' + s, key, () => merge([xf(trunk({ rb: 0.075, rt: 0.09, h: 0.26, segs: 7, rows: 1, jit: 0.006, seed: 47, colorBase: LOOK.alt, colorTop: LOOK.main }), { rot: [Math.PI, 0, 0], pos: [0, -0.12, 0] })])));
        add(J['el' + s], make('abr' + s, key, () => xf(trunk({ rb: 0.058, rt: 0.066, h: 0.16, segs: 6, rows: 1, jit: 0.005, seed: 48, colorBase: LOOK.alt, colorTop: LOOK.main }), { rot: [Math.PI, 0, 0], pos: [0, -0.06, 0] })));
      }
      add(J.head, make('ahelm', key, () => merge([blob({ r: 0.172, detail: 1, jit: 0.03, seed: 49, squash: [1.0, 0.72, 1.06], pos: [0, 0.23, -0.01], color: LOOK.main, faceVar: 0.06 }), trunk({ rb: 0.18, rt: 0.18, h: 0.035, segs: 8, rows: 1, jit: 0.003, seed: 50, pos: [0, 0.2, 0], colorBase: LOOK.trim, colorTop: LOOK.trim })])));
    } else {
      for (const s of ['L', 'R']) add(J['el' + s], make('abrh' + s, key, () => xf(trunk({ rb: 0.062, rt: 0.07, h: 0.14, segs: 6, rows: 1, jit: 0.01, seed: 48, colorBase: LOOK.alt, colorTop: LOOK.main }), { rot: [Math.PI, 0, 0], pos: [0, -0.06, 0] })));
    }
  }

  // Apply a pose: Float32Array-like [3 * JOINTS.length] plus body offsets.
  apply(p) {
    for (let i = 0; i < JOINTS.length; i++) this.joints[JOINTS[i]].rotation.set(p.rot[i * 3], p.rot[i * 3 + 1], p.rot[i * 3 + 2]);
    this.body.position.set(p.ox, -0.9 + p.oy, p.oz);
    this.pivot.rotation.set(p.pitch, p.pyaw || 0, p.roll);
    this.pivot.position.y = 0.9 + (p.pivotY || 0);
  }
}
