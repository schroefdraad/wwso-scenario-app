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
    expect(deal.pandInvoer.pand.adres).toBe(testpand6Kamers.pand.adres);
    expect(deal.scenarios).toEqual([{ naam: 'Scenario 1', sleutels: ['K-03#keuken:7'] }]);
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
});
