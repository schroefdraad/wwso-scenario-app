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
- [ ] **Rollentest op test:** nog open: lid, andere organisatie, niet-toegelaten gebruiker. Per rol:
      opslaan, doorrekenen, kopiëren, verwijderen. Emma en Steven inloggen op test.
- [ ] **`ANONIEM`-regel** (`lib/deals/profiel.ts`) aanpassen, samen met de productie-switch. Eerst
      `NEXT_PUBLIC_AUTH_VEREIST` op productie zetten, anders krijgt productie het kopie-probleem.
- [ ] **Eerste echte release via `/release`** — nog niet getest. Pas afvinken na een geslaagde release.

## Vóór de bèta-livegang

Pas als het testen door Steven, Emma en Myle klaar is (of zodra de testomgeving er is).

- [ ] Inloggen op productie aan: `supabase/toggle-auth-aan.sql` + `AUTH_VEREIST` weg op Vercel.
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
- Ná de bèta, vóór publieke lancering: volledige code-audit, security-hardening, AVG-traject.
  PSP pas na de keuze voor een vermarktmodel.
