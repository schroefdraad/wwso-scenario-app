# Rapport: Taak 10 — Kostencatalogus inlezen — 2026-08-19

## Wat er gedaan is

`resources/Kostenkentallen_WWSO_optimalisatie.xlsx` (tabs `Toelichting`, `Aannames`, `Maatregelen`) wordt nu herhaalbaar ingelezen naar een versiedataset in `packages/data`, net als de tarieventabellen uit taak 3.

### Herhaalbaar importscript
`packages/data/scripts/import-kostenkentallen.ts`, gedraaid met `pnpm --filter @wwso/data run import:kostenkentallen`. Leest de xlsx uit `resources/` (nooit aangepast — dat blijft het bronbestand van de gebruiker) en schrijft `packages/data/src/kostencatalogus/<versie>/kostencatalogus_<versie>.json`.

- **Versie komt uit de bron zelf**: tab `Toelichting` bevat de regel "Versie 0.1 — 19 augustus 2026 — ...". Het script leest die letterlijk in plaats van een versienummer te verzinnen.
- **Headerrij wordt gezocht, niet aangenomen**: beide tabs hebben titelregels vóór de echte header (`id`/`Parameter` in kolom A). Het script zoekt die rij op, zodat een extra toegevoegde titelregel het inlezen niet stilzwijgend laat verschuiven.
- **Harde validatie, geen stille aannames**: een onbekende rubriekcode, een onbekende status, een ontbrekende aanname of een dubbel `id` laat het script direct falen met een duidelijke boodschap — nooit een rij overslaan of een lege waarde invullen.
- **Percentages als fractie**: de xlsx toont "21,0%" maar de onderliggende celwaarde is `0,21` — zo ook opgeslagen (`btwTariefBouwRegulier: 0.21`), consistent met hoe de rest van de codebase geen percentage-als-honderdtal gebruikt.
- **Geen vooraf uitgerekende regio-prijs.** Kolom I ("Verwacht × regio") is in de xlsx een formule (`Kosten verwacht × regio-index`) en is bewust NIET overgenomen als vast getal — dat zou stil verouderen zodra de regio-index wijzigt. `kostenVerwachtEuro` en `aannames.regioIndex` staan los; de vermenigvuldiging is aan de aanroeper (taak 11).
- **Herhaalbaarheid geverifieerd**: het script twee keer achter elkaar gedraaid geeft byte-voor-byte dezelfde JSON.

### Datamodel (`packages/data/src/kostencatalogus/types.ts`)
- `MaatregelRubriek` — expliciete enum (R1 t/m R13 + `PROC`) in plaats van een vrije string, zodat een toekomstige typefout in de xlsx het importscript laat falen in plaats van een onopgemerkte nieuwe categorie te introduceren.
- `Maatregel` — één regel uit tab Maatregelen, inclusief `status` (`schatting`/`offerte`/`bevestigd`) die bepaalt of de app straks een bandbreedte of één bedrag toont.
- `KostencatalogusAannames` — de 7 kengetallen uit tab Aannames.
- `Kostencatalogus` — `{ versie, aannames, maatregelen }`, het geheel dat een opgeslagen deal straks als versiestempel gebruikt (harde regel 6).

### `packages/data/src/kostencatalogus/index.ts`
Zelfde patroon als `tarieven/index.ts`: `getKostencatalogus(versie)` (exacte match, geen fallback — een opgeslagen deal verwijst naar een specifieke versie, niet naar een datum zoals bij tarieven), `nieuwsteKostencatalogus()` en `alleKostencatalogi()`.

## Bestanden gewijzigd
- Nieuw: `packages/data/scripts/import-kostenkentallen.ts`
- Nieuw: `packages/data/src/kostencatalogus/{types,index,kostencatalogus.test}.ts`
- Nieuw: `packages/data/src/kostencatalogus/0.1/kostencatalogus_0.1.json` (49 maatregelen)
- Gewijzigd: `packages/data/src/index.ts` (export), `packages/data/package.json` (`xlsx`/`tsx` als devDependency, nieuw script), `packages/data/tsconfig.json` (`scripts` toegevoegd aan `include`, anders werd het importscript niet meegenomen door `tsc --noEmit`)

## Interpretatiekeuzes
1. **Eén JSON-bestand per versie**, niet gesplitst zoals bij tarieven (huurprijstabel/energielabel/etc. los). Aannames en maatregelen horen inhoudelijk bij elkaar — een maatregel zonder de bijbehorende regio-index/btw-aannames is niet compleet door te rekenen.
2. **`xlsx` en `tsx` alleen als devDependency van `packages/data`.** Het importscript draait alleen bij het bijwerken van de catalogus, nooit in de browser — de webapp krijgt alleen de statische JSON te zien, geen xlsx-parser in de bundel.
3. **Versie-lookup is exact, niet "dichtstbijzijnde eerdere"** zoals bij `getTarievenset`. Tarieven gelden vanaf een peildatum tot de volgende; een kostencatalogus-versie is een expliciete snapshot die een deal bewust kiest (of impliciet de nieuwste), geen tijdvak.

## Niet geïmplementeerd / bewust buiten scope
- De daadwerkelijke koppeling van maatregelen aan scenario-mutaties (taak 9) — dat is taak 11.
- Btw-berekening, indexatie per jaar, of de regio-index toepassen op de bedragen — de aannames staan klaar, de toepassing ervan hoort bij taak 11.

## Verificatie (hoe te testen)
- `pnpm --filter @wwso/data run import:kostenkentallen` → herleest de xlsx, schrijft (opnieuw) exact dezelfde JSON
- `pnpm test` → 170/170 groen (9 nieuw)
- `npx tsc --noEmit` in `packages/data` (nu ook `scripts/` meegenomen) → geen fouten
- `npx eslint packages/data` → schoon

## Volgende stap
Taak 11: suggestie-engine. Marginale analyse per rubriek, maatregelen uit de catalogus matchen, elke maatregel echt laten doorrekenen via `pasScenarioToe` + `berekenEindtelling` (niet de vuistregel-punten-indicatie), en pakketten Basis/Comfort/Maximaal samenstellen op terugverdientijd. **`⬆ Opus`** voor het ontwerp, per `plan/plan.md`.
