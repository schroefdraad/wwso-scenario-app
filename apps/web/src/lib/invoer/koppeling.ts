/**
 * Randgeval uit de staat-navigatie-audit (2026-10-03): na de eerste keer "Woning opslaan" van een
 * nieuwe woning stond de woning niet in de URL — een refresh gaf dan een leeg formulier (het
 * concept is na koppeling bewust gewist, zie `isLosConcept`), terwijl de woning wél opgeslagen
 * was. Daarom zet het invoerscherm na zo'n eerste opslag `?deal=<id>` in de URL.
 *
 * Maar die URL-wissel mag de net opgeslagen woning niet opnieuw uit Supabase laden: dat zou het
 * formulier opnieuw opbouwen (open zijpaneel dicht, scroll weg) terwijl de state al gelijk is aan
 * wat er net is opgeslagen. Deze markering zegt tegen `/woning/nieuw`: "deze `?deal=` heb ik
 * zelf net gezet, niet opnieuw laden". Bewust module-state, geen sessionStorage: na een échte
 * refresh is hij weg en wordt de woning wél gewoon uit de database geladen.
 */
let zojuistGekoppeld: string | null = null;

export function markeerZojuistGekoppeld(dealId: string): void {
  zojuistGekoppeld = dealId;
}

/** `true` als deze `?deal=` net door het invoerscherm zelf gezet is — en wist de markering. */
export function isZojuistGekoppeld(dealId: string | null): boolean {
  if (!dealId || dealId !== zojuistGekoppeld) return false;
  zojuistGekoppeld = null;
  return true;
}
