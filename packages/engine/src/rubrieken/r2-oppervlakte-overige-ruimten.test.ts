import { describe, expect, it } from 'vitest';
import { berekenR2 } from './r2-oppervlakte-overige-ruimten.js';
import { maakPandInvoer } from './test-utils.js';

describe('R2 — Oppervlakte overige ruimten (§2.2.2)', () => {
  it('telt 0,75 punt per m² over de afgeronde oppervlakte', () => {
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
    // 6 m² × 0,75 = 4,5 punten
    expect(berekenR2(input).perKamer[1]).toBe(4.5);
  });

  it('rondt de oppervlakte af vóór de puntenberekening, niet erna', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Wasruimte', type: 'Wasruimte', oppervlakteM2: 3.2, verdieping: 0, verwarmd: false, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // 3,2 m² → 3 m² → 3 × 0,75 = 2,25 punten.
    // Zou 0,75 × 3,2 = 2,4 eerst berekend en dán op kwartpunten afgerond, dan kwam er 2,5 uit.
    expect(berekenR2(input).perKamer[1]).toBe(2.25);
  });

  it('deelt een gedeelde overige ruimte door het aantal kamers met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [{ nr: 1, naam: 'Gedeelde berging', type: 'Berging', oppervlakteM2: 8, verdieping: 0, verwarmd: false, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
    });
    const resultaat = berekenR2(input);
    // 8/2 = 4 m² × 0,75 = 3 punten per kamer
    expect(resultaat.perKamer[1]).toBe(3);
    expect(resultaat.perKamer[2]).toBe(3);
  });

  it('telt privévertrekken en verkeersruimten niet mee', () => {
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

  it('trekt 5 punten af voor een zolder zonder vaste trap (§2.2.2.3)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        {
          nr: 1,
          naam: 'Zolder',
          type: 'Overige ruimte',
          oppervlakteM2: 10,
          verdieping: 2,
          verwarmd: false,
          verkoeld: false,
          zolder: { vasteTrap: false, beschotenDak: false },
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // 10 m² × 0,75 = 7,5 punten − 5 aftrek = 2,5 punten
    expect(berekenR2(input).perKamer[1]).toBe(2.5);
  });

  it('laat de zolderaftrek de waarde van de zolder niet negatief maken', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        {
          nr: 1,
          naam: 'Kleine zolder',
          type: 'Overige ruimte',
          oppervlakteM2: 4,
          verdieping: 2,
          verwarmd: false,
          verkoeld: false,
          zolder: { vasteTrap: false, beschotenDak: false },
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // 4 m² × 0,75 = 3 punten; aftrek begrensd op 3 → 0 punten, niet −2
    expect(berekenR2(input).perKamer[1]).toBe(0);
  });

  it('trekt niets af bij een zolder mét vaste trap', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        {
          nr: 1,
          naam: 'Zolder',
          type: 'Overige ruimte',
          oppervlakteM2: 10,
          verdieping: 2,
          verwarmd: false,
          verkoeld: false,
          zolder: { vasteTrap: true, beschotenDak: true },
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR2(input).perKamer[1]).toBe(7.5);
  });
});
