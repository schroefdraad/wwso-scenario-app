import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index';
import { berekenEindtelling } from '../eindtelling/index';
import { analyseerMarge } from './marge-analyse';
import { genereerKandidaten } from './kandidaten';
import { berekenEindtellingMetBudget, nieuwBudget, pandWaarderingVan, waardeerKandidaatSolo, waardeerScenario, type RekenBudget } from './waardering';
import { standaardRegistry, valideerRegistryOfGooiFout } from './registry/index';
import type { KandidaatWaardering, MaatregelContext, MaatregelRegistry, MargeSignaal, SuggestieOpties, SuggestieResultaat } from './types';
import { huidigeVersiestempel } from '../versiestempel';

const DEFAULT_MAX_EINDTELLINGEN = 2000;

/**
 * Publieke ingang van de suggestie-engine (taak 11). Zie
 * `outputs/RAPPORT_taak11_2026-08-20.md` voor het volledige ontwerp. Regelgebaseerd, niet
 * generatief: elke maatregel wordt echt doorgerekend via `pasScenarioToe` + `berekenEindtelling`
 * (laag A), nooit met de vuistregel-tekst uit de catalogus.
 */
export function stelSuggestiesOp(asIs: PandInvoer, opties: SuggestieOpties): SuggestieResultaat {
  const { tarievenset, peildatum, kostencatalogus } = opties;
  const registry = opties.registry ?? standaardRegistry;
  valideerRegistryOfGooiFout(registry, kostencatalogus);

  const budget = nieuwBudget(opties.maxEindtellingen ?? DEFAULT_MAX_EINDTELLINGEN);
  const uitvoeringsjaar = opties.uitvoeringsjaar ?? kostencatalogus.aannames.prijspeilJaar;

  const asIsEindtelling = berekenEindtelling(asIs, tarievenset, peildatum);
  budget.teller.aantal += 1;
  const asIsWaardering = pandWaarderingVan(asIsEindtelling);
  const margeAnalyse = analyseerMarge(asIs, tarievenset, asIsEindtelling);

  const ctxBasis: MaatregelContext = { pand: asIs, tarievenset, peildatum, eindtelling: asIsEindtelling, marge: margeAnalyse };

  const { kandidaten, nietBeoordeeld } = genereerKandidaten(ctxBasis, registry, kostencatalogus, opties);

  const soloResultaten: { waardering: KandidaatWaardering; definitie: (typeof kandidaten)[number]['definitie'] }[] = [];
  for (const { kandidaat, definitie } of kandidaten) {
    const waardering = waardeerKandidaatSolo(asIs, ctxBasis, kandidaat, definitie, kostencatalogus, uitvoeringsjaar, tarievenset, peildatum, budget);
    if (waardering) soloResultaten.push({ waardering, definitie });
  }

  const herindeling = soloResultaten.filter((r) => r.definitie.wijzigtAantalKamers).map((r) => r.waardering);
  const kandidatenSorted = soloResultaten
    .filter((r) => !r.definitie.wijzigtAantalKamers)
    .map((r) => r.waardering)
    .sort((a, b) => {
      const tvtA = a.terugverdientijdJaren?.verwacht ?? Infinity;
      const tvtB = b.terugverdientijdJaren?.verwacht ?? Infinity;
      return tvtA - tvtB || a.maatregel.id.localeCompare(b.maatregel.id) || a.kandidaat.sleutel.localeCompare(b.kandidaat.sleutel);
    });

  const gatSignalen = detecteerGatenInCatalogus(asIs, ctxBasis, soloResultaten, tarievenset, peildatum, budget, kostencatalogus.versie);
  margeAnalyse.signalen.push(...gatSignalen);

  const waarschuwingen: string[] = [
    "BTW: investeringen zijn doorgerekend met een conservatieve 21%-aanname op het vermoedelijk exclusieve bedrag (woonruimteverhuur is BTW-vrijgesteld, voorbelasting dus niet aftrekbaar). Het verlaagde tarief op een eventueel arbeidsdeel is nog niet toepasbaar — de kostencatalogus legt nog niet vast of bedragen incl./excl. BTW zijn.",
  ];
  if (!opties.huurderving) {
    waarschuwingen.push(
      'Huurderving tijdens de verbouwing (PR-06) is niet meegerekend in de terugverdientijd — geef `huurderving` mee in de opties om dat wel te doen.',
    );
  }
  if (opties.verwervingswaardeEuro === undefined) {
    waarschuwingen.push('ΔBAR is niet berekend: geef `verwervingswaardeEuro` mee in de opties om het marginale rendement te vergelijken met het huidige rendement van dit pand.');
  }

  return {
    versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
    asIs: asIsWaardering,
    margeAnalyse,
    kandidaten: kandidatenSorted,
    nietBeoordeeld,
    herindeling,
    waarschuwingen,
    aantalEindtellingen: budget.teller.aantal,
  };
}

export interface KandidatenTegenPandResultaat {
  ctxBasis: MaatregelContext;
  kandidaten: KandidaatWaardering[];
  nietBeoordeeld: { maatregelId: string; reden: string }[];
}

/**
 * Genereert en waardeert (solo) alle kandidaten tegen een WILLEKEURIG pand — niet per se de
 * as-is. `stelSuggestiesOp` doet dit intern voor de as-is; dit is de kale variant daarvan,
 * gebruikt door de scenariovergelijking om standaardmaatregelen te vinden die specifiek van
 * toepassing zijn op een handmatig bewerkt TO-BE-pand (bijv. airco of een kitchenette in een net
 * toegevoegde kamer) — dezelfde laag-A-garantie (nooit geschat, altijd doorgerekend via
 * `berekenEindtelling`).
 */
export function genereerEnWaardeerKandidaten(
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  budget: RekenBudget,
  opties?: { registry?: MaatregelRegistry; maatregelParameters?: Record<string, unknown>; uitgeslotenMaatregelen?: readonly string[] },
): KandidatenTegenPandResultaat {
  const registry = opties?.registry ?? standaardRegistry;
  const eindtelling = berekenEindtellingMetBudget(budget, pand, tarievenset, peildatum);
  const marge = analyseerMarge(pand, tarievenset, eindtelling);
  const ctxBasis: MaatregelContext = { pand, tarievenset, peildatum, eindtelling, marge };
  const uitvoeringsjaar = kostencatalogus.aannames.prijspeilJaar;

  const { kandidaten, nietBeoordeeld } = genereerKandidaten(ctxBasis, registry, kostencatalogus, {
    tarievenset,
    peildatum,
    kostencatalogus,
    maatregelParameters: opties?.maatregelParameters,
    uitgeslotenMaatregelen: opties?.uitgeslotenMaatregelen,
  });

  const gewaardeerd: KandidaatWaardering[] = [];
  for (const { kandidaat, definitie } of kandidaten) {
    const waardering = waardeerKandidaatSolo(pand, ctxBasis, kandidaat, definitie, kostencatalogus, uitvoeringsjaar, tarievenset, peildatum, budget);
    if (waardering) gewaardeerd.push(waardering);
  }

  return { ctxBasis, kandidaten: gewaardeerd, nietBeoordeeld };
}

/**
 * Upgradet 'poort-niet-gehaald'-signalen naar 'gat-in-catalogus' zodra GEEN enkele
 * catalogusmaatregel de poort daadwerkelijk opent (§1, laag C + §6 van het ontwerp: dit is
 * de enige plek waar de marge-analyse een eurobedrag krijgt, en dat gebeurt via een echte
 * herrekening — nooit een schatting).
 */
function detecteerGatenInCatalogus(
  asIs: PandInvoer,
  ctxBasis: MaatregelContext,
  soloResultaten: { waardering: KandidaatWaardering }[],
  tarievenset: Parameters<typeof waardeerScenario>[2],
  peildatum: string,
  budget: Parameters<typeof waardeerScenario>[4],
  kostencatalogusVersie: string,
): MargeSignaal[] {
  const asIsWaardering = pandWaarderingVan(ctxBasis.eindtelling);
  const nieuweSignalen: MargeSignaal[] = [];

  for (const signaal of ctxBasis.marge.signalen) {
    if (signaal.soort !== 'poort-niet-gehaald' || signaal.ruimteNr === undefined) continue;

    const dektAlIets = soloResultaten.some((r) => r.waardering.kandidaat.doel.nr === signaal.ruimteNr && r.waardering.extraJaarhuurEuro > 0);
    if (dektAlIets) continue;

    let geschatteJaarhuurEuro: number | undefined;
    if (signaal.rubriek === 'r5') {
      const keuken = asIs.keukens.find((k) => k.ruimteNr === signaal.ruimteNr);
      if (keuken) {
        const { waardering } = waardeerScenario(
          asIs,
          [{ soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { basiseisen: { aanEnAfvoerWater: true, vastKookaansluitpunt: true, aanrechtbladMinimaal1MeterInEenStuk: true, tweeInbouwkastenVan50Cm: true, waterdichteWandafwerking: true } } }],
          tarievenset,
          peildatum,
          budget,
        );
        geschatteJaarhuurEuro = Math.max(0, waardering.brutoJaarhuurEuro - asIsWaardering.brutoJaarhuurEuro);
      }
    } else if (signaal.rubriek === 'r6') {
      const post = asIs.sanitair.find((s) => s.ruimteNr === signaal.ruimteNr);
      if (post) {
        const { waardering } = waardeerScenario(
          asIs,
          [{ soort: 'sanitair-wijzigen', ruimteNr: post.ruimteNr, patch: { extraEisen: { waterdichteVloerafwerking: true, vrijeHoogte2MeterOverHelft: true, waterdichteWandafwerking: true, wastafelMetMengkraanEnSpiegel: true, doucheOfBadMetWarmEnKoudWater: true } } }],
          tarievenset,
          peildatum,
          budget,
        );
        geschatteJaarhuurEuro = Math.max(0, waardering.brutoJaarhuurEuro - asIsWaardering.brutoJaarhuurEuro);
      }
    }

    nieuweSignalen.push({
      soort: 'gat-in-catalogus',
      rubriek: signaal.rubriek,
      ruimteNr: signaal.ruimteNr,
      omschrijving: `${signaal.omschrijving} Geen enkele regel in de kostencatalogus (versie ${kostencatalogusVersie}) adresseert deze basiseis rechtstreeks.`,
      geschatteJaarhuurEuro,
    });
  }

  return nieuweSignalen;
}
