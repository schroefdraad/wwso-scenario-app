import { describe, expect, it } from 'vitest';
import { isZojuistGekoppeld, markeerZojuistGekoppeld } from './koppeling';

describe('randgeval 2026-10-03 — woning in de URL na de eerste opslag, zonder opnieuw te laden', () => {
  it('de eigen URL-wissel wordt één keer herkend en daarna gewoon weer geladen', () => {
    markeerZojuistGekoppeld('w1');
    expect(isZojuistGekoppeld('w1')).toBe(true);
    // Een volgende keer (bijv. terugnavigeren naar dezelfde woning) moet hij wél laden.
    expect(isZojuistGekoppeld('w1')).toBe(false);
  });

  it('een ándere woning in de URL wordt nooit overgeslagen', () => {
    markeerZojuistGekoppeld('w1');
    expect(isZojuistGekoppeld('w2')).toBe(false);
    expect(isZojuistGekoppeld(null)).toBe(false);
  });
});
