# ⚽ Kariera Menedżera

Mobilna gra przeglądarkowa w stylu trybu menedżera / kariery (Football Manager Mobile, EA FC Career Mode).
Czysty HTML + CSS + JS, bez instalacji i zależności – otwórz `index.html` (najlepiej na telefonie lub w widoku mobilnym).

## Funkcje
- **Dwie ligi** (Ekstraliga i Liga Pierwsza, po 16 klubów, 30 kolejek) z awansami i spadkami, fikcyjne kluby i losowo generowani zawodnicy.
- **Mecze na żywo** minuta po minucie: komentarz, posiadanie, strzały, kartki, kontuzje, zmiany (5), zmiana mentalności, pauza w przerwie, regulowane tempo, opcja natychmiastowej symulacji.
- **Skład i taktyka**: 6 ustawień (4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2, 3-4-3), mentalność, forma, kondycja, zawieszenia, ocena po meczu.
- **Transfery**: wyszukiwarka z filtrami, oferty z negocjacją ceny, wolni agenci, okna letnie/zimowe, oferty za Twoich zawodników, lista transferowa, kontrakty (przedłużanie, rozwiązywanie).
- **Klub**: finanse (bilety, sponsorzy, TV, pensje), budżet transferowy, trening, zaufanie zarządu i cele sezonu, możliwość zwolnienia i objęcia innego klubu.
- **Długa kariera**: rozwój i starzenie zawodników, emerytury, akademia młodzieży, historia sezonów.
- **Automatyczny zapis** w przeglądarce (localStorage).

## Uruchomienie
Otwórz `index.html` w przeglądarce albo wystaw katalog przez dowolny serwer statyczny, np. `python3 -m http.server`.

## Struktura
- `engine.js` – silnik gry (liga, symulacja meczu, transfery, finanse, koniec sezonu), bez zależności od DOM.
- `ui.js` – interfejs.
- `style.css` – wygląd (ciemny motyw, układ mobilny).
