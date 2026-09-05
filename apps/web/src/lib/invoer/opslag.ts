import type { InvoerState } from './types';

/**
 * Concept-autosave voor /woning/nieuw. Losstaand van `lib/resultaat/opslag.ts` (dat draagt de
 * AFGERONDE, Zod-gevalideerde `PandInvoer` over naar het resultaatscherm) — dit hier is de ruwe,
 * mogelijk onvolledige werkstate zelf, weggeschreven tijdens het typen zodat een refresh/terug-
 * navigatie/tabblad-sluiten vóór "Doorrekenen" het werk niet verliest.
 */
export const INVOER_CONCEPT_SESSIONSTORAGE_KEY = 'wwso:invoer-concept';

export function slaConceptOp(state: InvoerState): void {
  sessionStorage.setItem(INVOER_CONCEPT_SESSIONSTORAGE_KEY, JSON.stringify(state));
}

/** `null` als er niets (geldigs) staat opgeslagen — geen Zod-schema hier, dit is geen officieel gevalideerd model, alleen een ruwe werkstate. */
export function haalConceptOp(): InvoerState | null {
  const ruw = sessionStorage.getItem(INVOER_CONCEPT_SESSIONSTORAGE_KEY);
  if (!ruw) return null;
  try {
    const parsed = JSON.parse(ruw);
    if (!parsed || typeof parsed !== 'object' || !parsed.pand || !Array.isArray(parsed.ruimtes)) return null;
    return parsed as InvoerState;
  } catch {
    return null;
  }
}
