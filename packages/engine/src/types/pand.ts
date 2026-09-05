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
  /**
   * Vervangt sinds 2026-09-05 een exacte ingangsdatum (feedback Emma Morrison): vaak staat op
   * bijv. Funda alleen de labelletter, niet de ingangsdatum. Default `false` — een gekozen label
   * wordt dan gewoon gebruikt. Alleen als de gebruiker expliciet aangeeft dat de ingangsdatum
   * onbekend is of het label ouder dan 10 jaar is (§2.4.3 lid 3), valt `berekenR4` terug op de
   * bouwjaargrens, net als bij "geen label bekend". `.default(false)` i.p.v. verplicht: een
   * nieuw verplicht veld op een al opgeslagen, Zod-gevalideerd type breekt anders het laden van
   * bestaande deals (zelfde les als `Keuken.verwarmd`, 2026-09-04).
   */
  energielabelOnbekendOfVervallen: z.boolean().default(false),
  /**
   * Eigen inschatting van de kosten om naar dit label te komen (Tussenfase-taak C, 2026-09-04 —
   * feedback Steven Kramer: energielabel-scenario's A+/A++/A+++ naast elkaar vergelijken). De
   * labelsprong zelf is pandfysica (§r4-energie.ts), geen catalogusprijs — dus vult de gebruiker
   * dit zelf in. Leeg = niet haalbaar of niet relevant voor dit pand; de scenariovergelijking
   * biedt dan geen wisselknop naar dat label aan.
   */
  energielabelKostenSchattingAPlusEuro: z.number().nonnegative().optional(),
  energielabelKostenSchattingAPlusPlusEuro: z.number().nonnegative().optional(),
  energielabelKostenSchattingAPlusPlusPlusEuro: z.number().nonnegative().optional(),
  bouwjaar: z.number().int().min(1000).max(3000),
  aantalKamers: z.number().int().min(1).max(12),
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
