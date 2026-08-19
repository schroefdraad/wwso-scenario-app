import { describe, expect, it } from 'vitest';
import { berekenR1 } from './r1-oppervlakte-vertrekken.js';
import { maakPandInvoer } from './test-utils.js';

describe('R1 — Oppervlakte vertrekken', () => {
  it('telt 1 punt per m² privévertrek, afgerond op hele punten', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10.6, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    const resultaat = berekenR1(input);
    expect(resultaat.perKamer[1]).toBe(11); // 10.6 → rondt naar 11
  });

  it('deelt een gedeelde keuken over 4 kamers door het aantal kamers met toegang', () => {
    const ruimtes = [
      { nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
      { nr: 2, naam: 'Kamer 2', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
      { nr: 3, naam: 'Kamer 3', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
      { nr: 4, naam: 'Kamer 4', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
      { nr: 5, naam: 'Gedeelde keuken', type: 'Keuken', oppervlakteM2: 8, verdieping: 0, verwarmd: true, verkoeld: false },
    ] as const;
    const input = maakPandInvoer({
      aantalKamers: 4,
      ruimtes: [...ruimtes],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [2] },
        { ruimteNr: 3, kamers: [3] },
        { ruimteNr: 4, kamers: [4] },
        { ruimteNr: 5, kamers: [1, 2, 3, 4] },
      ],
    });
    const resultaat = berekenR1(input);
    // 10 m² privévertrek + (8 m² / 4 kamers) = 12 punten per kamer, exact (geen afronding nodig)
    for (const kamer of [1, 2, 3, 4]) {
      expect(resultaat.perKamer[kamer]).toBe(12);
    }
  });

  it('telt overige-ruimte- en verkeersruimte-typen niet mee', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 2, naam: 'Berging', type: 'Berging', oppervlakteM2: 5, verdieping: 0, verwarmd: false, verkoeld: false },
        { nr: 3, naam: 'Hal', type: 'Verkeersruimte', oppervlakteM2: 5, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1] },
        { ruimteNr: 3, kamers: [1] },
      ],
    });
    const resultaat = berekenR1(input);
    expect(resultaat.perKamer[1]).toBe(10);
  });
});
