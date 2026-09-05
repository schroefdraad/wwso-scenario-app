import { getTarievenset } from '@wwso/data';
import { describe, expect, it } from 'vitest';
import { berekenR1 } from './r1-oppervlakte-vertrekken';
import { berekenR4 } from './r4-energieprestatie';
import { maakPandInvoer } from './test-utils';

const tarievenset = getTarievenset('2026-01-01');

const eenKamer = (pand: Parameters<typeof maakPandInvoer>[0]['pand']) =>
  maakPandInvoer({
    aantalKamers: 1,
    ruimtes: [{ nr: 1, naam: 'Kamer 1', type: 'Privévertrek', oppervlakteM2: 10, verdieping: 0, verwarmd: true, verkoeld: false }],
    toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    pand,
  });

describe('R4 — Energieprestatie (§2.4)', () => {
  it('past de energielabelfactor toe op de vertrekoppervlakte', () => {
    const input = eenKamer({ energielabel: 'D' });
    // label D: 0,2 × 10 m² = 2 punten
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(2);
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
      pand: { energielabel: 'A' },
    });
    // het rekenvoorbeeld uit §2.4.4: (20 + 40/4) × 0,65 = 19,50 punten
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(19.5);
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
      pand: { energielabel: 'A' },
    });

    // R1 rondt twee keer af op hele m² (§2.2.1.1): 12,4 → 12, en 25/3 = 8,33 → 8, samen 20 m².
    expect(berekenR1(input).perKamer[1]).toBe(20);

    // R4 rekent op de ongeronde 12,4 + 8,333… = 20,733… m²:
    //   20,7333 × 0,65 = 13,4767 → kwartpunt 13,50.
    // Op de afgeronde R1-grondslag zou het 20 × 0,65 = 13,00 zijn — dit onderscheidt de twee.
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(13.5);
  });

  it('valt terug op het bouwjaar als het pand geen label heeft', () => {
    const input = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 1995 });
    // bouwjaar 1995 valt in de band t/m 1999: 0,35 × 10 = 3,5 punten
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(3.5);
  });

  it('valt terug op het bouwjaar als de gebruiker het label als onbekend/vervallen markeert', () => {
    const input = eenKamer({
      energielabel: 'A',
      energielabelOnbekendOfVervallen: true,
      bouwjaar: 1995,
    });
    // ondanks het (mogelijk correcte) label A telt de motor niet mee → bouwjaar 1995 → 0,35 × 10 = 3,5
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(3.5);
  });

  it('een bouwjaar vóór de laagste band valt onder die band (geen ondergrens in de tabel)', () => {
    const input = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 1900 });
    // "1976 of ouder" → −0,15 × 10 = −1,5 punten
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(-1.5);
  });

  it('kent monumenten geen minpunten toe bij label G (§2.4.6.1)', () => {
    const input = eenKamer({ energielabel: 'G', monument: 'Rijks' });
    // zonder monumentstatus zou dit −1,5 zijn
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(0);
  });

  it('kent een beschermd dorpsgezicht die uitzondering níet toe', () => {
    const input = eenKamer({ energielabel: 'G', monument: 'Beschermd dorpsgezicht' });
    // §2.4.6.1 noemt alleen rijks-, provinciale en gemeentelijke monumenten
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(-1.5);
  });

  it('laat positieve punten van een monument ongemoeid', () => {
    const input = eenKamer({ energielabel: 'A', monument: 'Rijks' });
    expect(berekenR4(input, tarievenset).perKamer[1]).toBe(6.5);
  });

  it('gooit een expliciete fout voor een bouwjaar ná de hoogste band', () => {
    const input = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 2150 });
    expect(() => berekenR4(input, tarievenset)).toThrow(/Geen bouwjaargrens gevonden/);
  });

  it('gebruikt een echt label zonder dat de gebruiker iets hoeft aan te vinken (default false)', () => {
    // Regressietest: `energielabelOnbekendOfVervallen` heeft een schema-default van `false` —
    // een gekozen label telt dus al mee zonder een expliciete keuze (feedback Emma, 2026-09-05:
    // vaak staat op bijv. Funda alleen de labelletter, niet de ingangsdatum).
    const metLabel = eenKamer({ energielabel: 'D', bouwjaar: 1900 });
    const onbekendOfVervallen = eenKamer({ energielabel: 'D', energielabelOnbekendOfVervallen: true, bouwjaar: 1900 });
    const zonderLabel = eenKamer({ energielabel: 'Bouwjaar', bouwjaar: 1900 });

    expect(berekenR4(metLabel, tarievenset).perKamer[1]).toBe(2); // 0,2 × 10 m² (label D)
    expect(berekenR4(onbekendOfVervallen, tarievenset).perKamer[1]).toBe(-1.5); // bouwjaargrens 1900
    expect(berekenR4(onbekendOfVervallen, tarievenset).perKamer[1]).toBe(berekenR4(zonderLabel, tarievenset).perKamer[1]);
  });
});
