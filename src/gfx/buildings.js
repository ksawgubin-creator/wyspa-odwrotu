// Procedural base-building models for "Wyspa Odwrotu": hand-built, crooked, weathered, with damage stages.
// Conventions (see also src/gfx/buildings/kit.js):
//  * buildModel(type, opts) -> THREE.Group. Origin = footprint centre ON the ground (y = 0 is the surface),
//    local +Z = FRONT (door/opening side), +Y up. Geometry reaches down to y ~ -1 (buried foundation).
//  * opts: { seed, damage 0..3, state, growth 0..1, lit }. Geometry is cached by (type, seed%6, damage, state, growth bucket)
//    and shared between instances; the shared material is mats.prop (vertex colours). Build is lazy, on first request.
//  * Glowing parts (coals, furnace mouth, forge seams, lantern) live in a SEPARATE small mesh using an unlit vertex-coloured
//    material; the meshes are listed in group.userData.glow (visible = opts.lit) and the tint in userData.glowColor.
//  * Colliders (group-local): {kind:'box', x, z, hw, hd, rot} (rot = rotation about +Y, same sense as Object3D.rotation.y,
//    hw/hd half extents along the box's own X/Z) and {kind:'circle', x, z, r}. Door gaps are left open.
//  * Damage 0..3 regenerates geometry: pieces are removed/tilted deterministically from the seed, so a piece that is gone
//    at damage k stays gone at k+1; higher stages add rubble at the base and darker/cracked/scorched colouring.
//  * Only imports: three, meshkit (through kit.js), materials.
import * as THREE from 'three';
import { mats } from './materials.js';
import { merge, makeDmg, weather, rng, stone, log, beam, rubble, PAL, pick, frand, TAU } from './buildings/kit.js';
import { builders as fireB } from './buildings/fire.js';
import { builders as shelterB } from './buildings/shelter.js';
import { builders as fortB } from './buildings/fort.js';
import { builders as trapB } from './buildings/traps.js';
import { builders as stationB } from './buildings/stations.js';

const BUILDERS = { ...fireB, ...shelterB, ...fortB, ...trapB, ...stationB };

// name = Polish display name, line = tech line, mat = dominant material (debris), dmg = supports damage stages.
export const BUILDING_TYPES = {
  campfire:      { name: 'Ognisko', line: 'fire', size: { w: 1.0, d: 1.0, h: 0.45 }, mat: 'mixed', dmg: false },
  hearth:        { name: 'Palenisko', line: 'fire', size: { w: 1.7, d: 1.7, h: 1.8 }, mat: 'mixed', dmg: false },
  great_fire:    { name: 'Wielkie ognisko', line: 'fire', size: { w: 2.8, d: 2.8, h: 1.6 }, mat: 'mixed', dmg: false },
  leanto:        { name: 'Szałas', line: 'shelter', size: { w: 3.2, d: 3.0, h: 2.3 }, mat: 'wood', dmg: true },
  wooden_hut:    { name: 'Drewniana chata', line: 'shelter', size: { w: 5, d: 5, h: 3.2 }, mat: 'wood', dmg: true },
  stone_house:   { name: 'Kamienny dom', line: 'shelter', size: { w: 6, d: 6, h: 3.8 }, mat: 'stone', dmg: true },
  palisade_wall: { name: 'Palisada', line: 'wall', size: { w: 2.0, d: 0.5, h: 2.8 }, mat: 'wood', dmg: true },
  stone_wall:    { name: 'Kamienny mur', line: 'wall', size: { w: 2.0, d: 0.8, h: 2.6 }, mat: 'stone', dmg: true },
  spike_wall:    { name: 'Mur z kolcami', line: 'wall', size: { w: 2.0, d: 1.0, h: 2.8 }, mat: 'stone', dmg: true },
  gate:          { name: 'Brama', line: 'wall', size: { w: 2.6, d: 0.6, h: 3.0 }, mat: 'wood', dmg: true, states: ['closed', 'open'] },
  watchtower:    { name: 'Wieża strażnicza', line: 'wall', size: { w: 3.0, d: 3.0, h: 6.8 }, mat: 'wood', dmg: true },
  spike_trap:    { name: 'Pułapka z kolcami', line: 'trap', size: { w: 1.5, d: 1.5, h: 0.5 }, mat: 'wood', dmg: false },
  snare:         { name: 'Sidła', line: 'trap', size: { w: 1.0, d: 1.0, h: 0.8 }, mat: 'wood', dmg: false },
  pit_trap:      { name: 'Dół z palami', line: 'trap', size: { w: 1.8, d: 1.8, h: 0.5 }, mat: 'wood', dmg: false, states: ['open', 'covered'] },
  bear_trap:     { name: 'Wnyki na niedźwiedzia', line: 'trap', size: { w: 0.9, d: 0.9, h: 0.3 }, mat: 'iron', dmg: false, states: ['armed', 'sprung'] },
  workbench:     { name: 'Stół warsztatowy', line: 'station', size: { w: 1.9, d: 0.9, h: 1.05 }, mat: 'wood', dmg: true },
  furnace:       { name: 'Piec', line: 'station', size: { w: 1.7, d: 1.7, h: 1.9 }, mat: 'stone', dmg: false },
  forge:         { name: 'Kuźnia obsydianowa', line: 'station', size: { w: 2.0, d: 2.0, h: 2.1 }, mat: 'stone', dmg: false },
  alchemy:       { name: 'Stół alchemiczny', line: 'station', size: { w: 1.5, d: 0.9, h: 1.2 }, mat: 'wood', dmg: false },
  chest:         { name: 'Skrzynia', line: 'station', size: { w: 0.95, d: 0.65, h: 0.7 }, mat: 'wood', dmg: true, states: ['closed', 'open'] },
  drying_rack:   { name: 'Suszarka do mięsa', line: 'station', size: { w: 1.8, d: 0.7, h: 1.7 }, mat: 'wood', dmg: false },
  rain_barrel:   { name: 'Zbiornik na deszczówkę', line: 'station', size: { w: 1.0, d: 1.0, h: 1.3 }, mat: 'wood', dmg: false },
  garden:        { name: 'Ogródek', line: 'station', size: { w: 2.4, d: 2.4, h: 0.9 }, mat: 'wood', dmg: false },
  bed:           { name: 'Łóżko', line: 'furniture', size: { w: 1.1, d: 2.0, h: 0.6 }, mat: 'wood', dmg: false },
  lantern_post:  { name: 'Latarnia', line: 'furniture', size: { w: 0.5, d: 0.5, h: 2.4 }, mat: 'wood', dmg: false },
};

// Guidance only: hit points per damage-free structure and rough "build cost" hints for game code.
export const BUILDING_INFO = {
  campfire: { maxHp: 40 }, hearth: { maxHp: 90 }, great_fire: { maxHp: 160 },
  leanto: { maxHp: 120 }, wooden_hut: { maxHp: 450 }, stone_house: { maxHp: 1100 },
  palisade_wall: { maxHp: 220 }, stone_wall: { maxHp: 520 }, spike_wall: { maxHp: 600 }, gate: { maxHp: 320 }, watchtower: { maxHp: 700 },
  spike_trap: { maxHp: 60 }, snare: { maxHp: 20 }, pit_trap: { maxHp: 40 }, bear_trap: { maxHp: 80 },
  workbench: { maxHp: 140 }, furnace: { maxHp: 260 }, forge: { maxHp: 420 }, alchemy: { maxHp: 100 }, chest: { maxHp: 90 },
  drying_rack: { maxHp: 60 }, rain_barrel: { maxHp: 70 }, garden: { maxHp: 80 }, bed: { maxHp: 50 }, lantern_post: { maxHp: 40 },
};

export const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
const GLOW_COLOR = 0xff7a24;

const cache = new Map();
const typeIdx = (t) => Object.keys(BUILDING_TYPES).indexOf(t) + 1;

function make(type, seed, level, opts) {
  const def = BUILDERS[type];
  const B = {
    type, seed, level, state: opts.state, growth: opts.growth ?? 1, lit: !!opts.lit,
    r: rng(seed * 7717 + typeIdx(type) * 131 + 5), D: makeDmg(seed * 31 + typeIdx(type), level),
    parts: [], glow: [], colliders: [], interact: {}, size: { ...BUILDING_TYPES[type].size }, fireAnchor: null, platform: null,
    label: 'misc', stats: {},
    add(...g) { for (const x of g.flat()) if (x) { this.parts.push(x); this.stats[this.label] = (this.stats[this.label] || 0) + x.getAttribute('position').count / 3; } }, addGlow(...g) { for (const x of g.flat()) if (x) this.glow.push(x); },
    box(x, z, hw, hd, rot = 0) { this.colliders.push({ kind: 'box', x, z, hw, hd, rot }); },
    circle(x, z, r) { this.colliders.push({ kind: 'circle', x, z, r }); },
  };
  def(B);
  const geo = merge(B.parts);
  weather(geo, level, seed * 13 + typeIdx(type), { scorch: type !== 'furnace' && type !== 'forge' });
  const glowGeo = B.glow.length ? merge(B.glow) : null;
  geo.computeBoundingBox();
  return { geo, glowGeo, tris: geo.getAttribute('position').count / 3 + (glowGeo ? glowGeo.getAttribute('position').count / 3 : 0), meta: B };
}

export function buildModel(type, opts = {}) {
  if (!BUILDERS[type]) throw new Error('unknown building type: ' + type);
  const info = BUILDING_TYPES[type];
  const seed = (((opts.seed | 0) % 6) + 6) % 6;
  const level = info.dmg ? Math.max(0, Math.min(3, opts.damage | 0)) : 0;
  const state = opts.state ?? (info.states ? info.states[0] : '');
  const gb = type === 'garden' ? Math.round(Math.max(0, Math.min(1, opts.growth ?? 1)) * 5) : 0;
  const key = `${type}|${seed}|${level}|${state}|${gb}`;
  let e = cache.get(key);
  if (!e) { e = make(type, seed, level, { ...opts, state, growth: gb / 5 }); cache.set(key, e); }
  const m = e.meta, g = new THREE.Group();
  g.name = 'building:' + type;
  const mesh = new THREE.Mesh(e.geo, mats.prop); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh);
  const glow = [];
  if (e.glowGeo) { const gm = new THREE.Mesh(e.glowGeo, glowMaterial); gm.visible = !!opts.lit; gm.castShadow = false; gm.receiveShadow = false; g.add(gm); glow.push(gm); }
  g.userData = {
    type, size: { ...m.size }, colliders: m.colliders.map((c) => ({ ...c })), interact: JSON.parse(JSON.stringify(m.interact)),
    glow, glowColor: GLOW_COLOR, tris: e.tris, stats: m.stats, damage: level, state, seed,
  };
  if (m.fireAnchor) g.userData.fireAnchor = new THREE.Vector3(...m.fireAnchor);
  if (m.platform) g.userData.platform = { ...m.platform };
  return g;
}

// --- debris: a few small broken fragments (<= 12 pieces, merged into a single mesh) ------------------------------
const dcache = new Map();
export function buildDebris(type, seed = 0) {
  const s = (((seed | 0) % 6) + 6) % 6, key = type + '|' + s;
  let geo = dcache.get(key);
  if (!geo) {
    const info = BUILDING_TYPES[type] || { mat: 'wood' }, parts = [], n = 8 + (frand(s, 1) * 4 | 0);
    const kind = (i) => info.mat === 'stone' ? 'stone' : info.mat === 'iron' ? (i % 2 ? 'plank' : 'stone') : info.mat === 'mixed' ? (i % 2 ? 'stone' : 'log') : (i % 3 === 0 ? 'log' : 'plank');
    for (let i = 0; i < n; i++) rubble(parts, { cx: (frand(s, i, 3) - 0.5) * 1.2, cz: (frand(s, i, 4) - 0.5) * 1.2, n: 1, spread: 0.1, seed: s * 50 + i * 3 + typeIdx(type), kind: kind(i), size: 0.2 + frand(s, i, 5) * 0.16 });
    geo = merge(parts); dcache.set(key, geo);
  }
  const g = new THREE.Group(); g.name = 'debris:' + type;
  const m = new THREE.Mesh(geo, mats.prop); m.castShadow = true; m.receiveShadow = true; g.add(m);
  return g;
}
