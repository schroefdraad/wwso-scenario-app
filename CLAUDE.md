# WWSO Scenario App (Puntum) — afspraken voor Claude

Puntentelling + rendement voor onzelfstandige verhuur (WWSO), met as-is/to-be-scenario's.
Dit bestand bevat alleen wat **altijd** geldt. Kort houden (< ~200 regels).

## Start van elke sessie

1. Lees `plan/STATUS.md` (waar staan we) en `plan/plan.md` (volgende stappen).
2. Zeg ik "pak de open punten op": begin bovenaan `plan/plan.md` onder "Nu".
3. Historie staat in `plan/archief/` en `briefings/`. Alleen lezen als het nodig is.

## Drie lagen documentatie

| Bestand | Inhoud | Regel |
|---|---|---|
| `CLAUDE.md` | Regels en besluiten die altijd gelden | Alleen aanpassen bij een nieuw besluit |
| `plan/STATUS.md` | Huidige stand: omgevingen, versie, lopende afspraken, open beslissingen | Overschrijven, niet aanvullen. Max ~80 regels |
| `plan/plan.md` | Volgende stappen, één regel per punt, met link naar details | Max ~100 regels |
| `plan/archief/`, `briefings/`, `outputs/` | Sessieverslagen, rapporten, onderbouwing | Hier mag het lang zijn |

- **Komt er tijdens de sessie een vervolgstap boven?** Meteen als regel in `plan/plan.md` zetten,
  in de juiste groep. Uitwerking hoort in een rapport in `outputs/`, niet in plan.md.
- **Is een punt af?** Weghalen uit plan.md (niet afvinken en laten staan). Het verslag staat in de
  commit en de wijzigingslog.
- **Einde sessie:** STATUS en plan.md bijwerken en kort melden wat er openstaat.

## Jouw rol als bewaker van de werkafspraken

Herinner mij **uit jezelf en vóóraf** aan de afspraken hieronder als ze spelen. Eén zin: de afspraak
en waarom hij nu speelt. Kies ik bewust anders, leg dat vast in STATUS en kom er niet op terug.
Past een afspraak niet meer, stel dan een aanpassing van dit bestand voor.

- **Grote klus** (meer dan een paar bestanden of een nieuwe richting): eerst een plan (plan mode),
  ik keur goed, dan pas code.
- **Scherm met berekende getallen of een nieuwe interactie:** eerst een mockup.
- **Bouw voor de omgeving zoals die nu is.** Hoe gedraagt dit zich met de huidige productie-
  instellingen (inlog uit/aan, rechten, data)? Hangt het af van iets wat nog niet bestaat: bewust
  uitgeschakeld bouwen.
- **Bugs:** eerst een falende test, dan de fix. Elk incident krijgt een regressietest met datum.
  **Tweede bug in hetzelfde patroon: stoppen en een audit doen** in plaats van weer een losse fix.
- **Feedback in rondes:** stuur ik losse punten terwijl een release loopt, stel voor ze op de lijst
  voor de volgende ronde te zetten.
- Wat ik zelf in de terminal moet doen, laat je me typen met `!` ervoor.

## Harde regels (domein)

1. **Bron van waarheid:** Beleidsboek WWSO januari 2026 (`resources/beleidsboek/`) → officiële
   Huurprijscheck → pas dan `resources/wwso.xlsx`. De xlsx is een interpretatie (wijkt op 15 punten
   af, zie `briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md`).
2. **Regels uit het beleidsboek:** citeer de paragraaf (§) en zeg of het letterlijk is of een
   interpretatie. Interpretaties ook zo noemen in code en wijzigingslog.
3. **xlsx-bestanden in `resources/` zijn specificatie, geen motor**, en worden nooit overschreven.
4. **Geen hardcoded tarieven.** Alles met een peildatum in `packages/data`.
5. **De rekenmotor (`packages/engine`) blijft puur:** geen netwerk, geen database, geen systeemdatum.
6. **Nooit stilzwijgend gokken.** Liever zichtbaar "ontbreekt nog" / `null` dan ongemerkt 0.
7. **`org_id` op elke tabel.**
8. **Geen persoonsgegevens**, alleen objectgegevens. Bewuste uitzondering: e-mailadres bij feedback.
9. **Elke opgeslagen berekening krijgt een stempel:** peildatum tarieven + engineversie +
   catalogusversie.
10. **Kwartpuntsafronding en deling per kamer** zijn de valkuilen: altijd expliciet testen.

## Architectuurregels (geleerd uit incidenten)

- **De ID van de woning staat altijd in de URL.** Alle `/woning/`-URL's via `lib/navigatie.ts`.
- **Tijdelijke opslag hoort altijd bij één woning.** Alle `sessionStorage` via `lib/sessie/brug.ts`;
  nergens anders `sessionStorage` aanroepen.
- **Naar een volgend scherm = eerst opslaan**, alleen doorgaan als dat lukt.
- **Nooit stil een kopie maken** van een woning. Bij onzekere rechten: blokkeren + expliciete knop.
- **Geen strengere Zod-validatie op schema's die ook opgeslagen data inlezen** (`PandInvoer`).
  Nieuwe velden met `.default(...)`. Strengere controles horen op het invoerpad in de UI.
  (Incidenten `Keuken.verwarmd` 2026-09-04 en `toiletType` 2026-09-25.)

## Techniek

- Monorepo (pnpm): `apps/web` (Next.js 16, App Router — lees eerst `apps/web/AGENTS.md`),
  `packages/engine` (rekenmotor), `packages/data` (tarieven, kostencatalogus, geografie).
- Backend: Supabase (auth via magic link, RLS per org). Migraties in `supabase/migrations/`
  draait de gebruiker zelf in de SQL-editor; geen Supabase CLI-koppeling.
- Hosting: Vercel, project `skael/web`. Foutregistratie: Sentry. Mail: Resend op `puntum.nl`.
- Commando's: `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm dev`.
- Kostencatalogus bijwerken: zie `docs/kostencatalogus-bijwerken.md`.

## Elke release

- [ ] Tests, typecheck en lint groen; wijziging in de browser gecontroleerd.
- [ ] `/code-review` over de wijziging (groot: `/code-review ultra`).
- [ ] Wijzigingslog in gewone taal + versie omhoog (`apps/web/src/lib/wijzigingslog.ts`).
      Rekenregel veranderd? Ook de engineversie omhoog.
- [ ] Committen, pushen, deployen **en controleren dat de nieuwe versie live staat** (footer).
- [ ] `plan/STATUS.md` en `plan/plan.md` bijwerken.

## Modelkeuze

Standaard Sonnet. Opus voor interpretatie van het beleidsboek, architectuurkeuzes en audits.
Loopt een taak vast, splits hem eerst op voordat je een zwaarder model kiest.
