import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { bepaalAanrechtBasispunten, berekenR5 } from './r5-keuken.js';
import { BASISEISEN_GEHAALD, maakKeuken, maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');
const banden = tarievenset.keukenAanrechtBasispunten;

const keukenRuimte = {
  nr: 1,
  naam: 'Keuken',
  type: 'Keuken' as const,
  oppervlakteM2: 9,
  verdieping: 0,
  verwarmd: true,
  verkoeld: false,
};

/** Luxe keuken: alle inbouwapparatuur, ruim boven de aftopping. */
const LUXE_EXTRA = {
  afzuiginstallatie: true,
  kookplaatInductie: true,
  kookplaatKeramisch: false,
  kookplaatGas: false,
  koelkast: true,
  vrieskast: true,
  ovenElektrisch: true,
  ovenGas: false,
  magnetron: true,
  vaatwasmachine: true,
  extraKastruimteEenhedenVan60Cm: 2,
  eenhandsmengkraan: false,
  thermostatischeMengkraan: true,
  kokendWaterfunctie: true,
};

describe('bepaalAanrechtBasispunten (§2.5.2)', () => {
  it('geeft 0 punten onder de 1 meter', () => {
    expect(bepaalAanrechtBasispunten(0.8, 1, banden)).toBe(0);
  });

  it('kent de banden toe met de bovengrens inbegrepen', () => {
    expect(bepaalAanrechtBasispunten(1, 1, banden)).toBe(4);
    expect(bepaalAanrechtBasispunten(2, 1, banden)).toBe(4);
    expect(bepaalAanrechtBasispunten(2.5, 1, banden)).toBe(7);
    expect(bepaalAanrechtBasispunten(3, 1, banden)).toBe(7);
    expect(bepaalAanrechtBasispunten(4, 1, banden)).toBe(10);
    expect(bepaalAanrechtBasispunten(5, 1, banden)).toBe(10);
  });

  it('geeft 13 punten boven 5 meter alleen bij minimaal 8 wooneenheden met toegang', () => {
    expect(bepaalAanrechtBasispunten(6, 8, banden)).toBe(13);
    expect(bepaalAanrechtBasispunten(6, 12, banden)).toBe(13);
    // met minder dan 8 wooneenheden valt de keuken terug op de band eronder
    expect(bepaalAanrechtBasispunten(6, 7, banden)).toBe(10);
    expect(bepaalAanrechtBasispunten(6, 1, banden)).toBe(10);
  });
});

describe('R5 — Keukenvoorzieningen (§2.5)', () => {
  it('telt basispunten plus extra voorzieningen voor een privékeuken', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      keukens: [
        maakKeuken({
          ruimteNr: 1,
          aanrechtlengteM: 2.5,
          extra: { ...LUXE_EXTRA, kookplaatInductie: false, kookplaatKeramisch: true },
        }),
      ],
    });
    // basis 7; extra ruw = 0,75 + 1 + 1 + 0,75 + 1 + 1 + 1,5 + 2×0,75 + 0,5 + 0,5 = 10,5 → afgetopt op 7
    expect(berekenR5(input, tarievenset).perKamer[1]).toBe(14);
  });

  it('geeft 0 punten als één basiseis ontbreekt, ook voor de extra voorzieningen (§2.5.1)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      keukens: [
        maakKeuken({
          ruimteNr: 1,
          aanrechtlengteM: 4,
          basiseisen: { ...BASISEISEN_GEHAALD, tweeInbouwkastenVan50Cm: false },
          extra: LUXE_EXTRA,
        }),
      ],
    });
    expect(berekenR5(input, tarievenset).perKamer[1]).toBe(0);
  });

  it('levert 0 extra punten bij een aanrecht korter dan 1 meter, omdat de aftopping op nul uitkomt', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      keukens: [maakKeuken({ ruimteNr: 1, aanrechtlengteM: 0.9, extra: LUXE_EXTRA })],
    });
    expect(berekenR5(input, tarievenset).perKamer[1]).toBe(0);
  });

  it('topt de extra voorzieningen af op de basispunten (§2.5.3)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      keukens: [maakKeuken({ ruimteNr: 1, aanrechtlengteM: 1.5, extra: LUXE_EXTRA })],
    });
    // basis 4, extra ruw ruim boven 4 → afgetopt op 4 → totaal 8
    expect(berekenR5(input, tarievenset).perKamer[1]).toBe(8);
  });

  it('rekent het voorbeeld uit §2.5.3 exact na', () => {
    const input = maakPandInvoer({
      aantalKamers: 4,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2, 3, 4] }],
      keukens: [
        maakKeuken({
          ruimteNr: 1,
          aanrechtlengteM: 2.5,
          extra: {
            ...maakKeuken({ ruimteNr: 1 }).extra,
            koelkast: true,
            kookplaatKeramisch: true,
            magnetron: true,
          },
        }),
      ],
    });
    // "aanrechtlengte tussen de 2 en 3 meter → 7 punten. Daarnaast 3 punten voor extra
    // voorzieningen (inbouwkoelkast, keramische kookplaat, magnetron). 10 / 4 = 2,5 punt."
    const resultaat = berekenR5(input, tarievenset);
    expect(resultaat.perKamerRuw[1]).toBeCloseTo(2.5, 10);
    expect(resultaat.perKamer[1]).toBe(2.5);
  });

  it('verdeelt een luxe gedeelde keuken over 6 kamers precies factor 6 lager dan dezelfde keuken privé', () => {
    const keuken = { ruimteNr: 1, aanrechtlengteM: 4, extra: LUXE_EXTRA };

    const prive = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      keukens: [maakKeuken(keuken)],
    });
    const gedeeld = maakPandInvoer({
      aantalKamers: 6,
      ruimtes: [keukenRuimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2, 3, 4, 5, 6] }],
      keukens: [maakKeuken(keuken)],
    });

    const priveRuw = berekenR5(prive, tarievenset).perKamerRuw[1];
    const gedeeldResultaat = berekenR5(gedeeld, tarievenset);

    // 4 m aanrecht valt in dezelfde band (10 punten) bij 1 én bij 6 kamers, dus de
    // ongecapte totalen zijn identiek en het verschil per kamer is exact factor 6
    expect(priveRuw).toBe(20);
    for (const kamer of [1, 2, 3, 4, 5, 6]) {
      expect(gedeeldResultaat.perKamerRuw[kamer] * 6).toBeCloseTo(priveRuw, 10);
    }
  });

  it('telt de bijdragen op van een kamer met toegang tot twee keukens', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [
        keukenRuimte,
        { ...keukenRuimte, nr: 2, naam: 'Tweede keuken' },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1, 2] },
        { ruimteNr: 2, kamers: [1] },
      ],
      keukens: [
        maakKeuken({ ruimteNr: 1, aanrechtlengteM: 2.5 }),
        maakKeuken({ ruimteNr: 2, aanrechtlengteM: 1.5 }),
      ],
    });
    const resultaat = berekenR5(input, tarievenset);
    // kamer 1: 7/2 gedeeld + 4/1 privé = 7,5 ; kamer 2: alleen 7/2 = 3,5
    expect(resultaat.perKamerRuw[1]).toBeCloseTo(7.5, 10);
    expect(resultaat.perKamerRuw[2]).toBeCloseTo(3.5, 10);
  });
});
