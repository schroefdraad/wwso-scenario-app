import { describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import { bepaalWaarschuwingen } from './afgeleide-staat';
import { pandInvoerNaarState } from './vanPandInvoer';

// Audit 2026-10-06, besluit eigenaar: te kleine ruimtes krijgen minder punten én een zichtbare
// waarschuwing in de invoer (geen stille herindeling, harde regel 6).
describe('waarschuwing bij ruimtes die anders tellen dan ingevoerd', () => {
  it('toiletruimte van 1,5 m² telt niet mee voor de oppervlakte', () => {
    const teksten = bepaalWaarschuwingen(pandInvoerNaarState(testpand6Kamers)).map((w) => w.tekst);
    expect(teksten.some((t) => t.includes('Toiletruimte begane grond') && t.includes('2 m²'))).toBe(true);
  });

  it('privévertrek van 3 m² telt als overige ruimte', () => {
    const state = pandInvoerNaarState(testpand6Kamers);
    state.ruimtes = state.ruimtes.map((r) => (r.nr === 1 ? { ...r, oppervlakteM2: '3' } : r));
    const tekst = bepaalWaarschuwingen(state).find((w) => w.ruimteId === state.ruimtes[0]!.id)?.tekst ?? '';
    expect(tekst).toMatch(/kleiner dan 4 m².*overige ruimte/);
  });
});
