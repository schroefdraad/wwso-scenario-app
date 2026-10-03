import { describe, expect, it } from 'vitest';
import { isLosConcept } from './opslag';

describe('staat-navigatie-audit 2026-10-03 — alleen een losse, nieuwe invoer is een concept', () => {
  it('verse invoer zonder koppeling wordt als concept bewaard', () => {
    expect(isLosConcept({})).toBe(true);
  });

  it('incident: een scenario-bewerking mag geen concept achterlaten voor "+ Nieuwe woning"', () => {
    expect(isLosConcept({ handmatigScenario: { slotIndex: 0, naam: 'Scenario 1', terugUrl: '/woning/vergelijking?deal=x', dealId: 'x' } })).toBe(false);
  });

  it('incident 2026-09-08 (Steven): een bewerking van een bestaande woning mag geen concept achterlaten', () => {
    expect(
      isLosConcept({
        bewerktDeal: { id: 'x', naam: 'Basrastraat 12', notitie: '', map: '', scenarios: [], magBewerken: true, bewerkrechtenOnzeker: false },
      }),
    ).toBe(false);
  });
});
