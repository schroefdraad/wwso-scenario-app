import type { MaatregelDefinitie } from '../types';

/** P-01 — laadpaal op een gemeenschappelijke parkeerplek zonder laadpaal. */
const P01: MaatregelDefinitie = {
  id: 'P-01',
  doelSoort: 'parkeerplek',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Soms melding',
  puntenrelevant: true,
  kandidaten(ctx) {
    return ctx.pand.parkeerplekken
      .filter((p) => !p.laadpaal)
      .map((p) => ({
        sleutel: `P-01#parkeerplek:${p.ruimteNr}`,
        maatregelId: 'P-01',
        doel: { soort: 'parkeerplek' as const, nr: p.ruimteNr },
        hoeveelheid: 1,
        omschrijving: `Laadpaal op parkeerplek (ruimte ${p.ruimteNr})`,
      }));
  },
  mutaties(_ctx, kandidaat) {
    return [{ soort: 'parkeerplek-wijzigen', ruimteNr: kandidaat.doel.nr!, patch: { laadpaal: true } }];
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r10ParkerenMaatregelen: MaatregelDefinitie<any>[] = [P01];
