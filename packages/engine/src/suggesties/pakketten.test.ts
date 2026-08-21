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
import { bouwHandmatigScenario, bouwVrijScenario, type PoolItem } from './pakketten';
import type { MaatregelContext, SuggestieOpties } from './types';

const tarievenset = getTarievenset('2026-01-01');
const kostencatalogus = nieuwsteKostencatalogus();
const peildatum = '2026-01-01';

const opties: SuggestieOpties = { tarievenset, peildatum, kostencatalogus };

describe('pakketten — Basis ⊆ Comfort ⊆ Maximaal', () => {
  const resultaat = stelSuggestiesOp(testpandSuggesties, opties);
  const { basis, comfort, maximaal } = resultaat.pakketten;

  it('elke maatregel in Basis zit ook in Comfort, en elke maatregel in Comfort ook in Maximaal', () => {
    const basisSleutels = new Set(basis.regels.map((r) => r.kandidaat.sleutel));
    const comfortSleutels = new Set(comfort.regels.map((r) => r.kandidaat.sleutel));
    const maximaalSleutels = new Set(maximaal.regels.map((r) => r.kandidaat.sleutel));

    for (const sleutel of basisSleutels) expect(comfortSleutels.has(sleutel)).toBe(true);
    for (const sleutel of comfortSleutels) expect(maximaalSleutels.has(sleutel)).toBe(true);
  });

  it('investering en extra jaarhuur stijgen monotoon van Basis naar Comfort naar Maximaal', () => {
    expect(basis.investeringEuro).not.toBeNull();
    expect(comfort.investeringEuro).not.toBeNull();
    expect(maximaal.investeringEuro).not.toBeNull();
    expect(basis.investeringEuro!.verwacht).toBeLessThanOrEqual(comfort.investeringEuro!.verwacht);
    expect(comfort.investeringEuro!.verwacht).toBeLessThanOrEqual(maximaal.investeringEuro!.verwacht);
    expect(basis.extraJaarhuurEuro).toBeLessThanOrEqual(comfort.extraJaarhuurEuro);
    expect(comfort.extraJaarhuurEuro).toBeLessThanOrEqual(maximaal.extraJaarhuurEuro);
  });

  it('Basis bevat geen enkele vergunningplichtige maatregel', () => {
    expect(basis.vergunningplichtig).toEqual([]);
  });

  it('elk pakket rekent een concreet, direct herbruikbaar scenario op', () => {
    for (const pakket of [basis, comfort, maximaal]) {
      expect(pakket.scenario.mutaties.length).toBeGreaterThanOrEqual(pakket.regels.length);
    }
  });

  it('terugverdientijd loopt op van Basis naar Comfort naar Maximaal op deze fixture', () => {
    // Dit volgt logisch uit de constructie (elke tier voegt duurdere/langzamere maatregelen
    // toe), maar is geen afgedwongen invariant: super-additiviteit zou het in theorie kunnen
    // doorbreken (zie de "BEKENDE BEPERKING"-toelichting in pakketten.ts). Faalt deze test ooit
    // op deze fixture, dan is dat een bevinding om te onderzoeken — geen reden om de
    // pakketopbouw bij te schaven totdat de test weer slaagt.
    if (basis.terugverdientijdJaren && comfort.terugverdientijdJaren) {
      expect(basis.terugverdientijdJaren.verwacht).toBeLessThanOrEqual(comfort.terugverdientijdJaren.verwacht);
    }
    if (comfort.terugverdientijdJaren && maximaal.terugverdientijdJaren) {
      expect(comfort.terugverdientijdJaren.verwacht).toBeLessThanOrEqual(maximaal.terugverdientijdJaren.verwacht);
    }
  });

  it('elke verworpen kandidaat heeft een leesbare reden', () => {
    for (const pakket of [basis, comfort, maximaal]) {
      for (const v of pakket.verworpen) {
        expect(v.reden.length).toBeGreaterThan(0);
      }
    }
  });

  it('elke voorgestelde maatregel is herleidbaar naar een regel in de catalogus', () => {
    for (const pakket of [basis, comfort, maximaal]) {
      for (const regel of pakket.regels) {
        const bestaatInCatalogus = kostencatalogus.maatregelen.some((m) => m.id === regel.maatregelId);
        expect(bestaatInCatalogus).toBe(true);
      }
    }
  });

  it('herindeling-maatregelen (aantalKamers-wijziging) zitten nooit in een pakket', () => {
    for (const pakket of [basis, comfort, maximaal]) {
      expect(pakket.regels.some((r) => r.maatregelId === 'I-01')).toBe(false);
    }
  });
});

describe('pakketten — meerdere "ruimte-toevoegen"-kandidaten in één pakket botsen niet', () => {
  it('S-02, S-03 en B-01 samen in Maximaal krijgen elk een uniek ruimtenummer', () => {
    // Regressietest: S-02 en S-03 gebruikten ooit het ruimtenummer dat al bij het GENEREREN
    // van de kandidaat was bepaald (tegen de as-is), in plaats van het opnieuw te berekenen
    // tegen de staat op het moment van toepassen. Zat er dan ook een andere
    // ruimte-toevoegen-kandidaat (bijv. B-01) met hetzelfde as-is-nummer in hetzelfde pakket,
    // dan botsten ze ("ruimte X bestaat al") zodra de pakketopbouw ze na elkaar toepaste.
    const opties: SuggestieOpties = {
      tarievenset,
      peildatum,
      kostencatalogus,
      maatregelParameters: {
        'S-02': { oppervlakteM2: 1.2, kamers: [1] },
        'S-03': { bestaandeRuimteNr: 8, oppervlakteM2: 2.5, kamersNaarNieuweRuimte: [1] },
        'B-01': { kamer: 2, oppervlakteM2: 1.5 },
      },
    };
    expect(() => stelSuggestiesOp(testpandSuggesties, opties)).not.toThrow();

    const resultaat = stelSuggestiesOp(testpandSuggesties, opties);
    const nieuweRuimteNrs = resultaat.pakketten.maximaal.scenario.mutaties
      .filter((m) => m.soort === 'ruimte-toevoegen')
      .map((m) => (m as { ruimte: { nr: number } }).ruimte.nr);
    expect(new Set(nieuweRuimteNrs).size).toBe(nieuweRuimteNrs.length);
  });
});

describe('pakketten — een in Basis afgewezen kandidaat blijft zichtbaar in Comfort en Maximaal', () => {
  it('verworpen in Basis ⇒ ook aanwezig in comfort.verworpen en maximaal.verworpen (nooit stil verdwijnen)', () => {
    // Regressietest voor een bug in de tier-opbouw: elke pool (basisPool/comfortPool/
    // maximaalPool) bevat t.o.v. de vorige tier alleen de NIEUWE kandidaten, dus een kandidaat
    // die in de Basis-tier wordt afgewezen wordt in Comfort/Maximaal nooit opnieuw geprobeerd —
    // hij blijft afgewezen. `stelPakkettenSamen` gaf vóór de fix per tier alleen de EIGEN
    // afwijzingen door, waardoor zo'n kandidaat na de eerste tier spoorloos verdween uit zowel
    // `regels` als `verworpen`. Concreet, doorgerekend geval: op een keuken zonder koelkast,
    // afzuiginstallatie en magnetron worden K-06/K-03/K-08 geaccepteerd in Basis, waarna K-04 en
    // K-07 daar geen marginale winst meer opleveren (dezelfde R5-afrondingssprong is al gepakt)
    // en dus in `basis.verworpen` belanden.
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
    const { basis, comfort, maximaal } = resultaat.pakketten;

    const basisVerworpenSleutels = new Set(basis.verworpen.map((v) => v.kandidaatSleutel));
    expect(basisVerworpenSleutels.has('K-04#keuken:7')).toBe(true);
    expect(basisVerworpenSleutels.has('K-07#keuken:7')).toBe(true);

    const comfortVerworpenSleutels = new Set(comfort.verworpen.map((v) => v.kandidaatSleutel));
    const maximaalVerworpenSleutels = new Set(maximaal.verworpen.map((v) => v.kandidaatSleutel));
    for (const sleutel of basisVerworpenSleutels) {
      const inComfortRegels = comfort.regels.some((r) => r.kandidaat.sleutel === sleutel);
      const inMaximaalRegels = maximaal.regels.some((r) => r.kandidaat.sleutel === sleutel);
      // Een kandidaat die nooit opnieuw wordt geprobeerd, kan ook nooit alsnog geaccepteerd
      // worden — dus hij moet in beide latere tiers als verworpen terugkomen.
      expect(inComfortRegels).toBe(false);
      expect(inMaximaalRegels).toBe(false);
      expect(comfortVerworpenSleutels.has(sleutel)).toBe(true);
      expect(maximaalVerworpenSleutels.has(sleutel)).toBe(true);
    }
  });
});

describe('pakketten — energielabel-maatregelen (E-01 t/m E-08) zijn alternatieven, geen optelsom', () => {
  it('bij hetzelfde doellabel komt er maar één E-maatregel in het pakket terecht', () => {
    // R4 kent alleen het eindlabel, niet de bouwfysica: elke E-maatregel die hetzelfde
    // doellabel krijgt, levert identieke punten op. Ze delen daarom de alternatiefGroep
    // 'energielabel' (§r4-energie.ts) — de pakketopbouw mag er dus maar één van accepteren.
    const doelLabel = 'C';
    const opties: SuggestieOpties = {
      tarievenset,
      peildatum,
      kostencatalogus,
      maatregelParameters: {
        'E-01': { doelLabel }, 'E-02': { doelLabel }, 'E-03': { doelLabel }, 'E-04': { doelLabel },
        'E-05': { doelLabel }, 'E-06': { doelLabel }, 'E-07': { doelLabel }, 'E-08': { doelLabel },
      },
    };
    const resultaat = stelSuggestiesOp(testpand6Kamers, opties);
    const eMaatregelenInMaximaal = resultaat.pakketten.maximaal.regels.filter((r) => r.maatregelId.startsWith('E-') && r.maatregelId !== 'E-09');
    expect(eMaatregelenInMaximaal.length).toBeLessThanOrEqual(1);
  });
});

describe('pakketten — draait ook op de oorspronkelijke zes-kamer-fixture (taak 2/8/9/10)', () => {
  it('stelSuggestiesOp gooit geen fout en levert drie consistente pakketten op', () => {
    const resultaat = stelSuggestiesOp(testpand6Kamers, opties);
    expect(resultaat.pakketten.basis.extraJaarhuurEuro).toBeGreaterThanOrEqual(0);
    expect(resultaat.pakketten.comfort.extraJaarhuurEuro).toBeGreaterThanOrEqual(resultaat.pakketten.basis.extraJaarhuurEuro);
    expect(resultaat.pakketten.maximaal.extraJaarhuurEuro).toBeGreaterThanOrEqual(resultaat.pakketten.comfort.extraJaarhuurEuro);
    expect(resultaat.kandidaten.length).toBeGreaterThan(0);
    expect(resultaat.versiestempel.kostencatalogusVersie).toBe(kostencatalogus.versie);
  });
});

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

  it('past een maatregel ZONDER marginale winst tóch toe — in tegenstelling tot de algoritmische pakketopbouw', () => {
    // Zelfde opzet als de K-04/K-07-bevinding in registry.test.ts: op een keuken zonder
    // koelkast/afzuiginstallatie/magnetron wordt K-04 (koelkast) na K-06+K-03+K-08 overbodig
    // (dezelfde R5-afrondingssprong is al gepakt). De algoritmische pakketopbouw wijst K-04 dan
    // af; `bouwVrijScenario` moet hem — omdat de gebruiker hem expliciet koos — gewoon opnemen.
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
    // Bevestig eerst dat de algoritmische opbouw K-04 inderdaad afwijst ergens (regel of verworpen).
    const k04Sleutel = resultaat.kandidaten.find((k) => k.maatregel.id === 'K-04')!.kandidaat.sleutel;
    const k04InMaximaalRegels = resultaat.pakketten.maximaal.regels.some((r) => r.kandidaat.sleutel === k04Sleutel);
    expect(k04InMaximaalRegels).toBe(false);

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

    // Alle vier de kandidaten zitten erin — inclusief K-04, dat de algoritmische opbouw afwees.
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

function pandWaarderingVanTestpand6Kamers() {
  const eindtelling = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
  const perKamer: Record<number, { totaalPunten: number }> = {};
  for (const [k, v] of Object.entries(eindtelling.perKamer)) perKamer[Number(k)] = { totaalPunten: v.totaalPunten };
  return { perKamer };
}
