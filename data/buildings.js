// Base building definitions. cost: raw resources spent when placing. hp: structure health. level: base level required (0 Obóz, 1 Osada, 2 Twierdza).
// ALL numbers ROBOCZE. `model` keys correspond to src/gfx/buildings.js.
export const BASE_LEVELS = [
  { id: 0, name: 'Obóz', desc: 'Podstawowe schronienie i ogień.' },
  { id: 1, name: 'Osada', desc: 'Odblokowuje chatę, kamienne mury, wieżę, piec i ogród.', requires: { wood: 30, stone: 20, stick: 10 }, needs: [['workbench', 1], ['leanto', 1]] },
  { id: 2, name: 'Twierdza', desc: 'Odblokowuje kamienny dom, mury z kolcami i kuźnię.', requires: { wood: 60, stone: 60, iron_ingot: 4 }, needs: [['wooden_hut', 1], ['palisade_wall', 4], ['furnace', 1]] },
];
export const BUILD_CATS = { fire: 'Ogień', shelter: 'Schronienie', wall: 'Umocnienia', trap: 'Pułapki', station: 'Stanowiska', misc: 'Wyposażenie' };

const b = (id, name, cat, level, cost, hp, o = {}) => ({ id, name, cat, level, cost, hp, model: id, snap: false, ...o });

export const BUILDINGS = {
  // ---- fire ----
  campfire: b('campfire', 'Ognisko', 'fire', 0, { wood: 4, stone: 4, stick: 3 }, 60, { station: 'campfire', fuel: { max: 900, per: 200 }, upgradeTo: 'hearth', desc: 'Światło, ciepło i gotowanie. Dorzucaj drewna.', light: { r: 18, i: 6.0, color: 0xff9a3a, scare: 1.0, scareR: 9, warm: 9, flame: 1.0 } }),
  hearth: b('hearth', 'Palenisko', 'fire', 1, { stone: 14, wood: 8 }, 120, { station: 'campfire', fuel: { max: 1500, per: 300 }, upgradeTo: 'great_fire', upgradeCost: { stone: 12, wood: 8 }, upgradeOnly: true, desc: 'Większy i trwalszy ogień. Wolniej się wypala.', light: { r: 19, i: 4.2, color: 0xff9440, scare: 1.0, scareR: 13, warm: 12, flame: 1.5 } }),
  great_fire: b('great_fire', 'Wielkie ognisko', 'fire', 2, { wood: 20, stone: 16 }, 200, { station: 'campfire', fuel: { max: 2400, per: 420 }, upgradeOnly: true, upgradeCost: { wood: 20, stone: 20 }, desc: 'Widać go z daleka. Cienie boją się tego światła.', light: { r: 28, i: 5.4, color: 0xff8a38, scare: 1.0, scareR: 20, warm: 16, flame: 2.3 } }),
  lantern_post: b('lantern_post', 'Latarnia', 'fire', 1, { wood: 6, iron_scrap: 1, cloth: 2 }, 60, { fuelItem: 'fat', light: { r: 12, i: 2.6, color: 0xffc060, scare: 0.75, scareR: 7, warm: 0, flame: 0.3 }, desc: 'Świeci, dopóki ma tłuszcz lub olej.', fuel: { max: 900, per: 300 } }),
  // ---- shelter ----
  leanto: b('leanto', 'Szałas', 'shelter', 0, { wood: 8, stick: 6, palm_leaf: 8, vine: 2 }, 160, { bed: true, desc: 'Śpij i odradzaj się tu. Nie chroni przed wszystkim.', size: [3.2, 3.0] }),
  wooden_hut: b('wooden_hut', 'Drewniana chata', 'shelter', 1, { wood: 32, stick: 10, palm_leaf: 10, vine: 4 }, 420, { bed: true, desc: 'Solidne schronienie z łóżkiem.', size: [5, 5] }),
  stone_house: b('stone_house', 'Kamienny dom', 'shelter', 2, { stone: 44, wood: 26, nails: 8 }, 900, { bed: true, desc: 'Twierdza w miniaturze.', size: [6, 6] }),
  // ---- walls ----
  palisade_wall: b('palisade_wall', 'Palisada', 'wall', 0, { wood: 5, vine: 1 }, 150, { snap: true, size: [2, 0.5], dmgMul: 1.4, desc: 'Ostro zakończone pale.' }),
  stone_wall: b('stone_wall', 'Kamienny mur', 'wall', 1, { stone: 8 }, 420, { snap: true, size: [2, 0.8], dmgMul: 0.8, desc: 'Ciężki mur, trudny do zniszczenia.' }),
  spike_wall: b('spike_wall', 'Mur z kolcami', 'wall', 2, { stone: 8, wood: 4, iron_scrap: 1 }, 520, { snap: true, size: [2, 1.0], dmgMul: 0.7, thorns: 6, desc: 'Ranią tych, którzy się o niego opierają.' }),
  gate: b('gate', 'Brama', 'wall', 0, { wood: 10, vine: 2 }, 260, { snap: true, size: [2.6, 0.6], gate: true, dmgMul: 1.2, desc: 'E – otwórz / zamknij.' }),
  watchtower: b('watchtower', 'Wieża strażnicza', 'wall', 1, { wood: 26, vine: 6, stick: 8 }, 320, { size: [3, 3], tower: true, dmgMul: 1.3, desc: 'E przy drabinie – wspinaczka. Dalszy widok, łuk z góry.' }),
  // ---- traps ----
  spike_trap: b('spike_trap', 'Kolce', 'trap', 0, { wood: 4, stick: 4 }, 50, { trap: { kind: 'spike', damage: 22, radius: 1.0, cooldown: 1.2 }, walkable: true, desc: 'Rani wrogów, którzy po nich przejdą.' }),
  snare: b('snare', 'Sidła', 'trap', 0, { vine: 2, stick: 2 }, 30, { trap: { kind: 'snare', damage: 6, hold: 4.0, radius: 0.9, cooldown: 0 }, walkable: true, oneShot: true, desc: 'Unieruchamia zwierzę na kilka sekund.' }),
  pit_trap: b('pit_trap', 'Dół z palami', 'trap', 1, { wood: 4, stick: 8 }, 40, { trap: { kind: 'pit', damage: 55, radius: 1.1, hold: 2.5, cooldown: 0 }, walkable: true, oneShot: true, desc: 'Wrogowie, którzy w niego wpadną, ciężko cierpią.' }),
  bear_trap: b('bear_trap', 'Pułapka na niedźwiedzie', 'trap', 2, {}, 40, { trap: { kind: 'bear', damage: 45, hold: 4.5, radius: 0.8, cooldown: 0 }, walkable: true, item: 'bear_trap', desc: 'Żelazne szczęki. Wykonaj w piecu.' }),
  // ---- stations ----
  workbench: b('workbench', 'Stół rzemieślniczy', 'station', 0, { wood: 12, stone: 6, vine: 3 }, 120, { station: 'workbench', size: [1.9, 0.9], desc: 'Odblokowuje receptury kościane.' }),
  furnace: b('furnace', 'Piec', 'station', 1, { stone: 16, wood: 6, iron_scrap: 2 }, 200, { station: 'furnace', size: [1.7, 1.7], needsNear: 'workbench', light: { r: 8, i: 1.6, color: 0xff7a30, scare: 0.3, scareR: 4, warm: 5, flame: 0 }, desc: 'Wytop żelaza. Receptury żelazne.' }),
  alchemy: b('alchemy', 'Stół alchemiczny', 'station', 1, { wood: 8, stone: 4, bone: 4, palm_leaf: 2 }, 100, { station: 'alchemy', size: [1.5, 0.9], desc: 'Mikstury z ziół.' }),
  forge: b('forge', 'Kuźnia obsydianowa', 'station', 2, { obsidian: 4, iron_ingot: 6, stone: 10 }, 320, { station: 'forge', size: [2, 2], needsNear: 'furnace', light: { r: 9, i: 2.0, color: 0xff5a20, scare: 0.35, scareR: 5, warm: 7, flame: 0 }, desc: 'Obróbka obsydianu.' }),
  // ---- misc ----
  chest: b('chest', 'Skrzynia', 'misc', 0, { wood: 8, vine: 1 }, 90, { storage: 18, size: [0.95, 0.65], desc: 'Przechowuje przedmioty.' }),
  drying_rack: b('drying_rack', 'Suszarka do mięsa', 'misc', 0, { wood: 6, stick: 4, vine: 2 }, 80, { rack: true, size: [1.8, 0.7], desc: 'Surowe mięso schnie w ciągu 90 s i długo się nie psuje.' }),
  rain_barrel: b('rain_barrel', 'Zbiornik na deszczówkę', 'misc', 1, { wood: 10, vine: 2, palm_leaf: 3 }, 90, { barrel: true, size: [1, 1], desc: 'Zbiera wodę w czasie deszczu.' }),
  garden: b('garden', 'Ogródek', 'misc', 1, { wood: 6, stick: 6 }, 70, { garden: true, size: [2.4, 2.4], desc: 'Sadź jagody i zioła.' }),
  raft: b('raft', 'Tratwa', 'misc', 1, { wood: 40, rope: 6, vine: 6 }, 700, { size: [3.6, 5.0], raft: true, beach: true, desc: 'Postaw na plaży, przy wodzie. Potrzebny żagiel i ster.' }),
  signal_fire: b('signal_fire', 'Ognisko sygnałowe', 'misc', 1, { wood: 50, resin: 8, sulfur: 4 }, 800, { size: [3, 3], signal: true, peak: true, light: { r: 40, i: 6, color: 0xff7a30, scare: 1.0, scareR: 24, warm: 14, flame: 2.6 }, desc: 'Postaw na szczycie góry. Musi płonąć całą noc.' }),
  bed: b('bed', 'Łóżko', 'misc', 0, { wood: 4, hide: 2, palm_leaf: 4 }, 60, { bed: true, size: [1.1, 2.0], desc: 'Śpij i odradzaj się.' }),
};
export const BUILD_ORDER = Object.keys(BUILDINGS);
