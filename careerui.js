/* ============================================================
   KARIERA+ – interfejs: towarzyskie, Pro Junior, zarząd i wizja,
   komercja, klub partnerski, dyrektor sportowy, wymiany,
   wypożyczenia z opcją, klauzule, cele zawodników, statystyki meczu
   ============================================================ */

/* ---------- Pulpit: karty ---------- */
function homeCareerCards() {
  let o = '';
  if (kitNeeded()) o += `<div class="card hl" data-act="kitpick"><div class="row"><span style="font-size:22px">👕</span><div class="sp"><b>Wybierz sponsora koszulki</b><br><small class="mut">Trzy firmy czekają na decyzję – stała kwota, premie za zwycięstwa albo długi kontrakt.</small></div><small>›</small></div></div>`;
  const f = frState();
  if (f && f.st.n < f.max) o += `<div class="card" data-act="friendlies"><div class="row"><span style="font-size:22px">🤝</span><div class="sp"><b>Mecze towarzyskie (${f.st.n}/${f.max})</b><br><small class="mut">${f.name[0].toUpperCase() + f.name.slice(1)}: zagraj sparing – rytm meczowy, zgranie, wpływy.</small></div><small>›</small></div></div>`;
  const pj = pjInfo();
  if (pj) o += `<div class="card" data-act="pjinfo"><div class="row"><span style="font-size:20px">🇵🇱</span><div class="sp"><b>Pro Junior System</b><br><small class="mut">Minuty młodzieżowców (Polacy do 21 lat): ${pj.mins.toLocaleString('pl-PL')} / ${pj.need.toLocaleString('pl-PL')}</small>${bar(Math.round(pj.pct * 100 / 1.5 * 1.5))}</div></div></div>`;
  return o;
}
ACT.pjinfo = () => { const i = pjInfo(); if (!i) return;
  modal(`<h2>🇵🇱 Pro Junior System</h2><p>PZPN nagradza kluby, które dają grać młodym Polakom (do 21 lat). Próg: <b>${i.need.toLocaleString('pl-PL')} minut</b> w sezonie. Nagroda: do <b>${money(Math.round(i.pot * 1.5))}</b> (więcej minut = większa premia).</p>
    <div class="kv"><div><span>Minuty</span><b>${i.mins.toLocaleString('pl-PL')}</b></div><div><span>Postęp</span><b>${Math.round(Math.min(1, i.mins / i.need) * 100)}%</b></div></div>
    <h3>Młodzieżowcy w kadrze</h3><div class="list">${i.players.map(p => `<div class="prow" data-act="info" data-arg="${p.id}">${posTag(p.pos)}<div class="pn">${esc(p.n)}<small>${p.age} l. • ${p.st.apps} występów</small></div><b>${(p.st.mins || 0).toLocaleString('pl-PL')}′</b></div>`).join('') || '<small class="mut">Brak polskich młodzieżowców w kadrze – szukaj w akademii i na rynku.</small>'}</div>
    <div class="btns"><button class="btn full" data-act="close">OK</button></div>`); };

/* ---------- towarzyskie ---------- */
ACT.friendlies = () => {
  const f = frState(); if (!f) return toast('Sparingi można grać przed sezonem i w przerwie zimowej.', 'bad');
  const ut = userClub(), L = frOpps();
  modal(`<h2>🤝 Mecze towarzyskie</h2><small class="mut">${f.name[0].toUpperCase() + f.name.slice(1)} • rozegrane ${f.st.n}/${f.max}. Grający łapią rytm meczowy, wszyscy zgranie. Mecz z gwiazdą u siebie = wpływy i radość kibiców, wyjazd do giganta = honorarium.</small>
    <div class="list">${L.map(c => { const done = f.st.done.includes(c.id); return `<div class="prow">${badge(c, 'sm')}<div class="pn">${esc(c.name)}<small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • średnia ${Math.round(teamLevel(c))}</small></div>${done ? '<span class="pill">✔</span>' : `<button class="btn sm" data-act="frplay" data-arg="${c.id}:1" ${f.st.n >= f.max ? 'disabled' : ''}>🏠</button><button class="btn sm" data-act="frplay" data-arg="${c.id}:0" ${f.st.n >= f.max ? 'disabled' : ''}>✈️</button>`}</div>`; }).join('')}</div>
    <small class="mut">🏠 u siebie • ✈️ na wyjeździe. Skład wybiera asystent (najlepsza jedenastka).</small>
    <div class="btns"><button class="btn full" data-act="close">Zamknij</button></div>`);
};
ACT.frplay = a => { const [id, h] = a.split(':').map(Number); const r = playFriendly(id, !!h); if (!r.ok) return toast(r.msg, 'bad');
  toast(`${r.sc}${r.cash ? ' • +' + money(r.cash) : ''}`, r.gd >= 0 ? 'ok' : ''); render(); ACT.friendlies(); };

/* ---------- sponsor koszulki ---------- */
ACT.kitpick = () => {
  const L = kitOffers();
  modal(`<h2>👕 Sponsor na koszulkach</h2><small class="mut">To dodatkowy dochód poza obecnymi sponsorami. Wybierz jedną ofertę.</small>
    ${L.map((o, i) => `<div class="card"><div class="row"><b class="sp">${esc(o.n)}</b><b class="good">${money(o.w)}/tydz.</b></div><small class="mut">${esc(o.d)}${o.win ? ` Premia: ${money(o.win)} za każde zwycięstwo ligowe.` : ''}</small><div class="btns"><button class="btn sm pri full" data-act="kitsel" data-arg="${i}">Podpisz (${plural(o.yrs, 'sezon', 'sezony', 'sezonów')})</button></div></div>`).join('')}
    <div class="btns"><button class="btn full" data-act="close">Później</button></div>`);
};
ACT.kitsel = i => { const r = chooseKit(+i); toast(r.msg, r.ok ? 'ok' : 'bad'); closeModal(); render(); };

/* ---------- Klub → Zarząd ---------- */
function vBoard() {
  const V = visionInit(), ut = userClub(), parts = boardParts();
  const gl = g => `<div class="row"><span style="font-size:18px">${g.done ? '✅' : g.fail ? '❌' : '⏳'}</span><div class="sp">${esc(g.txt)}<br><small class="mut">termin: ${SEASON_LABEL(g.by)}</small></div></div>`;
  const nm = S.naming && S.naming.until >= S.season, aff = S.aff != null ? club(S.aff) : null, D = S.dof || {};
  return `<div class="card hl"><h2>🏛️ Zaufanie zarządu: ${Math.round(S.board.conf)}%</h2>${bar(Math.round(S.board.conf))}
    ${parts.map(([n, v]) => `<div class="row"><span class="sp">${n}</span><b class="${v >= 60 ? 'good' : v < 40 ? 'bad' : ''}">${Math.round(v)}%</b></div>${bar(Math.round(v))}`).join('')}
    <small class="mut">${esc(S.board.text || '')}${S.board.euro ? ' W Europie: ' + esc(S.board.euro) + '.' : ''}</small></div>
  <div class="card"><h2>🎯 Wizja klubu (${SEASON_LABEL(V.from)}–${SEASON_LABEL(V.from + 4)})</h2><small class="mut">Długoterminowe cele właścicieli. Realizacja podnosi zaufanie (+6 za cel), niedotrzymany termin – obniża.</small>${V.goals.map(gl).join('')}</div>
  <div class="card"><h2>👕 Komercja</h2>
    <div class="row"><div class="sp"><b>Sponsor koszulki</b><br><small class="mut">${S.kit && S.kit.until >= S.season ? `${esc(S.kit.n)} – ${money(S.kit.w)}/tydz.${S.kit.win ? ` + ${money(S.kit.win)}/zwycięstwo` : ''} (do ${SEASON_LABEL(S.kit.until)})` : 'brak – wybierz ofertę'}</small></div>${kitNeeded() ? '<button class="btn sm pri" data-act="kitpick">Wybierz</button>' : ''}</div>
    <div class="row"><div class="sp"><b>Nazwa stadionu</b><br><small class="mut">${nm ? `„${esc(S.naming.n)}” – ${money(S.naming.w)}/tydz. (do ${SEASON_LABEL(S.naming.until)})` : `${esc(ut.stadName || ut.name)} – nazwa historyczna`}</small></div>${nm ? '' : '<button class="btn sm" data-act="naming">Sprzedaj prawa</button>'}</div>
    <h3>Strategia merchandisingu</h3><div class="seg wrap">${Object.entries(MERCH).map(([k, v]) => `<button class="btn sm ${(S.merch || 'norm') === k ? 'on' : ''}" data-act="merch" data-arg="${k}">${v[0]}</button>`).join('')}</div>
    <small class="mut">${esc(MERCH[S.merch || 'norm'][1])}</small></div>
  <div class="card"><h2>🤝 Klub partnerski</h2>${aff ? `<div class="row">${badge(aff, 'sm')}<div class="sp"><b>${esc(aff.name)}</b><br><small class="mut">${S.countries[aff.cc].flag} ${esc(S.leagues[aff.lg].name)} • koszt ${money(affCost())}/tydz.</small></div><button class="btn sm red" data-act="affend">Zakończ</button></div>` : `<small class="mut">Klub z niższej ligi, do którego wypożyczasz młodych: zawsze ich przyjmie, dostaną więcej minut i rozwiną się szybciej. Co sezon partner daje Ci pierwszeństwo przy swoim najlepszym talencie (30% taniej).</small><div class="list">${affCands().map(c => `<div class="prow">${badge(c, 'sm')}<div class="pn">${esc(c.name)}<small>${S.countries[c.cc].flag} ${esc(S.leagues[c.lg].name)} • rep. ${c.rep}</small></div><button class="btn sm" data-act="setaff" data-arg="${c.id}">Wybierz</button></div>`).join('')}</div>`}</div>
  <div class="card"><h2>🧑‍💼 Dyrektor sportowy</h2><small class="mut">Odciąża Cię w pracy biurowej. Koszt: ${money(DOF_COST())}/tydz.</small>
    <div class="row"><span class="sp">Zatrudniony</span><button class="btn sm ${D.on ? 'pri' : ''}" data-act="dof" data-arg="on">${D.on ? 'Tak' : 'Nie'}</button></div>
    ${D.on ? `<div class="row"><span class="sp">Sprzedaż zawodników z listy transferowej<br><small class="mut">przyjmuje oferty ≥ wartości („szybko”: ≥85%), odrzuca niskie</small></span><select data-change="dofsell">${[['', 'Nie'], ['val', 'Za wartość'], ['fast', 'Szybko']].map(([k, n]) => `<option value="${k}" ${(D.sell || '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="row"><span class="sp">Skauting celów na braki w kadrze<br><small class="mut">dopisuje zawodników do obserwowanych</small></span><button class="btn sm ${D.scout ? 'pri' : ''}" data-act="dof" data-arg="scout">${D.scout ? 'Tak' : 'Nie'}</button></div>
    <div class="row"><span class="sp">Przedłużanie kontraktów<br><small class="mut">ustawienie asystenta: ${({ off: 'wyłączone', fringe: 'rezerwowi', all: 'wszyscy' })[S.settings.autoRenew || 'off']}</small></span><button class="btn sm" data-act="dof" data-arg="renew">${S.settings.autoRenew === 'all' ? 'Wszyscy' : 'Przekaż'}</button></div>` : ''}</div>`;
}
ACT.naming = () => { const L = namingOffers();
  modal(`<h2>🏟️ Prawa do nazwy stadionu</h2><p>Firma zapłaci za nadanie stadionowi swojej nazwy. Pieniądze są spore, ale tradycjonaliści wśród kibiców będą oburzeni (kibice −6).</p>
    ${L.map((o, i) => `<div class="card"><div class="row"><b class="sp">„${esc(o.n)}”</b><b class="good">${money(o.w)}/tydz.</b></div><small class="mut">${plural(o.yrs, 'sezon', 'sezony', 'sezonów')} • razem ok. ${money(o.w * 52 * o.yrs)}</small><div class="btns"><button class="btn sm full" data-act="namingsel" data-arg="${i}">Podpisz</button></div></div>`).join('')}
    <div class="btns"><button class="btn full" data-act="close">Nie sprzedawaj</button></div>`); S._nmOff = L; };
ACT.namingsel = i => { if (!confirm('Na pewno zmienić nazwę stadionu?')) return; const r = sellNaming(+i); toast(r.msg, r.ok ? 'ok' : 'bad'); closeModal(); render(); };
ACT.merch = k => { S.merch = k; saveSoon(); render(); };
ACT.setaff = id => { const r = setAff(+id); toast(r.msg, 'ok'); render(); };
ACT.affend = () => { if (!confirm('Zakończyć współpracę z klubem partnerskim?')) return; S.aff = null; saveSoon(); render(); };
ACT.dof = k => { S.dof = S.dof || { on: false, sell: '', scout: false };
  if (k === 'on') S.dof.on = !S.dof.on; else if (k === 'scout') S.dof.scout = !S.dof.scout; else if (k === 'renew') S.settings.autoRenew = S.settings.autoRenew === 'all' ? 'fringe' : 'all';
  saveSoon(); render(); };
CHG.dofsell = v => { S.dof = S.dof || { on: true }; S.dof.sell = v; saveSoon(); render(); };

/* ---------- transfery: wymiana, wypożyczenie z opcją, klauzule ---------- */
function swapHtml(p, c) {
  if (!c) return '';
  const L = swapCands(c), sp = NEG.swap ? pget(NEG.swap) : null;
  return `<div class="numrow"><span>🔁 Zawodnik w rozliczeniu:</span><select data-change="negswap" style="flex:1;min-width:0"><option value="">— bez wymiany —</option>${L.map(q => `<option value="${q.id}" ${NEG.swap === q.id ? 'selected' : ''}>${esc(shortName(q))} (${POS_PL[q.pos]}, ${q.ovr}) – ${money(swapVal(q, c))}</option>`).join('')}</select></div>
    ${sp ? `<small class="mut">${esc(c.name)} wycenia ${esc(sp.n)} na <b>${money(swapVal(sp, c))}</b> – tyle mniej gotówki potrzeba. Zawodnik odejdzie po finalizacji transferu.</small>` : ''}`;
}
CHG.negswap = v => { NEG.swap = v ? +v : null; NEG.counter = null; setTimeout(() => renderNego()); };
function rclHtml(p) {
  const opts = [[0, 'Bez klauzuli'], [Math.round(p.val * 1.5 / 1e5) * 1e5, 'Niska'], [Math.round(p.val * 2.5 / 1e5) * 1e5, 'Wysoka']];
  if (REN.rc == null) REN.rc = p.rcl || 0;
  return `<h3>📜 Klauzula odstępnego</h3><div class="seg wrap">${opts.map(([v, n]) => `<button class="btn sm ${REN.rc === v ? 'on' : ''}" data-act="renrcl" data-arg="${v}">${n}${v ? ' ' + money(v) : ''}</button>`).join('')}</div>
    <small class="mut">Zawodnik chętniej zaakceptuje niższą pensję (niska: ok. −10%, wysoka: −5%), ale bogatszy klub może w oknie wpłacić klauzulę – i nie możesz odmówić.</small>`;
}
ACT.renrcl = v => { REN.rc = +v || 0; REN.counter = null; renderRen(); };
ACT.acceptbb = id => { const o = S.offers.find(x => x.id === +id), p = o && pget(o.pid); if (!p) return;
  if (!confirm(`Sprzedać ${p.n} za ${money(Math.round(o.amount * 0.9 / 1e4) * 1e4)} z klauzulą odkupu? Przez 2 sezony możesz go odkupić za ${money(Math.round(o.amount * 0.9 * 1.6 / 1e4) * 1e4)}.`)) return;
  const r = sellTo(+id, true); toast(r.msg); closeModal(); render(); };
ACT.loanopts = id => { const p = pget(+id), c = clubOf(p), v = p.val;
  modal(`<h2>🔁 Wypożyczenie: ${esc(p.n)}</h2><small class="mut">${esc(c.name)} • wartość ${money(v)}. Wypożyczenie trwa do końca sezonu.</small>
    <div class="card"><b>Zwykłe wypożyczenie</b><br><small class="mut">Opłata ok. ${money(Math.round(v * 0.1 / 1e4) * 1e4)}. Tylko rezerwowi i perspektywiczni.</small><div class="btns"><button class="btn sm full" data-act="loanin2" data-arg="${p.id}:">Wypożycz</button></div></div>
    <div class="card"><b>Z opcją wykupu</b><br><small class="mut">Opłata ok. ${money(Math.round(v * 0.14 / 1e4) * 1e4)}. Wykup za ${money(Math.round(v * 1.15 / 1e4) * 1e4)} – możesz, ale nie musisz.</small><div class="btns"><button class="btn sm full" data-act="loanin2" data-arg="${p.id}:opt">Wypożycz z opcją</button></div></div>
    <div class="card"><b>Z obowiązkiem wykupu</b><br><small class="mut">Opłata ok. ${money(Math.round(v * 0.06 / 1e4) * 1e4)}, po sezonie obowiązkowy wykup za ${money(Math.round(v * 1.05 / 1e4) * 1e4)}. Kluby chętniej oddają tak nawet podstawowych zawodników.</small><div class="btns"><button class="btn sm full" data-act="loanin2" data-arg="${p.id}:obl">Wypożycz z obowiązkiem</button></div></div>
    <div class="btns"><button class="btn full" data-act="info" data-arg="${p.id}">Wróć</button></div>`); };
ACT.loanin2 = a => { const [id, mode] = a.split(':'); const r = loanIn(+id, mode || ''); toast(r.msg, r.ok ? 'ok' : 'bad'); if (r.ok) closeModal(); render(); };
ACT.exbuy = id => { const p = pget(+id); if (!confirm(`Wykupić ${p.n} za ${money(p.loan.buy.price)}?`)) return; const r = exerciseBuy(+id); toast(r.msg, r.ok ? 'ok' : 'bad'); ACT.info(id); render(); };
ACT.buyback = id => { const r = buyBack(+id); toast(r.msg, r.ok ? 'ok' : 'bad'); if (r.ok) closeModal(); render(); };

/* ---------- cele zawodnika ---------- */
function objHtml(p) {
  const pr = objProg(p); let o = '';
  if (pr) { const pct = p.obj.k === 'rt' ? clamp(pr.v / pr.n * 100, 0, 100) : clamp(pr.v / pr.n * 100, 0, 100);
    o += `<h3>🎯 Cel na sezon</h3><div class="row"><span class="sp">${p.obj.k === 'rt' ? `Średnia ocen ≥ ${pr.n.toFixed(1)}` : `${pr.n} ${esc(p.obj.txt)}`}</span><b class="${pr.ok ? 'good' : ''}">${p.obj.k === 'rt' ? pr.v.toFixed(2) : pr.v}${pr.ok ? ' ✅' : ''}</b></div>${bar(Math.round(pct))}<small class="mut">Osiągnięcie celu: +morale i dodatkowy postęp w rozwoju na koniec sezonu.</small>`; }
  if (p.rcl) o += `<small class="mut">📜 Klauzula odstępnego: <b>${money(p.rcl)}</b></small>`;
  return o;
}

/* ---------- statystyki zawodników + heatmapa ---------- */
function heatSVG(side, r, flip) {
  const f = slotsOf(side.t.formation || '4-3-3'), sl = f.find(s => s.pos === r.pos) || { x: 50, y: 50 };
  const W = 150, H = 98, pts = [], seed = r.p.id;
  const rnd2 = k => ((Math.sin(seed * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
  const mob = LINE[r.pos] === 'GK' ? 4 : LINE[r.pos] === 'MID' ? 16 : 12, mins = Math.max(1, r.mins || 90);
  const n = Math.round(6 + mins / 9);
  for (let i = 0; i < n; i++) pts.push([sl.y + (rnd2(i) - 0.45) * mob * 2 + (LINE[r.pos] !== 'GK' ? (side.ment === 'att' ? 6 : side.ment === 'def' ? -6 : 0) : 0), sl.x + (rnd2(i + 99) - 0.5) * mob * 1.6]);
  for (let i = 0; i < (r.sh || 0) * 2; i++) pts.push([84 + rnd2(i + 200) * 12, 35 + rnd2(i + 300) * 30]);
  for (let i = 0; i < (r.tk || 0); i++) pts.push([sl.y - 8 + rnd2(i + 400) * 10, sl.x + (rnd2(i + 500) - 0.5) * 20]);
  const X = d => clamp(d, 2, 98) / 100 * W, Y = d => clamp(d, 2, 98) / 100 * H;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:220px;border-radius:8px;background:#1f7a3f"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#fff8"/><line x1="${W / 2}" y1="1" x2="${W / 2}" y2="${H - 1}" stroke="#fff8"/><circle cx="${W / 2}" cy="${H / 2}" r="10" fill="none" stroke="#fff8"/><rect x="1" y="${H / 2 - 16}" width="18" height="32" fill="none" stroke="#fff8"/><rect x="${W - 19}" y="${H / 2 - 16}" width="18" height="32" fill="none" stroke="#fff8"/>
    ${pts.map(([a, b]) => `<circle cx="${X(a)}" cy="${Y(b)}" r="11" fill="#ff3b30" opacity=".16"/>`).join('')}${pts.map(([a, b]) => `<circle cx="${X(a)}" cy="${Y(b)}" r="4" fill="#ffd23f" opacity=".22"/>`).join('')}</svg>`;
}
ACT.mstats = () => {
  if (!LASTM) return; const m = LASTM.m, me = LASTM.user === 'h' ? m.home : m.away;
  const R = Object.values(me.rec).filter(r => (r.mins || 0) > 0).sort((a, b) => POSITIONS.indexOf(a.pos) - POSITIONS.indexOf(b.pos));
  modal(`<h2>📊 Statystyki zawodników</h2><small class="mut">${esc(me.t.name)} • xG ${(me.xg || 0).toFixed(2)} • strzały ${me.shots}. Dotknij zawodnika, by zobaczyć heatmapę.</small>
    <div class="mst"><div class="mst-h"><span>Zawodnik</span><span>Min</span><span>Ocena</span><span>G/A</span><span>Strz.</span><span>xG</span><span>Kl.p.</span><span>Odb.</span></div>
    ${R.map(r => `<div class="mst-r" data-act="mheat" data-arg="${r.p.id}"><span>${posTag(r.pos)} ${esc(lastName(r.p))}</span><span>${r.mins}</span><span><b style="color:${rateCol(r.rating)}">${r.rating.toFixed(1)}</b></span><span>${r.g}/${r.a}</span><span>${r.sh || 0}</span><span>${(r.xg || 0).toFixed(2)}</span><span>${r.kp || 0}</span><span>${r.tk || 0}${LINE[r.pos] === 'GK' ? ` <small>(${r.sv} ob.)</small>` : ''}</span></div>`).join('')}</div>
    <div id="mheat"></div>
    <div class="btns"><button class="btn sp" data-act="backres">◀ Wynik</button><button class="btn pri sp" data-act="finishday">Dalej</button></div>`, true);
};
ACT.backres = () => showResult();
ACT.mheat = id => { const m = LASTM.m, me = LASTM.user === 'h' ? m.home : m.away, r = me.rec[+id]; if (!r) return;
  $('#mheat').innerHTML = `<div class="card"><b>🔥 Heatmapa: ${esc(r.p.n)}</b> <small class="mut">(${POS_PL[r.pos]}, atak w prawo)</small><div style="text-align:center;margin-top:6px">${heatSVG(me, r)}</div><small class="mut">Strefy aktywności na podstawie pozycji, taktyki, strzałów i odbiorów.</small></div>`; };
