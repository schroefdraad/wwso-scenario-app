import { describe, expect, it } from 'vitest';
import { getTarievenset, nieuwsteKostencatalogus } from '@wwso/data';
import { testpandSuggesties } from '../fixtures/testpand-suggesties';
import { stelSuggestiesOp } from './suggesties';

/**
 * Besluit gebruiker 2026-10-03: maatregelen die vergunningsplichtig zijn (of een melding vragen)
 * mogen gewoon als optimalisatie aangeboden worden. De vergunningsklasse is alleen informatie
 * (en wordt in de UI niet meer getoond) — hij mag nooit een kandidaat wegfilteren.
 */
describe('vergunningsplichtige maatregelen worden gewoon aangeboden', () => {
  const resultaat = stelSuggestiesOp(testpandSuggesties, {
    tarievenset: getTarievenset('2026-01-01'),
    peildatum: '2026-01-01',
    kostencatalogus: nieuwsteKostencatalogus(),
  });
  const alles = [...resultaat.kandidaten, ...resultaat.herindeling];

  it('een maatregel met een omgevingsvergunning (A-01, ruitoppervlak) staat tussen de kandidaten', () => {
    expect(alles.some((k) => k.maatregel.id === 'A-01' && k.vergunningKlasse === 'vergunning')).toBe(true);
  });

  it('ook maatregelen met een mogelijke melding worden aangeboden', () => {
    expect(alles.some((k) => k.vergunningKlasse === 'mogelijk-melding')).toBe(true);
  });
});
