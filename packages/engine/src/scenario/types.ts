import { z } from 'zod';
import { Pand } from '../types/pand.js';
import { Ruimte } from '../types/ruimte.js';
import { KamerNummer } from '../types/toewijzing.js';
import { Keuken, SanitairVoorziening, GemeenschappelijkeParkeerplek } from '../types/voorzieningen.js';

/**
 * Een scenario is geen kopie van het pand, maar een lijst mutaties die bovenop de as-is
 * `PandInvoer` worden toegepast (taak 9). Elke mutatie is data (Zod-gevalideerd), geen
 * functie — dat is nodig omdat scenario's straks in Supabase worden opgeslagen (taak 15) en
 * dus serialiseerbaar moeten zijn.
 *
 * Bewust NIET gedekt: mutaties op `HandmatigePosten` (R7-voorzieningen, aanbelfunctie, losse
 * laadpaal, R13-aftreksituaties, zorgwoning). Geen van de drie voorbeelden uit de
 * taakomschrijving (label wijzigen, kitchenette toevoegen, wand plaatsen) heeft dat nodig, en
 * dit type breidt makkelijk uit zodra taak 11 een concrete maatregel tegenkomt die het wél
 * nodig heeft — vooraf alle 49 maatregelen uit de kostencatalogus dekken zou hier gokken naar
 * behoeften zijn die nog niet bevestigd zijn.
 */

const PandPatch = z.object({
  soort: z.literal('pand-patch'),
  /** Willekeurige subset van Pand-velden — bijv. { energielabel: 'A', energielabelIngangsdatum: '2026-06-01' }. */
  patch: Pand.partial(),
});

const RuimteToevoegen = z.object({
  soort: z.literal('ruimte-toevoegen'),
  ruimte: Ruimte,
  /** Meteen de toewijzing erbij — een ruimte zonder toegang heeft geen zin in dit model. */
  kamers: z.array(KamerNummer).min(1),
});

const RuimteWijzigen = z.object({
  soort: z.literal('ruimte-wijzigen'),
  ruimteNr: z.number().int().min(1).max(40),
  patch: Ruimte.omit({ nr: true }).partial(),
});

const RuimteVerwijderen = z.object({
  soort: z.literal('ruimte-verwijderen'),
  ruimteNr: z.number().int().min(1).max(40),
});

const ToewijzingWijzigen = z.object({
  soort: z.literal('toewijzing-wijzigen'),
  ruimteNr: z.number().int().min(1).max(40),
  /** Vervangt de volledige kamers-lijst voor deze ruimte (geen incrementeel toevoegen/verwijderen). */
  kamers: z.array(KamerNummer).min(1),
});

const KeukenToevoegen = z.object({ soort: z.literal('keuken-toevoegen'), keuken: Keuken });
const KeukenWijzigen = z.object({
  soort: z.literal('keuken-wijzigen'),
  ruimteNr: z.number().int().min(1).max(40),
  patch: Keuken.omit({ ruimteNr: true }).partial(),
});
const KeukenVerwijderen = z.object({
  soort: z.literal('keuken-verwijderen'),
  ruimteNr: z.number().int().min(1).max(40),
});

const SanitairToevoegen = z.object({ soort: z.literal('sanitair-toevoegen'), sanitair: SanitairVoorziening });
const SanitairWijzigen = z.object({
  soort: z.literal('sanitair-wijzigen'),
  ruimteNr: z.number().int().min(1).max(40),
  patch: SanitairVoorziening.omit({ ruimteNr: true }).partial(),
});
const SanitairVerwijderen = z.object({
  soort: z.literal('sanitair-verwijderen'),
  ruimteNr: z.number().int().min(1).max(40),
});

const ParkeerplekToevoegen = z.object({
  soort: z.literal('parkeerplek-toevoegen'),
  parkeerplek: GemeenschappelijkeParkeerplek,
});
const ParkeerplekWijzigen = z.object({
  soort: z.literal('parkeerplek-wijzigen'),
  ruimteNr: z.number().int().min(1).max(40),
  patch: GemeenschappelijkeParkeerplek.omit({ ruimteNr: true }).partial(),
});
const ParkeerplekVerwijderen = z.object({
  soort: z.literal('parkeerplek-verwijderen'),
  ruimteNr: z.number().int().min(1).max(40),
});

export const Mutatie = z.discriminatedUnion('soort', [
  PandPatch,
  RuimteToevoegen,
  RuimteWijzigen,
  RuimteVerwijderen,
  ToewijzingWijzigen,
  KeukenToevoegen,
  KeukenWijzigen,
  KeukenVerwijderen,
  SanitairToevoegen,
  SanitairWijzigen,
  SanitairVerwijderen,
  ParkeerplekToevoegen,
  ParkeerplekWijzigen,
  ParkeerplekVerwijderen,
]);
export type Mutatie = z.infer<typeof Mutatie>;

/** Eén optimalisatiescenario: een naam plus de mutaties die het bovenop de as-is toepast. */
export const Scenario = z.object({
  naam: z.string().min(1),
  mutaties: z.array(Mutatie),
});
export type Scenario = z.infer<typeof Scenario>;
