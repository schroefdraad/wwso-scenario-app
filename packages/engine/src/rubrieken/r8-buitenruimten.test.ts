import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR8 } from './r8-buitenruimten.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');

describe('R8 — Buitenruimten (§2.8)', () => {
  it('rekent het voorbeeld uit §2.8.1 exact na: 10 m² privé = 5,5 pt', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Tuin', type: 'Buitenruimte privé', oppervlakteM2: 10, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR8(input, tarievenset).perKamer[1]).toBe(5.5);
  });

  it('telt meerdere privé-buitenruimten eerst bij elkaar op vóór de vaste 2 punten', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Balkon', type: 'Buitenruimte privé', oppervlakteM2: 4, verdieping: 0, verwarmd: false, verkoeld: false },
        { nr: 2, naam: 'Tuin', type: 'Buitenruimte privé', oppervlakteM2: 6, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1] },
      ],
    });
    // 10 m² totaal → 2 + 3,5 = 5,5 pt (niet 2×2 + 3,5 = 7,5)
    expect(berekenR8(input, tarievenset).perKamer[1]).toBe(5.5);
  });

  it('rekent het voorbeeld uit §2.8.2 exact na volgens de regel (niet het inconsistente voorbeeld)', () => {
    const input = maakPandInvoer({
      aantalKamers: 4,
      ruimtes: [
        {
          nr: 1,
          naam: 'Gedeelde tuin',
          type: 'Buitenruimte gemeenschappelijk',
          oppervlakteM2: 30,
          verdieping: 0,
          verwarmd: false,
          verkoeld: false,
          aantalAdressenMetToegang: 1,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2, 3, 4] }],
    });
    const resultaat = berekenR8(input, tarievenset);
    // (0,75 x 30) / 1 adres / 4 kamers = 5,625 → FLOOR(5,625 + 0,125; 0,25) = 5,75 (D1: regel, niet het voorbeeld)
    for (const kamer of [1, 2, 3, 4]) {
      expect(resultaat.perKamer[kamer]).toBe(5.75);
    }
  });

  it('deelt gemeenschappelijke buitenruimte tweemaal: eerst adressen, dan kamers', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [
        {
          nr: 1,
          naam: 'Gedeelde tuin',
          type: 'Buitenruimte gemeenschappelijk',
          oppervlakteM2: 20,
          verdieping: 0,
          verwarmd: false,
          verkoeld: false,
          aantalAdressenMetToegang: 2,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
    });
    // (0,75 x 20) / 2 adressen / 2 kamers = 3,75
    expect(berekenR8(input, tarievenset).perKamer[1]).toBe(3.75);
  });

  it('begrenst privé + gemeenschappelijk samen op 15 punten (B9)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Groot terras', type: 'Buitenruimte privé', oppervlakteM2: 40, verdieping: 0, verwarmd: false, verkoeld: false },
        {
          nr: 2,
          naam: 'Gedeelde tuin',
          type: 'Buitenruimte gemeenschappelijk',
          oppervlakteM2: 20,
          verdieping: 0,
          verwarmd: false,
          verkoeld: false,
          aantalAdressenMetToegang: 1,
        },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1] },
      ],
    });
    // privé: 2 + 0,35×40 = 16 pt; gemeenschappelijk: 0,75×20 = 15 pt; samen 31, afgetopt op 15
    expect(berekenR8(input, tarievenset).perKamer[1]).toBe(15);
  });

  it('geeft 0 punten zonder buitenruimte', () => {
    const input = maakPandInvoer({ aantalKamers: 1, ruimtes: [], toewijzing: [] });
    expect(berekenR8(input, tarievenset).perKamer[1]).toBe(0);
  });
});
