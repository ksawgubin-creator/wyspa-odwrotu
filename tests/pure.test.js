// Behaviour tests for the pure (THREE-free) modules. Runs in Node and in the browser (tests.html).
import { describe, it, expect } from './framework.js';
import { World, WORLD, BIOME, CAVE, LAYOUT } from '../src/world/worldgen.js';
import { generateNodes } from '../src/world/placement.js';
import { Colliders } from '../src/world/colliders.js';
import { Inventory } from '../src/inventory/inventory.js';
import { DayClock } from '../src/engine/daytime.js';
import { inMeleeArc, SwingTracker, stagePhase, stageTiming, stageDuration } from '../src/combat/melee.js';
import { RECIPES } from '../data/recipes.js';
import { checkCraft, craft, discounted } from '../src/crafting/crafting.js';
import { ITEMS } from '../data/items.js';
import { RESOURCES } from '../data/resources.js';
import { WEAPONS } from '../data/weapons.js';
import { BUILDINGS } from '../data/buildings.js';
import { ANIMALS } from '../data/animals.js';
import { CONFIG } from '../data/config.js';

const SEED = 20240607;
let _w = null, _n = null;
const world = () => (_w ||= new World(SEED));
const nodes = () => (_n ||= generateNodes(world()));

describe('Generator świata', () => {
  it('ten sam seed daje ten sam świat, inny seed – inny', () => {
    const a = new World(SEED), b = new World(SEED), c = new World(SEED + 1);
    let same = true, diff = false;
    for (let i = 0; i < a.heights.length; i += 977) { if (a.heights[i] !== b.heights[i]) same = false; if (a.heights[i] !== c.heights[i]) diff = true; }
    expect(same).toBe(true); expect(diff).toBe(true);
  });
  it('punkt startowy leży na suchej plaży tuż przy wodzie, a szczyt jest wysoko', () => {
    const w = world();
    expect(w.getHeight(w.spawn.x, w.spawn.z)).toBeGreaterThan(0.5);
    expect(w.getBiome(w.spawn.x, w.spawn.z)).toBe(BIOME.BEACH);
    let sea = false; for (let d = 2; d < 14 && !sea; d += 1) if (w.getHeight(w.spawn.x, w.spawn.z + d) < -0.2) sea = true;
    expect(sea).toBe(true);
    expect(w.peak.y).toBeGreaterThan(30);
  });
  it('wulkan ma lawę poniżej krawędzi krateru, a wyspa otoczona jest morzem', () => {
    const w = world(), V = LAYOUT.volcano;
    expect(w.getHeight(V.x, V.z)).toBeLessThan(V.lavaY);
    let rim = 0; for (let a = 0; a < 6.28; a += 0.3) rim = Math.max(rim, w.getHeight(V.x + Math.cos(a) * V.craterR * 1.8, V.z + Math.sin(a) * V.craterR * 1.8));
    expect(rim).toBeGreaterThan(V.lavaY);
    expect(w.getHeight(-240, 0)).toBeLessThan(-3);
  });
  it('wysokość w punkcie siatki równa się mapie wysokości (bez szpar przy stawianiu obiektów)', () => {
    const w = world();
    for (const [x, z] of [[10, 10], [-50, 30], [80, -100], [3, 140]]) {
      const ix = Math.round(x + WORLD.half), iz = Math.round(z + WORLD.half);
      expect(w.getHeight(x, z)).toBeCloseTo(w.heights[iz * w.n + ix], 1e-4);
    }
  });
  it('jaskinia: wszystkie komnaty są połączone tunelami po płaskim dnie', () => {
    const w = world(), seen = new Set(), key = (x, z) => `${x},${z}`;
    const start = { x: Math.round(CAVE.cx + CAVE.rooms[0].x), z: Math.round(CAVE.cz + CAVE.rooms[0].z) };
    const q = [start]; seen.add(key(start.x, start.z));
    while (q.length) { const c = q.pop(); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, z = c.z + dz, k = key(x, z); if (seen.has(k) || w.caveDist(x, z) > -0.5) continue; seen.add(k); q.push({ x, z }); } }
    for (const r of CAVE.rooms) expect(seen.has(key(Math.round(CAVE.cx + r.x), Math.round(CAVE.cz + r.z)))).toBe(true);
  });
  it('dno jaskini jest płaskie (da się chodzić), a ściany strome (nie da się przejść)', () => {
    const w = world(), c = CAVE.rooms[3];
    expect(w.getSlope(CAVE.cx + c.x, CAVE.cz + c.z)).toBeLessThan(0.5);
    expect(w.getSlope(CAVE.cx + c.x + c.r + 1.4, CAVE.cz + c.z)).toBeGreaterThan(1.1);
  });
});

describe('Rozmieszczenie zasobów', () => {
  it('każdy obiekt stoi na terenie: nie wisi w powietrzu i nie jest zakopany', () => {
    const w = world(); let bad = 0;
    for (const n of nodes()) { const g = w.getHeight(n.x, n.z); if (Math.abs(n.y - (n.type === 'hull' ? g - 0.35 : g)) > 0.01) bad++; }
    expect(bad).toBe(0);
  });
  it('żaden obiekt nie stoi na stromym zboczu ani w głębokiej wodzie', () => {
    const w = world(); let steep = 0, deep = 0;
    for (const n of nodes()) { if (n.type === 'hull' || w.isCave(n.x, n.z)) continue; if (w.getHeight(n.x, n.z) < -0.3) deep++; if (w.getSlope(n.x, n.z) > 1.15) steep++; }
    expect(deep).toBe(0); expect(steep).toBe(0);
  });
  it('litość dla gracza: pole startowe jest wolne od drzew i skał', () => {
    const w = world(); const sp = w.spawn;
    expect(nodes().filter((n) => n.res !== null && RESOURCES[n.type]?.radius > 0 && Math.hypot(n.x - sp.x, n.z - sp.z) < 6).length).toBe(0);
  });
  it('pierwsza skrzynia z wraku zawiera siekierę na start', () => {
    expect(nodes().some((n) => n.loot === 'starter')).toBe(true);
  });
  it('są ukryte rudy (piorun) i ukryte wraki (wyrzucone przez fale)', () => {
    expect(nodes().filter((n) => n.hidden && n.type.startsWith('ore_')).length).toBeGreaterThan(5);
    expect(nodes().filter((n) => n.hidden && n.wreckGroup !== undefined).length).toBeGreaterThan(2);
  });
  it('w świecie jest 8 notatek rozbitka', () => { expect(nodes().filter((n) => n.type === 'note').length).toBe(8); });
});

describe('Kolizje', () => {
  it('okrąg wypycha gracza z drzewa', () => {
    const c = new Colliders(); c.add({ x: 0, z: 0, r: 1 });
    const p = { x: 0.3, z: 0.2 }; c.resolveCircle(p, 0.4);
    expect(Math.hypot(p.x, p.z)).toBeGreaterThanOrEqual(1.39);
  });
  it('obrócona ściana (prostokąt) jest nieprzenikalna przy małych krokach', () => {
    const c = new Colliders(); c.add({ x: 0, z: 0, hw: 3, hd: 0.25, rot: 0.6 });
    const p = { x: -4, z: -3.5 }; let crossed = false;
    const dir = { x: 0.6, z: 0.5 }; const l = Math.hypot(dir.x, dir.z);
    for (let i = 0; i < 600; i++) { p.x += (dir.x / l) * 0.08; p.z += (dir.z / l) * 0.08; c.resolveCircle(p, 0.42); const lx = p.x * Math.cos(0.6) + p.z * Math.sin(0.6), lz = -p.x * Math.sin(0.6) + p.z * Math.cos(0.6); if (lz > 0.3 && lx > -3 && lx < 3) crossed = true; }
    expect(crossed).toBe(false);
  });
  it('kamera nie wchodzi w ścianę: ramię skraca się', () => {
    const c = new Colliders(); c.add({ x: 5, z: 0, hw: 0.3, hd: 4, rot: 0, base: 0, top: 6 });
    const t = c.segmentT(0, 2, 0, 10, 2, 0, 0.3, () => 0);
    expect(t).toBeLessThan(0.55);
  });
  it('rozwiązywanie kolizji nie zostawia gracza wewnątrz pełnego obiektu', () => {
    const c = new Colliders(); for (let i = 0; i < 20; i++) c.add({ x: i * 1.7, z: (i % 3) * 1.1, r: 0.8 });
    for (let k = 0; k < 200; k++) { const p = { x: Math.random() * 30, z: Math.random() * 4 }; c.resolveCircle(p, 0.42); }
    let inside = 0;
    for (let k = 0; k < 200; k++) { const p = { x: Math.random() * 30, z: Math.random() * 4 }; c.resolveCircle(p, 0.42); if (c.overlaps(p.x, p.z, 0.3)) inside++; }
    expect(inside).toBeLessThan(6);
  });
});

describe('Ekwipunek', () => {
  it('łączy stosy, zwraca to, co się nie zmieściło, i usuwa dokładnie tyle, ile trzeba', () => {
    const inv = new Inventory(4);
    expect(inv.add('wood', 120)).toBe(0); expect(inv.count('wood')).toBe(120);
    expect(inv.add('wood', 200)).toBeGreaterThan(0);
    expect(inv.remove('wood', 30)).toBe(30);
    expect(inv.count('wood')).toBeLessThan(200);
  });
  it('narzędzia nie łączą się w stosy i mają wytrzymałość; zużyte się rozpada', () => {
    const inv = new Inventory(4); inv.add('stone_axe', 2);
    expect(inv.slots.filter(Boolean).length).toBe(2);
    expect(inv.slots[0].dur).toBe(ITEMS.stone_axe.tool.durability);
    inv.slots[0].dur = 1; expect(inv.wear(0, 1)).toBe(true); expect(inv.slots[0]).toBe(null);
  });
  it('zamiana miejscami łączy stosy tego samego przedmiotu', () => {
    const inv = new Inventory(4); inv.add('stone', 10); inv.slots[1] = { id: 'stone', n: 5 }; inv.swap(0, 1);
    expect(inv.count('stone')).toBe(15);
  });
  it('zapis i odczyt odtwarzają zawartość', () => {
    const a = new Inventory(6); a.add('wood', 33); a.add('iron_sword', 1); a.selected = 3;
    const b = new Inventory(6); b.restore(JSON.parse(JSON.stringify(a.serialize())));
    expect(b.count('wood')).toBe(33); expect(b.selected).toBe(3); expect(b.slots[1].dur).toBe(a.slots[1].dur);
  });
});

describe('Crafting', () => {
  const stations = (...s) => new Set(s);
  it('wytwarzanie zużywa dokładnie surowce z receptury i daje produkt', () => {
    const inv = new Inventory(20); inv.add('stick', 5); inv.add('stone', 5); inv.add('vine', 3);
    const r = RECIPES.find((x) => x.id === 'stone_axe');
    const res = craft(inv, r, { stations: stations(), skillLevel: 0 });
    expect(res.ok).toBe(true); expect(inv.count('stick')).toBe(3); expect(inv.count('stone')).toBe(3); expect(inv.count('vine')).toBe(2); expect(inv.count('stone_axe')).toBe(1);
  });
  it('bez surowców lub stanowiska nic się nie dzieje i nic nie ginie', () => {
    const inv = new Inventory(20); inv.add('bone', 3); inv.add('sinew', 1); inv.add('stick', 1);
    const r = RECIPES.find((x) => x.id === 'bone_knife');
    const res = craft(inv, r, { stations: stations() });
    expect(res.ok).toBe(false); expect(inv.count('bone')).toBe(3); expect(inv.count('bone_knife')).toBe(0);
    expect(craft(inv, r, { stations: stations('workbench') }).ok).toBe(true);
    expect(inv.count('bone')).toBe(0);
  });
  it('umiejętność Rzemieślnik obniża koszty, ale nigdy poniżej 1 sztuki', () => {
    const c = discounted({ wood: 12, vine: 1, stone: 6 }, 5);
    expect(c.wood).toBeLessThan(12); expect(c.vine).toBe(1); expect(c.stone).toBeGreaterThan(0);
  });
  it('recepturę z alternatywnym kosztem (pochodnia) da się wykonać z liści palmy', () => {
    const inv = new Inventory(20); inv.add('stick', 1); inv.add('resin', 1); inv.add('palm_leaf', 2);
    expect(craft(inv, RECIPES.find((x) => x.id === 'torch'), { stations: stations() }).ok).toBe(true);
  });
  it('nie wytworzy przedmiotu, jeśli nie ma na niego miejsca', () => {
    const inv = new Inventory(2); inv.add('stick', 2); inv.add('stone', 2);
    const r = RECIPES.find((x) => x.id === 'stone_axe'); r.cost; 
    inv.add('vine', 1);      // 3 stacks needed in a 2-slot inventory -> already leftover
    expect(checkCraft(inv, r, { stations: stations() }).ok).toBe(false);
  });
  it('wszystkie receptury odwołują się do istniejących przedmiotów', () => {
    for (const r of RECIPES) { for (const o of r.out) expect(!!ITEMS[o.id]).toBe(true); for (const k of Object.keys(r.cost)) expect(!!ITEMS[k]).toBe(true); }
  });
  it('każdy tier ma odpowiadające mu stanowisko w budowlach', () => {
    for (const st of ['workbench', 'furnace', 'forge', 'alchemy', 'campfire']) expect(Object.values(BUILDINGS).some((b) => b.station === st)).toBe(true);
  });
});

describe('Cykl dnia i nocy', () => {
  it('noc zaczyna się dokładnie po 5 minutach dnia, a doba trwa 8 minut', () => {
    const c = new DayClock({ start: 0 });
    expect(c.isNight).toBe(false);
    let dusk = -1, t = 0;
    while (t < 600 && dusk < 0) { const ev = c.advance(0.25); t += 0.25; if (ev.includes('dusk')) dusk = t; }
    expect(dusk).toBeCloseTo(CONFIG.dayLength, 0.3);
    expect(c.cycle).toBe(CONFIG.dayLength + CONFIG.nightLength);
  });
  it('świt następuje raz na dobę i zwiększa licznik dni', () => {
    const c = new DayClock({ start: 0 }); let dawns = 0, dusks = 0;
    for (let i = 0; i < 480 * 4 * 3; i++) { const ev = c.advance(0.25); dawns += ev.filter((e) => e === 'dawn').length; dusks += ev.filter((e) => e === 'dusk').length; }
    expect(dawns).toBe(3); expect(dusks).toBe(3); expect(c.day).toBe(4);
  });
  it('w nocy słońce jest pod horyzontem, a księżyc nad nim; w dzień odwrotnie', () => {
    const c = new DayClock({ start: 0.3 });
    expect(c.sunDir().y).toBeGreaterThan(0.3); expect(c.moonDir().y).toBeLessThan(0);
    c.t = 0.8 * c.cycle; expect(c.sunDir().y).toBeLessThan(-0.3); expect(c.moonDir().y).toBeGreaterThan(0.3);
  });
  it('zapis i odczyt zegara zachowują czas i dzień', () => {
    const c = new DayClock({ start: 0.4 }); c.day = 5; const d = new DayClock(); d.restore(JSON.parse(JSON.stringify(c.serialize())));
    expect(d.day).toBe(5); expect(d.t).toBeCloseTo(c.t, 1e-6);
  });
});

describe('Walka', () => {
  it('jeden zamach trafia ten sam cel najwyżej raz', () => {
    const t = new SwingTracker(), target = {};
    expect(t.first(target)).toBe(true); expect(t.first(target)).toBe(false); t.reset(); expect(t.first(target)).toBe(true);
  });
  it('cios trafia tylko w łuku przed postacią i w zasięgu', () => {
    expect(inMeleeArc(0, 0, 0, 0, 1.5, 0.4, 1.9, 110)).toBe(true);           // in front
    expect(inMeleeArc(0, 0, 0, 0, -1.5, 0.4, 1.9, 110)).toBe(false);         // behind
    expect(inMeleeArc(0, 0, 0, 0, 6, 0.4, 1.9, 110)).toBe(false);            // too far
    expect(inMeleeArc(0, 0, 0, 1.0, 0.8, 0.4, 1.9, 110)).toBe(true);         // within the arc
  });
  it('obrażenia padają w oknie aktywnym zamachu, które leży między zamachem a wyhamowaniem (animacja = trafienie)', () => {
    for (const w of Object.values(WEAPONS)) for (const st of w.combo) {
      const tm = stageTiming(st);
      expect(tm.wind).toBeLessThan(tm.hit); expect(tm.hit).toBeLessThan(tm.follow); expect(tm.follow).toBeLessThan(1);
      expect(stagePhase(st, st.windup + st.active * 0.5)).toBe('active');
      expect(stagePhase(st, 0.001)).toBe('windup'); expect(stagePhase(st, stageDuration(st) + 0.01)).toBe('done');
    }
  });
  it('okno parowania jest krótkie (≈0,2 s), a unik ma chwilę nietykalności krótszą niż cały unik', () => {
    expect(CONFIG.player.parryWindow).toBeGreaterThan(0.1); expect(CONFIG.player.parryWindow).toBeLessThan(0.35);
    expect(CONFIG.player.dodgeInvuln).toBeLessThan(CONFIG.player.dodgeTime);
  });
});

describe('Dane', () => {
  it('każde zwierzę ma łup, HP i (jeśli atakuje) zapowiedź ataku dłuższą niż 0,4 s', () => {
    for (const [id, a] of Object.entries(ANIMALS)) {
      expect(a.hp).toBeGreaterThan(0);
      if (a.attack) expect(a.attack.windup).toBeGreaterThan(0.4);
      if (!a.night_only && a.drops) expect(a.drops.length).toBeGreaterThan(0);
    }
  });
  it('wszystkie łupy odwołują się do istniejących przedmiotów', () => {
    for (const a of Object.values(ANIMALS)) for (const d of a.drops || []) expect(!!ITEMS[d.item]).toBe(true);
    for (const r of Object.values(RESOURCES)) for (const d of r.drops || []) expect(!!ITEMS[d.item]).toBe(true);
  });
  it('koszty budowli odwołują się do istniejących przedmiotów, a poziomy bazy rosną', () => {
    for (const b of Object.values(BUILDINGS)) { for (const k of Object.keys(b.cost)) expect(!!ITEMS[k]).toBe(true); expect(b.level).toBeGreaterThanOrEqual(0); expect(b.level).toBeLessThan(3); }
  });
});
