import { z } from 'zod';

export const HuurprijsRegel = z.object({
  punten: z.number().int().min(0),
  maxHuurEuro: z.number().min(0),
});
export type HuurprijsRegel = z.infer<typeof HuurprijsRegel>;

export const EnergielabelFactor = z.object({
  label: z.string().min(1),
  factorPerM2: z.number(),
});
export type EnergielabelFactor = z.infer<typeof EnergielabelFactor>;

/**
 * "totEnMetBouwjaar" is de bovengrens van een bouwjaarband (bv. 1999 dekt panden gebouwd
 * t/m 1999, ná de vorige, lagere grens). De tabel heeft geen ondergrens: de laagste band
 * (1976) dekt elk ouder pand. Alleen een bouwjaar ná de hoogste grens (2099) valt buiten de
 * tabel — de engine (taak 4) moet dát expliciet afvangen, niet stilzwijgend clampen.
 */
export const BouwjaarFactor = z.object({
  totEnMetBouwjaar: z.number().int(),
  factorPerM2: z.number(),
});
export type BouwjaarFactor = z.infer<typeof BouwjaarFactor>;

export const CoropGebiedTarief = z.object({
  gebied: z.string().min(1),
  wozGemPerM2Euro: z.number().min(0),
});
export type CoropGebiedTarief = z.infer<typeof CoropGebiedTarief>;

/**
 * Eén band uit de aanrechttabel van §2.5.2. De banden zijn boven begrensd; `bovengrensM: null`
 * is de open bovenste band. `inclusiefBovengrens: false` geldt alleen voor de nulband
 * ("Minder dan 1 meter"), de overige banden nemen hun bovengrens mee — zo valt precies 2,00 m
 * in de 4-puntenband en precies 3,00 m in de 7-puntenband.
 *
 * `minWooneenhedenMetToegang` codeert de voetnoot bij 13 punten: "mits er minimaal 8
 * onzelfstandige wooneenheden toegang en gebruiksrecht hebben tot de keuken". Wordt daar niet
 * aan voldaan, dan valt de keuken terug op de eerstvolgende lagere band.
 */
export const KeukenAanrechtBand = z.object({
  bovengrensM: z.number().positive().nullable(),
  inclusiefBovengrens: z.boolean(),
  punten: z.number().min(0),
  minWooneenhedenMetToegang: z.number().int().positive().optional(),
});
export type KeukenAanrechtBand = z.infer<typeof KeukenAanrechtBand>;

export const KeukenExtraPunten = z.object({
  afzuiginstallatie: z.number(),
  kookplaatInductie: z.number(),
  kookplaatKeramisch: z.number(),
  kookplaatGas: z.number(),
  koelkast: z.number(),
  vrieskast: z.number(),
  ovenElektrisch: z.number(),
  ovenGas: z.number(),
  magnetron: z.number(),
  vaatwasmachine: z.number(),
  extraKastruimtePer60Cm: z.number(),
  eenhandsmengkraan: z.number(),
  thermostatischeMengkraan: z.number(),
  kokendWaterfunctie: z.number(),
});
export type KeukenExtraPunten = z.infer<typeof KeukenExtraPunten>;

export const SanitairToiletPunten = z.object({
  Geen: z.number(),
  'Staand in toiletruimte': z.number(),
  'Staand in badkamer': z.number(),
  'Hangend in toiletruimte': z.number(),
  'Hangend in badkamer': z.number(),
});
export type SanitairToiletPunten = z.infer<typeof SanitairToiletPunten>;

export const SanitairBasisPunten = z.object({
  wastafel: z.number(),
  meerpersoonswastafel: z.number(),
  douche: z.number(),
  bad: z.number(),
  badDoucheCombinatie: z.number(),
});
export type SanitairBasisPunten = z.infer<typeof SanitairBasisPunten>;

export const SanitairExtraPunten = z.object({
  bubbelfunctieBad: z.number(),
  doucheafscheidingVolledig: z.number(),
  handdoekenradiator: z.number(),
  ingebouwdKastjeMetWastafel: z.number(),
  kastruimte: z.number(),
  stopcontact: z.number(),
  eenhandsmengkraan: z.number(),
  thermostatischeMengkraan: z.number(),
});
export type SanitairExtraPunten = z.infer<typeof SanitairExtraPunten>;

export const SanitairMaxima = z.object({
  wastafelPuntenPerVertrekBuitenBadkamer: z.number(),
  meerpersoonswastafelPuntenPerVertrekBuitenBadkamer: z.number(),
  kastruimtePunten: z.number(),
  stopcontactenPerWastafel: z.number().int(),
  wooneenhedenVoorWastafelUitzondering: z.number().int(),
});
export type SanitairMaxima = z.infer<typeof SanitairMaxima>;

export const Tarievenset = z.object({
  peildatum: z.string().date(),
  huurprijstabel: z.array(HuurprijsRegel).min(1),
  energielabelfactoren: z.array(EnergielabelFactor).min(1),
  bouwjaargrenzen: z.array(BouwjaarFactor).min(1),
  coropGebieden: z.array(CoropGebiedTarief).min(1),
  keukenAanrechtBasispunten: z.array(KeukenAanrechtBand).min(1),
  keukenExtraPunten: KeukenExtraPunten,
  sanitairToiletPunten: SanitairToiletPunten,
  sanitairBasisPunten: SanitairBasisPunten,
  sanitairExtraPunten: SanitairExtraPunten,
  sanitairMaxima: SanitairMaxima,
});
export type Tarievenset = z.infer<typeof Tarievenset>;
