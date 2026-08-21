import { z } from 'zod';
import { ruimtesPerKamer, vertrekOppervlakteM2 } from '../../rubrieken/gedeeld';
import type { Mutatie } from '../../scenario/index';
import type { MaatregelDefinitie } from '../types';
import { vereistParameter } from './hulp';

/** R13 gebruikt dezelfde grens (r13-aftrekpunten.ts) — hier lokaal herhaald zodat A-04 zonder gok kan bepalen hoeveel m² erbij moet. */
const MIN_OPPERVLAKTE_M2 = 8;

/**
 * I-01 — kamer splitsen met een lichte scheidingswand. Staat geregistreerd (bijectie-eis),
 * maar levert bewust GEEN kandidaten op: waar de wand komt, hoeveel m² wand nodig is en hoe de
 * resterende ruimte heet, is een geometrische/ontwerpbeslissing die niet uit het pand valt af
 * te leiden zonder tekening — dat blijft een menselijke keuze buiten de suggestie-engine
 * (§11, open vraag 1 van het ontwerp: herindeling staat sowieso los van Basis/Comfort/Maximaal).
 */
const I01: MaatregelDefinitie = {
  id: 'I-01',
  doelSoort: 'pand',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Meestal melding',
  puntenrelevant: true,
  wijzigtAantalKamers: true,
  kandidaten: () => [],
  mutaties: () => [],
};

interface WandParams {
  ruimteNr: number;
  extraOppervlakteM2: number;
}

function wandVerwijderenDefinitie(
  id: string,
  vergunningKlasse: MaatregelDefinitie['vergunningKlasse'],
  vergunningBrontekst: string,
  vereist: readonly string[] | undefined,
): MaatregelDefinitie<WandParams> {
  return {
    id,
    doelSoort: 'ruimte',
    vergunningKlasse,
    vergunningBrontekst,
    puntenrelevant: true,
    vereist,
    alternatiefGroep: undefined, // per ruimte ingevuld via kandidaten() hieronder (dynamische groepsnaam)
    parameterSchema: z.object({ ruimteNr: z.number().int().min(1).max(40), extraOppervlakteM2: z.number().positive() }),
    nietBeoordeeldReden: vereistParameter('vereist welke ruimte vergroot wordt en met hoeveel m² (geen aanname over de wand mogelijk)'),
    kandidaten(ctx, parameters) {
      if (!parameters) return [];
      const ruimte = ctx.pand.ruimtes.find((r) => r.nr === parameters.ruimteNr);
      if (!ruimte) return [];
      return [
        {
          sleutel: `${id}#ruimte:${parameters.ruimteNr}`,
          maatregelId: id,
          doel: { soort: 'ruimte', nr: parameters.ruimteNr },
          hoeveelheid: 1,
          parameters,
          omschrijving: `${ruimte.naam} (ruimte ${parameters.ruimteNr}) vergroten met ${parameters.extraOppervlakteM2} m²`,
        },
      ];
    },
    mutaties(ctx, kandidaat) {
      const p = kandidaat.parameters!;
      const ruimte = ctx.pand.ruimtes.find((r) => r.nr === p.ruimteNr);
      if (!ruimte) return [];
      return [{ soort: 'ruimte-wijzigen', ruimteNr: p.ruimteNr, patch: { oppervlakteM2: ruimte.oppervlakteM2 + p.extraOppervlakteM2 } }];
    },
  };
}

/** I-02 — niet-dragende wand verwijderen: vergroot een bestaande ruimte. */
const I02 = wandVerwijderenDefinitie('I-02', 'geen', 'Nee', undefined);
I02.alternatiefGroep = 'wand-weg'; // groepering per doel gebeurt in pakketten.ts op (alternatiefGroep, doel)

/** I-03 — dragende wand verwijderen: zelfde effect als I-02, met constructeur (PR-02) als rider. */
const I03 = wandVerwijderenDefinitie('I-03', 'vergunning', 'Ja (omgevingsvergunning)', ['PR-02']);
I03.alternatiefGroep = 'wand-weg';

/**
 * I-04 — vaste trap naar zolder. Alleen vorm (a) geïmplementeerd: een zolder die al als
 * 'overige ruimte' meetelt maar geen vaste trap heeft, verliest de R2-zolderaftrek (§2.2.2.3)
 * zodra er een vaste trap komt — parametervrij, want de fysieke ruimte bestaat al. Vorm (b)
 * (zolder ombouwen tot een volwaardige kamer met eigen kamernummer) is net als I-01 een
 * geometrische ontwerpbeslissing en levert geen kandidaten op.
 */
const I04: MaatregelDefinitie = {
  id: 'I-04',
  doelSoort: 'ruimte',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Soms melding',
  puntenrelevant: true,
  kandidaten(ctx) {
    return ctx.pand.ruimtes
      .filter((r) => r.zolder !== undefined && !r.zolder.vasteTrap)
      .map((r) => ({
        sleutel: `I-04#ruimte:${r.nr}`,
        maatregelId: 'I-04',
        doel: { soort: 'ruimte' as const, nr: r.nr },
        hoeveelheid: 1,
        omschrijving: `Vaste trap naar zolder (ruimte ${r.nr}) — haalt de R2-zolderaftrek weg`,
      }));
  },
  mutaties(ctx, kandidaat) {
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === kandidaat.doel.nr);
    if (!ruimte?.zolder) return [];
    return [{ soort: 'ruimte-wijzigen', ruimteNr: ruimte.nr, patch: { zolder: { ...ruimte.zolder, vasteTrap: true } } }];
  },
};

interface I05Params {
  ruimteNr: number;
  extraOppervlakteM2: number;
}

/**
 * I-05 — dakkapel: vergroot een zolderruimte. Correctie t.o.v. het ontwerptabel (dat I-05
 * als "H" — herindeling — noteerde): de mutatie is een gewone `ruimte-wijzigen(oppervlakteM2)`
 * die `aantalKamers` niet aanraakt, dus dit hoort niet bij het herindeling-spoor.
 */
const I05: MaatregelDefinitie<I05Params> = {
  id: 'I-05',
  doelSoort: 'ruimte',
  vergunningKlasse: 'vergunning',
  vergunningBrontekst: 'Ja (meestal)',
  puntenrelevant: true,
  vereist: ['PR-02'],
  parameterSchema: z.object({ ruimteNr: z.number().int().min(1).max(40), extraOppervlakteM2: z.number().positive() }),
  nietBeoordeeldReden: vereistParameter('vereist welke zolderruimte de dakkapel krijgt en hoeveel m² erbij komt'),
  kandidaten(ctx, parameters) {
    if (!parameters) return [];
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === parameters.ruimteNr && r.zolder !== undefined);
    if (!ruimte) return [];
    return [
      {
        sleutel: `I-05#ruimte:${parameters.ruimteNr}`,
        maatregelId: 'I-05',
        doel: { soort: 'ruimte', nr: parameters.ruimteNr },
        hoeveelheid: 1,
        parameters,
        omschrijving: `Dakkapel op zolder (ruimte ${parameters.ruimteNr}): +${parameters.extraOppervlakteM2} m²`,
      },
    ];
  },
  mutaties(ctx, kandidaat) {
    const p = kandidaat.parameters!;
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === p.ruimteNr);
    if (!ruimte) return [];
    return [{ soort: 'ruimte-wijzigen', ruimteNr: p.ruimteNr, patch: { oppervlakteM2: ruimte.oppervlakteM2 + p.extraOppervlakteM2 } }];
  },
};

/** I-06 — berging/bijkeuken bruikbaar maken: koppelt een nog niet toegewezen overige ruimte aan alle kamers. */
const I06: MaatregelDefinitie = {
  id: 'I-06',
  doelSoort: 'ruimte',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    const toegewezen = new Set(ctx.pand.toewijzing.map((t) => t.ruimteNr));
    const OVERIGE = ['Berging', 'Bijkeuken', 'Wasruimte', 'Overige ruimte', 'Toiletruimte'] as const;
    return ctx.pand.ruimtes
      .filter((r) => (OVERIGE as readonly string[]).includes(r.type) && !toegewezen.has(r.nr))
      .map((r) => ({
        sleutel: `I-06#ruimte:${r.nr}`,
        maatregelId: 'I-06',
        doel: { soort: 'ruimte' as const, nr: r.nr },
        hoeveelheid: 1,
        omschrijving: `${r.naam} (ruimte ${r.nr}) toegankelijk maken voor alle kamers`,
        interpretatie: 'Alle kamers krijgen toegang — de catalogustekst specificeert niet voor wie de ruimte bedoeld is.',
      }));
  },
  mutaties(ctx, kandidaat) {
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === kandidaat.doel.nr);
    if (!ruimte) return [];
    const alleKamers = Array.from({ length: ctx.pand.pand.aantalKamers }, (_, i) => i + 1);
    return [{ soort: 'toewijzing-wijzigen', ruimteNr: ruimte.nr, kamers: alleKamers }];
  },
};

/**
 * A-04 — kamer vergroten tot minimaal 8 m² (R13-aftrek weg). In tegenstelling tot I-02/I-03 is
 * dit WEL parametervrij: de drempel (8,00 m²) is een vaste, bekende regel uit §2.13, geen
 * catalogus-vuistregel — er valt dus niets te gokken over hoeveel m² nodig is. Deelt de
 * alternatievengroep met I-02/I-03 op dezelfde ruimte, zodat dezelfde wand niet dubbel telt.
 */
const A04: MaatregelDefinitie = {
  id: 'A-04',
  doelSoort: 'kamer',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Meestal melding',
  puntenrelevant: true,
  kandidaten(ctx) {
    const perKamerRuimtes = ruimtesPerKamer(ctx.pand);
    const kandidaten = [];
    for (let kamer = 1; kamer <= ctx.pand.pand.aantalKamers; kamer++) {
      const ruimtes = perKamerRuimtes.get(kamer) ?? [];
      const oppervlakte = vertrekOppervlakteM2(ruimtes);
      if (oppervlakte >= MIN_OPPERVLAKTE_M2) continue;
      const priveVertrek = ruimtes.find((r) => r.ruimte.type === 'Privévertrek' && r.nKamersMetToegang === 1)?.ruimte;
      if (!priveVertrek) continue;
      const nodig = Math.round((MIN_OPPERVLAKTE_M2 - oppervlakte + 0.01) * 100) / 100;
      kandidaten.push({
        sleutel: `A-04#kamer:${kamer}`,
        maatregelId: 'A-04',
        doel: { soort: 'kamer' as const, nr: kamer },
        hoeveelheid: 1,
        parameters: { ruimteNr: priveVertrek.nr, extraOppervlakteM2: nodig },
        omschrijving: `Kamer ${kamer} (ruimte ${priveVertrek.nr}) vergroten met ${nodig} m² tot over de 8 m²-grens van §2.13`,
      });
    }
    return kandidaten;
  },
  mutaties(ctx, kandidaat) {
    const p = kandidaat.parameters as { ruimteNr: number; extraOppervlakteM2: number };
    const ruimte = ctx.pand.ruimtes.find((r) => r.nr === p.ruimteNr);
    if (!ruimte) return [];
    const mutatie: Mutatie = { soort: 'ruimte-wijzigen', ruimteNr: p.ruimteNr, patch: { oppervlakteM2: ruimte.oppervlakteM2 + p.extraOppervlakteM2 } };
    return [mutatie];
  },
};
A04.alternatiefGroep = 'wand-weg';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r1r2IndelingMaatregelen: MaatregelDefinitie<any>[] = [I01, I02, I03, I04, I05, I06, A04];
