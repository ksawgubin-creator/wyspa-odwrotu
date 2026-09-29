// Trader panel (barter + the dice game), note reader (journal) and the end screen. Polish UI.
import { itemIcon } from './icons.js';
import { itemName, ITEMS } from '../../data/items.js';
import { NOTES } from '../../data/lore.js';
import { DICE_STAKES } from '../../data/trades.js';
import { fmtTime } from '../engine/util.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const FACE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const chipHTML = (items, inv) => Object.entries(items).map(([id, n]) => `<span class="cost ${inv ? (inv.count(id) >= n ? 'ok' : 'no') : ''}"><img src="${itemIcon(id)}">${itemName(id)} <b>${n}</b></span>`).join('');

export class TradeUI {
  constructor(game) {
    this.game = game;
    this.wrap = el('div', 'panel-wrap'); document.getElementById('ui').appendChild(this.wrap);
    this.panel = el('div', 'panel trade'); this.wrap.appendChild(this.panel);
    this.visible = false; this.tab = 'barter';
    this.stake = { item: 'hide', n: 2, mode: 'double' };
    this.dice = null;
  }
  open() { this.visible = true; this.wrap.classList.add('show'); this.render(); }
  close() { this.visible = false; this.wrap.classList.remove('show'); this.dice = null; }
  get inv() { return this.game.player.inventory; }

  render() {
    const g = this.game, t = g.events.trader;
    if (!t) { this.close(); return; }
    this.panel.innerHTML = `<h2><span>Wędrowny handlarz</span><small>Odpływa o zmroku — Esc: zamknij</small></h2>
      <div class="tabs"><div class="tab ${this.tab === 'barter' ? 'on' : ''}" data-t="barter">Wymiana</div><div class="tab ${this.tab === 'dice' ? 'on' : ''}" data-t="dice">Kości</div></div><div class="tbody"></div>`;
    this.panel.querySelectorAll('.tab').forEach((x) => x.addEventListener('click', () => { this.tab = x.dataset.t; this.render(); }));
    const body = this.panel.querySelector('.tbody');
    if (this.tab === 'barter') this.renderBarter(body, t); else this.renderDice(body);
  }

  renderBarter(body, t) {
    body.appendChild(el('div', 'inv-note', '„Skóry, kły, kości… Za dobry towar dam dobry towar.”'));
    const list = el('div', 'offers'); body.appendChild(list);
    t.offers.forEach((o, i) => {
      const can = this.inv.hasAll(o.give);
      const row = el('div', 'offer' + (can ? '' : ' off'), `<div class="side">${chipHTML(o.give, this.inv)}</div><div class="arrow">→</div><div class="side">${chipHTML(o.get)}</div>${o.note ? `<div class="inv-note" style="flex-basis:100%">${o.note}</div>` : ''}`);
      const b = el('div', 'btn small ' + (can ? 'primary' : ''), 'Wymień'); if (!can) b.setAttribute('disabled', '');
      b.addEventListener('click', () => {
        if (!this.inv.hasAll(o.give)) return;
        // make sure the rewards fit
        this.inv.removeCost(o.give);
        for (const [id, n] of Object.entries(o.get)) this.game.giveItem(id, n);
        this.game.audio?.play('craft'); this.render();
      });
      row.appendChild(b); list.appendChild(row);
    });
  }

  // ---- dice: "Kości rozbitków" ----
  renderDice(body) {
    const st = this.stake, inv = this.inv;
    if (!this.dice) {
      body.innerHTML = `<div class="inv-note">Rzucamy trzema kośćmi. Każdy może raz przerzucić dowolne z nich. Wyższa suma wygrywa, remis – przerzut. „Podwójna” stawka: wygrywasz drugie tyle. „Rzadka nagroda”: płacisz stawkę, by zagrać o cenny przedmiot.</div>
      <div class="dice-setup"></div>`;
      const setup = body.querySelector('.dice-setup');
      const opts = DICE_STAKES.filter((id) => inv.count(id) > 0);
      if (!opts.length) { setup.appendChild(el('div', 'inv-note warn', 'Nie masz nic, co można postawić (skóry, kości, kły, tłuszcz, jagody).')); return; }
      if (!opts.includes(st.item)) st.item = opts[0];
      const sel = el('select'); opts.forEach((id) => { const o = el('option', '', `${itemName(id)} (${inv.count(id)})`); o.value = id; sel.appendChild(o); }); sel.value = st.item;
      sel.addEventListener('change', () => { st.item = sel.value; st.n = Math.min(st.n, inv.count(st.item)); this.render(); });
      const num = el('input'); num.type = 'number'; num.min = 1; num.max = Math.min(20, inv.count(st.item)); num.value = Math.min(st.n, inv.count(st.item)); num.style.width = '70px';
      num.addEventListener('change', () => { st.n = Math.max(1, Math.min(Number(num.value) || 1, inv.count(st.item))); this.render(); });
      const mode = el('select'); [['double', 'Podwójna stawka'], ['rare', 'Rzadka nagroda']].forEach(([v, t]) => { const o = el('option', '', t); o.value = v; mode.appendChild(o); }); mode.value = st.mode;
      mode.addEventListener('change', () => { st.mode = mode.value; this.render(); });
      setup.append(el('label', '', 'Stawka: '), sel, num, mode);
      const prize = st.mode === 'rare' ? this.prizeFor(st) : null;
      setup.appendChild(el('div', 'inv-note', st.mode === 'rare' ? `Nagroda: <b>${prize ? `${prize.n}× ${itemName(prize.id)}` : '—'}</b> (wymagana stawka: ${prize ? prize.cost : 0}× ${itemName(st.item)})` : `Wygrana: ${st.n * 2}× ${itemName(st.item)}`));
      const b = el('div', 'btn primary', 'Zagraj'); b.style.marginTop = '12px';
      b.addEventListener('click', () => this.startDice());
      setup.appendChild(b);
    } else this.paintDice(body);
  }
  prizeFor(st) {
    const table = { hide: { id: 'healing_potion', n: 1, cost: 4 }, bone: { id: 'arrow', n: 12, cost: 6 }, fang: { id: 'obsidian', n: 2, cost: 4 }, fat: { id: 'night_vision_potion', n: 1, cost: 4 }, berries: { id: 'cooked_meat', n: 3, cost: 6 } };
    return table[st.item];
  }
  startDice() {
    const st = this.stake, inv = this.inv, prize = st.mode === 'rare' ? this.prizeFor(st) : null;
    const cost = st.mode === 'rare' ? prize.cost : st.n;
    if (inv.count(st.item) < cost) { this.game.notify('Nie masz tyle do postawienia.', 'warn'); return; }
    inv.remove(st.item, cost);
    this.dice = { cost, prize, you: [0, 0, 0], him: [0, 0, 0], hold: [false, false, false], phase: 'roll1', msg: '', result: null };
    this.roll(this.dice.you, [true, true, true]); this.roll(this.dice.him, [true, true, true]);
    this.dice.anim = 0.7; this.render();
  }
  roll(arr, which) { for (let i = 0; i < 3; i++) if (which[i]) arr[i] = 1 + Math.floor(Math.random() * 6); this.game.audio?.play('step_rock', { vol: 0.6, pitch: 1.6 }); }
  paintDice(body) {
    const d = this.dice, sum = (a) => a[0] + a[1] + a[2];
    body.innerHTML = `<div class="inv-note">Stawka: ${d.cost}× ${itemName(this.stake.item)}${d.prize ? ` · nagroda: ${d.prize.n}× ${itemName(d.prize.id)}` : ''}</div>
      <div class="dice-row"><div><h3>Ty</h3><div class="dice you"></div><div class="sum">Suma: ${sum(d.you)}</div></div><div><h3>Handlarz</h3><div class="dice him"></div><div class="sum">Suma: ${d.phase === 'roll1' ? '?' : sum(d.him)}</div></div></div><div class="dice-msg">${d.msg}</div><div class="dice-btns"></div>`;
    const yc = body.querySelector('.dice.you'), hc = body.querySelector('.dice.him');
    d.you.forEach((v, i) => { const x = el('div', 'die' + (d.hold[i] ? ' held' : '') + (d.phase === 'roll1' ? ' pick' : ''), FACE[v - 1]); if (d.phase === 'roll1') x.addEventListener('click', () => { d.hold[i] = !d.hold[i]; this.render(); }); yc.appendChild(x); });
    d.him.forEach((v, i) => hc.appendChild(el('div', 'die', d.phase === 'roll1' ? '?' : FACE[v - 1])));
    const btns = body.querySelector('.dice-btns');
    if (d.phase === 'roll1') {
      const b1 = el('div', 'btn primary', d.hold.some((h) => !h) ? 'Przerzuć niewybrane (zostaw zaznaczone)' : 'Zostaw wszystkie'); b1.title = 'Kliknij kości, które chcesz ZOSTAWIĆ';
      b1.addEventListener('click', () => this.finishDice());
      btns.appendChild(b1);
      btns.appendChild(el('div', 'inv-note', 'Kliknij kości, które chcesz zostawić (zaznaczone złotym). Pozostałe zostaną przerzucone.'));
    } else {
      const b = el('div', 'btn primary', 'Dalej'); b.addEventListener('click', () => { this.dice = null; this.render(); }); btns.appendChild(b);
    }
  }
  finishDice() {
    const d = this.dice, st = this.stake, sum = (a) => a[0] + a[1] + a[2];
    this.roll(d.you, d.hold.map((h) => !h));
    // trader re-rolls dice showing 3 or less
    this.roll(d.him, d.him.map((v) => v <= 3));
    let a = sum(d.you), b = sum(d.him);
    let msg = '';
    let guard = 0;
    while (a === b && guard++ < 5) { d.you = d.you.map(() => 1 + Math.floor(Math.random() * 6)); d.him = d.him.map(() => 1 + Math.floor(Math.random() * 6)); a = sum(d.you); b = sum(d.him); msg = 'Remis – przerzut! '; }
    d.phase = 'done';
    if (a > b) {
      if (d.prize) { this.game.giveItem(d.prize.id, d.prize.n); msg += `Wygrałeś! Dostajesz ${d.prize.n}× ${itemName(d.prize.id)}.`; }
      else { this.game.giveItem(st.item, d.cost * 2); msg += `Wygrałeś! Dostajesz ${d.cost * 2}× ${itemName(st.item)}.`; }
      this.game.audio?.play('dawn', { vol: 0.5 });
    } else { msg += `Przegrałeś stawkę: ${d.cost}× ${itemName(st.item)}.`; this.game.audio?.play('block'); }
    d.msg = msg; this.render();
  }
}

// ---------------------------------------------------------------------------------------------------
export class NoteUI {
  constructor(game) {
    this.game = game;
    this.wrap = el('div', 'panel-wrap'); document.getElementById('ui').appendChild(this.wrap);
    this.panel = el('div', 'panel note'); this.wrap.appendChild(this.panel);
    this.visible = false;
  }
  open(noteId) {
    const n = NOTES.find((x) => x.id === noteId); if (!n) return;
    this.visible = true; this.wrap.classList.add('show');
    this.panel.innerHTML = `<div class="parchment"><h2>${n.title}</h2><p>${n.text}</p><div class="inv-note" style="text-align:right">Esc – zamknij · K/C – dziennik</div></div>`;
  }
  close() { this.visible = false; this.wrap.classList.remove('show'); }
}

// ---------------------------------------------------------------------------------------------------
export class EndScreen {
  constructor(game) {
    this.game = game;
    this.wrap = el('div', 'panel-wrap'); this.wrap.style.zIndex = '60'; document.getElementById('ui').appendChild(this.wrap);
    this.panel = el('div', 'panel endp'); this.wrap.appendChild(this.panel);
  }
  show(type) {
    const g = this.game, p = g.player, st = p.stats_;
    const mins = Math.round((g.playTime || g.time) / 60);
    this.wrap.classList.add('show');
    this.panel.innerHTML = `<h1 style="color:var(--gold);text-align:center;letter-spacing:.14em;text-transform:uppercase;font-weight:500">${type === 'raft' ? 'Uciekłeś z wyspy' : 'Uratowany'}</h1>
      <p style="text-align:center;color:var(--dim)">${type === 'raft' ? 'Tratwa z obsydianowym sterem przecięła fale. Wyspa Odwrotu znika za horyzontem.' : 'Na horyzoncie pojawił się żagiel. Ognisko sygnałowe spełniło swoje zadanie.'}</p>
      <div class="endstats">
        <div><b>${g.clock.day}</b><span>dni na wyspie</span></div><div><b>${Math.max(0, g.clock.day - 1)}</b><span>przetrwanych nocy</span></div>
        <div><b>${st.kills || 0}</b><span>upolowanych zwierząt</span></div><div><b>${st.crafted || 0}</b><span>stworzonych przedmiotów</span></div>
        <div><b>${g.buildings.list.length}</b><span>budowli w bazie</span></div><div><b>${g.events.notesFound.size}/8</b><span>znalezionych notatek</span></div>
        <div><b>${p.stats.level}</b><span>poziom postaci</span></div><div><b>${mins} min</b><span>czasu gry</span></div>
      </div><div style="display:flex;gap:10px;justify-content:center;margin-top:18px" id="end-btns"></div>`;
    const b = this.panel.querySelector('#end-btns');
    const c = el('div', 'btn', 'Kontynuuj zabawę na wyspie'); c.addEventListener('click', () => { this.wrap.classList.remove('show'); g.afterEnding(); });
    const m = el('div', 'btn primary', 'Menu główne'); m.addEventListener('click', () => { this.wrap.classList.remove('show'); g.afterEnding(true); });
    b.append(c, m);
  }
}
