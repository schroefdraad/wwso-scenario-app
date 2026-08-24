import { z } from 'zod';
import { ruimtesPerKamer } from '../../rubrieken/gedeeld';
import type { Mutatie } from '../../scenario/index';
import type { MaatregelContext, MaatregelDefinitie } from '../types';
import { vereistParameter, volgendeVrijeRuimteNr } from './hulp';

function priveVertrekVan(ctx: MaatregelContext, kamer: number) {
  const ruimtes = ruimtesPerKamer(ctx.pand).get(kamer) ?? [];
  return ruimtes.find((r) => r.ruimte.type === 'Privévertrek' && r.nKamersMetToegang === 1)?.ruimte;
}

/**
 * S-01 — eigen wastafel op de kamer. Bestaat er al sanitair op de privéruimte, dan wordt de
 * wastafel erbij gezet.
 *
 * Bugfix (2026-08-24, gevonden door de gebruiker op de Crooswijkseweg-testdeal): buiten een
 * badkamer geldt een cap van 1 punt per vertrek voor wastafels (§2.6.1, `wastafelPuntenPerVertrekBuitenBadkamer`)
 * — de privé-doelruimte van deze maatregel is per definitie nooit een badkamer (`priveVertrekVan`
 * filtert op 'Privévertrek'). Had die kamer al 1 wastafel (1 punt, dus al aan de cap), dan
 * leverde "nog een wastafel erbij" altijd 0 extra punten op — de maatregel werd toch aangeboden,
 * mét investeringsbedrag, voor 0 punten winst. Nu wordt eerst gecontroleerd of de volgende
 * wastafel de cap daadwerkelijk verder vult (zelfde soort drempel-check als K-03 al deed voor het
 * aanrecht) — is dat niet zo, dan verschijnt de kandidaat niet.
 */
const S01: MaatregelDefinitie = {
  id: 'S-01',
  doelSoort: 'kamer',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    const { wastafel } = ctx.tarievenset.sanitairBasisPunten;
    const { wastafelPuntenPerVertrekBuitenBadkamer: cap } = ctx.tarievenset.sanitairMaxima;
    const bestaandBijRuimte = new Map(ctx.pand.sanitair.map((s) => [s.ruimteNr, s] as const));
    const kandidaten = [];
    for (let kamer = 1; kamer <= ctx.pand.pand.aantalKamers; kamer++) {
      const vertrek = priveVertrekVan(ctx, kamer);
      if (!vertrek) continue;
      const bestaand = bestaandBijRuimte.get(vertrek.nr);
      const huidigeWastafels = bestaand?.aantalWastafels ?? 0;
      const huidigePunten = Math.min(huidigeWastafels * wastafel, cap);
      const puntenMetErbij = Math.min((huidigeWastafels + 1) * wastafel, cap);
      if (puntenMetErbij <= huidigePunten) continue;
      kandidaten.push({
        sleutel: `S-01#kamer:${kamer}`,
        maatregelId: 'S-01',
        doel: { soort: 'kamer' as const, nr: kamer },
        hoeveelheid: 1,
        omschrijving: bestaand
          ? `Extra wastafel op kamer ${kamer} (ruimte ${vertrek.nr})`
          : `Wastafel op kamer ${kamer} (ruimte ${vertrek.nr})`,
      });
    }
    return kandidaten;
  },
  mutaties(ctx, kandidaat) {
    const vertrek = priveVertrekVan(ctx, kandidaat.doel.nr!);
    if (!vertrek) return [];
    const bestaand = ctx.pand.sanitair.find((s) => s.ruimteNr === vertrek.nr);
    if (bestaand) {
      return [{ soort: 'sanitair-wijzigen', ruimteNr: vertrek.nr, patch: { aantalWastafels: bestaand.aantalWastafels + 1 } }];
    }
    return [
      {
        soort: 'sanitair-toevoegen',
        sanitair: {
          ruimteNr: vertrek.nr,
          toiletType: 'Geen',
          aantalWastafels: 1,
          aantalMeerpersoonswastafels: 0,
          douche: false,
          bad: false,
          badDoucheCombinatie: false,
          extraEisen: {
            waterdichteVloerafwerking: false,
            vrijeHoogte2MeterOverHelft: false,
            waterdichteWandafwerking: false,
            wastafelMetMengkraanEnSpiegel: false,
            doucheOfBadMetWarmEnKoudWater: false,
          },
          extra: {
            bubbelfunctieBad: false,
            doucheafscheidingVolledig: false,
            aantalHanddoekenradiatoren: 0,
            ingebouwdKastjeMetWastafel: false,
            kastruimte: false,
            aantalStopcontacten: 0,
            eenhandsmengkraan: false,
            thermostatischeMengkraan: false,
          },
        },
      },
    ];
  },
};

interface S02Params {
  oppervlakteM2: number;
  kamers: number[];
}

/** S-02 — nieuwe toiletruimte. Ontbrekend pandgegeven (waar, hoe groot, voor wie): verplichte parameter. */
const S02: MaatregelDefinitie<S02Params> = {
  id: 'S-02',
  doelSoort: 'ruimte',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Soms melding',
  puntenrelevant: true,
  vereist: ['S-06'],
  parameterSchema: z.object({ oppervlakteM2: z.number().positive(), kamers: z.array(z.number().int().min(1).max(12)).min(1) }),
  nietBeoordeeldReden: vereistParameter(
    'vereist de oppervlakte van de nieuwe toiletruimte en welke kamers er toegang toe krijgen (geen aanname over de locatie mogelijk)',
  ),
  kandidaten(ctx, parameters) {
    if (!parameters) return [];
    const nieuwNr = Math.max(0, ...ctx.pand.ruimtes.map((r) => r.nr)) + 1;
    if (nieuwNr > 40) return [];
    return [
      {
        sleutel: `S-02#nieuw`,
        maatregelId: 'S-02',
        doel: { soort: 'ruimte', nr: nieuwNr },
        hoeveelheid: 1,
        parameters,
        omschrijving: `Nieuwe toiletruimte (${parameters.oppervlakteM2} m²) voor kamer(s) ${parameters.kamers.join(', ')}`,
      },
    ];
  },
  mutaties(ctx, kandidaat) {
    const p = kandidaat.parameters!;
    // Nooit kandidaat.doel.nr hergebruiken: die is vastgelegd tegen de as-is op
    // generatiemoment. Bij pakketopbouw kan intussen een andere ruimte-toevoegen-mutatie (bijv.
    // B-01) hetzelfde nummer al hebben ingenomen — opnieuw berekenen tegen de HUIDIGE staat
    // voorkomt een botsing (zelfde incrementele regel als bij de keuken/sanitair-patches).
    const nr = volgendeVrijeRuimteNr(ctx.pand);
    if (nr === undefined) return [];
    const mutaties: Mutatie[] = [
      {
        soort: 'ruimte-toevoegen',
        ruimte: { nr, naam: `Nieuwe toiletruimte (${nr})`, type: 'Toiletruimte', oppervlakteM2: p.oppervlakteM2, verdieping: 0, verwarmd: false, verkoeld: false },
        kamers: p.kamers,
      },
      {
        soort: 'sanitair-toevoegen',
        sanitair: {
          ruimteNr: nr,
          toiletType: 'Staand in toiletruimte',
          aantalWastafels: 0,
          aantalMeerpersoonswastafels: 0,
          douche: false,
          bad: false,
          badDoucheCombinatie: false,
          extraEisen: {
            waterdichteVloerafwerking: false,
            vrijeHoogte2MeterOverHelft: false,
            waterdichteWandafwerking: false,
            wastafelMetMengkraanEnSpiegel: false,
            doucheOfBadMetWarmEnKoudWater: false,
          },
          extra: {
            bubbelfunctieBad: false,
            doucheafscheidingVolledig: false,
            aantalHanddoekenradiatoren: 0,
            ingebouwdKastjeMetWastafel: false,
            kastruimte: false,
            aantalStopcontacten: 0,
            eenhandsmengkraan: false,
            thermostatischeMengkraan: false,
          },
        },
      },
    ];
    return mutaties;
  },
};

interface S03Params {
  bestaandeRuimteNr: number;
  oppervlakteM2: number;
  kamersNaarNieuweRuimte: number[];
}

/** S-03 — extra douche/tweede badkamer door een bestaande badruimte te splitsen. Ontbrekend pandgegeven: verplichte parameter. */
const S03: MaatregelDefinitie<S03Params> = {
  id: 'S-03',
  doelSoort: 'ruimte',
  vergunningKlasse: 'mogelijk-melding',
  vergunningBrontekst: 'Vaak melding',
  puntenrelevant: true,
  vereist: ['S-06'],
  parameterSchema: z.object({
    bestaandeRuimteNr: z.number().int().min(1).max(40),
    oppervlakteM2: z.number().positive(),
    kamersNaarNieuweRuimte: z.array(z.number().int().min(1).max(12)).min(1),
  }),
  nietBeoordeeldReden: vereistParameter(
    'vereist welke badruimte gesplitst wordt, de oppervlakte van de nieuwe badruimte en welke kamers ernaartoe verhuizen (geen aanname over de locatie mogelijk)',
  ),
  kandidaten(ctx, parameters) {
    if (!parameters) return [];
    const bestaand = ctx.pand.sanitair.find((s) => s.ruimteNr === parameters.bestaandeRuimteNr);
    if (!bestaand) return [];
    const nieuwNr = Math.max(0, ...ctx.pand.ruimtes.map((r) => r.nr)) + 1;
    if (nieuwNr > 40) return [];
    return [
      {
        sleutel: `S-03#ruimte:${parameters.bestaandeRuimteNr}`,
        maatregelId: 'S-03',
        doel: { soort: 'ruimte', nr: nieuwNr },
        hoeveelheid: 1,
        parameters,
        omschrijving: `Badruimte ${parameters.bestaandeRuimteNr} splitsen: nieuwe badruimte (${parameters.oppervlakteM2} m²) voor kamer(s) ${parameters.kamersNaarNieuweRuimte.join(', ')}`,
        interpretatie: 'De nieuwe badruimte krijgt dezelfde toilet-/wastafel-/douchebasis als de bestaande — extra voorzieningen worden niet gekopieerd.',
      },
    ];
  },
  mutaties(ctx, kandidaat) {
    const p = kandidaat.parameters!;
    // Zie S-02 hierboven: nr opnieuw berekenen tegen de huidige staat, nooit kandidaat.doel.nr hergebruiken.
    const nr = volgendeVrijeRuimteNr(ctx.pand);
    if (nr === undefined) return [];
    const bestaandeRuimte = ctx.pand.ruimtes.find((r) => r.nr === p.bestaandeRuimteNr);
    const bestaandeToewijzing = ctx.pand.toewijzing.find((t) => t.ruimteNr === p.bestaandeRuimteNr);
    const bestaandSanitair = ctx.pand.sanitair.find((s) => s.ruimteNr === p.bestaandeRuimteNr)!;
    const overigeKamers = (bestaandeToewijzing?.kamers ?? []).filter((k) => !p.kamersNaarNieuweRuimte.includes(k));

    const mutaties: Mutatie[] = [
      {
        soort: 'ruimte-toevoegen',
        ruimte: {
          nr,
          naam: `Nieuwe badruimte (${nr})`,
          type: 'Badruimte',
          oppervlakteM2: p.oppervlakteM2,
          verdieping: bestaandeRuimte?.verdieping ?? 0,
          verwarmd: true,
          verkoeld: false,
        },
        kamers: p.kamersNaarNieuweRuimte,
      },
      {
        soort: 'sanitair-toevoegen',
        sanitair: {
          ruimteNr: nr,
          toiletType: bestaandSanitair.toiletType,
          aantalWastafels: bestaandSanitair.aantalWastafels,
          aantalMeerpersoonswastafels: 0,
          douche: bestaandSanitair.douche,
          bad: false,
          badDoucheCombinatie: false,
          extraEisen: { ...bestaandSanitair.extraEisen },
          extra: {
            bubbelfunctieBad: false,
            doucheafscheidingVolledig: false,
            aantalHanddoekenradiatoren: 0,
            ingebouwdKastjeMetWastafel: false,
            kastruimte: false,
            aantalStopcontacten: 0,
            eenhandsmengkraan: false,
            thermostatischeMengkraan: false,
          },
        },
      },
    ];
    if (overigeKamers.length > 0) {
      mutaties.push({ soort: 'toewijzing-wijzigen', ruimteNr: p.bestaandeRuimteNr, kamers: overigeKamers });
    }
    return mutaties;
  },
};

/** S-04 — thermostatische douchekraan op elke douche/bad zonder één. */
const S04: MaatregelDefinitie = {
  id: 'S-04',
  doelSoort: 'sanitair',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    return ctx.pand.sanitair
      .filter((s) => (s.douche || s.bad || s.badDoucheCombinatie) && !s.extra.thermostatischeMengkraan)
      .map((s) => ({
        sleutel: `S-04#sanitair:${s.ruimteNr}`,
        maatregelId: 'S-04',
        doel: { soort: 'sanitair' as const, nr: s.ruimteNr },
        hoeveelheid: 1,
        omschrijving: `Thermostatische douchekraan (ruimte ${s.ruimteNr})`,
      }));
  },
  mutaties(ctx, kandidaat) {
    const s = ctx.pand.sanitair.find((x) => x.ruimteNr === kandidaat.doel.nr);
    if (!s) return [];
    return [{ soort: 'sanitair-wijzigen', ruimteNr: s.ruimteNr, patch: { extra: { ...s.extra, thermostatischeMengkraan: true } } }];
  },
};

/** S-05 — handdoekradiator in elke badruimte. */
const S05: MaatregelDefinitie = {
  id: 'S-05',
  doelSoort: 'sanitair',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  kandidaten(ctx) {
    const ruimteBijNr = new Map(ctx.pand.ruimtes.map((r) => [r.nr, r] as const));
    return ctx.pand.sanitair
      .filter((s) => ruimteBijNr.get(s.ruimteNr)?.type === 'Badruimte')
      .map((s) => ({
        sleutel: `S-05#sanitair:${s.ruimteNr}`,
        maatregelId: 'S-05',
        doel: { soort: 'sanitair' as const, nr: s.ruimteNr },
        hoeveelheid: 1,
        omschrijving: `Handdoekradiator (badruimte ${s.ruimteNr})`,
      }));
  },
  mutaties(ctx, kandidaat) {
    const s = ctx.pand.sanitair.find((x) => x.ruimteNr === kandidaat.doel.nr);
    if (!s) return [];
    return [
      {
        soort: 'sanitair-wijzigen',
        ruimteNr: s.ruimteNr,
        patch: { extra: { ...s.extra, aantalHanddoekenradiatoren: s.extra.aantalHanddoekenradiatoren + 1 } },
      },
    ];
  },
};

/** S-06 — ventilatie badruimte. Zuivere kostenrider van S-02/S-03. */
const S06: MaatregelDefinitie = {
  id: 'S-06',
  doelSoort: 'ruimte',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: false,
  kandidaten: () => [],
  mutaties: () => [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r6SanitairMaatregelen: MaatregelDefinitie<any>[] = [S01, S02, S03, S04, S05, S06];
