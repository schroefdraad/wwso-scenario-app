import kostencatalogus_0_1 from './0.1/kostencatalogus_0.1.json';
import { Kostencatalogus } from './types.js';

export * from './types.js';

/**
 * Eén regel per versie, net als bij de tarievensets. Bij een nieuwe import (na een bijgewerkte
 * xlsx) komt hier een nieuwe versie bij — een bestaande versie wordt nooit overschreven, zodat
 * een opgeslagen deal reproduceerbaar blijft (harde regel 6).
 */
const KOSTENCATALOGI: Kostencatalogus[] = [kostencatalogus_0_1].map((set) => Kostencatalogus.parse(set));

/** Geeft de kostencatalogus met exact deze versie terug. Geen "dichtstbijzijnde"-fallback: een opgeslagen deal verwijst naar een specifieke versie, niet naar een datum. */
export function getKostencatalogus(versie: string): Kostencatalogus {
  const gevonden = KOSTENCATALOGI.find((k) => k.versie === versie);
  if (!gevonden) {
    throw new Error(
      `Geen kostencatalogus gevonden met versie '${versie}'. Beschikbare versies: ${KOSTENCATALOGI.map((k) => k.versie).join(', ')}.`,
    );
  }
  return gevonden;
}

/** De meest recent geïmporteerde kostencatalogus — voor nieuwe scenario's zonder expliciete versiekeuze. */
export function nieuwsteKostencatalogus(): Kostencatalogus {
  const laatste = KOSTENCATALOGI.at(-1);
  if (!laatste) {
    throw new Error('Geen enkele kostencatalogus beschikbaar — draai eerst het importscript.');
  }
  return laatste;
}

export function alleKostencatalogi(): readonly Kostencatalogus[] {
  return KOSTENCATALOGI;
}
