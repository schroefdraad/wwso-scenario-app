# Briefing — brug Shortlist → Puntum, en het plattegrond-prompt

**Datum:** 2026-09-27
**Herkomst:** sessie gestart in het *andere* project (`C:\Users\Myle\Documents\Realestate Workflow`,
de funda-scraper), waar de twee plannen voor het eerst naast elkaar zijn gelegd. Analyse op Opus 5.
**Status:** **niets besloten, geen code gewijzigd in dit project.** Bewust geen planonderdeel — de
gebruiker wil dit als idee bewaren en pas bouwen als het gaandeweg uitkomt. Deze briefing bestaat
zodat een verse sessie hier vanaf kan.

Bijbehorend document aan de scraperkant:
`C:\Users\Myle\Documents\Realestate Workflow\outputs\RAPPORT_brug_puntum_blauwdruk_20260927.md`
(de volledige blauwdruk; deze briefing is de WWSO-kant + wat er sindsdien bijkwam).

---

## Vondst 1 — beide projecten plannen dezelfde brug, één kant naar een dood doel

- **Dit project**, `plan/plan.md:221` (Fase 4): *"Taak 21: Importadapter privé Shortlist Sheet —
  alleen eigen versie"*. Ook in `plan/STATUS.md:33` als fase-4-item.
- **Het scraperproject**, `plan/plan.md` Fase 8, Taak 16/17/19: Drive-structuur + script dat
  WOZ/energielabel/bouwjaar uit de Shortlist naar de `Invoer`-tab van **`wwso_template.xlsx`**
  schrijft.

Die tweede route mikt op de xlsx — die dit project al heeft vervangen. Volgens
`briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md` wijkt die xlsx op **15 punten** af van het
beleidsboek, inclusief een volledig ontbrekende rubriek 7 en een verschoven nummering vanaf R7.
Fase 8 zou dus automatiseren wat aantoonbaar minder correct is dan de golden-master-gevalideerde
engine hier.

Taak 18 van dat project (plattegrond-interpretatie) is **niet** achterhaald, alleen verkeerd
gericht: die levert precies `ruimtes[]`, maar schrijft nu naar een xlsx-tab.

**Consequentie voor Taak 21 hier:** die is deels al opgelost, zie hieronder.

---

## Vondst 2 — Taak 21 is voor ~70% al gedekt door data die de scraper nu al ophaalt

`PandInvoer.pand` heeft 10 velden (zie `packages/engine/src/fixtures/testpand-6kamers.ts:12-25`).
De scraper levert er nu al 6-7 van:

| `PandInvoer.pand` | scraper |
|---|---|
| `adres`, `stad` | ✅ (`stad` is op 2026-09-27 toegevoegd aan de scraper) |
| `wozWaarde` | ✅ Kadaster wozwaardeloket-API |
| `bouwjaar` | ✅ PDOK + BAG |
| `energielabel` | ✅ |
| `aantalKamers` | ✅ |
| `coropGebied` | ⚙️ afleidbaar — `packages/data/src/geografie` doet `stad → gemeente → COROP` hier al |
| `wozPeildatum` | ⚠️ niet vastgelegd, zit wél in de Kadaster-respons |
| `wozOppervlak` | ⚠️ **ander veld** dan Funda's `woonoppervlakte_m2` — niet verwisselen |
| `monument` | ❌ niet gescraped |

Het echte gat is `ruimtes[]` (in de testfixture 20 ruimtes met `naam`, `type`, `oppervlakteM2`,
`verdieping`, `verwarmd`, `verkoeld`, plus optioneel `zolder{}` / `aantalAdressenMetToegang`).

### Reframe van de blocker

De gebruiker benoemde de kern: zonder kamer-oppervlaktes kun je niet snel invoeren. Te splitsen:

- voor **correcte punten** zijn echte m² nodig;
- voor **snel invoeren** is het *skelet* nodig (hoeveel ruimtes, welk type, welke verdieping) met
  iets om te corrigeren. 20 rijen aanmaken is het werk; 20 getallen bijstellen niet.

Funda geeft dat skelet al, in `<dt>/<dd>`-vorm op de detailpagina die de scraper **al per listing
downloadt** (`fetch_omschrijving()`, `js_render=false`) → **nul extra ZenRows-credits**. Typisch
beschikbaar: aantal slaapkamers, aantal badkamers, badkamervoorzieningen (→ R6 direct), aantal
woonlagen, externe bergruimte in m² (**exact**), gebouwgebonden buitenruimte in m² (**exact**),
verwarmingssoort, en plattegrond-URL's.

Dat krimpt het gat tot **privévertrekken + keuken + badruimte**.

---

## Vondst 3 — correctheidsgat in `prompts/PROMPT_plattegrond_kamerafmetingen.md`

Dit is het meest direct bruikbare punt en staat los van of de brug er ooit komt.

**Geverifieerd** in `packages/engine/src/rubrieken/r2-oppervlakte-overige-ruimten.ts:38-44`: een
zolder **zonder vaste trap** levert *aftrek*punten op (begrensd zodat de zolder zelf niet negatief
wordt). Het veld staat in `packages/engine/src/types/ruimte.ts:49-52` als
`ZolderKenmerken { vasteTrap, beschotenDak }`.

Gevolg: `"Zolder 18 m²"` — gedrukt label, door de prompt gelabeld als **hoog vertrouwen** — kan de
telling de *verkeerde kant op* duwen zolang `vasteTrap` niet meekomt. De prompt vraagt daar nu
nergens naar, terwijl een plattegrond dit meestal letterlijk toont (vaste trap versus luik of
vlizotrap).

### Vier voorgestelde wijzigingen aan die prompt

1. **`vasteTrap` + `beschotenDak` uitlezen** bij elke zolder/vlieringruimte. Dekt de sign-flip.
2. **`verdieping` toevoegen aan de outputtabel.** Het veld bestaat, R2 gebruikt het, en de
   plattegrond geeft het gratis (één tekening per laag, of gelabeld). Nu moet de gebruiker het
   opnieuw afleiden tijdens het overtypen.
3. **De vertrouwenskolom splitsen in twee assen.** "Hoog" betekent nu *"ik heb het getal goed
   gelezen"*. Het betekent níet *"dit getal is geldig voor rubriek 1/2"*. NEN2580-gebruiksoppervlakte
   en de WWSO-meetbasis lopen niet overal gelijk — de al openstaande R1-vraag (één-staps versus
   tweestaps m²-afronding, zie STATUS.md "Aandachtspunten") zit op diezelfde as.
4. **De totaalcheck een echt anker geven.** De prompt laat het aftoetsen nu aan de gebruiker ("als
   hij dat heeft"). De workflow *heeft* een getal: `woonoppervlakte_m2` uit de scraper. Dat als
   gegeven meegeven laat de prompt de check zelf doen. Expliciet benoemen welke basis je meegeeft —
   Funda's woonoppervlakte is niet hetzelfde als `wozOppervlak`.

### Ontwerpvoorstel: additief, geen herschrijving

De bestaande rationale ("de menselijke overtype-stap is een ingebouwde controle") klopt, maar
overtypen is óók een foutbron: 20 getallen met de hand overzetten introduceert eigen vergissingen.
De controle die je wilt is **review**, niet **retype**.

Daarom: de prompt niet herschrijven maar *uitbreiden*. De bestaande tabel blijft (werkt vandaag,
zonder brug), en daaronder een additioneel machine-leesbaar blok waarin `bron` en `vertrouwen` per
ruimte bewaard blijven. Komt de brug er, dan toont de app die kolommen op een expliciet
bevestigscherm — controle behouden, typefouten weg. Komt de brug er niet, dan negeer je dat blok.
Eén prompt, beide werelden, geen fork.

Nog niet uitgewerkt. Voorstel was om de uitgebreide versie **naast** het bestaande bestand te zetten
(niet erover heen), zodat er gedift kan worden.

---

## Wat er in de blauwdruk fout stond (niet overnemen)

De eerste versie van het RAPPORT stelde een fallback voor: geen plattegrond → totaal-m² minus de
bekende ruimtes, verdeeld over het kameraantal (18 m²/kamer, de aanname die de Apps Script van de
scraper zelf gebruikt in `=FLOOR(E{r}/18;1)`).

Dat is precies wat `PROMPT_plattegrond_kamerafmetingen.md` expliciet verbiedt: *"Gebruik nooit een
generieke aanname ('een slaapkamer is meestal 12 m²') als vervanging voor een echte meting — ook
niet als fallback."* Die regel is de juiste; een verdeeld gemiddelde dat als per-kamer-getal een
huurprijs in gaat is valse precisie met juridische lading. Het RAPPORT is hierop gecorrigeerd.

---

## Harde ontwerpeis als de brug er komt

Elke geschatte m² moet zichtbaar geschat blijven. Dit project rekent consequent geen gegokte getallen
door (Tussenfase-taak C: zonder ingevulde kosten blijven Investering/TVT expliciet `null` i.p.v.
€0). Een geschatte m² die stil een maximale huurprijs oplevert is dezelfde fout, met een huurcontract
als gevolg.

Voorstel: `m2Geschat`-vlag per ruimte plus een **vijfde controle** naast de bestaande vier, die rood
blijft zolang er geschatte m² in de berekening zitten.

**Adapter hoort hier, niet in de scraper:** dit project bezit het `PandInvoer`-Zod-schema. Python een
`PandInvoer`-vormige JSON laten schrijven dupliceert dat schema in een taal die het niet kan
valideren → drift. Dat is dezelfde faalcategorie die dit project al twee keer raakte
(`Keuken.verwarmd` 2026-09-04, `toiletType` v0.7.16→v0.7.17). De scraper blijft dom en levert ruwe
velden; Puntum mapt en valideert.

**Handoff:** Taak 21 zegt expliciet "alleen eigen versie", dus geen Google-auth in Puntum/Vercel
bouwen (nieuwe secret-rotatie, nieuwe faalmodus). Paste/upload van de JSON die de scraper al naar
Drive zet is genoeg. Optioneel later een Apps Script-menu-item ("Kopieer voor Puntum") met een
`HtmlService`-dialoog — past in het bestaande Sheet-knoppenpatroon, nul nieuwe infra.

---

## Nog niet geverifieerd

- **Of Funda's `<dt>/<dd>`-kenmerkenblokken ook zonder `js_render` in de HTML zitten.** De
  omschrijving-selector (`section.whitespace-pre-wrap`) werkt wél met `js_render=false` en staat op
  dezelfde SSR-pagina, dus waarschijnlijk ja — maar dit is een aanname. Te testen met één
  `--limit 1`-run met debug-print aan de scraperkant.
- De exacte labelteksten van die kenmerken (de voorbeelden hierboven zijn typisch, geen
  gecontroleerde veldnamen).
- Of plattegrond-URL's in de HTML staan of pas na JS-rendering verschijnen.

---

## Mogelijke vervolgstappen (geen volgorde afgesproken)

1. **Prompt uitbreiden** (klein, direct nut, onafhankelijk van de brug) — de vier wijzigingen
   hierboven, als variant naast het bestaande bestand.
2. **Fase A aan de scraperkant** — kenmerken + plattegrond-URL's uit de al-gedownloade detailpagina.
   Gratis qua credits, maar eerst de verificatie hierboven.
3. **Taak 21 herschrijven** in `plan/plan.md` met de wetenschap dat de pand-velden al grotendeels
   bestaan en het gat `ruimtes[]` is — nu staat er alleen "importadapter privé Shortlist Sheet".
4. **Losse bijvangst:** de Shortlist rankt nu op `=(650*max_kamers*12)/(vraagprijs+30000)*100` —
   €650/kamer plat geraden. Puntum berekent de werkelijke maximale huur. Dat terugkoppelen vervangt
   een gok door een gevalideerde waarde in de acquisitie-funnel. Staat los van de brug.

**Blokkade-context:** Fase 4 (en dus Taak 21) staat hier on hold achter het
tussenfase-exitcriterium. Punt 1 en 4 hierboven vallen daar buiten.
