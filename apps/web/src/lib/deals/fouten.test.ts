import { describe, expect, it } from 'vitest';
import { leesOpslagFout } from './fouten';

// Regressietest (audit 2026-10-05): Supabase gaf bij een geweigerde schrijfactie de ruwe
// RLS-tekst ("new row violates row-level security policy ...") door aan de gebruiker. Een
// tester zonder bewerkrechten moet een begrijpelijke melding krijgen, geen databasetaal.
describe('leesOpslagFout', () => {
  it('vertaalt RLS-weigering (42501) naar een begrijpelijke melding', () => {
    const melding = leesOpslagFout('42501');
    expect(melding).toBe(
      'Je hebt geen bewerkrechten op deze woning. Maak een eigen kopie om wijzigingen op te slaan.',
    );
    expect(melding).not.toMatch(/row-level|policy|table/);
  });

  it('valt terug op een algemene melding bij onbekende fouten, zonder ruwe databasetekst', () => {
    const melding = leesOpslagFout('23505');
    expect(melding).toBe(
      'Opslaan is mislukt. Probeer het opnieuw; lukt het niet, meld het dan via de feedbackknop.',
    );
    expect(melding).not.toMatch(/constraint|duplicate/);
  });

  it('behandelt een fout zonder code (bijv. netwerk) ook algemeen', () => {
    expect(leesOpslagFout(undefined)).toBe(
      'Opslaan is mislukt. Probeer het opnieuw; lukt het niet, meld het dan via de feedbackknop.',
    );
  });
});
