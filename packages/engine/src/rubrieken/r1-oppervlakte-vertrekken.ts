import type { PandInvoer } from '../types/index.js';
import {
  VERTREK_TYPES,
  oppervlakteVolgensRekenregel,
  rondAfOpKwartpunten,
  ruimtesPerKamer,
} from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R1 — Oppervlakte vertrekken (§2.2.1). 1 punt per m², waarbij de afronding op **vierkante
 * meters** gebeurt en niet op punten (§2.1.1.1), apart voor privé en gemeenschappelijk.
 * De rubriek zelf rondt daarna af op kwartpunten (§2.1.6) — bij 1 punt per hele m² is dat
 * een no-op, maar de regel wordt gevolgd zodat de rubriek zich gedraagt als alle andere.
 */
export function berekenR1(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const { priveM2, gedeeldM2, totaalM2 } = oppervlakteVolgensRekenregel(ruimtes, VERTREK_TYPES);
    const ruwPunten = totaalM2 * 1;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;

    const vertrekken = ruimtes.filter((r) => VERTREK_TYPES.includes(r.ruimte.type));
    if (vertrekken.length > 0) {
      const regels = vertrekken
        .map((r) =>
          r.nKamersMetToegang > 1
            ? `${r.ruimte.naam}: ${r.ruimte.oppervlakteM2} m² ÷ ${r.nKamersMetToegang} kamers`
            : `${r.ruimte.naam}: ${r.ruimte.oppervlakteM2} m²`,
        )
        .join(', ');
      toelichting.push(
        `R1 kamer ${kamer}: ${regels} → privé ${priveM2} m² + gedeeld ${gedeeldM2} m² = ${totaalM2} m² × 1 pt = ${punten} pt`,
      );
    } else {
      toelichting.push(`R1 kamer ${kamer}: geen vertrekken toegankelijk → 0 pt`);
    }
  }

  return { perKamer, perKamerRuw, toelichting };
}
