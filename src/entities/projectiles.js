// Arrows / bolts: ballistic flight, hits on creatures, terrain and solid objects; stuck arrows can be recovered.
import * as THREE from 'three';
import { arrowModel, itemMaterial } from '../gfx/itemmodels.js';

const GRAV = 12;                     // ROBOCZE (slightly floaty for a readable arc)
const UP = new THREE.Vector3(0, 1, 0);

export class Projectiles {
  constructor(game) {
    this.game = game; this.list = [];
    this.geo = arrowModel();
    this.group = new THREE.Group(); game.scene.add(this.group);
  }
  // kind: 'arrow' | 'fire_arrow' | 'bolt'
  fire(x, y, z, dx, dy, dz, speed, damage, kind = 'arrow', owner = null) {
    const mesh = new THREE.Mesh(this.geo, itemMaterial); mesh.castShadow = true; this.group.add(mesh);
    const pr = { x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, damage, kind, owner, mesh, life: 6, stuck: false, stuckT: 0, fire: kind === 'fire_arrow', trailT: 0 };
    this.orient(pr); mesh.position.set(x, y, z);
    this.list.push(pr);
    return pr;
  }
  // Enemy fireball: flies straight (no gravity), hurts the player and base structures.
  fireHostile(x, y, z, dx, dy, dz, speed, damage, owner) {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: 0xff7a20 }));
    this.group.add(mesh);
    const pr = { x, y, z, vx: dx * speed, vy: dy * speed, vz: dz * speed, damage, kind: 'fireball', owner, mesh, life: 4, hostile: true, stuck: false };
    mesh.position.set(x, y, z); this.list.push(pr); return pr;
  }
  updateHostile(p, dt, i) {
    const g = this.game, pl = g.player;
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.mesh.position.set(p.x, p.y, p.z);
    g.fx.ember(p.x, p.y, p.z); if (Math.random() < 0.5) g.fx.smoke(p.x, p.y, p.z, 0.4);
    let boom = p.life <= 0 || p.y < g.world.getHeight(p.x, p.z);
    if (!boom && !pl.dead && Math.hypot(pl.pos.x - p.x, pl.pos.z - p.z) < 0.9 && p.y > pl.pos.y && p.y < pl.pos.y + 2.0) {
      pl.takeHit({ damage: p.damage, dir: Math.atan2(p.vx, p.vz) + Math.PI, knock: 5, source: p.owner, kind: 'fire' }); boom = true;
    }
    if (!boom) for (const s of g.buildings.list) { if (s.def.walkable) continue; if (Math.hypot(s.x - p.x, s.z - p.z) < 1.6 && p.y < s.y + (s.info?.size?.h || 2)) { g.buildings.damage(s, p.damage * 2.2, p.owner); boom = true; break; } }
    if (boom) { g.fx.burst('glow', p.x, p.y, p.z, 26, { color: ['#ff7a20', '#ffd070', '#ff4010'], speed: [2, 8], up: [1, 6], size: [0.6, 1.4], life: [0.3, 0.8], grav: 4 }); g.fx.dust(p.x, p.y, p.z, 2); g.audio?.play('hit', { pos: p, pitch: 0.5, vol: 0.9 }); this.group.remove(p.mesh); this.list.splice(i, 1); }
  }
  orient(p) { const d = new THREE.Vector3(p.vx, p.vy, p.vz).normalize(); p.mesh.quaternion.setFromUnitVectors(UP, d); }
  update(dt) {
    const g = this.game, w = g.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (p.hostile) { this.updateHostile(p, dt, i); continue; }
      if (p.stuck) { p.stuckT += dt; if (p.stuckT > 25) { this.group.remove(p.mesh); this.list.splice(i, 1); } continue; }
      p.life -= dt;
      const steps = Math.ceil(Math.hypot(p.vx, p.vz, p.vy) * dt / 0.4), sd = dt / steps;
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        p.vy -= GRAV * sd;
        const nx = p.x + p.vx * sd, ny = p.y + p.vy * sd, nz = p.z + p.vz * sd;
        // creatures
        if (g.entities) g.entities.near(nx, nz, 3, (e) => {
          if (dead || e.dead || e.untargetable || e === p.owner) return;
          const dxx = e.x - nx, dzz = e.z - nz;
          if (Math.hypot(dxx, dzz) < e.radius + 0.12 && ny > e.y - 0.1 && ny < e.y + e.height + (e.altitude || 0) + 0.3) {
            const dir = Math.atan2(p.vx, p.vz);
            const killed = e.takeHit({ damage: p.damage, dir, knock: 3, source: p.owner || g.player, heavy: p.damage > 25 });
            g.fx.hitEntity(e, dir, false); g.audio?.play('hit', { pos: e, pitch: 1.2 });
            if (p.fire) { e.burn = 4; }
            if (Math.random() < 0.4) g.drops.spawn(p.kind === 'fire_arrow' ? 'arrow' : p.kind, 1, e.x, e.z, { vx: 0, vz: 0, vy: 1.5 });
            dead = true;
          }
        });
        if (dead) break;
        // terrain / solid objects
        const ground = w.getHeight(nx, nz);
        let hit = ny <= ground;
        if (!hit) g.colliders.forEachNear(nx, nz, 1.2, (c) => { if (hit || !c.solid) return; if (c.base !== undefined && ny > c.base + c.top) return; if (ny < (c.base ?? -1e9) - 0.5) return; const dxx = nx - c.x, dzz = nz - c.z; if (c.type === 'circle' ? Math.hypot(dxx, dzz) < c.r : Math.abs(dxx * c.cos + dzz * c.sin) < c.hw && Math.abs(-dxx * c.sin + dzz * c.cos) < c.hd) hit = true; });
        if (hit) {
          p.stuck = true; p.stuckT = 0; p.x = nx; p.y = Math.max(ny, ground); p.z = nz;
          g.fx.chips(nx, ny, nz, 0, 0, 'wood'); g.audio?.play('chop', { pos: { x: nx, y: ny, z: nz }, pitch: 1.6, vol: 0.5 });
          p.mesh.position.set(p.x, p.y, p.z);
          // recover half of the arrows: leave a pickup
          if (Math.random() < 0.5 && ny > -0.2) g.drops.spawn(p.kind === 'fire_arrow' ? 'arrow' : p.kind, 1, nx, nz, { vx: 0, vz: 0, vy: 0.5, delay: 0.5 });
          this.group.remove(p.mesh); this.list.splice(i, 1); dead = true; break;
        }
        p.x = nx; p.y = ny; p.z = nz;
        if (ny < -3) dead = true;
      }
      if (dead && !p.stuck) { this.group.remove(p.mesh); const k = this.list.indexOf(p); if (k >= 0) this.list.splice(k, 1); continue; }
      if (p.life <= 0) { this.group.remove(p.mesh); const k = this.list.indexOf(p); if (k >= 0) this.list.splice(k, 1); continue; }
      if (!p.stuck) { p.mesh.position.set(p.x, p.y, p.z); this.orient(p); if (p.fire && Math.random() < dt * 40) g.fx.ember(p.x, p.y, p.z); }
    }
  }
}
