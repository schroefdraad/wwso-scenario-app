import { useMemo } from 'react';
import type { KandidaatWaardering, PandInvoer, Pakket } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { bouwScenarioUitSleutels } from './scenario-bouw';

export interface ScenarioSlot {
  naam: string;
  sleutels: ReadonlySet<string>;
}

/**
 * Herrekent een scenario-kolom LIVE bij elke wijziging van de geselecteerde maatregelen (taak
 * 14: "directe hertelling in de browser — geen laadindicator, geen API-call per klik"). De
 * `useMemo`-dependency op `slot.sleutels` werkt correct omdat elke toggle een NIEUWE Set-instantie
 * aanmaakt (zie `Vergelijking.tsx`), nooit dezelfde Set muteert.
 */
export function useScenarioPakket(
  pand: PandInvoer,
  slot: ScenarioSlot,
  alleKandidaten: readonly KandidaatWaardering[],
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  verwervingswaardeEuro: number | undefined,
): Pakket | null {
  return useMemo(() => {
    if (slot.sleutels.size === 0) return null;
    return bouwScenarioUitSleutels(slot.naam, pand, slot.sleutels, alleKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  }, [pand, slot.naam, slot.sleutels, alleKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro]);
}
