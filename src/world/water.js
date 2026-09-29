// Sea/lake surface: animated waves, depth colouring, shore foam and sky reflection (all in one shader).
import * as THREE from 'three';
import { WORLD } from './worldgen.js';

const VERT = /* glsl */`
  uniform float uTime;
  varying vec3 vWorld;
  varying vec3 vN;
  varying float vWave;
  #include <fog_pars_vertex>
  vec3 waveAt(vec2 p, out vec3 n) {
    float t = uTime;
    vec2 d1 = normalize(vec2(1.0, 0.35)), d2 = normalize(vec2(-0.4, 1.0)), d3 = normalize(vec2(0.7, -0.8));
    float a1 = dot(p, d1) * 0.11 + t * 0.9, a2 = dot(p, d2) * 0.19 + t * 1.25, a3 = dot(p, d3) * 0.41 + t * 1.9;
    float h = sin(a1) * 0.22 + sin(a2) * 0.12 + sin(a3) * 0.05;
    vec2 g = d1 * cos(a1) * 0.22 * 0.11 + d2 * cos(a2) * 0.12 * 0.19 + d3 * cos(a3) * 0.05 * 0.41;
    n = normalize(vec3(-g.x * 3.0, 1.0, -g.y * 3.0));
    return vec3(p.x, h, p.y);
  }
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n; vec3 w = waveAt(wp.xz, n);
    wp.y += w.y; vWave = w.y; vN = n; vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const FRAG = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform sampler2D uHeight;
  uniform vec3 uHorizon, uTop, uSunDir, uSunCol, uMoonDir, uShallow, uDeep, uAmbient;
  uniform float uSunPow, uMoonPow, uAlpha;
  varying vec3 vWorld; varying vec3 vN; varying float vWave;
  #include <fog_pars_fragment>
  vec3 waveNormal(vec2 p) {
    float t = uTime;
    vec2 d1 = normalize(vec2(1.0, 0.35)), d2 = normalize(vec2(-0.4, 1.0)), d3 = normalize(vec2(0.7, -0.8)), d4 = normalize(vec2(-0.9, -0.3));
    float a1 = dot(p, d1) * 0.11 + t * 0.9, a2 = dot(p, d2) * 0.19 + t * 1.25, a3 = dot(p, d3) * 0.41 + t * 1.9, a4 = dot(p, d4) * 0.93 + t * 2.6;
    vec2 g = d1 * cos(a1) * 0.22 * 0.11 + d2 * cos(a2) * 0.12 * 0.19 + d3 * cos(a3) * 0.05 * 0.41 + d4 * cos(a4) * 0.022 * 0.93;
    return normalize(vec3(-g.x * 3.0, 1.0, -g.y * 3.0));
  }
  float hgt(vec2 xz) {
    vec2 f = xz + ${(WORLD.half).toFixed(1)};
    vec2 i = floor(f), u = f - i;
    float n = ${WORLD.n.toFixed(1)};
    vec2 uv0 = (i + 0.5) / n, s = 1.0 / vec2(n);
    float a = texture2D(uHeight, uv0).r, b = texture2D(uHeight, uv0 + vec2(s.x, 0.0)).r;
    float c = texture2D(uHeight, uv0 + vec2(0.0, s.y)).r, d = texture2D(uHeight, uv0 + s).r;
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec3 V = normalize(cameraPosition - vWorld);
    float ground = hgt(vWorld.xz);
    float depth = max(0.0, -ground);
    // ripples
    vec2 q = vWorld.xz;
    float r1 = vnoise(q * 1.7 + uTime * 0.35), r2 = vnoise(q * 3.1 - uTime * 0.5);
    vec3 N = normalize(waveNormal(vWorld.xz) + vec3((r1 - 0.5) * 0.07, 0.0, (r2 - 0.5) * 0.07));
    float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
    fres = clamp(0.04 + fres * 0.96, 0.0, 1.0);
    vec3 R = reflect(-V, N);
    vec3 sky = mix(uHorizon, uTop, pow(clamp(R.y, 0.0, 1.0), 0.6));
    vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 5.5, depth));
    body *= uAmbient;
    vec3 col = mix(body, sky, fres * 0.85);
    // sun / moon glints
    float sp = pow(max(dot(R, uSunDir), 0.0), 90.0) * uSunPow * 0.5 + pow(max(dot(R, uSunDir), 0.0), 700.0) * uSunPow;
    float mp = pow(max(dot(R, uMoonDir), 0.0), 320.0) * uMoonPow;
    col += uSunCol * sp * 1.4 + vec3(0.65, 0.75, 1.0) * mp * 1.6;
    // shore foam
    float wobble = sin(uTime * 1.1 + q.x * 0.35 + q.y * 0.27) * 0.18 + (r1 - 0.5) * 0.25;
    float edge = depth + wobble * 0.7;
    float foam = smoothstep(0.26, 0.0, edge) * (0.6 + 0.4 * vnoise(q * 2.4 + uTime * 0.3));
    float band = smoothstep(0.03, 0.0, abs(fract(edge * 1.6 - uTime * 0.25) - 0.5) - 0.44) * smoothstep(1.1, 0.3, edge) * 0.45;
    foam = clamp(foam + band * 0.6, 0.0, 1.0);
    col = mix(col, uAmbient * 0.6 + vec3(0.55) * uAmbient, foam * 0.9);
    float alpha = mix(0.45, 1.0, smoothstep(0.0, 3.2, depth)) * uAlpha;
    alpha = max(alpha, foam * 0.95);
    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export class Water {
  constructor(scene, world) {
    this.world = world;
    const n = WORLD.n;
    const data = new Float32Array(n * n);
    data.set(world.heights);
    this.heightTex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.FloatType);
    this.heightTex.magFilter = THREE.NearestFilter; this.heightTex.minFilter = THREE.NearestFilter;
    this.heightTex.needsUpdate = true;
    const u = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uHeight: { value: this.heightTex },
      uHorizon: { value: new THREE.Color(0xa9d0ee) }, uTop: { value: new THREE.Color(0x3f86d6) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(0xffffff) }, uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
      uShallow: { value: new THREE.Color(0x2fb0a8) }, uDeep: { value: new THREE.Color(0x0b3a63) }, uAmbient: { value: new THREE.Color(1, 1, 1) },
      uSunPow: { value: 1 }, uMoonPow: { value: 0 }, uAlpha: { value: 1 },
    }]);
    this.material = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: FRAG, transparent: true, fog: true, depthWrite: false });
    // dense grid near the centre, coarse to the horizon
    const geo = new THREE.PlaneGeometry(2600, 2600, 260, 260);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }
  update(time, camPos, atmos) {
    const u = this.material.uniforms;
    u.uTime.value = time;
    const s = 10;                                             // follow camera, snapped to the wave grid
    this.mesh.position.set(Math.round(camPos.x / s) * s, WORLD.seaLevel, Math.round(camPos.z / s) * s);
    if (atmos) {
      u.uHorizon.value.copy(atmos.horizon); u.uTop.value.copy(atmos.top);
      u.uSunDir.value.copy(atmos.sunDir); u.uMoonDir.value.copy(atmos.moonDir); u.uSunCol.value.copy(atmos.sunColor);
      u.uSunPow.value = atmos.sunVis; u.uMoonPow.value = atmos.moonVis;
      u.uAmbient.value.setScalar(atmos.waterLight);
    }
  }
}
