# Rapport — Taak 15: Opslaan en laden van deals met versiestempel

## Taakomschrijving

> Deals opslaan in Supabase met `org_id`, inclusief de volledige invoer-snapshot en de
> versiestempel uit harde regel 6. Overzichtspagina met alle deals.
> **Verificatie:** een deal van gisteren opent met exact dezelfde uitkomst, ook nadat er een
> nieuwe tarievenset is toegevoegd.

Op verzoek van de gebruiker is de scope uitgebreid met: de gekozen scenario's uit taak 14
(aan-/uitgevinkte maatregelen per scenario-slot) horen ook bij een deal.

## Vooraf besproken: hoe de migratie toe te passen

`.env.local` bevat alleen de publieke anon-key, geen service-role key en er was geen Supabase
CLI-link — de app kan dus zelf geen tabel aanmaken (DDL). Met de gebruiker is besproken:
- **Nu**: een los `.sql`-migratiebestand, handmatig één keer geplakt en gedraaid in de Supabase
  SQL-editor. Geen extra secrets nodig, geen CLI-setup.
- **Bij taak 17** (RLS-policies erbovenop): heroverwegen of een echte `supabase db push`-workflow
  (CLI-link, migratiegeschiedenis, lokale testdatabase, automatische type-generatie) de moeite
  waard is — dat bestand (`supabase/migrations/0001_create_deals.sql`) is dan al het startpunt.

De migratie is door de gebruiker gedraaid en bevestigd ("Success. No rows returned").

## Wat er gebouwd is

### 1. Versiestempel gecentraliseerd (kleine, noodzakelijke refactor)

Vóór deze taak stond de versiestempel-vorm alleen inline in `SuggestieResultaat` (taak 11), met
een los gehouden `ENGINE_VERSIE`-constante in `suggesties.ts` (bewust een "mirror" van een
gelijknamige constante in `index.ts`, met een expliciet commentaar waarom — om een circulaire
import te vermijden). Voor taak 15 is dat een probleem: elke opgeslagen deal heeft óók een
versiestempel nodig, en die mag niet een derde, losse kopie van dezelfde vier velden worden.

Nieuw: `packages/engine/src/versiestempel.ts`
```ts
export const ENGINE_VERSIE = '0.0.0';
export interface Versiestempel {
  tarievensetPeildatum: string;
  kostencatalogusVersie: string;
  registryVersie: string;
  engineVersie: string;
}
export function huidigeVersiestempel(tarievenset: Tarievenset, kostencatalogus: Kostencatalogus): Versiestempel { ... }
```
`packages/engine/src/index.ts` en `suggesties/suggesties.ts` gebruiken dit nu allebei — geen
dubbele constante meer. `SuggestieResultaat.versiestempel: Versiestempel` verwijst naar hetzelfde
type. Getest in `packages/engine/src/versiestempel.test.ts`.

### 2. Supabase-schema (`supabase/migrations/0001_create_deals.sql`)

```
deals: id, org_id, naam, pand_invoer (jsonb), scenarios (jsonb),
       tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie,
       aangemaakt, bijgewerkt
```

- **`org_id`** vanaf regel één (harde regel 3), met een vaste placeholder-waarde
  (`apps/web/src/lib/deals/org.ts`) totdat taak 17 een echte, auth-afgeleide org_id levert.
- **`pand_invoer`** is de volledige, Zod-gevalideerde `PandInvoer` — geen kolom-per-veld, het
  datamodel blijft in `packages/engine` leven.
- **`scenarios`** bevat alleen de gekozen kandidaat-sleutels per scenario-slot (`{ naam,
  sleutels[] }`), **nooit** het afgeleide `Pakket`-resultaat (investering, huurwinst, TVT). Dat
  blijft consequent afgeleide data — bij het laden altijd opnieuw doorgerekend uit `pand_invoer` +
  het versiestempel, nooit uit de database gelezen. Dit is dezelfde discipline als de rest van de
  engine ("nooit een vuistregel, altijd echt doorrekenen").
- **RLS staat aan**, met een expliciet gemarkeerde, tijdelijk volledig open policy
  (`tijdelijk_open_tot_taak_17`) — bewust wél als leesbare policy neergezet in plaats van RLS uit
  te laten staan, zodat taak 17 een `drop policy` + een echte org_id-check is.

  **Bekend, tijdelijk risico**: zolang deze policy actief is, kan iedereen met de (publieke)
  anon-key alle deals van alle organisaties lezen én schrijven — en die key staat straks in de
  gedeployde JS-bundel. Voor nu is dat aanvaardbaar (één gebruiker, geen persoonsgegevens per
  harde regel 5, alleen objectgegevens), maar dit moet niet blijven liggen zodra er meerdere
  mensen/organisaties gebruik van maken. Taak 17 lost dit op.

### 3. App-laag (`apps/web/src/lib/deals/`)

- `types.ts` — Zod-schema voor de rauwe Supabase-rij (snake_case) + `parseDealRij()` die omzet
  naar de app-vorm (camelCase, `PandInvoer` opnieuw gevalideerd, versiestempel gebundeld). Gooit
  een fout bij een corrupte rij in plaats van hem stil door te laten (harde regel 4) — getest in
  `types.test.ts`.
- `org.ts` — `PLACEHOLDER_ORG_ID`.
- `opslag.ts` — `maakDealAan`, `werkDealBij`, `haalDealenOp`, `haalDealOp` via de bestaande
  `supabase`-client (taak 1).

### 4. Exacte reproduceerbaarheid: de sessionStorage-brug uitgebreid

Dit is de kern van de verificatie-eis. Vóór deze taak gebruikten `/pand/resultaat` en
`/pand/vergelijking` altijd de **nieuwste** tarievenset/kostencatalogus (`alleTarievensets().at(-1)`
/ `nieuwsteKostencatalogus()`) — prima voor een verse, nog niet opgeslagen invoer, maar fataal
voor een oude deal zodra er een nieuwere tarievenset bijkomt.

`apps/web/src/lib/resultaat/opslag.ts` droeg alleen de rauwe `PandInvoer`; nu draagt hij een
`OpgeslagenPandContext { pand, tarievensetPeildatum?, kostencatalogusVersie? }`. Nieuw
`apps/web/src/lib/versiestempel/resolutie.ts`:
```ts
bepaalTarievenset(peildatum?: string): Tarievenset   // met peildatum: getTarievenset(peildatum) — exact, stabiel
bepaalKostencatalogus(versie?: string): Kostencatalogus // met versie: getKostencatalogus(versie) — exact
```
Zonder peildatum/versie (nieuwe invoer): de nieuwste — ongewijzigd gedrag. Mét (een geladen deal):
exact de destijds gebruikte set, ongeacht wat daarna is toegevoegd — `getTarievenset` was al
stabiel voor een historische peildatum (taak 3), dit maakt hem nu ook daadwerkelijk bereikbaar
vanaf de UI.

Doorgevoerd op alle schrijf-/leespunten van de brug: `Topbar.tsx` (Doorrekenen), `resultaat/
page.tsx`, `vergelijking/page.tsx`, en `Vergelijking.tsx`'s "Bekijk volledig resultaat" (die schrijft
nu ook expliciet het huidige `tarievenset.peildatum`/`kostencatalogus.versie` mee — cruciaal
wanneer je een oude deal bekijkt en van daaruit naar het volledige resultaatscherm doorklikt).

### 5. UI

- **`Vergelijking.tsx`**: bewerkbaar naamveld + "Deal opslaan"/"Deal bijwerken"-knop (herkent zelf
  of dit een nieuwe of een geladen deal is), statusfeedback ("Opgeslagen ✓" / foutmelding), link
  "Mijn deals →". Bij openen van een bestaande deal worden de drie scenario-slots gevuld uit
  `deal.scenarios` (`GeladenDeal`-prop).
- **`/pand/vergelijking?deal=<id>`**: laadt de deal async uit Supabase, reconstrueert de exacte
  tarievenset/kostencatalogus uit het opgeslagen versiestempel, rekent daarmee opnieuw door
  (`stelSuggestiesOp`) en vult de scenario's terug. Zonder `?deal=` ongewijzigd gedrag (nieuwe,
  sessionStorage-gebaseerde invoer, nieuwste versies).
- **`/deals`**: overzichtstabel — naam, adres/stad, aantal kamers, aantal scenario's, tarieven-
  peildatum, laatst bijgewerkt. Klik op een deal → `/pand/vergelijking?deal=<id>`. Link "Mijn
  deals" ook toegevoegd aan de topbar van het invoerscherm.

## Interpretatiekeuzes

1. **Alleen de as-is invoer + scenario-keuzes worden opgeslagen, geen berekende getallen.**
   Consistent met de rest van de engine: alles wat afgeleid kan worden, wordt bij het laden
   opnieuw berekend, nooit uit de database gelezen. Dit voorkomt dat een deal en zijn eigen
   weergave uit elkaar kunnen lopen.
2. **Eén opslaanmoment, op de vergelijkingspagina** — niet ook een apart "opslaan"-knopje op het
   resultaatscherm. Een deal omvat per definitie invoer + scenario's; twee plekken met verschillende
   payload-vormen zou verwarrend zijn. Het resultaatscherm blijft bereikbaar via "Bekijk volledig
   resultaat" vanuit een (geladen) deal.
3. **`bekijkResultaat` draagt nu het versiestempel mee** — een bewuste bugfix binnen deze taak: zonder
   dit zou het bekijken van het resultaat van een oude deal stilzwijgend de nieuwste tarieven
   gebruiken, precies de fout die harde regel 6 wil voorkomen.

## Verificatie

### Typecheck, lint, tests
- `npx tsc --noEmit` op `apps/web` en `packages/engine`: schoon.
- `npx eslint` op alle nieuwe/gewijzigde bestanden: schoon.
- Volledige testsuite: **221/221 groen** (4 nieuw: `versiestempel.test.ts`, 3× `deals/
  types.test.ts`), geen regressies.

### Live tegen het echte Supabase-project
- Tabel bevestigd bereikbaar via de anon-key ná de door de gebruiker gedraaide migratie.
- Playwright-flow tegen `next dev`: voorbeeldpand → doorrekenen → vergelijken → Scenario 1 vullen
  met Basis → deal een naam geven → opslaan → **URL krijgt `?deal=<id>`, "Opgeslagen ✓"
  zichtbaar** → naar "Mijn deals" → **deal staat in het overzicht met correcte naam, adres, 6
  kamers, 1 scenario, tarieven-peildatum 2026-01-01** → deal openen → **naamveld en 4 aangevinkte
  maatregelen komen correct terug, knop toont "Deal bijwerken"** → "Bekijk volledig resultaat" →
  resultaatscherm laadt correct. **Nul console-errors** gedurende de hele flow.
- Rechtstreeks bij Supabase geverifieerd dat de opgeslagen rij het volledige versiestempel bevat
  (`tarievenset_peildatum: "2026-01-01"`, `kostencatalogus_versie: "0.1"`, `registry_versie:
  "1.0"`, `engine_versie: "0.0.0"`). Testrij achteraf verwijderd.

### Reproduceerbaarheid "ook nadat er een nieuwe tarievenset is toegevoegd"
Er bestaat op dit moment maar één tarievenset (2026-01-01, taak 3) — een tweede, echte set kon dus
niet end-to-end gesimuleerd worden zonder nepdata aan `packages/data` toe te voegen (dat zou
harde regel 1 schenden: alleen echte, ingelezen datasets). De garantie zelf is wel hard gemaakt en
getest:
- `getTarievenset(peildatum)`/`getKostencatalogus(versie)` (taak 3/10) zijn exacte,
  peildatum-/versie-ankerende lookups, onafhankelijk van wat er later wordt toegevoegd (taak-3-
  eigen tests dekken dit al).
- Deze taak zorgt ervoor dat die exacte lookup ook daadwerkelijk **bereikt** wordt vanaf de UI: het
  opgeslagen versiestempel wordt bij het laden van een deal expliciet doorgegeven aan
  `bepaalTarievenset`/`bepaalKostencatalogus`, in plaats van stilzwijgend "de nieuwste" te pakken.
  Geverifieerd doordat de overzichtspagina en de heropende vergelijkingspagina de bewaarde
  `2026-01-01` tonen, niet een impliciete "huidige" waarde.

## Openstaand / bewust buiten scope

- **RLS is tijdelijk open** (zie hierboven) — expliciet gemarkeerd, opgelost in taak 17.
- **Geen "deal verwijderen" in de UI** — niet gevraagd, en met de open RLS-policy sowieso iets om
  pas een echte toegangscontrole bij te bouwen.
- **Geen migratiegeschiedenis/CLI-link** — bewuste keuze voor nu, heroverwegen bij taak 17 (zie
  boven).

## Bestanden

**Nieuw:**
- `supabase/migrations/0001_create_deals.sql`
- `packages/engine/src/versiestempel.ts`, `versiestempel.test.ts`
- `apps/web/src/lib/deals/{types,org,opslag}.ts`, `types.test.ts`
- `apps/web/src/lib/versiestempel/resolutie.ts`
- `apps/web/src/app/deals/{page.tsx,styles.module.css}`

**Gewijzigd:**
- `packages/engine/src/index.ts`, `suggesties/types.ts`, `suggesties/suggesties.ts`
- `apps/web/src/lib/resultaat/opslag.ts` (uitgebreid met versiestempel-context)
- `apps/web/src/app/pand/resultaat/page.tsx`, `apps/web/src/app/pand/vergelijking/page.tsx`
- `apps/web/src/components/invoer/Topbar.tsx` (nieuwe `slaPandOp`-aanroep + "Mijn deals"-link)
- `apps/web/src/components/vergelijking/Vergelijking.tsx` (opslaan/laden-UI), `styles.module.css`
- `apps/web/package.json` (`zod` als directe dependency toegevoegd — nodig voor de nieuwe
  Zod-schema's in `apps/web/src/lib`)

## Testresultaten

221/221 tests groen (32 testbestanden), tsc en eslint schoon op `apps/web` en `packages/engine`.
