# Status — WWSO Scenario App (Puntum)

Laatst bijgewerkt: 2026-10-06 · Versie app op productie **v0.7.36** (laatste deploy 3 okt handmatig; v0.7.37 staat op `master` maar is nooit gedeployd) · op `test`: **v0.7.45** (gecontroleerd 2026-10-06; klaar voor de productie-switch) · Historie: `plan/archief/`

## Omgevingen

| | Productie | Test | Lokaal |
|---|---|---|---|
| URL | `web-skael.vercel.app` | `web-git-test-skael.vercel.app` (branch `test`) | `localhost:3000` |
| Supabase | productieproject | `puntum-test` (`phjaooawljkmrweyqroh`) | `puntum-test` |
| Deployen | Git-koppeling sinds 4 okt: push naar `master` = productie (nog niet gebruikt) | automatisch bij push naar `test` | — |
| Inloggen | ⚠ **uit** | **aan** (sinds 2026-10-04, magic link via eigen SMTP); inschrijven uit (2026-10-06) | uit |

Testdata op `puntum-test`: demo-woning + Pettersonstraat 15 + Stevens map (5 woningen), gekopieerd
2026-10-04 via `supabase/seed/export_testwoningen_uit_productie.sql`. Draaiboek:
`supabase/TEST_OPZETTEN.md`.

**Let op:** op productie staat inloggen nog uit (geen toegangscontrole op `deals`). Op test staat
inloggen sinds 2026-10-04 aan. Eigenaar (gmail) en bètatester (studio-adres) zijn ingelogd getest;
het studio-adres hoort bij de org van bètatester 1 en ziet Stevens woningen niet (rol "andere org" ✓).
Nog open: lid en niet-toegelaten gebruiker. Pas daarna productie (besluit 2026-10-04).

## Testteam

| Wie | Rol | Org |
|---|---|---|
| Myle | Eigenaar, bouwt en test | Hoofd-org (eigenaar, cross-org lezen + schrijven) |
| Emma Morrison | Tester (zelf-verhuurder) | Hoofd-org |
| Steven Kramer (energielabelverduurzamen.nl) | Externe tester (professional) | Hoofd-org, zonder `'import'`-feature |
| Myle via `myle@studioskael.com` | Bètatester 1 (test als buitenstaander) | Bètatester 1 (`…0011`) |
| Twee externe bètatesters | Nog uit te nodigen | Bètatester 2 en 3 (`…0012`, `…0013`) |

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
- **Nieuwe gebruikers:** tijdens de bèta alleen op uitnodiging (inschrijven uit, besluit 2026-10-06).
  Hoe nieuwe gebruikers na de bèta binnenkomen: oppakken na de bèta (zie plan.md).
- **Kernteam deelt één org** (besluit 2026-10-06): Emma, Steven en Myle zitten in de hoofd-org en
  kunnen elkaars woningen zien, wijzigen, kopiëren en verwijderen. Bewust zo gelaten voor de bèta.
  Opnieuw bekijken zodra Steven met echte klantpanden werkt: dan eigen org (alleen `org_id` in
  `allowed_emails` + zijn woningen verplaatsen, geen code).
- **Twee UI-punten vóór de eerste productieversie** (besluit 2026-10-06, bewust afwijkend van "feedback
  in rondes"): woningacties optie A (menu ⋯ + bevestigingsvenster) en Opslaan in Scenario bewerken.
- **Switch zonder testronde Steven** (besluit 2026-10-06): zelfde rol als Emma, en die ronde is geslaagd.
- **Teksten na ultra-review** (besluit 2026-10-06): "Vul eerst het aantal kamers in (sectie ①)" staat bij
  Ruimten en Overige posten; tooltip "kies er hoogstens één" bij alternatieven blijft weg.
- **R3 open keuken** (besluit 2026-10-06, engine 0.2.0): telt alleen als vertrek én kitchenette verwarmd
  zijn. Interpretatie van §2.3.2, gelijk aan de Huurprijscheck.
- **Audit rekenmotor** (2026-10-06, engine 0.3.0): te kleine ruimtes en zolders tellen conform
  §2.2.1.2/§2.2.1.3/§2.2.2.2 als overige ruimte of niet, met waarschuwing (besluit eigenaar).
- Taxatiefactor (Steven): op de plank, geen actie.

## Bekende afwijkingen van de officiële Huurprijscheck (geen bug bij ons)

- R11 WOZ: de Huurcommissie-tool geeft 0 punten bij onzelfstandige woonruimte; wij volgen §2.11.
- R6 "bad + aparte douche": wij 8 punten (letterlijke lezing §2.6.1), de tool 6.
