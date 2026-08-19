import type { PandInvoer } from '../types/index.js';
import {
  OVERIGE_RUIMTE_TYPES,
  oppervlakteVolgensRekenregel,
  rondAfOpKwartpunten,
  ruimtesPerKamer,
} from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

const PUNT_PER_M2 = 0.75;
const ZOLDER_AFTREK = 5;

/**
 * R2 — Oppervlakte overige ruimten (§2.2.2). 0,75 punt per m², met dezelfde m²-afronding
 * als R1 (§2.2.2.1), gevolgd door kwartpuntsafronding per rubriek (§2.1.6).
 *
 * Inclusief de zolderaftrek van §2.2.2.3: een zolder die als overige ruimte telt en géén
 * vaste trap heeft, kost 5 punten, "maar er kunnen nooit meer punten afgetrokken worden dan
 * het totaal aantal punten dat de zolderruimte zelf waard is".
 *
 * INTERPRETATIE: bij een gedeelde zolder wordt de begrensde aftrek daarna over de kamers
 * met toegang verdeeld, net als de waardering zelf. Het beleidsboek zegt hier niets over.
 */
export function berekenR2(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const { priveM2, gedeeldM2, totaalM2 } = oppervlakteVolgensRekenregel(
      ruimtes,
      OVERIGE_RUIMTE_TYPES,
    );
    const oppervlaktePunten = totaalM2 * PUNT_PER_M2;

    const zoldersZonderTrap = ruimtes.filter(
      (r) =>
        OVERIGE_RUIMTE_TYPES.includes(r.ruimte.type) &&
        r.ruimte.zolder !== undefined &&
        !r.ruimte.zolder.vasteTrap,
    );
    const aftrek = zoldersZonderTrap.reduce((som, r) => {
      const zolderWaarde = r.ruimte.oppervlakteM2 * PUNT_PER_M2;
      return som + Math.min(ZOLDER_AFTREK, zolderWaarde) / r.nKamersMetToegang;
    }, 0);

    const ruwPunten = oppervlaktePunten - aftrek;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;

    const overigeRuimten = ruimtes.filter((r) => OVERIGE_RUIMTE_TYPES.includes(r.ruimte.type));
    if (overigeRuimten.length > 0) {
      const aftrekRegel =
        aftrek > 0 ? ` − ${aftrek.toFixed(2)} pt zolderaftrek (geen vaste trap, §2.2.2.3)` : '';
      toelichting.push(
        `R2 kamer ${kamer}: privé ${priveM2} m² + gedeeld ${gedeeldM2} m² = ${totaalM2} m² × 0,75 = ${oppervlaktePunten.toFixed(2)} pt${aftrekRegel} → ${punten} pt`,
      );
    } else {
      toelichting.push(`R2 kamer ${kamer}: geen overige ruimten toegankelijk → 0 pt`);
    }
  }

  return { perKamer, perKamerRuw, toelichting };
}
