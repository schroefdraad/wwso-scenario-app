# Rapport: beoordeling van de R4-grondslag (open bevinding uit taak 8) — 2026-08-19

## De vraag

`outputs/RAPPORT_taak8_2026-08-19.md` liet R4 (energieprestatie) in alle drie de golden-master
kamers 0,25 punt afwijken van de officiële Huurprijscheck, en liet de knoop bewust liggen:
moet `berekenR4` een eigen, ongeronde privé+gedeeld-grondslag krijgen in plaats van de
al-op-hele-m²-afgeronde R1-grondslag uit `vertrekOppervlakteM2()`? En raakt die keuze ook R2?

## Beslissing

**Ja voor R4: eigen, ongeronde grondslag. Nee voor R2: die blijft ongewijzigd.**
En: **R13 blijft ook ongewijzigd** op de afgeronde R1-grondslag — dat is een derde geval dat
nog niet in de vraagstelling zat, en de brontekst is daar juist wél expliciet over.

## Wat de brontekst zegt

### 1. De m²-afrondingsregel is een regel ván rubriek 1 (en ván rubriek 2), niet van het stelsel

De tweestaps-m²-afronding staat op precies twee plaatsen in het hele beleidsboek, en allebei
binnen de paragraaf van de rubriek waar hij bij hoort. Onder §2.2.1 (Vertrekken), in de
brontekst genummerd als "2.1.1.1 Rekenregels vertrekken" (fout genummerd — de inhoud en de
plaats in de documentstructuur wijzen op 2.2.1.1):

> "De oppervlakten voor privé- en gemeenschappelijke vertrekken worden afzonderlijk berekend.
> De rekenmethode is als volgt:
> • Bepaal de oppervlakte per vertrek afgerond op twee decimalen.
> • Tel de oppervlakte van alle privévertrekken bij elkaar op en rond af: [...]
> • Doe hetzelfde voor de gemeenschappelijke vertrekken
> • Tel de m² van beide soorten vertrekken bij elkaar op en rond af op hele vierkante meters,
>   volgens de bovenstaande afrondingsmethode.
> • **Bepaal het puntenaantal voor de vertrekken op basis van de m².**"

En de tweelingparagraaf onder §2.2.2 (Overige ruimten), in de brontekst óók "Rekenregels
vertrekken" genoemd (§2.2.2.1) maar blijkens de inhoud over overige ruimten:

> "• Bepaal de oppervlakte per overige ruimte afgerond op twee decimalen. [...]
> • Doe hetzelfde voor de gemeenschappelijke overige ruimtes. [...]
> • **Bepaal het puntenaantal voor de overige ruimtes op basis van de m².**"

De slotregel is in beide gevallen een instructie voor de eigen rubriek: *het puntenaantal
voor de vertrekken*, respectievelijk *voor de overige ruimtes*. Nergens staat dat deze
afgeronde m² ook de grondslag zijn voor andere rubrieken.

### 2. §2.4.4 beschrijft de oppervlakte zelfstandig en haalt die rekenregel niet aan

> "Het puntenaantal voor de energieprestatie voor de onzelfstandige woning wordt gerekend op
> basis van het totaal aantal m² oppervlakte die de huurder heeft als privé vertrekken en de
> aan huurder toe te rekenen gemeenschappelijke vertrekken."

En de kop van §2.4 zelf: "-0,15 t/m 1 punt per m² van de privé- en gemeenschappelijke
vertrekken". Geen verwijzing naar §2.2.1.1, geen afrondingsstap, geen verwijzing naar rubriek 1.

Het rekenvoorbeeld dat erbij staat, beslist de vraag niet — alle getallen zijn daar toevallig
heel:

> "Huurder heeft een privé slaapkamer van 20 m² [...] gemeenschappelijke woonkamer van 40 m².
> [...] 40 m²/4 = 10 m². Het puntenaantal voor de energieprestatie wordt dan als volgt
> berekend: (20 + 10) x 0,65 = 19,50 punten."

Wat het voorbeeld wél laat zien: de deling door het aantal bewoners staat rechtstreeks in de
formule, zonder tussenafronding, en er wordt één keer vermenigvuldigd en verder niet afgerond.

### 3. Waar het beleidsboek de úitkomst van rubriek 1 bedoelt, zegt het dat met zoveel woorden

Dit is het doorslaggevende contrast. §2.13 (Aftrekpunten):

> "Wanneer de totale oppervlakte van het onderdeel vertrekken **(rubriek 1)** minder is dan 8 m²."

Daar staat de verwijzing er expliciet bij. In §2.4.4 staat hij er niet. Het verschil is dus
geen slordigheid maar een onderscheid dat het document zelf maakt. `berekenR13` blijft daarom
op `vertrekOppervlakteM2()` (de afgeronde R1-waarde) rekenen; dat was al zo en is correct.

### 4. Een derde bevestiging: buiten R1/R2 rondt het beleidsboek nooit op m² af

§2.8.2 (gemeenschappelijke buitenruimte) rekent hetzelfde soort gedeelde oppervlakte door en
doet dat zónder enige m²-afronding:

> "De tuin wordt dan gewaardeerd met: (0,75 x 30) / 1 = 22,5 punten. Dit puntenaantal moet
> worden gedeeld door 4 onzelfstandige wooneenheden = 5,625 punten. Er wordt afgerond op een
> kwart punt."

Ruwe m², dan punten, dan één keer kwartpuntsafronding (§2.1.6). Precies het patroon dat R4
nu ook volgt. (Terzijde, als maat voor de precisie van het document: de uitkomst die het er
vervolgens zelf bij zet — "5,60 punten" — klopt niet met zijn eigen regel uit §2.1.6, die
5,75 geeft. Dat is een van meerdere rekenfouten in de voorbeelden en een reden om de
uitkomsten van de officiële Huurprijscheck zwaarder te wegen dan de voorbeeldsommen.)

### 5. Het empirische bewijs: 3/3 exact

| Kamer | privé | gedeeld (30,7 m² / 6) | label | ongerond × factor | site | oude engine |
|---|---|---|---|---|---|---|
| 2 | 16 | 5,11667 | A++ (0,85) | 21,11667 × 0,85 = 17,949 → **18,00** | 18 | 17,75 (0,85 × 21) |
| 3 | 21,6 | 5,11667 | A++ (0,85) | 26,71667 × 0,85 = 22,709 → **22,75** | 22,75 | 23,00 (0,85 × 27) |
| 6 | 11,3 | 5,11667 | A+++ (0,95) | 16,41667 × 0,95 = 15,596 → **15,50** | 15,50 | 15,25 (0,95 × 16) |

Kamer 3 is hier de scherpste toets: daar duwt de oude afronding de uitkomst de *andere* kant
op. Het is dus geen eenzijdige bias die je met elke willekeurige verschuiving zou wegpoetsen.

Twee varianten van "ongerond" zijn onderzocht en geven op deze drie gevallen hetzelfde
antwoord: volledig ongerond, of privé- en gedeeldsom eerst op twee decimalen. Gekozen is
volledig ongerond, omdat §2.4.4 geen enkele afrondingsstap noemt; de tweedecimalen-stap uit
§2.2.1.1 slaat blijkens de formulering op de opmeting *per vertrek* (in de engine al een
invoereigenschap), niet op de sommen.

Alle andere denkbare tussenvormen zijn uitgesloten: alleen de privésom afronden geeft kamer 3
op 23,00 (fout), alleen de gedeelde som afronden geeft kamer 3 op 22,50 (fout).

## Raakt dit R2?

**Nee.** R2 heeft in §2.2.2.1 een eigen, expliciete rekenregel met exact dezelfde
tweestaps-m²-afronding, die afsluit met "Bepaal het puntenaantal voor de overige ruimtes op
basis van de m²". Er is geen tekstuele grond om die weg te halen, en geen empirische
aanleiding: de drie golden-master kamers hebben geen overige ruimten (R2 = 0), dus het bewijs
uit taak 8 zegt er niets over. R2 blijft daarom ongewijzigd op `oppervlakteVolgensRekenregel`.

De gedeelde helper is wel gesplitst zodat het verschil zichtbaar is in plaats van impliciet:
`ongerondeOppervlakte()` is nu de kale grondslag en `oppervlakteVolgensRekenregel()` legt daar
de rubriek-1/2-afronding overheen.

## Een derde optie die ik niet in de brontekst gevonden heb

Er is gezocht op elke plaats waar het beleidsboek over afronding spreekt (`afrond|afgerond`)
en op elke vindplaats van "energieprestatie". Er bestaat geen paragraaf die R4 aan rubriek 1
koppelt, geen aparte R4-rekenregel, en geen algemene m²-afrondingsregel op stelselniveau
(§2.1.6 en §2.1.7 gaan uitsluitend over púnten). Ik heb dus geen vierde interpretatie
gevonden die serieus meedingt.

## Wat er nog uit deze ronde kwam: kamer 6 telde nog steeds 0,25 punt te weinig

Na de R4-correctie kwamen kamer 2 (67) en kamer 3 (74) exact uit, maar kamer 6 bleef op 55
staan in plaats van 56. Dat bleek **geen** rekenfout maar een fixture-fout: de kamer 6-fixture
hergebruikte het sanitair van kamer 2, terwijl `Slaapkamer 6.pdf` (23-6, twee weken eerder
ingevuld dan de andere twee) op drie punten anders is ingevuld. Vastgesteld door alle zes
pagina's van alle drie de PDF's opnieuw naar PNG te renderen en regel voor regel te
vergelijken:

| Regel op het document | kamer 2/3 | kamer 6 |
|---|---|---|
| Badkamer 2 | 1,00 (afgetopt) — met wastafelkast | 0,88 — met stopcontact i.p.v. wastafelkast |
| Badkamer 3 | 2,67 | 2,92 — mét meerpersoonswastafel |
| Toiletruimte 1 en 2 | 0,67 elk — staand toilet | 0,79 elk — hangend toilet |
| **Sanitair totaal** | **6,25** | **6,50** |

De fixture is op zijn eigen bron gezet. De engine reproduceert daarna élke regel exact,
inclusief twee regels die daarmee voor het eerst gevalideerd zijn:

- **0,88 = 5,25/6**, niet 5,5/6: het stopcontact in badkamer 2 levert niets op omdat die
  badkamer geen wastafel heeft ("maximaal twee per (meerpersoons)wastafel", §2.6.2). De site
  rekent net zo — een onafhankelijke bevestiging van een regel die tot nu toe alleen op de
  tekst rustte.
- **0,79 = 4,75/6**: het tarief van 3,75 punten voor "hangend toilet in toiletruimte".

Het taak-8-rapport meldde "R5, R6 matchen exact voor alle drie de kamers"; voor kamer 6 was
dat niet zo, en de eindtotaal-afwijking daar was 0,50 punt (R4 én R6) in plaats van de gemelde
0,25. Dat is nu opgelost.

## Correctie op een nevenclaim uit het taak-8-rapport

Dat rapport voerde bij bevinding D3 (Hoefstraat) aan dat "de drie Kleiweg-fixtures juist onze
bestaande tweestaps-implementatie exact bevestigen in alle drie de gevallen". Dat gaat te ver:
voor deze drie kamers geven één-staps- en tweestapsafronding van de R1-oppervlakte *dezelfde*
uitkomst (21, 27, 16). Ze zijn er consistent mee, maar onderscheiden de twee methoden niet.
**D3 blijft dus een open aandachtspunt** voor een volgend golden-master pand; hij is niet
weerlegd door deze fixtures. (De R4-grondslagvraag onderscheiden ze wél, omdat de labelfactor
het verschil uitvergroot.)

## Wijzigingen in de code

- `packages/engine/src/rubrieken/gedeeld.ts` — nieuwe `ongerondeOppervlakte()` (kale
  grondslag: privé + toegerekend gedeeld) en `ongerondeVertrekOppervlakteM2()`.
  `oppervlakteVolgensRekenregel()` bouwt nu op de eerste voort en is niet inhoudelijk
  gewijzigd. JSDoc bijgewerkt met de foute paragraafnummering in de brontekst, met de reden
  waarom de afronding rubriek-1/2-specifiek is, en met het §2.13-contrast.
- `packages/engine/src/rubrieken/r4-energieprestatie.ts` — `berekenR4` gebruikt
  `ongerondeVertrekOppervlakteM2()`; JSDoc en de toelichtingsregel dragen nu de motivatie en
  de paragraafverwijzing.
- `packages/engine/src/rubrieken/r2-oppervlakte-overige-ruimten.ts` — **niet gewijzigd**.
- `packages/engine/src/rubrieken/r13-aftrekpunten.ts` — **niet gewijzigd**.
- `packages/engine/src/fixtures/golden-master/kleiweg-179b-kamer6.ts` — sanitair op het eigen
  brondocument gezet, met de drie afwijkingen in de JSDoc toegelicht.

## Wijzigingen in de tests

- `packages/engine/src/eindtelling/golden-master.test.ts` — R4 en het eindtotaal zijn nu
  gewone kolommen in de `describe.each`-tabel en staan op de site-waarden: R4 18 / 22,75 /
  15,50, eindtotalen 67 / 74 / 56, R6 kamer 6 op 6,50. Het "documenteer de bug"-blok is
  vervangen door een blok dat de ongeronde grondslag expliciet vastlegt (`perKamerRuw` tegen
  `factor × (privé + 30,7/6)`), zodat een terugval naar de afgeronde grondslag faalt en niet
  toevallig door de kwartpuntsafronding heen glipt.
- `packages/engine/src/rubrieken/r4-energieprestatie.test.ts` — de bestaande tests bleken
  allemaal ongevoelig voor de keuze (grondslag 10 m², of het §2.4.4-voorbeeld 20 + 40/4 = 30,
  allemaal heel); alleen de misleidende testnaam "past de energielabelfactor toe op de
  R1-grondslag" is gecorrigeerd. Toegevoegd is één test die de twee grondslagen wél
  onderscheidt: privé 12,4 m² + gedeelde keuken 25 m²/3 → R1 geeft 12 + 8 = 20 m², R4 rekent
  op 20,733 m² → 13,50 punten waar de oude grondslag 13,00 gaf.
- `packages/engine/src/rubrieken/r2-oppervlakte-overige-ruimten.test.ts` — niet gewijzigd.

## Verificatie

- `npx vitest run` (repo-root) → **148/148 groen** (was 143, plus 5 nieuw/verplaatst)
- `npx tsc --noEmit` in `packages/engine` → geen fouten
- `npx eslint packages/engine` → schoon

Alle drie de golden-master kamers matchen nu exact op elke getoetste rubriek én op het
eindtotaal en de maximale huurprijs (€ 648,24 / € 570,54 komen uit de huurprijstabel bij 67
respectievelijk 56 punten — een onafhankelijke controle op het eindtotaal).

## Zekerheid

Hoog voor R4: drie onafhankelijke exacte treffers op de officiële bron, een sluitend tekstueel
argument (de afrondingsregel hoort bij rubriek 1, §2.4.4 haalt hem niet aan, §2.13 laat zien
hoe het document het formuleert wanneer het de rubriek-1-uitkomst wél bedoelt) en een
structurele bevestiging in §2.8.2. Ik zie hier geen resterende twijfel die het rapporteren
waard is.

Hoog voor "R2 blijft ongewijzigd" op tekstuele grond, maar met de aantekening dat er **geen
empirisch bewijs** voor R2 is: geen van de drie golden-master kamers heeft overige ruimten.
Een volgend golden-master pand mét een berging of bijkeuken zou dat alsnog moeten bevestigen.
Dat is opgenomen als aandachtspunt, niet als openstaande beslissing — de brontekst is hier
expliciet genoeg om op te bouwen.

## Nog open (geen actie nu)

- **D3, één-staps versus tweestaps m²-afronding bij R1** (Hoefstraat). Zie de correctie
  hierboven: nog steeds onbeslist, wacht op een golden-master pand dat de twee methoden
  onderscheidt.
- **D2, eenhandsmengkraan in een privékeuken** (0,75 versus 0,25 op `Slaapkamer 3 + keuken.pdf`).
  Ongewijzigd overgenomen uit taak 8.
