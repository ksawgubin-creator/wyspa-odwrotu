'use strict';
/* ============================================================
   KARIERA MENEDŻERA – świat: ligi, kalendarz, puchary UEFA,
   reprezentacje, transfery, skauting, finanse, sezon
   ============================================================ */
let S = null;
let PALL = [];                 // wszyscy zawodnicy (klubowi + wolni + wirtualni)
let NATIDX = new Map();        // narodowość -> zawodnicy
const NAT = {}; for (const n of NATIONS) NAT[n.code] = n;
const isoFlag = iso => iso.toUpperCase().replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
const NAT_EXTRA = [
  ['CAN', 'Kanada', 'CA', 'EN', 64, 'CONCACAF'], ['CHI', 'Chile', 'CL', 'LATAM', 58, 'CONMEBOL'], ['PER', 'Peru', 'PE', 'LATAM', 55, 'CONMEBOL'], ['PAR', 'Paragwaj', 'PY', 'LATAM', 62, 'CONMEBOL'],
  ['VEN', 'Wenezuela', 'VE', 'LATAM', 56, 'CONMEBOL'], ['BOL', 'Boliwia', 'BO', 'LATAM', 45, 'CONMEBOL'], ['CRC', 'Kostaryka', 'CR', 'LATAM', 52, 'CONCACAF'], ['JAM', 'Jamajka', 'JM', 'EN', 50, 'CONCACAF'],
  ['HON', 'Honduras', 'HN', 'LATAM', 46, 'CONCACAF'], ['PAN', 'Panama', 'PA', 'LATAM', 52, 'CONCACAF'], ['HAI', 'Haiti', 'HT', 'FRAF', 42, 'CONCACAF'], ['SUR', 'Surinam', 'SR', 'NL', 44, 'CONCACAF'],
  ['CUW', 'Curaçao', 'CW', 'NL', 46, 'CONCACAF'], ['MLI', 'Mali', 'ML', 'FRAF', 60, 'CAF'], ['GUI', 'Gwinea', 'GN', 'FRAF', 52, 'CAF'], ['BFA', 'Burkina Faso', 'BF', 'FRAF', 55, 'CAF'],
  ['COD', 'DR Konga', 'CD', 'FRAF', 58, 'CAF'], ['ANG', 'Angola', 'AO', 'PT', 48, 'CAF'], ['GAB', 'Gabon', 'GA', 'FRAF', 48, 'CAF'], ['ZAM', 'Zambia', 'ZM', 'WAF', 46, 'CAF'],
  ['ZIM', 'Zimbabwe', 'ZW', 'WAF', 42, 'CAF'], ['RSA', 'RPA', 'ZA', 'WAF', 55, 'CAF'], ['TUN', 'Tunezja', 'TN', 'ARAB', 57, 'CAF'], ['CPV', 'Republika Zielonego Przylądka', 'CV', 'PT', 50, 'CAF'],
  ['GNB', 'Gwinea Bissau', 'GW', 'PT', 42, 'CAF'], ['GAM', 'Gambia', 'GM', 'WAF', 42, 'CAF'], ['TOG', 'Togo', 'TG', 'FRAF', 42, 'CAF'], ['BEN', 'Benin', 'BJ', 'FRAF', 44, 'CAF'],
  ['KEN', 'Kenia', 'KE', 'WAF', 40, 'CAF'], ['EQG', 'Gwinea Równikowa', 'GQ', 'ES', 42, 'CAF'], ['SLE', 'Sierra Leone', 'SL', 'WAF', 38, 'CAF'], ['LBR', 'Liberia', 'LR', 'WAF', 36, 'CAF'],
  ['CGO', 'Kongo', 'CG', 'FRAF', 40, 'CAF'], ['UZB', 'Uzbekistan', 'UZ', 'UA', 52, 'AFC'], ['IRN', 'Iran', 'IR', 'ARAB', 60, 'AFC'], ['KSA', 'Arabia Saudyjska', 'SA', 'ARAB', 52, 'AFC'],
  ['QAT', 'Katar', 'QA', 'ARAB', 48, 'AFC'], ['CHN', 'Chiny', 'CN', 'CN', 42, 'AFC'], ['NZL', 'Nowa Zelandia', 'NZ', 'EN', 44, 'OFC'], ['CYP', 'Cypr', 'CY', 'GR', 42, 'UEFA'],
  ['LUX', 'Luksemburg', 'LU', 'FR', 44, 'UEFA'], ['EST', 'Estonia', 'EE', 'UA', 38, 'UEFA'], ['LVA', 'Łotwa', 'LV', 'UA', 38, 'UEFA'], ['LTU', 'Litwa', 'LT', 'UA', 38, 'UEFA'],
  ['BLR', 'Białoruś', 'BY', 'UA', 42, 'UEFA'], ['MDA', 'Mołdawia', 'MD', 'RO', 34, 'UEFA'], ['ARM', 'Armenia', 'AM', 'UA', 40, 'UEFA'], ['AZE', 'Azerbejdżan', 'AZ', 'UA', 38, 'UEFA'],
  ['KOS', 'Kosowo', 'XK', 'AL', 48, 'UEFA'], ['MLT', 'Malta', 'MT', 'IT', 30, 'UEFA'], ['FRO', 'Wyspy Owcze', 'FO', 'NORD', 34, 'UEFA'],
];
NAME_POOLS.CN = NAME_POOLS.CN || {
  f: ['Wei', 'Lei', 'Hao', 'Jun', 'Yang', 'Tao', 'Peng', 'Chen', 'Xin', 'Bo', 'Long', 'Jie', 'Kai', 'Ming', 'Yu', 'Zhen', 'Fei', 'Rui', 'Yi', 'Zhi', 'Wenjun', 'Haoran', 'Zihao', 'Yuxuan', 'Junjie', 'Tianyi', 'Shuai', 'Xiang'],
  l: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Lin', 'Gao', 'Luo', 'Zheng', 'Liang', 'Xie', 'Song', 'Tang', 'Han', 'Feng', 'Deng', 'Cao', 'Wei'] };
for (const [code, name, iso, pool, str, conf] of NAT_EXTRA) if (!NAT[code]) { const n = { code, name, flag: code === 'KOS' ? '🇽🇰' : isoFlag(iso), pool: NAME_POOLS[pool] ? pool : 'EN', str, conf }; NATIONS.push(n); NAT[code] = n; }
const COEF0 = {"CYP":[5.375,6.125,6.75,7.125,6],"ISR":[5.375,4.875,6.25,5.875,5.5],"HUN":[3.25,3.375,5.5,6.625,6],"ROU":[3.5,4.125,3.875,6.5,6],"SVK":[4.125,4.25,4.625,4.25,5],"BUL":[3,4.875,3.625,6,4.5],"SVN":[2.625,4.875,3.875,4,5],"IRL":[2,3.25,5.875,3.4,4],"BIH":[2.25,3.5,3.375,3,3.5],"FIN":[3,3.5,3.75,3.125,3.5],"GEO":[1.25,3.375,3.5,5.25,3.5],"ALB":[1.75,2.875,3.375,4,3],"ISL":[1.5,2.875,4.25,3.5,3],"MKD":[2,2.5,1.75,2.5,2],"MNE":[1.375,2.125,2.5,2.25,2],"NIR":[2.5,1.5,2.25,2.5,2],"WAL":[1.5,1.5,1.875,1.375,1.5],"ENG":[21.428,23,17.375,29.464,25],"ESP":[18.428,16.571,16.062,19,18.5],"ITA":[15.714,22.357,21,21.875,18],"GER":[16.214,17.125,19.357,18,18],"FRA":[18.416,12.916,13.5,17.125,16],"POL":[4.625,7.5,4,13.875,10],"POR":[10.5,12,10.833,13.05,12.5],"NED":[19.2,11,13,15.25,12],"BEL":[10,13.4,12.6,13,11.5],"TUR":[6.4,10,12,10.8,10.5],"SCO":[8.375,8.25,4.9,7.15,6],"AUT":[10.5,7.1,7,6.55,7.5],"SUI":[5.875,7.775,3.7,8.975,7],"CZE":[9,9,11.7,9,9.5],"GRE":[6.5,4.7,15.25,8.625,9],"DEN":[9.375,6.375,7.375,8.7,8],"UKR":[3.3,6.4,6.5,4.925,5.5],"CRO":[6.375,4.9,7.125,6.625,6.5],"SRB":[9.125,4,5.75,5.75,6],"NOR":[11,7.375,9,11.687,9],"SWE":[4.875,6.25,6,8.75,6.5]};
const CTRY = COUNTRY_DATA
  .map(c => Object.assign({}, c, { coef: (COEF0[c.code] || [3, 3, 3, 3, 3]).slice(), leagues: c.leagues.slice().sort((a, b) => a.tier - b.tier) }))
  .sort((a, b) => sum(b.coef) - sum(a.coef));
const club = id => S.clubs[id];
const userClub = () => S.clubs[S.user];
const LS = 46;                 // liczba „slotów” ligowych w sezonie
const SEASON_LABEL = s => `${s}/${String(s + 1).slice(2)}`;
const COMP_NAME = { CL: 'Liga Mistrzów', EL: 'Liga Europy', ECL: 'Liga Konferencji', L: 'Liga', N: 'Reprezentacja', T: 'Turniej', F: 'Towarzyski' };
const STAGE_NAME = { LP: 'Faza ligowa', PO: 'Baraże', R16: '1/8 finału', QF: 'Ćwierćfinał', SF: 'Półfinał', F: 'Finał', G: 'Faza grupowa' };
const PROMO = { TUR: [4], BRA: [4], ENG: [3, 3, 4], ESP: [3, 4, 3], ITA: [3, 3, 3], GER: [2, 2, 3], FRA: [2, 2, 3], POL: [3, 3] };
const promoN = (cc, tier) => (PROMO[cc] || [])[tier - 1] || 2; // ilu spada z poziomu `tier` / awansuje z tier+1
const DOM = { HUN: .65, ROU: .75, CYP: .35, ISR: .7, SVK: .65, BUL: .6, SVN: .7, BIH: .8, IRL: .8, FIN: .8, GEO: .8, ALB: .75, MKD: .8, MNE: .8, ISL: .85, NIR: .8, WAL: .8, USA: .55, MEX: .6, BRA: .9, ARG: .9, KSA: .55, JPN: .85, ENG: .4, ESP: .6, ITA: .45, GER: .5, FRA: .55, POR: .45, NED: .55, BEL: .45, TUR: .55, SCO: .5, AUT: .6, SUI: .55, CZE: .75, GRE: .45, DEN: .65, POL: .65, UKR: .8, CRO: .7, SRB: .75, NOR: .75, SWE: .7 };
const TVW = { USA: [2.5e5], MEX: [1.5e5], BRA: [2e5, 4e4], ARG: [8e4], KSA: [3e5], JPN: [1.2e5], ENG: [6.5e5, 8e4], ESP: [4.2e5, 5e4], ITA: [4e5, 4e4], GER: [4e5, 6e4], FRA: [2.8e5, 4e4], POR: [8e4], NED: [8e4], BEL: [6e4], TUR: [1e5], SCO: [4e4], AUT: [3e4], SUI: [3.5e4], CZE: [2.5e4], GRE: [3e4], DEN: [3e4], POL: [5e4, 1.5e4], UKR: [2e4], CRO: [2e4], SRB: [1.5e4], NOR: [2.5e4], SWE: [2.5e4] };
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
  let pot = o.pot || (age < 28 ? ovr + Math.round(Math.max(0, 27 - age) * (0.5 + rnd() * 1.3) + rnd() * 4) : ovr);
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
const POSMAP = { LWB: 'LB', RWB: 'RB', CF: 'ST', LF: 'LW', RF: 'RW' };
function natCode(code) { if (!NAT[code]) { const n = { code, name: code, flag: '🏳️', pool: 'EN', str: 40, conf: 'OTHER' }; NATIONS.push(n); NAT[code] = n; } return code; }
function realPlayer(t, c) {
  const [n, pos0, age, ovr, pot, nat, fs] = t, pos = POSMAP[pos0] || pos0;
  let a;
  if (fs && fs.length === 6) {
    a = fs.map(Number);
    for (let k = 0; k < 4; k++) { const d = ovr - W[pos].reduce((s, w, i) => s + w * a[i], 0); a = a.map((x, i) => W[pos][i] > 0 ? clamp(x + d, 12, 99) : x); }
    a = a.map(x => Math.round(x));
  } else a = genAttrs(pos, ovr);
  const p = genPlayer(pos, ovr, natCode(nat), { age, adjAge: false, pot: Math.max(pot || ovr, ovr) });
  p.n = n; p.a = a; p.ovr = calcOvr(pos, a); p.pot = Math.max(p.pot, p.ovr); p.alt = bestAlt(pos, a); p.real = 1;
  p.val = calcValue(p); p.wage = calcWage(p, c.rep); p.tid = c.id;
  return p;
}
function realSquad(c, list) {
  const seen = new Set(), ps = [];
  for (const t of list) { if (!t || seen.has(t[0]) || !W[POSMAP[t[1]] || t[1]]) continue; seen.add(t[0]); ps.push(realPlayer(t, c)); }
  const real = ps.length, top = ps.map(p => p.ovr).sort((a, b) => b - a).slice(0, 11);
  const realLvl = top.length >= 11 ? avg(top) : null;
  const need = { GK: 3, DEF: 8, MID: 8, ATT: 5 }, have = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  ps.forEach(p => have[LINE[p.pos]]++);
  const posFor = { GK: ['GK'], DEF: ['CB', 'LB', 'CB', 'RB'], MID: ['CM', 'CDM', 'CAM', 'LM', 'RM'], ATT: ['ST', 'LW', 'RW'] };
  for (const line of ['GK', 'DEF', 'MID', 'ATT']) {
    let i = 0;
    while (have[line] < need[line] && ps.length < 30) {
      const role = realLvl ? 2 : (have[line] < need[line] / 2 ? 0 : 1);
      const p = squadPlayer(c, posFor[line][i++ % posFor[line].length], role);
      if (realLvl && p.ovr > realLvl - 4) { develop(p, realLvl - 4 - p.ovr); p.pot = Math.max(p.pot, p.ovr); p.val = calcValue(p); p.wage = calcWage(p, c.rep); }
      ps.push(p); have[line]++;
    }
  }
  while (ps.length < 22) ps.push(squadPlayer(c, pick(['CB', 'CM', 'ST', 'RB', 'LW']), realLvl ? 2 : 1));
  c.realCount = real;
  return ps;
}
const COACH_NAT = ['POL', 'ENG', 'ESP', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'ARG', 'BRA', 'CRO', 'SRB', 'DEN', 'NOR', 'AUT', 'CZE', 'TUR', 'GRE', 'BEL', 'SCO'];
function genCoach(rep) { return { n: genName(pick(COACH_NAT)), ovr: clamp(Math.round(28 + rep * 0.62 + gauss() * 4), 30, 94), age: ri(36, 66) }; }
function coachOvr(t) {
  if (!t || !S) return 60;
  if (t.nation) return t.nation === S.nt ? S.mgr.ovr : clamp(Math.round(NAT[t.nation].str * 0.9), 30, 92);
  return t.id === S.user ? S.mgr.ovr : (t.coach ? t.coach.ovr : 60);
}
function squadPlayer(c, pos, role) {
  const lvl = clubLevel(c.rep);
  let age, target;
  if (role === 0) { age = clamp(Math.round(26 + gauss() * 3), 20, 34); target = lvl + gauss() * 2.5; }
  else if (role === 1) { age = clamp(Math.round(25 + gauss() * 4), 19, 35); target = lvl - 4 + gauss() * 3; }
  else if (rnd() < 0.5) { age = ri(17, 21); target = lvl - 4 + gauss() * 3; }
  else { age = ri(22, 34); target = lvl - 9 + gauss() * 3; }
  const nat = rnd() < (DOM[c.cc] || 0.6) ? S.countries[c.cc].nat : foreignNat(c.rep >= 78);
  const p = genPlayer(pos, target, nat, { age });
  if (age <= 21 && S.season > (S.startSeason || 2026) && !p.gem) p.pot = clamp(Math.min(p.pot, Math.round(lvl + 3 + gauss() * 4)), p.ovr, 95);   // uzupełnienia w trakcie gry: bez inflacji potencjału
  if (age <= 21 && rnd() < (S.season > (S.startSeason || 2026) ? 0.02 : 0.045)) { p.pot = clamp(Math.max(p.pot, Math.round(lvl + ri(8, S.season > (S.startSeason || 2026) ? 14 : 22))), p.ovr, 93); p.gem = 1; p.val = calcValue(p); }  // ukryty talent
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
  if (S.acad) for (const p of S.acad.youth) add(p, -3);
}
const teamLevel = c => { const o = c.players.map(p => p.ovr).sort((a, b) => b - a).slice(0, 14); return avg(o); };
function clubOf(p) { return p.tid >= 0 ? club(p.tid) : null; }
function clubName(p) { return p.tid >= 0 ? club(p.tid).name : p.tid === -1 ? 'Wolny agent' : p.tid === -3 ? 'Akademia ' + userClub().short : 'Liga zagraniczna'; }

/* ---------- świat ---------- */
function createWorld() {
  S = {
    v: 3, manager: '', season: 2026, day: 0, user: -1, nt: null, mgr: { ovr: 50, best: 50 }, jobs: [], acad: { fac: 2, coach: 2, rec: 2, region: '', youth: [] }, clubs: [], leagues: {}, countries: {}, free: [], virt: [],
    inbox: [], offers: [], news: [], history: [], ntHist: [], champs: {}, awards: [], nextPid: 1, nextId: 1,
    board: { conf: 60, target: 8, text: '', euro: '' }, settings: { speed: 2 }, scouts: [], scoutMarket: [], know: {}, reports: [], short: [],
    ccoef: {}, cpts: {}, euro: {}, euroHist: [], lastTables: {}, lastWinners: {}, cal: [], ntTeams: {}, ntc: null, fac: { train: 2 }, summary: null, sacked: false,
  };
  for (const c of CTRY) {
    S.countries[c.code] = { code: c.code, name: c.name, flag: c.flag, nat: c.nat, conf: c.conf || 'UEFA', coef: c.coef.slice(), leagues: c.leagues.map(l => l.id) };
    for (const l of c.leagues) {
      const lg = S.leagues[l.id] = { id: l.id, name: l.name, cc: c.code, tier: l.tier, clubs: [], fix: [], lsMap: [] };
      for (const t of l.clubs) {
        const cl = {
          id: S.clubs.length, name: t[0], short: t[1], col: [t[2], t[3]], cc: c.code, lg: l.id, rep: t[4], cap: t[5],
          players: [], formation: pick(['4-3-3', '4-2-3-1', '4-4-2', '4-3-3', '3-5-2', '4-1-2-1-2', '4-1-4-1', '4-4-1-1', '5-3-2', '3-4-2-1', '4-2-3-1', '4-3-3 (fałszywa 9)', '5-4-1', '3-4-1-2']), ment: 'bal', lineup: [], bench: [], training: 'bal',
        };
        cl.players = t[6] && t[6].length ? realSquad(cl, t[6]) : genSquad(cl);
        cl.coach = genCoach(cl.rep);
        S.clubs.push(cl); lg.clubs.push(cl.id);
      }
    }
  }
  const codes = new Set();
  const fold = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toUpperCase().replace(/[^A-Z ]/g, '');
  for (const cl of S.clubs.slice().sort((a, b) => b.rep - a.rep)) {
    const w = fold(cl.name).split(' ').filter(x => x.length > 2 && !['FC', 'CF', 'AFC', 'SSC', 'SV', 'VFB', 'VFL', 'CLUB', 'REAL', 'SPORTING', 'ATLETICO'].includes(x));
    const cands = [cl.short, ...(w[0] ? [w[0].slice(0, 3), w[0][0] + w[0].slice(-2)] : []), ...(w[1] ? [w[0][0] + w[1].slice(0, 2), w[1].slice(0, 3)] : [])];
    let c = cands.find(x => x && x.length === 3 && !codes.has(x)), k = 1;
    while (!c || codes.has(c)) c = cl.short.slice(0, 2) + (k++);
    cl.short = c; codes.add(c);
  }
  // ukryte talenty: ok. 5% młodych (także prawdziwych) ma wyższy potencjał, niż wskazuje klub
  for (const cl of S.clubs) for (const p of cl.players) if (p.age <= 21 && !p.gem && rnd() < 0.05) { p.pot = clamp(Math.max(p.pot + ri(6, 14), ri(74, 87)), p.ovr, 92); p.gem = 1; p.val = calcValue(p); }
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
// popyt na bilety (liczba kibiców): renoma klubu, poziom ligi, siła piłkarskiego rynku kraju
const ATT_TIER = { 1: 1, 2: 0.6, 3: 0.45, 4: 0.35 };
function ticketDemand(c) {
  const tv = (TVW[c.cc] || [5e4])[0], cf = clamp(Math.sqrt(tv / 4e5), 0.4, 1.25);
  return Math.round(c.rep * c.rep * 13 * (ATT_TIER[S.leagues[c.lg].tier] || 0.35) * cf);
}
const basePrice = c => 5 + c.rep * 0.3;
const priceK = c => Math.pow(basePrice(c) / Math.max(1, c.price), 1.3);   // elastyczność popytu na cenę biletu
function attendance(c, derby) {
  let d = ticketDemand(c) * (derby ? 1.15 : 1);
  if (c.id === S.user) d *= (0.85 + (S.fans != null ? S.fans : 60) / 400) * (1 + commLvl('park') * 0.03) * priceK(c);
  return Math.round(Math.min(c.cap, d));
}
function setupEconomy(c) {
  const bill = sum(c.players.map(p => p.wage));
  c.tv = tvFor(c);
  c.price = 5 + c.rep * 0.3;
  const gateAvg = homeShare(c) * Math.min(c.cap, ticketDemand(c)) * c.price;
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
const EURO_AFTER = { 6: ['LP', 0], 8: ['LP', 1], 11: ['LP', 2], 14: ['LP', 3], 18: ['LP', 4], 21: ['LP', 5], 25: ['LP', 6], 26: ['LP', 7], 28: ['PO', 1], 29: ['PO', 2], 31: ['R16', 1], 32: ['R16', 2], 35: ['QF', 1], 36: ['QF', 2], 39: ['SF', 1], 40: ['SF', 2] };
const Q_AFTER = { 0: [1, 1], 1: [1, 2], 2: [2, 1], 3: [2, 2], 4: [3, 1], 5: [3, 2] };
const CUP_AFTER = [6, 12, 17, 23, 33, 37, 43];
const CUP_NAMES = { USA: 'US Open Cup', MEX: 'Copa MX', BRA: 'Copa do Brasil', ARG: 'Copa Argentina', KSA: 'Puchar Króla', JPN: 'Puchar Cesarza', ENG: 'FA Cup', ESP: 'Copa del Rey', ITA: 'Coppa Italia', GER: 'DFB-Pokal', FRA: 'Coupe de France', POL: 'Puchar Polski', NED: 'KNVB Beker', POR: 'Taça de Portugal', BEL: 'Croky Cup', TUR: 'Puchar Turcji', SCO: 'Scottish Cup', AUT: 'ÖFB-Cup', SUI: 'Puchar Szwajcarii', CZE: 'MOL Cup', GRE: 'Puchar Grecji', DEN: 'Pokal Danii', NOR: 'NM Cup', SWE: 'Svenska Cupen', UKR: 'Puchar Ukrainy', CRO: 'Puchar Chorwacji', SRB: 'Puchar Serbii' };
const tierOf = id => S.leagues[club(id).lg].tier;
function buildCups() {
  S.cups = {};
  for (const cc in S.countries) {
    const ids = S.countries[cc].leagues.flatMap(l => S.leagues[l].clubs).filter(id => !isReserve(club(id)));
    const R = Math.max(1, Math.ceil(Math.log2(ids.length)));
    S.cups[cc] = { cc, name: CUP_NAMES[cc] || `Puchar kraju (${S.countries[cc].name})`, R, slot0: CUP_AFTER.length - R, teams: ids, rounds: [], byes: [], champion: null };
  }
}
function ensureCupRound(cup, r) {
  if (cup.rounds[r]) return cup.rounds[r];
  let playing;
  if (r === 0) {
    const m = cup.teams.length - Math.pow(2, cup.R - 1);
    const sorted = cup.teams.slice().sort((a, b) => tierOf(b) - tierOf(a) || club(a).rep - club(b).rep);
    playing = sorted.slice(0, 2 * m); cup.byes = sorted.slice(2 * m);
  } else playing = (r === 1 ? cup.byes : []).concat(cup.rounds[r - 1].map(t => t.w)).filter(x => x != null);
  playing = shuffle(playing);
  const ties = [];
  for (let i = 0; i + 1 < playing.length; i += 2) { const a = playing[i], b = playing[i + 1]; const h = tierOf(a) > tierOf(b) ? a : tierOf(b) > tierOf(a) ? b : a; ties.push({ h, a: h === a ? b : a, w: null, m: null }); }
  return cup.rounds[r] = ties;
}
const cupRoundName = n => n === 2 ? 'Finał' : n === 4 ? 'Półfinał' : n === 8 ? 'Ćwierćfinał' : n === 16 ? '1/8 finału' : n === 32 ? '1/16 finału' : `${n / 2} meczów`;
const NT_AFTER = { 3: [0, 1], 9: [2, 3], 15: [4, 5], 30: [6, 7] };
function tournamentType(season) { const y = season + 1; return y % 4 === 0 ? 'EURO' : y % 4 === 2 ? 'WC' : 'NLF'; }
/* przerwa zimowa (długa: ok. 12 gru – 3 lut, krótka: 22 gru – 12 sty) */
const WINTER = { POL: 'long', SUI: 'long', AUT: 'long', CZE: 'long', DEN: 'long', UKR: 'long', CRO: 'long', SRB: 'long', HUN: 'long', ROU: 'long', SVK: 'long', BUL: 'long', SVN: 'long', BIH: 'long', GEO: 'long', MKD: 'long', MNE: 'long', ALB: 'long', GER: 'short', NED: 'short', BEL: 'short', SCO: 'short', TUR: 'short', GRE: 'short', CYP: 'short', ISR: 'short' };
const campCost = k => Math.round(Math.max(k === 2 ? 90000 : 35000, userClub().tv * (k === 2 ? 1.6 : 0.7)) / 10000) * 10000;
function winterSlots(d0, d1) {
  const out = [];
  for (const d of S.cal) if (d.t === 'L') { const t = new Date(d.date), m = t.getUTCMonth(), day = t.getUTCDate(); if ((m === 11 && day >= d0) || (m === 0 && (d1 >= 12 ? day <= d1 : true)) || (m === 1 && d1 < 12 && day <= d1)) out.push(d.ls); }
  return out;
}
function buildCalendar() {
  const cal = []; let date = Date.UTC(S.season, 7, 9);
  const DAY = 864e5;
  cal.push({ t: 'P', md: 0, date: date - 14 * DAY }, { t: 'P', md: 1, date: date - 10 * DAY }, { t: 'E', st: 'Q', r: 0, leg: 1, date: date - 8 * DAY }, { t: 'E', st: 'Q', r: 0, leg: 2, date: date - 4 * DAY });
  for (let ls = 0; ls < LS; ls++) {
    cal.push({ t: 'L', ls, date }); const base = date;
    const ci = CUP_AFTER.indexOf(ls); if (ci >= 0) cal.push({ t: 'C', slot: ci, date: base + 2 * DAY });
    if (Q_AFTER[ls]) { const [r, leg] = Q_AFTER[ls]; cal.push({ t: 'E', st: 'Q', r, leg, date: base + 3 * DAY }); }
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
const absDay = () => S.season * 400 + S.day;   // licznik dni niezależny od sezonu
function curLs() { for (let i = Math.min(S.day, S.cal.length - 1); i >= 0; i--) if (S.cal[i].t === 'L') return S.cal[i].ls; return 0; }
const windowOpen = () => { if (S.day >= S.cal.length) return true; const ls = curLs(); return S.day === 0 || ls <= 3 || (ls >= 20 && ls <= 23); };
const windowText = () => windowOpen() ? (curLs() <= 3 ? 'Letnie okno transferowe OTWARTE' : 'Zimowe okno transferowe OTWARTE') : 'Okno transferowe zamknięte';
const fmtDate = ms => new Date(ms).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* ---------- ligi ---------- */
function makeFixtures(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [], last = {}, homes = {};
  for (let r = 0; r < n - 1; r++) {
    const rd = [];
    for (let i = 0; i < n / 2; i++) {
      const x = arr[i], y = arr[n - 1 - i];
      // gospodarz: ten, kto ostatnio grał na wyjeździe (naprzemienność), potem mniej meczów u siebie
      let h;
      if (last[x] === 'a' && last[y] !== 'a') h = x; else if (last[y] === 'a' && last[x] !== 'a') h = y;
      else if ((homes[x] || 0) !== (homes[y] || 0)) h = (homes[x] || 0) < (homes[y] || 0) ? x : y;
      else h = (r + i) % 2 ? y : x;
      const a = h === x ? y : x;
      last[h] = 'h'; last[a] = 'a'; homes[h] = (homes[h] || 0) + 1;
      rd.push({ h, a, hg: 0, ag: 0, p: 0 });
    }
    rounds.push(rd); arr.splice(1, 0, arr.pop());
  }
  if (n > 24) return rounds;   // duże ligi (MLS, Argentyna): jedna runda – mieści się w kalendarzu
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
function countryRanking() { return Object.values(S.countries).filter(c => (c.conf || 'UEFA') === 'UEFA').map(c => ({ cc: c.code, tot: sum(c.coef), last: c.coef[4] })).sort((a, b) => b.tot - a.tot); }
const clubCoef = id => sum(S.ccoef[id] || [0]);
const isUEFA = c => (S.countries[c.cc].conf || 'UEFA') === 'UEFA';
/* ---------- klucz dostępu UEFA (wzorowany na 2024–27) ----------
   slot: [miejsce ('C' = zdobywca pucharu, liczba = kolejny klub z tabeli), puchar, runda: 'LP' lub 0–3 (I, II, III runda, play-off)] */
function accessList(n) {
  const L = (k, c) => Array.from({ length: k }, () => ['N', c, 'LP']);
  if (n <= 4) return [...L(4, 'CL'), ['C', 'EL', 'LP'], ['N', 'EL', 'LP'], ['N', 'ECL', 3]];
  if (n === 5) return [...L(3, 'CL'), ['C', 'EL', 'LP'], ['N', 'EL', 'LP'], ['N', 'ECL', 3]];
  if (n === 6) return [...L(2, 'CL'), ['N', 'CL', 2], ['C', 'EL', 'LP'], ['N', 'EL', 2], ['N', 'ECL', 2]];
  if (n <= 9) return [['N', 'CL', 'LP'], ['N', 'CL', 2], ['C', 'EL', 2], ['N', 'ECL', 2], ['N', 'ECL', 1]];
  if (n === 10) return [['N', 'CL', 'LP'], ['N', 'CL', 1], ['C', 'EL', 2], ['N', 'ECL', 1], ['N', 'ECL', 1]];
  if (n === 11) return [['N', 'CL', 3], ['N', 'CL', 1], ['C', 'EL', 2], ['N', 'ECL', 1], ['N', 'ECL', 1]];
  if (n === 12) return [['N', 'CL', 2], ['N', 'CL', 1], ['C', 'EL', 1], ['N', 'ECL', 1], ['N', 'ECL', 1]];
  if (n <= 15) return [['N', 'CL', 1], ['N', 'CL', 1], ['C', 'EL', 0], ['N', 'ECL', 1], ['N', 'ECL', 0]];
  if (n <= 17) return [['N', 'CL', 1], ['C', 'EL', 0], ['N', 'ECL', 1], ['N', 'ECL', 0]];
  if (n <= 33) return [['N', 'CL', 0], ['C', 'ECL', 1], ['N', 'ECL', 0], ['N', 'ECL', 0]];
  return [['N', 'CL', 0], ['C', 'ECL', 0], ['N', 'ECL', 0]];
}
function accessFor(cc, rank, eps) {
  const i = rank.findIndex(r => r.cc === cc); if (i < 0) return null;
  const sl = accessList(i + 1);
  if (eps.includes(cc)) { const k = sl.filter(x => x[1] === 'CL' && x[2] === 'LP').length; sl.splice(k, 0, ['N', 'CL', 'LP']); }
  return { slots: sl, n: i + 1, eps: eps.includes(cc) };
}
const QNAME = ['I runda eliminacji', 'II runda eliminacji', 'III runda eliminacji', 'Runda play-off'];
const QSHORT = ['I r. el.', 'II r. el.', 'III r. el.', 'play-off'];
// strefy europejskie w tabeli ligi (ranking prognozowany na przyszły sezon – jak po przesunięciu współczynników)
function euroZones(cc) {
  if ((S.countries[cc].conf || 'UEFA') !== 'UEFA') return null;
  const rank = Object.values(S.countries).filter(c => (c.conf || 'UEFA') === 'UEFA').map(c => { const r = S.cpts && S.cpts[c.code], now = r && r.n ? r.pts / r.n : 0; return { cc: c.code, tot: sum(c.coef.slice(1)) + now, last: now }; }).sort((a, b) => b.tot - a.tot);
  const eps = rank.slice().sort((a, b) => b.last - a.last).slice(0, 2).map(r => r.cc);
  const A = accessFor(cc, rank, eps); if (!A) return null;
  let pos = 0; const zones = [];
  for (const [k, comp, rd] of A.slots) { if (k === 'C') { zones.cup = { comp, rd }; continue; } pos++; zones.push({ from: pos, to: pos, comp, rd, qual: rd !== 'LP' }); }
  return { zones, rank: A.n, eps: A.eps, cup: zones.cup, total: A.slots.length };
}
function allocateEurope() {
  const rank = countryRanking();
  const eps = rank.slice().sort((a, b) => b.last - a.last).slice(0, 2).map(r => r.cc);
  const tableOf = cc => { const top = S.countries[cc].leagues[0]; return (S.lastTables[top] || S.leagues[top].clubs).filter(id => (club(id).lg === top || S.leagues[top].clubs.includes(id)) && !isReserve(club(id))); };
  const W = S.lastWinners || {}, used = new Set();
  const E = {}; for (const id of ['CL', 'EL', 'ECL']) E[id] = { teams: [], entry: [[], [], [], []] };
  // obrońcy tytułów: LM i LE → faza ligowa LM, LK → faza ligowa LE (ich miejsce z ligi przechodzi na kolejny klub)
  for (const [w, c] of [[W.CL, 'CL'], [W.EL, 'CL'], [W.ECL, 'EL']]) if (w != null && !used.has(w) && isUEFA(club(w))) { used.add(w); E[c].teams.push(w); }
  for (const r of rank) {
    const A = accessFor(r.cc, rank, eps), order = tableOf(r.cc), cw = S.lastCups ? S.lastCups[r.cc] : null;
    let k = 0; const next = () => { while (k < order.length && used.has(order[k])) k++; return order[k++]; };
    for (const [key, comp, rd] of A.slots) {
      let id = key === 'C' && cw != null && !used.has(cw) ? cw : next();
      if (id == null) continue; used.add(id);
      if (rd === 'LP') E[comp].teams.push(id); else E[comp].entry[rd].push(id);
    }
  }
  S.cpts = {}; for (const r of rank) S.cpts[r.cc] = { pts: 0, n: 0 };
  for (const id of used) S.cpts[club(id).cc].n++;
  S.euro = {};
  for (const id of ['CL', 'EL', 'ECL'])
    S.euro[id] = { id, name: COMP_NAME[id], teams: E[id].teams, lp: null, ko: {}, champion: null, q: { v: 2, alive: [], entry: E[id].entry, rounds: [], out: [] } };
}
const QLOW = { CL: 'EL', EL: 'ECL', ECL: null };
const qStrength = id => club(id).rep + clubCoef(id) * 0.3;
const euroOf = id => Object.values(S.euro).find(c => c.teams.includes(id) || (c.q && (c.q.alive.includes(id) || (c.q.entry || []).some(e => e.includes(id))))) || null;
const qLast = q => q.v === 2 ? 3 : 2;
function ensureQ(r) {
  const E = S.euro; if (!E.CL || !E.CL.q) return;
  let upperLast = 0;
  for (const id of ['CL', 'EL', 'ECL']) {
    const c = E[id], q = c.q, LAST = qLast(q);
    if (q.rounds[r]) { upperLast = r === LAST ? q.rounds[r].length : 0; continue; }
    if (q.entry && q.entry[r]) { q.alive.push(...q.entry[r].filter(x => !q.alive.includes(x))); q.entry[r] = []; }
    const alive = q.alive.slice().sort((x, y) => qStrength(y) - qStrength(x)), P = alive.length;
    const F = q.entry ? q.entry.slice(r + 1).reduce((a, e) => a + e.length, 0) : 0;
    const target = Math.max(0, 36 - c.teams.length - (r === LAST ? upperLast : 0));
    let ties = r < LAST ? clamp(Math.ceil((P + F - target) / (LAST + 1 - r)), 0, Math.floor(P / 2)) : clamp(P - target, 0, Math.floor(P / 2));
    const byes = alive.slice(0, P - 2 * ties), play = alive.slice(P - 2 * ties), T = [];
    for (let i = 0; i < ties; i++) { const s1 = play[i], s2 = play[play.length - 1 - i]; T.push(rnd() < 0.5 ? tie(s1, s2) : tie(s2, s1)); }
    if (r === LAST && byes.length > target) { const cut = byes.splice(target); q.alive = q.alive.filter(x => !cut.includes(x)); qDrop(id, cut, true); }
    q.rounds[r] = T; upperLast = r === LAST ? ties : 0;
    if (byes.includes(S.user)) msg(`${c.name}: wolny los`, r === LAST ? 'Jako najwyżej rozstawiony klub eliminacji awansujemy bez gry do fazy ligowej!' : `W rundzie „${QNAME[r]}” mamy wolny los – jako rozstawieni wchodzimy do gry w kolejnej rundzie.`);
  }
}
function qDrop(id, list, last) {
  const low = QLOW[id] && S.euro[QLOW[id]];
  for (const x of list) { if (low) { if (last) low.teams.push(x); else low.q.alive.push(x); } else S.euro[id].q.out.push(x); }
}
function finishQ(r) {
  const E = S.euro; if (!E.CL || !E.CL.q) return;
  for (const id of ['CL', 'EL', 'ECL']) {
    const q = E[id].q, T = q.rounds[r] || [];
    const losers = T.filter(t => t.w != null).map(t => t.w === t.a ? t.b : t.a);
    q.alive = q.alive.filter(x => !losers.includes(x));
    for (const t of T) if (t.a === S.user || t.b === S.user) {
      const won = t.w === S.user, low = QLOW[id] && E[QLOW[id]];
      const last = r === qLast(q);
      msg(won ? `✅ ${E[id].name}: awans!` : `❌ ${E[id].name}: odpadamy`, won ? (last ? `Wygraliśmy rundę play-off – zagramy w fazie ligowej!` : `Przechodzimy do kolejnej rundy eliminacji.`) : low ? `Przegraliśmy dwumecz, ale gramy dalej w rozgrywkach: ${low.name}${last ? ' (faza ligowa)' : ' (eliminacje)'}.` : 'Przegraliśmy dwumecz i żegnamy się z Europą w tym sezonie.');
    }
    qDrop(id, losers, r === qLast(q));
  }
  if (r === qLast(E.CL.q)) finalizeEurope();
}
function finalizeEurope() {
  const E = S.euro, W = S.lastWinners || {};
  for (const id of ['CL', 'EL', 'ECL']) { const c = E[id], rest = [...c.q.alive, ...(c.q.entry || []).flat()]; c.teams.push(...rest.filter(x => !c.teams.includes(x))); c.q.alive = []; if (c.q.entry) c.q.entry = [[], [], [], []]; }
  const inAny = x => ['CL', 'EL', 'ECL'].some(id => E[id].teams.includes(x));
  // nadmiar spada niżej, braki uzupełniają najlepsze kluby, które nie grają w Europie
  for (const id of ['CL', 'EL', 'ECL']) {
    const c = E[id];
    while (c.teams.length > 36) { const w = c.teams.filter(x => x !== W[id]).sort((x, y) => qStrength(x) - qStrength(y))[0]; c.teams.splice(c.teams.indexOf(w), 1); if (QLOW[id]) E[QLOW[id]].teams.push(w); }
  }
  const spare = S.clubs.filter(c => !inAny(c.id) && isUEFA(c)).sort((a, b) => S.leagues[a.lg].tier - S.leagues[b.lg].tier || b.rep - a.rep).map(c => c.id);
  for (const id of ['CL', 'EL', 'ECL']) while (E[id].teams.length < 36 && spare.length) E[id].teams.push(spare.shift());
  for (const [id, pots] of [['CL', 4], ['EL', 4], ['ECL', 6]]) {
    const c = E[id];
    c.teams.sort((a, b) => (b === W[id] ? 1 : 0) - (a === W[id] ? 1 : 0) || clubCoef(b) - clubCoef(a));
    c.lp = genLeaguePhase(c.teams, pots);
    for (const t of c.teams) reachStage(id, t, 'part');
  }
  const ec = Object.values(E).find(c => c.teams.includes(S.user));
  if (ec) msg(`Losowanie: ${ec.name}`, `Poznaliśmy rywali w fazie ligowej: ${ec.lp.map(rd => rd.find(f => f.h === S.user || f.a === S.user)).filter(Boolean).map(f => club(f.h === S.user ? f.a : f.h).name).join(', ')}.`);
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
  const P = PRIZE[comp], k = comp === 'CL' ? 1 : comp === 'EL' ? 0.75 : 0.5;
  if (hg > ag) { euroPts(h, 2 * k); euroMoney(h, P.win); } else if (hg < ag) { euroPts(a, 2 * k); euroMoney(a, P.win); }
  else { euroPts(h, k); euroPts(a, k); euroMoney(h, P.draw); euroMoney(a, P.draw); }
}
function qPts(comp, h, a, hg, ag) { const k = (comp === 'CL' ? 1 : comp === 'EL' ? 0.75 : 0.5) * 0.5; if (hg > ag) euroPts(h, 2 * k); else if (hg < ag) euroPts(a, 2 * k); else { euroPts(h, k); euroPts(a, k); } const P = PRIZE[comp]; euroMoney(h, Math.round(P.draw * 0.3)); euroMoney(a, Math.round(P.draw * 0.3)); }
function reachStage(comp, id, st) { const B = BONUS[comp][st]; if (B) euroPts(id, B); const P = PRIZE[comp][st]; if (P) euroMoney(id, P); }

/* ---------- reprezentacje ---------- */
const natLevel = n => 44 + n.str * 0.45;
function ntTeam(code) {
  const st = S.ntTeams[code], n = NAT[code];
  if (!st.sq.length || !S.nt || code !== S.nt) st.sq = autoCallup(code);
  return { id: 'N' + code, nation: code, name: n.name, short: code, col: ncol(code), rep: n.str, players: st.sq.map(pget).filter(Boolean), formation: st.formation, lineup: st.lineup, bench: st.bench, ment: st.ment, tac: st.tac, duty: st.duty, pm: st.pm, oi: st.oi, _st: st };
}
function syncNT(t) { if (t && t._st) { t._st.lineup = t.lineup; t._st.bench = t.bench; t._st.formation = t.formation; t._st.ment = t.ment; t._st.tac = t.tac; t._st.duty = t.duty; t._st.pm = t.pm; t._st.oi = t.oi; } }
function autoCallup(code) {
  const pool = (NATIDX.get(code) || []).filter(p => isAvail(p) && p.tid !== -3).sort((a, b) => b.ovr - a.ovr);
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
      for (const f of lg.fix[r]) clubDesc(f.h, f.a, { comp: 'L', label: lg.name + (derbyName(f.h, f.a) ? ' • 🔥 ' + derbyName(f.h, f.a) : '') }, m => {
        f.hg = m.home.goals; f.ag = m.away.goals; f.p = 1;
        const c = club(f.h), att = attendance(c, !!derbyName(f.h, f.a));
        c._att = att;
        const gate = Math.round(att * c.price * (c.id === S.user ? 1 + commLvl('gastro') * 0.06 : 1)); c.bal += gate; c.fin.inc += gate; c._gate = gate;
      });
    }
  } else if (d.t === 'E') {
    for (const comp of Object.values(S.euro)) {
      if (d.st === 'Q') {
        if (!comp.q) continue; ensureQ(d.r);
        const ql = `${comp.name} • ${QNAME[d.r]}`;
        for (const t of comp.q.rounds[d.r] || []) {
          if (d.leg === 1) clubDesc(t.a, t.b, { comp: comp.id, label: `${ql} – 1. mecz` }, m => { t.m1 = { hg: m.home.goals, ag: m.away.goals }; qPts(comp.id, t.a, t.b, t.m1.hg, t.m1.ag); });
          else if (t.m1) clubDesc(t.b, t.a, { comp: comp.id, label: `${ql} – rewanż`, ko: { aggH: t.m1.ag, aggA: t.m1.hg } }, m => { t.m2 = { hg: m.home.goals, ag: m.away.goals, pens: m.pens, et: m.et }; t.w = m.winner === 'h' ? t.b : t.a; qPts(comp.id, t.b, t.a, t.m2.hg, t.m2.ag); });
        }
        continue;
      }
      const lbl = `${comp.name} • ${STAGE_NAME[d.st]}`;
      if (d.st === 'LP') {
        if (!comp.lp) continue; const rd = comp.lp[d.md]; if (!rd) continue;
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
  } else if (d.t === 'C') {
    for (const cup of Object.values(S.cups)) {
      const r = d.slot - cup.slot0; if (r < 0 || r >= cup.R) continue;
      const ties = ensureCupRound(cup, r), rn = cupRoundName(ties.length * 2), fin = ties.length === 1;
      for (const t of ties) clubDesc(t.h, t.a, { comp: 'C', label: `${cup.name} • ${rn}`, neutral: fin, ko: { aggH: 0, aggA: 0 } }, m => {
        t.m = { hg: m.home.goals, ag: m.away.goals, pens: m.pens, et: m.et }; t.w = m.winner === 'h' ? t.h : t.a;
        const prize = Math.round(club(t.w).tv * (fin ? 6 : 1 + r * 0.5)); club(t.w).bal += prize; club(t.w).fin.inc += prize;
        if (fin) { cup.champion = t.w; if (t.w === S.user) msg(`🏆 ${cup.name}!`, `Zdobyliśmy ${cup.name}! Premia: ${money(prize)}. ${isUEFA(club(t.w)) ? 'Zwycięzca pucharu ma zapewnione miejsce w europejskich pucharach.' : ''}`); }
      });
    }
  } else if (d.t === 'P') {
    const P = S.pre; if (!P) return out;
    const T = P.chosen || P.offers[0], lbl = `${T.name} • ${d.md === 0 ? 'Półfinał' : 'Finał'}`;
    const pm = (h, a, label, done) => out.push({ h: club(h), a: club(a), opts: { comp: 'P', label, neutral: true, ko: { aggH: 0, aggA: 0 } }, done, user: h === S.user ? 'h' : a === S.user ? 'a' : null });
    if (d.md === 0) {
      const t = [S.user, ...T.teams]; T.sf = [{ h: t[0], a: t[1] }, { h: t[2], a: t[3] }];
      for (const x of T.sf) pm(x.h, x.a, lbl, m => { x.hg = m.home.goals; x.ag = m.away.goals; x.pens = m.pens; x.w = m.winner === 'h' ? x.h : x.a; });
    } else if (T.sf) {
      const W = T.sf.map(x => x.w), L = T.sf.map(x => x.w === x.h ? x.a : x.h);
      T.fin = { h: W[0], a: W[1] }; T.third = { h: L[0], a: L[1] };
      pm(W[0], W[1], `${T.name} • Finał`, m => { const x = T.fin; x.hg = m.home.goals; x.ag = m.away.goals; x.pens = m.pens; x.w = m.winner === 'h' ? x.h : x.a; finishPre(); });
      pm(L[0], L[1], `${T.name} • Mecz o 3. miejsce`, m => { const x = T.third; x.hg = m.home.goals; x.ag = m.away.goals; x.pens = m.pens; x.w = m.winner === 'h' ? x.h : x.a; });
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
  if (st === 'F') { comp.champion = t.w; reachStage(comp.id, t.w, 'champ'); }
}
function userMatchToday() {
  if (S.day >= S.cal.length) return null;
  return dayMatches(curDay()).find(x => x.user) || null;
}
/* wyniki na żywo: pozostałe mecze dnia z tych samych rozgrywek symulowane z góry, odsłaniane minuta po minucie */
let PRESIM = {};
function preSimOthers(ux) {
  PRESIM = {}; const out = [], key = ux.opts.label.split(' • ')[0].replace(/ – .*/, '');
  for (const x of dayMatches(curDay())) {
    if (x.user || x.nt) continue;
    const same = x.opts.comp === ux.opts.comp && (x.opts.comp !== 'L' || x.h.lg === ux.h.lg || x.h.lg === ux.a.lg) && (x.opts.comp !== 'C' || x.h.cc === (ux.h.cc || ux.a.cc)) && x.opts.label.split(' • ')[0].replace(/ – .*/, '') === key;
    if (!same) continue;
    const m = fastSim(x.h, x.a, x.opts); PRESIM[x.h.id + '-' + x.a.id] = m;
    out.push({ h: x.h, a: x.a, hs: m.home.scorers.map(g => g.min), as: m.away.scorers.map(g => g.min), fin: `${m.home.goals}:${m.away.goals}${m.pens ? ` (k. ${m.pens.h}:${m.pens.a})` : m.et ? ' (pd.)' : ''}` });
  }
  return out;
}
function hasUserMatchToday() { return !!userMatchToday(); }

/* ---------- przetwarzanie dnia ---------- */
function processDay(live) {
  const d = curDay(), ut = userClub();
  if (d.t === 'P' && S.pre && !S.pre.chosen) choosePre(0);
  S.offers = windowOpen() ? S.offers.filter(o => o.exp >= S.day) : [];
  recover(d.gap);
  const list = dayMatches(d), roundRes = [];
  let userRes = null;
  for (const x of list) {
    let m;
    const pk = x.h.id + '-' + x.a.id;
    if (live && x.user) m = live;
    else if (PRESIM[pk]) { m = PRESIM[pk]; delete PRESIM[pk]; }
    else { m = fastSim(x.h, x.a, x.opts); }
    if (x.nt) { syncNT(m.home.t); syncNT(m.away.t); }
    x.done(m);
    if (!x.nt) eloUpdate(x.h, x.a, m);
    if (x.user) userRes = { m, x };
    if (!x.nt && x.opts.comp !== 'P' && (x.h.id === S.user || x.a.id === S.user)) afterUserClubMatch(m, x);
    if (d.t === 'L' && !x.nt && x.h.lg === ut.lg) { roundRes.push({ x, m }); for (const sd of [m.home, m.away]) for (const r of Object.values(sd.rec)) if (r.g >= 3) news(`🎩 Hat-trick! ${r.p.n} (${sd.t.name}) strzela ${r.g} gole w meczu ${m.home.t.name} – ${m.away.t.name} (${m.home.goals}:${m.away.goals}).`); }
  }
  PRESIM = {};
  if (roundRes.length) roundNews(ut, roundRes);
  if (d.t === 'L') weekly(d);
  if (d.t === 'E' && d.st === 'Q' && d.leg === 2) finishQ(d.r);
  if (d.t === 'E' && d.st === 'Q' && S.euro.CL && S.euro.CL.q && d.r === qLast(S.euro.CL.q) && d.leg === 2 && S.user >= 0 && typeof setBoardObjective === 'function') { const ec = Object.values(S.euro).find(c => c.teams.includes(S.user)); if (ec) S.board.euro = euroGoal(ec); }
  if (d.t === 'E' && d.st === 'LP' && d.md === 7) for (const c of Object.values(S.euro)) lpBonus(c);
  if (d.t === 'E' && d.st === 'LP' && d.md === 5 && S.euro.ECL) lpBonus(S.euro.ECL);
  S.day++;
  if (S.day < S.cal.length && !windowOpen()) S.offers = [];
  let summary = null;
  if (S.day >= S.cal.length) summary = endSeason();
  return { userRes, summary, day: d };
}
/* ---------- ranking Elo klubów ---------- */
const eloOf = c => c.elo != null ? c.elo : (c.elo = Math.round(1000 + c.rep * 10));
function eloUpdate(h, a, m) {
  const eh = eloOf(h), ea = eloOf(a), adv = m.neutral ? 0 : 60;
  const exp = 1 / (1 + Math.pow(10, (ea - eh - adv) / 400));
  const gd = m.home.goals - m.away.goals, res = gd > 0 ? 1 : gd < 0 ? 0 : (m.pens ? (m.pens.h > m.pens.a ? 0.6 : 0.4) : 0.5);
  const K = (m.comp === 'P' ? 10 : m.comp === 'L' ? 20 : 30) * (Math.abs(gd) >= 3 ? 1.5 : Math.abs(gd) === 2 ? 1.25 : 1);
  const d = Math.round(K * (res - exp));
  h.elo = eh + d; a.elo = ea - d;
}
function eloRank() { return S.clubs.slice().sort((a, b) => eloOf(b) - eloOf(a)); }
function leagueRank() {
  return Object.values(S.leagues).map(lg => { const e = lg.clubs.map(id => eloOf(club(id))).sort((a, b) => b - a); return { lg, avg: Math.round(avg(e)), top: Math.round(avg(e.slice(0, 4))) }; }).sort((a, b) => b.avg - a.avg);
}
function lpBonus(c) {
  if (c._lpDone || !c.lp) return; if (c.lp.some(rd => rd.some(f => !f.p))) return;
  c._lpDone = true;
  const t = lpTable(c);
  t.forEach(r => { if (r.pos <= 8) reachStage(c.id, r.id, 'R16'); else if (r.pos <= 24) reachStage(c.id, r.id, 'PO'); });
  if (t.some(r => r.id === S.user)) {
    const r = t.find(x => x.id === S.user);
    msg(`${c.name}: koniec fazy ligowej`, r.pos <= 8 ? `Zajęliśmy ${r.pos}. miejsce – bezpośredni awans do 1/8 finału!` : r.pos <= 24 ? `Zajęliśmy ${r.pos}. miejsce – zagramy w barażach o 1/8 finału.` : `Zajęliśmy ${r.pos}. miejsce i odpadamy z rozgrywek.`);
  }
}
/* intensywność treningu: tempo rozwoju, regeneracja, ryzyko kontuzji */
const TR_INT = { '-1': { n: 'Lekki', dev: 0.8, fit: 0.5, inj: 0.85, d: 'Szybsza regeneracja, mniej kontuzji, lepsze nastroje – ale wolniejszy rozwój.' }, 0: { n: 'Normalny', dev: 1, fit: 0, inj: 1, d: 'Równowaga między rozwojem a świeżością.' }, 1: { n: 'Ciężki', dev: 1.25, fit: -0.4, inj: 1.3, d: 'Szybszy rozwój, ale wolniejsza regeneracja, kontuzje na treningach i narzekania mniej profesjonalnych zawodników.' } };
function recover(gap) {
  const ut = userClub();
  for (const p of PALL) {
    const c = p.tid >= 0 ? S.clubs[p.tid] : null;
    const mine = c === ut, rate = 2.0 + (c && c.training === 'fit' ? 0.5 : 0) + (mine ? (staffAb('fit') - 10) * 0.04 + TR_INT[S.trInt || 0].fit : 0);
    p.fit = Math.min(100, p.fit + gap * rate * (p.inj ? 1.4 : 1));
    if (p.inj) { p.inj = Math.max(0, p.inj - gap * (mine ? 0.75 + staffAb('phy') / 40 : 1)); if (!p.inj && c === ut) msg('Powrót do zdrowia', `${p.n} wrócił do pełnej sprawności.`); }
  }
}
/* ---------- derby i rywalizacje ---------- */
const RIVALS = [['Legia Warszawa', 'Polonia Warszawa', 'Derby Warszawy'], ['Wisła Kraków', 'Cracovia', 'Święta Wojna'], ['Legia Warszawa', 'Lech Poznań', 'Klasyk polskiej piłki'], ['Górnik Zabrze', 'Ruch Chorzów', 'Wielkie Derby Śląska'], ['Lechia Gdańsk', 'Arka Gdynia', 'Derby Trójmiasta'], ['ŁKS Łódź', 'Widzew Łódź', 'Derby Łodzi'], ['Legia Warszawa', 'Widzew Łódź', 'Klasyk'],
  ['Liverpool', 'Everton', 'Derby Merseyside'], ['Manchester City', 'Manchester United', 'Derby Manchesteru'], ['Arsenal', 'Tottenham Hotspur', 'Derby północnego Londynu'], ['Liverpool', 'Manchester United', 'North West Derby'], ['Newcastle United', 'Sunderland', 'Tyne–Wear Derby'], ['Aston Villa', 'Birmingham City', 'Derby Birmingham'],
  ['Real Madrid', 'FC Barcelona', 'El Clásico'], ['Real Madrid', 'Atlético Madrid', 'Derby Madrytu'], ['Sevilla', 'Real Betis', 'Derby Sewilli'], ['Athletic Club', 'Real Sociedad', 'Derby Basków'],
  ['Inter', 'AC Milan', 'Derby della Madonnina'], ['AS Roma', 'Lazio', 'Derby della Capitale'], ['Juventus', 'Torino', 'Derby della Mole'], ['Juventus', 'Inter', "Derby d'Italia"], ['Genoa', 'Sampdoria', 'Derby della Lanterna'],
  ['Borussia Dortmund', 'FC Schalke 04', 'Revierderby'], ['Bayern Monachium', 'Borussia Dortmund', 'Der Klassiker'], ['Hamburger SV', 'FC St. Pauli', 'Derby Hamburga'], ['1. FC Köln', 'Borussia Mönchengladbach', 'Derby Nadrenii'],
  ['Paris Saint-Germain', 'Olympique Marsylia', 'Le Classique'], ['Olympique Lyon', 'AS Saint-Étienne', 'Derby Rodanu'], ['Ajax', 'Feyenoord', 'De Klassieker'], ['Ajax', 'PSV Eindhoven', 'Topper'],
  ['Benfica', 'Sporting CP', 'Derby Lizbony'], ['FC Porto', 'Benfica', 'O Clássico'], ['Galatasaray', 'Fenerbahçe', 'Derby Stambułu'], ['Beşiktaş', 'Fenerbahçe', 'Derby Stambułu'], ['Galatasaray', 'Beşiktaş', 'Derby Stambułu'],
  ['Celtic', 'Rangers', 'Old Firm'], ['Olympiakos Pireus', 'Panathinaikos', 'Derby wiecznych rywali'], ['AEK Ateny', 'PAOK Saloniki', 'Derby Grecji'], ['Crvena zvezda', 'Partizan Belgrad', 'Wieczne derby'], ['Dinamo Zagrzeb', 'Hajduk Split', 'Wieczne derby'],
  ['Slavia Praga', 'Sparta Praga', 'Derby Pragi'], ['Rapid Wiedeń', 'Austria Wiedeń', 'Derby Wiednia'], ['Club Brugge', 'RSC Anderlecht', 'Klasyk Belgii'], ['RSC Anderlecht', 'Standard Liège', 'Klasyk Belgii'], ['FC Kopenhaga', 'Brøndby IF', 'Derby Kopenhagi'],
  ['AIK Solna', 'Djurgårdens IF', 'Derby Sztokholmu'], ['Djurgårdens IF', 'Hammarby IF', 'Derby Sztokholmu'], ['Dynamo Kijów', 'Szachtar Donieck', 'Klasyk Ukrainy'], ['FC Basel', 'FC Zürich', 'Klasyk Szwajcarii'], ['Rosenborg BK', 'Molde FK', 'Klasyk Norwegii'],
  ['Boca Juniors', 'River Plate', 'Superclásico'], ['Flamengo', 'Fluminense', 'Fla-Flu'], ['Corinthians', 'Palmeiras', 'Derby Paulista'], ['LA Galaxy', 'Los Angeles FC', 'El Tráfico'], ['Club América', 'Guadalajara', 'Clásico Nacional'],
  ['Ferencváros', 'Újpest', 'Derby Budapesztu'], ['FCSB', 'Dinamo Bukareszt', 'Wieczne derby'], ['Maccabi Tel Awiw', 'Hapoel Tel Awiw', 'Derby Tel Awiwu'], ['APOEL Nikozja', 'Omonia Nikozja', 'Derby Nikozji'], ['Lewski Sofia', 'CSKA Sofia', 'Wieczne derby'], ['Linfield', 'Glentoran', 'Big Two'], ['Al-Hilal', 'Al-Nassr', 'Derby Rijadu'], ['Al-Ittihad', 'Al-Ahli', 'Derby Dżuddy']];
let RIVAL_IDX = null;
function resetCaches() { RIVAL_IDX = null; }
function derbyName(a, b) {
  if (!RIVAL_IDX) { RIVAL_IDX = {}; const byName = {}; for (const c of S.clubs) byName[c.name] = c.id; for (const [x, y, n] of RIVALS) if (byName[x] != null && byName[y] != null) RIVAL_IDX[Math.min(byName[x], byName[y]) + '-' + Math.max(byName[x], byName[y])] = n; }
  if (a == null || b == null) return null; return RIVAL_IDX[Math.min(a, b) + '-' + Math.max(a, b)] || null;
}
function h2hRec(opp) { const r = (S.h2h || {})[opp]; return r || { w: 0, d: 0, l: 0 }; }
function roundNews(ut, res) {
  const lg = S.leagues[ut.lg], big = res.slice().sort((a, b) => Math.abs(b.m.home.goals - b.m.away.goals) - Math.abs(a.m.home.goals - a.m.away.goals))[0];
  const up = res.filter(r => Math.abs(eloOf(r.x.h) - eloOf(r.x.a)) > 120).find(r => { const fav = eloOf(r.x.h) > eloOf(r.x.a) ? 'h' : 'a', gd = r.m.home.goals - r.m.away.goals; return fav === 'h' ? gd < 0 : gd > 0; });
  const lead = club(table(ut.lg)[0].id);
  const parts = [`Lider: ${lead.name}`];
  if (big && Math.abs(big.m.home.goals - big.m.away.goals) >= 3) parts.push(`najwyższe zwycięstwo: ${big.m.home.t.name} – ${big.m.away.t.name} ${big.m.home.goals}:${big.m.away.goals}`);
  if (up) parts.push(`niespodzianka: ${up.m.home.t.name} – ${up.m.away.t.name} ${up.m.home.goals}:${up.m.away.goals}`);
  news(`📋 ${lg.name}, kolejka: ${parts.join(' • ')}.`);
}
/* ---------- rekordy klubu i jubileusze ---------- */
function clubRec() { S.crec = S.crec || {}; return S.crec[S.user] = S.crec[S.user] || { all: {}, bigWin: null, bigLoss: null, buy: null, sale: null, crowd: 0 }; }
function recordsAfterMatch(m, mine, opp) {
  const R = clubRec(), gd = mine.goals - opp.goals, txt = `${m.home.t.name} – ${m.away.t.name} ${m.home.goals}:${m.away.goals} (${SEASON_LABEL(S.season)})`;
  if (gd > 0 && (!R.bigWin || gd > R.bigWin.gd)) { if (R.bigWin) news(`📜 Rekord klubu: najwyższe zwycięstwo w historii ${mine.t.name} – ${txt}!`); R.bigWin = { gd, txt }; }
  if (gd < 0 && (!R.bigLoss || gd < R.bigLoss.gd)) R.bigLoss = { gd, txt };
  if (mine.t._att && mine === m.home) R.crowd = Math.max(R.crowd, mine.t._att);
  for (const r of Object.values(mine.rec)) {
    const a = R.all[r.p.id] = R.all[r.p.id] || { n: r.p.n, apps: 0, g: 0, a: 0 }; a.apps++; a.g += r.g; a.a += r.a;
    for (const [k, lim, t] of [['apps', [50, 100, 150, 200, 250, 300], 'występ'], ['g', [25, 50, 75, 100, 150], 'gol']]) if (lim.includes(a[k]) && (k === 'apps' || r.g > 0)) {
      r.p.mor = clamp(r.p.mor + 5, 0, 100); S.fans = clamp((S.fans || 60) + 1, 0, 100);
      msg(`🎉 Jubileusz: ${r.p.n}`, `${r.p.n} zanotował ${a[k]}. ${t === 'gol' ? 'gola' : 'występ'} w barwach klubu ${mine.t.name}! Kibice przygotowali oprawę na jego cześć.`);
    }
  }
}
function afterUserClubMatch(m, x) {
  const mine = x.user === 'h' ? m.home : m.away, opp = x.user === 'h' ? m.away : m.home;
  const gd = mine.goals - opp.goals;
  let d = gd > 0 ? 2 : gd < 0 ? -2.5 : 0;
  d += clamp((opp.t.rep - mine.t.rep) / 25, -1, 1) * (gd > 0 ? 1 : gd < 0 ? 0.6 : 0.5);
  if (m.comp !== 'L') d *= 0.6;
  const dn = derbyName(mine.t.id, opp.t.id);
  if (dn) { d *= 1.6; S.fans = clamp(S.fans + (gd > 0 ? 4 : gd < 0 ? -5 : 0), 0, 100); for (const p of mine.t.players) p.mor = clamp(p.mor + (gd > 0 ? 4 : gd < 0 ? -4 : 0), 0, 100); if (gd !== 0) msg(gd > 0 ? `🔥 Wygraliśmy ${dn}!` : `💔 Przegrane ${dn}`, gd > 0 ? 'Miasto należy do nas! Kibice świętują, a zawodnicy są w świetnych nastrojach.' : 'Bolesna porażka z największym rywalem. Kibice nie zapomną tego szybko.'); }
  recordsAfterMatch(m, mine, opp);
  S.h2h = S.h2h || {}; const hr = S.h2h[opp.t.id] = S.h2h[opp.t.id] || { w: 0, d: 0, l: 0 }; if (gd > 0) hr.w++; else if (gd < 0) hr.l++; else hr.d++;
  S.board.conf = clamp(S.board.conf + d, 0, 100);
  mgrGain(gd > 0 ? (opp.t.rep > mine.t.rep ? 0.25 : 0.12) : gd < 0 ? -0.06 : 0.03);
  if (typeof afterMatchMeta === 'function') afterMatchMeta(m, x, mine, opp, gd);
  for (const e of m.ev) if (e.type === 'injury' && e.side === x.user) msg('Kontuzja', e.text.replace('🚑 ', ''));
}

/* ---------- tydzień ---------- */
/* ---------- nagrody: piłkarz miesiąca, nagrody sezonu ---------- */
const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
function monthAwards(d) {
  const mo = new Date(d.date).getUTCMonth(), ut = userClub(), lg = S.leagues[ut.lg];
  if (S.moNow == null) S.moNow = mo;
  if (!S.moSnap) { S.moSnap = {}; for (const p of lg.clubs.flatMap(id => club(id).players)) S.moSnap[p.id] = [p.st.apps, p.st.rs, p.st.g, p.st.a]; }
  if (mo === S.moNow) return;
  const prevMo = S.moNow; S.moNow = mo;
  const snap = S.moSnap || {}, ps = lg.clubs.flatMap(id => club(id).players);
  {
    const sc = ps.map(p => { const o = snap[p.id] || [0, 0, 0, 0], apps = p.st.apps - o[0]; if (apps < 3) return null; const r = (p.st.rs - o[1]) / apps, g = p.st.g - o[2], a = p.st.a - o[3]; return { p, r, g, a, v: r + g * 0.12 + a * 0.06 }; }).filter(Boolean).sort((x, y) => y.v - x.v);
    const w = sc[0];
    if (w) {
      const p = w.p, c = clubOf(p), mine = p.tid === S.user;
      (p.awards = p.awards || []).push({ k: 'potm', s: S.season, m: prevMo, lg: lg.name });
      (S.pawards = S.pawards || []).push({ k: 'potm', s: S.season, m: prevMo, pid: p.id, n: p.n, club: c ? c.short : '', lg: lg.id });
      news(`🏅 Piłkarz miesiąca (${MONTHS[prevMo]}) – ${lg.name}: ${p.n} (${c ? c.name : ''}) – śr. ocena ${w.r.toFixed(2)}, ${plural(w.g, 'gol', 'gole', 'goli')}, ${plural(w.a, 'asysta', 'asysty', 'asyst')}.`);
      if (mine) { p.mor = clamp(p.mor + 10, 0, 100); p.val = Math.round(p.val * 1.05); msg('🏅 Piłkarz miesiąca!', `${p.n} został wybrany piłkarzem miesiąca (${MONTHS[prevMo]}) – liga: ${lg.name}! Średnia ocena ${w.r.toFixed(2)}, ${plural(w.g, 'gol', 'gole', 'goli')} i ${plural(w.a, 'asysta', 'asysty', 'asyst')}. Morale i wartość zawodnika rosną.`); }
      // trener miesiąca: najlepszy bilans punktowy w miesiącu (tylko gdy to Ty)
    }
  }
  S.moSnap = {}; for (const p of ps) S.moSnap[p.id] = [p.st.apps, p.st.rs, p.st.g, p.st.a];
}
function seasonAwards(lgId, finals) {
  const lg = S.leagues[lgId], ps = lg.clubs.flatMap(id => club(id).players), out = [];
  const best = (f, min) => ps.filter(p => p.st.apps >= min && f(p) >= 0).sort((a, b) => f(b) - f(a))[0];
  const rate = p => p.st.rs / Math.max(1, p.st.apps) + p.st.g * 0.04 + p.st.a * 0.025;
  const add = (k, n, p, val) => { if (!p) return; (p.awards = p.awards || []).push({ k, s: S.season, lg: lg.name }); (S.pawards = S.pawards || []).push({ k, s: S.season, pid: p.id, n: p.n, club: clubOf(p) ? clubOf(p).short : '', lg: lgId }); out.push(`${n}: ${p.n} (${clubOf(p) ? clubOf(p).name : ''}${val ? ', ' + val : ''})`); if (p.tid === S.user) { p.mor = clamp(p.mor + 12, 0, 100); p.val = Math.round(p.val * 1.08); } };
  add('pots', '⭐ Piłkarz sezonu', best(rate, Math.round(lg.fix.length * 0.5)), null);
  add('yots', '🌱 Młodzieżowiec sezonu', best(p => p.age <= 21 ? rate(p) : -1, Math.round(lg.fix.length * 0.35)), null);
  const gb = ps.slice().sort((a, b) => b.lg - a.lg || b.st.a - a.st.a)[0]; if (gb && gb.lg > 0) add('boot', '👟 Król strzelców', gb, plural(gb.lg, 'gol', 'gole', 'goli'));
  const ch = finals[lgId] && finals[lgId][0];
  if (ch && ch.id === S.user) { (S.pawards = S.pawards || []).push({ k: 'motm', s: S.season, n: S.manager, club: userClub().short, lg: lgId }); out.push(`🧑‍💼 Trener sezonu: ${S.manager}`); mgrGain(1); }
  return out;
}
function boardMeeting(d) {
  if (![12, 24, 36].includes(d.ls)) return;
  const ut = userClub(), c = S.board.conf; let g = c >= 80 ? 'A' : c >= 65 ? 'B' : c >= 50 ? 'C' : c >= 35 ? 'D' : 'F';
  if (ut.bal < 0 && (g === 'A' || g === 'B')) g = 'C';   // długi psują ocenę mimo wyników
  const side = (S.board.side || []).filter(x => x.season === S.season).map(x => `• ${x.t}: ${BOARD_GOALS[x.k][2](ut, x)}`).join('\n');
  let extra = '';
  if (g === 'A') { const b = Math.round(Math.max(ut.tb, 0) * 0.1 / 1e4) * 1e4 + Math.round(ut.tv * 2); ut.tb += b; extra = ` Zarząd jest zachwycony i zwiększa budżet transferowy o ${money(b)}.`; }
  else if (g === 'F') extra = ' Zarząd ostrzega: bez szybkiej poprawy wyników dojdzie do zmiany trenera.';
  msg(`🏛️ Spotkanie z zarządem – ocena ${g}`, `${S.board.text}${extra}\nCele dodatkowe:\n${side || '• brak'}`);
}
function weekly(d) {
  const ut = userClub();
  monthAwards(d); boardMeeting(d); roleWeek();
  S.uhist = S.uhist || []; S.uhist.push({ s: S.season, ls: d.ls, elo: eloOf(ut), pos: leaguePos(ut), bal: ut.bal }); if (S.uhist.length > 400) S.uhist.splice(0, S.uhist.length - 400);
  for (const c of S.clubs) {
    const wages = sum(c.players.map(p => p.wage)) + (c.id === S.user ? sum(S.scouts.map(s => s.cost)) + acadCost() + staffCost() : 0);
    const inc = c.tv + c.spons + (c.id === S.user ? hotelIncome() + shopIncome() : 0);
    c.bal += inc - wages; c.fin.inc += inc; c.fin.exp += wages;
    if (c.id === S.user) { c.lastFin = { gate: c._gate || 0, tv: c.tv, spons: c.spons, wages, net: inc + (c._gate || 0) - wages }; c.tb += Math.round((inc + (c._gate || 0) - wages) * 0.25); }
    c._gate = 0;
    const ranked = c.players.slice().sort((a, b) => b.ovr - a.ovr);
    const fac = c.id === S.user ? 0.8 + 0.15 * S.fac.train : 0.8 + c.rep / 250;
    const focus = { att: 'ATT', def: 'DEF', bal: 'MID' }[c.training], TI = c.id === S.user ? TR_INT[S.trInt || 0] : null;
    if (TI) { // intensywność treningu: kontuzje na treningu i nastroje
      if (S.trInt === 1 && rnd() < 0.07) { const v = pick(c.players.filter(p => !p.inj && !p.loan)); if (v) { const ij = injure(v); msg('🚑 Kontuzja na treningu', `${v.n} doznał urazu na ciężkim treningu (${ij.type}) – przerwa ok. ${plural(Math.ceil(ij.days / 7), 'tydzień', 'tygodnie', 'tygodni')}.`); } }
      for (const p of c.players) p.mor = clamp(p.mor + (S.trInt === 1 ? (traits(p).pro < 10 ? -0.4 : 0) : S.trInt === -1 ? 0.2 : 0), 0, 100);
    }
    ranked.forEach((p, i) => {
      const exp = i < 5 ? 0.8 : i < 12 ? 0.6 : i < 18 ? 0.3 : 0.1;
      p.mor = clamp(p.mor + (p.pt - exp) * 5 + (62 - p.mor) * 0.05 - (p.listed ? 1 : 0) - (p.con <= 1 && d.ls > 25 && c.id === S.user ? 0.5 : 0), 0, 100);
      p.shp = Math.max(20, p.shp - 4);
      p.form = Math.round(p.form + (50 - p.form) * 0.04);
      let ch = p.age <= 20 ? 0.06 : p.age <= 23 ? 0.04 : p.age <= 26 ? 0.015 : p.age <= 29 ? 0.004 : 0;
      ch *= fac * (0.6 + 0.8 * clamp(p.pt, 0, 1)) * (focus && (LINE[p.pos] === focus || (focus === 'DEF' && p.pos === 'GK')) ? 1.5 : 1);
      if (p.loan && p.tid !== p.loan.from) ch *= 1.2;
      if (TI) ch *= TI.dev;
      if (ch) ch *= (0.75 + traits(p).pro / 40) * clamp((p.pot - p.ovr) / 8, 0.5, 1.6) * (S.mentors && S.mentors.some(x => x.p === p.id) ? 1.3 : 1) * (p.pos === 'GK' && c.id === S.user && S.staff ? 0.85 + staffAb('gk') / 60 : 1) * (c.id === S.user ? 0.9 + staffAb('ass') / 100 : 1);
      if (ch && p.ovr < p.pot && rnd() < ch) {
        develop(p, 1);
        if (p.focus != null && p.a[p.focus] < 99) { p.a[p.focus] = Math.min(99, p.a[p.focus] + 0.8); p.ovr = Math.min(calcOvr(p.pos, p.a), p.pot); }
        p.val = calcValue(p);
      }
      if (p.retrain && c.id === S.user) {
        p.retrain.prog += 0.6 + traits(p).pro / 25;
        if (p.retrain.prog >= 12) { p.alt = [...new Set([p.retrain.pos, ...(p.alt || [])])].slice(0, 3); msg('Przekwalifikowanie', `${p.n} opanował nową pozycję: ${POS_PL[p.retrain.pos]}.`); p.retrain = null; }
      }
      if (p.age >= 31 && rnd() < 0.012 * (p.age - 30)) { develop(p, -1); p.val = calcValue(p); }
    });
  }
  for (const p of S.virt) { p.shp = 70; p.mor = 65; }
  academyWeek(d);
  mentorWeek();
  coachMarket(d);
  if (typeof eventsWeek === 'function') eventsWeek(d);
  scoutingWeek();
  if (windowOpen()) { genOffers(); aiTransfers(); }
  if (d.ls === 30) { const exp = ut.players.filter(p => p.con <= 1 && !p.loan); if (exp.length) msg('Kontrakty wygasają', `Z końcem sezonu wygasają kontrakty: ${exp.map(shortName).join(', ')}. Przedłuż je w karcie zawodnika.`); }
  if (d.ls === 4) msg('Okno zamknięte', 'Letnie okno transferowe zostało zamknięte. Wolnych agentów możesz podpisywać zawsze.');
  if (d.ls === 2 || d.ls === 22) deadlineDays(ut);
  if (d.ls === 20) msg('Zimowe okno transferowe', 'Otwiera się zimowe okno transferowe (do kolejki 24).');
  if (WINTER[ut.cc] && S.campS !== S.season && S.leagues[ut.lg].lsMap[d.ls] === -1 && winterSlots(WINTER[ut.cc] === 'long' ? 12 : 22, WINTER[ut.cc] === 'long' ? 3 : 12).includes(d.ls) && typeof pushEvent === 'function') {
    S.campS = S.season; news(`❄️ ${S.leagues[ut.lg].name}: przerwa zimowa – liga wraca ${WINTER[ut.cc] === 'long' ? 'na początku lutego' : 'w połowie stycznia'}.`);
    pushEvent(EVENTS.find(e => e.id === 'wintercamp'), {});
  }
  if (d.ls % 5 === 4) S.board.conf = clamp(S.board.conf + clamp(S.board.target - leaguePos(ut), -4, 4) * 1.3, 0, 100);
  { const r = ut.price / basePrice(ut); if (r > 1.25 && S.fans != null) S.fans = clamp(S.fans - (r - 1.25) * 3, 0, 100); }
  // ostrzeżenie finansowe: przy obecnym tempie saldo spadnie poniżej zera
  if (d.ls % 4 === 2 && ut.bal > 0 && ut._lastW != null) { const wk = ut.bal - ut._lastW; if (wk < 0 && ut.bal / -wk < 12 && absDay() - (S._finWarn || -99) > 40) { S._finWarn = absDay(); msg('💸 Uwaga na finanse', `Klub traci ok. ${money(-wk)} tygodniowo. Przy tym tempie saldo spadnie poniżej zera za ok. ${plural(Math.round(ut.bal / -wk), 'tydzień', 'tygodnie', 'tygodni')}. Rozważ sprzedaż zawodników, wyższe ceny biletów lub cięcie kosztów.`); } }
  ut._lastW = ut.bal;
  // miesięczny raport treningowy: kto rośnie, kto słabnie (względem początku sezonu)
  if (d.ls % 8 === 7) { const ch = ut.players.filter(p => p.ovrS != null).map(p => ({ p, d: p.ovr - p.ovrS })); const up = ch.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 3), dn = ch.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 3);
    if (up.length || dn.length) msg('🏋️ Raport treningowy', `${up.length ? 'Najwięcej zyskali od początku sezonu: ' + up.map(x => `${x.p.n} (+${x.d})`).join(', ') + '.' : 'Nikt jeszcze wyraźnie nie urósł.'}${dn.length ? '\nSłabsza forma fizyczna/umiejętności: ' + dn.map(x => `${x.p.n} (${x.d})`).join(', ') + '.' : ''}\nTrening drużyny: ${({ bal: 'zrównoważony', fit: 'kondycja', att: 'atak', def: 'obrona' })[ut.training || 'bal']} • ośrodek ${S.fac.train}/5.`); }
  if (ut.tb > ut.bal) ut.tb = Math.max(0, ut.bal);
  if (ut.bal < 0) { S.board.conf = clamp(S.board.conf - clamp(-ut.bal / (20 * (ut.tv + ut.spons)), 0.5, 4), 0, 100); ut.tb = Math.min(ut.tb, 0); if (d.ls % 6 === 0) msg('Długi klubu', `Saldo klubu jest ujemne (${money(ut.bal)}). Zarząd zamroził budżet transferowy i traci cierpliwość.`); }
  if (d.ls >= 10 && absDay() - (S.board.hired != null ? S.board.hired : -999) > 60 && S.board.conf <= 12 - legendBuf() * 0.4) boardCrisis(null, false);   // 60 dni miesiąca miodowego
}

/* ---------- skauting ---------- */
const hashN = id => ((id * 2654435761) >>> 0) % 1000 / 1000;
function baseKnow(p) {
  const ut = userClub();
  if (p.tid === S.user) return 100;
  if (p.tid === -3) return 92;
  let k = 30;
  const c = clubOf(p);
  if (c) { if (c.lg === ut.lg) k = 82; else if (c.cc === ut.cc) k = 62; if (c.rep >= 85) k = Math.max(k, 70); }
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
  if (p.tid === -3) return 'Junior (akademia)';
  const c = clubOf(p); if (!c) return 'Wolny';
  const i = c.players.slice().sort((a, b) => b.ovr - a.ovr).indexOf(p);
  return i < 5 ? 'Kluczowy' : i < 12 ? 'Podstawowy' : i < 18 ? 'Rotacyjny' : p.age <= 21 ? 'Perspektywiczny' : 'Rezerwowy';
}
function askPrice(p) {
  const st = playerStatus(p), disc = p._disc && p._disc.until > absDay() ? p._disc.k : 1;
  const r = p.val * disc * (1 + 0.05 * p.con + (st === 'Kluczowy' ? 0.2 : st === 'Podstawowy' ? 0.08 : 0));
  const step = r >= 1e7 ? 5e5 : r >= 1e6 ? 5e4 : 1e4;
  return Math.round(r / step) * step;
}
// klauzula odstępnego: w Hiszpanii każdy, gdzie indziej co ~7. zawodnik
function releaseClause(p) {
  const c = clubOf(p); if (!c || p.loan) return 0;
  const h = hashN(p.id * 7 + 3), m = c.cc === 'ESP' ? 2.5 + h * 2 : h < 0.15 ? 1.8 + h * 6 : 0;
  if (!m) return 0; const v = p.val * m, step = v >= 1e7 ? 1e6 : 1e5; return Math.max(step, Math.round(v / step) * step);
}
const INST_K = 1.1, INST_UP = 0.4;   // raty: 40% teraz, reszta w 2 ratach, łącznie +10%
function upfront(fee, o) { return o && o.inst ? Math.round(fee * INST_K * INST_UP) : fee; }
function notForSale(p) { const c = clubOf(p); return c && c.rep >= userClub().rep && playerStatus(p) === 'Kluczowy'; }
function clubResponse(p, fee, o = {}) {
  const ut = userClub(), c = clubOf(p), now = upfront(fee, o);
  if (!windowOpen()) return { res: 'reject', msg: 'Okno transferowe jest zamknięte.' };
  if (p._noTalk && p._noTalk > absDay()) return { res: 'reject', msg: `${c.name} zerwał rozmowy – spróbuj ponownie za kilka tygodni.` };
  const owed = sum((S.debts || []).filter(d => d.from == null || d.from === ut.id).map(d => d.amt * d.left));
  if (o.inst && now + owed > ut.tb) return { res: 'reject', msg: `Zarząd nie zgodzi się na kolejne raty – do spłaty zostało już ${money(owed)}.` };
  if (now > ut.tb) return { res: 'reject', msg: o.inst ? 'Nawet pierwsza rata przekracza budżet transferowy.' : 'Przekraczasz budżet transferowy (spróbuj płatności w ratach).' };
  if (now > ut.bal) return { res: 'reject', msg: 'Brak środków na koncie klubu.' };
  if (p.loan) return { res: 'reject', msg: 'Zawodnik jest wypożyczony.' };
  const rc = releaseClause(p);
  if (rc && fee >= rc && !o.inst) return { res: 'accept', msg: `Wpłacamy klauzulę odstępnego (${money(rc)}) – ${c.name} nie może odmówić.` };
  if (c.players.length <= 18) return { res: 'reject', msg: `${c.name} nie sprzeda zawodnika – zbyt wąska kadra.` };
  if (o.inst && fee < 1e6) return { res: 'reject', msg: `${c.name} przy tak małej kwocie chce całości od razu.` };
  let ask = askPrice(p);
  if (o.sellOn) ask = Math.round(ask * 0.9);
  if (o.inst) ask = Math.round(ask * (c.bal < 0 ? 1.08 : 1.02));
  if (notForSale(p) && fee < p.val * 1.8) return { res: 'reject', msg: `${c.name}: „Ten zawodnik nie jest na sprzedaż.” (chyba że za ok. ${money(Math.round(p.val * 1.8 / 5e5) * 5e5)})` };
  const step = ask >= 1e7 ? 5e5 : ask >= 1e6 ? 5e4 : 1e4; ask = Math.round(ask / step) * step;
  // ukryte minimum klubu: zwykle 88–97% ceny wywoławczej (mniej, gdy klub ma długi lub zawodnik jest rezerwowym)
  const st = playerStatus(p), minAcc = Math.round(ask * (0.88 + 0.09 * hashN(p.id * 13 + S.season)) * (c.bal < 0 ? 0.94 : 1) * (st === 'Rezerwowy' || st === 'Rotacyjny' ? 0.96 : 1) / step) * step;
  if (fee >= Math.min(ask, minAcc)) { p._bids = 0; p._ctr = null; return { res: 'accept', msg: fee >= ask ? `${c.name} akceptuje ofertę ${money(fee)}.` : `${c.name} po namyśle akceptuje ${money(fee)}${fee <= p.val ? ' – dobry interes!' : '.'}` }; }
  if (p._bidDay && absDay() - p._bidDay > 45) { p._bids = 0; p._ctr = null; }
  p._bidDay = absDay();
  p._bids = (p._bids || 0) + (fee < ask * 0.7 ? 2 : fee < ask * 0.8 ? 1.5 : 1);   // bardzo niska oferta mocniej nadwyręża cierpliwość
  const maxB = 4 + (c.bal < 0 ? 1 : 0);
  if (p._bids >= maxB) { p._bids = 0; p._ctr = null; p._noTalk = absDay() + 30; return { res: 'reject', msg: `${c.name} traci cierpliwość i zrywa rozmowy na miesiąc.` }; }
  const left = maxB - p._bids;
  if (fee >= ask * 0.7) {
    const prev = p._ctr && p._ctr <= ask ? p._ctr : ask;
    // kontroferta nie zdradza minimum – margines nad minimum zanika dopiero przy ostatniej ofercie
    const margin = (ask - minAcc) * clamp(0.75 - 0.25 * p._bids, 0, 0.75) * (0.8 + 0.4 * hashN(p.id * 3 + p._bids));
    const ctr = Math.max(minAcc + Math.round(margin / step) * step, Math.round((prev - (prev - fee) * 0.4) / step) * step);
    p._ctr = ctr;
    const lf = Math.max(1, Math.floor(left));
    return { res: 'counter', counter: ctr, msg: `${c.name} odrzuca ${money(fee)} i proponuje ${money(ctr)}${ctr < ask ? ' (mniej niż cena wywoławcza)' : ''}. (cierpliwość: jeszcze ${lf} ${lf === 1 ? 'oferta' : 'oferty'})` };
  }
  { const lf = Math.max(1, Math.floor(left)); return { res: 'reject', msg: `${c.name} odrzuca ofertę – zdecydowanie za mało. (cierpliwość: jeszcze ${lf} ${lf === 1 ? 'oferta' : 'oferty'})` }; }
}
function wageDemand(p) {
  const ut = userClub(), c = clubOf(p);
  const base = Math.max(calcWage(p, ut.rep), c ? Math.min(calcWage(p, c.rep), (p.wage || 0) * 0.9) : 0);   // nie zejdzie mocno poniżej obecnej pensji
  const gap = c ? presOf(c) - presOf(ut) : 0, f = (1 + Math.max(0, gap) * 0.1) * (1.08 - presOf(ut) * 0.012);
  return Math.round(base * f * (p.age > 30 ? 0.9 : 1) / 100) * 100;
}
/* ---------- prestiż klubu (1–10, w UI 5 gwiazdek) – rośnie powoli przy długotrwałych sukcesach ---------- */
const presOf = c => c.pres != null ? c.pres : (c.pres = Math.round(clamp(1 + (c.rep - 25) / 8, 1, 10) * 10) / 10);
function prestigeSeason(finals) {
  const cupW = new Set(Object.values(S.cups || {}).map(c => c.champion).filter(x => x != null)), eu = {};
  for (const c of Object.values(S.euro || {})) {
    const w = c.id === 'CL' ? 1 : c.id === 'EL' ? 0.6 : 0.4;
    for (const t of c.teams) eu[t] = (eu[t] || 0) + 0.5 * w;
    for (const st of ['R16', 'QF', 'SF', 'F']) for (const x of c.ko[st] || []) for (const t of [x.a, x.b]) eu[t] = (eu[t] || 0) + 0.25 * w;
    if (c.champion != null) eu[c.champion] = (eu[c.champion] || 0) + 1.5 * w;
  }
  const champ = new Set(Object.keys(finals).map(id => finals[id][0] && finals[id][0].id)), out = {}, lgAvg = {};
  for (const lg of Object.values(S.leagues)) lgAvg[lg.id] = avg(lg.clubs.map(id => eloOf(club(id))));
  for (const c of S.clubs) {
    const tier = S.leagues[c.lg].tier;
    // siła klubu mieszana z siłą ligi: dominacja w słabej lidze daje mniej prestiżu niż czołówka mocnej ligi
    let sc = clamp((0.6 * eloOf(c) + 0.4 * lgAvg[c.lg] - 1150) / 95, 0, 8.5);
    if (champ.has(c.id)) sc += tier === 1 ? 1 : 0.4;
    if (cupW.has(c.id)) sc += 0.6;
    sc = clamp(sc + (eu[c.id] || 0), 0.5, 10);
    const old = presOf(c); c.pres = Math.round((old * 0.85 + sc * 0.15) * 100) / 100; out[c.id] = old;
  }
  return out;
}
const presStars = c => { const p = presOf(c); return `<span class="pstars" title="Prestiż ${p.toFixed(1)}/10"><span style="width:${clamp(Math.round(p * 2) / 2, 0.5, 10) * 10}%">★★★★★</span>★★★★★</span>`; };
const presWord = p => p >= 9 ? 'światowa marka' : p >= 7.5 ? 'europejska potęga' : p >= 6 ? 'uznany klub' : p >= 4.5 ? 'solidna firma' : p >= 3 ? 'klub regionalny' : 'mało znany klub';
function playerInterest(p) {
  const ut = userClub(), c = clubOf(p), gap = c ? presOf(c) - presOf(ut) : 0;
  if (c && gap > 2.5) return { ok: false, msg: `${p.n} nie chce przejść do mniej prestiżowego klubu (prestiż ${presOf(c).toFixed(1)} vs ${presOf(ut).toFixed(1)}).` };
  if (p.ovr > teamLevel(ut) + 9 + presOf(ut) * 0.5) return { ok: false, msg: `${p.n} uważa, że Twój klub nie spełnia jego ambicji – wyższy prestiż przyciągnie lepszych piłkarzy.` };
  if (c) {
    // dodatkowe powody (stałe w danym sezonie dla zawodnika): słabsza liga, pozostanie w kraju, puchary
    const h = k => hashN(p.id * k + S.season * 7), t = traits(p), drop = lgStr(c.lg) - lgStr(ut.lg);
    if (drop > 6 && p.age >= 21 && p.age <= 32 && h(41) < clamp((drop - 6) / 14 + (t.amb - 10) * 0.03, 0, drop > 20 ? 0.95 : 0.85)) return { ok: false, why: 'liga', msg: `${p.n} nie chce schodzić do słabszej ligi – „to krok wstecz w mojej karierze”.` };
    if (p.nat === S.countries[c.cc].nat && c.cc !== ut.cc && p.age >= 24 && h(43) < 0.22 + (t.loy - 10) * 0.02) return { ok: false, why: 'kraj', msg: `${p.n} nie chce wyjeżdżać z kraju – rodzina woli zostać na miejscu.` };
    if (p.ovr >= 68 && euroOf(c.id) && !euroOf(ut.id) && h(47) < 0.35) return { ok: false, why: 'euro', msg: `${p.n} chce grać w europejskich pucharach – Twój klub w nich nie występuje.` };
    if (p.age >= 31 && drop > 2 && h(53) < (c.cc !== ut.cc ? 0.6 : 0.35)) return { ok: false, why: 'kraj', msg: `${p.n} na finiszu kariery nie myśli o przeprowadzce za granicę.` };
  }
  return { ok: true };
}
/* budżet płacowy (tygodniowy) – jak w trybie kariery FC; można przesuwać środki z budżetu transferowego */
const wageBill = c => sum(c.players.map(p => p.wage || 0));
function weeklyIncome(c) { return c.tv + c.spons + homeShare(c) * Math.min(c.cap, ticketDemand(c)) * c.price; }
function setWageBudget() { const ut = userClub(); S.board.wb = Math.round(Math.max(wageBill(ut) * 1.12, weeklyIncome(ut) * 0.9) / 1000) * 1000; }
function wageRoom() { if (S.board.wb == null) setWageBudget(); return S.board.wb - wageBill(userClub()); }
/* przesunięcie: 52 € budżetu transferowego = 1 €/tydz. budżetu płac */
function shiftBudget(weekly) {
  const ut = userClub(); weekly = Math.round(weekly / 500) * 500;
  if (weekly > 0 && weekly * 52 > ut.tb) return { ok: false, msg: 'Za mało środków w budżecie transferowym.' };
  if (weekly < 0 && -weekly > wageRoom()) return { ok: false, msg: 'Nie możesz zabrać pieniędzy już wydanych na pensje.' };
  ut.tb -= weekly * 52; S.board.wb += weekly; saveSoon();
  return { ok: true, msg: `Budżet płac: ${money(S.board.wb)}/tydz. • transferowy: ${money(ut.tb)}.` };
}
/* siła ligi = średnia reputacja klubów (cache na dzień) */
function lgStr(id) { const k = S.day + ':' + id; LGS_C.k !== S.day && (LGS_C.k = S.day, LGS_C.v = {}); return LGS_C.v[id] != null ? LGS_C.v[id] : (LGS_C.v[id] = avg(S.leagues[id].clubs.map(x => club(x).rep))); }
const LGS_C = { k: -1, v: {} };
// rola, jakiej oczekiwałby nowy zawodnik w Twojej kadrze
function expectedRoleIn(p, c) {
  const i = c.players.filter(x => x !== p && x.ovr > p.ovr).length;
  let r = i < 5 ? 'key' : i < 12 ? 'first' : i < 18 ? 'rot' : p.age <= 21 ? 'pros' : 'res';
  if (traits(p).amb >= 15 && r !== 'key') r = ROLE_ORD[Math.min(4, ROLE_ORD.indexOf(r) + 1)];
  return r;
}
function signingDemand(p, role) {
  const exp = expectedRoleIn(p, userClub()), gap = Math.max(0, ROLE_ORD.indexOf(exp) - ROLE_ORD.indexOf(role || exp));
  return Math.round(wageDemand(p) * ROLES[role || exp][1] / ROLES[exp][1] * (1 + 0.12 * gap) / 100) * 100;
}
/* prowizja agenta i premia za podpis: premia rozłożona na kontrakt liczy się 1,3× (zawodnicy lubią gotówkę od razu) */
function agentDemand(p, fee, wage, renew) {
  const base = renew ? wage * 4 : p.tid === -1 ? wage * 20 : Math.max(wage * 8, fee * 0.05);
  return Math.round(base * (traits(p).amb >= 15 ? 1.15 : 1) / 1000) * 1000;
}
const bonusDemand = (wage, years) => Math.round(wage * 6 * Math.min(years, 3) / 1000) * 1000;   // sugerowana premia; nieobowiązkowa
function effWage(wage, years, bonus, agent, agDem) {
  let w = wage + (bonus || 0) / (Math.max(1, years) * 52) * 1.3;
  if (agDem > 0) { const r = (agent || 0) / agDem; w += r < 1 ? -(1 - r) * wage * 0.25 : Math.min(0.05, (r - 1) * 0.1) * wage; }
  return w;
}
function personalTerms(p, wage, years, role, x = {}) {
  const exp = expectedRoleIn(p, userClub());
  if (role && ROLE_ORD.indexOf(exp) - ROLE_ORD.indexOf(role) >= 2 && traits(p).amb >= 11) return { ok: false, msg: `${p.n} nie przyjdzie do klubu jako ${ROLES[role][0].toLowerCase()} – oczekuje roli: ${ROLES[exp][0].toLowerCase()}.` };
  const dem = role ? signingDemand(p, role) : wageDemand(p);
  if (x.agDem && (x.agent || 0) < x.agDem * 0.5) return { ok: false, msg: `Agent ${p.n}: „Bez przyzwoitej prowizji nie ma o czym rozmawiać” – oczekuje ok. ${money(x.agDem)}.` };
  if (!x.pre && wage > wageRoom()) return { ok: false, budget: true, msg: `Przekroczysz budżet płacowy – wolne: ${money(Math.max(0, wageRoom()))}/tydz. Przesuń środki z budżetu transferowego lub sprzedaj kogoś.` };
  const w = effWage(wage, years, x.bonus, x.agent, x.agDem);
  if (w >= dem * 0.99 || (w >= dem * 0.95 && hashN(p.id * 17 + S.season) < 0.6) || (w >= dem * 0.9 && hashN(p.id * 17 + S.season) < 0.2)) return { ok: true };
  return { ok: false, msg: `${p.n} odrzuca warunki – oczekuje ${dem.toLocaleString("pl-PL")} €/tydz.${x.agDem ? ' Wyższa premia za podpis lub prowizja agenta mogą pomóc.' : ''}` };
}
/* jednorazowe koszty kontraktu (premia + agent) – z budżetu transferowego */
function payExtras(ut, bonus, agent, p) {
  const t = (bonus || 0) + (agent || 0); if (!t) return;
  ut.bal -= t; ut.tb -= t; ut.fin.tr -= t;
  if (bonus) p.mor = clamp(p.mor + Math.min(8, bonus / Math.max(1, p.wage) / 4), 0, 100);
}
function detach(p) {
  const c = clubOf(p);
  if (c) { c.players = c.players.filter(x => x !== p); c.lineup = c.lineup.filter(id => id !== p.id); c.bench = c.bench.filter(id => id !== p.id); }
  else if (p.tid === -1) S.free = S.free.filter(x => x !== p);
  S.offers = S.offers.filter(o => o.pid !== p.id);
}
function attach(p, c) { c.players.push(p); p.tid = c.id; p.listed = false; p.preTo = null; }
function completeTransfer(pid, fee, wage, years, o = {}) {
  const p = pget(pid), ut = userClub(), seller = clubOf(p), now = upfront(fee, o);
  detach(p);
  const paidNow = o.inst ? now : fee;
  if (seller) { seller.bal += paidNow; seller.tb += paidNow; seller.fin.tr += paidNow; refillAI(seller); }
  ut.bal -= now; ut.tb -= now; ut.fin.tr -= now; S.bigBuy = Math.max(S.bigBuy || 0, fee);
  { const R = clubRec(); if (fee > 0 && (!R.buy || fee > R.buy.fee)) R.buy = { fee, n: p.n, s: S.season }; }
  if (o.inst && seller) { const rest = Math.round(fee * INST_K) - now; S.debts = S.debts || []; S.debts.push({ from: ut.id, to: seller.id, amt: Math.round(rest / 2), left: 2, pn: p.n }); }
  p.sellOn = o.sellOn && seller ? { club: seller.id, pct: 0.15 } : null;
  payExtras(ut, o.bonus, o.agent, p);
  attach(p, ut); p.wage = wage; p.con = years; p.role = o.role || null; p.mor = clamp(p.mor + 10, 0, 100); p.pt = 0.5; p.joined = absDay(); p.ovrS = p.ovr;
  S.know[p.id] = 100;
  rebuildIndex(); fillBench(ut);
  news(`🔄 Transfer: ${p.n} (${p.ovr}) – ${seller ? seller.name : 'wolny zawodnik'} → ${ut.name} (${fee ? money(fee) : 'za darmo'}).`);
  msg('Transfer zakończony', `${p.n} (${POS_PL[p.pos]}, ${p.ovr}) dołącza do klubu${fee ? ' za ' + money(fee) : ''}. Kontrakt: ${plural(years, 'rok', 'lata', 'lat')}, ${money(wage)}/tydz.${o.bonus ? ` Premia za podpis: ${money(o.bonus)}.` : ''}${o.agent ? ` Prowizja agenta: ${money(o.agent)}.` : ''}`);
  saveSoon();
}
function signFree(pid, wage, years, x = {}) {
  const p = pget(pid), ut = userClub();
  if (!p || p.tid !== -1) return { ok: false, msg: 'Zawodnik niedostępny.' };
  if (ut.players.length >= 32) return { ok: false, msg: 'Kadra pełna (maks. 32).' };
  if (ut.bal < 0) return { ok: false, msg: 'Klub ma długi – zarząd blokuje nowe kontrakty.' };
  const key = S.season + (curLs() < 20 ? 'a' : 'b');
  if (!S.fsw || S.fsw.k !== key) S.fsw = { k: key, n: 0 };
  if (S.fsw.n >= 3) return { ok: false, msg: 'Zarząd pozwala na maks. 3 wolnych agentów na pół sezonu.' };
  const i = playerInterest(p); if (!i.ok) return i;
  if ((x.bonus || 0) + (x.agent || 0) > Math.max(0, ut.tb)) return { ok: false, msg: `Premia i prowizja (${money((x.bonus || 0) + (x.agent || 0))}) przekraczają budżet transferowy.` };
  const t = personalTerms(p, wage, years, x.role, x); if (!t.ok) return t;
  S.fsw.n++; p.val = calcValue(p); p.joined = absDay();
  completeTransfer(pid, 0, wage, years, x);
  return { ok: true, msg: `${p.n} podpisuje kontrakt!` };
}
function loanIn(pid) {
  const p = pget(pid), ut = userClub(), c = clubOf(p);
  if (!windowOpen()) return { ok: false, msg: 'Okno transferowe jest zamknięte.' };
  if (!c || p.loan) return { ok: false, msg: 'Zawodnik niedostępny do wypożyczenia.' };
  const st = playerStatus(p);
  if (st !== 'Rezerwowy' && st !== 'Perspektywiczny' && st !== 'Rotacyjny') return { ok: false, msg: `${c.name} nie wypożycza zawodników z podstawowego składu.` };
  if (ut.players.length >= 32) return { ok: false, msg: 'Kadra pełna (maks. 32).' };
  if (c.rep - ut.rep > 15) return { ok: false, msg: `${c.name} nie wypożycza zawodników do tak małych klubów.` };
  const pi = playerInterest(p); if (!pi.ok) return pi;
  const fee = Math.round(p.val * 0.1 / 10000) * 10000, weeklyInc = ut.tv + ut.spons + 0.5 * ut.cap * 0.75 * ut.price;
  if (p.wage > weeklyInc * 0.15) return { ok: false, msg: `Pensja ${p.n} (${money(p.wage)}/tydz.) przekracza możliwości klubu.` };
  if (ut.bal < fee || ut.tb < fee) return { ok: false, msg: `Opłata za wypożyczenie wynosi ${money(fee)} – brak środków.` };
  if (hashN(p.id * 31 + absDay()) < 0.3) return { ok: false, msg: `${c.name} odrzuca prośbę o wypożyczenie. (spróbuj za kilka dni)` };
  ut.bal -= fee; ut.tb -= fee; c.bal += fee;
  detach(p); attach(p, ut); p.loan = { from: c.id, season: S.season }; S.know[p.id] = 100; refillAI(c);
  rebuildIndex(); fillBench(ut);
  msg('Wypożyczenie', `${p.n} dołącza na wypożyczenie do końca sezonu (klub macierzysty: ${c.name}) (pensja ${money(p.wage)}/tydz.).`);
  saveSoon(); return { ok: true, msg: `${p.n} wypożyczony do końca sezonu.` };
}
function loanCandidates(p) {
  const ut = userClub();
  return S.clubs.filter(c => c.id !== ut.id && c.rep <= ut.rep - 3 && Math.abs(teamLevel(c) - p.ovr) <= 6 && c.players.length < 27)
    .map(c => ({ c, play: clamp(Math.round(50 + (p.ovr - teamLevel(c)) * 8), 5, 95) })).sort((a, b) => b.c.rep - a.c.rep).slice(0, 5);
}
function loanOut(pid, toId) {
  const p = pget(pid), ut = userClub();
  if (!windowOpen()) return { ok: false, msg: 'Okno transferowe jest zamknięte.' };
  if (ut.players.length <= 18) return { ok: false, msg: 'Kadra zbyt wąska.' };
  if (p.loan) return { ok: false, msg: 'Zawodnik już jest wypożyczony.' };
  const cands = S.clubs.filter(c => c.id !== ut.id && c.rep <= ut.rep - 3 && Math.abs(teamLevel(c) - p.ovr) <= 6);
  if (!cands.length) return { ok: false, msg: 'Brak chętnych klubów.' };
  const c = toId != null ? loanCandidates(p).map(x => x.c).find(x => x.id === +toId) : pick(cands);
  if (!c) return { ok: false, msg: 'Ten klub nie jest zainteresowany wypożyczeniem.' };
  detach(p); attach(p, c); p.loan = { from: ut.id, season: S.season }; rebuildIndex(); fillBench(ut);
  msg('Wypożyczenie', `${p.n} odchodzi na wypożyczenie do ${c.name} (${S.countries[c.cc].flag}).`);
  saveSoon(); return { ok: true, msg: `${p.n} wypożyczony do ${c.name}.` };
}
// kontroferta do oferty za Twojego zawodnika
function counterOffer(offerId, ask) {
  const o = S.offers.find(x => x.id === offerId); if (!o) return { res: 'gone', msg: 'Oferta wygasła.' };
  const p = pget(o.pid), b = club(o.from); if (o._ctrd >= 2) return { res: 'gone', msg: `${b.name} nie chce dalej negocjować.` };
  o._ctrd = (o._ctrd || 0) + 1;
  const limit = o.amount * (1.08 + 0.2 * hashN(o.id * 5 + p.id)), maxPay = Math.min(limit, b.bal);
  if (ask <= maxPay) { o.amount = Math.round(ask / 1e4) * 1e4; saveSoon(); return { res: 'accept', msg: `${b.name} akceptuje Twoje warunki: ${money(o.amount)}. Potwierdź sprzedaż.` }; }
  if (o._ctrd >= 2 || ask > limit * 1.35) { S.offers = S.offers.filter(x => x !== o); saveSoon(); return { res: 'gone', msg: `${b.name} wycofuje ofertę – „za drogo”.` }; }
  o.amount = Math.round((o.amount + Math.min(maxPay, (o.amount + ask) / 2)) / 2 / 1e4) * 1e4; saveSoon();
  return { res: 'counter', msg: `${b.name} podnosi ofertę do ${money(o.amount)} – to ich ostatnie słowo.` };
}
function sellTo(offerId) {
  const o = S.offers.find(x => x.id === offerId); if (!o) return { ok: false, msg: 'Oferta wygasła.' };
  const p = pget(o.pid), ut = userClub(), b = club(o.from);
  if (!windowOpen()) { S.offers = S.offers.filter(x => x !== o); return { ok: false, msg: 'Okno transferowe jest zamknięte – oferta wygasła.' }; }
  if (b.bal < o.amount) { S.offers = S.offers.filter(x => x !== o); return { ok: false, msg: `${b.name} wycofał ofertę – klub nie ma już tyle pieniędzy.` }; }
  if (ut.players.length <= 16) return { ok: false, msg: 'Kadra nie może liczyć mniej niż 16 zawodników.' };
  detach(p); attach(p, b); p.con = ri(2, 5); p.wage = calcWage(p, b.rep);
  const so = p.sellOn ? Math.round(Math.max(0, o.amount) * p.sellOn.pct) : 0;
  if (so) { const sc = club(p.sellOn.club); sc.bal += so; msg('Klauzula odsprzedaży', `${sc.name} otrzymuje ${money(so)} (${Math.round(p.sellOn.pct * 100)}% z transferu ${p.n}).`); }
  p.sellOn = null;
  { const R = clubRec(); if (!R.sale || o.amount > R.sale.fee) R.sale = { fee: o.amount, n: p.n, s: S.season }; }
  ut.bal += o.amount - so; ut.tb += o.amount - so; ut.fin.tr += o.amount - so; b.bal -= o.amount; b.tb -= o.amount; S.bigSale = Math.max(S.bigSale || 0, o.amount);
  rebuildIndex(); fillBench(ut);
  news(`🔄 Transfer: ${p.n} (${p.ovr}) – ${ut.name} → ${b.name} (${money(o.amount)}).`);
  msg('Sprzedaż', `${p.n} odchodzi z klubu. Nowy klub: ${b.name}, kwota: ${money(o.amount)}.`);
  saveSoon(); return { ok: true, msg: `Sprzedano ${p.n} za ${money(o.amount)}.` };
}
function releasePlayer(pid) {
  const p = pget(pid), ut = userClub();
  if (!p || p.tid !== ut.id) return { ok: false, msg: 'To nie jest Twój zawodnik.' };
  if (ut.players.length <= 16) return { ok: false, msg: 'Kadra nie może liczyć mniej niż 16 zawodników.' };
  if (p.loan) { const from = club(p.loan.from); detach(p); attach(p, from); p.loan = null; rebuildIndex(); fillBench(ut); saveSoon(); return { ok: true, msg: `${p.n} wraca do ${from.name}.` }; }
  const cost = p.wage * 20 * p.con;
  if (cost > ut.bal) return { ok: false, msg: 'Brak środków na odprawę.' };
  ut.bal -= cost; ut.fin.exp += cost; detach(p); p.tid = -1; S.free.push(p); rebuildIndex(); fillBench(ut); saveSoon();
  return { ok: true, msg: `Rozwiązano kontrakt z ${p.n} (odprawa ${money(cost)}).` };
}
function renewDemand(p, years) { return Math.round(calcWage(p, userClub().rep) * (1.05 + years * 0.03) * (p.mor < 40 ? 1.2 : 1) / 100) * 100; }
/* ---------- role w składzie i negocjacje kontraktów własnych zawodników ---------- */
const ROLES = { key: ['Kluczowy zawodnik', 1.25, 0.7], first: ['Podstawowy', 1.1, 0.5], rot: ['Rotacyjny', 1.0, 0.3], pros: ['Perspektywiczny', 0.9, 0.15], res: ['Rezerwowy', 0.85, 0] };
const ROLE_ORD = ['res', 'pros', 'rot', 'first', 'key'];
const STATUS_ROLE = { Kluczowy: 'key', Podstawowy: 'first', Rotacyjny: 'rot', Perspektywiczny: 'pros', Rezerwowy: 'res' };
function expectedRole(p) {
  let r = STATUS_ROLE[playerStatus(p)] || 'rot';
  if (traits(p).amb >= 15 && r !== 'key') r = ROLE_ORD[Math.min(4, ROLE_ORD.indexOf(r) + 1)];
  if (r === 'pros' && p.age > 21) r = 'res';
  return r;
}
const roleOf = p => p.role || expectedRole(p);
const roleGap = (p, role) => ROLE_ORD.indexOf(expectedRole(p)) - ROLE_ORD.indexOf(role);   // >0: proponujesz mniej niż oczekuje
function contractDemand(p, years, role) {
  const gap = Math.max(0, roleGap(p, role));
  return Math.round(calcWage(p, userClub().rep) * (1.05 + years * 0.03) * ROLES[role][1] * (1 + 0.12 * gap) * (p.mor < 40 ? 1.2 : 1) * (traits(p).loy >= 15 ? 0.93 : 1) / 100) * 100;
}
function negotiateRenewal(pid, wage, years, role, x = {}) {
  const p = pget(pid), ut = userClub(), day = absDay();
  if (p.loan) return { res: 'reject', msg: 'Nie można przedłużyć umowy wypożyczonego zawodnika.' };
  if (p._noRenew > day) return { res: 'reject', msg: `${p.n} nie chce teraz rozmawiać – spróbuj za kilka dni.` };
  if (p.mor < 30 && hashN(p.id * 7 + day) < 0.6) return { res: 'reject', msg: `${p.n} jest niezadowolony i odrzuca rozmowy o kontrakcie.` };
  if (p.ovr > teamLevel(ut) + 6 && p.age < 29 && hashN(p.id * 11 + S.season) < 0.35) return { res: 'reject', msg: `${p.n} chce poczekać na oferty większych klubów.` };
  if (role === 'pros' && p.age > 21) return { res: 'reject', msg: 'Rola perspektywicznego zawodnika jest tylko dla graczy do 21 lat.' };
  const gap = roleGap(p, role);
  if (gap >= 2 && traits(p).amb >= 11) return { res: 'reject', msg: `${p.n}: „Jako ${ROLES[role][0].toLowerCase()}? Nie ma mowy – oczekuję roli: ${ROLES[expectedRole(p)][0].toLowerCase()}.”` };
  const dem = contractDemand(p, years, role);
  if (ut.bal < 0 && wage > p.wage) return { res: 'reject', msg: 'Klub ma długi – zarząd nie zgadza się na podwyżki.' };
  const agDem = agentDemand(p, 0, dem, true), w = effWage(wage, years, x.bonus, x.agent, agDem);
  if ((x.bonus || 0) + (x.agent || 0) > Math.max(0, ut.tb)) return { res: 'reject', msg: 'Premia i prowizja przekraczają budżet transferowy.' };
  if (wage > p.wage && wage - p.wage > wageRoom()) return { res: 'reject', msg: `Podwyżka przekracza budżet płacowy (wolne: ${money(Math.max(0, wageRoom()))}/tydz.). Przesuń środki z budżetu transferowego.` };
  if (w >= dem || (w >= dem * 0.95 && hashN(p.id * 19 + S.season) < 0.5)) {
    payExtras(ut, x.bonus, x.agent, p);
    p.wage = Math.round(wage / 100) * 100; p.con = years; p.role = role; p._rb = 0;
    p.mor = clamp(p.mor + (gap > 0 ? -4 : gap < 0 ? 10 : 6), 0, 100); saveSoon();
    return { res: 'accept', msg: `${p.n} podpisuje nowy kontrakt: ${years} l., ${money(p.wage)}/tydz., rola: ${ROLES[role][0].toLowerCase()}.` };
  }
  p._rb = (p._rb || 0) + 1;
  if (p._rb >= 4) { p._rb = 0; p._noRenew = day + 14; p.mor = clamp(p.mor - 5, 0, 100); return { res: 'reject', msg: `Agent ${p.n} zrywa rozmowy na dwa tygodnie – „nie traktujecie nas poważnie”.` }; }
  return { res: 'counter', counter: dem, msg: `Agent ${p.n} oczekuje ok. ${money(dem)}/tydz. (cierpliwość: jeszcze ${4 - p._rb})` };
}
function setRole(pid, role) {
  const p = pget(pid), old = ROLE_ORD.indexOf(roleOf(p)), nw = ROLE_ORD.indexOf(role);
  if (role === 'pros' && p.age > 21) return 'Rola perspektywicznego zawodnika jest tylko dla graczy do 21 lat.';
  let extra = '';
  if (nw > old) { const dem = contractDemand(p, Math.max(1, p.con), role); if (dem > p.wage) { extra = ` Agent wywalczył podwyżkę: ${money(p.wage)} → ${money(dem)}/tydz.`; p.wage = dem; } }
  p.role = role; p.mor = clamp(p.mor + (nw < old ? -8 * (old - nw) : nw > old ? 4 : 0), 0, 100); saveSoon();
  return (nw < old ? `${p.n} jest rozczarowany degradacją w hierarchii.` : nw > old ? `${p.n} cieszy się z większej roli – ale oczekuje teraz więcej minut.` : 'Bez zmian.') + extra;
}
function roleWeek() {
  for (const p of userClub().players) {
    if (!p.role || p.inj) continue;
    const need = ROLES[p.role][2];
    if (p.pt < need - 0.15) { p.mor = clamp(p.mor - 1.5, 0, 100); if (!p._roleWarn || absDay() - p._roleWarn > 40) { p._roleWarn = absDay(); msg(`😠 ${p.n} niezadowolony`, `${p.n} ma w kontrakcie rolę „${ROLES[p.role][0]}”, a gra za mało. Jeśli to się nie zmieni, morale będzie spadać.`); } }
    else if (need > 0 && p.pt >= need) p.mor = clamp(p.mor + 0.3, 0, 100);
  }
}
function renewContract(pid, years) {
  const p = pget(pid);
  if (p.loan) return { ok: false, msg: 'Nie można przedłużyć umowy wypożyczonego zawodnika.' };
  if (p.mor < 30 && hashN(p.id * 7 + absDay()) < 0.6) return { ok: false, msg: `${p.n} jest niezadowolony i odrzuca rozmowy o kontrakcie.` };
  if (p.ovr > teamLevel(userClub()) + 6 && p.age < 29 && hashN(p.id * 11 + S.season) < 0.35) return { ok: false, msg: `${p.n} chce poczekać na oferty większych klubów.` };
  if (p._noRenew > absDay()) return { ok: false, msg: `${p.n} nie chce teraz rozmawiać o kontrakcie.` };
  const nw = Math.max(p.wage, contractDemand(p, years, roleOf(p)));
  if (userClub().bal < 0 && nw > p.wage) return { ok: false, msg: 'Klub ma długi – zarząd nie zgadza się na podwyżki.' };
  p.wage = nw; p.con = years; p.role = roleOf(p); p.mor = clamp(p.mor + 6, 0, 100); saveSoon();
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
  while (c.players.length > 27) { const w = c.players.filter(p => !p.loan).sort((a, b) => (a.ovr - a.age * 0.3) - (b.ovr - b.age * 0.3))[0]; if (!w) break; detach(w); w.tid = -1; S.free.push(w); }
}
/* ostatnie dni okna: oferty last minute za Twoich zawodników i okazje na rynku */
function deadlineDays(ut) {
  const lv = teamLevel(ut), got = [];
  const mine = ut.players.filter(p => !p.loan && !(p.joined && absDay() - p.joined < 60) && p.ovr >= lv - 1 && !S.offers.some(o => o.pid === p.id));
  for (const p of shuffle(mine).slice(0, rnd() < 0.5 ? 1 : 2)) {
    const buyers = S.clubs.filter(c => c.id !== ut.id && c.rep >= ut.rep - 5 && c.bal > p.val * 1.4 && c.players.length < 30); if (!buyers.length) continue;
    const b = pick(buyers), amt = Math.round(p.val * (1.15 + rnd() * 0.3) / 50000) * 50000;
    S.offers.push({ id: S.nextId++, pid: p.id, from: b.id, amount: amt, exp: S.day + 12, last: true }); got.push(`${p.n} – ${b.name} (${money(amt)})`);
  }
  const lvl = PALL.filter(p => p.tid >= 0 && p.tid !== ut.id && !p.loan && Math.abs(p.ovr - lv) <= 4 && p.age <= 30 && club(p.tid).players.length > 22 && !notForSale(p) && playerInterest(p).ok);
  const deals = shuffle(lvl).slice(0, 5); for (const p of deals) p._disc = { k: 0.8, until: absDay() + 10 };
  S.dl = { day: absDay(), deals: deals.map(p => p.id) };
  msg('⏰ Ostatnie dni okna transferowego', `Okno zamyka się za kilka dni!${got.length ? '\nOferty last minute za Twoich zawodników: ' + got.join('; ') + '.' : ''}\nKluby chcą szybko pozbyć się nadmiaru zawodników – okazje −20%: ${deals.map(p => `${p.n} (${POS_PL[p.pos]}, ${club(p.tid).short})`).join(', ')}.`);
}
/* prekontrakt: od stycznia zawodnik z kończącą się umową może podpisać z Tobą umowę od lata (bez kwoty odstępnego) */
const canPre = p => p.tid >= 0 && p.tid !== S.user && !p.loan && p.con <= 1 && !p.preTo && curLs() >= 20 && curLs() < 46;
function preContract(pid, wage, years, x = {}) {
  const p = pget(pid), ut = userClub();
  if (!canPre(p)) return { ok: false, msg: 'Prekontrakt możliwy tylko od stycznia z zawodnikiem, któremu kończy się umowa.' };
  if (PALL.filter(q => q.preTo && q.preTo.club === ut.id).length >= 2) return { ok: false, msg: 'Zarząd pozwala na maks. 2 prekontrakty na sezon.' };
  const i = playerInterest(p); if (!i.ok) return i;
  if ((x.bonus || 0) + (x.agent || 0) > Math.max(0, ut.tb)) return { ok: false, msg: 'Premia i prowizja przekraczają budżet transferowy.' };
  const t = personalTerms(p, wage, years, x.role, { ...x, pre: true }); if (!t.ok) return t;
  payExtras(ut, x.bonus, x.agent, p);
  p.preTo = { club: ut.id, wage, years, role: x.role || null };
  msg('📝 Prekontrakt', `${p.n} (${POS_PL[p.pos]}, ${p.ovr}) podpisał prekontrakt – dołączy do klubu po sezonie za darmo. Umowa: ${plural(years, 'rok', 'lata', 'lat')}, ${money(wage)}/tydz.`);
  news(`📝 ${p.n} (${club(p.tid).name}) podpisuje prekontrakt z ${ut.name}.`); saveSoon();
  return { ok: true, msg: `${p.n} dołączy po sezonie!` };
}
function genOffers() {
  const ut = userClub();
  S.offers = S.offers.filter(o => o.exp >= S.day && pget(o.pid) && pget(o.pid).tid === ut.id);
  if (ut.players.length <= 17) return;
  for (const p of ut.players) {
    if (p.loan || S.offers.some(o => o.pid === p.id) || (p.joined && absDay() - p.joined < 60)) continue;
    const chance = p.listed ? 0.35 : (p.ovr >= teamLevel(ut) + 2 && p.mor < 50 ? 0.08 : p.ovr >= teamLevel(ut) + 3 ? 0.03 : 0);
    if (rnd() < chance) {
      const buyers = S.clubs.filter(c => c.id !== ut.id && c.rep >= ut.rep - 12 && teamLevel(c) <= p.ovr + 4 && c.bal > p.val * 0.5);
      if (!buyers.length) continue;
      const b = pick(buyers);
      const amt = Math.round(p.val * (p.listed ? 0.8 + rnd() * 0.4 : 1.1 + rnd() * 0.45) / 50000) * 50000;
      S.offers.push({ id: S.nextId++, pid: p.id, from: b.id, amount: amt, exp: S.day + 6 });
      msg('Oferta za zawodnika', `Klub ${b.name} (${S.countries[b.cc].flag}) składa ofertę ${money(amt)} – zawodnik: ${p.n}.`);
    }
  }
}
function aiTransfers() {
  for (let k = 0; k < 25; k++) {
    const b = wpick(S.clubs, c => c.id === S.user ? 0 : Math.pow(c.rep / 50, 3));
    if (!b.lineup.length) continue;
    const slots = slotsOf(b.formation);
    let worst = 0, wv = 999;
    b.lineup.forEach((id, i) => { const p = pget(id); if (p) { const v = ovrAt(p, slots[i].pos); if (v < wv) { wv = v; worst = i; } } });
    const pos = slots[worst].pos;
    let bestP = null;
    for (let s = 0; s < 400; s++) {
      const p = PALL[ri(0, PALL.length - 1)];
      if (p.tid < 0 || p.tid === b.id || p.tid === S.user || p.loan || p.preTo || p.pos !== pos) continue;
      const sc = club(p.tid);
      if (sc.rep > b.rep + 3 || sc.players.length <= 20 || p.ovr < wv + 2 || p.ovr > teamLevel(b) + 7 || p.val * 1.4 > b.tb || p.val * 1.4 > b.bal) continue;
      if (!bestP || p.ovr > bestP.ovr) bestP = p;
    }
    if (!bestP) continue;
    const seller = club(bestP.tid), fee = Math.round(bestP.val * (1.05 + rnd() * 0.3) / 50000) * 50000;
    detach(bestP); attach(bestP, b); bestP.wage = calcWage(bestP, b.rep); bestP.con = ri(2, 5);
    b.bal -= fee; b.tb -= fee; seller.bal += fee; seller.tb += fee; refillAI(seller); refillAI(b);
    if (fee >= 3e6 || seller.cc === userClub().cc || b.cc === userClub().cc) news(`🔄 Transfer: ${bestP.n} (${bestP.ovr}) – ${seller.name} → ${b.name} (${money(fee)}).`);
  }
  // AI podpisuje lepszych wolnych agentów
  const fa = S.free.filter(p => p.age <= 33).sort((a, b) => b.ovr - a.ovr).slice(0, 30);
  for (let k = 0; k < 6 && fa.length; k++) {
    const p = fa.splice(ri(0, Math.min(fa.length - 1, 9)), 1)[0];
    const c = S.clubs.find(c => c.id !== S.user && c.players.length < 26 && Math.abs(teamLevel(c) - p.ovr) <= 4 && rnd() < 0.3);
    if (!c) continue;
    S.free = S.free.filter(x => x !== p); attach(p, c); p.con = ri(1, 3); p.wage = calcWage(p, c.rep); p.val = calcValue(p);
    if (p.ovr >= 72) news(`✍️ Wolny transfer: ${p.n} (${p.ovr}) → ${c.name}.`);
  }
  rebuildIndex();
}
function news(t) { S.news.unshift({ d: curDay() ? curDay().date : 0, t }); if (S.news.length > 100) S.news.length = 100; }
function msg(title, body) { S.inbox.unshift({ id: S.nextId++, season: S.season, date: curDay() ? curDay().date : 0, title, body, read: false }); if (S.inbox.length > 80) S.inbox.length = 80; }

/* ---------- obiekty ---------- */
const FAC_COST = lvl => Math.round(1.5e6 * Math.pow(2.2, lvl - 1));
const facGet = k => k === 'train' ? S.fac.train : S.acad[k];
/* ---------- obiekty komercyjne: gastronomia, parking, hotel ---------- */
const COMM = { gastro: ['🍔 Gastronomia', 'Więcej wpływów z dnia meczowego (+6% za poziom).'], park: ['🅿️ Parking', 'Łatwiejszy dojazd – wyższa frekwencja (+3% za poziom).'], hotel: ['🏨 Hotel klubowy', 'Stały tygodniowy dochód i lepszy wizerunek (sponsorzy +2% za poziom).'], shop: ['🛍️ Sklep klubowy', 'Tygodniowy dochód z koszulek i pamiątek – tym większy, im bardziej zadowoleni kibice.'] };
const commLvl = k => (S.fac && S.fac[k]) || 0;
const commCost = (k, lvl) => Math.round(userClub().cap * ({ gastro: 35, park: 25, hotel: 120, shop: 30 })[k] * Math.pow(1.7, lvl) / 1e4) * 1e4;
function upgradeComm(k) {
  const lvl = commLvl(k), ut = userClub(); if (lvl >= 5) return { ok: false, msg: 'Maksymalny poziom.' };
  const cost = commCost(k, lvl); if (ut.bal < cost) return { ok: false, msg: `Za mało środków (${money(cost)}).` };
  ut.bal -= cost; ut.fin.exp += cost; S.fac[k] = lvl + 1; if (k === 'hotel') ut.spons = Math.round(ut.spons * 1.02);
  saveSoon(); return { ok: true, msg: `${COMM[k][0]}: poziom ${lvl + 1}.` };
}
const hotelIncome = () => commLvl('hotel') * Math.round(userClub().cap * 0.9);
const shopIncome = () => Math.round(commLvl('shop') * userClub().cap * 0.25 * ((S.fans || 60) / 60));
function upgradeFacility(kind) {
  const lvl = facGet(kind), ut = userClub();
  if (lvl >= 5) return { ok: false, msg: 'Maksymalny poziom.' };
  const cost = FAC_COST(lvl);
  if (ut.bal < cost) return { ok: false, msg: `Za mało środków (${money(cost)}).` };
  ut.bal -= cost; if (kind === 'train') S.fac.train++; else S.acad[kind]++; saveSoon();
  return { ok: true, msg: `Rozbudowano: poziom ${facGet(kind)}.` };
}


/* ---------- akademia ---------- */
const acadCost = () => { const t = S.leagues[userClub().lg].tier; return Math.round((S.acad.fac + S.acad.coach + S.acad.rec) * 2500 * (t === 1 ? 1 : t === 2 ? 0.5 : 0.3)); };
const ACAD_NAMES = { fac: 'Infrastruktura akademii', coach: 'Trenerzy młodzieży', rec: 'Rekrutacja (sieć skautów młodzieży)' };
function genYouth() {
  const A = S.acad, ut = userClub();
  const nat = A.region && rnd() < 0.7 ? A.region : rnd() < 0.85 ? S.countries[ut.cc].nat : foreignNat(false);
  const pos = pick(POSITIONS);
  let pot = Math.round(52 + A.fac * 5 + A.rec * 1.5 + (A.nextQ || 0) + (presOf(ut) - 5) * 0.6 + gauss() * 8);
  if (rnd() < 0.03 + A.rec * 0.006) pot += ri(8, 14);   // talent pokolenia
  pot = clamp(pot, 50, 95);
  const y = genPlayer(pos, 0, nat, { age: ri(15, 16), adjAge: false, pot, con: 3 });
  const a = genAttrs(pos, clamp(pot - ri(24, 34), 35, 58)); y.a = a; y.ovr = calcOvr(pos, a); y.alt = bestAlt(pos, a);
  y.pot = Math.max(y.pot, y.ovr + 4); y.wage = 0; y.val = calcValue(y); y.tid = -3; y.acad = { ovr0: y.ovr, est: clamp(y.pot + Math.round(gauss() * (6 - A.coach) * 1.6), 45, 99) };
  return y;
}
/* liga juniorów (U19): 8 drużyn z kraju, mecz co tydzień; gra przyspiesza rozwój juniorów */
function ylInit() {
  const ut = userClub(), cc = ut.cc, pool = S.clubs.filter(c => c.cc === cc && c.id !== ut.id && !isReserve(c)).sort((a, b) => b.rep - a.rep).slice(0, 14);
  const opp = shuffle(pool).slice(0, 7);
  S.yl = { season: S.season, club: ut.id, md: 0, teams: [{ id: ut.id, n: ut.name + ' U19' }, ...opp.map(c => ({ id: c.id, n: c.name + ' U19', s: Math.round(33 + c.rep * 0.13 + gauss() * 2) }))].map(t => ({ ...t, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 })) };
  S.yl.fix = makeFixtures(S.yl.teams.map((_, i) => i));
  for (const y of S.acad.youth) y.ys = null;
}
function ylWeek() {
  const ut = userClub(), A = S.acad;
  if (!S.yl || S.yl.season !== S.season || S.yl.club !== ut.id) ylInit();
  const Y = S.yl; if (Y.md >= Y.fix.length) return;
  const sq = A.youth.filter(y => !y.inj).sort((a, b) => b.ovr - a.ovr), xi = sq.slice(0, 11), subs = sq.slice(11, 14);
  const fill = 36 + A.fac * 1.5 + A.coach;   // braki w składzie uzupełniają chłopcy z rocznika U17
  const myS = (xi.reduce((a, y) => a + y.ovr, 0) + (11 - xi.length) * fill) / 11;
  for (const f of Y.fix[Y.md]) {
    const H = Y.teams[f.h], Aw = Y.teams[f.a], sh = H.id === ut.id ? myS : H.s, sa = Aw.id === ut.id ? myS : Aw.s;
    const lh = clamp(1.45 * Math.pow(sh / sa, 2.2) * 1.08, 0.2, 5), la = clamp(1.45 * Math.pow(sa / sh, 2.2), 0.2, 5), hg = poisson(lh), ag = poisson(la);
    for (const [t, gf, ga] of [[H, hg, ag], [Aw, ag, hg]]) { t.P++; t.GF += gf; t.GA += ga; if (gf > ga) { t.W++; t.Pts += 3; } else if (gf === ga) { t.D++; t.Pts++; } else t.L++; }
    if (H.id === ut.id || Aw.id === ut.id) {
      const mine = H.id === ut.id, gf = mine ? hg : ag, ga = mine ? ag : hg, opp = mine ? Aw : H;
      const att = xi.filter(y => ['ST', 'LW', 'RW', 'CAM'].includes(y.pos)), sc = [];
      for (let g = 0; g < gf; g++) { const y = att.length && rnd() < 0.7 ? pick(att) : pick(xi); if (y) { (y.ys = y.ys || { m: 0, g: 0, r: 0 }).g++; sc.push(lastName(y)); } }
      for (const y of xi.concat(subs)) { const st = y.ys = y.ys || { m: 0, g: 0, r: 0 }; st.m++; st.r += clamp(6.4 + (gf - ga) * 0.25 + (y.ovr - myS) * 0.05 + gauss() * 0.6 + (sc.includes(lastName(y)) ? 0.8 : 0), 4, 10); y._ym = (y._ym || 0) + (subs.includes(y) ? 0.4 : 1); }
      Y.last = `${mine ? ut.name + ' U19' : opp.n} ${hg}:${ag} ${mine ? opp.n : ut.name + ' U19'}${sc.length ? ' (⚽ ' + sc.join(', ') + ')' : ''}`;
    }
  }
  Y.md++;
  if (Y.md === Y.fix.length) { const t = ylTable(), me = t.findIndex(r => r.id === ut.id) + 1; msg('🎓 Liga juniorów – koniec rozgrywek', `Nasza drużyna U19 zajęła ${me}. miejsce na ${t.length}.${me === 1 ? ' Mistrzostwo juniorów! 🏆' : ''}`); if (me === 1) S.fans = clamp((S.fans || 60) + 2, 0, 100); }
}
const ylTable = () => S.yl ? S.yl.teams.slice().sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF) : [];
function academyWeek(d) {
  const A = S.acad;
  if (d.ls % 2 === 1 && !(WINTER[userClub().cc] && userClub().lg && S.leagues[userClub().lg].lsMap[d.ls] === -1 && d.ls > 15 && d.ls < 28)) ylWeek();
  for (const y of A.youth) {
    const mf = (S.mentors && S.mentors.some(x => x.p === y.id) ? 1.3 : 1) * (1 + 0.6 * clamp((y._ym || 0) / 2, 0, 1));   // gra w lidze juniorów
    y._ym = Math.max(0, (y._ym || 0) - 0.5);
    if (y.ovr < y.pot && rnd() < 0.06 * (0.7 + 0.15 * A.coach + 0.05 * A.fac) * (0.75 + traits(y).pro / 40) * mf) {
      develop(y, 1);
      if (y.focus != null && y.a[y.focus] < 99) { y.a[y.focus] = Math.min(99, y.a[y.focus] + 0.8); y.ovr = Math.min(calcOvr(y.pos, y.a), y.pot); }
      y.val = calcValue(y);
    }
    y.acad.est = clamp(Math.round(y.acad.est * 0.9 + (y.pot + gauss() * (6 - A.coach)) * 0.1), 45, 99);
  }
  if (d.ls === 24) {
    const r = rnd(); A.nextQ = r < 0.05 ? 8 : r < 0.25 ? 3 : r < 0.75 ? 0 : -3;
    msg('🎓 Raport akademii', `Szef akademii o marcowym naborze: ${A.nextQ >= 8 ? '„To może być złota generacja! Mamy na oku wyjątkowe talenty.”' : A.nextQ >= 3 ? '„Rocznik zapowiada się ponadprzeciętnie.”' : A.nextQ >= 0 ? '„Przeciętny rocznik – kilka ciekawych nazwisk.”' : '„W tym roku będzie trudno o wielkie talenty.”'}`);
  }
  if (d.ls === 32) {
    const n = 2 + A.rec + ri(0, 2) + (A.nextQ >= 8 ? 2 : 0), list = []; 
    for (let i = 0; i < n; i++) { const y = genYouth(); A.youth.push(y); list.push(y); PM.set(y.id, y); PALL.push(y); }
    const best = list.slice().sort((a, b) => b.acad.est - a.acad.est)[0];
    A.nextQ = 0;
    S.intake = list.map(y => y.id); S.intakeDay = absDay();
    msg('🎓 Dzień naboru do akademii', `Do akademii dołączyło ${n} juniorów. Największy talent: ${best.n} (${POS_PL[best.pos]}, ${best.age} l.) – szacowany potencjał ok. ${best.acad.est}. Zobacz: Akademia.`);
  }
}
function promoteYouthCount() { S.promoted = S.promoted || {}; S.promoted[S.season] = (S.promoted[S.season] || 0) + 1; }
function promoteYouth(pid) {
  const y = S.acad.youth.find(p => p.id === pid), ut = userClub();
  if (!y) return { ok: false, msg: 'Brak zawodnika.' };
  if (ut.players.length >= 32) return { ok: false, msg: 'Kadra pierwszego zespołu pełna (32).' };
  S.acad.youth = S.acad.youth.filter(p => p !== y);
  y.acad = null; y.homegrown = true; y.con = 3; y.wage = Math.round(calcWage(y, ut.rep) * 0.5 / 100) * 100; attach(y, ut); y.mor = 75;
  S.know[y.id] = 100; rebuildIndex(); fillBench(ut); saveSoon();
  promoteYouthCount();
  return { ok: true, msg: `${y.n} awansował do pierwszego zespołu!` };
}
function setMentor(pupilId, mentorId) {
  S.mentors = (S.mentors || []).filter(x => x.p !== pupilId && x.m !== mentorId);
  if (mentorId != null) { if (S.mentors.length >= 3) return { ok: false, msg: 'Maksymalnie 3 pary mentor–uczeń.' }; S.mentors.push({ m: mentorId, p: pupilId }); }
  saveSoon(); return { ok: true, msg: mentorId != null ? 'Mentor przydzielony – rozwój ucznia przyspieszy.' : 'Mentor odwołany.' };
}
function mentorWeek() {
  S.mentors = (S.mentors || []).filter(x => { const m = pget(x.m), p = pget(x.p); return m && p && m.tid === S.user && (p.tid === S.user || p.tid === -3); });
  for (const x of S.mentors) { const m = pget(x.m), p = pget(x.p), tm = traits(m), tp = traits(p); tp.pro += (tm.pro - tp.pro) * 0.02; tp.tem += (tm.tem - tp.tem) * 0.02; }
}
function releaseYouth(pid) { S.acad.youth = S.acad.youth.filter(p => p.id !== pid); PM.delete(pid); rebuildIndex(); saveSoon(); }
function academySeasonEnd() {
  const out = [];
  for (const y of S.acad.youth.slice()) {
    y.age++;
    if (y.age >= 21) { S.acad.youth = S.acad.youth.filter(p => p !== y); y.acad = null; y.tid = -1; y.wage = calcWage(y, 40); S.free.push(y); out.push(y.n); }
  }
  return out;
}

/* ---------- zarząd ---------- */
/* ---------- dodatkowe cele zarządu (2 na sezon) ---------- */
const BOARD_GOALS = {
  u21: [ut => 'Daj młodzieżowcom (do 21 lat) łącznie co najmniej 25 występów', ut => sum(ut.players.filter(p => p.age <= 21).map(p => p.st.apps)) >= 25, ut => `${sum(ut.players.filter(p => p.age <= 21).map(p => p.st.apps))}/25`],
  wage: [ut => "Zmieść się w budżecie płac (stan na koniec sezonu)", ut => wageBill(ut) <= (S.board.wb || Infinity), ut => `${money(wageBill(ut))} / ${money(S.board.wb || 0)}`],
  trans: [ut => 'Zakończ sezon bez długów (saldo na plusie)', ut => ut.bal >= 0, ut => money(ut.bal)],
  cup: [ut => 'Dojdź co najmniej do ćwierćfinału pucharu kraju', ut => cupReach(ut) <= 8, ut => { const r = cupReach(ut); return r <= 2 ? 'finał' : r <= 8 ? 'ćwierćfinał+' : 'jeszcze nie'; }],
  fans: [ut => 'Utrzymaj poparcie kibiców na poziomie co najmniej 60%', ut => (S.fans || 0) >= 60, ut => Math.round(S.fans || 0) + '%'],
  acad: [ut => 'Wypromuj co najmniej jednego wychowanka do pierwszego zespołu', ut => (S.promoted || {})[S.season] >= 1, ut => `${(S.promoted || {})[S.season] || 0}/1`],
};
const RES_MAP = { 'Real Madrid Castilla': 'Real Madrid', 'Barça Atlètic': 'FC Barcelona', 'Atlético Madrileño': 'Atlético Madrid', 'Betis Deportivo': 'Real Betis', 'Sevilla Atlético': 'Sevilla', 'Juventus Next Gen': 'Juventus', 'RSCA Futures': 'RSC Anderlecht' };
function reserveParent(c) {
  if (c._par !== undefined) return c._par;
  let base = RES_MAP[c.name] || null;
  if (!base && (/ (B|II|U21|U23)$/.test(c.name) || /^Jong /.test(c.name))) base = c.name.replace(/ (B|II|U21|U23)$/, '').replace(/^Jong /, '');
  let par = null;
  if (base) { const p = S.clubs.find(x => x !== c && x.cc === c.cc && (x.name === base || x.name.startsWith(base + ' ') || x.name.endsWith(' ' + base))); par = p ? p.id : null; }
  return (c._par = par);
}
const isReserve = c => reserveParent(c) != null;
function cupReach(ut) { const cup = S.cups && S.cups[ut.cc]; if (!cup) return 99; let best = 99; for (const T of cup.rounds) if (T && T.some(t => t.h === ut.id || t.a === ut.id)) best = Math.min(best, T.length * 2); return best; }
function pickSideGoals() {
  const ut = userClub(), keys = shuffle(Object.keys(BOARD_GOALS)).slice(0, 2);
  S.board.side = keys.map(k => ({ k, v: BOARD_GOALS[k][3] ? BOARD_GOALS[k][3](ut) : null, t: BOARD_GOALS[k][0](ut), season: S.season }));
}
function evalSideGoals(lines) {
  const ut = userClub(); if (!S.board.side) return;
  for (const g of S.board.side) { if (g.season !== S.season) continue; const ok = BOARD_GOALS[g.k][1](ut, g); S.board.conf = clamp(S.board.conf + (ok ? 5 : -4), 0, 100); if (ok) mgrGain(0.5); lines.push(`${ok ? '✅' : '❌'} Cel dodatkowy: ${g.t}.`); }
}
function setBoardObjective() {
  const ut = userClub(), lg = S.leagues[ut.lg], ls = S.countries[lg.cc].leagues;
  const lv = lg.clubs.map(id => ({ id, l: teamLevel(club(id)) })).sort((a, b) => b.l - a.l);
  const rank = lv.findIndex(x => x.id === ut.id) + 1, n = lg.clubs.length;
  const down = lg.tier < ls.length ? promoN(lg.cc, lg.tier) : 0, up = lg.tier > 1 ? promoN(lg.cc, lg.tier - 1) : 0;
  let target = rank > n - down - 1 && down ? n - down : clamp(rank + (n >= 14 ? (rank <= 2 ? 1 : 2) : 1), 1, Math.max(1, n - down - 1)), text;
  // przejęcie w trakcie sezonu: cel uwzględnia aktualną pozycję w tabeli
  const tbNow = table(ut.lg), me = tbNow.find(r => r.id === ut.id); if (me && me.P >= 5) target = clamp(Math.max(target, me.pos - 2), 1, n);
  const upName = lg.tier > 1 ? S.leagues[ls[lg.tier - 2]].name : '';
  if (lg.tier > 1 && target <= up) text = `Celem zarządu jest awans (do ligi: ${upName}).`;
  else if (target <= 1) text = `Zarząd oczekuje mistrzostwa (${lg.name}).`;
  else if (down && target >= n - down - 2) text = `Celem zarządu jest utrzymanie (${lg.name}).`;
  else if (target >= n - 2) text = `Zarząd oczekuje przyzwoitej postawy – unikaj ostatnich miejsc (${lg.name}).`;
  else text = `Celem zarządu jest miejsce w czołowej ${target} (${lg.name}).`;
  S.board.target = target; S.board.text = text;
  if (!S.board.side || !S.board.side.length || S.board.side[0].season !== S.season) pickSideGoals();
  const ec = euroOf(ut.id);
  S.board.euro = ec ? (ec.teams.includes(ut.id) ? euroGoal(ec) : `awans do fazy ligowej: ${ec.name}`) : '';
}
function euroGoal(ec) { const ut = userClub(); return ec.id === 'CL' ? (ut.rep >= 88 ? 'ćwierćfinał Ligi Mistrzów' : ut.rep >= 78 ? 'awans z fazy ligowej Ligi Mistrzów' : 'godny występ w Lidze Mistrzów') : ut.rep >= 75 ? `ćwierćfinał: ${ec.name}` : `awans z fazy ligowej: ${ec.name}`; }

/* ---------- sezon ---------- */
function newSeason(first) {
  if (S.user >= 0 && clubOf && S.clubs) { const u = S.clubs.find(c => c.id === S.user); if (u) for (const p of u.players) p.ovrS = p.ovr; }
  buildCalendar();
  const WS = { long: winterSlots(12, 3), short: winterSlots(22, 12) };
  for (const lg of Object.values(S.leagues)) {
    lg.fix = makeFixtures(shuffle(lg.clubs));
    const R = lg.fix.length; lg.lsMap = Array(LS).fill(-1);
    // przerwa zimowa: kolejki tylko w dozwolonych slotach
    const wk = WINTER[lg.cc], ban = wk ? WS[wk] : [], ok = Array.from({ length: LS }, (_, i) => i).filter(i => !ban.includes(i)), sl = ok.length >= R ? ok : Array.from({ length: LS }, (_, i) => i);
    for (let r = 0; r < R; r++) lg.lsMap[sl[Math.round(r * (sl.length - 1) / Math.max(1, R - 1))]] = r;
  }
  allocateEurope();
  buildCups();
  buildNTComps();
  for (const c of S.clubs) { if (c.id !== S.user) { autoPick(c); for (const p of c.players) p.shp = Math.max(p.shp, 72); } c.fin = { inc: 0, exp: 0, tr: 0 }; }
  if (S.user >= 0) preOffers();
  if (!first && S.user >= 0) setBoardObjective();
}
/* ---------- sztab szkoleniowy ---------- */
const STAFF_ROLES = { ass: ['Asystent trenera', 'Szybszy rozwój całej kadry i rady przed meczem'], fit: ['Trener przygotowania fizycznego', 'Szybsza regeneracja kondycji, mniej kontuzji'], phy: ['Fizjoterapeuta', 'Krótsze leczenie kontuzji'], gk: ['Trener bramkarzy', 'Szybszy rozwój bramkarzy'] };
const staffWage = ab => Math.round((100 + Math.pow(ab, 2.4) * 18) / 100) * 100;
function genStaff(ab) { ab = clamp(Math.round(ab), 1, 20); return { n: genName(pick(COACH_NAT)), ab, wage: staffWage(ab) }; }
function initStaff(force) {
  if (S.staff && S.staff.ass && !force) return;
  const r = userClub().rep, base = clamp(r / 6, 3, 16);
  S.staff = {}; for (const k in STAFF_ROLES) S.staff[k] = genStaff(base + ri(-2, 2));
  S.staffMkt = null;
}
function staffMarket() {
  if (S.staffMkt && S.staffMkt.s === S.season && S.staffMkt.w === Math.floor(S.day / 10)) return S.staffMkt.list;
  const r = userClub().rep, list = {};
  for (const k in STAFF_ROLES) list[k] = [0, 1, 2].map(i => genStaff(clamp(r / 6 + 1 + i * 2 + gauss() * 2, 2, 20)));
  S.staffMkt = { s: S.season, w: Math.floor(S.day / 10), list }; return list;
}
function hireStaff(role, i) {
  const c = staffMarket()[role][i], ut = userClub(); if (!c) return { ok: false, msg: 'Kandydat niedostępny.' };
  const comp = S.staff[role].wage * 8;
  if (ut.bal - comp < 0) return { ok: false, msg: `Brak środków na odprawę dla obecnego członka sztabu (${money(comp)}).` }; ut.bal -= comp; ut.fin.exp += comp;
  S.staff[role] = c; S.staffMkt.list[role].splice(i, 1);
  saveSoon(); return { ok: true, msg: `${c.n} dołącza do sztabu (odprawa dla poprzednika: ${money(comp)}).` };
}
const staffAb = k => S.staff && S.staff[k] ? S.staff[k].ab : 10;
const staffCost = () => S.staff ? sum(Object.values(S.staff).map(x => x.wage)) : 0;
function assistantTip(opp) {
  const ab = staffAb('ass'), ut = userClub(); if (!opp || !opp.players) return '';
  const lvl = l => avg(opp.players.filter(p => LINE[p.pos] === l).map(p => p.ovr).sort((a, b) => b - a).slice(0, l === 'DEF' ? 4 : 3)) || 0;
  const L = { DEF: lvl('DEF'), MID: lvl('MID'), ATT: lvl('ATT') };
  const weak = Object.entries(L).sort((a, b) => a[1] - b[1])[0][0], strong = Object.entries(L).sort((a, b) => b[1] - a[1])[0][0];
  const gap = teamLevel(opp) - teamLevel(ut);
  if (ab < 7) return `Asystent: „Trudno coś powiedzieć o rywalu, zagrajmy swoje.”`;
  const wn = { DEF: 'obrona', MID: 'środek pola', ATT: 'atak' };
  if (L[strong] - L[weak] < 1.5) return `Asystent: „Rywal nie ma wyraźnie słabszej formacji. ${gap > 4 ? 'Są od nas lepsi – rozważ niski blok i grę z kontry.' : gap < -4 ? 'Jesteśmy faworytem – wysoki pressing powinien ich złamać.' : 'Mecz wyrównany.'}”`;
  return `Asystent: „Najsłabsza formacja rywala to ${wn[weak]}, najmocniejsza – ${wn[strong]}. ${gap > 4 ? 'Są od nas lepsi – rozważ niski blok, głęboką linię i grę z kontry.' : gap < -4 ? 'Jesteśmy faworytem – wysoki pressing i szybkie tempo powinny ich złamać.' : 'Mecz wyrównany.'}${weak === 'DEF' ? ' Ich obrona jest wolna – szeroka gra skrzydłami może dać efekty.' : ''}”${ab >= 14 ? ` Kluczowy zawodnik rywala: ${opp.players.slice().sort((a, b) => b.ovr - a.ovr)[0].n}.` : ''}`;
}
/* ---------- turnieje przedsezonowe ---------- */
const PRE_ELITE = ['Emirates Cup', 'Audi Cup', 'Trofeo Joan Gamper', 'Trofeo Santiago Bernabéu', 'Trofeo Teresa Herrera', 'Florida Cup', 'Asia Trophy', 'Amsterdam Tournament', 'Trofeo Ramón de Carranza', 'Copa Ciudad de Valencia'];
const PRE_TOUR = { ENG: 'Premier League Summer Series', USA: 'Turniej w USA', JPN: 'Japan Tour', KSA: 'Riyadh Season Cup', ESP: 'Turniej na Costa del Sol', GER: 'Telekom Cup', NED: 'Eredivisie Cup', POR: 'Algarve Cup', AUT: 'Turniej w Tyrolu', SUI: 'Uhrencup', TUR: 'Antalya Cup', MEX: 'Leagues Cup Warm-up', BRA: 'Turniej na Florydzie', POL: 'Turniej w Polsce', CZE: 'Tipsport Cup', DEN: 'Turniej w Danii' };
function preOffers() {
  const ut = userClub(), R = ut.rep, used = new Set([ut.id]);
  const pickT = (filter, n) => { const c = shuffle(S.clubs.filter(c => !used.has(c.id) && filter(c))).slice(0, n); c.forEach(x => used.add(x.id)); return c.map(x => x.id); };
  const offers = [];
  let t = pickT(c => c.cc === ut.cc && Math.abs(c.rep - R) <= 10, 3);
  if (t.length === 3) offers.push({ name: `${ut.name.split(' ')[0]} Cup`, kind: 'loc', teams: t, fee: Math.round(ut.tv * 0.6 / 1000) * 1000, win: Math.round(ut.tv * 1 / 1000) * 1000, fans: 2, fit: 0, desc: 'Łatwiejsi rywale z kraju, mecze blisko domu – mniejsze zmęczenie.' });
  const fcc = pick(Object.keys(PRE_TOUR).filter(k => k !== ut.cc && S.countries[k]));
  t = pickT(c => c.cc === fcc && Math.abs(c.rep - (R + 4)) <= 14, 3); if (t.length < 3) t = t.concat(pickT(c => c.cc !== ut.cc && Math.abs(c.rep - (R + 4)) <= 12, 3 - t.length));
  if (t.length === 3) offers.push({ name: PRE_TOUR[fcc], kind: 'tour', teams: t, fee: Math.round(ut.tv * 1.4 / 1000) * 1000, win: Math.round(ut.tv * 1.5 / 1000) * 1000, fans: 4, fit: -6, desc: 'Tournée zagraniczne – lepsze pieniądze i marketing, ale męcząca podróż.' });
  if (R >= 55) {
    t = pickT(c => c.rep >= Math.max(70, R), 3);
    if (t.length === 3) offers.push({ name: pick(PRE_ELITE), kind: 'elite', teams: t, fee: Math.round(ut.tv * 2.2 / 1000) * 1000, win: Math.round(ut.tv * 2.5 / 1000) * 1000, fans: 6, fit: -3, desc: 'Prestiżowy turniej z czołowymi klubami Europy – wysoka stawka i prestiż.' });
  }
  if (!offers.length) { t = pickT(() => true, 3); offers.push({ name: 'Turniej towarzyski', kind: 'loc', teams: t, fee: 50000, win: 50000, fans: 1, fit: 0, desc: '' }); }
  S.pre = { offers, chosen: null, season: S.season };
}
function choosePre(i) {
  const P = S.pre; if (!P || P.chosen) return;
  const o = P.offers[i] || P.offers[0]; P.chosen = { ...o, teams: o.teams.filter(id => id !== S.user) };
  while (P.chosen.teams.length < 3) P.chosen.teams.push(pick(S.clubs.filter(c => c.id !== S.user && !P.chosen.teams.includes(c.id))).id);
  const ut = userClub(); ut.bal += o.fee; ut.fin.inc += o.fee; ut.tb += Math.round(o.fee * 0.5);
  if (o.fit) for (const p of ut.players) p.fit = Math.max(60, p.fit + o.fit);
  if (S.fans != null) S.fans = clamp(S.fans + o.fans, 0, 100);
  msg(`☀️ ${o.name}`, `Przyjęliśmy zaproszenie (premia za udział ${money(o.fee)}). Rywale: ${P.chosen.teams.map(id => club(id).name).join(', ')}. Mecze przedsezonowe budują rytm meczowy zawodników.`);
}
function finishPre() {
  const T = S.pre.chosen, ut = userClub();
  if (T.fin.w === S.user) {
    ut.bal += T.win; ut.fin.inc += T.win; ut.tb += Math.round(T.win * 0.5);
    S.trophies.push({ kind: 'pre', name: T.name, season: S.season, club: ut.id });
    if (S.fans != null) S.fans = clamp(S.fans + 2, 0, 100);
    msg(`☀️ Wygraliśmy ${T.name}!`, `Triumf w turnieju przedsezonowym. Premia: ${money(T.win)}. Kibice są zachwyceni.`);
  }
}
function startCareer(name, clubId, nt, mgrOvr) {
  S.manager = name; S.user = clubId; S.nt = nt || null;
  const ut = userClub(); S.mgr = { ovr: mgrOvr || 50, best: mgrOvr || 50 }; clubFacilities(ut);
  S.attV = 3; S.board.since = S.season; S.board.ult = null; S.board.hired = absDay(); S.startClub = ut.id; S.startTier = S.leagues[ut.lg].tier; if (typeof metaInit === 'function') metaInit();
  if (!S.acad.youth.length) for (let i = 0, n = 3 + S.acad.rec; i < n; i++) { const y = genYouth(); y.age = ri(15, 17); S.acad.youth.push(y); PM.set(y.id, y); PALL.push(y); }
  for (const p of ut.players) p.ovrS = p.ovr;
  { const b = bestFormation(ut); if (b && b.avg >= pickLineup(ut, ut.formation).avg + 1) ut.formation = b.f; }   // start w formacji pasującej do kadry
  setBoardObjective(); autoPick(ut); preOffers(); initStaff(true); rebalanceSpons(ut); ut.spons += staffCost() + acadCost(); setWageBudget();
  msg('Witaj w klubie!', `Zarząd ${ut.name} powierzył Ci stery drużyny. ${S.board.text}${S.board.euro ? ' W Europie: ' + S.board.euro + '.' : ''} Okno transferowe jest otwarte – sprawdź skład, wyślij skautów i wzmocnij zespół.`);
  if (S.nt) msg('Reprezentacja', `Zostałeś także selekcjonerem reprezentacji: ${NAT[S.nt].name}. Powołania znajdziesz w zakładce Klub → Reprezentacja.`);
  const ec = Object.values(S.euro).find(c => c.teams.includes(ut.id) && c.lp);
  const eq = euroOf(ut.id); if (eq && !eq.teams.includes(ut.id)) msg(`🇪🇺 ${eq.name}: eliminacje`, `Zaczynamy sezon od eliminacji do rozgrywek ${eq.name} – pierwszy dwumecz na początku sierpnia. Przegrani spadają do niższego pucharu.`);
  if (ec) msg(`Losowanie: ${ec.name}`, `Poznaliśmy rywali w fazie ligowej: ${ec.lp.map(rd => rd.find(f => f.h === ut.id || f.a === ut.id)).filter(Boolean).map(f => club(f.h === ut.id ? f.a : f.h).name).join(', ')}.`);
  saveNow();
}
function payDebts() {
  const ut = userClub(), out = [];
  for (const d of S.debts || []) {
    const pay = club(d.from != null ? d.from : ut.id); pay.bal -= d.amt; pay.tb -= d.amt; pay.fin.tr -= d.amt; if (pay !== ut) continue; const c = club(d.to); if (c) c.bal += d.amt; d.left--;
    out.push(`${d.pn}: ${money(d.amt)}`);
  }
  S.debts = (S.debts || []).filter(d => d.left > 0 && (d.from == null || d.from === ut.id));
  if (out.length) msg('💳 Raty transferowe', `Zapłacono raty: ${out.join(', ')}.${S.debts.length ? ` Pozostało rat: ${S.debts.length}.` : ''}`);
}
function endSeason() {
  const ut = userClub(), lines = [];
  const finals = {};
  for (const id in S.leagues) finals[id] = table(id);
  const upos = finals[ut.lg].find(r => r.id === ut.id);
  const aw = seasonAwards(ut.lg, finals), ks0 = topScorers(ut.lg, 1)[0];
  const wasLg = ut.lg, wasTier = S.leagues[ut.lg].tier;
  // nagrody pieniężne
  for (const id in finals) { const n = finals[id].length; finals[id].forEach(r => { const c = club(r.id); const pr = Math.round(c.tv * 14 * (n - r.pos + 1) / n); c.bal += pr; c.fin.inc += pr; if (c.id === S.user) { c.tb += pr; lines.push(`💰 Premia za miejsce w lidze: ${money(pr)} (trafia też do budżetu transferowego).`); } }); }
  payDebts();
  for (const id in finals) { const champ = finals[id][0].id; (S.champs[id] = S.champs[id] || []).push({ s: S.season, c: champ }); }
  lines.unshift(`Twoja pozycja: ${upos.pos}. miejsce – ${S.leagues[wasLg].name} (${upos.Pts} pkt).`);
  lines.unshift(`🏆 Mistrzostwo (${S.leagues[wasLg].name}): ${club(finals[wasLg][0].id).name}.`);
  if (aw.length) lines.push(`🏅 Nagrody ${S.leagues[wasLg].name}: ${aw.join(' • ')}.`);
  // puchary
  const eh = { season: S.season };
  for (const c of Object.values(S.euro)) { eh[c.id] = c.champion; if (c.champion != null) lines.push(`🏆 ${c.name}: ${club(c.champion).name}.`); }
  S.euroHist.push(eh);
  if (ut.stadBuild) { ut.cap += ut.stadBuild.add; lines.push(`🏟️ Rozbudowa stadionu zakończona: ${ut.cap.toLocaleString('pl-PL')} miejsc.`); ut.stadBuild = null; }
  const presOld = prestigeSeason(finals);
  { const o = presOld[ut.id], n = presOf(ut); lines.push(`⭐ Prestiż klubu: ${o.toFixed(1)} → ${n.toFixed(1)} / 10 (${presWord(n)}).`); }
  S.lastWinners = { CL: S.euro.CL && S.euro.CL.champion, EL: S.euro.EL && S.euro.EL.champion, ECL: S.euro.ECL && S.euro.ECL.champion };
  const myEuro = Object.values(S.euro).find(c => c.teams.includes(ut.id)) || euroOf(ut.id);
  let euroOk = true;
  if (myEuro) {
    const reached = myEuro.champion === ut.id ? 6 : myEuro.ko.F && myEuro.ko.F[0].a === ut.id || myEuro.ko.F && myEuro.ko.F[0].b === ut.id ? 5 : ['SF', 'QF', 'R16', 'PO'].reduce((acc, st, i) => acc || (myEuro.ko[st] && myEuro.ko[st].some(t => t.a === ut.id || t.b === ut.id) ? 4 - i : 0), 0);
    const need = S.board.euro.startsWith('ćwierćfinał') ? 3 : S.board.euro.startsWith('awans') ? 1 : 0;
    euroOk = reached >= need;
    S.board.conf = clamp(S.board.conf + (reached - need) * 3, 0, 100);
  }
  // puchary krajowe
  S.lastCups = {}; for (const cup of Object.values(S.cups || {})) if (cup.champion != null) S.lastCups[cup.cc] = cup.champion;
  const myCup = S.cups && S.cups[ut.cc];
  if (myCup && myCup.champion != null) lines.push(`🏆 ${myCup.name}: ${club(myCup.champion).name}.`);
  evalSideGoals(lines);
  // współczynniki
  for (const cc in S.countries) { const c = S.countries[cc], r = S.cpts[cc]; c.coef.shift(); const raw = r && r.n ? r.pts / r.n : 0, base = avg(COEF0[cc] || [3]); c.coef.push(Math.round((raw * 0.7 + base * 0.3) * 1000) / 1000); }
  for (const id in S.ccoef) { S.ccoef[id].shift(); S.ccoef[id].push(0); }
  // reprezentacje
  if (S.ntc && S.ntc.tourn && S.ntc.tourn.champion) { S.ntHist.push({ season: S.season, name: S.ntc.tourn.name, champ: S.ntc.tourn.champion }); lines.push(`🌍 ${S.ntc.tourn.name}: zwycięża ${NAT[S.ntc.tourn.champion].flag} ${NAT[S.ntc.tourn.champion].name}.`); }
  // awanse/spadki
  for (const cc in S.countries) {
    const ls = S.countries[cc].leagues;
    for (let k = 0; k + 1 < ls.length; k++) {
      const l1 = ls[k], l2 = ls[k + 1], n = promoN(cc, k + 1);
      const down = finals[l1].slice(-n).map(r => r.id);
      // drużyny rezerw nie mogą awansować na poziom klubu macierzystego (ani wyżej)
      const canUp = id => { const c = club(id), par = reserveParent(c); return par == null || S.leagues[club(par).lg].tier < S.leagues[l1].tier; };
      const up = finals[l2].map(r => r.id).filter(canUp).slice(0, n);
      const L1 = S.leagues[l1], L2 = S.leagues[l2];
      L1.clubs = L1.clubs.filter(id => !down.includes(id)).concat(up); L2.clubs = L2.clubs.filter(id => !up.includes(id)).concat(down);
      down.forEach(id => { const c = club(id); c.lg = l2; c.rep = clamp(c.rep - 3, 1, 99); setupTV(c); if (c.id !== S.user) rebalanceSpons(c); });
      up.forEach(id => { const c = club(id); c.lg = l1; c.rep = clamp(c.rep + 3, 1, 99); setupTV(c); if (c.id !== S.user) rebalanceSpons(c); });
      if (up.includes(ut.id)) { lines.push(`⬆️ AWANS! Nowa liga: ${L1.name}!`); S.board.conf = clamp(S.board.conf + 15, 0, 100); mgrGain(4, 'awans'); }
      if (down.includes(ut.id)) { lines.push(`⬇️ Spadek… Nowa liga: ${L2.name}.`); S.board.conf = clamp(S.board.conf - 25, 0, 100); mgrGain(-4); }
    }
  }
  for (const id in finals) S.lastTables[id] = finals[id].map(r => r.id);
  const achieved = ut.lg !== wasLg ? S.leagues[ut.lg].tier < wasTier : upos.pos <= S.board.target;
  lines.push(achieved ? '✅ Cel ligowy zrealizowany!' : '❌ Cel ligowy niezrealizowany.');
  S.board.conf = clamp(S.board.conf + (achieved ? 10 : ut.lg !== wasLg ? -14 : -clamp(4 * (upos.pos - S.board.target), 4, 20)), 0, 100);
  const before = S.mgr.ovr;
  mgrGain(Math.min(5, clamp((S.board.target - upos.pos) * 0.8, -3, 4) + (achieved ? 1 : -1.5) + (upos.pos === 1 && wasLg === ut.lg ? (wasTier === 1 ? 4 : 2) : 0)));
  if (myEuro) { const st = myEuro.champion === ut.id ? 8 : myEuro.ko.F && (myEuro.ko.F[0].a === ut.id || myEuro.ko.F[0].b === ut.id) ? 5 : myEuro.ko.SF && myEuro.ko.SF.some(t => t.a === ut.id || t.b === ut.id) ? 3 : myEuro.ko.QF && myEuro.ko.QF.some(t => t.a === ut.id || t.b === ut.id) ? 2 : myEuro.ko.R16 && myEuro.ko.R16.some(t => t.a === ut.id || t.b === ut.id) ? 1 : 0; mgrGain(st * (myEuro.id === 'CL' ? 1 : 0.6)); }
  if (S.nt && S.ntc.tourn && S.ntc.tourn.champion === S.nt) mgrGain(6);
  const ovrLine = lines.length; lines.push('');
  if (typeof seasonMeta === 'function') seasonMeta({ finals, upos, wasLg, wasTier, myEuro, myCup, lines });
  // reputacja klubów
  for (const id in finals) { const n = finals[id].length; finals[id].forEach(r => { const c = club(r.id); if (c.rep0 == null) c.rep0 = c.rep; if (c.id !== ut.id) c.rep = clamp(c.rep + (r.pos <= 2 && rnd() < (97 - c.rep) / 15 ? 1 : r.pos >= n - 1 ? -1 : 0), 5, 97); }); }
  // powolny powrót reputacji do długoterminowego poziomu klubu (mniej wiecznych dynastii)
  for (const c of S.clubs) { if (c.rep0 == null) c.rep0 = c.rep; if (c.id !== ut.id && rnd() < 0.25) c.rep += Math.sign(c.rep0 - c.rep); }
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
  const ks = ks0; if (ks) lines.push(`👟 Król strzelców ligi: ${ks.n} (${plural(ks.lg, 'gol', 'gole', 'goli')}).`);
  S.history.push({ season: S.season, lg: wasLg, pos: upos.pos, pts: upos.Pts, club: ut.name, champ: club(finals[wasLg][0].id).name, scorer: ks ? `${ks.n} (${ks.lg})` : '-', achieved, euro: myEuro ? myEuro.name : '' });

  // statystyki kadry i finanse sezonu (przed resetem statystyk)
  { const sq = ut.players.filter(p => p.st && p.st.apps > 0), top = (k, f) => sq.slice().sort((a, b) => f(b) - f(a))[0];
    const g = top('g', p => p.st.g), a = top('a', p => p.st.a), ap = top('m', p => p.st.apps), rt = sq.filter(p => p.st.apps >= 8).sort((x, y) => y.st.rs / y.st.apps - x.st.rs / x.st.apps)[0];
    const grow = ut.players.filter(p => p.ovrS != null).map(p => ({ p, d: p.ovr - p.ovrS })).sort((x, y) => y.d - x.d)[0];
    if (g && g.st.g) lines.push(`📊 Najlepszy strzelec: ${g.n} (${plural(g.st.g, 'gol', 'gole', 'goli')}).`);
    if (a && a.st.a) lines.push(`📊 Najwięcej asyst: ${a.n} (${a.st.a}).`);
    if (rt) lines.push(`📊 Najwyższa średnia ocen: ${rt.n} (${(rt.st.rs / rt.st.apps).toFixed(2)} w ${plural(rt.st.apps, 'meczu', 'meczach', 'meczach')}).`);
    if (ap) lines.push(`📊 Najwięcej występów: ${ap.n} (${ap.st.apps}).`);
    if (grow && grow.d > 0) lines.push(`📊 Największy postęp: ${grow.p.n} (OVR ${grow.p.ovrS} → ${grow.p.ovr}).`);
    const F = ut.fin; lines.push(`💰 Finanse sezonu: przychody ${money(F.inc)}, koszty ${money(F.exp)}, transfery ${F.tr >= 0 ? '+' : ''}${money(F.tr)} • wynik ${money(F.inc - F.exp + F.tr)} • saldo ${money(ut.bal)}.`); }
  // zawodnicy
  const left = [], retired = [], back = [], potNotes = [], preMoves = [];
  for (const c of S.clubs) for (const p of c.players.slice()) {
    if (p.loan && p.loan.season === S.season) { const from = club(p.loan.from); detach(p); attach(p, from); if (from === ut) back.push(p.n); else if (c === ut) back.push(p.n); p.loan = null; }
  }
  for (const c of S.clubs) {
    for (const p of c.players.slice()) {
      if (p.age <= 24 && p.pot > 0) {
        let d = (p.pt - 0.6) * 3 + (traits(p).pro - 10.5) * 0.2 + gauss() * 1.4 + (p.loan && p.tid !== p.loan.from ? 1 : 0);
        if (d > 0) d *= clamp((88 - p.pot) / 12, 0.1, 1);   // im wyższy potencjał, tym trudniej o dalszy wzrost
        d = clamp(Math.round(d), -6, 6);
        const old = p.pot; p.pot = clamp(p.pot + d, p.ovr, 95);
        if (c === ut && Math.abs(p.pot - old) >= 4) potNotes.push(`${p.n} ${p.pot > old ? '📈 zaskakuje – rośnie jego potencjał' : '📉 rozczarowuje – potencjał spada'}`);
      }
      if (c === ut || (p.st.apps > 0 && (p.ovr >= 76 || (p.age <= 21 && p.pot >= 80) || p.hist))) { (p.hist = p.hist || []).push({ s: S.season, c: c.short, ovr: p.ovr, m: p.st.apps, g: p.st.g, a: p.st.a }); if (p.hist.length > 10) p.hist.shift(); }
      p.age++;
      if (p.age >= 30) p.pot = Math.min(p.pot, p.ovr + 1);
      if (p.pot < p.ovr) p.pot = p.ovr;   // potencjał nigdy poniżej aktualnej oceny
      p.inj = 0; p.susp = 0; p.fit = 100; p.form = 50; p.shp = 60; p.st = newStats(); p.lg = 0; p.eg = 0; p.listed = false; p.pt = 0.5;
      p.val = calcValue(p);
      if (p.age >= 34 && !p.preTo && (p.con <= 1 || p.age >= 37) && rnd() < 0.25 + (p.age - 34) * 0.2) { detach(p); PM.delete(p.id); if (c === ut) retired.push(p.n); continue; }
      p.con--;
      if (p.con <= 0 && p.preTo && c !== ut) {
        if (p.preTo.club === S.user) { preMoves.push(p); continue; }
        p.preTo = null;
      }
      if (p.con <= 0) {
        if (c === ut) { detach(p); p.tid = -1; S.free.push(p); left.push(p.n); }
        else if (p.age >= 32 && rnd() < 0.5) { detach(p); p.tid = -1; S.free.push(p); }
        else { p.con = ri(1, 4); p.wage = calcWage(p, c.rep); }
      } else if (c !== ut) p.wage = calcWage(p, c.rep);
    }
  }
  for (const p of S.free) if (p.preTo && p.preTo.club === S.user) preMoves.push(p); else p.preTo = null;
  for (const p of preMoves) { const pt = p.preTo; p.preTo = null; if (ut.players.length >= 32) { detach(p); p.tid = -1; S.free.push(p); lines.push(`📝 ${p.n} nie mógł dołączyć (kadra pełna) – jest wolnym zawodnikiem.`); continue; } detach(p); attach(p, ut); p.wage = pt.wage; p.con = pt.years; p.role = pt.role; p.joined = absDay(); p.ovrS = p.ovr; S.know[p.id] = 100; lines.push(`📝 Z prekontraktu dołącza: ${p.n} (${POS_PL[p.pos]}, ${p.ovr}).`); }
  for (const p of S.virt) { p.age++; if (p.age > 33) { Object.assign(p, genPlayer(p.pos, natLevel(NAT[p.nat]) - 3, p.nat, { age: ri(21, 25) }), { id: p.id, wage: 0 }); } }
  for (const p of S.free) { p.age++; p.val = calcValue(p); }
  S.free = S.free.filter(p => p.age <= 35).sort((a, b) => b.ovr - a.ovr).slice(0, 60);
  for (let i = 0; i < 30; i++) S.free.push(genFreeAgent());
  if (back.length) lines.push(`Powroty z wypożyczeń: ${back.join(', ')}.`);
  if (potNotes.length) lines.push(`🔮 Rozwój młodych: ${potNotes.join('; ')}.`);
  if (retired.length) lines.push(`Zakończyli kariery: ${retired.join(', ')}.`);
  if (left.length) lines.push(`Wygasły kontrakty (odeszli): ${left.join(', ')}.`);
  // młodzież
  for (const c of S.clubs) {
    if (c === ut) { refillAI(c); continue; }
    const n = c.players.length >= 26 ? ri(0, 1) : c.players.length >= 23 ? ri(1, 2) : ri(1, 3);
    const youth = [];
    for (let i = 0; i < n; i++) {
      const pos = pick(POSITIONS);
      // potencjał wychowanków zależy od poziomu klubu (bez inflacji jakości w niższych ligach); rzadkie perełki wszędzie
      const nat = rnd() < 0.8 ? S.countries[c.cc].nat : foreignNat(false), potBase = 52 + c.rep * 0.25 + ((NAT[nat] ? NAT[nat].str : 50) - 60) * 0.05;
      const y = genPlayer(pos, 0, nat, { age: ri(16, 18), adjAge: false, pot: clamp(Math.round(potBase + gauss() * 6 + (rnd() < 0.03 ? ri(8, 14) : 0)), 50, 93) });
      const a = genAttrs(pos, clamp(Math.round(34 + c.rep * 0.15 + gauss() * 3), 38, 56)); y.a = a; y.ovr = calcOvr(pos, a); y.alt = bestAlt(pos, a); y.pot = Math.max(y.pot, y.ovr + 5);
      y.con = 3; y.val = calcValue(y); y.wage = Math.round(calcWage(y, c.rep) * 0.6 / 100) * 100; attach(y, c); youth.push(y);
    }
    refillAI(c);
  }
  const out = academySeasonEnd(); if (out.length) lines.push(`🎓 Z akademii odeszli (21 lat, bez kontraktu): ${out.join(', ')}.`);
  // kadra gracza: minimum 18 zawodników (juniorzy z rezerw)
  const added = [];
  while (ut.players.length < 18) { const y = squadPlayer(ut, pick(['CB', 'CM', 'ST', 'LB', 'RB', 'GK', 'LW']), 2); y.age = Math.min(y.age, 20); y.con = 2; ut.players.push(y); added.push(y.n); }
  if (added.length) lines.push(`👥 Z rezerw dołączyli (by uzupełnić kadrę): ${added.join(', ')}.`);
  // ekonomia AI: wydawanie pieniędzy, ratowanie zadłużonych
  for (const c of S.clubs) {
    if (c.id === ut.id) continue;
    // nadwyżka ponad ~80 tygodni pensji idzie na infrastrukturę i koszty (odpływ pieniędzy z gry)
    const bill = sum(c.players.map(p => p.wage)), cap = bill * 80;
    if (c.bal > cap) c.bal = Math.round(cap + (c.bal - cap) * 0.6);
    c.tb = Math.min(Math.max(c.tb, Math.round(0.35 * c.bal)), Math.max(0, Math.round(c.bal * 0.7)));
    rebalanceSpons(c);
    if (c.bal < 0) {
      const star = c.players.filter(p => !p.loan).sort((a, b) => b.wage - a.wage)[0];
      const buyer = star && S.clubs.find(b => b.id !== c.id && b.id !== ut.id && b.tb >= star.val && b.rep >= c.rep - 5 && b.players.length < 27);
      if (buyer) { detach(star); attach(star, buyer); star.wage = calcWage(star, buyer.rep); star.con = ri(2, 4); buyer.bal -= star.val; buyer.tb -= star.val; c.bal += star.val; news(`${c.name} ratuje finanse: ${star.n} odchodzi do ${buyer.name} za ${money(star.val)}.`); }
      if (c.bal < 0) rebalanceSpons(c);
    }
  }
  // reprezentacja gracza: uzupełnij powołania do 23
  if (S.nt) { const st = S.ntTeams[S.nt]; st.sq = st.sq.filter(id => PM.has(id)); if (st.sq.length < 23) for (const id of autoCallup(S.nt)) { if (st.sq.length >= 23) break; if (!st.sq.includes(id)) st.sq.push(id); } }
  S.free = S.free.sort((a, b) => b.ovr - a.ovr).slice(0, 150);
  rebuildIndex();
  for (const c of S.clubs) { c.level = teamLevel(c); c.price = basePrice(c) * (c.id === S.user ? (S.tkt || 1) : 1); }
  // sponsorzy użytkownika: połowa drogi do poziomu pokrywającego koszty (bez niekończącego się wzrostu)
  { const sp0 = ut.spons; rebalanceSpons(ut); const tgt = ut.spons + staffCost() + acadCost(); ut.spons = Math.round((sp0 * 0.5 + tgt * 0.5) / 1000) * 1000; }
  ut.tb += Math.max(0, Math.round((ut.fin.inc - ut.fin.exp) * 0.3));
  ut.tb = Math.min(ut.tb, Math.max(0, Math.round(ut.bal * 0.8)));   // budżet nigdy ponad realne pieniądze
  const relegated = S.leagues[ut.lg].tier > wasTier;
  if (S.board.conf <= 12 - legendBuf() * 0.4) boardCrisis(lines, true, relegated); else S.board.conf = Math.round(Math.max(45 + legendBuf() * 0.6, 45 + (S.board.conf - 45) * 0.5));
  // nowy sezon
  S.season++; S.day = 0; S.offers = []; S.scoutMarket = Array.from({ length: 5 }, genScout);
  for (const n of NATIONS) { S.ntTeams[n.code].sq = S.ntTeams[n.code].sq.filter(id => PM.has(id)); }
  newSeason(false);
  setBoardObjective(); setWageBudget();
  lines[ovrLine] = `🧑‍💼 OVR trenera: ${Math.round(before)} → ${Math.round(S.mgr.ovr)}.`;
  if (!S.sacked && userClub().players.length < 22) lines.push(`👥 Uwaga: kadra liczy tylko ${userClub().players.length} zawodników (w tym rezerwy) – uzupełnij ją w letnim oknie.`);
  if (!S.sacked) lines.push(`Nowy sezon ${SEASON_LABEL(S.season)}. ${S.board.text}${S.board.euro ? ' W Europie: ' + S.board.euro + '.' : ''}`);
  const ec = euroOf(ut.id);
  if (ec) lines.push(ec.teams.includes(ut.id) ? `🇪🇺 Zagramy w fazie ligowej: ${ec.name}!` : `🇪🇺 Zagramy w eliminacjach: ${ec.name}.`);
  seasonJobOffers(lines);
  const title = `Podsumowanie sezonu ${SEASON_LABEL(S.season - 1)}`;
  msg(title, lines.join('\n')); if (S.inbox[0]) S.inbox[0].read = true;   // podsumowanie widać w oknie – bez sztucznego licznika
  autoPick(userClub()); S.offers = []; S.moSnap = null; S.moNow = null;
  S.summary = { title, lines, meta: { pos: upos.pos, pts: upos.Pts, n: finals[wasLg].length, lg: S.leagues[wasLg].name, w: upos.W, d: upos.D, l: upos.L, gf: upos.GF, ga: upos.GA, achieved, ovr0: Math.round(before), ovr1: Math.round(S.mgr.ovr), bal: userClub().bal, pres: presOf(userClub()) } };
  return S.summary;
}
function tvFor(c) { const t = TVW[c.cc] || [5e4, 1e4], tier = S.leagues[c.lg].tier, t2 = t[1] || t[0] * 0.15; return Math.round(tier === 1 ? t[0] : tier === 2 ? t2 : tier === 3 ? t2 * 0.3 : t2 * 0.12); }
function setupTV(c) { c.tv = tvFor(c); }
// udział tygodni z meczem domowym w lidze (np. 17 meczów u siebie na 46 terminów)
function homeShare(c) { const L = S.leagues[c.lg], R = L && L.fix ? L.fix.length : 34; return clamp(R / 2 / LS, 0.25, 0.5); }
function rebalanceSpons(c) { const bill = sum(c.players.map(p => p.wage)), gateAvg = homeShare(c) * Math.min(c.cap, ticketDemand(c)) * c.price; c.spons = Math.max(2000, Math.round((bill * (1.0 + c.rep / 700) - c.tv - gateAvg) / 1000) * 1000); }

/* ---------- praca ---------- */
function mgrGain(d) { if (d > 0) d *= clamp((95 - S.mgr.ovr) / 50, 0.15, 1); S.mgr.ovr = clamp(Math.round((S.mgr.ovr + d) * 10) / 10, 20, 99); S.mgr.best = Math.max(S.mgr.best || 0, S.mgr.ovr); }
// „status legendy”: trofea z ostatnich 5 sezonów chronią przed pochopnym zwolnieniem
function legendBuf() { const T = (S.trophies || []).filter(t => t.club === S.user && t.season >= S.season - 4 && t.kind !== 'pre'); return Math.min(25, T.length * 6); }
/* kryzys zaufania: najpierw wotum zaufania (ultimatum), dopiero przy kolejnym – zwolnienie; pierwszy sezon w klubie chroniony (chyba że spadek) */
function boardCrisis(lines, end, relegated) {
  const warned = S.board.ult === S.season, firstYear = S.board.since === S.season;
  // pierwszy sezon: w trakcie rozgrywek zwolnienie tylko przy grożącym spadku
  if (!end && warned && firstYear) { const lg = S.leagues[userClub().lg]; if (leaguePos(userClub()) <= lg.clubs.length - 3) return; }
  if (!warned || (end && firstYear && !relegated)) {
    S.board.ult = end ? S.season + 1 : S.season; S.board.conf = 26;
    const t = end ? 'Zarząd jest rozczarowany sezonem, ale daje Ci jeszcze szansę. Kolejny kryzys w nowym sezonie oznacza zwolnienie.' : 'Wotum zaufania: zarząd traci cierpliwość. Masz kilka tygodni na poprawę wyników – kolejny kryzys oznacza zwolnienie.';
    msg('⚠️ Wotum zaufania', t); if (lines) lines.push('⚠️ ' + t); return;
  }
  sack(); if (lines) lines.push('❌ Zarząd zdecydował o Twoim zwolnieniu.');
}
function sack() { if (S.sacked) return; S.sacked = true; mgrGain(S.mgr.ovr < 40 ? -1.5 : -4); msg('Zwolnienie', 'Zarząd rozwiązał z Tobą umowę. Twoja reputacja ucierpiała.'); }
const mgrLabel = o => o >= 85 ? 'Legenda' : o >= 76 ? 'Światowa klasa' : o >= 67 ? 'Uznany w Europie' : o >= 58 ? 'Solidny trener krajowy' : o >= 48 ? 'Trener niższych lig' : 'Debiutant';
const maxRepFor = ovr => ovr + 8;           // najwyższa reputacja klubu, który może zaoferować pracę
function fitsMgr(c) { return c.rep <= maxRepFor(S.mgr.ovr) && c.rep >= S.mgr.ovr - 30; }
function jobOffers() {
  let l = S.clubs.filter(c => c.id !== S.user && c.rep <= S.mgr.ovr + 2 && c.rep >= S.mgr.ovr - 25 && !isReserve(c));
  if (l.length < 3) l = S.clubs.filter(c => c.id !== S.user && fitsMgr(c));
  return l.sort(() => rnd() - 0.5).slice(0, 6).sort((a, b) => b.rep - a.rep);
}
function offerJob(c, why) {
  if (S.jobs.some(j => j.club === c.id) || c.id === S.user) return;
  S.jobs.push({ id: S.nextId++, club: c.id, exp: absDay() + 12, why });
  const d = curDay() ? curDay().date : 0, m0 = S.inbox.find(m => m.title.startsWith('📨 Oferty pracy') && m.date === d && !m.read);
  const line = `• ${c.name} (${S.countries[c.cc].flag} ${S.leagues[c.lg].name}) ${why}.`;
  if (m0) { m0.n = (m0.n || 1) + 1; m0.title = `📨 Oferty pracy (${m0.n})`; m0.body += '\n' + line; }
  else { msg('📨 Oferty pracy (1)', line + '\nSzczegóły: Pulpit → Oferty pracy.'); S.inbox[0].n = 1; }
}
function coachMarket(d) {
  S.jobs = S.jobs.filter(j => j.exp >= absDay() && j.club !== S.user);
  if (d.ls < 8 || d.ls > 34) return;   // zwolnienia rozłożone w czasie (nie wszystkie jednego dnia)
  for (const lg of Object.values(S.leagues)) {
    const tb = table(lg.id), lv = lg.clubs.map(id => ({ id, l: teamLevel(club(id)) })).sort((a, b) => b.l - a.l);
    for (const r of tb) {
      const c = club(r.id); if (c.id === S.user) continue;
      const exp = lv.findIndex(x => x.id === c.id) + 1;
      if (r.pos - exp >= 5 && r.P >= 6 && !(c._sackD > absDay() - 60) && rnd() < 0.035) {
        const old = c.coach; c.coach = genCoach(c.rep); c._sackD = absDay();
        if (c.cc === userClub().cc || c.rep >= 72) news(`${c.name} zwalnia trenera ${old.n}. Nowym szkoleniowcem został ${c.coach.n} (OVR ${c.coach.ovr}).`);
        if (fitsMgr(c) && c.rep > userClub().rep + 4 && rnd() < 0.35 && typeof pushEvent === 'function' && S.pending.length < 4 && S.evSeen && S.evSeen.approach !== S.season) { S.approach = c.id; pushEvent(EVENTS.find(e => e.id === 'approach'), {}); }
        else if (fitsMgr(c) && rnd() < 0.45 && S.jobs.length < 3 && absDay() - (S.lastAiOffer || -999) >= 30) { S.lastAiOffer = absDay(); offerJob(c, 'zwolnił trenera i chce Cię zatrudnić'); }
      }
    }
  }
}
function seasonJobOffers(lines) {
  const grown = S.mgr.ovr >= (S.mgr.prev || 0);
  S.mgr.prev = S.mgr.ovr;
  const pool = S.clubs.filter(c => c.id !== S.user && fitsMgr(c) && c.rep > userClub().rep - 5);
  const n = grown ? ri(1, 3) : ri(0, 1);
  for (let i = 0; i < n && pool.length; i++) { const c = pool.splice(ri(0, pool.length - 1), 1)[0]; offerJob(c, 'jest zainteresowany Twoimi usługami'); }
  if (S.jobs.length) lines.push(`📨 Oferty pracy: ${S.jobs.map(j => club(j.club).name).join(', ')}.`);
}
function acceptJob(id) {
  const j = S.jobs.find(x => x.id === id); if (!j) return;
  S.jobs = S.jobs.filter(x => x !== j);
  const old = userClub(); old.coach = genCoach(old.rep);
  takeOver(j.club);
}
const facFromRep = rep => clamp(Math.round((rep - 15) / 14), 1, 5);
function clubFacilities(c) {
  const st = (S.facStore = S.facStore || {})[c.id];
  if (st) { S.acad = st.acad; S.fac = st.fac; return; }
  const l = facFromRep(c.rep);
  S.acad = { fac: l, coach: l, rec: l, region: '', youth: [] }; S.fac = { train: l };
}
function storeFacilities(c) {
  (S.facStore = S.facStore || {})[c.id] = { acad: { ...S.acad, youth: [] }, fac: { ...S.fac } };
  // juniorzy zostają w starym klubie (z kontraktem); gdy kadra pełna – stają się wolnymi zawodnikami
  for (const y of S.acad.youth) { y.acad = null; if (c.players.length < 32) { attach(y, c); y.con = 3; y.wage = Math.max(300, Math.round(calcWage(y, c.rep) * 0.5 / 100) * 100); } else { y.tid = -1; y.wage = 0; S.free.push(y); } }
  S.acad.youth = [];
}
function takeOver(id) {
  if (S.user >= 0 && S.user !== id) {
    const old = userClub(); old.coach = genCoach(old.rep); storeFacilities(old);
    // raty przejmuje stary klub (spłaca je od razu)
    for (const d of (S.debts || []).filter(d => d.from == null || d.from === old.id)) { const t = d.amt * d.left; old.bal -= t; const c = club(d.to); if (c) c.bal += t; }
    S.debts = (S.debts || []).filter(d => d.from != null && d.from !== old.id);
  }
  S.user = id; clubFacilities(userClub()); rebuildIndex(); S.sacked = false; S.board.conf = 60; S.board.since = S.season; S.board.ult = null; S.board.hired = absDay(); S.offers = [];
  // nowy klub = nowy start: kibice, kapitan, obietnice i oczekujące wydarzenia nie przechodzą
  S.fans = 60; S.press = S.press != null ? Math.round((S.press + 55) / 2) : 55; S.captain = null; S.promises = []; S.pending = []; S.tkt = 1; S.jobs = S.jobs.filter(j => j.club !== id);
  S.board.side = null; setBoardObjective(); autoPick(userClub()); initStaff(true); { const u = userClub(); rebalanceSpons(u); u.spons += staffCost() + acadCost(); } setWageBudget();
  msg('Nowa praca', `Zostałeś trenerem ${userClub().name}. ${S.board.text}`); saveNow();
}
const ntAllowed = n => n.str <= S.mgr.ovr + 10;
function setNT(code) { S.nt = code || null; if (code) S.ntTeams[code].sq = autoCallup(code); saveSoon(); }

/* ---------- zapis (IndexedDB) – 4 sloty kariery ---------- */
const DB_NAME = 'kariera_menedzera', SLOTS = 4;
let SLOT = 1;
const slotKey = n => 'save' + n;
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB_NAME, 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
const idbGet = (db, k) => new Promise((res, rej) => { const r = db.transaction('s').objectStore('s').get(k); r.onsuccess = () => res(r.result == null ? null : r.result); r.onerror = () => rej(r.error); });
const idbPut = (db, k, v) => new Promise((res, rej) => { const tx = db.transaction('s', 'readwrite'); tx.objectStore('s').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
const idbDel = (db, k) => new Promise(res => { const tx = db.transaction('s', 'readwrite'); tx.objectStore('s').delete(k); tx.oncomplete = res; tx.onerror = res; });
function slotMeta() { const ut = S && S.user >= 0 ? userClub() : null; return ut ? { name: S.manager, club: ut.name, short: ut.short, col: ut.col, lg: S.leagues[ut.lg].name, season: S.season, date: curDay() ? curDay().date : 0, ovr: Math.round(S.mgr.ovr), ts: Date.now() } : null; }
async function saveNow() {
  if (typeof indexedDB === 'undefined' || !S) return;
  if (globalThis.MATCH_LIVE) return;   // w trakcie meczu na żywo (wyniki innych meczów już policzone) – zapis po zakończeniu dnia
  try { const db = await idb(); await idbPut(db, slotKey(SLOT), S); const meta = (await idbGet(db, 'meta')) || {}; meta[SLOT] = slotMeta(); await idbPut(db, 'meta', meta); } catch (e) { console.warn('save', e); }
}
let saveT = null;
function saveSoon() { clearTimeout(saveT); saveT = setTimeout(saveNow, 2500); }   // zapis ~12 MB – rzadziej; przy wyjściu z aplikacji zapis natychmiastowy
// lista slotów (tylko metadane); stary pojedynczy zapis trafia do slotu 1
async function listSlots() {
  if (typeof indexedDB === 'undefined') return {};
  try {
    const db = await idb(); let meta = (await idbGet(db, 'meta')) || {};
    const legacy = await idbGet(db, 'save');
    if (legacy && !meta[1]) { await idbPut(db, slotKey(1), legacy); const S0 = S; S = legacy; try { meta[1] = slotMeta(); } catch (e) { meta[1] = { name: legacy.manager, club: '?', season: legacy.season, ts: Date.now() }; } S = S0; await idbPut(db, 'meta', meta); await idbDel(db, 'save'); }
    return meta;
  } catch (e) { return {}; }
}
async function loadSlot(n) { if (typeof indexedDB === 'undefined') return null; try { const db = await idb(); return await idbGet(db, slotKey(n)); } catch (e) { return null; } }
async function deleteSlot(n) { if (typeof indexedDB === 'undefined') return; try { const db = await idb(); await idbDel(db, slotKey(n)); const meta = (await idbGet(db, 'meta')) || {}; delete meta[n]; await idbPut(db, 'meta', meta); } catch (e) { } }
function useSave(s) { if (typeof resetCaches === 'function') resetCaches(); S = s; rebuildIndex(); if (!S.attV) { S.attV = 1; for (const c of S.clubs) if (c.id !== S.user) rebalanceSpons(c); }
  // naprawa zapisów, w których migracja zaniżyła sponsora Twojego klubu (brak kosztów sztabu i akademii)
  if (S.attV < 3 && S.user >= 0) { S.attV = 3; const u = userClub(), sp0 = u.spons; if (S.staff) { rebalanceSpons(u); const tgt = u.spons + staffCost() + acadCost(); u.spons = Math.max(sp0, tgt); } } if (typeof metaInit === 'function') metaInit(); if (S.user >= 0) initStaff(); }

if (typeof module !== 'undefined') module.exports = { get S() { return S; } };
