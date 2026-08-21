import type { KandidaatWaardering } from '@wwso/engine';
import type { MaatregelRubriek } from '@wwso/data';

export const RUBRIEK_MAATREGEL_LABELS: Record<MaatregelRubriek, string> = {
  R1: 'R1 — Oppervlakte vertrekken',
  R2: 'R2 — Oppervlakte overige ruimten',
  R3: 'R3 — Verwarming en verkoeling',
  R4: 'R4 — Energieprestatie',
  R5: 'R5 — Keuken',
  R6: 'R6 — Sanitair',
  R7: 'R7 — Woonvoorzieningen voor personen met een handicap',
  R8: 'R8 — Buitenruimten',
  R9: 'R9 — Gemeenschappelijke ruimten',
  R10: 'R10 — Parkeren',
  R11: 'R11 — WOZ-waarde',
  R12: 'R12 — Bijzondere voorzieningen',
  R13: 'R13 — Aftrekpunten',
  PROC: 'Proceskosten',
};

const RUBRIEK_VOLGORDE: MaatregelRubriek[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'PROC'];

/** Groepeert de parametervrije kandidaten per rubriek, in een vaste, voorspelbare volgorde. */
export function groepeerPerRubriek(kandidaten: readonly KandidaatWaardering[]): { rubriek: MaatregelRubriek; label: string; kandidaten: KandidaatWaardering[] }[] {
  const groepen = new Map<MaatregelRubriek, KandidaatWaardering[]>();
  for (const k of kandidaten) {
    const lijst = groepen.get(k.maatregel.rubriek) ?? [];
    lijst.push(k);
    groepen.set(k.maatregel.rubriek, lijst);
  }
  return RUBRIEK_VOLGORDE.filter((r) => groepen.has(r)).map((rubriek) => ({
    rubriek,
    label: RUBRIEK_MAATREGEL_LABELS[rubriek],
    kandidaten: groepen.get(rubriek)!,
  }));
}
