import type { PandInvoer } from '../types/index';
import { testpand6Kamers } from './testpand-6kamers';

/**
 * Variant van `testpand6Kamers`, gebouwd voor taak 11 (§8c van het ontwerp,
 * `outputs/RAPPORT_taak11_2026-08-20.md`). De basisfixture heeft een geldig energielabel, geen
 * aftreksituaties en al een aanbelfunctie — E-09, A-01/A-02/A-03 en X-01 zouden daar dus geen
 * kandidaat zijn, en de drie pakketten zouden mager blijven. Deze variant raakt minstens één
 * maatregel uit elke tier:
 *
 * - `energielabelIngangsdatum` ruim voorbij de 10-jaars geldigheid (§2.4.3) → E-09 wordt
 *   parametervrij kandidaat (goedkoop, geen vergunning → Basis).
 * - Kamer 4 in `ruitoppervlakteOnvoldoende` → A-01 wordt kandidaat (vergunning → Comfort/Maximaal).
 * - Geen aanbelfunctie → X-01 wordt kandidaat.
 * - De parkeerplek heeft geen laadpaal → P-01 wordt kandidaat.
 * - Ruimte 14 (zolderberging) heeft al geen vaste trap in de basisfixture → I-04 (vorm a) is
 *   hier al kandidaat, geen wijziging nodig.
 */
export const testpandSuggesties: PandInvoer = {
  ...testpand6Kamers,
  pand: {
    ...testpand6Kamers.pand,
    energielabelIngangsdatum: '2014-03-01',
  },
  parkeerplekken: testpand6Kamers.parkeerplekken.map((p) => ({ ...p, laadpaal: false })),
  handmatigePosten: {
    ...testpand6Kamers.handmatigePosten,
    aanbelfuncties: [],
    aftrekSituaties: {
      ...testpand6Kamers.handmatigePosten.aftrekSituaties,
      ruitoppervlakteOnvoldoende: [4],
    },
  },
};
