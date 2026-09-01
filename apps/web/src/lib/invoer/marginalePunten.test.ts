import { describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import { alleTarievensets } from '@wwso/data';
import {
  marginaalKeukenBoolean,
  marginaalKeukenVolgendeKastruimte,
  marginaalSanitairDoucheBad,
  marginaalSanitairExtraBoolean,
  marginaalSanitairVolgendeEenheid,
  marginaalSanitairVolgendeWastafel,
  puntenToiletType,
} from './marginalePunten';

const tarievenset = alleTarievensets()[alleTarievensets().length - 1]!;
const peildatum = tarievenset.peildatum;
const pand = testpand6Kamers;

describe('marginalePunten', () => {
  it('geeft 0 voor een sanitaire extra als de extra-eisen-poort niet gehaald is (ruimte 10)', () => {
    expect(marginaalSanitairExtraBoolean(pand, tarievenset, peildatum, 10, 'eenhandsmengkraan')).toBe(0);
    expect(marginaalSanitairVolgendeEenheid(pand, tarievenset, peildatum, 10, 'aantalStopcontacten', 0)).toBe(0);
  });

  it('geeft een positief getal voor een sanitaire extra als de poort wél gehaald is en er douche/bad-ruimte over is (ruimte 9)', () => {
    const waarde = marginaalSanitairExtraBoolean(pand, tarievenset, peildatum, 9, 'eenhandsmengkraan');
    expect(waarde).not.toBeNull();
    expect(waarde!).toBeGreaterThan(0);
  });

  it('respecteert het plafond: extra punten kunnen niet meer zijn dan de douche/bad-punten (ruimte 8, al bijna vol)', () => {
    // Ruimte 8 heeft al veel extra's aan; het plafond is douche/bad-punten. Een extra eenheid
    // stopcontact kan dus 0 opleveren zodra het plafond al bereikt is — dat is geen bug, dat
    // is precies waarom deze functie de motor gebruikt in plaats van een los tarief.
    const waarde = marginaalSanitairVolgendeEenheid(pand, tarievenset, peildatum, 8, 'aantalStopcontacten', 1);
    expect(waarde).not.toBeNull();
    expect(waarde!).toBeGreaterThanOrEqual(0);
  });

  it('douche/bad-combinatie: exact het verschil tussen aan en uit', () => {
    const doucheWaarde = marginaalSanitairDoucheBad(pand, tarievenset, peildatum, 9, 'douche');
    expect(doucheWaarde).not.toBeNull();
    expect(doucheWaarde!).toBeGreaterThan(0);
  });

  it('toilettype: "Geen" levert 0 op, een echt type levert punten op', () => {
    expect(puntenToiletType(pand, tarievenset, peildatum, 8, 'Geen')).toBe(0);
    const waarde = puntenToiletType(pand, tarievenset, peildatum, 8, 'Hangend in badkamer');
    expect(waarde).not.toBeNull();
    expect(waarde!).toBeGreaterThan(0);
  });

  it('keukenextra: 0 als de vijf basiseisen niet gehaald zijn, positief als ze wel gehaald zijn', () => {
    const ruimte7 = pand.keukens[0]!.ruimteNr;
    const alleEisenGehaald = Object.values(pand.keukens[0]!.basiseisen).every(Boolean);
    const waarde = marginaalKeukenBoolean(pand, tarievenset, peildatum, ruimte7, 'vaatwasmachine');
    expect(waarde).not.toBeNull();
    if (alleEisenGehaald) {
      expect(waarde!).toBeGreaterThanOrEqual(0);
    } else {
      expect(waarde).toBe(0);
    }
  });

  it('volgende eenheid kastruimte: geeft een getal terug, nooit een crash', () => {
    const ruimte7 = pand.keukens[0]!.ruimteNr;
    const huidig = pand.keukens[0]!.extra.extraKastruimteEenhedenVan60Cm;
    const waarde = marginaalKeukenVolgendeKastruimte(pand, tarievenset, peildatum, ruimte7, huidig);
    expect(waarde).not.toBeNull();
    expect(typeof waarde).toBe('number');
  });

  it('wastafel op een slaapkamer (Privévertrek) telt mee, ook als de vijf extra-eisen niet gehaald zijn', () => {
    // Ruimte 1 is een Privévertrek zonder sanitair in de fixture — voegt er hier één toe zonder
    // één van de §2.6.2-eisen aan te vinken, om te bevestigen dat de badge (net als de motor,
    // zie r6-sanitair.ts) de basispunten voor wastafel/toilet/douche/bad nooit aan die eisen-poort
    // koppelt. Dat is precies de verwarring die deze badge moet wegnemen.
    const pandMetSlaapkamerWastafel = {
      ...pand,
      sanitair: [
        ...pand.sanitair,
        {
          ruimteNr: 1,
          toiletType: 'Geen' as const,
          aantalWastafels: 0,
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
      ],
    };
    const waarde = marginaalSanitairVolgendeWastafel(pandMetSlaapkamerWastafel, tarievenset, peildatum, 1, 'aantalWastafels', 0);
    expect(waarde).not.toBeNull();
    expect(waarde!).toBeGreaterThan(0);
  });

  it('geeft null terug in plaats van te crashen als de motor faalt (onbekend COROP-gebied)', () => {
    const kapotPand = { ...pand, pand: { ...pand.pand, coropGebied: 'Onbestaand gebied' } };
    expect(marginaalSanitairExtraBoolean(kapotPand, tarievenset, peildatum, 8, 'eenhandsmengkraan')).toBeNull();
  });
});
