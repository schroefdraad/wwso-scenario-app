import { z } from 'zod';
import { KamerNummer } from './toewijzing';

/**
 * R7 — Woonvoorzieningen voor personen met een handicap (§2.7). Ontbreekt volledig in
 * `wwso.xlsx`. 1 punt per € 332,00 netto-investering, gedeeld door het aantal personen met
 * een handicap dat toegang en gebruiksrecht heeft tot de voorziening — niet door het aantal
 * wooneenheden, dat kan afwijken (§2.7). `kamersMetToegang` legt vast wélke kamers dat zijn,
 * zodat de motor per kamer kan uitrekenen in plaats van alleen een aantal te tellen.
 *
 * Voorwaarden (§2.7.1, opeengestapeld): ingreep op of ná 01-04-1994, ten dele gesubsidieerd,
 * en aangebracht voor de persoon met een handicap. Volledig door subsidie gedekt → geen
 * waardering (§2.7.2). Die toets is aan de gebruiker; hier wordt alleen de netto-investering
 * vastgelegd die daarna overblijft. Een array omdat er meerdere investeringen voor
 * verschillende personen kunnen zijn, elk met een eigen kring van toegang.
 */
export const WoonvoorzieningenHandicap = z.object({
  /** Netto-investering in euro: kosten minus subsidie minus eigen bijdrage huurder. */
  nettoInvesteringEuro: z.number().min(0),
  /** Kamers van de personen met een handicap die toegang en gebruiksrecht hebben. */
  kamersMetToegang: z.array(KamerNummer).min(1),
});
export type WoonvoorzieningenHandicap = z.infer<typeof WoonvoorzieningenHandicap>;

/**
 * R12.2 — Aanbelfunctie met video- en audioverbinding (§2.12.2), 0,25 punt. Geen ruimte en
 * geen eigen rubriek-brede aan/uit-vlag: net als andere gedeelde voorzieningen (§2.1.5) wordt
 * dit verdeeld over de kamers die er toegang toe hebben. Meestal één post voor het hele pand.
 */
export const AanbelfunctieMetVideo = z.object({
  kamersMetToegang: z.array(KamerNummer).min(1),
});
export type AanbelfunctieMetVideo = z.infer<typeof AanbelfunctieMetVideo>;

/**
 * R12.3 — Losse laadpaal (§2.12.3), 2 punten, exclusief voor bewoners en niet gekoppeld aan
 * een gemeenschappelijke parkeerplek (die loopt via R10, zie GemeenschappelijkeParkeerplek).
 * Ook hier: verdeeld over de kamers met toegang volgens de algemene regel van §2.1.5.
 */
export const LosseLaadpaal = z.object({
  kamersMetToegang: z.array(KamerNummer).min(1),
});
export type LosseLaadpaal = z.infer<typeof LosseLaadpaal>;

/**
 * R13 — Aftrekpunten (§2.13): drie van de vier situaties zijn niet uit de ruimte-invoer af te
 * leiden (de vierde, oppervlakte rubriek 1 < 8 m², berekent de motor zelf uit R1). Elke lijst
 * bevat de kamers waarvoor de situatie geldt; elke situatie kost onafhankelijk 4 punten, dus
 * een kamer die in twee lijsten voorkomt verliest 8 punten.
 */
export const AftrekSituaties = z.object({
  /** Hoofdverblijf verhuurder + woonruimte of sanitair alleen bereikbaar via diens vertrek. */
  verhuurderCriterium: z.array(KamerNummer),
  /** Ruitoppervlakte (hoofd)woonvertrek < 0,75 m², gemeten aan het zichtbare glas. */
  ruitoppervlakteOnvoldoende: z.array(KamerNummer),
  /** Laagste raamkozijn van het (hoofd)woonvertrek > 1,60 m boven de vloer. */
  raamkozijnTeHoog: z.array(KamerNummer),
});
export type AftrekSituaties = z.infer<typeof AftrekSituaties>;

/**
 * Posten die de gebruiker expliciet invult omdat het beleidsboek ze niet uit de ruimtelijke
 * invoer laat afleiden. Nooit stilzwijgend op een aanname zetten (harde regel 4).
 *
 * R9 (gemeenschappelijke vertrekken/overige ruimten) staat hier NIET meer in sinds taak 6:
 * die rubriek wordt nu automatisch afgeleid uit de ruimtetypen 'Gemeenschappelijk vertrek' en
 * 'Gemeenschappelijke overige ruimte' plus de K1-K12-toewijzing (zie r9-gemeenschappelijke-
 * ruimten.ts). Het oude `gemeenschappelijkeVertrekken`-veld verviel daarmee.
 */
export const HandmatigePosten = z.object({
  /** R7 — leeg als er geen gehandicaptenvoorzieningen zijn. */
  woonvoorzieningenHandicap: z.array(WoonvoorzieningenHandicap),
  /** R12.2 — leeg als er geen aanbelfunctie met video is. */
  aanbelfuncties: z.array(AanbelfunctieMetVideo),
  /** R12.3 — leeg als er geen losse laadpaal is (een laadpaal bij een gemeenschappelijke parkeerplek loopt via R10). */
  losseLaadpalen: z.array(LosseLaadpaal),
  /** R13 — per situatie de kamers waarvoor die geldt. */
  aftrekSituaties: AftrekSituaties,
  /** R12.1 — zorgwoning geeft +35% op de rubrieken 1 t/m 11 (§2.12), toegepast bij de eindtelling (taak 7). */
  zorgwoning: z.boolean(),
});
export type HandmatigePosten = z.infer<typeof HandmatigePosten>;
