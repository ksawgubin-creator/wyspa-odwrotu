// Crafting recipes. tier: 0 hands, 1 bone (workbench), 2 iron (furnace), 3 obsidian (forge). station: 'hand' | 'workbench' | 'furnace' | 'forge' | 'campfire' | 'alchemy'.
// out: {id,n} (or array for several outputs); cost: {item:n}; time in seconds. ALL numbers ROBOCZE.
export const TIER_INFO = [
  { id: 0, name: 'Prymitywny', hint: 'Ręce i to, co leży pod nogami.' },
  { id: 1, name: 'Kościany', hint: 'Kości, ścięgna i skóry. Wymaga stołu rzemieślniczego.' },
  { id: 2, name: 'Żelazny', hint: 'Ruda z jaskini przetopiona w piecu.' },
  { id: 3, name: 'Obsydianowy', hint: 'Wulkaniczne szkło i ogień kuźni.' },
];
export const STATION_INFO = {
  hand: { name: 'Ręce' }, workbench: { name: 'Stół rzemieślniczy' }, furnace: { name: 'Piec' }, forge: { name: 'Kuźnia obsydianowa' },
  campfire: { name: 'Ognisko' }, alchemy: { name: 'Stół alchemiczny' },
};
const r = (id, out, cost, o = {}) => ({ id, out: Array.isArray(out) ? out : [{ id: out, n: 1 }], cost, tier: 0, station: 'hand', time: 1.5, ...o });
const n = (id, count) => ({ id, n: count });

export const RECIPES = [
  // ---- tier 0: hands ----
  r('stone_axe', 'stone_axe', { stick: 2, stone: 2, vine: 1 }, { desc: 'Ścina drzewa szybciej niż zardzewiałe żelastwo.' }),
  r('stone_pickaxe', 'stone_pickaxe', { stick: 2, stone: 3, vine: 1 }, { desc: 'Kruszy skały i miękkie rudy.' }),
  r('stone_spear', 'stone_spear', { stick: 2, stone: 1, vine: 1 }, { desc: 'Dzida: długi zasięg, dobra na dziki i wilki.' }),
  r('torch', 'torch', { stick: 1, resin: 1, cloth: 1 }, { alt: { stick: 1, resin: 1, palm_leaf: 2 }, desc: 'Światło, które odstrasza cienie. Wypala się.' }),
  r('waterskin', 'waterskin', { palm_leaf: 3, vine: 1 }, { desc: 'Bukłak z liści. Napełnij w słodkim jeziorze.' }),
  r('rope', 'rope', { vine: 3 }, { desc: 'Splecione liany. Do tratwy i wszystkiego, co się rusza.', time: 1.2 }),
  // ---- tier 1: bone (workbench) ----
  r('bone_knife', 'bone_knife', { bone: 3, sinew: 1, stick: 1 }, { tier: 1, station: 'workbench', desc: 'Nóż do skórowania: więcej łupu ze zwierząt.' }),
  r('bow', 'bow', { wood: 3, sinew: 2, vine: 1 }, { tier: 1, station: 'workbench', desc: 'Łuk. Naciągaj, celuj przez ramię.', time: 2.5 }),
  r('arrows', [n('arrow', 5)], { stick: 3, bone: 1, flint: 1 }, { tier: 1, station: 'workbench', desc: 'Pięć strzał z kościanym grotem.' }),
  r('hide_armor', 'hide_armor', { hide: 5, sinew: 3, vine: 1 }, { tier: 1, station: 'workbench', desc: 'Skórzany pancerz: mniej obrażeń, cieplej.', time: 3.5 }),
  r('fishing_rod', 'fishing_rod', { stick: 3, vine: 2, bone: 1 }, { tier: 1, station: 'workbench', desc: 'Wędka. Rzuć w wodę i czekaj.' }),
  r('bone_spear', 'bone_spear', { stick: 2, bone: 3, sinew: 1 }, { tier: 1, station: 'workbench', desc: 'Lżejsza i szybsza od kamiennej.' }),
  // ---- tier 2: iron (furnace) ----
  r('iron_ingot', 'iron_ingot', { iron_ore: 2, wood: 1 }, { tier: 2, station: 'furnace', time: 4, desc: 'Przetop rudę w sztabkę.' }),
  r('iron_sword', 'iron_sword', { iron_ingot: 3, stick: 1, hide: 1 }, { tier: 2, station: 'furnace', desc: 'Miecz: szybkie combo, dobry zasięg.', time: 4 }),
  r('iron_axe', 'iron_axe', { iron_ingot: 2, stick: 2, vine: 1 }, { tier: 2, station: 'furnace', time: 3 }),
  r('iron_pickaxe', 'iron_pickaxe', { iron_ingot: 3, stick: 2, vine: 1 }, { tier: 2, station: 'furnace', desc: 'Weźmie rudę żelaza i siarkę.', time: 3 }),
  r('crossbow', 'crossbow', { iron_ingot: 2, wood: 4, sinew: 3 }, { tier: 2, station: 'furnace', desc: 'Kusza: ciężkie bełty, powolne przeładowanie.', time: 5 }),
  r('bolts', [n('bolt', 5)], { stick: 3, iron_ingot: 1 }, { tier: 2, station: 'furnace', desc: 'Pięć bełtów do kuszy.' }),
  r('iron_armor', 'iron_armor', { iron_ingot: 8, hide: 2, sinew: 2 }, { tier: 2, station: 'furnace', desc: 'Ciężki pancerz żelazny.', time: 6 }),
  r('bear_trap', 'bear_trap', { iron_ingot: 3, wood: 2 }, { tier: 2, station: 'furnace', desc: 'Pułapka na niedźwiedzie… i wilki.', time: 3 }),
  // ---- tier 3: obsidian (forge) ----
  r('obsidian_sword', 'obsidian_sword', { obsidian: 4, iron_ingot: 2, sinew: 1 }, { tier: 3, station: 'forge', desc: 'Ostrze ostrzejsze niż cokolwiek innego.', time: 6 }),
  r('fire_arrows', [n('fire_arrow', 5)], { arrow: 5, resin: 2, sulfur: 1 }, { tier: 3, station: 'forge', desc: 'Płonące strzały.', time: 3 }),
  r('obsidian_armor', 'obsidian_armor', { obsidian: 8, iron_ingot: 4, hide: 4 }, { tier: 3, station: 'forge', desc: 'Zbroja odporna na ogień.', time: 8 }),
  r('raft_sail', 'raft_sail', { hide: 8, rope: 2, sinew: 4 }, { tier: 1, station: 'workbench', desc: 'Żagiel ze skór do tratwy.', time: 6 }),
  r('obsidian_rudder', 'obsidian_rudder', { obsidian: 3, wood: 4, iron_ingot: 2 }, { tier: 3, station: 'forge', desc: 'Ster do tratwy z czarnego szkła.', time: 7 }),
  // ---- cooking (campfire) ----
  r('cooked_meat', 'cooked_meat', { raw_meat: 1 }, { tier: 0, station: 'campfire', time: 4, desc: 'Pieczone mięso: sycące, bez trucizny.' }),
  r('cooked_fish', 'cooked_fish', { raw_fish: 1 }, { tier: 0, station: 'campfire', time: 3 }),
  r('roasted_coconut', 'roasted_coconut', { coconut: 1 }, { tier: 0, station: 'campfire', time: 3 }),
  r('stew', 'stew', { raw_meat: 1, berries: 2, herb: 1 }, { tier: 0, station: 'campfire', time: 7, desc: 'Gulasz: syci i przez chwilę regeneruje zdrowie.' }),
  r('herbal_tea', [n('herbal_tea', 1), n('waterskin', 1)], { herb: 2, waterskin_full: 1 }, { tier: 0, station: 'campfire', time: 5, desc: 'Herbatka ziołowa: uspokaja i zmniejsza strach.' }),
  // ---- alchemy ----
  r('healing_potion', 'healing_potion', { herb: 3, berries: 2, waterskin_full: 1 }, { tier: 1, station: 'alchemy', time: 5, desc: 'Leczy.' }),
  r('night_vision_potion', 'night_vision_potion', { herb: 2, shadow_essence: 1, waterskin_full: 1 }, { tier: 1, station: 'alchemy', time: 5, desc: 'Noc na chwilę przestaje być ciemna.' }),
  r('cold_resist_potion', 'cold_resist_potion', { herb: 2, sulfur: 1, waterskin_full: 1 }, { tier: 1, station: 'alchemy', time: 5, desc: 'Odporność na zimno.' }),
];
export const recipeById = (id) => RECIPES.find((x) => x.id === id);
