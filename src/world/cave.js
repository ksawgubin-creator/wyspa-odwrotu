// Cave system: the ceiling and stalactites of the carved cave complex, crystal lights, the cave mouth on the mountain flank
// (with a solid collider ring) and the two portals (enter / exit). Cave cells live in a far corner of the heightmap.
import * as THREE from 'three';
import * as M from '../gfx/models.js';
import { mats } from '../gfx/materials.js';
import { CAVE } from './worldgen.js';
import { Noise2D } from '../engine/noise.js';
import { hash2 } from '../engine/rng.js';
import { damp, clamp } from '../engine/util.js';

export class CaveSystem {
  constructor(game) {
    this.game = game;
    const w = game.world, scene = game.scene;
    this.group = new THREE.Group(); this.group.name = 'cave'; scene.add(this.group);
    this.factor = 0;
    this.buildCeiling(w);
    this.buildEntrance(w);
    this.buildExit(w);
    this.buildCrystalLights(w);
  }

  buildCeiling(w) {
    const R = CAVE.radius + 6, seg = 56;
    const geo = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg); geo.rotateX(Math.PI / 2);   // faces down
    const p = geo.getAttribute('position'), nz = new Noise2D(w.seed + 4242), colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), n = nz.fbm(x * 0.09, z * 0.09, 3), b = nz.noise(x * 0.35, z * 0.35);
      const d = w.caveDist(CAVE.cx + x, CAVE.cz + z);
      let y = CAVE.ceiling + n * 1.3 + b * 0.3 - (d < 0 ? Math.max(0, Math.min(1, -d / 4)) * 0.4 : 0);
      p.setXYZ(i, x, y, z);
      const c = 0.16 + (n * 0.5 + 0.5) * 0.12; colors[i * 3] = c * 1.05; colors[i * 3 + 1] = c; colors[i * 3 + 2] = c * 0.95;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const ng = geo.toNonIndexed(); ng.deleteAttribute('uv'); ng.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    this.ceiling = new THREE.Mesh(ng, mat); this.ceiling.position.set(CAVE.cx, 0, CAVE.cz); this.ceiling.frustumCulled = false;
    this.group.add(this.ceiling);
    // stalactites over the chambers
    const geoS = M.stalactite ? M.stalactite(7) : null;
    const cone = new THREE.ConeGeometry(0.4, 1.6, 5); cone.translate(0, -0.8, 0);
    const cg = cone.toNonIndexed(); cg.deleteAttribute('uv'); cg.computeVertexNormals();
    const cc = new Float32Array(cg.attributes.position.count * 3).fill(0.2); cg.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    const pts = [];
    for (let i = 0; i < 260; i++) {
      const x = CAVE.cx + (hash2(i, 1, w.seed) - 0.5) * CAVE.radius * 2, z = CAVE.cz + (hash2(i, 2, w.seed) - 0.5) * CAVE.radius * 2;
      if (w.caveDist(x, z) > -1) continue;
      pts.push([x, z, 0.5 + hash2(i, 3, w.seed) * 1.5]);
    }
    const inst = new THREE.InstancedMesh(cg, mats.prop, pts.length), m4 = new THREE.Matrix4(), col = new THREE.Color();
    pts.forEach(([x, z, s], i) => { m4.compose(new THREE.Vector3(x, CAVE.ceiling + 0.6, z), new THREE.Quaternion(), new THREE.Vector3(s * 0.8, s * (0.8 + (i % 3) * 0.4), s * 0.8)); inst.setMatrixAt(i, m4); inst.setColorAt(i, col.setRGB(0.55, 0.52, 0.48)); });
    inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); inst.frustumCulled = false;
    this.group.add(inst); this.stalactites = inst;
  }

  // The cave mouth: boulder arch + black void, with colliders on both sides so the arch cannot be walked through.
  buildEntrance(w) {
    const g = this.game, c = w.cave, M0 = { x: -78, z: -48 };
    const yaw = Math.atan2(c.x - M0.x, c.z - M0.z);       // face away from the mountain centre
    this.entrance = { x: c.x, z: c.z, y: w.getHeight(c.x, c.z), yaw };
    const geo = M.caveMouth(31);
    const mesh = new THREE.Mesh(geo, mats.prop); mesh.castShadow = true; mesh.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(mesh);
    const voidMesh = new THREE.Mesh(M.caveVoid(), new THREE.MeshBasicMaterial({ color: 0x020202, side: THREE.DoubleSide })); voidMesh.position.set(0, 1.6, 0.3); voidMesh.scale.set(1, 1.1, 1); grp.add(voidMesh);
    grp.position.set(c.x, this.entrance.y - 0.25, c.z); grp.rotation.y = yaw;
    this.group.add(grp); this.entranceGroup = grp;
    // side pillars solid, the middle is the portal
    for (const s of [-1, 1]) for (const dz of [-0.3, -1.6]) {
      const x = c.x + Math.cos(yaw) * s * 3.1 + Math.sin(yaw) * dz, z = c.z - Math.sin(yaw) * s * 3.1 + Math.cos(yaw) * dz;
      g.colliders.add({ x, z, r: 1.35, base: this.entrance.y, top: 4, tag: 'cavemouth' });
    }
    // back wall
    const bx = c.x + Math.sin(yaw) * -2.6, bz = c.z + Math.cos(yaw) * -2.6;
    g.colliders.add({ x: bx, z: bz, hw: 2.2, hd: 0.8, rot: -yaw, base: this.entrance.y, top: 4, tag: 'cavemouth' });
    // a warm dim light so the opening is noticeable at night
    this.mouthLight = g.lights.add({ x: c.x + Math.sin(yaw) * 0.5, y: this.entrance.y + 1.4, z: c.z + Math.cos(yaw) * 0.5, color: 0x6a86ff, intensity: 0.9, radius: 9, flicker: 0.2, on: true });
  }

  buildExit(w) {
    const g = this.game, A = CAVE.rooms[0];
    const x = CAVE.cx + A.x - A.r + 1.6, z = CAVE.cz + A.z;
    this.exit = { x, z, y: w.getHeight(x, z) };
    const grp = new THREE.Group(), arch = new THREE.Mesh(M.caveMouth(77), mats.prop); arch.scale.setScalar(0.75); grp.add(arch);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.8, 14), new THREE.MeshBasicMaterial({ color: 0xbfd8ff, side: THREE.DoubleSide })); glow.position.set(0, 1.5, 0.2); grp.add(glow);
    grp.position.set(x - 0.6, this.exit.y - 0.15, z); grp.rotation.y = Math.PI / 2; this.group.add(grp);
    this.exitLight = g.lights.add({ x: x + 1, y: this.exit.y + 1.6, z, color: 0xcfe0ff, intensity: 2.0, radius: 14, flicker: 0.05, on: true });
    for (const dz of [-2.2, 2.2]) g.colliders.add({ x: x - 0.3, z: z + dz, r: 1.2, base: this.exit.y, top: 4, tag: 'caveexit' });
  }

  buildCrystalLights(w) {
    let k = 0;
    for (const n of this.game.nodes) {
      if (n.type !== 'crystal' || (k++ % 3)) continue;
      this.game.lights.add({ x: n.x, y: n.y + 0.8, z: n.z, color: [0x5a8aff, 0xa070ff, 0x40e0d0][n.variant % 3], intensity: 1.1, radius: 8, flicker: 0.15, on: true });
    }
  }

  spawnPoint() { const A = CAVE.rooms[0]; return { x: CAVE.cx + A.x + 1.5, z: CAVE.cz + A.z, yaw: Math.PI / 2 }; }

  // portal the player can use right now (or null)
  portalNear(p) {
    const w = this.game.world;
    const e = this.entrance, ex = e.x + Math.sin(e.yaw) * 1.2, ez = e.z + Math.cos(e.yaw) * 1.2;
    if (Math.hypot(p.x - ex, p.z - ez) < 2.6 && !w.isCave(p.x, p.z)) return { label: 'Wejdź do jaskini', kind: 'enter' };
    if (w.isCave(p.x, p.z) && Math.hypot(p.x - (this.exit.x + 1), p.z - this.exit.z) < 3.4) return { label: 'Wyjdź z jaskini', kind: 'exit' };
    return null;
  }
  use(kind) {
    const g = this.game, p = g.player;
    const to = kind === 'enter' ? this.spawnPoint() : { x: this.entrance.x + Math.sin(this.entrance.yaw) * 3.4, z: this.entrance.z + Math.cos(this.entrance.yaw) * 3.4, yaw: this.entrance.yaw };
    g.teleport(to.x, to.z, to.yaw);
    if (kind === 'enter') { g.notify('Wchodzisz w ciemność. Zapal pochodnię.', 'warn'); }
  }

  update(dt, playerPos) {
    const inside = this.game.world.isCave(playerPos.x, playerPos.z);
    this.factor = damp(this.factor, inside ? 1 : 0, 3, dt);
    this.game.atmos.cave = this.factor;
    const near = Math.hypot(playerPos.x - CAVE.cx, playerPos.z - CAVE.cz) < CAVE.radius + 70;
    this.group.children.forEach((c) => { if (c === this.entranceGroup) return; c.visible = near; });
    this.game.terrain.hideCave = !near;
  }
}
