# Rapport: Correctieronde taak 4 tegen het beleidsboek — 2026-08-19

## Wat er gedaan is

Naar aanleiding van `briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md` zijn de aantoonbare fouten in de rubrieken R1 t/m R4 hersteld, plus de datamodel-uitbreidingen die daarvoor nodig waren.

### Beleidsboek opgenomen in het project
`resources/beleidsboek/beleidsboek-wwso-2026-01.pdf` met een `HERKOMST.md` die vastlegt dat dit géén bestand van de gebruiker is maar de officiële bron van de Huurcommissie, en die de rangorde bij twijfel benoemt: beleidsboek → huurprijscheck-site → xlsx.

### Rekenregels (`rubrieken/gedeeld.ts`)
- `rondAfOpHeleM2` toegevoegd voor de m²-afronding van §2.1.1.1 (≥ 0,50 omhoog)
- `oppervlakteVolgensRekenregel` implementeert de volledige volgorde: privé apart optellen en afronden, gemeenschappelijk apart (ná deling), daarna beide optellen en opnieuw afronden
- `VERKEERSRUIMTE_TYPES` als eigen constante, omdat verkeersruimten in R1/R2 geen punten krijgen maar in R3 wél meetellen
- `rondAfOpHelePunten` is nu gedocumenteerd als uitsluitend bedoeld voor de eindsaldering (§2.1.7), niet voor een rubriek

### R1 — twee correcties
Afronding gebeurt nu op vierkante meters in plaats van op punten, en apart voor privé en gemeenschappelijk (§2.1.1.1). De rubriek rondt daarna af op kwartpunten zoals élke rubriek (§2.1.6) — de aanname uit taak 4 dat R1 op hele punten afrondt kwam uit de taakomschrijving en wordt door het beleidsboek niet gedragen.

### R2 — twee correcties
Dezelfde m²-afronding als R1. Nieuw: de zolderaftrek van §2.2.2.3 (5 punten voor een zolder zonder vaste trap, begrensd zodat de zolder nooit negatief wordt).

### R3 — drie correcties
- verwarmde **verkeersruimten** tellen mee voor 1 punt (§2.3); die werden volledig uitgesloten
- verkoeling geldt **alleen voor vertrekken** (§2.3.3) en **alleen als die ook verwarmd zijn** (§2.3.1, "1 punt extra per verwarmd én verkoeld vertrek")
- het maximum van 4 geldt voor overige ruimten en verkeersruimten samen

### R4 — drie uitbreidingen
- `berekenR4` krijgt een `peildatum`-argument en toetst daarmee de geldigheid van het energielabel (§2.4.2/§2.4.3): opgenomen ná de peildatum, ouder dan 10 jaar, of afgegeven in de periode 2015-2021 (vereenvoudigde labels) → terugvallen op het bouwjaar
- de monumentuitzondering van §2.4.6.1: rijks-, provinciale en gemeentelijke monumenten krijgen geen minpunten, de uitkomst wordt dan 0. Beschermd dorpsgezicht valt hier bewust buiten
- `toetsLabelGeldigheid` is apart exporteerbaar en getest

### Datamodel
- `Ruimte.zolder` (optioneel, met `vasteTrap` en `beschotenDak`) voor §2.2.1.3 en §2.2.2.3
- `HandmatigePosten.gemeenschappelijkeVertrekken` is nu gedocumenteerd als **R9**, niet R7
- `HandmatigePosten.woonvoorzieningenHandicap` toegevoegd: de echte rubriek 7 (1 punt per € 332,00 netto-investering), die volledig ontbrak
- `RubriekResultaat.perKamerRuw` toegevoegd op alle rubrieken — de punten vóór kwartpuntsafronding, nodig voor de marginale analyse van taak 11

## Bestanden gewijzigd
- Nieuw: `resources/beleidsboek/beleidsboek-wwso-2026-01.pdf`, `resources/beleidsboek/HERKOMST.md`
- Herschreven: `packages/engine/src/rubrieken/{gedeeld,types,r1-…,r2-…,r3-…,r4-…}.ts` en alle vier de bijbehorende testbestanden
- Gewijzigd: `packages/engine/src/types/{ruimte,handmatige-posten}.ts`, `packages/engine/src/fixtures/testpand-6kamers.ts`

## Problemen / aandachtspunten

- **Eén test is bewust van betekenis veranderd.** De oude test `'blijft op 2 punten bij meer dan 2 verkoelde ruimten'` gebruikte drie onverwarmde maar verkoelde vertrekken en verwachtte 2 punten. Volgens §2.3.1 is het juiste antwoord 0. De test is vervangen, niet aangepast tot hij weer slaagde.
- **R2-uitkomsten schuiven.** Door de m²-afronding levert 3,2 m² wasruimte nu 2,25 punten in plaats van 2,50. Dat is geen regressie maar een correctie.
- **De zolderaftrek bij een gedeelde zolder is een interpretatie.** Het beleidsboek zegt niet of de begrensde aftrek van 5 punten vóór of ná de deling over de kamers valt. Gekozen is: begrenzen op de waarde van de hele zolder, daarna delen — consistent met hoe de waardering zelf wordt gedeeld. Vastgelegd in een comment.
- **Het maximum van 4 in R3 blijft een interpretatie.** §2.3 spreekt van één maximum voor "de laatste twee soorten binnenruimten", §2.3.1 herhaalt het apart bij privé en gemeenschappelijk. Gekozen voor één gezamenlijk maximum.
- **Nog niet aangepakt** (zie briefing, sectie B): het volledige R5/R6-datamodel met basiseisen-poorten, sanitair buiten badruimten, energie-index als alternatief voor het label, taxatiewaarde bij een ontbrekende WOZ, contractdatum voor de monumentopslag, en extrapolatie boven 250 punten. Die horen bij taak 5, 6 en 7.

## Verificatie (hoe te testen)
- `pnpm test` → 49/49 groen (was 30), waaronder:
  - het letterlijke rekenvoorbeeld uit §2.4.4 — (20 + 40/4) × 0,65 — komt exact uit op 19,50 punten
  - het afrondingsvoorbeeld uit §2.1.1.1 — 15,43 m² → 15 m²
  - het vervalvoorbeeld uit §2.4.3 — een label van 1 oktober 2014 is op 1 oktober 2024 vervallen, op 30 september nog niet
  - een expliciete test die aantoont dat privé en gemeenschappelijk apart worden afgerond (16 punten waar de oude aanpak 15 gaf)
- `cd packages/engine && npx tsc --noEmit` → geen fouten
- `pnpm lint` → schoon

## Volgende stap
Taak 5 (⬆ Opus): rubrieken R5 en R6. Het datamodel moet daarvoor eerst uitgebreid worden met de keuken- en sanitairvoorzieningen inclusief de twee basiseisen-poorten uit §2.5.1 en §2.6.2 — zie briefing B2 t/m B8. De twee openstaande interpretatievragen uit die taak zijn inmiddels door het beleidsboek beantwoord: de cap op sanitaire extra's ligt op de douche/bad-punten (§2.6.2), en bad/douche is een eigen categorie van 6 punten (§2.6.1).
