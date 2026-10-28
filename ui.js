'use strict';
/* ============================================================
   KARIERA MENEDŻERA – interfejs (mobile-first)
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = {
  tab: 'home', sqTab: 'pitch', nt: false, compTab: 'league', cc: null, lg: null, lgTab: 'table', rnd: null,
  euro: 'CL', euroTab: 'lp', md: null, mkTab: 'search', clubTab: 'fin', sel: null, listSort: 'pos',
  f: { cc: '', pos: '', age: 0, ovr: 0, price: 0, sort: 'ovr', q: '' },
};
const ACT = {}, CHG = {};

/* ---------- helpery ---------- */
function badge(t, cls = '') { const col = t.col || ['#334', '#fff']; return `<span class="badge ${cls}" style="background:${col[0]};color:${col[1]}">${esc(t.short)}</span>`; }
const ntObj = code => ({ short: code, col: ncol(code), name: NAT[code].name });
const ovrCls = o => o >= 85 ? 'o0' : o >= 75 ? 'o1' : o >= 65 ? 'o2' : o >= 55 ? 'o3' : o >= 47 ? 'o4' : 'o5';
const ovrTag = o => `<span class="ovr ${ovrCls(o)}">${o}</span>`;
function ovrShow(p, pot) { const r = ovrRange(p, pot); if (pot && know(p) < 30) return '<span class="ovr unk">?</span>'; return r[0] === r[1] ? ovrTag(r[0]) : `<span class="ovr unk">${r[0]}–${r[1]}</span>`; }
const posTag = p => `<span class="pos ${LINE[p]}">${POS_PL[p]}</span>`;
const flag = code => NAT[code] ? NAT[code].flag : '🏳️';
const stars = c => { const n = clamp(Math.round((c.rep - 35) / 12), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2800); }
function modal(html, lock) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.classList.remove('hidden'); if (lock) m.dataset.lock = '1'; else delete m.dataset.lock; m.onclick = e => { if (e.target === m && !m.dataset.lock) closeModal(); }; }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; delete m.dataset.lock; }
const bar = (v, cls = '') => `<div class="bar ${v < 50 ? 'b' : v < 75 ? 'w' : ''} ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
const morale = p => `<span title="${moraleLabel(p.mor)[1]}">${moraleLabel(p.mor)[0]}</span>`;
const formArrow = f => f >= 65 ? '<span class="good">▲</span>' : f <= 38 ? '<span class="bad">▼</span>' : '<span class="mut">●</span>';
function stTag(p) { return p.inj ? `<span class="pill r">🚑 ${Math.ceil(p.inj / 7)} tyg.</span>` : p.susp ? `<span class="pill r">🟥 ${p.susp}</span>` : ''; }
const tabs = (list, cur, act) => `<div class="tabs">${list.map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-arg="${k}">${n}</button>`).join('')}</div>`;
const busy = (on, t) => { const b = $('#busy'); b.classList.toggle('hidden', !on); if (t) b.querySelector('span').textContent = t; };
ACT.close = () => closeModal();

/* ---------- render główny ---------- */
function render() {
  const ut = userClub(), d = curDay();
  $('#top').innerHTML = `${badge(ut)}<div class="tt"><b>${esc(ut.name)}</b><small>${d ? fmtDate(d.date) : ''} • ${SEASON_LABEL(S.season)}</small></div>
    <div class="money">${money(ut.bal)}<small class="${windowOpen() ? 'good' : 'mut'}">${windowOpen() ? '🟢 okno otwarte' : '🔒 okno zamkn.'}</small></div>`;
  const unread = S.inbox.filter(m => !m.read).length;
  const T = [['home', '🏠', 'Pulpit'], ['squad', '👕', 'Skład'], ['comps', '🏆', 'Rozgrywki'], ['market', '🔍', 'Transfery'], ['club', '🏟️', 'Klub']];
  $('#nav').innerHTML = T.map(([k, i, n]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-arg="${k}"><i>${i}</i>${n}${k === 'home' && unread ? `<span class="dot">${unread}</span>` : ''}${k === 'market' && S.offers.length ? `<span class="dot">${S.offers.length}</span>` : ''}</button>`).join('');
  $('#view').innerHTML = ({ home: vHome, squad: vSquad, comps: vComps, market: vMarket, club: vClub })[UI.tab]();
}
ACT.tab = a => { UI.tab = a; UI.sel = null; render(); window.scrollTo(0, 0); };

/* ---------- następny mecz ---------- */
function peekUser() {
  for (let i = S.day; i < S.cal.length; i++) {
    const d = S.cal[i];
    if (d.t === 'L') { const lg = S.leagues[userClub().lg], r = lg.lsMap[d.ls]; if (r >= 0) { const f = lg.fix[r].find(f => f.h === S.user || f.a === S.user); return { i, d, h: club(f.h), a: club(f.a), label: `${lg.name} • ${r + 1}. kolejka` }; } }
    if (d.t === 'E') for (const c of Object.values(S.euro)) {
      if (d.st === 'LP') { const f = c.lp[d.md] && c.lp[d.md].find(f => f.h === S.user || f.a === S.user); if (f) return { i, d, h: club(f.h), a: club(f.a), label: `${c.name} • faza ligowa ${d.md + 1}` }; }
      else if (c.ko[d.st]) { const t = c.ko[d.st].find(t => t.a === S.user || t.b === S.user); if (t) { const first = d.st === 'F' || d.leg === 1; return { i, d, h: club(first ? t.a : t.b), a: club(first ? t.b : t.a), label: `${c.name} • ${STAGE_NAME[d.st]}${d.st !== 'F' ? (d.leg === 1 ? ' (1. mecz)' : ' (rewanż)') : ''}` }; } }
      else if (c.teams.includes(S.user) && i === S.day) { const x = userMatchToday(); if (x) return { i, d, h: x.h, a: x.a, label: x.opts.label }; }
    }
    if ((d.t === 'N' || d.t === 'T') && S.nt && i === S.day) { const x = userMatchToday(); if (x) return { i, d, h: x.h, a: x.a, label: x.opts.label, nt: true }; }
    if (d.t === 'N' && S.nt) {
      const g = S.ntc.groups.find(g => g.teams.includes(S.nt));
      const f = g && d.md < 6 ? g.fix[d.md].find(f => f.h === S.nt || f.a === S.nt) : (S.ntc.fr[d.md] || []).find(f => f.h === S.nt || f.a === S.nt);
      if (f) return { i, d, h: ntObj(f.h), a: ntObj(f.a), label: g && d.md < 6 ? (S.ntc.type === 'NLF' ? 'Liga Narodów' : 'Eliminacje') : 'Mecz towarzyski', nt: true };
    }
  }
  return null;
}

/* ---------- PULPIT ---------- */
function vHome() {
  const ut = userClub(), nx = peekUser(), today = nx && nx.i === S.day;
  const tb = table(ut.lg), row = tb.find(r => r.id === ut.id);
  const out = ut.players.filter(p => p.inj || p.susp);
  const conf = S.board.conf, ec = Object.values(S.euro).find(c => c.teams.includes(ut.id));
  const mAvg = Math.round(avg(ut.players.map(p => p.mor))), fAvg = Math.round(avg(ut.players.map(p => p.fit)));
  return `
  <div class="card hl">
    ${nx ? `<div class="row"><small>${esc(nx.label)}</small><span class="sp"></span><span class="pill">${fmtDate(nx.d.date)}</span></div>
    <div class="fixture"><div class="tm">${badge(nx.h, 'lg')}<span>${esc(nx.h.name)}</span></div><div class="vs">vs</div><div class="tm">${badge(nx.a, 'lg')}<span>${esc(nx.a.name)}</span></div></div>` : '<b>Koniec sezonu</b>'}
    <div class="btns">${today ? `<button class="btn pri sp" data-act="prematch">⚽ Graj mecz</button><button class="btn" data-act="quicksim">⏩ Symuluj</button>` : `<button class="btn pri sp" data-act="cont">▶ Kontynuuj</button>`}</div>
  </div>
  <div class="grid2">
    <div class="card stat"><small>${esc(S.leagues[ut.lg].name)}</small><b>${row.pos}. miejsce</b><small>${row.Pts} pkt • ${row.W}-${row.D}-${row.L}</small><div class="chips">${row.form.slice(-5).map(c => `<span class="chip ${c}">${c === 'W' ? 'Z' : c === 'D' ? 'R' : 'P'}</span>`).join('')}</div></div>
    <div class="card stat"><small>Drużyna</small><b>${moraleLabel(mAvg)[0]} ${moraleLabel(mAvg)[1]}</b><small>Morale ${mAvg} • kondycja ${fAvg}%</small>${bar(fAvg)}</div>
  </div>
  ${ec ? `<div class="card" data-act="goeuro" data-arg="${ec.id}"><div class="row"><span class="eu ${ec.id}">${ec.id === 'CL' ? '⭐' : ec.id === 'EL' ? '🟠' : '🟢'}</span><b class="sp">${ec.name}</b><small>${euroStatus(ec)}</small></div></div>` : ''}
  <div class="card"><div class="row"><b>Zarząd</b><span class="sp"></span><span class="${conf > 55 ? 'good' : conf > 30 ? 'warn' : 'bad'}">${conf > 70 ? 'Bardzo zadowolony' : conf > 50 ? 'Zadowolony' : conf > 30 ? 'Niezadowolony' : 'Na krawędzi zwolnienia!'}</span></div>
    ${bar(conf)}<small>${esc(S.board.text)}${S.board.euro ? ' Europa: ' + esc(S.board.euro) + '.' : ''}</small></div>
  ${S.nt ? `<div class="card" data-act="gont"><div class="row"><span style="font-size:22px">${flag(S.nt)}</span><b class="sp">Reprezentacja: ${esc(NAT[S.nt].name)}</b><small>Powołania ›</small></div></div>` : ''}
  ${out.length ? `<div class="card"><b>Niedostępni</b>${out.map(p => `<div class="row" style="margin-top:6px" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<span class="sp">${esc(p.n)}</span>${stTag(p)}</div>`).join('')}</div>` : ''}
  <div class="card"><div class="row"><b>Wiadomości</b><span class="sp"></span><button class="btn sm" data-act="inbox">Wszystkie</button></div>
    ${S.inbox.slice(0, 4).map(m => `<div class="msg ${m.read ? '' : 'new'}"><b>${esc(m.title)}</b><p>${esc(m.body)}</p></div>`).join('')}</div>`;
}
function euroStatus(c) {
  if (c.champion === S.user) return '🏆 Zwycięzca!';
  for (const st of ['F', 'SF', 'QF', 'R16', 'PO']) if (c.ko[st]) { const t = c.ko[st].find(t => t.a === S.user || t.b === S.user); if (t) return t.w == null ? STAGE_NAME[st] : t.w === S.user ? `awans (${STAGE_NAME[st]})` : `odpadli: ${STAGE_NAME[st]}`; }
  const r = lpTable(c).find(r => r.id === S.user); return r ? `faza ligowa: ${r.pos}. m. (${r.Pts} pkt)` : '';
}
ACT.goeuro = a => { UI.tab = 'comps'; UI.compTab = 'euro'; UI.euro = a; render(); };
ACT.gont = () => { UI.tab = 'club'; UI.clubTab = 'nt'; render(); };
ACT.inbox = () => { S.inbox.forEach(m => m.read = true); saveSoon(); modal(`<h2>Wiadomości</h2>${S.inbox.map(m => `<div class="msg"><b>${esc(m.title)}</b><small>${m.date ? fmtDate(m.date) : ''}</small><p>${esc(m.body)}</p></div>`).join('')}<div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`); render(); };

/* ---------- KONTYNUUJ ---------- */
let running = false;
ACT.cont = async () => {
  if (running) return; running = true;
  try {
    if (S.sacked) return showSacked();
    if (userMatchToday()) { ACT.prematch(); return; }
    busy(true, 'Symulacja…');
    for (let n = 0; n < 40; n++) {
      const r = processDay(null);
      if (r.summary) { busy(false); await saveNow(); render(); return showSummary(r.summary); }
      if (S.sacked) { busy(false); saveNow(); render(); return showSacked(); }
      if (userMatchToday()) break;
      busy(true, `Symulacja… ${fmtDate(curDay().date)}`);
      await new Promise(r => setTimeout(r, 0));
    }
    busy(false); saveNow(); render();
    if (userMatchToday()) ACT.prematch();
  } finally { running = false; busy(false); }
};

/* ---------- SKŁAD ---------- */
function ctxTeam() { if (UI.nt && S.nt) { const t = ntTeam(S.nt); fixLineup(t); syncNT(t); return t; } const t = userClub(); fixLineup(t, emergencyFor(t)); return t; }
function commit(t) { if (t._st) syncNT(t); saveSoon(); }
function vSquad() {
  const t = ctxTeam();
  const head = (S.nt ? tabs([['club', '🏟️ Klub'], ['nt', flag(S.nt) + ' Reprezentacja']], UI.nt ? 'nt' : 'club', 'sqnt') : '') + tabs([['pitch', 'Boisko'], ['list', 'Kadra'], ['tactic', 'Taktyka']], UI.sqTab, 'sqtab');
  if (UI.sqTab === 'list') return head + vSquadList(t);
  if (UI.sqTab === 'tactic') return head + vTactic(t);
  const slots = slotsOf(t.formation);
  const inL = new Set(t.lineup), inB = new Set(t.bench);
  const chip = (p, i) => { const s = slots[i]; const v = ovrAt(p, s.pos); return `<div class="pchip ${UI.sel === p.id ? 'sel' : ''}" style="left:${s.x}%;bottom:${s.y}%" data-act="tap" data-arg="${p.id}">
      ${ovrTag(v)}<div class="nm">${esc(lastName(p))}</div><div class="pp">${POS_PL[s.pos]}${p.pos !== s.pos && !(p.alt || []).includes(s.pos) ? ' ⚠' : ''} ${moraleLabel(p.mor)[0]}</div><div class="fb"><i style="width:${p.fit}%;background:${p.fit < 60 ? 'var(--bad)' : p.fit < 80 ? 'var(--warn)' : 'var(--acc)'}"></i></div></div>`; };
  const bench = t.bench.map(pget).filter(Boolean);
  const res = t.players.filter(p => !inL.has(p.id) && !inB.has(p.id)).sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);
  return head + `
  <div class="row" style="margin-bottom:8px"><b>${t.formation}</b><small class="mut">• średnia XI ${lineupAvg(t)}</small><span class="sp"></span><button class="btn sm" data-act="autopick">Auto-skład</button></div>
  <small class="mut">${UI.sel ? 'Wybierz drugiego zawodnika, by zamienić.' : 'Dotknij zawodnika, potem drugiego, aby ich zamienić.'}</small>
  <div class="pitch2">${t.lineup.map((id, i) => chip(pget(id), i)).join('')}</div>
  <h3>Ławka (${bench.length})</h3>
  <div class="card list">${bench.map(p => sqRow(p)).join('')}</div>
  <h3>Poza kadrą meczową (${res.length})</h3>
  <div class="card list">${res.map(p => sqRow(p)).join('') || '<small>Brak</small>'}</div>`;
}
function sqRow(p) {
  return `<div class="prow ${UI.sel === p.id ? 'sel' : ''} ${isAvail(p) ? '' : 'out'}" data-act="tap" data-arg="${p.id}">
    ${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${p.age} l. ${stTag(p)} ${p.con <= 1 && !p.loan && p.tid === S.user ? '<span class="pill y">kontrakt</span>' : ''} ${p.listed ? '<span class="pill">lista</span>' : ''} ${p.loan ? '<span class="pill">wyp.</span>' : ''}</small></div>
    ${morale(p)}${formArrow(p.form)}<div class="fitb">${bar(p.fit)}</div>${ovrTag(p.ovr)}<button class="info" data-act="info" data-arg="${p.id}">i</button></div>`;
}
function vSquadList(t) {
  const s = UI.listSort;
  const ps = t.players.slice().sort((a, b) => s === 'ovr' ? b.ovr - a.ovr : s === 'age' ? a.age - b.age : s === 'fit' ? a.fit - b.fit : s === 'mor' ? a.mor - b.mor : s === 'val' ? b.val - a.val : POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);
  const tot = sum(t.players.map(p => p.val || 0)), wages = sum(t.players.map(p => p.wage || 0));
  return `<div class="flt"><select data-change="lsort">${[['pos', 'wg pozycji'], ['ovr', 'wg ogólnej'], ['age', 'wg wieku'], ['fit', 'wg kondycji'], ['mor', 'wg morale'], ['val', 'wg wartości']].map(([k, n]) => `<option value="${k}" ${s === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${t._st ? '' : `<small class="mut">Wartość kadry: ${money(tot)} • pensje: ${money(wages)}/tydz.</small>`}
    <div class="card list">${ps.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${p.age} l. • ${playerStatus(p)} • ${money(p.val)} ${stTag(p)}</small></div>
      <span class="mini">${Math.round(p.fit)}%</span>${morale(p)}${ovrTag(p.ovr)}${ovrTag(p.pot)}</div>`).join('')}</div>`;
}
function vTactic(t) {
  return `<div class="card"><h2>Formacja</h2><div class="seg">${Object.keys(FORMATIONS).map(f => `<button class="btn sm ${t.formation === f ? 'on' : ''}" data-act="setform" data-arg="${f}">${f}</button>`).join('')}</div></div>
    <div class="card"><h2>Mentalność</h2><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn sm ${(t.ment || 'bal') === k ? 'on' : ''}" data-act="setment" data-arg="${k}">${v}</button>`).join('')}</div>
    <small class="mut">Ofensywna: więcej strzałów, ale też więcej okazji rywala. Defensywna: mniej ryzyka.</small></div>
    ${t._st ? '' : `<div class="card"><h2>Trening</h2><select data-change="training" style="width:100%">${Object.entries({ bal: 'Zrównoważony (pomocnicy)', fit: 'Kondycja (szybsza regeneracja)', att: 'Atak (napastnicy)', def: 'Obrona (obrońcy, bramkarze)' }).map(([k, v]) => `<option value="${k}" ${t.training === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <small class="mut">Młodzi i grający regularnie rozwijają się najszybciej. Ośrodek treningowy: poziom ${S.fac.train}/5.</small></div>`}`;
}
ACT.sqnt = a => { UI.nt = a === 'nt'; UI.sel = null; render(); };
ACT.sqtab = a => { UI.sqTab = a; UI.sel = null; render(); };
CHG.lsort = v => { UI.listSort = v; render(); };
CHG.training = v => { userClub().training = v; saveSoon(); };
ACT.setform = f => { const t = ctxTeam(); t.formation = f; autoPick(t, f); commit(t); render(); };
ACT.setment = k => { const t = ctxTeam(); t.ment = k; commit(t); render(); };
ACT.autopick = () => { const t = ctxTeam(); autoPick(t); commit(t); UI.sel = null; render(); toast('Skład wybrany automatycznie.'); };
ACT.tap = id => {
  id = +id; const t = ctxTeam();
  if (UI.sel == null) { UI.sel = id; return render(); }
  if (UI.sel === id) { UI.sel = null; return render(); }
  const a = UI.sel, b = id; UI.sel = null;
  const ia = t.lineup.indexOf(a), ib = t.lineup.indexOf(b), pa = pget(a), pb = pget(b);
  if ((ia < 0 && !isAvail(pa) && ib >= 0) || (ib < 0 && !isAvail(pb) && ia >= 0)) { toast('Ten zawodnik jest niedostępny.'); return render(); }
  if (ia >= 0 && ib >= 0) { t.lineup[ia] = b; t.lineup[ib] = a; }
  else if (ia >= 0 || ib >= 0) {
    const inId = ia >= 0 ? b : a, outId = ia >= 0 ? a : b, idx = ia >= 0 ? ia : ib;
    t.lineup[idx] = inId; const bi = t.bench.indexOf(inId);
    if (bi >= 0) t.bench[bi] = outId; else if (t.bench.length < BENCH) t.bench.push(outId);
  } else {
    const ba = t.bench.indexOf(a), bb = t.bench.indexOf(b);
    if (ba >= 0 && bb >= 0) { t.bench[ba] = b; t.bench[bb] = a; } else if (ba >= 0) t.bench[ba] = b; else if (bb >= 0) t.bench[bb] = a;
  }
  commit(t); render();
};

/* ---------- KARTA ZAWODNIKA ---------- */
ACT.info = id => {
  const p = pget(+id); if (!p) return;
  const mine = p.tid === S.user, k = know(p), c = clubOf(p);
  const r = ovrRange(p), known = k >= 60;
  const cardCls = r[0] >= 75 ? 'gold' : r[0] >= 65 ? 'silver' : 'bronze';
  const names = p.pos === 'GK' ? ATTR_GK : ATTR_OUT;
  const at = attrs(p);
  const avgR = p.st.apps ? (p.st.rs / p.st.apps).toFixed(2) : '–';
  const otherPos = p.pos === 'GK' ? [] : POSITIONS.filter(q => q !== 'GK' && q !== p.pos).map(q => [q, ovrAt(p, q)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
  let act = '';
  if (mine) {
    act = `<h3>Rozmowa</h3><div class="btns"><button class="btn sm" data-act="talk" data-arg="${p.id}:praise">👏 Pochwal</button><button class="btn sm" data-act="talk" data-arg="${p.id}:crit">☝️ Skrytykuj</button><button class="btn sm" data-act="talk" data-arg="${p.id}:promise">🤝 Obiecaj grę</button></div>
      ${p.loan ? `<p class="mut">Wypożyczony z ${esc(club(p.loan.from).name)} do końca sezonu.</p><div class="btns"><button class="btn sm red" data-act="release" data-arg="${p.id}">Zakończ wypożyczenie</button></div>` : `
      <h3>Kontrakt (${p.con} ${p.con === 1 ? 'rok' : 'lata'})</h3><div class="btns">${[1, 2, 3, 4, 5].map(y => `<button class="btn sm" data-act="renew" data-arg="${p.id}:${y}">${y} l. • ${money(renewDemand(p, y))}/t</button>`).join('')}</div>
      <div class="btns"><button class="btn sm ${p.listed ? 'pri' : ''}" data-act="list" data-arg="${p.id}">${p.listed ? '✔ Na liście transferowej' : 'Wystaw na sprzedaż'}</button><button class="btn sm" data-act="loanout" data-arg="${p.id}">Wypożycz</button><button class="btn sm red" data-act="release" data-arg="${p.id}">Rozwiąż (${money(p.wage * 20 * p.con)})</button></div>`}`;
  } else if (p.tid !== -2) {
    act = `<div class="btns">
      ${p.tid === -1 ? `<button class="btn pri sp" data-act="nego" data-arg="${p.id}">✍️ Podpisz (wolny)</button>` : `<button class="btn pri sp" data-act="nego" data-arg="${p.id}">💰 Złóż ofertę</button><button class="btn" data-act="loanin" data-arg="${p.id}">Wypożycz</button>`}
      <button class="btn" data-act="short" data-arg="${p.id}">${S.short.includes(p.id) ? '★ Obserwowany' : '☆ Obserwuj'}</button></div>
      ${k < 100 ? `<div class="btns"><button class="btn sm full" data-act="scoutp" data-arg="${p.id}">🔍 Wyślij skauta (wiedza ${k}%)</button></div>` : ''}`;
  }
  if (S.nt && p.nat === S.nt && p.tid !== -1) {
    const sq = S.ntTeams[S.nt].sq;
    act += `<div class="btns"><button class="btn sm full" data-act="callup" data-arg="${p.id}">${sq.includes(p.id) ? '✔ Powołany – usuń z kadry' : `${flag(S.nt)} Powołaj do reprezentacji`}</button></div>`;
  }
  modal(`<div class="fut ${cardCls}">
      <div class="fl"><div class="big">${r[0] === r[1] ? r[0] : r[0] + '–' + r[1]}</div><div>${POS_PL[p.pos]}</div><div class="fg">${flag(p.nat)}</div>${c ? badge(c, 'sm') : ''}</div>
      <div class="fr"><div class="fname">${esc(p.n)}</div>
        <div class="attrs">${names.map((n, i) => `<div><b>${known ? at[i] : '?'}</b> ${n}</div>`).join('')}</div>
        <small>${p.foot === 'L' ? 'Lewa' : 'Prawa'} noga • słabsza ${'★'.repeat(p.wf)} • triki ${'★'.repeat(p.sm)}</small></div></div>
    <div class="row" style="margin:10px 0 4px">${posTag(p.pos)}${(p.alt || []).map(posTag).join('')}<span class="sp mut" style="text-align:right">${esc(clubName(p))}${c ? ' ' + S.countries[c.cc].flag : ''}</span></div>
    ${stTag(p)}
    <div class="kv">
      <div><span>Wiek</span><b>${p.age}</b></div><div><span>Potencjał</span>${ovrShow(p, true)}</div>
      <div><span>Kondycja</span><b>${Math.round(p.fit)}%</b></div><div><span>Morale</span><b>${moraleLabel(p.mor).join(' ')}</b></div>
      <div><span>Forma</span><b>${formLabel(p.form)}</b></div><div><span>Rytm meczowy</span><b>${Math.round(p.shp)}%</b></div>
      <div><span>Wartość</span><b>${money(p.val)}</b></div><div><span>Pensja</span><b>${p.tid === -2 ? '–' : money(p.wage) + '/t'}</b></div>
      <div><span>Kontrakt</span><b>${p.tid >= 0 ? p.con + ' l.' : '–'}</b></div><div><span>Status</span><b>${playerStatus(p)}</b></div>
      <div><span>Mecze / gole</span><b>${p.st.apps} / ${p.st.g}</b></div><div><span>Asysty / ocena</span><b>${p.st.a} / ${avgR}</b></div>
      <div><span>Kariera</span><b>${p.car.apps} m., ${p.car.g} g.</b></div><div><span>Reprezentacja</span><b>${p.caps} m., ${p.ng} g.</b></div>
    </div>
    ${known && otherPos.length ? `<small class="mut">Inne pozycje: ${otherPos.map(([q, v]) => `${POS_PL[q]} ${v}`).join(' • ')}</small>` : ''}
    ${act}<div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
ACT.talk = a => { const [id, k] = a.split(':'); const r = talkTo(+id, k); toast(r.msg); ACT.info(id); };
ACT.renew = a => { const [id, y] = a.split(':').map(Number); const r = renewContract(id, y); toast(r.msg); ACT.info(id); render(); };
ACT.list = id => { const p = pget(+id); p.listed = !p.listed; saveSoon(); toast(p.listed ? 'Wystawiono na sprzedaż – czekaj na oferty (w oknie transferowym).' : 'Wycofano z listy.'); ACT.info(id); render(); };
ACT.release = id => { if (!confirm('Na pewno?')) return; const r = releasePlayer(+id); toast(r.msg); if (r.ok) closeModal(); render(); };
ACT.loanout = id => { const r = loanOut(+id); toast(r.msg); if (r.ok) closeModal(); render(); };
ACT.loanin = id => { const r = loanIn(+id); toast(r.msg); if (r.ok) closeModal(); render(); };
ACT.short = id => { id = +id; S.short = S.short.includes(id) ? S.short.filter(x => x !== id) : [id, ...S.short]; saveSoon(); ACT.info(id); };
ACT.callup = id => { id = +id; const st = S.ntTeams[S.nt]; if (st.sq.includes(id)) st.sq = st.sq.filter(x => x !== id); else if (st.sq.length >= 26) return toast('Maksymalnie 26 powołanych.'); else st.sq.push(id); saveSoon(); ACT.info(id); };
ACT.scoutp = id => {
  const free = S.scouts.filter(s => !s.task);
  if (!S.scouts.length) return toast('Nie masz skautów – zatrudnij ich w zakładce Transfery → Skauting.');
  modal(`<h2>Wyślij skauta</h2><small class="mut">Obserwacja trwa 1–2 tygodnie.</small>${S.scouts.map(s => `<div class="prow" data-act="doscoutp" data-arg="${s.id}:${id}"><div class="pn">${esc(s.name)}<small>Ocena ${s.ab}/20 • ${s.task ? 'zajęty – przerwie obecne zadanie' : 'wolny'}</small></div>›</div>`).join('')}<div class="btns"><button class="btn full" data-act="close">Anuluj</button></div>`);
};
ACT.doscoutp = a => { const [sid, pid] = a.split(':').map(Number); assignScout(sid, { k: 'player', pid }); closeModal(); toast('Skaut wyruszył na obserwację.'); render(); };

/* ---------- negocjacje ---------- */
let NEG = null;
ACT.nego = id => {
  const p = pget(+id);
  const free = p.tid === -1;
  NEG = { pid: p.id, fee: free ? 0 : askPrice(p), stage: free ? 2 : 1, wage: wageDemand(p), years: p.age >= 31 ? 2 : 4 };
  if (!free && !windowOpen()) return toast('Okno transferowe jest zamknięte.');
  const i = playerInterest(p); if (!i.ok) return toast(i.msg);
  renderNego();
};
function feeStep(v) { return v >= 2e7 ? 1e6 : v >= 5e6 ? 5e5 : v >= 1e6 ? 1e5 : 25000; }
function renderNego(note) {
  const p = pget(NEG.pid), ut = userClub(), c = clubOf(p);
  if (NEG.stage === 1) {
    modal(`<h2>Oferta transferowa</h2><div class="row">${posTag(p.pos)}<b class="sp">${esc(p.n)}</b>${ovrShow(p)}</div>
      <small class="mut">${esc(c.name)} • wartość ${money(p.val)} • budżet ${money(ut.tb)}</small>
      <div class="stepper"><button class="btn" data-act="fee" data-arg="-1">−</button><b>${money(NEG.fee)}</b><button class="btn" data-act="fee" data-arg="1">+</button></div>
      ${note ? `<p class="${note.cls}">${esc(note.t)}</p>` : ''}
      <div class="btns"><button class="btn pri sp" data-act="sendbid">Złóż ofertę</button>${NEG.counter ? `<button class="btn" data-act="acccounter">Przyjmij kontrę</button>` : ''}</div>
      <div class="btns"><button class="btn full" data-act="close">Anuluj</button></div>`);
  } else {
    const dem = wageDemand(p);
    modal(`<h2>Warunki kontraktu</h2><div class="row">${posTag(p.pos)}<b class="sp">${esc(p.n)}</b>${ovrShow(p)}</div>
      <small class="mut">Agent zawodnika oczekuje ok. ${money(dem)}/tydz.${NEG.fee ? ` • kwota transferu: ${money(NEG.fee)}` : ''}</small>
      <h3>Pensja tygodniowa</h3><div class="stepper"><button class="btn" data-act="wage" data-arg="-1">−</button><b>${money(NEG.wage)}</b><button class="btn" data-act="wage" data-arg="1">+</button></div>
      <h3>Długość umowy</h3><div class="seg">${[1, 2, 3, 4, 5].map(y => `<button class="btn sm ${NEG.years === y ? 'on' : ''}" data-act="years" data-arg="${y}">${y} l.</button>`).join('')}</div>
      ${note ? `<p class="${note.cls}">${esc(note.t)}</p>` : ''}
      <div class="btns"><button class="btn pri sp" data-act="sendterms">Zaproponuj kontrakt</button></div><div class="btns"><button class="btn full" data-act="close">Anuluj</button></div>`);
  }
}
ACT.fee = d => { NEG.fee = Math.max(0, NEG.fee + +d * feeStep(NEG.fee)); renderNego(); };
ACT.wage = d => { NEG.wage = Math.max(500, NEG.wage + +d * (NEG.wage >= 50000 ? 5000 : NEG.wage >= 10000 ? 1000 : 250)); renderNego(); };
ACT.years = y => { NEG.years = +y; renderNego(); };
ACT.sendbid = () => {
  const p = pget(NEG.pid), r = clubResponse(p, NEG.fee);
  if (r.res === 'accept') { NEG.stage = 2; renderNego({ cls: 'good', t: r.msg }); }
  else if (r.res === 'counter') { NEG.counter = r.counter; renderNego({ cls: 'warn', t: r.msg }); }
  else renderNego({ cls: 'bad', t: r.msg });
};
ACT.acccounter = () => { NEG.fee = NEG.counter; NEG.counter = null; const r = clubResponse(pget(NEG.pid), NEG.fee); if (r.res === 'accept') { NEG.stage = 2; renderNego({ cls: 'good', t: r.msg }); } else renderNego({ cls: 'bad', t: r.msg }); };
ACT.sendterms = () => {
  const p = pget(NEG.pid);
  if (p.tid === -1) { const r = signFree(p.id, NEG.wage, NEG.years); if (r.ok) { closeModal(); toast(r.msg); render(); } else renderNego({ cls: 'bad', t: r.msg }); return; }
  const t = personalTerms(p, NEG.wage, NEG.years);
  if (!t.ok) return renderNego({ cls: 'bad', t: t.msg });
  const ut = userClub(); if (ut.players.length >= 32) return renderNego({ cls: 'bad', t: 'Kadra pełna (maks. 32).' });
  completeTransfer(p.id, NEG.fee, NEG.wage, NEG.years); closeModal(); toast(`${p.n} dołącza do klubu!`); render();
};

/* ---------- ROZGRYWKI ---------- */
function vComps() {
  const head = tabs([['league', 'Ligi'], ['euro', 'Puchary UEFA'], ['rank', 'Ranking UEFA'], ['nt', 'Reprezentacje'], ['hist', 'Historia']], UI.compTab, 'ctab');
  return head + ({ league: vLeague, euro: vEuro, rank: vRank, nt: vNT, hist: vHist })[UI.compTab]();
}
ACT.ctab = a => { UI.compTab = a; render(); };
function vLeague() {
  const ut = userClub();
  if (!UI.lg) { UI.lg = ut.lg; UI.cc = ut.cc; }
  const lg = S.leagues[UI.lg];
  const sel = `<div class="flt"><select data-change="cc">${Object.values(S.countries).map(c => `<option value="${c.code}" ${UI.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select>
    <select data-change="lg">${S.countries[UI.cc].leagues.map(id => `<option value="${id}" ${UI.lg === id ? 'selected' : ''}>${S.leagues[id].name}</option>`).join('')}</select></div>`;
  const sub = tabs([['table', 'Tabela'], ['fix', 'Kolejki'], ['scor', 'Strzelcy']], UI.lgTab, 'lgtab');
  let body = '';
  if (UI.lgTab === 'table') {
    const tb = table(UI.lg), n = tb.length;
    const promo = PROMO[lg.cc] || 0, hasLower = S.countries[lg.cc].leagues.length > 1;
    const rank = countryRanking().findIndex(r => r.cc === lg.cc);
    const clN = lg.tier === 1 ? (rank < 4 ? 4 : rank < 6 ? 3 : rank < 10 ? 2 : 1) : 0;
    body = `<div class="card list"><table><tr><th>#</th><th>Klub</th><th>M</th><th>Z</th><th>R</th><th>P</th><th>+/-</th><th>Pkt</th></tr>
      ${tb.map(r => { const c = club(r.id); let z = ''; if (lg.tier === 1 && r.pos <= clN) z = 'cl'; else if (lg.tier === 1 && hasLower && r.pos > n - promo) z = 'dn'; else if (lg.tier === 2 && r.pos <= promo) z = 'up'; return `<tr class="${r.id === ut.id ? 'me' : ''} ${z}" data-act="clubv" data-arg="${r.id}"><td>${r.pos}</td><td><span class="tn">${badge(c, 'sm')}${esc(c.name)}</span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`; }).join('')}</table></div>
      <small class="mut">${lg.tier === 1 ? `🔵 Liga Mistrzów (${clN} miejsc wg rankingu UEFA)` : ''}${lg.tier === 1 && hasLower ? ` • 🟥 spadek (${promo})` : ''}${lg.tier === 2 ? `🟩 awans (${promo})` : ''}</small>`;
  } else if (UI.lgTab === 'fix') {
    const R = lg.fix.length;
    if (UI.rnd == null || UI.rnd >= R) { const ls = curLs(); UI.rnd = Math.max(0, lg.lsMap.slice(0, ls + 1).filter(x => x >= 0).length - 1); }
    body = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="rnd" data-arg="-1">◀</button><b class="sp" style="text-align:center">Kolejka ${UI.rnd + 1}/${R}</b><button class="btn sm" data-act="rnd" data-arg="1">▶</button></div>
      <div class="card list">${lg.fix[UI.rnd].map(f => fxRow(club(f.h), club(f.a), f.p ? `${f.hg} : ${f.ag}` : '–', f.h === ut.id || f.a === ut.id)).join('')}</div>`;
  } else {
    body = `<div class="card list">${topScorers(UI.lg, 25).map((p, i) => `<div class="prow" data-act="info" data-arg="${p.id}"><span class="mini">${i + 1}.</span>${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${esc(club(p.tid).name)}</small></div><b>${p.lg}</b></div>`).join('') || '<small>Brak goli.</small>'}</div>`;
  }
  return sel + sub + body;
}
function fxRow(H, A, score, mine, extra) {
  return `<div class="rt ${mine ? 'mine' : ''}"><span class="tl">${badge(H, 'sm')}<span>${esc(H.name)}</span></span><b class="sc">${score}</b><span class="tr"><span>${esc(A.name)}</span>${badge(A, 'sm')}</span></div>${extra ? `<small class="mut ex">${extra}</small>` : ''}`;
}
CHG.cc = v => { UI.cc = v; UI.lg = S.countries[v].leagues[0]; UI.rnd = null; render(); };
CHG.lg = v => { UI.lg = v; UI.rnd = null; render(); };
ACT.lgtab = a => { UI.lgTab = a; render(); };
ACT.rnd = d => { UI.rnd = clamp(UI.rnd + +d, 0, S.leagues[UI.lg].fix.length - 1); render(); };
ACT.clubv = id => {
  const c = club(+id); const tb = table(c.lg).find(r => r.id === c.id);
  modal(`<h2>${badge(c)} ${esc(c.name)}</h2><small class="mut">${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • ${tb.pos}. miejsce • <span class="stars">${stars(c)}</span> • stadion ${c.cap.toLocaleString('pl-PL')}</small>
    <div class="kv"><div><span>Średnia kadry</span><b>${Math.round(teamLevel(c))}</b></div><div><span>Współczynnik UEFA</span><b>${clubCoef(c.id).toFixed(1)}</b></div></div>
    <div class="list">${c.players.slice().sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr).map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${p.age} l.</small></div>${ovrShow(p)}</div>`).join('')}</div>
    <div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
function vEuro() {
  const sel = tabs([['CL', '⭐ Liga Mistrzów'], ['EL', '🟠 Liga Europy'], ['ECL', '🟢 Konferencji']], UI.euro, 'euro');
  const c = S.euro[UI.euro]; if (!c) return sel;
  const sub = tabs([['lp', 'Faza ligowa'], ['games', 'Mecze'], ['ko', 'Faza pucharowa']], UI.euroTab, 'eutab');
  let body = '';
  if (UI.euroTab === 'lp') {
    body = `<div class="card list"><table><tr><th>#</th><th>Klub</th><th>M</th><th>+/-</th><th>Pkt</th></tr>${lpTable(c).map(r => { const cl = club(r.id); return `<tr class="${r.id === S.user ? 'me' : ''} ${r.pos <= 8 ? 'cl' : r.pos <= 24 ? 'up' : 'dn'}" data-act="clubv" data-arg="${r.id}"><td>${r.pos}</td><td><span class="tn">${badge(cl, 'sm')}${S.countries[cl.cc].flag} ${esc(cl.name)}</span></td><td>${r.P}</td><td>${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`; }).join('')}</table></div>
      <small class="mut">🔵 1–8: 1/8 finału • 🟩 9–24: baraże • 🟥 25–36: odpadają</small>`;
  } else if (UI.euroTab === 'games') {
    if (UI.md == null || UI.md >= c.lp.length) UI.md = Math.max(0, c.lp.findIndex(rd => rd.some(f => !f.p))); if (UI.md < 0) UI.md = c.lp.length - 1;
    body = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="md" data-arg="-1">◀</button><b class="sp" style="text-align:center">Kolejka ${UI.md + 1}/${c.lp.length}</b><button class="btn sm" data-act="md" data-arg="1">▶</button></div>
      <div class="card list">${c.lp[UI.md].map(f => fxRow(club(f.h), club(f.a), f.p ? `${f.hg} : ${f.ag}` : '–', f.h === S.user || f.a === S.user)).join('')}</div>`;
  } else {
    const st = ['PO', 'R16', 'QF', 'SF', 'F'].filter(s => c.ko[s]);
    body = st.length ? st.map(s => `<h3>${STAGE_NAME[s]}</h3><div class="card list">${c.ko[s].map(t => koRow(t, s === 'F')).join('')}</div>`).join('') : '<div class="card mut">Faza pucharowa rozpocznie się po fazie ligowej (luty).</div>';
    if (c.champion != null) body = `<div class="card hl"><b>🏆 Zwycięzca: ${esc(club(c.champion).name)}</b></div>` + body;
  }
  return sel + sub + body;
}
function koRow(t, single, nt) {
  const A = nt ? ntObj(t.a) : club(t.a), B = nt ? ntObj(t.b) : club(t.b);
  const mine = nt ? (t.a === S.nt || t.b === S.nt) : (t.a === S.user || t.b === S.user);
  let score = '–', ex = '';
  if (nt || single) { const m = nt ? t.m : t.m1; if (m) { score = `${m.hg} : ${m.ag}`; if (m.pens) ex = `karne ${m.pens.h}:${m.pens.a}`; } }
  else if (t.m1) {
    const aggA = t.m1.hg + (t.m2 ? t.m2.ag : 0), aggB = t.m1.ag + (t.m2 ? t.m2.hg : 0);
    score = `${aggA} : ${aggB}`; ex = `1. mecz ${t.m1.hg}:${t.m1.ag}${t.m2 ? ` • rewanż ${t.m2.ag}:${t.m2.hg}${t.m2.pens ? ` (k. ${t.m2.pens.a}:${t.m2.pens.h})` : t.m2.et ? ' pd.' : ''}` : ''}`;
  }
  const w = t.w != null ? (t.w === t.a ? ' ✔' : '') : '';
  return fxRow(A, B, score, mine, (ex ? ex : '') + (t.w != null ? ` • awans: ${esc((nt ? ntObj(t.w) : club(t.w)).name)}` : '')) + (w ? '' : '');
}
ACT.euro = a => { UI.euro = a; UI.md = null; render(); };
ACT.eutab = a => { UI.euroTab = a; render(); };
ACT.md = d => { UI.md = clamp(UI.md + +d, 0, S.euro[UI.euro].lp.length - 1); render(); };
function vRank() {
  const rk = countryRanking();
  const yrs = [0, 1, 2, 3, 4].map(i => `${String(S.season - 5 + i).slice(2)}/${String(S.season - 4 + i).slice(2)}`);
  const cur = S.cpts;
  const clubs = S.clubs.map(c => ({ c, v: clubCoef(c.id) })).sort((a, b) => b.v - a.v).slice(0, 40);
  return `<div class="card list"><h2>Ranking krajów (współczynnik UEFA)</h2><div class="scrollx"><table class="rank"><tr><th>#</th><th>Kraj</th>${yrs.map(y => `<th>${y}</th>`).join('')}<th>Bież.</th><th>Suma</th></tr>
    ${rk.map((r, i) => { const c = S.countries[r.cc], now = cur[r.cc] && cur[r.cc].n ? cur[r.cc].pts / cur[r.cc].n : 0; return `<tr class="${r.cc === userClub().cc ? 'me' : ''}"><td>${i + 1}</td><td>${c.flag} ${esc(c.name)}</td>${c.coef.map(v => `<td>${v.toFixed(2)}</td>`).join('')}<td class="good">${now.toFixed(2)}</td><td><b>${r.tot.toFixed(2)}</b></td></tr>`; }).join('')}</table></div>
    <small class="mut">Miejsca w Lidze Mistrzów: 1–4 → 4 kluby, 5–6 → 3, 7–10 → 2, dalej mistrz przez eliminacje. Dwa kraje z najlepszym wynikiem w ostatnim sezonie dostają dodatkowe miejsce (EPS).</small></div>
    <div class="card list"><h2>Ranking klubów (5 sezonów)</h2>${clubs.map((x, i) => `<div class="prow" data-act="clubv" data-arg="${x.c.id}"><span class="mini">${i + 1}.</span>${badge(x.c, 'sm')}<div class="pn">${esc(x.c.name)}<small>${S.countries[x.c.cc].flag} ${esc(S.leagues[x.c.lg].name)}</small></div><b>${x.v.toFixed(1)}</b></div>`).join('')}</div>`;
}
function vNT() {
  const nc = S.ntc; if (!nc) return '';
  let out = `<div class="card"><b>${nc.type === 'NLF' ? 'Liga Narodów' : nc.type === 'EURO' ? `Eliminacje do Mistrzostw Europy ${S.season + 1}` : `Eliminacje do Mistrzostw Świata ${S.season + 1}`}</b><br><small class="mut">${nc.type === 'NLF' ? 'Czterech najlepszych zwycięzców grup zagra w turnieju finałowym (czerwiec).' : 'Dwie najlepsze drużyny z każdej grupy awansują na turniej (czerwiec).'}</small></div>`;
  if (nc.tourn) {
    const T = nc.tourn;
    out += `<div class="card hl"><b>🌍 ${esc(T.name)}</b>${T.champion ? `<br>🏆 ${flag(T.champion)} ${esc(NAT[T.champion].name)}` : ''}</div>`;
    out += T.groups.map((g, gi) => ntGroupHtml(g, `Grupa ${'ABCDEFGH'[gi]}`)).join('');
    for (const st of ['R16', 'QF', 'SF', 'F']) if (T.ko[st]) out += `<h3>${STAGE_NAME[st]}</h3><div class="card list">${T.ko[st].map(t => koRow(t, true, true)).join('')}</div>`;
  }
  out += nc.groups.map((g, gi) => ntGroupHtml(g, `Grupa ${'ABCDEFGH'[gi]}`)).join('');
  return out;
}
function ntGroupHtml(g, title) {
  return `<div class="card list"><b>${title}</b><table><tr><th>#</th><th>Reprezentacja</th><th>M</th><th>+/-</th><th>Pkt</th></tr>${ntGroupTable(g).map(r => `<tr class="${r.id === S.nt ? 'me' : ''} ${r.pos <= 2 ? 'up' : ''}"><td>${r.pos}</td><td>${flag(r.id)} ${esc(NAT[r.id].name)}</td><td>${r.P}</td><td>${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`).join('')}</table></div>`;
}
function vHist() {
  const ut = userClub();
  return `<div class="card"><h2>Twoja kariera</h2>${S.history.length ? S.history.slice().reverse().map(h => `<div class="rt"><span>${SEASON_LABEL(h.season)} • ${esc(h.club)} • ${esc(S.leagues[h.lg].name)}</span><b>${h.pos}. ${h.achieved ? '✅' : '❌'}</b></div>`).join('') : '<small class="mut">Pierwszy sezon przed Tobą.</small>'}</div>
    <div class="card"><h2>Zwycięzcy pucharów UEFA</h2>${S.euroHist.length ? S.euroHist.slice().reverse().map(e => `<div class="msg"><b>${SEASON_LABEL(e.season)}</b><p>⭐ ${esc(club(e.CL).name)} • 🟠 ${esc(club(e.EL).name)} • 🟢 ${esc(club(e.ECL).name)}</p></div>`).join('') : '<small class="mut">Brak.</small>'}</div>
    <div class="card"><h2>Złota Piłka</h2>${S.awards.length ? S.awards.slice().reverse().map(a => `<div class="msg"><b>${SEASON_LABEL(a.season)}</b><p>🥇 ${esc(a.ballon[0].n)} (${esc(a.ballon[0].c)}) • 🥈 ${esc(a.ballon[1].n)} • 🥉 ${esc(a.ballon[2].n)}</p></div>`).join('') : '<small class="mut">Brak.</small>'}</div>
    <div class="card"><h2>Turnieje reprezentacji</h2>${S.ntHist.length ? S.ntHist.slice().reverse().map(h => `<div class="rt"><span>${esc(h.name)}</span><b>${flag(h.champ)} ${esc(NAT[h.champ].name)}</b></div>`).join('') : '<small class="mut">Brak.</small>'}</div>
    <div class="card"><h2>Mistrzowie lig</h2>${Object.entries(S.champs).map(([id, l]) => `<div class="rt"><span>${esc(S.leagues[id].name)}</span><small>${l.slice(-3).reverse().map(x => esc(club(x.c).short)).join(', ')}</small></div>`).join('') || '<small class="mut">Brak.</small>'}</div>`;
}

/* ---------- TRANSFERY ---------- */
function vMarket() {
  const ut = userClub();
  const head = tabs([['search', 'Szukaj'], ['short', `Obserwowani`], ['scout', 'Skauting'], ['offers', `Oferty${S.offers.length ? ' (' + S.offers.length + ')' : ''}`], ['news', 'Wieści']], UI.mkTab, 'mktab') +
    `<div class="card"><div class="row"><span>${windowText()}</span></div><div class="row mut" style="font-size:13px;margin-top:4px"><span>Budżet transferowy: <b class="good">${money(ut.tb)}</b></span><span class="sp"></span><span>Kadra: ${ut.players.length}/32</span></div></div>`;
  return head + ({ search: vSearch, short: vShort, scout: vScout, offers: vOffers, news: vNews })[UI.mkTab]();
}
ACT.mktab = a => { UI.mkTab = a; render(); };
function mkRow(p) {
  const c = clubOf(p);
  return `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${c ? esc(c.short) + ' ' + S.countries[c.cc].flag : p.tid === -1 ? 'wolny' : 'zagr.'} • ${p.age} l. • ${p.tid === -1 ? 'bez odstępnego' : money(p.val)}</small></div>${S.short.includes(p.id) ? '<span class="good">★</span>' : ''}${ovrShow(p)}</div>`;
}
function vSearch() {
  const f = UI.f;
  let list = PALL.filter(p => p.tid !== S.user && p.tid !== -2);
  if (f.cc === 'FREE') list = list.filter(p => p.tid === -1); else if (f.cc) list = list.filter(p => p.tid >= 0 && club(p.tid).cc === f.cc);
  if (f.pos) list = list.filter(p => p.pos === f.pos);
  if (f.age) list = list.filter(p => p.age <= f.age);
  if (f.price) list = list.filter(p => p.val <= f.price);
  if (f.ovr) list = list.filter(p => ovrRange(p)[1] >= f.ovr);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(p => p.n.toLowerCase().includes(q)); }
  const key = f.sort === 'pot' ? (p => know(p) >= 30 ? ovrRange(p, true)[1] : 0) : f.sort === 'val' ? (p => p.val) : f.sort === 'age' ? (p => -p.age) : ovrEst;
  list.sort((a, b) => key(b) - key(a));
  return `<div class="flt"><input placeholder="Szukaj nazwiska…" value="${esc(f.q)}" data-change="fq" style="flex:1 1 100%">
    <select data-change="fcc"><option value="">Wszystkie kraje</option><option value="FREE" ${f.cc === 'FREE' ? 'selected' : ''}>Wolni agenci</option>${Object.values(S.countries).map(c => `<option value="${c.code}" ${f.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select>
    <select data-change="fpos"><option value="">Pozycja</option>${POSITIONS.map(p => `<option value="${p}" ${f.pos === p ? 'selected' : ''}>${POS_PL[p]}</option>`).join('')}</select>
    <select data-change="fage"><option value="0">Wiek</option>${[19, 21, 23, 25, 28, 31].map(a => `<option value="${a}" ${f.age === a ? 'selected' : ''}>do ${a} l.</option>`).join('')}</select>
    <select data-change="fovr"><option value="0">Ogólna</option>${[60, 65, 70, 75, 80, 85].map(a => `<option value="${a}" ${f.ovr === a ? 'selected' : ''}>${a}+</option>`).join('')}</select>
    <select data-change="fprice"><option value="0">Cena</option>${[5e5, 1e6, 3e6, 1e7, 3e7, 8e7].map(v => `<option value="${v}" ${f.price === v ? 'selected' : ''}>do ${money(v)}</option>`).join('')}</select>
    <select data-change="fsort">${[['ovr', 'wg ogólnej'], ['pot', 'wg potencjału'], ['val', 'wg wartości'], ['age', 'najmłodsi']].map(([k, n]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <small class="mut">${list.length} zawodników. Zakresy ocen zawężają się dzięki skautingowi.</small>
    <div class="card list">${list.slice(0, 60).map(mkRow).join('') || '<small>Brak wyników.</small>'}</div>`;
}
for (const k of ['cc', 'pos', 'sort']) CHG['f' + k] = v => { UI.f[k] = v; render(); };
for (const k of ['age', 'ovr', 'price']) CHG['f' + k] = v => { UI.f[k] = +v; render(); };
CHG.fq = v => { UI.f.q = v; render(); };
function vShort() {
  const l = S.short.map(pget).filter(Boolean);
  return `<div class="card list">${l.map(mkRow).join('') || '<small class="mut">Dodaj zawodników do obserwowanych z ich karty (☆ Obserwuj).</small>'}</div>`;
}
function vScout() {
  const ut = userClub();
  return `<h3>Twoi skauci (${S.scouts.length}/5)</h3>${S.scouts.map(s => `<div class="card"><div class="row"><b class="sp">${esc(s.name)}</b><span class="pill">ocena ${s.ab}/20</span></div>
      <small class="mut">${money(s.cost)}/tydz. • ${s.task ? (s.task.k === 'player' ? `obserwuje: ${esc(pget(s.task.pid) ? pget(s.task.pid).n : '?')}` : `misja: ${scoutTaskText(s.task)} (${s.task.weeks} tyg.)`) : 'wolny'}</small>
      <div class="btns"><button class="btn sm pri" data-act="mission" data-arg="${s.id}">🌍 Misja skautingowa</button><button class="btn sm red" data-act="firescout" data-arg="${s.id}">Zwolnij</button></div></div>`).join('')}
    <h3>Raporty (${S.reports.length})</h3>
    <div class="card list">${S.reports.slice(0, 40).map(r => { const p = pget(r.pid); if (!p) return ''; return `<div class="prow" data-act="report" data-arg="${S.reports.indexOf(r)}"><span class="grade g${r.grade.replace('+', 'p')}">${r.grade}</span>${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${esc(clubName(p))} • ${p.age} l. • ocena ${r.eo}, pot. ${r.ep}</small></div>›</div>`; }).join('') || '<small class="mut">Brak raportów – wyślij skautów na misję.</small>'}</div>
    <h3>Rynek skautów</h3><div class="card list">${S.scoutMarket.map(s => `<div class="prow"><div class="pn">${esc(s.name)}<small>ocena ${s.ab}/20 • ${money(s.cost)}/tydz.</small></div><button class="btn sm" data-act="hirescout" data-arg="${s.id}">Zatrudnij</button></div>`).join('')}</div>`;
}
function scoutTaskText(t) { return [t.cc ? S.countries[t.cc].flag + ' ' + S.countries[t.cc].name : t.nat ? flag(t.nat) + ' ' + NAT[t.nat].name : 'cały świat', t.pos ? POS_PL[t.pos] : '', t.maxAge ? `do ${t.maxAge} l.` : '', t.minPot ? `pot. ${t.minPot}+` : ''].filter(Boolean).join(', '); }
let MISSION = null;
ACT.mission = sid => { MISSION = { sid: +sid, cc: '', nat: '', pos: '', maxAge: 0, minPot: 0, weeks: 4 }; renderMission(); };
function renderMission() {
  const m = MISSION;
  modal(`<h2>Misja skautingowa</h2>
    <div class="flt" style="flex-direction:column">
      <label>Liga / kraj<select data-change="mcc"><option value="">Cały świat</option>${Object.values(S.countries).map(c => `<option value="${c.code}" ${m.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select></label>
      <label>Narodowość<select data-change="mnat"><option value="">Dowolna</option>${NATIONS.map(n => `<option value="${n.code}" ${m.nat === n.code ? 'selected' : ''}>${n.flag} ${n.name}</option>`).join('')}</select></label>
      <label>Pozycja<select data-change="mpos"><option value="">Dowolna</option>${POSITIONS.map(p => `<option value="${p}" ${m.pos === p ? 'selected' : ''}>${POS_PL[p]}</option>`).join('')}</select></label>
      <label>Wiek<select data-change="mage"><option value="0">Dowolny</option>${[18, 19, 21, 23, 26, 29].map(a => `<option value="${a}" ${m.maxAge === a ? 'selected' : ''}>do ${a} lat</option>`).join('')}</select></label>
      <label>Min. potencjał<select data-change="mpot"><option value="0">Dowolny</option>${[65, 70, 75, 80, 85].map(a => `<option value="${a}" ${m.minPot === a ? 'selected' : ''}>${a}+</option>`).join('')}</select></label>
      <label>Czas trwania<select data-change="mweeks">${[2, 4, 8, 12].map(w => `<option value="${w}" ${m.weeks === w ? 'selected' : ''}>${w} tygodni</option>`).join('')}</select></label>
    </div><small class="mut">Co tydzień skaut przyśle 2–4 raporty o najciekawszych zawodnikach spełniających kryteria. Talenty (do 21 lat) oceniane są głównie po potencjale.</small>
    <div class="btns"><button class="btn pri sp" data-act="startmission">Wyślij</button><button class="btn" data-act="close">Anuluj</button></div>`);
}
CHG.mcc = v => { MISSION.cc = v; }; CHG.mnat = v => { MISSION.nat = v; }; CHG.mpos = v => { MISSION.pos = v; };
CHG.mage = v => { MISSION.maxAge = +v; }; CHG.mpot = v => { MISSION.minPot = +v; }; CHG.mweeks = v => { MISSION.weeks = +v; };
ACT.startmission = () => { const m = MISSION; assignScout(m.sid, { k: 'area', cc: m.cc, nat: m.nat, pos: m.pos, maxAge: m.maxAge, minPot: m.minPot, weeks: m.weeks }); closeModal(); toast('Skaut wyruszył na misję. Raporty co tydzień.'); render(); };
ACT.firescout = id => { if (confirm('Zwolnić skauta?')) { fireScout(+id); render(); } };
ACT.hirescout = id => { const r = hireScout(+id); toast(r.msg); render(); };
ACT.report = i => {
  const r = S.reports[+i], p = pget(r.pid);
  modal(`<h2>Raport skauta</h2><div class="row"><span class="grade g${r.grade.replace('+', 'p')}">${r.grade}</span><b class="sp">${esc(p.n)}</b>${posTag(p.pos)}</div>
    <small class="mut">${esc(r.scout)} • ${r.date ? fmtDate(r.date) : ''}</small>
    <div class="kv"><div><span>Ocena skauta</span>${ovrTag(r.eo)}</div><div><span>Potencjał</span>${ovrTag(r.ep)}</div><div><span>Wiek</span><b>${p.age}</b></div><div><span>Wartość</span><b>${money(p.val)}</b></div></div>
    <p>${esc(r.txt)}</p><div class="btns"><button class="btn pri sp" data-act="info" data-arg="${p.id}">Karta zawodnika</button><button class="btn" data-act="close">Zamknij</button></div>`);
};
function vOffers() {
  return S.offers.map(o => { const p = pget(o.pid), b = club(o.from); if (!p) return ''; return `<div class="card"><div class="row">${posTag(p.pos)}<b class="sp">${esc(p.n)}</b>${ovrTag(p.ovr)}</div>
    <div class="row" style="margin:8px 0">${badge(b, 'sm')}<span>${esc(b.name)} ${S.countries[b.cc].flag} oferuje <b class="good">${money(o.amount)}</b></span></div>
    <small class="mut">Wartość: ${money(p.val)} • morale zawodnika: ${moraleLabel(p.mor).join(' ')}</small>
    <div class="btns"><button class="btn pri sp" data-act="accept" data-arg="${o.id}">Akceptuj</button><button class="btn" data-act="decline" data-arg="${o.id}">Odrzuć</button></div></div>`; }).join('') || '<div class="card mut">Brak ofert. Wystaw zawodnika na sprzedaż w jego karcie – oferty przychodzą w oknie transferowym.</div>';
}
ACT.accept = id => { const r = sellTo(+id); toast(r.msg); render(); };
ACT.decline = id => { const o = S.offers.find(x => x.id === +id); if (o) { const p = pget(o.pid); if (p && o.amount > p.val * 1.3) p.mor = clamp(p.mor - 8, 0, 100); } S.offers = S.offers.filter(x => x.id !== +id); saveSoon(); render(); };
function vNews() { return `<div class="card">${S.news.map(n => `<div class="msg"><small>${n.d ? fmtDate(n.d) : ''}</small><p style="color:var(--txt)">${esc(n.t)}</p></div>`).join('') || '<small class="mut">Brak wieści.</small>'}</div>`; }

/* ---------- KLUB ---------- */
function vClub() {
  const head = tabs([['fin', 'Finanse'], ['fac', 'Obiekty'], ['nt', 'Reprezentacja'], ['game', 'Gra']], UI.clubTab, 'cltab');
  return head + ({ fin: vFin, fac: vFac, nt: vNTManage, game: vGame })[UI.clubTab]();
}
ACT.cltab = a => { UI.clubTab = a; render(); };
function vFin() {
  const ut = userClub(), lf = ut.lastFin, bill = sum(ut.players.map(p => p.wage)), sc = sum(S.scouts.map(s => s.cost));
  return `<div class="card"><h2>Finanse</h2>
    <div class="kv"><div><span>Saldo</span><b class="${ut.bal < 0 ? 'bad' : ''}">${money(ut.bal)}</b></div><div><span>Budżet transf.</span><b>${money(ut.tb)}</b></div>
    <div><span>Pensje/tydz.</span><b>${money(bill)}</b></div><div><span>Skauci/tydz.</span><b>${money(sc)}</b></div>
    <div><span>Sponsorzy/tydz.</span><b>${money(ut.spons)}</b></div><div><span>Prawa TV/tydz.</span><b>${money(ut.tv)}</b></div>
    <div><span>Stadion</span><b>${ut.cap.toLocaleString('pl-PL')}</b></div><div><span>Bilet</span><b>${Math.round(ut.price)} €</b></div>
    <div><span>Przychody (sezon)</span><b>${money(ut.fin.inc)}</b></div><div><span>Wydatki (sezon)</span><b>${money(ut.fin.exp)}</b></div>
    <div><span>Bilans transferów</span><b class="${ut.fin.tr < 0 ? 'bad' : 'good'}">${money(ut.fin.tr)}</b></div><div><span>Reputacja</span><b>${ut.rep}</b></div></div>
    ${lf ? `<small class="mut">Ostatni tydzień: bilety ${money(lf.gate)}, TV ${money(lf.tv)}, sponsorzy ${money(lf.spons)}, pensje ${money(lf.wages)} → <b class="${lf.net >= 0 ? 'good' : 'bad'}">${money(lf.net)}</b></small>` : ''}</div>
    <div class="card"><h2>Zarząd</h2>${bar(S.board.conf)}<small>Zaufanie ${Math.round(S.board.conf)}%. ${esc(S.board.text)}${S.board.euro ? ' Europa: ' + esc(S.board.euro) + '.' : ''}</small>
    <div class="kv"><div><span>Menedżer</span><b>${esc(S.manager)}</b></div><div><span>Reputacja menedżera</span><b>${Math.round(S.mrep)}</b></div></div></div>`;
}
function vFac() {
  const ut = userClub();
  const f = (k, n, d) => `<div class="card"><div class="row"><b class="sp">${n}</b><span class="stars">${'★'.repeat(S.fac[k])}${'☆'.repeat(5 - S.fac[k])}</span></div><small class="mut">${d}</small>
    <div class="btns">${S.fac[k] < 5 ? `<button class="btn sm pri" data-act="upfac" data-arg="${k}">Rozbuduj • ${money(FAC_COST(S.fac[k]))}</button>` : '<span class="pill g">Maksymalny poziom</span>'}</div></div>`;
  return f('train', 'Ośrodek treningowy', 'Przyspiesza rozwój zawodników.') + f('youth', 'Akademia młodzieżowa', 'Więcej i zdolniejszych wychowanków co sezon.') +
    `<div class="card"><h2>Stadion</h2><small class="mut">${ut.cap.toLocaleString('pl-PL')} miejsc • średnia cena biletu ${Math.round(ut.price)} €</small></div>`;
}
ACT.upfac = k => { const r = upgradeFacility(k); toast(r.msg); render(); };
function vNTManage() {
  if (!S.nt) return `<div class="card"><h2>Reprezentacja</h2><small class="mut">Możesz jednocześnie prowadzić klub i reprezentację. Wybierz kadrę narodową:</small></div>
    <div class="card list">${NATIONS.slice().sort((a, b) => b.str - a.str).map(n => `<div class="prow"><span style="font-size:20px">${n.flag}</span><div class="pn">${esc(n.name)}<small>${n.conf} • siła ${n.str}</small></div><button class="btn sm" data-act="takent" data-arg="${n.code}">Obejmij</button></div>`).join('')}</div>`;
  const st = S.ntTeams[S.nt], n = NAT[S.nt];
  const sq = st.sq.map(pget).filter(Boolean).sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);
  const pool = (NATIDX.get(S.nt) || []).filter(p => !st.sq.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 40);
  const g = S.ntc.groups.find(g => g.teams.includes(S.nt));
  return `<div class="card hl"><div class="row"><span style="font-size:30px">${n.flag}</span><div class="sp"><b>${esc(n.name)}</b><br><small class="mut">Selekcjoner • siła ${n.str}</small></div><button class="btn sm red" data-act="leavent">Zrezygnuj</button></div></div>
    ${g ? ntGroupHtml(g, 'Twoja grupa') : ''}
    <div class="row"><h3 class="sp">Powołani (${sq.length}/26)</h3><button class="btn sm" data-act="autocall">Auto-powołania</button></div>
    <div class="card list">${sq.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${esc(clubName(p))} ${stTag(p)}</small></div>${morale(p)}${ovrTag(p.ovr)}<button class="info" data-act="uncall" data-arg="${p.id}">✕</button></div>`).join('')}</div>
    <h3>Do powołania</h3><div class="card list">${pool.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${esc(clubName(p))} • ${p.age} l. ${stTag(p)}</small></div>${ovrTag(p.ovr)}<button class="info" data-act="call" data-arg="${p.id}">+</button></div>`).join('')}</div>
    <small class="mut">Skład i taktykę reprezentacji ustawisz w zakładce Skład → Reprezentacja.</small>`;
}
ACT.takent = c => { setNT(c); toast(`Zostałeś selekcjonerem: ${NAT[c].name}!`); msg('Reprezentacja', `Objąłeś reprezentację: ${NAT[c].name}.`); render(); };
ACT.leavent = () => { if (confirm('Zrezygnować z prowadzenia reprezentacji?')) { setNT(null); UI.nt = false; render(); } };
ACT.autocall = () => { S.ntTeams[S.nt].sq = autoCallup(S.nt); saveSoon(); render(); };
ACT.call = id => { const st = S.ntTeams[S.nt]; if (st.sq.length >= 26) return toast('Maksymalnie 26 powołanych.'); st.sq.push(+id); saveSoon(); render(); };
ACT.uncall = id => { const st = S.ntTeams[S.nt]; st.sq = st.sq.filter(x => x !== +id); saveSoon(); render(); };
function vGame() {
  return `<div class="card"><h2>Zapis gry</h2><small class="mut">Gra zapisuje się automatycznie w pamięci urządzenia.</small>
    <div class="btns"><button class="btn sp" data-act="savegame">💾 Zapisz teraz</button><button class="btn" data-act="export">⬇️ Eksportuj</button><label class="btn">⬆️ Importuj<input type="file" accept=".json" data-change="import" hidden></label></div></div>
    <div class="card"><h2>Szybkość meczu</h2><div class="seg">${[1, 2, 4, 8].map(s => `<button class="btn sm ${S.settings.speed === s ? 'on' : ''}" data-act="defspeed" data-arg="${s}">x${s}</button>`).join('')}</div></div>
    <div class="card"><h2>Nowa kariera</h2><div class="btns"><button class="btn red full" data-act="newgame">Rozpocznij od nowa</button></div></div>`;
}
ACT.savegame = async () => { await saveNow(); toast('Zapisano grę.'); };
ACT.defspeed = s => { S.settings.speed = +s; saveSoon(); render(); };
ACT.newgame = async () => { if (confirm('Rozpocząć nową karierę? Obecny zapis zostanie usunięty.')) { await deleteSave(); location.reload(); } };
ACT.export = () => {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kariera_${S.season}_${userClub().short}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
CHG.import = (v, el) => {
  const f = el.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = async () => { try { const s = JSON.parse(r.result); if (s.v !== 2) throw 0; useSave(s); await saveNow(); toast('Wczytano zapis.'); render(); } catch (e) { toast('Nieprawidłowy plik zapisu.'); } };
  r.readAsText(f);
};

/* ---------- MECZ ---------- */
let M = null, MX = null, MT = null, MS = { speed: 2, paused: true, over: false };
const SPEED_MS = { 1: 600, 2: 280, 4: 120, 8: 40 };
const uside = () => MX.user === 'h' ? M.home : M.away;
ACT.prematch = () => {
  MX = userMatchToday(); if (!MX) return;
  const mine = MX.user === 'h' ? MX.h : MX.a, opp = MX.user === 'h' ? MX.a : MX.h;
  const msgs = fixLineup(mine, MX.nt ? null : emergencyFor(mine)); if (MX.nt) syncNT(mine);
  const sl = mine.lineup.map(pget), tired = sl.filter(p => p.fit < 65);
  modal(`<h2>Przed meczem</h2><small class="mut">${esc(MX.opts.label)}</small>
    <div class="fixture"><div class="tm">${badge(MX.h, 'lg')}<span>${esc(MX.h.name)}</span></div><div class="vs">vs</div><div class="tm">${badge(MX.a, 'lg')}<span>${esc(MX.a.name)}</span></div></div>
    <div class="kv"><div><span>Formacja</span><b>${mine.formation}</b></div><div><span>Średnia XI</span><b>${lineupAvg(mine)}</b></div><div><span>Rywal (śr.)</span><b>${Math.round(avg(opp.players.map(p => p.ovr).sort((a, b) => b - a).slice(0, 11)))}</b></div><div><span>Rywal – forma</span><b>${opp.nation ? '–' : table(opp.lg).find(r => r.id === opp.id).form.slice(-5).join('') || '–'}</b></div></div>
    <h3>Mentalność</h3><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn sm ${(mine.ment || 'bal') === k ? 'on' : ''}" data-act="prement" data-arg="${k}">${v}</button>`).join('')}</div>
    ${msgs.length ? `<p class="warn">${msgs.map(esc).join('<br>')}</p>` : ''}
    ${tired.length ? `<p class="warn">😮‍💨 Zmęczeni: ${tired.map(p => esc(lastName(p)) + ' ' + Math.round(p.fit) + '%').join(', ')}</p>` : ''}
    <div class="btns"><button class="btn pri sp" data-act="startmatch">▶ Rozpocznij</button><button class="btn" data-act="quicksim">⏩ Symuluj</button></div>
    <div class="btns"><button class="btn full" data-act="goteam">Zmień skład</button></div>`);
};
ACT.goteam = () => { closeModal(); UI.tab = 'squad'; UI.sqTab = 'pitch'; UI.nt = !!(MX && MX.nt); render(); };
ACT.prement = k => { const mine = MX.user === 'h' ? MX.h : MX.a; mine.ment = k; if (MX.nt) syncNT(mine); saveSoon(); document.querySelectorAll('#modal .seg button').forEach(b => b.classList.toggle('on', b.dataset.arg === k)); };
ACT.quicksim = () => {
  closeModal(); MX = userMatchToday(); if (!MX) return;
  M = createMatch(MX.h, MX.a, { ...MX.opts, user: MX.user, quick: true }); while (!M.over) step(M);
  showResult();
};
ACT.startmatch = () => {
  closeModal(); MX = userMatchToday(); if (!MX) return;
  M = createMatch(MX.h, MX.a, { ...MX.opts, user: MX.user });
  MS = { speed: S.settings.speed || 2, paused: false, over: false };
  const el = $('#match'); el.classList.remove('hidden');
  el.innerHTML = `<div class="sb"><small class="lbl">${esc(MX.opts.label)}</small><div class="teams"><div class="tm">${badge(M.home.t, 'lg')}<span>${esc(M.home.t.name)}</span></div><div><div class="score" id="msc">0 : 0</div><div class="min" id="mmin">0'</div></div><div class="tm">${badge(M.away.t, 'lg')}<span>${esc(M.away.t.name)}</span></div></div><div class="scr" id="mscr"></div></div>
    <div class="mstats" id="mst"></div><div class="feed" id="mfeed"></div><div class="ctl" id="mctl"></div>`;
  ev(M, 'info', null, '📣 Sędzia gwiżdże – zaczynamy!');
  upd(); mctl(); MT = setTimeout(tick, SPEED_MS[MS.speed]);
};
function tick() {
  if (MS.paused || MS.over) return;
  const r = step(M); upd();
  if (r === 'ft') { MS.over = true; mctl(); return; }
  if (r === 'ht' || r === 'et') { MS.paused = true; mctl(); toast(r === 'ht' ? 'Przerwa – zmiany i taktyka.' : 'Dogrywka!'); return; }
  if ((M.alert === 'red' || M.alert === 'injury') && M.ev[M.ev.length - 1].side === MX.user) { MS.paused = true; mctl(); toast(M.alert === 'red' ? 'Czerwona kartka!' : 'Kontuzja!'); return; }
  MT = setTimeout(tick, SPEED_MS[MS.speed] * (M.alert === 'goal' ? 2.5 : 1));
}
function upd() {
  $('#msc').textContent = `${M.home.goals} : ${M.away.goals}`;
  $('#mmin').textContent = M.over ? (M.pens ? `k. ${M.pens.h}:${M.pens.a}` : 'Koniec') : MS.paused && M.minute === 45 ? 'Przerwa' : `${M.minute}'`;
  $('#mscr').innerHTML = `<span>${M.home.scorers.map(s => `${esc(s.name)} ${s.min}'`).join(', ')}</span><span>${M.away.scorers.map(s => `${esc(s.name)} ${s.min}'`).join(', ')}</span>`;
  const H = M.home, A = M.away, tp = H.poss + A.poss || 1, hp = Math.round(H.poss / tp * 100);
  const st = (l, a, b) => { const t = (a + b) || 1; return `<div class="st"><b>${a}</b><div><small>${l}</small><div class="l"><i style="width:${a / t * 100}%;background:${H.t.col[0]}"></i><i style="width:${b / t * 100}%;background:${A.t.col[0]};opacity:.75"></i></div></div><b>${b}</b></div>`; };
  $('#mst').innerHTML = st('Posiadanie %', hp, 100 - hp) + st('Strzały', H.shots, A.shots) + st('Celne', H.sot, A.sot) + st('Rożne', H.corners, A.corners);
  $('#mfeed').innerHTML = M.ev.slice().reverse().map(e => `<div class="fe ${e.type}"><span class="mn">${e.min}'</span><span>${esc(e.text)}</span></div>`).join('');
}
function mctl() {
  const c = $('#mctl'); if (!c) return;
  if (MS.over) { c.innerHTML = `<button class="btn pri full" data-act="matchdone">Podsumowanie meczu</button>`; return; }
  c.innerHTML = `<button class="btn ${MS.paused ? 'pri' : ''}" data-act="mpause">${MS.paused ? '▶ Graj' : '⏸ Pauza'}</button>${[1, 2, 4, 8].map(s => `<button class="btn ${MS.speed === s ? 'on' : ''}" data-act="mspeed" data-arg="${s}">x${s}</button>`).join('')}
    <button class="btn" data-act="mtactic">🎯 Taktyka</button><button class="btn" data-act="msubs">🔁 Zmiany ${uside().subs}/${MAX_SUBS}</button><button class="btn" data-act="mskip">⏭ Koniec</button>`;
}
ACT.mpause = () => { MS.paused = !MS.paused; mctl(); upd(); if (!MS.paused) { clearTimeout(MT); MT = setTimeout(tick, 50); } };
ACT.mspeed = a => { MS.speed = +a; S.settings.speed = +a; mctl(); };
ACT.mskip = () => { clearTimeout(MT); MS.paused = true; while (!M.over) step(M); MS.over = true; upd(); mctl(); };
ACT.mtactic = () => { MS.paused = true; mctl(); const s = uside(); modal(`<h2>Taktyka</h2><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn ${s.ment === k ? 'on' : ''}" data-act="mment" data-arg="${k}">${v}</button>`).join('')}</div><div class="btns"><button class="btn full" data-act="close">Wróć do meczu</button></div>`); };
ACT.mment = k => { uside().ment = k; M.dirty = true; ev(M, 'info', uside(), `📋 ${uside().t.name}: mentalność ${MENT[k].toLowerCase()}.`); upd(); closeModal(); };
let subOut = null;
ACT.msubs = () => { MS.paused = true; mctl(); subOut = null; renderSubs(); };
function renderSubs() {
  const s = uside();
  modal(`<h2>Zmiany (${s.subs}/${MAX_SUBS})</h2><small class="mut">${subOut ? 'Wybierz zawodnika z ławki.' : 'Wybierz zawodnika, który zejdzie.'}</small>
    <h3>Na boisku</h3>${s.pitch.map(x => `<div class="prow ${subOut === x.p ? 'sel' : ''}" data-act="subout" data-arg="${x.p.id}"><span class="pos ${LINE[x.pos]}">${POS_PL[x.pos]}</span><div class="pn">${esc(x.p.n)}</div><div class="fitb">${bar(Math.round(fitNow(s, x, M.minute)))}</div>${ovrTag(x.ov)}</div>`).join('')}
    <h3>Ławka</h3>${s.bench.map(p => `<div class="prow" data-act="subin" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}</div><div class="fitb">${bar(p.fit)}</div>${ovrTag(p.ovr)}</div>`).join('') || '<small>Pusta</small>'}
    <div class="btns"><button class="btn full" data-act="close">Wróć do meczu</button></div>`);
}
ACT.subout = id => { subOut = uside().pitch.find(x => x.p.id === +id).p; renderSubs(); };
ACT.subin = id => { const s = uside(); if (!subOut) return toast('Najpierw wybierz zawodnika schodzącego.'); if (s.subs >= MAX_SUBS) return toast('Wykorzystano wszystkie zmiany.'); substitute(M, s, subOut, pget(+id)); subOut = null; upd(); mctl(); renderSubs(); };
ACT.matchdone = () => showResult();
function showResult() {
  const H = M.home, A = M.away, mine = uside();
  const opp = mine === H ? A : H;
  const sc = side => side.scorers.map(g => `${g.name} ${g.min}'${g.pen ? ' (k)' : ''}`).join(', ') || '—';
  const recs = Object.values(mine.rec).sort((a, b) => b.rating - a.rating);
  const won = M.winner ? M.winner === MX.user : mine.goals > opp.goals, draw = !M.winner && mine.goals === opp.goals;
  $('#match').classList.add('hidden');
  modal(`<h2>${won ? '🎉 Zwycięstwo!' : draw ? '🤝 Remis' : '😞 Porażka'}</h2><small class="mut">${esc(MX.opts.label)}</small>
    <div class="fixture"><div class="tm">${badge(H.t, 'lg')}<span>${esc(H.t.name)}</span></div><div class="vs" style="color:var(--txt)">${H.goals} : ${A.goals}${M.pens ? `<small style="display:block;font-size:13px">k. ${M.pens.h}:${M.pens.a}</small>` : M.et ? '<small style="display:block;font-size:13px">po dogrywce</small>' : ''}</div><div class="tm">${badge(A.t, 'lg')}<span>${esc(A.t.name)}</span></div></div>
    <small>⚽ ${esc(H.t.short)}: ${esc(sc(H))}<br>⚽ ${esc(A.t.short)}: ${esc(sc(A))}</small>
    <div class="kv"><div><span>Posiadanie</span><b>${Math.round(H.poss / ((H.poss + A.poss) || 1) * 100)}–${100 - Math.round(H.poss / ((H.poss + A.poss) || 1) * 100)}%</b></div><div><span>Strzały</span><b>${H.shots}–${A.shots}</b></div></div>
    <div class="row"><span>⭐ Zawodnik meczu:</span><b class="sp">${esc(M.motm.p.n)}</b><span class="ovr o1">${M.motm.rating.toFixed(1)}</span></div>
    <h3>Oceny</h3>${recs.map(r => `<div class="rt"><span>${posTag(r.pos)} ${esc(shortName(r.p))} ${r.g ? '⚽'.repeat(r.g) : ''}${r.a ? '🅰️'.repeat(r.a) : ''}${r.y && !r.r ? '🟨' : ''}${r.r ? '🟥' : ''}</span><b class="${r.rating >= 7.5 ? 'good' : r.rating < 5.5 ? 'bad' : ''}">${r.rating.toFixed(1)}</b></div>`).join('')}
    <div class="btns"><button class="btn pri full" data-act="finishday">Dalej</button></div>`, true);
}
ACT.finishday = () => {
  const m = M, x = MX; M = null; closeModal();
  const day = curDay();
  const r = processDay(m);
  const label = x.opts.label.split(' • ')[0];
  let res = '';
  if (day.t === 'L') { const lg = S.leagues[x.h.lg || userClub().lg]; const rd = lg.fix[lg.lsMap[day.ls]] || []; res = rd.map(f => fxRow(club(f.h), club(f.a), `${f.hg} : ${f.ag}`, f.h === S.user || f.a === S.user)).join(''); }
  else if (day.t === 'E') { const c = Object.values(S.euro).find(c => c.name === label || label.includes(c.name)); if (c) res = day.st === 'LP' ? c.lp[day.md].map(f => fxRow(club(f.h), club(f.a), `${f.hg} : ${f.ag}`, f.h === S.user || f.a === S.user)).join('') : (c.ko[day.st] || []).map(t => koRow(t, day.st === 'F')).join(''); }
  else if (day.t === 'N' || day.t === 'T') { res = ''; }
  saveNow(); render();
  if (r.summary) return showSummary(r.summary);
  if (S.sacked) return showSacked();
  if (res) modal(`<h2>Wyniki: ${esc(label)}</h2><div class="card list">${res}</div><div class="btns"><button class="btn pri full" data-act="close">OK</button></div>`);
};
function showSummary(s) {
  modal(`<h2>🏁 ${esc(s.title)}</h2>${s.lines.map(l => `<p>${esc(l)}</p>`).join('')}<div class="btns"><button class="btn pri full" data-act="aftersum">Nowy sezon</button></div>`, true);
}
ACT.aftersum = () => { closeModal(); if (S.sacked) return showSacked(); render(); };
function showSacked() {
  const offers = jobOffers();
  modal(`<h2>📄 Zostałeś zwolniony</h2><p>Zarząd stracił cierpliwość. Oferty pracy:</p>
    ${offers.map(c => `<button class="club" data-act="takeover" data-arg="${c.id}">${badge(c)}<div class="sp"><b>${esc(c.name)}</b><br><small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • <span class="stars">${stars(c)}</span></small></div></button>`).join('')}`, true);
}
ACT.takeover = id => { closeModal(); takeOver(+id); UI.tab = 'home'; UI.lg = null; render(); };

/* ---------- EKRAN STARTOWY ---------- */
const ST = { cc: 'POL', lg: 'POL1', club: null, nt: '' };
function showStart(hasSaveGame) {
  $('#app').classList.add('hidden'); $('#start').classList.remove('hidden');
  const lg = S.leagues[ST.lg];
  const clubs = lg.clubs.map(club).sort((a, b) => b.rep - a.rep);
  $('#start').innerHTML = `<div class="in"><div class="logo">⚽</div><h1>Kariera Menedżera</h1><p class="mut">27 lig • 456 klubów • Liga Mistrzów, Liga Europy, Liga Konferencji • reprezentacje • skauting</p>
    ${hasSaveGame ? `<button class="btn pri full" data-act="continue" style="margin-bottom:14px">▶ Kontynuuj karierę</button>` : ''}
    <h3>Nowa kariera</h3>
    <input id="mname" placeholder="Imię i nazwisko menedżera" maxlength="28" style="width:100%;margin-bottom:10px" value="${esc(S.manager || '')}">
    <div class="flt"><select data-change="stcc">${Object.values(S.countries).map(c => `<option value="${c.code}" ${ST.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select>
    <select data-change="stlg">${S.countries[ST.cc].leagues.map(id => `<option value="${id}" ${ST.lg === id ? 'selected' : ''}>${S.leagues[id].name}</option>`).join('')}</select></div>
    ${clubs.map(c => `<button class="club ${ST.club === c.id ? 'on' : ''}" data-act="stclub" data-arg="${c.id}">${badge(c)}<div class="sp"><b>${esc(c.name)}</b><br><small>Budżet: ${money(c.tb)} • średnia ${Math.round(teamLevel(c))}</small></div><span class="stars">${stars(c)}</span></button>`).join('')}
    <h3>Reprezentacja (opcjonalnie)</h3>
    <select data-change="stnt" style="width:100%"><option value="">Bez reprezentacji</option>${NATIONS.slice().sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(n => `<option value="${n.code}" ${ST.nt === n.code ? 'selected' : ''}>${n.flag} ${n.name}</option>`).join('')}</select>
    <button class="btn pri full" data-act="begin" style="position:sticky;bottom:10px;margin-top:14px" ${ST.club == null ? 'disabled' : ''}>Rozpocznij karierę</button></div>`;
}
const keepName = () => { const el = $('#mname'); if (el) S.manager = el.value; };
CHG.stcc = v => { keepName(); ST.cc = v; ST.lg = S.countries[v].leagues[0]; ST.club = null; showStart(START_SAVE); };
CHG.stlg = v => { keepName(); ST.lg = v; ST.club = null; showStart(START_SAVE); };
CHG.stnt = v => { ST.nt = v; };
ACT.stclub = id => { keepName(); ST.club = +id; const y = window.scrollY; showStart(START_SAVE); window.scrollTo(0, y); };
ACT.begin = () => {
  if (ST.club == null) return;
  const n = ($('#mname').value || '').trim() || 'Menedżer';
  startCareer(n, ST.club, ST.nt || null); enterApp();
};
let START_SAVE = null;
ACT.continue = () => { useSave(START_SAVE); enterApp(); if (S.sacked) showSacked(); };
function enterApp() { $('#start').classList.add('hidden'); $('#app').classList.remove('hidden'); UI.tab = 'home'; render(); window.scrollTo(0, 0); }

/* ---------- start ---------- */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.arg, el); });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el.value, el); });
(async () => {
  busy(true, 'Tworzenie świata…');
  await new Promise(r => setTimeout(r, 30));
  START_SAVE = await loadSave();
  if (START_SAVE && START_SAVE.v !== 2) START_SAVE = null;
  createWorld();
  busy(false);
  showStart(!!START_SAVE);
})();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
