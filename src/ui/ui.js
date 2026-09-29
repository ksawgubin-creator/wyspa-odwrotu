// HUD: stat bars, clock, hotbar, minimap, prompts, toasts, banners. Pure DOM/canvas overlay. All strings Polish.
import { itemIcon } from './icons.js';
import { ITEMS } from '../../data/items.js';
import { HOTBAR } from '../inventory/inventory.js';
import { BIOME_NAMES } from '../world/worldgen.js';
import { fmtTime, clamp } from '../engine/util.js';
import { keyLabel } from '../engine/input.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export class HUD {
  constructor(game) {
    this.game = game;
    const root = document.getElementById('ui');
    this.root = el('div', 'hud hidden'); root.appendChild(this.root);
    this.vignette = el('div', 'vignette'); this.darkVig = el('div', 'dark-vig'); root.prepend(this.darkVig); root.prepend(this.vignette);
    // stats
    const stats = el('div', 'stats'); this.root.appendChild(stats);
    const mk = (cls, label) => { const b = el('div', 'bar ' + cls, `<i></i><span>${label}</span><b></b>`); stats.appendChild(b); return { root: b, fill: b.querySelector('i'), val: b.querySelector('b'), last: -1 }; };
    this.bars = { hp: mk('hp', 'Zdrowie'), food: mk('food', 'Głód'), water: mk('water', 'Pragnienie'), sta: mk('sta', 'Wytrzymałość'), temp: mk('temp small', 'Temperatura'), fear: mk('fear', 'Strach') };
    this.bars.fear.root.style.display = 'none';
    this.xpLine = el('div', 'xpline', '<span></span><span></span>'); stats.appendChild(this.xpLine);
    // clock
    const clock = el('div', 'clock'); this.root.appendChild(clock);
    this.clockCanvas = document.createElement('canvas'); this.clockCanvas.width = 260; this.clockCanvas.height = 74; clock.appendChild(this.clockCanvas);
    this.dayLabel = el('div', 'day', 'Dzień 1'); clock.appendChild(this.dayLabel);
    // minimap
    const mm = el('div', 'minimap'); this.root.appendChild(mm);
    this.mmCanvas = document.createElement('canvas'); this.mmCanvas.width = this.mmCanvas.height = 344; mm.appendChild(this.mmCanvas);
    this.locLabel = el('div', 'loc', ''); mm.appendChild(this.locLabel);
    // hotbar
    this.hotbar = el('div', 'hotbar'); this.root.appendChild(this.hotbar);
    this.hotSlots = [];
    for (let i = 0; i < HOTBAR; i++) { const s = el('div', 'slot', `<span class="k">${i + 1}</span>`); this.hotbar.appendChild(s); this.hotSlots.push({ root: s, img: null, n: null, dur: null, key: '' }); }
    // prompt / toasts / banner / crosshair
    this.prompt = el('div', 'prompt'); this.root.appendChild(this.prompt);
    this.toasts = el('div', 'toasts'); this.root.appendChild(this.toasts);
    this.bannerEl = el('div', 'banner'); this.root.appendChild(this.bannerEl);
    this.root.appendChild(el('div', 'crosshair'));
    this.mmSpan = 110;
    this.lastPrompt = null; this.bannerTimer = 0;
    this.refreshHotbar();
  }
  show(v) { this.root.classList.toggle('hidden', !v); this.vignette.style.display = this.darkVig.style.display = v ? '' : 'none'; }

  notify(text, kind = 'info') {
    const t = el('div', 'toast ' + (kind === 'warn' ? 'warn' : kind === 'good' ? 'good' : ''), text);
    this.toasts.prepend(t);
    while (this.toasts.children.length > 6) this.toasts.lastChild.remove();
    setTimeout(() => t.classList.add('out'), 3800); setTimeout(() => t.remove(), 4500);
  }
  banner(title, sub = '', dur = 3.2) {
    this.bannerEl.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
    this.bannerEl.classList.add('show'); this.bannerTimer = dur;
  }
  floatText(text) { const f = el('div', 'floatxp', text); this.root.appendChild(f); setTimeout(() => f.remove(), 1500); }

  refreshHotbar() {
    const inv = this.game.player?.inventory; if (!inv) return;
    const kb = this.game.input.bindings;
    for (let i = 0; i < HOTBAR; i++) {
      const s = this.hotSlots[i], it = inv.slots[i];
      const key = it ? `${it.id}:${it.n}:${it.dur ?? ''}` : '';
      s.root.classList.toggle('sel', i === inv.selected);
      if (key === s.key) continue;
      s.key = key;
      s.root.querySelector('.k').textContent = keyLabel((kb['hotbar' + (i + 1)] || [''])[0]);
      s.root.querySelectorAll('img,.n,.dur').forEach((n) => n.remove());
      if (it) {
        const img = document.createElement('img'); img.src = itemIcon(it.id); s.root.appendChild(img);
        if (it.n > 1) s.root.appendChild(el('div', 'n', String(it.n)));
        const d = ITEMS[it.id]; const maxD = d?.tool?.durability || d?.weapon?.durability;
        if (it.dur !== undefined && maxD) s.root.appendChild(el('div', 'dur', `<i style="width:${clamp(it.dur / maxD, 0, 1) * 100}%"></i>`));
      }
    }
  }

  setBar(b, frac, text, low = false) {
    const v = Math.round(frac * 1000);
    if (b.last === v && b.text === text) return;
    b.last = v; b.text = text; b.fill.style.width = `${clamp(frac, 0, 1) * 100}%`; b.val.textContent = text; b.root.classList.toggle('low', low);
  }

  update(dt) {
    const g = this.game, p = g.player, st = p.stats;
    this.setBar(this.bars.hp, st.health / st.maxHealth, `${Math.ceil(st.health)}`, st.health / st.maxHealth < 0.25);
    this.setBar(this.bars.food, st.hunger / 100, `${Math.ceil(st.hunger)}`, st.hunger < 15);
    this.setBar(this.bars.water, st.thirst / 100, `${Math.ceil(st.thirst)}`, st.thirst < 15);
    this.setBar(this.bars.sta, st.stamina / st.maxStamina, `${Math.ceil(st.stamina)}`, p.exhausted);
    this.setBar(this.bars.temp, st.temp / 100, '', false);
    this.bars.fear.root.style.display = st.fear > 4 ? '' : 'none';
    if (st.fear > 4) this.setBar(this.bars.fear, st.fear / 100, `${Math.ceil(st.fear)}`, st.fear > 80);
    const xpNeed = g.xpForLevel ? g.xpForLevel(st.level) : 100;
    this.xpLine.children[0].textContent = `Poziom ${st.level}`; this.xpLine.children[1].textContent = `${Math.floor(st.xp)} / ${xpNeed} XP`;
    this.hotbar.style.opacity = '1';
    this.refreshHotbar();
    // vignette on damage / night darkness
    this.vignette.style.setProperty('--hurt', String(g.hurtFlash || 0));
    this.darkVig.style.setProperty('--night', String(((1 - g.atmos.dayness) * 0.45).toFixed(3)));
    this.drawClock();
    this.drawMinimap();
    // prompt
    const pr = g.interactTarget;
    const txt = pr ? `<kbd>${keyLabel(g.input.bindings.interact[0])}</kbd>${pr.label}` : '';
    if (txt !== this.lastPrompt) { this.lastPrompt = txt; this.prompt.innerHTML = txt; this.prompt.classList.toggle('show', !!pr); }
    if (this.bannerTimer > 0) { this.bannerTimer -= dt; if (this.bannerTimer <= 0) this.bannerEl.classList.remove('show'); }
  }

  drawClock() {
    const g = this.game, c = this.clockCanvas.getContext('2d'), W = 260, H = 74, clock = g.clock;
    c.clearRect(0, 0, W, H);
    // arc track
    const cx = W / 2, cy = 62, R = 96;
    const isNight = clock.isNight;
    const grd = c.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, isNight ? 'rgba(10,16,40,.75)' : 'rgba(60,120,190,.55)'); grd.addColorStop(1, isNight ? 'rgba(20,24,50,.75)' : 'rgba(180,210,235,.55)');
    c.fillStyle = grd; c.beginPath(); c.roundRect(4, 2, W - 8, H - 2, 30); c.fill();
    c.strokeStyle = 'rgba(255,236,190,.35)'; c.lineWidth = 2; c.stroke();
    c.save(); c.beginPath(); c.roundRect(4, 2, W - 8, H - 2, 30); c.clip();
    // horizon line
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(0, cy); c.lineTo(W, cy); c.stroke();
    // sun & moon on the arc: angle a in [0,pi] visible while above the horizon
    const a = clock.sunAngle;
    const draw = (ang, kind) => {
      const x = cx - Math.cos(ang) * R, y = cy - Math.sin(ang) * (R * 0.5);
      if (kind === 'sun') { const gg = c.createRadialGradient(x, y, 2, x, y, 16); gg.addColorStop(0, '#fff6c0'); gg.addColorStop(0.5, '#ffc83a'); gg.addColorStop(1, 'rgba(255,160,20,0)'); c.fillStyle = gg; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); c.fillStyle = '#ffd95a'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); }
      else { c.fillStyle = '#e8ecff'; c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); c.fillStyle = 'rgba(10,16,40,.9)'; c.beginPath(); c.arc(x + 4, y - 2, 7, 0, 7); c.fill(); }
    };
    if (!isNight) draw(a, 'sun'); else draw(a - Math.PI, 'moon');
    c.restore();
    // remaining time
    const t = isNight ? clock.secondsToDawn : clock.secondsToDusk;
    c.fillStyle = '#fff'; c.font = '600 12px Segoe UI'; c.textAlign = 'center';
    c.fillText(isNight ? `Świt za ${fmtTime(t)}` : `Zmierzch za ${fmtTime(t)}`, cx, 18);
    const label = `Dzień ${clock.day}${g.bloodMoonTonight?.() ? ' · Krwawy Księżyc' : ''}`;
    if (this.dayLabel.textContent !== label) this.dayLabel.textContent = label;
    this.dayLabel.style.color = isNight ? '#9fb4ff' : '';
  }

  drawMinimap() {
    const g = this.game, p = g.player;
    const ctx = this.mmCanvas.getContext('2d'), S = 344;
    const rp = p.renderPos(g.alpha || 1);
    g.map.drawWindow(ctx, S, rp.x, rp.z, this.mmSpan);
    g.map.drawPlayer(ctx, S, rp.x, rp.z, this.mmSpan, rp.x, rp.z, g.cameraRig ? g.cameraRig.yaw : p.yaw);
    const b = BIOME_NAMES[g.world.getBiome(rp.x, rp.z)];
    const h = Math.round(rp.y);
    const txt = `${b} · ${h} m n.p.m.`;
    if (this.locLabel.textContent !== txt) this.locLabel.textContent = txt;
  }
}
