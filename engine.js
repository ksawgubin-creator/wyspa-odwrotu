'use strict';
/* ============================================================
   KARIERA MENEDŻERA – silnik gry (bez zależności od DOM)
   ============================================================ */

/* ---------- narzędzia ---------- */
const rnd = Math.random;
const ri = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function wpick(items, wfn) {
  const ws = items.map(wfn); let r = rnd() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- dane ---------- */
const POS = ['GK', 'DEF', 'MID', 'ATT'];
const POS_PL = { GK: 'BR', DEF: 'OBR', MID: 'POM', ATT: 'NAP' };
const FORMATIONS = {
  '4-4-2': [4, 4, 2], '4-3-3': [4, 3, 3], '4-2-3-1': [4, 5, 1],
  '3-5-2': [3, 5, 2], '5-3-2': [5, 3, 2], '3-4-3': [3, 4, 3],
};
const MENT = { def: 'Defensywna', bal: 'Zrównoważona', att: 'Ofensywna' };
const TRAINING = {
  bal: 'Zrównoważony (pomocnicy)', fit: 'Kondycja (szybsza regeneracja)',
  att: 'Atak (napastnicy)', def: 'Obrona (obrońcy, bramkarze)',
};
const ROUNDS = 30;
const MAX_SUBS = 5;

const NATS = {
  PL: { flag: '🇵🇱', w: 55, f: ['Jakub', 'Mateusz', 'Kacper', 'Szymon', 'Bartosz', 'Filip', 'Michał', 'Dawid', 'Paweł', 'Kamil', 'Adrian', 'Patryk', 'Marcin', 'Łukasz', 'Oskar', 'Wojciech'], l: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Dąbrowski', 'Zając', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Pawlak', 'Michalski', 'Sikora', 'Baran', 'Duda', 'Szymański', 'Walczak', 'Jaworski', 'Malinowski', 'Stępień'] },
  EN: { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', w: 7, f: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'Tom', 'Jamie', 'Ben'], l: ['Smith', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Walker', 'Hughes', 'Carter'] },
  ES: { flag: '🇪🇸', w: 7, f: ['Pablo', 'Diego', 'Carlos', 'Álvaro', 'Sergio', 'Iván', 'Hugo', 'Marco'], l: ['García', 'Martínez', 'López', 'Sánchez', 'Romero', 'Navarro', 'Ortega', 'Vega'] },
  BR: { flag: '🇧🇷', w: 6, f: ['Thiago', 'Lucas', 'Gabriel', 'Rafael', 'Mateus', 'Caio', 'Bruno', 'Vitor'], l: ['Silva', 'Souza', 'Costa', 'Pereira', 'Lima', 'Rocha', 'Alves', 'Barros'] },
  DE: { flag: '🇩🇪', w: 6, f: ['Lukas', 'Jonas', 'Felix', 'Leon', 'Max', 'Niklas', 'Tim', 'Jan'], l: ['Müller', 'Schneider', 'Fischer', 'Weber', 'Becker', 'Hoffmann', 'Koch', 'Richter'] },
  FR: { flag: '🇫🇷', w: 5, f: ['Hugo', 'Théo', 'Louis', 'Mathis', 'Enzo', 'Nolan', 'Yanis', 'Rémi'], l: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Girard', 'Fabre', 'Roux'] },
  UA: { flag: '🇺🇦', w: 5, f: ['Artem', 'Dmytro', 'Maksym', 'Ivan', 'Oleh', 'Taras', 'Andriy', 'Bohdan'], l: ['Kovalenko', 'Bondar', 'Tkachenko', 'Melnyk', 'Shevchenko', 'Kravets', 'Lysenko', 'Savchuk'] },
  NG: { flag: '🇳🇬', w: 3, f: ['Emeka', 'Chidi', 'Tunde', 'Ifeanyi', 'Kelechi', 'Femi'], l: ['Okafor', 'Adeyemi', 'Eze', 'Balogun', 'Nwosu', 'Okoye'] },
};
const NATKEYS = Object.keys(NATS);

const CLUBS = [
  ['Huragan Warszawa', 'HUR', '#c0392b', '#ffffff'], ['Gryf Gdańsk', 'GRY', '#1f6f3f', '#f1c40f'],
  ['Kometa Kraków', 'KOM', '#1e5fa8', '#ffffff'], ['Zorza Wrocław', 'ZOR', '#e67e22', '#222222'],
  ['Szczyt Katowice', 'SZC', '#222222', '#f1c40f'], ['Burza Poznań', 'BUR', '#2c3e8f', '#e74c3c'],
  ['Tytani Łódź', 'TYT', '#8e44ad', '#ffffff'], ['Orlęta Lublin', 'ORL', '#16a085', '#ffffff'],
  ['Mazur Olsztyn', 'MAZ', '#2980b9', '#f1c40f'], ['Karpaty Rzeszów', 'KAR', '#27ae60', '#ffffff'],
  ['Fala Szczecin', 'FAL', '#0d7fa5', '#ffffff'], ['Bastion Białystok', 'BAS', '#7f8c8d', '#c0392b'],
  ['Jodła Kielce', 'JOD', '#2e7d32', '#ffeb3b'], ['Granit Opole', 'GRA', '#455a64', '#ffffff'],
  ['Żagiel Toruń', 'ZAG', '#c62828', '#1565c0'], ['Lwy Bydgoszcz', 'LWY', '#f9a825', '#212121'],
  ['Piorun Gliwice', 'PIO', '#f1c40f', '#1a1a1a'], ['Mewa Gdynia', 'MEW', '#039be5', '#ffffff'],
  ['Dąb Radom', 'DAB', '#33691e', '#ffffff'], ['Iskra Zielona Góra', 'ISK', '#d84315', '#ffffff'],
  ['Strzała Płock', 'STR', '#283593', '#ffffff'], ['Wilki Sanok', 'WIL', '#37474f', '#ff7043'],
  ['Kruk Gorzów', 'KRU', '#212121', '#ffffff'], ['Bursztyn Elbląg', 'BRS', '#ffa000', '#3e2723'],
  ['Turbina Tychy', 'TUR', '#00838f', '#ffffff'], ['Cegła Zamość', 'CEG', '#bf360c', '#ffffff'],
  ['Młot Kalisz', 'MLO', '#546e7a', '#ffca28'], ['Płomień Legnica', 'PLO', '#e53935', '#ffeb3b'],
  ['Perła Chełm', 'PER', '#5e35b1', '#ffffff'], ['Zamek Malbork', 'ZAM', '#6d4c41', '#ffffff'],
  ['Jaskółka Tarnobrzeg', 'JAS', '#1976d2', '#ffffff'], ['Wicher Słupsk', 'WIC', '#00695c', '#ffffff'],
];
const DIV_NAMES = ['Ekstraliga', 'Liga Pierwsza'];

/* ---------- stan globalny ---------- */
let S = null;            // stan gry (serializowalny)
let PM = new Map();      // id -> zawodnik
const team = id => S.teams[id];
const userTeam = () => S.teams[S.user];
function rebuildIndex() {
  PM = new Map();
  for (const t of S.teams) for (const p of t.players) { p.tid = t.id; PM.set(p.id, p); }
  for (const p of S.free) { p.tid = -1; PM.set(p.id, p); }
}

/* ---------- zawodnicy ---------- */
function shortName(p) { const parts = p.name.split(' '); return parts[0][0] + '. ' + parts.slice(1).join(' '); }
function lastName(p) { return p.name.split(' ').slice(1).join(' '); }
function calcValue(p) {
  let v = 20000 * Math.exp(0.14 * (p.ovr - 40));
  const a = p.age;
  v *= a <= 20 ? 1.5 : a <= 23 ? 1.3 : a <= 26 ? 1.1 : a <= 29 ? 1 : a <= 31 ? 0.65 : a <= 33 ? 0.4 : 0.2;
  if (a < 25) v *= 1 + Math.max(0, p.pot - p.ovr) * 0.035;
  return Math.max(10000, Math.round(v / 10000) * 10000);
}
const calcWage = p => Math.max(500, Math.round(550 * Math.exp(0.1 * (p.ovr - 40)) / 50) * 50);

function genPlayer(pos, level, o = {}) {
  const nat = wpick(NATKEYS, k => NATS[k].w);
  const age = o.age || clamp(Math.round(25 + gauss() * 4.8), 17, 37);
  let ovr = o.ovr != null ? o.ovr : level + gauss() * 5.5 + (pos === 'GK' ? -1 : 0);
  if (o.ovr == null) { if (age < 22) ovr -= (22 - age) * 2.2; if (age > 31) ovr -= (age - 31) * 0.8; }
  ovr = clamp(Math.round(ovr), 30, 92);
  let pot = ovr;
  if (age < 28) pot = ovr + Math.round(Math.max(0, 27 - age) * rnd() * 1.5 + rnd() * 3);
  if (o.pot) pot = o.pot;
  pot = clamp(pot, ovr, 95);
  const p = {
    id: S.nextPid++, name: pick(NATS[nat].f) + ' ' + pick(NATS[nat].l), nat, pos, age, ovr, pot,
    form: ri(40, 60), fit: ri(90, 100), inj: 0, susp: 0, con: ri(1, 4), wage: 0, val: 0,
    apps: 0, g: 0, a: 0, rs: 0, cap: 0, cg: 0, ca: 0, listed: false,
  };
  p.val = calcValue(p); p.wage = calcWage(p);
  return p;
}
const SQUAD_SHAPE = { GK: 3, DEF: 8, MID: 8, ATT: 5 };
function genSquad(level) {
  const out = [];
  for (const pos of POS) for (let i = 0; i < SQUAD_SHAPE[pos]; i++) out.push(genPlayer(pos, level));
  return out;
}
const teamLevel = t => {
  const o = t.players.map(p => p.ovr).sort((a, b) => b - a).slice(0, 14);
  return o.reduce((a, b) => a + b, 0) / (o.length || 1);
};

/* ---------- ustawienie składu ---------- */
const slotGroups = f => { const [d, m, a] = FORMATIONS[f]; return ['GK', ...Array(d).fill('DEF'), ...Array(m).fill('MID'), ...Array(a).fill('ATT')]; };
const isAvail = p => !p.inj && !p.susp;
function posFactor(p, g) { if (p.pos === g) return 1; if (g === 'GK' || p.pos === 'GK') return 0.45; return 0.8; }
function effBase(p, g, fit) {
  const f = fit != null ? fit : p.fit;
  return p.ovr * (0.72 + 0.28 * clamp(f, 0, 100) / 100) * (0.96 + 0.0008 * p.form) * posFactor(p, g);
}
function autoPick(t, formation) {
  const f = formation || t.formation;
  const [d, m, a] = FORMATIONS[f];
  const need = { GK: 1, DEF: d, MID: m, ATT: a };
  const pool = t.players.filter(isAvail);
  const used = new Set(), picks = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const g of ['GK', 'ATT', 'MID', 'DEF']) {
    const cand = pool.filter(p => !used.has(p.id)).sort((x, y) => effBase(y, g) - effBase(x, g));
    for (let i = 0; i < need[g] && i < cand.length; i++) { picks[g].push(cand[i]); used.add(cand[i].id); }
  }
  t.formation = f;
  t.lineup = [...picks.GK, ...picks.DEF, ...picks.MID, ...picks.ATT].map(p => p.id);
  fillBench(t);
}
function fillBench(t) {
  const inL = new Set(t.lineup);
  const rest = t.players.filter(p => isAvail(p) && !inL.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  const bench = [];
  const gk = rest.find(p => p.pos === 'GK'); if (gk) bench.push(gk);
  for (const p of rest) { if (bench.length >= 7) break; if (!bench.includes(p)) bench.push(p); }
  t.bench = bench.map(p => p.id);
}
/* naprawia skład gracza: kontuzjowani/zawieszeni/brakujący zastępowani */
function fixLineup(t) {
  const groups = slotGroups(t.formation);
  t.lineup = t.lineup.filter(id => PM.has(id) && PM.get(id).tid === t.id);
  const msgs = [];
  while (t.lineup.length < 11) t.lineup.push(null);
  for (let i = 0; i < 11; i++) {
    const p = t.lineup[i] != null ? PM.get(t.lineup[i]) : null;
    if (p && isAvail(p)) continue;
    const inL = new Set(t.lineup.filter(x => x != null));
    const cand = t.players.filter(x => isAvail(x) && !inL.has(x.id)).sort((x, y) => effBase(y, groups[i]) - effBase(x, groups[i]))[0];
    if (cand) { t.lineup[i] = cand.id; if (p) msgs.push(`${shortName(p)} niedostępny – zastąpił go ${shortName(cand)}.`); }
    else {
      const e = genPlayer(groups[i], Math.max(40, teamLevel(t) - 12), { age: 18 });
      e.name = 'Junior ' + lastName(e); t.players.push(e); PM.set(e.id, e); e.tid = t.id; t.lineup[i] = e.id;
    }
  }
  const inL = new Set(t.lineup);
  t.bench = t.bench.filter(id => PM.has(id) && PM.get(id).tid === t.id && isAvail(PM.get(id)) && !inL.has(id));
  if (t.bench.length < 7) {
    const rest = t.players.filter(p => isAvail(p) && !inL.has(p.id) && !t.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
    for (const p of rest) { if (t.bench.length >= 7) break; t.bench.push(p.id); }
  }
  return msgs;
}

/* ---------- silnik meczu ---------- */
function makeSide(t, quick) {
  const isUser = t.id === S.user;
  if (!isUser) { t.ment = 'bal'; autoPick(t); } else fixLineup(t);
  const groups = slotGroups(t.formation);
  const side = {
    t, form: t.formation, ment: t.ment || 'bal', ai: !isUser || quick,
    pitch: t.lineup.map((id, i) => ({ p: PM.get(id), g: groups[i] })),
    bench: t.bench.map(id => PM.get(id)), subs: 0, goals: 0, shots: 0, sot: 0, poss: 0, fouls: 0, yel: 0,
    rec: {}, str: null, scorers: [],
  };
  for (const s of side.pitch) side.rec[s.p.id] = { p: s.p, on: 0, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0 };
  return side;
}
function createMatch(h, a, quick) {
  const m = { home: makeSide(h, quick), away: makeSide(a, quick), minute: 0, end: 90 + ri(1, 4), over: false, htDone: false, ev: [], dirty: true, alert: null };
  // mentalność AI zależna od różnicy klas
  const d = h.rep - a.rep;
  if (m.home.ai && h.id !== S.user) m.home.ment = d > 10 ? 'att' : d < -12 ? 'def' : 'bal';
  if (m.away.ai && a.id !== S.user) m.away.ment = d < -10 ? 'att' : d > 12 ? 'def' : 'bal';
  return m;
}
const fitNow = (side, s, minute) => Math.max(30, s.p.fit - Math.max(0, minute - side.rec[s.p.id].on) * 0.2);
function calcStr(side, minute) {
  const g = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const s of side.pitch) g[s.g].push(effBase(s.p, s.g, fitNow(side, s, minute)));
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 30;
  const miss = 1 - 0.07 * (11 - side.pitch.length);
  const am = side.ment === 'att' ? 1.04 : side.ment === 'def' ? 0.96 : 1;
  const dm = side.ment === 'att' ? 0.97 : side.ment === 'def' ? 1.04 : 1;
  side.str = { gk: avg(g.GK) * miss, def: avg(g.DEF) * miss * dm, mid: avg(g.MID) * miss, att: avg(g.ATT) * miss * am };
}
function ev(m, type, side, text, extra) { const e = { min: m.minute, type, side: side ? (side === m.home ? 'h' : 'a') : null, text, ...extra }; m.ev.push(e); return e; }
const GOAL_TXT = ['{s} pakuje piłkę do siatki!', '{s} uderza przy słupku – nie do obrony!', '{s} wykańcza akcję zespołu!', '{s} pewnie wykorzystuje sytuację sam na sam!', '{s} główkuje do siatki!', '{s} uderza z dystansu – bramkarz bez szans!'];
const SAVE_TXT = ['{s} uderza, ale {k} broni!', 'Świetna interwencja {k} po strzale {s}!', '{k} wyciąga się jak struna i odbija strzał {s}.', '{s} próbuje przelobować – {k} łapie piłkę.'];
const MISS_TXT = ['{s} strzela obok słupka.', '{s} uderza prosto w trybuny.', '{s} nie trafia czysto w piłkę.', 'Strzał {s} zablokowany przez obrońcę.', '{s} uderza w poprzeczkę!'];

function pickShooter(side) {
  const c = side.pitch.filter(s => s.g !== 'GK');
  return wpick(c, s => (s.g === 'ATT' ? 5.5 : s.g === 'MID' ? 2.4 : 0.6) * Math.pow(s.p.ovr / 60, 3));
}
function doShot(m, A, D) {
  const sh = pickShooter(A); if (!sh) return;
  const gk = D.pitch.find(s => s.g === 'GK');
  const gkE = gk ? effBase(gk.p, 'GK', fitNow(D, gk, m.minute)) : 30;
  const shE = effBase(sh.p, sh.g, fitNow(A, sh, m.minute));
  const penalty = rnd() < 0.025;
  const q = shE / (0.5 * gkE + 0.5 * D.str.def);
  const pg = penalty ? 0.78 : clamp(0.083 * Math.pow(q, 2.6), 0.02, 0.4);
  A.shots++;
  const nm = shortName(sh.p), kn = gk ? lastName(gk.p) : 'obrońca';
  if (penalty) ev(m, 'info', A, `🟨 Rzut karny dla ${A.t.name}! Do piłki podchodzi ${nm}...`);
  if (rnd() < pg) {
    A.sot++; A.goals++;
    let ast = null;
    if (!penalty && rnd() < 0.75) {
      const c = A.pitch.filter(s => s !== sh && s.g !== 'GK');
      ast = wpick(c, s => s.g === 'DEF' ? 1 : 3).p;
    }
    A.rec[sh.p.id].g++; if (ast) A.rec[ast.id].a++;
    A.scorers.push({ min: m.minute, name: shortName(sh.p), pen: penalty });
    ev(m, 'goal', A, `⚽ GOL! ${A.t.name}! ` + pick(GOAL_TXT).replace('{s}', nm) + (ast ? ` Asysta: ${shortName(ast)}.` : penalty ? ' (rzut karny)' : ''), { pid: sh.p.id });
    m.dirty = true; m.alert = 'goal';
  } else if (rnd() < 0.42) {
    A.sot++; if (gk) D.rec[gk.p.id].sv++;
    if (rnd() < 0.65) ev(m, 'chance', A, pick(SAVE_TXT).replace('{s}', nm).replace('{k}', kn));
  } else if (rnd() < 0.45) ev(m, 'chance', A, pick(MISS_TXT).replace('{s}', nm));
}
function removeFromPitch(side, p) { side.pitch = side.pitch.filter(s => s.p !== p); }
function substitute(m, side, outP, inP) {
  const s = side.pitch.find(x => x.p === outP);
  if (!s || side.subs >= MAX_SUBS || !side.bench.includes(inP)) return false;
  s.p = inP; side.bench = side.bench.filter(b => b !== inP); side.subs++;
  side.rec[outP.id].off = m.minute;
  side.rec[inP.id] = { p: inP, on: m.minute, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0 };
  ev(m, 'sub', side, `🔁 ${side.t.name}: ${shortName(inP)} za ${shortName(outP)}.`);
  m.dirty = true; return true;
}
function aiSubs(m, side) {
  if (side.subs >= MAX_SUBS || !side.bench.length) return;
  const cand = side.pitch.filter(s => s.g !== 'GK').map(s => ({ s, f: fitNow(side, s, m.minute) })).sort((a, b) => a.f - b.f)[0];
  if (!cand || cand.f > 72) return;
  const rep = side.bench.filter(b => b.pos === cand.s.g && b.pos !== 'GK').sort((a, b) => b.ovr - a.ovr)[0] || side.bench.filter(b => b.pos !== 'GK')[0];
  if (rep) substitute(m, side, cand.s.p, rep);
}

/* jedna minuta; zwraca 'ht' / 'ft' / null */
function step(m) {
  if (m.over) return 'ft';
  m.minute++; m.alert = null;
  const mn = m.minute, H = m.home, A = m.away;
  if (m.dirty || mn % 6 === 0 || !H.str) { calcStr(H, mn); calcStr(A, mn); m.dirty = false; }
  const hm = Math.pow(H.str.mid, 2) * 1.06, am = Math.pow(A.str.mid, 2);
  const att = rnd() < hm / (hm + am) ? H : A, def = att === H ? A : H;
  att.poss++;
  const aS = 0.7 * att.str.att + 0.3 * att.str.mid, dS = 0.65 * def.str.def + 0.35 * def.str.mid;
  const mAtt = att.ment === 'att' ? 1.18 : att.ment === 'def' ? 0.82 : 1;
  const mOpp = def.ment === 'att' ? 1.12 : def.ment === 'def' ? 0.88 : 1;
  const pShot = clamp(0.25 * Math.pow(aS / dS, 1.7) * mAtt * mOpp, 0.03, 0.7);
  if (rnd() < pShot) doShot(m, att, def);

  for (const side of [H, A]) {
    if (rnd() < 0.011) { // kartka
      const s = wpick(side.pitch.filter(x => x.g !== 'GK').concat(side.pitch), x => x.g === 'DEF' ? 3 : x.g === 'MID' ? 2 : 1);
      const r = side.rec[s.p.id]; side.fouls++;
      if (r.y >= 1) {
        r.r = 1; r.y = 2; removeFromPitch(side, s.p); s.p.susp = ri(1, 2); s.p._fresh = true; m.dirty = true;
        ev(m, 'red', side, `🟥 Druga żółta i czerwona kartka dla ${shortName(s.p)} (${side.t.name})! Gra w osłabieniu.`); m.alert = 'red';
      } else { r.y = 1; side.yel++; ev(m, 'yellow', side, `🟨 Żółta kartka dla ${shortName(s.p)} (${side.t.name}).`); }
    } else if (rnd() < 0.0005 && side.pitch.length > 8) {
      const s = pick(side.pitch);
      side.rec[s.p.id].r = 1; removeFromPitch(side, s.p); s.p.susp = ri(1, 3); s.p._fresh = true; m.dirty = true;
      ev(m, 'red', side, `🟥 Czerwona kartka! ${shortName(s.p)} (${side.t.name}) opuszcza boisko.`); m.alert = 'red';
    }
    if (rnd() < 0.0011) { // kontuzja
      const s = pick(side.pitch);
      const w = rnd() < 0.7 ? ri(1, 3) : rnd() < 0.83 ? ri(4, 8) : ri(9, 20);
      s.p.inj = w; s.p._fresh = true;
      ev(m, 'injury', side, `🚑 Kontuzja! ${shortName(s.p)} (${side.t.name}) nie może kontynuować (ok. ${w} tyg.).`); m.alert = 'injury';
      const rep = side.bench.filter(b => b.pos === s.g).sort((a, b) => b.ovr - a.ovr)[0] || side.bench[0];
      if (rep && side.subs < MAX_SUBS && s.p.pos !== 'GK') substitute(m, side, s.p, rep);
      else if (rep && side.subs < MAX_SUBS) substitute(m, side, s.p, side.bench.find(b => b.pos === 'GK') || rep);
      else { side.rec[s.p.id].off = mn; removeFromPitch(side, s.p); }
      m.dirty = true;
    }
    if (side.ai && (mn === 58 || mn === 68 || mn === 77 || mn === 85)) aiSubs(m, side);
  }
  if (mn === 45 && !m.htDone) { m.htDone = true; ev(m, 'ht', null, `⏸ Przerwa. ${H.t.name} ${H.goals}:${A.goals} ${A.t.name}`); return 'ht'; }
  if (mn >= m.end) { finishMatch(m); return 'ft'; }
  return null;
}

function finishMatch(m) {
  m.over = true;
  ev(m, 'ft', null, `🏁 Koniec meczu! ${m.home.t.name} ${m.home.goals}:${m.away.goals} ${m.away.t.name}`);
  for (const [side, opp] of [[m.home, m.away], [m.away, m.home]]) {
    const gd = side.goals - opp.goals;
    for (const r of Object.values(side.rec)) {
      const p = r.p, end = r.off != null ? r.off : m.minute, mins = Math.max(0, end - r.on);
      if (r.r) { /* czerwona – minuty do końca wyłączone */ }
      let rating = 6.2 + gd * 0.18 + r.g * 1.1 + r.a * 0.6 - r.r * 1.6 - r.y * 0.15 + r.sv * 0.25 + gauss() * 0.5;
      if (p.pos === 'GK' || p.pos === 'DEF') rating += (opp.goals === 0 ? 0.5 : 0) - opp.goals * 0.2;
      r.rating = clamp(Math.round(rating * 10) / 10, 3, 10);
      r.mins = mins;
      p.fit = clamp(p.fit - mins * 0.24, 20, 100);
      p.apps++; p.g += r.g; p.a += r.a; p.rs += r.rating; p.cap++; p.cg += r.g; p.ca += r.a;
      p.form = Math.round(clamp(p.form * 0.65 + clamp((r.rating - 4) / 5 * 100, 0, 100) * 0.35, 0, 100));
    }
  }
  const all = [...Object.values(m.home.rec), ...Object.values(m.away.rec)];
  m.motm = all.sort((a, b) => b.rating - a.rating)[0];
}
function quickSim(h, a) { const m = createMatch(h, a, true); while (!m.over) step(m); return m; }

/* ---------- terminarz i tabela ---------- */
function makeFixtures(ids) {
  const n = ids.length, arr = ids.slice(), rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const rd = [];
    for (let i = 0; i < n / 2; i++) {
      let h = arr[i], a = arr[n - 1 - i];
      if ((r + i) % 2 === 1) [h, a] = [a, h];
      if (i === 0 && r % 2 === 1) [h, a] = [a, h];
      rd.push({ h, a, played: false, hg: 0, ag: 0 });
    }
    rounds.push(rd);
    arr.splice(1, 0, arr.pop());
  }
  const second = rounds.map(rd => rd.map(f => ({ h: f.a, a: f.h, played: false, hg: 0, ag: 0 })));
  return shuffleRounds(rounds.concat(second));
}
function shuffleRounds(r) { return r; }
function buildSeason() {
  S.fix = [0, 1].map(d => makeFixtures(shuffle(S.teams.filter(t => t.div === d).map(t => t.id))));
}
function table(div) {
  const rows = S.teams.filter(t => t.div === div).map(t => ({ id: t.id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0, form: [] }));
  const byId = {}; rows.forEach(r => byId[r.id] = r);
  for (const rd of S.fix[div]) for (const f of rd) {
    if (!f.played) continue;
    const H = byId[f.h], A = byId[f.a];
    H.P++; A.P++; H.GF += f.hg; H.GA += f.ag; A.GF += f.ag; A.GA += f.hg;
    if (f.hg > f.ag) { H.W++; A.L++; H.Pts += 3; H.form.push('W'); A.form.push('L'); }
    else if (f.hg < f.ag) { A.W++; H.L++; A.Pts += 3; A.form.push('W'); H.form.push('L'); }
    else { H.D++; A.D++; H.Pts++; A.Pts++; H.form.push('D'); A.form.push('D'); }
  }
  rows.sort((a, b) => b.Pts - a.Pts || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF || a.id - b.id);
  rows.forEach((r, i) => r.pos = i + 1);
  return rows;
}
function userFixture(round) {
  const t = userTeam();
  return S.fix[t.div][round === undefined ? S.round : round].find(f => f.h === t.id || f.a === t.id);
}
function topScorers(div, n = 15) {
  return S.teams.filter(t => t.div === div).flatMap(t => t.players).filter(p => p.g > 0)
    .sort((a, b) => b.g - a.g || b.a - a.a).slice(0, n);
}

/* ---------- świat / nowa gra ---------- */
function setupTeamEconomy(t) {
  const bill = t.players.reduce((s, p) => s + p.wage, 0);
  t.tv = t.div === 0 ? 30000 + t.rep * 450 : 12000 + t.rep * 250;
  const gateAvg = 0.5 * t.cap * 0.75 * t.price;
  t.spons = Math.max(1500, Math.round((bill * (1.0 + t.rep / 350 + rnd() * 0.12) - t.tv - gateAvg) / 100) * 100);
  const sv = t.players.reduce((s, p) => s + p.val, 0);
  t.bal = Math.round(sv * (0.08 + rnd() * 0.1) / 50000) * 50000;
  t.tb = Math.round(t.bal * 0.6 / 50000) * 50000;
}
function createWorld() {
  S = { v: 1, manager: '', season: 2026, round: 0, user: 0, teams: [], fix: [], free: [], inbox: [], offers: [], history: [], nextPid: 1, sacked: false, board: { conf: 60, target: 8, text: '' }, settings: { speed: 2 }, nextOffer: 1, summary: null };
  const reps = [shuffle(Array.from({ length: 16 }, (_, i) => Math.round(86 - i * 2.8 + ri(-2, 2)))), shuffle(Array.from({ length: 16 }, (_, i) => Math.round(50 - i * 1.6 + ri(-2, 2))))];
  CLUBS.forEach((c, i) => {
    const div = i < 16 ? 0 : 1, rep = reps[div][i % 16];
    const t = {
      id: i, name: c[0], short: c[1], col: [c[2], c[3]], div, rep, players: [], formation: pick(['4-4-2', '4-3-3', '4-2-3-1', '3-5-2']),
      ment: 'bal', lineup: [], bench: [], training: 'bal',
      cap: Math.round((rep * rep * 4 + rep * 100) / 500) * 500, price: 3 + rep * 0.07,
    };
    t.players = genSquad(38 + rep * 0.36);
    t.level = teamLevel(t);
    setupTeamEconomy(t);
    S.teams.push(t);
  });
  for (let i = 0; i < 40; i++) S.free.push(genFreeAgent());
  rebuildIndex();
  S.teams.forEach(t => autoPick(t));
  buildSeason();
}
function startCareer(managerName, userClubId) {
  S.manager = managerName; S.user = userClubId; setBoardObjective();
  msg('Witaj w klubie!', `Zarząd ${userTeam().name} powierzył Ci stery drużyny. ${S.board.text} Okno transferowe jest otwarte – sprawdź skład i wzmocnij zespół.`);
  save();
}
function newGame(managerName, userClubId) { createWorld(); startCareer(managerName, userClubId); }
function genFreeAgent() {
  const lvl = 40 + rnd() * 24;
  const p = genPlayer(wpick(POS, k => k === 'GK' ? 0.6 : 1), lvl);
  p.val = Math.round(p.val * 0.5 / 10000) * 10000; return p;
}
function setBoardObjective() {
  const t = userTeam();
  const lv = S.teams.filter(x => x.div === t.div).map(x => teamLevel(x)).sort((a, b) => b - a);
  const rank = lv.indexOf(teamLevel(t)) + 1;
  let target, text;
  if (t.div === 0) {
    target = clamp(rank + 2, 3, 13);
    text = target <= 3 ? 'Celem zarządu jest walka o tytuł (miejsca 1–3).' : target >= 12 ? 'Celem zarządu jest utrzymanie w lidze.' : `Celem zarządu jest miejsce w pierwszej ${target} Ekstraligi.`;
  } else {
    target = clamp(rank + 1, 3, 12);
    text = target <= 3 ? 'Celem zarządu jest awans do Ekstraligi (miejsca 1–3).' : `Celem zarządu jest miejsce w pierwszej ${target} Ligi Pierwszej.`;
  }
  S.board.target = target; S.board.text = text;
}
function msg(title, body) { S.inbox.unshift({ id: S.nextPid++, season: S.season, round: S.round, title, body, read: false }); if (S.inbox.length > 60) S.inbox.length = 60; }

/* ---------- okno transferowe ---------- */
const windowOpen = () => S.round <= 2 || (S.round >= 14 && S.round <= 16);
const windowText = () => S.round <= 2 ? 'Letnie okno transferowe OTWARTE' : (S.round >= 14 && S.round <= 16) ? 'Zimowe okno transferowe OTWARTE' : 'Okno transferowe zamknięte';

function transferAcceptChance(bid, value) {
  const r = bid / value;
  if (r < 0.8) return 0; if (r >= 1.4) return 1;
  return clamp(0.05 + (r - 0.8) * 1.4 + (r > 1.05 ? 0.2 : 0), 0, 0.97);
}
function askPrice(p) { return Math.round(p.val * 1.1 / 10000) * 10000; }
function playerWillJoin(p) { return p.ovr <= teamLevel(userTeam()) + 9; }
function moveToUser(p, wage, con) {
  const ut = userTeam();
  p.wage = wage; p.con = con; p.listed = false; p.apps = 0; p.g = 0; p.a = 0; p.rs = 0;
  ut.players.push(p); rebuildIndex(); fillBench(ut);
}
function makeBid(pid, amount) {
  const p = PM.get(pid), ut = userTeam();
  if (!p || p.tid === ut.id) return { ok: false, msg: 'Nieprawidłowy zawodnik.' };
  if (!windowOpen()) return { ok: false, msg: 'Okno transferowe jest zamknięte.' };
  if (amount > ut.tb) return { ok: false, msg: 'Przekraczasz budżet transferowy.' };
  if (amount > ut.bal) return { ok: false, msg: 'Brak środków na koncie klubu.' };
  if (ut.players.length >= 30) return { ok: false, msg: 'Kadra pełna (maks. 30 zawodników).' };
  const seller = team(p.tid);
  if (seller.players.length <= 19) return { ok: false, msg: `${seller.name} nie sprzeda zawodnika – zbyt wąska kadra.` };
  if (rnd() > transferAcceptChance(amount, p.val)) return { ok: false, msg: `${seller.name} odrzuca ofertę. Klub oczekuje wyższej kwoty (ok. ${money(askPrice(p))}).` };
  if (!playerWillJoin(p)) return { ok: false, msg: `Kluby się dogadały, ale ${p.name} odmawia – Twój klub nie spełnia jego ambicji.` };
  seller.players = seller.players.filter(x => x !== p);
  seller.lineup = seller.lineup.filter(id => id !== p.id); seller.bench = seller.bench.filter(id => id !== p.id);
  seller.bal += amount; seller.tb += amount;
  ut.bal -= amount; ut.tb -= amount;
  moveToUser(p, Math.round(calcWage(p) * 1.05 / 50) * 50, p.age < 30 ? 4 : 2);
  refillAI(seller);
  msg('Transfer zakończony', `${p.name} (${POS_PL[p.pos]}, ${p.ovr}) przechodzi z ${seller.name} za ${money(amount)}.`);
  save();
  return { ok: true, msg: `${p.name} dołącza do klubu za ${money(amount)}!` };
}
function signFree(pid) {
  const p = PM.get(pid), ut = userTeam();
  if (!p || p.tid !== -1) return { ok: false, msg: 'Zawodnik niedostępny.' };
  if (ut.players.length >= 30) return { ok: false, msg: 'Kadra pełna (maks. 30 zawodników).' };
  if (!playerWillJoin(p)) return { ok: false, msg: `${p.name} odmawia – Twój klub nie spełnia jego ambicji.` };
  S.free = S.free.filter(x => x !== p);
  moveToUser(p, Math.round(calcWage(p) * 0.9 / 50) * 50, p.age < 30 ? 3 : 2);
  msg('Wolny agent', `${p.name} (${POS_PL[p.pos]}, ${p.ovr}) podpisał kontrakt jako wolny agent.`);
  save();
  return { ok: true, msg: `${p.name} podpisuje kontrakt!` };
}
function sellTo(pid, buyerId, amount) {
  const p = PM.get(pid), ut = userTeam(), b = team(buyerId);
  if (ut.players.length <= 16) return { ok: false, msg: 'Kadra nie może liczyć mniej niż 16 zawodników.' };
  ut.players = ut.players.filter(x => x !== p);
  ut.lineup = ut.lineup.filter(id => id !== p.id); ut.bench = ut.bench.filter(id => id !== p.id);
  ut.bal += amount; ut.tb += amount;
  b.players.push(p); p.con = ri(1, 3); p.listed = false;
  rebuildIndex(); fillBench(ut);
  msg('Sprzedaż', `${p.name} odchodzi do ${b.name} za ${money(amount)}.`);
  save();
  return { ok: true, msg: `Sprzedano ${p.name} za ${money(amount)}.` };
}
function releasePlayer(pid) {
  const p = PM.get(pid), ut = userTeam();
  if (ut.players.length <= 16) return { ok: false, msg: 'Kadra nie może liczyć mniej niż 16 zawodników.' };
  const cost = p.wage * 15 * p.con;
  if (cost > ut.bal) return { ok: false, msg: 'Brak środków na odprawę.' };
  ut.bal -= cost; ut.players = ut.players.filter(x => x !== p);
  ut.lineup = ut.lineup.filter(id => id !== p.id); ut.bench = ut.bench.filter(id => id !== p.id);
  p.listed = false; S.free.push(p); rebuildIndex(); fillBench(ut); save();
  return { ok: true, msg: `Rozwiązano kontrakt z ${p.name} (odprawa ${money(cost)}).` };
}
function renewCost(p, years) { return Math.round(calcWage(p) * (1.05 + years * 0.03) / 50) * 50; }
function renewContract(pid, years) {
  const p = PM.get(pid);
  if (rnd() < 0.08) return { ok: false, msg: `${p.name} odrzuca propozycję i chce poczekać na inne oferty.` };
  p.wage = renewCost(p, years); p.con = years; save();
  return { ok: true, msg: `${p.name} przedłużył kontrakt do ${years} lat (${money(p.wage)}/tydz.).` };
}
function refillAI(t) {
  if (t.id === S.user) return;
  const lvl = 38 + t.rep * 0.36;
  const cnt = g => t.players.filter(p => p.pos === g).length;
  for (const g of POS) while (cnt(g) < (g === 'GK' ? 3 : g === 'ATT' ? 4 : 7)) { const p = genPlayer(g, lvl); t.players.push(p); PM.set(p.id, p); p.tid = t.id; }
  while (t.players.length < 22) { const p = genPlayer(wpick(['DEF', 'MID', 'ATT'], () => 1), lvl); t.players.push(p); PM.set(p.id, p); p.tid = t.id; }
  while (t.players.length > 27) { const w = t.players.slice().sort((a, b) => a.ovr - b.ovr)[0]; t.players = t.players.filter(p => p !== w); PM.delete(w.id); }
}
function genOffers() {
  const ut = userTeam();
  S.offers = S.offers.filter(o => o.exp >= S.round && PM.get(o.pid) && PM.get(o.pid).tid === ut.id);
  if (!windowOpen() || ut.players.length <= 17) return;
  for (const p of ut.players) {
    if (S.offers.some(o => o.pid === p.id)) continue;
    const chance = p.listed ? 0.4 : (p.val > 700000 && p.ovr >= ut.level + 3 ? 0.04 : 0);
    if (rnd() < chance) {
      const buyers = S.teams.filter(t => t.id !== ut.id && t.rep >= ut.rep - 15 && t.bal > 0);
      if (!buyers.length) continue;
      const b = pick(buyers);
      S.offers.push({ id: S.nextOffer++, pid: p.id, from: b.id, amount: Math.round(p.val * (p.listed ? 0.8 + rnd() * 0.45 : 1.15 + rnd() * 0.4) / 10000) * 10000, exp: S.round + 2 });
      msg('Oferta za zawodnika', `${b.name} składa ofertę za ${p.name}: ${money(S.offers[S.offers.length - 1].amount)}.`);
    }
  }
}

/* ---------- finanse, trening, tygodniowa aktualizacja ---------- */
function money(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace('.', ',') + ' mln €';
  if (a >= 1e3) return s + Math.round(a / 1e3) + ' tys. €';
  return s + Math.round(a) + ' €';
}
function weeklyFinance(fx) {
  const t = userTeam();
  const wages = t.players.reduce((s, p) => s + p.wage, 0);
  let gate = 0;
  if (fx.h === t.id) {
    const pos = tablePos(t);
    const fill = clamp(0.5 + t.rep / 250 + (t.div === 0 ? 0.05 : 0) + (S.board.conf - 50) / 400 - (pos > 10 ? 0.04 : 0), 0.3, 1);
    gate = Math.round(t.cap * fill * t.price);
  }
  const net = gate + t.tv + t.spons - wages;
  t.bal += net;
  t.tb += Math.round(net * 0.25);
  t.lastFin = { gate, tv: t.tv, spons: t.spons, wages, net };
  t.fin = t.fin || { inc: 0, exp: 0 };
  t.fin.inc += gate + t.tv + t.spons; t.fin.exp += wages;
}
const tablePos = t => table(t.div).find(r => r.id === t.id).pos;
function weeklyUpdate() {
  for (const t of S.teams) {
    const fitBonus = t.training === 'fit' ? 5 : 0;
    for (const p of t.players) {
      if (p._fresh) p._fresh = false;
      else { if (p.inj > 0) p.inj--; if (p.susp > 0) p.susp--; }
      p.fit = clamp(p.fit + 13 + fitBonus + (p.inj ? 6 : 0), 0, 100);
      p.form = Math.round(p.form + (50 - p.form) * 0.06);
      const focus = t.training === 'att' ? 'ATT' : t.training === 'def' ? 'DEF' : t.training === 'bal' ? 'MID' : null;
      let ch = p.age <= 21 ? 0.04 : p.age <= 24 ? 0.022 : p.age <= 28 ? 0.008 : 0;
      if (focus && (p.pos === focus || (focus === 'DEF' && p.pos === 'GK'))) ch *= 1.8;
      if (ch && p.ovr < p.pot && rnd() < ch) { p.ovr++; p.val = calcValue(p); }
    }
  }
}
function updateBoard(fx, userGoals, oppGoals) {
  const t = userTeam();
  let d = userGoals > oppGoals ? 2 : userGoals < oppGoals ? -2.5 : 0;
  const opp = team(fx.h === t.id ? fx.a : fx.h);
  d += clamp((opp.rep - t.rep) / 25, -1, 1) * (userGoals > oppGoals ? 1 : userGoals < oppGoals ? -0.6 : 0.5);
  if (S.round % 5 === 4) d += clamp(S.board.target - tablePos(t), -4, 4) * 1.3;
  if (t.bal < -1000000) d -= 1;
  S.board.conf = clamp(S.board.conf + d, 0, 100);
  if (S.round >= 8 && S.board.conf <= 12) S.sacked = true;
}

/* ---------- kolejka ---------- */
function playRound(userMatch) {
  const r = S.round, ut = userTeam(), ufx = userFixture(r);
  let uh = 0, ua = 0;
  const injuredNow = [];
  for (let d = 0; d < 2; d++) for (const fx of S.fix[d][r]) {
    if (fx.played) continue;
    const isUser = fx === ufx;
    let m = isUser && userMatch ? userMatch : quickSim(team(fx.h), team(fx.a));
    fx.hg = m.home.goals; fx.ag = m.away.goals; fx.played = true;
    fx.sc = { h: m.home.scorers, a: m.away.scorers };
    if (isUser) { uh = fx.hg; ua = fx.ag; }
    for (const e of m.ev) if (e.type === 'injury' && isUser) injuredNow.push(e.text);
  }
  const results = S.fix[ut.div][r].map(f => ({ h: f.h, a: f.a, hg: f.hg, ag: f.ag }));
  weeklyFinance(ufx);
  weeklyUpdate();
  const mine = ufx.h === ut.id ? [uh, ua] : [ua, uh];
  updateBoard(ufx, mine[0], mine[1]);
  const opp = team(ufx.h === ut.id ? ufx.a : ufx.h);
  genOffers();
  S.round++;
  if (S.round === 14) msg('Zimowe okno transferowe', 'Otwiera się zimowe okno transferowe (3 kolejki). To dobry moment na wzmocnienia.');
  if (S.round === 3 || S.round === 17) msg('Okno zamknięte', 'Okno transferowe zostało zamknięte. Możesz jeszcze podpisywać wolnych agentów.');
  if (S.round === 20) {
    const exp = ut.players.filter(p => p.con <= 1);
    if (exp.length) msg('Kontrakty wygasają', `Z końcem sezonu wygasają kontrakty: ${exp.map(shortName).join(', ')}. Przedłuż je w zakładce Skład.`);
  }
  let summary = null;
  if (S.round >= ROUNDS) summary = endSeason();
  save();
  return { hg: mine[0], ag: mine[1], opp, injured: injuredNow, summary, results, round: r + 1 };
}

/* ---------- koniec sezonu ---------- */
function endSeason() {
  const ut = userTeam();
  const t0 = table(0), t1 = table(1);
  const upos = table(ut.div).find(r => r.id === ut.id);
  const prize = Math.round((17 - upos.pos) * (ut.div === 0 ? 220000 : 90000));
  ut.bal += prize; ut.tb += prize + Math.max(0, Math.round((ut.fin ? ut.fin.inc - ut.fin.exp : 0) * 0.4));
  const lines = [];
  const champ = team(t0[0].id);
  lines.push(`🏆 Mistrz Ekstraligi: ${champ.name}.`);
  lines.push(`Twoja pozycja: ${upos.pos}. miejsce w ${DIV_NAMES[ut.div]} (${upos.Pts} pkt).`);
  lines.push(`Nagroda finansowa za sezon: ${money(prize)}.`);
  // awanse / spadki
  const down = t0.slice(13).map(r => r.id), up = t1.slice(0, 3).map(r => r.id);
  const wasDiv = ut.div;
  down.forEach(id => team(id).div = 1); up.forEach(id => team(id).div = 0);
  if (up.includes(ut.id)) { lines.push('⬆️ AWANS do Ekstraligi!'); ut.rep = clamp(ut.rep + 6, 1, 99); S.board.conf = clamp(S.board.conf + 15, 0, 100); }
  else if (down.includes(ut.id)) { lines.push('⬇️ Spadek do Ligi Pierwszej…'); ut.rep = clamp(ut.rep - 6, 1, 99); S.board.conf = clamp(S.board.conf - 20, 0, 100); }
  else { const dlt = clamp(S.board.target - upos.pos, -2, 3); ut.rep = clamp(ut.rep + Math.sign(dlt) * Math.min(2, Math.abs(dlt)), 1, 99); }
  lines.push(`Awans: ${up.map(i => team(i).name).join(', ')}. Spadek: ${down.map(i => team(i).name).join(', ')}.`);
  const achieved = wasDiv === ut.div ? upos.pos <= S.board.target : up.includes(ut.id);
  lines.push(achieved ? '✅ Cel zarządu zrealizowany!' : '❌ Cel zarządu niezrealizowany.');
  S.board.conf = clamp(S.board.conf + (achieved ? 8 : -12), 0, 100);
  if (S.board.conf <= 12) S.sacked = true;
  const scorer = topScorers(wasDiv, 1)[0];
  S.history.push({ season: S.season, div: wasDiv, pos: upos.pos, pts: upos.Pts, club: ut.name, champ: champ.name, scorer: scorer ? `${scorer.name} (${scorer.g})` : '-', achieved });

  // zawodnicy: wiek, rozwój, emerytury, kontrakty
  const left = [], retired = [];
  for (const t of S.teams) {
    for (const p of t.players.slice()) {
      p.age++;
      const d = p.age <= 21 ? ri(1, 4) : p.age <= 24 ? ri(0, 3) : p.age <= 28 ? ri(-1, 1) : p.age <= 31 ? ri(-2, 0) : ri(-3, -1);
      p.ovr = clamp(p.ovr + d, 30, 95);
      if (p.ovr > p.pot) p.pot = p.ovr;
      if (p.age >= 30) p.pot = p.ovr;
      p.inj = 0; p.susp = 0; p.fit = 100; p.form = 50; p.apps = 0; p.g = 0; p.a = 0; p.rs = 0; p.listed = false;
      p.val = calcValue(p);
      if (p.age >= 34 && rnd() < 0.25 + (p.age - 34) * 0.2) { t.players = t.players.filter(x => x !== p); if (t === ut) retired.push(p); PM.delete(p.id); continue; }
      p.con--;
      if (p.con <= 0) {
        if (t === ut) { t.players = t.players.filter(x => x !== p); S.free.push(p); left.push(p); }
        else { p.con = ri(1, 3); p.wage = calcWage(p); }
      } else if (t !== ut) p.wage = calcWage(p);
    }
  }
  if (retired.length) lines.push(`Zakończyli kariery: ${retired.map(p => p.name).join(', ')}.`);
  if (left.length) lines.push(`Wygasły kontrakty (odeszli): ${left.map(p => p.name).join(', ')}.`);
  // młodzież
  const youth = [];
  for (let i = 0; i < 3; i++) {
    const pos = i === 0 ? pick(['DEF', 'MID', 'ATT']) : wpick(POS, k => k === 'GK' ? 0.4 : 1);
    const y = genPlayer(pos, 0, { age: ri(16, 18), ovr: ri(36, 50), pot: ri(62, 84) });
    y.con = 3; y.wage = Math.round(calcWage(y) * 0.7 / 50) * 50; ut.players.push(y); youth.push(y);
  }
  lines.push(`🎓 Z akademii awansowali: ${youth.map(y => `${y.name} (${POS_PL[y.pos]}, ${y.ovr}/${y.pot})`).join('; ')}.`);
  // wolni agenci
  S.free.sort((a, b) => b.ovr - a.ovr); S.free = S.free.slice(0, 25);
  S.free.forEach(p => { p.age++; p.val = calcValue(p); });
  for (let i = 0; i < 25; i++) S.free.push(genFreeAgent());
  S.teams.forEach(t => { if (t.id !== ut.id) refillAI(t); });
  rebuildIndex();
  S.teams.forEach(t => { t.level = teamLevel(t); t.cap = Math.round((t.rep * t.rep * 4 + t.rep * 100) / 500) * 500; t.price = 3 + t.rep * 0.07; t.fin = { inc: 0, exp: 0 }; });
  S.teams.forEach(t => { if (t.id !== ut.id) { t.rep = clamp(t.rep + ri(-1, 1), 5, 95); } });
  for (const t of S.teams) { t.tv = t.div === 0 ? 30000 + t.rep * 450 : 12000 + t.rep * 250; }
  ut.spons = Math.round(ut.spons * (1 + (ut.rep - 50) / 1000) / 100) * 100;
  S.season++; S.round = 0; S.offers = [];
  buildSeason(); setBoardObjective();
  S.teams.forEach(t => { if (t.id !== S.user) autoPick(t); });
  fillBench(ut);
  lines.push(`Nowy sezon ${S.season}/${String(S.season + 1).slice(2)}. ${S.board.text}`);
  msg(`Podsumowanie sezonu ${S.season - 1}/${String(S.season).slice(2)}`, lines.join('\n'));
  S.summary = { title: `Podsumowanie sezonu ${S.season - 1}/${String(S.season).slice(2)}`, lines };
  return S.summary;
}

/* ---------- zwolnienie / nowa praca ---------- */
function jobOffers() {
  const cur = userTeam().rep;
  return S.teams.filter(t => t.id !== S.user && t.rep <= Math.max(cur - 8, 55)).sort((a, b) => b.rep - a.rep).slice(0, 6);
}
function takeOver(id) {
  S.user = id; S.sacked = false; S.round = S.round; S.board.conf = 55;
  setBoardObjective(); fillBench(userTeam());
  msg('Nowa praca', `Zostałeś trenerem ${userTeam().name}. ${S.board.text}`); save();
}

/* ---------- zapis ---------- */
const SAVE_KEY = 'wo_fm_save_v1';
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* brak miejsca / tryb prywatny */ } }
function loadGame() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; S = JSON.parse(raw); if (!S || S.v !== 1) { S = null; return false; } rebuildIndex(); return true; }
  catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }

if (typeof module !== 'undefined') {
  module.exports = {
    get S() { return S; }, newGame, createWorld, startCareer, createMatch, step, quickSim, playRound, table, userFixture, userTeam, team, money, teamLevel,
    autoPick, makeBid, signFree, sellTo, windowOpen, endSeason, FORMATIONS, rebuildIndex, PM: () => PM, ROUNDS, askPrice, takeOver, jobOffers,
  };
}
