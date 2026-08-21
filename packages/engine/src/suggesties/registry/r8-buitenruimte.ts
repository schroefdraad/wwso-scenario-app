import { z } from 'zod';
import type { Mutatie } from '../../scenario/index';
import type { MaatregelDefinitie } from '../types';
import { vereistParameter, volgendeVrijeRuimteNr } from './hulp';

interface BuitenruimteParams {
  kamer: number;
  oppervlakteM2: number;
}

/** B-01/B-02/B-03 — nieuwe privé-buitenruimte voor één kamer. Ontbrekend pandgegeven (locatie, m²): verplichte parameter. */
function priveBuitenruimteDefinitie(
  id: string,
  naam: string,
  vergunningBrontekst: string,
): MaatregelDefinitie<BuitenruimteParams> {
  return {
    id,
    doelSoort: 'kamer',
    vergunningKlasse: 'vergunning',
    vergunningBrontekst,
    puntenrelevant: true,
    parameterSchema: z.object({ kamer: z.number().int().min(1).max(12), oppervlakteM2: z.number().positive() }),
    nietBeoordeeldReden: vereistParameter('vereist voor welke kamer en met hoeveel m² (geen aanname over de locatie mogelijk)'),
    kandidaten(ctx, parameters) {
      if (!parameters) return [];
      if (parameters.kamer > ctx.pand.pand.aantalKamers) return [];
      const nieuwNr = volgendeVrijeRuimteNr(ctx.pand);
      if (nieuwNr === undefined) return [];
      return [
        {
          sleutel: `${id}#kamer:${parameters.kamer}`,
          maatregelId: id,
          doel: { soort: 'kamer', nr: parameters.kamer },
          hoeveelheid: 1,
          parameters,
          omschrijving: `${naam} (${parameters.oppervlakteM2} m²) voor kamer ${parameters.kamer}`,
        },
      ];
    },
    mutaties(ctx, kandidaat) {
      const p = kandidaat.parameters!;
      const nr = volgendeVrijeRuimteNr(ctx.pand);
      if (nr === undefined) return [];
      const mutatie: Mutatie = {
        soort: 'ruimte-toevoegen',
        ruimte: { nr, naam: `${naam} kamer ${p.kamer}`, type: 'Buitenruimte privé', oppervlakteM2: p.oppervlakteM2, verdieping: 1, verwarmd: false, verkoeld: false },
        kamers: [p.kamer],
      };
      return [mutatie];
    },
  };
}

const B01 = priveBuitenruimteDefinitie('B-01', 'Frans balkon', 'Ja (gevelwijziging)');
const B02 = priveBuitenruimteDefinitie('B-02', 'Balkon aan achtergevel', 'Ja');
const B03 = priveBuitenruimteDefinitie('B-03', 'Dakterras', 'Ja');

/**
 * B-04 — gemeenschappelijke buitenruimte toegankelijk maken. Alleen automatisch toepasbaar als
 * er al een gemeenschappelijke buitenruimte zonder toewijzing bestaat (zelfde patroon als
 * I-06). Een volledig nieuwe tuin aanleggen zonder bestaande ruimte is, net als I-01, een
 * ontwerpbeslissing die de suggestie-engine niet zelf verzint.
 */
const B04: MaatregelDefinitie = {
  id: 'B-04',
  doelSoort: 'ruimte',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    const toegewezen = new Set(ctx.pand.toewijzing.map((t) => t.ruimteNr));
    return ctx.pand.ruimtes
      .filter((r) => r.type === 'Buitenruimte gemeenschappelijk' && !toegewezen.has(r.nr))
      .map((r) => ({
        sleutel: `B-04#ruimte:${r.nr}`,
        maatregelId: 'B-04',
        doel: { soort: 'ruimte' as const, nr: r.nr },
        hoeveelheid: 1,
        omschrijving: `${r.naam} (ruimte ${r.nr}) toegankelijk maken voor alle kamers`,
      }));
  },
  mutaties(ctx, kandidaat) {
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === kandidaat.doel.nr);
    if (!ruimte) return [];
    const alleKamers = Array.from({ length: ctx.pand.pand.aantalKamers }, (_, i) => i + 1);
    return [{ soort: 'toewijzing-wijzigen', ruimteNr: ruimte.nr, kamers: alleKamers }];
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r8BuitenruimteMaatregelen: MaatregelDefinitie<any>[] = [B01, B02, B03, B04];
