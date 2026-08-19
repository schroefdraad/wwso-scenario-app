import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenR4 } from './r4-energieprestatie.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');

describe('R4 — Energieprestatie', () => {
  it('past de energielabelfactor toe op de R1-grondbasis', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      pand: { energielabel: 'D' },
    });
    // label D: factor 0.2 × 10 m² = 2 pt
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(2);
  });

  it('valt terug op de bouwjaargrens-tabel als er geen energielabel is', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      pand: { energielabel: 'Bouwjaar', bouwjaar: 1995 },
    });
    // bouwjaar 1995 valt onder grens 1999: factor 0.35 × 10 m² = 3.5 pt
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(3.5);
  });

  it('een bouwjaar ver vóór de laagste grens valt onder de laagste grens (geen ondergrens in de tabel)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      pand: { energielabel: 'Bouwjaar', bouwjaar: 1900 },
    });
    // grens 1976 is de laagste "t/m"-grens en dekt alles daaronder: factor -0.15 × 10 m² = -1.5 pt
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(-1.5);
  });

  it('gooit een expliciete fout voor een bouwjaar ná de hoogste grens', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      pand: { energielabel: 'Bouwjaar', bouwjaar: 2150 },
    });
    expect(() => berekenR4(input, tarievenset)).toThrow(/Geen bouwjaargrens gevonden/);
  });
});
