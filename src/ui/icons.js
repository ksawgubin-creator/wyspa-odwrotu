// Procedural item icons drawn on 2D canvases (cached as data URLs). No external assets.
import { ITEMS } from '../../data/items.js';

const cache = new Map();
function ctx2(size = 64) { const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')]; }
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), r = Math.min(255, Math.max(0, ((n >> 16) & 255) * k)), g = Math.min(255, Math.max(0, ((n >> 8) & 255) * k)), b = Math.min(255, Math.max(0, (n & 255) * k));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function blobPath(g, cx, cy, r, seed, sx = 1, sy = 1) {
  g.beginPath();
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r * (0.82 + 0.28 * ((((Math.sin(seed * 12.9 + i * 78.2) * 43758.5) % 1) + 1) % 1));
    const x = cx + Math.cos(a) * rr * sx, y = cy + Math.sin(a) * rr * sy;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
}
function facet(g, path, color) { const grd = g.createLinearGradient(0, 8, 0, 56); grd.addColorStop(0, shade(color, 1.25)); grd.addColorStop(1, shade(color, 0.7)); g.fillStyle = grd; path(); g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke(); }

function drawHandleTool(g, kind, headColor) {
  g.save(); g.translate(32, 32); g.rotate(-Math.PI / 4);
  g.fillStyle = '#7b5632'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(-3, -26, 6, 52, 2); g.fill(); g.stroke();
  facet(g, () => {
    g.beginPath();
    if (kind === 'axe') { g.moveTo(-3, -24); g.lineTo(-17, -26); g.lineTo(-19, -10); g.lineTo(-3, -12); }
    else if (kind === 'pickaxe') { g.moveTo(-22, -20); g.quadraticCurveTo(0, -34, 22, -20); g.lineTo(20, -16); g.quadraticCurveTo(0, -26, -20, -16); }
    else if (kind === 'spear') { g.moveTo(0, -30); g.lineTo(6, -18); g.lineTo(-6, -18); }
    else if (kind === 'sword') { g.moveTo(-4, -8); g.lineTo(0, -30); g.lineTo(4, -8); }
    g.closePath();
  }, headColor);
  g.restore();
}
function drawItem(g, d) {
  const c = d.color || '#999';
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (d.model && ['axe', 'pickaxe', 'spear', 'sword'].includes(d.model)) return drawHandleTool(g, d.model, c);
  if (d.model === 'knife') {
    g.save(); g.translate(32, 32); g.rotate(-Math.PI / 4);
    g.fillStyle = '#5a3a24'; g.beginPath(); g.roundRect(-3, 6, 6, 20, 2); g.fill();
    facet(g, () => { g.beginPath(); g.moveTo(-6, 6); g.lineTo(0, -26); g.lineTo(6, 6); g.closePath(); }, d.color || '#e6ddc8'); g.restore(); return;
  }
  if (d.model === 'bow') {
    g.save(); g.translate(32, 32); g.strokeStyle = '#7b5632'; g.lineWidth = 5; g.beginPath(); g.arc(-4, 0, 26, -1.1, 1.1); g.stroke();
    g.strokeStyle = 'rgba(240,230,200,.9)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-4 + Math.cos(-1.1) * 26, Math.sin(-1.1) * 26); g.lineTo(-4 + Math.cos(1.1) * 26, Math.sin(1.1) * 26); g.stroke(); g.restore(); return;
  }
  if (d.model === 'torch') {
    g.save(); g.translate(32, 32); g.rotate(-0.5);
    g.fillStyle = '#6b4a2f'; g.beginPath(); g.roundRect(-4, -8, 8, 34, 3); g.fill(); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.stroke();
    const grd = g.createRadialGradient(0, -16, 2, 0, -16, 16); grd.addColorStop(0, '#fff2a0'); grd.addColorStop(0.5, '#ff9a2a'); grd.addColorStop(1, 'rgba(255,60,0,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(0, -16, 12, 18, 0, 0, 7); g.fill(); g.restore(); return;
  }
  switch (d.shape) {
    case 'log': for (let i = 0; i < 2; i++) { g.save(); g.translate(32, 24 + i * 16); g.rotate(-0.3 + i * 0.2); facet(g, () => { g.beginPath(); g.roundRect(-22, -7, 44, 14, 6); }, c); g.fillStyle = shade(c, 1.4); g.beginPath(); g.ellipse(22, 0, 3.5, 7, 0, 0, 7); g.fill(); g.restore(); } break;
    case 'stick': g.save(); g.translate(32, 32); g.rotate(-0.8); for (let i = -1; i <= 1; i++) { g.fillStyle = shade(c, 0.85 + i * 0.12); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(-24, i * 7 - 2, 48, 4.5, 2); g.fill(); g.stroke(); } g.restore(); break;
    case 'stone': facet(g, () => blobPath(g, 32, 36, 17, 3, 1.2, 0.9), c); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(26, 29, 6, 3, -0.5, 0, 7); g.fill(); break;
    case 'bone': g.save(); g.translate(32, 32); g.rotate(-0.7); facet(g, () => { g.beginPath(); g.roundRect(-20, -4, 40, 8, 4); }, c); for (const s of [-1, 1]) { g.fillStyle = shade(c, 1.1); g.beginPath(); g.arc(s * 20, -4, 6, 0, 7); g.arc(s * 20, 4, 6, 0, 7); g.fill(); } g.restore(); break;
    case 'leaf': g.save(); g.translate(32, 34); g.rotate(-0.6); facet(g, () => { g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(0, -24, 22, 0); g.quadraticCurveTo(0, 18, -22, 0); }, c); g.strokeStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.stroke(); g.restore(); break;
    case 'bar': facet(g, () => { g.beginPath(); g.roundRect(12, 24, 40, 18, 3); }, c); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(16, 27, 30, 3); break;
    case 'can': facet(g, () => { g.beginPath(); g.roundRect(20, 16, 24, 34, 4); }, c); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(23, 24, 18, 12); break;
    default: facet(g, () => blobPath(g, 32, 34, 17, 5), c); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(26, 28, 5, 3, -0.5, 0, 7); g.fill();
  }
}
export function itemIcon(id) {
  if (cache.has(id)) return cache.get(id);
  const [c, g] = ctx2(64);
  const d = ITEMS[id];
  if (d) drawItem(g, d);
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}
