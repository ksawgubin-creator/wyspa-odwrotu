// Pure inventory model: 36 slots, the first 9 are the hotbar. Tools carry durability.
import { ITEMS } from '../../data/items.js';

export const HOTBAR = 9;
export const SLOTS = 36;

export class Inventory {
  constructor(size = SLOTS) {
    this.slots = new Array(size).fill(null);
    this.selected = 0;
    this.onChange = null;
  }
  changed() { if (this.onChange) this.onChange(); }
  def(id) { return ITEMS[id]; }
  maxStack(id) { return this.def(id)?.stack ?? 50; }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.n; return n; }
  has(id, n = 1) { return this.count(id) >= n; }
  hasAll(cost) { return Object.entries(cost).every(([id, n]) => this.has(id, n)); }
  freeSpaceFor(id) {
    const max = this.maxStack(id); let space = 0;
    for (const s of this.slots) { if (!s) space += max; else if (s.id === id) space += max - s.n; }
    return space;
  }
  // Adds items; returns how many did NOT fit.
  add(id, n = 1, extra = null) {
    const d = this.def(id); if (!d) return n;
    const max = this.maxStack(id);
    let left = n;
    if (max > 1) {
      for (const s of this.slots) { if (left <= 0) break; if (s && s.id === id && s.n < max) { const t = Math.min(max - s.n, left); s.n += t; left -= t; } }
    }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (this.slots[i]) continue;
      const t = Math.min(max, left);
      const item = { id, n: t };
      if (d.tool) item.dur = extra?.dur ?? d.tool.durability;
      if (d.weapon) item.dur = extra?.dur ?? d.weapon.durability;
      this.slots[i] = item; left -= t;
    }
    if (left !== n) this.changed();
    return left;
  }
  // Removes up to n items; returns the amount removed.
  remove(id, n = 1) {
    let left = n;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i]; if (!s || s.id !== id) continue;
      const t = Math.min(s.n, left); s.n -= t; left -= t;
      if (s.n <= 0) this.slots[i] = null;
    }
    if (left !== n) this.changed();
    return n - left;
  }
  removeCost(cost) { for (const [id, n] of Object.entries(cost)) this.remove(id, n); }
  swap(a, b) {
    const sa = this.slots[a], sb = this.slots[b];
    if (sa && sb && sa.id === sb.id && this.maxStack(sa.id) > 1) {          // merge stacks
      const t = Math.min(this.maxStack(sa.id) - sb.n, sa.n); sb.n += t; sa.n -= t; if (sa.n <= 0) this.slots[a] = null;
    } else { this.slots[a] = sb; this.slots[b] = sa; }
    this.changed();
  }
  split(i) {
    const s = this.slots[i]; if (!s || s.n < 2) return false;
    const free = this.slots.findIndex((x) => !x); if (free < 0) return false;
    const half = Math.floor(s.n / 2); s.n -= half; this.slots[free] = { id: s.id, n: half }; this.changed(); return true;
  }
  drop(i, n = null) {
    const s = this.slots[i]; if (!s) return null;
    const cnt = n ?? s.n; const out = { id: s.id, n: Math.min(cnt, s.n), dur: s.dur };
    s.n -= out.n; if (s.n <= 0) this.slots[i] = null; this.changed(); return out;
  }
  selectedItem() { return this.slots[this.selected] || null; }
  select(i) { this.selected = ((i % HOTBAR) + HOTBAR) % HOTBAR; this.changed(); }
  // damage held tool; returns true if it broke
  wear(slot, amount = 1) {
    const s = this.slots[slot]; if (!s || s.dur === undefined) return false;
    s.dur -= amount;
    if (s.dur <= 0) { this.slots[slot] = null; this.changed(); return true; }
    this.changed(); return false;
  }
  serialize() { return { slots: this.slots.map((s) => (s ? { ...s } : null)), selected: this.selected }; }
  restore(d) { if (!d) return; this.slots = d.slots.map((s) => (s ? { ...s } : null)); while (this.slots.length < SLOTS) this.slots.push(null); this.selected = d.selected || 0; this.changed(); }
}
