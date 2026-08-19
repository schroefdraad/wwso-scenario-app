/** Kwartpunt-afgeronde punten per rubriek voor één kamer — de bouwstenen van de eindtelling. */
export interface RubriekPunten {
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  r5: number;
  r6: number;
  r7: number;
  r8: number;
  r9: number;
  r10: number;
  r11: number;
  r12: number;
  r13: number;
}

/** Volledige eindtelling voor één kamer: van rubriekpunten tot maximale huurprijs. */
export interface EindtellingKamer {
  rubrieken: RubriekPunten;
  /** Som van R1 t/m R11, vóór een eventuele zorgwoning-opslag (§2.1.7). */
  subtotaalR1TotEnMet11: number;
  /** Punten die de zorgwoning-opslag van +35% toevoegt aan `subtotaalR1TotEnMet11`; 0 zonder zorgwoning. */
  zorgwoningOpslagPunten: number;
  /** subtotaalR1TotEnMet11 (incl. zorgwoning) + R12 + R13, vóór de eindsaldering op hele punten. */
  totaalVoorEindsaldering: number;
  /** Eindsaldering op hele punten (§2.1.7), vóór de eventuele Rijksmonumentpunten. */
  totaalPunten: number;
  /** +10 bij een Rijksmonument met een huurovereenkomst van vóór 1 juli 2024 (§2.14.3), anders 0. */
  monumentPunten: number;
  /** Punten die de huurprijstabel ingaan: totaalPunten + monumentPunten. */
  puntenVoorHuurprijs: number;
  maxHuurExclOpslagEuro: number;
  opslagPercentage: number;
  opslagGrondslag: string;
  /** Definitieve maximale huurprijs, inclusief monumentopslag. */
  maxHuurEuro: number;
}

export interface EindtellingResultaat {
  perKamer: Record<number, EindtellingKamer>;
  toelichting: string[];
}
