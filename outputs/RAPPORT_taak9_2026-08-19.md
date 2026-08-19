# Rapport: Taak 9 — Scenariomodel — 2026-08-19

## Wat er gedaan is

Nieuwe module `packages/engine/src/scenario/`: een scenario is geen kopie van `PandInvoer`, maar een lijst mutaties die bovenop de as-is invoer wordt toegepast. Elke mutatie is data (Zod-gevalideerd), geen functie — dat is bewust, want scenario's moeten straks in Supabase opgeslagen kunnen worden (taak 15) en dus serialiseerbaar zijn.

### `types.ts` — `Mutatie` en `Scenario`
Een discriminated union van 14 mutatiesoorten, één per combinatie van entiteit (ruimte, keuken, sanitair, parkeerplek, pand) en bewerking (toevoegen/wijzigen/verwijderen, waar van toepassing):

- `pand-patch` — willekeurige subset van `Pand`-velden (energielabel, bouwjaar, monument, `aantalKamers`, etc.)
- `ruimte-toevoegen` / `ruimte-wijzigen` / `ruimte-verwijderen`
- `toewijzing-wijzigen` — vervangt de volledige kamers-lijst voor een ruimte
- `keuken-toevoegen` / `keuken-wijzigen` / `keuken-verwijderen`
- `sanitair-toevoegen` / `sanitair-wijzigen` / `sanitair-verwijderen`
- `parkeerplek-toevoegen` / `parkeerplek-wijzigen` / `parkeerplek-verwijderen`

Patches zijn afgeleid van de bestaande Zod-schema's (`Ruimte.omit({nr:true}).partial()` etc.) in plaats van los overgetypt — één bron van waarheid voor welke velden bestaan.

**Bewust niet gedekt**: mutaties op `HandmatigePosten` (R7-voorzieningen, aanbelfunctie, losse laadpaal, R13-aftreksituaties, zorgwoning). Geen van de drie voorbeelden uit de taakomschrijving (label wijzigen, kitchenette toevoegen, wand plaatsen) heeft dat nodig, en dit type breidt bij een discriminated union makkelijk uit zodra taak 11 een concrete maatregel tegenkomt die het wél nodig heeft.

### `toepassen.ts` — `pasScenarioToe`
Past een mutatielijst toe op een as-is `PandInvoer` en levert een nieuwe, gevalideerde `PandInvoer` op. Kernpunten:
- **Puur en immutable**: elke stap geeft een nieuw object terug, de invoer wordt nooit aangepast.
- **Geen stille aannames**: elke mutatie die naar een niet-bestaand of juist een al-bestaand `ruimteNr` verwijst, faalt met een duidelijke foutmelding.
- **`ruimte-verwijderen` cascadeert gedeeltelijk**: de toewijzing-entry wordt automatisch meegenomen (die heeft geen zelfstandig bestaansrecht los van de ruimte), maar keuken/sanitair/parkeerplek moeten expliciet eerst met hun eigen mutatie verwijderd worden — dat zijn wél losstaande beslissingen, en stilzwijgend meeverwijderen zou een verrassing zijn.
- **Eindvalidatie**: het resultaat gaat door `PandInvoer.safeParse`. Een scenario dat een ongeldig pand oplevert (bijv. een toewijzing naar een kamer die niet bestaat) faalt hier, in plaats van pas bij het doorrekenen.

### De kernvereiste: as-is aanpassen herrekent scenario's automatisch
Doordat `pasScenarioToe` de HUIDIGE as-is als argument neemt (geen bevroren snapshot), werkt een correctie op de as-is vanzelf door: dezelfde mutatielijst — ongewijzigd — wordt gewoon opnieuw toegepast op de bijgewerkte as-is. Dit is expliciet getest: een scenario met een labelwijziging en een nieuwe kitchenette, toegepast vóór én ná een correctie op de oppervlakte van een bestaande kamer, laat zien dat (1) de mutatielijst zelf niet wijzigt, (2) het scenario-resultaat zowel de eigen delta's als de as-is-correctie bevat, en (3) de herrekende puntentelling van die kamer meestijgt met de correctie.

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/scenario/{types,toepassen,index}.ts` + `toepassen.test.ts`
- Gewijzigd: `packages/engine/src/index.ts` (export toegevoegd)

## Interpretatiekeuzes
1. **Patches zijn absoluut, niet relatief.** "Label van D naar A" zet het veld op een waarde, het verhoogt niets. Dat past bij alle drie de voorbeelden uit de taakomschrijving en is eenvoudiger te redeneren over dan relatieve deltas (wat betekent "+2 m²" als de as-is-oppervlakte zelf verandert?).
2. **`toewijzing-wijzigen` vervangt de hele kamers-lijst, geen incrementeel toevoegen/verwijderen van één kamer.** Voorkomt een aparte "kamer X toevoegen aan/verwijderen uit de toegang tot ruimte Y"-mutatie; de aanroeper (taak 11) geeft gewoon de volledige nieuwe lijst mee.
3. **Geen cascaderend verwijderen bij `ruimte-verwijderen`** voor keuken/sanitair/parkeerplek — zie hierboven. Wel voor de toewijzing-entry, met een aparte motivatie in de code.
4. **`aantalKamers` heeft geen eigen mutatiesoort** — het is gewoon een `Pand`-veld en loopt dus via `pand-patch`. Een nieuwe kamer krijgt zijn eigen ruimte via een aparte `ruimte-toevoegen`.

## Niet geïmplementeerd / bewust buiten scope
- Mutaties op `HandmatigePosten` — zie boven.
- Een `Scenario`-vergelijkingsfunctie (as-is naast meerdere scenario's, met terugverdientijd) — dat is taak 11.
- Koppeling met de kostencatalogus — taak 10/11.

## Verificatie (hoe te testen)
- `pnpm test` → 161/161 groen (13 nieuw)
- De kernvereiste uit de taakomschrijving zit als aparte test: `pasScenarioToe — as-is aanpassen laat de deltas intact`
- `npx tsc --noEmit` in `packages/engine` → geen fouten
- `npx eslint packages/engine` → schoon

## Volgende stap
Taak 10: kostencatalogus inlezen uit `Kostenkentallen_WWSO_optimalisatie.xlsx` (49 maatregelen, alle op status `schatting`) naar `packages/data`, herhaalbaar bij een bijgewerkt bestand.
