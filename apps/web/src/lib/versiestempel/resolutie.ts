import { alleTarievensets, getTarievenset, getKostencatalogus, nieuwsteKostencatalogus, type Kostencatalogus, type Tarievenset } from '@wwso/data';

/**
 * Zonder `peildatum` (nieuwe, nog niet opgeslagen invoer): de nieuwste tarievenset. Mét
 * `peildatum` (een geladen deal, taak 15): exact de tarievenset waarmee die deal destijds is
 * doorgerekend — `getTarievenset` is stabiel voor een historische peildatum, ook nadat er later
 * een nieuwere set is toegevoegd (harde regel 6).
 */
export function bepaalTarievenset(peildatum?: string): Tarievenset {
  if (peildatum) return getTarievenset(peildatum);
  const sets = alleTarievensets();
  return sets[sets.length - 1];
}

/** Zelfde principe als `bepaalTarievenset`, voor de kostencatalogus-versie. */
export function bepaalKostencatalogus(versie?: string): Kostencatalogus {
  return versie ? getKostencatalogus(versie) : nieuwsteKostencatalogus();
}
