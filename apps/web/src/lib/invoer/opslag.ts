import type { InvoerState } from './types';
import { maakBrug, SESSIE_SLEUTELS } from '../sessie/brug';

/**
 * Concept-autosave voor /woning/nieuw. Losstaand van `lib/resultaat/opslag.ts` (dat draagt de
 * AFGERONDE, Zod-gevalideerde `PandInvoer` over naar het resultaatscherm) — dit hier is de ruwe,
 * mogelijk onvolledige werkstate zelf, weggeschreven tijdens het typen zodat een refresh/terug-
 * navigatie/tabblad-sluiten vóór "Doorrekenen" het werk niet verliest.
 */
export const INVOER_CONCEPT_SESSIONSTORAGE_KEY = SESSIE_SLEUTELS.invoerConcept;

/** Geen Zod-schema hier: dit is geen officieel gevalideerd model, alleen een ruwe werkstate. */
const brug = maakBrug(SESSIE_SLEUTELS.invoerConcept, (ruw) => {
  const r = ruw as Partial<InvoerState> | null;
  return r && typeof r === 'object' && r.pand && Array.isArray(r.ruimtes) ? (r as InvoerState) : null;
});

export function slaConceptOp(state: InvoerState): void {
  brug.zet(state);
}

/** `null` als er niets (geldigs) staat opgeslagen. */
export function haalConceptOp(): InvoerState | null {
  return brug.haal();
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
  brug.wis();
}

/**
 * Hoort deze werkstate als concept bewaard te worden? Alleen een verse, nog niet aan een woning of
 * scenario gekoppelde invoer (staat-navigatie-audit 2026-10-03, bevestigd in de browser: na een
 * scenario bewerken opende "+ Nieuwe woning" het oude scenario, mét "Gebruik als scenario →" naar
 * de vergelijking van die andere woning). Een gekoppelde state heeft het concept niet nodig: een
 * woning laadt bij een refresh opnieuw uit Supabase via `?deal=`, een scenario via de
 * scenario-bewerk-brug via `?scenario=`. Zo'n state als concept laten staan is precies wat later
 * een verse "+ Nieuwe woning"-sessie vervuilt — dus wissen i.p.v. bewaren.
 */
export function isLosConcept(state: Pick<InvoerState, 'bewerktDeal' | 'handmatigScenario'>): boolean {
  return !state.bewerktDeal && !state.handmatigScenario;
}
