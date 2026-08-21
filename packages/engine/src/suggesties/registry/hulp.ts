import type { PandInvoer } from '../../types/index';
import { kamersPerRuimte, ruimtesPerKamer } from '../../rubrieken/gedeeld';
import type { MaatregelContext } from '../types';

/** Genereert een `nietBeoordeeldReden`-functie die altijd dezelfde reden geeft zolang er geen parameter is meegegeven. */
export function vereistParameter(reden: string) {
  return (_ctx: MaatregelContext, parameters: unknown): string | undefined =>
    parameters === undefined ? reden : undefined;
}

/** Eerstvolgende vrije ruimtenummer (1-40); `undefined` als het pand al vol zit. */
export function volgendeVrijeRuimteNr(pand: PandInvoer): number | undefined {
  const bezet = new Set(pand.ruimtes.map((r) => r.nr));
  for (let nr = 1; nr <= 40; nr++) {
    if (!bezet.has(nr)) return nr;
  }
  return undefined;
}

/** Eerstvolgende vrije kamernummer (1-12); `undefined` als het pand al 12 kamers heeft. */
export function volgendeVrijeKamerNr(pand: PandInvoer): number | undefined {
  return pand.pand.aantalKamers < 12 ? pand.pand.aantalKamers + 1 : undefined;
}

/** Kamers met toegang tot een ruimte, of een lege lijst als de ruimte geen toewijzing heeft. */
export function kamersMetToegangTot(pand: PandInvoer, ruimteNr: number): number[] {
  return kamersPerRuimte(pand).get(ruimteNr) ?? [];
}

/** Ruimtes toegankelijk vanuit een kamer, met het aantal kamers dat elke ruimte deelt. */
export function ruimtesVanuitKamer(pand: PandInvoer, kamer: number) {
  return ruimtesPerKamer(pand).get(kamer) ?? [];
}
