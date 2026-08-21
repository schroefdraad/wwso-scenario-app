import type { MaatregelDefinitie } from '../types';

type Situatie = 'verhuurderCriterium' | 'ruitoppervlakteOnvoldoende' | 'raamkozijnTeHoog';

/** A-01/A-02/A-03 — een R13-aftreksituatie wegnemen door de kamer uit de betreffende lijst te halen. */
function aftrekDefinitie(
  id: string,
  situatie: Situatie,
  vergunningKlasse: MaatregelDefinitie['vergunningKlasse'],
  vergunningBrontekst: string,
  omschrijving: (kamer: number) => string,
): MaatregelDefinitie {
  return {
    id,
    doelSoort: 'kamer',
    vergunningKlasse,
    vergunningBrontekst,
    puntenrelevant: true,
    kandidaten(ctx) {
      const lijst = ctx.pand.handmatigePosten.aftrekSituaties[situatie];
      return lijst.map((kamer) => ({
        sleutel: `${id}#kamer:${kamer}`,
        maatregelId: id,
        doel: { soort: 'kamer' as const, nr: kamer },
        hoeveelheid: 1,
        omschrijving: omschrijving(kamer),
      }));
    },
    mutaties(ctx, kandidaat) {
      const lijst = ctx.pand.handmatigePosten.aftrekSituaties[situatie];
      const nieuweLijst = lijst.filter((k) => k !== kandidaat.doel.nr);
      return [{ soort: 'aftreksituatie-wijzigen', situatie, kamers: nieuweLijst }];
    },
  };
}

const A01 = aftrekDefinitie(
  'A-01',
  'ruitoppervlakteOnvoldoende',
  'vergunning',
  'Ja (gevelwijziging)',
  (kamer) => `Raam vergroten — kamer ${kamer}: aftrek 'ruitoppervlakte onvoldoende' vervalt`,
);
const A02 = aftrekDefinitie(
  'A-02',
  'raamkozijnTeHoog',
  'vergunning',
  'Ja',
  (kamer) => `Raam verlagen/extra raam — kamer ${kamer}: aftrek 'raamkozijn te hoog' vervalt`,
);
const A03 = aftrekDefinitie(
  'A-03',
  'verhuurderCriterium',
  'mogelijk-melding',
  'Meestal melding',
  (kamer) => `Eigen gang/entree — kamer ${kamer}: aftrek 'bereikbaar via verhuurder' vervalt`,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r13AftrekpuntenMaatregelen: MaatregelDefinitie<any>[] = [A01, A02, A03];
