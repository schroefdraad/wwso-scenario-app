# Briefing — vervolg brug Shortlist → Puntum: FML-vectordata i.p.v. plattegrond-foto

**Datum:** 2026-10-01
**Herkomst:** sessie in `C:\Users\Myle\Documents\Realestate Workflow` (de funda-scraper), vervolg
op `BRIEFING_brug_shortlist_puntum_2026-09-27.md`.
**Status:** **nog steeds geen planonderdeel**, zelfde besluit als eerder. Wel is er nu een echte
endpoint gebouwd aan de scraperkant (`/plattegrond-fml` in `scripts/main.py`) — code bestaat, is
niet gedeployed/in gebruik, en levert bewust alleen ruwe data (geen `PandInvoer`-mapping).

Bijbehorende documenten aan de scraperkant:
- `outputs/RAPPORT_brug_fase_a_verificatie_20261001.md` — volledige verificatie, inclusief alle
  tussentijdse (deels onjuist gebleken, zie hieronder) hypotheses.
- `scripts/main.py` — nieuwe functie `fetch_plattegrond_fml()` + endpoint `/plattegrond-fml`.
- `scripts/debug_fml_extract.py` — het testscript waarin dit is uitontwikkeld.

---

## Kern van de vondst: Taak 18 (plattegrond-interpretatie) kan zonder AI-plaatjes lezen

De vorige briefing (2026-09-27) ging ervan uit dat Fase C AI-beeldherkenning nodig had (een
plattegrond-foto met ingedrukte maten laten aflezen, zoals `PROMPT_plattegrond_kamerafmetingen.md`
doet). Dat **kan nog steeds** (de foto staat gewoon tussen de gewone Funda-foto's, bevestigd), maar
er is een directere route gevonden:

Funda's plattegrond-tab (`/media/plattegronden`) embedt een **Floorplanner.com-viewer** (iframe
naar `fmlpub.s3-eu-west-1.amazonaws.com/embed.html?designId=...&projectId=...`). Die embed bouwt
client-side het volledige datamodel op:

- `window.editor.floorplan.state.areas` — per ruimte een **polygoon** (exacte m² te berekenen),
  een vrije-tekst `name`, én een `role`-veld (Floorplanner's eigen kamertype-enum, bv. `role: 3`
  = Slaapkamer, `7` = Hal, `10` = Kast, `99` = Shaft/technische ruimte).
- `window.api.project.floors` — een array van **verdiepingen**, elk met een eigen `designId`. Dit
  lost direct het probleem op dat meerdere verdiepingen aparte plattegronden hebben: je hoeft niet
  te gokken via bestandsnaam of foto-volgorde, de structuur geeft het al.

**Dit is dus in potentie een directe vervanging voor de AI-leesstap in Taak 18/`ruimtes[]`:**
geen beeldinterpretatie nodig, geen overtype-stap voor de m² zelf — alleen nog een mapping van
`role`-codes naar `PandInvoer`'s ruimtetypes (dat hoort hier, in Puntum, net als de rest van de
mapping — zie "Adapter hoort hier" in de vorige briefing, die conclusie blijft staan).

### Hoe het technisch werkt (voor de implementatie hier)

1. ZenRows `js_render=false` op `{detail_url}media/plattegronden` → `designId`/`projectId` uit de
   iframe-src parsen (goedkoop, zelfde laag als de bestaande kenmerken-call).
2. ZenRows `js_render=true` + custom JS (`js_instructions`, een pollende `evaluate` die wacht tot
   de Floorplanner-app geladen is, max 18s) rechtstreeks op de Floorplanner-embed-URL — los van
   Funda, geen cross-origin-iframe-probleem. Dit moet **per verdieping** (per `designId`) herhaald
   worden.
3. Overbodige floors uitsluiten (zie "Overlap-detectie" hieronder — dit is bijgewerkt t.o.v. de
   eerste versie van deze briefing, die nog van exacte-match-duplicaatdetectie uitging).

**Tijd:** gemeten, geen schatting — ~30-35 sec voor een pand met 1 verdieping, ~85 sec voor 3
verdiepingen. Dit is dus een bewuste, incidentele actie per shortlist-kandidaat, geen bulk-operatie.

---

## Sanity-check tegen Funda's eigen "Wonen"-kenmerk — steekproef n=7

Net als de vorige briefing al adviseerde (vergelijk de som tegen Funda's totaal-m²): de opgehaalde
ruimte-som is vergeleken met Funda's `woonoppervlakte_m2`/"Wonen"-kenmerk (die de scraper al heeft).
De eerste 2 panden (beide appartementen) gaven een verdacht schone **-3,2%** op beide — dat bleek
**geen bewezen constante**, zie hieronder. Volledige steekproef (5 appartementen/huizen gelukt, 1
mislukt):

| Pand | Type | Verschil (ná de overlap-fix, zie onder) | Status |
|---|---|---|---|
| Oppert 116 | appartement, 1 floor | -3,2% | binnen marge |
| Doedesstraat 77-A | appartement, 3 floors | -3,2% | binnen marge |
| Rakstraat 13-A | appartement, 3 floors | +13,2% | VLAG |
| Randweg 77 | huis, 7 floors | +52,9% → **+17,7% ná fix** | VLAG (kleiner gat) |
| Noordschans 4 | huis | — | **mislukt**, stap 2 gaf een kale fout, nog niet gediagnosticeerd |
| Kromhoutstraat 14 | huis, 5 floors | +77,9% → **+29,3% ná fix** | VLAG (kleiner gat) |
| Hertshoornvaren 8 | huis, 5 floors | +62,9% | VLAG (fix nog niet opnieuw getest op dit pand) |

**Belangrijk patroon: elk huis in de steekproef werd geflagged, elke appartement niet.** Oorzaak
was in alle 3 huizen-gevallen hetzelfde (zie volgende sectie) — en na de fix blijven Randweg en
Kromhoutstraat nog steeds boven de 8%-drempel, maar nu vermoedelijk om een andere, inhoudelijke
reden (zie "Open vraag: NEN2580-hoogtegrens" onderaan).

**Belangrijke les, relevant voor de harde ontwerpeis uit de vorige briefing:** er is géén
schaalcorrectie geïmplementeerd om de som naar Funda's getal te forceren. In plaats daarvan is een
**afwijkingsvlag** gebouwd (`FML_DEVIATION_THRESHOLD_PCT = 8` in `scripts/main.py`): boven die
drempel komt `vlag: true` terug, bedoeld voor handmatige review — niet voor een stille correctie.
Reden: een eerdere (foute) hypothese over één specifieke ruimte bleek bij navraag een eigen
telfout (dubbel meegeteld duplicaat-floor), niet een categoriefout in de brondata — scherp
onderscheid houden tussen "meetconventie-ruis" en "we tellen iets verkeerd mee" is dus belangrijk,
en een vaste schaalfactor zou dat onderscheid juist verdoezelen. Blijft relevant voor de vijfde
controle als de adapter hier gebouwd wordt: dezelfde "nooit stilzwijgend forceren"-regel als bij
`m2Geschat`.

---

## Overlap-detectie (vervangt exacte-match-duplicaatcheck)

De eerste versie sloot alleen floors uit met een **exact** identieke (naam, m²)-set. De brede
steekproef liet zien dat dit te zwak is: bij alle 3 huizen bleek een floor (genaamd "Situatie" of
"Begane Grond + Tuin") een **combinatie van 2+ andere, al losstaande floors** te zijn — niet
identiek aan één floor, dus onopgemerkt door de oude check, en dubbel meegeteld (vandaar de
+52,9%/+77,9% uitschieters).

Nieuwe regel in `scripts/main.py` (`_exclude_redundant_floors`): een floor wordt uitgesloten als
≥90% van zijn eigen m² verklaard kan worden door de **ruimtes van andere floors samen**. Twee
gevallen:
- **Combinatie van 2+ andere floors** (bv. "Situatie" = Begane grond + Berging) → altijd
  uitsluiten, ongeacht volgorde.
- **1-op-1 duplicaat** van precies één andere floor (bv. "Situatie" == "Souterrain" exact) → hou
  er één. Hier is wél een naam-regel gebruikt, maar alleen als **tie-breaker** bij zo'n paar: bij
  voorkeur de "situatie"-genaamde laten vallen (consistent de overbodige kant gebleken), anders de
  laatst-genoemde. Dus geen blanket "sluit altijd Situatie uit" — dat zou Randweg's
  "Begane Grond + Tuin"-geval (niet zo genoemd) gemist hebben.

Resultaat na fix: Randweg 52,9%→17,7%, Kromhoutstraat 77,9%→29,3% (getest tegen de al opgehaalde
steekproefdata, geen nieuwe ZenRows-calls). Beide blijven boven de 8%-drempel — zie hieronder.

---

## Open vraag: NEN2580-hoogtegrens (relevant voor jullie rubriek-engine, niet alleen hier)

De resterende afwijkingen bij Randweg (+17,7%) en Kromhoutstraat (+29,3%) zien er niet meer uit als
een telbug, maar als een inhoudelijk NEN2580-punt: Randweg heeft een "Vliering" (zolder, 41 m²) en
Kromhoutstraat heeft ongewoon veel "Kast"-m² (22 m² op één verdieping) — precies het soort ruimte
waar NEN2580 de **vrije-hoogte-regel** (<1,5 m telt niet mee) voor geldt, voor zowel zolders als
kastruimte.

**Nog niet onderzocht:** of de FML-state hoogte-/elevatie-data bevat waarmee dit direct te toetsen
is (de `state`-dump had naast `areas` ook `walls`, `dimensions` en `sketch` — nooit geopend in deze
sessie; de viewer heeft een 3D-toggle, dus er zit ergens hoogte-info in het model).

**Update, zelfde dag: beide uitgezocht — geen van beide bruikbaar.**

- **Hoogtedata:** `state.walls` heeft wel een hoogteveld (`az.h`/`bz.h`, in cm), maar op de
  onderzochte Vliering-floor (Randweg 77) hebben **alle 20 muren dezelfde hoogte (280 cm)** — geen
  schuin-dak-variatie. De state heeft geen aparte "roof"-structuur. Het schuine dak is hier niet
  gemodelleerd; de NEN2580 <1,5m-regel is dus **niet** uit deze data te berekenen. Blijft
  mensenwerk/foto nodig voor zolders.
- **`role`-veld:** onderzocht op 7 extra floors (naam+role). Bleek **niet betrouwbaar**:
  ontbreekt soms volledig (Oppert 116's design), is grof (Hal/Entree/Gang delen `role:7`;
  Overloop **en Vliering** delen `role:11` — onderscheidt dus geen zolder van een gang), en is
  **inconsistent voor hetzelfde roomtype**: "MK" (meterkast) kreeg `role:10` bij het ene pand en
  `role:8` bij het andere — lijkt vrije keuze van de makelaar in de Floorplanner-editor, geen
  vaste taxonomie waar automatisch op te bouwen valt.

**Consequentie voor jullie kant:** geen role-gebaseerde uitsluitingsregel bouwen op basis van deze
data — dat zou valse precisie zijn. De vrije-tekst `name` blijft het enige signaal uit de scraper,
en is zelf ook niet hard genoeg om blind te vertrouwen. Praktisch betekent dit: de `vlag` t.o.v.
Funda's "Wonen" (zie boven) is niet een tussenstap die later verfijnd wordt tot een automatische
classificatie — het is vermoedelijk **het eindmechanisme**: bij afwijking naar een mens escaleren,
niet proberen zelf te classificeren welke ruimte wel/niet meetelt. Of Puntum's eigen rubriek-engine
hier meer uit kan halen dan de scraper (bv. via de `name`-tekst zelf, of gewoon door de mens de
plattegrond-foto te laten checken zoals de bestaande prompt al doet) is aan jullie kant.

**Update, zelfde dag — concreet nagerekend of "Vliering eruit halen" een algemene regel kan zijn.**
Antwoord: nee. Randweg 77 zónder Vliering komt op -1,1% (bijna perfect), maar Kromhoutstraat 14
heeft geen losse zolder-floor — daar zit het teveel verspreid in "Kast"-ruimtes op de 2e
verdieping, en die eraf halen lost het niet schoon op (+8,7% zonder alleen de kasten, -11,3%
zonder de hele verdieping). Bovendien zou een blanket zolder-uitsluiting de "vaste
trap"-nuance uit `PROMPT_plattegrond_kamerafmetingen.md` negeren (zolder mét vaste trap en
voldoende hoogte telt wél mee). Blijft dus per-pand mensenwerk, geen scraper-regel.

**Wel geïmplementeerd:** "Berging" apart houden van de Wonen-som — dit is geen gok maar een
bevestigde categoriescheiding uit jullie eigen eerdere onderzoek (Funda rapporteert "Externe
bergruimte"/"Gebouwgebonden buitenruimte" los van "Wonen", zie de 27-september-blauwdruk). Elke
ruimte in `/plattegrond-fml`'s output heeft nu een `telt_mee_in_wonen`-vlag. Effect: Randweg
257,78→251,91 m² (nog steeds +15,0% VLAG), Kromhoutstraat 137,06→129,50 m² (nog steeds +22,2%
VLAG) — lost geen van beide volledig op, maar is een principieel juiste correctie die de twee
appartementen (die geen Berging-ruimte hebben) niet raakt.

**Dus: huizen blijven in deze steekproef allemaal geflagged, en dat lijkt nu terecht** (geen
telbug meer, een inhoudelijke NEN2580-vraag die mensenwerk blijft) — appartementen zien er
betrouwbaar uit (n=2). Relevant voor hoe ver jullie met de `totaal_m2`/`vlag`-waarden kunnen gaan:
behandel ze als een eerste schifting, niet als een vastgesteld cijfer, zeker bij huizen.

---

## FML vervangt de foto-prompt niet — expliciete ontwerpkeuze

Na afweging vastgelegd: de FML-route (dit document) en de plattegrond-foto
(`PROMPT_plattegrond_kamerafmetingen.md`) zijn **complementair**, niet elkaars vervanging.

- **FML is sterker in:** exacte m² (polygoonberekening, geen afleesfout) en
  verdieping-disambiguatie (gestructureerde `designId`'s — loste op wat bij foto's "te lastig"
  bleek, zie boven).
- **De foto is sterker in:** categorie-/NEN2580-beoordeling. FML heeft **geen hoogtedata** (geen
  schuine daken gemodelleerd in de state) en de enige naamgeving (`name`) is net zo onbetrouwbaar
  als een makelaar-label op een foto — maar zónder dat een mens het beeld ziet. Een
  plattegrond-fóto toont vaak wél een dakschuinte of hoogtelijn die een mens kan beoordelen.

**Voor jullie kant betekent dit:** gebruik FML voor het skelet (ruimtes + exacte m² + juiste
verdieping-indeling), en toon bij een `vlag` de bijbehorende plattegrond-foto aan de reviewer
(die foto is trouwens al gratis op te halen via de gewone fotogalerij, zie eerder in dit
document) — niet FML als complete vervanging van de bestaande prompt/workflow.

## Diagnostiek toegevoegd: waar/waarom een pand afwijkt is nu zichtbaar in de data

Randweg 77 en Kromhoutstraat 14's afwijkingen moesten vandaag met de hand nagerekend worden. De
`/plattegrond-fml`-output heeft nu drie velden om dat voortaan direct zichtbaar te maken:

- `telt_mee_in_wonen` per ruimte (Berging-uitsluiting, zie boven).
- `aandachtspunten` per ruimte — vuistregel-signalen (geen NEN2580-waarheid): zolder/vliering
  (hoogte niet af te leiden uit FML, check de foto), ongewoon grote kastruimte (>5 m²), ongewoon
  grote slaapkamer (>30 m²). Drempels zijn arbitrair, nog niet gevalideerd tegen een grote
  steekproef.
- `aandeel_pct_van_totaal` per floor — welk deel van het totaal die verdieping is, zodat een
  dominante verdieping meteen opvalt.

**Nog niet gedaan:** grotere steekproef om de vuistregel-drempels te valideren/tunen (nu arbitrair
op basis van 7 panden); endpoint deployen naar Cloud Run; Hertshoornvaren 8 / Noordschans 4 nog
niet opnieuw getest met alle fixes.

---

## Wat dit betekent voor Taak 21 / de adapter (als die ooit gebouwd wordt)

Scraperkant levert nu (via `/plattegrond-fml`, nog niet gedeployed) per pand:
```
{
  "status": "ok",
  "floors": [
    {"naam": "Begane grond", "designId": "...", "ruimtes": [
      {"name": "Woonkamer", "role": 3, "m2": 29.51}, ...
    ], "uitgesloten_reden": null}
  ],
  "totaal_m2": 101.62,
  "woonoppervlakte_m2": 105.0,
  "verschil_pct": -3.2,
  "vlag": false
}
```
Geen `PandInvoer`-vormige output — dat blijft hier (Puntum) gebeuren, zoals afgesproken. De
mapping-vraag die hier nog openstaat: hoe Floorplanner's numerieke `role`-codes om te zetten naar
`PandInvoer`'s ruimtetypes (Privévertrek/Badruimte/Toiletruimte/Keuken/etc.) — de enum-waarden zelf
zijn in deze sessie niet uitgeput (alleen 3/7/10/99 zijn tegengekomen, niet de volledige lijst).

---

## Kan de WWSO-kant al beginnen?

Gevraagd in de scraper-sessie, antwoord hier voor de volledigheid: **deels ja.** De `role`→
ruimtetype-mapping (het schema-ontwerp zelf) is onafhankelijk werk — al is de enum nog niet
compleet (zie hieronder). Waar nog niet op te bouwen is: vertrouw `totaal_m2`/`vlag` uit
`/plattegrond-fml` nog niet als eindoordeel. Dat is een botte "tel alles bij elkaar op"-aanname aan
scraperkant; zodra Puntum's eigen NEN2580-regels per `role` worden toegepast (zie hoogtegrens-vraag
hierboven), kunnen de resterende afwijkingen vanzelf kleiner worden — of juist bevestigen dat het
een terechte NEN2580-uitsluiting is. Dat kruisen is nog niet gebeurd.

## Nog niet geverifieerd

- **Of er hoogte-/elevatiedata in de FML-state zit** om de NEN2580 <1,5m-regel direct te toetsen
  (zie "Open vraag" hierboven) — dit zou zowel de Vliering- als de Kast-twijfel kunnen oplossen.
- **Noordschans 4** gaf een kale fout bij stap 2 (geen foutmelding meegekregen) — incident of
  patroon, nog niet uitgezocht.
- **Hertshoornvaren 8** (+62,9%) is nog niet opnieuw getest met de overlap-fix (wel zeer
  waarschijnlijk hetzelfde "Situatie = combinatie"-patroon als Kromhoutstraat, gezien identieke
  floor-namen: Begane grond/Eerste verdieping/Tweede verdieping/Berging/Situatie).
- **Volledige `role`-enum.** Alleen 4 waarden gezien (3, 7, 10, 99); geen officiële Floorplanner-
  documentatie geraadpleegd (dit is hun interne, niet-publieke datamodel).
- **Betrouwbaarheid van het Floorplanner-pad over een groter deel van de markt.** Alle listings tot
  nu toe gebruiken deze viewer; niet getest of oudere/kleinere makelaars nog steeds de
  klassieke foto-plattegrond gebruiken zonder Floorplanner-embed (dan blijft de foto-route +
  bestaande prompt de enige optie).
- **Kosten van stap 2 in ZenRows-credits.** Niet opgezocht in de prijsdocumentatie; wel
  vergelijkbaar qua `js_render=true`-categorie met de bestaande WOZ-call.
