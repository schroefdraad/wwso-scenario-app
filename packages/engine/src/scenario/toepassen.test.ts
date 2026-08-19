import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenEindtelling } from '../eindtelling/index.js';
import { maakPandInvoer, BASISEISEN_GEHAALD, GEEN_KEUKEN_EXTRA } from '../rubrieken/test-utils.js';
import { pasScenarioToe } from './toepassen.js';
import type { Mutatie } from './types.js';

const tarievenset = getTarievenset('2026-01-01');

function maakAsIs() {
  return maakPandInvoer({
    aantalKamers: 2,
    ruimtes: [
      { nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 12, verdieping: 1, verwarmd: true, verkoeld: false },
      { nr: 2, naam: 'Kamer 2', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 1, verwarmd: true, verkoeld: false },
      { nr: 3, naam: 'Gedeelde keuken', type: 'Keuken', oppervlakteM2: 8, verdieping: 1, verwarmd: true, verkoeld: false },
    ],
    toewijzing: [
      { ruimteNr: 1, kamers: [1] },
      { ruimteNr: 2, kamers: [2] },
      { ruimteNr: 3, kamers: [1, 2] },
    ],
    keukens: [
      {
        ruimteNr: 3,
        aanrechtlengteM: 2.5,
        basiseisen: BASISEISEN_GEHAALD,
        extra: GEEN_KEUKEN_EXTRA,
      },
    ],
    pand: { energielabel: 'D' },
  });
}

describe('pasScenarioToe — mutatiesoorten', () => {
  it('pand-patch wijzigt alleen de opgegeven pandvelden', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'pand-patch', patch: { energielabel: 'A' } }];
    const resultaat = pasScenarioToe(asIs, mutaties);
    expect(resultaat.pand.energielabel).toBe('A');
    expect(resultaat.pand.bouwjaar).toBe(asIs.pand.bouwjaar);
  });

  it('ruimte-toevoegen voegt de ruimte én de toewijzing in één keer toe', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [
      {
        soort: 'ruimte-toevoegen',
        ruimte: { nr: 4, naam: 'Kitchenette kamer 1', type: 'Keuken', oppervlakteM2: 2, verdieping: 1, verwarmd: false, verkoeld: false },
        kamers: [1],
      },
    ];
    const resultaat = pasScenarioToe(asIs, mutaties);
    expect(resultaat.ruimtes.find((r) => r.nr === 4)?.naam).toBe('Kitchenette kamer 1');
    expect(resultaat.toewijzing.find((t) => t.ruimteNr === 4)?.kamers).toEqual([1]);
  });

  it('ruimte-toevoegen weigert een bestaand ruimteNr', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [
      {
        soort: 'ruimte-toevoegen',
        ruimte: { nr: 1, naam: 'Dubbel', type: 'Privévertrek', oppervlakteM2: 5, verdieping: 0, verwarmd: false, verkoeld: false },
        kamers: [1],
      },
    ];
    expect(() => pasScenarioToe(asIs, mutaties)).toThrow(/bestaat al/);
  });

  it('ruimte-wijzigen past alleen de opgegeven velden aan', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'ruimte-wijzigen', ruimteNr: 1, patch: { oppervlakteM2: 15 } }];
    const resultaat = pasScenarioToe(asIs, mutaties);
    const kamer1 = resultaat.ruimtes.find((r) => r.nr === 1);
    expect(kamer1?.oppervlakteM2).toBe(15);
    expect(kamer1?.verwarmd).toBe(true);
  });

  it('ruimte-wijzigen weigert een niet-bestaand ruimteNr', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'ruimte-wijzigen', ruimteNr: 99, patch: { oppervlakteM2: 15 } }];
    expect(() => pasScenarioToe(asIs, mutaties)).toThrow(/bestaat niet/);
  });

  it('ruimte-verwijderen weigert zolang er nog een keuken aan de ruimte hangt', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'ruimte-verwijderen', ruimteNr: 3 }];
    expect(() => pasScenarioToe(asIs, mutaties)).toThrow(/nog een keuken/);
  });

  it('ruimte-verwijderen slaagt nadat de keuken eerst is losgekoppeld, en neemt de toewijzing automatisch mee', () => {
    const asIs = maakAsIs();
    const zonderKeuken = pasScenarioToe(asIs, [{ soort: 'keuken-verwijderen', ruimteNr: 3 }]);
    const resultaat = pasScenarioToe(zonderKeuken, [{ soort: 'ruimte-verwijderen', ruimteNr: 3 }]);
    expect(resultaat.ruimtes.some((r) => r.nr === 3)).toBe(false);
    expect(resultaat.toewijzing.some((t) => t.ruimteNr === 3)).toBe(false);
  });

  it('toewijzing-wijzigen vervangt de volledige kamers-lijst', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'toewijzing-wijzigen', ruimteNr: 3, kamers: [2] }];
    const resultaat = pasScenarioToe(asIs, mutaties);
    expect(resultaat.toewijzing.find((t) => t.ruimteNr === 3)?.kamers).toEqual([2]);
  });

  it('keuken-wijzigen past de aanrechtlengte aan zonder de rest te raken', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'keuken-wijzigen', ruimteNr: 3, patch: { aanrechtlengteM: 4 } }];
    const resultaat = pasScenarioToe(asIs, mutaties);
    expect(resultaat.keukens[0].aanrechtlengteM).toBe(4);
  });

  it('sanitair-toevoegen en sanitair-verwijderen werken op ruimteNr', () => {
    const asIs = maakAsIs();
    const nieuw: Mutatie = {
      soort: 'sanitair-toevoegen',
      sanitair: {
        ruimteNr: 1,
        toiletType: 'Geen',
        aantalWastafels: 1,
        aantalMeerpersoonswastafels: 0,
        douche: false,
        bad: false,
        badDoucheCombinatie: false,
        extraEisen: {
          waterdichteVloerafwerking: false,
          vrijeHoogte2MeterOverHelft: false,
          waterdichteWandafwerking: false,
          wastafelMetMengkraanEnSpiegel: false,
          doucheOfBadMetWarmEnKoudWater: false,
        },
        extra: {
          bubbelfunctieBad: false,
          doucheafscheidingVolledig: false,
          aantalHanddoekenradiatoren: 0,
          ingebouwdKastjeMetWastafel: false,
          kastruimte: false,
          aantalStopcontacten: 0,
          eenhandsmengkraan: false,
          thermostatischeMengkraan: false,
        },
      },
    };
    const metWastafel = pasScenarioToe(asIs, [nieuw]);
    expect(metWastafel.sanitair).toHaveLength(1);
    const zonder = pasScenarioToe(metWastafel, [{ soort: 'sanitair-verwijderen', ruimteNr: 1 }]);
    expect(zonder.sanitair).toHaveLength(0);
  });

  it('een scenario dat een ongeldig pand oplevert faalt expliciet', () => {
    const asIs = maakAsIs();
    const mutaties: Mutatie[] = [{ soort: 'toewijzing-wijzigen', ruimteNr: 3, kamers: [1, 2, 5] }]; // kamer 5 bestaat niet
    expect(() => pasScenarioToe(asIs, mutaties)).toThrow(/ongeldig pand/);
  });

  it('muteert de oorspronkelijke as-is invoer nooit', () => {
    const asIs = maakAsIs();
    const kopieVoorAf = JSON.parse(JSON.stringify(asIs));
    pasScenarioToe(asIs, [
      { soort: 'pand-patch', patch: { energielabel: 'A' } },
      { soort: 'ruimte-wijzigen', ruimteNr: 1, patch: { oppervlakteM2: 99 } },
    ]);
    expect(JSON.parse(JSON.stringify(asIs))).toEqual(kopieVoorAf);
  });
});

describe('pasScenarioToe — as-is aanpassen laat de deltas intact', () => {
  const scenario: Mutatie[] = [
    { soort: 'pand-patch', patch: { energielabel: 'A' } },
    {
      soort: 'ruimte-toevoegen',
      ruimte: { nr: 4, naam: 'Kitchenette kamer 1', type: 'Keuken', oppervlakteM2: 2, verdieping: 1, verwarmd: false, verkoeld: false },
      kamers: [1],
    },
  ];

  it('herrekent het scenario automatisch mee met een correctie op de as-is, zonder de mutatielijst aan te passen', () => {
    const asIsOorspronkelijk = maakAsIs();
    const scenarioKopieVoorAf = JSON.parse(JSON.stringify(scenario));

    const resultaat1 = pasScenarioToe(asIsOorspronkelijk, scenario);
    const totaal1 = berekenEindtelling(resultaat1, tarievenset, '2026-01-01');

    // Een correctie op de as-is: kamer 1 blijkt groter te zijn dan eerst ingevoerd.
    const asIsGecorrigeerd = pasScenarioToe(asIsOorspronkelijk, [
      { soort: 'ruimte-wijzigen', ruimteNr: 1, patch: { oppervlakteM2: 20 } },
    ]);

    // Dezelfde scenario-mutatielijst, ongewijzigd, opnieuw toegepast op de gecorrigeerde as-is.
    const resultaat2 = pasScenarioToe(asIsGecorrigeerd, scenario);
    const totaal2 = berekenEindtelling(resultaat2, tarievenset, '2026-01-01');

    // De mutatielijst zelf is niet aangeraakt.
    expect(JSON.parse(JSON.stringify(scenario))).toEqual(scenarioKopieVoorAf);

    // De scenario-delta's staan nog steeds in het resultaat...
    expect(resultaat2.pand.energielabel).toBe('A');
    expect(resultaat2.ruimtes.some((r) => r.nr === 4)).toBe(true);
    // ...én de as-is-correctie is meegekomen.
    expect(resultaat2.ruimtes.find((r) => r.nr === 1)?.oppervlakteM2).toBe(20);
    expect(resultaat1.ruimtes.find((r) => r.nr === 1)?.oppervlakteM2).toBe(12);

    // De grotere kamer 1 levert kamer 1 meer punten (en dus een hogere huur) op dan vóór de correctie.
    expect(totaal2.perKamer[1].totaalPunten).toBeGreaterThan(totaal1.perKamer[1].totaalPunten);
  });
});
