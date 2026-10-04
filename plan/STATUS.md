# Status — WWSO Scenario App (Puntum)

Laatst bijgewerkt: 2026-10-04 · Versie app op productie **v0.7.37** · op `test`: tekstreview (niet gereleased) · Historie: `plan/archief/`

## Omgevingen

| | Productie | Test | Lokaal |
|---|---|---|---|
| URL | `web-skael.vercel.app` | `web-git-test-skael.vercel.app` (branch `test`) | `localhost:3000` |
| Supabase | productieproject | `puntum-test` (`phjaooawljkmrweyqroh`) | `puntum-test` |
| Deployen | nog handmatig (`vercel --prod`); straks merge naar `master` | automatisch bij push naar `test` | — |
| Inloggen | ⚠ **uit** | **aan** (sinds 2026-10-04, magic link via eigen SMTP) | uit |

Testdata op `puntum-test`: demo-woning + Pettersonstraat 15 + Stevens map (5 woningen), gekopieerd
2026-10-04 via `supabase/seed/export_testwoningen_uit_productie.sql`. Draaiboek:
`supabase/TEST_OPZETTEN.md`.

**Let op:** op productie staat inloggen nog uit (geen toegangscontrole op `deals`). Op test staat
inloggen sinds 2026-10-04 aan. Eigenaar (gmail) en bètatester (studio-adres) zijn ingelogd getest;
de rest van de rollentest volgt. Pas daarna productie (besluit 2026-10-04).

## Testteam

| Wie | Rol | Org |
|---|---|---|
| Myle | Eigenaar, bouwt en test | Hoofd-org (eigenaar, cross-org lezen + schrijven) |
| Emma Morrison | Tester (zelf-verhuurder) | Hoofd-org |
| Steven Kramer (energielabelverduurzamen.nl) | Externe tester (professional) | Hoofd-org, zonder `'import'`-feature |
| Drie nieuwe bètatesters | Nog uit te nodigen | Drie gereserveerde lege orgs |

## Wat werkt

- Fase 0 t/m 3 (taak 1–17) af: invoer met kamertoewijzing, resultaat met de vier controles,
  scenariovergelijking, opslaan/laden, PDF-export, magic-link-auth met RLS per org.
- Rekenmotor R1–R13 golden-master-gevalideerd (Kleiweg 179-B, exacte match).
- Multi-tenant (migraties 0005–0007), demo-woning, notities + mappen, feedbackknop, Sentry,
  disclaimer, custom SMTP via Resend (`puntum.nl`).
- Staat-navigatie-audit afgerond (v0.7.24–v0.7.33): regressietests voor alle 8 bekende incidenten.
- Testomgeving (`test`-branch + `puntum-test`), gele TEST-balk, `[TEST]` in feedbackmails.
- Hooks (Prettier na bewerken, typecheck + tests vóór "klaar") en CI (`.github/workflows/ci.yml`).
- Release-skill `/release` (`.claude/skills/release/`): nog niet op een echte release getest.
- Tekstreview van Puntum verwerkt op `test`: teksten, Beleidsboek-verwijzingen, verhuurder-criterium naar §2.13.
- 321 tests groen.

## Fase

**Tussenfase — bruikbaarheidsvalidatie.** Fase 4 start pas na twee opeenvolgende zelfstandige
sessies van Steven zonder nieuwe blokkerende melding. Nog niet gehaald.

## Open beslissingen

- **Vermarktmodel** A (software aan zelfstandige eindgebruikers) of B (instrument in Stevens dienst):
  bewust nog niet gekozen. Bij twijfel bouwen voor wie er nu is.
- **Beheer kostencatalogus** bij meerdere gebruikers: git-JSON (nu) of database met beheerscherm.
  Pas ontwerpen na de bèta-livegang. Alle 49 maatregelen staan nog op `schatting`.
- **Tekstmelding "Vul eerst het aantal kamers in"** bij Ruimten en Overige posten: blijft staan of
  aanpassen? (vraag uit de tekstreview van 2026-10-03)
- Taxatiefactor (Steven): op de plank, geen actie.

## Bekende afwijkingen van de officiële Huurprijscheck (geen bug bij ons)

- R11 WOZ: de Huurcommissie-tool geeft 0 punten bij onzelfstandige woonruimte; wij volgen §2.11.
- R6 "bad + aparte douche": wij 8 punten (letterlijke lezing §2.6.1), de tool 6.
