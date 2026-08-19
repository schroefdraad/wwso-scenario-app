# Plan — WWSO Scenario App

## Modelkeuze

Alles draait standaard op Sonnet. Taken met **`⬆ Opus`** zijn de vier plekken waar het zwaardere model loont — daar gaat het om interpretatie of om een architectuurkeuze die je maar één keer maakt, niet om uitvoering.

Loopt een taak zonder dat merkteken toch structureel vast? Dat is meestal een teken dat de taak te grof is opgeknipt, niet dat het model tekortschiet. Splits hem eerst.

## Fase 0 — Fundament

- [x] Taak 1: Monorepo opzetten (pnpm workspaces, Next.js, Vitest, Supabase-connectie)

## Fase 1 — Rekenmotor

- [x] Taak 2: Datamodel (Pand, Ruimte, kamertoewijzing, handmatige posten) in TypeScript + Zod
- [x] Taak 3: Tarieventabellen als versiedataset met peildatum (huurtabel, energielabel, bouwjaar, COROP)
- [x] Taak 4: Rubrieken R1 t/m R4 (oppervlakte vertrekken, overige ruimten, verwarming, energieprestatie)
- [x] Taak 5: Rubrieken R5 en R6 (keuken, sanitair) — capping en deling per kamer **`⬆ Opus`** — meest verweven logica in de xlsx, een subtiele fout valt niet op in de uitkomst
- [ ] Taak 6: Rubrieken R7 t/m R13 — let op de **gecorrigeerde nummering** uit het beleidsboek: R7 woonvoorzieningen voor personen met een handicap (ontbreekt volledig in de xlsx), R8 buitenruimten, R9 gemeenschappelijke vertrekken/ruimten/voorzieningen, R10 gemeenschappelijke parkeerruimten, R11 WOZ, R12 bijzondere voorzieningen, R13 aftrekpunten. De xlsx hanteert vanaf R7 een verschoven nummering — zie briefing B1
- [ ] Taak 7: Eindtelling, huurprijs-lookup, monumentopslag
- [ ] Taak 8: Golden-master validatie tegen wwso.xlsx + 3-5 panden van de officiële huurprijscheck-site — bouwen en draaien op Sonnet, maar **`⬆ Opus`** zodra er een afwijking is: beoordelen of de xlsx of de engine fout zit is interpretatie van het beleidsboek

## Fase 2 — Scenario's en suggesties

- [ ] Taak 9: Scenariomodel als mutaties bovenop de as-is situatie
- [ ] Taak 10: Kostencatalogus inlezen uit Kostenkentallen_WWSO_optimalisatie.xlsx (herhaalbaar)
- [ ] Taak 11: Suggestie-engine — marginale analyse per rubriek, pakketten Basis/Comfort/Maximaal, ranking op terugverdientijd **`⬆ Opus`** voor het ontwerp (hoe maatregelen combineren en per kamer waarderen), daarna Sonnet voor de implementatie

## Fase 3 — Applicatie

- [ ] Taak 12: Invoerscherm inclusief kamertoewijzing — **`⬆ Opus`** voor het UX-voorstel (40 ruimten × 12 kamers), Sonnet voor het bouwen
- [ ] Taak 13: Resultaatscherm met opbouw per rubriek en de vier controles
- [ ] Taak 14: Scenariovergelijking met directe hertelling in de browser
- [ ] Taak 15: Opslaan en laden van deals met versiestempel
- [ ] Taak 16: PDF-export van de puntenopbouw
- [ ] Taak 17: Auth via magic link, org_id en Row Level Security

## Fase 4 — Na de MVP

- [ ] Taak 18: Waarschuwingslaag gemeentelijke regels (start Rotterdam)
- [ ] Taak 19: Schakelaar zittende huurder versus mutatie
- [ ] Taak 20: Koppeling scenario naar de TO BE-tab van de rendementscalculator
- [ ] Taak 21: Importadapter privé Shortlist Sheet — alleen eigen versie
- [ ] Taak 22: Vergelijking met zelfstandige verhuur (WWS)
- [ ] Taak 23: De zeven open punten uit tab Toelichting van wwso.xlsx afhandelen

## Actiepunten (geen code)

- [ ] 3 tot 5 panden verzamelen met een bekende uitkomst van de officiële huurprijscheck-site, als validatieset voor taak 8
- [ ] Kostenkentallen bijwerken met echte cijfers en de statuskolom omzetten van `schatting` naar `offerte` of `bevestigd`
- [ ] Bepalen wie de externe gebruiker is en welke rol die krijgt
