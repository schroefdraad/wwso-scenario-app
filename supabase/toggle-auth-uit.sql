-- Tijdelijk auth loskoppelen om sneller te kunnen testen (2026-08-24) — zie plan.md.
-- Draai dit in de Supabase SQL-editor. Tegenhanger: supabase/toggle-auth-aan.sql.
--
-- LET OP: zolang dit actief is, kan iedereen met de publieke anon-key alle deals van alle
-- organisaties lezen én schrijven — bewust, tijdelijk, alleen voor een korte testperiode. Zet dit
-- weer dicht zodra de rate-limit-hinder voorbij is (of eigen SMTP alsnog is opgezet, zie plan.md).
--
-- Hoort samen met de `AUTH_VEREIST=false`-env var op Vercel (apps/web/src/proxy.ts) — die schakelt
-- de login-redirect in de app uit, dit schakelt de bijbehorende blokkade in de database uit. Beide
-- nodig, anders blijft de een of de ander alsnog blokkeren.

-- Permanente verbetering, blijft ook staan na toggle-auth-aan.sql: valt terug op de bekende
-- gedeelde org als er geen ingelogde sessie is (een anon-request heeft geen e-mailclaim, dus
-- huidige_org_id() geeft dan NULL terug) — zodat "Deal opslaan" zonder in te loggen ook een
-- geldige org_id krijgt, i.p.v. een NOT NULL-constraintfout.
alter table deals alter column org_id set default coalesce(huidige_org_id(), '00000000-0000-0000-0000-000000000001'::uuid);

drop policy if exists "tijdelijk_open_voor_testen" on deals;
create policy "tijdelijk_open_voor_testen"
  on deals
  for all
  to anon
  using (true)
  with check (true);
