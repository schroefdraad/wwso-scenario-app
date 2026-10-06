import { describe, expect, it } from 'vitest';
import type { EigenProfiel } from '../../lib/deals/types';
import { BEVESTIG_STANDAARD, woningMenuItems } from './acties';

const eigenOrg = '00000000-0000-0000-0000-000000000001';
const lid: EigenProfiel = {
  email: 'emma@voorbeeld.nl',
  orgId: eigenOrg,
  isEigenaar: false,
  features: [],
};

// Woningacties achter een menu (keuze eigenaar 2026-10-06, optie A).
describe('woningMenuItems', () => {
  it('eigen woning: kopiëren en verwijderen', () => {
    expect(woningMenuItems({ orgId: eigenOrg, isDemo: false }, lid)).toEqual([
      'kopieren',
      'verwijderen',
    ]);
  });

  it('voorbeeldwoning: alleen kopiëren, met uitleg waarom verwijderen niet kan', () => {
    expect(woningMenuItems({ orgId: eigenOrg, isDemo: true }, lid)).toEqual([
      'kopieren',
      'verwijderen-niet-toegestaan',
    ]);
  });

  it('woning van een andere org of zonder profiel: niet verwijderen', () => {
    expect(woningMenuItems({ orgId: 'andere-org', isDemo: false }, lid)).toEqual([
      'kopieren',
      'verwijderen-niet-toegestaan',
    ]);
    expect(woningMenuItems({ orgId: eigenOrg, isDemo: false }, null)).toEqual([
      'kopieren',
      'verwijderen-niet-toegestaan',
    ]);
  });
});

// Regressietest (feedback eigenaar 2026-10-06): bij de bevestiging had "Ja, verwijderen" de nadruk
// en kon een dubbelklik al verwijderen. De veilige keuze moet de standaard zijn.
describe('bevestiging verwijderen', () => {
  it('standaardknop (focus, Enter) is annuleren', () => {
    expect(BEVESTIG_STANDAARD).toBe('annuleren');
  });
});
