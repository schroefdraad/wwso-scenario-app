import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import type { Energielabel, PandInvoer } from '../types/index';
import { pasScenarioToe } from '../scenario/index';
import type { Mutatie } from '../scenario/index';
import { berekenDeltaBar, berekenInvestering, berekenMarginaalRendement, berekenTerugverdientijd, telBandbreedtesOp, totaalUitOpbouw } from './kosten';
import { berekenEindtellingMetBudget, extraJaarhuur, pandWaarderingVan, waardeerScenario, type RekenBudget } from './waardering';
import type { Bandbreedte, Kandidaat, KandidaatWaardering, MaatregelContext, MaatregelDefinitie, Pakket, PandWaardering } from './types';

/** Eén kandidaat plus zijn registry-definitie — de bouwsteen van een vrij samengesteld scenario (taak 14). */
export interface PoolItem {
  waardering: KandidaatWaardering;
  definitie: MaatregelDefinitie;
}

/** Groepeersleutel voor een kandidaat-doel (rubriek/kamer/ruimte/...) — gedeeld met de UI-kant voor alternatiefGroep-uitsluiting bij handmatige selectie. */
export function doelSleutel(kandidaat: Kandidaat): string {
  return `${kandidaat.doel.soort}:${kandidaat.doel.nr ?? ''}`;
}

interface GroeiState {
  mutaties: Mutatie[];
  pand: PandInvoer;
  waardering: PandWaardering;
  regels: { item: PoolItem; mutaties: Mutatie[] }[];
}

function nieuweGroeiState(asIs: PandInvoer, waardering: PandWaardering): GroeiState {
  return { mutaties: [], pand: asIs, waardering, regels: [] };
}

/**
 * Regenereert de mutaties voor een geordende subset van regels, opnieuw incrementeel tegen de
 * as-is opgebouwd (dezelfde regel als bij het accepteren zelf, §2/§3 van het ontwerp). Nodig
 * voor leave-one-out: de OPGESLAGEN mutaties van regel B kunnen ervan uitgaan dat regel A al is
 * toegepast (bijv. een `extra`-patch die A's velden meeneemt) — bij het weglaten van A moet B's
 * mutatie dus opnieuw gegenereerd worden tegen de staat ZONDER A, niet hergebruikt worden.
 *
 * `vastePrefix` (leeg voor `bouwVrijScenario`) is een mutatielijst die bij ELKE subset
 * onvoorwaardelijk vooraf toegepast wordt — gebruikt door `bouwHandmatigScenarioMetMaatregelen`
 * om de `vervang-pand`-mutatie (het handmatig bewerkte TO-BE-pand) als vaste basis te houden
 * terwijl de leave-one-out-analyse alleen varieert over de dáárbovenop gekozen
 * catalogusmaatregelen.
 */
function mutatiesVoorSubset(regels: GroeiState['regels'], asIs: PandInvoer, ctxBasis: MaatregelContext, vastePrefix: readonly Mutatie[] = []): Mutatie[] {
  let mutaties: Mutatie[] = [...vastePrefix];
  let pand = pasScenarioToe(asIs, mutaties);
  for (const regel of regels) {
    const ctxHuidig: MaatregelContext = { ...ctxBasis, pand };
    const nieuwe = regel.item.definitie.mutaties(ctxHuidig, regel.item.waardering.kandidaat);
    mutaties = [...mutaties, ...nieuwe];
    pand = pasScenarioToe(asIs, mutaties);
  }
  return mutaties;
}

function leaveOneOutBijdragen(
  state: GroeiState,
  asIs: PandInvoer,
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  budget: RekenBudget,
  vastePrefix: readonly Mutatie[] = [],
): Map<string, number> {
  const bijdragen = new Map<string, number>();
  for (let i = 0; i < state.regels.length; i++) {
    const subset = state.regels.filter((_, j) => j !== i);
    const zonderMutaties = mutatiesVoorSubset(subset, asIs, ctxBasis, vastePrefix);
    const { waardering } = waardeerScenario(asIs, zonderMutaties, tarievenset, peildatum, budget);
    bijdragen.set(state.regels[i].item.waardering.kandidaat.sleutel, extraJaarhuur(waardering, state.waardering));
  }
  return bijdragen;
}

function bouwPakketResultaat(
  naam: Pakket['naam'],
  state: GroeiState,
  verworpen: { kandidaatSleutel: string; reden: string }[],
  asIsWaardering: PandWaardering,
  asIs: PandInvoer,
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
  verwervingswaardeEuro: number | undefined,
  budget: RekenBudget,
  vastePrefix: readonly Mutatie[] = [],
  handmatigeInvesteringEuro = 0,
): Pakket {
  const bijdragen = leaveOneOutBijdragen(state, asIs, ctxBasis, tarievenset, peildatum, budget, vastePrefix);
  const extraJaarhuurEuro = extraJaarhuur(asIsWaardering, state.waardering);
  const investeringEuro = telBandbreedtesOp([
    ...state.regels.map((r) => r.item.waardering.investeringEuro),
    { optimistisch: handmatigeInvesteringEuro, verwacht: handmatigeInvesteringEuro, pessimistisch: handmatigeInvesteringEuro },
  ]);
  const restpostEuro = Math.round((extraJaarhuurEuro - [...bijdragen.values()].reduce((s, v) => s + v, 0)) * 100) / 100;

  const vergunningplichtig = state.regels
    .filter((r) => r.item.definitie.vergunningKlasse !== 'geen' && r.item.definitie.vergunningKlasse !== 'niet-van-toepassing')
    .map((r) => ({ maatregelId: r.item.waardering.maatregel.id, klasse: r.item.definitie.vergunningKlasse, brontekst: r.item.definitie.vergunningBrontekst }));

  const ontbrekendeKosten: Pakket['ontbrekendeKosten'] = [];
  if (vergunningplichtig.length > 0) {
    for (const id of ['PR-03', 'PR-04', 'PR-05']) {
      const maatregel = kostencatalogus.maatregelen.find((m) => m.id === id);
      if (!maatregel) continue;
      ontbrekendeKosten.push({ maatregelId: id, omschrijving: maatregel.maatregel, euro: totaalUitOpbouw(berekenInvestering(maatregel, 1, kostencatalogus, uitvoeringsjaar)) });
    }
  }

  return {
    naam,
    regels: state.regels.map((r) => ({
      kandidaat: r.item.waardering.kandidaat,
      maatregelId: r.item.waardering.maatregel.id,
      marginaleBijdrageJaarhuurEuro: bijdragen.get(r.item.waardering.kandidaat.sleutel) ?? 0,
      investeringEuro: r.item.waardering.investeringEuro,
    })),
    verworpen,
    scenario: { naam: `Pakket ${naam}`, mutaties: state.mutaties },
    waardering: state.waardering,
    investeringEuro,
    extraJaarhuurEuro,
    restpostEuro,
    terugverdientijdJaren: berekenTerugverdientijd(investeringEuro, extraJaarhuurEuro),
    marginaalBrutoRendementPct: berekenMarginaalRendement(investeringEuro, extraJaarhuurEuro),
    deltaBarProcentpunt: berekenDeltaBar(asIsWaardering.brutoJaarhuurEuro, state.waardering.brutoJaarhuurEuro, investeringEuro, verwervingswaardeEuro),
    vergunningplichtig,
    ontbrekendeKosten,
  };
}

/**
 * Bouwt een scenario van een door de gebruiker VRIJ samengestelde, geordende lijst kandidaten
 * (taak 14 — scenariovergelijking, "maatregelen aan- en uitzetten"). Er wordt hier GEEN
 * marginale-winst-gate en GEEN alternatiefGroep-dedup toegepast: de gebruiker koos deze
 * maatregelen expliciet, dus ze worden altijd toegepast — ook als een maatregel in déze
 * combinatie geen (of negatieve) winst oplevert. Dat is precies informatie die de gebruiker wil
 * zien, geen reden om iets stilzwijgend te negeren (harde regel 2: nooit stilzwijgend afwijken
 * van wat de gebruiker heeft ingesteld).
 *
 * Hergebruikt dezelfde incrementele-mutatie-opbouw (elke mutatie tegen de HUIDIGE staat, niet
 * de as-is — beschermt tegen de ondiepe-merge-valkuil, zie `patch-clobber.test.ts`) en dezelfde
 * `bouwPakketResultaat`-aggregatie (investering, terugverdientijd, vergunningplicht,
 * leave-one-out) als de andere scenariopaden hieronder, zodat ze aantoonbaar hetzelfde correcte
 * gedrag hebben.
 */
export function bouwVrijScenario(
  naam: string,
  asIs: PandInvoer,
  regels: PoolItem[],
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
  verwervingswaardeEuro: number | undefined,
  budget: RekenBudget,
): Pakket {
  const asIsWaardering = pandWaarderingVan(ctxBasis.eindtelling);
  let state = nieuweGroeiState(asIs, asIsWaardering);

  for (const item of regels) {
    const ctxHuidig: MaatregelContext = { ...ctxBasis, pand: state.pand };
    const nieuweMutaties = item.definitie.mutaties(ctxHuidig, item.waardering.kandidaat);
    const totaleMutaties = [...state.mutaties, ...nieuweMutaties];
    const { pand: nieuwPand, waardering: nieuweWaardering } = waardeerScenario(state.pand, nieuweMutaties, tarievenset, peildatum, budget);
    state = {
      mutaties: totaleMutaties,
      pand: nieuwPand,
      waardering: nieuweWaardering,
      regels: [...state.regels, { item, mutaties: nieuweMutaties }],
    };
  }

  return bouwPakketResultaat(naam, state, [], asIsWaardering, asIs, ctxBasis, tarievenset, peildatum, kostencatalogus, uitvoeringsjaar, verwervingswaardeEuro, budget);
}

/**
 * Bouwt een scenario uit een VOLLEDIG handmatig bewerkt TO-BE-pand (backlog: AS-IS kopiëren
 * naar een vrij te bewerken scenario, feedback Emma Morrison, 2026-08-21) — in tegenstelling
 * tot `bouwVrijScenario` (dat een lijst catalogusmaatregelen toepast) is hier geen
 * kostencatalogus-koppeling: de gebruiker bewerkte het pand rechtstreeks in het invoerscherm,
 * niet via een geregistreerde maatregel. `investeringEuro`/`terugverdientijdJaren`/
 * `marginaalBrutoRendementPct`/`deltaBarProcentpunt` blijven daarom expliciet `null` — een
 * geraden investering van €0 zou een oneindig rendement suggereren (zie
 * `berekenMarginaalRendement`), en dat is geen eerlijker antwoord dan gewoon "onbekend".
 *
 * De mutatielijst bestaat uit precies één `vervang-pand`-mutatie: het terugrekenen van een vrije
 * bewerking (ruimtes toevoegen/verwijderen, keuken/sanitair wijzigen, alles) naar een minimale
 * diff zou fragiel zijn en geen informatie toevoegen die de gebruiker nodig heeft.
 */
export function bouwHandmatigScenario(
  naam: string,
  asIs: PandInvoer,
  bewerktPand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  budget: RekenBudget,
): Pakket {
  const mutaties: Mutatie[] = [{ soort: 'vervang-pand', pand: bewerktPand }];
  const asIsWaardering = pandWaarderingVan(berekenEindtellingMetBudget(budget, asIs, tarievenset, peildatum));
  const { waardering } = waardeerScenario(asIs, mutaties, tarievenset, peildatum, budget);
  const extraJaarhuurEuro = extraJaarhuur(asIsWaardering, waardering);

  return {
    naam,
    regels: [],
    verworpen: [],
    scenario: { naam, mutaties },
    waardering,
    investeringEuro: null,
    extraJaarhuurEuro,
    restpostEuro: 0,
    terugverdientijdJaren: null,
    marginaalBrutoRendementPct: null,
    deltaBarProcentpunt: null,
    vergunningplichtig: [],
    ontbrekendeKosten: [],
  };
}

/**
 * Bouwt een scenario dat het pand naar een zelf gekozen doellabel brengt (Tussenfase-taak C,
 * 2026-09-04 — feedback Steven Kramer: energielabel-scenario's A+/A++/A+++ naast elkaar
 * vergelijken). Dezelfde `pand-patch`-mutatie als de E-01 t/m E-09-catalogusmaatregelen
 * (`registry/r4-energie.ts`) — de labelsprong zelf is pandfysica, geen catalogusprijs, dus geen
 * kostencatalogus-koppeling hier.
 *
 * `investeringEuro` komt van de gebruiker (het kostenveld op het pandgegevens-scherm), niet van
 * een vuistregel. `undefined` levert daarom expliciet `null` op voor Investering/Terugverdientijd/
 * Rendement/ΔBAR — net als `bouwHandmatigScenario` hierboven, om nooit een gegokte €0 met een
 * oneindig rendement te tonen.
 */
export function bouwEnergielabelScenario(
  naam: string,
  asIs: PandInvoer,
  doelLabel: Energielabel,
  investeringEuro: number | undefined,
  tarievenset: Tarievenset,
  peildatum: string,
  verwervingswaardeEuro: number | undefined,
  budget: RekenBudget,
): Pakket {
  const mutaties: Mutatie[] = [{ soort: 'pand-patch', patch: { energielabel: doelLabel, energielabelIngangsdatum: peildatum } }];
  const asIsWaardering = pandWaarderingVan(berekenEindtellingMetBudget(budget, asIs, tarievenset, peildatum));
  const { waardering } = waardeerScenario(asIs, mutaties, tarievenset, peildatum, budget);
  const extraJaarhuurEuro = extraJaarhuur(asIsWaardering, waardering);
  const investering: Bandbreedte | null =
    investeringEuro !== undefined ? { optimistisch: investeringEuro, verwacht: investeringEuro, pessimistisch: investeringEuro } : null;

  return {
    naam,
    regels: [],
    verworpen: [],
    scenario: { naam, mutaties },
    waardering,
    investeringEuro: investering,
    extraJaarhuurEuro,
    restpostEuro: 0,
    terugverdientijdJaren: investering ? berekenTerugverdientijd(investering, extraJaarhuurEuro) : null,
    marginaalBrutoRendementPct: investering ? berekenMarginaalRendement(investering, extraJaarhuurEuro) : null,
    deltaBarProcentpunt: investering ? berekenDeltaBar(asIsWaardering.brutoJaarhuurEuro, waardering.brutoJaarhuurEuro, investering, verwervingswaardeEuro) : null,
    vergunningplichtig: [],
    ontbrekendeKosten: [],
  };
}

/**
 * Combineert een handmatig bewerkt TO-BE-pand (`bouwHandmatigScenario`) met standaard
 * catalogusmaatregelen daarbovenop — bijv. airco of een kitchenette in een net toegevoegde kamer
 * (backlog, 2026-08-22: "handmatig starten om een extra kamer te realiseren en dan verder
 * maatregelen toevoegen"). In tegenstelling tot `bouwHandmatigScenario` is Investering/
 * Terugverdientijd/Rendement hier WEL bekend, want de gebruiker geeft de kosten van het
 * handmatige deel (de herindeling zelf, waar geen catalogusprijs voor bestaat) zelf op via
 * `handmatigeInvesteringEuro`; de maatregelkosten daarbovenop komen zoals altijd uit de
 * kostencatalogus. De twee tellen op tot één Investering/Terugverdientijd/Rendement over de
 * VOLLEDIGE jaarhuurwinst (kamer + maatregelen samen) — geen aparte "onbekend"-status meer nodig
 * zodra er een echt bedrag is om mee te rekenen.
 *
 * `ctxTegenBewerkt` moet tegen `bewerktPand` opgebouwd zijn (bijv. via
 * `genereerEnWaardeerKandidaten(bewerktPand, ...)`), niet tegen de as-is — anders bestaan de
 * ruimtenummers van een net toegevoegde kamer niet in de kandidaat-generatie.
 */
export function bouwHandmatigScenarioMetMaatregelen(
  naam: string,
  asIs: PandInvoer,
  bewerktPand: PandInvoer,
  regels: PoolItem[],
  handmatigeInvesteringEuro: number,
  ctxTegenBewerkt: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
  verwervingswaardeEuro: number | undefined,
  budget: RekenBudget,
): Pakket {
  const asIsWaardering = pandWaarderingVan(berekenEindtellingMetBudget(budget, asIs, tarievenset, peildatum));
  const vervangMutatie: Mutatie = { soort: 'vervang-pand', pand: bewerktPand };
  const { waardering: bewerktWaardering } = waardeerScenario(asIs, [vervangMutatie], tarievenset, peildatum, budget);

  let state: GroeiState = {
    mutaties: [vervangMutatie],
    pand: bewerktPand,
    waardering: bewerktWaardering,
    regels: [],
  };

  for (const item of regels) {
    const ctxHuidig: MaatregelContext = { ...ctxTegenBewerkt, pand: state.pand };
    const nieuweMutaties = item.definitie.mutaties(ctxHuidig, item.waardering.kandidaat);
    const totaleMutaties = [...state.mutaties, ...nieuweMutaties];
    const { pand: nieuwPand, waardering: nieuweWaardering } = waardeerScenario(state.pand, nieuweMutaties, tarievenset, peildatum, budget);
    state = {
      mutaties: totaleMutaties,
      pand: nieuwPand,
      waardering: nieuweWaardering,
      regels: [...state.regels, { item, mutaties: nieuweMutaties }],
    };
  }

  return bouwPakketResultaat(
    naam,
    state,
    [],
    asIsWaardering,
    asIs,
    ctxTegenBewerkt,
    tarievenset,
    peildatum,
    kostencatalogus,
    uitvoeringsjaar,
    verwervingswaardeEuro,
    budget,
    [vervangMutatie],
    handmatigeInvesteringEuro,
  );
}
