# Audit rekenmotor naast het Beleidsboek WWSO januari 2026

Datum: 2026-10-06 · Engine 0.2.0 · App v0.7.44 · Uitgevoerd door Claude (Opus), op verzoek vóór de bèta.

**Werkwijze.** Elke rubriek (R1–R13), de algemene rekenregels (§2.1), de opslagen (§2.14) en alle
tarieven in `packages/data` naast de tekst van `resources/beleidsboek/` gelegd. Bestaande
onderbouwing meegenomen: `briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md`,
`outputs/RAPPORT_huurcommissie-crossvalidatie_2026-09-04.md`, golden master Kleiweg 179-B.

**Conclusie in één zin.** De tarieven kloppen tot op de cent en de rekenregels volgen het
Beleidsboek; er zijn vier punten waar de uitkomst kan afwijken, waarvan twee te **hoog** kunnen
uitvallen (risico voor een verhuurder) en twee te **laag**.

---

## 1. Bevestigd correct

| Onderdeel | Beleidsboek | Bevinding |
|---|---|---|
| Kwartpuntafronding per rubriek | §2.1.6 (letterlijk) | `floor((x + 0,125) / 0,25) × 0,25`, juist |
| Eindsaldering hele punten | §2.1.7 | vanaf 0,5 omhoog, juist |
| > 250 punten | §2.1.8 | extrapolatie met verschil 249→250, juist |
| Verdeling gedeelde ruimtes | §2.1.4–2.1.5 | gelijk over kamers met toegang, juist |
| R1/R2 m²-rekenregel | §2.2.1.1 / §2.2.2.1 | privé en gedeeld apart afronden, dan samen, juist |
| Meterkast −0,18 m² | §2.2.4 | juist |
| Zolder zonder vaste trap −5, niet negatief | §2.2.2.3 | juist |
| R3 punten, verkoeling alleen bij verwarmd vertrek | §2.3, §2.3.3 | juist |
| R3 open keuken | §2.3.2 | sinds vandaag: vertrek én keuken verwarmd (interpretatie, engine 0.2.0) |
| R4 labelfactoren A++++ t/m G | §2.4.4 | alle 11 waarden exact |
| R4 bouwjaartabel | §2.4.5 | alle 7 grenzen exact |
| R4 monument: geen minpunten | §2.4.6.1 | juist |
| R4 grondslag ongerond | §2.4.4 | bevestigd door 3 Huurprijscheck-uitkomsten |
| R5 aanrechtbanden 0/4/7/10/13 (13 pas bij ≥ 8) | §2.5.2 | juist |
| R5 extra voorzieningen (14 posten), plafond = basispunten | §2.5.3 | alle bedragen exact |
| R6 toilet, wastafel, douche/bad, extra's, plafond | §2.6.1–2.6.2 | bedragen exact, maxima juist (zie 3.2) |
| R7 € 332 per punt | §2.7 | juist |
| R8 2 + 0,35/m² privé, 0,75/m² gedeeld, max 15 samen | §2.8 | juist |
| R9 1 / 0,75 per m², dubbele deling, zorgwoning 3 pt | §2.9 | juist |
| R10 9/6/4 per type, dubbele deling | §2.10.3–2.10.4 | juist (laadpaal: zie 2.2) |
| R11 drempels ±10%, 14/12/10, 85% taxatie, onbekend = 10 | §2.11 | juist |
| COROP-gemiddelden (40 regio's) | Bijlage 1 | juist; tekstversie is verschoven, data gebruikt de goede koppeling (bevestigd via golden master Groot-Rijnmond) |
| R12 zorgwoning +35% op R1–R11, aanbelfunctie 0,25 | §2.12 | juist |
| R13 vier situaties à −4, R1-oppervlakte < 8 m² | §2.13 | juist |
| Monumenten 35% / +10 pt (vóór 1-7-2024) / 15% / 5% (bouwjaar < 1965) | §2.14 | juist |
| Huurprijstabel 0–250 punten | Bijlage 2 | **alle 251 bedragen exact** |

## 2. Kan te HOOG uitvallen (eerst oplossen of beslissen)

### 2.1 Minimummaten vertrek en overige ruimte worden niet gecontroleerd
§2.2.1.2 (letterlijk): een vertrek is "minimaal 4,00 m² groot"; §2.2.2.2: een overige ruimte
"minimale oppervlakte van 2,00 m²". De app telt elke ingevoerde ruimte volledig mee, ook een
privévertrek van 3 m² of een berging van 1,5 m². Een keuken, badkamer of doucheruimte is volgens
§2.2.1 "altijd een vertrek", dus die vallen hier buiten.
**Advies:** zichtbare waarschuwing in de invoer ("kleiner dan 4 m² telt niet als vertrek") en in
de toelichting van R1/R2, geen stille herclassificatie (harde regel 6). Of de motor zo'n ruimte
dan als overige ruimte of als niets telt, is een keuze voor jou.

### 2.2 Laadpaal bij gemeenschappelijke parkeerplek: niet gedeeld door het aantal kamers
§2.10.5 (letterlijk): "2 extra punten ... gedeeld door het aantal adressen". De motor volgt dat
letterlijk: bij 6 kamers op één adres krijgt **elke** kamer 2 punten (samen 12 voor één laadpaal).
Dat botst met de hoofdregel van gelijke verdeling (§2.1.5) en met R12, waar een losse laadpaal
wél door het aantal kamers wordt gedeeld. §2.12.3 verwijst voor de gemeenschappelijke
parkeerruimte terug naar R10.
**Advies:** toetsen in de Huurprijscheck met één pand met laadpaal. Tot dan: dezelfde deling
als de parkeerplek zelf (÷ adressen ÷ kamers), want dat is de voorzichtige kant.

## 3. Kan te LAAG uitvallen

### 3.1 R4 telt een "Gemeenschappelijk vertrek" niet mee
§2.4.4 (letterlijk): oppervlakte van "privé vertrekken en de aan huurder toe te rekenen
gemeenschappelijke vertrekken", met als voorbeeld een gemeenschappelijke woonkamer van 40 m²
gedeeld door 4. De motor rekent R4 alleen over de typen Privévertrek, Keuken en Badruimte. Een
gedeelde woonkamer die als type "Gemeenschappelijk vertrek" is ingevoerd, telt dus niet mee.
De golden master gebruikt dat type niet (alleen gedeelde keukens en badkamers), daarom viel dit
nooit op.
**Advies:** meenemen in R4, met dezelfde toerekening als R9 (÷ adressen ÷ kamers). Rekenregel →
engineversie omhoog. Dit is de duidelijkste correctie van de audit.

### 3.2 Uitzondering wastafels bij 8 of meer kamers ontbreekt
§2.6.1: bij een adres met 8 of meer onzelfstandige woonruimten mag in één ander vertrek dan de
badkamer meer dan 1 wastafel tellen. Het tarief staat in de data
(`wooneenhedenVoorWastafelUitzondering: 8`) maar de motor gebruikt het niet. Alleen relevant
bij grote panden; kan alleen te laag uitvallen.

## 4. Aandachtspunten (geen directe fout)

- **R3 maximum vóór of na de deling.** Besloten is één gezamenlijk maximum van 4 voor overige en
  verkeersruimten (briefing 2026-08-19). Niet besloten: §2.3 schrijft bij de gemeenschappelijke
  variant "(tot maximaal 4 punten) / onzelfstandige wooneenheden", dus het maximum vóór de deling.
  De motor past het toe op het per kamer opgetelde, al gedeelde totaal. In een pand met veel
  gedeelde verwarmde gangen en toiletten kan dat ~0,25–0,5 punt schelen, beide kanten op.
  Advies: één testgeval in de Huurprijscheck.
- **R4 vereenvoudigde labels 2015–2020.** Bewuste keuze (2026-09-05): één vinkje "onbekend of
  vervallen" in plaats van de datum. Wie een vereenvoudigd label invoert zonder dat vinkje,
  krijgt labelpunten waar de Huurcommissie het bouwjaar gebruikt. De uitleg bij het vinkje
  noemt dit; restrisico laag.
- **R4 energie-index en energieprestatievergoeding (0,50/m²)** zitten niet in de motor. Komt bij
  kamerverhuur weinig voor.
- **R6 mengkranen** tellen één keer per sanitaire ruimte; de tabel zegt niet "per stuk". Voorzichtige
  lezing, prima.
- **R8 privé-buitenruimte aan meer kamers toegewezen** krijgt bij elke kamer de volle punten. Privé
  betekent exclusief, dus dit is een invoerfout; een waarschuwing zou helpen.
- **Hardcoded waarden (harde regel 4).** Monumentpercentages 35/15/5, de datum 1-7-2024, de
  bouwjaargrens 1965 en de punten per m²/vertrek in R1–R3 staan in de code, niet in
  `packages/data`. Nu correct, maar bij een nieuw Beleidsboek makkelijk te missen.
- **Engineversie** stond tot vandaag op 0.1.0, terwijl er sinds augustus meerdere rekenregels zijn
  aangepast (o.a. R3 open keuken 2026-09-04, R4-grondslag). Opgeslagen woningen van vóór vandaag
  zijn dus niet te onderscheiden op stempel. Vanaf nu bij elke regelwijziging ophogen.
- **Voorbeelden in het Beleidsboek zelf zijn soms inconsistent**: §2.6.2 deelt 6/4 = 1,5 en vergeet
  de 5 extra punten; §2.8.2 rondt 5,625 af op "5,60" terwijl §2.1.6 5,75 geeft. De motor volgt de
  regels, niet de rekenfouten in de voorbeelden.

## 5. Bekende afwijkingen van de Huurprijscheck (ongewijzigd)

- R11 WOZ: de tool geeft 0 bij onzelfstandige woonruimte; wij volgen §2.11.
- R6 bad + aparte douche: wij 8 (letterlijk §2.6.1), de tool 6.

## 6. Na de audit gevonden

- **Zolder als vertrek** (§2.2.1.3, letterlijk): alleen met vaste trap én beschoten dak. De invoer
  had de vinkjes al, de motor gebruikte ze niet voor R1. Kon te hoog uitvallen. Opgelost samen met
  2.1.

## 7. Uitgevoerd (2026-10-06, v0.7.45, engine 0.3.0)

- 2.1 minimummaten + zolder: waarschuwing én herindeling (besluit eigenaar), centraal in
  `waarderingsType` (`rubrieken/gedeeld.ts`), voor R1–R4, R9, R13. R5/R6 gebruiken het ingevoerde type.
- 3.1 R4 telt "Gemeenschappelijk vertrek" mee, ÷ adressen ÷ kamers. Voorbeeld §2.4.4 als test (19,50).
- 3.2 wastafel-uitzondering 8+: interpretatie: de ruimte waar het maximum de meeste punten kost.
- Golden master Kleiweg 179-B blijft exact. Afrondingstest suggesties: rollen kamer 4/6 omgewisseld.
- Open: 2.2 laadpaal (toetsen in de Huurprijscheck).

## 8. Oorspronkelijk voorstel volgorde vóór de bèta

1. **3.1 R4 + gemeenschappelijk vertrek** meenemen (duidelijke tekst, test eerst, engine 0.3.0).
2. **2.1 minimummaten**: waarschuwing in invoer en toelichting.
3. **2.2 laadpaal**: jouw keuze; voorzichtig advies ÷ adressen ÷ kamers tot de Huurprijscheck anders zegt.
4. Na de bèta: 3.2 (wastafel 8+), R3-maximumtest, hardcoded waarden naar `packages/data`.
