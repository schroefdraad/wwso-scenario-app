-- Droogtest voor 0008_open_inschrijving.sql — draai NA 0008, op `puntum-test`, in de SQL-editor.
-- Alles staat in één transactie die eindigt met ROLLBACK: er blijft niets achter.
-- Verwacht resultaat: de laatste select geeft één rij met alle kolommen = true.

begin;

-- Twee nieuwe accounts (hoofdletters in het tweede adres: moet klein worden opgeslagen).
insert into auth.users (id, email, raw_user_meta_data)
values
  (gen_random_uuid(), 'droogtest-a@puntum.invalid', '{}'::jsonb),
  (gen_random_uuid(), 'Droogtest-B@puntum.invalid', '{"nieuwsbrief": true}'::jsonb);

create temp table droog (sleutel text, waarde text) on commit drop;

-- Doe alsof droogtest-b ingelogd is (auth.jwt() leest deze instelling) en geeft toestemming.
select set_config('request.jwt.claims', '{"email": "droogtest-b@puntum.invalid"}', true);
insert into droog select 'toestemming_b', geef_nieuwsbrief_toestemming()::text;

-- Daglimiet voor droogtest-a: eerste aanvraag ok; na 50 aanvragen in 24 uur 'limiet'.
select set_config('request.jwt.claims', '{"email": "droogtest-a@puntum.invalid"}', true);
insert into droog select 'eerste', registreer_ophaalactie();
insert into ophaal_log (org_id)
  select (select org_id from allowed_emails where email = 'droogtest-a@puntum.invalid')
    from generate_series(1, 49);
insert into droog select 'eenenvijftigste', registreer_ophaalactie();

select
  (select count(*) = 1 from allowed_emails a join orgs o on o.id = a.org_id
     where a.email = 'droogtest-a@puntum.invalid'
       and a.nieuwsbrief_toestemming is null          -- metadata bij aanmelden telt niet als toestemming
       and a.is_eigenaar = false
       and o.naam like 'Account %')                                    as nieuw_account_eigen_org,
  (select count(*) = 1 from allowed_emails
     where email = 'droogtest-b@puntum.invalid'
       and nieuwsbrief_toestemming is not null)                         as toestemming_na_inloggen,
  (select count(distinct org_id) = 2 from allowed_emails
     where email like 'droogtest-%@puntum.invalid')                     as eigen_org_per_account,
  (select waarde = 'ok' from droog where sleutel = 'eerste')            as ophalen_ok,
  (select waarde = 'limiet' from droog where sleutel = 'eenenvijftigste') as daglimiet_ok,
  (select org_id = '00000000-0000-0000-0000-000000000001' from allowed_emails
     where email = 'myle.hoefdraad@gmail.com')                          as kernteam_ongemoeid,
  (select count(*) = 0 from auth.users u
     where u.email is not null and u.email <> ''
       and not exists (select 1 from allowed_emails a where a.email = lower(u.email))) as iedereen_heeft_org;

rollback;
