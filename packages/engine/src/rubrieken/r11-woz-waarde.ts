import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index';
import type { RubriekResultaat } from './types';

export interface WozUitkomst {
  punten: number;
  grondslag: string;
}

/**
 * R11 — Punten voor de WOZ-waarde (§2.11). Niet gedeeld: het is een eigenschap van het hele
 * pand, en elke onzelfstandige woonruimte krijgt hetzelfde puntenaantal (10, 12 of 14).
 *
 * §2.11.1: bij ontbrekende WOZ-waarde geldt 85% van de taxatiewaarde; ontbreken beide, dan
 * geldt automatisch het laagste puntenaantal (10 punten, briefing B11) — geen extrapolatie of
 * schatting op basis van vergelijkbare woningen, dat sluit het beleidsboek expliciet uit.
 */
export function bepaalWozUitkomst(pand: PandInvoer['pand'], tarievenset: Tarievenset): WozUitkomst {
  const t = tarievenset.woz;

  let wozWaarde: number | undefined;
  let grondslagWaarde: string;
  if (pand.wozWaarde !== undefined) {
    wozWaarde = pand.wozWaarde;
    grondslagWaarde = `WOZ-waarde € ${pand.wozWaarde}`;
  } else if (pand.taxatiewaardeEuro !== undefined) {
    wozWaarde = pand.taxatiewaardeEuro * 0.85;
    grondslagWaarde = `85% van taxatiewaarde € ${pand.taxatiewaardeEuro} = € ${wozWaarde.toFixed(2)}`;
  } else {
    wozWaarde = undefined;
    grondslagWaarde = 'geen WOZ-waarde en geen taxatiewaarde bekend';
  }

  if (wozWaarde === undefined) {
    return { punten: t.puntenOnbekend, grondslag: `${grondslagWaarde} → laagste puntenaantal (§2.11.1)` };
  }

  const corop = tarievenset.coropGebieden.find((c) => c.gebied === pand.coropGebied);
  if (!corop) {
    throw new Error(`Geen WOZ-gemiddelde gevonden voor COROP-gebied '${pand.coropGebied}'.`);
  }

  const wozPerM2 = wozWaarde / pand.wozOppervlak;
  const percentageVerschil = ((wozPerM2 - corop.wozGemPerM2Euro) / corop.wozGemPerM2Euro) * 100;

  let punten: number;
  if (percentageVerschil > t.drempelPercentage) {
    punten = t.puntenHoger;
  } else if (percentageVerschil < -t.drempelPercentage) {
    punten = t.puntenLager;
  } else {
    punten = t.puntenGemiddeld;
  }

  return {
    punten,
    grondslag: `${grondslagWaarde} ÷ ${pand.wozOppervlak} m² = € ${wozPerM2.toFixed(2)}/m², regiogemiddelde € ${corop.wozGemPerM2Euro}/m² (${pand.coropGebied}) → ${percentageVerschil.toFixed(1)}% verschil`,
  };
}

/**
 * R11 als RubriekResultaat: hetzelfde puntenaantal voor elke kamer, want het is geen gedeelde
 * ruimte of voorziening (§2.1.4/§2.1.5 gaan daar niet over) maar een eigenschap van het pand.
 */
export function berekenR11(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const uitkomst = bepaalWozUitkomst(input.pand, tarievenset);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};

  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    perKamer[kamer] = uitkomst.punten;
    perKamerRuw[kamer] = uitkomst.punten;
  }

  return {
    perKamer,
    perKamerRuw,
    toelichting: [`R11: ${uitkomst.grondslag} → ${uitkomst.punten} pt voor elke kamer`],
  };
}
