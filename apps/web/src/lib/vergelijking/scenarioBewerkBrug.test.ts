import { beforeEach, describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import {
  bepaalVergelijkingHerstel,
  haalEnWisScenarioBewerkResultaatOp,
  haalEnWisVergelijkingSnapshotOp,
  haalScenarioBewerkStartOp,
  slaScenarioBewerkResultaatOp,
  slaScenarioBewerkStartOp,
  slaVergelijkingSnapshotOp,
  type VergelijkingSnapshot,
} from './scenarioBewerkBrug';

/** Minimale sessionStorage voor de node-testomgeving — de brug zelf praat er rechtstreeks mee. */
function installeerSessionStorage() {
  const opslag = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => opslag.get(k) ?? null,
    setItem: (k: string, v: string) => void opslag.set(k, v),
    removeItem: (k: string) => void opslag.delete(k),
    clear: () => opslag.clear(),
    key: (i: number) => [...opslag.keys()][i] ?? null,
    get length() {
      return opslag.size;
    },
  } as Storage;
}

const WONING_A = '2e7b0c80-24b3-4525-a24c-944f4eaa3a65';
const WONING_B = '39a5e705-85e1-41db-ad90-31cb28620eb0';

function snapshotVan(dealId: string | undefined, dealNaam: string): VergelijkingSnapshot {
  return { dealId, dealNaam, dealNotitie: '', dealMap: '', slots: [] };
}

beforeEach(installeerSessionStorage);

describe('staat-navigatie-audit 2026-10-03 — vergelijking-snapshot hoort bij één woning', () => {
  it('incident: snapshot van woning A wordt NIET toegepast op de vergelijking van woning B', () => {
    // Vergelijking A → "Bekijk volledig resultaat" (zet snapshot) → Mijn woningen → woning B.
    slaVergelijkingSnapshotOp(snapshotVan(WONING_A, 'Croesestraat 77'));
    const herstel = bepaalVergelijkingHerstel(haalEnWisVergelijkingSnapshotOp(), haalEnWisScenarioBewerkResultaatOp(), WONING_B);
    expect(herstel.snapshot).toBeNull();
  });

  it('een genegeerde snapshot blijft ook niet hangen voor een latere terugkeer naar A', () => {
    slaVergelijkingSnapshotOp(snapshotVan(WONING_A, 'Croesestraat 77'));
    bepaalVergelijkingHerstel(haalEnWisVergelijkingSnapshotOp(), null, WONING_B);
    expect(haalEnWisVergelijkingSnapshotOp()).toBeNull();
  });

  it('terugkeer naar dezelfde woning herstelt de snapshot wél', () => {
    slaVergelijkingSnapshotOp(snapshotVan(WONING_A, 'Croesestraat 77'));
    const herstel = bepaalVergelijkingHerstel(haalEnWisVergelijkingSnapshotOp(), null, WONING_A);
    expect(herstel.snapshot?.dealNaam).toBe('Croesestraat 77');
  });

  it('een nog niet opgeslagen woning (geen id aan beide kanten) herstelt de snapshot', () => {
    slaVergelijkingSnapshotOp(snapshotVan(undefined, 'Naamloos'));
    const herstel = bepaalVergelijkingHerstel(haalEnWisVergelijkingSnapshotOp(), null, undefined);
    expect(herstel.snapshot?.dealNaam).toBe('Naamloos');
  });

  it('een snapshot van een opgeslagen woning belandt niet op een niet-opgeslagen vergelijking', () => {
    slaVergelijkingSnapshotOp(snapshotVan(WONING_A, 'Croesestraat 77'));
    const herstel = bepaalVergelijkingHerstel(haalEnWisVergelijkingSnapshotOp(), null, undefined);
    expect(herstel.snapshot).toBeNull();
  });
});

describe('staat-navigatie-audit 2026-10-03 — scenario-bewerkresultaat hoort bij één woning', () => {
  it('de woning-id gaat heen mee in de start en terug in het resultaat', () => {
    slaScenarioBewerkStartOp({ asIsPand: testpand6Kamers, slotIndex: 1, naam: 'Scenario 2', terugUrl: `/woning/vergelijking?deal=${WONING_A}`, dealId: WONING_A });
    expect(haalScenarioBewerkStartOp()?.dealId).toBe(WONING_A);
  });

  it('een bewerkt scenario van woning A wordt NIET op woning B gezet', () => {
    slaScenarioBewerkResultaatOp({ slotIndex: 0, dealId: WONING_A, bewerktPand: testpand6Kamers });
    const herstel = bepaalVergelijkingHerstel(null, haalEnWisScenarioBewerkResultaatOp(), WONING_B);
    expect(herstel.resultaat).toBeNull();
  });

  it('een bewerkt scenario van dezelfde woning komt wél terug in het juiste slot', () => {
    slaScenarioBewerkResultaatOp({ slotIndex: 2, dealId: WONING_A, bewerktPand: testpand6Kamers });
    const herstel = bepaalVergelijkingHerstel(null, haalEnWisScenarioBewerkResultaatOp(), WONING_A);
    expect(herstel.resultaat?.slotIndex).toBe(2);
  });
});
