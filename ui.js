'use strict';
/* ============================================================
   KARIERA MENEDŻERA – interfejs (mobile-first)
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const UI = {
  tab: 'home', sqTab: 'pitch', nt: false, compTab: 'league', cc: null, lg: null, lgTab: 'table', rnd: null,
  euro: 'CL', euroTab: 'lp', md: null, mkTab: 'search', clubTab: 'mgr', offTab: 'fin', sel: null, listSort: 'pos',
  f: { real: true, cc: '', pos: '', age: 0, ovr: 0, ovrMax: 0, potMin: 0, potMax: 0, ageMin: 0, price: 0, sort: 'fit', q: '' },
};
const ACT = {}, CHG = {};

/* ---------- helpery ---------- */
function badge(t, cls = '') { if (typeof crestSVG === 'function') return crestSVG(t, cls === 'lg' ? 54 : cls === 'sm' ? 24 : 34); const col = t.col || ['#334', '#fff']; return `<span class="badge ${cls}" style="background:${col[0]};color:${col[1]}">${esc(t.short)}</span>`; }
const ntObj = code => ({ short: code, col: ncol(code), name: NAT[code].name });
const ovrCls = o => o >= 85 ? 'o0' : o >= 75 ? 'o1' : o >= 65 ? 'o2' : o >= 55 ? 'o3' : o >= 47 ? 'o4' : 'o5';
const ovrTag = o => `<span class="ovr ${ovrCls(o)}">${o}</span>`;
function ovrShow(p, pot) { const r = ovrRange(p, pot); if (pot && know(p) < 30) return '<span class="ovr unk">?</span>'; return r[0] === r[1] ? ovrTag(r[0]) : `<span class="ovr unk">${r[0]}–${r[1]}</span>`; }
const posTag = p => `<span class="pos ${LINE[p]}">${POS_PL[p]}</span>`;
const flag = code => NAT[code] ? NAT[code].flag : '🏳️';
const stars = c => presStars(c);
function toast(t, kind) {
  const el = $('#toast'); el.textContent = t; el.className = 'on' + (kind ? ' ' + kind : '') + ($('#match') && !$('#match').classList.contains('hidden') ? ' low' : '');
  if (kind && typeof uk_haptic === 'function') uk_haptic(kind === 'bad' ? 'bad' : 'ok');
  el.onclick = () => el.classList.remove('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600);
}
const toastClear = () => { const el = $('#toast'); el.classList.remove('on'); clearTimeout(toast.t); };
function modal(html, lock) { const m = $('#modal'), again = !m.classList.contains('hidden'); m.innerHTML = `<div class="box${again ? ' noanim' : ''}">${html}</div>`; m.classList.remove('hidden'); if (lock) m.dataset.lock = '1'; else delete m.dataset.lock; m.onclick = e => { if (e.target === m && !m.dataset.lock) closeModal(); }; if (!lock && typeof uk_enableSheetSwipe === 'function') uk_enableSheetSwipe(m.querySelector('.box'), closeModal); }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; delete m.dataset.lock; }
const bar = (v, cls = '') => `<div class="bar ${v < 50 ? 'b' : v < 75 ? 'w' : ''} ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
const morale = p => `<span title="${moraleLabel(p.mor)[1]}">${moraleLabel(p.mor)[0]}</span>`;
const formArrow = f => f >= 65 ? '<span class="good">▲</span>' : f <= 38 ? '<span class="bad">▼</span>' : '<span class="mut">●</span>';
function stTag(p) { return p.inj ? `<span class="pill r" title="${esc(p.injT || 'kontuzja')}">🚑 ${Math.ceil(p.inj / 7)} tyg.</span>` : p.susp ? `<span class="pill r">🟥 ${p.susp}</span>` : ''; }
const tabs = (list, cur, act) => `<div class="tabs">${list.map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-arg="${k}">${n}</button>`).join('')}</div>`;
const busy = (on, t) => { const b = $('#busy'); b.classList.toggle('hidden', !on); if (t) b.querySelector('span').textContent = t; };
ACT.close = () => closeModal();

/* ---------- render główny ---------- */
const NAV_ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  squad: 'M8 3 3.5 5.5 2 10l3.5 1.2V21h13v-9.8L22 10l-1.5-4.5L16 3c-.6 1.6-2.1 2.6-4 2.6S8.6 4.6 8 3z',
  comps: 'M7 3h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.4 12H8a4 4 0 0 1-4-4V5h3zm-1 4v1a2 2 0 0 0 1 1.7V7zm11 0v2.7A2 2 0 0 0 18 8V7z',
  market: 'M10.5 3a7.5 7.5 0 0 1 6 12l4.3 4.3-1.5 1.5-4.3-4.3A7.5 7.5 0 1 1 10.5 3zm0 2.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  club: 'M12 2 4 6v2h16V6zM5 9v9H3v3h18v-3h-2V9h-3v9h-2.5V9h-3v9H8V9z',
  office: 'M9 4h6a1 1 0 0 1 1 1v2h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4V5a1 1 0 0 1 1-1zm1 3h4V6h-4zM3 12h18',
  acad: 'M12 3 1 8.5 12 14l9-4.5V16h2V8.5zM5 12.3V16c0 1.9 3.1 4 7 4s7-2.1 7-4v-3.7L12 16z',
  fac: 'M2 9c0-2.2 4.5-4 10-4s10 1.8 10 4v8c0 2.2-4.5 4-10 4S2 19.2 2 17zm10 2c4.4 0 8-1 8-2.5S16.4 6 12 6 4 7 4 8.5 7.6 11 12 11z',
  fin: 'M3 5h18v14H3zm2 2v10h14V7zm7 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z',
  staff: 'M8 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm8 1a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM2 19c0-3.3 2.7-6 6-6s6 2.7 6 6v1H2zm13-5.5c3 0 7 1.5 7 4.5v2h-6v-1c0-2.1-.4-3.9-1-5.5z',
  scout: 'M3 8h4l2-3h6l2 3h4v11H3zm9 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  cal: 'M4 5h16v15H4zm0 4h16M8 3v4M16 3v4M7 12h3v3H7z',
  rank: 'M3 20h18M5 20V13h4v7M10 20V8h4v12M15 20v-9h4v9',
  troph: 'M12 2l2.9 6.2 6.8.8-5 4.7 1.3 6.8L12 17.1 6 20.5l1.3-6.8-5-4.7 6.8-.8z',
};
// dolne menu: [klucz, nazwa, zakładka, [pole podzakładki, wartość]]
const NAV = [['home', 'Pulpit', 'home'], ['squad', 'Skład', 'squad'], ['comps', 'Rozgrywki', 'comps', ['compTab', 'league']], ['cal', 'Terminarz', 'comps', ['compTab', 'cal']], ['market', 'Transfery', 'market'],
  ['acad', 'Akademia', 'acad'], ['fac', 'Obiekty', 'fac'], ['office', 'Biuro', 'office'], ['club', 'Klub', 'club']];
function navCur() {
  const sub = NAV.find(n => n[3] && !['club', 'comps', 'market'].includes(n[0]) && UI.tab === n[2] && UI[n[3][0]] === n[3][1]);
  return sub ? sub[0] : UI.tab;
}
ACT.nav = k => {
  if ($('#modal') && !$('#modal').classList.contains('hidden')) closeModal();
  const n = NAV.find(x => x[0] === k); if (!n) return;
  const same = navCur() === k && (!n[3] || UI[n[3][0]] === n[3][1]);
  navPush(); UI.tab = n[2]; if (n[3]) UI[n[3][0]] = n[3][1]; UI.sel = null; render(); window.scrollTo(0, 0);
  if (same) return;
};
function navFade() { const nb = $('#nav'); if (!nb) return; nb.classList.toggle('fl', nb.scrollLeft > 4); nb.classList.toggle('fr', nb.scrollLeft + nb.clientWidth < nb.scrollWidth - 4); }
document.addEventListener('DOMContentLoaded', () => { const nb = $('#nav'); if (nb) nb.addEventListener('scroll', navFade, { passive: true }); });
const navIcon = (k, on) => { const ln = k === 'cal' || k === 'rank'; return `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="${NAV_ICONS[k]}" fill="${on && !ln ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${on && !ln ? 0 : on ? 2.2 : 1.6}" stroke-linejoin="round" stroke-linecap="round"/></svg>`; };
let SWIPE_DIR = null;
function render() {
  const ut = userClub(), d = curDay();
  { const r = document.documentElement.style; r.setProperty('--club', (ut.col && ut.col[0]) || '#2ee59d'); r.setProperty('--club2', (ut.col && ut.col[1]) || '#ffffff'); }
  $('#top').innerHTML = `${badge(ut)}<div class="tt"><b>${esc(ut.name)}</b><small>${d ? fmtDate(todayMs()) : ''} • ${SEASON_LABEL(S.season)}</small></div>
    <div class="money"><small class="mut" style="font-size:10px;display:block;line-height:1">saldo</small>${money(ut.bal)}<small class="${windowOpen() ? 'good' : 'mut'}">${windowOpen() ? '🟢 okno otwarte' : '🔒 okno zamknięte'}</small></div>`;
  const unread = S.inbox.filter(m => !m.read).length;
  const cur = navCur();
  $('#nav').innerHTML = NAV.map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-act="nav" data-arg="${k}"><i>${navIcon(k, cur === k)}</i>${n}${k === 'home' && unread ? `<span class="dot">${unread}</span>` : ''}${k === 'market' && S.offers.length ? `<span class="dot">${S.offers.length}</span>` : ''}</button>`).join('');
  const vk = [UI.tab, UI.sqTab, UI.compTab, UI.clubTab, UI.mkTab, UI.rkTab, UI.offTab].join('/'), v = $('#view');
  navFade(); { const nb = $('#nav'), on = nb.querySelector('.on'); if (on && (on.offsetLeft < nb.scrollLeft || on.offsetLeft + on.offsetWidth > nb.scrollLeft + nb.clientWidth)) nb.scrollLeft = on.offsetLeft - (nb.clientWidth - on.offsetWidth) / 2; }
  v.innerHTML = ({ home: vHome, squad: vSquad, comps: vComps, market: vMarket, club: vClub, acad: vAcad, fac: vFac, office: vOffice })[UI.tab]();
  if (vk !== render._vk) { render._vk = vk; v.classList.remove('uk-fade', 'sw-l', 'sw-r'); void v.offsetWidth; v.classList.add(SWIPE_DIR ? 'sw-' + SWIPE_DIR : 'uk-fade'); }
  SWIPE_DIR = null;
  for (const t of document.querySelectorAll('#view .tabs')) { const on = t.querySelector('.on'); if (on) t.scrollLeft = Math.max(0, on.offsetLeft - (t.clientWidth - on.offsetWidth) / 2); }
}
/* ---------- historia nawigacji (przycisk „wstecz” Androida) ---------- */
const NAVK = ['tab', 'sqTab', 'compTab', 'rkTab', 'offTab', 'clubTab', 'mkTab', 'lgTab', 'euroTab', 'nt'];
const NAVH = [];
const snap = () => { const o = {}; for (const k of NAVK) o[k] = UI[k]; o.y = window.scrollY; return o; };
function navPush() { const s0 = snap(), last = NAVH[NAVH.length - 1]; if (!last || NAVK.some(k => last[k] !== s0[k])) { NAVH.push(s0); if (NAVH.length > 40) NAVH.shift(); } }
let backAt = 0;
function goBack() {
  if (!$('#busy').classList.contains('hidden')) return;
  const m = $('#modal');
  if (!m.classList.contains('hidden')) { if (m.dataset.lock) toast('Najpierw podejmij decyzję.'); else closeModal(); return; }
  if (!$('#match').classList.contains('hidden')) { if (!MS.over && !MS.paused) ACT.mpause(); toast('Mecz wstrzymany. Użyj ⏭ Koniec, aby go dokończyć.'); return; }
  if (!$('#start').classList.contains('hidden') && ST.slot != null) return showMenu();
  if (!$('#start').classList.contains('hidden') || !S || S.user < 0) return minimize();
  if (UI.sel != null) { UI.sel = null; return render(); }
  const prev = NAVH.pop();
  if (prev) { for (const k of NAVK) UI[k] = prev[k]; render(); window.scrollTo(0, prev.y || 0); return; }
  if (UI.tab !== 'home') { UI.tab = 'home'; render(); window.scrollTo(0, 0); return; }
  minimize();
}
function minimize() {
  const now = Date.now();
  if (now - backAt > 2000) { backAt = now; toast('Naciśnij „wstecz” ponownie, aby zminimalizować grę.'); return; }
  saveNow();
  const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (A && A.minimizeApp) A.minimizeApp(); else if (A && A.exitApp) A.exitApp();
}
(function setupBack() {
  const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (A && A.addListener) {
    A.addListener('backButton', goBack);
    A.addListener('pause', () => { if (S && S.user >= 0) saveNow(); });
  } else {
    history.pushState({ g: 1 }, '');
    window.addEventListener('popstate', () => { goBack(); history.pushState({ g: 1 }, ''); });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && S && S.user >= 0) saveNow(); });
})();
ACT.tab = a => { if (a !== UI.tab) navPush(); UI.tab = a; UI.sel = null; render(); window.scrollTo(0, 0); };

/* ---------- następny mecz ---------- */
const isTbd = x => x && x.a && x.a.id == null && x.a.name === 'Losowanie';
function peekUser() {
  for (let i = S.day; i < S.cal.length; i++) { const x = fixtureAt(i); if (x) return x; }
  return null;
}
function fixtureAt(i) {
  {
    const d = S.cal[i];
    if (d.t === 'P' && S.pre) { const T = S.pre.chosen; if (d.md === 0) return { i, d, h: userClub(), a: T ? club(T.teams[0]) : { short: '☀', name: 'wybierz turniej', col: ['#334', '#fff'] }, label: `${T ? T.name : 'Turniej przedsezonowy'} • Półfinał`, pre: true }; if (i === S.day) { const x = userMatchToday(); if (x) return { i, d, h: x.h, a: x.a, label: x.opts.label, pre: true }; } }
    if (d.t === 'L') { const lg = S.leagues[userClub().lg], r = lg.lsMap[d.ls]; if (r >= 0) { const f = lg.fix[r].find(f => f.h === S.user || f.a === S.user); return { i, d, h: club(f.h), a: club(f.a), label: `${lg.name} • ${r + 1}. kolejka`, sc: f.p ? [f.hg, f.ag] : null }; } }
    if (d.t === 'E' && d.st === 'Q') { for (const c of Object.values(S.euro)) { if (!c.q) continue; const T = c.q.rounds[d.r];
      const t = T && T.find(t => t.a === S.user || t.b === S.user);
      if (t) { const first = d.leg === 1; return { i, d, h: club(first ? t.a : t.b), a: club(first ? t.b : t.a), label: `${c.name} • ${QNAME[d.r]} (${first ? '1. mecz' : 'rewanż'})`, sc: first ? (t.m1 ? [t.m1.hg, t.m1.ag] : null) : t.m2 ? [t.m2.hg, t.m2.ag] : null }; }
      if (!T && c.q.alive.includes(S.user)) return { i, d, h: userClub(), a: { short: '?', name: 'Losowanie', col: ['#334', '#fff'] }, label: `${c.name} • ${QNAME[d.r]} (losowanie)` }; } }
    if (d.t === 'E' && d.st !== 'Q') for (const c of Object.values(S.euro)) {
      if (d.st === 'LP') { if (!c.lp) continue; const f = c.lp[d.md] && c.lp[d.md].find(f => f.h === S.user || f.a === S.user); if (f) return { i, d, h: club(f.h), a: club(f.a), label: `${c.name} • faza ligowa ${d.md + 1}`, sc: f.p ? [f.hg, f.ag] : null }; }
      else if (c.ko[d.st]) { const t = c.ko[d.st].find(t => t.a === S.user || t.b === S.user); if (t) { const first = d.st === 'F' || d.leg === 1; return { i, d, h: club(first ? t.a : t.b), a: club(first ? t.b : t.a), label: `${c.name} • ${STAGE_NAME[d.st]}${d.st !== 'F' ? (d.leg === 1 ? ' (1. mecz)' : ' (rewanż)') : ''}`, sc: d.leg === 2 ? (t.m2 ? [t.m2.hg, t.m2.ag] : null) : t.m1 ? [t.m1.hg, t.m1.ag] : null }; } }
      else if (c.teams.includes(S.user) && i === S.day) { const x = userMatchToday(); if (x) return { i, d, h: x.h, a: x.a, label: x.opts.label }; }
    }
    if (d.t === 'C') { const cup = S.cups[userClub().cc], r = d.slot - cup.slot0; if (r >= 0 && r < cup.R) { if (cup.rounds[r]) { const t = cup.rounds[r].find(t => t.h === S.user || t.a === S.user); if (t) return { i, d, h: club(t.h), a: club(t.a), label: `${cup.name} • ${cupRoundName(cup.rounds[r].length * 2)}`, sc: t.m ? [t.m.hg, t.m.ag] : null }; } else if (cupAlive(cup, r)) return { i, d, h: userClub(), a: { short: '?', name: 'Losowanie', col: ['#334', '#fff'] }, label: `${cup.name} • losowanie` }; } }
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
function vSquadStats(t) {
  UI.stSort = UI.stSort || 'apps';
  const key = { apps: p => p.st.apps, g: p => p.st.g, a: p => p.st.a, r: p => p.st.apps >= 3 ? p.st.rs / p.st.apps : 0, min: p => p.st.mins, ga: p => p.st.g + p.st.a }[UI.stSort];
  const ps = t.players.slice().sort((a, b) => key(b) - key(a) || b.ovr - a.ovr);
  const best = (f, min = 1) => { const x = t.players.filter(p => p.st.apps >= min).sort((a, b) => f(b) - f(a))[0]; return x && f(x) > 0 ? x : null; };
  const bs = best(p => p.st.g), ba = best(p => p.st.a), br = best(p => p.st.rs / p.st.apps, 3);
  const st = S.stats || {}, res = S.results || [], lgs = topScorers(t.lg, 5), lga = S.leagues[t.lg].clubs.flatMap(id => club(id).players).filter(p => p.st.a > 0).sort((a, b) => b.st.a - a.st.a).slice(0, 5);
  const tile = (ic, l, p, v) => `<div class="card stat" ${p ? `data-act="info" data-arg="${p.id}"` : ''}><small>${ic} ${l}</small><b>${p ? esc(lastName(p)) : '–'}</b><small>${p ? v : ''}</small></div>`;
  const th = (k, n) => `<th data-act="stsort" data-arg="${k}" style="cursor:pointer">${UI.stSort === k ? '▼' : ''}${n}</th>`;
  return `<div class="grid3">${tile('⚽', 'Strzelec', bs, bs ? plural(bs.st.g, 'gol', 'gole', 'goli') : '')}${tile('🅰️', 'Asysty', ba, ba ? plural(ba.st.a, 'asysta', 'asysty', 'asyst') : '')}${tile('⭐', 'Ocena', br, br ? (br.st.rs / br.st.apps).toFixed(2) : '')}</div>
    <div class="card"><b>Zespół</b><div class="kv"><div><span>Mecze (kariera)</span><b>${st.games || 0}</b></div><div><span>Zwycięstwa</span><b>${st.wins || 0} (${st.games ? Math.round(st.wins / st.games * 100) : 0}%)</b></div>
      <div><span>Seria bez porażki</span><b>${st.unbeaten || 0}</b></div><div><span>Rekord serii</span><b>${st.bestUnbeaten || 0}</b></div></div>
      <div class="chips">${res.slice(-10).map(c => `<span class="chip ${c}">${c === 'W' ? 'Z' : c === 'D' ? 'R' : 'P'}</span>`).join('')}</div></div>
    <div class="card"><b>👑 Hierarchia szatni</b><br><small class="mut">Liderzy wpływają na nastroje całej drużyny, a grupy narodowościowe trzymają się razem. Odstawienie lub sprzedaż lidera odbija się na atmosferze.</small>
      ${squadLeaders().map(p => `<div class="rt" data-act="info" data-arg="${p.id}"><span>👑 ${esc(p.n)}</span><small>${moraleLabel(p.mor).join(' ')}</small></div>`).join('')}
      ${squadCliques().map(g => `<div class="rt"><span>${flag(g.nat)} ${esc(NAT[g.nat] ? NAT[g.nat].name : g.nat)} (${g.ps.length})</span><small>morale ${Math.round(avg(g.ps.map(p => p.mor)))}</small></div>`).join('')}</div>
    <div class="card list"><div class="scrollx"><table class="rank"><tr><th>Zawodnik</th>${th('apps', 'M')}${th('min', 'Min')}${th('g', 'G')}${th('a', 'A')}${th('ga', 'K')}${th('r', 'Ocena')}</tr>
      ${ps.map(p => `<tr data-act="info" data-arg="${p.id}"><td>${posTag(p.pos)} ${esc(lastName(p))}</td><td>${p.st.apps}</td><td>${p.st.mins}</td><td>${p.st.g}</td><td>${p.st.a}</td><td>${p.st.g + p.st.a}</td><td>${p.st.apps ? (p.st.rs / p.st.apps).toFixed(2) : '–'}</td></tr>`).join('')}</table></div>
      <small class="mut">Statystyki z bieżącego sezonu (liga, puchary, Europa). K – punkty kanadyjskie.</small></div>
    <div class="grid2"><div class="card list"><b>Strzelcy ligi</b>${lgs.map((p, i) => `<div class="rt" data-act="info" data-arg="${p.id}"><span>${i + 1}. ${esc(lastName(p))} <small class="mut">${esc(club(p.tid).short)}</small></span><b>${p.lg}</b></div>`).join('') || '<small class="mut">–</small>'}</div>
      <div class="card list"><b>Asystenci ligi</b>${lga.map((p, i) => `<div class="rt" data-act="info" data-arg="${p.id}"><span>${i + 1}. ${esc(lastName(p))} <small class="mut">${esc(club(p.tid).short)}</small></span><b>${p.st.a}</b></div>`).join('') || '<small class="mut">–</small>'}</div></div>`;
}
ACT.stsort = k => { UI.stSort = k; render(); };
function vHome() {
  const ut = userClub(), nx = peekUser(), today = nx && nx.i === S.day && atEntry();
  const tb = table(ut.lg), row = tb.find(r => r.id === ut.id);
  const out = ut.players.filter(p => p.inj || p.susp);
  const conf = S.board.conf, ec = euroOf(ut.id);
  const mAvg = Math.round(avg(ut.players.map(p => p.mor))), fAvg = Math.round(avg(ut.players.map(p => p.fit)));
  return `
  <div class="card hl">
    ${nx ? `<div class="row"><small>${esc(nx.label)}</small><span class="sp"></span><span class="pill">${fmtDate(nx.d.date)}</span></div>
    ${isTbd(nx) ? `<div class="fixture"><div class="tm">${badge(nx.h, 'lg')}<span>${esc(nx.h.name)}</span></div><div class="vs" style="font-size:15px">🎲<br><small class="mut">rywal zostanie wylosowany</small></div></div>` : `<div class="fixture"><div class="tm">${badge(nx.h, 'lg')}<span>${esc(nx.h.name)}</span></div><div class="vs">vs</div><div class="tm">${badge(nx.a, 'lg')}<span>${esc(nx.a.name)}</span></div></div>`}` : '<b>Koniec sezonu</b>'}
    ${nx && !nx.nt && nx.h.lg && nx.a.lg ? `<div class="row mut" style="font-size:12px;justify-content:space-between"><span>${heroInfo(nx.h)}</span><span>${heroInfo(nx.a)}</span></div>` : ''}
    ${(() => { const xi = ut.lineup.map(pget).filter(Boolean); if (!xi.length) return ''; const f = Math.round(avg(xi.map(p => p.fit))), bench = ut.players.filter(p => !ut.lineup.includes(p.id) && isAvail(p) && roleOf(p) === 'key' && p.fit >= 75 && p.ovr >= lineupAvg(ut) + 2); return `<div class="row" style="font-size:12px;margin-top:4px"><span class="${f < 70 ? 'bad' : f < 82 ? 'warn' : 'mut'}">🔋 Kondycja jedenastki: ${f}%${f < 70 ? ' – rozważ rotację' : ''}</span></div>${bench.length ? `<div class="row" style="font-size:12px"><span class="warn">⚠️ Kluczowy na ławce: ${bench.map(p => esc(lastName(p))).join(', ')}</span></div>` : ''}`; })()}
    <div class="btns">${today && nx.pre && S.pre && !S.pre.chosen ? `<button class="btn sp" disabled>☀️ Najpierw wybierz turniej poniżej</button>` : today ? `<button class="btn pri sp" data-act="prematch">⚽ Graj mecz</button><button class="btn" data-act="quicksim">⏩ Symuluj</button>` : `<button class="btn pri sp" data-act="cont">▶ Do meczu</button>`}</div>
    <div class="btns simrow">${today ? '<small class="mut" style="width:100%;text-align:center">Dziś mecz – symulacja dni po rozegraniu</small>' : ''}<button class="btn sm" data-act="simdays" data-arg="1" ${today ? 'disabled' : ''}>+1 dzień</button><button class="btn sm" data-act="simdays" data-arg="3" ${today ? 'disabled' : ''}>+3 dni</button><button class="btn sm" data-act="simdays" data-arg="7" ${today ? 'disabled' : ''}>+7 dni</button><button class="btn sm" data-act="gocal">📅 Kalendarz</button></div>
  </div>
  ${windowBanner()}
  ${typeof homeCareerCards === 'function' ? homeCareerCards() : ''}
  ${S.pre && !S.pre.chosen && S.pre.season === S.season && S.cal[S.day] && S.cal[S.day].t === 'P' ? preCard() : ''}
  ${upcomingStrip(nx)}
  ${S.intake && S.intake.length && (!S.intakeDay || absDay() - S.intakeDay < 45) ? `<div class="card hl" data-act="intake"><div class="row"><span style="font-size:22px">🎓</span><b class="sp">Dzień naboru do akademii!</b><small>Poznaj juniorów ›</small></div></div>` : ''}
  ${S.pending.length ? `<div class="card hl" data-act="event" data-arg="${S.pending[0].uid}"><div class="row"><span style="font-size:22px">📌</span><b class="sp">Decyzje do podjęcia (${S.pending.length})</b><small>${esc(S.pending[0].title)} ›</small></div></div>` : ''}
  <div class="grid3">
    <div class="card stat"><small>🏟️ Kibice</small><b>${Math.round(S.fans)}%</b>${bar(S.fans)}</div>
    <div class="card stat"><small>📰 Prasa</small><b>${Math.round(S.press)}%</b>${bar(S.press)}</div>
    <div class="card stat"><small>🧑‍💼 OVR trenera</small><b>${Math.round(S.mgr.ovr)}</b>${bar(S.mgr.ovr)}</div>
  </div>
  <div class="grid2">
    <div class="card stat"><small>${esc(S.leagues[ut.lg].name)}</small><b>${row.P ? row.pos + ". miejsce" : "Start sezonu"}</b><small>${row.P ? row.Pts + " pkt" : "jeszcze bez meczu"} • ${row.W}-${row.D}-${row.L}</small><div class="chips">${row.form.slice(-5).map(c => `<span class="chip ${c}">${c === 'W' ? 'Z' : c === 'D' ? 'R' : 'P'}</span>`).join('')}</div>${(() => { const h = (S.uhist || []).filter(x => x.s === S.season); return h.length >= 2 && typeof sparkSVG === 'function' ? sparkSVG(h.map(x => x.pos), { w: 130, h: 24, invert: true }) : ''; })()}</div>
    <div class="card stat"><small>Prestiż klubu</small>${presStars(ut)}<small>${presOf(ut).toFixed(1)}/10 • ${presWord(presOf(ut))}</small></div>
    <div class="card stat"><small>Drużyna</small><b>${moraleLabel(mAvg)[0]} ${moraleLabel(mAvg)[1]}</b><small>Morale ${mAvg} • kondycja ${fAvg}%</small>${bar(fAvg)}</div>
  </div>
  ${S.dl && windowOpen() && absDay() - S.dl.day <= 10 ? `<div class="card hl"><div class="row"><span style="font-size:22px">⏰</span><b class="sp">Ostatnie dni okna transferowego!</b></div><small class="mut">Okazje last minute (−20%):</small>${S.dl.deals.map(pget).filter(p => p && p.tid >= 0 && p.tid !== S.user).map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${p.age} l. • ${esc(club(p.tid).short)} • ${money(askPrice(p))}</small></div>${ovrShow(p)}</div>`).join('')}</div>` : ''}
  ${(S.promises || []).length ? `<div class="card"><b>🤝 Obietnice</b>${S.promises.map(pr => { const p = pget(pr.pid); if (!p) return ''; const d = pr.until - absDay(), ok = p.pt >= 0.55; return `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>regularna gra • zostało ${plural(Math.max(0, d), 'dzień', 'dni', 'dni')} • gra ${Math.round(p.pt * 100)}% (potrzeba 55%)</small></div><span class="${ok ? 'good' : 'bad'}">${ok ? '✔' : '⚠️'}</span></div>`; }).join('')}<small class="mut">Asystent wystawia zawodników z obietnicą chętniej.</small></div>` : ''}
  ${(() => { const ut = userClub(), ex = ut.players.filter(p => p.con <= 1 && !p.loan); return ex.length && curLs() >= 18 ? `<div class="card"><div class="row"><b class="sp">📝 Kontrakty kończą się po sezonie (${ex.length})</b></div><small class="mut">Bez przedłużenia odejdą za darmo. Dotknij, by negocjować.</small>${ex.sort((a, b) => b.ovr - a.ovr).slice(0, 8).map(p => `<div class="prow" data-act="rennego" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${p.age} l. • ${money(p.wage)}/tydz. • ${ROLES[roleOf(p)][0]}</small></div>${ovrTag(p.ovr)}</div>`).join('')}</div>` : ''; })()}
  ${S.offers.length ? `<div class="card hl" data-act="gooffers"><div class="row"><span style="font-size:22px">💰</span><b class="sp">Oferty za Twoich zawodników (${S.offers.length})</b><small>Zobacz ›</small></div></div>` : ''}
  ${S.jobs.length ? `<div class="card hl" data-act="jobs"><div class="row"><span style="font-size:22px">📨</span><b class="sp">Oferty pracy (${S.jobs.length})</b><small>Zobacz ›</small></div></div>` : ''}
  ${ec ? `<div class="card" data-act="goeuro" data-arg="${ec.id}"><div class="row"><span class="eu ${ec.id}">${ec.id === 'CL' ? '⭐' : ec.id === 'EL' ? '🟠' : '🟢'}</span><b class="sp">${ec.name}</b><small>${euroStatus(ec)}</small></div></div>` : ''}
  <div class="card"><div class="row"><b>Zarząd</b><span class="sp"></span><span class="${conf > 55 ? 'good' : conf > 30 ? 'warn' : 'bad'}">${ut.bal < 0 ? 'Zaniepokojony długami' : conf > 70 ? 'Bardzo zadowolony' : conf > 50 ? 'Zadowolony' : conf > 30 ? 'Niezadowolony' : 'Na krawędzi zwolnienia!'}</span></div>
    ${bar(conf)}<small>${esc(S.board.text)}${S.board.euro ? ' Europa: ' + esc(S.board.euro) + '.' : ''}</small>
    ${(S.board.side || []).filter(g => g.season === S.season).map(g => `<div class="rt"><small>🎯 ${esc(g.t)}</small><small class="${BOARD_GOALS[g.k][1](ut, g) ? 'good' : 'mut'}">${esc(BOARD_GOALS[g.k][2](ut, g))}</small></div>`).join('')}</div>
  ${S.nt ? `<div class="card" data-act="gont"><div class="row"><span style="font-size:22px">${flag(S.nt)}</span><b class="sp">Reprezentacja: ${esc(NAT[S.nt].name)}</b><small>Powołania ›</small></div></div>` : ''}
  ${out.length ? `<div class="card"><b>Niedostępni</b>${out.map(p => `<div class="row" style="margin-top:6px" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<span class="sp">${esc(p.n)}</span>${stTag(p)}</div>`).join('')}</div>` : ''}
  <div class="card"><div class="row"><b>Wiadomości</b><span class="sp"></span><button class="btn sm" data-act="inbox">Wszystkie</button></div>
    ${S.inbox.filter(m => !m.low).slice(0, 4).map(m => `<div class="msg ${m.read ? '' : 'new'}"><b>${esc(m.title)}</b><p>${esc(m.body)}</p></div>`).join('')}</div>`;
}
const empty = (ic, t, sub, act) => `<div class="empty"><div class="ei">${ic}</div><b>${t}</b>${sub ? `<small class="mut">${sub}</small>` : ''}${act ? `<div class="btns" style="justify-content:center">${act}</div>` : ''}</div>`;
function heroInfo(c) { if (!c || c.id == null || !S.leagues[c.lg]) return ''; const r = table(c.lg).find(x => x.id === c.id); return r ? `${r.pos}. m.${r.form.length ? ' • ' + r.form.slice(-5).map(f => f === 'W' ? '🟢' : f === 'D' ? '🟡' : '🔴').join('') : ''}` : ''; }
function upcomingStrip(nx) {
  const out = []; for (let i = (nx ? nx.i + 1 : S.day); i < S.cal.length && out.length < 5; i++) { const x = fixtureAt(i); if (x && !x.nt) out.push(x); }
  if (!out.length) return '';
  return `<div class="strip">${out.map(x => { const home = x.h.id === S.user, o = home ? x.a : x.h; return `<div class="sfx" ${o.id != null ? `data-act="clubv" data-arg="${o.id}"` : ''}>${isTbd(x) ? '<span style="font-size:22px">🎲</span><b>Losowanie</b><small>rywal nieznany • ' : `${badge(o, 'sm')}<b>${esc(o.name || '?')}</b><small>${home ? '🏠 u siebie' : '✈️ wyjazd'} • `}${fmtDate(x.d.date).replace(/ \d{4}$/, '')}</small><small class="mut">${esc(x.label.split(' • ')[0])}</small></div>`; }).join('')}</div>`;
}
ACT.intake = () => {
  const ys = (S.intake || []).map(pget).filter(y => y && y.tid === -3).sort((a, b) => b.acad.est - a.acad.est);
  if (!ys.length) { S.intake = null; return render(); }
  const st = v => { const n = clamp(Math.round((v - 50) / 9), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };
  const com = y => y.acad.est >= 80 ? '„To może być przyszła gwiazda klubu!”' : y.acad.est >= 72 ? '„Bardzo obiecujący chłopak.”' : y.acad.est >= 64 ? '„Solidny materiał na zawodnika.”' : '„Będzie mu trudno się przebić.”';
  modal(`<h2>🎓 Nowy rocznik akademii</h2><small class="mut">Szef akademii przedstawia ${ys.length} juniorów. Zatrzymaj obiecujących, zwolnij resztę, by nie płacić za szkolenie.</small>
    ${ys.map((y, i) => `<div class="card intake" style="animation-delay:${i * 0.12}s"><div class="row">${posTag(y.pos)}<b class="sp">${flag(y.nat)} ${esc(y.n)}</b><span class="stars">${st(y.acad.est)}</span></div>
      <small>${y.age} l. • OVR ${y.ovr} • potencjał ~${y.acad.est} • ${pers(y)}</small><br><small class="mut">${com(y)}</small>
      <div class="btns"><button class="btn sm" data-act="info" data-arg="${y.id}">Karta</button><button class="btn sm red" data-act="intakerel" data-arg="${y.id}">Zwolnij</button></div></div>`).join('')}
    <div class="btns"><button class="btn pri full" data-act="intakedone">Zatrzymaj pozostałych</button></div>`);
};
ACT.intakerel = id => { releaseYouth(+id); S.intake = (S.intake || []).filter(x => x !== +id); ACT.intake(); };
ACT.intakedone = () => { S.intake = null; saveSoon(); closeModal(); render(); };
function preCard() {
  return `<div class="card hl"><h2>☀️ Turniej przedsezonowy</h2><small class="mut">Wybierz zaproszenie – mecze budują rytm meczowy, dają premię i szansę na trofeum.</small>
    ${S.pre.offers.map((o, i) => `<div class="card" style="margin:8px 0"><div class="row"><b class="sp">${esc(o.name)}</b><span class="pill">${o.kind === 'elite' ? '⭐ Prestiż' : o.kind === 'tour' ? '✈️ Tournée' : '🏠 Krajowy'}</span></div>
      <small>${o.teams.map(id => `${badge(club(id), 'sm')} ${esc(club(id).name)}`).join(' • ')}</small><br><small class="mut">${esc(o.desc)} Udział: <b>${money(o.fee)}</b> • zwycięstwo: <b>${money(o.win)}</b></small>
      <div class="btns"><button class="btn sm pri" data-act="choosepre" data-arg="${i}">Przyjmij</button></div></div>`).join('')}</div>`;
}
ACT.gooffers = () => { navPush(); UI.tab = 'market'; UI.mkTab = 'offers'; render(); window.scrollTo(0, 0); };
ACT.choosepre = i => { choosePre(+i); saveSoon(); render(); };
function cupAlive(cup, r) {
  if (r === 0) { if (cup.rounds[0]) return true; const m = cup.teams.length - Math.pow(2, cup.R - 1); return cup.teams.slice().sort((a, b) => tierOf(b) - tierOf(a) || club(a).rep - club(b).rep).slice(0, 2 * m).includes(S.user); }
  const prev = cup.rounds[r - 1]; if (!prev) return cup.teams.includes(S.user) && !cup.rounds.some(rd => rd && rd.some(t => (t.h === S.user || t.a === S.user) && t.w != null && t.w !== S.user));
  if (r === 1 && cup.byes.includes(S.user)) return true;
  return prev.some(t => t.w === S.user);
}
function euroStatus(c) {
  if (c.champion === S.user) return '🏆 Zwycięzca!';
  if (c.q && c.q.alive.includes(S.user)) { const r = c.q.rounds.length - 1, t = r >= 0 && c.q.rounds[r].find(t => t.a === S.user || t.b === S.user); return t ? `eliminacje: ${QNAME[r]}` : r >= 0 ? `eliminacje: wolny los (${QNAME[r]})` : 'eliminacje'; }
  if (!c.lp) return 'faza ligowa – losowanie po eliminacjach';
  for (const st of ['F', 'SF', 'QF', 'R16', 'PO']) if (c.ko[st]) { const t = c.ko[st].find(t => t.a === S.user || t.b === S.user); if (t) return t.w == null ? STAGE_NAME[st] : t.w === S.user ? `awans (${STAGE_NAME[st]})` : `odpadli: ${STAGE_NAME[st]}`; }
  const r = lpTable(c).find(r => r.id === S.user); return r ? `faza ligowa: ${r.pos}. m. (${r.Pts} pkt)` : '';
}
ACT.event = uid => {
  const ev = S.pending.find(e => e.uid === +uid); if (!ev) return render();
  const ctx = ctxDeref(ev.ctx);
  modal(`<div class="evcat">${esc(ev.cat)}</div><h2>${esc(ev.title)}</h2>${ctx.p ? `<div class="row" style="margin-bottom:8px" data-act="info" data-arg="${ctx.p.id}">${posTag(ctx.p.pos)}<b class="sp">${esc(ctx.p.n)}</b><small class="mut">${pers(ctx.p)} • ${moraleLabel(ctx.p.mor).join(' ')}</small></div>` : ''}
    <p>${esc(ev.text)}</p><div class="choices">${ev.choices.map((c, i) => `<button class="btn full" data-act="evchoose" data-arg="${ev.uid}:${i}">${esc(c)}${ev.hints && ev.hints[i] ? `<small class="hint">⚠️ ${esc(ev.hints[i])}</small>` : ''}</button>`).join('')}</div>`, true);
};
ACT.evchoose = a => {
  const [uid, i] = a.split(':').map(Number); const r = resolveEvent(uid, i); if (!r) return closeModal();
  modal(`<h2>${r.risky ? '😬 Nie poszło po myśli' : 'Decyzja podjęta'}</h2><p>${esc(r.r)}</p><div class="fxl">${r.fx.map(f => `<span class="pill">${esc(f)}</span>`).join(' ') || '<small class="mut">Bez większych konsekwencji.</small>'}</div>
    <div class="btns"><button class="btn pri full" data-act="evnext">${S.pending.length ? 'Następna decyzja' : 'OK'}</button></div>`, true);
};
ACT.evnext = () => { closeModal(); render(); if (S.pending.length) ACT.event(S.pending[0].uid); else winPopups(); };
ACT.jobs = () => {
  modal(`<h2>📨 Oferty pracy</h2><small class="mut">Twój OVR trenera: ${Math.round(S.mgr.ovr)} (${mgrLabel(S.mgr.ovr)}). Przyjęcie oferty oznacza odejście z ${esc(userClub().name)}.</small>
    ${S.jobs.map(j => { const c = club(j.club), r = table(c.lg).find(x => x.id === c.id); return `<div class="card"><div class="row">${badge(c)}<div class="sp"><b>${esc(c.name)}</b><br><small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • ${r.pos}. miejsce • rep. ${c.rep}</small></div><span class="stars">${stars(c)}</span></div>
      <small class="mut">Budżet transferowy ${money(c.tb)} • średnia kadry ${Math.round(teamLevel(c))} • ważna do ${fmtDate(j.exp * 864e5)}</small>
      <div class="btns"><button class="btn pri sp" data-act="takejob" data-arg="${j.id}">Przyjmij</button><button class="btn" data-act="dropjob" data-arg="${j.id}">Odrzuć</button></div></div>`; }).join('')}
    <div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
ACT.takejob = id => { if (!confirm('Przyjąć ofertę i zmienić klub?')) return; closeModal(); acceptJob(+id); UI.tab = 'home'; UI.lg = null; UI.nt = false; render(); toast(`Witamy w ${userClub().name}!`); };
ACT.dropjob = id => { S.jobs = S.jobs.filter(j => j.id !== +id); saveSoon(); closeModal(); render(); };
ACT.goeuro = a => { UI.tab = 'comps'; UI.compTab = 'euro'; UI.euro = a; render(); };
ACT.gont = () => { navPush(); UI.tab = 'club'; UI.clubTab = 'nt'; render(); };
ACT.inbox = f => { S.inbox.forEach(m => m.read = true); saveSoon(); UI.inF = f || UI.inF || 'imp'; const L = S.inbox.filter(m => UI.inF === 'all' || !m.low); modal(`<h2>Wiadomości</h2><div class="seg"><button class="btn sm ${UI.inF === 'imp' ? 'on' : ''}" data-act="inbox" data-arg="imp">Ważne</button><button class="btn sm ${UI.inF === 'all' ? 'on' : ''}" data-act="inbox" data-arg="all">Wszystkie</button></div>${L.map(m => `<div class="msg"><b>${esc(m.title)}</b><small>${m.date ? fmtDate(m.date) : ''}</small><p>${esc(m.body)}</p></div>`).join('')}<div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`); render(); };

/* ---------- KONTYNUUJ ---------- */
let running = false;
ACT.cont = async () => {
  if (running) return; running = true;
  try {
    if (S.sacked) return showSacked();
    if (S.pending.length) return ACT.event(S.pending[0].uid);
    S.now = null;
    if (winPopups()) return;
    if (userMatchToday()) { ACT.prematch(); return; }
    busy(true, 'Symulacja…');
    for (let n = 0; n < 40; n++) {
      const r = processDay(null);
      if (r.summary) { busy(false); await saveNow(); render(); return showSummary(r.summary); }
      if (S.sacked) { busy(false); saveNow(); render(); return showSacked(); }
      if (userMatchToday() || S.pending.length || S.winPop === S.day || S.ddPop === S.day) break;
      busy(true, `Symulacja… ${fmtDate(curDay().date)}`);
      await new Promise(r => setTimeout(r, 0));
    }
    busy(false); saveSoon(); render();
    if (S.pending.length) ACT.event(S.pending[0].uid);
    else if (!winPopups() && userMatchToday()) ACT.prematch();
  } finally { running = false; busy(false); }
};
/* symulacja do wybranego dnia: zatrzymuje się na meczach, decyzjach, otwarciu okna i w Deadline Day */
async function simTo(target) {
  if (running) return; running = true;
  try {
    if (S.sacked) return showSacked();
    if (S.pending.length) return ACT.event(S.pending[0].uid);
    busy(true, 'Symulacja…'); let stop = '';
    for (let n = 0; n < 400; n++) {
      if (S.day >= S.cal.length) break;
      if (curDay().date > target) { S.now = target; break; }
      S.now = null;
      if (popPending()) { stop = 'pop'; break; }
      if (userMatchToday()) { stop = 'match'; break; }
      const r = processDay(null);
      if (r.summary) { busy(false); await saveNow(); render(); return showSummary(r.summary); }
      if (S.sacked) { busy(false); saveNow(); render(); return showSacked(); }
      if (S.pending.length) { stop = 'ev'; if (curDay().date > target) S.now = target; break; }
      busy(true, `Symulacja… ${fmtDate(curDay().date)}`);
      await new Promise(r => setTimeout(r, 0));
    }
    busy(false); saveSoon(); render();
    if (S.pending.length) ACT.event(S.pending[0].uid);
    else if (winPopups()) {}
    else if (stop === 'match') { toast('⚽ Dzień meczowy'); ACT.prematch(); }
  } finally { running = false; busy(false); }
}
ACT.simdays = n => simTo(todayMs() + +n * 864e5);
ACT.simto = ms => { closeModal(); simTo(+ms); };
ACT.gocal = () => { navPush(); UI.tab = 'comps'; UI.compTab = 'cal'; UI.calM = null; render(); };
/* wyskakujące okna: otwarcie zimowego okna i Deadline Day (raz) */
const popPending = () => S.day < S.cal.length && ((S.ddPop === S.day && S._ddShown !== S.day + S.season * 1000) || (S.winPop === S.day && S._wpShown !== S.day + S.season * 1000));
function winPopups() {
  if (!atEntry() || S.pending.length) return false;
  if (S.ddPop === S.day && S._ddShown !== S.day + S.season * 1000) { S._ddShown = S.day + S.season * 1000; const dl = (S.dl ? S.dl.deals : []).map(pget).filter(Boolean);
    modal(`<div class="ddhead">⏰ DEADLINE DAY</div><p>Dziś o północy zamyka się okno transferowe! Agenci dzwonią bez przerwy, kluby szukają ostatnich wzmocnień.</p>
      <div class="kv"><div><span>Oferty za Twoich zawodników</span><b>${S.offers.length}</b></div><div><span>Budżet transferowy</span><b>${money(userClub().tb)}</b></div></div>
      ${dl.length ? `<h3>🔥 Okazje last minute (−20%)</h3><div class="list">${dl.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${esc(clubName(p))} • ${p.age} l.</small></div>${ovrTag(p.ovr)}<b>${money(askPrice(p))}</b></div>`).join('')}</div>` : ''}
      <div class="btns"><button class="btn pri sp" data-act="nav" data-arg="market">💼 Transfery</button><button class="btn" data-act="close">Później</button></div>`); return true; }
  if (S.winPop === S.day && S._wpShown !== S.day + S.season * 1000) { S._wpShown = S.day + S.season * 1000; const w = winDates();
    modal(`<h2>🟢 Zimowe okno transferowe otwarte!</h2><p>Od dziś do <b>${fmtDate(w.win[1])}</b> możesz kupować, sprzedawać i wypożyczać zawodników. Ostatni dzień okna to Deadline Day – wtedy pojawią się okazje last minute.</p>
      <div class="btns"><button class="btn pri sp" data-act="nav" data-arg="market">💼 Transfery</button><button class="btn" data-act="close">OK</button></div>`); return true; }
  return false;
}
function windowBanner() {
  if (S.day >= S.cal.length) return '';
  const w = winDates(), t = todayMs(), D = 864e5;
  if (isDeadline() && windowOpen()) return `<div class="card ddcard" data-act="nav" data-arg="market"><div class="row"><span style="font-size:24px">⏰</span><div class="sp"><b>DEADLINE DAY – okno zamyka się dziś!</b><br><small>Oferty: ${S.offers.length} • okazje last minute w Transferach</small></div><small>›</small></div></div>`;
  if (windowOpen()) { const end = curLs() <= 3 ? w.sum[1] : w.win[1], dd = Math.max(0, Math.round((end - t) / D)); return `<div class="card"><div class="row"><span style="font-size:20px">🟢</span><div class="sp"><b>Okno transferowe otwarte</b><br><small class="mut">Zamknięcie: ${fmtDate(end)} (za ${plural(dd, 'dzień', 'dni', 'dni')})</small></div></div></div>`; }
  if (S.day < w.wo) { const dd = Math.round((w.win[0] - t) / D); if (dd <= 21) return `<div class="card"><div class="row"><span style="font-size:20px">🔒</span><div class="sp"><b>Zimowe okno za ${plural(dd, 'dzień', 'dni', 'dni')}</b><br><small class="mut">Otwarcie: ${fmtDate(w.win[0])}</small></div></div></div>`; }
  return '';
}

/* ---------- SKŁAD ---------- */
function ctxTeam() { if (UI.nt && S.nt) { const t = ntTeam(S.nt); fixLineup(t); syncNT(t); return t; } const t = userClub(); fixLineup(t, emergencyFor(t)); return t; }
function commit(t) { if (t._st) syncNT(t); saveSoon(); }
function vSquad() {
  const t = ctxTeam();
  const head = (S.nt ? tabs([['club', '🏟️ Klub'], ['nt', flag(S.nt) + ' Reprezentacja']], UI.nt ? 'nt' : 'club', 'sqnt') : '') + tabs([['pitch', 'Boisko'], ['list', 'Kadra'], ['tactic', 'Taktyka'], ...(UI.nt ? [] : [['train', 'Trening'], ['stats', 'Statystyki']])], UI.sqTab, 'sqtab');
  if (UI.sqTab === 'train' && !UI.nt) return head + vTraining(t);
  if (UI.sqTab === 'list') return head + vSquadList(t);
  if (UI.sqTab === 'stats' && !UI.nt) return head + vSquadStats(t);
  if (UI.sqTab === 'tactic') return head + vTactic(t);
  const slots = slotsOf(t.formation);
  const inL = new Set(t.lineup), inB = new Set(t.bench);
  const chip = (p, i) => { const s = slots[i]; const v = ovrAt(p, s.pos); return `<div class="pchip ${UI.sel === p.id ? 'sel' : ''}" style="left:${s.x}%;bottom:${s.y}%" data-act="tap" data-arg="${p.id}">
      ${typeof kitSVG === 'function' ? `<div class="kit">${kitSVG(t.col, 26)}</div>` : ''}${ovrTag(v)}<div class="nm">${esc(lastName(p))}</div><div class="pp">${POS_PL[s.pos]}${p.pos !== s.pos && !(p.alt || []).includes(s.pos) ? ' ⚠' : ''} ${moraleLabel(p.mor)[0]}</div><div class="fb"><i style="width:${p.fit}%;background:${p.fit < 60 ? 'var(--bad)' : p.fit < 80 ? 'var(--warn)' : 'var(--acc)'}"></i></div></div>`; };
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
    ${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${flag(p.nat)} ${p.age} l. ${morale(p)} ${formArrow(p.form)} ${stTag(p)} ${p.con <= 1 && !p.loan && p.tid === S.user ? '<span class="pill y">kontrakt</span>' : ''} ${p.listed ? '<span class="pill">lista</span>' : ''} ${p.loan ? '<span class="pill">wyp.</span>' : ''}</small></div>
    <div class="fitb">${bar(p.fit)}</div>${ovrTag(p.ovr)}<button class="ibtn" data-act="info" data-arg="${p.id}">i</button></div>`;
}
const devArrow = p => { const d = p.ovrS != null && p.tid === S.user ? p.ovr - p.ovrS : 0; return d ? `<span class="dev ${d > 0 ? 'good' : 'bad'}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>` : '<span class="dev"></span>'; };
ACT.sqf = k => { UI.sqF = k; render(); };
/* ---------- TRENING ---------- */
const TR_FOCUS = { bal: ['⚖️ Zrównoważony', 'lekki nacisk na środek pola – pomocnicy rozwijają się nieco szybciej, reszta normalnie'], fit: ['🫁 Kondycja', 'szybsza regeneracja całej drużyny'], att: ['⚔️ Atak', 'napastnicy rozwijają się szybciej'], def: ['🛡 Obrona', 'obrońcy i bramkarze rozwijają się szybciej'] };
function vTraining(t) {
  const ti = S.trInt || 0, ps = t.players.slice().sort((a, b) => a.age - b.age || b.pot - a.pot);
  return `<div class="card"><h2>🏋️ Intensywność</h2><div class="seg">${[-1, 0, 1].map(k => `<button class="btn sm ${ti === k ? 'on' : ''}" data-act="trint" data-arg="${k}">${TR_INT[k].n}</button>`).join('')}</div><small class="mut">${TR_INT[ti].d}</small>
      <div class="kv"><div><span>Tempo rozwoju</span><b>${Math.round(TR_INT[ti].dev * 100)}%</b></div><div><span>Ryzyko kontuzji</span><b class="${TR_INT[ti].inj > 1 ? 'bad' : ''}">${Math.round(TR_INT[ti].inj * 100)}%</b></div><div><span>Ośrodek treningowy</span><b>${S.fac.train}/5</b></div><div><span>Trener przygotowania</span><b>${S.staff && S.staff.fit ? S.staff.fit.ab : '–'}</b></div></div></div>
    <div class="card"><h2>🎯 Nacisk drużyny</h2><div class="seg wrap">${Object.entries(TR_FOCUS).map(([k, v]) => `<button class="btn sm ${(t.training || 'bal') === k ? 'on' : ''}" data-act="trfocus" data-arg="${k}">${v[0]}</button>`).join('')}</div><small class="mut">${TR_FOCUS[t.training || 'bal'][1]}. Najszybciej rozwijają się młodzi i grający regularnie.</small></div>
    <div class="card list"><h2 style="margin:4px 0 8px">👤 Trening indywidualny</h2><small class="mut">Trening specjalny przyspiesza wybraną umiejętność, gdy zawodnik robi postęp. ▲▼ – zmiana OVR od początku sezonu.</small>
      ${ps.map(p => { const names = p.pos === 'GK' ? ATTR_GK : ATTR_OUT; return `<div class="prow" style="flex-wrap:wrap">${posTag(p.pos)}<div class="pn" data-act="info" data-arg="${p.id}">${esc(p.n)}<small>${p.age} l. • ${p.st && p.st.apps ? Math.round(p.pt * 100) + '% minut' : 'jeszcze bez meczów'}${p.retrain ? ` • 🔄 ${POS_PL[p.retrain.pos]} ${Math.round(p.retrain.prog / 12 * 100)}%` : ''}</small></div>${ovrTag(p.ovr)}${devArrow(p)}<span class="potc">${p.pot}</span>
        <select data-change="pfocus" data-pid="${p.id}" style="flex:1 1 100%;margin-top:4px"><option value="">Trening specjalny: brak</option>${names.map((n, i) => `<option value="${i}" ${p.focus === i ? 'selected' : ''}>Trening specjalny: ${n} (${Math.round(p.a[i])})</option>`).join('')}</select></div>`; }).join('')}</div>`;
}
ACT.trint = k => { S.trInt = +k; saveSoon(); toast(`Intensywność treningu: ${TR_INT[+k].n.toLowerCase()}.`, 'ok'); render(); };
ACT.trfocus = k => { userClub().training = k; saveSoon(); render(); };
function vSquadList(t) {
  const s = UI.listSort;
  const SF = { all: ['Wszyscy', () => true], inj: ['🚑 Niedostępni', p => p.inj > 0 || p.susp > 0], con: ['📝 Kończące się umowy', p => p.con <= 1 && !p.loan], list: ['🏷️ Na sprzedaż', p => p.listed], young: ['🌱 Do 21 lat', p => p.age <= 21] }, fk = t._st ? 'all' : (UI.sqF || 'all');
  const ps = t.players.filter(p => SF[fk][1](p)).sort((a, b) => s === 'ovr' ? b.ovr - a.ovr : s === 'age' ? a.age - b.age : s === 'fit' ? a.fit - b.fit : s === 'mor' ? a.mor - b.mor : s === 'val' ? b.val - a.val : POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);
  const tot = sum(t.players.map(p => p.val || 0)), wages = sum(t.players.map(p => p.wage || 0));
  return `<div class="flt"><select data-change="lsort">${[['pos', 'wg pozycji'], ['ovr', 'wg ogólnej'], ['age', 'wg wieku'], ['fit', 'wg kondycji'], ['mor', 'wg morale'], ['val', 'wg wartości']].map(([k, n]) => `<option value="${k}" ${s === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${t._st ? '' : `<div class="chipsrow">${Object.entries(SF).map(([k, v]) => `<button class="fchip ${fk === k ? 'on' : ''}" data-act="sqf" data-arg="${k}">${v[0]}</button>`).join('')}</div>`}
    ${t._st ? '' : `<small class="mut">Wartość kadry: ${money(tot)} • pensje: ${money(wages)}/tydz.</small>`}
    <div class="card list"><div class="prow lh"><span class="pn mut">Zawodnik</span><span class="mini">Kond.</span><span class="lhc">OVR</span><span class="dev"></span><span class="lhc">POT</span></div>${ps.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${flag(p.nat)} ${p.age} l. • ${p.tid === S.user ? ROLES[roleOf(p)][0].replace(' zawodnik', '') : money(p.val)} ${morale(p)} ${stTag(p)}</small></div>
      <span class="mini">${Math.round(p.fit)}%</span>${ovrTag(p.ovr)}${devArrow(p)}<span class="potc">${p.pot}</span></div>`).join('')}</div>`;
}
const TAC = [['press', 'Pressing', ['Niski blok', 'Średni', 'Wysoki pressing'], 'Wysoki pressing częściej odbiera piłkę, ale szybciej męczy zawodników.'],
  ['tempo', 'Tempo', ['Cierpliwe', 'Normalne', 'Szybkie'], 'Szybkie tempo daje więcej strzałów, ale gorszej jakości.'],
  ['line', 'Linia obrony', ['Głęboka', 'Normalna', 'Wysoka'], 'Wysoka linia pomaga w ataku, ale zostawia rywalom miejsce na sam na sam.'],
  ['width', 'Szerokość', ['Wąsko', 'Normalnie', 'Szeroko'], 'Gra szeroka angażuje skrzydłowych i daje więcej rożnych; wąska – napastnika i „dziesiątkę”.']];
function tacHtml(tac, act) {
  tac = tac || {};
  return TAC.map(([k, n, opts, d]) => `<div style="margin:8px 0"><b>${n}</b><div class="seg">${opts.map((o, i) => `<button class="btn sm ${(tac[k] || 0) === i - 1 ? 'on' : ''}" data-act="${act}" data-arg="${k}:${i - 1}">${o}</button>`).join('')}</div><small class="mut">${d}</small></div>`).join('');
}
CHG.noop = () => { };
ACT.settac = a => { const [k, v] = a.split(':'), t = ctxTeam(); t.tac = t.tac || {}; t.tac[k] = +v; commit(t); render(); };
ACT.mtac = a => { const [k, v] = a.split(':'), s = uside(); s.tac[k] = +v; s.t.tac = Object.assign({}, s.t.tac || {}, { [k]: +v }); M.dirty = true; ev(M, 'info', s, `📋 ${s.t.name}: ${TAC.find(x => x[0] === k)[1].toLowerCase()} – ${TAC.find(x => x[0] === k)[2][+v + 1].toLowerCase()}.`); upd(); ACT.mtactic(); };
function vTactic(t) {
  const sp = t.sp || {}, ps = (t.players || []).filter(p => p.pos !== 'GK').slice().sort((a, b) => b.ovr - a.ovr);
  const spSel = (k, n, key) => `<div><span>${n}</span><select data-change="setsp" data-k="${k}"><option value="">Automatycznie</option>${ps.slice().sort((a, b) => (k === 'ck' ? b.a[2] - a.a[2] : k === 'fk' ? (b.a[1] + b.a[2]) - (a.a[1] + a.a[2]) : b.a[1] - a.a[1])).slice(0, 10).map(p => `<option value="${p.id}" ${sp[k] === p.id ? 'selected' : ''}>${esc(lastName(p))} (${key(p)})</option>`).join('')}</select></div>`;
  const spCard = t._st ? '' : `<div class="card"><h2>Stałe fragmenty gry</h2><div class="kv">
      ${spSel('pen', '⚽ Rzuty karne', p => 'STR ' + Math.round(p.a[1]))}${spSel('fk', '🎯 Rzuty wolne', p => 'STR ' + Math.round(p.a[1]) + '/POD ' + Math.round(p.a[2]))}${spSel('ck', '🚩 Rzuty rożne', p => 'POD ' + Math.round(p.a[2]))}</div>
      <small class="mut">Główki po rożnych najczęściej wygrywają silni (FIZ) środkowi obrońcy i napastnicy.</small></div>
    <div class="card"><h2>Rotacja</h2><div class="row"><span class="sp">Asystent automatycznie wstawia wypoczętych zmienników za zawodników z kondycją poniżej 70%</span><button class="btn sm ${S.settings.autoRot !== false ? 'pri' : ''}" data-act="autorot">${S.settings.autoRot !== false ? 'Włączona' : 'Wyłączona'}</button></div></div>`;
  const dev = clamp(t.lineup.reduce((s0, id, i) => { const pos = slotsOf(t.formation)[i] && slotsOf(t.formation)[i].pos; return s0 + (pos && pos !== 'GK' && t.duty && t.duty[i] != null ? t.duty[i] - DUTY_DEF[pos] : 0); }, 0), -5, 5);
  return `<div class="card"><h2>Styl gry</h2>${presetHtml(t, 'preset')}
      ${(t.tpre || []).length ? `<h3>Własne taktyki</h3>${t.tpre.map((p, i) => `<div class="row"><span class="sp">📁 ${esc(p.n)} <small class="mut">${p.f} • ${MENT[p.ment]}</small></span><button class="btn sm" data-act="cpreload" data-arg="${i}">Wczytaj</button><button class="btn sm" data-act="cpredel" data-arg="${i}">✕</button></div>`).join('')}` : ''}
      <div class="btns"><button class="btn sm full" data-act="cpresave">💾 Zapisz obecne ustawienia jako własną taktykę</button></div></div>
    <div class="card"><h2>Instrukcje drużynowe</h2>${tacHtml(t.tac, 'settac')}</div>
    <div class="card"><h2>Role i zadania</h2><small class="mut">Zadanie „Atak” = więcej strzałów i wsparcia z przodu kosztem obrony; „Obrona” – odwrotnie. 🎩 Rozgrywający: przez niego idzie większość podań kluczowych (najlepiej dobry podający).</small>
      ${dutyHtml(t)}<small class="${Math.abs(dev) >= 3 ? 'warn' : 'mut'}">Bilans zadań: ${dev > 0 ? '+' + dev + ' (ofensywnie – ryzyko z tyłu)' : dev < 0 ? dev + ' (defensywnie – mniej siły w ataku)' : '0 (zrównoważony)'}</small></div>` + spCard + `<div class="card"><h2>Formacja: ${esc(t.formation)}</h2>${[['4', 'Czterech obrońców'], ['3', 'Trzech obrońców'], ['5', 'Pięciu obrońców']].map(([d, n]) => `<h3>${n}</h3><div class="seg wrap">${Object.keys(FORMATIONS).filter(f => f[0] === d).map(f => `<button class="btn sm ${t.formation === f ? 'on' : ''}" data-act="setform" data-arg="${f}">${f}</button>`).join('')}</div>`).join('')}
      <small class="mut">Zmiana formacji resetuje role i zadania. Ustawienie zawodników zobaczysz w zakładce Boisko.</small></div>
    <div class="card"><h2>Mentalność</h2><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn sm ${(t.ment || 'bal') === k ? 'on' : ''}" data-act="setment" data-arg="${k}">${v}</button>`).join('')}</div>
    <small class="mut">Ofensywna: więcej strzałów, ale też więcej okazji rywala. Defensywna: mniej ryzyka.</small></div>
    ${t._st ? '' : `<div class="card"><div class="row"><span class="sp">🏋️ Trening drużyny i indywidualny</span><button class="btn sm" data-act="sqtab" data-arg="train">Otwórz</button></div></div>`}`;
}
ACT.sqnt = a => { UI.nt = a === 'nt'; UI.sel = null; render(); };
ACT.sqtab = a => { if (a !== UI.sqTab) navPush(); UI.sqTab = a; UI.sel = null; render(); };
CHG.lsort = v => { UI.listSort = v; render(); };
CHG.training = v => { userClub().training = v; saveSoon(); };
ACT.setform = f => { const t = ctxTeam(); if (t.formation !== f) { t.duty = null; t.pm = null; } t.formation = f; autoPick(t, f); commit(t); render(); };
/* style gry: gotowe i własne (maks. 3) */
function presetHtml(t, act) {
  const cur = k => { const p = TAC_PRE[k]; return (t.ment || 'bal') === p[1] && Object.keys(p[2]).every(x => ((t.tac || {})[x] || 0) === p[2][x]); };
  return `<div class="seg wrap">${Object.entries(TAC_PRE).map(([k, p]) => `<button class="btn sm ${cur(k) ? 'on' : ''}" data-act="${act}" data-arg="${k}">${p[0]}</button>`).join('')}</div>
    <small class="mut">${(Object.entries(TAC_PRE).find(([k]) => cur(k)) || [0, [0, 0, 0, 'Własne ustawienia.']])[1][3]}</small>`;
}
ACT.preset = k => { const t = ctxTeam(), p = TAC_PRE[k]; t.ment = p[1]; t.tac = Object.assign({}, p[2]); commit(t); toast(`Styl gry: ${p[0]}`, 'ok'); render(); };
ACT.cpresave = () => { const t = ctxTeam(); t.tpre = t.tpre || []; if (t.tpre.length >= 3) return toast('Maksymalnie 3 własne taktyki – usuń którąś.', 'bad'); const st = Object.entries(TAC_PRE).find(([k, p]) => (t.ment || 'bal') === p[1] && Object.keys(p[2]).every(x => ((t.tac || {})[x] || 0) === p[2][x])), n = `${st ? st[1][0].replace(/^\S+\s/, '') : 'Własna'} ${t.formation}`; t.tpre.push({ n, f: t.formation, ment: t.ment || 'bal', tac: Object.assign({}, t.tac || {}), duty: t.duty ? t.duty.slice() : null, pm: t.pm }); commit(t); toast(`💾 Zapisano taktykę: ${n}`, 'ok'); render(); };
ACT.cpreload = i => { const t = ctxTeam(), p = (t.tpre || [])[+i]; if (!p) return; if (p.f !== t.formation) { t.formation = p.f; autoPick(t, p.f); } t.ment = p.ment; t.tac = Object.assign({}, p.tac); t.duty = p.duty ? p.duty.slice() : null; t.pm = p.pm; commit(t); toast(`Wczytano: ${p.n}`, 'ok'); render(); };
ACT.cpredel = i => { const t = ctxTeam(); if (!confirm('Usunąć tę taktykę?')) return; t.tpre.splice(+i, 1); commit(t); render(); };
/* role i zadania w wyjściowej jedenastce */
function dutyHtml(t) {
  const sl = slotsOf(t.formation);
  return t.lineup.map((id, i) => { const p = pget(id), pos = sl[i] && sl[i].pos; if (!p || !pos || pos === 'GK') return '';
    const d = t.duty && t.duty[i] != null ? t.duty[i] : DUTY_DEF[pos], nm = DUTY_NAMES[pos] || ['Obrona', 'Wsparcie', 'Atak'];
    return `<div class="duty"><div class="row">${posTag(pos)}<b class="sp">${esc(lastName(p))}</b><small class="mut">${esc(nm[d + 1])}</small><button class="btn sm ${t.pm === i ? 'pri' : ''}" data-act="setpm" data-arg="${i}" title="Rozgrywający">🎩</button></div>
      <div class="seg">${['🛡 Obrona', '⚖ Wsparcie', '⚔ Atak'].map((x, k) => `<button class="btn sm ${d === k - 1 ? 'on' : ''}" data-act="setduty" data-arg="${i}:${k - 1}">${x}</button>`).join('')}</div></div>`; }).join('');
}
ACT.setduty = a => { const [i, d] = a.split(':').map(Number), t = ctxTeam(); t.duty = t.duty || []; while (t.duty.length < 11) t.duty.push(null); t.duty[i] = d === DUTY_DEF[slotsOf(t.formation)[i].pos] ? null : d; commit(t); render(); };
ACT.setpm = a => { const t = ctxTeam(); t.pm = t.pm === +a ? null : +a; commit(t); toast(t.pm != null ? `🎩 Rozgrywający: ${lastName(pget(t.lineup[+a]))} – przez niego idzie gra.` : 'Bez wyznaczonego rozgrywającego.', 'ok'); render(); };
ACT.setment = k => { const t = ctxTeam(); t.ment = k; commit(t); render(); };
ACT.autopick = () => { const t = ctxTeam(); autoPick(t); commit(t); UI.sel = null; render(); const b = bestFormation(t), cur = lineupAvg(t);
  if (b && b.f !== t.formation && b.avg >= cur + 1.5) { modal(`<h2>🧑‍💼 Asystent</h2><p>Skład wybrany. Ale do naszej kadry lepiej pasuje formacja <b>${esc(b.f)}</b> – średnia jedenastki ${b.avg.toFixed(1)} zamiast ${cur} (mniej zawodników na obcych pozycjach).</p><div class="btns"><button class="btn pri sp" data-act="setformx" data-arg="${esc(b.f)}">Zmień na ${esc(b.f)}</button><button class="btn" data-act="close">Zostaw</button></div>`); } else toast('Skład wybrany automatycznie.'); };
ACT.setformx = f => { closeModal(); ACT.setform(f); toast(`Formacja: ${f}`, 'ok'); };
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
const ATTR_HELP = { TEM: 'Tempo – szybkość i przyspieszenie', STR: 'Strzały – wykończenie, siła i technika strzału', POD: 'Podania – krótkie, długie, dośrodkowania, wizja', DRY: 'Drybling – kontrola piłki, zwinność, opanowanie', OBR: 'Obrona – odbiór, krycie, gra głową w obronie', FIZ: 'Fizyczność – siła, wytrzymałość, agresja',
  RZU: 'Rzuty – parady i interwencje w powietrzu', CHW: 'Chwytanie – pewność łapania piłki', WYK: 'Wykopy – wznowienia i gra nogami', REF: 'Refleks – reakcja na strzały z bliska', SZY: 'Szybkość – wyjścia z bramki i sprint', UST: 'Ustawianie – czytanie gry i pozycja w bramce' };
ACT.rushback = id => { const p = pget(+id); if (!confirm(`Przyspieszyć powrót ${p.n}? Zawodnik będzie gotowy do gry, ale przez 3 tygodnie ryzyko urazu jest trzykrotnie wyższe.`)) return; p.inj = 0; p.fit = Math.min(p.fit, 72); p._rushed = absDay() + 21; saveSoon(); toast(`${p.n} wraca do treningów.`, 'ok'); ACT.info(id); render(); };
ACT.attrhelp = k => toast(ATTR_HELP[k] || k);
const potTxt = p => { if (know(p) < 30) return '?'; const r = ovrRange(p, true); return r[0] === r[1] ? r[0] : r[0] + '–' + r[1]; };
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
    act = `<div class="btns"><button class="btn sm pri" data-act="chat" data-arg="${p.id}">💬 Porozmawiaj</button></div>
      ${p.loan ? `<p class="mut">Wypożyczony z ${esc(club(p.loan.from).name)} do końca sezonu.${p.loan.buy ? (p.loan.buy.obl ? ` Obowiązkowy wykup po sezonie: <b>${money(p.loan.buy.price)}</b>.` : ` Opcja wykupu: <b>${money(p.loan.buy.price)}</b>.`) : ''}</p>${p.loan.buy && !p.loan.buy.obl ? `<div class="btns"><button class="btn sm pri full" data-act="exbuy" data-arg="${p.id}">✅ Wykup teraz (${money(p.loan.buy.price)})</button></div>` : ''}<div class="btns"><button class="btn sm red" data-act="release" data-arg="${p.id}">Zakończ wypożyczenie</button></div>` : `
      <h3>Kontrakt (${plural(p.con, 'rok', 'lata', 'lat')}) • rola: ${ROLES[roleOf(p)][0]}</h3>
      <div class="btns"><button class="btn sm pri" data-act="rennego" data-arg="${p.id}">📝 Negocjuj nowy kontrakt</button></div>
      <div class="kv"><div><span>Rola w składzie</span><select data-change="setrole" data-pid="${p.id}">${ROLE_ORD.slice().reverse().filter(r => r !== 'pros' || p.age <= 21).map(r => `<option value="${r}" ${roleOf(p) === r ? 'selected' : ''}>${ROLES[r][0]}</option>`).join('')}</select></div></div>
      <small class="mut">Zawodnik oczekuje roli: <b>${ROLES[expectedRole(p)][0].toLowerCase()}</b>. Rola to obietnica minut – ${ROLES[roleOf(p)][2] ? `co najmniej ok. ${Math.round(ROLES[roleOf(p)][2] * 100)}% gry` : 'bez gwarancji gry'}. Degradacja obniża morale, a niespełniona obietnica frustruje.</small>
      <div class="btns"><button class="btn sm ${p.listed ? 'pri' : ''}" data-act="list" data-arg="${p.id}">${p.listed ? '✔ Na liście transferowej' : 'Wystaw na sprzedaż'}</button><button class="btn sm" data-act="loanout" data-arg="${p.id}">Wypożycz</button><button class="btn sm red" data-act="release" data-arg="${p.id}">Rozwiąż (${money(p.wage * 20 * p.con)})</button></div>`}`;
  } else if (p.tid === -3) {
    act = `<div class="btns"><button class="btn pri sp" data-act="promote" data-arg="${p.id}">⬆ Awans do pierwszego zespołu</button><button class="btn red" data-act="relyouth" data-arg="${p.id}">Zwolnij</button></div>`;
  } else if (p.tid !== -2) {
    const pi = playerInterest(p);
    act = `<div class="row" style="margin-top:6px"><span class="sp mut">Zainteresowanie transferem</span><b class="${pi.ok ? 'good' : 'bad'}">${pi.ok ? '👍 otwarty na rozmowy' : '👎 nie chce'}</b></div>${pi.ok ? '' : `<small class="mut">${esc(pi.msg)}</small>`}<div class="btns">
      ${p.tid === -1 ? `<button class="btn pri sp" data-act="nego" data-arg="${p.id}">✍️ Podpisz (wolny)</button>` : `<button class="btn pri sp" data-act="nego" data-arg="${p.id}">💰 Złóż ofertę</button><button class="btn" data-act="loanopts" data-arg="${p.id}">Wypożycz</button>`}${canPre(p) ? `<button class="btn full" data-act="prenego" data-arg="${p.id}">📝 Prekontrakt – za darmo od lata</button>` : p.preTo && p.preTo.club === S.user ? '<span class="pill">📝 Prekontrakt podpisany – dołączy latem</span>' : ''}
      <button class="btn" data-act="short" data-arg="${p.id}">${S.short.includes(p.id) ? '★ Obserwowany' : '☆ Obserwuj'}</button></div>
      ${k < 100 ? `<div class="btns"><button class="btn sm full" data-act="scoutp" data-arg="${p.id}">🔍 Wyślij skauta (wiedza ${k}%)</button></div>` : ''}`;
  }
  if (!mine && p.bb && p.bb.club === S.user && p.bb.until >= S.season) act += `<div class="btns"><button class="btn sm pri full" data-act="buyback" data-arg="${p.id}">🔁 Odkup (klauzula): ${money(p.bb.price)}</button></div>`;
  if (mine) act += objHtml(p);
  if (S.nt && p.nat === S.nt && p.tid !== -1) {
    const sq = S.ntTeams[S.nt].sq;
    act += `<div class="btns"><button class="btn sm full" data-act="callup" data-arg="${p.id}">${sq.includes(p.id) ? '✔ Powołany – usuń z kadry' : `${flag(S.nt)} Powołaj do reprezentacji`}</button></div>`;
  }
  if (UI.pcId !== p.id) { UI.pcId = p.id; UI.pcTab = 'ov'; }
  const own = mine || p.tid === -3;
  const TABS = [['ov', 'Przegląd'], ['st', 'Statystyki'], ...(own ? [['dev', 'Rozwój']] : []), ...(mine ? [['ct', 'Kontrakt']] : []), ['hi', 'Historia']];
  if (!TABS.some(t => t[0] === UI.pcTab)) UI.pcTab = 'ov';
  const kv = rows => `<div class="kv">${rows.filter(Boolean).map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>`;
  const body = {
    ov: () => `${p.inj ? `<div class="card" style="margin:6px 0;border-color:var(--bad)"><b>🚑 ${esc(p.injT || 'Kontuzja')}</b><br><small class="mut">Fizjoterapeuta szacuje powrót za ok. ${Math.ceil(p.inj / 7)} tyg. (${plural(Math.ceil(p.inj), "dzień", "dni", "dni")}).${p.injN > 1 ? ` To już ${p.injN}. uraz tego zawodnika.` : ''}</small>${mine && p.inj <= 14 ? `<div class="btns"><button class="btn sm red" data-act="rushback" data-arg="${p.id}">⚡ Przyspiesz powrót (duże ryzyko nawrotu)</button></div>` : ''}</div>` : ''}${p._rushed > absDay() ? '<small class="warn">⚠️ Po przyspieszonym powrocie – podwyższone ryzyko urazu przez 3 tygodnie.</small><br>' : ''}${stTag(p)}${own ? `<small class="mut">Charakter: <b>${pers(p)}</b> – ${PERS_DESC[pers(p)]}</small><div class="fxl">${Object.entries(TRAITS).map(([k, n]) => `<span class="pill">${n}: ${traitWord(traits(p)[k], TRAIT_FEM[k])}</span>`).join(' ')}</div>` : `<small class="mut">Charakter: ? (poznasz go po transferze)</small>`}
      ${kv([['Wiek', p.age], ['Potencjał', `<span class="potv">${potTxt(p)}</span>${know(p) >= 30 && p.pot > p.ovr ? ` <small class="good">(+${Math.max(0, Math.round((ovrRange(p, true)[0] + ovrRange(p, true)[1]) / 2) - Math.round((r[0] + r[1]) / 2))})</small>` : ''}`], ['Kondycja', Math.round(p.fit) + '%'], ['Morale', moraleLabel(p.mor).join(' ')], ['Forma', formLabel(p.form)], ['Rytm meczowy', Math.round(p.shp) + '%'], ['Wartość', money(p.val)], ['Status', playerStatus(p)],
        !mine && releaseClause(p) ? ['Klauzula odstępnego', money(releaseClause(p))] : null])}
      ${known && typeof radarSVG === 'function' ? `<div style="text-align:center;margin-top:6px">${radarSVG(at, names, { size: 180 })}</div>` : ''}
      <small class="mut">${p.pos === 'GK' ? 'RZU – rzuty (parady), CHW – chwytanie, WYK – wykopy, REF – refleks, SZY – szybkość, UST – ustawianie' : 'TEM – tempo, STR – strzały, POD – podania, DRY – drybling, OBR – obrona, FIZ – fizyczność'}</small><br>
      ${known && otherPos.length ? `<small class="mut">Inne pozycje: ${otherPos.map(([q, v]) => `${POS_PL[q]} ${v}`).join(' • ')}</small>` : ''}`,
    st: () => `<h3>Bieżący sezon</h3>${kv([['Mecze', p.st.apps], ['Minuty', p.st.mins], ['Gole', p.st.g], ['Asysty', p.st.a], ['Średnia ocena', avgR], ['Kartki', `${p.st.y} 🟨 / ${p.st.r} 🟥`], ['Gole w lidze', p.lg || 0], ['Gole w pucharach', p.eg || 0]])}
      <h3>Kariera</h3>${kv([['Mecze', p.car.apps], ['Gole', p.car.g], ['Asysty', p.car.a || 0], ['Reprezentacja', `${p.caps} m., ${p.ng} g.`]])}`,
    dev: () => devBlock(p),
    ct: () => kv([['Pensja', money(p.wage) + '/t'], ['Kontrakt', p.con + ' l.'], p.sellOn ? ['Odsprzedaż', `${Math.round(p.sellOn.pct * 100)}% dla ${esc(club(p.sellOn.club).short)}`] : null]) + act,
    hi: () => (p.hist || []).length ? `${p.hist.length >= 2 && typeof sparkSVG === 'function' ? `<div>${sparkSVG(p.hist.map(h => h.ovr).concat(p.ovr), { w: 300, h: 50 })}</div><small class="mut">Rozwój OVR z sezonu na sezon</small>` : ''}<div class="scrollx"><table class="rank"><tr><th>Sezon</th><th>Klub</th><th>OVR</th><th>M</th><th>G</th><th>A</th></tr>${p.hist.slice().reverse().map(h => `<tr><td>${SEASON_LABEL(h.s)}</td><td>${esc(h.c || '–')}</td><td>${h.ovr}</td><td>${h.m}</td><td>${h.g}</td><td>${h.a}</td></tr>`).join('')}</table></div>`
      : empty('📜', 'Brak historii', 'Historia kariery zapisuje się na koniec każdego sezonu.'),
  }[UI.pcTab]();
  const abar = mine ? (UI.pcTab === 'ct' ? '' : `<div class="btns"><button class="btn sm pri" data-act="chat" data-arg="${p.id}">💬 Porozmawiaj</button></div>`) : act;
  modal(`<div class="fut ${cardCls}">
      <div class="fl"><div class="big">${r[0] === r[1] ? r[0] : r[0] + '–' + r[1]}</div><div>${POS_PL[p.pos]}</div><div class="potbig"><small>POT</small>${potTxt(p)}</div><div class="fg">${flag(p.nat)}</div>${c ? badge(c, 'sm') : ''}</div>
      <div class="fr"><div class="fname">${esc(p.n)}</div>
        <div class="attrs">${names.map((n, i) => `<div data-act="attrhelp" data-arg="${n}"><b>${known ? at[i] : '?'}</b> ${n}</div>`).join('')}</div>
        <small>${p.foot === 'L' ? 'Lewa' : 'Prawa'} noga • słabsza ${'★'.repeat(p.wf)} • triki ${'★'.repeat(p.sm)}</small></div></div>
    <div class="row" style="margin:10px 0 4px">${posTag(p.pos)}${(p.alt || []).map(posTag).join('')}<span class="sp mut" style="text-align:right">${esc(clubName(p))}${c ? ' ' + S.countries[c.cc].flag : ''}</span></div>
    ${mine && (S.captain === p.id || squadLeaders().includes(p)) ? `<div class="fxl">${S.captain === p.id ? '<span class="pill g">©️ Kapitan</span> ' : ''}${squadLeaders().includes(p) ? '<span class="pill">👑 Lider szatni</span>' : ''}</div>` : ''}
    ${tabs(TABS, UI.pcTab, 'pctab')}<div class="pcbody">${body}</div>
    <div class="pcbar">${abar}<div class="btns"><button class="btn full" data-act="close">Zamknij</button></div></div>`);
  const t = $('#modal .tabs'), on = t && t.querySelector('.on'); if (on) t.scrollLeft = Math.max(0, on.offsetLeft - (t.clientWidth - on.offsetWidth) / 2);
};
ACT.pctab = k => { UI.pcTab = k; const sc = $('#modal .box') ? $('#modal .box').scrollTop : 0; ACT.info(UI.pcId); const b = $('#modal .box'); if (b) b.scrollTop = Math.min(sc, b.scrollHeight); };
function devBlock(p) {
  const names = p.pos === 'GK' ? ATTR_GK : ATTR_OUT, ms = S.mentors || [];
  const asPupil = ms.find(x => x.p === p.id), asMentor = ms.find(x => x.m === p.id);
  const mentors = userClub().players.filter(m => m.id !== p.id && m.age >= 27 && !ms.some(x => x.m === m.id && x.p !== p.id)).sort((a, b) => traits(b).pro - traits(a).pro).slice(0, 12);
  let h = `<h3>📈 Rozwój indywidualny</h3>
    <div class="kv"><div><span>Trening specjalny</span><select data-change="pfocus" data-pid="${p.id}"><option value="">Brak</option>${names.map((n, i) => `<option value="${i}" ${p.focus === i ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  if (p.tid === S.user && p.pos !== 'GK') h += `<div><span>Nowa pozycja${p.retrain ? ` (${Math.min(100, Math.round(p.retrain.prog / 12 * 100))}%)` : ''}</span><select data-change="pretrain" data-pid="${p.id}"><option value="">Brak</option>${POSITIONS.filter(q => q !== 'GK' && q !== p.pos && !(p.alt || []).includes(q)).map(q => `<option value="${q}" ${p.retrain && p.retrain.pos === q ? 'selected' : ''}>${POS_PL[q]}</option>`).join('')}</select></div>`;
  h += `</div>`;
  if (asMentor) { const u = pget(asMentor.p); h += `<small class="mut">🧑‍🏫 Mentor dla: <b>${esc(u ? u.n : '?')}</b></small>`; }
  else if (p.age <= 23) h += `<div class="kv"><div><span>Mentor${asPupil ? '' : ` (${ms.length}/3)`}</span><select data-change="pmentor" data-pid="${p.id}"><option value="">Brak</option>${mentors.map(m => `<option value="${m.id}" ${asPupil && asPupil.m === m.id ? 'selected' : ''}>${esc(m.n)} (${pers(m)})</option>`).join('')}</select></div></div>`;
  h += `<small class="mut">Trening specjalny podnosi wybrany atrybut, przekwalifikowanie trwa kilka miesięcy (szybciej u profesjonalistów), mentor przyspiesza rozwój i przenosi na ucznia swój charakter.</small>`;
  if (p.tid === -3) h += `<div class="btns"><button class="btn sm" data-act="youthloan" data-arg="${p.id}">🔁 Awansuj i wypożycz (ogrywanie)</button></div>`;
  return h;
}
CHG.pfocus = (v, el) => { const p = pget(+el.dataset.pid); p.focus = v === '' ? null : +v; saveSoon(); toast(v === '' ? 'Trening specjalny wyłączony.' : 'Trening specjalny ustawiony.', 'ok'); };
CHG.pretrain = (v, el) => { const p = pget(+el.dataset.pid); p.retrain = v ? { pos: v, prog: 0 } : null; saveSoon(); toast(v ? `Rozpoczęto przekwalifikowanie na: ${POS_PL[v]}.` : 'Przerwano przekwalifikowanie.', 'ok'); };
CHG.pmentor = (v, el) => { const r = setMentor(+el.dataset.pid, v === '' ? null : +v); toast(r.msg, r.ok ? 'ok' : 'bad'); ACT.info(el.dataset.pid); };
ACT.youthloan = id => { if (!windowOpen()) return toast('Okno transferowe jest zamknięte.', 'bad'); const r = promoteYouth(+id); if (!r.ok) return toast(r.msg, 'bad'); const r2 = loanOut(+id); toast(r2.msg, r2.ok ? 'ok' : 'bad'); closeModal(); render(); };
ACT.chat = id => {
  const p = pget(+id);
  const T = [['time', '⏱️ Czas gry'], ['praise', '👏 Pochwała'], ['crit', '☝️ Uwagi o formie'], ['future', '🔮 Przyszłość i ambicje'], ['promise', '🤝 Obietnica gry'], ['captain', '©️ Opaska kapitana']];
  modal(`<h2>💬 ${esc(p.n)}</h2><small class="mut">${pers(p)} • morale ${moraleLabel(p.mor).join(' ')} • status: ${playerStatus(p)} • minuty: ${Math.round(p.pt * 100)}%</small>
    <div class="choices">${T.map(([k, n]) => `<button class="btn full" data-act="chatq" data-arg="${p.id}:${k}">${n}</button>`).join('')}</div><div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
ACT.chatq = a => {
  const [id, k] = a.split(':'); const p = pget(+id); const r = playerChat(p, k);
  modal(`<h2>💬 ${esc(p.n)}</h2><p class="quote">${esc(r.t)}</p><div class="fxl">${r.fx.map(f => `<span class="pill">${esc(f)}</span>`).join(' ')}</div><div class="btns"><button class="btn pri sp" data-act="info" data-arg="${p.id}">Karta zawodnika</button><button class="btn" data-act="close">OK</button></div>`);
  render();
};
ACT.talk = a => { const [id, k] = a.split(':'); const r = talkTo(+id, k); toast(r.msg); ACT.info(id); };
ACT.renew = a => { const [id, y] = a.split(':').map(Number); const r = renewContract(id, y); toast(r.msg); ACT.info(id); render(); };
ACT.list = id => { const p = pget(+id); p.listed = !p.listed; saveSoon(); toast(p.listed ? 'Wystawiono na sprzedaż – czekaj na oferty (w oknie transferowym).' : 'Wycofano z listy.'); ACT.info(id); render(); };
ACT.release = id => { if (!confirm('Na pewno?')) return; const r = releasePlayer(+id); toast(r.msg); if (r.ok) closeModal(); render(); };
ACT.loanout = id => {
  const p = pget(+id); if (!windowOpen()) return toast('Okno transferowe jest zamknięte.', 'bad');
  const L = loanCandidates(p); if (!L.length) return toast('Brak chętnych klubów.', 'bad');
  modal(`<h2>🔁 Wypożyczenie: ${esc(p.n)}</h2><small class="mut">Wybierz klub. „Szansa gry” to szacowany udział w meczach – im więcej gra, tym szybciej się rozwija.</small>
    ${L.map(x => `<div class="prow" data-act="loanto" data-arg="${p.id}:${x.c.id}">${badge(x.c, 'sm')}<div class="pn">${x.aff ? '🤝 ' : ''}${esc(x.c.name)}<small>${S.countries[x.c.cc].flag} ${esc(S.leagues[x.c.lg].name)} • średnia kadry ${Math.round(teamLevel(x.c))}</small></div><span class="pill ${x.play >= 60 ? 'g' : ''}">gra ~${x.play}%</span></div>`).join('')}
    <div class="btns"><button class="btn full" data-act="info" data-arg="${p.id}">Wróć</button></div>`);
};
ACT.loanto = a => { const [pid, cid] = a.split(':').map(Number); const r = loanOut(pid, cid); toast(r.msg, r.ok ? 'ok' : 'bad'); if (r.ok) closeModal(); render(); };
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
ACT.wbmod = () => { const ut = userClub(), room = wageRoom();
  modal(`<h2>⇄ Budżety</h2><div class="kv"><div><span>Budżet transferowy</span><b>${money(ut.tb)}</b></div><div><span>Budżet płac</span><b>${money(S.board.wb)}/tydz.</b></div><div><span>Obecne pensje</span><b>${money(wageBill(ut))}/tydz.</b></div><div><span>Wolne na pensje</span><b class="${room < 0 ? 'bad' : 'good'}">${money(room)}/tydz.</b></div></div>
    <small class="mut">Przesunięcie 1 000 €/tydz. budżetu płac kosztuje 52 000 € budżetu transferowego (i odwrotnie). Nowi zawodnicy i podwyżki muszą zmieścić się w budżecie płac.</small>
    <div class="seg wrap">${[-10000, -2000, 2000, 10000].map(v => `<button class="btn sm" data-act="wbshift" data-arg="${v}">${v > 0 ? '+' : '−'}${money(Math.abs(v))}/tydz.</button>`).join('')}</div>
    <div class="numrow"><span>Inna kwota (€/tydz., ujemna = z płac do transferów):</span><input class="numin" type="number" inputmode="numeric" step="500" value="0" data-change="wbnum"></div>
    <div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`); };
ACT.wbshift = v => { const r = shiftBudget(+v); toast(r.msg, r.ok ? 'ok' : 'bad'); if (r.ok) { render(); if ($('#modal') && !$('#modal').classList.contains('hidden')) ACT.wbmod(); } };
CHG.wbslide = v => { const n = Math.round(+v || 0); if (n) setTimeout(() => { const r = shiftBudget(n); toast(r.msg, r.ok ? 'ok' : 'bad'); render(); }); };
CHG.wbnum = v => { const n = Math.round(+v || 0); if (n) setTimeout(() => ACT.wbshift(n)); };
let NEG = null;
ACT.prenego = id => {
  const p = pget(+id), ut = userClub(), role0 = expectedRoleIn(p, ut);
  if (!canPre(p)) return toast('Prekontrakt niedostępny.');
  const i = playerInterest(p); if (!i.ok) return toast(i.msg);
  NEG = { pid: p.id, fee: 0, stage: 2, pre: true, role: role0, wage: signingDemand(p, role0), years: p.age >= 31 ? 2 : 4 }; renderNego();
};
ACT.nego = id => {
  const p = pget(+id);
  const free = p.tid === -1;
  const ask0 = free ? 0 : askPrice(p), tb0 = userClub().tb, role0 = expectedRoleIn(p, userClub());
  NEG = { pid: p.id, fee: free ? 0 : Math.max(0, Math.floor(Math.min(ask0, tb0 > ask0 * 0.5 ? tb0 : ask0 * 0.85) / feeStep(ask0)) * feeStep(ask0)), stage: free ? 2 : 1, role: role0, wage: signingDemand(p, role0), years: p.age >= 31 ? 2 : 4 };
  if (!free && !windowOpen()) return toast('Okno transferowe jest zamknięte.');
  if (userClub().players.length >= 32) return toast('Kadra pełna (maks. 32) – najpierw kogoś sprzedaj lub wypożycz.', 'bad');
  const i = playerInterest(p); if (!i.ok) return toast(i.msg);
  renderNego();
};
function feeStep(v) { return v >= 2e7 ? 1e6 : v >= 5e6 ? 5e5 : v >= 1e6 ? 1e5 : 25000; }
/* prowizja agenta (wspólne dla transferu i przedłużenia) */
function extrasHtml(o, agDem, bDem, k) {
  if (o.agent == null) o.agent = agDem;
  o.bonus = 0;
  const tot = o.agent, tb = userClub().tb;
  return `<h3>Prowizja agenta</h3><div class="numrow"><span>Jednorazowo (€):</span><input class="numin" type="number" inputmode="numeric" min="0" step="10000" value="${o.agent}" data-change="${k}agent"></div>
    <small class="mut">Agent oczekuje ok. ${money(agDem)}. Mniej – zawodnik będzie mniej chętny (poniżej 50% agent zrywa rozmowy), więcej – nieco łatwiej o zgodę.</small>
    <div class="row"><span class="sp mut">Prowizja razem</span><b class="${tot > tb ? 'bad' : ''}">${money(tot)}</b></div><small class="mut">Budżet transferowy: ${money(tb)}${NEG && o === NEG && NEG.fee ? ' (płatne obok kwoty transferu)' : ''}</small>`;
}
const exNum = v => Math.max(0, Math.round(+v || 0));
CHG.negagent = v => { NEG.agent = exNum(v); setTimeout(() => renderNego()); };
CHG.renagent = v => { REN.agent = exNum(v); setTimeout(() => renderRen()); };
function renderNego(note) {
  const p = pget(NEG.pid), ut = userClub(), c = clubOf(p);
  if (NEG.stage === 1) {
    modal(`<h2>Oferta transferowa</h2><div class="row">${posTag(p.pos)}<b class="sp">${esc(p.n)}</b>${ovrShow(p)}</div>
      <small class="mut">${esc(c.name)} • wartość ${money(p.val)} • budżet ${money(ut.tb)}</small>
      ${releaseClause(p) ? `<br><small class="warn">📜 Klauzula odstępnego: <b>${money(releaseClause(p))}</b> – wpłata całości (bez rat) gwarantuje zgodę klubu.</small>` : ''}
      <div class="stepper"><button class="btn" data-act="fee" data-arg="-1">−</button><b>${money(NEG.fee)}</b><button class="btn" data-act="fee" data-arg="1">+</button></div>
      <div class="numrow"><span>Wpisz kwotę (€):</span><input class="numin" type="number" inputmode="numeric" min="0" step="10000" value="${NEG.fee}" data-change="negfeenum"></div>
      ${(() => { const a = askPrice(p), lo = Math.round(a * 0.5), hi = Math.round(Math.max(a * 1.6, releaseClause(p) || 0)), pc = v => clamp((v - lo) / (hi - lo) * 100, 0, 100); return `<div class="slider"><input type="range" min="${lo}" max="${hi}" step="${feeStep(a)}" value="${clamp(NEG.fee, lo, hi)}" data-change="negfee"><div class="marks"><i style="left:${pc(p.val)}%" title="wartość"></i><i class="b" style="left:${pc(ut.tb)}%"></i></div><small class="mut">▮ wartość ${money(p.val)} • <span class="warn">▮</span> budżet ${money(ut.tb)} • cierpliwość klubu: ${p._noTalk > absDay() ? 'rozmowy zerwane' : '●'.repeat(Math.max(0, Math.floor(4 - (p._bids || 0)))) + '○'.repeat(Math.min(4, Math.ceil(p._bids || 0)))}<br>Oferta poniżej 70–80% ceny mocniej nadwyręża cierpliwość klubu.</small></div>`; })()}
      ${swapHtml(p, c)}
      <div class="seg"><button class="btn sm ${NEG.inst ? 'on' : ''}" data-act="neginst">💳 Raty</button><button class="btn sm ${NEG.sellOn ? 'on' : ''}" data-act="negsellon">🔁 Klauzula odsprzedaży 15%</button>${releaseClause(p) ? `<button class="btn sm" data-act="negrc">📜 Klauzula</button>` : ''}</div>
      <small class="mut">${NEG.inst ? `Raty: teraz ${money(upfront(NEG.fee, NEG))}, potem 2 × ${money(Math.round((Math.round(NEG.fee * INST_K) - upfront(NEG.fee, NEG)) / 2))} na koniec kolejnych sezonów (łącznie +10%).` : 'Płatność jednorazowa.'}${NEG.sellOn ? ' Odsprzedaż: klub sprzedający obniża cenę o ok. 10%, ale dostanie 15% z przyszłej sprzedaży.' : ''}</small>
      ${note ? `<p class="${note.cls}">${esc(note.t)}</p>` : ''}
      <div class="btns">${p._noTalk > absDay() ? `<button class="btn sp" disabled>Rozmowy zerwane – wróć za ${plural(p._noTalk - absDay(), 'dzień', 'dni', 'dni')}</button>` : '<button class="btn pri sp" data-act="sendbid">Złóż ofertę</button>'}${NEG.counter ? `<button class="btn" data-act="acccounter">Przyjmij ${money(NEG.counter)}</button>` : ''}</div>
      <div class="btns"><button class="btn full" data-act="close">Anuluj</button></div>`);
  } else {
    const dem = signingDemand(p, NEG.role), exp = expectedRoleIn(p, ut);
    modal(`<h2>${NEG.pre ? '📝 Prekontrakt' : 'Warunki kontraktu'}</h2>${NEG.pre ? '<small class="mut">Zawodnik dołączy po zakończeniu sezonu, bez kwoty odstępnego. Premię i prowizję płacisz teraz.</small>' : ''}<div class="row">${posTag(p.pos)}<b class="sp">${esc(p.n)}</b>${ovrShow(p)}</div>
      <small class="mut">Agent zawodnika oczekuje ${dem.toLocaleString("pl-PL")} €/tydz.${NEG.fee ? ` • kwota transferu: ${money(NEG.fee)}` : ''}${NEG.pre ? '' : `<br>Wolne w budżecie płac: <b class="${wageRoom() < dem ? 'bad' : 'good'}">${money(Math.max(0, wageRoom()))}/tydz.</b>${wageRoom() < dem ? ' – <a data-act="wbmod">przesuń środki</a>' : ''}`}</small>
      <h3>Rola w składzie</h3><div class="seg">${ROLE_ORD.slice().reverse().filter(r => r !== 'pros' || p.age <= 21).map(r => `<button class="btn sm ${NEG.role === r ? 'on' : ''}" data-act="negrole" data-arg="${r}">${ROLES[r][0]}</button>`).join('')}</div>
      <small class="mut">Zawodnik oczekuje roli: <b>${ROLES[exp][0].toLowerCase()}</b>.${NEG.role !== exp ? (ROLE_ORD.indexOf(NEG.role) < ROLE_ORD.indexOf(exp) ? ' Mniejsza rola = wyższe żądania (ambitni mogą odmówić).' : ' Większa rola – musisz mu dać grać.') : ''}</small>
      <h3>Pensja tygodniowa</h3><div class="stepper"><button class="btn" data-act="wage" data-arg="-1">−</button><b>${NEG.wage.toLocaleString("pl-PL")} €</b><button class="btn" data-act="wage" data-arg="1">+</button></div>
      <div class="numrow"><span>Wpisz pensję (€/tydz.):</span><input class="numin" type="number" inputmode="numeric" min="0" step="100" value="${NEG.wage}" data-change="negwagenum"></div>
      <h3>Długość umowy</h3><div class="seg">${[1, 2, 3, 4, 5].map(y => `<button class="btn sm ${NEG.years === y ? 'on' : ''}" data-act="years" data-arg="${y}">${y} l.</button>`).join('')}</div>
      ${extrasHtml(NEG, agentDemand(p, NEG.fee, dem), bonusDemand(dem, NEG.years), 'neg')}
      ${note ? `<p class="${note.cls}">${esc(note.t)}</p>` : ''}
      <div class="btns"><button class="btn pri sp" data-act="sendterms">Zaproponuj kontrakt</button></div><div class="btns"><button class="btn full" data-act="close">Anuluj</button></div>`);
  }
}
ACT.fee = d => { NEG.fee = Math.max(0, NEG.fee + +d * feeStep(NEG.fee)); renderNego(); };
ACT.wage = d => { NEG.wage = Math.max(500, NEG.wage + +d * (NEG.wage >= 50000 ? 5000 : NEG.wage >= 10000 ? 1000 : 250)); renderNego(); };
ACT.years = y => { NEG.years = +y; renderNego(); };
CHG.negfee = v => { NEG.fee = +v; NEG.counter = null; renderNego(); };
ACT.negrole = r => { NEG.role = r; NEG.wage = Math.max(NEG.wage, signingDemand(pget(NEG.pid), r)); renderNego(); };
CHG.negfeenum = v => { const n = Math.max(0, Math.round(+v || 0)); NEG.fee = n; NEG.counter = null; setTimeout(() => renderNego()); };
CHG.negwagenum = v => { const dem = wageDemand(pget(NEG.pid)); let w = Math.max(0, Math.round(+v || 0)); if (w > dem * 5) { w = dem * 5; toast('Maksymalnie 5× żądania zawodnika.', 'bad'); } NEG.wage = w; setTimeout(() => renderNego()); };
CHG.setrole = (v, el) => { toast(setRole(+el.dataset.pid, v)); ACT.info(el.dataset.pid); render(); };
let REN = null;
ACT.rennego = id => { const p = pget(+id); const role = roleOf(p); REN = { pid: p.id, role, years: p.age >= 31 ? 1 : 3, wage: contractDemand(p, p.age >= 31 ? 1 : 3, role), counter: null }; renderRen(); };
function renderRen(note) {
  const p = pget(REN.pid), dem = contractDemand(p, REN.years, REN.role), exp = expectedRole(p);
  modal(`<h2>📝 Nowy kontrakt</h2><div class="row">${posTag(p.pos)}<b class="sp">${esc(p.n)}</b>${ovrTag(p.ovr)}</div>
    <small class="mut">Obecnie: ${money(p.wage)}/tydz., ${plural(p.con, 'rok', 'lata', 'lat')} • ${pers(p)} • oczekuje roli: <b>${ROLES[exp][0].toLowerCase()}</b></small>
    <h3>Rola w składzie</h3><div class="seg">${ROLE_ORD.slice().reverse().filter(r => r !== 'pros' || p.age <= 21).map(r => `<button class="btn sm ${REN.role === r ? 'on' : ''}" data-act="renrole" data-arg="${r}">${ROLES[r][0]}</button>`).join('')}</div>
    <small class="mut">${roleGap(p, REN.role) > 0 ? '⚠️ Proponujesz mniejszą rolę, niż oczekuje – zażąda wyższej pensji, a ambitni mogą odmówić.' : roleGap(p, REN.role) < 0 ? '✨ Większa rola niż oczekuje – zawodnik będzie zachwycony, ale musisz dać mu grać.' : 'Rola zgodna z oczekiwaniami.'}</small>
    <h3>Długość umowy</h3><div class="seg">${[1, 2, 3, 4, 5].map(y => `<button class="btn sm ${REN.years === y ? 'on' : ''}" data-act="renyears" data-arg="${y}">${y} l.</button>`).join('')}</div>
    <h3>Pensja tygodniowa</h3><div class="stepper"><button class="btn" data-act="renwage" data-arg="-1">−</button><b>${REN.wage.toLocaleString("pl-PL")} €</b><button class="btn" data-act="renwage" data-arg="1">+</button></div>
    <div class="numrow"><span>Wpisz pensję (€/tydz.):</span><input class="numin" type="number" inputmode="numeric" min="0" step="100" value="${REN.wage}" data-change="renwagenum"></div>
    <small class="mut">Agent sugeruje ok. ${money(dem)}/tydz.</small>
    ${rclHtml(p)}
    ${extrasHtml(REN, agentDemand(p, 0, dem, true), bonusDemand(dem, REN.years), 'ren')}
    ${note ? `<p class="${note.cls}">${esc(note.t)}</p>` : ''}
    <div class="btns"><button class="btn pri sp" data-act="rensend">Zaproponuj</button>${REN.counter ? `<button class="btn" data-act="renacc">Zgoda na ${money(REN.counter)}</button>` : ''}</div>
    <div class="btns"><button class="btn full" data-act="info" data-arg="${p.id}">Wróć do karty</button></div>`);
}
ACT.renrole = r => { REN.role = r; REN.counter = null; renderRen(); };
ACT.renyears = y => { REN.years = +y; REN.counter = null; renderRen(); };
ACT.renwage = d => { REN.wage = Math.max(500, REN.wage + +d * (REN.wage >= 50000 ? 5000 : REN.wage >= 10000 ? 1000 : 250)); renderRen(); };
CHG.renwagenum = v => { const dem = contractDemand(pget(REN.pid), REN.years, REN.role); let w = Math.max(0, Math.round(+v || 0)); if (w > dem * 5) { w = dem * 5; toast('Maksymalnie 5× żądania zawodnika.', 'bad'); } REN.wage = w; setTimeout(() => renderRen()); };
ACT.rensend = () => { if (REN.wage > contractDemand(pget(REN.pid), REN.years, REN.role) * 1.5 && !confirm(`Pensja ${money(REN.wage)}/tydz. to dużo więcej, niż żąda zawodnik. Na pewno?`)) return; const r = negotiateRenewal(REN.pid, REN.wage, REN.years, REN.role, REN); if (r.res === 'accept') { toast(r.msg, 'ok'); ACT.info(REN.pid); render(); return; } if (r.res === 'counter') REN.counter = r.counter; else REN.counter = null; renderRen({ cls: r.res === 'counter' ? 'warn' : 'bad', t: r.msg }); };
ACT.renacc = () => { REN.wage = REN.counter; ACT.rensend(); };
ACT.neginst = () => { NEG.inst = !NEG.inst; NEG.counter = null; renderNego(); };
ACT.negsellon = () => { NEG.sellOn = !NEG.sellOn; NEG.counter = null; renderNego(); };
ACT.negrc = () => { NEG.fee = releaseClause(pget(NEG.pid)); NEG.inst = false; renderNego(); };
ACT.sendbid = () => {
  const p = pget(NEG.pid), r = clubResponse(p, NEG.fee, NEG);
  if (r.res === 'accept') { NEG.stage = 2; renderNego({ cls: 'good', t: r.msg }); }
  else if (r.res === 'counter') { NEG.counter = r.counter; renderNego({ cls: 'warn', t: r.msg }); }
  else renderNego({ cls: 'bad', t: r.msg });
};
ACT.acccounter = () => { NEG.fee = NEG.counter; NEG.counter = null; const r = clubResponse(pget(NEG.pid), NEG.fee, NEG); if (r.res === 'accept') { NEG.stage = 2; renderNego({ cls: 'good', t: r.msg }); } else renderNego({ cls: 'bad', t: r.msg }); };
ACT.sendterms = () => {
  const p = pget(NEG.pid);
  NEG.agDem = agentDemand(p, NEG.fee, signingDemand(p, NEG.role));
  if (NEG.pre) { const r = preContract(p.id, NEG.wage, NEG.years, NEG); if (r.ok) { closeModal(); toast(r.msg, 'ok'); render(); } else renderNego({ cls: 'bad', t: r.msg }); return; }
  if (p.tid === -1) { const r = signFree(p.id, NEG.wage, NEG.years, NEG); if (r.ok) { p.role = NEG.role; closeModal(); toast(r.msg); render(); } else renderNego({ cls: 'bad', t: r.msg }); return; }
  if (NEG.wage > wageDemand(p) * 1.5 && !confirm(`Pensja ${money(NEG.wage)}/tydz. to dużo więcej, niż żąda zawodnik. Na pewno?`)) return;
  if (upfront(NEG.fee, NEG) + NEG.bonus + NEG.agent > Math.max(0, userClub().tb) + 1) return renderNego({ cls: 'bad', t: `Kwota transferu z prowizją przekracza budżet transferowy (${money(userClub().tb)}).` });
  const t = personalTerms(p, NEG.wage, NEG.years, NEG.role, NEG);
  if (!t.ok && t.budget) return renderNego({ cls: 'bad', t: t.msg });
  if (!t.ok) { NEG.tries = (NEG.tries || 0) + 1; if (NEG.tries >= 4) { p._noTalk = absDay() + 14; closeModal(); return toast(`${p.n} kończy rozmowy – „nie traktujecie mnie poważnie”.`, 'bad'); } return renderNego({ cls: 'bad', t: t.msg + ` (cierpliwość: jeszcze ${4 - NEG.tries})` }); }
  const ut = userClub(); if (ut.players.length >= 32) return renderNego({ cls: 'bad', t: 'Kadra pełna (maks. 32).' });
  completeTransfer(p.id, NEG.fee, NEG.wage, NEG.years, NEG); closeModal(); toast(`${p.n} dołącza do klubu!`); render();
};

/* ---------- ROZGRYWKI ---------- */
function vComps() {
  const head = navCur() !== 'comps' ? '' : tabs([['cal', '📅 Terminarz'], ['league', 'Ligi'], ['cup', 'Puchary krajowe'], ['euro', 'Puchary UEFA'], ['nt', 'Reprezentacje'], ['hist', 'Historia']], UI.compTab, 'ctab');
  return head + ({ cal: vCal, league: vLeague, cup: vCup, euro: vEuro, rank: vRank, nt: vNT, hist: vHist })[UI.compTab]();
}
ACT.ctab = a => { if (a !== UI.compTab) navPush(); UI.compTab = a; render(); };
function vCup() {
  if (!UI.cupcc) UI.cupcc = userClub().cc;
  const cup = S.cups[UI.cupcc];
  const sel = `<div class="flt"><select data-change="cupcc">${Object.values(S.countries).map(c => `<option value="${c.code}" ${UI.cupcc === c.code ? 'selected' : ''}>${c.flag} ${S.cups[c.code].name}</option>`).join('')}</select></div>`;
  let body = `<div class="card"><b>${esc(cup.name)}</b><br><small class="mut">${cup.teams.length} klubów ze wszystkich poziomów • ${cup.R} rund • mecze jednym meczem (dogrywka i karne)${isUEFA({ cc: cup.cc }) ? ' • zwycięzca ma zapewnione miejsce w europejskich pucharach' : ''}</small>${cup.champion != null ? `<br><b>🏆 ${esc(club(cup.champion).name)}</b>` : ''}</div>`;
  for (let r = cup.rounds.length - 1; r >= 0; r--) {
    const ties = cup.rounds[r];
    body += `<h3>${cupRoundName(ties.length * 2)}</h3><div class="card list">${ties.map(t => fxRow(club(t.h), club(t.a), t.m ? `${t.m.hg} : ${t.m.ag}` : '–', t.h === S.user || t.a === S.user, t.m && (t.m.pens || t.m.et) ? (t.m.pens ? `karne ${t.m.pens.h}:${t.m.pens.a}` : 'po dogrywce') : '')).join('')}</div>`;
  }
  if (!cup.rounds.length) body += '<div class="card mut">Pierwsza runda odbędzie się we wrześniu.</div>';
  return sel + body;
}
CHG.cupcc = v => { UI.cupcc = v; render(); };
function vLeague() {
  const ut = userClub();
  if (!UI.lg || UI.lgS !== S.season + ":" + ut.lg) { UI.lg = ut.lg; UI.cc = ut.cc; UI.lgS = S.season + ":" + ut.lg; }
  const lg = S.leagues[UI.lg];
  const sel = `<div class="flt"><select data-change="cc">${Object.values(S.countries).map(c => `<option value="${c.code}" ${UI.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select>
    <select data-change="lg">${S.countries[UI.cc].leagues.map(id => `<option value="${id}" ${UI.lg === id ? 'selected' : ''}>${S.leagues[id].name}</option>`).join('')}</select></div>`;
  const sub = tabs([['table', 'Tabela'], ['fix', 'Kolejki'], ['scor', 'Strzelcy']], UI.lgTab, 'lgtab');
  let body = '';
  if (UI.lgTab === 'table') {
    const tb = table(UI.lg), n = tb.length;
    const ls = S.countries[lg.cc].leagues, down = lg.tier < ls.length ? promoN(lg.cc, lg.tier) : 0, up = lg.tier > 1 ? promoN(lg.cc, lg.tier - 1) : 0;
    const ez = lg.tier === 1 ? euroZones(lg.cc) : null;
    const zoneOf = pos => { if (ez) { const z = ez.zones.find(z => pos >= z.from && pos <= z.to); if (z) return z.comp.toLowerCase(); } if (up && pos <= up) return 'up'; if (down && pos > n - down) return 'dn'; return ''; };
    const ZN = { CL: '🔵 Liga Mistrzów', EL: '🟠 Liga Europy', ECL: '🟢 Liga Konferencji' };
    body = `<div class="legend">${ez ? ez.zones.map(z => `<span>${z.from}. ${ZN[z.comp]} – ${z.qual ? QNAME[z.rd] : 'faza ligowa'}</span>`).join('') + (ez.cup ? `<span>🏆 zdobywca pucharu: ${ZN[ez.cup.comp]} – ${ez.cup.rd === 'LP' ? 'faza ligowa' : QNAME[ez.cup.rd]}</span>` : '') : ''}
        ${up ? `<span>🟩 awans: 1–${up}.</span>` : ''}${down ? `<span>🟥 spadek: ${n - down + 1}–${n}.</span>` : ''}</div>
      <div class="card list"><table><tr><th>#</th><th>Klub</th><th>M</th><th>Z</th><th>R</th><th>P</th><th>+/-</th><th>Pkt</th></tr>
      ${tb.map(r => { const c = club(r.id); return `<tr class="${r.id === ut.id ? 'me' : ''} ${zoneOf(r.pos)}" data-act="clubv" data-arg="${r.id}"><td>${r.pos}</td><td><span class="tn">${badge(c, 'sm')}${esc(c.name)}</span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF - r.GA}</td><td><b>${r.Pts}</b></td></tr>`; }).join('')}</table></div>
      <small class="mut">${ez ? `Kraj ${ez.rank}. w rankingu UEFA – ${ez.total} ${ez.total >= 5 ? 'klubów' : 'kluby'} w europejskich pucharach${ez.eps ? ' (+1 miejsce w LM za wyniki w ostatnim sezonie)' : ''}. Miejsca 1–4 w rankingu: 7 klubów, 5–6: 6, 7–15: 5, 16–33: 4, dalej 3. Jeśli zdobywca pucharu zajął miejsce premiowane, jego przepustka przechodzi na kolejny klub w tabeli. Przegrani w eliminacjach LM i LE spadają do niższego pucharu.` : lg.tier === 1 && !isUEFA({ cc: lg.cc }) ? 'Liga spoza UEFA – kluby nie grają w europejskich pucharach.' : ''}</small>`;
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
ACT.lgtab = a => { if (a !== UI.lgTab) navPush(); UI.lgTab = a; render(); };
ACT.rnd = d => { UI.rnd = clamp(UI.rnd + +d, 0, S.leagues[UI.lg].fix.length - 1); render(); };
ACT.clubv = id => {
  const c = club(+id); const tb = table(c.lg).find(r => r.id === c.id);
  modal(`<h2>${badge(c)} ${esc(c.name)}</h2><small class="mut">${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • ${tb.pos}. miejsce • stadion ${c.cap.toLocaleString('pl-PL')}</small>
    <div class="row" style="margin:6px 0"><span>Prestiż</span>${presStars(c)}<b>${presOf(c).toFixed(1)}/10</b><small class="mut sp" style="text-align:right">${presWord(presOf(c))}</small></div>
    <div class="kv"><div><span>Średnia kadry</span><b>${Math.round(teamLevel(c))}</b></div><div><span>Współczynnik UEFA</span><b>${clubCoef(c.id).toFixed(1)}</b></div><div><span>Trener</span><b>${c.id === S.user ? esc(S.manager) : esc(c.coach.n)}</b></div><div><span>OVR trenera</span>${ovrTag(Math.round(c.id === S.user ? S.mgr.ovr : c.coach.ovr))}</div></div>
    <div class="list">${c.players.slice().sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr).map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${p.age} l.</small></div>${ovrShow(p)}</div>`).join('')}</div>
    <div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
function vEuro() {
  const sel = `<div class="flt"><select data-change="eurosel" style="width:100%">${[['CL', '⭐ Liga Mistrzów'], ['EL', '🟠 Liga Europy'], ['ECL', '🟢 Liga Konferencji']].map(([k, n]) => `<option value="${k}" ${UI.euro === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  const c = S.euro[UI.euro]; if (!c) return sel;
  if (!c.lp && UI.euroTab !== 'q') UI.euroTab = 'q';
  const sub = tabs([...(c.q ? [['q', 'Eliminacje']] : []), ['lp', 'Faza ligowa'], ['games', 'Mecze'], ['ko', 'Faza pucharowa']], UI.euroTab, 'eutab');
  let body = '';
  if (UI.euroTab === 'q' && c.q) {
    const R = c.q.rounds.filter(Boolean);
    body = `<div class="card"><small class="mut">Kluby z niżej notowanych krajów walczą o fazę ligową w maksymalnie 4 rundach dwumeczów (I, II, III runda i play-off – koniec lipca i sierpień). Kluby z wyżej notowanych lig wchodzą do gry później.${QLOW[c.id] ? ` Przegrani spadają do eliminacji / fazy ligowej: ${S.euro[QLOW[c.id]].name}.` : ' Przegrani odpadają z Europy.'} W grze: ${c.q.alive.length + (c.q.entry || []).flat().length} klubów.</small></div>`
      + (R.length ? c.q.rounds.map((T, r) => T && T.length ? `<h3>${QNAME[r]}</h3><div class="card list">${T.map(t => koRow(t, false)).join('')}</div>` : '').join('') : `<div class="card list"><h3 style="margin-top:0">Kluby w eliminacjach</h3>${[...c.q.alive, ...(c.q.entry || []).flat()].map(id => { const cl = club(id); return `<div class="prow ${id === S.user ? 'me' : ''}" data-act="clubv" data-arg="${id}">${badge(cl, 'sm')}<div class="pn">${esc(cl.name)}<small>${S.countries[cl.cc].flag} ${esc(S.leagues[cl.lg].name)}</small></div></div>`; }).join('') || '<small class="mut">Eliminacje zakończone.</small>'}</div>`);
  } else if (!c.lp) {
    body = `<div class="card">${empty('🎲', 'Losowanie fazy ligowej po eliminacjach', `Pewni udziału: ${c.teams.length} klubów. Pozostałe miejsca zajmą zwycięzcy eliminacji (koniec sierpnia).`)}</div>`;
  } else if (UI.euroTab === 'lp') {
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
CHG.eurosel = v => ACT.euro(v);
ACT.euro = a => { UI.euro = a; UI.md = null; render(); };
ACT.eutab = a => { if (a !== UI.euroTab) navPush(); UI.euroTab = a; render(); };
ACT.md = d => { const c = S.euro[UI.euro]; if (!c.lp) return; UI.md = clamp(UI.md + +d, 0, c.lp.length - 1); render(); };
const MONTHS_PL = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
const dKey = ms => Math.floor(ms / 864e5);
function calGrid(items) {
  const D = 864e5, t = todayMs(), w = winDates(), first = S.cal[0].date, last = S.cal[S.cal.length - 1].date;
  const mk = ms => { const d = new Date(ms); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  const m0 = mk(first), m1 = mk(last); let cm = UI.calM != null ? UI.calM : mk(t); cm = clamp(cm, m0, m1); UI.calM = cm;
  const y = Math.floor(cm / 12), mo = cm % 12, start = Date.UTC(y, mo, 1), days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(), off = (new Date(start).getUTCDay() + 6) % 7;
  const byDay = {}; for (const x of items) (byDay[dKey(x.d.date)] = byDay[dKey(x.d.date)] || []).push(x);
  const inWin = k => (k >= dKey(w.sum[0]) && k <= dKey(w.sum[1])) || (k >= dKey(w.win[0]) && k <= dKey(w.win[1]));
  const dd = new Set([dKey(w.sum[1]), dKey(w.win[1])]);
  let cells = ''; for (let i = 0; i < off; i++) cells += '<div class="cd e"></div>';
  for (let dn = 1; dn <= days; dn++) {
    const ms = start + (dn - 1) * D, k = dKey(ms), xs = byDay[k] || [], past = k < dKey(t), now = k === dKey(t);
    const x = xs[0], opp = x ? (x.h.id === S.user ? x.a : x.h) : null, res = x && x.sc ? ((x.h.id === S.user ? x.sc[0] - x.sc[1] : x.sc[1] - x.sc[0])) : null;
    cells += `<div class="cd ${past ? 'p' : ''} ${now ? 'now' : ''} ${inWin(k) ? 'win' : ''} ${x ? 'm' + (x.h.id === S.user ? ' hm' : ' aw') : ''} ${res != null ? (res > 0 ? 'W' : res < 0 ? 'L' : 'D') : ''}" ${!past ? `data-act="calday" data-arg="${ms}"` : ''}>
      <span class="dn">${dn}</span>${x ? `<span class="op">${opp && opp.short ? esc(opp.short) : '⚽'}</span>` : ''}${dd.has(k) ? '<span class="dl">⏰</span>' : ''}</div>`;
  }
  return `<div class="card"><div class="row"><button class="btn sm" data-act="calm" data-arg="-1" ${cm <= m0 ? 'disabled' : ''}>‹</button><b class="sp" style="text-align:center">${MONTHS_PL[mo]} ${y}</b><button class="btn sm" data-act="calm" data-arg="1" ${cm >= m1 ? 'disabled' : ''}>›</button></div>
    <div class="calg">${['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(d => `<div class="cdh">${d}</div>`).join('')}${cells}</div>
    <small class="mut">Dotknij dnia, aby przesymulować grę do tej daty. <span class="lg win">okno transferowe</span> <span class="lg hm">u siebie</span> <span class="lg aw">wyjazd</span> ⏰ Deadline Day</small></div>`;
}
ACT.calm = d => { UI.calM += +d; render(); };
ACT.calday = ms => {
  ms = +ms; const k = dKey(ms), xs = []; for (let i = 0; i < S.cal.length; i++) { const x = fixtureAt(i); if (x && !x.nt && dKey(x.d.date) === k) xs.push(x); }
  const w = winDates(), notes = [];
  if (k === dKey(w.sum[1]) || k === dKey(w.win[1])) notes.push('⏰ Deadline Day – ostatni dzień okna transferowego.');
  if (k === dKey(w.win[0])) notes.push('🟢 Otwarcie zimowego okna transferowego.');
  const isToday = k === dKey(todayMs());
  modal(`<h2>📅 ${fmtDate(ms)}</h2>${xs.map(x => `<div class="row">${badge(x.h, 'sm')}<b class="sp">${esc(x.h.name)} – ${esc(x.a.name)}</b>${badge(x.a, 'sm')}</div><small class="mut">${esc(x.label || '')} • ${isTbd(x) || x.a.id == null ? 'prognoza po losowaniu' : `prognoza: ${WX[matchWeather(x.h, x.d.date)][0]} ${WX[matchWeather(x.h, x.d.date)][1]}`}</small>`).join('')}
    ${notes.map(n => `<p>${n}</p>`).join('')}${!xs.length && !notes.length ? '<small class="mut">Brak wydarzeń w tym dniu.</small>' : ''}
    <div class="btns">${isToday ? '' : `<button class="btn pri sp" data-act="simto" data-arg="${ms}">⏩ Symuluj do tego dnia</button>`}<button class="btn" data-act="close">Zamknij</button></div>
    <small class="mut">Symulacja zatrzyma się wcześniej przy Twoim meczu, ważnej decyzji, otwarciu okna i w Deadline Day.</small>`);
};
function vCal() {
  UI.calAll = UI.calAll || false;
  const items = []; for (let i = 0; i < S.cal.length; i++) { const x = fixtureAt(i); if (x && !x.nt) items.push(x); }
  const next = items.filter(x => x.i >= S.day), past = items.filter(x => x.i < S.day);
  const row = x => { const home = x.h.id === S.user, opp = home ? x.a : x.h, sc = x.sc;
    const res = sc ? (home ? sc[0] - sc[1] : sc[1] - sc[0]) : null, cls = res == null ? '' : res > 0 ? 'W' : res < 0 ? 'L' : 'D';
    return `<div class="prow ${x.i === S.day ? 'me' : ''}" ${opp.id != null ? `data-act="clubv" data-arg="${opp.id}"` : ''}><span class="mini" style="min-width:52px">${fmtDate(x.d.date).replace(/ \d{4}$/, '')}</span>${badge(opp, 'sm')}<div class="pn">${esc(opp.name)} <small>(${home ? 'D' : 'W'})</small><small>${esc(x.label)}</small></div>${sc ? `<span class="chip ${cls}">${sc[0]}:${sc[1]}</span>` : ''}</div>`; };
  return calGrid(items) + `<div class="card"><b>📅 Terminarz – ${SEASON_LABEL(S.season)}</b><br><small class="mut">D – u siebie, W – na wyjeździe. Mecze pucharowe pojawiają się po losowaniu.</small></div>
    <h3>Najbliższe mecze</h3><div class="card list">${next.slice(0, UI.calAll ? 99 : 8).map(row).join('') || '<small class="mut">Brak meczów do końca sezonu.</small>'}</div>
    ${next.length > 8 ? `<div class="btns"><button class="btn sm full" data-act="calall">${UI.calAll ? 'Pokaż mniej' : `Pokaż wszystkie (${next.length})`}</button></div>` : ''}
    ${past.length ? `<h3>Rozegrane</h3><div class="card list">${past.slice().reverse().map(row).join('')}</div>` : ''}`;
}
ACT.calall = () => { UI.calAll = !UI.calAll; render(); };
function vRank() {
  UI.rkTab = UI.rkTab || 'elo';
  const head = tabs([['elo', '🌍 Kluby (Elo)'], ['pres', '⭐ Prestiż'], ['lgs', 'Ligi'], ['uefa', 'UEFA – kraje'], ['uclub', 'UEFA – kluby'], ['me', 'Mój klub']], UI.rkTab, 'rktab');
  return head + ({ elo: vRankElo, pres: vRankPres, lgs: vRankLg, uefa: vRankUefa, uclub: vRankUefa, me: vRankMe })[UI.rkTab]();
}
ACT.rktab = a => { if (a !== UI.rkTab) navPush(); UI.rkTab = a; render(); };
function vRankElo() {
  UI.rkf = UI.rkf || '';
  const all = eloRank(), list = all.filter(c => !UI.rkf || c.cc === UI.rkf || (UI.rkf === 'UEFA' && isUEFA(c)) || (UI.rkf === 'X' && !isUEFA(c)));
  const me = all.indexOf(userClub());
  return `<div class="card"><div class="row"><b class="sp">Światowy ranking klubów</b><span class="pill">Twój klub: ${me + 1}. • ${eloOf(userClub())}</span></div>
    <small class="mut">Ranking Elo – liczony po każdym meczu (liga, puchary, Europa, sparingi). Wygrana z mocniejszym daje dużo punktów, porażka ze słabszym – dużo odbiera.</small>
    <div class="flt"><select data-change="rkf"><option value="">Wszystkie kraje</option><option value="UEFA" ${UI.rkf === 'UEFA' ? 'selected' : ''}>Tylko Europa</option><option value="X" ${UI.rkf === 'X' ? 'selected' : ''}>Poza Europą</option>${Object.values(S.countries).map(c => `<option value="${c.code}" ${UI.rkf === c.code ? 'selected' : ''}>${c.flag} ${esc(c.name)}</option>`).join('')}</select></div></div>
    <div class="card list">${list.slice(0, 60).map(c => `<div class="prow ${c.id === S.user ? 'me' : ''}" data-act="clubv" data-arg="${c.id}"><span class="mini">${all.indexOf(c) + 1}.</span>${badge(c, 'sm')}<div class="pn">${esc(c.name)}<small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)}</small></div><b>${eloOf(c)}</b></div>`).join('')}</div>`;
}
CHG.rkf = v => { UI.rkf = v; render(); };
function vRankPres() {
  const all = S.clubs.slice().sort((a, b) => presOf(b) - presOf(a)), me = all.indexOf(userClub());
  return `<div class="card"><div class="row"><b class="sp">Prestiż klubów</b><span class="pill">Twój klub: ${me + 1}. • ${presOf(userClub()).toFixed(1)}</span></div>
    <small class="mut">Skala 1–10 (5 gwiazdek). Prestiż rośnie powoli dzięki długim latom w czołówce, trofeom i grze w Europie – i powoli spada, gdy klub przestaje wygrywać. Im wyższy prestiż, tym chętniej przychodzą lepsi piłkarze, mniejsze są ich żądania płacowe i lepsi juniorzy trafiają do akademii.</small></div>
    <div class="card list">${all.slice(0, 60).map((c, i) => `<div class="prow ${c.id === S.user ? 'me' : ''}" data-act="clubv" data-arg="${c.id}"><span class="mini">${i + 1}.</span>${badge(c, 'sm')}<div class="pn">${esc(c.name)}<small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)}</small></div>${presStars(c)}<b style="min-width:30px;text-align:right">${presOf(c).toFixed(1)}</b></div>`).join('')}</div>`;
}
function vRankLg() {
  const r = leagueRank(), ul = userClub().lg;
  return `<div class="card"><b>Ranking siły lig</b><br><small class="mut">Średnie Elo wszystkich klubów ligi oraz czołowej czwórki. Zmienia się z wynikami w pucharach i meczach międzynarodowych.</small></div>
    <div class="card list">${r.map((x, i) => `<div class="prow ${x.lg.id === ul ? 'me' : ''}" data-act="golg" data-arg="${x.lg.id}"><span class="mini">${i + 1}.</span><div class="pn">${S.countries[x.lg.cc].flag} ${esc(x.lg.name)}<small>${esc(S.countries[x.lg.cc].name)} • poziom ${x.lg.tier} • top 4: ${x.top}</small></div><b>${x.avg}</b></div>`).join('')}</div>`;
}
ACT.golg = id => { const lg = S.leagues[id]; navPush(); UI.compTab = 'league'; UI.cc = lg.cc; UI.lg = id; render(); window.scrollTo(0, 0); };
function vRankMe() {
  const h = (S.uhist || []).filter(x => x.s === S.season), ut = userClub(), all = eloRank();
  const prev = (S.uhist || []).filter(x => x.s < S.season);
  const spark = (vals, inv) => vals.length < 2 ? '<small class="mut">Dane pojawią się po kilku kolejkach.</small>' : typeof sparkSVG === 'function' ? sparkSVG(vals, { w: 320, h: 60, invert: !!inv }) : '';
  return `<div class="grid2"><div class="card stat"><small>Elo</small><b>${eloOf(ut)}</b><small>${all.indexOf(ut) + 1}. na świecie</small></div>
    <div class="card stat"><small>W kraju</small><b>${all.filter(c => c.cc === ut.cc).indexOf(ut) + 1}.</b><small>${S.countries[ut.cc].flag} ${esc(S.countries[ut.cc].name)}</small></div></div>
    <div class="card"><h3 style="margin-top:0">Elo w tym sezonie</h3>${spark(h.map(x => x.elo))}</div>
    <div class="card"><h3 style="margin-top:0">Pozycja w lidze w tym sezonie</h3>${spark(h.map(x => x.pos), true)}${h.length ? `<small class="mut">Najwyżej: ${Math.min(...h.map(x => x.pos))}. • najniżej: ${Math.max(...h.map(x => x.pos))}.</small>` : ''}</div>
    ${prev.length ? `<div class="card"><b>Poprzednie sezony</b>${[...new Set(prev.map(x => x.s))].slice(-6).map(s => { const l = prev.filter(x => x.s === s), e = l[l.length - 1]; return `<div class="rt"><span>${SEASON_LABEL(s)}</span><small>Elo ${e.elo} • ${e.pos}. miejsce</small></div>`; }).join('')}</div>` : ''}`;
}
function vRankUefa() {
  const rk = countryRanking();
  const yrs = [0, 1, 2, 3, 4].map(i => `${String(S.season - 5 + i).slice(2)}/${String(S.season - 4 + i).slice(2)}`);
  const cur = S.cpts;
  const clubs = S.clubs.filter(isUEFA).map(c => ({ c, v: clubCoef(c.id) })).sort((a, b) => b.v - a.v).slice(0, 40);
  if (UI.rkTab === 'uclub') return `<div class="card list"><h2>Ranking klubów UEFA (5 sezonów)</h2>${clubs.map((x, i) => `<div class="prow ${x.c.id === S.user ? 'me' : ''}" data-act="clubv" data-arg="${x.c.id}"><span class="mini">${i + 1}.</span>${badge(x.c, 'sm')}<div class="pn">${esc(x.c.name)}<small>${S.countries[x.c.cc].flag} ${esc(S.leagues[x.c.lg].name)}</small></div><b>${x.v.toFixed(1)}</b></div>`).join('')}</div>`;
  return `<div class="card list"><h2>Ranking krajów (współczynnik UEFA)</h2><div class="scrollx"><table class="rank"><tr><th>#</th><th>Kraj</th>${yrs.map(y => `<th>${y}</th>`).join('')}<th>Bież.</th><th>Suma</th></tr>
    ${rk.map((r, i) => { const c = S.countries[r.cc], now = cur[r.cc] && cur[r.cc].n ? cur[r.cc].pts / cur[r.cc].n : 0; return `<tr class="${r.cc === userClub().cc ? 'me' : ''}"><td>${i + 1}</td><td>${c.flag} ${esc(c.name)}</td>${c.coef.map(v => `<td>${v.toFixed(2)}</td>`).join('')}<td class="good">${now.toFixed(2)}</td><td><b>${r.tot.toFixed(2)}</b></td></tr>`; }).join('')}</table></div>
    <small class="mut">Miejsca w Lidze Mistrzów: 1–4 → 4 kluby, 5–6 → 3, 7–10 → 2, dalej mistrz przez eliminacje. Dwa kraje z najlepszym wynikiem w ostatnim sezonie dostają dodatkowe miejsce (EPS).</small></div>
`;
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
    <div class="card"><h2>Złota Piłka</h2>${S.awards.filter(a => a.ballon).length ? S.awards.filter(a => a.ballon).slice().reverse().map(a => `<div class="msg"><b>${SEASON_LABEL(a.season)}</b><p>🥇 ${esc(a.ballon[0].n)} (${esc(a.ballon[0].c)}) • 🥈 ${esc(a.ballon[1].n)} • 🥉 ${esc(a.ballon[2].n)}</p></div>`).join('') : '<small class="mut">Brak.</small>'}</div>
    <div class="card"><h2>Turnieje reprezentacji</h2>${S.ntHist.length ? S.ntHist.slice().reverse().map(h => `<div class="rt"><span>${esc(h.name)}</span><b>${flag(h.champ)} ${esc(NAT[h.champ].name)}</b></div>`).join('') : '<small class="mut">Brak.</small>'}</div>
    <div class="card"><h2>Mistrzowie lig</h2>${Object.entries(S.champs).map(([id, l]) => `<div class="rt"><span>${esc(S.leagues[id].name)}</span><small>${l.slice(-3).reverse().map(x => esc(club(x.c).short)).join(', ')}</small></div>`).join('') || '<small class="mut">Brak.</small>'}</div>`;
}

/* ---------- TRANSFERY ---------- */
function vMarket() {
  const ut = userClub();
  const head = (navCur() !== 'market' ? '' : tabs([['search', 'Szukaj'], ['short', `Obserwowani`], ['scout', 'Skauting'], ['offers', `Oferty${S.offers.length ? ' (' + S.offers.length + ')' : ''}`], ['news', 'Wieści']], UI.mkTab, 'mktab')) +
    `<div class="card"><div class="row"><span>${windowText()}</span></div><div class="row mut" style="font-size:13px;margin-top:4px"><span>Budżet transferowy: <b class="good">${money(ut.tb)}</b></span><span class="sp"></span><span>Kadra: ${ut.players.length}/32</span></div>
      <div class="row mut" style="font-size:13px;margin-top:4px"><span>Budżet płac: <b class="${wageRoom() < 0 ? 'bad' : 'good'}">${money(wageBill(ut))} / ${money(S.board.wb)}</b>/tydz.</span><span class="sp"></span><button class="btn sm" data-act="wbmod">⇄ Przesuń</button></div></div>`;
  return head + ({ search: vSearch, short: vShort, scout: vScout, offers: vOffers, news: vNews })[UI.mkTab]();
}
ACT.mktab = a => { if (a !== UI.mkTab) navPush(); UI.mkTab = a; render(); };
function dealState(p) {
  const ut = userClub();
  if (p.tid === -1) return ut.bal < 0 ? ['bad', 'długi'] : !playerInterest(p).ok ? ['bad', 'nie chce'] : ['g', 'wolny'];
  if (p.tid < 0) return ['', ''];
  if (p.loan) return ['bad', 'wypożyczony'];
  if (p._noTalk > absDay()) return ['bad', 'zerwane rozmowy'];
  if (clubOf(p).players.length <= 18) return ['bad', 'wąska kadra klubu'];
  if (!playerInterest(p).ok) return ['bad', 'nie chce'];
  if (notForSale(p)) return ['warn', 'nie na sprzedaż'];
  const a = askPrice(p);
  if (p._disc && p._disc.until > absDay() && a <= Math.min(ut.tb, ut.bal)) return ['g', `okazja −${Math.round((1 - p._disc.k) * 100)}%`];
  return a <= Math.min(ut.tb, ut.bal) ? ['g', 'w budżecie'] : a * INST_K * INST_UP <= ut.tb && a >= 1e6 ? ['warn', 'na raty'] : ['bad', 'za drogi'];
}
function mkRow(p) {
  const c = clubOf(p), ds = dealState(p);
  return `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${c ? esc(c.short) + ' ' + S.countries[c.cc].flag : p.tid === -1 ? 'wolny' : 'zagr.'} • ${p.age} l. • ${p.tid === -1 ? 'bez odstępnego' : money(p.val)}${ds[1] ? ` • <span class="${ds[0] === 'g' ? 'good' : ds[0]}">${ds[1]}</span>` : ''}</small></div>${S.short.includes(p.id) ? '<span class="good">★</span>' : ''}${ovrShow(p)}<span class="potc" title="potencjał">${potTxt(p)}</span></div>`;
}
const FOPT = {
  pos: () => POSITIONS.map(p => [p, POS_PL[p]]), age: () => [19, 21, 23, 25, 28, 31].map(a => [a, `do ${a} l.`]),
  ovr: () => [60, 65, 70, 75, 80, 85].map(a => [a, `${a}+`]), price: () => [5e5, 1e6, 3e6, 1e7, 3e7, 8e7].map(v => [v, `do ${money(v)}`]),
  sort: () => [['fit', 'najlepsi dla mnie'], ['ovr', 'wg ogólnej'], ['pot', 'wg potencjału'], ['val', 'wg wartości'], ['age', 'najmłodsi']],
};
const FNAME = { cc: 'Kraj', pos: 'Pozycja', age: 'Wiek', ovr: 'Ogólna', price: 'Cena', sort: 'Sortowanie' };
function searchList() {
  const f = UI.f;
  let list = PALL.filter(p => p.tid !== S.user && p.tid > -2);
  if (f.cc === 'FREE') list = list.filter(p => p.tid === -1); else if (f.cc) list = list.filter(p => p.tid >= 0 && club(p.tid).cc === f.cc);
  if (f.pos) list = list.filter(p => p.pos === f.pos);
  if (f.age) list = list.filter(p => p.age <= f.age);
  if (f.price) list = list.filter(p => p.val <= f.price);
  if (f.priceMin) list = list.filter(p => p.val >= f.priceMin);
  const mid = r => (r[0] + r[1]) / 2;
  if (f.ovr) list = list.filter(p => mid(ovrRange(p)) >= f.ovr);
  if (f.ovrMax) list = list.filter(p => mid(ovrRange(p)) <= f.ovrMax);
  if (f.potMin) list = list.filter(p => know(p) >= 30 && mid(ovrRange(p, true)) >= f.potMin);
  if (f.potMax) list = list.filter(p => know(p) >= 30 && mid(ovrRange(p, true)) <= f.potMax);
  if (f.ageMin) list = list.filter(p => p.age >= f.ageMin);
  if (f.q) { const q = f.q.toLowerCase(); list = list.filter(p => p.n.toLowerCase().includes(q)); }
  if (f.real) list = list.filter(p => p.tid !== -2 && ['g', 'warn'].includes(dealState(p)[0]) && dealState(p)[1] !== 'nie na sprzedaż');
  return list;
}
function fLabel(k, v) {
  const L = { price: `do ${money(v)}`, priceMin: `od ${money(v)}`, ovr: `OVR od ${v}`, ovrMax: `OVR do ${v}`, potMin: `POT od ${v}`, potMax: `POT do ${v}`, ageMin: `wiek od ${v}`, age: `wiek do ${v}` };
  if (L[k]) return L[k];
  if (k === 'cc') return v === 'FREE' ? 'Wolni agenci' : `${S.countries[v].flag} ${S.countries[v].name}`;
  const o = FOPT[k]().find(x => x[0] === v); return o ? o[1] : v;
}
/* braki w kadrze: pozycje, na których brakuje graczy na poziomie zespołu (0–2) */
function squadNeeds() {
  const ut = userClub(), lv = teamLevel(ut) - 2, n = {};
  const want = { GK: 2, CB: 3, LB: 1, RB: 1, CDM: 1, CM: 2, CAM: 1, LM: 1, RM: 1, LW: 1, RW: 1, ST: 2 };
  for (const pos of Object.keys(want)) { const have = ut.players.filter(p => (p.pos === pos || (p.alt || []).includes(pos)) && p.ovr >= lv).length; n[pos] = clamp(want[pos] - have, 0, 2); }
  return n;
}
function vSearch() {
  const f = UI.f, list = searchList();
  const mid = r => (r[0] + r[1]) / 2, need = squadNeeds();
  const ut = userClub(), best = {}; for (const q of ut.players) for (const ps of [q.pos, ...(q.alt || [])]) best[ps] = Math.max(best[ps] || 0, ps === q.pos ? q.ovr : q.ovr - 3);
  // ocena dopasowania: poziom + potencjał + realne wzmocnienie pozycji (rezerwowy bramkarz to mniejsza potrzeba)
  const fitK = p => { const o = ovrEst(p), pt = know(p) >= 30 ? mid(ovrRange(p, true)) : o; return o + Math.max(0, pt - o) * 0.35 - Math.max(0, p.age - 29) * 2.5 + (need[p.pos] || 0) * (p.pos === 'GK' ? 1 : 3) + clamp(o - (best[p.pos] || 0), -6, 8) * 0.8; };
  const key = f.sort === 'pot' ? (p => know(p) >= 30 ? mid(ovrRange(p, true)) : 0) : f.sort === 'val' ? (p => p.val) : f.sort === 'age' ? (p => -p.age) : f.sort === 'ovr' ? ovrEst : fitK;
  list.sort((a, b) => key(b) - key(a));
  const act = ['cc', 'pos', 'ageMin', 'age', 'ovr', 'ovrMax', 'potMin', 'potMax', 'priceMin', 'price'].filter(k => f[k]);
  return `<div class="flt"><input placeholder="Szukaj nazwiska…" value="${esc(f.q)}" data-change="fq" style="flex:1 1 55%;min-width:0"><button class="btn sm pri" data-act="fsheet">⚙ Filtry${act.length + (f.real ? 1 : 0) ? ` (${act.length + (f.real ? 1 : 0)})` : ''}</button></div>
    <div class="chipsrow">${f.real ? `<button class="fchip on" data-act="freal">🎯 Realne cele ✕</button>` : `<button class="fchip" data-act="freal">🎯 Realne cele</button>`}${act.map(k => `<button class="fchip on" data-act="fclr" data-arg="${k}">${fLabel(k, f[k])} ✕</button>`).join('')}<button class="fchip" data-act="fsheet">↕ ${fLabel('sort', f.sort || 'ovr')}</button></div>
    <small class="mut">${list.length} zawodników. Zakresy ocen zawężają się dzięki skautingowi.</small>
    <div class="card list">${list.length ? '<div class="prow lh"><span class="pn mut">Zawodnik</span><span class="lhc">OVR</span><span class="lhc">POT</span></div>' : ''}${list.slice(0, 60).map(mkRow).join('') || empty('🔎', 'Brak wyników', 'Poluzuj filtry, żeby zobaczyć więcej zawodników.', '<button class="btn sm" data-act="freset">Wyczyść filtry</button>')}</div>`;
}
function filterSheet() {
  const f = UI.f, n = searchList().length;
  const range = (t, a, b, vals, fmt = v => v) => `<h3>${t}</h3><div class="rng"><select data-change="frng" data-k="${a}"><option value="0">od: dowolnie</option>${vals.map(v => `<option value="${v}" ${f[a] === v ? 'selected' : ''}>od ${fmt(v)}</option>`).join('')}</select><span>–</span><select data-change="frng" data-k="${b}"><option value="0">do: dowolnie</option>${vals.map(v => `<option value="${v}" ${f[b] === v ? 'selected' : ''}>do ${fmt(v)}</option>`).join('')}</select></div>`;
  const grp = k => `<h3>${FNAME[k]}</h3><div class="chipsrow wrap">${k !== 'sort' ? `<button class="fchip ${!f[k] ? 'on' : ''}" data-act="fset" data-arg="${k}:">Dowolna</button>` : ''}${FOPT[k]().map(([v, l]) => `<button class="fchip ${String(f[k] || (k === 'sort' ? 'ovr' : '')) === String(v) ? 'on' : ''}" data-act="fset" data-arg="${k}:${v}">${l}</button>`).join('')}</div>`;
  modal(`<h2>⚙ Filtry wyszukiwania</h2>
    <h3>Kraj</h3><select data-change="fccs" style="width:100%"><option value="">Wszystkie kraje</option><option value="FREE" ${f.cc === 'FREE' ? 'selected' : ''}>Wolni agenci</option>${Object.values(S.countries).map(c => `<option value="${c.code}" ${f.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select>
    <div class="chipsrow wrap" style="margin-top:10px"><button class="fchip ${f.real ? 'on' : ''}" data-act="frealsheet">🎯 Tylko realne cele (budżet i chęć transferu)</button></div>
    ${grp('pos')}
    ${range('Wiek', 'ageMin', 'age', [16, 17, 18, 19, 20, 21, 23, 25, 28, 31, 34])}
    ${range('Ocena ogólna (OVR)', 'ovr', 'ovrMax', [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90])}
    ${range('Potencjał (POT)', 'potMin', 'potMax', [50, 55, 60, 65, 70, 75, 80, 85, 90, 95])}
    <small class="mut">Potencjał widać tylko u zawodników, których znasz (skauting ≥ 30%). Filtr liczy środek szacowanego zakresu.</small>
    ${range('Wartość zawodnika', 'priceMin', 'price', [1e5, 2.5e5, 5e5, 1e6, 2e6, 3e6, 5e6, 1e7, 2e7, 3e7, 5e7, 8e7], money)}${grp('sort')}
    <div class="pcbar"><div class="btns"><button class="btn" data-act="fresetsheet">Wyczyść</button><button class="btn pri sp" data-act="close">Pokaż wyniki (${n})</button></div></div>`);
}
const NUMF = ['priceMin', 'age', 'ageMin', 'ovr', 'ovrMax', 'potMin', 'potMax', 'price'];
CHG.frng = (v, el) => { UI.f[el.dataset.k] = +v; const sc = $('#modal .box').scrollTop; filterSheet(); render(); $('#modal .box').scrollTop = sc; };
ACT.fsheet = () => filterSheet();
ACT.fset = a => { const [k, v] = a.split(':'); UI.f[k] = v === '' ? (NUMF.includes(k) ? 0 : '') : NUMF.includes(k) ? +v : v; const b = $('#modal .box'), sc = b ? b.scrollTop : 0; filterSheet(); render(); $('#modal .box').scrollTop = sc; };
CHG.fccs = v => { UI.f.cc = v; const sc = $('#modal .box').scrollTop; filterSheet(); render(); $('#modal .box').scrollTop = sc; };
ACT.frealsheet = () => { UI.f.real = !UI.f.real; const sc = $('#modal .box').scrollTop; filterSheet(); render(); $('#modal .box').scrollTop = sc; };
ACT.fclr = k => { UI.f[k] = NUMF.includes(k) ? 0 : ''; render(); };
ACT.freset = () => { Object.assign(UI.f, { cc: '', pos: '', age: 0, ageMin: 0, ovr: 0, ovrMax: 0, potMin: 0, potMax: 0, price: 0, priceMin: 0, real: false }); render(); };
ACT.fresetsheet = () => { ACT.freset(); filterSheet(); };
CHG.fq = v => { UI.f.q = v; render(); };
ACT.freal = () => { UI.f.real = !UI.f.real; render(); };
function vShort() {
  const l = S.short.map(pget).filter(Boolean);
  return `<div class="card list">${l.map(mkRow).join('') || empty('⭐', 'Lista obserwowanych jest pusta', 'Dodaj zawodników z ich karty (☆ Obserwuj) albo poproś skautów o raport.', '<button class="btn sm pri" data-act="mktab" data-arg="search">Szukaj zawodników</button>')}</div>`;
}
function vScout() {
  const ut = userClub();
  return `<h3>Twoi skauci (${S.scouts.length}/5)</h3>${S.scouts.map(s => `<div class="card"><div class="row"><b class="sp">${esc(s.name)}</b><span class="pill">ocena ${s.ab}/20</span></div>
      <small class="mut">${money(s.cost)}/tydz. • ${s.task ? (s.task.k === 'player' ? `obserwuje: ${esc(pget(s.task.pid) ? pget(s.task.pid).n : '?')}` : `misja: ${scoutTaskText(s.task)} (${s.task.weeks} tyg.)`) : 'wolny'}</small>
      <div class="btns"><button class="btn sm pri" data-act="mission" data-arg="${s.id}">🌍 Misja skautingowa</button><button class="btn sm red" data-act="firescout" data-arg="${s.id}">Zwolnij</button></div></div>`).join('')}
    <h3>Raporty (${S.reports.length})</h3>
    <div class="card list">${S.reports.slice(0, 40).map(r => { const p = pget(r.pid); if (!p) return ''; return `<div class="prow" data-act="report" data-arg="${S.reports.indexOf(r)}"><span class="grade g${r.grade.replace('+', 'p')}">${r.grade}</span>${posTag(p.pos)}<div class="pn">${flag(p.nat)} ${esc(p.n)}<small>${esc(clubName(p))} • ${p.age} l. • ocena ${r.eo}, pot. ${r.ep}</small></div>›</div>`; }).join('') || empty('🔍', 'Brak raportów', 'Wyślij skautów na misję – raporty pojawią się po kilku tygodniach.')}</div>
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
      <label>Czas trwania<select data-change="mweeks">${[2, 4, 8, 12].map(w => `<option value="${w}" ${m.weeks === w ? 'selected' : ''}>${plural(w, "tydzień", "tygodnie", "tygodni")}</option>`).join('')}</select></label>
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
    <div class="btns"><button class="btn pri sp" data-act="accept" data-arg="${o.id}">Akceptuj</button><button class="btn" data-act="ctroffer" data-arg="${o.id}">💬 Negocjuj</button><button class="btn" data-act="decline" data-arg="${o.id}">Odrzuć</button></div><div class="btns"><button class="btn sm full" data-act="acceptbb" data-arg="${o.id}">🔁 Sprzedaj z klauzulą odkupu (−10%, odkup za ${money(Math.round(o.amount * 0.9 * 1.6 / 1e4) * 1e4)} przez 2 sezony)</button></div></div>`; }).join('') || `<div class="card">${empty('📭', 'Brak ofert za Twoich zawodników', 'Wystaw zawodnika na sprzedaż w jego karcie – oferty przychodzą w oknie transferowym.')}</div>`;
}
ACT.ctroffer = id => { const o = S.offers.find(x => x.id === +id); if (!o) return; const p = pget(o.pid); CTR = { id: o.id, ask: o.agreed ? o.amount : Math.round(Math.max(o.amount * 1.2, p.val) / 1e4) * 1e4 }; renderCtr(o.agreed ? { cls: 'good', t: `Uzgodniono ${money(o.amount)} – wystarczy potwierdzić sprzedaż.` } : undefined); };
let CTR = null;
function renderCtr(note) {
  const o = S.offers.find(x => x.id === CTR.id); if (!o) return closeModal();
  const p = pget(o.pid), b = club(o.from);
  modal(`<h2>💬 Negocjacje: ${esc(p.n)}</h2><small class="mut">${esc(b.name)} oferuje ${money(o.amount)} • wartość zawodnika ${money(p.val)}</small>
    <div class="stepper"><button class="btn" data-act="ctrstep" data-arg="-1">−</button><b>${money(CTR.ask)}</b><button class="btn" data-act="ctrstep" data-arg="1">+</button></div>
    <div class="numrow"><span>Twoja cena (€):</span><input class="numin" type="number" inputmode="numeric" min="0" step="10000" value="${CTR.ask}" data-change="ctrnum"></div>
    ${note ? `<p class="${note.cls}">${esc(note.t)}</p>` : '<small class="mut">Klub może przyjąć Twoją cenę, podnieść ofertę albo się wycofać. Masz dwie próby.</small>'}
    <div class="btns"><button class="btn pri sp" data-act="ctrsend">Zażądaj ${money(CTR.ask)}</button><button class="btn" data-act="accept" data-arg="${o.id}">Sprzedaj za ${money(o.amount)}</button></div>
    <div class="btns"><button class="btn full" data-act="close">Wróć</button></div>`);
}
ACT.ctrstep = d => { CTR.ask = Math.max(0, CTR.ask + +d * feeStep(CTR.ask)); renderCtr(); };
CHG.ctrnum = v => { CTR.ask = Math.max(0, Math.round(+v || 0)); setTimeout(() => renderCtr()); };
ACT.ctrsend = () => { const r = counterOffer(CTR.id, CTR.ask); if (r.res === 'gone') { closeModal(); toast(r.msg, 'bad'); render(); return; } renderCtr({ cls: r.res === 'accept' ? 'good' : 'warn', t: r.msg }); render(); };
ACT.accept = id => { const o = S.offers.find(x => x.id === +id), p = o && pget(o.pid); if (p) { const rk = userClub().players.filter(q => q.ovr > p.ovr).length; if ((rk < 5 || o.amount < p.val) && !confirm(`Sprzedać ${p.n} (OVR ${p.ovr}${rk < 5 ? ', jeden z najlepszych w kadrze' : ''}) za ${money(o.amount)}?${o.amount < p.val ? ` To mniej niż jego wartość (${money(p.val)}).` : ''}`)) return; } const r = sellTo(+id); toast(r.msg); closeModal(); render(); };
ACT.decline = id => { const o = S.offers.find(x => x.id === +id); if (o) { const p = pget(o.pid); if (p && o.amount > p.val * 1.3) p.mor = clamp(p.mor - 8, 0, 100); declineOfferMeta(o); } S.offers = S.offers.filter(x => x.id !== +id); saveSoon(); render(); };
const NEWS_F = { all: ['Wszystkie', () => true], mine: ['Moja liga', t => S.leagues[userClub().lg].clubs.some(id => t.includes(club(id).name))], tr: ['Transfery', t => /Transfer|odchodzi|przechodzi|kupuje|podpisuje/i.test(t)], co: ['Trenerzy', t => /trener/i.test(t)] };
ACT.nwf = k => { UI.nwf = k; render(); };
function vNews() { const k = UI.nwf || 'all', L = S.news.filter(n => NEWS_F[k][1](n.t));
  return `<div class="chipsrow">${Object.entries(NEWS_F).map(([x, v]) => `<button class="fchip ${k === x ? 'on' : ''}" data-act="nwf" data-arg="${x}">${v[0]}</button>`).join('')}</div><div class="card">${L.map(n => `<div class="msg"><small>${n.d ? fmtDate(n.d) : ''}</small><p style="color:var(--txt)">${esc(n.t)}</p></div>`).join('') || '<small class="mut">Brak wieści.</small>'}</div>`; }

/* ---------- KLUB ---------- */
function vClub() {
  if (!['mgr', 'board', 'troph', 'nt', 'game'].includes(UI.clubTab)) UI.clubTab = 'mgr';
  const head = tabs([['mgr', 'Trener'], ['board', 'Zarząd'], ['troph', 'Gablota'], ['nt', 'Reprezentacja'], ['game', 'Gra']], UI.clubTab, 'cltab');
  return head + ({ mgr: vMgr, board: vBoard, troph: vTroph, nt: vNTManage, game: vGame })[UI.clubTab]();
}
function vOffice() {
  if (!['fin', 'staff', 'rank'].includes(UI.offTab)) UI.offTab = 'fin';
  return tabs([['fin', '💶 Finanse'], ['staff', '🧑‍💼 Sztab'], ['rank', '🏆 Rankingi']], UI.offTab, 'offtab') + ({ fin: vFin, staff: vStaff, rank: vRank })[UI.offTab]();
}
ACT.offtab = a => { if (a !== UI.offTab) navPush(); UI.offTab = a; render(); };
ACT.cltab = a => { if (a !== UI.clubTab) navPush(); UI.clubTab = a; render(); };
function boardReqHtml() {
  return `<div class="card list"><h2>🏛️ Prośby do zarządu</h2><small class="mut">Zaufanie zarządu: ${Math.round(S.board.conf)}%. Odmowa nieco psuje relacje; o to samo możesz prosić co ~3 miesiące.</small>
    ${Object.keys(BREQ).map(k => { const i = boardReqInfo(k); return `<div class="prow"><div class="pn">${BREQ[k][0]}<small>${BREQ[k][1]}${i.amt ? ` Kwota: ${money(i.amt)}${k === 'wb' ? '/tydz' : ''}.` : ''}${i.cost ? ` Koszt klubu: ${money(Math.round(i.cost / 2))}.` : ''} ${i.lock ? '🔒 ' + i.lock : 'Szanse: ' + appChanceTxt(i.p) + '.'}</small></div><button class="btn sm" data-act="breq" data-arg="${k}" ${i.lock ? 'disabled' : ''}>Poproś</button></div>`; }).join('')}</div>`;
}
ACT.breq = k => { const r = boardRequest(k); toast(r.msg, r.ok ? 'ok' : 'bad'); render(); };
function vFin() {
  const ut = userClub(), lf = ut.lastFin, bill = sum(ut.players.map(p => p.wage)), sc = sum(S.scouts.map(s => s.cost));
  const wb = S.board.wb || 0, room = wageRoom(), maxUp = Math.floor(Math.max(0, ut.tb) / 52 / 500) * 500, maxDn = Math.max(0, Math.floor(room / 500) * 500);
  return `<div class="card hl"><h2>⇄ Budżety</h2>
    <div class="kv"><div><span>Budżet transferowy</span><b class="good">${money(ut.tb)}</b></div><div><span>Budżet płac</span><b>${money(wb)}/tydz.</b></div><div><span>Pensje teraz</span><b>${money(wageBill(ut))}/tydz.</b></div><div><span>Wolne na pensje</span><b class="${room < 0 ? 'bad' : 'good'}">${money(room)}/tydz.</b></div></div>
    <small class="mut">Przesuń suwak: w prawo – więcej na pensje (z budżetu transferowego), w lewo – więcej na transfery (z niewykorzystanych płac). 1 000 €/tydz. pensji = 52 000 € transferów.</small>
    <input type="range" style="width:100%;margin:10px 0" min="${-maxDn}" max="${maxUp}" step="500" value="0" data-change="wbslide">
    <div class="seg wrap">${[-10000, -2000, 2000, 10000].map(v => `<button class="btn sm" data-act="wbshift" data-arg="${v}" ${v > 0 ? (v > maxUp ? 'disabled' : '') : (-v > maxDn ? 'disabled' : '')}>${v > 0 ? '+' : '−'}${money(Math.abs(v))}/tydz. płac</button>`).join('')}</div></div>
  ${boardReqHtml()}
  <div class="card"><h2>Finanse</h2>
    <div class="kv"><div><span>Saldo</span><b class="${ut.bal < 0 ? 'bad' : ''}">${money(ut.bal)}</b></div><div><span>Budżet transf.</span><b>${money(ut.tb)}</b></div>
    <div><span>Pensje/tydz.</span><b>${money(bill)}</b></div><div><span>Skauci/tydz.</span><b>${money(sc)}</b></div>
    <div><span>Sponsorzy/tydz.</span><b>${money(ut.spons)}</b></div><div><span>Prawa TV/tydz.</span><b>${money(ut.tv)}</b></div>
    <div><span>Stadion</span><b>${ut.cap.toLocaleString('pl-PL')}</b></div><div><span>Bilet</span><b>${Math.round(ut.price)} €</b></div>
    <div><span>Przychody (sezon)</span><b>${money(ut.fin.inc)}</b></div><div><span>Wydatki (sezon)</span><b>${money(ut.fin.exp)}</b></div>
    <div><span>Bilans transferów</span><b class="${ut.fin.tr < 0 ? 'bad' : 'good'}">${money(ut.fin.tr)}</b></div><div><span>Reputacja</span><b>${ut.rep}</b></div>
    <div><span>Sztab/tydz.</span><b>${money(staffCost())}</b></div><div><span>Akademia/tydz.</span><b>${money(acadCost())}</b></div>${ut.opex ? `<div><span>Koszty operacyjne/tydz.</span><b>${money(ut.opex)}</b></div>` : ''}
    ${(S.debts || []).length ? `<div><span>Raty do spłaty</span><b class="warn">${money(sum(S.debts.map(d => d.amt * d.left)))}</b></div>` : ''}</div>
    ${lf ? `<small class="mut">Ostatni tydzień: bilety ${money(lf.gate)}, TV ${money(lf.tv)}, sponsorzy ${money(lf.spons)}, pensje i koszty (sztab, akademia, skauci${lf.opex ? ', operacyjne' : ''}) ${money(lf.wages)} → <b class="${lf.net >= 0 ? 'good' : 'bad'}">${money(lf.net)}</b></small>` : ''}</div>
    ${(() => { const h = (S.uhist || []).filter(x => x.s === S.season); return h.length >= 2 && typeof sparkSVG === 'function' ? `<div class="card"><b>Saldo w sezonie</b><div>${sparkSVG(h.map(x => x.bal), { w: 320, h: 60 })}</div><small class="mut">${money(h[0].bal)} → ${money(h[h.length - 1].bal)}</small></div>` : ''; })()}
    <div class="card"><h2>Zarząd</h2>${bar(S.board.conf)}<small>Zaufanie ${Math.round(S.board.conf)}%. ${esc(S.board.text)}${S.board.euro ? ' Europa: ' + esc(S.board.euro) + '.' : ''}</small>
    <div class="kv"><div><span>Menedżer</span><b>${esc(S.manager)}</b></div><div><span>OVR trenera</span><b>${Math.round(S.mgr.ovr)}</b></div></div></div>`;
}
const AWN = { potm: '🏅 Piłkarz miesiąca', pots: '⭐ Piłkarz sezonu', yots: '🌱 Młodzieżowiec sezonu', boot: '👟 Król strzelców', motm: '🧑‍💼 Trener sezonu' };
function recordsCard() {
  const R = (S.crec || {})[S.user]; if (!R) return '';
  const all = Object.values(R.all), top = (k, n) => all.slice().sort((a, b) => b[k] - a[k]).slice(0, n);
  return `<div class="card"><h2>📜 Rekordy klubu (Twoja kadencja)</h2><div class="kv">
    ${R.bigWin ? `<div><span>Najwyższe zwycięstwo</span><b class="wrap">${esc(R.bigWin.txt)}</b></div>` : ''}${R.bigLoss ? `<div><span>Najwyższa porażka</span><b class="wrap">${esc(R.bigLoss.txt)}</b></div>` : ''}
    ${R.buy ? `<div><span>Rekordowy zakup</span><b>${esc(R.buy.n)} – ${money(R.buy.fee)}</b></div>` : ''}${R.sale ? `<div><span>Rekordowa sprzedaż</span><b>${esc(R.sale.n)} – ${money(R.sale.fee)}</b></div>` : ''}
    ${R.crowd ? `<div><span>Rekordowa frekwencja</span><b>${R.crowd.toLocaleString('pl-PL')}</b></div>` : ''}</div>
    ${all.length ? `<h3>Najlepsi strzelcy</h3>${top('g', 5).filter(a => a.g).map((a, i) => `<div class="rt"><span>${i + 1}. ${esc(a.n)}</span><b>${a.g}</b></div>`).join('')}<h3>Najwięcej występów</h3>${top('apps', 5).map((a, i) => `<div class="rt"><span>${i + 1}. ${esc(a.n)}</span><b>${a.apps}</b></div>`).join('')}` : ''}</div>`;
}
function awardsCard() {
  const A = (S.pawards || []).filter(a => a.k === 'motm' || (pget(a.pid) && (pget(a.pid).tid === S.user || a.club === userClub().short))).slice(-30).reverse();
  const L = (S.pawards || []).filter(a => a.lg === userClub().lg && a.k !== 'potm' && a.k !== 'motm').slice(-8).reverse();
  return `<div class="card"><h2>🎖️ Nagrody indywidualne</h2>${A.length ? A.map(a => `<div class="rt" ${a.pid ? `data-act="info" data-arg="${a.pid}"` : ''}><span>${AWN[a.k]} • ${esc(a.n)}</span><small>${a.m != null ? MONTHS[a.m] + ' ' : ''}${SEASON_LABEL(a.s)}</small></div>`).join('') : '<small class="mut">Twoi zawodnicy nie zdobyli jeszcze nagród. Piłkarz miesiąca wybierany jest w każdej lidze na początku miesiąca.</small>'}
    ${L.length ? `<h3>Ostatnie nagrody w lidze</h3>${L.map(a => `<div class="rt" data-act="info" data-arg="${a.pid}"><span>${AWN[a.k]} • ${esc(a.n)} <small class="mut">${esc(a.club)}</small></span><small>${SEASON_LABEL(a.s)}</small></div>`).join('')}` : ''}</div>`;
}
function vTroph() {
  const done = ACH.filter(a => S.ach[a[0]]).length;
  return `<div class="card"><h2>🏆 Gablota</h2>${S.trophies.length ? S.trophies.slice().reverse().map(t => `<div class="rt"><span>${TROPHY_ICON[t.kind] || '🏆'} ${esc(t.name)}</span><small>${SEASON_LABEL(t.season)}${t.club != null ? ' • ' + esc(club(t.club).short) : ''}</small></div>`).join('') : '<small class="mut">Gablota czeka na pierwsze trofeum.</small>'}</div>
    ${awardsCard()}${recordsCard()}
    <div class="card"><h2>🏅 Osiągnięcia (${done}/${ACH.length})</h2>${ACH.map(([id, n, d]) => `<div class="ach ${S.ach[id] ? 'on' : ''}"><b>${n}</b><small>${d}${S.ach[id] ? ` • ${SEASON_LABEL(S.ach[id])}` : ''}</small></div>`).join('')}</div>
    <div class="card"><h2>📊 Statystyki</h2><div class="kv"><div><span>Mecze</span><b>${S.stats.games}</b></div><div><span>Zwycięstwa</span><b>${S.stats.wins}</b></div><div><span>Seria bez porażki</span><b>${S.stats.unbeaten}</b></div><div><span>Rekord serii</span><b>${S.stats.bestUnbeaten}</b></div></div></div>`;
}
function vMgr() {
  const o = S.mgr.ovr, maxR = Math.round(maxRepFor(o));
  const cnt = tier => S.clubs.filter(c => S.leagues[c.lg].tier === tier && c.rep <= maxR).length;
  const coaches = S.clubs.filter(c => c.id !== S.user).map(c => ({ c, o: c.coach.ovr })).sort((a, b) => b.o - a.o).slice(0, 15);
  return `<div class="card hl"><div class="row"><span class="ovr ${ovrCls(Math.round(o))}" style="font-size:22px;height:40px;min-width:48px">${Math.round(o)}</span><div class="sp"><b>${esc(S.manager)}</b><br><small class="mut">${mgrLabel(o)} • najwyższy OVR: ${Math.round(S.mgr.best || o)}</small></div></div>
    ${bar(o)}<small class="mut">OVR trenera rośnie za wygrane (zwłaszcza z silniejszymi), realizację celów, awanse, trofea i sukcesy w pucharach. Wpływa też lekko na grę Twojej drużyny.</small></div>
    <div class="card"><h2>Rynek pracy</h2><small class="mut">Oferty mogą składać kluby o reputacji do <b>${maxR}</b>. Dostępne kluby: poziom 1: ${cnt(1)} • poziom 2: ${cnt(2)} • poziom 3: ${cnt(3)} • poziom 4: ${cnt(4)}.</small>
    <div class="btns"><button class="btn sm" data-act="jobs" ${S.jobs.length ? '' : 'disabled'}>Oferty pracy (${S.jobs.length})</button></div></div>
    ${vacHtml()}
    <div class="card list"><h2>Najlepsi trenerzy</h2>${coaches.map(x => `<div class="prow" data-act="clubv" data-arg="${x.c.id}">${badge(x.c, 'sm')}<div class="pn">${esc(x.c.coach.n)}<small>${esc(x.c.name)}</small></div>${ovrTag(x.o)}</div>`).join('')}</div>`;
}
function vacHtml() {
  const V = vacancies().sort((a, b) => b.c.rep - a.c.rep), A = S.apps || [];
  const st = a => a.st === 'wait' ? '<span class="pill">⏳ czeka na decyzję</span>' : a.st === 'ok' ? '<span class="pill g">✅ oferta</span>' : '<span class="pill r">❌ odmowa</span>';
  return `<div class="card list"><h2>🪑 Wolne posady</h2><small class="mut">Kluby, które zwolniły trenera i szukają następcy. Możesz sam zgłosić kandydaturę (maks. 2 naraz) – uważaj, informacja może wyciec do mediów i zdenerwować Twój zarząd.</small>
    ${V.length ? V.map(v => { const c = v.c, a = A.find(x => x.club === c.id), p = appChance(c), r = table(c.lg).find(x => x.id === c.id);
      return `<div class="prow">${badge(c, 'sm')}<div class="pn" data-act="clubv" data-arg="${c.id}">${esc(c.name)}<small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • ${r ? r.pos + '. miejsce • ' : ''}rep. ${c.rep} • szanse: ${appChanceTxt(p)}</small></div>${a ? st(a) : `<button class="btn sm" data-act="applyjob" data-arg="${c.id}">Aplikuj</button>`}</div>`; }).join('') : '<small class="mut">Obecnie brak wolnych posad.</small>'}
    ${A.filter(a => !V.some(v => v.c.id === a.club)).map(a => { const c = club(a.club); return c ? `<div class="prow">${badge(c, 'sm')}<div class="pn">${esc(c.name)}</div>${st(a)}</div>` : ''; }).join('')}</div>`;
}
ACT.applyjob = id => { const c = club(+id); if (!confirm(`Złożyć aplikację na stanowisko trenera ${c.name}?`)) return; const r = applyJob(+id); toast(r.msg, r.ok ? '' : 'bad'); saveSoon(); render(); };
function vStaff() {
  initStaff(); const mk = staffMarket(), stars = ab => { const n = clamp(Math.round(ab / 4), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };
  return `<div class="card"><h2>🧑‍💼 Sztab szkoleniowy</h2><small class="mut">Koszt sztabu: ${money(staffCost())}/tydz. Zatrudnienie nowej osoby oznacza odprawę dla poprzednika (8 tygodniówek). Lista kandydatów odświeża się co kilka tygodni.</small></div>
    ${Object.entries(STAFF_ROLES).map(([k, [n, d]]) => { const x = S.staff[k]; return `<div class="card"><div class="row"><b class="sp">${n}</b><span class="stars">${stars(x.ab)}</span></div>
      <small>${esc(x.n)} • umiejętności <b>${x.ab}/20</b> • ${money(x.wage)}/tydz.</small><br><small class="mut">${d}</small>
      <details><summary class="mut" style="margin-top:6px">Kandydaci (${mk[k].length})</summary>${mk[k].map((c, i) => `<div class="row" style="margin:6px 0"><span class="sp">${esc(c.n)}<br><small class="mut">${c.ab}/20 • ${money(c.wage)}/tydz.</small></span><span class="${c.ab > x.ab ? 'good' : 'bad'}">${c.ab > x.ab ? '▲' : '▼'}${Math.abs(c.ab - x.ab)}</span><button class="btn sm" data-act="hirestaff" data-arg="${k}:${i}">Zatrudnij</button></div>`).join('') || '<small class="mut">Brak kandydatów.</small>'}</details></div>`; }).join('')}`;
}
ACT.hirestaff = a => { const [k, i] = a.split(':'); if (!confirm('Zatrudnić nową osobę do sztabu?')) return; const r = hireStaff(k, +i); toast(r.msg, r.ok ? 'ok' : 'bad'); render(); };
function vAcad() {
  const A = S.acad, ys = A.youth.slice().sort((a, b) => b.acad.est - a.acad.est);
  const potStars = v => { const n = clamp(Math.round((v - 50) / 9), 1, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); };
  const prog = y => { const o0 = y.acad.ovr0 != null ? y.acad.ovr0 : y.ovr, gain = y.ovr - o0, pc = clamp(Math.round((y.ovr - 30) / Math.max(1, y.acad.est - 30) * 100), 0, 100); return `<div class="row" style="gap:6px"><div class="sp">${bar(pc)}</div><small class="${gain > 0 ? 'good' : 'mut'}">${gain > 0 ? '+' + gain : '±0'} OVR</small></div>`; };
  const ready = ys.filter(y => y.ovr >= teamLevel(userClub()) - 8);
  return `<div class="card"><div class="row"><h2 class="sp" style="margin:0">🎓 Akademia</h2><button class="btn sm" data-act="nav" data-arg="fac">🏗️ Rozbudowa</button></div>
    <div class="grid3" style="margin-top:8px"><div class="card stat"><small>Juniorzy</small><b>${ys.length}</b></div><div class="card stat"><small>Najwyższy pot.</small><b>${ys.length ? '~' + ys[0].acad.est : '–'}</b></div><div class="card stat"><small>Gotowi</small><b>${ready.length}</b></div></div>
    <small class="mut">Infrastruktura ${A.fac}/5 • trenerzy ${A.coach}/5 • rekrutacja ${A.rec}/5 • koszt ${money(acadCost())}/tydz. • nabór w marcu.</small>
    <h3>Region rekrutacji</h3><select data-change="acreg" style="width:100%"><option value="">Kraj klubu (${S.countries[userClub().cc].name})</option>${NATIONS.slice().sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(n => `<option value="${n.code}" ${A.region === n.code ? 'selected' : ''}>${n.flag} ${n.name}</option>`).join('')}</select></div>
    ${S.yl && S.yl.club === S.user ? `<h3>🏆 Liga juniorów U19 <small class="mut">(kolejka ${S.yl.md}/${S.yl.fix.length})</small></h3><div class="card list">${ylTable().map((r, i) => `<div class="prow ${r.id === S.user ? 'sel' : ''}"><span class="mini">${i + 1}.</span><div class="pn">${esc(r.n)}<small>${r.W}-${r.D}-${r.L} • ${r.GF}:${r.GA}</small></div><b>${r.Pts}</b></div>`).join('')}</div>${S.yl.last ? `<small class="mut">Ostatni mecz: ${esc(S.yl.last)}</small>` : ''}<br><small class="mut">Juniorzy grający w lidze U19 rozwijają się szybciej.</small>` : ''}
    <h3>Juniorzy – rozwój</h3>
    <div class="card list">${ys.map(y => `<div class="prow" data-act="info" data-arg="${y.id}" style="flex-wrap:wrap">${posTag(y.pos)}<div class="pn">${flag(y.nat)} ${esc(y.n)}<small>${y.age} l. • ${y.ys && y.ys.m ? `U19: ${y.ys.m} m., ${y.ys.g} g., śr. ${(y.ys.r / y.ys.m).toFixed(1)} • ` : ''}${pers(y)} • potencjał <span class="stars">${potStars(y.acad.est)}</span> (~${y.acad.est})${y.focus != null ? ' • 🎯 trening specjalny' : ''}${(S.mentors || []).some(x => x.p === y.id) ? ' • 🧑‍🏫 mentor' : ''}</small></div>${ovrTag(y.ovr)}<button class="btn sm" data-act="promote" data-arg="${y.id}">⬆</button><button class="ibtn" data-act="relyouth" data-arg="${y.id}">✕</button><div style="flex-basis:100%">${prog(y)}</div></div>`).join('') || empty('🎓', 'Brak juniorów', 'Nabór odbywa się w marcu. Rozbuduj rekrutację w zakładce Obiekty, by przyszło więcej talentów.')}</div>
    ${ready.length ? `<small class="good">✔ Gotowi do pierwszego zespołu: ${ready.map(y => esc(lastName(y))).join(', ')}.</small><br>` : ''}
    ${(S.mentors || []).length ? `<h3>🧑‍🏫 Mentorzy</h3><div class="card list">${S.mentors.map(x => { const m = pget(x.m), u = pget(x.p); return m && u ? `<div class="prow" data-act="info" data-arg="${u.id}"><div class="pn">${esc(m.n)} → ${esc(u.n)}<small>${pers(m)} • uczeń: ${pers(u)}</small></div></div>` : ''; }).join('')}</div>` : ''}
    <small class="mut">Pasek pokazuje drogę od obecnej oceny do szacowanego potencjału. ⬆ – awans do pierwszego zespołu. Kliknij juniora, by ustawić trening specjalny, mentora lub wypożyczenie. Juniorzy, którzy skończą 21 lat bez awansu, odchodzą z klubu.</small>`;
}
CHG.acreg = v => { S.acad.region = v; saveSoon(); };
ACT.promote = id => { const r = promoteYouth(+id); toast(r.msg); closeModal(); render(); };
ACT.relyouth = id => { if (confirm('Zwolnić juniora z akademii?')) { releaseYouth(+id); closeModal(); render(); } };
function vFac() {
  const ut = userClub(), A = S.acad;
  const lvl = n => `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
  const fac = (k, n, d) => `<div class="row" style="margin:10px 0"><div class="sp"><b>${n}</b><br><small class="mut">${d}</small></div>${lvl(facGet(k))}${facGet(k) < 5 ? `<button class="btn sm" data-act="upfac" data-arg="${k}">${money(FAC_COST(facGet(k)))}</button>` : ''}</div>`;
  const com = k => `<div class="row" style="margin:10px 0"><div class="sp"><b>${COMM[k][0]}</b><br><small class="mut">${COMM[k][1]}</small></div>${lvl(commLvl(k))}${commLvl(k) < 5 ? `<button class="btn sm" data-act="upcomm" data-arg="${k}">${money(commCost(k, commLvl(k)))}</button>` : ''}</div>`;
  return stadiumCard(ut) + `<div class="card"><h2>⚽ Ośrodek treningowy</h2>${fac('train', 'Boiska i siłownia', 'Szybszy rozwój wszystkich zawodników.')}</div>
    <div class="card"><h2>🎓 Akademia – obiekty</h2>${fac('fac', ACAD_NAMES.fac, 'Wyższy potencjał wychowanków.')}${fac('coach', ACAD_NAMES.coach, 'Szybszy rozwój juniorów i trafniejsza ocena potencjału.')}${fac('rec', ACAD_NAMES.rec, 'Więcej juniorów co sezon, większa szansa na talent pokolenia.')}<small class="mut">Utrzymanie akademii: ${money(acadCost())}/tydz.</small></div>
    <div class="card"><h2>💼 Obiekty komercyjne</h2>${com('gastro')}${com('park')}${com('shop')}${com('hotel')}${com('museum')}${com('fanzone')}${com('screen')}</div><div class="card"><h2>🌱 Pielęgnacja i regeneracja</h2>${com('turf')}${com('recov')}${com('solar')}
      <small class="mut">${commLvl('hotel') ? `Hotel: ${money(hotelIncome())}/tydz. ` : ''}${commLvl('shop') ? `Sklep: ${money(shopIncome())}/tydz. ` : ''}${commLvl('museum') ? `Muzeum: ${money(museumIncome())}/tydz. ` : ''}Obiekty komercyjne zwiększają przychody klubu – zwracają się po kilku sezonach.</small></div>
    `;
}
ACT.upcomm = k => { const r = upgradeComm(k); toast(r.msg, r.ok ? 'ok' : 'bad'); render(); };
const stadExp = c => { const add = Math.max(1000, Math.round(c.cap * 0.1 / 500) * 500); return { add, cost: Math.round(add * c.price * 90 / 1e5) * 1e5 }; };
/* ---------- rysunek stadionu: trybuny rosną z pojemnością, wokół obiekty klubu ---------- */
function stadiumSVG(c, cap, opt = {}) {
  cap = cap || c.cap; let col = (c.col && c.col[0]) || '#2a6', col2 = (c.col && c.col[1]) || '#fff'; const W = 340, H = 230, cx = 170, cy = 112;
  if (typeof uk_dist === 'function' && uk_dist(col, '#2f9a4e') < 110) { const t0 = col; col = col2; col2 = t0; if (uk_dist(col, '#2f9a4e') < 110) col = '#c9d3e6'; }   // krzesełka nie mogą zlać się z murawą
  const sd = opt.std || stadInit(c), B = opt.builds || c.builds || [], T = k => standTiers(k, sd[k]), tiers = Math.max(T('main'), T('opp'), T('north'), T('south'));
  const corners = sd.corners, sides2 = true, four = true;
  const pw = 120, ph = 74, t = tiers === 3 ? 9 : 11, L = lv => opt.fac ? (opt.fac[lv] || 0) : (S.fac && S.fac[lv]) || 0;
  let o = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="stad" role="img" aria-label="Stadion ${cap} miejsc"><defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b3a2a"/><stop offset="1" stop-color="#10261b"/></linearGradient>
    <pattern id="mow" width="12" height="74" patternUnits="userSpaceOnUse"><rect width="6" height="74" fill="${L('turf') >= 3 ? '#2f9a4e' : '#2a8a45'}"/><rect x="6" width="6" height="74" fill="${L('turf') >= 3 ? '#35a957' : '#2f9a4e'}"/></pattern></defs>
    <rect width="${W}" height="${H}" rx="14" fill="url(#sky)"/>`;
  // drogi
  o += `<path d="M0 ${H - 24} H${W}" stroke="#2a3346" stroke-width="10"/><path d="M0 ${H - 24} H${W}" stroke="#ffd23f55" stroke-width="1" stroke-dasharray="8 8"/>`;
  // trybuny
  const stand = (x, y, w, h, n, vert) => { let s = ''; for (let i = 0; i < n; i++) { const d = i * (t - 1); const X = vert ? (x < cx ? x - d : x + d) : x - d * 0.6, Y = vert ? y - d * 0.6 : (y < cy ? y - d : y + d), Wd = vert ? w : w + d * 1.2, Hd = vert ? h + d * 1.2 : h;
      s += `<rect x="${X}" y="${Y}" width="${Wd}" height="${Hd}" rx="2" fill="${i % 2 ? col2 : col}" opacity="${0.92 - i * 0.12}" stroke="#0008" stroke-width=".6"/>`;
      for (let k = 2; k < (vert ? Hd : Wd) - 2; k += 4) s += vert ? `<line x1="${X + 1}" y1="${Y + k}" x2="${X + Wd - 1}" y2="${Y + k}" stroke="#0003" stroke-width=".6"/>` : `<line x1="${X + k}" y1="${Y + 1}" x2="${X + k}" y2="${Y + Hd - 1}" stroke="#0003" stroke-width=".6"/>`; }
    return s; };
  const x0 = cx - pw / 2, y0 = cy - ph / 2;
  o += stand(x0, y0 - t - 2, pw, t, T('main'), false) + stand(x0, y0 + ph + 2, pw, t, T('opp'), false);
  o += stand(x0 - t - 2, y0, t, ph, T('north'), true) + stand(x0 + pw + 2, y0, t, ph, T('south'), true);
  if (sd.safe) { const X = x0 + pw + 2, d = (T('south') - 1) * (t - 1); o += `<rect x="${X + d}" y="${y0 + ph * 0.2}" width="${t}" height="${ph * 0.6}" rx="2" fill="${col2}" opacity=".9" stroke="#0008" stroke-width=".6"/>`; for (let i = 0; i < 6; i++) o += `<circle cx="${X + d + t / 2}" cy="${y0 + ph * 0.24 + i * ph * 0.1}" r="1.6" fill="#ff5468"/>`; }
  if (sd.vip) { const d = (T('main') - 1) * (t - 1); o += `<rect x="${x0 + pw * 0.3}" y="${y0 - t - 2 - d - 4}" width="${pw * 0.4 * (0.6 + sd.vip * 0.1)}" height="3.5" rx="1" fill="#ffd23f"/>`; }
  if (corners) { const R = t * tiers * (corners === 2 ? 1 : 0.7); for (const [qx, qy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = qx < 0 ? x0 - R - 2 : x0 + pw + 2, Y = qy < 0 ? y0 - R - 2 : y0 + ph + 2; o += `<rect x="${X}" y="${Y}" width="${R}" height="${R}" rx="4" fill="${col}" opacity=".75" stroke="#0008" stroke-width=".6"/>`; } }
  { const rf = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#dfe8f5" fill-opacity=".16" stroke="#dfe8f5" stroke-opacity=".7" stroke-width="1.6"/>`, D = k => (T(k) - 1) * (t - 1) + t;
    if (sd.roof.main) o += rf(x0 - 4, y0 - 2 - D('main') - 3, pw + 8, D('main') + 1);
    if (sd.roof.opp) o += rf(x0 - 4, y0 + ph + 2, pw + 8, D('opp') + 1);
    if (sd.roof.north) o += rf(x0 - 2 - D('north') - 3, y0 - 4, D('north') + 1, ph + 8);
    if (sd.roof.south) o += rf(x0 + pw + 2, y0 - 4, D('south') + 1, ph + 8); }
  if (opt.hl) { const D = k => (T(k) - 1) * (t - 1) + t + 3, h = opt.hl, R = h === 'main' ? [x0 - 6, y0 - 2 - D('main') - 3, pw + 12, D('main') + 3] : h === 'opp' ? [x0 - 6, y0 + ph, pw + 12, D('opp') + 3] : h === 'north' ? [x0 - 2 - D('north') - 3, y0 - 6, D('north') + 3, ph + 12] : h === 'south' ? [x0 + pw, y0 - 6, D('south') + 3, ph + 12] : [x0 - 30, y0 - 30, pw + 60, ph + 60];
    o += `<rect x="${R[0]}" y="${R[1]}" width="${R[2]}" height="${R[3]}" rx="5" fill="none" stroke="#ffd23f" stroke-width="2" stroke-dasharray="5 3"/>`; }
  for (const b of B) { const D = b.s === 'main' ? [cx, y0 - t * tiers - 14] : b.s === 'opp' ? [cx, y0 + ph + t * tiers + 12] : b.s === 'north' ? [x0 - t * tiers - 12, cy] : b.s === 'south' ? [x0 + pw + t * tiers + 12, cy] : [x0 - 10, y0 - 10];
    o += `<text x="${D[0]}" y="${D[1]}" text-anchor="middle" font-size="12">🏗️</text>`; }
  // boisko
  o += `<rect x="${x0}" y="${y0}" width="${pw}" height="${ph}" fill="url(#mow)" stroke="#fff" stroke-opacity=".8" stroke-width="1"/><line x1="${cx}" y1="${y0}" x2="${cx}" y2="${y0 + ph}" stroke="#fff" stroke-opacity=".8"/><circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#fff" stroke-opacity=".8"/>
    <rect x="${x0}" y="${cy - 16}" width="16" height="32" fill="none" stroke="#fff" stroke-opacity=".8"/><rect x="${x0 + pw - 16}" y="${cy - 16}" width="16" height="32" fill="none" stroke="#fff" stroke-opacity=".8"/>`;
  // maszty oświetleniowe
  const mu = L('museum'); if (mu) o += `<rect x="${W - 64}" y="28" width="${20 + mu * 4}" height="11" rx="2" fill="#b98cff" opacity=".85"/><text x="${W - 61}" y="36" font-size="6.5" fill="#fff" font-weight="700">MUZEUM</text>`;
  const fz = L('fanzone'); if (fz) for (let i = 0; i < fz; i++) o += `<path d="M${x0 + pw - 10 - i * 16} ${H - 34} l6 -9 l6 9 z" fill="${i % 2 ? col : col2}" opacity=".9"/>`;
  const scr = L('screen'); if (scr) o += `<rect x="${x0 - t * tiers - 4}" y="${y0 - t * tiers - 14}" width="${14 + scr * 2}" height="8" rx="1" fill="#0b1220" stroke="#4da3ff"/>`;
  const sol = L('solar'); if (sol) for (let i = 0; i < sol; i++) o += `<rect x="${40 + i * 9}" y="30" width="7" height="10" fill="#1c3f8a" stroke="#8fb4ff" stroke-width=".5"/>`;
  const fl = cap >= 8000 ? [[x0 - 22, y0 - 22], [x0 + pw + 22, y0 - 22], [x0 - 22, y0 + ph + 22], [x0 + pw + 22, y0 + ph + 22]] : [[x0 - 8, y0 - 18], [x0 + pw + 8, y0 - 18]];
  for (const [x, y] of fl) o += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff6c2"/><circle cx="${x}" cy="${y}" r="7" fill="#fff6c2" opacity=".18"/>`;
  // obiekty wokół
  const park = L('park'); if (park) { o += `<rect x="8" y="${H - 64}" width="${Math.min(54, 30 + park * 5)}" height="30" rx="4" fill="#2b3447" stroke="#fff3"/>`; for (let i = 0; i < park * 3; i++) o += `<rect x="${12 + (i % 6) * 7}" y="${H - 60 + Math.floor(i / 6) * 9}" width="5" height="8" rx="1" fill="${['#ff5468', '#4da3ff', '#ffd23f', '#ddd'][i % 4]}"/>`; o += `<text x="10" y="${H - 67}" font-size="8" fill="#9fb0cf">P</text>`; }
  const gas = L('gastro'); for (let i = 0; i < gas; i++) o += `<rect x="${x0 + 8 + i * 22}" y="${y0 + ph + t * tiers + 8}" width="14" height="9" rx="2" fill="#ffb020"/><text x="${x0 + 11 + i * 22}" y="${y0 + ph + t * tiers + 15}" font-size="6">🍔</text>`;
  const shop = L('shop'); if (shop) o += `<rect x="${W - 70}" y="${H - 66}" width="${24 + shop * 4}" height="${14 + shop * 2}" rx="3" fill="${col}" stroke="${col2}"/><text x="${W - 66}" y="${H - 56}" font-size="7" fill="${col2}" font-weight="700">SKLEP</text>`;
  const hot = L('hotel'); if (hot) { const hh = 14 + hot * 9; o += `<rect x="${W - 34}" y="${H - 34 - hh}" width="24" height="${hh}" rx="2" fill="#c9d3e6"/>`; for (let i = 0; i < hot * 2; i++) o += `<rect x="${W - 31 + (i % 2) * 10}" y="${H - 32 - hh + 4 + Math.floor(i / 2) * 9}" width="6" height="5" fill="#ffe680"/>`; o += `<text x="${W - 32}" y="${H - 38 - hh}" font-size="7" fill="#9fb0cf">HOTEL</text>`; }
  const tr = opt.train != null ? opt.train : (S.fac && S.fac.train) || 1; for (let i = 0; i < Math.min(3, Math.ceil(tr / 2)); i++) o += `<rect x="${8 + i * 30}" y="8" width="26" height="17" rx="1" fill="#2a8a45" stroke="#fff8" stroke-width=".7"/><line x1="${21 + i * 30}" y1="8" x2="${21 + i * 30}" y2="25" stroke="#fff8" stroke-width=".7"/>`;
  const ac = S.acad ? S.acad.fac : 1; o += `<rect x="${W - 64}" y="8" width="${24 + ac * 6}" height="16" rx="3" fill="#4da3ff" opacity=".85"/><text x="${W - 60}" y="19" font-size="7" fill="#fff" font-weight="700">AKADEMIA</text>`;
  const rc = L('recov'); if (rc) o += `<rect x="8" y="30" width="${18 + rc * 4}" height="12" rx="6" fill="#19b97a" opacity=".85"/><text x="11" y="39" font-size="7" fill="#fff">SPA</text>`;
  if (opt.build && !B.length) { const bx = x0 + pw + t * tiers + 14, by = y0 - 34; o += `<path d="M${bx} ${by + 70} V${by} H${bx + 34} M${bx} ${by + 8} L${bx + 12} ${by}" stroke="#ffb020" stroke-width="2.4" fill="none"/><line x1="${bx + 30}" y1="${by}" x2="${bx + 30}" y2="${by + 18}" stroke="#ffb020"/><rect x="${bx + 26}" y="${by + 18}" width="8" height="6" fill="#ffb020"/>`; }
  o += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="10" font-weight="800" fill="#e8eefc">${esc(c.stadName || c.name)} • ${cap.toLocaleString('pl-PL')} miejsc</text>`;
  return o + '</svg>';
}
ACT.stadprev = id => { const ut = userClub(), P = stadProjects(ut).find(p => p.id === id); if (!P) return;
  const sd = JSON.parse(JSON.stringify(stadInit(ut))); if (P.k === 'exp') sd[P.s] += P.add; else if (P.k === 'roof') sd.roof[P.s] = 1; else if (P.k === 'corners') sd.corners++; else if (P.k === 'vip') sd.vip++; else if (P.k === 'safe') sd.safe = 1;
  const cap = ut.cap + (P.add || 0) + (P.k === 'safe' ? safeSeats(ut) : 0);
  modal(`<h2>👁 ${esc(P.name)}</h2>${stadiumSVG(ut, cap, { std: sd, builds: [], hl: P.s })}<p>${esc(P.d)}</p>${P.k === 'exp' ? `<small class="mut">${esc(STANDS[P.s])}: ${stadInit(ut)[P.s].toLocaleString('pl-PL')} → ${sd[P.s].toLocaleString('pl-PL')} miejsc. Stadion: ${ut.cap.toLocaleString('pl-PL')} → ${cap.toLocaleString('pl-PL')}.</small>` : ''}<div class="kv"><div><span>Koszt</span><b>${money(P.cost)}</b></div><div><span>Czas budowy</span><b>~${Math.round(P.days / 7)} tyg.</b></div></div>
    <div class="btns"><button class="btn pri sp" data-act="stadproj" data-arg="${P.id}" ${P.busy || P.lock ? 'disabled' : ''}>Buduj</button><button class="btn" data-act="close">Zamknij</button></div>`); };
ACT.stadproj = id => { const ut = userClub(), P = stadProjects(ut).find(p => p.id === id); if (!P) return; if (!confirm(`${P.name} za ${money(P.cost)}?`)) return; const r = startStadProject(id); toast(r.msg, r.ok ? 'ok' : 'bad'); closeModal(); render(); };
function stadProjHtml(ut) {
  const P = stadProjects(ut), B = ut.builds || [], sd = stadInit(ut);
  return `<h3>🏗️ Projekty rozbudowy</h3><small class="mut">Sam decydujesz, co budować: każda trybuna osobno, dachy, narożniki, loże i sektor stojący. Maks. 2 budowy naraz.</small>
    <div class="kv">${Object.keys(STANDS).map(k => `<div><span>${STANDS[k].replace(' (za bramką)', '')}</span><b>${sd[k].toLocaleString('pl-PL')}${sd.roof[k] ? ' ☂️' : ''}</b></div>`).join('')}${sd.corners ? `<div><span>Narożniki</span><b>${(sd.corners * cornerSeats(ut)).toLocaleString('pl-PL')}</b></div>` : ''}${sd.safe ? `<div><span>Kocioł (stojące)</span><b>${safeSeats(ut).toLocaleString('pl-PL')}</b></div>` : ''}${sd.vip ? `<div><span>Loże VIP</span><b>poz. ${sd.vip}</b></div>` : ''}</div>
    ${B.map(b => `<div class="row"><span class="pill">🏗️ ${esc(b.name)}</span><small class="mut sp" style="text-align:right">do ${fmtDate(b.done * 864e5)}</small></div>`).join('')}
    <div class="list">${P.map(p => `<div class="prow" data-act="stadprev" data-arg="${p.id}"><div class="pn">${esc(p.name)}<small>${esc(p.d)}</small></div><b style="white-space:nowrap">${p.busy ? '🏗️' : p.lock ? '🔒' : money(p.cost)}</b></div>`).join('')}</div>`;
}
function stadiumCard(ut) {
  const e = stadExp(ut), att = attendance(ut, false), dem = Math.round(ticketDemand(ut) * (0.85 + (S.fans != null ? S.fans : 60) / 400) * (1 + commLvl('park') * 0.03) * priceK(ut)), gate = Math.round(GATE_NET * att * ut.price * (1 + commLvl('gastro') * 0.06));
  const full = dem >= ut.cap;
  return `<div class="card"><h2>🏟️ Stadion</h2>${stadiumSVG(ut, ut.cap, { build: !!ut.stadBuild })}
    <div class="kv"><div><span>Pojemność</span><b>${ut.cap.toLocaleString('pl-PL')}</b></div><div><span>Popyt na bilety</span><b>${dem.toLocaleString('pl-PL')}</b></div>
    <div><span>Średnia frekwencja</span><b>${att.toLocaleString('pl-PL')} (${Math.round(att / ut.cap * 100)}%)</b></div><div><span>Wpływy z meczu</span><b>${money(gate)}</b></div></div>
    <h3>🎟️ Cena biletu</h3><div class="stepper"><button class="btn" data-act="tkt" data-arg="-1">−</button><b>${ut.price.toFixed(1)} € <small class="mut">(${Math.round(ut.price / basePrice(ut) * 100)}% standardu)</small></b><button class="btn" data-act="tkt" data-arg="1">+</button></div>
    <small class="mut">Wyższa cena = mniejszy popyt, ale więcej z każdego biletu. Gdy stadion jest pełny, podwyżka zwykle się opłaca; przy pustych trybunach – obniżka. Bardzo drogie bilety psują nastroje kibiców.</small>
    <small class="mut">Popyt rośnie z renomą klubu, poziomem ligi, nastrojami kibiców i parkingiem. ${full ? 'Stadion jest za mały – rozbudowa się opłaci.' : 'Na razie stadion nie zapełnia się – nowe miejsca nie zwiększą wpływów (ale dachy, loże i kocioł tak).'}${ut.stadBuild ? ` Trwa rozbudowa: +${ut.stadBuild.add.toLocaleString('pl-PL')} miejsc od ${SEASON_LABEL(ut.stadBuild.season)}.` : ''}</small>
    ${stadProjHtml(ut)}</div>`;
}
ACT.tkt = d => { const ut = userClub(), b = basePrice(ut); S.tkt = clamp(Math.round(((ut.price / b) + +d * 0.05) * 100) / 100, 0.5, 1.8); ut.price = Math.round(b * S.tkt * 10) / 10; saveSoon(); render(); };
ACT.stadexp = () => {
  const ut = userClub(), e = stadExp(ut);
  if (ut.bal < e.cost) return toast('Brak środków na rozbudowę stadionu.', 'bad');
  if (!confirm(`Rozbudować stadion o ${e.add} miejsc za ${money(e.cost)}? Nowe miejsca będą dostępne od następnego sezonu.`)) return;
  ut.cap0 = ut.cap0 || ut.cap; ut.bal -= e.cost; ut.fin.exp += e.cost; ut.stadBuild = { add: e.add, season: S.season + 1 }; S.board.conf = clamp(S.board.conf + 2, 0, 100);
  msg('🏗️ Rozbudowa stadionu', `Ruszyła rozbudowa stadionu – od nowego sezonu ${(ut.cap + e.add).toLocaleString('pl-PL')} miejsc.`); saveSoon(); render();
};
ACT.upfac = k => { const r = upgradeFacility(k); toast(r.msg); render(); };
function vNTManage() {
  if (!S.nt) return `<div class="card"><h2>Reprezentacja</h2><small class="mut">Możesz jednocześnie prowadzić klub i reprezentację. Wybierz kadrę narodową:</small></div>
    <div class="card list">${NATIONS.slice().sort((a, b) => b.str - a.str).map(n => `<div class="prow"><span style="font-size:20px">${n.flag}</span><div class="pn">${esc(n.name)}<small>${n.conf} • siła ${n.str}</small></div>${ntAllowed(n) ? `<button class="btn sm" data-act="takent" data-arg="${n.code}">Obejmij</button>` : `<span class="mut">🔒 OVR ${n.str - 10}</span>`}</div>`).join('')}</div>`;
  const st = S.ntTeams[S.nt], n = NAT[S.nt];
  const sq = st.sq.map(pget).filter(Boolean).sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos) || b.ovr - a.ovr);
  const pool = (NATIDX.get(S.nt) || []).filter(p => !st.sq.includes(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 40);
  const g = S.ntc.groups.find(g => g.teams.includes(S.nt));
  return `<div class="card hl"><div class="row"><span style="font-size:30px">${n.flag}</span><div class="sp"><b>${esc(n.name)}</b><br><small class="mut">Selekcjoner • siła ${n.str}</small></div><button class="btn sm red" data-act="leavent">Zrezygnuj</button></div></div>
    ${g ? ntGroupHtml(g, 'Twoja grupa') : ''}
    <div class="row"><h3 class="sp">Powołani (${sq.length}/26)</h3><button class="btn sm" data-act="autocall">Auto-powołania</button></div>
    <div class="card list">${sq.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${esc(clubName(p))} ${stTag(p)}</small></div>${morale(p)}${ovrTag(p.ovr)}<button class="ibtn" data-act="uncall" data-arg="${p.id}">✕</button></div>`).join('')}</div>
    <h3>Do powołania</h3><div class="card list">${pool.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${esc(clubName(p))} • ${p.age} l. ${stTag(p)}</small></div>${ovrTag(p.ovr)}<button class="ibtn" data-act="call" data-arg="${p.id}">+</button></div>`).join('')}</div>
    <small class="mut">Skład i taktykę reprezentacji ustawisz w zakładce Skład → Reprezentacja.</small>`;
}
ACT.takent = c => { if (!ntAllowed(NAT[c])) return toast('Za niski OVR trenera.'); setNT(c); toast(`Zostałeś selekcjonerem: ${NAT[c].name}!`); msg('Reprezentacja', `Objąłeś reprezentację: ${NAT[c].name}.`); render(); };
ACT.leavent = () => { if (confirm('Zrezygnować z prowadzenia reprezentacji?')) { setNT(null); UI.nt = false; render(); } };
ACT.autocall = () => { S.ntTeams[S.nt].sq = autoCallup(S.nt); saveSoon(); render(); };
ACT.call = id => { const st = S.ntTeams[S.nt]; if (st.sq.length >= 26) return toast('Maksymalnie 26 powołanych.'); st.sq.push(+id); saveSoon(); render(); };
ACT.uncall = id => { const st = S.ntTeams[S.nt]; st.sq = st.sq.filter(x => x !== +id); saveSoon(); render(); };
function vGame() {
  return `<div class="card"><h2>Zapis gry</h2><small class="mut">Gra zapisuje się automatycznie w pamięci urządzenia.</small>
    <div class="btns"><button class="btn sp" data-act="savegame">💾 Zapisz teraz</button><button class="btn" data-act="export">⬇️ Eksportuj</button><label class="btn">⬆️ Importuj<input type="file" accept=".json" data-change="import" hidden></label></div></div>
    <div class="card"><h2>Poziom trudności</h2><div class="row"><b class="sp">${DIFF[S.diff || 'normal'].n}</b>${(S.diff || 'normal') !== 'easy' ? '<button class="btn sm" data-act="difflower">Obniż</button>' : ''}</div><small class="mut">${DIFF[S.diff || 'normal'].d} Poziom można tylko obniżyć – podwyższenie byłoby zbyt łatwym sposobem na „podkręcenie” istniejącej kariery.</small></div>
    <div class="card"><h2>Kontrakty – asystent</h2><small class="mut">Od stycznia asystent sam przedłuża umowy wygasające po sezonie (za stawkę, jakiej żąda zawodnik, w ramach budżetu płac). Kluczowymi zawodnikami zajmujesz się zawsze sam.</small>
      <div class="seg">${[['off', 'Wyłączone'], ['fringe', 'Rotacyjni i rezerwowi'], ['all', 'Wszyscy poza kluczowymi']].map(([k, n]) => `<button class="btn sm ${(S.settings.autoRenew || 'off') === k ? 'on' : ''}" data-act="setrenew" data-arg="${k}">${n}</button>`).join('')}</div></div>
    <div class="card"><h2>Przerywniki</h2><small class="mut">Ustal, o co gra ma Cię pytać. Asystent przejmie resztę.</small>
      <h3>Konferencje prasowe</h3><div class="seg">${[['on', 'Często'], ['rare', 'Tylko ważne mecze'], ['off', 'Wyłączone']].map(([k, n]) => `<button class="btn sm ${(S.settings.press || 'rare') === k ? 'on' : ''}" data-act="setpress" data-arg="${k}">${n}</button>`).join('')}</div>
      ${[['htAuto', 'Odprawę w przerwie prowadzi asystent', true], ['autoSubs', 'Asystent robi zmiany zmęczonych zawodników (mecz na żywo)', true], ['autoPause', 'Pauza przy czerwonej kartce / kontuzji bez zmiany', true], ['resPopup', 'Okno z wynikami kolejki po meczu', false]].map(([k, n, def]) => `<div class="row" style="margin-top:8px"><span class="sp">${n}</span><button class="btn sm ${(S.settings[k] != null ? S.settings[k] : def) ? 'pri' : ''}" data-act="settog" data-arg="${k}">${(S.settings[k] != null ? S.settings[k] : def) ? 'Tak' : 'Nie'}</button></div>`).join('')}</div>
    <div class="card"><h2>Szybkość meczu</h2><div class="seg">${[1, 2, 4, 8].map(s => `<button class="btn sm ${S.settings.speed === s ? 'on' : ''}" data-act="defspeed" data-arg="${s}">x${s}</button>`).join('')}</div></div>
    <div class="card"><h2>Kariery</h2><small class="mut">Ta kariera jest w slocie ${SLOT}. W menu głównym możesz wczytać inną karierę albo zacząć nową w wolnym slocie.</small><div class="btns"><button class="btn full" data-act="newgame">🏠 Menu główne (sloty karier)</button></div></div>`;
}
ACT.savegame = async () => { await saveNow(); toast('Zapisano grę.'); };
ACT.difflower = () => { const o = ['easy', 'normal', 'hard', 'expert'], i = o.indexOf(S.diff || 'normal'); if (i <= 0) return; const nx = o[i - 1]; if (!confirm(`Obniżyć poziom trudności na: ${DIFF[nx].n}? Tej zmiany nie można cofnąć.`)) return; S.diff = nx; saveSoon(); toast(`Poziom trudności: ${DIFF[nx].n}`, 'ok'); render(); };
ACT.setrenew = k => { S.settings.autoRenew = k; saveSoon(); render(); };
ACT.setpress = k => { S.settings.press = k; saveSoon(); render(); };
ACT.settog = k => { const def = { htAuto: true, autoPause: true, resPopup: false, autoSubs: true }[k]; S.settings[k] = !(S.settings[k] != null ? S.settings[k] : def); saveSoon(); render(); };
ACT.defspeed = s => { S.settings.speed = +s; saveSoon(); render(); };
ACT.newgame = async () => { if (confirm('Wrócić do menu głównego? Kariera jest zapisana.')) { await saveNow(); location.reload(); } };
ACT.export = () => {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `kariera_${S.season}_${userClub().short}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
CHG.import = (v, el) => {
  const f = el.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = async () => { try { const s = JSON.parse(r.result); if (s.v !== 3) throw 0; useSave(s); await saveNow(); toast('Wczytano zapis.'); render(); } catch (e) { toast('Nieprawidłowy plik zapisu.'); } };
  r.readAsText(f);
};

/* ---------- MECZ ---------- */
let M = null, MX = null, MT = null, MS = { speed: 2, paused: true, over: false };
const SPEED_MS = { 1: 600, 2: 280, 4: 120, 8: 40 };
const uside = () => MX.user === 'h' ? M.home : M.away;
let PRESS_DONE = -1, TALK = 'motivate';
ACT.prematch = () => {
  if (globalThis.MATCH_LIVE || STARTING) return;
  MX = userMatchToday(); if (!MX) return;
  if (PRESS_DONE !== S.day) { PRESS_DONE = S.day; const pc = pressConference(MX); if (pc) { PC = pc; return renderPress(); } }
  const mine = MX.user === 'h' ? MX.h : MX.a, opp = MX.user === 'h' ? MX.a : MX.h;
  if (!MX.nt && S.settings.autoRot !== false && PRE_ROT !== S.day) { PRE_ROT = S.day; const r = rotateTired(mine, 70); if (r.length) toast(`Asystent zrotował składem: ${r.length} ${r.length === 1 ? 'zmiana' : 'zmiany'}.`, 'ok'); }
  const msgs = fixLineup(mine, MX.nt ? null : emergencyFor(mine)); if (MX.nt) syncNT(mine);
  const sl = mine.lineup.map(pget), tired = sl.filter(p => p.fit < 65);
  const wxk = matchWeather(MX.h, curDay().date), wx = WX[wxk];
  modal(`<h2>Przed meczem</h2><small class="mut">${esc(MX.opts.label)}</small>
    <div class="row wxrow"><span style="font-size:24px">${wx[0]}</span><div class="sp"><b>Prognoza: ${wx[1]}</b><br><small class="mut">${wx[5]}</small></div></div>
    <div class="fixture"><div class="tm">${badge(MX.h, 'lg')}<span>${esc(MX.h.name)}</span></div><div class="vs">vs</div><div class="tm">${badge(MX.a, 'lg')}<span>${esc(MX.a.name)}</span></div></div>
    <div class="kv"><div><span>Formacja</span><b>${mine.formation}</b></div><div><span>Średnia XI</span><b>${lineupAvg(mine)}</b></div><div><span>Rywal (śr.)</span><b>${Math.round(avg(opp.players.map(p => p.ovr).sort((a, b) => b - a).slice(0, 11)))}</b></div><div><span>Rywal – forma</span><b>${opp.nation ? '–' : table(opp.lg).find(r => r.id === opp.id).form.slice(-5).map(f => f === 'W' ? 'Z' : f === 'D' ? 'R' : 'P').join('') || '–'}</b></div><div><span>Twój OVR trenera</span><b>${Math.round(S.mgr.ovr)}</b></div><div><span>Trener rywala</span><b>${Math.round(coachOvr(opp))}</b></div></div>
    ${MX.nt ? '' : (() => { const dn = derbyName(mine.id, opp.id), r = h2hRec(opp.id), n = r.w + r.d + r.l; return (dn ? `<div class="card hl" style="margin:8px 0"><b>🔥 ${esc(dn)}</b><br><small class="mut">Mecz z odwiecznym rywalem – wynik podwójnie wpłynie na kibiców, zarząd i morale. Stadion wypełni się po brzegi.</small></div>` : '') + (n ? `<small class="mut">Bilans Twoich meczów z tym rywalem: ${r.w} Z • ${r.d} R • ${r.l} P</small>` : ''); })()}
    ${MX.nt ? '' : `<p class="hint">🧑‍💼 ${esc(assistantTip(opp))}</p>`}
    <h3>Mentalność</h3><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn sm ${(mine.ment || 'bal') === k ? 'on' : ''}" data-act="prement" data-arg="${k}">${v}</button>`).join('')}</div>
    ${MX.nt ? '' : `<div class="btns"><button class="btn sm full" data-act="oppmodal">🔎 Rywal, styl gry i krycie (opcjonalnie)</button></div>`}
    <h3>Odprawa przedmeczowa</h3><div class="seg talk">${Object.entries(TALKS).map(([k, v]) => `<button class="btn sm ${TALK === k ? 'on' : ''}" data-act="settalk" data-arg="${k}">${v}</button>`).join('')}</div>
    ${msgs.length ? `<p class="warn">${msgs.map(esc).join('<br>')}</p>` : ''}
    ${tired.length ? `<p class="warn">😮‍💨 Zmęczeni: ${tired.map(p => esc(lastName(p)) + ' ' + Math.round(p.fit) + '%').join(', ')}</p>${MX.nt ? '' : '<div class="btns"><button class="btn sm full" data-act="rotate">🔄 Rotuj zmęczonych (wstaw wypoczętych zmienników)</button></div>'}` : ''}
    <div class="btns stick"><button class="btn pri sp" data-act="startmatch">▶ Rozpocznij</button><button class="btn" data-act="quicksim">⏩ Symuluj</button></div>
    <div class="btns"><button class="btn full" data-act="goteam">Zmień skład</button></div>`);
};
let PC = null, PRE_ROT = -1, LIVEX = [];
/* analiza rywala + instrukcje na rywala (krycie, ostry odbiór) – ważne jeden mecz */
function oppHtml(mine, opp) {
  const d = (MX.h.rep || 50) - (MX.a.rep || 50), st = opp.nation ? null : aiStyle(opp, MX.user === 'h' ? -d : d), oi = mine.oi || { mark: [] };
  const thr = opp.players.filter(p => isAvail(p) && p.pos !== 'GK').sort((a, b) => (b.ovr + (LINE[b.pos] === 'ATT' ? 4 : b.pos === 'CAM' ? 2 : 0) + (b.st ? b.st.g : 0) * 0.5) - (a.ovr + (LINE[a.pos] === 'ATT' ? 4 : a.pos === 'CAM' ? 2 : 0) + (a.st ? a.st.g : 0) * 0.5)).slice(0, 4);
  return `<h3>🔎 Analiza rywala</h3>${st ? `<small class="mut">Spodziewany styl: <b>${TAC_PRE[st][0]}</b> – ${TAC_PRE[st][3]}${st === 'counter' || st === 'gegen' ? ' Uwaga na wysoką linię obrony.' : st === 'bus' ? ' Cierpliwość i szerokość pomogą rozmontować blok.' : ''}</small>` : ''}
    <small class="mut">Najgroźniejsi – kryj ściśle (maks. 2, więcej fauli):</small>
    ${thr.map(p => `<div class="row">${posTag(p.pos)}<span class="sp">${esc(shortName(p))} <small class="mut">${p.ovr}${p.st && p.st.g ? ` • ${plural(p.st.g, 'gol', 'gole', 'goli')}` : ''}</small></span><button class="btn sm ${(oi.mark || []).includes(p.id) ? 'pri' : ''}" data-act="oimark" data-arg="${p.id}">🔒 Kryj</button></div>`).join('')}
    <div class="row"><span class="sp">🦵 Ostry odbiór <small class="mut">– rywal gorzej buduje grę, ale więcej kartek</small></span><button class="btn sm ${oi.hard ? 'pri' : ''}" data-act="oihard">${oi.hard ? 'Tak' : 'Nie'}</button></div>`;
}
ACT.oppmodal = () => { const mine = MX.user === 'h' ? MX.h : MX.a, opp = MX.user === 'h' ? MX.a : MX.h; modal(`<h2>🔎 Przed meczem – opcjonalnie</h2><h3>Styl gry</h3>${presetHtml(mine, 'prepreset')}${oppHtml(mine, opp)}<div class="btns"><button class="btn pri full" data-act="prematch">Wróć</button></div>`); };
ACT.oimark = id => { const mine = MX.user === 'h' ? MX.h : MX.a; mine.oi = mine.oi || { mark: [], hard: false }; const m = mine.oi.mark, i = m.indexOf(+id); if (i >= 0) m.splice(i, 1); else { if (m.length >= 2) return toast('Możesz kryć ściśle maks. 2 zawodników.', 'bad'); m.push(+id); } if (MX.nt) syncNT(mine); ACT.oppmodal(); };
ACT.oihard = () => { const mine = MX.user === 'h' ? MX.h : MX.a; mine.oi = mine.oi || { mark: [], hard: false }; mine.oi.hard = !mine.oi.hard; if (MX.nt) syncNT(mine); ACT.oppmodal(); };
ACT.prepreset = k => { const mine = MX.user === 'h' ? MX.h : MX.a, p = TAC_PRE[k]; mine.ment = p[1]; mine.tac = Object.assign({}, p[2]); if (MX.nt) syncNT(mine); saveSoon(); ACT.oppmodal(); };
ACT.rotate = () => { const mine = MX.user === 'h' ? MX.h : MX.a, r = rotateTired(mine, 72); saveSoon(); toast(r.length ? `Zmiany: ${r.join(', ')}` : 'Brak wypoczętych zmienników na tych pozycjach.', r.length ? 'ok' : 'bad'); ACT.prematch(); };
function renderPress() {
  modal(`<div class="evcat">Konferencja prasowa</div><h2>🎤 ${esc(PC.q)}</h2><div class="choices">${PC.a.map((x, i) => `<button class="btn full" data-act="pressans" data-arg="${i}">${esc(x[0])}</button>`).join('')}</div>`, true);
}
ACT.pressans = i => { const out = answerPress(PC, +i); toast(out.join(' • ') || 'Dziennikarze zanotowali odpowiedź.'); closeModal(); ACT.prematch(); };
ACT.settalk = k => { TALK = k; document.querySelectorAll('#modal .talk button').forEach(b => b.classList.toggle('on', b.dataset.arg === k)); };
ACT.goteam = () => { closeModal(); UI.tab = 'squad'; UI.sqTab = 'pitch'; UI.nt = !!(MX && MX.nt); render(); };
CHG.setsp = (v, el) => { const t = userClub(); t.sp = t.sp || {}; t.sp[el.dataset.k] = v === '' ? null : +v; saveSoon(); toast('Zapisano wykonawcę stałych fragmentów.', 'ok'); };
ACT.autorot = () => { S.settings.autoRot = S.settings.autoRot === false; saveSoon(); render(); };
ACT.prement = k => { const mine = MX.user === 'h' ? MX.h : MX.a; mine.ment = k; if (MX.nt) syncNT(mine); saveSoon(); document.querySelectorAll('#modal .seg button').forEach(b => b.classList.toggle('on', b.dataset.arg === k)); };
ACT.quicksim = () => {
  closeModal(); MX = userMatchToday(); if (!MX) return;
  if (!MX.nt && S.settings.autoRot !== false && PRE_ROT !== S.day) { PRE_ROT = S.day; rotateTired(MX.user === 'h' ? MX.h : MX.a, 70); }
  M = createMatch(MX.h, MX.a, { ...MX.opts, user: MX.user, quick: true }); doTalk(); while (!M.over) step(M);
  showResult();
};
let STARTING = false;
ACT.startmatch = async () => {
  if (globalThis.MATCH_LIVE || STARTING) return;
  closeModal(); if (typeof toastClear === 'function') toastClear(); MX = userMatchToday(); if (!MX) return;
  STARTING = true; busy(true, 'Zapisywanie…'); clearTimeout(saveT); try { await saveNow(); } finally { STARTING = false; busy(false); }   // zapis przed meczem – po ewentualnym zamknięciu aplikacji gra wraca do tego miejsca
  globalThis.MATCH_LIVE = true; LIVEX = MX.nt ? [] : preSimOthers(MX);
  M = createMatch(MX.h, MX.a, { ...MX.opts, user: MX.user }); doTalk();
  MS = { speed: S.settings.speed || 2, paused: false, over: false };
  const el = $('#match'); el.classList.remove('hidden');
  el.innerHTML = `<div class="sb"><small class="lbl">${esc(MX.opts.label)} • ${WX[M.wx || 'sun'][0]} ${WX[M.wx || 'sun'][1]}</small><div class="teams"><div class="tm">${badge(M.home.t, 'lg')}<span>${esc(M.home.t.name)}</span></div><div><div class="score" id="msc">0 : 0</div><div class="min" id="mmin">0'</div></div><div class="tm">${badge(M.away.t, 'lg')}<span>${esc(M.away.t.name)}</span></div></div><div class="scr" id="mscr"></div><div class="tick" id="mtick"></div></div>
    <div id="mpitch" class="wx-${M.wx || 'sun'}"></div><div class="mleg" id="mleg"></div><div id="mmom" style="margin:6px 0"></div>
    <div class="mstats" id="mst"></div><div class="feed" id="mfeed"></div><div class="ctl" id="mctl"></div>`;
  ev(M, 'info', null, '📣 Sędzia gwiżdże – zaczynamy!');
  upd(); mctl(); MT = setTimeout(tick, SPEED_MS[MS.speed]);
};
const talkMsg = (r, ht) => r.avg > 2 ? (ht ? 'świetna reakcja zespołu!' : 'zawodnicy są nakręceni!') : r.avg < 0 ? (ht ? 'część zawodników przyjęła to źle.' : 'w szatni widać nerwowość.') : 'spokojna reakcja.';
const talkDetail = r => `${r.good ? ` (${plural(r.good, 'zmotywowany', 'zmotywowanych', 'zmotywowanych')}` : ' ('}${r.bad ? `${r.good ? ', ' : ''}${plural(r.bad, 'poirytowany', 'poirytowanych', 'poirytowanych')})` : r.good ? ')' : 'bez wyraźnej reakcji)'}`;
function doTalk() { const s = uside(), o = s === M.home ? M.away : M.home; const r = teamTalk(s, TALK, o.t.rep || 50, false, 0); ev(M, 'info', s, `🗣️ Odprawa: ${TALKS[TALK]} – ${talkMsg(r)}${talkDetail(r)}`); M.dirty = true; }
ACT.httalk = k => { const s = uside(), o = s === M.home ? M.away : M.home; const r = teamTalk(s, k, o.t.rep || 50, true, s.goals - o.goals); M.htTalk = true; ev(M, 'info', s, `🗣️ Przerwa: ${TALKS[k]} – ${talkMsg(r, true)}${talkDetail(r)}`); M.dirty = true; upd(); mctl(); };
function tick() {
  if (MS.paused || MS.over) return;
  const r = step(M);
  if (S.settings.autoSubs !== false && [62, 72, 82].includes(M.minute) && uside().subs < 4) { const n0 = uside().subs; aiSubs(M, uside()); if (uside().subs > n0) M.ev[M.ev.length - 1].text += ' (asystent)'; }
  upd();
  if (r === 'ft') { MS.over = true; mctl(); return; }
  if (r === 'ht' && S.settings.htAuto !== false) { const s = uside(), o = s === M.home ? M.away : M.home, d = s.goals - o.goals, k = d < 0 ? 'motivate' : d > 0 ? 'calm' : 'motivate'; const tr = teamTalk(s, k, o.t.rep || 50, true, d); M.htTalk = true; ev(M, 'info', s, `🗣️ Przerwa (asystent): ${TALKS[k]} – ${talkMsg(tr, true)}`); upd(); }
  else if (r === 'ht' || r === 'et') { MS.paused = true; mctl(); if (r === 'et') toast('Dogrywka!'); document.querySelectorAll('.uk-goal').forEach(e => e.remove()); return; }
  { const le = M.ev[M.ev.length - 1]; if (S.settings.autoPause !== false && (M.alert === 'red' || (M.alert === 'injury' && le.type === 'injury')) && le.side === MX.user) { MS.paused = true; mctl(); toast(M.alert === 'red' ? 'Czerwona kartka!' : 'Kontuzja – brak automatycznej zmiany!'); return; } }
  MT = setTimeout(tick, SPEED_MS[MS.speed] * (M.alert === 'goal' ? 2.5 : 1));
}
function upd() {
  $('#msc').textContent = `${M.home.goals} : ${M.away.goals}`;
  if (LIVEX && LIVEX.length && $('#mtick')) { const mn = M.minute, cnt = a => a.filter(x => x <= mn).length, hot = a => a.some(x => x <= mn && x > mn - 4);
    $('#mtick').innerHTML = '<small class="mut">Inne mecze:</small> ' + LIVEX.map(g => `<span class="${hot(g.hs) || hot(g.as) ? 'hot' : ''}">${esc(g.h.short)} ${M.over ? g.fin : cnt(g.hs) + ':' + cnt(g.as)} ${esc(g.a.short)}</span>`).join(''); }
  $('#mmin').textContent = M.over ? (M.pens ? `k. ${M.pens.h}:${M.pens.a}` : 'Koniec') : MS.paused && M.minute === 45 ? 'Przerwa' : `${M.minute}'`;
  $('#mscr').innerHTML = `<span>${M.home.scorers.map(s => `${esc(s.name)} ${s.min}'`).join(', ')}</span><span>${M.away.scorers.map(s => `${esc(s.name)} ${s.min}'`).join(', ')}</span>`;
  const H = M.home, A = M.away, tp = H.poss + A.poss || 1, hp = Math.round(H.poss / tp * 100);
  const st = (l, a, b) => { const t = (a + b) || 1; return `<div class="st"><b>${a}</b><div><small>${l}</small><div class="l"><i style="width:${a / t * 100}%;background:${H.t.col[0]}"></i><i style="width:${b / t * 100}%;background:${A.t.col[0]};opacity:.75"></i></div></div><b>${b}</b></div>`; };
  $('#mst').innerHTML = st('Posiadanie %', hp, 100 - hp) + st('Strzały', H.shots, A.shots) + st('Celne', H.sot, A.sot) + st('xG', +(H.xg || 0).toFixed(2), +(A.xg || 0).toFixed(2)) + st('Rożne', H.corners, A.corners);
  if (typeof matchPitchSVG === 'function') {
    $('#mpitch').innerHTML = matchPitchSVG(M, MX.user);
    const us = MX.user === 'h' ? H : A; $('#mleg').innerHTML = us.pitch.slice().sort((a, b) => a.slot - b.slot).map(x => `<span><b>${x.slot + 1}</b> ${esc(lastName(x.p))}</span>`).join('');
    const goals = [...H.scorers.map(g => ({ min: g.min, side: 'h' })), ...A.scorers.map(g => ({ min: g.min, side: 'a' }))];
    $('#mmom').innerHTML = momentumSVG(M.mom || [], { w: ($('#mmom').clientWidth || window.innerWidth - 32), h: 46, colH: H.t.col[0], colA: A.t.col[0], goals });
  }
  if (M.alert === 'goal' && M._gfx !== M.ev.length && !MS.over && !MS.skipping && typeof uk_goalOverlay === 'function') { M._gfx = M.ev.length; const g = M.ev[M.ev.length - 1]; uk_goalOverlay('GOL!', g ? g.text.replace(/^⚽\s*/, '') : ''); }
  $('#mfeed').innerHTML = M.ev.slice().reverse().map(e => `<div class="fe ${e.type}"><span class="mn">${e.min}'</span><span>${esc(e.text)}</span></div>`).join('');
}
function mctl() {
  const c = $('#mctl'); if (!c) return;
  if (MS.over) { c.innerHTML = `<button class="btn pri full" data-act="matchdone">Podsumowanie meczu</button>`; return; }
  const htT = MS.paused && M.minute === 45 && !M.htTalk ? `<div class="httalk"><small>Odprawa w przerwie:</small>${Object.entries(TALKS).map(([k, v]) => `<button class="btn sm" data-act="httalk" data-arg="${k}">${v}</button>`).join('')}</div>` : '';
  const nx = { 1: 2, 2: 4, 4: 8, 8: 1 }[MS.speed] || 2;
  c.innerHTML = htT + `<button class="btn ${MS.paused ? 'pri' : ''}" data-act="mpause">${MS.paused ? '▶' : '⏸'}</button><button class="btn on" data-act="mspeed" data-arg="${nx}">⏩ x${MS.speed}</button><button class="btn" data-act="mtactic">🎯</button><button class="btn" data-act="msubs">🔁 ${uside().subs}/${MAX_SUBS}</button><button class="btn" data-act="mskip">⏭</button>`;
}
ACT.mpause = () => { MS.paused = !MS.paused; mctl(); upd(); if (!MS.paused) { clearTimeout(MT); MT = setTimeout(tick, 50); } };
ACT.mspeed = a => { MS.speed = +a; S.settings.speed = +a; mctl(); };
ACT.mskip = () => { clearTimeout(MT); MS.paused = true; while (!M.over) step(M); MS.over = true; MS.skipping = true; upd(); mctl(); };
ACT.mpreset = k => { const s = uside(), p = TAC_PRE[k]; s.ment = p[1]; s.tac = Object.assign({}, p[2]); s.t.ment = p[1]; s.t.tac = Object.assign({}, p[2]); M.dirty = true; ev(M, 'info', s, `📋 ${s.t.name}: zmiana stylu gry – ${p[0]}.`); upd(); ACT.mtactic(); };
/* zmiana formacji w trakcie meczu: zawodnicy na boisku dopasowani do nowych pozycji */
CHG.mformsel = v => setTimeout(() => ACT.mform(v));
ACT.mform = f => { const s = uside(), sl = slotsOf(f), free = sl.map((x, i) => i), left = s.pitch.slice();
  const gk = left.find(x => x.pos === 'GK'); if (gk) { const gi = sl.findIndex(x => x.pos === 'GK'); gk.slot = gi; free.splice(free.indexOf(gi), 1); left.splice(left.indexOf(gk), 1); }
  while (left.length && free.length) { let b = null; for (const x of left) for (const i of free) { const v = ovrAt(x.p, sl[i].pos) - i * 0.01; if (!b || v > b.v) b = { x, i, v }; } b.x.slot = b.i; b.x.pos = sl[b.i].pos; b.x.ov = ovrAt(b.x.p, b.x.pos); s.rec[b.x.p.id].pos = b.x.pos; free.splice(free.indexOf(b.i), 1); left.splice(left.indexOf(b.x), 1); }
  s.form = f; s.duty = null; s.pm = null; M.dirty = true; ev(M, 'info', s, `📋 ${s.t.name}: zmiana ustawienia na ${f}.`); upd(); ACT.mtactic(); };
ACT.mtactic = () => { document.querySelectorAll('.uk-goal').forEach(e => e.remove()); MS.paused = true; mctl(); const s = uside(); modal(`<h2>Taktyka</h2><h3>Formacja</h3><select data-change="mformsel" style="width:100%">${Object.keys(FORMATIONS).map(f => `<option ${(s.form || s.t.formation) === f ? "selected" : ""}>${f}</option>`).join('')}</select><h3>Styl gry</h3>${presetHtml({ ment: s.ment, tac: s.tac }, 'mpreset')}<h3>Mentalność</h3><div class="seg">${Object.entries(MENT).map(([k, v]) => `<button class="btn ${s.ment === k ? 'on' : ''}" data-act="mment" data-arg="${k}">${v}</button>`).join('')}</div>${tacHtml(s.tac, 'mtac')}<div class="btns"><button class="btn full" data-act="close">Wróć do meczu</button></div>`); };
ACT.mment = k => { uside().ment = k; M.dirty = true; ev(M, 'info', uside(), `📋 ${uside().t.name}: mentalność ${MENT[k].toLowerCase()}.`); upd(); closeModal(); };
let subOut = null;
ACT.msubs = () => { document.querySelectorAll('.uk-goal').forEach(e => e.remove()); MS.paused = true; mctl(); subOut = null; renderSubs(); };
function renderSubs() {
  const s = uside();
  modal(`<h2>Zmiany (${s.subs}/${MAX_SUBS})</h2><small class="mut">${subOut ? 'Wybierz zawodnika z ławki.' : 'Wybierz zawodnika, który zejdzie.'}</small>
    <h3>Na boisku</h3>${s.pitch.map(x => `<div class="prow ${subOut === x.p ? 'sel' : ''}" data-act="subout" data-arg="${x.p.id}"><span class="pos ${LINE[x.pos]}">${POS_PL[x.pos]}</span><div class="pn">${esc(x.p.n)}${s.rec[x.p.id] && s.rec[x.p.id].y ? ' 🟨' : ''}${s.rec[x.p.id] && s.rec[x.p.id].g ? ' ⚽'.repeat(s.rec[x.p.id].g) : ''}</div><div class="fitb">${bar(Math.round(fitNow(s, x, M.minute)))}</div>${ovrTag(x.ov)}</div>`).join('')}
    <h3>Ławka${subOut ? ` <small class="mut">(OVR na pozycji: ${POS_PL[outPos()]})</small>` : ''}</h3>${(subOut ? s.bench.slice().sort((a, b) => ovrAt(b, outPos()) - ovrAt(a, outPos())) : s.bench).map(p => `<div class="prow" data-act="subin" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}</div><div class="fitb">${bar(p.fit)}</div>${ovrTag(subOut ? ovrAt(p, outPos()) : p.ovr)}</div>`).join('') || '<small>Pusta</small>'}
    <div class="btns"><button class="btn full" data-act="close">Wróć do meczu</button></div>`);
}
const outPos = () => { const x = uside().pitch.find(y => y.p === subOut); return x ? x.pos : 'CM'; };
ACT.subout = id => { subOut = uside().pitch.find(x => x.p.id === +id).p; renderSubs(); };
ACT.subin = id => { const s = uside(); if (!subOut) return toast('Najpierw wybierz zawodnika schodzącego.'); if (s.subs >= MAX_SUBS) return toast('Wykorzystano wszystkie zmiany.'); const ip = pget(+id), op = outPos(); if ((ip.pos === 'GK') !== (op === 'GK') && !confirm(`${ip.pos === 'GK' ? 'Bramkarz w polu' : 'Zawodnik z pola na bramce'} – OVR na tej pozycji: ${ovrAt(ip, op)}. Na pewno?`)) return; substitute(M, s, subOut, ip); subOut = null; upd(); mctl(); renderSubs(); };
ACT.matchdone = () => showResult();
const rateCol = r => r >= 8 ? '#1db36b' : r >= 7 ? '#5cc46b' : r >= 6.3 ? '#b6b33a' : r >= 5.5 ? '#d98a2b' : '#d9473b';
let LASTM = null;
function showResult() {
  document.querySelectorAll(".uk-goal").forEach(e => e.remove());
  if (typeof toastClear === 'function') toastClear();
  const H = M.home, A = M.away, mine = uside();
  const opp = mine === H ? A : H;
  const sc = side => side.scorers.map(g => `${g.name} ${g.min}'${g.pen ? ' (k)' : ''}`).join(', ') || '—';
  const recs = Object.values(mine.rec).sort((a, b) => b.rating - a.rating);
  const won = M.winner ? M.winner === MX.user : mine.goals > opp.goals, draw = !M.winner && mine.goals === opp.goals;
  $('#match').classList.add('hidden');
  modal(`<h2>${won ? '🎉 Zwycięstwo!' : draw ? '🤝 Remis' : '😞 Porażka'}</h2><small class="mut">${esc(MX.opts.label)}</small>
    <div class="fixture"><div class="tm">${badge(H.t, 'lg')}<span>${esc(H.t.name)}</span></div><div class="vs" style="color:var(--txt)">${H.goals} : ${A.goals}${M.pens ? `<small style="display:block;font-size:13px">k. ${M.pens.h}:${M.pens.a}</small>` : M.et ? '<small style="display:block;font-size:13px">po dogrywce</small>' : ''}</div><div class="tm">${badge(A.t, 'lg')}<span>${esc(A.t.name)}</span></div></div>
    <small>⚽ ${esc(H.t.short)}: ${esc(sc(H))}<br>⚽ ${esc(A.t.short)}: ${esc(sc(A))}</small>
    ${typeof momentumSVG === 'function' ? `<div style="margin:8px 0">${momentumSVG(M.mom || [], { w: Math.min(520, window.innerWidth - 48), h: 50, colH: H.t.col[0], colA: A.t.col[0], goals: [...H.scorers.map(g => ({ min: g.min, side: 'h' })), ...A.scorers.map(g => ({ min: g.min, side: 'a' }))] })}</div>` : ''}
    <div class="kv"><div><span>Posiadanie</span><b>${Math.round(H.poss / ((H.poss + A.poss) || 1) * 100)}–${100 - Math.round(H.poss / ((H.poss + A.poss) || 1) * 100)}%</b></div><div><span>Strzały</span><b>${H.shots}–${A.shots}</b></div><div><span>Celne</span><b>${H.sot}–${A.sot}</b></div><div><span>xG (gole oczekiwane)</span><b>${(H.xg || 0).toFixed(2)}–${(A.xg || 0).toFixed(2)}</b></div><div><span>Rożne</span><b>${H.corners}–${A.corners}</b></div></div>
    ${xgNote(H, A)}
    ${(() => { PPC = MX.nt ? null : postMatchPress(M, MX.user); return PPC ? `<div class="card" id="ppc" style="margin:8px 0"><div class="evcat">🎤 Konferencja po meczu</div><b>${esc(PPC.q)}</b><div class="choices">${PPC.a.map((x, i) => `<button class="btn full sm" data-act="ppans" data-arg="${i}">${esc(x[0])}</button>`).join('')}</div></div>` : ''; })()}
    <div class="row"><span>⭐ Zawodnik meczu:</span><b class="sp">${esc(M.motm.p.n)} <small class="mut">(${esc((M.motm.p.tid === H.t.id || H.rec[M.motm.p.id] ? H : A).t.short)})</small></b><span class="ovr o1">${M.motm.rating.toFixed(1)}</span></div>
    <h3>Oceny</h3>${recs.map(r => `<div class="rt"><span>${posTag(r.pos)} ${esc(shortName(r.p))} ${r.g ? '⚽'.repeat(r.g) : ''}${r.a ? '🅰️'.repeat(r.a) : ''}${r.y && !r.r ? '🟨' : ''}${r.r ? '🟥' : ''}</span><span class="rchip" style="background:${rateCol(r.rating)}">${r.rating.toFixed(1)}</span></div>`).join('')}
    <div class="btns"><button class="btn sm full" data-act="mstats">📊 Statystyki zawodników i heatmapy</button></div>
    <div class="btns"><button class="btn pri full" data-act="finishday">Dalej</button></div>`, true); LASTM = { m: M, user: MX.user };
}
function xgNote(H, A) {
  const me = MX.user === 'h' ? H : A, op = me === H ? A : H, d = me.goals - (me.xg || 0), o = op.goals - (op.xg || 0);
  const t = me.xg > op.xg + 0.6 && me.goals <= op.goals ? '📊 Stworzyliście dużo lepsze sytuacje – wynik nie oddaje przebiegu gry.' : op.xg > me.xg + 0.6 && me.goals >= op.goals ? '📊 Rywal miał lepsze okazje – tym razem dopisało Wam szczęście.' : d >= 1.5 ? '📊 Świetna skuteczność – więcej goli niż wskazywały sytuacje.' : d <= -1.5 ? '📊 Fatalna skuteczność pod bramką rywala.' : o <= -1.5 ? '📊 Bramkarz i obrona zatrzymali groźne strzały rywala.' : '';
  return t ? `<small class="mut">${t}</small>` : '';
}
let PPC = null;
ACT.ppans = i => { if (!PPC) return; const out = answerPress(PPC, +i), el = $('#ppc'); if (el) el.innerHTML = `<div class="evcat">🎤 Konferencja po meczu</div><small class="mut">${esc(PPC.a[+i][0])}</small><br><small>${esc(out.join(' • ') || 'Dziennikarze zanotowali odpowiedź.')}</small>`; PPC = null; };
ACT.finishday = () => {
  globalThis.MATCH_LIVE = false;
  const m = M, x = MX; M = null; closeModal();
  const day = curDay(), ut0 = userClub(), pos0 = day.t === 'L' ? leaguePos(ut0) : null;
  const r = processDay(m);
  const pos1 = pos0 != null && !r.summary && userClub() === ut0 && table(ut0.lg).find(x => x.id === ut0.id).P > 1 ? leaguePos(ut0) : null;
  const tchg = pos1 != null ? `<div class="card"><div class="row"><b class="sp">Tabela: ${pos0}. → ${pos1}. miejsce</b><span class="${pos1 < pos0 ? 'good' : pos1 > pos0 ? 'bad' : 'mut'}">${pos1 < pos0 ? '▲' + (pos0 - pos1) : pos1 > pos0 ? '▼' + (pos1 - pos0) : '='}</span></div></div>` : '';
  const label = x.opts.label.split(' • ')[0];
  let res = '';
  if (day.t === 'L') { const lg = S.leagues[x.h.lg || userClub().lg]; const rd = (lg.fix[lg.lsMap[day.ls]] || []).slice().sort((a, b) => (b.h === S.user || b.a === S.user) - (a.h === S.user || a.a === S.user)); res = rd.map(f => fxRow(club(f.h), club(f.a), `${f.hg} : ${f.ag}`, f.h === S.user || f.a === S.user)).join(''); }
  else if (day.t === 'E') { const c = Object.values(S.euro).find(c => c.name === label || label.includes(c.name)); if (c && day.st === 'Q') res = (c.q.rounds[day.r] || []).map(t => koRow(t, false)).join('');
    else if (c) res = day.st === 'LP' ? (c.lp ? c.lp[day.md] : []).map(f => fxRow(club(f.h), club(f.a), `${f.hg} : ${f.ag}`, f.h === S.user || f.a === S.user)).join('') : (c.ko[day.st] || []).map(t => koRow(t, day.st === 'F')).join(''); }
  else if (day.t === 'C') { const cup = S.cups[userClub().cc] || Object.values(S.cups).find(c => label.includes(c.name)); const r = day.slot - cup.slot0; if (cup.rounds[r]) res = cup.rounds[r].map(t => fxRow(club(t.h), club(t.a), `${t.m.hg} : ${t.m.ag}`, t.h === S.user || t.a === S.user, t.m.pens ? `karne ${t.m.pens.h}:${t.m.pens.a}` : t.m.et ? 'po dogrywce' : '')).join(''); }
  else if (day.t === 'P' && S.pre && S.pre.chosen) { const T = S.pre.chosen, row = t => fxRow(club(t.h), club(t.a), `${t.hg} : ${t.ag}`, t.h === S.user || t.a === S.user, t.pens ? `karne ${t.pens.h}:${t.pens.a}` : ''); res = (day.md === 0 ? T.sf : [T.fin, T.third]).filter(t => t && t.w != null).map(row).join(''); }
  else if (day.t === 'N' || day.t === 'T') { res = ''; }
  saveSoon(); render();
  if (r.summary) return showSummary(r.summary);
  if (S.sacked) return showSacked();
  if (S.pending.length && !res) return ACT.event(S.pending[0].uid);
  if (res && S.settings.resPopup) modal(`<h2>Wyniki: ${esc(label)}</h2>${tchg}<div class="card list">${res}</div><div class="btns"><button class="btn pri full" data-act="close">OK</button></div>`);
  else if (res && pos1 != null && pos1 !== pos0) { toast(`Tabela: ${pos0}. → ${pos1}. miejsce`, pos1 < pos0 ? 'ok' : 'bad'); winPopups(); }
  else if (S.pending.length) ACT.event(S.pending[0].uid);
  else winPopups();
};
function showSummary(s) {
  const M = s.meta, G = { res: [], you: [], squad: [], fin: [], world: [] };
  for (const l of s.lines) {
    if (/^💰/.test(l)) G.fin.push(l);
    else if (/^(🏆|🏅|👟|⬆️|⬇️|Twoja pozycja|⭐ Prestiż|🇪🇺)/.test(l)) G.res.push(l);
    else if (/^(✅|❌|🧑‍💼|🤝|🏛|Nowy sezon|📨|💳|🏟️|⚠️)/.test(l)) G.you.push(l);
    else if (/^(Powroty|Zakończyli|Wygasły|🔮|🎓|👥|Z rezerw|📊|📝)/.test(l)) G.squad.push(l);
    else G.world.push(l);
  }
  const sec = (t, L) => L.length ? `<div class="card"><h3 style="margin-top:0">${t}</h3>${L.map(l => `<p style="margin:6px 0">${esc(l)}</p>`).join('')}</div>` : '';
  const hero = M ? `<div class="card hl" style="text-align:center"><div style="font-size:44px;font-weight:900">${M.pos}.</div><b>${esc(M.lg)}</b><br><small class="mut">${M.pts} pkt • ${M.w}-${M.d}-${M.l} • bramki ${M.gf}:${M.ga}</small>
    <div class="grid3" style="margin-top:10px"><div class="card stat"><small>Cel ligowy</small><b class="${M.achieved ? 'good' : 'bad'}">${M.achieved ? '✅' : '❌'}</b></div><div class="card stat"><small>OVR trenera</small><b>${M.ovr0}→${M.ovr1}</b></div><div class="card stat"><small>Prestiż</small><b>${M.pres.toFixed(1)}</b></div></div></div>` : '';
  modal(`<h2>🏁 ${esc(s.title)}</h2>${hero}${sec('🏆 Wyniki i trofea', G.res)}${sec('🧑‍💼 Ty i zarząd', G.you)}${sec('👥 Kadra', G.squad)}${sec('💰 Finanse', G.fin)}${sec('🌍 Świat futbolu', G.world)}<div class="btns"><button class="btn pri full" data-act="aftersum">▶ Rozpocznij nowy sezon</button></div>`, true);
}
ACT.aftersum = () => { closeModal(); if (S.sacked) return showSacked(); render(); };
function showSacked() {
  const offers = jobOffers();
  modal(`<h2>📄 Zostałeś zwolniony</h2><p>Zarząd stracił cierpliwość. Oferty pracy:</p>
    ${offers.map(c => `<button class="club" data-act="takeover" data-arg="${c.id}">${badge(c)}<div class="sp"><b>${esc(c.name)}</b><br><small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • <span class="stars">${stars(c)}</span></small></div></button>`).join('')}`, true);
}
ACT.takeover = id => { closeModal(); takeOver(+id); UI.tab = 'home'; UI.lg = null; render(); };

/* ---------- EKRAN STARTOWY ---------- */
const ST = { cc: 'POL', lg: 'POL2', club: null, nt: '', prof: 45, slot: null };
const stOvr = () => 45;
const stAllowed = c => c.rep <= maxRepFor(45);
let SLOTS_META = {};
function showMenu() {
  $('#app').classList.add('hidden'); $('#start').classList.remove('hidden'); ST.slot = null;
  const card = n => { const m = SLOTS_META[n];
    return m ? `<div class="card slot"><div class="row">${badge({ short: m.short || '?', col: m.col, name: m.club })}<div class="sp"><b>${esc(m.club)}</b><br><small class="mut">${esc(m.name || 'Menedżer')} • ${esc(m.lg || '')} • sezon ${SEASON_LABEL(m.season)}${m.date ? ' • ' + fmtDate(m.date) : ''}${m.ovr ? ' • OVR ' + m.ovr : ''}${m.diff && DIFF[m.diff] ? ' • ' + DIFF[m.diff].n : ''}</small></div></div>
      <div class="btns"><button class="btn pri sp" data-act="slotload" data-arg="${n}">▶ Kontynuuj</button><button class="btn" data-act="slotnew" data-arg="${n}">Nowa</button><button class="btn red" data-act="slotdel" data-arg="${n}">🗑</button></div></div>`
      : `<button class="card slot empty" data-act="slotnew" data-arg="${n}"><b>Slot ${n} – pusty</b><br><small class="mut">＋ Rozpocznij nową karierę</small></button>`; };
  const nClubs = S.clubs.length, nLg = Object.keys(S.leagues).length, nReal = sum(S.clubs.map(c => c.realCount || 0));
  $('#start').innerHTML = `<div class="in"><div class="logo">⚽</div><h1>Kariera Menedżera</h1><p class="mut">${nLg} lig • ${nClubs} klubów • ${nReal} prawdziwych zawodników • Liga Mistrzów, Liga Europy, Liga Konferencji • reprezentacje • akademia</p>
    <h3>Twoje kariery</h3>${[1, 2, 3, 4].map(card).join('')}
    <small class="mut">Każdy slot to osobna kariera z własnym światem. Gra zapisuje się automatycznie.</small></div>`;
}
ACT.slotload = async n => { busy(true, 'Wczytywanie kariery…'); const s = await loadSlot(+n); busy(false); if (!s || s.v !== 3) return toast('Nie udało się wczytać zapisu.', 'bad'); SLOT = +n; useSave(s); enterApp(); if (S.sacked) showSacked(); };
ACT.slotnew = n => { if (SLOTS_META[n] && !confirm(`Slot ${n} zawiera karierę (${SLOTS_META[n].club}). Nowa kariera ją zastąpi. Kontynuować?`)) return; ST.slot = +n; ST.club = null; showStart(); window.scrollTo(0, 0); };
ACT.slotdel = async n => { if (!confirm(`Usunąć karierę ze slotu ${n}? Tego nie da się cofnąć.`)) return; await deleteSlot(+n); delete SLOTS_META[n]; showMenu(); };
ACT.tomenu = () => showMenu();
function showStart() {
  $('#app').classList.add('hidden'); $('#start').classList.remove('hidden');
  if (!S.leagues[ST.lg]) ST.lg = S.countries[ST.cc].leagues[0];
  const lg = S.leagues[ST.lg];
  const clubs = lg.clubs.map(club).sort((a, b) => b.rep - a.rep);
  const nClubs = S.clubs.length, nLg = Object.keys(S.leagues).length, nReal = sum(S.clubs.map(c => c.realCount || 0));
  $('#start').innerHTML = `<div class="in"><button class="btn sm" data-act="tomenu">‹ Menu</button><h1>Nowa kariera <small class="mut" style="font-size:16px">slot ${ST.slot}</small></h1>
    <p class="mut">Zaczynasz jako debiutant (OVR trenera 45) – na start dostępne są kluby niższych lig. Dobre wyniki podnoszą OVR i przynoszą oferty większych klubów.</p>
    <input id="mname" placeholder="Imię i nazwisko menedżera" maxlength="28" style="width:100%;margin-bottom:10px" value="${esc(S.manager || '')}">
    <h3>Poziom trudności</h3><div class="seg wrap">${Object.entries(DIFF).map(([k, v]) => `<button class="btn sm ${(ST.diff || 'normal') === k ? 'on' : ''}" data-act="stdiff" data-arg="${k}">${v.n}</button>`).join('')}</div>
    <small class="mut">${DIFF[ST.diff || 'normal'].d}</small>
    <h3>Wybierz klub</h3>
    <div class="flt"><select data-change="stcc">${Object.values(S.countries).map(c => `<option value="${c.code}" ${ST.cc === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}</select>
    <select data-change="stlg">${S.countries[ST.cc].leagues.map(id => `<option value="${id}" ${ST.lg === id ? 'selected' : ''}>${S.leagues[id].name}</option>`).join('')}</select></div>
    <small class="mut">Dostępne kluby o reputacji do ${maxRepFor(45)}.</small>
    ${clubs.map(c => { const ok = stAllowed(c); return `<button class="club ${ST.club === c.id ? 'on' : ''} ${ok ? '' : 'locked'}" data-act="stclub" data-arg="${c.id}" ${ok ? '' : 'disabled'}>${badge(c)}<div class="sp"><b>${ok ? '' : '🔒 '}${esc(c.name)}</b><br><small>Budżet: ${money(c.tb * DIFF[ST.diff || "normal"].money)} • średnia ${Math.round(teamLevel(c))} • rep. ${c.rep}</small></div><span class="stars">${stars(c)}</span></button>`; }).join('')}
    <h3>Reprezentacja (opcjonalnie)</h3>
    <select data-change="stnt" style="width:100%"><option value="">Bez reprezentacji</option>${NATIONS.filter(n => n.str <= stOvr() + 10).sort((a, b) => a.name.localeCompare(b.name, 'pl')).map(n => `<option value="${n.code}" ${ST.nt === n.code ? 'selected' : ''}>${n.flag} ${n.name}</option>`).join('')}</select>
    <div class="stbar"><button class="btn pri full" data-act="begin" ${ST.club == null ? 'disabled' : ''}>${ST.club == null ? 'Wybierz klub' : `Rozpocznij karierę – ${esc(club(ST.club).name)}`}</button></div></div>`;
}
const keepName = () => { const el = $('#mname'); if (el) S.manager = el.value; };
CHG.stcc = v => { keepName(); ST.cc = v; ST.lg = S.countries[v].leagues[Math.min(1, S.countries[v].leagues.length - 1)]; ST.club = null; showStart(); };
CHG.stlg = v => { keepName(); ST.lg = v; ST.club = null; showStart(); };
CHG.stnt = v => { ST.nt = v; };
ACT.stdiff = k => { keepName(); ST.diff = k; const y = window.scrollY; showStart(); window.scrollTo(0, y); };
ACT.stclub = id => { keepName(); ST.club = +id; const y = window.scrollY; showStart(); window.scrollTo(0, y); };
ACT.begin = () => {
  if (ST.club == null) return;
  const n = ($('#mname').value || '').trim() || 'Menedżer';
  SLOT = ST.slot || 1; startCareer(n, ST.club, ST.nt || null, stOvr(), ST.diff || 'normal'); enterApp();
};
function enterApp() { $('#start').classList.add('hidden'); $('#app').classList.remove('hidden'); UI.tab = 'home'; render(); window.scrollTo(0, 0); if (S && !S.sacked) setTimeout(() => winPopups(), 300); }

/* ---------- start ---------- */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset.arg, el); });
/* przesuwanie palcem w bok – przełączanie podzakładek */
(() => {
  let x0 = 0, y0 = 0, t0 = 0, ok = false;
  const v = () => $('#view');
  document.addEventListener('touchstart', e => {
    const t = e.target; ok = !!(v() && v().contains(t)) && !t.closest('.tabs,.scrollx,.strip,input,select,textarea,.pitch,.pitch2,.uk-pitch,table,.slider') && $('#modal').classList.contains('hidden') && $('#match').classList.contains('hidden');
    if (!ok) return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!ok) return; ok = false;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - t0 > 600) return;
    const rows = v().querySelectorAll('.tabs'); if (!rows.length) return;
    const row = rows[rows.length - 1], bs = [...row.querySelectorAll('button')], i = bs.findIndex(b => b.classList.contains('on'));
    const nb = bs[i + (dx < 0 ? 1 : -1)]; if (i < 0 || !nb) return;
    SWIPE_DIR = dx < 0 ? 'l' : 'r'; nb.click();
  }, { passive: true });
})();
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && CHG[el.dataset.change]) CHG[el.dataset.change](el.value, el); });
(async () => {
  busy(true, 'Tworzenie świata…');
  await new Promise(r => setTimeout(r, 30));
  SLOTS_META = await listSlots();
  createWorld();
  busy(false);
  showMenu();
})();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
/* klawiatura ekranowa: okno dopasowuje się do widocznej części ekranu, a aktywne pole przewija się na środek */
(function () {
  try {
    const vv = window.visualViewport;
    if (vv) { const set = () => document.documentElement.style.setProperty('--vvh', vv.height + 'px'); vv.addEventListener('resize', set); set(); }
    document.addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches('input,select,textarea') && t.closest('#modal')) setTimeout(() => { try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) { /* */ } }, 350); });
  } catch (e) { /* */ }
})();
