-- Multi-tenant org-scheiding, stap 2 van 2 (2026-09-28). Zie
-- `outputs/RAPPORT_multi-tenant-architectuurplan_2026-09-28.md` voor de volledige architectuur.
-- Vereist 0005_orgs_en_gebruikersvlaggen.sql (orgs-tabel, is_eigenaar()/heeft_feature()-functies).
--
-- Handmatig te draaien in de Supabase SQL-editor. Dit is de RISICOVOLLE migratie: hij vervangt de
-- bestaande policies op `deals` en `feedback` (0002/0004). Draai eerst `0006_rollback.sql` droog in
-- een testtransactie zodat je weet dat het vangnet werkt vóórdat je hier begint (zie
-- plan/plan.md, "Multi-tenant org-scheiding", en het testplan in het rapport §6).
--
-- Deze migratie wijkt op twee punten af van de eerste versie van het rapport, na latere
-- gesprekken met de gebruiker:
--   1. Myle (is_eigenaar()) krijgt VOLLEDIG lees- ÉN SCHRIJFRECHT dwars door alle orgs — niet
--      alleen lezen zoals het rapport aanvankelijk adviseerde. Geaccepteerd gevolg: `deals` heeft
--      geen `gewijzigd_door`-kolom, dus een cross-org-wijziging door Myle is niet navolgbaar wie
--      'm deed. Vastgelegd in plan/STATUS.md.
--   2. Delen tussen orgs gebeurt als een EENMALIGE KOPIE (niet een doorlopend gedeeld origineel),
--      en de kopie is na aanmaak een heel gewone, bewerkbare woning van de ontvangende org — geen
--      losse read-only-vlag, geen koppeltabel die moet bijhouden "wie mag dit nog zien". Dat maakt
--      de oorspronkelijk geschetste `deal_shares`-tabel + de bijbehorende recursie-veilige
--      helperfuncties overbodig: in plaats daarvan volstaat één `security definer`-functie
--      (`deel_woning_naar_org`, zie onderaan) die eenmalig een rij kopieert naar een gekozen
--      doel-org. Geen nieuwe tabel, geen nieuwe RLS-laag voor het lezen van andermans woningen.

-- ---------------------------------------------------------------------------------------------
-- 1. deals.is_demo — één permanente voorbeeldwoning, zichtbaar in ELKE org, ook orgs die nog niet
--    bestaan op het moment dat de demo-rij wordt aangemaakt (dat gebeurt pas in
--    0007_demo_woning.sql, ná de app-deploy die het read-only-gedrag afhandelt). Een vlag op de
--    rij zelf i.p.v. een koppeltabel: "zichtbaar voor iedereen" heeft geen ledenlijst nodig, en
--    hoeft nooit bijgewerkt te worden als er een nieuwe org bijkomt.
-- ---------------------------------------------------------------------------------------------

alter table deals add column if not exists is_demo boolean not null default false;
create index if not exists deals_is_demo_idx on deals (is_demo) where is_demo;

-- ---------------------------------------------------------------------------------------------
-- 2. deals-policies vervangen.
--
-- Cross-org-toegang voor Myle: `is_eigenaar()` staat zonder verdere voorwaarde in alle vier de
-- policies — hij mag alles lezen én schrijven, ook de demo-rij, ook andermans org. Voor iedereen
-- ANDERS blijft de normale org-scoping gelden, met een `and not is_demo`-uitzondering op
-- insert/update/delete zodat een gewone gebruiker de demo-rij nooit kan aanraken of zelf een eigen
-- woning tot demo kan verheffen (zie de with-check-toelichting bij insert hieronder).
-- ---------------------------------------------------------------------------------------------

drop policy if exists "leden_lezen_eigen_org" on deals;
create policy "leden_lezen_eigen_org"
  on deals
  for select
  to authenticated
  using (
    org_id = (select huidige_org_id())   -- normale org-scoping, ongewijzigd voor iedereen
    or is_demo                           -- de permanente voorbeeldwoning, zichtbaar voor iedereen
    or (select is_eigenaar())            -- Myle: cross-org, ongeacht is_demo
  );

drop policy if exists "leden_aanmaken_eigen_org" on deals;
create policy "leden_aanmaken_eigen_org"
  on deals
  for insert
  to authenticated
  -- `and not is_demo` is hier GEEN detail voor een gewone gebruiker: zonder deze clausule kan
  -- elke gebruiker zijn eigen woning op is_demo = true zetten en daarmee zijn adres/notities aan
  -- iedere org uitzenden. Myle mag dat via is_eigenaar() wél — hij is degene die de demo-rij
  -- onderhoudt (0007_demo_woning.sql draait als hemzelf).
  with check (
    (org_id = (select huidige_org_id()) and not is_demo)
    or (select is_eigenaar())
  );

drop policy if exists "leden_bijwerken_eigen_org" on deals;
create policy "leden_bijwerken_eigen_org"
  on deals
  for update
  to authenticated
  using (
    (org_id = (select huidige_org_id()) and not is_demo)
    or (select is_eigenaar())
  )
  with check (
    (org_id = (select huidige_org_id()) and not is_demo)
    or (select is_eigenaar())
  );

drop policy if exists "leden_verwijderen_eigen_org" on deals;
create policy "leden_verwijderen_eigen_org"
  on deals
  for delete
  to authenticated
  using (
    (org_id = (select huidige_org_id()) and not is_demo)
    or (select is_eigenaar())
  );

-- ---------------------------------------------------------------------------------------------
-- 3. feedback — Myle mag nu ook feedback van andere orgs lezen (bevestigd door de gebruiker,
--    2026-09-28: consistent met zijn volledige cross-org-toegang op deals hierboven). Dit
--    verbreedt de bestaande, bewuste uitzondering op "geen persoonsgegevens in de MVP"
--    (e-mailadres in feedback, zie 0004_feedback.sql) — de LET-OP-comment aldaar voorzag precies
--    dit moment. Vastgelegd in plan/STATUS.md. Insert-policy blijft ongewijzigd: append-only, elke
--    gebruiker blijft alleen in zijn eigen org feedback aanmaken.
-- ---------------------------------------------------------------------------------------------

drop policy if exists "leden_lezen_eigen_org" on feedback;
create policy "leden_lezen_eigen_org"
  on feedback
  for select
  to authenticated
  using (org_id = (select huidige_org_id()) or (select is_eigenaar()));

-- ---------------------------------------------------------------------------------------------
-- 4. Delen tussen orgs: één eenmalige server-actie i.p.v. een doorlopende toegangslaag.
--
-- `security definer` is hier nodig (niet optioneel): de aanroeper is meestal een gewone
-- gebruiker (geen is_eigenaar()), en de insert-policy hierboven staat een gewone gebruiker niet
-- toe om een org_id te kiezen die niet zijn eigen org_id is. Deze functie draait daarom met de
-- rechten van de functie-eigenaar (voorbij de RLS van de aanroeper) en doet zijn EIGEN, expliciete
-- controles in de functiebody in plaats daarvan — dat is de vertrouwde grens, niet de RLS-policy.
--
-- Bewuste keuzes, alle vier bevestigd door de gebruiker (rapport §7, punt 4/5):
--   (a) doelgroep = een specifieke org, gekozen door de aanroeper;
--   (b)/(c) een KOPIE, geen levende koppeling — de nieuwe rij is na aanmaak een heel gewone,
--       bewerkbare woning van de doelorg (geen "gedeeld"-vlag, geen read-only-status);
--   (d) alleen de bezittende org mag delen — de functie controleert dat de deal in de EIGEN org
--       van de aanroeper staat, niet ergens anders;
--   en: delen zelf zit achter dezelfde featureflag-mechaniek als de Shortlist-brug
--       (sleutel 'delen'), eerst gepilot met Myle en Emma — zie de features-update onderaan.
-- ---------------------------------------------------------------------------------------------

create or replace function deel_woning_naar_org(p_deal_id uuid, p_doel_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nieuwe_id uuid;
begin
  if not heeft_feature('delen') then
    raise exception 'Geen toegang tot delen (featureflag "delen" ontbreekt)';
  end if;

  if not exists (
    select 1 from deals where id = p_deal_id and org_id = huidige_org_id()
  ) then
    raise exception 'Woning niet gevonden, of niet van jouw eigen org';
  end if;

  if not exists (select 1 from orgs where id = p_doel_org_id) then
    raise exception 'Doelorg bestaat niet';
  end if;

  -- notitie/map bewust LEEG in de kopie, zelfde privacy-motief als de demo-woning-kopie in
  -- 0007_demo_woning.sql: de privacy-check van 2026-09-20 vond persoonlijke ordening (voornamen)
  -- in het map-veld, en een rij die naar een andere org verhuist mag zo'n tekstveld niet meenemen.
  insert into deals (
    org_id, naam, pand_invoer, scenarios, notitie, map,
    tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie, is_demo
  )
  select
    p_doel_org_id, naam, pand_invoer, scenarios, '', '',
    tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie, false
  from deals
  where id = p_deal_id
  returning id into v_nieuwe_id;

  return v_nieuwe_id;
end;
$$;

-- Zonder deze grant kan `authenticated` de functie niet aanroepen, ook al is hij security
-- definer — functie-uitvoeringsrechten en de rechten van de functie-body zijn twee aparte dingen.
grant execute on function deel_woning_naar_org(uuid, uuid) to authenticated;

-- Pilot: alleen Myle en Emma kunnen delen totdat de gebruiker besluit dit breder te zetten.
-- Array-concatenatie met een guard i.p.v. gewoon `||`, zodat opnieuw draaien van deze migratie
-- niet per ongeluk 'delen' dubbel in de array zet.
update allowed_emails
  set features = features || array['delen']
  where email in ('myle.hoefdraad@gmail.com', 'emma@morrison-media.nl')
    and not ('delen' = any(features));
