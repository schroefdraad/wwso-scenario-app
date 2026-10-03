import { beforeEach, describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import { maakBrug, ruimOpVoorWoning, SESSIE_SLEUTELS } from './brug';
import { haalPandOp, slaPandOp } from '../resultaat/opslag';
import { haalConceptOp, slaConceptOp } from '../invoer/opslag';
import { haalEnWisVergelijkingSnapshotOp, haalScenarioBewerkStartOp, slaScenarioBewerkStartOp, slaVergelijkingSnapshotOp } from '../vergelijking/scenarioBewerkBrug';
import { NIEUWE_INVOERSTATE } from '../invoer/types';

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

const A = '2e7b0c80-24b3-4525-a24c-944f4eaa3a65';
const B = '39a5e705-85e1-41db-ad90-31cb28620eb0';

beforeEach(installeerSessionStorage);

describe('staat-navigatie-audit stap 3 — één module, elk restje hoort bij één woning', () => {
  it('incident 2026-10-03, structureel: opent woning B, dan is álles van woning A weg', () => {
    // Vergelijking A → "Bekijk volledig resultaat": snapshot + resultaat-context van A.
    slaVergelijkingSnapshotOp({ dealId: A, dealNaam: 'Croesestraat 77', dealNotitie: '', dealMap: '', slots: [] });
    slaPandOp({ pand: testpand6Kamers, dealId: A });
    slaScenarioBewerkStartOp({ asIsPand: testpand6Kamers, slotIndex: 0, naam: 'Scenario 1', terugUrl: '/x', dealId: A });

    ruimOpVoorWoning(B);

    expect(haalEnWisVergelijkingSnapshotOp()).toBeNull();
    expect(haalPandOp()).toBeNull();
    expect(haalScenarioBewerkStartOp()).toBeNull();
  });

  it('wat bij dezelfde woning hoort, blijft staan (de terugweg werkt nog)', () => {
    slaVergelijkingSnapshotOp({ dealId: A, dealNaam: 'Croesestraat 77', dealNotitie: '', dealMap: '', slots: [] });
    slaPandOp({ pand: testpand6Kamers, dealId: A });

    expect(ruimOpVoorWoning(A)).toEqual([]);
    expect(haalPandOp()?.dealId).toBe(A);
    expect(haalEnWisVergelijkingSnapshotOp()?.dealNaam).toBe('Croesestraat 77');
  });

  it('een restje van een nooit opgeslagen woning verdwijnt ook zodra je een opgeslagen woning opent', () => {
    slaPandOp({ pand: testpand6Kamers });
    expect(ruimOpVoorWoning(A)).toEqual([SESSIE_SLEUTELS.huidigPand]);
  });

  it('het concept van "+ Nieuwe woning" blijft altijd staan — dat hoort bij geen enkele woning', () => {
    slaConceptOp({ ...NIEUWE_INVOERSTATE, pand: { ...NIEUWE_INVOERSTATE.pand, adres: 'nog niet opgeslagen' } });
    ruimOpVoorWoning(A);
    expect(haalConceptOp()?.pand.adres).toBe('nog niet opgeslagen');
  });

  it('een onleesbaar restje wordt opgeruimd i.p.v. dat het de pagina laat crashen', () => {
    sessionStorage.setItem(SESSIE_SLEUTELS.vergelijkingSnapshot, '{kapot');
    expect(ruimOpVoorWoning(A)).toEqual([SESSIE_SLEUTELS.vergelijkingSnapshot]);
  });

  it('een brug negeert een waarde die niet (meer) geldig is', () => {
    const brug = maakBrug(SESSIE_SLEUTELS.huidigPand, (ruw) => (typeof ruw === 'object' && ruw && 'pand' in ruw ? ruw : null));
    sessionStorage.setItem(SESSIE_SLEUTELS.huidigPand, JSON.stringify({ oudFormaat: true }));
    expect(brug.haal()).toBeNull();
    expect(brug.haalEnWis()).toBeNull();
    expect(sessionStorage.getItem(SESSIE_SLEUTELS.huidigPand)).toBeNull();
  });
});
