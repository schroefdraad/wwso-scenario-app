# Ontwerp brug Shortlist → Puntum (stroom en dubbel-export)

Datum: 2026-10-08 · Status: ontwerp + mockup, keuzes gemaakt 2026-10-08 · Mockup:
https://claude.ai/artifact/K43JcpaNBJEwA3z3TANb56 · Bouwt voort op
`outputs/RAPPORT_brug_implementatieplan_2026-10-01.md` (B1–B6, C1) en de validatie van de scraper
(funda-scraper `outputs/RAPPORT_steekproef_e_20261008.md`).

## Stroom

1. **Controleren vanuit de Shortlist** (bestaand menu "Funda Tools"): "Controleer plattegronden" leest
   kolom F (`funda_url`) en A (adres) van het tabblad `shortlist` en roept het Cloud Run-endpoint
   `/plattegrond-fml` aan voor elk pand dat **nog niet op het tabblad `puntum`** staat (± $0,004 per pand).
   **Besluit eigenaar 2026-10-08: apart tabblad `puntum`**, één rij per gecontroleerd pand, gekoppeld op
   Funda-ID: `funda_id`, `adres`, `plattegrond` (in orde / aandacht / geen plattegrond), `afwijking`,
   `reden`, `gecontroleerd`, `naar Puntum`. De Shortlist zelf krijgt geen kolommen (archiveren en de
   bestaande `COL_*`-nummers blijven ongemoeid). Opnieuw controleren = de rij op `puntum` verwijderen.
2. **Exporteren** ("Naar Puntum", per rij of selectie): levert een importbestand (JSON) met het skelet en zet
   de datum in kolom `naar Puntum` op het tabblad `puntum`. Panden met een datum slaat de export over. "Geen plattegrond" wordt
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

- **Sheet:** kolom `naar Puntum` op tabblad `puntum` met datum; export slaat zulke panden over.
- **Puntum:** de woning onthoudt het Funda-ID. Bestaat dat ID al in de organisatie → "Deze woning bestaat
  al: openen of toch een nieuwe maken?" (nooit stil een kopie, CLAUDE.md).
  **Gevolg:** een nieuw veld op `deals` (bijv. `bron_funda_id text null`, uniek per `org_id` waar niet
  null). Dat is een migratie (eerst `puntum-test`) — afwijking van brugplan §"geen migratie", nodig voor dit
  tweede slot. Alternatief zonder migratie: het Funda-ID in de notitie zetten en daarop zoeken (zwakker).

## Besluiten eigenaar (2026-10-08)

1. **"Aandacht" wordt ook geëxporteerd**, met de reden zichtbaar in Puntum (verdachte ruimtes zonder m²,
   grijze bovengrens).
2. **Overdracht: eerst een importbestand** (plakken/uploaden in Puntum). Bevalt het, dan later een directe
   koppeling. Daarom ligt het JSON-contract (met eigen Zod-schema in Puntum, brugplan B3) vast vanaf het
   begin; een directe koppeling stuurt later hetzelfde formaat.
3. **Funda-ID als veld op de woning, met migratie** (`bron_funda_id`, uniek per `org_id` waar niet null;
   eerst op `puntum-test`).

## Volgorde en wanneer

- **Scraperkant (kan nu, los van de hold):** endpoint deployen als aandachtslijst-hulpmiddel; Apps
  Script-menu-items + tabblad `puntum`; export-JSON. In het scraperproject.
- **Puntumkant (Fase 4, taak 21, na de bèta):** importscherm (B1–B3, C1.2–C1.3), Funda-ID + migratie,
  feature-gate (B6). Eerst plan mode, daarna bouwen; regressietest op het "bestaat al"-pad.
