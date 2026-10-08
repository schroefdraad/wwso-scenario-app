# Plan — volgende stappen

Eén regel per punt, details in de gelinkte rapporten. Af = weghalen (verslag staat in commit en
wijzigingslog). Nieuwe vervolgstap tijdens een sessie? Meteen hier in de juiste groep zetten.
Oud, uitgebreid plan (fase 0–5 met verslagen): `plan/archief/plan_t-m_2026-10-03.md`.

## Route naar de bèta (bijgewerkt 2026-10-06)

Werkwijze: alles eerst naar `test`, pas naar `master` (= productie) als het op test werkt.

**A. Afronden op `test`**
- A1 Steven: bewust overgeslagen vóór de switch (besluit 2026-10-06); hij test op productie mee.
- Rollentest tot nu toe: andere org ✓, lid ✓ (Emma), eigenaar ✓, niet-toegelaten ✓ (melding, geen mail); functies v0.7.38/39 met Emma doorlopen; v0.7.44 door Myle gecontroleerd, incl. ultra-review-fixes en R3 (2026-10-06).
- [ ] A5 Myle: v0.7.45 (audit, engine 0.3.0) op `test` in de browser controleren: kamer < 4 m² geeft
      waarschuwing en telt als overige ruimte; zolder zonder vaste trap noemt 5 punten aftrek.
- Accounts op `puntum-test`: Myle, studio-adres, Emma, Steven. Nieuwe testers via "Add user → Create new user"
  (Auto Confirm aan) + rij in `allowed_emails`; bovenaan het dashboard het project controleren.

**B. Voorbereiden productie**
- [ ] B1 Plan productie-switch goedgekeurd (2026-10-06, K1a/K2/K3 zoals aanbevolen):
      `outputs/PLAN_productie_switch_2026-10-06.md`. Code `ANONIEM` weg staat op `test` (v0.7.40, nu v0.7.45), gaat
      pas naar `master` op het switch-moment. Productie v0.7.36 verklaard: laatste productie-deploy 3 okt 15:04 (handmatig via CLI); v0.7.37
      kwam later op `master`, vóór de Git-koppeling van 4 okt, en sindsdien is er niet naar `master`
      gepusht. `test` bevat `master` volledig → de switch-merge is een fast-forward.
- [ ] B4 Optioneel nu al: Vercel → Domains `app.puntum.nl` + `puntum.nl` als redirect; DNS bij de
      provider (Resend-records MX/SPF/DKIM niet aanraken). Code heeft geen hard ingestelde domeinen.

- Back-up productie gemaakt (2026-10-06): CSV-export van `deals`, `allowed_emails`, `orgs`, `feedback`,
  bewaard buiten de repo.

**Audit rekenmotor (2026-10-06):** `outputs/AUDIT_rekenmotor_beleidsboek_2026-10-06.md`
- Opgelost in v0.7.45 / engine 0.3.0: minimummaten + zolder-eisen, R4 gemeenschappelijk vertrek, wastafel 8+.
- [ ] Na de bèta: R3-maximum vóór/na deling toetsen, hardcoded waarden naar `packages/data`.

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
- Ná de bèta, vóór publieke lancering: volledige code-audit, security-hardening, AVG-traject.
  PSP pas na de keuze voor een vermarktmodel.
