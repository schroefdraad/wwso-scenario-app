# Plan: "Scenario opslaan" en "Scenario kopiëren" (branch `test`, bèta-livegang)

Status: **plan, nog niet goedgekeurd.** Geen code gewijzigd. Opgesteld 2026-10-06 door een planagent,
opgeslagen door Claude Code.

## 1. Datamodel (nu)

- Eén rij per woning in `deals`: `pand_invoer`, `scenarios` (array `ScenarioSelectie`), versiestempel-kolommen
  (`tarievenset_peildatum`, `kostencatalogus_versie`, `registry_versie`, `engine_versie`), `notitie`, `map`,
  `org_id`, `is_demo`.
- Scenario's zijn **geen eigen rijen** en hebben geen eigen id. Ze worden herkend op positie (0..2) en naam.
  Er zijn precies 3 slots (`STANDAARD_NAMEN`).
- Opgeslagen scenario = `soort: 'handmatig'` met `pand`, `kamerBewerkt`, `energielabelDoel?`, `sleutels`,
  `handmatigeInvesteringEuro`, `maatregelPrijzenEuro`. Oude vormen worden bij laden gemigreerd (`slotsUitScenarios`).
- Resultaten worden niet opgeslagen; ze worden bij laden opnieuw berekend met de opgeslagen peildatum.

## 2. Opslaan nu

- Er is maar **één schrijfpad**: `bewaar()` in Vergelijking schrijft de hele woning (`werkDealBij` of `maakDealAan`),
  met alle scenario's.
- Topbar (invoer) schrijft `pand` + `bewerktDeal.scenarios`. Dat kan verouderd zijn als er in een andere tab
  gewijzigd is (R5).
- Wijzigingen na terugkomst uit "Scenario bewerken" zijn alleen in geheugen en in de sessie-snapshot. Er is
  **geen** "niet opgeslagen"-indicator en **geen** beforeunload-waarschuwing.

**Consequentie:** een knop "Scenario opslaan" betekent in de praktijk "woning incl. alle scenario's opslaan".

## 3. Scenario kopiëren (binnen dezelfde woning)

- Nieuwe pure functie `kopieerSlot(slots, bronIndex, doelIndex, { bevestigOverschrijven })` in bijv.
  `lib/vergelijking/scenarioKopie.ts`. Geen Supabase.
- Diepe kopie: `pand` via JSON-clone, `sleutels` als nieuwe `Set`, `maatregelPrijzenEuro` gespreid.
- Naam van de kopie: `"<bronnaam> (kopie)"`, direct bewerkbaar.
- Versiestempel: scenario's hebben geen eigen stempel; de kopie erft de deal-stempel. Testen.
- Doelslot niet leeg: inline bevestiging "Scenario 2 overschrijven?". Nooit stil overschrijven.
- Max 3 slots is hard gecodeerd. Een 4e scenario vraagt een refactor: buiten scope voor de bèta.
- Geen SQL-migratie nodig (`scenarios` is JSON). Optioneel `slotIndex` met `.optional()` voor bug B1.

## 4. Rechten (huidig gedrag)

- `magDealBewerken`: anoniem → `!isDemo`; eigenaar → altijd true; `null` (niet op allowlist) → false;
  anders zelfde org en `!isDemo`.
- `bewerkrechtenOnzeker`: profiel-ophaal faalde na retry → `bepaalOpslaanActie` geeft `geblokkeerd`.
- Demo-woning en woning van andere org: "Opslaan" maakt een kopie. Titel waarschuwt, maar klik is direct
  (bijna een stille kopie).

## 5. Bugs (eerst falende test, dan fix)

- **B1 positie-verschuiving:** `opslaanbareScenarios` laat lege slots weg; `slotsUitScenarios` leest op index.
  Voorbeeld: alleen Scenario 2 gevuld → na laden op tabblad 1. Fix: `slotIndex` op elk scenario-object.
  **Prioriteit 1.**
- **B2 navigatie zonder opslaan:** `bewaarVoorVertrek` geeft `gelukt: true` zonder te schrijven als
  `!magBewerken` of `bewerkrechtenOnzeker`. Schendt "naar een volgend scherm = eerst opslaan".
  Fix: pure `bepaalVertrekActie(...)`; bij wijzigingen + niet-bewerkbaar: blokkeren met knop
  "Maak een eigen kopie en ga door".
- **B3 verborgen kopie:** "Opslaan" op niet-eigen woning maakt kopie. Fix: aparte knop
  "Kopie maken & opslaan" met bevestigingszin.
- **B4 geen dirty-indicator:** `dirty`-vlag, stip op tabblad, beforeunload bij wijzigingen.
- **B5 geen directe tests** voor `bepaalOpslaanActie`, `kopieerDeal`, `slotsUitScenarios`, `opslaanbareScenarios`.

## 6. Tests (toe te voegen)

- `types.test.ts`: matrix `bepaalOpslaanActie`.
- `scenarioKopie.test.ts`: diepe kopie (wijzig kopie → origineel onveranderd), overschrijven vereist vlag, naam.
- `scenarioOpslag.test.ts`: round-trip met gat-slots (B1); onaangeraakt slot wordt niet opgeslagen.
- `bepaalVertrekActie` (B2).
- Stempeltest: kopie → opslaan → laden → zelfde peildatum en resultaat.
- `bouwKopieInvoer(bron)` extraheren en testen.
- Handmatig op `test`: eigen woning, demo-woning, woning van andere org, onzekere rechten.

## 7. Mockup (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Scenariovergelijking                                                         │
│ "Pettersonstraat 15" · Amsterdam · 4 kamers                                  │
│ [Pettersonstraat 15 ______] [📁 Map ▾] [Opslaan]  ✓ Opgeslagen 14:02         │
│                                                                              │
│ Samenvatting   As-is │ Scenario 1 │ Scenario 2 │ Scenario 3                  │
│ Optimalisaties                                                               │
│ [Scenario 1 ●] [Scenario 2] [Scenario 3]        ● = niet opgeslagen          │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Naam: [Scenario 1 ______]                                                │ │
│ │ [Scenario opslaan]  [Kopiëren naar: Scenario 2 ▾]  [Leegmaken]           │ │
│ │ ● 2 wijzigingen nog niet opgeslagen                                      │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Knopstaten**

| Knop | Staat | Tekst |
|---|---|---|
| Scenario opslaan | schoon | disabled, "Geen wijzigingen om op te slaan" |
| | dirty, bewerkbaar | actief |
| | niet bewerkbaar (demo / andere org) | disabled, "Alleen-lezen: maak eerst een eigen kopie" |
| | onzeker | disabled, "Bewerkrechten konden niet bevestigd worden — ververs de pagina" |
| | woning nog niet opgeslagen | label "Woning opslaan" |
| Scenario kopiëren ▾ | doel leeg | actief |
| | doel gevuld | "Scenario 2 overschrijven? [Ja] [Annuleren]" |
| Kopie maken & opslaan | alleen niet-bewerkbaar | expliciet, met bevestigingszin |

## 8. Open keuzes (met aanbeveling)

1. **Wat is "Scenario opslaan"?** (a) één schrijfpad voor de hele woning, met stip per tabblad; (b) per scenario
   wegschrijven. **Aanbeveling: (a).** (b) pas na B1.
2. **Doel van "Scenario kopiëren":** (a) alleen lege slot; (b) overschrijven met bevestiging; (c) 4e slot.
   **Aanbeveling: (b).** (c) na de bèta.
3. **Naam van de kopie:** (a) "<bronnaam> (kopie)"; (b) standaardnaam van het doelslot. **Aanbeveling: (a).**
4. **Woning niet van jou:** (a) "Opslaan" wordt kopie (huidig); (b) expliciete knop. **Aanbeveling: (b).**
5. **Navigeren met wijzigingen op niet-bewerkbare woning:** (a) doorlaten (huidig); (b) blokkeren met
   "Maak een eigen kopie en ga door". **Aanbeveling: (b).**
6. **Onzekere rechten:** blokkeren + "Toch als kopie", zoals in Topbar. **Aanbeveling: ja.**
7. **Scenario opslaan op nog niet opgeslagen woning:** (a) wordt "Woning opslaan"; (b) uitgeschakeld.
   **Aanbeveling: (a).**

## 9. Risico's

- **R1 (B1):** scenario's verschuiven na opslaan/laden. Hoge impact.
- **R2 (B2):** navigatie laat wijzigingen liggen. Schendt een harde regel.
- **R3:** verborgen kopieën bij Opslaan op niet-eigen woning.
- **R4:** versiestempel-inconsistentie: Topbar stempelt met de nieuwste tarievenset, Vergelijking met de opgeslagen
  peildatum.
- **R5 (multi-tab):** `werkDealBij` schrijft de hele rij; last-write-wins. Risico op stil overschrijven.
  Mitigatie: `bijgewerkt` als versievoorwaarde, of een waarschuwing.
- **R6:** 3-slot-grens; verwachtingsrisico bij de eigenaar.
- **R7:** `ANONIEM` maakt alles niet-demo bewerkbaar; copy/save moet dezelfde uitkomst geven als met inloggen.

## 10. Stappen

1. Falende tests: B1, B2, B3, `bepaalOpslaanActie`-matrix.
2. Pure modules: `scenarioOpslag.ts`, `scenarioKopie.ts`, `bepaalVertrekActie`, `bouwKopieInvoer`.
3. UI in Vergelijking: knoppen per tabblad, dirty-stip, kopie-dropdown + bevestiging, kopieknop, beforeunload.
4. Topbar: stale-overschrijving (R5) afvangen.
5. Lint, typecheck, tests.
6. Browsercontrole op `test`.
7. Wijzigingslog + versie omhoog. Geen engineversie (geen rekenregel).

## Kritieke bestanden

- `apps/web/src/components/vergelijking/Vergelijking.tsx`
- `apps/web/src/lib/deals/types.ts`
- `apps/web/src/lib/deals/opslag.ts`
- `apps/web/src/components/invoer/Topbar.tsx`
- `apps/web/src/lib/vergelijking/scenarioBewerkBrug.ts`

## Niet gelezen door de planagent

`SamenvattingRij.tsx`, `useScenarioPakket.ts`, `HandmatigMaatregelen.tsx`. Te verifiëren bij implementatie.

---

## Review 2026-10-06 (Opus, gecontroleerd in de code)

**1. Het plan mist het eigenlijke gat.** In het scherm "Scenario bewerken" (`Topbar.tsx`, `state.handmatigScenario`)
is de knop Opslaan bewust verborgen. "Gebruik als scenario →" schrijft alleen naar sessionStorage
(`slaScenarioBewerkResultaatOp`) en gaat terug naar de vergelijking. Daar past `pasScenarioResultaatToe` het
resultaat alleen in het geheugen toe (herstel-`useEffect`, `Vergelijking.tsx:180`). **Er wordt niets naar de
database geschreven** tot de gebruiker zelf op Opslaan klikt of een volgende stap zet. Sluit je daarna het
tabblad, dan ben je de kamerbewerking kwijt. Dat is vrijwel zeker wat "een save-knop voor scenariobewerken"
bedoelt. Fix: na het toepassen van een scenario-resultaat direct `bewaar()` aanroepen (als `magBewerken` en
niet `bewerkrechtenOnzeker`), en de knop hernoemen naar "Opslaan en terug naar vergelijking →". Dat sluit aan
op het besluit van 2026-10-03 ("naar een volgende stap = eerst opslaan").

**2. B1 bevestigd en prioriteit 1.** `opslaanbareScenarios` (`flatMap`) laat onaangeraakte slots weg;
`slotsUitScenarios` leest op index. Alleen Scenario 2 gevuld → na laden staat hij op tabblad 1. Zonder deze fix
is "kopieer naar Scenario 2" onbetrouwbaar. Fix `slotIndex` als optioneel veld in
`ScenarioSelectieHandmatig` (oude data: `?? i`) is in lijn met de Zod-regel uit CLAUDE.md.

**3. B2 is geen bug maar een eerder besluit.** De uitzondering in `bewaarVoorVertrek` (niet opslaan bij
`!magBewerken`/onzeker) staat er bewust, om de wildgroei aan kopieën te stoppen (zie commentaar in de code).
Niet terugdraaien in deze klus; hooguit als aparte keuze voorleggen.

**4. B3 en B4 zijn verbeteringen, geen voorwaarde.** Het huidige "Opslaan maakt een kopie" op een alleen-lezen
woning is een expliciete klik met tooltip, gelijk aan het invoerscherm. Een dirty-stip + beforeunload is
nuttig maar raakt de hele pagina. Beide uit de scope van deze ronde, op de lijst voor later.

**5. R4 bevestigd, maar latent.** Topbar stempelt met `alleTarievensets().at(-1)`, de vergelijking met de
opgeslagen peildatum. Pas een probleem zodra er een tweede tarievenset is. Apart punt op plan.md.

**6. R5 (twee tabbladen, last-write-wins) is reëel maar bestond al.** Niet in deze klus oplossen.

**7. Knop "Scenario opslaan" per tabblad is overbodig** als punt 1 is opgelost: de bestaande Opslaan-knop in de
strook slaat al alle scenario's op. Een tweede knop met dezelfde werking verwart.

### Aanbevolen, kleinere scope

1. Falende test B1 (gat-slots round-trip) → fix met `slotIndex`.
2. Falende test: scenario-resultaat toegepast → woning wordt opgeslagen (pure functie die de actie bepaalt).
   Fix: auto-opslaan na "Gebruik als scenario", knoptekst aanpassen.
3. Pure `kopieerSlot` + tests (diepe kopie, overschrijven alleen met bevestiging, naam "(kopie)").
4. UI: knop "Kopiëren naar ▾" per scenario-tabblad, inline bevestiging bij gevuld doel, uit bij alleen-lezen
   of onzekere rechten. Na kopiëren direct opslaan (zelfde regel).
5. Wijzigingslog + versie, geen engineversie. Browsercontrole op `test`.

Geen SQL-migratie nodig (`scenarios` is JSON).
