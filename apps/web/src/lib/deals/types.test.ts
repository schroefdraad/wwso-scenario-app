import { describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import { parseDealRij } from './types';

function geldigeRij(overrides: Record<string, unknown> = {}) {
  return {
    id: 'd1e5a5b0-0000-4000-8000-000000000001',
    org_id: '00000000-0000-0000-0000-000000000001',
    naam: 'Crooswijkseweg 95-A03',
    pand_invoer: testpand6Kamers,
    scenarios: [{ naam: 'Scenario 1', sleutels: ['K-03#keuken:7'] }],
    tarievenset_peildatum: '2026-01-01',
    kostencatalogus_versie: '0.1',
    registry_versie: '1.0',
    engine_versie: '0.0.0',
    aangemaakt: '2026-08-01T10:00:00.000Z',
    bijgewerkt: '2026-08-20T12:00:00.000Z',
    ...overrides,
  };
}

describe('parseDealRij', () => {
  it('zet een geldige Supabase-rij om naar een Deal met camelCase-velden en gebundeld versiestempel', () => {
    const deal = parseDealRij(geldigeRij());

    expect(deal.id).toBe('d1e5a5b0-0000-4000-8000-000000000001');
    expect(deal.naam).toBe('Crooswijkseweg 95-A03');
    // `notitie`/`map` ontbreken in de rauwe rij (legacy, vóór 2026-09-04) — vallen terug op '',
    // wat toen "geen notitie/map" betekende, geen gok.
    expect(deal.notitie).toBe('');
    expect(deal.map).toBe('');
    expect(deal.pandInvoer.pand.adres).toBe(testpand6Kamers.pand.adres);
    // `soort` ontbreekt in de rauwe rij (legacy, vóór 2026-08-22) — valt terug op 'kandidaten',
    // het enige type dat toen bestond, geen gok.
    expect(deal.scenarios).toEqual([{ soort: 'kandidaten', naam: 'Scenario 1', sleutels: ['K-03#keuken:7'] }]);
    expect(deal.versiestempel).toEqual({
      tarievensetPeildatum: '2026-01-01',
      kostencatalogusVersie: '0.1',
      registryVersie: '1.0',
      engineVersie: '0.0.0',
    });
  });

  it('gooit een fout bij een corrupte invoer-snapshot in plaats van hem stilzwijgend door te laten (harde regel 4)', () => {
    const rij = geldigeRij({ pand_invoer: { pand: { adres: 'Onvolledig' } } });
    expect(() => parseDealRij(rij)).toThrow();
  });

  it('gooit een fout bij een corrupte scenarios-kolom', () => {
    const rij = geldigeRij({ scenarios: [{ naam: 'Scenario 1' }] });
    expect(() => parseDealRij(rij)).toThrow();
  });

  it('parseert een handmatig bewerkt scenario (backlog 2026-08-22: handmatige kamer + maatregelen)', () => {
    const rij = geldigeRij({
      scenarios: [
        {
          soort: 'handmatig',
          naam: 'Kamer 7',
          pand: testpand6Kamers,
          sleutels: ['K-01#kamer:7'],
          handmatigeInvesteringEuro: 15000,
        },
      ],
    });
    const deal = parseDealRij(rij);
    // `maatregelPrijzenEuro` ontbreekt in de rauwe rij (legacy, vóór 2026-09-04) — valt terug op
    // {}, wat toen "geen overschrijvingen" betekende, geen gok. `kamerBewerkt` ontbreekt ook
    // (legacy, vóór 2026-09-05) — valt terug op `true`, want vóór die datum was 'handmatig' het
    // enige pad met een `pand`-veld en betekende dus altijd een echte kamerbewerking.
    expect(deal.scenarios).toEqual([
      {
        soort: 'handmatig',
        naam: 'Kamer 7',
        pand: testpand6Kamers,
        kamerBewerkt: true,
        sleutels: ['K-01#kamer:7'],
        handmatigeInvesteringEuro: 15000,
        maatregelPrijzenEuro: {},
      },
    ]);
  });

  it('parseert een handmatig scenario met per-maatregel prijsoverschrijvingen (Tussenfase-taak D, 2026-09-04)', () => {
    const rij = geldigeRij({
      scenarios: [
        {
          soort: 'handmatig',
          naam: 'Kamer 7',
          pand: testpand6Kamers,
          sleutels: ['K-01#kamer:7'],
          handmatigeInvesteringEuro: 15000,
          maatregelPrijzenEuro: { 'K-01#kamer:7': 4200 },
        },
      ],
    });
    const deal = parseDealRij(rij);
    expect(deal.scenarios).toEqual([
      {
        soort: 'handmatig',
        naam: 'Kamer 7',
        pand: testpand6Kamers,
        kamerBewerkt: true,
        sleutels: ['K-01#kamer:7'],
        handmatigeInvesteringEuro: 15000,
        maatregelPrijzenEuro: { 'K-01#kamer:7': 4200 },
      },
    ]);
  });

  it('gooit een fout bij een handmatig scenario zonder geldig pand', () => {
    const rij = geldigeRij({
      scenarios: [{ soort: 'handmatig', naam: 'Kamer 7', pand: { pand: { adres: 'Onvolledig' } }, sleutels: [], handmatigeInvesteringEuro: 0 }],
    });
    expect(() => parseDealRij(rij)).toThrow();
  });

  it('parseert een energielabel-scenario (Tussenfase-taak C, 2026-09-04), zonder sleutels/prijzen vallen die terug op leeg', () => {
    const rij = geldigeRij({ scenarios: [{ soort: 'energielabel', naam: 'Label A+++', doelLabel: 'A+++' }] });
    const deal = parseDealRij(rij);
    expect(deal.scenarios).toEqual([{ soort: 'energielabel', naam: 'Label A+++', doelLabel: 'A+++', sleutels: [], maatregelPrijzenEuro: {} }]);
  });

  it('parseert een energielabel-scenario met standaardmaatregelen bovenop (feedback Emma Morrison, 2026-09-07)', () => {
    const rij = geldigeRij({
      scenarios: [
        { soort: 'energielabel', naam: 'Label A+++', doelLabel: 'A+++', sleutels: ['E-04|1'], maatregelPrijzenEuro: { 'E-04|1': 500 } },
      ],
    });
    const deal = parseDealRij(rij);
    expect(deal.scenarios).toEqual([
      { soort: 'energielabel', naam: 'Label A+++', doelLabel: 'A+++', sleutels: ['E-04|1'], maatregelPrijzenEuro: { 'E-04|1': 500 } },
    ]);
  });

  it('gooit een fout bij een energielabel-scenario met een ongeldig label', () => {
    const rij = geldigeRij({ scenarios: [{ soort: 'energielabel', naam: 'Label X', doelLabel: 'X' }] });
    expect(() => parseDealRij(rij)).toThrow();
  });

  it('parseert een notitie en map (backlog 2026-09-04)', () => {
    const rij = geldigeRij({ notitie: 'Interessant pand, wachten op WOZ-beschikking.', map: 'Rotterdam-Zuid' });
    const deal = parseDealRij(rij);
    expect(deal.notitie).toBe('Interessant pand, wachten op WOZ-beschikking.');
    expect(deal.map).toBe('Rotterdam-Zuid');
  });
});
