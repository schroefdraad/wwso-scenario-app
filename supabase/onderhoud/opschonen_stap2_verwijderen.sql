-- B2 productie opschonen — STAP 2: twee woningen verwijderen (besluit eigenaar 2026-10-06).
-- Draai in het PRODUCTIEproject (controleer bovenaan de projectnaam). Twee aparte runs.

-- RUN A — back-up van precies deze twee rijen. Exporteer het resultaat (Export → JSON of CSV)
-- en bewaar het. Komen er geen 2 rijen terug: stop, niet aan run B beginnen.
select *
from deals
where (id = '67984380-319d-4afa-ba30-e2730c8b4fe0' and naam = 'Basrastraat 12')
   or (id = 'f1ff5587-15e2-4d74-b373-ec45d9d0294f' and naam = 'Kraaiheide 8');

-- RUN B — verwijderen. Zowel id als naam moeten kloppen, dus een typefout raakt nooit een andere
-- woning. Verwacht resultaat: precies deze 2 rijen in de uitvoer.
delete from deals
where (id = '67984380-319d-4afa-ba30-e2730c8b4fe0' and naam = 'Basrastraat 12')
   or (id = 'f1ff5587-15e2-4d74-b373-ec45d9d0294f' and naam = 'Kraaiheide 8')
returning id, naam;
