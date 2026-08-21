import { describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import { puntenrapportBestandsnaam } from './bestandsnaam';

describe('puntenrapportBestandsnaam', () => {
  it('slugificeert het adres en neemt de tarieven-peildatum mee', () => {
    const naam = puntenrapportBestandsnaam(testpand6Kamers, '2026-01-01');
    expect(naam).toBe(`puntentelling-${testpand6Kamers.pand.adres.toLowerCase().replace(/\s+/g, '-')}-2026-01-01.pdf`);
  });

  it('strippt diakrieten en niet-alfanumerieke tekens', () => {
    const pand = { ...testpand6Kamers, pand: { ...testpand6Kamers.pand, adres: 'Crooswijkseweg 95-A03 (kámer 1)' } };
    expect(puntenrapportBestandsnaam(pand, '2026-01-01')).toBe('puntentelling-crooswijkseweg-95-a03-kamer-1-2026-01-01.pdf');
  });

  it('valt terug op "pand" bij een leeg adres', () => {
    const pand = { ...testpand6Kamers, pand: { ...testpand6Kamers.pand, adres: '' } };
    expect(puntenrapportBestandsnaam(pand, '2026-01-01')).toBe('puntentelling-pand-2026-01-01.pdf');
  });
});
