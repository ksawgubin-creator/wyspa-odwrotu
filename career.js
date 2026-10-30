/* ============================================================
   KARIERA+: funkcje w stylu FM26 / EA FC
   towarzyskie, Pro Junior System, wymiany i wypożyczenia z opcją,
   klauzule, dyrektor sportowy, klub partnerski, wizja klubu,
   cele zawodników, sponsor koszulki, nazwa stadionu, merchandising
   ============================================================ */

/* ---------- WYMIANA: wartość zawodnika w rozliczeniu transferu ---------- */
function swapVal(sp, c) {
  if (!sp || !c || sp.tid !== S.user || sp.loan) return 0;
  const lv = teamLevel(c), useful = sp.ovr >= lv - 3 && sp.age <= 31;
  return Math.round(sp.val * (useful ? 0.9 : sp.ovr >= lv - 7 ? 0.55 : 0.25) / 1e4) * 1e4;
}
const swapCands = c => userClub().players.filter(p => !p.loan && !p.preTo && p.ovr >= teamLevel(c) - 9).sort((a, b) => b.val - a.val).slice(0, 12);

/* ---------- WYPOŻYCZENIE Z OPCJĄ / OBOWIĄZKIEM WYKUPU ---------- */
function exerciseBuy(pid, auto) {
  const p = pget(pid), ut = userClub(); if (!p || !p.loan || !p.loan.buy || p.tid !== ut.id) return { ok: false, msg: 'Brak opcji wykupu.' };
  const from = club(p.loan.from), price = p.loan.buy.price;
  if (!auto && (ut.bal < price || ut.tb < price)) return { ok: false, msg: `Wykup kosztuje ${money(price)} – brak środków w budżecie transferowym.` };
  ut.bal -= price; ut.tb = Math.max(0, ut.tb - price); ut.fin.tr -= price; from.bal += price; from.tb += Math.round(price * 0.5);
  p.loan = null; p.con = Math.max(p.con, 3); p.joined = absDay();
  msg('✅ Wykup zawodnika', `${p.n} zostaje w klubie na stałe – ${auto ? 'obowiązkowy wykup' : 'skorzystano z opcji wykupu'} za ${money(price)} (${from.name}).`);
  saveSoon(); return { ok: true, msg: `${p.n} wykupiony za ${money(price)}.` };
}
/* klauzula odkupu (po sprzedaży z klauzulą) */
function buyBack(pid) {
  const p = pget(pid), ut = userClub(), c = clubOf(p);
  if (!p || !p.bb || p.bb.club !== ut.id || p.bb.until < S.season || !c) return { ok: false, msg: 'Klauzula odkupu wygasła.' };
  if (!windowOpen()) return { ok: false, msg: 'Okno transferowe jest zamknięte.' };
  if (ut.tb < p.bb.price || ut.bal < p.bb.price) return { ok: false, msg: `Odkup kosztuje ${money(p.bb.price)} – brak środków.` };
  if (ut.players.length >= 32) return { ok: false, msg: 'Kadra pełna (maks. 32).' };
  const price = p.bb.price; ut.bal -= price; ut.tb -= price; ut.fin.tr -= price; c.bal += price;
  detach(p); attach(p, ut); p.bb = null; p.wage = Math.max(p.wage, calcWage(p, ut.rep)); p.con = 3; p.joined = absDay(); refillAI(c); rebuildIndex(); intoXI(ut, p); fillBench(ut);
  msg('🔁 Odkup', `${p.n} wraca do klubu – klauzula odkupu (${money(price)}).`); saveSoon();
  return { ok: true, msg: `${p.n} wraca za ${money(price)}.` };
}
/* klauzula odstępnego Twoich zawodników: bogatsze kluby mogą ją wpłacić w oknie */
function releaseClauseWeek() {
  if (!windowOpen()) return;
  const ut = userClub();
  for (const p of ut.players.slice()) {
    if (!p.rcl || p.loan || p.rcl > p.val * 2.8 || rnd() > (p.rcl <= p.val * 1.6 ? 0.12 : 0.035)) continue;
    const b = S.clubs.find(c => c.id !== ut.id && !isReserve(c) && c.rep >= ut.rep + (p.rcl > p.val * 1.6 ? 12 : 3) && c.bal > p.rcl * 1.3 && teamLevel(c) <= p.ovr + 3 && c.players.length < 28);
    if (!b || ut.players.length <= 18) continue;
    const fee = p.rcl; detach(p); attach(p, b); p.wage = calcWage(p, b.rep); p.con = ri(3, 5); p.rcl = null;
    ut.bal += fee; ut.tb += fee; ut.fin.tr += fee; b.bal -= fee; rebuildIndex(); fillBench(ut);
    msg('📜 Klauzula odstępnego wpłacona!', `${b.name} wpłacił klauzulę odstępnego ${p.n} (${money(fee)}). Zawodnik odchodzi – nie mogłeś odmówić.`);
    news(`📜 ${p.n} – ${ut.name} → ${b.name} (klauzula ${money(fee)}).`);
  }
}

/* ---------- MECZE TOWARZYSKIE (przed sezonem i zimą) ---------- */
function frWindow() {
  if (S.day >= S.cal.length || S.user < 0) return null;
  const firstL = S.cal.findIndex(d => d.t === 'L'), ls = curLs();
  if (S.day <= firstL) return { k: 'pre', max: 3, name: 'okres przygotowawczy' };
  const lg = S.leagues[userClub().lg]; if (lg.lsMap[ls] === -1 || (ls >= 18 && ls <= 20 && windowOpen())) return { k: 'win', max: 2, name: 'przerwa zimowa' };
  return null;
}
function frState() { const w = frWindow(); if (!w) return null; const key = S.season + w.k; if (!S.fr || S.fr.key !== key) S.fr = { key, n: 0, opps: null, done: [] }; return { ...w, st: S.fr }; }
function frOpps() {
  const f = frState(); if (!f) return [];
  if (!f.st.opps) {
    const ut = userClub(), lv = teamLevel(ut), all = S.clubs.filter(c => c.id !== ut.id && !isReserve(c) && c.lg !== ut.lg);
    const pickN = (l, n) => shuffle(l).slice(0, n).map(c => c.id);
    f.st.opps = [...pickN(all.filter(c => c.rep >= ut.rep + 12 && c.rep >= 75), 2), ...pickN(all.filter(c => Math.abs(teamLevel(c) - lv) <= 3), 2), ...pickN(all.filter(c => teamLevel(c) < lv - 4 && c.cc === ut.cc), 2)];
  }
  return f.st.opps.map(club).filter(Boolean);
}
function playFriendly(oppId, home) {
  const f = frState(), ut = userClub(), o = club(oppId); if (!f || !o) return { ok: false, msg: 'Teraz nie można rozgrywać sparingów.' };
  if (f.st.n >= f.max) return { ok: false, msg: `Limit sparingów (${f.max}) w tym okresie wykorzystany.` };
  if (f.st.done.includes(oppId)) return { ok: false, msg: 'Z tym rywalem już grałeś.' };
  if (f.st.lastDay === Math.floor(todayMs() / 864e5)) return { ok: false, msg: 'Jeden sparing na dzień – zawodnicy muszą odpocząć. Przejdź do kolejnego dnia (+1 dzień).' };
  const keep = { l: ut.lineup.slice(), b: ut.bench.slice(), f: ut.formation };
  autoPick(ut);
  const h = home ? ut : o, a = home ? o : ut, m = fastSim(h, a, { comp: 'F', label: 'Mecz towarzyski', neutral: false });
  const me = home ? m.home : m.away, op = home ? m.away : m.home;
  f.st.n++; f.st.done.push(oppId); f.st.lastDay = Math.floor(todayMs() / 864e5);
  // efekty: rytm meczowy, zgranie, finanse
  for (const r of Object.values(me.rec)) { const p = r.p, mins = r.off != null ? r.off - r.on : 90 - r.on; p.shp = clamp((p.shp || 60) + mins / 90 * 18, 0, 100); p.fit = clamp(p.fit - mins / 90 * 4, 30, 100); }
  for (const p of ut.players) if (!me.rec[p.id]) p.shp = clamp((p.shp || 60) + 3, 0, 100);
  const big = o.rep - ut.rep, cash0 = home ? Math.round(attendance(ut, false) * 0.35 * ut.price * GATE_NET) : big >= 10 ? Math.round(o.rep * 12000) : Math.round(Math.max(0, ut.rep - o.rep) * 6000), cash = Math.min(cash0, Math.round(weeklyIncome(ut) * 1.2 / 1000) * 1000);
  ut.lineup = keep.l; ut.bench = keep.b; ut.formation = keep.f;
  ut.bal += cash; ut.fin.inc += cash;
  const gd = me.goals - op.goals; for (const p of ut.players) p.mor = clamp(p.mor + (gd > 0 ? 2 : gd < 0 ? -1 : 0), 0, 100);
  if (big >= 12 && home) S.fans = clamp((S.fans || 60) + 2, 0, 100);
  const sc = `${m.home.t.name} ${m.home.goals}:${m.away.goals} ${m.away.t.name}`;
  const scorers = me.scorers.map(s => s.name).join(', ');
  msg('🤝 Sparing', `${sc}.${scorers ? ' Gole: ' + scorers + '.' : ''} Zawodnicy złapali rytm meczowy.${cash ? ` Wpływy: ${money(cash)}.` : ''}`, true);
  saveSoon(); return { ok: true, m, sc, cash, gd, msg: sc };
}

/* ---------- PRO JUNIOR SYSTEM (Polska): minuty młodzieżowców ---------- */
const PJ_ON = () => S.user >= 0 && userClub().cc === 'POL' && S.leagues[userClub().lg].tier <= 2;
const pjYoung = p => p.nat === (S.countries.POL && S.countries.POL.nat) && p.age <= 21;
function pjInfo() {
  if (!PJ_ON()) return null;
  const ut = userClub(), tier = S.leagues[ut.lg].tier, need = tier === 1 ? 3000 : 2000;
  const mins = sum(ut.players.filter(pjYoung).map(p => (p.st && p.st.mu) || 0));
  const pot = tier === 1 ? 3e6 : 1e6;
  return { need, mins, pot, tier, pct: clamp(mins / need, 0, 1.5), players: ut.players.filter(pjYoung).sort((a, b) => (b.st.mins || 0) - (a.st.mins || 0)) };
}
function pjSeasonEnd(lines) {
  const i = pjInfo(); if (!i) return;
  if (i.mins >= i.need) { const amt = Math.round(i.pot * Math.min(1.5, i.mins / i.need) / 1e4) * 1e4, ut = userClub(); ut.bal += amt; ut.fin.inc += amt; lines.push(`🇵🇱 Pro Junior System: ${i.mins} minut młodzieżowców – nagroda ${money(amt)}.`); S.board.conf = clamp(S.board.conf + 2, 0, 100); }
  else lines.push(`🇵🇱 Pro Junior System: tylko ${i.mins}/${i.need} minut młodzieżowców – bez nagrody.`);
}

/* ---------- DYREKTOR SPORTOWY ---------- */
const DOF_COST = () => Math.round(Math.max(1500, userClub().spons * 0.02) / 100) * 100;
function dofOn() { return S.dof && S.dof.on; }
function dofWeek() {
  if (!dofOn()) return;
  const ut = userClub(), D = S.dof;
  ut.bal -= DOF_COST(); ut.fin.exp += DOF_COST();
  // sprzedaż: oferty za zawodników z listy transferowej
  if (D.sell && windowOpen()) for (const o of S.offers.slice()) { const p = pget(o.pid); if (!p || !p.listed) continue;
    if (o.amount >= p.val * (D.sell === 'fast' ? 0.85 : 1)) { const r = sellTo(o.id); if (r.ok) msg('🧑‍💼 Dyrektor sportowy', `Sprzedał ${p.n} do ${club(o.from).name} za ${money(o.amount)}.`, true); }
    else if (o.amount < p.val * 0.65) S.offers = S.offers.filter(x => x !== o); }
  // skauting: dopisuje cele na brakujące pozycje
  if (D.scout && rnd() < 0.5 && S.short.length < 20) {
    const lv = teamLevel(ut), need = typeof squadNeedsW === 'function' ? squadNeedsW() : {}, pos = Object.keys(need).filter(k => need[k] > 0);
    const c = PALL.filter(p => p.tid >= 0 && p.tid !== ut.id && !p.loan && !S.short.includes(p.id) && (!pos.length || pos.includes(p.pos)) && p.ovr >= lv && p.ovr <= lv + 6 && p.age <= 29 && askPrice(p) <= Math.max(ut.tb, 0) * 1.1 && playerInterest(p).ok).sort((a, b) => (b.ovr + (b.pot - b.ovr) * 0.3) - (a.ovr + (a.pot - a.ovr) * 0.3)).slice(0, 2);
    for (const p of c) { S.short.push(p.id); S.know[p.id] = Math.max(S.know[p.id] || 0, 60); }
    if (c.length) msg('🧑‍💼 Dyrektor sportowy', `Dodał do obserwowanych: ${c.map(p => `${p.n} (${POS_PL[p.pos]}, ${p.ovr})`).join(', ')}.`, true);
  }
}
function squadNeedsW() {
  const ut = userClub(), lv = teamLevel(ut) - 2, n = {};
  const want = { GK: 2, CB: 3, LB: 1, RB: 1, CDM: 1, CM: 2, CAM: 1, LM: 1, RM: 1, LW: 1, RW: 1, ST: 2 };
  for (const pos of Object.keys(want)) { const have = ut.players.filter(p => (p.pos === pos || (p.alt || []).includes(pos)) && p.ovr >= lv).length; n[pos] = clamp(want[pos] - have, 0, 2); }
  return n;
}

/* ---------- KLUB PARTNERSKI ---------- */
function affCands() {
  const ut = userClub();
  return S.clubs.filter(c => c.id !== ut.id && !isReserve(c) && c.rep <= ut.rep - 8 && c.rep >= ut.rep - 35 && (c.cc === ut.cc || c.rep >= 45)).sort((a, b) => (b.cc === ut.cc) - (a.cc === ut.cc) || b.rep - a.rep).slice(0, 8);
}
const affCost = () => Math.round(Math.max(1000, userClub().spons * 0.01) / 100) * 100;
function setAff(id) {
  const c = club(id); if (!c) return { ok: false, msg: 'Nieznany klub.' };
  S.aff = c.id; S.affSince = S.season; msg('🤝 Klub partnerski', `${c.name} zostaje klubem partnerskim. Wypożyczeni tam młodzi zawodnicy dostaną więcej minut i rozwijają się szybciej, a partner da Ci pierwszeństwo przy swoich talentach.`); saveSoon();
  return { ok: true, msg: `Partner: ${c.name}.` };
}
function affSeasonEnd(lines) {
  if (S.aff == null) return; const c = club(S.aff), ut = userClub(); if (!c) { S.aff = null; return; }
  const t = c.players.filter(p => p.age <= 21 && !p.loan && p.pot >= teamLevel(ut) + 2).sort((a, b) => b.pot - a.pot)[0];
  if (t) { t._disc = { k: 0.7, until: absDay() + 70 }; S.short.includes(t.id) || S.short.push(t.id); S.know[t.id] = Math.max(S.know[t.id] || 0, 80); lines.push(`🤝 Klub partnerski ${c.name} oferuje pierwszeństwo: ${t.n} (${t.age} l., ${POS_PL[t.pos]}) – 30% taniej przez 10 tygodni (dodany do obserwowanych).`); }
}

/* ---------- WIZJA KLUBU (wieloletnia) + składowe zaufania zarządu ---------- */
function visionInit(force) {
  const ut = userClub(); if (!ut || (S.vision && S.vision.club === ut.id && !force)) return S.vision;
  const lg = S.leagues[ut.lg], tier = lg.tier, Y = S.season, G = [];
  if (tier > 1) G.push({ k: 'tier', t: tier - 1, by: Y + (tier >= 3 ? 4 : 3), txt: `Awans o poziom wyżej (do ${S.leagues[S.countries[lg.cc].leagues[tier - 2]].name})` });
  else if (ut.rep >= 82) G.push({ k: 'euroko', by: Y + 3, txt: 'Faza pucharowa europejskich pucharów' });
  else G.push({ k: 'euro', by: Y + 3, txt: 'Gra w europejskich pucharach' });
  G.push({ k: 'youth', n: 3, by: Y + 4, txt: '3 wychowanków akademii z co najmniej 900 minutami w sezonie' });
  G.push({ k: 'fin', by: Y + 5, txt: 'Dodatnie saldo klubu na koniec każdego sezonu' });
  G.push({ k: 'style', by: Y + 5, txt: tier <= 1 && ut.rep >= 70 ? 'Ofensywny futbol: najwięcej goli w lidze w jednym z sezonów' : 'Młoda drużyna: średnia wieku (ważona minutami) poniżej 25,5 roku' });
  S.vision = { club: ut.id, from: Y, goals: G.map(g => ({ ...g, done: false, fail: false })) };
  return S.vision;
}
function visionCheck(g, final) {
  const ut = userClub();
  if (g.k === 'tier') return false;   // sprawdzane po awansie (careerNewSeason)
  if (g.k === 'euro') return !!(euroOf(ut.id) && euroOf(ut.id).teams.includes(ut.id));
  if (g.k === 'euroko') return Object.values(S.euro || {}).some(c => c.ko && Object.values(c.ko).some(r => Array.isArray(r) && r.some(t => t && (t.a === ut.id || t.b === ut.id || t.h === ut.id))));
  if (g.k === 'youth') return ut.players.filter(p => p.homegrown && (p.st.mu || 0) >= 900).length >= g.n;
  if (g.k === 'fin') return !g.fail && ut.bal >= 0;
  if (g.k === 'style') { if (/goli/.test(g.txt)) { const t = table(ut.lg); return t.length && t.slice().sort((a, b) => b.GF - a.GF)[0].id === ut.id; } const pl = ut.players.filter(p => (p.st.mu || 0) > 0), tm = sum(pl.map(p => p.st.mu)); return tm > 0 && sum(pl.map(p => p.age * p.st.mu)) / tm < 25.5; }
  return false;
}
const ut0 = () => userClub();
function visionSeasonEnd(lines, final) {
  const V = visionInit(); if (!V) return;
  let delta = 0;
  for (const g of V.goals) {
    if (g.done || (g.fail && g.k !== 'fin')) continue;
    if (g.k === 'fin' && userClub().bal < 0) { g.fail = true; delta -= 4; lines.push(`🎯 Wizja klubu: ujemne saldo – cel „${g.txt}” niezrealizowany.`); continue; }
    const ok = visionCheck(g, final);
    if (ok && g.k !== 'fin') { g.done = true; delta += 6; lines.push(`🎯 Wizja klubu zrealizowana: ${g.txt}!`); }
    else if (!ok && S.season >= g.by && !(g.k === 'tier' && table(ut0().lg).find(r => r.id === ut0().id).pos <= promoN(S.leagues[ut0().lg].cc, S.leagues[ut0().lg].tier - 1))) { g.fail = true; delta -= 6; lines.push(`🎯 Wizja klubu: termin minął – „${g.txt}”.`); }
  }
  if (V.goals.every(g => g.done || g.fail) || S.season >= V.from + 5) { const fin = V.goals.find(g => g.k === 'fin'); if (fin && !fin.fail) { delta += 4; lines.push('🎯 Wizja klubu: 5 lat bez długów – zarząd docenia stabilność.'); } V.done = true; }
  S.board.conf = clamp(S.board.conf + delta, 0, 100);
  if (V.done) { S.vision = null; visionInit(true); lines.push('🎯 Zarząd przedstawił nową 5-letnią wizję klubu.'); }
}
function boardParts() {
  const ut = userClub(), tb = table(ut.lg), me = tb.find(r => r.id === ut.id), tg = S.board.target || 1;
  const res = me && me.P ? clamp(70 - (me.pos - tg) * 8, 0, 100) : 60;
  const fin = clamp(60 + (ut.bal >= 0 ? Math.min(30, ut.bal / Math.max(1, weeklyIncome(ut)) / 2) : -40) - (wageBill(ut) > (S.board.wb || 1e12) ? 15 : 0), 0, 100);
  const V = S.vision, vis = V ? clamp(60 + V.goals.filter(g => g.done).length * 12 - V.goals.filter(g => g.fail).length * 15, 0, 100) : 60;
  const fans = clamp(S.fans || 60, 0, 100);
  return [['⚽ Wyniki', res], ['💰 Finanse', fin], ['🎯 Wizja klubu', vis], ['📣 Kibice', fans]];
}

/* ---------- CELE SEZONOWE ZAWODNIKÓW + PLAN ROZWOJU ---------- */
function objInit() {
  const ut = userClub(); if (!ut) return;
  for (const p of ut.players) {
    p.obj = null; if (p.loan) continue;
    const r = roleOf(p), ln = LINE[p.pos];
    if (p.age <= 21 && p.pot - p.ovr >= 6) p.obj = { k: 'apps', n: r === 'key' || r === 'start' ? 25 : 12, txt: 'występów (30+ min) w sezonie' };
    else if (r === 'key' || r === 'start') {
      if (ln === 'ATT') p.obj = { k: 'g', n: Math.max(5, Math.round((p.ovr - teamLevel(ut) + 8) * 1.2)), txt: 'goli' };
      else if (p.pos === 'CAM' || p.pos === 'LM' || p.pos === 'RM') p.obj = { k: 'ga', n: Math.max(6, Math.round((p.ovr - teamLevel(ut) + 8) * 1.1)), txt: 'goli + asyst' };
      else if (ln === 'GK' || ln === 'DEF') p.obj = { k: 'cs', n: ln === 'GK' ? 10 : 8, txt: 'czystych kont' };
      else p.obj = { k: 'rt', n: 7.0, txt: 'średnia ocen' };
    }
  }
}
function objProg(p) {
  const o = p.obj; if (!o) return null; const st = p.st || {};
  const v = o.k === 'apps' ? (st.a30 || 0) : o.k === 'g' ? st.g : o.k === 'ga' ? st.g + st.a : o.k === 'cs' ? (st.cs || 0) : o.k === 'rt' ? (st.apps ? st.rs / st.apps : 0) : 0;
  return { v: o.k === 'rt' ? Math.round(v * 100) / 100 : v || 0, n: o.n, ok: o.k === 'rt' ? v >= o.n && st.apps >= 15 : v >= o.n };
}
function objSeasonEnd(lines) {
  const ut = userClub(), done = [];
  for (const p of ut.players) {
    const pr = objProg(p); if (!pr) continue;
    if (pr.ok) { p.mor = clamp(p.mor + 8, 0, 100); if (p.ovr < p.pot && p.age <= 29) develop(p, 1); p.val = calcValue(p); done.push(p.n); }
    else p.mor = clamp(p.mor - 3, 0, 100);
    p.obj = null;
  }
  if (done.length) lines.push(`🎯 Cele sezonowe osiągnęli: ${done.join(', ')} (premia rozwoju i morale).`);
}

/* ---------- KOMERCJA: sponsor koszulki, nazwa stadionu, merchandising ---------- */
const KIT_BRANDS = ['NordBet Energy', 'Polar Telecom', 'Vistra Bank', 'Orbita Airlines', 'Kometa Motors', 'Lumen Pay', 'Atlas Logistics', 'Zenit Insurance', 'Falcon Tech', 'Baltica Foods', 'Sigma Mobile', 'Aurora Hotels'];
const NAMING_BRANDS = ['Vistra Arena', 'Polar Stadion', 'Kometa Park', 'Lumen Arena', 'Atlas Stadium', 'Orbita Arena', 'Zenit Park'];
const kitBase = () => Math.round(userClub().spons * 0.18 / 100) * 100;
function kitOffers() {
  if (S.kitOff && S.kitOff.s === S.season) return S.kitOff.l;
  const b = kitBase(), br = shuffle(KIT_BRANDS.slice());
  const l = [
    { n: br[0], k: 'fix', w: Math.round(b * 1.0 / 100) * 100, yrs: 1, d: 'Stała kwota co tydzień, kontrakt na 1 sezon.' },
    { n: br[1], k: 'bonus', w: Math.round(b * 0.7 / 100) * 100, win: Math.round(b * 0.9 / 100) * 100, yrs: 1, d: 'Mniejsza stała kwota + premia za każde zwycięstwo ligowe.' },
    { n: br[2], k: 'long', w: Math.round(b * 1.12 / 100) * 100, yrs: 3, d: 'Najwyższa kwota, ale wiążąca na 3 sezony (bez renegocjacji przy sukcesach).' },
  ];
  S.kitOff = { s: S.season, l }; return l;
}
function chooseKit(i) {
  const o = kitOffers()[i]; if (!o) return { ok: false, msg: 'Oferta nieaktualna.' };
  S.kit = { ...o, until: S.season + o.yrs - 1 }; msg('👕 Sponsor koszulki', `${o.n} zostaje sponsorem na koszulkach: ${money(o.w)}/tydz.${o.win ? ` + ${money(o.win)} za zwycięstwo` : ''}, do sezonu ${SEASON_LABEL(S.kit.until)}.`); saveSoon();
  return { ok: true, msg: `Sponsor: ${o.n}.` };
}
const kitNeeded = () => S.user >= 0 && (!S.kit || S.kit.until < S.season);
const kitWeekly = () => S.kit && S.kit.until >= S.season ? S.kit.w : 0;
function namingOffers() {
  const ut = userClub(), b = Math.round(Math.max(3000, ut.cap * 0.6 * (0.5 + ut.rep / 100)) / 100) * 100, br = shuffle(NAMING_BRANDS.slice());
  return [{ n: br[0], w: b, yrs: 3 }, { n: br[1], w: Math.round(b * 1.35 / 100) * 100, yrs: 5 }];
}
function sellNaming(i) {
  const o = namingOffers()[i], ut = userClub(); if (!o) return { ok: false, msg: 'Brak oferty.' };
  if (S.naming && S.naming.until >= S.season) return { ok: false, msg: 'Nazwa stadionu jest już sprzedana.' };
  S.naming = { ...o, until: S.season + o.yrs - 1, old: ut.stadName || null, club: ut.id }; ut.stadName = o.n;
  S.fans = clamp((S.fans || 60) - 6, 0, 100); S.press = clamp((S.press || 55) - 2, 0, 100);
  msg('🏟️ Nowa nazwa stadionu', `Stadion nazywa się teraz „${o.n}” – ${money(o.w)}/tydz. przez ${plural(o.yrs, 'sezon', 'sezony', 'sezonów')}. Część kibiców jest oburzona.`); saveSoon();
  return { ok: true, msg: `Stadion: ${o.n}.` };
}
const namingWeekly = () => S.naming && S.naming.until >= S.season ? S.naming.w : 0;
const MERCH = { low: ['💚 Przystępne ceny', 'Tańsze koszulki: mniejszy zysk, ale kibice zadowoleni.', 0.8, 0.12], norm: ['⚖️ Standard', 'Zrównoważone ceny pamiątek.', 1, 0], prem: ['💎 Premium', 'Drogie kolekcje i edycje limitowane: większy zysk, kibice narzekają.', 1.3, -0.12] };
const merchK = () => (MERCH[S.merch || 'norm'] || MERCH.norm)[2];

/* ---------- haki tygodniowe i sezonowe ---------- */
function careerWeek(d) {
  if (S.user < 0) return;
  const ut = userClub();
  const inc = kitWeekly() + namingWeekly(); if (inc) { ut.bal += inc; ut.fin.inc += inc; }
  if (S.aff != null) { ut.bal -= affCost(); ut.fin.exp += affCost(); }
  const mf = (MERCH[S.merch || 'norm'] || MERCH.norm)[3]; if (mf) S.fans = clamp((S.fans || 60) + mf, 0, 100);
  dofWeek(); releaseClauseWeek();
  if (S.naming && S.naming.until < S.season) { ut.stadName = S.naming.old; msg('🏟️ Umowa na nazwę stadionu wygasła', 'Stadion wraca do historycznej nazwy – kibice się cieszą.'); S.fans = clamp((S.fans || 60) + 4, 0, 100); S.naming = null; }
}
function careerWin() { if (S.kit && S.kit.k === 'bonus' && S.kit.until >= S.season) { const ut = userClub(); ut.bal += S.kit.win; ut.fin.inc += S.kit.win; } }
function careerSeasonEnd(lines, final) {
  if (S.user < 0) return;
  try { pjSeasonEnd(lines); } catch (e) { }
  try { objSeasonEnd(lines); } catch (e) { }
  try { visionSeasonEnd(lines, final); } catch (e) { }
  try { affSeasonEnd(lines); } catch (e) { }
}
function careerNewSeason() {
  if (S.user < 0) return; objInit(); S.fr = null;
  // awans/spadek rozstrzyga się po ocenie sezonu – cel „awans” sprawdzamy po zmianie lig
  const V = S.vision; if (V) for (const g of V.goals) if (g.k === 'tier' && !g.done && !g.fail && S.leagues[userClub().lg].tier <= g.t) { g.done = true; S.board.conf = clamp(S.board.conf + 6, 0, 100); msg('🎯 Wizja klubu', `Cel zrealizowany: ${g.txt}! Zarząd jest zachwycony.`); }
}
function careerTakeOver() { if (S.naming && S.naming.club != null && club(S.naming.club)) club(S.naming.club).stadName = S.naming.old; S.vision = null; S.aff = null; S.kit = null; S.kitOff = null; S.naming = null; S.dof = S.dof ? { ...S.dof, on: false } : null; visionInit(true); objInit(); }

/* ---------- ASYSTENT PROWADZI DRUŻYNĘ (symulacja dni z kalendarza) ---------- */
// ocena skutku decyzji z perspektywy klubu (bez znajomości losowania – wartość oczekiwana)
function asFxScore(fx) {
  if (!fx) return 0; const inc = Math.max(1, typeof weeklyIncome === 'function' ? weeklyIncome(userClub()) : 1e5);
  const W = { team: 1.6, board: 1.3, fans: 1.0, press: 0.5, player: 0.45, player2: 0.3, form: 0.3, fit: 0.2, teamFit: 0.4, yth: 0.4, mgr: 2 };
  let s = 0;
  for (const [k, v] of Object.entries(fx)) {
    if (typeof v !== 'number') { if (k === 'promise' || k === 'boast') s -= 1; if (k === 'list') s -= 2; continue; }
    if (W[k] != null) s += v * W[k];
    else if (k === 'money' || k === 'cash' || k === 'tb') s += v / inc * 3;
    else if (k === 'spons') s += v / inc * 30;
    else if (k === 'wage') s -= v / inc * 40;
    else if (k === 'inj') s -= v * 0.5;
  }
  return s;
}
// tylko stałe skutki (fx) – funkcje fn mają efekty uboczne, więc nie wolno ich wywoływać przy ocenie
const asStatic = (o, ctx) => { try { return o.fx ? (typeof o.fx === 'function' ? o.fx(ctx) : o.fx) || {} : {}; } catch (e) { return {}; } };
function asChoiceScore(def, ch, ctx) {
  try {
    const base = asStatic(ch, ctx);
    if (!ch.outs || !ch.outs.length) return asFxScore(base);
    let tot = 0, sw = 0;
    for (const o of ch.outs) { const w = Math.max(0, +(typeof o.w === 'function' ? o.w(ctx) : (o.w == null ? 1 : o.w)) || 0); if (!w) continue; tot += w * (asFxScore(mergeFx(base, asStatic(o, ctx))) - (o.bad ? 2 : 0)); sw += w; }
    return sw ? tot / sw : asFxScore(base);
  } catch (e) { return 0; }
}
function assistantPick(ev) {
  const def = eventDef(ev); if (!def || !def.choices || !def.choices.length) return 0;
  const ctx = ctxDeref(ev.ctx), sc = def.choices.map(ch => asChoiceScore(def, ch, ctx));
  const best = sc.indexOf(Math.max(...sc)), q = 0.25 + staffOvr('ass') / 100 * 0.7;   // im lepszy asystent, tym trafniejsze decyzje
  return rnd() < q ? best : ri(0, def.choices.length - 1);
}
/* asystent rozwiązuje oczekujące decyzje; zwraca listę [tytuł, wybór, wynik] */
/* drobne obowiązki asystenta: sponsor koszulki, uzupełnienie kadry z wolnych agentów */
function assistantChores(log) {
  if (kitNeeded()) { const L = kitOffers(); const i = 0; chooseKit(i); log.push({ k: 'i', t: `👕 Asystent podpisał umowę ze sponsorem koszulki: ${L[i].n}.` }); }
  const ut = userClub();
  if (ut.players.length < 20 && ut.bal > 0) {
    const lv = teamLevel(ut), need = squadNeedsW(), F = (S.free || []).filter(p => p.age <= 32 && p.ovr >= lv - 6 && playerInterest(p).ok).sort((a, b) => ((need[b.pos] || 0) * 3 + b.ovr) - ((need[a.pos] || 0) * 3 + a.ovr));
    for (const p of F) { if (ut.players.length >= 21) break; const w = wageDemand(p); if (w > wageRoom()) continue; const r = signFree(p.id, w, 2, {}); if (r && r.ok) log.push({ k: 'i', t: `✍️ Asystent podpisał wolnego zawodnika: ${p.n} (${POS_PL[p.pos]}, ${p.ovr}).` }); }
  }
}
function assistantResolveAll(log) {
  let n = 0;
  while (S.pending.length && n++ < 20) {
    const ev = S.pending[0], ci = assistantPick(ev), r = resolveEvent(ev.uid, ci);
    if (r) log.push({ k: 'ev', t: ev.title, c: ev.choices[ci] || ev.choices[0], r: r.r, fx: r.fx || [] });
  }
}
/* asystent gra mecz za menedżera: skład (z rotacją), szybka symulacja */
function assistantMatchDay(log) {
  const x = userMatchToday(); if (!x) return null;
  const mine = x.user === 'h' ? x.h : x.a;
  if (!x.nt) { try { rotateTired(mine, 70); } catch (e) { } }
  try { fixLineup(mine, x.nt ? null : emergencyFor(mine)); } catch (e) { }
  globalThis.ASSIST_ON = true;
  let r; try { r = processDay(null); } finally { globalThis.ASSIST_ON = false; }
  const um = r && r.userRes; if (um) { const m = um.m, me = um.x.user === 'h' ? m.home : m.away, op = me === m.home ? m.away : m.home;
    log.push({ k: 'm', t: `${m.home.t.name} ${m.home.goals}:${m.away.goals} ${m.away.t.name}`, l: um.x.opts.label, res: me.goals > op.goals || m.winner === um.x.user ? 'W' : me.goals < op.goals ? 'L' : 'D', sc: me.scorers.map(s => s.name).join(', ') }); }
  return r;
}
