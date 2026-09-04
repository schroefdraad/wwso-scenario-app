# Status — WWSO Scenario App

Laatst bijgewerkt: 2026-09-04

## Wat werkt
**Fase 0 t/m 3 (taak 1-17) zijn volledig afgerond.** De app draait in productie op Vercel
(`web-skael.vercel.app`, project `skael/web`) met Supabase als backend.

- Monorepo met pnpm workspaces: `apps/web` (Next.js 16, App Router, TS strict), `packages/engine` (pure rekenmotor), `packages/data` (tarieven + kostencatalogus)
- Vitest, ESLint, Prettier op root- en packageniveau — 252/252 tests groen
- Rekenmotor: alle rubrieken R1 t/m R13 geïmplementeerd en **golden-master gevalideerd** tegen 3 officiële Huurprijscheck-exports (Kleiweg 179-B) — exacte match op elke rubriek, eindtotaal en huurprijs. Zie `outputs/RAPPORT_taak8_2026-08-19.md` / `RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`
- Scenariomodel (`packages/engine/src/scenario`): mutaties bovenop de as-is `PandInvoer`, puur en immutable, inclusief een `vervang-pand`-mutatie voor volledig handmatig bewerkte TO-BE-panden (kamer toevoegen/verwijderen, etc.)
- Suggestie-engine (taak 11): marginale analyse per rubriek, ranking op terugverdientijd, plus een los pad voor handmatig bewerkte scenario's met eigen maatregelenlijst. De algoritmische Basis/Comfort/Maximaal-pakketopbouw is verwijderd (Tussenfase-taak A, 2026-09-04, zie hieronder)
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

## Tussenfase — bruikbaarheidsvalidatie (ingevoegd 2026-09-01)
Fase 3 is technisch af, maar Fase 4 (taak 18 e.v.) start pas na een meetbaar exit-criterium: **twee opeenvolgende zelfstandige sessies van Steven Kramer (energielabelverduurzamen.nl) zonder een nieuwe blokkerende melding.** Cosmetische feedback mag opstapelen voor een gebundelde ronde; nice-to-haves worden los gescoopt. Vier tussenfase-taken staan klaar in `plan/plan.md` (geen vaste volgorde): automatische pakketten verwijderen, kitchenette-varianten (122cm/8pt, 240cm/14pt), energielabel-kostenvelden + scenariovergelijking, en een per-maatregel prijsveld in `HandmatigMaatregelen.tsx`. Zie `briefings/BRIEFING_sessie_20260901_deel2.md` voor de volledige onderbouwing.

## Openstaande beslissingen
- **⚠ Auth-toggle staat momenteel OPEN op productie** (`AUTH_VEREIST`/de RLS-toggle uit `supabase/toggle-auth-uit.sql`) — bewust zo gelaten op verzoek van de gebruiker tijdens een testsessie (2026-09-01), en op 2026-09-04 expliciet naar áchteren geschoven: de tussenfase-taken A-D moeten juist door Steven getest worden, dus blijft de toggle open totdat dat testen klaar is. Zolang die aan staat is er geen toegangscontrole op de `deals`-tabel. Pas dicht (`supabase/toggle-auth-aan.sql` + env var weghalen) als er geen actief testen meer gepland is.
- Vrije notities bij een deal/pand (idee van de gebruiker, 2026-09-01) — scope nog te bepalen: los tekstveld of gestructureerd, per deal of scenario, waar zichtbaar.
- Twee vermarkt-modellen (A: software aan zelfstandige eindgebruikers, vraagt multi-tenant; B: instrument in Stevens dienst, mogelijk licentie) — bewust nog niet gekozen. Werkprincipe: bij twijfel bouwen voor wie er nu daadwerkelijk is (Steven/Model B-achtig), niet voor een hypothetische Model-A-toekomst.
- Multi-tenant/gescheiden org_id's — erkende komende taak, geen concrete planning. Trigger: zodra Steven (of een andere professional) een tweede eigen klant wil toevoegen.
- Taxatiefactor (Steven Kramer, 2026-08-28) — voor nu niet relevant volgens Steven, op de plank, geen actie.
- Hoe de kostencatalogus onderhouden wordt zodra er meerdere gebruikers zijn — nu nog een xlsx die handmatig wordt ingelezen; alle 49 maatregelen staan nog op `schatting`. Kitchenette-prijzen komen uit een sheet van Steven, nog te ontvangen.

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

## Sessie 2026-09-01 deel 2 — samenvatting (visie, zie `briefings/BRIEFING_sessie_20260901_deel2.md`)
- Geen code gewijzigd. Tussenfase tussen Fase 3 en Fase 4 vastgesteld met een meetbaar exit-criterium (zie hierboven), en doelgroep scherpgesteld: twee profielen (zelf-verhuurder zoals de gebruiker/Emma; professional-als-dienst zoals Steven), twee vermarkt-modellen bewust nog open.
- Steven Kramer heeft vier openstaande vragen beantwoord, wat leidde tot de vier tussenfase-taken hierboven plus het idee "vrije notities bij een deal" (scope nog te bepalen).
- Tijdens het bijwerken van de briefing kwam er nog een vijfde detail bij: een per-maatregel prijsveld naast het bestaande totaalbedrag-veld (nu Tussenfase-taak D).

## Sessie 2026-09-04 — samenvatting
- Plan/status bijgewerkt op basis van alle briefings (de "Tussenfase"-sectie die `BRIEFING_sessie_20260901_deel2.md` claimde te hebben toegevoegd, stond er in werkelijkheid nog niet in — nu alsnog verwerkt).
- Op verzoek van de gebruiker de auth-toggle-fix naar achteren geschoven: de tussenfase-taken moeten door Steven getest worden, dus blijft de toggle open tot dat testen klaar is.
- Tussenfase-taak A afgerond: automatische Basis/Comfort/Maximaal-pakketten verwijderd uit de suggestie-engine en de scenariovergelijkingspagina.
- Tussenfase-taak C afgerond: energielabel-kostenvelden op het pandgegevens-scherm + een wisselknop per scenariokolom (A+/A++/A+++) op de vergelijkingspagina, nieuwe `ScenarioSlot`-variant `'energielabel'`.
- Tussenfase-taak D afgerond: overschrijfbaar prijsveld per maatregel in `HandmatigMaatregelen.tsx`, naast het bestaande totaalbedrag-veld — maakt zichtbaar welke maatregel een investeringsverschil tussen scenario's veroorzaakt. Zie `plan/plan.md` voor het volledige technische verslag van alle drie taken.
- Tijdens het browsertesten van taak D per ongeluk een testdeal opgeslagen in de gedeelde Supabase-instantie (zie "Bekende restdata" bij taak D in `plan/plan.md`) — de app heeft nog geen "deal verwijderen"-knop, dus bewust laten staan.
- Nieuw idee (2026-09-04, tijdens dit werk): het COROP-gebied-veld op het pandgegevens-scherm is nu een vrije dropdown die de gebruiker zelf moet invullen — kan mogelijk automatisch afgeleid worden uit postcode/gemeente (plaatsnaam alleen is niet betrouwbaar genoeg, NL kent dubbele plaatsnamen in verschillende gemeentes). Nog te onderzoeken welke brondata (CBS-postcode/gemeente-tabel + gemeente/COROP-indeling) daarvoor nodig is — geen van beide staat nu in `packages/data`. Gepland: oppakken na de eerstvolgende deploy.

## Volgende concrete actie
Gedeployed naar productie (2026-09-04, commit `9c49fa4`, `vercel deploy --prod` — `vercel --prod` gaf zelf een "Not authorized"-fout, de CLI's eigen aanbevolen `vercel deploy --prod` werkte wel). Deployment READY, aliassen `web-skael.vercel.app`/`web-six-umber-57.vercel.app` beide bijgewerkt, geen errors in de eerste logs. Eerstvolgende stap: het COROP-automatiseringsidee hierboven oppakken. Taak 18 en de rest van Fase 4 blijven on hold tot het tussenfase-exit-criterium gehaald is (zie hierboven). Van de vier tussenfase-taken resteert alleen nog B (kitchenette-varianten, wacht op Stevens prijzensheet). Standaard Sonnet — geen van de vier Opus-triggers is hier van toepassing.

**Auth-toggle terugzetten is bewust naar áchteren geschoven (2026-09-04)**: de tussenfase-taken moeten door Steven getest worden, en de toggle staat open juist om dat testen niet te hinderen. Pas terugzetten als er geen actief testen meer gepland is — zie "Openstaande beslissingen".
