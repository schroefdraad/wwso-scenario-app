import type { Tarievenset } from '@wwso/data';
import type { PandInvoer, Ruimte, SanitairVoorziening } from '../types/index';
import { kamersPerRuimte, rondAfOpKwartpunten } from './gedeeld';
import type { RubriekResultaat } from './types';

/** Alle vijf eisen van §2.6.2 moeten aanwezig zijn, anders vervallen álle extra punten. */
function voldoetAanExtraEisen(post: SanitairVoorziening): boolean {
  return Object.values(post.extraEisen).every(Boolean);
}

/**
 * Wastafelpunten (§2.6.1). In een badkamer telt elke wastafel; daarbuiten geldt "een maximum
 * van 1 punt per vertrek of overige ruimte" respectievelijk 1,50 punt voor een
 * meerpersoonswastafel.
 *
 * NIET GEÏMPLEMENTEERD: de uitzondering "bij een adres met 8 of meer onzelfstandige
 * woonruimten geldt bij 1 ander vertrek het maximum niet". Die vergt dat de gebruiker één
 * vertrek aanwijst; zolang dat veld er niet is, rekent de engine het strengere maximum en
 * onderschat hij dus hooguit. Zie rapport taak 5.
 */
function wastafelPunten(
  post: SanitairVoorziening,
  isBadkamer: boolean,
  tarievenset: Tarievenset,
): number {
  const { wastafel, meerpersoonswastafel } = tarievenset.sanitairBasisPunten;
  const max = tarievenset.sanitairMaxima;

  const gewoon = post.aantalWastafels * wastafel;
  const meerpersoons = post.aantalMeerpersoonswastafels * meerpersoonswastafel;

  if (isBadkamer) return gewoon + meerpersoons;

  return (
    Math.min(gewoon, max.wastafelPuntenPerVertrekBuitenBadkamer) +
    Math.min(meerpersoons, max.meerpersoonswastafelPuntenPerVertrekBuitenBadkamer)
  );
}

/**
 * Douche-, bad- en combinatiepunten (§2.6.1). Een bad/douchecombinatie is een eigen categorie
 * van 6 punten die de losse waardering vervangt: "Als een bad is voorzien van een (hand)douche,
 * dan wordt de douchegarnituur niet afzonderlijk geteld." Losse voorzieningen samen (3 + 5 = 8)
 * zijn dus méér waard dan een combinatie.
 */
function doucheBadPunten(post: SanitairVoorziening, tarievenset: Tarievenset): number {
  const { douche, bad, badDoucheCombinatie } = tarievenset.sanitairBasisPunten;
  if (post.badDoucheCombinatie) return badDoucheCombinatie;
  return (post.douche ? douche : 0) + (post.bad ? bad : 0);
}

/** Ruwe som van de extra sanitaire voorzieningen (§2.6.2), vóór aftopping. */
function extraPuntenRuw(post: SanitairVoorziening, tarievenset: Tarievenset): number {
  const t = tarievenset.sanitairExtraPunten;
  const max = tarievenset.sanitairMaxima;
  const e = post.extra;

  let som = 0;
  if (e.bubbelfunctieBad) som += t.bubbelfunctieBad;
  if (e.doucheafscheidingVolledig) som += t.doucheafscheidingVolledig;
  som += e.aantalHanddoekenradiatoren * t.handdoekenradiator;
  if (e.ingebouwdKastjeMetWastafel) som += t.ingebouwdKastjeMetWastafel;
  if (e.kastruimte) som += Math.min(t.kastruimte, max.kastruimtePunten);

  // "Stopcontact (maximaal twee per (meerpersoons)wastafel)"
  const toegestaneStopcontacten =
    (post.aantalWastafels + post.aantalMeerpersoonswastafels) * max.stopcontactenPerWastafel;
  som += Math.min(e.aantalStopcontacten, toegestaneStopcontacten) * t.stopcontact;

  if (e.eenhandsmengkraan) som += t.eenhandsmengkraan;
  if (e.thermostatischeMengkraan) som += t.thermostatischeMengkraan;
  return som;
}

export interface SanitairBerekening {
  ruimteNr: number;
  toiletPunten: number;
  wastafelPunten: number;
  doucheBadPunten: number;
  extraRuw: number;
  extraGecapt: number;
  voldoetAanExtraEisen: boolean;
  totaal: number;
  nKamersMetToegang: number;
  perKamer: number;
}

/**
 * Berekent één sanitaire voorziening door, vóór verdeling over de kamers. Apart exporteerbaar
 * zodat taak 11 kan zien of de extra punten tegen de aftopping aan lopen of tegen de poort.
 */
export function berekenSanitair(
  post: SanitairVoorziening,
  ruimte: Ruimte | undefined,
  nKamersMetToegang: number,
  tarievenset: Tarievenset,
): SanitairBerekening {
  const isBadkamer = ruimte?.type === 'Badruimte';

  const toilet = tarievenset.sanitairToiletPunten[post.toiletType];
  const wastafel = wastafelPunten(post, isBadkamer, tarievenset);
  const doucheBad = doucheBadPunten(post, tarievenset);

  const eisenGehaald = voldoetAanExtraEisen(post);
  const extraRuw = eisenGehaald ? extraPuntenRuw(post, tarievenset) : 0;
  // §2.6.2: extra punten "kan niet meer zijn dan het totaalaantal punten voor de douche,
  // het bad en/of bad/douche gezamenlijk" — dus niet op toilet en wastafel.
  const extraGecapt = Math.min(extraRuw, doucheBad);

  const totaal = toilet + wastafel + doucheBad + extraGecapt;

  return {
    ruimteNr: post.ruimteNr,
    toiletPunten: toilet,
    wastafelPunten: wastafel,
    doucheBadPunten: doucheBad,
    extraRuw,
    extraGecapt,
    voldoetAanExtraEisen: eisenGehaald,
    totaal,
    nKamersMetToegang,
    perKamer: nKamersMetToegang > 0 ? totaal / nKamersMetToegang : 0,
  };
}

/**
 * R6 — Sanitaire voorzieningen (§2.6). Waardering is niet beperkt tot badkamer en toiletruimte:
 * een douche in een slaapkamer telt gewoon mee. Privé voorzieningen krijgen het volledige
 * puntenaantal, gedeelde voorzieningen worden gedeeld door het aantal onzelfstandige
 * woonruimten met toegang en gebruiksrecht.
 */
export function berekenR6(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const kamersBijRuimte = kamersPerRuimte(input);
  const ruimteBijNr = new Map(input.ruimtes.map((r) => [r.nr, r] as const));
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  const ruwPerKamer = new Map<number, number>();
  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    ruwPerKamer.set(kamer, 0);
  }

  for (const post of input.sanitair) {
    const kamers = kamersBijRuimte.get(post.ruimteNr) ?? [];
    const berekening = berekenSanitair(
      post,
      ruimteBijNr.get(post.ruimteNr),
      kamers.length,
      tarievenset,
    );

    for (const kamer of kamers) {
      ruwPerKamer.set(kamer, (ruwPerKamer.get(kamer) ?? 0) + berekening.perKamer);
    }

    const extraRegel = !berekening.voldoetAanExtraEisen
      ? 'extra voorzieningen vervallen (voldoet niet aan §2.6.2)'
      : `${berekening.extraGecapt} extra${berekening.extraRuw > berekening.extraGecapt ? ' (afgetopt op douche/bad)' : ''} van ${berekening.extraRuw} ruw`;

    toelichting.push(
      `R6 ruimte ${post.ruimteNr}: toilet ${berekening.toiletPunten} + wastafels ${berekening.wastafelPunten} + douche/bad ${berekening.doucheBadPunten} + ${extraRegel} = ${berekening.totaal} pt ÷ ${berekening.nKamersMetToegang} kamers = ${berekening.perKamer.toFixed(4)} pt per kamer`,
    );
  }

  for (const [kamer, ruw] of ruwPerKamer) {
    perKamerRuw[kamer] = ruw;
    perKamer[kamer] = rondAfOpKwartpunten(ruw);
  }

  if (input.sanitair.length === 0) {
    toelichting.push('R6: geen sanitaire voorzieningen ingevoerd → 0 pt voor alle kamers');
  }

  return { perKamer, perKamerRuw, toelichting };
}
