import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import type { Ruimte, RuimteType } from '../types/index';
import { berekenR1 } from './r1-oppervlakte-vertrekken';
import { berekenR2 } from './r2-oppervlakte-overige-ruimten';
import { berekenR3 } from './r3-verwarming';
import { berekenR4 } from './r4-energieprestatie';
import { berekenR9 } from './r9-gemeenschappelijke-ruimten';
import { berekenR13 } from './r13-aftrekpunten';
import { maakPandInvoer } from './test-utils';

const tarievenset = getTarievenset('2026-01-01');

function ruimte(nr: number, type: RuimteType, m2: number, extra: Partial<Ruimte> = {}): Ruimte {
  return {
    nr,
    naam: `Ruimte ${nr}`,
    type,
    oppervlakteM2: m2,
    verdieping: 0,
    verwarmd: false,
    verkoeld: false,
    ...extra,
  };
}

function eenKamer(ruimtes: Ruimte[], pand = {}) {
  return maakPandInvoer({
    aantalKamers: 1,
    ruimtes,
    toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    pand,
  });
}

// Audit 2026-10-06, besluit eigenaar "waarschuwing én minder punten conform beleid".
describe('minimummaten vertrek en overige ruimte (§2.2.1.2, §2.2.2.2)', () => {
  it('privévertrek kleiner dan 4 m² telt als overige ruimte, niet als vertrek', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 20), ruimte(2, 'Privévertrek', 3.5)]);
    expect(berekenR1(input).perKamer[1]).toBe(20);
    expect(berekenR2(input).perKamer[1]).toBe(3); // 3,5 → 4 m² × 0,75
  });

  it('privévertrek kleiner dan 2 m² telt helemaal niet mee', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 20), ruimte(2, 'Privévertrek', 1.5)]);
    expect(berekenR1(input).perKamer[1]).toBe(20);
    expect(berekenR2(input).perKamer[1]).toBe(0);
  });

  it('overige ruimte kleiner dan 2 m² telt niet mee', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 20), ruimte(2, 'Berging', 1.95)]);
    expect(berekenR2(input).perKamer[1]).toBe(0);
  });

  it('keuken en badkamer zijn altijd een vertrek, ook als ze klein zijn (§2.2.1)', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 20), ruimte(2, 'Badruimte', 3)]);
    expect(berekenR1(input).perKamer[1]).toBe(23);
  });

  it('een te klein verwarmd vertrek krijgt verwarmingspunten als overige ruimte (1 i.p.v. 2)', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 3, { verwarmd: true })]);
    expect(berekenR3(input).perKamer[1]).toBe(1);
  });

  it('een te klein vertrek telt niet mee voor R4 en wel voor de R13-ondergrens', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 10), ruimte(2, 'Privévertrek', 3)], {
      energielabel: 'A',
    });
    expect(berekenR4(input, tarievenset).perKamerRuw[1]).toBeCloseTo(10 * 0.65, 10);
    const klein = eenKamer([ruimte(1, 'Privévertrek', 6), ruimte(2, 'Privévertrek', 3)]);
    // R1-oppervlakte is 6 m² (< 8), de 3 m² telt niet als vertrek → aftrek
    expect(berekenR13(klein, tarievenset).perKamer[1]).toBe(-4);
  });

  it('gemeenschappelijk vertrek kleiner dan 4 m² telt als gemeenschappelijke overige ruimte', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [ruimte(1, 'Gemeenschappelijk vertrek', 3, { aantalAdressenMetToegang: 1 })],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
    });
    // 3 × 0,75 / 2 = 1,125 → 1,25
    expect(berekenR9(input, tarievenset).perKamer[1]).toBe(1.25);
  });

  it('meldt de herindeling in de toelichting', () => {
    const input = eenKamer([ruimte(1, 'Privévertrek', 20), ruimte(2, 'Privévertrek', 3.5)]);
    expect(berekenR2(input).toelichting.join(' ')).toMatch(/kleiner dan 4 m².*overige ruimte/);
  });
});

describe('zolder als vertrek: vaste trap én beschoten dak (§2.2.1.3)', () => {
  it('zolder-privévertrek zonder beschoten dak telt als overige ruimte', () => {
    const input = eenKamer([
      ruimte(1, 'Privévertrek', 10, { zolder: { vasteTrap: true, beschotenDak: false } }),
    ]);
    expect(berekenR1(input).perKamer[1]).toBe(0);
    expect(berekenR2(input).perKamer[1]).toBe(7.5);
  });

  it('zolder-privévertrek zonder vaste trap: overige ruimte én 5 punten aftrek (§2.2.2.3)', () => {
    const input = eenKamer([
      ruimte(1, 'Privévertrek', 10, { zolder: { vasteTrap: false, beschotenDak: true } }),
    ]);
    expect(berekenR1(input).perKamer[1]).toBe(0);
    expect(berekenR2(input).perKamer[1]).toBe(2.5);
  });

  it('zolder met vaste trap en beschoten dak blijft een vertrek', () => {
    const input = eenKamer([
      ruimte(1, 'Privévertrek', 10, { zolder: { vasteTrap: true, beschotenDak: true } }),
    ]);
    expect(berekenR1(input).perKamer[1]).toBe(10);
  });
});

// Audit 2026-10-06 bevinding 3.1: R4 rekent over privé én toegerekende gemeenschappelijke
// vertrekken. Het voorbeeld uit §2.4.4 letterlijk: 20 m² privé + woonkamer 40 m² / 4 = 30 m²,
// label A → 30 × 0,65 = 19,50.
describe('R4 telt gemeenschappelijke vertrekken mee (§2.4.4)', () => {
  it('voorbeeld uit het Beleidsboek: (20 + 40/4) × 0,65 = 19,50', () => {
    const input = maakPandInvoer({
      aantalKamers: 4,
      ruimtes: [
        ruimte(1, 'Privévertrek', 20),
        ruimte(2, 'Gemeenschappelijk vertrek', 40, { aantalAdressenMetToegang: 1 }),
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1, 2, 3, 4] },
      ],
      pand: { energielabel: 'A' },
    });
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(19.5);
  });

  it('deelt ook door het aantal adressen met toegang, zoals R9', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [ruimte(1, 'Gemeenschappelijk vertrek', 40, { aantalAdressenMetToegang: 2 })],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
      pand: { energielabel: 'A' },
    });
    // 40 / 2 adressen / 2 kamers = 10 m² × 0,65 = 6,5
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(6.5);
  });
});
