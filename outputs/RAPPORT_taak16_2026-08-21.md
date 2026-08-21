# Rapport — Taak 16: PDF-export van de puntenopbouw

## Wat er gedaan is

Een "PDF downloaden"-knop op `Resultaatscherm` (naast "Vergelijk scenario's →") genereert client-side een PDF met de volledige puntenopbouw: alle kamers, alle dertien rubrieken (afgerond + ruw), de bijbehorende toelichtingsregels, de subtotalen tot en met de maximale huurprijs, en de vier controles — dus het statische equivalent van het (interactieve, standaard ingeklapte) resultaatscherm, maar dan altijd volledig uitgeklapt, want op papier kan niets worden opengeklapt.

Omdat `Resultaatscherm` al prop-gedreven is (taak 13) en zowel de as-is als een scenario-reconstructie rendert (taak 14), werkt de PDF-export automatisch voor beide — geen aparte knop of route nodig.

### Bestanden
```
apps/web/src/lib/pdf/
├── PuntenrapportDocument.tsx   het PDF-document (@react-pdf/renderer)
├── bestandsnaam.ts              puntenrapportBestandsnaam(pand, peildatum)
└── bestandsnaam.test.ts
```

### Ontwerpkeuzes

1. **Geen eigen doorrekening in de PDF.** `PuntenrapportDocument` krijgt de al-berekende `EindtellingResultaat` en `ControleResultaat[]` van `Resultaatscherm` mee (dezelfde `useMemo`'s die het scherm zelf gebruikt) — de PDF kan dus nooit afwijken van wat er op het scherm staat, en er wordt niets dubbel doorgerekend.
2. **`@react-pdf/renderer`, client-side, dynamisch geïmporteerd.** Geen server-route, geen API-call — consistent met de rest van de app (directe hertelling in de browser, taak 14). De import gebeurt pas ín de click-handler (`await import(...)`), niet bovenaan het bestand, zodat de ~250 kB van de library niet in de initiële bundel van het resultaatscherm terechtkomt.
3. **Bestandsnaam met tarieven-peildatum, niet alleen adres.** Twee exports van dezelfde deal vóór en ná een nieuwe tarievenset (taak 15) krijgen zo nooit dezelfde bestandsnaam met verschillende inhoud.
4. **Geen Unicode-symbolen (✓/⚠) in de PDF.** React-pdf's ingebouwde standaardlettertypen (Helvetica) dekken die glyphs niet betrouwbaar — vervangen door tekstbadges "OK"/"LET OP", conform hoe de rest van de engine al bewust vuistregels/aannames vermijdt: liever een expliciete, altijd-correcte weergave dan een teken dat soms als leeg vakje rendert.
5. **Elke kamer als één ondeelbare blok (`wrap={false}`).** Voorkomt dat een rubriektabel halverwege over een paginabreuk heen scheurt; bij een pand met veel kamers/toelichting kan dit wat witruimte onderaan een pagina geven, een geaccepteerde afweging voor leesbaarheid.

## Verificatie

- `pnpm test` → 226/226 groen (3 nieuw: `bestandsnaam.test.ts`)
- `npx tsc --noEmit` in `apps/web` → geen fouten
- `npx eslint` op de nieuwe/gewijzigde bestanden → schoon
- Handmatig in de browser (Playwright via claude-in-chrome): voorbeeldpand laden → doorrekenen → "PDF downloaden" → de gegenereerde `Blob` onderschept en geïnspecteerd: geldige `%PDF-1.3`-header, `application/pdf`, 29,9 kB, bevat het adres, gecomprimeerde content-streams, 6 pagina-gerelateerde objecten (één per kamer van het voorbeeldpand). Geen consolefouten tijdens het genereren.

## Niet geïmplementeerd / bewust buiten scope

- Geen serverside PDF-generatie (bijv. voor e-mail/batch-export) — dat is een andere taak met een ander contract (geen browser-context, wel een API-route).
- Geen aangepaste paginakop met logo/huisstijl — dit is een intern rapport, geen extern klantdocument.

## Volgende stap
Taak 17: Auth via magic link, org_id en Row Level Security.
