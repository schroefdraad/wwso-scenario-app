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

/**
 * Wist het concept expliciet (backlog 2026-09-08, gemeld via Steven Kramer: "ik moet Puntum eerst
 * sluiten voordat ik een nieuwe woning kan bekijken"/"nieuwe woning aan mijn map toevoegen lukt
 * niet"). Root cause: deze sleutel wist zichzelf nooit, dus een verse "+ Nieuwe woning" viel terug
 * op het achtergebleven concept van de LAATST bewerkte woning — inclusief een eventuele koppeling
 * aan die bestaande deal (`bewerktDeal`), waardoor "opslaan" op de nieuwe invoer in werkelijkheid
 * de oude woning overschreef i.p.v. een nieuwe aan te maken. Gebruikt door `InvoerContext` zodra
 * een teruggehaald concept een `bewerktDeal`-koppeling blijkt te dragen op een plek waar dat niet
 * hoort (een verse, dealloze `/woning/nieuw`-sessie).
 */
export function wisConceptOp(): void {
  sessionStorage.removeItem(INVOER_CONCEPT_SESSIONSTORAGE_KEY);
}
