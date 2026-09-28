# Brug Shortlist → Puntum — uitgewerkte workflow en automatiseringswinst

**Datum:** 2026-09-27
**Status:** ontwerp, **geen code gewijzigd, geen planonderdeel.** Uitwerking van
`briefings/BRIEFING_brug_shortlist_puntum_2026-09-27.md` en
`C:\Users\Myle\Documents\Realestate Workflow\outputs\RAPPORT_brug_puntum_blauwdruk_20260927.md`.
**Blokkade-context ongewijzigd:** Taak 21 zit in Fase 4, on hold achter het tussenfase-exitcriterium.
Onderdelen die daar buiten vallen zijn hieronder expliciet gemarkeerd met **[nu mogelijk]**.

Alles in dit document is tegen de code gecontroleerd, niet aangenomen; bestandsverwijzingen staan
erbij zodat elke claim na te lopen is.

**Openstaand, bevestigd door de gebruiker (2026-09-27), nog niet gebouwd:**
- [ ] Bulkactie "markeer alle vertrekken verwarmd/verkoeld" (§6.1, N2)
- [ ] Prompt-uitbreiding `PROMPT_plattegrond_kamerafmetingen.md` — `vasteTrap`/`beschotenDak`/
      `verdieping`/twee vertrouwensassen/machine-leesbaar blok (§5)

**Nadien gecorrigeerd:** `SCAFFOLD_PRIVEVERTREKKEN` (privévertrek-skelet) en het all-kamers-default
op `RUIMTE_TOEGEVOEGD` bestaan al (`reducer.ts`) — het oorspronkelijke N1-voorstel was dus grotendeels
overbodig. Schaalcorrectie: echte panden hebben max. ~7-8 privévertrekken, niet 20 (zie memory
`wwso-schaal-kleine-panden`) — dat verkleint de marginale winst van #2/#3/#4 t.o.v. de oorspronkelijke
aanname, los van bouwkosten.

**Herziening (2026-09-27, zelfde dag): bouwuren ≠ interactie-uren.** De eerdere "te veel tijd"-
afweging voor fase A/B/C ging over tijdsinvestering van de gebruiker, niet over Claude's bouwuren.
Kan een groot deel zelfstandig gebouwd + browsergeverifieerd worden (bestaand patroon in dit project,
zie STATUS.md-sessies), dan vervalt het volume/terugverdien-argument (80-100 panden) grotendeels — dat
gold specifiek tegen de aanname dat bouwtijd = gebruikerstijd. Twee dingen blijven wél staan, ongeacht
wie/wanneer bouwt: (1) fase A hoort in het andere project (`Realestate Workflow`, eigen `plan.md`),
niet hier; (2) de afhankelijkheid van Funda's HTML-structuur is permanent fragiel — dat risico daalt
niet met meer bouwuren, het is de aard van scrapen. Bij 2 gebruikers (alleen Emma en de gebruiker
hebben toegang tot de scraper) is dat risico aanvaardbaar.

**Herziene volgorde, uitgaand van grote zelfstandige bouwlappen + korte overdag-syncs:**
1. Verificatierun fase A (klein, in de scraperrepo, zelfstandig te doen) — zie §6.2/§8.
2. Fase B (Puntum: importadapter + reviewscherm, §6.3) — grootste brok, goede kandidaat voor een lange
   zelfstandige sessie met browserverificatie, gevolgd door een korte gezamenlijke check.
3. Fase C (plattegrond-JSON-blok, §5) — meest correctheidsgevoelig (geschatte m² in een huurprijs),
   hier wél een interactieve verificatieronde, niet puur autonoom wegzetten.
4. #2/#3/#4 ergens tussendoor, klein genoeg om niet apart te plannen.

Nog steeds: **niets hiervan is besloten of gestart.** Dit is de volgorde-voorkeur zodra de gebruiker
besluit dat de brug daadwerkelijk gebouwd wordt.

---

## 1. Twee correcties op de datamatch uit de blauwdruk

### 1.1 `aantalKamers` is géén match — zelfde valkuil als `wozOppervlak`

De blauwdruk zet `aantalKamers` op ✅ ("scraper levert het al"). Dat is onjuist en het is precies de
fout-categorie die de blauwdruk zelf één rij lager benoemt (`wozOppervlak` ≠ Funda's
`woonoppervlakte_m2`).

- Funda's `aantal_kamers` = **vertrekken in het huis**, woonkamer meegerekend ("4 kamers
  (3 slaapkamers)"). In `funda_results.json` staat bij een woning van 114 m²: `"aantal_kamers": 3`.
- `Pand.aantalKamers` (`packages/engine/src/types/pand.ts:77`, `min(1).max(12)`) = het aantal
  **onzelfstandige wooneenheden**, de K1..K12 van de toewijzingsmatrix
  (`packages/engine/src/types/toewijzing.ts:3-5`). Het is de deler bij R8/R9/R10 en bepaalt voor
  hoeveel huurders er een aparte puntentelling uitkomt.

Die twee zijn hoogstens toevallig gelijk. Erger: dit veld doorrekent stil verkeerd — een te hoge
`aantalKamers` verdunt gedeelde ruimten over te veel eenheden, een te lage concentreert ze. Geen
Zod-fout, geen waarschuwing, gewoon een andere huurprijs.

**Conclusie:** de adapter mag `aantal_kamers` nooit naar `Pand.aantalKamers` schrijven. Het aantal
kamers is een **exploitatiekeuze van de gebruiker**, geen pandfeit. Wél bruikbaar als *bovengrens-hint*
op het reviewscherm: "Funda meldt 3 vertrekken waarvan 2 slaapkamers — hoeveel kamers ga je verhuren?"

Dit is de kern van een breder punt, zie §2.

### 1.2 `wozPeildatum` is een documentatieveld, geen rekenveld — deprioriteren

De briefing noemt het vastleggen van `wozPeildatum` (zit al in de Kadaster-respons) als ⚠ gat.
Grep-geverifieerd: `wozPeildatum` komt buiten `types/pand.ts:50` alleen voor in fixtures en tests —
**geen enkele rubriek leest het.** De hardcoded default `'2025-01-01'`
(`apps/web/src/lib/invoer/types.ts`, `NIEUW_PAND_VELDEN`) verjaart dus stil, maar verandert geen
uitkomst.

**Conclusie:** scraperwerk hiervoor is laagste prioriteit. Het veld is een kandidaat voor dezelfde
dode-velden-audit die eerder `soortWoning` en `aantalWoningenInComplex` opruimde (sessie 2026-09-05) —
apart te beoordelen, want het heeft wel documentatiewaarde bij R11.

---

## 2. De scheidslijn die het hele ontwerp bepaalt: gebouw versus exploitatie

De shortlist bestaat uit **koopwoningen** (vraagprijs, gezinsindeling). De WWSO-invoer beschrijft een
**verhuurconfiguratie die nog niet bestaat**. Daar loopt de grens van wat een brug ooit kan leveren:

| Soort gegeven | Voorbeeld | Bron mogelijk? |
|---|---|---|
| **Pandfeit** | WOZ, bouwjaar, energielabel, adres, gevelbreedte, bergruimte in m² | ✅ scraper/Kadaster/BAG |
| **Gebouwfeit** | 3 slaapkamers, 1 badkamer, 2 woonlagen + zolder, m² per ruimte | ✅ Funda-kenmerken + plattegrond |
| **Exploitatiekeuze** | hoeveel kamers verhuur je, wie krijgt toegang tot welke ruimte, wordt de woonkamer kamer 7, komt er een kitchenette bij | ❌ nooit — dat is het werk van de gebruiker |
| **Fysieke voorziening-eis** | waterdichte wandafwerking, vrije hoogte >2 m over de helft, aanrechtblad ≥1 m in één stuk | ❌ staat niet op Funda, is een inspectiefeit |

De brug kan dus de eerste twee rijen vullen en moet van de laatste twee afblijven. Dat is geen
beperking om weg te werken maar de reden dat de import een **versneller** is en geen invuller.

**Gevolg voor de verwachting:** na een volledig gebouwde brug (fase A+B+C) blijft de keuken- en
sanitairdetaillering (§2.5/§2.6, ~20 velden per keuken en per badruimte,
`apps/web/src/lib/invoer/ladeDefaults.ts`) plus de hele toewijzingsmatrix handwerk. Ruwe verhouding
voor het 6-kamer-testpand (20 ruimtes): ~300 invoerhandelingen totaal, waarvan de brug er ~70 wegneemt
en de plattegrond-fase nog ~20 getallen. De grootste tijdwinst zit dus **niet** in de brug, zie §6.1.

---

## 3. Architectuurbesluit: de import landt in `InvoerState`, niet in `PandInvoer`

Dit is het belangrijkste technische besluit en het maakt twee ontwerpvragen uit de briefing overbodig.

Het invoerscherm heeft een eigen, **gedenormaliseerde en string-gebaseerde** state
(`apps/web/src/lib/invoer/types.ts`: `InvoerState`, `PandVeldenState`, `RuimteRij`) waarin elk veld
leeg mag zijn. `projecteerNaarPandInvoer` (`lib/invoer/projecteer.ts`) zet die om naar het echte
`PandInvoer`-Zod-model, en `ontbrekendeStap()` (`projecteer.ts:136-147`) houdt "Doorrekenen"
uitgeschakeld zolang dat niet lukt — inclusief een per-ruimte-melding
`Ruimte N: vul naam en oppervlakte in` en, via `pandInvoerValidatiefout`, elke Zod-fout uit het
volledige schema.

**De adapter schrijft dus naar `InvoerState`.** Niet naar `PandInvoer`, niet naar Supabase, niet naar
een nieuw importmodel.

Drie gevolgen:

1. **Geen tweede validatielaag.** De bestaande poort is de enige poort. Een half gevulde import is
   simpelweg een half ingevuld invoerscherm — een toestand die de app al jaren correct afhandelt
   (concept-autosave, waarschuwingen, geblokkeerde knop).
2. **`m2Geschat` en de "vijfde controle" uit de briefing zijn niet nodig.** Zie §4.
3. **Geen nieuw veld op opgeslagen data.** Dat is precies de incidentklasse die dit project twee keer
   raakte (`Keuken.verwarmd` 2026-09-04, `toiletType` v0.7.16 → v0.7.17). `InvoerState` is
   sessiestate, geen Supabase-schema — een importveld daarin kan nooit het laden van een bestaande
   woning breken.

Er bestaat al een precedent-functie in exact deze vorm: `pandInvoerNaarState` in
`lib/invoer/vanPandInvoer.ts` (laadt een opgeslagen deal terug in het formulier). De adapter is daar
de broer van: `lib/invoer/vanImport.ts`.

---

## 4. Waarom "nooit gokken" hier goedkoper uitvalt dan de briefing dacht

De briefing stelt een harde ontwerpeis: elke geschatte m² moet zichtbaar geschat blijven, via een
`m2Geschat`-vlag per ruimte plus een vijfde controle die rood blijft. Die eis is juist; de voorgestelde
implementatie is duurder én zwakker dan nodig.

Zwakker, omdat een rode controle betekent dat je **wél** hebt doorgerekend met een gegokt getal — de
huurprijs staat dan al op het scherm en in de PDF, met een waarschuwing ernaast. Duurder, omdat het een
nieuw veld op het ruimtemodel vraagt.

Het alternatief gebruikt wat er al staat:

| Herkomst van een m² | Wat de import doet | Wat de app dan doet |
|---|---|---|
| Gedrukt m²-label op de plattegrond | vult in | rekent door |
| Maatlijnen (l × b, rechthoekig) | vult in, meting in het reviewlog | rekent door |
| Funda "externe bergruimte: 6 m²" / "gebouwgebonden buitenruimte: 8 m²" | vult in (exact opgegeven) | rekent door |
| Visuele schatting t.o.v. een referentie | **vult niet in** — toont het getal grijs op het reviewscherm met een knop "neem over" per rij | blokkeert "Doorrekenen" tot de gebruiker per rij overneemt |
| Geen enkele aanwijzing | laat leeg | blokkeert "Doorrekenen" |

Een geschat getal komt dus nooit stil in de motor: het vergt één expliciete klik per rij, en die klik is
precies de menselijke controle die de bestaande prompt met "overtypen" bedoelde — maar zonder de
typefouten die overtypen zelf introduceert.

**Kosten: nul schemawijzigingen.** Het `bron`/`vertrouwen`-paar leeft alleen in het importlog (§5),
niet in `Ruimte`.

### Eén bestaande UI-grens die de import raakt

`Waarschuwingen.tsx:19` kapt de lijst af op `.slice(0, 8)`. Een verse import van 20 ruimtes zonder
toewijzing produceert 20 + n waarschuwingen (`afgeleide-staat.ts:9-34` waarschuwt terecht per
niet-toegewezen ruimte én per kamer zonder keuken/badruimte) — waarvan je er dan 8 ziet. Te fixen met
een groepering ("12 ruimtes zijn nog aan geen kamer toegewezen") of een hogere cap. Klein, maar het
moet in dezelfde taak mee, anders voelt de import onbetrouwbaar terwijl de logica klopt.

---

## 5. De workflow, end-to-end

Vier rollen: **scraper** (Python, privé, GitHub Actions), **Drive/Sheet** (bestaande shortlist),
**Claude-chat** (losse plattegrond-prompt), **Puntum** (de app). Geen nieuwe infrastructuur, geen
Google-auth in Puntum.

```
[1] scraper (bestaand, nachtelijk)
     └─ Funda-zoekpagina → listings → per listing: detailpagina (js_render=false)
        + Kadaster WOZ + PDOK/BAG bouwjaar
        NIEUW (fase A): kenmerken-<dt>/<dd> + plattegrond-URL's uit dezelfde download
     └─ schrijft funda_results.json → Drive + Sheet-import (bestaand)

[2] gebruiker beoordeelt de shortlist in de Sheet (bestaand)
     └─ kiest één pand om door te rekenen
     └─ Apps Script-menu "Kopieer voor Puntum" → HtmlService-dialoog met de rij als JSON
        (optioneel; anders het JSON-bestand uit Drive openen en kopiëren)
        ⚠ OPENSTAAND (zie §8, punt 7): welke van de twee? De Sheet-rij is een afgeleide voor de
        ranking, niet de volledige scraper-output — zie hieronder.

[3] Puntum → /woning/importeren   ← NIEUW, afgeschermd (§7)
     └─ plak-veld: JSON in
     └─ REVIEWSCHERM:
         ├─ pandvelden, elk met herkomst ("WOZ € 312.000 — Kadaster, 2026-09-14")
         ├─ ontbrekend/afgeleid expliciet: COROP afgeleid uit stad, of leeg bij meerdere gemeentes
         ├─ ruimte-skelet voorstel: N × Privévertrek, keuken, badruimte, toilet, verkeersruimte,
         │  berging (6 m², exact), buitenruimte (8 m², exact)
         ├─ VRAAG, niet ingevuld: "hoeveel kamers ga je verhuren?" (§1.1)
         └─ knop "Overnemen in invoerscherm"

[4] optioneel, fase C — plattegrond
     └─ Drive /plattegronden/[adres]/ (scraper-taak 16) of de Funda-plattegrond-URL
     └─ losse Claude-chat met PROMPT_plattegrond_kamerafmetingen.md (uitgebreide variant)
     └─ output: bestaande tabel voor mensen + NIEUW een ```json-blok
     └─ tweede plak-veld op hetzelfde reviewscherm → m² per ruimte, per rij te accepteren

[5] /woning/nieuw — het normale invoerscherm, nu voorgevuld
     └─ gebruiker doet wat alleen de gebruiker kan: kamers toewijzen (K1-K12),
        keuken/sanitair detailleren, verwarmd/verkoeld zetten
     └─ waarschuwingen en "Doorrekenen"-blokkade werken ongewijzigd

[6] doorrekenen → resultaat → PDF (bestaand)
     └─ NIEUW, los van de brug: knop "Kopieer voor Shortlist" met de max. jaarhuur AS-IS
     └─ gebruiker plakt dat in een nieuwe Sheet-kolom, die de €650-gok overschrijft waar aanwezig
```

Het reviewscherm is het enige nieuwe scherm en het enige plek waar herkomst en vertrouwen bestaan.
Zodra de gebruiker "Overnemen" kiest, is het een gewone invoersessie — geen aparte importmodus die
overal in de app meegesleept moet worden. Dat is bewust: de app heeft twee keer geleerd hoe duur een
tweede parallel pad is (de gedeelde-checkboxtabel vs. "handmatig bewerken", v0.7.0; `ScenarioSlot` met
twee elkaar uitsluitende soorten, v0.7.3).

### Machine-leesbaar blok voor de plattegrond-prompt (nog niet uitgewerkt in de briefing)

Additief onder de bestaande tabel, zodat de prompt zonder brug onveranderd bruikbaar blijft:

```json
{
  "totaalcheck": { "somRuimtes": 96.4, "opgegevenReferentie": 114, "referentieBron": "Funda woonoppervlakte" },
  "ruimtes": [
    { "naam": "Woonkamer", "voorgesteldType": "Privévertrek", "oppervlakteM2": 24.3,
      "verdieping": 0, "meetbasis": "gedrukt label", "leesVertrouwen": "hoog" },
    { "naam": "Slaapkamer 1", "voorgesteldType": "Privévertrek", "oppervlakteM2": 12.1,
      "verdieping": 1, "meetbasis": "maatlijnen 3,65 × 3,32", "leesVertrouwen": "hoog" },
    { "naam": "Zolder", "voorgesteldType": "Overige ruimte", "oppervlakteM2": 18.0,
      "verdieping": 2, "meetbasis": "gedrukt label", "leesVertrouwen": "hoog",
      "zolder": { "vasteTrap": false, "beschotenDak": true } },
    { "naam": "Berging", "voorgesteldType": "Berging", "oppervlakteM2": null,
      "verdieping": 0, "meetbasis": "visuele schatting t.o.v. woonkamer", "leesVertrouwen": "laag",
      "schattingM2": 4.0 }
  ]
}
```

Vier dingen die dit expliciet regelt, conform de briefing:

1. **`zolder.vasteTrap` / `beschotenDak`** — zonder deze twee kan een correct gelezen "Zolder 18 m²"
   de telling de verkeerde kant op duwen: §2.2.2.3 geeft een zolder zonder vaste trap **5
   aftrekpunten** (`packages/engine/src/rubrieken/r2-oppervlakte-overige-ruimten.ts:38-44`,
   `types/ruimte.ts:49-52`). Een plattegrond toont dit meestal letterlijk.
2. **`verdieping`** — bestaat al in `Ruimte`, wordt door R2 gebruikt, en staat gratis op de tekening.
3. **Twee vertrouwensassen**: `leesVertrouwen` (heb ik het getal goed gelezen) en `meetbasis` (waar komt
   het getal vandaan). "Hoog" op de eerste as zegt niets over de tweede — NEN2580-gebruiksoppervlakte
   en de WWSO-meetbasis lopen niet overal gelijk, en de openstaande R1-vraag (één- versus tweestaps
   m²-afronding, zie STATUS.md "Aandachtspunten") zit op diezelfde as.
4. **`oppervlakteM2: null` + `schattingM2`** — een laag-vertrouwen-getal komt in een apart veld, zodat
   de importer het nooit per ongeluk als waarde behandelt (§4).

---

## 6. Automatiseringswinst, gerangschikt

### 6.1 Wat nu al kan, zónder brug en zonder Fase 4 **[nu mogelijk]**

Dit is de verrassing van deze uitwerking: het grootste deel van de "snel invoeren"-winst hangt niet aan
de scraper. Deze drie zijn niet privé, niet Fase 4, en helpen Steven en Emma net zo goed.

| # | Automatisering | Neemt weg | Kosten | Risico |
|---|---|---|---|---|
| **N1** | **Skelet-preset "N kamers, gedeelde voorzieningen"** — één dialoog: aantal kamers + vinkjes voor gedeelde keuken/badruimte/toilet/verkeersruimte/berging. Genereert N × Privévertrek met de diagonale toewijzing (kamer *k* → privévertrek *k*) plus de gedeelde rijen, allemaal met **lege m²**. | ~60 handelingen: rij toevoegen, type kiezen, naam typen, en de N eenduidige toewijzingsvinkjes | klein — één dialoog + een reducer-actie naast de bestaande `RUIMTE_TOEVOEGEN` | laag; er wordt niets over het pand aangenomen, de gebruiker kiest de configuratie. De diagonaal is geen gok maar de letterlijke betekenis van "N kamers" |
| **N2** | **Bulkactie "markeer alle vertrekken verwarmd"** (en verkoeld) | 20 × 2 vinkjes | zeer klein | laag, mits het een expliciete actie blijft en geen default |
| **N3** | **Waarschuwingslijst groeperen** i.p.v. `.slice(0, 8)` (`Waarschuwingen.tsx:19`) | niets qua tijd, maar voorkomt dat 12 stille niet-toegewezen ruimtes onzichtbaar blijven | zeer klein | — |

N1 is de belangrijkste van het hele document. Het levert het "skelet" waar de blauwdruk de scraper voor
nodig dachtte te hebben, voor élk pand, direct, en het is bovendien precies wat de import in stap [3]
intern zou aanroepen. Bouw je N1 eerst, dan is de import-adapter later alleen nog "vul dit dialoog
voor".

Bestaand en al goed: **ruimte kopiëren neemt de m² en voorzieningen mee** (v0.7.6) — dat dekt de
repetitieve keuken/sanitair-detaillering van identieke kamers al. Geen extra automatisering nodig;
eerder een gidspunt ("vul kamer 1 volledig in, kopieer dan 5 keer").

### 6.2 Brug fase A — scraperkant, gratis qua credits

| # | Automatisering | Levert | Kosten | Verificatie eerst |
|---|---|---|---|---|
| **A1** | Kenmerken-`<dt>/<dd>` uit de al gedownloade detailpagina | slaapkamers, badkamers, badkamervoorzieningen, woonlagen, **externe bergruimte in m² (exact)**, **gebouwgebonden buitenruimte in m² (exact)**, verwarmingssoort | klein | ⚠ zie hieronder |
| **A2** | Plattegrond-URL's uit dezelfde HTML | input voor fase C zonder handmatig zoeken | klein | ⚠ idem |
| **A3** | `wozPeildatum` uit de Kadaster-respons | documentatie | klein | — (laagste prioriteit, §1.2) |

**De aanname is nog steeds niet bevestigd, en de code geeft eerder een tegenindicatie dan steun.** De
scraper heeft al een `<dt>/<dd>`-walker, maar die staat in `fetch_funda_woz`
(`scripts/main.py:435`) en draait op een fetch met **`js_render=true`** (`:411`).
`fetch_omschrijving` is de enige `js_render=false`-fetch (`:347`) en gebruikt een CSS-selector, geen
`dt`/`dd`. Er is dus nul bewijs dat de kenmerkenblokken in de SSR-HTML zitten. Eén `--limit 1`-run met
een debug-dump beslist dit; valt het negatief uit, dan kost A1 wél credits en verschuift de
kosten/baten-afweging.

### 6.3 Brug fase B — Puntum-kant, het echte werk

| # | Onderdeel | Omvang |
|---|---|---|
| **B1** | `lib/invoer/vanImport.ts` — ruwe scraper-JSON → `InvoerState`; adres/postcode/stad splitsen (het `adres`-veld bevat nu "Kromhoutstraat 20 3067 AE Rotterdam"), `wozWaarde` als optioneel behandelen (staat in de steekproef 3× op `null`), COROP afleiden via `packages/data/src/geografie` en **leeg laten bij meerdere gemeente-kandidaten** — de bestaande stad→gemeente-suggestie draait op `onBlur` en is er niet bij een import, en ~20% van de plaatsnamen is een prefix van een andere (bug van 2026-09-19) | middel |
| **B2** | `/woning/importeren` + reviewscherm met herkomst per veld | middel |
| **B3** | Een Zod-schema voor het *scraper*-formaat (los van `PandInvoer`) zodat een verouderd JSON-bestand een nette melding geeft in plaats van een halve import | klein |
| **B4** | Provenance: `funda_id`, `detail_url`, `vraagprijs` en `scraped_at` in het notitieveld; `funda_id` ook als dedupe-check tegen bestaande woningen | klein |

**Waarom de adapter hier hoort en niet in Python:** Puntum bezit het Zod-schema. Python een
`PandInvoer`-vormige JSON laten schrijven dupliceert dat schema in een taal die het niet kan valideren →
drift. De scraper blijft dom en levert ruwe velden.

Eén review-item dat het scherm móet tonen: **ontbrekende WOZ zonder taxatiewaarde is een stille
onderwaardering** — R11 valt dan terug op het minimum van 10 punten waar een echte WOZ er 12-14 geeft
(§2.11.1, `types/pand.ts:45-52`). Geen Zod-fout, geen bestaande waarschuwing, en in de steekproef is
`woz_waarde` op alle drie de listings `null`.

### 6.4 Brug fase C — plattegrond-m²

Grootste correctheidswinst (R1/R2 hangen volledig aan m², en R2 heeft nu geen empirische dekking in de
golden master — zie STATUS.md), hoogste risico. Vergt de prompt-uitbreiding uit §5 plus het tweede
plak-veld. Losstaand bruikbaar: **de prompt-uitbreiding zelf is nu al zinvol** — de
`vasteTrap`-omissie is een echt correctheidsgat in de huidige prompt, ongeacht of de brug er komt.
**[nu mogelijk]**

### 6.5 Terugkoppeling naar de acquisitie-funnel — los van de brug

De Sheet rankt op `=(650*max_kamers*12)/(vraagprijs+30000)*100`: €650 per kamer, plat geraden.

Realistische verwachting: de brug maakt doorrekenen sneller, niet gratis — je rekent een handvol
panden door, niet 125. Dus **niet** "automatische ranking op echte punten", maar:

- knop "Kopieer voor Shortlist" op het resultaatscherm (max. jaarhuur AS-IS + punten per kamer);
- één nieuwe Sheet-kolom die, indien gevuld, de €650-proxy overschrijft in de rankingformule.

Kosten: een copy-knop en een formulewijziging. Winst: de panden waar je echt in geïnteresseerd bent
worden gerankt op een gevalideerd getal in plaats van een gok, zonder dat de proxy voor de rest
verdwijnt. **[nu mogelijk]** aan de Sheet-kant; de copy-knop is een kleine app-wijziging.

### 6.6 Wat we bewust niet automatiseren

- **De toewijzingsmatrix, verder dan de diagonaal.** Het golden-master-testpand toont waarom: van de 20
  ruimtes hebben 7 álle zes kamers, maar ruimte 8/9/10 hebben `[1,2,3]` of `[4,5,6]` (per verdieping)
  en ruimte 11/14/20 hebben paren (`packages/engine/src/fixtures/testpand-6kamers.ts:48-69`). Een
  default "gedeeld = alle kamers" zou in dit reële pand ruwweg de helft van de gedeelde rijen fout
  zetten — en fout de *verkeerde* kant op, want te veel delers verlaagt de punten stil.
- **De vijf extra-eisen van §2.6.2 en de keuken-basiseisen van §2.5.** Funda's
  "badkamervoorzieningen: douche, wastafel" rechtvaardigt douche/wastafel aanvinken; waterdichte
  wandafwerking en vrije hoogte >2 m zijn inspectiefeiten die geen advertentie meldt.
- **`verwarmd` per ruimte uit "verwarming: c.v.-ketel".** Een c.v. in het pand zegt niet welke ruimte
  een radiator heeft. Wel: de kenmerk-tekst als notitie op het reviewscherm tonen, en N2 (§6.1)
  aanbieden.
- **`monument`.** Niet gescraped en niet betrouwbaar uit een advertentie; een rijksmonument verandert
  bovendien de hele opslagsystematiek (§2.14.3) — dat wil je niet uit een blurb.
- **Automatisch ophalen uit Drive/Sheet door Puntum.** Zie §7.

---

## 7. Afscherming — de scraper is privé

De scraper, de shortlist en de Drive-structuur zijn privé; de import hoort dus niet zichtbaar te zijn
voor Steven, Emma of latere gebruikers. Twee dingen los van elkaar houden:

**Er valt hier geen geheim te lekken, en dat is een ontwerpkeuze, geen toeval.** Omdat de adapter
puur in de browser op geplakte JSON werkt (§3), is er geen server-endpoint, geen Google-token, geen
ZenRows-key en geen Drive-scope in Puntum. Puntum praat nooit met de scraperinfrastructuur. Afschermen
is daarmee een kwestie van **zichtbaarheid en verwachting**, niet van toegangscontrole — en dat is
precies waarom de blauwdruk paste/upload koos boven een Drive-koppeling. Zou fase D ("Puntum haalt het
JSON zelf op") ooit gebouwd worden, dan verandert dat: dan is er een secret, een rotatieplicht en een
nieuwe faalmodus, en wordt de afscherming echte access control. Dat is de reden om fase D niet te doen.

**Mechanisme, aanhakend op de multi-tenant-stap die toch al de eerstvolgende is.** Nu een los
flag-systeem bouwen is verspilling; de infrastructuur komt er sowieso:

- `allowed_emails` (`supabase/migrations/0002_auth_allowlist.sql`) heeft al `email` + `org_id` met RLS
  waarin een gebruiker alleen de eigen rij leest, en `huidige_org_id()` als `security definer`-helper.
- Voeg bij de multi-tenant-taak één kolom toe: `features text[] not null default '{}'`. De eigen org
  krijgt `{'import'}`. De client leest de eigen rij (mag hij al) en verbergt de route en de knop als
  `import` ontbreekt.
- Geen aparte tabel, geen env-var-allowlist die naast de database gaat verjaren, geen nieuwe
  RLS-policy.

**Wel expliciet vastleggen:** zolang de auth-toggle open staat (STATUS.md, "Openstaande beslissingen")
is er geen sessie om op te gateen. De import-feature kan dus pas na het dichtzetten van die toggle
zinvol afgeschermd worden — een extra reden waarom dit ná de tussenfase hoort, niet ervoor.

---

## 8. Nog te verifiëren

Uit de briefing, nog open:

1. Zitten de `<dt>/<dd>`-kenmerkenblokken in de HTML **zonder** `js_render`? Zie §6.2 — er is nu een
   tegenindicatie. Eén `--limit 1`-run met debug-dump beslist het.
2. De exacte labelteksten van die kenmerken (de voorbeelden in de blauwdruk zijn typisch, geen
   gecontroleerde veldnamen).
3. Staan plattegrond-URL's in de HTML of pas na JS-rendering?

Nieuw, uit deze uitwerking:

4. Levert de huidige scraper `stad` als aparte kolom (Fase-10-taak 21 zegt ja; de steekproef
   `funda_results.json` van 2026-05-03 heeft alleen het samengestelde `adres`)? Bepaalt of B1 moet
   splitsen of alleen mappen.
5. Hoe vaak is `woz_waarde` in de praktijk `null`? In de steekproef 3 van 3. Bij een hoog
   nulpercentage is de WOZ-review-melding (§6.3) geen randgeval maar de normale gang van zaken.
6. Geeft Funda "externe bergruimte" / "gebouwgebonden buitenruimte" ook als er géén is, of ontbreekt
   het label dan? Bepaalt of de adapter een berging-rij mag weglaten of juist leeg moet aanbieden.

Nieuw, ingebracht door de gebruiker (2026-09-27) tijdens het doorlezen van dit rapport:

7. **Bron van de JSON in stap [2] niet vastgelegd — en de twee opties zijn niet gelijkwaardig.**
   De workflow (§5, stap 2) noemt twee mogelijke bronnen zonder te kiezen: "de rij als JSON" uit de
   Sheet, of "het JSON-bestand uit Drive". Dat is geen vrije keuze: de Sheet-import is een **afgeleide**,
   bedoeld voor de rankingformule (`=(650*max_kamers*12)/(vraagprijs+30000)*100`, §6.5) en bevat
   vermoedelijk alleen adres/vraagprijs/kamers/score. `funda_results.json` is de **primaire bron** met
   het volledige scraper-record (WOZ, bouwjaar, energielabel, en straks de fase-A-kenmerken/
   plattegrond-URL's uit §6.2) — zie Vondst 2 in de briefing, die al tegen `funda_results.json` citeert,
   niet tegen de Sheet. Zelfde principe als bij tegenstrijdige bronnen elders in dit project: de
   primaire bron pakken, niet de gebruiker (of hier: de adapter) laten kiezen tussen twee afgeleiden.

   **Consequentie voor het ontwerp:** de gebruiker kiest het pand nog steeds in de Sheet (dat blijft het
   overzicht/de ranking), maar "Kopieer voor Puntum" moet het bijbehorende record uit
   `funda_results.json` ophalen — gekoppeld via `funda_id` of adres (zie B4, §6.3) — in plaats van de
   zichtbare Sheet-rij te serialiseren. Dit raakt de Apps-Script-kant (ander project) en moet daar
   worden opgelost vóórdat B1/B2 (§6.3) gebouwd worden, anders krijgt de importadapter een schema met
   stelselmatig ontbrekende velden die wél in de scraper-output bestaan.

---

## 9. Voorgestelde volgorde

Niets hiervan is besloten; dit is de volgorde die het minste weggooit als de brug er nooit komt.

1. **N1 + N2 + N3** (§6.1) — buiten Fase 4, helpt alle testers, en N1 is het fundament waar de import
   later op inplugt. **[nu mogelijk]**
2. **Prompt-uitbreiding** (§5) als variant náást `PROMPT_plattegrond_kamerafmetingen.md`, zodat er
   gedift kan worden. Dicht een echt correctheidsgat (`vasteTrap`). **[nu mogelijk]**
3. **Sheet-kolom + "Kopieer voor Shortlist"** (§6.5). **[nu mogelijk]**
4. *— poort: tussenfase-exitcriterium —*
5. **Multi-tenant + auth-toggle dicht** (staat al als eerstvolgende bètastap), inclusief de
   `features`-kolom uit §7.
6. **Verificatie 1-3** aan de scraperkant, dan **fase A**.
7. **Taak 21 herschrijven** in `plan/plan.md`: niet "importadapter privé Shortlist Sheet", maar fase B
   zoals in §6.3, met de expliciete notie dat de pandvelden grotendeels al bestaan en het gat
   `ruimtes[]` + exploitatiekeuzes is.
8. **Fase C**, als fase B in de praktijk bevalt.

Eigenaarschap als dit ooit een planonderdeel wordt: A aan de scraperkant, B en C hier, met een
kruisverwijzing — anders worden het opnieuw twee halve plannen die naar verschillende doelen mikken.
