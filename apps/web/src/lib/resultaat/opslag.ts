import { PandInvoer } from '@wwso/engine';
import { z } from 'zod';
import { ScenarioSelectie } from '../deals/types';

/**
 * Overdracht tussen pagina's binnen hetzelfde tabblad (taak 12 → 13 → 14 → 15). Er is nog geen
 * backend/Supabase-opslag voor de WERKSESSIE zelf (alleen voor expliciet opgeslagen deals,
 * `lib/deals`) — sessionStorage is een bewust tijdelijke, client-only brug.
 *
 * Draagt sinds taak 15 ook optioneel het versiestempel mee: als je een opgeslagen deal opent
 * (oude tarievenset-peildatum/kostencatalogus-versie) en van daaruit naar het resultaatscherm of
 * "bekijk volledig resultaat" navigeert, moet dát exacte versiestempel blijven gelden — niet
 * stilzwijgend de nieuwste tarieven/catalogus (harde regel 6). `undefined` betekent: nieuwe,
 * nog niet opgeslagen invoer → gebruik de nieuwste versies.
 *
 * Draagt sinds de "as-is bewerken"-backlogfix ook optioneel de deal-identiteit mee (id, naam,
 * scenario-keuzes): zonder dit zou een bewerkte as-is die via /woning/nieuw?deal=<id> geladen was,
 * op het vergelijkingsscherm als een NIEUWE deal verschijnen — "Woning opslaan" zou dan dupliceren
 * in plaats van de bestaande deal bij te werken.
 */
export const HUIDIG_PAND_SESSIONSTORAGE_KEY = 'wwso:huidig-pand';

const OpgeslagenPandContext = z.object({
  pand: PandInvoer,
  tarievensetPeildatum: z.string().optional(),
  kostencatalogusVersie: z.string().optional(),
  dealId: z.string().optional(),
  dealNaam: z.string().optional(),
  /** Backlog 2026-09-04 — zelfde reden als dealNaam: zonder dit zou een notitie/map die nog niet
   * opgeslagen is (alleen op de vergelijkingspagina getypt) verloren kunnen gaan als je via
   * /woning/nieuw?deal=<id> de as-is bewerkt en weer teruggaat zonder tussentijds op te slaan. */
  dealNotitie: z.string().optional(),
  dealMap: z.string().optional(),
  dealScenarios: z.array(ScenarioSelectie).optional(),
});
export type OpgeslagenPandContext = z.infer<typeof OpgeslagenPandContext>;

export function slaPandOp(context: OpgeslagenPandContext): void {
  sessionStorage.setItem(HUIDIG_PAND_SESSIONSTORAGE_KEY, JSON.stringify(context));
}

/** `null` als er niets (geldigs) staat opgeslagen. */
export function haalPandOp(): OpgeslagenPandContext | null {
  const ruw = sessionStorage.getItem(HUIDIG_PAND_SESSIONSTORAGE_KEY);
  if (!ruw) return null;
  try {
    const resultaat = OpgeslagenPandContext.safeParse(JSON.parse(ruw));
    return resultaat.success ? resultaat.data : null;
  } catch {
    return null;
  }
}
