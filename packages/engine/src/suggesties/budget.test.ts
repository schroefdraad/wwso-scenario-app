import { describe, expect, it } from 'vitest';
import { getTarievenset, nieuwsteKostencatalogus } from '@wwso/data';
import { testpandSuggesties } from '../fixtures/testpand-suggesties';
import { stelSuggestiesOp } from './suggesties';
import type { SuggestieOpties } from './types';

const tarievenset = getTarievenset('2026-01-01');
const kostencatalogus = nieuwsteKostencatalogus();
const peildatum = '2026-01-01';

/** §1 van het ontwerp: een expliciete fout bij overschrijding, nooit een stille afkapping (harde regel 2). */
describe('rekenbudget — expliciete fout in plaats van stille afkapping', () => {
  it('gooit een duidelijke fout zodra maxEindtellingen te laag staat voor deze fixture', () => {
    const opties: SuggestieOpties = { tarievenset, peildatum, kostencatalogus, maxEindtellingen: 3 };
    expect(() => stelSuggestiesOp(testpandSuggesties, opties)).toThrow(/Rekenbudget overschreden/);
  });

  it('draait wél door met een ruim budget', () => {
    const opties: SuggestieOpties = { tarievenset, peildatum, kostencatalogus, maxEindtellingen: 5000 };
    const resultaat = stelSuggestiesOp(testpandSuggesties, opties);
    expect(resultaat.aantalEindtellingen).toBeGreaterThan(0);
    expect(resultaat.aantalEindtellingen).toBeLessThanOrEqual(5000);
  });
});
