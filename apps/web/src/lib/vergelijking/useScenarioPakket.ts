import { useMemo } from 'react';
import { bouwHandmatigScenario, nieuwBudget, type KandidaatWaardering, type PandInvoer, type Pakket } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { bouwScenarioUitSleutels } from './scenario-bouw';

/**
 * Een scenario-slot komt uit precies één van twee bronnen (backlog: AS-IS kopiëren naar een
 * handmatig scenario, feedback Emma Morrison, 2026-08-21): een set kandidaat-sleutels uit de
 * suggestie-engine (taak 14, het bestaande pad), of een volledig zelf bewerkt TO-BE-pand
 * (`/pand/nieuw?scenario=<slot>`, dit backlog-item). Nooit allebei tegelijk — het aanvinken van
 * een kandidaat-checkbox in een handmatig-slot zet het slot terug naar 'kandidaten' (zie
 * `Vergelijking.tsx`), precies zoals "Leegmaken" dat al deed.
 */
export type ScenarioSlot =
  | { naam: string; soort: 'kandidaten'; sleutels: ReadonlySet<string> }
  | { naam: string; soort: 'handmatig'; pand: PandInvoer };

/**
 * Herrekent een scenario-kolom LIVE bij elke wijziging van de geselecteerde maatregelen (taak
 * 14: "directe hertelling in de browser — geen laadindicator, geen API-call per klik"). De
 * `useMemo`-dependency op `slot` werkt correct omdat elke wijziging (toggle, handmatige bewerking)
 * een NIEUW slot-object aanmaakt, nooit hetzelfde object muteert.
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
    if (slot.soort === 'handmatig') {
      return bouwHandmatigScenario(slot.naam, pand, slot.pand, tarievenset, peildatum, nieuwBudget(2000));
    }
    if (slot.sleutels.size === 0) return null;
    return bouwScenarioUitSleutels(slot.naam, pand, slot.sleutels, alleKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  }, [pand, slot, alleKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro]);
}
