// Item database. `stack` = max stack size. Tools: {type, power, tier, durability}. Weapons: see data/weapons.js.
// All numbers are ROBOCZE.
export const ITEM_CATEGORIES = { resource: 'Surowiec', tool: 'Narzędzie', weapon: 'Broń', food: 'Jedzenie', armor: 'Pancerz', misc: 'Różne', potion: 'Mikstura', build: 'Budowla' };

const it = (id, name, cat, o = {}) => ({ id, name, cat, stack: 50, desc: '', ...o });

export const ITEMS = Object.fromEntries([
  // --- resources ---
  it('wood', 'Drewno', 'resource', { desc: 'Kłody i bale. Podstawa wszystkiego.', color: '#8a5a32', shape: 'log' }),
  it('stick', 'Patyk', 'resource', { desc: 'Cienki, ale przydatny.', color: '#7a5c40', shape: 'stick' }),
  it('stone', 'Kamień', 'resource', { desc: 'Ciężki i twardy.', color: '#8a8a90', shape: 'stone' }),
  it('flint', 'Krzemień', 'resource', { desc: 'Daje iskrę.', color: '#4a4a52', shape: 'stone' }),
  it('resin', 'Żywica', 'resource', { desc: 'Klejąca żywica sosnowa.', color: '#d9a441', shape: 'blob' }),
  it('vine', 'Liana', 'resource', { desc: 'Mocna roślinna lina.', color: '#4f9a3a', shape: 'stick' }),
  it('reed', 'Trzcina', 'resource', { desc: 'Lekka, giętka.', color: '#b2b866', shape: 'stick' }),
  it('palm_leaf', 'Liść palmy', 'resource', { desc: 'Duży, szeroki liść.', color: '#4a9a3a', shape: 'leaf' }),
  it('bone', 'Kość', 'resource', { desc: 'Twarda i lekka.', color: '#e6ddc8', shape: 'bone' }),
  it('fang', 'Kieł', 'resource', { desc: 'Ostry kieł drapieżnika.', color: '#f1ead8', shape: 'bone' }),
  it('hide', 'Skóra', 'resource', { desc: 'Surowa skóra zwierzęca.', color: '#8a6a48', shape: 'blob' }),
  it('sinew', 'Ścięgno', 'resource', { desc: 'Mocne włókno do cięciwy i szycia.', color: '#c9a98a', shape: 'stick' }),
  it('iron_ore', 'Ruda żelaza', 'resource', { desc: 'Do przetopienia w piecu.', color: '#b4562b', shape: 'stone' }),
  it('iron_ingot', 'Sztabka żelaza', 'resource', { desc: 'Przetopione żelazo.', color: '#9aa0a8', shape: 'bar' }),
  it('obsidian', 'Obsydian', 'resource', { desc: 'Wulkaniczne szkło.', color: '#2a2040', shape: 'stone' }),
  it('sulfur', 'Siarka', 'resource', { desc: 'Żółty proszek o ostrym zapachu.', color: '#e6d84a', shape: 'stone' }),
  it('plank', 'Deska', 'resource', { desc: 'Deska ze statku.', color: '#9a7443', shape: 'log' }),
  it('nails', 'Gwoździe', 'resource', { desc: 'Zardzewiałe, ale użyteczne.', color: '#6a6a70', shape: 'stick' }),
  it('cloth', 'Szmaty', 'resource', { desc: 'Skrawki płótna.', color: '#c8c0a8', shape: 'blob' }),
  it('rope', 'Lina', 'resource', { desc: 'Solidna lina.', color: '#b59a6a', shape: 'stick' }),
  it('iron_scrap', 'Złom', 'resource', { desc: 'Kawałki metalu.', color: '#7a7a82', shape: 'bar' }),
  // --- food ---
  it('berries', 'Jagody', 'food', { desc: 'Słodkie, trochę nawadniają.', color: '#c0243a', shape: 'blob', food: { hunger: 8, thirst: 3, health: 0 }, stack: 20 }),
  it('coconut', 'Kokos', 'food', { desc: 'Mleczko gasi pragnienie.', color: '#5a4028', shape: 'blob', food: { hunger: 10, thirst: 14 }, stack: 10 }),
  it('canned_food', 'Puszka mięsa', 'food', { desc: 'Stara, ale jadalna.', color: '#a0a0a8', shape: 'can', food: { hunger: 30, thirst: -5 }, stack: 10 }),
  it('water_bottle', 'Butelka wody', 'food', { desc: 'Czysta woda.', color: '#8ad0ff', shape: 'can', food: { thirst: 40 }, stack: 5 }),
  it('raw_meat', 'Surowe mięso', 'food', { desc: 'Lepiej je upiec.', color: '#c25a5a', shape: 'blob', food: { hunger: 12, poison: 0.5 }, stack: 20 }),
  // --- tools & weapons (Stage 1 only has the starter axe; more come from recipes) ---
  it('rusty_axe', 'Zardzewiała siekiera', 'tool', { stack: 1, desc: 'Znaleziona we wraku. Tępa, ale ścina drzewa.', color: '#8a6a4a', model: 'axe', tool: { type: 'axe', power: 14, tier: 1, durability: 45 } }),
  it('stone_axe', 'Kamienna siekiera', 'tool', { stack: 1, desc: 'Ścina drzewa.', color: '#8a8a90', model: 'axe', tool: { type: 'axe', power: 20, tier: 1, durability: 60 } }),
  it('stone_pickaxe', 'Kamienny kilof', 'tool', { stack: 1, desc: 'Kruszy skały.', color: '#8a8a90', model: 'pickaxe', tool: { type: 'pickaxe', power: 20, tier: 1, durability: 60 } }),
  it('torch', 'Pochodnia', 'tool', { stack: 1, desc: 'Rozświetla ciemność. Powoli się wypala.', color: '#e0902a', model: 'torch', tool: { type: 'torch', power: 3, tier: 0, durability: 240 } }),
].map((i) => [i.id, i]));

export const itemName = (id) => ITEMS[id]?.name ?? id;
