// Crafting (with skills tab), build menu and structure context menu. Polish UI.
import { itemIcon } from './icons.js';
import { ITEMS, itemName } from '../../data/items.js';
import { RECIPES, TIER_INFO, STATION_INFO } from '../../data/recipes.js';
import { SKILLS } from '../../data/skills.js';
import { NOTES } from '../../data/lore.js';
import { BUILDINGS, BASE_LEVELS, BUILD_CATS } from '../../data/buildings.js';
import { checkCraft, discounted } from '../crafting/crafting.js';
import { clamp } from '../engine/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const costHTML = (cost, inv) => Object.entries(cost).map(([id, n]) => { const have = inv.count(id); return `<span class="cost ${have >= n ? 'ok' : 'no'}"><img src="${itemIcon(id)}">${itemName(id)} <b>${Math.min(have, 999)}/${n}</b></span>`; }).join('');

export class CraftUI {
  constructor(game) {
    this.game = game;
    this.wrap = el('div', 'panel-wrap'); document.getElementById('ui').appendChild(this.wrap);
    this.panel = el('div', 'panel craft'); this.wrap.appendChild(this.panel);
    this.tab = 'craft'; this.filter = 'all'; this.sel = null; this.crafting = null; this.visible = false; this.stations = new Set();
  }
  open(stations = null, tab = 'craft') {
    this.visible = true; this.tab = tab;
    this.stations = stations || this.game.currentStations();
    this.crafting = null; this.wrap.classList.add('show'); this.render();
  }
  close() { this.visible = false; this.crafting = null; this.wrap.classList.remove('show'); }
  get inv() { return this.game.player.inventory; }
  refresh() { if (this.visible && !this.crafting) this.render(); }

  render() {
    const g = this.game, p = g.player, inv = this.inv, sl = p.skills.crafter || 0;
    const stationNames = ['Ręce', ...[...this.stations].map((s) => STATION_INFO[s]?.name).filter(Boolean)];
    this.panel.innerHTML = `<h2><span>${this.tab === 'craft' ? 'Wytwarzanie' : 'Umiejętności'}</span><small>Dostępne: ${stationNames.join(' · ')} — C / Esc: zamknij</small></h2>
      <div class="tabs"><div class="tab ${this.tab === 'craft' ? 'on' : ''}" data-t="craft">Wytwarzanie</div><div class="tab ${this.tab === 'journal' ? 'on' : ''}" data-t="journal">Dziennik</div><div class="tab ${this.tab === 'skills' ? 'on' : ''}" data-t="skills">Umiejętności${(p.stats.skillPoints || 0) > 0 ? ` <b class="pip">${p.stats.skillPoints}</b>` : ''}</div></div><div class="craft-body"></div>`;
    this.panel.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { this.tab = t.dataset.t; this.render(); }));
    const body = this.panel.querySelector('.craft-body');
    if (this.tab === 'skills') return this.renderSkills(body);
    if (this.tab === 'journal') return this.renderJournal(body);
    // filters
    const filters = [['all', 'Wszystko'], ['t0', TIER_INFO[0].name], ['t1', TIER_INFO[1].name], ['t2', TIER_INFO[2].name], ['t3', TIER_INFO[3].name], ['campfire', 'Gotowanie'], ['alchemy', 'Alchemia']];
    const fbar = el('div', 'chips'); body.appendChild(fbar);
    for (const [id, name] of filters) { const c = el('div', 'chip' + (this.filter === id ? ' on' : ''), name); c.addEventListener('click', () => { this.filter = id; this.render(); }); fbar.appendChild(c); }
    const cols = el('div', 'craft-cols'); body.appendChild(cols);
    const list = el('div', 'recipes'); const det = el('div', 'detail'); cols.append(list, det);
    const ctx = { stations: this.stations, skillLevel: sl };
    const shown = RECIPES.filter((r) => this.filter === 'all' || (this.filter[0] === 't' ? r.tier === Number(this.filter[1]) && !['campfire', 'alchemy'].includes(r.station) : r.station === this.filter));
    if (!this.sel || !shown.includes(this.sel)) this.sel = shown[0] || null;
    for (const r of shown) {
      const c = checkCraft(inv, r, ctx), out = r.out[0];
      const st = c.ok ? 'ok' : (r.station !== 'hand' && !this.stations.has(r.station)) ? 'station' : 'mats';
      const row = el('div', `recipe ${st} ${this.sel === r ? 'sel' : ''}`, `<img src="${itemIcon(out.id)}"><span>${itemName(out.id)}${out.n > 1 ? ` ×${out.n}` : ''}</span><i class="dot"></i>`);
      row.addEventListener('click', () => { this.sel = r; this.render(); });
      list.appendChild(row);
    }
    if (this.sel) this.renderDetail(det, this.sel, ctx);
  }

  renderDetail(det, r, ctx) {
    const g = this.game, inv = this.inv, c = checkCraft(inv, r, ctx), out = r.out[0];
    const cost = c.cost || discounted(r.cost, ctx.skillLevel);
    const tier = TIER_INFO[r.tier];
    det.innerHTML = `<div class="dh"><img src="${itemIcon(out.id)}"><div><h3>${r.out.map((o) => `${itemName(o.id)}${o.n > 1 ? ' ×' + o.n : ''}`).join(' + ')}</h3><div class="cat">${tier.name} · ${STATION_INFO[r.station].name} · ${r.time}s</div></div></div>
      <p>${r.desc || ITEMS[out.id]?.desc || ''}</p><div class="costs">${costHTML(cost, inv)}</div>${r.alt ? '<div class="inv-note">Można zamienić: ' + Object.entries(r.alt).map(([id, n]) => n + '× ' + itemName(id)).join(', ') + '</div>' : ''}
      ${ctx.skillLevel ? `<div class="inv-note">Rzemieślnik: koszty niższe o ${Math.round(ctx.skillLevel * 7)}%.</div>` : ''}
      <div class="prog"><i style="width:${this.crafting ? clamp(this.crafting.t / this.crafting.dur, 0, 1) * 100 : 0}%"></i></div>`;
    const btn = el('div', 'btn primary', this.crafting ? 'Wytwarzanie…' : 'Wytwórz');
    if (!c.ok || this.crafting) { btn.setAttribute('disabled', ''); }
    if (!c.ok) det.appendChild(el('div', 'inv-note warn', c.reason || ''));
    btn.addEventListener('click', () => this.start(r));
    det.appendChild(btn);
    this.progEl = det.querySelector('.prog i'); this.btnEl = btn;
  }

  start(r) {
    const ctx = { stations: this.stations, skillLevel: this.game.player.skills.crafter || 0 };
    const c = checkCraft(this.inv, r, ctx); if (!c.ok || this.crafting) return;
    this.crafting = { r, t: 0, dur: Math.max(0.4, r.time), ctx };
    this.render();
  }
  update(dt) {
    if (!this.visible || !this.crafting) return;
    const cr = this.crafting; cr.t += dt;
    if (this.progEl) this.progEl.style.width = `${clamp(cr.t / cr.dur, 0, 1) * 100}%`;
    if (Math.random() < dt * 4) this.game.audio?.play('step_rock', { vol: 0.25, pitch: 1.3 });
    if (cr.t >= cr.dur) {
      this.crafting = null;
      const res = this.game.craftRecipe(cr.r, cr.ctx);
      this.render();
    }
  }

  renderJournal(body) {
    const found = this.game.events.notesFound;
    body.innerHTML = `<div class="inv-note" style="margin-bottom:10px">Notatki poprzedniego rozbitka: ${found.size} / ${NOTES.length}. Podpowiadają, jak stąd uciec.</div>`;
    const list = el('div', 'skilltrees'); list.style.gridTemplateColumns = '1fr'; body.appendChild(list);
    for (const n of NOTES) {
      if (found.has(n.id)) list.appendChild(el('div', 'skill', `<div class="sn">${n.title}</div><div class="sd" style="font-size:14px;color:#ddd2b8">${n.text}</div>`));
      else list.appendChild(el('div', 'skill', `<div class="sn" style="color:var(--dim)">??? — nieodnaleziona notatka</div>`));
    }
  }

  renderSkills(body) {
    const g = this.game, p = g.player, pts = p.stats.skillPoints || 0;
    body.innerHTML = `<div class="inv-note" style="margin:0 0 10px">Punkty umiejętności: <b style="color:var(--gold)">${pts}</b> — jeden punkt za każdy poziom doświadczenia.</div>`;
    const trees = {};
    for (const s of SKILLS) (trees[s.tree] = trees[s.tree] || []).push(s);
    const row = el('div', 'skilltrees'); body.appendChild(row);
    for (const [tree, list] of Object.entries(trees)) {
      const col = el('div', 'stree', `<h3>${tree}</h3>`); row.appendChild(col);
      for (const s of list) {
        const lv = p.skills[s.id] || 0;
        const card = el('div', 'skill', `<div class="sn">${s.name}</div><div class="sd">${s.desc}</div><div class="pips">${Array.from({ length: s.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>`);
        const b = el('div', 'btn small', lv >= s.max ? 'Maks.' : '+ Ulepsz'); if (pts <= 0 || lv >= s.max) b.setAttribute('disabled', '');
        b.addEventListener('click', () => { if ((p.stats.skillPoints || 0) > 0 && lv < s.max) { p.skills[s.id] = lv + 1; p.stats.skillPoints--; p.applySkills(); g.audio?.play('dawn', { vol: 0.4 }); this.render(); } });
        card.appendChild(b); col.appendChild(card);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------
export class BuildUI {
  constructor(game) {
    this.game = game;
    this.wrap = el('div', 'panel-wrap'); document.getElementById('ui').appendChild(this.wrap);
    this.panel = el('div', 'panel build'); this.wrap.appendChild(this.panel);
    this.cat = 'fire'; this.visible = false;
  }
  open() { this.visible = true; this.wrap.classList.add('show'); this.render(); }
  close() { this.visible = false; this.wrap.classList.remove('show'); }
  render() {
    const g = this.game, B = g.buildings, inv = g.player.inventory, lvl = BASE_LEVELS[B.level], nxt = B.nextLevel();
    const chk = nxt ? B.upgradeCheck() : null;
    this.panel.innerHTML = `<h2><span>Budowanie</span><small>Wybierz element, potem LPM – postaw, R – obróć</small></h2>
      <div class="baselvl"><div><b>Poziom bazy: ${lvl.name}</b><div class="inv-note">${lvl.desc}</div></div>${nxt ? `<div class="up"><div class="inv-note">Następny: <b>${nxt.name}</b> — ${Object.entries(nxt.requires).map(([id, n]) => `${n}× ${itemName(id)}`).join(', ')}${(nxt.needs || []).map(([t, c]) => `, ${c}× ${BUILDINGS[t].name}`).join('')}</div></div>` : ''}</div>
      <div class="chips" id="bcats"></div><div class="bgrid"></div>`;
    if (nxt) { const b = el('div', 'btn small ' + (chk.ok ? 'primary' : ''), `Ulepsz bazę → ${nxt.name}`); if (!chk.ok) b.title = chk.reason; b.addEventListener('click', () => { B.upgradeBase(); this.render(); }); this.panel.querySelector('.baselvl').appendChild(b); if (!chk.ok) this.panel.querySelector('.baselvl').appendChild(el('div', 'inv-note warn', chk.reason)); }
    const cats = this.panel.querySelector('#bcats');
    for (const [id, name] of Object.entries(BUILD_CATS)) { const c = el('div', 'chip' + (this.cat === id ? ' on' : ''), name); c.addEventListener('click', () => { this.cat = id; this.render(); }); cats.appendChild(c); }
    const grid = this.panel.querySelector('.bgrid');
    for (const d of Object.values(BUILDINGS)) {
      if (d.cat !== this.cat || d.upgradeOnly || d.item) continue;
      const locked = d.level > B.level, ok = !locked && B.affordable(d);
      const card = el('div', `bcard ${locked ? 'locked' : ok ? 'ok' : 'no'}`, `<div class="bn">${d.name}</div><div class="bd">${d.desc || ''}</div><div class="costs">${costHTML(d.cost, inv)}</div>${locked ? `<div class="lock">🔒 ${BASE_LEVELS[d.level].name}</div>` : ''}<div class="inv-note">HP: ${d.hp}</div>`);
      card.addEventListener('click', () => { if (locked) return g.notify(`Wymaga poziomu bazy: ${BASE_LEVELS[d.level].name}.`, 'warn'); g.beginPlacement(d.id); });
      grid.appendChild(card);
    }
  }
}

// ---------------------------------------------------------------------------------------------------
export class ContextMenu {
  constructor(game) {
    this.game = game;
    this.wrap = el('div', 'panel-wrap ctx'); document.getElementById('ui').appendChild(this.wrap);
    this.panel = el('div', 'panel ctxp'); this.wrap.appendChild(this.panel);
    this.visible = false; this.struct = null;
  }
  open(struct) {
    this.struct = struct; this.visible = true; this.wrap.classList.add('show'); this.render();
  }
  close() { this.visible = false; this.wrap.classList.remove('show'); this.struct = null; }
  render() {
    const s = this.struct, B = this.game.buildings, acts = B.actions(s), d = s.def;
    const hp = s.hp / s.maxHp;
    this.panel.innerHTML = `<h2><span>${d.name}</span><small>${Math.ceil(s.hp)} / ${s.maxHp} HP</small></h2><div class="hpbar"><i style="width:${hp * 100}%;background:${hp > 0.5 ? 'var(--green)' : hp > 0.25 ? 'var(--orange)' : 'var(--red)'}"></i></div>
      ${d.fuel ? `<div class="inv-note">Opał: ${Math.round(s.fuel / 60 * 10) / 10} min${s.lit ? '' : ' (zgaszone)'}</div>` : ''}<div class="actions"></div>`;
    const list = this.panel.querySelector('.actions');
    acts.forEach((a, i) => {
      const row = el('div', 'act' + (a.enabled ? '' : ' off'), `<kbd>${i + 1}</kbd><span>${a.label}</span>${a.hint ? `<em>${a.hint}</em>` : ''}`);
      row.addEventListener('click', () => this.run(a));
      list.appendChild(row);
    });
    this.acts = acts;
  }
  run(a) { if (!a.enabled) return; const keep = this.visible; this.close(); a.run(); if (this.game.mode === 'panel' && this.game.panel === 'context') this.game.closePanel(); }
  key(code) {
    const m = /^Digit(\d)$/.exec(code); if (!m) return false;
    const a = this.acts?.[Number(m[1]) - 1]; if (a) this.run(a); return true;
  }
}
