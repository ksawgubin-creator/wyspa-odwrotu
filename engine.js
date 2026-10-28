'use strict';
/* ============================================================
   KARIERA MENEDŻERA – rdzeń: zawodnicy, ustawienia, silnik meczu
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
const sum = a => a.reduce((x, y) => x + y, 0);
const avg = a => a.length ? sum(a) / a.length : 0;

/* ---------- pozycje i atrybuty (styl EA FC) ---------- */
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];
const POS_PL = { GK: 'BR', CB: 'ŚO', LB: 'LO', RB: 'PO', CDM: 'ŚPD', CM: 'ŚP', CAM: 'ŚPO', LM: 'LP', RM: 'PP', LW: 'LS', RW: 'PS', ST: 'N' };
const LINE = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID', LW: 'ATT', RW: 'ATT', ST: 'ATT' };
const REL = { GK: [], CB: ['CDM', 'LB', 'RB'], LB: ['RB', 'LM', 'CB'], RB: ['LB', 'RM', 'CB'], CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'], CAM: ['CM', 'ST', 'LW', 'RW'], LM: ['LW', 'RM', 'LB'], RM: ['RW', 'LM', 'RB'], LW: ['LM', 'RW', 'ST', 'CAM'], RW: ['RM', 'LW', 'ST', 'CAM'], ST: ['CAM', 'LW', 'RW'] };
const ATTR_OUT = ['TEM', 'STR', 'POD', 'DRY', 'OBR', 'FIZ'];
const ATTR_GK = ['RZU', 'CHW', 'WYK', 'REF', 'SZY', 'UST'];
const W = {
  ST: [.18, .45, .05, .20, 0, .12], LW: [.27, .22, .15, .33, 0, .03], RW: [.27, .22, .15, .33, 0, .03],
  CAM: [.10, .20, .32, .33, 0, .05], LM: [.25, .12, .25, .30, .05, .03], RM: [.25, .12, .25, .30, .05, .03],
  CM: [.05, .10, .38, .25, .12, .10], CDM: [.05, .03, .25, .12, .35, .20], LB: [.25, 0, .15, .12, .33, .15],
  RB: [.25, 0, .15, .12, .33, .15], CB: [.10, 0, .07, .05, .50, .28], GK: [.23, .22, .05, .25, .03, .22],
};
const PROFILE = {
  ST: [2, 5, -10, 0, -45, -2], LW: [5, -2, -5, 3, -45, -15], RW: [5, -2, -5, 3, -45, -15], CAM: [-2, -1, 3, 3, -40, -15],
  LM: [4, -8, 0, 1, -25, -12], RM: [4, -8, 0, 1, -25, -12], CM: [-6, -8, 3, -1, -8, -4], CDM: [-10, -20, -2, -8, 3, 2],
  LB: [3, -30, -6, -6, -1, -4], RB: [3, -30, -6, -6, -1, -4], CB: [-12, -40, -15, -18, 3, 3], GK: [0, 0, -15, 1, -30, -2],
};
const calcOvr = (pos, a) => Math.round(W[pos].reduce((s, w, i) => s + w * a[i], 0));
function genAttrs(pos, target) {
  let a = PROFILE[pos].map(o => target + o + gauss() * 4);
  for (let k = 0; k < 4; k++) { const d = target - W[pos].reduce((s, w, i) => s + w * a[i], 0); a = a.map(x => clamp(x + d, 12, 99)); }
  return a.map(x => Math.round(clamp(x, 12, 99)));
}
/* rozwój/regres: zmienia atrybuty tak, by ogólna zmieniła się o ~d */
function develop(p, d) {
  const w = W[p.pos];
  for (let i = 0; i < 6; i++) {
    let delta = d * (w[i] > 0 ? 0.7 + rnd() * 0.6 : 0.3 * rnd());
    if (d < 0 && i === 0 && p.pos !== 'GK') delta *= 1.6; // tempo spada szybciej z wiekiem
    p.a[i] = clamp(Math.round((p.a[i] + delta) * 10) / 10, 12, 99);
  }
  p.ovr = calcOvr(p.pos, p.a);
}
const attrs = p => p.a.map(x => Math.round(x));
const OVC = new WeakMap();   // pamięć podręczna ocen na pozycjach
function ovrAt(p, pos) {
  if ((p.pos === 'GK') !== (pos === 'GK')) return 25;
  if (pos === p.pos) return p.ovr;
  let c = OVC.get(p);
  if (!c || c._o !== p.ovr) { c = { _o: p.ovr }; OVC.set(p, c); }
  if (c[pos] !== undefined) return c[pos];
  const v = calcOvr(pos, p.a);
  return c[pos] = (p.alt && p.alt.includes(pos)) ? Math.min(v, p.ovr) : Math.round(Math.min(v, p.ovr) - (REL[p.pos].includes(pos) ? 2 : 7));
}
function bestAlt(pos, a) {
  return REL[pos].filter(q => calcOvr(q, a) >= calcOvr(pos, a) - 3).slice(0, 2);
}

/* ---------- formacje (pozycje + współrzędne na boisku) ---------- */
const FORMS = {
  '4-3-3': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CM', 27, 50, 'CDM', 50, 41, 'CM', 73, 50, 'LW', 15, 76, 'ST', 50, 86, 'RW', 85, 76],
  '4-4-2': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'LM', 12, 58, 'CM', 37, 49, 'CM', 63, 49, 'RM', 88, 58, 'ST', 36, 84, 'ST', 64, 84],
  '4-2-3-1': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CDM', 36, 42, 'CDM', 64, 42, 'LM', 14, 66, 'CAM', 50, 64, 'RM', 86, 66, 'ST', 50, 87],
  '4-1-2-1-2': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CDM', 50, 39, 'CM', 27, 52, 'CM', 73, 52, 'CAM', 50, 65, 'ST', 36, 85, 'ST', 64, 85],
  '4-5-1': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'LM', 12, 60, 'CM', 32, 52, 'CDM', 50, 42, 'CM', 68, 52, 'RM', 88, 60, 'ST', 50, 86],
  '3-5-2': ['GK', 50, 6, 'CB', 25, 24, 'CB', 50, 22, 'CB', 75, 24, 'LM', 10, 54, 'CM', 32, 52, 'CDM', 50, 40, 'CM', 68, 52, 'RM', 90, 54, 'ST', 36, 84, 'ST', 64, 84],
  '3-4-3': ['GK', 50, 6, 'CB', 25, 24, 'CB', 50, 22, 'CB', 75, 24, 'LM', 12, 52, 'CM', 37, 47, 'CM', 63, 47, 'RM', 88, 52, 'LW', 18, 77, 'ST', 50, 86, 'RW', 82, 77],
  '5-3-2': ['GK', 50, 6, 'LB', 8, 37, 'CB', 29, 25, 'CB', 50, 23, 'CB', 71, 25, 'RB', 92, 37, 'CM', 28, 52, 'CDM', 50, 44, 'CM', 72, 52, 'ST', 36, 83, 'ST', 64, 83],
  '4-3-3 (fałszywa 9)': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CM', 27, 50, 'CDM', 50, 41, 'CM', 73, 50, 'LW', 15, 78, 'CAM', 50, 74, 'RW', 85, 78],
  '4-3-3 (ofensywne)': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CM', 30, 48, 'CAM', 50, 62, 'CM', 70, 48, 'LW', 15, 78, 'ST', 50, 86, 'RW', 85, 78],
  '4-1-4-1': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CDM', 50, 38, 'LM', 12, 60, 'CM', 36, 55, 'CM', 64, 55, 'RM', 88, 60, 'ST', 50, 86],
  '4-4-1-1': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'LM', 12, 56, 'CM', 37, 48, 'CM', 63, 48, 'RM', 88, 56, 'CAM', 50, 70, 'ST', 50, 87],
  '4-4-2 (defensywne)': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'LM', 12, 52, 'CDM', 37, 42, 'CDM', 63, 42, 'RM', 88, 52, 'ST', 36, 82, 'ST', 64, 82],
  '4-2-3-1 (wąskie)': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CDM', 36, 42, 'CDM', 64, 42, 'CAM', 25, 66, 'CAM', 50, 63, 'CAM', 75, 66, 'ST', 50, 87],
  '4-3-2-1': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CM', 27, 48, 'CDM', 50, 40, 'CM', 73, 48, 'CAM', 35, 70, 'CAM', 65, 70, 'ST', 50, 87],
  '4-3-1-2': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CM', 27, 48, 'CDM', 50, 40, 'CM', 73, 48, 'CAM', 50, 66, 'ST', 36, 85, 'ST', 64, 85],
  '4-2-2-2': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CDM', 36, 42, 'CDM', 64, 42, 'CAM', 22, 66, 'CAM', 78, 66, 'ST', 36, 85, 'ST', 64, 85],
  '4-2-4': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CM', 36, 46, 'CM', 64, 46, 'LW', 14, 76, 'ST', 38, 85, 'ST', 62, 85, 'RW', 86, 76],
  '4-1-3-2': ['GK', 50, 6, 'LB', 12, 27, 'CB', 37, 21, 'CB', 63, 21, 'RB', 88, 27, 'CDM', 50, 39, 'LM', 14, 58, 'CM', 50, 55, 'RM', 86, 58, 'ST', 36, 84, 'ST', 64, 84],
  '3-4-1-2': ['GK', 50, 6, 'CB', 25, 24, 'CB', 50, 22, 'CB', 75, 24, 'LM', 10, 52, 'CM', 37, 46, 'CM', 63, 46, 'RM', 90, 52, 'CAM', 50, 67, 'ST', 36, 85, 'ST', 64, 85],
  '3-4-2-1': ['GK', 50, 6, 'CB', 25, 24, 'CB', 50, 22, 'CB', 75, 24, 'LM', 10, 52, 'CM', 37, 46, 'CM', 63, 46, 'RM', 90, 52, 'CAM', 33, 70, 'CAM', 67, 70, 'ST', 50, 87],
  '3-1-4-2': ['GK', 50, 6, 'CB', 25, 24, 'CB', 50, 22, 'CB', 75, 24, 'CDM', 50, 37, 'LM', 10, 56, 'CM', 36, 53, 'CM', 64, 53, 'RM', 90, 56, 'ST', 36, 84, 'ST', 64, 84],
  '3-4-3 (romb)': ['GK', 50, 6, 'CB', 25, 24, 'CB', 50, 22, 'CB', 75, 24, 'CDM', 50, 38, 'LM', 14, 54, 'RM', 86, 54, 'CAM', 50, 64, 'LW', 18, 78, 'ST', 50, 87, 'RW', 82, 78],
  '5-4-1': ['GK', 50, 6, 'LB', 8, 37, 'CB', 29, 25, 'CB', 50, 23, 'CB', 71, 25, 'RB', 92, 37, 'LM', 14, 56, 'CM', 37, 48, 'CM', 63, 48, 'RM', 86, 56, 'ST', 50, 85],
  '5-2-3': ['GK', 50, 6, 'LB', 8, 37, 'CB', 29, 25, 'CB', 50, 23, 'CB', 71, 25, 'RB', 92, 37, 'CM', 36, 48, 'CM', 64, 48, 'LW', 18, 76, 'ST', 50, 85, 'RW', 82, 76],
  '5-2-1-2': ['GK', 50, 6, 'LB', 8, 37, 'CB', 29, 25, 'CB', 50, 23, 'CB', 71, 25, 'RB', 92, 37, 'CM', 36, 46, 'CM', 64, 46, 'CAM', 50, 64, 'ST', 36, 84, 'ST', 64, 84],
  '5-3-2 (ofensywne)': ['GK', 50, 6, 'LB', 8, 37, 'CB', 29, 25, 'CB', 50, 23, 'CB', 71, 25, 'RB', 92, 37, 'CM', 28, 50, 'CAM', 50, 60, 'CM', 72, 50, 'ST', 36, 84, 'ST', 64, 84],
};
const FORMATIONS = {};
for (const [k, v] of Object.entries(FORMS)) { const s = []; for (let i = 0; i < v.length; i += 3) s.push({ pos: v[i], x: v[i + 1], y: v[i + 2] }); FORMATIONS[k] = s; }
const slotsOf = f => FORMATIONS[f] || FORMATIONS['4-3-3'];
const MENT = { def: 'Defensywna', bal: 'Neutralna', att: 'Ofensywna' };
/* gotowe style gry: [nazwa, mentalność, instrukcje, opis] */
const TAC_PRE = {
  bal: ['⚖️ Zrównoważony', 'bal', { press: 0, tempo: 0, line: 0, width: 0 }, 'Bez skrajności – dobry punkt wyjścia.'],
  gegen: ['⚡ Gegenpressing', 'att', { press: 1, tempo: 1, line: 1, width: 0 }, 'Odbiór tuż po stracie i szybki atak. Męczy, wymaga szybkich obrońców.'],
  tiki: ['🎯 Tiki-taka', 'bal', { press: 1, tempo: -1, line: 1, width: 0 }, 'Posiadanie i cierpliwe budowanie akcji. Najlepsze z technicznymi pomocnikami.'],
  wing: ['🪽 Gra skrzydłami', 'bal', { press: 0, tempo: 0, line: 0, width: 1 }, 'Dośrodkowania, rożne i praca skrzydłowych.'],
  counter: ['🏹 Kontratak', 'bal', { press: -1, tempo: 1, line: -1, width: 1 }, 'Niski blok i szybkie kontry – zabójcze na rywali grających wysoko.'],
  bus: ['🚌 Autobus', 'def', { press: -1, tempo: -1, line: -1, width: -1 }, 'Murowanie bramki – na silniejszych rywali i dowożenie wyniku.'],
};
/* zadania zawodników: -1 obrona, 0 wsparcie, 1 atak; domyślne wg pozycji */
const DUTY_DEF = { GK: 0, CB: -1, LB: 0, RB: 0, CDM: -1, CM: 0, LM: 0, RM: 0, CAM: 0, LW: 1, RW: 1, ST: 1 };
const DUTY_NAMES = {
  CB: ['Stoper', 'Wyprowadzający piłkę', 'Wysunięty stoper'], LB: ['Defensywny boczny', 'Boczny obrońca', 'Wahadłowy'], RB: ['Defensywny boczny', 'Boczny obrońca', 'Wahadłowy'],
  CDM: ['Kotwica', 'Regista', 'Box-to-box'], CM: ['Defensywny pomocnik', 'Box-to-box', 'Wbiegający pomocnik'], CAM: ['Cofnięta „10”', 'Rozgrywająca „10”', 'Cień napastnika'],
  LM: ['Pracowity skrzydłowy', 'Skrzydłowy', 'Odwrócony skrzydłowy'], RM: ['Pracowity skrzydłowy', 'Skrzydłowy', 'Odwrócony skrzydłowy'],
  LW: ['Pracowity skrzydłowy', 'Skrzydłowy', 'Odwrócony skrzydłowy'], RW: ['Pracowity skrzydłowy', 'Skrzydłowy', 'Odwrócony skrzydłowy'],
  ST: ['Fałszywa „9”', 'Target man', 'Lis pola karnego'],
};
const dutyOf = (side, s) => { const d = side.duty && side.duty[s.slot]; return d != null ? d : DUTY_DEF[s.pos] || 0; };
/* styl drużyny AI: stały „charakter” klubu + dopasowanie do siły rywala */
function aiStyle(t, d) {
  if (d < -12) return hashN(t.id * 31) < 0.5 ? 'bus' : 'counter';
  if (d < -5) return hashN(t.id * 37) < 0.6 ? 'counter' : 'bal';
  const k = ['bal', 'gegen', 'tiki', 'wing', 'bal', 'counter'];
  return k[Math.floor(hashN(t.id * 13) * k.length)];
}
const MAX_SUBS = 5, BENCH = 9;
// strojenie silnika: przewaga własnego boiska i „stromość” różnic siły
let SHOT_BASE = 0.285, SHOT_EXP = 1.3, FIN_EXP = 2.2, HOME_ADV = 1.13, AWAY_ADV = 0.9, DAY_VAR = 0.07;

/* ---------- stan zawodnika ---------- */
// polska odmiana liczebników: 1 gol, 2 gole, 5 goli
const plural = (n, one, few, many) => { n = Math.round(n); const a = Math.abs(n), d = a % 10, t = a % 100; return `${n} ${a === 1 ? one : d >= 2 && d <= 4 && (t < 12 || t > 14) ? few : many}`; };
const isAvail = p => !p.inj && !p.susp;
// rodzaje kontuzji: [nazwa, min dni, max dni, waga]
const INJ = [['stłuczenie', 3, 10, 30], ['naciągnięcie mięśnia dwugłowego', 10, 28, 20], ['skręcenie stawu skokowego', 10, 35, 18], ['uraz pachwiny', 14, 40, 10], ['naderwanie mięśnia', 21, 49, 8], ['uraz kolana', 30, 70, 6], ['złamanie', 50, 100, 3], ['zerwanie więzadła krzyżowego', 150, 220, 1.2]];
// ryzyko urazu rośnie przy zmęczeniu, po niedawnym urazie i po przyspieszonym powrocie
const injRisk = (p, fit) => (1 + Math.max(0, 85 - fit) / 30) * (p._rushed && p._rushed > (typeof absDay === 'function' ? absDay() : 0) ? 3 : 1) * (p.injLast && typeof absDay === 'function' && absDay() - p.injLast < 60 ? 1.5 : 1);
function injure(p) {
  const recur = p.injT && p.injLast && typeof absDay === 'function' && absDay() - p.injLast < 60 && rnd() < 0.5;
  const t = recur ? INJ.find(x => x[0] === p.injT) || INJ[1] : wpick(INJ, x => x[3]);
  const days = Math.round(ri(t[1], t[2]) * (recur ? 1.3 : 1));
  p.inj = days; p.injT = t[0]; p.injLast = typeof absDay === 'function' ? absDay() : 0; p._rushed = 0; p.injN = (p.injN || 0) + 1;
  return { days, type: t[0] + (recur ? ' (nawrót)' : '') };
}
const cond = (p, fit) => (0.72 + 0.28 * clamp(fit, 0, 100) / 100) * (0.96 + 0.0008 * p.form) * (0.97 + 0.0006 * p.mor) * (0.95 + 0.0005 * p.shp);
function moraleLabel(m) { return m >= 80 ? ['😁', 'Wyśmienite'] : m >= 65 ? ['🙂', 'Bardzo dobre'] : m >= 45 ? ['😐', 'Dobre'] : m >= 30 ? ['🙁', 'Słabe'] : ['😠', 'Fatalne']; }
function formLabel(f) { return f >= 75 ? 'Świetna' : f >= 60 ? 'Dobra' : f >= 42 ? 'Przeciętna' : f >= 28 ? 'Słaba' : 'Fatalna'; }
function money(n) {
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if (a >= 1e6) return s + (a / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2).replace('.', ',') + ' mln €';
  if (a >= 1e3) return s + Math.round(a / 1e3) + ' tys. €';
  return s + Math.round(a) + ' €';
}
function calcValue(p) {
  let v = 800000 * Math.exp(0.158 * (p.ovr - 60));
  const a = p.age;
  v *= a <= 20 ? 1.5 : a <= 23 ? 1.3 : a <= 26 ? 1.1 : a <= 29 ? 1 : a <= 31 ? 0.75 : a <= 33 ? 0.5 : a <= 35 ? 0.3 : 0.15;
  if (a < 25) v *= 1 + Math.max(0, p.pot - p.ovr) * 0.04;
  if (p.pos === 'GK') v *= 0.7;
  const r = v >= 1e7 ? 5e5 : v >= 1e6 ? 5e4 : 1e4;
  return Math.max(10000, Math.round(v / r) * r);
}
const calcWage = (p, rep = 60) => Math.max(400, Math.round(3000 * Math.exp(0.13 * (p.ovr - 60)) * (0.6 + rep / 100) / 100) * 100);
const shortName = p => { const s = p.n.split(' '); return s.length > 1 ? s[0][0] + '. ' + s.slice(1).join(' ') : p.n; };
const lastName = p => { const s = p.n.split(' '); return s.length > 1 ? s.slice(1).join(' ') : p.n; };

/* ---------- wybór składu ---------- */
let PM = new Map();
const pget = id => PM.get(id);
function pickScore(p, pos) { return ovrAt(p, pos) * (0.55 + 0.45 * clamp(p.fit, 0, 100) / 100) * (p.fit < 55 ? 0.85 : 1); }
function autoPick(t, formation) {
  const f = formation || t.formation || '4-3-3';
  const slots = slotsOf(f);
  const pool = t.players.filter(isAvail);
  const n = slots.length, lineup = Array(n).fill(null), usedP = new Uint8Array(pool.length);
  const M = slots.map(sl => pool.map(p => pickScore(p, sl.pos)));
  for (let k = 0; k < n; k++) {
    let bs = -1, bi = -1, bj = -1;
    for (let i = 0; i < n; i++) { if (lineup[i] != null) continue; const row = M[i]; for (let j = 0; j < pool.length; j++) if (!usedP[j] && row[j] > bs) { bs = row[j]; bi = i; bj = j; } }
    if (bj < 0) break;
    lineup[bi] = pool[bj].id; usedP[bj] = 1;
  }
  if (lineup.some(x => x == null)) { // za mało zdrowych – grają awaryjnie niedostępni
    const used = new Set(lineup.filter(x => x != null)), rest = t.players.filter(p => !used.has(p.id));
    for (let i = 0; i < n; i++) if (lineup[i] == null && rest.length) lineup[i] = rest.shift().id;
  }
  t.formation = f; t.lineup = lineup.filter(x => x != null); fillBench(t);
}
function fillBench(t) {
  const inL = new Set(t.lineup);
  const rest = t.players.filter(p => isAvail(p) && !inL.has(p.id)).sort((a, b) => b.ovr - a.ovr);
  const bench = [];
  const gk = rest.find(p => p.pos === 'GK'); if (gk) bench.push(gk);
  for (const line of ['DEF', 'MID', 'ATT']) { const q = rest.find(p => LINE[p.pos] === line && !bench.includes(p)); if (q) bench.push(q); }
  for (const p of rest) { if (bench.length >= BENCH) break; if (!bench.includes(p)) bench.push(p); }
  t.bench = bench.map(p => p.id);
}
/* naprawia skład (np. gracza): niedostępni zastępowani najlepszymi wolnymi */
// rotacja: zmęczonych zawodników z podstawowego składu zastępuje najlepszy wypoczęty zmiennik na tej pozycji
function rotateTired(t, thr = 70) {
  const slots = slotsOf(t.formation), out = [];
  t.lineup.forEach((id, i) => {
    const p = pget(id); if (!p || p.fit >= thr) return;
    const pos = slots[i].pos, cur = ovrAt(p, pos);
    const cand = t.players.filter(q => !t.lineup.includes(q.id) && isAvail(q) && q.fit >= Math.max(thr + 8, p.fit + 15) && ovrAt(q, pos) >= cur - 7).sort((a, b) => pickScore(b, pos) - pickScore(a, pos))[0];
    if (!cand) return;
    t.lineup[i] = cand.id; t.bench = t.bench.filter(x => x !== cand.id); if (!t.bench.includes(p.id)) t.bench.push(p.id);
    out.push(`${shortName(p)} (${Math.round(p.fit)}%) → ${shortName(cand)} (${Math.round(cand.fit)}%)`);
  });
  if (typeof fillBench === 'function') fillBench(t);
  return out;
}
function fixLineup(t, emergency) {
  const slots = slotsOf(t.formation), msgs = [];
  const mine = new Set(t.players.map(p => p.id));
  t.lineup = (t.lineup || []).slice(0, slots.length);
  while (t.lineup.length < slots.length) t.lineup.push(null);
  for (let i = 0; i < slots.length; i++) {
    const id = t.lineup[i], p = id != null && mine.has(id) ? pget(id) : null;
    if (p && isAvail(p) && t.lineup.indexOf(id) === i) continue;
    const inL = new Set(t.lineup.filter((x, j) => x != null && j !== i));
    const cand = t.players.filter(x => isAvail(x) && !inL.has(x.id)).sort((x, y) => pickScore(y, slots[i].pos) - pickScore(x, slots[i].pos))[0];
    if (cand) { t.lineup[i] = cand.id; if (p) msgs.push(`${shortName(p)} niedostępny – zastąpił go ${shortName(cand)}.`); }
    else if (emergency) { const e = emergency(slots[i].pos); t.lineup[i] = e.id; }
    else t.lineup[i] = null;
  }
  t.lineup = t.lineup.filter(x => x != null);
  const inL = new Set(t.lineup);
  t.bench = (t.bench || []).filter(id => mine.has(id) && isAvail(pget(id)) && !inL.has(id));
  if (t.bench.length < BENCH) {
    const rest = t.players.filter(p => isAvail(p) && !inL.has(p.id) && !t.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
    for (const p of rest) { if (t.bench.length >= BENCH) break; t.bench.push(p.id); }
  }
  return msgs;
}
const lineupAvg = t => Math.round(avg(t.lineup.map((id, i) => ovrAt(pget(id), slotsOf(t.formation)[i].pos))));

/* ---------- silnik meczu ---------- */
const isClubComp = c => c !== 'N' && c !== 'T' && c !== 'F' && c !== 'P';
/* opts: {comp, user:'h'|'a'|null, quick, neutral, ko:{aggH,aggA}|null, label} */
function makeSide(t, isUser, quick, emergency) {
  if (!isUser) { autoPick(t); } else fixLineup(t, emergency);
  const slots = slotsOf(t.formation);
  const side = {
    t, ment: isUser ? (t.ment || 'bal') : 'bal', ai: !isUser || quick, user: isUser, tac: Object.assign({ press: 0, tempo: 0, line: 0, width: 0 }, isUser && t.tac || {}),
    duty: isUser && t.duty ? t.duty.slice() : null, pm: isUser && t.pm != null ? t.pm : null, oi: isUser && t.oi ? { mark: (t.oi.mark || []).slice(), hard: !!t.oi.hard } : { mark: [], hard: false }, xg: 0,
    pitch: t.lineup.map((id, i) => { const p = pget(id); return p ? { p, pos: slots[i].pos, ov: ovrAt(p, slots[i].pos), slot: i } : null; }).filter(Boolean),
    bench: t.bench.map(pget).filter(Boolean), subs: 0, goals: 0, shots: 0, sot: 0, poss: 0, fouls: 0, yel: 0, corners: 0,
    rec: {}, str: null, scorers: [], cf: (1 + ((typeof coachOvr === 'function' ? coachOvr(t) : 60) - 60) * 0.0009) * clamp(1 + gauss() * DAY_VAR, 0.82, 1.18),
  };
  for (const s of side.pitch) side.rec[s.p.id] = { p: s.p, on: 0, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0, pos: s.pos };
  return side;
}
function createMatch(h, a, opts = {}) {
  const m = {
    comp: opts.comp || 'L', label: opts.label || '', neutral: !!opts.neutral, ko: opts.ko || null,
    home: makeSide(h, opts.user === 'h', opts.quick, opts.emergency), away: makeSide(a, opts.user === 'a', opts.quick, opts.emergency),
    minute: 0, end: 90 + ri(1, 4), over: false, htDone: false, et: false, pens: null, ev: [], dirty: true, alert: null,
  };
  const d = (h.rep || 50) - (a.rep || 50);
  if (m.comp === 'C' && Math.abs(d) >= 10) (d > 0 ? m.away : m.home).cf *= 1.07; // magia pucharu: słabszy gra ambitniej
  if (m.home.ai && !m.home.user) m.home.ment = d > 10 ? 'att' : d < -12 ? 'def' : 'bal';
  if (m.away.ai && !m.away.user) m.away.ment = d < -10 ? 'att' : d > 12 ? 'def' : 'bal';
  // AI przeciw użytkownikowi gra swoim stylem i czasem kryje najgroźniejszego zawodnika
  for (const [S1, S2, dd] of [[m.home, m.away, d], [m.away, m.home, -d]]) {
    if (S1.user || !S2.user || h.nation) continue;
    const st = aiStyle(S1.t, dd); S1.style = st; S1.tac = Object.assign({}, TAC_PRE[st][2]);
    if (st === 'bus') S1.ment = 'def';
    if (rnd() < 0.35) { const top = S2.pitch.filter(x => LINE[x.pos] === 'ATT' || x.pos === 'CAM').sort((x, y) => y.ov - x.ov)[0]; if (top) S1.oi.mark = [top.p.id]; }
  }
  if (m.ko && (m.ko.aggH || m.ko.aggA)) ev(m, 'info', null, `Pierwszy mecz: ${m.away.t.name} ${m.ko.aggA}:${m.ko.aggH} ${m.home.t.name}.`);
  return m;
}
const fitNow = (side, s, minute) => Math.max(25, s.p.fit - Math.max(0, minute - side.rec[s.p.id].on) * (s.p.pos === 'GK' ? 0.08 : 0.2 * (1 + 0.15 * ((side.tac && side.tac.press) || 0))));
const effNow = (side, s, minute) => s.ov * cond(s.p, fitNow(side, s, minute));
function calcStr(side, minute) {
  const g = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const s of side.pitch) g[LINE[s.pos]].push(effNow(side, s, minute));
  const av = a => a.length ? avg(a) : 30;
  const miss = 1 - 0.07 * (11 - side.pitch.length);
  const am = side.ment === 'att' ? 1.04 : side.ment === 'def' ? 0.96 : 1;
  const dm = side.ment === 'att' ? 0.95 : side.ment === 'def' ? 1.04 : 1;
  const cf = side.cf || 1;
  // zadania: odchylenie od domyślnych przesuwa siłę z obrony do ataku (lub odwrotnie)
  let dev = 0; if (side.duty) for (const s of side.pitch) if (s.pos !== 'GK') dev += dutyOf(side, s) - (DUTY_DEF[s.pos] || 0);
  dev = clamp(dev, -5, 5);
  const pm = side.pm != null && side.pitch.find(s => s.slot === side.pm && s.pos !== 'GK'), pmK = pm ? 1 + clamp((pm.p.a[2] - 62) / 500, -0.02, 0.04) : 1;
  const fw = side.pitch.filter(s => LINE[s.pos] === 'ATT'); side.pace = fw.length ? avg(fw.map(s => s.p.a[0])) : 60;
  side.str = { gk: av(g.GK) * miss * cf, def: av(g.DEF) * miss * dm * cf * (1 - 0.014 * dev), mid: av(g.MID) * miss * cf * pmK, att: av(g.ATT.length ? g.ATT : g.MID) * miss * am * cf * (1 + 0.018 * dev) };
}
function ev(m, type, side, text, extra) { const e = { min: m.minute, type, side: side ? (side === m.home ? 'h' : 'a') : null, text, ...extra }; m.ev.push(e); return e; }
const GOAL_TXT = ['{s} pakuje piłkę do siatki!', '{s} uderza przy słupku – nie do obrony!', '{s} wykańcza akcję zespołu!', '{s} pewnie wykorzystuje sytuację sam na sam!', '{s} główkuje do siatki!', '{s} uderza z dystansu – bramkarz bez szans!', '{s} dobija odbitą piłkę!', '{s} mija bramkarza i trafia do pustej bramki!'];
const SAVE_TXT = ['{s} uderza, ale {k} broni!', 'Strzela {s} – świetna interwencja, broni {k}!', '{k} wyciąga się jak struna i odbija strzał {s}.', '{s} próbuje przelobować – {k} łapie piłkę.'];
const MISS_TXT = ['{s} strzela obok słupka.', '{s} uderza prosto w trybuny.', '{s} nie trafia czysto w piłkę.', 'Strzał {s} zablokowany przez obrońcę.', '{s} uderza w poprzeczkę!', '{s} trafia w słupek!'];
const SHOT_W = { ST: 5.5, LW: 4, RW: 4, CAM: 3.2, LM: 2.2, RM: 2.2, CM: 1.6, CDM: 0.8, CB: 0.6, LB: 0.4, RB: 0.4, GK: 0 };
function doShot(m, A, D) {
  const c = A.pitch.filter(s => s.pos !== 'GK'); if (!c.length) return;
  const tw = (A.tac && A.tac.width) || 0, WING = { LW: 1, RW: 1, LM: 1, RM: 1 };
  const mk = D.oi && D.oi.mark || [], dw = s => A.duty ? clamp(1 + 0.35 * (dutyOf(A, s) - (DUTY_DEF[s.pos] || 0)), 0.3, 1.8) : 1;
  const sh = wpick(c, s => SHOT_W[s.pos] * (WING[s.pos] ? 1 + 0.4 * tw : s.pos === 'ST' || s.pos === 'CAM' ? 1 - 0.15 * tw : 1) * Math.pow((s.p.pos === 'GK' ? 20 : s.p.a[1]) / 60, 3) * dw(s) * (mk.includes(s.p.id) ? 0.55 : 1));
  const gk = D.pitch.find(s => s.pos === 'GK');
  const gkE = gk ? effNow(D, gk, m.minute) : 30;
  // stałe fragmenty: karny (wykonawca z taktyki), rzut wolny, główka po rożnym
  const sp = A.t.sp || {}, onP = id => id != null && c.find(s => s.p.id === id), r0 = rnd();
  const kind = r0 < 0.013 ? 'pen' : r0 < 0.055 ? 'fk' : r0 < 0.13 + 0.03 * tw ? 'head' : '';
  let shooter = sh;
  if (kind === 'pen') shooter = onP(sp.pen) || c.slice().sort((x, y) => y.p.a[1] - x.p.a[1])[0];
  else if (kind === 'fk') shooter = onP(sp.fk) || c.slice().sort((x, y) => (y.p.a[1] * 0.6 + y.p.a[2] * 0.4) - (x.p.a[1] * 0.6 + x.p.a[2] * 0.4))[0];
  else if (kind === 'head') { const hs = c.filter(s => ['CB', 'ST', 'CDM'].includes(s.pos)); if (hs.length) shooter = wpick(hs, s => Math.pow(s.p.a[5] / 60, 3) * (s.pos === 'ST' ? 1.5 : 1)); }
  const penalty = kind === 'pen';
  const fin = (0.65 * (shooter.p.pos === 'GK' ? 20 : kind === 'head' ? (shooter.p.a[5] + shooter.p.a[1]) / 2 : shooter.p.a[1]) + 0.35 * shooter.ov) * cond(shooter.p, fitNow(A, shooter, m.minute));
  const q = fin / (0.5 * gkE + 0.5 * D.str.def) * (mk.includes(shooter.p.id) ? 0.92 : 1);
  const at = A.tac || {}, dt = D.tac || {};
  // wysoka linia rywala + szybcy napastnicy = sam na sam; kontra (szybkie tempo z niskiego bloku) na rywala grającego wysoko/ofensywnie
  const counter = at.tempo > 0 && at.line < 0 ? 1 + 0.07 * ((dt.line || 0) > 0) + 0.06 * (D.ment === 'att') : 1;
  const pg = penalty ? 0.76 + (shooter.p.a[1] - 70) / 400 : clamp(0.083 * Math.pow(q, FIN_EXP), 0.02, 0.4) * (kind === 'fk' ? 0.75 : kind === 'head' ? 0.85 * (1 + 0.1 * (at.width || 0)) : 1) * (kind ? 1 : (1 - 0.08 * (at.tempo || 0)) * (1 + 0.08 * (dt.line || 0) * clamp((A.pace || 60) / 65, 0.7, 1.4)) * counter);
  A.shots++; { const x = Math.min(0.95, pg); A.xg = (A.xg || 0) + x; const r = A.rec[shooter.p.id]; if (r) r.xg = (r.xg || 0) + x; }
  const pmW = x => A.pm != null && x.slot === A.pm ? 2.5 : 1;
  { const kc = c.filter(x => x !== shooter); if (kc.length && !penalty) { const k = wpick(kc, x => (LINE[x.pos] === 'MID' ? 2 : LINE[x.pos] === 'ATT' ? 1.5 : 0.6) * Math.pow(x.p.a[2] / 60, 2) * pmW(x)); const r = A.rec[k.p.id]; if (r) r.kp = (r.kp || 0) + 1; } }
  if (penalty) ev(m, 'info', A, `Rzut karny! Wykonuje ${shortName(shooter.p)} (${A.t.name})...`);
  else if (kind === 'fk') ev(m, 'info', A, `Rzut wolny w dogodnej odległości – do piłki podchodzi ${shortName(shooter.p)} (${A.t.name})...`);
  else if (kind === 'head') A.corners++;
  const nm = shortName(shooter.p), kn = gk ? lastName(gk.p) : 'obrońca';
  if (rnd() < pg) {
    A.sot++; A.goals++;
    let ast = null;
    if (kind === 'head') { const tk = onP(sp.ck) || c.slice().sort((x, y) => y.p.a[2] - x.p.a[2])[0]; if (tk && tk !== shooter) ast = tk.p; }
    else if (!penalty && kind !== 'fk' && rnd() < 0.75) { const cc = A.pitch.filter(s => s !== shooter && s.pos !== 'GK'); if (cc.length) ast = wpick(cc, s => (LINE[s.pos] === 'DEF' ? 1 : 3) * (s.p.a[2] / 60) * pmW(s)).p; }
    A.rec[shooter.p.id].g++; if (ast) A.rec[ast.id].a++;
    A.scorers.push({ min: m.minute, name: shortName(shooter.p), pen: penalty, pid: shooter.p.id });
    const gt = penalty ? `${nm} pewnie wykorzystuje rzut karny!` : kind === 'fk' ? `${nm} uderza z rzutu wolnego – piłka ląduje w okienku!` : kind === 'head' ? `${nm} wygrywa pojedynek w powietrzu po rzucie rożnym i główkuje do siatki!` : pick(GOAL_TXT).replace('{s}', nm);
    ev(m, 'goal', A, `⚽ GOL! ${A.t.name}! ` + gt + (ast ? ` Asysta: ${shortName(ast)}.` : ''), { pid: shooter.p.id });
    m.dirty = true; m.alert = 'goal';
  } else if (rnd() < 0.42) {
    A.sot++; if (gk) D.rec[gk.p.id].sv++;
    if (rnd() < 0.3) A.corners++;
    if (rnd() < 0.6) ev(m, 'chance', A, pick(SAVE_TXT).replace('{s}', nm).replace('{k}', kn));
  } else { if (rnd() < 0.35) A.corners++; if (rnd() < 0.4) ev(m, 'chance', A, pick(MISS_TXT).replace('{s}', nm)); }
}
function removeFromPitch(side, p, minute) { side.pitch = side.pitch.filter(s => s.p !== p); if (side.rec[p.id]) side.rec[p.id].off = minute; }
function substitute(m, side, outP, inP) {
  const s = side.pitch.find(x => x.p === outP);
  if (!s || side.subs >= MAX_SUBS || !side.bench.includes(inP)) return false;
  s.p = inP; s.ov = ovrAt(inP, s.pos); side.bench = side.bench.filter(b => b !== inP); side.subs++;
  side.rec[outP.id].off = m.minute;
  side.rec[inP.id] = { p: inP, on: m.minute, off: null, g: 0, a: 0, y: 0, r: 0, sv: 0, pos: s.pos };
  ev(m, 'sub', side, `🔁 ${side.t.name}: ${shortName(inP)} za ${shortName(outP)}.`);
  m.dirty = true; return true;
}
function bestSubFor(side, pos) { return side.bench.filter(b => (b.pos === 'GK') === (pos === 'GK')).sort((a, b) => ovrAt(b, pos) * cond(b, b.fit) - ovrAt(a, pos) * cond(a, a.fit))[0]; }
function aiSubs(m, side) {
  if (side.subs >= MAX_SUBS || !side.bench.length) return;
  const cand = side.pitch.filter(s => s.pos !== 'GK').map(s => ({ s, f: fitNow(side, s, m.minute) })).sort((a, b) => a.f - b.f)[0];
  if (!cand || cand.f > 74) return;
  const rep = bestSubFor(side, cand.s.pos);
  if (rep && ovrAt(rep, cand.s.pos) >= ovrAt(cand.s.p, cand.s.pos) - 8) substitute(m, side, cand.s.p, rep);
}
const tied = m => (m.home.goals + (m.ko ? m.ko.aggH : 0)) === (m.away.goals + (m.ko ? m.ko.aggA : 0));
function shootout(m) {
  const takers = side => { const sp = side.t.sp && side.t.sp.pen; return side.pitch.filter(s => s.pos !== 'GK').sort((a, b) => (b.p.id === sp) - (a.p.id === sp) || b.p.a[1] - a.p.a[1]).map(s => s.p).concat(side.pitch.filter(s => s.pos === 'GK').map(s => s.p)); };
  const H = takers(m.home), A = takers(m.away);
  const gk = side => { const g = side.pitch.find(s => s.pos === 'GK'); return g ? g.p.ovr : 40; };
  const shot = (p, k) => rnd() < clamp(0.76 + (p.a[1] - 70) * 0.004 - (k - 70) * 0.004, 0.55, 0.92);
  let h = 0, a = 0, i = 0;
  ev(m, 'info', null, '🎯 Rzuty karne!');
  for (; ; i++) {
    const ph = H[i % H.length], pa = A[i % A.length];
    const sh = shot(ph, gk(m.away)); if (sh) h++;
    ev(m, sh ? 'pen' : 'penmiss', m.home, `${sh ? '✅' : '❌'} ${shortName(ph)} (${m.home.t.short}) – ${h}:${a}`);
    if (i < 5 && (h > a + (5 - i) || a > h + (4 - i))) break;
    const sa = shot(pa, gk(m.home)); if (sa) a++;
    ev(m, sa ? 'pen' : 'penmiss', m.away, `${sa ? '✅' : '❌'} ${shortName(pa)} (${m.away.t.short}) – ${h}:${a}`);
    if (i < 5 && (h > a + (4 - i) || a > h + (4 - i))) break;
    if (i >= 4 && h !== a) break;
  }
  m.pens = { h, a };
}
/* jedna minuta; zwraca 'ht' / 'et' / 'ft' / null */
function step(m) {
  if (m.over) return 'ft';
  m.minute++; m.alert = null;
  const mn = m.minute, H = m.home, A = m.away;
  if (m.dirty || mn % 6 === 0 || !H.str) { calcStr(H, mn); calcStr(A, mn); m.dirty = false; }
  const TH = H.tac || {}, TA = A.tac || {};
  // pressing słabiej działa na cierpliwy zespół z dobrym podaniem; ostry odbiór psuje grę rywala
  const pe = (T, O, OS) => 0.05 * (T.press || 0) * (1 - ((O.tempo || 0) < 0 ? 0.5 : 0));
  const hm = Math.pow(H.str.mid, 2) * (m.neutral ? 1 : 1.06) * (1 + pe(TH, TA)) * (A.oi.hard ? 0.95 : 1), am = Math.pow(A.str.mid, 2) * (1 + pe(TA, TH)) * (H.oi.hard ? 0.95 : 1);
  const att = rnd() < hm / (hm + am) ? H : A, def = att === H ? A : H;
  att.poss++;
  // odbiór piłki: zasługa obrońcy/pomocnika drużyny, która przejęła posiadanie
  if (m._last && m._last !== att) { const tk = att.pitch.filter(x => LINE[x.pos] === 'DEF' || LINE[x.pos] === 'MID'); if (tk.length) { const w = wpick(tk, x => (LINE[x.pos] === 'DEF' ? 1.2 : 1) * Math.pow(x.p.a[4] / 60, 2)); const r = att.rec[w.p.id]; if (r) r.tk = (r.tk || 0) + 1; } }
  m._last = att;
  const aS = 0.7 * att.str.att + 0.3 * att.str.mid, dS = 0.65 * def.str.def + 0.35 * def.str.mid;
  const mAtt = att.ment === 'att' ? 1.18 : att.ment === 'def' ? 0.82 : 1;
  const mOpp = def.ment === 'att' ? 1.2 : def.ment === 'def' ? 0.88 : 1;
  const ha = m.neutral ? 1 : att === H ? HOME_ADV : AWAY_ADV;
  const ta = att.tac || {}, td = def.tac || {};
  const pShot = clamp(SHOT_BASE * Math.pow(aS / dS, SHOT_EXP) * mAtt * mOpp * ha * (1 + 0.1 * (ta.tempo || 0) + 0.04 * (td.tempo || 0) + 0.05 * (ta.line || 0) + 0.03 * ((td.line || 0) < 0 ? 1 : 0)), 0.03, 0.7);
  const shot = rnd() < pShot; if (shot) doShot(m, att, def);
  (m.mom || (m.mom = [])).push((att === H ? 1 : -1) * (shot ? 2.5 : 0.7) * (att.ment === 'att' ? 1.2 : 1));
  const club = isClubComp(m.comp);
  for (const side of [H, A]) {
    if (!side.pitch.length) continue;
    if (rnd() < 0.011 * (1 + (side.oi.hard ? 0.4 : 0) + 0.12 * side.oi.mark.length)) {
      const s = wpick(side.pitch, x => LINE[x.pos] === 'DEF' ? 3 : LINE[x.pos] === 'MID' ? 2 : LINE[x.pos] === 'GK' ? 0.2 : 1);
      const r = side.rec[s.p.id]; side.fouls++;
      if (r.y >= 1) {
        r.r = 1; r.y = 2; removeFromPitch(side, s.p, mn); if (club) { s.p.susp = 1; s.p._fresh = true; } m.dirty = true;
        ev(m, 'red', side, `🟥 Druga żółta i czerwona kartka dla ${shortName(s.p)} (${side.t.name})!`); m.alert = 'red';
      } else { r.y = 1; side.yel++; ev(m, 'yellow', side, `🟨 Żółta kartka: ${shortName(s.p)} (${side.t.name}).`); }
    } else if (rnd() < 0.0005 && side.pitch.length > 8) {
      const s = pick(side.pitch.filter(x => x.pos !== 'GK'));
      side.rec[s.p.id].r = 1; removeFromPitch(side, s.p, mn); if (club) { s.p.susp = ri(1, 3); s.p._fresh = true; } m.dirty = true;
      ev(m, 'red', side, `🟥 Czerwona kartka! ${shortName(s.p)} (${side.t.name}) opuszcza boisko.`); m.alert = 'red';
    }
    const risk = side.pitch.map(x => injRisk(x.p, fitNow(side, x, mn)));
    if (rnd() < 0.0009 * avg(risk)) {
      const s = wpick(side.pitch, x => risk[side.pitch.indexOf(x)]);
      const ij = injure(s.p), days = ij.days;
      ev(m, 'injury', side, `🚑 Kontuzja! ${shortName(s.p)} (${side.t.name}) – ${ij.type}, przerwa ok. ${Math.ceil(days / 7)} tyg.`); m.alert = 'injury';
      const rep = bestSubFor(side, s.pos);
      if (rep && side.subs < MAX_SUBS) substitute(m, side, s.p, rep); else removeFromPitch(side, s.p, mn);
      m.dirty = true;
    }
    if (side.ai && (mn === 58 || mn === 67 || mn === 76 || mn === 84 || mn === 100)) aiSubs(m, side);
  }
  if (mn === 45 && !m.htDone) { m.htDone = true; ev(m, 'ht', null, `⏸ Przerwa. ${H.t.name} ${H.goals}:${A.goals} ${A.t.name}`); return 'ht'; }
  if (mn >= m.end) {
    if (m.ko && tied(m)) {
      if (!m.et) { m.et = true; m.end = 120 + ri(0, 2); ev(m, 'ht', null, '⏱ Dogrywka!'); return 'et'; }
      shootout(m);
    }
    finishMatch(m); return 'ft';
  }
  return null;
}
function winnerSide(m) {
  const h = m.home.goals + (m.ko ? m.ko.aggH : 0), a = m.away.goals + (m.ko ? m.ko.aggA : 0);
  if (h !== a) return h > a ? 'h' : 'a';
  if (m.pens) return m.pens.h > m.pens.a ? 'h' : 'a';
  return null;
}
function finishMatch(m) {
  m.over = true;
  const club = isClubComp(m.comp);
  const pen = m.pens ? ` (k. ${m.pens.h}:${m.pens.a})` : '';
  ev(m, 'ft', null, `🏁 Koniec meczu! ${m.home.t.name} ${m.home.goals}:${m.away.goals} ${m.away.t.name}${m.et ? ' po dogrywce' : ''}${pen}`);
  for (const [side, opp] of [[m.home, m.away], [m.away, m.home]]) {
    if (side.user) { side.t.oi = null; if (side.t._st) side.t._st.oi = null; }   // instrukcje na rywala obowiązują jeden mecz
    const gd = side.goals - opp.goals;
    for (const r of Object.values(side.rec)) {
      const p = r.p, end = r.off != null ? r.off : m.minute, mins = Math.max(0, end - r.on);
      let rating = 6.0 + gd * 0.15 + r.g * 1.0 + r.a * 0.55 - r.r * 1.6 - r.y * 0.15 + Math.min(r.sv, 7) * 0.2 + Math.min(r.tk || 0, 12) * 0.05 + Math.min(r.kp || 0, 8) * 0.09 + gauss() * 0.4;
      if (LINE[r.pos] === 'GK' || LINE[r.pos] === 'DEF') rating += (opp.goals === 0 ? 0.5 : 0) - opp.goals * 0.2;
      r.rating = clamp(Math.round(rating * 10) / 10, 3, 10); r.mins = mins;
      p.fit = clamp(p.fit - mins * (p.pos === 'GK' ? 0.08 : 0.19 * (1 + 0.12 * ((side.tac && side.tac.press) || 0))), 15, 100);
      p.form = Math.round(clamp(p.form * 0.65 + clamp((r.rating - 4) / 5 * 100, 0, 100) * 0.35, 0, 100));
      p.mor = clamp(p.mor + (gd > 0 ? 3 : gd < 0 ? -3 : 0) + (r.rating >= 7.5 ? 2 : r.rating <= 5.5 ? -2 : 0), 0, 100);
      if (club) {
        p.shp = clamp(p.shp + mins / 90 * 16, 0, 100);
        const st = p.st; st.apps++; st.g += r.g; st.a += r.a; st.rs += r.rating; st.mins += mins; if (r.y) st.y++; if (r.r) st.r++;
        if (m.comp === 'L') p.lg += r.g; else p.eg += r.g;
        p.car.apps++; p.car.g += r.g; p.car.a += r.a;
      } else if (m.comp === 'P') p.shp = clamp(p.shp + mins / 90 * 22, 0, 100);
      else if (m.comp !== 'F') { p.caps++; p.ng += r.g; }
    }
    if (club && side.t.players) for (const p of side.t.players) {
      const r = side.rec[p.id];
      p.pt = (p.pt || 0) * 0.8 + 0.2 * (r ? Math.min(1, (r.mins || 0) / 90) : 0);
      if (p._fresh) p._fresh = false; else if (p.susp > 0 && !r) p.susp--;
    }
  }
  const all = [...Object.values(m.home.rec), ...Object.values(m.away.rec)];
  m.motm = all.slice().sort((a, b) => b.rating - a.rating)[0];
  m.winner = winnerSide(m);
}

/* szybka symulacja (mecze AI): ten sam model siły, wynik losowany z rozkładu Poissona */
let FAST_K = 1.11, FAST_BLEND = 0.38;
function poisson(l) { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }
function fastSim(h, a, opts = {}) {
  const m = createMatch(h, a, { ...opts, quick: true });
  const H = m.home, A = m.away;
  // zmiany: 3 najbardziej zmęczonych w 65. minucie
  for (const side of [H, A]) for (let k = 0; k < 3; k++) { m.minute = 62 + k * 6; aiSubs(m, side); }
  m.minute = 45; calcStr(H, 45); calcStr(A, 45);
  const hm = Math.pow(H.str.mid, 2) * (m.neutral ? 1 : 1.06), am = Math.pow(A.str.mid, 2), ph = hm / (hm + am);
  const xg = (S1, S2, poss) => {
    const aS = 0.7 * S1.str.att + 0.3 * S1.str.mid, dS = 0.65 * S2.str.def + 0.35 * S2.str.mid;
    const mA = S1.ment === 'att' ? 1.18 : S1.ment === 'def' ? 0.82 : 1, mO = S2.ment === 'att' ? 1.12 : S2.ment === 'def' ? 0.88 : 1;
    const shots = 90 * poss * clamp(SHOT_BASE * Math.pow(aS / dS, SHOT_EXP) * mA * mO, 0.03, 0.7);
    const q = S1.str.att * 0.97 / (0.5 * S2.str.gk + 0.5 * S2.str.def);
    return { shots, g: shots * clamp(0.083 * Math.pow(q, FIN_EXP), 0.02, 0.4) * FAST_K };
  };
  const xh = xg(H, A, ph), xa = xg(A, H, 1 - ph);
  if (!m.neutral) { xh.g *= HOME_ADV; xa.g *= AWAY_ADV; }
  { const mg = (xh.g + xa.g) / 2; xh.g = xh.g * (1 - FAST_BLEND) + mg * FAST_BLEND; xa.g = xa.g * (1 - FAST_BLEND) + mg * FAST_BLEND; }   // mniej pogromów
  const addGoals = (side, n, from, to) => {
    for (let i = 0; i < n; i++) {
      const c = side.pitch.filter(s => s.pos !== 'GK'); if (!c.length) return;
      const sh = wpick(c, s => SHOT_W[s.pos] * Math.pow((s.p.pos === 'GK' ? 20 : s.p.a[1]) / 60, 3));
      m.minute = ri(from, to);
      side.goals++; side.rec[sh.p.id].g++;
      if (rnd() < 0.72) { const cc = side.pitch.filter(s => s !== sh && s.pos !== 'GK'); if (cc.length) side.rec[wpick(cc, s => (LINE[s.pos] === 'DEF' ? 1 : 3) * (s.p.a[2] / 60)).p.id].a++; }
      side.scorers.push({ min: m.minute, name: shortName(sh.p), pid: sh.p.id });
    }
  };
  addGoals(H, poisson(xh.g), 1, 90); addGoals(A, poisson(xa.g), 1, 90);
  H.shots = Math.round(xh.shots); A.shots = Math.round(xa.shots); H.sot = Math.max(H.goals, Math.round(H.shots * 0.38)); A.sot = Math.max(A.goals, Math.round(A.shots * 0.38));
  H.poss = Math.round(ph * 90); A.poss = 90 - H.poss;
  const club = isClubComp(m.comp);
  for (const side of [H, A]) {
    const ps = side.pitch.filter(s => s.pos !== 'GK');
    for (let i = poisson(1.6); i > 0 && ps.length; i--) side.rec[pick(ps).p.id].y = 1;
    if (rnd() < 0.05 && ps.length) { const s = pick(ps); side.rec[s.p.id].r = 1; if (club) { s.p.susp = ri(1, 2); s.p._fresh = true; } }
    { const rk = side.pitch.map(x => injRisk(x.p, x.p.fit)); if (rnd() < 0.085 * avg(rk)) injure(wpick(side.pitch, x => rk[side.pitch.indexOf(x)]).p); }
    const gk = side.pitch.find(s => s.pos === 'GK'); const opp = side === H ? A : H;
    if (gk) side.rec[gk.p.id].sv = Math.max(0, opp.sot - opp.goals);
  }
  m.minute = 90;
  if (m.ko && tied(m)) {
    m.et = true; m.minute = 120;
    addGoals(H, poisson(xh.g / 3), 91, 120); addGoals(A, poisson(xa.g / 3), 91, 120);
    if (tied(m)) shootout(m);
  }
  m.scorersSorted = true;
  finishMatch(m);
  return m;
}
function simulate(h, a, opts = {}) { const m = createMatch(h, a, { ...opts, quick: true }); while (!m.over) step(m); return m; }

if (typeof module !== 'undefined') module.exports = { POSITIONS, FORMATIONS, calcOvr, genAttrs, ovrAt };
