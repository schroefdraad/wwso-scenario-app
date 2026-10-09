import { describe, expect, it } from 'vitest';
import { callbackUrl, leesLoginFout, loginOpties } from './fouten';

const REDIRECT = 'https://app.puntum.nl/auth/callback?volgende=%2Fwoningen';

// Open inschrijving (besluit 2026-10-09, plan B5). Vervangt de regressietest van 2026-10-06
// ("maakt geen nieuwe accounts aan"): die gold zolang alleen uitgenodigde adressen toegang hadden.
describe('inloggen of account maken met magic link', () => {
  it('maakt voor een nieuw adres een account aan', () => {
    expect(loginOpties({ redirectTo: REDIRECT }).shouldCreateUser).toBe(true);
  });

  it('stuurt de redirect mee', () => {
    expect(loginOpties({ redirectTo: REDIRECT }).emailRedirectTo).toBe(
      REDIRECT,
    );
  });

  it('stuurt nooit toestemming mee bij het aanmaken van het account (review 2026-10-09: dan kon iedereen voor andermans adres toestemming geven)', () => {
    expect('data' in loginOpties({ redirectTo: REDIRECT, nieuwsbrief: true } as never)).toBe(false);
  });

  it('vinkje gaat via de callback-URL, zodat toestemming pas na klikken op de link wordt vastgelegd', () => {
    expect(callbackUrl('https://app.puntum.nl', '/woningen', true)).toBe('https://app.puntum.nl/auth/callback?volgende=%2Fwoningen&nieuwsbrief=1');
    expect(callbackUrl('https://app.puntum.nl', '/woningen', false)).toBe('https://app.puntum.nl/auth/callback?volgende=%2Fwoningen');
  });

  it('captcha-token gaat alleen mee als er een is', () => {
    expect(loginOpties({ redirectTo: REDIRECT }).captchaToken).toBeUndefined();
    expect(
      loginOpties({ redirectTo: REDIRECT, captchaToken: 'tok' }).captchaToken,
    ).toBe('tok');
  });
});

describe('foutmeldingen bij inloggen', () => {
  it('inschrijven staat (nog) uit: begrijpelijke melding', () => {
    const melding = leesLoginFout({ code: 'otp_disabled', message: 'Signups not allowed for otp' });
    expect(melding).toMatch(/geen toegang/);
    expect(melding).not.toMatch(/otp|Signups/i);
  });

  it('herkent ook de melding zonder code', () => {
    expect(leesLoginFout({ message: 'Signups not allowed for otp' })).toMatch(/geen toegang/);
  });

  it('te veel pogingen', () => {
    expect(
      leesLoginFout({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' }),
    ).toMatch(/even wachten/i);
  });

  it('captcha mislukt: vraag om opnieuw te proberen, zonder technische tekst', () => {
    const melding = leesLoginFout({
      code: 'captcha_failed',
      message: 'captcha protection: request disallowed (timeout-or-duplicate)',
    });
    expect(melding).toMatch(/controle/i);
    expect(melding).not.toMatch(/captcha protection|timeout/i);
  });

  it('overige fouten algemeen, zonder technische tekst', () => {
    const melding = leesLoginFout({
      code: 'unexpected_failure',
      message: 'Database error saving new user',
    });
    expect(melding).not.toMatch(/Database/);
  });
});
