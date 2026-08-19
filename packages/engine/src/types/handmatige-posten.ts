import { z } from 'zod';
import { KamerNummer } from './toewijzing.js';

/**
 * R7 — Gemeenschappelijke vertrekken (§2.7). Blijft handmatig zolang de ruimtetypen
 * 'Gemeenschappelijk vertrek' / 'Gemeenschappelijke overige ruimte' niet automatisch
 * doorrekenen (Toelichting-tab, TODO-04). Punten per kamer, direct overgenomen uit
 * Berekening!C9:N9 in de xlsx (die rij heeft geen formule, dus is per kamer handmatig).
 */
export const GemeenschappelijkeVertrekkenPunten = z.array(
  z.object({
    kamer: KamerNummer,
    punten: z.number().min(0),
  }),
);
export type GemeenschappelijkeVertrekkenPunten = z.infer<typeof GemeenschappelijkeVertrekkenPunten>;

/**
 * R12-bijzonderheid — zorgwoning-opslag: +35% op R1-R11 (Toelichting-tab, TODO-07).
 * De opslag zelf wordt nog niet automatisch verrekend; dit veld legt alleen de
 * gebruikersinvoer vast zodat er nooit stilzwijgend van "nee" wordt uitgegaan (harde regel 4).
 */
export const HandmatigePosten = z.object({
  gemeenschappelijkeVertrekken: GemeenschappelijkeVertrekkenPunten,
  zorgwoning: z.boolean(),
});
export type HandmatigePosten = z.infer<typeof HandmatigePosten>;
