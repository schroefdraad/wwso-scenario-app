import { z } from 'zod';

/**
 * Waarden 1:1 overgenomen uit de data-validation-lijst van Invoer!B10 in wwso.xlsx.
 * "Bouwjaar" is geen echt label maar de xlsx-waarde voor "geen energielabel bekend,
 * val terug op de bouwjaargrens-tabel" (zie R4, Toelichting-tab).
 */
export const Energielabel = z.enum([
  'A++++',
  'A+++',
  'A++',
  'A+',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'Bouwjaar',
]);
export type Energielabel = z.infer<typeof Energielabel>;

/** Waarden 1:1 uit Invoer!B13. */
export const SoortWoning = z.enum(['Meergezins', 'Eengezins']);
export type SoortWoning = z.infer<typeof SoortWoning>;

/** Waarden 1:1 uit Invoer!B16. Bepaalt de monumentopslag in taak 7 (Rijks 35%, Gemeente/Provinciaal 15%, Beschermd dorpsgezicht 5%). */
export const MonumentStatus = z.enum([
  'Geen',
  'Rijks',
  'Gemeente',
  'Provinciaal',
  'Beschermd dorpsgezicht',
]);
export type MonumentStatus = z.infer<typeof MonumentStatus>;

/**
 * COROP-gebied als vrije string, gevalideerd tegen de lijst in packages/data (taak 3) —
 * niet als hardcoded enum, want dat zou harde regel 1 schenden ("geen hardcoded tarieven").
 */
export const CoropGebied = z.string().min(1);
export type CoropGebied = z.infer<typeof CoropGebied>;

export const Pand = z.object({
  adres: z.string().min(1),
  stad: z.string().min(1),
  /**
   * Optioneel sinds taak 6: §2.11.1 kent ook de situatie dat er geen WOZ-waarde bekend is.
   * De motor valt dan terug op 85% van `taxatiewaardeEuro`, en bij afwezigheid van beide op
   * het laagste puntenaantal (10 punten) — nooit een stille aanname op een van beide velden.
   */
  wozWaarde: z.number().positive().optional(),
  wozPeildatum: z.string().date(),
  /** Taxatiewaarde door een Register-Taxateur (§2.11.1), alleen relevant als wozWaarde ontbreekt. */
  taxatiewaardeEuro: z.number().positive().optional(),
  wozOppervlak: z.number().positive(),
  coropGebied: CoropGebied,
  energielabel: Energielabel,
  energielabelIngangsdatum: z.string().date(),
  bouwjaar: z.number().int().min(1000).max(3000),
  soortWoning: SoortWoning,
  aantalKamers: z.number().int().min(1).max(12),
  aantalWoningenInComplex: z.number().int().min(1),
  monument: MonumentStatus,
  /**
   * Datum van de huurovereenkomst. Alleen verplicht bij `monument: 'Rijks'` (gevalideerd in
   * PandInvoer): §2.14.3 bepaalt de vorm van de monumentopslag aan de hand van deze datum —
   * op of ná 1 juli 2024 geeft +35% op de maximale huurprijs, ervóór +10 punten in plaats
   * daarvan (briefing B14). Voor de andere monumentcategorieën maakt de datum niets uit.
   */
  huurovereenkomstDatum: z.string().date().optional(),
});
export type Pand = z.infer<typeof Pand>;
