import { describe, expect, it } from 'vitest';
import { invoerReducer } from './reducer';
import { NIEUWE_INVOERSTATE, type InvoerState } from './types';
import type { Toepassing } from './gegevensOphalen';

const toepassing = (extra: Partial<Toepassing> = {}): Toepassing => ({
  patch: { bouwjaar: '1930', gemeente: 'Rotterdam', coropGebied: 'Groot-Rijnmond' },
  herkomst: { bouwjaar: { bron: 'BAG', datum: '2026-10-09' }, gemeente: { bron: 'BAG', datum: '2026-10-09' } },
  conflicten: [],
  melding: { soort: 'ok', tekst: '2 velden opgehaald' },
  ...extra,
});

const conflict = {
  veld: 'wozWaarde' as const,
  huidig: '300000',
  opgehaaldTekst: '€ 490.000',
  patch: { wozWaarde: '490000' },
  herkomst: { bron: 'WOZ-loket' as const, datum: '2026-10-09' },
};

describe('gegevens ophalen in de invoerstate', () => {
  it('GEGEVENS_OPGEHAALD vult de velden en onthoudt herkomst, conflicten en melding in de sessie', () => {
    const s = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing({ conflicten: [conflict] }) });
    expect(s.pand).toMatchObject({ bouwjaar: '1930', gemeente: 'Rotterdam', coropGebied: 'Groot-Rijnmond' });
    expect(s.gegevensOphalen?.herkomst.bouwjaar?.bron).toBe('BAG');
    expect(s.gegevensOphalen?.conflicten).toHaveLength(1);
    expect(s.gegevensOphalen?.melding?.tekst).toBe('2 velden opgehaald');
    // Een conflict is nog NIET toegepast.
    expect(s.pand.wozWaarde).toBe('');
  });

  it('raakt geen andere velden aan', () => {
    const start: InvoerState = { ...NIEUWE_INVOERSTATE, pand: { ...NIEUWE_INVOERSTATE.pand, aantalKamers: '4', energielabel: 'B', monument: 'Rijks' } };
    const s = invoerReducer(start, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing() });
    expect(s.pand).toMatchObject({ aantalKamers: '4', energielabel: 'B', monument: 'Rijks' });
  });

  it('"Gebruik" past het opgehaalde voorstel toe en haalt het conflict weg', () => {
    const a = invoerReducer({ ...NIEUWE_INVOERSTATE, pand: { ...NIEUWE_INVOERSTATE.pand, wozWaarde: '300000' } }, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing({ conflicten: [conflict] }) });
    const s = invoerReducer(a, { soort: 'GEGEVENS_CONFLICT_OPGELOST', veld: 'wozWaarde', gebruik: true });
    expect(s.pand.wozWaarde).toBe('490000');
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
    expect(s.gegevensOphalen?.herkomst.wozWaarde?.bron).toBe('WOZ-loket');
  });

  it('"Houd mijne" laat de eigen waarde staan, zonder opgehaald-markering', () => {
    const a = invoerReducer({ ...NIEUWE_INVOERSTATE, pand: { ...NIEUWE_INVOERSTATE.pand, wozWaarde: '300000' } }, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing({ conflicten: [conflict] }) });
    const s = invoerReducer(a, { soort: 'GEGEVENS_CONFLICT_OPGELOST', veld: 'wozWaarde', gebruik: false });
    expect(s.pand.wozWaarde).toBe('300000');
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
    expect(s.gegevensOphalen?.herkomst.wozWaarde).toBeUndefined();
  });

  it('zelf een opgehaald veld aanpassen haalt de opgehaald-markering weg', () => {
    const a = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing() });
    const s = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'bouwjaar', waarde: '1931' });
    expect(s.pand.bouwjaar).toBe('1931');
    expect(s.gegevensOphalen?.herkomst.bouwjaar).toBeUndefined();
    expect(s.gegevensOphalen?.herkomst.gemeente).toBeDefined();
  });

  it('zelf de gemeente of het COROP-gebied wijzigen haalt de gemeente-markering weg', () => {
    const a = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing() });
    expect(invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'gemeente', waarde: 'Delft' }).gegevensOphalen?.herkomst.gemeente).toBeUndefined();
    expect(invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'coropGebied', waarde: 'X' }).gegevensOphalen?.herkomst.gemeente).toBeUndefined();
  });

  it('zelf typen in een veld met een openstaand conflict beslist het conflict (de eigen invoer wint)', () => {
    const a = invoerReducer({ ...NIEUWE_INVOERSTATE, pand: { ...NIEUWE_INVOERSTATE.pand, wozWaarde: '300000' } }, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing({ conflicten: [conflict] }) });
    const s = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'wozWaarde', waarde: '310000' });
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
  });

  it('een wijziging zonder ophaalgeschiedenis maakt geen gegevensOphalen-state aan', () => {
    const s = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'bouwjaar', waarde: '1900' });
    expect(s.gegevensOphalen).toBeUndefined();
  });

  it('GEGEVENS_MELDING_GEZET: een melding zetten of sluiten', () => {
    const a = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'GEGEVENS_MELDING_GEZET', melding: { soort: 'let', tekst: 'Niet gevonden' } });
    expect(a.gegevensOphalen?.melding?.tekst).toBe('Niet gevonden');
    expect(invoerReducer(a, { soort: 'GEGEVENS_MELDING_GEZET', melding: null }).gegevensOphalen?.melding).toBeNull();
  });

  it('een nieuwe ophaalronde vervangt conflicten en melding van de vorige, en behoudt oudere herkomst', () => {
    const a = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing({ conflicten: [conflict] }) });
    const s = invoerReducer(a, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing({ patch: {}, herkomst: {}, melding: { soort: 'let', tekst: 'niets' } }) });
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
    expect(s.gegevensOphalen?.herkomst.bouwjaar).toBeDefined();
    expect(s.gegevensOphalen?.melding?.tekst).toBe('niets');
  });

  it('alles wissen wist ook de herkomst', () => {
    const a = invoerReducer(NIEUWE_INVOERSTATE, { soort: 'GEGEVENS_OPGEHAALD', toepassing: toepassing() });
    expect(invoerReducer(a, { soort: 'ALLES_GEWIST' }).gegevensOphalen).toBeUndefined();
  });
});
