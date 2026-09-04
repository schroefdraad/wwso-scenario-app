import type { KeukenAanrechtBand } from '@wwso/data';
import type { Keuken, KeukenExtraVoorzieningen } from '../../types/index';
import { bepaalAanrechtBasispunten } from '../../rubrieken/r5-keuken';
import { kamersPerRuimte, ruimtesPerKamer } from '../../rubrieken/gedeeld';
import type { Mutatie } from '../../scenario/index';
import type { Kandidaat, MaatregelContext, MaatregelDefinitie } from '../types';

/**
 * Eerstvolgende aanrechtlengte die een hogere band raakt (K-03). Generiek tegen de
 * bandentabel van de tarievenset — geen hardcoded drempel, en slaat automatisch banden over
 * die door de wooneenheden-voetnoot (§2.5.2) toch niet bereikbaar zijn.
 */
function volgendeAanrechtDrempel(
  huidigeLengteM: number,
  nKamersMetToegang: number,
  banden: readonly KeukenAanrechtBand[],
): number | undefined {
  const huidigePunten = bepaalAanrechtBasispunten(huidigeLengteM, nKamersMetToegang, banden);
  const drempels = banden
    .map((b) => b.bovengrensM)
    .filter((b): b is number => b !== null && b > huidigeLengteM)
    .sort((a, b) => a - b);

  for (const drempel of drempels) {
    const testLengte = drempel + 0.01;
    if (bepaalAanrechtBasispunten(testLengte, nKamersMetToegang, banden) > huidigePunten) {
      return Math.round(testLengte * 100) / 100;
    }
  }
  return undefined;
}

/** De privé-ruimte van een kamer (nKamersMetToegang === 1) van het type Privévertrek, of undefined. */
function priveVertrekVan(ctx: MaatregelContext, kamer: number) {
  const ruimtes = ruimtesPerKamer(ctx.pand).get(kamer) ?? [];
  return ruimtes.find((r) => r.ruimte.type === 'Privévertrek' && r.nKamersMetToegang === 1)?.ruimte;
}

/** Kitchenette-preset: aanrechtlengte + basiseisen + extra, herbruikbaar buiten de registry (invoerpagina-snelinvulling). */
export type KitchenettePreset = Omit<Keuken, 'ruimteNr'>;

const KITCHENETTE_BASISEISEN: Keuken['basiseisen'] = {
  aanEnAfvoerWater: true,
  vastKookaansluitpunt: true,
  aanrechtbladMinimaal1MeterInEenStuk: true,
  tweeInbouwkastenVan50Cm: true,
  waterdichteWandafwerking: true,
};

const KITCHENETTE_EXTRA_LEEG: Keuken['extra'] = {
  afzuiginstallatie: false,
  kookplaatInductie: false,
  kookplaatKeramisch: false,
  kookplaatGas: false,
  koelkast: false,
  vrieskast: false,
  ovenElektrisch: false,
  ovenGas: false,
  magnetron: false,
  vaatwasmachine: false,
  extraKastruimteEenhedenVan60Cm: 0,
  eenhandsmengkraan: false,
  thermostatischeMengkraan: false,
  kokendWaterfunctie: false,
};

/**
 * K-01 — kitchenette 122 cm. Uit de offerte (`resources/Kosten per keukenblok.xlsx`, 122cm-tab):
 * spoelbak+kraan, inductieplaat, afzuigkap — geen koelkast, oven of vaatwasser (staan niet op de
 * inclusieflijst van deze variant).
 */
export const KITCHENETTE_122_PRESET: KitchenettePreset = {
  aanrechtlengteM: 1.22,
  basiseisen: KITCHENETTE_BASISEISEN,
  extra: { ...KITCHENETTE_EXTRA_LEEG, afzuiginstallatie: true, kookplaatInductie: true },
  // §2.3.2: deelt de bestaande privéruimte (geen eigen wand/deur), dus hetzelfde
  // verwarmingscircuit als het vertrek — geen apart geïnstalleerde radiator in de offerte.
  verwarmd: true,
};

/**
 * K-09 — kitchenette 240 cm, alternatief voor K-01 op dezelfde kamer. Inclusieflijst uit de
 * offerte (240cm-tab): spoelbak+kraan, inductieplaat, afzuigkap, elektrische oven, vaatwasser,
 * koelkast.
 */
export const KITCHENETTE_240_PRESET: KitchenettePreset = {
  aanrechtlengteM: 2.4,
  basiseisen: KITCHENETTE_BASISEISEN,
  extra: { ...KITCHENETTE_EXTRA_LEEG, afzuiginstallatie: true, kookplaatInductie: true, ovenElektrisch: true, vaatwasmachine: true, koelkast: true },
  // §2.3.2: deelt de bestaande privéruimte (geen eigen wand/deur), dus hetzelfde
  // verwarmingscircuit als het vertrek — geen apart geïnstalleerde radiator in de offerte.
  verwarmd: true,
};

/**
 * Bouwt K-01/K-09: kitchenette-varianten die concurreren om dezelfde kamer (`alternatiefGroep`,
 * een pakket kiest hoogstens één per kamer). Beide vereisen K-02 als kostenrider — de offerte
 * laat zien dat loodgieterswerk/elektra/EV-fee voor beide varianten identiek zijn, alleen het
 * blok zelf (materiaal/inhuizen/plaatsing) verschilt. De catalogus geeft geen apart m²-veld voor
 * de kitchenette, dus de keuken wordt toegevoegd aan de BESTAANDE privéruimte van de kamer (§2.5:
 * `Keuken.ruimteNr` hoeft geen ruimtetype 'Keuken' te hebben — "denk aan een open keuken"). Dat
 * voorkomt een gegokte extra vierkante meter.
 */
function kitchenetteVariant(
  id: string,
  preset: KitchenettePreset,
  omschrijving: (kamer: number, ruimteNr: number) => string,
  interpretatie: string,
): MaatregelDefinitie {
  return {
    id,
    doelSoort: 'kamer',
    vergunningKlasse: 'geen',
    vergunningBrontekst: 'Nee (wel bouwbesluit/ventilatie)',
    puntenrelevant: true,
    vereist: ['K-02'],
    alternatiefGroep: 'K-kitchenette',
    kandidaten(ctx) {
      const kandidaten: Kandidaat[] = [];
      const keukenRuimtes = new Set(ctx.pand.keukens.map((k) => k.ruimteNr));
      for (let kamer = 1; kamer <= ctx.pand.pand.aantalKamers; kamer++) {
        const vertrek = priveVertrekVan(ctx, kamer);
        if (!vertrek || keukenRuimtes.has(vertrek.nr)) continue;
        kandidaten.push({
          sleutel: `${id}#kamer:${kamer}`,
          maatregelId: id,
          doel: { soort: 'kamer', nr: kamer },
          hoeveelheid: 1,
          omschrijving: omschrijving(kamer, vertrek.nr),
          interpretatie,
        });
      }
      return kandidaten;
    },
    mutaties(ctx, kandidaat) {
      const vertrek = priveVertrekVan(ctx, kandidaat.doel.nr!);
      if (!vertrek) return [];
      const mutatie: Mutatie = { soort: 'keuken-toevoegen', keuken: { ruimteNr: vertrek.nr, ...preset } };
      return [mutatie];
    },
  };
}

const K01 = kitchenetteVariant(
  'K-01',
  KITCHENETTE_122_PRESET,
  (kamer, ruimteNr) => `Kitchenette 122 cm plaatsen in kamer ${kamer} (ruimte ${ruimteNr})`,
  'Aanrecht 1,22 m, inductieplaat + afzuigkap volgens de offerte (122cm-tab) — geen koelkast, oven of vaatwasser: staan niet op de inclusieflijst van deze variant.',
);

const K09 = kitchenetteVariant(
  'K-09',
  KITCHENETTE_240_PRESET,
  (kamer, ruimteNr) => `Kitchenette 240 cm plaatsen in kamer ${kamer} (ruimte ${ruimteNr})`,
  'Aanrecht 2,40 m, inductieplaat + afzuigkap + elektrische oven + vaatwasser + koelkast volgens de offerte (240cm-tab). Alternatief voor K-01 op dezelfde kamer.',
);

/** K-02 — water/afvoer/elektra t.b.v. kitchenette. Zuivere kostenrider van K-01/K-09, nooit zelfstandig kandidaat. */
const K02: MaatregelDefinitie = {
  id: 'K-02',
  doelSoort: 'kamer',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: false,
  kandidaten: () => [],
  mutaties: () => [],
};

/** K-03 — aanrecht verlengen tot over de eerstvolgende puntendrempel. */
const K03: MaatregelDefinitie<{ nieuweLengteM: number }> = {
  id: 'K-03',
  doelSoort: 'keuken',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    const kamersBijRuimte = kamersPerRuimte(ctx.pand);
    const kandidaten: Kandidaat<{ nieuweLengteM: number }>[] = [];
    for (const keuken of ctx.pand.keukens) {
      const n = (kamersBijRuimte.get(keuken.ruimteNr) ?? []).length;
      const drempel = volgendeAanrechtDrempel(keuken.aanrechtlengteM, n, ctx.tarievenset.keukenAanrechtBasispunten);
      if (drempel === undefined) continue;
      kandidaten.push({
        sleutel: `K-03#keuken:${keuken.ruimteNr}`,
        maatregelId: 'K-03',
        doel: { soort: 'keuken', nr: keuken.ruimteNr },
        hoeveelheid: 1,
        parameters: { nieuweLengteM: drempel },
        omschrijving: `Aanrecht verlengen naar ${drempel} m (keuken, ruimte ${keuken.ruimteNr})`,
      });
    }
    return kandidaten;
  },
  mutaties(_ctx, kandidaat) {
    return [
      { soort: 'keuken-wijzigen', ruimteNr: kandidaat.doel.nr!, patch: { aanrechtlengteM: kandidaat.parameters!.nieuweLengteM } },
    ];
  },
};

/** Bouwt een eenvoudige "zet deze ene extra voorziening aan"-maatregel voor R5. */
function eenvoudigeExtraMaatregel(
  id: string,
  ontbreekt: (extra: KeukenExtraVoorzieningen) => boolean,
  patch: Partial<KeukenExtraVoorzieningen>,
  omschrijving: (ruimteNr: number) => string,
  interpretatie?: string,
): MaatregelDefinitie {
  return {
    id,
    doelSoort: 'keuken',
    vergunningKlasse: 'geen',
    vergunningBrontekst: 'Nee',
    puntenrelevant: true,
    kandidaten(ctx) {
      return ctx.pand.keukens
        .filter((k) => !ontbreekt(k.extra))
        .map((k) => ({
          sleutel: `${id}#keuken:${k.ruimteNr}`,
          maatregelId: id,
          doel: { soort: 'keuken' as const, nr: k.ruimteNr },
          hoeveelheid: 1,
          omschrijving: omschrijving(k.ruimteNr),
          interpretatie,
        }));
    },
    mutaties(ctx, kandidaat) {
      const keuken = ctx.pand.keukens.find((k) => k.ruimteNr === kandidaat.doel.nr);
      if (!keuken) return [];
      return [{ soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { extra: { ...keuken.extra, ...patch } } }];
    },
  };
}

const K04 = eenvoudigeExtraMaatregel(
  'K-04',
  (extra) => extra.koelkast,
  { koelkast: true },
  (r) => `Inbouwkoelkast plaatsen (keuken, ruimte ${r})`,
);

/** K-05 — inductiekookplaat: "vervangen" impliceert de andere kookplaattypen expliciet uitzetten. */
const K05 = eenvoudigeExtraMaatregel(
  'K-05',
  (extra) => extra.kookplaatInductie,
  { kookplaatInductie: true, kookplaatKeramisch: false, kookplaatGas: false },
  (r) => `Inductiekookplaat plaatsen (keuken, ruimte ${r})`,
  '"Vervangen" — bestaande keramische/gaskookplaat wordt uitgezet, niet naast de inductiekookplaat meegeteld.',
);

const K06 = eenvoudigeExtraMaatregel(
  'K-06',
  (extra) => extra.afzuiginstallatie,
  { afzuiginstallatie: true },
  (r) => `Afzuigkap met afvoer naar buiten (keuken, ruimte ${r})`,
);

const K07 = eenvoudigeExtraMaatregel(
  'K-07',
  (extra) => extra.magnetron,
  { magnetron: true },
  (r) => `Combimagnetron of oven inbouwen (keuken, ruimte ${r})`,
  'Alleen magnetron meegeteld — een echte combimagnetron/oven telt volgens §2.5.4 als twee voorzieningen, maar de catalogustekst specificeert dat niet.',
);

const K08 = eenvoudigeExtraMaatregel(
  'K-08',
  (extra) => extra.vaatwasmachine,
  { vaatwasmachine: true },
  (r) => `Vaatwasser inbouwen incl. aansluiting (keuken, ruimte ${r})`,
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r5KeukenMaatregelen: MaatregelDefinitie<any>[] = [K01, K02, K03, K04, K05, K06, K07, K08, K09];
