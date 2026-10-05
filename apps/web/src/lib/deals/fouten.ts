/**
 * Zet een databasefout om naar een melding die de gebruiker kan lezen (audit 2026-10-05). Supabase
 * geeft de ruwe Postgres-tekst mee; die hoort niet in de UI. De technische tekst blijft beschikbaar
 * via `cause` op de Error, voor de console en Sentry.
 *
 * `42501` = RLS-weigering (insufficient_privilege): de gebruiker mag deze woning niet wijzigen of
 * verwijderen. Zie `magDealBewerken` in `types.ts` voor de UI-kant.
 */
export function leesOpslagFout(code: string | undefined): string {
  if (code === '42501') {
    return 'Je hebt geen bewerkrechten op deze woning. Maak een eigen kopie om wijzigingen op te slaan.';
  }
  return 'Opslaan is mislukt. Probeer het opnieuw; lukt het niet, meld het dan via de feedbackknop.';
}
