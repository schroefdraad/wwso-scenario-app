# Briefing: beleidsboek WWSO versus wwso.xlsx — 2026-08-19

## Aanleiding

Bij het voorbereiden van taak 5 (keuken en sanitair) bleken de twee beschikbare bronnen elkaar tegen te spreken over de capping van sanitaire extra's. Geen van beide bronnen was het beleidsboek zelf: de `Toelichting`-tab van `wwso.xlsx` is jouw interpretatie ervan, en `prompts/PROMPT_claude_code_wwso_app.md` is de taakomschrijving. Op aanwijzing "volg het beleidsboek" is het originele document opgehaald en integraal doorgenomen.

Deze briefing legt vast wat er afwijkt, wat er klopt, en wat dat betekent voor de al gebouwde code en het verdere plan.

## Bron

**Beleidsboek Waarderingsstelsel onzelfstandige woonruimte, versie januari 2026** — Huurcommissie, 59 pagina's, peildatum gelijk aan onze tarievenset.

<https://www.huurcommissie.nl/site/binaries/site-content/collections/documents/2026/01/01/beleidsboek-woningwaarderingstelsel-onzelfstandige-woonruimte/beleidsboek-woningwaardering-onzelfstandige-woonruimte-januari-2026.pdf>

Staat sinds 2026-08-19 in het project: `resources/beleidsboek/beleidsboek-wwso-2026-01.pdf`, met een `HERKOMST.md` die vastlegt dat dit van de Huurcommissie komt en niet van de gebruiker.

---

## Stand van zaken

Bijgewerkt na de correctieronde en taak 5, beide op 2026-08-19.

| Onderdeel | Status |
|---|---|
| **A1 t/m A7** — fouten in taak 4 | **Opgelost** — zie `outputs/RAPPORT_correctie_taak4_2026-08-19.md` |
| **B1** — rubrieknummering | **Half** — datamodel en `plan.md` gecorrigeerd; taak 6 moet de nieuwe nummering nog implementeren, inclusief de echte rubriek 7 (het model heeft er al een veld voor) |
| **B2 t/m B8** — R5/R6 | **Opgelost** — zie `outputs/RAPPORT_taak5_2026-08-19.md` |
| **B9 t/m B15** — R8 t/m R13, opslagen, >250 punten | **Open** — horen bij taak 6 en 7 |
| **D1 t/m D4** — onduidelijkheden in het beleidsboek | **Blijft open** — waar een keuze gemaakt is, staat die in de code en het bijbehorende rapport |

Nog niet aangepakt en niet aan een taak gekoppeld: de energie-index als alternatief voor het energielabel (§2.4.4), en de taxatiewaarde bij een ontbrekende WOZ-waarde (§2.11.1).

---

## A. Fouten in reeds gebouwde code (taak 4) — opgelost

Deze waren aantoonbaar fout tegen het beleidsboek. Alle zeven zijn op 2026-08-19 gecorrigeerd; de beschrijvingen hieronder zijn in de tegenwoordige tijd van vóór de reparatie blijven staan, zodat naderhand te volgen is wát er misging.

### A1. R3 — verkeersruimten tellen wél mee voor verwarming
**§2.3:** *"Vertrekken, overige ruimtes én verkeersruimtes kunnen punten krijgen als deze zijn verwarmd, namelijk 2 punten per verwarmd vertrek en 1 punt voor overige ruimtes en verkeersruimten."*

De implementatie sluit `Verkeersruimte` volledig uit. Een verwarmde hal levert nu ten onrechte 0 punten in plaats van 1 (binnen het maximum van 4).

### A2. R3 — verkoeling geldt alleen voor vertrekken, en alleen als die ook verwarmd zijn
**§2.3.1:** *"1 punt extra per verwarmd én verkoeld privévertrek (tot maximaal 2 punten)"*
**§2.3.3:** *"Alleen vertrekken komen in aanmerking voor een waardering door een verkoelingsfunctie."*

De implementatie geeft verkoelingspunten aan élke ruimte met `verkoeld: true`, ongeacht verwarming en ongeacht type. Twee gevolgen:
- een verkoelde maar onverwarmde kamer krijgt nu 1 punt, moet 0 zijn
- een verkoelde overige ruimte krijgt nu 1 punt, moet 0 zijn

**De bestaande test `'blijft op 2 punten bij meer dan 2 verkoelde ruimten'` is aantoonbaar fout:** die gebruikt drie privévertrekken met `verwarmd: false, verkoeld: true` en verwacht 2 punten. Het juiste antwoord is 0.

### A3. R1 — afronding gebeurt op vierkante meters, niet op punten
**§2.1.1.1** schrijft een expliciete rekenvolgorde voor:
1. oppervlakte per vertrek op twee decimalen
2. som van álle privévertrekken → afronden op hele m² (≥ 0,50 omhoog, ≤ 0,49 omlaag)
3. hetzelfde apart voor de gemeenschappelijke vertrekken
4. beide optellen en opnieuw afronden op hele m²
5. pas dán 1 punt per m²

De implementatie telt punten op en rondt die af op hele punten. Dat is een andere mechaniek die niet altijd hetzelfde resultaat geeft, en die de scheiding privé/gemeenschappelijk mist.

### A4. R1 — afronding op hele punten is sowieso verkeerd
**§2.1.6:** *"Het totaal aantal punten wordt **per rubriek** afgerond op 0,25 punt, waarbij vanaf een achtste (1/8) punt naar boven wordt afgerond."*

Dit geldt voor élke rubriek. De aanname uit taak 4 dat R1 als enige op hele punten afrondt, komt uit de taakomschrijving en wordt niet gedragen door het beleidsboek. Hele punten komen pas bij de eindsaldering (§2.1.7).

### A5. R2 — zolderruimte zonder vaste trap
**§2.2.2.3:** 5 aftrekpunten op de waarde van het vloeroppervlak, waarbij de zolder nooit negatief kan worden. Niet geïmplementeerd, en er is geen invoerveld voor.

### A6. R4 — energielabel-geldigheid wordt genegeerd
**§2.4.2/§2.4.3:** een label is maximaal 10 jaar geldig, moet vóór de peildatum zijn opgenomen, en labels afgegeven tussen 1 januari 2015 en 1 januari 2021 tellen niet mee (vereenvoudigde labels). Het datamodel heeft `energielabelIngangsdatum`, maar R4 doet er niets mee.

### A7. R4 — monumentuitzondering ontbreekt
**§2.4.6.1:** rijks-, provinciale en gemeentelijke monumenten krijgen **geen minpunten** bij label E, F of G (en bouwjaar 1979 of ouder). De puntentoekenning is dan 0 in plaats van negatief. Niet geïmplementeerd.

---

## B. Afwijkingen in wwso.xlsx zelf

Deze raken het datamodel en de nog te bouwen taken.

### B1. Rubrieknummering klopt niet vanaf R7

| # | Beleidsboek januari 2026 | wwso.xlsx |
|---|---|---|
| 7 | Woonvoorzieningen voor personen met een handicap | Gemeenschappelijke vertrekken |
| 8 | Buitenruimten | Buitenruimten ✓ |
| 9 | Gemeenschappelijke vertrekken, overige ruimten en voorzieningen | Gemeenschappelijke parkeerruimte |
| 10 | Gemeenschappelijke parkeerruimten | Parkeren |

**Rubriek 7 ontbreekt volledig in de xlsx.** Dat is 1 punt per € 332,00 netto-investering in gehandicaptenvoorzieningen, gedeeld door het aantal wooneenheden met toegang (§2.7), met voorwaarden: ingreep op of ná 01-04-1994, gedeeltelijk gesubsidieerd, aangebracht voor de persoon met een handicap.

Praktisch gevolg: `HandmatigePosten.gemeenschappelijkeVertrekken` uit taak 2 heet ten onrechte R7 — dat is R9. En taak 6 ("R7 t/m R13") heeft nu een verkeerde inhoudsopgave.

### B2. R5 — de aanrechttabel mist de nulband en een voorwaarde
**§2.5.2:**

| Lengte aanrecht | Punten |
|---|---|
| Minder dan 1 meter | **0** |
| Tussen 1 en 2 meter | 4 |
| Tussen 2 en 3 meter | 7 |
| Meer dan 3 meter | 10 |
| Meer dan 5 meter | 13 *mits minimaal 8 onzelfstandige wooneenheden toegang en gebruiksrecht hebben* |

De xlsx-tabel (`tbl_keuken_grens` = 2 / 3 / 5 / 99) mist de band "< 1 meter → 0". Een aanrecht van 0,80 m levert daar ten onrechte 4 punten op. De voorwaarde van 8 wooneenheden bij 13 punten ontbreekt eveneens.

Bovendien: een aanrecht korter dan 1 meter kan de spoelbak nog wél als wastafel (1 punt) in rubriek 6 opleveren.

### B3. R5 — basiseisen zijn een harde poort
**§2.5.1:** een keuken moet aan vijf basiseisen voldoen (aan- en afvoer water, vast kookaansluitpunt, aanrechtblad ≥ 1 m in één stuk, twee inbouwkasten ≥ 50 cm, waterdichte wandafwerking ≥ 1,50 m). *"Als een of meer van de basisvoorzieningen niet aanwezig zijn, dan worden geen punten toegekend voor het onderdeel 'keuken'. Dus ook niet voor eventuele extra voorzieningen."*

De xlsx heeft hiervoor geen invoervelden. Het model kan dus niet uitdrukken dat een keuken 0 punten krijgt.

### B4. R5 — extra kastruimte is een aantal, geen ja/nee
**§2.5.3:** 0,75 punt *per 60 cm breedte* boven het minimum. De xlsx modelleert dit als J/N.

### B5. R5 — combi-apparaten tellen dubbel
**§2.5.4:** *"Eén voorziening met twee functies worden als twee losse voorzieningen gewaardeerd."* Een combi-magnetron/oven levert dus zowel magnetron- als ovenpunten; een koel-vriescombinatie met twee aparte deuren zowel koelkast- als vrieskastpunten. Niet gemodelleerd.

### B6. R6 — sanitair zit niet alleen in de badkamer
**§2.6:** *"De waardering van sanitair is niet beperkt tot de badkamer en toiletruimte, maar kan ook gaan over sanitaire voorzieningen in andere ruimten. Bijvoorbeeld een douche in een woon- of slaapkamer."*

De xlsx organiseert sanitair uitsluitend per "Badruimte 1..6". Een douche in een slaapkamer is niet in te voeren.

### B7. R6 — maxima per vertrek voor wastafels
**§2.6.1:** buiten de badkamer geldt maximaal 1 punt per vertrek/overige ruimte voor wastafels, en maximaal 1,50 punt voor meerpersoonswastafels. In de badkamer geldt dat maximum níet (1 punt per wastafel). Uitzondering: bij een adres met 8 of meer onzelfstandige woonruimten vervalt dat maximum voor één ander vertrek.

De xlsx kent alleen "Aantal wastafels (0-4)" per badruimte en modelleert deze maxima niet.

### B8. R6 — extra voorzieningen hebben ook een poort
**§2.6.2:** extra punten alleen als de bad-/doucheruimte voldoet aan vijf eisen (waterdichte vloer, 2,00 m vrije hoogte over ≥ 50%, waterdichte wand tot 1,50/1,80 m, wastafel met mengkraan en spiegel, douche/bad met warm- en koudwateraansluiting). Geen invoervelden in de xlsx.

Verder: kastruimte is gecapt op 0,75 totaal, en stopcontacten gelden maximaal twee **per (meerpersoons)wastafel** — de xlsx zegt max 2 per badruimte.

### B9. R8 — maximum van 15 punten geldt gezamenlijk
**§2.8:** *"Er worden maximaal 15 punten toegekend voor zowel de privé-buitenruimte als gemeenschappelijke buitenruimte samen."* De xlsx-notitie suggereert een maximum per kamer op alleen de privé-buitenruimte.

### B10. R9/R10 — dubbele deling
**§2.9.1 en §2.10.4:** gemeenschappelijke ruimten en parkeerplekken worden **eerst gedeeld door het aantal adressen** in het woongebouw, **daarna door het aantal onzelfstandige wooneenheden** op het eigen adres. Twee delingen, niet één.

Let op: de laadpaal bij een gemeenschappelijke parkeerplek (§2.10.5, 2 punten) wordt **alleen door het aantal adressen** gedeeld, niet ook door de wooneenheden.

### B11. R11 — ontbrekende WOZ-waarde
**§2.11.1:** zonder WOZ-waarde én zonder taxatiewaarde geldt automatisch het laagste puntenaantal (10 punten). Zonder WOZ mag 85% van een taxatiewaarde door een Register-Taxateur gebruikt worden. Niet gemodelleerd.

De drempels zelf kloppen wel: > 10% hoger → 14, binnen ± 10% → 12, > 10% lager → 10.

### B12. R12 — losse laadpaal
**§2.12.3:** een laadpaal exclusief voor bewoners is 2 punten waard binnen rubriek 12. Alleen als die bij een *gemeenschappelijke parkeerruimte* hoort, gaat de rekenmethode van rubriek 10 gelden. De xlsx heeft laadpaal alleen onder parkeren staan.

### B13. R13 — aftrekcriteria net anders geformuleerd
**§2.13:**
- *"Wanneer de totale oppervlakte van het onderdeel vertrekken (rubriek 1) minder is dan 8 m²"* — dus de R1-totaaloppervlakte inclusief het toegerekende aandeel in gedeelde vertrekken, niet alleen het privévertrek zoals de xlsx suggereert
- het verhuurder-criterium is samengesteld: hoofdverblijf van de verhuurder in de woning **én** de woonruimte óf het sanitair uitsluitend bereikbaar via een woon- of slaapvertrek van de verhuurder

### B14. Monumentopslag — de contractdatum bepaalt de vorm
**§2.14.3:** bij een Rijksmonument is de opslag 35% op de maximale huurprijs **als de huurovereenkomst op of na 1 juli 2024 is gesloten**. Bij een contract van vóór 1 juli 2024 worden in plaats daarvan **10 punten extra** toegekend — een puntenopslag, geen prijsopslag.

Verder (§2.14.1): meerdere opslagen worden eerst als percentages opgeteld en dan toegepast, maar monumentopslag en beschermd stads-/dorpsgezicht sluiten elkaar uit. Beschermd dorpsgezicht (5%) kent bovendien eigen voorwaarden: rijksbeschermd gezicht, gebouwd vóór 1965, en niet tevens monument.

### B15. Meer dan 250 punten
**§2.1.8:** boven 250 punten wordt elk extra punt gewaardeerd tegen het verschil tussen de tabelbedragen bij 249 en 250 punten, opgeteld bij het bedrag bij 250. Onze huurprijstabel stopt bij 250 zonder extrapolatie.

---

## C. Bevestigd correct

Belangrijk om te weten wat níet aangeraakt hoeft te worden.

- **Kwartpuntsafronding `FLOOR(x + 0,125; 0,25)`** — §2.1.6, met het expliciete voorbeeld 4,81 → 4,75. De implementatie klopt exact.
- **Eindsaldering op hele punten** (§2.1.7), ≥ 0,5 omhoog. Komt overeen met `ROUND(subtotaal; 0)` uit de xlsx.
- **Delen door het aantal kamers met toegang** — de interpretatiekeuze uit taak 4 wordt bevestigd door §2.1.5 en door de formuleringen per rubriek. Alleen de bewoners met toegang en gebruiksrecht volgens het huurcontract tellen mee.
- **Keuken en badruimte zijn vertrekken** (§2.2.1: *"een ruimte die uitsluitend als keuken, badkamer of doucheruimte is bestemd is altijd een vertrek"*). `VERTREK_TYPES` klopt.
- **Verkeersruimten krijgen geen oppervlaktepunten** in R1/R2 (§2.2.3). Correct uitgesloten.
- **Bouwjaartabel** — de xlsx-grenzen met de "eerste grens ≥ bouwjaar"-lookup geven exact de tabel van §2.4.5, inclusief "1976 of ouder → −0,15". Ook de zorg uit taak 3/4 over een ondergrens blijkt ongegrond.
- **Energielabelfactoren** A++++ t/m G — identiek aan §2.4.4.
- **R6 cap op douche/bad-punten** (§2.6.2, letterlijk *"niet meer zijn dan het totaalaantal punten voor de douche, het bad en/of bad/douche gezamenlijk"*). De `Toelichting`-tab had gelijk, de taakomschrijving was te grof.
- **Bad/douche-combinatie is een eigen categorie van 6 punten** (§2.6.1), die losse telling van douche (3) en bad (5) vervangt.
- **R5 cap op basispunten aanrechtlengte** (§2.5.3) — zoals de xlsx aanneemt.
- **Parkeerpunten** 9 / 6 / 4 voor afgesloten garage / overkapt / open (§2.10.3).
- **Zorgwoning +35% op rubrieken 1 t/m 11** (§2.12) — de xlsx-aanname (TODO-07) is correct. Aanvullend kent §2.9.4 een praktische vuistregel van 3 punten per woning voor gemeenschappelijke ruimten in een zorgwoning.
- **Aanbelfunctie met video 0,25 punt** (§2.12.2).
- **WOZ-drempels** 14 / 12 / 10 punten (§2.11.2).
- **Aftrek 4 punten per situatie**, vier situaties (§2.13).

---

## D. Onduidelijkheden in het beleidsboek zelf

Niet alles is op te lossen door beter lezen.

1. **Rekenvoorbeeld §2.8.4 is intern inconsistent.** Een gemeenschappelijke tuin van 30 m² over 4 wooneenheden geeft 5,625 punten, waarna het beleidsboek stelt: *"Er wordt afgerond op een kwart punt. Het puntenaantal is dan in totaal: 5,60 punten."* Maar 5,60 is geen kwartpunt. Volgens de eigen regel van §2.1.6 (vanaf 1/8 naar boven) hoort 5,625 af te ronden op **5,75**. Voorstel: de regel volgen, niet het voorbeeld, en dit vastleggen als bekende afwijking.

2. **Volgorde van delen en afronden bij R1/R4 is niet expliciet.** §2.1.1.1 rondt m² af per categorie, maar zegt niet waar de deling door het aantal wooneenheden in die volgorde valt. Het voorbeeld in §2.4.4 deelt eerst (40 m² / 4 = 10 m²) en rekent daarna. Voor gedeelde vertrekken met niet-ronde uitkomsten kan dit een kwartpunt schelen. Kandidaat voor de validatie in taak 8.

3. **Maximum van 4 punten in R3 bij gemengd privé/gemeenschappelijk.** §2.3.1 noemt het maximum apart bij de privé-regel en bij de gemeenschappelijke regel. Onduidelijk of dat één gedeeld maximum van 4 is of twee keer 4. De inleiding van §2.3 (*"Voor de laatste twee soorten binnenruimten geldt een maximum van 4 punten"*) suggereert één gezamenlijk maximum. **Gekozen:** één gezamenlijk maximum.

4. **Rekenvoorbeeld §2.6.2 is intern inconsistent** — gevonden bij taak 5. Het voorbeeld beschrijft een bad/douchecombinatie (6 punten) plus vijf punten aan extra voorzieningen, stelt expliciet vast dat die vijf punten *niet* worden afgetopt omdat 5 < 6, en concludeert dan: *"Omdat de badkamer wordt gedeeld door 4 onzelfstandige wooneenheden is het puntenaantal per woonruimte: 6 / 4 = 1,5 punt."* De zojuist toegekende 5 punten vallen daar weg; volgens de eigen redenering van dezelfde alinea hoort er (6 + 5) / 4 = 2,75 uit te komen. **Gekozen:** de regel volgen, niet het voorbeeld.

Dat twee van de rekenvoorbeelden in het beleidsboek hun eigen regels tegenspreken (D1 en D4) is op zichzelf een bevinding: de voorbeelden zijn geen betrouwbare tweede bron naast de regeltekst. Bij een afwijking in taak 8 is dit een serieuze kandidaat-verklaring — ook de huurprijscheck-site kan zo'n voorbeeld gevolgd hebben.

---

## E. Gevolgen voor het plan

### Volgorde van herstel
1. ~~Beleidsboek in het project zetten~~ — staat in `resources/beleidsboek/`
2. ~~Taak 4 corrigeren~~ — A1 t/m A7 opgelost
3. ~~Rubrieknummering in het datamodel rechttrekken~~ — resteert: taak 6 moet de nieuwe nummering implementeren
4. ~~Datamodel uitbreiden voor R5/R6~~ — basiseisen-poorten, sanitair buiten badruimten, aantallen in plaats van ja/nee
5. ~~Taak 5 bouwen~~ — afgerond
6. **Taak 6** — R7 t/m R13 in de gecorrigeerde nummering, met B9 t/m B13 als aandachtspunten
7. **Taak 7** — eindtelling, met B14 (contractdatum monumentopslag) en B15 (extrapolatie boven 250 punten)

### Wat taak 6 uit deze briefing nodig heeft
- **R7 bestaat en ontbrak volledig in de xlsx** (B1) — 1 punt per € 332,00 netto-investering; `HandmatigePosten.woonvoorzieningenHandicap` staat al klaar in het model
- **R8**: het maximum van 15 punten geldt voor privé én gemeenschappelijk sámen (B9)
- **R9 en R10**: dubbele deling — eerst door het aantal adressen, dán door het aantal wooneenheden op het eigen adres (B10). De laadpaal bij een gemeenschappelijke parkeerplek wordt alléén door het aantal adressen gedeeld
- **R11**: zonder WOZ- én taxatiewaarde geldt automatisch 10 punten (B11)
- **R12**: een losse laadpaal is 2 punten binnen deze rubriek (B12)
- **R13**: het 8 m²-criterium slaat op de R1-totaaloppervlakte inclusief het toegerekende aandeel in gedeelde vertrekken, en het verhuurder-criterium is samengesteld (B13)

### Gevolg voor taak 8
De golden-master validatie wint hierdoor aan waarde en verandert van karakter. Er is nu een derde referentie naast de xlsx en de officiële huurprijscheck-site: het beleidsboek zelf. Bij een verschil is de rangorde helder — beleidsboek is leidend, de xlsx is een interpretatie die op de bovenstaande punten aantoonbaar afwijkt.

### Gevolg voor de kostenkentallen
Maatregelen die punten opleveren via een poort (een keuken die niet aan de basiseisen voldoet, een badruimte die niet aan de vijf eisen voor extra voorzieningen voldoet) hebben een sprongsgewijs rendement: de eerste investering die de poort opent, ontsluit ineens alle extra punten. Dat is relevant voor de suggestie-engine van taak 11 en staat haaks op een lineaire vuistregel per maatregel.

---

## F. Aanvulling — precisering §2.6.2 en praktijkgevolg (2026-08-24)

Bij het beantwoorden van een vraag van de gebruiker over sanitair buiten een badruimte bleek de uitleg in B8/C hierboven op één punt onnauwkeurig geformuleerd, ook al was de rekenmotor zelf al correct.

**Letterlijke tekst §2.6.2:** *"Het is mogelijk om extra punten te krijgen voor sanitaire voorzieningen die zich bevinden in een **bad- of doucheruimte**. Maar het aantal punten voor extra voorzieningen kan niet meer zijn dan het totaalaantal punten voor de douche, het bad en/of bad/douche gezamenlijk."*

§2.6.2 is dus op zichzelf al beperkt tot een bad- of doucheruimte — niet "overal met een aftopping erbovenop" zoals eerder in gesprek geformuleerd. Belangrijk: dat is geen apart geëtiketteerd ruimtetype (`Ruimte.type` in het datamodel), maar functioneel bepaald — één van de vijf eisen voor extra punten is zelf al *"een douche of bad met aansluitpunten voor warm en koud water"*. Zonder douche/bad kan een ruimte dus per definitie niet aan die eis voldoen, en is er geen "bad- of doucheruimte" in de zin van dit artikel.

**Waarom de rekenmotor toch al correct was:** `berekenSanitair` (`r6-sanitair.ts`) toetst dit niet via `ruimte.type`, maar via de aftopping `Math.min(extraRuw, doucheBad)` op de sanitaire post zelf. Heeft een post geen douche/bad, dan is `doucheBad = 0` en capt elke extra voorziening (ook bij — inconsistent — wél aangevinkte eisen-checkboxes) automatisch op 0. Dat komt op hetzelfde neer als "dit is geen bad-/doucheruimte, dus §2.6.2 is niet van toepassing", alleen technisch afgedwongen via de aftopping in plaats van een roomtype-check. Geen codewijziging nodig — wel de uitleg in dit document en richting de gebruiker aangescherpt.

**Aanleiding, met een echt gevonden bug:** dezelfde sessie bracht via een gebruikerstest op de Crooswijkseweg-testdeal een bug aan het licht in maatregel S-01 ("wastafel op kamer", `suggesties/registry/r6-sanitair.ts`) — die bood zichzelf altijd aan, ook als de kamer al aan de wastafel-cap zat (§2.6.1: max. 1 punt per vertrek buiten de badkamer), wat een investering voor gegarandeerd 0 punten opleverde. Gefixt met een drempel-check vóór het genereren van de kandidaat, regressietest toegevoegd (`r6-sanitair-registry.test.ts`). Zie `plan/plan.md`, Backlog-sectie, voor het volledige verslag.
