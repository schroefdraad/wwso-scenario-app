import { describe, expect, it } from 'vitest';
import { berekenR3 } from './r3-verwarming';
import { maakPandInvoer } from './test-utils';

const vertrek = (nr: number, opts: { verwarmd: boolean; verkoeld: boolean }) => ({
  nr,
  naam: `Kamer ${nr}`,
  type: 'Privévertrek' as const,
  oppervlakteM2: 10,
  verdieping: 0,
  ...opts,
});

describe('R3 — Verwarming en verkoeling (§2.3)', () => {
  it('telt 2 punten per verwarmd vertrek', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [vertrek(1, { verwarmd: true, verkoeld: false })],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR3(input).perKamer[1]).toBe(2);
  });

  it('telt 1 punt voor een verwarmde verkeersruimte (§2.3)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Hal', type: 'Verkeersruimte', oppervlakteM2: 6, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // verkeersruimten krijgen géén oppervlaktepunten in R1/R2, maar tellen hier wél mee
    expect(berekenR3(input).perKamer[1]).toBe(1);
  });

  it('blijft op 4 punten bij precies 5 verwarmde overige ruimten', () => {
    const ruimtes = Array.from({ length: 5 }, (_, i) => ({
      nr: i + 1,
      naam: `Berging ${i + 1}`,
      type: 'Berging' as const,
      oppervlakteM2: 3,
      verdieping: 0,
      verwarmd: true,
      verkoeld: false,
    }));
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes,
      toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    });
    expect(berekenR3(input).perKamer[1]).toBe(4);
  });

  it('telt overige ruimten en verkeersruimten samen tegen hetzelfde maximum van 4', () => {
    const ruimtes = [
      ...Array.from({ length: 3 }, (_, i) => ({
        nr: i + 1,
        naam: `Berging ${i + 1}`,
        type: 'Berging' as const,
        oppervlakteM2: 3,
        verdieping: 0,
        verwarmd: true,
        verkoeld: false,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        nr: i + 4,
        naam: `Gang ${i + 1}`,
        type: 'Verkeersruimte' as const,
        oppervlakteM2: 4,
        verdieping: 0,
        verwarmd: true,
        verkoeld: false,
      })),
    ];
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes,
      toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    });
    // 6 ruimten van 1 punt, samen begrensd op 4
    expect(berekenR3(input).perKamer[1]).toBe(4);
  });

  it('geeft geen verkoelingspunten aan een vertrek dat niet ook verwarmd is (§2.3.1)', () => {
    const ruimtes = [
      vertrek(1, { verwarmd: false, verkoeld: true }),
      vertrek(2, { verwarmd: false, verkoeld: true }),
      vertrek(3, { verwarmd: false, verkoeld: true }),
    ];
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes,
      toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    });
    // verkoeling is "1 punt extra per verwarmd én verkoeld vertrek" — zonder verwarming dus niets
    expect(berekenR3(input).perKamer[1]).toBe(0);
  });

  it('geeft geen verkoelingspunten aan een overige ruimte (§2.3.3)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        { nr: 1, naam: 'Berging', type: 'Berging', oppervlakteM2: 3, verdieping: 0, verwarmd: true, verkoeld: true },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    // alleen vertrekken komen in aanmerking voor verkoeling: 1 punt verwarmd, 0 voor verkoeld
    expect(berekenR3(input).perKamer[1]).toBe(1);
  });

  it('telt 1 punt extra voor een vertrek dat verwarmd én verkoeld is', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [vertrek(1, { verwarmd: true, verkoeld: true })],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR3(input).perKamer[1]).toBe(3);
  });

  it('begrenst de verkoelingspunten op 2', () => {
    const ruimtes = [
      vertrek(1, { verwarmd: true, verkoeld: true }),
      vertrek(2, { verwarmd: true, verkoeld: true }),
      vertrek(3, { verwarmd: true, verkoeld: true }),
    ];
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes,
      toewijzing: ruimtes.map((r) => ({ ruimteNr: r.nr, kamers: [1] })),
    });
    // 3 × 2 = 6 punten verwarming + verkoeling begrensd op 2 = 8
    expect(berekenR3(input).perKamer[1]).toBe(8);
  });

  it('telt een verwarmd gemeenschappelijk vertrek mee als vertrek (§2.9.2)', () => {
    const input = maakPandInvoer({
      aantalKamers: 2,
      ruimtes: [
        {
          nr: 1,
          naam: 'Gemeenschappelijke woonkamer',
          type: 'Gemeenschappelijk vertrek',
          oppervlakteM2: 15,
          verdieping: 0,
          verwarmd: true,
          verkoeld: false,
          aantalAdressenMetToegang: 1,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2] }],
    });
    // 2 pt / 2 kamers = 1 pt per kamer — los van de m²-punten die R9 apart telt
    expect(berekenR3(input).perKamer[1]).toBe(1);
    expect(berekenR3(input).perKamer[2]).toBe(1);
  });

  it('telt een verwarmde gemeenschappelijke overige ruimte mee als overige ruimte (§2.9.2)', () => {
    const input = maakPandInvoer({
      aantalKamers: 1,
      ruimtes: [
        {
          nr: 1,
          naam: 'Gemeenschappelijke fietsenberging',
          type: 'Gemeenschappelijke overige ruimte',
          oppervlakteM2: 5,
          verdieping: 0,
          verwarmd: true,
          verkoeld: false,
          aantalAdressenMetToegang: 1,
        },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1] }],
    });
    expect(berekenR3(input).perKamer[1]).toBe(1);
  });

  it('deelt de punten van een gedeelde keuken door het aantal kamers, met kwartpuntsafronding', () => {
    const input = maakPandInvoer({
      aantalKamers: 3,
      ruimtes: [
        { nr: 1, naam: 'Gedeelde keuken', type: 'Keuken', oppervlakteM2: 8, verdieping: 0, verwarmd: true, verkoeld: false },
      ],
      toewijzing: [{ ruimteNr: 1, kamers: [1, 2, 3] }],
    });
    const resultaat = berekenR3(input);
    // 2 pt / 3 kamers = 0,667 → FLOOR(0,667 + 0,125; 0,25) = 0,75
    for (const kamer of [1, 2, 3]) {
      expect(resultaat.perKamer[kamer]).toBe(0.75);
    }
  });
});
