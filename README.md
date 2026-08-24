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

## Kostencatalogus bijwerken

De optimalisatie-maatregelen en hun kosten komen uit `resources/Kostenkentallen_WWSO_optimalisatie.xlsx`
(tabblad "Maatregelen", plus "Aannames" en "Toelichting" voor het versienummer). Dat bestand wordt
nooit rechtstreeks door de app gelezen — alleen via een importscript dat er een versiedataset van maakt.

1. Bewerk `resources/Kostenkentallen_WWSO_optimalisatie.xlsx` (zelfde bestandsnaam en locatie laten staan).
2. Hoog op tabblad "Toelichting" de regel "Versie X.Y — ..." op als oude, al opgeslagen deals
   reproduceerbaar moeten blijven met de oude cijfers; laat de versie gelijk als je alleen een foutje
   herstelt (dan overschrijft de import gewoon dezelfde versiemap).
3. Run lokaal: `pnpm --filter @wwso/data run import:kostenkentallen` — schrijft naar
   `packages/data/src/kostencatalogus/<versie>/kostencatalogus_<versie>.json`. Het script faalt hard
   (geen stille aannames) bij een onbekende rubriek/status of een ontbrekend veld.
4. Run `pnpm -w test` om te controleren dat er niets breekt.
5. Commit het nieuwe/gewijzigde JSON-bestand en deploy (`vercel` voor preview, `vercel --prod` voor
   productie) — de JSON wordt gebundeld in de app; zonder commit + deploy verandert er live niets.

Dit vereist vandaag een lokale devomgeving (Node/pnpm), git en Vercel-toegang — dus alleen door een
developer te doen, niet zelfstandig door een niet-technische gebruiker.

### Open vraag: zelfstandig bijwerken door een toekomstige derde gebruiker

Nog niet ontworpen of gebouwd — hangt samen met het al bestaande, bewust uitgestelde actiepunt in
`plan/plan.md` ("bepalen wie de externe gebruiker is en welke rol die krijgt"). Zodra dat helder is,
is de kernvraag hier: blijft de catalogus een in git meegeversieerde JSON (huidige aanpak, vereist
developer + deploy per wijziging), of verhuist hij naar een database (bijv. Postgres via de Vercel
Marketplace) met een eigen beheerscherm in de app? Dat laatste maakt zelfstandig bijwerken zonder
developer mogelijk, maar kost een aparte auth/rollen-laag (taak 17) en een migratie van de huidige
versiedataset-aanpak (harde regel 6: reproduceerbaarheid van een opgeslagen deal moet overeind
blijven). Aanbeveling: dit pas ontwerpen ná taak 17 (auth/org_id), niet ervoor.

## Relevante links
- Beleidsboek WWSO (peildatum 1 januari 2026) — zie `resources/wwso.xlsx`, tab Toelichting voor de 7 open interpretatiepunten
- Huurprijscheck onzelfstandig: https://huurprijscheck.huurcommissie.nl/onzelfstandige-woonruimte
