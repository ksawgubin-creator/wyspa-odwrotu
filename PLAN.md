# Wyspa Odwrotu – plan architektury i etapów

Gra 3D w przeglądarce: **Three.js (WebGL2) + czysty JavaScript (ES modules)**, bez builda. Three.js leży lokalnie w `lib/` (MIT, pakiet npm `three` 0.186.1), więc gra działa offline. Cała grafika i dźwięk są generowane w kodzie.

## Architektura (katalogi)

| Katalog | Odpowiedzialność |
|---|---|
| `index.html`, `css/` | Szkielet strony, import map dla Three.js, style HUD/menu (całe UI po polsku). |
| `data/` | Dane do balansowania: `config.js` (stałe), `items.js`, `resources.js`, `weapons.js`, później `recipes.js`, `animals.js`, `buildings.js`. Wartości wymyślone oznaczone `// ROBOCZE`. |
| `src/engine/` | `input.js` (klawisze, zatrzaski, Shift tap/hold, pointer lock), `daytime.js` (zegar dnia i nocy), `noise.js`, `rng.js`, `util.js`. |
| `src/world/` | `worldgen.js` (mapa wysokości, biomy, jeziora; czysty JS), `placement.js` (rozmieszczenie zasobów), `terrain.js` (chunki + LOD), `water.js`, `sky.js` (niebo, światło, mgła), `vegetation.js` (instancing + stan zasobów), `grass.js`, `colliders.js` (siatka przestrzenna kolizji). |
| `src/gfx/` | `meshkit.js` (bryły low-poly z szumem), `models.js` (drzewa, skały, wraki…), `itemmodels.js`, `rig.js` (szkielet humanoida), `materials.js` (wiatr w shaderze), `fx.js` (cząsteczki). |
| `src/player/` | `player.js` (ruch, unik, combo, blok/parowanie), `anim.js` (animacje proceduralne), `camera.js` (kamera za plecami, sprężyna). |
| `src/entities/` | Zwierzęta i wrogowie, upuszczone przedmioty (`drops.js`). |
| `src/ai/`, `src/combat/` | Maszyny stanów AI; geometria walki (`melee.js`). |
| `src/crafting/`, `src/building/`, `src/inventory/` | Receptury, budowanie na siatce, model ekwipunku. |
| `src/ui/` | HUD, ekwipunek, menu, minimapa/mapa, panel debug (F3). |
| `src/audio/`, `src/save/` | Dźwięk syntezowany w Web Audio; zapis w localStorage + eksport/import pliku. |
| `tests.html`, `tests/` | Testy zachowań (przeglądarka i Node). |
| `dev/`, `tools/` | Narzędzia deweloperskie (podgląd szkieletu, render mapy do PNG). |

Zasady: logika pusta od THREE tam, gdzie się da (testy w Node); stały krok symulacji 60 Hz + interpolacja renderu (walka nie zależy od FPS); każdy obiekt stoi na wysokości terenu z mapy wysokości; kolizje kołowe/prostokątne w siatce przestrzennej.

## Etapy

1. **Etap 1** – wyspa (teren, woda, niebo, roślinność), postać z kamerą, ruchem, skokiem, animacjami; zbieranie surowców; ekwipunek. ✔ (v0.1)
2. **Etap 2** – cykl dnia i nocy ze światłem, zwierzęta i AI, walka (combo, unik, blok, parowanie, łuk). *Tu pierwszy pokaz.*
3. **Etap 3** – crafting (tiery 1–2), gotowanie, statystyki (głód, pragnienie, temperatura, strach), drzewko umiejętności.
4. **Etap 4** – budowanie i ulepszanie bazy, nocne ataki na bazę.
5. **Etap 5** – tiery 3–4, jaskinia i wulkan, wydarzenia (burza, mgła, wrak, handlarz z kośćmi, notatki), Krwawy Księżyc.
6. **Etap 6** – zakończenie (tratwa / ognisko sygnałowe), zapis, dźwięk, balans, menu.

## Propozycje dodatkowych mechanik (do zatwierdzenia przez Karola)

- **Tropy i legowiska** – za dnia tropy prowadzą do legowisk; nocą stamtąd wychodzą ataki; zniszczenie legowiska uspokaja okolicę.
- **Zemsta watahy** – zwierzę zranione i uciekłe zapamiętuje gracza i wraca nocą z watahą.
- **Przynęta** – mięso odciąga drapieżniki od bazy albo wabi w pułapkę.
- **Światło jako surowiec** – pochodnie się wypalają; olej z tłuszczu zasila latarnię.
- **Trofea** – kły i skóry wyjątkowych zwierząt wiszą w bazie i dają małe premie.
- **Grób** – po śmierci część ekwipunku zostaje w miejscu śmierci i można ją odzyskać.
- **Perfekcyjny unik** – unik w ostatniej chwili spowalnia czas na ułamek sekundy i oddaje staminę.
