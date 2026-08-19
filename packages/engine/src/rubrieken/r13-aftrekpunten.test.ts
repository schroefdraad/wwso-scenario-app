import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR13 } from './r13-aftrekpunten.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');

describe('R13 — Aftrekpunten (§2.13)', () => {
  it('trekt 4 punten af bij een R1-oppervlakte kleiner dan 8 m²', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Kamer', type: 'Privévertrek', oppervlakteM2: 7, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR13(input, tarievenset).perKamer[1]).toBe(-4);
  });

  it('trekt niets af bij een R1-oppervlakte van precies 8 m²', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Kamer', type: 'Privévertrek', oppervlakteM2: 8, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR13(input, tarievenset).perKamer[1]).toBe(0);
  });

  it('telt meerdere situaties onafhankelijk op', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Kamer', type: 'Privévertrek', oppervlakteM2: 7, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      handmatigePosten: {
        woonvoorzieningenHandicap: [],
        aanbelfuncties: [],
        losseLaadpalen: [],
        aftrekSituaties: {
          verhuurderCriterium: [1],
          ruitoppervlakteOnvoldoende: [],
          raamkozijnTeHoog: [],
        },
        zorgwoning: false,
      },
    });
    // < 8 m² (-4) + verhuurdercriterium (-4) = -8
    expect(berekenR13(input, tarievenset).perKamer[1]).toBe(-8);
  });
});
