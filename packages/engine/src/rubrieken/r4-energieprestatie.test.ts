import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenR1 } from './r1-oppervlakte-vertrekken.js';
import { berekenR4, toetsLabelGeldigheid } from './r4-energieprestatie.js';
import { maakPandInvoer } from './test-utils.js';

const tarievenset = getTarievenset('2026-01-01');
const PEILDATUM = '2026-01-01';

const eenKamer = (pand: Parameters<typeof maakPandInvoer>[0]['pand']) =>
  maakPandInvoer({
    aantalKamers: 1,
    ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
    toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    pand,
  });

describe('R4 — Energieprestatie (§2.4)', () => {
  it('past de energielabelfactor toe op de vertrekoppervlakte', () => {
    const input = eenKamer({ energielabel: 'D', energielabelIngangsdatum: '2023-01-01' });
    // label D: 0,2 × 10 m² = 2 punten
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(2);
  });

  it('rekent met de aan de huurder toegerekende gemeenschappelijke vertrekken (§2.4.4)', () => {
    const input = maakPandInvoer({
      aantalKamers: 4,
      ruimtes: [
        { nr: 1, naam: 'Slaapkamer', type: 'Privévertrek', oppervlakteM2: 20, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 2, naam: 'Woonkamer', type: 'Keuken', oppervlakteM2: 40, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1, 2, 3, 4] },
      ],
      pand: { energielabel: 'A', energielabelIngangsdatum: '2023-01-01' },
    });
    // het rekenvoorbeeld uit §2.4.4: (20 + 40/4) × 0,65 = 19,50 punten
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(19.5);
  });

  it('rekent met de ONGERONDE oppervlakte, niet met de afgeronde R1-uitkomst (§2.4.4)', () => {
    const input = maakPandInvoer({
      aantalKamers: 3,
      ruimtes: [
        { nr: 1, naam: 'Slaapkamer', type: 'Privévertrek', oppervlakteM2: 12.4, verdieping: 0, verwarmd: true, verkoeld: false },
        { nr: 2, naam: 'Keuken', type: 'Keuken', oppervlakteM2: 25, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [
        { ruimteNr: 1, kamers: [1] },
        { ruimteNr: 2, kamers: [1, 2, 3] },
      ],
      pand: { energielabel: 'A', energielabelIngangsdatum: '2023-01-01' },
    });

    // R1 rondt twee keer af op hele m² (§2.2.1.1): 12,4 → 12, en 25/3 = 8,33 → 8, samen 20 m².
    expect(berekenR1(input).perKamer[1]).toBe(20);

    // R4 rekent op de ongeronde 12,4 + 8,333… = 20,733… m²:
    //   20,7333 × 0,65 = 13,4767 → kwartpunt 13,50.
    // Op de afgeronde R1-grondslag zou het 20 × 0,65 = 13,00 zijn — dit onderscheidt de twee.
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(13.5);
  });

  it('valt terug op het bouwjaar als het pand geen label heeft', () => {
    const input = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 1995 });
    // bouwjaar 1995 valt in de band t/m 1999: 0,35 × 10 = 3,5 punten
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(3.5);
  });

  it('valt terug op het bouwjaar bij een vervallen label (ouder dan 10 jaar, §2.4.3)', () => {
    const input = eenKamer({
      energielabel: 'A',
      energielabelIngangsdatum: '2014-06-01',
      bouwjaar: 1995,
    });
    // label uit 2014 is op 2026-01-01 vervallen → bouwjaar 1995 → 0,35 × 10 = 3,5
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(3.5);
  });

  it('negeert een vereenvoudigd label uit de periode 2015-2021 (§2.4.3 lid 4)', () => {
    const input = eenKamer({
      energielabel: 'A',
      energielabelIngangsdatum: '2018-03-01',
      bouwjaar: 1995,
    });
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(3.5);
  });

  it('negeert een label dat pas ná de peildatum is opgenomen', () => {
    const input = eenKamer({
      energielabel: 'A',
      energielabelIngangsdatum: '2026-06-01',
      bouwjaar: 1995,
    });
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(3.5);
  });

  it('een bouwjaar vóór de laagste band valt onder die band (geen ondergrens in de tabel)', () => {
    const input = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 1900 });
    // "1976 of ouder" → −0,15 × 10 = −1,5 punten
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(-1.5);
  });

  it('kent monumenten geen minpunten toe bij label G (§2.4.6.1)', () => {
    const input = eenKamer({
      energielabel: 'G',
      energielabelIngangsdatum: '2023-01-01',
      monument: 'Rijks',
    });
    // zonder monumentstatus zou dit −1,5 zijn
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(0);
  });

  it('kent een beschermd dorpsgezicht die uitzondering níet toe', () => {
    const input = eenKamer({
      energielabel: 'G',
      energielabelIngangsdatum: '2023-01-01',
      monument: 'Beschermd dorpsgezicht',
    });
    // §2.4.6.1 noemt alleen rijks-, provinciale en gemeentelijke monumenten
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(-1.5);
  });

  it('laat positieve punten van een monument ongemoeid', () => {
    const input = eenKamer({
      energielabel: 'A',
      energielabelIngangsdatum: '2023-01-01',
      monument: 'Rijks',
    });
    expect(berekenR4(input, tarievenset, PEILDATUM).perKamer[1]).toBe(6.5);
  });

  it('gooit een expliciete fout voor een bouwjaar ná de hoogste band', () => {
    const input = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 2150 });
    expect(() => berekenR4(input, tarievenset, PEILDATUM)).toThrow(/Geen bouwjaargrens gevonden/);
  });
});

describe('toetsLabelGeldigheid', () => {
  it('accepteert een label van vóór 2015', () => {
    expect(toetsLabelGeldigheid('2014-06-01', '2020-01-01')).toBeNull();
  });

  it('accepteert een NTA 8800-label van na 2021', () => {
    expect(toetsLabelGeldigheid('2023-01-01', '2026-01-01')).toBeNull();
  });

  it('markeert een label precies op de vervaldatum als vervallen', () => {
    // §2.4.3: een label van 1 oktober 2014 vervalt per 1 oktober 2024
    expect(toetsLabelGeldigheid('2014-10-01', '2024-10-01')).toBe('vervallen');
    expect(toetsLabelGeldigheid('2014-10-01', '2024-09-30')).toBeNull();
  });
});
