import { useMemo } from 'react';
import { bouwHandmatigScenario, nieuwBudget, type KandidaatWaardering, type MaatregelContext, type PandInvoer, type Pakket } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { bouwHandmatigScenarioMetMaatregelenUitSleutels, bouwScenarioUitSleutels, berekenKandidatenVoorHandmatigPand } from './scenario-bouw';

/**
 * Een scenario-slot komt uit precies één van twee bronnen (backlog: AS-IS kopiëren naar een
 * handmatig scenario, feedback Emma Morrison, 2026-08-21): een set kandidaat-sleutels uit de
 * suggestie-engine (taak 14, het bestaande pad), of een volledig zelf bewerkt TO-BE-pand
 * (`/pand/nieuw?scenario=<slot>`, dit backlog-item). Een handmatig-slot kan zelf óók
 * kandidaat-sleutels dragen (backlog 2026-08-22: "handmatig een kamer realiseren en dan verder
 * maatregelen toevoegen") — dat zijn dan sleutels uit de kandidatenlijst tegen HET BEWERKTE PAND
 * (`useHandmatigeKandidaten`), niet uit de gedeelde as-is-lijst, plus een handmatig ingevuld
 * investeringsbedrag voor de herindeling zelf.
 */
export type ScenarioSlot =
  | { naam: string; soort: 'kandidaten'; sleutels: ReadonlySet<string> }
  | { naam: string; soort: 'handmatig'; pand: PandInvoer; sleutels: ReadonlySet<string>; handmatigeInvesteringEuro: number };

export interface HandmatigeKandidatenResultaat {
  ctxBasis: MaatregelContext;
  kandidaten: KandidaatWaardering[];
}

/**
 * Berekent de maatregelen die specifiek van toepassing zijn op een handmatig bewerkt TO-BE-pand
 * (bijv. airco of een kitchenette in een net toegevoegde kamer) — `null` voor een kandidaten-slot.
 * Losgetrokken van `useScenarioPakket` zodat dit maar ÉÉN keer per bewerkt pand herrekend wordt
 * (kandidaatgeneratie + solo-waardering van alle 49 catalogusmaatregelen), niet opnieuw bij elke
 * toggle van een checkbox — zowel de checkbox-lijst als het uiteindelijke pakket hergebruiken
 * hetzelfde resultaat.
 */
export function useHandmatigeKandidaten(
  slot: ScenarioSlot,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
): HandmatigeKandidatenResultaat | null {
  // Losgetrokken op `bewerktPand` (niet het hele `slot`): sleutels/handmatigeInvesteringEuro
  // wijzigen bij elke checkbox-toggle, en zouden anders deze dure herberekening ook bij elke
  // toggle triggeren terwijl alleen het pand zelf de kandidatenlijst bepaalt.
  const bewerktPand = slot.soort === 'handmatig' ? slot.pand : null;
  return useMemo(() => {
    if (!bewerktPand) return null;
    return berekenKandidatenVoorHandmatigPand(bewerktPand, tarievenset, peildatum, kostencatalogus);
  }, [bewerktPand, tarievenset, peildatum, kostencatalogus]);
}

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
  handmatigeKandidaten: HandmatigeKandidatenResultaat | null,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  verwervingswaardeEuro: number | undefined,
): Pakket | null {
  return useMemo(() => {
    if (slot.soort === 'handmatig') {
      // Zonder gekozen maatregelen én zonder ingevulde handmatige investering is er nog
      // helemaal geen kostinformatie — dan blijft Investering/Terugverdientijd expliciet
      // "onbekend" (bouwHandmatigScenario), i.p.v. te delen door €0 en een ∞-rendement te tonen.
      // Precies het gegokte-nulinvestering-scenario dat deze functies altijd al vermeden.
      const heeftKosteninformatie = slot.sleutels.size > 0 || slot.handmatigeInvesteringEuro > 0;
      if (!handmatigeKandidaten || !heeftKosteninformatie) {
        return bouwHandmatigScenario(slot.naam, pand, slot.pand, tarievenset, peildatum, nieuwBudget(2000));
      }
      return bouwHandmatigScenarioMetMaatregelenUitSleutels(
        slot.naam,
        pand,
        slot.pand,
        slot.sleutels,
        slot.handmatigeInvesteringEuro,
        handmatigeKandidaten,
        tarievenset,
        peildatum,
        kostencatalogus,
        verwervingswaardeEuro,
      );
    }
    if (slot.sleutels.size === 0) return null;
    return bouwScenarioUitSleutels(slot.naam, pand, slot.sleutels, alleKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  }, [pand, slot, alleKandidaten, handmatigeKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro]);
}
