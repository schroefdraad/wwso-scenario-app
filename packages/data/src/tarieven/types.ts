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

export const Tarievenset = z.object({
  peildatum: z.string().date(),
  huurprijstabel: z.array(HuurprijsRegel).min(1),
  energielabelfactoren: z.array(EnergielabelFactor).min(1),
  bouwjaargrenzen: z.array(BouwjaarFactor).min(1),
  coropGebieden: z.array(CoropGebiedTarief).min(1),
});
export type Tarievenset = z.infer<typeof Tarievenset>;
