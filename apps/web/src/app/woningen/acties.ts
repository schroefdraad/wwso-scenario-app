import { magDealBewerken, type Deal, type Toegang } from '../../lib/deals/types';

export type WoningMenuItem = 'kopieren' | 'verwijderen' | 'verwijderen-niet-toegestaan';

/**
 * Wat er in het ⋯-menu van een woning staat (keuze eigenaar 2026-10-06, optie A uit
 * `outputs/PLAN_woningacties_menu_2026-10-06.md`). Kopiëren kan altijd; verwijderen alleen als
 * `magDealBewerken` het toestaat — anders een uitleg in plaats van een verborgen optie. RLS blijft
 * de echte afdwinging.
 */
export function woningMenuItems(
  deal: Pick<Deal, 'orgId' | 'isDemo'>,
  toegang: Toegang,
): WoningMenuItem[] {
  return [
    'kopieren',
    magDealBewerken(deal, toegang) ? 'verwijderen' : 'verwijderen-niet-toegestaan',
  ];
}

/** Welke knop in het bevestigingsvenster de focus krijgt (en dus Enter afvangt): de veilige keuze. */
export const BEVESTIG_STANDAARD = 'annuleren' as const;
