import { describe, expect, it } from 'vitest';
import { invoerReducer } from './reducer';
import { NIEUWE_INVOERSTATE, type InvoerState } from './types';
import type { OpgehaaldePand } from './gegevensOphalen';

const DATUM = '2026-10-09';
const gegevens = (extra: Partial<OpgehaaldePand> = {}): OpgehaaldePand => ({
  adres: 'Kleiweg 179B',
  stad: 'Rotterdam',
  gemeente: 'Rotterdam',
  bouwjaar: 1930,
  wozWaarde: 490000,
  wozPeildatum: '2025-01-01',
  wozOppervlak: 157,
  datum: DATUM,
  nietGevonden: [],
  ...extra,
});
const metPand = (p: Partial<InvoerState['pand']>): InvoerState => ({ ...NIEUWE_INVOERSTATE, pand: { ...NIEUWE_INVOERSTATE.pand, ...p } });
const ophalen = (state: InvoerState, g = gegevens(), extra: { taxatieModus?: boolean; adresLeidend?: boolean } = {}) =>
  invoerReducer(state, { soort: 'GEGEVENS_OPGEHAALD', gegevens: g, taxatieModus: false, ...extra });

describe('gegevens ophalen in de invoerstate', () => {
  it('GEGEVENS_OPGEHAALD vult de velden en onthoudt herkomst, conflicten en melding in de sessie', () => {
    const s = ophalen(metPand({ wozWaarde: '300000' }));
    expect(s.pand).toMatchObject({ bouwjaar: '1930', gemeente: 'Rotterdam', coropGebied: 'Groot-Rijnmond', wozOppervlak: '157' });
    expect(s.gegevensOphalen?.herkomst.bouwjaar?.bron).toBe('BAG');
    expect(s.gegevensOphalen?.conflicten).toHaveLength(1);
    expect(s.gegevensOphalen?.melding?.tekst).toBeTruthy();
    // Een conflict is nog NIET toegepast.
    expect(s.pand.wozWaarde).toBe('300000');
  });

  it('bepaalt wat er gevuld wordt tegen de HUIDIGE state (intussen getypt = conflict, geen overschrijving)', () => {
    // Review 2026-10-09 punt 2: geen refs in het formulier; de reducer ziet altijd de echte state.
    let s = NIEUWE_INVOERSTATE;
    s = invoerReducer(s, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'bouwjaar', waarde: '1925' });
    s = ophalen(s);
    expect(s.pand.bouwjaar).toBe('1925');
    expect(s.gegevensOphalen?.conflicten.map((c) => c.veld)).toEqual(['bouwjaar']);
  });

  it('taxatiemodus gaat mee: de WOZ-waarde wordt dan niet ingevuld', () => {
    const s = ophalen(NIEUWE_INVOERSTATE, gegevens(), { taxatieModus: true });
    expect(s.pand.wozWaarde).toBe('');
  });

  it('raakt geen andere velden aan', () => {
    const start = metPand({ aantalKamers: '4', energielabel: 'B', monument: 'Rijks' });
    expect(ophalen(start).pand).toMatchObject({ aantalKamers: '4', energielabel: 'B', monument: 'Rijks' });
  });

  it('"Gebruik" past het voorstel toe: waarde én peildatum samen', () => {
    const a = ophalen(metPand({ wozWaarde: '300000', wozPeildatum: '2024-01-01' }));
    const s = invoerReducer(a, { soort: 'GEGEVENS_CONFLICT_OPGELOST', veld: 'wozWaarde', gebruik: true });
    expect(s.pand).toMatchObject({ wozWaarde: '490000', wozPeildatum: '2025-01-01' });
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
    expect(s.gegevensOphalen?.herkomst.wozWaarde?.bron).toBe('WOZ-loket');
    expect(s.gegevensOphalen?.herkomst.wozPeildatum?.bron).toBe('WOZ-loket');
  });

  it('"Houd mijne" laat waarde én peildatum staan, zonder opgehaald-markering', () => {
    const a = ophalen(metPand({ wozWaarde: '300000', wozPeildatum: '2024-01-01' }));
    const s = invoerReducer(a, { soort: 'GEGEVENS_CONFLICT_OPGELOST', veld: 'wozWaarde', gebruik: false });
    expect(s.pand).toMatchObject({ wozWaarde: '300000', wozPeildatum: '2024-01-01' });
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
    expect(s.gegevensOphalen?.herkomst.wozWaarde).toBeUndefined();
    expect(s.gegevensOphalen?.herkomst.wozPeildatum).toBeUndefined();
  });

  it('zelf een opgehaald veld aanpassen haalt de opgehaald-markering weg', () => {
    const a = ophalen(NIEUWE_INVOERSTATE);
    const s = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'bouwjaar', waarde: '1931' });
    expect(s.pand.bouwjaar).toBe('1931');
    expect(s.gegevensOphalen?.herkomst.bouwjaar).toBeUndefined();
    expect(s.gegevensOphalen?.herkomst.gemeente).toBeDefined();
  });

  it('zelf de gemeente of het COROP-gebied wijzigen haalt de gemeente-markering weg', () => {
    const a = ophalen(NIEUWE_INVOERSTATE);
    expect(invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'gemeente', waarde: 'Delft' }).gegevensOphalen?.herkomst.gemeente).toBeUndefined();
    expect(invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'coropGebied', waarde: 'X' }).gegevensOphalen?.herkomst.gemeente).toBeUndefined();
  });

  it('zelf typen in een veld met een openstaand conflict beslist het conflict (de eigen invoer wint)', () => {
    const a = ophalen(metPand({ wozWaarde: '300000' }));
    const s = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'wozWaarde', waarde: '310000' });
    expect(s.gegevensOphalen?.conflicten).toEqual([]);
  });

  it('zelf de peildatum wijzigen beslist ook het gekoppelde WOZ-conflict', () => {
    const a = ophalen(metPand({ wozWaarde: '300000' }));
    const s = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'wozPeildatum', waarde: '2023-01-01' });
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

  it('alles wissen wist ook de herkomst', () => {
    expect(invoerReducer(ophalen(NIEUWE_INVOERSTATE), { soort: 'ALLES_GEWIST' }).gegevensOphalen).toBeUndefined();
  });
});

describe('review 2026-10-09 punt 4: een nieuwe ophaalactie vervangt de herkomst', () => {
  it('✓ van een vorig adres blijft niet staan voor velden die nu niet (meer) uit de actie komen', () => {
    const a = ophalen(NIEUWE_INVOERSTATE);
    expect(a.gegevensOphalen?.herkomst.bouwjaar).toBeDefined();
    // Ander adres: nu geen bouwjaar en geen oppervlak gevonden. De oude waarden staan nog in het formulier.
    const b = ophalen(a, gegevens({ adres: 'Dorpsstraat 1', bouwjaar: null, wozOppervlak: null, nietGevonden: [{ veld: 'bouwjaar', reden: 'x' }, { veld: 'wozOppervlak', reden: 'x' }] }), { adresLeidend: true });
    expect(b.gegevensOphalen?.herkomst.bouwjaar).toBeUndefined();
    expect(b.gegevensOphalen?.herkomst.wozOppervlak).toBeUndefined();
    expect(b.gegevensOphalen?.herkomst.gemeente).toBeDefined();
  });

  it('een nieuwe ronde vervangt ook conflicten en melding van de vorige', () => {
    const a = ophalen(metPand({ wozWaarde: '300000' }));
    const b = ophalen({ ...a, pand: { ...a.pand, wozWaarde: '' } });
    expect(b.gegevensOphalen?.conflicten).toEqual([]);
  });
});

describe('review 2026-10-09 punt 6: een blur zonder wijziging wist niets', () => {
  it('een veld "wijzigen" naar dezelfde waarde laat ✓ en conflicten staan', () => {
    const a = ophalen(metPand({ wozWaarde: '300000' }));
    expect(a.gegevensOphalen?.conflicten).toHaveLength(1);
    const s1 = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'wozWaarde', waarde: '300000' });
    expect(s1.gegevensOphalen?.conflicten).toHaveLength(1);
    const s2 = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'gemeente', waarde: a.pand.gemeente });
    expect(s2.gegevensOphalen?.herkomst.gemeente).toBeDefined();
    const s3 = invoerReducer(s2, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'coropGebied', waarde: a.pand.coropGebied });
    expect(s3.gegevensOphalen?.herkomst.gemeente).toBeDefined();
  });

  it('een open gemeente-conflict blijft staan na een stad-blur met dezelfde gemeentesuggestie', () => {
    const a = ophalen(metPand({ gemeente: 'Delft', coropGebied: 'Delft en Westland' }));
    expect(a.gegevensOphalen?.conflicten.map((c) => c.veld)).toContain('gemeente');
    const s = invoerReducer(a, { soort: 'PAND_VELD_GEWIJZIGD', veld: 'gemeente', waarde: 'Delft' });
    expect(s.gegevensOphalen?.conflicten.map((c) => c.veld)).toContain('gemeente');
  });
});

describe('review 2026-10-09 punt 7: expliciet gekozen adres', () => {
  it('na een keuze (adresLeidend) staan adres en stad van het gekozen object in het formulier', () => {
    const s = ophalen(metPand({ adres: 'Kleiweg 179', stad: 'Rotterdam' }), gegevens(), { adresLeidend: true });
    expect(s.pand.adres).toBe('Kleiweg 179B');
    expect(s.gegevensOphalen?.conflicten.find((c) => c.veld === 'adres')).toBeUndefined();
  });
});
