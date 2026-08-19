import { z } from 'zod';

/**
 * Rubrieken zoals ze in `Kostenkentallen_WWSO_optimalisatie.xlsx` voorkomen — de gecorrigeerde
 * nummering uit het beleidsboek (zie taak 6), plus `PROC` voor proceskosten zonder puntenimpact
 * (inmeting, vergunningleges, brandveiligheid, huurderving). Een expliciete lijst in plaats van
 * een vrije string: een nieuwe, onbekende rubriekcode bij het herinlezen moet het importscript
 * laten falen, niet stilzwijgend doorlopen (harde regel 4).
 */
export const MaatregelRubriek = z.enum([
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12',
  'R13',
  'PROC',
]);
export type MaatregelRubriek = z.infer<typeof MaatregelRubriek>;

/**
 * `schatting` toont de app als bandbreedte (min–max), `offerte`/`bevestigd` als één bedrag
 * (kolom G, "Kosten verwacht"). Zie `resources/Kostenkentallen_WWSO_optimalisatie.xlsx`, tab
 * Toelichting.
 */
export const MaatregelStatus = z.enum(['schatting', 'offerte', 'bevestigd']);
export type MaatregelStatus = z.infer<typeof MaatregelStatus>;

/**
 * Eén regel uit tab `Maatregelen`. Bevat bewust GEEN "verwacht × regio"-veld: dat is in de
 * xlsx een formule (`kostenVerwachtEuro * aannames.regioIndex`) en wordt dus niet als vast
 * getal opgeslagen — bij een gewijzigde regio-index zou een opgeslagen waarde stil verouderen.
 */
export const Maatregel = z.object({
  id: z.string().min(1),
  rubriek: MaatregelRubriek,
  categorie: z.string().min(1),
  maatregel: z.string().min(1),
  eenheid: z.string().min(1),
  kostenMinEuro: z.number().min(0),
  kostenVerwachtEuro: z.number().min(0),
  kostenMaxEuro: z.number().min(0),
  /** Vrije tekst: uitleg van het mechanisme, geen rekenregel. De echte puntenwinst volgt uit het doorrekenen van het scenario (taak 11). */
  effectOpPuntentelling: z.string(),
  /** Vuistregel voor sortering, geen berekening — zie de waarschuwing op tab Toelichting. */
  puntenIndicatie: z.string(),
  vergunningOfMelding: z.string(),
  doorlooptijd: z.string(),
  bron: z.string(),
  status: MaatregelStatus,
  laatstBijgewerkt: z.string().date(),
});
export type Maatregel = z.infer<typeof Maatregel>;

/** Tab `Aannames` — kengetallen waarmee de maatregelen worden doorgerekend. */
export const KostencatalogusAannames = z.object({
  /** Factor op `kostenVerwachtEuro`; 1,00 = landelijk gemiddelde. */
  regioIndex: z.number().positive(),
  /** Als fractie (0,21 = 21%), niet als percentage-getal — consistent met de rest van de codebase. */
  btwTariefBouwRegulier: z.number().min(0).max(1),
  btwTariefRenovatieArbeid: z.number().min(0).max(1),
  prijspeilJaar: z.number().int(),
  indexatieBouwkostenPerJaar: z.number().min(0).max(1),
  standaardPlafondhoogteM: z.number().positive(),
  huurdervingPerKamerPerMaandEuro: z.number().min(0),
});
export type KostencatalogusAannames = z.infer<typeof KostencatalogusAannames>;

/**
 * Eén versie van de kostencatalogus, geïmporteerd uit `Kostenkentallen_WWSO_optimalisatie.xlsx`
 * (tab Toelichting, regel "Versie X.Y — datum — ..."). Net als de tarievensets in
 * `packages/data/src/tarieven` is dit een versiedataset: een opgeslagen deal krijgt een stempel
 * met de gebruikte versie (harde regel 6), zodat een oude berekening reproduceerbaar blijft ook
 * als de catalogus daarna verandert.
 */
export const Kostencatalogus = z.object({
  versie: z.string().min(1),
  aannames: KostencatalogusAannames,
  maatregelen: z.array(Maatregel).min(1),
});
export type Kostencatalogus = z.infer<typeof Kostencatalogus>;
