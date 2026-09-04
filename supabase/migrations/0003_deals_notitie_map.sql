-- Backlog (2026-09-04): vrije notitie per deal (zichtbaar in het deals-overzicht) en een
-- optionele "map" voor persoonlijke ordening van je eigen deals-lijst (één map per deal, geen
-- relatie met org_id/multi-tenant — dat blijft een aparte, latere afweging bij de bèta-lancering).
--
-- Handmatig te draaien in de Supabase SQL-editor, zelfde patroon als 0001/0002 (project heeft
-- nog geen CLI-link/migratiegeschiedenis).
--
-- `not null default ''`: geen notitie/map is de normale staat, niet een uitzondering — zo hoeft
-- de rest van de app nergens null vs. lege string te onderscheiden.

alter table deals add column if not exists notitie text not null default '';
alter table deals add column if not exists map text not null default '';

create index if not exists deals_map_idx on deals (map);
