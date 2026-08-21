import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenR1, berekenR3, berekenR4, berekenR5, berekenR6, berekenR8, berekenR11 } from '../rubrieken/index';
import { berekenEindtelling } from './eindtelling';
import { kleiweg179bKamer2 } from '../fixtures/golden-master/kleiweg-179b-kamer2';
import { kleiweg179bKamer3 } from '../fixtures/golden-master/kleiweg-179b-kamer3';
import { kleiweg179bKamer6 } from '../fixtures/golden-master/kleiweg-179b-kamer6';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = '2026-01-01';

/**
 * Golden-master validatie (taak 8) tegen drie officiële "Resultaat Huurprijscheck"-
 * exports van de Huurcommissie voor Kleiweg 179-B, Rotterdam (`resources/golden-master/`).
 *
 * Elke rubriek is onafhankelijk geverifieerd tegen de "Details van de puntentelling"-tabel
 * op het brondocument, tot op de losse regel per ruimte. Alle getoetste rubrieken én de drie
 * eindtotalen matchen exact — sterk bewijs dat de rekenregels (m²-afronding, dubbele deling,
 * kwartpuntsafronding, WOZ-drempels, capping bij keuken/sanitair) correct zijn.
 *
 * Twee dingen zijn hiervoor aangepast, beide gedocumenteerd in
 * `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`:
 * 1. R4 rekent nu op de ongeronde privé+gedeeld-oppervlakte in plaats van op de afgeronde
 *    R1-grondslag (§2.4.4 tegenover §2.2.1.1) — dat was 3/3 keer 0,25 punt mis.
 * 2. De kamer 6-fixture is op zijn éígen brondocument gezet in plaats van het sanitair van
 *    kamer 2 te hergebruiken; die drie exports zijn met verschillende aannames ingevuld.
 */
describe.each([
  { naam: 'kamer 2 (16 m², label A++)', input: kleiweg179bKamer2, r1: 21, r3: 3.75, r4: 18, r5: 3.75, r6: 6.25, r8: 3.75, r11: 10, totaal: 67 },
  { naam: 'kamer 3 (21,6 m², label A++)', input: kleiweg179bKamer3, r1: 27, r3: 3.75, r4: 22.75, r5: 3.75, r6: 6.25, r8: 0, r11: 10, totaal: 74 },
  { naam: 'kamer 6 (11,3 m², label A+++)', input: kleiweg179bKamer6, r1: 16, r3: 3.75, r4: 15.5, r5: 3.75, r6: 6.5, r8: 0, r11: 10, totaal: 56 },
])('Golden master — Kleiweg 179-B, $naam', ({ input, r1, r3, r4, r5, r6, r8, r11, totaal }) => {
  it(`R1 (vertrekken) = ${r1}`, () => {
    expect(berekenR1(input).perKamer[1]).toBe(r1);
  });
  it(`R4 (energieprestatie) = ${r4}`, () => {
    expect(berekenR4(input, tarievenset, peildatum).perKamer[1]).toBe(r4);
  });
  it(`eindtotaal = ${totaal} punten`, () => {
    expect(berekenEindtelling(input, tarievenset, peildatum).perKamer[1].totaalPunten).toBe(totaal);
  });
  it(`R3 (verwarming) = ${r3}`, () => {
    expect(berekenR3(input).perKamer[1]).toBe(r3);
  });
  it(`R5 (keuken) = ${r5}`, () => {
    expect(berekenR5(input, tarievenset).perKamer[1]).toBe(r5);
  });
  it(`R6 (sanitair) = ${r6}`, () => {
    expect(berekenR6(input, tarievenset).perKamer[1]).toBe(r6);
  });
  it(`R8 (buitenruimte) = ${r8}`, () => {
    expect(berekenR8(input, tarievenset).perKamer[1]).toBe(r8);
  });
  it(`R11 (WOZ) = ${r11}`, () => {
    expect(berekenR11(input, tarievenset).perKamer[1]).toBe(r11);
  });
});

/**
 * De R4-grondslagvraag, expliciet vastgelegd: de drie gedeelde vertrekken van dit pand tellen
 * op tot 30,7 m² over 6 kamers = 5,11667 m² per kamer. Alleen die ongeronde 5,11667 (niet de
 * op 5 m² afgeronde variant van rubriek 1) reproduceert de site-waarden. Kamer 3 is hier de
 * scherpste toets: daar duwt de afronding de uitkomst de ándere kant op (23 i.p.v. 22,75),
 * dus dit is geen toevallige eenzijdige bias.
 */
describe('R4-grondslag — ongerond, niet de afgeronde R1-uitkomst (§2.4.4)', () => {
  it('kamer 2: 0,85 × (16 + 30,7/6) = 17,949 → 18 (afgerond zou 0,85 × 21 = 17,75 geven)', () => {
    expect(berekenR4(kleiweg179bKamer2, tarievenset, peildatum).perKamerRuw[1]).toBeCloseTo(
      0.85 * (16 + 30.7 / 6),
      10,
    );
  });
  it('kamer 3: 0,85 × (21,6 + 30,7/6) = 22,709 → 22,75 (afgerond zou 0,85 × 27 = 23 geven)', () => {
    expect(berekenR4(kleiweg179bKamer3, tarievenset, peildatum).perKamerRuw[1]).toBeCloseTo(
      0.85 * (21.6 + 30.7 / 6),
      10,
    );
  });
  it('kamer 6: 0,95 × (11,3 + 30,7/6) = 15,596 → 15,50 (afgerond zou 0,95 × 16 = 15,25 geven)', () => {
    expect(berekenR4(kleiweg179bKamer6, tarievenset, peildatum).perKamerRuw[1]).toBeCloseTo(
      0.95 * (11.3 + 30.7 / 6),
      10,
    );
  });
});
