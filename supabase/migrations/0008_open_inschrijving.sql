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
--      (uitgenodigde testers, kernteam) blijven ongemoeid.
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
  v_toestemming timestamptz := case
    when (new.raw_user_meta_data ->> 'nieuwsbrief') = 'true' then now()
    else null
  end;
  v_org uuid;
begin
  if v_email is null or v_email = '' then
    return new;
  end if;

  -- Uitgenodigd vóór de eerste login (bestaande rij): org blijft, alleen toestemming vastleggen
  -- als die nu gegeven is en nog niet bekend was.
  if exists (select 1 from allowed_emails where email = v_email) then
    if v_toestemming is not null then
      update allowed_emails
         set nieuwsbrief_toestemming = coalesce(nieuwsbrief_toestemming, v_toestemming)
       where email = v_email;
    end if;
    return new;
  end if;

  v_org := gen_random_uuid();
  insert into orgs (id, naam) values (v_org, 'Account ' || left(v_org::text, 8));
  insert into allowed_emails (email, org_id, is_eigenaar, features, nieuwsbrief_toestemming)
  values (v_email, v_org, false, '{}', v_toestemming);
  return new;
end;
$$;

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
create trigger bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function public.nieuwe_gebruiker();

-- ---------------------------------------------------------------------------------------------
-- 3. Daglimiet "Gegevens ophalen" per org
--
-- Geen policies op ophaal_log: niemand leest of schrijft de tabel rechtstreeks. Alleen via
-- registreer_ophaalactie(), die de org uit de sessie haalt (huidige_org_id(), nooit uit de client).
-- Een advisory lock per org voorkomt dat twee gelijktijdige aanvragen samen over de limiet gaan.
-- Venster: de laatste 24 uur (glijdend), eenvoudiger en eerlijker dan "tot middernacht".
--
-- Uitkomst: 'ok' (geregistreerd, ga door), 'limiet' (niet geregistreerd), 'geen_org' (ingelogd
-- maar geen org — hoort na de trigger hierboven niet meer voor te komen).
-- ---------------------------------------------------------------------------------------------

create table if not exists ophaal_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references orgs (id) on delete cascade,
  aangemaakt timestamptz not null default now()
);
create index if not exists ophaal_log_org_tijd_idx on ophaal_log (org_id, aangemaakt desc);
alter table ophaal_log enable row level security;

create or replace function registreer_ophaalactie(p_limiet int) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := huidige_org_id();
  v_aantal int;
begin
  if v_org is null then
    return 'geen_org';
  end if;
  perform pg_advisory_xact_lock(hashtext('ophaal_log:' || v_org::text));
  select count(*) into v_aantal
    from ophaal_log
   where org_id = v_org and aangemaakt > now() - interval '24 hours';
  if v_aantal >= p_limiet then
    return 'limiet';
  end if;
  insert into ophaal_log (org_id) values (v_org);
  return 'ok';
end;
$$;

revoke all on function registreer_ophaalactie(int) from public, anon;
grant execute on function registreer_ophaalactie(int) to authenticated;

-- Controle na het draaien (verwacht: 1 trigger, 1 kolom, 1 tabel):
--   select tgname from pg_trigger where tgname = 'bij_nieuwe_gebruiker';
--   select column_name from information_schema.columns
--    where table_name = 'allowed_emails' and column_name = 'nieuwsbrief_toestemming';
--   select to_regclass('public.ophaal_log');
