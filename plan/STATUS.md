# Status — WWSO Scenario App

Laatst bijgewerkt: 2026-09-05

## Wat werkt
**Fase 0 t/m 3 (taak 1-17) zijn volledig afgerond.** De app draait in productie op Vercel
(`web-skael.vercel.app`, project `skael/web`) met Supabase als backend.

- Monorepo met pnpm workspaces: `apps/web` (Next.js 16, App Router, TS strict), `packages/engine` (pure rekenmotor), `packages/data` (tarieven + kostencatalogus)
- Vitest, ESLint, Prettier op root- en packageniveau — 265/265 tests groen (38 testbestanden)
- Rekenmotor: alle rubrieken R1 t/m R13 geïmplementeerd en **golden-master gevalideerd** tegen 3 officiële Huurprijscheck-exports (Kleiweg 179-B) — exacte match op elke rubriek, eindtotaal en huurprijs. Zie `outputs/RAPPORT_taak8_2026-08-19.md` / `RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`
- Scenariomodel (`packages/engine/src/scenario`): mutaties bovenop de as-is `PandInvoer`, puur en immutable, inclusief een `vervang-pand`-mutatie voor volledig handmatig bewerkte TO-BE-panden (kamer toevoegen/verwijderen, etc.)
- Suggestie-engine (taak 11): marginale analyse per rubriek, ranking op terugverdientijd, plus een los pad voor handmatig bewerkte scenario's met eigen maatregelenlijst. De algoritmische Basis/Comfort/Maximaal-pakketopbouw is verwijderd (Tussenfase-taak A, 2026-09-04, zie hieronder)
- Kostencatalogus in `packages/data/src/kostencatalogus`, 49 maatregelen, versie 0.1, **alle bedragen nog op status `schatting`** — wachten op echte offertes/facturen
- Geografie-module in `packages/data/src/geografie` (2026-09-04): gemeente → COROP-gebied (342 gemeentes) en woonplaats → gemeente(n) (~5.400 rijen), leidt het COROP-gebied-veld op het pandgegevens-scherm automatisch af
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
- **Bèta-lancering met drie testers (plan van de gebruiker, 2026-09-04)**: volgorde (1) notities + mappen bouwen ✅ afgerond, (2) multi-tenant/org_id's scheiden, (3) bèta lanceren. Stap 1 is klaar (zie "Wat werkt" en `plan/plan.md`) — eerstvolgende stap is stap 2, multi-tenant. Eigen domein is inmiddels beschikbaar (zie de eigen-SMTP-regel in `plan/plan.md`), dus de mail-rate-limit hoeft geen blokkade meer te zijn bij drie testers.
- Twee vermarkt-modellen (A: software aan zelfstandige eindgebruikers, vraagt multi-tenant; B: instrument in Stevens dienst, mogelijk licentie) — bewust nog niet gekozen. Werkprincipe: bij twijfel bouwen voor wie er nu daadwerkelijk is (Steven/Model B-achtig), niet voor een hypothetische Model-A-toekomst.
- Multi-tenant/gescheiden org_id's — nu de eerstvolgende concrete stap voor de bèta-lancering hierboven (stap 1, notities/mappen, is klaar). Nog te ontwerpen: hoe org_id's precies gescheiden worden voor drie testers (zie `supabase/migrations/0002_auth_allowlist.sql`'s `allowed_emails`-aanpak, die dit al voorzag als "een kwestie van andere org_id-waarden zetten").
- Taxatiefactor (Steven Kramer, 2026-08-28) — voor nu niet relevant volgens Steven, op de plank, geen actie.
- Hoe de kostencatalogus onderhouden wordt zodra er meerdere gebruikers zijn — nu nog een xlsx die handmatig wordt ingelezen; alle 49 maatregelen staan nog op `schatting`. Kitchenette-prijzen komen uit een sheet van Steven, nog te ontvangen.
- **✅ R3 Verwarming-bug gefixt (2026-09-04, versie 0.5.4).** Cross-validatie tegen de officiële Huurcommissie Huurprijscheck (zie `outputs/RAPPORT_huurcommissie-crossvalidatie_2026-09-04.md`) legde bloot dat een kamer met een private kitchenette de verwarmingspunten van die open keuken niet apart meetelde — het beleidsboek §2.3.2 schrijft juist voor dat zo'n open keuken als een tweede verwarmd vertrek gewaardeerd wordt ("Een privé verwarmde woonkamer met open keuken wordt dus gewaardeerd met 4 punten"). Gefixt in `r3-verwarming.ts` + een nieuw `Keuken.verwarmd`-veld (eigen toggle, niet automatisch overgenomen van de kamer) + 4 regressietests + een UX-fix voor het Toiletype-dropdownveld (filtert nu op ruimtetype). R5 keuken-verdeling was een testfout (geen bug). **R11 WOZ-waarde is definitief afgesloten, geen bug bij ons**: zowel de WOZ-invoer als een apart adres-breed "aantal onzelfstandige woonruimtes"-veld (stond al goed op 6) zijn gecontroleerd en correct — de Huurcommissie-tool geeft desondanks structureel 0 punten voor WOZ bij onzelfstandige woonruimte, zonder beleidsmatige grond (§2.11 vereist expliciet 10-14 punten, adres-breed gelijk voor elke kamer op hetzelfde adres). Discrepantie tussen de Huurcommissie-tool en het beleidsboek zelf, niet bij ons — onze 12 punten zijn correct, ook voor de andere 5 kamers. Verder onderzoek vereist contact met de Huurcommissie zelf, buiten scope.
- **Toekomstige uitbreiding: zelfstandige woonruimte (WWS, niet WWSO)** — idee van de gebruiker (2026-09-04): de app zou op termijn ook zelfstandige woningen moeten kunnen doorrekenen, niet alleen onzelfstandige verhuur. Vereist het andere, aparte beleidsboek (WWS-puntensysteem voor zelfstandige woonruimte verschilt inhoudelijk van het huidige WWSO-beleidsboek waar deze hele engine op gebouwd is) — nog niet in huis. Bewust laag geprioriteerd: waarschijnlijk pas na de eerste bèta-release oppakken, niet nu. Puur een aantekening voor later, geen actie vereist.
- **Roadmap-items op verzoek van de gebruiker toegevoegd (2026-09-05): code audit, security, persoonsgegevens/AVG, PSP (betaaldienstverlener).** Fasering bevestigd door de gebruiker (2026-09-05):
  - **Vóór de bèta**: alleen het essentiële beveiligingswerk dat al gepland stond — auth-toggle dicht + RLS aan (zie bovenaan deze lijst) — plus een lichte privacy-check van de vrije-tekstvelden (notitie/map kunnen per ongeluk persoonsgegevens bevatten, en er zijn nu drie bekende, ingelogde testers i.p.v. een anonieme MVP).
  - **Ná de bèta, vóór een publieke/Model-A-lancering**: een volledige code-audit, bredere security-hardening (rate limiting, dependency-scans), en een volledig AVG-traject.
  - **PSP**: pas relevant zodra er daadwerkelijk betaald gaat worden — hangt af van de nog niet gemaakte keuze tussen de twee vermarkt-modellen (zie hierboven). Kan niet eerder starten dan die keuze.

**R6 Sanitair — afgesloten, geen bug.** Ruimte 8 en 13 matchten exact met de Huurcommissie-tool. Ruimte 10's restgat bleek volledig verklaarbaar: een testfixture-fout (verkeerd `toiletType` voor een Badruimte — de engine valideert dit niet tegen `ruimte.type`, overweeg dit als kleine validatie-toevoeging), een eigen testartefact in de Huurcommissie-UI (vastzittende dropdown), en een "bad + aparte douche"-waardering (8 vs 6 pt) die na gericht beleidsboek-onderzoek (geen cap van 7 gevonden, §2.6.1 kent maar 3 categorieën) bevestigd is als de correcte, letterlijke lezing aan onze kant — vermoedelijk een vereenvoudiging in de Huurcommissie-tool zelf. Geen actie vereist vóór de bèta-lancering.

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
- Versienummer + wijzigingslog bijgewerkt naar 0.5.0 (was blijven steken op 0.4.4 — gemist bij de eerste commits van Tussenfase A/C/D, door de gebruiker zelf opgemerkt na de eerste deploy) en opnieuw gedeployed.
- COROP-gebied automatisch afgeleid uit een nieuw "Gemeente"-veld (zelf gesuggereerd op basis van "Stad", altijd handmatig te wijzigen) — nieuwe module `packages/data/src/geografie/` met CBS-brondata (342 gemeentes) en een gevalideerde community-woonplaatsenlijst (~5.400 rijen). Zie `plan/plan.md` voor het volledige verslag inclusief de brondata-verificatie.
- Nieuw plan van de gebruiker voor een bèta-lancering met drie testers: eerst notities + "mappen" bouwen, dan multi-tenant/org_id's scheiden, dan lanceren. De gebruiker heeft inmiddels een eigen domein, wat de eigen-SMTP-blokkade voor magic-link-mails opheft.
- Notities + mappen afgerond en gedeployed: één notitieveld per deal (zichtbaar in het deals-overzicht) en een map voor persoonlijke ordening (hoogstens één per deal, geen relatie met org_id). Vereiste een handmatige Supabase-migratie (`0003_deals_notitie_map.sql`, door de gebruiker zelf gedraaid) en raakte relatief veel bestanden omdat notitie/map exact hetzelfde threading-patroon als `dealNaam` moesten volgen om nooit stilzwijgend verloren te gaan bij navigatie. Zie `plan/plan.md` voor het volledige verslag.

## Volgende concrete actie
Gedeployed naar productie (2026-09-04, versie 0.5.6). Stap 1 van de bèta-lancering (notities +
mappen) is klaar, plus een hele ronde UX-polish en bugfixes bovenop (zie "Sessie 2026-09-04 deel 3"
hieronder). Eerstvolgende stap: stap 2, multi-tenant/org_id's scheiden voor drie testers — nog te
ontwerpen samen met de gebruiker, dit blijft de grootste blokkade voor de bèta zelf. Daarna, of
ondertussen: taak B (kitchenette-varianten — de UI-kant bleek al gebouwd, ontdekt tijdens de R3-fix;
wacht nog op Stevens prijzensheet voor de kostencatalogus-kant). Kleine, losse aanbeveling nog
open: dynamische browsertab-titel per route (zie `docs/nav-proposal.md`, sectie 3) — lage kosten,
nog niet uitgevoerd, wacht op akkoord van de gebruiker. Taak 18 en de rest van Fase 4 blijven on
hold tot het tussenfase-exit-criterium gehaald is (zie hierboven). Standaard Sonnet — geen van de
vier Opus-triggers is hier van toepassing.

**Auth-toggle terugzetten is bewust naar áchteren geschoven (2026-09-04)**: de tussenfase-taken moeten door Steven getest worden, en de toggle staat open juist om dat testen niet te hinderen. Pas terugzetten als er geen actief testen meer gepland is — zie "Openstaande beslissingen".

## Sessie 2026-09-04 deel 3 — samenvatting (Emma's UX-feedback, R3-bugfix, navigatie-audit)
Vervolg op deel 1/2 van dezelfde dag. Vier releases (v0.5.3 t/m v0.5.6), allemaal gecommit,
gepusht en gedeployed naar productie, met tussentijdse tests/typecheck/lint elke keer groen.

- **v0.5.3 — UI-polish op Emma's feedback:** de "18 maatregelen vereisen extra invoer"-hint weg,
  notitieveld naar de pand-invoerpagina zelf (nieuw `NotitieVeld.tsx` + `notitieOntwerp`-state in
  de invoer-reducer, zelfde threading-discipline als eerder bij `dealNaam`), "Deal bijwerken" →
  "Opslaan", "Maatregelen" → "Optimalisaties", datumformaat overal naar DD-MM-JJJJ (nieuwe
  `lib/datum.ts`), de vier controles van het resultaatscherm gehaald (blijven wel in de PDF),
  mappen-veld op de vergelijkingspagina van vrij tekstveld naar dropdown-met-"Nieuwe map…"-optie,
  en een eigen favicon (`resources/images/pictogram.jpeg` → `app/icon.jpg`) i.p.v. de Next.js-
  placeholder. Hamburgermenu-advies gegeven (conclusie: niet doen — te weinig routes) zonder dat
  er om gevraagd was, bleek later relevant voor de navigatie-audit in deel 4 hieronder.
- **Huurcommissie-crossvalidatie (geen releaseversie, wel de aanleiding voor v0.5.4):** op verzoek
  van de gebruiker éénmalig handmatig (niet met een test-harness/agent, dat idee is expliciet
  afgewezen) onze puntentelling naast de officiële Huurcommissie Huurprijscheck gelegd voor Kamer 1
  van de Basrastraat 12-deal. Resultaat: **een bevestigde bug in R3 Verwarming** (§2.3.2: een open
  keuken/kitchenette telt niet dubbel mee voor verwarmingspunten, terwijl het beleidsboek dat wél
  voorschrijft) — de overige verschillen (R5 keuken-verdeling, R6 sanitair, R11 WOZ-waarde) bleken
  stuk voor stuk testfouten of vereenvoudigingen aan de Huurcommissie-kant, geen bugs bij ons. Vier
  losse rondes gebruikt (parallel waar mogelijk), volledig verslag in
  `outputs/RAPPORT_huurcommissie-crossvalidatie_2026-09-04.md`.
- **v0.5.4 — R3-bugfix + toiletype-UX-fix:** nieuw `Keuken.verwarmd`-veld (eigen toggle in de
  Sanitair/Keuken-lade, standaard uit — expliciet geen aanname dat een kitchenette hetzelfde
  verwarmingscircuit deelt als de kamer), 4 regressietests, en het Toiletype-dropdownveld filtert
  nu op ruimtetype (voorkomt de testfixture-inconsistentie die tijdens de crossvalidatie aan het
  licht kwam).
- **Productie-incident, binnen het uur gefixt:** `verwarmd` als verplicht Zod-veld brak het laden
  van élke bestaande deal met een keuken ("Deals ophalen mislukt") — deals van vóór v0.5.4 hebben
  dat veld niet in hun bewaarde JSON. Gefixt met `.default(false)` (de veilige kant: geen aanname
  van dubbele verwarmingspunten voor oude data) + een permanente regressietest
  (`keuken-backcompat.test.ts`). Les: een nieuw verplicht Zod-veld op een al gebruikt, in Supabase
  opgeslagen type is een breaking change, ook als de tests lokaal allemaal slagen — bestaande data
  wordt niet door de testsuite gedekt.
- **v0.5.5 — Gemeente-dropdown filtert op kandidaten:** bij een meerduidige stad (bijv. "Aalst",
  drie gemeentes) toont de dropdown nu alleen die kandidaten in plaats van alle 342 gemeentes —
  idee van de gebruiker tijdens het beleidsboek-natrekken van de R3-bug.
- **v0.5.6 — Navigatie-audit:** eerst een lean versie (geen aparte inventory-/labelling-documenten,
  wel de runtime-wayfinding-checks echt in de browser getest), later op verzoek alsnog de volledige
  opzet nagebouwd in `docs/nav-inventory.md` (routetabel + mermaid-graaf + berekende metrieken) en
  `docs/nav-proposal.md` (bevindingen gerangschikt op impact, kosten per wijziging, expliciet
  conventie-vs-bewijs-onderscheid). Grootste vondst: `/pand/resultaat` had geen `?deal=`-
  ondersteuning (in tegenstelling tot `/pand/vergelijking`) — een verse tab op een gedeelde link
  toonde alleen een kale foutmelding. Gefixt voor de AS-IS-kolom; scenariokolommen blijven bewust
  sessionStorage-only (kosten wegen niet op tegen het smalle gebruikspad). Beide foutschermen linken
  nu ook naar "Mijn deals". Eén aanbeveling nog open, niet uitgevoerd: dynamische browsertab-titel
  per route (nu overal "WWSO Scenario App", geen tab-onderscheid bij meerdere open deals).
- **Terugkerend patroon deze sessie:** de gebruiker plakte twee keer een uitgebreide, aan een
  AI-agent gerichte opdracht (eerst een Huurcommissie-test-harness-opzet, later deze navigatie-
  audit) — beide keren bleek "spar er eerst over" de juiste eerste stap: de harness is nooit
  gebouwd (bewust, "we hebben geen agent nodig, gewoon de test zelf draaien"), de navigatie-audit
  is eerst lean uitgevoerd en pas op expliciet verzoek alsnog volledig uitgewerkt volgens de
  oorspronkelijke opzet.

## Sessie 2026-09-05 — samenvatting (Woning-hernoeming, invoerscherm-rust, dode velden verwijderd)

- **v0.5.9 — Woning/Woningen-hernoeming (Emma's laatste openstaande feedbackpunt):** "Pand"/
  "Deal(s)" overal in UI-teksten én URL's hernoemd naar "Woning"/"Woningen"
  (`/deals`→`/woningen`, `/pand/...`→`/woning/...`), inclusief route-mappen verplaatst met
  `git mv` (deals→woningen lukte, pand→woning moest handmatig via mkdir/cp/rm vanwege een
  "Permission denied" — vermoedelijk de lokale dev-server die de map vastheeft op Windows).
  Interne code-identifiers (variabelen, types, bestandsnamen onder `lib/`, CSS-classes, de
  Supabase-tabel `'deals'`) bewust ongewijzigd gelaten, op expliciet verzoek van de gebruiker.
  Backward-compatible redirects toegevoegd in `next.config.ts` zodat oude gedeelde links
  blijven werken. 265/265 tests groen, tsc/eslint schoon.
- **Roadmap-fasering bevestigd:** code-audit/security/AVG pas ná de bèta (vóór een publieke/
  Model-A-lancering); vóór de bèta alleen het al geplande auth-toggle-dichtzetten + een lichte
  privacy-check van de vrije-tekstvelden. PSP wacht op de nog niet gemaakte keuze tussen de twee
  vermarkt-modellen. Zie "Openstaande beslissingen" hierboven.
- **v0.6.0 — Invoerscherm rustiger + twee dode velden verweerd:** op verzoek van de gebruiker
  ("dit zal de bèta-ervaring aanzienlijk verbeteren"): (1) een expliciete `Toggle` tussen
  WOZ-waarde en taxatiewaarde in `PandFormulier.tsx`, i.p.v. een taxatieveld dat reactief
  verscheen/verdween zodra je in WOZ-waarde typte — bij het wisselen wordt het verborgen veld nu
  ook leeggemaakt, zodat de motor nooit op een onzichtbare stale waarde rekent; (2) een nieuwe
  gedeelde `InfoBadge`-component (`components/InfoBadge.tsx`) die per-veld toelichting achter een
  klein "i"-pictogram verstopt (hover toont 'm via CSS `:hover`/`:focus-within`, klik/tap toggelt
  een losstaande React-state — bewust apart gehouden, anders klapt een klik tijdens het hoveren
  de popover meteen weer dicht) — toegepast in `PandFormulier`, `RuimteLade`, `OverigePosten` en
  `HandmatigMaatregelen`; sectie-brede beschrijvingen (bijv. "Energielabel-kosteninschattingen")
  bewust zichtbaar gelaten, alleen écht per-veld toelichting verplaatst.
- **Twee dode Pand-velden verwijderd na een systematische audit:** op de vraag "welke velden
  worden niet gebruikt voor het doorrekenen" is elk Pand-veld nagelopen tegen alle rubrieken
  (R1-R13) en de eindtelling. `soortWoning` (Eengezins/Meergezins) en `aantalWoningenInComplex`
  bleken volledig dood — ingevuld, opgeslagen, rondgepompt door de state, maar nooit gelezen door
  een berekening of getoond in resultaat/PDF. Bevestigd met de gebruiker dat de "deling door
  aantal wooneenheden" bij R8/R9/R10 (gedeelde ruimten/parkeerplekken) in werkelijkheid uit de
  K1-K12-toewijzingsmatrix komt, niet uit een pand-breed complexveld. Beide velden volledig
  verwijderd (Zod-schema, UI, fixtures) — geen `.strict()` op de Pand-schema, dus bestaande
  opgeslagen deals met deze velden in hun JSON laden gewoon door (Zod negeert onbekende
  properties stil, het omgekeerde risico van het `Keuken.verwarmd`-incident hierboven). 265/265
  tests groen, tsc/eslint schoon. Handmatig geverifieerd in de browser (Playwright via
  claude-in-chrome, lokale dev-server tijdelijk met `AUTH_VEREIST=false`, erna weer normaal
  teruggezet + `.next`-cache gewist na een Turbopack-panic op de oude `/pand/nieuw`-route):
  WOZ/Taxatie-toggle wisselt het veld correct, info-badges tonen/verbergen correct op hover én
  klik, beide verwijderde velden komen nergens meer voor.
