/** Resultaat van één rubriek: punten per kamer plus een mensleesbare toelichting per regel. */
export interface RubriekResultaat {
  /** Punten per kamernummer (1..aantalKamers). Kamers zonder bijdrage staan niet in de map. */
  perKamer: Record<number, number>;
  /** Toelichtingsregels, herleidbaar naar de rubriek en paragraaf uit het beleidsboek. */
  toelichting: string[];
}
