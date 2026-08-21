import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { bepaalMaxHuur } from './huurprijs';

const tarievenset = getTarievenset('2026-01-01');

describe('bepaalMaxHuur (Bijlage 1, §2.1.8)', () => {
  it('leest de tabel direct af bij ≤ 250 punten', () => {
    expect(bepaalMaxHuur(60, tarievenset).maxHuurEuro).toBe(611.28);
    expect(bepaalMaxHuur(250, tarievenset).maxHuurEuro).toBe(1613.63);
    expect(bepaalMaxHuur(0, tarievenset).maxHuurEuro).toBe(0);
  });

  it('extrapoleert boven 250 punten met het verschil tussen 249 en 250 (§2.1.8)', () => {
    // verschil 250 - 249 = 1613,63 - 1608,36 = 5,27
    const uitkomst = bepaalMaxHuur(255, tarievenset);
    expect(uitkomst.maxHuurEuro).toBeCloseTo(1613.63 + 5 * 5.27, 2);
  });

  it('klemt een negatief puntenaantal op 0', () => {
    expect(bepaalMaxHuur(-4, tarievenset).maxHuurEuro).toBe(0);
  });
});
