# Plan — volgende stappen

Eén regel per punt, details in de gelinkte rapporten. Af = weghalen (verslag staat in commit en
wijzigingslog). Nieuwe vervolgstap tijdens een sessie? Meteen hier in de juiste groep zetten.
Oud, uitgebreid plan (fase 0–5 met verslagen): `plan/archief/plan_t-m_2026-10-03.md`.

## Nu — werkwijze op orde (2026-10-04)

- [ ] **Werkwijze: eerst testen, pas daarna naar `master`.** (Tekstreview staat op `test`, nog niet live.) Alles gaat eerst naar branch `test`;
      pushen naar `master` (= productie) pas als het op test werkt.
- [ ] **Master opschonen** — productie-database: dubbele "(kopie)"-woningen en testwoningen
      verwijderen, en Kleiweg 179-B invoeren vanuit `resources/golden-master/` in de testomgeving.
      Uitvoering door een agent. Verwijderen in productie pas na lijst + back-up + jouw bevestiging.
- [x] **Inloggen aan op test** (2026-10-04): eigen SMTP op `puntum-test`, redirect-URL's, SQL
      toggle-aan, `AUTH_VEREIST` weg uit Preview. Eigenaar en bètatester ingelogd getest.
- [ ] **Rollentest op test:** andere organisatie ✓ (studio-adres = org bètatester 1, ziet Stevens woningen niet, 2026-10-06). Lid ✓ (Emma kopieert en wijzigt binnen de hoofd-org, 2026-10-06). Niet-toegelaten gebruiker: ziet niets, maar kreeg een aanmeldmail → opgelost in v0.7.39, opnieuw testen. Emma heeft een account op `puntum-test` en kan inloggen (2026-10-06); Steven: account aanmaken via "Add user → Create new user" (Auto Confirm aan). Let op: in het dashboard bovenaan het project controleren (`puntum-test`, niet productie). Emma heeft ook al een account op productie (per ongeluk aangemaakt, mag blijven). Per rol:
      opslaan, doorrekenen, kopiëren, verwijderen. Emma en Steven inloggen op test.
- [ ] **Scenario kopiëren + opslaan na scenario bewerken** staat op `test` (v0.7.38). Nog in de browser controleren: kopiëren naar leeg en gevuld scenario, "Gebruik als scenario en opslaan", demo-woning (knoppen uit). Daarna naar `master`.
- [ ] Versiestempel: invoerscherm stempelt met nieuwste tarievenset, vergelijking met opgeslagen peildatum (latent tot 2e tarievenset). Zie review in hetzelfde rapport.
- [ ] **`ANONIEM`-regel** (`lib/deals/profiel.ts`) aanpassen, samen met de productie-switch. Eerst
      `NEXT_PUBLIC_AUTH_VEREIST` op productie zetten, anders krijgt productie het kopie-probleem.
- [ ] **Eerste echte release via `/release`** — nog niet getest. Pas afvinken na een geslaagde release.

## Vóór de bèta-livegang

Pas als het testen door Steven, Emma en Myle klaar is (of zodra de testomgeving er is).

- [ ] Inloggen op productie aan: `supabase/toggle-auth-aan.sql` + `AUTH_VEREIST` weg op Vercel.
- [ ] Supabase → Authentication → Sign In / Providers → "Allow new users to sign up" **uit**: op
      `puntum-test` gedaan (2026-10-06), productie nog. Nieuwe testers daarna via "Add user → Create new user" (Auto Confirm aan) + rij in `allowed_emails`.
      (Loginpagina maakt sinds v0.7.39 zelf geen accounts meer aan.)
- [ ] Tijdelijke `ANONIEM`-regel uit `magDealBewerken` halen + regressietests aanpassen.
- [ ] Rollen echt testen: eigenaar, lid, andere org, demo-woning, ingelogd-maar-niet-op-allowlist.
      Per rol: opslaan, doorrekenen, doorklikken, kopiëren, verwijderen.
- [ ] Foutmeldingen nalopen met echte rollen (geen rauwe RLS-fout 42501, "alleen-lezen" uitgelegd).
- [ ] Drie `allowed_emails`-inserts voor de nieuwe testers (wacht op e-mailadressen).
- [ ] Verwijderknop op `/woningen` bevestigen met een echte ingelogde sessie.

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
- Ná de bèta, vóór publieke lancering: volledige code-audit, security-hardening, AVG-traject.
  PSP pas na de keuze voor een vermarktmodel.
