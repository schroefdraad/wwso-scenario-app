/**
 * Gegevens voor de privacyverklaring en de gebruiksvoorwaarden (open inschrijving, plan B5,
 * 2026-10-09). Waar iets nog ontbreekt staat het hier als `null`: de pagina's tonen dan zichtbaar
 * "ontbreekt nog" in plaats van een gok (CLAUDE.md regel 6).
 *
 * `CONCEPT`: de teksten zijn een concept van Claude en nog niet juridisch getoetst. Zolang dit
 * `true` is, tonen beide pagina's een melding bovenaan. Pas na toetsing op `false`.
 */
export const JURIDISCH = {
  CONCEPT: true,
  /** Datum van de laatste inhoudelijke wijziging (JJJJ-MM-DD). */
  BIJGEWERKT: '2026-10-09',
  /** Naam van de onderneming die Puntum aanbiedt, met KvK-nummer. */
  AANBIEDER: null as string | null,
  /** Adres voor vragen over privacy, inzage en het verwijderen van een account. */
  CONTACT_EMAIL: null as string | null,
} as const;

export const ONTBREEKT = '[ontbreekt nog]';
