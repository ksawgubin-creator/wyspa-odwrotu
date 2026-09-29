// Creature definitions. ALL numbers are ROBOCZE (working values to tune after playtests).
// speeds in m/s, times in s, damage in HP. `night`: how the species changes after dusk.
// drops: [{item,min,max,chance}]; xp: awarded on kill; slots: how many habitat slots to create over the island.
import { BIOME } from '../src/world/worldgen.js';

export const ANIMALS = {
  rabbit: {
    name: 'Królik', brain: 'prey', hp: 10, radius: 0.25, height: 0.4, walk: 1.4, run: 7.8, turn: 12, alert: 11, safe: 20,
    biomes: [BIOME.MEADOW, BIOME.BEACH, BIOME.JUNGLE], slots: 26, group: [1, 3], respawn: 240, xp: 3,
    drops: [{ item: 'raw_meat', min: 1, max: 1 }, { item: 'hide', min: 1, max: 1, chance: 0.6 }, { item: 'bone', min: 0, max: 1, chance: 0.3 }],
    night: 'hide', sound: 'squeal',
  },
  goat: {
    name: 'Kozica', brain: 'prey', hp: 26, radius: 0.4, height: 0.9, walk: 1.8, run: 9.5, turn: 9, alert: 16, safe: 30, leaps: true,
    biomes: [BIOME.ROCK, BIOME.VOLCANO], slots: 12, group: [1, 3], respawn: 300, xp: 8,
    drops: [{ item: 'raw_meat', min: 2, max: 3 }, { item: 'hide', min: 1, max: 2 }, { item: 'bone', min: 1, max: 2, chance: 0.7 }, { item: 'sinew', min: 0, max: 1, chance: 0.5 }],
    night: 'vanish', sound: 'squeal',
  },
  boar: {
    name: 'Dzik', brain: 'boar', hp: 70, radius: 0.55, height: 0.9, walk: 1.6, run: 6.2, chargeSpeed: 10.5, turn: 5, alert: 14, safe: 22, aggroRange: 26,
    biomes: [BIOME.JUNGLE, BIOME.MEADOW], slots: 14, group: [1, 2], respawn: 360, xp: 18,
    attack: { kind: 'charge', range: 1.5, windup: 0.85, active: 0.7, recover: 1.0, damage: 20, knock: 9, cooldown: 1.2, dashTime: 0.75 },
    drops: [{ item: 'raw_meat', min: 3, max: 4 }, { item: 'hide', min: 1, max: 2 }, { item: 'bone', min: 1, max: 2 }, { item: 'fang', min: 1, max: 2, chance: 0.8 }, { item: 'sinew', min: 0, max: 2, chance: 0.5 }, { item: 'fat', min: 1, max: 2, chance: 0.7 }],
    night: 'aggressive', sound: 'growl',
  },
  crab: {
    name: 'Krab', brain: 'crab', hp: 16, radius: 0.32, height: 0.3, walk: 1.4, run: 4.2, turn: 8, alert: 6, safe: 8, aggroRange: 16,
    biomes: [BIOME.BEACH], slots: 18, group: [3, 5], respawn: 200, xp: 5,
    attack: { kind: 'pinch', range: 0.95, windup: 0.6, active: 0.2, recover: 0.6, damage: 7, knock: 3, cooldown: 0.9 },
    drops: [{ item: 'raw_meat', min: 1, max: 2 }, { item: 'bone', min: 0, max: 1, chance: 0.3 }],
    night: 'aggressive', sound: 'growl',
  },
  wolf: {
    name: 'Wilk', brain: 'wolf', hp: 44, radius: 0.45, height: 0.85, walk: 1.9, run: 9.0, turn: 8, alert: 15, safe: 26, aggroRange: 34, circleR: 7.5,
    biomes: [BIOME.MEADOW, BIOME.JUNGLE, BIOME.ROCK], slots: 6, group: [3, 4], respawn: 420, xp: 20,
    attack: { kind: 'bite', range: 1.7, windup: 0.62, active: 0.35, recover: 0.75, damage: 14, knock: 5, cooldown: 2.4, dashSpeed: 8.5, dashTime: 0.32 },
    drops: [{ item: 'raw_meat', min: 2, max: 3 }, { item: 'hide', min: 1, max: 2 }, { item: 'bone', min: 1, max: 2 }, { item: 'fang', min: 1, max: 2, chance: 0.9 }, { item: 'sinew', min: 0, max: 2, chance: 0.5 }],
    night: 'hunt', sound: 'growl',
  },
  panther: {
    name: 'Pantera', brain: 'panther', hp: 90, radius: 0.5, height: 0.8, walk: 1.7, run: 9.5, stalkSpeed: 2.3, turn: 9, alert: 6, safe: 20, aggroRange: 32,
    biomes: [BIOME.JUNGLE, BIOME.ROCK], slots: 5, group: [1, 1], respawn: 600, xp: 45,
    attack: { kind: 'pounce', range: 2.0, windup: 0.75, active: 0.55, recover: 1.3, damage: 30, knock: 8, cooldown: 3.2, leapRange: 8, leapSpeed: 12, leapVy: 5.5 },
    drops: [{ item: 'raw_meat', min: 3, max: 4 }, { item: 'hide', min: 2, max: 3 }, { item: 'bone', min: 1, max: 3 }, { item: 'fang', min: 2, max: 3 }, { item: 'sinew', min: 1, max: 2 }],
    night: 'stalk', sound: 'growl',
  },
  shadow: {
    name: 'Cieniak', brain: 'shadow', hp: 46, radius: 0.42, height: 2.0, walk: 2.0, run: 4.6, turn: 6, alert: 40, safe: 40, aggroRange: 40, night_only: true, scared: true, bloodColor: ['#302050', '#40306a'],
    attack: { kind: 'swipe', range: 2.1, windup: 0.75, active: 0.25, recover: 0.8, damage: 16, knock: 5, cooldown: 1.4 },
    drops: [{ item: 'shadow_essence', min: 0, max: 1, chance: 0.35 }],
    xp: 15, sound: 'growl',
  },
  bat: {
    name: 'Nietoperz', brain: 'bat', hp: 14, radius: 0.28, height: 0.4, walk: 3, run: 8.5, turn: 7, alert: 40, safe: 40, aggroRange: 42, night_only: true, scared: true, flyHeight: 3.2, bloodColor: ['#502030', '#703040'],
    attack: { kind: 'dive', range: 1.4, windup: 0.5, active: 0.4, recover: 0.7, damage: 8, knock: 2, cooldown: 2.0, diveSpeed: 10 },
    drops: [{ item: 'bone', min: 0, max: 1, chance: 0.2 }],
    xp: 6, sound: 'screech',
  },
  // mini-boss of the Blood Moon
  brute: {
    name: 'Rozbijacz', brain: 'boss', creature: 'shadow', scale: 1.75, hp: 420, radius: 0.95, height: 3.6, walk: 2.4, run: 4.4, turn: 3, alert: 60, safe: 60, aggroRange: 70, night_only: true, boss: true, bloodColor: ['#a01020', '#c02030'],
    attack: { kind: 'slam', range: 4.4, windup: 1.15, active: 0.35, recover: 1.5, damage: 38, knock: 10, cooldown: 1.8, aoe: 4.4 },
    drops: [{ item: 'blood_shard', min: 3, max: 5 }, { item: 'shadow_essence', min: 2, max: 3 }],
    xp: 140, sound: 'roar',
  },
  // final boss of the endgame night
  guardian: {
    name: 'Strażnik Wulkanu', brain: 'boss', creature: 'shadow', scale: 2.7, hp: 1100, radius: 1.5, height: 5.6, walk: 2.2, run: 3.6, turn: 2.2, alert: 90, safe: 90, aggroRange: 90, night_only: true, boss: true, fire: true, bloodColor: ['#ff7a20', '#ffb040'],
    attack: { kind: 'slam', range: 6.2, windup: 1.3, active: 0.4, recover: 1.7, damage: 46, knock: 12, cooldown: 2.4, aoe: 6.2, fireballs: true },
    drops: [{ item: 'ash_heart', min: 1, max: 1 }, { item: 'blood_shard', min: 4, max: 6 }],
    xp: 400, sound: 'roar',
  },
};
export const MELEE_ATTACK_KINDS = ['bite', 'charge', 'pounce', 'swipe', 'pinch', 'dive'];
