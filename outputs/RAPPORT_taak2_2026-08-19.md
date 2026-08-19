# Rapport: Taak 2 — Datamodel — 2026-08-19

## Wat er gedaan is
- `resources/wwso.xlsx` uitgelezen: tab `Invoer` voor de Pand- en Ruimte-velden, tab `Voorzieningen`/`Berekening` voor de handmatige-postenrijen, en de live data-validation-lijsten in de xlsx zelf (niet alleen de zichtbare celwaarden) voor de exacte enum-waarden van energielabel, soort woning, monument en ruimtetype
- `packages/engine/src/types/pand.ts` — `Pand` met `Energielabel`, `SoortWoning`, `MonumentStatus` als Zod-enums 1:1 uit de xlsx-dropdowns; `coropGebied` bewust een vrije string (niet hardcoded enum), want de COROP-lijst hoort bij de tarieventabellen van taak 3
- `packages/engine/src/types/ruimte.ts` — `Ruimte` met `RuimteType` als 13-waarden-enum
- `packages/engine/src/types/toewijzing.ts` — de K1-K12-matrix als `ToewijzingEntry[]` (ruimte → lijst kamernummers met toegang). `n_kamers` uit de xlsx wordt bewust niet als apart veld opgeslagen, dat is `kamers.length` en zou kunnen desynchroniseren
- `packages/engine/src/types/handmatige-posten.ts` — R7 (gemeenschappelijke vertrekken, punten per kamer) en de zorgwoning-vlag
- `packages/engine/src/types/pand-invoer.ts` — `PandInvoer` bundelt het geheel met referentiële `superRefine`-checks (ruimte-nummers uniek, toewijzing verwijst naar bestaande ruimte, kamernummers binnen `aantalKamers`)
- Testpand-fixture (`fixtures/testpand-6kamers.ts`) en Vitest-suite (`types/pand-invoer.test.ts`, 8 tests)

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/types/{pand,ruimte,toewijzing,handmatige-posten,pand-invoer,index}.ts`
- Nieuw: `packages/engine/src/fixtures/testpand-6kamers.ts`
- Nieuw: `packages/engine/src/types/pand-invoer.test.ts`
- Gewijzigd: `packages/engine/src/index.ts` (re-export van `types`), `packages/engine/package.json` (dependency `zod`)

## Problemen / aandachtspunten
- **Geen enkel ingevuld voorbeeldpand in wwso.xlsx.** `Invoer`, `Berekening`, `Resultaat` en `Controles` zijn allemaal lege templates — er is geen "testpand uit de xlsx" om letterlijk over te nemen. Het testpand in dit rapport is daarom synthetisch, opgezet om alle 13 ruimtetypen en de K1-K12-matrix te dekken. Het bewijst dat het model verliesvrij is (deze taak), niet dat de rekenmotor klopt — dat volgt in taak 8 met echte golden-master panden die de gebruiker aanlevert.
- **13 ruimtetypen versus 11 in de live xlsx-dropdown.** De data-validation-lijst op `Invoer!C18` bevat maar 11 waarden; `Gemeenschappelijk vertrek` en `Gemeenschappelijke overige ruimte` ontbreken. Dit is geen fout van mijn kant — de `Toelichting`-tab benoemt dit expliciet als **TODO-04**: "Ruimtetypen voor gemeenschappelijke vertrekken toevoegen zodat R7 automatisch berekent." De oorspronkelijke taakomschrijving somt wel 13 typen op, dus de motor lost dit gat bewust op. Praktisch gevolg: R7 kán hierdoor later automatisch berekend worden op basis van ruimtetype in plaats van als handmatig invoerveld — dat is echter een beslissing voor taak 6, niet voor nu. Voorlopig blijft R7 handmatig zoals gespecificeerd.
- **`org_id` niet in dit model.** Harde regel 3 ("org_id vanaf regel één") gaat over databasetabellen. `PandInvoer` is het pure rekenmotor-domeinmodel zonder I/O; `org_id` hoort bij de opslaglaag in `apps/web` (taak 15), niet bij de engine. Vlag dit als het anders bedoeld was.
- **`energielabel: 'Bouwjaar'`** is geen echt label maar de xlsx-sentinelwaarde "geen label bekend, val terug op bouwjaargrens" — vastgelegd als aparte enum-waarde zodat R4 in taak 4 dit expliciet kan afvangen in plaats van te gokken.

## Verificatie (hoe te testen)
- `pnpm test` → 8/8 groen, inclusief drie negatieve tests (toewijzing naar niet-bestaande ruimte, kamer buiten `aantalKamers`, dubbel ruimte-nummer, R7-post op niet-bestaande kamer)
- `cd packages/engine && npx tsc --noEmit` → geen fouten (strict mode)
- `pnpm lint` → schoon
- Round-trip-test bevestigt dat het testpand zonder informatieverlies door `PandInvoer.parse()` gaat

## Volgende stap
Taak 3: tarieventabellen als versiedataset met peildatum (huurtabel, energielabelfactoren, bouwjaargrenzen, COROP-gebieden) in `packages/data`, uitgelezen uit tab `Tabellen` van `resources/wwso.xlsx`.
