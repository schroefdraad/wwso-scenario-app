import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenR6 } from './r6-sanitair.js';
import { GEEN_SANITAIR_EXTRA, maakPandInvoer, maakSanitair } from './test-utils.js';

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
          thermostatischeMengkraan: true,
          eenhandsmengkraan: true,
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
        thermostatischeMengkraan: true,
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
        thermostatischeMengkraan: true,
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
      extra: { ...GEEN_SANITAIR_EXTRA, thermostatischeMengkraan: true, aantalStopcontacten: 2 },
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
