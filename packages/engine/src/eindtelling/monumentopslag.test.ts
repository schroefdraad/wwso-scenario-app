import { describe, expect, it } from 'vitest';
import type { Pand } from '../types/index.js';
import { bepaalMonumentopslag } from './monumentopslag.js';

const BASIS_PAND: Pand = {
  adres: 'Teststraat 1',
  stad: 'Rotterdam',
  wozWaarde: 300000,
  wozPeildatum: '2025-01-01',
  wozOppervlak: 100,
  coropGebied: 'Groot-Rijnmond',
  energielabel: 'D',
  energielabelIngangsdatum: '2023-01-01',
  bouwjaar: 1990,
  soortWoning: 'Meergezins',
  aantalKamers: 1,
  aantalWoningenInComplex: 1,
  monument: 'Geen',
};

describe('bepaalMonumentopslag (§2.14)', () => {
  it('geeft geen opslag zonder monumentstatus', () => {
    const uitkomst = bepaalMonumentopslag(BASIS_PAND);
    expect(uitkomst.percentage).toBe(0);
    expect(uitkomst.extraPunten).toBe(0);
  });

  it('geeft +35% voor een Rijksmonument met een contract op of na 1 juli 2024', () => {
    const uitkomst = bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Rijks', huurovereenkomstDatum: '2024-07-01' });
    expect(uitkomst.percentage).toBe(35);
    expect(uitkomst.extraPunten).toBe(0);
  });

  it('geeft +10 punten (geen prijsopslag) voor een Rijksmonument met een contract vóór 1 juli 2024', () => {
    const uitkomst = bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Rijks', huurovereenkomstDatum: '2024-06-30' });
    expect(uitkomst.percentage).toBe(0);
    expect(uitkomst.extraPunten).toBe(10);
  });

  it('gooit een fout als een Rijksmonument geen huurovereenkomstDatum heeft', () => {
    expect(() => bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Rijks' })).toThrow();
  });

  it('geeft +15% voor een gemeentelijk monument', () => {
    expect(bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Gemeente' }).percentage).toBe(15);
  });

  it('geeft +15% voor een provinciaal monument', () => {
    expect(bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Provinciaal' }).percentage).toBe(15);
  });

  it('geeft +5% voor beschermd dorpsgezicht bij een pand van vóór 1965', () => {
    const uitkomst = bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Beschermd dorpsgezicht', bouwjaar: 1960 });
    expect(uitkomst.percentage).toBe(5);
  });

  it('geeft geen opslag voor beschermd dorpsgezicht bij een pand van 1965 of later (§2.13.5)', () => {
    const uitkomst = bepaalMonumentopslag({ ...BASIS_PAND, monument: 'Beschermd dorpsgezicht', bouwjaar: 1965 });
    expect(uitkomst.percentage).toBe(0);
  });
});
