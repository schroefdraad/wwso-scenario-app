import { z } from 'zod';
import { Pand } from '../types/pand';
import { Ruimte } from '../types/ruimte';
import { KamerNummer } from '../types/toewijzing';
import { Keuken, SanitairVoorziening, GemeenschappelijkeParkeerplek } from '../types/voorzieningen';
import { PandInvoer } from '../types/pand-invoer';

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
  /** Willekeurige subset van Pand-velden — bijv. { energielabel: 'A', energielabelOnbekendOfVervallen: false }. */
  patch: Pand.partial(),
});

/**
 * Vervangt de volledige as-is door een expliciet meegegeven, al gevalideerd TO-BE-pand — geen
 * incrementele patch (backlog: AS-IS kopiëren naar een handmatig te bewerken TO-BE scenario,
 * feedback Emma Morrison, 2026-08-21). Bewust géén diff tegen de as-is: de gebruiker bewerkt een
 * kopie van het hele invoerformulier vrij (ruimtes toevoegen/verwijderen, keuken/sanitair
 * wijzigen, alles), en het terugrekenen van zo'n vrije bewerking naar een minimale mutatielijst
 * zou fragiel zijn en niets toevoegen — de mutatielijst is hier per definitie altijd exact één
 * item. Moet als ENIGE mutatie in een `Scenario` staan; latere mutaties zouden zinloos zijn
 * omdat deze mutatie de as-is toch al volledig vervangt.
 */
const VervangPand = z.object({
  soort: z.literal('vervang-pand'),
  pand: PandInvoer,
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

/**
 * R12.2 — aanbelfunctie met video toevoegen (taak 11, maatregel X-01). Er is bewust geen
 * `-wijzigen`/`-verwijderen`-variant: geen van de 49 catalogusmaatregelen heeft die nodig
 * (leave-one-out herbouwt vanaf de as-is), en vooraf een symmetrisch stel bouwen zou gokken
 * naar een behoefte die nog niet bevestigd is — zelfde lijn als taak 9.
 */
const AanbelfunctieToevoegen = z.object({
  soort: z.literal('aanbelfunctie-toevoegen'),
  kamersMetToegang: z.array(KamerNummer).min(1),
});

/**
 * R13 — een aftreksituatie herzien (taak 11, maatregelen A-01/A-02/A-03). Vervangt de volledige
 * kamerlijst voor die situatie, net als `toewijzing-wijzigen` de volledige kamers-lijst van een
 * ruimte vervangt — geen incrementeel toevoegen/verwijderen van één kamer.
 */
const AftreksituatieWijzigen = z.object({
  soort: z.literal('aftreksituatie-wijzigen'),
  situatie: z.enum(['verhuurderCriterium', 'ruitoppervlakteOnvoldoende', 'raamkozijnTeHoog']),
  kamers: z.array(KamerNummer),
});

export const Mutatie = z.discriminatedUnion('soort', [
  PandPatch,
  VervangPand,
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
  AanbelfunctieToevoegen,
  AftreksituatieWijzigen,
]);
export type Mutatie = z.infer<typeof Mutatie>;

/** Eén optimalisatiescenario: een naam plus de mutaties die het bovenop de as-is toepast. */
export const Scenario = z.object({
  naam: z.string().min(1),
  mutaties: z.array(Mutatie),
});
export type Scenario = z.infer<typeof Scenario>;
