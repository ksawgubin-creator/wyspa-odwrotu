// Pure (no THREE) procedural island generator: heightmap, biome map, lakes, landmarks.
// All queries (getHeight etc.) are shared by rendering, physics, placement and tests.
import { Noise2D } from '../engine/noise.js';
import { smoothstep, clamp, lerp } from '../engine/util.js';

export const WORLD = { size: 512, half: 256, n: 513, seaLevel: 0 };

export const BIOME = { WATER: 0, BEACH: 1, MEADOW: 2, JUNGLE: 3, ROCK: 4, VOLCANO: 5 };
export const BIOME_NAMES = ['Woda', 'Plaża', 'Łąka', 'Dżungla', 'Skały', 'Wulkan'];

// Fixed landmark layout (noise changes with the seed, the layout stays readable).
export const LAYOUT = {
  radius: 196,
  spawn: { x: 6, z: 168 },
  mountain: { x: -78, z: -48, r: 82, h: 34 },
  volcano: { x: 96, z: -104, r: 70, h: 44, craterR: 10, lavaY: 28 },
  lakes: [
    { x: 34, z: 26, r: 15 },
    { x: -96, z: 70, r: 12 },
    { x: 118, z: 44, r: 13 },
  ],
};

// Coastal profile: land01 (0 = deep sea, 1 = inland) -> base height.
const PROFILE = [[0, -12], [0.16, -8], [0.34, -2.6], [0.47, -0.35], [0.56, 0.7], [0.66, 1.9], [0.8, 3.4], [1, 4.6]];
function profile(l) {
  if (l <= 0) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    if (l <= PROFILE[i][0]) {
      const [a, ha] = PROFILE[i - 1], [b, hb] = PROFILE[i];
      const t = (l - a) / (b - a);
      return lerp(ha, hb, t * t * (3 - 2 * t));
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}

export class World {
  constructor(seed) {
    this.seed = seed;
    this.n = WORLD.n;
    this.heights = new Float32Array(this.n * this.n);
    this.biomes = new Uint8Array(this.n * this.n);
    this.lake = new Uint8Array(this.n * this.n);       // 1 = fresh water basin
    this.mountainMask = new Float32Array(this.n * this.n);
    this.generate();
  }

  generate() {
    const s = this.seed;
    const nA = new Noise2D(s), nB = new Noise2D(s + 101), nC = new Noise2D(s + 202), nM = new Noise2D(s + 303);
    const { radius: R, mountain: M, volcano: V, lakes } = LAYOUT;
    const n = this.n, half = WORLD.half;
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = ix - half, z = iz - half;
        const r = Math.hypot(x, z);
        const wobble = 0.34 * nA.fbm(x * 0.0075 + 7, z * 0.0075 - 3, 3) + 0.10 * nA.fbm(x * 0.024, z * 0.024, 2);
        let d = r / R + wobble;
        // guarantee land under landmarks
        const dm = Math.hypot(x - M.x, z - M.z) / M.r;
        const dv = Math.hypot(x - V.x, z - V.z) / V.r;
        d = Math.min(d, 0.55 + 0.6 * Math.min(dm, dv));
        const land = 1 - smoothstep(0.5, 1.12, d);
        let h = profile(land);
        const inland = smoothstep(0.55, 0.85, land);
        h += nB.fbm(x * 0.013, z * 0.013, 4) * 4.2 * inland;
        h += nB.fbm(x * 0.05 + 40, z * 0.05, 3) * 0.9 * smoothstep(0.5, 0.75, land);
        h += nC.noise(x * 0.23, z * 0.23) * 0.16 * smoothstep(0.4, 0.6, land);   // fine irregularity (low-poly look)
        // mountains
        const md = Math.hypot(x - M.x + nM.noise(x * 0.02, z * 0.02) * 14, z - M.z + nM.noise(x * 0.02 + 9, z * 0.02) * 14) / M.r;
        const mm = smoothstep(1, 0.12, md);
        const crag = nM.ridged(x * 0.022 + 5, z * 0.022 + 5, 4);
        h += Math.pow(mm, 1.3) * (M.h * (0.55 + 0.9 * crag));
        this.mountainMask[iz * n + ix] = mm;
        // volcano cone with crater
        const t = Math.hypot(x - V.x, z - V.z) / V.r;
        if (t < 1) {
          const cone = Math.pow(1 - t, 1.25) * V.h;
          h += cone + nM.fbm(x * 0.06, z * 0.06, 3) * 2.2 * (1 - t);
          const ct = Math.hypot(x - V.x, z - V.z) / V.craterR;
          if (ct < 1.6) h -= (1 - smoothstep(0.35, 1.6, ct)) * 20;
        }
        // lakes
        for (const L of lakes) {
          const ld = Math.hypot(x - L.x, z - L.z) + nC.noise(x * 0.09, z * 0.09) * 3.2;
          const lm = smoothstep(L.r, L.r * 0.45, ld);
          if (lm > 0) { h = lerp(h, -3.2, lm); }
          if (ld < L.r * 1.15) this.lake[iz * n + ix] = 1;
        }
        this.heights[iz * n + ix] = h;
      }
    }
    // biomes
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix, x = ix - half, z = iz - half;
        const h = this.heights[i];
        let b;
        const dv = Math.hypot(x - V.x, z - V.z);
        const moist = nC.fbm(x * 0.0055 + 50, z * 0.0055 - 20, 3) + 0.22 * (z / 190) - 0.18 * (x / 190);
        if (h < -0.25) b = BIOME.WATER;
        else if (dv < V.r * 0.72 && h > 6) b = BIOME.VOLCANO;
        else if (this.mountainMask[i] > 0.34 || h > 15) b = BIOME.ROCK;
        else if (h < 1.7 && !this.nearInland(ix, iz)) b = BIOME.BEACH;
        else if (h < 1.3) b = BIOME.BEACH;
        else b = moist > 0.02 ? BIOME.JUNGLE : BIOME.MEADOW;
        this.biomes[i] = b;
      }
    }
    // cave mouth: first flank spot of the mountain with a moderate slope
    this.cave = this.findCave();
    this.spawn = this.findSpawn();
  }

  // Walk inland from the south coast to the first dry beach tile.
  findSpawn() {
    const x = LAYOUT.spawn.x;
    for (let z = 230; z > 0; z -= 0.5) {
      if (this.getHeight(x, z) > 1.0) return { x, z: z - 1.5, y: this.getHeight(x, z - 1.5) };
    }
    return { x: 0, z: 0, y: this.getHeight(0, 0) };
  }

  nearInland() { return true; }

  findCave() {
    const M = LAYOUT.mountain;
    let best = null;
    for (let a = 0; a < 360 && !best; a += 9) {
      for (let r = 26; r < 60; r += 2) {
        const x = M.x + Math.cos((a * Math.PI) / 180 + 2.2) * r;
        const z = M.z + Math.sin((a * Math.PI) / 180 + 2.2) * r;
        const h = this.getHeight(x, z), sl = this.getSlope(x, z);
        if (h > 9 && h < 17 && sl > 0.55 && sl < 0.9) { best = { x, z, y: h }; break; }
      }
    }
    return best || { x: M.x, z: M.z, y: this.getHeight(M.x, M.z) };
  }

  // Triangle-interpolated height (identical to the LOD0 terrain mesh triangulation).
  getHeight(x, z) {
    const n = this.n, half = WORLD.half;
    let fx = x + half, fz = z + half;
    if (fx < 0) fx = 0; else if (fx > n - 1.001) fx = n - 1.001;
    if (fz < 0) fz = 0; else if (fz > n - 1.001) fz = n - 1.001;
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const u = fx - ix, v = fz - iz;
    const H = this.heights, i = iz * n + ix;
    const h00 = H[i], h10 = H[i + 1], h01 = H[i + n], h11 = H[i + n + 1];
    if (((ix + iz) & 1) === 0) {           // diagonal (0,0)-(1,1)
      return u >= v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;
    }
    // diagonal (1,0)-(0,1)
    return u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }
  // Gradient magnitude (rise / run).
  getSlope(x, z) {
    const e = 0.7;
    const dx = (this.getHeight(x + e, z) - this.getHeight(x - e, z)) / (2 * e);
    const dz = (this.getHeight(x, z + e) - this.getHeight(x, z - e)) / (2 * e);
    return Math.hypot(dx, dz);
  }
  getGradient(x, z) {
    const e = 0.7;
    return {
      x: (this.getHeight(x + e, z) - this.getHeight(x - e, z)) / (2 * e),
      z: (this.getHeight(x, z + e) - this.getHeight(x, z - e)) / (2 * e),
    };
  }
  getNormal(x, z, out = { x: 0, y: 1, z: 0 }) {
    const g = this.getGradient(x, z);
    const l = Math.hypot(g.x, 1, g.z);
    out.x = -g.x / l; out.y = 1 / l; out.z = -g.z / l;
    return out;
  }
  idx(x, z) {
    const half = WORLD.half;
    const ix = clamp(Math.round(x + half), 0, this.n - 1), iz = clamp(Math.round(z + half), 0, this.n - 1);
    return iz * this.n + ix;
  }
  getBiome(x, z) { return this.biomes[this.idx(x, z)]; }
  isLake(x, z) { return this.lake[this.idx(x, z)] === 1 && this.getHeight(x, z) < WORLD.seaLevel; }
  waterDepth(x, z) { return Math.max(0, WORLD.seaLevel - this.getHeight(x, z)); }
  inBounds(x, z, margin = 0) { return Math.abs(x) < WORLD.half - margin && Math.abs(z) < WORLD.half - margin; }
}
