import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index.js';
import { rondAfOp2Decimalen, rondAfOpHelePunten } from '../rubrieken/gedeeld.js';
import {
  berekenR1,
  berekenR2,
  berekenR3,
  berekenR4,
  berekenR5,
  berekenR6,
  berekenR7,
  berekenR8,
  berekenR9,
  berekenR10,
  berekenR11,
  berekenR12,
  berekenR13,
} from '../rubrieken/index.js';
import { bepaalMaxHuur } from './huurprijs.js';
import { bepaalMonumentopslag } from './monumentopslag.js';
import type { EindtellingKamer, EindtellingResultaat, RubriekPunten } from './types.js';

/**
 * Eindtelling (§2.1.7/§2.1.8, §2.12.1, §2.14): telt de dertien rubrieken bij elkaar op tot de
 * maximale huurprijs per kamer. Roept alle `berekenRn`-functies zelf aan — de aanroeper hoeft
 * ze niet los te berekenen.
 *
 * Volgorde, per kamer:
 * 1. R1 t/m R11 optellen (elk al kwartpunt-afgerond door de eigen rubriekfunctie, §2.1.6).
 * 2. Bij een zorgwoning dat subtotaal met 35% verhogen (§2.12.1) — dit is een aanpassing van
 *    het R1-11-subtotaal, geen eigen kwartpuntafronding: die geldt alleen per rubriek.
 * 3. R12 en R13 optellen bij dat (eventueel verhoogde) subtotaal.
 * 4. Eindsaldering op hele punten (§2.1.7).
 * 5. Bij een Rijksmonument met een huurovereenkomst van vóór 1 juli 2024: +10 punten (§2.14.3)
 *    — ná de eindsaldering, want dit is geen rubriekpunt maar een monumentopslag.
 * 6. Huurprijs-lookup met extrapolatie boven 250 punten (§2.1.8).
 * 7. Percentage-opslag monument (Rijks 35% bij een recenter contract, Gemeente/Provinciaal
 *    15%, beschermd dorpsgezicht 5%) toepassen op de maximale huurprijs.
 */
export function berekenEindtelling(
  input: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
): EindtellingResultaat {
  const r1 = berekenR1(input);
  const r2 = berekenR2(input);
  const r3 = berekenR3(input);
  const r4 = berekenR4(input, tarievenset, peildatum);
  const r5 = berekenR5(input, tarievenset);
  const r6 = berekenR6(input, tarievenset);
  const r7 = berekenR7(input, tarievenset);
  const r8 = berekenR8(input, tarievenset);
  const r9 = berekenR9(input, tarievenset);
  const r10 = berekenR10(input, tarievenset);
  const r11 = berekenR11(input, tarievenset);
  const r12 = berekenR12(input, tarievenset);
  const r13 = berekenR13(input, tarievenset);

  const monument = bepaalMonumentopslag(input.pand);
  const toelichting: string[] = [`Eindtelling: monumentopslag → ${monument.grondslag}`];
  if (input.handmatigePosten.zorgwoning) {
    toelichting.push(
      `Eindtelling: zorgwoning → +${tarievenset.bijzondereVoorzieningen.zorgwoningOpslagPercentage}% op het subtotaal van R1 t/m R11 (§2.12.1)`,
    );
  }

  const perKamer: Record<number, EindtellingKamer> = {};

  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    const rubrieken: RubriekPunten = {
      r1: r1.perKamer[kamer] ?? 0,
      r2: r2.perKamer[kamer] ?? 0,
      r3: r3.perKamer[kamer] ?? 0,
      r4: r4.perKamer[kamer] ?? 0,
      r5: r5.perKamer[kamer] ?? 0,
      r6: r6.perKamer[kamer] ?? 0,
      r7: r7.perKamer[kamer] ?? 0,
      r8: r8.perKamer[kamer] ?? 0,
      r9: r9.perKamer[kamer] ?? 0,
      r10: r10.perKamer[kamer] ?? 0,
      r11: r11.perKamer[kamer] ?? 0,
      r12: r12.perKamer[kamer] ?? 0,
      r13: r13.perKamer[kamer] ?? 0,
    };

    const subtotaalR1TotEnMet11 =
      rubrieken.r1 +
      rubrieken.r2 +
      rubrieken.r3 +
      rubrieken.r4 +
      rubrieken.r5 +
      rubrieken.r6 +
      rubrieken.r7 +
      rubrieken.r8 +
      rubrieken.r9 +
      rubrieken.r10 +
      rubrieken.r11;

    const zorgwoningFactor = input.handmatigePosten.zorgwoning
      ? 1 + tarievenset.bijzondereVoorzieningen.zorgwoningOpslagPercentage / 100
      : 1;
    const subtotaalMetZorgwoning = subtotaalR1TotEnMet11 * zorgwoningFactor;
    const zorgwoningOpslagPunten = subtotaalMetZorgwoning - subtotaalR1TotEnMet11;

    const totaalVoorEindsaldering = subtotaalMetZorgwoning + rubrieken.r12 + rubrieken.r13;
    const totaalPunten = rondAfOpHelePunten(totaalVoorEindsaldering);
    const puntenVoorHuurprijs = totaalPunten + monument.extraPunten;

    const huurprijs = bepaalMaxHuur(puntenVoorHuurprijs, tarievenset);
    const maxHuurEuro = rondAfOp2Decimalen(huurprijs.maxHuurEuro * (1 + monument.percentage / 100));

    perKamer[kamer] = {
      rubrieken,
      subtotaalR1TotEnMet11,
      zorgwoningOpslagPunten,
      totaalVoorEindsaldering,
      totaalPunten,
      monumentPunten: monument.extraPunten,
      puntenVoorHuurprijs,
      maxHuurExclOpslagEuro: huurprijs.maxHuurEuro,
      opslagPercentage: monument.percentage,
      opslagGrondslag: monument.grondslag,
      maxHuurEuro,
    };
  }

  return { perKamer, toelichting };
}
