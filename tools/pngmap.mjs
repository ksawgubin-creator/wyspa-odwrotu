// Dev tool: renders the generated world as a PNG (biomes + hillshade) so the layout can be inspected without a browser.
import { World, BIOME } from '../src/world/worldgen.js';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const seed = Number(process.argv[2] || 20240607), out = process.argv[3] || 'map.png';
const w = new World(seed), n = w.n;
const px = Buffer.alloc(n * n * 3);
const col = { [BIOME.WATER]: [30, 70, 120], [BIOME.BEACH]: [225, 205, 150], [BIOME.MEADOW]: [130, 170, 70], [BIOME.JUNGLE]: [40, 110, 55], [BIOME.ROCK]: [130, 125, 120], [BIOME.VOLCANO]: [70, 55, 55] };
for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
  const i = z * n + x; let c = col[w.biomes[i]].slice();
  const h = w.heights[i];
  if (h < 0) { const d = Math.min(1, -h / 8); c = c.map((v) => v * (1 - d * 0.6)); if (w.lake[i]) c = [60, 130, 170]; }
  const shade = 1 + (w.heights[Math.max(0, i - 1)] - w.heights[Math.min(n * n - 1, i + 1)]) * 0.12 + (w.heights[Math.max(0, i - n)] - w.heights[Math.min(n * n - 1, i + n)]) * 0.12;
  c = c.map((v) => Math.max(0, Math.min(255, v * shade)));
  px.set(c, i * 3);
}
const sp = w.cave; const mark = (x, z, col) => { for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const i = ((Math.round(z) + 256 + dz) * n + Math.round(x) + 256 + dx) * 3; px.set(col, i); } };
mark(sp.x, sp.z, [255, 0, 255]); mark(w.spawn.x, w.spawn.z, [255, 255, 0]);
const raw = Buffer.alloc((n * 3 + 1) * n);
for (let z = 0; z < n; z++) { raw[z * (n * 3 + 1)] = 0; px.copy(raw, z * (n * 3 + 1) + 1, z * n * 3, (z + 1) * n * 3); }
const crcT = new Uint32Array(256).map((_, k) => { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('cave', w.cave, 'spawn', w.spawn, 'wrote', out);
