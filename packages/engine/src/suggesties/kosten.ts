import type { Kostencatalogus, KostencatalogusAannames, Maatregel } from '@wwso/data';
import { rondAfOp2Decimalen } from '../rubrieken/gedeeld';
import type { Bandbreedte, InvesteringOpbouw } from './types';

/**
 * BTW-aanscherping (2026-08-20, taak 12): woonruimteverhuur is BTW-vrijgesteld, dus
 * voorbelasting op investeringskosten is voor een verhurende BV nooit aftrekbaar — dit geldt
 * ongeacht welk tarief (21% regulier / 9% verlaagd op arbeid) uiteindelijk van toepassing zou
 * zijn. De catalogus legt nog niet vast of bedragen incl./excl. BTW zijn, noch de
 * arbeid/materiaal-verhouding (zie `outputs/RAPPORT_taak11_2026-08-20.md`, §5). Tot die
 * gegevens er zijn, is 21% op het vermoedelijk exclusieve bedrag de voorzichtige aanname —
 * nooit een gunstiger scenario dan bewezen (harde regel 4).
 */
export const CONSERVATIEVE_BTW_FACTOR = 1.21;

/**
 * Jaarlijkse huurstijging voor de terugverdientijd/marginaal-rendement-berekening (feedback Myle,
 * 2026-09-11: "wordt de extra jaarhuur geïndexeerd?"). Bron: `resources/Rendementscalculator_
 * Crooswijkseweg 95-A03.xlsx`, cel "Huurstijging" — 0,033 op zowel het AS IS- als het TO
 * BE-tabblad, dus geen losse aanname per pand nodig. Niet in `KostencatalogusAannames`: die tab
 * komt uit een ander brondocument (`Kostenkentallen_WWSO_optimalisatie.xlsx`) en het
 * importscript faalt hard als een verwachte parameter ontbreekt (harde regel 4) — deze waarde
 * hoort dus hier, niet daar.
 */
export const HUURSTIJGING_PER_JAAR = 0.033;

export function nulBandbreedte(): Bandbreedte {
  return { optimistisch: 0, verwacht: 0, pessimistisch: 0 };
}

export function schaalBandbreedte(b: Bandbreedte, factor: number): Bandbreedte {
  return {
    optimistisch: rondAfOp2Decimalen(b.optimistisch * factor),
    verwacht: rondAfOp2Decimalen(b.verwacht * factor),
    pessimistisch: rondAfOp2Decimalen(b.pessimistisch * factor),
  };
}

export function telBandbreedtesOp(bandbreedtes: readonly Bandbreedte[]): Bandbreedte {
  return bandbreedtes.reduce(
    (som, b) => ({
      optimistisch: rondAfOp2Decimalen(som.optimistisch + b.optimistisch),
      verwacht: rondAfOp2Decimalen(som.verwacht + b.verwacht),
      pessimistisch: rondAfOp2Decimalen(som.pessimistisch + b.pessimistisch),
    }),
    nulBandbreedte(),
  );
}

/**
 * Ruwe kostenbandbreedte van één catalogusregel, vóór hoeveelheid/regio/indexatie/BTW.
 * `schatting` toont min–verwacht–max (taak 10); `offerte`/`bevestigd` heeft alle drie gelijk
 * aan het verwachte bedrag — er is dan geen onzekerheid meer over.
 */
function basisBandbreedte(maatregel: Maatregel): Bandbreedte {
  if (maatregel.status === 'schatting') {
    return {
      optimistisch: maatregel.kostenMinEuro,
      verwacht: maatregel.kostenVerwachtEuro,
      pessimistisch: maatregel.kostenMaxEuro,
    };
  }
  return {
    optimistisch: maatregel.kostenVerwachtEuro,
    verwacht: maatregel.kostenVerwachtEuro,
    pessimistisch: maatregel.kostenVerwachtEuro,
  };
}

function indexatieFactor(aannames: KostencatalogusAannames, uitvoeringsjaar: number): number {
  const jaren = uitvoeringsjaar - aannames.prijspeilJaar;
  return Math.pow(1 + aannames.indexatieBouwkostenPerJaar, jaren);
}

/**
 * Investering voor één maatregel: hoeveelheid × basisbandbreedte, geschaald met de regio-index
 * (op alle drie de bedragen — zie het ontwerp, §5: de index schaalt de kostenbasis, niet één
 * kolom), de bouwkostenindexatie tot het uitvoeringsjaar, en de conservatieve BTW-factor.
 * Riders (prerequisites) worden hier NIET meegeteld — dat doet de aanroeper (`waardering.ts`),
 * gededupliceerd per doel.
 */
export function berekenInvestering(
  maatregel: Maatregel,
  hoeveelheid: number,
  kostencatalogus: Kostencatalogus,
  uitvoeringsjaar: number,
): InvesteringOpbouw {
  const basisEuro = schaalBandbreedte(basisBandbreedte(maatregel), hoeveelheid);
  const regioIndex = kostencatalogus.aannames.regioIndex;
  const indexFactor = indexatieFactor(kostencatalogus.aannames, uitvoeringsjaar);

  return {
    basisEuro,
    regioIndex,
    indexatieFactor: indexFactor,
    btwFactor: CONSERVATIEVE_BTW_FACTOR,
    btwBehandeling: 'conservatief-21-procent',
    hoeveelheid,
    riders: [],
  };
}

/** Totale bandbreedte van een `InvesteringOpbouw`: basis × regio × indexatie × BTW, plus riders. */
export function totaalUitOpbouw(opbouw: InvesteringOpbouw): Bandbreedte {
  const eigen = schaalBandbreedte(opbouw.basisEuro, opbouw.regioIndex * opbouw.indexatieFactor * opbouw.btwFactor);
  return telBandbreedtesOp([eigen, ...opbouw.riders.map((r) => r.euro)]);
}

/**
 * Aantal jaren tot de cumulatieve extra huur de investering evenaart, met de extra jaarhuur van
 * het eerste jaar als basis die daarna elk jaar met `HUURSTIJGING_PER_JAAR` meegroeit (een
 * groeiende meetkundige reeks) — in plaats van een vlak bedrag per jaar. Gesloten-vorm-oplossing
 * voor een reëel (niet per se geheel) aantal jaren n:
 *   investering = extraJaarhuur × [(1+r)^n − 1] / r  ⟺  n = ln(1 + investering·r / extraJaarhuur) / ln(1+r)
 * Voor r → 0 valt dit terug op de oude vlakke `investering / extraJaarhuur`; voor r > 0 (de
 * praktijksituatie) is n altijd kleiner dan die vlakke uitkomst — vandaar dat indexatie de
 * terugverdientijd verkort, nooit verlengt.
 */
function jarenTotTerugverdiend(investeringEuro: number, extraJaarhuurEuro: number): number {
  return Math.log(1 + (investeringEuro * HUURSTIJGING_PER_JAAR) / extraJaarhuurEuro) / Math.log(1 + HUURSTIJGING_PER_JAAR);
}

/**
 * Terugverdientijd per scenario van de bandbreedte (§5 van het ontwerp, geïndexeerd sinds
 * 2026-09-12): de extra jaarhuur van jaar 1 staat vast (komt uit de rekenmotor), alleen de
 * investering varieert. `optimistisch` hoort dus bij de laagste kosten en dus de kortste
 * terugverdientijd.
 */
export function berekenTerugverdientijd(investering: Bandbreedte, extraJaarhuurEuro: number): Bandbreedte | null {
  if (extraJaarhuurEuro <= 0) return null;
  return {
    optimistisch: rondAfOp2Decimalen(jarenTotTerugverdiend(investering.optimistisch, extraJaarhuurEuro)),
    verwacht: rondAfOp2Decimalen(jarenTotTerugverdiend(investering.verwacht, extraJaarhuurEuro)),
    pessimistisch: rondAfOp2Decimalen(jarenTotTerugverdiend(investering.pessimistisch, extraJaarhuurEuro)),
  };
}

/**
 * Presentatiegetal, wiskundig identiek aan 100/terugverdientijd (§6 van het ontwerp) — geen
 * onafhankelijke sorteersleutel, wél leesbaar voor wie in rendementen denkt. Blijft bewust aan de
 * (geïndexeerde) terugverdientijd gekoppeld i.p.v. losgezet als eenvoudige eerstejaars-yield, om
 * geen twee tegenstrijdige getallen naast elkaar in dezelfde tabel te tonen.
 */
export function berekenMarginaalRendement(investering: Bandbreedte, extraJaarhuurEuro: number): Bandbreedte | null {
  const terugverdientijd = berekenTerugverdientijd(investering, extraJaarhuurEuro);
  if (!terugverdientijd) return null;
  return {
    // optimistisch rendement hoort bij de laagste investering en dus de kortste terugverdientijd
    optimistisch: rondAfOp2Decimalen(100 / terugverdientijd.optimistisch),
    verwacht: rondAfOp2Decimalen(100 / terugverdientijd.verwacht),
    pessimistisch: rondAfOp2Decimalen(100 / terugverdientijd.pessimistisch),
  };
}

/**
 * ΔBAR (§6 van het ontwerp): alleen berekenbaar met een expliciet meegegeven verwervingswaarde.
 * `barAsIs` gebruikt de huidige jaarhuur/waarde, `barToBe` de jaarhuur/waarde ná investering.
 * Zonder verwervingswaarde: `null`, geen fallback.
 */
export function berekenDeltaBar(
  brutoJaarhuurAsIsEuro: number,
  brutoJaarhuurToBeEuro: number,
  investering: Bandbreedte,
  verwervingswaardeEuro: number | undefined,
): Bandbreedte | null {
  if (verwervingswaardeEuro === undefined) return null;

  const barAsIs = brutoJaarhuurAsIsEuro / verwervingswaardeEuro;
  const bar = (investeringEuro: number) => brutoJaarhuurToBeEuro / (verwervingswaardeEuro + investeringEuro);

  return {
    // optimistisch (laagste investering) geeft het hoogste BAR-toBe, dus het gunstigste verschil
    optimistisch: rondAfOp2Decimalen(100 * (bar(investering.optimistisch) - barAsIs)),
    verwacht: rondAfOp2Decimalen(100 * (bar(investering.verwacht) - barAsIs)),
    pessimistisch: rondAfOp2Decimalen(100 * (bar(investering.pessimistisch) - barAsIs)),
  };
}
