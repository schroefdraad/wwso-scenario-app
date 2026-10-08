# Ontwerp brug Shortlist → Puntum (stroom en dubbel-export)

Datum: 2026-10-08 · Status: ontwerp + mockup, wacht op keuzes · Mockup:
https://claude.ai/artifact/K43JcpaNBJEwA3z3TANb56 · Bouwt voort op
`outputs/RAPPORT_brug_implementatieplan_2026-10-01.md` (B1–B6, C1) en de validatie van de scraper
(funda-scraper `outputs/RAPPORT_steekproef_e_20261008.md`).

## Stroom

1. **Controleren in de Shortlist** (Google Sheet, menu "Puntum"): "Controleer plattegronden" roept het
   Cloud Run-endpoint `/plattegrond-fml` aan voor elke rij **zonder status** (± $0,004 per pand) en vult
   nieuwe kolommen: `plattegrond` (in orde / aandacht / geen plattegrond), `afwijking`, `reden`,
   `gecontroleerd`. Rijen met een status worden overgeslagen; status leegmaken = opnieuw.
2. **Exporteren** ("Naar Puntum", per rij of selectie): levert een importbestand (JSON) met het skelet en zet
   de datum in kolom `naar Puntum`. Rijen met een datum slaat de export over. "Geen plattegrond" wordt
   niet geëxporteerd (handmatig, zoals nu).
3. **Importeren in Puntum** (`/woning/importeren`, achter de `'import'`-feature): plakken of uploaden →
   reviewscherm → "Overnemen in invoerscherm". Landt in `InvoerState`, niet direct in de database
   (brugplan §5.4). Opslaan gaat daarna via de bestaande Opslaan-knop.

## Wat er per status naar Puntum gaat

| Status | m² | Mens doet nog |
|---|---|---|
| In orde | alle ruimtes ingevuld | types bevestigen, aantal kamers, toewijzing, voorzieningen |
| Aandacht | verdachte ruimtes **leeg**, grijze bovengrens + reden, knop "neem over" | idem + die ruimtes |
| Geen plattegrond | niet geëxporteerd | alles handmatig (of foto-prompt) |

"In orde" gaat over de m², niet over de punten: types, kamerindeling en voorzieningen kan de scraper niet
weten. Typesuggestie uit de ruimtenaam is altijd een voorstel; onbekende naam = verplicht kiezen.
"Hoeveel kamers ga je verhuren?" wordt nooit uit Funda voorgevuld (brugplan harde eis 9).

## Dubbel exporteren voorkomen (twee sloten)

- **Sheet:** kolom `naar Puntum` met datum; export slaat zulke rijen over.
- **Puntum:** de woning onthoudt het Funda-ID. Bestaat dat ID al in de organisatie → "Deze woning bestaat
  al: openen of toch een nieuwe maken?" (nooit stil een kopie, CLAUDE.md).
  **Gevolg:** een nieuw veld op `deals` (bijv. `bron_funda_id text null`, uniek per `org_id` waar niet
  null). Dat is een migratie (eerst `puntum-test`) — afwijking van brugplan §"geen migratie", nodig voor dit
  tweede slot. Alternatief zonder migratie: het Funda-ID in de notitie zetten en daarop zoeken (zwakker).

## Open keuzes voor de eigenaar

1. **"Aandacht" ook exporteren** (aanbevolen, met de reden zichtbaar) of alleen "in orde"?
2. **Overdracht:** importbestand plakken/uploaden (aanbevolen: geen koppeling tussen Sheet en Puntum,
   werkt met de bestaande login) of een directe koppeling (Sheet schrijft in Puntum; vraagt een API-sleutel
   en meer beveiliging)?
3. **Funda-ID op de woning** via migratie (aanbevolen) of via de notitie?

## Volgorde en wanneer

- **Scraperkant (kan nu, los van de hold):** endpoint deployen als aandachtslijst-hulpmiddel; Apps
  Script-menu + kolommen; export-JSON. In het scraperproject.
- **Puntumkant (Fase 4, taak 21, na de bèta):** importscherm (B1–B3, C1.2–C1.3), Funda-ID + migratie,
  feature-gate (B6). Eerst plan mode, daarna bouwen; regressietest op het "bestaat al"-pad.
