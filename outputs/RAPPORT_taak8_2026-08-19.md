# Rapport: Taak 8 — Golden-master validatie tegen de officiële Huurprijscheck — 2026-08-19

## Wat er gedaan is

De gebruiker leverde 7 PDF's aan in `resources/golden-master/`, geëxporteerd vanaf externe bronnen. `pdftotext` bleek op deze tabel-zware exports onbetrouwbaar (kolommen komen door elkaar, net als eerder bij het beleidsboek) — daarom zijn alle PDF's via de Windows Runtime PDF-API (`Windows.Data.Pdf`, aangestuurd vanuit PowerShell, geen extra installatie nodig) omgezet naar PNG's en pagina voor pagina visueel gelezen. Diezelfde aanpak is gebruikt om een deel van het beleidsboek opnieuw te controleren toen de tekstextractie een tegenstrijdige energielabeltabel leek te tonen (zie hieronder — vals alarm, de afbeelding bevestigde onze bestaande tarieven).

### Wat de 7 documenten bleken te zijn
1. **`Puntentelling 19,5m - Label A.pdf`** — officiële "Resultaat Huurprijscheck" voor Hoefstraat 110, Tilburg, 6 huisgenoten. Alle rubrieken behalve R11 met de hand te verifiëren (zie "Niet in een fixture" hieronder); R11 mist het totale WOZ-gebruiksoppervlak, dus geen bruikbare eindtotaal-validatie.
2. **`Slaapkamer 2 - A++.pdf`, `Slaapkamer 3 - A++.pdf`, `Slaapkamer 6.pdf`** — drie officiële "Resultaat Huurprijscheck"-exports, alle drie voor **hetzelfde pand** Kleiweg 179-B, Rotterdam (WOZ € 490.000, peildatum 1-1-2025, COROP Groot-Rijnmond — exact de € 3.884/m² uit onze eigen tarieventabel). Elk toont één kamer met haar eigen privévertrek, in een huis met twee gedeelde keukens, drie gedeelde badruimten en twee gedeelde toiletruimten. Vastgesteld door de identieke m²'s en voorzieningen van de gedeelde ruimten te vergelijken tussen de drie documenten.
3. **`Slaapkamer 3 + keuken.pdf`** — dezelfde kamer als (2) maar met een toegevoegde eigen keuken: een "wat-als"-scenario (874 i.p.v. 74 punten), passend bij het doel van de app. Niet als aparte fixture gebouwd (zie hieronder), wel gebruikt om een aparte, kleine bevinding te bevestigen (zie D2 hieronder).
4. **`Puntentelling onzelfstandig Kleiweg 179-B (Advies jan-26 / scenario 3, jan-26).pdf`** — twee uitgebreide adviesdocumenten van "Adficom Energielabels" (adviseur Joris Willems), **geen officiële Huurcommissie-bron**. Waardevol voor de fysieke plattegrond (kamerformaten, aantal keukens/badkamers), maar **niet gebruikt als puntenoracle**: de R3- en R5/R6-totalen zijn voor elke kamer identiek, ook waar de eigen kamer overduidelijk verschillend verwarmd is (kamer 5 se eigen slaapkamer is "Nee" verwarmd, maar de tool geeft toch exact hetzelfde "Totaal verwarming" als kamer 1). Deze tool past kennelijk een vereenvoudigde/gemiddelde berekening toe, geen exacte per-kamer WWS-verdeling — bevestigd doordat de eigen totalen wél intern consistent optellen tot het eindtotaal per kamer, alleen niet volgens de per-kamer verdeelregel van §2.1.5.

### Fixtures en tests
Drie golden-master `PandInvoer`-fixtures in `packages/engine/src/fixtures/golden-master/` (Kleiweg 179-B, kamer 2/3/6), elk met een JSDoc-verwijzing naar het brondocument. Testbestand `packages/engine/src/eindtelling/golden-master.test.ts` (23 tests, allemaal groen) toetst R1, R3, R5, R6, R8 en R11 exact tegen de site-cijfers, plus (bewust) de huidige — afwijkende — R4- en eindtotaal-uitkomst (zie hieronder).

## Belangrijkste bevinding: R4 gebruikt de verkeerde grondslag

**R1, R3, R5, R6, R8 en R11 matchen exact voor alle drie de kamers** — sterk bewijs dat de kwartpuntsafronding, de dubbele deling, de WOZ-drempels en de capping-logica in R5/R6 correct zijn. **R4 wijkt structureel af, in alle drie de gevallen, steeds naar boven:**

| Kamer | Site | Engine | Verschil |
|---|---|---|---|
| 2 (16 m², label A++) | 18 | 17,75 | −0,25 |
| 3 (21,6 m², label A++) | 22,75 | 23 | +0,25 |
| 6 (11,3 m², label A+++) | 15,50 | 15,25 | −0,25 |

Voor alle drie geldt: **(ongeafronde privé+gedeeld m²) × labelfactor, ééns kwartpunt-afgerond, geeft exact de site-waarde.** De engine gebruikt in plaats daarvan de al-op-hele-m²-afgeronde R1-grondslag (via `vertrekOppervlakteM2()`, gedeeld tussen R1 en R4):

- Kamer 2: 0,85 × 21,11667 → **18,00** (site) vs. 0,85 × 21 → 17,75 (engine)
- Kamer 3: 0,85 × 26,71667 → **22,75** (site) vs. 0,85 × 27 → 23,00 (engine)
- Kamer 6: 0,95 × 16,41667 → **15,50** (site) vs. 0,95 × 16 → 15,25 (engine)

Dit is precies de onduidelijkheid die al in de eerdere briefing stond genoteerd (B2, "Volgorde van delen en afronden bij R1/R4 is niet expliciet... kandidaat voor de validatie in taak 8"), nu met 3/3 exacte treffers empirisch opgelost: §2.4.4 zegt alleen dat R4 rekent "op basis van het totaal aantal m²... als privé vertrekken en de toe te rekenen gemeenschappelijke vertrekken" — nergens dat dit de al-afgeronde R1-uitkomst moet zijn. De tweestaps-afrondingsregel van §2.1.1.1 staat expliciet onder het kopje "Rekenregels vertrekken" (rubriek 1) en wordt door §2.4.4 niet aangehaald.

**Ik heb de code hier bewust niet op aangepast.** Dit raakt een gedeelde helper (`vertrekOppervlakteM2` in `gedeeld.ts`) die zowel R1 als R4 voedt, en de vraag "is deze interpretatie correct, en is een aparte ongeronde-grondslag-functie de juiste oplossing, of iets anders?" is precies het soort beleidsboek-interpretatie waarvoor `plan/plan.md` Opus voorschrijft zodra taak 8 een afwijking vindt. De golden-master tests zijn zo geschreven dat ze de HUIDIGE (afwijkende) uitkomst vastleggen — ze falen dus niet, maar documenteren de bug in plaats van hem te verbergen. Zodra de knoop is doorgehakt, moeten die assertions naar de site-waarden.

### Praktisch gevolg voor het eindtotaal
Door de 0,25-punt-per-rubriek afwijking in R4, en omdat de eindsaldering op hele punten rondt (§2.1.7), komt het totaal voor kamer 2 en kamer 6 telkens 1 punt te laag uit (66 i.p.v. 67, 55 i.p.v. 56). Voor kamer 3 heft de afwijking (+0,25 i.p.v. −0,25) net niet genoeg op om het totaal te veranderen — niet gecontroleerd in een test, want de eindsaldering op hele punten kan toevalstreffers geven die niets zeggen over de onderliggende rubriek-fout.

## Overige bevindingen (lager vertrouwen, geen actie)

**D2. `Slaapkamer 3 + keuken.pdf` — eenhandsmengkraan in een privé-keuken toont 0,75 i.p.v. 0,25.** Het beleidsboek is hier expliciet: "Eénhandsmengkraan 0,25" (§2.5.3, bevestigd met de PDF-viewer, twee keer in de tekst). Dit is een klein bedrag (0,5 punt op een totaal van 87) in een niet-gevalideerde fixture (`Slaapkamer 3 + keuken.pdf` is geen aparte golden-master fixture geworden, zie hieronder), en had evengoed een leesfout van mij kunnen zijn op een paginabreuk in een tabel met drie opeenvolgende regels van "0,75". Genoteerd, niet actie-waardig.

**D3. Mogelijke tweede afrondingsvraag bij R1 (Hoefstraat), niet bevestigd.** Met de hand nagerekend (geen geautomatiseerde fixture, dus lager vertrouwen): Hoefstraat's kamer toont R1 = 22, terwijl de tweestaps-afrondingsregel van §2.1.1.1 (privé apart afronden, gedeeld apart afronden, dan optellen en nog eens afronden) op de zichtbare cijfers (privé 19,5 m², gedeeld 10 m² / 6 personen + 3 m² / 3 personen) 23 zou geven; in één keer afronden van het totaal (22,17 m²) geeft wél 22. Dit **zou** een tweede engine-bug suggereren, maar staat rechtstreeks haaks op de letterlijke tekst van §2.1.1.1 die de tweestaps-methode expliciet voorschrijft — en de drie Kleiweg-fixtures (wél volledig gevalideerd, wél geautomatiseerd) bevestigen juist onze bestaande tweestaps-implementatie exact in alle drie de gevallen. Zonder een tweede, volledig gevalideerde bron die dit bevestigt, is dit een aandachtspunt voor een volgend golden-master pand, geen bevinding om nu op te handelen.

## Niet in een fixture omgezet

- **Hoefstraat 110** — het totale WOZ-gebruiksoppervlak staat nergens op het document (alleen losse vertrek-m²'s), dus R11 en daarmee het eindtotaal zijn niet na te rekenen. R1, R2, R3, R5, R6 en R8 zijn wel met de hand geverifieerd en kwamen exact overeen met de kwartpuntafgeronde subtotalen op het document (Binnenruimtes 30,75, Buitenruimtes 3) — dat telt mee als bevestiging, maar staat niet als test in de suite omdat de fixture onvolledig zou zijn.
- **`Slaapkamer 3 + keuken.pdf`** (87 punten) — dezelfde kamer als kamer 3, met een toegevoegde eigen keuken. Zou een vierde fixture kunnen zijn, maar voegt geen nieuwe rubriek-dekking toe t.o.v. de al gevalideerde kamer 3, behalve de kleine D2-bevinding hierboven.
- **De twee Adficom-adviesdocumenten** — bewust niet als puntenoracle gebruikt, zie boven. Wel gebruikt om de kamergeometrie van Kleiweg 179-B te reconstrueren (aantal keukens/badruimten en hun m²) en om de WOZ-waarde/COROP-gemiddelde te bevestigen.

## Interpretatiekeuzes bij de fixture-reconstructie

1. **Toiletruimten gemodelleerd als `Verkeersruimte`, niet als `Toiletruimte`.** De site toont geen m² voor de toiletruimten en telt ze niet mee in Vertrekken of Overige ruimten (R1/R2 = 0 voor dat deel). `Verkeersruimte` (niet verwarmd) draagt niets bij aan R1/R2/R3 en dient hier puur als neutrale drager voor de `SanitairVoorziening`-post.
2. **`energielabelIngangsdatum` en `bouwjaar` zijn aangenomen** (niet op de bron): een datum die het label geldig houdt, en een bouwjaar dat toch niet gebruikt wordt zolang het label geldig is. Vastgelegd in de JSDoc van elke fixture, niet stilzwijgend.
3. **Drie aparte fixtures, geen één gedeeld 6-kamer-pand.** De drie brondocumenten tonen verschillende energielabels (A++, A++, A+++) op verschillende datums (6-7, 6-7, 23-6) voor "hetzelfde" pand — vermoedelijk verschillende scenario-doorrekeningen, niet een inconsistente snapshot. Omdat `Pand.energielabel` een pand-breed veld is, zou één gedeeld pand een van de drie labels moeten kiezen en de andere twee fixtures fout maken. Drie losse `PandInvoer`-instanties (met identieke gedeelde ruimten, elk hergebruikt via import) voorkomen die valse precisie.
4. **Privébalkon bij kamer 2, geen buitenruimte bij kamer 3/6.** Het Adficom-adviesdocument suggereerde twee gedéélde balkons; de officiële site toont voor kamer 2 een ongedeeld privé-balkon (2 + 0,35 × m², exact herleid uit de getoonde 3,75 punt) en voor kamer 3/6 geen buitenruimte-regel. De site is hier leidend.

## Bestanden gewijzigd
- Nieuw: `packages/engine/src/fixtures/golden-master/{kleiweg-179b-kamer2,kleiweg-179b-kamer3,kleiweg-179b-kamer6}.ts`
- Nieuw: `packages/engine/src/eindtelling/golden-master.test.ts`
- Geen wijzigingen aan rekenlogica — dit was bewust, zie de R4-bevinding hierboven.

## Verificatie
- `pnpm test` → 143/143 groen (23 nieuw)
- `npx tsc --noEmit` in `packages/engine` → geen fouten
- `npx eslint packages/engine` → schoon

## Volgende stap
**Vóór taak 9**: de R4-bevinding vraagt om een Opus-beoordeling (per `plan/plan.md`, "⬆ Opus zodra er een afwijking is"). Concreet te beslissen: moet `berekenR4` een eigen, ongeronde grondslag berekenen (privé + gedeeld, zonder de tussenstap van §2.1.1.1's m²-afronding), en zo ja, raakt dat ook R2 (dat dezelfde `oppervlakteVolgensRekenregel`-machinerie gebruikt, maar met een eigen 0,75-punt-per-m²-factor en dus mogelijk dezelfde vraag)? Na die beslissing: `golden-master.test.ts` bijwerken naar de site-waarden (18 / 22,75 / 15,50 en totalen 67/74/56) zodat de tests weer de bedoelde (juiste) uitkomst afdwingen in plaats van de huidige.

Daarna: taak 9 (scenariomodel) zoals gepland.
