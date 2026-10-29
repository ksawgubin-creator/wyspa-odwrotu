'use strict';
/* ============================================================
   KARIERA MENEDŻERA – wydarzenia, rozmowy, prasa, kibice,
   kapitan, obietnice, osiągnięcia, gablota
   Wyniki decyzji są losowe (ważone) i zależą od ukrytych cech
   zawodników, pamięci wcześniejszych decyzji (S.mem) i sytuacji klubu.
   ============================================================ */

/* ---------- ukryte cechy charakteru (1–20) ---------- */
// pro – profesjonalizm, amb – ambicja, tem – temperament (wysoki = wybuchowy), loy – lojalność, pre – odporność na presję
const TRAITS = { pro: 'Profesjonalizm', amb: 'Ambicja', tem: 'Temperament', loy: 'Lojalność', pre: 'Odporność na presję' };
function traits(p) {
  if (p.tr) return p.tr;
  let x = (p.id * 2654435761 + 12345) >>> 0;
  const r = () => { x = (x * 1103515245 + 12345) >>> 0; return x / 4294967296; };
  const g = () => clamp(Math.round(10.5 + (r() + r() + r() - 1.5) * 9), 1, 20);
  return (p.tr = { pro: g(), amb: g(), tem: g(), loy: g(), pre: g() });
}
function pers(p) {
  const t = traits(p);
  if (t.tem >= 15) return 'Temperamentny';
  if (t.pro >= 15) return 'Profesjonalista';
  if (t.amb >= 15) return 'Ambitny';
  if (t.loy >= 15) return 'Lojalny';
  if (t.tem <= 6 && t.amb <= 9) return 'Wyluzowany';
  return 'Zrównoważony';
}
const PERS_DESC = {
  Profesjonalista: 'Pracowity, dobrze znosi krytykę i presję.', Ambitny: 'Chce grać w wielkim klubie i o trofea.',
  Lojalny: 'Przywiązany do klubu, łatwiej przedłuża umowy.', Temperamentny: 'Emocjonalny – źle znosi krytykę i ławkę.',
  Wyluzowany: 'Spokojny, mało co go rusza.', Zrównoważony: 'Bez skrajności – reakcje trudne do przewidzenia.',
};
const TRAIT_FEM = { amb: true, loy: true, pre: true };
const traitWord = (v, fem) => { const w = v >= 16 ? 'bardzo wysok' : v >= 12 ? 'wysok' : v >= 8 ? 'przeciętn' : v >= 5 ? 'nisk' : 'bardzo nisk'; return w + (fem ? 'a' : (w.endsWith('k') ? 'i' : 'y')); };

/* Pamięć decyzji (S.mem – same liczniki, mały zapis):
   strict/soft – twardy/miękki styl, liar/honest – obietnice, media – ostre wypowiedzi,
   spons – stawanie po stronie sponsorów wbrew kibicom, fanside – po stronie kibiców,
   boardY/boardN – ustępowanie/odmawianie prezesowi, jour – relacja z dziennikarzem (Jacek Wrona, ±),
   agent – relacja z agentem (Leon Kmita, ±), rival – wojny słowne z rywalami, crit – publiczna krytyka zawodników,
   csr – zaangażowanie społeczne, acad – stawianie na akademię.
   Flagi zawodników (numer dnia): p._crit – publicznie skrytykowany, p._lied – złamana obietnica, p._kept – dotrzymana. */
const MEM_KEYS = ['strict', 'soft', 'liar', 'honest', 'media', 'spons', 'fanside', 'boardY', 'boardN', 'jour', 'agent', 'rival', 'crit', 'csr', 'acad'];
function metaInit() {
  if (!S) return;
  if (S.fans == null) S.fans = 60;
  if (S.press == null) S.press = 55;
  S.promises = S.promises || []; S.pending = S.pending || []; S.ach = S.ach || {};
  S.trophies = S.trophies || []; S.results = S.results || []; S.stats = S.stats || { games: 0, wins: 0, unbeaten: 0, bestUnbeaten: 0 };
  S.evSeen = S.evSeen || {}; S.evCat = S.evCat || {}; S.followups = S.followups || []; S.mem = S.mem || {};
  for (const k of ['strict', 'soft', 'liar', 'honest', 'media']) if (S.mem[k] == null) S.mem[k] = 0;
  S.talkHist = S.talkHist || []; S.pressHist = S.pressHist || {};
  if (S.captain === undefined) S.captain = null;
}
const sgn = v => (v > 0 ? '+' : '') + Math.round(v);
const uPlayers = () => userClub().players;
const starPlayer = () => uPlayers().slice().sort((a, b) => b.ovr - a.ovr)[0];
const randPlayer = f => { const l = uPlayers().filter(f || (() => true)); return l.length ? pick(l) : null; };
const lastRes = n => S.results.slice(-n);
const recentM = () => absDay() - (S.lastUM != null ? S.lastUM : -99) <= 5;   // wydarzenia „po meczu” tylko tuż po meczu
const noisy = v => { const n = v * (0.7 + rnd() * 0.6); return Math.abs(n) < 1 && v !== 0 ? Math.sign(v) : Math.round(n); };

/* ---------- pomocnicze: pamięć, pieniądze, faza sezonu, tabela ---------- */
const memv = k => (S.mem && S.mem[k]) || 0;
function memAdd(m, ctx) {
  if (typeof m === 'function') m = m(ctx);
  if (!m) return;
  if (typeof m === 'string') m = { [m]: 1 };
  else if (Array.isArray(m)) m = Object.fromEntries(m.map(k => [k, 1]));
  for (const [k, v] of Object.entries(m)) S.mem[k] = clamp(Math.round(((S.mem[k] || 0) + v) * 10) / 10, -9, 99);
}
// kwoty skalowane finansami klubu (tygodniowe wpływy od sponsorów / z TV)
const evSp = k => Math.max(1000, Math.round(userClub().spons * k / 1000) * 1000);
const evTv = k => Math.max(1000, Math.round(userClub().tv * k / 1000) * 1000);
// im częściej stawałeś po stronie sponsorów wbrew kibicom, tym ostrzej reagują kibice
const fanHit = v => v >= 0 ? v : Math.round(v * (1 + 0.15 * clamp(memv('spons') - memv('fanside') * 0.5, 0, 5)));
const trt = (p, k) => p ? traits(p)[k] : 10;
const sqT = k => { const l = uPlayers(); return l.length ? avg(l.map(p => traits(p)[k])) : 10; };
const withP = f => { const p = randPlayer(f); return p ? { p } : null; };
const evDay = () => absDay();
const since = v => v != null ? absDay() - v : 1e9;
const evLs = () => typeof curLs === 'function' ? curLs() : 0;
const evLg = () => S.leagues[userClub().lg];
const evBreak = () => { const lg = evLg(); return !!lg && lg.lsMap[evLs()] === -1; };
function evRow() { const ut = userClub(); return (evLg() && table(ut.lg).find(r => r.id === ut.id)) || { pos: 1, P: 0, Pts: 0 }; }
const evTeams = () => evLg() ? evLg().clubs.length : 18;
const evGames = () => { const n = evTeams(); return n > 24 ? n - 1 : (n - 1) * 2; };
const evLeft = () => evGames() - evRow().P;
const inSeason = () => S.day < S.cal.length && evRow().P >= 3 && evLeft() >= 1;
// najbliższy mecz ligowy w ciągu `days` dni: { c: rywal, home, derby, days }
function evNextOpp(days = 8) {
  if (S.day >= S.cal.length || !evLg()) return null;
  const now = curDay().date, lg = evLg();
  for (let i = S.day; i < S.cal.length; i++) {
    const d = S.cal[i], dd = (d.date - now) / 864e5; if (dd > days) break;
    if (d.t !== 'L') continue;
    const r = lg.lsMap[d.ls]; if (r == null || r < 0) continue;
    const f = lg.fix[r].find(f => f.h === S.user || f.a === S.user); if (!f || f.p) continue;
    return { c: club(f.h === S.user ? f.a : f.h), home: f.h === S.user, derby: derbyName(f.h, f.a), days: Math.round(dd) };
  }
  return null;
}
const lastLoss = () => recentM() && lastRes(1)[0] === 'L';
const lastWin = () => recentM() && lastRes(1)[0] === 'W';
// tekst/wariant: tablica = losowy wariant, funkcja = wywołanie z kontekstem
function evText(x, ctx) {
  if (Array.isArray(x)) x = x.length ? x[Math.floor(rnd() * x.length)] : '';
  return typeof x === 'function' ? x(ctx) : x;
}
// zawodnik, któremu przytrafia się uraz w wyniku decyzji (dla wydarzeń bez zawodnika w kontekście)
function evHurt(c, a, b, f) { if (!c.p) c.p = randPlayer(f || (p => !p.inj && p.st.apps > 0)) || randPlayer(p => !p.inj); return c.p ? { inj: ri(a, b) } : {}; }
const evX = c => c.x || {};
const EV_POS = { GK: 'bramkarz', CB: 'środkowy obrońca', LB: 'lewy obrońca', RB: 'prawy obrońca', CDM: 'defensywny pomocnik', CM: 'środkowy pomocnik', CAM: 'ofensywny pomocnik', LM: 'lewy pomocnik', RM: 'prawy pomocnik', LW: 'lewy skrzydłowy', RW: 'prawy skrzydłowy', ST: 'napastnik' };
const posName = p => EV_POS[p] || POS_PL[p] || p;

/* ---------- efekty wyborów (z losowym rozrzutem ±30%) ---------- */
function applyFx(fx, ctx = {}, exact) {
  const ut = userClub(), out = [], N = v => exact ? v : noisy(v);
  if (fx.fans) { const v = N(fx.fans); S.fans = clamp(S.fans + v, 0, 100); out.push(`🏟️ Kibice ${sgn(v)}`); }
  if (fx.press) { const v = N(fx.press); S.press = clamp(S.press + v, 0, 100); out.push(`📰 Prasa ${sgn(v)}`); }
  if (fx.board) { const v = N(fx.board); S.board.conf = clamp(S.board.conf + v, 0, 100); out.push(`🏛️ Zarząd ${sgn(v)}`); }
  if (fx.team) {
    const v = N(fx.team);
    for (const p of uPlayers()) p.mor = clamp(p.mor + v * (traits(p).tem >= 14 ? 1.3 : traits(p).tem <= 6 ? 0.6 : 1), 0, 100);
    out.push(`👥 Szatnia ${sgn(v)}`);
  }
  if (fx.samepos && ctx.p) { const v = N(fx.samepos); for (const q of uPlayers()) if (q !== ctx.p && LINE[q.pos] === LINE[ctx.p.pos]) q.mor = clamp(q.mor + v, 0, 100); out.push(`👥 Konkurenci do składu ${sgn(v)}`); }
  if (fx.player && ctx.p) { const v = N(fx.player); ctx.p.mor = clamp(ctx.p.mor + v, 0, 100); out.push(`${moraleLabel(ctx.p.mor)[0]} ${shortName(ctx.p)} ${sgn(v)}`); }
  if (fx.player2 && ctx.q) { const v = N(fx.player2); ctx.q.mor = clamp(ctx.q.mor + v, 0, 100); out.push(`${moraleLabel(ctx.q.mor)[0]} ${shortName(ctx.q)} ${sgn(v)}`); }
  if (fx.form && ctx.p) { const v = N(fx.form); ctx.p.form = clamp(ctx.p.form + v, 0, 100); out.push(`📈 ${shortName(ctx.p)}: forma ${sgn(v)}`); }
  if (fx.money) { const v = Math.round(N(fx.money / 1000) * 1000); ut.bal += v; if (v > 0) { ut.fin.inc += v; ut.tb += Math.round(v * 0.5); } else ut.fin.exp -= v; out.push(`💶 ${v > 0 ? '+' : ''}${money(v)}`); }
  if (fx.cash) { const v = Math.round(fx.cash); ut.bal += v; if (v > 0) { ut.fin.inc += v; ut.tb += Math.round(v * 0.5); } else ut.fin.exp -= v; out.push(`💶 ${v > 0 ? '+' : ''}${money(v)}`); }   // dokładna kwota (np. z negocjacji)
  if (fx.mgr) { mgrGain(fx.mgr); out.push(`🧑‍💼 OVR trenera ${fx.mgr > 0 ? '+' : ''}${fx.mgr}`); }
  if (fx.fit && ctx.p) { const v = N(fx.fit); ctx.p.fit = clamp(ctx.p.fit + v, 10, 100); out.push(`🔋 ${shortName(ctx.p)}: kondycja ${sgn(v)}`); }
  if (fx.shp) { const v = N(fx.shp); for (const p of uPlayers()) p.shp = clamp(p.shp + v, 0, 100); out.push(`⚡ Zgranie drużyny ${sgn(v)}`); }
  if (fx.teamFit) { const v = N(fx.teamFit); for (const p of uPlayers()) p.fit = clamp(p.fit + v, 10, 100); out.push(`🔋 Kondycja drużyny ${sgn(v)}`); }
  if (fx.inj && ctx.p) { const v = Math.max(3, N(fx.inj)); ctx.p.inj = Math.max(ctx.p.inj, v); out.push(`🚑 ${shortName(ctx.p)}: przerwa ~${plural(Math.ceil(v / 7), 'tydzień', 'tygodnie', 'tygodni')}`); }
  if (fx.price) { ut.price = Math.round(ut.price * (1 + fx.price) * 10) / 10; out.push(`🎟️ Ceny biletów ${fx.price > 0 ? '+' : ''}${Math.round(fx.price * 100)}%`); }
  if (fx.spons) { ut.spons = Math.round(ut.spons * (1 + fx.spons)); out.push(`🤝 Sponsorzy ${fx.spons > 0 ? '+' : ''}${Math.round(fx.spons * 100)}%`); }
  if (fx.tb) { ut.tb += fx.tb; out.push(`💼 Budżet transferowy ${fx.tb > 0 ? '+' : ''}${money(fx.tb)}`); }
  if (fx.wage && ctx.p) { ctx.p.wage = Math.round(ctx.p.wage * (1 + fx.wage) / 100) * 100; out.push(`💰 ${shortName(ctx.p)}: pensja ${fx.wage > 0 ? '+' : ''}${Math.round(fx.wage * 100)}%`); }
  if (fx.list && ctx.p) { ctx.p.listed = true; out.push(`📋 ${shortName(ctx.p)}: lista transferowa`); }
  if (fx.captain && ctx.p) { S.captain = ctx.p.id; out.push(`©️ Nowy kapitan: ${shortName(ctx.p)}`); }
  if (fx.promise && ctx.p) { makePromise(ctx.p); out.push(`🤝 ${shortName(ctx.p)}: obietnica regularnej gry (3 tygodnie)`); }
  if (fx.boast) { S.boast = true; out.push('🎤 Media zapamiętają tę zapowiedź'); }
  if (fx.crit && ctx.p) { ctx.p._crit = absDay(); memAdd('crit'); out.push(`🗯️ ${shortName(ctx.p)} zapamięta publiczną krytykę`); }
  if (fx.yth && S.acad) { const v = N(fx.yth); for (const y of S.acad.youth) y.mor = clamp((y.mor != null ? y.mor : 60) + v, 0, 100); out.push(`🎓 Nastroje w akademii ${sgn(v)}`); }
  return out;
}
function makePromise(p) { if (!S.promises.some(x => x.pid === p.id)) S.promises.push({ pid: p.id, until: absDay() + 21, kind: 'time', start: p.pt }); }

/* ---------- wydarzenia ---------- */
// Wydarzenie: id, cat, w (waga losowania), ctx(d) → kontekst lub null (warunki), title, text (tekst | tablica wariantów | funkcja), choices.
// Wybór: t (tekst), hint (ostrzeżenie przed decyzją, może być funkcją), mem (zapis w pamięci: 'klucz' | ['k1','k2'] | {k: delta} | fn),
//   fx|fn – skutek stały (przy `outs` dodawany do skutku wyniku), r – opis (tekst | tablica | funkcja), follow: [id, dniOd, dniDo, szansa] (0,0 = od razu),
//   outs: [{ w: liczba | ctx=>liczba, fx|fn, r, follow?, mem?, bad? }] – jeden wynik losowany wg wag (wagi zależą od kontekstu i pamięci),
//   alt: { p: ctx=>szansa, fx|fn, r } – starszy format alternatywnego wyniku (nadal obsługiwany).
const ou = (w, fx, r, x) => Object.assign(typeof fx === 'function' ? { w, fn: fx } : { w, fx }, { r }, x || {});
const ob = (w, fx, r, x) => ou(w, fx, r, Object.assign({ bad: true }, x || {}));
const strictness = () => S.mem.strict - S.mem.soft;
// pamięć w tekstach: powracające postacie odwołują się do wcześniejszych decyzji
const spHist = () => memv('spons') >= 2 ? ' Kibice już zapowiadają, że to będzie „kolejna zdrada tradycji”.' : memv('fanside') >= 3 ? ' Kibice ufają, że i tym razem staniesz po ich stronie.' : '';
const chairNote = () => memv('boardN') >= 2 ? ' Prezes dodaje chłodno, że ostatnio rzadko się z nim zgadzasz.' : memv('boardY') >= 3 ? ' Prezes podkreśla, że do tej pory świetnie Wam się współpracowało.' : '';
const wronaNote = () => memv('jour') >= 2 ? 'Jacek Wrona, z którym masz dobre relacje,' : memv('jour') <= -2 ? 'Jacek Wrona, który wciąż pamięta Twoje odmowy,' : 'Jacek Wrona, znany dziennikarz sportowy,';
const kmitaNote = () => memv('agent') >= 2 ? ' Kmita przypomina, że „dobrze się Wam razem pracuje”.' : memv('agent') <= -2 ? ' Kmita nie zapomniał, jak ostatnio go potraktowałeś.' : '';
const grudge = p => p && (since(p._crit) < 150 || since(p._lied) < 200);

const EVENTS = [
  /* ===================== KLUB / OBÓZ ===================== */
  { id: 'wintercamp', cat: 'Klub', follow: true, title: '❄️ Przerwa zimowa – obóz przygotowawczy',
    text: [() => `Liga zrobiła sobie przerwę zimową. Gdzie drużyna ma przygotowywać się do rundy wiosennej? Koszt zależy od wyjazdu (budżet obozu: ${money(campCost(1))} – ${money(campCost(2))}).`,
      () => `Przerwa zimowa. Sztab czeka na decyzję w sprawie obozu przed rundą wiosenną – wyjazd kosztuje od ${money(campCost(1))} do ${money(campCost(2))}.`],
    choices: [{ t: '🏠 Zostajemy w kraju (bazy klubu)', hint: 'zależy od pogody', outs: [
        ou(3, { teamFit: 6, shp: 4 }, 'Skromnie, ale bez wydatków. Śnieg utrudniał treningi.'),
        ou(2, { teamFit: 8, shp: 6, team: 2 }, 'Mróz odpuścił, a boisko z podgrzewaną murawą sprawdziło się znakomicie.'),
        ob(1, { teamFit: 3, shp: 2, team: -2 }, 'Zamiecie śnieżne odwołały połowę zajęć – zawodnicy narzekają na warunki.')] },
      { t: '🇹🇷 Turcja (Antalya) – sparingi z klubami z Europy', fn: () => ({ money: -campCost(1) }), outs: [
        ou(4, { teamFit: 12, shp: 10, team: 4 }, ['Dobre boiska i solidni sparingpartnerzy.', 'Słońce, dobre boiska i wymagający rywale – obóz według planu.']),
        ou(1, { teamFit: 9, shp: 7, team: 1 }, 'Ulewy przez pół obozu – część sparingów odwołano.'),
        ob(1, c => Object.assign({ teamFit: 11, shp: 9, team: 2 }, evHurt(c, 10, 21)), c => c.p ? `Udany obóz, choć w ostatnim sparingu urazu doznał ${c.p.n}.` : 'Udany obóz.')] },
      { t: '🇪🇸 Hiszpania / Dubaj – obóz premium', fn: () => ({ money: -campCost(2), board: -2 }), outs: [
        ou(4, { teamFit: 16, shp: 14, team: 7 }, 'Świetne warunki – zawodnicy zachwyceni, zarząd liczy koszty.'),
        ob(1, { teamFit: 14, shp: 12, team: 3, press: -4 }, 'Zdjęcia zawodników z hotelowego basenu obiegły media: „wczasy za pieniądze klubu”.'),
        ob(c => 1 + (memv('soft') > memv('strict') ? 1 : 0), () => ({ teamFit: 12, shp: 10, team: 5, board: -2, money: -Math.round(campCost(1) * 0.3) }), 'Obóz udany, ale kilku zawodników wróciło z hotelu po północy, a rachunek okazał się wyższy, niż zakładano.')] }] },

  /* ===================== KIBICE ===================== */
  { id: 'fanprotest', cat: 'Kibice', w: 4, ctx: () => recentM() && lastRes(3).length === 3 && lastRes(3).every(r => r === 'L') ? {} : null,
    title: 'Protest kibiców', text: [() => `Po serii porażek kibice ${userClub().short} protestują pod stadionem. Transparent: „Obudźcie się!”.`, () => 'Trzy porażki z rzędu. Kilkuset kibiców czeka pod stadionem na wyjście drużyny – atmosfera jest gorąca.', () => `Pod bramą stadionu stoją kibice z transparentem „Gdzie jest ambicja?”. Domagają się rozmowy z trenerem.${spHist()}`],
    choices: [{ t: 'Wyjdź do kibiców i porozmawiaj', hint: 'reakcja tłumu jest nieprzewidywalna', outs: [
        ou(c => 3 + (S.fans >= 40 ? 1 : 0) + Math.min(2, memv('fanside') * 0.5), { fans: 8, press: 3, board: -1 }, 'Kibice docenili, że stanąłeś z nimi twarzą w twarz.', { mem: 'fanside' }),
        ou(2, { fans: 3, team: 3 }, 'Kibice wysłuchali, ale dali jasno do zrozumienia: liczą się punkty. Zawodnicy docenili, że wziąłeś to na siebie.'),
        ob(c => 1.5 + (S.fans < 40 ? 2 : 0) + Math.min(2, memv('spons') * 0.6), { fans: -6, press: -4 }, c => memv('spons') >= 2 ? 'Ktoś krzyknął „sprzedałeś klub sponsorom!” – rozmowa wymknęła się spod kontroli, a kamery wszystko nagrały.' : 'Rozmowa wymknęła się spod kontroli – posypały się wyzwiska, a kamery wszystko nagrały.')] },
      { t: 'Zignoruj protest', outs: [
        ob(3, { fans: -8, press: -3 }, 'Media piszą o „trenerze w wieży z kości słoniowej”.', { follow: ['f_protest2', 10, 25, 0.6] }),
        ou(2, { fans: -3, team: 2 }, 'Protest szybko się wypalił, a zawodnicy w spokoju skupili się na treningu.')] },
      { t: 'Publicznie obwiń zawodników', mem: ['strict', 'crit'], outs: [
        ou(2, { fans: 5, team: -8, press: 2 }, 'Kibice przyklaskują, ale w szatni zawrzało.'),
        ou(1, { fans: 4, team: -3 }, 'Zawodnicy wzięli sobie słowa do serca – na treningu iskrzy, ale jest w tym ogień.'),
        ob(c => 1 + (sqT('tem') >= 11 ? 1 : 0), { fans: 3, team: -12, press: -2 }, 'Kilku zawodników odpowiedziało Ci w mediach społecznościowych. Szatnia jest podzielona.')] }] },
  { id: 'f_protest2', cat: 'Kibice', follow: true, title: 'Protest przybiera na sile', text: ['Zignorowany protest rozlał się na trybuny – kibice zapowiadają bojkot meczu.', 'Kibice nie odpuszczają: na najbliższy mecz zapowiadają pusty sektor i milczenie przez całe spotkanie.'],
    choices: [{ t: 'Spotkaj się z przedstawicielami kibiców', outs: [ou(3, { fans: 7, board: -2 }, 'Udało się załagodzić sytuację.', { mem: 'fanside' }), ob(1, { fans: -2, board: -2 }, 'Przedstawiciele przyszli z listą żądań nie do spełnienia. Spotkanie skończyło się trzaśnięciem drzwiami.')] },
      { t: 'Poproś zarząd o obniżkę cen biletów', fx: { fans: 9, price: -0.1, board: -4 }, r: 'Tańsze bilety uspokoiły nastroje.', mem: 'fanside' },
      { t: 'Nadal ignoruj', outs: [ob(2, { fans: -10, board: -4, press: -4 }, 'Na meczu połowa trybun pustoszeje.'), ou(1, { fans: -4, board: -1, team: 2 }, 'Bojkot okazał się mniejszy, niż zapowiadano – a zawodnicy w spokoju skupili się na grze.')] }] },
  { id: 'opentraining', cat: 'Kibice', w: 2, ctx: () => ({}), title: 'Otwarty trening', text: ['Stowarzyszenie kibiców prosi o otwarty trening dla rodzin z dziećmi.', 'Kibice proszą o otwarty trening w weekend – z autografami i zdjęciami z zawodnikami.'],
    choices: [{ t: 'Zgoda – z autografami', outs: [ou(3, { fans: 6, teamFit: -3, team: 1 }, 'Tysiące uśmiechniętych dzieci.'), ou(1, { fans: 8, team: 3, teamFit: -2 }, 'Atmosfera jak na święcie – nawet zawodnicy wyszli uśmiechnięci.'), ob(1, { fans: 3, teamFit: -3, press: -2 }, 'Tłok przy bramie, kilka osób zasłabło – media piszą o złej organizacji.')] },
      { t: 'Zgoda, ale tylko pół godziny', outs: [ou(2, { fans: 3 }, 'Krótko, ale sympatycznie.'), ou(1, { fans: -1 }, 'Kibice uznali, że zostali potraktowani po macoszemu.')] },
      { t: 'Odmów – trening to praca', fx: { fans: -4, teamFit: 1 }, r: 'Kibice są zawiedzeni.' }] },
  { id: 'fanyouth', cat: 'Kibice', w: 2, ctx: () => withP(p => p.age <= 21 && p.st.apps < 3),
    title: 'Kibice chcą wychowanka', text: [c => `Na trybunach słychać: „${c.p.n}! ${c.p.n}!” – kibice domagają się szansy dla młodego zawodnika.`, c => `${c.p.n} stał się ulubieńcem kibiców, choć prawie nie gra. Na forum trwa akcja „Dajcie mu szansę”.`],
    choices: [{ t: 'Obiecaj mu minuty', hint: 'obietnica do dotrzymania', fx: { fans: 6, player: 10, promise: true, samepos: -3 }, r: 'Musisz teraz dotrzymać słowa.' },
      { t: 'Wyjaśnij, że musi poczekać', fx: { samepos: 2, team: 1 }, outs: [ou(3, { fans: -4, player: -5 }, 'Rozczarowanie na trybunach, ale szatnia widzi, że miejsce w składzie trzeba wywalczyć.'), ou(c => trt(c.p, 'pro') >= 13 ? 2 : 0.5, { fans: -2, player: 2 }, 'Zawodnik przyznał w wywiadzie, że rozumie decyzję i będzie cierpliwie pracował.')] }] },
  { id: 'n_ultras', cat: 'Kibice', w: 2, ctx: () => recentM() && S.lastMatch && S.lastMatch.home ? {} : null, title: 'Race na trybunach',
    text: ['Podczas ostatniego meczu kibice odpalili race – sędzia przerwał spotkanie na kilka minut. Komisja ligi szykuje karę.', 'Pirotechnika na trybunie za bramką, zadymiona murawa i kilkuminutowa przerwa w meczu. Liga już wszczęła postępowanie.'],
    choices: [{ t: 'Potępić – klub pomoże zidentyfikować sprawców', mem: { fanside: -1 }, outs: [ou(3, { press: 4, board: 3, fans: -6 }, 'Media i zarząd chwalą stanowczość. Trybuna milczy.'), ob(c => 1 + Math.min(2, memv('spons') * 0.5), { fans: -11, press: 3, board: 2 }, 'Ultrasi ogłosili bojkot dopingu – „trener woli policję niż swoich kibiców”.')] },
      { t: 'Bronić kibiców: „to część kultury”', mem: 'fanside', fn: () => ({ cash: -evTv(0.5) }), outs: [ou(2, { fans: 6, press: -5, board: -3 }, 'Trybuny skandują Twoje nazwisko. Liga nałożyła grzywnę.'), ob(1, () => ({ fans: 6, press: -6, board: -4, cash: -evTv(0.8) }), 'Liga podwoiła karę za „brak reakcji klubu”.')] },
      { t: 'Bez komentarza – zapłacić karę', outs: [ou(2, () => ({ cash: -evTv(0.5), fans: -1 }), 'Klub zapłacił karę i sprawa ucichła.'), ou(1, () => ({ cash: -evTv(0.2) }), 'Komisja ograniczyła się do symbolicznej grzywny.')] }] },
  { id: 'n_awaytrip', cat: 'Kibice', w: 2, ctx: () => { const o = evNextOpp(9); return o && !o.home && (o.derby || o.c.rep >= userClub().rep + 2) ? { x: { o: o.c.name } } : null; }, title: 'Wyjazd kibiców',
    text: [c => `Przed ważnym meczem wyjazdowym (rywal: ${evX(c).o}) stowarzyszenie kibiców prosi klub o dopłatę do autokarów.`, c => `Kibice chcą wypełnić sektor gości na meczu wyjazdowym – rywal: ${evX(c).o}. Pytają, czy klub dołoży się do transportu.`],
    choices: [{ t: 'Dopłać do wyjazdu', fn: () => ({ cash: -evTv(0.4) }), mem: 'fanside', outs: [ou(3, { fans: 6 }, 'Kibice dziękują – sektor gości będzie pełny.'), ou(1, { fans: 7, team: 3 }, 'Sektor gości wypełniony po brzegi – zawodnicy czuli wsparcie od pierwszej minuty.'), ob(1, { fans: 3, press: -4 }, 'Po drodze doszło do burdy na stacji benzynowej – media piszą o „klubowych autokarach chuliganów”.')] },
      { t: 'Nagraj z kapitanem wideo z zaproszeniem', outs: [ou(2, { fans: 3, team: 1 }, 'Proste nagranie, a kibice docenili gest.'), ob(1, { fans: -1, press: -1 }, 'Nagranie wypadło sztywno – internet się śmieje.')] },
      { t: 'Odmów – klub nie finansuje wyjazdów', fx: { board: 1 }, outs: [ou(2, { fans: -4 }, 'Kibice są rozczarowani, zarząd chwali oszczędność.'), ou(1, { fans: -1 }, 'Kibice zorganizowali się sami.')] }] },
  { id: 'n_crest', cat: 'Kibice', w: 1, ctx: () => S.mem.crestS == null ? {} : null, title: 'Nowy herb?',
    text: ['Dział marketingu przygotował nowoczesny herb klubu – „lepiej wygląda na koszulkach i w internecie”. Projekt już wyciekł do sieci.', () => `Agencja reklamowa zaproponowała uproszczony, „cyfrowy” herb. Sponsorzy są zachwyceni, kibice – wręcz przeciwnie.${spHist()}`],
    choices: [{ t: 'Wprowadź nowy herb', hint: 'kibice pamiętają takie decyzje', mem: 'spons', fn: () => { S.mem.crestS = S.season; return {}; }, outs: [
        ou(2, () => ({ spons: 0.05, fans: fanHit(-8) }), 'Sponsorzy zadowoleni, tradycjonaliści wściekli.'),
        ou(1, () => ({ spons: 0.06, fans: fanHit(-3) }), 'Młodsi kibice są zachwyceni – gadżety z nowym herbem schodzą na pniu.'),
        ob(c => 0.5 + memv('spons') * 0.8, () => ({ spons: 0.04, fans: fanHit(-14), press: -3 }), 'Kolejna decyzja „pod sponsorów” – kibice mają dość i wywiesili transparent przeciwko zarządowi.')] },
      { t: 'Zorganizuj głosowanie kibiców', mem: 'fanside', fn: () => { S.mem.crestS = S.season; return {}; }, outs: [ou(2, { fans: 4, press: 2 }, 'Kibice wybrali odświeżoną wersję starego herbu – wszyscy zadowoleni.'), ou(1, { fans: 6, spons: 0.02 }, 'Ogromna frekwencja w głosowaniu – sponsorzy docenili zaangażowanie kibiców.'), ob(1, { press: -2, board: -3 }, 'Głosowanie wygrał żartobliwy projekt z internetu. Pomysł trafił do kosza, a zarząd jest zażenowany.')] },
      { t: 'Zostaw stary herb', mem: 'fanside', fx: { board: -2, fans: 4 }, r: 'Tradycja wygrała. Dział marketingu jest zawiedziony.' }] },
  { id: 'n_derbyvisit', cat: 'Kibice', w: 3, ctx: () => { const o = evNextOpp(7); return o && o.derby ? { x: { dn: o.derby } } : null; }, title: 'Kibice przed derbami',
    text: [c => `${evX(c).dn} za kilka dni. Grupa kibiców chce wejść na trening i „porozmawiać” z zawodnikami o tym, ile znaczy ten mecz.`, c => `Przed meczem (${evX(c).dn}) liderzy dopingu proszą o spotkanie z drużyną. Zapowiadają, że „przypomną zawodnikom, czyje barwy noszą”.`],
    choices: [{ t: 'Wpuść ich pod nadzorem', hint: 'może zmotywować albo przestraszyć', outs: [ou(c => 2 + (lastRes(1)[0] === 'W' ? 1 : 0), { team: 4, fans: 5 }, 'Zawodnicy usłyszeli, ile ten mecz znaczy – są nakręceni.'), ob(c => 1 + (lastRes(1)[0] === 'L' ? 1.5 : 0), { team: -6, fans: 2 }, 'Rozmowa zamieniła się w zastraszanie – kilku zawodników jest wyraźnie roztrzęsionych.')] },
      { t: 'Zaproponuj zamiast tego otwarty trening', fx: { fans: 4, teamFit: -2 }, r: 'Trybuny pełne flag, a zawodnicy poczuli derbową atmosferę.' },
      { t: 'Odmów – skupiamy się na meczu', outs: [ou(2, { fans: -5, team: 1 }, 'Kibice są urażeni, ale zawodnicy trenują w spokoju.'), ou(1, { fans: -2, team: 2 }, 'Kibice przyjęli to ze zrozumieniem – wywiesili na treningu baner z życzeniami.')] }] },
  { id: 'n_derbyticket', cat: 'Stadion', w: 2, ctx: () => { const o = evNextOpp(12); return o && o.derby && o.home ? { x: { dn: o.derby } } : null; }, title: 'Bilety na derby',
    text: [c => `Bilety na mecz (${evX(c).dn}) rozeszły się w godzinę. Zarząd chce podnieść ceny w drugiej puli o połowę.`, c => `${evX(c).dn}: komplet widzów pewny. Dział finansowy proponuje „dynamiczne ceny” w ostatniej puli biletów.`],
    choices: [{ t: 'Podnieś ceny drugiej puli', mem: 'spons', outs: [ou(3, () => ({ cash: evTv(1.2), fans: fanHit(-5), board: 2 }), 'Kasa się zgadza, kibice psioczą na „derbowy haracz”.'), ob(1, () => ({ cash: evTv(0.8), fans: fanHit(-9) }), 'Bilety odkupili koniki i sprzedają je trzy razy drożej. Kibice obwiniają klub.')] },
      { t: 'Ceny bez zmian', fx: { fans: 3, board: -1 }, r: 'Kibice doceniają uczciwe ceny.' },
      { t: 'Darmowa pula dla dzieci i seniorów', mem: ['fanside', 'csr'], fn: () => ({ cash: -evTv(0.3) }), outs: [ou(2, { fans: 6, press: 3, board: -2 }, 'Piękny gest – zdjęcia dziadków z wnukami na trybunie obiegły media.'), ou(1, { fans: 4, press: 1, board: -3 }, 'Gest doceniony, choć zarząd liczy utracone wpływy.')] }] },
  { id: 'f_namingprotest', cat: 'Kibice', follow: true, title: 'Stadion nie jest na sprzedaż', text: ['Kibice wywiesili transparent „Nasz stadion nie jest na sprzedaż”. Ultrasi zapowiadają milczenie przez pierwsze 15 minut każdego meczu.', 'Kibice nie zaakceptowali nowej nazwy stadionu – w sieci krąży petycja z tysiącami podpisów.'],
    choices: [{ t: 'Spotkaj się z kibicami', outs: [ou(2, { fans: 5, board: -1 }, 'Kibice wysłuchali argumentów – protest złagodniał. Sponsor nie jest zachwycony rozmowami za jego plecami.'), ob(c => 1 + memv('spons') * 0.5, { fans: -3 }, '„Znowu pieniądze ważniejsze od nas” – rozmowa nic nie dała.')] },
      { t: 'Wynegocjuj powrót starej nazwy w dopisku', fn: () => ({ cash: -evSp(5), fans: 7 }), r: 'Sponsor zgodził się na dopisek tradycyjnej nazwy – za zwrot części pieniędzy.', mem: 'fanside' },
      { t: 'Przeczekaj', outs: [ob(2, { fans: -6, board: -1 }, 'Cisza na trybunach przez kwadrans każdego meczu – zawodnicy to odczuwają.'), ou(1, { fans: -2 }, 'Protest powoli wygasa.')] }] },

  /* ===================== SZATNIA ===================== */
  { id: 'nightclub', cat: 'Szatnia', w: 3, ctx: () => withP(p => p.age < 31),
    title: 'Nocna eskapada', text: [c => `Tabloidy publikują zdjęcia z klubu nocnego – widać na nich, jak ${c.p.n} bawi się nad ranem, a do meczu zostały dwa dni.`, c => `Portal plotkarski: ${c.p.n} na imprezie do czwartej rano, dwa dni przed meczem. Zdjęcia krążą po sieci.`, c => `${c.p.n} został sfotografowany przed klubem nocnym. Kibice w komentarzach pytają, kto tu pilnuje dyscypliny.`],
    choices: [{ t: 'Nałóż karę finansową', mem: 'strict', outs: [
        ou(c => trt(c.p, 'tem') >= 14 ? 1 : 3, { player: -8, press: 3, board: 2, team: 1 }, 'Zawodnik zacisnął zęby i zapłacił.'),
        ob(c => trt(c.p, 'tem') >= 14 ? 2.5 : 0.5, { player: -16, team: -3, press: 2 }, 'Zawodnik wybuchł i trzasnął drzwiami – w szatni napięcie.'),
        ou(c => trt(c.p, 'pro') >= 13 ? 2 : 0.5, { player: -3, form: 3, press: 3 }, 'Przeprosił drużynę i zapłacił bez słowa – na treningu daje z siebie wszystko.')] },
      { t: 'Odsuń go od najbliższego meczu (publicznie)', mem: 'strict', outs: [ou(3, { player: -15, fans: 3, press: 5, form: -5, crit: true }, 'Twarda decyzja. Zawodnik długo jej nie zapomni.'), ou(1, { player: -10, team: 3, press: 4, crit: true }, 'Szatnia odebrała to jako jasny sygnał: zasady obowiązują wszystkich.')] },
      { t: 'Bagatelizuj sprawę', mem: 'soft', outs: [ob(3, { player: 4, press: -6, board: -3 }, 'Prasa zarzuca Ci brak dyscypliny.', { follow: ['f_nightclub2', 20, 40, 0.5] }), ou(1, { player: 6, press: -2 }, 'Sprawa szybko ucichła – zawodnik czuje, że ma w Tobie sojusznika.')] }] },
  { id: 'f_nightclub2', cat: 'Szatnia', follow: true, title: 'Recydywa', text: [c => `${c.p.n} znowu złamał zasady – tym razem spóźnił się na trening po nocnej imprezie. Media przypominają, że poprzednio uszło mu to na sucho.`, c => `Drugi raz w krótkim czasie: ${c.p.n} przyszedł na trening po nieprzespanej nocy. Szatnia czeka na Twoją reakcję.`],
    choices: [{ t: 'Najwyższa kara i odsunięcie od zespołu', fx: { player: -20, team: 3, press: 4, board: 3 }, r: 'Zespół widzi, że skończyła się taryfa ulgowa.', mem: 'strict' },
      { t: 'Wystaw go na listę transferową', fx: { player: -12, list: true, press: 2 }, r: 'Klub szuka dla niego nowego pracodawcy.' },
      { t: 'Kolejna szansa', mem: 'soft', outs: [ob(3, { press: -8, board: -6, team: -4 }, 'Szatnia uważa, że gwiazdy mają u Ciebie fory.'), ou(c => trt(c.p, 'loy') >= 13 ? 2 : 0.5, { player: 10, press: -4, board: -3 }, 'Zawodnik przysiągł, że to ostatni raz – i wygląda na to, że mówi poważnie.')] }] },
  { id: 'lockerfight', cat: 'Szatnia', w: 3, ctx: () => { const l = uPlayers().filter(p => p.st.apps > 2); if (l.length < 2) return null; const p = pick(l); const q = pick(l.filter(x => x !== p)); return q ? { p, q } : null; },
    title: 'Kłótnia w szatni', text: [c => `${c.p.n} i ${c.q.n} pokłócili się na treningu. Doszło do przepychanek.`, c => `Po nieudanej akcji na treningu ${c.p.n} i ${c.q.n} rzucili się na siebie. Koledzy ledwo ich rozdzielili.`],
    choices: [{ t: c => `Stań po stronie: ${c.p.n}`, outs: [ou(2, { player: 6, player2: -14, team: -3 }, 'Jeden czuje się wygranym, drugi upokorzonym.'), ou(c => trt(c.q, 'pro') >= 13 ? 2 : 0.5, { player: 6, player2: -6 }, c => `${c.q.n} przyjął decyzję po męsku i wrócił do pracy.`)] },
      { t: c => `Stań po stronie: ${c.q.n}`, outs: [ou(2, { player: -14, player2: 6, team: -3 }, 'Jeden czuje się wygranym, drugi upokorzonym.'), ou(c => trt(c.p, 'pro') >= 13 ? 2 : 0.5, { player: -6, player2: 6 }, c => `${c.p.n} przyjął decyzję po męsku i wrócił do pracy.`)] },
      { t: 'Zebranie drużyny i kara dla obu', mem: 'strict', outs: [ou(3, { player: -5, player2: -5, team: 3, press: 1 }, 'Atmosfera się oczyściła.'), ob(c => (trt(c.p, 'tem') + trt(c.q, 'tem')) >= 28 ? 3 : 0.7, { player: -9, player2: -9, team: -4 }, 'Obaj uznali karę za niesprawiedliwą – konflikt się pogłębił.')] },
      { t: 'Nie wtrącaj się', mem: 'soft', outs: [ob(2, { team: -5, player: -2, player2: -2 }, 'Konflikt się tli…'), ou(c => (trt(c.p, 'pro') + trt(c.q, 'pro')) / 12, { team: 2, player: 1, player2: 1 }, 'Następnego dnia sami podali sobie ręce – szatnia doceniła, że pozwoliłeś im to załatwić po męsku.')] }] },
  { id: 'family', cat: 'Szatnia', w: 2, ctx: () => withP(),
    title: 'Sprawy rodzinne', text: [c => `${c.p.n} prosi o kilka dni wolnego – na świat przychodzi jego dziecko.`, c => `${c.p.n} zostanie ojcem lada dzień i prosi o wolne. Termin wypada tuż przed meczem.`],
    choices: [{ t: 'Oczywiście, rodzina najważniejsza', outs: [ou(3, { player: 12, team: 2, form: -3, fit: -6 }, 'Zawodnik jest Ci wdzięczny, ale opuści treningi.'), ou(1, { player: 14, team: 3 }, 'Wrócił szybciej, niż zakładano – szczęśliwy i pełen energii.')] },
      { t: 'Tylko jeden dzień', mem: 'strict', fx: { form: 2, board: 1 }, outs: [ou(2, { player: -7 }, 'Zawodnik jest rozczarowany, ale nie wypadnie z rytmu treningowego.'), ou(c => trt(c.p, 'pro') >= 13 ? 1.5 : 0.5, { player: -2, form: 2 }, 'Zawodnik zrozumiał – „mecz też jest ważny”.'), ob(c => trt(c.p, 'tem') >= 14 ? 2 : 0.5, { player: -14, team: -3 }, 'Szatnia uznała to za brak empatii – zawodnik nie odzywa się do Ciebie.')] }] },
  { id: 'crisisform', cat: 'Szatnia', w: 3, ctx: () => withP(p => p.form < 35 && p.st.apps > 3),
    title: 'Kryzys formy', text: [c => `${c.p.n} jest w dołku – ostatnie występy to jego najsłabsze mecze w karierze.`, c => `${c.p.n} wyraźnie stracił pewność siebie. Statystyki z ostatnich meczów są alarmujące.`],
    choices: [{ t: 'Odsuń go na chwilę od składu', outs: [ou(2, { form: 6, player: -5 }, 'Chwila oddechu.'), ob(c => trt(c.p, 'tem') >= 14 ? 1.5 : 0.5, { form: 2, player: -10 }, 'Zawodnik uznał to za degradację i zamknął się w sobie.')] },
      { t: 'Okaż wsparcie i zaufanie', hint: 'zależy od charakteru', outs: [ou(c => trt(c.p, 'pre') >= 12 ? 3 : 2, { player: 6, form: 3 }, 'Zawodnik czuje, że w niego wierzysz.'), ob(c => trt(c.p, 'pre') <= 8 ? 2 : 0.7, { player: 2, form: -4, team: -2 }, 'Presja go przygniotła – kolejny słaby mecz, a reszta zespołu pyta, dlaczego wciąż gra.')] },
      { t: 'Dodatkowe treningi indywidualne', outs: [ou(c => trt(c.p, 'pro') >= 12 ? 3 : 1.5, { form: 7, fit: -10, player: -2 }, 'Ciężka praca.'), ob(1, { form: 2, fit: -12, player: -5 }, 'Przetrenowany zawodnik ledwo stoi na nogach.')] }] },
  { id: 'captainask', cat: 'Szatnia', w: 2, ctx: () => S.captain == null && uPlayers().length > 11 ? { p: uPlayers().slice().sort((a, b) => (b.age + b.ovr / 2) - (a.age + a.ovr / 2))[0] } : null,
    title: 'Wybór kapitana', text: [c => `Drużyna nie ma kapitana. Kandydat starszyzny szatni: ${c.p.n}.`, c => `Szatnia czeka na decyzję w sprawie opaski. Najczęściej pada nazwisko: ${c.p.n}.`],
    choices: [{ t: 'Mianuj go kapitanem', outs: [ou(c => trt(c.p, 'pro') >= 12 ? 3 : 1.5, { captain: true, player: 10, team: 2 }, 'Opaska ma właściciela.'), ob(c => trt(c.p, 'pro') < 12 ? 1.5 : 0.4, { captain: true, player: 8, team: -2 }, 'Część szatni uważa, że opaska trafiła w niewłaściwe ręce.')] },
      { t: 'Wybiorę sam później (karta zawodnika)', fx: { team: -1 }, r: 'Decyzja odłożona – szatnia czeka.' }] },
  { id: 'leaderbench', cat: 'Szatnia', w: 3, ctx: () => { const l = squadLeaders().filter(p => p.pt < 0.3 && !p.inj); return l.length ? { p: l[0] } : null; }, title: 'Lider szatni na ławce', text: [c => `${c.p.n} – jeden z liderów szatni – coraz rzadziej gra. Część zespołu stoi za nim murem i atmosfera gęstnieje.`, c => `${c.p.n} siedzi na ławce, a jego koledzy coraz głośniej pytają dlaczego. To jeden z najważniejszych głosów w szatni.`],
    choices: [{ t: 'Przywróć go do składu', hint: 'obietnica gry', fx: { player: 8, team: 3, promise: true, samepos: -4 }, r: 'Szatnia odetchnęła – musisz teraz dać mu grać.' },
      { t: 'Wyjaśnij mu nową rolę – mentora', hint: 'zależy od charakteru', outs: [ou(c => trt(c.p, 'pro') >= 12 ? 3 : 1, { player: 3, team: 2 }, 'Przyjął nową rolę – młodzi garną się do niego.'), ob(c => trt(c.p, 'pro') < 12 ? 2 : 0.5, { player: -10, team: -4 }, '„Mentor? Ja chcę grać!” – rozmowa skończyła się źle.')] },
      { t: 'Decyzje sportowe są moje', fx: { player: -8, team: -5, board: 2 }, r: 'Autorytet zachowany, ale atmosfera siadła.', mem: 'strict' }] },
  { id: 'clique', cat: 'Szatnia', w: 3, ctx: () => { const g = squadCliques().find(g => avg(g.ps.map(p => p.mor)) < 45); return g ? { p: g.ps[0], nat: g.nat } : null; }, title: 'Grupa trzyma się z boku', text: c => `Zawodnicy z kraju ${NAT[c.p.nat] ? NAT[c.p.nat].name : c.p.nat} trzymają się razem i są coraz bardziej niezadowoleni. Ich nastroje udzielają się reszcie.`,
    choices: [{ t: 'Spotkanie z całą grupą', outs: [ou(3, c => { for (const p of squadCliques().find(g => g.nat === c.p.nat)?.ps || []) p.mor = clamp(p.mor + 8, 0, 100); return { team: 1 }; }, 'Wysłuchałeś ich – grupa poczuła się doceniona.'), ob(1, c => { for (const p of squadCliques().find(g => g.nat === c.p.nat)?.ps || []) p.mor = clamp(p.mor - 4, 0, 100); return { team: -2 }; }, 'Spotkanie zamieniło się w listę żądań.')] },
      { t: 'Wymieszaj pokoje i grupy treningowe', outs: [ou(2, { team: 3, player: -4 }, 'Na początku zgrzyty, ale zespół się integruje.'), ob(1, { team: -2, player: -6 }, 'Zawodnicy odebrali to jako karę – podziały jeszcze się pogłębiły.')] },
      { t: 'Zignoruj', outs: [ob(2, c => { for (const p of squadCliques().find(g => g.nat === c.p.nat)?.ps || []) p.mor = clamp(p.mor - 6, 0, 100); return { team: -2 }; }, 'Podziały w szatni się pogłębiają.'), ou(1, { team: 1, shp: 2 }, 'Dwa zwycięstwa i wspólna radość zrobiły swoje – grupa sama otworzyła się na resztę.')] }] },
  { id: 'bonding', cat: 'Szatnia', w: 2, ctx: () => ({}), title: 'Wyjazd integracyjny', text: ['Kapitan proponuje wspólny wyjazd integracyjny drużyny w przerwie między meczami.', 'Zawodnicy chcą zorganizować wspólny wyjazd – paintball, kolacja i nocleg za miastem.'],
    choices: [{ t: 'Zgoda – klub płaci', hint: 'drobne ryzyko', fn: () => ({ money: -evTv(0.8) }), outs: [ou(4, { team: 6 }, 'Atmosfera świetna.'), ou(1, { team: 8, shp: 3 }, 'Wrócili jak paczka przyjaciół – widać to na boisku.'), ob(c => 1 + (memv('soft') > memv('strict') + 2 ? 1 : 0), { team: 3, press: -5, board: -3 }, 'Zdjęcia z imprezy wyciekły do mediów.')] },
      { t: 'Zgoda, ale zawodnicy płacą sami', outs: [ou(2, { team: 3 }, 'Pojechali – skromniej, ale w dobrych humorach.'), ou(1, { team: -1 }, 'Połowa się wykręciła, wyjazd nie wypalił.')] },
      { t: 'Nie teraz', fx: { team: -2, teamFit: 3 }, r: 'Zawodnicy są trochę zawiedzeni, ale przynajmniej odpoczną.' }] },
  { id: 'position', cat: 'Szatnia', w: 2, ctx: () => withP(p => p.alt && p.alt.length && p.st.apps > 2), title: 'Chcę grać gdzie indziej', text: c => `${c.p.n} uważa, że lepiej sprawdzi się jako ${posName(c.p.alt[0])}, a nie jako ${posName(c.p.pos)}.`,
    choices: [{ t: 'Spróbujmy', hint: 'nowa pozycja w karcie', fn: c => { const old = c.p.pos; c.p.pos = c.p.alt[0]; c.p.alt = [old, ...c.p.alt.slice(1)]; c.p.ovr = calcOvr(c.p.pos, c.p.a); return {}; }, outs: [ou(3, { player: 8 }, 'Zawodnik przechodzi na nową pozycję.'), ou(1, { player: 4, form: -5 }, 'Pierwsze treningi na nowej pozycji wypadły blado, ale zawodnik jest zadowolony.')] },
      { t: 'Zostajesz na swojej pozycji', outs: [ou(2, { player: -6 }, 'Zawodnik nie jest przekonany.'), ou(c => trt(c.p, 'pro') >= 13 ? 2 : 0.5, { player: -1, form: 2 }, 'Przyjął to spokojnie – „trener wie lepiej”.')] }] },
  { id: 'veteran', cat: 'Szatnia', w: 2, ctx: () => withP(p => p.age >= 33), title: 'Weteran myśli o emeryturze', text: [c => `${c.p.n} (${c.p.age} l.) zastanawia się, czy to nie czas zakończyć karierę.`, c => `${c.p.n} przyznał w wywiadzie, że coraz częściej myśli o sportowej emeryturze. Ma ${c.p.age} lat.`],
    choices: [{ t: 'Przekonaj go do jeszcze jednego sezonu', outs: [ou(c => 2 + (trt(c.p, 'loy') >= 12 ? 1 : 0), c => { c.p.con = Math.max(c.p.con, 2); return { player: 8, wage: 0.1 }; }, 'Zostaje – szatnia ceni jego doświadczenie.'), ou(1, { player: 3 }, '„Dziękuję, trenerze, ale decyzja zapadła” – to jego ostatni sezon.')] },
      { t: 'Zaproponuj mecz pożegnalny', fn: () => ({ money: -evTv(0.4) }), outs: [ou(2, { fans: 7, press: 3, player: 5, form: -4 }, 'Piękne pożegnanie na koniec sezonu – choć myślami jest już na emeryturze.'), ou(1, { fans: 6, press: 2, player: 6 }, 'Zawodnik wzruszony – obiecał, że do końca sezonu da z siebie wszystko.')] },
      { t: 'Nie wtrącaj się', outs: [ou(2, { player: -3 }, 'Sam podejmie decyzję.'), ou(1, { player: 3, form: 2 }, '„Sam zdecyduję, kiedy skończyć” – i postanowił grać dalej.')] }] },
  { id: 'n_hazing', cat: 'Szatnia', w: 2, ctx: () => { const p = randPlayer(p => p.age <= 20), q = randPlayer(q => q.age >= 29); return p && q ? { p, q } : null; }, title: 'Otrzęsiny wymknęły się spod kontroli',
    text: [c => `Starsi zawodnicy przesadzili z „otrzęsinami”: ${c.p.n} trafił na ośmieszające nagranie, a za pomysłem stał podobno ${c.q.n}.`, c => `W sieci krąży filmik, na którym ${c.p.n} musi śpiewać w samej bieliźnie w autokarze. Pomysłodawca? Podobno ${c.q.n}.`],
    choices: [{ t: c => `Ukarz pomysłodawcę (${c.q.n})`, mem: 'strict', outs: [ou(2, { player: 4, player2: -10, team: -1 }, 'Młodzi odetchnęli, starszyzna kręci nosem.'), ob(c => trt(c.q, 'tem') >= 14 ? 2 : 0.5, { player: 2, player2: -14, team: -5 }, 'Weteran poczuł się upokorzony i zbuntował część starszyzny.')] },
      { t: 'Zbagatelizuj – „taka tradycja”', mem: 'soft', outs: [ou(2, { player: -8, team: 2 }, 'Starszyzna zadowolona, młody zawodnik – mniej.'), ob(c => trt(c.p, 'pre') <= 8 ? 2 : 0.5, { player: -14, form: -5 }, 'Młody zawodnik zamknął się w sobie, a media piszą o „przemocy w szatni”.')] },
      { t: 'Rozmowa z oboma w cztery oczy', outs: [ou(2, { player: 3, player2: -2, team: 1 }, 'Weteran przeprosił, sprawa zamknięta.'), ou(1, { player: -2, player2: -4 }, 'Obaj uznali, że robisz z igły widły.')] }] },
  { id: 'n_captainspeech', cat: 'Szatnia', w: 3, ctx: () => { const c = S.captain != null ? pget(S.captain) : null; return lastLoss() && c && c.tid === S.user ? { p: c } : null; }, title: 'Kapitan chce przemówić',
    text: [c => `${c.p.n}, kapitan zespołu, prosi o zebranie drużyny bez sztabu – chce „powiedzieć kilka rzeczy prosto z mostu”.`, c => `Po porażce kapitan zespołu (${c.p.n}) chce porozmawiać z kolegami sam, bez trenerów.`],
    choices: [{ t: 'Zgoda – to jego szatnia', hint: 'wszystko zależy od kapitana', outs: [ou(c => 1 + (trt(c.p, 'pro') + trt(c.p, 'pre')) / 10, { team: 6, player: 3 }, 'Kapitan wziął drużynę za twarz – zawodnicy wyszli z zebrania z błyskiem w oku.'), ob(c => trt(c.p, 'tem') >= 13 ? 2.5 : 0.7, { team: -5 }, 'Zebranie zamieniło się w awanturę – padły słowa, których nie da się cofnąć.'), ou(1.5, { team: 2 }, 'Rozmowa była szczera, ale bez przełomu.')] },
      { t: 'Tak, ale będę obecny', outs: [ou(2, { team: 2, player: -2 }, 'Kapitan mówił ostrożniej, niż chciał.'), ou(1, { team: 3 }, 'Twoja obecność nikomu nie przeszkadzała – dobra rozmowa.')] },
      { t: 'Odmów – to ja prowadzę drużynę', mem: 'strict', fx: { player: -6, team: -1, board: 1 }, r: 'Kapitan jest urażony.' }] },
  { id: 'n_bonus', cat: 'Szatnia', w: 2, ctx: () => { const o = evNextOpp(8); if (o && o.derby) return { x: { k: 'd', dn: o.derby } }; return inSeason() && evRow().P >= 12 && evRow().pos <= 3 ? { x: { k: 't' } } : null; }, title: 'Rada drużyny chce premii',
    text: c => evX(c).k === 'd' ? `Rada drużyny prosi o specjalną premię za zwycięstwo w meczu: ${evX(c).dn}.` : 'Drużyna jest w czołówce tabeli. Rada drużyny prosi o premię za zwycięstwo w najbliższym meczu – „żeby utrzymać koncentrację”.',
    choices: [{ t: 'Premia za zwycięstwo – płatna po meczu', hint: 'zapłacisz tylko za wygraną', fn: () => { S.winBonus = { amt: evTv(1), until: absDay() + 12 }; return {}; }, outs: [ou(2, { team: 4 }, 'Zawodnicy są zmotywowani – premia czeka na zwycięstwo.'), ou(1, { team: 2, board: -2 }, 'Premia przyznana, choć prezes skrzywił się na wydatek.')] },
      { t: 'Premia gwarantowana – za sam awans do składu', fn: () => ({ money: -evTv(0.8) }), outs: [ou(2, { team: 6, board: -2 }, 'Szatnia wniebowzięta.'), ob(1, { team: 3, board: -4 }, 'Prezes uznał to za rozrzutność, a zawodnicy chyba już myślą o zakupach.')] },
      { t: 'Odmów – grają za pensję', outs: [ob(c => 3 - sqT('pro') / 10, { team: -5, board: 2 }, 'Zawodnicy są rozczarowani.'), ou(c => sqT('pro') / 6, { team: -1, board: 2 }, '„Rozumiemy, trenerze” – profesjonaliści nie robią z tego problemu.')] }] },
  { id: 'n_rivalry', cat: 'Szatnia', w: 2, ctx: () => { const l = uPlayers().filter(p => p.st.apps > 3 && !p.inj); for (const p of shuffle(l.slice())) { const q = l.find(q => q !== p && q.pos === p.pos && Math.abs(q.ovr - p.ovr) <= 3); if (q) return { p, q }; } return null; }, title: 'Dwóch na jedno miejsce',
    text: [c => `${c.p.n} i ${c.q.n} walczą o jedno miejsce w składzie. Obaj przyszli do Ciebie z pretensjami.`, c => `Rywalizacja na pozycji: ${posName(c.p.pos)}. ${c.p.n} i ${c.q.n} zaczynają się nawzajem unikać na treningach.`],
    choices: [{ t: c => `Postaw na: ${c.p.n}`, outs: [ou(c => trt(c.q, 'pro') >= 13 ? 2.5 : 1, { player: 6, player2: -4 }, 'Decyzja przyjęta po męsku.'), ob(c => trt(c.q, 'tem') >= 13 ? 2.5 : 1, { player: 6, player2: -12, team: -2 }, 'Odsunięty zawodnik nie kryje frustracji.')] },
      { t: c => `Postaw na: ${c.q.n}`, outs: [ou(c => trt(c.p, 'pro') >= 13 ? 2.5 : 1, { player: -4, player2: 6 }, 'Decyzja przyjęta po męsku.'), ob(c => trt(c.p, 'tem') >= 13 ? 2.5 : 1, { player: -12, player2: 6, team: -2 }, 'Odsunięty zawodnik nie kryje frustracji.')] },
      { t: 'Rotacja – obaj będą grać', outs: [ou(2, { player: 2, player2: 2 }, 'Obaj przyjęli rotację.'), ob(c => (trt(c.p, 'amb') + trt(c.q, 'amb')) / 12, { player: -5, player2: -5 }, 'Żaden nie jest zadowolony – obaj chcieli grać zawsze.')] }] },
  { id: 'n_tantrum', cat: 'Szatnia', w: 3, ctx: () => recentM() ? withP(p => traits(p).tem >= 13 && p.st.apps > 2) : null, title: 'Wybuch przy zmianie',
    text: [c => `${c.p.n} po zejściu z boiska kopnął butelkę z wodą i nie podał Ci ręki. Kamery wszystko nagrały.`, c => `Przy zmianie ${c.p.n} rzucił koszulką o ławkę. Nagranie ma już tysiące wyświetleń.`],
    choices: [{ t: 'Publiczna reprymenda', mem: 'strict', outs: [ou(2, { player: -10, press: 3, team: 2, crit: true }, 'Jasny sygnał: emocje nie usprawiedliwiają braku szacunku.'), ob(c => trt(c.p, 'tem') >= 16 ? 2 : 0.7, { player: -16, team: -2, crit: true }, 'Zawodnik odpowiedział Ci w wywiadzie – konflikt na całego.'), ou(1, { player: -4, form: 4, crit: true }, 'Zawodnik przeprosił na treningu przy całej drużynie.')] },
      { t: 'Rozmowa w cztery oczy', outs: [ou(2, { player: 3, press: -1 }, 'Wyjaśniliście sobie wszystko po cichu.'), ob(1, { player: -3, press: -3 }, 'Zawodnik zbagatelizował sprawę, a media pytają, czy masz autorytet.')] },
      { t: '„Tak reaguje zwycięzca”', mem: 'soft', outs: [ou(2, { player: 6, press: -3, team: -2 }, 'Zawodnik zadowolony, część szatni marszczy brwi.'), ob(1, { player: 5, press: -5, board: -2 }, 'Media: „trener pobłaża gwiazdom”.')] }] },
  { id: 'n_grudge', cat: 'Szatnia', w: 3, ctx: () => withP(p => since(p._crit) < 120 && p.mor < 55), title: 'Zawodnik pamięta',
    text: [c => `${c.p.n} wciąż pamięta Twoją publiczną krytykę. W lokalnej telewizji rzucił: „Trener woli rozmawiać przez media niż ze mną”.`, c => `${c.p.n} nie zapomniał, jak skrytykowałeś go przy wszystkich. Koledzy mówią, że od tamtej pory gra „na pół gwizdka”.`],
    choices: [{ t: 'Przeproś go publicznie', mem: { soft: 1, crit: -1 }, fn: c => { c.p._crit = null; return {}; }, outs: [ou(3, { player: 10, press: -1 }, 'Gest docenił – lody przełamane.'), ou(1, { player: 6, team: -2, press: -2 }, 'Zawodnik przyjął przeprosiny, ale część szatni uważa, że się ugiąłeś.')] },
      { t: 'Rozmowa w cztery oczy', hint: 'zależy od charakteru', outs: [ou(c => trt(c.p, 'pro') >= 12 ? 3 : 1.5, c => { c.p._crit = null; return { player: 7 }; }, 'Wyjaśniliście sobie wszystko. Temat zamknięty.'), ob(c => trt(c.p, 'tem') >= 13 ? 2 : 1, { player: -4 }, '„Słowa w mediach bolą bardziej” – rozmowa nic nie dała.')] },
      { t: 'Ukarz go za wywiad', mem: 'strict', outs: [ou(2, { player: -10, team: 1, press: 2, crit: true }, 'Konsekwentnie – ale ten konflikt już się nie skończy.', { follow: ['f_transferreq', 15, 40, 0.4] }), ob(1, { player: -14, team: -3, crit: true }, 'Szatnia stanęła po stronie kolegi.')] }] },

  /* ===================== ZARZĄD ===================== */
  { id: 'ticketprice', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Ceny biletów', text: [() => `Prezes chce podnieść ceny biletów o 15%, by poprawić finanse klubu.${chairNote()}`, () => `Dział finansów naciska: ceny biletów w górę o 15%. Prezes oczekuje Twojego poparcia.${chairNote()}`],
    choices: [{ t: 'Popieram – klub potrzebuje pieniędzy', mem: ['boardY', 'spons'], outs: [ou(3, () => ({ price: 0.15, fans: fanHit(-9), board: 4 }), 'Wpływy wzrosną, ale kibice są oburzeni.'), ob(c => 0.5 + memv('spons') * 0.5, () => ({ price: 0.15, fans: fanHit(-13), board: 3 }), 'Kibice zapowiadają bojkot karnetów – „trener i zarząd grają do jednej bramki”.')] },
      { t: 'Tylko trybuna VIP', outs: [ou(3, { price: 0.05, fans: -2, board: 1 }, 'Kompromis przyjęty.'), ou(1, { price: 0.07, board: 3 }, 'Loże VIP wyprzedały się na pniu – prezes zadowolony.'), ob(1, { price: 0.03, fans: -1, board: -2 }, 'Prezes uznał to za półśrodek.')] },
      { t: 'Sprzeciw się', mem: ['fanside', 'boardN'], outs: [ou(3, { fans: 6, board: -5 }, 'Kibice Cię kochają, prezes – mniej.'), ou(1, { fans: 4, board: -2 }, 'Prezes ustąpił, ale zapowiedział, że wróci do tematu.'), ob(c => memv('boardN') >= 2 ? 2 : 0.3, { fans: 5, board: -9 }, 'Prezes: „Znowu Pan jest przeciw. Zaczynam to zauważać”.')] }] },
  { id: 'chairmanassist', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Asystent z polecenia', text: [() => `Prezes chce zatrudnić swojego znajomego jako Twojego asystenta.${chairNote()}`, () => `Prezes „poleca” Ci nowego asystenta – syna swojego wspólnika.${chairNote()}`],
    choices: [{ t: 'Zgódź się', mem: 'boardY', outs: [ou(3, { board: 7, team: -2 }, 'Prezes zadowolony, ale nowy asystent niewiele wnosi.'), ou(1, { board: 6, team: 1, mgr: 0.2 }, 'Asystent okazał się świetnym analitykiem!'), ob(1, { board: 5, team: -4, press: -2 }, 'Asystent donosi prezesowi o wszystkim, co dzieje się w szatni.')] },
      { t: 'Odmów grzecznie', mem: 'boardN', outs: [ou(3, { board: -6, mgr: 0.3 }, 'Zachowujesz niezależność.'), ob(c => 1 + memv('boardN') * 0.7, { board: -10 }, 'Prezes: „To już kolejny raz, gdy mi Pan odmawia”.'), ou(1, { board: -2, mgr: 0.3 }, 'Prezes przyjął odmowę z uśmiechem – docenił szczerość.')] }] },
  { id: 'investor', cat: 'Zarząd', w: 1, ctx: () => ({}), title: 'Nowy inwestor', text: ['Inwestor chce kupić udziały w klubie i dorzucić pieniędzy na transfery – w zamian za wpływ na decyzje.', 'Fundusz inwestycyjny proponuje wejście do klubu: więcej pieniędzy na transfery, ale miejsce w radzie nadzorczej.'],
    choices: [{ t: 'Rekomenduj przyjęcie oferty', mem: 'boardY', outs: [ou(3, () => ({ tb: Math.round(Math.max(5e5, userClub().tb * 0.4) / 1e5) * 1e5, board: -3, fans: -2 }), 'Budżet rośnie, ale inwestor będzie chciał mieć zdanie.', { follow: ['f_investor', 25, 60, 0.7] }), ou(1, () => ({ tb: Math.round(Math.max(6e5, userClub().tb * 0.5) / 1e5) * 1e5, board: 2 }), 'Inwestor okazał się cichym wspólnikiem – nie wtrąca się.')] },
      { t: 'Odradź', outs: [ou(2, { board: 1, fans: 3 }, 'Klub pozostaje w rękach dotychczasowych właścicieli.'), ou(1, { board: -3, fans: 4 }, 'Część zarządu była za – w gabinetach zrobiło się chłodno.')] }] },
  { id: 'f_investor', cat: 'Zarząd', follow: true, title: 'Inwestor żąda sprzedaży', text: () => { const s = starPlayer(); return s ? `Inwestor żąda sprzedaży najlepszego zawodnika – ${s.n} ma „odzyskać zainwestowane pieniądze”.` : 'Inwestor żąda sprzedaży najlepszego zawodnika – „trzeba odzyskać pieniądze”.'; },
    ctxFn: () => ({ p: starPlayer() }),
    choices: [{ t: 'Ulegnij – wystaw gwiazdę', fx: { list: true, board: 6, fans: -8, team: -4 }, r: 'Kibice wściekli, inwestor zadowolony.', mem: 'boardY' },
      { t: 'Postaw się', mem: 'boardN', outs: [ou(2, { board: -9, fans: 5, team: 3 }, 'Wywalczyłeś swoje – ale zarząd to zapamięta.'), ou(1, { board: -4, fans: 6, team: 3 }, 'Inwestor wycofał się z żądań – na razie.')] }] },
  { id: 'boardpressure', cat: 'Zarząd', w: 3, ctx: () => S.board.conf < 40 ? {} : null, title: 'Zarząd naciska', text: [() => `Prezes wzywa Cię na rozmowę – wyniki są poniżej oczekiwań.${chairNote()}`, () => `Pilne spotkanie w gabinecie prezesa. Na stole leży tabela ligowa.${chairNote()}`],
    choices: [{ t: 'Przedstaw plan naprawczy', hint: 'zarząd może nie uwierzyć', outs: [ou(c => 3 + memv('honest') * 0.3, { board: 6 }, 'Zarząd daje Ci jeszcze trochę czasu.'), ob(c => 1 + (S.mem.liar >= 2 ? 2 : 0) + (memv('boardN') >= 2 ? 1 : 0), { board: -3 }, c => S.mem.liar >= 2 ? '„Słyszeliśmy to już wcześniej – a obietnic Pan nie dotrzymuje” – prezes nie dał się przekonać.' : '„Słyszeliśmy to już wcześniej” – prezes nie dał się przekonać.')] },
      { t: 'Poproś o wzmocnienia', outs: [ou(c => 2 + memv('boardY') * 0.3, () => ({ tb: evTv(4), board: -2 }), 'Prezes niechętnie otworzył portfel.'), ob(3, { board: -5 }, 'Rozmowa była napięta – „najpierw wyniki, potem pieniądze”.')] },
      { t: 'Weź winę na siebie', fx: { board: 3, team: 4, mgr: -0.3 }, r: 'Szatnia docenia, że ich osłaniasz.' }] },
  { id: 'budgetcut', cat: 'Zarząd', w: 2, ctx: () => userClub().bal < userClub().tv * 10 ? {} : null, title: 'Cięcia budżetowe', text: ['Zarząd zapowiada cięcie budżetu transferowego o 30% z powodu sytuacji finansowej.', 'Księgowi biją na alarm: zarząd chce obciąć budżet transferowy o 30%.'],
    choices: [{ t: 'Zaakceptuj', fn: () => ({ tb: -Math.round(Math.max(0, userClub().tb) * 0.3), board: 4 }), r: 'Zarząd docenia zrozumienie.', mem: 'boardY' },
      { t: 'Walcz o pieniądze', hint: 'może się nie udać', mem: 'boardN', outs: [ou(c => S.board.conf >= 50 ? 3 : 1.5, { board: -2 }, 'Udało się obronić budżet.'), ob(c => S.board.conf < 50 ? 2 : 1, () => ({ tb: -Math.round(Math.max(0, userClub().tb) * 0.4), board: -5 }), 'Prezes się zdenerwował – cięcie jest jeszcze większe.')] },
      { t: 'Zaproponuj cięcie pensji sztabu', outs: [ou(2, () => ({ tb: -Math.round(Math.max(0, userClub().tb) * 0.15), board: 3, team: -1 }), 'Kompromis: mniejsze cięcie, sztab zacisnął pasa.'), ob(1, () => ({ tb: -Math.round(Math.max(0, userClub().tb) * 0.3), board: 1, team: -2 }), 'Zarząd przyjął propozycję – i i tak obciął budżet.')] }] },
  { id: 'n_ambition', cat: 'Zarząd', w: 2, ctx: () => inSeason() && evRow().P >= 10 && evRow().pos <= S.board.target - 3 ? {} : null, title: 'Prezes chce więcej',
    text: [() => `Prezes jest zachwycony wynikami i chce publicznie ogłosić, że klub gra o więcej, niż zakładał plan.${chairNote()}`, () => `Drużyna jest wyraźnie powyżej oczekiwań. Prezes chce na konferencji „podnieść poprzeczkę”.${chairNote()}`],
    choices: [{ t: 'Zgoda – gramy o więcej', mem: 'boardY', outs: [ou(2, { board: 6, fans: 4, team: 2 }, 'Kibice podchwycili hasło, zarząd zadowolony.'), ob(1, { board: 4, fans: 3, team: -4 }, 'Zawodnicy poczuli presję – na treningach widać nerwowość.')] },
      { t: 'Studź emocje – cel się nie zmienia', outs: [ou(2, { board: -3, team: 3 }, 'Zawodnicy grają na luzie, prezes jest trochę zawiedziony.'), ou(1, { board: 1, team: 2 }, 'Prezes przyznał Ci rację.')] },
      { t: 'Ogłoście – ale poproszę o wzmocnienia', outs: [ou(2, () => ({ tb: evTv(3), board: -1 }), 'Prezes otworzył portfel.'), ou(1, () => ({ tb: evTv(1.5), board: 2 }), 'Prezes dorzucił skromną kwotę – „na dobry początek”.'), ob(2, { board: -4 }, 'Prezes uznał to za szantaż.')] }] },
  { id: 'n_chairpick', cat: 'Zarząd', w: 2, ctx: () => withP(p => p.pt < 0.3 && !p.inj && p.age <= 26 && p.ovr >= teamLevel(userClub()) - 7 && !S.promises.some(x => x.pid === p.id)), title: 'Prezes ma swojego faworyta',
    text: [c => `Prezes przy kolacji „sugeruje”, że ${c.p.n} powinien częściej grać – to syn jego dobrego znajomego.${chairNote()}`, c => `„Ten chłopak ma talent” – prezes nie pierwszy raz wspomina, że ${c.p.n} zasługuje na więcej minut.${chairNote()}`],
    choices: [{ t: 'Obiecaj, że dostanie szansę', hint: 'obietnica do dotrzymania', mem: 'boardY', outs: [ou(3, { board: 6, player: 8, promise: true, samepos: -3 }, 'Prezes zadowolony. Teraz musisz dotrzymać słowa.'), ob(1, { board: 6, player: 8, promise: true, team: -3 }, 'W szatni szybko rozeszło się, skąd ta nagła szansa.')] },
      { t: 'Decyzje kadrowe podejmuję ja', mem: 'boardN', fx: { team: 2 }, outs: [ou(3, { board: -5 }, 'Prezes zmilczał, ale zapamiętał. Szatnia docenia, że skład ustala trener.'), ob(c => 1 + memv('boardN') * 0.8, { board: -9 }, 'Prezes chłodno przypomina, że to już nie pierwszy raz.'), ou(1, { board: 1, mgr: 0.2 }, 'Prezes wycofał się – i chyba nawet docenił Twoją niezależność.')] },
      { t: 'Niech pokaże się na treningach', outs: [ou(2, { player: 4, board: 2 }, 'Zawodnik dostał sygnał, prezes – odpowiedź dyplomatyczną.'), ob(1.5, { player: -4, board: -3 }, 'Zawodnik uznał to za zbycie, prezes też.')] }] },
  { id: 'n_boardrecall', cat: 'Zarząd', w: 3, ctx: () => memv('boardN') >= 2 && S.board.conf < 60 ? {} : null, title: 'Prezes wraca do sprawy',
    text: [() => `Prezes wzywa Cię do gabinetu: „Odmówił mi Pan już ${plural(Math.round(memv('boardN')), 'raz', 'razy', 'razy')}. Zaczynam się zastanawiać, czy mamy wspólną wizję klubu”.`, () => 'Prezes w rozmowie z dziennikarzami: „Trener ma swoje zdanie. Czasem za bardzo”. Chwilę później dzwoni do Ciebie z zaproszeniem na rozmowę.'],
    choices: [{ t: 'Przeproś i obiecaj lepszą współpracę', mem: { boardN: -1, boardY: 1 }, outs: [ou(3, { board: 6, team: -1 }, 'Prezes przyjął gałązkę oliwną, choć w szatni szepczą, że trener się ugiął.'), ou(1, { board: 2 }, 'Prezes słucha, ale nie wierzy.')] },
      { t: 'Broń swojej niezależności', outs: [ou(2, { board: -4, press: 2, team: 2 }, 'Szatnia wie, że stoisz za nią murem.'), ob(c => 1 + (S.board.conf < 40 ? 2 : 0), { board: -8 }, 'Prezes zapowiada, że przy następnej wpadce wyciągnie konsekwencje.'), ou(c => evRow().pos <= S.board.target ? 2 : 0.3, { board: 3 }, 'Prezes zmiękł: „Wyniki bronią Pana”.')] },
      { t: 'Zaproponuj cotygodniowe spotkania', mem: { boardN: -0.5 }, outs: [ou(2, { board: 5 }, 'Prezes docenił gest.'), ob(1, { board: 2, team: -2 }, 'Prezes zaczął wtrącać się w skład. Cóż…')] }] },
  { id: 'n_relegation', cat: 'Zarząd', w: 3, ctx: () => inSeason() && evRow().P >= 10 && evRow().pos > evTeams() - 3 ? {} : null, title: 'Strefa spadkowa',
    text: ['Drużyna jest w strefie spadkowej. Prezes zwołuje nadzwyczajne zebranie i pyta, co zamierzasz.', 'Strefa spadkowa. Zarząd chce „wstrząsu” – pyta, czy potrzebujesz psychologa, obozu albo nowych twarzy.'],
    choices: [{ t: 'Zatrudnij psychologa sportowego', fn: () => ({ money: -evTv(0.5) }), outs: [ou(2, { team: 4, board: 2 }, 'Zawodnicy otworzyli się podczas sesji.'), ob(1, { team: -2 }, 'Część zawodników wyśmiewa sesje.'), ou(1, { team: 6, board: 2 }, 'Przełom! Drużyna znów wierzy w siebie.')] },
      { t: 'Tydzień zamkniętego zgrupowania', outs: [ou(2, { teamFit: -3, shp: 5, team: -1, board: 2 }, 'Ciężki tydzień, ale zespół się zgrał.'), ob(c => sqT('tem') >= 11 ? 2 : 1, { teamFit: -4, team: -5 }, 'Zawodnicy mają dość – „to więzienie, nie zgrupowanie”.')] },
      { t: '„Nie panikujmy”', outs: [ou(2, { board: -4, team: 3 }, 'Zawodnicy odetchnęli, zarząd się niecierpliwi.'), ou(1, { board: -1, team: 2, press: 2 }, 'Spokój udzielił się nawet dziennikarzom.')] }] },

  /* ===================== SPONSORZY ===================== */
  { id: 'sponsorkit', cat: 'Sponsorzy', w: 2, ctx: () => ({}), title: 'Kontrowersyjny sponsor',
    text: [() => `Firma bukmacherska oferuje ${money(evSp(20))} za umowę koszulkową – w zamian chce ogromnego logo i zmiany barw klubowych.${spHist()}`, () => `Bukmacher chce zostać sponsorem strategicznym: ${money(evSp(20))}, ale z nowymi barwami koszulek i wielkim logo na piersi.${spHist()}`],
    choices: [{ t: 'Podpisz umowę na warunkach sponsora', hint: 'kibice mogą się zbuntować', mem: 'spons', outs: [
        ou(3, () => ({ cash: evSp(20), spons: 0.06, fans: fanHit(-7), press: -2 }), 'Kasa się zgadza, tradycjonaliści protestują.', { follow: ['f_boycott', 15, 35, 0.4] }),
        ou(1, () => ({ cash: evSp(20), spons: 0.06, fans: fanHit(-3) }), 'Ku zaskoczeniu wszystkich nowe koszulki sprzedają się świetnie.'),
        ob(c => 0.5 + memv('spons') * 0.7, () => ({ cash: evSp(20), spons: 0.06, fans: fanHit(-12), press: -4 }), 'Kibice: „kolejny raz pieniądze wygrały z tradycją”. Na trybunach pojawiły się transparenty przeciwko sponsorowi.', { follow: ['f_boycott', 10, 25, 0.8] })] },
      { t: 'Negocjuj: logo tak, zmiana barw – nie', hint: 'sponsor może przyjąć, wrócić z kontrofertą albo się wycofać', outs: [
        ou(c => 3 + (userClub().rep >= 60 ? 1 : 0), () => ({ cash: evSp(9), fans: 1 }), 'Sponsor przyjął warunki – mniejsze pieniądze, tradycja zachowana.'),
        ou(3, c => { c.x = { amt: evSp(14), n: 1 }; return {}; }, c => `Sponsor nie mówi „nie” – przysłał kontrofertę na ${money(evX(c).amt)}.`, { follow: ['f_sponscounter', 0, 0, 1] }),
        ob(c => 2.5 + (userClub().rep < 45 ? 1 : 0) + (memv('fanside') >= 3 ? 0.5 : 0), { board: -3 }, c => memv('fanside') >= 3 ? 'Sponsor wycofał się: „Wasz trener zawsze słucha kibiców, nie partnerów”. Prezes pyta, po co było negocjować.' : 'Sponsor wycofał się z rozmów. Prezes pyta, po co było negocjować.')] },
      { t: 'Odrzuć ofertę', mem: 'fanside', outs: [ou(3, { fans: 5, board: -4 }, 'Kibice doceniają szacunek do historii klubu.'), ob(1, { fans: 6, board: -7, press: 2 }, 'Bukmacher szybko podpisał umowę z ligowym rywalem. Prezes jest wściekły.')] }] },
  { id: 'f_sponscounter', cat: 'Sponsorzy', follow: true, title: 'Kontroferta sponsora',
    text: c => { const x = evX(c), a = money(x.amt || evSp(14)); return (x.n || 1) >= 2 ? `Sponsor wraca po raz kolejny: ${a} – „to nasza ostateczna propozycja”. Barwy bez zmian, logo duże.` : pick([`Sponsor odpowiada kontrofertą: ${a}, barwy bez zmian, ale logo na piersi i rękawach – większe, niż chcieliby kibice.`, `Nowa propozycja sponsora: ${a}. Barwy zostają, za to logo ma się pojawić także na spodenkach i rozgrzewkowych bluzach.`]); },
    choices: [{ t: 'Przyjmij kontrofertę', mem: 'spons', outs: [ou(3, c => ({ cash: evX(c).amt || evSp(14), fans: fanHit(-3) }), 'Umowa podpisana. Kibice marudzą na wielkie logo, ale barwy zostały.'), ob(1, c => ({ cash: evX(c).amt || evSp(14), fans: fanHit(-6) }), 'Projekt nowej koszulki wyciekł wcześniej – w sieci burza.')] },
      { t: 'Targuj się dalej', hint: c => (evX(c).n || 1) >= 2 ? 'sponsor już raz ustąpił – cierpliwość się kończy' : 'sponsor może podbić stawkę albo zerwać rozmowy', outs: [
        ou(c => (evX(c).n || 1) >= 2 ? 0 : 2, c => { const x = evX(c); c.x = { amt: Math.round((x.amt || evSp(14)) * 1.2 / 1000) * 1000, n: (x.n || 1) + 1 }; return {}; }, c => `Sponsor podbija ofertę do ${money(evX(c).amt)}.`, { follow: ['f_sponscounter', 0, 0, 1] }),
        ou(c => (evX(c).n || 1) >= 2 ? 1.5 : 1, c => ({ cash: Math.round((evX(c).amt || evSp(14)) * 1.15 / 1000) * 1000, fans: fanHit(-2) }), 'Sponsor się ugiął – dorzucił 15% i od razu podpisał umowę.'),
        ob(c => (evX(c).n || 1) >= 2 ? 3 : 2, { board: -3 }, '„Szukamy partnera, nie licytacji” – sponsor zerwał rozmowy. Prezes ma Ci to za złe.')] },
      { t: 'Odrzuć – nie tak się umawialiśmy', mem: 'fanside', fx: { fans: 3, board: -2 }, r: 'Rozmowy zakończone. Kibice chwalą twardą postawę.' }] },
  { id: 'f_boycott', cat: 'Kibice', follow: true, title: 'Bojkot sklepu klubowego', text: ['Kibice bojkotują nowe koszulki ze sponsorem bukmacherskim. Sprzedaż leży.', 'Akcja „Nie kupuję” – kibice omijają sklep klubowy szerokim łukiem.'],
    choices: [{ t: 'Wypuść alternatywną koszulkę retro', fn: () => ({ money: -evTv(2) }), outs: [ou(3, { fans: 6 }, 'Retro koszulka to hit – choć produkcja kosztowała.'), ou(1, () => ({ fans: 6, cash: evTv(1.5) }), 'Retro koszulka sprzedała się tak dobrze, że zwróciła koszty z nawiązką.')] },
      { t: 'Przeczekaj', outs: [ob(2, { fans: -5 }, 'Bojkot powoli wygasa, ale niesmak pozostał.'), ou(1, { fans: -2 }, 'Po dwóch zwycięstwach nikt już nie pamięta o koszulkach.')] }] },
  { id: 'sponsorbonus', cat: 'Sponsorzy', w: 2, ctx: () => recentM() && lastRes(3).filter(r => r === 'W').length >= 2 && !S.sponsBet ? {} : null, title: 'Premia od sponsora', text: ['Główny sponsor proponuje wybór: stała premia teraz albo dużo wyższa premia za realizację celu na koniec sezonu.', 'Sponsor jest zadowolony z wyników i proponuje: pewny bonus od ręki lub zakład o wynik sezonu.'],
    choices: [{ t: 'Stała premia teraz', outs: [ou(3, () => ({ cash: evSp(5) }), 'Pewne pieniądze na koncie.'), ou(1, () => ({ cash: evSp(6) }), 'Sponsor dorzucił jeszcze bonus za frekwencję.')] },
      { t: 'Premia za wynik', hint: 'tylko jeśli zrealizujesz cel', fn: () => { S.sponsBet = { season: S.season, amount: evSp(14) }; return {}; }, r: 'Zakład przyjęty – rozliczenie na koniec sezonu.' },
      { t: 'Pół na pół', hint: 'mniejsza premia teraz, reszta za cel', fn: () => { S.sponsBet = { season: S.season, amount: evSp(6) }; return { cash: evSp(2.5) }; }, r: 'Część pieniędzy teraz, reszta – jeśli zrealizujesz cel.' }] },
  { id: 'n_naming', cat: 'Sponsorzy', w: 1, ctx: () => !S.mem.naming ? {} : null, title: 'Nazwa stadionu na sprzedaż',
    text: [() => `Firma ubezpieczeniowa chce wykupić prawa do nazwy stadionu: ${money(evSp(18))} za kilka lat.${spHist()}`, () => `Sieć marketów oferuje ${money(evSp(18))} za nazwanie stadionu swoim imieniem.${spHist()}`],
    choices: [{ t: 'Sprzedaj nazwę', hint: 'kibice mogą zaprotestować', mem: 'spons', fn: () => { S.mem.naming = 1; return { cash: evSp(18) }; }, outs: [ou(3, () => ({ fans: fanHit(-7) }), 'Umowa podpisana. Kibice są oburzeni.', { follow: ['f_namingprotest', 10, 25, 0.6] }), ou(1, () => ({ fans: fanHit(-3) }), 'Kibice i tak mówią po staremu – nowa nazwa przyjęła się tylko w mediach.')] },
      { t: 'Tylko jako dopisek do starej nazwy', hint: 'sponsor może się nie zgodzić', outs: [ou(2, () => { S.mem.naming = 1; return { cash: evSp(8), fans: -1 }; }, 'Kompromis: tradycyjna nazwa z dopiskiem sponsora.'), ou(1, () => { S.mem.naming = 1; return { cash: evSp(11), fans: fanHit(-3) }; }, 'Sponsor zgodził się na dopisek, ale z dużo większym logo przy wejściu.'), ob(2, { board: -2 }, 'Sponsor zrezygnował – chciał pełnej nazwy.')] },
      { t: 'Odrzuć ofertę', mem: 'fanside', fx: { fans: 4, board: -3 }, r: 'Stadion zachowuje swoją nazwę.' }] },
  { id: 'n_appearance', cat: 'Sponsorzy', w: 2, ctx: () => { const p = starPlayer(); return p && !p.inj && evNextOpp(4) ? { p } : null; }, title: 'Gala sponsora',
    text: [c => `Główny sponsor chce, by ${c.p.n} wystąpił na firmowej gali – dzień przed meczem.`, c => `Sponsor organizuje wieczór dla klientów i prosi, by gościem specjalnym był ${c.p.n}. Termin: wieczór przed meczem.`],
    choices: [{ t: 'Zgódź się', fn: () => ({ cash: evSp(2), spons: 0.02 }), outs: [ou(3, { fit: -6, player: -2 }, 'Sponsor zachwycony, zawodnik trochę zmęczony.'), ob(1, { fit: -8, form: -4 }, 'Gala skończyła się późno w nocy – zawodnik był bez energii.'), ou(1, { player: 3 }, 'Zawodnik świetnie się bawił i wrócił w znakomitym humorze.')] },
      { t: 'Wyślij zawodnika z ławki', outs: [ou(2, () => ({ cash: evSp(1) }), 'Sponsor przyjął zastępstwo.'), ob(1, { spons: -0.02 }, 'Sponsor nie krył rozczarowania – „płacimy za gwiazdy”.')] },
      { t: 'Odmów – mecz jest najważniejszy', fx: { player: 2 }, outs: [ou(2, { board: -2 }, 'Sponsor jest niezadowolony, prezes też – ale zawodnik odpocznie przed meczem.'), ou(1, { team: 1 }, 'Sponsor przyjął to ze zrozumieniem.')] }] },
  { id: 'n_energy', cat: 'Sponsorzy', w: 1, ctx: () => ({}), title: 'Napój energetyczny',
    text: ['Producent napojów energetycznych proponuje umowę i chce, by zawodnicy pili jego produkt przy linii bocznej. Lekarz klubowy kręci nosem.', 'Marka napojów energetycznych chce wejść do klubu: reklama na ławce rezerwowych i puszki w rękach zawodników.'],
    choices: [{ t: 'Podpisz pełną umowę', fn: () => ({ cash: evSp(6) }), outs: [ou(2, {}, 'Pieniądze wpłynęły, nikt nie narzeka.'), ob(1, { teamFit: -4, team: -1 }, 'Zawodnicy skarżą się na skurcze – dietetyk musiał interweniować.'), ob(1, { press: -4, fans: -2 }, 'Media: „klub promuje energetyki wśród dzieci”.')] },
      { t: 'Tylko reklama, bez picia na boisku', outs: [ou(2, () => ({ cash: evSp(3) }), 'Producent przyjął warunki.'), ou(1, {}, 'Producent odrzucił warunki – rozmowy zakończone.')] },
      { t: 'Odmów', fx: { press: 1, board: -1 }, r: 'Lekarz klubowy dziękuje.' }] },
  { id: 'n_sponsorscandal', cat: 'Sponsorzy', w: 1, ctx: () => ({}), title: 'Afera sponsora',
    text: ['Główny sponsor klubu jest bohaterem afery podatkowej. Dziennikarze pytają, czy klub zerwie współpracę.', 'Prezes głównego sponsora zatrzymany przez prokuraturę. Telefony w biurze prasowym nie milkną.'],
    choices: [{ t: 'Zerwij umowę', mem: 'fanside', outs: [ou(2, { spons: -0.1, press: 5, fans: 4, board: -4 }, 'Czyste ręce, mniejszy budżet.'), ou(1, { spons: -0.04, press: 5, fans: 4, board: -1 }, 'Szybko znalazł się nowy sponsor – na niewiele gorszych warunkach.')] },
      { t: 'Stań za sponsorem', mem: 'spons', outs: [ou(2, { press: -5, board: 2, spons: 0.03 }, 'Sponsor docenił lojalność i podniósł kwotę.'), ob(1, () => ({ press: -8, fans: fanHit(-5) }), 'Afera się rozrasta – klub ma problem wizerunkowy.')] },
      { t: 'Zawieś współpracę do wyjaśnienia sprawy', outs: [ou(2, { spons: -0.03, press: 2 }, 'Ostrożnie i rozsądnie.'), ou(1, { press: 3 }, 'Sprawa szybko się wyjaśniła – sponsor zostaje.')] }] },
  { id: 'n_tour', cat: 'Sponsorzy', w: 2, ctx: () => S.day < S.cal.length && !evNextOpp(11) && evRow().P >= 1 && evLeft() >= 4 ? {} : null, title: 'Turniej w Azji',
    text: [() => `Sponsor proponuje wyjazd na towarzyski turniej w Azji w trakcie przerwy w lidze: ${money(evSp(7))} dla klubu. Długi lot i zmiana stref czasowych.`, () => `Organizatorzy towarzyskiego turnieju na Bliskim Wschodzie oferują ${money(evSp(7))} za udział. Sztab medyczny ostrzega przed zmęczeniem.`],
    choices: [{ t: 'Lecimy', fn: () => ({ cash: evSp(7) }), outs: [ou(2, { teamFit: -10 }, 'Pieniądze się zgadzają, nogi – mniej.'), ou(1, { teamFit: -6, shp: 3, team: 2 }, 'Wyjazd okazał się świetną okazją do integracji.'), ob(1, c => Object.assign({ teamFit: -10 }, evHurt(c, 10, 25)), c => c.p ? `Twarde boisko i zmęczenie: urazu doznał ${c.p.n}.` : 'Twarde boisko i zmęczenie.')] },
      { t: 'Wyślij rezerwowych i juniorów', fn: () => ({ cash: evSp(3) }), outs: [ou(2, { teamFit: -2 }, 'Organizatorzy zgodzili się na okrojony skład.'), ob(1, () => ({ spons: -0.02, cash: -evSp(1) }), 'Organizatorzy obcięli honorarium – „obiecywano nam gwiazdy”.')] },
      { t: 'Odmów – czas na regenerację', fx: { teamFit: 3, board: -2 }, r: 'Zawodnicy odpoczną, sponsor jest rozczarowany.' }] },

  /* ===================== AKADEMIA ===================== */
  { id: 'youthshine', cat: 'Akademia', w: 2, ctx: () => { const y = S.acad.youth.slice().sort((a, b) => b.ovr - a.ovr)[0]; return y ? { p: y } : null; },
    title: 'Junior błyszczy', text: [c => `Trenerzy akademii są zachwyceni grą juniora: ${c.p.n} (${c.p.age} l.). Kibice dopytują, kiedy zadebiutuje.`, c => `${c.p.n} (${c.p.age} l.) strzela w lidze juniorów, jak chce. Dyrektor akademii pyta, czy nie czas na pierwszy zespół.`],
    choices: [{ t: 'Awansuj go do pierwszego zespołu', mem: 'acad', fn: c => { promoteYouth(c.p.id); return {}; }, outs: [ou(3, { fans: 5, press: 3 }, 'Wychowanek trenuje z pierwszą drużyną!'), ou(1, { fans: 4, team: -1 }, 'Wychowanek w pierwszym zespole – część starszyzny uważa, że za wcześnie.')] },
      { t: 'Daj mu jeszcze czas w akademii', hint: 'może się zniechęcić', outs: [ou(3, { player: -3 }, 'Rozsądnie – niech dojrzeje.'), ob(c => trt(c.p, 'amb') >= 14 ? 2.5 : 0.5, { player: -12 }, 'Ambitny junior poczuł się zlekceważony.')] }] },
  { id: 'poach', cat: 'Akademia', w: 3, ctx: () => { const y = S.acad.youth.filter(y => y.acad && y.acad.est >= 72).sort((a, b) => b.acad.est - a.acad.est)[0]; return y ? { p: y } : null; }, title: 'Podbieranie talentu', text: [c => `Duży klub próbuje podkupić z Twojej akademii największy talent – ${c.p.n} dostał propozycję, a jego rodzina ofertę wysokiej pensji.`, c => `Skauci bogatego klubu krążą wokół akademii. Na celowniku: ${c.p.n}.`],
    choices: [{ t: 'Daj mu profesjonalny kontrakt', mem: 'acad', fn: c => { promoteYouth(c.p.id); return { fans: 3 }; }, r: 'Talent zostaje i dołącza do pierwszego zespołu.' },
      { t: 'Zaoferuj premię rodzinie', fn: () => ({ money: -evTv(1.5) }), outs: [ou(c => trt(c.p, 'loy') >= 10 ? 3 : 1.5, {}, 'Rodzina przyjęła ofertę – na razie.'), ob(c => trt(c.p, 'loy') <= 7 ? 2 : 0.5, c => { releaseYouth(c.p.id); return { money: evTv(2), fans: -5 }; }, 'Mimo premii odszedł – klub dostał tylko odszkodowanie.')] },
      { t: 'Pozwól mu odejść za odszkodowanie', fn: c => { releaseYouth(c.p.id); return { money: evTv(3), fans: -6 }; }, r: 'Pieniądze się przydadzą, ale kibice są rozczarowani.' }] },
  { id: 'n_acadcoach', cat: 'Akademia', w: 1, ctx: () => S.acad.youth.length >= 3 ? {} : null, title: 'Dyrektor akademii ma ofertę',
    text: ['Dyrektor akademii dostał ofertę z dużego klubu. Zostanie, jeśli klub podniesie mu pensję.', 'Twój dyrektor akademii jest kuszony przez bogatszego rywala. Juniorzy pytają, czy odejdzie.'],
    choices: [{ t: 'Podnieś mu pensję', mem: 'acad', fn: () => ({ money: -evTv(2.5) }), outs: [ou(3, { yth: 4 }, 'Dyrektor zostaje – juniorzy odetchnęli.'), ob(1, { yth: -6 }, 'Mimo podwyżki odszedł – „to wyzwanie życia”.')] },
      { t: 'Zagraj na lojalność', outs: [ou(2, { yth: 2 }, 'Został – „tu jest mój dom”.'), ob(2, { yth: -6 }, 'Odszedł, a z nim kilku trenerów grup młodzieżowych.')] },
      { t: 'Pozwól mu odejść, awansuj asystenta', outs: [ou(2, { yth: -3 }, 'Zmiana warty w akademii.'), ou(1, { yth: 4 }, 'Asystent okazał się objawieniem – juniorzy go uwielbiają.')] }] },
  { id: 'n_acadparent', cat: 'Akademia', w: 2, ctx: () => { const y = pick(S.acad.youth.filter(y => y.acad && y.acad.est >= 64)); return y ? { p: y } : null; }, title: 'Ojciec juniora',
    text: [c => `Ojciec juniora (${c.p.n}) awanturuje się w biurze akademii: syn ma trenować z pierwszym zespołem albo przechodzi do konkurencji.`, c => `Rodzice obiecującego juniora – ${c.p.n} – stawiają ultimatum: awans do pierwszej drużyny albo zmiana klubu.`],
    choices: [{ t: 'Awansuj go', mem: 'acad', fn: c => { promoteYouth(c.p.id); return {}; }, outs: [ou(2, { fans: 2 }, 'Chłopak trenuje z pierwszym zespołem.'), ob(1, { team: -2 }, 'Starsi zawodnicy krzywo patrzą na protekcję.')] },
      { t: 'Postaw granicę – akademia decyduje', outs: [ou(c => trt(c.p, 'loy') >= 12 ? 3 : 1.5, { player: -4 }, 'Chłopak zostaje – sam nie chciał odchodzić.'), ob(c => trt(c.p, 'loy') < 9 ? 2 : 0.7, c => { releaseYouth(c.p.id); return { money: evTv(1.5), fans: -3 }; }, 'Ojciec spełnił groźbę – chłopak odszedł za symboliczne odszkodowanie.')] },
      { t: 'Rozmowa z udziałem dyrektora akademii', outs: [ou(2, { player: 3 }, 'Ustalono plan rozwoju – rodzina jest spokojniejsza.'), ou(1, { player: -2 }, 'Ojciec wyszedł niezadowolony, ale na razie nic nie zrobił.')] }] },
  { id: 'n_youthcup', cat: 'Akademia', w: 1, ctx: () => S.acad.youth.length >= 5 ? {} : null, title: 'Turniej juniorów',
    text: [() => `Akademia dostała zaproszenie na prestiżowy turniej juniorów za granicą. Wyjazd kosztuje ${money(evTv(1.5))}.`, () => `Międzynarodowy turniej młodzieżowy: zaproszenie dla akademii. Koszt wyjazdu: ${money(evTv(1.5))}.`],
    choices: [{ t: 'Jedziemy', mem: 'acad', fn: () => ({ money: -evTv(1.5) }), outs: [ou(2, { yth: 6, fans: 3, press: 3 }, 'Juniorzy dotarli do finału!'), ou(2, { yth: 2 }, 'Dobre doświadczenie, choć bez sukcesów.'), ob(1, { yth: -3, press: -2 }, 'Juniorzy przegrali wszystkie mecze – media kpią z akademii.')] },
      { t: 'Nie stać nas', fx: { yth: -3 }, r: 'Juniorzy są zawiedzeni.' }] },
  { id: 'n_partnerclub', cat: 'Akademia', w: 1, ctx: () => ({}), title: 'Szkółka partnerska',
    text: ['Okoliczny klub amatorski proponuje, by stał się szkółką partnerską Twojej akademii.', 'Kilka szkółek z regionu chce współpracować z akademią – w zamian za sprzęt i szkolenia trenerów.'],
    choices: [{ t: 'Podpisz porozumienie', mem: ['acad', 'csr'], fn: () => ({ money: -evTv(1.8) }), outs: [ou(2, { fans: 3, yth: 2 }, 'Współpraca ruszyła.'), ou(1, { fans: 4, yth: 4, press: 2 }, 'Pierwszy utalentowany chłopak z partnerskiej szkółki już trenuje w akademii.')] },
      { t: 'Odmów', fx: { fans: -1 }, r: 'Może kiedyś.' }] },

  /* ===================== MEDYCYNA ===================== */
  { id: 'trainingknock', cat: 'Medycyna', w: 3, ctx: () => withP(p => !p.inj && p.st.apps > 0),
    title: 'Uraz na treningu', text: [c => `${c.p.n} poczuł ból w udzie. Lekarz radzi tydzień odpoczynku, zawodnik chce grać.`, c => `${c.p.n} zszedł z treningu, trzymając się za łydkę. „To nic, zagram” – zapewnia.`],
    choices: [{ t: 'Posłuchaj lekarza', outs: [ou(3, { inj: 7, player: -3 }, 'Bezpiecznie.'), ou(1, { inj: 4, player: -1 }, 'Zawodnik wrócił szybciej, niż zakładano.'), ob(1, { inj: 12, player: -4 }, 'Badanie wykazało naderwanie – przerwa się wydłużyła.')] },
      { t: 'Niech gra na środkach przeciwbólowych', hint: 'ryzyko poważnej kontuzji', outs: [ou(c => 3 + (trt(c.p, 'pro') >= 13 ? 1 : 0), { player: 4 }, 'Zagrał – tym razem bez konsekwencji.'), ob(2, () => ({ inj: ri(21, 50), press: -4, fans: -2 }), 'Uraz się pogłębił – czeka go dłuższa przerwa.'), ob(1, { inj: 7, form: -4 }, 'Zagrał słabo, a po meczu i tak musiał odpocząć.')] }] },
  { id: 'injurycrisis', cat: 'Medycyna', w: 4, ctx: () => uPlayers().filter(p => p.inj).length >= 4 ? {} : null, title: 'Plaga kontuzji', text: [() => `W klubie jest ${plural(uPlayers().filter(p => p.inj).length, 'kontuzjowany zawodnik', 'kontuzjowanych zawodników', 'kontuzjowanych zawodników')}. Sztab medyczny alarmuje.`, () => `Gabinet fizjoterapii pęka w szwach – kontuzjowanych: ${uPlayers().filter(p => p.inj).length}. Media pytają o metody treningowe.`],
    choices: [{ t: 'Zatrudnij dodatkowego fizjoterapeutę', fn: () => ({ money: -evTv(2) }), outs: [ou(3, () => { for (const p of uPlayers()) if (p.inj) p.inj = Math.max(1, Math.round(p.inj * 0.7)); return {}; }, 'Rehabilitacja przyspieszyła.'), ou(1, () => { for (const p of uPlayers()) if (p.inj) p.inj = Math.max(1, Math.round(p.inj * 0.85)); return {}; }, 'Nowy fizjoterapeuta potrzebuje czasu – efekt jest skromny.')] },
      { t: 'Zmniejsz intensywność treningów', outs: [ou(2, { teamFit: 6, team: 1 }, 'Zawodnicy odpoczną – kosztem formy.'), ou(1, { teamFit: 4, shp: -3 }, 'Lżejsze treningi rozregulowały zgranie zespołu.')] },
      { t: 'Nic nie zmieniaj', outs: [ou(2, { board: -2 }, 'Ryzykowne przy tylu urazach.'), ob(1, c => Object.assign({ board: -3 }, evHurt(c, 7, 20)), c => c.p ? `Kolejny uraz – tym razem wypada ${c.p.n}.` : 'Kolejny uraz.')] }] },
  { id: 'intfatigue', cat: 'Medycyna', w: 3, ctx: () => withP(p => p.caps > 0 && p.fit < 80), title: 'Zmęczenie po zgrupowaniu', text: [c => `${c.p.n} wrócił ze zgrupowania reprezentacji wyraźnie zmęczony.`, c => `Po meczach reprezentacji ${c.p.n} ledwo trzyma się na nogach. Lekarz proponuje odpoczynek.`],
    choices: [{ t: 'Daj mu wolne na regenerację', fx: { fit: 15, player: 3, form: -2 }, r: 'Odpocznie.' },
      { t: 'Gra jak zwykle', hint: 'ryzyko urazu', outs: [ou(3, { player: 1, form: 2 }, 'Zagra – i jest w rytmie meczowym.'), ob(1, () => ({ inj: ri(10, 25) }), 'Organizm nie wytrzymał – drobny uraz mięśniowy.'), ou(1, { form: 3 }, 'Wrócił naładowany po udanych meczach w kadrze.')] }] },
  { id: 'n_cryo', cat: 'Medycyna', w: 1, ctx: () => ({}), title: 'Nowy sprzęt do regeneracji',
    text: [() => `Fizjoterapeuci chcą kupić nowoczesną kriokomorę za ${money(evTv(3.5))}. Twierdzą, że skróci regenerację po meczach.`, () => `Sztab medyczny prosi o ${money(evTv(3.5))} na sprzęt do regeneracji – „inne kluby już to mają”.`],
    choices: [{ t: 'Kup', fn: () => ({ money: -evTv(3.5) }), outs: [ou(3, { teamFit: 8, team: 1 }, 'Zawodnicy chwalą nowy sprzęt.'), ou(1, { teamFit: 3 }, 'Efekt mniejszy, niż obiecywał producent.')] },
      { t: 'Wypożycz na próbę', fn: () => ({ money: -evTv(1) }), outs: [ou(2, { teamFit: 4 }, 'Próba wypadła dobrze.'), ou(1, { teamFit: 1 }, 'Na próbę przysłano starszy model – szkoda zachodu.')] },
      { t: 'Nie teraz', fx: { board: 1 }, r: 'Sztab medyczny jest rozczarowany.' }] },
  { id: 'n_hiddeninj', cat: 'Medycyna', w: 2, ctx: () => withP(p => !p.inj && p.st.apps > 3 && p.fit < 88), title: 'Ukrywany uraz',
    text: [c => `Lekarz odkrył, że ${c.p.n} od dwóch tygodni gra z bólem kolana i ukrywa to przed sztabem, by nie stracić miejsca w składzie.`, c => `Fizjoterapeuta donosi: ${c.p.n} bierze środki przeciwbólowe na własną rękę, żeby grać.`],
    choices: [{ t: 'Natychmiastowa przerwa', outs: [ou(3, { inj: 10, player: -4 }, 'Zdrowie najważniejsze.'), ou(1, { inj: 6, player: -2 }, 'Badanie wypadło lepiej, niż się obawiano.')] },
      { t: 'Niech gra, ale z ograniczeniem minut', hint: 'ryzyko poważniejszego urazu', outs: [ou(2, { fit: -5, player: 3 }, 'Udało się dociągnąć do przerwy.'), ob(c => trt(c.p, 'pro') < 10 ? 2 : 1, () => ({ inj: ri(20, 40) }), 'Kolano nie wytrzymało – długa przerwa.')] },
      { t: 'Ukarz go za ukrywanie urazu', mem: 'strict', fx: { inj: 7, player: -10, team: 2 }, r: 'Szatnia wie, że ze zdrowiem się nie żartuje.' }] },
  { id: 'n_concussion', cat: 'Medycyna', w: 2, ctx: () => recentM() ? withP(p => !p.inj && p.st.apps > 0 && p.pos !== 'GK') : null, title: 'Uderzenie w głowę',
    text: [c => `W ostatnim meczu ${c.p.n} zderzył się głowami z rywalem. Czuje się dobrze, ale protokół zaleca kilka dni przerwy.`, c => `${c.p.n} po zderzeniu w powietrzu narzeka na lekki ból głowy. Lekarz chce go oszczędzać.`],
    choices: [{ t: 'Zgodnie z protokołem – przerwa', outs: [ou(3, { inj: 6, press: 2 }, 'Odpowiedzialnie.'), ou(1, { inj: 4, press: 3 }, 'Federacja pochwaliła klub za podejście do zdrowia.')] },
      { t: 'Zagra, jeśli przejdzie testy', hint: 'jeśli objawy wrócą, będzie afera', outs: [ou(3, { player: 2 }, 'Testy w normie – zagrał.'), ob(1, () => ({ inj: ri(14, 28), press: -6, board: -3 }), 'Objawy wróciły w trakcie meczu – media grzmią o nieodpowiedzialności.')] }] },
  { id: 'n_diet', cat: 'Medycyna', w: 1, ctx: () => ({}), title: 'Rewolucja dietetyczna',
    text: ['Nowy dietetyk chce zakazać zawodnikom fast foodów i słodyczy – z kontrolą wagi co tydzień.', 'Dietetyk klubowy przedstawia plan: koniec z pizzą po meczu, cotygodniowe ważenie i kary za nadwagę.'],
    choices: [{ t: 'Wprowadź – z karami', mem: 'strict', outs: [ou(c => sqT('pro') / 4, { teamFit: 6, team: -1 }, 'Zawodnicy zacisnęli zęby – wyniki badań są lepsze.'), ob(c => sqT('tem') / 5, { teamFit: 3, team: -6 }, 'Część zawodników otwarcie się buntuje.')] },
      { t: 'Tylko zalecenia', outs: [ou(2, { teamFit: 2 }, 'Kto chciał, ten skorzystał.'), ou(1, {}, 'Zalecenia wylądowały w szufladach.')] },
      { t: 'Odrzuć plan', fx: { team: 1 }, r: 'Pizza po meczu zostaje.' }] },

  /* ===================== TRANSFERY I SKAUTING ===================== */
  { id: 'wonderkid', cat: 'Skauting', w: 2, ext: true, ctx: () => { const p = PALL.filter(p => p.tid >= 0 && p.tid !== S.user && p.age <= 19 && p.pot >= 78); return p.length ? { p: pick(p) } : null; },
    title: 'Cynk o talencie', text: [c => `Znajomy agent podsuwa nazwisko: ${c.p.n} (${c.p.age} l., ${clubName(c.p)}). Podobno ogromny potencjał.`, c => `Skaut z regionu dzwoni podekscytowany: ${c.p.n} (${c.p.age} l., ${clubName(c.p)}) to „następna wielka rzecz”.`],
    choices: [{ t: 'Dodaj do obserwowanych', outs: [ou(3, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 75); return {}; }, 'Zawodnik trafił na Twoją listę (wiedza 75%).'), ou(1, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 90); return {}; }, 'Agent przesłał też pełny raport i nagrania – wiesz o zawodniku prawie wszystko (90%).')] },
      { t: 'Zignoruj', fx: {}, r: 'Może kiedyś…' }] },
  { id: 'deadline', cat: 'Transfery', w: 2, ext: true, ctx: () => { if (!windowOpen()) return null; const p = PALL.filter(p => p.tid >= 0 && p.tid !== S.user && p.age <= 29 && p.ovr >= teamLevel(userClub()) && p.ovr <= teamLevel(userClub()) + 6 && !p.loan && club(p.tid).players.length > 19 && askPrice(p) * 0.85 <= Math.min(userClub().tb, userClub().bal) && playerInterest(p).ok && !notForSale(p) && !(p._noTalk > absDay())); return p.length ? { p: pick(p) } : null; },
    title: 'Okazja na rynku', text: c => `Agent dzwoni: ${c.p.n} (${posName(c.p.pos)}, ${clubName(c.p)}) jest do wzięcia – ${club(c.p.tid).bal < c.p.val ? 'jego klub potrzebuje pieniędzy' : 'klub chce odmłodzić i przebudować kadrę'}. Może być taniej, jeśli szybko się zgłosisz.`,
    choices: [{ t: 'Dodaj do obserwowanych i sprawdź', hint: 'wysokość zniżki niepewna', outs: [ou(3, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 85); c.p._disc = { k: 0.85, until: absDay() + 30 }; return {}; }, 'Zawodnik na liście obserwowanych – przez 30 dni jego klub zgodzi się na cenę niższą o 15%.'),
        ou(1, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 85); c.p._disc = { k: 0.8, until: absDay() + 21 }; return {}; }, 'Klub zawodnika pilnie potrzebuje gotówki – przez 21 dni cena będzie niższa aż o 20%.'),
        ob(1, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 70); c.p._disc = { k: 0.92, until: absDay() + 30 }; return {}; }, 'Okazało się, że interesuje się nim jeszcze jeden klub – zniżka to tylko 8%.')] },
      { t: 'Nie interesuje mnie', fx: {}, r: 'Agent zadzwoni do kogoś innego.' }] },
  { id: 'unsettled', cat: 'Transfery', follow: true, title: 'Zawodnik chce odejść', text: c => `${c.p.n} jest wściekły, że odrzuciłeś ofertę za niego (${c.p._suitor || 'większy klub'}). Jego agent mówi o „szansie życia”, która przechodzi mu koło nosa.`,
    choices: [{ t: 'Daj mu podwyżkę i nowy kontrakt', hint: 'kosztowne', fn: c => { c.p.con = Math.max(c.p.con, 3); return {}; }, outs: [ou(3, { wage: 0.25, player: 12, samepos: -2 }, 'Pensja w górę – zawodnik się uspokoił. Inni widzą, że można wywalczyć podwyżkę.'), ob(c => trt(c.p, 'amb') >= 15 ? 1.5 : 0.4, { wage: 0.25, player: 2 }, 'Podpisał, ale myślami wciąż jest gdzie indziej.')] },
      { t: '„Jesteś tu kluczowy – zostajesz”', hint: 'zależy od charakteru', mem: 'strict', outs: [ou(c => trt(c.p, 'pro') >= 12 || trt(c.p, 'loy') >= 13 ? 3 : 0.8, { player: 4, team: 1 }, 'Przyjął to z godnością – zostaje i walczy.'), ob(c => trt(c.p, 'pro') >= 12 || trt(c.p, 'loy') >= 13 ? 0.6 : 3, { player: -12, form: -6 }, 'Zawodnik jest wściekły i gra bez serca.')] },
      { t: 'Obiecaj, że następną ofertę przyjmiesz', fx: { player: 7, list: true, fans: -3 }, r: 'Zawodnik trafia na listę transferową – kibice nie są zachwyceni.', mem: 'soft' }] },
  { id: 'n_watched', cat: 'Transfery', w: 2, ctx: () => { const p = starPlayer(); return p && p.age <= 29 && p.ovr >= teamLevel(userClub()) + 3 && !p.listed ? { p } : null; }, title: 'Skauci na trybunach',
    text: [c => `Media donoszą, że skauci wielkiego klubu obserwowali ostatnie mecze. ${c.p.n} jest coraz bardziej rozkojarzony.`, c => `Zagraniczne media łączą z transferem największą gwiazdę zespołu – ${c.p.n} czyta o sobie codziennie.`],
    choices: [{ t: '„Nie jest na sprzedaż”', outs: [ou(c => trt(c.p, 'loy') >= 12 ? 3 : 1.5, { board: 2, fans: 3, player: 3 }, 'Zawodnik docenił, że klub na niego stawia.'), ob(c => trt(c.p, 'amb') >= 14 ? 2.5 : 0.7, { fans: 3, player: -8 }, 'Zawodnik czuje, że blokujesz mu karierę.')] },
      { t: '„Każdy ma swoją cenę”', outs: [ou(c => trt(c.p, 'amb') >= 13 ? 2.5 : 1, { player: 6, fans: -4, board: 1 }, 'Zawodnik się uspokoił, kibice – wręcz przeciwnie.'), ob(1.5, { player: 1, fans: -7 }, 'Kibice odebrali to jako zapowiedź wyprzedaży.')] },
      { t: 'Rozmowa: skup się na grze', outs: [ou(c => trt(c.p, 'pro') >= 12 ? 3 : 1.5, { form: 3, player: 2 }, 'Profesjonalista – zamknął temat.'), ob(c => trt(c.p, 'tem') >= 13 ? 2 : 0.7, { player: -4, form: -3 }, 'Plotki nie dają mu spokoju.')] }] },
  { id: 'n_loanask', cat: 'Transfery', w: 2, ctx: () => windowOpen() && uPlayers().length > 20 ? withP(p => p.age <= 21 && p.pt < 0.15 && !p.loan && !p.inj) : null, title: 'Prośba o wypożyczenie',
    text: [c => `${c.p.n} prosi o wypożyczenie – chce regularnie grać, choćby w słabszym klubie.`, c => `${c.p.n} ma dość ławki: „Trenerze, wolę grać co tydzień gdzie indziej niż czekać tutaj”.`],
    choices: [{ t: 'Zgoda – poszukamy klubu', fn: c => { const r = loanOut(c.p.id); c.x = { ok: r.ok ? 1 : 0, m: r.msg }; return r.ok ? {} : { player: -3 }; }, r: c => evX(c).ok ? 'Zawodnik odchodzi na wypożyczenie – wróci z doświadczeniem.' : `Nie udało się: ${evX(c).m}` },
      { t: 'Obiecaj mu minuty', hint: 'obietnica do dotrzymania', fx: { player: 8, promise: true, samepos: -2 }, r: 'Zostaje – i trzyma Cię za słowo.' },
      { t: 'Odmów – jego czas przyjdzie', outs: [ou(c => trt(c.p, 'pro') >= 12 ? 3 : 1.5, { player: -3 }, 'Zawodnik zacisnął zęby.'), ob(c => trt(c.p, 'amb') >= 13 ? 2 : 0.7, { player: -10 }, 'Zawodnik jest rozgoryczony.')] }] },

  /* ===================== KONTRAKTY ===================== */
  { id: 'agentraise', cat: 'Kontrakty', w: 3, ctx: () => { const p = starPlayer(); return p && p.con >= 2 ? { p } : null; },
    title: 'Agent żąda podwyżki', text: [c => `${c.p.n} chce więcej zarabiać. Jego agent żąda 30% podwyżki, sugerując zainteresowanie innych klubów.`, c => `${c.p.n} jest najlepszym zawodnikiem zespołu – i jego agent dobrze o tym wie. Żądanie: 30% więcej.`],
    choices: [{ t: 'Daj podwyżkę', outs: [ou(3, { wage: 0.3, player: 10, team: -2 }, 'Gwiazda zadowolona, reszta szatni liczy pieniądze.'), ob(1, { wage: 0.3, player: 8, team: -5 }, 'Inni zawodnicy też ustawiają się po podwyżki.')] },
      { t: 'Zaproponuj 10%', hint: 'zależy od charakteru', outs: [ou(c => trt(c.p, 'amb') < 13 ? 3 : 1.5, { wage: 0.1, player: 2 }, 'Agent niechętnie się zgadza.'), ob(c => trt(c.p, 'amb') >= 13 ? 2 : 0.7, { wage: 0.1, player: -8 }, 'Zawodnik przyjął, ale czuje się niedoceniony.'), ou(1.5, { wage: 0.2, player: 5 }, 'Agent zszedł do 20% – spotkaliście się w połowie drogi.')] },
      { t: 'Odmów', outs: [ob(c => trt(c.p, 'loy') >= 13 ? 1 : 2.5, { player: -12, board: 2 }, 'Zawodnik jest rozczarowany…', { follow: ['f_transferreq', 15, 40, 0.6] }), ou(c => trt(c.p, 'loy') >= 13 ? 3 : 1, { player: -5, board: 2 }, 'Zawodnik przełknął odmowę: „Skupiam się na grze”.')] }] },
  { id: 'f_transferreq', cat: 'Kontrakty', follow: true, title: 'Prośba o transfer', text: [c => `${c.p.n} składa oficjalną prośbę o transfer. „Nie widzę tu dla siebie przyszłości” – mówi w wywiadzie.`, c => `${c.p.n} chce odejść i mówi to otwarcie. Agent zawodnika rozsyła oferty po Europie.`],
    choices: [{ t: 'Zgódź się – wystaw go', fx: { list: true, player: 6, fans: -3 }, r: 'Zawodnik trafia na rynek.' },
      { t: 'Odrzuć prośbę', mem: 'strict', outs: [ob(c => trt(c.p, 'pro') >= 13 ? 1 : 2.5, { player: -15, team: -2, press: -2 }, 'Zostaje, ale jest wyraźnie niezadowolony.'), ou(c => trt(c.p, 'pro') >= 13 ? 2 : 0.5, { player: -5 }, 'Zawodnik przyjął decyzję i obiecał dawać z siebie wszystko.')] },
      { t: 'Zaproponuj nowy kontrakt z podwyżką', outs: [ou(3, { wage: 0.25, player: 12, board: -2 }, 'Udało się go udobruchać – za sporą cenę.'), ob(1, { wage: 0.25, player: 3, board: -3 }, 'Podpisał, ale wciąż mówi o odejściu.')] }] },
  { id: 'tapup', cat: 'Kontrakty', w: 3, ctx: () => withP(p => p.con <= 1 && !p.loan && p.ovr >= teamLevel(userClub())), title: 'Podchody rywala', text: [c => `Media donoszą, że inny klub potajemnie rozmawia z zawodnikiem, któremu kończy się kontrakt: ${c.p.n}.`, c => `${c.p.n} był widziany na kolacji z dyrektorem sportowym innego klubu. Jego kontrakt wkrótce wygasa.`],
    choices: [{ t: 'Zaproponuj od razu nowy kontrakt', fn: c => { const r = renewContract(c.p.id, 3); c.x = { ok: r.ok ? 1 : 0, m: r.msg }; return r.ok ? { player: 6 } : { player: -6, press: -2 }; }, r: c => evX(c).ok ? 'Kontrakt przedłużony.' : `Negocjacje nieudane: ${evX(c).m}` },
      { t: 'Zgłoś sprawę do federacji', outs: [ou(2, { press: 3, player: -10, board: 2 }, 'Rywal dostał ostrzeżenie, ale zawodnik czuje się źle.'), ob(1, { press: -2, player: -10 }, 'Federacja umorzyła sprawę z braku dowodów.')] },
      { t: 'Odpuść', fx: { player: -3 }, r: 'Zawodnik prawdopodobnie odejdzie.' }] },
  { id: 'n_bonuswage', cat: 'Kontrakty', w: 2, ctx: () => withP(p => p.con >= 2 && p.st.apps > 3 && p.ovr >= teamLevel(userClub()) - 2 && !p._bw), title: 'Pensja za premie',
    text: [c => `${c.p.n} proponuje zmianę kontraktu: niższa pensja podstawowa, za to wysokie premie za występy i gole.`, c => `Agent zawodnika (${c.p.n}) przychodzi z nietypową propozycją – mniej stałej pensji, więcej premii za wyniki.`],
    choices: [{ t: 'Zgoda', fn: c => { c.p._bw = 1; return { wage: -0.08 }; }, outs: [ou(2, { player: 5 }, 'Zawodnik zadowolony, budżet płacowy odciążony.'), ou(1, { player: 8, form: 3 }, 'Premie działają – zawodnik gra jak natchniony.'), ob(1.5, { player: 2, team: -3 }, 'Inni zawodnicy też chcą premii – w szatni zaczyna się licytacja.')] },
      { t: 'Wolę stałą pensję', fx: { team: 1 }, outs: [ou(2, { player: -2 }, 'Zostaje po staremu – w szatni nikt nie zaczyna licytacji premii.'), ou(1, {}, 'Zawodnik wzruszył ramionami.')] }] },
  { id: 'n_loyalvet', cat: 'Kontrakty', w: 2, ctx: () => withP(p => p.age >= 30 && p.con <= 1 && traits(p).loy >= 13 && !p.loan && p.ovr >= teamLevel(userClub()) - 8), title: 'Weteran chce zostać',
    text: [c => `${c.p.n} chce zostać w klubie na dłużej – zgodzi się nawet na niższą pensję.`, c => `„Tu chcę skończyć karierę” – ${c.p.n} prosi o nowy kontrakt i nie stawia wygórowanych warunków.`],
    choices: [{ t: 'Nowa umowa na 2 lata (pensja −10%)', fn: c => { c.p.con = Math.max(c.p.con, 1) + 2; return { wage: -0.1, player: 10 }; }, outs: [ou(3, { team: 2 }, 'Szatnia cieszy się, że lider zostaje.'), ob(1, { form: -5 }, 'Kilka tygodni później forma spadła – wiek robi swoje.')] },
      { t: 'Rok i zobaczymy', fn: c => { c.p.con = Math.max(c.p.con, 1) + 1; return { player: 4 }; }, r: 'Krótka umowa – uczciwie.' },
      { t: 'Podziękuj za lata gry', outs: [ou(2, { player: -10, team: -3 }, 'Smutna decyzja – szatnia to odczuła.'), ob(1, { player: -10, fans: -4, team: -3 }, 'Kibice nie mogą uwierzyć, że klub żegna się z legendą.')] }] },

  /* ===================== STADION ===================== */
  { id: 'stadiumrepair', cat: 'Stadion', w: 1, ctx: () => ({}), title: 'Awaria na stadionie', text: ['Zepsuło się oświetlenie jednej z trybun. Szybka naprawa jest droga.', 'Awaria nagłośnienia i części oświetlenia stadionu. Fachowcy wyceniają naprawę ekspresową wysoko.'],
    choices: [{ t: 'Naprawić natychmiast', outs: [ou(3, () => ({ money: -evTv(3), fans: 3 }), 'Problem rozwiązany.'), ou(1, () => ({ money: -evTv(2), fans: 3 }), 'Fachowcy uporali się szybciej i taniej.')] },
      { t: 'Odłożyć naprawę', outs: [ou(3, { fans: -5, press: -3 }, 'Kibice narzekają na warunki.'), ob(1, () => ({ money: -evTv(5), board: -4 }), 'Podczas meczu zgasło światło – kara od ligi i droga naprawa.')] }] },
  { id: 'n_pitch', cat: 'Stadion', w: 2, ctx: () => (typeof commLvl === 'function' && commLvl('turf') >= 2) ? null : {}, title: 'Fatalna murawa',
    text: ['Murawa na stadionie jest w fatalnym stanie – kępy trawy wyrywają się przy każdym wślizgu.', 'Zawodnicy skarżą się na boisko: nierówne, dziurawe, grząskie. Gospodarz obiektu rozkłada ręce.'],
    choices: [{ t: 'Wymień murawę', fn: () => ({ money: -evTv(4) }), outs: [ou(3, { fans: 2, team: 2 }, 'Nowa murawa jak dywan.'), ob(1, { team: -1 }, 'Nowa murawa nie zdążyła się ukorzenić – przez kilka tygodni jest niewiele lepiej.')] },
      { t: 'Doraźne łatanie', fn: () => ({ money: -evTv(1.2) }), outs: [ou(2, {}, 'Na razie wystarczy.'), ob(1, c => evHurt(c, 7, 18), c => c.p ? `${c.p.n} skręcił staw skokowy w dziurze w murawie.` : 'Łatanie niewiele dało.')] },
      { t: 'Zostaw – jakoś to będzie', outs: [ou(2, { fans: -2, press: -2 }, 'Media kpią z „kartofliska”.'), ob(2, c => Object.assign({ fans: -2 }, evHurt(c, 10, 25)), c => c.p ? `Kartoflisko zebrało żniwo: kontuzji doznał ${c.p.n}.` : 'Kartoflisko zebrało żniwo.')] }] },
  { id: 'n_safety', cat: 'Stadion', w: 1, ctx: () => ({}), title: 'Kontrola bezpieczeństwa',
    text: ['Inspektor nadzoru budowlanego znalazł usterki na jednej z trybun i grozi jej zamknięciem.', 'Kontrola straży pożarnej: drogi ewakuacyjne na jednej z trybun nie spełniają norm.'],
    choices: [{ t: 'Natychmiastowy remont', fn: () => ({ money: -evTv(4) }), outs: [ou(3, { fans: 1, board: 1 }, 'Usterki usunięte w terminie.'), ob(1, () => ({ money: -evTv(1) }), 'Usterki okazały się poważniejsze – koszt wzrósł.')] },
      { t: 'Odwołaj się od decyzji', hint: 'można zyskać czas albo stracić trybunę', outs: [ou(2, { press: -1 }, 'Odwołanie przyjęte – trybuna otwarta, remont później.'), ob(2, () => ({ money: -evTv(5), fans: -4, board: -2 }), 'Odwołanie odrzucone – trybuna zamknięta na dwa mecze, a remont i tak trzeba zrobić.')] },
      { t: 'Zamknij trybunę na kilka tygodni', fn: () => ({ money: -evTv(2) }), fx: { fans: -4 }, r: 'Część kibiców obejrzy mecze w telewizji.' }] },

  /* ===================== SPOŁECZNOŚĆ ===================== */
  { id: 'charity', cat: 'Społeczność', w: 2, ctx: () => ({}), title: 'Akcja charytatywna', text: ['Miejski szpital dziecięcy zaprasza drużynę na wizytę i akcję charytatywną w środku tygodnia.', 'Fundacja pomagająca chorym dzieciom prosi o wizytę zawodników na oddziale onkologii dziecięcej.'],
    choices: [{ t: 'Cała drużyna jedzie', mem: 'csr', outs: [ou(3, { fans: 7, press: 6, team: 3, teamFit: -4 }, 'Piękne obrazki obiegły media.'), ou(1, { fans: 4, press: 2, teamFit: -4 }, 'Wizyta wypadła skromniej, niż planowano – część zawodników wyraźnie się nudziła.')] },
      { t: 'Wyślij kapitana i siebie', hint: 'zależy od kapitana', fn: () => { const c = S.captain != null ? pget(S.captain) : null; return c && traits(c).pro >= 11 ? { fans: 3, press: 3 } : { fans: 1, press: -2 }; }, r: 'Skromnie – reakcja zależała od postawy kapitana.' },
      { t: 'Odmów – liczy się trening', outs: [ou(2, { fans: -5, press: -6, teamFit: 2 }, 'Media nie zostawiają na Tobie suchej nitki.'), ou(1, { fans: -2, press: -2, teamFit: 2 }, 'Media wspomniały o tym tylko krótko.')] }] },
  { id: 'n_localclub', cat: 'Społeczność', w: 1, ctx: () => ({}), title: 'Ratunek dla klubu z sąsiedztwa',
    text: ['Lokalny amatorski klub, w którym zaczynało wielu Twoich kibiców, stoi na krawędzi bankructwa. Prosi o pomoc.', 'Klub z dzielnicy – kuźnia talentów dla Twojej akademii – nie ma za co opłacić boiska. Prezes klubu prosi o wsparcie.'],
    choices: [{ t: 'Wesprzyj finansowo', mem: 'csr', fn: () => ({ money: -evTv(2) }), outs: [ou(3, { fans: 5, press: 3 }, 'Lokalna społeczność jest wdzięczna.'), ou(1, { fans: 5, press: 3, yth: 2 }, 'Uratowany klub stał się partnerem akademii.')] },
      { t: 'Zorganizuj mecz charytatywny', mem: 'csr', outs: [ou(2, { teamFit: -3, fans: 4, press: 2 }, 'Udany festyn.'), ou(1, { teamFit: -3, fans: 7, press: 5 }, 'Komplet widzów i świetna atmosfera.'), ob(1, { teamFit: -3, fans: 1 }, 'Pogoda nie dopisała – mało widzów, mało pieniędzy.')] },
      { t: 'Odmów', fx: { fans: -3, press: -2 }, r: 'Lokalne media nie są zachwycone.' }] },
  { id: 'n_school', cat: 'Społeczność', w: 1, ctx: () => ({}), title: 'Lekcja z piłkarzami',
    text: ['Szkoły z regionu zapraszają zawodników na lekcje wychowania fizycznego i pogadanki o zdrowym stylu życia.', 'Kuratorium proponuje program „Piłkarz w szkole” – zawodnicy odwiedzają podstawówki w regionie.'],
    choices: [{ t: 'Wyślij młodych zawodników', mem: 'csr', outs: [ou(3, { fans: 3, press: 2, team: 1 }, 'Dzieciaki zachwycone.'), ob(1, { fans: 1, press: -3 }, 'Jeden z zawodników przyszedł spóźniony i znudzony – nagranie trafiło do sieci.')] },
      { t: 'Wyślij największe gwiazdy', mem: 'csr', fn: c => { c.p = starPlayer(); return {}; }, outs: [ou(2, { fans: 6, press: 4, player: -2 }, 'Tłumy dzieci i rodziców – gwiazda zmęczona, ale zadowolona.'), ou(1, { fans: 5, press: 3, player: 3 }, 'Gwiazda była wzruszona przyjęciem.')] },
      { t: 'Odmów – kalendarz jest napięty', fx: { fans: -2, teamFit: 2 }, r: 'Szkoły są rozczarowane, ale zawodnicy odpoczną.' }] },
  { id: 'n_flood', cat: 'Społeczność', w: 1, ctx: () => S.mem.floodS !== S.season ? {} : null, title: 'Powódź w regionie',
    text: ['Region nawiedziła powódź. Kibice pytają, czy klub pomoże poszkodowanym.', 'Rzeka wystąpiła z brzegów – zalane są domy wielu kibiców. Wszyscy patrzą, co zrobi klub.'],
    choices: [{ t: 'Przekaż dochód z meczu', mem: 'csr', fn: () => { S.mem.floodS = S.season; return { money: -evTv(3) }; }, outs: [ou(3, { fans: 8, press: 6 }, 'Klub stanął na wysokości zadania.'), ou(1, { fans: 7, press: 5, spons: 0.02 }, 'Sponsorzy dołożyli się do akcji – wizerunek klubu zyskał.')] },
      { t: 'Zbiórka wśród zawodników', mem: 'csr', fn: () => { S.mem.floodS = S.season; return {}; }, outs: [ou(2, { team: 2, fans: 5, press: 4 }, 'Zawodnicy sami wyszli z inicjatywą.'), ob(1.5, { team: -3, fans: 2, press: -2 }, 'Część zawodników niechętnie sięgnęła do portfela – media to wytknęły.')] },
      { t: 'Zbiórka kibiców przy stadionie (klub udostępnia logistykę)', mem: 'csr', fn: () => { S.mem.floodS = S.season; return { money: -evTv(0.3) }; }, outs: [ou(2, { fans: 5, press: 2 }, 'Kibice zebrali ciężarówkę darów – klub był tylko organizatorem.'), ob(1, { fans: 1, press: -2 }, 'Zbiórka okazała się chaotyczna – media piszą, że klub „zrzucił odpowiedzialność na kibiców”.')] }] },

  /* ===================== RYWALE ===================== */
  { id: 'rivalprovoke', cat: 'Rywale', w: 2, ctx: () => ({}), title: 'Prowokacja rywala', text: [() => memv('rival') >= 2 ? 'Znowu on. Trener ligowego rywala, z którym już kilka razy starłeś się w mediach, kpi ze stylu gry Twojej drużyny.' : 'Trener rywala z ligi publicznie wyśmiewa styl gry Twojej drużyny.', 'W telewizyjnym studiu trener ligowego rywala nazwał Twoją drużynę „autobusem zaparkowanym w polu karnym”.'],
    choices: [{ t: 'Odpowiedz ostro', mem: ['media', 'rival'], outs: [ou(3, { fans: 6, press: 3, team: 3, board: -3 }, 'Wojna na słowa nakręca kibiców.', { follow: ['n_feud', 20, 45, 0.35] }), ob(c => 1 + memv('rival') * 0.7, () => ({ cash: -evTv(0.5), board: -5, press: -3, fans: 4 }), 'Liga ukarała Cię grzywną za wypowiedź – prezes nie jest zachwycony.'), ou(1, { fans: 8, team: 5, board: -2 }, 'Rywal zamilkł – kibice nazwali Cię „naszym generałem”.')] },
      { t: 'Odpowiedz z klasą', outs: [ou(3, { press: 5, board: 2, fans: -2 }, 'Media chwalą Twój spokój, część kibiców chciała więcej ognia.'), ou(1, { press: 2, fans: -4 }, 'Kibice uznali to za uległość.')] },
      { t: 'Milcz', outs: [ou(2, { fans: -3, team: -1 }, 'Część kibiców uważa, że dałeś się upokorzyć.'), ou(2, { press: 2 }, 'Media uznały, że nie dałeś się sprowokować.')] }] },
  { id: 'n_feud', cat: 'Rywale', follow: true, title: 'Trener rywala nie odpuszcza',
    text: [() => `Trener rywala wraca do Waszej wymiany zdań: „Ten pan lubi mówić, mniej lubi wygrywać”. Dziennikarze czekają na odpowiedź.${memv('rival') >= 3 ? ' To już kolejna runda tej wojny.' : ''}`, () => 'Wojna na słowa trwa: trener rywala w wywiadzie radzi Ci „mniej gadać, więcej trenować”.'],
    choices: [{ t: 'Kolejna ostra riposta', mem: ['rival', 'media'], outs: [ou(2, { fans: 5, team: 2, board: -2 }, 'Kibice kochają tę wojnę.'), ob(c => 1 + memv('rival') * 0.5, () => ({ cash: -evTv(0.7), board: -5, press: -3 }), 'Liga straciła cierpliwość – grzywna i ostrzeżenie.')] },
      { t: 'Zakończ temat z klasą', mem: { rival: -1 }, fx: { press: 4, fans: -2 }, r: 'Media uznały, że to Ty wygrałeś tę wymianę.' },
      { t: 'Zaproś go publicznie na kawę', mem: { rival: -1 }, outs: [ou(2, { press: 5, fans: -3, board: 2 }, 'Zdjęcie dwóch trenerów przy kawie obiegło media.'), ou(1, { press: -2, fans: -4 }, 'Rywal odmówił i zakpił z zaproszenia.')] }] },
  { id: 'refcontro', cat: 'Prasa', w: 3, ctx: () => recentM() && lastRes(1)[0] === 'L' ? {} : null, title: 'Kontrowersje sędziowskie', text: ['Po porażce kibice i media kłócą się o niepodyktowany rzut karny dla Twojej drużyny.', 'Powtórki nie kłamią: gol dla rywala padł ze spalonego. Dziennikarze czekają na Twoją reakcję.'],
    choices: [{ t: 'Skrytykuj sędziego', mem: 'media', outs: [ou(2, () => ({ fans: 5, board: -2, money: -evTv(0.5) }), 'Kara finansowa od ligi, ale kibice są z Tobą.'), ob(c => 1 + memv('media') * 0.2, () => ({ fans: 4, board: -4, cash: -evTv(1) }), 'Komisja dyscyplinarna nie miała litości – wysoka grzywna.'), ou(1, { fans: 6, press: 2 }, 'Liga przyznała, że sędzia się pomylił.')] },
      { t: 'Przyjmij porażkę z klasą', outs: [ou(3, { press: 4, fans: -2 }, 'Fair play doceniony w mediach.'), ou(1, { press: 2, fans: -5 }, 'Kibice uważają, że nie walczysz o drużynę.')] }] },
  { id: 'n_mural', cat: 'Rywale', w: 3, ctx: () => { const o = evNextOpp(10); return o && o.derby ? { x: { dn: o.derby } } : null; }, title: 'Zamalowany mural',
    text: [c => `Kilka dni przed meczem (${evX(c).dn}) ktoś zamalował mural klubowy przy stadionie barwami rywala.`, c => `${evX(c).dn} za pasem, a na murze przy stadionie pojawił się obraźliwy napis w barwach rywala.`],
    choices: [{ t: '„To nas tylko bardziej nakręci”', mem: 'rival', outs: [ou(2, { team: 4, fans: 4 }, 'Szatnia i trybuny zjednoczone.'), ou(1, { team: 6, fans: 6 }, 'Zdjęcie drużyny pod zniszczonym muralem stało się symbolem tygodnia.'), ob(1, { fans: 2, press: -3 }, 'Media zarzucają Ci podgrzewanie atmosfery przed meczem podwyższonego ryzyka.')] },
      { t: 'Zaapeluj o spokój', fx: { press: 4, board: 2, fans: -2 }, r: 'Rozsądny głos – policja i liga dziękują.' },
      { t: 'Odnówmy mural razem z kibicami', mem: 'fanside', fn: () => ({ money: -evTv(0.3) }), outs: [ou(2, { fans: 6, team: 1 }, 'Wspólna akcja z kibicami – piękne zdjęcia.'), ou(1, { fans: 4, teamFit: -2 }, 'Malowanie trwało cały dzień, zawodnicy trochę się zmęczyli.')] }] },
  { id: 'n_rivalflirt', cat: 'Rywale', w: 2, ctx: () => { const ut = userClub(); const r = pick(evLg() ? evLg().clubs.map(club).filter(c => c.id !== ut.id && c.rep > ut.rep) : []); const p = randPlayer(p => p.ovr >= teamLevel(ut) && !p.listed); return r && p ? { p, x: { c: r.name } } : null; }, title: 'Rywal kusi zawodnika',
    text: [c => `Trener ligowego rywala (${evX(c).c}) mówi w wywiadzie: „${c.p.n} pasowałby do nas idealnie”.`, c => `${evX(c).c} otwarcie flirtuje z Twoim zawodnikiem. Dyrektor sportowy rywala: „${c.p.n}? Drzwi są otwarte”.`],
    choices: [{ t: 'Ostra riposta', mem: 'rival', outs: [ou(2, { player: 3, fans: 4 }, 'Kibice i zawodnik docenili, że go bronisz.'), ob(1, { player: 2, board: -3, press: -2 }, 'Wymiana zdań przerodziła się w medialną przepychankę.')] },
      { t: 'Złóż skargę do ligi', outs: [ou(1, { press: 2, player: 2 }, 'Liga udzieliła rywalowi upomnienia.'), ob(1.2, { press: -3, board: -1 }, 'Skarga odrzucona – „wypowiedź nie narusza przepisów”. Media kpią z „płaczliwego” klubu.')] },
      { t: 'Zignoruj', outs: [ou(c => trt(c.p, 'loy') >= 12 ? 3 : 1.5, {}, 'Zawodnik nawet nie skomentował.'), ob(c => trt(c.p, 'amb') >= 13 ? 2 : 0.7, { player: -6 }, 'Zawodnik zaczął słuchać komplementów…')] }] },

  /* ===================== AGENT (Leon Kmita) ===================== */
  { id: 'n_kmita', cat: 'Agent', w: 2, ext: true, ctx: () => { if (!windowOpen()) return null; const L = teamLevel(userClub()); const l = PALL.filter(p => p.tid >= 0 && p.tid !== S.user && !p.loan && p.age <= 30 && p.ovr >= L - 1 && p.ovr <= L + 5 && !(S.short || []).includes(p.id)); return l.length ? { p: pick(l) } : null; }, title: 'Telefon od agenta',
    text: [c => `Dzwoni Leon Kmita, jeden z najbardziej wpływowych agentów w kraju: jego klient, ${c.p.n} (${c.p.age} l., ${posName(c.p.pos)}, ${clubName(c.p)}), mógłby wzmocnić drużynę – oczywiście za prowizją.${kmitaNote()}`, c => `Leon Kmita ma „temat”: ${c.p.n} (${posName(c.p.pos)}) chce zmienić klub, a Kmita może załatwić niższą cenę – za drobną opłatą.${kmitaNote()}`],
    choices: [{ t: c => `Wchodzę w to (prowizja ${money(evTv(0.4))})`, mem: { agent: 1 }, fn: () => ({ cash: -evTv(0.4) }), outs: [
        ou(3, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 90); c.p._disc = { k: 0.88, until: absDay() + 30 }; return {}; }, 'Kmita dotrzymał słowa: przez 30 dni klub zawodnika zgodzi się na cenę niższą o 12%.'),
        ob(c => memv('agent') < 0 ? 2 : 0.7, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 80); return {}; }, 'Kmita wziął prowizję, ale klub zawodnika nic nie wie o żadnej zniżce.')] },
      { t: 'Tylko informacje, bez prowizji', outs: [ou(c => memv('agent') > 0 ? 3 : 1.5, c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 70); return {}; }, 'Kmita przesłał dane zawodnika – „na dobry początek współpracy”.'), ob(2, {}, '„Za darmo to w przedszkolu” – Kmita się rozłączył.', { mem: { agent: -1 } })] },
      { t: 'Nie robię interesów z tym panem', mem: { agent: -1 }, fx: { press: 1 }, r: 'Kmita zapamięta tę rozmowę.' }] },
  { id: 'n_kmita2', cat: 'Agent', w: 2, ctx: () => withP(p => p.ovr >= teamLevel(userClub()) && p.con >= 2 && !p._ag && !p.loan), title: 'Nowy agent, nowe żądania',
    text: [c => `${c.p.n} zmienił agenta – teraz reprezentuje go Leon Kmita, który od razu żąda renegocjacji kontraktu.${kmitaNote()}`, c => `Leon Kmita przejął sprawy zawodnika i dzwoni z „propozycją nie do odrzucenia”: ${c.p.n} ma zarabiać o 20% więcej.${kmitaNote()}`],
    choices: [{ t: 'Renegocjuj (+20%)', mem: { agent: 1 }, fn: c => { c.p._ag = 1; return {}; }, outs: [ou(3, { wage: 0.2, player: 6 }, 'Zawodnik zadowolony, Kmita też.'), ob(1, { wage: 0.2, player: 3, team: -2 }, 'Kmita zainkasował prowizję i chwali się w mediach, jak łatwo „załatwił” podwyżkę.')] },
      { t: 'Twarde „nie”', mem: { agent: -1 }, fn: c => { c.p._ag = 1; return { board: 2 }; }, outs: [ou(c => trt(c.p, 'loy') >= 12 ? 3 : 1.5, { player: -3 }, 'Zawodnik nie chce wojny z klubem – sprawa ucichła.'), ob(c => 1 + (trt(c.p, 'amb') >= 13 ? 1 : 0) + (memv('agent') < 0 ? 1 : 0), { player: -10 }, 'Kmita zaczyna podsuwać zawodnika innym klubom.', { follow: ['f_transferreq', 10, 30, 0.6] })] },
      { t: 'Porozmawiaj z zawodnikiem bez agenta', fn: c => { c.p._ag = 1; return {}; }, outs: [ou(c => trt(c.p, 'loy') >= 12 ? 3 : 1.5, { player: 5, wage: 0.08 }, 'Dogadaliście się po ludzku – skromna podwyżka.'), ob(2, { player: -5 }, 'Kmita wściekły – „to złamanie zasad”. Zawodnik czuje się postawiony między młotem a kowadłem.', { mem: { agent: -1 } })] }] },

  /* ===================== PRASA ===================== */
  { id: 'journalist', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Wywiad na wyłączność', text: [() => `${wronaNote()} prosi o długi wywiad o Twojej filozofii pracy.`, () => `${wronaNote()} chce przygotować z Tobą duży materiał na weekend – „trener od kuchni”.`],
    choices: [{ t: 'Zgódź się', hint: 'słowa mogą zostać przekręcone', mem: { jour: 1 }, outs: [ou(c => 3 + memv('jour') * 0.4, { press: 6, fans: 2, mgr: 0.2 }, 'Świetny materiał – czyta go cały kraj.'), ob(c => S.press < 40 ? 2 : 1, { press: -4, team: -3 }, 'Tytuł wyrwał Twoje słowa z kontekstu – zawodnicy poczuli się urażeni.')] },
      { t: 'Odmów', mem: { jour: -1 }, outs: [ou(2, { press: -3 }, 'Dziennikarz zapamięta.'), ou(1, { press: -1, team: 1 }, 'Wolisz rozmawiać z drużyną niż z mediami – szatnia to docenia.')] }] },
  { id: 'n_wrona', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Dziennikarz szykuje tekst',
    text: [() => memv('jour') <= -1 ? 'Jacek Wrona nie zapomniał, że odmówiłeś mu rozmowy. Przygotowuje krytyczny tekst o Twojej taktyce i dzwoni po komentarz.' : memv('jour') >= 2 ? 'Jacek Wrona, z którym dobrze się współpracuje, uprzedza: redakcja chce tekstu o „kulisach szatni”. Pyta, czy chcesz coś dodać.' : 'Jacek Wrona przygotowuje artykuł o kulisach klubu i prosi o komentarz.'],
    choices: [{ t: 'Spotkaj się i wyjaśnij swoje racje', mem: { jour: 1 }, outs: [ou(c => 2 + Math.max(0, memv('jour')), { press: 5 }, 'Tekst wyszedł rzetelny i wyważony.'), ob(c => 1 + (memv('jour') < 0 ? 2 : 0), { press: -4 }, 'Tekst i tak był druzgocący – Twoje wyjaśnienia skrócono do jednego zdania.'), ob(1, { press: 3, team: -3 }, 'Artykuł był rzetelny, ale ujawnił kulisy, które zawodnicy woleliby zachować dla siebie.')] },
      { t: 'Podsuń mu inny temat (przeciek transferowy)', outs: [ou(2, { press: 4 }, 'Wrona dostał swój news – o kulisach szatni zapomniał.', { mem: { jour: 1 } }), ob(1, { press: -3, board: -3 }, 'Przeciek okazał się nieprawdziwy – Wrona czuje się wykorzystany.', { mem: { jour: -2, liar: 0.5 } })] },
      { t: 'Bez komentarza', mem: { jour: -1 }, outs: [ou(2, { press: -3 }, 'Tekst ukazał się bez Twojego głosu.'), ou(1, { press: -1 }, 'Tekst przeszedł bez echa.')] }] },
  { id: 'medialeak', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Przeciek z szatni', text: ['Gazeta opisuje szczegóły Twojej odprawy i wymianę zdań z zawodnikami. Ktoś z szatni rozmawia z mediami.', () => `${memv('jour') <= -1 ? 'Jacek Wrona' : 'Lokalny dziennik'} publikuje cytaty z Twojej przemowy w szatni. Słowo w słowo.`],
    choices: [{ t: 'Szukaj kreta', mem: 'strict', outs: [ou(2, { team: -5, press: 2 }, 'Atmosfera podejrzliwości.'), ou(1, { team: 2, press: 3 }, 'Kret sam się przyznał – atmosfera się oczyściła.'), ob(1, { team: -8 }, 'Podejrzenia padły na niewinnego – szatnia jest wściekła.')] },
      { t: 'Zamknij treningi dla mediów', mem: { jour: -1 }, outs: [ou(2, { press: -6, team: 2 }, 'Dziennikarze są wściekli.'), ou(1, { press: -3, team: 3 }, 'Zawodnicy pracują w spokoju – i to widać.')] },
      { t: 'Zbagatelizuj', outs: [ou(2, { press: -2 }, 'Sprawa przycicha… na razie.', { follow: ['f_leak2', 20, 45, 0.5] }), ou(1, {}, 'Nikt już o tym nie pamięta.')] }] },
  { id: 'f_leak2', cat: 'Prasa', follow: true, title: 'Kolejny przeciek', text: ['Ten sam dziennikarz publikuje Twój skład dzień przed meczem. Rywal był przygotowany.', 'Znowu przeciek: tym razem szczegóły taktyki na najbliższy mecz.'],
    choices: [{ t: 'Ogłoś kary za kontakty z mediami', outs: [ou(2, { team: -3, press: -3, board: 2 }, 'Przecieki ustały.'), ob(1, { team: -5, press: -4 }, 'Zawodnicy czują się traktowani jak podejrzani.')] }, { t: 'Udawaj, że nic się nie stało', fx: { board: -4, team: -2 }, r: 'Szatnia traci zaufanie.' }] },
  { id: 'winstreak', cat: 'Prasa', w: 3, ctx: () => recentM() && lastRes(4).length === 4 && lastRes(4).every(r => r === 'W') ? {} : null, title: 'Media zachwycone', text: ['Po serii zwycięstw dziennikarze nazywają Cię „objawieniem sezonu”.', 'Cztery zwycięstwa z rzędu! Telewizja chce Twojego komentarza na żywo.'],
    choices: [{ t: 'Podziękuj drużynie', outs: [ou(3, { team: 4, press: 2 }, 'Zawodnicy czują się docenieni.'), ou(1, { team: 2, press: -1 }, 'Media uznały to za banał, zawodnicy – za miły gest.')] },
      { t: '„To dopiero początek”', hint: 'zobowiązuje', outs: [ou(2, { fans: 6, press: 2, boast: true }, 'Oczekiwania rosną…'), ou(1, { fans: 4, team: 3, boast: true }, 'Zawodnicy podchwycili hasło – w szatni pewność siebie.')] },
      { t: 'Studź emocje', outs: [ou(2, { board: 3, fans: -2 }, 'Rozsądnie – choć kibice chcieli świętować.'), ou(1, { board: 2, team: 2 }, 'Zawodnicy docenili spokój.')] }] },
  { id: 'approach', cat: 'Prasa', follow: true, title: 'Media łączą Cię z innym klubem', text: () => { const c = S.approach != null ? club(S.approach) : null; return `${c ? c.name : 'Inny klub'}: trener zwolniony, a dziennikarze twierdzą, że jesteś głównym kandydatem do przejęcia drużyny. Zarząd i kibice czekają na Twoją reakcję.`; },
    choices: [{ t: 'Dementuj – jestem lojalny wobec klubu', mem: 'honest', outs: [ou(3, { board: 5, fans: 4, press: 1 }, 'Kibice skandują Twoje nazwisko.'), ou(1, { board: 3, fans: 2, press: -2 }, 'Dziennikarze wytykają, że tak samo mówili Twoi poprzednicy.')] },
      { t: '„Nie wykluczam niczego”', hint: 'zarząd będzie urażony', fn: () => { const c = S.approach != null ? club(S.approach) : null; if (c && c.id !== S.user) offerJob(c, 'oficjalnie składa Ci ofertę'); return { board: -7, fans: -5, press: 3 }; }, r: 'Telefon zadzwonił – ale w Twoim klubie zrobiło się chłodno.' },
      { t: 'Bez komentarza', outs: [ou(2, { press: -3 }, 'Spekulacje trwają.'), ob(1, { press: -3, board: -4 }, 'Milczenie odebrano jako sygnał, że chcesz odejść.')] }] },
  { id: 'foreigninterest', cat: 'Kariera', w: 1, ctx: () => S.mgr.ovr >= 50 ? {} : null, title: 'Zainteresowanie z zagranicy', text: ['Media donoszą, że interesuje się Tobą zagraniczny klub. Dziennikarze pytają o Twoją przyszłość.', 'Zagraniczna prasa pisze o Tobie jako o kandydacie na trenera ambitnego klubu. Telefony dziennikarzy się urywają.'],
    choices: [{ t: '„Jestem tu szczęśliwy”', mem: 'honest', outs: [ou(3, { fans: 5, board: 4 }, 'Kibice i zarząd doceniają lojalność.'), ou(1, { fans: 3, board: 2, press: -2 }, 'Dziennikarze nie wierzą: „każdy trener tak mówi”.')] },
      { t: '„Nigdy nie mów nigdy”', outs: [ou(2, { board: -7, press: 4, mgr: 0.5, team: -2 }, 'Twoje nazwisko krąży po rynku, ale szatnia zaczęła się zastanawiać.'), ou(1, { board: -2, press: 3, mgr: 0.5 }, 'Prezes zrozumiał przekaz – i zaczął mówić o nowym kontrakcie dla Ciebie.')] }] },
  { id: 'n_tvdoc', cat: 'Prasa', w: 1, ctx: () => ({}), title: 'Serial dokumentalny',
    text: [() => `Platforma streamingowa chce nakręcić serial dokumentalny o klubie – kamery w szatni przez całą rundę. Oferuje ${money(evSp(6))}.`, () => `Producenci telewizyjni proponują serial „za kulisami” – ${money(evSp(6))} i promocja klubu na cały kraj, w zamian za dostęp do szatni.`],
    choices: [{ t: 'Zgódź się – pełny dostęp', fn: () => ({ cash: evSp(6) }), outs: [ou(2, { press: 6, fans: 3, team: -2 }, 'Serial zbiera dobre recenzje, choć zawodnicy czują się obserwowani.'), ou(1, { press: 6, fans: 5, team: 2 }, 'Zawodnicy pokochali kamery – serial to hit.'), ob(c => 1 + (strictness() > 2 ? 1 : 0), { press: 2, team: -6 }, 'Kamery nagrały Twoją ostrą przemowę w przerwie – fragment krąży po sieci.')] },
      { t: 'Tak, ale bez szatni', outs: [ou(2, () => ({ cash: evSp(3), press: 3 }), 'Serial powstanie – w wersji „light”.'), ou(1, { press: -1 }, 'Producenci zrezygnowali – bez szatni to nie to samo.')] },
      { t: 'Odmów', fx: { team: 2, press: -2 }, r: 'Szatnia zostaje szatnią.' }] },
  { id: 'n_pundit', cat: 'Prasa', w: 2, ctx: () => withP(p => p.st.apps > 3 && p.form < 45), title: 'Ekspert nie zostawia suchej nitki',
    text: [c => `Ekspert telewizyjny, były reprezentant kraju, nie zostawił suchej nitki na grze zawodnika – ${c.p.n} to według niego „najsłabsze ogniwo ligi”.`, c => `W niedzielnym studiu padło: „${c.p.n} nie powinien grać nawet w pierwszej lidze”. Dziennikarze pytają o Twoje zdanie.`],
    choices: [{ t: 'Obroń zawodnika publicznie', outs: [ou(3, { player: 8, press: -2 }, 'Zawodnik wie, że może na Ciebie liczyć.'), ou(1, { player: 10, form: 3 }, 'Zawodnik odpowiedział na boisku – świetny trening, nowa energia.'), ob(1, { player: 6, press: -5 }, 'Ekspert odpowiedział jeszcze ostrzej – wojna w mediach trwa.')] },
      { t: '„Ekspert ma trochę racji”', mem: 'strict', outs: [ou(c => trt(c.p, 'pro') >= 14 ? 2.5 : 0.7, { player: -2, form: 6, crit: true }, 'Zawodnik wziął to jako wyzwanie.'), ou(2, { player: -10, press: 3, crit: true }, 'Szczerze – ale zawodnik to zapamięta.'), ob(c => trt(c.p, 'tem') >= 14 ? 2.5 : 0.5, { player: -16, team: -2, crit: true }, 'Zawodnik czuje się zdradzony – koledzy też patrzą krzywo.')] },
      { t: 'Bez komentarza', fx: { player: -3 }, r: 'Zawodnik liczył na wsparcie.' }] },
  { id: 'n_titlerace', cat: 'Prasa', w: 3, ctx: () => inSeason() && evLeft() <= 10 && evRow().pos <= 2 && evRow().P >= 15 ? {} : null, title: 'Walka o tytuł',
    text: ['Końcówka sezonu i walka o tytuł. Media pytają, czy drużyna wytrzyma presję.', 'Na finiszu sezonu drużyna jest w ścisłej czołówce. Dziennikarze przyjechali na trening tłumnie.'],
    choices: [{ t: '„Presja to przywilej”', outs: [ou(c => sqT('pre') / 4, { team: 3, fans: 4, boast: true }, 'Zawodnicy wyprostowali plecy.'), ob(c => (20 - sqT('pre')) / 5, { team: -3, fans: 3, boast: true }, 'Słowa zamiast dodać skrzydeł, przygniotły kilku zawodników.')] },
      { t: '„Faworytem jest rywal”', outs: [ou(2, { team: 3, press: 1 }, 'Drużyna gra bez presji.'), ou(1, { team: 1, fans: -3 }, 'Kibice są zawiedzeni brakiem ambicji.')] },
      { t: 'Zamknij treningi przed mediami do końca sezonu', fx: { press: -5, team: 4 }, r: 'Twierdza – pełna koncentracja.', mem: { jour: -1 } }] },

  /* ===================== MEDIA SPOŁECZNOŚCIOWE ===================== */
  { id: 'socialpost', cat: 'Media społecznościowe', w: 2, ctx: () => withP(p => p.mor < 50),
    title: 'Burza w social mediach', text: [c => `${c.p.n} opublikował wpis sugerujący, że nie czuje się doceniany w klubie.`, c => `„Niektórzy tu nie widzą mojej pracy” – ${c.p.n} wrzucił do sieci wymowny wpis. Kibice już się kłócą w komentarzach.`],
    choices: [{ t: 'Porozmawiaj z nim w cztery oczy', hint: 'nie wszyscy dają się przekonać', outs: [ou(c => trt(c.p, 'loy') > 7 ? 3 : 1, { player: 8 }, 'Wyjaśniliście sobie sprawę.'), ob(c => trt(c.p, 'loy') <= 7 ? 2 : 0.6, { player: -4, press: -3 }, 'Rozmowa nic nie dała – zawodnik udzielił kolejnego wywiadu.')] },
      { t: 'Ukarz go publicznie', mem: 'strict', outs: [ou(2, { player: -12, press: 3, team: 2, crit: true }, 'Jasny sygnał dla wszystkich.'), ob(c => trt(c.p, 'tem') >= 14 ? 2 : 0.5, { player: -18, team: -2, press: -3, crit: true }, 'Zawodnik odpowiedział kolejnym wpisem – tym razem o Tobie.')] },
      { t: 'Wystaw go na listę transferową', outs: [ou(3, { player: -15, list: true, fans: -2 }, 'Mleko się rozlało.'), ob(1, { player: -15, list: true, fans: -5 }, 'Kibice stanęli po stronie zawodnika.')] }] },
  { id: 'n_viral', cat: 'Media społecznościowe', w: 2, ctx: () => withP(p => p.form >= 60 && p.st.apps > 0), title: 'Wiralowe nagranie',
    text: [c => `Nagranie z treningu, na którym ${c.p.n} strzela gola przewrotką, ma miliony wyświetleń.`, c => `${c.p.n} stał się gwiazdą internetu – filmik z jego zagraniem obejrzało pół kraju.`],
    choices: [{ t: 'Wykorzystaj w kampanii klubu', fn: () => ({ cash: evSp(2) }), outs: [ou(2, { fans: 3, player: 4 }, 'Kampania się niesie – sklep klubowy notuje rekord.'), ob(1, { player: 6, form: -3, team: -2 }, 'Zawodnik poczuł się gwiazdą – i niestety tak się zachowuje.')] },
      { t: 'Konkurs dla kibiców: „powtórz to”', outs: [ou(2, { fans: 5, press: 2 }, 'Tysiące nagrań kibiców – świetna zabawa.'), ou(1, { fans: 3 }, 'Konkurs przeszedł bez większego echa.')] },
      { t: '„Liczy się mecz, nie trening”', outs: [ou(2, { player: -2, team: 1 }, 'Zawodnik zrozumiał przekaz.'), ou(1, { player: 1, form: 2 }, 'Zawodnik przytaknął i od razu wrócił do pracy.')] }] },
  { id: 'n_hate', cat: 'Media społecznościowe', w: 3, ctx: () => lastLoss() ? withP(p => p.st.apps > 2) : null, title: 'Fala hejtu',
    text: [c => `Po ostatniej porażce ${c.p.n} jest celem fali hejtu w mediach społecznościowych – pojawiły się nawet groźby.`, c => `Internauci obwiniają za porażkę jednego zawodnika: ${c.p.n} dostaje setki obraźliwych wiadomości.`],
    choices: [{ t: 'Stań publicznie w jego obronie', outs: [ou(2, { player: 10, press: 3 }, 'Zawodnik czuje wsparcie klubu.'), ob(1.5, { player: 8, fans: -5 }, 'Część kibiców uważa, że bronisz słabego zawodnika – hejt przenosi się na Ciebie.')] },
      { t: 'Zgłoś sprawę policji i platformom', outs: [ou(3, { player: 5, press: 2 }, 'Klub pokazał, że chroni swoich zawodników.'), ob(1, { player: 2, press: -2, fans: -2 }, 'Część mediów i kibiców zarzuca klubowi przesadę – „to tylko komentarze”.')] },
      { t: 'Poradź mu, by na jakiś czas zniknął z sieci', outs: [ou(c => trt(c.p, 'pre') >= 12 ? 3 : 1.5, { player: 4, form: 4 }, 'Cisza dobrze mu zrobiła – skupił się na treningu.'), ob(c => trt(c.p, 'pre') < 10 ? 2 : 0.7, { player: -8, form: -3 }, 'Zawodnik czuje się zostawiony sam sobie.')] }] },
  { id: 'n_adminjoke', cat: 'Media społecznościowe', w: 2, ctx: () => ({}), title: 'Mem, który poszedł za daleko',
    text: ['Administrator klubowego profilu opublikował mem kpiący z ligowego rywala. Internet się śmieje, ale rywal żąda przeprosin.', 'Klubowy profil zakpił z wpadki ligowego rywala. Wpis ma tysiące udostępnień – i oficjalną skargę rywala.'],
    choices: [{ t: 'Przeproś', outs: [ou(2, { press: 3, fans: -3 }, 'Sprawa zamknięta – kibice uważają, że przeprosiny były zbędne.'), ou(1, { press: 4, fans: -1 }, 'Rywal przyjął przeprosiny z klasą.')] },
      { t: '„Mamy dystans do siebie” – zostaw wpis', mem: 'rival', outs: [ou(2, { fans: 5, press: -3 }, 'Kibice zachwyceni, media mniej.'), ob(1, { board: -4, press: -4 }, 'Liga wszczęła postępowanie dyscyplinarne.'), ou(1, { fans: 7, spons: 0.02 }, 'Profil zyskał tysiące obserwujących – sponsorzy zachwyceni.')] },
      { t: 'Zwolnij administratora', fx: { press: 4, fans: -4, board: 2 }, r: 'Zarząd i media chwalą stanowczość, kibice uważają, że zrobiono z niego kozła ofiarnego.' }] },
  { id: 'n_dreampost', cat: 'Media społecznościowe', w: 2, ctx: () => withP(p => traits(p).amb >= 13 && p.ovr >= teamLevel(userClub()) - 2), title: 'Wymowny wpis',
    text: [c => `${c.p.n} wrzucił do sieci zdjęcie w koszulce wielkiego zagranicznego klubu z podpisem „marzenia się spełniają?”.`, c => `${c.p.n} polubił w sieci wpis o swoim możliwym transferze do zagranicznego potentata. Kibice są wściekli.`],
    choices: [{ t: 'Ukarz publicznie', mem: 'strict', outs: [ou(2, { player: -8, fans: 3, crit: true }, 'Kibice zadowoleni, zawodnik obrażony.'), ob(c => trt(c.p, 'tem') >= 13 ? 2 : 0.6, { player: -14, team: -2, crit: true }, 'Zawodnik w odpowiedzi usunął klubowe barwy z profilu.')] },
      { t: 'Porozmawiaj z nim', outs: [ou(c => trt(c.p, 'loy') >= 11 ? 3 : 1.5, { player: 3 }, '„To był żart, trenerze” – wpis zniknął.'), ob(c => trt(c.p, 'amb') >= 15 ? 2 : 1, { player: -4 }, 'Zawodnik przyznał, że marzy o odejściu.')] },
      { t: 'Obróć to w żart na klubowym profilu', outs: [ou(2, { fans: 2, press: 2 }, 'Internet docenił poczucie humoru klubu.'), ob(1.5, { fans: -2, player: -4 }, 'Kibice nie zrozumieli żartu, a zawodnik poczuł się wyśmiany.')] }] },
];

/* ---------- hierarchia szatni i grupy ---------- */
function squadLeaders() {
  const ps = uPlayers().filter(p => p.age >= 24);
  const sc = p => traits(p).pre + traits(p).pro * 0.6 + Math.min(10, p.car.apps / 30) + (p.age - 24) * 0.4 + (S.captain === p.id ? 8 : 0) + (p.ovr - teamLevel(userClub())) * 0.3;
  return ps.sort((a, b) => sc(b) - sc(a)).slice(0, 3);
}
function squadCliques() {
  const by = {}, home = S.countries[userClub().cc].nat;
  for (const p of uPlayers()) if (p.nat !== home) (by[p.nat] = by[p.nat] || []).push(p);
  return Object.entries(by).filter(([, ps]) => ps.length >= 3).map(([nat, ps]) => ({ nat, ps }));
}
function squadDynamicsWeek() {
  const ut = userClub(), L = squadLeaders();
  for (const l of L) { const k = 0.015 + traits(l).pre / 800; for (const p of ut.players) if (p !== l) p.mor = clamp(p.mor + (l.mor - p.mor) * k, 0, 100); }
  for (const g of squadCliques()) { const m = avg(g.ps.map(p => p.mor)); for (const p of g.ps) p.mor = clamp(p.mor + (m - p.mor) * 0.1, 0, 100); }
  const gone = (S.leaderIds || []).map(pget).filter(p => p && p.tid !== S.user && p.tid !== -3);
  for (const p of gone) { for (const q of ut.players) q.mor = clamp(q.mor - 4, 0, 100); msg('Odejście lidera', `${p.n} był jednym z liderów szatni – jego odejście odbiło się na nastrojach w zespole.`); }
  S.leaderIds = L.map(p => p.id);
}
function declineOfferMeta(o) {
  const p = pget(o.pid), b = club(o.from), ut = userClub(); if (!p || !b) return;
  if (b.rep >= ut.rep + 3 && traits(p).amb >= 12 && rnd() < 0.7) { p._suitor = b.name; metaInit(); pushEvent(EVENTS.find(e => e.id === 'unsettled'), { p }); }
}

/* spotkania z zawodnikami (sami proszą o rozmowę) – pamiętają złamane obietnice i publiczną krytykę */
function meetingEvent(p) {
  const status = playerStatus(p), t = traits(p);
  const unhappyTime = p.pt < 0.35 && (status === 'Kluczowy' || status === 'Podstawowy' || t.amb >= 13);
  const lied = since(p._lied) < 240, crit = since(p._crit) < 150, broken = S.mem.liar >= 2 || lied;
  const trust = () => 4 + Math.min(3, memv('honest') * 0.4) + (since(p._kept) < 200 ? 2 : 0), doubt = () => (lied ? 5 : 0) + Math.max(0, S.mem.liar - 1) * 1.2;
  const extra = lied ? ` ${pick(['Nie zapomniał, że ostatnio obiecałeś mu grę i słowa nie dotrzymałeś.', '„Ostatnim razem też coś mi Pan obiecał” – rzuca na wstępie.'])}` : broken ? ' W szatni mówi się, że nie dotrzymujesz obietnic.' : '';
  return {
    id: 'meeting', cat: 'Rozmowa', title: `${p.n} prosi o rozmowę`, ctx: { p },
    text: (unhappyTime ? pick([`${p.n} jest niezadowolony z liczby minut: „Trenerze, czuję, że zasługuję na więcej”.`, `${p.n}: „Siedzę na ławce, a przecież trenuję lepiej niż inni. Co mam zrobić?”`, `${p.n} puka do gabinetu: „Długo jeszcze mam czekać na swoją szansę?”`])
      : pick([`${p.n} nie czuje się w klubie najlepiej i chce porozmawiać o swojej przyszłości.`, `${p.n} przyszedł z agentem – mówi, że stracił motywację.`, `${p.n} prosi o szczerą rozmowę: „Coś tu przestało działać”.`])) + extra + (crit ? ' Wciąż pamięta też Twoją publiczną krytykę.' : ''),
    choices: [
      { t: 'Obiecaj regularną grę', hint: broken ? 'może Ci nie uwierzyć' : 'musisz dotrzymać słowa', outs: [
        ou(trust, { player: 12, promise: true, samepos: -3 }, 'Zawodnik trzyma Cię za słowo: 3 tygodnie regularnej gry.'),
        ob(doubt, { player: -5 }, lied ? '„Już raz mnie Pan oszukał” – zawodnik nie wierzy w ani jedno słowo.' : '„Już to słyszałem” – zawodnik Ci nie uwierzył.')] },
      { t: 'Zaproponuj nowy kontrakt', fn: c => { if (c.p.con >= 4) return { player: 2 }; const r = renewContract(c.p.id, 3); c.x = { ok: r.ok ? 1 : 0 }; return r.ok ? { player: 7 } : { player: -5 }; }, r: c => evX(c).ok ? 'Nowy kontrakt podpisany – zawodnik jest spokojniejszy.' : 'Rozmowa o pieniądzach nic nie dała.' },
      { t: 'Powiedz, że musi walczyć o miejsce', hint: 'zależy od charakteru', mem: 'honest', outs: [
        ou(c => (trt(c.p, 'pro') >= 12 || trt(c.p, 'tem') <= 7 ? 3 : 1) + (crit ? -0.5 : 0), { player: 3, form: 5 }, 'Twarda, ale uczciwa rozmowa – zawodnik wziął się do pracy.'),
        ob(c => (trt(c.p, 'pro') >= 12 || trt(c.p, 'tem') <= 7 ? 0.6 : 2.5) + (crit ? 1 : 0), { player: -10 }, 'Zawodnik wyszedł z gabinetu wściekły.')] },
      { t: 'Zgódź się na transfer', fx: { player: 5, list: true, team: -2 }, r: 'Zawodnik trafia na listę transferową.' },
    ],
  };
}
function contractEvent(p) {
  const g = grudge(p);
  const sour = { w: g ? 1.5 : 0, fn: c => { c.p._noRenew = absDay() + 30; return { player: -4 }; }, r: '„Nie zapomniałem, jak mnie Pan potraktował” – zawodnik na razie nie chce rozmawiać o kontrakcie.', bad: true };
  return {
    id: 'contract', cat: 'Kontrakty', title: 'Kontrakt kończy się', ctx: { p },
    text: `${p.n} ma umowę ważną do końca sezonu. Jego agent pyta o przedłużenie (żądanie: ${money(renewDemand(p, 3))}/tydz.).` + (g ? ' Zawodnik nie jest jednak do Ciebie przekonany.' : ''),
    choices: [
      { t: 'Przedłuż na 3 lata', outs: [ou(3, c => { const r = renewContract(c.p.id, 3); c.x = { ok: r.ok ? 1 : 0, m: r.msg }; return r.ok ? { player: 7 } : { player: -8, press: -2 }; }, c => evX(c).ok ? 'Kontrakt przedłużony na 3 lata.' : `Negocjacje nieudane: ${evX(c).m}`), sour] },
      { t: 'Przedłuż na 1 rok', outs: [ou(3, c => { const r = renewContract(c.p.id, 1); c.x = { ok: r.ok ? 1 : 0, m: r.msg }; return r.ok ? { player: 2 } : { player: -6 }; }, c => evX(c).ok ? 'Krótka umowa podpisana.' : `Negocjacje nieudane: ${evX(c).m}`), sour] },
      { t: 'Nie przedłużaj', fx: { player: -12 }, r: 'Zawodnik odejdzie po sezonie.' },
    ],
  };
}

/* ---------- obsługa kolejki wydarzeń ---------- */
function pushEvent(e, ctx) {
  ctx = ctx || {};
  const ev = { uid: S.nextId++, id: e.id, cat: e.cat, title: evText(e.title, ctx), text: evText(e.text, ctx), choices: e.choices.map(c => evText(c.t, ctx)), hints: e.choices.map(c => evText(c.hint, ctx) || ''), ctx: ctxRef(ctx) };
  S.pending.push(ev); S.evSeen[e.id] = S.season; S.evCat[e.cat] = absDay();
  S.evCount = S.evCount || {}; S.evCount[e.id] = (S.evCount[e.id] || 0) + 1;
  msg(`📌 ${ev.title}`, ev.text + ' (wymaga decyzji – Pulpit)'); ev.mid = S.inbox[0].id;
}
// kontekst w zapisie: identyfikatory zawodników + małe dane (x) dla łańcuchów wydarzeń
const ctxRef = c => { const r = { p: c && c.p ? c.p.id : null, q: c && c.q ? c.q.id : null }; if (c && c.x) r.x = c.x; return r; };
const ctxDeref = c => { const r = { p: c.p != null ? pget(c.p) : null, q: c.q != null ? pget(c.q) : null }; if (c.x) r.x = Object.assign({}, c.x); return r; };
function eventDef(ev) {
  if (ev.id === 'meeting') return meetingEvent(pget(ev.ctx.p));
  if (ev.id === 'contract') return contractEvent(pget(ev.ctx.p));
  return EVENTS.find(e => e.id === ev.id);
}
// losowanie wyniku wg wag (wagi mogą zależeć od kontekstu)
function evPickOut(outs, ctx) {
  const ws = outs.map(o => { const w = typeof o.w === 'function' ? o.w(ctx) : (o.w == null ? 1 : o.w); return Math.max(0, +w || 0); });
  const tot = ws.reduce((a, b) => a + b, 0); if (tot <= 0) return outs[0];
  let r = rnd() * tot; for (let i = 0; i < outs.length; i++) { r -= ws[i]; if (r < 0) return outs[i]; }
  return outs[outs.length - 1];
}
// skutek: fn (wywołanie) + fx (stałe) – wartości liczbowe sumują się
function evFx(o, ctx) {
  const a = o.fn ? o.fn(ctx) || {} : {}, b = o.fx ? (typeof o.fx === 'function' ? o.fx(ctx) : o.fx) || {} : {};
  return mergeFx(a, b);
}
function mergeFx(a, b) {
  const r = Object.assign({}, a || {});
  for (const [k, v] of Object.entries(b || {})) r[k] = typeof v === 'number' && typeof r[k] === 'number' ? r[k] + v : v;
  return r;
}
// zaplanowanie dalszego ciągu: [id, dniOd, dniDo, szansa]; 0–0 dni = od razu (np. kontroferta w negocjacjach)
function evFollow(fl, ctx) {
  if (!fl) return; const [fid, a, b, pr] = fl;
  if (pr != null && rnd() >= pr) return;
  const e = EVENTS.find(x => x.id === fid); if (!e) return;
  if (!a && !b) { pushEvent(e, e.ctxFn ? Object.assign(e.ctxFn(), ctx.x ? { x: ctx.x } : {}) : ctx); return; }
  if (S.followups.some(f => f.id === fid)) return;
  S.followups.push({ id: fid, due: absDay() + ri(a, b), ctx: ctxRef(ctx) });
}
function resolveEvent(uid, ci) {
  const ev = S.pending.find(e => e.uid === uid); if (!ev) return null;
  S.pending = S.pending.filter(e => e !== ev);
  const ctx = ctxDeref(ev.ctx);
  const def = eventDef(ev); if (!def) return { r: 'Sprawa nieaktualna.', fx: [] };
  if (def.ext && ctx.p && (ctx.p.tid < 0 || ctx.p.tid === S.user)) return { r: 'Sprawa nieaktualna – zawodnik zmienił już klub.', fx: [] };
  if ((ev.ctx.p != null && !ctx.p) || (ctx.p && !def.ext && ctx.p.tid !== S.user && ctx.p.tid !== -3)) return { r: 'Sprawa nieaktualna – zawodnik nie jest już w klubie.', fx: [] };
  if (ctx.p && ctx.p.tid === -3 && !S.acad.youth.includes(ctx.p)) return { r: 'Sprawa nieaktualna – junior nie jest już w akademii.', fx: [] };
  const ch = def.choices[ci] || def.choices[0];
  let o = ch, risky = false, fx;
  if (ch.outs && ch.outs.length) {
    o = evPickOut(ch.outs, ctx); risky = !!o.bad;
    const base = evFx(ch, ctx);
    fx = mergeFx(base, evFx(o, ctx));
  } else {
    if (ch.alt && rnd() < evText(ch.alt.p, ctx)) { o = ch.alt; risky = true; }
    fx = evFx(o, ctx);
  }
  const out = applyFx(fx || {}, ctx);
  memAdd(ch.mem, ctx); if (o !== ch) memAdd(o.mem, ctx);
  const rt = evText(o.r != null ? o.r : ch.r, ctx) || '';
  const im = ev.mid != null && S.inbox.find(m => m.id === ev.mid); if (im) { im.body = im.body.replace(' (wymaga decyzji – Pulpit)', '') + `\n✔ Decyzja: ${ev.choices[ci] != null ? ev.choices[ci] : evText(ch.t, ctx)} – ${rt}`; im.read = true; }
  const fl = o !== ch && o.follow !== undefined ? o.follow : (!risky ? ch.follow : null);
  evFollow(fl, ctx);
  saveSoon();
  return { r: rt, fx: out, risky };
}
function eventsWeek(d) {
  metaInit();
  const ut = userClub(), now = absDay();
  // kapitan wpływa na szatnię
  const cap = S.captain != null ? pget(S.captain) : null;
  if (cap && cap.tid !== S.user) { S.captain = null; msg('Kapitan odszedł', 'Drużyna nie ma kapitana – wybierz nowego w karcie zawodnika.'); }
  else if (cap) for (const p of ut.players) p.mor = clamp(p.mor + (cap.mor - p.mor) * (0.03 + traits(cap).pro / 400), 0, 100);
  squadDynamicsWeek();
  // kibice/prasa → zarząd, merchandising
  S.board.conf = clamp(S.board.conf + (S.fans - 55) / 220 + (S.press - 55) / 330, 0, 100);
  const merch = Math.round(ut.spons * 0.12 * (S.fans / 60)); ut.bal += merch; ut.fin.inc += merch;
  S.press = clamp(S.press + (55 - S.press) * 0.03, 0, 100);
  if (S.winBonus && S.winBonus.until < now) S.winBonus = null;
  // obietnice (3 tygodnie, wymagane ≥55% minut)
  if (S.leagues[ut.lg].lsMap[d.ls] === -1) for (const pr of S.promises) pr.until += 6;   // bez meczów (przerwa) termin obietnicy stoi
  for (const pr of S.promises.slice()) {
    const p = pget(pr.pid);
    if (!p || p.tid !== S.user) { S.promises = S.promises.filter(x => x !== pr); continue; }
    if (now >= pr.until) {
      S.promises = S.promises.filter(x => x !== pr);
      if (p.pt >= 0.55) { p.mor = clamp(p.mor + 8, 0, 100); S.mem.honest++; p._kept = now; p._lied = null; msg('Obietnica dotrzymana', `${p.n} docenia, że dotrzymałeś słowa.`); }
      else { p.mor = clamp(p.mor - 25, 0, 100); S.mem.liar++; p._lied = now; for (const q of ut.players) q.mor = clamp(q.mor - 3, 0, 100); S.press = clamp(S.press - 3, 0, 100); msg('Złamana obietnica', `${p.n} czuje się oszukany – obiecałeś mu grę. Szatnia patrzy na Ciebie podejrzliwie.`); }
    }
  }
  if (S.pending.length >= 3) return;
  // zaplanowane konsekwencje
  const due = S.followups.find(f => f.due <= now);
  if (due) {
    S.followups = S.followups.filter(f => f !== due);
    const e = EVENTS.find(x => x.id === due.id);
    let ctx = e && e.ctxFn ? e.ctxFn() : ctxDeref(due.ctx);
    if (e && e.ctxFn && due.ctx.x) ctx.x = Object.assign({}, due.ctx.x);
    if (e && (!due.ctx.p || (ctx.p && ctx.p.tid === S.user))) { pushEvent(e, ctx); return; }
  }
  // zawodnicy proszą o rozmowę (maks. raz na 2 tygodnie, każdy co 40 dni)
  if (!S.lastMeet || now - S.lastMeet >= 14) {
    const unhappy = ut.players.filter(p => p.mor < 33 && !S.pending.some(e => e.ctx.p === p.id) && !S.promises.some(x => x.pid === p.id) && (!p._meet || now - p._meet >= 40));
    if (unhappy.length && rnd() < 0.55) { const p = pick(unhappy); p._meet = now; S.lastMeet = now; pushEvent(meetingEvent(p), { p }); return; }
  }
  if (d.ls >= 18 && d.ls <= 34) {
    const exp = ut.players.filter(p => p.con <= 1 && !p.loan && p.age <= 32 && p.ovr >= teamLevel(ut) - 5 && (p._cev || 0) !== S.season);
    S.cev = S.cev && S.cev.s === S.season ? S.cev : { s: S.season, n: 0 };
    if (exp.length && S.cev.n < 2 && rnd() < 0.5) { const p = exp.sort((a, b) => b.ovr - a.ovr)[0]; p._cev = S.season; S.cev.n++; pushEvent(contractEvent(p), { p }); return; }
  }
  // losowe wydarzenie: każde maks. raz na sezon, kategoria co 3 tygodnie, rzadziej powtarzane; globalnie nie częściej niż co ~10 dni (w przerwie zimowej – co 3 tygodnie)
  const brk = S.leagues[ut.lg].lsMap[d.ls] === -1;
  if (S.lastRandEv != null && now - S.lastRandEv < (brk ? 21 : 10)) return;
  if (rnd() < 0.36) {
    S.evCount = S.evCount || {};
    const busy = new Set(S.pending.map(e => e.ctx.p).filter(x => x != null));
    const opts = EVENTS.filter(e => !e.follow && S.evSeen[e.id] !== S.season && (!S.evCat[e.cat] || now - S.evCat[e.cat] >= 21)).map(e => { let c = null; try { c = e.ctx(d); } catch (err) { c = null; } return { e, c }; }).filter(x => x.c && !(x.c.p && busy.has(x.c.p.id)));
    // nowe (jeszcze niewidziane) wydarzenia losowane nieco chętniej, często powtarzane – rzadziej
    if (opts.length) { const x = wpick(opts, o => (typeof o.e.w === 'function' ? o.e.w() : o.e.w || 1) * (S.evCount[o.e.id] ? 1 : 1.3) / (1 + (S.evCount[o.e.id] || 0) * 0.6)); pushEvent(x.e, x.c); S.lastRandEv = now; }
  }
}

/* ---------- mecz: kibice, prasa, serie, nagłówki ---------- */
const HEAD_W = ['{c} rozbija rywala!', 'Pewne zwycięstwo {c}', '{c} górą w meczu z {o}', 'Trzy punkty dla {c}!', '{o} bez argumentów w starciu z {c}', 'Kolejny krok {c} w górę tabeli'];
const HEAD_L = ['Bolesna porażka {c}', '{c} bez szans z {o}', 'Kryzys w {c}?', 'Kibice {c} kręcą głowami', '{o} punktuje słabości {c}', 'Czarny dzień {c}'];
const HEAD_D = ['Podział punktów w meczu {c} – {o}', '{c} tylko remisuje', 'Remis, który nikogo nie zadowala', 'Bez rozstrzygnięcia: {c} – {o}'];
function afterMatchMeta(m, x, mine, opp, gd) {
  metaInit();
  const r = gd > 0 ? 'W' : gd < 0 ? 'L' : 'D';
  S.results.push(r); if (S.results.length > 40) S.results.shift(); S.lastUM = absDay();
  S.lastMatch = { o: opp.t.id, home: m && m.home === mine ? 1 : 0, gf: mine.goals, ga: opp.goals };
  const st = S.stats; st.games++; if (r === 'W') st.wins++;
  st.unbeaten = r === 'L' ? 0 : st.unbeaten + 1; st.bestUnbeaten = Math.max(st.bestUnbeaten, st.unbeaten);
  const big = Math.abs(gd) >= 3, upset = opp.t.rep - mine.t.rep >= 8;
  S.fans = clamp(S.fans + (r === 'W' ? 2 + (big ? 2 : 0) + (upset ? 3 : 0) : r === 'L' ? -3 - (big ? 3 : 0) : 0), 0, 100);
  S.press = clamp(S.press + (r === 'W' ? 1 : r === 'L' ? -1.5 : 0), 0, 100);
  if (S.boast) { S.boast = false; if (r !== 'W') { S.fans = clamp(S.fans - (r === 'L' ? 7 : 4), 0, 100); S.press = clamp(S.press - (r === 'L' ? 7 : 4), 0, 100); S.mem.liar++; msg('Prasa', 'Media przypominają Twoje butne zapowiedzi… Wizerunkowa wpadka.'); } else { S.fans = clamp(S.fans + 3, 0, 100); mgrGain(0.2); } }
  // premia za zwycięstwo obiecana szatni (wydarzenie „Rada drużyny chce premii”)
  if (S.winBonus && m && m.comp === 'L') {
    const ut = userClub();
    if (r === 'W') { ut.bal -= S.winBonus.amt; ut.fin.exp += S.winBonus.amt; for (const p of ut.players) p.mor = clamp(p.mor + 3, 0, 100); msg('Premia za zwycięstwo', `Zawodnicy otrzymali obiecaną premię (${money(S.winBonus.amt)}).`); }
    else for (const p of ut.players) p.mor = clamp(p.mor - 2, 0, 100);
    S.winBonus = null;
  }
  const pool = r === 'W' ? HEAD_W : r === 'L' ? HEAD_L : HEAD_D;
  news('📰 ' + pick(pool).replace(/\{c\}/g, mine.t.name).replace(/\{o\}/g, opp.t.name) + ` (${mine.goals}:${opp.goals})`);
  checkAchievements();
}

/* ---------- konferencja prasowa ---------- */
// ton odpowiedzi: 'calm' | 'bold' | 'harsh' | 'evasive' – powtarzanie tego samego tonu słabnie
function pressConference(x) {
  metaInit();
  const mine = x.user === 'h' ? x.h : x.a, opp = x.user === 'h' ? x.a : x.h;
  if (x.opts.comp === 'P') return null;
  const big = x.opts.comp !== 'L' && x.opts.comp !== 'F' || (opp.rep || 50) >= (mine.rep || 50) + 6 || !!(typeof derbyName === 'function' && derbyName(mine.id, opp.id));
  const pm = (S.settings && S.settings.press) || 'rare';
  const huge = !!(typeof derbyName === 'function' && derbyName(mine.id, opp.id)) || (x.opts.comp !== 'L' && x.opts.comp !== 'F' && x.opts.comp !== 'P' && /Finał|Półfinał|Ćwierćfinał|faza ligowa 1\//.test(x.opts.label || ''));
  if (pm === 'off' || (pm === 'rare' && (!huge || rnd() > 0.7)) || (pm === 'on' && !big && rnd() > 0.3)) return null;
  const fav = (mine.rep || 50) >= (opp.rep || 50) + 4, ps = mine.players || [], star = ps.slice().sort((a, b) => b.ovr - a.ovr)[0];
  const inj = ps.filter(p => p.inj).sort((a, b) => b.ovr - a.ovr)[0], losing = lastRes(3).filter(r => r === 'L').length >= 2, winning = lastRes(3).filter(r => r === 'W').length >= 3;
  const listed = ps.find(p => p.listed), young = ps.filter(p => p.age <= 20 && p.st.apps > 0).sort((a, b) => b.ovr - a.ovr)[0];
  const qs = [
    { q: `Mecz: ${x.h.name} – ${x.a.name}. Kto jest faworytem?`, a: [['„Szanujemy rywala, ale gramy o zwycięstwo.”', 'calm', { team: 2, press: 1 }], [fav ? '„My. I udowodnimy to na boisku.”' : '„Oni – nie mamy nic do stracenia.”', 'bold', fav ? { team: 3, fans: 3, boast: true } : { team: 3, press: 1 }], ['„Wygramy, gwarantuję.”', 'bold', { fans: 5, press: 3, team: 2, boast: true }]] },
    { q: 'Jak ocenia Pan atmosferę w zespole?', a: [['„Jesteśmy jak rodzina.”', 'calm', { team: 2, press: 1 }], ['„Wszyscy muszą dać z siebie więcej.”', 'harsh', { team: -2, fans: 2, press: 2 }], ['„To zostaje w szatni.”', 'evasive', { press: -3, team: 1 }]] },
    { q: `Ile zostało do celu zarządu? ${S.board.text}`, a: [['„Idziemy zgodnie z planem.”', 'calm', { board: 2, press: 1 }], ['„Stać nas na więcej niż cel zarządu.”', 'bold', { fans: 4, board: 1, boast: true }], ['„Cele stawia zarząd, ja skupiam się na meczu.”', 'evasive', { board: -2 }]] },
  ];
  const dn = typeof derbyName === 'function' && mine.id != null ? derbyName(mine.id, opp.id) : null;
  if (dn) qs.push({ q: `${dn}! Co powie Pan kibicom przed tym meczem?`, a: [['„To dla nas mecz sezonu – damy z siebie wszystko.”', 'calm', { fans: 3, team: 2 }], ['„To miasto/region jest nasze. Pokażemy to na boisku.”', 'bold', { fans: 7, team: 3, press: 2, boast: true }], ['„To tylko trzy punkty, jak w każdym meczu.”', 'evasive', { fans: -5, press: -1 }]] }, { q: `${dn}! Co powie Pan kibicom przed tym meczem?`, a: [['„To dla nas mecz sezonu – damy z siebie wszystko.”', 'calm', { fans: 3, team: 2 }], ['„To miasto/region jest nasze. Pokażemy to na boisku.”', 'bold', { fans: 7, team: 3, press: 2, boast: true }], ['„To tylko trzy punkty, jak w każdym meczu.”', 'evasive', { fans: -5, press: -1 }]] });
  if (losing) qs.push({ q: 'Seria słabych wyników. Czy czuje się Pan zagrożony?', a: [['„Wierzę w ten zespół w 100%.”', 'calm', { team: 3, board: -1 }], ['„Zawodnicy zawodzą – czas na zmiany.”', 'harsh', { team: -5, fans: 3, board: 2 }], ['„Nie będę komentował plotek.”', 'evasive', { press: -4 }]] });
  if (winning) qs.push({ q: 'Seria zwycięstw – czy to drużyna na mistrzostwo?', a: [['„Krok po kroku.”', 'calm', { board: 2 }], ['„Tak, celujemy w tytuł!”', 'bold', { fans: 6, boast: true }], ['„Najpierw utrzymajmy formę.”', 'calm', { team: 1, press: 1 }]] });
  if (star) qs.push({ q: `Czy ${star.n} jest kluczem do sukcesu?`, p: star.id, a: [['„To lider, ale wygrywa drużyna.”', 'calm', { team: 2, player: 2 }], ['„Bez niego bylibyśmy innym zespołem.”', 'bold', { player: 8, team: -3 }], ['„Oczekuję od niego więcej.”', 'harsh', traits(star).pro >= 12 ? { player: 3, form: 4 } : { player: -9 }]] });
  if (inj) qs.push({ q: `${inj.n} jest kontuzjowany. Jak bardzo będzie go brakować?`, p: inj.id, a: [['„Mamy szeroką kadrę.”', 'calm', { team: 2, player: -2 }], ['„To ogromna strata.”', 'calm', { player: 4, team: -1 }], ['„Nie szukamy wymówek.”', 'harsh', { board: 2, fans: 1 }]] });
  if (listed) qs.push({ q: `Czy ${listed.n} odejdzie z klubu?`, p: listed.id, a: [['„Wszystko jest możliwe.”', 'evasive', { player: -3 }], ['„Chcę, żeby został.”', 'calm', { player: 6, fans: 2 }], ['„Nie jest już częścią moich planów.”', 'harsh', { player: -12, team: -2 }]] });
  if (young) qs.push({ q: `${young.n} zachwyca kibiców. Czy to przyszła gwiazda?`, p: young.id, a: [['„Ma ogromny potencjał.”', 'bold', { player: 6, fans: 3 }], ['„Musi jeszcze dużo pracować.”', 'harsh', traits(young).pro >= 12 ? { player: 2, form: 3 } : { player: -5 }], ['„Nie nakładajmy na niego presji.”', 'calm', { player: 2, press: 1 }]] });
  // dziennikarz z historią: odwołuje się do wcześniejszych relacji
  if (Math.abs(memv('jour')) >= 2) qs.push(memv('jour') > 0
    ? { q: 'Jacek Wrona: „Trenerze, po naszym ostatnim wywiadzie czytelnicy pytają – jaki jest Pana plan na ten mecz?”', a: [['„Panu zdradzę więcej niż innym – ale po meczu.”', 'calm', { press: 3 }], ['„Plan jest prosty: wygrać.”', 'bold', { fans: 3, boast: true }], ['„Bez szczegółów, proszę wybaczyć.”', 'evasive', { press: -1 }]] }
    : { q: 'Jacek Wrona: „Skoro nie rozmawia Pan z niektórymi dziennikarzami – czy tak samo traktuje Pan zawodników?”', a: [['„Rozmawiam z każdym, kto pyta uczciwie.”', 'calm', { press: 2 }], ['„Pańskie teksty mówią same za siebie.”', 'harsh', { press: -4, fans: 2 }], ['„Następne pytanie.”', 'evasive', { press: -2 }]] });
  const q = pickFresh(qs);
  return { q: q.q, star: q.p || null, a: q.a.map(([t, tone, fx]) => [t, fx, tone]) };
}
/* unikanie powtarzania tych samych pytań (pamięć 40 dni) */
function pickFresh(qs) {
  S.pqSeen = S.pqSeen || {}; const now = absDay(), key = q => q.q.replace(/[0-9:]+/g, '').slice(0, 40);
  const fresh = qs.filter(q => !(S.pqSeen[key(q)] > now - 40)), q = pick(fresh.length ? fresh : qs); S.pqSeen[key(q)] = now;
  for (const k in S.pqSeen) if (S.pqSeen[k] < now - 60) delete S.pqSeen[k];
  return q;
}
/* konferencja po meczu – pytanie zależne od przebiegu spotkania */
function postMatchPress(m, user) {
  if (!m || m.comp === 'P' || m.comp === 'F') return null;
  const me = user === 'h' ? m.home : m.away, op = me === m.home ? m.away : m.home, gd = me.goals - op.goals;
  const ev = [...me.scorers.map(g => ({ min: g.min, d: 1 })), ...op.scorers.map(g => ({ min: g.min, d: -1 }))].sort((a, b) => a.min - b.min);
  let run = 0, worst = 0; for (const e of ev) { run += e.d; worst = Math.min(worst, run); }
  const red = Object.values(me.rec).find(r => r.r), motm = m.motm && me.rec[m.motm.p.id] ? m.motm.p : null, dn = typeof derbyName === 'function' ? derbyName(me.t.id, op.t.id) : null;
  const big = m.comp !== 'L' || dn || Math.abs(gd) >= 3 || red || (worst <= -1 && gd > 0);
  const pm = (S.settings && S.settings.press) || 'rare';
  if (pm === 'off' || (pm === 'rare' && (!big || rnd() > 0.4)) || (pm === 'on' && !big && rnd() > 0.35)) return null;
  const qs = [];
  if (gd >= 3) qs.push({ q: `${me.goals}:${op.goals}! Czy to najlepszy mecz Pana drużyny w tym sezonie?`, a: [['„Cieszymy się, ale jutro wracamy do pracy.”', 'calm', { team: 2, board: 1 }], ['„Tak gra drużyna, która myśli o czymś wielkim.”', 'bold', { fans: 5, team: 2, boast: true }], ['„Rywal ułatwił nam zadanie.”', 'evasive', { press: 2 }]] });
  if (gd > 0 && worst <= -1) qs.push({ q: 'Wielki powrót! Co powiedział Pan zawodnikom, gdy przegrywaliście?', a: [['„Że wierzę w nich do ostatniej minuty.”', 'calm', { team: 4 }], ['„Kilka mocnych słów – i zadziałało.”', 'harsh', { team: 1, fans: 2, press: 2 }], ['„To zostaje w szatni.”', 'evasive', { press: -1, team: 2 }]] });
  if (gd < 0) qs.push({ q: `Porażka ${me.goals}:${op.goals}. Co poszło nie tak?`, a: [['„Biorę odpowiedzialność na siebie.”', 'calm', { team: 3, board: 1, press: 1 }], ['„Zawodnicy nie zrealizowali założeń.”', 'harsh', { team: -4, fans: 2, press: 2 }], ['„Sędzia zdecydował o wyniku.”', 'bold', { fans: 3, press: -3, board: -1 }]] });
  if (gd <= 0 && (me.xg || 0) > (op.xg || 0) + 0.8) qs.push({ q: 'Mieliście dużo więcej sytuacji. Brakuje skuteczności?', a: [['„Gramy dobrze – gole przyjdą.”', 'calm', { team: 2 }], ['„Napastnicy muszą to poprawić.”', 'harsh', { team: -2, press: 1 }], ['„Piłka bywa niesprawiedliwa.”', 'evasive', { press: 1 }]] });
  if (red && gd <= 0) qs.push({ q: `Czerwona kartka – ${red.p.n} osłabił drużynę. Czy to zaważyło na meczu?`, p: red.p.id, a: [['„Bronię zawodnika – to była walka.”', 'calm', { player: 5, team: 2, press: -1 }], ['„To było nieodpowiedzialne.”', 'harsh', { player: -6, board: 1, press: 2 }], ['„Wyjaśnimy to wewnętrznie.”', 'evasive', { player: 1 }]] });
  if (dn) qs.push({ q: gd > 0 ? `Wygrana w derbach (${dn})! Co to znaczy dla kibiców?` : gd < 0 ? `Porażka w derbach (${dn}). Jak przeprosi Pan kibiców?` : `Remis w derbach (${dn}). Zadowolony?`, a: [['„Ten wynik jest dla kibiców.”', 'calm', { fans: gd >= 0 ? 4 : 1, team: 1 }], [gd >= 0 ? '„To miasto jest nasze.”' : '„Rewanż będzie inny – obiecuję.”', 'bold', { fans: gd >= 0 ? 6 : 3, boast: gd < 0 }], ['„To tylko trzy punkty.”', 'evasive', { fans: -3, press: 1 }]] });
  if (motm && gd >= 0) qs.push({ q: `${motm.n} zawodnikiem meczu. Jak go Pan oceni?`, p: motm.id, a: [['„Wielki występ – zasłużył.”', 'calm', { player: 5, team: 1 }], ['„To dopiero początek jego możliwości.”', 'bold', { player: 7, team: -1 }], [gd > 0 ? '„Wygrała drużyna, nie jeden zawodnik.”' : '„To zasługa całej drużyny, nie jednego zawodnika.”', 'evasive', { team: 2, player: -2 }]] });
  if (!qs.length) qs.push({ q: `Wynik ${me.goals}:${op.goals}. Jak ocenia Pan ten mecz?`, a: [['„Solidny występ, idziemy dalej.”', 'calm', { team: 1, press: 1 }], ['„Stać nas na dużo więcej.”', 'harsh', { team: -1, board: 1 }], ['„Bez komentarza.”', 'evasive', { press: -2 }]] });
  const q = pickFresh(qs);
  return { q: q.q, star: q.p || null, a: q.a.map(([t, tone, fx]) => [t, fx, tone]) };
}
function answerPress(pc, i) {
  const [, fx, tone] = pc.a[i];
  const rep = S.pressHist[tone] || 0;
  S.pressHist = Object.fromEntries(Object.entries(S.pressHist).map(([k, v]) => [k, Math.max(0, v - 0.5)]));
  S.pressHist[tone] = rep + 1;
  const f = rep >= 3 ? 0.4 : rep >= 2 ? 0.7 : 1;   // powtarzalne odpowiedzi nudzą media i szatnię
  const scaled = {}; for (const [k, v] of Object.entries(fx)) scaled[k] = typeof v === 'number' ? v * f : v;
  if (rep >= 3) scaled.press = (scaled.press || 0) - 2;
  const ctx = pc.star ? { p: pget(pc.star) } : {};
  // publiczna krytyka zawodnika – zapamięta ją (spotkania, kontrakt, wydarzenia)
  if (tone === 'harsh' && ctx.p && ctx.p.tid === S.user && (scaled.player || 0) < 0) scaled.crit = true;
  const out = applyFx(scaled, ctx); if (tone === 'bold' || tone === 'harsh') S.mem.media++;
  if (rep >= 3) out.push('🥱 Media: „znowu to samo”');
  saveSoon(); return out;
}

/* ---------- odprawa przed meczem i w przerwie ---------- */
const TALKS = { calm: '😌 Spokojnie, bez presji', motivate: '🔥 Zmotywuj zespół', pressure: '😤 Wywrzyj presję' };
// zwraca średni efekt; każdy zawodnik reaguje indywidualnie (cechy + losowość), powtarzanie słabnie
function teamTalk(side, kind, oppRep, ht, score) {
  metaInit();
  const fav = (side.t.rep || 50) >= oppRep + 4, dog = (side.t.rep || 50) <= oppRep - 4;
  const rep = S.talkHist.slice(-4).filter(k => k === kind).length; S.talkHist.push(kind); if (S.talkHist.length > 10) S.talkHist.shift();
  let base;
  if (!ht) base = kind === 'calm' ? (dog ? 4 : fav ? -1 : 2) : kind === 'motivate' ? 2.5 : (fav ? 3 : dog ? -3 : 0);
  else base = kind === 'calm' ? (score > 0 ? 3 : score < 0 ? -2 : 1) : kind === 'motivate' ? (score < 0 ? 3.5 : 1) : (score < 0 ? 2 : score > 0 ? -3 : 1);
  base *= rep >= 3 ? 0.3 : rep >= 2 ? 0.6 : 1;
  let tot = 0, n = 0, good = 0, bad = 0;
  for (const s of side.pitch) {
    const p = s.p, t = traits(p);
    let d = base;
    if (kind === 'pressure') d += (t.pre - 10) * 0.35 - (t.tem >= 15 ? 2 : 0);
    if (kind === 'calm') d += t.tem >= 14 ? 1 : 0;
    if (kind === 'motivate') d += (t.amb - 10) * 0.15;
    d += gauss() * 1.8;
    p.mor = clamp(p.mor + d, 0, 100); p.form = clamp(p.form + d * 0.6, 0, 100);
    tot += d; n++; if (d >= 2) good++; else if (d <= -2) bad++;
  }
  return { avg: n ? tot / n : 0, good, bad };
}

/* ---------- rozmowy indywidualne (cooldown 7 dni na temat, malejące efekty) ---------- */
function playerChat(p, topic) {
  metaInit();
  const now = absDay(); p._chat = p._chat || {};
  if (p._chat[topic] && now - p._chat[topic] < 7) return { t: 'Rozmawialiście o tym niedawno – zawodnik zbywa Cię krótkim „wiem, trenerze”.', fx: [] };
  p._chatN = (p._chatN || 0) + 1; p._chat[topic] = now;
  const t = traits(p), st = playerStatus(p), exp = st === 'Kluczowy' ? 0.8 : st === 'Podstawowy' ? 0.6 : st === 'Rotacyjny' ? 0.3 : 0.1;
  const tired = Object.values(p._chat).filter(x => now - x < 14).length >= 3 ? 0.5 : 1;   // zbyt częste rozmowy męczą
  let txt, fx = {};
  const R = (a, b) => a + rnd() * (b - a);
  if (topic === 'time') {
    if (p.pt >= exp - 0.05) { txt = '„Gram tyle, ile powinienem. Jestem zadowolony.”'; fx = { player: R(0, 3) }; }
    else if (t.loy >= 13 || t.tem <= 6) { txt = '„Rozumiem decyzje trenera, ale chciałbym grać więcej.”'; fx = { player: R(-1, 2) }; }
    else { txt = pick(['„Chcę grać! Jeśli nic się nie zmieni, będę myślał o odejściu.”', '„Na ławce nie pokażę, co potrafię.”']); fx = { player: R(-5, -1) }; }
  } else if (topic === 'praise') {
    if (p.form >= 55) { txt = pick(['„Dziękuję! To dodaje mi skrzydeł.”', '„Miło słyszeć. Dalej ciężko pracuję.”']); fx = { player: R(3, 8) * tired, form: R(0, 3) }; }
    else { txt = t.pro >= 12 ? '„Nie zasłużyłem na pochwałę – gram słabo i wiem o tym.”' : '„Dzięki, trenerze!”'; fx = t.pro >= 12 ? { player: R(-3, 0), team: -1 } : { player: R(1, 4) * tired, team: -1 }; }
  } else if (topic === 'crit') {
    if (t.pro >= 14) { txt = '„Ma Pan rację. Wezmę się do roboty.”'; fx = { player: R(-1, 2), form: R(4, 8) }; }
    else if (t.tem >= 14) { txt = pick(['„To nie fair! Inni grają gorzej!”', '„Proszę mnie nie obwiniać za całą drużynę!”']); fx = { player: R(-14, -7), form: R(0, 3) }; }
    else if (p.form < 45) { txt = '„Wiem, że muszę grać lepiej.”'; fx = { player: R(-5, -1), form: R(2, 6) }; }
    else { txt = '„Nie rozumiem tej krytyki, trenerze.”'; fx = { player: R(-9, -3) }; }
  } else if (topic === 'future') {
    const bigger = p.ovr > teamLevel(userClub()) + 5;
    if (t.amb >= 14 && bigger) { txt = '„Marzę o Lidze Mistrzów. Jeśli tu się nie uda, poszukam nowego wyzwania.”'; fx = { player: R(-3, 0) }; }
    else if (t.loy >= 14) { txt = '„Kocham ten klub. Chcę tu zostać jak najdłużej.”'; fx = { player: R(2, 5) }; }
    else { txt = `„Skupiam się na kolejnych meczach. Kontrakt mam na ${plural(p.con, 'rok', 'lata', 'lat')}.”`; fx = { player: R(0, 3) }; }
    txt += ` (ambicja: ${traitWord(t.amb, true)}, lojalność: ${traitWord(t.loy, true)})`;
  } else if (topic === 'promise') {
    if (S.promises.some(x => x.pid === p.id)) { txt = '„Pamiętam o obietnicy, trenerze.”'; fx = {}; }
    else if (S.mem.liar >= 2 && rnd() < 0.5) { txt = '„Słyszałem, że rzadko dotrzymuje Pan słowa…”'; fx = { player: R(-3, 1) }; }
    else { txt = '„Trzymam za słowo!”'; fx = { player: R(6, 11), promise: true, samepos: -2 }; }
  } else if (topic === 'captain') {
    txt = t.pro >= 12 || t.loy >= 12 ? '„To dla mnie zaszczyt. Nie zawiodę!”' : '„Opaska? Hm, dobrze, postaram się.”';
    fx = { captain: true, player: R(6, 11), team: t.pro >= 12 || t.loy >= 12 ? 2 : -1 };
  }
  const out = applyFx(fx, { p }, true); saveSoon();
  return { t: txt, fx: out };
}

/* ---------- osiągnięcia i gablota ---------- */
const ACH = [
  ['first_win', '🥇 Pierwsze zwycięstwo', 'Wygraj pierwszy mecz.', () => S.stats.wins >= 1],
  ['wins50', '💯 50 zwycięstw', 'Wygraj 50 meczów.', () => S.stats.wins >= 50],
  ['games200', '🗓️ Weteran ławki', 'Poprowadź drużynę w 200 meczach.', () => S.stats.games >= 200],
  ['unbeaten10', '🧱 Twierdza', 'Seria 10 meczów bez porażki.', () => S.stats.bestUnbeaten >= 10],
  ['unbeaten25', '🛡️ Niepokonani', 'Seria 25 meczów bez porażki.', () => S.stats.bestUnbeaten >= 25],
  ['promo', '⬆️ Awans', 'Wywalcz awans.', () => S.trophies.some(t => t.kind === 'promo')],
  ['league', '🏆 Mistrz', 'Wygraj ligę.', () => S.trophies.some(t => t.kind === 'league')],
  ['toptitle', '👑 Mistrz kraju', 'Wygraj najwyższą ligę.', () => S.trophies.some(t => t.kind === 'league' && t.tier === 1)],
  ['cup', '🏅 Puchar kraju', 'Zdobądź puchar krajowy.', () => S.trophies.some(t => t.kind === 'cup')],
  ['double', '✌️ Dublet', 'Zdobądź ligę i puchar w jednym sezonie.', () => S.trophies.some(t => t.kind === 'league' && S.trophies.some(u => u.kind === 'cup' && u.season === t.season))],
  ['preseason', '☀️ Letni triumf', 'Wygraj turniej przedsezonowy.', () => S.trophies.some(t => t.kind === 'pre')],
  ['ecl', '🟢 Liga Konferencji', 'Wygraj Ligę Konferencji.', () => S.trophies.some(t => t.kind === 'ECL')],
  ['el', '🟠 Liga Europy', 'Wygraj Ligę Europy.', () => S.trophies.some(t => t.kind === 'EL')],
  ['cl', '⭐ Liga Mistrzów', 'Wygraj Ligę Mistrzów.', () => S.trophies.some(t => t.kind === 'CL')],
  ['nt', '🌍 Złoto z reprezentacją', 'Wygraj turniej z reprezentacją.', () => S.trophies.some(t => t.kind === 'NT')],
  ['zero2hero', '🚀 Od zera do bohatera', 'Wygraj najwyższą ligę klubem, który objąłeś w 3. lub 4. lidze.', () => S.trophies.some(t => t.kind === 'league' && t.tier === 1 && S.startTier >= 3 && t.club === S.startClub)],
  ['mgr60', '📈 Trener krajowy', 'Osiągnij OVR trenera 60.', () => S.mgr.ovr >= 60],
  ['mgr75', '🌟 Trener europejski', 'Osiągnij OVR trenera 75.', () => S.mgr.ovr >= 75],
  ['mgr90', '🧠 Geniusz taktyki', 'Osiągnij OVR trenera 90.', () => S.mgr.ovr >= 90],
  ['academy', '🎓 Wychowanek', 'Awansuj juniora z akademii, który rozegra 20 meczów.', () => userClub().players.some(p => p.homegrown && p.car.apps >= 20)],
  ['wonder', '💎 Diament', 'Wychowaj zawodnika z akademii z oceną 80+.', () => PALL.some(p => p.homegrown && p.ovr >= 80)],
  ['fans90', '❤️ Ulubieniec trybun', 'Zdobądź 90% poparcia kibiców.', () => S.fans >= 90],
  ['honest', '🤝 Człowiek honoru', 'Dotrzymaj 5 obietnic.', () => (S.mem.honest || 0) >= 5],
  ['bigbuy', '💸 Hitowy transfer', 'Kup zawodnika za co najmniej 30 mln €.', () => (S.bigBuy || 0) >= 3e7],
  ['bigsale', '💰 Biznesmen', 'Sprzedaj zawodnika za co najmniej 30 mln €.', () => (S.bigSale || 0) >= 3e7],
];
function checkAchievements() {
  metaInit();
  for (const [id, name, desc, f] of ACH) {
    if (S.ach[id]) continue;
    let ok = false; try { ok = f(); } catch (e) { ok = false; }
    if (ok) { S.ach[id] = S.season; msg('🏅 Osiągnięcie odblokowane', `${name} – ${desc}`); }
  }
}
function seasonMeta(o) {
  metaInit();
  const ut = userClub(), s = S.season, f = o.finals[o.wasLg];
  if (f && f[0].id === ut.id) S.trophies.push({ kind: 'league', name: S.leagues[o.wasLg].name, season: s, club: ut.id, tier: o.wasTier });
  if (o.myCup && o.myCup.champion === ut.id) S.trophies.push({ kind: 'cup', name: o.myCup.name, season: s, club: ut.id });
  if (o.myEuro && o.myEuro.champion === ut.id) S.trophies.push({ kind: o.myEuro.id, name: o.myEuro.name, season: s, club: ut.id });
  if (S.nt && S.ntc.tourn && S.ntc.tourn.champion === S.nt) S.trophies.push({ kind: 'NT', name: S.ntc.tourn.name, season: s, club: null });
  const tier = S.leagues[ut.lg] ? S.leagues[ut.lg].tier : o.wasTier;
  if (ut.lg !== o.wasLg && tier < o.wasTier) S.trophies.push({ kind: 'promo', name: `Awans: ${S.leagues[ut.lg].name}`, season: s, club: ut.id });
  if (o.myCup && o.myCup.champion === ut.id) { S.fans = clamp(S.fans + 10, 0, 100); S.board.conf = clamp(S.board.conf + 6, 0, 100); mgrGain(2); }
  if (S.sponsBet && S.sponsBet.season === s) {
    const ok = (f && f.find(r => r.id === ut.id) || { pos: 99 }).pos <= S.board.target || (ut.lg !== o.wasLg && tier < o.wasTier);
    if (ok) { ut.bal += S.sponsBet.amount; o.lines.push(`🤝 Premia sponsora za wynik: ${money(S.sponsBet.amount)}.`); } else o.lines.push('🤝 Zakład ze sponsorem przegrany – brak premii.');
    S.sponsBet = null;
  }
  S.fans = clamp(S.fans * 0.85 + 60 * 0.15, 0, 100);
  checkAchievements();
}
const TROPHY_ICON = { league: '🏆', cup: '🏅', CL: '⭐', EL: '🟠', ECL: '🟢', NT: '🌍', promo: '⬆️', pre: '☀️' };
