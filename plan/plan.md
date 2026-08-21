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
- [x] Taak 6: Rubrieken R7 t/m R13 — gecorrigeerde nummering geïmplementeerd. Zie `outputs/RAPPORT_taak6_2026-08-19.md`
- [x] Taak 7: Eindtelling, huurprijs-lookup, monumentopslag. Zie `outputs/RAPPORT_taak7_2026-08-19.md`
- [x] Taak 8: Golden-master validatie tegen 3 officiële Huurprijscheck-exports (Kleiweg 179-B) — zie `outputs/RAPPORT_taak8_2026-08-19.md`. De R4-afwijking die daar gevonden werd is beoordeeld en opgelost (**`⬆ Opus`**, `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`): R4 rekent nu op de ongeronde privé+gedeeld-oppervlakte (§2.4.4), R2 en R13 blijven op de afgeronde rubriek-1-rekenregel. Daarbij kwam ook een fixture-fout bij kamer 6 aan het licht (sanitair van kamer 2 hergebruikt). **Alle drie de kamers matchen nu exact op elke rubriek, het eindtotaal en de huurprijs**

## Fase 2 — Scenario's en suggesties

- [x] Taak 9: Scenariomodel als mutaties bovenop de as-is situatie. Zie `outputs/RAPPORT_taak9_2026-08-19.md`
- [x] Taak 10: Kostencatalogus inlezen uit Kostenkentallen_WWSO_optimalisatie.xlsx (herhaalbaar). Zie `outputs/RAPPORT_taak10_2026-08-19.md`
- [x] Taak 11: Suggestie-engine — marginale analyse per rubriek, pakketten Basis/Comfort/Maximaal, ranking op terugverdientijd. Ontwerp door Opus, implementatie door Sonnet. Zie `outputs/RAPPORT_taak11_2026-08-20.md`. Toelichtingsdeck voor de externe gebruiker (Opus) al eerder opgeleverd als artifact, met een BTW-aanscherping die in deze implementatie is verwerkt.

## Fase 3 — Applicatie

- [x] Taak 12: Invoerscherm inclusief kamertoewijzing. UX-voorstel door Opus (chip-per-rij i.p.v. matrix, gevalideerd met een HTML-prototype), implementatie door Sonnet. Zie `outputs/RAPPORT_taak12_2026-08-20.md` — inclusief een belangrijke bevinding: Turbopack kan `.js`-gesuffixte relatieve imports niet naar `.ts` herleiden, gefixt door alle relatieve imports in `packages/engine`/`packages/data` (84 bestanden) van dat achtervoegsel te ontdoen.
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

- [x] Panden verzameld en gebruikt in taak 8: 3 kamers van hetzelfde pand (Kleiweg 179-B) volledig gevalideerd, 1 kamer (Hoefstraat) gedeeltelijk (WOZ-oppervlak ontbreekt op de bron). Geen van de aangeleverde panden raakt monument, parkeren of gehandicaptenvoorzieningen — extra panden voor die rubrieken blijven welkom bij een volgende validatieronde
- [ ] Kostenkentallen bijwerken met echte cijfers en de statuskolom omzetten van `schatting` naar `offerte` of `bevestigd`
- [ ] Bepalen wie de externe gebruiker is en welke rol die krijgt — **bewust uitgesteld tot na de UX van taak 12** (kamertoewijzing); pas als er met het invoerscherm is gewerkt, is duidelijker wat een externe gebruiker nodig heeft
