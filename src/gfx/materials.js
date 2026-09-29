// Shared materials. Foliage-style materials get a cheap vertex-shader wind sway.
import * as THREE from 'three';

export const shared = {
  uCamPos: { value: new THREE.Vector3() },       // camera position (for stipple fading of foliage in front of the player)
  uPlayerPos: { value: new THREE.Vector3() },
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(0.8, 0.35) },   // direction * strength
  uWindGust: { value: 1 },
};

// Screen-door fade: geometry close to the camera, or between the camera and the player, is dithered away so the
// player is never hidden behind a leaf and the camera never shows the inside of a canopy.
function addFade(shader) {
  shader.uniforms.uCamPos = shared.uCamPos; shader.uniforms.uPlayerPos = shared.uPlayerPos;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWP;')
    .replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 fwp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          fwp = instanceMatrix * fwp;
        #endif
        vFadeWP = (modelMatrix * fwp).xyz; }`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWP; uniform vec3 uCamPos; uniform vec3 uPlayerPos;')
    .replace('void main() {', `void main() {
      {
        float dc = distance(vFadeWP, uCamPos);
        float keep = smoothstep(0.5, 1.9, dc);
        vec3 pa = uPlayerPos + vec3(0.0, 1.1, 0.0);
        vec3 ab = pa - uCamPos; float ab2 = max(dot(ab, ab), 0.01);
        float tt = dot(vFadeWP - uCamPos, ab) / ab2;
        float dl = length(vFadeWP - (uCamPos + ab * clamp(tt, 0.0, 1.0)));
        float occl = (1.0 - smoothstep(0.35, 1.05, dl)) * step(0.02, tt) * (1.0 - smoothstep(0.86, 0.97, tt));
        keep = min(keep, 1.0 - occl * 0.94);
        if (keep < 1.0) { float hh = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); if (hh > keep) discard; }
      }`);
}
export function occlusionFade(mat, key = 'fade') {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => { if (prev) prev(shader, r); addFade(shader); };
  mat.customProgramCacheKey = () => key;
  return mat;
}

// Adds wind sway to a Lambert-like material. `amp` = horizontal displacement (world units) at height `ref`.
export function windify(mat, { amp = 0.25, ref = 8, flutter = 0.0, fade = null, dither = true } = {}) {
  const opts_fade = dither;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.uniforms.uWindGust = shared.uWindGust;
    shader.uniforms.uAmp = { value: amp };
    shader.uniforms.uRef = { value: ref };
    shader.uniforms.uFlutter = { value: flutter };
    shader.uniforms.uFade = { value: new THREE.Vector2(fade ? fade[0] : 0, fade ? fade[1] : 0) };
    if (opts_fade) addFade(shader);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform vec2 uWind; uniform float uWindGust; uniform float uAmp; uniform float uRef; uniform float uFlutter; uniform vec2 uFade;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 iPos = vec3(instanceMatrix[3]);
          #else
            vec3 iPos = vec3(modelMatrix[3]);
          #endif
          float hh = clamp(position.y / uRef, 0.0, 1.6);
          float ph = iPos.x * 0.11 + iPos.z * 0.13;
          float s = sin(uTime * 1.25 + ph) + 0.45 * sin(uTime * 2.9 + ph * 1.9 + position.x);
          float gust = 0.6 + 0.4 * sin(uTime * 0.37 + iPos.x * 0.02 + iPos.z * 0.017);
          float k = uAmp * hh * hh * (0.55 + 0.45 * s) * gust * uWindGust;
          transformed.x += uWind.x * k;
          transformed.z += uWind.y * k;
          transformed.y -= abs(k) * 0.06;
          if (uFade.y > 0.0) { float dd = length(iPos.xz - cameraPosition.xz); transformed *= 1.0 - smoothstep(uFade.x, uFade.y, dd); }
          transformed.xz += uFlutter * vec2(sin(uTime * 7.0 + position.x * 3.1 + position.y * 2.3), cos(uTime * 6.3 + position.z * 2.9)) * hh;
        }`);
  };
  mat.customProgramCacheKey = () => `wind_${amp}_${ref}_${flutter}_${fade ? 1 : 0}_${dither ? 1 : 0}`;
  return mat;
}

export const mats = {
  terrain: new THREE.MeshLambertMaterial({ vertexColors: true }),
  prop: new THREE.MeshLambertMaterial({ vertexColors: true }),
  propEmissive: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x442200 }),
};
export function foliage(amp, ref, flutter = 0, fade = null, dither = true) {
  return windify(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { amp, ref, flutter, fade, dither });
}
