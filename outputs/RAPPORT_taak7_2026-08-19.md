# Rapport: Taak 7 — Eindtelling, huurprijs-lookup, monumentopslag — 2026-08-19

## Wat er gedaan is

Nieuw package-onderdeel `packages/engine/src/eindtelling/`, los van `rubrieken/` omdat het geen rubriek is maar de optelling ervan: §2.1.7/§2.1.8 (eindsaldering en extrapolatie), §2.12.1 (zorgwoning-opslag, bewust aangehouden uit taak 6) en §2.14 (monumentopslagen, volledig nieuw — `wwso.xlsx` had dit niet).

### Datamodel
- **`Pand.huurovereenkomstDatum`** (optioneel) — nodig omdat §2.14.3 de vorm van de Rijksmonumentopslag laat afhangen van de contractdatum. Verplicht gemaakt in `PandInvoer.superRefine` zodra `monument: 'Rijks'`.

### `huurprijs.ts` — `bepaalMaxHuur`
Tabel-lookup voor 0-250 punten, met extrapolatie erboven (§2.1.8): elk punt boven 250 tegen het verschil tussen de bedragen bij 249 en 250, opgeteld bij het bedrag bij 250 (briefing B15 — de tabel zelf stopt bij 250). Een negatief puntenaantal (mogelijk door de R13-aftrek) wordt op 0 geklemd; het beleidsboek kent geen negatieve huurprijs.

### `monumentopslag.ts` — `bepaalMonumentopslag`
- **Rijksmonument**: contract op/na 1 juli 2024 → +35% op de huurprijs; contract ervóór → +10 punten in plaats daarvan (§2.14.3, briefing B14).
- **Gemeentelijk/provinciaal monument**: +15% (§2.13.4 — let op, zo genummerd in het beleidsboek zelf onder de kop "2.14 Opslagen"; een numeringsinconsistentie in de bron, net als D1/D4 uit de eerdere briefing).
- **Beschermd dorpsgezicht**: +5%, maar alléén bij een bouwjaar vóór 1965 (§2.13.5) — anders 0%, met een toelichtingsregel waarom.
- Rijks, Gemeente/Provinciaal en Beschermd dorpsgezicht sluiten elkaar **structureel** uit doordat `Pand.monument` een enkelvoudig veld is; er is dus nooit een percentagecumulatie om over na te denken in dit model (§2.14.1 is hiermee automatisch gerespecteerd).

### `eindtelling.ts` — `berekenEindtelling`
Roept alle dertien `berekenRn`-functies zelf aan en telt ze per kamer op, in deze volgorde:
1. R1 t/m R11 optellen (elk al kwartpunt-afgerond door de eigen rubriek, §2.1.6).
2. Bij een zorgwoning dat subtotaal ×1,35 (§2.12.1) — dit is een aanpassing van het subtotaal, geen eigen kwartpuntafronding.
3. R12 en R13 daarna optellen.
4. Eindsaldering op hele punten (§2.1.7).
5. Bij een Rijksmonument met een contract van vóór 1 juli 2024: +10 punten, ná de eindsaldering — dit zijn geen rubriekpunten maar een monumentopslag.
6. Huurprijs-lookup met extrapolatie.
7. Percentage-opslag toepassen op de huurprijs.

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/eindtelling/{types,huurprijs,monumentopslag,eindtelling,index}.ts` + testbestanden
- Gewijzigd: `packages/engine/src/types/{pand,pand-invoer}.ts`, `packages/engine/src/index.ts`

## Interpretatiekeuzes

1. **De zorgwoning-vuistregel van R9 (§2.9.4, taak 6) telt ook mee in de +35%-opslag van R12.1.** R9's vuistregel van 3 punten/woning is zelf al onderdeel van het R1-11-subtotaal, en het beleidsboek zegt nergens dat die waarde is uitgezonderd van de daaropvolgende opslag. Beide bepalingen (§2.9.4 en §2.12.1) staan los van elkaar en worden dus gestapeld: eerst de vuistregel binnen R9, dan de blanket +35% over het hele R1-11-subtotaal inclusief die 3 punten. **Praktisch gevolg dat bij het testen naar boven kwam**: een zorgwoning-vlag zonder ingevoerde gemeenschappelijke ruimtes verhoogt het subtotaal alsnog met 3 punten (R9) plus 35% over alles — verrassend als je het niet verwacht, maar een directe consequentie van hoe §2.9.4 is geformuleerd (een pand met de zorgwoning-voorwaarden heeft per definitie gemeenschappelijke ruimten, zie §2.12.1 voorwaarde 4).
2. **Rijksmonumentpunten ná de eindsaldering, niet ervoor.** De +10 punten uit §2.14.3 zijn een monumentopslag, geen rubriekpunt dat meetelt in de "som van alle rubrieken" uit §2.1.7. Alternatief was: de 10 punten vóór de afronding op hele punten optellen. Omdat 10 een geheel getal is, maakt dit voor de uitkomst zelf niets uit — het is puur een kwestie van waar in de pijplijn het conceptueel hoort.
3. **`huurovereenkomstDatum` alleen verplicht bij `monument: 'Rijks'`.** De andere monumentcategorieën hebben geen contractdatum-afhankelijkheid, dus geen noodzaak om de gebruiker dat overal te laten invullen.

## Bug gevonden en gefixt tijdens het testen
`test-utils.ts` (`maakPandInvoer`) gaf een **gedeelde singleton** terug als default voor `handmatigePosten` wanneer de aanroeper er zelf geen meegaf. Een test die het geretourneerde object direct muteerde (`input.handmatigePosten.zorgwoning = true`, in plaats van een eigen object mee te geven) muteerde daarmee ongemerkt ook de default voor élke andere test die na hem in dezelfde run dezelfde default aanriep — testvolgorde-afhankelijk falen, precies het patroon dat bij het schrijven van de eindtelling-tests naar boven kwam. Omgezet naar een fabrieksfunctie die telkens een vers object teruggeeft. Zuiver een testinfrastructuur-fix, raakt geen productiecode.

## Niet geïmplementeerd / bewust buiten scope
- **§2.11.3/§2.11.4** (taxatiewaarde bij tijdelijke woningen, `gebouwd eigendom in aanbouw`) — nog steeds niet gekoppeld aan een taak, ongewijzigd sinds taak 6.
- **Rondingen op de definitieve huurprijs** — afgerond op 2 decimalen na de percentage-opslag; het beleidsboek zegt hier niets expliciets over, maar de tabel zelf werkt al op centen.

## Verificatie (hoe te testen)
- `pnpm test` → 120/120 groen (15 nieuw)
- Extrapolatieformule (§2.1.8) getest met het verschil 250↔249 punten (€5,27/punt) uit de eigen tarieventabel
- Alle vier monumentcategorieën en de contractdatum-vertakking bij Rijksmonumenten expliciet getest
- `npx tsc --noEmit` in `packages/engine` → geen fouten
- `npx eslint packages/engine packages/data` → schoon

## Volgende stap
Taak 8: golden-master validatie tegen `wwso.xlsx` en 3-5 panden van de officiële huurprijscheck-site. Dit is nu de eerste taak die de **volledige** rekenketen (R1 t/m R13 + eindtelling) tegen een externe referentie zet. Verwacht enkele verschillen die terug te voeren zijn op de correcties uit taak 4-7 — bij twijfel geldt de rangorde beleidsboek → huurprijscheck-site → xlsx (**`⬆ Opus`** zodra zo'n afwijking optreedt, per `plan/plan.md`).
