-- Testwoningen kopiëren van productie naar de testdatabase (`puntum-test`).
-- Zie supabase/TEST_OPZETTEN.md. Alleen-lezen op productie: deze queries wijzigen daar niets.
--
-- Selectie (gekozen 2026-10-04): de demo-woning, Pettersonstraat en alles in Stevens map.
-- (Kleiweg bestaat niet als opgeslagen woning in productie.)
-- Andere woningen nodig? Pas de where-regels in STAP 1 en STAP 2 op dezelfde manier aan.

-- ---------------------------------------------------------------------------------------------
-- STAP 1 — in het PRODUCTIEproject. Controleer de lijst: zijn dit de woningen die je wilt?
-- ---------------------------------------------------------------------------------------------
select id, naam, map, is_demo, org_id, bijgewerkt
from deals
where is_demo
   or naam ilike '%petterson%'
   or map ilike '%steven%'
order by naam;

-- ---------------------------------------------------------------------------------------------
-- STAP 2 — in het PRODUCTIEproject. Levert één cel met een insert-opdracht.
-- Klik op de cel, kopieer de volledige inhoud.
-- ---------------------------------------------------------------------------------------------
select format(
  'insert into deals select * from jsonb_populate_recordset(null::deals, %L::jsonb) on conflict (id) do nothing;',
  jsonb_agg(to_jsonb(d))
) as plak_dit_in_test
from deals d
where is_demo
   or naam ilike '%petterson%'
   or map ilike '%steven%';

-- ---------------------------------------------------------------------------------------------
-- STAP 3 — in het TESTproject (`puntum-test`): plak de gekopieerde opdracht en draai hem.
-- Werkt omdat beide databases met dezelfde migraties (0001–0006) zijn opgebouwd, dus dezelfde
-- kolommen in dezelfde volgorde hebben. Woning-id's en org's blijven gelijk aan productie.
-- ---------------------------------------------------------------------------------------------
