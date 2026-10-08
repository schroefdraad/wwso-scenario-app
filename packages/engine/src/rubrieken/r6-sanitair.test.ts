import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenR6 } from './r6-sanitair';
import { GEEN_SANITAIR_EXTRA, maakPandInvoer, maakSanitair } from './test-utils';

const tarievenset = getTarievenset('2026-01-01');

const badruimte = {
  nr: 1,
  naam: 'Badkamer',
  type: 'Badruimte' as const,
  oppervlakteM2: 5,
  verdieping: 0,
  verwarmd: true,
  verkoeld: false,
};

const slaapkamer = {
  nr: 2,
  naam: 'Slaapkamer',
  type: 'Privévertrek' as const,
  oppervlakteM2: 14,
  verdieping: 1,
  verwarmd: true,
  verkoeld: false,
};

const eenRuimte = (
  ruimte: typeof badruimte | typeof slaapkamer,
  post: Parameters<typeof maakSanitair>[0],
  aantalKamers = 1,
) =>
  maakPandInvoer({
    aantalKamers,
    ruimtes: [ruimte],
    toewijzing: [{ ruimteNr: ruimte.nr, kamers: Array.from({ length: aantalKamers }, (_, i) => i + 1) }],
    sanitair: [maakSanitair(post)],
  });

describe('R6 — Sanitaire basisvoorzieningen (§2.6.1)', () => {
  it('waardeert de vier toilettypen volgens de tabel', () => {
    const punten = (toiletType: Parameters<typeof maakSanitair>[0]['toiletType']) =>
      berekenR6(eenRuimte(badruimte, { ruimteNr: 1, toiletType }), tarievenset).perKamer[1];

    expect(punten('Staand in toiletruimte')).toBe(3);
    expect(punten('Staand in badkamer')).toBe(2);
    expect(punten('Hangend in toiletruimte')).toBe(3.75);
    expect(punten('Hangend in badkamer')).toBe(2.75);
    expect(punten('Geen')).toBe(0);
  });

  it('telt in een badkamer elke wastafel afzonderlijk', () => {
    const input = eenRuimte(badruimte, { ruimteNr: 1, aantalWastafels: 3 });
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(3);
  });

  it('begrenst wastafels buiten de badkamer op 1 punt per vertrek', () => {
    const input = eenRuimte(slaapkamer, { ruimteNr: 2, aantalWastafels: 3 });
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(1);
  });

  it('begrenst meerpersoonswastafels buiten de badkamer op 1,50 punt per vertrek', () => {
    const input = eenRuimte(slaapkamer, { ruimteNr: 2, aantalMeerpersoonswastafels: 2 });
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(1.5);
  });

  it('waardeert losse douche en bad samen hoger dan een bad/douchecombinatie', () => {
    const los = eenRuimte(badruimte, { ruimteNr: 1, douche: true, bad: true });
    const combi = eenRuimte(badruimte, { ruimteNr: 1, badDoucheCombinatie: true });

    expect(berekenR6(los, tarievenset).perKamer[1]).toBe(8);
    expect(berekenR6(combi, tarievenset).perKamer[1]).toBe(6);
  });

  it('telt bij een bad/douchecombinatie de losse douche en het losse bad niet apart mee', () => {
    const input = eenRuimte(badruimte, {
      ruimteNr: 1,
      douche: true,
      bad: true,
      badDoucheCombinatie: true,
    });
    // "Als een bad is voorzien van een (hand)douche, dan wordt de douchegarnituur niet
    // afzonderlijk geteld" — dus 6, niet 14
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(6);
  });

  it('waardeert een douche in een slaapkamer gewoon mee (§2.6)', () => {
    const input = eenRuimte(slaapkamer, { ruimteNr: 2, douche: true });
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(3);
  });
});

describe('R6 — Extra sanitaire voorzieningen (§2.6.2)', () => {
  it('rekent het voorbeeld uit het beleidsboek na: 5 extra punten worden niet afgetopt bij 6 basispunten', () => {
    const input = eenRuimte(
      badruimte,
      {
        ruimteNr: 1,
        badDoucheCombinatie: true,
        aantalWastafels: 1,
        extra: {
          ...GEEN_SANITAIR_EXTRA,
          bubbelfunctieBad: true,
          doucheafscheidingVolledig: true,
          aantalHanddoekenradiatoren: 2,
          thermostatischeMengkraan: 1,
          eenhandsmengkraan: 1,
        },
      },
      4,
    );
    // extra = 1,50 + 1,25 + 2×0,75 + 0,50 + 0,25 = 5,00; niet afgetopt want < 6
    // totaal = 6 (bad/douche) + 1 (wastafel) + 5 = 12, gedeeld door 4 kamers = 3
    const resultaat = berekenR6(input, tarievenset);
    expect(resultaat.perKamerRuw[1]).toBeCloseTo(3, 10);
  });

  it('topt de extra punten af op de douche/bad-punten, niet op toilet en wastafel', () => {
    const input = eenRuimte(badruimte, {
      ruimteNr: 1,
      toiletType: 'Hangend in badkamer',
      aantalWastafels: 2,
      douche: true,
      extra: {
        ...GEEN_SANITAIR_EXTRA,
        bubbelfunctieBad: true,
        doucheafscheidingVolledig: true,
        aantalHanddoekenradiatoren: 2,
        thermostatischeMengkraan: 1,
      },
    });
    // extra ruw = 1,50 + 1,25 + 1,50 + 0,50 = 4,75 → afgetopt op douche = 3
    // totaal = 2,75 + 2 + 3 + 3 = 10,75
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(10.75);
  });

  it('laat alle extra punten vervallen als de ruimte niet aan de vijf eisen voldoet', () => {
    const input = eenRuimte(badruimte, {
      ruimteNr: 1,
      douche: true,
      extraEisen: {
        waterdichteVloerafwerking: true,
        vrijeHoogte2MeterOverHelft: true,
        waterdichteWandafwerking: true,
        wastafelMetMengkraanEnSpiegel: false,
        doucheOfBadMetWarmEnKoudWater: true,
      },
      extra: {
        ...GEEN_SANITAIR_EXTRA,
        bubbelfunctieBad: true,
        doucheafscheidingVolledig: true,
        thermostatischeMengkraan: 1,
      },
    });
    // alleen de basispunten van de douche blijven staan
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(3);
  });

  it('geeft geen extra punten zonder douche of bad, want de aftopping komt op nul uit', () => {
    const input = eenRuimte(badruimte, {
      ruimteNr: 1,
      toiletType: 'Hangend in badkamer',
      aantalWastafels: 1,
      extra: { ...GEEN_SANITAIR_EXTRA, thermostatischeMengkraan: 1, aantalStopcontacten: 2 },
    });
    // 2,75 toilet + 1 wastafel + 0 douche/bad + min(extra, 0) = 3,75
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(3.75);
  });

  it('begrenst stopcontacten op twee per wastafel', () => {
    const input = eenRuimte(badruimte, {
      ruimteNr: 1,
      aantalWastafels: 1,
      douche: true,
      bad: true,
      extra: { ...GEEN_SANITAIR_EXTRA, aantalStopcontacten: 6 },
    });
    // hooguit 2 stopcontacten × 0,25 = 0,50; totaal 1 + 8 + 0,50 = 9,50
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(9.5);
  });

  it('begrenst kastruimte op 0,75 punt', () => {
    const input = eenRuimte(badruimte, {
      ruimteNr: 1,
      douche: true,
      extra: { ...GEEN_SANITAIR_EXTRA, kastruimte: true },
    });
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(3.75);
  });

  it('deelt gedeelde sanitaire voorzieningen door het aantal kamers met toegang', () => {
    const input = eenRuimte(badruimte, { ruimteNr: 1, douche: true, bad: true }, 4);
    const resultaat = berekenR6(input, tarievenset);
    // 8 punten / 4 kamers = 2 per kamer
    for (const kamer of [1, 2, 3, 4]) {
      expect(resultaat.perKamer[kamer]).toBe(2);
    }
  });
});

// Audit 2026-10-06 bevinding 3.2: bij een adres met 8 of meer onzelfstandige woonruimten geldt
// voor één ander vertrek (dan de badkamer) of overige ruimte het wastafelmaximum niet (§2.6.1).
describe('wastafel-uitzondering bij 8 of meer kamers (§2.6.1)', () => {
  const tarieven = getTarievenset('2026-01-01');
  const gedeeld = (kamers: number) => Array.from({ length: kamers }, (_, i) => i + 1);
  function pand(aantalKamers: number) {
    return maakPandInvoer({
      aantalKamers,
      ruimtes: [
        { nr: 1, naam: 'Wasruimte', type: 'Wasruimte', oppervlakteM2: 6, verdieping: 0, verwarmd: false, verkoeld: false },
        { nr: 2, naam: 'Gang met fontein', type: 'Overige ruimte', oppervlakteM2: 4, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: gedeeld(aantalKamers) },
        { ruimteNr: 2, kamers: gedeeld(aantalKamers) },
      ],
      sanitair: [maakSanitair({ ruimteNr: 1, aantalWastafels: 3 }), maakSanitair({ ruimteNr: 2, aantalWastafels: 2 })],
    });
  }

  it('8 kamers: in één ruimte tellen alle wastafels, in de andere blijft het maximum van 1', () => {
    // (3 + 1) / 8 = 0,5
    expect(berekenR6(pand(8), tarieven).perKamerRuw[1]).toBeCloseTo(0.5, 10);
  });

  it('7 kamers: overal het maximum van 1 per ruimte', () => {
    // (1 + 1) / 7
    expect(berekenR6(pand(7), tarieven).perKamerRuw[1]).toBeCloseTo(2 / 7, 10);
  });
});

// Code-review 2026-10-06: de uitzondering ging naar de ruimte met de grootste winst, ook als
// geen enkele kamer er toegang toe had, en werd per sanitairregel gekozen in plaats van per ruimte.
describe('wastafel-uitzondering: alleen een ruimte met toegang, gekozen per ruimte', () => {
  const tarieven = getTarievenset('2026-01-01');
  const alle = [1, 2, 3, 4, 5, 6, 7, 8];
  const ruimte = (nr: number) => ({ nr, naam: `R${nr}`, type: 'Overige ruimte' as const, oppervlakteM2: 5, verdieping: 0, verwarmd: false, verkoeld: false });

  it('slaat een ruimte zonder kamers over', () => {
    const input = maakPandInvoer({
      aantalKamers: 8,
      ruimtes: [ruimte(1), ruimte(2)],
      toewijzing: [{ ruimteNr: 1, kamers: [] }, { ruimteNr: 2, kamers: alle }],
      sanitair: [maakSanitair({ ruimteNr: 1, aantalWastafels: 4 }), maakSanitair({ ruimteNr: 2, aantalWastafels: 3 })],
    });
    expect(berekenR6(input, tarieven).perKamerRuw[1]).toBeCloseTo(3 / 8, 10);
  });

  it('telt meerdere sanitairregels in dezelfde ruimte samen', () => {
    const input = maakPandInvoer({
      aantalKamers: 8,
      ruimtes: [ruimte(5), ruimte(7)],
      toewijzing: [{ ruimteNr: 5, kamers: alle }, { ruimteNr: 7, kamers: alle }],
      sanitair: [
        maakSanitair({ ruimteNr: 5, aantalWastafels: 2 }),
        maakSanitair({ ruimteNr: 5, aantalWastafels: 2 }),
        maakSanitair({ ruimteNr: 7, aantalWastafels: 2 }),
      ],
    });
    // Ruimte 5: twee regels van 2 wastafels, gecapt 1 + 1, zonder maximum 4 → winst 2.
    // Ruimte 7: gecapt 1, zonder maximum 2 → winst 1. Ruimte 5 krijgt de uitzondering: (4 + 1) / 8.
    expect(berekenR6(input, tarieven).perKamerRuw[1]).toBeCloseTo(5 / 8, 10);
  });
});

// Code-review 2026-10-08, besluit eigenaar: in een toiletruimte tellen alleen toilet en fonteintje.
// Een meerpersoonswastafel, douche, bad of extra's (bijv. blijven staan na het wijzigen van het
// ruimtetype; de invoer verbergt die velden daar) tellen niet mee. INTERPRETATIE: een ruimte met
// douche of bad is geen toiletruimte meer, het type is leidend.
describe('toiletruimte: alleen toilet en fonteintje tellen', () => {
  const tarieven = getTarievenset('2026-01-01');
  const toiletruimte = { nr: 1, naam: 'WC', type: 'Toiletruimte' as const, oppervlakteM2: 1.5, verdieping: 0, verwarmd: false, verkoeld: false };

  it('verborgen meerpersoonswastafel, douche en extra’s tellen niet', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [toiletruimte],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
      sanitair: [
        maakSanitair({
          ruimteNr: 1,
          toiletType: 'Staand in toiletruimte',
          aantalWastafels: 1,
          aantalMeerpersoonswastafels: 1,
          douche: true,
          extra: { ...GEEN_SANITAIR_EXTRA, aantalHanddoekenradiatoren: 1 },
        }),
      ],
    });
    // toilet 3 + fonteintje 1 = 4
    expect(berekenR6(input, tarieven).perKamer[1]).toBe(4);
  });
});

// Code-review 2026-10-08: de wastafel-uitzondering (8+ kamers) koos een toiletruimte met een
// blijven-staan aantal wastafels, waar de uitzondering niets oplevert.
describe('wastafel-uitzondering negeert de beperking van een toiletruimte niet', () => {
  it('kiest de echte ruimte met twee wastafels, niet de toiletruimte', () => {
    const tarieven = getTarievenset('2026-01-01');
    const alle = [1, 2, 3, 4, 5, 6, 7, 8];
    const input = maakPandInvoer({
      aantalKamers: 8,
      ruimtes: [
        { nr: 1, naam: 'WC', type: 'Toiletruimte', oppervlakteM2: 2, verdieping: 0, verwarmd: false, verkoeld: false },
        { nr: 2, naam: 'Wasruimte', type: 'Wasruimte', oppervlakteM2: 5, verdieping: 0, verwarmd: false, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: alle }, { ruimteNr: 2, kamers: alle }],
      sanitair: [maakSanitair({ ruimteNr: 1, aantalWastafels: 2 }), maakSanitair({ ruimteNr: 2, aantalWastafels: 2 })],
    });
    // WC: max 1 fonteintje → 1. Wasruimte met uitzondering → 2. Samen 3 / 8.
    expect(berekenR6(input, tarieven).perKamerRuw[1]).toBeCloseTo(3 / 8, 10);
  });
});
