# Rapport: Taak 12 — Invoerscherm inclusief kamertoewijzing — 2026-08-20

## Wat er gedaan is

Het UX-ontwerp (Opus) is uitgewerkt tot een echte, werkende implementatie in `apps/web/src/app/pand/nieuw/`. De kernbeslissing uit het ontwerp is één-op-één overgenomen: de 40×12-toewijzingsmatrix is geen invoermiddel meer, maar een chip-per-rij-patroon (`[Alle] [1] [2] … [N]`) direct in de ruimterij, met de xlsx-matrix teruggebracht als een inklapbaar **controle**middel (Toewijzingsoverzicht).

Vóór de implementatie is het ontwerp eerst gevalideerd met een los, statisch HTML/JS-prototype (gepubliceerd als artifact) om het interactiepatroon te beoordelen zonder meteen productiecode te bouwen. Na akkoord is dat prototype de blauwdruk geworden voor de echte React/Next.js-versie — nu gekoppeld aan de **echte rekenmotor**, niet aan een gesimuleerde puntentelling.

### Structuur
```
apps/web/src/
├── lib/invoer/
│   ├── types.ts              RuimteRij, PandVeldenState, InvoerState (gedenormaliseerd)
│   ├── reducer.ts             invoerReducer — pure functie, alle mutaties als acties
│   ├── projecteer.ts          projecteerNaarPandInvoer() → echte PandInvoer + Zod-validatie
│   └── afgeleide-staat.ts     waarschuwingen + berekenPuntenstrip() (echte berekenEindtelling)
└── components/invoer/
    ├── InvoerContext, ToastContext, LadeContext   (reducer/toast/drawer-state via Context)
    ├── PandFormulier, RuimteRaster, RuimteRijComponent, KamerChipStrip
    ├── ToewijzingsOverzicht, Waarschuwingen, OverigePosten
    ├── RuimteLade (Keuken/Sanitair-panelen met de basiseisen-poort, Parkeerplek/Zolder)
    ├── PuntenStrip, Topbar
    └── styles.module.css      CSS Modules + de tokens uit globals.css (§7.1 van het ontwerp)
```

### Wat werkt, geverifieerd in de browser (niet alleen typecheck/lint)
- Pandgegevens invoeren, inclusief de poortlogica voor `aantalKamers`, de WOZ/taxatiewaarde-wissel, en het conditioneel tonen van `huurovereenkomstDatum` bij een Rijksmonument.
- Ruimten toevoegen via de scaffold-knop ("Maak N privévertrekken aan"), snel-toevoegen-knoppen, en **Voorbeeldpand laden** (laadt `testpand6Kamers` rechtstreeks vanuit `@wwso/engine`).
- Kamertoewijzing per rij met de chipstrip, inclusief de `Alle`-chip.
- De keukenlade: basiseisen-poort met master-toggle en live groen/rood-statusbalk, extra voorzieningen in de vijf benoemde subgroepen uit het ontwerp — **getest op focusbehoud**: typen in het aanrechtveld veroorzaakt geen remount van het paneel (zie bugfix hieronder).
- Het Toewijzingsoverzicht als inklapbare matrix, met "Geen waarschuwingen"-status.
- Overige posten: aanbelfunctie/laadpaal met chipstrip, de aftrekpuntenmatrix (bewust wél een matrix, zie het ontwerp §5).
- **De puntenstrip rekent live en echt door** via `berekenEindtelling` uit `@wwso/engine` — bij het wijzigen van een keukenveld in de lade update de puntenstrip in de topbalk direct.
- Geverifieerd met een automatisch Playwright-script tegen de draaiende dev server: volledige flow (leeg scherm → voorbeeldpand laden → keukenlade openen → veld bewerken → sluiten → toewijzingsoverzicht → overige posten), **nul console-errors**.

## Belangrijke bevinding: Turbopack kan `.js`-gesuffixte relatieve imports niet naar `.ts`-bestanden herleiden

Dit is de belangrijkste technische ontdekking van deze taak, met impact op het hele monorepo — niet alleen op dit scherm.

**Wat er misging:** zodra `apps/web` voor het eerst waarde-exports (niet alleen types) uit `@wwso/engine`/`@wwso/data` importeerde, faalde de Next.js-dev-server (Turbopack) met "Module not found" voor zowat elke barrel-export in beide packages. `tsc --noEmit` en de volledige vitest-suite bleven intussen foutloos — dit was dus nooit zichtbaar in taak 1 t/m 11, omdat geen daarvan de packages ooit door een bundler liet lopen.

**Grondoorzaak:** `packages/engine` en `packages/data` hebben geen build-stap (`package.json` "main"/"types" wijzen rechtstreeks naar `src/index.ts`) en gebruiken overal `.js`-gesuffixte relatieve imports (bijv. `../types/index.js`) — de standaard, correcte TypeScript-ESM-conventie or een package zonder compile-stap, waarbij `moduleResolution: "bundler"` het `.js`-achtervoegsel transparant naar het naastliggende `.ts`-bestand herleidt. `tsc` en vitest kennen deze conventie. **Turbopack (Next.js 16) kent hem niet** — het heeft, anders dan webpack (`resolve.extensionAlias`), geen ingebouwd mechanisme om een expliciete `.js`-specifier naar een `.ts`-bestand om te leiden.

**Onderzochte, verworpen tussenoplossingen:**
1. `transpilePackages` in `next.config.ts` — loste niets op (bleef desondanks toegevoegd, want correct en nodig voor de rest van de pipeline).
2. Handmatige, expliciete named re-exports toevoegen aan de top-level `index.ts` van beide packages — loste de "export niet gevonden"-fout op, maar onthulde daarna dat de `.js`-specifiers zelf onoplosbaar waren voor Turbopack, ook op het eerste niveau.

**De uiteindelijke fix:** de `.js`-achtervoegsels mechanisch verwijderd uit **alle** relatieve imports in `packages/engine/src/**/*.ts` en `packages/data/src/**/*.ts` (84 bestanden, puur syntactisch — onder `moduleResolution: "bundler"` verandert de resolutie niet). Geverifieerd met de volledige testketen ná de wijziging: `tsc --noEmit` schoon in beide packages, **201/201 tests groen**, eslint schoon, en de webapp draait foutloos. Ook `apps/web`'s eigen lokale imports moesten van `.js`-suffix ontdaan worden (die faalden om een andere reden — Turbopack's bare-extension-resolutie vindt `.tsx` prima, maar alleen als de extensie helemaal ontbreekt, niet als hij `.js` is).

**Consequentie voor toekomstige taken:** dit patroon (geen `.js`-suffix in relatieve imports binnen `packages/*`) is nu de facto de vaste conventie in de hele monorepo. Nieuwe bestanden in `packages/engine`/`packages/data` moeten zonder `.js`-suffix importeren; `apps/web` deed dat al zo.

## Bugfix: CSS Modules staat kale elementselectors niet toe

Kleinere, losstaande vondst: Next.js' CSS Modules-compiler weigert bouwen bij een "onzuivere" selector als `input { ... }` of `select { ... }` zonder lokale klasse/id — dat zou buiten de module-scope lekken. De twee betrokken regels in `styles.module.css` (basisstyling voor alle `input`/`select`/`button:focus-visible`) zijn expliciet in `:global(...)` gewikkeld, wat exact het bedoelde gedrag is (deze regels moeten wél universeel binnen de pagina gelden).

## Interpretatiekeuzes tijdens de implementatie

1. **Rekendatum voor de live puntenstrip**: er is in dit scherm bewust geen apart "peildatum van de berekening"-veld — de puntenstrip gebruikt de nieuwste tarievenset en diens eigen peildatum als rekendatum. Een echte, door de gebruiker gekozen peildatum hoort bij het opslaan van een deal (taak 15).
2. **`berekenPuntenstrip` vangt fouten af** (try/catch) omdat `berekenEindtelling` kan gooien bij een tussentijds ongeldige combinatie (bijv. een bouwjaar buiten de tabel) — de invoer moet bewerkbaar blijven, de puntenstrip valt dan terug op "nog niet compleet" in plaats van de hele pagina te laten crashen.
3. **Rijlade toont alleen 🍳/🚿-badges** in het raster zelf (Keuken/Sanitair); Parkeerplek en Zolder zijn wél volledig uitgewerkte panelen in de lade, maar hebben geen eigen badge-icoon in de rij — consistent met de bewuste vereenvoudiging die al in het HTML-prototype stond.
4. **`useReducer` + Context**, geen state-library — matcht de aanbeveling uit het ontwerp (§7.1): één documentachtige state, kruisvalidatie op documentniveau, geen per-veld-registratie nodig.

## Bekende beperking / bewust nog niet gebouwd

- **Paste-vanuit-Excel** en de **afdrukweergave** uit het ontwerp (§9) zijn niet gebouwd — expliciet als "buiten scope voor de eerste oplevering" bestempeld in het ontwerp zelf.
- **Veldvalidatie op blur (laag B uit het ontwerp)** is niet apart geïmplementeerd; de huidige validatie leunt op HTML-invoertypen (`type="number"`, `type="date"`) plus de documentbrede Zod-validatie via `projecteerNaarPandInvoer`. Foutmeldingen per veld tijdens het typen (met Nederlandse Zod-boodschappen) zijn een logische vervolgstap, geen blokkade voor taak 13.
- **"Doorrekenen"-knop** leidt nu naar een `alert()` — taak 13 (resultaatscherm) bestaat nog niet.
- Geen tijdmeting met een externe testpersoon uitgevoerd (het meetvoorschrift uit het ontwerp, §8) — wel bevestigd dat de flow zoals ontworpen functioneel volledig werkt.

## Bestanden gewijzigd
- Nieuw: `apps/web/src/lib/invoer/*.ts` (4 bestanden), `apps/web/src/components/invoer/*.tsx`/`.ts`/`.css` (18 bestanden), `apps/web/src/app/pand/nieuw/page.tsx`
- Gewijzigd: `apps/web/package.json` (`@wwso/engine`, `@wwso/data` als workspace-dependency), `apps/web/next.config.ts` (`transpilePackages`), `apps/web/src/app/globals.css` (ontwerptokens)
- Gewijzigd: `packages/engine/src/index.ts` (`testpand6Kamers` publiek geëxporteerd)
- Gewijzigd (mechanisch, 84 bestanden): alle relatieve imports in `packages/engine/src/**/*.ts` en `packages/data/src/**/*.ts` van `.js`-suffix ontdaan — zie de Turbopack-bevinding hierboven

## Verificatie (hoe te testen)
- `pnpm test` → 201/201 groen (ongewijzigd t.o.v. taak 11 — puur syntactische wijziging, geen gedragswijziging)
- `npx tsc --noEmit` in `packages/engine`, `packages/data`, `apps/web` → geen fouten
- `npx eslint` op alle drie → schoon
- Handmatig: `pnpm --filter @wwso/web dev`, naar `http://localhost:3000/pand/nieuw`, "Voorbeeldpand laden" klikken → puntenstrip toont direct echte punten per kamer
- Geautomatiseerd geverifieerd met een Playwright-script tegen de draaiende server (niet in de repo opgenomen — was een ad-hoc verificatiehulpmiddel in de scratchpad)

## Volgende stap
Taak 13: Resultaatscherm met opbouw per rubriek en de vier controles uit tab `Controles` van de xlsx.
