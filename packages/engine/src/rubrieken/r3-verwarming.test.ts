import { describe, expect, it } from 'vitest';
import { berekenR3 } from './r3-verwarming.js';
import { maakPandInvoer } from './test-utils.js';

describe('R3 — Verwarming en verkoeling', () => {
  it('telt 2 punten per verwarmd privévertrek', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR3(input).perKamer[1]).toBe(2);
  });

  it('blijft op 4 punten bij precies 5 verwarmde overige ruimten', () => {
    const ruimtes = Array.from({ length: 5 }, (_, i) => ({
      nr: i + 1,
      naam: `Berging ${i + 1}`,
      type: 'Berging' as const,
      oppervlakteM2: 3,
      verdieping: 0,
      verwarmd: true,
      verkoeld: false,
    }));
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes,
      toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    });
    expect(berekenR3(input).perKamer[1]).toBe(4);
  });

  it('blijft op 2 punten bij meer dan 2 verkoelde ruimten', () => {
    const ruimtes = Array.from({ length: 3 }, (_, i) => ({
      nr: i + 1,
      naam: `Kamer ${i + 1}`,
      type: 'Privévertrek' as const,
      oppervlakteM2: 10,
      verdieping: 0,
      verwarmd: false,
      verkoeld: true,
    }));
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes,
      toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    });
    expect(berekenR3(input).perKamer[1]).toBe(2);
  });

  it('telt verwarming en verkoeling van dezelfde ruimte onafhankelijk mee', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: true }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // 2 pt verwarmd + 1 pt verkoeld = 3 pt
    expect(berekenR3(input).perKamer[1]).toBe(3);
  });

  it('deelt verwarmingspunten van een gedeelde keuken door het aantal kamers, met kwartpuntsafronding', () => {
    const kamers = [1, 2, 3];
    const ruimtes = [
      { nr: 1, naam: 'Gedeelde keuken', type: 'Keuken' as const, oppervlakteM2: 8, verdieping: 0, verwarmd: true, verkoeld: false },
    ];
    const input = maakPandInvoer({
      aantalKamers: 3,
      ruimtes,
      toewijzing: [{ ruimteNr: 1, kamers }],
    });
    const resultaat = berekenR3(input);
    // 2 pt / 3 kamers = 0.6667 → FLOOR(0.6667 + 0.125, 0.25) = 0.75
    for (const kamer of kamers) {
      expect(resultaat.perKamer[kamer]).toBe(0.75);
    }
  });
});
