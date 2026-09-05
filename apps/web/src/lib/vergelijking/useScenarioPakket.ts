import { useMemo } from 'react';
import { bouwHandmatigScenario, nieuwBudget, type Energielabel, type KandidaatWaardering, type MaatregelContext, type PandInvoer, type Pakket } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { bouwEnergielabelScenarioMetKosten, bouwHandmatigScenarioMetMaatregelenUitSleutels, berekenKandidatenVoorHandmatigPand } from './scenario-bouw';

/**
 * Een scenario-slot komt uit één van twee bronnen: een volledig bewerkbaar TO-BE-pand (het
 * uniforme pad sinds 2026-09-05 — voorheen bestond hiernaast nog een gedeelde "kandidaten"-modus
 * met een eigen checkboxtabel, die niet samenwerkte met een handmatige kamerbewerking en dus twee
 * eilandjes vormde; zie `outputs`/`plan/STATUS.md`), of een doellabel-wisselknop (Tussenfase-taak
 * C, 2026-09-04). `sleutels` verwijst altijd naar de kandidatenlijst tegen DIT pand
 * (`useHandmatigeKandidaten`), nooit een gedeelde as-is-lijst, plus een handmatig ingevuld
 * investeringsbedrag voor een eventuele herindeling zelf.
 *
 * `kamerBewerkt` (i.p.v. `pand`-referentiegelijkheid met de as-is, 2026-09-05): een eerdere versie
 * herkende "nog niets ingevuld" aan `slot.pand === asIs` (dezelfde object-referentie) — dat bleek
 * niet robuust: elke keer dat de as-is opnieuw geparsed wordt (na "Woning opslaan" →
 * `router.replace`, of gewoon een her-render die een nieuwe props-referentie meegeeft), levert
 * een inhoudelijk identiek maar ANDER object op, waardoor alle onaangeraakte scenario's ineens als
 * "bewerkt" golden. Een expliciete vlag is immuun voor zulke referentie-toevalligheden.
 */
export type ScenarioSlot =
  | {
      naam: string;
      soort: 'handmatig';
      pand: PandInvoer;
      /** `true` zodra dit scenario écht door "Bewerk handmatig →" is gegaan — bepaalt of dit
       * scenario "iets voorstelt" (zie `useScenarioPakket`/`opslaanbareScenarios`), losstaand van
       * `pand`'s object-identiteit. */
      kamerBewerkt: boolean;
      sleutels: ReadonlySet<string>;
      handmatigeInvesteringEuro: number;
      /** Per-maatregel prijsoverschrijving (Tussenfase-taak D), voorgevuld met de catalogusprijs
       * in de UI — sleutels die hier niet in staan vallen terug op die catalogusprijs. */
      maatregelPrijzenEuro: Readonly<Record<string, number>>;
    }
  | { naam: string; soort: 'energielabel'; doelLabel: Energielabel };

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
  handmatigeKandidaten: HandmatigeKandidatenResultaat | null,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  verwervingswaardeEuro: number | undefined,
): Pakket | null {
  return useMemo(() => {
    if (slot.soort === 'energielabel') {
      return bouwEnergielabelScenarioMetKosten(slot.naam, pand, slot.doelLabel, tarievenset, peildatum, verwervingswaardeEuro);
    }
    // Onaangeraakt (geen kamers bewerkt, geen maatregelen, geen investering) draagt geen
    // informatie (zelfde gedrag als de vroegere lege "kandidaten"-modus): `null` i.p.v. een
    // nietszeggend pakket met 0 overal.
    const heeftKosteninformatie = slot.sleutels.size > 0 || slot.handmatigeInvesteringEuro > 0;
    if (!slot.kamerBewerkt && !heeftKosteninformatie) return null;
    // Zonder gekozen maatregelen én zonder ingevulde handmatige investering is er nog helemaal
    // geen kostinformatie — dan blijft Investering/Terugverdientijd expliciet "onbekend"
    // (bouwHandmatigScenario), i.p.v. te delen door €0 en een ∞-rendement te tonen. Precies het
    // gegokte-nulinvestering-scenario dat deze functies altijd al vermeden.
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
      slot.maatregelPrijzenEuro,
    );
  }, [pand, slot, handmatigeKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro]);
}
