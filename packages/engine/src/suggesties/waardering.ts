import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index';
import type { EindtellingResultaat } from '../eindtelling/index';
import { berekenEindtelling } from '../eindtelling/index';
import { pasScenarioToe } from '../scenario/index';
import type { Mutatie } from '../scenario/index';
import { berekenInvestering, berekenMarginaalRendement, berekenTerugverdientijd, totaalUitOpbouw } from './kosten';
import type { Kandidaat, KandidaatWaardering, MaatregelContext, MaatregelDefinitie, PandWaardering } from './types';

/**
 * Rekenbudget (§1 van het ontwerp): een harde grens op het aantal `berekenEindtelling`-runs,
 * met een expliciete fout bij overschrijding — nooit een stille afkapping (harde regel 2).
 */
export interface RekenBudget {
  max: number;
  teller: { aantal: number };
}

export function nieuwBudget(max: number): RekenBudget {
  return { max, teller: { aantal: 0 } };
}

export function berekenEindtellingMetBudget(
  budget: RekenBudget,
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
): EindtellingResultaat {
  budget.teller.aantal += 1;
  if (budget.teller.aantal > budget.max) {
    throw new Error(
      `Rekenbudget overschreden: meer dan ${budget.max} eindtellingen nodig voor deze suggestie-analyse. Verhoog 'maxEindtellingen' in SuggestieOpties of beperk het aantal kandidaten (bijv. via 'uitgeslotenMaatregelen').`,
    );
  }
  return berekenEindtelling(pand, tarievenset, peildatum);
}

export function pandWaarderingVan(eindtelling: EindtellingResultaat): PandWaardering {
  const perKamer: PandWaardering['perKamer'] = {};
  let brutoJaarhuurEuro = 0;
  for (const [kamerStr, kamer] of Object.entries(eindtelling.perKamer)) {
    perKamer[Number(kamerStr)] = { totaalPunten: kamer.totaalPunten, maxHuurEuro: kamer.maxHuurEuro };
    brutoJaarhuurEuro += kamer.maxHuurEuro * 12;
  }
  return { perKamer, brutoJaarhuurEuro: Math.round(brutoJaarhuurEuro * 100) / 100 };
}

export interface ScenarioWaardering {
  pand: PandInvoer;
  eindtelling: EindtellingResultaat;
  waardering: PandWaardering;
}

/**
 * De enige waarderingsbron (§1, laag A van het ontwerp): past een mutatielijst toe op de
 * as-is en rekent het resultaat volledig opnieuw door. Nooit een vuistregel, nooit een
 * opgetelde delta.
 */
export function waardeerScenario(
  asIs: PandInvoer,
  mutaties: readonly Mutatie[],
  tarievenset: Tarievenset,
  peildatum: string,
  budget: RekenBudget,
): ScenarioWaardering {
  const pand = pasScenarioToe(asIs, mutaties);
  const eindtelling = berekenEindtellingMetBudget(budget, pand, tarievenset, peildatum);
  return { pand, eindtelling, waardering: pandWaarderingVan(eindtelling) };
}

export function extraJaarhuur(voor: PandWaardering, na: PandWaardering): number {
  return Math.round((na.brutoJaarhuurEuro - voor.brutoJaarhuurEuro) * 100) / 100;
}

export function perKamerDelta(voor: PandWaardering, na: PandWaardering): Record<number, { deltaPunten: number; deltaMaxHuurEuro: number }> {
  const resultaat: Record<number, { deltaPunten: number; deltaMaxHuurEuro: number }> = {};
  const kamers = new Set([...Object.keys(voor.perKamer), ...Object.keys(na.perKamer)].map(Number));
  for (const kamer of kamers) {
    const v = voor.perKamer[kamer];
    const n = na.perKamer[kamer];
    const deltaPunten = (n?.totaalPunten ?? 0) - (v?.totaalPunten ?? 0);
    const deltaMaxHuurEuro = Math.round(((n?.maxHuurEuro ?? 0) - (v?.maxHuurEuro ?? 0)) * 100) / 100;
    if (deltaPunten !== 0 || deltaMaxHuurEuro !== 0) {
      resultaat[kamer] = { deltaPunten, deltaMaxHuurEuro };
    }
  }
  return resultaat;
}

/**
 * Solo-waardering van één kandidaat tegen de as-is (§3, stap 1 van het ontwerp): bepaalt de
 * solo-terugverdientijd die de pakketfilters gebruiken. Riders (`vereist`) lopen automatisch
 * mee in de investering, gededupliceerd is hier niet nodig — elke solo-kandidaat heeft zijn
 * eigen rider-instantie.
 */
export function waardeerKandidaatSolo(
  asIs: PandInvoer,
  ctxAsIs: MaatregelContext,
  kandidaat: Kandidaat,
  definitie: MaatregelDefinitie,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
  tarievenset: Tarievenset,
  peildatum: string,
  budget: RekenBudget,
): KandidaatWaardering | null {
  const mutaties = definitie.mutaties(ctxAsIs, kandidaat);
  const asIsWaardering = pandWaarderingVan(ctxAsIs.eindtelling);
  const { waardering: naWaardering } = waardeerScenario(asIs, mutaties, tarievenset, peildatum, budget);

  const extraJaarhuurEuro = extraJaarhuur(asIsWaardering, naWaardering);
  const geraakteKamers = Object.keys(perKamerDelta(asIsWaardering, naWaardering)).map(Number);

  const maatregel = kostencatalogus.maatregelen.find((m) => m.id === kandidaat.maatregelId);
  if (!maatregel) return null;

  const eigenOpbouw = berekenInvestering(maatregel, kandidaat.hoeveelheid, kostencatalogus, uitvoeringsjaar);
  const riders = (definitie.vereist ?? [])
    .map((riderId) => kostencatalogus.maatregelen.find((m) => m.id === riderId))
    .filter((m): m is NonNullable<typeof m> => m !== undefined)
    .map((riderMaatregel) => ({
      maatregelId: riderMaatregel.id,
      euro: totaalUitOpbouw(berekenInvestering(riderMaatregel, 1, kostencatalogus, uitvoeringsjaar)),
    }));
  eigenOpbouw.riders.push(...riders);

  const investeringEuro = totaalUitOpbouw(eigenOpbouw);

  return {
    kandidaat,
    maatregel,
    vergunningKlasse: definitie.vergunningKlasse,
    mutaties,
    investeringEuro,
    investeringOpbouw: eigenOpbouw,
    extraJaarhuurEuro,
    terugverdientijdJaren: berekenTerugverdientijd(investeringEuro, extraJaarhuurEuro),
    marginaalBrutoRendementPct: berekenMarginaalRendement(investeringEuro, extraJaarhuurEuro),
    geraakteKamers,
    perKamer: perKamerDelta(asIsWaardering, naWaardering),
  };
}
