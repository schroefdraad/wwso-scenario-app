import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index';
import { nulPerKamer, rondAfOpKwartpunten } from './gedeeld';
import type { RubriekResultaat } from './types';

/**
 * R12 — Bijzondere voorzieningen (§2.12). Het beleidsboek bundelt hier drie heel verschillende
 * mechanismen; deze rubriek berekent alleen de twee die als echte punten meetellen:
 *
 * - §2.12.2 aanbelfunctie met video: 0,25 punt, gedeeld door de kamers met toegang.
 * - §2.12.3 losse laadpaal (niet gekoppeld aan een gemeenschappelijke parkeerplek, die loopt
 *   via R10): 2 punten, eveneens gedeeld door de kamers met toegang. Beide volgens de
 *   algemene deelregel van §2.1.5 — geen van beide paragrafen noemt zelf een deler, maar de
 *   Huurcommissie past die regel toe op alle gedeelde voorzieningen.
 *
 * §2.12.1 (zorgwoning: +35% op de rubrieken 1 t/m 11) is GEEN puntenbijdrage aan déze
 * rubriek — het is een percentage-opslag op het subtotaal van R1-11, die pas bij de
 * eindtelling (taak 7) wordt toegepast. `handmatigePosten.zorgwoning` blijft daarvoor
 * beschikbaar; deze functie raakt het subtotaal niet aan.
 */
export function berekenR12(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const ruwPerKamer = nulPerKamer(input.pand.aantalKamers);
  const toelichting: string[] = [];
  const t = tarievenset.bijzondereVoorzieningen;

  for (const [i, post] of input.handmatigePosten.aanbelfuncties.entries()) {
    const perKamerBijdrage = t.aanbelfunctieMetVideoPunten / post.kamersMetToegang.length;
    for (const kamer of post.kamersMetToegang) {
      if (kamer > input.pand.aantalKamers) continue;
      ruwPerKamer.set(kamer, (ruwPerKamer.get(kamer) ?? 0) + perKamerBijdrage);
    }
    toelichting.push(
      `R12 aanbelfunctie ${i + 1}: ${t.aanbelfunctieMetVideoPunten} pt ÷ ${post.kamersMetToegang.length} kamers (${post.kamersMetToegang.join(', ')}) = ${perKamerBijdrage.toFixed(4)} pt elk`,
    );
  }

  for (const [i, post] of input.handmatigePosten.losseLaadpalen.entries()) {
    const perKamerBijdrage = t.losseLaadpaalPunten / post.kamersMetToegang.length;
    for (const kamer of post.kamersMetToegang) {
      if (kamer > input.pand.aantalKamers) continue;
      ruwPerKamer.set(kamer, (ruwPerKamer.get(kamer) ?? 0) + perKamerBijdrage);
    }
    toelichting.push(
      `R12 losse laadpaal ${i + 1}: ${t.losseLaadpaalPunten} pt ÷ ${post.kamersMetToegang.length} kamers (${post.kamersMetToegang.join(', ')}) = ${perKamerBijdrage.toFixed(4)} pt elk`,
    );
  }

  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  for (const [kamer, ruw] of ruwPerKamer) {
    perKamerRuw[kamer] = ruw;
    perKamer[kamer] = rondAfOpKwartpunten(ruw);
  }

  if (
    input.handmatigePosten.aanbelfuncties.length === 0 &&
    input.handmatigePosten.losseLaadpalen.length === 0
  ) {
    toelichting.push('R12: geen aanbelfunctie en geen losse laadpaal → 0 pt voor alle kamers');
  }
  if (input.handmatigePosten.zorgwoning) {
    toelichting.push(
      `R12: zorgwoning aangevinkt → +${t.zorgwoningOpslagPercentage}% op het subtotaal van R1 t/m R11 wordt toegepast bij de eindtelling (taak 7), niet hier`,
    );
  }

  return { perKamer, perKamerRuw, toelichting };
}
