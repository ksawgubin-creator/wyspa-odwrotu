// Game: owns the renderer, the world and every subsystem; runs the fixed-step loop and the game modes.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from '../data/config.js';
import { ITEMS } from '../data/items.js';
import { RESOURCES, LOOT } from '../data/resources.js';
import { World, BIOME } from './world/worldgen.js';
import { generateNodes } from './world/placement.js';
import { Colliders } from './world/colliders.js';
import { Terrain } from './world/terrain.js';
import { Water } from './world/water.js';
import { Atmosphere } from './world/sky.js';
import { ResourceField } from './world/vegetation.js';
import { Grass } from './world/grass.js';
import { DayClock } from './engine/daytime.js';
import { Input } from './engine/input.js';
import { shared } from './gfx/materials.js';
import { FX } from './gfx/fx.js';
import { Player } from './player/player.js';
import { CameraRig } from './player/camera.js';
import { Drops } from './entities/drops.js';
import { LightPool } from './world/lights.js';
import { EntityManager } from './entities/manager.js';
import { ANIMALS } from '../data/animals.js';
import { BuildingSystem } from './building/building.js';
import { Survival } from './player/survival.js';
import { Projectiles } from './entities/projectiles.js';
import { Weather } from './world/weather.js';
import { CaveSystem } from './world/cave.js';
import { Volcano } from './world/volcano.js';
import { Events } from './world/events.js';
import { Ending } from './world/ending.js';
import { TradeUI, NoteUI, EndScreen } from './ui/trade-ui.js';
import { CraftUI, BuildUI, ContextMenu } from './ui/panels.js';
import { checkCraft, craft as doCraft } from './crafting/crafting.js';
import { BUILDINGS } from '../data/buildings.js';
import { AudioManager } from './audio/audio.js';
import { SaveSystem } from './save/save.js';
import { MapSystem } from './ui/minimap.js';
import { HUD } from './ui/ui.js';
import { InventoryUI } from './ui/inventory-ui.js';
import { Menus, DebugPanel } from './ui/menus.js';
import { itemName } from '../data/items.js';
import { clamp, lerp, damp } from './engine/util.js';

const QUALITY = {
  low: { dpr: 1, shadow: 0, bloom: false, grass: 0.35, samples: 0 },
  medium: { dpr: 1.5, shadow: 1024, bloom: true, grass: 0.7, samples: 2 },
  high: { dpr: 2, shadow: 2048, bloom: true, grass: 1, samples: 4 },
};
const DIFFICULTY = { easy: { dmgIn: 0.7, hunger: 0.7, spawn: 0.7 }, normal: { dmgIn: 1, hunger: 1, spawn: 1 }, hard: { dmgIn: 1.35, hunger: 1.3, spawn: 1.3 } };   // ROBOCZE

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.params = new URLSearchParams(location.search);
    this.settings = { master: 0.8, sfx: 0.9, ambient: 0.7, sensitivity: 1, invertY: false, fov: CONFIG.camera.fov, quality: 'high', ...this.loadSettings() };
    this.difficulty = 'normal'; this.hardcore = false;
    this.mode = 'boot';                    // boot | menu | play | panel | pause | dead
    this.time = 0; this.alpha = 1; this.acc = 0; this.clockSpeed = 1; this.hitStopT = 0; this.hurtFlash = 0;
    this.interactTarget = null;
    this.debug = this.makeDebug();
    this.initRenderer();
    this.input = new Input(canvas);
    this.audio = new AudioManager(this);
    this.save = new SaveSystem(this);
    this.fx = new FX(this);
    this.atmos = new Atmosphere(this.scene, this.renderer);
    this.lights = new LightPool(this);
    this.applyAllSettings();
    this.wireInput();
  }

  loadSettings() { try { return JSON.parse(localStorage.getItem('wo_settings') || '{}'); } catch (e) { return {}; } }
  saveSettings() { try { localStorage.setItem('wo_settings', JSON.stringify(this.settings)); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------------------------------------
  initRenderer() {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(window.innerWidth, window.innerHeight, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 1800);
    this.camera.position.set(0, 20, 0); this.scene.add(this.camera);
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(r, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.32, 0.65, 1.6);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  applyAllSettings() { for (const k of ['quality', 'master', 'sensitivity', 'invertY', 'fov']) this.applySetting(k, this.settings[k], true); }
  applySetting(k, v, silent = false) {
    this.settings[k] = v;
    switch (k) {
      case 'quality': {
        const q = QUALITY[v] || QUALITY.high;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.dpr));
        this.composer.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, q.dpr));
        this.bloom.enabled = q.bloom;
        for (const rt of [this.composer.renderTarget1, this.composer.renderTarget2]) { rt.samples = q.samples; rt.dispose(); }
        this.atmos.setShadowQuality(q.shadow); this.renderer.shadowMap.enabled = q.shadow > 0;
        if (this.grass) { this.grass.density = q.grass; this.grass.clear(); }
        this.resize();
        break;
      }
      case 'master': case 'sfx': case 'ambient': this.audio.setVolumes({ [k]: v }); break;
      case 'sensitivity': if (this.cameraRig) this.cameraRig.sens = CONFIG.camera.sensitivity * v; break;
      case 'invertY': if (this.cameraRig) this.cameraRig.invertY = v; break;
      case 'fov': if (this.cameraRig) { this.camera.fov = v; this.camera.updateProjectionMatrix(); } CONFIG.camera.fov = v; break;
    }
    if (!silent) this.saveSettings();
  }
  setDifficulty(d) { this.difficulty = d; }
  get diff() { return DIFFICULTY[this.difficulty] || DIFFICULTY.normal; }

  // ---------------------------------------------------------------------------------------------
  // World lifecycle
  async createWorld(seed, progress = () => {}) {
    const tick = () => new Promise((r) => setTimeout(r, 0));
    this.disposeWorld();
    progress(0.05, 'Wznoszę wyspę…'); await tick();
    this.world = new World(seed);
    progress(0.25, 'Sadzę drzewa…'); await tick();
    this.nodes = generateNodes(this.world);
    this.colliders = new Colliders();
    this.terrain = new Terrain(this.scene, this.world);
    progress(0.45, 'Rzeźbię teren…'); await tick();
    this.field = new ResourceField({ scene: this.scene, world: this.world, colliders: this.colliders, nodes: this.nodes });
    progress(0.7, 'Napełniam morze…'); await tick();
    this.water = new Water(this.scene, this.world);
    this.grass = new Grass(this.scene, this.world);
    this.grass.density = (QUALITY[this.settings.quality] || QUALITY.high).grass;
    this.clock = new DayClock();
    this.map = new MapSystem(this.world);
    this.drops = new Drops(this);
    this.player = new Player(this);
    this.player.rig.root.visible = false;
    this.PackClass = (await import('./ai/brains.js')).Pack;
    this.cameraRig = new CameraRig(this);
    this.cameraRig.sens = CONFIG.camera.sensitivity * this.settings.sensitivity; this.cameraRig.invertY = this.settings.invertY;
    this.cave = new CaveSystem(this);
    this.volcano = new Volcano(this);
    this.weather = new Weather(this);
    this.survival = new Survival(this);
    this.projectiles = new Projectiles(this);
    try { this.models = await import('./gfx/buildings.js'); } catch (e) { console.warn('buildings models missing', e); this.models = null; }
    this.buildings = new BuildingSystem(this, this.models);
    this.events = new Events(this);
    this.ending = new Ending(this);
    this.playTime = 0;
    this.respawnPoint = null;
    this.entities = new EntityManager(this);
    this.afterWorldCreated?.();
    progress(0.95, 'Prawie gotowe…'); await tick();
    this.terrain.update(this.player.pos.x, this.player.pos.z, Infinity);
    if (!this.hud) {
      this.hud = new HUD(this); this.invUI = new InventoryUI(this); this.craftUI = new CraftUI(this); this.buildUI = new BuildUI(this); this.ctxMenu = new ContextMenu(this); this.tradeUI = new TradeUI(this); this.noteUI = new NoteUI(this); this.endScreen = new EndScreen(this); this.menus = new Menus(this); this.dbg = new DebugPanel(this);
      this.fadeEl = document.createElement('div'); this.fadeEl.className = 'fadeblack'; document.body.appendChild(this.fadeEl);
    }
    this.hud.refreshHotbar();
    progress(1, 'Gotowe'); await tick();
  }
  disposeWorld() {
    if (!this.world) return;
    if (this.weather) { this.scene.remove(this.weather.rain); }
    if (this.cave) this.scene.remove(this.cave.group); if (this.volcano) this.scene.remove(this.volcano.mesh);
    this.buildings?.dispose(); if (this.projectiles) this.scene.remove(this.projectiles.group);
    for (const o of [this.terrain?.group, this.field?.group, this.water?.mesh, this.grass?.group, this.drops?.group, this.player?.rig?.root]) if (o) { this.scene.remove(o); o.traverse?.((c) => { c.geometry?.dispose?.(); }); }
    this.field?.geoCache.forEach((g) => g.dispose());
    this.entities?.dispose?.();
    this.water?.heightTex.dispose();
    this.world = null;
  }

  // ---------------------------------------------------------------------------------------------
  async startGame(opts = {}) {
    this.audio.init();
    const loading = document.getElementById('loading'); const fill = document.getElementById('loading-fill'), text = document.getElementById('loading-text');
    const prog = (f, t) => { fill.style.width = `${f * 100}%`; text.textContent = t; };
    let data = null, seed = opts.seed ?? this.world.seed;
    if (opts.load) { data = this.save.read(); if (!data) return; seed = data.seed; }
    loading.classList.remove('hide'); await new Promise((r) => setTimeout(r, 30));
    this.menus.hideMain(); this.menus.hideOverlay();
    this.difficulty = opts.diff || 'normal'; this.hardcore = !!opts.hardcore;
    await this.createWorld(seed ?? 20240607, prog);
    if (data) this.save.apply(data);
    else this.clock.t = CONFIG.startTimeOfDay * this.clock.cycle;
    this.player.rig.root.visible = true;
    this.map.markers.length = 0;
    this.map.reveal(this.player.pos.x, this.player.pos.z, 30);
    this.cameraRig.yaw = data ? data.player.yaw : this.player.yaw;
    this.hud.show(true); this.mode = 'play';
    this.input.enabled = true; this.input.clearLatches(); this.input.requestLock();
    loading.classList.add('hide');
    this.lastAutosave = this.time;
    if (!data) { this.hud.banner('Rozbitek', 'Wyrzuciło Cię na brzeg. Przetrwaj.', 4.5); this.notify('Rozejrzyj się po wraku – może znajdziesz coś przydatnego.'); }
    this.afterStart?.(!!data);
  }
  toMainMenu() {
    this.mode = 'menu'; this.input.exitLock(); this.input.enabled = false; this.hud.show(false); this.menus.hidePause(); this.menus.hideOverlay(); this.invUI.close();
    this.player.rig.root.visible = false; this.menus.showMain();
  }
  pauseGame() { if (this.mode !== 'play') return; this.mode = 'pause'; this.input.enabled = false; this.input.exitLock(); this.menus.showPause(); this.save.save(); }
  resume() { this.menus.hidePause(); this.menus.hideOverlay(); this.mode = 'play'; this.input.enabled = true; this.input.clearLatches(); this.input.requestLock(); }
  openPanel(name, arg) {
    if (this.mode !== 'play') return;
    this.mode = 'panel'; this.panel = name; this.input.enabled = false; this.input.exitLock();
    if (name === 'inventory') this.invUI.open();
    if (name === 'container') this.invUI.open(arg);
    if (name === 'map') this.menus.showMap();
    if (name === 'craft') this.craftUI.open(arg?.stations, arg?.tab);
    if (name === 'build') this.buildUI.open();
    if (name === 'context') this.ctxMenu.open(arg);
    if (name === 'trade') this.tradeUI.open();
    if (name === 'note') this.noteUI.open(arg);
    this.audio.play('ui');
  }
  closePanel() {
    if (this.mode !== 'panel') return;
    const pn = this.panel;
    if (pn === 'inventory' || pn === 'container') this.invUI.close();
    if (pn === 'map') this.menus.hideMap();
    if (pn === 'craft') this.craftUI.close();
    if (pn === 'build') this.buildUI.close();
    if (pn === 'context') this.ctxMenu.close();
    if (pn === 'trade') this.tradeUI.close();
    if (pn === 'note') this.noteUI.close();
    this.panel = null; this.mode = 'play'; this.input.enabled = true; this.input.clearLatches(); this.input.requestLock();
  }
  currentStations() { return this.buildings.stationsNear(this.player.pos.x, this.player.pos.z); }
  openCraft(stations = null, tab = 'craft') { this.openPanel('craft', { stations, tab }); }
  openContainer(struct) { if (this.mode === 'panel') this.closePanel(); this.openPanel('container', struct); }
  beginPlacement(type) { this.closePanel(); this.buildings.startPlacement(type); }
  craftRecipe(r, ctx) {
    const res = doCraft(this.player.inventory, r, ctx);
    if (!res.ok) { this.notify(res.reason, 'warn'); return res; }
    this.audio.play('craft'); this.player.stats_.crafted += r.out.reduce((a, o) => a + o.n, 0);
    this.notify(`Wytworzono: ${r.out.map((o) => `${o.n > 1 ? o.n + '× ' : ''}${itemName(o.id)}`).join(', ')}`, 'good');
    this.player.gainXp(2 + r.tier * 2);
    return res;
  }
  useItem(idx) {
    const p = this.player, inv = p.inventory, it = inv.slots[idx]; if (!it) return;
    const d = ITEMS[it.id];
    if (d.food) { if (this.survival.consume(it.id)) { it.n--; if (it.n <= 0) inv.slots[idx] = null; inv.changed(); } }
    else if (d.armor) p.equip(idx);
    else if (d.place) { this.closePanel(); this.beginPlacement(d.place); }
    else if (idx >= 9 && (d.tool || d.weapon)) inv.swap(idx, inv.selected);
    else if (d.tool || d.weapon) inv.select(idx);
  }
  quickMove(tag, idx) {
    const ui = this.invUI, from = ui.invOf(tag), to = tag === 'c' ? this.player.inventory : ui.container?.inv;
    if (!from || !to) return; const it = from.slots[idx]; if (!it) return;
    const left = to.add(it.id, it.n, { dur: it.dur }); it.n = left; if (left <= 0) from.slots[idx] = null; from.changed(); to.changed();
  }
  sleepIn(s) {
    if (!this.clock.isNight) return;
    this.closePanel();
    this.respawnPoint = { x: s.x, z: s.z };
    this.fadeEl.classList.add('on'); this.mode = 'dead'; this.input.enabled = false;   // freeze input while fading
    setTimeout(() => {
      const secs = this.clock.secondsToDawn + 0.02;
      const st = this.player.stats; st.hunger = Math.max(8, st.hunger - 18); st.thirst = Math.max(8, st.thirst - 24); st.health = Math.min(st.maxHealth, st.health + 40); st.fear = 0;
      for (const e of this.clock.advance(secs)) this.onClockEvent(e);
      for (const e of this.entities.list) if (e.nightSpawned) e.remove = true;
      this.mode = 'play'; this.input.enabled = true; this.input.clearLatches();
      this.fadeEl.classList.remove('on'); this.notify('Odpocząłeś. Nowy dzień zaczyna się.', 'good'); this.save.save();
    }, 1400);
  }
  toggleTower(s) {
    const p = this.player, pf = s.info?.platform;
    if (!pf) return;
    this.closePanel();
    if (p.onTower === s) { const q = { x: s.x + Math.sin(s.ry) * 2.2, z: s.z + Math.cos(s.ry) * 2.2 }; p.pos.x = q.x; p.pos.z = q.z; p.onTower = null; p.pos.y = this.world.getHeight(q.x, q.z); p.grounded = true; }
    else { p.pos.x = s.x; p.pos.z = s.z; p.pos.y = s.y + pf.y + 0.05; p.onTower = s; p.grounded = true; p.vx = p.vz = 0; this.notify('Z wieży widzisz dalej. Użyj łuku!'); }
    p.prev = { ...p.pos };
  }
  // where monsters go: the player, or a structure of the base
  pickMonsterTarget(e) {
    const p = this.player;
    if (e.tStruct === undefined) e.tStruct = e.def.boss || (e.def.brain === 'shadow' && this.clock.day >= 2 && Math.random() < 0.5);
    if (e.tStruct && e.playerDist > 9 && this.buildings.list.length) {
      const s = e.structTarget && this.buildings.list.includes(e.structTarget) ? e.structTarget : (e.structTarget = this.buildings.nearestTarget(e.x, e.z, 60, (q) => q.def.cat !== 'trap'));
      if (s) return { x: s.x, z: s.z, struct: s, half: Math.max(s.info?.size?.w || 1, s.info?.size?.d || 1) / 2 };
    }
    return p.pos;
  }
  serializeExtra() { return { survival: this.survival.serialize(), buildings: this.buildings.serialize(), respawn: this.respawnPoint, events: this.events.serialize(), ending: this.ending.serialize(), weather: { kind: this.weather.kind }, playTime: this.playTime }; }
  restoreExtra(x) { this.survival.restore(x.survival); this.respawnPoint = x.respawn || null; this.buildings.restore(x.buildings); this.events.restore(x.events); this.ending.restore(x.ending); this.playTime = x.playTime || 0; }
  bloodMoonTonight() { return this.clock.day % 7 === 0; }
  readNote(n) { this.events.notesFound.add(n.noteId); this.audio.play('ui'); this.openPanel('note', n.noteId); }
  showEnding(type) { this.mode = 'dead'; this.endScreen.show(type); this.save.save(); }
  afterEnding(toMenu) { this.mode = 'play'; this.input.enabled = true; this.input.clearLatches(); if (toMenu) this.toMainMenu(); else { this.input.requestLock(); this.notify('Możesz dalej odkrywać wyspę.'); } }

  wireInput() {
    const I = this.input;
    window.addEventListener('keydown', (e) => { if (this.mode === 'panel' && this.panel === 'context' && this.ctxMenu?.key(e.code)) e.preventDefault(); });
    I.onLockChange = (locked) => { if (!locked && this.mode === 'play') this.pauseGame(); };
    this.canvas.addEventListener('click', () => { if (this.mode === 'play') I.requestLock(); });
    I.listeners.add((a, type) => {
      if (type !== 'down') return;
      if (this.mode === 'menu' || this.mode === 'boot') return;
      if (a === 'debug') { this.dbg.toggle(); return; }
      if (this.mode === 'play') {
        if (a === 'inventory') this.openPanel('inventory');
        else if (a === 'craft') this.openCraft();
        else if (a === 'skills') this.openCraft(null, 'skills');
        else if (a === 'build') { if (this.buildings.placing) this.buildings.cancelPlacement(); else this.openPanel('build'); }
        else if (a === 'map') this.openPanel('map');
        else if (a === 'pause') { if (this.buildings.placing) this.buildings.cancelPlacement(); else this.pauseGame(); }
        else if (a.startsWith('hotbar')) this.player.inventory.select(Number(a.slice(6)) - 1);
      } else if (this.mode === 'panel') {
        const pn = this.panel;
        if (pn === 'context') { if (a === 'pause' || a === 'interact') this.closePanel(); return; }
        if (pn === 'trade' || pn === 'note') { if (a === 'pause' || a === 'interact') this.closePanel(); return; }
        if (a === 'pause' || (a === 'inventory' && (pn === 'inventory' || pn === 'container')) || (a === 'map' && pn === 'map') || ((a === 'craft' || a === 'skills') && pn === 'craft') || (a === 'build' && pn === 'build')) this.closePanel();
      } else if (this.mode === 'pause') {
        if (a === 'pause') { if (this.menus.overlayOpen) this.menus.hideOverlay(); else this.resume(); }
      } else if (this.mode === 'dead') { /* handled by death panel */ }
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Helpers used by systems
  notify(text, kind) { this.hud?.notify(text, kind); }
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }
  itemList() { return Object.fromEntries(Object.values(ITEMS).map((i) => [i.id, i.name])); }
  onPickup(id, n) {
    this.audio.play('pickup');
    this._pickAgg = this._pickAgg || {};
    this._pickAgg[id] = (this._pickAgg[id] || 0) + n; this._pickT = 0.35;
  }
  flushPickups(dt) {
    if (!this._pickT) return;
    this._pickT -= dt;
    if (this._pickT <= 0) { const txt = Object.entries(this._pickAgg).map(([id, n]) => `+${n} ${itemName(id)}`).join(', '); this.notify(txt, 'good'); this._pickAgg = {}; this._pickT = 0; }
  }
  xpForLevel(l) { return 60 + l * 40; }        // ROBOCZE
  onXp(n) {
    const st = this.player.stats; st.xp += n;
    while (st.xp >= this.xpForLevel(st.level)) { st.xp -= this.xpForLevel(st.level); st.level++; st.skillPoints = (st.skillPoints || 0) + 1; this.hud.banner('Nowy poziom!', `Poziom ${st.level}`, 2.4); this.audio.play('dawn', { vol: 0.5 }); }
  }
  onPlayerHurt(dmg) { this.hurtFlash = Math.min(0.85, 0.35 + dmg / 60); }

  giveItem(id, n) {
    const left = this.player.inventory.add(id, n);
    if (left < n) this.onPickup(id, n - left);
    if (left > 0) { const p = this.player, f = p.facingVec(); this.drops.spawn(id, left, p.pos.x + f.x, p.pos.z + f.z, { delay: 1.2 }); this.notify('Ekwipunek pełny – przedmiot leży na ziemi.', 'warn'); }
  }

  updateAfterVisual(dt) { this.entities?.updateVisual(dt, this.alpha); }
  spawnList() { return Object.entries(ANIMALS).map(([id, d]) => [id, d.name]); }
  spawnEntity(kind) {
    const p = this.player, f = p.facingVec();
    const def = ANIMALS[kind]; if (!def) return;
    const x = p.pos.x + f.x * 9, z = p.pos.z + f.z * 9;
    const n = def.group ? def.group[1] : 1;
    const pack = kind === 'wolf' || kind === 'crab' ? new (this.PackClass)(this) : null;
    for (let i = 0; i < (kind === 'wolf' ? 3 : 1); i++) { const e = this.entities.spawn(kind, x + i * 1.6, z + (i % 2) * 1.2, { pack, nightSpawned: !!def.night_only }); e.fade = 1; if (def.night_only) e.nightSpawned = true; }
  }

  teleport(x, z, yaw) {
    const p = this.player;
    this.fadeEl.classList.add('on');
    setTimeout(() => {
      p.pos.x = x; p.pos.z = z; p.pos.y = this.world.getHeight(x, z) + 0.05; p.prev = { ...p.pos }; p.vx = p.vz = 0; p.onTower = null;
      if (yaw !== undefined) { p.yaw = yaw; this.cameraRig.yaw = yaw; }
      this.terrain.update(x, z, Infinity); this.grass?.clear();
      this.map.reveal(x, z, 30);
      setTimeout(() => this.fadeEl.classList.remove('on'), 200);
    }, 450);
  }

  // ---- death & respawn ----
  onPlayerDied(info) {
    const p = this.player;
    this.mode = 'dead'; this.input.enabled = false; this.input.exitLock();
    // part of the inventory stays in a "grave" where you fell
    const inv = p.inventory;
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i]; if (!s || Math.random() > 0.55) continue;
      const n = Math.max(1, Math.ceil(s.n * 0.5)); const out = inv.drop(i, n);
      this.drops.spawn(out.id, out.n, p.pos.x + (Math.random() - 0.5) * 1.6, p.pos.z + (Math.random() - 0.5) * 1.6, { dur: out.dur, delay: 3, ttl: 1500 });
    }
    setTimeout(() => {
      if (this.mode !== 'dead') return;
      const text = this.hardcore ? 'Tryb hardcore: to koniec Twojej wyprawy. Zapis został usunięty.' : 'Część ekwipunku została tam, gdzie upadłeś. Obudzisz się w bezpiecznym miejscu.';
      this.menus.showDeath({ text, hardcore: this.hardcore }, () => this.afterDeath());
    }, 2600);
  }
  afterDeath() {
    if (this.hardcore) { this.save.deleteSave(); this.toMainMenu(); return; }
    const sp = this.respawnPoint || this.world.spawn;
    const y = this.world.getHeight(sp.x, sp.z);
    this.player.respawn({ x: sp.x, y, z: sp.z });
    this.player.invuln = 5;
    // clear monsters around the respawn point
    for (const e of this.entities.list) if (!e.dead && Math.hypot(e.x - sp.x, e.z - sp.z) < 45 && e.def.brain !== 'prey') e.despawning = true;
    this.mode = 'play'; this.input.enabled = true; this.input.clearLatches(); this.input.requestLock();
    this.notify('Budzisz się, obolały. Twoje rzeczy leżą w miejscu śmierci.', 'warn');
    this.save.save();
  }

  // ---------------------------------------------------------------------------------------------
  // Interaction
  updateInteraction() {
    const p = this.player;
    if (p.busy || p.dead || this.mode !== 'play') { this.interactTarget = null; return; }
    let best = null, bs = 1e9;
    const reach = CONFIG.player.reach, f = p.facingVec();
    const consider = (kind, ref, x, z, r, label) => {
      const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz) - r;
      if (d > reach) return;
      const dot = (dx * f.x + dz * f.z) / (Math.hypot(dx, dz) || 1);
      if (dot < 0.15 && d > 0.8) return;
      const score = d - dot * 0.8;
      if (score < bs) { bs = score; best = { kind, ref, label }; }
    };
    this.field.near(p.pos.x, p.pos.z, reach + 1.5, (n) => {
      if (n.state !== 'alive' || !n.res || n.decor || n.depleted) return;
      const k = n.res.kind;
      if ((k === 'hand' || k === 'loot') && !n.looted) consider('node', n, n.x, n.z, (n.res.radius || 0.4) * n.scale, n.res.verb ? `${n.res.verb}` : n.res.name);
    });
    for (const d of this.drops.list) consider('drop', d, d.x, d.z, 0.2, `Podnieś: ${itemName(d.id)}${d.n > 1 ? ' ×' + d.n : ''}`);
    const trader = this.events.traderNear(p.pos);
    if (trader) { bs = -4; best = { kind: 'trader', label: 'Porozmawiaj z handlarzem' }; }
    const portal = this.cave.portalNear(p.pos);
    if (portal) { bs = -5; best = { kind: 'portal', portal, label: portal.label }; }
    if (!this.buildings.placing) {
      const st = this.buildings.interactable(p.pos, f, reach);
      if (st) { const half = Math.max(st.info?.size?.w || 1, st.info?.size?.d || 1) / 2, d = Math.hypot(st.x - p.pos.x, st.z - p.pos.z) - half; const sc = d - 0.9; if (sc < bs) { bs = sc; best = { kind: 'struct', ref: st, label: `${st.def.name}${st.hp < st.maxHp ? ` (${Math.ceil(st.hp / st.maxHp * 100)}%)` : ''}` }; } }
      // drinking / filling from water in front of the player
      const wx = p.pos.x + f.x * 1.8, wz = p.pos.z + f.z * 1.8;
      if (bs > 1.2 && this.world.getHeight(wx, wz) < -0.05 && p.grounded) {
        const fresh = this.world.isLake(wx, wz);
        best = { kind: 'water', fresh, label: fresh ? (p.inventory.has('waterskin') ? 'Napełnij bukłak' : 'Napij się z jeziora') : 'Woda morska (słona!)' };
      }
    }
    this.interactTarget = best;
  }
  doInteract() {
    const t = this.interactTarget, p = this.player;
    if (!t || p.busy) return;
    if (t.kind === 'drop') { this.drops.pickup(t.ref, p); return; }
    if (t.kind === 'trader') { this.openPanel('trade'); return; }
    if (t.kind === 'portal') { this.cave.use(t.portal.kind); return; }
    if (t.kind === 'struct') { this.openPanel('context', t.ref); return; }
    if (t.kind === 'water') {
      if (t.fresh && p.inventory.has('waterskin')) { p.inventory.remove('waterskin', 1); this.giveItem('waterskin_full', 1); this.audio.play('drink'); }
      else p.startInteract('pick', 0.9, () => this.survival.drinkWater(t.fresh), 0.6);
      return;
    }
    const n = t.ref, res = n.res;
    p.yaw = Math.atan2(n.x - p.pos.x, n.z - p.pos.z);
    p.vx = p.vz = 0;
    p.startInteract('pick', res.kind === 'loot' ? 0.95 : 0.7, () => this.harvestNode(n), 0.5);
  }
  harvestNode(n) {
    const res = n.res;
    if (n.state !== 'alive') return;
    if (res.noteItem) { this.readNote(n); this.gainXpNode(res); return; }
    if (res.kind === 'loot') {
      if (n.looted) return;
      this.field.markLooted(n); this.audio.play('craft', { pos: { x: n.x, y: n.y, z: n.z }, vol: 0.6 });
      const table = LOOT[n.loot || res.loot] || LOOT.wreck;
      let any = false;
      for (const r of table) { if (r.chance !== undefined && Math.random() > r.chance) continue; const c = r.min + Math.floor(Math.random() * (r.max - r.min + 1)); if (c > 0) { this.giveItem(r.item, c); any = true; } }
      if (!any) this.notify('Skrzynia jest pusta.');
      this.gainXpNode(res);
      return;
    }
    if (!this.field.harvest(n)) return;
    for (const r of res.drops) { if (r.chance !== undefined && Math.random() > r.chance) continue; this.giveItem(r.item, r.min + Math.floor(Math.random() * (r.max - r.min + 1))); }
    this.gainXpNode(res);
    this.fx.chips(n.x, n.y + 0.8, n.z, 0, 0, res.name === 'Trzcina' ? 'leaf' : 'leaf');
  }
  gainXpNode(res) { this.player.gainXp(res.xp || 0); }

  // ---------------------------------------------------------------------------------------------
  // Fixed step
  step(dt) {
    const p = this.player, I = this.input;
    I.tick(dt);
    this.atmos.syncClock(this.clock);
    if (this.mode === 'play' || this.mode === 'panel' || this.mode === 'dead') {
      if (this.buildings.placing && this.mode === 'play') {
        if (I.mousePressed(0)) this.buildings.confirmPlacement();
        if (I.mousePressed(2)) this.buildings.cancelPlacement();
        if (I.pressed('rotate')) this.buildings.rotatePlacement();
      }
      if (!this.debug.free) p.update(dt, I, this.cameraRig.yaw);
      else p.update(dt, { axis: () => ({ x: 0, z: 0 }), isDown: () => false, pressed: () => false, mousePressed: () => false, mouseDown: () => false, sprintHeld: () => false }, this.cameraRig.yaw);
      if (this.mode === 'play' && I.pressed('interact')) this.doInteract();
      const wheel = I.takeWheel(); if (wheel && this.mode === 'play') p.inventory.select(p.inventory.selected + wheel);
      this.weather.update(dt);
      this.cave.update(dt, p.pos);
      this.events.update(dt); this.ending.update(dt); this.playTime += dt;
      { const bm = this.bloodMoonTonight() && this.clock.isNight ? 1 : 0; this.atmos.blood += (bm - this.atmos.blood) * Math.min(1, dt * 0.4); this.atmos.nightVision += ((this.survival.hasBuff('nightvision') ? 1 : 0) - this.atmos.nightVision) * Math.min(1, dt * 2); }
      this.volcano.update(dt);
      this.entities?.update(dt);
      this.buildings.update(dt);
      this.projectiles.update(dt);
      this.survival.update(dt);
      this.drops.update(dt, p);
      this.field.update(dt, p.pos);
      const events = this.clock.advance(dt * this.clockSpeed);
      for (const e of events) this.onClockEvent(e);
      this.map.reveal(p.pos.x, p.pos.z, 26);
      this.updateInteraction();
      this.updateFootsteps(dt);
      this.postStep?.(dt);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6);
      if (this.time - this.lastAutosave > 180 && !p.dead) { this.save.save(); this.lastAutosave = this.time; }
    }
    this.flushPickups(dt);
  }
  onClockEvent(e) {
    if (e === 'dawn') { this.events.onDawn(); this.ending.onDawn(); }
    if (e === 'dusk') { this.events.onDusk(); if (this.bloodMoonTonight()) this.hud.banner('Krwawy Księżyc', 'Coś dużego idzie prosto na Twoją bazę.', 4.5); }
    if (e === 'dusk') { this.hud.banner('Zapada zmrok…', 'Noc należy do drapieżników.', 3.6); this.audio.play('dusk'); this.onDusk?.(); }
    if (e === 'dawn') { this.hud.banner('Świt', `Przetrwałeś noc ${this.clock.day - 1}.`, 3.6); this.audio.play('dawn'); this.save.save(); this.lastAutosave = this.time; this.onDawn?.(); }
    this.onPhase?.(e);
  }
  updateFootsteps(dt) {
    const p = this.player;
    if (!p.grounded || p.dead || p.speed < 0.6) { p.stepAcc = (p.stepAcc || 0) * 0.5; return; }
    p.stepAcc = (p.stepAcc || 0) + p.speed * dt;
    const stride = p.sprinting ? 2.3 : p.sneaking ? 1.2 : 1.75;
    if (p.stepAcc >= stride) {
      p.stepAcc = 0;
      const b = this.world.getBiome(p.pos.x, p.pos.z);
      let s = b === BIOME.BEACH ? 'step_sand' : b === BIOME.ROCK || b === BIOME.VOLCANO ? 'step_rock' : 'step_grass';
      if (p.wading) { s = 'step_water'; this.fx.splash(p.pos.x, p.pos.z, 4); }
      else this.fx.footDust(p.pos.x, p.pos.y, p.pos.z, b);
      this.audio.play(s, { pos: p.pos, vol: p.sneaking ? 0.35 : p.sprinting ? 1.1 : 0.7, pitch: 0.9 + Math.random() * 0.2 });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Frame
  frame(nowMs) {
    if (this.manual) return;
    const now = nowMs / 1000;
    const dt = Math.min(0.1, now - (this.lastNow ?? now));
    this.lastNow = now;
    this.time += dt;
    const running = this.mode === 'play' || this.mode === 'panel' || this.mode === 'dead';
    if (running) {
      let scale = 1;
      if (this.hitStopT > 0) { this.hitStopT -= dt; scale = 0.04; }
      this.acc += dt * scale;
      let n = 0;
      while (this.acc >= CONFIG.fixedDt && n < 6) { this.step(CONFIG.fixedDt); this.acc -= CONFIG.fixedDt; n++; }
      if (n === 6) this.acc = 0;
      this.alpha = this.acc / CONFIG.fixedDt;
    } else this.alpha = 1;
    this.renderFrame(dt);
  }

  renderFrame(dt) {
    const p = this.player;
    if (!p || !this.world) { return; }
    const playing = this.mode !== 'menu' && this.mode !== 'boot';
    if (playing) {
      if (this.debug.free) this.freeCam(dt); else { this.cameraRig.handleMouse(this.input); this.cameraRig.update(dt, p, this.alpha); }
      p.updateVisual(dt, this.alpha);
      this.updateAfterVisual?.(dt);
    } else this.menuCamera(dt);
    const focus = this._focus || (this._focus = new THREE.Vector3());
    if (playing) { const rp = p.renderPos(this.alpha); focus.set(rp.x, rp.y, rp.z); } else focus.set(p.pos.x, p.pos.y, p.pos.z);
    shared.uTime.value = this.time;
    shared.uCamPos.value.copy(this.camera.position); shared.uPlayerPos.value.copy(focus);
    this.atmos.update(this.clock, focus, this.camera, this.time);
    this.lights.update(dt, this.camera.position, focus, this.atmos.dayness);
    this.water.update(this.time, this.camera.position, this.atmos);
    this.terrain.update(focus.x, focus.z, 3);
    this.grass.update(this.camera.position.x, this.camera.position.z, 3);
    this.fx.update(dt);
    if (this.mode === 'panel' && (this.panel === 'inventory' || this.panel === 'container')) this.invUI.refresh();
    if (this.craftUI?.visible) this.craftUI.update(dt);
    if (this.buildings?.placing) this.buildings.frame(dt);
    if (this.menus?.mapOpen) this.menus.drawBigMap();
    this.audio.update(dt, this.camera, p, this.atmos, this.weather);
    if (playing && this.hud) this.hud.update(dt);
    this.dbg?.update(dt);
    this.debug.update?.(dt);
    this.composer.render();
  }

  menuCamera(dt) {
    const sp = this.world.spawn, t = this.time * 0.05;
    const r = 46, cx = sp.x + Math.sin(t) * r, cz = sp.z - 20 + Math.cos(t) * r * 0.6;
    const h = Math.max(this.world.getHeight(cx, cz), 0) + 11 + Math.sin(t * 1.7) * 2;
    this.camera.position.set(cx, h, cz);
    this.camera.lookAt(sp.x, Math.max(sp.y, 0) + 3, sp.z - 20);
    if (this.mode === 'menu' || this.mode === 'boot') { this.clock.t = 0.08 * this.clock.cycle; }
  }

  freeCam(dt) {
    const I = this.input, c = this.camera, cr = this.cameraRig;
    cr.handleMouse(I);
    const sp = (I.isDown('sprint') ? 60 : 20) * dt, ax = I.axis();
    const fx = -Math.sin(cr.yaw) * -1, fz = Math.cos(cr.yaw);
    if (!this.freePos) this.freePos = c.position.clone();
    const fwd = new THREE.Vector3(Math.sin(cr.yaw) * Math.cos(cr.pitch), -Math.sin(cr.pitch), Math.cos(cr.yaw) * Math.cos(cr.pitch)).normalize();
    const right = new THREE.Vector3(-Math.cos(cr.yaw), 0, Math.sin(cr.yaw));
    this.freePos.addScaledVector(fwd, ax.z * sp).addScaledVector(right, ax.x * sp);
    if (I.isDown('jump')) this.freePos.y += sp; if (I.isDown('sneak')) this.freePos.y -= sp;
    c.position.copy(this.freePos); c.lookAt(this.freePos.clone().add(fwd));
  }

  // ---------------------------------------------------------------------------------------------
  makeDebug() {
    const g = this;
    return {
      free: false, god: false, colliders: null,
      setTime(f) { g.clock.t = f * g.clock.cycle; g.clock.prevNight = g.clock.isNight; g.atmos.syncClock(g.clock); },
      give(id, n) { g.giveItem(id, n); },
      spawn(type) { g.spawnEntity?.(type); },
      revealMap() { g.map.fogGrid.fill(1); g.map.redrawFog(); },
      tp(place) {
        const w = g.world, L = { volcano: { x: 96, z: -104 }, mountain: { x: -78, z: -48 }, cave: w.cave }[place]; if (!L) return;
        // find the nearest walkable point
        const y = w.getHeight(L.x, L.z); g.player.pos.x = L.x; g.player.pos.z = L.z; g.player.pos.y = y + 0.1; g.player.prev = { ...g.player.pos }; g.terrain.update(L.x, L.z, Infinity); g.grass?.clear();
      },
      toggleFreeCam() { this.free = !this.free; g.freePos = null; g.notify('Wolna kamera: ' + (this.free ? 'TAK (WASD, Spacja/Ctrl)' : 'NIE')); },
      toggleColliders() {
        if (this.colliders) { g.scene.remove(this.colliders); this.colliders = null; return; }
        this.colliders = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff3366, depthTest: false })); this.colliders.renderOrder = 99; g.scene.add(this.colliders); this._cT = 0;
      },
      update(dt) {
        if (!this.colliders) return;
        this._cT -= dt; if (this._cT > 0) return; this._cT = 0.2;
        const pts = [], p = g.player.pos;
        g.colliders.forEachNear(p.x, p.z, 26, (c) => {
          const y = g.world.getHeight(c.x, c.z) + 0.2;
          if (c.type === 'circle') { for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283, b = ((i + 1) / 16) * 6.283; pts.push(c.x + Math.cos(a) * c.r, y, c.z + Math.sin(a) * c.r, c.x + Math.cos(b) * c.r, y, c.z + Math.sin(b) * c.r); } }
          else { const cs = [[-c.hw, -c.hd], [c.hw, -c.hd], [c.hw, c.hd], [-c.hw, c.hd]].map(([x, z]) => [c.x + x * c.cos - z * c.sin, c.z + x * c.sin + z * c.cos]); for (let i = 0; i < 4; i++) { const a = cs[i], b = cs[(i + 1) % 4]; pts.push(a[0], y, a[1], b[0], y, b[1]); } }
        });
        this.colliders.geometry.dispose(); this.colliders.geometry = new THREE.BufferGeometry(); this.colliders.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      },
    };
  }
}
