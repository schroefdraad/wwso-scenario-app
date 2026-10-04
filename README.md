# WWSO Scenario App (Puntum)

Puntentelling + rendement voor onzelfstandige verhuur (WWSO), met as-is/to-be-scenariosimulatie.

- **Afspraken en regels:** `CLAUDE.md`
- **Huidige stand:** `plan/STATUS.md`
- **Volgende stappen:** `plan/plan.md`
- **Oorspronkelijke spec:** `prompts/PROMPT_claude_code_wwso_app.md`

## Mappenstructuur

```
apps/web/            Next.js-applicatie
packages/engine/     rekenmotor, pure functies
packages/data/       tarieventabellen, kostencatalogus, geografie (JSON per peildatum)
supabase/            migraties en de auth-toggle-scripts
resources/           bronbestanden (beleidsboek, xlsx) — alleen lezen
docs/                handleidingen (o.a. kostencatalogus bijwerken)
plan/                STATUS.md, plan.md, archief/
briefings/           sessieverslagen
outputs/             rapporten per taak
prompts/             prompts voor Claude
```

## Lokaal draaien

```
pnpm install
pnpm dev      # webapp
pnpm test     # alle tests
pnpm lint
```

## Links

- Huurprijscheck onzelfstandig: https://huurprijscheck.huurcommissie.nl/onzelfstandige-woonruimte
