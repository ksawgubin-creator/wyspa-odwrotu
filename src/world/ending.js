// Endgame: build a raft (sail + obsidian rudder) or a signal fire on the mountain peak, then survive one long final night
// with the Volcano Guardian. Survive until dawn with the structure intact to escape.
import * as THREE from 'three';
import * as M from '../gfx/models.js';
import { mats } from '../gfx/materials.js';
import { LAYOUT } from './worldgen.js';

export class Ending {
  constructor(game) { this.game = game; this.active = false; this.type = null; this.struct = null; this.done = false; this.boss = null; this.spawned = false; this.cine = null; }

  canBegin(struct) {
    const g = this.game;
    if (struct.type === 'raft') return !!struct.sail && !!struct.rudder;
    if (struct.type === 'signal_fire') return true;
    return false;
  }
  begin(struct) {
    const g = this.game;
    this.active = true; this.type = struct.type === 'raft' ? 'raft' : 'signal'; this.struct = struct; this.spawned = false; this.boss = null;
    struct.hp = struct.maxHp; struct.stage = 0; g.buildings.buildVisual(struct);
    if (struct.type === 'signal_fire') { struct.lit = true; struct.fuel = 1e9; if (struct.src) struct.src.on = true; }
    // the final night starts now
    g.hud.banner('Ostatnia noc', this.type === 'raft' ? 'Obroń tratwę do świtu.' : 'Utrzymaj ognisko sygnałowe do świtu.', 5);
    g.clock.t = g.clock.dayFrac * g.clock.cycle + 0.5; g.clock.prevNight = true;
    g.onClockEvent('dusk');
    g.entities.director.budget *= 1.7;
    g.notify('Cienie krążą… Strażnik Wulkanu się budzi.', 'warn');
  }
  update(dt) {
    const g = this.game;
    if (this.cine) return this.updateCine(dt);
    if (!this.active) return;
    if (!g.buildings.list.includes(this.struct)) { return this.fail(); }
    if (g.clock.isNight && !this.spawned && g.clock.nightProgress > 0.12) {
      this.spawned = true;
      const V = LAYOUT.volcano;
      const ang = Math.atan2(V.z - this.struct.z, V.x - this.struct.x);
      const x = this.struct.x + Math.cos(ang) * 55, z = this.struct.z + Math.sin(ang) * 55;
      const w = g.world;
      let sx = x, sz = z;
      for (let i = 0; i < 20 && (w.getHeight(sx, sz) < 0.4 || w.getSlope(sx, sz) > 1); i++) { sx = this.struct.x + Math.cos(ang + (Math.random() - 0.5)) * (40 + Math.random() * 25); sz = this.struct.z + Math.sin(ang + (Math.random() - 0.5)) * (40 + Math.random() * 25); }
      this.boss = g.entities.spawn('guardian', sx, sz, { nightSpawned: true, hpMul: 1, dmgMul: 1 }); this.boss.fade = 1; this.boss.forcedTarget = { x: this.struct.x, z: this.struct.z, struct: this.struct, half: 2.4 };
      g.hud.banner('Strażnik Wulkanu', 'Nadchodzi z ogniem.', 4); g.audio?.play('roar', { pos: this.boss, vol: 1.5, pitch: 0.7 });
    }
  }
  fail() {
    const g = this.game; this.active = false; this.spawned = false;
    g.hud.banner('Straciłeś ' + (this.type === 'raft' ? 'tratwę' : 'ognisko sygnałowe'), 'Zbuduj je od nowa i spróbuj jeszcze raz.', 5); g.audio?.play('tree_fall');
    if (this.boss) { this.boss.despawning = true; this.boss = null; }
  }
  onDawn() {
    const g = this.game;
    if (!this.active || !g.buildings.list.includes(this.struct)) return;
    this.active = false; this.startCine();
  }
  startCine() {
    const g = this.game, s = this.struct;
    g.input.enabled = false; g.mode = 'dead'; g.fadeEl.style.transition = 'opacity 2.5s';
    this.cine = { t: 0, type: this.type };
    if (this.type === 'signal') { const ship = new THREE.Mesh(M.traderBoat(5), mats.prop); ship.scale.setScalar(2.4); const V = g.world; ship.position.set(s.x - 150, 0.1, s.z + 20); ship.rotation.y = Math.PI / 2; g.scene.add(ship); this.cine.ship = ship; }
    g.hud.banner(this.type === 'raft' ? 'Świt. Odpływasz.' : 'Świt. Widać żagiel!', '', 6);
  }
  updateCine(dt) {
    const g = this.game, c = this.cine, s = this.struct; c.t += dt;
    const cam = g.camera;
    if (c.type === 'raft') {
      const dir = { x: Math.cos(s.ry + Math.PI / 2 * 0), z: 0 };
      s.group.position.x += 2.2 * dt * Math.sin(s.ry); s.group.position.z += 2.2 * dt * Math.cos(s.ry);
      s.group.position.y = 0.1 + Math.sin(c.t * 1.2) * 0.05;
      cam.position.lerp(new THREE.Vector3(s.group.position.x - Math.sin(s.ry) * 9, 4.5, s.group.position.z - Math.cos(s.ry) * 9), 0.05); cam.lookAt(s.group.position.x, 1.5, s.group.position.z);
    } else {
      c.ship.position.x += 14 * dt; c.ship.position.y = 0.1 + Math.sin(c.t) * 0.08;
      cam.position.lerp(new THREE.Vector3(s.x + 6, s.y + 3.5, s.z + 6), 0.05); cam.lookAt(c.ship.position.x, 2, c.ship.position.z);
    }
    if (c.t > 6 && !c.faded) { c.faded = true; g.fadeEl.classList.add('on'); }
    if (c.t > 9) { this.cine = null; if (c.ship) g.scene.remove(c.ship); g.fadeEl.classList.remove('on'); g.fadeEl.style.transition = ''; this.done = true; g.showEnding(this.type); }
  }
  serialize() { return { done: this.done }; }
  restore(d) { if (d) this.done = !!d.done; }
}
