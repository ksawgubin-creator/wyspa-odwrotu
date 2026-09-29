// Random events & visitors: the wandering trader (boat + NPC), washed-up wrecks, blood-moon flags, the endgame night.
import * as THREE from 'three';
import * as M from '../gfx/models.js';
import { HumanRig } from '../gfx/rig.js';
import { HumanAnimator } from '../player/anim.js';
import { mats } from '../gfx/materials.js';
import { TRADE_POOL } from '../../data/trades.js';
import { mulberry32 } from '../engine/rng.js';
import { angleDiff, dampAngle, clamp, damp } from '../engine/util.js';
import { LAYOUT } from './worldgen.js';

export class Events {
  constructor(game) {
    this.game = game;
    this.trader = null; this.lastTraderDay = 0; this.offers = [];
    this.wreckGroups = [];
    const nodes = game.nodes;
    const groups = new Map();
    for (const n of nodes) if (n.wreckGroup !== undefined) { (groups.get(n.wreckGroup) || groups.set(n.wreckGroup, []).get(n.wreckGroup)).push(n); }
    this.wreckGroups = [...groups.values()];
    this.notesFound = new Set();
  }

  // ---- wandering trader ---------------------------------------------------------------------------
  findTraderSpot() {
    const g = this.game, w = g.world, p = g.player.pos;
    const rng = mulberry32((g.clock.day * 7919) ^ w.seed);
    for (let i = 0; i < 40; i++) {
      const ang = rng() * Math.PI * 2;
      for (let r = 230; r > 90; r -= 1.5) {
        const x = Math.cos(ang) * r, z = Math.sin(ang) * r;
        if (w.getHeight(x, z) > 0.9) {
          if (w.getSlope(x, z) > 0.35 || Math.hypot(x - w.spawn.x, z - w.spawn.z) < 25 || Math.hypot(x - p.x, z - p.z) < 45) break;
          if (w.getBiome(x, z) !== 1) break;
          const nx = Math.cos(ang), nz = Math.sin(ang);
          return { x: x - nx * 4, z: z - nz * 4, ang, bx: x + nx * 13, bz: z + nz * 13 };
        }
      }
    }
    return null;
  }
  spawnTrader() {
    const g = this.game, spot = this.findTraderSpot(); if (!spot) return;
    const rig = new HumanRig({ shirt: 0x7a3a6b, pants: 0x3a3a4a, hair: 0xb8b8b8, accent: 0xe0b040, pack: 0x5a3a2a, skin: 0xc89a70, belt: 0x2a1c10 });
    const anim = new HumanAnimator(rig);
    rig.root.position.set(spot.x, g.world.getHeight(spot.x, spot.z), spot.z);
    g.scene.add(rig.root);
    const boat = new THREE.Mesh(M.traderBoat(3), mats.prop); boat.castShadow = true;
    boat.position.set(spot.bx, 0.05, spot.bz); boat.rotation.y = Math.atan2(spot.x - spot.bx, spot.z - spot.bz) + Math.PI / 2; g.scene.add(boat);
    // wares: crates and barrels next to him
    const props = [];
    for (const [dx, dz, geo] of [[1.6, 0.4, M.crate(9)], [1.3, -0.8, M.barrel(4)], [-1.6, 0.6, M.crate(12)]]) { const m = new THREE.Mesh(geo, mats.prop); m.position.set(spot.x + dx, g.world.getHeight(spot.x + dx, spot.z + dz), spot.z + dz); m.rotation.y = Math.random() * 6; m.castShadow = true; g.scene.add(m); props.push(m); }
    const rng = mulberry32(g.clock.day * 131 + g.world.seed);
    const pool = TRADE_POOL.slice(); const offers = [];
    while (offers.length < 6 && pool.length) offers.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    this.trader = { x: spot.x, z: spot.z, rig, anim, boat, props, offers, spot, bob: 0, leaving: false, fade: 1 };
    this.lastTraderDay = g.clock.day;
    g.map.markers.push(this.trader.marker = { x: spot.x, z: spot.z, label: 'Handlarz', color: '#ffd35a' });
    g.hud.banner('Handlarz przybił do brzegu', 'Łódź na plaży – wymień skóry na rzadkie przedmioty.', 4);
    g.notify(`Handlarz czeka na plaży (${Math.round(Math.hypot(spot.x - g.player.pos.x, spot.z - g.player.pos.z))} m). Odpłynie o zmroku.`, 'good');
  }
  removeTrader() {
    const t = this.trader; if (!t) return;
    const g = this.game;
    g.scene.remove(t.rig.root); g.scene.remove(t.boat); t.props.forEach((m) => g.scene.remove(m));
    const i = g.map.markers.indexOf(t.marker); if (i >= 0) g.map.markers.splice(i, 1);
    this.trader = null;
  }
  onDawn() {
    const g = this.game, day = g.clock.day;
    if (day >= 3 && day - this.lastTraderDay >= 3 && !this.trader) this.spawnTrader();
    // washed-up wreck
    const hidden = this.wreckGroups.filter((grp) => grp.every((n) => n.hidden));
    if (hidden.length && day >= 2 && Math.random() < 0.35) this.revealWreck(hidden[Math.floor(Math.random() * hidden.length)]);
  }
  onDusk() { if (this.trader) this.trader.leaving = true; }
  revealWreck(grp) {
    const g = this.game;
    for (const n of grp) g.field.revealNode(n);
    const c = grp[0];
    g.map.markers.push({ x: c.x, z: c.z, label: 'Wrak', color: '#e0a060' });
    g.hud.banner('Wrak na brzegu', 'Fale wyrzuciły coś na plażę…', 3.5);
  }
  onStormEnd() { const hidden = this.wreckGroups.filter((grp) => grp.every((n) => n.hidden)); if (hidden.length && Math.random() < 0.6) this.revealWreck(hidden[0]); }

  // ---- per-frame ----------------------------------------------------------------------------------
  update(dt) {
    const t = this.trader; if (!t) return;
    const g = this.game, p = g.player.pos;
    t.bob += dt;
    t.boat.position.y = 0.02 + Math.sin(t.bob * 1.1) * 0.08; t.boat.rotation.z = Math.sin(t.bob * 0.9) * 0.03;
    const d = Math.hypot(p.x - t.x, p.z - t.z);
    const yaw = Math.atan2(p.x - t.x, p.z - t.z);
    if (d < 14) t.rig.root.rotation.y = dampAngle(t.rig.root.rotation.y, yaw, 4, dt);
    t.anim.update(dt, { speed: 0, grounded: true, walkSpeed: 4.2, sprintSpeed: 7, holding: null });
    if (t.leaving) {
      t.boat.position.x += Math.cos(t.spot.ang) * 2.4 * dt; t.boat.position.z += Math.sin(t.spot.ang) * 2.4 * dt;
      t.fade -= dt / 6; if (t.fade < 0.5) t.rig.root.visible = false;
      if (t.fade <= 0) { this.removeTrader(); g.notify('Handlarz odpłynął.'); }
    }
  }
  traderNear(p) { const t = this.trader; if (!t || t.leaving) return null; return Math.hypot(p.x - t.x, p.z - t.z) < 3.2 ? t : null; }
  serialize() { return { lastTraderDay: this.lastTraderDay, notes: [...this.notesFound] }; }
  restore(d) { if (!d) return; this.lastTraderDay = d.lastTraderDay || 0; (d.notes || []).forEach((n) => this.notesFound.add(n)); }
}
