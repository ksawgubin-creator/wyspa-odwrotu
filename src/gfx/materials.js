// Shared materials. Foliage-style materials get a cheap vertex-shader wind sway.
import * as THREE from 'three';

export const shared = {
  uTime: { value: 0 },
  uWind: { value: new THREE.Vector2(0.8, 0.35) },   // direction * strength
  uWindGust: { value: 1 },
};

// Adds wind sway to a Lambert-like material. `amp` = horizontal displacement (world units) at height `ref`.
export function windify(mat, { amp = 0.25, ref = 8, flutter = 0.0, fade = null } = {}) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.uniforms.uWindGust = shared.uWindGust;
    shader.uniforms.uAmp = { value: amp };
    shader.uniforms.uRef = { value: ref };
    shader.uniforms.uFlutter = { value: flutter };
    shader.uniforms.uFade = { value: new THREE.Vector2(fade ? fade[0] : 0, fade ? fade[1] : 0) };
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
  mat.customProgramCacheKey = () => `wind_${amp}_${ref}_${flutter}_${fade ? 1 : 0}`;
  return mat;
}

export const mats = {
  terrain: new THREE.MeshLambertMaterial({ vertexColors: true }),
  prop: new THREE.MeshLambertMaterial({ vertexColors: true }),
  propEmissive: new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x442200 }),
};
export function foliage(amp, ref, flutter = 0, fade = null) {
  return windify(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { amp, ref, flutter, fade });
}
