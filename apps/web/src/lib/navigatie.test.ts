import { describe, expect, it } from 'vitest';
import { testpand6Kamers, type PandInvoer } from '@wwso/engine';
import { bepaalVergelijkingBron, resultaatUrl, vergelijkingUrl, woningBewerkenUrl } from './navigatie';
import { maakScenarioBewerkStart, pasScenarioResultaatToe } from './vergelijking/scenarioBewerkBrug';
import { bepaalOpslaanActie } from './deals/types';

/**
 * Regressietests per historisch incident van het staat-navigatie-bugpatroon (audit 2026-10-03).
 * De incidenten van vandaag zelf staan in `vergelijking/scenarioBewerkBrug.test.ts`,
 * `invoer/opslag.test.ts` en `deals/types.test.ts`.
 */

const WONING = '2e7b0c80-24b3-4525-a24c-944f4eaa3a65';

function pandMetAdres(adres: string): PandInvoer {
  return { ...testpand6Kamers, pand: { ...testpand6Kamers.pand, adres } };
}

describe('incident 2026-08-22 — terug naar de vergelijking zonder ?deal= verloor de woning-koppeling', () => {
  it('de terug-URL van een opgeslagen woning bevat altijd de woning', () => {
    expect(vergelijkingUrl(WONING)).toBe(`/woning/vergelijking?deal=${WONING}`);
  });

  it('alleen een nog niet opgeslagen woning gaat zonder ?deal=', () => {
    expect(vergelijkingUrl(undefined)).toBe('/woning/vergelijking');
  });
});

describe('incident 2026-09-01 — "Bewerk handmatig" en terug verloor de woning-koppeling', () => {
  it('de scenario-bewerking onthoudt naar welke woning hij terug moet', () => {
    const start = maakScenarioBewerkStart({ naam: 'Scenario 1', pand: testpand6Kamers }, 0, WONING, vergelijkingUrl(WONING), {
      tarievensetPeildatum: '2026-01-01',
      kostencatalogusVersie: '0.1',
    });
    expect(start.terugUrl).toContain(`deal=${WONING}`);
    expect(start.dealId).toBe(WONING);
  });
});

describe('incident 2026-09-01 — na "Bekijk volledig resultaat" verscheen het scenario-pand als as-is', () => {
  it('een sessie-restje van een opgeslagen woning wordt NOOIT als as-is getoond, maar doorgestuurd naar ?deal=', () => {
    const restje = { dealId: WONING, pand: pandMetAdres('SCENARIO-pand') };
    expect(bepaalVergelijkingBron(null, restje)).toEqual({ soort: 'doorsturen', url: vergelijkingUrl(WONING) });
  });

  it('met ?deal= komt de woning altijd uit de database, ook als er een restje ligt', () => {
    const restje = { dealId: 'andere-woning', pand: pandMetAdres('ander') };
    expect(bepaalVergelijkingBron(WONING, restje)).toEqual({ soort: 'deal', dealId: WONING });
  });

  it('alleen een nooit opgeslagen woning mag uit het restje komen', () => {
    const restje: { dealId?: string; pand: PandInvoer } = { pand: pandMetAdres('nieuw') };
    expect(bepaalVergelijkingBron(null, restje)).toEqual({ soort: 'sessie', context: restje });
    expect(bepaalVergelijkingBron(null, null)).toEqual({ soort: 'leeg' });
  });

  it('het as-is-resultaat van een opgeslagen woning heeft een eigen, deelbare URL', () => {
    expect(resultaatUrl(WONING)).toBe(`/woning/resultaat?deal=${WONING}`);
    expect(woningBewerkenUrl(WONING)).toBe(`/woning/nieuw?deal=${WONING}`);
  });
});

describe('incident 2026-10-02 — een scenario voor de tweede keer bewerken viel terug naar de as-is', () => {
  it('de bewerking start vanaf het al bewerkte scenario-pand, niet vanaf de as-is', () => {
    const bewerktScenario = { naam: 'Scenario 2', pand: pandMetAdres('eerder bewerkt') };
    const start = maakScenarioBewerkStart(bewerktScenario, 1, WONING, vergelijkingUrl(WONING), { tarievensetPeildatum: '2026-01-01', kostencatalogusVersie: '0.1' });
    expect(start.asIsPand.pand.adres).toBe('eerder bewerkt');
  });

  it('terugkomen vervangt alleen het pand van dát slot; label en maatregelen blijven staan', () => {
    const slots = [
      { pand: pandMetAdres('s1'), kamerBewerkt: false, energielabelDoel: 'A' as const, sleutels: ['x'] },
      { pand: pandMetAdres('s2'), kamerBewerkt: false, energielabelDoel: 'A++' as const, sleutels: ['y', 'z'] },
    ];
    const na = pasScenarioResultaatToe(slots, { slotIndex: 1, dealId: WONING, bewerktPand: pandMetAdres('s2-bewerkt') });
    expect(na[0]).toBe(slots[0]);
    expect(na[1]).toMatchObject({ kamerBewerkt: true, energielabelDoel: 'A++', sleutels: ['y', 'z'] });
    expect(na[1].pand.pand.adres).toBe('s2-bewerkt');
  });
});

describe('incident 2026-10-02 — onzekere bewerkrechten maakten ongemerkt een kopie', () => {
  it('bij onzekere rechten wordt opslaan geblokkeerd, niet stil gekopieerd', () => {
    expect(bepaalOpslaanActie({ dealId: WONING, magBewerken: false, bewerkrechtenOnzeker: true })).toBe('geblokkeerd');
  });

  it('alleen een bewuste keuze ("Toch opslaan als nieuwe kopie") maakt dan een kopie', () => {
    expect(bepaalOpslaanActie({ dealId: WONING, magBewerken: false, bewerkrechtenOnzeker: true, forceerKopie: true })).toBe('kopie');
  });

  it('eigen woning → bijwerken, niet van jou → kopie, nog geen woning → nieuw', () => {
    expect(bepaalOpslaanActie({ dealId: WONING, magBewerken: true, bewerkrechtenOnzeker: false })).toBe('bijwerken');
    expect(bepaalOpslaanActie({ dealId: WONING, magBewerken: false, bewerkrechtenOnzeker: false })).toBe('kopie');
    expect(bepaalOpslaanActie({ dealId: undefined, magBewerken: true, bewerkrechtenOnzeker: false })).toBe('nieuw');
  });
});
