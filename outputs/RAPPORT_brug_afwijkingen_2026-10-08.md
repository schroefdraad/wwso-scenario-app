# Brug Shortlist → Puntum: soorten afwijkingen en hoe ze kleiner te krijgen

Datum: 2026-10-08 · Analyse (Opus), geen code gewijzigd · Basis: steekproef n=20 uit
`briefings/BRIEFING_brug_shortlist_puntum_2026-10-01.md` en
`outputs/RAPPORT_brug_implementatieplan_2026-10-01.md`. De scrapercode en ruwe steekproefdata van
na 2026-09-27 staan niet in deze repo of op GitHub (alleen op de Windows-machine); cijfers hieronder
komen uit die twee documenten.

## 0. Eerst: we meten de verkeerde afwijking

Alle percentages tot nu toe vergelijken de **FML-som** met **Funda "Wonen"**. Maar Puntum heeft
geen Funda-getal nodig; Puntum heeft **WWSO-m² per kamer** nodig (binnenmaats, ≥ 1,50 m hoogte,
kasten bij het vertrek met de kastdeur, type bepaalt 1 / 0,75 / 0 punt per m²). Een afwijking van
+15% op het Funda-totaal kan voor WWSO 0 zijn (de "extra" m² is een berging die in R2 hoort), en
−3% kan voor WWSO toch fout zijn (één kamer te klein, een andere te groot).

**Wat het in euro's betekent.** 1 m² in een privékamer = 1 punt in R1 plus de R4-factor
(label A: 0,65) ≈ 1,65 punt ≈ **€ 8–9 per maand** maximale huur (≈ € 5,25 per punt rond 90 punten,
Bijlage 2). Een gedeelde woonkamer telt per kamer maar 1/n. Dus: **fouten in privékamers wegen
zwaar, fouten in gedeelde ruimtes en in het totaal licht.** De Funda-vergelijking is een
alarmbel, geen maatstaf.

## 1. Zes soorten afwijkingen

| # | Soort | Voorbeelden uit de steekproef | Richting | Op te lossen of alleen te vangen? |
|---|---|---|---|---|
| A | **Telfouten in de scraper** | "Situatie"-floor dubbel geteld (Randweg +52,9%, Kromhoutstraat +77,9%); `Column`-elementjes als overlap gezien (Katendrecht −28,8%) | beide | **Oplosbaar** — al grotendeels gefixt (→ +17,7%, +29,3%, −4,0%). Open: Hertshoornvaren niet hergetest, Noordschans kale fout |
| B | **Mandje-verschil** (definitie) | Berging wel in FML, niet in Funda "Wonen"; vliering idem; kasten-m² | FML hoger | **Geen fout** — wegnemen door appels met appels te vergelijken (zie 2.1) |
| C | **Hoogte < 1,50 m** (zolder, vliering, schuin dak, onder trap) | Randweg vliering 41 m² (zonder vliering −1,1%) | FML hoger | **Niet uit FML** (geen dakmodel). Alleen vangen + vragen (foto, makelaar, inmeting) |
| D | **Toewijzing** (kast bij welk vertrek) | Kromhoutstraat 22 m² "Kast" | WWSO-totaal gelijk, per kamer anders | **Deels oplosbaar** — deurposities zitten mogelijk in `state.items`/`lines` (nog niet geopend) |
| E | **Bronkwaliteit** (tekening ≠ meting) | Maaskade −24,8% (tekening van derde partij), Rakstraat +13,2% (stabiel, onverklaard) | beide | **Niet oplosbaar door slimmer rekenen.** Alleen vangen met een tweede bron |
| F | **Systematische meetmethode** | Oppert −3,2%, Doedesstraat −3,2% (appartementen) | FML iets lager | **Te kalibreren** maar pas met een referentieset (zie 2.5); geen correctiefactor gokken |

Daarnaast een **puntenafwijking zonder m²-afwijking**: het **type** (vertrek / overige ruimte /
verkeersruimte). `role` is onbruikbaar; de naam is het enige signaal. Een gang die als vertrek
wordt ingevoerd, geeft 1 punt per m² te veel. Dit is voor de punten waarschijnlijk de grootste bron
van fouten, en het zit niet in de Funda-percentages.

## 2. Hoe ze kleiner te krijgen, op volgorde van opbrengst

### 2.1 Vergelijk per mandje in plaats van één totaal (B weg) — scraperkant, klein
Funda geeft naast "Wonen" ook **"Overige inpandige ruimte"**, **"Externe bergruimte"** en
**"Gebouwgebonden buitenruimte"**. Een vliering of inpandige berging staat bij "Overige inpandige
ruimte". Vergelijk daarom:
- FML (alle inpandige ruimtes) ↔ Wonen + Overige inpandige ruimte;
- FML berging/vliering ↔ Overige inpandige ruimte + Externe bergruimte.

Verwachting: Randweg (+15,0%) zakt fors, want de 41 m² vliering staat dan aan beide kanten. Wat
overblijft is echte afwijking (C, E). Dit is de goedkoopste winst: het vereist alleen drie
`<dt>/<dd>`-velden die de scraper al leest.

### 2.2 Een tweede referentiegetal: BAG-gebruiksoppervlakte (E en F zichtbaar) — scraperkant
De BAG geeft per verblijfsobject de gebruiksoppervlakte (NEN 2580), gratis en per adres. Drie
getallen (FML, Funda, BAG) maken het verschil tussen "de tekening klopt niet" (FML wijkt af van
beide) en "Funda's getal klopt niet" (Funda wijkt af van beide) direct zichtbaar. Maaskade zou dan
gemarkeerd worden als **bronprobleem**, niet als telfout. Let op: dit is ook het getal dat bij
`wozOppervlak` hoort (WOZ-waardeloket), dus het vult meteen een Puntum-veld in. (Na te gaan:
dekking en API-voorwaarden van de BAG.)

### 2.3 Per verdieping en per ruimte afwijken in plaats van op het totaal — scraperkant
Bereken het verschil per floor (waar dat kan) en markeer de ruimtes die het verschil verklaren:
naam bevat zolder/vliering/kast/berging, of ruimte > 30 m² slaapkamer. Dan ziet de mens niet
"+17,7%, kijk maar", maar "41 m² vliering op 3e verdieping: hoogte controleren". Dat maakt de
menselijke stap kort.

### 2.4 Zolders en schuine daken: niet invullen, wel goed vragen (C) — Puntum-kant
FML heeft geen dakmodel; dat verandert niet. Wat helpt:
- zolder/vliering-m² als **bovengrens** tonen, nooit invullen (staat al in het brugplan §5.2);
- de foto-route vraagt `vasteTrap`/`beschotenDak` (bestaat) en kan ook **"deel onder 1,50 m (schatting)"**
  vragen;
- sinds engine 0.3.0 rekent Puntum een zolder zonder vaste trap of beschoten dak al correct als
  overige ruimte met 5 punten aftrek. De resterende fout zit dus alleen nog in de m² onder 1,50 m.

### 2.5 Een referentieset met échte inmetingen (F kalibreren, alles meten) — samen met Steven
De enige manier om te weten hoe groot de **WWSO-fout per kamer** is: 5–10 panden waar Steven de
kamers zelf heeft ingemeten (zijn vak), naast de FML-polygonen. Dan meet je:
- de afwijking per kamer in m² en in punten (de echte maatstaf, zie §0);
- of de −3,2% bij appartementen een vaste meetmethode-verschuiving is (binnen- vs. hartmaat);
- welke typen ruimtes het vaakst verkeerd geclassificeerd worden.

Zonder zo'n set blijft elke drempel (nu 8%) een gok. Met zo'n set wordt de drempel onderbouwd en
kan een eventuele kalibratie zichtbaar en als interpretatie worden toegepast — nooit stil (harde
regel 6).

### 2.6 Kasten aan het juiste vertrek hangen (D) — scraperkant, onderzoek
`state.items` en `state.lines` zijn nog niet geopend. Als daar deuren met positie in staan, kan een
kast-polygoon automatisch worden toegewezen aan de ruimte waar de deur in uitkomt (§2.2.4). Zo niet:
melding "kast hoort bij welk vertrek?" (staat al in het brugplan).

### 2.7 Type-suggestie uit de naam, met een vaste woordenlijst (typefout) — Puntum-kant
Geen `role`-mapping, wel een kleine, geteste woordenlijst naam → voorgesteld type (woonkamer,
slaapkamer → vertrek; hal, gang, overloop, entree → verkeersruimte; berging, zolder, vliering,
bijkeuken, wc, toilet → overige ruimte; badkamer, keuken → vertrek), altijd als **voorstel** dat de
mens bevestigt. Onbekende naam → verplichte keuze. Testbaar, en precies het domein waar Puntum de
kennis heeft.

## 3. Wat níet te doen

- **Geen correctiefactor** op de FML-som (de −3,2% viel bij n=7 al om).
- **Geen blanket-uitsluiting** van zolders of kasten (beide tellen voor WWSO, alleen anders).
- **Niet breder samplen** om de resterende gevallen te verklaren; ze zijn structureel (C, E), niet
  statistisch. Wél de referentieset (2.5): die meet iets anders, namelijk de echte WWSO-fout.

## 4. Voorstel

| Stap | Waar | Omvang | Effect |
|---|---|---|---|
| 1. Mandjes per Funda-categorie vergelijken (2.1) | scraper | klein | B grotendeels weg; vlaggen alleen nog bij echte afwijking |
| 2. Afwijking per verdieping/ruimte tonen (2.3) | scraper | klein | menselijke stap van minuten naar seconden |
| 3. Referentieset met Steven (2.5) | samen | 5–10 panden | eerste échte foutmaat per kamer; drempel onderbouwd |
| 4. BAG als derde getal (2.2) | scraper | middel | E (bron) en F (methode) uit elkaar te halen; vult `wozOppervlak` |
| 5. Woordenlijst type-suggestie (2.7) | Puntum, na de bèta | klein | grootste puntenfout (type) afgevangen |
| 6. Deuren in `state.items` onderzoeken (2.6) | scraper | onderzoek | D automatisch |

Stap 1, 2, 4 en 6 horen in het scraperproject (Realestate Workflow). Stap 5 is Puntum-werk in
Fase 4 (on hold) — eventueel als losse, pure functie met tests vooruit te bouwen, zonder UI.
Stap 3 kan nu al, en Stevens testronde is er een natuurlijk moment voor.
