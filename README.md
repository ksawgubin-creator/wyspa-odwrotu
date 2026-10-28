# ⚽ Kariera Menedżera

Mobilna gra menedżerska w stylu trybu kariery (EA FC) / Football Manager Mobile. Działa jako aplikacja na Androida (APK, np. Samsung Galaxy S25) i jako aplikacja webowa (PWA) – bez internetu, z zapisem na urządzeniu.

## Instalacja na telefonie (Samsung Galaxy S25)
1. Na telefonie otwórz w przeglądarce stronę repozytorium → **Releases** → najnowsze wydanie „Kariera Menedżera 2.0.x”.
2. Pobierz plik **KarieraMenedzera.apk** i otwórz go.
3. Zezwól przeglądarce na instalowanie aplikacji z nieznanych źródeł (Android zapyta o to sam), zainstaluj.
4. Kolejne wersje instalują się „na” poprzednią – zapis gry zostaje. Dodatkowo w grze: Klub → Gra → Eksportuj (kopia zapasowa pliku).

APK buduje się automatycznie przez GitHub Actions (`.github/workflows/android.yml`) przy każdym pushu; plik jest też w artefaktach przebiegu.

## Co jest w grze
- **Prawdziwe kluby i składy**: 21 krajów; top 5 lig ma po 4 poziomy rozgrywkowe (np. Premier League, Championship, League One, League Two), pozostałe kraje z top 15 rankingu UEFA – po 2 poziomy (np. Chance Liga i Chance Národní liga). Zawodnicy z prawdziwymi nazwiskami, wiekiem, pozycją, oceną i potencjałem w stylu EA FC (w niższych ligach braki w kadrach uzupełniane są generowanymi zawodnikami). Awanse i spadki między wszystkimi poziomami.
- **Trener z OVR**: zaczynasz jako debiutant (OVR 45) lub z licencją UEFA Pro (OVR 55) – na start dostępne są tylko kluby niższych lig. OVR rośnie za wyniki, cele, awanse i trofea; im wyższy, tym większe kluby składają oferty. Każdy klub AI ma własnego trenera z OVR (wpływa na grę), kluby zwalniają trenerów, a Ty dostajesz oferty pracy. Jest też tryb swobodny bez ograniczeń.
- **Akademia**: infrastruktura, trenerzy młodzieży i rekrutacja (po 5 poziomów), region rekrutacji, coroczny nabór w marcu z szansą na „talent pokolenia”, szacowany potencjał juniorów, awans do pierwszego zespołu.
- **Puchary UEFA w nowym formacie**: Liga Mistrzów, Liga Europy i Liga Konferencji – faza ligowa 36 drużyn z koszykami, baraże, 1/8, ćwierćfinały, półfinały (dwumecze z dogrywką i karnymi) i finał.
- **Współczynniki UEFA**: ranking krajów z 5 sezonów (realne wartości startowe), punkty za mecze i etapy, liczba miejsc w pucharach zależna od rankingu (z dodatkowymi miejscami EPS), ranking klubów.
- **Zawodnicy jak w EA FC**: ogólna ocena liczona z atrybutów (TEM, STR, POD, DRY, OBR, FIZ / atrybuty bramkarskie), 12 pozycji z pozycjami alternatywnymi, potencjał, słabsza noga, triki, karta zawodnika w stylu FUT.
- **Stan zawodnika**: kondycja, morale (zależne od wyników, minut i statusu w kadrze), forma, rytm meczowy, kontuzje, kartki i zawieszenia, rozmowy z zawodnikami.
- **Skauting**: zakresy ocen dla nieznanych zawodników, skauci o różnej jakości, obserwacje, misje (kraj, narodowość, pozycja, wiek, potencjał), raporty A+–D, lista obserwowanych.
- **Transfery**: negocjacje kwoty (kontroferty, zawodnicy „nie na sprzedaż”), warunki kontraktu, wypożyczenia, wolni agenci, oferty za Twoich zawodników, transfery między klubami AI, okna transferowe.
- **Reprezentacja**: równolegle z klubem (dostępność zależna od OVR trenera) – powołania, skład, eliminacje/Liga Narodów, Mistrzostwa Europy i Świata.
- **Klub**: finanse, obiekty, trening, zarząd z celami ligowymi i europejskimi, Złota Piłka, historia.

Skład lig odpowiada sezonowi 2026/27 (awanse i spadki po sezonie 2025/26, w Norwegii i Szwecji – sezon 2026). Oceny zawodników to szacunki w stylu EA FC 26; najnowsze transfery mogą nie być uwzględnione.

## Uruchomienie w przeglądarce
`python3 -m http.server 8080` w katalogu repozytorium i otwórz `http://localhost:8080`.

## Struktura
- `data.js` – reprezentacje i pule nazwisk; `data/*.js` – kraje, ligi, kluby i prawdziwe składy (po pliku na kraj).
- `engine.js` – zawodnicy, pozycje i atrybuty, formacje, silnik meczu.
- `world.js` – świat gry: kalendarz, ligi, puchary UEFA, reprezentacje, transfery, skauting, finanse, koniec sezonu, zapis (IndexedDB).
- `ui.js`, `style.css`, `index.html` – interfejs.
- `manifest.webmanifest`, `sw.js`, `icons/` – PWA.
- `capacitor.config.json`, `scripts/`, `android-res/` – budowanie aplikacji Android (Capacitor).
