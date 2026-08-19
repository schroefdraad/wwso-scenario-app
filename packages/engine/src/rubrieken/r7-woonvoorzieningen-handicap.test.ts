import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR7 } from './r7-woonvoorzieningen-handicap.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');

describe('R7 — Woonvoorzieningen voor personen met een handicap (§2.7)', () => {
  it('geeft 0 punten zonder ingevoerde voorzieningen', () => {
    const input = maakPandInvoer({ aantalKamers: 2, ruimtes: [], toewijzing: [] });
    const resultaat = berekenR7(input, tarievenset);
    expect(resultaat.perKamer[1]).toBe(0);
    expect(resultaat.perKamer[2]).toBe(0);
  });

  it('rekent 1 punt per € 332 en kent die toe aan de kamer met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [],
      toewijzing: [],
      handmatigePosten: {
        woonvoorzieningenHandicap: [{ nettoInvesteringEuro: 664, kamersMetToegang: [1] }],
        aanbelfuncties: [],
        losseLaadpalen: [],
        aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
        zorgwoning: false,
      },
    });
    const resultaat = berekenR7(input, tarievenset);
    // 664 / 332 = 2 pt, 1 persoon met toegang → 2 pt
    expect(resultaat.perKamer[1]).toBe(2);
    expect(resultaat.perKamer[2]).toBe(0);
  });

  it('deelt de punten over meerdere kamers met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [],
      toewijzing: [],
      handmatigePosten: {
        woonvoorzieningenHandicap: [{ nettoInvesteringEuro: 664, kamersMetToegang: [1, 2] }],
        aanbelfuncties: [],
        losseLaadpalen: [],
        aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
        zorgwoning: false,
      },
    });
    const resultaat = berekenR7(input, tarievenset);
    // 2 pt / 2 personen = 1 pt elk
    expect(resultaat.perKamer[1]).toBe(1);
    expect(resultaat.perKamer[2]).toBe(1);
  });
});
