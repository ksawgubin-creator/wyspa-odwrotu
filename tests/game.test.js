// Behaviour tests that run against a real Game instance in the browser (tests.html): movement/collisions, combat, AI, base, save/load...
import { describe, it, expect } from './framework.js';
import { Game } from '../src/game.js';
import { BUILDINGS } from '../data/buildings.js';
import { CONFIG } from '../data/config.js';
import { RESOURCES } from '../data/resources.js';

let game = null;
async function G() {
  if (game) return game;
  const canvas = document.getElementById('game');
  game = new Game(canvas);
  await game.createWorld(20240607, () => {});
  game.mode = 'play'; game.input.enabled = true; game.audio.play = () => {};   // no sound in tests
  game.player.rig.root.visible = true;
  game.debug.god = false;
  return game;
}
const tick = (g) => { g.step(1 / 60); g.time += 1 / 60; };
const step = (g, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) tick(g); };
// put the player somewhere clean and reset transient combat state
function place(g, x, z, yaw = 0) {
  const p = g.player;
  p.pos.x = x; p.pos.z = z; p.pos.y = g.world.getHeight(x, z); p.prev = { ...p.pos }; p.vx = p.vz = p.vy = 0; p.grounded = true;
  p.yaw = yaw; g.cameraRig.yaw = yaw; p.atk = null; p.dodge = null; p.interact = null; p.stun = 0; p.invuln = 0; p.dead = false; p.deadT = -1; p.stats.health = p.stats.maxHealth; p.stats.stamina = p.stats.maxStamina;
  p.blocking = false; p.blockT = 0;
}
function clearEntities(g) { for (const e of g.entities.list) e.dispose(); g.entities.list.length = 0; for (const s of g.entities.slots) { s.entities = []; s.respawnAt = 1e9; } }
function keys(g, ...codes) { g.input.down.clear(); for (const c of codes) g.input.down.add(c); }
function freeSpot(g, x0, z0) {   // nearest dry, flat, obstacle-free point
  const w = g.world;
  for (let r = 0; r < 60; r += 1.5) for (let a = 0; a < 6.28; a += 0.5) { const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (w.getHeight(x, z) > 1 && w.getSlope(x, z) < 0.25 && !g.colliders.overlaps(x, z, 3.5) && g.field.nodes.every((n) => Math.hypot(n.x - x, n.z - z) > 3 || n.decor)) return { x, z }; }
  return { x: x0, z: z0 };
}

describe('Ruch i kolizje (pełna gra)', () => {
  it('gracz nie przejdzie przez drzewo, mimo że biegnie prosto na nie', async () => {
    const g = await G(); clearEntities(g);
    const tree = g.nodes.find((n) => n.type === 'tree_oak' && g.world.getSlope(n.x, n.z) < 0.3 && n.state === 'alive');
    place(g, tree.x, tree.z + 6, Math.PI);         // facing the tree (north = -z)
    keys(g, 'KeyW'); g.input.now = 10; let minD = 99;
    for (let i = 0; i < 300; i++) { g.step(1 / 60); minD = Math.min(minD, Math.hypot(g.player.pos.x - tree.x, g.player.pos.z - tree.z)); }
    keys(g);
    expect(minD).toBeGreaterThan(RESOURCES.tree_oak.radius * tree.scale + g.player.radius - 0.08);
  });
  it('gracz nie przejdzie przez postawiony mur ani przez zamkniętą bramę', async () => {
    const g = await G(); clearEntities(g);
    const spot = freeSpot(g, 30, 120);
    for (const t of ['palisade_wall', 'gate']) {
      const wall = g.buildings.place(t, spot.x, spot.z, 0, {});
      place(g, spot.x, spot.z + 5, Math.PI); keys(g, 'KeyW'); let crossed = false;
      for (let i = 0; i < 360; i++) { g.step(1 / 60); if (g.player.pos.z < spot.z - 0.6) crossed = true; }
      keys(g); g.buildings.remove(wall);
      expect(crossed).toBe(false);
    }
  });
  it('gracz nie wejdzie w głęboką wodę ani na pionowy klif', async () => {
    const g = await G(); clearEntities(g);
    const sp = g.world.spawn; place(g, sp.x, sp.z, 0);                        // facing south = +z, into the sea
    keys(g, 'KeyS'); for (let i = 0; i < 600; i++) g.step(1 / 60); keys(g);
    expect(g.world.waterDepth(g.player.pos.x, g.player.pos.z)).toBeLessThan(CONFIG.player.maxWadeDepth + 0.2);
  });
  it('gracz stoi na terenie: nie zapada się i nie lewituje po chodzie po wyspie', async () => {
    const g = await G(); clearEntities(g);
    place(g, 20, 100, Math.PI); keys(g, 'KeyW', 'KeyD'); let worst = 0;
    for (let i = 0; i < 400; i++) { g.step(1 / 60); if (g.player.grounded) worst = Math.max(worst, Math.abs(g.player.pos.y - g.world.getHeight(g.player.pos.x, g.player.pos.z))); }
    keys(g); expect(worst).toBeLessThan(0.01);
  });
});

describe('Walka (pełna gra)', () => {
  it('jeden zamach uderza w cel dokładnie raz', async () => {
    const g = await G(); clearEntities(g); const p = g.player; p.inventory.slots.fill(null); p.inventory.add('stone_axe', 1); p.inventory.select(0); p.syncHeld();
    place(g, 40, 100, 0);                                                     // facing +z
    const dummy = g.entities.spawn('boar', 40, 101.3, {}); dummy.hp = dummy.maxHp = 1000; dummy.stun = 999; dummy.fade = 1; dummy.anger = 0;
    let hits = 0; const orig = dummy.takeHit.bind(dummy); dummy.takeHit = (i) => { hits++; return orig(i); };
    g.input.buttonLatch[0] = true; g.input.locked = true;
    for (let i = 0; i < 100; i++) { g.step(1 / 60); if (i > 3) g.input.buttonLatch[0] = false; }
    expect(hits).toBe(1);
    dummy.dispose(); g.entities.list.length = 0;
  });
  it('combo: kolejne kliknięcie w oknie łączy 2. cios, a cios trafia po zapowiedzi (nie w chwili kliknięcia)', async () => {
    const g = await G(); clearEntities(g); const p = g.player; p.inventory.slots.fill(null); p.inventory.add('iron_sword', 1); p.inventory.select(0); p.syncHeld();
    place(g, 40, 100, 0);
    const dummy = g.entities.spawn('boar', 40, 101.4, {}); dummy.hp = dummy.maxHp = 5000; dummy.stun = 999; dummy.fade = 1;
    const times = []; const orig = dummy.takeHit.bind(dummy); dummy.takeHit = (i) => { times.push(g.time); return orig(i); };
    const t0 = g.time; g.input.buttonLatch[0] = true; g.input.locked = true; tick(g); g.input.buttonLatch[0] = false;
    for (let i = 0; i < 24; i++) tick(g);                                     // during the swing: buffer the next click
    g.input.buttonLatch[0] = true; tick(g); g.input.buttonLatch[0] = false;
    for (let i = 0; i < 80; i++) tick(g);
    expect(times.length).toBe(2);
    expect(times[0] - t0).toBeGreaterThan(0.1);                               // damage lands after the wind-up, not instantly
    expect(times[1]).toBeGreaterThan(times[0] + 0.25);
    dummy.dispose(); g.entities.list.length = 0;
  });
  it('unik daje krótką nietykalność: cios w trakcie uniku chybia, po uniku trafia', async () => {
    const g = await G(); clearEntities(g); place(g, 40, 100, 0);
    g.player.startDodge(0, 1, true);
    expect(g.player.takeHit({ damage: 30, dir: 0, source: null })).toBe('dodged');
    step(g, CONFIG.player.dodgeTime + 0.3);
    const hp = g.player.stats.health;
    expect(g.player.takeHit({ damage: 30, dir: 0, source: null })).toBe('hit');
    expect(g.player.stats.health).toBeLessThan(hp);
  });
  it('parowanie tuż po podniesieniu bloku ogłusza wroga i nie ranie; późniejszy blok tylko osłabia cios', async () => {
    const g = await G(); clearEntities(g); const p = g.player; place(g, 40, 100, 0);
    const wolf = g.entities.spawn('wolf', 40, 103, {}); wolf.fade = 1; wolf.yaw = Math.PI;
    p.blocking = true; p.blockT = 0.05;
    const dir = Math.atan2(p.pos.x - wolf.x, p.pos.z - wolf.z);
    const hp = p.stats.health;
    expect(p.takeHit({ damage: 20, dir, source: wolf })).toBe('parried');
    expect(p.stats.health).toBe(hp); expect(wolf.stun).toBeGreaterThan(1);
    p.blockT = 0.6;
    expect(p.takeHit({ damage: 20, dir, source: wolf })).toBe('blocked');
    expect(hp - p.stats.health).toBeLessThan(10);
    p.blocking = false; wolf.dispose(); g.entities.list.length = 0;
  });
  it('siekiera ścina drzewo: ubywa HP przy każdym zamachu, drzewo pada, wypada drewno, a potem odrasta', async () => {
    const g = await G(); clearEntities(g); const p = g.player; p.inventory.slots.fill(null); p.inventory.add('stone_axe', 1); p.inventory.select(0); p.syncHeld();
    const tree = g.nodes.find((n) => n.type === 'tree_pine' && n.state === 'alive' && g.world.getSlope(n.x, n.z) < 0.3);
    place(g, tree.x + 1.7, tree.z + 1.7, Math.atan2(-1.7, -1.7));
    const drops0 = g.drops.list.length; let guard = 0, last = tree.hp;
    while (tree.state === 'alive' && guard++ < 14) { g.input.buttonLatch[0] = true; g.input.locked = true; for (let i = 0; i < 45; i++) { g.step(1 / 60); g.input.buttonLatch[0] = false; } if (tree.state === 'alive') { expect(tree.hp).toBeLessThan(last); last = tree.hp; } }
    expect(tree.state).toBe('felled');
    expect(g.drops.list.length).toBeGreaterThan(drops0);
    expect(g.drops.list.some((d) => d.id === 'wood')).toBe(true);
    g.field.time += 5000; tree.respawnAt = 0; g.player.pos.x += 30; g.field.update(0.1, { x: 500, z: 500 });    // far away: it may regrow
    expect(tree.state).toBe('alive');
  });
});

describe('Zwierzęta i AI (pełna gra)', () => {
  it('za dnia wataha wilków ucieka przed graczem, w nocy poluje i okrąża', async () => {
    const g = await G(); clearEntities(g); place(g, 60, 90, 0);
    g.debug.setTime(0.2);
    const P = new g.PackClass(g); const ws = [0, 1, 2].map((i) => { const w = g.entities.spawn('wolf', 60 + i * 2, 90 + 12, { pack: P }); w.fade = 1; return w; });
    step(g, 3);
    expect(P.hunting).toBe(false); expect(ws.some((w) => w.mode === 'flee')).toBe(true);
    g.debug.setTime(0.8); step(g, 6);
    expect(P.hunting).toBe(true); expect(ws.some((w) => w.mode === 'circle' || w.mode === 'chase' || w.mode === 'windup')).toBe(true);
    for (const w of ws) w.dispose(); g.entities.list.length = 0;
  });
  it('dzik za dnia ucieka, ale zaatakowany szarżuje; szarża jest zapowiedziana (telegraph > 0) zanim uderzy', async () => {
    const g = await G(); clearEntities(g); place(g, 60, 90, 0); g.debug.setTime(0.2);
    const b = g.entities.spawn('boar', 60, 100, {}); b.fade = 1; b.cooldown = 0;
    step(g, 1.5); expect(b.mode).toBe('flee');
    b.anger = 1; b.angerT = 30; let sawTele = false, hit = false; const hp0 = g.player.stats.health;
    for (let i = 0; i < 600; i++) { g.step(1 / 60); if (b.telegraph > 0.3) sawTele = true; if (g.player.stats.health < hp0) { hit = true; break; } }
    expect(sawTele).toBe(true);
    b.dispose(); g.entities.list.length = 0;
  });
  it('wróg nigdy nie trafia „z niczego”: przed każdym uderzeniem mija co najmniej 0,5 s zapowiedzi', async () => {
    const g = await G(); clearEntities(g); place(g, 60, 90, 0); g.debug.setTime(0.8);
    const sh = g.entities.spawn('shadow', 60, 92.2, { nightSpawned: true }); sh.fade = 1; sh.cooldown = 0;
    let tStart = null, tHit = null; const hp0 = g.player.stats.health;
    for (let i = 0; i < 300; i++) { tick(g); if (sh.atk && sh.atk.phase === 'windup' && tStart === null) tStart = g.time; if (g.player.stats.health < hp0 && tHit === null) tHit = g.time; }
    expect(tStart !== null).toBe(true);
    if (tHit !== null) expect(tHit - tStart).toBeGreaterThan(0.5);
    sh.dispose(); g.entities.list.length = 0;
  });
  it('Cieniaki boją się światła: przy ognisku uciekają, a bez światła atakują', async () => {
    const g = await G(); clearEntities(g); g.debug.setTime(0.8);
    const spot = freeSpot(g, 20, 80); place(g, spot.x, spot.z, 0);
    const fire = g.buildings.place('campfire', spot.x + 0.5, spot.z + 6, 0, { fuel: 800 });
    const sh = g.entities.spawn('shadow', spot.x + 0.5, spot.z + 10, { nightSpawned: true }); sh.fade = 1; sh.courage = 0.2;
    step(g, 2);
    expect(sh.mode === 'flee' || sh.mode === 'circle').toBe(true);
    g.buildings.remove(fire); sh.courage = 0.2; step(g, 3);
    expect(sh.mode === 'chase' || sh.mode === 'windup' || sh.mode === 'attack').toBe(true);
    sh.dispose(); g.entities.list.length = 0;
  });
  it('wrogowie niszczą mury: uszkodzenia rosną etapami aż do zniszczenia', async () => {
    const g = await G(); clearEntities(g); g.debug.setTime(0.8);
    const spot = freeSpot(g, 30, 60); place(g, spot.x, spot.z + 20, 0);
    const wall = g.buildings.place('palisade_wall', spot.x, spot.z, 0, {}); const stages = new Set([wall.stage]);
    const sh = g.entities.spawn('shadow', spot.x, spot.z + 4, { nightSpawned: true, dmgMul: 3 }); sh.fade = 1; sh.tStruct = true; sh.structTarget = wall; sh.courage = 9;
    for (let i = 0; i < 60 * 40 && g.buildings.list.includes(wall); i++) { g.step(1 / 60); g.time += 1 / 60; stages.add(wall.stage); sh.playerDist = 20; }
    expect(g.buildings.list.includes(wall)).toBe(false);
    expect(stages.size).toBeGreaterThan(1);
    sh.dispose(); g.entities.list.length = 0;
  });
});

describe('Baza (pełna gra)', () => {
  it('żaden postawiony budynek nie wisi nad terenem ani nie leży pod nim (fundament sięga w dół)', async () => {
    const g = await G(); clearEntities(g); g.buildings.level = 2;
    const spot = freeSpot(g, 40, 100); let x = spot.x - 12, count = 0;
    for (const t of Object.keys(BUILDINGS)) {
      if (BUILDINGS[t].upgradeOnly && t !== 'hearth') continue; if (t === 'raft' || t === 'signal_fire') continue;
      const s = g.buildings.place(t, x, spot.z, 0, {}); x += 3.3; if (x > spot.x + 25) { x = spot.x - 12; }
      const sz = s.info?.size || { w: 2, d: 2 };
      let hmin = 1e9; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) hmin = Math.min(hmin, g.world.getHeight(s.x + (i / 4 - 0.5) * sz.w * 0.8, s.z + (j / 4 - 0.5) * sz.d * 0.8));
      expect(s.y).toBeLessThan(hmin + 0.9); expect(s.y).toBeGreaterThan(hmin - 0.2);
      g.buildings.remove(s); count++;
    }
    expect(count).toBeGreaterThan(15);
  });
  it('podgląd budowy jest czerwony na wodzie i zielony na suchym, płaskim terenie', async () => {
    const g = await G(); clearEntities(g); const p = g.player; p.inventory.add('wood', 200); p.inventory.add('vine', 30);
    const sp = g.world.spawn; place(g, sp.x, sp.z - 6, 0);
    g.buildings.startPlacement('palisade_wall'); const P = g.buildings.placing;
    g.buildings.aimPoint = () => ({ x: sp.x, z: sp.z + 14 });                 // in the sea
    g.buildings.computePlacement(); expect(P.valid).toBe(false);
    const spot = freeSpot(g, 30, 60); g.buildings.aimPoint = () => ({ x: spot.x, z: spot.z }); place(g, spot.x, spot.z + 6, 0);
    g.buildings.computePlacement(); expect(P.valid).toBe(true);
    g.buildings.cancelPlacement(); delete g.buildings.aimPoint;
  });
  it('poziom bazy rośnie dopiero po zebraniu surowców i zbudowaniu wymaganych budowli', async () => {
    const g = await G(); clearEntities(g); const B = g.buildings; B.level = 0; g.player.inventory.slots.fill(null);
    expect(B.upgradeCheck().ok).toBe(false);
    for (const [id, n] of [['wood', 60], ['stone', 40], ['stick', 20]]) g.player.inventory.add(id, n);
    expect(B.upgradeCheck().ok).toBe(false);                                   // still missing the workbench and the shelter
    const spot = freeSpot(g, 30, 60); const a = B.place('workbench', spot.x, spot.z, 0, {}), b = B.place('leanto', spot.x + 6, spot.z, 0, {});
    expect(B.upgradeCheck().ok).toBe(true); B.upgradeBase(); expect(B.level).toBe(1); B.remove(a); B.remove(b);
  });
  it('ognisko zużywa opał i gaśnie; stanowisko „ognisko” dostępne tylko, gdy płonie', async () => {
    const g = await G(); clearEntities(g); const spot = freeSpot(g, 30, 60); place(g, spot.x, spot.z + 2, 0);
    const f = g.buildings.place('campfire', spot.x, spot.z, 0, { fuel: 2 });
    expect(g.buildings.stationsNear(spot.x, spot.z + 2).has('campfire')).toBe(true);
    step(g, 3); expect(f.lit).toBe(false);
    g.buildings.stationCache.t = -1; expect(g.buildings.stationsNear(spot.x, spot.z + 2).has('campfire')).toBe(false);
    g.buildings.remove(f);
  });
  it('spanie działa tylko nocą i bez wrogów w pobliżu; ustawia punkt odrodzenia', async () => {
    const g = await G(); clearEntities(g); const spot = freeSpot(g, 30, 60);
    const hut = g.buildings.place('leanto', spot.x, spot.z, 0, {});
    g.debug.setTime(0.2); let acts = g.buildings.actions(hut); expect(acts.find((a) => a.label.startsWith('Prześpij')).enabled).toBe(false);
    g.debug.setTime(0.8); acts = g.buildings.actions(hut); expect(acts.find((a) => a.label.startsWith('Prześpij')).enabled).toBe(true);
    acts.find((a) => a.label.startsWith('Ustaw punkt')).run(); expect(Math.hypot(g.respawnPoint.x - hut.x, g.respawnPoint.z - hut.z)).toBeLessThan(0.01);
    g.buildings.remove(hut);
  });
});

describe('Przetrwanie, zapis i świat (pełna gra)', () => {
  it('głód i pragnienie maleją z czasem; pieczone mięso syci, surowe może zatruć', async () => {
    const g = await G(); clearEntities(g); place(g, 60, 90, 0); g.debug.setTime(0.2); const st = g.player.stats; st.hunger = 60; st.thirst = 60; g.survival.buffs = {};
    step(g, 20); expect(st.hunger).toBeLessThan(60); expect(st.thirst).toBeLessThan(60);
    const h0 = st.hunger; g.survival.consume('cooked_meat'); expect(st.hunger).toBeGreaterThan(h0 + 20);
    const rnd = Math.random; Math.random = () => 0; g.survival.consume('raw_meat'); Math.random = rnd;
    expect(g.survival.hasBuff('poison')).toBe(true);
  });
  it('nocą w ciemności rośnie strach, a ognisko go obniża', async () => {
    const g = await G(); clearEntities(g); const spot = freeSpot(g, 30, 60); place(g, spot.x, spot.z, 0); g.debug.setTime(0.8); g.player.stats.fear = 0; g.survival.buffs = {};
    step(g, 10); const dark = g.player.stats.fear; expect(dark).toBeGreaterThan(5);
    const f = g.buildings.place('campfire', spot.x, spot.z + 2, 0, { fuel: 800 }); step(g, 8);
    expect(g.player.stats.fear).toBeLessThan(dark); g.buildings.remove(f);
  });
  it('zapis i wczytanie odtwarzają ekwipunek, pozycję, zegar, budynki i ścięte drzewa', async () => {
    const g = await G(); clearEntities(g); const spot = freeSpot(g, 30, 60); place(g, spot.x, spot.z, 1);
    g.player.inventory.slots.fill(null); g.player.inventory.add('wood', 17); g.player.inventory.add('iron_sword', 1); g.player.stats.hunger = 42; g.debug.setTime(0.7); g.clock.day = 4;
    const b = g.buildings.place('chest', spot.x + 4, spot.z, 0, {}); b.inv.add('stone', 9);
    const tree = g.nodes.find((n) => n.type === 'tree_oak' && n.state === 'alive'); g.field.remove(tree, 1, 0);
    const snap = JSON.parse(JSON.stringify(g.save.snapshot()));
    // wreck the state
    g.player.inventory.slots.fill(null); g.player.pos.x += 50; g.player.stats.hunger = 100; g.clock.day = 1; g.buildings.remove(b); g.field.restoreNode(tree); g.field.growing.clear(); tree.grow = 1;
    g.save.apply(snap);
    expect(g.player.inventory.count('wood')).toBe(17); expect(g.player.inventory.count('iron_sword')).toBe(1);
    expect(Math.hypot(g.player.pos.x - spot.x, g.player.pos.z - spot.z)).toBeLessThan(0.01);
    expect(g.player.stats.hunger).toBeCloseTo(42, 0.01); expect(g.clock.day).toBe(4);
    const chest = g.buildings.list.find((s) => s.type === 'chest'); expect(!!chest).toBe(true); expect(chest.inv.count('stone')).toBe(9);
    expect(tree.state).toBe('felled');
    g.buildings.remove(chest);
  });
  it('noc zaczyna się w chwili, gdy zegar przekracza 5:00 dnia, i uruchamia dyrektora fal', async () => {
    const g = await G(); clearEntities(g); place(g, 60, 90, 0); g.clock.day = 2; g.clock.t = g.clock.dayLength - 1; g.clock.prevNight = false;
    g.entities.director.active = false; expect(g.clock.isNight).toBe(false);
    step(g, 2.5); expect(g.clock.isNight).toBe(true); expect(g.entities.director.active).toBe(true);
  });
  it('piorun odsłania rudę ukrytą przy głazie', async () => {
    const g = await G(); const hid = g.nodes.find((n) => n.hidden && n.type.startsWith('ore_'));
    expect(hid.state).toBe('gone'); g.field.revealNear(hid.x, hid.z, 3); expect(hid.state).toBe('alive'); expect(!!hid.collider).toBe(true);
  });
  it('jaskinia: wejście i wyjście przenoszą gracza tam i z powrotem', async () => {
    const g = await G(); clearEntities(g); g.fadeEl = g.fadeEl || document.createElement('div');
    const orig = g.teleport.bind(g); g.teleport = (x, z, yaw) => { const p = g.player; p.pos.x = x; p.pos.z = z; p.pos.y = g.world.getHeight(x, z) + 0.05; p.prev = { ...p.pos }; };
    g.cave.use('enter'); expect(g.world.isCave(g.player.pos.x, g.player.pos.z)).toBe(true);
    expect(g.player.pos.y).toBeLessThan(5);
    g.cave.use('exit'); expect(g.world.isCave(g.player.pos.x, g.player.pos.z)).toBe(false);
    g.teleport = orig;
  });
  it('notatki: przeczytanie zapisuje ją w dzienniku; wszystkie 8 da się znaleźć', async () => {
    const g = await G(); const n = g.nodes.find((x) => x.type === 'note'); g.mode = 'play'; g.openPanel = () => {}; g.readNote(n);
    expect(g.events.notesFound.has(n.noteId)).toBe(true);
    expect(g.nodes.filter((x) => x.type === 'note' && g.world.getHeight(x.x, x.z) > 0.5).length).toBe(8);
  });
  it('tratwa: bez żagla i steru nie można odpłynąć; z kompletem zaczyna się ostatnia noc z bossem', async () => {
    const g = await G(); clearEntities(g); g.buildings.level = 1; const sp = g.world.spawn;
    const raft = g.buildings.place('raft', sp.x, sp.z - 3, 0, {});
    expect(g.ending.canBegin(raft)).toBe(false);
    raft.sail = true; raft.rudder = true; expect(g.ending.canBegin(raft)).toBe(true);
    g.ending.begin(raft); expect(g.ending.active).toBe(true); expect(g.clock.isNight).toBe(true);
    g.clock.t = g.clock.dayLength + 0.2 * (g.clock.cycle - g.clock.dayLength); step(g, 2);
    expect(!!g.ending.boss).toBe(true);
    let shown = null; g.showEnding = (t) => { shown = t; }; g.ending.onDawn(); step(g, 12);
    expect(g.ending.cine !== null || shown !== null).toBe(true);
    g.ending.active = false; g.ending.cine = null; g.buildings.remove(raft); clearEntities(g);
  });
});
