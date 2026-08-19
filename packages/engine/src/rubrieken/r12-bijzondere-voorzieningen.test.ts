import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR12 } from './r12-bijzondere-voorzieningen.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');

describe('R12 — Bijzondere voorzieningen (§2.12)', () => {
  it('kent 0,25 punt aanbelfunctie toe, gedeeld over de kamers met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [],
      toewijzing: [],
      handmatigePosten: {
        woonvoorzieningenHandicap: [],
        aanbelfuncties: [{ kamersMetToegang: [1, 2] }],
        losseLaadpalen: [],
        aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
        zorgwoning: false,
      },
    });
    const resultaat = berekenR12(input, tarievenset);
    // 0,25 / 2 = 0,125 → FLOOR(0,125 + 0,125; 0,25) = 0,25 (grensgeval, rondt naar boven)
    expect(resultaat.perKamer[1]).toBe(0.25);
    expect(resultaat.perKamer[2]).toBe(0.25);
  });

  it('kent 2 punten losse laadpaal toe, gedeeld over de kamers met toegang', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [],
      toewijzing: [],
      handmatigePosten: {
        woonvoorzieningenHandicap: [],
        aanbelfuncties: [],
        losseLaadpalen: [{ kamersMetToegang: [1, 2] }],
        aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
        zorgwoning: false,
      },
    });
    const resultaat = berekenR12(input, tarievenset);
    expect(resultaat.perKamer[1]).toBe(1);
    expect(resultaat.perKamer[2]).toBe(1);
  });

  it('past de zorgwoning-opslag niet toe in deze rubriek — dat gebeurt bij de eindtelling', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [],
      toewijzing: [],
      handmatigePosten: {
        woonvoorzieningenHandicap: [],
        aanbelfuncties: [],
        losseLaadpalen: [],
        aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
        zorgwoning: true,
      },
    });
    expect(berekenR12(input, tarievenset).perKamer[1]).toBe(0);
  });

  it('geeft 0 punten zonder aanbelfunctie of laadpaal', () => {
    const input = maakPandInvoer({ aantalKamers: 1, ruimtes: [], toewijzing: [] });
    expect(berekenR12(input, tarievenset).perKamer[1]).toBe(0);
  });
});
