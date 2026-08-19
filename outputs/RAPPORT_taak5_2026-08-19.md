# Rapport: Taak 5 — Rubrieken R5 en R6 (keuken en sanitair) — 2026-08-19

## Wat er gedaan is

Gebouwd op het beleidsboek (§2.5 en §2.6), niet op `wwso.xlsx` — die mist voor deze twee rubrieken meerdere regels, zie briefing B2 t/m B8.

### Tarieven naar `packages/data`
`voorzieningen_2026-01-01.json` met de aanrechttabel, de keuken-extra's, de toilettabel, de sanitaire basis- en extrapunten en de maxima. Geen enkel puntenbedrag staat in de engine zelf (harde regel 1).

De aanrechttabel is als banden met een expliciete bovengrens gemodelleerd, inclusief de nulband "< 1 meter" die in de xlsx ontbrak en inclusief `minWooneenhedenMetToegang: 8` voor de 13-puntenband.

### Datamodel (`types/voorzieningen.ts`)
- `Keuken` — ruimteNr, aanrechtlengte, de vijf `KeukenBasiseisen` en de extra voorzieningen. Extra kastruimte is een aantal eenheden van 60 cm, geen ja/nee
- `SanitairVoorziening` — bewust niet "badruimte" genoemd: §2.6 waardeert sanitair ook buiten badkamer en toiletruimte, en de xlsx kon dat niet uitdrukken
- `PandInvoer` uitgebreid met `keukens` en `sanitair`, met referentiële validatie op `ruimteNr`

### R5 — Keukenvoorzieningen
Basispunten uit de aanrechtlengte, extra voorzieningen afgetopt op die basispunten, alles gedeeld door het aantal wooneenheden met toegang. Twee poorten:
- ontbreekt één van de vijf basiseisen (§2.5.1), dan is de keuken 0 punten waard, **inclusief** alle extra voorzieningen
- een aanrecht korter dan 1 meter geeft 0 basispunten, en daarmee via de aftopping ook 0 extra punten

`berekenKeuken` en `bepaalAanrechtBasispunten` zijn apart exporteerbaar, zodat taak 11 kan zien of een keuken onder de poort zit of tegen de aftopping aan loopt.

### R6 — Sanitaire voorzieningen
Toilet + wastafels + douche/bad + afgetopte extra's, gedeeld door het aantal wooneenheden met toegang.
- de aftopping ligt op de **douche/bad-punten**, niet op het totaal (§2.6.2)
- bad/douchecombinatie is een eigen categorie van 6 punten die de losse waardering vervangt
- buiten de badkamer geldt maximaal 1 punt aan wastafels en 1,50 punt aan meerpersoonswastafels per vertrek
- stopcontacten zijn begrensd op twee per (meerpersoons)wastafel, kastruimte op 0,75 punt
- voldoet de ruimte niet aan alle vijf eisen van §2.6.2, dan vervallen álle extra punten; de basispunten blijven staan

## Bestanden gewijzigd
- Nieuw: `packages/data/src/tarieven/2026-01-01/voorzieningen_2026-01-01.json`
- Nieuw: `packages/engine/src/types/voorzieningen.ts`
- Nieuw: `packages/engine/src/rubrieken/{r5-keuken,r6-sanitair}.ts` + testbestanden
- Gewijzigd: `packages/data/src/tarieven/{types,index}.ts`, `packages/engine/src/types/{index,pand-invoer}.ts`, `packages/engine/src/rubrieken/{gedeeld,index,test-utils}.ts`, `packages/engine/src/fixtures/testpand-6kamers.ts`

## Problemen / aandachtspunten

### Een rekenvoorbeeld in het beleidsboek spreekt zichzelf tegen
Het voorbeeld bij §2.6.2 beschrijft een bad/douchecombinatie (6 punten) plus vijf punten aan extra voorzieningen, stelt expliciet vast dat die vijf punten **niet** worden afgetopt omdat 5 < 6 — en concludeert dan: *"Omdat de badkamer wordt gedeeld door 4 onzelfstandige wooneenheden is het puntenaantal per woonruimte: 6 / 4 = 1,5 punt."*

Daar valt de zojuist berekende 5 punten weg. Volgens de eigen redenering van dezelfde alinea hoort er (6 + 5) / 4 = 2,75 uit te komen. **De engine volgt de regel, niet het voorbeeld.** De test dekt de regel af en documenteert de afwijking. Dit is het tweede voorbeeld in het beleidsboek dat intern niet klopt — het eerste staat in de briefing (D1, §2.8.4: 5,625 → "5,60").

### Interpretatiekeuzes
1. **Bandgrenzen aanrechtlengte.** Het beleidsboek zegt "Tussen 1 en 2 meter", "Tussen 2 en 3 meter", "Meer dan 3 meter" — bij precies 2,00 m claimen twee banden de lengte. Gekozen: de bovengrens hoort bij de lagere band, dus 2,00 m → 4 punten en 3,00 m → 7 punten. Dit komt exact overeen met hoe de xlsx het codeerde, wat de keuze ondersteunt.
2. **Bad/douchecombinatie sluit losse waardering uit.** Staan `douche`, `bad` én `badDoucheCombinatie` alle drie aan, dan telt alleen de combinatie (6 punten). Anders zou dezelfde fysieke voorziening dubbel geteld worden.
3. **Toiletlocatie komt uit het invoerveld**, niet uit het ruimtetype. Het veld heet al "Staand in badkamer" versus "Staand in toiletruimte"; er wordt niet tegen `Ruimte.type` gekruisvalideerd. Een controle hierop hoort bij taak 13.

### Niet geïmplementeerd
- **De wastafeluitzondering bij 8 of meer wooneenheden** (§2.6.1): "bij 1 ander vertrek (dan de badkamer) is het maximum van 1 (meerpersoons)wastafel niet van toepassing". Dat vergt dat de gebruiker één vertrek aanwijst. Zolang dat veld ontbreekt rekent de engine het strengere maximum en **onderschat** hij dus hooguit — nooit te hoog. Vastgelegd in een comment bij `wastafelPunten`.
- **De uitsluitingen bij wastafels** (§2.6.1): een bak met een douche erboven, een spoelbak in een aanrecht van ≥ 1 meter, een bidet of lavet, en een gecombineerd aansluitpunt tellen niet als wastafel. Dit zijn beoordelingen bij de invoer, geen rekenregels; horen bij de controles van taak 13.
- **De spoelbak van een te kort aanrecht als wastafel** (§2.5.2): bij een aanrecht korter dan 1 meter mag de spoelbak alsnog 1 punt in R6 opleveren. Nu moet de gebruiker die wastafel zelf invoeren.

## Verificatie (hoe te testen)
- `pnpm test` → 73/73 groen (24 nieuw), waaronder:
  - **de verplichte verificatie uit de taakomschrijving**: een luxe gedeelde keuken over 6 kamers versus dezelfde keuken privé geeft per kamer exact factor 6 verschil op de ongecapte delen. Bewust een aanrecht van 4 m gekozen, want boven 5 m zou de 13-puntenband bij 6 kamers wegvallen en zou de vergelijking niet meer opgaan
  - **het rekenvoorbeeld uit §2.5.3** — 7 basispunten + 3 extra, gedeeld door 4 wooneenheden = 2,5 punt — komt exact uit
  - de bandgrenzen 1,00 / 2,00 / 3,00 / 5,00 m expliciet getest
  - de 8-wooneenhedenvoorwaarde: 6 m aanrecht geeft 13 punten bij 8 kamers, maar 10 bij 7
- `npx tsc --noEmit` in beide packages → geen fouten
- `pnpm lint` → schoon

## Volgende stap
Taak 6: rubrieken R7 t/m R13 in de **gecorrigeerde nummering** — R7 woonvoorzieningen voor personen met een handicap (het model heeft daar al een veld voor), R8 buitenruimten, R9 gemeenschappelijke vertrekken, R10 gemeenschappelijke parkeerruimten, R11 WOZ, R12 bijzondere voorzieningen, R13 aftrekpunten. Let op de dubbele deling bij R9 en R10 (eerst adressen, dan wooneenheden) en op het gezamenlijke maximum van 15 punten bij R8.
