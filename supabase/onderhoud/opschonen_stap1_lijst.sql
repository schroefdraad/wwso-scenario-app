-- B2 productie opschonen — STAP 1: alleen een lijst, niets wordt gewijzigd (2026-10-06).
-- Draai dit in de SQL Editor van het PRODUCTIEproject (controleer bovenaan de projectnaam).
-- Exporteer het resultaat (knop "Export" → CSV) en geef het aan Claude.
-- Verwijderen gebeurt pas in een latere stap, na back-up en jouw bevestiging per woning.
--
-- Kolommen:
--   kopie_niveau     aantal keer "(kopie)" in de naam
--   basisnaam        naam zonder "(kopie)"-achtervoegsels: woningen met dezelfde basisnaam horen bij elkaar
--   inhoud_id        korte vingerafdruk van pand + scenario's; gelijke waarde = inhoudelijk identiek
--   aantal_identiek  hoeveel woningen precies dezelfde inhoud hebben (incl. deze)
--   oudste_identiek  true = de oudste van een identieke groep (die zou je houden)
--   mogelijk_test    naam bevat test/probeer/demo/xxx/asdf/kopie

with basis as (
  select
    d.id,
    d.naam,
    d.map,
    o.naam as org,
    d.is_demo,
    d.aangemaakt,
    d.bijgewerkt,
    (length(d.naam) - length(replace(d.naam, '(kopie)', ''))) / length('(kopie)') as kopie_niveau,
    trim(regexp_replace(d.naam, '(\s*\(kopie\))+\s*$', '')) as basisnaam,
    left(md5(d.pand_invoer::text || d.scenarios::text), 8) as inhoud_id,
    jsonb_array_length(d.scenarios) as aantal_scenarios,
    d.naam ~* '(test|probeer|demo|xxx|asdf|kopie)' as mogelijk_test
  from deals d
  left join orgs o on o.id = d.org_id
)
select
  b.*,
  count(*) over (partition by b.inhoud_id) as aantal_identiek,
  b.aangemaakt = min(b.aangemaakt) over (partition by b.inhoud_id) as oudste_identiek
from basis b
order by b.org, b.basisnaam, b.aangemaakt;
