// Inventory panel: 9x4 grid, armour slot, optional container (chest) grid, drag & drop, split stacks (right click),
// tooltips, double-click to use/equip, Q to drop.
import { itemIcon } from './icons.js';
import { ITEMS, ITEM_CATEGORIES } from '../../data/items.js';
import { WEAPONS } from '../../data/weapons.js';
import { SLOTS, HOTBAR } from '../inventory/inventory.js';
import { clamp } from '../engine/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export function tooltipHTML(id, item) {
  const d = ITEMS[id]; if (!d) return '';
  let extra = '';
  if (d.tool) extra += `<div class="stat">Typ: ${({ axe: 'siekiera', pickaxe: 'kilof', torch: 'pochodnia', knife: 'nóż', rod: 'wędka' })[d.tool.type] || d.tool.type} · siła ${d.tool.power}</div>`;
  if (WEAPONS[id]) extra += `<div class="stat">Obrażenia: ${WEAPONS[id].base} · zasięg ${WEAPONS[id].reach} m · combo ×${WEAPONS[id].combo.length}</div>`;
  if (d.armor) extra += `<div class="stat">Redukcja obrażeń: ${Math.round(d.armor.def * 100)}% · ciepło +${d.armor.warm}${d.armor.fire ? ' · odporność na ogień' : ''}</div>`;
  if (d.food) { const f = d.food, parts = []; if (f.hunger) parts.push(`sytość ${f.hunger > 0 ? '+' : ''}${f.hunger}`); if (f.thirst) parts.push(`woda ${f.thirst > 0 ? '+' : ''}${f.thirst}`); if (f.health) parts.push(`zdrowie +${f.health}`); if (f.fear) parts.push(`strach ${f.fear}`); if (f.buff) parts.push('efekt czasowy'); if (f.poison) parts.push('ryzyko zatrucia'); extra += `<div class="stat">${parts.join(' · ')}</div>`; }
  if (item && item.dur !== undefined) { const max = d.tool?.durability || d.weapon?.durability || item.dur; extra += `<div class="stat">Wytrzymałość: ${Math.ceil(item.dur)} / ${max}</div>`; }
  return `<h4>${d.name}</h4><div class="cat">${ITEM_CATEGORIES[d.cat] || ''}</div><p>${d.desc || ''}</p>${extra}`;
}

export class InventoryUI {
  constructor(game) {
    this.game = game;
    const root = document.getElementById('ui');
    this.wrap = el('div', 'panel-wrap'); root.appendChild(this.wrap);
    this.panel = el('div', 'panel'); this.wrap.appendChild(this.panel);
    this.panel.innerHTML = `<h2>Ekwipunek <small>przeciągnij · PPM: podziel stos · dwuklik: użyj / załóż · Q: wyrzuć</small></h2>`;
    this.equip = el('div', 'equipslot', '<span class="cat" style="color:var(--dim);font-size:12px;letter-spacing:.08em;text-transform:uppercase">Pancerz</span>');
    this.equipSlot = el('div', 'slot'); this.equipSlot.dataset.inv = 'e'; this.equipSlot.dataset.idx = 0; this.equip.appendChild(this.equipSlot);
    this.panel.appendChild(this.equip);
    this.grid = el('div', 'inv-grid'); this.panel.appendChild(this.grid);
    this.cTitle = el('div', 'container-title', ''); this.cGrid = el('div', 'inv-grid'); this.cTitle.style.display = this.cGrid.style.display = 'none';
    this.panel.append(this.cTitle, this.cGrid);
    this.note = el('div', 'inv-note', 'Górny rząd to pasek szybkiego dostępu (klawisze 1–9).'); this.panel.appendChild(this.note);
    this.tip = el('div', 'tooltip'); document.body.appendChild(this.tip);
    this.slots = { p: [], c: [] };
    const order = [];
    for (let r = 1; r < SLOTS / HOTBAR; r++) for (let c = 0; c < HOTBAR; c++) order.push(r * HOTBAR + c);
    for (let c = 0; c < HOTBAR; c++) order.push(c);
    order.forEach((idx) => this.makeSlot(this.grid, 'p', idx, idx < HOTBAR));
    this.makeSlotEvents(this.equipSlot, 'e', 0);
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    window.addEventListener('keydown', (e) => { if (this.visible && e.code === 'KeyQ' && this.hover && this.hover.tag !== 'e') this.dropSlot(this.hover.tag, this.hover.idx, e.shiftKey ? null : 1); });
    this.drag = null; this.hover = null; this.visible = false; this.container = null;
  }
  makeSlot(parent, tag, idx, hot) {
    const s = el('div', 'slot' + (hot ? ' hot' : '')); s.dataset.inv = tag; s.dataset.idx = idx; parent.appendChild(s); this.slots[tag][idx] = s;
    this.makeSlotEvents(s, tag, idx);
  }
  makeSlotEvents(s, tag, idx) {
    s.addEventListener('mousedown', (e) => this.onDown(e, tag, idx));
    s.addEventListener('mouseenter', () => { this.hover = { tag, idx }; this.showTip(tag, idx); });
    s.addEventListener('mouseleave', () => { this.hover = null; this.tip.style.display = 'none'; });
    s.addEventListener('dblclick', () => { if (tag === 'p') this.game.useItem?.(idx); else if (tag === 'e') this.game.player.unequip(); else this.game.quickMove?.(tag, idx); });
  }
  invOf(tag) { return tag === 'p' ? this.game.player.inventory : tag === 'c' ? this.container?.inv : null; }
  itemAt(tag, idx) { if (tag === 'e') return this.game.player.equipment.chest ? { id: this.game.player.equipment.chest.id, n: 1, dur: this.game.player.equipment.chest.dur } : null; return this.invOf(tag)?.slots[idx] || null; }
  open(container = null) {
    this.visible = true; this.wrap.classList.add('show'); this.setContainer(container); this.refresh();
  }
  setContainer(s) {
    this.container = s;
    const on = !!s;
    this.cTitle.style.display = this.cGrid.style.display = on ? '' : 'none';
    if (on) {
      this.cTitle.textContent = `${s.def.name} — zawartość`;
      this.cGrid.innerHTML = ''; this.slots.c = [];
      for (let i = 0; i < s.inv.slots.length; i++) this.makeSlot(this.cGrid, 'c', i, false);
    }
  }
  close() { this.visible = false; this.wrap.classList.remove('show'); this.tip.style.display = 'none'; if (this.drag) this.cancelDrag(); this.container = null; }
  paint(slotEl, it, selected = false) {
    slotEl.innerHTML = ''; slotEl.style.borderColor = selected ? 'var(--gold)' : '';
    if (!it) return;
    const img = document.createElement('img'); img.src = itemIcon(it.id); slotEl.appendChild(img);
    if (it.n > 1) slotEl.appendChild(el('div', 'n', String(it.n)));
    const d = ITEMS[it.id], maxD = d?.tool?.durability || d?.weapon?.durability;
    if (it.dur !== undefined && maxD) slotEl.appendChild(el('div', 'dur', `<i style="width:${clamp(it.dur / maxD, 0, 1) * 100}%"></i>`));
  }
  refresh() {
    if (!this.visible) return;
    const inv = this.game.player.inventory;
    for (let i = 0; i < SLOTS; i++) { this.paint(this.slots.p[i], inv.slots[i], i === inv.selected); this.slots.p[i].classList.toggle('drag', !!(this.drag && this.drag.tag === 'p' && this.drag.idx === i)); }
    this.paint(this.equipSlot, this.itemAt('e', 0));
    if (this.container) for (let i = 0; i < this.container.inv.slots.length; i++) this.paint(this.slots.c[i], this.container.inv.slots[i]);
  }
  showTip(tag, idx) {
    const it = this.itemAt(tag, idx);
    if (!it || this.drag) { this.tip.style.display = 'none'; return; }
    this.tip.innerHTML = tooltipHTML(it.id, it); this.tip.style.display = 'block';
    const r = (tag === 'e' ? this.equipSlot : this.slots[tag][idx]).getBoundingClientRect();
    this.tip.style.left = `${Math.min(window.innerWidth - 300, r.right + 10)}px`; this.tip.style.top = `${Math.max(8, r.top - 8)}px`;
  }
  onDown(e, tag, idx) {
    const it = this.itemAt(tag, idx);
    if (e.button === 2) { if (tag !== 'e') this.invOf(tag).split(idx); e.preventDefault(); this.refresh(); return; }
    if (e.button !== 0 || !it) return;
    this.drag = { tag, idx, ghost: el('img', 'dragghost') };
    this.drag.ghost.src = itemIcon(it.id); document.body.appendChild(this.drag.ghost);
    this.onMove(e); this.tip.style.display = 'none'; this.refresh();
  }
  onMove(e) { if (this.drag) { this.drag.ghost.style.left = `${e.clientX - 25}px`; this.drag.ghost.style.top = `${e.clientY - 25}px`; } }
  onUp(e) {
    if (!this.drag) return;
    const from = this.drag;
    const target = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.slot[data-inv]');
    if (target) this.moveBetween(from.tag, from.idx, target.dataset.inv, Number(target.dataset.idx));
    else if (!document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.panel')) this.dropSlot(from.tag, from.idx, null);
    this.cancelDrag();
  }
  cancelDrag() { if (this.drag) { this.drag.ghost.remove(); this.drag = null; } this.refresh(); }
  moveBetween(ta, ia, tb, ib) {
    const g = this.game, p = g.player;
    if (ta === 'e') { if (tb === 'p') { const s = p.inventory.slots[ib]; if (!s) p.unequip(); } return; }
    if (tb === 'e') { if (ta === 'p') p.equip(ia); return; }
    const A = this.invOf(ta), B = this.invOf(tb); if (!A || !B) return;
    if (A === B) { if (ia !== ib) A.swap(ia, ib); return; }
    const sa = A.slots[ia], sb = B.slots[ib];
    if (!sa) return;
    if (sb && sb.id === sa.id && A.maxStack(sa.id) > 1) { const t = Math.min(B.maxStack(sa.id) - sb.n, sa.n); sb.n += t; sa.n -= t; if (sa.n <= 0) A.slots[ia] = null; }
    else { A.slots[ia] = sb; B.slots[ib] = sa; }
    A.changed(); B.changed();
  }
  dropSlot(tag, idx, n) {
    const inv = this.invOf(tag); if (!inv) return;
    const out = inv.drop(idx, n); if (!out) return;
    const p = this.game.player, f = p.facingVec();
    this.game.drops.spawn(out.id, out.n, p.pos.x + f.x * 1.2, p.pos.z + f.z * 1.2, { dur: out.dur, delay: 1.5, vx: f.x * 3, vz: f.z * 3 });
    this.refresh();
  }
}
