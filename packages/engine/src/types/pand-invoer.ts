import { z } from 'zod';
import { Pand } from './pand.js';
import { Ruimte, DUBBEL_GEDEELDE_RUIMTE_TYPES } from './ruimte.js';
import { Toewijzing } from './toewijzing.js';
import { HandmatigePosten } from './handmatige-posten.js';
import { Keuken, SanitairVoorziening, GemeenschappelijkeParkeerplek } from './voorzieningen.js';

/**
 * De volledige invoer voor één puntentelling: pand, ruimtes, de K1-K12-toewijzingsmatrix
 * en de handmatige posten. Dit is het model dat taak 4+ doorrekent — de referentiële
 * checks hieronder zorgen dat een instantie nooit naar een niet-bestaande ruimte of kamer
 * kan verwijzen, zodat de rekenmotor die aannames niet zelf hoeft te bewaken.
 */
export const PandInvoer = z
  .object({
    pand: Pand,
    ruimtes: z.array(Ruimte).min(1),
    toewijzing: Toewijzing,
    keukens: z.array(Keuken),
    sanitair: z.array(SanitairVoorziening),
    /** R10 — gemeenschappelijke parkeerplekken, elk verwijzend naar een Ruimte. */
    parkeerplekken: z.array(GemeenschappelijkeParkeerplek),
    handmatigePosten: HandmatigePosten,
  })
  .superRefine((data, ctx) => {
    const ruimteNrs = new Set(data.ruimtes.map((r) => r.nr));
    if (ruimteNrs.size !== data.ruimtes.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['ruimtes'],
        message: 'Ruimte-nummers moeten uniek zijn binnen het pand.',
      });
    }

    data.ruimtes.forEach((ruimte, i) => {
      if (DUBBEL_GEDEELDE_RUIMTE_TYPES.includes(ruimte.type) && ruimte.aantalAdressenMetToegang === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['ruimtes', i, 'aantalAdressenMetToegang'],
          message: `Ruimte ${ruimte.nr} (${ruimte.type}) mist 'aantalAdressenMetToegang' — verplicht voor R8/R9/R10, zie §2.8.2/§2.9.1/§2.10.4.`,
        });
      }
    });

    data.toewijzing.forEach((entry, i) => {
      if (!ruimteNrs.has(entry.ruimteNr)) {
        ctx.addIssue({
          code: 'custom',
          path: ['toewijzing', i, 'ruimteNr'],
          message: `Toewijzing verwijst naar ruimte ${entry.ruimteNr}, die niet in ruimtes voorkomt.`,
        });
      }
      const buitenBereik = entry.kamers.filter((k) => k > data.pand.aantalKamers);
      if (buitenBereik.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['toewijzing', i, 'kamers'],
          message: `Kamer(s) ${buitenBereik.join(', ')} bestaan niet — pand heeft ${data.pand.aantalKamers} kamer(s).`,
        });
      }
    });

    data.keukens.forEach((keuken, i) => {
      if (!ruimteNrs.has(keuken.ruimteNr)) {
        ctx.addIssue({
          code: 'custom',
          path: ['keukens', i, 'ruimteNr'],
          message: `Keuken verwijst naar ruimte ${keuken.ruimteNr}, die niet in ruimtes voorkomt.`,
        });
      }
    });

    data.sanitair.forEach((post, i) => {
      if (!ruimteNrs.has(post.ruimteNr)) {
        ctx.addIssue({
          code: 'custom',
          path: ['sanitair', i, 'ruimteNr'],
          message: `Sanitaire voorziening verwijst naar ruimte ${post.ruimteNr}, die niet in ruimtes voorkomt.`,
        });
      }
    });

    data.parkeerplekken.forEach((plek, i) => {
      if (!ruimteNrs.has(plek.ruimteNr)) {
        ctx.addIssue({
          code: 'custom',
          path: ['parkeerplekken', i, 'ruimteNr'],
          message: `Parkeerplek verwijst naar ruimte ${plek.ruimteNr}, die niet in ruimtes voorkomt.`,
        });
      }
    });

    const kamerLijstCheck = (lijst: number[], pad: (string | number)[]) => {
      const buitenBereik = lijst.filter((k) => k > data.pand.aantalKamers);
      if (buitenBereik.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: pad,
          message: `Kamer(s) ${buitenBereik.join(', ')} bestaan niet — pand heeft ${data.pand.aantalKamers} kamer(s).`,
        });
      }
    };

    data.handmatigePosten.woonvoorzieningenHandicap.forEach((post, i) =>
      kamerLijstCheck(post.kamersMetToegang, ['handmatigePosten', 'woonvoorzieningenHandicap', i, 'kamersMetToegang']),
    );
    data.handmatigePosten.aanbelfuncties.forEach((post, i) =>
      kamerLijstCheck(post.kamersMetToegang, ['handmatigePosten', 'aanbelfuncties', i, 'kamersMetToegang']),
    );
    data.handmatigePosten.losseLaadpalen.forEach((post, i) =>
      kamerLijstCheck(post.kamersMetToegang, ['handmatigePosten', 'losseLaadpalen', i, 'kamersMetToegang']),
    );
    kamerLijstCheck(data.handmatigePosten.aftrekSituaties.verhuurderCriterium, [
      'handmatigePosten',
      'aftrekSituaties',
      'verhuurderCriterium',
    ]);
    kamerLijstCheck(data.handmatigePosten.aftrekSituaties.ruitoppervlakteOnvoldoende, [
      'handmatigePosten',
      'aftrekSituaties',
      'ruitoppervlakteOnvoldoende',
    ]);
    kamerLijstCheck(data.handmatigePosten.aftrekSituaties.raamkozijnTeHoog, [
      'handmatigePosten',
      'aftrekSituaties',
      'raamkozijnTeHoog',
    ]);
  });
export type PandInvoer = z.infer<typeof PandInvoer>;
