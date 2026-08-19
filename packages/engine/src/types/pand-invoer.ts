import { z } from 'zod';
import { Pand } from './pand.js';
import { Ruimte } from './ruimte.js';
import { Toewijzing } from './toewijzing.js';
import { HandmatigePosten } from './handmatige-posten.js';
import { Keuken, SanitairVoorziening } from './voorzieningen.js';

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

    data.handmatigePosten.gemeenschappelijkeVertrekken.forEach((post, i) => {
      if (post.kamer > data.pand.aantalKamers) {
        ctx.addIssue({
          code: 'custom',
          path: ['handmatigePosten', 'gemeenschappelijkeVertrekken', i, 'kamer'],
          message: `Kamer ${post.kamer} bestaat niet — pand heeft ${data.pand.aantalKamers} kamer(s).`,
        });
      }
    });
  });
export type PandInvoer = z.infer<typeof PandInvoer>;
