import type { MaatregelDefinitie } from '../types';

/** X-01 — video-intercom/aanbelfunctie. Alleen kandidaat als het pand er nog geen heeft. */
const X01: MaatregelDefinitie = {
  id: 'X-01',
  doelSoort: 'pand',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    if (ctx.pand.handmatigePosten.aanbelfuncties.length > 0) return [];
    return [
      {
        sleutel: 'X-01#pand',
        maatregelId: 'X-01',
        doel: { soort: 'pand' },
        // Catalogus-eenheid is "per pand" — één systeem, niet één per kamer. `hoeveelheid`
        // stuurt de investeringsberekening rechtstreeks aan (kosten.ts), dus moet hier 1 zijn.
        hoeveelheid: 1,
        omschrijving: 'Video-intercom / aanbelfunctie met camerabeeld voor alle kamers',
      },
    ];
  },
  mutaties(ctx) {
    const alleKamers = Array.from({ length: ctx.pand.pand.aantalKamers }, (_, i) => i + 1);
    return [{ soort: 'aanbelfunctie-toevoegen', kamersMetToegang: alleKamers }];
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r12BijzonderMaatregelen: MaatregelDefinitie<any>[] = [X01];
