import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenEindtelling } from '../../eindtelling/index';
import { maakPandInvoer, maakSanitair } from '../../rubrieken/test-utils';
import { analyseerMarge } from '../marge-analyse';
import type { MaatregelContext } from '../types';
import { standaardRegistry } from './index';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = tarievenset.peildatum;

const privevertrek = (nr: number) => ({
  nr,
  naam: `Kamer ${nr}`,
  type: 'Privévertrek' as const,
  oppervlakteM2: 12,
  verdieping: 0,
  verwarmd: true,
  verkoeld: false,
});

describe('S-01 — wastafel op kamer (registry-kandidaten)', () => {
  it('stelt geen kandidaat voor als de kamer al aan de cap van 1 punt buiten de badkamer zit', () => {
    // Bugfix 2026-08-24 (gevonden op de Crooswijkseweg-testdeal): een privévertrek met al 1
    // wastafel zit al aan `wastafelPuntenPerVertrekBuitenBadkamer` (1 punt) — een 2e wastafel
    // levert dan 0 extra punten op en moet dus niet meer als kandidaat verschijnen.
    const ruimte1 = privevertrek(1);
    const ruimte2 = privevertrek(2);
    const pand = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [ruimte1, ruimte2],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [2] },
      ],
      sanitair: [maakSanitair({ ruimteNr: 1, aantalWastafels: 1 })],
    });
    const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
    const marge = analyseerMarge(pand, tarievenset, eindtelling);
    const ctx: MaatregelContext = { pand, tarievenset, peildatum, eindtelling, marge };

    const kandidaten = standaardRegistry.get('S-01')!.kandidaten(ctx);
    const kamers = kandidaten.map((k) => k.doel.nr);

    expect(kamers).not.toContain(1); // al aan de cap, geen marginale winst
    expect(kamers).toContain(2); // nog geen wastafel, wel marginale winst
  });
});
