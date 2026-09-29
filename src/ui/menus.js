// Main menu, pause menu, settings, key bindings, death screen and the world map overlay. Polish UI.
import { ACTION_LABELS, keyLabel } from '../engine/input.js';
import { CONFIG } from '../../data/config.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export class Menus {
  constructor(game) {
    this.game = game;
    const root = document.getElementById('ui');
    // ---- main menu ----
    this.main = el('div', 'menu main'); root.appendChild(this.main);
    this.main.innerHTML = `<h1>Wyspa Odwrotu</h1><div class="sub">łowca za dnia · ofiara w nocy</div><div class="btns"></div><div class="sub" style="margin:26px 0 0;font-size:11px;letter-spacing:.12em">WASD – ruch · Mysz – kamera · LPM – atak · PPM – blok · Shift – sprint / unik · E – interakcja</div>`;
    this.mainBtns = this.main.querySelector('.btns');
    // ---- pause ----
    this.pause = el('div', 'menu pause'); root.appendChild(this.pause);
    this.pause.innerHTML = `<h1 style="font-size:40px">Pauza</h1><div class="sub"></div><div class="btns"></div>`;
    this.pauseBtns = this.pause.querySelector('.btns');
    // ---- overlays (settings/keys/map/death) share a panel wrapper ----
    this.overlay = el('div', 'panel-wrap'); this.overlay.style.zIndex = '50'; root.appendChild(this.overlay);
    this.overlayPanel = el('div', 'panel'); this.overlay.appendChild(this.overlayPanel);
    this.buildMain(); this.buildPause();
  }
  btn(parent, text, fn, cls = '') { const b = el('div', 'btn ' + cls, text); b.addEventListener('click', fn); parent.appendChild(b); return b; }

  buildMain() {
    const g = this.game;
    this.mainBtns.innerHTML = '';
    const hasSave = g.save.hasSave();
    if (hasSave) this.btn(this.mainBtns, 'Kontynuuj', () => g.startGame({ load: true }), 'primary');
    this.btn(this.mainBtns, 'Nowa gra', () => this.newGameDialog(), hasSave ? '' : 'primary');
    this.btn(this.mainBtns, 'Ustawienia', () => this.showSettings(() => this.hideOverlay()));
    this.btn(this.mainBtns, 'Sterowanie', () => this.showKeys());
    this.btn(this.mainBtns, 'Importuj zapis', () => g.save.importFile());
  }
  buildPause() {
    const g = this.game;
    this.pauseBtns.innerHTML = '';
    this.btn(this.pauseBtns, 'Wznów', () => g.resume(), 'primary');
    this.btn(this.pauseBtns, 'Zapisz grę', () => { g.save.save(); g.notify('Gra zapisana.', 'good'); });
    this.btn(this.pauseBtns, 'Ustawienia', () => this.showSettings(() => this.hideOverlay()));
    this.btn(this.pauseBtns, 'Sterowanie', () => this.showKeys());
    this.btn(this.pauseBtns, 'Eksportuj zapis (plik)', () => g.save.exportFile());
    this.btn(this.pauseBtns, 'Menu główne', () => { g.save.save(); g.toMainMenu(); }, 'danger');
  }
  showMain() { this.buildMain(); this.main.classList.add('show'); this.pause.classList.remove('show'); }
  hideMain() { this.main.classList.remove('show'); }
  showPause() { this.buildPause(); this.pause.querySelector('.sub').textContent = `Dzień ${this.game.clock.day}`; this.pause.classList.add('show'); }
  hidePause() { this.pause.classList.remove('show'); }
  hideOverlay() { this.overlay.classList.remove('show'); this.overlayOpen = false; }
  showOverlay(html) { this.overlayPanel.innerHTML = html; this.overlay.classList.add('show'); this.overlayOpen = true; return this.overlayPanel; }

  newGameDialog() {
    const g = this.game;
    const p = this.showOverlay(`<h2>Nowa gra</h2>
      <div class="settings-grid">
        <label>Poziom trudności</label><select id="ng-diff"><option value="easy">Łatwy</option><option value="normal" selected>Normalny</option><option value="hard">Trudny</option></select>
        <label>Tryb hardcore (permadeath)</label><input type="checkbox" id="ng-hc">
        <label>Ziarno świata (puste = losowe)</label><input type="text" id="ng-seed" placeholder="np. 12345" style="padding:6px;background:#1b160f;color:#f3ead6;border:1px solid rgba(255,236,190,.22);border-radius:6px">
      </div><div style="display:flex;gap:10px;margin-top:18px" id="ng-btns"></div>`);
    const b = p.querySelector('#ng-btns');
    this.btn(b, 'Rozbij się na wyspie', () => {
      const seedTxt = p.querySelector('#ng-seed').value.trim();
      const opts = { diff: p.querySelector('#ng-diff').value, hardcore: p.querySelector('#ng-hc').checked, seed: seedTxt ? Number(seedTxt) || [...seedTxt].reduce((a, c) => a * 31 + c.charCodeAt(0) | 0, 7) : undefined };
      this.hideOverlay(); g.startGame({ fresh: true, ...opts });
    }, 'primary');
    this.btn(b, 'Wróć', () => this.hideOverlay());
  }

  showSettings(back) {
    const g = this.game, s = g.settings;
    const p = this.showOverlay(`<h2>Ustawienia</h2><div class="settings-grid">
      <label>Głośność główna</label><input type="range" id="s-master" min="0" max="1" step="0.05" value="${s.master}">
      <label>Głośność efektów</label><input type="range" id="s-sfx" min="0" max="1" step="0.05" value="${s.sfx}">
      <label>Głośność otoczenia</label><input type="range" id="s-amb" min="0" max="1" step="0.05" value="${s.ambient}">
      <label>Czułość myszy</label><input type="range" id="s-sens" min="0.4" max="2.5" step="0.05" value="${s.sensitivity}">
      <label>Odwróć oś Y</label><input type="checkbox" id="s-inv" ${s.invertY ? 'checked' : ''}>
      <label>Pole widzenia (FOV)</label><input type="range" id="s-fov" min="50" max="90" step="1" value="${s.fov}">
      <label>Jakość grafiki</label><select id="s-q"><option value="low">Niska</option><option value="medium">Średnia</option><option value="high">Wysoka</option></select>
      <label>Poziom trudności</label><select id="s-diff"><option value="easy">Łatwy</option><option value="normal">Normalny</option><option value="hard">Trudny</option></select>
    </div><div style="display:flex;gap:10px;margin-top:18px" id="s-btns"></div>`);
    p.querySelector('#s-q').value = s.quality; p.querySelector('#s-diff').value = g.difficulty;
    const bind = (id, fn) => p.querySelector(id).addEventListener('input', (e) => fn(e.target.type === 'checkbox' ? e.target.checked : e.target.value));
    bind('#s-master', (v) => g.applySetting('master', Number(v))); bind('#s-sfx', (v) => g.applySetting('sfx', Number(v))); bind('#s-amb', (v) => g.applySetting('ambient', Number(v)));
    bind('#s-sens', (v) => g.applySetting('sensitivity', Number(v))); bind('#s-inv', (v) => g.applySetting('invertY', v)); bind('#s-fov', (v) => g.applySetting('fov', Number(v)));
    bind('#s-q', (v) => g.applySetting('quality', v)); bind('#s-diff', (v) => g.setDifficulty(v));
    this.btn(p.querySelector('#s-btns'), 'Gotowe', back, 'primary');
  }

  showKeys() {
    const g = this.game;
    const render = () => {
      const p = this.showOverlay(`<h2>Sterowanie <small>kliknij przycisk i naciśnij nowy klawisz</small></h2>
        <div class="inv-note" style="margin:0 0 8px">Myszka: LPM – atak (combo) · PPM – blok (tuż przed ciosem = parowanie) · Shift krótko – unik, przytrzymany – sprint · 1–9 pasek</div>
        <div class="keys" id="keys"></div><div style="display:flex;gap:10px;margin-top:18px" id="k-btns"></div>`);
      const k = p.querySelector('#keys');
      for (const [a, label] of Object.entries(ACTION_LABELS)) {
        const row = el('div', 'keyrow', `<span>${label}</span>`);
        const b = el('div', 'btn small', keyLabel(g.input.bindings[a][0] || '—'));
        b.addEventListener('click', () => { b.textContent = 'naciśnij…'; g.input.rebinding = (code) => { if (code !== 'Escape') g.input.setBinding(a, code); render(); }; });
        row.appendChild(b); k.appendChild(row);
      }
      this.btn(p.querySelector('#k-btns'), 'Przywróć domyślne', () => { g.input.resetBindings(); render(); });
      this.btn(p.querySelector('#k-btns'), 'Gotowe', () => this.hideOverlay(), 'primary');
    };
    render();
  }

  showMap() {
    const g = this.game;
    const p = this.showOverlay(`<h2>Mapa wyspy <small>M lub Esc – zamknij · niezbadane obszary są zasłonięte</small></h2><div class="bigmap"><canvas width="640" height="640"></canvas></div>`);
    this.mapCanvas = p.querySelector('canvas');
    this.mapOpen = true;
    this.drawBigMap();
  }
  drawBigMap() {
    if (!this.mapOpen) return;
    const g = this.game, ctx = this.mapCanvas.getContext('2d'), rp = g.player.renderPos(1);
    if (g.world.isCave(rp.x, rp.z)) { const cx = 196, cz = 196; g.map.drawWindow(ctx, 640, cx, cz, 110, { cave: true, big: true }); g.map.drawPlayer(ctx, 640, cx, cz, 110, rp.x, rp.z, g.cameraRig.yaw); }
    else { g.map.drawWindow(ctx, 640, 0, 0, 512, { big: true }); g.map.drawPlayer(ctx, 640, 0, 0, 512, rp.x, rp.z, g.cameraRig.yaw); }
    ctx.fillStyle = '#fff'; ctx.font = '600 12px Segoe UI'; ctx.fillText('N', 620, 20);
  }
  hideMap() { this.mapOpen = false; this.hideOverlay(); }

  showDeath(info, onRespawn) {
    const p = this.showOverlay(`<h2 style="color:var(--red)">Nie żyjesz</h2><p style="max-width:380px;color:var(--dim)">${info.text}</p><div style="display:flex;gap:10px;margin-top:14px" id="d-btns"></div>`);
    this.btn(p.querySelector('#d-btns'), info.hardcore ? 'Wróć do menu' : 'Obudź się w łóżku', () => { this.hideOverlay(); onRespawn(); }, 'primary');
  }
}

// F3 debug panel
export class DebugPanel {
  constructor(game) {
    this.game = game;
    this.root = el('div', 'debug'); document.body.appendChild(this.root);
    this.fps = 60; this.frames = 0; this.acc = 0;
    this.info = el('div'); this.root.appendChild(this.info);
    const row = (...items) => { const r = el('div', 'row'); items.forEach((i) => r.appendChild(i)); this.root.appendChild(r); return r; };
    const b = (txt, fn) => { const x = el('button', '', txt); x.addEventListener('click', fn); return x; };
    row(b('Dzień', () => game.debug.setTime(0.15)), b('Zmierzch', () => game.debug.setTime(0.6)), b('Noc', () => game.debug.setTime(0.8)), b('Świt', () => game.debug.setTime(0.98)));
    row(b('Czas ×1', () => (game.clockSpeed = 1)), b('×10', () => (game.clockSpeed = 10)), b('×30', () => (game.clockSpeed = 30)));
    row(b('Nieśmiertelność', () => { game.debug.god = !game.debug.god; game.notify('Nieśmiertelność: ' + (game.debug.god ? 'TAK' : 'NIE')); }), b('Wolna kamera', () => game.debug.toggleFreeCam()), b('Kolizje', () => game.debug.toggleColliders()));
    this.itemSel = el('select'); Object.entries(game.itemList()).forEach(([id, name]) => { const o = el('option', '', name); o.value = id; this.itemSel.appendChild(o); });
    row(this.itemSel, b('+1', () => game.debug.give(this.itemSel.value, 1)), b('+10', () => game.debug.give(this.itemSel.value, 10)));
    this.spawnSel = el('select'); (game.spawnList?.() || []).forEach(([id, name]) => { const o = el('option', '', name); o.value = id; this.spawnSel.appendChild(o); });
    row(this.spawnSel, b('Przywołaj', () => game.debug.spawn(this.spawnSel.value)));
    row(b('Odkryj mapę', () => game.debug.revealMap()), b('Teleport: wulkan', () => game.debug.tp('volcano')), b('gór', () => game.debug.tp('mountain')), b('jaskinia', () => game.debug.tp('cave')));
    this.visible = false;
  }
  toggle() { this.visible = !this.visible; this.root.classList.toggle('show', this.visible); }
  update(dt) {
    this.frames++; this.acc += dt;
    if (this.acc >= 0.5) { this.fps = this.frames / this.acc; this.frames = 0; this.acc = 0; }
    if (!this.visible) return;
    const g = this.game, p = g.player, r = g.renderer.info.render;
    this.info.innerHTML = `FPS: <b>${this.fps.toFixed(0)}</b> · trójkąty: ${(r.triangles / 1000).toFixed(0)}k · draw: ${r.calls}<br>
      poz: ${p.pos.x.toFixed(1)}, ${p.pos.y.toFixed(1)}, ${p.pos.z.toFixed(1)} · prędkość ${p.speed.toFixed(1)}<br>
      czas doby: ${(g.clock.phase * 100).toFixed(0)}% · dzień ${g.clock.day} · ${g.clock.isNight ? 'NOC' : 'dzień'} ×${g.clockSpeed}<br>
      biom: ${g.world.getBiome(p.pos.x, p.pos.z)} · nachylenie ${g.world.getSlope(p.pos.x, p.pos.z).toFixed(2)} · ${p.grounded ? 'na ziemi' : 'w powietrzu'}<br>
      encji: ${g.entities ? g.entities.list.length : 0} · upuszczone: ${g.drops.list.length} · węzły: ${g.nodes.length}`;
  }
}
