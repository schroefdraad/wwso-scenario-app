# Navigatie-audit — WWSO Scenario App (2026-09-04)

Lean uitgevoerd op verzoek van de gebruiker: geen apart inventory-/labelling-document (de app
heeft daar te weinig oppervlak voor — zie "Schaal" onderaan), wel een echte runtime-check van de
wayfinding-vragen. Bevindingen én de doorgevoerde fixes staan hieronder samen, niet als los
"voorstel" — de gebruiker koos voor "laten we het meteen fixen".

Conventie-noot: dit bestand heet `outputs/RAPPORT_navigatie-audit_2026-09-04.md`, niet
`docs/nav-proposal.md` (de oorspronkelijke opzet) — het project gebruikt overal `outputs/RAPPORT_*`
voor dit soort analyses, geen `docs/`-map.

## Route-inventaris (uit de code, niet gecrawld)

| Route | Doel | Bereikbaar vanaf |
|---|---|---|
| `/` | Redirect naar `/deals` | — (entry point) |
| `/login` | Magic-link inloggen | Auto-redirect als niet ingelogd |
| `/auth/callback` | OAuth-technisch, geen UI | Magic-link e-mail |
| `/deals` | Overzicht opgeslagen deals | Topbar ("Mijn deals"), Vergelijking ("Mijn deals →"), lege-staat-links |
| `/pand/nieuw` | Pand invoeren/bewerken | `/deals` ("+ Nieuw pand"), Vergelijking ("Bewerk handmatig →"), lege-staat-links |
| `/pand/vergelijking` | Scenariovergelijking | `/pand/nieuw` (Doorrekenen), `/deals` (dealrij), Resultaatscherm (terugUrl) |
| `/pand/resultaat` | Puntenopbouw + PDF | `/pand/nieuw` (Doorrekenen), Vergelijking ("Bekijk volledig resultaat →") |

**Diepte:** elke pagina is vanaf elke andere pagina in 1-2 kliks bereikbaar. **Geen orphans** —
alles is vanaf minstens één andere pagina gelinkt. **Schaal:** 5 gebruikersgerichte routes (`/deals`,
`/pand/nieuw`, `/pand/resultaat`, `/pand/vergelijking`, `/login`) plus 2 technische (`/` redirect,
`/auth/callback` zonder UI).

## Bevindingen, gerangschikt op impact

### 1. HIGH — `/pand/resultaat` had geen deep-link-ondersteuning — **gefixt**
Getest: verse tab, `https://web-skael.vercel.app/pand/resultaat` direct geopend, geen navigatie-
geschiedenis. Resultaat: "Geen (geldige) invoer gevonden om door te rekenen." — een kale, ongestylde
pagina zonder enige verdere uitgang behalve terug naar een lege invoerpagina (deal-referentie kwijt).
Oorzaak: in tegenstelling tot `/pand/vergelijking` (dat wél `?deal=<id>` ondersteunt en bij een verse
tab keurig uit Supabase laadt — apart getest en bevestigd werkend) leunde `/pand/resultaat` volledig
op `sessionStorage`, die niet bestaat zonder eerst door de app genavigeerd te hebben. Blokkeerde:
een resultaat bookmarken, in een nieuwe tab openen, delen als link.

**Fix:** `/pand/resultaat` accepteert nu ook `?deal=<id>` (zelfde patroon als `/pand/vergelijking`),
en de "Bekijk volledig resultaat →"-knop voor de AS-IS-kolom navigeert daar nu naartoe zodra er een
opgeslagen deal is. Beperkt tot de AS-IS: een scenariokolom-resultaat is een lokaal berekende
mutatie (kandidaten/maatregelen toegepast op de as-is), niet 1-op-1 uit de opgeslagen deal te
reconstrueren zonder ook die mutatie opnieuw toe te passen — dat blijft bewust sessionStorage-only,
kost meer dan het oplevert gezien de omvang van de app.

Bewust NIET gefixt op dezelfde manier: de "Doorrekenen →"-knop op de invoerpagina zelf (`Topbar.tsx`)
blijft sessionStorage-only, ook als er al een gekoppelde deal is — die knop draagt een *lokaal
bewerkte, mogelijk nog niet opgeslagen* pand over; navigeren via `?deal=` zou die wijzigingen
stilzwijgend negeren en de oude, opgeslagen versie tonen. Dat is geen bug, dat is waarom het zo staat.

### 2. MEDIUM — Dead-end-schermen hadden maar één, deal-context-verliezende uitgang — **gefixt**
Zowel `/pand/resultaat` als `/pand/vergelijking` toonden bij ontbrekende/ongeldige invoer alleen
"← Terug naar het invoerscherm" (een lege `/pand/nieuw`, geen deal-referentie). Nu staat er ook een
"Mijn deals →"-link bij, zodat je bij een doodlopend pad altijd naar het overzicht kunt in plaats van
een leeg formulier. (`/pand/nieuw`'s eigen "niet-gevonden"-status had dit al goed — die verwijst
afhankelijk van context naar de vergelijkingspagina of naar "Mijn deals".)

### 3. LOW-MEDIUM — Zelfde label, ander element-type — gevonden, bewust niet gefixt
"Bewerk handmatig →" is voor de AS-IS-kolom een echte `<Link>` (`SamenvattingRij.tsx`), maar voor
een scenariokolom een `<button>` (`onClick`, geen `href`) — zelfde label, ander gedrag voor
toetsenbord/screenreader-gebruikers. Oorzaak: de scenariokolom-variant moet eerst een side effect
uitvoeren (`slaScenarioBewerkStartOp`) vóór het navigeren, een pure `<Link>` kan dat niet. Dit
zou vragen om de state-overdracht anders te bouwen (bijv. via de URL i.p.v. sessionStorage) — meer
werk dan de impact rechtvaardigt op een app van deze omvang. Genoteerd, geen actie.

### 4. LOW — Geen directe "Mijn deals" op een succesvol geladen resultaatscherm
Vanaf een geladen `/pand/resultaat` kom je bij "Mijn deals" via twee stappen ("Vergelijk scenario's →"
dan "Mijn deals →"), niet direct. Overwogen maar niet toegevoegd: dit scherm is bewust een
resultaat-focused view (puntenopbouw + PDF), geen navigatiehub — een extra link erbij is chrome
toevoegen voor een marginaal geval (2 in plaats van 1 klik). Op conventie afgewezen, niet op bewijs
van een echt probleem — vermeld voor de volledigheid.

## Terminologie (Fase 3)
"Pand" (het object dat doorgerekend wordt) en "deal" (de opgeslagen record) worden door de hele app
consistent als twee verschillende begrippen gebruikt, geen wisselende synoniemen voor hetzelfde
concept. Geen bevinding hier.

## Hamburgermenu / sidebar — nadrukkelijk niet voorgesteld
5 gebruikersgerichte routes is ver onder de drempel waar persistente chrome-navigatie zichzelf
terugverdient. De bestaande per-pagina links (Topbar's "Mijn deals", Vergelijking's "Mijn deals →",
Resultaatscherm's `terugUrl`) dekken de hele graaf al in 1-2 kliks. Zie ook het eerdere advies
hierover elders in dit gesprek — zelfde conclusie, nu met tellingen onderbouwd.

## Wat is er niet getest
Depth/orphan-analyse komt uit codelezing, niet uit een volledige crawl — voor 5 routes is dat
voldoende zekerheid. Geen aparte toegankelijkheids- (a11y-)audit; het Fase-3-label/element-issue
kwam wel naar boven maar is niet uitgebreid getest met een screenreader.
