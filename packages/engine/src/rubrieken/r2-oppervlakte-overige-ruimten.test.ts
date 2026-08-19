import { describe, expect, it } from 'vitest';
import { berekenR2 } from './r2-oppervlakte-overige-ruimten.js';
import { maakPandInvoer } from './test-utils.js';

describe('R2 — Oppervlakte overige ruimten', () => {
  it('telt 0,75 punt per m² voor de vijf overige-ruimte-typen, kwartpuntsafronding', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Berging', type: 'Berging', oppervlakteM2: 4, verdieping: 0, verwarmd: false, verkoeld: false },
        { nr: 2, naam: 'Bijkeuken', type: 'Bijkeuken', oppervlakteM2: 2, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1] },
      ],
    });
    // 0,75 × 4 + 0,75 × 2 = 4,5 → precies op een kwartpunt, geen afrondingsverschil
    expect(berekenR2(input).perKamer[1]).toBe(4.5);
  });

  it('rondt af op kwartpunten volgens FLOOR(x + 0.125, 0.25)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      // 0,75 × 3.2 = 2.4 → +0.125 = 2.525 → floor naar kwartpunt = 2.5
      ruimtes: [{ nr: 1, naam: 'Wasruimte', type: 'Wasruimte', oppervlakteM2: 3.2, verdieping: 0, verwarmd: false, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR2(input).perKamer[1]).toBe(2.5);
  });

  it('deelt een gedeelde overige ruimte door het aantal kamers met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [{ nr: 1, naam: 'Gedeelde berging', type: 'Berging', oppervlakteM2: 8, verdieping: 0, verwarmd: false, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
    });
    const resultaat = berekenR2(input);
    // 0,75 × 8 / 2 kamers = 3 punten per kamer
    expect(resultaat.perKamer[1]).toBe(3);
    expect(resultaat.perKamer[2]).toBe(3);
  });

  it('telt privévertrek en verkeersruimte niet mee', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 12, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 2, naam: 'Hal', type: 'Verkeersruimte', oppervlakteM2: 6, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1] },
      ],
    });
    expect(berekenR2(input).perKamer[1]).toBe(0);
  });
});
