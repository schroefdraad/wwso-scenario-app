/**
 * Opties voor `signInWithOtp` (open inschrijving, besluit 2026-10-09, plan B5).
 *
 * - `shouldCreateUser: true`: een nieuw adres krijgt een account. De database-trigger uit
 *   `supabase/migrations/0008_open_inschrijving.sql` maakt daar meteen een eigen org bij.
 *   (Tot 2026-10-09 stond dit op false: alleen uitgenodigde adressen.)
 * - `data.nieuwsbrief`: alleen mee als het vakje is aangevinkt (CLAUDE.md regel 8: nieuwsbrief alleen
 *   met vooraf gegeven toestemming). De trigger legt het moment vast. Supabase bewaart `data` alleen
 *   bij het aanmaken van een account; bij een bestaand account doet het niets.
 * - `captchaToken`: Cloudflare Turnstile, alleen als de widget aan staat (zie `Captcha.tsx`).
 */
export function loginOpties(invoer: {
  redirectTo: string;
  nieuwsbrief: boolean;
  captchaToken?: string;
}) {
  return {
    emailRedirectTo: invoer.redirectTo,
    shouldCreateUser: true,
    ...(invoer.nieuwsbrief ? { data: { nieuwsbrief: true } } : {}),
    ...(invoer.captchaToken ? { captchaToken: invoer.captchaToken } : {}),
  };
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
