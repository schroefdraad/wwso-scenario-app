# Rapport: Taak 6 — Rubrieken R7 t/m R13 — 2026-08-19

## Wat er gedaan is

Gebouwd op het beleidsboek (§2.7 t/m §2.13), niet op `wwso.xlsx` — die mist R7 volledig en hanteert vanaf R7 een verschoven nummering (briefing B1). De volledige PDF-tekst is lokaal geëxtraheerd naar `resources/beleidsboek/beleidsboek-wwso-2026-01.txt` (met `pdftotext -layout`) om exact te kunnen citeren; de eerdere WebFetch-poging op de PDF gaf onbruikbare, vervormde tekst.

### Tarieven naar `packages/data`
Nieuw bestand `rubrieken7-13_2026-01-01.json`: €332/punt voor R7, de buitenruimte-tarieven (2 + 0,35/m² privé, 0,75/m² gemeenschappelijk, max 15 samen), de R9-tarieven (1 / 0,75 punt per m², 3 punten/woning voor zorgwoningen), de R10-parkeertarieven (9/6/4 + laadpaal 2), de R11 WOZ-drempels (±10% → 14/12/10, onbekend → 10) en de R12/R13-bedragen (aanbelfunctie 0,25, losse laadpaal 2, zorgwoningopslag 35%, aftrek 4/situatie).

### Datamodelwijzigingen
- **`Ruimte`**: nieuw type `'Parkeerplek gemeenschappelijk'` (14e type) en veld `aantalAdressenMetToegang`, verplicht voor de vier typen die dubbel gedeeld worden (`DUBBEL_GEDEELDE_RUIMTE_TYPES`: buitenruimte gemeenschappelijk, gemeenschappelijk vertrek, gemeenschappelijke overige ruimte, parkeerplek gemeenschappelijk) — gevalideerd in `PandInvoer.superRefine`, nooit stilzwijgend op 1 aangenomen.
- **`Pand`**: `wozWaarde` is nu optioneel, met nieuw veld `taxatiewaardeEuro` (§2.11.1).
- **`HandmatigePosten`** volledig herzien:
  - `gemeenschappelijkeVertrekken` (het oude, verkeerd-genummerde R7-veld) **verwijderd** — R9 wordt nu automatisch afgeleid uit de ruimtetypen, niet meer handmatig ingevoerd.
  - `woonvoorzieningenHandicap` werd een array met `kamersMetToegang` per post (was een los aantal) — het beleidsboek deelt door het aantal *personen met een handicap* met toegang, niet door het aantal wooneenheden, en dat moet dus per kamer aanwijsbaar zijn.
  - Nieuw: `aanbelfuncties`, `losseLaadpalen` (beide met `kamersMetToegang`) en `aftrekSituaties` (drie kamerlijsten voor R13).
- **`PandInvoer`**: nieuw veld `parkeerplekken` (R10), plus alle bijbehorende referentiële validatie.

### R7 — Woonvoorzieningen voor personen met een handicap
Volledig nieuw, want volledig afwezig in de xlsx. 1 punt per €332 netto-investering, gedeeld door het aantal personen met een handicap met toegang.

### R8 — Buitenruimten
Privé: 2 punten vast + 0,35/m², waarbij bij meerdere privé-buitenruimten voor dezelfde kamer éérst de oppervlaktes worden opgeteld en dán de vaste 2 punten worden toegepast (anders tellen ze dubbel/drievoudig). Gemeenschappelijk: 0,75/m², dubbel gedeeld (adressen, dan kamers). **Maximum van 15 punten geldt voor privé + gemeenschappelijk sámen** — de xlsx-fout uit briefing B9 is hiermee gecorrigeerd.

### R9 — Gemeenschappelijke vertrekken, overige ruimten en voorzieningen
Niet langer handmatig: afgeleid uit de ruimtetypen 'Gemeenschappelijk vertrek' (1 pt/m²) en 'Gemeenschappelijke overige ruimte' (0,75 pt/m²), dubbel gedeeld. Voor zorgwoningen vervangt de vuistregel van §2.9.4 (3 punten/woning) de m²-berekening volledig, ook als er wél ruimtes zijn ingevoerd — dat is een expliciete keuze, zie interpretatiekeuzes hieronder.

**Neveneffect ontdekt tijdens het bouwen: R3 (verwarming) was te smal.** §2.9.2 zegt dat verwarming/verkoeling/keuken/sanitair in gemeenschappelijke ruimten gewoon volgens het normale stelsel worden gewaardeerd. R5/R6 werkten dit al goed af (ze filteren niet op ruimtetype), maar R3 filterde wél en sloot 'Gemeenschappelijk vertrek' en 'Gemeenschappelijke overige ruimte' uit. Gecorrigeerd met twee lokale type-lijsten binnen `r3-verwarming.ts`, zonder de gedeelde `VERTREK_TYPES`/`OVERIGE_RUIMTE_TYPES` aan te raken (die blijven voor R1/R2 zoals ze waren, anders zou de m²-waardering van R9 daar dubbel in meelopen). Twee tests toegevoegd aan `r3-verwarming.test.ts`.

### R10 — Gemeenschappelijke parkeerruimten
9/6/4 punten per type (bevestigd tegen de xlsx), dubbel gedeeld. De laadpaal (2 punten) wordt **alleen** door het aantal adressen gedeeld, niet ook door de kamers — een letterlijke lezing van §2.10.5, die alleen de adressen-deling noemt (briefing B10).

### R11 — Punten voor de WOZ-waarde
Geen gedeelde ruimte, dus geen deling: elke kamer krijgt hetzelfde puntenaantal. Volgorde: WOZ-waarde → anders 85% van de taxatiewaarde → anders automatisch het laagste puntenaantal (10, briefing B11). Drempels ±10% t.o.v. het COROP-gemiddelde (al aanwezig in de tarievenset sinds taak 3) → 14/12/10.

### R12 — Bijzondere voorzieningen
Alleen de twee échte puntenposten: aanbelfunctie met video (0,25 pt) en losse laadpaal (2 pt), beide gedeeld volgens de algemene regel van §2.1.5 (geen van beide paragrafen noemt zelf een deler expliciet, maar §2.1.4/§2.1.5 stellen die regel algemeen). **De zorgwoning-opslag van +35% (§2.12.1) berekent deze rubriek bewust NIET** — dat is geen puntenbijdrage aan R12 maar een percentage-opslag op het subtotaal van R1-11, die pas bij de eindtelling (taak 7) kan worden toegepast omdat pas dán dat subtotaal bekend is. `handmatigePosten.zorgwoning` blijft daarvoor staan.

### R13 — Aftrekpunten
Vier situaties, elk onafhankelijk −4 punten. De eerste (R1-oppervlakte < 8 m²) berekent de motor zelf via dezelfde grondslag als R1/R4 (`vertrekOppervlakteM2`, dus inclusief het toegerekende aandeel gedeelde vertrekken — briefing B13). De andere drie (verhuurdercriterium, ruitoppervlakte, raamkozijnhoogte) zijn niet uit de ruimte-invoer af te leiden en komen uit `handmatigePosten.aftrekSituaties`.

## Bestanden gewijzigd
- Nieuw: `packages/data/src/tarieven/2026-01-01/rubrieken7-13_2026-01-01.json`
- Nieuw: `packages/engine/src/rubrieken/{r7-woonvoorzieningen-handicap,r8-buitenruimten,r9-gemeenschappelijke-ruimten,r10-parkeren,r11-woz-waarde,r12-bijzondere-voorzieningen,r13-aftrekpunten}.ts` + testbestanden
- Nieuw: `resources/beleidsboek/beleidsboek-wwso-2026-01.txt` (lokale tekstextractie, geen bron zelf — de PDF blijft leidend)
- Gewijzigd: `packages/data/src/tarieven/{types,index}.ts`, `packages/engine/src/types/{ruimte,pand,handmatige-posten,pand-invoer,voorzieningen,index}.ts`, `packages/engine/src/rubrieken/{gedeeld,index,test-utils,r3-verwarming}.ts` (+ test), `packages/engine/src/fixtures/testpand-6kamers.ts`, `packages/engine/src/types/pand-invoer.test.ts`

## Interpretatiekeuzes

1. **§2.9.4-vuistregel overschrijft altijd.** Bij een zorgwoning vervangen de 3 punten/woning de m²-berekening volledig, ook met ingevoerde ruimtes. Alternatief was: alleen toepassen als er géén ruimtes zijn ingevoerd. Gekozen voor de letterlijke, deterministische lezing — zorgwoning is toch al gekoppeld aan de +35%-opslag in R12, dus het is een bewuste bundelkeuze van de gebruiker.
2. **§2.1.4/§2.1.5 als algemene deelregel voor R12.2/R12.3.** Geen van beide paragrafen noemt zelf een deler, maar de algemene regel ("de punten die voor een gemeenschappelijke ruimte of gedeelde voorziening gelden, worden verdeeld over alle bewoners die er gebruik van mogen maken") is expliciet rubriek-overstijgend geformuleerd.
3. **Privé-buitenruimte: som eerst, dan de vaste 2 punten.** Volgt direct uit het rekenvoorbeeld ("10 m² privé-buitenruimte (**totaal**)") en uit §2.8.6, dat oppervlaktes per categorie laat optellen vóór de puntenberekening.
4. **`aantalAdressenMetToegang` is een nieuw verplicht veld per ruimte**, in plaats van een aanname op `pand.aantalWoningenInComplex`. Een gedeelde ruimte kan met minder adressen gedeeld worden dan het hele complex telt; harde regel 4 verbiedt de kortere weg.

## Niet geïmplementeerd / bewust buiten scope
- **R11 taxatiewaarde bij tijdelijke woningen (§2.11.3)** en **`gebouwd eigendom in aanbouw` (§2.11.4)** — randgevallen, niet gekoppeld aan een taak.
- **De opslagen van §2.14** (monument 35%/10 punten, gemeentelijk/provinciaal 15%, beschermd dorpsgezicht 5%) — expliciet taak 7, niet taak 6, omdat ze op het totaal van alle rubrieken werken.
- **De zorgwoning-opslag zelf toepassen** — zie hierboven, ook taak 7.

## Verificatie (hoe te testen)
- `pnpm test` → 105/105 groen (32 nieuw, waaronder 2 nieuwe R3-tests)
- Rekenvoorbeeld §2.8.1 (10 m² privé = 5,5 pt) en §2.8.2 (5,625 → 5,75 volgens de regel, niet het inconsistente "5,60" uit het voorbeeld zelf — zie briefing D1) zitten letterlijk in de tests
- `npx tsc --noEmit` in `packages/engine` en `packages/data` → geen fouten
- `npx eslint packages/engine packages/data` → schoon

## Volgende stap
Taak 7: eindtelling. Rubrieken R1 t/m R13 optellen per kamer, kwartpuntsafronding is al per rubriek gebeurd, dus alleen nog de eindsaldering op hele punten (§2.1.7). Daarna de zorgwoning-opslag (+35% op R1-11, aangehouden uit taak 6), de monumentopslagen (§2.14, met de contractdatum-vertakking bij Rijksmonumenten uit briefing B14) en de huurprijs-lookup — inclusief extrapolatie boven 250 punten (briefing B15, §2.1.8), waar de huidige tabel nog bij stopt.
