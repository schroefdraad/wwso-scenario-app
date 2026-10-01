# Brug Shortlist → Puntum — gefaseerd implementatieplan

**Datum:** 2026-10-01
**Status:** plan. **Geen code gewijzigd, geen planonderdeel, `plan/plan.md` en `plan/STATUS.md`
bewust niet aangeraakt** — dat gebeurt pas na beoordeling van dit document.
**Blokkade-context ongewijzigd:** Taak 21 (de eigenlijke importadapter) staat in Fase 4, on hold
achter het tussenfase-exitcriterium (`plan/STATUS.md`, "Openstaande beslissingen"). Dat criterium is
niet gehaald. Dit plan respecteert die hold en markeert per onderdeel aan welke kant van de poort het
hoort.

**Wat dit document doet:** het reconcilieert de "voorgestelde volgorde" uit
`outputs/RAPPORT_brug_workflow_automatisering_2026-09-27.md` §9 met de FML-vondst én met de
tegenbevindingen die daarna op dezelfde dag zijn toegevoegd aan
`briefings/BRIEFING_brug_shortlist_puntum_2026-10-01.md`. Het herontwerpt niets uit die keten; waar
een eerder besluit blijft staan, staat dat erbij met verwijzing.

**Documentketen (gelezen, in deze volgorde):**
1. `C:\Users\Myle\Documents\Realestate Workflow\outputs\RAPPORT_brug_puntum_blauwdruk_20260927.md`
   — oorspronkelijke blauwdruk, bewust nooit in `plan/plan.md`.
2. `briefings/BRIEFING_brug_shortlist_puntum_2026-09-27.md` — WWSO-kant. Het daarin gevonden
   correctheidsgat (zolder zonder vaste trap) is inmiddels **opgelost** in
   `prompts/PROMPT_plattegrond_kamerafmetingen_uitgebreid.md` (quick win #5, 2026-09-30) en speelt
   hieronder alleen nog een rol als argument, niet als openstaand werk.
3. `outputs/RAPPORT_brug_workflow_automatisering_2026-09-27.md` — architectuurbasis (§3: import landt
   in `InvoerState`; §4: geen `m2Geschat`/vijfde controle; §6: fase A/B/C; §7: afscherming; §9:
   volgorde).
4. `C:\Users\Myle\Documents\Realestate Workflow\outputs\RAPPORT_brug_fase_a_verificatie_20261001.md`
   — verificatie, **versie van 2026-10-01 inclusief de latere secties van dezelfde dag** over
   hoogtedata, `role`-betrouwbaarheid, de Vliering-narekening en de Berging-correctie.
5. `briefings/BRIEFING_brug_shortlist_puntum_2026-10-01.md` — primaire aanleiding, idem bijgewerkte
   versie.

Alles hieronder is tegen de code en tegen het beleidsboek gecontroleerd; bestandsverwijzingen staan
erbij zodat elke claim na te lopen is. Waar iets een aanname of hypothese is, staat dat er letterlijk.

---

## 1. Wat er sinds 2026-09-27 feitelijk is veranderd

| Punt | Stond op 2026-09-27 | Stand nu | Bron |
|---|---|---|---|
| `<dt>/<dd>`-kenmerken zonder `js_render` | aanname, met tegenindicatie in de code | **bevestigd**, 38-42 paren op 2 listings | doc 4 |
| Exacte labelteksten | onbekend | **bevestigd** (n=2); `externe bergruimte` is voorwaardelijk per pandtype, geen bug | doc 4 |
| Plattegrond-URL's | onbekend | **bevestigd**: hoofdpagina geeft 4 preview-foto's, `{detail_url}media/fotos` geeft alle foto's incl. het plattegrond-plaatje, ook met `js_render=false` | doc 4 |
| Plattegrond-m² | alleen via AI-plaatjelezen | **tweede route bevestigd werkend**: Floorplanner/FML-embed geeft polygonen per ruimte en alle verdiepingen via `window.api.project.floors` | doc 5 |
| Steekproef | n=2 | **n=7** (5 gelukt, 1 mislukt, 1 niet herget). De schone −3,2% op de eerste twee panden was **geen constante** | doc 5 |
| Floor-dubbeltelling | exacte-match-duplicaatcheck | **overlap-detectie** (`_exclude_redundant_floors`, ≥90% verklaard door andere floors samen): +52,9%→+17,7%, +77,9%→+29,3% | doc 5 |
| `role` als typesignaal | onbekende maar veelbelovende enum (3/7/10/99) | **onderzocht en afgekeurd**: soms volledig afwezig (Oppert 116), grof (Hal/Entree/Gang = 7; Overloop én Vliering = 11), en inconsistent voor hetzelfde roomtype (MK = 10 bij het ene pand, 8 bij het andere) — vrije keuze van de makelaar in de editor, geen taxonomie | doc 4/5, update |
| Hoogtedata voor de 1,50 m-regel | niet onderzocht (`walls`/`dimensions`/`sketch` ongeopend) | **onderzocht en niet bruikbaar**: `walls` heeft wel `az.h`/`bz.h` (cm), maar op de Vliering-floor staan alle 20 muren op 280 cm; geen `roofs`/`slope`/`pitch` in de state. Het schuine dak is niet gemodelleerd | doc 4/5, update |
| "Vliering eruit halen" als regel | niet beproefd | **nagerekend en afgewezen**: Randweg zónder Vliering −1,1%, maar Kromhoutstraat heeft geen losse zolder-floor (+8,7% zonder de kasten, −11,3% zonder de hele verdieping) en een blanket zolder-uitsluiting negeert de vaste-trap-nuance | doc 4/5, update |
| Berging in de m²-som | meegeteld | **nieuwe per-ruimte vlag `telt_mee_in_wonen`** (`_is_bergruimte()`, naam-match op "berging"); `totaal_m2` telt alleen ruimtes met `true`. Randweg +15,0%, Kromhoutstraat +22,2% | doc 4/5, update |
| Status van de vlag | sanity-check, mogelijk later te verfijnen | **vermoedelijk het eindmechanisme**: appartementen (n=2) betrouwbaar, alle 3 huizen geflagged en dat lijkt terecht — escaleren naar een mens, niet zelf classificeren | doc 5 |
| Afscherming via `features` | voorstel voor de multi-tenant-taak | **al gebouwd en gedraaid**: migratie `0005` heeft `allowed_emails.features` + `heeft_feature()`, `0006` kent `'import'` toe aan Myle/Emma, `haalEigenProfielOp()` leest `features` al | `plan/plan.md`, `lib/deals/profiel.ts`, `lib/deals/types.ts:128-142` |
| Quick wins | 2 open | **beide af**: bulk verwarmd/verkoeld (`ALLE_RUIMTES_VERWARMD_VERKOELD_GEZET`) en de uitgebreide plattegrond-prompt | `plan/plan.md`, 2026-09-30 |
| Meterkastcorrectie | bestond niet | **bestaat**: `Ruimte.heeftMeterkast` trekt 0,18 m² af vóór R1/R2/R9 (§2.2.4), live sinds v0.7.18 | `types/ruimte.ts:72`, `r1-oppervlakte-vertrekken.ts:40` |

**Nog steeds niet geverifieerd** (ongewijzigd uit doc 5): marktdekking van de Floorplanner-embed
buiten de 7 geteste listings; ZenRows-kosten van stap 2; de kale fout bij Noordschans 4;
Hertshoornvaren 8 niet herget met de overlap-fix; de 8%-drempel is arbitrair gekozen; hoe de
plattegrond-**foto** automatisch van interieurfoto's te onderscheiden.

**Netto effect van de updates van 2026-10-01 op het ontwerp:** de FML-route levert **wel** een
betrouwbaar, exact, per-verdieping gestructureerd *skelet met m²*, maar **geen** classificatie — niet
van ruimtetype (`role` afgekeurd), niet van zolderhoogte (geen dakmodel), en dus ook geen automatisch
oordeel over welke m² voor welke rubriek meetelt. Dat maakt de route niet minder waardevol, maar het
verschuift wat hij vervangt: **de leesstap, niet de beoordelingsstap.**

---

## 2. Het beleidsboek beantwoordt de vraag die de briefing aan onze kant stelt

Doc 5 vraagt expliciet: *"Welke `role`-waarden voor Puntum's rubrieken meetellen is een vraag voor
jullie kant"*, en vermoedde NEN2580's vrije-hoogte-regel achter de resterende afwijkingen. Die vraag
is te beantwoorden uit de primaire bron, niet uit NEN2580: **het WWSO-beleidsboek heeft zijn eigen
meetinstructie** (`resources/beleidsboek/beleidsboek-wwso-2026-01.txt` §2.2.4) en zijn eigen
eisenlijst (§2.2.1.2). Dat beleidsboek is hier de bron van waarheid — niet NEN2580, niet Funda's
"Wonen", niet `wwso.xlsx`.

### 2.1 Wat §2.2.4 letterlijk voorschrijft

- **Binnenmaats**, netto, **van muur tot muur**, **op 1,50 meter boven de vloer** — ook als de
  oppervlakte op vloerniveau afwijkt.
- **Kasten tellen mee bij het vertrek waarin de kastdeur uitkomt.** De afmeting doet niet ter zake;
  *de plek van de deur* bepaalt bij welke ruimte de kast hoort (geldt ook voor een kastenwand tussen
  twee vertrekken).
- **Niet meegeteld**: verticale koven, schoorsteen- en ventilatiekanalen, stand-/grondleidingen
  (horizontale leidingen wél).
- **Gas-/elektrameter**: 30 × 60 cm (0,18 m²) van de gemeten oppervlakte af — al geïmplementeerd als
  `Ruimte.heeftMeterkast`.
- **Hellend of verlaagd plafond**: alleen het deel waar het plafond ten minste **1,50 m** hoog is;
  bij een hellend plafond loopt die 1,50 m tot het dakbeschot.
- **Onder een vaste trap**: alleen het deel met ten minste 1,50 m vrije ruimte; een inschuifbare of
  opvouwbare trap neemt geen oppervlakte in.
- **Erker/entresol**: meerekenen mits vrije hoogte ≥ 1,50 m.

### 2.2 Wat §2.2.1.2 eist voordat een ruimte überhaupt een *vertrek* is

Zeven eisen. Twee zijn uit polygoondata te toetsen, de rest niet — en die tweedeling is nu hard,
want de hoogtevraag is inmiddels uitgezocht:

| Eis (§2.2.1.2) | Uit FML-data toetsbaar? |
|---|---|
| minimaal 4,00 m² | **ja** — direct uit de polygoon (schoenveterformule) |
| ≥ 1,50 m breed over ≥ 80% van de langste zijde | **ja, met geometriewerk** — uit de polygoonvorm |
| vrije hoogte ≥ 2,10 m over ≥ 50% van de oppervlakte (of over 11 m²) | **nee** — `walls.az.h/bz.h` bestaat, maar geeft één uniforme muurhoogte per floor en er is geen dakmodel (doc 4/5) |
| begaanbare vloer; wanden van vast materiaal | nee |
| ≥ 0,50 m² transparant oppervlak aan de buitenlucht | nee |
| ventilatie direct met buitenlucht | nee — inspectiefeit |
| ≥ 1 stopcontact en 1 lichtpunt | nee — inspectiefeit |

Plus §2.2.1.3: een zolderruimte is alleen een *vertrek* bij **vaste trap én beschoten dak**; zonder
vaste trap als overige ruimte kost het **5 aftrekpunten**, begrensd op de eigen waarde (§2.2.2.3,
`r2-oppervlakte-overige-ruimten.ts:38-47`). Geen van die twee kenmerken zit in de FML-data.

### 2.3 Antwoord op de scraperkant: er is geen `role`-as, en die is er ook niet nodig

De as waarop Puntum's rubrieken meetellen is **ruimtetype**, niet een Floorplanner-code:
`VERTREK_TYPES = ['Privévertrek','Keuken','Badruimte']` → R1 (1 pt/m²);
`OVERIGE_RUIMTE_TYPES = ['Berging','Bijkeuken','Wasruimte','Overige ruimte','Toiletruimte']` → R2
(0,75 pt/m²); `VERKEERSRUIMTE_TYPES` krijgt **geen** oppervlaktepunten maar telt wél in R3
(`packages/engine/src/rubrieken/gedeeld.ts:9-24`).

Nu `role` als onbetrouwbaar is afgeschreven (afwezig, grof, inconsistent per makelaar) valt de
mapping-vraag uit doc 5 §"Wat dit betekent voor Taak 21" weg: **er komt geen `role` → `RuimteType`-
tabel.** Wat ervoor in de plaats komt:

| Signaal | Behandeling in Puntum |
|---|---|
| Vrije-tekst `name` ("Woonkamer", "Slaapkamer 1", "Overloop", "MK") | **suggestie** voor `voorgesteldType` op het reviewscherm, met een zichtbaar label "voorstel uit plattegrondnaam". Nooit stil toegepast |
| `role`, indien aanwezig | **niet gebruiken** als type- of uitsluitingsregel. Hoogstens meesturen in het reviewlog, zodat een latere sessie niet opnieuw hoeft te ontdekken dat het onbruikbaar is |
| Polygoon-m² < 4,00 m² | **harde, bronspecifieke melding**: "kan geen vertrek zijn (§2.2.1.2)" — het enige volledig automatiseerbare eis-oordeel |
| Naam duidt kast/meterkast aan | rij **niet** als zelfstandige ruimte voorstellen; melding "§2.2.4: een kast telt bij het vertrek waarin de kastdeur uitkomt" + de vraag bij welk vertrek. `heeftMeterkast` is een aparte toggle (vast bedrag 0,18 m², de kast-m² zelf is daarvoor niet nodig) |
| Naam duidt zolder/vliering aan | m² **niet voorvullen** (bovengrens, zie §2.4) + verplichte vraag `vasteTrap`/`beschotenDak` |
| Geen bruikbaar signaal | rij wél voorstellen, **type verplicht laten kiezen**, nooit defaulten |

Dat is precies de uitkomst waar de scraperkant zelf op uitkwam ("niet proberen zelf te classificeren,
escaleren naar een mens") — met het verschil dat Puntum de melding wél aan een beleidsboekparagraaf
kan hangen in plaats van aan een drempelpercentage.

### 2.4 De twee resterende afwijkingen: wat ze wel en niet zeggen

De narekening aan scraperkant (doc 4/5, update) laat zien dat geen enkele enkelvoudige regel ze
oplost. Daar is vanuit het beleidsboek iets aan toe te voegen dat de framing verandert:

- **Randweg 77, Vliering 41 m² (nu +15,0% ná de Berging-correctie).** Zónder Vliering komt het pand
  op −1,1%, wat er sterk op wijst dat die zolder niet in Funda's "Wonen" zit. Voor WWSO is dat
  **geen uitsluiting**: een zolder telt wél mee, als vertrek bij vaste trap én beschoten dak, anders
  als overige ruimte mét 5 aftrekpunten — maar alleen het deel met ≥ 1,50 m plafondhoogte (§2.2.4).
  Een vliering-polygoon is dus structureel een **bovengrens**, nooit een WWSO-m².
- **Kromhoutstraat 14, 22 m² "Kast" (nu +22,2%).** De kast-m² eruit halen is in WWSO-termen juist
  **fout**: §2.2.4 zegt expliciet dat kastoppervlakte meetelt bij het vertrek waar de kastdeur
  uitkomt. Die m² moeten dus **verplaatst** worden, niet geschrapt. Dat die 22 m² het verschil met
  Funda's "Wonen" vergroot, zegt iets over het verschil tussen de mandjes — niet dat die m² voor
  WWSO niet bestaan.

Conclusie, over te nemen: **de afwijkingen zijn geen fout meer die nog gefixt moet worden, en ook
geen bewijs dat FML-m² onbruikbaar is.** Ze markeren de panden waar een mens de plattegrond erbij
moet pakken — bij huizen vaker dan bij appartementen.

### 2.5 Drie onvergelijkbare mandjes — en één valkuil in de nieuwe scraper-output

| Mandje | Bevat | Mist |
|---|---|---|
| FML `totaal_m2` (nieuw) | alle areas met `telt_mee_in_wonen: true` — woonruimte, hal, kasten, shafts | bergingen (per naam-match uitgesloten) |
| Funda "Wonen" | NEN2580 gebruiksoppervlakte wonen, incl. verkeersruimte | bergingen, buitenruimte |
| **WWSO R1+R2** | vertrekken (1 pt/m²) + overige ruimten **inclusief berging** (0,75 pt/m²) | verkeersruimte krijgt géén oppervlaktepunten; zolder alleen boven 1,50 m; meterkast −0,18 m²; kasten horen bij het omsluitende vertrek |

**Hieruit volgt een harde adapterregel.** `telt_mee_in_wonen` is een vlag voor de
Funda-vergelijking, **geen uitspraak over WWSO-relevantie** — een berging met
`telt_mee_in_wonen: false` levert in R2 wél 0,75 pt/m². De adapter moet daarom:

1. **alle** ruimtes overnemen, ook die met `telt_mee_in_wonen: false`;
2. `totaal_m2` nooit als basis voor `ruimtes[]` of als controlegetal voor de puntentelling gebruiken;
3. `verschil_pct`/`vlag` uitsluitend als review-informatie tonen.

Dit is dezelfde valkuilcategorie als `wozOppervlak` ≠ Funda's `woonoppervlakte_m2` (doc 1) en
Funda's `aantal_kamers` ≠ `Pand.aantalKamers` (doc 3 §1.1): een veld dat klinkt als wat je nodig
hebt, maar een ander mandje beschrijft. Twee keer eerder is dat in deze keten al bijna misgegaan;
dit is de derde.

---

## 3. Fase C: FML-route, foto-route, of beide?

### 3.1 Vergelijking, bijgewerkt met de bevindingen van 2026-10-01

| As | FML-route (Floorplanner) | Foto-route (bestaande uitgebreide prompt) |
|---|---|---|
| Exactheid m² | polygoon, 2 decimalen, geen leesfout mogelijk | gedrukte labels/maatlijnen, lees- of typefout mogelijk |
| Meerdere verdiepingen | **opgelost** via `floors[]` met eigen `designId` | onbetrouwbaar — geen bestandsnaam of ordening om op te varen (doc 4) |
| Welke ruimte op welke verdieping | uit de structuur | af te leiden uit de tekening |
| Ruimtetype | **geen bruikbaar signaal** — `role` afgekeurd; alleen vrije-tekstnaam | naam + tekening; mens/AI interpreteert, prompt vraagt `voorgesteldType` |
| `vasteTrap` / `beschotenDak` | **niet aanwezig** | **wél** — quick win #5 leest dit expliciet uit; plattegronden tonen vaste trap vs. luik letterlijk |
| Hellend plafond / 1,50 m-regel | **niet aanwezig** (geen dakmodel, uniforme muurhoogte) | zichtbaar op de tekening, mens kan beoordelen |
| Kast bij welk vertrek (§2.2.4) | deurpositie niet onderzocht (`state.items`/`lines` ongeopend) | op de tekening zichtbaar |
| Kosten per pand | 1 goedkope call + n dure `js_render=true`-calls (prijs niet opgezocht), 30-85 sec, retries nodig | 1 goedkope call voor de foto-URL's; daarna een gratis Claude-chat |
| Menselijke stap | geen leesstap; beoordeling blijft | lezen + beoordelen |
| Marktdekking | onbekend buiten 7 listings; valt weg zonder embed | werkt zolang er een plattegrond tussen de foto's staat |
| Faalmodi | render-timeouts (retry), overzichts-floors, Noordschans-fout ongediagnosticeerd | geen plattegrond aanwezig; foto niet automatisch te herkennen |

### 3.2 Aanbeveling: FML primair voor het skelet, foto-route verplicht complementair

**FML prioriteren boven de foto-route voor wat FML aantoonbaar goed doet — ruimte-indeling,
verdiepingsstructuur en m² — en de foto-route niet als "fallback bij ontbrekende embed" wegzetten
maar als vast tweede been.** Drie redenen, alle drie versterkt door de updates van vandaag:

1. **FML mist exact wat quick win #5 net dichtzette.** `vasteTrap`/`beschotenDak` zijn geen
   geometrie, en ze zijn puntentechnisch zwaar: zonder vaste trap kost een zolder 5 punten en kan hij
   geen vertrek zijn (§2.2.1.3/§2.2.2.3). Nu ook vaststaat dat er géén dakmodel in de state zit, is
   een FML-only pad gegarandeerd blind voor de hele zolderproblematiek. Exactere m² met het verkeerde
   teken is slechter dan ruwere m² met het juiste teken.
2. **FML classificeert niet.** `role` is afgekeurd; de vrije-tekstnaam is het enige signaal en dat is
   niet hard. De typekeuze (vertrek vs. overige ruimte vs. verkeersruimte) bepaalt 1,00 vs. 0,75 vs.
   0,00 punt per m² — dat is geen detail dat je aan een naamheuristiek overlaat.
3. **Marktdekking is niet getest.** Zolang onbekend is hoeveel listings geen embed hebben, is de
   foto-route wat de brug bruikbaar houdt.

Dat kost geen tweede implementatie: **beide routes leveren hetzelfde JSON-contract**, namelijk het
machine-leesbare blok dat `prompts/PROMPT_plattegrond_kamerafmetingen_uitgebreid.md` al definieert
(`naam`, `voorgesteldType`, `oppervlakteM2`, `verdieping`, `meetbasis`, `leesVertrouwen`, `zolder{}`,
`schattingM2`, plus `totaalcheck`). De FML-normalisator zet `meetbasis: "FML-polygoon"`, vult
`oppervlakteM2` alleen waar dat verantwoord is (§5.2) en laat `voorgesteldType` leeg waar de naam
geen uitsluitsel geeft. Eén parser in Puntum, twee invoerbronnen — hetzelfde principe als de app
twee keer eerder heeft geleerd over parallelle paden (gedeelde-checkboxtabel v0.7.0, `ScenarioSlot`
v0.7.3; doc 3 §5).

### 3.3 FML is géén Fase A

Fase A is de **nachtelijke, goedkope, per-listing** stap over de hele shortlist. De FML-route is
30-85 seconden per pand, meerdere `js_render=true`-calls met retries, en een nog onbekende
creditprijs. Dat hoort bij de **gekozen kandidaat**, niet bij 125 listings. Aanbeveling: FML wordt
een eigen fase (**C1**) die on-demand per pand loopt. Zo is `/plattegrond-fml` ook al gebouwd: een
endpoint met één pand erin, naar het patroon van `/woz-batch`.

---

## 4. Eigenaarschap — wat waar hoort

| Onderdeel | Project | Reden |
|---|---|---|
| Kenmerken-`<dt>/<dd>`, foto-URL's, `funda_id`, WOZ/BAG | `Realestate Workflow` | bestaat al, hoort bij de scrape |
| `/plattegrond-fml`: ophalen, floors, overlap-detectie, retries, `telt_mee_in_wonen` | `Realestate Workflow` | ruwe data, geen domeinkennis |
| "Kopieer voor Puntum" (record uit `funda_results.json`, niet de Sheet-rij) | `Realestate Workflow` (Apps Script) | doc 3 §8 punt 7 |
| Naam → `RuimteType`-suggestie, eisentoets §2.2.1.2, kast-/zolderbehandeling, meterkast | **Puntum** | domeinkennis + golden master zit hier |
| `PandInvoer`/scraper-Zod-schema's, `vanImport.ts`, reviewscherm | **Puntum** | Puntum bezit het schema |
| Sheet-kolom met de echte maximale huur | `Realestate Workflow` | Sheet-kant |

**De regel blijft ongewijzigd** (doc 1, doc 2, doc 3 §6.3): de scraper blijft dom en levert ruwe
velden; Puntum mapt en valideert. Python een `PandInvoer`-vormige JSON laten schrijven dupliceert een
Zod-schema in een taal die het niet kan valideren → drift. Dat is precies de faalcategorie die dit
project twee keer raakte: `Keuken.verwarmd` (2026-09-04) en `toiletType` (v0.7.16→v0.7.17), beide in
`plan/STATUS.md`. `/plattegrond-fml` levert daarom terecht alleen ruwe `{name, role, m2}` per floor.

De nieuwe `telt_mee_in_wonen`-vlag zit nog net aan de goede kant van die grens: hij beschrijft
Funda's mandje, niet WWSO's rubrieken. Zolang dat zo blijft is er geen probleem — zie de harde regel
in §2.5. Zou de scraperkant ooit een `telt_mee_voor_wwso`-achtige vlag toevoegen, dan is dat wél
schema-drift en hoort dat besluit hier.

---

## 5. Harde ontwerpeisen uit de documentketen, toegepast op de FML-situatie

Niet herontworpen — alleen toegepast.

1. **Nooit een geschat of afgeleid m² stilzwijgend als hard getal doorrekenen.** Precedent: Tussenfase-taak C
   laat `Investering`/`TVT` expliciet `null` in plaats van een gegokte €0 (`plan/plan.md`).
   Toegepast: géén schaalcorrectie op de FML-som, ook niet als een grotere steekproef alsnog een
   bias laat zien. De −3,2%-"constante" viel bij n=7 al om.
2. **De §4-tabel van doc 3 blijft de beslisregel**, met FML erin gepast:

   | Herkomst m² | Import doet | App doet |
   |---|---|---|
   | FML-polygoon, `vlag: false`, geen zolder-/kast-/hellend-plafond-indicatie | vult in, met herkomst "FML-polygoon" zichtbaar | rekent door na de normale bevestiging |
   | FML-polygoon, `vlag: true` (in de steekproef: elk huis) | **vult niet in** — grijs getal + "neem over" per rij | blokkeert "Doorrekenen" tot overname |
   | FML-polygoon van zolder/vliering of met hellend plafond | **vult niet in** — bovengrens (§2.2.4) | idem |
   | FML-kastpolygoon | **geen eigen rij** — melding "hoort bij het vertrek met de kastdeur" | idem |
   | Gedrukt m²-label of maatlijn uit de foto-prompt | vult in | rekent door |
   | Funda "externe bergruimte" / "gebouwgebonden buitenruimte" | vult in (exact opgegeven) | rekent door |
   | Visuele schatting | niet invullen, `schattingM2` tonen | blokkeert |
   | Geen aanwijzing | leeg | blokkeert |

3. **Geen `m2Geschat`-veld, geen vijfde controle** (doc 3 §4). De bestaande poort
   (`ontbrekendeStap()` in `lib/invoer/projecteer.ts:136-147` + `pandInvoerValidatiefout`) is de
   enige poort; een halve import is een half ingevuld invoerscherm.
4. **De import landt in `InvoerState`, niet in `PandInvoer`, niet in Supabase** (doc 3 §3).
   `InvoerState` is sessiestate; een importveld daarin kan nooit het laden van een bestaande woning
   breken — in tegenstelling tot de twee schema-incidenten.
5. **Adapter plus Zod-schema in Puntum.** Zie §4.
6. **Nooit een type gokken.** `RuimteRij.type` is verplicht (`lib/invoer/types.ts:18-35`); een
   default naar `Overige ruimte` zou stil 0,75 pt/m² laten meerekenen. Onbekende of onduidelijke
   naam → verplichte typekeuze op het reviewscherm; de rij gaat niet mee bij "Overnemen" zonder die
   keuze.
7. **Geen regels bouwen op `role`.** Onderzocht en afgekeurd (§1, §2.3). Een mapping die bij het ene
   design werkt en bij het andere niet, is valse precisie — en stil fout, want er komt geen
   Zod-fout uit een plausibel verkeerd ruimtetype.
8. **`telt_mee_in_wonen` nooit lezen als WWSO-relevantie.** Zie §2.5.
9. **`Pand.aantalKamers` nooit uit Funda's `aantal_kamers`** (doc 3 §1.1): dat zijn vertrekken,
   terwijl `aantalKamers` het aantal onzelfstandige wooneenheden is en de deler bij R8/R9/R10.
   Alleen als vraag op het reviewscherm.
10. **`aantalAdressenMetToegang` nooit op 1 zetten.** De motor neemt dat bewust nooit aan
    (`types/ruimte.ts:74-79`, harde regel 4); de import laat het leeg en laat de validatie blokkeren.
11. **Toewijzingsmatrix verder dan de diagonaal, keuken-/sanitairdetail, `monument` en `verwarmd`
    per ruimte blijven handwerk** (doc 3 §6.6). FML verandert daar niets aan.
12. **Afscherming via de bestaande `features`-vlag `'import'`** (doc 3 §7) — kolom, functie en
    client-read bestaan al; alleen de UI-gate ontbreekt. Die heeft pas betekenis ná het dichtzetten
    van de auth-toggle (`plan/STATUS.md`).

---

## 6. Het plan

Criterium voor "mag vóór de hold", afgeleid uit de twee quick wins die er al uit zijn getrokken:
(a) nuttig ook als de brug er nooit komt, (b) geen afhankelijkheid van scraperdata en geen nieuw
importscherm, (c) geen schema-/migratiewijziging, (d) klein genoeg om in één sessie af te ronden en
los te verifiëren. Wat niet aan alle vier voldoet, blijft achter de poort.

### Spoor 0 — vóór de hold, los uit te trekken

| # | Wat | Waar | Omvang |
|---|---|---|---|
| **S0.1** | Waarschuwingslijst groeperen i.p.v. `.slice(0, 8)` (`components/invoer/Waarschuwingen.tsx:19`, nog ongewijzigd). Nu blijven bij veel niet-toegewezen ruimtes meldingen stil onzichtbaar | Puntum | klein |
| **S0.2** | Skelet-preset uitbreiden: `SCAFFOLD_PRIVEVERTREKKEN` (`lib/invoer/reducer.ts:193-216`) maakt N privévertrekken met diagonale toewijzing. Toevoegen: optionele gedeelde rijen (keuken, badruimte, toiletruimte, verkeersruimte, berging) met **lege m²**, toegewezen aan alle kamers, in één dialoog | Puntum | klein |
| **S0.3** | Knop "Kopieer voor Shortlist" op het resultaatscherm (max. jaarhuur AS-IS + punten per kamer naar het klembord). De Sheet-kolom/formulewijziging hoort aan de andere kant | Puntum (+ Sheet elders) | klein |
| **S0.4** | **Antwoorddocument voor de scraperkant**: §2.1 (meetinstructie §2.2.4), §2.2 (welke vertrek-eisen machinaal toetsbaar zijn), §2.3 (geen role-as, naam = suggestie) en §2.5 (de `telt_mee_in_wonen`-valkuil + drie mandjes). Puur documentatie, geen code | Puntum (`outputs/` of `prompts/`) | klein |
| **S0.5** | Taak 21 in `plan/plan.md` herschrijven en de brug-sectie bijwerken met de FML-route en deze fasering | Puntum, administratief | klein |

**Expliciet níet in spoor 0:** de naam → `RuimteType`-suggestie *als code*. In Puntum heeft die
alleen betekenis binnen `vanImport.ts`; een losse module zonder afnemer is code zonder gebruiker —
precies het soort half gebouwd pad dat deze keten twee keer heeft afgewezen. De *inhoud* ligt vast in
S0.4 en is daarmee niet verloren.

### Poort — tussenfase-exitcriterium

Twee opeenvolgende zelfstandige sessies van Steven Kramer zonder nieuwe blokkerende melding
(`plan/STATUS.md`). Daarna, en vóór de import zinvol af te schermen is: **auth-toggle dicht**
(§5.12).

### Fase A — scraperkant, goedkoop, nachtelijk

| # | Wat | Omvang |
|---|---|---|
| A1 | Kenmerken-`<dt>/<dd>` meenemen in de bestaande `js_render=false`-call (bevestigd aanwezig): slaapkamers, badkamers, badkamervoorzieningen, woonlagen, **externe bergruimte in m²** (voorwaardelijk), **gebouwgebonden buitenruimte in m²**, verwarming, "Wonen" | klein |
| A2 | Extra `js_render=false`-call naar `{detail_url}media/fotos` voor de volledige fotolijst; plus de `/media/plattegronden`-link en `fmlpub`-detectie als "heeft embed"-vlag | klein |
| A3 | `stad` als aparte kolom (nog te verifiëren, doc 3 §8 punt 4) en `funda_id` als stabiele sleutel | klein |
| A4 | "Kopieer voor Puntum" haalt het **record uit `funda_results.json`** op via `funda_id`/adres, niet de Sheet-rij (doc 3 §8 punt 7) | klein |
| A5 | `wozPeildatum` uit de Kadaster-respons — laagste prioriteit, geen rubriek leest het (doc 3 §1.2) | klein |

Open punt dat Fase A niet oplost: hoe de plattegrond-**foto** automatisch van interieurfoto's te
onderscheiden (positie-heuristiek onvoldoende, doc 4). Zolang dat zo is kiest de gebruiker de foto
zelf uit de lijst — acceptabel, het is één klik in een workflow die toch per kandidaat loopt.

### Fase B — Puntum, het echte werk (Taak 21, achter de poort)

| # | Wat | Omvang |
|---|---|---|
| B1 | `lib/invoer/vanImport.ts` — ruwe scraper-JSON → `InvoerState`, als broer van het bestaande `pandInvoerNaarState` (`lib/invoer/vanPandInvoer.ts`). Adres/postcode/stad splitsen, `wozWaarde` optioneel, COROP afleiden via `packages/data/src/geografie` en **leeg laten bij meerdere gemeente-kandidaten** (de bestaande suggestie draait op `onBlur` en is er niet bij een import; ~20% van de plaatsnamen is een prefix van een andere) | middel |
| B2 | `/woning/importeren` + reviewscherm: herkomst per veld, afgeleide velden expliciet, skeletvoorstel, de vraag "hoeveel kamers ga je verhuren?" (nooit voorgevuld uit Funda), knop "Overnemen in invoerscherm" | middel |
| B3 | Zod-schema voor het **scraper**formaat (los van `PandInvoer`), zodat een verouderd JSON-bestand een nette melding geeft i.p.v. een halve import | klein |
| B4 | Provenance: `funda_id`, `detail_url`, `vraagprijs`, `scraped_at` in het notitieveld; `funda_id` als dedupe-check tegen bestaande woningen | klein |
| B5 | Review-item dat het scherm móet tonen: **ontbrekende WOZ zonder taxatiewaarde is een stille onderwaardering** — R11 valt dan terug op het minimum terwijl een echte WOZ 12-14 punten geeft. In de steekproef was `woz_waarde` 3 van 3 keer `null` | klein |
| B6 | UI-gate op `features.includes('import')` via `haalEigenProfielOp()` — route en knop verbergen. Pas zinvol ná de auth-toggle | klein |

### Fase C1 — FML-route (achter de poort, ná B)

| # | Wat | Waar | Omvang |
|---|---|---|---|
| C1.1 | `/plattegrond-fml` deployen naar Cloud Run; Noordschans 4's fout diagnosticeren; Hertshoornvaren 8 hertesten met de overlap-fix | scraper | klein |
| C1.2 | FML-normalisator in Puntum: `/plattegrond-fml`-output → het JSON-contract van de uitgebreide prompt. **Alle** ruimtes overnemen (ook `telt_mee_in_wonen: false`), naam-gebaseerde typesuggestie zonder automatische toepassing, eisentoets ≥ 4,00 m² (+ optioneel de breedte-eis), kast-/meterkast-/zolderbehandeling uit §2.3, en `oppervlakteM2` alleen vullen volgens de tabel in §5.2 | Puntum | middel |
| C1.3 | Tweede plakveld op hetzelfde reviewscherm (doc 3 §5 stap 4) + per-rij "neem over" + `vlag`/`verschil_pct`/`totaal_m2` weergeven als review-informatie met een expliciete toelichting dat het een andere meetbasis is dan WWSO's R1+R2 | Puntum | middel |
| C1.4 | *Optioneel, lage prioriteit:* onderzoeken of `state.items`/`lines` deurposities bevatten waarmee kast → vertrek automatisch toe te wijzen is (§2.2.4). Alleen oppakken als de kastmeldingen in de praktijk hinderen | scraper | klein |

Niet meer in dit plan, omdat het is uitgezocht en negatief uitviel: hoogtedata voor de
1,50 m/2,10 m-regels (geen dakmodel) en de `role`-enum-inventarisatie (geen betrouwbare taxonomie).

### Fase C2 — foto-route (achter de poort, parallel aan C1)

| # | Wat | Omvang |
|---|---|---|
| C2.1 | Hetzelfde plakveld accepteert het JSON-blok uit `PROMPT_plattegrond_kamerafmetingen_uitgebreid.md` ongewijzigd — dat contract bestaat al, dus dit is geen extra werk mits C1.2 ernaartoe normaliseert | klein |
| C2.2 | `vasteTrap`/`beschotenDak` komen **altijd** uit deze route of uit een expliciete vraag op het reviewscherm — nooit uit FML, ook niet impliciet | klein |

### Fase D — bewust niet

"Puntum haalt het JSON zelf op uit Drive/Sheet" blijft afgewezen (doc 3 §7): dat introduceert een
secret, een rotatieplicht en een nieuwe faalmodus, en verandert afscherming van zichtbaarheid in
echte access control. De paste/upload-route houdt Puntum volledig los van de scraperinfrastructuur.

---

## 7. Voorgestelde volgorde

Vervangt §9 van `RAPPORT_brug_workflow_automatisering_2026-09-27.md`. Nog steeds niets besloten; dit
is de volgorde die het minste weggooit als de brug er nooit komt.

1. **S0.4** — het antwoorddocument naar de scraperkant. Beantwoordt hun expliciete vraag, voorkomt
   dat daar een role- of NEN2580-regel gebouwd wordt die hier niet klopt, en kost bijna niets.
   **[nu mogelijk]**
2. **S0.1 + S0.2 + S0.3** — de drie resterende kleine Puntum-verbeteringen, dezelfde categorie als de
   twee afgeronde quick wins. **[nu mogelijk]**
3. **A1-A4** — Fase A aan de scraperkant, inclusief het `funda_results.json`-besluit (A4). Goedkoop
   en bevestigd haalbaar. **[nu mogelijk, ander project]**
4. *— poort: tussenfase-exitcriterium (twee schone Steven-sessies) —*
5. **Auth-toggle dicht** + de multi-tenant-restpunten (custom SMTP, tester-inserts). De
   `features`-infrastructuur staat er al.
6. **S0.5 / Taak 21 herschrijven** in `plan/plan.md`, nu met de FML-route en deze fasering.
7. **Fase B** (B1-B6) — grootste brok, goede kandidaat voor een lange zelfstandige sessie met
   browserverificatie en een korte gezamenlijke check erna.
8. **C1.1** — endpoint deployen en de twee losse eindjes; kan parallel aan B, ander project.
9. **C1.2 + C1.3 + C2.1 + C2.2** — Fase C, pas als B in de praktijk bevalt. Hier wél een
   interactieve verificatieronde, niet puur autonoom wegzetten: dit is het correctheidsgevoelige deel
   (m² gaan een huurprijs in).
10. **C1.4** alleen als de kastmeldingen in de praktijk hinderen. **Fase D**: niet doen.

---

## 8. Open beslissingen voor de gebruiker

Deze moeten vóór de bouw van het betreffende onderdeel gemaakt zijn.

1. **Prioriteit FML vs. foto.** Aanbeveling: **FML primair** voor skelet, verdiepingsstructuur en m²;
   **foto-route als vast tweede been**, niet als noodgreep — FML kent geen zolderkenmerken, geen
   plafondhoogte en geen betrouwbaar ruimtetype (§3.2). Alternatief (alleen foto) houdt de brug
   simpeler maar verliest de verdiepingsstructuur, die aantoonbaar onbetrouwbaar is uit foto's.
2. **Wordt FML Fase A of een eigen fase?** Aanbeveling: **eigen fase C1, on-demand per kandidaat** —
   30-85 sec en meerdere dure calls horen niet in een nachtrun over 125 listings (§3.3).
3. **Bron van de handoff-JSON.** Aanbeveling: **het record uit `funda_results.json`** via
   `funda_id`/adres, niet de Sheet-rij (die is een afgeleide voor de rankingformule). Dit is het nog
   openstaande punt 7 uit doc 3 §8 en raakt de Apps-Script-kant; het moet dáár opgelost zijn vóórdat
   B1/B2 gebouwd worden, anders krijgt de adapter structureel ontbrekende velden.
4. **Vorm van de handoff in de UI.** Aanbeveling: twee aparte plakvelden op één reviewscherm
   (pandrecord + plattegrondblok), zodat de plattegrond later toegevoegd kan worden; niet één
   gecombineerd bestand dat alles-of-niets is.
5. **Hoe om te gaan met het ontbreken van een bruikbare type-taxonomie?** De oorspronkelijke vraag
   ("hoe `role` mappen, de enum is incompleet") is vervallen: `role` is onderzocht en afgekeurd.
   Aanbeveling: **naam-gebaseerde suggestie + verplichte menselijke typekeuze per rij**, met de
   ≥ 4,00 m²-eis als enige automatische uitsluiting van "vertrek" (§2.3). Alternatief (toch op naam
   defaulten) levert stil verkeerde punten per m² op.
6. **Wordt de kast-regel (§2.2.4) handmatig of geautomatiseerd?** Aanbeveling: **handmatig**, met een
   melding per kastpolygoon; C1.4 (deurposities) alleen als dat in de praktijk hindert. Let op: kast-m²
   moeten **verplaatst** worden naar het omsluitende vertrek, niet geschrapt (§2.4).
7. **Vaste correctiefactor op de FML-som: ja of nee?** Aanbeveling: **nee, definitief** — drie
   onvergelijkbare mandjes (§2.5) maken een factor principieel zinloos, en de −3,2%-"constante" viel
   bij n=7 al om.
8. **Blijft de 8%-drempel staan?** De waarde is arbitrair. Omdat de vlag nu expliciet het
   eindmechanisme is (escaleren naar een mens) en geen rekenwaarde, is validatie laag-prioriteit —
   maar het blijft een keuze, geen feit. Relevante nuance voor de verwachting: in de steekproef werd
   **elk huis** geflagged en **geen appartement**.
9. **Welke spoor-0-items mogen nu uit de hold?** Voorstel: S0.1-S0.4 wel (ze voldoen aan alle vier
   criteria), de typesuggestie als code niet (code zonder afnemer). S0.5 is administratief werk voor
   de gebruiker of een vervolgsessie.
10. **Wat als de Floorplanner-embed wegvalt of de markt hem niet breed gebruikt?** De fragiliteit van
    scrapen is permanent en daalt niet met meer bouwuren (doc 3, herziening 2026-09-27). Bij twee
    gebruikers met scrapertoegang is dat aanvaardbaar — maar de foto-route moet daarom werkend
    blijven en niet uitgefaseerd worden zodra FML werkt.
11. **Wordt `wozPeildatum` alsnog vastgelegd, of gaat het de dode-veldenaudit in?** Geen enkele
    rubriek leest het (doc 3 §1.2); het heeft alleen documentatiewaarde bij R11.

---

## 9. Wat dit plan bewust niet doet

- Geen van de 15 beleidsboek-afwijkingen van `wwso.xlsx` wordt via de brug geautomatiseerd — de
  engine blijft de bron, de xlsx niet.
- Geen automatische ranking op echte punten in de Sheet; alleen een kolom die de €650-proxy
  overschrijft waar een doorgerekend getal bestaat (doc 3 §6.5).
- Geen nieuw veld op `Ruimte`, geen migratie, geen tweede validatielaag, geen importmodus die door de
  hele app meereist.
- Geen poging de toewijzingsmatrix verder dan de diagonaal, de keuken-/sanitairdetaillering, de vijf
  extra-eisen van §2.6.2, `monument` of `verwarmd` per ruimte uit een advertentie te halen.
- Geen poging de NEN2580-vrije-hoogte-regel of de WWSO-zolderregels uit FML-data te berekenen — dat
  is uitgezocht en de data bevat het niet.
- Geen wijziging aan `prompts/PROMPT_plattegrond_kamerafmetingen.md`; de uitgebreide variant staat er
  los naast en blijft zo.
