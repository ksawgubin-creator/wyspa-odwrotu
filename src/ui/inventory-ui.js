// Inventory panel: 9x4 grid, drag & drop, split stacks (right click), tooltips, quick use/drop.
import { itemIcon } from './icons.js';
import { ITEMS, ITEM_CATEGORIES } from '../../data/items.js';
import { WEAPONS } from '../../data/weapons.js';
import { SLOTS, HOTBAR } from '../inventory/inventory.js';
import { clamp } from '../engine/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export function tooltipHTML(id, item) {
  const d = ITEMS[id]; if (!d) return '';
  let extra = '';
  if (d.tool) extra += `<div class="stat">Typ: ${({ axe: 'siekiera', pickaxe: 'kilof', torch: 'pochodnia' })[d.tool.type] || d.tool.type} · siła ${d.tool.power}</div>`;
  if (WEAPONS[id]) extra += `<div class="stat">Obrażenia: ${WEAPONS[id].base} · zasięg ${WEAPONS[id].reach} m · combo ×${WEAPONS[id].combo.length}</div>`;
  if (d.food) { const f = d.food, parts = []; if (f.hunger) parts.push(`sytość ${f.hunger > 0 ? '+' : ''}${f.hunger}`); if (f.thirst) parts.push(`woda ${f.thirst > 0 ? '+' : ''}${f.thirst}`); if (f.health) parts.push(`zdrowie +${f.health}`); if (f.poison) parts.push('ryzyko zatrucia'); extra += `<div class="stat">${parts.join(' · ')}</div>`; }
  if (item && item.dur !== undefined) { const max = d.tool?.durability || d.weapon?.durability || item.dur; extra += `<div class="stat">Wytrzymałość: ${Math.ceil(item.dur)} / ${max}</div>`; }
  return `<h4>${d.name}</h4><div class="cat">${ITEM_CATEGORIES[d.cat] || ''}</div><p>${d.desc || ''}</p>${extra}`;
}

export class InventoryUI {
  constructor(game) {
    this.game = game;
    const root = document.getElementById('ui');
    this.wrap = el('div', 'panel-wrap'); root.appendChild(this.wrap);
    this.panel = el('div', 'panel'); this.wrap.appendChild(this.panel);
    this.panel.innerHTML = `<h2>Ekwipunek <small>przeciągnij, aby przenieść · PPM: podziel stos · dwuklik: użyj · Q: wyrzuć</small></h2>`;
    this.grid = el('div', 'inv-grid'); this.panel.appendChild(this.grid);
    this.note = el('div', 'inv-note', 'Górny rząd to pasek szybkiego dostępu (klawisze 1–9).');
    this.panel.appendChild(this.note);
    this.tip = el('div', 'tooltip'); document.body.appendChild(this.tip);
    this.slots = [];
    // visual order: rows 1..3 of the backpack on top, hotbar (slots 0..8) at the bottom
    const order = [];
    for (let r = 1; r < SLOTS / HOTBAR; r++) for (let c = 0; c < HOTBAR; c++) order.push(r * HOTBAR + c);
    for (let c = 0; c < HOTBAR; c++) order.push(c);
    order.forEach((idx) => {
      const s = el('div', 'slot' + (idx < HOTBAR ? ' hot' : '')); s.dataset.idx = idx;
      this.grid.appendChild(s); this.slots[idx] = s;
      s.addEventListener('mousedown', (e) => this.onDown(e, idx));
      s.addEventListener('mouseenter', () => { this.hover = idx; this.showTip(idx); });
      s.addEventListener('mouseleave', () => { this.hover = -1; this.tip.style.display = 'none'; });
      s.addEventListener('dblclick', () => this.game.useItem?.(idx));
    });
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    window.addEventListener('keydown', (e) => { if (this.visible && e.code === 'KeyQ' && this.hover >= 0) this.dropSlot(this.hover, e.shiftKey ? null : 1); });
    this.drag = null; this.hover = -1; this.visible = false;
  }
  get inv() { return this.game.player.inventory; }
  open() { this.visible = true; this.wrap.classList.add('show'); this.refresh(); }
  close() { this.visible = false; this.wrap.classList.remove('show'); this.tip.style.display = 'none'; if (this.drag) this.cancelDrag(); }
  refresh() {
    if (!this.visible) return;
    const inv = this.inv;
    for (let i = 0; i < SLOTS; i++) {
      const s = this.slots[i], it = inv.slots[i];
      s.innerHTML = ''; s.classList.toggle('drag', !!(this.drag && this.drag.idx === i));
      if (i === inv.selected) s.style.borderColor = 'var(--gold)'; else s.style.borderColor = '';
      if (!it) continue;
      const img = document.createElement('img'); img.src = itemIcon(it.id); s.appendChild(img);
      if (it.n > 1) s.appendChild(el('div', 'n', String(it.n)));
      const d = ITEMS[it.id], maxD = d?.tool?.durability || d?.weapon?.durability;
      if (it.dur !== undefined && maxD) s.appendChild(el('div', 'dur', `<i style="width:${clamp(it.dur / maxD, 0, 1) * 100}%"></i>`));
    }
  }
  showTip(idx) {
    const it = this.inv.slots[idx];
    if (!it || this.drag) { this.tip.style.display = 'none'; return; }
    this.tip.innerHTML = tooltipHTML(it.id, it); this.tip.style.display = 'block';
    const r = this.slots[idx].getBoundingClientRect();
    this.tip.style.left = `${Math.min(window.innerWidth - 300, r.right + 10)}px`; this.tip.style.top = `${Math.max(8, r.top - 8)}px`;
  }
  onDown(e, idx) {
    const it = this.inv.slots[idx];
    if (e.button === 2) { this.inv.split(idx); e.preventDefault(); return; }
    if (e.button !== 0 || !it) return;
    this.drag = { idx, ghost: el('img', 'dragghost') };
    this.drag.ghost.src = itemIcon(it.id); document.body.appendChild(this.drag.ghost);
    this.onMove(e); this.tip.style.display = 'none'; this.refresh();
  }
  onMove(e) { if (this.drag) { this.drag.ghost.style.left = `${e.clientX - 25}px`; this.drag.ghost.style.top = `${e.clientY - 25}px`; } }
  onUp(e) {
    if (!this.drag) return;
    const from = this.drag.idx;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.slot[data-idx]');
    if (target && target.dataset.idx !== undefined) { const to = Number(target.dataset.idx); if (to !== from) this.inv.swap(from, to); }
    else if (!document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.panel')) this.dropSlot(from, null);
    this.cancelDrag();
    this.refresh();
  }
  cancelDrag() { if (this.drag) { this.drag.ghost.remove(); this.drag = null; } this.refresh(); }
  dropSlot(idx, n) {
    const out = this.inv.drop(idx, n); if (!out) return;
    const p = this.game.player, f = p.facingVec();
    this.game.drops.spawn(out.id, out.n, p.pos.x + f.x * 1.2, p.pos.z + f.z * 1.2, { dur: out.dur, delay: 1.5, vx: f.x * 3, vz: f.z * 3 });
    this.refresh();
  }
}
