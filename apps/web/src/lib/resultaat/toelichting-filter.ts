import type { PandInvoer } from '@wwso/engine';

/**
 * Trekt de getallen die direct na het label "kamer"/"kamers" of "ruimte"/"ruimtes" in een
 * toelichtingsregel staan (bijv. "kamer 4:" → [4], "(kamer 1, 2, 3)" → [1,2,3], "ruimte 7):" →
 * [7]). Een getal dat VÓÓR het label staat ("6 kamers") wordt bewust niet gepakt — dat is een
 * aantal, geen scoping-verwijzing. Geverifieerd tegen alle daadwerkelijke toelichtingsformaten
 * in `packages/engine/src/rubrieken/*.ts` (r1 t/m r13) — zie `outputs/RAPPORT_taak13_2026-08-20.md`.
 */
function nummersNaLabel(regel: string, label: 'kamer' | 'ruimte'): number[] {
  const match = regel.match(new RegExp(`\\b${label}s?\\b[^\\d]{0,3}(\\d(?:[\\d,\\s]*\\d)?)`, 'i'));
  if (!match) return [];
  return match[1]
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Filtert de toelichtingsregels van één rubriek tot de regels die relevant zijn voor een
 * specifieke kamer. Werkt generiek over alle 13 rubrieken, zonder per rubriek een apart
 * tekstformaat te hoeven kennen:
 * - een regel die geen "kamer N" en geen "ruimte N" noemt, is een pandbrede/generieke regel
 *   (bijv. "R11: ..." of "R9: zorgwoning → ...") en geldt voor iedereen;
 * - een regel die "kamer N" noemt, geldt voor die kamer/kamers (R1-R4, R7-R9, R12, R13);
 * - een regel die "ruimte N" noemt, geldt voor elke kamer die toegang heeft tot die ruimte
 *   (R5, R6, R10).
 */
export function filterToelichtingVoorKamer(
  regels: readonly string[],
  kamer: number,
  toegankelijkeRuimteNrs: ReadonlySet<number>,
): string[] {
  return regels.filter((regel) => {
    const kamerNummers = nummersNaLabel(regel, 'kamer');
    const ruimteNummers = nummersNaLabel(regel, 'ruimte');
    if (kamerNummers.length === 0 && ruimteNummers.length === 0) return true;
    if (kamerNummers.includes(kamer)) return true;
    return ruimteNummers.some((r) => toegankelijkeRuimteNrs.has(r));
  });
}

/** De ruimtes waar een kamer toegang toe heeft, volgens de toewijzing. */
export function toegankelijkeRuimteNrsVoorKamer(pand: PandInvoer, kamer: number): Set<number> {
  return new Set(pand.toewijzing.filter((t) => t.kamers.includes(kamer)).map((t) => t.ruimteNr));
}
