// Pure, deterministic scatter of resource nodes and scenery over the island.
// Every node is placed ON the ground (height sampled from the terrain) and never on steep slopes or in deep water.
import { BIOME, WORLD, LAYOUT } from './worldgen.js';
import { mulberry32, hash2 } from '../engine/rng.js';

const CELL = 3.2;

// per-biome spawn tables: [type, chance per cell, options]
const TABLES = {
  [BIOME.BEACH]: [
    ['tree_palm', 0.13, { maxSlope: 0.5, minH: 0.6, pal: null }], ['rock', 0.014, { pal: 'sand', maxSlope: 0.6 }], ['stone_small', 0.03, {}],
    ['sticks', 0.02, {}], ['bones', 0.004, {}], ['reed', 0.3, { lakeOnly: true }], ['tree_dead', 0.004, {}],
  ],
  [BIOME.MEADOW]: [
    ['tree_oak', 0.10, { maxSlope: 0.6 }], ['tree_pine', 0.05, { maxSlope: 0.6 }], ['bush', 0.08, { decor: true }], ['bush_berry', 0.022, {}],
    ['rock', 0.016, { pal: 'grey' }], ['stone_small', 0.03, {}], ['sticks', 0.03, {}], ['bones', 0.004, {}], ['reed', 0.3, { lakeOnly: true }], ['tree_dead', 0.004, {}],
  ],
  [BIOME.JUNGLE]: [
    ['tree_jungle', 0.52, { maxSlope: 0.65 }], ['fern', 0.2, { decor: true }], ['liana', 0.035, {}], ['bush_berry', 0.012, {}], ['sticks', 0.03, {}],
    ['rock', 0.016, { pal: 'mossy' }], ['stone_small', 0.018, {}], ['tree_dead', 0.006, {}], ['bones', 0.003, {}], ['reed', 0.3, { lakeOnly: true }],
  ],
  [BIOME.ROCK]: [
    ['rock', 0.11, { pal: 'grey', maxSlope: 1.0, big: true }], ['rock', 0.04, { pal: 'brown', maxSlope: 1.0 }], ['tree_pine', 0.05, { maxH: 22, maxSlope: 0.6 }], ['tree_dead', 0.03, { maxSlope: 0.8 }],
    ['ore_iron', 0.02, { minH: 9, maxSlope: 1.0 }], ['stone_small', 0.05, {}], ['bones', 0.007, {}],
  ],
  [BIOME.VOLCANO]: [
    ['rock', 0.09, { pal: 'basalt', maxSlope: 1.0, big: true }], ['tree_dead', 0.03, { maxSlope: 0.8 }], ['ore_obsidian', 0.028, { maxSlope: 1.0 }],
    ['ore_sulfur', 0.03, { maxSlope: 1.0 }], ['stone_small', 0.03, {}], ['bones', 0.004, {}],
  ],
};

export const VARIANTS = { tree_pine: 4, tree_oak: 4, tree_jungle: 4, tree_palm: 4, tree_dead: 3, rock: 3, ore_iron: 2, ore_obsidian: 2, ore_sulfur: 2, bush_berry: 3, bush: 3, fern: 3, liana: 2, reed: 3, bones: 2, sticks: 3, stone_small: 3, crate: 1, barrel: 1, hull: 3 };
const SCALE = {
  tree_pine: [0.85, 1.35], tree_oak: [0.85, 1.3], tree_jungle: [0.85, 1.35], tree_palm: [0.85, 1.25], tree_dead: [0.8, 1.3], rock: [0.6, 1.6], ore_iron: [0.9, 1.3], ore_obsidian: [0.9, 1.3],
  ore_sulfur: [0.9, 1.3], bush_berry: [0.85, 1.2], bush: [0.7, 1.5], fern: [0.8, 1.5], liana: [0.9, 1.3], reed: [0.8, 1.3], bones: [0.9, 1.1], sticks: [0.9, 1.1], stone_small: [0.9, 1.2],
};
const RADIUS = { tree_pine: 1.1, tree_oak: 1.6, tree_jungle: 1.7, tree_palm: 1.0, tree_dead: 0.9, rock: 1.4, ore_iron: 1.4, ore_obsidian: 1.4, ore_sulfur: 1.4, bush_berry: 0.9, bush: 0.8, fern: 0.5, liana: 0.9, reed: 0.4, bones: 0.5, sticks: 0.4, stone_small: 0.4 };

export function generateNodes(world, seed = world.seed) {
  const rng = mulberry32(seed ^ 0x51ed);
  const nodes = [];
  const taken = new Map();                            // coarse spacing hash
  const half = WORLD.half - 6;
  const spawn = world.spawn;
  const spacingOk = (x, z, r) => {
    const cx = Math.floor(x / 4), cz = Math.floor(z / 4);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const arr = taken.get((cx + dx) * 4099 + cz + dz);
      if (!arr) continue;
      for (const o of arr) if (Math.hypot(o.x - x, o.z - z) < (o.r + r) * 0.7) return false;
    }
    return true;
  };
  const reserve = (x, z, r) => { const k = Math.floor(x / 4) * 4099 + Math.floor(z / 4); (taken.get(k) || taken.set(k, []).get(k)).push({ x, z, r }); };
  let id = 0;
  const push = (type, x, z, o = {}) => {
    const y = world.getHeight(x, z);
    const sc = SCALE[type] || [1, 1];
    let s = sc[0] + (sc[1] - sc[0]) * rng();
    if (o.big && rng() < 0.4) s *= 1.7;
    const node = {
      id: id++, type, variant: (rng() * (VARIANTS[type] || 1)) | 0, pal: o.pal || null, x, y, z,
      yaw: rng() * Math.PI * 2, scale: s, tilt: [(rng() - 0.5) * 0.12, (rng() - 0.5) * 0.12],
      tint: 0.86 + rng() * 0.28, tintH: (rng() - 0.5) * 0.06, decor: !!o.decor, gone: false, hp: 0, loot: null,
    };
    if (type.startsWith('rock') || type.startsWith('ore')) node.tilt = [(rng() - 0.5) * 0.35, (rng() - 0.5) * 0.35];
    nodes.push(node);
    return node;
  };

  for (let cz = -half; cz < half; cz += CELL) {
    for (let cx = -half; cx < half; cx += CELL) {
      const gx = Math.floor((cx + 512) / CELL), gz = Math.floor((cz + 512) / CELL);
      const x = cx + hash2(gx, gz, seed + 1) * CELL, z = cz + hash2(gx, gz, seed + 2) * CELL;
      const biome = world.getBiome(x, z);
      if (biome === BIOME.WATER) {
        // reeds and marsh plants along fresh-water shores
        continue;
      }
      const h = world.getHeight(x, z);
      if (h < -0.2) continue;
      const slope = world.getSlope(x, z);
      if (Math.hypot(x - spawn.x, z - spawn.z) < 9) continue;                          // keep the landing spot clear
      const table = TABLES[biome];
      if (!table) continue;
      const roll = hash2(gx, gz, seed + 3);
      let acc = 0;
      for (const [type, chance, o] of table) {
        acc += chance;
        if (roll >= acc) continue;
        if (o.maxSlope !== undefined && slope > o.maxSlope) break;
        if (slope > 1.05) break;
        if (o.minH !== undefined && h < o.minH) break;
        if (o.maxH !== undefined && h > o.maxH) break;
        if (o.lakeOnly) {
          let near = false;
          for (let a = 0; a < 6.28 && !near; a += 1.05) if (world.isLake(x + Math.cos(a) * 4.2, z + Math.sin(a) * 4.2)) near = true;
          if (!near || h < 0.05) break;
        }
        const r = RADIUS[type] ?? 0.6;
        if (!spacingOk(x, z, r)) break;
        reserve(x, z, r);
        push(type, x, z, o);
        break;
      }
    }
  }

  // --- shipwrecks along the coast ------------------------------------------------------------------
  const wrecks = [];
  const tryWreck = (x0, z0, forceStarter) => {
    // walk toward the sea until water depth ~ 0.5, place hull half in the surf
    for (let attempt = 0; attempt < 200; attempt++) {
      const a = rng() * Math.PI * 2, d = attempt * 0.25;
      const x = x0 + Math.cos(a) * d, z = z0 + Math.sin(a) * d;
      const h = world.getHeight(x, z);
      if (h > -0.8 && h < 0.7 && world.getSlope(x, z) < 0.25 && world.getBiome(x, z) !== BIOME.ROCK) {
        wrecks.push({ x, z, forceStarter });
        return true;
      }
    }
    return false;
  };
  tryWreck(spawn.x + 14, spawn.z + 6, true);
  // spread a few more around the coast
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + rng() * 0.6;
    for (let r = 230; r > 60; r -= 2) {
      const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
      if (world.getHeight(x, z) > -0.4) { tryWreck(x, z, false); break; }
    }
  }
  let firstCrate = true;
  for (const w of wrecks) {
    const hullNode = push('hull', w.x, w.z, {});
    hullNode.scale = 1; hullNode.tilt = [(rng() - 0.5) * 0.12, (rng() - 0.5) * 0.4]; hullNode.yaw = rng() * Math.PI * 2;
    hullNode.y = world.getHeight(w.x, w.z) - 0.35;
    hullNode.decor = false;
    const n = 1 + ((rng() * 2) | 0);
    for (let k = 0; k < n; k++) {
      const a = rng() * Math.PI * 2, d = 2.2 + rng() * 3;
      const px = w.x + Math.cos(a) * d, pz = w.z + Math.sin(a) * d;
      if (world.getHeight(px, pz) < -0.3) continue;
      const c = push(rng() < 0.65 ? 'crate' : 'barrel', px, pz, {});
      c.scale = 1; c.tilt = [(rng() - 0.5) * 0.2, (rng() - 0.5) * 0.2];
      c.loot = (firstCrate && w.forceStarter) ? 'starter' : 'wreck';
      if (firstCrate && w.forceStarter) { c.type = 'crate'; firstCrate = false; }
    }
  }
  return nodes;
}
