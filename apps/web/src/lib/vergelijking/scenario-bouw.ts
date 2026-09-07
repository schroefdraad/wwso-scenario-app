import {
  bouwHandmatigScenarioMetMaatregelen,
  doelSleutel,
  genereerEnWaardeerKandidaten,
  nieuwBudget,
  pasScenarioToe,
  standaardRegistry,
  type Energielabel,
  type KandidaatWaardering,
  type MaatregelContext,
  type Mutatie,
  type Pakket,
  type PandInvoer,
  type PoolItem,
} from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';

/** De drie doellabels van de energielabel-scenariovergelijking (Tussenfase-taak C) — een vaste
 * subset van `Energielabel`, want alleen hiervoor heeft het pandgegevens-scherm een kostenveld. */
export const ENERGIELABEL_SCENARIO_DOELEN = ['A+', 'A++', 'A+++'] as const;
export type EnergielabelScenarioDoel = (typeof ENERGIELABEL_SCENARIO_DOELEN)[number];

/** Leest de eigen kosteninschatting voor één doellabel van het pand — `undefined` als het veld
 * leeg is (niet haalbaar/relevant, zie `PandFormulier.tsx`). Eén plek die de drie velden aan hun
 * doellabel koppelt, gedeeld door de wisselknop-opties en de scenariobouw zelf. */
export function energielabelKostenschatting(pand: PandInvoer, doelLabel: EnergielabelScenarioDoel): number | undefined {
  switch (doelLabel) {
    case 'A+':
      return pand.pand.energielabelKostenSchattingAPlusEuro;
    case 'A++':
      return pand.pand.energielabelKostenSchattingAPlusPlusEuro;
    case 'A+++':
      return pand.pand.energielabelKostenSchattingAPlusPlusPlusEuro;
  }
}

/** Doellabels met een ingevulde kosteninschatting, exclusief het huidige as-is label zelf (een
 * "upgrade" naar het label dat het pand al heeft, is geen scenario om te tonen). */
export function beschikbareEnergielabelDoelen(pand: PandInvoer): EnergielabelScenarioDoel[] {
  return ENERGIELABEL_SCENARIO_DOELEN.filter((doel) => doel !== pand.pand.energielabel && energielabelKostenschatting(pand, doel) !== undefined);
}

/**
 * Het pand ná een energielabel-wisseling naar `doelLabel`, toegepast op WELK pand dan ook (de
 * as-is, óf een al met de hand bewerkt scenario-pand) — dezelfde `pand-patch`-mutatie die de
 * E-01 t/m E-09-catalogusmaatregelen ook gebruiken (`registry/r4-energie.ts`). Sinds 2026-09-07
 * (feedback Emma Morrison: "ik kan helemaal niks meer als ik een scenario selecteer, hij
 * overschrijft ook mijn extra huuropbrengsten van extra gerealiseerde kamers") is een
 * energielabel-doel geen apart, exclusief scenariotype meer maar een laag bovenop het gewone
 * scenario-pand (`ScenarioSlot.energielabelDoel` in `useScenarioPakket.ts`) — vandaar dat deze
 * functie generiek een willekeurig pand aanneemt, niet specifiek de as-is.
 */
export function pandMetEnergielabel(pand: PandInvoer, doelLabel: Energielabel): PandInvoer {
  const mutaties: Mutatie[] = [{ soort: 'pand-patch', patch: { energielabel: doelLabel, energielabelOnbekendOfVervallen: false } }];
  return pasScenarioToe(pand, mutaties);
}

/**
 * Toggle-logica voor de maatregeltabel per scenario-tabblad (`HandmatigMaatregelen`). Checkboxes
 * zijn bewust onafhankelijk (de gebruiker kiest expliciet, zie dat bestand),
 * BEHALVE binnen dezelfde `alternatiefGroep` + doel: twee varianten van dezelfde fysieke
 * plek (bijv. K-01/K-09 kitchenette in dezelfde kamer) leveren allebei een `keuken-toevoegen`-
 * mutatie op hetzelfde ruimteNr, wat `pasMutatieToe` een harde `mutatieFout` laat gooien —
 * onopgevangen, midden in een render-`useMemo`, dus een kapotte pagina. Aanvinken van de ene
 * vinkt daarom automatisch de andere alternatieven voor hetzelfde doel uit.
 */
export function nieuweSelectieNaToggle(kandidaten: readonly KandidaatWaardering[], huidigeSleutels: ReadonlySet<string>, sleutel: string): Set<string> {
  const nieuw = new Set(huidigeSleutels);
  if (nieuw.has(sleutel)) {
    nieuw.delete(sleutel);
    return nieuw;
  }

  const kandidaat = kandidaten.find((k) => k.kandidaat.sleutel === sleutel);
  const alternatiefGroep = kandidaat ? standaardRegistry.get(kandidaat.maatregel.id)?.alternatiefGroep : undefined;
  if (kandidaat && alternatiefGroep) {
    const doel = doelSleutel(kandidaat.kandidaat);
    for (const ander of kandidaten) {
      if (ander.kandidaat.sleutel === sleutel || !nieuw.has(ander.kandidaat.sleutel)) continue;
      if (standaardRegistry.get(ander.maatregel.id)?.alternatiefGroep === alternatiefGroep && doelSleutel(ander.kandidaat) === doel) {
        nieuw.delete(ander.kandidaat.sleutel);
      }
    }
  }

  nieuw.add(sleutel);
  return nieuw;
}

/**
 * Groepeersleutel voor de visuele keuzegroep in `HandmatigMaatregelen.tsx` (Tussenfase-taak B) — twee
 * kandidaten met dezelfde sleutel zijn economische alternatieven voor dezelfde fysieke plek
 * (bijv. K-01/K-09 kitchenette in kamer 3). `undefined` betekent: geen alternatieven, gewoon een
 * losse checkbox. Bewust gescheiden van `nieuweSelectieNaToggle` (die blijft de bron van waarheid
 * voor de daadwerkelijke uit-toggel-logica) — dit is puur voor het UI-groeperen/grijs-zetten.
 */
export function alternatiefGroepSleutel(kandidaat: KandidaatWaardering): string | undefined {
  const alternatiefGroep = standaardRegistry.get(kandidaat.maatregel.id)?.alternatiefGroep;
  return alternatiefGroep ? `${alternatiefGroep}|${doelSleutel(kandidaat.kandidaat)}` : undefined;
}

/**
 * Cachet op `bewerktPand`-referentie (niet -inhoud): sinds elk scenario-slot altijd een `pand`
 * draagt (2026-09-05, ook onaangeraakte slots — daar is dat letterlijk dezelfde referentie als de
 * as-is), zouden drie onaangeraakte scenario's anders alledrie deze dure berekening apart
 * uitvoeren op exact hetzelfde pand. Een `WeakMap` dedupliceert dat zonder een aparte cache-
 * ongeldig-makingsstap: verdwijnt de pand-referentie (nieuw scenario bewerkt, oude losgelaten),
 * dan ruimt de garbage collector de cache-regel vanzelf op.
 */
const handmatigeKandidatenCache = new WeakMap<
  PandInvoer,
  { tarievenset: Tarievenset; peildatum: string; kostencatalogus: Kostencatalogus; resultaat: { ctxBasis: MaatregelContext; kandidaten: KandidaatWaardering[] } }
>();

/**
 * Genereert en waardeert de maatregelen die specifiek van toepassing zijn op een handmatig
 * bewerkt TO-BE-pand (backlog 2026-08-22: "handmatig een extra kamer realiseren en dan verder
 * maatregelen toevoegen") — bijv. airco of een kitchenette in een net toegevoegde kamer, die in
 * de gedeelde as-is-kandidatenlijst van de vergelijkingspagina niet voorkomen omdat die kamer
 * daar nog niet bestaat. Duur genoeg (volledige kandidaatgeneratie + solo-waardering van alle
 * catalogusmaatregelen) om als aparte, memoïseerbare stap te laten staan — zie
 * `useHandmatigeKandidaten`, die dit resultaat ÉÉN keer per bewerkt pand berekent en hergebruikt
 * voor zowel de checkbox-lijst als het uiteindelijke pakket.
 */
export function berekenKandidatenVoorHandmatigPand(
  bewerktPand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
): { ctxBasis: MaatregelContext; kandidaten: KandidaatWaardering[] } {
  const cache = handmatigeKandidatenCache.get(bewerktPand);
  if (cache && cache.tarievenset === tarievenset && cache.peildatum === peildatum && cache.kostencatalogus === kostencatalogus) {
    return cache.resultaat;
  }
  const resultaat = genereerEnWaardeerKandidaten(bewerktPand, tarievenset, peildatum, kostencatalogus, nieuwBudget(2000));
  handmatigeKandidatenCache.set(bewerktPand, { tarievenset, peildatum, kostencatalogus, resultaat });
  return resultaat;
}

/**
 * Bouwt het gecombineerde pakket voor een handmatig scenario met erbovenop gekozen
 * standaardmaatregelen (backlog 2026-08-22): de handmatige investering (het kosten-veld dat de
 * gebruiker zelf invult voor de herindeling) plus de catalogusmaatregelkosten tellen op tot één
 * Investering/Terugverdientijd/Rendement — zie `bouwHandmatigScenarioMetMaatregelen` in
 * `@wwso/engine` voor de precieze berekening.
 *
 * `maatregelPrijzenEuro` (Tussenfase-taak D) overschrijft de catalogusprijs per aangevinkte
 * maatregel — sleutels die er niet in staan vallen terug op de catalogusprijs.
 */
export function bouwHandmatigScenarioMetMaatregelenUitSleutels(
  naam: string,
  asIs: PandInvoer,
  bewerktPand: PandInvoer,
  geselecteerdeSleutels: ReadonlySet<string>,
  handmatigeInvesteringEuro: number,
  kandidatenTegenBewerkt: { ctxBasis: MaatregelContext; kandidaten: readonly KandidaatWaardering[] },
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  verwervingswaardeEuro: number | undefined,
  maatregelPrijzenEuro: Readonly<Record<string, number>> = {},
): Pakket {
  const regels: PoolItem[] = kandidatenTegenBewerkt.kandidaten
    .filter((k) => geselecteerdeSleutels.has(k.kandidaat.sleutel))
    .map((waardering) => {
      const definitie = standaardRegistry.get(waardering.maatregel.id);
      if (!definitie) throw new Error(`Geen registry-definitie gevonden voor maatregel ${waardering.maatregel.id}.`);
      return { waardering, definitie };
    });

  return bouwHandmatigScenarioMetMaatregelen(
    naam,
    asIs,
    bewerktPand,
    regels,
    handmatigeInvesteringEuro,
    kandidatenTegenBewerkt.ctxBasis,
    tarievenset,
    peildatum,
    kostencatalogus,
    kostencatalogus.aannames.prijspeilJaar,
    verwervingswaardeEuro,
    nieuwBudget(2000),
    maatregelPrijzenEuro,
  );
}
