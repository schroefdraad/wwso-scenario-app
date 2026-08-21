# Rapport: Taak 13 — Resultaatscherm — 2026-08-20

## Wat er gedaan is

Het resultaatscherm (`/pand/resultaat`) toont per kamer de punten en maximale huurprijs, uitklapbaar naar de opbouw per rubriek met de toelichtingsregel, plus de vier controles uit tab `Controles` van `wwso.xlsx`. Het scherm is opgebouwd als een herbruikbaar, prop-gedreven component (`Resultaatscherm`, ontvangt `{ pand, tarievenset, peildatum }`) — bewust niet route-gekoppeld, zodat taak 14 (scenariovergelijking) het meerdere keren naast elkaar kan renderen zonder duplicatie.

### Structuur
```
packages/engine/src/
├── controles/            NIEUW — de vier controles, puur en getest
│   ├── types.ts
│   ├── controles.ts       voerControlesUit(pand) → 4 ControleResultaat
│   └── controles.test.ts
└── eindtelling/types.ts    UITGEBREID — EindtellingResultaat.rubriekToelichting (13 arrays, additief)

apps/web/src/
├── lib/resultaat/
│   ├── toelichting-filter.ts       filtert rubriektoelichting per kamer, generiek over alle 13 rubrieken
│   ├── toelichting-filter.test.ts   7 tests tegen de ECHTE toelichting van testpand6Kamers
│   ├── rubriek-labels.ts
│   └── opslag.ts                    sessionStorage-brug van taak 12 naar taak 13
├── components/resultaat/
│   ├── Resultaatscherm.tsx           hoofdcomponent
│   ├── KamerRij.tsx                  per kamer: punten, huur, uitklapbare rubriektabel + subtotalen
│   ├── RubriekRij.tsx                per rubriek: afgeronde + ruwe punten, uitklapbare toelichting
│   ├── ControlesPaneel.tsx           de vier controles met ✓/⚠
│   └── styles.module.css
└── app/pand/resultaat/page.tsx       leest het pand uit sessionStorage, rendert Resultaatscherm
```

## De vier controles (engine-niveau, puur en getest)

1. **Totaal m² versus WOZ-oppervlak** — som van alle binnenruimten (Privévertrek, Keuken, Badruimte, Berging, Bijkeuken, Wasruimte, Overige ruimte, Toiletruimte, Verkeersruimte, Gemeenschappelijk vertrek, Gemeenschappelijke overige ruimte) vergeleken met `pand.wozOppervlak`. **Interpretatiekeuze**: buitenruimten en parkeerplekken tellen NIET mee, conform NEN 2580 "gebruiksoppervlakte wonen" — expliciet gemotiveerd in de code, niet stilzwijgend aangenomen. Waarschuwt bij >20% relatieve afwijking (in beide richtingen), grenswaarde met een aparte test bevestigd.
2. **Ruimten zonder type** — **is structureel onmogelijk te schenden** op een gevalideerde `PandInvoer`: `Ruimte.type` is een verplicht Zod-enum-veld, anders dan de vrije/optionele dropdown in de xlsx. De controle is toch als echte, uitvoerbare check gebouwd (niet stilzwijgend weggelaten) en levert op elke geldige invoer gegarandeerd 0 bevindingen op — als vangnet mocht het datamodel ooit een optioneel type-veld krijgen. Bevestigd met een test die deze eigenschap expliciet vastlegt.
3. **Ruimten zonder toewijzing** — een ruimte waarvan het nummer in geen enkele `toewijzing`-entry voorkomt. Dit is dezelfde bevinding die in taak 12 al als losse, lichtgewicht live-waarschuwing bestond tijdens het typen; hier is het de canonieke, geteste bron van waarheid voor het AFGERONDE resultaat.
4. **Kamers zonder privévertrek** — een kamer (1..aantalKamers) zonder toegang tot een ruimte van het type Privévertrek.

**Bewust géén hergebruik tussen taak 12 en taak 13 geforceerd**: taak 12's `bepaalWaarschuwingen` werkt op de ruwe, deels-ingevulde `InvoerState` (string-velden, nog niet per se een geldige `PandInvoer`) om al tíjdens het typen te waarschuwen; taak 13's `voerControlesUit` werkt op een volledig gevalideerde `PandInvoer` als officiële, afgeleide-van-de-xlsx eindcontrole. Dit zijn twee verschillende concerns op verschillende datavormen — samenvoegen zou een premature abstractie zijn geweest.

## Toelichting per kamer per rubriek: een generiek filter, geen 13 speciale gevallen

De 13 rubrieken schrijven hun toelichtingsregels in verschillende granulariteit — sommige één regel per kamer ("R1 kamer 4: ..."), andere één regel per voorziening/ruimte ("R5 keuken (ruimte 7): ..."), gedeeld door de kamers die er toegang toe hebben. In plaats van dit per rubriek hard te coderen (fragiel, breekt stil bij een tekstwijziging), is er één generiek filter gebouwd dat voor elke regel kijkt of er een getal na "kamer" of "ruimte" in de tekst staat:
- geen van beide → pandbrede/generieke regel (bijv. R11's WOZ-toelichting), zichtbaar voor iedereen;
- "kamer N" → zichtbaar voor die kamer/kamers (ook bij een kommalijst zoals "(kamer 1, 2, 3)");
- "ruimte N" → zichtbaar voor elke kamer met toegang tot die ruimte.

Geverifieerd tegen de ECHTE toelichtingsregels van `testpand6Kamers` (niet tegen verzonnen voorbeelden) met 7 tests, waaronder één die expliciet bewijst dat **geen enkele toelichtingsregel spoorloos verdwijnt** (elke regel is voor minstens één kamer zichtbaar) — precies het type stille-verlies-risico dat dit project consequent vermijdt.

## Verbinding met taak 12

De "Doorrekenen"-knop op `/pand/nieuw` slaat de geprojecteerde `PandInvoer` op in `sessionStorage` (er is nog geen backend-opslag — dat is taak 15/17) en navigeert naar `/pand/resultaat`. Bewust een tijdelijke, client-only brug: geen deals, geen historie, alleen "de invoer van zonet doorgeven binnen dit tabblad".

## Geverifieerd in de browser (niet alleen typecheck/lint)

Met een Playwright-script tegen de draaiende dev server:
1. Voorbeeldpand laden → Doorrekenen → resultaatscherm toont alle 6 kamers met correcte punten/huur; **alle vier de controles groen**.
2. Kamer 4 uitklappen → R5 (Keuken) uitklappen → toont exact de juiste, gefilterde toelichtingsregel voor de gedeelde keuken.
3. Een bewust geschonden pand (WOZ-oppervlak naar 400 m², ruimte 11 zonder toewijzing, ruimte 3 van kamer 3 naar kamer 2 verschoven) geladen → **controle 1, 3 en 4 vuren met de juiste, specifieke omschrijving; controle 2 blijft terecht groen**. Zijeffect dat meteen de herrekening bevestigt: kamer 2 en 3's punten verschuiven correct (68 pt resp. 30 pt) door de gewijzigde toewijzing.

Nul console-errors in beide scenario's.

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/controles/{types,controles,controles.test,index}.ts`
- Gewijzigd: `packages/engine/src/eindtelling/{types,eindtelling}.ts` (`rubriekToelichting`, additief), `packages/engine/src/index.ts` (export van `controles/`)
- Nieuw: `apps/web/src/lib/resultaat/*.ts` (4 bestanden + 1 test), `apps/web/src/components/resultaat/*.tsx`/`.css` (5 bestanden), `apps/web/src/app/pand/resultaat/page.tsx`
- Gewijzigd: `apps/web/src/components/invoer/Topbar.tsx` (Doorrekenen-knop wired)

## Niet geïmplementeerd / bewust buiten scope
- Geen aparte "peildatum van de berekening"-keuze op het resultaatscherm — gebruikt dezelfde nieuwste-tarievenset-conventie als taak 12.
- Geen PDF-export (taak 16) of opslaan als deal (taak 15).

## Verificatie (hoe te testen)
- `pnpm test` → 214/214 groen (7 nieuw: controles.test.ts + toelichting-filter.test.ts)
- `npx tsc --noEmit` in `packages/engine` en `apps/web` → geen fouten
- `npx eslint` op beide → schoon
- Handmatig: `pnpm --filter @wwso/web dev`, naar `/pand/nieuw`, "Voorbeeldpand laden" → "Doorrekenen" → resultaatscherm met alle kamers, rubrieken en controles

## Volgende stap
Taak 14: Scenariovergelijking met directe hertelling in de browser — hergebruikt `Resultaatscherm` naast elkaar voor as-is + tot drie scenario's.
