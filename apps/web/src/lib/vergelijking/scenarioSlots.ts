import type { PandInvoer } from '@wwso/engine';
import type { ScenarioSelectie } from '../deals/types';
import type { ScenarioSlot } from './useScenarioPakket';

/**
 * Pure logica rond de drie vaste scenario-slots op de vergelijking: leeg/standaard, laden uit en
 * opslaan naar de deal, kopiëren. Losgetrokken uit `Vergelijking.tsx` (2026-10-06) zodat het
 * zonder React te testen is.
 */
export const STANDAARD_NAMEN = ['Scenario 1', 'Scenario 2', 'Scenario 3'];

/** Een leeg, onaangeraakt scenario — `kamerBewerkt: false` en `energielabelDoel: null` is wat
 * `useScenarioPakket` herkent als "nog niets ingevuld" (i.p.v. een nietszeggend pakket met 0
 * overal); `pand` krijgt de as-is mee puur zodat er iets geldigs staat om kandidaten tegen te
 * berekenen. */
export function leegSlot(naam: string, asIs: PandInvoer): ScenarioSlot {
  return {
    naam,
    pand: asIs,
    kamerBewerkt: false,
    energielabelDoel: null,
    sleutels: new Set<string>(),
    handmatigeInvesteringEuro: 0,
    maatregelPrijzenEuro: {},
  };
}

export function standaardSlots(asIs: PandInvoer): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((naam) => leegSlot(naam, asIs));
}

/** Geen kamers bewerkt, geen energielabel-wisseling, geen maatregelen, geen investering. */
export function isOnaangeraakt(s: ScenarioSlot): boolean {
  return (
    !s.kamerBewerkt &&
    !s.energielabelDoel &&
    s.sleutels.size === 0 &&
    s.handmatigeInvesteringEuro === 0
  );
}

/** Vult de drie vaste slots met de scenario's van een geladen deal (taak 15, uitgebreid
 * 2026-08-22 met handmatige scenario's); ontbrekende slots blijven leeg met een standaardnaam.
 * Een vóór 2026-09-05 opgeslagen `'kandidaten'`-scenario (de toen nog gedeelde, niet-per-scenario
 * checkboxmodus) migreert hier naar het uniforme pad: `pand` = as-is, sleutels behouden — precies
 * wat dat scenario toen betekende (alleen catalogusmaatregelen, geen kamers bewerkt). Een vóór
 * 2026-09-07 opgeslagen `'energielabel'`-scenario (toen nog exclusief van een kamerbewerking,
 * feedback Emma Morrison: "ik kan helemaal niks meer als ik een scenario selecteer") migreert naar
 * dezelfde uniforme vorm: `pand` = as-is (dat scenario kende geen bewerkt pand), `energielabelDoel`
 * = het opgeslagen doellabel. */
export function slotsUitScenarios(scenarios: ScenarioSelectie[], asIs: PandInvoer): ScenarioSlot[] {
  // Positie uit `slotIndex` (vanaf 2026-10-06); oudere scenario's zonder dat veld op volgorde.
  const opPositie: (ScenarioSelectie | undefined)[] = [];
  scenarios.forEach((s, i) => {
    const positie = 'slotIndex' in s && s.slotIndex !== undefined ? s.slotIndex : i;
    if (positie < STANDAARD_NAMEN.length && !opPositie[positie]) opPositie[positie] = s;
  });
  return STANDAARD_NAMEN.map((standaardNaam, i) => {
    const opgeslagen = opPositie[i];
    if (!opgeslagen) return leegSlot(standaardNaam, asIs);
    return slotUitScenario(opgeslagen, asIs);
  });
}

function slotUitScenario(opgeslagen: ScenarioSelectie, asIs: PandInvoer): ScenarioSlot {
  if (opgeslagen.soort === 'handmatig') {
    return {
      naam: opgeslagen.naam,
      pand: opgeslagen.pand,
      kamerBewerkt: opgeslagen.kamerBewerkt,
      energielabelDoel: opgeslagen.energielabelDoel ?? null,
      sleutels: new Set(opgeslagen.sleutels),
      handmatigeInvesteringEuro: opgeslagen.handmatigeInvesteringEuro,
      maatregelPrijzenEuro: opgeslagen.maatregelPrijzenEuro,
    };
  }
  if (opgeslagen.soort === 'energielabel') {
    return {
      naam: opgeslagen.naam,
      pand: asIs,
      kamerBewerkt: false,
      energielabelDoel: opgeslagen.doelLabel,
      sleutels: new Set(opgeslagen.sleutels),
      handmatigeInvesteringEuro: 0,
      maatregelPrijzenEuro: opgeslagen.maatregelPrijzenEuro,
    };
  }
  return {
    naam: opgeslagen.naam,
    pand: asIs,
    kamerBewerkt: false,
    energielabelDoel: null,
    sleutels: new Set(opgeslagen.sleutels),
    handmatigeInvesteringEuro: 0,
    maatregelPrijzenEuro: {},
  };
}

/** Een onaangeraakt scenario draagt geen informatie en wordt overgeslagen — zelfde discipline als
 * de vroegere lege "kandidaten"-modus. Zodra er wél iets is wordt het scenario altijd opgeslagen,
 * altijd als het uniforme `'handmatig'`-type (Tussenfase-taak C, uitgebreid 2026-09-07:
 * `'energielabel'` is alleen nog een leesbaar legacy-formaat). */
export function opslaanbareScenarios(slots: ScenarioSlot[]): ScenarioSelectie[] {
  return slots.flatMap((s, slotIndex): ScenarioSelectie[] => {
    if (isOnaangeraakt(s)) return [];
    return [
      {
        soort: 'handmatig',
        naam: s.naam,
        pand: s.pand,
        kamerBewerkt: s.kamerBewerkt,
        energielabelDoel: s.energielabelDoel ?? undefined,
        sleutels: [...s.sleutels],
        handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
        maatregelPrijzenEuro: s.maatregelPrijzenEuro,
        slotIndex,
      },
    ];
  });
}

export type KopieerUitkomst =
  | { soort: 'gekopieerd'; slots: ScenarioSlot[] }
  | { soort: 'bevestiging-nodig' }
  | { soort: 'ongeldig' };

/**
 * Kopieert scenario `van` naar slot `naar` binnen dezelfde woning (verzoek eigenaar 2026-10-06:
 * "scenario 1 kopiëren zodat ik die gegevens kan bewerken in scenario 2"). Diepe kopie: wijzigen
 * van de kopie raakt het origineel nooit. Een gevuld doel wordt nooit stil overschreven. Naam =
 * standaardnaam van het doel ("Scenario 2"): de kopie is het vertrekpunt voor een tweede scenario
 * (besluit eigenaar 2026-10-06), geen "(kopie)".
 * Versiestempel: scenario's hebben geen eigen stempel, de kopie valt onder dat van de woning.
 */
export function kopieerSlot(
  slots: ScenarioSlot[],
  van: number,
  naar: number,
  opts: { overschrijvenBevestigd: boolean },
): KopieerUitkomst {
  const bron = slots[van];
  const doel = slots[naar];
  if (van === naar || !bron || !doel || isOnaangeraakt(bron)) return { soort: 'ongeldig' };
  if (!isOnaangeraakt(doel) && !opts.overschrijvenBevestigd) return { soort: 'bevestiging-nodig' };
  const kopie: ScenarioSlot = {
    naam: STANDAARD_NAMEN[naar] ?? doel.naam,
    pand: structuredClone(bron.pand),
    kamerBewerkt: bron.kamerBewerkt,
    energielabelDoel: bron.energielabelDoel,
    sleutels: new Set(bron.sleutels),
    handmatigeInvesteringEuro: bron.handmatigeInvesteringEuro,
    maatregelPrijzenEuro: { ...bron.maatregelPrijzenEuro },
  };
  return { soort: 'gekopieerd', slots: slots.map((s, i) => (i === naar ? kopie : s)) };
}

/**
 * Na "Gebruik als scenario" (terug van Scenario bewerken) direct opslaan (2026-10-06): anders
 * stond de kamerbewerking alleen in het geheugen. Bij een alleen-lezen woning of onzekere rechten
 * níet, want dan zou opslaan een kopie maken (CLAUDE.md: nooit stil een kopie maken).
 */
export function moetOpslaanNaScenarioBewerking(opts: {
  heeftResultaat: boolean;
  magBewerken: boolean;
  bewerkrechtenOnzeker: boolean;
}): boolean {
  return opts.heeftResultaat && opts.magBewerken && !opts.bewerkrechtenOnzeker;
}
