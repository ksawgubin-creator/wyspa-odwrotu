// Third-person over-the-shoulder camera with mouse look, spring-arm collision, sprint FOV kick and shake.
import * as THREE from 'three';
import { CONFIG } from '../../data/config.js';
import { clamp, damp, lerp } from '../engine/util.js';

const CC = CONFIG.camera;
export class CameraRig {
  constructor(game) {
    this.game = game;
    this.yaw = Math.PI; this.pitch = 0.32;
    this.dist = CC.distance; this.curDist = CC.distance;
    this.sens = CC.sensitivity;
    this.shakeAmt = 0; this.shakeT = 0;
    this.fov = CC.fov; this.target = new THREE.Vector3(); this.smoothT = null;
    this.free = false; this.freePos = new THREE.Vector3();
    this.zoomExtra = 0;                       // e.g. aiming
    this.lookAtPos = new THREE.Vector3();
    this.invertY = false;
  }
  shake(a) { this.shakeAmt = Math.min(0.7, this.shakeAmt + a); }
  // look input is consumed every render frame
  handleMouse(input) {
    const d = input.takeMouse();
    if (!input.locked || !input.enabled) return;
    this.yaw -= d.x * this.sens;
    this.pitch = clamp(this.pitch + d.y * this.sens * (this.invertY ? -1 : 1), CC.minPitch, CC.maxPitch);
  }
  update(dt, player, alpha) {
    const g = this.game, cam = g.camera;
    const rp = player.renderPos(alpha, this._rp || (this._rp = { x: 0, y: 0, z: 0 }));
    // pivot at chest height, offset to the right shoulder
    const sneakDrop = player.sneaking ? -0.3 : 0;
    const ty = rp.y + CC.height + sneakDrop + (player.dead ? -1.0 : 0);
    const rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
    const shoulder = CC.shoulder * (player.aiming ? 1.2 : 1);
    if (!this.smoothT) this.smoothT = new THREE.Vector3(rp.x, ty, rp.z);
    this.smoothT.x = rp.x; this.smoothT.z = rp.z; this.smoothT.y = damp(this.smoothT.y, ty, 10, dt);   // XZ follows exactly, only height is eased
    const tx = this.smoothT.x + rx * shoulder, tyy = this.smoothT.y, tz = this.smoothT.z + rz * shoulder;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dx = -Math.sin(this.yaw) * cp, dy = sp, dz = -Math.cos(this.yaw) * cp;
    let want = (this.dist + this.zoomExtra) * (player.aiming ? 0.8 : 1);
    // spring arm: shorten if terrain/colliders block the line to the desired position
    const ax = tx, ay = tyy, az = tz;
    const bx = tx + dx * want, by = tyy + dy * want, bz = tz + dz * want;
    const t = g.colliders.segmentT(ax, ay, az, bx, by, bz, 0.35, (x, z) => Math.max(g.world.getHeight(x, z), 0.05));
    const clearDist = Math.max(0.6, want * t);
    // shorten instantly, extend smoothly
    this.curDist = clearDist < this.curDist ? clearDist : damp(this.curDist, clearDist, 5, dt);
    let cx = tx + dx * this.curDist, cy = tyy + dy * this.curDist, cz = tz + dz * this.curDist;
    const gh = Math.max(g.world.getHeight(cx, cz), 0.05) + 0.3;
    if (cy < gh) cy = gh;
    // shake
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.9);
    this.shakeT += dt * 60;
    const s = this.shakeAmt * this.shakeAmt;
    cam.position.set(cx + Math.sin(this.shakeT * 1.7) * s * 0.35, cy + Math.cos(this.shakeT * 2.1) * s * 0.35, cz + Math.sin(this.shakeT * 1.3 + 2) * s * 0.35);
    this.lookAtPos.set(tx - dx * 8, tyy - dy * 8 + 0.0, tz - dz * 8);
    cam.lookAt(this.lookAtPos);
    cam.rotateZ(Math.sin(this.shakeT * 1.1) * s * 0.03);
    const fovT = CC.fov + (player.sprinting ? 5 : 0) + (player.aiming ? -8 : 0) + (player.dodge ? 3 : 0);
    this.fov = damp(this.fov, fovT, 6, dt);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }
}
