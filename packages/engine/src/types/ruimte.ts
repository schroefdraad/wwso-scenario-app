import { z } from 'zod';

/**
 * De 11 typen uit de live data-validation-lijst van Invoer!C18 in wwso.xlsx, aangevuld met
 * 'Gemeenschappelijk vertrek' en 'Gemeenschappelijke overige ruimte' (TODO-04, opgelost in
 * taak 2) en met 'Parkeerplek gemeenschappelijk' (taak 6, voor R10). Die laatste staat los van
 * 'Buitenruimte gemeenschappelijk' omdat het beleidsboek ze expliciet uit elkaar houdt: "Gedeelde
 * buitenruimten die als parkeerplek voor auto's bedoeld zijn, worden gewaardeerd volgens
 * rubriek 10" (§2.8.3) — een gedeelde tuin met een parkeerplek erin blijft dus R8, maar een
 * losse gedeelde parkeerplek is R10.
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
  'Parkeerplek gemeenschappelijk',
]);
export type RuimteType = z.infer<typeof RuimteType>;

/**
 * Ruimtetypen waarvan de puntenwaardering tweemaal wordt gedeeld: eerst door het aantal
 * adressen in het woongebouw met toegang en gebruiksrecht, dan door het aantal onzelfstandige
 * wooneenheden op het eigen adres met toegang (§2.8.2, §2.9.1, §2.10.4). Voor deze typen is
 * `Ruimte.aantalAdressenMetToegang` verplicht — zie de validatie in PandInvoer.
 */
export const DUBBEL_GEDEELDE_RUIMTE_TYPES: readonly RuimteType[] = [
  'Buitenruimte gemeenschappelijk',
  'Gemeenschappelijk vertrek',
  'Gemeenschappelijke overige ruimte',
  'Parkeerplek gemeenschappelijk',
];

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
  /**
   * Aantal adressen in het woongebouw dat toegang en gebruiksrecht heeft tot déze ruimte.
   * Verplicht voor de typen in `DUBBEL_GEDEELDE_RUIMTE_TYPES` (R8/R9/R10) — de motor neemt
   * hier nooit stilzwijgend 1 aan, ook al is dat in de praktijk de meest voorkomende waarde
   * (harde regel 4). Voor overige ruimtetypen wordt dit veld genegeerd.
   */
  aantalAdressenMetToegang: z.number().int().min(1).optional(),
});
export type Ruimte = z.infer<typeof Ruimte>;
