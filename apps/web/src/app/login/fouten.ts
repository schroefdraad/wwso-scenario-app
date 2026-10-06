/**
 * Magic link alleen voor bestaande accounts (2026-10-06, rollentest): zonder deze optie maakte
 * Supabase voor elk onbekend adres een account aan en stuurde een "Confirm signup"-mail via
 * `puntum.nl`. Nieuwe testers worden uitgenodigd via Supabase → Authentication → Users →
 * "Invite user", naast hun rij in `allowed_emails`.
 *
 * Dit is de nette kant voor de gebruiker; de echte blokkade is "Allow new users to sign up" uit
 * in het Supabase-dashboard (iemand kan de API ook rechtstreeks aanroepen).
 */
export const LOGIN_OPTIES = { shouldCreateUser: false } as const;

/** Zet een Supabase-authfout om naar een melding in gewone taal. */
export function leesLoginFout(error: { code?: string; message: string }): string {
  if (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message)) {
    return 'Dit e-mailadres heeft (nog) geen toegang tot Puntum. Neem contact op met de beheerder als je denkt dat dit niet klopt.';
  }
  if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
    return 'Er zijn net te veel inloglinks verstuurd. Even wachten en het dan opnieuw proberen.';
  }
  return 'Versturen van de inloglink is mislukt. Probeer het opnieuw.';
}
