import { describe, expect, it } from 'vitest';
import { berekenR1 } from './r1-oppervlakte-vertrekken.js';
import { maakPandInvoer } from './test-utils.js';

describe('R1 — Oppervlakte vertrekken (§2.2.1)', () => {
  it('telt 1 punt per m², met de m²-afronding van §2.1.1.1', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10.6, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // 10,6 m² eindigt op ≥ 0,50 → 11 m² → 11 punten
    expect(berekenR1(input).perKamer[1]).toBe(11);
  });

  it('rondt naar beneden af bij een m²-restant van 0,49 of lager', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 15.43, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // het voorbeeld uit §2.1.1.1: 15,43 m² wordt 15 m²
    expect(berekenR1(input).perKamer[1]).toBe(15);
  });

  it('rondt privé en gemeenschappelijk apart af, niet pas op het totaal', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [
        { nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10.6, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 2, naam: 'Kamer 2', type: 'Privévertrek', oppervlakteM2: 10.6, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 3, naam: 'Gedeelde keuken', type: 'Keuken', oppervlakteM2: 9.2, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [2] },
        { ruimteNr: 3, kamers: [1, 2] },
      ],
    });
    // privé 10,6 → 11 m²; gedeeld 9,2/2 = 4,6 → 5 m²; totaal 16 m² → 16 punten.
    // Zou pas op het totaal worden afgerond (10,6 + 4,6 = 15,2), dan kwam er 15 uit.
    expect(berekenR1(input).perKamer[1]).toBe(16);
  });

  it('deelt een gedeelde keuken over 4 kamers door het aantal kamers met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 4,
      ruimtes: [
        { nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 2, naam: 'Kamer 2', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 3, naam: 'Kamer 3', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 4, naam: 'Kamer 4', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 5, naam: 'Gedeelde keuken', type: 'Keuken', oppervlakteM2: 8, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [2] },
        { ruimteNr: 3, kamers: [3] },
        { ruimteNr: 4, kamers: [4] },
        { ruimteNr: 5, kamers: [1, 2, 3, 4] },
      ],
    });
    const resultaat = berekenR1(input);
    // 10 m² privé + 8/4 = 2 m² gedeeld = 12 punten per kamer
    for (const kamer of [1, 2, 3, 4]) {
      expect(resultaat.perKamer[kamer]).toBe(12);
    }
  });

  it('telt overige ruimten en verkeersruimten niet mee (§2.2.3)', () => {
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
    expect(berekenR1(input).perKamer[1]).toBe(10);
  });
});
