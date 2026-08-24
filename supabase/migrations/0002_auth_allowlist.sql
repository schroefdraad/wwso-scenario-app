-- Taak 17: Auth via magic link, org_id en Row Level Security.
--
-- Handmatig te draaien in de Supabase SQL-editor, zelfde patroon als 0001_create_deals.sql
-- (project heeft nog geen CLI-link/migratiegeschiedenis).
--
-- Ontwerpkeuze: geen `org_members`-tabel die naar `auth.users.id` verwijst (dat zou vereisen dat
-- een gebruiker al minstens één keer is ingelogd voordat je 'm aan een org kan koppelen — dan zou
-- "Emma een user maken" een handmatige Supabase Admin-API-aanroep met de service-role key vergen,
-- die niet vanuit deze sessie beschikbaar is). In plaats daarvan een `allowed_emails`-tabel,
-- gekoppeld op e-mailadres: iemand toevoegen is één SQL-insert, ruim vóórdat diegene ooit
-- inlogt. Inloggen zelf blijft open (iedereen kan een magic link aanvragen) — de daadwerkelijke
-- toegang tot deals wordt pas verleend als het e-mailadres in deze tabel staat, via RLS.
--
-- Iedereen deelt vooralsnog dezelfde org (bevestigd door de gebruiker, 2026-08-24: "in eerste
-- instantie denk ik dat iedereen in dezelfde org zit zodat we een open testomgeving hebben, maar
-- ik wil dit later kunnen herzien"). Gescheiden org_id's per gebruiker later invoeren is dan
-- alleen een kwestie van andere org_id-waarden in deze tabel zetten — het RLS-mechanisme zelf
-- (huidige_org_id()) hoeft niet te veranderen.

create table if not exists allowed_emails (
  email text primary key,
  org_id uuid not null,
  toegevoegd timestamptz not null default now()
);

-- Alle drie de huidige gebruikers op de bestaande placeholder-org (apps/web/src/lib/deals/org.ts)
-- — die org_id blijft dezelfde fysieke waarde, hij is vanaf hier geen placeholder meer maar de
-- eerste (en vooralsnog enige) echte org.
insert into allowed_emails (email, org_id) values
  ('myle.hoefdraad@gmail.com', '00000000-0000-0000-0000-000000000001'),
  ('emma@morrison-media.nl', '00000000-0000-0000-0000-000000000001'),
  ('info@energielabelverduurzamen.nl', '00000000-0000-0000-0000-000000000001')
on conflict (email) do nothing;

alter table allowed_emails enable row level security;

-- Een ingelogde gebruiker mag alleen zijn/haar eigen rij lezen (bijv. om in de UI te tonen bij
-- welke org je hoort) — nooit de volledige allowlist, dat zou e-mailadressen van andere
-- gebruikers lekken.
drop policy if exists "eigen_rij_lezen" on allowed_emails;
create policy "eigen_rij_lezen"
  on allowed_emails
  for select
  to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Geeft de org_id van de ingeleogde gebruiker terug, of NULL als het e-mailadres niet op de
-- allowlist staat (dan matcht geen enkele RLS-policy hieronder — impliciet dus geen toegang).
-- security definer: mag allowed_emails lezen ongeacht de RLS-policy hierboven, anders zou de
-- functie zelf tegen dezelfde beperking aanlopen bij het opzoeken van een ANDER e-mailadres dan
-- het eigen ingelogde adres (wat hier niet gebeurt, maar de functie moet sowieso altijd het volledige
-- antwoord kunnen geven voor het eigen adres).
create or replace function huidige_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select org_id from allowed_emails where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- deals.org_id vult zichzelf voortaan uit de sessie — de client stuurt geen org_id meer mee bij
-- het aanmaken van een deal (zie apps/web/src/lib/deals/opslag.ts).
alter table deals alter column org_id set default huidige_org_id();

-- De tijdelijke, volledig open policy uit taak 15 vervalt — dit was precies het moment waarvoor
-- hij als expliciete, leesbare policy was neergezet (zie 0001_create_deals.sql).
drop policy if exists "tijdelijk_open_tot_taak_17" on deals;

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

-- Geen policy meer voor de `anon`-rol: zonder ingelogde sessie is de tabel nu standaard dicht,
-- in plaats van de "iedereen met de anon-key" blootstelling uit taak 15.
