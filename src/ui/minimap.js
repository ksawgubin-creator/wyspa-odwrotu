// Pre-rendered world map with fog of war; the minimap and the full map (M) both sample it.
import { WORLD, BIOME } from '../world/worldgen.js';

const FOG_CELL = 4;                                   // metres per fog cell
const FN = WORLD.size / FOG_CELL;                     // 128
const COLORS = { [BIOME.WATER]: [40, 88, 140], [BIOME.BEACH]: [226, 208, 152], [BIOME.MEADOW]: [134, 176, 72], [BIOME.JUNGLE]: [48, 118, 58], [BIOME.ROCK]: [138, 132, 124], [BIOME.VOLCANO]: [86, 66, 64] };

export class MapSystem {
  constructor(world) {
    this.world = world;
    this.size = WORLD.n - 1;
    this.map = document.createElement('canvas'); this.map.width = this.map.height = this.size;
    this.fogGrid = new Uint8Array(FN * FN);
    this.fog = document.createElement('canvas'); this.fog.width = this.fog.height = FN;
    this.fogCtx = this.fog.getContext('2d');
    this.fogImg = this.fogCtx.createImageData(FN, FN);
    this.lastX = 1e9; this.lastZ = 1e9;
    this.markers = [];
    this.render();
    this.redrawFog();
  }
  render() {
    const w = this.world, n = w.n, g = this.map.getContext('2d'), img = g.createImageData(this.size, this.size);
    for (let z = 0; z < this.size; z++) for (let x = 0; x < this.size; x++) {
      const i = z * n + x, h = w.heights[i];
      let c = COLORS[w.biomes[i]].slice();
      if (h < 0) { const d = Math.min(1, -h / 8); c = c.map((v) => v * (1 - d * 0.55)); if (w.lake[i]) c = [70, 140, 180]; }
      const sh = 1 + ((w.heights[Math.max(0, i - 1)] - w.heights[i + 1]) + (w.heights[Math.max(0, i - n)] - w.heights[i + n])) * 0.09;
      const o = (z * this.size + x) * 4;
      img.data[o] = Math.max(0, Math.min(255, c[0] * sh)); img.data[o + 1] = Math.max(0, Math.min(255, c[1] * sh)); img.data[o + 2] = Math.max(0, Math.min(255, c[2] * sh)); img.data[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  reveal(x, z, r = 26) {
    if (Math.hypot(x - this.lastX, z - this.lastZ) < 3) return;
    this.lastX = x; this.lastZ = z;
    const cx = Math.floor((x + WORLD.half) / FOG_CELL), cz = Math.floor((z + WORLD.half) / FOG_CELL), rc = Math.ceil(r / FOG_CELL);
    let changed = false;
    for (let dz = -rc; dz <= rc; dz++) for (let dx = -rc; dx <= rc; dx++) {
      const gx = cx + dx, gz = cz + dz;
      if (gx < 0 || gz < 0 || gx >= FN || gz >= FN || dx * dx + dz * dz > rc * rc) continue;
      const k = gz * FN + gx;
      if (!this.fogGrid[k]) { this.fogGrid[k] = 1; changed = true; }
    }
    if (changed) this.redrawFog();
  }
  redrawFog() {
    const d = this.fogImg.data;
    for (let i = 0; i < FN * FN; i++) { const o = i * 4; d[o] = 12; d[o + 1] = 16; d[o + 2] = 20; d[o + 3] = this.fogGrid[i] ? 0 : 255; }
    this.fogCtx.putImageData(this.fogImg, 0, 0);
  }
  // Draw a window of the map centred on (cx,cz) covering `span` metres into ctx (size px).
  drawWindow(ctx, size, cx, cz, span, opts = {}) {
    const px = size / span;
    const sx = cx + WORLD.half - span / 2, sz = cz + WORLD.half - span / 2;
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#0c1014'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(this.map, sx, sz, span, span, 0, 0, size, size);
    if (!opts.noFog) {
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.fog, sx / FOG_CELL, sz / FOG_CELL, span / FOG_CELL, span / FOG_CELL, 0, 0, size, size);
    }
    for (const m of this.markers) {
      const x = (m.x + WORLD.half - sx) * px, y = (m.z + WORLD.half - sz) * px;
      if (x < 0 || y < 0 || x > size || y > size) continue;
      ctx.fillStyle = m.color || '#ffd35a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, opts.big ? 6 : 4, 0, 7); ctx.fill(); ctx.stroke();
      if (opts.big && m.label) { ctx.fillStyle = '#fff'; ctx.font = '13px Segoe UI'; ctx.fillText(m.label, x + 9, y + 4); }
    }
  }
  drawPlayer(ctx, size, cx, cz, span, px, pz, yaw) {
    const k = size / span;
    const x = (px - cx) * k + size / 2, y = (pz - cz) * k + size / 2;
    ctx.save(); ctx.translate(x, y); ctx.rotate(-yaw + Math.PI);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 7); ctx.lineTo(0, 3); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  serialize() { let s = ''; const b = []; for (let i = 0; i < this.fogGrid.length; i += 8) { let v = 0; for (let k = 0; k < 8; k++) v |= (this.fogGrid[i + k] ? 1 : 0) << k; b.push(v); } for (const v of b) s += String.fromCharCode(v); return btoa(s); }
  restore(str) { if (!str) return; try { const s = atob(str); for (let i = 0; i < s.length; i++) { const v = s.charCodeAt(i); for (let k = 0; k < 8; k++) this.fogGrid[i * 8 + k] = (v >> k) & 1; } this.redrawFog(); } catch (e) { /* ignore */ } }
}
