import { describe, expect, it } from 'vitest';
import { getTarievenset, nieuwsteKostencatalogus } from '@wwso/data';
import { testpandSuggesties } from '../fixtures/testpand-suggesties';
import { testpand6Kamers } from '../fixtures/testpand-6kamers';
import { pasScenarioToe } from '../scenario/index';
import { berekenEindtelling } from '../eindtelling/index';
import { stelSuggestiesOp } from './suggesties';
import { analyseerMarge } from './marge-analyse';
import { standaardRegistry } from './registry/index';
import { nieuwBudget } from './waardering';
import { bouwEnergielabelScenario, bouwHandmatigScenario, bouwHandmatigScenarioMetMaatregelen, bouwVrijScenario, type PoolItem } from './pakketten';
import { genereerEnWaardeerKandidaten } from './suggesties';
import type { MaatregelContext, SuggestieOpties } from './types';

const tarievenset = getTarievenset('2026-01-01');
const kostencatalogus = nieuwsteKostencatalogus();
const peildatum = '2026-01-01';

const opties: SuggestieOpties = { tarievenset, peildatum, kostencatalogus };

describe('bouwVrijScenario — vrij samengesteld scenario (taak 14: "maatregelen aan- en uitzetten")', () => {
  function pool(sleutels: string[]): PoolItem[] {
    const resultaat = stelSuggestiesOp(testpandSuggesties, opties);
    return sleutels.map((sleutel) => {
      const kandidaat = resultaat.kandidaten.find((k) => k.kandidaat.sleutel === sleutel);
      if (!kandidaat) throw new Error(`Kandidaat ${sleutel} niet gevonden in de solo-resultaten.`);
      const definitie = standaardRegistry.get(kandidaat.maatregel.id)!;
      return { waardering: kandidaat, definitie };
    });
  }

  function ctxVoor(pand: typeof testpandSuggesties): MaatregelContext {
    const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
    const marge = analyseerMarge(pand, tarievenset, eindtelling);
    return { pand, tarievenset, peildatum, eindtelling, marge };
  }

  it('past exact de gekozen kandidaten toe, in een scenario met de opgegeven naam', () => {
    const resultaat = stelSuggestiesOp(testpandSuggesties, opties);
    const sleutel = resultaat.kandidaten.find((k) => k.maatregel.id === 'S-04')!.kandidaat.sleutel;
    const scenario = bouwVrijScenario(
      'Mijn eigen scenario',
      testpandSuggesties,
      pool([sleutel]),
      ctxVoor(testpandSuggesties),
      tarievenset,
      peildatum,
      kostencatalogus,
      kostencatalogus.aannames.prijspeilJaar,
      undefined,
      nieuwBudget(2000),
    );
    expect(scenario.naam).toBe('Mijn eigen scenario');
    expect(scenario.regels).toHaveLength(1);
    expect(scenario.regels[0].kandidaat.sleutel).toBe(sleutel);
    expect(scenario.scenario.mutaties.length).toBeGreaterThan(0);
  });

  it('past een maatregel ZONDER marginale winst tóch toe', () => {
    // Zelfde opzet als de K-04/K-07-bevinding in registry.test.ts: op een keuken zonder
    // koelkast/afzuiginstallatie/magnetron wordt K-04 (koelkast) na K-06+K-03+K-08 overbodig
    // (dezelfde R5-afrondingssprong is al gepakt) — `bouwVrijScenario` moet hem, omdat de
    // gebruiker hem expliciet koos, gewoon opnemen (met een marginale bijdrage van 0).
    const keukenZonderExtras = pasScenarioToe(testpand6Kamers, [
      {
        soort: 'keuken-wijzigen',
        ruimteNr: 7,
        patch: {
          extra: {
            afzuiginstallatie: false, kookplaatInductie: false, kookplaatKeramisch: true, kookplaatGas: false,
            koelkast: false, vrieskast: false, ovenElektrisch: false, ovenGas: false, magnetron: false,
            vaatwasmachine: false, extraKastruimteEenhedenVan60Cm: 1, eenhandsmengkraan: true,
            thermostatischeMengkraan: false, kokendWaterfunctie: false,
          },
        },
      },
    ]);

    const resultaat = stelSuggestiesOp(keukenZonderExtras, opties);
    const sleutels = ['K-06', 'K-03', 'K-08', 'K-04']
      .map((id) => resultaat.kandidaten.find((k) => k.maatregel.id === id)!.kandidaat.sleutel);
    const regels = sleutels.map((sleutel) => {
      const kandidaat = resultaat.kandidaten.find((k) => k.kandidaat.sleutel === sleutel)!;
      const definitie = standaardRegistry.get(kandidaat.maatregel.id)!;
      return { waardering: kandidaat, definitie };
    });

    const scenario = bouwVrijScenario(
      'Handmatig: keuken compleet',
      keukenZonderExtras,
      regels,
      ctxVoor(keukenZonderExtras),
      tarievenset,
      peildatum,
      kostencatalogus,
      kostencatalogus.aannames.prijspeilJaar,
      undefined,
      nieuwBudget(2000),
    );

    // Alle vier de kandidaten zitten erin — inclusief K-04, ook al draagt hij niets bij.
    expect(scenario.regels.map((r) => r.maatregelId).sort()).toEqual(['K-03', 'K-04', 'K-06', 'K-08'].sort());
    // K-04's marginale bijdrage (leave-one-out) mag terecht 0 zijn — dat is precies de eerlijke
    // informatie die de gebruiker hoort te zien, geen reden om de maatregel weg te laten.
    const k04Regel = scenario.regels.find((r) => r.maatregelId === 'K-04')!;
    expect(k04Regel.marginaleBijdrageJaarhuurEuro).toBe(0);
  });

  it('toggle-gedrag: hertelling na het weglaten van één kandidaat regenereert de mutaties correct (geen stale ondiepe-merge)', () => {
    // Dekt hetzelfde patch-clobber-risico als taak 11 (K-04 + K-06 na elkaar toegepast) maar nu
    // via het vrije-scenario-pad: eerst met beide, dan zonder de eerste — de tweede maatregel
    // moet in beide gevallen zijn eigen voorziening behouden, nooit overschreven zien.
    const resultaat = stelSuggestiesOp(testpandSuggesties, opties);
    const s04 = pool([resultaat.kandidaten.find((k) => k.maatregel.id === 'S-04')!.kandidaat.sleutel])[0];
    const s05 = pool([resultaat.kandidaten.find((k) => k.maatregel.id === 'S-05')!.kandidaat.sleutel])[0];

    const metBeide = bouwVrijScenario('Met beide', testpandSuggesties, [s04, s05], ctxVoor(testpandSuggesties), tarievenset, peildatum, kostencatalogus, kostencatalogus.aannames.prijspeilJaar, undefined, nieuwBudget(2000));
    const alleenS05 = bouwVrijScenario('Alleen S-05', testpandSuggesties, [s05], ctxVoor(testpandSuggesties), tarievenset, peildatum, kostencatalogus, kostencatalogus.aannames.prijspeilJaar, undefined, nieuwBudget(2000));

    expect(metBeide.regels).toHaveLength(2);
    expect(alleenS05.regels).toHaveLength(1);
    expect(alleenS05.regels[0].maatregelId).toBe('S-05');
  });
});

describe('bouwHandmatigScenario — vrij bewerkt TO-BE-pand (backlog: AS-IS kopiëren naar een handmatig scenario)', () => {
  it('rekent het bewerkte pand écht door en zet de mutatielijst op precies één vervang-pand-mutatie', () => {
    const bewerkt = pasScenarioToe(testpand6Kamers, [{ soort: 'pand-patch', patch: { energielabel: 'A' } }]);
    const scenario = bouwHandmatigScenario('Mijn scenario', testpand6Kamers, bewerkt, tarievenset, peildatum, nieuwBudget(2000));

    expect(scenario.naam).toBe('Mijn scenario');
    expect(scenario.scenario.mutaties).toEqual([{ soort: 'vervang-pand', pand: bewerkt }]);
    expect(scenario.regels).toHaveLength(0);

    const asIsEindtelling = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
    const bewerktEindtelling = berekenEindtelling(bewerkt, tarievenset, peildatum);
    const asIsJaarhuur = Object.values(asIsEindtelling.perKamer).reduce((s, k) => s + k.maxHuurEuro * 12, 0);
    const bewerktJaarhuur = Object.values(bewerktEindtelling.perKamer).reduce((s, k) => s + k.maxHuurEuro * 12, 0);
    expect(scenario.extraJaarhuurEuro).toBeCloseTo(Math.round((bewerktJaarhuur - asIsJaarhuur) * 100) / 100, 2);
  });

  it('laat investering/terugverdientijd/rendement/ΔBAR expliciet null — geen geraden €0', () => {
    const bewerkt = pasScenarioToe(testpand6Kamers, [{ soort: 'pand-patch', patch: { energielabel: 'A' } }]);
    const scenario = bouwHandmatigScenario('Mijn scenario', testpand6Kamers, bewerkt, tarievenset, peildatum, nieuwBudget(2000));

    expect(scenario.investeringEuro).toBeNull();
    expect(scenario.terugverdientijdJaren).toBeNull();
    expect(scenario.marginaalBrutoRendementPct).toBeNull();
    expect(scenario.deltaBarProcentpunt).toBeNull();
  });

  it('levert exact hetzelfde pand terug als het handmatig bewerkte pand, ongeacht wat er in de as-is verandert', () => {
    const bewerkt = pasScenarioToe(testpand6Kamers, [
      { soort: 'ruimte-wijzigen', ruimteNr: 1, patch: { oppervlakteM2: 25 } },
    ]);
    const scenario = bouwHandmatigScenario('Groter pand', testpand6Kamers, bewerkt, tarievenset, peildatum, nieuwBudget(2000));
    expect(scenario.waardering.perKamer[1]?.totaalPunten).toBeGreaterThan(
      pandWaarderingVanTestpand6Kamers().perKamer[1]?.totaalPunten ?? 0,
    );
  });
});

describe('bouwEnergielabelScenario — doellabel-vergelijking (Tussenfase-taak C, 2026-09-04)', () => {
  it('rekent het doellabel écht door via een pand-patch-mutatie', () => {
    const scenario = bouwEnergielabelScenario('A+++', testpand6Kamers, 'A+++', 5000, tarievenset, peildatum, undefined, nieuwBudget(2000));

    expect(scenario.naam).toBe('A+++');
    expect(scenario.scenario.mutaties).toEqual([{ soort: 'pand-patch', patch: { energielabel: 'A+++', energielabelIngangsdatum: peildatum } }]);
    expect(scenario.regels).toHaveLength(0);

    const asIsEindtelling = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
    const bewerkt = pasScenarioToe(testpand6Kamers, scenario.scenario.mutaties);
    const bewerktEindtelling = berekenEindtelling(bewerkt, tarievenset, peildatum);
    const asIsJaarhuur = Object.values(asIsEindtelling.perKamer).reduce((s, k) => s + k.maxHuurEuro * 12, 0);
    const bewerktJaarhuur = Object.values(bewerktEindtelling.perKamer).reduce((s, k) => s + k.maxHuurEuro * 12, 0);
    expect(bewerktJaarhuur).toBeGreaterThan(asIsJaarhuur);
    expect(scenario.extraJaarhuurEuro).toBeCloseTo(Math.round((bewerktJaarhuur - asIsJaarhuur) * 100) / 100, 2);
  });

  it('gebruikt de meegegeven investering, niet een catalogusprijs', () => {
    const scenario = bouwEnergielabelScenario('A+++', testpand6Kamers, 'A+++', 12345, tarievenset, peildatum, undefined, nieuwBudget(2000));

    expect(scenario.investeringEuro).toEqual({ optimistisch: 12345, verwacht: 12345, pessimistisch: 12345 });
    expect(scenario.terugverdientijdJaren).not.toBeNull();
    expect(scenario.marginaalBrutoRendementPct).not.toBeNull();
  });

  it('laat investering/terugverdientijd/rendement expliciet null zonder ingevulde kosten — geen geraden €0', () => {
    const scenario = bouwEnergielabelScenario('A+++', testpand6Kamers, 'A+++', undefined, tarievenset, peildatum, undefined, nieuwBudget(2000));

    expect(scenario.investeringEuro).toBeNull();
    expect(scenario.terugverdientijdJaren).toBeNull();
    expect(scenario.marginaalBrutoRendementPct).toBeNull();
    expect(scenario.deltaBarProcentpunt).toBeNull();
  });
});

describe('bouwHandmatigScenarioMetMaatregelen — handmatige kamer + standaardmaatregelen samen (backlog 2026-08-22)', () => {
  // Kamer 7 bestaat nog niet in testpand6Kamers (dat kent er 6) — realiseert 'm hier handmatig
  // met een nieuw, onverwarmd privévertrek, exact het scenario uit de melding ("handmatig
  // starten om een extra kamer te realiseren en dan verder maatregelen toevoegen").
  const bewerktPand = pasScenarioToe(testpand6Kamers, [
    { soort: 'pand-patch', patch: { aantalKamers: 7 } },
    {
      soort: 'ruimte-toevoegen',
      ruimte: { nr: 21, naam: 'Nieuwe kamer', type: 'Privévertrek', oppervlakteM2: 14, verdieping: 0, verwarmd: false, verkoeld: false },
      kamers: [7],
    },
  ]);

  it('genereerEnWaardeerKandidaten vindt een maatregel op de NET TOEGEVOEGDE kamer, die in de as-is niet bestaat', () => {
    const asIsResultaat = genereerEnWaardeerKandidaten(testpand6Kamers, tarievenset, peildatum, kostencatalogus, nieuwBudget(2000));
    expect(asIsResultaat.kandidaten.some((k) => k.kandidaat.doel.nr === 21)).toBe(false);

    const bewerktResultaat = genereerEnWaardeerKandidaten(bewerktPand, tarievenset, peildatum, kostencatalogus, nieuwBudget(2000));
    const v01OpNieuweKamer = bewerktResultaat.kandidaten.find((k) => k.maatregel.id === 'V-01' && k.kandidaat.doel.nr === 21);
    expect(v01OpNieuweKamer).toBeDefined();
  });

  it('telt de handmatige investering en de maatregelkosten op tot één Investering/Terugverdientijd — niet langer "onbekend"', () => {
    const bewerktResultaat = genereerEnWaardeerKandidaten(bewerktPand, tarievenset, peildatum, kostencatalogus, nieuwBudget(2000));
    const v01 = bewerktResultaat.kandidaten.find((k) => k.maatregel.id === 'V-01' && k.kandidaat.doel.nr === 21)!;
    const definitie = standaardRegistry.get('V-01')!;
    const regels: PoolItem[] = [{ waardering: v01, definitie }];

    const HANDMATIGE_INVESTERING = 15000;
    const scenario = bouwHandmatigScenarioMetMaatregelen(
      'Kamer 7 + radiator',
      testpand6Kamers,
      bewerktPand,
      regels,
      HANDMATIGE_INVESTERING,
      bewerktResultaat.ctxBasis,
      tarievenset,
      peildatum,
      kostencatalogus,
      kostencatalogus.aannames.prijspeilJaar,
      undefined,
      nieuwBudget(2000),
    );

    expect(scenario.investeringEuro).not.toBeNull();
    expect(scenario.investeringEuro!.verwacht).toBeCloseTo(HANDMATIGE_INVESTERING + v01.investeringEuro.verwacht, 2);
    expect(scenario.terugverdientijdJaren).not.toBeNull();
    expect(scenario.marginaalBrutoRendementPct).not.toBeNull();

    // De jaarhuurwinst is het gecombineerde effect van de nieuwe kamer ÉN de radiator, tegen de
    // ECHTE as-is (niet tegen het al-bewerkte pand) — dus meer dan de radiator alleen zou geven.
    expect(scenario.extraJaarhuurEuro).toBeGreaterThan(v01.extraJaarhuurEuro);

    // De mutatielijst begint met de vervang-pand-mutatie, gevolgd door de maatregelmutatie(s).
    expect(scenario.scenario.mutaties[0]).toEqual({ soort: 'vervang-pand', pand: bewerktPand });
    expect(scenario.scenario.mutaties.length).toBeGreaterThan(1);
  });

  it('zonder gekozen maatregelen (alleen de handmatige investering) is de jaarhuurwinst gelijk aan bouwHandmatigScenario', () => {
    const kaal = bouwHandmatigScenario('Alleen kamer 7', testpand6Kamers, bewerktPand, tarievenset, peildatum, nieuwBudget(2000));
    const bewerktResultaat = genereerEnWaardeerKandidaten(bewerktPand, tarievenset, peildatum, kostencatalogus, nieuwBudget(2000));
    const metNulMaatregelen = bouwHandmatigScenarioMetMaatregelen(
      'Alleen kamer 7 (met investering)',
      testpand6Kamers,
      bewerktPand,
      [],
      5000,
      bewerktResultaat.ctxBasis,
      tarievenset,
      peildatum,
      kostencatalogus,
      kostencatalogus.aannames.prijspeilJaar,
      undefined,
      nieuwBudget(2000),
    );
    expect(metNulMaatregelen.extraJaarhuurEuro).toBeCloseTo(kaal.extraJaarhuurEuro, 2);
    expect(metNulMaatregelen.investeringEuro).toEqual({ optimistisch: 5000, verwacht: 5000, pessimistisch: 5000 });
  });
});

function pandWaarderingVanTestpand6Kamers() {
  const eindtelling = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
  const perKamer: Record<number, { totaalPunten: number }> = {};
  for (const [k, v] of Object.entries(eindtelling.perKamer)) perKamer[Number(k)] = { totaalPunten: v.totaalPunten };
  return { perKamer };
}
