import type { PandInvoer } from '../../types/index.js';
import { kleiweg179bKamer2 } from './kleiweg-179b-kamer2.js';

/**
 * Golden-master scenario — Kleiweg 179-B, Rotterdam, "3e slaapkamer" (21,6 m²).
 *
 * Bron: `resources/golden-master/Slaapkamer 3 - A++.pdf`, officiële "Resultaat
 * Huurprijscheck", ingevuld 6-7-2026. Uitkomst volgens de site: 74 punten, € 685,17
 * (Woonruimte 32,75, Binnenruimtes 40,75, Buitenruimtes 0 — geen aparte regel op de site).
 *
 * Zelfde pand en dezelfde gedeelde voorzieningen als `kleiweg-179b-kamer2.ts` (twee
 * keukens, drie badruimten, twee toiletruimten — identieke m² en voorzieningen op alle
 * drie de Kleiweg-brondocumenten), vandaar het hergebruik van die ruimtes/keukens/sanitair.
 * Alleen de eigen kamer verschilt: 21,6 m², wél verwarmd, geen eigen buitenruimte.
 */
const basis = kleiweg179bKamer2;

export const kleiweg179bKamer3: PandInvoer = {
  ...basis,
  pand: { ...basis.pand },
  ruimtes: [
    { nr: 1, naam: '3e slaapkamer', type: 'Privévertrek', oppervlakteM2: 21.6, verdieping: 2, verwarmd: true, verkoeld: false },
    ...basis.ruimtes.slice(1, 8),
  ],
  toewijzing: basis.toewijzing.slice(0, 8),
  keukens: basis.keukens,
  sanitair: basis.sanitair,
};
