WWSO SCENARIO APP — FASE 2, TAAK 12
Toelichtingsdeck bij de suggestie-engine

Model voor deze taak: Opus (niet Sonnet). Dit is een uitleg-/communicatietaak waarbij
het er vooral op aankomt om zelf te bepalen wélke rekenkundige eigenaardigheden een
niet-ingewijde gebruiker in verwarring zullen brengen, en dat helder te kunnen
beargumenteren met een eigen voorbeeld — dat is een ontwerpkeuze, geen
implementatiewerk.

Bron: Suggestie-engine — architectuurontwerp (Fase 2, taak 11), plus de aanscherping
hieronder over BTW.

---

DOEL

Een kort, behapbaar deck (géén tweede architectuurdocument) dat aan een gebruiker
buiten de eigen workspace uitlegt: waarom bepaalde uitkomsten van de suggestie-engine
tegen de intuïtie in kunnen gaan, en waarom dat geen bug is maar een bewuste
rekenkundige keuze. Doel is vertrouwen, niet volledigheid.

---

OPZET (kaarten, geen doorlopende tekst)

Behandel alleen de plekken waar de uitkomst verrassend is. Niet alle 11 secties van het
architectuurdocument herhalen. Per kaart: één heldere uitleg + één concreet
cijfervoorbeeld op de bestaande zes-kamer-testfixture (of de variantfixture uit §8c waar
relevant). Geen formule zonder voorbeeld, geen voorbeeld zonder de "waarom" erbij.

1. Waarom telt een pakket niet op uit losse maatregelen (afronding + plafonds)
   — voorbeeld: twee maatregelen van elk 0,20 ruwe punten die los niets opleveren,
   samen wel over de kwartpuntgrens gaan.

2. Wat is de "restpost" en waarom klopt de optelsom van individuele bijdrages niet
   — leave-one-out uitgelegd met het K-04/K-06-koelkast-en-afzuigkap-voorbeeld.

3. Waarom kan ΔBAR negatief zijn terwijl de terugverdientijd juist goed is
   — verdunningseffect: marginaal rendement vs. staand rendement van het pand.
   Gebruik het 16%-pand / 12%-marginaal-voorbeeld.

4. Waarom wordt er nu geen BTW toegepast (of, na de aanpassing hieronder: hoe de
   conservatieve BTW-aanname werkt) — leg uit dat dit een bewuste, expliciete keuze is,
   geen vergeten detail.

5. Waarom sommige maatregelen als "niet beoordeeld" verschijnen in plaats van een
   schatting te tonen — het onderscheid ontbrekend pandgegeven vs. ambigue
   maatregelinhoud, met één voorbeeld van elk (bijv. E-01 t/m E-08 doellabel vs.
   K-01 aanrechtlengte-interpretatie).

6. Wat een "gat in de catalogus"-melding betekent — het keuken-R5-voorbeeld uit
   §01, laag C.

Lengte-richtlijn: 6 kaarten, elk maximaal een half A4 aan tekst plus het voorbeeld.
Geen kaart toevoegen zonder een gebruiker die er concreet door in verwarring zou
raken — dit is geen kans om alsnog de volledige architectuur te documenteren.

---

BTW-AANSCHERPING (verwerken in kaart 4 én in de engine-aanname zelf)

Vastgesteld tijdens sparsessie: woonruimteverhuur is BTW-vrijgesteld, dus voorbelasting
op investeringskosten is voor een BV die woonruimte verhuurt nooit aftrekbaar — dit
geldt sowieso, los van welk tarief (21% regulier / 9% verlaagd op arbeid bij renovatie)
uiteindelijk van toepassing is.

Gevolg voor het ontwerp: "BTW niet toepassen" is geen neutrale omissie meer maar een
structurele onderschatting van de investering, met een optimistische vertekening
precies op de plek waar de pakketten filteren (TVT-drempels 5/10 jaar).

Aanpassing t.o.v. taak 11:
— Open vraag 3 wordt aangescherpt: de xlsx-kolom "BTW-grondslag / inclusief-exclusief"
  nu al toevoegen, niet uitstellen tot een latere fase. De kolommen "machineleesbare
  vergunningklasse" en "numerieke doorlooptijd" blijven wel op de bevindingenlijst voor
  later.
— Tot die kolom er is: default niet langer "0% BTW", maar een conservatieve 21% op het
  vermoedelijk exclusief-bedrag, met een zichtbare vlag dat het verlaagde tarief op een
  eventueel arbeidsdeel hier nog niet in verwerkt zit. Dit is een aanname aan de
  voorzichtige kant, niet aan de optimistische kant — in lijn met de rest van het
  ontwerp (nooit stilzwijgend een gunstiger scenario aannemen dan bewezen is).

---

LEVERING

Eén artifact (deck of losse kaarten, aan Claude Code om te kiezen wat het beste rendert),
plus een korte changelog-regel in het architectuurdocument bij open vraag 3 en bij §05
(BTW) die verwijst naar deze aanscherping.
