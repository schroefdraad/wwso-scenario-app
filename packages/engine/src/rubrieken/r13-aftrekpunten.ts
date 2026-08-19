import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index.js';
import { rondAfOpKwartpunten, ruimtesPerKamer, vertrekOppervlakteM2 } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R13 — Aftrekpunten (§2.13). Vier situaties, elk onafhankelijk −4 punten — een kamer die aan
 * twee situaties voldoet verliest dus 8 punten.
 *
 * 1. R1-oppervlakte (§2.1-grondslag, dus inclusief het toegerekende aandeel in gedeelde
 *    vertrekken) < 8 m² — berekent de motor zelf uit dezelfde grondslag als R1/R4
 *    (`vertrekOppervlakteM2`), niet uit alleen het privévertrek zoals de xlsx suggereerde
 *    (briefing B13).
 * 2. t/m 4. Verhuurder-criterium, ruitoppervlakte en raamkozijnhoogte zijn niet uit de
 *    ruimte-invoer af te leiden en komen uit `handmatigePosten.aftrekSituaties`.
 */
export function berekenR13(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];
  const aftrek = tarievenset.aftrekPuntenPerSituatie;
  const s = input.handmatigePosten.aftrekSituaties;

  const MIN_OPPERVLAKTE_M2 = 8;

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const oppervlakteM2 = vertrekOppervlakteM2(ruimtes);
    const situaties: string[] = [];

    if (oppervlakteM2 < MIN_OPPERVLAKTE_M2) {
      situaties.push(`R1-oppervlakte ${oppervlakteM2} m² < ${MIN_OPPERVLAKTE_M2} m²`);
    }
    if (s.verhuurderCriterium.includes(kamer)) {
      situaties.push('hoofdverblijf verhuurder + woonruimte/sanitair alleen via diens vertrek bereikbaar');
    }
    if (s.ruitoppervlakteOnvoldoende.includes(kamer)) {
      situaties.push('ruitoppervlakte hoofdwoonvertrek < 0,75 m²');
    }
    if (s.raamkozijnTeHoog.includes(kamer)) {
      situaties.push('laagste raamkozijn hoofdwoonvertrek > 1,60 m boven de vloer');
    }

    const ruwPunten = -(situaties.length * aftrek);
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;

    toelichting.push(
      situaties.length === 0
        ? `R13 kamer ${kamer}: geen van de aftreksituaties van toepassing → 0 pt`
        : `R13 kamer ${kamer}: ${situaties.length} situatie(s) × −${aftrek} pt (${situaties.join('; ')}) = ${ruwPunten} pt`,
    );
  }

  return { perKamer, perKamerRuw, toelichting };
}
