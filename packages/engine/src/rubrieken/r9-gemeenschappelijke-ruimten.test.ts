import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR9 } from './r9-gemeenschappelijke-ruimten.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');

describe('R9 — Gemeenschappelijke vertrekken, overige ruimten en voorzieningen (§2.9)', () => {
  it('waardeert een gemeenschappelijk vertrek met 1 pt/m², dubbel gedeeld', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [
        {
          nr: 1,
          naam: 'Woonkamer',
          type: 'Gemeenschappelijk vertrek',
          oppervlakteM2: 16,
          verdieping: 0,
          verwarmd: false,
          verkoeld: false,
          aantalAdressenMetToegang: 2,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
    });
    // 16 / 2 adressen / 2 kamers = 4 pt
    expect(berekenR9(input, tarievenset).perKamer[1]).toBe(4);
  });

  it('waardeert een gemeenschappelijke overige ruimte met 0,75 pt/m²', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        {
          nr: 1,
          naam: 'Fietsenberging',
          type: 'Gemeenschappelijke overige ruimte',
          oppervlakteM2: 8,
          verdieping: 0,
          verwarmd: false,
          verkoeld: false,
          aantalAdressenMetToegang: 1,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR9(input, tarievenset).perKamer[1]).toBe(6);
  });

  it('past bij een zorgwoning de vuistregel van 3 pt per woning toe, ongeacht ingevoerde ruimtes (§2.9.4)', () => {
    const input = maakPandInvoer({
      aantalKamers: 3,
      ruimtes: [
        {
          nr: 1,
          naam: 'Woonkamer',
          type: 'Gemeenschappelijk vertrek',
          oppervlakteM2: 100,
          verdieping: 0,
          verwarmd: false,
          verkoeld: false,
          aantalAdressenMetToegang: 1,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2, 3] }],
      handmatigePosten: {
        woonvoorzieningenHandicap: [],
        aanbelfuncties: [],
        losseLaadpalen: [],
        aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
        zorgwoning: true,
      },
    });
    const resultaat = berekenR9(input, tarievenset);
    for (const kamer of [1, 2, 3]) {
      expect(resultaat.perKamer[kamer]).toBe(3);
    }
  });

  it('geeft 0 punten zonder gemeenschappelijke ruimten', () => {
    const input = maakPandInvoer({ aantalKamers: 1, ruimtes: [], toewijzing: [] });
    expect(berekenR9(input, tarievenset).perKamer[1]).toBe(0);
  });
});
