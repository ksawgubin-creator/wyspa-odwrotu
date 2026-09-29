// Tiny test framework (browser + Node). describe/it/expect with async support; results collected in `results`.
export const results = [];
const suites = [];
let current = null;

export function describe(name, fn) { suites.push({ name, fn }); }
export function it(name, fn) { (current || (current = { tests: [] })).tests.push({ name, fn }); }

class Expect {
  constructor(v) { this.v = v; }
  toBe(x) { if (this.v !== x) throw new Error(`oczekiwano ${fmt(x)}, jest ${fmt(this.v)}`); }
  toEqual(x) { if (JSON.stringify(this.v) !== JSON.stringify(x)) throw new Error(`oczekiwano ${fmt(x)}, jest ${fmt(this.v)}`); }
  toBeTruthy() { if (!this.v) throw new Error(`oczekiwano prawdy, jest ${fmt(this.v)}`); }
  toBeFalsy() { if (this.v) throw new Error(`oczekiwano fałszu, jest ${fmt(this.v)}`); }
  toBeGreaterThan(x) { if (!(this.v > x)) throw new Error(`oczekiwano > ${x}, jest ${fmt(this.v)}`); }
  toBeLessThan(x) { if (!(this.v < x)) throw new Error(`oczekiwano < ${x}, jest ${fmt(this.v)}`); }
  toBeGreaterThanOrEqual(x) { if (!(this.v >= x)) throw new Error(`oczekiwano >= ${x}, jest ${fmt(this.v)}`); }
  toBeLessThanOrEqual(x) { if (!(this.v <= x)) throw new Error(`oczekiwano <= ${x}, jest ${fmt(this.v)}`); }
  toBeCloseTo(x, eps = 1e-3) { if (Math.abs(this.v - x) > eps) throw new Error(`oczekiwano ≈ ${x} (±${eps}), jest ${fmt(this.v)}`); }
  toContain(x) { if (!this.v.includes(x)) throw new Error(`oczekiwano, że ${fmt(this.v)} zawiera ${fmt(x)}`); }
}
const fmt = (v) => { try { const s = typeof v === 'number' ? String(Math.round(v * 1e4) / 1e4) : JSON.stringify(v); return s && s.length > 90 ? s.slice(0, 90) + '…' : s; } catch (e) { return String(v); } };
export const expect = (v) => new Expect(v);

// Runs every registered suite. `filter` optional substring on "suite > test".
export async function runAll(filter = '', onResult = () => {}) {
  results.length = 0;
  for (const s of suites.splice(0)) {
    current = { tests: [] };
    s.fn();
    const tests = current.tests; current = null;
    for (const t of tests) {
      const full = `${s.name} › ${t.name}`;
      if (filter && !full.toLowerCase().includes(filter.toLowerCase())) continue;
      const t0 = performance.now();
      let r;
      try { await t.fn(); r = { name: full, ok: true, ms: performance.now() - t0 }; }
      catch (e) { r = { name: full, ok: false, error: e && e.message ? e.message : String(e), ms: performance.now() - t0 }; }
      results.push(r); onResult(r);
    }
  }
  return results;
}
