-- Rollback voor 0006_deals_demo_en_delen.sql. Zet de policies op `deals`/`feedback` letterlijk
-- terug naar de tekst uit 0002_auth_allowlist.sql/0004_feedback.sql, verwijdert de
-- `deel_woning_naar_org`-functie, en trekt de 'delen'-featureflag-pilot in.
--
-- Bewust NIET teruggedraaid: de `deals.is_demo`-kolom/index uit 0006 (stap 1 aldaar). Een kolom
-- laten staan is onschadelijk (hij staat overal op `false`, geen enkele bestaande rij of query
-- verandert van gedrag); een kolom droppen terwijl er misschien al een demo-rij op staat
-- (0007_demo_woning.sql) zou dat werk ongemerkt slopen. Zie rapport §5, "Rollback-overwegingen".
--
-- Gebruik: eerst één keer droog oefenen in een testtransactie (begin; ... rollback;) vóórdat
-- 0006 daadwerkelijk op productie gedraaid wordt — zie plan/plan.md, "Multi-tenant org-scheiding",
-- en het rapport §6, stap 7. Daarna alleen echt uitvoeren als 0006 een probleem blijkt te geven.

-- ---------------------------------------------------------------------------------------------
-- 1. deals-policies terug naar 0002_auth_allowlist.sql, woord voor woord.
-- ---------------------------------------------------------------------------------------------

drop policy if exists "leden_lezen_eigen_org" on deals;
create policy "leden_lezen_eigen_org"
  on deals
  for select
  to authenticated
  using (org_id = huidige_org_id());

drop policy if exists "leden_aanmaken_eigen_org" on deals;
create policy "leden_aanmaken_eigen_org"
  on deals
  for insert
  to authenticated
  with check (org_id = huidige_org_id());

drop policy if exists "leden_bijwerken_eigen_org" on deals;
create policy "leden_bijwerken_eigen_org"
  on deals
  for update
  to authenticated
  using (org_id = huidige_org_id())
  with check (org_id = huidige_org_id());

drop policy if exists "leden_verwijderen_eigen_org" on deals;
create policy "leden_verwijderen_eigen_org"
  on deals
  for delete
  to authenticated
  using (org_id = huidige_org_id());

-- ---------------------------------------------------------------------------------------------
-- 2. feedback-leespolicy terug naar 0004_feedback.sql.
-- ---------------------------------------------------------------------------------------------

drop policy if exists "leden_lezen_eigen_org" on feedback;
create policy "leden_lezen_eigen_org"
  on feedback
  for select
  to authenticated
  using (org_id = huidige_org_id());

-- ---------------------------------------------------------------------------------------------
-- 3. Deel-mechanisme weghalen.
-- ---------------------------------------------------------------------------------------------

drop function if exists deel_woning_naar_org(uuid, uuid);

update allowed_emails
  set features = array(select unnest(features) except select 'delen')
  where 'delen' = any(features);
