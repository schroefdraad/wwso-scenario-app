# Plan — volgende stappen

Eén regel per punt, details in de gelinkte rapporten. Af = weghalen (verslag staat in commit en
wijzigingslog). Nieuwe vervolgstap tijdens een sessie? Meteen hier in de juiste groep zetten.
Oud, uitgebreid plan (fase 0–5 met verslagen): `plan/archief/plan_t-m_2026-10-03.md`.

## Route naar de bèta (bijgewerkt 2026-10-06)

Werkwijze: alles eerst naar `test`, pas naar `master` (= productie) als het op test werkt.

**A. Afronden op `test`**
- [ ] A1 Steven test twee woningen op `test` vóór de switch (besluit 2026-10-08, herziet 2026-10-06).
      Tot dan geen codewijzigingen naar `test`, zodat zijn testronde stabiel blijft.
- Rollentest tot nu toe: andere org ✓, lid ✓ (Emma), eigenaar ✓, niet-toegelaten ✓ (melding, geen mail); functies v0.7.38/39 met Emma doorlopen; v0.7.45 (audit, engine 0.3.0) door Myle gecontroleerd (2026-10-08).
- Accounts op `puntum-test`: Myle, studio-adres, Emma, Steven. Nieuwe testers via "Add user → Create new user"
  (Auto Confirm aan) + rij in `allowed_emails`; bovenaan het dashboard het project controleren.

**B. Voorbereiden productie**
- [ ] B1 Plan productie-switch goedgekeurd (2026-10-06, K1a/K2/K3 zoals aanbevolen):
      `outputs/PLAN_productie_switch_2026-10-06.md`. Code `ANONIEM` weg staat op `test` (v0.7.40, nu v0.7.45), gaat
      pas naar `master` op het switch-moment. Productie v0.7.36 verklaard: laatste productie-deploy 3 okt 15:04 (handmatig via CLI); v0.7.37
      kwam later op `master`, vóór de Git-koppeling van 4 okt, en sindsdien is er niet naar `master`
      gepusht. `test` bevat `master` volledig → de switch-merge is een fast-forward.
- [x] B4a `app.puntum.nl` live (2026-10-08): CNAME bij Namecheap, Vercel geverifieerd, HTTPS werkt, toont
      productie v0.7.36. **Niet delen vóór de switch** (inloggen staat daar nog uit).
- [x] B4b `puntum.nl` stuurt door (308) naar `app.puntum.nl` (2026-10-08). Namecheap: A `@` naar Vercel,
      parkeerrecords en `www` weg; Resend-records intact.
- [ ] B4c One-pager `puntum.nl` (investeerders): mockup https://claude.ai/artifact/2rCMA7SZpg42T2xCuTUDnW,
      feedbackronde 1 verwerkt (v7, hoofdknop "Start direct"). Open: screenshot demopand, FAQ prijs
      (hangt aan vermarktmodel). Daarna `apps/site` (branch `site`) bijwerken, Vercel-project, DNS.
- [ ] B4d Speelbare demo op puntum.nl i.p.v. video's: voorbeeldpand + 4–6 maatregelen aan/uit, getallen
      vooraf berekend met de echte motor (JSON bij de build). Eerst mockup. Zie concurrentie-analyse 2026-10-09.
- [ ] B5 Open inschrijving: code op branch `open-inschrijving` (v0.7.48, review verwerkt), plan
      `~/.claude/plans/vast-swinging-river.md`. 0008 + droogtest op `puntum-test` gedraaid en groen (2026-10-09). Open: Turnstile-sleutels,
      aanbieder/KvK + contactadres in `lib/juridisch.ts`, juridische toets, mockup welkomstblok (eerste keer),
      browsertest. Pas naar `test` ná Stevens ronde en ná 0008.

- Back-up productie gemaakt (2026-10-06): CSV-export van `deals`, `allowed_emails`, `orgs`, `feedback`,
  bewaard buiten de repo.

**Audit rekenmotor (2026-10-06):** `outputs/AUDIT_rekenmotor_beleidsboek_2026-10-06.md`
- Opgelost in v0.7.45 / engine 0.3.0: minimummaten + zolder-eisen, R4 gemeenschappelijk vertrek, wastafel 8+.
- [ ] Na de bèta: R3-maximum vóór/na deling toetsen, hardcoded waarden naar `packages/data`.

- [ ] Branch `wastafel-uitleg` (v0.7.46: info-badges wastafel/meerpersoonswastafel) naar `test` mergen ná
      Stevens testronde, kort in de browser controleren, dan mee in de switch-release.

- [ ] Gegevens ophalen (kleine versie: BAG + WOZ, geen sleutel) mee in de bèta als het op tijd af is
      (besluit 2026-10-09). Mockup: https://claude.ai/artifact/NEApd7KXFWv5eL5AmkcjBy — akkoord; wordt
      gebouwd op branch `gegevens-ophalen` (v0.7.47). Bestaande toelichtingen in het formulier blijven ongewijzigd.
      Eigen branch; houdt de switch niet op. Label (EP-online) en monument (RCE) na de bèta.

**C. Productie-switch (één moment, via `/release` — eerste echte release)**
- [ ] C1 Merge `test` → `master` met de `ANONIEM`-wijziging; footer controleren.
- [ ] C2 Supabase productie: `supabase/toggle-auth-aan.sql`, "Allow new users to sign up" uit,
      Site URL + redirect `https://app.puntum.nl/**`.
- [ ] C3 Vercel productie: `AUTH_VEREIST` weg.
- [ ] C4 Rooktest op productie met elke rol (inloggen, opslaan, kopiëren, demo-woning).

**D. Bèta starten**
- [ ] D1 Twee externe testers (studio-adres = bètatester 1, `…0011`): e-mailadressen nodig → account
      + `allowed_emails` in `…0012` en `…0013`.
- [ ] D2 Uitnodiging met link `app.puntum.nl` en korte uitleg (magic link in dezelfde browser openen).

**Open, niet blokkerend voor de bèta**
- [ ] Versiestempel: invoerscherm stempelt met nieuwste tarievenset, vergelijking met opgeslagen
      peildatum (latent tot 2e tarievenset). Zie `outputs/RAPPORT_scenario_opslaan_kopieren_2026-10-06.md`.
- [ ] Kleiweg 179-B invoeren vanuit `resources/golden-master/` in de testomgeving.

## Brug Shortlist → Puntum, spoor 0 (los van de hold)

Details: `outputs/RAPPORT_brug_implementatieplan_2026-10-01.md`.

- [ ] S0.1 Waarschuwingslijst groeperen i.p.v. `.slice(0, 8)` (`Waarschuwingen.tsx`)
- [ ] S0.2 Skelet-preset uitbreiden met gedeelde ruimtes (lege m²)
- [ ] S0.3 Knop "Kopieer voor Shortlist" op het resultaatscherm
- [ ] S0.4 Antwoorddocument naar de scraperkant (`role`/NEN2580-vraag)
- [ ] S0.6 Afwijkingen verkleinen — stap 1/2/4/6 gebouwd in funda-scraper, branch `brug-afwijkingen`
      (lokaal, niet gepusht). Mediaan |verschil| 5,4% → 4,3% (per mandje) → 3,2% (na verklaring, deels
      afgesteld op dezelfde data), n=10. FML als één gratis `.fml`-download (geen dure render meer),
      BAG via PDOK, deuren bekend (21/24 kasten één buurruimte), wél hoogte-info in FML.
      Volgende: validatie op een nieuwe steekproef zonder bijstellen; m² onder 1,50 m uit FML; daarna
      mergen/deployen (akkoord eigenaar). Rapport: funda-scraper `outputs/RAPPORT_afwijkingen_verkleinen_20261008.md`.
      Norm (besluit 2026-10-08): ≥ 80% van de panden ≤ 5% afwijking, én geen afwijking > 10% zonder
      verklaring; steekproeven ≥ 20, overwegend eengezinshuizen. Validatie gedaan (2026-10-08, rapport funda-scraper
      `outputs/RAPPORT_validatie_afwijkingen_20261008.md`): A zonder wijzigingen 65% ≤ 5%; na fix
      dubbeltelling + m² < 1,50 m: eindmeting B (21 nieuwe panden) **76% ≤ 5%** (was 43%), mediaan 3,5%,
      2 onverklaard > 10% → norm nog net niet gehaald. Open: signalen "verdieping leeg getekend" en
      "Funda veel meer bijgebouwen" toetsen op steekproef C; appartementen systematisch 3–7% onder Funda
      (norm of andere toets); RESP001 bij ~70% van de detailcalls. Gemerged naar main en gepusht (2026-10-08, geen deploy).
      Steekproef C (23 nieuwe panden, regels bevroren; rapport funda-scraper
      `outputs/RAPPORT_steekproef_c_20261008.md`): **huizen 87% ≤ 5%, 0 onverklaard → norm gehaald**;
      totaal 78%; appartementen 62% (1 onverklaard, Funda-getal wijkt af van FML én BAG). RESP001: Funda-
      botbescherming, mislukte calls kosten 0 credits; retry + `mode=auto`-fallback → 100% per pand.
      Ronde C gemerged naar main (2026-10-08). Steven doet géén inmetingen. Appartementen: **BAG als
      scheidsrechter** (FML binnen 5% van Funda óf BAG; besluit 2026-10-08). Steekproef D (24 panden,
      13 app.): totaal 79% in orde, appartementen 85% (norm gehaald), huizen 73% (1 onverklaard: onvolledige
      tekening). BAG gaf 5× de doorslag; risico: berging in FML-som kan te kleine woonruimte maskeren.
      Steekproef E (Sonnet; berging uit BAG-toets, `mode=auto` eerst, regels bevroren): **87% in orde, 0
      onverklaard → norm gehaald** (huizen 82%, appartementen 92%); `mode=auto` 25/25 gelukt, ~$0,004/pand.
      Vijf rondes samen (B–E): 79%, schommelt 62–87% → niet stabiel. BAG soms zelf 16–30% onder Funda.
      Branches `brug-steekproef-d`/`-e` lokaal. Advies: alleen als aandachtslijst-hulpmiddel, nooit "goedgekeurd". Fase 8 in het scraperplan gemarkeerd als vervangen door de brug. Scraper: geplande scrape ma/wo/vr
      06:00 UTC via GitHub Actions draait `main`; Cloud Run (`/plattegrond-fml`) wordt handmatig gedeployd. Appartementen: zie hieronder (geen inmetingen
      door Steven).
      ⚠ ZenRows-sleutel staat sinds 2026-08-13 in 4 bestanden van de (privé) scraper-repo: sleutel
      vervangen (eigenaar), daarna uit die bestanden halen.
- [ ] S0.7 Ontwerp stroom Shortlist → Puntum (controleren, exporteren, dubbel-export voorkomen):
      `outputs/ONTWERP_brug_shortlist_puntum_2026-10-08.md` + mockup. Besluiten 2026-10-08: tabblad
      `puntum`; aandacht ook exporteren; eerst importbestand (later evt. directe koppeling, zelfde JSON);
      Funda-ID als veld + migratie. Scraperkant gebouwd, code-review (10 punten) verwerkt,
      gemerged naar main (2026-10-08). Tests: 162 Python + Node groen; niet in echte Apps Script getest.
      Nodig (eigenaar): deploy Cloud Run via Cloud Shell (regio controleren), script + `puntum_pure` plakken,
      `initDashboard`, één pand proberen. Handleiding: funda-scraper `outputs/HANDLEIDING_brug_shortlist_20261008.md`.
      Klusje (2026-10-09) gemerged naar main (review verwerkt): menu-item "Controleer geselecteerde
      rij(en)" en exportdatum pas na het kopiëren (met token tegen verouderde export). Script + `puntum_pure`
      opnieuw plakken door eigenaar. Sheet-grootte gemeten: ~4.000 tekens per export (125 panden ≈ 0,5 MB). Puntum-importscherm bestaat nog niet (Fase 4): export is nu alleen JSON.
      Zie ook: oude melding "parser check nodig (125/125 FOUT 2026-08-24)" in `config!B7` controleren.
      Puntumkant Fase 4 na de bèta.
- [ ] S0.5 Plan bijwerken zodra de bredere steekproef van de scraper binnen is
- Fase A (A1–A5) hoort in het project "Realestate Workflow", niet hier.

## Later (uit review scenario-plan 2026-10-06)

- [ ] "Niet opgeslagen"-stip per scenario-tabblad + waarschuwing bij tabblad sluiten.
- [ ] Twee tabbladen tegelijk: laatste opslag overschrijft stil (`werkDealBij` schrijft de hele rij).
- [ ] Vierde scenario (nu vast op drie).
- [ ] Foutmeldingen bij verwijderen, ophalen en inloggen ook in gewone taal (opslaan is gedaan).

## Gebruikers en data (geen code)

- [ ] Kostenkentallen bijwerken met echte cijfers (`schatting` → `offerte`/`bevestigd`).
- [ ] Bulkknoppen "Alles verwarmd/verkoeld" zelf in de browser bevestigen (automatische test liep
      vast op een omgevingsprobleem).
- Extra golden-master-panden welkom: met berging/bijkeuken (R2), monument, parkeren,
  gehandicaptenvoorzieningen, en één dat de R1-afrondingsmethode onderscheidt.

## Evaluatie (op elk moment)

- [ ] `/code-review ultra` over de volle codebase.
- [ ] Gerichte Opus-steekproef op domeincorrectheid (bijv. suggestie-engine registry).

## Na de tussenfase (on hold)

Start pas na het exit-criterium in `plan/STATUS.md`.

- Fase 4: taak 18 gemeentelijke regels (start Rotterdam), 19 zittende huurder vs. mutatie,
  20 koppeling rendementscalculator, 21 importadapter Shortlist (B1–B6, C1–C2, zie brugrapport),
  23 zeven open punten uit tab Toelichting van `wwso.xlsx`.
- Fase 5: zelfstandige woonruimte (WWS), taak 24–30. Uitwerking in het archief-plan.
- **Nieuwe gebruikers na de bèta** (notitie 2026-10-06): inschrijven staat uit; tijdens de bèta
  nodigt de eigenaar handmatig uit ("Add user → Create new user" (Auto Confirm aan) + rij in `allowed_emails`). Na de bèta kiezen:
  zelf aanmelden met wachtlijst/goedkeuring, een Supabase "before user created"-hook die
  `allowed_emails` controleert, of uitnodigen houden. Hangt samen met de keuze vermarktmodel A/B.
- Backlog (geparkeerd 2026-10-06): R6 extra's bij een douchecabine in een privévertrek. §2.6.2 spreekt
  van een "bad- of doucheruimte"; de app telt extra's mee als de eisen zijn aangevinkt. Toetsen in de
  Huurprijscheck. Tot dan: eisen bij een douchecabine in een kamer niet aanvinken.
- Backlog (geparkeerd 2026-10-06): laadpaal R10 wordt alleen ÷ adressen gedeeld, niet ÷ kamers
  (§2.10.5 letterlijk vs §2.1.5). Toetsen in de Huurprijscheck: 6 kamers, parkeerplek type III met
  laadpaal → 2,75 (huidig) of 1 pt per kamer. Zie audit 2.2.
- **Na de bèta, eerst (besluit 2026-10-09):** 1) gegevens ophalen in Puntum via gratis API's, geen ZenRows:
  PDOK/BAG (bouwjaar, gebruiksoppervlakte) en Kadaster WOZ-loket (code staat al in de scraper), daarna
  EP-online (energielabel + geldigheid, gratis RVO-sleutel nodig) en RCE (rijksmonument, beschermd gezicht);
  gemeentelijk monument blijft handmatig. 2) PDF per kamer / één kamer. 3) R6: geen extra's bij een
  douchecabine in een kamer (§2.6.2 letterlijk; lost backlogpunt op).
- Onderzoek: import uit PDF van de Huurprijscheck (tweede bron voor het importscherm, met automatische
  vergelijking met hun uitkomst = validatieset). Nodig: 2–3 echte PDF's (kamerverhuur). Excel alleen per
  bekend sjabloon, later.
- Concurrentie (2026-10-09): `outputs/CONCURRENTIE_puntentellingonline_2026-10-09.md`. Quick wins na de
  bèta: gegevens ophalen in Puntum (WOZ, gebruiksoppervlakte, label incl. geldigheid, monument); PDF per kamer
  en één kamer; zelf te beheren presets; kant-en-klaar scenario "standaard kamerverhuur". Grotere ideeën: optimalisatieprofiel met regels, badkamer uit kamer met
  m²-aftrek, export voor aannemer. Toetsen: Kleiweg 179-B in hun gratis versie (WOZ-punten). Hun
  optimalisatie is volwassen → keuze vermarktmodel A/B urgenter.
- Ná de bèta, vóór publieke lancering: volledige code-audit, security-hardening, AVG-traject.
  PSP pas na de keuze voor een vermarktmodel.
