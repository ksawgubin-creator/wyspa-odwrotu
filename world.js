'use strict';
/* ============================================================
   KARIERA MENEDŻERA – świat: ligi, kalendarz, puchary UEFA,
   reprezentacje, transfery, skauting, finanse, sezon
   ============================================================ */
let S = null;
let PALL = [];                 // wszyscy zawodnicy (klubowi + wolni + wirtualni)
let NATIDX = new Map();        // narodowość -> zawodnicy
const NAT = {}; for (const n of NATIONS) NAT[n.code] = n;
const club = id => S.clubs[id];
const userClub = () => S.clubs[S.user];
const LS = 46;                 // liczba „slotów” ligowych w sezonie
const SEASON_LABEL = s => `${s}/${String(s + 1).slice(2)}`;
const COMP_NAME = { CL: 'Liga Mistrzów', EL: 'Liga Europy', ECL: 'Liga Konferencji', L: 'Liga', N: 'Reprezentacja', T: 'Turniej', F: 'Towarzyski' };
const STAGE_NAME = { LP: 'Faza ligowa', PO: 'Baraże', R16: '1/8 finału', QF: 'Ćwierćfinał', SF: 'Półfinał', F: 'Finał', G: 'Faza grupowa' };
const PROMO = { ENG: 3, ESP: 3, ITA: 3, GER: 2, FRA: 2, POL: 3 };
const DOM = { ENG: .4, ESP: .6, ITA: .45, GER: .5, FRA: .55, POR: .45, NED: .55, BEL: .45, TUR: .55, SCO: .5, AUT: .6, SUI: .55, CZE: .75, GRE: .45, DEN: .65, POL: .65, UKR: .8, CRO: .7, SRB: .75, NOR: .75, SWE: .7 };
const TVW = { ENG: [6.5e5, 8e4], ESP: [4.2e5, 5e4], ITA: [4e5, 4e4], GER: [4e5, 6e4], FRA: [2.8e5, 4e4], POR: [8e4], NED: [8e4], BEL: [6e4], TUR: [1e5], SCO: [4e4], AUT: [3e4], SUI: [3.5e4], CZE: [2.5e4], GRE: [3e4], DEN: [3e4], POL: [5e4, 1.5e4], UKR: [2e4], CRO: [2e4], SRB: [1.5e4], NOR: [2.5e4], SWE: [2.5e4] };
const NCOL = {
  POL: ['#ffffff', '#dc143c'], ENG: ['#ffffff', '#1d3b8b'], ESP: ['#c60b1e', '#ffc400'], ITA: ['#0064aa', '#ffffff'], GER: ['#ffffff', '#111111'], FRA: ['#1d3b8b', '#ffffff'],
  POR: ['#a50021', '#006600'], NED: ['#ff6600', '#ffffff'], BEL: ['#e30613', '#111111'], TUR: ['#e30a17', '#ffffff'], SCO: ['#1a2a6c', '#ffffff'], AUT: ['#ed2939', '#ffffff'],
  SUI: ['#d52b1e', '#ffffff'], CZE: ['#d7141a', '#ffffff'], GRE: ['#0d5eaf', '#ffffff'], DEN: ['#c60c30', '#ffffff'], UKR: ['#ffd500', '#005bbb'], CRO: ['#ffffff', '#e30613'],
  SRB: ['#c6363c', '#ffffff'], NOR: ['#ba0c2f', '#ffffff'], SWE: ['#fecc00', '#006aa7'], BRA: ['#ffdf00', '#009c3b'], ARG: ['#74acdf', '#ffffff'], URU: ['#5eb6e4', '#111111'],
  USA: ['#ffffff', '#002868'], MEX: ['#006847', '#ffffff'], JPN: ['#00008b', '#ffffff'], KOR: ['#cd2e3a', '#ffffff'], MAR: ['#c1272d', '#006233'], SEN: ['#00853f', '#fdef42'],
  WAL: ['#c8102e', '#ffffff'], IRL: ['#169b62', '#ffffff'], HUN: ['#ce2939', '#ffffff'], SVK: ['#0b4ea2', '#ffffff'], NGA: ['#008751', '#ffffff'], COL: ['#fcd116', '#003893'],
};
const ncol = c => NCOL[c] || ['#2d3b5c', '#ffffff'];

/* ---------- generowanie zawodników ---------- */
let FOREIGN_W = null, FOREIGN_TOP = null;
function foreignNat(top) {
  if (!FOREIGN_W) {
    const boost = { BRA: 2.2, FRA: 1.8, ARG: 1.6, ESP: 1.3, POR: 1.3, NED: 1.2, BEL: 1.1, GER: 1.1, ENG: 1, CRO: 1.1, SRB: 1.1, SEN: 1.2, CIV: 1.1, NGA: 1.1, MAR: 1.1 };
    FOREIGN_W = NATIONS.map(n => Math.pow(n.str / 50, 3) * (boost[n.code] || 1) * (n.conf === 'UEFA' ? 1 : n.conf === 'CONMEBOL' ? 1.2 : n.conf === 'CAF' ? 0.9 : 0.5));
    FOREIGN_TOP = NATIONS.map((n, i) => FOREIGN_W[i] * Math.pow(n.str / 70, 4));
  }
  const w = top ? FOREIGN_TOP : FOREIGN_W;
  let r = rnd() * sum(w);
  for (let i = 0; i < NATIONS.length; i++) { r -= w[i]; if (r <= 0) return NATIONS[i].code; }
  return 'BRA';
}
function genName(nat) { const pool = NAME_POOLS[(NAT[nat] || NAT.POL).pool] || NAME_POOLS.PL; return pick(pool.f) + ' ' + pick(pool.l); }
function genPlayer(pos, target, nat, o = {}) {
  const age = o.age || clamp(Math.round(25 + gauss() * 4), 17, 36);
  let t = target;
  if (o.adjAge !== false) { if (age < 22) t -= (22 - age) * 1.6; if (age > 32) t -= (age - 32) * 1.2; }
  t = clamp(Math.round(t), 35, 93);
  const a = genAttrs(pos, t);
  const ovr = calcOvr(pos, a);
  let pot = o.pot || (age < 28 ? ovr + Math.round(Math.max(0, 27 - age) * rnd() * 1.6 + rnd() * 3) : ovr);
  pot = clamp(Math.max(pot, ovr), ovr, 95);
  const p = {
    id: S.nextPid++, n: genName(nat), nat, pos, alt: bestAlt(pos, a), age, a, ovr, pot,
    foot: rnd() < (pos === 'LB' || pos === 'LM' || pos === 'LW' ? 0.6 : 0.22) ? 'L' : 'R', wf: ri(1, 5) === 5 ? 5 : ri(2, 4), sm: pos === 'GK' ? 1 : clamp(Math.round(1 + a[3] / 25 + gauss() * 0.6), 1, 5),
    fit: ri(92, 100), mor: ri(55, 75), form: ri(42, 60), shp: ri(55, 80), inj: 0, susp: 0, con: o.con || ri(1, 5), wage: 0, val: 0,
    st: newStats(), lg: 0, eg: 0, car: { apps: 0, g: 0, a: 0 }, caps: 0, ng: 0, pt: 0.5, listed: false, loan: null, tid: -1,
  };
  p.val = calcValue(p);
  return p;
}
const newStats = () => ({ apps: 0, g: 0, a: 0, rs: 0, mins: 0, y: 0, r: 0 });
const SHAPE = [['GK', 0], ['GK', 1], ['GK', 2], ['CB', 0], ['CB', 0], ['CB', 1], ['CB', 2], ['LB', 0], ['LB', 2], ['RB', 0], ['RB', 1], ['CDM', 0], ['CDM', 1], ['CM', 0], ['CM', 0], ['CM', 2], ['CAM', 0], ['CAM', 1], ['LW', 0], ['LM', 1], ['RW', 0], ['RM', 2], ['ST', 0], ['ST', 1], ['ST', 2]];
const clubLevel = rep => 40 + rep * 0.47;
function squadPlayer(c, pos, role) {
  const lvl = clubLevel(c.rep);
  let age, target;
  if (role === 0) { age = clamp(Math.round(26 + gauss() * 3), 20, 34); target = lvl + gauss() * 2.5; }
  else if (role === 1) { age = clamp(Math.round(25 + gauss() * 4), 19, 35); target = lvl - 4 + gauss() * 3; }
  else if (rnd() < 0.5) { age = ri(17, 21); target = lvl - 4 + gauss() * 3; }
  else { age = ri(22, 34); target = lvl - 9 + gauss() * 3; }
  const nat = rnd() < (DOM[c.cc] || 0.6) ? S.countries[c.cc].nat : foreignNat(c.rep >= 78);
  const p = genPlayer(pos, target, nat, { age });
  p.wage = calcWage(p, c.rep); p.tid = c.id;
  return p;
}
function genSquad(c) {
  const ps = SHAPE.map(([pos, role]) => squadPlayer(c, pos, role));
  if (c.rep >= 84) for (let i = 0; i < 2; i++) { const p = pick(ps.filter(x => x.st && x.age >= 21 && x.age <= 31 && x.pos !== 'GK')); develop(p, ri(2, 5)); p.pot = Math.max(p.pot, p.ovr); p.val = calcValue(p); p.wage = calcWage(p, c.rep); }
  return ps;
}

/* ---------- indeks ---------- */
function rebuildIndex() {
  PM = new Map(); PALL = []; NATIDX = new Map();
  const add = (p, tid) => { p.tid = tid; PM.set(p.id, p); PALL.push(p); if (!NATIDX.has(p.nat)) NATIDX.set(p.nat, []); NATIDX.get(p.nat).push(p); };
  for (const c of S.clubs) for (const p of c.players) add(p, c.id);
  for (const p of S.free) add(p, -1);
  for (const p of S.virt) add(p, -2);
}
const teamLevel = c => { const o = c.players.map(p => p.ovr).sort((a, b) => b - a).slice(0, 14); return avg(o); };
function clubOf(p) { return p.tid >= 0 ? club(p.tid) : null; }
function clubName(p) { return p.tid >= 0 ? club(p.tid).name : p.tid === -1 ? 'Wolny agent' : 'Liga zagraniczna'; }

/* ---------- świat ---------- */
function createWorld() {
  S = {
    v: 2, manager: '', season: 2026, day: 0, user: -1, nt: null, clubs: [], leagues: {}, countries: {}, free: [], virt: [],
    inbox: [], offers: [], news: [], history: [], ntHist: [], champs: {}, awards: [], nextPid: 1, nextId: 1,
    board: { conf: 60, target: 8, text: '', euro: '' }, mrep: 50, settings: { speed: 2 }, scouts: [], scoutMarket: [], know: {}, reports: [], short: [],
    ccoef: {}, cpts: {}, euro: {}, euroHist: [], lastTables: {}, lastWinners: {}, cal: [], ntTeams: {}, ntc: null, fac: { youth: 2, train: 2 }, summary: null, sacked: false,
  };
  for (const c of COUNTRIES) {
    S.countries[c.code] = { code: c.code, name: c.name, flag: c.flag, nat: c.nat, coef: c.coef.slice(), leagues: c.leagues.map(l => l.id) };
    for (const l of c.leagues) {
      const lg = S.leagues[l.id] = { id: l.id, name: l.name, cc: c.code, tier: l.tier, clubs: [], fix: [], lsMap: [] };
      for (const t of l.clubs) {
        const cl = {
          id: S.clubs.length, name: t[0], short: t[1], col: [t[2], t[3]], cc: c.code, lg: l.id, rep: t[4], cap: t[5],
          players: [], formation: pick(['4-3-3', '4-2-3-1', '4-4-2', '4-3-3', '3-5-2', '4-1-2-1-2']), ment: 'bal', lineup: [], bench: [], training: 'bal',
        };
        cl.players = genSquad(cl);
        S.clubs.push(cl); lg.clubs.push(cl.id);
      }
    }
  }
  for (const cl of S.clubs) { cl.level = teamLevel(cl); setupEconomy(cl); S.ccoef[cl.id] = Array.from({ length: 5 }, () => Math.max(0, Math.round(((cl.rep - 58) * 0.75 + gauss() * 3) * 10) / 10)); }
  for (const n of NATIONS) S.ntTeams[n.code] = { formation: '4-3-3', lineup: [], bench: [], sq: [], ment: 'bal' };
  ensureNationPools();
  for (let i = 0; i < 80; i++) S.free.push(genFreeAgent());
  rebuildIndex();
  for (const id in S.leagues) S.lastTables[id] = S.leagues[id].clubs.slice().sort((a, b) => club(b).rep - club(a).rep + gauss() * 4);
  for (let i = 0; i < 5; i++) S.scoutMarket.push(genScout());
  S.scouts.push(Object.assign(genScout(), { ab: 9, cost: 1500 }));
  newSeason(true);
}
function setupEconomy(c) {
  const bill = sum(c.players.map(p => p.wage));
  const tvTable = TVW[c.cc] || [5e4, 1e4];
  c.tv = S.leagues[c.lg].tier === 1 ? tvTable[0] : (tvTable[1] || tvTable[0] * 0.15);
  c.price = 5 + c.rep * 0.3;
  const gateAvg = 0.5 * c.cap * 0.75 * c.price;
  c.spons = Math.max(2000, Math.round((bill * (0.98 + c.rep / 700 + rnd() * 0.08) - c.tv - gateAvg) / 1000) * 1000);
  const sv = sum(c.players.map(p => p.val));
  c.bal = Math.round(sv * (0.08 + rnd() * 0.1) / 100000) * 100000;
  c.tb = Math.round(c.bal * 0.6 / 100000) * 100000;
  c.fin = { inc: 0, exp: 0, tr: 0 };
}
function ensureNationPools() {
  const counts = {};
  for (const c of S.clubs) for (const p of c.players) { counts[p.nat] = counts[p.nat] || { GK: 0, DEF: 0, MID: 0, ATT: 0, best: [] }; counts[p.nat][LINE[p.pos]]++; }
  const need = { GK: 3, DEF: 9, MID: 9, ATT: 6 };
  for (const n of NATIONS) {
    const c = counts[n.code] || { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    const lvl = 44 + n.str * 0.45;
    const posFor = { GK: ['GK'], DEF: ['CB', 'CB', 'LB', 'RB'], MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'], ATT: ['ST', 'LW', 'RW'] };
    for (const line of Object.keys(need)) for (let i = c[line]; i < need[line]; i++) {
      const p = genPlayer(pick(posFor[line]), lvl - 3 + gauss() * 3, n.code, { age: ri(20, 32) });
      p.wage = 0; S.virt.push(p);
    }
  }
}
function genFreeAgent() {
  const p = genPlayer(pick(POSITIONS), 52 + rnd() * 18, rnd() < 0.5 ? pick(['POL', 'ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED']) : foreignNat(false), { age: ri(19, 34) });
  p.val = Math.round(p.val * 0.5 / 10000) * 10000; p.wage = calcWage(p, 50); return p;
}
function genScout() {
  const ab = clamp(Math.round(10 + gauss() * 4), 4, 20);
  return { id: S.nextId++, name: genName(pick(['POL', 'POL', 'ENG', 'ESP', 'GER', 'ITA', 'FRA', 'NED', 'POR'])), ab, cost: Math.round((800 + ab * ab * 30) / 100) * 100, task: null };
}

/* ---------- kalendarz ---------- */
const EURO_AFTER = { 5: ['LP', 0], 8: ['LP', 1], 11: ['LP', 2], 14: ['LP', 3], 18: ['LP', 4], 21: ['LP', 5], 25: ['LP', 6], 26: ['LP', 7], 28: ['PO', 1], 29: ['PO', 2], 31: ['R16', 1], 32: ['R16', 2], 35: ['QF', 1], 36: ['QF', 2], 39: ['SF', 1], 40: ['SF', 2] };
const NT_AFTER = { 3: [0, 1], 9: [2, 3], 15: [4, 5], 30: [6, 7] };
function tournamentType(season) { const y = season + 1; return y % 4 === 0 ? 'EURO' : y % 4 === 2 ? 'WC' : 'NLF'; }
function buildCalendar() {
  const cal = []; let date = Date.UTC(S.season, 7, 9);
  const DAY = 864e5;
  for (let ls = 0; ls < LS; ls++) {
    cal.push({ t: 'L', ls, date }); const base = date;
    if (EURO_AFTER[ls]) { const [st, x] = EURO_AFTER[ls]; cal.push(st === 'LP' ? { t: 'E', st, md: x, date: base + 3 * DAY } : { t: 'E', st, leg: x, date: base + 3 * DAY }); }
    if (NT_AFTER[ls]) { const [a, b] = NT_AFTER[ls]; cal.push({ t: 'N', md: a, date: base + 5 * DAY }, { t: 'N', md: b, date: base + 8 * DAY }); date += 7 * DAY; }
    date += 6 * DAY;
  }
  cal.push({ t: 'E', st: 'F', date: date + 3 * DAY }); date += 14 * DAY;
  const tt = tournamentType(S.season);
  const stages = tt === 'NLF' ? ['SF', 'F'] : tt === 'EURO' ? ['G0', 'G1', 'G2', 'QF', 'SF', 'F'] : ['G0', 'G1', 'G2', 'R16', 'QF', 'SF', 'F'];
  for (const st of stages) { cal.push(st[0] === 'G' ? { t: 'T', st: 'G', md: +st[1], date } : { t: 'T', st, date }); date += 4 * DAY; }
  let prev = cal[0].date - 7 * DAY;
  for (const d of cal) { d.gap = Math.max(1, Math.round((d.date - prev) / DAY)); prev = d.date; }
  S.cal = cal;
}
const curDay = () => S.cal[Math.min(S.day, S.cal.length - 1)];
function curLs() { for (let i = Math.min(S.day, S.cal.length - 1); i >= 0; i--) if (S.cal[i].t === 'L') return S.cal[i].ls; return 0; }
const windowOpen = () => { if (S.day >= S.cal.length) return true; const ls = curLs(); return S.day === 0 || ls <= 3 || (ls >= 20 && ls <= 23); };
const windowText = () => windowOpen() ? (curLs() <= 3 ? 'Letnie okno transferowe OTWARTE' : 'Zimowe okno transferowe OTWARTE') : 'Okno transferowe zamknięte';
const fmtDate = ms => new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* ---------- ligi ---------- */
function makeFixtures(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const rd = [];
    for (let i = 0; i < n / 2; i++) {
      let h = arr[i], a = arr[n - 1 - i];
      if ((r + i) % 2 === 1) [h, a] = [a, h];
      if (i === 0 && r % 2 === 1) [h, a] = [a, h];
      rd.push({ h, a, hg: 0, ag: 0, p: 0 });
    }
    rounds.push(rd); arr.splice(1, 0, arr.pop());
  }
  return rounds.concat(rounds.map(rd => rd.map(f => ({ h: f.a, a: f.h, hg: 0, ag: 0, p: 0 }))));
}
function table(lgId) {
  const lg = S.leagues[lgId];
  const rows = {}; lg.clubs.forEach(id => rows[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, form: [] });
  for (const rd of lg.fix) for (const f of rd) {
    if (!f.p) continue; const H = rows[f.h], A = rows[f.a]; if (!H || !A) continue;
    H.P++; A.P++; H.GF += f.hg; H.GA += f.ag; A.GF += f.ag; A.GA += f.hg;
    if (f.hg > f.ag) { H.W++; A.L++; H.Pts += 3; H.form.push('W'); A.form.push('L'); }
    else if (f.hg < f.ag) { A.W++; H.L++; A.Pts += 3; A.form.push('W'); H.form.push('L'); }
    else { H.D++; A.D++; H.Pts++; A.Pts++; H.form.push('D'); A.form.push('D'); }
  }
  const out = Object.values(rows).sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || a.id - b.id);
  out.forEach((r, i) => r.pos = i + 1);
  return out;
}
const leaguePos = c => table(c.lg).find(r => r.id === c.id).pos;
function topScorers(lgId, n = 20, key = 'lg') {
  return S.leagues[lgId].clubs.flatMap(id => club(id).players).filter(p => p[key] > 0).sort((a, b) => b[key] - a[key] || b.st.a - a.st.a).slice(0, n);
}

/* ---------- puchary europejskie ---------- */
function countryRanking() { return Object.values(S.countries).map(c => ({ cc: c.code, tot: sum(c.coef), last: c.coef[4] })).sort((a, b) => b.tot - a.tot); }
const clubCoef = id => sum(S.ccoef[id] || [0]);
function allocateEurope() {
  const rank = countryRanking();
  const eps = rank.slice().sort((a, b) => b.last - a.last).slice(0, 2).map(r => r.cc);
  const CL = [], EL = [], ECL = [], clPool = [], elPool = [], eclPool = [], used = new Set();
  const strength = id => club(id).rep + clubCoef(id) * 0.3;
  const tableOf = cc => { const top = S.countries[cc].leagues[0]; return (S.lastTables[top] || S.leagues[top].clubs).filter(id => club(id).lg === top || S.leagues[top].clubs.includes(id)); };
  const W = S.lastWinners;
  for (const w of [W.CL, W.EL]) if (w != null && !used.has(w)) { CL.push(w); used.add(w); }
  if (W.ECL != null && !used.has(W.ECL)) { EL.push(W.ECL); used.add(W.ECL); }
  rank.forEach((r, i) => {
    const order = tableOf(r.cc).filter(id => !used.has(id));
    const q = i < 4 ? [4, 2, 1] : i < 6 ? [3, 2, 1] : i < 10 ? [2, 2, 1] : [1, 1, 1];
    if (eps.includes(r.cc)) q[0]++;
    let k = 0; const take = () => { const id = order[k++]; if (id != null) used.add(id); return id; };
    for (let j = 0; j < q[0]; j++) { const id = take(); if (id != null) (i < 10 ? CL : clPool).push(id); }
    for (let j = 0; j < q[1]; j++) { const id = take(); if (id != null) (i < 15 ? EL : elPool).push(id); }
    for (let j = 0; j < q[2]; j++) { const id = take(); if (id != null) ECL.push(id); }
    if (i >= 4) { const id = take(); if (id != null) eclPool.push(id); }
  });
  const fill = (list, pool, n, losers) => {
    pool = pool.filter(id => !list.includes(id));
    while (list.length < n && pool.length) { const w = wpick(pool, id => Math.pow(strength(id), 3)); list.push(w); pool = pool.filter(x => x !== w); }
    while (list.length > n) { const worst = list.slice().sort((a, b) => strength(a) - strength(b))[0]; list.splice(list.indexOf(worst), 1); pool.push(worst); }
    if (losers) losers.push(...pool);
  };
  fill(CL, clPool, 36, elPool); fill(EL, elPool, 36, eclPool); fill(ECL, eclPool, 36, null);
  for (const r of rank) { if (ECL.length >= 36) break; const extra = tableOf(r.cc).find(id => !CL.includes(id) && !EL.includes(id) && !ECL.includes(id)); if (extra != null) ECL.push(extra); }
  S.cpts = {}; for (const r of rank) S.cpts[r.cc] = { pts: 0, n: 0 };
  S.euro = {};
  for (const [id, list, pots] of [['CL', CL, 4], ['EL', EL, 4], ['ECL', ECL, 6]]) {
    const teams = list.slice().sort((a, b) => (b === W[id] ? 1 : 0) - (a === W[id] ? 1 : 0) || clubCoef(b) - clubCoef(a));
    for (const t of teams) S.cpts[club(t).cc].n++;
    S.euro[id] = { id, name: COMP_NAME[id], teams, lp: genLeaguePhase(teams, pots), ko: {}, champion: null };
  }
}
function genLeaguePhase(teams, nPots) {
  const size = teams.length / nPots;
  const basePots = Array.from({ length: nPots }, (_, i) => teams.slice(i * size, (i + 1) * size));
  let best = null, bestConf = 1e9;
  for (let attempt = 0; attempt < 300; attempt++) {
    const P = basePots.map(shuffle), rounds = [];
    const mk = (h, a) => ({ h, a, hg: 0, ag: 0, p: 0 });
    if (nPots === 4) {
      for (const grp of [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]]) {
        const s1 = ri(0, 8); let s2 = ri(0, 8); while (s2 === s1) s2 = ri(0, 8);
        for (const [s, homeLow] of [[s1, true], [s2, false]]) {
          const rd = [];
          for (const [i, j] of grp) for (let k = 0; k < 9; k++) { const a = P[i][k], b = P[j][(k + s) % 9]; rd.push(homeLow ? mk(a, b) : mk(b, a)); }
          rounds.push(rd);
        }
      }
      const r7 = [], r8 = [];
      for (let i = 0; i < 4; i++) { const c = P[i]; for (let k = 0; k < 8; k += 2) r7.push(mk(c[k], c[k + 1])); for (let k = 1; k < 9; k += 2) r8.push(mk(c[k], c[k + 1])); }
      r7.push(mk(P[0][8], P[1][8]), mk(P[3][8], P[2][8])); r8.push(mk(P[2][0], P[0][0]), mk(P[1][0], P[3][0]));
      rounds.push(r7, r8);
    } else {
      const F = [[[0, 1], [2, 3], [4, 5]], [[0, 2], [1, 4], [3, 5]], [[0, 3], [1, 5], [2, 4]], [[0, 4], [1, 3], [2, 5]], [[0, 5], [1, 2], [3, 4]]];
      for (const grp of F) { const s = ri(0, 5), rd = []; for (const [i, j] of grp) for (let k = 0; k < 6; k++) { const a = P[i][k], b = P[j][(k + s) % 6]; rd.push(k % 2 ? mk(a, b) : mk(b, a)); } rounds.push(rd); }
      const rd = []; for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k += 2) rd.push(mk(P[i][k], P[i][k + 1])); rounds.push(rd);
    }
    const seen = new Set(); let dup = false, conf = 0;
    for (const rd of rounds) for (const f of rd) { const key = Math.min(f.h, f.a) + '-' + Math.max(f.h, f.a); if (seen.has(key)) dup = true; seen.add(key); if (club(f.h).cc === club(f.a).cc) conf++; }
    if (dup) continue;
    if (conf < bestConf) { bestConf = conf; best = rounds; }
    if (conf === 0) break;
  }
  return shuffle(best);
}
function lpTable(comp) {
  const rows = {}; comp.teams.forEach(id => rows[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  for (const rd of comp.lp) for (const f of rd) {
    if (!f.p) continue; const H = rows[f.h], A = rows[f.a];
    H.P++; A.P++; H.GF += f.hg; H.GA += f.ag; A.GF += f.ag; A.GA += f.hg;
    if (f.hg > f.ag) { H.W++; A.L++; H.Pts += 3; } else if (f.hg < f.ag) { A.W++; H.L++; A.Pts += 3; } else { H.D++; A.D++; H.Pts++; A.Pts++; }
  }
  const out = Object.values(rows).sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || clubCoef(b.id) - clubCoef(a.id));
  out.forEach((r, i) => r.pos = i + 1);
  return out;
}
const tie = (a, b) => ({ a, b, m1: null, m2: null, w: null });
function ensureKO(comp, st) {
  if (comp.ko[st]) return comp.ko[st];
  const T = lpTable(comp).map(r => r.id);
  const win = x => x.map(t => t.w);
  const rnd2 = (x, y) => rnd() < 0.5 ? tie(x, y) : tie(y, x);
  if (st === 'PO') comp.ko.PO = Array.from({ length: 8 }, (_, i) => tie(T[23 - i], T[8 + i]));
  else if (st === 'R16') { const po = win(ensureKO(comp, 'PO')); comp.ko.R16 = Array.from({ length: 8 }, (_, s) => tie(po[7 - s], T[s])); }
  else if (st === 'QF') { const w = win(comp.ko.R16); comp.ko.QF = [rnd2(w[0], w[7]), rnd2(w[3], w[4]), rnd2(w[1], w[6]), rnd2(w[2], w[5])]; }
  else if (st === 'SF') { const w = win(comp.ko.QF); comp.ko.SF = [rnd2(w[0], w[1]), rnd2(w[2], w[3])]; }
  else if (st === 'F') { const w = win(comp.ko.SF); comp.ko.F = [tie(w[0], w[1])]; }
  return comp.ko[st];
}
const PRIZE = {
  CL: { part: 18.6e6, win: 2.1e6, draw: 7e5, PO: 1e6, R16: 11e6, QF: 12.5e6, SF: 15e6, F: 18.5e6, champ: 6.5e6 },
  EL: { part: 4.3e6, win: 4.5e5, draw: 1.5e5, PO: 3e5, R16: 1.75e6, QF: 2.5e6, SF: 2.8e6, F: 7e6, champ: 6e6 },
  ECL: { part: 3.2e6, win: 4e5, draw: 1.33e5, PO: 2e5, R16: 8e5, QF: 1.3e6, SF: 2.5e6, F: 7e6, champ: 5e6 },
};
const BONUS = { CL: { part: 6, R16: 1.5, QF: 1.5, SF: 1.5, F: 1.5 }, EL: { part: 1, R16: 1, QF: 1, SF: 1, F: 1 }, ECL: { part: 0.5, R16: 0.5, QF: 0.5, SF: 0.5, F: 0.5 } };
function euroPts(id, pts) { S.ccoef[id][4] = Math.round((S.ccoef[id][4] + pts) * 100) / 100; S.cpts[club(id).cc].pts += pts; }
function euroMoney(id, amount, label) { const c = club(id); c.bal += amount; c.fin.inc += amount; if (id === S.user) c.tb += Math.round(amount * 0.5); }
function euroResult(comp, h, a, hg, ag) {
  const P = PRIZE[comp];
  if (hg > ag) { euroPts(h, 2); euroMoney(h, P.win); } else if (hg < ag) { euroPts(a, 2); euroMoney(a, P.win); }
  else { euroPts(h, 1); euroPts(a, 1); euroMoney(h, P.draw); euroMoney(a, P.draw); }
}
function reachStage(comp, id, st) { const B = BONUS[comp][st]; if (B) euroPts(id, B); const P = PRIZE[comp][st]; if (P) euroMoney(id, P); }

/* ---------- reprezentacje ---------- */
const natLevel = n => 44 + n.str * 0.45;
function ntTeam(code) {
  const st = S.ntTeams[code], n = NAT[code];
  if (!st.sq.length || !S.nt || code !== S.nt) st.sq = autoCallup(code);
  return { id: 'N' + code, nation: code, name: n.name, short: code, col: ncol(code), rep: n.str, players: st.sq.map(pget).filter(Boolean), formation: st.formation, lineup: st.lineup, bench: st.bench, ment: st.ment, _st: st };
}
function syncNT(t) { if (t && t._st) { t._st.lineup = t.lineup; t._st.bench = t.bench; t._st.formation = t.formation; t._st.ment = t.ment; } }
function autoCallup(code) {
  const pool = (NATIDX.get(code) || []).filter(p => isAvail(p)).sort((a, b) => b.ovr - a.ovr);
  const need = { GK: 3, DEF: 8, MID: 7, ATT: 5 }, out = [];
  for (const [line, n] of Object.entries(need)) out.push(...pool.filter(p => LINE[p.pos] === line).slice(0, n));
  for (const p of pool) { if (out.length >= 23) break; if (!out.includes(p)) out.push(p); }
  return out.map(p => p.id);
}
function buildNTComps() {
  const uefa = NATIONS.filter(n => n.conf === 'UEFA').sort((a, b) => b.str - a.str).slice(0, 32);
  const pots = [0, 1, 2, 3].map(i => shuffle(uefa.slice(i * 8, i * 8 + 8)));
  const groups = Array.from({ length: 8 }, (_, g) => {
    const teams = pots.map(p => p[g].code);
    const f = makeFixtures(teams); return { teams, fix: f };
  });
  const inQ = new Set(uefa.map(n => n.code));
  const others = NATIONS.filter(n => !inQ.has(n.code)).map(n => n.code);
  const fr = Array.from({ length: 8 }, (_, md) => { const pool = shuffle(md >= 6 ? NATIONS.map(n => n.code) : others); const out = []; for (let i = 0; i + 1 < pool.length; i += 2) out.push({ h: pool[i], a: pool[i + 1], hg: 0, ag: 0, p: 0 }); return out; });
  S.ntc = { type: tournamentType(S.season), groups, fr, tourn: null };
}
function ntGroupTable(g) {
  const rows = {}; g.teams.forEach(c => rows[c] = { id: c, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 });
  const fix = g.fix.flat ? g.fix.flat() : g.fix;
  for (const f of fix) { if (!f.p) continue; const H = rows[f.h], A = rows[f.a]; H.P++; A.P++; H.GF += f.hg; H.GA += f.ag; A.GF += f.ag; A.GA += f.hg; if (f.hg > f.ag) { H.W++; A.L++; H.Pts += 3; } else if (f.hg < f.ag) { A.W++; H.L++; A.Pts += 3; } else { H.D++; A.D++; H.Pts++; A.Pts++; } }
  const out = Object.values(rows).sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || NAT[b.id].str - NAT[a.id].str);
  out.forEach((r, i) => r.pos = i + 1); return out;
}
function ensureTournament() {
  const nc = S.ntc; if (nc.tourn) return nc.tourn;
  const tabs = nc.groups.map(ntGroupTable);
  if (nc.type === 'NLF') {
    const wins = tabs.map(t => t[0]).sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA)).slice(0, 4).map(r => r.id);
    nc.tourn = { type: 'NLF', name: 'Liga Narodów – turniej finałowy', teams: wins, groups: [], ko: { SF: [tie(wins[0], wins[3]), tie(wins[1], wins[2])] } };
  } else {
    let teams = tabs.flatMap(t => [t[0].id, t[1].id]);
    if (nc.type === 'WC') teams = teams.concat(NATIONS.filter(n => n.conf !== 'UEFA').sort((a, b) => b.str - a.str).slice(0, 16).map(n => n.code));
    const ng = teams.length / 4, sorted = teams.slice().sort((a, b) => NAT[b].str - NAT[a].str);
    const pots = [0, 1, 2, 3].map(i => shuffle(sorted.slice(i * ng, (i + 1) * ng)));
    const groups = Array.from({ length: ng }, (_, g) => { const t = pots.map(p => p[g]); return { teams: t, fix: [[mkF(t[0], t[1]), mkF(t[2], t[3])], [mkF(t[0], t[2]), mkF(t[3], t[1])], [mkF(t[3], t[0]), mkF(t[1], t[2])]] }; });
    nc.tourn = { type: nc.type, name: nc.type === 'EURO' ? `Mistrzostwa Europy ${S.season + 1}` : `Mistrzostwa Świata ${S.season + 1}`, teams, groups, ko: {} };
  }
  return nc.tourn;
}
const mkF = (h, a) => ({ h, a, hg: 0, ag: 0, p: 0 });
function ensureTKO(t, st) {
  if (t.ko[st]) return t.ko[st];
  const tabs = t.groups.map(ntGroupTable), w = x => x.map(k => k.w);
  if (st === 'R16') { t.ko.R16 = []; for (let g = 0; g < 8; g += 2) t.ko.R16.push(tie(tabs[g][0].id, tabs[g + 1][1].id), tie(tabs[g + 1][0].id, tabs[g][1].id)); }
  else if (st === 'QF') {
    if (t.type === 'EURO') t.ko.QF = [tie(tabs[0][0].id, tabs[1][1].id), tie(tabs[1][0].id, tabs[0][1].id), tie(tabs[2][0].id, tabs[3][1].id), tie(tabs[3][0].id, tabs[2][1].id)];
    else { const r = w(t.ko.R16); t.ko.QF = [tie(r[0], r[2]), tie(r[1], r[3]), tie(r[4], r[6]), tie(r[5], r[7])]; }
  } else if (st === 'SF') { const r = w(t.ko.QF); t.ko.SF = [tie(r[0], r[1]), tie(r[2], r[3])]; }
  else if (st === 'F') { const r = w(t.ko.SF); t.ko.F = [tie(r[0], r[1])]; }
  return t.ko[st];
}

/* ---------- mecze dnia ---------- */
function emergencyFor(t) {
  return pos => { const p = genPlayer(pos, clubLevel(t.rep) - 12, S.countries[t.cc].nat, { age: 18, con: 1 }); p.wage = 500; t.players.push(p); p.tid = t.id; PM.set(p.id, p); PALL.push(p); return p; };
}
function dayMatches(d) {
  const out = [];
  const clubDesc = (h, a, opts, done) => out.push({ h: club(h), a: club(a), opts: { ...opts, emergency: null }, done, user: h === S.user || a === S.user ? (h === S.user ? 'h' : 'a') : null });
  if (d.t === 'L') {
    for (const lg of Object.values(S.leagues)) {
      const r = lg.lsMap[d.ls]; if (r == null || r < 0) continue;
      for (const f of lg.fix[r]) clubDesc(f.h, f.a, { comp: 'L', label: lg.name }, m => {
        f.hg = m.home.goals; f.ag = m.away.goals; f.p = 1;
        const c = club(f.h), fill = clamp(0.55 + c.rep / 250 + (S.leagues[c.lg].tier === 1 ? 0.05 : 0), 0.3, 1);
        const gate = Math.round(c.cap * fill * c.price); c.bal += gate; c.fin.inc += gate; c._gate = gate;
      });
    }
  } else if (d.t === 'E') {
    for (const comp of Object.values(S.euro)) {
      const lbl = `${comp.name} • ${STAGE_NAME[d.st]}`;
      if (d.st === 'LP') {
        const rd = comp.lp[d.md]; if (!rd) continue;
        for (const f of rd) clubDesc(f.h, f.a, { comp: comp.id, label: `${lbl} ${d.md + 1}/${comp.lp.length}` }, m => { f.hg = m.home.goals; f.ag = m.away.goals; f.p = 1; euroResult(comp.id, f.h, f.a, f.hg, f.ag); });
      } else if (d.st === 'F') {
        const t = ensureKO(comp, 'F')[0];
        clubDesc(t.a, t.b, { comp: comp.id, label: `Finał – ${comp.name}`, neutral: true, ko: { aggH: 0, aggA: 0 } }, m => finishTie(comp, 'F', t, m, true));
      } else {
        for (const t of ensureKO(comp, d.st)) {
          if (d.leg === 1) clubDesc(t.a, t.b, { comp: comp.id, label: `${lbl} – 1. mecz` }, m => { t.m1 = { hg: m.home.goals, ag: m.away.goals }; euroResult(comp.id, t.a, t.b, t.m1.hg, t.m1.ag); });
          else clubDesc(t.b, t.a, { comp: comp.id, label: `${lbl} – rewanż`, ko: { aggH: t.m1.ag, aggA: t.m1.hg } }, m => finishTie(comp, d.st, t, m, false));
        }
      }
    }
  } else if (d.t === 'N') {
    const nc = S.ntc;
    const ntDesc = (f, label, comp) => out.push({ h: ntTeam(f.h), a: ntTeam(f.a), opts: { comp, label }, user: f.h === S.nt ? 'h' : f.a === S.nt ? 'a' : null, nt: true, done: m => { f.hg = m.home.goals; f.ag = m.away.goals; f.p = 1; } });
    if (d.md < 6) nc.groups.forEach((g, gi) => g.fix[d.md].forEach(f => ntDesc(f, `${nc.type === 'NLF' ? 'Liga Narodów' : 'Eliminacje'} • grupa ${'ABCDEFGH'[gi]}`, 'N')));
    (nc.fr[d.md] || []).forEach(f => ntDesc(f, 'Mecz towarzyski', 'F'));
  } else if (d.t === 'T') {
    const T = ensureTournament();
    const ntDesc = (h, a, label, done, ko) => out.push({ h: ntTeam(h), a: ntTeam(a), opts: { comp: 'T', label, neutral: true, ko }, user: h === S.nt ? 'h' : a === S.nt ? 'a' : null, nt: true, done });
    if (d.st === 'G') T.groups.forEach((g, gi) => g.fix[d.md].forEach(f => ntDesc(f.h, f.a, `${T.name} • grupa ${'ABCDEFGH'[gi]}`, m => { f.hg = m.home.goals; f.ag = m.away.goals; f.p = 1; })));
    else for (const t of ensureTKO(T, d.st)) ntDesc(t.a, t.b, `${T.name} • ${STAGE_NAME[d.st]}`, m => { t.m = { hg: m.home.goals, ag: m.away.goals, pens: m.pens }; t.w = m.winner === 'h' ? t.a : t.b; if (d.st === 'F') T.champion = t.w; }, { aggH: 0, aggA: 0 });
  }
  for (const x of out) if (!x.nt) x.opts.emergency = emergencyFor(x.h.id === S.user ? x.h : x.a.id === S.user ? x.a : x.h);
  return out;
}
function finishTie(comp, st, t, m, single) {
  if (single) { t.m1 = { hg: m.home.goals, ag: m.away.goals, pens: m.pens }; t.w = m.winner === 'h' ? t.a : t.b; euroResult(comp.id, t.a, t.b, m.home.goals, m.away.goals); }
  else { t.m2 = { hg: m.home.goals, ag: m.away.goals, pens: m.pens, et: m.et }; t.w = m.winner === 'h' ? t.b : t.a; euroResult(comp.id, t.b, t.a, m.home.goals, m.away.goals); }
  const next = { PO: 'R16', R16: 'QF', QF: 'SF', SF: 'F' }[st];
  if (next) reachStage(comp.id, t.w, next);
  if (st === 'F') { comp.champion = t.w; reachStage(comp.id, t.w, 'champ'); euroMoney(t.w, PRIZE[comp.id].champ); }
}
function userMatchToday() {
  if (S.day >= S.cal.length) return null;
  return dayMatches(curDay()).find(x => x.user) || null;
}
function hasUserMatchToday() { return !!userMatchToday(); }

/* ---------- przetwarzanie dnia ---------- */
function processDay(live) {
  const d = curDay(), ut = userClub();
  recover(d.gap);
  const list = dayMatches(d);
  let userRes = null;
  for (const x of list) {
    let m;
    if (live && x.user) m = live;
    else { m = simulate(x.h, x.a, x.opts); }
    if (x.nt) { syncNT(m.home.t); syncNT(m.away.t); }
    x.done(m);
    if (x.user) userRes = { m, x };
    if (!x.nt && (x.h.id === S.user || x.a.id === S.user)) afterUserClubMatch(m, x);
  }
  if (d.t === 'L') weekly(d);
  if (d.t === 'E' && d.st === 'LP' && d.md === 7) for (const c of Object.values(S.euro)) lpBonus(c);
  if (d.t === 'E' && d.st === 'LP' && d.md === 5 && S.euro.ECL) lpBonus(S.euro.ECL);
  S.day++;
  let summary = null;
  if (S.day >= S.cal.length) summary = endSeason();
  return { userRes, summary, day: d };
}
function lpBonus(c) {
  if (c._lpDone) return; if (c.lp.some(rd => rd.some(f => !f.p))) return;
  c._lpDone = true;
  const t = lpTable(c);
  t.forEach(r => { if (r.pos <= 8) reachStage(c.id, r.id, 'R16'); else if (r.pos <= 24) reachStage(c.id, r.id, 'PO'); });
  if (t.some(r => r.id === S.user)) {
    const r = t.find(x => x.id === S.user);
    msg(`${c.name}: koniec fazy ligowej`, r.pos <= 8 ? `Zajęliśmy ${r.pos}. miejsce – bezpośredni awans do 1/8 finału!` : r.pos <= 24 ? `Zajęliśmy ${r.pos}. miejsce – zagramy w barażach o 1/8 finału.` : `Zajęliśmy ${r.pos}. miejsce i odpadamy z rozgrywek.`);
  }
}
function recover(gap) {
  const ut = userClub();
  for (const p of PALL) {
    const c = p.tid >= 0 ? S.clubs[p.tid] : null;
    const rate = 2.0 + (c && c.training === 'fit' ? 0.5 : 0);
    p.fit = Math.min(100, p.fit + gap * rate * (p.inj ? 1.4 : 1));
    if (p.inj) { p.inj = Math.max(0, p.inj - gap); if (!p.inj && c === ut) msg('Powrót do zdrowia', `${p.n} wrócił do pełnej sprawności.`); }
  }
}
function afterUserClubMatch(m, x) {
  const mine = x.user === 'h' ? m.home : m.away, opp = x.user === 'h' ? m.away : m.home;
  const gd = mine.goals - opp.goals;
  let d = gd > 0 ? 2 : gd < 0 ? -2.5 : 0;
  d += clamp((opp.t.rep - mine.t.rep) / 25, -1, 1) * (gd > 0 ? 1 : gd < 0 ? -0.6 : 0.5);
  if (m.comp !== 'L') d *= 0.6;
  S.board.conf = clamp(S.board.conf + d, 0, 100);
  for (const e of m.ev) if (e.type === 'injury' && e.side === x.user) msg('Kontuzja', e.text.replace('🚑 ', ''));
}

/* ---------- tydzień ---------- */
function weekly(d) {
  const ut = userClub();
  for (const c of S.clubs) {
    const wages = sum(c.players.map(p => p.wage)) + (c.id === S.user ? sum(S.scouts.map(s => s.cost)) : 0);
    const inc = c.tv + c.spons;
    c.bal += inc - wages; c.fin.inc += inc; c.fin.exp += wages;
    if (c.id === S.user) { c.lastFin = { gate: c._gate || 0, tv: c.tv, spons: c.spons, wages, net: inc + (c._gate || 0) - wages }; c.tb += Math.round((inc + (c._gate || 0) - wages) * 0.25); }
    c._gate = 0;
    const ranked = c.players.slice().sort((a, b) => b.ovr - a.ovr);
    const fac = c.id === S.user ? 0.8 + 0.15 * S.fac.train : 0.8 + c.rep / 250;
    const focus = { att: 'ATT', def: 'DEF', bal: 'MID' }[c.training];
    ranked.forEach((p, i) => {
      const exp = i < 5 ? 0.8 : i < 12 ? 0.6 : i < 18 ? 0.3 : 0.1;
      p.mor = clamp(p.mor + (p.pt - exp) * 5 + (62 - p.mor) * 0.05 - (p.listed ? 1 : 0) - (p.con <= 1 && d.ls > 25 && c.id === S.user ? 0.5 : 0), 0, 100);
      p.shp = Math.max(20, p.shp - 4);
      p.form = Math.round(p.form + (50 - p.form) * 0.04);
      let ch = p.age <= 20 ? 0.06 : p.age <= 23 ? 0.04 : p.age <= 26 ? 0.015 : p.age <= 29 ? 0.004 : 0;
      ch *= fac * (0.6 + 0.8 * clamp(p.pt, 0, 1)) * (focus && (LINE[p.pos] === focus || (focus === 'DEF' && p.pos === 'GK')) ? 1.5 : 1);
      if (p.loan && p.tid !== p.loan.from) ch *= 1.2;
      if (ch && p.ovr < p.pot && rnd() < ch) { develop(p, 1); p.val = calcValue(p); }
      if (p.age >= 31 && rnd() < 0.012 * (p.age - 30)) { develop(p, -1); p.val = calcValue(p); }
    });
  }
  for (const p of S.virt) { p.shp = 70; p.mor = 65; }
  scoutingWeek();
  if (windowOpen()) { genOffers(); aiTransfers(); }
  if (d.ls === 30) { const exp = ut.players.filter(p => p.con <= 1 && !p.loan); if (exp.length) msg('Kontrakty wygasają', `Z końcem sezonu wygasają kontrakty: ${exp.map(shortName).join(', ')}. Przedłuż je w karcie zawodnika.`); }
  if (d.ls === 4) msg('Okno zamknięte', 'Letnie okno transferowe zostało zamknięte. Wolnych agentów możesz podpisywać zawsze.');
  if (d.ls === 20) msg('Zimowe okno transferowe', 'Otwiera się zimowe okno transferowe (do kolejki 24).');
  if (d.ls % 5 === 4) S.board.conf = clamp(S.board.conf + clamp(S.board.target - leaguePos(ut), -4, 4) * 1.3, 0, 100);
  if (ut.bal < -5e6) S.board.conf = clamp(S.board.conf - 1, 0, 100);
  if (d.ls >= 10 && S.board.conf <= 12) S.sacked = true;
}

/* ---------- skauting ---------- */
const hashN = id => ((id * 2654435761) >>> 0) % 1000 / 1000;
function baseKnow(p) {
  const ut = userClub();
  if (p.tid === S.user) return 100;
  let k = 15;
  const c = clubOf(p);
  if (c) { if (c.lg === ut.lg) k = 75; else if (c.cc === ut.cc) k = 50; if (c.rep >= 85) k = Math.max(k, 60); }
  if (p.ovr >= 84) k = Math.max(k, 80); else if (p.ovr >= 80) k = Math.max(k, 60);
  if (S.nt && p.nat === S.nt) k = Math.max(k, 65);
  return k;
}
const know = p => Math.max(S.know[p.id] || 0, baseKnow(p));
function ovrRange(p, potential) {
  const k = know(p), v = potential ? p.pot : p.ovr;
  if (k >= 95) return [v, v];
  const w = Math.round((100 - k) / (potential ? 9 : 12)) + 1;
  const c = v + Math.round((hashN(p.id + (potential ? 7 : 0)) - 0.5) * (100 - k) / 12);
  return [clamp(c - w, 30, 99), clamp(c + w, 30, 99)];
}
const ovrEst = p => { const r = ovrRange(p); return Math.round((r[0] + r[1]) / 2); };
function scoutReport(p, s) {
  const err = (20 - s.ab) / 3;
  const eo = Math.round(p.ovr + gauss() * err * 0.5), ep = Math.round(Math.max(p.pot, p.ovr) + gauss() * err);
  const ut = userClub(), starters = ut.lineup.map(pget).filter(Boolean);
  const same = starters.filter(x => LINE[x.pos] === LINE[p.pos]).map(x => x.ovr);
  const ref = same.length ? Math.min(...same) : teamLevel(ut);
  const score = (eo - ref) + Math.max(0, ep - eo) * (p.age <= 23 ? 0.5 : 0.1);
  const grade = score >= 8 ? 'A+' : score >= 4 ? 'A' : score >= 0 ? 'B' : score >= -5 ? 'C' : 'D';
  const txt = { 'A+': 'Zdecydowanie polecam – natychmiastowe wzmocnienie.', A: 'Polecam – wyraźnie podniesie poziom zespołu.', B: 'Solidny zawodnik, wartościowe uzupełnienie kadry.', C: 'Raczej zmiennik lub inwestycja na przyszłość.', D: 'Nie spełnia oczekiwań klubu.' }[grade];
  return { pid: p.id, season: S.season, date: curDay() ? curDay().date : 0, eo, ep, grade, txt, scout: s.name };
}
function scoutingWeek() {
  for (const s of S.scouts) {
    const t = s.task; if (!t) continue;
    if (t.k === 'player') {
      t.left -= 7; const p = pget(t.pid);
      if (!p) { s.task = null; continue; }
      if (t.left <= 0) { S.know[p.id] = 100; S.reports.unshift(scoutReport(p, s)); s.task = null; msg('Raport skauta', `${s.name} zakończył obserwację: ${p.n} (${POS_PL[p.pos]}, ${clubName(p)}).`); }
    } else {
      t.weeks--;
      const pool = PALL.filter(p => p.tid !== S.user && p.tid !== -2 && (!t.cc || (p.tid >= 0 && club(p.tid).cc === t.cc)) && (!t.nat || p.nat === t.nat) && (!t.pos || p.pos === t.pos) && (!t.maxAge || p.age <= t.maxAge) && (S.know[p.id] || 0) < 80);
      const err = (20 - s.ab) / 3;
      const scored = pool.map(p => ({ p, e: (t.maxAge && t.maxAge <= 21 ? p.pot * 1.2 + p.ovr * 0.3 : p.ovr + Math.max(0, p.pot - p.ovr) * 0.4) + gauss() * err })).filter(x => !t.minPot || x.p.pot + gauss() * err >= t.minPot);
      scored.sort((a, b) => b.e - a.e);
      const found = scored.slice(0, ri(2, 4)).map(x => x.p);
      for (const p of found) { S.know[p.id] = Math.max(S.know[p.id] || 0, 55 + s.ab * 2); S.reports.unshift(scoutReport(p, s)); }
      if (t.weeks <= 0) { s.task = null; msg('Skauting zakończony', `${s.name} zakończył misję skautingową.`); }
    }
  }
  if (S.reports.length > 80) S.reports.length = 80;
}
function assignScout(sid, task) {
  const s = S.scouts.find(x => x.id === sid); if (!s) return;
  if (task.k === 'player') { const p = pget(task.pid); const c = clubOf(p); task.left = c && c.cc === userClub().cc ? 7 : 14; }
  else task.weeks = task.weeks || 4;
  s.task = task; saveSoon();
}
function hireScout(id) {
  if (S.scouts.length >= 5) return { ok: false, msg: 'Maksymalnie 5 skautów.' };
  const s = S.scoutMarket.find(x => x.id === id); if (!s) return { ok: false, msg: 'Niedostępny.' };
  S.scoutMarket = S.scoutMarket.filter(x => x !== s); S.scouts.push(s); S.scoutMarket.push(genScout()); saveSoon();
  return { ok: true, msg: `Zatrudniono skauta ${s.name}.` };
}
function fireScout(id) { S.scouts = S.scouts.filter(s => s.id !== id); saveSoon(); }

/* ---------- transfery ---------- */
function playerStatus(p) {
  const c = clubOf(p); if (!c) return 'Wolny';
  const i = c.players.slice().sort((a, b) => b.ovr - a.ovr).indexOf(p);
  return i < 5 ? 'Kluczowy' : i < 12 ? 'Podstawowy' : i < 18 ? 'Rotacyjny' : p.age <= 21 ? 'Perspektywiczny' : 'Rezerwowy';
}
function askPrice(p) {
  const st = playerStatus(p);
  const r = p.val * (1 + 0.05 * p.con + (st === 'Kluczowy' ? 0.2 : st === 'Podstawowy' ? 0.08 : 0));
  const step = r >= 1e7 ? 5e5 : r >= 1e6 ? 5e4 : 1e4;
  return Math.round(r / step) * step;
}
function notForSale(p) { const c = clubOf(p); return c && c.rep >= userClub().rep && playerStatus(p) === 'Kluczowy'; }
function clubResponse(p, fee) {
  const ut = userClub(), c = clubOf(p);
  if (!windowOpen()) return { res: 'reject', msg: 'Okno transferowe jest zamknięte.' };
  if (fee > ut.tb) return { res: 'reject', msg: 'Przekraczasz budżet transferowy.' };
  if (fee > ut.bal) return { res: 'reject', msg: 'Brak środków na koncie klubu.' };
  if (c.players.length <= 18) return { res: 'reject', msg: `${c.name} nie sprzeda zawodnika – zbyt wąska kadra.` };
  if (p.loan) return { res: 'reject', msg: 'Zawodnik jest wypożyczony.' };
  const ask = askPrice(p);
  if (notForSale(p) && fee < p.val * 1.8) return { res: 'reject', msg: `${c.name}: „Ten zawodnik nie jest na sprzedaż.” (chyba że za ok. ${money(Math.round(p.val * 1.8 / 5e5) * 5e5)})` };
  if (fee >= ask) return { res: 'accept', msg: `${c.name} akceptuje ofertę ${money(fee)}.` };
  if (fee >= ask * 0.75) return { res: 'counter', counter: ask, msg: `${c.name} składa kontrofertę: ${money(ask)}.` };
  return { res: 'reject', msg: `${c.name} odrzuca ofertę – zdecydowanie za mało.` };
}
function wageDemand(p) {
  const ut = userClub(), c = clubOf(p);
  const base = calcWage(p, Math.max(ut.rep, c ? c.rep : 50));
  const f = 1 + Math.max(0, (c ? c.rep : 50) - ut.rep) / 50;
  return Math.round(base * f * (p.age > 30 ? 0.9 : 1) / 100) * 100;
}
function playerInterest(p) {
  const ut = userClub(), c = clubOf(p);
  if (c && c.rep - ut.rep > 14) return { ok: false, msg: `${p.n} nie chce przejść do słabszego klubu.` };
  if (p.ovr > teamLevel(ut) + 11) return { ok: false, msg: `${p.n} uważa, że Twój klub nie spełnia jego ambicji.` };
  return { ok: true };
}
function personalTerms(p, wage, years) {
  const dem = wageDemand(p);
  if (wage >= dem || (wage >= dem * 0.92 && rnd() < 0.5)) return { ok: true };
  return { ok: false, msg: `${p.n} odrzuca warunki – oczekuje ok. ${money(dem)}/tydz.` };
}
function detach(p) {
  const c = clubOf(p);
  if (c) { c.players = c.players.filter(x => x !== p); c.lineup = c.lineup.filter(id => id !== p.id); c.bench = c.bench.filter(id => id !== p.id); }
  else if (p.tid === -1) S.free = S.free.filter(x => x !== p);
  S.offers = S.offers.filter(o => o.pid !== p.id);
}
function attach(p, c) { c.players.push(p); p.tid = c.id; p.listed = false; }
function completeTransfer(pid, fee, wage, years) {
  const p = pget(pid), ut = userClub(), seller = clubOf(p);
  detach(p);
  if (seller) { seller.bal += fee; seller.tb += fee; seller.fin.tr += fee; refillAI(seller); }
  ut.bal -= fee; ut.tb -= fee; ut.fin.tr -= fee;
  attach(p, ut); p.wage = wage; p.con = years; p.mor = clamp(p.mor + 10, 0, 100); p.pt = 0.5;
  S.know[p.id] = 100;
  rebuildIndex(); fillBench(ut);
  news(`${p.n} (${p.ovr}) przechodzi z ${seller ? seller.name : 'wolnego transferu'} do ${ut.name} za ${fee ? money(fee) : 'darmo'}.`);
  msg('Transfer zakończony', `${p.n} (${POS_PL[p.pos]}, ${p.ovr}) dołącza do klubu${fee ? ' za ' + money(fee) : ''}. Kontrakt: ${years} lat, ${money(wage)}/tydz.`);
  saveSoon();
}
function signFree(pid, wage, years) {
  const p = pget(pid), ut = userClub();
  if (!p || p.tid !== -1) return { ok: false, msg: 'Zawodnik niedostępny.' };
  if (ut.players.length >= 32) return { ok: false, msg: 'Kadra pełna (maks. 32).' };
  const i = playerInterest(p); if (!i.ok) return i;
  const t = personalTerms(p, wage, years); if (!t.ok) return t;
  completeTransfer(pid, 0, wage, years);
  return { ok: true, msg: `${p.n} podpisuje kontrakt!` };
}
function loanIn(pid) {
  const p = pget(pid), ut = userClub(), c = clubOf(p);
  if (!windowOpen()) return { ok: false, msg: 'Okno transferowe jest zamknięte.' };
  if (!c || p.loan) return { ok: false, msg: 'Zawodnik niedostępny do wypożyczenia.' };
  const st = playerStatus(p);
  if (st !== 'Rezerwowy' && st !== 'Perspektywiczny' && st !== 'Rotacyjny') return { ok: false, msg: `${c.name} nie wypożycza zawodników z podstawowego składu.` };
  if (rnd() < 0.3) return { ok: false, msg: `${c.name} odrzuca prośbę o wypożyczenie.` };
  detach(p); attach(p, ut); p.loan = { from: c.id, season: S.season }; S.know[p.id] = 100; refillAI(c);
  rebuildIndex(); fillBench(ut);
  msg('Wypożyczenie', `${p.n} dołącza na wypożyczenie z ${c.name} do końca sezonu (pensja ${money(p.wage)}/tydz.).`);
  saveSoon(); return { ok: true, msg: `${p.n} wypożyczony do końca sezonu.` };
}
function loanOut(pid) {
  const p = pget(pid), ut = userClub();
  if (!windowOpen()) return { ok: false, msg: 'Okno transferowe jest zamknięte.' };
  if (ut.players.length <= 18) return { ok: false, msg: 'Kadra zbyt wąska.' };
  if (p.loan) return { ok: false, msg: 'Zawodnik już jest wypożyczony.' };
  const cands = S.clubs.filter(c => c.id !== ut.id && c.rep <= ut.rep - 3 && Math.abs(teamLevel(c) - p.ovr) <= 6);
  if (!cands.length) return { ok: false, msg: 'Brak chętnych klubów.' };
  const c = pick(cands);
  detach(p); attach(p, c); p.loan = { from: ut.id, season: S.season }; rebuildIndex(); fillBench(ut);
  msg('Wypożyczenie', `${p.n} odchodzi na wypożyczenie do ${c.name} (${S.countries[c.cc].flag}).`);
  saveSoon(); return { ok: true, msg: `${p.n} wypożyczony do ${c.name}.` };
}
function sellTo(offerId) {
  const o = S.offers.find(x => x.id === offerId); if (!o) return { ok: false, msg: 'Oferta wygasła.' };
  const p = pget(o.pid), ut = userClub(), b = club(o.from);
  if (ut.players.length <= 16) return { ok: false, msg: 'Kadra nie może liczyć mniej niż 16 zawodników.' };
  detach(p); attach(p, b); p.con = ri(2, 5); p.wage = calcWage(p, b.rep);
  ut.bal += o.amount; ut.tb += o.amount; ut.fin.tr += o.amount; b.bal -= o.amount; b.tb -= o.amount;
  rebuildIndex(); fillBench(ut);
  news(`${p.n} (${p.ovr}) przechodzi z ${ut.name} do ${b.name} za ${money(o.amount)}.`);
  msg('Sprzedaż', `${p.n} odchodzi do ${b.name} za ${money(o.amount)}.`);
  saveSoon(); return { ok: true, msg: `Sprzedano ${p.n} za ${money(o.amount)}.` };
}
function releasePlayer(pid) {
  const p = pget(pid), ut = userClub();
  if (ut.players.length <= 16) return { ok: false, msg: 'Kadra nie może liczyć mniej niż 16 zawodników.' };
  if (p.loan) { const from = club(p.loan.from); detach(p); attach(p, from); p.loan = null; rebuildIndex(); fillBench(ut); saveSoon(); return { ok: true, msg: `${p.n} wraca do ${from.name}.` }; }
  const cost = p.wage * 20 * p.con;
  if (cost > ut.bal) return { ok: false, msg: 'Brak środków na odprawę.' };
  ut.bal -= cost; detach(p); p.tid = -1; S.free.push(p); rebuildIndex(); fillBench(ut); saveSoon();
  return { ok: true, msg: `Rozwiązano kontrakt z ${p.n} (odprawa ${money(cost)}).` };
}
function renewDemand(p, years) { return Math.round(calcWage(p, userClub().rep) * (1.05 + years * 0.03) * (p.mor < 40 ? 1.2 : 1) / 100) * 100; }
function renewContract(pid, years) {
  const p = pget(pid);
  if (p.loan) return { ok: false, msg: 'Nie można przedłużyć umowy wypożyczonego zawodnika.' };
  if (p.mor < 30 && rnd() < 0.6) return { ok: false, msg: `${p.n} jest niezadowolony i odrzuca rozmowy o kontrakcie.` };
  if (p.ovr > teamLevel(userClub()) + 6 && p.age < 29 && rnd() < 0.35) return { ok: false, msg: `${p.n} chce poczekać na oferty większych klubów.` };
  p.wage = renewDemand(p, years); p.con = years; p.mor = clamp(p.mor + 6, 0, 100); saveSoon();
  return { ok: true, msg: `${p.n} przedłużył kontrakt o ${years} l. (${money(p.wage)}/tydz.).` };
}
function talkTo(pid, kind) {
  const p = pget(pid);
  if (p._talk === S.day) return { ok: false, msg: 'Rozmawiałeś już dziś z tym zawodnikiem.' };
  p._talk = S.day;
  let d;
  if (kind === 'praise') d = p.form >= 55 ? ri(4, 8) : ri(-2, 3);
  else if (kind === 'crit') d = p.form < 45 ? ri(-3, 6) : ri(-8, -2);
  else d = p.pt < 0.4 ? ri(2, 6) : ri(-1, 3);
  p.mor = clamp(p.mor + d, 0, 100); if (kind === 'crit' && d > 0) p.form = clamp(p.form + 5, 0, 100);
  saveSoon();
  return { ok: true, msg: d > 0 ? `${p.n} reaguje pozytywnie (morale +${d}).` : `${p.n} jest niezadowolony (morale ${d}).` };
}
function refillAI(c) {
  if (c.id === S.user) return;
  const cnt = line => c.players.filter(p => LINE[p.pos] === line).length;
  const posFor = { GK: ['GK'], DEF: ['CB', 'LB', 'RB'], MID: ['CDM', 'CM', 'CAM'], ATT: ['ST', 'LW', 'RW'] };
  for (const [line, n] of [['GK', 3], ['DEF', 7], ['MID', 7], ['ATT', 4]]) while (cnt(line) < n) { const p = squadPlayer(c, pick(posFor[line]), 2); c.players.push(p); }
  while (c.players.length < 22) c.players.push(squadPlayer(c, pick(POSITIONS.slice(1)), 2));
  while (c.players.length > (c.id === S.user ? 99 : 28)) { const w = c.players.slice().sort((a, b) => a.ovr - b.ovr)[0]; detach(w); w.tid = -1; S.free.push(w); }
}
function genOffers() {
  const ut = userClub();
  S.offers = S.offers.filter(o => o.exp >= S.day && pget(o.pid) && pget(o.pid).tid === ut.id);
  if (ut.players.length <= 17) return;
  for (const p of ut.players) {
    if (p.loan || S.offers.some(o => o.pid === p.id)) continue;
    const chance = p.listed ? 0.35 : (p.ovr >= teamLevel(ut) + 2 && p.mor < 50 ? 0.08 : p.ovr >= teamLevel(ut) + 3 ? 0.03 : 0);
    if (rnd() < chance) {
      const buyers = S.clubs.filter(c => c.id !== ut.id && c.rep >= ut.rep - 12 && teamLevel(c) <= p.ovr + 4 && c.bal > p.val * 0.5);
      if (!buyers.length) continue;
      const b = pick(buyers);
      const amt = Math.round(p.val * (p.listed ? 0.8 + rnd() * 0.4 : 1.1 + rnd() * 0.45) / 50000) * 50000;
      S.offers.push({ id: S.nextId++, pid: p.id, from: b.id, amount: amt, exp: S.day + 6 });
      msg('Oferta za zawodnika', `${b.name} (${S.countries[b.cc].flag}) oferuje ${money(amt)} za ${p.n}.`);
    }
  }
}
function aiTransfers() {
  for (let k = 0; k < 10; k++) {
    const b = wpick(S.clubs, c => c.id === S.user ? 0 : Math.pow(c.rep / 50, 3));
    if (!b.lineup.length) continue;
    const slots = slotsOf(b.formation);
    let worst = 0, wv = 999;
    b.lineup.forEach((id, i) => { const p = pget(id); if (p) { const v = ovrAt(p, slots[i].pos); if (v < wv) { wv = v; worst = i; } } });
    const pos = slots[worst].pos;
    let bestP = null;
    for (let s = 0; s < 400; s++) {
      const p = PALL[ri(0, PALL.length - 1)];
      if (p.tid < 0 || p.tid === b.id || p.tid === S.user || p.loan || p.pos !== pos) continue;
      const sc = club(p.tid);
      if (sc.rep > b.rep + 3 || sc.players.length <= 20 || p.ovr < wv + 2 || p.ovr > teamLevel(b) + 7 || p.val * 1.2 > b.tb) continue;
      if (!bestP || p.ovr > bestP.ovr) bestP = p;
    }
    if (!bestP) continue;
    const seller = club(bestP.tid), fee = Math.round(bestP.val * (1.05 + rnd() * 0.3) / 50000) * 50000;
    detach(bestP); attach(bestP, b); bestP.wage = calcWage(bestP, b.rep); bestP.con = ri(2, 5);
    b.bal -= fee; b.tb -= fee; seller.bal += fee; seller.tb += fee; refillAI(seller);
    if (fee >= 3e6 || seller.cc === userClub().cc || b.cc === userClub().cc) news(`${bestP.n} (${bestP.ovr}) przechodzi z ${seller.name} do ${b.name} za ${money(fee)}.`);
  }
  rebuildIndex();
}
function news(t) { S.news.unshift({ d: curDay() ? curDay().date : 0, t }); if (S.news.length > 60) S.news.length = 60; }
function msg(title, body) { S.inbox.unshift({ id: S.nextId++, season: S.season, date: curDay() ? curDay().date : 0, title, body, read: false }); if (S.inbox.length > 80) S.inbox.length = 80; }

/* ---------- obiekty ---------- */
const FAC_COST = lvl => Math.round(1.5e6 * Math.pow(2.2, lvl - 1));
function upgradeFacility(kind) {
  const lvl = S.fac[kind], ut = userClub();
  if (lvl >= 5) return { ok: false, msg: 'Maksymalny poziom.' };
  const cost = FAC_COST(lvl);
  if (ut.bal < cost) return { ok: false, msg: `Za mało środków (${money(cost)}).` };
  ut.bal -= cost; S.fac[kind]++; saveSoon();
  return { ok: true, msg: `Rozbudowano: poziom ${S.fac[kind]}.` };
}

/* ---------- zarząd ---------- */
function setBoardObjective() {
  const ut = userClub(), lg = S.leagues[ut.lg];
  const lv = lg.clubs.map(id => ({ id, l: teamLevel(club(id)) })).sort((a, b) => b.l - a.l);
  const rank = lv.findIndex(x => x.id === ut.id) + 1, n = lg.clubs.length;
  const down = lg.tier === 1 && PROMO[lg.cc] ? PROMO[lg.cc] : 0;
  let target = clamp(rank + 2, 1, n - down - 1), text;
  if (lg.tier === 2) { target = clamp(rank + 1, 2, n - 3); text = target <= PROMO[lg.cc] ? `Celem zarządu jest awans do ${S.leagues[S.countries[lg.cc].leagues[0]].name}.` : `Celem zarządu jest miejsce w pierwszej ${target} ${lg.name}.`; }
  else text = target <= 1 ? `Zarząd oczekuje mistrzostwa ${lg.name}.` : target <= 4 ? `Celem zarządu jest miejsce w czołowej ${target} ${lg.name}.` : target >= n - down - 2 ? `Celem zarządu jest utrzymanie w ${lg.name}.` : `Celem zarządu jest miejsce w pierwszej ${target} ${lg.name}.`;
  S.board.target = target; S.board.text = text;
  const ec = Object.values(S.euro).find(c => c.teams.includes(ut.id));
  S.board.euro = ec ? (ec.id === 'CL' ? (ut.rep >= 88 ? 'ćwierćfinał Ligi Mistrzów' : ut.rep >= 78 ? 'awans z fazy ligowej Ligi Mistrzów' : 'godny występ w Lidze Mistrzów') : ut.rep >= 75 ? `ćwierćfinał: ${ec.name}` : `awans z fazy ligowej: ${ec.name}`) : '';
}

/* ---------- sezon ---------- */
function newSeason(first) {
  for (const lg of Object.values(S.leagues)) {
    lg.fix = makeFixtures(shuffle(lg.clubs));
    const R = lg.fix.length; lg.lsMap = Array(LS).fill(-1);
    for (let r = 0; r < R; r++) lg.lsMap[Math.round(r * (LS - 1) / (R - 1))] = r;
  }
  buildCalendar();
  allocateEurope();
  buildNTComps();
  for (const c of S.clubs) { if (c.id !== S.user) autoPick(c); c.fin = { inc: 0, exp: 0, tr: 0 }; }
  if (!first && S.user >= 0) setBoardObjective();
}
function startCareer(name, clubId, nt) {
  S.manager = name; S.user = clubId; S.nt = nt || null;
  const ut = userClub(); S.mrep = clamp(ut.rep - 5, 20, 90);
  setBoardObjective(); autoPick(ut);
  msg('Witaj w klubie!', `Zarząd ${ut.name} powierzył Ci stery drużyny. ${S.board.text}${S.board.euro ? ' W Europie: ' + S.board.euro + '.' : ''} Okno transferowe jest otwarte – sprawdź skład, wyślij skautów i wzmocnij zespół.`);
  if (S.nt) msg('Reprezentacja', `Zostałeś także selekcjonerem reprezentacji: ${NAT[S.nt].name}. Powołania znajdziesz w zakładce Klub → Reprezentacja.`);
  const ec = Object.values(S.euro).find(c => c.teams.includes(ut.id));
  if (ec) msg(`Losowanie: ${ec.name}`, `Poznaliśmy rywali w fazie ligowej: ${ec.lp.map(rd => rd.find(f => f.h === ut.id || f.a === ut.id)).filter(Boolean).map(f => club(f.h === ut.id ? f.a : f.h).name).join(', ')}.`);
  saveNow();
}
function endSeason() {
  const ut = userClub(), lines = [];
  const finals = {};
  for (const id in S.leagues) finals[id] = table(id);
  const upos = finals[ut.lg].find(r => r.id === ut.id);
  const wasLg = ut.lg, wasTier = S.leagues[ut.lg].tier;
  // nagrody pieniężne
  for (const id in finals) { const n = finals[id].length; finals[id].forEach(r => { const c = club(r.id); const pr = Math.round(c.tv * 14 * (n - r.pos + 1) / n); c.bal += pr; c.fin.inc += pr; if (c.id === S.user) { c.tb += pr; lines.push(`Premia za miejsce w lidze: ${money(pr)}.`); } }); }
  for (const id in finals) { const champ = finals[id][0].id; (S.champs[id] = S.champs[id] || []).push({ s: S.season, c: champ }); }
  lines.unshift(`Twoja pozycja: ${upos.pos}. miejsce w ${S.leagues[wasLg].name} (${upos.Pts} pkt).`);
  lines.unshift(`🏆 Mistrz ${S.leagues[wasLg].name}: ${club(finals[wasLg][0].id).name}.`);
  // puchary
  const eh = { season: S.season };
  for (const c of Object.values(S.euro)) { eh[c.id] = c.champion; if (c.champion != null) lines.push(`🏆 ${c.name}: ${club(c.champion).name}.`); }
  S.euroHist.push(eh);
  S.lastWinners = { CL: S.euro.CL && S.euro.CL.champion, EL: S.euro.EL && S.euro.EL.champion, ECL: S.euro.ECL && S.euro.ECL.champion };
  const myEuro = Object.values(S.euro).find(c => c.teams.includes(ut.id));
  let euroOk = true;
  if (myEuro) {
    const reached = myEuro.champion === ut.id ? 6 : myEuro.ko.F && myEuro.ko.F[0].a === ut.id || myEuro.ko.F && myEuro.ko.F[0].b === ut.id ? 5 : ['SF', 'QF', 'R16', 'PO'].reduce((acc, st, i) => acc || (myEuro.ko[st] && myEuro.ko[st].some(t => t.a === ut.id || t.b === ut.id) ? 4 - i : 0), 0);
    const need = S.board.euro.startsWith('ćwierćfinał') ? 3 : S.board.euro.startsWith('awans') ? 1 : 0;
    euroOk = reached >= need;
    S.board.conf = clamp(S.board.conf + (reached - need) * 3, 0, 100);
  }
  // współczynniki
  for (const cc in S.countries) { const c = S.countries[cc], r = S.cpts[cc]; c.coef.shift(); c.coef.push(r && r.n ? Math.round(r.pts / r.n * 1000) / 1000 : 0); }
  for (const id in S.ccoef) { S.ccoef[id].shift(); S.ccoef[id].push(0); }
  // reprezentacje
  if (S.ntc && S.ntc.tourn && S.ntc.tourn.champion) { S.ntHist.push({ season: S.season, name: S.ntc.tourn.name, champ: S.ntc.tourn.champion }); lines.push(`🌍 ${S.ntc.tourn.name}: zwycięża ${NAT[S.ntc.tourn.champion].flag} ${NAT[S.ntc.tourn.champion].name}.`); }
  // awanse/spadki
  for (const cc in PROMO) {
    const [l1, l2] = S.countries[cc].leagues; if (!l2) continue;
    const n = PROMO[cc], down = finals[l1].slice(-n).map(r => r.id), up = finals[l2].slice(0, n).map(r => r.id);
    const L1 = S.leagues[l1], L2 = S.leagues[l2];
    L1.clubs = L1.clubs.filter(id => !down.includes(id)).concat(up); L2.clubs = L2.clubs.filter(id => !up.includes(id)).concat(down);
    down.forEach(id => { const c = club(id); c.lg = l2; c.rep = clamp(c.rep - 3, 1, 99); setupTV(c); });
    up.forEach(id => { const c = club(id); c.lg = l1; c.rep = clamp(c.rep + 3, 1, 99); setupTV(c); });
    if (up.includes(ut.id)) { lines.push(`⬆️ AWANS do ${L1.name}!`); S.board.conf = clamp(S.board.conf + 15, 0, 100); S.mrep += 5; }
    if (down.includes(ut.id)) { lines.push(`⬇️ Spadek do ${L2.name}…`); S.board.conf = clamp(S.board.conf - 25, 0, 100); }
  }
  for (const id in finals) S.lastTables[id] = finals[id].map(r => r.id);
  const achieved = ut.lg !== wasLg ? S.leagues[ut.lg].tier < wasTier : upos.pos <= S.board.target;
  lines.push(achieved ? '✅ Cel ligowy zrealizowany!' : '❌ Cel ligowy niezrealizowany.');
  S.board.conf = clamp(S.board.conf + (achieved ? 10 : -14), 0, 100);
  S.mrep = clamp(S.mrep + (achieved ? 3 : -3) + (upos.pos === 1 ? 5 : 0) + (myEuro && myEuro.champion === ut.id ? 10 : 0), 1, 99);
  // reputacja klubów
  for (const id in finals) { const n = finals[id].length; finals[id].forEach(r => { const c = club(r.id); if (c.id !== ut.id) c.rep = clamp(c.rep + (r.pos <= 2 ? 1 : r.pos >= n - 1 ? -1 : 0), 5, 97); }); }
  if (upos.pos <= 2) ut.rep = clamp(ut.rep + 2, 1, 97);
  if (myEuro && myEuro.champion === ut.id) ut.rep = clamp(ut.rep + 3, 1, 97);
  // nagrody indywidualne
  const cand = PALL.filter(p => p.tid >= 0).map(p => {
    const c = club(p.tid); let s = p.ovr + p.st.g * 0.35 + p.st.a * 0.15 + (p.st.apps ? p.st.rs / p.st.apps - 6.5 : -2) * 4;
    if (S.lastWinners.CL === c.id) s += 6; if (finals[c.lg] && finals[c.lg][0].id === c.id) s += 3;
    if (S.ntc.tourn && S.ntc.tourn.champion === p.nat) s += 5; return { p, s };
  }).sort((a, b) => b.s - a.s).slice(0, 3);
  S.awards.push({ season: S.season, ballon: cand.map(x => ({ n: x.p.n, c: club(x.p.tid).name, nat: x.p.nat })) });
  lines.push(`🥇 Złota Piłka: ${cand[0].p.n} (${club(cand[0].p.tid).name}).`);
  const ks = topScorers(wasLg, 1)[0]; if (ks) lines.push(`👟 Król strzelców ligi: ${ks.n} (${ks.lg} goli).`);
  S.history.push({ season: S.season, lg: wasLg, pos: upos.pos, pts: upos.Pts, club: ut.name, champ: club(finals[wasLg][0].id).name, scorer: ks ? `${ks.n} (${ks.lg})` : '-', achieved, euro: myEuro ? myEuro.name : '' });

  // zawodnicy
  const left = [], retired = [], back = [];
  for (const c of S.clubs) for (const p of c.players.slice()) {
    if (p.loan && p.loan.season === S.season) { const from = club(p.loan.from); detach(p); attach(p, from); if (from === ut) back.push(p.n); else if (c === ut) back.push(p.n); p.loan = null; }
  }
  for (const c of S.clubs) {
    for (const p of c.players.slice()) {
      p.age++;
      if (p.age >= 30) p.pot = Math.min(p.pot, p.ovr + 1);
      p.inj = 0; p.susp = 0; p.fit = 100; p.form = 50; p.shp = 60; p.st = newStats(); p.lg = 0; p.eg = 0; p.listed = false; p.pt = 0.5;
      p.val = calcValue(p);
      if (p.age >= 34 && rnd() < 0.25 + (p.age - 34) * 0.2) { detach(p); PM.delete(p.id); if (c === ut) retired.push(p.n); continue; }
      p.con--;
      if (p.con <= 0) {
        if (c === ut) { detach(p); p.tid = -1; S.free.push(p); left.push(p.n); }
        else if (p.age >= 32 && rnd() < 0.5) { detach(p); p.tid = -1; S.free.push(p); }
        else { p.con = ri(1, 4); p.wage = calcWage(p, c.rep); }
      } else if (c !== ut) p.wage = calcWage(p, c.rep);
    }
  }
  for (const p of S.virt) { p.age++; if (p.age > 33) { Object.assign(p, genPlayer(p.pos, natLevel(NAT[p.nat]) - 3, p.nat, { age: ri(21, 25) }), { id: p.id, wage: 0 }); } }
  for (const p of S.free) { p.age++; p.val = calcValue(p); }
  S.free = S.free.filter(p => p.age <= 35).sort((a, b) => b.ovr - a.ovr).slice(0, 60);
  for (let i = 0; i < 30; i++) S.free.push(genFreeAgent());
  if (back.length) lines.push(`Powroty z wypożyczeń: ${back.join(', ')}.`);
  if (retired.length) lines.push(`Zakończyli kariery: ${retired.join(', ')}.`);
  if (left.length) lines.push(`Wygasły kontrakty (odeszli): ${left.join(', ')}.`);
  // młodzież
  for (const c of S.clubs) {
    const n = c === ut ? 2 + S.fac.youth : ri(1, 3);
    const youth = [];
    for (let i = 0; i < n; i++) {
      const pos = pick(POSITIONS);
      const potBase = c === ut ? 58 + S.fac.youth * 5 : 52 + c.rep * 0.25;
      const y = genPlayer(pos, 0, rnd() < 0.8 ? S.countries[c.cc].nat : foreignNat(false), { age: ri(16, 18), adjAge: false, pot: clamp(Math.round(potBase + gauss() * 7), 55, 94) });
      const a = genAttrs(pos, ri(42, 56)); y.a = a; y.ovr = calcOvr(pos, a); y.alt = bestAlt(pos, a); y.pot = Math.max(y.pot, y.ovr + 5);
      y.con = 3; y.val = calcValue(y); y.wage = Math.round(calcWage(y, c.rep) * 0.6 / 100) * 100; attach(y, c); youth.push(y);
    }
    if (c === ut) lines.push(`🎓 Akademia: ${youth.map(y => `${y.n} (${POS_PL[y.pos]}, ${y.ovr}/${y.pot})`).join('; ')}.`);
    refillAI(c);
  }
  S.free = S.free.sort((a, b) => b.ovr - a.ovr).slice(0, 150);
  rebuildIndex();
  for (const c of S.clubs) { c.level = teamLevel(c); c.price = 5 + c.rep * 0.3; }
  ut.spons = Math.round(ut.spons * (1 + (ut.rep - 60) / 600) / 1000) * 1000;
  ut.tb += Math.max(0, Math.round((ut.fin.inc - ut.fin.exp) * 0.3));
  if (S.board.conf <= 12) S.sacked = true; else S.board.conf = Math.round(45 + (S.board.conf - 45) * 0.5);
  // nowy sezon
  S.season++; S.day = 0; S.offers = []; S.scoutMarket = Array.from({ length: 5 }, genScout);
  for (const n of NATIONS) { S.ntTeams[n.code].sq = S.ntTeams[n.code].sq.filter(id => PM.has(id)); }
  newSeason(false);
  setBoardObjective();
  lines.push(`Nowy sezon ${SEASON_LABEL(S.season)}. ${S.board.text}${S.board.euro ? ' W Europie: ' + S.board.euro + '.' : ''}`);
  const ec = Object.values(S.euro).find(c => c.teams.includes(ut.id));
  if (ec) lines.push(`🇪🇺 Zagramy w rozgrywkach: ${ec.name}!`);
  const title = `Podsumowanie sezonu ${SEASON_LABEL(S.season - 1)}`;
  msg(title, lines.join('\n'));
  S.summary = { title, lines };
  return S.summary;
}
function setupTV(c) { const t = TVW[c.cc] || [5e4, 1e4]; c.tv = S.leagues[c.lg].tier === 1 ? t[0] : (t[1] || t[0] * 0.15); }

/* ---------- praca ---------- */
function jobOffers() {
  return S.clubs.filter(c => c.id !== S.user && c.rep <= S.mrep + 8 && c.rep >= S.mrep - 25).sort(() => rnd() - 0.5).slice(0, 6).sort((a, b) => b.rep - a.rep);
}
function takeOver(id) {
  S.user = id; S.sacked = false; S.board.conf = 60; S.offers = [];
  setBoardObjective(); autoPick(userClub());
  msg('Nowa praca', `Zostałeś trenerem ${userClub().name}. ${S.board.text}`); saveNow();
}
function setNT(code) { S.nt = code || null; if (code) S.ntTeams[code].sq = autoCallup(code); saveSoon(); }

/* ---------- zapis (IndexedDB) ---------- */
const DB_NAME = 'kariera_menedzera', SAVE_KEY = 'save';
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function saveNow() {
  if (typeof indexedDB === 'undefined' || !S) return;
  try { const db = await idb(); await new Promise((res, rej) => { const tx = db.transaction('s', 'readwrite'); tx.objectStore('s').put(S, SAVE_KEY); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); } catch (e) { console.warn('save', e); }
}
let saveT = null;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 400); }
async function loadSave() {
  if (typeof indexedDB === 'undefined') return null;
  try { const db = await idb(); return await new Promise((res, rej) => { const r = db.transaction('s').objectStore('s').get(SAVE_KEY); r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error); }); } catch (e) { return null; }
}
async function deleteSave() { if (typeof indexedDB === 'undefined') return; try { const db = await idb(); await new Promise(res => { const tx = db.transaction('s', 'readwrite'); tx.objectStore('s').delete(SAVE_KEY); tx.oncomplete = res; }); } catch (e) { } }
function useSave(s) { S = s; rebuildIndex(); }

if (typeof module !== 'undefined') module.exports = { get S() { return S; } };
