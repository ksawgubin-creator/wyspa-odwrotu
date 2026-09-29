// Volcano: animated lava pool in the crater (deadly), smoke plume, ashfall and glow. Endgame zone (obsidian, sulfur, boss).
import * as THREE from 'three';
import { LAYOUT } from './worldgen.js';
import { clamp } from '../engine/util.js';

const VERT = /* glsl */`
varying vec3 vW;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = /* glsl */`
precision highp float;
uniform float uTime;
varying vec3 vW;
#include <fog_pars_fragment>
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += n(p) * a; p = p * 2.1 + 7.3; a *= 0.5; } return s; }
void main() {
  vec2 p = vW.xz * 0.35;
  float f = fbm(p + vec2(uTime * 0.05, -uTime * 0.03)) + 0.5 * fbm(p * 2.3 - uTime * 0.06);
  float crack = smoothstep(0.55, 0.85, f);
  vec3 crust = vec3(0.08, 0.03, 0.02), hot = vec3(1.0, 0.36, 0.06), core = vec3(1.0, 0.85, 0.35);
  vec3 c = mix(hot, crust, crack * 0.85);
  c += core * pow(clamp(1.0 - f, 0.0, 1.0), 4.0) * 0.7;
  c *= 1.6;
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

export class Volcano {
  constructor(game) {
    this.game = game;
    const V = LAYOUT.volcano;
    this.pos = { x: V.x, z: V.z, y: V.lavaY };
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]);
    this.mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, fog: true });
    this.radius = V.craterR * 1.55;
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(this.radius, 32).rotateX(-Math.PI / 2), this.mat);
    this.mesh.position.set(V.x, V.lavaY, V.z); game.scene.add(this.mesh);
    this.light = game.lights.add({ x: V.x, y: V.lavaY + 3, z: V.z, color: 0xff5a1a, intensity: 5, radius: 42, flicker: 0.8, scare: 0.6, scareRadius: 18, on: true });
    this.burnMsg = 0; this.t = 0;
  }
  update(dt) {
    const g = this.game, p = g.player, V = LAYOUT.volcano;
    this.t += dt; this.mat.uniforms.uTime.value = g.time; this.burnMsg -= dt;
    const dist = Math.hypot(p.pos.x - V.x, p.pos.z - V.z);
    const cam = g.camera.position;
    const camD = Math.hypot(cam.x - V.x, cam.z - V.z);
    this.mesh.visible = camD < 260; this.light.on = camD < 200;
    if (camD < 200) {
      // smoke plume + embers from the crater
      this._t = (this._t || 0) - dt;
      if (this._t <= 0) { this._t = 0.11; const a = Math.random() * 6.28, r = Math.random() * this.radius * 0.7; g.fx.smoke(V.x + Math.cos(a) * r, V.lavaY + 1.5, V.z + Math.sin(a) * r, 5.5); if (Math.random() < 0.6) g.fx.ember(V.x + Math.cos(a) * r, V.lavaY + 0.6, V.z + Math.sin(a) * r); if (Math.random() < 0.15) g.fx.burst('glow', V.x + Math.cos(a) * r, V.lavaY + 1, V.z + Math.sin(a) * r, 6, { color: ['#ff7a20', '#ffd070'], speed: [1, 4], up: [4, 10], size: [0.7, 1.4], life: [0.8, 1.6], grav: 8 }); }
    }
    // ash falling around the player near the volcano
    if (dist < 75 && Math.random() < dt * 25) { const a = Math.random() * 6.28, r = Math.random() * 16; g.fx.burst('soft', p.pos.x + Math.cos(a) * r, p.pos.y + 9 + Math.random() * 4, p.pos.z + Math.sin(a) * r, 1, { color: ['#4a4a4e', '#5a5a60'], speed: [0.1, 0.5], up: [-1.2, -0.4], size: [0.5, 0.9], life: [3, 5], grav: 0.2, drag: 0.6, alpha: 0.5 }); }
    // lava burns
    if (!p.dead && dist < this.radius + 1 && p.pos.y < V.lavaY + 0.55 && g.world.getHeight(p.pos.x, p.pos.z) < V.lavaY + 0.4) {
      const fire = p.equipment.chest && p.equipment.chest.id === 'obsidian_armor';
      const dmg = (fire ? 4 : 32) * dt;
      p.stats.health -= dmg; g.hurtFlash = Math.min(0.7, g.hurtFlash + dt * 2);
      g.fx.flame(p.pos.x, p.pos.y + 0.3, p.pos.z, 0.8);
      if (this.burnMsg <= 0) { g.notify(fire ? 'Zbroja obsydianowa chroni Cię przed lawą… ale nie na długo.' : 'LAWA! Wracaj!', 'warn'); this.burnMsg = 2; g.audio?.play('hurt', { pos: p.pos }); }
      if (p.stats.health <= 0) p.die({ dir: p.yaw + Math.PI, cause: 'lawa' });
    }
  }
}
