# Rapport: Taak 3 — Tarieventabellen als dataset — 2026-08-19

## Wat er gedaan is
- Tab `Tabellen` van `resources/wwso.xlsx` uitgelezen op **ruwe celwaarden** (niet de geformatteerde CSV-weergave, om afrondingsartefacten in bedragen te vermijden) via de vaste celranges A2:B252 (huurprijstabel), D2:E12 (energielabel), D15:E21 (bouwjaargrenzen) en G2:H41 (COROP)
- Vier JSON-bestanden weggeschreven in `packages/data/src/tarieven/2026-01-01/`, peildatum in zowel het pad als de bestandsnaam:
  - `huurprijstabel_2026-01-01.json` — 251 regels, punten 0 t/m 250 → max. huurprijs
  - `energielabelfactoren_2026-01-01.json` — 11 labels A++++ t/m G → punten/m²
  - `bouwjaargrenzen_2026-01-01.json` — 7 bovengrenzen (fallback als er geen energielabel is)
  - `corop_2026-01-01.json` — 40 COROP-gebieden → gemiddelde WOZ/m²
- Zod-schema's in `packages/data/src/tarieven/types.ts` (`Tarievenset` en de vier regel-typen)
- `packages/data/src/tarieven/index.ts` — laadt en valideert de dataset(s), en `getTarievenset(peildatum)`: geeft de laatst ingegane set terug met een peildatum ≤ de gevraagde datum, en gooit een expliciete fout als de gevraagde datum vóór de vroegste dataset ligt
- Vitest-suite met steekproeven die exact tegen de xlsx-waarden zijn gecontroleerd, plus twee tests voor het peildatum-gedrag

## Bestanden gewijzigd
- Nieuw: `packages/data/src/tarieven/2026-01-01/*.json` (4 bestanden)
- Nieuw: `packages/data/src/tarieven/{types,index}.ts`, `packages/data/src/tarieven/tarieven.test.ts`
- Gewijzigd: `packages/data/src/index.ts` (re-export), `packages/data/package.json` (dependency `zod`)

## Problemen / aandachtspunten
- **Bouwjaargrenzen dekken alleen 1976 en later.** De xlsx-tabel begint pas bij grens 1976 (factor −0,15); voor een pand van vóór 1976 zonder energielabel bevat de dataset geen regel. `getTarievenset` zelf gooit hier geen fout over — dat hoort bij de lookup-logica in taak 4 (R4), die dit geval expliciet moet afvangen in plaats van te clampen op de laagste grens. Vastgelegd in een code-comment bij `BouwjaarFactor` zodat het niet vergeten wordt.
- **`totEnMetBouwjaar` is een bovengrens, geen ondergrens.** De xlsx-kolom heet "Bouwjaar t/m"; een pand valt in de eerste (laagste) grens die groter-of-gelijk is aan het bouwjaar. Dat interpretatiedetail staat als comment in `types.ts`, want het is niet vanzelfsprekend uit de ruwe data af te lezen.
- Getest tegen de knik bij 60 punten uit taak 11 (€10,20/punt tot en met 60, €5,27/punt erboven): punt 60→61 is €616,58−€611,28 = €5,30, punt 59→60 is €611,28−€601,06 = €10,22 — komt overeen met de beschrijving in de prompt.
- Slechts één dataset nu (peildatum 1 januari 2026). De structuur (array van `Tarievenset`, gesorteerd op peildatum) is al voorbereid op een tweede dataset zonder dat bestaande code hoeft te veranderen.

## Verificatie (hoe te testen)
- `pnpm test` → 14/14 groen (8 uit taak 2, 6 nieuw), inclusief exacte steekproeven op alle vier tabellen en twee tests voor het peildatum-foutgedrag
- `cd packages/data && npx tsc --noEmit` → geen fouten
- `pnpm lint` → schoon
- `getTarievenset('2025-12-31')` gooit `Geen tarievenset beschikbaar...`, `getTarievenset('2026-06-15')` geeft de 1-januari-set terug

## Volgende stap
Taak 4: rubrieken R1 t/m R4 (oppervlakte vertrekken, overige ruimten, verwarming/verkoeling, energieprestatie) als losse functies die punten per kamer plus een toelichtingsregel teruggeven.
