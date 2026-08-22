import { PandInvoer } from '@wwso/engine';
import { z } from 'zod';

/**
 * SessionStorage-brug voor "AS-IS kopiëren naar een handmatig TO-BE-scenario" (backlog, feedback
 * Emma Morrison, 2026-08-21): /pand/vergelijking stuurt de as-is + welk scenario-slot bewerkt
 * wordt hierheen, /pand/nieuw stuurt het bewerkte pand + slotnummer terug. Twee aparte sleutels
 * (heen/terug) i.p.v. één, zodat een terugkeer zonder wijziging (Esc/browser-terug) niet per
 * ongeluk de oorspronkelijke as-is overschrijft met een leeg resultaat.
 *
 * `/pand/nieuw` is een VOLLEDIGE navigatie, geen in-page state — /pand/vergelijking unmount en
 * remount dus bij de heen- én de terugreis. Zonder een snapshot van de rest van het scherm
 * (`VergelijkingSnapshot`) zou elke wijziging aan de andere twee scenario-slots, de deal-naam en
 * de deal-koppeling die niet al opgeslagen was, verloren gaan zodra je één slot handmatig
 * bewerkt — precies de bug die deze snapshot voorkomt.
 */
const START_KEY = 'wwso:scenario-bewerk-start';
const RESULTAAT_KEY = 'wwso:scenario-bewerk-resultaat';
const SNAPSHOT_KEY = 'wwso:vergelijking-snapshot';

const ScenarioBewerkStart = z.object({
  asIsPand: PandInvoer,
  slotIndex: z.number().int().min(0).max(2),
  naam: z.string(),
  /** Waar /pand/nieuw naar terugkeert — inclusief `?deal=<id>` als dat er was, anders de
   * as-is/deal-koppeling van de vergelijkingspagina zelf verliest bij terugkomst. */
  terugUrl: z.string(),
  tarievensetPeildatum: z.string().optional(),
  kostencatalogusVersie: z.string().optional(),
});
export type ScenarioBewerkStart = z.infer<typeof ScenarioBewerkStart>;

export function slaScenarioBewerkStartOp(context: ScenarioBewerkStart): void {
  sessionStorage.setItem(START_KEY, JSON.stringify(context));
}

/** `null` als er niets (geldigs) staat opgeslagen. */
export function haalScenarioBewerkStartOp(): ScenarioBewerkStart | null {
  const ruw = sessionStorage.getItem(START_KEY);
  if (!ruw) return null;
  try {
    const resultaat = ScenarioBewerkStart.safeParse(JSON.parse(ruw));
    return resultaat.success ? resultaat.data : null;
  } catch {
    return null;
  }
}

const ScenarioBewerkResultaat = z.object({
  slotIndex: z.number().int().min(0).max(2),
  bewerktPand: PandInvoer,
});
export type ScenarioBewerkResultaat = z.infer<typeof ScenarioBewerkResultaat>;

export function slaScenarioBewerkResultaatOp(resultaat: ScenarioBewerkResultaat): void {
  sessionStorage.setItem(RESULTAAT_KEY, JSON.stringify(resultaat));
}

/** `null` als er niets (geldigs) staat opgeslagen. Verwijdert de sleutel na het lezen — eenmalig af te halen. */
export function haalEnWisScenarioBewerkResultaatOp(): ScenarioBewerkResultaat | null {
  const ruw = sessionStorage.getItem(RESULTAAT_KEY);
  sessionStorage.removeItem(RESULTAAT_KEY);
  if (!ruw) return null;
  try {
    const resultaat = ScenarioBewerkResultaat.safeParse(JSON.parse(ruw));
    return resultaat.success ? resultaat.data : null;
  } catch {
    return null;
  }
}

const VergelijkingSlotSnapshot = z.discriminatedUnion('soort', [
  z.object({ naam: z.string(), soort: z.literal('kandidaten'), sleutels: z.array(z.string()) }),
  z.object({
    naam: z.string(),
    soort: z.literal('handmatig'),
    pand: PandInvoer,
    /** Sleutels uit de kandidatenlijst tegen DIT bewerkte pand (backlog 2026-08-22: handmatig
     * scenario + standaardmaatregelen) — niet de gedeelde as-is-lijst. */
    sleutels: z.array(z.string()),
    handmatigeInvesteringEuro: z.number(),
  }),
]);

const VergelijkingSnapshot = z.object({
  dealId: z.string().optional(),
  dealNaam: z.string(),
  slots: z.array(VergelijkingSlotSnapshot),
});
export type VergelijkingSnapshot = z.infer<typeof VergelijkingSnapshot>;

export function slaVergelijkingSnapshotOp(snapshot: VergelijkingSnapshot): void {
  sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

/**
 * `null` als er niets (geldigs) staat opgeslagen. Verwijdert de sleutel na het lezen — bedoeld
 * om ALLEEN samen met `haalEnWisScenarioBewerkResultaatOp` gelezen te worden: een snapshot zonder
 * bijbehorend resultaat is een verweesde/oude snapshot (bijv. van een afgebroken bewerking via
 * de browser-terugknop) en moet genegeerd worden, niet toegepast op een onverwante pagina.
 */
export function haalEnWisVergelijkingSnapshotOp(): VergelijkingSnapshot | null {
  const ruw = sessionStorage.getItem(SNAPSHOT_KEY);
  sessionStorage.removeItem(SNAPSHOT_KEY);
  if (!ruw) return null;
  try {
    const resultaat = VergelijkingSnapshot.safeParse(JSON.parse(ruw));
    return resultaat.success ? resultaat.data : null;
  } catch {
    return null;
  }
}
