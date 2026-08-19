# Rapport: Taak 4 — Rubrieken R1 t/m R4 — 2026-08-19

## Wat er gedaan is
- `packages/engine/src/rubrieken/gedeeld.ts` — gedeelde bouwstenen: `VERTREK_TYPES`, `OVERIGE_RUIMTE_TYPES`, de twee afrondingsfuncties (`rondAfOpHelePunten`, `rondAfOpKwartpunten` — letterlijk `FLOOR(x + 0.125, 0.25)`), `ruimtesPerKamer` (bouwt per kamer de lijst toegankelijke ruimtes met hun deler `n_kamers met toegang`) en `vertrekOppervlakteRuw` (de R1-grondbasis, herbruikt door R4)
- `r1-oppervlakte-vertrekken.ts`, `r2-oppervlakte-overige-ruimten.ts`, `r3-verwarming.ts`, `r4-energieprestatie.ts` — elk een functie `berekenR{n}(input, ...)` die `{ perKamer, toelichting }` teruggeeft
- 15 nieuwe unit tests, inclusief de twee expliciet gevraagde gevallen: gedeelde keuken over 4 kamers (R1) en precies 5 verwarmde overige ruimten die op 4 punten blijven staan (R3)
- Onderweg een **fout in taak 3 gecorrigeerd**: ik nam toen aan dat de bouwjaargrenzen-tabel geen ondergrens had beneden 1976 en dat een ouder bouwjaar een fout moest geven. Een test die dat aannam faalde meteen — de tabel heeft namelijk alléén bovengrenzen ("Bouwjaar t/m"), dus de laagste grens (1976) dekt impliciet elk ouder pand zonder ondergrens. Het echte randgeval zit aan de bovenkant: een bouwjaar ná de hoogste grens (2099). Comment in `packages/data/src/tarieven/types.ts` is aangepast; het oorspronkelijke taak-3-rapport laat ik ongewijzigd als tijdsdocument.

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/rubrieken/{types,gedeeld,r1-oppervlakte-vertrekken,r2-oppervlakte-overige-ruimten,r3-verwarming,r4-energieprestatie,index,test-utils}.ts` + bijbehorende `.test.ts`-bestanden
- Gewijzigd: `packages/engine/src/index.ts` (re-export), `packages/engine/package.json` (workspace-dependency `@wwso/data`), `packages/data/src/tarieven/types.ts` (comment-correctie)

## Problemen / aandachtspunten — interpretatiekeuzes zonder letterlijke xlsx-formule
De Berekening-tab van `wwso.xlsx` bevat voor R1-R4 geen ingevulde formules (het is een lege template, zie taak 2/3-rapporten) — alleen de beschrijvingen op de Toelichting-tab. Drie keuzes die ik daarom zelf heb moeten maken, elk gebaseerd op harde regel 7 ("gedeelde ruimten worden gedeeld door het aantal kamers met toegang" als algemene regel) toegepast op wat de Toelichting-tab wél zegt:

1. **R3 deelt élke component door n_kamers**, niet alleen de privé/keuken/bad-component. Dat is de reden dat R3 — net als R2 — kwartpuntsafronding nodig heeft; bij een ongedeelde ruimte levert dat toch een heel getal op, dus de gegeven verificatietest (5 verwarmde overige ruimten → 4 punten) onderscheidt dit niet van een niet-delende variant.
2. **De maxima (4 resp. 2 punten) gelden op de gesommeerde, gedeelde punten per kamer**, niet op het aantal ruimten. Bij ongedeelde ruimtes (het gegeven testgeval) komt dat op hetzelfde neer.
3. **"Overige verwarmde ruimten" in R3 gebruikt dezelfde vijf typen als R2** (Berging, Bijkeuken, Wasruimte, Overige ruimte, Toiletruimte) — de Toelichting-tab herhaalt het woord "overige" zonder een eigen lijst te geven. **"Verkoeld" telt mee voor alle vertrek- én overige-ruimte-typen**, maar niet voor Verkeersruimte, Buitenruimte- of Gemeenschappelijke typen (die horen bij andere rubrieken, R8/R9).
4. **R4 rondt af op kwartpunten** — taak 4 noemt alleen R1 als uitzondering op de kwartpuntsafronding-standaard uit harde regel 7, dus R4 volgt de standaard bij gebrek aan een andere instructie.

Dit zijn geen gok-op-goed-geluk-keuzes maar de meest interne-consistente lezing van de gegeven regels; ze zijn echter niet geverifieerd tegen een echte formule. **Taak 8 (golden-master validatie) is het aangewezen moment om dit te bevestigen of te corrigeren** — vraag dan expliciet naar de xlsx-formules voor R3 als er een afwijking optreedt.

## Verificatie (hoe te testen)
- `pnpm test` → 30/30 groen (15 nieuw), inclusief de twee verplichte testgevallen uit de taakomschrijving
- `cd packages/engine && npx tsc --noEmit` → geen fouten
- `pnpm lint` → schoon

## Volgende stap
Taak 5 (⬆ Opus): rubrieken R5 en R6 — keuken en sanitair. Meest verweven logica in de xlsx; volgens `plan/plan.md` een stopmoment vóór het bouwen, niet onbeheerd door te voeren.
