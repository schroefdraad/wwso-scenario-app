import { useMemo } from 'react';
import { bouwHandmatigScenario, nieuwBudget, type Energielabel, type KandidaatWaardering, type MaatregelContext, type PandInvoer, type Pakket } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import {
  bouwHandmatigScenarioMetMaatregelenUitSleutels,
  berekenKandidatenVoorHandmatigPand,
  energielabelKostenschatting,
  pandMetEnergielabel,
  type EnergielabelScenarioDoel,
} from './scenario-bouw';

/**
 * Eén uniforme scenario-slotvorm — een vrij bewerkbaar TO-BE-pand (`pand`, gelijk aan de as-is
 * zolang er geen kamers bewerkt zijn) met daarbovenop optioneel een energielabel-wisseling
 * (`energielabelDoel`) en/of standaardmaatregelen (`sleutels`). Vóór 2026-09-07 waren "kamers
 * bewerken" en "energielabel-scenario" twee elkaar uitsluitende slotsoorten — feedback Emma
 * Morrison ("ik kan helemaal niks meer als ik een scenario selecteer, hij overschrijft ook mijn
 * extra huuropbrengsten van extra gerealiseerde kamers") liet zien dat dat een echte bug was, geen
 * bewuste keuze: een net gerealiseerde kamer + een labelwisseling + een paar standaardmaatregelen
 * moeten allemaal tegelijk in hetzelfde scenario kunnen zitten, met één opgetelde
 * Investering/Terugverdientijd/Rendement.
 *
 * `kamerBewerkt` (i.p.v. `pand`-referentiegelijkheid met de as-is, 2026-09-05): een eerdere versie
 * herkende "nog niets ingevuld" aan `slot.pand === asIs` (dezelfde object-referentie) — dat bleek
 * niet robuust: elke keer dat de as-is opnieuw geparsed wordt (na "Woning opslaan" →
 * `router.replace`, of gewoon een her-render die een nieuwe props-referentie meegeeft), levert
 * een inhoudelijk identiek maar ANDER object op, waardoor alle onaangeraakte scenario's ineens als
 * "bewerkt" golden. Een expliciete vlag is immuun voor zulke referentie-toevalligheden.
 */
export interface ScenarioSlot {
  naam: string;
  pand: PandInvoer;
  /** `true` zodra dit scenario écht door "Woning bewerken →" is gegaan — bepaalt of dit scenario
   * "iets voorstelt" (zie `useScenarioPakket`/`opslaanbareScenarios`), losstaand van `pand`'s
   * object-identiteit. */
  kamerBewerkt: boolean;
  /** `null` = geen energielabel-wisseling gekozen. Werkt bovenop `pand` (dus ook bovenop een al
   * met de hand bewerkt pand), niet in plaats ervan — zie de wisselknop in `SamenvattingRij`. */
  energielabelDoel: Energielabel | null;
  /** Sleutels uit de kandidatenlijst tegen `pand` mét energielabel-wisseling toegepast indien
   * gezet (`useHandmatigeKandidaten`), nooit een gedeelde as-is-lijst. */
  sleutels: ReadonlySet<string>;
  /** Investering voor de kamer-herindeling zelf (geen catalogusprijs) — telt op bij de
   * energielabel-kostenschatting en de gekozen maatregelkosten tot één totaal. */
  handmatigeInvesteringEuro: number;
  /** Per-maatregel prijsoverschrijving (Tussenfase-taak D), voorgevuld met de catalogusprijs in de
   * UI — sleutels die hier niet in staan vallen terug op die catalogusprijs. */
  maatregelPrijzenEuro: Readonly<Record<string, number>>;
}

export interface HandmatigeKandidatenResultaat {
  ctxBasis: MaatregelContext;
  kandidaten: KandidaatWaardering[];
}

/**
 * Berekent de maatregelen die specifiek van toepassing zijn op het TO-BE-pand van een scenario
 * (bijv. airco of een kitchenette in een net toegevoegde kamer), tegen het pand ná een eventuele
 * energielabel-wisseling (`pandMetEnergielabel`) — zodat de kandidatenlijst en de labelwisseling
 * altijd consistent zijn, ook als beide tegelijk gekozen zijn. Losgetrokken van `useScenarioPakket`
 * zodat dit maar ÉÉN keer per bewerkt pand herrekend wordt (kandidaatgeneratie + solo-waardering
 * van alle catalogusmaatregelen), niet opnieuw bij elke toggle van een checkbox — zowel de
 * checkbox-lijst als het uiteindelijke pakket hergebruiken hetzelfde resultaat.
 */
export function useHandmatigeKandidaten(
  slot: ScenarioSlot,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
): HandmatigeKandidatenResultaat {
  // Losgetrokken op `pand`/`energielabelDoel` (niet het hele `slot`): sleutels/investering/prijzen
  // wijzigen bij elke checkbox-toggle, en zouden anders deze dure herberekening ook bij elke
  // toggle triggeren terwijl alleen het pand + labeldoel de kandidatenlijst bepalen.
  const bewerktPand = useMemo(
    () => (slot.energielabelDoel ? pandMetEnergielabel(slot.pand, slot.energielabelDoel) : slot.pand),
    [slot.pand, slot.energielabelDoel],
  );
  return useMemo(
    () => berekenKandidatenVoorHandmatigPand(bewerktPand, tarievenset, peildatum, kostencatalogus),
    [bewerktPand, tarievenset, peildatum, kostencatalogus],
  );
}

/**
 * Herrekent een scenario-kolom LIVE bij elke wijziging van de geselecteerde maatregelen (taak
 * 14: "directe hertelling in de browser — geen laadindicator, geen API-call per klik"). De
 * `useMemo`-dependency op `slot` werkt correct omdat elke wijziging (toggle, handmatige bewerking)
 * een NIEUW slot-object aanmaakt, nooit hetzelfde object muteert.
 */
export function useScenarioPakket(
  asIs: PandInvoer,
  slot: ScenarioSlot,
  handmatigeKandidaten: HandmatigeKandidatenResultaat,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  verwervingswaardeEuro: number | undefined,
): Pakket | null {
  return useMemo(() => {
    // De energielabel-kostenschatting is een pand-eigen veld (as-is), losstaand van of er ook
    // kamers bewerkt zijn — dezelfde investering geldt voor "alleen het label" en "label + kamer 7
    // erbij".
    const labelInvesteringEuro = slot.energielabelDoel ? (energielabelKostenschatting(asIs, slot.energielabelDoel as EnergielabelScenarioDoel) ?? 0) : 0;
    const totaleHandmatigeInvesteringEuro = slot.handmatigeInvesteringEuro + labelInvesteringEuro;

    // Onaangeraakt (geen kamers bewerkt, geen labelwisseling, geen maatregelen, geen investering)
    // draagt geen informatie (zelfde gedrag als de vroegere lege "kandidaten"-modus): `null` i.p.v.
    // een nietszeggend pakket met 0 overal.
    const heeftKosteninformatie = slot.sleutels.size > 0 || totaleHandmatigeInvesteringEuro > 0;
    if (!slot.kamerBewerkt && !slot.energielabelDoel && !heeftKosteninformatie) return null;

    const bewerktPand = slot.energielabelDoel ? pandMetEnergielabel(slot.pand, slot.energielabelDoel) : slot.pand;

    // Zonder gekozen maatregelen, zonder labelkosten én zonder ingevulde handmatige investering is
    // er nog helemaal geen kostinformatie — dan blijft Investering/Terugverdientijd expliciet
    // "onbekend" (bouwHandmatigScenario), i.p.v. te delen door €0 en een ∞-rendement te tonen.
    // Precies het gegokte-nulinvestering-scenario dat deze functies altijd al vermeden.
    if (!heeftKosteninformatie) {
      return bouwHandmatigScenario(slot.naam, asIs, bewerktPand, tarievenset, peildatum, nieuwBudget(2000));
    }
    return bouwHandmatigScenarioMetMaatregelenUitSleutels(
      slot.naam,
      asIs,
      bewerktPand,
      slot.sleutels,
      totaleHandmatigeInvesteringEuro,
      handmatigeKandidaten,
      tarievenset,
      peildatum,
      kostencatalogus,
      verwervingswaardeEuro,
      slot.maatregelPrijzenEuro,
    );
  }, [asIs, slot, handmatigeKandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro]);
}
