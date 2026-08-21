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
  /**
   * Dezelfde rubriekpunten vóór de kwartpuntsafronding (`RubriekResultaat.perKamerRuw`,
   * al aanwezig sinds taak 4). Puur additief, geen gedragswijziging — nodig voor de
   * suggestie-engine (taak 11) om te zien hoe dicht een kamer bij de volgende
   * kwartpuntsgrens zit.
   */
  rubriekenRuw: RubriekPunten;
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

/**
 * Toelichtingsregels per rubriek, zoals teruggegeven door de eigen `berekenRn`-functie
 * (`RubriekResultaat.toelichting`). De granulariteit verschilt per rubriek — sommige rubrieken
 * (R1, R2, R3, R4, R8, R13) schrijven één regel per kamer ("R1 kamer 4: ..."), andere (R5, R6,
 * R7, R9, R10, R12) één regel per voorziening/ruimte ("R5 keuken (ruimte 7): ..."), gedeeld door
 * de kamers die er toegang toe hebben. Een consument die dit per kamer wil tonen (taak 13) moet
 * zelf filteren op "kamer {n}" resp. "ruimte {r}" voor de ruimtes waar die kamer toegang toe
 * heeft — deze structuur bewaart de regels ongewijzigd, ze worden hier niet voorverdeeld.
 */
export type RubriekToelichting = Record<keyof RubriekPunten, string[]>;

export interface EindtellingResultaat {
  perKamer: Record<number, EindtellingKamer>;
  toelichting: string[];
  /** Puur additief (taak 13): de ongewijzigde toelichting van elke rubriek, voor uitklapbare weergave per kamer. */
  rubriekToelichting: RubriekToelichting;
}
