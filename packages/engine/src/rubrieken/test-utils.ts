import type {
  GemeenschappelijkeParkeerplek,
  HandmatigePosten,
  Keuken,
  KeukenBasiseisen,
  KeukenExtraVoorzieningen,
  Pand,
  PandInvoer,
  Ruimte,
  SanitairExtraEisen,
  SanitairExtraVoorzieningen,
  SanitairVoorziening,
  ToewijzingEntry,
} from '../types/index';

const BASIS_PAND: Pand = {
  adres: 'Teststraat 1',
  stad: 'Rotterdam',
  wozWaarde: 300000,
  wozPeildatum: '2025-01-01',
  wozOppervlak: 100,
  coropGebied: 'Groot-Rijnmond',
  energielabel: 'D',
  energielabelIngangsdatum: '2023-01-01',
  bouwjaar: 1990,
  soortWoning: 'Meergezins',
  aantalKamers: 1,
  aantalWoningenInComplex: 1,
  monument: 'Geen',
};

/**
 * Fabrieksfunctie, geen constante: `maakPandInvoer` gebruikt dit als default wanneer de
 * aanroeper geen `handmatigePosten` meegeeft. Een gedeelde singleton-instantie zou hier een
 * val zijn — een test die het geretourneerde object direct muteert (bijv.
 * `input.handmatigePosten.zorgwoning = true`) zou dan onbedoeld ook andere tests raken die
 * later dezelfde default aanroepen.
 */
function geenHandmatigePosten(): HandmatigePosten {
  return {
    woonvoorzieningenHandicap: [],
    aanbelfuncties: [],
    losseLaadpalen: [],
    aftrekSituaties: {
      verhuurderCriterium: [],
      ruitoppervlakteOnvoldoende: [],
      raamkozijnTeHoog: [],
    },
    zorgwoning: false,
  };
}

/** Alle vijf basiseisen van §2.5.1 gehaald — het normale geval. */
export const BASISEISEN_GEHAALD: KeukenBasiseisen = {
  aanEnAfvoerWater: true,
  vastKookaansluitpunt: true,
  aanrechtbladMinimaal1MeterInEenStuk: true,
  tweeInbouwkastenVan50Cm: true,
  waterdichteWandafwerking: true,
};

export const GEEN_KEUKEN_EXTRA: KeukenExtraVoorzieningen = {
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
};

export const SANITAIR_EISEN_GEHAALD: SanitairExtraEisen = {
  waterdichteVloerafwerking: true,
  vrijeHoogte2MeterOverHelft: true,
  waterdichteWandafwerking: true,
  wastafelMetMengkraanEnSpiegel: true,
  doucheOfBadMetWarmEnKoudWater: true,
};

export const GEEN_SANITAIR_EXTRA: SanitairExtraVoorzieningen = {
  bubbelfunctieBad: false,
  doucheafscheidingVolledig: false,
  aantalHanddoekenradiatoren: 0,
  ingebouwdKastjeMetWastafel: false,
  kastruimte: false,
  aantalStopcontacten: 0,
  eenhandsmengkraan: false,
  thermostatischeMengkraan: false,
};

export function maakKeuken(opts: Partial<Keuken> & { ruimteNr: number }): Keuken {
  return {
    aanrechtlengteM: 2.5,
    basiseisen: BASISEISEN_GEHAALD,
    extra: GEEN_KEUKEN_EXTRA,
    verwarmd: true,
    ...opts,
  };
}

export function maakSanitair(
  opts: Partial<SanitairVoorziening> & { ruimteNr: number },
): SanitairVoorziening {
  return {
    toiletType: 'Geen',
    aantalWastafels: 0,
    aantalMeerpersoonswastafels: 0,
    douche: false,
    bad: false,
    badDoucheCombinatie: false,
    extraEisen: SANITAIR_EISEN_GEHAALD,
    extra: GEEN_SANITAIR_EXTRA,
    ...opts,
  };
}

export function maakPandInvoer(opts: {
  aantalKamers: number;
  ruimtes: Ruimte[];
  toewijzing: ToewijzingEntry[];
  keukens?: Keuken[];
  sanitair?: SanitairVoorziening[];
  parkeerplekken?: GemeenschappelijkeParkeerplek[];
  pand?: Partial<Pand>;
  handmatigePosten?: HandmatigePosten;
}): PandInvoer {
  return {
    pand: { ...BASIS_PAND, aantalKamers: opts.aantalKamers, ...opts.pand },
    ruimtes: opts.ruimtes,
    toewijzing: opts.toewijzing,
    keukens: opts.keukens ?? [],
    sanitair: opts.sanitair ?? [],
    parkeerplekken: opts.parkeerplekken ?? [],
    handmatigePosten: opts.handmatigePosten ?? geenHandmatigePosten(),
  };
}
