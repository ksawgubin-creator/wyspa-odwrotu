# Postęp prac

Stan: **v0.2** – wszystkie sześć etapów z opisu ma działającą implementację (patrz `CHANGELOG.md`). Poniżej: co zrobiono i jak sprawdzono.

| Obszar | Zrobione | Jak sprawdzone |
|---|---|---|
| Teren, woda, niebo | Chunki z LOD, wysokości i biomy z seedu, woda z pianą/falami, niebo (słońce/księżyc/gwiazdy/chmury), światło i cienie zależne od pory doby | Zrzuty ekranu (plaża, widok z lotu ptaka, zmierzch, noc, burza, mgła); `tests/pure.test.js` (determinizm, punkt startu, krater, jaskinia połączona) |
| Roślinność i zasoby | Instancing w komórkach 64 m, drzewa padają po ścięciu, odrastanie, ukryte rudy (pioruny), ukryte wraki | Zrzuty; testy: każdy obiekt stoi na terenie, brak obiektów na stromiznach/w wodzie |
| Postać | Szkielet proceduralny, chód/bieg/skradanie/skok, combo, unik, blok, parowanie, łuk, śmierć | Arkusze pozy (`dev/rig.html`), zrzuty w grze, symulacje (`__sim`) |
| Zwierzęta i AI | 8 gatunków + 2 bossy, maszyny stanów, zapowiedzi ataków, wataha okrąża, pantera skrada się, Cieniaki boją się światła | Symulacje: szarża dzika z unikiem, wataha wilków nocą; viewer `dev/creatures.html` |
| Crafting/przetrwanie | Receptury tierów 1–4, gotowanie, mikstury, głód/pragnienie/temperatura/strach, buffy, umiejętności | `tests/pure.test.js` (crafting zużywa surowce, koszty), zrzuty UI |
| Baza | 25 typów budowli, tryb budowania z podglądem, przyciąganie do murów, HP i etapy zniszczeń, naprawa, ogniska z opałem, pułapki, skrzynie, sen i respawn | Zrzuty; viewer `dev/buildings.html`; test stawiania w grze |
| Jaskinia, wulkan | Kompleks komór w rogu mapy (portal), ciemność, kryształy, lawa z obrażeniami | Zrzuty (wnętrze jaskini) |
| Wydarzenia, zakończenie | Pogoda, handlarz + kości, notatki, Krwawy Księżyc, tratwa/sygnał + boss | Kod + testy jednostkowe danych; scenariusze do sprawdzenia przez Karola |
| Zapis, dźwięk, menu | localStorage + eksport/import, dźwięki syntezowane, menu/ustawienia/klawisze | Ręcznie w przeglądarce headless |

## Jak uruchomić testy
- Node (czyste moduły): `node tests/run-node.mjs`
- Przeglądarka (pełna gra): otwórz `tests.html` przez `start.bat` (`http://localhost:8080/tests.html`).
