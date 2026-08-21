import { describe, expect, it } from 'vitest';
import { berekenEindtelling, testpand6Kamers } from '@wwso/engine';
import { alleTarievensets } from '@wwso/data';
import { filterToelichtingVoorKamer, toegankelijkeRuimteNrsVoorKamer } from './toelichting-filter';

const tarievenset = alleTarievensets()[alleTarievensets().length - 1];
const eindtelling = berekenEindtelling(testpand6Kamers, tarievenset, tarievenset.peildatum);

describe('filterToelichtingVoorKamer — tegen de echte toelichting van testpand6Kamers', () => {
  it('R1 (per-kamer format): kamer 4 ziet alleen zijn eigen regel, niet die van andere kamers', () => {
    const ruimtes = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, 4);
    const gefilterd = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r1, 4, ruimtes);
    expect(gefilterd).toHaveLength(1);
    expect(gefilterd[0]).toContain('R1 kamer 4:');
  });

  it('R5 (ruimte-format): alle drie de kamers met toegang tot de gedeelde keuken (ruimte 7) zien dezelfde regel', () => {
    for (const kamer of [1, 2, 3, 4, 5, 6]) {
      const ruimtes = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, kamer);
      const gefilterd = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r5, kamer, ruimtes);
      expect(gefilterd).toHaveLength(1);
      expect(gefilterd[0]).toContain('ruimte 7');
    }
  });

  it('R6 (ruimte-format): kamer 1 ziet badruimte-voor (ruimte 8) én de toiletruimte (ruimte 10), niet badruimte-achter (ruimte 9)', () => {
    // testpand6Kamers heeft drie sanitaire posten: ruimte 8 (Badruimte voor, kamer 1-3),
    // ruimte 9 (Badruimte achter, kamer 4-6) en ruimte 10 (Toiletruimte, kamer 1-3) — kamer 1
    // heeft dus terecht toegang tot TWEE R6-regels, niet één.
    const ruimtesKamer1 = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, 1);
    const gefilterdKamer1 = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r6, 1, ruimtesKamer1);
    expect(gefilterdKamer1).toHaveLength(2);
    expect(gefilterdKamer1.some((r) => r.includes('ruimte 8'))).toBe(true);
    expect(gefilterdKamer1.some((r) => r.includes('ruimte 10'))).toBe(true);
    expect(gefilterdKamer1.some((r) => r.includes('ruimte 9'))).toBe(false);

    const ruimtesKamer4 = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, 4);
    const gefilterdKamer4 = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r6, 4, ruimtesKamer4);
    expect(gefilterdKamer4).toHaveLength(1);
    expect(gefilterdKamer4[0]).toContain('ruimte 9');
  });

  it('R7 (kamer-lijst-format): alleen kamer 3 heeft toegang tot de handicapvoorziening', () => {
    for (const kamer of [1, 2, 3, 4, 5, 6]) {
      const ruimtes = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, kamer);
      const gefilterd = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r7, kamer, ruimtes);
      if (kamer === 3) {
        expect(gefilterd).toHaveLength(1);
      } else {
        expect(gefilterd).toHaveLength(0);
      }
    }
  });

  it('R11 (pandbrede regel zonder kamer/ruimte-verwijzing): elke kamer ziet dezelfde ene regel', () => {
    for (const kamer of [1, 2, 3, 4, 5, 6]) {
      const ruimtes = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, kamer);
      const gefilterd = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r11, kamer, ruimtes);
      expect(gefilterd).toHaveLength(1);
      expect(gefilterd[0]).toContain('R11:');
    }
  });

  it('R12 (kamer-lijst-format, aanbelfunctie voor alle 6 kamers): elke kamer ziet de regel', () => {
    for (const kamer of [1, 2, 3, 4, 5, 6]) {
      const ruimtes = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, kamer);
      const gefilterd = filterToelichtingVoorKamer(eindtelling.rubriekToelichting.r12, kamer, ruimtes);
      expect(gefilterd.some((r) => r.includes('aanbelfunctie'))).toBe(true);
    }
  });

  it('geen enkele toelichtingsregel verdwijnt spoorloos: elke regel is voor minstens één kamer zichtbaar', () => {
    for (const key of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13'] as const) {
      const regels = eindtelling.rubriekToelichting[key];
      for (const regel of regels) {
        const zichtbaarVoorIemand = [1, 2, 3, 4, 5, 6].some((kamer) => {
          const ruimtes = toegankelijkeRuimteNrsVoorKamer(testpand6Kamers, kamer);
          return filterToelichtingVoorKamer([regel], kamer, ruimtes).length > 0;
        });
        expect(zichtbaarVoorIemand, `regel "${regel}" (${key}) is voor geen enkele kamer zichtbaar`).toBe(true);
      }
    }
  });
});
