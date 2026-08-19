# Status — WWSO Scenario App

Laatst bijgewerkt: 2026-08-19 (na taak 6)

## Wat werkt
- Monorepo met pnpm workspaces: `apps/web` (Next.js 16, App Router, TS strict), `packages/engine`, `packages/data` (data nog leeg)
- Vitest, ESLint, Prettier werken op root- en packageniveau
- Supabase-connectie geverifieerd vanuit `apps/web` (zie `outputs/RAPPORT_taak1_2026-08-19.md`)
- Datamodel in `packages/engine`: `Pand`, `Ruimte` (13 typen), K1-K12-`Toewijzing`, `HandmatigePosten` (R7 + zorgwoning), gebundeld in `PandInvoer` met referentiële validatie. Zie `outputs/RAPPORT_taak2_2026-08-19.md` voor de afweging rond de 2 ruimtetypen die de xlsx zelf nog mist (TODO-04)
- Tarieventabellen in `packages/data`: huurprijstabel, energielabelfactoren, bouwjaargrenzen, COROP-gebieden, peildatum 1 januari 2026, met `getTarievenset(peildatum)`
- Rubrieken R1-R4 in `packages/engine/src/rubrieken`, **gevalideerd tegen het beleidsboek** en gecorrigeerd (zie `outputs/RAPPORT_correctie_taak4_2026-08-19.md`). Drie rekenvoorbeelden uit het beleidsboek zitten als test in de suite
- Rubrieken R5 en R6 (keuken, sanitair) met de twee basiseisen-poorten uit §2.5.1 en §2.6.2, de aftopping van extra voorzieningen, en sanitair buiten de badkamer. Zie `outputs/RAPPORT_taak5_2026-08-19.md`
- Rubrieken R7 t/m R13 (handicapvoorzieningen, buitenruimten, gemeenschappelijke ruimten, parkeren, WOZ, bijzondere voorzieningen, aftrekpunten), in de gecorrigeerde nummering uit het beleidsboek. R9 wordt nu automatisch afgeleid uit ruimtetypen in plaats van handmatig ingevoerd; R3 is uitgebreid zodat verwarming/verkoeling in gemeenschappelijke ruimten meetelt (§2.9.2). Zie `outputs/RAPPORT_taak6_2026-08-19.md`
- Het beleidsboek WWSO januari 2026 staat in `resources/beleidsboek/` (PDF + een lokale tekstextractie `beleidsboek-wwso-2026-01.txt` via `pdftotext -layout`) — dit is de bron van waarheid, niet `wwso.xlsx`. De PDF blijft leidend; de txt is alleen een grep-baar hulpmiddel

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
- Hoe om te gaan met verschillen tussen de engine en de officiële site bij taak 8: per verschil bepalen of de xlsx of de engine fout zit.
- Hoe de kostencatalogus onderhouden wordt zodra er meerdere gebruikers zijn — nu nog een xlsx die handmatig wordt ingelezen.

## Modelkeuze
Standaard Sonnet, net als in het Funda-project. Vier taken zijn in `plan/plan.md` gemarkeerd met `⬆ Opus`: taak 5 (keuken/sanitair), taak 8 zodra er een validatieafwijking is, taak 11 voor het ontwerp van de suggestie-engine, en taak 12 voor het UX-voorstel. Bij taak 11 en 12 alleen het ontwerp — de implementatie gaat daarna terug naar Sonnet.

## Volgende concrete actie
Taak 7: eindtelling. Rubrieken R1 t/m R13 optellen per kamer (kwartpuntsafronding is al per rubriek gebeurd) en dan pas de eindsaldering op hele punten (§2.1.7). Daarna de zorgwoning-opslag (+35% op R1-11, bewust aangehouden uit taak 6), de monumentopslagen (§2.14, met de contractdatum-vertakking bij Rijksmonumenten uit briefing B14) en de huurprijs-lookup inclusief extrapolatie boven 250 punten (briefing B15).
