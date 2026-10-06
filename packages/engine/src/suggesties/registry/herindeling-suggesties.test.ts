import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenEindtelling } from '../../eindtelling/index';
import { maakPandInvoer } from '../../rubrieken/test-utils';
import { analyseerMarge } from '../marge-analyse';
import type { MaatregelContext } from '../types';
import { standaardRegistry } from './index';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = tarievenset.peildatum;

function ctxMetKamer(m2: number): MaatregelContext {
  const pand = maakPandInvoer({
    aantalKamers: 1,
    ruimtes: [{ nr: 1, naam: 'Kleine kamer', type: 'Privévertrek', oppervlakteM2: m2, verdieping: 0, verwarmd: true, verkoeld: false }],
    toewijzing: [{ ruimteNr: 1, kamers: [1] }],
  });
  const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
  return { pand, tarievenset, peildatum, eindtelling, marge: analyseerMarge(pand, tarievenset, eindtelling) };
}

// Code-review 2026-10-06: na de herindeling (te klein vertrek → overige ruimte) zochten de
// suggesties naar het type 'Privévertrek' en vonden de kleine kamer niet meer.
describe('suggesties blijven werken voor een te kleine kamer', () => {
  it('A-04 (kamer vergroten tot 8 m²) wordt aangeboden voor een kamer van 3,5 m²', () => {
    const kamers = standaardRegistry.get('A-04')!.kandidaten(ctxMetKamer(3.5)).map((k) => k.doel.nr);
    expect(kamers).toContain(1);
  });

  it('S-01 (eigen wastafel) wordt aangeboden voor een kamer van 3,5 m²', () => {
    const kamers = standaardRegistry.get('S-01')!.kandidaten(ctxMetKamer(3.5)).map((k) => k.doel.nr);
    expect(kamers).toContain(1);
  });
});
