-- Multi-tenant org-scheiding — de permanente demo-woning. Zie
-- `outputs/RAPPORT_multi-tenant-architectuurplan_2026-09-28.md` §4.3.
--
-- VEREIST, in deze volgorde (zie plan/plan.md, "Multi-tenant org-scheiding"):
--   1. 0005_orgs_en_gebruikersvlaggen.sql en 0006_deals_demo_en_delen.sql zijn al gedraaid.
--   2. De app-kant is al gedeployed (read-only-gedrag, "Opslaan als eigen woning", de
--      "Voorbeeld"-badge) — draai dit bestand NIET vóór die deploy, anders zien Emma/Steven een
--      woning waarvan "Opslaan" een rauwe RLS-fout geeft in plaats van netjes een kopie te maken.
--
-- Bron: de bestaande "Crooswijkseweg 95-A03"-testdeal — er staan meerdere duplicaten in de
-- database (zie plan/plan.md, Tussenfase-taak D, "Bekende restdata"), de gebruiker heeft
-- expliciet DIE VAN 2026-09-22 aangewezen (rapport §7, punt 3, besloten 2026-09-28).
--
-- Filter bewust op `id` i.p.v. `naam ilike ... and bijgewerkt::date = '2026-09-22'`: die datum
-- klopte alleen zolang de rij ongewijzigd bleef. Op 2026-09-30 zijn de drie scenario's op deze
-- rij via de app ingevuld (gewone "Woning opslaan"-actie), wat `bijgewerkt` naar diezelfde dag
-- verschoof — de oorspronkelijke datumfilter zou nu 0 rijen teruggeven. De rij-id zelf
-- (`680623a2-f8b6-4a52-9dff-1491a5a7a96d`, aangemaakt 2026-09-22, geverifieerd via de REST-API
-- op 2026-09-30: 3 scenario's) is stabiel en ondubbelzinnig.

-- ---------------------------------------------------------------------------------------------
-- STAP 1 — VERPLICHTE HANDMATIGE CONTROLE, vóór STAP 2. Draai dit los en controleer dat er
-- precies 1 rij terugkomt vóórdat je verder gaat. Meer of minder dan 1 rij: STOP, en zoek de
-- juiste rij op andere kenmerken (bijv. `aangemaakt` i.p.v. `bijgewerkt`, of het aantal scenario's)
-- vóór je verdergaat — niet zomaar de limit/where aanpassen tot er toevallig 1 rij uitkomt.
--
--   select id, naam, aangemaakt, bijgewerkt, jsonb_array_length(scenarios) as aantal_scenarios
--     from deals
--     where id = '680623a2-f8b6-4a52-9dff-1491a5a7a96d';
-- ---------------------------------------------------------------------------------------------

-- ---------------------------------------------------------------------------------------------
-- STAP 2 — de kopie. Zelfde `id`-filter als de controle hierboven.
--
-- notitie/map bewust LEEG: de privacy-check van 2026-09-20 vond persoonlijke ordening (voornamen
-- van testers) in het map-veld — een rij die zichtbaar wordt voor elke huidige én toekomstige org
-- mag zo'n tekstveld niet meenemen. is_demo = true is de enige manier om deze vlag te zetten (de
-- gewone insert-policy verbiedt dat voor iedereen behalve de eigenaar, zie 0006).
-- ---------------------------------------------------------------------------------------------

insert into deals (
  org_id, naam, pand_invoer, scenarios, notitie, map,
  tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie, is_demo
)
select
  '00000000-0000-0000-0000-000000000002',
  'Voorbeeldwoning (demo) — Crooswijkseweg 95-A03',
  pand_invoer, scenarios, '', '',
  tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie, true
from deals
where id = '680623a2-f8b6-4a52-9dff-1491a5a7a96d';

-- ---------------------------------------------------------------------------------------------
-- STAP 3 — verificatie ná het draaien: precies 1 rij, in de demo-org, met is_demo = true en een
-- niet-leeg scenarios-array (de twee scenario's horen er al op te staan — die zijn vóór deze
-- migratie via de normale app op het origineel gebouwd, zie de sequencing-toelichting in het
-- rapport §4.3).
--
--   select id, naam, org_id, is_demo, jsonb_array_length(scenarios) as aantal_scenarios
--     from deals where is_demo = true;
-- ---------------------------------------------------------------------------------------------
