import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index';
import { pasScenarioToe } from '../scenario/index';
import type { Mutatie } from '../scenario/index';
import { berekenDeltaBar, berekenInvestering, berekenMarginaalRendement, berekenTerugverdientijd, telBandbreedtesOp, totaalUitOpbouw } from './kosten';
import { extraJaarhuur, pandWaarderingVan, waardeerScenario, type RekenBudget } from './waardering';
import type { Kandidaat, KandidaatWaardering, MaatregelContext, MaatregelDefinitie, Pakket, PandWaardering, SuggestieOpties } from './types';

/** Eén kandidaat plus zijn registry-definitie — de bouwsteen van zowel de algoritmische pakketopbouw als een vrij samengesteld scenario (taak 14). */
export interface PoolItem {
  waardering: KandidaatWaardering;
  definitie: MaatregelDefinitie;
}

function doelSleutel(kandidaat: Kandidaat): string {
  return `${kandidaat.doel.soort}:${kandidaat.doel.nr ?? ''}`;
}

/** Deterministische sortering (§3 van het ontwerp): solo-TVT oplopend, dan hogere jaarhuur, dan lagere investering, dan alfabetisch. */
function sorteerVoorGreedy(pool: PoolItem[]): PoolItem[] {
  return [...pool].sort((a, b) => {
    const tvtA = a.waardering.terugverdientijdJaren?.verwacht ?? Infinity;
    const tvtB = b.waardering.terugverdientijdJaren?.verwacht ?? Infinity;
    if (tvtA !== tvtB) return tvtA - tvtB;
    if (a.waardering.extraJaarhuurEuro !== b.waardering.extraJaarhuurEuro) return b.waardering.extraJaarhuurEuro - a.waardering.extraJaarhuurEuro;
    if (a.waardering.investeringEuro.verwacht !== b.waardering.investeringEuro.verwacht) return a.waardering.investeringEuro.verwacht - b.waardering.investeringEuro.verwacht;
    if (a.waardering.maatregel.id !== b.waardering.maatregel.id) return a.waardering.maatregel.id.localeCompare(b.waardering.maatregel.id);
    return a.waardering.kandidaat.sleutel.localeCompare(b.waardering.kandidaat.sleutel);
  });
}

interface GroeiState {
  mutaties: Mutatie[];
  pand: PandInvoer;
  waardering: PandWaardering;
  regels: { item: PoolItem; mutaties: Mutatie[] }[];
  gebruikteAlternatieven: Map<string, string>;
}

function nieuweGroeiState(asIs: PandInvoer, waardering: PandWaardering): GroeiState {
  return { mutaties: [], pand: asIs, waardering, regels: [], gebruikteAlternatieven: new Map() };
}

/**
 * Eén poging om een kandidaat aan de groeiende pakketstaat toe te voegen (§2/§3 van het
 * ontwerp): de mutaties worden VERS gegenereerd tegen de HUIDIGE staat (nooit tegen de as-is),
 * en alleen geaccepteerd bij een positieve marginale bijdrage in déze context.
 */
function probeerToevoegen(
  state: GroeiState,
  item: PoolItem,
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  budget: RekenBudget,
  gekozenAlternatieven: Record<string, string> | undefined,
): boolean {
  const { definitie, waardering: kw } = item;

  if (definitie.alternatiefGroep) {
    const groepSleutel = `${definitie.alternatiefGroep}:${doelSleutel(kw.kandidaat)}`;
    const bezet = state.gebruikteAlternatieven.get(groepSleutel);
    if (bezet && bezet !== definitie.id) return false;
    const voorkeur = gekozenAlternatieven?.[definitie.alternatiefGroep];
    if (bezet === undefined && voorkeur && voorkeur !== definitie.id) return false;
  }

  const ctxHuidig: MaatregelContext = { ...ctxBasis, pand: state.pand };
  const nieuweMutaties = definitie.mutaties(ctxHuidig, kw.kandidaat);
  const totaleMutaties = [...state.mutaties, ...nieuweMutaties];
  const { pand: nieuwPand, waardering: nieuweWaardering } = waardeerScenario(state.pand, nieuweMutaties, tarievenset, peildatum, budget);
  const marginaleBijdrage = extraJaarhuur(state.waardering, nieuweWaardering);

  if (marginaleBijdrage <= 0) return false;

  state.mutaties = totaleMutaties;
  state.pand = nieuwPand;
  state.waardering = nieuweWaardering;
  state.regels.push({ item, mutaties: nieuweMutaties });
  if (definitie.alternatiefGroep) {
    state.gebruikteAlternatieven.set(`${definitie.alternatiefGroep}:${doelSleutel(kw.kandidaat)}`, definitie.id);
  }
  return true;
}

/**
 * Bouwt één pakkettier: start bij `voorState` (het vorige pakket, al opgebouwd), voegt de
 * nieuwe kandidaten van deze tier greedy toe, en test verworpen kandidaten daarna precies één
 * keer opnieuw (stabilisatiepass) — begrensd op één pass voor de looptijd en het determinisme.
 *
 * BEKENDE BEPERKING (bewust niet opgelost, zie `outputs/RAPPORT_taak11_2026-08-20.md`): deze
 * greedy-aanpak vindt geen paar kandidaten die allebei SOLO €0 opleveren maar alleen SAMEN
 * winst geven (een "echte wederzijdse afhankelijkheid") — geen van beide krijgt ooit de kans
 * om als eerste geaccepteerd te worden, en herhaalde losse stabilisatiepasses lossen dat niet
 * op omdat de staat dan nooit verandert. Wél correct afgehandeld: het veelvoorkomende geval
 * waarin minstens één kandidaat solo al positief is en de andere pas op basis daarvan meedoet
 * (bijv. S-04 + K-08 op de fixture — zie `additiviteit.test.ts`), want dan bepaalt de
 * sorteervolgorde (oplopend op solo-TVT) vanzelf een gunstige toevoegvolgorde.
 *
 * Voor de huidige kostencatalogus (49 maatregelen) is er geen bekend paar dat het eerste,
 * onopgeloste geval raakt — elke maatregel met puntenimpact heeft op zichzelf al een reëel
 * effect op minstens één kamer. Een oplossing (bijv. verworpen kandidaten ook als PAREN
 * herproberen in de stabilisatiepass, begrensd tot paren om combinatorische explosie te
 * voorkomen) is bewust niet gebouwd tot een concreet geval zich aandient.
 */
function bouwTier(
  voorState: GroeiState,
  nieuwePool: PoolItem[],
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  budget: RekenBudget,
  opties: SuggestieOpties,
): { state: GroeiState; verworpen: { kandidaatSleutel: string; reden: string }[] } {
  const state: GroeiState = {
    mutaties: [...voorState.mutaties],
    pand: voorState.pand,
    waardering: voorState.waardering,
    regels: [...voorState.regels],
    gebruikteAlternatieven: new Map(voorState.gebruikteAlternatieven),
  };

  const gesorteerd = sorteerVoorGreedy(nieuwePool);
  const restanten = gesorteerd.filter((item) => {
    const al = state.regels.some((r) => r.item.waardering.kandidaat.sleutel === item.waardering.kandidaat.sleutel);
    return !al;
  });

  const verworpenReden = new Map<string, string>();
  const nogTeProberen: PoolItem[] = [];
  for (const item of restanten) {
    const geaccepteerd = probeerToevoegen(state, item, ctxBasis, tarievenset, peildatum, budget, opties.gekozenAlternatieven);
    if (!geaccepteerd) {
      verworpenReden.set(item.waardering.kandidaat.sleutel, 'geen marginale winst in dit pakket');
      nogTeProberen.push(item);
    }
  }

  // Stabilisatiepass: één herkansing tegen de definitieve tussenstand.
  const verworpenNaStabilisatie: { kandidaatSleutel: string; reden: string }[] = [];
  for (const item of nogTeProberen) {
    const geaccepteerd = probeerToevoegen(state, item, ctxBasis, tarievenset, peildatum, budget, opties.gekozenAlternatieven);
    if (!geaccepteerd) {
      verworpenNaStabilisatie.push({ kandidaatSleutel: item.waardering.kandidaat.sleutel, reden: verworpenReden.get(item.waardering.kandidaat.sleutel)! });
    }
  }

  return { state, verworpen: verworpenNaStabilisatie };
}

/**
 * Regenereert de mutaties voor een geordende subset van regels, opnieuw incrementeel tegen de
 * as-is opgebouwd (dezelfde regel als bij het accepteren zelf, §2/§3 van het ontwerp). Nodig
 * voor leave-one-out: de OPGESLAGEN mutaties van regel B kunnen ervan uitgaan dat regel A al is
 * toegepast (bijv. een `extra`-patch die A's velden meeneemt) — bij het weglaten van A moet B's
 * mutatie dus opnieuw gegenereerd worden tegen de staat ZONDER A, niet hergebruikt worden.
 */
function mutatiesVoorSubset(regels: GroeiState['regels'], asIs: PandInvoer, ctxBasis: MaatregelContext): Mutatie[] {
  let mutaties: Mutatie[] = [];
  let pand = asIs;
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
): Map<string, number> {
  const bijdragen = new Map<string, number>();
  for (let i = 0; i < state.regels.length; i++) {
    const subset = state.regels.filter((_, j) => j !== i);
    const zonderMutaties = mutatiesVoorSubset(subset, asIs, ctxBasis);
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
): Pakket {
  const bijdragen = leaveOneOutBijdragen(state, asIs, ctxBasis, tarievenset, peildatum, budget);
  const extraJaarhuurEuro = extraJaarhuur(asIsWaardering, state.waardering);
  const investeringEuro = telBandbreedtesOp(state.regels.map((r) => r.item.waardering.investeringEuro));
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

export interface PakkettenResultaat {
  basis: Pakket;
  comfort: Pakket;
  maximaal: Pakket;
  aantalEindtellingen: number;
}

/**
 * Stelt de drie pakketten samen (§3 en §6 van het ontwerp): Basis ⊆ Comfort ⊆ Maximaal, per
 * constructie afgedwongen doordat elke tier verder bouwt op de vorige. Filtert op de
 * SOLO-terugverdientijd (nooit op de pakketwinst, die kent immers pas na opbouw een waarde).
 */
export function stelPakkettenSamen(
  asIs: PandInvoer,
  soloResultaten: { waardering: KandidaatWaardering; definitie: MaatregelDefinitie }[],
  ctxBasis: MaatregelContext,
  tarievenset: Tarievenset,
  peildatum: string,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
  opties: SuggestieOpties,
  budget: RekenBudget,
): PakkettenResultaat {
  const grenzen = opties.grenzen ?? { basisTvtJaren: 5, comfortTvtJaren: 10 };
  const asIsWaardering = pandWaarderingVan(ctxBasis.eindtelling);

  const nietHerindeling = soloResultaten.filter((r) => !r.definitie.wijzigtAantalKamers && r.waardering.extraJaarhuurEuro > 0);

  const basisPool = nietHerindeling.filter((r) => r.definitie.vergunningKlasse === 'geen' && (r.waardering.terugverdientijdJaren?.verwacht ?? Infinity) < grenzen.basisTvtJaren);
  const comfortPool = nietHerindeling.filter((r) => (r.waardering.terugverdientijdJaren?.verwacht ?? Infinity) < grenzen.comfortTvtJaren);
  const maximaalPool = nietHerindeling;

  const leegState = nieuweGroeiState(asIs, asIsWaardering);

  const basisTier = bouwTier(leegState, basisPool, ctxBasis, tarievenset, peildatum, budget, opties);
  const comfortNieuw = comfortPool.filter((r) => !basisPool.some((b) => b.waardering.kandidaat.sleutel === r.waardering.kandidaat.sleutel));
  const comfortTier = bouwTier(basisTier.state, comfortNieuw, ctxBasis, tarievenset, peildatum, budget, opties);
  const maximaalNieuw = maximaalPool.filter((r) => !comfortPool.some((c) => c.waardering.kandidaat.sleutel === r.waardering.kandidaat.sleutel));
  const maximaalTier = bouwTier(comfortTier.state, maximaalNieuw, ctxBasis, tarievenset, peildatum, budget, opties);

  // Elke pool bevat alleen de kandidaten die NIEUW zijn ten opzichte van de vorige tier
  // (comfortNieuw/maximaalNieuw), dus een kandidaat die in een eerdere tier is afgewezen wordt
  // in een latere tier nooit opnieuw geprobeerd — hij blijft afgewezen. Zonder deze optelling
  // zou zo'n kandidaat na de eerste tier stil uit zowel `regels` als `verworpen` verdwijnen
  // (bug gevonden bij het doorrekenen van K-04/K-06/K-07 op een aangepaste testfixture, zie
  // `registry.test.ts`). Uitsluiten wat inmiddels wél is geaccepteerd is voor de robuustheid:
  // met de huidige poolopbouw kan dat niet voorkomen, maar een kandidaat die ooit alsnog wordt
  // geaccepteerd mag nooit als verworpen blijven staan.
  const nietGeaccepteerdIn = (state: GroeiState) => (v: { kandidaatSleutel: string }) =>
    !state.regels.some((r) => r.item.waardering.kandidaat.sleutel === v.kandidaatSleutel);
  const basisVerworpen = basisTier.verworpen;
  const comfortVerworpen = [...basisVerworpen, ...comfortTier.verworpen].filter(nietGeaccepteerdIn(comfortTier.state));
  const maximaalVerworpen = [...comfortVerworpen, ...maximaalTier.verworpen].filter(nietGeaccepteerdIn(maximaalTier.state));

  const basis = bouwPakketResultaat('Basis', basisTier.state, basisVerworpen, asIsWaardering, asIs, ctxBasis, tarievenset, peildatum, kostencatalogus, uitvoeringsjaar, opties.verwervingswaardeEuro, budget);
  const comfort = bouwPakketResultaat('Comfort', comfortTier.state, comfortVerworpen, asIsWaardering, asIs, ctxBasis, tarievenset, peildatum, kostencatalogus, uitvoeringsjaar, opties.verwervingswaardeEuro, budget);
  const maximaal = bouwPakketResultaat('Maximaal', maximaalTier.state, maximaalVerworpen, asIsWaardering, asIs, ctxBasis, tarievenset, peildatum, kostencatalogus, uitvoeringsjaar, opties.verwervingswaardeEuro, budget);

  return { basis, comfort, maximaal, aantalEindtellingen: budget.teller.aantal };
}

/**
 * Bouwt een scenario van een door de gebruiker VRIJ samengestelde, geordende lijst kandidaten
 * (taak 14 — scenariovergelijking, "maatregelen aan- en uitzetten"). In tegenstelling tot
 * `stelPakkettenSamen` wordt hier GEEN marginale-winst-gate en GEEN alternatiefGroep-dedup
 * toegepast: de gebruiker koos deze maatregelen expliciet, dus ze worden altijd toegepast — ook
 * als een maatregel in déze combinatie geen (of negatieve) winst oplevert. Dat is precies
 * informatie die de gebruiker wil zien, geen reden om iets stilzwijgend te negeren (harde regel
 * 2: nooit stilzwijgend afwijken van wat de gebruiker heeft ingesteld).
 *
 * Hergebruikt dezelfde incrementele-mutatie-opbouw (elke mutatie tegen de HUIDIGE staat, niet
 * de as-is — beschermt tegen de ondiepe-merge-valkuil, zie `patch-clobber.test.ts`) en dezelfde
 * `bouwPakketResultaat`-aggregatie (investering, terugverdientijd, vergunningplicht,
 * leave-one-out) als de algoritmische pakketopbouw, zodat beide paden aantoonbaar hetzelfde
 * correcte gedrag hebben.
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
      gebruikteAlternatieven: state.gebruikteAlternatieven,
    };
  }

  return bouwPakketResultaat(naam, state, [], asIsWaardering, asIs, ctxBasis, tarievenset, peildatum, kostencatalogus, uitvoeringsjaar, verwervingswaardeEuro, budget);
}
