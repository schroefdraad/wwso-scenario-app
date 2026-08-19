import type { PandInvoer } from '../types/index.js';
import { VERTREK_TYPES, rondAfOpHelePunten, ruimtesPerKamer, vertrekOppervlakteRuw } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R1 — Oppervlakte vertrekken (§2.2.1). 1 punt per m² privévertrek, keuken of badruimte;
 * gedeelde vertrekken worden gedeeld door het aantal kamers met toegang. Rondt als enige
 * rubriek af op hele punten per kamer (taak-4-instructie), niet op kwartpunten.
 */
export function berekenR1(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const vertrekken = ruimtes.filter((r) => VERTREK_TYPES.includes(r.ruimte.type));
    const ruwPunten = vertrekOppervlakteRuw(ruimtes);
    const punten = rondAfOpHelePunten(ruwPunten);
    perKamer[kamer] = punten;

    if (vertrekken.length > 0) {
      const regels = vertrekken
        .map((r) =>
          r.nKamersMetToegang > 1
            ? `${r.ruimte.naam} (${r.ruimte.type}): ${r.ruimte.oppervlakteM2} m² ÷ ${r.nKamersMetToegang} kamers`
            : `${r.ruimte.naam} (${r.ruimte.type}): ${r.ruimte.oppervlakteM2} m²`,
        )
        .join(', ');
      toelichting.push(`R1 kamer ${kamer}: ${regels} = ${ruwPunten.toFixed(2)} → ${punten} pt`);
    } else {
      toelichting.push(`R1 kamer ${kamer}: geen privévertrek, keuken of badruimte toegankelijk → 0 pt`);
    }
  }

  return { perKamer, toelichting };
}
