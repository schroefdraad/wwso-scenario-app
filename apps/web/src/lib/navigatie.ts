/**
 * Eén plek voor de URL's tussen invoer, resultaat en vergelijking (staat-navigatie-audit
 * 2026-10-03). Dit bugpatroon kwam sinds augustus 5-6 keer terug, telkens doordat ergens een
 * hardgecodeerd pad zónder `?deal=<id>` werd gebouwd — waarna de pagina terugviel op een
 * sessionStorage-restje (verkeerde woning, of een scenario-pand als as-is). Door alle routes hier
 * te bouwen, hangt de woning-koppeling aan één functie met tests i.p.v. aan elke aanroeper.
 */

export function vergelijkingUrl(dealId: string | undefined): string {
  return dealId ? `/woning/vergelijking?deal=${dealId}` : '/woning/vergelijking';
}

/** As-is-resultaat van een opgeslagen woning. Een scenario-resultaat heeft (nog) geen eigen URL —
 * dat is een lokaal berekende mutatie en loopt via de sessionStorage-brug (`slaPandOp`). */
export function resultaatUrl(dealId: string | undefined): string {
  return dealId ? `/woning/resultaat?deal=${dealId}` : '/woning/resultaat';
}

export function woningBewerkenUrl(dealId: string): string {
  return `/woning/nieuw?deal=${dealId}`;
}

export function scenarioBewerkenUrl(slotIndex: number): string {
  return `/woning/nieuw?scenario=${slotIndex}`;
}

/**
 * Waar haalt de vergelijkingspagina haar woning vandaan?
 * - `?deal=` in de URL → altijd Supabase (de bron, en alleen dan zijn de bewerkrechten bekend);
 * - geen `?deal=`, maar het sessionStorage-restje noemt wél een opgeslagen woning → doorsturen
 *   naar `?deal=`. NOOIT het restje zelf tonen: dat kan het laatst bekeken SCENARIO-pand zijn,
 *   dat dan als as-is verschijnt (incident 2026-09-01);
 * - alleen een nog niet opgeslagen woning mag uit het restje komen.
 */
export type VergelijkingBron<C> = { soort: 'deal'; dealId: string } | { soort: 'doorsturen'; url: string } | { soort: 'sessie'; context: C } | { soort: 'leeg' };

export function bepaalVergelijkingBron<C extends { dealId?: string }>(dealParam: string | null, sessieContext: C | null): VergelijkingBron<C> {
  if (dealParam) return { soort: 'deal', dealId: dealParam };
  if (sessieContext?.dealId) return { soort: 'doorsturen', url: vergelijkingUrl(sessieContext.dealId) };
  if (sessieContext) return { soort: 'sessie', context: sessieContext };
  return { soort: 'leeg' };
}
