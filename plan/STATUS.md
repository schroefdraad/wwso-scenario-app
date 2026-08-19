# Status — WWSO Scenario App

Laatst bijgewerkt: 2026-08-19 (na taak 10)

## Wat werkt
- Monorepo met pnpm workspaces: `apps/web` (Next.js 16, App Router, TS strict), `packages/engine`, `packages/data` (data nog leeg)
- Vitest, ESLint, Prettier werken op root- en packageniveau
- Supabase-connectie geverifieerd vanuit `apps/web` (zie `outputs/RAPPORT_taak1_2026-08-19.md`)
- Datamodel in `packages/engine`: `Pand`, `Ruimte` (13 typen), K1-K12-`Toewijzing`, `HandmatigePosten` (R7 + zorgwoning), gebundeld in `PandInvoer` met referentiële validatie. Zie `outputs/RAPPORT_taak2_2026-08-19.md` voor de afweging rond de 2 ruimtetypen die de xlsx zelf nog mist (TODO-04)
- Tarieventabellen in `packages/data`: huurprijstabel, energielabelfactoren, bouwjaargrenzen, COROP-gebieden, peildatum 1 januari 2026, met `getTarievenset(peildatum)`
- Rubrieken R1-R4 in `packages/engine/src/rubrieken`, **gevalideerd tegen het beleidsboek** en gecorrigeerd (zie `outputs/RAPPORT_correctie_taak4_2026-08-19.md`). Drie rekenvoorbeelden uit het beleidsboek zitten als test in de suite
- Rubrieken R5 en R6 (keuken, sanitair) met de twee basiseisen-poorten uit §2.5.1 en §2.6.2, de aftopping van extra voorzieningen, en sanitair buiten de badkamer. Zie `outputs/RAPPORT_taak5_2026-08-19.md`
- Rubrieken R7 t/m R13 (handicapvoorzieningen, buitenruimten, gemeenschappelijke ruimten, parkeren, WOZ, bijzondere voorzieningen, aftrekpunten), in de gecorrigeerde nummering uit het beleidsboek. R9 wordt nu automatisch afgeleid uit ruimtetypen in plaats van handmatig ingevoerd; R3 is uitgebreid zodat verwarming/verkoeling in gemeenschappelijke ruimten meetelt (§2.9.2). Zie `outputs/RAPPORT_taak6_2026-08-19.md`
- Eindtelling in `packages/engine/src/eindtelling`: telt R1 t/m R13 per kamer op, past de zorgwoning-opslag (+35% op R1-11) en de monumentopslagen toe (Rijks 35%/10 punten afhankelijk van de contractdatum, gemeentelijk/provinciaal 15%, beschermd dorpsgezicht 5%), en rekent de huurprijs uit met extrapolatie boven 250 punten. Zie `outputs/RAPPORT_taak7_2026-08-19.md`
- Golden-master validatie (taak 8) tegen 3 officiële Huurprijscheck-exports van hetzelfde pand (Kleiweg 179-B): **alle getoetste rubrieken én de drie eindtotalen (67 / 74 / 56) en huurprijzen matchen nu exact.** Zie `outputs/RAPPORT_taak8_2026-08-19.md` voor de ronde zelf en `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md` voor de twee correcties die daarvoor nodig waren: (1) R4 rekent op de ongeronde privé+gedeeld-oppervlakte in plaats van op de afgeronde R1-grondslag — de afrondingsregel van §2.2.1.1 hoort bij rubriek 1 en wordt door §2.4.4 niet aangehaald, terwijl §2.13 laat zien hoe het beleidsboek het formuleert als het de rubriek-1-uitkomst wél bedoelt; R2 en R13 blijven daarom ongewijzigd. (2) De kamer 6-fixture hergebruikte ten onrechte het sanitair van kamer 2 — de drie exports zijn met verschillende aannames ingevuld
- Scenariomodel in `packages/engine/src/scenario`: een scenario is een lijst mutaties (14 soorten, dekt pand/ruimte/toewijzing/keuken/sanitair/parkeerplek) die bovenop de as-is `PandInvoer` wordt toegepast met `pasScenarioToe`. Puur en immutable, met expliciete foutmeldingen bij een niet-bestaand of ongeldig doel. Een correctie op de as-is werkt automatisch door in elk scenario, zonder de mutatielijst aan te passen. Zie `outputs/RAPPORT_taak9_2026-08-19.md`
- Kostencatalogus in `packages/data/src/kostencatalogus`: herhaalbaar geïmporteerd uit `resources/Kostenkentallen_WWSO_optimalisatie.xlsx` met `pnpm --filter @wwso/data run import:kostenkentallen` (49 maatregelen, versie 0.1, alle op status `schatting`). Versie komt uit de bron zelf (tab Toelichting), harde validatie op rubriekcode/status/dubbele id's, geen vooraf uitgerekende regio-prijs. Zie `outputs/RAPPORT_taak10_2026-08-19.md`
- Het beleidsboek WWSO januari 2026 staat in `resources/beleidsboek/` (PDF + een lokale tekstextractie `beleidsboek-wwso-2026-01.txt` via `pdftotext -layout`) — dit is de bron van waarheid, niet `wwso.xlsx`. De PDF blijft leidend; de txt is alleen een grep-baar hulpmiddel. Voor tabel-zware pagina's (en voor de golden-master PDF's) is de PDF ook via de Windows Runtime PDF-API naar PNG te renderen en visueel te lezen — betrouwbaarder dan `pdftotext` bij meerkoloms lay-outs, zie het PowerShell-recept in `outputs/RAPPORT_taak8_2026-08-19.md`

Wel beschikbaar als input:
- `resources/wwso.xlsx` — werkende puntentelling in Excel, 8 tabs, rubrieken R1 t/m R13. Dit is de specificatie voor de rekenmotor. Bevat 7 bekende open punten op tab `Toelichting`.
- `resources/Rendementscalculator_[adres].xlsx` — rendementsmodel met AS IS / TO BE / BOX3-tabs. Voorlopig los van de app.
- `resources/Kostenkentallen_WWSO_optimalisatie.xlsx` — 49 maatregelen met kosten en puntenimpact. Alle bedragen staan op status `schatting` en moeten vervangen worden door eigen cijfers.

## Vastgelegde beslissingen
- Alleen onzelfstandige verhuur (WWSO). Zelfstandig valt buiten scope.
- POC/MVP voor eigen gebruik plus één gebruiker buiten de workspace, met het oog op later vermarkten.
- TypeScript end-to-end: Next.js, Supabase, Vercel. Rekenmotor als los pakket dat in de browser draait, zodat scenario's direct hertellen.
- De xlsx is de specificatie, niet de motor. De engine wordt opnieuw geïmplementeerd en gevalideerd tegen de xlsx én tegen de officiële huurprijscheck-site.
- Scenario's worden gerangschikt op terugverdientijd, daarnaast ΔBAR.
- `org_id` vanaf de eerste tabel, ook nu er één organisatie is.
- Geen persoonsgegevens in de MVP. Alleen objectgegevens.
- Koppeling rendementscalculator, gemeentelijke regels, zittende-huurderschakelaar en Shortlist-import: allemaal fase 4.

## Belangrijkste bevinding tot nu toe
`wwso.xlsx` is een interpretatie van het beleidsboek en wijkt op 15 punten af, waaronder een verschoven rubrieknummering vanaf R7 en een volledig ontbrekende rubriek 7 (woonvoorzieningen voor personen met een handicap). De volledige lijst staat in `briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md`. Bij twijfel geldt: beleidsboek → officiële huurprijscheck-site → xlsx.

## Openstaande beslissingen
- UX van de kamertoewijzing (40 ruimten × 12 kamers). Voorstel volgt bij taak 12, vóór het bouwen.
- Hoe de kostencatalogus onderhouden wordt zodra er meerdere gebruikers zijn — nu nog een xlsx die handmatig wordt ingelezen.

## Aandachtspunten voor een volgende golden-master ronde (geen openstaande beslissing)
- **Eén-staps versus tweestaps m²-afronding bij R1** (bevinding D3, Hoefstraat). De drie Kleiweg-kamers geven bij beide methoden dezelfde uitkomst en onderscheiden ze dus niet — anders dan het taak-8-rapport suggereerde. Wacht op een pand dat het verschil wél laat zien.
- **R2 heeft geen empirische dekking**: geen van de drie kamers heeft overige ruimten. De tweestaps-m²-afronding van R2 rust nu puur op de tekst van §2.2.2.1. Een pand met een berging of bijkeuken zou dat moeten bevestigen.
- **D2, eenhandsmengkraan in een privékeuken** (0,75 versus 0,25 op `Slaapkamer 3 + keuken.pdf`).
- Geen van de aangeleverde panden raakt monument, parkeren of gehandicaptenvoorzieningen.

## Modelkeuze
Standaard Sonnet, net als in het Funda-project. Vier taken zijn in `plan/plan.md` gemarkeerd met `⬆ Opus`: taak 5 (keuken/sanitair, afgerond), taak 8 (afgerond, inclusief de R4-beoordeling die eruit voortkwam), taak 11 voor het ontwerp van de suggestie-engine, en taak 12 voor het UX-voorstel. Bij taak 11 en 12 alleen het ontwerp — de implementatie gaat daarna terug naar Sonnet.

## Volgende concrete actie
Taak 11: suggestie-engine. **`⬆ Opus`** voor het ontwerp (hoe maatregelen combineren en per kamer waarderen), daarna Sonnet voor de implementatie.
