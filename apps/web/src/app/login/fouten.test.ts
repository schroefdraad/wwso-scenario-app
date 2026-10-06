import { describe, expect, it } from 'vitest';
import { LOGIN_OPTIES, leesLoginFout } from './fouten';

// Regressietest (2026-10-06, rollentest): een onbekend e-mailadres kreeg een "Confirm signup"-mail
// en een account, terwijl het niet op de allowlist staat.
describe('inloggen met magic link', () => {
  it('maakt geen nieuwe accounts aan', () => {
    expect(LOGIN_OPTIES.shouldCreateUser).toBe(false);
  });

  it('onbekend adres krijgt een begrijpelijke melding', () => {
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

  it('overige fouten algemeen, zonder technische tekst', () => {
    const melding = leesLoginFout({
      code: 'unexpected_failure',
      message: 'Database error saving new user',
    });
    expect(melding).not.toMatch(/Database/);
  });
});
