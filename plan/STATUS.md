# Status — WWSO Scenario App

Laatst bijgewerkt: 2026-08-19

## Wat werkt
- Monorepo met pnpm workspaces: `apps/web` (Next.js 16, App Router, TS strict), `packages/engine`, `packages/data` (beide nog leeg)
- Vitest, ESLint, Prettier werken op root- en packageniveau
- Supabase-connectie geverifieerd vanuit `apps/web` (zie `outputs/RAPPORT_taak1_2026-08-19.md`)

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

## Openstaande beslissingen
- UX van de kamertoewijzing (40 ruimten × 12 kamers). Voorstel volgt bij taak 12, vóór het bouwen.
- Hoe om te gaan met verschillen tussen de engine en de officiële site bij taak 8: per verschil bepalen of de xlsx of de engine fout zit.
- Hoe de kostencatalogus onderhouden wordt zodra er meerdere gebruikers zijn — nu nog een xlsx die handmatig wordt ingelezen.

## Modelkeuze
Standaard Sonnet, net als in het Funda-project. Vier taken zijn in `plan/plan.md` gemarkeerd met `⬆ Opus`: taak 5 (keuken/sanitair), taak 8 zodra er een validatieafwijking is, taak 11 voor het ontwerp van de suggestie-engine, en taak 12 voor het UX-voorstel. Bij taak 11 en 12 alleen het ontwerp — de implementatie gaat daarna terug naar Sonnet.

## Volgende concrete actie
Taak 2: datamodel (Pand, Ruimte, kamertoewijzing, handmatige posten) in TypeScript + Zod, op basis van tab `Invoer` van `resources/wwso.xlsx`.
