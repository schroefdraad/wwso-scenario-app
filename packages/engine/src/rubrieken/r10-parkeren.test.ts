import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR10 } from './r10-parkeren';
import { maakPandInvoer } from './test-utils';

const tarievenset = getTarievenset('2026-01-01');

const parkeerplekRuimte = (nr: number, adressen: number) => ({
  nr,
  naam: `Parkeerplek ${nr}`,
  type: 'Parkeerplek gemeenschappelijk' as const,
  oppervlakteM2: 12,
  verdieping: 0,
  verwarmd: false,
  verkoeld: false,
  aantalAdressenMetToegang: adressen,
});

describe('R10 — Gemeenschappelijke parkeerruimten (§2.10)', () => {
  it('kent 9/6/4 punten toe per type, gedeeld door adressen en kamers', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [parkeerplekRuimte(1, 1)],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
      parkeerplekken: [{ ruimteNr: 1, type: 'I', laadpaal: false }],
    });
    // 9 / 1 adres / 2 kamers = 4,5
    const resultaat = berekenR10(input, tarievenset);
    expect(resultaat.perKamer[1]).toBe(4.5);
    expect(resultaat.perKamer[2]).toBe(4.5);
  });

  it('deelt de laadpaal alleen door adressen, niet ook door kamers (§2.10.5, B10)', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [parkeerplekRuimte(1, 2)],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
      parkeerplekken: [{ ruimteNr: 1, type: 'III', laadpaal: true }],
    });
    // basis: 4 / 2 adressen / 2 kamers = 1; laadpaal: 2 / 2 adressen = 1 (niet ÷2 kamers) → 2 pt per kamer
    const resultaat = berekenR10(input, tarievenset);
    expect(resultaat.perKamer[1]).toBe(2);
    expect(resultaat.perKamer[2]).toBe(2);
  });

  it('geeft 0 punten zonder gemeenschappelijke parkeerplekken', () => {
    const input = maakPandInvoer({ aantalKamers: 1, ruimtes: [], toewijzing: [] });
    expect(berekenR10(input, tarievenset).perKamer[1]).toBe(0);
  });
});
