import type { HandmatigePosten, Pand, PandInvoer, Ruimte, ToewijzingEntry } from '../types/index.js';

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

const GEEN_HANDMATIGE_POSTEN: HandmatigePosten = {
  gemeenschappelijkeVertrekken: [],
  zorgwoning: false,
};

export function maakPandInvoer(opts: {
  aantalKamers: number;
  ruimtes: Ruimte[];
  toewijzing: ToewijzingEntry[];
  pand?: Partial<Pand>;
  handmatigePosten?: HandmatigePosten;
}): PandInvoer {
  return {
    pand: { ...BASIS_PAND, aantalKamers: opts.aantalKamers, ...opts.pand },
    ruimtes: opts.ruimtes,
    toewijzing: opts.toewijzing,
    handmatigePosten: opts.handmatigePosten ?? GEEN_HANDMATIGE_POSTEN,
  };
}
