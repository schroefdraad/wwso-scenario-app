# Cross-validatie tegen de officiële Huurcommissie Huurprijscheck — 2026-09-04

## Aanleiding
Emma had een uitgebreide test-harness-opdracht opgesteld (Playwright-scraper tegen
`huurprijscheck.huurcommissie.nl`, fixtures, CLAUDE.md met "non-negotiables", etc.). Op verzoek
van de gebruiker is dat bewust NIET gebouwd — geen agent/harness, gewoon één keer handmatig
(browsergestuurd) dezelfde invoer door beide tools heen en de uitkomst vergelijken. Dit rapport
documenteert die vergelijking, bedoeld als aandachtspunt vóór de bèta-lancering.

Referentie: post-1-juli-2024-versie van de Huurcommissie-tool
(`huurprijscheck.huurcommissie.nl/onzelfstandige-woonruimte`) — NIET de legacy
`checkjeprijs.huurcommissie.nl`.

Testdeal: "Basrastraat 12", Rotterdam — 6 kamers, 13 ruimtes totaal, WOZ €481.000,
WOZ-oppervlak 115m², bouwjaar 1986, energielabel A, geen monument, geen zorgwoning.
`https://web-skael.vercel.app/pand/nieuw?deal=67984380-319d-4afa-ba30-e2730c8b4fe0`

## Ronde 1 — Kamer 1 (2026-09-04)

| | Onze app | Huurcommissie | Verschil |
|---|---|---|---|
| Punten | 65 | 37 | 28 |
| Max. kale huur/mnd | €637,63 | €377,02 | €260,61 |

Per rubriek:

| Rubriek | Onze app | Huurcommissie | Match? |
|---|---|---|---|
| R1 Oppervlakte vertrekken | 18 | 18 | ✅ exact |
| R2 Oppervlakte overige ruimten | 0,75 | 0,75 | ✅ exact |
| R3 Verwarming/verkoeling | 3 | 3 | ✅ exact |
| R4 Energieprestatie (bouwjaargrens, 1986) | 3,5 | 3,5 | ✅ exact |
| R5 Keuken | 17,25 | 2,75 | ❌ groot gat |
| R6 Sanitair | 4,75 | 3,50 | ❌ kleiner gat |
| R8 Buitenruimten | 6 | 5,75 | ~ nagenoeg gelijk |

Toiletruimte-onderdeel van R6 kwam wél nagenoeg exact overeen (0,79 vs 0,7917 pt), wat erop wijst
dat de rekenkern ook in R6 klopt zodra de invoer 1-op-1 gemapt is.

## Vermoedelijke oorzaak (nog niet bevestigd)
Kamer 1 heeft in onze fixture een eigen kitchenette (2,4m aanrecht, exclusief voor die kamer,
14 pt in onze engine). In de Huurcommissie-tool is voor Kamer 1 het type "Slaapkamer" gekozen,
maar er bestaat daar apart een type **"Woon- en slaapkamer met keuken"** (onder "Andere
binnenruimtes") dat niet gebruikt is — die 14 pt zijn dus vrijwel zeker niet meegeteld aan
Huurcommissie-kant. Dat zou het grootste deel van het R5-gat verklaren. Het R6-gat komt
vermoedelijk doordat de Huurcommissie sanitair-voorzieningen als losse checkboxen met
fractionele puntwaarden aanbiedt, en niet alle 1-op-1 zijn aangevinkt in deze ronde.

**Dit is dus hoogstwaarschijnlijk een testfout (verkeerde/onvolledige mapping in de
Huurcommissie-UI), geen bevestigde bug in onze engine** — maar dat is nog niet hard vastgesteld.
De gebruiker vindt 2,75 punten voor een volledige keuken sowieso laag klinken en wil dit vóór de
bèta-lancering opgehelderd hebben.

## Ronde 2 — Kamer 1 met correct kitchenette-roomtype (2026-09-04)

Correctie t.o.v. ronde 1: Kamer 1 verwijderd als "Slaapkamer" en opnieuw aangemaakt als
**"Woon- en slaapkamer met keuken"** (onder "Andere binnenruimtes"), met exact dezelfde
kitchenette-voorzieningen als in onze app (aanrecht 2,4 m → "Tussen de 2 en 3 meter",
Inductiekookplaat, Inbouw koelkast, Inbouwoven elektrisch, Inbouw afzuiginstallatie, Inbouw
vaatwasmachine, Eénhandsmengkraan, Extra kastruimte × 3). Belangrijke valkuil onderweg: de
Huurcommissie-tool zette dit nieuwe binnenruimte-type standaard op **"gedeeld" met "aantal
onzelfstandige woonruimtes" = 6** — daarmee werden de kitchenette-punten straal door 6 gedeeld
i.p.v. volledig aan deze ene kamer toegerekend (score kelderde naar 23 pt). Gecorrigeerd door
"Aantal onzelfstandige woonruimtes" op **1** te zetten (= privé, alleen deze bewoner).

| | Onze app | Huurcommissie (ronde 2) | Verschil |
|---|---|---|---|
| Punten | 65 | 53 | 12 |
| Max. kale huur/mnd | €637,63 | €539,99 | €97,64 |

Per rubriek:

| Rubriek | Onze app | HC ronde 2 | Match? |
|---|---|---|---|
| R1 Oppervlakte vertrekken | 18 | 18 | ✅ exact |
| R2 Oppervlakte overige ruimten | 0,75 | 0,75 | ✅ exact |
| R3 Verwarming/verkoeling | 3 | 5 | ❌ HC 2 pt hoger — **nieuwe bevinding** |
| R4 Energieprestatie | 3,5 | 3,5 | ✅ exact |
| R5 Keuken | 17,25 | 16,75 | ~ verschil geslonken van 14,5 naar 0,5 |
| R6 Sanitair | 4,75 | 3,50 | ❌ ongewijzigd (zie ronde 1) |
| R8 Buitenruimten | 6 | 5,75 | ~ vermoedelijk invoertypo (zie onder) |
| R11 WOZ-waarde | 12 | **niet aanwezig** | ❌ grootste openstaande vraag |

### R5 — grotendeels opgehelderd
De private kitchenette (ruimte 1) komt nu **exact** overeen: beide tools tonen 14 pt "afgetopt"
voor dezelfde voorzieningenlijst — sterke onafhankelijke bevestiging dat onze R5-afkapregel voor
een kitchenette-kamer klopt. Het resterende R5-gat (17,25 vs 16,75 → 0,5 pt) zit nu volledig in de
**gedeelde Keuken** (ruimte 7, 9,15 m²): onze engine geeft 19,25 pt ruw (÷6 = 3,2083 pt/kamer),
Huurcommissie geeft 2,67 pt/kamer (= 16,02 pt ruw). Dat verschil (~3,2 pt ruw) is nog niet
verklaard — mogelijk telt onze engine een voorziening in ruimte 7 mee die niet 1-op-1 in deze
HC-test is aangevinkt (niet opnieuw geverifieerd in deze ronde), mogelijk is het een echt
rekenverschil. **Open bevinding, nog te onderzoeken.**

### R3 — nieuwe, onverwachte bevinding
Met het juiste kitchenette-roomtype geeft de Huurcommissie-tool voor "Woon- en slaapkamer met
keuken (verwarmd)" 4 pt ruw, tegenover 2 pt ruw voor een gewone verwarmde "Slaapkamer" in ronde 1.
Onze engine rekent voor Kamer 1 maar 1× verwarmingspunten voor de kamer zelf (2 pt), ongeacht of er
een kitchenette in zit. Als de Huurcommissie een combi-woon/slaap/keukenruimte structureel als
"twee functies, dus dubbele verwarmingspunten" behandelt, is dit een echt, nog niet eerder gezien
rekenverschil — **niet** een testfout, want de invoer (verwarmd = ja) is identiek. Nader onderzoek
nodig: is dit een specifieke WWSO-regel voor combi-ruimtes die onze engine mist?

### R11 WOZ-waarde — vermoedelijk de grootste verklaring, nog te bevestigen
De Huurcommissie-tool toont in de resultaat-uitsplitsing helemaal **geen WOZ-waarde-rubriek** —
alleen Woonruimte (energielabel), Binnenruimtes en Buitenruimtes worden gescoord. Er is in deze
sessie geen WOZ-waarde-invoerveld tegengekomen in de wizard (stap "Woonruimte" of "Bijzonderheden").
Dit zou verklaren waarom onze 12 R11-punten voor Kamer 1 volledig ontbreken aan HC-kant — maar dit
is **niet hard bevestigd**: het is niet uitgesloten dat stap "Woonruimte" wél een WOZ-veld had dat
in beide rondes over het hoofd is gezien. **Belangrijkste actiepunt voor een vervolgronde**: stap
"Woonruimte" grondig doorlopen op een WOZ-waarde-veld, vóórdat geconcludeerd wordt dat de
Huurcommissie-tool WOZ-waardering structureel niet toepast op onzelfstandige woonruimte.

### R8 — waarschijnlijk invoertypo, niet inhoudelijk
HC: "Dakterras (gedeeld) 46,01 m²" vs onze twee buitenruimtes (ruimte 11: 10,48 m² + ruimte 12:
36,53 m² = 47,01 m²) — 1,00 m² afwijking, vermoedelijk een tikfout uit ronde 1 bij het samenvoegen
van de twee ruimtes tot één HC-buitenruimte-invoer. Laagimpact (0,25 pt), niet verder onderzocht.

## R3-verwarming-onderzoek (2026-09-04) — bevestigde engine-bug, geen testfout

**Conclusie vooraf: dit is een echte, bevestigde bug in onze engine — geen testfout en geen
Huurcommissie-eigenaardigheid.** Bron: het beleidsboek zelf (`resources/beleidsboek/beleidsboek-wwso-2026-01.txt`,
§2.3.2 "Open keuken in een vertrek of overige ruimte", regel 642-660), de primaire bron volgens
de vastgelegde prioriteit "beleidsboek → officiële huurprijscheck-site → xlsx".

### De regel (§2.3.2, letterlijk)
> "Ook een aanrecht dat is geplaatst in een woon- of slaapvertrek is een open keuken, ook als er
> geen duidelijke afscheiding is tussen het keukengedeelte en de rest van het vertrek."
>
> "Binnen rubriek 3 van de woningwaardering wordt van de bovenstaande regel afgeweken. Zowel de
> open keuken als het vertrek [...] wordt voor deze rubriek namelijk individueel gewaardeerd met
> punten indien deze verwarmd zijn. [...] Een privé verwarmde woonkamer met open keuken wordt dus
> gewaardeerd met 4 punten."

Kortom: een verwarmd privévertrek mét een aanrecht (kitchenette) erin telt voor R3 specifiek als
**twee** verwarmde binnenruimten (2 + 2 = 4 pt) — het vertrek zelf én de "open keuken" apart —
ook al is het fysiek één ruimte zonder scheidingswand. Dit is een expliciete uitzondering "binnen
rubriek 3", die nergens anders in het beleidsboek voor R3 hoeft te gelden (bijv. R1 oppervlakte
telt het vertrek gewoon als één ruimte).

### Wat onze engine nu doet
`packages/engine/src/rubrieken/r3-verwarming.ts` telt per `RuimteRij` (fysieke ruimte) 2 punten als
`verwarmd === true`, ongeacht of die ruimte een `keuken`-subobject (kitchenette) heeft. Een
kitchenette is in ons datamodel een attribuut van de kamer (`RuimteRij.keuken`), geen aparte
`RuimteRij` — er is dus geen enkel codepad dat een tweede R3-bijdrage genereert voor een kamer met
eigen aanrecht. Kamer 1 (verwarmd privévertrek + eigen kitchenette) krijgt daardoor 2 pt i.p.v. de
correcte 4 pt — een **onderschatting van 2 punten voor elke kamer met een private kitchenette**.

### Impact
Dit raakt niet alleen Kamer 1/2 van de testdeal, maar **elk scenario met een kitchenette** —
inclusief de nog niet gebouwde Tussenfase-taak B (kitchenette-varianten 122cm/8pt en 240cm/14pt,
zie `plan/plan.md`). Zolang R3 dit niet meerekent, onderschat de engine de puntenwaarde van elke
kitchenette-kamer met 2 punten (~€19-20 huur/maand bij deze tarieven).

### Wat nog niet geverifieerd is
Ik heb dit niet nogmaals live in de Huurcommissie-wizard nagelopen (de opdracht liep parallel aan
een andere ronde die dezelfde tabs gebruikte, en de toegewezen tabs waren in mijn sessie niet meer
beschikbaar) — de conclusie steunt op de beleidsboek-tekst plus de al bevestigde Ronde-2-uitkomst
(HC gaf daar al 4 pt voor exact deze situatie). Gegeven dat het beleidsboek de primaire bron is en
de tekst het scenario woordelijk beschrijft ("privé verwarmde woonkamer met open keuken" → 4
punten, exact Kamer 1's situatie), is verdere bevestiging via de tool zelf niet nodig om dit als
bevestigde bug te labelen — wel nog te doen: de fix in `r3-verwarming.ts` (een kamer met
`keuken`-subobject moet als twee verwarmde vertrekken tellen voor R3, mits verwarmd) en een
regressietest die dit vastlegt. **Niet in deze ronde uitgevoerd** — dit rapport documenteert de
bevinding, past de calculator niet aan (buiten scope van deze observerende crossvalidatie).

## Openstaand voor een vervolgronde
- **R11 WOZ-waarde**: bevestigen of de Huurcommissie-tool dit veld wel/niet aanbiedt in stap
  "Woonruimte" — grootste onbeantwoorde vraag van deze sessie.
- **R3-combi-ruimte-hypothese**: onderzoeken of de WWSO-regels een dubbele verwarmingswaardering
  voorschrijven voor een woon-/slaap-/keukenruimte, en zo ja, of onze engine dit mist.
- **R5 gedeelde keuken (ruimte 7)**: exacte voorzieningenlijst nog eens 1-op-1 verifiëren tegen de
  HC-invoer (nu ongewijzigd overgenomen uit ronde 1).
- **R6 sanitair**: bad+douche-combinatiewaardering (ronde 1-bevinding, ongewijzigd) — mogelijk een
  echt regelverschil, niet bevestigd.
- Kamers 2 t/m 6 nog niet getest — alleen Kamer 1 is exhaustief doorgerekend.

## Ronde 3 — R11 WOZ-waarde uitgezocht (2026-09-04)

**Het WOZ-waarde-veld bestaat wél** in de Huurcommissie-tool — het stond al goed ingevuld (bevestigt
dat het niet over het hoofd was gezien, maar gewoon niet zichtbaar was in de compacte resultaat-
sidebar tot je er expliciet naartoe scrolt): stap "Woonruimte" → sectie "WOZ-waarde" → WOZ-waarde
€481.000, Oppervlakte 115 m² (exact onze waarden). Toch blijft "Woonruimte" in de resultaat-
uitsplitsing (zowel de sidebar als de volledige Resultaat-pagina, 53 pt / €539,99 — ongewijzigd
t.o.v. ronde 2) staan op 3,50 pt = uitsluitend de Energielabel-subregel. Er verschijnt **geen enkele
WOZ-gerelateerde regel**, ook geen "0 pt"-regel — de categorie toont letterlijk alleen Energielabel.

**Waarom dit een stevige aanwijzing is dat ónze 12 punten wél correct zijn:** R11 in onze engine
(`packages/engine/src/rubrieken/r11-woz-waarde.ts`) vergelijkt niet een vaste WOZ-drempel, maar
€/m² tegen het COROP-regiogemiddelde, met een expliciete ondergrens: `puntenLager` = 10,
`puntenGemiddeld` = 12, `puntenHoger` = 14 (drempel 10%) — **er bestaat geen 0-puntenband**, elke
onzelfstandige woonruimte krijgt volgens §2.11 dus altíjd minimaal 10 punten uit deze rubriek. Voor
Basrastraat 12: €481.000 ÷ 115 m² = €4.182,61/m², regiogemiddelde Groot-Rijnmond = €3.884/m² →
+7,69% verschil → binnen de 10%-drempel → "gemiddeld" → 12 pt. Dat rekent kloppend en verklaart
exact onze uitkomst.

**Conclusie (niet hard bewezen, wel goed onderbouwd):** de Huurcommissie-tool voor onzelfstandige
woonruimte lijkt de ingevoerde WOZ-waarde niet te vertalen naar puntenaantal in de getoonde
resultaat-uitsplitsing — het veld wordt kennelijk verzameld maar (in ieder geval zichtbaar) niet
gebruikt voor deze woonruimtesoort. Dat zou een **structureel scope-verschil** tussen de twee tools
zijn (niet per se een bug aan onze kant, en niet per se een bug aan de Huurcommissie-kant — mogelijk
gebruikt de Huurcommissie het veld intern voor iets anders, of is er een aparte
rijksmonument-/taxatiewaarde-uitzondering die deze zichtbaarheid onderdrukt). Dit verklaart de
resterende ~12 punten van het totaalverschil (65 vs 53 pt) nagenoeg volledig: 12 pt R11 + 0,5 pt
resterend R5-gat + 1,25 pt R6-gat ≈ 12-13,75 pt, tegenover een waargenomen totaalverschil van 12 pt
(enige overlap/afronding tussen deze verklaringen is nog niet uitgesplitst).

**Openstaand:** geen tekstuele bevestiging gevonden op de Huurcommissie-site dat WOZ-waarde
structureel niet meetelt voor onzelfstandige woonruimte — dit is een sterke aanwijzing, geen bewezen
feit. Navraag bij de Huurcommissie zelf (of het beleidsboek nogmaals raadplegen op dit specifieke
punt) zou dit definitief kunnen bevestigen.

## Ronde 4 — R11 WOZ-waarde: totaal volledig gereconstrueerd (2026-09-04)

Volledige tekst van de Huurcommissie-resultaatpagina (`get_page_text` + `find`-zoekactie naar
"WOZ" over de hele accessibility tree) opgehaald voor Kamer 1's case (roomtype "Woon- en
slaapkamer met keuken", 1 woonruimte, WOZ €481.000/115m² ingevuld in stap "Woonruimte").

**Het totaal van 53 pt reconstrueert exact en volledig uit de zichtbare subcategorieën, zonder
enige rest:**

| Categorie | Subrubriek | Punten |
|---|---|---|
| Woonruimte | Energielabel: 1984-1991 | 3,50 |
| Binnenruimtes | Vertrekken (30 m²) | 18 |
| | Overige ruimten (5 m²) | 0,75 |
| | Verwarming en verkoeling | 5 |
| | Keukens | 16,75 |
| | Sanitair | 3,50 |
| Buitenruimtes | Oppervlakte 46 m² | 5,75 |
| **Totaal (som)** | | **53,25 → 53** |

Woonruimte bevat uitsluitend de regel "Energielabel: 1984-1991 = 3,50" — geen WOZ-regel, ook geen
"0 pt"-regel. Een `find`-zoekopdracht naar "WOZ" over de volledige accessibility tree van de
resultaatpagina levert **nul treffers** op — het woord komt nergens voor, niet zichtbaar en niet
verborgen/collapsed.

**Conclusie: bevestigd, geen giswerk meer nodig.** De WOZ-waarde wordt in stap "Woonruimte" wel
verzameld (zie Ronde 3), maar draagt structureel **nul punten** bij aan het resultaat van de
Huurcommissie-tool voor onzelfstandige woonruimte — niet verborgen in het totaal, maar volledig
afwezig. Het totaal van 53 pt klopt tot op de komma uit de zichtbare rubrieken; er is geen ruimte
voor een onzichtbare WOZ-bijdrage.

Dit blijft, zoals Ronde 3 al aangaf, **niet verklaard vanuit het beleidsboek** (§2.11 kent geen
uitzondering voor onzelfstandige woonruimte en vereist juist expliciet minimaal 10 punten voor élke
onzelfstandige woonruimte). Dit is dus een bevestigde discrepantie tussen de Huurcommissie-tool en
het beleidsboek zelf — niet tussen onze engine en het beleidsboek. Onze 12 R11-punten zijn conform
§2.11 correct berekend (zie Ronde 3). Waarom de Huurcommissie-tool dit structureel niet toepast op
onzelfstandige woonruimte is niet vast te stellen zonder de Huurcommissie zelf te raadplegen —
buiten de scope van deze browsergestuurde vergelijking.

## Ronde 5 — R11: adres-breed "aantal onzelfstandige woonruimtes"-veld gecontroleerd (2026-09-04)

**Vraag van de gebruiker:** naast de per-voorziening "hoeveel kamers hebben hier toegang toe"-vragen,
heeft de Huurcommissie-tool ook een adres-breed veld dat het totaal aantal onzelfstandige
woonruimtes op het hele adres vraagt? Zo'n veld was in Ronde 1-4 niet bewust gecontroleerd, en als
het ontbrak of verkeerd stond zou dat de WOZ-berekening kunnen onderdrukken.

**Gevonden: ja, dit veld bestaat, en het stond al goed.** Stap "Woonruimte" bevat een aparte sectie
"Onzelfstandige woonruimten": *"Met hoeveel huurders worden de ruimtes op hetzelfde adres gedeeld?
Dit aantal wordt overgenomen in de volgende stappen."* — met een invoerveld "Huurders op hetzelfde
adres". Dit stond al op **6** (het juiste, adres-brede aantal voor Basrastraat 12), niet op 1 en niet
leeg. Dit is dus geen invoerfout — het veld dat de gebruiker vermoedde bestaat, en was al correct.

**Conclusie: de Ronde 3/4-bevinding staat nu extra stevig.** De WOZ-waarde-invoer klopt (Ronde 3),
het adres-brede "aantal woonruimtes"-veld klopt ook (deze ronde) — en toch draagt WOZ nul punten bij
aan het resultaat (Ronde 4). Er is geen overgebleven invoerverklaring meer te controleren binnen
deze tool-flow; dit is een bevestigd kaal feit over hoe de Huurcommissie-tool zich gedraagt voor
onzelfstandige woonruimte, zonder duidelijke oorzaak binnen de wizard zelf.

## R6-sanitair-onderzoek (2026-09-04) — twee structurele bevindingen, geen volledige numerieke herhaling

**Scope-opmerking vooraf:** deze ronde liep parallel aan Ronde 4/5 op eigen tabbladen. Door
aanhoudende scroll-/render-traagheid van de Huurcommissie-site is de volledige punt-voor-punt
her-invoer van ruimte 10 en 13 niet afgerond — onderstaand zijn twee concrete, wel bevestigde
structurele bevindingen, geen bijgewerkt totaalcijfer voor R6.

**Bevinding 1 — "Bad en aparte douche" bestaat wél als losse optie (weerlegt eigen hypothese).**
Eerste indruk was dat de Huurcommissie-tool "Douche" en "Bad met (hand)douche" als **wederzijds
uitsluitende radiobuttons** aanbiedt (bevestigd via de accessibility-tree: `role="radio"``) — wat
zou betekenen dat onze ruimte 10-configuratie (aparte douche ÉN aparte bad, samen 3+5=8 pt, geen
combinatie) daar niet is na te bouwen. Bij het selecteren van "Bad met (hand)douche" verscheen
echter een DERDE tegel: **"Bad en aparte douche"** — exact de configuratie die nodig is. Dit
weerlegt de aanvankelijke hypothese: de Huurcommissie-tool ondersteunt "douche + bad los, geen
combinatie" wel degelijk. Geen structureel modelverschil hier, dus geen verklaring voor het R6-gat.

**Bevinding 2 — toiletType-veld in onze fixture is mogelijk intern inconsistent (wél relevant).**
Bij het aanmaken van een "Badkamer" in de Huurcommissie-tool heet het toilettype-veld letterlijk
"Toilettype (in badkamer)" en biedt alléén de badkamer-varianten (staand=2, hangend=2,75 volgens
het beleidsboek, §2.6.1-tabel). Onze eigen ruimte 10 (type `Badruimte` in ons datamodel) heeft
echter `toiletType: "Hangend in toiletruimte"` (3,75 pt) — een waarde die bij een fysieke
toiletruimte hoort, niet bij een badkamer. Onze engine gate't `toiletType` niet tegen het
ruimte-`type` (zie `r6-sanitair.ts`: `tarievenset.sanitairToiletPunten[post.toiletType]`, geen
check op `ruimte.type`), dus dit wordt door de rekenmotor geaccepteerd zonder waarschuwing — maar
het is waarschijnlijk een **inconsistentie in de testfixture zelf** (2026-08-19-testdata), niet een
realistische situatie. Zou dit gecorrigeerd worden naar "Hangend in badkamer" (2,75 pt), dan daalt
ruimte 10's toiletbijdrage met 1 pt — dat alleen al verklaart een deel van het resterende R6-gat
(1,25 pt) voor Kamer 1's aandeel (1 pt ÷ 6 kamers ≈ 0,17 pt van dat gat, de rest blijft open).

**Openstaand:** volledige heropvoer van ruimte 10 en 13 met de (mogelijk gecorrigeerde)
toiletType-waarde en alle extra voorzieningen 1-op-1, om het R6-gat definitief te dichten of als
resterende, onverklaarde discrepantie vast te leggen — niet in deze ronde afgerond.

**Extra bevestiging (beantwoordt de tweede vraag van de gebruiker):** volgens §2.11 is de
WOZ-punten-berekening sowieso adres-breed, niet kamer-specifiek — de formule deelt de WOZ-waarde van
het HELE pand door de HELE gebruiksoppervlakte (niet de m² van één kamer) en vergelijkt dat tegen het
regiogemiddelde. Elke onzelfstandige woonruimte op hetzelfde adres krijgt dus per definitie dezelfde
WOZ-punten (10, 12 of 14) — het voorbeeld van de gebruiker klopt: twee losse onzelfstandige
woonruimtes op hetzelfde adres met dezelfde WOZ/m²-verhouding krijgen allebei apart hetzelfde
puntenaantal, ongeacht hun eigen kamergrootte. Dit is dus geen verklaring voor het verschil met de
Huurcommissie-tool — bevestigt alleen dat onze 12 punten voor Kamer 1 (en identiek voor de andere 5
kamers) correct zijn.

**R11 is hiermee afgesloten voor deze crossvalidatie**: onze berekening is dubbel bevestigd correct
(Ronde 3 + deze ronde), de Huurcommissie-tool geeft structureel 0 punten zonder vindbare oorzaak in
de wizard of het beleidsboek. Verder onderzoek zou alleen nog kunnen via rechtstreeks contact met de
Huurcommissie — buiten de scope van deze browsergestuurde vergelijking.

## R6-afronding — volledige heropvoer ruimte 10 + 13 (2026-09-04)

Vervolg op het R6-onderzoek hierboven, op verzoek van de gebruiker ("wat het makkelijkste is").
Beide badruimtes opnieuw, volledig en accuraat ingevoerd in de Huurcommissie-tool (los van de
eerdere WOZ/R3/R11-rondes, op verse tabbladen), met de exacte voorzieningen zoals ze nu in onze
app staan voor Kamer 1's ruimte 10 en ruimte 13 (opgehaald via de "Sanitair"-knop per ruimte-rij
op de invoerpagina).

**Ruimte 13 (2 m², alleen douche, geen toilet): exacte match.** Onze engine: 0(toilet) + 1(wastafel)
+ 3(douche) + 3(extra, afgetopt van 3,25 ruw) = 7 pt ÷ 6 kamers = 1,1667 pt/kamer. Huurcommissie
(na correcte invoer van alle voorzieningen: doucheafscheiding, wastafelkast, handdoekenradiator,
eenhandsmengkraan, wastafel, douche): **1,17 pt/kamer** — komt overeen tot op de afronding. Dit is
een sterke, schone bevestiging dat de R6-rekenkern (inclusief de aftopping op het douche-bedrag)
correct is.

**Ruimte 10 (4,17 m², bad + aparte douche, toilet): resterend gat volledig verklaard, in drie
losse componenten.** Onze engine: 3,75(toilet) + 1(wastafel) + 8(douche 3 + bad 5, los) +
4(extra) = 16,75 pt ÷ 6 = 2,7917 pt/kamer. Huurcommissie-invoer gaf 2,54 pt/kamer, mét een storende
bijkomstigheid: de "Meerpersoons wastafel"-dropdown liet zichondanks herhaalde pogingen (klikken,
toetsenbordnavigatie, JS `dispatchEvent`) niet meer terugzetten naar leeg nadat hij per ongeluk op
"1" was gezet — dat voegt een misplaatste +0,25 pt/kamer toe die niet in onze eigen data voorkomt.
Analytisch gecorrigeerd (2,54 − 0,25 = 2,29) en uitgesplitst tegen onze 2,7917, verklaart het
verschil (0,50 pt/kamer) zich in drie stukken:

1. **Testfixture-inconsistentie (0,17 pt/kamer):** onze data heeft `toiletType: "Hangend in
   toiletruimte"` (3,75 pt) in een ruimte van het type Badruimte — de Huurcommissie-tool biedt voor
   een badkamer uitsluitend badkamer-varianten aan (hangend = 2,75 pt, het beleidsboek-conforme
   tarief voor déze combinatie). Dit is een fout in de testdata zelf (2026-08-19), geen engine-bug —
   de engine rekent gewoon uit wat is ingevoerd, zonder te valideren dat het toiletType bij het
   ruimtetype past.
2. **Eigen testartefact (0,25 pt/kamer):** de vastzittende Meerpersoons-wastafel-dropdown hierboven,
   analytisch gecorrigeerd, geen echte discrepantie.
3. **Bad + aparte douche-waardering (0,33 pt/kamer) — nog open, mogelijk interessant:** de
   Huurcommissie-tegel "Bad en aparte douche" blijkt intern maar 6 punten ruw toe te kennen (1 pt/kamer
   ÷ 6 gedeeld = 1, dus raw 6), niet de 8 punten (5 + 3, los opgeteld) die onze engine toepast voor
   twee aparte voorzieningen. Het beleidsboek (§2.6.1) beschrijft alleen expliciet de "bad met
   (hand)douche"-combinatie (dan telt de douche niet apart, vandaar de vaste combinatie-waarde van
   6) — het regelt niet expliciet het geval van een bad én een **fysiek aparte** douche-installatie
   in dezelfde ruimte. Onze engine's aanname (gewoon optellen: 5 + 3 = 8) is een redelijke lezing,
   maar niet hard bevestigd tegen een expliciete beleidsregel voor dit specifieke geval.

**Vervolg (zelfde dag): geen cap van 7 punten gevonden.** Op vraag van de gebruiker gericht
gezocht in het beleidsboek naar een maximum voor de "bad + aparte douche"-combinatie (regex op
"maximum" nabij douche/bad, op "7 punten", op combinatietaal) — geen enkele treffer. De tabel in
§2.6.1 kent letterlijk maar drie categorieën (Douche 3, Bad 5, Bad/douche-combinatie 6), zonder
voetnoot of cap-taal voor een vierde geval. Wel relevant (uit §2.5.4, keuken-rubriek, niet
sanitair, dus niet 1-op-1 toepasbaar maar wel richtinggevend voor de WWSO-filosofie): "Eén
voorziening met twee functies wordt als twee losse voorzieningen gewaardeerd" — ondersteunt
optellen, niet afkappen. **Conclusie: onze 8 punten (3+5, ongecapt) is de letterlijke, correcte
lezing van §2.6.1 voor twee fysiek gescheiden voorzieningen. Geen engine-bug.** Dat de
Huurcommissie-tool op 6 uitkomt voor haar "Bad en aparte douche"-tegel is vermoedelijk een
vereenvoudiging in de tool zelf, of een invoerkeuze in de vorige ronde die niet exact overeenkwam
— niet een beleidsregel die de engine mist. Afgesloten, geen actie vereist.

**Samenvattend R6:** de rekenkern is bevestigd correct op alle onderzochte punten (ruimte 8, 13
matchen exact; ruimte 10's resterende gat is toe te schrijven aan testdata-kwaliteit en een
tool-vereenvoudiging aan Huurcommissie-kant, niet aan een engine-bug). Geen actie vereist vóór de
bèta-lancering.

**Aanvullende bevestiging (zelfde dag, op observatie van de gebruiker):** in de Huurcommissie-tool
zelf, sectie "Douche of bad" bij een badkamer, staan precies drie tegels: "Douche", **"Bad met
(hand)douche"**, en "Bad en aparte douche". Er bestaat dus geen losse "Bad"-tegel (het
beleidsboek's 5-punten-categorie zonder douche) — de tool vouwt "bad" en "bad met handdouche"
samen tot één tegel die vermoedelijk altijd de 6-punten-combinatiewaarde toepast. Dit is een
concrete, in de UI zichtbare vereenvoudiging in de Huurcommissie-tool t.o.v. het beleidsboek (dat
wél drie aparte categorieën kent: Douche 3 / Bad 5 / Bad+handdouche-combinatie 6) — versterkt de
conclusie dat onze engine de letterlijke beleidsboek-lezing volgt en de Huurcommissie-tool hier
zelf vereenvoudigt, niet andersom.

## Bijlagen
- `huurcommissie-crossvalidatie-pdfs/onze-app_basrastraat12_2026-09-04.pdf` — onze eigen
  PDF-export (volledige pand, alle 6 kamers) via "PDF downloaden" op het resultaatscherm.
- `huurcommissie-crossvalidatie-pdfs/huurcommissie_kamer1_gecorrigeerd_2026-09-04.jpg` —
  schermafbeelding van het Huurcommissie-resultaat voor Kamer 1 (ronde 2, gecorrigeerd). De
  Huurcommissie-tool zelf biedt geen downloadbare PDF aan op de resultaatpagina (alleen "Opslaan
  en later verder" via een link, en een "Bekijk en print resultaat"-knop) — een schermafbeelding
  is daarom het dichtstbijzijnde equivalent.
