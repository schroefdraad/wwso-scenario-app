-- Multi-tenant org-scheiding, stap 1 van 2 (2026-09-28). Zie
-- `outputs/RAPPORT_multi-tenant-architectuurplan_2026-09-28.md` voor de volledige architectuur en
-- de elf bevestigde deelbeslissingen (rapport §7).
--
-- Handmatig te draaien in de Supabase SQL-editor, zelfde patroon als 0001-0004 (project heeft nog
-- geen CLI-link/migratiegeschiedenis).
--
-- Deze migratie is bewust puur ADDITIEF: geen bestaande policy wordt vervangen, geen bestaande
-- allowed_emails-rij verandert van org. Het risicovolle werk (de policy-vervanging op `deals`/
-- `feedback` voor Myle's cross-org-toegang, de demo-woning en het deel-mechanisme) staat in
-- 0006_deals_demo_en_delen.sql, dat pas ná deze migratie draait en pas ná een app-deploy gevolgd
-- wordt door 0007_demo_woning.sql (zie plan/plan.md, sectie "Multi-tenant org-scheiding").
--
-- VOOR HET DRAAIEN — eenmalige preflight-check (rapport §6, stap 1), resultaat hier vastleggen:
--   select distinct org_id from deals where org_id not in (
--     '00000000-0000-0000-0000-000000000001'
--   );
--   select distinct org_id from feedback where org_id not in (
--     '00000000-0000-0000-0000-000000000001'
--   );
--   select email from allowed_emails where email <> lower(email);
-- Alle drie moeten leeg zijn — dat is op dit moment (2026-09-28) de verwachte uitkomst, want alle
-- deals/feedback-rijen staan nog op de ene bestaande org en de drie bekende e-mailadressen in
-- 0002_auth_allowlist.sql zijn al lowercase. Niet leeg? Eerst oplossen, dan pas verder.

-- ---------------------------------------------------------------------------------------------
-- 1. orgs — org_id was tot nu toe een losse uuid zonder eigen rij (0002_auth_allowlist.sql). Dat
--    volstond zolang er één org was, maar deze migratie moet drie org_id's kunnen "reserveren"
--    vóórdat er een e-mailadres bekend is (nog geen testers aangemeld) — daar is een plek voor
--    nodig om die reservering vast te leggen, anders is een typefout in een latere handmatige
--    allowed_emails-insert een stille fantoom-org (nieuwe tester logt in, ziet een lege app, geen
--    foutmelding waarom). Met een FK op orgs(id) faalt zo'n typefout meteen en luidruchtig.
--
-- RLS op `orgs` zelf staat pas in stap 4 hieronder, want de policy heeft is_eigenaar() nodig
-- (stap 3) — functies en tabellen die ze gebruiken moeten in aanmaakvolgorde staan.
-- ---------------------------------------------------------------------------------------------

create table if not exists orgs (
  -- Bewust GEEN gen_random_uuid()-default: orgs worden met de hand in de SQL-editor aangemaakt en
  -- hun uuid wordt maanden later opnieuw met de hand in een allowed_emails-insert getypt. Een
  -- leesbare, oplopende waarde (…0001, …0011) maakt een typefout zichtbaar; een random uuid niet.
  -- Dit is veilig omdat org_id nooit een geheim of toegangsbewijs is: RLS leidt de org altijd af
  -- uit de JWT-e-mailclaim (huidige_org_id()), nooit uit een door de client aangeleverde waarde.
  id uuid primary key,
  naam text not null,
  aangemaakt timestamptz not null default now()
);

insert into orgs (id, naam) values
  ('00000000-0000-0000-0000-000000000001', 'Puntum kernteam (Myle, Emma, Steven)'),
  ('00000000-0000-0000-0000-000000000002', 'Demo (permanente voorbeeldwoning)'),
  ('00000000-0000-0000-0000-000000000011', 'Bètatester 1'),
  ('00000000-0000-0000-0000-000000000012', 'Bètatester 2'),
  ('00000000-0000-0000-0000-000000000013', 'Bètatester 3')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------------------------
-- 2. allowed_emails uitbreiden: eigenaarsvlag + per-gebruiker featureflags.
--
-- `features text[]` staat bewust op allowed_emails (per gebruiker), NIET op orgs (per org): Myle
-- en Emma delen hun org met Steven, en de Shortlist→Puntum-importbrug mag wél voor Myle/Emma
-- zichtbaar zijn maar niet voor Steven (zie
-- outputs/RAPPORT_brug_workflow_automatisering_2026-09-27.md §7). Een org-kolom zou Steven de
-- brug ook tonen. text[] boven jsonb: de enige bewerking is containment ('import' = any(features)),
-- en de bestaande eigen_rij_lezen-policy maakt de kolom zonder extra werk leesbaar voor de client.
--
-- `is_eigenaar boolean` bewust NIET als feature-string: allowed_emails heeft geen enkele
-- write-policy (clients kunnen dit dus nooit zelf zetten, alleen de SQL-editor), en features/
-- rechten gescheiden houden voorkomt dat een typefout in een featurelijst een privilege-escalatie
-- wordt.
-- ---------------------------------------------------------------------------------------------

alter table allowed_emails add column if not exists is_eigenaar boolean not null default false;
alter table allowed_emails add column if not exists features text[] not null default '{}';

-- Normalisatie-vangnet: huidige_org_id() (0002) vergelijkt met lower(auth.jwt()->>'email'), dus
-- een rij die ooit met een hoofdletter wordt ingevoerd matcht NOOIT — en het symptoom is "nieuwe
-- tester ziet een lege app", niet een foutmelding. Deze check maakt die fout onmogelijk i.p.v.
-- onzichtbaar.
alter table allowed_emails add constraint allowed_emails_email_lowercase check (email = lower(email));

alter table allowed_emails
  add constraint allowed_emails_org_fk foreign key (org_id) references orgs (id) on delete restrict;

update allowed_emails set is_eigenaar = true where email = 'myle.hoefdraad@gmail.com';
update allowed_emails set features = array['import']
  where email in ('myle.hoefdraad@gmail.com', 'emma@morrison-media.nl');

-- ---------------------------------------------------------------------------------------------
-- 3. Helperfuncties, zelfde patroon als huidige_org_id() (0002): stable security definer, zodat
--    ze allowed_emails mogen lezen ongeacht wiens rij het is — dat is precies waarom deze functies
--    bestaan (een gewone gebruiker mag zijn eigen rij lezen, niet elke rij opzoeken).
-- ---------------------------------------------------------------------------------------------

create or replace function is_eigenaar() returns boolean
language sql stable security definer set search_path = public as $$
  -- coalesce naar false, niet NULL: in een USING-clausule gedraagt NULL zich als false, maar zodra
  -- deze functie ooit in een NOT- of AND-combinatie belandt is drievoudige logica een valstrik.
  select coalesce((select is_eigenaar from allowed_emails
                    where email = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
$$;

create or replace function heeft_feature(sleutel text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select sleutel = any(features) from allowed_emails
                    where email = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
$$;

-- ---------------------------------------------------------------------------------------------
-- 4. RLS — nu pas, want beide policies hieronder gebruiken is_eigenaar() uit stap 3.
-- ---------------------------------------------------------------------------------------------

alter table orgs enable row level security;

-- Alleen lezen, geen insert/update/delete-policy: orgs worden in de SQL-editor beheerd, net als
-- allowed_emails. Een gewone gebruiker ziet alleen de eigen org-rij (voor een orglabel in de UI);
-- de eigenaar ziet ze allemaal, nodig voor een cross-org-lijst met een leesbare orgnaam erbij.
drop policy if exists "eigen_org_lezen" on orgs;
create policy "eigen_org_lezen"
  on orgs
  for select
  to authenticated
  using (id = (select huidige_org_id()) or (select is_eigenaar()));

-- Aanvulling op de bestaande eigen_rij_lezen-policy (0002): die dekt is_eigenaar/features al
-- automatisch voor de eigen rij. Deze policy voegt toe dat de eigenaar ALLE rijen mag lezen (nodig
-- voor een cross-org-gebruikersoverzicht) — nooit andersom, een gewone gebruiker blijft beperkt
-- tot zijn eigen rij.
drop policy if exists "eigenaar_leest_alle_rijen" on allowed_emails;
create policy "eigenaar_leest_alle_rijen"
  on allowed_emails
  for select
  to authenticated
  using ((select is_eigenaar()));

-- ---------------------------------------------------------------------------------------------
-- 5. FK's op deals/feedback naar orgs — puur referentiële integriteit, geen policy-wijziging. De
--    policy-vervanging zelf (Myle's cross-org-lees-/schrijftoegang, de demo-woning, het
--    deel-mechanisme) staat in 0006_deals_demo_en_delen.sql.
-- ---------------------------------------------------------------------------------------------

alter table deals
  add constraint deals_org_fk foreign key (org_id) references orgs (id) on delete restrict;
alter table feedback
  add constraint feedback_org_fk foreign key (org_id) references orgs (id) on delete restrict;
