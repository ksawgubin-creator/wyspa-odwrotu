'use strict';
/* ============================================================
   KARIERA MENEDŻERA – interfejs
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = { tab: 'home', leagueTab: 'table', leagueDiv: null, round: null, tfTab: 'search', sel: null, flt: { pos: '', sort: 'ovr', max: 0, young: false } };
const ACT = {};

/* ---------- drobne helpery ---------- */
function badge(t, cls = '') { return `<span class="badge ${cls}" style="background:${t.col[0]};color:${t.col[1]}">${esc(t.short)}</span>`; }
const ovrCls = o => o >= 75 ? 'o1' : o >= 65 ? 'o2' : o >= 55 ? 'o3' : o >= 47 ? 'o4' : 'o5';
const ovrTag = o => `<span class="ovr ${ovrCls(o)}">${o}</span>`;
const posTag = p => `<span class="pos ${p}">${POS_PL[p]}</span>`;
const stars = t => { const n = clamp(Math.round((t.level - 44) / 6), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.classList.remove('hidden'); m.onclick = e => { if (e.target === m && !m.dataset.lock) closeModal(); }; }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; delete m.dataset.lock; }
const fitBar = f => `<div class="bar ${f < 50 ? 'b' : f < 75 ? 'w' : ''} fitb"><i style="width:${f}%"></i></div>`;
function stTag(p) { return p.inj ? `<span class="pill r">🚑 ${p.inj} tyg.</span>` : p.susp ? `<span class="pill r">🟥 zaw. ${p.susp}</span>` : ''; }
const season = () => `${S.season}/${String(S.season + 1).slice(2)}`;
const formArrow = f => f >= 65 ? '<span class="good">▲</span>' : f <= 38 ? '<span class="bad">▼</span>' : '<span class="mut">●</span>';

/* ---------- render główny ---------- */
function render() {
  const ut = userTeam();
  $('#top').innerHTML = `${badge(ut)}<div class="tt"><b>${esc(ut.name)}</b><small>${DIV_NAMES[ut.div]} • ${season()} • kolejka ${Math.min(S.round + 1, ROUNDS)}/${ROUNDS}</small></div>
    <div class="money">${money(ut.bal)}<small style="display:block;font-weight:400" class="${windowOpen() ? 'good' : 'mut'}">${windowOpen() ? '🟢 okno otwarte' : '🔒 okno zamknięte'}</small></div>`;
  const unread = S.inbox.filter(m => !m.read).length + S.offers.length;
  const tabs = [['home', '🏠', 'Pulpit'], ['squad', '👕', 'Skład'], ['league', '🏆', 'Liga'], ['transfers', '💸', 'Transfery'], ['club', '🏟️', 'Klub']];
  $('#nav').innerHTML = tabs.map(([k, i, n]) => `<button class="${UI.tab === k ? 'on' : ''}" data-act="tab" data-arg="${k}"><i>${i}</i>${n}${k === 'home' && unread ? `<span class="dot">${unread}</span>` : ''}${k === 'transfers' && S.offers.length ? `<span class="dot">${S.offers.length}</span>` : ''}</button>`).join('');
  $('#view').innerHTML = ({ home: viewHome, squad: viewSquad, league: viewLeague, transfers: viewTransfers, club: viewClub })[UI.tab]();
}
ACT.tab = a => { UI.tab = a; UI.sel = null; render(); window.scrollTo(0, 0); };

/* ---------- PULPIT ---------- */
function viewHome() {
  const ut = userTeam(), f = userFixture(), home = f.h === ut.id, opp = team(home ? f.a : f.h);
  const tb = table(ut.div), row = tb.find(r => r.id === ut.id);
  const injured = ut.players.filter(p => p.inj || p.susp);
  const conf = S.board.conf;
  const msgs = S.inbox.slice(0, 4);
  return `
  <div class="card hl">
    <div class="row"><small>Następny mecz • ${DIV_NAMES[ut.div]}</small><span class="sp"></span><span class="pill">${home ? '🏠 Dom' : '✈️ Wyjazd'}</span></div>
    <div class="fixture">
      <div class="tm">${badge(home ? ut : opp, 'lg')}<span>${esc((home ? ut : opp).name)}</span></div>
      <div class="vs">vs</div>
      <div class="tm">${badge(home ? opp : ut, 'lg')}<span>${esc((home ? opp : ut).name)}</span></div>
    </div>
    <div class="row mut" style="font-size:13px;justify-content:center;gap:16px">
      <span>Rywal: ${tablePos(opp)}. miejsce</span><span>Klasa ${stars(opp)}</span>
    </div>
    <div class="btns"><button class="btn pri sp" data-act="prematch">⚽ Zagraj mecz</button><button class="btn" data-act="quicksim">⏩ Symuluj</button></div>
  </div>
  <div class="card">
    <div class="row"><b>${row.pos}. miejsce</b><span class="sp"></span><span class="mut">${row.Pts} pkt • ${row.W}-${row.D}-${row.L} • ${row.GF}:${row.GA}</span></div>
    <div class="row" style="margin-top:8px"><small>Forma</small><div class="chips">${row.form.slice(-5).map(c => `<span class="chip ${c}">${c === 'W' ? 'Z' : c === 'D' ? 'R' : 'P'}</span>`).join('') || '<small>brak meczów</small>'}</div></div>
  </div>
  <div class="card">
    <div class="row"><b>Zarząd</b><span class="sp"></span><span class="${conf > 55 ? 'good' : conf > 30 ? 'warn' : 'bad'}">${conf > 70 ? 'Zadowolony' : conf > 45 ? 'Zadowolony umiarkowanie' : conf > 25 ? 'Niezadowolony' : 'Na krawędzi zwolnienia!'}</span></div>
    <div class="bar ${conf > 45 ? '' : conf > 25 ? 'w' : 'b'}" style="margin:8px 0"><i style="width:${conf}%"></i></div>
    <small>${esc(S.board.text)}</small>
  </div>
  ${injured.length ? `<div class="card"><b>Niedostępni</b>${injured.map(p => `<div class="row" style="margin-top:6px">${posTag(p.pos)}<span class="sp">${esc(p.name)}</span>${stTag(p)}</div>`).join('')}</div>` : ''}
  <div class="card">
    <div class="row"><b>Skrzynka</b><span class="sp"></span><button class="btn sm" data-act="inbox">Wszystkie</button></div>
    ${msgs.map(m => `<div class="msg ${m.read ? '' : 'new'}"><b>${esc(m.title)}</b><p>${esc(m.body)}</p></div>`).join('')}
  </div>`;
}
ACT.inbox = () => {
  S.inbox.forEach(m => m.read = true); save();
  modal(`<h2>Skrzynka</h2>${S.inbox.map(m => `<div class="msg"><b>${esc(m.title)}</b><small>${m.season}/${String(m.season + 1).slice(2)} • kolejka ${m.round}</small><p>${esc(m.body)}</p></div>`).join('')}<div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
  render();
};
ACT.close = () => closeModal();

/* ---------- SKŁAD ---------- */
function viewSquad() {
  const ut = userTeam(); fixLineup(ut);
  const groups = slotGroups(ut.formation);
  const sl = ut.lineup.map((id, i) => ({ p: PM.get(id), g: groups[i] }));
  const rows = g => sl.filter(s => s.g === g);
  const slot = s => `<div class="slot ${UI.sel === s.p.id ? 'sel' : ''}" data-act="tap" data-arg="${s.p.id}">
      ${s.p.inj || s.p.susp ? '<span class="fl">⚠️</span>' : ''}${ovrTag(s.p.ovr)}<div class="nm">${esc(lastName(s.p))}</div><div class="pp">${POS_PL[s.p.pos]}${s.p.pos !== s.g ? ' ⚠' : ''}</div></div>`;
  const inL = new Set(ut.lineup), inB = new Set(ut.bench);
  const bench = ut.bench.map(id => PM.get(id));
  const reserves = ut.players.filter(p => !inL.has(p.id) && !inB.has(p.id)).sort((a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos) || b.ovr - a.ovr);
  const avg = Math.round(sl.reduce((s, x) => s + x.p.ovr, 0) / 11);
  const prow = p => `<div class="prow ${UI.sel === p.id ? 'sel' : ''} ${isAvail(p) ? '' : 'out'}" data-act="tap" data-arg="${p.id}">
      ${posTag(p.pos)}<div class="pn">${esc(p.name)}<small>${NATS[p.nat].flag} ${stTag(p)} ${p.con <= 1 ? '<span class="pill y">kontrakt</span>' : ''} ${p.listed ? '<span class="pill">na sprzedaż</span>' : ''}</small></div>
      <span class="age">${p.age}</span>${formArrow(p.form)}${fitBar(p.fit)}${ovrTag(p.ovr)}<button class="info" data-act="info" data-arg="${p.id}">i</button></div>`;
  return `
  <div class="flt">
    <select data-change="formation">${Object.keys(FORMATIONS).map(f => `<option ${f === ut.formation ? 'selected' : ''}>${f}</option>`).join('')}</select>
    <select data-change="ment">${Object.entries(MENT).map(([k, v]) => `<option value="${k}" ${k === (ut.ment || 'bal') ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="btn sm" data-act="autopick">Auto</button>
  </div>
  <div class="row" style="margin-bottom:8px"><small>Średnia jedenastki: <b>${avg}</b></small><span class="sp"></span><small>${UI.sel ? 'Wybierz drugiego zawodnika, aby zamienić' : 'Dotknij zawodnika, potem drugiego, aby zamienić'}</small></div>
  <div class="pitch">
    <div class="pl">${rows('ATT').map(slot).join('')}</div>
    <div class="pl">${rows('MID').map(slot).join('')}</div>
    <div class="pl">${rows('DEF').map(slot).join('')}</div>
    <div class="pl">${rows('GK').map(slot).join('')}</div>
  </div>
  <h3>Ławka (${bench.length})</h3>
  <div class="bench">${bench.map(p => `<div class="slot ${UI.sel === p.id ? 'sel' : ''}" data-act="tap" data-arg="${p.id}">${ovrTag(p.ovr)}<div class="nm">${esc(lastName(p))}</div><div class="pp mut">${POS_PL[p.pos]}</div></div>`).join('')}</div>
  <h3>Rezerwa (${reserves.length})</h3>
  <div class="card" style="padding:4px 8px">${reserves.map(prow).join('') || '<small>Brak</small>'}</div>
  <h3>Wszyscy zawodnicy (${ut.players.length})</h3>
  <div class="card" style="padding:4px 8px">${ut.players.slice().sort((a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos) || b.ovr - a.ovr).map(prow).join('')}</div>`;
}
ACT.tap = id => {
  id = +id; const ut = userTeam();
  if (UI.sel == null) { UI.sel = id; return render(); }
  if (UI.sel === id) { UI.sel = null; return render(); }
  const a = UI.sel, b = id; UI.sel = null;
  const ia = ut.lineup.indexOf(a), ib = ut.lineup.indexOf(b);
  const pa = PM.get(a), pb = PM.get(b);
  if ((ia < 0 && !isAvail(pa) && ib >= 0) || (ib < 0 && !isAvail(pb) && ia >= 0)) { toast('Ten zawodnik jest niedostępny (kontuzja/zawieszenie).'); return render(); }
  if (ia >= 0 && ib >= 0) { ut.lineup[ia] = b; ut.lineup[ib] = a; }
  else if (ia >= 0 || ib >= 0) {
    const inId = ia >= 0 ? b : a, outId = ia >= 0 ? a : b, idx = ia >= 0 ? ia : ib;
    ut.lineup[idx] = inId;
    const bi = ut.bench.indexOf(inId);
    if (bi >= 0) ut.bench[bi] = outId; else if (ut.bench.length < 7) ut.bench.push(outId);
  } else {
    const ba = ut.bench.indexOf(a), bb = ut.bench.indexOf(b);
    if (ba >= 0 && bb >= 0) { ut.bench[ba] = b; ut.bench[bb] = a; }
    else if (ba >= 0) ut.bench[ba] = b; else if (bb >= 0) ut.bench[bb] = a;
  }
  save(); render();
};
ACT.autopick = () => { autoPick(userTeam()); UI.sel = null; save(); render(); toast('Skład wybrany automatycznie.'); };
const CHG = {};
CHG.formation = v => { userTeam().formation = v; autoPick(userTeam(), v); save(); render(); };
CHG.ment = v => { userTeam().ment = v; save(); };

/* szczegóły zawodnika */
ACT.info = id => {
  const p = PM.get(+id), ut = userTeam(), mine = p.tid === ut.id;
  const avgR = p.apps ? (p.rs / p.apps).toFixed(2) : '-';
  let actions = '';
  if (mine) {
    actions = `<h3>Kontrakt</h3><div class="btns">${[1, 2, 3, 4].map(y => `<button class="btn sm" data-act="renew" data-arg="${p.id}:${y}">${y} ${y === 1 ? 'rok' : 'lata'} • ${money(renewCost(p, y))}/tyg.</button>`).join('')}</div>
      <div class="btns"><button class="btn sm ${p.listed ? 'pri' : ''}" data-act="list" data-arg="${p.id}">${p.listed ? '✔ Na liście transferowej' : 'Wystaw na listę transferową'}</button>
      <button class="btn sm red" data-act="release" data-arg="${p.id}">Rozwiąż kontrakt (${money(p.wage * 15 * p.con)})</button></div>`;
  } else if (p.tid === -1) {
    actions = `<div class="btns"><button class="btn pri full" data-act="signfree" data-arg="${p.id}">Podpisz kontrakt • ${money(Math.round(calcWage(p) * 0.9 / 50) * 50)}/tyg.</button></div>`;
  } else {
    const ask = askPrice(p);
    actions = `<h3>Oferta transferowa • budżet ${money(ut.tb)}</h3><div class="btns">${[0.85, 1, 1.15, 1.3].map(m => { const v = Math.round(p.val * m / 10000) * 10000; return `<button class="btn sm" data-act="bid" data-arg="${p.id}:${v}">${money(v)}</button>`; }).join('')}</div><small>Wartość rynkowa: ${money(p.val)} • oczekiwania klubu ok. ${money(ask)}.</small>`;
  }
  modal(`<h2>${NATS[p.nat].flag} ${esc(p.name)} ${stTag(p)}</h2>
    <div class="row">${posTag(p.pos)}<span class="mut">${p.tid >= 0 ? esc(team(p.tid).name) : 'Wolny agent'}</span></div>
    <div class="kv">
      <div><span>Ogólna</span>${ovrTag(p.ovr)}</div><div><span>Potencjał</span>${ovrTag(p.pot)}</div>
      <div><span>Wiek</span><b>${p.age}</b></div><div><span>Forma</span><b>${p.form}</b></div>
      <div><span>Kondycja</span><b>${Math.round(p.fit)}%</b></div><div><span>Kontrakt</span><b>${p.con} ${p.con === 1 ? 'rok' : 'lata'}</b></div>
      <div><span>Wartość</span><b>${money(p.val)}</b></div><div><span>Pensja</span><b>${money(p.wage)}/tyg.</b></div>
      <div><span>Mecze (sezon)</span><b>${p.apps}</b></div><div><span>Gole / asysty</span><b>${p.g} / ${p.a}</b></div>
      <div><span>Śr. ocena</span><b>${avgR}</b></div><div><span>Kariera</span><b>${p.cap} m., ${p.cg} g.</b></div>
    </div>${actions}<div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
ACT.renew = a => { const [id, y] = a.split(':').map(Number); const r = renewContract(id, y); toast(r.msg); ACT.info(id); render(); };
ACT.list = id => { const p = PM.get(+id); p.listed = !p.listed; save(); toast(p.listed ? 'Wystawiono na listę – czekaj na oferty.' : 'Wycofano z listy.'); ACT.info(id); render(); };
ACT.release = id => { if (!confirm('Rozwiązać kontrakt?')) return; const r = releasePlayer(+id); toast(r.msg); if (r.ok) closeModal(); render(); };
ACT.bid = a => { const [id, v] = a.split(':').map(Number); const r = makeBid(id, v); toast(r.msg); if (r.ok) closeModal(); render(); };
ACT.signfree = id => { const r = signFree(+id); toast(r.msg); if (r.ok) closeModal(); render(); };

/* ---------- LIGA ---------- */
function viewLeague() {
  const ut = userTeam();
  if (UI.leagueDiv == null) UI.leagueDiv = ut.div;
  const d = UI.leagueDiv;
  const head = `<div class="tabs"><button class="${d === 0 ? 'on' : ''}" data-act="ldiv" data-arg="0">Ekstraliga</button><button class="${d === 1 ? 'on' : ''}" data-act="ldiv" data-arg="1">Liga Pierwsza</button></div>
    <div class="tabs">${[['table', 'Tabela'], ['fix', 'Kolejki'], ['scorers', 'Strzelcy'], ['mine', 'Moje mecze']].map(([k, n]) => `<button class="${UI.leagueTab === k ? 'on' : ''}" data-act="ltab" data-arg="${k}">${n}</button>`).join('')}</div>`;
  let body = '';
  if (UI.leagueTab === 'table') {
    const tb = table(d);
    body = `<div class="card" style="padding:6px 8px"><table><tr><th>#</th><th>Klub</th><th>M</th><th>Z</th><th>R</th><th>P</th><th>Bramki</th><th>Pkt</th></tr>
      ${tb.map(r => { const t = team(r.id); const cls = (r.id === ut.id ? 'me ' : '') + (d === 1 && r.pos <= 3 ? 'up' : d === 0 && r.pos >= 14 ? 'dn' : ''); return `<tr class="${cls}"><td>${r.pos}</td><td><span class="tn">${badge(t, 'sm')}${esc(t.name)}</span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}:${r.GA}</td><td><b>${r.Pts}</b></td></tr>`; }).join('')}</table></div>
      <small>${d === 1 ? '🟩 Miejsca 1–3: awans do Ekstraligi' : '🟥 Miejsca 14–16: spadek do Ligi Pierwszej'}</small>`;
  } else if (UI.leagueTab === 'fix') {
    const maxR = Math.min(S.round, ROUNDS - 1);
    if (UI.round == null) UI.round = maxR;
    const rd = S.fix[d][UI.round];
    body = `<div class="row" style="margin-bottom:10px"><button class="btn sm" data-act="rnd" data-arg="-1">◀</button><b class="sp" style="text-align:center">Kolejka ${UI.round + 1}</b><button class="btn sm" data-act="rnd" data-arg="1">▶</button></div>
      <div class="card" style="padding:4px 10px">${rd.map(fxRow).join('')}</div>`;
  } else if (UI.leagueTab === 'scorers') {
    body = `<div class="card" style="padding:4px 8px">${topScorers(d, 20).map((p, i) => `<div class="prow"><span class="age">${i + 1}</span>${posTag(p.pos)}<div class="pn">${esc(p.name)}<small>${esc(team(p.tid).name)}</small></div><b>${p.g}</b><small style="width:50px;text-align:right">${p.a} as.</small></div>`).join('') || '<small>Brak goli.</small>'}</div>`;
  } else {
    const list = S.fix[ut.div].map((rd, i) => ({ f: rd.find(f => f.h === ut.id || f.a === ut.id), i }));
    body = `<div class="card" style="padding:4px 10px">${list.map(({ f, i }) => fxRow(f, i + 1)).join('')}</div>`;
  }
  return head + body;
}
function fxRow(f, n) {
  const ut = userTeam(), H = team(f.h), A = team(f.a), mine = f.h === ut.id || f.a === ut.id;
  return `<div class="rt" style="${mine ? 'background:#16324a;border-radius:8px;padding:6px' : ''}">${n ? `<span class="mut" style="width:26px">${n}.</span>` : ''}<span style="flex:1;display:flex;gap:6px;align-items:center">${badge(H, 'sm')}${esc(H.short)}</span><b style="min-width:60px;text-align:center">${f.played ? f.hg + ' : ' + f.ag : '–'}</b><span style="flex:1;display:flex;gap:6px;align-items:center;justify-content:flex-end">${esc(A.short)}${badge(A, 'sm')}</span></div>`;
}
ACT.ldiv = a => { UI.leagueDiv = +a; render(); };
ACT.ltab = a => { UI.leagueTab = a; render(); };
ACT.rnd = a => { UI.round = clamp((UI.round == null ? S.round : UI.round) + +a, 0, ROUNDS - 1); render(); };

/* ---------- TRANSFERY ---------- */
function viewTransfers() {
  const ut = userTeam();
  const tabs = `<div class="tabs">${[['search', 'Szukaj'], ['free', 'Wolni agenci'], ['offers', `Oferty${S.offers.length ? ' (' + S.offers.length + ')' : ''}`]].map(([k, n]) => `<button class="${UI.tfTab === k ? 'on' : ''}" data-act="tftab" data-arg="${k}">${n}</button>`).join('')}</div>
  <div class="card"><div class="row"><span>${windowText()}</span><span class="sp"></span></div><div class="row mut" style="font-size:13px;margin-top:4px"><span>Budżet transferowy: <b class="good">${money(ut.tb)}</b></span><span class="sp"></span><span>Saldo: ${money(ut.bal)}</span></div></div>`;
  if (UI.tfTab === 'offers') {
    return tabs + (S.offers.map(o => { const p = PM.get(o.pid), b = team(o.from); return `<div class="card"><div class="row">${posTag(p.pos)}<b class="sp">${esc(p.name)}</b>${ovrTag(p.ovr)}</div><div class="row" style="margin:8px 0">${badge(b, 'sm')}<span>${esc(b.name)} oferuje <b class="good">${money(o.amount)}</b></span></div><small>Wartość: ${money(p.val)} • oferta ważna do kolejki ${o.exp + 1}</small><div class="btns"><button class="btn pri sp" data-act="accept" data-arg="${o.id}">Akceptuj</button><button class="btn" data-act="decline" data-arg="${o.id}">Odrzuć</button></div></div>`; }).join('') || '<div class="card mut">Brak ofert. Wystaw zawodnika na listę transferową (karta zawodnika → „i”) lub poczekaj na zainteresowanie.</div>');
  }
  let list;
  if (UI.tfTab === 'free') list = S.free.slice();
  else list = S.teams.filter(t => t.id !== ut.id).flatMap(t => t.players);
  const f = UI.flt;
  if (f.pos) list = list.filter(p => p.pos === f.pos);
  if (f.max) list = list.filter(p => p.val <= f.max);
  if (f.young) list = list.filter(p => p.age <= 23);
  list.sort((a, b) => f.sort === 'age' ? a.age - b.age : f.sort === 'val' ? b.val - a.val : f.sort === 'pot' ? b.pot - a.pot : b.ovr - a.ovr);
  const flt = `<div class="flt">
    <select data-change="fpos"><option value="">Wszystkie pozycje</option>${POS.map(p => `<option value="${p}" ${f.pos === p ? 'selected' : ''}>${POS_PL[p]}</option>`).join('')}</select>
    <select data-change="fmax"><option value="0">Dowolna cena</option>${[250000, 500000, 1000000, 2500000, 5000000].map(v => `<option value="${v}" ${f.max === v ? 'selected' : ''}>do ${money(v)}</option>`).join('')}</select>
    <select data-change="fsort">${[['ovr', 'wg ogólnej'], ['pot', 'wg potencjału'], ['val', 'wg wartości'], ['age', 'wg wieku']].map(([k, n]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <button class="btn sm ${f.young ? 'pri' : ''}" data-act="fyoung">≤23 lat</button></div>`;
  return tabs + flt + `<div class="card" style="padding:4px 8px">${list.slice(0, 40).map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.name)}<small>${NATS[p.nat].flag} ${p.tid >= 0 ? esc(team(p.tid).short) : 'wolny'} • ${p.age} l. • pot ${p.pot}</small></div>${ovrTag(p.ovr)}<span style="width:74px;text-align:right;font-size:12px">${p.tid >= 0 ? money(askPrice(p)) : 'za darmo'}</span></div>`).join('') || '<small>Brak wyników.</small>'}</div>`;
}
ACT.tftab = a => { UI.tfTab = a; render(); };
ACT.fyoung = () => { UI.flt.young = !UI.flt.young; render(); };
CHG.fpos = v => { UI.flt.pos = v; render(); };
CHG.fmax = v => { UI.flt.max = +v; render(); };
CHG.fsort = v => { UI.flt.sort = v; render(); };
ACT.accept = id => { const o = S.offers.find(x => x.id === +id); if (!o) return; const r = sellTo(o.pid, o.from, o.amount); S.offers = S.offers.filter(x => x !== o); toast(r.msg); render(); };
ACT.decline = id => { S.offers = S.offers.filter(x => x.id !== +id); save(); render(); };

/* ---------- KLUB ---------- */
function viewClub() {
  const ut = userTeam(), lf = ut.lastFin;
  const bill = ut.players.reduce((s, p) => s + p.wage, 0);
  return `
  <div class="card"><h2>Finanse</h2>
    <div class="kv"><div><span>Saldo</span><b class="${ut.bal < 0 ? 'bad' : ''}">${money(ut.bal)}</b></div><div><span>Budżet transf.</span><b>${money(ut.tb)}</b></div>
    <div><span>Pensje/tydz.</span><b>${money(bill)}</b></div><div><span>Sponsorzy/tydz.</span><b>${money(ut.spons)}</b></div>
    <div><span>Prawa TV/tydz.</span><b>${money(ut.tv)}</b></div><div><span>Stadion</span><b>${ut.cap.toLocaleString('pl-PL')} m.</b></div></div>
    ${lf ? `<small>Ostatnia kolejka: wpływy ${money(lf.gate + lf.tv + lf.spons)} (bilety ${money(lf.gate)}), wydatki ${money(lf.wages)}, wynik <b class="${lf.net >= 0 ? 'good' : 'bad'}">${money(lf.net)}</b></small>` : ''}
  </div>
  <div class="card"><h2>Trening</h2>
    <select data-change="training" style="width:100%">${Object.entries(TRAINING).map(([k, v]) => `<option value="${k}" ${ut.training === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <small style="display:block;margin-top:6px">Młodzi zawodnicy rozwijają się szybciej; wybrany profil przyspiesza rozwój odpowiednich formacji.</small>
  </div>
  <div class="card"><h2>Menedżer: ${esc(S.manager)}</h2>
    <div class="kv"><div><span>Reputacja klubu</span><b>${ut.rep}</b></div><div><span>Klasa kadry</span><b class="stars">${stars(ut)}</b></div><div><span>Zaufanie zarządu</span><b>${Math.round(S.board.conf)}%</b></div><div><span>Kadra</span><b>${ut.players.length}</b></div></div>
    <small>${esc(S.board.text)}</small>
  </div>
  <div class="card"><h2>Historia</h2>${S.history.length ? S.history.slice().reverse().map(h => `<div class="rt"><span>${h.season}/${String(h.season + 1).slice(2)} • ${DIV_NAMES[h.div]}</span><b>${h.pos}. m. ${h.achieved ? '✅' : '❌'}</b></div><small>Mistrz: ${esc(h.champ)} • Król strzelców: ${esc(h.scorer)}</small>`).join('') : '<small>Pierwszy sezon przed Tobą.</small>'}</div>
  <div class="card"><h2>Gra</h2>
    <div class="btns"><button class="btn sp" data-act="savegame">💾 Zapisz</button><button class="btn red" data-act="newgame">Nowa kariera</button></div>
    <small style="display:block;margin-top:8px">Gra zapisuje się automatycznie po każdej kolejce (w przeglądarce).</small></div>`;
}
CHG.training = v => { userTeam().training = v; save(); };
ACT.savegame = () => { save(); toast('Zapisano grę.'); };
ACT.newgame = () => { if (confirm('Rozpocząć nową karierę? Obecny zapis zostanie usunięty.')) { deleteSave(); location.reload(); } };

/* ---------- MECZ ---------- */
let M = null, MT = null, MS = { speed: 2, paused: true, over: false, quick: false };
const SPEED_MS = { 1: 600, 2: 280, 4: 120, 8: 45 };
function userSide() { return M.home.t.id === S.user ? M.home : M.away; }

ACT.prematch = () => {
  const ut = userTeam(); const msgs = fixLineup(ut);
  const f = userFixture(), home = f.h === ut.id, opp = team(home ? f.a : f.h);
  const sl = ut.lineup.map(id => PM.get(id)); const avg = Math.round(sl.reduce((s, p) => s + p.ovr, 0) / 11);
  const tired = sl.filter(p => p.fit < 65);
  modal(`<h2>Przed meczem</h2>
    <div class="row">${badge(home ? ut : opp)}<b class="sp" style="text-align:center">${esc(ut.short)} – ${esc(opp.short)}</b>${badge(home ? opp : ut)}</div>
    <div class="kv"><div><span>Formacja</span><b>${ut.formation}</b></div><div><span>Średnia XI</span><b>${avg}</b></div></div>
    <h3>Mentalność</h3>
    <div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn sm ${(ut.ment || 'bal') === k ? 'on' : ''}" data-act="setment" data-arg="${k}">${v}</button>`).join('')}</div>
    ${msgs.length ? `<p class="warn" style="font-size:13px">${msgs.map(esc).join('<br>')}</p>` : ''}
    ${tired.length ? `<p class="warn" style="font-size:13px">😮‍💨 Zmęczeni: ${tired.map(p => esc(lastName(p)) + ' ' + Math.round(p.fit) + '%').join(', ')}</p>` : ''}
    <div class="btns"><button class="btn pri sp" data-act="startmatch">▶ Rozpocznij mecz</button></div>
    <div class="btns"><button class="btn sp" data-act="close" data-go="squad">Zmień skład</button><button class="btn" data-act="quicksim">⏩ Symuluj</button></div>`);
  $('#modal').querySelector('[data-go]').onclick = () => { closeModal(); ACT.tab('squad'); };
  render();
};
ACT.setment = k => { userTeam().ment = k; save(); document.querySelectorAll('#modal .seg button').forEach(b => b.classList.toggle('on', b.dataset.arg === k)); };
ACT.quicksim = () => {
  closeModal(); const ut = userTeam(), f = userFixture();
  M = quickSim(team(f.h), team(f.a)); MS = { speed: 2, paused: true, over: true, quick: true };
  showMatchResult();
};
ACT.startmatch = () => {
  closeModal(); const f = userFixture();
  M = createMatch(team(f.h), team(f.a), false);
  MS = { speed: S.settings.speed || 2, paused: false, over: false, quick: false };
  const el = $('#match'); el.classList.remove('hidden');
  el.innerHTML = `
  <div class="sb"><div class="teams"><div class="tm">${badge(M.home.t, 'lg')}<span>${esc(M.home.t.name)}</span></div><div><div class="score" id="msc">0 : 0</div><div class="min" id="mmin">0'</div></div><div class="tm">${badge(M.away.t, 'lg')}<span>${esc(M.away.t.name)}</span></div></div></div>
  <div class="mstats" id="mst"></div><div class="feed" id="mfeed"></div>
  <div class="ctl" id="mctl"></div>`;
  ev(M, 'info', null, '📣 Sędzia gwiżdże – zaczynamy mecz!');
  updateMatch(); mctl(); MT = setTimeout(tick, SPEED_MS[MS.speed]);
};
function tick() {
  if (MS.paused || MS.over) return;
  const r = step(M);
  updateMatch();
  if (r === 'ft') { MS.over = true; mctl(); return; }
  if (r === 'ht') { MS.paused = true; mctl(); toast('Przerwa – możesz zmienić taktykę i dokonać zmian.'); return; }
  if (M.alert === 'red' || M.alert === 'injury') { if (M.alert && userSide().pitch) { MS.paused = true; mctl(); toast(M.alert === 'red' ? 'Czerwona kartka!' : 'Kontuzja!'); return; } }
  MT = setTimeout(tick, SPEED_MS[MS.speed] * (M.alert === 'goal' ? 2.2 : 1));
}
function updateMatch() {
  $('#msc').textContent = `${M.home.goals} : ${M.away.goals}`;
  $('#mmin').textContent = M.over ? 'Koniec' : M.minute === 45 && MS.paused ? 'Przerwa' : `${M.minute}'`;
  const H = M.home, A = M.away, tp = H.poss + A.poss || 1, hp = Math.round(H.poss / tp * 100);
  const st = (l, a, b) => { const t = (a + b) || 1; return `<div class="st"><b>${a}</b><div class="l"><i style="width:${a / t * 100}%;background:${H.t.col[0]}"></i><i style="width:${b / t * 100}%;background:${A.t.col[0]};opacity:.7"></i></div><b>${b}</b></div><div style="text-align:center;margin-top:-2px" class="mut"><small>${l}</small></div>`; };
  $('#mst').innerHTML = st('Posiadanie piłki %', hp, 100 - hp) + st('Strzały', H.shots, A.shots) + st('Celne', H.sot, A.sot);
  $('#mfeed').innerHTML = M.ev.slice().reverse().map(e => `<div class="fe ${e.type}"><span class="mn">${e.min}'</span><span>${esc(e.text)}</span></div>`).join('');
}
function mctl() {
  const c = $('#mctl'); if (!c) return;
  if (MS.over) { c.innerHTML = `<button class="btn pri full" data-act="matchdone">Zobacz podsumowanie</button>`; return; }
  c.innerHTML = `<button class="btn ${MS.paused ? 'pri' : ''}" data-act="mpause">${MS.paused ? '▶ Wznów' : '⏸ Pauza'}</button>
    ${[1, 2, 4, 8].map(s => `<button class="btn ${MS.speed === s ? 'on' : ''}" data-act="mspeed" data-arg="${s}">x${s}</button>`).join('')}
    <button class="btn" data-act="mtactic">🎯 Taktyka</button><button class="btn" data-act="msubs">🔁 Zmiany ${userSide().subs}/${MAX_SUBS}</button><button class="btn" data-act="mskip">⏭ Do końca</button>`;
}
ACT.mpause = () => { MS.paused = !MS.paused; mctl(); updateMatch(); if (!MS.paused) { clearTimeout(MT); MT = setTimeout(tick, 50); } };
ACT.mspeed = a => { MS.speed = +a; S.settings.speed = +a; mctl(); };
ACT.mskip = () => { clearTimeout(MT); MS.paused = true; while (!M.over) step(M); MS.over = true; updateMatch(); mctl(); };
ACT.mtactic = () => {
  MS.paused = true; mctl(); const s = userSide();
  modal(`<h2>Taktyka</h2><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn ${s.ment === k ? 'on' : ''}" data-act="mment" data-arg="${k}">${v}</button>`).join('')}</div>
    <small style="display:block;margin-top:8px">Ofensywna: więcej szans, ale też więcej strat. Defensywna: mniej ryzyka kosztem ataku.</small><div class="btns"><button class="btn full" data-act="close">Wróć do meczu</button></div>`);
};
ACT.mment = k => { userSide().ment = k; M.dirty = true; userTeam().ment = k; ev(M, 'info', userSide(), `📋 ${userTeam().name} zmienia mentalność na: ${MENT[k].toLowerCase()}.`); updateMatch(); closeModal(); };
let subOut = null;
ACT.msubs = () => { MS.paused = true; mctl(); subOut = null; renderSubs(); };
function renderSubs() {
  const s = userSide();
  modal(`<h2>Zmiany (${s.subs}/${MAX_SUBS})</h2><small>${subOut ? 'Wybierz zawodnika z ławki, który wejdzie.' : 'Wybierz zawodnika, który zejdzie.'}</small>
    <h3>Na boisku</h3>${s.pitch.map(x => `<div class="prow ${subOut === x.p ? 'sel' : ''}" data-act="subout" data-arg="${x.p.id}">${posTag(x.p.pos)}<div class="pn">${esc(x.p.name)}</div>${fitBar(Math.max(0, x.p.fit - (M.minute - s.rec[x.p.id].on) * 0.24))}${ovrTag(x.p.ovr)}</div>`).join('')}
    <h3>Ławka</h3>${s.bench.map(p => `<div class="prow" data-act="subin" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.name)}</div>${fitBar(p.fit)}${ovrTag(p.ovr)}</div>`).join('') || '<small>Pusta</small>'}
    <div class="btns"><button class="btn full" data-act="close">Wróć do meczu</button></div>`);
}
ACT.subout = id => { subOut = userSide().pitch.find(x => x.p.id === +id).p; renderSubs(); };
ACT.subin = id => {
  const s = userSide(); if (!subOut) { toast('Najpierw wybierz zawodnika, który zejdzie.'); return; }
  if (s.subs >= MAX_SUBS) { toast('Wykorzystano wszystkie zmiany.'); return; }
  substitute(M, s, subOut, PM.get(+id)); subOut = null; updateMatch(); mctl(); renderSubs();
};
ACT.matchdone = () => showMatchResult();
function showMatchResult() {
  const ut = userTeam(), H = M.home, A = M.away, mine = userSide();
  const sc = side => side.scorers.map(g => `${g.name} ${g.min}'${g.pen ? ' (k)' : ''}`).join(', ') || '—';
  const recs = Object.values(mine.rec).sort((a, b) => b.rating - a.rating);
  const win = mine.goals > (mine === H ? A : H).goals, draw = H.goals === A.goals;
  $('#match').classList.add('hidden');
  const m = $('#modal'); m.dataset.lock = '1';
  modal(`<h2>${win ? '🎉 Zwycięstwo!' : draw ? '🤝 Remis' : '😞 Porażka'}</h2>
    <div class="fixture"><div class="tm">${badge(H.t, 'lg')}<span>${esc(H.t.name)}</span></div><div class="vs" style="color:var(--txt)">${H.goals} : ${A.goals}</div><div class="tm">${badge(A.t, 'lg')}<span>${esc(A.t.name)}</span></div></div>
    <small>⚽ ${esc(H.t.short)}: ${esc(sc(H))}<br>⚽ ${esc(A.t.short)}: ${esc(sc(A))}</small>
    <div class="kv"><div><span>Posiadanie</span><b>${Math.round(H.poss / ((H.poss + A.poss) || 1) * 100)}% – ${100 - Math.round(H.poss / ((H.poss + A.poss) || 1) * 100)}%</b></div><div><span>Strzały</span><b>${H.shots} – ${A.shots}</b></div></div>
    <div class="row"><span>⭐ Zawodnik meczu:</span><b class="sp">${esc(M.motm.p.name)}</b>${ovrTag(Math.round(M.motm.rating * 10) / 10)}</div>
    <h3>Oceny Twoich zawodników</h3>${recs.map(r => `<div class="rt"><span>${posTag(r.p.pos)} ${esc(shortName(r.p))} ${r.g ? '⚽'.repeat(r.g) : ''}${r.y && !r.r ? '🟨' : ''}${r.r ? '🟥' : ''}</span><b class="${r.rating >= 7.5 ? 'good' : r.rating < 5.5 ? 'bad' : ''}">${r.rating.toFixed(1)}</b></div>`).join('')}
    <div class="btns"><button class="btn pri full" data-act="finishround">Dalej</button></div>`);
}
ACT.finishround = () => {
  const mm = M; M = null; closeModal(); delete $('#modal').dataset.lock;
  const res = playRound(mm);
  UI.round = null; UI.sel = null;
  const ut = userTeam();
  const rows = res.results.map(f => fxRow({ ...f, played: true })).join('');
  render();
  modal(`<h2>Kolejka ${res.round} – wyniki</h2><div class="card" style="padding:4px 10px">${rows}</div>
    ${res.injured.length ? `<p class="bad" style="font-size:13px">${res.injured.map(esc).join('<br>')}</p>` : ''}
    <div class="btns"><button class="btn pri full" data-act="afterround">OK</button></div>`);
  $('#modal').dataset.lock = '1';
  $('#modal').dataset.summary = res.summary ? JSON.stringify(res.summary) : '';
};
ACT.afterround = () => {
  const m = $('#modal'), sum = m.dataset.summary; delete m.dataset.lock; closeModal();
  if (sum) {
    const s = JSON.parse(sum);
    modal(`<h2>🏁 ${esc(s.title)}</h2>${s.lines.map(l => `<p>${esc(l)}</p>`).join('')}<div class="btns"><button class="btn pri full" data-act="aftersum">Rozpocznij nowy sezon</button></div>`);
    $('#modal').dataset.lock = '1'; return;
  }
  ACT.aftersum();
};
ACT.aftersum = () => {
  delete $('#modal').dataset.lock; closeModal();
  if (S.sacked) return showSacked();
  render();
};
function showSacked() {
  const offers = jobOffers();
  modal(`<h2>📄 Zostałeś zwolniony</h2><p>Zarząd stracił do Ciebie cierpliwość. Możesz podjąć pracę w jednym z klubów:</p>
    ${offers.map(t => `<button class="club" data-act="takeover" data-arg="${t.id}">${badge(t)}<div class="sp"><b>${esc(t.name)}</b><br><small>${DIV_NAMES[t.div]} • <span class="stars">${stars(t)}</span></small></div></button>`).join('')}`);
  $('#modal').dataset.lock = '1';
}
ACT.takeover = id => { delete $('#modal').dataset.lock; takeOver(+id); closeModal(); UI.tab = 'home'; UI.leagueDiv = null; render(); };

/* ---------- EKRAN STARTOWY ---------- */
let pickId = null;
function showStart() {
  $('#app').classList.add('hidden'); $('#start').classList.remove('hidden');
  const teams = S.teams.slice().sort((a, b) => b.level - a.level);
  $('#start').innerHTML = `<div class="in"><div style="font-size:42px">⚽</div><h1>Kariera Menedżera</h1><p class="mut">Poprowadź klub od ligi do chwały: skład, taktyka, transfery, finanse i zarząd, który patrzy Ci na ręce.</p>
    ${hasSave() ? `<button class="btn pri full" data-act="continue" style="margin-bottom:14px">▶ Kontynuuj karierę</button>` : ''}
    <h3>Nowa kariera</h3>
    <input id="mname" placeholder="Twoje imię i nazwisko" maxlength="24" style="width:100%;margin-bottom:10px" value="${esc(S.manager || '')}">
    <h3>Wybierz klub</h3>
    ${[0, 1].map(d => `<h3 style="color:var(--acc)">${DIV_NAMES[d]}</h3>${teams.filter(t => t.div === d).map(t => `<button class="club ${pickId === t.id ? 'on' : ''}" data-act="pickclub" data-arg="${t.id}">${badge(t)}<div class="sp"><b>${esc(t.name)}</b><br><small>Budżet transf.: ${money(t.tb)} • stadion ${t.cap.toLocaleString('pl-PL')}</small></div><span class="stars">${stars(t)}</span></button>`).join('')}`).join('')}
    <button class="btn pri full" data-act="begin" style="position:sticky;bottom:10px" ${pickId == null ? 'disabled' : ''}>Rozpocznij karierę</button>
    <button class="btn full" data-act="reroll" style="margin-top:8px">🎲 Wylosuj nowy świat</button></div>`;
}
ACT.pickclub = id => { const n = $('#mname') ? $('#mname').value : ''; pickId = +id; S.manager = n; showStart(); const el = document.querySelector(`[data-arg="${id}"]`); if (el) el.scrollIntoView({ block: 'center' }); };
ACT.reroll = () => { const n = $('#mname').value; createWorld(); S.manager = n; pickId = null; showStart(); };
ACT.begin = () => {
  if (pickId == null) return;
  const n = ($('#mname').value || '').trim() || 'Menedżer';
  startCareer(n, pickId); $('#start').classList.add('hidden'); $('#app').classList.remove('hidden'); UI.tab = 'home'; render();
};
ACT.continue = () => { if (loadGame()) { $('#start').classList.add('hidden'); $('#app').classList.remove('hidden'); render(); if (S.sacked) showSacked(); } };

/* ---------- start aplikacji ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.arg, el);
});
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el.value); });
createWorld();
showStart();
