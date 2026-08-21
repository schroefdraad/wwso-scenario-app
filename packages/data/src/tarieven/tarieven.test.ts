import { describe, expect, it } from 'vitest';
import { getTarievenset } from './index';

describe('getTarievenset — steekproeven tegen resources/wwso.xlsx, tab Tabellen', () => {
  const set = getTarievenset('2026-01-01');

  it('huurprijstabel: steekproeven rond de knik bij 60 punten (§ taak 11) kloppen exact', () => {
    const lookup = (punten: number) => set.huurprijstabel.find((r) => r.punten === punten)?.maxHuurEuro;
    expect(lookup(0)).toBe(0);
    expect(lookup(55)).toBe(560.36);
    expect(lookup(60)).toBe(611.28);
    expect(lookup(61)).toBe(616.58);
    expect(lookup(250)).toBe(1613.63);
  });

  it('energielabelfactoren kloppen exact', () => {
    const lookup = (label: string) => set.energielabelfactoren.find((f) => f.label === label)?.factorPerM2;
    expect(lookup('A++++')).toBe(1);
    expect(lookup('D')).toBe(0.2);
    expect(lookup('G')).toBe(-0.15);
  });

  it('bouwjaargrenzen kloppen exact', () => {
    const lookup = (grens: number) => set.bouwjaargrenzen.find((b) => b.totEnMetBouwjaar === grens)?.factorPerM2;
    expect(lookup(1999)).toBe(0.35);
    expect(lookup(1976)).toBe(-0.15);
    expect(set.bouwjaargrenzen).toHaveLength(7);
  });

  it('COROP-gebieden kloppen exact en tellen op tot 40', () => {
    const lookup = (gebied: string) => set.coropGebieden.find((c) => c.gebied === gebied)?.wozGemPerM2Euro;
    expect(lookup('Groot-Rijnmond')).toBe(3884);
    expect(lookup('Groot Amsterdam')).toBe(6378);
    expect(set.coropGebieden).toHaveLength(40);
  });
});

describe('getTarievenset — peildatum-lookup', () => {
  it('geeft de dichtstbijzijnde eerdere set terug voor een datum ná de eerste dataset', () => {
    expect(getTarievenset('2026-06-15').peildatum).toBe('2026-01-01');
  });

  it('gooit een expliciete fout voor een datum vóór de eerste dataset — geen stille fallback', () => {
    expect(() => getTarievenset('2025-12-31')).toThrow(/Geen tarievenset beschikbaar/);
  });
});
