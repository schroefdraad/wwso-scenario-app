import { describe, expect, it } from 'vitest';
import { testpand6Kamers, type KandidaatWaardering, type PandInvoer } from '@wwso/engine';
import { alternatiefGroepSleutel, beschikbareEnergielabelDoelen, energielabelKostenschatting, nieuweSelectieNaToggle } from './scenario-bouw';

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

describe('alternatiefGroepSleutel — Tussenfase-taak B (2026-09-05, visuele keuzegroep in MaatregelTabel/HandmatigMaatregelen)', () => {
  const k01Kamer3 = nepKandidaat('K-01#kamer:3', 'K-01', { soort: 'kamer', nr: 3 });
  const k09Kamer3 = nepKandidaat('K-09#kamer:3', 'K-09', { soort: 'kamer', nr: 3 });
  const k09Kamer5 = nepKandidaat('K-09#kamer:5', 'K-09', { soort: 'kamer', nr: 5 });
  const k04Keuken7 = nepKandidaat('K-04#keuken:7', 'K-04', { soort: 'keuken', nr: 7 });

  it('geeft dezelfde groepssleutel voor K-01 en K-09 op dezelfde kamer', () => {
    expect(alternatiefGroepSleutel(k01Kamer3)).toBeDefined();
    expect(alternatiefGroepSleutel(k01Kamer3)).toEqual(alternatiefGroepSleutel(k09Kamer3));
  });

  it('geeft een ANDERE groepssleutel voor K-09 op een andere kamer', () => {
    expect(alternatiefGroepSleutel(k09Kamer3)).not.toEqual(alternatiefGroepSleutel(k09Kamer5));
  });

  it('geeft undefined voor een maatregel zonder alternatiefGroep (K-04)', () => {
    expect(alternatiefGroepSleutel(k04Keuken7)).toBeUndefined();
  });
});

describe('beschikbareEnergielabelDoelen — Tussenfase-taak C (2026-09-04)', () => {
  // testpand6Kamers heeft energielabel 'D' (zie fixture) en geen kostenvelden ingevuld.
  function metKosten(overrides: Partial<PandInvoer['pand']>): PandInvoer {
    return { ...testpand6Kamers, pand: { ...testpand6Kamers.pand, ...overrides } };
  }

  it('geeft niets terug zonder ingevulde kostenvelden', () => {
    expect(beschikbareEnergielabelDoelen(testpand6Kamers)).toEqual([]);
  });

  it('geeft alleen de doelen terug met een ingevuld kostenveld', () => {
    const pand = metKosten({ energielabelKostenSchattingAPlusEuro: 8000, energielabelKostenSchattingAPlusPlusPlusEuro: 20000 });
    expect(beschikbareEnergielabelDoelen(pand)).toEqual(['A+', 'A+++']);
  });

  it('sluit het huidige as-is label uit, ook als er een kostenveld voor staat', () => {
    const pand = metKosten({ energielabel: 'A+', energielabelKostenSchattingAPlusEuro: 8000, energielabelKostenSchattingAPlusPlusEuro: 12000 });
    expect(beschikbareEnergielabelDoelen(pand)).toEqual(['A++']);
  });

  it('energielabelKostenschatting leest het veld dat bij het doellabel hoort', () => {
    const pand = metKosten({ energielabelKostenSchattingAPlusPlusEuro: 15000 });
    expect(energielabelKostenschatting(pand, 'A++')).toBe(15000);
    expect(energielabelKostenschatting(pand, 'A+')).toBeUndefined();
  });
});
