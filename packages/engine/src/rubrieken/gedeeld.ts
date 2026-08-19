import type { PandInvoer } from '../types/index.js';
import type { Ruimte, RuimteType } from '../types/index.js';

/**
 * De "vertrekken" van §2.2.1 (R1): privévertrek plus de twee ruimtetypen die als vertrek
 * meetellen als ze gedeeld worden. Bron: Toelichting-tab R1 — "1 punt per m² privévertrek;
 * gedeelde vertrekken (keuken, badruimte) gedeeld door n_kamers met toegang."
 */
export const VERTREK_TYPES: readonly RuimteType[] = ['Privévertrek', 'Keuken', 'Badruimte'];

/**
 * De "overige ruimten" van §2.2.2 (R2), letterlijk overgenomen uit de Toelichting-tab.
 * Verkeersruimte telt bewust niet mee (zie Controles-tab, check 1: expliciet uitgezonderd
 * van de m²-vergelijking met het WOZ-oppervlak).
 */
export const OVERIGE_RUIMTE_TYPES: readonly RuimteType[] = [
  'Berging',
  'Bijkeuken',
  'Wasruimte',
  'Overige ruimte',
  'Toiletruimte',
];

/**
 * Rondt af op hele punten (Excel-ROUND-gedrag voor positieve getallen), zoals Berekening!B18
 * ("Totaal punten, ROUND(subtotaal, 0)") en de taak-4-instructie voor R1 specifiek vragen.
 */
export function rondAfOpHelePunten(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Kwartpuntsafronding zoals letterlijk voorgeschreven: FLOOR(x + 0.125, 0.25).
 * Gebruikt voor R2, R3 en (bij gebrek aan een uitzondering in taak 4) ook R4 — harde regel 7
 * noemt kwartpuntsafronding de standaard vóór de eindsom; taak 4 noemt R1 als enige uitzondering.
 */
export function rondAfOpKwartpunten(x: number): number {
  return Math.floor((x + 0.125) / 0.25) * 0.25;
}

/** Eén ruimte met het aantal kamers dat er toegang toe heeft, gezien vanuit één kamer. */
export interface ToegankelijkeRuimte {
  ruimte: Ruimte;
  nKamersMetToegang: number;
}

/**
 * Voor elke kamer: welke ruimtes zijn toegankelijk, en door hoeveel kamers elke ruimte in
 * totaal gedeeld wordt. Dat laatste is de deler uit harde regel 7 ("gedeelde ruimten worden
 * gedeeld door het aantal kamers met toegang") — hier één keer centraal berekend zodat elke
 * rubriekfunctie 'm niet opnieuw hoeft af te leiden.
 */
export function ruimtesPerKamer(input: PandInvoer): Map<number, ToegankelijkeRuimte[]> {
  const ruimteBijNr = new Map(input.ruimtes.map((r) => [r.nr, r] as const));
  const kamersPerRuimte = new Map(input.toewijzing.map((t) => [t.ruimteNr, t.kamers] as const));

  const resultaat = new Map<number, ToegankelijkeRuimte[]>();
  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    resultaat.set(kamer, []);
  }

  for (const entry of input.toewijzing) {
    const ruimte = ruimteBijNr.get(entry.ruimteNr);
    if (!ruimte) continue; // referentiële integriteit is al geborgd door PandInvoer-validatie
    const nKamersMetToegang = kamersPerRuimte.get(entry.ruimteNr)?.length ?? entry.kamers.length;
    for (const kamer of entry.kamers) {
      if (kamer > input.pand.aantalKamers) continue;
      resultaat.get(kamer)?.push({ ruimte, nKamersMetToegang });
    }
  }

  return resultaat;
}

/**
 * De ruwe (ongeronde) vertrek-oppervlakte van R1 — de "grondbasis" waarop R4 zijn factor
 * toepast (Toelichting-tab: "Factor op m² (R1 grondbasis)"). Apart getrokken uit R1 zelf
 * zodat beide rubrieken gegarandeerd van exact dezelfde basis uitgaan.
 */
export function vertrekOppervlakteRuw(ruimtes: ToegankelijkeRuimte[]): number {
  return ruimtes
    .filter((r) => VERTREK_TYPES.includes(r.ruimte.type))
    .reduce((som, r) => som + r.ruimte.oppervlakteM2 / r.nKamersMetToegang, 0);
}
