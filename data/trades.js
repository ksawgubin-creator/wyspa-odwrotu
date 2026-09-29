// Barter offers of the wandering trader (a few are picked per visit). give/get: {itemId: count}. ALL numbers ROBOCZE.
export const TRADE_POOL = [
  { give: { hide: 4 }, get: { iron_ingot: 2 }, note: 'Żelazo bez kopania.' },
  { give: { hide: 3, fang: 1 }, get: { healing_potion: 2 } },
  { give: { fang: 3 }, get: { obsidian: 2 }, note: 'Czarne szkło z wulkanu.' },
  { give: { hide: 8 }, get: { raft_sail: 1 }, note: 'Gotowy żagiel do tratwy.' },
  { give: { bone: 8 }, get: { arrow: 15 } },
  { give: { hide: 5 }, get: { rope: 4 } },
  { give: { fat: 4 }, get: { night_vision_potion: 1 } },
  { give: { hide: 6, sinew: 3 }, get: { hide_armor: 1 } },
  { give: { fang: 5, hide: 4 }, get: { crossbow: 1 }, note: 'Kusza z zamorskiego kupca.' },
  { give: { fang: 4 }, get: { cold_resist_potion: 2 } },
  { give: { hide: 10 }, get: { iron_sword: 1 } },
  { give: { obsidian: 3 }, get: { obsidian_rudder: 1 }, note: 'Ster z obsydianu – gotowy.' },
];
export const DICE_STAKES = ['hide', 'bone', 'fang', 'fat', 'berries'];
