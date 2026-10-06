import { Energielabel, PandInvoer } from '@wwso/engine';
import { z } from 'zod';
import { maakBrug, SESSIE_SLEUTELS } from '../sessie/brug';

/**
 * SessionStorage-brug voor "AS-IS kopiëren naar een handmatig TO-BE-scenario" (backlog, feedback
 * Emma Morrison, 2026-08-21): /woning/vergelijking stuurt de as-is + welk scenario-slot bewerkt
 * wordt hierheen, /woning/nieuw stuurt het bewerkte pand + slotnummer terug. Twee aparte sleutels
 * (heen/terug) i.p.v. één, zodat een terugkeer zonder wijziging (Esc/browser-terug) niet per
 * ongeluk de oorspronkelijke as-is overschrijft met een leeg resultaat.
 *
 * `/woning/nieuw` is een VOLLEDIGE navigatie, geen in-page state — /woning/vergelijking unmount en
 * remount dus bij de heen- én de terugreis. Zonder een snapshot van de rest van het scherm
 * (`VergelijkingSnapshot`) zou elke wijziging aan de andere twee scenario-slots, de deal-naam en
 * de deal-koppeling die niet al opgeslagen was, verloren gaan zodra je één slot handmatig
 * bewerkt — precies de bug die deze snapshot voorkomt.
 */

const ScenarioBewerkStart = z.object({
  asIsPand: PandInvoer,
  slotIndex: z.number().int().min(0).max(2),
  naam: z.string(),
  /** Waar /woning/nieuw naar terugkeert — inclusief `?deal=<id>` als dat er was, anders de
   * as-is/deal-koppeling van de vergelijkingspagina zelf verliest bij terugkomst. */
  terugUrl: z.string(),
  /** De woning waar dit scenario bij hoort (staat-navigatie-audit 2026-10-03) — gaat mee naar het
   * terugkerende `ScenarioBewerkResultaat`, zodat dat resultaat nooit op de vergelijking van een
   * ándere woning terechtkomt. `undefined` = nog niet opgeslagen woning. */
  dealId: z.string().optional(),
  tarievensetPeildatum: z.string().optional(),
  kostencatalogusVersie: z.string().optional(),
});
export type ScenarioBewerkStart = z.infer<typeof ScenarioBewerkStart>;

const startBrug = maakBrug(SESSIE_SLEUTELS.scenarioBewerkStart, (ruw) => {
  const r = ScenarioBewerkStart.safeParse(ruw);
  return r.success ? r.data : null;
});

export function slaScenarioBewerkStartOp(context: ScenarioBewerkStart): void {
  startBrug.zet(context);
}

/** `null` als er niets (geldigs) staat opgeslagen. */
export function haalScenarioBewerkStartOp(): ScenarioBewerkStart | null {
  return startBrug.haal();
}

const ScenarioBewerkResultaat = z.object({
  slotIndex: z.number().int().min(0).max(2),
  /** Zie `ScenarioBewerkStart.dealId`. */
  dealId: z.string().optional(),
  bewerktPand: PandInvoer,
});
export type ScenarioBewerkResultaat = z.infer<typeof ScenarioBewerkResultaat>;

const resultaatBrug = maakBrug(SESSIE_SLEUTELS.scenarioBewerkResultaat, (ruw) => {
  const r = ScenarioBewerkResultaat.safeParse(ruw);
  return r.success ? r.data : null;
});

export function slaScenarioBewerkResultaatOp(resultaat: ScenarioBewerkResultaat): void {
  resultaatBrug.zet(resultaat);
}

/** `null` als er niets (geldigs) staat opgeslagen. Verwijdert de sleutel na het lezen — eenmalig af te halen. */
export function haalEnWisScenarioBewerkResultaatOp(): ScenarioBewerkResultaat | null {
  return resultaatBrug.haalEnWis();
}

/** Eén uniforme slotvorm sinds 2026-09-07 (feedback Emma Morrison: een energielabel-wisseling mag
 * een handmatige kamerbewerking niet meer uitsluiten) — zie de gelijknamige uitleg bij
 * `ScenarioSlot` in `useScenarioPakket.ts`. Geen aparte legacy-tak nodig zoals bij
 * `deals/types.ts`: dit is ephemere sessionStorage (zie `haalEnWisVergelijkingSnapshotOp`
 * hieronder), dus een snapshot in het oude, exclusieve formaat faalt gewoon de `safeParse` en
 * wordt genegeerd — geen langdurig opgeslagen data om achterwaarts compatibel mee te blijven. */
const VergelijkingSlotSnapshot = z.object({
  naam: z.string(),
  pand: PandInvoer,
  /** Zie de gelijknamige uitleg in `deals/types.ts` — bepaalt of dit scenario "iets voorstelt",
   * losstaand van `pand`'s object-identiteit (die overleeft een JSON-rondreis door sessionStorage
   * toch niet). */
  kamerBewerkt: z.boolean(),
  energielabelDoel: Energielabel.nullable(),
  /** Sleutels uit de kandidatenlijst tegen DIT bewerkte pand (mét `energielabelDoel` toegepast
   * indien gezet) — niet de gedeelde as-is-lijst. */
  sleutels: z.array(z.string()),
  handmatigeInvesteringEuro: z.number(),
  maatregelPrijzenEuro: z.record(z.string(), z.number()).default({}),
});

const VergelijkingSnapshot = z.object({
  dealId: z.string().optional(),
  dealNaam: z.string(),
  /** Backlog 2026-09-04 — zelfde reden als dealNaam hierboven: een nog niet opgeslagen notitie/map
   * mag niet verloren gaan bij een volledige navigatie weg van de vergelijkingspagina en terug. */
  dealNotitie: z.string(),
  dealMap: z.string(),
  slots: z.array(VergelijkingSlotSnapshot),
});
export type VergelijkingSnapshot = z.infer<typeof VergelijkingSnapshot>;

const snapshotBrug = maakBrug(SESSIE_SLEUTELS.vergelijkingSnapshot, (ruw) => {
  const r = VergelijkingSnapshot.safeParse(ruw);
  return r.success ? r.data : null;
});

export function slaVergelijkingSnapshotOp(snapshot: VergelijkingSnapshot): void {
  snapshotBrug.zet(snapshot);
}

/**
 * `null` als er niets (geldigs) staat opgeslagen. Verwijdert de sleutel na het lezen.
 *
 * Sinds 2026-09-01 zet /woning/vergelijking deze snapshot vóór ELKE volledige navigatie weg
 * (zowel "Bewerk handmatig →" naar /woning/nieuw als "Bekijk volledig resultaat →" naar
 * /woning/resultaat), dus een snapshot zonder bijbehorend `ScenarioBewerkResultaat` is geen
 * verweesde state meer om te negeren — hij betekent nu "kom terug van /woning/resultaat, of een
 * afgebroken /woning/nieuw-bewerking (Esc/browser-terug)". In beide gevallen is de snapshot precies
 * de staat van vóór vertrek en dus veilig om altijd toe te passen (zie `Vergelijking.tsx`).
 */
export function haalEnWisVergelijkingSnapshotOp(): VergelijkingSnapshot | null {
  return snapshotBrug.haalEnWis();
}

/**
 * Na "Opslaan" in Scenario bewerken (code-review 2026-10-06): de database is dan bijgewerkt, dus de
 * snapshot die de vergelijking van deze woning vóór vertrek maakte is verouderd. Weg ermee, zodat de
 * vergelijking de woning vers uit de database laadt. Een snapshot van een andere woning blijft
 * staan. Er wordt bewust géén scenario-resultaat neergezet: dat zou de vergelijking later laten
 * herstellen én automatisch opslaan, over nieuwere wijzigingen heen.
 */
export function naScenarioOpgeslagen(dealId: string): void {
  const snapshot = snapshotBrug.haal();
  if (snapshot && snapshot.dealId === dealId) snapshotBrug.wis();
}

/**
 * Welke tussenstand mag de vergelijkingspagina bij het mounten terugzetten? (staat-navigatie-audit
 * 2026-10-03, bevestigd in de browser: vergelijking van woning A → "Bekijk volledig resultaat" →
 * Mijn woningen → woning B openen zette de snapshot van A op de pagina van B, inclusief A's
 * deal-koppeling — één klik op "Opslaan" overschreef A met B's as-is.) Een snapshot of
 * scenario-resultaat hoort alleen bij de woning waarvoor hij gemaakt is; bij elke andere woning
 * wordt hij genegeerd. Beide zijn al uit sessionStorage gewist door de `haalEnWis…`-functies,
 * dus een genegeerde rest blijft ook niet hangen.
 */
export function bepaalVergelijkingHerstel(
  snapshot: VergelijkingSnapshot | null,
  resultaat: ScenarioBewerkResultaat | null,
  huidigeDealId: string | undefined,
): { snapshot: VergelijkingSnapshot | null; resultaat: ScenarioBewerkResultaat | null } {
  return {
    snapshot: snapshot && snapshot.dealId === huidigeDealId ? snapshot : null,
    resultaat: resultaat && resultaat.dealId === huidigeDealId ? resultaat : null,
  };
}

/**
 * Bouwt de start voor "Scenario bewerken". `asIsPand` is het pand van het SLOT, niet de as-is van
 * de woning (incident 2026-10-02): voor een al eerder handmatig bewerkt scenario is dat het
 * bewerkte TO-BE-pand — een tweede bewerking moet daarop verder bouwen, niet terugvallen naar de
 * as-is en alle eerdere kamerwijzigingen van dit scenario kwijtraken.
 */
export function maakScenarioBewerkStart(
  slot: { naam: string; pand: PandInvoer },
  slotIndex: number,
  dealId: string | undefined,
  terugUrl: string,
  versies: { tarievensetPeildatum: string; kostencatalogusVersie: string },
): ScenarioBewerkStart {
  return { asIsPand: slot.pand, slotIndex, naam: slot.naam, terugUrl, dealId, ...versies };
}

/**
 * Zet een teruggekomen scenario-bewerking in het juiste slot. Alleen het pand wordt vervangen;
 * een eerder gekozen labelwisseling, maatregelen, investering en prijzen blijven staan
 * (feedback 2026-09-07: een energielabel-wissel mocht een kamerbewerking niet meer uitsluiten).
 */
export function pasScenarioResultaatToe<S extends { pand: PandInvoer; kamerBewerkt: boolean }>(
  slots: S[],
  resultaat: ScenarioBewerkResultaat | null,
): S[] {
  if (!resultaat) return slots;
  return slots.map((s, i) =>
    i === resultaat.slotIndex ? { ...s, pand: resultaat.bewerktPand, kamerBewerkt: true } : s,
  );
}
