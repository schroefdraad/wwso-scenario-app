import type { PandInvoer } from '../types/index.js';
import { OVERIGE_RUIMTE_TYPES, rondAfOpKwartpunten, ruimtesPerKamer } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R2 — Oppervlakte overige ruimten (§2.2.2). 0,75 punt per m² berging, bijkeuken, wasruimte,
 * overige ruimte of toiletruimte; gedeeld door het aantal kamers met toegang. Kwartpuntsafronding.
 */
export function berekenR2(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const overigeRuimten = ruimtes.filter((r) => OVERIGE_RUIMTE_TYPES.includes(r.ruimte.type));
    const ruwPunten = overigeRuimten.reduce(
      (som, r) => som + (0.75 * r.ruimte.oppervlakteM2) / r.nKamersMetToegang,
      0,
    );
    const punten = rondAfOpKwartpunten(ruwPunten);
    perKamer[kamer] = punten;

    if (overigeRuimten.length > 0) {
      const regels = overigeRuimten
        .map((r) =>
          r.nKamersMetToegang > 1
            ? `${r.ruimte.naam} (${r.ruimte.type}): 0,75 × ${r.ruimte.oppervlakteM2} m² ÷ ${r.nKamersMetToegang} kamers`
            : `${r.ruimte.naam} (${r.ruimte.type}): 0,75 × ${r.ruimte.oppervlakteM2} m²`,
        )
        .join(', ');
      toelichting.push(`R2 kamer ${kamer}: ${regels} = ${ruwPunten.toFixed(2)} → ${punten} pt`);
    } else {
      toelichting.push(`R2 kamer ${kamer}: geen overige ruimten toegankelijk → 0 pt`);
    }
  }

  return { perKamer, toelichting };
}
