import type { PandInvoer } from '../types/index.js';
import type { Ruimte, RuimteType } from '../types/index.js';

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
 * De rekenregel van §2.1.1.1 / §2.2.2.1, die op vierkante meters afrondt en niet op punten:
 *
 * 1. bepaal de oppervlakte per ruimte
 * 2. tel alle *privé* ruimten op en rond af op hele m²
 * 3. doe hetzelfde voor de *gemeenschappelijke* ruimten (na deling door het aantal kamers
 *    met toegang, conform het rekenvoorbeeld in §2.4.4: 40 m² / 4 bewoners = 10 m²)
 * 4. tel beide op en rond opnieuw af op hele m²
 *
 * Een ruimte geldt hier als privé wanneer precies één kamer er toegang toe heeft.
 */
export function oppervlakteVolgensRekenregel(
  ruimtes: ToegankelijkeRuimte[],
  types: readonly RuimteType[],
): { priveM2: number; gedeeldM2: number; totaalM2: number } {
  const relevant = ruimtes.filter((r) => types.includes(r.ruimte.type));

  const priveRuw = relevant
    .filter((r) => r.nKamersMetToegang === 1)
    .reduce((som, r) => som + r.ruimte.oppervlakteM2, 0);
  const gedeeldRuw = relevant
    .filter((r) => r.nKamersMetToegang > 1)
    .reduce((som, r) => som + r.ruimte.oppervlakteM2 / r.nKamersMetToegang, 0);

  const priveM2 = rondAfOpHeleM2(priveRuw);
  const gedeeldM2 = rondAfOpHeleM2(gedeeldRuw);

  return { priveM2, gedeeldM2, totaalM2: rondAfOpHeleM2(priveM2 + gedeeldM2) };
}

/** De vertrekoppervlakte in hele m² — grondslag voor zowel R1 als R4 (§2.4.4). */
export function vertrekOppervlakteM2(ruimtes: ToegankelijkeRuimte[]): number {
  return oppervlakteVolgensRekenregel(ruimtes, VERTREK_TYPES).totaalM2;
}
