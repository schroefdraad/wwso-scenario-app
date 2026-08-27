import { describe, expect, it } from 'vitest';
import type { KandidaatWaardering } from '@wwso/engine';
import { nieuweSelectieNaToggle } from './scenario-bouw';

/** Minimale nep-kandidaat — `nieuweSelectieNaToggle` kijkt alleen naar sleutel/maatregelId/doel. */
function nepKandidaat(sleutel: string, maatregelId: string, doel: { soort: string; nr?: number }): KandidaatWaardering {
  return { kandidaat: { sleutel, maatregelId, doel, hoeveelheid: 1, omschrijving: sleutel }, maatregel: { id: maatregelId } } as unknown as KandidaatWaardering;
}

describe('nieuweSelectieNaToggle', () => {
  const k01Kamer3 = nepKandidaat('K-01#kamer:3', 'K-01', { soort: 'kamer', nr: 3 });
  const k09Kamer3 = nepKandidaat('K-09#kamer:3', 'K-09', { soort: 'kamer', nr: 3 });
  const k09Kamer5 = nepKandidaat('K-09#kamer:5', 'K-09', { soort: 'kamer', nr: 5 });
  const k04Keuken7 = nepKandidaat('K-04#keuken:7', 'K-04', { soort: 'keuken', nr: 7 });
  const kandidaten = [k01Kamer3, k09Kamer3, k09Kamer5, k04Keuken7];

  it('vinkt K-09 op dezelfde kamer automatisch uit bij het aanvinken van K-01 (het bugscenario uit de crash)', () => {
    const resultaat = nieuweSelectieNaToggle(kandidaten, new Set(['K-09#kamer:3']), 'K-01#kamer:3');
    expect(resultaat).toEqual(new Set(['K-01#kamer:3']));
  });

  it('laat K-09 op een ANDERE kamer met rust — alleen hetzelfde doel is een conflict', () => {
    const resultaat = nieuweSelectieNaToggle(kandidaten, new Set(['K-09#kamer:5']), 'K-01#kamer:3');
    expect(resultaat).toEqual(new Set(['K-09#kamer:5', 'K-01#kamer:3']));
  });

  it('laat een niet-alternatiefGroep-maatregel (K-04) gewoon naast K-01 bestaan', () => {
    const resultaat = nieuweSelectieNaToggle(kandidaten, new Set(['K-04#keuken:7']), 'K-01#kamer:3');
    expect(resultaat).toEqual(new Set(['K-04#keuken:7', 'K-01#kamer:3']));
  });

  it('uitvinken van een reeds geselecteerde sleutel verwijdert die gewoon, zonder side-effects', () => {
    const resultaat = nieuweSelectieNaToggle(kandidaten, new Set(['K-01#kamer:3', 'K-04#keuken:7']), 'K-01#kamer:3');
    expect(resultaat).toEqual(new Set(['K-04#keuken:7']));
  });
});
