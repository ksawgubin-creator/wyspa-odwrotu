# Wyspa Odwrotu

Trójwymiarowa gra survivalowa (Three.js / WebGL2, czysty JS, bez bundlera). Rozbitek na proceduralnej wyspie: w dzień poluje i buduje, w nocy zwierzęta stają się agresywne, a pojawiają się nocne potwory. Cel: uciec tratwą lub sygnałem ogniowym.

## Uruchomienie
1. Skopiuj cały folder projektu na swój komputer.
2. Uruchom `start.bat` (wymaga Pythona; startuje `python -m http.server 8080` i otwiera przeglądarkę).
3. Testy: `http://localhost:8080/tests.html`. Kod wymaga serwera HTTP (nie działa z `file://`).

Three.js (MIT) leży lokalnie w `lib/`. Gra nie pobiera niczego z sieci, wszystkie modele i dźwięki są generowane w kodzie.

## Sterowanie (domyślne, do zmiany w Ustawieniach)
| Klawisz | Akcja |
|---|---|
| W A S D | ruch |
| Spacja | skok |
| Shift (tap) / Shift (przytrzymanie) | unik z klatkami nietykalności / sprint |
| Ctrl, X | skradanie |
| LPM | atak (kombo) / strzał z łuku |
| PPM | blok, tuż przed ciosem = parowanie |
| E | interakcja |
| 1–9 | pasek szybkiego dostępu |
| Tab / I | ekwipunek |
| C | crafting, dziennik, umiejętności |
| K | umiejętności |
| B | budowanie (R – obrót elementu) |
| M | mapa |
| F3 | debug (FPS, statystyki, cheaty) |
| Esc | pauza i menu |

## Mechaniki w skrócie
- **Statystyki:** zdrowie, głód, pragnienie, stamina, temperatura, strach.
- **Zwierzęta:** 8 gatunków z osobnym zachowaniem dzień/noc, ataki z zapowiedzią (telegraf).
- **Walka:** kombo, unik, blok i parowanie, łuk.
- **Crafting:** 4 poziomy narzędzi, gotowanie, mikstury.
- **Baza:** siatka budowy, podgląd, wytrzymałość, uszkodzenia, naprawy; poziomy Obóz → Osada → Twierdza.
- **Wydarzenia:** burza, wrak, mgła, handlarz (kości), notatki fabularne; Krwawy Księżyc co 7. noc.
- **Zakończenia:** tratwa albo ognisko sygnałowe (z bossem). Kara za śmierć i tryb hardcore.
- **Zapis:** automatyczny w localStorage oraz eksport/import do pliku.

## Struktura
`data/` – dane (przedmioty, receptury, zwierzęta, budynki); `src/` – silnik, świat, AI, UI; `tests/` – testy zachowań; `dev/` – podglądy modeli. Historia: `CHANGELOG.md`, `PROGRESS.md`, `NEXT_STEP.md`, plan: `PLAN.md`.

Wszystkie liczby balansu są wstępne i oznaczone `ROBOCZE`.
