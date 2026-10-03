import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import type { RuimteType } from '../types/index';
import { VOORZIENING_RUIMTE_TYPES, ZOLDER_RUIMTE_TYPES } from './gedeeld';
import { berekenR5 } from './r5-keuken';
import { berekenR6 } from './r6-sanitair';
import { maakKeuken, maakPandInvoer, maakSanitair } from './test-utils';

const tarievenset = getTarievenset('2026-01-01');

function ruimteVan(type: RuimteType) {
  return {
    nr: 1,
    naam: type,
    type,
    oppervlakteM2: 10,
    verdieping: 0,
    verwarmd: false,
    verkoeld: false,
    ...(type.includes('emeenschappelijk') ? { aantalAdressenMetToegang: 1 } : {}),
  };
}

function pandMet(type: RuimteType) {
  return maakPandInvoer({
    aantalKamers: 1,
    ruimtes: [ruimteVan(type)],
    toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    keukens: [maakKeuken({ ruimteNr: 1 })],
    sanitair: [maakSanitair({ ruimteNr: 1, douche: true })],
  });
}

describe('voorzieningen-audit 2026-10-03 — keuken en sanitair alleen in een vertrek of overige ruimte', () => {
  it.each(['Buitenruimte privé', 'Buitenruimte gemeenschappelijk', 'Verkeersruimte', 'Parkeerplek gemeenschappelijk'] as RuimteType[])(
    'een keuken en douche in een %s leveren 0 punten op, met uitleg',
    (type) => {
      const r5 = berekenR5(pandMet(type), tarievenset);
      const r6 = berekenR6(pandMet(type), tarievenset);
      expect(r5.perKamer[1]).toBe(0);
      expect(r6.perKamer[1]).toBe(0);
      expect(r5.toelichting.join(' ')).toContain('telt alleen in een vertrek of overige ruimte');
      expect(r6.toelichting.join(' ')).toContain('telt alleen in een vertrek of overige ruimte');
    },
  );

  it.each(['Privévertrek', 'Keuken', 'Berging', 'Gemeenschappelijk vertrek', 'Gemeenschappelijke overige ruimte'] as RuimteType[])(
    'een keuken en douche in een %s tellen wél mee (§2.6.1, §2.9.2)',
    (type) => {
      expect(berekenR5(pandMet(type), tarievenset).perKamer[1]).toBeGreaterThan(0);
      expect(berekenR6(pandMet(type), tarievenset).perKamer[1]).toBeGreaterThan(0);
    },
  );

  it('een zolder kan alleen een privévertrek, berging of overige ruimte zijn', () => {
    expect([...ZOLDER_RUIMTE_TYPES].sort()).toEqual(['Berging', 'Overige ruimte', 'Privévertrek']);
    expect(VOORZIENING_RUIMTE_TYPES).not.toContain('Verkeersruimte');
  });
});
