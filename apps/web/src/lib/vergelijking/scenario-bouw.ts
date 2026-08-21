import {
  analyseerMarge,
  berekenEindtelling,
  bouwVrijScenario,
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
