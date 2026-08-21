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
 * Terugverdientijd per scenario van de bandbreedte (§5 van het ontwerp): de extra jaarhuur
 * staat vast (komt uit de rekenmotor), alleen de investering varieert. `optimistisch` hoort dus
 * bij de laagste kosten en dus de kortste terugverdientijd.
 */
export function berekenTerugverdientijd(investering: Bandbreedte, extraJaarhuurEuro: number): Bandbreedte | null {
  if (extraJaarhuurEuro <= 0) return null;
  return {
    optimistisch: rondAfOp2Decimalen(investering.optimistisch / extraJaarhuurEuro),
    verwacht: rondAfOp2Decimalen(investering.verwacht / extraJaarhuurEuro),
    pessimistisch: rondAfOp2Decimalen(investering.pessimistisch / extraJaarhuurEuro),
  };
}

/**
 * Presentatiegetal, wiskundig identiek aan 100/terugverdientijd (§6 van het ontwerp) — geen
 * onafhankelijke sorteersleutel, wél leesbaar voor wie in rendementen denkt.
 */
export function berekenMarginaalRendement(investering: Bandbreedte, extraJaarhuurEuro: number): Bandbreedte | null {
  if (extraJaarhuurEuro <= 0) return null;
  return {
    // optimistisch rendement hoort bij de laagste investering
    optimistisch: rondAfOp2Decimalen((100 * extraJaarhuurEuro) / investering.optimistisch),
    verwacht: rondAfOp2Decimalen((100 * extraJaarhuurEuro) / investering.verwacht),
    pessimistisch: rondAfOp2Decimalen((100 * extraJaarhuurEuro) / investering.pessimistisch),
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
