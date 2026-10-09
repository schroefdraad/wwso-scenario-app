# Plan B1 — productie-switch (inloggen aan op productie)

Status: **plan, wacht op goedkeuring.** Opgesteld 2026-10-06. Geen code gewijzigd.

## Doel

Productie (`web-skael.vercel.app`, straks `app.puntum.nl`) krijgt dezelfde stand als `test`:
inloggen verplicht, inschrijven uit, RLS per org, en de tijdelijke `ANONIEM`-regel weg.

## Huidige stand (gecontroleerd 2026-10-06)

| | Productie | Test |
|---|---|---|
| App-versie live | **v0.7.36** (footer via curl). STATUS zei v0.7.37: klopt niet | v0.7.39 |
| `master` vs `test` | `master` bevat v0.7.37 maar staat niet live; `test` is 24 commits verder | — |
| `AUTH_VEREIST` (Vercel) | `false` → proxy laat iedereen door | weg → login verplicht |
| SQL `tijdelijk_open_voor_testen` (anon mag alles op `deals`) | **actief** | weg (`toggle-auth-aan.sql` gedraaid) |
| Inschrijven (Supabase) | aan | uit |
| Accounts | Emma (per ongeluk aangemaakt) | Myle, studio, Emma, Steven |

**Bevinding 1:** productie loopt niet automatisch mee met `master` (v0.7.37 staat op `master`, niet
live). Dus óf de Git-koppeling van Vercel is er niet, óf de laatste deploy van `master` is mislukt.
Moet vóór de switch duidelijk zijn, anders weten we niet wat er live gaat.

**Bevinding 2:** `toggle-auth-uit.sql` zette de default van `deals.org_id` op
`coalesce(huidige_org_id(), hoofd-org)`. Dat blijft na `toggle-auth-aan.sql` staan. Onschadelijk,
want de RLS-insertregel eist `org_id = huidige_org_id()`; een gebruiker zonder org kan dus niets
aanmaken. Wel verwarrend. Voorstel: na de bèta-start terugzetten naar `huidige_org_id()` (aparte
migratie, eerst op `puntum-test`). Niet blokkerend.

## Codewijziging: `ANONIEM` weg

Waar: `lib/deals/types.ts` (`ANONIEM`, `isAnoniem`, regel in `magDealBewerken`, type `Toegang`),
`lib/deals/profiel.ts` (geen sessie → `ANONIEM`), tests in `types.test.ts`.

Wat er gebeurt met inloggen aan maar zonder sessie in de browser (bijv. sessie verlopen terwijl
de pagina open stond): nu levert dat `ANONIEM` → "mag bewerken" → opslaan → RLS weigert.

**Keuze K1 — wat betekent "geen sessie" na de switch?**
- (a) **Aanbevolen:** `haalEigenProfielOp` gooit een fout "Je sessie is verlopen" → bestaande
  route `bewerkrechtenOnzeker` → opslaan geblokkeerd met uitleg "ververs de pagina / log opnieuw
  in". Past bij de regel "bij onzekere rechten blokkeren". Geen stille kopie.
- (b) Geen sessie = `null` (geen rechten) → woning alleen-lezen → "Opslaan" probeert een kopie →
  RLS weigert → melding. Werkt, maar verwarrend (er wordt een kopie beloofd).

Tests (eerst falend): geen sessie → onzeker (K1a); de drie `ANONIEM`-tests vervangen door een
regressietest "incident 2026-10-03: zonder inlog alleen-lezen" die nu vastlegt dat inloggen
verplicht is en geen sessie nooit bewerkrechten geeft.

**Volgorde-eis:** deze code mag pas live als inloggen op productie aan staat. Live vóór de switch
= elke anonieme "Opslaan" op productie wordt geblokkeerd (testers kunnen niet meer werken).
Daarom gaat de code in dezelfde release als de switch, niet eerder.

## Volgorde op de dag van de switch

**Vooraf (kan dagen eerder)**
1. Bevinding 1 oplossen: in Vercel → Settings → Git controleren of `master` de Production Branch is
   en of de laatste productie-deploy van `master` gelukt is. 👤 (Claude kan meekijken met
   `vercel` CLI als die gekoppeld is.)
2. Accounts op productie: Myle gmail, studio-adres, Steven via "Add user → Create new user" (Auto
   Confirm aan); Emma bestaat al. `allowed_emails` op productie controleren (zelfde 4 rijen,
   studio-adres in de org van bètatester 1). 👤
3. SMTP op productie controleren (Resend, `noreply@puntum.nl`): stuur een magic link naar jezelf
   terwijl inloggen nog uit staat — mag, want je account bestaat. 👤
4. Optioneel `app.puntum.nl` in Vercel + DNS (B4). 👤
5. Back-up productie-database (Supabase → Database → Backups, of `pg_dump` via SQL-export). 👤
6. Code `ANONIEM` weg op `test` (🤖), testen op `test`, dan klaar om te mergen.
7. Testers laten weten: op dag X ±15 minuten niet werken, daarna inloggen met magic link.
8. **Open inschrijving (B5, besluit 2026-10-09):** migratie `0008_open_inschrijving.sql` eerst op
   `puntum-test` + `supabase/onderhoud/0008_droogtest.sql` (alle kolommen true), dan op productie. 👤
   Daarna pas code met de daglimiet naar een omgeving: zonder 0008 weigert Gegevens ophalen (fail closed).
9. Cloudflare Turnstile: widget voor `app.puntum.nl` (+ testdomein), secret in Supabase → Attack
   Protection (per project), site key als `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel. Zonder sleutel
   staat de captcha in de app uit. 👤
10. Supabase → Authentication → Rate limits: "emails sent" bewust op ±30 per uur (Resend gratis:
    100/dag). 👤
11. Gegevens in `apps/web/src/lib/juridisch.ts`: aanbieder + KvK en contactadres; na juridische
    toetsing `CONCEPT: false`. 🤖 na aanlevering 👤

**Switch (± 15 minuten, in deze volgorde)**
1. Supabase productie → Authentication → URL Configuration: Site URL + redirect-URL's
   (`https://app.puntum.nl/**` en/of `https://web-skael.vercel.app/**`). 👤
2. Supabase productie → "Allow new users to sign up" **aan** (open inschrijving, B5, herziet "uit"). 👤
3. Vercel → Environment Variables → `AUTH_VEREIST` weg uit **Production**. 👤
4. Supabase productie → SQL Editor → `supabase/toggle-auth-aan.sql`. 👤
   (Vanaf hier kan de oude, anonieme versie niets meer opslaan — kort.)
5. `test` → `master` mergen via `/release` (🤖), versie v0.7.40, wijzigingslog. Push = deploy.
6. Footer controleren: v0.7.40 live. 🤖 (curl) + 👤 (browser)
7. Rooktest productie: inloggen als Myle (eigenaar), Emma (lid), studio-adres (andere org) en een
   een **nieuw** adres (account + eigen org, ziet alleen de demo-woning, kan eigen woning opslaan).
   Per rol: woning openen, opslaan, kopiëren, demo-woning. 👤
8. STATUS bijwerken: productie inloggen aan. 🤖

## Terugvalplan

Gaat er iets mis waardoor testers niet kunnen werken:
- **Snel (geen deploy):** `AUTH_VEREIST=false` terug op Vercel Production + redeploy, en
  `toggle-auth-uit.sql` op productie. Let op: met de nieuwe code (zonder `ANONIEM`) worden anonieme
  gebruikers dan alleen-lezen/geblokkeerd. Daarom ook:
- **Code terug:** in Vercel → Deployments de vorige productie-deploy "Promote to Production"
  (instant rollback), of `git revert` van de merge op `master`.
- Data: de back-up uit stap 5. Verwacht niet nodig: de switch wijzigt geen data, alleen rechten.

## Open keuzes

- **K1** geen sessie: (a) onzeker/geblokkeerd — aanbevolen; (b) alleen-lezen.
- **K2** wanneer: zelfde dag als B2 (opschonen) of los? Aanbevolen: opschonen eerst, aparte dag,
  zodat een probleem bij de switch niet samenvalt met verwijderde data.
- **K3** domein: switch direct op `app.puntum.nl`, of eerst op `web-skael.vercel.app` en het domein
  later? Aanbevolen: direct, als B4 vooraf klaar en getest is; anders eerst zonder domein.

## Niet in deze klus

- `org_id`-default terugzetten (bevinding 2) — na de bèta-start, eigen migratie.
- Steven eigen org — besluit 2026-10-06: zo laten.
