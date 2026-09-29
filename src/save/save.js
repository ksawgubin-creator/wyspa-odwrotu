// Save/load through localStorage, plus export/import of the save as a file.
const KEY = 'wo_save_v1';
export const SAVE_VERSION = 1;

export class SaveSystem {
  constructor(game) { this.game = game; }
  hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  snapshot() {
    const g = this.game;
    return {
      version: SAVE_VERSION, savedAt: Date.now(), seed: g.world.seed, difficulty: g.difficulty, hardcore: g.hardcore,
      clock: g.clock.serialize(), player: g.player.serialize(), field: g.field.serialize(), map: g.map.serialize(),
      extra: g.serializeExtra ? g.serializeExtra() : {},
    };
  }
  save() {
    if (!this.game.player || this.game.mode === 'menu') return false;
    try { localStorage.setItem(KEY, JSON.stringify(this.snapshot())); return true; } catch (e) { console.warn('save failed', e); return false; }
  }
  read() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  deleteSave() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  // apply a snapshot to the running game (world with the same seed must already be built)
  apply(d) {
    const g = this.game;
    g.clock.restore(d.clock); g.field.restore(d.field); g.map.restore(d.map); g.player.restore(d.player);
    g.difficulty = d.difficulty || 'normal'; g.hardcore = !!d.hardcore;
    g.restoreExtra?.(d.extra || {});
  }
  exportFile() {
    const blob = new Blob([JSON.stringify(this.snapshot(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wyspa-odwrotu-dzien${this.game.clock.day}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  importFile() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files[0]; if (!f) return;
      f.text().then((t) => {
        try { const d = JSON.parse(t); if (!d.version || !d.player) throw new Error('bad'); localStorage.setItem(KEY, JSON.stringify(d)); this.game.notify?.('Zapis zaimportowany.', 'good'); this.game.menus.buildMain(); }
        catch (e) { alert('Ten plik nie jest poprawnym zapisem gry.'); }
      });
    };
    inp.click();
  }
}
