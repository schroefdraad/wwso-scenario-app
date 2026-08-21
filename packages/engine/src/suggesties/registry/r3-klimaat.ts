import { z } from 'zod';
import type { MaatregelDefinitie } from '../types';
import { vereistParameter } from './hulp';

/** V-01/V-02 — verwarming toevoegen aan een onverwarmde toegankelijke ruimte. Zelfde mutatie, alternatieve maatregelen. */
function verwarmingDefinitie(id: string, omschrijving: (naam: string, nr: number) => string, waarschuwing?: string): MaatregelDefinitie {
  return {
    id,
    doelSoort: 'ruimte',
    vergunningKlasse: 'geen',
    vergunningBrontekst: 'Nee',
    puntenrelevant: true,
    kandidaten(ctx) {
      return ctx.pand.ruimtes
        .filter((r) => !r.verwarmd)
        .map((r) => ({
          sleutel: `${id}#ruimte:${r.nr}`,
          maatregelId: id,
          doel: { soort: 'ruimte' as const, nr: r.nr },
          hoeveelheid: 1,
          omschrijving: omschrijving(r.naam, r.nr),
          waarschuwing,
        }));
    },
    mutaties(ctx, kandidaat) {
      const ruimte = ctx.pand.ruimtes.find((r) => r.nr === kandidaat.doel.nr);
      if (!ruimte) return [];
      return [{ soort: 'ruimte-wijzigen', ruimteNr: ruimte.nr, patch: { verwarmd: true } }];
    },
  };
}

const V01 = verwarmingDefinitie('V-01', (naam, nr) => `Radiator bijplaatsen — ${naam} (ruimte ${nr}) verwarmd`);
V01.alternatiefGroep = 'verwarmen';

const V02 = verwarmingDefinitie(
  'V-02',
  (naam, nr) => `Elektrische verwarming — ${naam} (ruimte ${nr}) verwarmd`,
  'Elektrische verwarming kan het energielabel (R4) verslechteren ten opzichte van cv — de engine rekent met het opgegeven label.',
);
V02.alternatiefGroep = 'verwarmen';

/** V-03 — split-airco: verkoeling op een al verwarmd vertrek. */
const V03: MaatregelDefinitie = {
  id: 'V-03',
  doelSoort: 'ruimte',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Soms melding (buitenunit)',
  puntenrelevant: true,
  kandidaten(ctx) {
    const VERTREK = ['Privévertrek', 'Keuken', 'Badruimte', 'Gemeenschappelijk vertrek'];
    return ctx.pand.ruimtes
      .filter((r) => VERTREK.includes(r.type) && r.verwarmd && !r.verkoeld)
      .map((r) => ({
        sleutel: `V-03#ruimte:${r.nr}`,
        maatregelId: 'V-03',
        doel: { soort: 'ruimte' as const, nr: r.nr },
        hoeveelheid: 1,
        omschrijving: `Split-airco — ${r.naam} (ruimte ${r.nr}) verkoeld`,
      }));
  },
  mutaties(ctx, kandidaat) {
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === kandidaat.doel.nr);
    if (!ruimte) return [];
    return [{ soort: 'ruimte-wijzigen', ruimteNr: ruimte.nr, patch: { verkoeld: true } }];
  },
};
V03.alternatiefGroep = 'verkoelen';

interface V04Params {
  ruimteNrs: number[];
}

/**
 * V-04 — multisplit-airco op maximaal vier ruimtes tegelijk. Welke vier is een keuze van de
 * aanroeper (R3-verkoeling is sowieso op 2 pt/kamer gecapt, dus meer dan 4 ruimtes kiezen heeft
 * nooit zin) — verplichte parameter, geen aanname.
 */
const V04: MaatregelDefinitie<V04Params> = {
  id: 'V-04',
  doelSoort: 'ruimte',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Soms melding',
  puntenrelevant: true,
  parameterSchema: z.object({ ruimteNrs: z.array(z.number().int().min(1).max(40)).min(1).max(4) }),
  nietBeoordeeldReden: vereistParameter('vereist welke (maximaal vier) ruimtes de multisplit-airco krijgen'),
  kandidaten(ctx, parameters) {
    if (!parameters) return [];
    const VERTREK = ['Privévertrek', 'Keuken', 'Badruimte', 'Gemeenschappelijk vertrek'];
    const geldig = parameters.ruimteNrs.filter((nr) => {
      const r = ctx.pand.ruimtes.find((x) => x.nr === nr);
      return r && VERTREK.includes(r.type) && r.verwarmd && !r.verkoeld;
    });
    if (geldig.length === 0) return [];
    return [
      {
        sleutel: `V-04#${geldig.join(',')}`,
        maatregelId: 'V-04',
        doel: { soort: 'ruimte', nr: geldig[0] },
        hoeveelheid: 1,
        parameters: { ruimteNrs: geldig },
        omschrijving: `Multisplit-airco op ruimtes ${geldig.join(', ')}`,
      },
    ];
  },
  mutaties(ctx, kandidaat) {
    const p = kandidaat.parameters!;
    return p.ruimteNrs
      .map((nr) => ctx.pand.ruimtes.find((r) => r.nr === nr))
      .filter((r): r is NonNullable<typeof r> => r !== undefined)
      .map((r) => ({ soort: 'ruimte-wijzigen' as const, ruimteNr: r.nr, patch: { verkoeld: true } }));
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r3KlimaatMaatregelen: MaatregelDefinitie<any>[] = [V01, V02, V03, V04];
