import { describe, expect, it } from 'vitest';
import { getTarievenset, nieuwsteKostencatalogus } from '@wwso/data';
import { berekenEindtelling } from '../../eindtelling/index';
import { testpandSuggesties } from '../../fixtures/testpand-suggesties';
import { testpand6Kamers } from '../../fixtures/testpand-6kamers';
import { pasScenarioToe } from '../../scenario/index';
import { analyseerMarge } from '../marge-analyse';
import { genereerKandidaten } from '../kandidaten';
import type { MaatregelContext, SuggestieOpties } from '../types';
import { standaardRegistry, valideerRegistry } from './index';
import { berekenInvestering } from '../kosten';
import { stelSuggestiesOp } from '../suggesties';

const tarievenset = getTarievenset('2026-01-01');
const kostencatalogus = nieuwsteKostencatalogus();
const peildatum = '2026-01-01';

describe('registry — bijectie en brontekst-drift', () => {
  it('elke catalogusregel heeft precies één registry-definitie en omgekeerd', () => {
    const resultaat = valideerRegistry(standaardRegistry, kostencatalogus);
    expect(resultaat.ontbrekendInRegistry).toEqual([]);
    expect(resultaat.onbekendInCatalogus).toEqual([]);
  });

  it('de registry dekt alle 50 maatregelen uit kostencatalogus 0.1', () => {
    expect(kostencatalogus.maatregelen.length).toBe(50);
    expect(standaardRegistry.size).toBe(50);
  });

  it('de vergunningtekst in de registry is byte-identiek aan de catalogustekst (drift-check)', () => {
    const resultaat = valideerRegistry(standaardRegistry, kostencatalogus);
    expect(resultaat.brontekstDrift).toEqual([]);
  });
});

describe('registry — interpretaties zijn zichtbaar en niet leeg', () => {
  it('elke gegenereerde kandidaat met een interpretatie heeft een niet-lege toelichting', () => {
    const eindtelling = berekenEindtelling(testpandSuggesties, tarievenset, peildatum);
    const marge = analyseerMarge(testpandSuggesties, tarievenset, eindtelling);
    const ctx: MaatregelContext = { pand: testpandSuggesties, tarievenset, peildatum, eindtelling, marge };

    const opties: SuggestieOpties = {
      tarievenset,
      peildatum,
      kostencatalogus,
      maatregelParameters: {
        'S-02': { oppervlakteM2: 1.2, kamers: [1] },
        'S-03': { bestaandeRuimteNr: 8, oppervlakteM2: 2.5, kamersNaarNieuweRuimte: [1] },
        'V-04': { ruimteNrs: [1, 2, 3] },
        'I-02': { ruimteNr: 11, extraOppervlakteM2: 2 },
        'I-03': { ruimteNr: 12, extraOppervlakteM2: 2 },
        'I-05': { ruimteNr: 14, extraOppervlakteM2: 4 },
        'B-01': { kamer: 2, oppervlakteM2: 1.5 },
        'B-02': { kamer: 3, oppervlakteM2: 4 },
        'B-03': { kamer: 5, oppervlakteM2: 6 },
        'E-01': { doelLabel: 'C' },
        'E-02': { doelLabel: 'C' },
        'E-03': { doelLabel: 'C' },
        'E-04': { doelLabel: 'C' },
        'E-06': { doelLabel: 'C' },
        'E-07': { doelLabel: 'C' },
        'E-08': { doelLabel: 'B' },
      },
    };

    const { kandidaten } = genereerKandidaten(ctx, standaardRegistry, kostencatalogus, opties);
    expect(kandidaten.length).toBeGreaterThan(0);

    const metInterpretatie = kandidaten.filter((k) => k.kandidaat.interpretatie !== undefined);
    expect(metInterpretatie.length).toBeGreaterThan(0);
    for (const { kandidaat } of metInterpretatie) {
      expect(kandidaat.interpretatie!.length).toBeGreaterThan(0);
    }
  });
});

describe('registry — hoeveelheid volgt de catalogus-eenheid, niet het aantal geraakte kamers', () => {
  it('X-01 (eenheid "per pand") kost één systeem, ongeacht het aantal kamers dat meedeelt', () => {
    // Regressietest: `hoeveelheid` stuurt de investeringsberekening rechtstreeks aan
    // (kosten.ts vermenigvuldigt de catalogusprijs ermee). X-01 stond hier ooit per ongeluk op
    // `aantalKamers`, wat de investering 6× te hoog liet uitkomen op een zes-kamer-pand.
    const eindtelling = berekenEindtelling(testpandSuggesties, tarievenset, peildatum);
    const marge = analyseerMarge(testpandSuggesties, tarievenset, eindtelling);
    const ctx: MaatregelContext = { pand: testpandSuggesties, tarievenset, peildatum, eindtelling, marge };

    const x01Definitie = standaardRegistry.get('X-01')!;
    const kandidaat = x01Definitie.kandidaten(ctx)[0];
    expect(kandidaat.hoeveelheid).toBe(1);

    const x01Maatregel = kostencatalogus.maatregelen.find((m) => m.id === 'X-01')!;
    expect(x01Maatregel.eenheid).toBe('per pand');
    const investering = berekenInvestering(x01Maatregel, kandidaat.hoeveelheid, kostencatalogus, kostencatalogus.aannames.prijspeilJaar);
    expect(investering.basisEuro.verwacht).toBe(x01Maatregel.kostenVerwachtEuro);
  });

  it('een gedeelde voorziening die over veel kamers wordt verdeeld (§2.1.5), kan onder de kwartpuntgrens blijven', () => {
    // X-01 geeft 0,25 pt, gedeeld door het aantal kamers met toegang — bij één post voor alle
    // zes kamers is dat 0,25 ÷ 6 ≈ 0,042 pt per kamer, ruim onder de 0,125 die nodig is om al
    // maar één kwartpunt te raken. De catalogustekst ("0,25 pt per kamer") suggereert het
    // tegendeel — precies de reden dat de suggestie-engine nooit op die tekst vertrouwt en
    // altijd echt doorrekent (laag A van het ontwerp).
    const resultaat = stelSuggestiesOp(testpandSuggesties, { tarievenset, peildatum, kostencatalogus });
    const x01 = resultaat.kandidaten.find((k) => k.maatregel.id === 'X-01');
    expect(x01).toBeDefined();
    expect(x01!.extraJaarhuurEuro).toBe(0);
    expect(x01!.terugverdientijdJaren).toBeNull();
  });
});

describe('registry — V-01/V-02 verwarmen alleen ruimtetypen die R3-punten opleveren', () => {
  // Bug (gemeld door een gebruiker, 2026-08-22): de suggestie-engine stelde voor om een
  // buitenruimte te "verwarmen" voor meer punten. `berekenR3` (rubrieken/r3-verwarming.ts) telt
  // "Buitenruimte privé"/"Buitenruimte gemeenschappelijk"/"Parkeerplek gemeenschappelijk" nooit
  // mee als verwarmbaar — zo'n suggestie zou dus altijd 0 punten opleveren én is fysiek/
  // vergunningtechnisch onzinnig. `testpand6Kamers` heeft ruimte 16/17/20 (buitenruimte/
  // parkeerplek, alle drie onverwarmd) precies om dit gat te dichten.
  const ctx: MaatregelContext = (() => {
    const eindtelling = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
    const marge = analyseerMarge(testpand6Kamers, tarievenset, eindtelling);
    return { pand: testpand6Kamers, tarievenset, peildatum, eindtelling, marge };
  })();

  it.each(['V-01', 'V-02'])('%s genereert geen kandidaat voor een onverwarmde buitenruimte of parkeerplek', (id) => {
    const definitie = standaardRegistry.get(id)!;
    const kandidaten = definitie.kandidaten(ctx);
    const doelRuimteNrs = kandidaten.map((k) => k.doel.nr);
    expect(doelRuimteNrs).not.toContain(16); // Balkon kamer 1 — Buitenruimte privé
    expect(doelRuimteNrs).not.toContain(17); // Gedeelde achtertuin — Buitenruimte gemeenschappelijk
    expect(doelRuimteNrs).not.toContain(20); // Gedeelde parkeerplaats — Parkeerplek gemeenschappelijk
  });

  it('V-01 genereert wél een kandidaat voor een onverwarmde overige ruimte (Zolderberging, ruimte 14)', () => {
    const definitie = standaardRegistry.get('V-01')!;
    const kandidaten = definitie.kandidaten(ctx);
    expect(kandidaten.map((k) => k.doel.nr)).toContain(14);
  });
});

describe('registry — dekkingsgat: K-04/K-06/K-07 op een keuken die ze nog mist', () => {
  // De keuken in BEIDE bestaande fixtures heeft al een koelkast, een afzuiginstallatie en een
  // magnetron. K-04, K-06 en K-07 filteren daarom in elke bestaande test hun eigen kandidaat
  // weg (`!extra.koelkast` etc. levert geen match op) — hun `kandidaten()`/`mutaties()`-code was
  // vóór deze test dus nooit daadwerkelijk uitgevoerd, alleen structureel gevalideerd via de
  // bijectie-check. Dit pand zet die drie voorzieningen expliciet uit om het gat te dichten.
  const keukenZonderExtras = pasScenarioToe(testpand6Kamers, [
    {
      soort: 'keuken-wijzigen',
      ruimteNr: 7,
      patch: {
        extra: {
          afzuiginstallatie: false,
          kookplaatInductie: false,
          kookplaatKeramisch: true,
          kookplaatGas: false,
          koelkast: false,
          vrieskast: false,
          ovenElektrisch: false,
          ovenGas: false,
          magnetron: false,
          vaatwasmachine: false,
          extraKastruimteEenhedenVan60Cm: 1,
          eenhandsmengkraan: true,
          thermostatischeMengkraan: false,
          kokendWaterfunctie: false,
        },
      },
    },
  ]);

  it.each(['K-04', 'K-06', 'K-07'])('%s genereert een kandidaat en rekent hem correct door', (id) => {
    const resultaat = stelSuggestiesOp(keukenZonderExtras, { tarievenset, peildatum, kostencatalogus });
    const kandidaat = resultaat.kandidaten.find((k) => k.maatregel.id === id);
    expect(kandidaat).toBeDefined();
    expect(kandidaat!.extraJaarhuurEuro).toBeGreaterThan(0);
    expect(kandidaat!.terugverdientijdJaren).not.toBeNull();
    expect(kandidaat!.geraakteKamers.length).toBeGreaterThan(0);
  });

  it('alle drie na elkaar toegepast (incrementeel, zoals de pakketopbouw dat doet) overleven samen', () => {
    // Rechtstreekse compositie van de drie registry-definities, net als patch-clobber.test.ts
    // doet voor K-08+K-05 — isoleert de vraag van de andere 46 maatregelen in de catalogus.
    const bouwCtx = (pand: typeof keukenZonderExtras): MaatregelContext => {
      const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
      const marge = analyseerMarge(pand, tarievenset, eindtelling);
      return { pand, tarievenset, peildatum, eindtelling, marge };
    };

    let pand = keukenZonderExtras;
    for (const id of ['K-04', 'K-06', 'K-07']) {
      const definitie = standaardRegistry.get(id)!;
      const ctx = bouwCtx(pand);
      const kandidaat = definitie.kandidaten(ctx)[0];
      expect(kandidaat).toBeDefined();
      const mutaties = definitie.mutaties(ctx, kandidaat);
      pand = pasScenarioToe(pand, mutaties);
    }

    const finaleKeuken = pand.keukens.find((k) => k.ruimteNr === 7)!;
    expect(finaleKeuken.extra.koelkast).toBe(true);
    expect(finaleKeuken.extra.afzuiginstallatie).toBe(true);
    expect(finaleKeuken.extra.magnetron).toBe(true);
    // En het originele "kookplaatKeramisch"-veld, dat geen van de drie maatregelen aanraakt,
    // moet ongewijzigd blijven — geen van de patches mag het per ongeluk hebben weggeschreven.
    expect(finaleKeuken.extra.kookplaatKeramisch).toBe(true);

    const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
    const asIsEindtelling = berekenEindtelling(keukenZonderExtras, tarievenset, peildatum);
    const jaarhuurNa = Object.values(eindtelling.perKamer).reduce((s, k) => s + k.maxHuurEuro * 12, 0);
    const jaarhuurVoor = Object.values(asIsEindtelling.perKamer).reduce((s, k) => s + k.maxHuurEuro * 12, 0);
    expect(jaarhuurNa).toBeGreaterThan(jaarhuurVoor);
  });

  it('in de volledige Maximaal-pakketopbouw is een eventuele afwijzing van K-04/K-06/K-07 herleidbaar (geen stille no-op)', () => {
    // De grote Maximaal-pakketopbouw (alle 49 maatregelen) kan K-04/K-06/K-07 terecht afwijzen
    // als een eerder geaccepteerde maatregel dezelfde afrondingssprong al heeft gepakt — dat is
    // het gedocumenteerde additiviteitsgedrag, geen bug. Deze test bewaakt alleen dat een
    // eventuele afwijzing dan ook expliciet in `verworpen` terechtkomt, nooit spoorloos. Dit is
    // precies hoe de tier-overkoepelende verworpen-bug (zie pakketten.test.ts) aan het licht
    // kwam: K-04 en K-07 werden hier al in de Basis-tier afgewezen (na K-06/K-03/K-08), maar
    // verdwenen zonder de fix spoorloos uit `comfort.verworpen`/`maximaal.verworpen`.
    const resultaat = stelSuggestiesOp(keukenZonderExtras, { tarievenset, peildatum, kostencatalogus });
    const geaccepteerd = resultaat.pakketten.maximaal.regels.map((r) => r.maatregelId);
    const verworpenSleutels = new Set(resultaat.pakketten.maximaal.verworpen.map((v) => v.kandidaatSleutel));
    for (const id of ['K-04', 'K-06', 'K-07']) {
      if (geaccepteerd.includes(id)) continue;
      const sleutel = resultaat.kandidaten.find((k) => k.maatregel.id === id)?.kandidaat.sleutel;
      expect(sleutel).toBeDefined();
      expect(verworpenSleutels.has(sleutel!)).toBe(true);
    }
  });
});
