import { PandInvoer } from '@wwso/engine';
import { z } from 'zod';

/**
 * SessionStorage-brug voor "AS-IS kopiëren naar een handmatig TO-BE-scenario" (backlog, feedback
 * Emma Morrison, 2026-08-21): /pand/vergelijking stuurt de as-is + welk scenario-slot bewerkt
 * wordt hierheen, /pand/nieuw stuurt het bewerkte pand + slotnummer terug. Twee aparte sleutels
 * (heen/terug) i.p.v. één, zodat een terugkeer zonder wijziging (Esc/browser-terug) niet per
 * ongeluk de oorspronkelijke as-is overschrijft met een leeg resultaat.
 */
const START_KEY = 'wwso:scenario-bewerk-start';
const RESULTAAT_KEY = 'wwso:scenario-bewerk-resultaat';

const ScenarioBewerkStart = z.object({
  asIsPand: PandInvoer,
  slotIndex: z.number().int().min(0).max(2),
  naam: z.string(),
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
