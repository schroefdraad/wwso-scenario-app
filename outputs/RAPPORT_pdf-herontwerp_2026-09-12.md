# PDF-herontwerp — 2026-09-12

Verzoek van de gebruiker: mooier format voor de PDF-export, lettertype makkelijk te wijzigen,
Puntum-logo + woordmerk in de header, gegevens overzichtelijk in tabellen, elke pagina een
header en footer, en een paar mockup-exports om uit te kiezen.

## Merkbeelden

`resources/images/pictogram.jpeg` (het logo) en `title.jpeg` (het woordmerk "puntum") waren de
enige twee bronbestanden. `title.jpeg` bleek een niet-geplatte transparantie te bevatten — het
schaakbordpatroon van een ontwerptool, gebakken in de JPEG als een zeer lichte (247–255)
grijswaarde-ruis. Schoongemaakt met `sharp` (alles ≥235 naar zuiver wit, daarna getrimd) en
opnieuw geëxporteerd in vier varianten in `apps/web/public/branding/`:

- `puntum-logomark.png` — het originele zwarte vierkant-met-witte-P-beeldmerk (favicon-stijl).
- `puntum-wordmark.png` — het schoongemaakte woordmerk, zwart op wit.
- `puntum-mark-accent-sm.png` / `puntum-mark-white-sm.png` — het "P"-silhouet als losse
  transparante PNG (alpha = luminantie van het origineel), respectievelijk in het huisstijlgroen
  (`#2f6a53`) en wit, voor gebruik op een lichte resp. donkere kopregel.
- `puntum-wordmark-sm.png` / `puntum-wordmark-white-sm.png` — idem voor het woordmerk.

Voor de PDF zijn de kleine varianten (accent/wit) als data-URI ingebakken in
`apps/web/src/lib/pdf/merkbeelden.ts` — een los bestand i.p.v. een `public/`-URL, omdat
`PuntenrapportDocument.tsx` vanuit een `'use client'`-component dynamisch wordt geïmporteerd
(zie `Resultaatscherm.tsx`) en identiek moet werken in de browser én in een los Node-renderscript
(de mockup-generatie hieronder) — een data-URI heeft in beide gevallen geen extra fetch nodig.

## Lettertype

Vraag van de gebruiker: hoe moeilijk is het lettertype te wijzigen?

**Op de site**: triviaal. `apps/web/src/app/globals.css:68` heeft `body { font-family: Arial,
Helvetica, sans-serif }` hardcoded — de Geist-fonts die `layout.tsx` al laadt via `next/font/
google` (`--font-geist-sans`) worden nooit toegepast. Één regel aanpassen (`font-family:
var(--font-geist-sans), Arial, sans-serif`) volstaat, of een ander Google-font kiezen via
`next/font/google`.

**In de PDF**: lastiger, want `@react-pdf/renderer` (pdfkit onder de motorkap) kent alleen de 14
ingebouwde PDF-standaardfonts (Helvetica/Times/Courier, WinAnsi-encoding) tenzij je zelf een
lettertypebestand (TTF/OTF) registreert via `Font.register`. Gedaan: **Inter** zelf gehost,
Regular + Bold, in `apps/web/src/lib/pdf/lettertype.ts` als data-URI (net als de merkbeelden).

Bijkomende, niet-cosmetische reden om dit nu te doen: de rekenmotor gebruikt `→` (rechtspijltje)
als scheidingsteken in praktisch elke rubriek-toelichting (35 bestanden, zie `grep -r "→"
packages/engine/src`) — dat teken zit niet in de WinAnsi-encoding van de standaard PDF-fonts, dus
rendert in de oude PDF als een verkeerd glyph (zichtbaar als een soort apostrof). **Bewust niet
opgelost door de motor-tekst aan te passen** — dat scheidingsteken zit in tientallen bestanden en
golden-master-tests met exacte string-matches, een veel grotere en risicovollere wijziging dan
een PDF-opmaakverzoek rechtvaardigt. In plaats daarvan lost een Unicode-volledig lettertype het
op zonder de motor aan te raken.

**Waarom self-hosted en gesubset, niet de volledige variabele Google Font:**
`@react-pdf/renderer` embedt het hele lettertypebestand in elke gegenereerde PDF. De variabele
`Inter[opsz,wght].ttf` van Google Fonts is ~900KB; het merendeel (breedte-as, alle gewichten,
niet-Latijnse glyphs) wordt nooit gebruikt. Met `fonttools` (Python, `varLib.instancer` +
`subset`) omgezet naar twee statische instances (wght 400/700, opsz 14), gesubset op Latijn +
algemene leestekens + pijltjes + het eurosymbool → **~129 KB per gewicht**. Licentie: SIL Open
Font License 1.1, tekst in `apps/web/public/branding/fonts/Inter-OFL.txt`.

Regenereren (als er ooit een andere subset/gewicht nodig is):
```
curl -L -o Inter-Var.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf
python -m fontTools.varLib.instancer Inter-Var.ttf wght=400 opsz=14 -o Inter-Static-Regular.ttf
python -m fontTools.subset Inter-Static-Regular.ttf --unicodes="U+0000-024F,U+2000-206F,U+2190-21FF,U+20AC,U+FB00-FB06" --layout-features='*' --output-file=Inter-Subset-Regular.ttf
# idem voor wght=700 → Inter-Subset-Bold.ttf
```

## Tabellen en lay-out

`PuntenrapportDocument.tsx` volledig herbouwd (zelfde brondata, `EindtellingResultaat`/
`ControleResultaat[]`, geen eigen doorrekening — de PDF kan dus nog steeds niet afwijken van het
scherm):

- **Nieuw: "Overzicht per kamer"-tabel** op pagina 1, direct onder de maandhuur/jaarhuur-band —
  ontbrak volledig; de oude PDF sprong direct van de totalen naar de eerste volledige
  kamerdetail-tabel. Kamer / Punten / Maandhuur, met een gearceerde totaalregel onderaan.
- **Rubriektabel per kamer** nu een echte gerasterde tabel (buitenrand, koprij met achtergrondtint,
  zebra-arcering per rij) i.p.v. losse rijen met alleen een onderlijn.
- **Kop- en voetregel op elke pagina** (`fixed`): kop toont het merk-lockup (icoon + woordmerk)
  links en het adres + subtitel rechts; voet toont adres, gegenereerd-op-datum en paginanummer,
  met een dunne accentkleurige lijn erboven.
- **Paginabreak-fix tijdens het bouwen ontdekt**: de Controles-sectie had `wrap={false}` op het
  hele blok, wat bij Kamer 6 een halve lege pagina veroorzaakte (het blok paste niet meer op de
  restruimte, dus sprong in zijn geheel naar een nieuwe pagina). Verplaatst naar per-controlerij
  (`wrap={false}` op elke `controleRij` i.p.v. de hele sectie) — vult de restruimte nu netjes, met
  hooguit één rij die overloopt naar de volgende pagina.

## Twee mockups

Beide gegenereerd uit dezelfde databron (`testpand6Kamers`, de bestaande 6-kamer-testfixture) met
`apps/web/scripts/pdf-mockup.tsx` (`npx tsx apps/web/scripts/pdf-mockup.tsx`, buiten de browser om
via `@react-pdf/renderer`'s `renderToFile`) — een herbruikbaar scriptje voor een volgende
preview-ronde. Output: `outputs/pdf-mockups/puntenrapport-mockup-{licht,band}.pdf`.

- **`licht`** (standaard, `stijlVariant` niet meegeven): witte kopregel, groen "P"-icoon +
  zwart woordmerk, dunne groene lijn eronder.
- **`band`**: volle-breedte donkergroene kopband, wit icoon + wit woordmerk, wit/lichtgroene tekst.

`PuntenrapportDocument` accepteert een optionele `stijlVariant?: 'licht' | 'band'` prop (default
`'licht'`) — `Resultaatscherm.tsx` geeft 'm nog niet door, dus de productie-app gebruikt nu
gewoon de standaard totdat de gebruiker een keuze maakt.

## Nog niet gedaan

- Geen versie-bump/commit/deploy — dit zijn mockups ter review, geen afgeronde wijziging.
- De site zelf gebruikt nog `Arial, Helvetica, sans-serif` (zie hierboven) — losse keuze, niet
  meegenomen in deze ronde tenzij gevraagd.
- `stijlVariant` wordt nergens in de UI aan de gebruiker aangeboden (bijv. een keuzeknop bij het
  exporteren) — puur een intern prop voor deze twee mockups. Toevoegen als de gebruiker per deal
  wil kunnen wisselen; anders volstaat één vaste standaardwaarde.
