import { describe, expect, it } from 'vitest';
import { gemeenteSuggestie } from './gemeenteSuggestie';

describe('gemeenteSuggestie (review 2026-10-09 punt 6)', () => {
  it('een eenduidige stad geeft een suggestie', () => {
    expect(gemeenteSuggestie({ stad: 'Delft', gemeente: '', openConflict: false })).toBe('Delft');
  });
  it('meerduidige of onbekende stad: geen suggestie (nooit gokken)', () => {
    expect(gemeenteSuggestie({ stad: 'Aalst', gemeente: '', openConflict: false })).toBeNull();
    expect(gemeenteSuggestie({ stad: 'Bestaatniet', gemeente: '', openConflict: false })).toBeNull();
  });
  it('de gemeente staat er al goed: niets te doen', () => {
    expect(gemeenteSuggestie({ stad: 'Delft', gemeente: 'Delft', openConflict: false })).toBeNull();
  });
  it('er staat een openstaand gemeente-conflict: een suggestie beslist dat niet stil', () => {
    expect(gemeenteSuggestie({ stad: 'Delft', gemeente: 'Rotterdam', openConflict: true })).toBeNull();
  });
});
