import { gemeentesVoorWoonplaats } from '@wwso/data';

/**
 * De gemeente die het formulier bij het verlaten van het stad-veld mag voorstellen, of `null`.
 * Alleen bij een EENDUIDIGE match (harde regel 6: nooit gokken); niets als de gemeente al klopt
 * (dan is er niets te wijzigen en blijven opgehaald-markering en conflicten ongemoeid), en niets
 * zolang er een openstaand "Gegevens ophalen"-conflict op de gemeente is: de gebruiker beslist
 * dat zelf met "Gebruik" / "Houd mijne".
 */
export function gemeenteSuggestie(inv: { stad: string; gemeente: string; openConflict: boolean }): string | null {
  if (inv.openConflict) return null;
  const kandidaten = gemeentesVoorWoonplaats(inv.stad);
  if (kandidaten.length !== 1) return null;
  return kandidaten[0] === inv.gemeente ? null : kandidaten[0];
}
