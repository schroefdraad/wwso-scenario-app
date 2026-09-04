import { describe, expect, it } from 'vitest';
import { getTarievenset, nieuwsteKostencatalogus } from '@wwso/data';
import { testpandSuggesties } from '../fixtures/testpand-suggesties';
import { stelSuggestiesOp } from './suggesties';
import type { SuggestieOpties } from './types';

const tarievenset = getTarievenset('2026-01-01');
const kostencatalogus = nieuwsteKostencatalogus();
const peildatum = '2026-01-01';

/** §3 van het ontwerp: de sortering is volledig deterministisch, nodig voor golden-master-achtige tests. */
describe('determinisme — twee runs geven identieke output', () => {
  it('dezelfde input levert exact dezelfde kandidatenlijst op, inclusief volgorde en waardering', () => {
    const opties: SuggestieOpties = { tarievenset, peildatum, kostencatalogus };

    const eerste = stelSuggestiesOp(testpandSuggesties, opties);
    const tweede = stelSuggestiesOp(testpandSuggesties, opties);

    expect(eerste.kandidaten.map((k) => k.kandidaat.sleutel)).toEqual(tweede.kandidaten.map((k) => k.kandidaat.sleutel));
    expect(eerste.kandidaten.map((k) => k.extraJaarhuurEuro)).toEqual(tweede.kandidaten.map((k) => k.extraJaarhuurEuro));
    expect(eerste.kandidaten.map((k) => k.investeringEuro)).toEqual(tweede.kandidaten.map((k) => k.investeringEuro));
    expect(eerste.aantalEindtellingen).toBe(tweede.aantalEindtellingen);
  });
});
