# Briefing: Visie, doelgroep en tussenfase — Sessie 2026-09-01 (deel 2)

## Wat er gedaan is
Losse sparsessie over de productvisie, los van de technische sessie eerder op 2026-09-01 (zie `BRIEFING_sessie_20260901.md` voor de bugfixes/deploy-opruiming van die sessie). Aanleiding: het gevoel dat de visie "zoek" was na weken van bugfix- en UX-werk zonder zichtbare voortgang op de fase-4-lijst.

Sessie in twee delen: eerst de visie/tussenfase scherpgesteld (zonder Stevens input), daarna heeft de gebruiker de vier openstaande vragen aan Steven Kramer voorgelegd en zijn antwoorden binnen dezelfde sessie verwerkt. Geen code gewijzigd. `STATUS.md` en `plan.md` zijn bijgewerkt met alle uitkomsten hieronder.

## Beslissingen — deel 1 (visie/tussenfase)

**1. Nieuwe tussenfase ingevoegd tussen Fase 3 en Fase 4.**
Fase 3 is technisch af, maar er was geen scherp criterium wanneer je naar Fase 4 (taak 18 e.v.) mag. Vastgesteld: Steven Kramer (energielabelverduurzamen.nl) test al zelfstandig, inclusief het volledige scenario-pad met eigen investeringsbedragen — dat deel is dus al bewezen. Wat ontbrak was een meetbaar exit-criterium.

Feedback van Steven valt in drie categorieën met elk een eigen tempo:
- **Blokkerend** (hij komt niet verder) → meteen oppakken.
- **Cosmetisch/verwarrend** (hij komt er zelf uit, het wringt) → geen exit-blokkade, mag opstapelen en periodiek gebundeld worden opgepakt.
- **Nice-to-have/uitbreiding** (hij stelt zelf iets voor) → gewoon scopen als feature, geen tussenfase-werk.

**Concreet exit-criterium**: twee opeenvolgende zelfstandige sessies van Steven zonder een nieuwe *blokkerende* melding. Taak 18 en de rest van Fase 4 wachten op deze exit.

**2. Doelgroep-beeld scherper: twee profielen, geen keuze nodig.**
- Profiel 1: zelf-verhuurder/investeerder (ikzelf, Emma Morrison).
- Profiel 2: professional die optimalisatie als dienst levert (Steven Kramer) — brengt eigen prijskennis mee, geen zelfstandige eindgebruiker in de klassieke zin.

Steven test niet multi-klant — één gebruiker, één pad. Multi-tenant/gescheiden org_id's blijft daarom aan een trigger hangen: zodra Steven (of een andere professional) een tweede eigen klant wil toevoegen. **Bevestigd als erkende komende taak**, geen losse gok meer, maar nog geen concrete planning — trigger blijft het criterium.

**3. Twee vermarkt-modellen, bewust nog niet gekozen.**
- **Model A**: software verkopen aan zelfstandige eindgebruikers — vraagt multi-tenant, zelfservice, kloppende kostencatalogus.
- **Model B**: de app als instrument ín een dienst, zoals Steven het nu gebruikt — mogelijk licentie/samenwerking i.p.v. productverkoop.

Geen keuze afgedwongen; het fundament dient beide. Trigger: zodra Steven een tweede eigen klant wil.

**Werkprincipe expliciet gemaakt** (bevestigd door de praktijk in deel 2): bij twijfel tussen A en B, bouw je voor wie er nu daadwerkelijk is — zichtbaar in de beslissing om de automatische pakketten te verwijderen (zie deel 2) in plaats van ze te laten staan voor een hypothetische model-A-toekomst.

## Beslissingen — deel 2 (Stevens antwoorden, vier vragen beantwoord)

Steven heeft de vier vragen uit deel 1 beantwoord. Dat leidde tot drie nieuwe, concrete taken:

**1. Energielabel-kostenvelden + scenariovergelijking (nieuwe taak).**
Op het pandgegevens-scherm drie nieuwe velden: Inschatting kosten label A+, A++, A+++. Leeg = niet haalbaar of niet relevant. Op het scenarioscherm: AS-IS + 3 scenario's met een wisselknop tussen A+/A++/A+++. Dit is de concrete invulling van het eerdere (2026-08-28) "huurvergelijking per energielabel-scenario"-feedbackpunt — nu losgekoppeld van het kitchenette-voorstel, waar het eerder abusievelijk mee gebundeld was.

**2. Kitchenette-varianten bevestigd (bestaand voorstel, nu gescoopt).**
Steven gebruikt de generieke maatregelen-catalogus wél — niet voor labelverbetering, maar voor "kamers realiseren". Twee concrete varianten: 122 cm (8 punten) en 240 cm (14 punten). Dit is het al bestaande, eerder uitgestelde maatregelen-library-voorstel (`alternatiefGroep` in het datamodel, `MaatregelTabel.tsx` als keuzegroep i.p.v. checkboxen) — de naamdiscussie die het blokkeerde is nu opgelost, variantkeuze is bevestigd.

**3. Automatische pakketten (Basis/Comfort/Maximaal) worden verwijderd.**
Niet relevant voor Steven, en hij is de enige externe gebruiker die ze zou gebruiken. **Besluit: daadwerkelijk verwijderen** (code weg), niet alleen laten staan voor een toekomstige model-A-gebruiker — expliciete toepassing van het werkprincipe "bouw voor wie er nu is". Dit raakt taak 11 (oorspronkelijk Opus-ontwerp); de verwijdering zelf is afbraakwerk, geen `⬆ Opus` nodig. Let op bij uitvoering: checken dat het handmatige scenario-pad (`bouwHandmatigScenario`/`bouwHandmatigScenarioMetMaatregelen`, dat Steven wél gebruikt) hier niet van afhangt voordat er iets weggehaald wordt.

**4. Taxatiefactor**: voor nu niet relevant volgens Steven. Blijft onbeantwoord op de plank, geen actie.

**Nieuw idee van de gebruiker**: vrije notities bij een deal/pand, zichtbaar in het deals-overzicht. Nog niet uitgewerkt — scope (los tekstveld? per deal of scenario? waar zichtbaar?) moet nog bepaald worden vóór het gebouwd wordt.

## Beslissingen — deel 3 (per-maatregel prijsveld, na de briefing-update)

Tijdens het bijwerken van deze briefing kwam een vierde idee van de gebruiker op, direct relevant voor de kitchenette-taak hierboven, dus meteen meegenomen.

**Probleem**: bij het vergelijken van twee scenario's met deels overlappende maatregelen (bijv. scenario 1 met kitchenette 122cm, scenario 2 met kitchenette 240cm + extra kamer) toont de app nu alleen een totaalbedrag per scenario (`handmatigeInvesteringEuro`, één vrij in te vullen getal). Je ziet dus wél dát de investering verschilt, niet *welke* maatregel dat verschil veroorzaakt.

**Oplossing, bevestigd door de gebruiker**: een nieuw, los prijsveld per aangevinkte maatregel in `HandmatigMaatregelen.tsx`, naast (niet in plaats van) het bestaande totaalbedrag-veld:
- `handmatigeInvesteringEuro` blijft ongewijzigd: voor kosten die niet aan een specifieke maatregel hangen (bijv. de kamer-realisatie zelf).
- Nieuw: een overschrijfbaar prijsveld per maatregel, **voorgevuld met de catalogusprijs** als startpunt.
- Investering = handmatig bedrag + som van de per-maatregel prijzen.

Voor de kitchenette-varianten (taak hierboven) geldt hetzelfde patroon: vaste catalogusprijs als default, die op scenario-niveau overschreven kan worden. De gebruiker heeft de kitchenette-prijzen al in een eigen sheet staan en gaat die delen — nog te verwerken in de catalogus zodra ontvangen.

**Raakt**: `bouwHandmatigScenarioMetMaatregelen`/`pakketten.ts` (optelling van handmatig bedrag + per-maatregel prijzen) en `HandmatigMaatregelen.tsx` (UI, nieuw prijsveld per rij).

## Technische wijzigingen
Geen. Dit was een visie-/planningssessie. `STATUS.md` en `plan.md` zijn volledig bijgewerkt — zie die bestanden voor de exacte tekst. Belangrijkste secties: "Vastgelegde beslissingen", "Openstaande beslissingen" (grotendeels nu beantwoord/afgesloten), nieuwe sectie "Tussenfase — bruikbaarheidsvalidatie" in beide bestanden met de vier nieuwe taken, en de maatregelen-library-backlog-entry in `plan.md` bijgewerkt (niet meer "uitgesteld", nu gescoopt).

## Openstaande punten
- Auth-toggle staat nog open op productie — moet dicht vóór een volgende testsessie met Emma of Steven (ongewijzigd).
- Notities bij deals — scope nog te bepalen.
- Taxatiefactor — op de plank, geen actie.
- Multi-tenant — trigger blijft staan (Steven vraagt 2e klant), verder geen actie nu.
- Twee vermarkt-modellen A/B — bewust nog open, trigger ongewijzigd.

## Volgende stap
1. Auth-toggle terugzetten zodra er geen actief testen gepland is (voorrang boven onderstaande).
2. Vier nieuwe tussenfase-taken oppakken (geen vaste volgorde afgesproken, alle relevant voor Stevens testervaring):
   - Automatische pakketten verwijderen (met de afhankelijkheids-check op het handmatige pad).
   - Kitchenette-varianten bouwen (122 cm/8pt, 240 cm/14pt) — prijzen komen uit een sheet van de gebruiker, nog te delen.
   - Energielabel-kostenvelden + AS-IS/A+/A++/A+++-scenariovergelijking.
   - Per-maatregel prijsveld in `HandmatigMaatregelen.tsx`, naast het bestaande totaalbedrag-veld.
3. Ondertussen: blokkerende meldingen van Steven direct oppakken, cosmetische meldingen laten opstapelen voor een gebundelde ronde.
4. Fase 4 (taak 18 e.v.) blijft on hold tot het exit-criterium van de tussenfase gehaald is: twee opeenvolgende zelfstandige sessies van Steven zonder blokkerende melding.

> Sla dit bestand op als `briefings/BRIEFING_sessie_20260901_deel2.md` in je WWSO Scenario App map.

