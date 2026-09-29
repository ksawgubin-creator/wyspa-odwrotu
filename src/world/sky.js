// Sky dome (sun, moon, stars, clouds), sun/moon lighting, fog and ambient light driven by the DayClock.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from '../engine/util.js';

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;   // always at the far plane
  }
`;
const SKY_FRAG = /* glsl */`
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop, uHor, uSunDir, uMoonDir, uSunCol, uBlood;
  uniform float uTime, uStars, uCloud, uCloudDark, uSunGlow, uBloodMix;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += vnoise(p) * a; p = p * 2.03 + 11.7; a *= 0.5; } return s; }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHor, uTop, pow(clamp(h, 0.0, 1.0), 0.5));
    if (h < 0.0) col = mix(uHor, uHor * 0.55, clamp(-h * 5.0, 0.0, 1.0));
    // sun
    float sd = max(dot(d, uSunDir), 0.0);
    col += uSunCol * (pow(sd, 90.0) * 0.8 + pow(sd, 8.0) * 0.32 * uSunGlow + pow(sd, 2.0) * 0.08 * uSunGlow);
    float disc = smoothstep(0.99935, 0.99965, sd);
    col = mix(col, uSunCol * 2.4, disc * smoothstep(-0.06, 0.02, uSunDir.y + h * 0.0) * step(-0.02, h));
    // stars
    if (uStars > 0.01 && h > -0.05) {
      vec3 sp = d * 220.0;
      vec3 cell = floor(sp);
      float r = hash3(cell);
      vec3 f = fract(sp) - 0.5;
      float star = step(0.9935, r) * smoothstep(0.42, 0.0, length(f));
      float tw = 0.65 + 0.35 * sin(uTime * (1.5 + r * 4.0) + r * 60.0);
      vec3 sc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.92, 0.8), hash3(cell + 3.1));
      col += sc * star * tw * uStars * smoothstep(0.0, 0.18, h) * 1.6;
      // faint milky band
      float band = exp(-pow(dot(d, normalize(vec3(0.4, 0.3, 0.86))) * 4.5, 2.0));
      col += vec3(0.18, 0.2, 0.34) * band * (0.35 + 0.65 * fbm(d.xz * 7.0 + d.y * 3.0)) * uStars * 0.5 * smoothstep(0.0, 0.2, h);
    }
    // moon
    float md = dot(d, uMoonDir);
    if (md > 0.99) {
      vec3 up = abs(uMoonDir.y) < 0.95 ? vec3(0, 1, 0) : vec3(1, 0, 0);
      vec3 rt = normalize(cross(up, uMoonDir)); vec3 tp = cross(uMoonDir, rt);
      vec2 mp = vec2(dot(d, rt), dot(d, tp)) / 0.0235;
      float r2 = length(mp);
      if (r2 < 1.0) {
        float crater = fbm(mp * 3.2 + 5.0);
        float mare = smoothstep(0.42, 0.62, fbm(mp * 1.4 + 2.0));
        vec3 mc = mix(vec3(0.93, 0.93, 0.88), vec3(0.62, 0.64, 0.7), mare * 0.7) * (0.82 + crater * 0.3);
        mc = mix(mc, uBlood * 1.15, uBloodMix);
        float lit = smoothstep(1.0, 0.9, r2);
        col = mix(col, mc * 1.5, lit * step(-0.03, h));
      }
    }
    col += mix(vec3(0.55, 0.65, 0.9), uBlood, uBloodMix) * pow(max(md, 0.0), 220.0) * 0.55 * step(-0.03, h);
    // clouds
    if (h > 0.005 && uCloud > 0.01) {
      vec2 cp = d.xz / (h + 0.22) * 1.6 + vec2(uTime * 0.004, uTime * 0.0018);
      float c = fbm(cp * 0.9);
      float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.28, c);
      cov *= smoothstep(0.0, 0.16, h);
      float lightSide = clamp(dot(normalize(vec3(uSunDir.x, 0.0, uSunDir.z)), normalize(vec3(d.x, 0.0, d.z))) * 0.5 + 0.5, 0.0, 1.0);
      vec3 cc = mix(uHor * 0.9 + 0.06, uSunCol * 0.9 + 0.35 * uHor, 0.35 + 0.35 * lightSide * clamp(uSunDir.y * 4.0 + 0.6, 0.0, 1.0));
      cc = mix(cc, uHor * 0.35 + vec3(0.03, 0.035, 0.05), uCloudDark);
      col = mix(col, cc, cov * (0.85 - 0.25 * uCloudDark));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const K = (e, top, hor, fog, sun, amb, ambG, ambI, sunI, moonI, exp, stars) => ({ e, top: new THREE.Color(top), hor: new THREE.Color(hor), fog: new THREE.Color(fog), sun: new THREE.Color(sun), amb: new THREE.Color(amb), ambG: new THREE.Color(ambG), ambI, sunI, moonI, exp, stars });
// Keyframes indexed by sun elevation (sin of the angle). ROBOCZE look values, tuned by eye.
const KEYS = [
  K(-0.40, '#02050d', '#050a17', '#060b18', '#000000', '#24387a', '#0a0e1a', 0.85, 0.0, 1.0, 1.00, 1.0),
  K(-0.16, '#050b1e', '#111a36', '#0e1428', '#000000', '#22346c', '#0a0e1a', 0.85, 0.0, 1.0, 1.00, 1.0),
  K(-0.05, '#111d4a', '#5a3d66', '#3a2e50', '#ff6a38', '#3a2f5a', '#15121c', 0.50, 0.15, 0.55, 1.05, 0.55),
  K(0.04, '#2b4585', '#ff8f50', '#c8825f', '#ff9250', '#8a6a78', '#3b2c2a', 0.78, 1.0, 0.0, 1.05, 0.12),
  K(0.16, '#3a6cba', '#f2b98c', '#c9b49c', '#ffd7a0', '#9db4d4', '#5a5040', 1.00, 2.0, 0.0, 1.0, 0.0),
  K(0.42, '#3a80d8', '#b9d8f0', '#b9d3e6', '#fff1d6', '#a9cdf5', '#6a6a50', 1.15, 2.9, 0.0, 1.0, 0.0),
  K(1.00, '#3579d6', '#a9d0ee', '#b2cfe6', '#fff8ec', '#a9cdf5', '#6a6a50', 1.20, 3.1, 0.0, 1.0, 0.0),
];

const tmpC = new THREE.Color();
export class Atmosphere {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    // colours exposed to other systems (water, particles)
    this.horizon = new THREE.Color(); this.top = new THREE.Color(); this.fogColor = new THREE.Color(); this.sunColor = new THREE.Color();
    this.sunDir = new THREE.Vector3(); this.moonDir = new THREE.Vector3();
    this.sunVis = 1; this.moonVis = 0; this.waterLight = 1; this.dayness = 1;
    this.weather = { cloud: 0.42, dark: 0, fogMul: 1, lightMul: 1 };   // driven by the weather system
    this.blood = 0;                                                       // blood moon tint 0..1
    this.nightVision = 0; this.cave = 0; this.flash = 0;

    const geo = new THREE.SphereGeometry(1, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      uniforms: {
        uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uMoonDir: { value: new THREE.Vector3() },
        uSunCol: { value: new THREE.Color() }, uBlood: { value: new THREE.Color(0xc02418) }, uTime: { value: 0 }, uStars: { value: 0 }, uCloud: { value: 0.4 },
        uCloudDark: { value: 0 }, uSunGlow: { value: 1 }, uBloodMix: { value: 0 },
      },
    });
    this.dome = new THREE.Mesh(geo, this.skyMat);
    this.dome.scale.setScalar(900);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);
    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.light.castShadow = true;
    const sc = this.light.shadow.camera;
    sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 320;
    this.light.shadow.mapSize.set(2048, 2048);
    this.light.shadow.bias = -0.0006;
    this.light.shadow.normalBias = 0.05;
    scene.add(this.light); scene.add(this.light.target);
    this.fog = new THREE.Fog(0xb2cfe6, 40, 360);
    scene.fog = this.fog;
    this.shadowSize = 2048;
  }

  setShadowQuality(size) {
    if (size === this.shadowSize) return;
    this.shadowSize = size;
    this.light.castShadow = size > 0;
    if (size > 0) { this.light.shadow.mapSize.set(size, size); this.light.shadow.map?.dispose(); this.light.shadow.map = null; }
  }

  sample(e) {
    let i = 0;
    while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const t = clamp((e - a.e) / (b.e - a.e), 0, 1);
    return { a, b, t };
  }

  // clock: DayClock; focus: THREE.Vector3 (player) for shadow follow
  update(clock, focus, camera, time) {
    clock.sunDir(this.sunDir); clock.moonDir(this.moonDir);
    this.sunDir.normalize(); this.moonDir.normalize();
    const e = this.sunDir.y;
    const { a, b, t } = this.sample(e);
    const L = (k) => tmpC.copy(a[k]).lerp(b[k], t);
    this.top.copy(L('top')); this.horizon.copy(L('hor')); this.fogColor.copy(L('fog')); this.sunColor.copy(L('sun'));
    const amb = new THREE.Color().copy(a.amb).lerp(b.amb, t), ambG = new THREE.Color().copy(a.ambG).lerp(b.ambG, t);
    const wx = this.weather;
    let ambI = lerp(a.ambI, b.ambI, t), sunI = lerp(a.sunI, b.sunI, t), moonI = lerp(a.moonI, b.moonI, t);
    const stars = lerp(a.stars, b.stars, t) * (1 - wx.dark * 0.8);
    this.dayness = smoothstep(-0.06, 0.2, e);
    const nightness = 1 - this.dayness;
    // storm / fog dim the sky and the light
    const dim = 1 - wx.dark * 0.55;
    this.top.multiplyScalar(dim); this.horizon.multiplyScalar(lerp(1, 0.75, wx.dark)); this.fogColor.multiplyScalar(lerp(1, 0.7, wx.dark));
    if (this.blood > 0) {
      const red = new THREE.Color(0x3a0a0e), redH = new THREE.Color(0x9a2418);
      this.top.lerp(red, this.blood * nightness * 0.75); this.horizon.lerp(redH, this.blood * nightness * 0.6); this.fogColor.lerp(new THREE.Color(0x3a0e10), this.blood * nightness * 0.7);
    }
    sunI *= dim * wx.lightMul; ambI *= lerp(1, 0.8, wx.dark);
    this.sunVis = clamp(sunI / 2, 0, 1) * (1 - wx.dark);
    this.moonVis = nightness * (1 - wx.dark);
    this.waterLight = clamp(0.07 + this.dayness * 1.0, 0.07, 1.1) * (1 - wx.dark * 0.35);

    // hemisphere + fog
    this.hemi.color.copy(amb); this.hemi.groundColor.copy(ambG); this.hemi.intensity = ambI;
    this.fog.color.copy(this.fogColor);
    const fogNear = lerp(32, 14, nightness) * wx.fogMul, fogFar = lerp(380, 165, nightness) * wx.fogMul;
    this.fog.near = fogNear; this.fog.far = fogFar;

    // single shadow-casting key light: sun by day, moon by night
    const sunUp = e > 0;
    const dir = sunUp ? this.sunDir : this.moonDir;
    const bloodCol = new THREE.Color(0xff5a48);
    if (sunUp) { this.light.color.copy(this.sunColor); this.light.intensity = sunI; }
    else {
      const mc = new THREE.Color(0x9bb4ff).lerp(bloodCol, this.blood * 0.6);
      this.light.color.copy(mc);
      this.light.intensity = moonI * 1.5 * smoothstep(-0.02, -0.18, e) * (1 - wx.dark * 0.6);
    }
    // texel-snapped shadow follow
    const ts = 92 / this.shadowSize;
    const d = dir.clone().normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(d).normalize(), up = d.clone().cross(right).normalize();
    const ax = Math.round(focus.dot(right) / ts) * ts, ay = Math.round(focus.dot(up) / ts) * ts, az = focus.dot(d);
    const snapped = right.clone().multiplyScalar(ax).add(up.clone().multiplyScalar(ay)).add(d.clone().multiplyScalar(az));
    this.light.target.position.copy(snapped);
    this.light.position.copy(snapped).addScaledVector(d, 150);
    this.light.target.updateMatrixWorld();

    // sky uniforms
    const u = this.skyMat.uniforms;
    u.uTop.value.copy(this.top); u.uHor.value.copy(this.horizon); u.uSunDir.value.copy(this.sunDir); u.uMoonDir.value.copy(this.moonDir);
    u.uSunCol.value.copy(this.sunColor); u.uTime.value = time; u.uStars.value = stars * (1 - this.blood * 0.5);
    u.uCloud.value = wx.cloud; u.uCloudDark.value = wx.dark; u.uSunGlow.value = 1 - wx.dark * 0.9; u.uBloodMix.value = this.blood;
    this.dome.position.copy(camera.position);

    if (this.flash > 0.01) { this.hemi.intensity += this.flash * 3.2; this.light.intensity += this.flash * 2.4; this.top.lerp(new THREE.Color(0xdfe8ff), this.flash * 0.5); u.uTop.value.copy(this.top); }
    // caves: no sky light, dark ambience even by day
    const cv = this.cave || 0;
    if (cv > 0.001) { this.light.intensity *= 1 - cv; this.hemi.intensity = lerp(this.hemi.intensity, 0.16, cv); this.fog.color.lerp(new THREE.Color(0x05060a), cv); this.fog.near = lerp(this.fog.near, 4, cv); this.fog.far = lerp(this.fog.far, 42, cv); this.dome.visible = cv < 0.98; }
    else this.dome.visible = true;
    // night vision potion
    const nv = this.nightVision || 0;
    if (nv > 0) { this.hemi.intensity += nv * 1.1 * (1 - this.dayness); this.hemi.color.lerp(new THREE.Color(0x66ff99), nv * 0.5 * (1 - this.dayness)); this.fog.far = lerp(this.fog.far, 260, nv * (1 - this.dayness)); }
    this.renderer.toneMappingExposure = lerp(a.exp, b.exp, t) * (this.exposureMul || 1);
  }
}
