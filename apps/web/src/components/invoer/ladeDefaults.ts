import type { Keuken, SanitairVoorziening } from '@wwso/engine';

export function nieuweKeuken(): Omit<Keuken, 'ruimteNr'> {
  return {
    aanrechtlengteM: 0,
    basiseisen: {
      aanEnAfvoerWater: false,
      vastKookaansluitpunt: false,
      aanrechtbladMinimaal1MeterInEenStuk: false,
      tweeInbouwkastenVan50Cm: false,
      waterdichteWandafwerking: false,
    },
    extra: {
      afzuiginstallatie: false,
      kookplaatInductie: false,
      kookplaatKeramisch: false,
      kookplaatGas: false,
      koelkast: false,
      vrieskast: false,
      ovenElektrisch: false,
      ovenGas: false,
      magnetron: false,
      vaatwasmachine: false,
      extraKastruimteEenhedenVan60Cm: 0,
      eenhandsmengkraan: false,
      thermostatischeMengkraan: false,
      kokendWaterfunctie: false,
    },
  };
}

export function nieuwSanitair(): Omit<SanitairVoorziening, 'ruimteNr'> {
  return {
    toiletType: 'Geen',
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
  };
}
