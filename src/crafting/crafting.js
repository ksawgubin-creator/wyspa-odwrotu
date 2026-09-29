// Pure crafting logic: costs (with the Crafter skill discount), station requirements, atomic craft.
import { RECIPES, STATION_INFO } from '../../data/recipes.js';
import { ITEMS } from '../../data/items.js';

export const DISCOUNT_PER_LEVEL = 0.07;   // ROBOCZE

// Cost after the "Rzemieślnik" discount: every ingredient stack shrinks, never below 1.
export function discounted(cost, level = 0) {
  if (!level) return { ...cost };
  const out = {};
  for (const [id, n] of Object.entries(cost)) out[id] = n <= 1 ? n : Math.max(1, Math.ceil(n * (1 - DISCOUNT_PER_LEVEL * level)));
  return out;
}
// Picks the first affordable variant (recipe.cost or recipe.alt).
export function pickCost(inv, recipe, level = 0) {
  const variants = [recipe.cost, ...(recipe.alt ? [recipe.alt] : [])].map((c) => discounted(c, level));
  return variants.find((c) => inv.hasAll(c)) || variants[0];
}
// ctx: {stations:Set<string>, skillLevel:number}
export function checkCraft(inv, recipe, ctx = {}) {
  const st = ctx.stations || new Set();
  if (recipe.station !== 'hand' && !st.has(recipe.station)) return { ok: false, reason: `Wymaga: ${STATION_INFO[recipe.station].name} w pobliżu` };
  const cost = pickCost(inv, recipe, ctx.skillLevel || 0);
  if (!inv.hasAll(cost)) return { ok: false, reason: 'Brakuje surowców', cost };
  // do outputs fit once the ingredients are removed? (simulate on a copy)
  const sim = new inv.constructor(inv.slots.length); sim.slots = inv.slots.map((s) => (s ? { ...s } : null));
  sim.removeCost(cost);
  for (const o of recipe.out) if (sim.add(o.id, o.n) > 0) return { ok: false, reason: 'Brak miejsca w ekwipunku', cost };
  return { ok: true, cost };
}
// Consumes ingredients and adds outputs. Returns the check result (ok=false leaves the inventory untouched).
export function craft(inv, recipe, ctx = {}) {
  const c = checkCraft(inv, recipe, ctx);
  if (!c.ok) return c;
  inv.removeCost(c.cost);
  for (const o of recipe.out) inv.add(o.id, o.n);
  return c;
}
export const craftableNow = (inv, ctx) => RECIPES.filter((r) => checkCraft(inv, r, ctx).ok);
export const isCraftingItem = (id) => !!ITEMS[id];
