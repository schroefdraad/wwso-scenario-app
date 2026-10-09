-- Droogtest voor 0008_open_inschrijving.sql — draai NA 0008, op `puntum-test`, in de SQL-editor.
-- Alles staat in één transactie die eindigt met ROLLBACK: er blijft niets achter.
-- Verwacht resultaat: de laatste select geeft één rij met alle kolommen = true.

begin;

-- Nieuw account zonder toestemming, nieuw account met toestemming.
insert into auth.users (id, email, raw_user_meta_data)
values
  (gen_random_uuid(), 'droogtest-zonder@puntum.invalid', '{}'::jsonb),
  (gen_random_uuid(), 'Droogtest-Met@puntum.invalid', '{"nieuwsbrief": true}'::jsonb);

-- Daglimiet: doe alsof droogtest-zonder ingelogd is (auth.jwt() leest deze instelling) en vraag
-- drie keer op met limiet 2. Verwacht: ok, ok, limiet.
select set_config('request.jwt.claims', '{"email": "droogtest-zonder@puntum.invalid"}', true);
create temp table droog_uitkomst (n int, r text) on commit drop;
insert into droog_uitkomst select 1, registreer_ophaalactie(2);
insert into droog_uitkomst select 2, registreer_ophaalactie(2);
insert into droog_uitkomst select 3, registreer_ophaalactie(2);

select
  (select string_agg(r, ',' order by n) = 'ok,ok,limiet' from droog_uitkomst) as daglimiet_ok,
  (select count(*) = 1 from allowed_emails a join orgs o on o.id = a.org_id
     where a.email = 'droogtest-zonder@puntum.invalid'
       and a.nieuwsbrief_toestemming is null
       and a.is_eigenaar = false
       and o.naam like 'Account %')                                   as zonder_toestemming_ok,
  (select count(*) = 1 from allowed_emails
     where email = 'droogtest-met@puntum.invalid'                      -- kleine letters
       and nieuwsbrief_toestemming is not null)                        as met_toestemming_ok,
  (select count(distinct org_id) = 2 from allowed_emails
     where email like 'droogtest-%@puntum.invalid')                    as eigen_org_per_account,
  (select org_id = '00000000-0000-0000-0000-000000000001' from allowed_emails
     where email = 'myle.hoefdraad@gmail.com')                         as kernteam_ongemoeid;

rollback;
