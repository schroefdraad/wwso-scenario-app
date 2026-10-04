# Testomgeving opzetten (Supabase + Vercel)

Draaiboek bij het plan van 2026-10-04. 👤 = doe jij, 🤖 = doet Claude.

## 1. Supabase-testproject

1. 👤 supabase.com → New project → naam `puntum-test`, regio **EU (Frankfurt)**, zelf een
   databasewachtwoord kiezen en bewaren.
2. 👤 Project Settings → API: geef Claude de **Project URL** en de **anon public key**.
   Nooit de `service_role`-key delen.
3. 👤 SQL-editor, in deze volgorde, elk bestand als geheel plakken en draaien:
   1. `migrations/0001_create_deals.sql`
   2. `migrations/0002_auth_allowlist.sql`
   3. `migrations/0003_deals_notitie_map.sql`
   4. `migrations/0004_feedback.sql`
   5. `migrations/0005_orgs_en_gebruikersvlaggen.sql`
   6. `migrations/0006_deals_demo_en_delen.sql`

   **Niet** draaien op test: `0006_rollback.sql` en `0007_demo_woning.sql` (die verwijst naar een
   rij die alleen op productie bestaat). In plaats daarvan:
   7. Testwoningen: volg `seed/export_testwoningen_uit_productie.sql` (stap 1–2 in productie,
      stap 3 in test).
4. 👤 Fase "inloggen uit": `toggle-auth-uit.sql` draaien.
5. 👤 Authentication → URL Configuration:
   - Site URL: de test-URL (zie stap 2.4)
   - Redirect URLs: `https://<test-url>/**` en `http://localhost:3000/**`
6. 👤 Authentication → Emails → SMTP Settings: dezelfde Resend-gegevens als productie
   (host `smtp.resend.com`, poort 465, gebruiker `resend`, wachtwoord = `RESEND_API_KEY`,
   afzender `noreply@puntum.nl`). Pas nodig als inloggen op test aangaat.

## 2. Vercel koppelen aan GitHub

1. 👤 Vercel → project `web` → Settings → Git → Connect Git Repository →
   `schroefdraad/wwso-scenario-app`. Production Branch: `master`.
   Settings → Build and Deployment → Root Directory: `apps/web`.
2. 👤 Settings → Environment Variables (per variabele de omgevingen aanvinken):

   | Variabele | Production | Preview | Development |
   |---|---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | productie (ongewijzigd) | `puntum-test` | `puntum-test` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | productie (ongewijzigd) | `puntum-test` | `puntum-test` |
   | `AUTH_VEREIST` | `false` (voorlopig) | `false` | `false` |
   | `RESEND_API_KEY`, `RESEND_EMAIL_DOMAIN` | ✓ | ✓ | ✓ |

3. 🤖 Branch `test` aanmaken en pushen. Vercel bouwt automatisch.
4. 👤 Settings → Domains → Add `puntum-test.vercel.app` → koppelen aan Git-branch `test`.
   (Bezet? Dan de automatische branch-URL `web-git-test-skael.vercel.app` gebruiken.)
5. 👤 Settings → Deployment Protection → Vercel Authentication **uit**, anders kunnen testers
   zonder Vercel-account de test-URL niet openen.

## 3. Lokaal

```
! vercel link            # koppelt deze map aan project skael/web
! vercel env pull apps/web/.env.local   # haalt de Development-waarden = testdatabase
```

Lokaal ontwikkelen schrijft daarna nooit meer in productie.

## Daarna: werkwijze

- Werk gaat naar branch `test` → testers kijken op de test-URL.
- Goedgekeurd → `test` samenvoegen in `master` → productie deployt automatisch.
- Nieuwe migratie: **eerst op test**, dan pas op productie.
- Geen `vercel --prod` meer met de hand.
