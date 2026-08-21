# Plan — WWSO Scenario App

## Modelkeuze

Alles draait standaard op Sonnet. Taken met **`⬆ Opus`** zijn de vier plekken waar het zwaardere model loont — daar gaat het om interpretatie of om een architectuurkeuze die je maar één keer maakt, niet om uitvoering.

Loopt een taak zonder dat merkteken toch structureel vast? Dat is meestal een teken dat de taak te grof is opgeknipt, niet dat het model tekortschiet. Splits hem eerst.

## Fase 0 — Fundament

- [x] Taak 1: Monorepo opzetten (pnpm workspaces, Next.js, Vitest, Supabase-connectie)

## Fase 1 — Rekenmotor

- [x] Taak 2: Datamodel (Pand, Ruimte, kamertoewijzing, handmatige posten) in TypeScript + Zod
- [x] Taak 3: Tarieventabellen als versiedataset met peildatum (huurtabel, energielabel, bouwjaar, COROP)
- [x] Taak 4: Rubrieken R1 t/m R4 (oppervlakte vertrekken, overige ruimten, verwarming, energieprestatie)
- [x] Taak 5: Rubrieken R5 en R6 (keuken, sanitair) — capping en deling per kamer **`⬆ Opus`** — meest verweven logica in de xlsx, een subtiele fout valt niet op in de uitkomst
- [x] Taak 6: Rubrieken R7 t/m R13 — gecorrigeerde nummering geïmplementeerd. Zie `outputs/RAPPORT_taak6_2026-08-19.md`
- [x] Taak 7: Eindtelling, huurprijs-lookup, monumentopslag. Zie `outputs/RAPPORT_taak7_2026-08-19.md`
- [x] Taak 8: Golden-master validatie tegen 3 officiële Huurprijscheck-exports (Kleiweg 179-B) — zie `outputs/RAPPORT_taak8_2026-08-19.md`. De R4-afwijking die daar gevonden werd is beoordeeld en opgelost (**`⬆ Opus`**, `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`): R4 rekent nu op de ongeronde privé+gedeeld-oppervlakte (§2.4.4), R2 en R13 blijven op de afgeronde rubriek-1-rekenregel. Daarbij kwam ook een fixture-fout bij kamer 6 aan het licht (sanitair van kamer 2 hergebruikt). **Alle drie de kamers matchen nu exact op elke rubriek, het eindtotaal en de huurprijs**

## Fase 2 — Scenario's en suggesties

- [x] Taak 9: Scenariomodel als mutaties bovenop de as-is situatie. Zie `outputs/RAPPORT_taak9_2026-08-19.md`
- [x] Taak 10: Kostencatalogus inlezen uit Kostenkentallen_WWSO_optimalisatie.xlsx (herhaalbaar). Zie `outputs/RAPPORT_taak10_2026-08-19.md`
- [x] Taak 11: Suggestie-engine — marginale analyse per rubriek, pakketten Basis/Comfort/Maximaal, ranking op terugverdientijd. Ontwerp door Opus, implementatie door Sonnet. Zie `outputs/RAPPORT_taak11_2026-08-20.md`. Toelichtingsdeck voor de externe gebruiker (Opus) al eerder opgeleverd als artifact, met een BTW-aanscherping die in deze implementatie is verwerkt.

## Fase 3 — Applicatie

- [x] Taak 12: Invoerscherm inclusief kamertoewijzing. UX-voorstel door Opus (chip-per-rij i.p.v. matrix, gevalideerd met een HTML-prototype), implementatie door Sonnet. Zie `outputs/RAPPORT_taak12_2026-08-20.md` — inclusief een belangrijke bevinding: Turbopack kan `.js`-gesuffixte relatieve imports niet naar `.ts` herleiden, gefixt door alle relatieve imports in `packages/engine`/`packages/data` (84 bestanden) van dat achtervoegsel te ontdoen.
- [x] Taak 13: Resultaatscherm met opbouw per rubriek en de vier controles. Zie `outputs/RAPPORT_taak13_2026-08-20.md`. Vier controles gebouwd als pure, geteste engine-module (`packages/engine/src/controles/`); controle 2 ("ruimten zonder type") is structureel onmogelijk te schenden op een gevalideerde `PandInvoer` — bewust wel als echte check gebouwd, gedocumenteerd waarom hij altijd groen is.
- [x] Taak 14: Scenariovergelijking met directe hertelling in de browser
- [x] Taak 15: Opslaan en laden van deals met versiestempel
- [x] Taak 16: PDF-export van de puntenopbouw. Zie `outputs/RAPPORT_taak16_2026-08-21.md`. "PDF downloaden" op het resultaatscherm, client-side via `@react-pdf/renderer`, altijd volledig uitgeklapt (geen interactiviteit op papier); werkt automatisch ook voor scenario-resultaten, want `Resultaatscherm` was al prop-gedreven (taak 13/14).
- [ ] Taak 17: Auth via magic link, org_id en Row Level Security

## Fase 4 — Na de MVP

- [ ] Taak 18: Waarschuwingslaag gemeentelijke regels (start Rotterdam)
- [ ] Taak 19: Schakelaar zittende huurder versus mutatie
- [ ] Taak 20: Koppeling scenario naar de TO BE-tab van de rendementscalculator
- [ ] Taak 21: Importadapter privé Shortlist Sheet — alleen eigen versie
- [ ] Taak 22: Vergelijking met zelfstandige verhuur (WWS)
- [ ] Taak 23: De zeven open punten uit tab Toelichting van wwso.xlsx afhandelen

## Backlog — gevonden tijdens gebruik/feedback

- [x] **Opgelost (2026-08-21)**: invoerscherm (`/pand/nieuw`) sloeg tussentijds niets op: alleen React-state (`useReducer` in `InvoerContext.tsx`), dus browser terug/refresh/tabblad sluiten tijdens het invullen verloor alles. Gefixt met een sessionStorage-autosave los van de bestaande brug (`lib/invoer/opslag.ts`, sleutel `wwso:invoer-concept`): elke wijziging aan `InvoerState` wordt weggeschreven, en `InvoerProvider` laadt een eventueel concept ná hydratie (nieuwe `CONCEPT_GELADEN`-actie), met een ref-guard tegen het blank overschrijven van een bestaand concept vóór het geladen is. Geverifieerd in de browser: adres intypen → herladen → adres staat er nog. 223/223 tests groen. Onderweg ook een latente typefout gevonden en gefixt (`voorbeeldpandNaarState` in `reducer.ts` ging nog uit van een verplichte `energielabelIngangsdatum`, sinds de vorige bugfix optioneel) — nooit gevangen omdat niemand `tsc` op `apps/web` had gedraaid ná die commit.
- [x] **Bug (opgelost 2026-08-20)**: kies je bij Energielabel "Geen label bekend (val terug op bouwjaar)", dan blijft "Doorrekenen" permanent uitgeschakeld — het ingangsdatum-veld werd onvoorwaardelijk geëist terwijl het formulier het terecht verbergt. Gefixt: `energielabelIngangsdatum` is nu optioneel in `packages/engine/src/types/pand.ts`, met een cross-field-check in `PandInvoer.superRefine` (`pand-invoer.ts`, zelfde patroon als `huurovereenkomstDatum`/monument-Rijks) die hem alleen verplicht stelt bij een echt label. App-checks (`projecteerNaarPandInvoer`, `ontbrekendeStap`, de "①Pand"-badge) volgen dezelfde voorwaarde. Geverifieerd: 223/223 tests groen (2 nieuwe regressietests), en in de browser bevestigd dat R4 met "Bouwjaar" nu daadwerkelijk de bouwjaargrens-factor gebruikt (-2,25 pt i.p.v. de labelwaarde).
- [x] **Opgelost (2026-08-21)**: de as-is invoer van een opgeslagen deal kon achteraf niet aangepast worden — "Deal opslaan"/"Deal bijwerken" op het vergelijkingsscherm sloeg alleen de scenario-keuzes opnieuw op, de pandgegevens zelf waren daar read-only. Gefixt: `/pand/vergelijking` toont nu (alleen voor een reeds opgeslagen deal) een link "Pandgegevens bewerken →" naar `/pand/nieuw?deal=<id>`, dat de as-is terugzet naar de bewerkbare `InvoerState` (nieuwe, gedeelde `pandInvoerNaarState` in `lib/invoer/vanPandInvoer.ts` — de inverse van `projecteerNaarPandInvoer`, ook hergebruikt door het voorbeeldpand). De deal-identiteit (id, naam, scenario-keuzes) reist mee als `InvoerState.bewerktDeal` en via een uitgebreide `OpgeslagenPandContext` (`lib/resultaat/opslag.ts`) door /pand/nieuw → /pand/resultaat → /pand/vergelijking, zodat "Doorrekenen" en "Bekijk volledig resultaat" de koppeling nooit kwijtraken en "Deal opslaan" op het vergelijkingsscherm vanzelf "Deal bijwerken" wordt. Geverifieerd in de browser (Playwright via claude-in-chrome): deal opslaan → pandgegevens bewerken → WOZ-waarde wijzigen → doorrekenen → terug op vergelijking staat "Deal bijwerken" al aan, bijwerken klikken → `/deals` toont nog steeds precies één deal met de nieuwe WOZ-waarde (geen duplicaat), nul console-errors. 223/223 tests groen. Gevonden 2026-08-20 tijdens feedback-ronde na de eerste deploy.

- [ ] Puntenweergave per faciliteit — bij een voorziening (stopcontact, radiator, etc.) direct laten zien hoeveel punten die specifiek oplevert, niet alleen het rubriektotaal. Gevraagd door Emma Morrison, 2026-08-21.
- [ ] AS-IS invullen: sanitair splitsen naar apart toilet en apart badkamer (nu één "Badruimte"/"Toiletruimte"-onderscheid op ruimteniveau, geen aparte invoer per voorziening binnen die ruimte). Gevraagd door Emma Morrison, 2026-08-21.
- [ ] AS-IS kunnen kopiëren naar een handmatig samen te stellen TO-BE scenario om door te rekenen, en dat scenario tonen naast AS-IS als "eerste scenario" — nu bestaat scenariovergelijking alleen via de kandidatenlijst uit de suggestie-engine (taak 14), niet als vrije kopie-en-bewerk-as-is. Gevraagd door Emma Morrison, 2026-08-21.
- [ ] Bij ruimtes toevoegen: de snelknop "Verkeersruimte" vervangen door een generieke "overig"-knop. Gevraagd door Emma Morrison, 2026-08-21.
- [ ] WOZ-peildatum: geen vrije datepicker maar een keuze uit alleen de relevante jaartallen (voorkomt onmogelijke/irrelevante datums). Gevraagd door Emma Morrison, 2026-08-21.
- [ ] Een nieuw pand al op de eerste pagina (vóór "Doorrekenen") kunnen opslaan — of automatisch via de bestaande autosave — zodat het meteen op de deals-pagina verschijnt, ook als je het invoerscherm nooit afmaakt. Gevraagd door Emma Morrison, 2026-08-21.

## Evaluatie — optioneel, niet blokkerend voor de taakvolgorde

- [ ] `/code-review ultra` over de volle codebase — brede, multi-agent cloud-review op codekwaliteit en bugs. Op elk gewenst moment te draaien.
- [ ] Gerichte Opus-steekproef op domeincorrectheid (klopt de puntentelling nog met het beleidsboek) op risicovolle plekken, bijv. de suggestie-engine registry (taak 11) — losse, gerichte controle naast `/code-review ultra`, geen brede doorlichting.

## Actiepunten (geen code)

- [x] Panden verzameld en gebruikt in taak 8: 3 kamers van hetzelfde pand (Kleiweg 179-B) volledig gevalideerd, 1 kamer (Hoefstraat) gedeeltelijk (WOZ-oppervlak ontbreekt op de bron). Geen van de aangeleverde panden raakt monument, parkeren of gehandicaptenvoorzieningen — extra panden voor die rubrieken blijven welkom bij een volgende validatieronde
- [ ] Kostenkentallen bijwerken met echte cijfers en de statuskolom omzetten van `schatting` naar `offerte` of `bevestigd`
- [ ] Bepalen wie de externe gebruiker is en welke rol die krijgt — **bewust uitgesteld tot na de UX van taak 12** (kamertoewijzing); pas als er met het invoerscherm is gewerkt, is duidelijker wat een externe gebruiker nodig heeft
