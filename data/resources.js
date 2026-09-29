// Resource node definitions (trees, rocks, plants...). Drops: {item, min, max, chance}. ALL numbers are ROBOCZE.
// kind: how the node is harvested. 'tool' = needs swings with a matching tool type; 'hand' = press E.
export const RESOURCES = {
  tree_pine:   { name: 'Sosna', kind: 'tool', tool: 'axe', hp: 70, radius: 0.5, height: 9, fall: true, respawn: 900, xp: 4,
                 drops: [{ item: 'wood', min: 3, max: 5 }, { item: 'stick', min: 1, max: 3, chance: 0.7 }, { item: 'resin', min: 1, max: 1, chance: 0.25 }] },
  tree_oak:    { name: 'Dąb', kind: 'tool', tool: 'axe', hp: 80, radius: 0.55, height: 6, fall: true, respawn: 900, xp: 4,
                 drops: [{ item: 'wood', min: 4, max: 6 }, { item: 'stick', min: 1, max: 3, chance: 0.7 }] },
  tree_jungle: { name: 'Drzewo dżunglowe', kind: 'tool', tool: 'axe', hp: 110, radius: 0.75, height: 12, fall: true, respawn: 1000, xp: 6,
                 drops: [{ item: 'wood', min: 5, max: 8 }, { item: 'vine', min: 1, max: 2, chance: 0.5 }] },
  tree_palm:   { name: 'Palma', kind: 'tool', tool: 'axe', hp: 45, radius: 0.32, height: 7, fall: true, respawn: 700, xp: 3,
                 drops: [{ item: 'wood', min: 2, max: 3 }, { item: 'coconut', min: 1, max: 2, chance: 0.8 }, { item: 'palm_leaf', min: 1, max: 3 }] },
  tree_dead:   { name: 'Martwe drzewo', kind: 'tool', tool: 'axe', hp: 35, radius: 0.4, height: 5, fall: true, respawn: 1200, xp: 2,
                 drops: [{ item: 'wood', min: 2, max: 3 }, { item: 'stick', min: 2, max: 4 }] },
  rock:        { name: 'Głaz', kind: 'tool', tool: 'pickaxe', hp: 90, radius: 0.9, height: 1.2, respawn: 1100, xp: 4,
                 drops: [{ item: 'stone', min: 3, max: 5 }, { item: 'flint', min: 1, max: 1, chance: 0.3 }] },
  stone_small: { name: 'Kamienie', kind: 'hand', hp: 1, radius: 0.0, height: 0.2, respawn: 600, xp: 0, verb: 'Podnieś kamienie',
                 drops: [{ item: 'stone', min: 1, max: 2 }] },
  ore_iron:    { name: 'Ruda żelaza', kind: 'tool', tool: 'pickaxe', tier: 2, hp: 130, radius: 0.85, height: 1.4, respawn: 1500, xp: 10,
                 drops: [{ item: 'iron_ore', min: 2, max: 3 }, { item: 'stone', min: 1, max: 2 }] },
  ore_obsidian:{ name: 'Obsydian', kind: 'tool', tool: 'pickaxe', tier: 3, hp: 170, radius: 0.85, height: 1.4, respawn: 1800, xp: 16,
                 drops: [{ item: 'obsidian', min: 2, max: 3 }] },
  ore_sulfur:  { name: 'Siarka', kind: 'tool', tool: 'pickaxe', tier: 2, hp: 100, radius: 0.8, height: 1.3, respawn: 1500, xp: 8,
                 drops: [{ item: 'sulfur', min: 2, max: 4 }] },
  bush_berry:  { name: 'Krzak z jagodami', kind: 'hand', hp: 1, radius: 0.55, height: 1.2, respawn: 420, xp: 1, verb: 'Zbierz jagody', keep: true,
                 drops: [{ item: 'berries', min: 2, max: 4 }] },
  reed:        { name: 'Trzcina', kind: 'hand', hp: 1, radius: 0.0, height: 2, respawn: 420, xp: 1, verb: 'Zetnij trzcinę', keep: true,
                 drops: [{ item: 'reed', min: 2, max: 4 }] },
  liana:       { name: 'Liany', kind: 'hand', hp: 1, radius: 0.5, height: 2, respawn: 480, xp: 1, verb: 'Zerwij liany', keep: true,
                 drops: [{ item: 'vine', min: 2, max: 3 }] },
  bones:       { name: 'Stare kości', kind: 'hand', hp: 1, radius: 0.0, height: 0.3, respawn: 1500, xp: 1, verb: 'Zbierz kości',
                 drops: [{ item: 'bone', min: 2, max: 4 }] },
  sticks:      { name: 'Patyki', kind: 'hand', hp: 1, radius: 0.0, height: 0.2, respawn: 500, xp: 0, verb: 'Zbierz patyki',
                 drops: [{ item: 'stick', min: 2, max: 3 }] },
  crate:       { name: 'Skrzynia z wraku', kind: 'loot', hp: 1, radius: 0.55, height: 0.8, respawn: 0, xp: 3, verb: 'Otwórz skrzynię',
                 loot: 'wreck' },
  barrel:      { name: 'Beczka z wraku', kind: 'loot', hp: 1, radius: 0.4, height: 0.9, respawn: 0, xp: 2, verb: 'Otwórz beczkę',
                 loot: 'wreck' },
  hull:        { name: 'Wrak statku', kind: 'decor', hp: 1, radius: 0, height: 4, respawn: 0 },
};

// Loot tables: [{item, min, max, chance}]. First wreck near the spawn always gets `starter`.
export const LOOT = {
  starter: [{ item: 'rusty_axe', min: 1, max: 1, chance: 1 }, { item: 'rope', min: 1, max: 1, chance: 1 }, { item: 'berries', min: 2, max: 2, chance: 1 }],
  wreck: [
    { item: 'rope', min: 1, max: 2, chance: 0.6 }, { item: 'cloth', min: 1, max: 3, chance: 0.7 }, { item: 'plank', min: 1, max: 3, chance: 0.7 },
    { item: 'nails', min: 2, max: 6, chance: 0.5 }, { item: 'water_bottle', min: 1, max: 1, chance: 0.35 }, { item: 'canned_food', min: 1, max: 2, chance: 0.4 },
    { item: 'flint', min: 1, max: 2, chance: 0.4 }, { item: 'iron_scrap', min: 1, max: 2, chance: 0.25 },
  ],
};

// Placement density per biome (per 100 m^2, rough) - see world/placement.js
export const PLACEMENT = {
  // biome -> list of [type, density, minSlope, maxSlope]
};
