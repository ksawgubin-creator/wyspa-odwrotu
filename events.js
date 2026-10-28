'use strict';
/* ============================================================
   KARIERA MENEDŻERA – wydarzenia, rozmowy, prasa, kibice,
   kapitan, obietnice, osiągnięcia, gablota
   Wyniki decyzji są częściowo losowe i zależą od ukrytych cech
   zawodników, pamięci szatni i sytuacji klubu.
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

function metaInit() {
  if (!S) return;
  if (S.fans == null) S.fans = 60;
  if (S.press == null) S.press = 55;
  S.promises = S.promises || []; S.pending = S.pending || []; S.ach = S.ach || {};
  S.trophies = S.trophies || []; S.results = S.results || []; S.stats = S.stats || { games: 0, wins: 0, unbeaten: 0, bestUnbeaten: 0 };
  S.evSeen = S.evSeen || {}; S.evCat = S.evCat || {}; S.followups = S.followups || []; S.mem = S.mem || { strict: 0, soft: 0, liar: 0, honest: 0, media: 0 };
  S.talkHist = S.talkHist || []; S.pressHist = S.pressHist || {};
  if (S.captain === undefined) S.captain = null;
}
const sgn = v => (v > 0 ? '+' : '') + Math.round(v);
const uPlayers = () => userClub().players;
const starPlayer = () => uPlayers().slice().sort((a, b) => b.ovr - a.ovr)[0];
const randPlayer = f => { const l = uPlayers().filter(f || (() => true)); return l.length ? pick(l) : null; };
const lastRes = n => S.results.slice(-n);
const noisy = v => { const n = v * (0.7 + rnd() * 0.6); return Math.abs(n) < 1 && v !== 0 ? Math.sign(v) : Math.round(n); };

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
  if (fx.samepos && ctx.p) { const v = N(fx.samepos); for (const q of uPlayers()) if (q !== ctx.p && LINE[q.pos] === LINE[ctx.p.pos]) q.mor = clamp(q.mor + v, 0, 100); out.push(`👥 Rywale ${shortName(ctx.p)} o miejsce ${sgn(v)}`); }
  if (fx.player && ctx.p) { const v = N(fx.player); ctx.p.mor = clamp(ctx.p.mor + v, 0, 100); out.push(`${moraleLabel(ctx.p.mor)[0]} ${shortName(ctx.p)} ${sgn(v)}`); }
  if (fx.player2 && ctx.q) { const v = N(fx.player2); ctx.q.mor = clamp(ctx.q.mor + v, 0, 100); out.push(`${moraleLabel(ctx.q.mor)[0]} ${shortName(ctx.q)} ${sgn(v)}`); }
  if (fx.form && ctx.p) { const v = N(fx.form); ctx.p.form = clamp(ctx.p.form + v, 0, 100); out.push(`📈 Forma ${shortName(ctx.p)} ${sgn(v)}`); }
  if (fx.money) { const v = Math.round(N(fx.money / 1000) * 1000); ut.bal += v; if (v > 0) { ut.fin.inc += v; ut.tb += Math.round(v * 0.5); } else ut.fin.exp -= v; out.push(`💶 ${v > 0 ? '+' : ''}${money(v)}`); }
  if (fx.mgr) { mgrGain(fx.mgr); out.push(`🧑‍💼 OVR trenera ${fx.mgr > 0 ? '+' : ''}${fx.mgr}`); }
  if (fx.fit && ctx.p) { const v = N(fx.fit); ctx.p.fit = clamp(ctx.p.fit + v, 10, 100); out.push(`🔋 Kondycja ${shortName(ctx.p)} ${sgn(v)}`); }
  if (fx.shp) { const v = N(fx.shp); for (const p of uPlayers()) p.shp = clamp(p.shp + v, 0, 100); out.push(`⚡ Zgranie drużyny ${sgn(v)}`); }
  if (fx.teamFit) { const v = N(fx.teamFit); for (const p of uPlayers()) p.fit = clamp(p.fit + v, 10, 100); out.push(`🔋 Kondycja drużyny ${sgn(v)}`); }
  if (fx.inj && ctx.p) { const v = Math.max(3, N(fx.inj)); ctx.p.inj = Math.max(ctx.p.inj, v); out.push(`🚑 ${shortName(ctx.p)} pauzuje ~${Math.ceil(v / 7)} tyg.`); }
  if (fx.price) { ut.price = Math.round(ut.price * (1 + fx.price) * 10) / 10; out.push(`🎟️ Ceny biletów ${fx.price > 0 ? '+' : ''}${Math.round(fx.price * 100)}%`); }
  if (fx.spons) { ut.spons = Math.round(ut.spons * (1 + fx.spons)); out.push(`🤝 Sponsorzy ${fx.spons > 0 ? '+' : ''}${Math.round(fx.spons * 100)}%`); }
  if (fx.tb) { ut.tb += fx.tb; out.push(`💼 Budżet transferowy ${fx.tb > 0 ? '+' : ''}${money(fx.tb)}`); }
  if (fx.wage && ctx.p) { ctx.p.wage = Math.round(ctx.p.wage * (1 + fx.wage) / 100) * 100; out.push(`💰 Pensja ${shortName(ctx.p)} ${fx.wage > 0 ? '+' : ''}${Math.round(fx.wage * 100)}%`); }
  if (fx.list && ctx.p) { ctx.p.listed = true; out.push(`📋 ${shortName(ctx.p)} na liście transferowej`); }
  if (fx.captain && ctx.p) { S.captain = ctx.p.id; out.push(`©️ Nowy kapitan: ${shortName(ctx.p)}`); }
  if (fx.promise && ctx.p) { makePromise(ctx.p); out.push(`🤝 Obietnica: regularna gra dla ${shortName(ctx.p)} (3 tygodnie)`); }
  if (fx.boast) { S.boast = true; out.push('🎤 Media zapamiętają tę zapowiedź'); }
  return out;
}
function makePromise(p) { if (!S.promises.some(x => x.pid === p.id)) S.promises.push({ pid: p.id, until: absDay() + 21, kind: 'time', start: p.pt }); }

/* ---------- wydarzenia ---------- */
// Każdy wybór: t (tekst), hint (ostrzeżenie widoczne przed decyzją), fx|fn (skutek), r (opis),
// alt: { p: ctx=>szansa, fx|fn, r } – alternatywny (zwykle gorszy) wynik, mem: zapis w pamięci, follow: [id, dniOd, dniDo, szansa]
const strictness = () => S.mem.strict - S.mem.soft;
const EVENTS = [
  { id: 'wintercamp', cat: 'Klub', follow: true, title: '❄️ Przerwa zimowa – obóz przygotowawczy', text: () => `Liga zrobiła sobie przerwę zimową. Gdzie drużyna ma przygotowywać się do rundy wiosennej? Koszt zależy od wyjazdu (budżet obozu: ${money(campCost(1))} – ${money(campCost(2))}).`,
    choices: [{ t: '🏠 Zostajemy w kraju (bazy klubu)', fn: () => ({ teamFit: 6, shp: 4 }), r: 'Skromnie, ale bez wydatków. Śnieg utrudniał treningi.' },
      { t: '🇹🇷 Turcja (Antalya) – sparingi z klubami z Europy', fn: () => ({ money: -campCost(1), teamFit: 12, shp: 10, team: 4 }), r: 'Dobre boiska i solidni sparingpartnerzy.' },
      { t: '🇪🇸 Hiszpania / Dubaj – obóz premium', fn: () => ({ money: -campCost(2), teamFit: 16, shp: 14, team: 7, board: -2 }), r: 'Świetne warunki – zawodnicy zachwyceni, zarząd liczy koszty.' }] },
  { id: 'fanprotest', cat: 'Kibice', w: 4, ctx: () => lastRes(3).length === 3 && lastRes(3).every(r => r === 'L') ? {} : null,
    title: 'Protest kibiców', text: () => `Po serii porażek kibice ${userClub().name} protestują pod stadionem. Transparent: „Obudźcie się!”.`,
    choices: [{ t: 'Wyjdź do kibiców i porozmawiaj', hint: 'ryzykowne', fx: { fans: 8, press: 3, board: -1 }, r: 'Kibice docenili, że stanąłeś z nimi twarzą w twarz.', alt: { p: () => S.fans < 40 ? 0.45 : 0.2, fx: { fans: -6, press: -4 }, r: 'Rozmowa wymknęła się spod kontroli – posypały się wyzwiska, a kamery wszystko nagrały.' } },
      { t: 'Zignoruj protest', fx: { fans: -8, press: -3 }, r: 'Media piszą o „trenerze w wieży z kości słoniowej”.', follow: ['f_protest2', 10, 25, 0.5] },
      { t: 'Publicznie obwiń zawodników', fx: { fans: 5, team: -8, press: 2 }, r: 'Kibice przyklaskują, ale w szatni zawrzało.', mem: 'strict' }] },
  { id: 'f_protest2', cat: 'Kibice', follow: true, title: 'Protest przybiera na sile', text: () => 'Zignorowany protest rozlał się na trybuny – kibice zapowiadają bojkot meczu.',
    choices: [{ t: 'Spotkaj się z przedstawicielami kibiców', fx: { fans: 7, board: -2 }, r: 'Udało się załagodzić sytuację.' },
      { t: 'Poproś zarząd o obniżkę cen biletów', fx: { fans: 9, price: -0.1, board: -4 }, r: 'Tańsze bilety uspokoiły nastroje.' },
      { t: 'Nadal ignoruj', fx: { fans: -10, board: -4, press: -4 }, r: 'Na meczu połowa trybun pustoszeje.' }] },
  { id: 'nightclub', cat: 'Szatnia', w: 3, ctx: () => { const p = randPlayer(p => p.age < 31); return p ? { p } : null; },
    title: 'Nocna eskapada', text: c => `Tabloidy publikują zdjęcia ${c.p.n} z klubu nocnego – dwa dni przed meczem.`,
    choices: [{ t: 'Nałóż karę finansową', fx: { player: -8, press: 3, board: 2, team: 1 }, r: 'Zawodnik zacisnął zęby i zapłacił.', alt: { p: c => traits(c.p).tem >= 14 ? 0.5 : 0.1, fx: { player: -16, team: -3, press: 2 }, r: 'Zawodnik wybuchł i trzasnął drzwiami – w szatni napięcie.' }, mem: 'strict' },
      { t: 'Odsuń go od najbliższego meczu', fx: { player: -15, fans: 3, press: 5, form: -5 }, r: 'Twarda decyzja.', mem: 'strict' },
      { t: 'Bagatelizuj sprawę', fx: { player: 4, press: -6, board: -3 }, r: 'Prasa zarzuca Ci brak dyscypliny.', mem: 'soft', follow: ['f_nightclub2', 20, 40, 0.45] }] },
  { id: 'f_nightclub2', cat: 'Szatnia', follow: true, title: 'Recydywa', text: c => `${c.p.n} znowu złamał zasady – tym razem spóźnił się na trening po nocnej imprezie. Media przypominają, że poprzednio uszło mu to na sucho.`,
    choices: [{ t: 'Najwyższa kara i odsunięcie od zespołu', fx: { player: -20, team: 3, press: 4, board: 3 }, r: 'Zespół widzi, że skończyła się taryfa ulgowa.', mem: 'strict' },
      { t: 'Wystaw go na listę transferową', fx: { player: -12, list: true, press: 2 }, r: 'Klub szuka dla niego nowego pracodawcy.' },
      { t: 'Kolejna szansa', fx: { press: -8, board: -6, team: -4 }, r: 'Szatnia uważa, że gwiazdy mają u Ciebie fory.', mem: 'soft' }] },
  { id: 'charity', cat: 'Kibice', w: 2, ctx: () => ({}), title: 'Akcja charytatywna', text: () => 'Miejski szpital dziecięcy zaprasza drużynę na wizytę i akcję charytatywną w środku tygodnia.',
    choices: [{ t: 'Cała drużyna jedzie', fx: { fans: 7, press: 6, team: 3, teamFit: -4 }, r: 'Piękne obrazki obiegły media.' },
      { t: 'Wyślij kapitana i siebie', hint: 'zależy od kapitana', fn: () => { const c = S.captain != null ? pget(S.captain) : null; return c && traits(c).pro >= 11 ? { fans: 3, press: 3 } : { fans: 1, press: -2 }; }, r: 'Skromnie – reakcja zależała od postawy kapitana.' },
      { t: 'Odmów – liczy się trening', fx: { fans: -5, press: -6, teamFit: 2 }, r: 'Media nie zostawiają na Tobie suchej nitki.' }] },
  { id: 'ticketprice', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Ceny biletów', text: () => 'Prezes chce podnieść ceny biletów o 15%, by poprawić finanse klubu.',
    choices: [{ t: 'Popieram – klub potrzebuje pieniędzy', fx: { price: 0.15, fans: -9, board: 4 }, r: 'Wpływy wzrosną, ale kibice są oburzeni.' },
      { t: 'Tylko trybuna VIP', fx: { price: 0.05, fans: -2, board: 1 }, r: 'Kompromis przyjęty.' },
      { t: 'Sprzeciw się', fx: { fans: 6, board: -5 }, r: 'Kibice Cię kochają, prezes – mniej.' }] },
  { id: 'sponsorkit', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Kontrowersyjny sponsor', text: () => 'Firma bukmacherska oferuje lukratywną umowę, ale chce ogromnego logo na koszulce i zmiany jej barw.',
    choices: [{ t: 'Podpisz umowę', fn: () => ({ money: Math.round(userClub().spons * 20), spons: 0.08, fans: -7, press: -2 }), r: 'Kasa się zgadza, tradycjonaliści protestują.', follow: ['f_boycott', 15, 35, 0.4] },
      { t: 'Negocjuj bez zmiany barw', hint: 'sponsor może się wycofać', fn: () => ({ money: Math.round(userClub().spons * 8), fans: 1 }), r: 'Mniejsze pieniądze, tradycja zachowana.', alt: { p: () => 0.35, fx: { board: -2 }, r: 'Sponsor wycofał się z rozmów.' } },
      { t: 'Odrzuć ofertę', fx: { fans: 5, board: -4 }, r: 'Kibice doceniają szacunek do historii klubu.' }] },
  { id: 'f_boycott', cat: 'Kibice', follow: true, title: 'Bojkot sklepu klubowego', text: () => 'Kibice bojkotują nowe koszulki ze sponsorem bukmacherskim. Sprzedaż leży.',
    choices: [{ t: 'Wypuść alternatywną koszulkę retro', fn: () => ({ money: -Math.round(userClub().tv * 2), fans: 6 }), r: 'Retro koszulka to hit – choć produkcja kosztowała.' },
      { t: 'Przeczekaj', fx: { fans: -5 }, r: 'Bojkot powoli wygasa, ale niesmak pozostał.' }] },
  { id: 'lockerfight', cat: 'Szatnia', w: 3, ctx: () => { const l = uPlayers().filter(p => p.st.apps > 2); if (l.length < 2) return null; const p = pick(l); const q = pick(l.filter(x => x !== p)); return q ? { p, q } : null; },
    title: 'Kłótnia w szatni', text: c => `${c.p.n} i ${c.q.n} pokłócili się na treningu. Doszło do przepychanek.`,
    choices: [{ t: c => `Stań po stronie: ${c.p.n}`, fx: { player: 6, player2: -14, team: -3 }, r: 'Jeden czuje się wygranym, drugi upokorzonym.' },
      { t: c => `Stań po stronie: ${c.q.n}`, fx: { player: -14, player2: 6, team: -3 }, r: 'Jeden czuje się wygranym, drugi upokorzonym.' },
      { t: 'Zebranie drużyny i kara dla obu', fx: { player: -5, player2: -5, team: 3, press: 1 }, r: 'Atmosfera się oczyściła.', alt: { p: c => (traits(c.p).tem + traits(c.q).tem) >= 28 ? 0.5 : 0.15, fx: { player: -9, player2: -9, team: -4 }, r: 'Obaj uznali karę za niesprawiedliwą – konflikt się pogłębił.' }, mem: 'strict' },
      { t: 'Nie wtrącaj się', fx: { team: -5, player: -2, player2: -2 }, r: 'Konflikt się tli…', mem: 'soft' }] },
  { id: 'youthshine', cat: 'Akademia', w: 2, ctx: () => { const y = S.acad.youth.slice().sort((a, b) => b.ovr - a.ovr)[0]; return y ? { p: y } : null; },
    title: 'Junior błyszczy', text: c => `Trenerzy akademii zachwycają się ${c.p.n} (${c.p.age} l.). Kibice dopytują, kiedy zadebiutuje.`,
    choices: [{ t: 'Awansuj go do pierwszego zespołu', fn: c => { promoteYouth(c.p.id); return { fans: 5, press: 3 }; }, r: 'Wychowanek trenuje z pierwszą drużyną!' },
      { t: 'Daj mu jeszcze czas w akademii', hint: 'może się zniechęcić', fx: { player: -3 }, r: 'Rozsądnie – niech dojrzeje.', alt: { p: c => traits(c.p).amb >= 14 ? 0.45 : 0.1, fx: { player: -12 }, r: 'Ambitny junior poczuł się zlekceważony.' } }] },
  { id: 'trainingknock', cat: 'Medycyna', w: 3, ctx: () => { const p = randPlayer(p => !p.inj && p.st.apps > 0); return p ? { p } : null; },
    title: 'Uraz na treningu', text: c => `${c.p.n} poczuł ból w udzie. Lekarz radzi tydzień odpoczynku, zawodnik chce grać.`,
    choices: [{ t: 'Posłuchaj lekarza', fx: { inj: 7, player: -3 }, r: 'Bezpiecznie.' },
      { t: 'Niech gra na środkach przeciwbólowych', hint: 'ryzyko poważnej kontuzji', fx: { player: 4 }, r: 'Zagrał – tym razem bez konsekwencji.', alt: { p: () => 0.35, fn: () => ({ inj: ri(21, 50), press: -4, fans: -2 }), r: 'Uraz się pogłębił – czeka go dłuższa przerwa.' } }] },
  { id: 'agentraise', cat: 'Kontrakty', w: 3, ctx: () => { const p = starPlayer(); return p && p.con >= 2 ? { p } : null; },
    title: 'Agent żąda podwyżki', text: c => `Agent ${c.p.n} żąda 30% podwyżki, sugerując zainteresowanie innych klubów.`,
    choices: [{ t: 'Daj podwyżkę', fx: { wage: 0.3, player: 10, team: -2 }, r: 'Gwiazda zadowolona, reszta szatni liczy pieniądze.' },
      { t: 'Zaproponuj 10%', hint: 'zależy od charakteru', fx: { wage: 0.1, player: 2 }, r: 'Agent niechętnie się zgadza.', alt: { p: c => traits(c.p).amb >= 13 ? 0.45 : 0.15, fx: { wage: 0.1, player: -8 }, r: 'Zawodnik przyjął, ale czuje się niedoceniony.' } },
      { t: 'Odmów', fx: { player: -12, board: 2 }, r: 'Zawodnik jest rozczarowany…', follow: ['f_transferreq', 15, 40, 0.5] }] },
  { id: 'f_transferreq', cat: 'Kontrakty', follow: true, title: 'Prośba o transfer', text: c => `${c.p.n} składa oficjalną prośbę o transfer. „Nie widzę tu dla siebie przyszłości” – mówi w wywiadzie.`,
    choices: [{ t: 'Zgódź się – wystaw go', fx: { list: true, player: 6, fans: -3 }, r: 'Zawodnik trafia na rynek.' },
      { t: 'Odrzuć prośbę', fx: { player: -15, team: -2, press: -2 }, r: 'Zostaje, ale jest wyraźnie niezadowolony.', mem: 'strict' },
      { t: 'Zaproponuj nowy kontrakt z podwyżką', fx: { wage: 0.25, player: 12, board: -2 }, r: 'Udało się go udobruchać – za sporą cenę.' }] },
  { id: 'rivalprovoke', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Prowokacja rywala', text: () => 'Trener rywala z ligi publicznie wyśmiewa styl gry Twojej drużyny.',
    choices: [{ t: 'Odpowiedz ostro', fx: { fans: 6, press: 3, team: 3, board: -3 }, r: 'Wojna na słowa nakręca kibiców.', mem: 'media' },
      { t: 'Odpowiedz z klasą', fx: { press: 5, board: 2, fans: -2 }, r: 'Media chwalą Twój spokój, część kibiców chciała więcej ognia.' },
      { t: 'Milcz', fx: { fans: -3, team: -1 }, r: 'Część kibiców uważa, że dałeś się upokorzyć.' }] },
  { id: 'chairmanassist', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Asystent z polecenia', text: () => 'Prezes chce zatrudnić swojego znajomego jako Twojego asystenta.',
    choices: [{ t: 'Zgódź się', fx: { board: 7, team: -2 }, r: 'Prezes zadowolony, ale nowy asystent niewiele wnosi.' },
      { t: 'Odmów grzecznie', fx: { board: -6, mgr: 0.3 }, r: 'Zachowujesz niezależność.' }] },
  { id: 'fanyouth', cat: 'Kibice', w: 2, ctx: () => { const p = randPlayer(p => p.age <= 21 && p.st.apps < 3); return p ? { p } : null; },
    title: 'Kibice chcą wychowanka', text: c => `Kibice skandują nazwisko ${c.p.n} i domagają się dla niego szansy.`,
    choices: [{ t: 'Obiecaj mu minuty', hint: 'obietnica do dotrzymania', fx: { fans: 6, player: 10, promise: true, samepos: -3 }, r: 'Musisz teraz dotrzymać słowa.' },
      { t: 'Wyjaśnij, że musi poczekać', fx: { fans: -4, player: -5 }, r: 'Rozczarowanie na trybunach.' }] },
  { id: 'socialpost', cat: 'Prasa', w: 2, ctx: () => { const p = randPlayer(p => p.mor < 50); return p ? { p } : null; },
    title: 'Burza w social mediach', text: c => `${c.p.n} opublikował wpis sugerujący, że nie czuje się doceniany w klubie.`,
    choices: [{ t: 'Porozmawiaj z nim w cztery oczy', hint: 'nie wszyscy dają się przekonać', fx: { player: 8 }, r: 'Wyjaśniliście sobie sprawę.', alt: { p: c => traits(c.p).loy <= 7 ? 0.5 : 0.15, fx: { player: -4, press: -3 }, r: 'Rozmowa nic nie dała – zawodnik udzielił kolejnego wywiadu.' } },
      { t: 'Ukarz go publicznie', fx: { player: -12, press: 3, team: 2 }, r: 'Jasny sygnał dla wszystkich.', mem: 'strict' },
      { t: 'Wystaw go na listę transferową', fx: { player: -15, list: true, fans: -2 }, r: 'Mleko się rozlało.' }] },
  { id: 'foreigninterest', cat: 'Kariera', w: 1, ctx: () => S.mgr.ovr >= 50 ? {} : null, title: 'Zainteresowanie z zagranicy', text: () => 'Media donoszą, że interesuje się Tobą zagraniczny klub. Dziennikarze pytają o Twoją przyszłość.',
    choices: [{ t: '„Jestem tu szczęśliwy”', fx: { fans: 5, board: 4 }, r: 'Kibice i zarząd doceniają lojalność.' },
      { t: '„Nigdy nie mów nigdy”', fx: { board: -7, press: 4, mgr: 0.5, team: -2 }, r: 'Twoje nazwisko krąży po rynku, ale szatnia zaczęła się zastanawiać.' }] },
  { id: 'investor', cat: 'Zarząd', w: 1, ctx: () => ({}), title: 'Nowy inwestor', text: () => 'Inwestor chce kupić udziały w klubie i dorzucić pieniędzy na transfery – w zamian za wpływ na decyzje.',
    choices: [{ t: 'Rekomenduj przyjęcie oferty', fn: () => ({ tb: Math.round(Math.max(5e5, userClub().tb * 0.4) / 1e5) * 1e5, board: -3, fans: -2 }), r: 'Budżet rośnie, ale inwestor będzie chciał mieć zdanie.', follow: ['f_investor', 25, 60, 0.6] },
      { t: 'Odradź', fx: { board: 1, fans: 3 }, r: 'Klub pozostaje w rękach dotychczasowych właścicieli.' }] },
  { id: 'f_investor', cat: 'Zarząd', follow: true, title: 'Inwestor żąda sprzedaży', text: () => { const s = starPlayer(); return `Inwestor żąda sprzedaży ${s ? s.n : 'najlepszego zawodnika'} – „trzeba odzyskać pieniądze”.`; },
    ctxFn: () => ({ p: starPlayer() }),
    choices: [{ t: 'Ulegnij – wystaw gwiazdę', fx: { list: true, board: 6, fans: -8, team: -4 }, r: 'Kibice wściekli, inwestor zadowolony.' },
      { t: 'Postaw się', fx: { board: -9, fans: 5, team: 3 }, r: 'Wywalczyłeś swoje – ale zarząd to zapamięta.' }] },
  { id: 'stadiumrepair', cat: 'Zarząd', w: 1, ctx: () => ({}), title: 'Awaria na stadionie', text: () => 'Zepsuło się oświetlenie jednej z trybun. Szybka naprawa jest droga.',
    choices: [{ t: 'Naprawić natychmiast', fn: () => ({ money: -Math.round(userClub().tv * 3), fans: 3 }), r: 'Problem rozwiązany.' },
      { t: 'Odłożyć naprawę', fx: { fans: -5, press: -3 }, r: 'Kibice narzekają na warunki.', alt: { p: () => 0.25, fn: () => ({ money: -Math.round(userClub().tv * 5), board: -4 }), r: 'Podczas meczu zgasło światło – kara od ligi i droga naprawa.' } }] },
  { id: 'family', cat: 'Szatnia', w: 2, ctx: () => { const p = randPlayer(); return p ? { p } : null; },
    title: 'Sprawy rodzinne', text: c => `${c.p.n} prosi o kilka dni wolnego – na świat przychodzi jego dziecko.`,
    choices: [{ t: 'Oczywiście, rodzina najważniejsza', fx: { player: 12, team: 2, form: -3, fit: -6 }, r: 'Zawodnik jest Ci wdzięczny, ale opuści treningi.' },
      { t: 'Tylko jeden dzień', fx: { player: -7 }, r: 'Zawodnik jest rozczarowany.', mem: 'strict' }] },
  { id: 'opentraining', cat: 'Kibice', w: 2, ctx: () => ({}), title: 'Otwarty trening', text: () => 'Stowarzyszenie kibiców prosi o otwarty trening dla rodzin z dziećmi.',
    choices: [{ t: 'Zgoda – z autografami', fx: { fans: 6, teamFit: -3, team: 1 }, r: 'Tysiące uśmiechniętych dzieci.' },
      { t: 'Odmów – trening to praca', fx: { fans: -4, teamFit: 1 }, r: 'Kibice są zawiedzeni.' }] },
  { id: 'legend', cat: 'Klub', w: 1, ctx: () => ({}), title: 'Wizyta legendy', text: () => `Legenda ${userClub().name} chce porozmawiać z drużyną przed ważnym meczem.`,
    choices: [{ t: 'Zaproś do szatni', hint: 'efekt niepewny', fx: { team: 5, fans: 3 }, r: 'Zawodnicy słuchali z wypiekami na twarzy.', alt: { p: () => 0.3, fx: { team: -2, press: -2 }, r: 'Legenda skrytykowała Twoją taktykę przy zawodnikach – niezręcznie.' } },
      { t: 'Odmów', fx: { fans: -3, press: -1 }, r: 'Legenda poczuła się urażona.' }] },
  { id: 'crisisform', cat: 'Szatnia', w: 3, ctx: () => { const p = randPlayer(p => p.form < 35 && p.st.apps > 3); return p ? { p } : null; },
    title: 'Kryzys formy', text: c => `${c.p.n} jest w dołku – ostatnie występy to jego najsłabsze mecze w karierze.`,
    choices: [{ t: 'Odsuń go na chwilę od składu', fx: { form: 6, player: -5 }, r: 'Chwila oddechu.' },
      { t: 'Okaż wsparcie i zaufanie', hint: 'zależy od charakteru', fx: { player: 6, form: 3 }, r: 'Zawodnik czuje, że w niego wierzysz.', alt: { p: c => traits(c.p).pre <= 8 ? 0.5 : 0.2, fx: { player: 2, form: -4, team: -2 }, r: 'Presja go przygniotła – kolejny słaby mecz, a reszta zespołu pyta, dlaczego wciąż gra.' } },
      { t: 'Dodatkowe treningi indywidualne', fx: { form: 7, fit: -10, player: -2 }, r: 'Ciężka praca.' }] },
  { id: 'anniversary', cat: 'Klub', w: 1, ctx: () => ({}), title: 'Jubileusz klubu', text: () => `${userClub().name} obchodzi okrągły jubileusz. Dział marketingu proponuje specjalny strój.`,
    choices: [{ t: 'Limitowana koszulka', fn: () => ({ money: Math.round(userClub().spons * 6 * (S.fans / 60)), fans: 3 }), r: 'Koszulki zniknęły w kilka godzin!' },
      { t: 'Mecz legend', fn: () => ({ fans: 8, press: 3, money: -Math.round(userClub().tv) }), r: 'Wspaniałe święto.' }] },
  { id: 'boardpressure', cat: 'Zarząd', w: 3, ctx: () => S.board.conf < 40 ? {} : null, title: 'Zarząd naciska', text: () => 'Prezes wzywa Cię na rozmowę – wyniki są poniżej oczekiwań.',
    choices: [{ t: 'Przedstaw plan naprawczy', hint: 'zarząd może nie uwierzyć', fx: { board: 6 }, r: 'Zarząd daje Ci jeszcze trochę czasu.', alt: { p: () => S.mem.liar >= 2 ? 0.6 : 0.25, fx: { board: -3 }, r: '„Słyszeliśmy to już wcześniej” – prezes nie dał się przekonać.' } },
      { t: 'Poproś o wzmocnienia', fn: () => rnd() < 0.45 ? { tb: Math.round(userClub().tv * 4), board: -2 } : { board: -5 }, r: 'Rozmowa była napięta.' },
      { t: 'Weź winę na siebie', fx: { board: 3, team: 4, mgr: -0.3 }, r: 'Szatnia docenia, że ich osłaniasz.' }] },
  { id: 'wonderkid', cat: 'Skauting', w: 2, ext: true, ctx: () => { const p = PALL.filter(p => p.tid >= 0 && p.tid !== S.user && p.age <= 19 && p.pot >= 78); return p.length ? { p: pick(p) } : null; },
    title: 'Cynk o talencie', text: c => `Znajomy agent podsuwa nazwisko: ${c.p.n} (${c.p.age} l., ${clubName(c.p)}). Podobno ogromny potencjał.`,
    choices: [{ t: 'Dodaj do obserwowanych (wiedza 75%)', fn: c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 75); return {}; }, r: 'Zawodnik trafił na Twoją listę.' },
      { t: 'Zignoruj', fx: {}, r: 'Może kiedyś…' }] },
  { id: 'winstreak', cat: 'Prasa', w: 3, ctx: () => lastRes(4).length === 4 && lastRes(4).every(r => r === 'W') ? {} : null, title: 'Media zachwycone', text: () => 'Po serii zwycięstw dziennikarze nazywają Cię „objawieniem sezonu”.',
    choices: [{ t: 'Podziękuj drużynie', fx: { team: 4, press: 2 }, r: 'Zawodnicy czują się docenieni.' },
      { t: '„To dopiero początek”', hint: 'zobowiązuje', fx: { fans: 6, press: 2, boast: true }, r: 'Oczekiwania rosną…' },
      { t: 'Studź emocje', fx: { board: 3, fans: -2 }, r: 'Rozsądnie – choć kibice chcieli świętować.' }] },
  { id: 'captainask', cat: 'Szatnia', w: 2, ctx: () => S.captain == null && uPlayers().length > 11 ? { p: uPlayers().slice().sort((a, b) => (b.age + b.ovr / 2) - (a.age + a.ovr / 2))[0] } : null,
    title: 'Wybór kapitana', text: c => `Drużyna nie ma kapitana. Kandydat starszyzny szatni: ${c.p.n}.`,
    choices: [{ t: 'Mianuj go kapitanem', fx: { captain: true, player: 10, team: 2 }, r: 'Opaska ma właściciela.' },
      { t: 'Wybiorę sam później (karta zawodnika)', fx: { team: -1 }, r: 'Decyzja odłożona – szatnia czeka.' }] },
  /* --- wydarzenia wynikające ze stanu gry --- */
  { id: 'injurycrisis', cat: 'Medycyna', w: 4, ctx: () => uPlayers().filter(p => p.inj).length >= 4 ? {} : null, title: 'Plaga kontuzji', text: () => `W klubie jest ${uPlayers().filter(p => p.inj).length} kontuzjowanych zawodników. Sztab medyczny alarmuje.`,
    choices: [{ t: 'Zatrudnij dodatkowego fizjoterapeutę', fn: () => { for (const p of uPlayers()) if (p.inj) p.inj = Math.max(1, Math.round(p.inj * 0.7)); return { money: -Math.round(userClub().tv * 2) }; }, r: 'Rehabilitacja przyspieszyła.' },
      { t: 'Zmniejsz intensywność treningów', fx: { teamFit: 6, team: 1 }, r: 'Zawodnicy odpoczną – kosztem formy.', },
      { t: 'Nic nie zmieniaj', fx: { board: -2 }, r: 'Ryzykowne przy tylu urazach.' }] },
  { id: 'intfatigue', cat: 'Medycyna', w: 3, ctx: () => { const p = randPlayer(p => p.caps > 0 && p.fit < 80); return p ? { p } : null; }, title: 'Zmęczenie po zgrupowaniu', text: c => `${c.p.n} wrócił ze zgrupowania reprezentacji wyraźnie zmęczony.`,
    choices: [{ t: 'Daj mu wolne na regenerację', fx: { fit: 15, player: 3, form: -2 }, r: 'Odpocznie.' },
      { t: 'Gra jak zwykle', hint: 'ryzyko urazu', fx: { player: 1 }, r: 'Zagra.', alt: { p: () => 0.25, fn: () => ({ inj: ri(10, 25) }), r: 'Organizm nie wytrzymał – drobny uraz mięśniowy.' } }] },
  { id: 'budgetcut', cat: 'Zarząd', w: 2, ctx: () => userClub().bal < userClub().tv * 10 ? {} : null, title: 'Cięcia budżetowe', text: () => 'Zarząd zapowiada cięcie budżetu transferowego o 30% z powodu sytuacji finansowej.',
    choices: [{ t: 'Zaakceptuj', fn: () => ({ tb: -Math.round(Math.max(0, userClub().tb) * 0.3), board: 4 }), r: 'Zarząd docenia zrozumienie.' },
      { t: 'Walcz o pieniądze', hint: 'może się nie udać', fx: { board: -2 }, r: 'Udało się obronić budżet.', alt: { p: () => S.board.conf < 50 ? 0.6 : 0.3, fn: () => ({ tb: -Math.round(Math.max(0, userClub().tb) * 0.4), board: -5 }), r: 'Prezes się zdenerwował – cięcie jest jeszcze większe.' } }] },
  { id: 'medialeak', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Przeciek z szatni', text: () => 'Gazeta opisuje szczegóły Twojej odprawy i wymianę zdań z zawodnikami. Ktoś z szatni rozmawia z mediami.',
    choices: [{ t: 'Szukaj kreta', fx: { team: -5, press: 2 }, r: 'Atmosfera podejrzliwości.', mem: 'strict' },
      { t: 'Zamknij treningi dla mediów', fx: { press: -6, team: 2 }, r: 'Dziennikarze są wściekli.' },
      { t: 'Zbagatelizuj', fx: { press: -2 }, r: 'Sprawa przycicha… na razie.', follow: ['f_leak2', 20, 45, 0.35] }] },
  { id: 'f_leak2', cat: 'Prasa', follow: true, title: 'Kolejny przeciek', text: () => 'Ten sam dziennikarz publikuje Twój skład dzień przed meczem. Rywal był przygotowany.',
    choices: [{ t: 'Ogłoś kary za kontakty z mediami', fx: { team: -3, press: -3, board: 2 }, r: 'Przecieki ustały.' }, { t: 'Udawaj, że nic się nie stało', fx: { board: -4, team: -2 }, r: 'Szatnia traci zaufanie.' }] },
  { id: 'tapup', cat: 'Kontrakty', w: 3, ctx: () => { const p = randPlayer(p => p.con <= 1 && !p.loan && p.ovr >= teamLevel(userClub())); return p ? { p } : null; }, title: 'Podchody rywala', text: c => `Media donoszą, że inny klub potajemnie rozmawia z ${c.p.n}, któremu kończy się kontrakt.`,
    choices: [{ t: 'Zaproponuj od razu nowy kontrakt', fn: c => { const r = renewContract(c.p.id, 3); return r.ok ? { player: 6 } : { player: -6, press: -2 }; }, r: 'Negocjacje zakończone.' },
      { t: 'Zgłoś sprawę do federacji', fx: { press: 3, player: -10, board: 2 }, r: 'Rywal dostał ostrzeżenie, ale zawodnik czuje się źle.' },
      { t: 'Odpuść', fx: { player: -3 }, r: 'Zawodnik prawdopodobnie odejdzie.' }] },
  { id: 'veteran', cat: 'Szatnia', w: 2, ctx: () => { const p = randPlayer(p => p.age >= 33); return p ? { p } : null; }, title: 'Weteran myśli o emeryturze', text: c => `${c.p.n} (${c.p.age} l.) zastanawia się, czy to nie czas zakończyć karierę.`,
    choices: [{ t: 'Przekonaj go do jeszcze jednego sezonu', fn: c => { c.p.con = Math.max(c.p.con, 2); return { player: 8, wage: 0.1 }; }, r: 'Zostaje – szatnia ceni jego doświadczenie.' },
      { t: 'Zaproponuj mecz pożegnalny', fx: { fans: 7, press: 3, player: 5 }, r: 'Piękne pożegnanie na koniec sezonu.' },
      { t: 'Nie wtrącaj się', fx: { player: -3 }, r: 'Sam podejmie decyzję.' }] },
  { id: 'refcontro', cat: 'Prasa', w: 3, ctx: () => lastRes(1)[0] === 'L' ? {} : null, title: 'Kontrowersje sędziowskie', text: () => 'Po porażce kibice i media kłócą się o niepodyktowany rzut karny dla Twojej drużyny.',
    choices: [{ t: 'Skrytykuj sędziego', fn: () => ({ fans: 5, board: -2, money: -Math.round(userClub().tv * 0.5) }), r: 'Kara finansowa od ligi, ale kibice są z Tobą.', mem: 'media' },
      { t: 'Przyjmij porażkę z klasą', fx: { press: 4, fans: -2 }, r: 'Fair play doceniony w mediach.' }] },
  { id: 'poach', cat: 'Akademia', w: 3, ctx: () => { const y = S.acad.youth.filter(y => y.acad && y.acad.est >= 72).sort((a, b) => b.acad.est - a.acad.est)[0]; return y ? { p: y } : null; }, title: 'Podbieranie talentu', text: c => `Duży klub próbuje podkupić ${c.p.n} z Twojej akademii, oferując jego rodzinie wysoką pensję.`,
    choices: [{ t: 'Daj mu profesjonalny kontrakt', fn: c => { promoteYouth(c.p.id); return { fans: 3 }; }, r: 'Talent zostaje i dołącza do pierwszego zespołu.' },
      { t: 'Zaoferuj premię rodzinie', fn: () => ({ money: -Math.round(userClub().tv * 1.5) }), r: 'Rodzina przyjęła ofertę – na razie.', alt: { p: c => traits(c.p).loy <= 7 ? 0.5 : 0.15, fn: c => { releaseYouth(c.p.id); return { money: Math.round(userClub().tv * 2), fans: -5 }; }, r: 'Mimo premii odszedł – klub dostał tylko odszkodowanie.' } },
      { t: 'Pozwól mu odejść za odszkodowanie', fn: c => { releaseYouth(c.p.id); return { money: Math.round(userClub().tv * 3), fans: -6 }; }, r: 'Pieniądze się przydadzą, ale kibice są rozczarowani.' }] },
  { id: 'position', cat: 'Szatnia', w: 2, ctx: () => { const p = randPlayer(p => p.alt && p.alt.length && p.st.apps > 2); return p ? { p } : null; }, title: 'Chcę grać gdzie indziej', text: c => `${c.p.n} uważa, że lepiej sprawdzi się jako ${POS_PL[c.p.alt[0]]}, a nie ${POS_PL[c.p.pos]}.`,
    choices: [{ t: 'Spróbujmy', hint: 'nowa pozycja w karcie', fn: c => { const old = c.p.pos; c.p.pos = c.p.alt[0]; c.p.alt = [old, ...c.p.alt.slice(1)]; c.p.ovr = calcOvr(c.p.pos, c.p.a); return { player: 8 }; }, r: 'Zawodnik przechodzi na nową pozycję.' },
      { t: 'Zostajesz na swojej pozycji', fx: { player: -6 }, r: 'Zawodnik nie jest przekonany.' }] },
  { id: 'bonding', cat: 'Szatnia', w: 2, ctx: () => ({}), title: 'Wyjazd integracyjny', text: () => 'Kapitan proponuje wspólny wyjazd integracyjny drużyny w przerwie między meczami.',
    choices: [{ t: 'Zgoda – klub płaci', hint: 'drobne ryzyko', fn: () => ({ team: 6, money: -Math.round(userClub().tv * 0.8) }), r: 'Atmosfera świetna.', alt: { p: () => 0.15, fn: () => ({ team: 3, press: -5, board: -3 }), r: 'Zdjęcia z imprezy wyciekły do mediów.' } },
      { t: 'Nie teraz', fx: { team: -2 }, r: 'Zawodnicy są trochę zawiedzeni.' }] },
  { id: 'deadline', cat: 'Transfery', w: 2, ext: true, ctx: () => { if (!windowOpen()) return null; const p = PALL.filter(p => p.tid >= 0 && p.tid !== S.user && p.age <= 29 && p.ovr >= teamLevel(userClub()) && p.ovr <= teamLevel(userClub()) + 6 && !p.loan && club(p.tid).players.length > 19 && askPrice(p) * 0.85 <= Math.min(userClub().tb, userClub().bal) && playerInterest(p).ok && !notForSale(p) && !(p._noTalk > absDay())); return p.length ? { p: pick(p) } : null; },
    title: 'Okazja na rynku', text: c => `Agent dzwoni: ${c.p.n} (${POS_PL[c.p.pos]}, ${clubName(c.p)}) jest do wzięcia – ${club(c.p.tid).bal < c.p.val ? 'jego klub potrzebuje pieniędzy' : 'klub chce odmłodzić i przebudować kadrę'}. Może być taniej, jeśli szybko się zgłosisz.`,
    choices: [{ t: 'Dodaj do obserwowanych i sprawdź', fn: c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 85); c.p._disc = { k: 0.85, until: absDay() + 30 }; return {}; }, r: 'Zawodnik na liście obserwowanych – przez 30 dni jego klub zgodzi się na cenę niższą o 15%.' },
      { t: 'Nie interesuje mnie', fx: {}, r: 'Agent zadzwoni do kogoś innego.' }] },
  { id: 'journalist', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Wywiad na wyłączność', text: () => 'Popularny dziennikarz prosi o długi wywiad o Twojej filozofii pracy.',
    choices: [{ t: 'Zgódź się', hint: 'słowa mogą zostać przekręcone', fx: { press: 6, fans: 2, mgr: 0.2 }, r: 'Świetny materiał – czyta go cały kraj.', alt: { p: () => S.press < 40 ? 0.45 : 0.2, fx: { press: -4, team: -3 }, r: 'Tytuł wyrwał Twoje słowa z kontekstu – zawodnicy poczuli się urażeni.' } },
      { t: 'Odmów', fx: { press: -3 }, r: 'Dziennikarz zapamięta.' }] },
  { id: 'sponsorbonus', cat: 'Zarząd', w: 2, ctx: () => lastRes(3).filter(r => r === 'W').length >= 2 ? {} : null, title: 'Premia od sponsora', text: () => 'Główny sponsor proponuje wybór: stała premia teraz albo dużo wyższa premia za awans/miejsce w czołówce na koniec sezonu.',
    choices: [{ t: 'Stała premia teraz', fn: () => ({ money: Math.round(userClub().spons * 5) }), r: 'Pewne pieniądze na koncie.' },
      { t: 'Premia za wynik', hint: 'tylko jeśli zrealizujesz cel', fn: () => { S.sponsBet = { season: S.season, amount: Math.round(userClub().spons * 14) }; return {}; }, r: 'Zakład przyjęty – rozliczenie na koniec sezonu.' }] },
  { id: 'unsettled', cat: 'Transfery', follow: true, title: 'Zawodnik chce odejść', text: c => `${c.p.n} jest wściekły, że odrzuciłeś ofertę ${c.p._suitor || 'większego klubu'}. Jego agent mówi o „szansie życia”, która przechodzi mu koło nosa.`,
    choices: [{ t: 'Daj mu podwyżkę i nowy kontrakt', hint: 'kosztowne', fn: c => { c.p.con = Math.max(c.p.con, 3); return { wage: 0.25, player: 12, samepos: -2 }; }, r: 'Pensja w górę – zawodnik się uspokoił. Inni widzą, że można wywalczyć podwyżkę.' },
      { t: '„Jesteś tu kluczowy – zostajesz”', hint: 'zależy od charakteru', fn: c => traits(c.p).pro >= 12 || traits(c.p).loy >= 13 ? { player: 4, team: 1 } : { player: -12, form: -6 }, r: 'Twarde stanowisko.', mem: 'strict' },
      { t: 'Obiecaj, że następną ofertę przyjmiesz', fx: { player: 7, list: true, fans: -3 }, r: 'Zawodnik trafia na listę transferową – kibice nie są zachwyceni.', mem: 'soft' }] },
  { id: 'approach', cat: 'Prasa', follow: true, title: 'Media łączą Cię z innym klubem', text: () => { const c = S.approach != null ? club(S.approach) : null; return `${c ? c.name : 'Inny klub'} zwolnił trenera, a dziennikarze twierdzą, że jesteś głównym kandydatem do przejęcia drużyny. Zarząd i kibice czekają na Twoją reakcję.`; },
    choices: [{ t: 'Dementuj – jestem lojalny wobec klubu', fx: { board: 5, fans: 4, press: 1 }, r: 'Kibice skandują Twoje nazwisko.', mem: 'honest' },
      { t: '„Nie wykluczam niczego”', hint: 'zarząd będzie urażony', fn: () => { const c = S.approach != null ? club(S.approach) : null; if (c && c.id !== S.user) offerJob(c, 'oficjalnie składa Ci ofertę'); return { board: -7, fans: -5, press: 3 }; }, r: 'Telefon zadzwonił – ale w Twoim klubie zrobiło się chłodno.' },
      { t: 'Bez komentarza', fx: { press: -3 }, r: 'Spekulacje trwają.', alt: { p: () => 0.35, fx: { press: -3, board: -4 }, r: 'Milczenie odebrano jako sygnał, że chcesz odejść.' } }] },
  { id: 'leaderbench', cat: 'Szatnia', w: 3, ctx: () => { const l = squadLeaders().filter(p => p.pt < 0.3 && !p.inj); return l.length ? { p: l[0] } : null; }, title: 'Lider szatni na ławce', text: c => `${c.p.n} – jeden z liderów szatni – coraz rzadziej gra. Część zespołu stoi za nim murem i atmosfera gęstnieje.`,
    choices: [{ t: 'Przywróć go do składu', hint: 'obietnica gry', fx: { player: 8, team: 3, promise: true, samepos: -4 }, r: 'Szatnia odetchnęła – musisz teraz dać mu grać.' },
      { t: 'Wyjaśnij mu nową rolę – mentora', hint: 'zależy od charakteru', fn: c => traits(c.p).pro >= 12 ? { player: 3, team: 2 } : { player: -10, team: -4 }, r: 'Rozmowa o nowej roli w zespole.' },
      { t: 'Decyzje sportowe są moje', fx: { player: -8, team: -5, board: 2 }, r: 'Autorytet zachowany, ale atmosfera siadła.', mem: 'strict' }] },
  { id: 'clique', cat: 'Szatnia', w: 3, ctx: () => { const g = squadCliques().find(g => avg(g.ps.map(p => p.mor)) < 45); return g ? { p: g.ps[0], nat: g.nat } : null; }, title: 'Grupa trzyma się z boku', text: c => `Zawodnicy z kraju ${NAT[c.p.nat] ? NAT[c.p.nat].name : c.p.nat} trzymają się razem i są coraz bardziej niezadowoleni. Ich nastroje udzielają się reszcie.`,
    choices: [{ t: 'Spotkanie z całą grupą', fn: c => { for (const p of squadCliques().find(g => g.nat === c.p.nat)?.ps || []) p.mor = clamp(p.mor + 8, 0, 100); return { team: 1 }; }, r: 'Wysłuchałeś ich – grupa poczuła się doceniona.', alt: { p: () => 0.25, fn: c => { for (const p of squadCliques().find(g => g.nat === c.p.nat)?.ps || []) p.mor = clamp(p.mor - 4, 0, 100); return { team: -2 }; }, r: 'Spotkanie zamieniło się w listę żądań.' } },
      { t: 'Wymieszaj pokoje i grupy treningowe', fx: { team: 3, player: -4 }, r: 'Na początku zgrzyty, ale zespół się integruje.' },
      { t: 'Zignoruj', fn: c => { for (const p of squadCliques().find(g => g.nat === c.p.nat)?.ps || []) p.mor = clamp(p.mor - 6, 0, 100); return { team: -2 }; }, r: 'Podziały w szatni się pogłębiają.' }] },
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

/* spotkania z zawodnikami (sami proszą o rozmowę) */
function meetingEvent(p) {
  const status = playerStatus(p), t = traits(p);
  const unhappyTime = p.pt < 0.35 && (status === 'Kluczowy' || status === 'Podstawowy' || t.amb >= 13);
  const broken = S.mem.liar >= 2;
  return {
    id: 'meeting', cat: 'Rozmowa', title: `${p.n} prosi o rozmowę`, ctx: { p },
    text: (unhappyTime ? pick([`${p.n} jest niezadowolony z liczby minut: „Trenerze, czuję, że zasługuję na więcej”.`, `${p.n}: „Siedzę na ławce, a przecież trenuję lepiej niż inni. Co mam zrobić?”`])
      : pick([`${p.n} nie czuje się w klubie najlepiej i chce porozmawiać o swojej przyszłości.`, `${p.n} przyszedł z agentem – mówi, że stracił motywację.`])) + (broken ? ' W szatni mówi się, że nie dotrzymujesz obietnic.' : ''),
    choices: [
      { t: 'Obiecaj regularną grę', hint: broken ? 'może Ci nie uwierzyć' : 'musisz dotrzymać słowa', fx: { player: 12, promise: true, samepos: -3 }, r: 'Zawodnik trzyma Cię za słowo: 3 tygodnie regularnej gry.', alt: { p: () => broken ? 0.5 : 0, fx: { player: -5 }, r: '„Już to słyszałem” – zawodnik Ci nie uwierzył.' } },
      { t: 'Zaproponuj nowy kontrakt', fn: c => { if (c.p.con >= 4) return { player: 2 }; const r = renewContract(c.p.id, 3); return r.ok ? { player: 7 } : { player: -5 }; }, r: 'Rozmowa o pieniądzach…' },
      { t: 'Powiedz, że musi walczyć o miejsce', hint: 'zależy od charakteru', fn: c => traits(c.p).pro >= 12 || traits(c.p).tem <= 7 ? { player: 3, form: 5 } : { player: -10 }, r: 'Twarda postawa.', mem: 'honest' },
      { t: 'Zgódź się na transfer', fx: { player: 5, list: true, team: -2 }, r: 'Zawodnik trafia na listę transferową.' },
    ],
  };
}
function contractEvent(p) {
  return {
    id: 'contract', cat: 'Kontrakty', title: 'Kontrakt kończy się', ctx: { p },
    text: `${p.n} ma umowę ważną do końca sezonu. Jego agent pyta o przedłużenie (żądanie: ${money(renewDemand(p, 3))}/tydz.).`,
    choices: [
      { t: 'Przedłuż na 3 lata', fn: c => { const r = renewContract(c.p.id, 3); return r.ok ? { player: 7 } : { player: -8, press: -2 }; }, r: 'Negocjacje zakończone.' },
      { t: 'Przedłuż na 1 rok', fn: c => { const r = renewContract(c.p.id, 1); return r.ok ? { player: 2 } : { player: -6 }; }, r: 'Krótka umowa.' },
      { t: 'Nie przedłużaj', fx: { player: -12 }, r: 'Zawodnik odejdzie po sezonie.' },
    ],
  };
}

/* ---------- obsługa kolejki wydarzeń ---------- */
const evText = (x, ctx) => typeof x === 'function' ? x(ctx) : x;
function pushEvent(e, ctx) {
  const ev = { uid: S.nextId++, id: e.id, cat: e.cat, title: e.title, text: evText(e.text, ctx), choices: e.choices.map(c => evText(c.t, ctx)), hints: e.choices.map(c => c.hint || ''), ctx: ctxRef(ctx) };
  S.pending.push(ev); S.evSeen[e.id] = S.season; S.evCat[e.cat] = absDay();
  S.evCount = S.evCount || {}; S.evCount[e.id] = (S.evCount[e.id] || 0) + 1;
  msg(`📌 ${e.title}`, ev.text + ' (wymaga decyzji – Pulpit)'); ev.mid = S.inbox[0].id;
}
const ctxRef = c => ({ p: c && c.p ? c.p.id : null, q: c && c.q ? c.q.id : null });
const ctxDeref = c => ({ p: c.p != null ? pget(c.p) : null, q: c.q != null ? pget(c.q) : null });
function eventDef(ev) {
  if (ev.id === 'meeting') return meetingEvent(pget(ev.ctx.p));
  if (ev.id === 'contract') return contractEvent(pget(ev.ctx.p));
  return EVENTS.find(e => e.id === ev.id);
}
function resolveEvent(uid, ci) {
  const ev = S.pending.find(e => e.uid === uid); if (!ev) return null;
  S.pending = S.pending.filter(e => e !== ev);
  const ctx = ctxDeref(ev.ctx);
  const def = eventDef(ev); if (!def) return { r: 'Sprawa nieaktualna.', fx: [] };
  if (def.ext && ctx.p && (ctx.p.tid < 0 || ctx.p.tid === S.user)) return { r: 'Sprawa nieaktualna – zawodnik zmienił już klub.', fx: [] };
  if ((ev.ctx.p != null && !ctx.p) || (ctx.p && !def.ext && ctx.p.tid !== S.user && ctx.p.tid !== -3)) return { r: 'Sprawa nieaktualna – zawodnik nie jest już w klubie.', fx: [] };
  const ch = def.choices[ci] || def.choices[0];
  let o = ch, risky = false;
  if (ch.alt && rnd() < evText(ch.alt.p, ctx)) { o = ch.alt; risky = true; }
  const fx = o.fn ? o.fn(ctx) : o.fx;
  const out = applyFx(fx || {}, ctx);
  if (ch.mem) S.mem[ch.mem] = (S.mem[ch.mem] || 0) + 1;
  if (ch.follow && !risky) { const [fid, a, b, pr] = ch.follow; if (rnd() < pr) S.followups.push({ id: fid, due: absDay() + ri(a, b), ctx: ev.ctx }); }
  const im = ev.mid != null && S.inbox.find(m => m.id === ev.mid); if (im) { im.body = im.body.replace(' (wymaga decyzji – Pulpit)', '') + `\n✔ Decyzja: ${evText(ch.t, ctx)} – ${o.r}`; im.read = true; }
  saveSoon();
  return { r: o.r, fx: out, risky };
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
  // obietnice (3 tygodnie, wymagane ≥55% minut)
  for (const pr of S.promises.slice()) {
    const p = pget(pr.pid);
    if (!p || p.tid !== S.user) { S.promises = S.promises.filter(x => x !== pr); continue; }
    if (now >= pr.until) {
      S.promises = S.promises.filter(x => x !== pr);
      if (p.pt >= 0.55) { p.mor = clamp(p.mor + 8, 0, 100); S.mem.honest++; msg('Obietnica dotrzymana', `${p.n} docenia, że dotrzymałeś słowa.`); }
      else { p.mor = clamp(p.mor - 25, 0, 100); S.mem.liar++; for (const q of ut.players) q.mor = clamp(q.mor - 3, 0, 100); S.press = clamp(S.press - 3, 0, 100); msg('Złamana obietnica', `${p.n} czuje się oszukany – obiecałeś mu grę. Szatnia patrzy na Ciebie podejrzliwie.`); }
    }
  }
  if (S.pending.length >= 3) return;
  // zaplanowane konsekwencje
  const due = S.followups.find(f => f.due <= now);
  if (due) {
    S.followups = S.followups.filter(f => f !== due);
    const e = EVENTS.find(x => x.id === due.id), ctx = e && e.ctxFn ? e.ctxFn() : ctxDeref(due.ctx);
    if (e && (!due.ctx.p || (ctx.p && ctx.p.tid === S.user))) { pushEvent(e, ctx); return; }
  }
  // zawodnicy proszą o rozmowę (maks. raz na 2 tygodnie, każdy co 40 dni)
  if (!S.lastMeet || now - S.lastMeet >= 14) {
    const unhappy = ut.players.filter(p => p.mor < 33 && !S.pending.some(e => e.ctx.p === p.id) && !S.promises.some(x => x.pid === p.id) && (!p._meet || now - p._meet >= 40));
    if (unhappy.length && rnd() < 0.55) { const p = pick(unhappy); p._meet = now; S.lastMeet = now; pushEvent(meetingEvent(p), { p }); return; }
  }
  if (d.ls >= 18 && d.ls <= 34) {
    const exp = ut.players.filter(p => p.con <= 1 && !p.loan && p.ovr >= teamLevel(ut) - 5 && (p._cev || 0) !== S.season);
    S.cev = S.cev && S.cev.s === S.season ? S.cev : { s: S.season, n: 0 };
    if (exp.length && S.cev.n < 2 && rnd() < 0.5) { const p = exp.sort((a, b) => b.ovr - a.ovr)[0]; p._cev = S.season; S.cev.n++; pushEvent(contractEvent(p), { p }); return; }
  }
  // losowe wydarzenie: każde maks. raz na sezon, kategoria co 3 tygodnie, rzadziej powtarzane w kolejnych sezonach
  if (rnd() < 0.36) {
    S.evCount = S.evCount || {};
    const opts = EVENTS.filter(e => !e.follow && S.evSeen[e.id] !== S.season && (!S.evCat[e.cat] || now - S.evCat[e.cat] >= 21)).map(e => ({ e, c: e.ctx() })).filter(x => x.c);
    if (opts.length) { const x = wpick(opts, o => o.e.w / (1 + (S.evCount[o.e.id] || 0) * 0.6)); pushEvent(x.e, x.c); }
  }
}

/* ---------- mecz: kibice, prasa, serie, nagłówki ---------- */
const HEAD_W = ['{c} rozbija rywala!', 'Pewne zwycięstwo {c}', '{c} górą w meczu z {o}', 'Trzy punkty dla {c}!', '{o} bez argumentów w starciu z {c}', 'Kolejny krok {c} w górę tabeli'];
const HEAD_L = ['Bolesna porażka {c}', '{c} bez szans z {o}', 'Kryzys w {c}?', 'Kibice {c} kręcą głowami', '{o} punktuje słabości {c}', 'Czarny dzień {c}'];
const HEAD_D = ['Podział punktów w meczu {c} – {o}', '{c} tylko remisuje', 'Remis, który nikogo nie zadowala', 'Bez rozstrzygnięcia: {c} – {o}'];
function afterMatchMeta(m, x, mine, opp, gd) {
  metaInit();
  const r = gd > 0 ? 'W' : gd < 0 ? 'L' : 'D';
  S.results.push(r); if (S.results.length > 40) S.results.shift();
  const st = S.stats; st.games++; if (r === 'W') st.wins++;
  st.unbeaten = r === 'L' ? 0 : st.unbeaten + 1; st.bestUnbeaten = Math.max(st.bestUnbeaten, st.unbeaten);
  const big = Math.abs(gd) >= 3, upset = opp.t.rep - mine.t.rep >= 8;
  S.fans = clamp(S.fans + (r === 'W' ? 2 + (big ? 2 : 0) + (upset ? 3 : 0) : r === 'L' ? -3 - (big ? 3 : 0) : 0), 0, 100);
  S.press = clamp(S.press + (r === 'W' ? 1 : r === 'L' ? -1.5 : 0), 0, 100);
  if (S.boast) { S.boast = false; if (r !== 'W') { S.fans = clamp(S.fans - (r === 'L' ? 7 : 4), 0, 100); S.press = clamp(S.press - (r === 'L' ? 7 : 4), 0, 100); S.mem.liar++; msg('Prasa', 'Media przypominają Twoje butne zapowiedzi… Wizerunkowa wpadka.'); } else { S.fans = clamp(S.fans + 3, 0, 100); mgrGain(0.2); } }
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
  if (!big && rnd() > 0.3) return null;
  const fav = (mine.rep || 50) >= (opp.rep || 50) + 4, ps = mine.players || [], star = ps.slice().sort((a, b) => b.ovr - a.ovr)[0];
  const inj = ps.filter(p => p.inj).sort((a, b) => b.ovr - a.ovr)[0], losing = lastRes(3).filter(r => r === 'L').length >= 2, winning = lastRes(3).filter(r => r === 'W').length >= 3;
  const listed = ps.find(p => p.listed), young = ps.filter(p => p.age <= 20 && p.st.apps > 0).sort((a, b) => b.ovr - a.ovr)[0];
  const qs = [
    { q: `Mecz: ${mine.name} – ${opp.name}. Kto jest faworytem?`, a: [['„Szanujemy rywala, ale gramy o zwycięstwo.”', 'calm', { team: 2, press: 1 }], [fav ? '„My. I udowodnimy to na boisku.”' : '„Oni – nie mamy nic do stracenia.”', 'bold', fav ? { team: 3, fans: 3, boast: true } : { team: 3, press: 1 }], ['„Wygramy, gwarantuję.”', 'bold', { fans: 5, press: 3, team: 2, boast: true }]] },
    { q: 'Jak ocenia Pan atmosferę w zespole?', a: [['„Jesteśmy jak rodzina.”', 'calm', { team: 2, press: 1 }], ['„Wszyscy muszą dać z siebie więcej.”', 'harsh', { team: -2, fans: 2, press: 2 }], ['„To zostaje w szatni.”', 'evasive', { press: -3, team: 1 }]] },
    { q: `Ile zostało do celu zarządu? ${S.board.text}`, a: [['„Idziemy zgodnie z planem.”', 'calm', { board: 2, press: 1 }], ['„Stać nas na więcej niż cel zarządu.”', 'bold', { fans: 4, board: 1, boast: true }], ['„Cele stawia zarząd, ja skupiam się na meczu.”', 'evasive', { board: -2 }]] },
  ];
  const dn = typeof derbyName === 'function' && mine.id != null ? derbyName(mine.id, opp.id) : null;
  if (dn) qs.push({ q: `${dn}! Co powie Pan kibicom przed tym meczem?`, a: [['„To dla nas mecz sezonu – damy z siebie wszystko.”', 'calm', { fans: 3, team: 2 }], ['„To miasto/region jest nasze. Pokażemy to na boisku.”', 'bold', { fans: 7, team: 3, press: 2, boast: true }], ['„To tylko trzy punkty, jak w każdym meczu.”', 'evasive', { fans: -5, press: -1 }]] }, { q: `${dn}! Co powie Pan kibicom przed tym meczem?`, a: [['„To dla nas mecz sezonu – damy z siebie wszystko.”', 'calm', { fans: 3, team: 2 }], ['„To miasto/region jest nasze. Pokażemy to na boisku.”', 'bold', { fans: 7, team: 3, press: 2, boast: true }], ['„To tylko trzy punkty, jak w każdym meczu.”', 'evasive', { fans: -5, press: -1 }]] });
  if (losing) qs.push({ q: 'Seria słabych wyników. Czy czuje się Pan zagrożony?', a: [['„Wierzę w ten zespół w 100%.”', 'calm', { team: 3, board: -1 }], ['„Zawodnicy zawodzą – czas na zmiany.”', 'harsh', { team: -5, fans: 3, board: 2 }], ['„Nie będę komentował plotek.”', 'evasive', { press: -4 }]] });
  if (winning) qs.push({ q: 'Seria zwycięstw – czy to drużyna na mistrzostwo?', a: [['„Krok po kroku.”', 'calm', { board: 2 }], ['„Tak, celujemy w tytuł!”', 'bold', { fans: 6, boast: true }], ['„Najpierw utrzymajmy formę.”', 'calm', { team: 1, press: 1 }]] });
  if (star) qs.push({ q: `Czy ${star.n} jest kluczem do sukcesu?`, p: star.id, a: [['„To lider, ale wygrywa drużyna.”', 'calm', { team: 2, player: 2 }], ['„Bez niego bylibyśmy innym zespołem.”', 'bold', { player: 8, team: -3 }], ['„Oczekuję od niego więcej.”', 'harsh', traits(star).pro >= 12 ? { player: 3, form: 4 } : { player: -9 }]] });
  if (inj) qs.push({ q: `Jak bardzo zabraknie kontuzjowanego ${inj.n}?`, p: inj.id, a: [['„Mamy szeroką kadrę.”', 'calm', { team: 2, player: -2 }], ['„To ogromna strata.”', 'calm', { player: 4, team: -1 }], ['„Nie szukamy wymówek.”', 'harsh', { board: 2, fans: 1 }]] });
  if (listed) qs.push({ q: `Czy ${listed.n} odejdzie z klubu?`, p: listed.id, a: [['„Wszystko jest możliwe.”', 'evasive', { player: -3 }], ['„Chcę, żeby został.”', 'calm', { player: 6, fans: 2 }], ['„Nie jest już częścią moich planów.”', 'harsh', { player: -12, team: -2 }]] });
  if (young) qs.push({ q: `Kibice zachwycają się ${young.n}. Czy to przyszła gwiazda?`, p: young.id, a: [['„Ma ogromny potencjał.”', 'bold', { player: 6, fans: 3 }], ['„Musi jeszcze dużo pracować.”', 'harsh', traits(young).pro >= 12 ? { player: 2, form: 3 } : { player: -5 }], ['„Nie nakładajmy na niego presji.”', 'calm', { player: 2, press: 1 }]] });
  const q = pick(qs);
  return { q: q.q, star: q.p || null, a: q.a.map(([t, tone, fx]) => [t, fx, tone]) };
}
/* konferencja po meczu – pytanie zależne od przebiegu spotkania */
function postMatchPress(m, user) {
  if (!m || m.comp === 'P' || m.comp === 'F') return null;
  const me = user === 'h' ? m.home : m.away, op = me === m.home ? m.away : m.home, gd = me.goals - op.goals;
  const ev = [...me.scorers.map(g => ({ min: g.min, d: 1 })), ...op.scorers.map(g => ({ min: g.min, d: -1 }))].sort((a, b) => a.min - b.min);
  let run = 0, worst = 0; for (const e of ev) { run += e.d; worst = Math.min(worst, run); }
  const red = Object.values(me.rec).find(r => r.r), motm = m.motm && me.rec[m.motm.p.id] ? m.motm.p : null, dn = typeof derbyName === 'function' ? derbyName(me.t.id, op.t.id) : null;
  const big = m.comp !== 'L' || dn || Math.abs(gd) >= 3 || red || (worst <= -1 && gd > 0);
  if (!big && rnd() > 0.35) return null;
  const qs = [];
  if (gd >= 3) qs.push({ q: `${me.goals}:${op.goals}! Czy to najlepszy mecz Pana drużyny w tym sezonie?`, a: [['„Cieszymy się, ale jutro wracamy do pracy.”', 'calm', { team: 2, board: 1 }], ['„Tak gra drużyna, która myśli o czymś wielkim.”', 'bold', { fans: 5, team: 2, boast: true }], ['„Rywal ułatwił nam zadanie.”', 'evasive', { press: 2 }]] });
  if (gd > 0 && worst <= -1) qs.push({ q: 'Wielki powrót! Co powiedział Pan zawodnikom, gdy przegrywaliście?', a: [['„Że wierzę w nich do ostatniej minuty.”', 'calm', { team: 4 }], ['„Kilka mocnych słów – i zadziałało.”', 'harsh', { team: 1, fans: 2, press: 2 }], ['„To zostaje w szatni.”', 'evasive', { press: -1, team: 2 }]] });
  if (gd < 0) qs.push({ q: `Porażka ${me.goals}:${op.goals}. Co poszło nie tak?`, a: [['„Biorę odpowiedzialność na siebie.”', 'calm', { team: 3, board: 1, press: 1 }], ['„Zawodnicy nie zrealizowali założeń.”', 'harsh', { team: -4, fans: 2, press: 2 }], ['„Sędzia zdecydował o wyniku.”', 'bold', { fans: 3, press: -3, board: -1 }]] });
  if (gd <= 0 && (me.xg || 0) > (op.xg || 0) + 0.8) qs.push({ q: 'Mieliście dużo więcej sytuacji. Brakuje skuteczności?', a: [['„Gramy dobrze – gole przyjdą.”', 'calm', { team: 2 }], ['„Napastnicy muszą to poprawić.”', 'harsh', { team: -2, press: 1 }], ['„Piłka bywa niesprawiedliwa.”', 'evasive', { press: 1 }]] });
  if (red) qs.push({ q: `Czerwona kartka dla ${red.p.n}. Czy to zaważyło na meczu?`, p: red.p.id, a: [['„Bronię zawodnika – to była walka.”', 'calm', { player: 5, team: 2, press: -1 }], ['„To było nieodpowiedzialne.”', 'harsh', { player: -6, board: 1, press: 2 }], ['„Wyjaśnimy to wewnętrznie.”', 'evasive', { player: 1 }]] });
  if (dn) qs.push({ q: gd > 0 ? `Wygrane ${dn}! Co to znaczy dla kibiców?` : gd < 0 ? `Przegrane ${dn}. Jak przeprosi Pan kibiców?` : `Remis w ${dn}. Zadowolony?`, a: [['„Ten wynik jest dla kibiców.”', 'calm', { fans: gd >= 0 ? 4 : 1, team: 1 }], [gd >= 0 ? '„To miasto jest nasze.”' : '„Rewanż będzie inny – obiecuję.”', 'bold', { fans: gd >= 0 ? 6 : 3, boast: gd < 0 }], ['„To tylko trzy punkty.”', 'evasive', { fans: -3, press: 1 }]] });
  if (motm && gd >= 0) qs.push({ q: `${motm.n} zawodnikiem meczu. Jak go Pan oceni?`, p: motm.id, a: [['„Wielki występ – zasłużył.”', 'calm', { player: 5, team: 1 }], ['„To dopiero początek jego możliwości.”', 'bold', { player: 7, team: -1 }], ['„Wygrała drużyna, nie jeden zawodnik.”', 'evasive', { team: 2, player: -2 }]] });
  if (!qs.length) qs.push({ q: `Wynik ${me.goals}:${op.goals}. Jak ocenia Pan ten mecz?`, a: [['„Solidny występ, idziemy dalej.”', 'calm', { team: 1, press: 1 }], ['„Stać nas na dużo więcej.”', 'harsh', { team: -1, board: 1 }], ['„Bez komentarza.”', 'evasive', { press: -2 }]] });
  const q = pick(qs);
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
