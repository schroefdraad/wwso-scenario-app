# Plan — volgende stappen

Eén regel per punt, details in de gelinkte rapporten. Af = weghalen. Nieuwe vervolgstap? Meteen hier.
Vorige versie (met alle verslagregels brug/steekproeven): `plan/archief/plan_t-m_2026-10-10.md`.

## Nu — route naar de bèta

**A. Testronde**
- [ ] A1 Steven test twee woningen op `test`. Tot dan geen code naar `test` (besluit 2026-10-08).
- [ ] A2 Daarna `wastafel-uitleg`, `gegevens-ophalen` en `open-inschrijving` naar `test` mergen
      (wijzigingslog-conflict 0.7.46/47/48 oplossen), in de browser controleren, `/code-review`.

**B5. Open inschrijving** (branch `open-inschrijving`, plan `~/.claude/plans/vast-swinging-river.md`)
- [x] Code + review (v0.7.48); migratie 0008 + droogtest op `puntum-test`; eigen SMTP op `puntum-test`.
- [ ] Jij: Turnstile-account + widget (`app.puntum.nl`, testdomein, localhost) → site key naar Claude;
      secret pas in Supabase Attack Protection zetten als de code met sleutel op `test` staat.
- [ ] Jij: rate limit "emails sent" ±30/uur op `puntum-test` (en later productie).
- [ ] Jij: aanbieder + KvK en contactadres → Claude zet ze in `apps/web/src/lib/juridisch.ts`;
      teksten privacy/voorwaarden juridisch laten toetsen, dan `CONCEPT: false`.
- [ ] Welkomstblok eerste keer (schets in gesprek 2026-10-09: "Bekijk de voorbeeldwoning" + "Nieuwe
      woning" boven de lijst zolang er geen eigen woning is) — akkoord eigenaar, dan bouwen.
- [ ] "Allow new users to sign up" op `puntum-test` aan zodra de code op `test` staat.
- [ ] Browsertest: nieuw adres → eigen org, demo zichtbaar; vinkje → toestemming; daglimiet.

**B4. Website `puntum.nl`**
- [ ] B4c Mockup https://claude.ai/artifact/2rCMA7SZpg42T2xCuTUDnW (v11): eigenaar kiest stijl A/B en
      lettertype; screenshot vergelijkingstabel van een demopand (Cmd+Shift+4). Daarna `apps/site`
      (branch `site`) bijwerken, keuzeknoppen weg, links naar `app.puntum.nl/privacy` en `/voorwaarden`,
      Vercel-project, DNS (`puntum.nl` nu 308 naar app).
- [ ] B4d Speelbare demo (optie A): voorbeeldpand + 4–6 maatregelen, getallen vooraf berekend met de echte
      motor bij de build. Eerst mockup, dan plan.
- [ ] Teksten uit concurrentieanalyse: risicoverlagers ("geen creditcard"), doelgroepen, tijdsclaim
      (meten bij Steven), oprichters/gezichten, contact. Zie `outputs/CONCURRENTIE_puntentellingonline_2026-10-09.md`.

**C. Productie-switch** (draaiboek `outputs/PLAN_productie_switch_2026-10-06.md`, bijgewerkt voor B5)
- [ ] C0 Vooraf: SMTP (Resend) op productie zoals op test; 0008 + droogtest op productie; Turnstile;
      rate limit; back-up.
- [ ] C1 Merge `test` → `master` via `/release`; footer controleren.
- [ ] C2 Supabase productie: `toggle-auth-aan.sql`, inschrijven **aan**, Site URL `https://app.puntum.nl`.
- [ ] C3 Vercel productie: `AUTH_VEREIST` weg, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` erin.
- [ ] C4 Rooktest per rol + een nieuw adres.

**D. Bèta starten**
- [ ] D1 Site live met "Start direct" (`APP_LIVE=true`), aankondigen.
- [ ] D2 Besluit Supabase Pro / Resend Pro vóór de aankondiging.

## Open, niet blokkerend

- [ ] Verkenning: open-source `woonstadrotterdam/woningwaardering` (MIT, Python, WWS + WWSO) als tweede
      controle van onze motor op Kleiweg 179-B + testpand → rapport in `outputs/`. Tegelijk checken of er
      een Beleidsboek juli 2026 is (wij: januari 2026).
- [ ] Versiestempel: invoerscherm stempelt met nieuwste tarievenset (latent tot 2e set).
      Zie `outputs/RAPPORT_scenario_opslaan_kopieren_2026-10-06.md`.
- [ ] Kleiweg 179-B invoeren vanuit `resources/golden-master/` in de testomgeving.
- [ ] Audit rekenmotor rest: R3-maximum vóór/na deling, hardcoded waarden naar `packages/data`.
- [ ] ZenRows-sleutel vervangen (eigenaar), daarna uit 4 oude scraperbestanden halen
      (o.a. `scripts/Sequential scraper.txt`). Resend-sleutel stond 2026-10-10 in de chat: vervangen
      (`.env.local`, Vercel, Supabase SMTP).

## Scraper (repo `funda-scraper`)

- [ ] Fix 422 + strenger Delft/Leiden-filter staan op `main` (gepusht 2026-10-10, dc5ff71). Jij: workflow
      Delft/Leiden met limit 5 draaien, `config!B5` = `funda_results_delft_leiden.json`, Apps Script opnieuw
      plakken, oude rijen in `new` opruimen. Twijfelgevallen in Drive: `funda_niet_beoordeeld_delft_leiden.json`.
      Workflow-artifact voor dat bestand op lokale branch `workflow-artifact-twijfel`: pushen zodra je token
      de scope `workflow` heeft.
- [ ] Rotterdam: omschrijvingen nog met `js_render=false` zonder retry → keyword-kolommen vaak leeg.
- [ ] Brug S0.6/S0.7: aandachtslijst-hulpmiddel; Cloud Run deployen, script + `puntum_pure` plakken,
      `config!B7`-melding nakijken. Details in het archief-plan en `outputs/ONTWERP_brug_shortlist_puntum_2026-10-08.md`.
- [ ] Brug spoor 0 in Puntum: S0.1 waarschuwingen groeperen, S0.2 skelet-preset, S0.3 knop "Kopieer voor
      Shortlist", S0.4 antwoorddocument. Zie `outputs/RAPPORT_brug_implementatieplan_2026-10-01.md`.

## Later

- [ ] "Niet opgeslagen"-stip per scenario-tabblad; twee tabbladen tegelijk overschrijft stil; vierde scenario.
- [ ] Foutmeldingen bij verwijderen en ophalen in gewone taal.
- [ ] Kostenkentallen met echte cijfers (`schatting` → `offerte`/`bevestigd`).
- [ ] Bulkknoppen "Alles verwarmd/verkoeld" in de browser bevestigen.
- [ ] `/code-review ultra` over de volle codebase; Opus-steekproef domeincorrectheid.

## Na de bèta

1. Gegevens ophalen uitbreiden: EP-online (label + geldigheid, RVO-sleutel) en RCE (monument).
2. PDF per kamer / één kamer.
3. R6: geen extra's bij een douchecabine in een kamer (§2.6.2). Laadpaal R10 deling toetsen.
4. Fase 4: gemeentelijke regels, zittende huurder, rendementscalculator, importscherm Shortlist
   (met `bron_funda_id`-migratie), open punten `wwso.xlsx`. Onderzoek import uit Huurprijscheck-PDF.
5. Fase 5: zelfstandige woonruimte (WWS); woningwaardering-pakket als referentie.
6. Vóór publieke lancering: volledige code-audit, security-hardening, AVG-traject; PSP na keuze vermarktmodel.
7. Concurrentie-quick wins: presets, kant-en-klaar scenario "standaard kamerverhuur", optimalisatieprofiel.
