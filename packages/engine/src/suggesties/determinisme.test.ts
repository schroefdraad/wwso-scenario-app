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
  it('dezelfde input levert exact dezelfde pakketten op, inclusief volgorde', () => {
    const opties: SuggestieOpties = { tarievenset, peildatum, kostencatalogus };

    const eerste = stelSuggestiesOp(testpandSuggesties, opties);
    const tweede = stelSuggestiesOp(testpandSuggesties, opties);

    const sleutelsVan = (regels: { kandidaat: { sleutel: string } }[]) => regels.map((r) => r.kandidaat.sleutel);

    expect(sleutelsVan(eerste.pakketten.basis.regels)).toEqual(sleutelsVan(tweede.pakketten.basis.regels));
    expect(sleutelsVan(eerste.pakketten.comfort.regels)).toEqual(sleutelsVan(tweede.pakketten.comfort.regels));
    expect(sleutelsVan(eerste.pakketten.maximaal.regels)).toEqual(sleutelsVan(tweede.pakketten.maximaal.regels));

    expect(eerste.pakketten.basis.extraJaarhuurEuro).toBe(tweede.pakketten.basis.extraJaarhuurEuro);
    expect(eerste.pakketten.maximaal.investeringEuro).toEqual(tweede.pakketten.maximaal.investeringEuro);
    expect(eerste.kandidaten.map((k) => k.kandidaat.sleutel)).toEqual(tweede.kandidaten.map((k) => k.kandidaat.sleutel));
    expect(eerste.aantalEindtellingen).toBe(tweede.aantalEindtellingen);
  });
});
