// Particle effects (chips, sparks, blood, leaves, dust, smoke) rendered as soft point sprites, plus gameplay fx helpers.
import * as THREE from 'three';

const VERT = /* glsl */`
  attribute float size; attribute float alpha; attribute vec3 color;
  varying float vAlpha; varying vec3 vColor;
  uniform float uScale;
  void main() {
    vAlpha = alpha; vColor = color;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */`
  precision mediump float;
  varying float vAlpha; varying vec3 vColor;
  uniform float uSoft;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float a = mix(1.0, smoothstep(1.0, 0.0, r), uSoft) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

class Layer {
  constructor(scene, max, { additive = false, soft = 0.0, depthWrite = false }) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max);
    this.drag = new Float32Array(max); this.grow = new Float32Array(max); this.size0 = new Float32Array(max); this.a0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 600 }, uSoft: { value: soft } } });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points); this.geo = g;
  }
  add(x, y, z, vx, vy, vz, r, g, b, size, life, grav = 9, drag = 0.5, alpha = 1, grow = 0) {
    if (this.n >= this.max) { this.n = this.max - 1; }
    const i = this.n++, i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z; this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b; this.size[i] = this.size0[i] = size; this.life[i] = this.maxLife[i] = life;
    this.grav[i] = grav; this.drag[i] = drag; this.alpha[i] = this.a0[i] = alpha; this.grow[i] = grow;
  }
  update(dt) {
    for (let i = this.n - 1; i >= 0; i--) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.remove(i); continue; }
      const i3 = i * 3, k = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= k; this.vel[i3 + 2] *= k; this.vel[i3 + 1] = this.vel[i3 + 1] * k - this.grav[i] * dt;
      this.pos[i3] += this.vel[i3] * dt; this.pos[i3 + 1] += this.vel[i3 + 1] * dt; this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      this.alpha[i] = this.a0[i] * (t < 0.15 ? t / 0.15 : 1 - Math.pow((t - 0.15) / 0.85, 1.5));
      this.size[i] = this.size0[i] * (1 + this.grow[i] * t);
    }
    this.geo.setDrawRange(0, this.n);
    for (const k of ['position', 'color', 'size', 'alpha']) this.geo.attributes[k].needsUpdate = true;
  }
  remove(i) {
    const j = --this.n; if (i === j) return;
    const c3 = (a, b) => { a[i * 3] = a[j * 3]; a[i * 3 + 1] = a[j * 3 + 1]; a[i * 3 + 2] = a[j * 3 + 2]; };
    c3(this.pos); c3(this.col); c3(this.vel);
    for (const a of [this.size, this.alpha, this.life, this.maxLife, this.grav, this.drag, this.grow, this.size0, this.a0]) a[i] = a[j];
  }
}

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const rnd = (a, b) => a + Math.random() * (b - a);

export class FX {
  constructor(game) {
    this.game = game;
    this.solid = new Layer(game.scene, 2500, { soft: 0.0, depthWrite: true });
    this.soft = new Layer(game.scene, 1800, { soft: 1.0 });
    this.glow = new Layer(game.scene, 1500, { additive: true, soft: 1.0 });
    this.shake = 0;
  }
  resize(h) { for (const l of [this.solid, this.soft, this.glow]) l.mat.uniforms.uScale.value = h * 0.5 / Math.tan((this.game.camera.fov * Math.PI) / 360) * 0.12; }
  update(dt) { this.solid.update(dt); this.soft.update(dt); this.glow.update(dt); this.resize(this.game.renderer.domElement.height); }

  burst(layer, x, y, z, n, o) {
    const L = this[layer];
    const cols = Array.isArray(o.color) ? o.color : [o.color];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = rnd(o.speed[0], o.speed[1]), up = rnd(o.up?.[0] ?? 0, o.up?.[1] ?? 0);
      const dx = o.dir ? o.dir[0] : 0, dz = o.dir ? o.dir[1] : 0, dw = o.dirW ?? 0;
      const c = C(cols[(Math.random() * cols.length) | 0]);
      L.add(x + rnd(-1, 1) * (o.spread || 0), y + rnd(-1, 1) * (o.spread || 0), z + rnd(-1, 1) * (o.spread || 0),
        Math.cos(a) * s * (1 - dw) + dx * s * dw * 1.4, up, Math.sin(a) * s * (1 - dw) + dz * s * dw * 1.4,
        c[0], c[1], c[2], rnd(o.size[0], o.size[1]), rnd(o.life[0], o.life[1]), o.grav ?? 9, o.drag ?? 0.6, o.alpha ?? 1, o.grow ?? 0);
    }
  }
  chips(x, y, z, dx, dz, kind) {
    const colors = kind === 'rock' ? ['#8a8a90', '#5f5f66', '#b0b0b6'] : kind === 'leaf' ? ['#4f9a3a', '#7bbf4a', '#2f6a30'] : ['#8a5a32', '#b58a54', '#6b4a2f'];
    this.burst('solid', x, y, z, kind === 'leaf' ? 8 : 10, { color: colors, speed: [1.5, 4.5], up: [1.5, 4.5], size: [0.5, 1.1], life: [0.5, 1.0], grav: 12, dir: [-dx, -dz], dirW: 0.35 });
    if (kind === 'rock') this.burst('glow', x, y, z, 6, { color: ['#ffd27a', '#fff2c0'], speed: [2, 6], up: [1, 4], size: [0.35, 0.7], life: [0.15, 0.35], grav: 6, dir: [-dx, -dz], dirW: 0.3 });
  }
  nodeHit(n, res, dx, dz, destroyed) {
    const kind = res.tool === 'pickaxe' ? 'rock' : 'wood';
    const y = n.y + (res.tool === 'axe' ? 1.2 : 0.7) * n.scale;
    this.chips(n.x - dx * res.radius * n.scale, y, n.z - dz * res.radius * n.scale, dx, dz, kind);
    if (res.tool === 'axe') this.burst('solid', n.x, n.y + res.height * n.scale * 0.85, n.z, destroyed ? 26 : 5, { color: ['#4f9a3a', '#7bbf4a', '#3d7a30', '#a9c850'], speed: [0.5, 2.5], up: [0, 1.5], size: [0.5, 1.0], life: [1.2, 2.4], grav: 2.2, drag: 0.9, spread: 1.4 });
    if (destroyed) this.dust(n.x, n.y + 0.2, n.z, 1.4);
  }
  hitEntity(e, dir, heavy) {
    const x = e.x, y = e.y + (e.height || 1) * 0.6, z = e.z, dx = Math.sin(dir), dz = Math.cos(dir);
    this.burst('soft', x, y, z, heavy ? 16 : 9, { color: e.bloodColor || ['#b3182a', '#8a1220', '#d02a3a'], speed: [1, 4], up: [0.5, 3], size: [0.4, 0.9], life: [0.4, 0.8], grav: 10, dir: [dx, dz], dirW: 0.6, alpha: 0.95 });
    this.burst('glow', x, y, z, 4, { color: ['#ffe8b0', '#ffffff'], speed: [1, 3], up: [0, 2], size: [0.25, 0.5], life: [0.1, 0.22], grav: 0, dir: [dx, dz], dirW: 0.5 });
  }
  playerHit(pos, from) {
    this.burst('soft', pos.x, pos.y + 1.2, pos.z, 12, { color: ['#a01020', '#c02030'], speed: [1, 3], up: [0.5, 2.5], size: [0.4, 0.8], life: [0.4, 0.8], grav: 9, dir: [Math.sin(from), Math.cos(from)], dirW: 0.4 });
  }
  parry(pos, from) {
    const x = pos.x + Math.sin(from + Math.PI) * 0.9, z = pos.z + Math.cos(from + Math.PI) * 0.9;
    this.burst('glow', x, pos.y + 1.3, z, 22, { color: ['#fff2a8', '#ffd25a', '#ffffff'], speed: [2, 7], up: [0, 3], size: [0.3, 0.8], life: [0.15, 0.4], grav: 4 });
  }
  block(pos, from) {
    const x = pos.x + Math.sin(from + Math.PI) * 0.8, z = pos.z + Math.cos(from + Math.PI) * 0.8;
    this.burst('glow', x, pos.y + 1.2, z, 8, { color: ['#ffd27a', '#fff2c0'], speed: [1, 4], up: [0, 2], size: [0.25, 0.5], life: [0.1, 0.25], grav: 5 });
  }
  dust(x, y, z, r = 1) { this.burst('soft', x, y, z, 6, { color: ['#c9b98f', '#b0a27a'], speed: [0.3, 1.6 * r], up: [0.2, 1], size: [1, 2.2], life: [0.5, 1.0], grav: -0.3, drag: 1.5, alpha: 0.35, grow: 1.2, spread: 0.4 * r }); }
  footDust(x, y, z, biome) { this.burst('soft', x, y + 0.05, z, 2, { color: biome === 1 ? ['#e8d59c'] : ['#8a7a5a', '#6a5a3a'], speed: [0.2, 0.8], up: [0.2, 0.7], size: [0.6, 1.2], life: [0.35, 0.7], grav: -0.2, drag: 1.5, alpha: 0.28, grow: 1.0 }); }
  splash(x, z, n = 6) { this.burst('soft', x, 0.05, z, n, { color: ['#dff2ff', '#ffffff'], speed: [0.6, 2], up: [1, 3], size: [0.5, 1.0], life: [0.4, 0.8], grav: 9, alpha: 0.7 }); }
  smoke(x, y, z, s = 1) { this.burst('soft', x, y, z, 1, { color: ['#5a5550', '#7a746c'], speed: [0.05, 0.3], up: [0.8, 1.6], size: [1.2 * s, 2.2 * s], life: [1.6, 2.8], grav: -0.2, drag: 0.4, alpha: 0.28, grow: 2.2 }); }
  ember(x, y, z) { this.burst('glow', x, y, z, 1, { color: ['#ff9a2a', '#ffd27a', '#ff5a1a'], speed: [0.1, 0.5], up: [0.8, 2.4], size: [0.16, 0.34], life: [0.6, 1.4], grav: -0.6, drag: 0.5, spread: 0.12 }); }
}
