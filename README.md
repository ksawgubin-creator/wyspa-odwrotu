# ⚽ Kariera Menedżera

Mobilna gra menedżerska w stylu trybu kariery (EA FC) / Football Manager Mobile. Działa jako aplikacja na Androida (APK, np. Samsung Galaxy S25) i jako aplikacja webowa (PWA) – bez internetu, z zapisem na urządzeniu.

## Instalacja na telefonie (Samsung Galaxy S25)
1. Na telefonie otwórz w przeglądarce stronę repozytorium → **Releases** → najnowsze wydanie „Kariera Menedżera 2.0.x”.
2. Pobierz plik **KarieraMenedzera.apk** i otwórz go.
3. Zezwól przeglądarce na instalowanie aplikacji z nieznanych źródeł (Android zapyta o to sam), zainstaluj.
4. Kolejne wersje instalują się „na” poprzednią – zapis gry zostaje. Dodatkowo w grze: Klub → Gra → Eksportuj (kopia zapasowa pliku).

APK buduje się automatycznie przez GitHub Actions (`.github/workflows/android.yml`) przy każdym pushu; plik jest też w artefaktach przebiegu.

## Co jest w grze
- **27 lig z 21 krajów, 456 prawdziwych klubów**: Premier League i Championship, LaLiga i LaLiga 2, Serie A i B, Bundesliga i 2. Bundesliga, Ligue 1 i 2, Ekstraklasa i I liga, a także Portugalia, Holandia, Belgia, Turcja, Szkocja, Austria, Szwajcaria, Czechy, Grecja, Dania, Ukraina, Chorwacja, Serbia, Norwegia, Szwecja. Awanse i spadki tam, gdzie są dwa poziomy.
- **Puchary UEFA w nowym formacie**: Liga Mistrzów, Liga Europy i Liga Konferencji – faza ligowa 36 drużyn z koszykami, baraże, 1/8, ćwierćfinały, półfinały (dwumecze z dogrywką i karnymi) i finał.
- **Współczynniki UEFA**: ranking krajów z 5 sezonów (realne wartości startowe), punkty za mecze i etapy, liczba miejsc w pucharach zależna od rankingu (z dodatkowymi miejscami EPS), ranking klubów.
- **Zawodnicy jak w EA FC**: ogólna ocena liczona z atrybutów (TEM, STR, POD, DRY, OBR, FIZ / atrybuty bramkarskie), 12 pozycji z pozycjami alternatywnymi, potencjał, słabsza noga, triki, karta zawodnika w stylu FUT.
- **Stan zawodnika**: kondycja, morale (zależne od wyników, minut i statusu w kadrze), forma, rytm meczowy, kontuzje, kartki i zawieszenia, rozmowy z zawodnikami.
- **Skauting**: zakresy ocen dla nieznanych zawodników, skauci o różnej jakości, obserwacje konkretnych piłkarzy, misje (kraj, narodowość, pozycja, wiek, potencjał), raporty z oceną A+–D, lista obserwowanych.
- **Transfery**: negocjacje kwoty (kontroferty, zawodnicy „nie na sprzedaż”), warunki kontraktu, wypożyczenia w obie strony, wolni agenci, oferty za Twoich zawodników, transfery między klubami AI, okna transferowe.
- **Reprezentacja**: możesz równolegle prowadzić kadrę narodową – powołania, skład, eliminacje/Liga Narodów, Mistrzostwa Europy i Świata.
- **Klub**: finanse, obiekty (ośrodek treningowy, akademia), trening, zarząd z celami ligowymi i europejskimi, zwolnienia i nowe oferty pracy, Złota Piłka i historia.

Zawodnicy są generowani (z nazwiskami pasującymi do narodowości), więc składy nie odpowiadają rzeczywistym.

## Uruchomienie w przeglądarce
`python3 -m http.server 8080` w katalogu repozytorium i otwórz `http://localhost:8080`.

## Struktura
- `data.js` – kraje, ligi, kluby, reprezentacje, pule nazwisk, współczynniki startowe.
- `engine.js` – zawodnicy, pozycje i atrybuty, formacje, silnik meczu.
- `world.js` – świat gry: kalendarz, ligi, puchary UEFA, reprezentacje, transfery, skauting, finanse, koniec sezonu, zapis (IndexedDB).
- `ui.js`, `style.css`, `index.html` – interfejs.
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA.
- `capacitor.config.json`, `scripts/`, `android-res/` – budowanie aplikacji Android (Capacitor).
