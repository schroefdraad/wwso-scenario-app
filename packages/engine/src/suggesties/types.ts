import { z } from 'zod';
import type { Tarievenset } from '@wwso/data';
import type { Kostencatalogus, Maatregel } from '@wwso/data';
import type { PandInvoer } from '../types/index';
import type { EindtellingResultaat, RubriekPunten } from '../eindtelling/index';
import type { Mutatie, Scenario } from '../scenario/index';
import type { Versiestempel } from '../versiestempel';

/**
 * Suggestie-engine (taak 11) — architectuur volgens
 * `outputs/RAPPORT_taak11_2026-08-20.md` (Opus-ontwerp, aangescherpt op BTW). Alle types in
 * dit bestand volgen dat ontwerp; zie het rapport voor de motivatie per beslissing.
 */

/**
 * Beschrijft waar een kandidaat om draait — puur voor identificatie/groepering in de UI.
 * De onderliggende `Mutatie` zelf grijpt nooit rechtstreeks op een kamer aan (§4 van het
 * ontwerp): 'kamer' hier betekent "een nieuwe ruimte die privé aan deze kamer wordt gekoppeld"
 * (bijv. K-01, S-01), niet een kamer-gerichte mutatiesoort.
 */
export type DoelSoort = 'pand' | 'kamer' | 'ruimte' | 'keuken' | 'sanitair' | 'parkeerplek' | 'aanbelfunctie' | 'aftreksituatie';

export interface KandidaatDoel {
  soort: DoelSoort;
  /** ruimteNr, of undefined bij 'pand'/'aanbelfunctie'/'aftreksituatie'. */
  nr?: number;
}

/** Grove classificatie van het vrije-tekstveld `Maatregel.vergunningOfMelding` (§6 van het ontwerp). */
export type VergunningKlasse = 'geen' | 'mogelijk-melding' | 'vergunning' | 'niet-van-toepassing';

export interface Kandidaat<P = unknown> {
  /** Stabiele sleutel, bijv. "K-04#keuken:7" — basis voor dedup, memoïsatie en UI-referentie. */
  sleutel: string;
  maatregelId: string;
  doel: KandidaatDoel;
  /** Aantal eenheden voor de kostenberekening; betekenis volgt uit Maatregel.eenheid. */
  hoeveelheid: number;
  parameters?: P;
  /** Mensleesbaar, bijv. "Koelkast plaatsen in de gedeelde keuken (ruimte 7)". */
  omschrijving: string;
  /** Gevuld als de registry een conservatieve keuze heeft moeten maken op ambigue catalogustekst. */
  interpretatie?: string;
  waarschuwing?: string;
}

export interface MaatregelContext {
  /** De HUIDIGE staat — bij pakketopbouw dus inclusief eerder geaccepteerde mutaties (§3 van het ontwerp). */
  pand: PandInvoer;
  tarievenset: Tarievenset;
  peildatum: string;
  eindtelling: EindtellingResultaat;
  marge: MargeAnalyse;
}

export interface MaatregelDefinitie<P = unknown> {
  id: string;
  doelSoort: DoelSoort;
  vergunningKlasse: VergunningKlasse;
  /** Letterlijke kopie van Maatregel.vergunningOfMelding op classificatiemoment — drift-check in validatie.ts. */
  vergunningBrontekst: string;
  /** false voor enablers en alle PROC-regels: nooit zelfstandig kandidaat. */
  puntenrelevant: boolean;
  /** Andere maatregel-id's die als kostenrider meelopen (bijv. K-02 bij K-01). */
  vereist?: readonly string[];
  /** Economische alternatieven voor hetzelfde doel; een pakket kiest hoogstens één per (groep, doel). */
  alternatiefGroep?: string;
  /** Verandert pand.aantalKamers → herindeling-spoor, niet in Basis/Comfort/Maximaal. */
  wijzigtAantalKamers?: boolean;
  parameterSchema?: z.ZodType<P>;
  /**
   * Geeft een reden terug als deze maatregel niet beoordeeld kan worden zonder een expliciete
   * parameter (ontbrekend pandgegeven, §2 van het ontwerp) — dan wordt `kandidaten()` niet
   * aangeroepen en verschijnt de maatregel in `SuggestieResultaat.nietBeoordeeld`. Geeft
   * `undefined` terug zodra er genoeg informatie is (parameter aanwezig, of — zoals bij E-09 —
   * de maatregel toevallig parametervrij toepasbaar is).
   */
  nietBeoordeeldReden?(ctx: MaatregelContext, parameters?: P): string | undefined;
  kandidaten(ctx: MaatregelContext, parameters?: P): Kandidaat<P>[];
  /** Mutaties tegen de HUIDIGE ctx.pand, niet tegen de as-is (§2/§3 van het ontwerp). */
  mutaties(ctx: MaatregelContext, kandidaat: Kandidaat<P>): Mutatie[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MaatregelRegistry = ReadonlyMap<string, MaatregelDefinitie<any>>;
export const REGISTRY_VERSIE = '1.0';

// ---------------------------------------------------------------------------------------------
// Marge-analyse (§1, laag C van het ontwerp) — diagnostisch, nooit een getal dat in de economie
// terechtkomt.
// ---------------------------------------------------------------------------------------------

export interface MargeRubriek {
  ruw: number;
  afgerond: number;
  /** 0.25 − ((ruw + 0.125) mod 0.25): hoeveel ruwe punten nog nodig zijn voor het volgende kwartpunt. */
  afstandTotVolgendeKwartpunt: number;
  /** ruw − afgerond; kan negatief zijn. */
  verlorenDoorAfronding: number;
}

export interface MargeKamer {
  kamer: number;
  perRubriek: Record<keyof RubriekPunten, MargeRubriek>;
  totaalVoorEindsaldering: number;
  /** Hoeveel de ruwe eindsom nog moet stijgen voor het volgende hele punt. */
  afstandTotVolgendHeelPunt: number;
}

export type MargeSignaalSoort = 'poort-niet-gehaald' | 'plafond-bereikt' | 'afrondingsverlies' | 'gat-in-catalogus';

export interface MargeSignaal {
  soort: MargeSignaalSoort;
  rubriek: keyof RubriekPunten | 'PROC';
  ruimteNr?: number;
  kamer?: number;
  omschrijving: string;
  /** Alleen bij 'gat-in-catalogus': geschatte jaarlijkse huurwinst als het gat gedicht zou worden. */
  geschatteJaarhuurEuro?: number;
}

export interface MargeAnalyse {
  perKamer: Record<number, MargeKamer>;
  signalen: MargeSignaal[];
}

// ---------------------------------------------------------------------------------------------
// Kosten
// ---------------------------------------------------------------------------------------------

/**
 * Eenzijdige onzekerheid (§5 van het ontwerp): de extra jaarhuur komt uit de rekenmotor en
 * heeft geen band, alleen de kosten variëren. `optimistisch` hoort daarom bij de laagste kosten
 * (kortste terugverdientijd) — bewust geen `min`/`max`, dat zou de TVT-band per ongeluk omdraaien.
 */
export interface Bandbreedte {
  optimistisch: number;
  verwacht: number;
  pessimistisch: number;
}

export interface InvesteringOpbouw {
  basisEuro: Bandbreedte;
  regioIndex: number;
  indexatieFactor: number;
  /** Conservatieve default: 21% op het vermoedelijk exclusieve bedrag (aanscherping 2026-08-20). */
  btwFactor: number;
  btwBehandeling: 'conservatief-21-procent';
  hoeveelheid: number;
  riders: { maatregelId: string; euro: Bandbreedte }[];
}

// ---------------------------------------------------------------------------------------------
// Publieke API
// ---------------------------------------------------------------------------------------------

export interface SuggestieOpties {
  tarievenset: Tarievenset;
  peildatum: string;
  kostencatalogus: Kostencatalogus;
  registry?: MaatregelRegistry;
  uitvoeringsjaar?: number;
  /** Adapter voor ΔBAR (§6 van het ontwerp) — bewust niet op Pand, houdt de fase-4-grens met de rendementscalculator intact. */
  verwervingswaardeEuro?: number;
  huurderving?: { maandenPerKamer: number; kamers: 'geraakt' | 'alle' };
  maatregelParameters?: Record<string, unknown>;
  uitgeslotenMaatregelen?: readonly string[];
  gekozenAlternatieven?: Record<string, string>;
  grenzen?: { basisTvtJaren: number; comfortTvtJaren: number };
  maxEindtellingen?: number;
}

export interface PandWaardering {
  perKamer: Record<number, { totaalPunten: number; maxHuurEuro: number }>;
  brutoJaarhuurEuro: number;
}

export interface KandidaatWaardering {
  kandidaat: Kandidaat;
  maatregel: Maatregel;
  vergunningKlasse: VergunningKlasse;
  mutaties: Mutatie[];
  investeringEuro: Bandbreedte;
  investeringOpbouw: InvesteringOpbouw;
  extraJaarhuurEuro: number;
  terugverdientijdJaren: Bandbreedte | null;
  marginaalBrutoRendementPct: Bandbreedte | null;
  geraakteKamers: number[];
  perKamer: Record<number, { deltaPunten: number; deltaMaxHuurEuro: number }>;
}

export interface PakketRegel {
  kandidaat: Kandidaat;
  maatregelId: string;
  /** Leave-one-out: extraJaarhuur(pakket) − extraJaarhuur(pakket zonder deze maatregel). */
  marginaleBijdrageJaarhuurEuro: number;
  investeringEuro: Bandbreedte;
}

export interface Pakket {
  /** 'Basis' | 'Comfort' | 'Maximaal' voor de algoritmische pakketopbouw (taak 11); een vrij gekozen naam voor een handmatig samengesteld scenario (taak 14, `bouwVrijScenario`). */
  naam: string;
  regels: PakketRegel[];
  verworpen: { kandidaatSleutel: string; reden: string }[];
  scenario: Scenario;
  waardering: PandWaardering;
  /**
   * `null` voor een handmatig bewerkt scenario (`bouwHandmatigScenario`): er is dan geen
   * catalogusmaatregel om een investeringsbedrag uit af te leiden. Een vuistregel van €0 zou
   * hier een verzonnen, oneindig rendement opleveren (zie `berekenMarginaalRendement`) — expliciet
   * `null` is de eerlijke waarde.
   */
  investeringEuro: Bandbreedte | null;
  extraJaarhuurEuro: number;
  /** pakketwinst − Σ leave-one-out-bijdragen; kan negatief zijn bij drempeloverschrijding (§3 van het ontwerp). */
  restpostEuro: number;
  terugverdientijdJaren: Bandbreedte | null;
  marginaalBrutoRendementPct: Bandbreedte | null;
  deltaBarProcentpunt: Bandbreedte | null;
  vergunningplichtig: { maatregelId: string; klasse: VergunningKlasse; brontekst: string }[];
  ontbrekendeKosten: { maatregelId: string; omschrijving: string; euro: Bandbreedte }[];
}

export interface SuggestieResultaat {
  versiestempel: Versiestempel;
  asIs: PandWaardering;
  margeAnalyse: MargeAnalyse;
  kandidaten: KandidaatWaardering[];
  nietBeoordeeld: { maatregelId: string; reden: string }[];
  pakketten: { basis: Pakket; comfort: Pakket; maximaal: Pakket };
  herindeling: KandidaatWaardering[];
  waarschuwingen: string[];
  aantalEindtellingen: number;
}
