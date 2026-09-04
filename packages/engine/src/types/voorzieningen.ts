import { z } from 'zod';

/**
 * De vijf basiseisen voor een keuken (§2.5.1). Ontbreekt er één, dan krijgt de ruimte géén
 * keukenpunten — "Dus ook niet voor eventuele extra voorzieningen als hierna in paragraaf
 * 2.5.3 benoemd." Dit is een poort, geen aftrek.
 *
 * Over de wandafwerking zegt het beleidsboek: "Een hedendaagse keuken zal aan deze eis
 * voldoen, daarom neemt de Huurcommissie als uitgangspunt dat de wandafwerking waterdicht
 * is." Het veld blijft toch verplicht — de gebruiker moet de aanname bevestigen in plaats van
 * dat de engine hem stilzwijgend invult (harde regel 4).
 */
export const KeukenBasiseisen = z.object({
  aanEnAfvoerWater: z.boolean(),
  vastKookaansluitpunt: z.boolean(),
  /** Aanrechtblad van minimaal 1 meter in één stuk, inclusief spoelbak en/of kookplaat. */
  aanrechtbladMinimaal1MeterInEenStuk: z.boolean(),
  /** Twee inbouwkasten van elk ten minste 50 cm breed. */
  tweeInbouwkastenVan50Cm: z.boolean(),
  /** Waterdicht boven het aanrechtblad en in de kookhoek, tot minimaal 1,50 m. */
  waterdichteWandafwerking: z.boolean(),
});
export type KeukenBasiseisen = z.infer<typeof KeukenBasiseisen>;

/**
 * Extra keukenvoorzieningen (§2.5.3). Booleans, behalve extra kastruimte: die telt "per 60 cm
 * breedte" boven het minimum van 1 meter uit de basiseisen.
 *
 * §2.5.4: één voorziening met twee functies telt als twee losse voorzieningen. Een
 * combi-magnetron/oven zet dus zowel `magnetron` als een oven op true; een koel-vriescombinatie
 * met twee aparte deuren zowel `koelkast` als `vrieskast`.
 */
export const KeukenExtraVoorzieningen = z.object({
  afzuiginstallatie: z.boolean(),
  kookplaatInductie: z.boolean(),
  kookplaatKeramisch: z.boolean(),
  kookplaatGas: z.boolean(),
  koelkast: z.boolean(),
  vrieskast: z.boolean(),
  ovenElektrisch: z.boolean(),
  ovenGas: z.boolean(),
  magnetron: z.boolean(),
  vaatwasmachine: z.boolean(),
  extraKastruimteEenhedenVan60Cm: z.number().int().min(0),
  eenhandsmengkraan: z.boolean(),
  thermostatischeMengkraan: z.boolean(),
  kokendWaterfunctie: z.boolean(),
});
export type KeukenExtraVoorzieningen = z.infer<typeof KeukenExtraVoorzieningen>;

export const Keuken = z.object({
  /** Verwijst naar een Ruimte; die hoeft geen type 'Keuken' te hebben (denk aan een open keuken). */
  ruimteNr: z.number().int().min(1).max(40),
  /** Gemeten over het midden van het bovenblad, inclusief spoelbak en kookplaat (§2.5.2). */
  aanrechtlengteM: z.number().min(0),
  basiseisen: KeukenBasiseisen,
  extra: KeukenExtraVoorzieningen,
  /**
   * Alleen relevant als deze keuken een open keuken is (`ruimte.type !== 'Keuken'`, bijv. een
   * kitchenette in een slaapkamer): §2.3.2 waardeert zo'n open keuken voor rubriek 3 apart van
   * het vertrek waarin ze staat — "Een privé verwarmde woonkamer met open keuken wordt dus
   * gewaardeerd met 4 punten" (2 voor het vertrek + 2 voor de open keuken, elk mits verwarmd).
   * Bewust een eigen veld, niet automatisch gelijk aan `ruimte.verwarmd`: dat zou zonder
   * onderbouwing aannemen dat een kitchenette altijd hetzelfde verwarmingscircuit deelt als de
   * rest van het vertrek (harde regel 4 — nooit stilzwijgend gokken).
   */
  verwarmd: z.boolean(),
});
export type Keuken = z.infer<typeof Keuken>;

/** Waarden uit de dropdown van Voorzieningen!B145, met de punten uit §2.6.1. */
export const ToiletType = z.enum([
  'Geen',
  'Staand in toiletruimte',
  'Staand in badkamer',
  'Hangend in toiletruimte',
  'Hangend in badkamer',
]);
export type ToiletType = z.infer<typeof ToiletType>;

/**
 * De vijf eisen waaraan een bad- of doucheruimte moet voldoen om überhaupt extra punten te
 * kunnen krijgen (§2.6.2). Net als bij de keuken een poort: "Alleen als aan de bovenstaande
 * eisen wordt voldaan, kunnen alleen voor de volgende voorzieningen extra punten gekregen
 * worden." De basispunten (toilet, wastafel, douche/bad) blijven wél gewoon staan.
 */
export const SanitairExtraEisen = z.object({
  waterdichteVloerafwerking: z.boolean(),
  /** Vrije hoogte van 2,00 m over ten minste 50% van de oppervlakte. */
  vrijeHoogte2MeterOverHelft: z.boolean(),
  /** Waterdicht tot 1,50 m (badruimte) respectievelijk 1,80 m (doucheruimte). */
  waterdichteWandafwerking: z.boolean(),
  wastafelMetMengkraanEnSpiegel: z.boolean(),
  doucheOfBadMetWarmEnKoudWater: z.boolean(),
});
export type SanitairExtraEisen = z.infer<typeof SanitairExtraEisen>;

/**
 * Extra sanitaire voorzieningen (§2.6.2). Handdoekenradiatoren en stopcontacten zijn aantallen:
 * het rekenvoorbeeld bij §2.6.2 waardeert expliciet "2 handdoekenradiatoren (2 x 0,75 punt)",
 * en stopcontacten kennen een maximum van twee per (meerpersoons)wastafel.
 */
export const SanitairExtraVoorzieningen = z.object({
  bubbelfunctieBad: z.boolean(),
  doucheafscheidingVolledig: z.boolean(),
  aantalHanddoekenradiatoren: z.number().int().min(0),
  ingebouwdKastjeMetWastafel: z.boolean(),
  /** Minimaal 40 cm in breedte én hoogte; gecapt op 0,75 punt totaal. */
  kastruimte: z.boolean(),
  aantalStopcontacten: z.number().int().min(0),
  eenhandsmengkraan: z.boolean(),
  thermostatischeMengkraan: z.boolean(),
});
export type SanitairExtraVoorzieningen = z.infer<typeof SanitairExtraVoorzieningen>;

/**
 * Sanitair in één ruimte. Bewust niet "badruimte" genoemd: §2.6 stelt dat de waardering "niet
 * beperkt is tot de badkamer en toiletruimte, maar ook kan gaan over sanitaire voorzieningen
 * in andere ruimten. Bijvoorbeeld een douche in een woon- of slaapkamer." De xlsx kon dat niet
 * uitdrukken; dit model wel.
 */
export const SanitairVoorziening = z.object({
  ruimteNr: z.number().int().min(1).max(40),
  toiletType: ToiletType,
  aantalWastafels: z.number().int().min(0),
  aantalMeerpersoonswastafels: z.number().int().min(0),
  douche: z.boolean(),
  bad: z.boolean(),
  /** Eén voorziening die zowel bad als douche is; vervangt de losse waardering (§2.6.1). */
  badDoucheCombinatie: z.boolean(),
  extraEisen: SanitairExtraEisen,
  extra: SanitairExtraVoorzieningen,
});
export type SanitairVoorziening = z.infer<typeof SanitairVoorziening>;

/**
 * De drie soorten gemeenschappelijke parkeerplekken uit §2.10.3, met punten 9 / 6 / 4
 * (bevestigd tegen wwso.xlsx, zie briefing "Bevestigd correct").
 */
export const ParkeerplekType = z.enum(['I', 'II', 'III']);
export type ParkeerplekType = z.infer<typeof ParkeerplekType>;

/**
 * Eén gemeenschappelijke parkeerplek (R10, §2.10). Verwijst naar een Ruimte van het type
 * 'Parkeerplek gemeenschappelijk', die `aantalAdressenMetToegang` levert voor de eerste
 * deling; de tweede deling (door het aantal wooneenheden met toegang) komt uit de
 * K1-K12-toewijzing, net als bij Keuken en SanitairVoorziening.
 */
export const GemeenschappelijkeParkeerplek = z.object({
  ruimteNr: z.number().int().min(1).max(40),
  type: ParkeerplekType,
  /**
   * §2.10.5: een laadpaal geeft 2 extra punten, maar die worden — anders dan de basispunten
   * van de parkeerplek zelf — uitsluitend gedeeld door het aantal adressen, NIET ook nog
   * door het aantal wooneenheden op het eigen adres. Zie briefing B10.
   */
  laadpaal: z.boolean(),
});
export type GemeenschappelijkeParkeerplek = z.infer<typeof GemeenschappelijkeParkeerplek>;
