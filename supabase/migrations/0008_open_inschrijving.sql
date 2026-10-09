-- 0008: Open inschrijving (besluit eigenaar 2026-10-09, plan B5).
--
-- Handmatig te draaien in de Supabase SQL-editor, eerst op `puntum-test`, pas daarna productie
-- (CLAUDE.md). Rollback: 0008_rollback.sql.
--
-- Tot nu toe kreeg alleen een e-mailadres in `allowed_emails` toegang; die rij en de org werden met
-- de hand aangemaakt (0002, 0005). Wie zonder rij inlogde zag een lege app zonder uitleg. Vanaf nu
-- kan iedereen via de site een account maken (magic link). Deze migratie zorgt dat elk nieuw account
-- meteen een eigen org krijgt, zodat er nooit een "ingelogd maar geen org"-gebruiker ontstaat.
--
-- Wat er verandert:
--   1. allowed_emails.nieuwsbrief_toestemming — moment van toestemming voor nieuwsbrief/marketing
--      (CLAUDE.md regel 8: alleen met vooraf gegeven toestemming). NULL = geen toestemming.
--   2. Trigger op auth.users: nieuw account → eigen org + allowed_emails-rij. Bestaande rijen
--      (uitgenodigde testers, kernteam) blijven ongemoeid. Bestaande accounts zonder rij worden
--      eenmalig aangevuld. Toestemming nieuwsbrief via geef_nieuwsbrief_toestemming(), pas na
--      het klikken op de inloglink.
--   3. ophaal_log + registreer_ophaalactie(): daglimiet per org voor "Gegevens ophalen", zodat een
--      open inschrijving geen onbeperkt doorgeefluik naar PDOK/BAG/WOZ-loket wordt.
--
-- Niet veranderd: alle RLS-policies op deals/feedback/orgs. Een nieuwe org ziet via de bestaande
-- `is_demo`-uitzondering (0006) meteen de voorbeeldwoning.

-- ---------------------------------------------------------------------------------------------
-- 1. Toestemming nieuwsbrief
-- ---------------------------------------------------------------------------------------------

alter table allowed_emails add column if not exists nieuwsbrief_toestemming timestamptz null;

-- ---------------------------------------------------------------------------------------------
-- 2. Eigen org per nieuw account
--
-- Orgs kregen in 0005 bewust een leesbare, met de hand gekozen uuid (…0001, …0011) omdat ze met de
-- hand in een allowed_emails-insert werden overgetypt. Automatisch aangemaakte orgs worden nooit
-- overgetypt, dus die krijgen een gewone random uuid. Handmatige orgs blijven zoals ze zijn.
--
-- De orgnaam bevat bewust geen e-mailadres (CLAUDE.md regel 8: persoonsgegevens zo min mogelijk
-- verspreiden; het adres staat al in allowed_emails).
--
-- security definer: de trigger draait als de rol die de auth-insert doet (supabase_auth_admin), die
-- geen rechten op public.orgs/allowed_emails heeft. Een fout hier laat het aanmaken van het account
-- mislukken — liever een zichtbare fout bij inloggen dan een account zonder org (CLAUDE.md: nooit
-- stilzwijgend).
-- ---------------------------------------------------------------------------------------------

create or replace function public.nieuwe_gebruiker() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(new.email);
  v_org uuid;
begin
  if v_email is null or v_email = '' then
    return new;
  end if;
  -- Uitgenodigd vóór de eerste login (bestaande rij): org blijft zoals hij is.
  if exists (select 1 from allowed_emails where email = v_email) then
    return new;
  end if;
  v_org := gen_random_uuid();
  insert into orgs (id, naam) values (v_org, 'Account ' || left(v_org::text, 8));
  insert into allowed_emails (email, org_id, is_eigenaar, features)
  values (v_email, v_org, false, '{}');
  return new;
end;
$$;

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
create trigger bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function public.nieuwe_gebruiker();

-- Bestaande accounts zonder rij (bijv. aangemaakt tijdens de rollentest van 2026-10-06, of tussen
-- het aanzetten van inschrijven en het draaien van deze migratie) krijgen alsnog een eigen org. De
-- trigger hierboven vuurt alleen bij nieuwe accounts; zonder deze aanvulling blijven zij voorgoed
-- zonder org (lege app), en opnieuw inloggen lost dat niet op (review 2026-10-09).
do $$
declare
  r record;
  v_org uuid;
begin
  for r in
    select distinct lower(u.email) as email
      from auth.users u
     where u.email is not null and u.email <> ''
       and not exists (select 1 from allowed_emails a where a.email = lower(u.email))
  loop
    v_org := gen_random_uuid();
    insert into orgs (id, naam) values (v_org, 'Account ' || left(v_org::text, 8));
    insert into allowed_emails (email, org_id, is_eigenaar, features) values (r.email, v_org, false, '{}');
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2b. Toestemming nieuwsbrief vastleggen — pas NA het klikken op de inloglink
--
-- Niet bij het aanmaken van het account: signInWithOtp maakt de auth.users-rij al aan vóórdat
-- iemand op de link klikt, dus dan kon iedereen voor andermans adres "toestemming" geven (review
-- 2026-10-09). De app roept deze functie aan in /auth/callback, met een geldige sessie, als het
-- vakje was aangevinkt. Werkt zo ook voor bestaande accounts. Een eenmaal gegeven toestemming
-- blijft staan met het oorspronkelijke moment (coalesce); intrekken gaat via de afmeldlink.
-- ---------------------------------------------------------------------------------------------

create or replace function geef_nieuwsbrief_toestemming() returns boolean
language sql volatile security definer set search_path = public as $$
  with bijgewerkt as (
    update allowed_emails
       set nieuwsbrief_toestemming = coalesce(nieuwsbrief_toestemming, now())
     where email = lower(coalesce(auth.jwt() ->> 'email', ''))
    returning 1
  )
  select exists (select 1 from bijgewerkt)
$$;

revoke all on function geef_nieuwsbrief_toestemming() from public, anon;
grant execute on function geef_nieuwsbrief_toestemming() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Daglimiet "Gegevens ophalen" per org
--
-- Geen policies op ophaal_log: niemand leest of schrijft de tabel rechtstreeks. Alleen via
-- registreer_ophaalactie(), die de org uit de sessie haalt (huidige_org_id(), nooit uit de client).
-- Een advisory lock voorkomt dat twee gelijktijdige aanvragen samen over de limiet gaan.
-- Venster: de laatste 24 uur (glijdend), eenvoudiger en eerlijker dan "tot middernacht".
--
-- Uitkomst: 'ok' (geregistreerd, ga door), 'limiet' (org zit aan zijn daglimiet), 'limiet_totaal'
-- (alle accounts samen), 'geen_org' (ingelogd maar geen org — hoort na de trigger en de aanvulling
-- hierboven niet meer voor te komen).
-- ---------------------------------------------------------------------------------------------

create table if not exists ophaal_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs (id) on delete cascade,
  aangemaakt timestamptz not null default now()
);
create index if not exists ophaal_log_org_tijd_idx on ophaal_log (org_id, aangemaakt desc);
alter table ophaal_log enable row level security;

-- Limieten staan hier vast, niet als parameter: anders kiest de aanroeper (elke ingelogde gebruiker
-- kan de functie rechtstreeks aanroepen) zelf de limiet en kan hij de tabel onbeperkt laten groeien
-- (review 2026-10-09). Naast de limiet per org een totaallimiet: met open inschrijving is een eigen
-- org per account goedkoop, dus alleen een limiet per org houdt veel accounts niet tegen.
create or replace function registreer_ophaalactie() returns text
language plpgsql security definer set search_path = public as $$
declare
  c_limiet_org constant int := 50;
  c_limiet_totaal constant int := 1000;
  v_org uuid := huidige_org_id();
  v_aantal int;
begin
  if v_org is null then
    return 'geen_org';
  end if;
  perform pg_advisory_xact_lock(hashtext('ophaal_log'));
  -- Opruimen: alles ouder dan 2 dagen telt nergens meer mee.
  delete from ophaal_log where aangemaakt < now() - interval '2 days';
  select count(*) into v_aantal from ophaal_log where aangemaakt > now() - interval '24 hours';
  if v_aantal >= c_limiet_totaal then
    return 'limiet_totaal';
  end if;
  select count(*) into v_aantal
    from ophaal_log
   where org_id = v_org and aangemaakt > now() - interval '24 hours';
  if v_aantal >= c_limiet_org then
    return 'limiet';
  end if;
  insert into ophaal_log (org_id) values (v_org);
  return 'ok';
end;
$$;

revoke all on function registreer_ophaalactie() from public, anon;
grant execute on function registreer_ophaalactie() to authenticated;

-- Controle na het draaien (verwacht: 1 trigger, 1 kolom, 1 tabel):
--   select tgname from pg_trigger where tgname = 'bij_nieuwe_gebruiker';
--   select column_name from information_schema.columns
--    where table_name = 'allowed_emails' and column_name = 'nieuwsbrief_toestemming';
--   select to_regclass('public.ophaal_log');
