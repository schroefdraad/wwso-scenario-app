# Status — WWSO Scenario App (Puntum)

Laatst bijgewerkt: 2026-10-04 · Versie app **v0.7.37** · Historie: `plan/archief/`

## Omgevingen

| | Productie | Test |
|---|---|---|
| App | `web-skael.vercel.app` (Vercel `skael/web`) | **Bestaat nog niet** (zie plan.md, "Nu") |
| Database | Eén Supabase-project, gedeeld door iedereen | — |
| Deployen | Handmatig: `vercel --prod` | — |
| Inloggen | ⚠ **Uit** (`AUTH_VEREIST=false` + `toggle-auth-uit.sql`) | — |

**Let op:** zolang inloggen op productie uit staat, is er geen toegangscontrole op `deals` en
gelden testers als anoniem (tijdelijke `ANONIEM`-regel in `magDealBewerken`). Bewust zo gelaten tot
het testen door Steven klaar is (besluit 2026-09-01, bevestigd 2026-09-04 en 2026-09-30).
Testdata en echte data staan in dezelfde database.

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
- 282+ tests (laatst geteld 2026-10-02; sindsdien regressietests van de audit erbij).

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
