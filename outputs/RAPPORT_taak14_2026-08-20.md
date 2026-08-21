# Rapport — Taak 14: Scenariovergelijking met directe hertelling in de browser

## Taakomschrijving

> As-is naast maximaal drie scenario's. Maatregelen aan- en uitzetten met directe hertelling in
> de browser — geen laadindicator, geen API-call per klik. Toon per scenario de kolom uit
> taak 11.
> **Verificatie:** een maatregel aanvinken en de nieuwe huurprijs zien binnen 100 ms.

Geen Opus-markering op deze taak in `plan/plan.md` — een rechttoe-rechtaan Sonnet-uitvoeringstaak
die voortbouwt op de suggestie-engine (taak 11) en het resultaatscherm (taak 13).

## Architectuur

### Engine: `bouwVrijScenario` (nieuw, naast de bestaande pakketopbouw)

De algoritmische Basis/Comfort/Maximaal-opbouw uit taak 11 (`stelPakkettenSamen`) kiest zelf wélke
kandidaten een pakket in komen, via een marginale-winst-poort en `alternatiefGroep`-uitsluiting.
Taak 14 vraagt het omgekeerde: de **gebruiker** kiest, en die keuze moet altijd precies worden
uitgevoerd — ook als een maatregel in déze combinatie geen (of negatieve) marginale winst
oplevert. Dat is geen edge case van de bestaande opbouw, het is een ander contract.

In plaats van dat contract in de web-app na te bouwen (en zo de incrementele-mutatie-logica,
budgetbewaking en Pakket-vormgeving te dupliceren), is er één nieuwe, geëxporteerde functie
toegevoegd aan `packages/engine/src/suggesties/pakketten.ts`:

```ts
export function bouwVrijScenario(
  naam: string,
  asIs: PandInvoer,
  regels: PoolItem[],
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
  verwervingswaardeEuro: number | undefined,
  budget: RekenBudget,
): Pakket
```

Deze hergebruikt `nieuweGroeiState`, `waardeerScenario` en `bouwPakketResultaat` (dezelfde
bouwstenen als `stelPakkettenSamen`) maar **zonder** de marginale-winst-gating en zonder
`alternatiefGroep`-deduplicatie: elke meegegeven `PoolItem` wordt toegepast. Het resultaat is een
volwaardig `Pakket`-object — inclusief `investeringEuro`, `terugverdientijdJaren`,
`marginaalBrutoRendementPct`, `deltaBarProcentpunt`, `vergunningplichtig` en de leave-one-out
`marginaleBijdrageJaarhuurEuro` per regel — dus **exact dezelfde kolom als taak 11**, zonder een
aparte weergavelaag te hoeven bouwen.

Kleine typewijziging om dit mogelijk te maken: `Pakket.naam` was `'Basis' | 'Comfort' | 'Maximaal'`,
nu `string` (met commentaar dat de literal-vorm bij de algoritmische opbouw hoort en de vrije vorm
bij `bouwVrijScenario`). `PoolItem` (waardering + registry-definitie) was intern, is nu
geëxporteerd zodat de web-app kandidaten kan doorgeven.

### Web-app: drie vaste scenario-slots, live herrekend

- **`apps/web/src/lib/vergelijking/scenario-bouw.ts`** — `bouwScenarioUitSleutels()`: vertaalt een
  `Set<string>` van gekozen kandidaat-sleutels naar `PoolItem[]` (via `standaardRegistry.get`) en
  roept `bouwVrijScenario` aan.
- **`apps/web/src/lib/vergelijking/useScenarioPakket.ts`** — hook die één scenario-slot memoïseert
  op `[pand, naam, sleutels, alleKandidaten, tarievenset, peildatum, kostencatalogus,
  verwervingswaardeEuro]`. Retourneert `null` zolang er niets is aangevinkt.
- **`apps/web/src/components/vergelijking/Vergelijking.tsx`** — orchestrator met **drie expliciete
  `useScenarioPakket`-aanroepen** (rules-of-hooks: geen `.map` over een hook), state voor drie
  vaste `{ naam, sleutels }`-slots. Elke toggle maakt een **nieuwe** `Set`-instantie (nooit
  muteren) zodat `useMemo` de wijziging betrouwbaar detecteert.
- **`SamenvattingRij.tsx`** — as-is naast tot drie scenariokolommen: jaarhuur, extra jaarhuur,
  investering (bandbreedte), terugverdientijd, marginaal bruto rendement, ΔBAR (alleen zichtbaar
  als er een verwervingswaarde is meegegeven — nu nog niet, want de rendementscalculator-koppeling
  is taak 20), vergunningplicht. Plus per kolom: een bewerkbaar naamveld, snelvul-knoppen
  (Basis/Comfort/Maximaal, gevuld uit `resultaat.pakketten` van taak 11) en een link "Bekijk
  volledig resultaat →".
- **`MaatregelTabel.tsx`** — kandidaten gegroepeerd per rubriek (`rubriek-groepering.ts`), met een
  checkbox per scenario-kolom. Bewust **geen** `alternatiefGroep`-uitsluiting in de UI: de
  gebruiker mag bewust twee alternatieven tegelijk aanvinken (bijv. twee energielabel-maatregelen),
  `bouwVrijScenario` voert dat gewoon uit — consistent met "de gebruiker kiest, geen poort".

### "Bekijk volledig resultaat" — hergebruik van taak 13

Een `Pakket` draagt geen volledig `PandInvoer`, alleen `scenario.mutaties`. Klikken op "Bekijk
volledig resultaat" reconstrueert het pand on-demand via `pasScenarioToe(asIs, mutaties)`, schrijft
dat naar dezelfde `HUIDIG_PAND_SESSIONSTORAGE_KEY` die taak 12/13 al gebruiken, en navigeert naar
`/pand/resultaat` — het bestaande, prop-driven `Resultaatscherm` uit taak 13 hoefde niet te worden
aangepast. Omgekeerd is er nu ook een link "Vergelijk scenario's →" in de kop van
`Resultaatscherm` terug naar `/pand/vergelijking`.

## Bewuste scope-grens: alleen parametervrije kandidaten

`stelSuggestiesOp()` wordt op de vergelijkingspagina aangeroepen **zonder** `maatregelParameters`.
Maatregelen die een expliciete parameter vereisen (S-02, E-01 t/m E-09, I-02/I-03/I-05, B-01 t/m
B-03, V-04 — 18 stuks op het voorbeeldpand) landen daardoor in `resultaat.nietBeoordeeld` en worden
niet als aan-/uitzet-optie getoond. Dit is een expliciete keuze, geen omissie: die maatregelen
hebben een invoerscherm nodig (bijv. "naar welk energielabel?") dat buiten de scope van deze taak
valt. De UI toont een neutrale hint: *"N maatregelen vereisen extra invoer en worden hier niet
getoond."*

## Verificatie

### Typecheck, lint, tests

- `npx tsc --noEmit` (apps/web): schoon.
- `npx eslint` op alle nieuwe bestanden: schoon.
- Volledige testsuite: **217/217 groen** (3 nieuwe tests voor `bouwVrijScenario` in
  `pakketten.test.ts`, geen regressies).

### Browser (Playwright, `next dev`/Turbopack, poort 3000)

Volledige flow doorlopen: voorbeeldpand laden → Doorrekenen → "Vergelijk scenario's" → Basis
snelvullen in Scenario 1 → individuele checkbox togglen in Scenario 2 → "Bekijk volledig
resultaat" voor Scenario 1. Bevindingen:

- Samenvatting en maatregeltabel renderen correct; jaarhuur/extra jaarhuur/investering/TVT/
  rendement/vergunningplicht kloppen met de aangevinkte maatregelen.
- **Nul console-errors** gedurende de hele flow.
- "Bekijk volledig resultaat" reconstrueert het scenario-pand correct: het resultaatscherm toont
  de verhoogde punten/huur per kamer en alle 4 controles blijven groen.

### 100ms-eis — expliciet gemeten

Een externe meting via Playwright inclusief click-dispatch en `waitForFunction`-polling gaf ruis
(125–179ms) die grotendeels Playwright/round-trip-overhead is, niet renderrekentijd. Daarom is de
tijd **in de pagina zelf** gemeten (`performance.now()` van click-dispatch tot de DOM van `<main>`
daadwerkelijk verandert, dus tot ná React's commit+paint), vijf keer op rij:

```
toggle 1: 75.80ms   (koude klik, inclusief eventuele lazy compile door Turbopack-dev)
toggle 2: 78.30ms
toggle 3: 73.50ms
toggle 4: 68.70ms
toggle 5: 68.90ms
```

Stabiel **69–78ms**, ruim binnen de 100ms-eis — en dat is `next dev` (ongeminificeerd, Turbopack
dev-overhead); een productiebuild zou hier niet langzamer van worden. Er is geen laadindicator en
geen netwerkverzoek: de hertelling loopt volledig synchroon in de browser via `useMemo` +
`bouwVrijScenario`.

## Bekende beperkingen (bewust, niet opgelost in deze taak)

- **Alleen parametervrije maatregelen togglebaar** (zie hierboven) — parametrische maatregelen
  volgen in een latere taak of blijven altijd buiten scope van de vrije vergelijking.
- **ΔBAR wordt nooit getoond**: er is nog geen `verwervingswaardeEuro` beschikbaar (koppeling met
  de rendementscalculator is taak 20, Fase 4).
- **Geen alternatiefGroep-waarschuwing in de UI**: als een gebruiker bewust twee wederzijds
  uitsluitende maatregelen aanvinkt (bijv. twee energielabel-routes), rekent `bouwVrijScenario` ze
  allebei door zonder waarschuwing. Dit is expliciet gewenst gedrag voor taak 14 (vrije keuze,
  geen poort) — een eventuele "dit sluit elkaar normaal uit"-hint zou een latere verfijning zijn,
  geen bug.
- **Scenario-van-een-scenario**: als een gebruiker via "Bekijk volledig resultaat" naar
  `/pand/resultaat` gaat en van daaruit weer op "Vergelijk scenario's" klikt, wordt dat
  scenario-resultaat de nieuwe as-is-basislijn (via dezelfde sessionStorage-brug als taak 12/13).
  Functioneel correct en consistent met het bestaande overdrachtspatroon, maar niet expliciet
  getest als "geneste scenario's"-functie — er is geen apart concept van "terug naar het
  oorspronkelijke as-is".

## Bestanden

**Nieuw (engine):**
- `packages/engine/src/suggesties/pakketten.ts` — `bouwVrijScenario`, `PoolItem` geëxporteerd
- `packages/engine/src/suggesties/types.ts` — `Pakket.naam: string`
- `packages/engine/src/suggesties/pakketten.test.ts` — 3 nieuwe tests

**Nieuw (web-app):**
- `apps/web/src/lib/vergelijking/scenario-bouw.ts`
- `apps/web/src/lib/vergelijking/rubriek-groepering.ts`
- `apps/web/src/lib/vergelijking/useScenarioPakket.ts`
- `apps/web/src/lib/vergelijking/formatteren.ts`
- `apps/web/src/components/vergelijking/Vergelijking.tsx`
- `apps/web/src/components/vergelijking/SamenvattingRij.tsx`
- `apps/web/src/components/vergelijking/MaatregelTabel.tsx`
- `apps/web/src/components/vergelijking/styles.module.css`
- `apps/web/src/app/pand/vergelijking/page.tsx`

**Gewijzigd:**
- `apps/web/src/components/resultaat/Resultaatscherm.tsx` — link naar `/pand/vergelijking`
- `apps/web/src/components/resultaat/styles.module.css` — `.vergelijkLink`

## Testresultaten

217/217 tests groen (30 testbestanden), tsc en eslint schoon op `apps/web` en `packages/engine`.
