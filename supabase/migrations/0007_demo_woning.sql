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

-- ---------------------------------------------------------------------------------------------
-- STAP 1 — VERPLICHTE HANDMATIGE CONTROLE, vóór STAP 2. Draai dit los en controleer dat er
-- precies 1 rij terugkomt vóórdat je verder gaat. Meer of minder dan 1 rij: STOP, en zoek de
-- juiste rij op andere kenmerken (bijv. `aangemaakt` i.p.v. `bijgewerkt`, of het aantal scenario's)
-- vóór je verdergaat — niet zomaar de limit/where aanpassen tot er toevallig 1 rij uitkomt.
--
--   select id, naam, aangemaakt, bijgewerkt, jsonb_array_length(scenarios) as aantal_scenarios
--     from deals
--     where naam ilike '%crooswijk%' and bijgewerkt::date = '2026-09-22';
-- ---------------------------------------------------------------------------------------------

-- ---------------------------------------------------------------------------------------------
-- STAP 2 — de kopie. Zelfde `naam ilike ... and bijgewerkt::date = ...`-filter als de controle
-- hierboven (geen los gekopieerde uuid nodig — dat zou een handmatige kopieerfout kunnen
-- introduceren, precies de foutcategorie die dit project al eerder raakte bij een testfixture).
-- `limit 1` is hier een extra vangnet, geen vervanging voor de controle in stap 1.
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
where naam ilike '%crooswijk%' and bijgewerkt::date = '2026-09-22'
order by bijgewerkt desc
limit 1;

-- ---------------------------------------------------------------------------------------------
-- STAP 3 — verificatie ná het draaien: precies 1 rij, in de demo-org, met is_demo = true en een
-- niet-leeg scenarios-array (de twee scenario's horen er al op te staan — die zijn vóór deze
-- migratie via de normale app op het origineel gebouwd, zie de sequencing-toelichting in het
-- rapport §4.3).
--
--   select id, naam, org_id, is_demo, jsonb_array_length(scenarios) as aantal_scenarios
--     from deals where is_demo = true;
-- ---------------------------------------------------------------------------------------------
