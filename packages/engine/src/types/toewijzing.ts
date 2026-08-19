import { z } from 'zod';

/** Kamernummer 1-12, zoals de K1..K12-kolommen in Invoer!H18:S18. */
export const KamerNummer = z.number().int().min(1).max(12);
export type KamerNummer = z.infer<typeof KamerNummer>;

/**
 * Eén rij van de K1-K12-matrix: welke kamers toegang hebben tot een ruimte.
 * n_kamers (Invoer, laatste kolom) wordt bewust niet opgeslagen — dat is
 * kamers.length en zou als los veld kunnen desynchroniseren van de matrix.
 */
export const ToewijzingEntry = z.object({
  ruimteNr: z.number().int().min(1).max(40),
  kamers: z.array(KamerNummer).min(1),
});
export type ToewijzingEntry = z.infer<typeof ToewijzingEntry>;

export const Toewijzing = z.array(ToewijzingEntry);
export type Toewijzing = z.infer<typeof Toewijzing>;
