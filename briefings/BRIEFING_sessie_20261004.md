# Sessie 2026-10-04 — werkwijze, testomgeving, hooks, CI, release-skill, tekstreview

## Besluiten
- Werk gaat eerst naar branch `test` (testomgeving, `puntum-test`). Pas naar `master` (productie)
  als het op test werkt. Productie is niet aangeraakt.
- Inloggen staat op de testomgeving nog uit; eerst vrij testen, dan rollen testen, dan productie.
- Master opschonen (dubbele woningen, testwoningen, Kleiweg vanuit golden master) gebeurt later,
  door een agent, en verwijderen in productie pas na lijst, back-up en bevestiging.
- Nieuwe Beleidsboek-verwijzingen als "(Beleidsboek §x)" in zichtbare teksten; "motor" in
  gebruikerstekst vervangen door "berekening".

## Gedaan
- **Testomgeving:** nieuw Supabase-project `puntum-test`, 6 testwoningen gekopieerd uit productie,
  Vercel-branch `test` met vaste URL `web-git-test-skael.vercel.app`, gele TEST-balk, Sentry-omgeving
  en `[TEST]` in feedbackmails. Draaiboek: `supabase/TEST_OPZETTEN.md`.
- **Testers gemaild:** Myle, Emma en Steven met de test-URL en een korte toelichting.
- **Hooks:** Prettier na elke bewerking; typecheck + tests vóór Claude "klaar" meldt.
- **CI:** GitHub Action (typecheck, lint, tests) op elke push en PR. Eerste run geslaagd.
- **Release-skill** `/release`: checklist met twee stopmomenten (akkoord op test, dan productie).
- **Tekstreview** verwerkt op `test`: teksten, Beleidsboek-verwijzingen, verhuurder-criterium naar §2.13.
- **Documentatie:** CLAUDE.md, plan/STATUS.md en plan/plan.md opnieuw opgezet; oude versies in
  `plan/archief/`.

## Openstaand
- Eerste echte release via `/release`, daarna pas naar `master`.
- Master opschonen en Kleiweg 179-B invoeren in de testomgeving.
- Inloggen aanzetten op de testomgeving, en daarna de rollentest.
- Kosten per doellabel: de zin "Leeg = niet haalbaar of niet relevant" is weggehaald; nog te beslissen of hij terugkomt.
- Verhuurder-criterium: of een toegang via het vertrek van een andere huurder ook onder deze aftrek valt, is niet nagekeken.

## Later op de dag: inloggen op test
- Eigen SMTP ingesteld op `puntum-test` (Resend-relay, zelfde als productie).
- Redirect-URL's en Site URL ingesteld voor de testomgeving.
- `supabase/toggle-auth-aan.sql` gedraaid op `puntum-test`; `AUTH_VEREIST` verwijderd uit Preview.
- Testomgeving stuurt nu naar de inlogpagina. Eigenaar (gmail, kernteam) en bètatester (studio-adres)
  ingelogd getest.
- Nog open: rollentest voor de overige rollen, en de `ANONIEM`-regel (samen met de productie-switch).
