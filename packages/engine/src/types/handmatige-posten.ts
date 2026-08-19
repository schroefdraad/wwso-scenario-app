import { z } from 'zod';
import { KamerNummer } from './toewijzing.js';

/**
 * R9 — Gemeenschappelijke vertrekken, overige ruimten en voorzieningen (§2.9).
 *
 * LET OP de nummering: `wwso.xlsx` noemt dit R7, maar volgens het beleidsboek is R7
 * "Woonvoorzieningen voor personen met een handicap" en zijn de gemeenschappelijke
 * vertrekken rubriek 9. Zie briefings/BRIEFING_beleidsboek_vs_xlsx_2026-08-19.md (B1).
 *
 * Blijft voorlopig handmatig zolang R9 niet automatisch uit de ruimtetypen wordt afgeleid.
 * Punten per kamer, ná beide delingen (adressen × wooneenheden, §2.9.1).
 */
export const GemeenschappelijkeVertrekkenPunten = z.array(
  z.object({
    kamer: KamerNummer,
    punten: z.number().min(0),
  }),
);
export type GemeenschappelijkeVertrekkenPunten = z.infer<typeof GemeenschappelijkeVertrekkenPunten>;

/**
 * R7 — Woonvoorzieningen voor personen met een handicap (§2.7). Ontbreekt volledig in
 * `wwso.xlsx`. 1 punt per € 332,00 netto-investering, gedeeld door het aantal personen met
 * een handicap dat toegang en gebruiksrecht heeft.
 *
 * Voorwaarden (§2.7.1, opeengestapeld): ingreep op of ná 01-04-1994, ten dele gesubsidieerd,
 * en aangebracht voor de persoon met een handicap. Volledig door subsidie gedekt → geen
 * waardering (§2.7.2). Die toets is aan de gebruiker; hier wordt alleen de netto-investering
 * vastgelegd die daarna overblijft.
 */
export const WoonvoorzieningenHandicap = z.object({
  /** Netto-investering in euro: kosten minus subsidie minus eigen bijdrage huurder. */
  nettoInvesteringEuro: z.number().min(0),
  /** Aantal wooneenheden met toegang en gebruiksrecht tot de voorzieningen. */
  aantalWooneenhedenMetToegang: z.number().int().min(1),
});
export type WoonvoorzieningenHandicap = z.infer<typeof WoonvoorzieningenHandicap>;

/**
 * Posten die de gebruiker expliciet invult omdat het beleidsboek ze niet uit de ruimtelijke
 * invoer laat afleiden. Nooit stilzwijgend op een aanname zetten (harde regel 4).
 */
export const HandmatigePosten = z.object({
  /** R9 — punten per kamer voor gemeenschappelijke vertrekken en overige ruimten. */
  gemeenschappelijkeVertrekken: GemeenschappelijkeVertrekkenPunten,
  /** R7 — afwezig als er geen gehandicaptenvoorzieningen zijn. */
  woonvoorzieningenHandicap: WoonvoorzieningenHandicap.optional(),
  /** R12 — zorgwoning geeft +35% op de rubrieken 1 t/m 11 (§2.12). */
  zorgwoning: z.boolean(),
});
export type HandmatigePosten = z.infer<typeof HandmatigePosten>;
