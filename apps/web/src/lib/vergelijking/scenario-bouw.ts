import {
  analyseerMarge,
  berekenEindtelling,
  bouwHandmatigScenarioMetMaatregelen,
  bouwVrijScenario,
  doelSleutel,
  genereerEnWaardeerKandidaten,
  nieuwBudget,
  standaardRegistry,
  type KandidaatWaardering,
  type MaatregelContext,
  type Pakket,
  type PandInvoer,
  type PoolItem,
} from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';

/**
 * Toggle-logica voor de handmatige maatregeltabellen (`MaatregelTabel`/`HandmatigMaatregelen`).
 * Checkboxes zijn bewust onafhankelijk (de gebruiker kiest expliciet, zie `MaatregelTabel.tsx`),
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
 * Bouwt een scenario uit een set gekozen kandidaat-sleutels (taak 14 — "maatregelen aan- en
 * uitzetten"). Roept `bouwVrijScenario` uit `@wwso/engine` aan, die ELKE gekozen maatregel
 * toepast — ook als hij in déze combinatie geen marginale winst oplevert (dat is precies het
 * verschil met de algoritmische Basis/Comfort/Maximaal-pakketopbouw uit taak 11).
 *
 * Bewust géén memoïsatie hier: `bouwVrijScenario` rekent op deze paneelgrootte (enkele
 * kandidaten) in enkele milliseconden — ruim binnen de 100ms-eis uit de taakomschrijving — dus
 * de aanroeper (React-component) kan dit gewoon in een `useMemo` op de geselecteerde sleutels
 * hangen zonder aparte caching-laag.
 */
export function bouwScenarioUitSleutels(
  naam: string,
  asIs: PandInvoer,
  geselecteerdeSleutels: ReadonlySet<string>,
  alleKandidaten: readonly KandidaatWaardering[],
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  verwervingswaardeEuro: number | undefined,
): Pakket {
  const eindtelling = berekenEindtelling(asIs, tarievenset, peildatum);
  const marge = analyseerMarge(asIs, tarievenset, eindtelling);
  const ctxBasis: MaatregelContext = { pand: asIs, tarievenset, peildatum, eindtelling, marge };

  const regels: PoolItem[] = alleKandidaten
    .filter((k) => geselecteerdeSleutels.has(k.kandidaat.sleutel))
    .map((waardering) => {
      const definitie = standaardRegistry.get(waardering.maatregel.id);
      if (!definitie) throw new Error(`Geen registry-definitie gevonden voor maatregel ${waardering.maatregel.id}.`);
      return { waardering, definitie };
    });

  return bouwVrijScenario(
    naam,
    asIs,
    regels,
    ctxBasis,
    tarievenset,
    peildatum,
    kostencatalogus,
    kostencatalogus.aannames.prijspeilJaar,
    verwervingswaardeEuro,
    nieuwBudget(2000),
  );
}

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
  return genereerEnWaardeerKandidaten(bewerktPand, tarievenset, peildatum, kostencatalogus, nieuwBudget(2000));
}

/**
 * Bouwt het gecombineerde pakket voor een handmatig scenario met erbovenop gekozen
 * standaardmaatregelen (backlog 2026-08-22): de handmatige investering (het kosten-veld dat de
 * gebruiker zelf invult voor de herindeling) plus de catalogusmaatregelkosten tellen op tot één
 * Investering/Terugverdientijd/Rendement — zie `bouwHandmatigScenarioMetMaatregelen` in
 * `@wwso/engine` voor de precieze berekening.
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
  );
}
