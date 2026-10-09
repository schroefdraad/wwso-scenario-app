/**
 * Versienummer en wijzigingslog van de WEBAPP zelf (UI/functionaliteit) — bewust losstaand van
 * `ENGINE_VERSIE` in `@wwso/engine` (packages/engine/src/versiestempel.ts), die specifiek de
 * REKENLOGICA versiet voor de reproduceerbaarheid van een opgeslagen deal (taak 15, harde regel
 * 6). Dit bestand is puur voor de gebruiker: "wat is er veranderd", getoond in de footer.
 */
export const APP_VERSIE = '0.7.47';

export interface WijzigingslogEntry {
  versie: string;
  datum: string;
  wijzigingen: string[];
}

/** Nieuwste release eerst. */
export const WIJZIGINGSLOG: WijzigingslogEntry[] = [
  {
    versie: '0.7.47',
    datum: '2026-10-09',
    wijzigingen: [
      'Nieuw: knop "Gegevens ophalen" bij Woning. Puntum zoekt het adres op in de BAG en het WOZ-loket en vult gemeente (met COROP-gebied), bouwjaar, WOZ-waarde, WOZ-peildatum en WOZ-oppervlak (gebruiksoppervlakte uit de BAG) in. Aantal kamers, energielabel en monument vul je zelf in.',
      'Opgehaalde velden hebben een groene rand en een vinkje; de bron staat in de tooltip. Had je zelf al iets anders ingevuld, dan wordt dat niet overschreven: je kiest per veld "Gebruik" of "Houd mijne".',
      'Staan er meerdere woningen op het adres (bijvoorbeeld 49-A, 49-B en 49-C), dan kies je welke. Wordt iets niet gevonden (bijvoorbeeld geen WOZ-waarde bij nieuwbouw), dan blijft het veld leeg en krijg je een melding; er wordt niets geschat.',
    ],
  },
  {
    versie: '0.7.45',
    datum: '2026-10-06',
    wijzigingen: [
      'Rekenregels nagelopen naast het Beleidsboek (rekenmotor versie 0.3.0):',
      'Een kamer of vertrek kleiner dan 4 m² telt niet als vertrek maar als overige ruimte; een overige ruimte kleiner dan 2 m² telt niet mee voor oppervlakte en verwarming (Beleidsboek §2.2.1.2 en §2.2.2.2). Een keuken of badkamer blijft altijd een vertrek. Bij de invoer staat een waarschuwing.',
      'Een zolder telt alleen als vertrek met een vaste trap én een beschoten dak; anders als overige ruimte (§2.2.1.3).',
      'Energieprestatie (rubriek 4): een gemeenschappelijk vertrek, zoals een gedeelde woonkamer, telt nu mee (§2.4.4). Dit kan punten opleveren. Bij een ruimte die met andere adressen wordt gedeeld, wordt ook door het aantal adressen gedeeld, net als in rubriek 9 (interpretatie).',
      'Sanitair: bij 8 of meer kamers tellen in één ruimte buiten de badkamer alle wastafels mee (§2.6.1). Welke ruimte dat is, zegt het Beleidsboek niet; de app kiest de ruimte waar dit de meeste punten oplevert (interpretatie).',
    ],
  },
  {
    versie: '0.7.44',
    datum: '2026-10-06',
    wijzigingen: [
      'Rekenregel verwarming (rubriek 3, Beleidsboek §2.3.2): een kitchenette in een kamer telt alleen als tweede verwarmd vertrek als de kamer én de kitchenette verwarmd zijn. Voorheen kreeg een verwarmde kitchenette in een onverwarmde kamer 2 punten. Dit is een interpretatie, in lijn met de Huurprijscheck. Rekenmotor versie 0.2.0.',
      'Ruimten: zolang het aantal kamers niet is ingevuld, staat er weer "Vul eerst het aantal kamers in" in plaats van een leeg grijs vlak.',
    ],
  },
  {
    versie: '0.7.43',
    datum: '2026-10-06',
    wijzigingen: [
      'Uitleg bij "Kitchenette apart verwarmd?" verbeterd: zet hem aan als de kitchenette zelf verwarmd is. De vorige uitleg kon tot een verkeerde keuze leiden.',
      'Vergelijking: als een scenario niet kon worden opgeslagen omdat je bewerkrechten niet bevestigd konden worden, staat er nu "ververs de pagina" in plaats van een verwijzing naar een uitgeschakelde knop.',
    ],
  },
  {
    versie: '0.7.42',
    datum: '2026-10-06',
    wijzigingen: [
      'Scenario bewerken: na "Opslaan" kon een latere vergelijking van dezelfde woning een oudere tussenstand terugzetten en opslaan. Opgelost: de vergelijking laadt de woning dan vers.',
      'Scenario bewerken: "Opgeslagen ✓" verdwijnt zodra je na het opslaan weer iets wijzigt.',
    ],
  },
  {
    versie: '0.7.41',
    datum: '2026-10-06',
    wijzigingen: [
      'Mijn woningen: Kopiëren en Verwijderen staan nu achter het menu ⋯ aan het eind van elke rij. De lijst is daardoor rustiger.',
      'Verwijderen vraagt om bevestiging in een apart venster. "Annuleren" is de standaardkeuze; per ongeluk dubbelklikken verwijdert niets meer.',
      'Scenario bewerken: nieuwe knop "Opslaan" om een scenario tussendoor op te slaan zonder het scherm te verlaten, net als bij Woning bewerken.',
    ],
  },
  {
    versie: '0.7.40',
    datum: '2026-10-06',
    wijzigingen: [
      'Inloggen is verplicht. De tijdelijke regel waarmee je zonder inloggen woningen kon bijwerken is weg.',
      'Is je sessie verlopen terwijl de pagina open stond, dan wordt opslaan geblokkeerd met de vraag de pagina te verversen en opnieuw in te loggen. Er wordt nooit stil een kopie gemaakt.',
    ],
  },
  {
    versie: '0.7.39',
    datum: '2026-10-06',
    wijzigingen: [
      'Inloggen: een e-mailadres zonder toegang krijgt geen aanmeldmail meer, maar de melding dat het (nog) geen toegang heeft. Foutmeldingen bij inloggen staan nu in gewone taal.',
    ],
  },
  {
    versie: '0.7.38',
    datum: '2026-10-06',
    wijzigingen: [
      'Vergelijking: nieuwe knoppen "Kopiëren naar" per scenario. Kopieer bijvoorbeeld Scenario 1 naar Scenario 2 en bewerk daar verder; het origineel blijft ongewijzigd. Is het doelscenario al gevuld, dan vraagt de app eerst om bevestiging.',
      'Scenario bewerken: "Gebruik als scenario en opslaan" slaat de woning nu meteen op. Voorheen stond een kamerbewerking alleen in beeld tot je zelf op Opslaan klikte.',
      'Bugfix: als alleen Scenario 2 of 3 gevuld was, stond dat scenario na opnieuw openen op het eerste tabblad. Scenario\'s blijven nu op hun eigen plek.',
      'Foutmeldingen bij opslaan in gewone taal, bijvoorbeeld "Je hebt geen bewerkrechten op deze woning" in plaats van een technische databasemelding.',
    ],
  },
  {
    versie: '0.7.37',
    datum: '2026-10-03',
    wijzigingen: [
      'Uitlegteksten (i) en tooltips korter en duidelijker gemaakt, onder meer bij aantal kamers, energielabel, eenhandsmengkranen, laadpaal en investering herindeling.',
      'Gemeente: het (i)-pictogram verschijnt alleen nog als de stad in meerdere gemeentes ligt.',
      'Mijn woningen: kortere tooltips bij "Kopiëren" en bij de voorbeeldwoning.',
    ],
  },
  {
    versie: '0.7.36',
    datum: '2026-10-03',
    wijzigingen: [
      'Mijn woningen: elke woning staat nu op één regel. Lange namen, adressen en notities worden afgekapt met "…" — de volledige tekst zie je als je erop wijst.',
      'Mijn woningen: de stad stond soms dubbel in het adres (bijv. "Cantecleerpad 12, Rotterdam · Rotterdam") — nu niet meer.',
      'Mijn woningen: het mapicoontje staat weer op dezelfde regel als de mapnaam, en de knoppen Kopiëren/Verwijderen lopen gelijk met de rij.',
    ],
  },
  {
    versie: '0.7.35',
    datum: '2026-10-03',
    wijzigingen: [
      'Vergelijking: de labels "melding" en "vergunning" bij maatregelen zijn weg — deze app gaat niet over vergunningen.',
    ],
  },
  {
    versie: '0.7.34',
    datum: '2026-10-03',
    wijzigingen: [
      'Keuken en sanitair: achter elke voorziening staat nu de vaste waarde uit het beleid (bijv. inductie 1,75 pt, douche 3 pt, handdoekenradiator 0,75 pt per stuk). Die verandert niet meer zodra je iets anders aanvinkt.',
      'Nieuw: een balk "x van max. y pt" boven de extra voorzieningen. Die laat zien dat de extra voorzieningen samen nooit meer opleveren dan de punten voor het aanrecht (keuken, §2.5.3) of voor douche en bad (sanitair, §2.6.2), en meldt het als het maximum bereikt is. Met één regel wat het per kamer oplevert.',
      'Het zijpaneel voor sanitair kreeg geen horizontale scrollbalk meer.',
    ],
  },
  {
    versie: '0.7.33',
    datum: '2026-10-03',
    wijzigingen: [
      'Onder de motorkap: alle tijdelijke gegevens die tussen schermen worden doorgegeven, lopen nu via één plek. Zodra je een woning opent, worden achtergebleven gegevens van andere woningen opgeruimd — zodat die nooit meer op het verkeerde scherm terechtkomen. Geen zichtbare wijzigingen.',
    ],
  },
  {
    versie: '0.7.32',
    datum: '2026-10-03',
    wijzigingen: [
      'Bugfix: na de eerste keer "Woning opslaan" van een nieuwe woning gaf verversen een leeg formulier (de woning was wel opgeslagen). De woning staat nu meteen in de adresbalk, zodat verversen of een bladwijzer hem terugvindt — zonder dat het scherm daarbij opnieuw opbouwt.',
      'Bugfix: wisselde het invoerscherm zonder volledig herladen naar een andere of een lege nieuwe woning, dan kon de vorige woning blijven staan. Het formulier wordt dan nu altijd opnieuw opgebouwd.',
    ],
  },
  {
    versie: '0.7.31',
    datum: '2026-10-03',
    wijzigingen: [
      'Onder de motorkap: de navigatie tussen invoer, resultaat en vergelijking loopt nu via één plek, met een automatische test voor elk eerder gemeld geval waarin een woning of scenario onderweg kwijtraakte — zodat die fouten niet ongemerkt terug kunnen komen. Geen zichtbare wijzigingen.',
    ],
  },
  {
    versie: '0.7.30',
    datum: '2026-10-03',
    wijzigingen: [
      'Bugfix: zonder in te loggen gold elke woning als alleen-lezen, waardoor elke keer "Opslaan" of "Doorrekenen" een nieuwe "(kopie)" maakte, en automatisch opslaan op de vergelijking niet werkte. Zolang inloggen nog niet verplicht is, worden woningen nu gewoon bijgewerkt — alleen de voorbeeldwoning blijft beschermd.',
    ],
  },
  {
    versie: '0.7.29',
    datum: '2026-10-03',
    wijzigingen: [
      'Vergelijking: "Leegmaken" heeft nu hetzelfde scheidingsstreepje en dezelfde marge als de andere acties onder een kolom.',
    ],
  },
  {
    versie: '0.7.28',
    datum: '2026-10-03',
    wijzigingen: [
      'Voorzieningen per ruimtetype nagelopen tegen het beleid: keuken en sanitair kun je alleen nog toevoegen bij een vertrek of overige ruimte (privé of gemeenschappelijk) — niet meer bij een buitenruimte, verkeersruimte of parkeerplek (§2.6.1, §2.3.2, §2.9.2).',
      'Zolder kan alleen nog bij een privévertrek, berging of overige ruimte (§2.2.1.3, §2.2.2.3) — niet meer bij bijv. een keuken, badruimte of toiletruimte.',
      'Rekenregel: een keuken of sanitaire voorziening in een buitenruimte, verkeersruimte of parkeerplek telt niet meer mee voor de punten; de toelichting legt uit waarom. Van de opgeslagen woningen had geen enkele zo\'n voorziening, dus er veranderen geen bestaande uitkomsten.',
      'Een al ingevulde voorziening bij een ruimtetype waar hij niet (meer) telt, blijft zichtbaar en kun je verwijderen.',
    ],
  },
  {
    versie: '0.7.27',
    datum: '2026-10-03',
    wijzigingen: [
      'Vergelijking: "Leegmaken" staat nu bij elk scenario, uitgegrijsd zolang het scenario nog leeg is — net als "Bekijk volledig resultaat". Zo staan de links onder alle scenario\'s op dezelfde plek.',
    ],
  },
  {
    versie: '0.7.26',
    datum: '2026-10-03',
    wijzigingen: [
      'Parkeerplek: de soort kies je nu in gewone woorden — Garage (9 pt), Buiten, overdekt (6 pt) of Buiten, open (4 pt) — met de beleidscode type I/II/III klein erbij. Het paneel laat ook zien wat de plek per kamer werkelijk oplevert, en wanneer een plek volgens het beleid meetelt.',
      'Parkeerplek: het dubbele schuifje "Parkeerplek aanwezig" is weg — een ruimte van het type "Parkeerplek gemeenschappelijk" ís al een parkeerplek. Er wordt ook niet meer stilzwijgend een soort voor je gekozen: zolang je die niet kiest, meldt "Doorrekenen" wat er nog ontbreekt (voorheen telde zo\'n plek ongemerkt als 0 punten).',
      'Toelichting en PDF noemen de parkeerplek nu ook bij naam (bijv. "parkeerplek buiten, overdekt (type II)").',
      'Schuifjes in het zijpaneel werden onbedoeld breed uitgerekt — staan weer op normale grootte.',
      'Vergelijking: de link onder een scenario heet nu "Scenario bewerken" (was "Woning bewerken", net als bij de as-is).',
    ],
  },
  {
    versie: '0.7.25',
    datum: '2026-10-03',
    wijzigingen: [
      'Resultaat: "PDF downloaden" staat nu onder de tabel i.p.v. in de topnavigatie.',
      '"Mijn woningen" in de topnavigatie is nu een knop (omlijnd), net als de andere acties.',
      'Vergelijking: investering, terugverdientijd en rendement tonen alleen nog de verwachte waarde, zonder bandbreedte.',
      'Vergelijking: naam en map van de woning (met de opslaan-knop) staan nu rechts in de regel onder de topnavigatie; het notitieveld staat alleen nog op het invoerscherm.',
      'Vergelijking: "Bekijk volledig resultaat" staat er bij elk scenario, uitgegrijsd zolang er nog niets door te rekenen is (het losse streepje bij een leeg scenario is weg). De uitlegtekst over de energielabel-wisseling onder Optimalisaties is weg.',
      'Woning bewerken: geen "Alles wissen"-knop meer — die staat alleen nog bij een nieuwe woning.',
    ],
  },
  {
    versie: '0.7.24',
    datum: '2026-10-03',
    wijzigingen: [
      'Bugfix: na "Bekijk volledig resultaat" of "Woning bewerken" bij een scenario en daarna via Mijn woningen een andere woning openen, kreeg die andere woning de naam, scenario\'s en koppeling van de vorige — één klik op "Opslaan" overschreef dan de vorige woning. Een tussenstand wordt nu alleen nog teruggezet bij dezelfde woning.',
      'Bugfix: na het bewerken van een scenario opende "+ Nieuwe woning" dat oude scenario i.p.v. een leeg formulier.',
      'Elke stap vanaf de vergelijking ("Bekijk volledig resultaat", "Woning bewerken", een scenario bewerken) slaat nu eerst automatisch op en gaat alleen verder als opslaan gelukt is. Niet-opgeslagen scenariowijzigingen kunnen zo niet meer stil verdwijnen.',
      'De vergelijkingspagina kent nu ook de bewerkrechten: bij een alleen-lezen woning (bijv. de demowoning) maakt "Opslaan" een eigen kopie i.p.v. een foutmelding, en bij onzekere rechten staat opslaan uit.',
      'Het resultaatscherm na "Doorrekenen →" heeft nu de woning in de link, zodat het ook in een nieuw tabblad of als bladwijzer werkt.',
    ],
  },
  {
    versie: '0.7.23',
    datum: '2026-10-03',
    wijzigingen: [
      'Eén en dezelfde topnavigatie op alle schermen (Mijn woningen, invoer, resultaat, vergelijking): logo en paginatitel links, "Mijn woningen" en de acties rechts, met de hoofdactie steeds als groene knop. Daarvoor zag de balk er per scherm anders uit en sprong hij bij elke paginawissel.',
      'Woninginformatie (naam, adres, stad, kamers, peildatum) staat op elk scherm in dezelfde regel direct onder de topnavigatie — de woningnaam eerst, het kameraantal daarna, en "1 kamer" in het enkelvoud.',
      'Vergelijking: naam, map, notitie en de opslaan-knop staan nu in een eigen blok bovenaan de pagina i.p.v. in de topnavigatie.',
      'Resultaat: "Mijn woningen" staat nu ook in de topnavigatie.',
      'Invoer: de sectielinks ① Woning / ② Ruimten / ③ Overige posten staan niet meer in de topnavigatie — het vinkje van Woning staat nu in de sectiekop zelf. De knop heet bij een bestaande woning gewoon "Opslaan" (was soms "Opslaan als eigen woning").',
      'Mijn woningen: het mapfilter staat nu boven de lijst i.p.v. in de topnavigatie.',
    ],
  },
  {
    versie: '0.7.22',
    datum: '2026-10-03',
    wijzigingen: [
      'Parkeerplek kon worden geselecteerd bij elk ruimtetype, ook bijv. een badkamer — klopte niet met het beleid (§2.10: alleen bij een ruimte van het type \'Parkeerplek gemeenschappelijk\'). Zolder had hetzelfde soort probleem (hoort alleen bij een vertrek/overige ruimte, §2.2.1.3/§2.2.2.3). Beide iconen tonen nu alleen nog bij een passend ruimtetype — Keuken en Sanitair blijven bewust overal beschikbaar, dat is conform beleid (bijv. een douche in een slaapkamer is expliciet toegestaan).',
      'Kolomkop "Voorz." voluit naar "Voorzieningen".',
    ],
  },
  {
    versie: '0.7.21',
    datum: '2026-10-03',
    wijzigingen: [
      'Topnavigatie verder opgeschoond ("topnavigatie is voor navigatie"): kameraantal, woningnaam en alleen-lezen/scenario-context staan niet meer tussen de navigatieknoppen, maar op een eigen, niet-sticky regel direct eronder.',
    ],
  },
  {
    versie: '0.7.20',
    datum: '2026-10-02',
    wijzigingen: [
      'Verfijning op de v0.7.19-fix: bij onzekere bewerkrechten staan "Opslaan"/"Doorrekenen" nu gewoon uit (geen wegklikbare melding meer) — ernaast staat een losse, bewust secundaire knop "Toch opslaan als nieuwe kopie →" voor het geval van een écht aanhoudende storing, zodat je niet volledig vast kan komen te zitten.',
      'Ruimten-sectie opgeschoond: "Voorbeeldpand laden"/"Alles verwarmd"/"Alles verkoeld" weg, "Snel toevoegen" staat weer gegarandeerd op dezelfde regel als de bijbehorende knoppen.',
      'Ruimte-voorzieningen: de tab-switcher (Keuken/Sanitair/Zolder/Parkeerplek) bovenin het paneel is weg — je ziet meteen het paneel van het icoon waar je op klikte. Parkeerplek heeft nu ook een eigen icoon in de ruimterij (🅿️, stond er eerst niet). Het elektra/meterkast-icoontje staat voortaan naast het m²-veld (waar het inhoudelijk bij hoort) met een echte uitleg i.p.v. alleen een hover-tooltip.',
      'Topnavigatie opgeschoond: het adres staat er niet meer los in (al zichtbaar in het Woning-veld zelf en de browsertab-titel), en de titel is nu een korte contextlabel.',
    ],
  },
  {
    versie: '0.7.19',
    datum: '2026-10-02',
    wijzigingen: [
      '"Woning bewerken" maakte soms stilzwijgend een nieuwe, losse kopie i.p.v. de bestaande woning bij te werken (zichtbaar als een stapel "(kopie)"-woningen, en als een scenario dat leek te verdwijnen) — gebeurde bij een tijdelijke hapering in de bewerkrechten-check. Die check krijgt nu een automatische herkansing, en bij aanhoudende onzekerheid eerst een duidelijke melding met de kans om te annuleren, in plaats van gewoon door te gaan.',
      '"Woning bewerken" op een scenario dat je al eerder handmatig had aangepast, viel terug naar de oorspronkelijke as-is-staat — eerdere aanpassingen aan dat scenario gingen zo verloren. Begint nu vanaf de laatst bewerkte staat van dat scenario.',
      'Nieuwe "🗑 Verwijderen"-knop op het woningenoverzicht (met een bevestigingsstap) — ontbrak volledig, alleen kopiëren was mogelijk.',
      'Drie ontbrekende optimalisaties toegevoegd: eenhandsmengkraan en thermostatische mengkraan in de keuken, eenhandsmengkraan bij sanitair. Combimagnetron/oven telt nu ook het ovenpunt mee, niet meer alleen het magnetronpunt.',
    ],
  },
  {
    versie: '0.7.18',
    datum: '2026-10-01',
    wijzigingen: [
      'Meterkast-correctie toegevoegd (§2.2.4): een nieuw vinkje per ruimte trekt 0,18 m² af van de oppervlakte bij een gas-/elektrameter in het vertrek of een kast daarin, vóórdat de puntentelling (rubriek 1, 2 en 9) ermee rekent.',
      'Zolder nu direct selecteerbaar via een eigen 🪜-knop bij elke ruimte (stond voorheen verstopt achter de Keuken- of Sanitair-lade).',
    ],
  },
  {
    versie: '0.7.17',
    datum: '2026-09-25',
    wijzigingen: [
      'Productie-incident direct verholpen: "Woningen ophalen mislukt" voor woningen waar een ruimte ooit van type wisselde (bijv. Toiletruimte → Badruimte) zonder het toiletType-veld bij te werken. De harde toiletType/ruimtetype-validatie uit v0.7.16 wees zulke, al langer bestaande data af bij het laden. Teruggedraaid naar alleen een UI-filter (voorkomt nieuwe inconsistente keuzes, wijzigt nooit stilzwijgend bestaande data) — geen harde afwijzing meer bij het laden.',
    ],
  },
  {
    versie: '0.7.16',
    datum: '2026-09-22',
    wijzigingen: [
      'Kleine validatie-toevoeging: het toilettype van een sanitaire voorziening moet nu passen bij het ruimtetype (toiletruimte- of badkamer-tarief) — voorkomt de inconsistente combinatie die tijdens de Huurcommissie-crossvalidatie (2026-09-04) in testdata aan het licht kwam. Gedeelde `toegestaneToiletTypes()`-functie voor zowel het toiletType-dropdownveld als de puntentelling-validatie. **Zie v0.7.17: de validatie bleek te streng voor al bestaande data en is teruggedraaid naar alleen het UI-filter.**',
    ],
  },
  {
    versie: '0.7.15',
    datum: '2026-09-20',
    wijzigingen: [
      'Feedbackknop toegevoegd (rechtsonder, alleen zichtbaar ingelogd) — stuurt een berichtje plus automatisch URL, user agent en recente foutmeldingen mee, met een e-mailmelding naar de beheerder.',
    ],
  },
  {
    versie: '0.7.14',
    datum: '2026-09-20',
    wijzigingen: [
      'Sentry toegevoegd voor automatische foutregistratie (gratis tier, alleen client- en server-side foutmeldingen, geen performance/tracing) — stille crashes die niemand meldt worden voortaan zichtbaar.',
    ],
  },
  {
    versie: '0.7.13',
    datum: '2026-09-19',
    wijzigingen: [
      'Bugfix: een scenario met alleen een energielabel-wisseling (geen kamerbewerking) bleef de oude AS-IS-punten tonen nadat de AS-IS zelf bewerkt en opnieuw opgeslagen was — pas na het loskoppelen en opnieuw kiezen van het label werd het scenario bijgewerkt. Zo\'n scenario volgt nu automatisch de actuele AS-IS; een scenario met een eigen kamerbewerking blijft terecht ongewijzigd bij een latere AS-IS-aanpassing.',
    ],
  },
  {
    versie: '0.7.12',
    datum: '2026-09-19',
    wijzigingen: [
      'Bugfix: "Snel invullen: Kitchenette 122cm/240cm" nam geen extra kastruimte mee, ook al biedt beide varianten meer kastruimte dan het wettelijke minimum. 122cm-kitchenette levert nu 1,5 punt extra op, 240cm-kitchenette 0,75 punt.',
    ],
  },
  {
    versie: '0.7.11',
    datum: '2026-09-19',
    wijzigingen: [
      'Disclaimer toegevoegd onderaan elke pagina en op de PDF-export: "Indicatieve berekening op basis van het Beleidsboek WWSO (januari 2026). Geen rechten te ontlenen aan deze uitkomst — raadpleeg bij twijfel de officiële Huurprijscheck van de Huurcommissie."',
    ],
  },
  {
    versie: '0.7.10',
    datum: '2026-09-19',
    wijzigingen: [
      'Het puntenbadge naast "Aantal wastafels"/"Aantal fonteintjes" en "Meerpersoonswastafels" toont nu de punten die het huidige aantal oplevert, niet meer de (vaak 0, want al tegen het maximum van 1 punt per vertrek) waarde van een volgend exemplaar.',
      'De vijf extra-eisen (§2.6.2) blijven nu verborgen in elke ruimte zonder douche/bad aangevinkt, niet meer alleen in een toiletruimte — die eisen leveren daar toch nooit punten op.',
      'Bugfix: het typen van een plaatsnaam kon de Gemeente stilzwijgend op een verkeerde tussentijdse match laten staan (bijv. "Rotterdam" typen liep even via het bestaande plaatsje "Rott" en bleef op gemeente Vaals staan). De suggestie draait nu pas als het Stad-veld verlaten wordt.',
      'PDF-export: het donkere-lint-koptype ("band") is nu de standaard in plaats van de lichte variant.',
    ],
  },
  {
    versie: '0.7.9',
    datum: '2026-09-12',
    wijzigingen: [
      'Terugverdientijd en marginaal rendement houden nu rekening met huurindexatie (3,3% per jaar, uit de rendementscalculator) — de extra jaarhuur groeit dus mee in plaats van vlak te blijven, waardoor de terugverdientijd korter uitvalt dan voorheen.',
    ],
  },
  {
    versie: '0.7.8',
    datum: '2026-09-09',
    wijzigingen: [
      '"Optimalisaties" staat nu als titel boven het tabblad-per-scenario, niet meer per tabblad herhaald.',
      'Maandhuur staat nu als eigen regel in de scenariovergelijking, naast Jaarhuur.',
      'Aftrekpunten (§2.13): de "oppervlakte < 8 m²"-situatie (automatisch bepaald uit de ruimte-invoer) staat nu ook in de tabel, naast de drie handmatige situaties.',
      'Mijn woningen: het overzicht is breder, zodat alle kolommen passen zonder onnodig te scrollen.',
      'Bug: een nieuwe map aanmaken op de scenariovergelijking kon op een smal scherm de "Opslaan"-knop buiten beeld duwen — die rij wrapt nu netjes, en Enter in het naamveld slaat ook direct op.',
    ],
  },
  {
    versie: '0.7.7',
    datum: '2026-09-09',
    wijzigingen: [
      'Sanitair: "Eenhandsmengkraan" en "Thermostatische mengkraan" zijn nu aantalvelden i.p.v. vinkjes — handig bij een meerpersoonswastafel met meerdere kranen. De punten (§2.6.2) blijven zoals in het beleidsboek: eenmalig zodra het aantal > 0 is, niet vermenigvuldigd met het aantal.',
    ],
  },
  {
    versie: '0.7.6',
    datum: '2026-09-09',
    wijzigingen: [
      'Toiletruimte: "Sanitair aanwezig" hoeft niet meer apart aangezet te worden, en de m² wordt standaard op 1,3 gezet (aanpasbaar).',
      'Nieuw: "Ruimte toevoegen"-dropdown naast "Voorbeeldpand laden", met alle ruimtetypen — niet alleen de vijf snelkoppelingen.',
      'Bug: een ruimte kopiëren nam de m² niet meer over — dat gebeurt nu weer wel, samen met de rest van de ruimte.',
      'Nieuw: woningen kopiëren vanuit "Mijn woningen" — maakt een losstaande kopie met pand, scenario\'s, notitie en map.',
      'Bij de scenariovergelijking staat nu ook de maandhuur onder de jaarhuur.',
    ],
  },
  {
    versie: '0.7.5',
    datum: '2026-09-08',
    wijzigingen: [
      'Bug: een "+ Nieuwe woning" kon stilzwijgend de gegevens van de laatst bewerkte, andere woning tonen i.p.v. een leeg formulier — en opslaan werkte die oude woning dan bij i.p.v. een nieuwe aan te maken. "Nieuwe woning" begint nu altijd écht leeg als er nog een koppeling aan een bestaande woning in de sessie hing.',
    ],
  },
  {
    versie: '0.7.4',
    datum: '2026-09-08',
    wijzigingen: [
      'Bug: "Doorrekenen →" sloeg de woning nergens op — alleen de aparte "Woning opslaan"-knop deed dat. Een verse woning die je doorrekende en waarvan je de PDF downloadde zonder apart op te slaan, was daarna nergens meer terug te vinden. "Doorrekenen" slaat de woning nu altijd eerst op voordat je naar het resultaatscherm gaat.',
    ],
  },
  {
    versie: '0.7.3',
    datum: '2026-09-07',
    wijzigingen: [
      '"Kamers bewerken" heet nu "Woning bewerken", zonder het info-icoontje ernaast (voegde niks toe)',
      'Browsertabblad toont nu per pagina een eigen titel (bijv. "Nieuwe Woning - Puntum", "Resultaat - Puntum") i.p.v. overal dezelfde titel',
      'Bug: een energielabel-scenario sloot standaardmaatregelen én een handmatige kamerbewerking volledig uit — kiezen van een doellabel overschreef stilzwijgend een net gerealiseerde kamer. Een energielabel-wisseling werkt nu als een laag bovenop het scenario, niet meer als exclusief alternatief: kamer realiseren + labelwisseling + maatregelen tellen nu allemaal samen op tot één Investering/Terugverdientijd/Rendement',
    ],
  },
  {
    versie: '0.7.2',
    datum: '2026-09-05',
    wijzigingen: [
      'Samenvattingstabel scenariovergelijking: tekst gecentreerd, de "Vergunningplichtig"-rij verwijderd (staat al per maatregel bij de melding/vergunning-badge)',
      '"Bewerk handmatig" heet nu "Kamers bewerken", met een toelichting bij hover en een streepje om het te onderscheiden van "Bekijk volledig resultaat"/"Leegmaken"',
    ],
  },
  {
    versie: '0.7.1',
    datum: '2026-09-05',
    wijzigingen: [
      'Het "melding"/"vergunning"-label bij een maatregel toont nu bij hover de exacte toelichting uit de catalogus, i.p.v. alleen een kort label zonder uitleg',
    ],
  },
  {
    versie: '0.7.0',
    datum: '2026-09-05',
    wijzigingen: [
      'Scenariovergelijking: de gedeelde "Optimalisaties"-tabel is vervangen door een tabblad per scenario — geen scroll meer voorbij scenario 1 om scenario 2 of 3 in te vullen',
      'Handmatig bewerkte kamers en aangevinkte maatregelen werken nu op hetzelfde scenario samen, in plaats van dat een vinkje een handmatige kamerbewerking ongemerkt verving',
    ],
  },
  {
    versie: '0.6.2',
    datum: '2026-09-05',
    wijzigingen: [
      'Veldindeling van de woninggegevens strakgetrokken: vaste, bewuste rijen (adres/stad/gemeente/kamers — WOZ — energielabel/bouwjaar — monument/zorgwoning) i.p.v. een rij die willekeurig brak op schermbreedte',
    ],
  },
  {
    versie: '0.6.1',
    datum: '2026-09-05',
    wijzigingen: [
      '"Ingangsdatum label" vervangen door één vinkje "Ingangsdatum onbekend of ouder dan 10 jaar" — een gekozen energielabel wordt voortaan gewoon gebruikt, ook zonder exacte datum (feedback Emma)',
      'Kitchenette-varianten (122cm/240cm) tonen zich nu als duidelijke keuzegroep op de scenariopagina — de andere variant grijst automatisch uit zodra je er één kiest voor dezelfde kamer',
    ],
  },
  {
    versie: '0.6.0',
    datum: '2026-09-05',
    wijzigingen: [
      'Rustiger invoerscherm: een expliciete keuze tussen WOZ-waarde en taxatiewaarde (i.p.v. een veld dat vanzelf verscheen/verdween), en veldtoelichting verstopt achter een klein infopictogram i.p.v. altijd zichtbaar onder elk veld',
      '"Soort woning" (Eengezins/Meergezins) en "Aantal woningen in complex" verwijderd — bleken na een volledige controle nergens in de puntenberekening te worden gebruikt',
    ],
  },
  {
    versie: '0.5.9',
    datum: '2026-09-05',
    wijzigingen: [
      '"Pand"/"Deal(s)" heten overal in de UI en in de URL\'s nu "Woning"/"Woningen" (bijv. /deals → /woningen, /pand/nieuw → /woning/nieuw) — oude links blijven werken via een automatische doorverwijzing',
    ],
  },
  {
    versie: '0.5.8',
    datum: '2026-09-05',
    wijzigingen: [
      'De browsertab toont nu per pagina een eigen titel (adres/dealnaam) i.p.v. overal dezelfde — handig bij meerdere open tabs',
    ],
  },
  {
    versie: '0.5.7',
    datum: '2026-09-05',
    wijzigingen: [
      'Nieuw: een vaste "home"-link (het pictogram) linksboven op elke pagina, terug naar Mijn deals',
      'Bugfix: een net getypte nieuwe map kon je niet meer terugzetten naar de dropdown, en leek na opslaan niet aan te komen — de dropdown toont hem nu meteen als optie en springt vanzelf terug',
      'Het puntenbalkje per kamer (K1/K2/...) bovenin de pand-invoerpagina is verwijderd',
    ],
  },
  {
    versie: '0.5.6',
    datum: '2026-09-04',
    wijzigingen: [
      'Het resultaatscherm (/pand/resultaat) is nu ook bereikbaar via een link met ?deal=<id> — bookmarken, in een nieuwe tab openen of delen werkte voorheen niet voor een AS-IS-resultaat',
      'Als een resultaat- of vergelijkingspagina geen invoer kan vinden, staat er nu ook een link naar "Mijn deals", niet alleen naar een leeg invoerscherm',
    ],
  },
  {
    versie: '0.5.5',
    datum: '2026-09-04',
    wijzigingen: [
      'Gemeente-dropdown toont bij een meerduidige stad (bijv. "Aalst", in drie gemeentes) nu alleen die kandidaat-gemeentes, in plaats van alle 342',
    ],
  },
  {
    versie: '0.5.4',
    datum: '2026-09-04',
    wijzigingen: [
      'Bugfix (R3 Verwarming): een kamer met een eigen kitchenette telde de verwarmingspunten van die open keuken niet apart mee — het beleidsboek (§2.3.2) schrijft juist voor dat zo\'n open keuken als een tweede verwarmd vertrek gewaardeerd wordt. Nieuwe toggle "Kitchenette apart verwarmd?" in het Keuken-paneel, standaard uit',
      'Toiletype-veld in de Sanitair-lade toont nu alleen nog de opties die bij het gekozen ruimtetype horen (badkamer- of toiletruimte-varianten) — voorkomt een inconsistente combinatie',
      'Ontdekt tijdens een handmatige cross-validatie tegen de officiële Huurcommissie Huurprijscheck, zie outputs/RAPPORT_huurcommissie-crossvalidatie_2026-09-04.md',
    ],
  },
  {
    versie: '0.5.3',
    datum: '2026-09-04',
    wijzigingen: [
      'Deals-overzicht: kolom "Map" staat nu achter "Laatst bijgewerkt", kolom "Tarieven-peildatum" verwijderd',
      'Notitie bij een deal is nu al in te vullen op de pand-invoerpagina zelf (onderaan), niet pas op de scenariovergelijkingspagina',
      '"Deal bijwerken"-knop heet nu "Opslaan"; rubriekstitel "Maatregelen" heet nu "Optimalisaties"',
      'Datumnotatie overal consistent als DD-MM-JJJJ (resultaatscherm, PDF, footer-wijzigingslog, deals-overzicht)',
      'De controle-uitkomsten zijn van het resultaatscherm gehaald (bleven wel op de PDF staan) — niet relevant voor de eindgebruiker',
      'Scenariovergelijking: "Map" is nu een dropdown van bestaande mappen plus een "Nieuwe map…"-optie, in plaats van een vrij tekstveld',
      'Nieuw pictogram (favicon) in de browsertab',
    ],
  },
  {
    versie: '0.5.2',
    datum: '2026-09-04',
    wijzigingen: [
      'Vrije notitie per deal, zichtbaar in het deals-overzicht — te bewerken op de scenariovergelijkingspagina',
      'Deals kunnen nu in een map gezet worden (persoonlijke ordening) — het deals-overzicht heeft een mapfilter zodra er minstens één deal een map heeft',
    ],
  },
  {
    versie: '0.5.1',
    datum: '2026-09-04',
    wijzigingen: [
      'COROP-gebied wordt niet meer handmatig gekozen — typ de stad, en de gemeente (en daarmee het COROP-gebied) wordt automatisch gesuggereerd. Komt de plaatsnaam in meerdere gemeentes voor, dan blijft de keuze aan jou',
    ],
  },
  {
    versie: '0.5.0',
    datum: '2026-09-04',
    wijzigingen: [
      'De automatische Basis/Comfort/Maximaal-sneltoetsen op de scenariovergelijking zijn verwijderd (niet gebruikt door de externe gebruiker)',
      'Energielabel-scenario\'s: eigen kosteninschatting per doellabel (A+/A++/A+++) op het pandgegevens-scherm, en een wisselknop per scenariokolom die daarmee live doorrekent',
      'Handmatig bewerkte scenario\'s: elke aangevinkte maatregel heeft nu een eigen, overschrijfbaar prijsveld (voorgevuld met de catalogusprijs) naast het bestaande investeringsbedrag voor de herindeling — maakt zichtbaar welke maatregel een investeringsverschil tussen scenario\'s veroorzaakt',
    ],
  },
  {
    versie: '0.4.4',
    datum: '2026-08-24',
    wijzigingen: [
      'Bugfix: "Wastafel op kamer" (S-01) werd nog aangeboden als de kamer al aan de puntencap zat — leverde dan 0 extra huur op ondanks een investeringsbedrag',
    ],
  },
  {
    versie: '0.4.3',
    datum: '2026-08-24',
    wijzigingen: [
      'Inloggen via magic link (e-mail) — alleen bekende e-mailadressen krijgen toegang tot deals',
      'Maatregeltabel: de "melding"-badge (bijv. bij split-airco) toont nu bij hovering een tooltip met de reden',
      'Kolomkoppen "Solo +€/jr"/"Solo investering" ingekort naar "+€/jr"/"Investering"',
    ],
  },
  {
    versie: '0.4.2',
    datum: '2026-08-24',
    wijzigingen: [
      'Sanitair-lade: in een toiletruimte heet "wastafel" nu "fonteintje", max. 1 per toiletruimte, geen meerpersoonswastafel-optie meer',
      'Onder AS-IS op de scenariopagina staat nu ook "Bekijk volledig resultaat →" — voorheen alleen bereikbaar via de browser-terugknop',
      'Resultaatscherm en PDF tonen nu ook het totaal (som over alle kamers) aan maandhuur en jaarhuur, naast de puntenopbouw per kamer',
      'Knoppen per scenario-kolom herordend: "Bekijk volledig resultaat", "Bewerk handmatig" en "Leegmaken" staan nu als drie tekstlinks onder elkaar',
    ],
  },
  {
    versie: '0.4.1',
    datum: '2026-08-22',
    wijzigingen: [
      'Een handmatig bewerkt scenario (incl. de maatregelen daarbovenop en de handmatige investering) kan nu ook opgeslagen worden in een deal',
    ],
  },
  {
    versie: '0.4.0',
    datum: '2026-08-22',
    wijzigingen: [
      'Een handmatig bewerkt scenario (bijv. een extra kamer erbij) kan nu ook standaardmaatregelen krijgen mét een eigen kosten/terugverdientijd-berekening — inclusief maatregelen die specifiek op de nieuwe kamer van toepassing zijn',
    ],
  },
  {
    versie: '0.3.2',
    datum: '2026-08-22',
    wijzigingen: [
      'Bugfix: "Doorrekenen"/"Deal opslaan" kon uitgeschakeld blijven zonder enige zichtbare reden — de knop en de puntenstrip laten nu altijd zien wat er nog ontbreekt',
      'Bugfix: een leeg "aantal adressen met toegang"-veld bij een gedeelde ruimte zag eruit als al ingevuld — nu duidelijk herkenbaar met een amber rand zolang het leeg is',
    ],
  },
  {
    versie: '0.3.1',
    datum: '2026-08-22',
    wijzigingen: [
      'Bugfix: de suggestie-engine stelde soms voor om een buitenruimte of parkeerplek te "verwarmen" voor meer punten — dat leverde nooit punten op en kan niet meer voorgesteld worden',
      'Ingangsdatum van het energielabel is nu altijd optioneel — onbekend? Laat leeg, de motor valt dan terug op de bouwjaargrenzen',
    ],
  },
  {
    versie: '0.3.0',
    datum: '2026-08-21',
    wijzigingen: [
      'Nieuw pand kan al vóór Doorrekenen als deal opgeslagen worden, zodat het meteen op de deals-pagina staat',
      'Bugfix: een tweede scenario handmatig bewerken wiste niet langer het eerste — en de deal-koppeling ging niet meer verloren bij terugkeer van het bewerkscherm',
    ],
  },
  {
    versie: '0.2.0',
    datum: '2026-08-21',
    wijzigingen: [
      'AS-IS kopiëren naar een handmatig bewerkbaar TO-BE-scenario — "Bewerk handmatig →" op het vergelijkingsscherm opent een volledige, vrij te bewerken kopie van de as-is, en het resultaat verschijnt als scenario-kolom naast de as-is',
    ],
  },
  {
    versie: '0.1.0',
    datum: '2026-08-21',
    wijzigingen: [
      'PDF-export van de puntenopbouw, vanaf het resultaatscherm',
      'Autosave op het invoerscherm — een refresh of terug-navigatie kost geen ingevoerde gegevens meer',
      'De as-is van een opgeslagen deal is achteraf weer bewerkbaar via "Pandgegevens bewerken"',
      'Puntenweergave per faciliteit in de keuken- en sanitair-lade (bijv. stopcontact, handdoekenradiator)',
      'Sanitair-lade toont bij een toiletruimte alleen de relevante velden, geen overbodige douche/bad-opties',
      'WOZ-peildatum als jaartallen-keuze in plaats van een vrije datepicker',
      '"Overige ruimte" als snelknop bij ruimtes toevoegen, in plaats van "Verkeersruimte"',
      'Energielabel "geen label bekend" blokkeerde niet langer ten onrechte het doorrekenen',
    ],
  },
];
