# Claude Code Prompt — WWSO Scenario App
## Project: puntentelling + rendement met as-is / to-be scenariosimulatie

---

## Rol
Je bent de technische uitvoerder van het WWSO Scenario App project. Je leest altijd eerst de relevante bestanden voordat je iets doet. Je werkt taak voor taak en wacht na elke taak op goedkeuring voordat je verdergaat — tenzij de gebruiker zegt door te gaan.

---

## Wat we bouwen

Een applicatie waarmee een verhuurder de WWSO-puntentelling (onzelfstandige woonruimte) van een pand doorrekent, het resultaat opslaat, en vervolgens optimalisatiescenario's krijgt aangeboden.

De kern is de vergelijking:

```
AS IS      → 6 kamers, label D, gedeelde keuken     → €2.000 per maand
PAKKET A   → + kitchenettes, + wastafels             → €2.500 per maand, €18k investering
PAKKET B   → A + label A + extra douche              → €3.250 per maand, €52k investering
```

**Waarom dit bestaat:** de huurprijscheck-site van de Huurcommissie kan niet opslaan en kan geen scenario's vergelijken. Alles wat wij toevoegen zit in die twee gaten: opslaan, herhalen, vergelijken, en uitleggen waar de punten vandaan komen.

---

## Vastgelegde beslissingen — niet heropenen zonder overleg

| Onderwerp | Beslissing |
|---|---|
| Scope puntenstelsel | Alleen onzelfstandig (WWSO). Zelfstandig (WWS) valt buiten scope. |
| Gebruikers | Wijzelf + één gebruiker buiten onze workspace. Prototype, maar met het oog op vermarkten. |
| Stack | TypeScript end-to-end. Next.js (App Router), Postgres via Supabase, deploy op Vercel. |
| Rekenmotor | Eigen implementatie in TypeScript als los pakket `@wwso/engine`. Draait in de browser. |
| Bron van waarheid | `resources/wwso.xlsx` is de **specificatie**, niet de motor. |
| Ranking scenario's | Primair terugverdientijd (investering ÷ extra jaarhuur), daarnaast ΔBAR. |
| Rendementscalculator | Voorlopig gescheiden. Alleen de huurprijs exporteren, geen automatische koppeling. Staat in fase 4. |
| Shortlist Sheet | Blijft privé. Geen import in de MVP. Later achter een adapter, niet in de verkoopbare versie. |
| Gemeentelijke regels | Fase 4, niet in de MVP. |
| Zittende huurder vs mutatie | Fase 4, niet in de MVP. |

---

## Architectuur

```
apps/web          Next.js — UI, auth, opslag
packages/engine   @wwso/engine — pure rekenfuncties, geen I/O, geen framework
packages/data     tarieventabellen en kostencatalogus als versiedatasets (JSON)
```

De engine is een pure functie zonder netwerk, database of datum-afhankelijkheid:

```ts
berekenPunten(pand: Pand, tarieven: Tarievenset): Uitkomst
// Uitkomst bevat per kamer: punten, maximale huurprijs,
// én de volledige opbouw per rubriek R1 t/m R13.
```

Die opbouw per rubriek is **niet optioneel**. De suggestie-engine heeft hem nodig om te zien waar de marge zit, en de gebruiker heeft hem nodig om te begrijpen waarom een kamer op 112 punten uitkomt.

---

## Harde regels

1. **Geen hardcoded tarieven.** Huurtabel, energielabelfactoren, bouwjaargrenzen en COROP-waarden staan in `packages/data`, per peildatum. Op 1 januari verandert er een dataset, geen code.
2. **De engine blijft puur.** Geen `fetch`, geen `Date.now()`, geen database. Alles komt binnen als argument. Dat maakt hem testbaar en herbruikbaar.
3. **`org_id` vanaf regel één.** Elke tabel in de database krijgt een `org_id`, ook nu het één organisatie is. Multi-tenancy later inbouwen is een herbouw.
4. **Nooit stilzwijgend gokken.** Wat het beleidsboek handmatig laat (R7 gemeenschappelijke vertrekken, zorgwoning +35%) wordt een expliciet invoerveld met een zichtbare melding, geen aanname.
5. **Geen persoonsgegevens.** In de MVP slaan we alleen objectgegevens op. Geen huurdernamen, geen contracten.
6. **Elke opgeslagen berekening krijgt een stempel:** peildatum tarieven + versie van de engine + versie van de kostencatalogus. Zonder dat is een uitkomst van drie maanden geleden niet te reproduceren.
7. **Kwartpuntsafronding en deling per kamer zijn de valkuilen.** Gedeelde ruimten worden gedeeld door het aantal kamers met toegang; rubrieken ronden af op kwartpunten vóór de eindsom. Test dit expliciet.

---

## Werkwijze

### Voor elke taak
1. Lees de relevante bestanden
2. Geef een kort plan van aanpak (max 5 regels)
3. Wacht op goedkeuring
4. Voer uit
5. Rapporteer in terminal EN schrijf rapport naar `outputs/`
6. Wacht op volgende instructie

### Na elke taak schrijf je een rapport
```
outputs/RAPPORT_taak[nummer]_[datum].md
```

Formaat:
```
# Rapport: [Taaknaam] — [datum]

## Wat er gedaan is
## Bestanden gewijzigd
## Problemen / aandachtspunten
## Verificatie (hoe te testen)
## Volgende stap
```

### Update na elke taak
- `plan/plan.md` — vink de taak af
- `plan/STATUS.md` — alleen bij afronding van een fase of een belangrijke beslissing

### Definition of done per taak
Een taak is pas af als: de tests groen zijn, de verificatiestap uit deze prompt is uitgevoerd, het rapport geschreven is, en de wijziging gecommit is.

---

## Mappenstructuur

```
WWSO Scenario App/
├── apps/web/              Next.js applicatie
├── packages/engine/       rekenmotor
├── packages/data/         tarieventabellen + kostencatalogus (JSON, per versie)
├── resources/             wwso.xlsx, Rendementscalculator, kostenkentallen.xlsx
├── prompts/               deze prompt
├── plan/
│   ├── STATUS.md
│   └── plan.md
├── briefings/
└── outputs/               rapporten per taak
```

---

# Taken

## Fase 0 — Fundament

### Taak 1: Repo opzetten
Monorepo met pnpm workspaces: `apps/web` (Next.js, App Router, TypeScript strict), `packages/engine`, `packages/data`. Vitest voor tests, ESLint + Prettier. Supabase-project aanmaken en de connectie vanuit `apps/web` verifiëren.

**Verificatie:** `pnpm test` draait (nul tests is prima), `pnpm dev` toont een pagina, Supabase-connectie bevestigd met één testquery.

---

## Fase 1 — Rekenmotor

### Taak 2: Datamodel
Lees `resources/wwso.xlsx`, tab `Invoer`. Modelleer in TypeScript + Zod:
- **Pand**: adres, stad, WOZ-waarde, WOZ-peildatum, WOZ-oppervlak, COROP-gebied, energielabel + ingangsdatum, bouwjaar, soort woning, aantal kamers (1-12), aantal woningen in complex, monumentstatus
- **Ruimte**: naam, type, oppervlakte, verdieping, verwarmd, verkoeld
- **Toewijzing**: welke kamers hebben toegang tot welke ruimte (de K1-K12-matrix uit de xlsx)
- **Handmatige posten**: R7 gemeenschappelijke vertrekken, zorgwoning-opslag

De ruimtetypen moeten exact overeenkomen met wat de rubrieken in de xlsx gebruiken: Privévertrek, Keuken, Badruimte, Berging, Bijkeuken, Wasruimte, Overige ruimte, Toiletruimte, Verkeersruimte, Buitenruimte privé, Buitenruimte gemeenschappelijk, Gemeenschappelijk vertrek, Gemeenschappelijke overige ruimte.

**Verificatie:** een testpand uit de xlsx laat zich volledig in het model uitdrukken zonder informatieverlies.

### Taak 3: Tarieventabellen als dataset
Lees `resources/wwso.xlsx`, tab `Tabellen`. Zet om naar JSON in `packages/data`, met peildatum in de bestandsnaam en een index die op datum de juiste set teruggeeft:
- huurprijstabel onzelfstandig (punten → maximale huurprijs)
- energielabelfactoren
- bouwjaargrenzen (fallback als er geen label is)
- COROP-gebieden met gemiddelde WOZ per m²

**Verificatie:** een aantal steekproeven uit de xlsx komt exact overeen met de JSON. Een opgevraagde peildatum vóór de eerste dataset geeft een duidelijke fout, geen stille fallback.

### Taak 4: Rubrieken R1 t/m R4
Implementeer oppervlakte vertrekken, oppervlakte overige ruimten, verwarming/verkoeling en energieprestatie. Elke rubriek is een aparte functie die punten per kamer teruggeeft plus een toelichtingsregel.

**Let op:** R2 en R3 ronden per kamer af op kwartpunten (`FLOOR(x + 0.125, 0.25)`), R1 rondt op hele punten. R3 kent maxima: 1 punt per overige verwarmde ruimte tot maximaal 4, en 1 punt per verkoelde ruimte tot maximaal 2.

**Verificatie:** unit tests per rubriek, inclusief een test met een gedeelde keuken over 4 kamers en een test met precies 5 verwarmde overige ruimten (moet op 4 punten blijven staan).

### Taak 5: Rubrieken R5 en R6 — keuken en sanitair
De lastigste twee. Lees tab `Voorzieningen` van de xlsx. Basispunten volgen uit de aanrechtlengte respectievelijk het aantal toiletten/wastafels/douches; extra voorzieningen tellen mee maar zijn **gecapt op de basispunten**. Alles wordt gedeeld door het aantal kamers met toegang.

**Verificatie:** een pand met een luxe gedeelde keuken over 6 kamers versus dezelfde keuken privé bij 1 kamer — het verschil per kamer moet exact factor 6 zijn op de ongecapte delen.

### Taak 6: Rubrieken R7 t/m R13
Gemeenschappelijke vertrekken (handmatig invoerveld), buitenruimten (2 + 0,35 per m² privé, max 15 per kamer; gemeenschappelijk 0,75 per m² gedeeld door kamers én adressen), gemeenschappelijke ruimten, parkeren, WOZ-punten (>110% van COROP → 14, <90% → 10, anders 12), bijzondere voorzieningen, aftrekpunten (−4 per criterium per kamer).

**Verificatie:** unit tests per rubriek; de WOZ-rubriek getest op alle drie de uitkomsten.

### Taak 7: Eindtelling en huurprijs
Som van de rubrieken, afronding op hele punten per kamer, opzoeken van de maximale huurprijs, monumentopslag (Rijks 35%, gemeentelijk/provinciaal 15%, beschermd dorpsgezicht 5%). Uitkomst bevat per kamer de volledige opbouw.

**Verificatie:** pandtotaal telt op tot de som van de kamers.

### Taak 8: Golden-master validatie
Twee lagen:
1. Exporteer uit `resources/wwso.xlsx` de uitkomsten van 5 testpanden en leg ze vast als fixtures. De engine moet exact dezelfde punten per kamer produceren.
2. De gebruiker levert 3 tot 5 panden waarvan de uitkomst van de officiële huurprijscheck-site bekend is. Vergelijk en documenteer elk verschil.

**Bij een verschil: niet stilzwijgend de engine aanpassen tot het klopt.** Rapporteer eerst wat er afwijkt en waarom, en vraag of de xlsx of de engine gecorrigeerd moet worden. Een verschil kan een fout in de xlsx zijn — daar staan zeven bekende open punten in, tab `Toelichting`.

**Verificatie:** een testrapport met per pand het verschil, of een bevestiging dat er geen verschil is.

---

## Fase 2 — Scenario's en suggesties

### Taak 9: Scenariomodel
Een scenario is **geen kopie van het pand** maar een lijst mutaties bovenop de as-is situatie (label van D naar A, kitchenette toevoegen aan kamers 1-4, wand plaatsen op de eerste verdieping). Zo blijft zichtbaar wat er verandert, en werkt een wijziging in de as-is situatie automatisch door in alle scenario's.

**Verificatie:** as-is aanpassen laat de deltas intact en herrekent alle scenario's.

### Taak 10: Kostencatalogus inlezen
Lees `resources/Kostenkentallen_WWSO_optimalisatie.xlsx`, tab `Maatregelen`, en zet om naar JSON in `packages/data`. Neem de statuskolom mee: bij status `schatting` toont de app een bandbreedte (min–max), bij `bevestigd` een bedrag. Het inlezen moet herhaalbaar zijn — de gebruikers werken dit bestand doorlopend bij.

**Verificatie:** een aangepast bedrag in de xlsx komt na opnieuw inlezen terug in de app.

### Taak 11: Suggestie-engine
Regelgebaseerd, niet generatief. Werkwijze: bepaal per rubriek de marginale ruimte (waar laat dit pand punten liggen), match daar maatregelen uit de catalogus op, reken per maatregel de werkelijke puntenwinst door **door het scenario echt te laten berekenen** (niet met de vuistregel uit de catalogus), en bepaal de extra jaarhuur.

Stel drie pakketten samen:
- **Basis** — alleen maatregelen met een terugverdientijd onder de 5 jaar, geen vergunning nodig
- **Comfort** — Basis plus maatregelen tot 10 jaar terugverdientijd
- **Maximaal** — alles wat puntenwinst oplevert, ongeacht terugverdientijd

Toon per pakket: nieuwe huur, investering, extra jaarhuur, terugverdientijd, ΔBAR, en welke maatregelen een vergunning of melding vereisen.

**Let op de knik bij 60 punten.** De huurprijstabel loopt per heel punt en kent geen plateaus, maar wel een breekpunt: tot en met 60 punten is een punt ongeveer €10,20 waard, daarboven ongeveer €5,27 (peildatum 1 januari 2026, wordt jaarlijks geïndexeerd). Een kamer van 55 punten naar 60 tillen levert dus twee keer zoveel op als dezelfde investering in een kamer die al op 95 staat. De engine moet maatregelen daarom **per kamer** waarderen, nooit op pandgemiddelde — anders adviseert hij structureel het verkeerde.

De enige echte drempel is de afronding: rubrieken ronden op kwartpunten, de eindsom op hele punten. Een maatregel van 0,25 punt levert daardoor soms niets op en soms een vol punt, afhankelijk van waar de kamer staat.

**Verificatie:** op een testpand levert Basis een kortere terugverdientijd dan Comfort, en Comfort een kortere dan Maximaal. Elke voorgestelde maatregel is herleidbaar naar een regel in de catalogus.

---

## Fase 3 — Applicatie

### Taak 12: Invoerscherm
Pandgegevens plus de ruimtetabel met de kamertoewijzingsmatrix. Dit is het grootste UX-risico: een matrix van 40 ruimten × 12 kamers is in een spreadsheet al onhandig en in een webformulier sneller nog erger. Kom met een voorstel voordat je bouwt — bijvoorbeeld per ruimte aanvinken welke kamers toegang hebben, in plaats van een volledig raster.

**Verificatie:** een testpand van 6 kamers is binnen 10 minuten in te voeren.

### Taak 13: Resultaatscherm
Per kamer punten en maximale huurprijs, uitklapbaar naar de opbouw per rubriek met de toelichtingsregel. Plus de controles uit tab `Controles` van de xlsx: totaal m² versus WOZ-oppervlak (waarschuwing bij meer dan 20% afwijking), ruimten zonder type, ruimten die aan geen enkele kamer zijn toegewezen, kamers zonder privévertrek.

**Verificatie:** de vier controles vuren op een testpand waarin ze bewust geschonden zijn.

### Taak 14: Scenariovergelijking
As-is naast maximaal drie scenario's. Maatregelen aan- en uitzetten met directe hertelling in de browser — geen laadindicator, geen API-call per klik. Toon per scenario de kolom uit taak 11.

**Verificatie:** een maatregel aanvinken en de nieuwe huurprijs zien binnen 100 ms.

### Taak 15: Opslaan en laden
Deals opslaan in Supabase met `org_id`, inclusief de volledige invoer-snapshot en de versiestempel uit harde regel 6. Overzichtspagina met alle deals.

**Verificatie:** een deal van gisteren opent met exact dezelfde uitkomst, ook nadat er een nieuwe tarievenset is toegevoegd.

### Taak 16: PDF-export
Puntenopbouw per kamer per rubriek, met pandgegevens, peildatum en versiestempel. Dit is het document dat naar een huurder, gemeente of geschillencommissie gaat.

**Verificatie:** de PDF bevat alle 13 rubrieken en de totalen komen overeen met het scherm.

### Taak 17: Auth en toegang
Supabase Auth met magic link. De externe gebruiker kan worden uitgenodigd zonder toegang tot onze workspace. Row Level Security op `org_id`.

**Verificatie:** gebruiker A ziet de deals van gebruiker B niet, ook niet via een directe API-aanroep.

---

## Fase 4 — Na de MVP (nog niet uitvoeren)

- Waarschuwingslaag gemeentelijke regels: vergunningplicht, minimum m² per kamer, quota. Start met Rotterdam.
- Schakelaar zittende huurder versus mutatie — bij een lopend contract kan de huur niet zomaar naar het maximum.
- Koppeling met de rendementscalculator: scenario vult de TO BE-tab (verbouwingskosten, nieuwe huur).
- Importadapter voor de privé Shortlist Sheet — alleen in de eigen versie, niet in de verkoopbare.
- Vergelijking met zelfstandige verhuur (WWS).
- De zeven open punten uit tab `Toelichting` van wwso.xlsx.

---

## Aandachtspunten

- Commit na elke afgeronde taak
- Bij twijfel over een rubriek: eerst vragen, niet gokken. Het beleidsboek WWSO is leidend, de xlsx is de interpretatie ervan, en die interpretatie kan fout zijn
- Schrijf tests tijdens de taak, niet erna
- Raak `resources/` nooit aan — dat zijn de bronbestanden van de gebruiker
