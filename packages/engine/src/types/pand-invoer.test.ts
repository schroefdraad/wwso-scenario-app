import { describe, expect, it } from 'vitest';
import { PandInvoer, RuimteType } from './index.js';
import { testpand6Kamers } from '../fixtures/testpand-6kamers.js';

describe('PandInvoer — testpand van 6 kamers', () => {
  it('parseert zonder fouten', () => {
    const result = PandInvoer.safeParse(testpand6Kamers);
    expect(result.success).toBe(true);
  });

  it('gaat verliesvrij door het model — parse + serialize levert exact dezelfde data op', () => {
    const parsed = PandInvoer.parse(testpand6Kamers);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(JSON.parse(JSON.stringify(testpand6Kamers)));
  });

  it('gebruikt elk van de 13 ruimtetypen minstens één keer in de fixture-set', () => {
    const gebruikt = new Set(testpand6Kamers.ruimtes.map((r) => r.type));
    for (const type of RuimteType.options) {
      expect(gebruikt.has(type), `type ontbreekt in fixture: ${type}`).toBe(true);
    }
  });

  it('bevat de twee ruimtetypen die TODO-04 in de xlsx nog mist', () => {
    const types = testpand6Kamers.ruimtes.map((r) => r.type);
    expect(types).toContain('Gemeenschappelijk vertrek');
    expect(types).toContain('Gemeenschappelijke overige ruimte');
  });

  it('wijst een toewijzing naar een niet-bestaande ruimte af', () => {
    const kapot = {
      ...testpand6Kamers,
      toewijzing: [...testpand6Kamers.toewijzing, { ruimteNr: 99, kamers: [1] }],
    };
    const result = PandInvoer.safeParse(kapot);
    expect(result.success).toBe(false);
  });

  it('wijst een toewijzing naar een kamer buiten aantalKamers af', () => {
    const kapot = {
      ...testpand6Kamers,
      toewijzing: [...testpand6Kamers.toewijzing, { ruimteNr: 1, kamers: [7] }],
    };
    const result = PandInvoer.safeParse(kapot);
    expect(result.success).toBe(false);
  });

  it('wijst dubbele ruimte-nummers af', () => {
    const kapot = {
      ...testpand6Kamers,
      ruimtes: [...testpand6Kamers.ruimtes, { ...testpand6Kamers.ruimtes[0] }],
    };
    const result = PandInvoer.safeParse(kapot);
    expect(result.success).toBe(false);
  });

  it('wijst een handmatige R7-post op een niet-bestaande kamer af', () => {
    const kapot = {
      ...testpand6Kamers,
      handmatigePosten: {
        ...testpand6Kamers.handmatigePosten,
        gemeenschappelijkeVertrekken: [
          ...testpand6Kamers.handmatigePosten.gemeenschappelijkeVertrekken,
          { kamer: 12, punten: 1 },
        ],
      },
    };
    const result = PandInvoer.safeParse(kapot);
    expect(result.success).toBe(false);
  });
});
