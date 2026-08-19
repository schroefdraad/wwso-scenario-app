import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR11 } from './r11-woz-waarde.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');
// Groot-Rijnmond: 3884 €/m² gemiddeld (tarieven.test.ts)

describe('R11 — Punten voor de WOZ-waarde (§2.11)', () => {
  it('kent 14 punten toe bij meer dan 10% hoger dan het regiogemiddelde', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [],
      toewijzing: [],
      pand: { wozWaarde: 500000, wozOppervlak: 100 }, // 5000/m² vs 3884 → +28,7%
    });
    const resultaat = berekenR11(input, tarievenset);
    expect(resultaat.perKamer[1]).toBe(14);
    expect(resultaat.perKamer[2]).toBe(14);
  });

  it('kent 12 punten toe binnen ±10% van het regiogemiddelde', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [],
      toewijzing: [],
      pand: { wozWaarde: 388400, wozOppervlak: 100 }, // exact gemiddeld
    });
    expect(berekenR11(input, tarievenset).perKamer[1]).toBe(12);
  });

  it('kent 10 punten toe bij meer dan 10% lager dan het regiogemiddelde', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [],
      toewijzing: [],
      pand: { wozWaarde: 200000, wozOppervlak: 100 }, // 2000/m² vs 3884 → -48,5%
    });
    expect(berekenR11(input, tarievenset).perKamer[1]).toBe(10);
  });

  it('valt terug op 85% van de taxatiewaarde zonder WOZ-waarde', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [],
      toewijzing: [],
      pand: { wozWaarde: undefined, taxatiewaardeEuro: 500000 / 0.85, wozOppervlak: 100 },
    });
    expect(berekenR11(input, tarievenset).perKamer[1]).toBe(14);
  });

  it('kent automatisch 10 punten toe zonder WOZ- én zonder taxatiewaarde (B11)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [],
      toewijzing: [],
      pand: { wozWaarde: undefined, wozOppervlak: 100 },
    });
    expect(berekenR11(input, tarievenset).perKamer[1]).toBe(10);
  });
});
