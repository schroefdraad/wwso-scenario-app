# Status — WWSO Scenario App

Laatst bijgewerkt: 2026-09-01

## Wat werkt
**Fase 0 t/m 3 (taak 1-17) zijn volledig afgerond.** De app draait in productie op Vercel
(`web-skael.vercel.app`, project `skael/web`) met Supabase als backend.

- Monorepo met pnpm workspaces: `apps/web` (Next.js 16, App Router, TS strict), `packages/engine` (pure rekenmotor), `packages/data` (tarieven + kostencatalogus)
- Vitest, ESLint, Prettier op root- en packageniveau — 254/254 tests groen
- Rekenmotor: alle rubrieken R1 t/m R13 geïmplementeerd en **golden-master gevalideerd** tegen 3 officiële Huurprijscheck-exports (Kleiweg 179-B) — exacte match op elke rubriek, eindtotaal en huurprijs. Zie `outputs/RAPPORT_taak8_2026-08-19.md` / `RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`
- Scenariomodel (`packages/engine/src/scenario`): mutaties bovenop de as-is `PandInvoer`, puur en immutable, inclusief een `vervang-pand`-mutatie voor volledig handmatig bewerkte TO-BE-panden (kamer toevoegen/verwijderen, etc.)
- Suggestie-engine (taak 11): marginale analyse per rubriek, pakketten Basis/Comfort/Maximaal, ranking op terugverdientijd, plus een los pad voor handmatig bewerkte scenario's met eigen maatregelenlijst
- Kostencatalogus in `packages/data/src/kostencatalogus`, 49 maatregelen, versie 0.1, **alle bedragen nog op status `schatting`** — wachten op echte offertes/facturen
- Volledige applicatie: invoerscherm met kamertoewijzing, resultaatscherm met de vier controles, scenariovergelijking met directe hertelling, opslaan/laden van deals, PDF-export, auth via magic link + org-scoped RLS (taak 17)
- Het beleidsboek WWSO januari 2026 (`resources/beleidsboek/`) blijft de bron van waarheid, niet `wwso.xlsx`. Bij twijfel: beleidsboek → officiële huurprijscheck-site → xlsx
- Git remote toegevoegd (2026-09-01): `origin` → `https://github.com/schroefdraad/wwso-scenario-app` — repo had tot dan alleen lokale commits

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
- De externe gebruiker is `info@energielabelverduurzamen.nl`, samen met Emma Morrison toegevoegd aan `allowed_emails` (taak 17). Voorlopig dezelfde org als de primaire gebruiker ("open testomgeving"), bewust herzienbaar.

## Belangrijkste bevinding tot nu toe
`wwso.xlsx` is een interpretatie van het beleidsboek en wijkt op 15 punten af, waaronder een verschoven rubrieknummering vanaf R7 en een volledig ontbrekende rubriek 7 (woonvoorzieningen voor personen met een handicap). De volledige lijst staat in `briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md`. Bij twijfel geldt: beleidsboek → officiële huurprijscheck-site → xlsx.

## Openstaande beslissingen
- **⚠ Auth-toggle staat momenteel OPEN op productie** (`AUTH_VEREIST`/de RLS-toggle uit `supabase/toggle-auth-uit.sql`) — bewust zo gelaten op verzoek van de gebruiker tijdens een testsessie (2026-09-01). Zolang die aan staat is er geen toegangscontrole op de `deals`-tabel. Moet dicht (`supabase/toggle-auth-aan.sql` + env var weghalen) vóórdat Emma of de externe gebruiker weer test.
- Variantnamen en scope voor de beheerbare maatregelen-library (Kitchenette 1/2/3 vs. Basis/Comfort/Maximaal; pilot op kitchenette vs. meteen generaliseren) — voorstel ligt klaar in `plan.md`, uitgesteld tot een volgend moment.
- Twee losse feedbackpunten van Steven Kramer (2026-08-28) nog niet gescoopt: huurvergelijking per energielabel-scenario naast elkaar, en een zelf in te voeren rendementsfactor die een potentiële taxatiewaarde toont (mogelijk overlap met taak 20).
- Hoe de kostencatalogus onderhouden wordt zodra er meerdere gebruikers zijn — nu nog een xlsx die handmatig wordt ingelezen; alle 49 maatregelen staan nog op `schatting`.

## Aandachtspunten voor een volgende golden-master ronde (geen openstaande beslissing)
- **Eén-staps versus tweestaps m²-afronding bij R1** (bevinding D3, Hoefstraat). De drie Kleiweg-kamers geven bij beide methoden dezelfde uitkomst en onderscheiden ze dus niet. Wacht op een pand dat het verschil wél laat zien.
- **R2 heeft geen empirische dekking**: geen van de drie golden-master-kamers heeft overige ruimten. Een pand met een berging of bijkeuken zou dat moeten bevestigen.
- **D2, eenhandsmengkraan in een privékeuken** (0,75 versus 0,25 op `Slaapkamer 3 + keuken.pdf`).
- Geen van de golden-master-panden raakt monument, parkeren of gehandicaptenvoorzieningen — extra panden voor die rubrieken blijven welkom.

## Modelkeuze
Standaard Sonnet. Vier taken zijn in `plan/plan.md` gemarkeerd met `⬆ Opus` (allemaal afgerond): taak 5 (keuken/sanitair), taak 8 (incl. de R4-beoordeling), taak 11 (ontwerp suggestie-engine), taak 12 (UX-voorstel kamertoewijzing). Sindsdien is alle bugfix- en featurewerk uit de backlog met Sonnet gedaan, zonder dat een taak structureel vastliep — geen aanleiding geweest om verder te escaleren.

## Sessie 2026-09-01 — samenvatting
- Bug gefixt: wastafel/meerpersoonswastafel op een niet-badkamerruimte toonde geen live puntenbadge, waardoor het leek alsof de vijf badkamer-eisen (§2.6.2) verplicht waren — die gaten alleen de "extra"-voorzieningen, nooit de basispunten.
- Bug gefixt: een handmatig toegevoegde kamer aan een scenario ging verloren na "Bekijk volledig resultaat" en terug — `Resultaatscherm` linkte terug zonder `?deal=<id>` (zelfde bugklasse als de Topbar-fix van 2026-08-22). Live gereproduceerd en na de fix herbevestigd op de Kraaiheide 8-deal in productie.
- 22 oude Vercel-deployments opgeruimd (`vercel remove web --safe`) — nog maar 1 actieve deployment (de live productieversie).
- Git had nog geen remote; `origin` toegevoegd en `master` gepusht naar GitHub.
- Twee losse feedbackpunten van Steven Kramer verzameld, één ervan gebundeld met het bestaande maatregelen-library-voorstel.

## Volgende concrete actie
Taak 18 (Fase 4): waarschuwingslaag gemeentelijke regels, start Rotterdam. Standaard Sonnet — geen van de vier Opus-triggers is hier van toepassing.

Vóór taak 18 oppakken eerst de auth-toggle terugzetten als er geen actief testen meer gepland is (zie "Openstaande beslissingen").
