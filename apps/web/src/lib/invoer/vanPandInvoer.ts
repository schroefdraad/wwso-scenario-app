import type { PandInvoer } from '@wwso/engine';
import type { InvoerState, RuimteRij } from './types';

/**
 * Inverse van `projecteerNaarPandInvoer`: zet een reeds gevalideerde `PandInvoer` (het
 * voorbeeldpand, of de as-is van een opgeslagen deal) terug om naar de gedenormaliseerde,
 * bewerkbare `InvoerState` van /pand/nieuw.
 */
export function pandInvoerNaarState(p: PandInvoer): InvoerState {
  const kamersBijRuimte = new Map(p.toewijzing.map((t) => [t.ruimteNr, t.kamers] as const));
  const keukenBijRuimte = new Map(p.keukens.map((k) => [k.ruimteNr, k] as const));
  const sanitairBijRuimte = new Map(p.sanitair.map((s) => [s.ruimteNr, s] as const));
  const parkeerBijRuimte = new Map(p.parkeerplekken.map((pp) => [pp.ruimteNr, pp] as const));

  const ruimtes: RuimteRij[] = p.ruimtes.map((r, i) => {
    const keuken = keukenBijRuimte.get(r.nr);
    const sanitair = sanitairBijRuimte.get(r.nr);
    const parkeerplek = parkeerBijRuimte.get(r.nr);
    return {
      id: `r${i + 1}`,
      nr: r.nr,
      naam: r.naam,
      type: r.type,
      oppervlakteM2: String(r.oppervlakteM2).replace('.', ','),
      verdieping: String(r.verdieping),
      verwarmd: r.verwarmd,
      verkoeld: r.verkoeld,
      aantalAdressenMetToegang: r.aantalAdressenMetToegang !== undefined ? String(r.aantalAdressenMetToegang) : '',
      aantalAdressenOvergenomen: false,
      kamers: kamersBijRuimte.get(r.nr) ?? [],
      zolder: r.zolder,
      keuken: keuken ? { aanrechtlengteM: keuken.aanrechtlengteM, basiseisen: keuken.basiseisen, extra: keuken.extra } : undefined,
      sanitair: sanitair
        ? {
            toiletType: sanitair.toiletType,
            aantalWastafels: sanitair.aantalWastafels,
            aantalMeerpersoonswastafels: sanitair.aantalMeerpersoonswastafels,
            douche: sanitair.douche,
            bad: sanitair.bad,
            badDoucheCombinatie: sanitair.badDoucheCombinatie,
            extraEisen: sanitair.extraEisen,
            extra: sanitair.extra,
          }
        : undefined,
      parkeerplek: parkeerplek ? { type: parkeerplek.type, laadpaal: parkeerplek.laadpaal } : undefined,
    };
  });

  return {
    pand: {
      adres: p.pand.adres,
      stad: p.pand.stad,
      soortWoning: p.pand.soortWoning,
      aantalKamers: String(p.pand.aantalKamers),
      aantalWoningenInComplex: String(p.pand.aantalWoningenInComplex),
      wozWaarde: p.pand.wozWaarde !== undefined ? String(p.pand.wozWaarde) : '',
      wozPeildatum: p.pand.wozPeildatum,
      taxatiewaardeEuro: p.pand.taxatiewaardeEuro !== undefined ? String(p.pand.taxatiewaardeEuro) : '',
      wozOppervlak: String(p.pand.wozOppervlak),
      coropGebied: p.pand.coropGebied,
      energielabel: p.pand.energielabel,
      energielabelIngangsdatum: p.pand.energielabelIngangsdatum ?? '',
      bouwjaar: String(p.pand.bouwjaar),
      monument: p.pand.monument,
      huurovereenkomstDatum: p.pand.huurovereenkomstDatum ?? '',
      zorgwoning: p.handmatigePosten.zorgwoning,
    },
    ruimtes,
    aanbelfunctieAan: p.handmatigePosten.aanbelfuncties.length > 0,
    aanbelfunctieKamers: p.handmatigePosten.aanbelfuncties[0]?.kamersMetToegang ?? [],
    losseLaadpaalAan: p.handmatigePosten.losseLaadpalen.length > 0,
    losseLaadpaalKamers: p.handmatigePosten.losseLaadpalen[0]?.kamersMetToegang ?? [],
    aftrekSituaties: p.handmatigePosten.aftrekSituaties,
    woonvoorzieningenHandicap: p.handmatigePosten.woonvoorzieningenHandicap,
    volgendeRuimteId: ruimtes.length + 1,
  };
}
