import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index.js';
import { rondAfOpKwartpunten, ruimtesPerKamer } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R9 — Gemeenschappelijke vertrekken, overige ruimten en voorzieningen (§2.9).
 *
 * LET OP de nummering: `wwso.xlsx` noemt dit R7, maar volgens het beleidsboek is R7
 * "Woonvoorzieningen voor personen met een handicap" en zijn gemeenschappelijke vertrekken
 * rubriek 9 (briefing B1). Sinds taak 6 wordt dit automatisch afgeleid uit de ruimtetypen
 * 'Gemeenschappelijk vertrek' (1 pt/m²) en 'Gemeenschappelijke overige ruimte' (0,75 pt/m²),
 * in plaats van handmatig ingevoerd — het datamodel had de ruimtetypen al (TODO-04).
 *
 * Dubbele deling (§2.9.1): eerst door het aantal adressen in het woongebouw met toegang, dan
 * door het aantal kamers met toegang op het eigen adres (briefing B10). Punten voor
 * verwarming/verkoeling/keuken/sanitair in deze ruimtes lopen apart via R3/R5/R6, die al op
 * ruimteNr werken zonder type-filter (§2.9.2) — R3 is in taak 6 uitgebreid met deze
 * ruimtetypen, zie r3-verwarming.ts.
 *
 * §2.9.4: bij een zorgwoning past de Huurcommissie een vuistregel toe van 3 punten per
 * woning, in plaats van de gemeenschappelijke ruimten te meten. Deze rubriek volgt die
 * vuistregel letterlijk: als `handmatigePosten.zorgwoning` is aangevinkt, vervangt 3 punten
 * per kamer de m²-berekening volledig, ook als er wél 'Gemeenschappelijk vertrek'-ruimtes
 * zijn ingevoerd.
 */
export function berekenR9(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];
  const t = tarievenset.gemeenschappelijkeRuimten;

  if (input.handmatigePosten.zorgwoning) {
    for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
      perKamer[kamer] = t.zorgwoningPuntenPerWoning;
      perKamerRuw[kamer] = t.zorgwoningPuntenPerWoning;
    }
    toelichting.push(
      `R9: zorgwoning → vuistregel van ${t.zorgwoningPuntenPerWoning} pt per woning (§2.9.4), geen m²-berekening`,
    );
    return { perKamer, perKamerRuw, toelichting };
  }

  const perKamerRuimtes = ruimtesPerKamer(input);
  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const vertrekken = ruimtes.filter((r) => r.ruimte.type === 'Gemeenschappelijk vertrek');
    const overigeRuimtes = ruimtes.filter((r) => r.ruimte.type === 'Gemeenschappelijke overige ruimte');

    const bijdrage = (r: (typeof vertrekken)[number], puntenPerM2: number) => {
      const adressen = r.ruimte.aantalAdressenMetToegang ?? 1;
      return (puntenPerM2 * r.ruimte.oppervlakteM2) / adressen / r.nKamersMetToegang;
    };

    const vertrekPunten = vertrekken.reduce((som, r) => som + bijdrage(r, t.vertrekPuntenPerM2), 0);
    const overigePunten = overigeRuimtes.reduce((som, r) => som + bijdrage(r, t.overigeRuimtePuntenPerM2), 0);
    const ruwPunten = vertrekPunten + overigePunten;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;

    if (vertrekken.length === 0 && overigeRuimtes.length === 0) {
      toelichting.push(`R9 kamer ${kamer}: geen gemeenschappelijke vertrekken of overige ruimten → 0 pt`);
    } else {
      toelichting.push(
        `R9 kamer ${kamer}: gemeenschappelijke vertrekken ${vertrekPunten.toFixed(4)} pt + gemeenschappelijke overige ruimten ${overigePunten.toFixed(4)} pt = ${ruwPunten.toFixed(4)} pt → ${punten} pt`,
      );
    }
  }

  return { perKamer, perKamerRuw, toelichting };
}
