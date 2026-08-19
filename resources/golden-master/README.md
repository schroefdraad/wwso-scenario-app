# Golden-master panden — validatieset voor taak 8

Deze map is voor de 3 tot 5 panden met een **bekende uitkomst van de officiële
huurprijscheck-site** van de Huurcommissie. Ze dienen als onafhankelijke
referentie naast `resources/wwso.xlsx`, zodat taak 8 de volledige rekenketen
(R1 t/m R13 + eindtelling) tegen een externe bron kan zetten.

## Eén bestand per pand

Maak per pand een los bestand, bijvoorbeeld `pand-01-<korte-omschrijving>.md`,
met daarin:

1. **Alle invoergegevens** die de huurprijscheck-site aan je gevraagd heeft —
   compleet genoeg om hetzelfde pand later in de engine (`PandInvoer`) na te
   bouwen: kamers/ruimtes met type en oppervlakte, verwarming/verkoeling,
   keuken- en sanitairvoorzieningen, buitenruimtes, WOZ-waarde, energielabel,
   bouwjaar, monumentstatus, etc.
2. **De uitkomst van de site**: het totale puntenaantal én de maximale
   huurprijs die de site teruggeeft. Een screenshot mag ook (los bestand
   ernaast, bijv. `pand-01-screenshot.png`), maar zet de kernwaarden ook als
   tekst in het `.md`-bestand — dat is makkelijker om straks tegen de
   testuitkomst te vergelijken.
3. **Datum van opvraging.** De site kan tarieven per peildatum wijzigen; zonder
   datum is een latere afwijking niet te herleiden naar "verkeerde tarievenset"
   versus "verkeerde rekenregel".
4. **Eventuele twijfelmomenten.** Als de site bij een vraag een keuze vergde
   die niet vanzelfsprekend was (bijv. een grensgeval), schrijf die keuze en
   je overweging erbij — dat is precies het soort informatie waar taak 8 op
   let bij een afwijking.

## Spreiding

Kies bij voorkeur panden die samen een aantal verschillende rubrieken raken
(bijv. één met gemeenschappelijke ruimtes/parkeren, één met een monument, één
eenvoudig pand zonder bijzonderheden) — dat geeft taak 8 meer om op te
valideren dan vijf keer hetzelfde scenario.

## Wat níet hier hoort

Geen aannames of invoer die je zelf hebt verzonnen zonder de site te
raadplegen — dan is het geen onafhankelijke validatie meer. Bij twijfel over
een veld: gewoon opzoeken op de site, niet gokken.
