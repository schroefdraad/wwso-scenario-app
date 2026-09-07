# Navigatie-voorstel — WWSO Scenario App

Vervolg op `docs/nav-inventory.md` (Fase 1-3). Dit document is Fase 4: bevindingen gerangschikt op
impact, een IA-voorstel, kosten per wijziging, en een expliciet onderscheid tussen wat op bewijs
uit déze app berust en wat op conventie.

Twee van de onderstaande punten (#1 en #2) waren op het moment van schrijven al gefixt en
gedeployed (v0.5.6, zie `RAPPORT_navigatie-audit_2026-09-04.md`) — ze staan hier toch volledig
uitgewerkt omdat de opdracht erom vraagt, met de uitkomst erbij.

## 1. Problemen, gerangschikt op hoeveel gebruikerspaden ze blokkeren

### 1.1 — HIGH — `/pand/resultaat` had geen deep-link-ondersteuning (GEFIXT)
**Bewijs:** live getest — een verse tab op `https://web-skael.vercel.app/pand/resultaat` zonder
navigatiehistorie toonde alleen "Geen (geldige) invoer gevonden om door te rekenen." De pagina
leunde volledig op `sessionStorage`; er was geen `?deal=`-parameter zoals `/pand/vergelijking` die
al wél had (apart getest: `/pand/vergelijking?deal=<id>` laadt prima op een verse tab, rechtstreeks
uit Supabase).
**Blokkeerde:** een resultaat bookmarken, delen als link, in een nieuwe tab openen — elk pad dat
niet via een klik-voor-klik sessie door de app zelf loopt.
**Fix:** `/pand/resultaat` accepteert nu ook `?deal=<id>` voor de AS-IS-kolom, zelfde patroon als
`/pand/vergelijking`. Scenariokolommen blijven sessionStorage-only (zie kostenafweging bij #1.1b).
**Kosten:** klein — twee bestanden (`page.tsx` herschreven naar het bestaande `useSearchParams`-
patroon, één navigatie-aanroep in `Vergelijking.tsx` aangepast). Al gebouwd.

**1.1b — bewust niet opgelost: scenariokolom-resultaten zijn niet deep-linkbaar.**
Een scenariokolom-resultaat is een lokaal berekende mutatie (kandidaten/maatregelen toegepast op
de AS-IS), niet 1-op-1 uit de opgeslagen deal te reconstrueren zonder ook die mutatie opnieuw toe
te passen op basis van `deal.scenarios[i]`. Dat kán (`useScenarioPakket`/`pasScenarioToe` bestaan
al en worden er elders al voor gebruikt), maar vergt het herbouwen van de scenario-reconstructie-
logica specifiek voor deze route. **Kosten: middel** (een dag werk, geschat) **voor een smal
gebruikspad** (een scenario-resultaat delen komt minder vaak voor dan een AS-IS-resultaat delen,
aangezien scenario's per definitie work-in-progress zijn). Niet gedaan — de kosten wegen niet op
tegen de impact op een app van deze omvang.

### 1.2 — MEDIUM — Dead-end-schermen hadden maar één, context-verliezende uitgang (GEFIXT)
**Bewijs:** zowel `/pand/resultaat` als `/pand/vergelijking` toonden bij ontbrekende invoer alleen
"← Terug naar het invoerscherm" — een lege `/pand/nieuw`, zonder enige deal-referentie. De enige
weg naar het deals-overzicht was daarna nóg een extra klik via de Topbar.
**Blokkeerde:** snel herstellen van een dode link naar het punt waar je wél verder kunt (het
overzicht), in plaats van een leeg formulier.
**Fix:** beide foutschermen tonen nu ook een "Mijn deals →"-link.
**Kosten:** triviaal (twee `<Link>`-toevoegingen). Al gebouwd.

### 1.3 — LOW-MEDIUM — "Bewerk handmatig →" is een Link vóór de AS-IS-kolom, een button voor een scenariokolom
**Bewijs:** `SamenvattingRij.tsx:150` (`<Link href=.../>`) versus `SamenvattingRij.tsx:164`
(`<button onClick=.../>`), zelfde zichtbare label, zelfde `styles.btnLink`-styling, dus visueel
niet te onderscheiden — maar semantisch verschillend voor toetsenbord-/screenreader-gebruikers
(zie Fase 3 in de inventaris).
**Blokkeert:** consistente screenreader-/toetsenbordnavigatie (bijv. de "spring naar volgende
link"-shortcut mist de scenariokolom-variant). Beperkte impact — geen gemeld toegankelijkheids-
probleem, dit is een structurele inconsistentie die bij een a11y-audit zou opvallen.
**Niet gefixt.** Oorzaak: de scenariokolom-variant moet éérst `slaScenarioBewerkStartOp()`
aanroepen (een side effect) vóórdat navigeren zin heeft — een pure `<Link>` kan dat niet zonder
een `onClick`-handler die alsnog `preventDefault()` doet, wat het probleem niet oplost, alleen
verplaatst. Een echte fix vergt het herontwerpen van hoe scenario-bewerk-state wordt overgedragen
(bijv. via de URL in plaats van sessionStorage, zoals nu bij #1.1 voor de AS-IS is gedaan).
**Kosten:** middel, **waarde: laag** op deze schaal. Genoteerd, geen actie voorgesteld nu.

### 1.4 — LOW — Browsertab-titel verandert nooit
**Bewijs:** `layout.tsx` zet `metadata.title = "WWSO Scenario App"` globaal; geen enkele
`page.tsx` overschrijft dit. Bij meerdere open tabs (bijv. twee deals naast elkaar) is er in de
tabbalk zelf geen enkel onderscheid.
**Blokkeert:** tab-onderscheid bij multi-tab-gebruik. In-pagina-titels (h1, Topbar-adres) zijn wél
correct — dit raakt alleen de browserchrome, niet de in-app-oriëntatie.
**Niet gefixt — voorgesteld voor een vervolgronde** (zie sectie 3, "Aanbevolen, niet uitgevoerd").

### 1.5 — LOW — Geen directe "Mijn deals" op een succesvol geladen resultaatscherm
**Bewijs:** vanaf een geladen `/pand/resultaat` is `/deals` twee klikken weg ("Vergelijk
scenario's →" dan "Mijn deals →" op die pagina), niet één.
**Blokkeert:** vrijwel niets — 2 in plaats van 1 klik is een marginale wrijving, geen blokkade.
**Niet gefixt, expliciet op conventie afgewezen** (zie sectie 4).

## 2. Voorgestelde informatie-architectuur

**Geen wijziging aan wat persistent is versus in-content.** De huidige verdeling — een per-pagina
kop met de belangrijkste acties/links, verder alles in-content — past bij het aantal en de aard
van de bestemmingen (zie telling in sectie "Hamburgermenu" hieronder). Er is geen apart,
sitebreed navigatiemenu nodig zolang:
- elke pagina een link heeft naar waar de gebruiker vandaan kwam (terug) én naar het overzicht
  (`/deals`) — dat is met de fixes uit #1.1/#1.2 nu overal het geval, behalve op het *succesvolle*
  resultaatscherm (#1.5, bewust);
- het aantal bestemmingen klein genoeg blijft dat een gebruiker de hele boom kan onthouden (5
  gebruikersgerichte routes — zie hieronder).

Wat blijft: koppen bevatten navigatie + de belangrijkste actie voor díe pagina (Doorrekenen,
Opslaan, PDF downloaden). In-content blijft: alles wat met een specifieke rij/kolom/kamer te maken
heeft (scenario-acties, kamer-accordions).

## 3. Kosten per voorgestelde wijziging

| # | Wijziging | Lost op | Kosten | Status |
|---|---|---|---|---|
| 1.1 | `/pand/resultaat?deal=<id>` voor AS-IS | Dead end bij verse tab/gedeelde link | Klein | ✅ Gedaan |
| 1.2 | "Mijn deals"-link op beide foutschermen | Dead end zonder bruikbare uitgang | Triviaal | ✅ Gedaan |
| 1.1b | Scenariokolom-resultaten deep-linkbaar maken | Zelfde als 1.1, smaller pad | Middel (≈1 dag) | ⏸ Niet gedaan — kosten/batenafweging negatief op deze schaal |
| 1.3 | "Bewerk handmatig →" element-consistentie | Toetsenbord-/screenreader-inconsistentie | Middel | ⏸ Niet gedaan — vergt herontwerp van state-overdracht |
| 1.4 | Dynamische browsertab-titel per route | Geen tab-onderscheid bij multi-tab | Klein (`generateMetadata`/`document.title` per route) | ✅ Gedaan (2026-09-07, v0.7.3) |
| 1.5 | Directe "Mijn deals" op resultaatscherm | 2 klikken i.p.v. 1 | Triviaal | ❌ Afgewezen op conventie, geen bewezen probleem |

**#1.4 uitgevoerd (2026-09-07, v0.7.3):** een `title`-template op de root-`layout.tsx`
("Puntum WWS Scenario's" als default, "%s - Puntum" per route) plus een klein server-`layout.tsx`
per routemap (nodig omdat de pagina's zelf client components zijn en dus geen `metadata` mogen
exporteren) — geen `generateMetadata`/`document.title` nodig zoals hierboven verondersteld, de
statische `export const metadata` per layout volstond. Zie `plan/plan.md`/`plan/STATUS.md` voor
het volledige verslag.

## 4. Expliciet op conventie, niet op bewijs uit déze app

- **#1.5 (geen directe "Mijn deals" op het resultaatscherm) is afgewezen op basis van het
  ontwerpprincipe "een resultaatscherm is een resultaat-focused view, geen navigatiehub"** — een
  algemene UX-conventie, niet iets dat uit deze app's gebruiksdata of gemelde klachten blijkt. Er
  is geen bewijs dat gebruikers hier daadwerkelijk vastlopen; het is een marginale wrijving die ik
  bewust niet oplos om geen chrome toe te voegen zonder aangetoonde noodzaak.
- **De aanbeveling tegen een hamburgermenu/sidebar (hieronder) is deels op conventie**: de vuistregel
  "onder de ~7-8 bestemmingen is persistente chrome-navigatie meestal niet de moeite waard" is
  branchekennis, geen uit déze app gemeten drempel. Het tellingsbewijs zelf (5 gebruikersroutes)
  is wel hard uit de inventaris.
- **De prioritering van #1.1 boven #1.1b (AS-IS wel, scenariokolommen niet)** berust op een aanname
  over gebruiksfrequentie ("een AS-IS-resultaat delen komt vaker voor dan een scenario-resultaat
  delen") die niet is gemeten — er is geen analytics in de app. Aannemelijk gezien hoe de app is
  opgebouwd (scenario's zijn expliciet "work in progress" totdat opgeslagen), maar geen harde data.

## Hamburgermenu / sidebar — nadrukkelijk niet voorgesteld

**Telling:** 5 gebruikersgerichte routes (`/deals`, `/pand/nieuw`, `/pand/resultaat`,
`/pand/vergelijking`, `/login`) plus 2 technische zonder eigen UI (`/` redirect, `/auth/callback`
route handler). Geen enkele pagina heeft meer dan 8 navigatie-affordances (zie inventaris), en de
diepte is nooit meer dan 2 klikken vanaf het startpunt. Dat is ver onder de drempel waarop een
apart, persistent menu zichzelf terugverdient — de bestaande per-pagina koppen dekken de hele graaf
al. Voeg geen chrome toe voor bestemmingen die niet bestaan.
