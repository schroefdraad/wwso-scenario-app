/** Resultaat van één rubriek: punten per kamer plus een mensleesbare toelichting per regel. */
export interface RubriekResultaat {
  /** Punten per kamernummer (1..aantalKamers), afgerond op kwartpunten volgens §2.1.6. */
  perKamer: Record<number, number>;
  /**
   * Dezelfde punten vóór de kwartpuntsafronding. Nodig omdat afronding pas per rubriek
   * plaatsvindt: de suggestie-engine (taak 11) moet kunnen zien hoe dicht een kamer bij de
   * volgende kwartpuntsgrens zit, anders lijkt een maatregel van 0,2 punt altijd waardeloos.
   */
  perKamerRuw: Record<number, number>;
  /** Toelichtingsregels, herleidbaar naar de rubriek en paragraaf uit het beleidsboek. */
  toelichting: string[];
}
