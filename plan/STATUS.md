# Status — WWSO Scenario App (Puntum)

Laatst bijgewerkt: 2026-10-10 · Productie **v0.7.36** (inloggen uit) · `test`: **v0.7.45** (engine 0.3.0) ·
Historie: `plan/archief/` (laatste sessie: `SESSIE_2026-10-06_t-m_10.md`)

## Omgevingen

| | Productie | Test | Lokaal |
|---|---|---|---|
| URL | `app.puntum.nl` + `web-skael.vercel.app` (nog niet delen) | `web-git-test-skael.vercel.app` | `localhost:3000` |
| Supabase | productieproject | `puntum-test` (`phjaooawljkmrweyqroh`) | `puntum-test` |
| Deployen | push naar `master` = productie (nog niet gebruikt) | automatisch bij push naar `test` | — |
| Inloggen | ⚠ **uit** | aan (magic link) | uit |
| SMTP (Resend) | nog instellen bij de switch | ✓ eigen SMTP, getest 2026-10-10 | — |
| Migratie 0008 | nog niet | ✓ gedraaid + droogtest groen (2026-10-09) | — |

`puntum.nl` stuurt door (308) naar `app.puntum.nl`; de one-pager komt daar later (B4c).

## Branches die wachten (alle lokaal, niet gepusht)

| Branch | Versie | Inhoud | Wacht op |
|---|---|---|---|
| `wastafel-uitleg` | 0.7.46 | info-badges wastafel, R6 toiletruimte (engine 0.4.0) | Stevens ronde |
| `gegevens-ophalen` | 0.7.47 | knop Gegevens ophalen (BAG/WOZ), review verwerkt | Stevens ronde, browsertest |
| `open-inschrijving` | 0.7.48 | bouwt op `gegevens-ophalen`: zelf account maken, eigen org, nieuwsbrief-vinkje, Turnstile, privacy/voorwaarden, daglimiet ophalen, open redirect dicht | zie B5 in plan.md |
| `site` (worktree) | — | one-pager `apps/site`, verouderd t.o.v. de mockup | keuze stijl/lettertype |

Wijzigingslog: bij mergen naar `test` conflicten in `wijzigingslog.ts` (0.7.46/47/48) oplossen.

## Testteam

| Wie | Rol | Org |
|---|---|---|
| Myle | Eigenaar | Hoofd-org (cross-org lezen + schrijven) |
| Emma Morrison | Tester | Hoofd-org |
| Steven Kramer | Externe tester (professional) | Hoofd-org |
| `myle@studioskael.com` | Bètatester 1 | `…0011` |

## Wat werkt

- Fase 0–3: invoer, resultaat met controles, scenariovergelijking met ROI/terugverdientijd, opslaan,
  PDF, magic-link-auth met RLS per org. Rekenmotor golden-master-gevalideerd (Kleiweg 179-B).
- Multi-tenant (0005–0007), demo-woning, mappen/notities, feedbackknop, Sentry, disclaimer.
- Hooks + CI. Tests op `open-inschrijving`: 519 groen; beide lints schoon.

## Lopende besluiten

- **Open inschrijving** (2026-10-09, herziet "alleen op uitnodiging"): iedereen maakt zelf een account
  (magic link), krijgt een eigen org, ziet de demo-woning. E-mail mailbaar; nieuwsbrief alleen met
  niet-aangevinkt vakje, vastgelegd ná klikken op de link. Site: "gratis tijdens de bèta". Captcha
  (Turnstile) vanaf dag één. CLAUDE.md regel 8 aangepast. Resend en Supabase op gratis plan.
- **Switch wacht op Steven** (2026-10-08): geen codewijzigingen naar `test` tot hij twee woningen
  heeft getest. Wachtende branches gaan daarna samen naar `test`.
- **Website:** gericht op investeerders, hoofdknop "Start direct". Feedback: minder Beleidsboek-jargon,
  ROI op de verbouwing i.p.v. "rendement", optimaliseren i.p.v. kiezen, geen Claude-/AI-look.
  Speelbare demo i.p.v. video's: optie A (vooraf berekend met de echte motor).
- **Kernteam deelt één org**; Steven eigen org pas als hij met klantpanden werkt.
- **R3 open keuken** (engine 0.2.0) en **audit rekenmotor** (engine 0.3.0): zie archief.
- **Brug Shortlist → Puntum** (2026-10-08): tabblad `puntum`, importbestand eerst, Funda-ID als veld.

## Open beslissingen

- **Vermarktmodel** A (software voor eindgebruikers) of B (instrument in Stevens dienst). Open
  inschrijving + gratis bèta leunt richting A. Concurrent Puntentellingonline is gratis en volwassen.
- **Supabase Pro / Resend Pro** vóór publieke aankondiging (gratis: pauzeren bij inactiviteit, geen
  back-ups; 100 mails/dag).
- **Beheer kostencatalogus** bij meerdere gebruikers (alle 49 maatregelen nog `schatting`).
- **Beleidsboek juli 2026?** Het open-source pakket woningwaardering noemt een beleidsboek van juli
  2026; wij rekenen met januari 2026. Nog controleren.

## Bekende afwijkingen van de officiële Huurprijscheck (geen bug bij ons)

- R11 WOZ: de Huurcommissie-tool geeft 0 punten bij onzelfstandige woonruimte; wij volgen §2.11.
- R6 "bad + aparte douche": wij 8 punten (letterlijke lezing §2.6.1), de tool 6.
