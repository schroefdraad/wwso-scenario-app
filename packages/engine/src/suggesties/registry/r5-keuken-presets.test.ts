import { describe, expect, it } from 'vitest';
import { KITCHENETTE_122_PRESET, KITCHENETTE_240_PRESET } from './r5-keuken';

describe('kitchenette-presets: extra kastruimte', () => {
  // Regressietest voor de vondst van 2026-09-19: beide presets stonden hardcoded op 0 extra
  // kastruimte, terwijl de offerte (resources/Kosten per keukenblok.xlsx) en de bijbehorende
  // productfoto/tekening allebei meer kasten tonen dan de basiseis van 2. Zie de doc-comments bij
  // de presets in r5-keuken.ts voor de volledige onderbouwing.
  it('K-01 (122cm) heeft 2 eenheden extra kastruimte', () => {
    expect(KITCHENETTE_122_PRESET.extra.extraKastruimteEenhedenVan60Cm).toBe(2);
  });

  it('K-09 (240cm) heeft 1 eenheid extra kastruimte', () => {
    expect(KITCHENETTE_240_PRESET.extra.extraKastruimteEenhedenVan60Cm).toBe(1);
  });
});
