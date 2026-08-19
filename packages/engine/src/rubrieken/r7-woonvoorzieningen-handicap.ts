import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index.js';
import { nulPerKamer, rondAfOpKwartpunten } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R7 — Woonvoorzieningen voor personen met een handicap (§2.7). Ontbreekt volledig in
 * `wwso.xlsx` (briefing B1). 1 punt per € 332,00 netto-investering, gedeeld door het aantal
 * personen met een handicap dat toegang en gebruiksrecht heeft — dat zijn de kamers uit
 * `kamersMetToegang`, niet per se alle kamers van het pand.
 *
 * De voorwaarden van §2.7.1 t/m §2.7.3 (moment van de ingreep, gedeeltelijke subsidiëring,
 * geen waardering bij volledige subsidiedekking) zijn een toets vooraf door de gebruiker:
 * `nettoInvesteringEuro` is per definitie al het bedrag dat ná die toets overblijft.
 */
export function berekenR7(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const ruwPerKamer = nulPerKamer(input.pand.aantalKamers);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [i, post] of input.handmatigePosten.woonvoorzieningenHandicap.entries()) {
    const totaalPunten = post.nettoInvesteringEuro / tarievenset.handicapVoorzieningenEuroPerPunt;
    const perPersoon = totaalPunten / post.kamersMetToegang.length;

    for (const kamer of post.kamersMetToegang) {
      if (kamer > input.pand.aantalKamers) continue;
      ruwPerKamer.set(kamer, (ruwPerKamer.get(kamer) ?? 0) + perPersoon);
    }

    toelichting.push(
      `R7 post ${i + 1}: € ${post.nettoInvesteringEuro} ÷ € ${tarievenset.handicapVoorzieningenEuroPerPunt} = ${totaalPunten.toFixed(4)} pt ÷ ${post.kamersMetToegang.length} persoon/personen met toegang (kamer ${post.kamersMetToegang.join(', ')}) = ${perPersoon.toFixed(4)} pt elk`,
    );
  }

  for (const [kamer, ruw] of ruwPerKamer) {
    perKamerRuw[kamer] = ruw;
    perKamer[kamer] = rondAfOpKwartpunten(ruw);
  }

  if (input.handmatigePosten.woonvoorzieningenHandicap.length === 0) {
    toelichting.push('R7: geen woonvoorzieningen voor personen met een handicap → 0 pt voor alle kamers');
  }

  return { perKamer, perKamerRuw, toelichting };
}
