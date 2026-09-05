import { coropVoorGemeente, gemeentesVoorWoonplaats } from '@wwso/data';
import type { PandInvoer } from '@wwso/engine';
import type { InvoerState, RuimteRij } from './types';

/**
 * Reconstrueert de gemeente-suggestie bij het laden van een bestaand pand (COROP-automatisering,
 * 2026-09-04) — `PandInvoer` bewaart alleen `coropGebied`, niet welke gemeente 'm suggereerde.
 * Alleen invullen als de gok op basis van "Stad" ÉÉNDUIDIG is ÉN naar exact hetzelfde
 * COROP-gebied wijst als al is opgeslagen — anders leeg laten (harde regel 4: nooit een gemeente
 * tonen die niet aantoonbaar bij de opgeslagen `coropGebied` hoort).
 */
function gokGemeente(stad: string, opgeslagenCoropGebied: string): string {
  const kandidaten = gemeentesVoorWoonplaats(stad);
  if (kandidaten.length !== 1) return '';
  return coropVoorGemeente(kandidaten[0]) === opgeslagenCoropGebied ? kandidaten[0] : '';
}

/**
 * Inverse van `projecteerNaarPandInvoer`: zet een reeds gevalideerde `PandInvoer` (het
 * voorbeeldpand, of de as-is van een opgeslagen deal) terug om naar de gedenormaliseerde,
 * bewerkbare `InvoerState` van /woning/nieuw.
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
      keuken: keuken
        ? { aanrechtlengteM: keuken.aanrechtlengteM, basiseisen: keuken.basiseisen, extra: keuken.extra, verwarmd: keuken.verwarmd }
        : undefined,
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
      aantalKamers: String(p.pand.aantalKamers),
      wozWaarde: p.pand.wozWaarde !== undefined ? String(p.pand.wozWaarde) : '',
      wozPeildatum: p.pand.wozPeildatum,
      taxatiewaardeEuro: p.pand.taxatiewaardeEuro !== undefined ? String(p.pand.taxatiewaardeEuro) : '',
      wozOppervlak: String(p.pand.wozOppervlak),
      gemeente: gokGemeente(p.pand.stad, p.pand.coropGebied),
      coropGebied: p.pand.coropGebied,
      energielabel: p.pand.energielabel,
      energielabelOnbekendOfVervallen: p.pand.energielabelOnbekendOfVervallen,
      energielabelKostenAPlus: p.pand.energielabelKostenSchattingAPlusEuro !== undefined ? String(p.pand.energielabelKostenSchattingAPlusEuro) : '',
      energielabelKostenAPlusPlus: p.pand.energielabelKostenSchattingAPlusPlusEuro !== undefined ? String(p.pand.energielabelKostenSchattingAPlusPlusEuro) : '',
      energielabelKostenAPlusPlusPlus: p.pand.energielabelKostenSchattingAPlusPlusPlusEuro !== undefined ? String(p.pand.energielabelKostenSchattingAPlusPlusPlusEuro) : '',
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
    notitieOntwerp: '',
  };
}
