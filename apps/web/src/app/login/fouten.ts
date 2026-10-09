/**
 * Opties voor `signInWithOtp` (open inschrijving, besluit 2026-10-09, plan B5).
 *
 * - `shouldCreateUser: true`: een nieuw adres krijgt een account. De database-trigger uit
 *   `supabase/migrations/0008_open_inschrijving.sql` maakt daar meteen een eigen org bij.
 *   (Tot 2026-10-09 stond dit op false: alleen uitgenodigde adressen.)
 * - Bewust GEEN toestemming nieuwsbrief in `data`: Supabase maakt het account al aan vóórdat iemand
 *   op de link klikt, dus dan kon iedereen voor andermans adres toestemming geven (review
 *   2026-10-09). Het vinkje gaat via `callbackUrl` mee en wordt pas na het klikken vastgelegd.
 * - `captchaToken`: Cloudflare Turnstile, alleen als de widget aan staat (zie `Captcha.tsx`).
 */
export function loginOpties(invoer: { redirectTo: string; captchaToken?: string }) {
  return {
    emailRedirectTo: invoer.redirectTo,
    shouldCreateUser: true,
    ...(invoer.captchaToken ? { captchaToken: invoer.captchaToken } : {}),
  };
}

/**
 * De link in de mail. Met `nieuwsbrief=1` legt `/auth/callback` de toestemming vast zodra de
 * gebruiker met een geldige sessie terugkomt (ook voor een bestaand account).
 */
export function callbackUrl(origin: string, volgende: string, nieuwsbrief: boolean): string {
  const params = new URLSearchParams({ volgende });
  if (nieuwsbrief) params.set('nieuwsbrief', '1');
  return `${origin}/auth/callback?${params.toString()}`;
}

/** Zet een Supabase-authfout om naar een melding in gewone taal. */
export function leesLoginFout(error: { code?: string; message: string }): string {
  // Vangnet: alleen als "Allow new users to sign up" in Supabase (nog) uit staat.
  if (error.code === 'otp_disabled' || /signups not allowed/i.test(error.message)) {
    return 'Dit e-mailadres heeft (nog) geen toegang tot Puntum. Neem contact op met de beheerder als je denkt dat dit niet klopt.';
  }
  if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
    return 'Er zijn net te veel inloglinks verstuurd. Even wachten en het dan opnieuw proberen.';
  }
  if (error.code === 'captcha_failed' || /captcha/i.test(error.message)) {
    return 'De controle of je geen robot bent is mislukt of verlopen. Probeer het opnieuw.';
  }
  return 'Versturen van de inloglink is mislukt. Probeer het opnieuw.';
}
