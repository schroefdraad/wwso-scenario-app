import type { PandInvoer } from '../types/index';
import type { Ruimte, RuimteType } from '../types/index';

/**
 * Vertrekken (§2.2.1). Het beleidsboek: "een ruimte die uitsluitend als keuken, badkamer of
 * doucheruimte is bestemd is altijd een vertrek". Gemeenschappelijke vertrekken vallen onder
 * rubriek 9 en horen hier dus niet bij.
 */
export const VERTREK_TYPES: readonly RuimteType[] = ['Privévertrek', 'Keuken', 'Badruimte'];

/** Overige ruimten (§2.2.2): bijkeuken, berging, wasruimte, kelder, toiletruimte. */
export const OVERIGE_RUIMTE_TYPES: readonly RuimteType[] = [
  'Berging',
  'Bijkeuken',
  'Wasruimte',
  'Overige ruimte',
  'Toiletruimte',
];

/**
 * Verkeersruimten (§2.2.3) krijgen géén oppervlaktepunten in R1/R2, maar tellen in R3 wél
 * mee voor verwarming (§2.3). Daarom een eigen constante in plaats van "gewoon weglaten".
 */
export const VERKEERSRUIMTE_TYPES: readonly RuimteType[] = ['Verkeersruimte'];

/**
 * Afronding per rubriek op kwartpunten (§2.1.6): "vanaf een achtste (1/8) punt naar boven",
 * ofwel FLOOR(x + 0,125; 0,25). Het beleidsboek geeft 4,81 → 4,75 als voorbeeld.
 * Geldt voor élke rubriek — ook R1, anders dan de taakomschrijving suggereerde.
 */
export function rondAfOpKwartpunten(x: number): number {
  return Math.floor((x + 0.125) / 0.25) * 0.25;
}

/**
 * Eindsaldering op hele punten (§2.1.7): vanaf 0,5 omhoog, daaronder omlaag.
 * Alleen voor het totaal van alle rubrieken samen, niet per rubriek.
 */
export function rondAfOpHelePunten(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Afronding van vierkante meters (§2.1.1.1): "Bij een getal dat eindigt op 0,50 m² wordt
 * afgerond omhoog (28,51 → 29), bij 0,49 of lager naar beneden (15,43 → 15)."
 */
export function rondAfOpHeleM2(m2: number): number {
  return Math.floor(m2 + 0.5);
}

/** Afronding op twee decimalen (§2.8.6: oppervlakte per categorie buitenruimte). */
export function rondAfOp2Decimalen(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Een Map met alle kamernummers 1..aantalKamers, elk op 0 — startpunt voor "optellen per kamer". */
export function nulPerKamer(aantalKamers: number): Map<number, number> {
  const resultaat = new Map<number, number>();
  for (let kamer = 1; kamer <= aantalKamers; kamer++) {
    resultaat.set(kamer, 0);
  }
  return resultaat;
}

/** Eén ruimte met het aantal kamers dat er toegang toe heeft, gezien vanuit één kamer. */
export interface ToegankelijkeRuimte {
  ruimte: Ruimte;
  nKamersMetToegang: number;
}

/**
 * Voor elke kamer: welke ruimtes zijn toegankelijk, en door hoeveel kamers elke ruimte
 * gedeeld wordt. Die deler volgt uit §2.1.5: punten worden alleen verdeeld over de bewoners
 * die volgens het huurcontract toegang en gebruiksrecht hebben.
 */
export function ruimtesPerKamer(input: PandInvoer): Map<number, ToegankelijkeRuimte[]> {
  const ruimteBijNr = new Map(input.ruimtes.map((r) => [r.nr, r] as const));

  const resultaat = new Map<number, ToegankelijkeRuimte[]>();
  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    resultaat.set(kamer, []);
  }

  for (const entry of input.toewijzing) {
    const ruimte = ruimteBijNr.get(entry.ruimteNr);
    if (!ruimte) continue; // referentiële integriteit is al geborgd door PandInvoer-validatie
    const nKamersMetToegang = entry.kamers.length;
    for (const kamer of entry.kamers) {
      if (kamer > input.pand.aantalKamers) continue;
      resultaat.get(kamer)?.push({ ruimte, nKamersMetToegang });
    }
  }

  return resultaat;
}

/**
 * Per ruimtenummer de kamers die er toegang en gebruiksrecht toe hebben. Nodig voor R5 en R6,
 * die vanuit een voorziening naar de kamers redeneren in plaats van andersom.
 */
export function kamersPerRuimte(input: PandInvoer): Map<number, number[]> {
  return new Map(
    input.toewijzing.map(
      (t) => [t.ruimteNr, t.kamers.filter((k) => k <= input.pand.aantalKamers)] as const,
    ),
  );
}

/**
 * De ruwe, ongeronde oppervlakte die één kamer "heeft": alle privéruimten van het gevraagde
 * type opgeteld, plus per gedeelde ruimte het aan de kamer toegerekende deel (§2.1.5: delen
 * door het aantal onzelfstandige woonruimten met toegang en gebruiksrecht).
 *
 * Een ruimte geldt hier als privé wanneer precies één kamer er toegang toe heeft.
 *
 * Dit is de grondslag zoals het beleidsboek hem beschrijft zónder rekenregel erbovenop —
 * gebruikt door R4 (§2.4.4). R1 en R2 leggen er hun eigen m²-afronding overheen, zie
 * `oppervlakteVolgensRekenregel`.
 */
export function ongerondeOppervlakte(
  ruimtes: ToegankelijkeRuimte[],
  types: readonly RuimteType[],
): { priveM2: number; gedeeldM2: number; totaalM2: number } {
  const relevant = ruimtes.filter((r) => types.includes(r.ruimte.type));

  const priveM2 = relevant
    .filter((r) => r.nKamersMetToegang === 1)
    .reduce((som, r) => som + r.ruimte.oppervlakteM2, 0);
  const gedeeldM2 = relevant
    .filter((r) => r.nKamersMetToegang > 1)
    .reduce((som, r) => som + r.ruimte.oppervlakteM2 / r.nKamersMetToegang, 0);

  return { priveM2, gedeeldM2, totaalM2: priveM2 + gedeeldM2 };
}

/**
 * De rekenregel van §2.2.1.1 (vertrekken) / §2.2.2.1 (overige ruimten), die op vierkante
 * meters afrondt en niet op punten:
 *
 * 1. bepaal de oppervlakte per ruimte
 * 2. tel alle *privé* ruimten op en rond af op hele m²
 * 3. doe hetzelfde voor de *gemeenschappelijke* ruimten (na deling door het aantal kamers
 *    met toegang)
 * 4. tel beide op en rond opnieuw af op hele m²
 *
 * LET OP: beide paragrafen staan in de brontekst genummerd als "2.1.1.1 Rekenregels
 * vertrekken" respectievelijk "2.2.2.1 Rekenregels vertrekken" — allebei fout (de eerste
 * hoort 2.2.1.1 te zijn, de tweede gaat blijkens zijn inhoud over overige ruimten). De
 * plaatsing in de documentstructuur is leidend, niet de kop.
 *
 * Deze rekenregel is expliciet gekoppeld aan rubriek 1 en 2 — elke variant sluit af met
 * "Bepaal het puntenaantal voor de vertrekken / de overige ruimtes op basis van de m²".
 * Andere rubrieken die met dezelfde oppervlakte rekenen (R4, §2.4.4) halen hem niet aan en
 * gebruiken daarom `ongerondeOppervlakte`; R13 doet dat wél, want §2.13 verwijst met zoveel
 * woorden naar "de totale oppervlakte van het onderdeel vertrekken (rubriek 1)".
 */
export function oppervlakteVolgensRekenregel(
  ruimtes: ToegankelijkeRuimte[],
  types: readonly RuimteType[],
): { priveM2: number; gedeeldM2: number; totaalM2: number } {
  const ruw = ongerondeOppervlakte(ruimtes, types);

  const priveM2 = rondAfOpHeleM2(ruw.priveM2);
  const gedeeldM2 = rondAfOpHeleM2(ruw.gedeeldM2);

  return { priveM2, gedeeldM2, totaalM2: rondAfOpHeleM2(priveM2 + gedeeldM2) };
}

/**
 * De vertrekoppervlakte in hele m² volgens de rekenregel van rubriek 1 — de grondslag voor
 * R1 zelf en voor R13, dat er in §2.13 letterlijk naar verwijst ("rubriek 1").
 * R4 gebruikt bewust een ándere grondslag, zie `ongerondeVertrekOppervlakteM2`.
 */
export function vertrekOppervlakteM2(ruimtes: ToegankelijkeRuimte[]): number {
  return oppervlakteVolgensRekenregel(ruimtes, VERTREK_TYPES).totaalM2;
}

/**
 * De vertrekoppervlakte zónder m²-afronding: "het totaal aantal m² oppervlakte die de huurder
 * heeft als privé vertrekken en de aan huurder toe te rekenen gemeenschappelijke vertrekken"
 * (§2.4.4), de grondslag voor R4.
 *
 * Waarom niet de afgeronde R1-uitkomst: de m²-afronding staat uitsluitend in de rekenregel
 * van rubriek 1 (§2.2.1.1), die eindigt met "Bepaal het puntenaantal voor de vertrekken op
 * basis van de m²" — een instructie voor rubriek 1, niet voor de rest van het stelsel. §2.4.4
 * haalt die rekenregel niet aan en beschrijft de oppervlakte zelfstandig. Waar het
 * beleidsboek de úitkomst van rubriek 1 bedoelt, zegt het dat expliciet (§2.13: "de totale
 * oppervlakte van het onderdeel vertrekken (rubriek 1)"). Drie officiële Huurprijscheck-
 * uitkomsten (golden master, Kleiweg 179-B) bevestigen dit: alleen de ongeronde grondslag
 * reproduceert alle drie exact. Zie `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`.
 */
export function ongerondeVertrekOppervlakteM2(ruimtes: ToegankelijkeRuimte[]): number {
  return ongerondeOppervlakte(ruimtes, VERTREK_TYPES).totaalM2;
}
