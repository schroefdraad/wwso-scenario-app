import { describe, expect, it } from 'vitest';
import { alleGemeentes, coropVoorGemeente, gemeentesVoorWoonplaats } from './index';

describe('geografie — gemeente/COROP-afleiding (2026-09-04)', () => {
  it('kent 342 gemeentes', () => {
    expect(alleGemeentes().length).toBe(342);
  });

  it('vindt het COROP-gebied van een bekende gemeente', () => {
    expect(coropVoorGemeente('Rotterdam')).toBe('Groot-Rijnmond');
    expect(coropVoorGemeente('Amsterdam')).toBe('Groot Amsterdam');
    expect(coropVoorGemeente("'s-Gravenhage")).toBe("Agglomeratie 's-Gravenhage");
  });

  it('geeft undefined voor een onbekende gemeente, geen gok', () => {
    expect(coropVoorGemeente('Bestaat Niet')).toBeUndefined();
  });

  it('suggereert exact één gemeente voor een ondubbelzinnige woonplaats', () => {
    expect(gemeentesVoorWoonplaats('Utrecht')).toEqual(['Utrecht']);
    // Hoofdletterongevoelig
    expect(gemeentesVoorWoonplaats('utrecht')).toEqual(['Utrecht']);
  });

  it('geeft meerdere kandidaten voor een dubbele plaatsnaam (het scenario uit de feedback)', () => {
    const kandidaten = gemeentesVoorWoonplaats('Aalst');
    expect(kandidaten.length).toBeGreaterThan(1);
    expect(kandidaten).toContain('Zaltbommel');
  });

  it('geeft een lege lijst voor een onbekende plaatsnaam', () => {
    expect(gemeentesVoorWoonplaats('Dit Bestaat Niet Als Plaats')).toEqual([]);
  });

  it('elke gesuggereerde gemeente heeft ook echt een COROP-gebied', () => {
    for (const gemeente of alleGemeentes()) {
      expect(coropVoorGemeente(gemeente)).toBeDefined();
    }
  });
});
