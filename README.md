# WWSO Scenario App

Puntentelling + rendement voor onzelfstandige verhuur, met as-is/to-be scenariosimulatie.
Zie `prompts/PROMPT_claude_code_wwso_app.md` voor de volledige spec en takenlijst.

## Hoe te starten (elke sessie)
1. Lees `plan/STATUS.md` — actuele stand van zaken
2. Lees `plan/plan.md` — openstaande taken
3. Lees de laatste briefing in `briefings/`
4. Voer taken uit taak voor taak
5. Schrijf rapport naar `outputs/`
6. Update `plan/plan.md` en meld aan de gebruiker

## Mappenstructuur
```
apps/web/          Next.js applicatie (ontstaat in taak 1)
packages/engine/    rekenmotor, pure functies (ontstaat in taak 2+)
packages/data/       tarieventabellen + kostencatalogus, JSON per peildatum
resources/           bronbestanden — nooit aanraken, alleen lezen
prompts/             deze prompt + de Lean Blackbelt-prompt
plan/                STATUS.md en plan.md
briefings/           sessieverslagen
outputs/             rapporten per taak
```

## Onbeheerd vs. beheerd draaien
Dit project wordt soms remote (telefoon) gestart en soms actief begeleid. Niet elke taak mag zonder tussentijdse goedkeuring doorlopen.

**Onbeheerd toegestaan** — objectieve verificatie (tests slagen of niet), geen ontwerpkeuze:
Taak 1, 2, 3, 4, 6, 7, 9, 10, 13, 14, 15, 16, 17

**Altijd stoppen en wachten op goedkeuring** — zie `plan/plan.md` voor de `⬆ Opus`-markering en de reden per taak:
- **Taak 5** (keuken/sanitair) — meest verweven logica, een subtiele fout valt niet op in de testuitkomst
- **Taak 8** (golden-master validatie) — bouwen mag onbeheerd, maar stop zodra er een afwijking is. Nooit stilzwijgend de engine bijschaven tot een test slaagt — eerst rapporteren, dan pas verder
- **Taak 11** (suggestie-engine, ontwerpfase) — architectuurkeuze, implementatie erna mag wel onbeheerd
- **Taak 12** (kamertoewijzing UX, ontwerpfase) — zelfde: alleen het voorstel is een stopmoment

Zeg bij de start van een onbeheerde reeks expliciet: "voer taken X t/m Y uit zonder te wachten op goedkeuring, stop bij taak Z."

## Modelkeuze
Standaard Sonnet, net als in het Funda-project. Naar het zwaardere model bij de vier `⬆ Opus`-taken hierboven — zie `plan/STATUS.md` voor de actuele stand.

## Harde regels (zie prompt voor de volledige lijst)
- De xlsx-bestanden in `resources/` zijn de specificatie, niet de motor, en worden nooit overschreven
- Geen hardcoded tarieven — alles met een peildatum in `packages/data`
- De rekenmotor blijft puur: geen netwerk, geen database, geen systeemdatum
- `org_id` vanaf de eerste tabel
- Geen persoonsgegevens in de MVP

## Relevante links
- Beleidsboek WWSO (peildatum 1 januari 2026) — zie `resources/wwso.xlsx`, tab Toelichting voor de 7 open interpretatiepunten
- Huurprijscheck onzelfstandig: https://huurprijscheck.huurcommissie.nl/onzelfstandige-woonruimte
