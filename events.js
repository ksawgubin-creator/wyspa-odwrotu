'use strict';
/* ============================================================
   KARIERA MENEDŻERA – wydarzenia, rozmowy, prasa, kibice,
   kapitan, obietnice, osiągnięcia, gablota
   ============================================================ */
const PERS = ['Profesjonalista', 'Ambitny', 'Lojalny', 'Temperamentny', 'Wyluzowany'];
const PERS_DESC = {
  Profesjonalista: 'Pracowity, dobrze znosi krytykę i presję.', Ambitny: 'Chce grać w wielkim klubie i o trofea.',
  Lojalny: 'Przywiązany do klubu, łatwiej przedłuża umowy.', Temperamentny: 'Emocjonalny – źle znosi krytykę i ławkę.', Wyluzowany: 'Spokojny, mało co go rusza.',
};
const pers = p => p.pers || (p.pers = PERS[(p.id * 7 + 3) % 5]);
function metaInit() {
  if (!S) return;
  if (S.fans == null) S.fans = 60;
  if (S.press == null) S.press = 55;
  S.promises = S.promises || []; S.pending = S.pending || []; S.evLast = S.evLast || {}; S.ach = S.ach || {};
  S.trophies = S.trophies || []; S.results = S.results || []; S.stats = S.stats || { games: 0, wins: 0, unbeaten: 0, bestUnbeaten: 0 };
  if (S.captain === undefined) S.captain = null;
}
const sgn = v => (v > 0 ? '+' : '') + Math.round(v);
const uPlayers = () => userClub().players;
const starPlayer = () => uPlayers().slice().sort((a, b) => b.ovr - a.ovr)[0];
const randPlayer = f => { const l = uPlayers().filter(f || (() => true)); return l.length ? pick(l) : null; };
const lastRes = n => S.results.slice(-n);

/* ---------- efekty wyborów ---------- */
function applyFx(fx, ctx = {}) {
  const ut = userClub(), out = [];
  if (fx.fans) { S.fans = clamp(S.fans + fx.fans, 0, 100); out.push(`🏟️ Kibice ${sgn(fx.fans)}`); }
  if (fx.press) { S.press = clamp(S.press + fx.press, 0, 100); out.push(`📰 Prasa ${sgn(fx.press)}`); }
  if (fx.board) { S.board.conf = clamp(S.board.conf + fx.board, 0, 100); out.push(`🏛️ Zarząd ${sgn(fx.board)}`); }
  if (fx.team) { for (const p of uPlayers()) p.mor = clamp(p.mor + fx.team, 0, 100); out.push(`👥 Szatnia ${sgn(fx.team)}`); }
  if (fx.player && ctx.p) { ctx.p.mor = clamp(ctx.p.mor + fx.player, 0, 100); out.push(`${moraleLabel(ctx.p.mor)[0]} ${shortName(ctx.p)} ${sgn(fx.player)}`); }
  if (fx.player2 && ctx.q) { ctx.q.mor = clamp(ctx.q.mor + fx.player2, 0, 100); out.push(`${moraleLabel(ctx.q.mor)[0]} ${shortName(ctx.q)} ${sgn(fx.player2)}`); }
  if (fx.form && ctx.p) { ctx.p.form = clamp(ctx.p.form + fx.form, 0, 100); out.push(`📈 Forma ${shortName(ctx.p)} ${sgn(fx.form)}`); }
  if (fx.money) { ut.bal += fx.money; ut.fin.inc += Math.max(0, fx.money); ut.fin.exp += Math.max(0, -fx.money); if (fx.money > 0) ut.tb += Math.round(fx.money * 0.5); out.push(`💶 ${fx.money > 0 ? '+' : ''}${money(fx.money)}`); }
  if (fx.mgr) { mgrGain(fx.mgr); out.push(`🧑‍💼 OVR trenera ${fx.mgr > 0 ? '+' : ''}${fx.mgr}`); }
  if (fx.fit && ctx.p) { ctx.p.fit = clamp(ctx.p.fit + fx.fit, 10, 100); out.push(`🔋 Kondycja ${shortName(ctx.p)} ${sgn(fx.fit)}`); }
  if (fx.teamFit) { for (const p of uPlayers()) p.fit = clamp(p.fit + fx.teamFit, 10, 100); out.push(`🔋 Kondycja drużyny ${sgn(fx.teamFit)}`); }
  if (fx.inj && ctx.p) { ctx.p.inj = Math.max(ctx.p.inj, fx.inj); out.push(`🚑 ${shortName(ctx.p)} pauzuje ~${Math.ceil(fx.inj / 7)} tyg.`); }
  if (fx.price) { ut.price = Math.round(ut.price * (1 + fx.price) * 10) / 10; out.push(`🎟️ Ceny biletów ${fx.price > 0 ? '+' : ''}${Math.round(fx.price * 100)}%`); }
  if (fx.spons) { ut.spons = Math.round(ut.spons * (1 + fx.spons)); out.push(`🤝 Sponsorzy ${fx.spons > 0 ? '+' : ''}${Math.round(fx.spons * 100)}%`); }
  if (fx.tb) { ut.tb += fx.tb; out.push(`💼 Budżet transferowy ${fx.tb > 0 ? '+' : ''}${money(fx.tb)}`); }
  if (fx.list && ctx.p) { ctx.p.listed = true; out.push(`📋 ${shortName(ctx.p)} na liście transferowej`); }
  if (fx.captain && ctx.p) { S.captain = ctx.p.id; out.push(`©️ Nowy kapitan: ${shortName(ctx.p)}`); }
  if (fx.promise && ctx.p) { S.promises.push({ pid: ctx.p.id, until: S.day + 8, kind: 'time' }); out.push(`🤝 Obietnica: więcej minut dla ${shortName(ctx.p)}`); }
  if (fx.boast) { S.boast = true; out.push('🎤 Media zapamiętają tę zapowiedź'); }
  return out;
}

/* ---------- wydarzenia losowe ---------- */
// ctx: funkcja przygotowująca kontekst (np. wylosowany zawodnik); null = wydarzenie nie może wystąpić
const EVENTS = [
  { id: 'fanprotest', cat: 'Kibice', w: 4, ctx: () => lastRes(3).length === 3 && lastRes(3).every(r => r === 'L') ? {} : null,
    title: 'Protest kibiców', text: () => `Po serii porażek kibice ${userClub().name} protestują pod stadionem. Transparent: „Obudźcie się!”.`,
    choices: [{ t: 'Wyjdź do kibiców i porozmawiaj', fx: { fans: 9, press: 3, board: -1 }, r: 'Kibice docenili, że stanąłeś z nimi twarzą w twarz.' },
      { t: 'Zignoruj protest', fx: { fans: -8, press: -3 }, r: 'Media piszą o „trenerze w wieży z kości słoniowej”.' },
      { t: 'Publicznie obwiń zawodników', fx: { fans: 4, team: -7, press: 2 }, r: 'Kibice przyklaskują, ale w szatni zawrzało.' }] },
  { id: 'nightclub', cat: 'Szatnia', w: 3, ctx: () => { const p = randPlayer(p => p.age < 30); return p ? { p } : null; },
    title: 'Nocna eskapada', text: c => `Tabloidy publikują zdjęcia ${c.p.n} z klubu nocnego – dwa dni przed meczem.`,
    choices: [{ t: 'Nałóż karę finansową', fx: { player: -10, press: 4, board: 2, team: 1 }, r: 'Zawodnik przeprasza, szatnia widzi, że zasady obowiązują wszystkich.' },
      { t: 'Odsuń go od meczu', fx: { player: -18, fans: 3, press: 5, form: -5 }, r: 'Twarda decyzja. Zawodnik jest wściekły.' },
      { t: 'Bagatelizuj sprawę', fx: { player: 5, press: -7, board: -4 }, r: 'Prasa zarzuca Ci brak dyscypliny w zespole.' }] },
  { id: 'charity', cat: 'Kibice', w: 2, ctx: () => ({}), title: 'Akcja charytatywna', text: () => 'Miejski szpital dziecięcy zaprasza drużynę na wizytę i akcję charytatywną.',
    choices: [{ t: 'Cała drużyna jedzie', fx: { fans: 7, press: 6, team: 3, teamFit: -3 }, r: 'Piękne obrazki obiegły media.' },
      { t: 'Wyślij kapitana i trenera', fx: { fans: 3, press: 3 }, r: 'Skromnie, ale z klasą.' },
      { t: 'Odmów – liczy się tylko trening', fx: { fans: -5, press: -6, teamFit: 2 }, r: 'Media nie zostawiają na Tobie suchej nitki.' }] },
  { id: 'ticketprice', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Ceny biletów', text: () => 'Prezes chce podnieść ceny biletów o 15%, by poprawić finanse klubu.',
    choices: [{ t: 'Popieram – klub potrzebuje pieniędzy', fx: { price: 0.15, fans: -9, board: 4 }, r: 'Wpływy wzrosną, ale kibice są oburzeni.' },
      { t: 'Zaproponuj podwyżkę tylko na trybunie VIP', fx: { price: 0.05, fans: -2, board: 2 }, r: 'Kompromis przyjęty.' },
      { t: 'Sprzeciw się – stadion musi być pełny', fx: { fans: 6, board: -4 }, r: 'Kibice Cię kochają, prezes – mniej.' }] },
  { id: 'sponsorkit', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Kontrowersyjny sponsor', text: () => 'Firma bukmacherska oferuje lukratywną umowę, ale chce ogromnego logo na koszulce i zmiany jej barw.',
    choices: [{ t: 'Podpisz umowę', fn: () => ({ money: Math.round(userClub().spons * 20), spons: 0.08, fans: -7, press: -2 }), r: 'Kasa się zgadza, tradycjonaliści protestują.' },
      { t: 'Negocjuj bez zmiany barw', fn: () => ({ money: Math.round(userClub().spons * 8), fans: 1 }), r: 'Mniejsze pieniądze, ale tradycja zachowana.' },
      { t: 'Odrzuć ofertę', fx: { fans: 5, board: -3 }, r: 'Kibice doceniają szacunek do historii klubu.' }] },
  { id: 'lockerfight', cat: 'Szatnia', w: 3, ctx: () => { const l = uPlayers().filter(p => p.st.apps > 2); if (l.length < 2) return null; const p = pick(l); const q = pick(l.filter(x => x !== p)); return q ? { p, q } : null; },
    title: 'Kłótnia w szatni', text: c => `${c.p.n} i ${c.q.n} pokłócili się na treningu. Doszło do przepychanek.`,
    choices: [{ t: `Stań po stronie ${lastName({ n: 'x y' })}`.replace('y', '') && 'Stań po stronie pierwszego', fn: c => ({ player: 6, player2: -14, team: -2 }), r: 'Jeden czuje się wygranym, drugi upokorzonym.' },
      { t: 'Zrób zebranie drużyny i ukarz obu', fx: { player: -5, player2: -5, team: 3, press: 2 }, r: 'Atmosfera oczyściła się, zasady są jasne.' },
      { t: 'Nie wtrącaj się', fx: { team: -5, player: -2, player2: -2 }, r: 'Konflikt się tli…' }] },
  { id: 'youthshine', cat: 'Akademia', w: 2, ctx: () => { const y = S.acad.youth.slice().sort((a, b) => b.ovr - a.ovr)[0]; return y ? { p: y } : null; },
    title: 'Junior błyszczy', text: c => `Trenerzy akademii zachwycają się ${c.p.n} (${c.p.age} l.). Kibice dopytują, kiedy zadebiutuje.`,
    choices: [{ t: 'Awansuj go do pierwszego zespołu', fn: c => { promoteYouth(c.p.id); return { fans: 6, press: 3 }; }, r: 'Wychowanek trenuje z pierwszą drużyną!' },
      { t: 'Daj mu jeszcze czas w akademii', fx: { player: -3 }, r: 'Rozsądnie – niech dojrzeje.' }] },
  { id: 'trainingknock', cat: 'Medycyna', w: 3, ctx: () => { const p = randPlayer(p => !p.inj && p.st.apps > 0); return p ? { p } : null; },
    title: 'Uraz na treningu', text: c => `${c.p.n} poczuł ból w udzie. Lekarz radzi tydzień odpoczynku, zawodnik chce grać.`,
    choices: [{ t: 'Posłuchaj lekarza – odpoczynek', fx: { inj: 7, player: -3 }, r: 'Bezpiecznie.' },
      { t: 'Niech gra na środkach przeciwbólowych', fn: c => rnd() < 0.35 ? { inj: ri(21, 45), press: -4 } : { player: 4 }, r: 'Ryzyko podjęte…' }] },
  { id: 'agentraise', cat: 'Kontrakty', w: 3, ctx: () => { const p = starPlayer(); return p && p.con >= 2 ? { p } : null; },
    title: 'Agent żąda podwyżki', text: c => `Agent ${c.p.n} żąda 30% podwyżki, sugerując zainteresowanie innych klubów.`,
    choices: [{ t: 'Daj podwyżkę', fn: c => { c.p.wage = Math.round(c.p.wage * 1.3); return { player: 12, team: -2 }; }, r: 'Gwiazda zadowolona, reszta szatni liczy pieniądze.' },
      { t: 'Zaproponuj 10%', fn: c => { c.p.wage = Math.round(c.p.wage * 1.1); return { player: 2 }; }, r: 'Agent niechętnie się zgadza.' },
      { t: 'Odmów', fx: { player: -14, board: 2 }, r: 'Zawodnik jest rozczarowany…' }] },
  { id: 'rivalprovoke', cat: 'Prasa', w: 2, ctx: () => ({}), title: 'Prowokacja rywala', text: () => 'Trener rywala z ligi publicznie wyśmiewa styl gry Twojej drużyny.',
    choices: [{ t: 'Odpowiedz ostro', fx: { fans: 6, press: 4, team: 3, board: -2 }, r: 'Wojna na słowa nakręca kibiców.' },
      { t: 'Odpowiedz z klasą', fx: { press: 5, board: 2 }, r: 'Media chwalą Twój spokój.' },
      { t: 'Milcz', fx: { fans: -2 }, r: 'Część kibiców uważa, że dałeś się upokorzyć.' }] },
  { id: 'chairmanassist', cat: 'Zarząd', w: 2, ctx: () => ({}), title: 'Asystent z polecenia', text: () => 'Prezes chce zatrudnić swojego znajomego jako Twojego asystenta.',
    choices: [{ t: 'Zgódź się', fx: { board: 7, team: -2 }, r: 'Prezes zadowolony, ale nowy asystent niewiele wnosi.' },
      { t: 'Odmów grzecznie', fx: { board: -5, mgr: 0.3 }, r: 'Zachowujesz niezależność.' }] },
  { id: 'fanyouth', cat: 'Kibice', w: 2, ctx: () => { const p = randPlayer(p => p.age <= 21 && p.st.apps < 3); return p ? { p } : null; },
    title: 'Kibice chcą wychowanka', text: c => `Kibice skandują nazwisko ${c.p.n} i domagają się dla niego szansy.`,
    choices: [{ t: 'Obiecaj mu minuty', fx: { fans: 6, player: 10, promise: true }, r: 'Musisz teraz dotrzymać słowa.' },
      { t: 'Wyjaśnij, że musi poczekać', fx: { fans: -3, player: -4 }, r: 'Rozczarowanie na trybunach.' }] },
  { id: 'socialpost', cat: 'Prasa', w: 2, ctx: () => { const p = randPlayer(p => p.mor < 50); return p ? { p } : null; },
    title: 'Burza w social mediach', text: c => `${c.p.n} opublikował wpis sugerujący, że nie czuje się doceniany w klubie.`,
    choices: [{ t: 'Porozmawiaj z nim w cztery oczy', fx: { player: 8, press: 1 }, r: 'Wyjaśniliście sobie sprawę.' },
      { t: 'Ukarz go publicznie', fx: { player: -12, press: 3, team: 2 }, r: 'Jasny sygnał dla wszystkich.' },
      { t: 'Wystaw go na listę transferową', fx: { player: -15, list: true, fans: -2 }, r: 'Mleko się rozlało.' }] },
  { id: 'foreigninterest', cat: 'Kariera', w: 1, ctx: () => S.mgr.ovr >= 50 ? {} : null, title: 'Zainteresowanie z zagranicy', text: () => 'Media donoszą, że interesuje się Tobą zagraniczny klub. Dziennikarze pytają o Twoją przyszłość.',
    choices: [{ t: '„Jestem tu szczęśliwy”', fx: { fans: 5, board: 4 }, r: 'Kibice i zarząd doceniają lojalność.' },
      { t: '„Nigdy nie mów nigdy”', fx: { board: -6, press: 4, mgr: 0.5 }, r: 'Twoje nazwisko krąży po rynku.' }] },
  { id: 'investor', cat: 'Zarząd', w: 1, ctx: () => ({}), title: 'Nowy inwestor', text: () => 'Inwestor chce kupić udziały w klubie i dorzucić pieniędzy na transfery – w zamian za wpływ na decyzje.',
    choices: [{ t: 'Rekomenduj przyjęcie oferty', fn: () => ({ tb: Math.round(Math.max(5e5, userClub().tb * 0.4) / 1e5) * 1e5, board: -3, fans: -2 }), r: 'Budżet rośnie, ale pojawia się dodatkowa presja.' },
      { t: 'Odradź', fx: { board: 2, fans: 3 }, r: 'Klub pozostaje w rękach dotychczasowych właścicieli.' }] },
  { id: 'stadiumrepair', cat: 'Zarząd', w: 1, ctx: () => ({}), title: 'Awaria na stadionie', text: () => 'Zepsuło się oświetlenie jednej z trybun. Szybka naprawa jest droga.',
    choices: [{ t: 'Naprawić natychmiast', fn: () => ({ money: -Math.round(userClub().tv * 3), fans: 3 }), r: 'Problem rozwiązany.' },
      { t: 'Odłożyć naprawę', fx: { fans: -5, press: -3 }, r: 'Kibice narzekają na warunki.' }] },
  { id: 'family', cat: 'Szatnia', w: 2, ctx: () => { const p = randPlayer(); return p ? { p } : null; },
    title: 'Sprawy rodzinne', text: c => `${c.p.n} prosi o kilka dni wolnego – na świat przychodzi jego dziecko.`,
    choices: [{ t: 'Oczywiście, rodzina najważniejsza', fx: { player: 12, team: 2, form: -3 }, r: 'Zawodnik jest Ci wdzięczny.' },
      { t: 'Tylko jeden dzień', fx: { player: -6 }, r: 'Zawodnik jest rozczarowany.' }] },
  { id: 'opentraining', cat: 'Kibice', w: 2, ctx: () => ({}), title: 'Otwarty trening', text: () => 'Stowarzyszenie kibiców prosi o otwarty trening dla rodzin z dziećmi.',
    choices: [{ t: 'Zgoda – z autografami', fx: { fans: 6, teamFit: -2, team: 2 }, r: 'Tysiące uśmiechniętych dzieci.' },
      { t: 'Odmów – trening to praca', fx: { fans: -4 }, r: 'Kibice są zawiedzeni.' }] },
  { id: 'legend', cat: 'Klub', w: 1, ctx: () => ({}), title: 'Wizyta legendy', text: () => `Legenda ${userClub().name} chce porozmawiać z drużyną przed ważnym meczem.`,
    choices: [{ t: 'Zaproś do szatni', fx: { team: 5, fans: 3 }, r: 'Zawodnicy słuchali z wypiekami na twarzy.' },
      { t: 'Odmów – nie chcę rozpraszać zespołu', fx: { fans: -3 }, r: 'Legenda poczuła się urażona.' }] },
  { id: 'crisisform', cat: 'Szatnia', w: 3, ctx: () => { const p = randPlayer(p => p.form < 35 && p.st.apps > 3); return p ? { p } : null; },
    title: 'Kryzys formy', text: c => `${c.p.n} jest w dołku – ostatnie występy to jego najsłabsze mecze w karierze.`,
    choices: [{ t: 'Daj mu odpocząć od gry', fx: { form: 6, player: -4 }, r: 'Chwila oddechu może pomóc.' },
      { t: 'Okaż wsparcie i zaufanie', fn: c => pers(c.p) === 'Temperamentny' || pers(c.p) === 'Ambitny' ? { player: 10, form: 5 } : { player: 6, form: 2 }, r: 'Zawodnik czuje, że w niego wierzysz.' },
      { t: 'Dodatkowe treningi indywidualne', fx: { form: 8, fit: -10 }, r: 'Ciężka praca – oby się opłaciła.' }] },
  { id: 'anniversary', cat: 'Klub', w: 1, ctx: () => ({}), title: 'Jubileusz klubu', text: () => `${userClub().name} obchodzi okrągły jubileusz. Dział marketingu proponuje specjalny strój.`,
    choices: [{ t: 'Wypuść limitowaną koszulkę', fn: () => ({ money: Math.round(userClub().spons * 6 * (S.fans / 60)), fans: 4 }), r: 'Koszulki zniknęły w kilka godzin!' },
      { t: 'Zorganizuj mecz legend', fn: () => ({ fans: 8, press: 3, money: -Math.round(userClub().tv) }), r: 'Wspaniałe święto.' }] },
  { id: 'boardpressure', cat: 'Zarząd', w: 3, ctx: () => S.board.conf < 40 ? {} : null, title: 'Zarząd naciska', text: () => 'Prezes wzywa Cię na rozmowę – wyniki są poniżej oczekiwań.',
    choices: [{ t: 'Przedstaw plan naprawczy', fx: { board: 6, press: 2 }, r: 'Zarząd daje Ci jeszcze trochę czasu.' },
      { t: 'Poproś o wzmocnienia', fn: () => rnd() < 0.5 ? { tb: Math.round(userClub().tv * 4), board: -2 } : { board: -5 }, r: 'Rozmowa była napięta.' },
      { t: 'Weź winę na siebie', fx: { board: 3, team: 4, mgr: -0.3 }, r: 'Szatnia docenia, że ich osłaniasz.' }] },
  { id: 'wonderkid', cat: 'Skauting', w: 2, ctx: () => { const p = PALL.filter(p => p.tid >= 0 && p.tid !== S.user && p.age <= 19 && p.pot >= 80); return p.length ? { p: pick(p) } : null; },
    title: 'Cynk o talencie', text: c => `Znajomy agent podsuwa Ci nazwisko: ${c.p.n} (${c.p.age} l., ${clubName(c.p)}). Podobno ogromny potencjał.`,
    choices: [{ t: 'Dodaj do obserwowanych i wyślij skauta', fn: c => { S.short = [c.p.id, ...S.short.filter(x => x !== c.p.id)]; S.know[c.p.id] = Math.max(S.know[c.p.id] || 0, 75); return {}; }, r: 'Zawodnik trafił na Twoją listę (wiedza 75%).' },
      { t: 'Zignoruj', fx: {}, r: 'Może kiedyś…' }] },
  { id: 'winstreak', cat: 'Prasa', w: 3, ctx: () => lastRes(4).length === 4 && lastRes(4).every(r => r === 'W') ? {} : null, title: 'Media zachwycone', text: () => 'Po serii zwycięstw dziennikarze nazywają Cię „objawieniem sezonu”.',
    choices: [{ t: 'Podziękuj drużynie', fx: { team: 5, press: 3 }, r: 'Zawodnicy czują się docenieni.' },
      { t: '„To dopiero początek”', fx: { fans: 6, press: 2, boast: true }, r: 'Oczekiwania rosną…' },
      { t: 'Studź emocje', fx: { board: 3, press: 1 }, r: 'Rozsądnie i spokojnie.' }] },
  { id: 'captainask', cat: 'Szatnia', w: 2, ctx: () => S.captain == null && uPlayers().length > 11 ? { p: uPlayers().slice().sort((a, b) => (b.age + b.ovr / 2) - (a.age + a.ovr / 2))[0] } : null,
    title: 'Wybór kapitana', text: c => `Drużyna nie ma kapitana. Starszyzna szatni sugeruje ${c.p.n}.`,
    choices: [{ t: `Mianuj go kapitanem`, fx: { captain: true, player: 10, team: 3 }, r: 'Opaska ma właściciela.' },
      { t: 'Wybiorę sam później (karta zawodnika)', fx: {}, r: 'Decyzja odłożona.' }] },
];

/* spotkania z zawodnikami (sami proszą o rozmowę) */
function meetingEvent(p) {
  const status = playerStatus(p);
  const unhappyTime = p.pt < 0.35 && (status === 'Kluczowy' || status === 'Podstawowy' || pers(p) === 'Ambitny');
  return {
    id: 'meeting', cat: 'Rozmowa', title: `${p.n} prosi o rozmowę`, ctx: { p },
    text: unhappyTime ? `${p.n} (${pers(p)}) jest niezadowolony z liczby minut: „Trenerze, czuję, że zasługuję na więcej”.` : `${p.n} (${pers(p)}) nie czuje się w klubie najlepiej i chce porozmawiać o swojej przyszłości.`,
    choices: [
      { t: 'Obiecaj regularną grę', fx: { player: 14, promise: true }, r: 'Zawodnik wierzy Ci na słowo. Masz ok. 2 miesiące, by dotrzymać obietnicy.' },
      { t: 'Zaproponuj nowy kontrakt', fn: c => { if (c.p.con >= 4) return { player: 3 }; const r = renewContract(c.p.id, 3); return r.ok ? { player: 8 } : { player: -5 }; }, r: 'Rozmowa o pieniądzach…' },
      { t: 'Powiedz, że musi walczyć o miejsce', fn: c => pers(c.p) === 'Profesjonalista' || pers(c.p) === 'Wyluzowany' ? { player: 4, form: 4 } : { player: -10 }, r: 'Twarda postawa.' },
      { t: 'Zgódź się na transfer', fx: { player: 6, list: true, team: -2 }, r: 'Zawodnik trafia na listę transferową.' },
    ],
  };
}
function contractEvent(p) {
  return {
    id: 'contract', cat: 'Kontrakty', title: 'Kontrakt kończy się', ctx: { p },
    text: `${p.n} ma umowę ważną do końca sezonu. Jego agent pyta o przedłużenie (żądanie: ${money(renewDemand(p, 3))}/tydz.).`,
    choices: [
      { t: 'Przedłuż na 3 lata', fn: c => { const r = renewContract(c.p.id, 3); return r.ok ? { player: 8 } : { player: -8, press: -2 }; }, r: 'Negocjacje zakończone.' },
      { t: 'Przedłuż na 1 rok', fn: c => { const r = renewContract(c.p.id, 1); return r.ok ? { player: 3 } : { player: -6 }; }, r: 'Krótka umowa.' },
      { t: 'Nie przedłużaj', fx: { player: -12 }, r: 'Zawodnik odejdzie po sezonie.' },
    ],
  };
}

function pushEvent(e, ctx) {
  const ev = { uid: S.nextId++, id: e.id, cat: e.cat, title: e.title, text: typeof e.text === 'function' ? e.text(ctx) : e.text, choices: e.choices.map(c => c.t), ctx: ctxRef(ctx) };
  S.pending.push(ev); S.evLast[e.id] = S.day;
  msg(`📌 ${e.title}`, ev.text + ' (wymaga decyzji – Pulpit)');
}
const ctxRef = c => ({ p: c.p ? c.p.id : null, q: c.q ? c.q.id : null });
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
  if ((ev.ctx.p != null && !ctx.p) || (ctx.p && ctx.p.tid !== S.user && ctx.p.tid !== -3)) return { r: 'Sprawa nieaktualna.', fx: [] };
  const def = eventDef(ev), ch = def.choices[ci];
  const fx = ch.fn ? ch.fn(ctx) : ch.fx;
  const out = applyFx(fx || {}, ctx);
  saveSoon();
  return { r: ch.r, fx: out };
}
function eventsWeek(d) {
  metaInit();
  const ut = userClub();
  // kapitan wpływa na szatnię
  const cap = S.captain != null ? pget(S.captain) : null;
  if (cap && cap.tid !== S.user) S.captain = null;
  else if (cap) for (const p of ut.players) p.mor = clamp(p.mor + (cap.mor - p.mor) * 0.04, 0, 100);
  // kibice/prasa → zarząd, merchandising
  S.board.conf = clamp(S.board.conf + (S.fans - 55) / 220 + (S.press - 55) / 330, 0, 100);
  const merch = Math.round(ut.spons * 0.12 * (S.fans / 60)); ut.bal += merch; ut.fin.inc += merch;
  S.press = clamp(S.press + (55 - S.press) * 0.03, 0, 100);
  // obietnice
  for (const pr of S.promises.slice()) {
    const p = pget(pr.pid);
    if (!p || p.tid !== S.user) { S.promises = S.promises.filter(x => x !== pr); continue; }
    if (S.day >= pr.until) {
      S.promises = S.promises.filter(x => x !== pr);
      if (p.pt >= 0.45) { p.mor = clamp(p.mor + 8, 0, 100); msg('Obietnica dotrzymana', `${p.n} docenia, że dotrzymałeś słowa.`); }
      else { p.mor = clamp(p.mor - 25, 0, 100); for (const q of ut.players) q.mor = clamp(q.mor - 3, 0, 100); S.press = clamp(S.press - 3, 0, 100); msg('Złamana obietnica', `${p.n} czuje się oszukany – obiecałeś mu grę. Szatnia patrzy na Ciebie podejrzliwie.`); }
    }
  }
  if (S.pending.length >= 3) return;
  // zawodnicy proszą o rozmowę
  const unhappy = ut.players.filter(p => p.mor < 33 && !S.pending.some(e => e.ctx.p === p.id) && !S.promises.some(x => x.pid === p.id) && (p._meet || -99) < S.day - 20);
  if (unhappy.length && rnd() < 0.6) { const p = pick(unhappy); p._meet = S.day; pushEvent(meetingEvent(p), { p }); return; }
  if (d.ls >= 18 && d.ls <= 34) {
    const exp = ut.players.filter(p => p.con <= 1 && !p.loan && p.ovr >= teamLevel(ut) - 2 && (p._cev || 0) !== S.season);
    if (exp.length && rnd() < 0.3) { const p = pick(exp); p._cev = S.season; pushEvent(contractEvent(p), { p }); return; }
  }
  // losowe wydarzenie
  if (rnd() < 0.38) {
    const opts = EVENTS.map(e => ({ e, c: (S.evLast[e.id] || -999) < S.day - 30 ? e.ctx() : null })).filter(x => x.c);
    if (opts.length) { const x = wpick(opts, o => o.e.w); pushEvent(x.e, x.c); }
  }
}

/* ---------- mecz: kibice, prasa, serie, nagłówki ---------- */
const HEAD_W = ['{c} rozbija rywala!', 'Pewne zwycięstwo {c}', '{c} górą w meczu z {o}', 'Trzy punkty dla {c}!'];
const HEAD_L = ['Bolesna porażka {c}', '{c} bez szans z {o}', 'Kryzys w {c}?', 'Kibice {c} kręcą głowami'];
const HEAD_D = ['Podział punktów w meczu {c} – {o}', '{c} tylko remisuje', 'Remis, który nikogo nie zadowala'];
function afterMatchMeta(m, x, mine, opp, gd) {
  metaInit();
  const r = gd > 0 ? 'W' : gd < 0 ? 'L' : 'D';
  S.results.push(r); if (S.results.length > 40) S.results.shift();
  const st = S.stats; st.games++; if (r === 'W') st.wins++;
  st.unbeaten = r === 'L' ? 0 : st.unbeaten + 1; st.bestUnbeaten = Math.max(st.bestUnbeaten, st.unbeaten);
  const big = Math.abs(gd) >= 3, upset = opp.t.rep - mine.t.rep >= 8;
  S.fans = clamp(S.fans + (r === 'W' ? 2 + (big ? 2 : 0) + (upset ? 3 : 0) : r === 'L' ? -3 - (big ? 3 : 0) : 0), 0, 100);
  S.press = clamp(S.press + (r === 'W' ? 1 : r === 'L' ? -1.5 : 0), 0, 100);
  if (S.boast) { S.boast = false; if (r === 'L') { S.fans = clamp(S.fans - 6, 0, 100); S.press = clamp(S.press - 6, 0, 100); msg('Prasa', 'Media przypominają Twoje butne zapowiedzi… Wizerunkowa wpadka.'); } else if (r === 'W') { S.fans = clamp(S.fans + 3, 0, 100); mgrGain(0.2); } }
  const pool = r === 'W' ? HEAD_W : r === 'L' ? HEAD_L : HEAD_D;
  news('📰 ' + pick(pool).replace(/\{c\}/g, mine.t.name).replace(/\{o\}/g, opp.t.name) + ` (${mine.goals}:${opp.goals})`);
  checkAchievements();
}

/* ---------- konferencja prasowa ---------- */
function pressConference(x) {
  metaInit();
  const mine = x.user === 'h' ? x.h : x.a, opp = x.user === 'h' ? x.a : x.h;
  const big = x.opts.comp !== 'L' && x.opts.comp !== 'F' || (opp.rep || 50) >= (mine.rep || 50) + 6;
  if (!big && rnd() > 0.3) return null;
  const fav = (mine.rep || 50) >= (opp.rep || 50) + 4, star = mine.players ? mine.players.slice().sort((a, b) => b.ovr - a.ovr)[0] : null;
  const qs = [
    { q: `Kto jest faworytem meczu z ${opp.name}?`, a: [
      ['„Szanujemy rywala, ale gramy o zwycięstwo.”', { team: 2, press: 2 }],
      [fav ? '„My. I udowodnimy to na boisku.”' : '„Oni – nie mamy nic do stracenia.”', fav ? { team: 3, fans: 3, boast: true } : { team: 4, press: 1 }],
      ['„Wygramy ten mecz, gwarantuję.”', { fans: 5, press: 4, team: 2, boast: true }]] },
    { q: lastRes(3).filter(r => r === 'L').length >= 2 ? 'Ostatnie wyniki są słabe. Czy czuje się Pan zagrożony?' : 'Jak ocenia Pan nastroje w zespole?', a: [
      ['„Wierzę w ten zespół w 100%.”', { team: 4, press: 1 }],
      ['„Wszyscy musimy dać z siebie więcej.”', { team: -2, fans: 2, press: 2 }],
      ['„Nie będę komentował plotek.”', { press: -4 }]] },
  ];
  if (star && star.ovr) qs.push({ q: `Czy ${star.n} jest kluczem do sukcesu?`, star: star.id, a: [
    ['„To nasz lider, ale wygrywa drużyna.”', { team: 2, player: 2 }],
    ['„Bez niego bylibyśmy innym zespołem.”', { player: 8, team: -3 }],
    ['„Oczekuję od niego więcej.”', { player: pers(star) === 'Profesjonalista' ? 4 : -8, form: 3 }]] });
  const q = pick(qs);
  return { q: q.q, star: q.star || null, a: q.a };
}
function answerPress(pc, i) { const ctx = pc.star ? { p: pget(pc.star) } : {}; const out = applyFx(pc.a[i][1], ctx); saveSoon(); return out; }

/* ---------- odprawa przed meczem i w przerwie ---------- */
const TALKS = { calm: '😌 Spokojnie, bez presji', motivate: '🔥 Zmotywuj zespół', pressure: '😤 Wywrzyj presję' };
function teamTalk(side, kind, oppRep, ht, score) {
  const fav = (side.t.rep || 50) >= oppRep + 4, dog = (side.t.rep || 50) <= oppRep - 4;
  let d;
  if (!ht) d = kind === 'calm' ? (dog ? 4 : fav ? -2 : 2) : kind === 'motivate' ? 2 + (rnd() < 0.3 ? 2 : 0) : (fav ? 4 : dog ? -4 : 0);
  else d = kind === 'calm' ? (score > 0 ? 3 : score < 0 ? -2 : 1) : kind === 'motivate' ? (score < 0 ? 4 : 1) : (score < 0 ? (rnd() < 0.6 ? 5 : -5) : score > 0 ? -3 : 2);
  for (const s of side.pitch) { const p = s.p, adj = pers(p) === 'Temperamentny' ? 1.5 : pers(p) === 'Wyluzowany' ? 0.5 : 1; p.mor = clamp(p.mor + d * adj, 0, 100); p.form = clamp(p.form + d * 0.6, 0, 100); }
  return d;
}

/* ---------- rozmowy indywidualne ---------- */
function playerChat(p, topic) {
  metaInit();
  if (p._chat === S.day) return { t: 'Rozmawialiście już dziś.', fx: [] };
  p._chat = S.day;
  const ps = pers(p), st = playerStatus(p), exp = st === 'Kluczowy' ? 0.8 : st === 'Podstawowy' ? 0.6 : st === 'Rotacyjny' ? 0.3 : 0.1;
  let t, fx = {};
  if (topic === 'time') {
    if (p.pt >= exp - 0.05) { t = '„Gram tyle, ile powinienem. Jestem zadowolony, trenerze.”'; fx = { player: 2 }; }
    else if (ps === 'Wyluzowany' || ps === 'Lojalny') { t = '„Rozumiem decyzje trenera, ale chciałbym grać więcej.”'; fx = { player: 1 }; }
    else { t = '„Chcę grać! Jeśli nic się nie zmieni, będę myślał o odejściu.”'; fx = { player: -3 }; }
  } else if (topic === 'praise') {
    if (p.form >= 55) { t = '„Dziękuję! To dodaje mi skrzydeł.”'; fx = { player: ps === 'Temperamentny' ? 9 : 6, form: 2 }; }
    else { t = '„Hm… nie wiem, czy zasłużyłem na pochwałę.”'; fx = { player: ps === 'Profesjonalista' ? -2 : 2 }; }
  } else if (topic === 'crit') {
    if (ps === 'Profesjonalista') { t = '„Ma Pan rację. Wezmę się do roboty.”'; fx = { player: 1, form: 7 }; }
    else if (ps === 'Temperamentny') { t = '„To nie fair! Inni grają gorzej!”'; fx = { player: -12, form: 2 }; }
    else if (p.form < 45) { t = '„Wiem, że muszę grać lepiej.”'; fx = { player: -3, form: 5 }; }
    else { t = '„Nie rozumiem tej krytyki, trenerze.”'; fx = { player: -7 }; }
  } else if (topic === 'future') {
    const ut = userClub(), bigger = p.ovr > teamLevel(ut) + 5;
    if (ps === 'Ambitny' && bigger) { t = '„Marzę o grze w Lidze Mistrzów. Jeśli tu się nie uda, będę szukał nowego wyzwania.”'; fx = { player: -2 }; }
    else if (ps === 'Lojalny') { t = '„Kocham ten klub. Chcę tu zostać jak najdłużej.”'; fx = { player: 4 }; }
    else { t = `„Skupiam się na kolejnych meczach. Kontrakt mam jeszcze na ${p.con} ${p.con === 1 ? 'rok' : 'lata'}.”`; fx = { player: 2 }; }
  } else if (topic === 'promise') {
    if (S.promises.some(x => x.pid === p.id)) { t = '„Pamiętam o obietnicy, trenerze.”'; fx = {}; }
    else { t = '„Trzymam za słowo!”'; fx = { player: 10, promise: true }; }
  } else if (topic === 'captain') {
    t = ps === 'Wyluzowany' ? '„Opaska? Hm, dobrze, postaram się.”' : '„To dla mnie zaszczyt. Nie zawiodę!”';
    fx = { captain: true, player: 10, team: ps === 'Profesjonalista' || ps === 'Lojalny' ? 3 : 0 };
  }
  const out = applyFx(fx, { p }); saveSoon();
  return { t, fx: out };
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
  ['ecl', '🟢 Liga Konferencji', 'Wygraj Ligę Konferencji.', () => S.trophies.some(t => t.kind === 'ECL')],
  ['el', '🟠 Liga Europy', 'Wygraj Ligę Europy.', () => S.trophies.some(t => t.kind === 'EL')],
  ['cl', '⭐ Liga Mistrzów', 'Wygraj Ligę Mistrzów.', () => S.trophies.some(t => t.kind === 'CL')],
  ['nt', '🌍 Złoto z reprezentacją', 'Wygraj turniej z reprezentacją.', () => S.trophies.some(t => t.kind === 'NT')],
  ['zero2hero', '🚀 Od zera do bohatera', 'Wygraj najwyższą ligę klubem, który objąłeś w 3. lub 4. lidze.', () => S.trophies.some(t => t.kind === 'league' && t.tier === 1 && S.startTier >= 3 && t.club === S.startClub)],
  ['mgr60', '📈 Trener krajowy', 'Osiągnij OVR trenera 60.', () => S.mgr.ovr >= 60],
  ['mgr75', '🌟 Trener europejski', 'Osiągnij OVR trenera 75.', () => S.mgr.ovr >= 75],
  ['mgr90', '🧠 Geniusz taktyki', 'Osiągnij OVR trenera 90.', () => S.mgr.ovr >= 90],
  ['academy', '🎓 Wychowanek', 'Awansuj juniora z akademii, który rozegra 20 meczów.', () => userClub().players.some(p => p.homegrown && p.car.apps >= 20)],
  ['fans90', '❤️ Ulubieniec trybun', 'Zdobądź 90% poparcia kibiców.', () => S.fans >= 90],
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
  if (f && f[0].id === ut.id && o.wasLg === ut.lg) S.trophies.push({ kind: 'league', name: S.leagues[o.wasLg].name, season: s, club: ut.id, tier: o.wasTier });
  if (o.myCup && o.myCup.champion === ut.id) S.trophies.push({ kind: 'cup', name: o.myCup.name, season: s, club: ut.id });
  if (o.myEuro && o.myEuro.champion === ut.id) S.trophies.push({ kind: o.myEuro.id, name: o.myEuro.name, season: s, club: ut.id });
  if (S.nt && S.ntc.tourn && S.ntc.tourn.champion === S.nt) S.trophies.push({ kind: 'NT', name: S.ntc.tourn.name, season: s, club: null });
  const tier = S.leagues[ut.lg] ? S.leagues[ut.lg].tier : o.wasTier;
  if (ut.lg !== o.wasLg && tier < o.wasTier) S.trophies.push({ kind: 'promo', name: `Awans do ${S.leagues[ut.lg].name}`, season: s, club: ut.id });
  if (o.myCup && o.myCup.champion === ut.id) { S.fans = clamp(S.fans + 10, 0, 100); S.board.conf = clamp(S.board.conf + 6, 0, 100); mgrGain(2); }
  S.fans = clamp(S.fans * 0.85 + 60 * 0.15, 0, 100);
  checkAchievements();
}
const TROPHY_ICON = { league: '🏆', cup: '🏅', CL: '⭐', EL: '🟠', ECL: '🟢', NT: '🌍', promo: '⬆️' };
