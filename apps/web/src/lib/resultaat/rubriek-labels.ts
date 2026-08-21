import type { RubriekPunten } from '@wwso/engine';

export const RUBRIEK_LABELS: Record<keyof RubriekPunten, string> = {
  r1: 'R1 — Oppervlakte vertrekken',
  r2: 'R2 — Oppervlakte overige ruimten',
  r3: 'R3 — Verwarming en verkoeling',
  r4: 'R4 — Energieprestatie',
  r5: 'R5 — Keuken',
  r6: 'R6 — Sanitair',
  r7: 'R7 — Woonvoorzieningen voor personen met een handicap',
  r8: 'R8 — Buitenruimten',
  r9: 'R9 — Gemeenschappelijke ruimten',
  r10: 'R10 — Parkeren',
  r11: 'R11 — WOZ-waarde',
  r12: 'R12 — Bijzondere voorzieningen',
  r13: 'R13 — Aftrekpunten',
};

export const RUBRIEK_VOLGORDE: (keyof RubriekPunten)[] = [
  'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13',
];
