import { z } from 'zod';

/**
 * De 11 typen uit de live data-validation-lijst van Invoer!C18 in wwso.xlsx, aangevuld met
 * 'Gemeenschappelijk vertrek' en 'Gemeenschappelijke overige ruimte'. Die twee ontbreken nog
 * in de xlsx zelf — dat is een bekend gat (Toelichting-tab, TODO-04: "Ruimtetypen voor
 * gemeenschappelijke vertrekken toevoegen zodat R7 automatisch berekent"). De motor lost dat
 * gat hier op; R7 kan hierdoor later automatisch in plaats van handmatig, maar dat is taak 6+.
 */
export const RuimteType = z.enum([
  'Privévertrek',
  'Keuken',
  'Badruimte',
  'Berging',
  'Bijkeuken',
  'Wasruimte',
  'Overige ruimte',
  'Toiletruimte',
  'Verkeersruimte',
  'Buitenruimte privé',
  'Buitenruimte gemeenschappelijk',
  'Gemeenschappelijk vertrek',
  'Gemeenschappelijke overige ruimte',
]);
export type RuimteType = z.infer<typeof RuimteType>;

/**
 * Aanwezig als de ruimte een zolderruimte is. Relevant voor twee regels uit het beleidsboek:
 * - §2.2.1.3 — een zolder telt alleen als *vertrek* bij een vaste trap én een beschoten dak
 * - §2.2.2.3 — een zolder die als *overige ruimte* telt en géén vaste trap heeft, levert
 *   5 aftrekpunten op, begrensd zodat de zolder zelf nooit negatief wordt
 */
export const ZolderKenmerken = z.object({
  vasteTrap: z.boolean(),
  beschotenDak: z.boolean(),
});
export type ZolderKenmerken = z.infer<typeof ZolderKenmerken>;

export const Ruimte = z.object({
  /** Volgnummer 1-40 zoals in Invoer!A18:A57 — puur voor herleidbaarheid naar de xlsx, geen rekenkundige betekenis. */
  nr: z.number().int().min(1).max(40),
  naam: z.string().min(1),
  type: RuimteType,
  oppervlakteM2: z.number().positive(),
  /** Bouwlaag; 0 = begane grond. Geen dropdown in de xlsx, dus vrij geheel getal (ook negatief voor kelder). */
  verdieping: z.number().int(),
  verwarmd: z.boolean(),
  verkoeld: z.boolean(),
  /** Alleen invullen als de ruimte een zolderruimte is; zie ZolderKenmerken. */
  zolder: ZolderKenmerken.optional(),
});
export type Ruimte = z.infer<typeof Ruimte>;
