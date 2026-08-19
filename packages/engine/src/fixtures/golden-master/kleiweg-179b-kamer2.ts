import type { PandInvoer } from '../../types/index.js';

/**
 * Golden-master scenario — Kleiweg 179-B, Rotterdam, "2e slaapkamer" (16 m²).
 *
 * Bron: `resources/golden-master/Slaapkamer 2 - A++.pdf`, een officiële "Resultaat
 * Huurprijscheck" van de Huurcommissie, ingevuld 6-7-2026. Uitkomst volgens de site:
 * 67 punten, € 648,24 (Woonruimte 28, Binnenruimtes 34,75, Buitenruimtes 3,75).
 *
 * Het pand heeft 6 onzelfstandige woonruimten die twee keukens (5,2 m² en 10,7 m²) en
 * drie badruimten (4,6 / 3,5 / 6,7 m²) delen, plus twee toiletruimten. Alleen déze kamer
 * (kamer 1 in dit bestand) heeft een eigen privébalkon (4,7 m²) — dat staat zo op de site,
 * ook al suggereert het losse adviesdocument (Kleiweg 179-B Advies jan-26, geen officiële
 * bron) een ánder buitenruimte-model met gedeelde balkons. De site is hier leidend.
 *
 * Kamers 2 t/m 6 zijn placeholders: hun eigen privévertrekken zijn niet uit deze bron af
 * te leiden (de site toont alleen de kamer die je zelf doorloopt), en zijn ook niet nodig
 * om kamer 1's totaal na te rekenen — kamer 1's punten hangen alleen af van kamer 1's eigen
 * ruimte en de gedeelde ruimtes, niet van wat de andere kamers zelf hebben.
 *
 * Twee velden staan niet op het brondocument en zijn aangenomen (niet uit de bron
 * herleidbaar, dus expliciet hier vastgelegd in plaats van stil ingevuld):
 * - `energielabelIngangsdatum`: alleen het label ("A++") is bekend, niet de ingangsdatum.
 *   2023-01-01 gekozen — ruim binnen de 10-jaars geldigheid en buiten het vereenvoudigde-
 *   labelvenster (2015-2021), dus zonder invloed op de uitkomst zolang het label geldig
 *   blijft.
 * - `bouwjaar`: niet vermeld (niet nodig, want het energielabel is bekend en heeft
 *   voorrang). 1970 als neutrale placeholder.
 *
 * Toiletruimten hebben geen eigen m² op de site (ze horen niet bij "Vertrekken" of
 * "Overige ruimten" — 0 punten in R1/R2). Gemodelleerd als 'Verkeersruimte' (niet-verwarmd)
 * zodat ze puur als drager voor de sanitaire voorziening dienen, zonder zelf oppervlakte-
 * punten te genereren.
 */
export const kleiweg179bKamer2: PandInvoer = {
  pand: {
    adres: 'Kleiweg 179-B',
    stad: 'Rotterdam',
    wozWaarde: 490000,
    wozPeildatum: '2025-01-01',
    wozOppervlak: 157,
    coropGebied: 'Groot-Rijnmond',
    energielabel: 'A++',
    energielabelIngangsdatum: '2023-01-01',
    bouwjaar: 1970,
    soortWoning: 'Meergezins',
    aantalKamers: 6,
    aantalWoningenInComplex: 1,
    monument: 'Geen',
  },
  ruimtes: [
    { nr: 1, naam: '2e slaapkamer', type: 'Privévertrek', oppervlakteM2: 16, verdieping: 1, verwarmd: true, verkoeld: false },
    { nr: 2, naam: 'Keuken 1 (gedeeld)', type: 'Keuken', oppervlakteM2: 5.2, verdieping: 0, verwarmd: true, verkoeld: false },
    { nr: 3, naam: 'Keuken 2 (gedeeld)', type: 'Keuken', oppervlakteM2: 10.7, verdieping: 0, verwarmd: true, verkoeld: false },
    { nr: 4, naam: 'Badkamer 1 (gedeeld)', type: 'Badruimte', oppervlakteM2: 4.6, verdieping: 0, verwarmd: true, verkoeld: false },
    { nr: 5, naam: 'Badkamer 2 (gedeeld)', type: 'Badruimte', oppervlakteM2: 3.5, verdieping: 0, verwarmd: true, verkoeld: false },
    { nr: 6, naam: 'Badkamer 3 (gedeeld)', type: 'Badruimte', oppervlakteM2: 6.7, verdieping: 0, verwarmd: true, verkoeld: false },
    { nr: 7, naam: 'Toiletruimte 1 (gedeeld)', type: 'Verkeersruimte', oppervlakteM2: 1.5, verdieping: 0, verwarmd: false, verkoeld: false },
    { nr: 8, naam: 'Toiletruimte 2 (gedeeld)', type: 'Verkeersruimte', oppervlakteM2: 1.5, verdieping: 0, verwarmd: false, verkoeld: false },
    { nr: 9, naam: 'Balkon (privé)', type: 'Buitenruimte privé', oppervlakteM2: 4.7, verdieping: 1, verwarmd: false, verkoeld: false },
  ],
  toewijzing: [
    { ruimteNr: 1, kamers: [1] },
    { ruimteNr: 2, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 3, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 4, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 5, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 6, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 7, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 8, kamers: [1, 2, 3, 4, 5, 6] },
    { ruimteNr: 9, kamers: [1] },
  ],
  keukens: [
    {
      ruimteNr: 2,
      aanrechtlengteM: 2.5,
      basiseisen: {
        aanEnAfvoerWater: true,
        vastKookaansluitpunt: true,
        aanrechtbladMinimaal1MeterInEenStuk: true,
        tweeInbouwkastenVan50Cm: true,
        waterdichteWandafwerking: true,
      },
      extra: {
        afzuiginstallatie: true,
        kookplaatInductie: false,
        kookplaatKeramisch: false,
        kookplaatGas: true,
        koelkast: false,
        vrieskast: false,
        ovenElektrisch: true,
        ovenGas: false,
        magnetron: false,
        vaatwasmachine: false,
        extraKastruimteEenhedenVan60Cm: 4,
        eenhandsmengkraan: true,
        thermostatischeMengkraan: false,
        kokendWaterfunctie: false,
      },
    },
    {
      ruimteNr: 3,
      aanrechtlengteM: 2.5,
      basiseisen: {
        aanEnAfvoerWater: true,
        vastKookaansluitpunt: true,
        aanrechtbladMinimaal1MeterInEenStuk: true,
        tweeInbouwkastenVan50Cm: true,
        waterdichteWandafwerking: true,
      },
      extra: {
        afzuiginstallatie: true,
        kookplaatInductie: false,
        kookplaatKeramisch: false,
        kookplaatGas: false,
        koelkast: false,
        vrieskast: false,
        ovenElektrisch: false,
        ovenGas: false,
        magnetron: true,
        vaatwasmachine: false,
        extraKastruimteEenhedenVan60Cm: 1,
        eenhandsmengkraan: false,
        thermostatischeMengkraan: false,
        kokendWaterfunctie: false,
      },
    },
  ],
  sanitair: [
    {
      ruimteNr: 4,
      toiletType: 'Geen',
      aantalWastafels: 1,
      aantalMeerpersoonswastafels: 0,
      douche: true,
      bad: false,
      badDoucheCombinatie: false,
      extraEisen: {
        waterdichteVloerafwerking: true,
        vrijeHoogte2MeterOverHelft: true,
        waterdichteWandafwerking: true,
        wastafelMetMengkraanEnSpiegel: true,
        doucheOfBadMetWarmEnKoudWater: true,
      },
      extra: {
        bubbelfunctieBad: false,
        doucheafscheidingVolledig: true,
        aantalHanddoekenradiatoren: 1,
        ingebouwdKastjeMetWastafel: true,
        kastruimte: true,
        aantalStopcontacten: 1,
        eenhandsmengkraan: true,
        thermostatischeMengkraan: false,
      },
    },
    {
      ruimteNr: 5,
      toiletType: 'Geen',
      aantalWastafels: 0,
      aantalMeerpersoonswastafels: 0,
      douche: true,
      bad: false,
      badDoucheCombinatie: false,
      extraEisen: {
        waterdichteVloerafwerking: true,
        vrijeHoogte2MeterOverHelft: true,
        waterdichteWandafwerking: true,
        wastafelMetMengkraanEnSpiegel: true,
        doucheOfBadMetWarmEnKoudWater: true,
      },
      extra: {
        bubbelfunctieBad: false,
        doucheafscheidingVolledig: true,
        aantalHanddoekenradiatoren: 1,
        ingebouwdKastjeMetWastafel: true,
        kastruimte: false,
        aantalStopcontacten: 0,
        eenhandsmengkraan: true,
        thermostatischeMengkraan: false,
      },
    },
    {
      ruimteNr: 6,
      toiletType: 'Hangend in badkamer',
      aantalWastafels: 1,
      aantalMeerpersoonswastafels: 0,
      douche: true,
      bad: true,
      badDoucheCombinatie: false,
      extraEisen: {
        waterdichteVloerafwerking: true,
        vrijeHoogte2MeterOverHelft: true,
        waterdichteWandafwerking: true,
        wastafelMetMengkraanEnSpiegel: true,
        doucheOfBadMetWarmEnKoudWater: true,
      },
      extra: {
        bubbelfunctieBad: false,
        doucheafscheidingVolledig: true,
        aantalHanddoekenradiatoren: 1,
        ingebouwdKastjeMetWastafel: true,
        kastruimte: true,
        aantalStopcontacten: 1,
        eenhandsmengkraan: true,
        thermostatischeMengkraan: false,
      },
    },
    {
      ruimteNr: 7,
      toiletType: 'Staand in toiletruimte',
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
    {
      ruimteNr: 8,
      toiletType: 'Staand in toiletruimte',
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
  ],
  parkeerplekken: [],
  handmatigePosten: {
    woonvoorzieningenHandicap: [],
    aanbelfuncties: [],
    losseLaadpalen: [],
    aftrekSituaties: {
      verhuurderCriterium: [],
      ruitoppervlakteOnvoldoende: [],
      raamkozijnTeHoog: [],
    },
    zorgwoning: false,
  },
};
