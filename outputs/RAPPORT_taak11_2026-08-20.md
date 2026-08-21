# Rapport: Taak 11 — Suggestie-engine — 2026-08-20

## Wat er gedaan is

Nieuwe module `packages/engine/src/suggesties/`: een regelgebaseerde suggestie-engine die per pand bepaalt waar punten blijven liggen, maatregelen uit de kostencatalogus (taak 10) daarop matcht, elke maatregel **echt** doorrekent via `pasScenarioToe` + `berekenEindtelling` (nooit de vuistregel-tekst uit de catalogus), en drie pakketten (Basis/Comfort/Maximaal) samenstelt op terugverdientijd.

Het ontwerp (Opus, `⬆ Opus` per `plan/plan.md`) is vooraf uitgewerkt en met de gebruiker doorgenomen als artifact; dit rapport beschrijft de Sonnet-implementatie ervan. Tijdens taak 12 (toelichtingsdeck) kwam een rekenfout in het oorspronkelijke ontwerpvoorbeeld aan het licht en een BTW-aanscherping — beide zijn verwerkt vóór de implementatie begon (zie de artifact-changelog en §"Aanscherpingen" hieronder).

### Module-structuur
```
packages/engine/src/suggesties/
├── types.ts            Kandidaat, MaatregelDefinitie, Bandbreedte, SuggestieOpties/Resultaat, Pakket
├── kosten.ts            Bandbreedte-rekenkunde, regio-index, indexatie, 21%-BTW-default
├── marge-analyse.ts      diagnostische laag: poort/plafond/afrondingssignalen (geen euro's)
├── kandidaten.ts          kandidaatgeneratie via de registry, nietBeoordeeld-lijst
├── waardering.ts          solo-waardering + de enige waarderingsbron (waardeerScenario)
├── pakketten.ts           greedy nesting Basis⊆Comfort⊆Maximaal, leave-one-out, restpost
├── suggesties.ts          stelSuggestiesOp — publieke ingang, incl. gat-in-catalogus-detectie
├── index.ts
└── registry/
    ├── index.ts, validatie.ts, hulp.ts
    └── r1-r2-indeling.ts, r3-klimaat.ts, r4-energie.ts, r5-keuken.ts, r6-sanitair.ts,
        r8-buitenruimte.ts, r10-parkeren.ts, r12-bijzonder.ts, r13-aftrekpunten.ts, proc.ts
```

Alle 49 catalogusmaatregelen hebben een registry-definitie; `valideerRegistryOfGooiFout` controleert bij elke aanroep de bijectie (elke catalogus-id ↔ precies één definitie) én dat de vergunningstekst in de registry byte-identiek is aan de catalogustekst (drift-check — wijzigt de xlsx, dan moet een mens de classificatie herbeoordelen).

### Kernmechaniek
- **Nooit een vuistregel.** Elke solo-kandidaat én elk pakket wordt gewaardeerd door de mutatie(s) toe te passen via `pasScenarioToe` en het resultaat door `berekenEindtelling` te halen.
- **Incrementele mutatie-opbouw.** Bij pakketopbouw wordt de mutatie van elke kandidaat gegenereerd tegen de HUIDIGE pandstaat (inclusief eerder geaccepteerde mutaties), niet tegen de as-is — dit voorkomt dat een latere `keuken-wijzigen`/`sanitair-wijzigen`-patch een eerdere overschrijft (`pasMutatieToe` doet een ondiepe merge op geneste objecten als `extra`). Zie `patch-clobber.test.ts` voor het bewijs, inclusief een test die laat zien wat er MIS zou gaan zonder deze aanpak.
- **Leave-one-out + restpost.** De bijdrage van een maatregel binnen een pakket is `pakket − pakket-zonder-die-maatregel`, opnieuw doorgerekend (niet uit opgeslagen mutaties geknipt — die kunnen zelf al van een latere context uitgaan). De som van de bijdragen hoeft niet gelijk te zijn aan de pakketwinst; het verschil staat expliciet in `restpostEuro` en kan positief én negatief zijn. Zie `additiviteit.test.ts` met een echt, doorgerekend voorbeeld (S-04 + K-08 op de fixture: €244,20 restpost).
- **Rekenbudget.** Een teller op het aantal `berekenEindtelling`-aanroepen; overschrijding van `maxEindtellingen` (default 2000) geeft een expliciete fout, nooit een stille afkapping.

## Aanscherpingen ten opzichte van het oorspronkelijke ontwerp

Ontdekt tijdens het schrijven van het toelichtingsdeck (taak 12), vóór deze implementatie:

1. **BTW.** Het ontwerp paste aanvankelijk geen BTW toe. Woonruimteverhuur is BTW-vrijgesteld, dus voorbelasting is voor de verhurende BV nooit aftrekbaar — "geen BTW" was daarmee een structurele onderschatting van elke investering, precies op de plek waar de pakketfilters (TVT-drempels) een maatregel toelaten of afwijzen. Geïmplementeerd: een conservatieve `CONSERVATIEVE_BTW_FACTOR = 1.21` op het vermoedelijk exclusieve bedrag (`kosten.ts`), zichtbaar als `btwBehandeling: 'conservatief-21-procent'` en met een waarschuwing in `SuggestieResultaat.waarschuwingen`.
2. **Afrondingsvoorbeeld gecorrigeerd.** Het ontwerpdocument had een rekenkundig onjuist voorbeeld (0,20 + 0,20 rondt op zichzelf al af naar 0,25, niet naar 0). Vervangen door een generieke, correcte formulering; de exacte doorrekening staat nu in het toelichtingsdeck en in `afronding.test.ts`.
3. **Restpost-teken.** Het ontwerp beschreef de restpost zonder het teken te benoemen. Verduidelijkt: bij drempeloverschrijding (elke maatregel is los onmisbaar) is de restpost **negatief** (som van bijdragen > pakketwinst); bij overlap/redundantie (zoals S-04+K-08) is hij **positief**.

## Interpretatiekeuzes en scope-beslissingen tijdens de implementatie

1. **K-01 (kitchenette) krijgt geen nieuwe ruimte.** De catalogus geeft geen apart m²-veld voor de kitchenette. In plaats van een gegokte extra vierkante meter toe te voegen, wordt de keuken toegevoegd aan de BESTAANDE privéruimte van de kamer (`Keuken.ruimteNr` hoeft volgens het datamodel geen type 'Keuken' te hebben — "denk aan een open keuken").
2. **I-01 en I-04 (vorm b) leveren bewust geen kandidaten.** Kamersplitsing vereist een geometrische keuze (waar de wand komt, hoe de resterende ruimte heet) die niet uit het pand is af te leiden zonder tekening. Ze staan wel geregistreerd (bijectie-eis) met `wijzigtAantalKamers: true`, en worden dus sowieso uitgesloten van de pakketten en apart gerapporteerd onder `herindeling` — een lege kandidatenlijst heeft hier dus geen praktisch effect op de pakketten, wel op de volledigheid van het rapport (dat toont dan gewoon geen suggestie voor deze twee).
3. **I-05 (dakkapel) is GEEN herindeling**, in afwijking van het ontwerptabel. De mutatie is een gewone `ruimte-wijzigen(oppervlakteM2)` die `aantalKamers` niet aanraakt; het ontwerp had dit waarschijnlijk losjes naar analogie met I-01 gemarkeerd. Wél `vereist: ['PR-02']` en een verplichte parameter (welke zolder, hoeveel m² erbij).
4. **A-04 is parametervrij**, in afwijking van de "P" in het ontwerptabel. De drempel (8,00 m², §2.13) is een vaste, bekende regel — geen catalogus-vuistregel — dus er valt niets te gokken over hoeveel m² nodig is. De engine berekent zelf het minimale tekort en stelt dat voor.
5. **E-09 blijft het enige echt hybride geval**: parametervrij zodra het huidige label vervallen/vereenvoudigd is (en niet al op de bouwjaarfactor staat) — dan registreert de mutatie simpelweg hetzelfde label opnieuw. Anders (label geldig, of `energielabel: 'Bouwjaar'`) is een doellabel verplicht.
6. **"Gat in de catalogus"-detectie** (§1, laag C van het ontwerp) zit in `suggesties.ts`, niet in `marge-analyse.ts`: de marge-analyse blijft puur diagnostisch (geen catalogus- of eurokennis); de orchestrator upgrade een `poort-niet-gehaald`-signaal naar `gat-in-catalogus` zodra geen enkele gegenereerde kandidaat op die ruimte een positieve jaarhuur oplevert, en rekent dan een synthetisch "alle basiseisen/extra-eisen op waar"-scenario door voor het `geschatteJaarhuurEuro`-veld — ook dit is dus een echte herrekening, geen schatting.
7. **Riders zijn kostenrider-only.** `vereist: ['K-02']` (enabler-maatregelen als K-02, S-06, PR-02, E-09) telt alleen de investering mee; de enabler-maatregel genereert zelf geen mutaties (er is geen puntenimpact of datamodel-veld om aan te koppelen — bijv. "ventilatie aangebracht" heeft geen eigen boolean in `SanitairVoorziening`).

## Bugfix na oplevering (2026-08-20)

Bij een vraag over de video-intercom (X-01) bleek `hoeveelheid` in de registry-definitie op `pand.aantalKamers` te staan, terwijl de catalogus-eenheid "per pand" is (één systeem, niet één per kamer). `kosten.ts` vermenigvuldigt de catalogusprijs rechtstreeks met `hoeveelheid`, dus de investering kwam voor een zes-kamer-pand 6× te hoog uit (€10.890 in plaats van €1.815). Gefixt in `registry/r12-bijzonder.ts`; twee regressietests toegevoegd aan `registry.test.ts` (193/193 groen). Tegelijk bevestigd, met echte cijfers: X-01's punteneffect (0,25 pt, gedeeld door het aantal kamers met toegang, §2.1.5) is op een pand van zes kamers 0,25 ÷ 6 ≈ 0,042 pt per kamer — ver onder de 0,125 die nodig is voor zelfs maar één kwartpunt. De catalogustekst ("0,25 pt per kamer") is dus misleidend voor panden met meer dan twee kamers; dat is precies waarom de suggestie-engine die tekst nooit gebruikt en altijd echt doorrekent.

Bij het systematisch doorrekenen van alle 49 maatregelen (om te bepalen welke een prominente plek in de UX verdienen) kwam een tweede, ernstiger bug boven water: **S-02 en S-03 (nieuwe toilet-/badruimte) gebruikten bij het toepassen het ruimtenummer dat al bij het GENEREREN van de kandidaat was bepaald** (tegen de as-is), in plaats van het — zoals alle andere `ruimte-toevoegen`-maatregelen (B-01/02/03) al deden — opnieuw te berekenen tegen de staat op het moment van toepassen. Zat er een andere nieuwe-ruimte-maatregel met hetzelfde as-is-nummer in hetzelfde pakket, dan crashte `pasScenarioToe` met "ruimte X bestaat al". Gefixt in `registry/r6-sanitair.ts` (dezelfde `volgendeVrijeRuimteNr`-aanpak als B-01/02/03); regressietest toegevoegd aan `pakketten.test.ts`.

Een derde bevinding uit dezelfde doorrekening, geen bug maar een ontbrekende alternatievengroep: **E-01 t/m E-08 (isolatie-/installatiemaatregelen) leverden bij hetzelfde doellabel elk exact dezelfde punten op** — logisch, want R4 kent alleen het eindlabel, niet de onderliggende bouwfysica, en de generieke pakketopbouw wees de redundante maatregelen toevallig al af via "geen marginale winst". Nu expliciet gemaakt: alle acht delen de `alternatiefGroep: 'energielabel'` in `registry/r4-energie.ts` (voorheen had alleen E-04/E-05 een — te smalle — `glas`-groep), zodat de pakketopbouw er bewust maar één accepteert en dat ook als zodanig kan verklaren. Regressietest toegevoegd aan `pakketten.test.ts` (195/195 groen).

**UX-implicatie voor taak 13/14**, expliciet vastgelegd omdat dit de bedoelde werkwijze is: energiemaatregelen horen in de UI niet als acht losse kansen met acht puntenlabels te verschijnen, maar als "kies een doellabel — hier is de goedkoopste manier om daar te komen" (precies hoe een EP-adviseur het in de praktijk aanpakt). Combineren van meerdere isolatiemaatregelen om een HOGERE labelsprong te halen dan elk apart (bijv. spouw + vloer + glas samen naar B in plaats van elk naar C) kan en moet deze engine niet zelf berekenen — welke combinatie tot welk label leidt is een formele NTA 8800-berekening, geen vuistregel om te gokken (harde regel 4). Dat blijft mensenwerk; E-09 dekt het moment waarop een nieuwe EP-adviseur-opname zelf als kostenpost meetelt.

**Bekende grens van de fix** (gedocumenteerd in de code): de `alternatiefGroep`-dedupsleutel is `(groep, doel)`, en `doel` bevat voor deze maatregelen geen `nr` (het gaat om het hele pand) — dus als de E-maatregelen ooit in één run met UITEENLOPENDE doellabels tegelijk worden aangeroepen, blokkeren ze elkaar ten onrechte. Voor de bedoelde werkwijze (één doellabel per run) is dat geen probleem.

## Bugfix: verworpen kandidaten verdwenen stil tussen de pakket-tiers (2026-08-20)

Bij het dichten van een testdekkingsgat (K-04/K-06/K-07 waren op beide bestaande fixtures nooit als kandidaat gegenereerd, omdat de testkeuken de bijbehorende voorzieningen al had) kwam een derde, structurele bug aan het licht: **elke tier (Basis/Comfort/Maximaal) gaf in `stelPakkettenSamen` alleen zíjn EIGEN afwijzingen door aan `Pakket.verworpen`**, niet de afwijzingen uit voorgaande tiers. Omdat elke pool t.o.v. de vorige tier alleen de nieuwe kandidaten bevat (`comfortNieuw`/`maximaalNieuw` sluiten alles uit wat al in een eerdere pool zat), wordt een in Basis afgewezen kandidaat in Comfort en Maximaal nooit opnieuw geprobeerd — maar stond hij alleen nog in `basis.verworpen`, dan verdween hij bij het doorschuiven naar Comfort/Maximaal spoorloos uit zowel `regels` als `verworpen`. Concreet aangetoond: op een keuken zonder koelkast/afzuiginstallatie/magnetron werden K-04 en K-07 terecht in de Basis-tier afgewezen (K-06/K-03/K-08 hadden de R5-afrondingssprong al gepakt), maar ontbraken zonder de fix volledig in het Comfort- en Maximaal-rapport.

Gefixt in `pakketten.ts` (`stelPakkettenSamen`): de `verworpen`-lijst van elke tier is nu de opgetelde lijst van alle voorgaande tiers plus de eigen nieuwe afwijzingen, met een filter die uitsluit wat er (in theorie) alsnog is geaccepteerd. Twee regressietests toegevoegd: een gerichte test in `pakketten.test.ts` die het exacte mechanisme reproduceert, en een aanscherping van de K-04/K-06/K-07-dekkingstest in `registry.test.ts` (201/201 groen).

## Bevinding: terugverdientijd van vast-geprijsde structurele maatregelen is extreem parametergevoelig (geen bug)

Bij de doorrekening viel op dat I-03 (dragende wand weg) op het testpand een terugverdientijd van 87,8 jaar gaf bij een testparameter van 2 m² extra oppervlakte. Geverifieerd met oplopende parameterwaarden op dezelfde kandidaat:

| m² erbij | investering | extra jaarhuur | terugverdientijd |
|---|---|---|---|
| 2 m² | € 10.769 | € 122,64 | 87,8 jaar |
| 5 m² | € 10.769 | € 732,24 | 14,7 jaar |
| 10 m² | € 10.769 | € 854,88 | 12,6 jaar |
| 20 m² | € 10.769 | € 1.832,40 | 5,9 jaar |

Geen bug: I-02, I-03 en I-05 hebben in de catalogus een **vaste** prijs (`eenheid: "per project"` / `"per stuk"`) — dezelfde investering ongeacht hoeveel m² erbij komt (`hoeveelheid` staat in de registry terecht op 1, niet gekoppeld aan `extraOppervlakteM2`, want de catalogusprijs is nu eenmaal geen prijs-per-vierkante-meter). De extreem slechte TVT bij 2 m² is dus een correcte weergave van de werkelijkheid (een dragende wand slopen voor een kleine winst is zelden rendabel), niet een rekenfout — en zegt vooral iets over de willekeurige testparameter, niet over de maatregel zelf.

**UX-implicatie voor taak 13/14**: omdat de terugverdientijd van deze maatregelen zo gevoelig is voor de door de gebruiker gekozen m²-uitbreiding, moet het scherm dit niet als een vast getal tonen maar als een interactief element (bijv. een schuifje of getalveld met directe hertelling — sluit aan bij de "directe hertelling in de browser"-eis van taak 14) zodat de gebruiker zelf het omslagpunt kan vinden. Geen implementatie nu, wel vastgelegd als ontwerpaandachtspunt.

## Bekende beperking (bewust niet opgelost)

De greedy pakketopbouw-met-één-stabilisatiepass vindt geen paar kandidaten die **allebei solo €0** opleveren maar alleen **samen** winst geven (een "echte wederzijdse afhankelijkheid") — zie de uitgebreide toelichting in `pakketten.ts` bij `bouwTier`. Voor de huidige kostencatalogus (49 maatregelen) is hier geen bekend geval van: elke maatregel met puntenimpact heeft op zichzelf al een reëel effect op minstens één kamer in de geteste fixtures. Wél correct afgehandeld: het veelvoorkomende geval waarin minstens één kandidaat solo al positief is (de sortering op terugverdientijd bepaalt dan vanzelf een gunstige toevoegvolgorde — zie `additiviteit.test.ts`).

Mocht dit ooit spelen: de aanbevolen, begrensde oplossing is de stabilisatiepass uit te breiden met een test van PAREN uit de resterende verworpen kandidaten (niet drietallen of meer, om combinatorische explosie te voorkomen).

## Niet geïmplementeerd / bewust buiten scope

- BTW blijft een conservatieve 21%-aanname; de xlsx-kolom "BTW-grondslag / inclusief-exclusief" is nog niet toegevoegd (voorstel staat in het ontwerp-artifact, §5/open vraag 3).
- Huurderving (PR-06) is opt-in en staat standaard uit.
- ΔBAR is `null` tenzij de aanroeper `verwervingswaardeEuro` meegeeft — geen waardeveld op `Pand` (zou de fase-4-grens met de rendementscalculator doorbreken).
- Per-kamer terugverdientijd voor gedeelde maatregelen wordt niet berekend (zou een verzonnen verdeelsleutel vereisen).
- UI/scherm voor de suggesties — dat is taak 13.

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/suggesties/**` (17 bestanden + 7 testbestanden)
- Nieuw: `packages/engine/src/fixtures/testpand-suggesties.ts`
- Gewijzigd: `packages/engine/src/scenario/types.ts`, `toepassen.ts` (twee nieuwe mutatiesoorten: `aanbelfunctie-toevoegen`, `aftreksituatie-wijzigen`)
- Gewijzigd: `packages/engine/src/eindtelling/types.ts`, `eindtelling.ts` (`rubriekenRuw` toegevoegd, puur additief)
- Gewijzigd: `packages/engine/src/index.ts` (export van `suggesties/`)

## Verificatie (hoe te testen)
- `pnpm test` → 191/191 groen (21 nieuw, 170 ongewijzigd — golden master blijft exact)
- `npx tsc --noEmit` in `packages/engine` → geen fouten
- `npx eslint packages/engine/src/suggesties` → schoon
- Testdekking volgens het testplan uit het ontwerp: bijectie/brontekst-drift (`registry.test.ts`), de kernclaim van de taakomschrijving met een échte maatregel (`afronding.test.ts`), niet-additiviteit met een echt, doorgerekend restpost-voorbeeld (`additiviteit.test.ts`), de ondiepe-merge-valkuil (`patch-clobber.test.ts`, incl. een test die aantoont wat er zónder de fix mis zou gaan), Basis⊆Comfort⊆Maximaal + monotone investering/jaarhuur + oplopende TVT (`pakketten.test.ts`, ook getest op de oorspronkelijke zes-kamer-fixture), determinisme (`determinisme.test.ts`) en het rekenbudget (`budget.test.ts`).

## Volgende stap
Taak 12 (toelichtingsdeck) is al opgeleverd, vóór deze implementatie — zie de artifacts. Volgende in `plan/plan.md`: Fase 3, taak 12 (Invoerscherm inclusief kamertoewijzing) — **`⬆ Opus`** voor het UX-voorstel, Sonnet voor het bouwen. Let op de nummeringsverschuiving: het toelichtingsdeck droeg zelf het label "taak 12" in de briefing van de gebruiker, maar `plan/plan.md`'s taak 12 (het invoerscherm) is ongewijzigd de eerstvolgende stap in de hoofdvolgorde.
