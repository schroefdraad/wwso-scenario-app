# Rapport taak 24 — Rubriek-diff WWS (zelfstandig) vs WWSO (onzelfstandig)

Datum: 2026-09-07. Bronnen: `resources/beleidsboek/beleidsboek-wwso-2026-01.txt` (al aanwezig,
extractie van de WWSO-pdf) en `resources/Beleidsboek zelfstandig/beleidsboek-woningwaardering-
zelfstandige-woonruimte-januari-2026.pdf` (nieuw, tekst geëxtraheerd naar het scratchpad voor dit
onderzoek met `pdftotext -layout`). Beide beleidsboeken zijn versie januari 2026, dus vergelijkbare
lichting.

**Methode**: rubriek voor rubriek de tekst naast elkaar gelegd, met de nadruk op (a) de
puntenwaarde-formules in het "rate box" bovenaan elke rubriek, (b) de toelatingseisen, en (c) de
rekenmethodes. Niet elke subparagraaf is woordelijk vergeleken — zie "Nog te verifiëren" onderaan
voor wat een latere, diepere blik verdient (met name vlak vóór de daadwerkelijke bouw van elke
rubriek).

## Conclusie in één zin

**Bijna alle rubriek-inhoud (toelatingseisen, puntentabellen, meetinstructies) is woordelijk of
vrijwel woordelijk identiek tussen WWS en WWSO — het enige systematische verschil is dat WWSO op
precies één plek (§2.1.4/2.1.5) een generieke "deel de punten door het aantal bewoners met toegang
en gebruiksrecht"-regel toevoegt, gekoppeld aan de kamertoewijzing.** Daarnaast zijn er een paar
concrete, rubriek-specifieke afwijkingen (vooral R4 en R11) en is het hele huurprijs-vaststellings-
mechanisme (Hoofdstuk 1, sectorindeling) nieuw voor WWS. Zie hieronder per rubriek.

## Het ene grote structurele verschil: "toegang & gebruiksrecht"-deling

WWSO §2.1.4 ("Toegang én gebruiksrecht") en §2.1.5 ("Gelijke verdeling van punten bij gedeeld
gebruik van ruimtes en voorzieningen") zijn de ENIGE plek in het hele WWSO-beleidsboek waar de
regel "deel de punten van een gedeelde ruimte/voorziening door het aantal onzelfstandige
woonruimten met toegang en gebruiksrecht" algemeen wordt neergezet. Elke rubriek die dit nodig
heeft (R1/R2 gemeenschappelijke vertrekken, R5 keuken, R6 sanitair, R7 handicap, R8
gemeenschappelijke buitenruimte, R9, R10) verwijst er impliciet naar via zijn eigen rate box
("... / onzelfstandige wooneenheden met toegang en gebruiksrecht").

WWS heeft dit generieke stuk NIET — in plaats daarvan is delen in WWS alleen relevant in rubriek 9
(gemeenschappelijke vertrekken/ruimten) en rubriek 10 (gemeenschappelijke parkeerruimten), waar
gedeeld wordt door **"aantal adressen met toegang en gebruiksrecht"** (dus tussen zelfstandige
woningen in hetzelfde gebouw, niet tussen individuele bewoners binnen één woning — logisch, een
zelfstandige woning heeft maar één huishouden).

**Implicatie voor de bouw (taak 25/27)**: dit is precies het scharnierpunt tussen de twee stelsels.
Een generieke `deelPuntenOverBewoners(punten, aantalDelers)`-achtige rekenregel zou letterlijk
hergebruikt kunnen worden voor zowel WWSO (delers = aantal onzelfstandige woonruimten) als WWS-R9/
R10 (delers = aantal adressen) — het is dezelfde wiskundige bewerking, alleen de bron van het
deler-aantal verschilt (kamertoewijzing-matrix vs. simpelweg "hoeveel woningen delen dit"). Voor
WWSO's rubrieken 1/2/5/6/7/8-privé is er in WWS helemaal geen deling nodig (aantal delers = 1,
oftewel: gewoon niet delen).

## Rubriek voor rubriek

| Rubriek | Kernregel(s) gecontroleerd | Bevinding |
|---|---|---|
| **Algemene regels (§2.1)** | afronding per rubriek (0,25pt, 1/8-regel), eindsaldering op hele punten, >250pt-extrapolatie | **Woordelijk identiek.** Alleen WWSO heeft er §2.1.4/§2.1.5 (toegang & gebruiksrecht-deling) bovenop — zie hierboven. |
| **R1/R2 — vertrekken/overige ruimten** | 1pt/m² vertrek, 0,75pt/m² overige ruimte, toelatingseisen (4m² min, 2,10m hoogte, 1,50m breedte, 0,50m² glas, ventilatie, stopcontact+lichtpunt), zolder-als-vertrek-eisen, "aangrenzende ruimten met open doorgang"-regel, alle meetinstructies (kasten, meterkast 30×60cm, kanalen, pui, erker, entresol, hellend plafond, trap) | **Woordelijk identiek**, inclusief de meetinstructies (letterlijk dezelfde voorbeeldzinnen). WWSO's enige toevoeging: het privé/gemeenschappelijk-onderscheid met de deling uit §2.1.4/5. WWS heeft één nieuwe subparagraaf zonder WWSO-equivalent: **§2.2.2.5 "Privé parkeerruimte"** — een binnenruimte die als exclusieve parkeerplek dient (bijv. garagebox) wordt gewaardeerd als overige ruimte (0,75pt/m²); nog te checken of WWSO iets vergelijkbaars ergens anders regelt. |
| **R3 — verwarming en verkoeling** | 2pt/verwarmd vertrek, 1pt/verwarmde overige ruimte (max 4), 1pt/verkoeld vertrek (max 2), de open-keuken-telt-apart-regel (§2.3.2 — de regel die de WWSO-R3-bug van 2026-09-04 betrof), radiator/onroerende-zaak-eisen, verkoelingsvoorwaarden (NTA 8800, A+/100W/m²) | **Woordelijk identiek**, inclusief de open-keuken-regel en het exacte voorbeeld ("een verwarmde woonkamer met open keuken wordt gewaardeerd met 4 punten"). Volledig herbruikbare rekenregel, op de privé/gedeeld-deling na. |
| **R4 — energieprestatie** | puntenformule | **Fundamenteel verschillend, niet herbruikbaar als dezelfde rekenregel.** WWSO: `-0,15 t/m 1 punt PER M²` van de vertrekken (een per-m²-factor per energielabel, geschaald met de oppervlakte — dit is `energielabelfactoren_2026-01-01.json` in de huidige engine). WWS: **een vaste puntenrange per label, met een aparte tabel voor Eengezinswoning (`-15 t/m 62 punten`) en Meergezinswoning (`-15 t/m 58 punten`)** — geen schaling met m², wel afhankelijk van het woningtype. **Relevante vondst**: de twee velden die op 2026-09-05 als "dood" uit WWSO's `Pand`-schema verwijderd zijn (`soortWoning`: Eengezins/Meergezins, en `aantalWoningenInComplex`) zijn precies wat WWS's R4 nodig heeft — ze waren niet universeel nutteloos, alleen ongebruikt in de WWSO-kant. Verdere validering/geldigheidsregels (§2.4.1-2.4.3: EP-online, 10-jaars-vervaltermijn, geldige labeldatums) zijn wél woordelijk identiek. |
| **R5 — keuken** | basiseisen (aan/afvoer water, gasaansluiting, aanrecht ≥1m, 2 kasten ≥50cm, waterdichte wand ≥1,50m), aanrecht-lengte→punten-tabel (0/4/7) | **Woordelijk identiek**, tabel inclusief. Alleen de deling ontbreekt in WWS. |
| **R6 — sanitair** | basisvoorzieningen-tabel (toilet staand/hangend × toiletruimte/badkamer: 3/2/3,75/2,75pt) | **Identiek** voor het gecontroleerde stuk (toilet-tabel). Extra voorzieningen (§2.6.2, douche/bad/wastafel-eisen) niet woord-voor-woord vergeleken — vermoedelijk ook identiek gezien het patroon, maar nog te bevestigen. |
| **R7 — woonvoorzieningen handicap** | €332,00 per punt netto-investering | **Identiek** rate, identieke uitleg over netto-investering/subsidie-aftrek. |
| **R8 — buitenruimten** | 2pt + 0,35pt/m² privé, 0,75pt/m² gemeenschappelijk (max 15pt totaal) | **Bijna identiek, met één concrete WWS-only regel: `-5 punten als er geen enkele buitenruimte is`.** Dit bestaat niet in WWSO (logisch: een kamer in een gedeeld huis heeft vaak legitiem geen eigen buitenruimte, geen straf; een zelfstandige woning zonder enige buitenruimte wél). Rest van de regels (privé-buitenruimte-definitie, balkoneisen) identiek voor zover gecontroleerd. |
| **R9 — gemeenschappelijke vertrekken/ruimten** | 1pt/m² vertrek, 0,75pt/m² overige ruimte, gedeeld door het aantal delers | **Rate identiek**, deel-mechanisme hetzelfde patroon maar andere deler-eenheid: WWSO deelt door "onzelfstandige wooneenheden op het adres met toegang", WWS deelt door **"adressen met toegang en gebruiksrecht"** (aparte zelfstandige woningen in hetzelfde gebouw). Zie de architectuurnoot hierboven — waarschijnlijk dezelfde generieke deel-functie, ander deler-aantal. |
| **R10 — gemeenschappelijke parkeerruimten** | 4–9 punten per type parkeerplek, gedeeld | **Zelfde patroon als R9**: rate identiek, deler-eenheid "aantal adressen met gebruiksrecht" i.p.v. "aantal onzelfstandige woonruimten op het adres". Basisvoorwaarden (onroerende aanhorigheid-toets) woordelijk identiek voor zover gecontroleerd. |
| **R11 — WOZ-waarde** | waarderingsmethode | **Structureel verschillend, nadere uitwerking nodig vóór de bouw.** WWSO kent twee waarderingswegen (laatst vastgestelde WOZ-waarde, of 85% taxatiewaarde als er geen WOZ-waarde is) op basis van "WOZ-waarde per m² t.o.v. gemiddelde WOZ-waarde per m² in de regio" (10-14pt-range). WWS kent **drie** wegen — dezelfde eerste twee, plus een derde: **"de geldende minimale WOZ-waarde"** als vloerwaarde. WWS heeft bovendien extra subparagrafen zonder WWSO-equivalent (§2.11.3 uitzondering tijdelijke woningen bij taxatiewaarde was er al bij WWSO als §2.11.3, maar WWS voegt daar nog §2.11.5 "nieuwbouwwoningen 2015-2019", §2.11.6 "kleine nieuwbouwwoningen COROP Utrecht/Amsterdam 2018-2022" en §2.11.7 "uitzonderingen op de WOZ-cap" aan toe — geen van deze vier bestaat in het WWSO-beleidsboek). R12's tekst verwijst zelfs naar een "rubriek 11.2" (voetnoot 13), wat suggereert dat WWS R11 intern in twee sub-onderdelen splitst (11.1 = reguliere WOZ-waardering, 11.2 = de nieuwbouw-uitzonderingen) — dit moet bevestigd worden vóór taak 25/27, het raakt hoe het datamodel voor WOZ-invoer eruit moet zien. |
| **R12 — bijzondere voorzieningen** | +35% zorgwoning, 4 zorgwoning-voorwaarden, aanbelfunctie, laadpalen | **Identiek**, inclusief alle vier zorgwoning-voorwaarden woordelijk hetzelfde. De +35%-opslag in WWS werkt op "rubrieken 1 t/m 11.1" (expliciet exclusief de nieuwe 11.2-nieuwbouw-uitzonderingen) — bevestigt de 11.1/11.2-splitsing hierboven. |
| **R13 — aftrekpunten** | -4pt per situatie (te kleine oppervlakte, verhuurder-in-huis-criterium, klein raam, hoog raamkozijn) | **Bestaat niet in WWS.** WWS gaat in de inhoudsopgave direct van rubriek 12 naar "Opslagen" (§2.13), geen genummerde dertiende rubriek. Logisch: alle vier WWSO-aftrekgronden zijn direct gekoppeld aan het gedeeld-wonen-scenario (met name het "verhuurder woont er zelf en de huurder moet door diens vertrek heen"-criterium) — niet van toepassing op een zelfstandige woning. |
| **Opslagen (WWSO §2.14 / WWS §2.13)** | cumulatie beperkt mogelijk, Rijksmonument, gemeentelijk/provinciaal monument, beschermd dorps-/stadsgezicht | Niet in detail vergeleken dit keer (geen tijd), maar de paragraafstructuur is vrijwel gelijk. WWS heeft er hier een extra §2.13.6 "Nieuwbouw" bij die in de WWSO-inhoudsopgave ontbreekt — nog te bevestigen of dat een echte WWS-only opslag is of alleen een verwijzing naar de R11.2-nieuwbouw-uitzondering hierboven. |
| **Hoofdstuk 1 — sectorindeling, liberalisatiegrens** | sociale/midden/vrije sector, socialesectorgrens/vrijesectorgrens/liberalisatiegrens | **Volledig nieuw voor WWS, bestaat totaal niet in WWSO.** WWSO §1.2 stelt expliciet dat onzelfstandige woonruimte ALTIJD huurprijsbescherming heeft (bevestigd: geen "sector"/"liberalisatiegrens"-treffers in de huidige codebase). WWS kent drie sectoren op basis van huurprijs/puntenaantal (t/m 143pt = sociaal, 144-186pt = midden, 187+pt = vrij), met jaarlijks geïndexeerde grenzen (Bijlage 2) — dit bepaalt of huurprijsbescherming/-toetsing überhaupt van toepassing is. Dit is een substantieel nieuw stuk domeinlogica voor taak 26/28, met geen WWSO-tegenhanger om op te bouwen. |
| **Huurprijs-lookup + >250pt-extrapolatie** | punten → tabel, extrapolatieformule boven 250pt | **Mechanisme woordelijk identiek** — zelfde formule, zelfde uitgewerkte rekenvoorbeeld-structuur (het "€6,62 × 5 = €33,10"-type voorbeeld). De bestaande `bepaalMaxHuur()` in `packages/engine/src/eindtelling/huurprijs.ts` is er al generiek genoeg voor gebouwd (tabel + extrapolatie-boven-hoogste-regel) — voor WWS zou alleen de tabel-data (Bijlage 3 i.p.v. Bijlage 1) hoeven te wisselen. Enige onbekende: hoe de sectorindeling (hierboven) hier precies op inhaakt — vermoedelijk bepaalt de sector OF er een maximale huurprijs geldt, terwijl de tabel-lookup zelf ongewijzigd blijft. Nog te bevestigen bij taak 26. |

## Wat dit betekent voor taak 25-30

- **Taak 25 (datamodel)**: de architectuurkeuze uit het oorspronkelijke Fase 5-plan (apart
  datamodel, geen variant-veld op `PandInvoer`) is nu extra onderbouwd — niet alleen ontbreekt de
  kamertoewijzing, ook R4 (energieprestatie) heeft een ander invoerveld nodig (`soortWoning`) dat
  WWSO net had weggegooid als dood gewicht.
- **Taak 26 (tarieventabellen)**: naast Bijlage 2 (sectorgrenzen) en Bijlage 3 (huurprijstabel) ook
  een aparte R4-labelpuntentabel (Eengezins/Meergezins × label) en een R11-vloerwaarde
  ("minimale WOZ-waarde") als nieuwe datasets. `bepaalMaxHuur()` is met hoge waarschijnlijkheid
  1-op-1 herbruikbaar met alleen nieuwe tabeldata.
- **Taak 27 (rubrieken-engine)**: sterk bewijs dat R1/R2 (zonder deling), R3, R5, R6, R7, R8-privé,
  R12 als gedeelde, parametreerbare rekenregels gebouwd kunnen worden (met een `deelDoorN`-optie
  die WWSO op N=kamertoewijzing zet en WWS op N=1 of N=aantal adressen), in plaats van simpelweg
  gekopieerd. R4 en R11 hebben elk hun eigen, WWS-specifieke mechaniek nodig. R13 (aftrekpunten)
  slaat WWS gewoon over.
- **Taak 28 (sectorindeling/eindtelling)**: substantieel nieuw werk, geen WWSO-basis om op te
  bouwen — wel kan de eindsaldering/afrondingslogica (§2.1.6/2.1.7 generiek) en `bepaalMaxHuur()`
  hergebruikt worden.
- Concreet **advies voor taak 24 als vervolgstap** (niet in dit rapport gedaan): vóór de bouw van
  R11 en de sectorindeling een kortere, gerichte tweede leesronde op precies die twee stukken
  (WWS §2.11 volledig + Bijlage 2/3), want daar zit de meeste onzekerheid.

## Nog te verifiëren (bewust niet in dit rapport gedaan — voor tijdens de bouw)

- R6 §2.6.2 (extra sanitaire voorzieningen) en R9 §2.9.2-2.9.7 (volledige gemeenschappelijke-
  ruimtenregels) zijn alleen op patroon aangenomen als identiek, niet woord-voor-woord gelezen.
- Hoofdstuk 3 (Huurcommissie-procedures, toetsing aanvangshuurprijs/huurverlaging) is voor dit
  rapport niet bekeken — waarschijnlijk niet relevant voor de rekenmotor zelf (dat hoofdstuk gaat
  over procedureregels, niet puntentelling), maar nog te bevestigen.
- Bijlage 1 (Gemeenten in COROP-gebieden Amsterdam/Utrecht), Bijlage 2 (sectorgrenzen), Bijlage 3
  (huurprijstabel) en Bijlage 4 (begrippenlijst) van het WWS-beleidsboek zijn nog niet inhoudelijk
  vergeleken met de bijlagen van het WWSO-beleidsboek.
- De exacte relatie tussen "rubriek 11.1"/"rubriek 11.2" (WWS) moet bevestigd worden — nu alleen
  afgeleid uit een voetnoot bij R12, niet uit de R11-paragraaf zelf gelezen.
