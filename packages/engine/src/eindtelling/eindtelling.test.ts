import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { berekenEindtelling } from './eindtelling';
import { bepaalMaxHuur } from './huurprijs';
import { maakPandInvoer } from '../rubrieken/test-utils';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = '2026-01-01';

const EEN_KAMER = () =>
  maakPandInvoer({
    aantalKamers: 1,
    ruimtes: [
      { nr: 1, naam: 'Kamer', type: 'Privévertrek' as const, oppervlakteM2: 20, verdieping: 0, verwarmd: true, verkoeld: false },
    ],
    toewijzing: [{ ruimteNr: 1, kamers: [1] }],
  });

// R1 20 + R3 2 + R4 (0,2 × 20 = 4) + R11 10 (WOZ 3000/m² vs regiogemiddelde 3884 → >10% lager) = 36

describe('berekenEindtelling — R1 t/m R13 tot maximale huurprijs', () => {
  it('telt de rubrieken op en rondt af op hele punten (§2.1.7)', () => {
    const resultaat = berekenEindtelling(EEN_KAMER(), tarievenset, peildatum);
    const kamer = resultaat.perKamer[1];
    expect(kamer.subtotaalR1TotEnMet11).toBe(36);
    expect(kamer.zorgwoningOpslagPunten).toBe(0);
    expect(kamer.totaalPunten).toBe(36);
    expect(kamer.puntenVoorHuurprijs).toBe(36);
    expect(kamer.maxHuurEuro).toBe(bepaalMaxHuur(36, tarievenset).maxHuurEuro);
  });

  it('verhoogt het R1-11-subtotaal met 35% bij een zorgwoning, vóór R12/R13 (§2.12.1)', () => {
    const input = EEN_KAMER();
    input.handmatigePosten.zorgwoning = true;
    const resultaat = berekenEindtelling(input, tarievenset, peildatum);
    const kamer = resultaat.perKamer[1];
    // R9 springt door de zorgwoning-vuistregel (§2.9.4) van 0 naar 3 → subtotaal 36 + 3 = 39
    // 39 × 1,35 = 52,65 → FLOOR(52,65 + 0,5) = 53
    expect(kamer.rubrieken.r9).toBe(3);
    expect(kamer.subtotaalR1TotEnMet11).toBe(39);
    expect(kamer.zorgwoningOpslagPunten).toBeCloseTo(13.65, 10);
    expect(kamer.totaalPunten).toBe(53);
  });

  it('kent +10 punten toe bij een Rijksmonument met een contract van vóór 1 juli 2024, geen prijsopslag', () => {
    const input = EEN_KAMER();
    input.pand.monument = 'Rijks';
    input.pand.huurovereenkomstDatum = '2024-01-01';
    const resultaat = berekenEindtelling(input, tarievenset, peildatum);
    const kamer = resultaat.perKamer[1];
    expect(kamer.totaalPunten).toBe(36);
    expect(kamer.monumentPunten).toBe(10);
    expect(kamer.puntenVoorHuurprijs).toBe(46);
    expect(kamer.opslagPercentage).toBe(0);
    expect(kamer.maxHuurEuro).toBe(kamer.maxHuurExclOpslagEuro);
  });

  it('past +35% prijsopslag toe bij een Rijksmonument met een contract van op/na 1 juli 2024', () => {
    const input = EEN_KAMER();
    input.pand.monument = 'Rijks';
    input.pand.huurovereenkomstDatum = '2024-07-01';
    const resultaat = berekenEindtelling(input, tarievenset, peildatum);
    const kamer = resultaat.perKamer[1];
    expect(kamer.monumentPunten).toBe(0);
    expect(kamer.puntenVoorHuurprijs).toBe(36);
    expect(kamer.opslagPercentage).toBe(35);
    expect(kamer.maxHuurEuro).toBeCloseTo(kamer.maxHuurExclOpslagEuro * 1.35, 2);
  });
});
