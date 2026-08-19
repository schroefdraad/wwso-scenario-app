import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index.js';
import { rondAfOpKwartpunten, ruimtesPerKamer, vertrekOppervlakteRuw } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * Zoekt de energieprestatiefactor op: rechtstreeks op energielabel, of — als het pand geen
 * label heeft ('Bouwjaar' is de xlsx-sentinelwaarde daarvoor, zie packages/engine/src/types/pand.ts) —
 * via de bouwjaargrens-tabel. De grenzen zijn allemaal bovengrenzen ("Bouwjaar t/m"); de laagste
 * grens (1976) heeft dus geen ondergrens en dekt elk ouder pand. Alleen een bouwjaar ná de
 * hoogste grens (2099) valt buiten de tabel — dat gooit een expliciete fout in plaats van
 * stilzwijgend op de hoogste factor terug te vallen.
 */
function zoekFactor(pand: PandInvoer['pand'], tarievenset: Tarievenset): number {
  if (pand.energielabel !== 'Bouwjaar') {
    const regel = tarievenset.energielabelfactoren.find((f) => f.label === pand.energielabel);
    if (!regel) {
      throw new Error(`Geen energielabelfactor gevonden voor label '${pand.energielabel}'.`);
    }
    return regel.factorPerM2;
  }

  const passendeGrenzen = tarievenset.bouwjaargrenzen
    .filter((b) => b.totEnMetBouwjaar >= pand.bouwjaar)
    .sort((a, b) => a.totEnMetBouwjaar - b.totEnMetBouwjaar);
  const regel = passendeGrenzen[0];
  if (!regel) {
    const hoogsteGrens = Math.max(...tarievenset.bouwjaargrenzen.map((b) => b.totEnMetBouwjaar));
    throw new Error(
      `Geen bouwjaargrens gevonden voor bouwjaar ${pand.bouwjaar} — de tabel dekt alleen bouwjaar t/m ${hoogsteGrens}.`,
    );
  }
  return regel.factorPerM2;
}

/**
 * R4 — Energieprestatie (§2.4). Past de energielabel- (of bouwjaar-)factor toe op dezelfde
 * vertrek-oppervlakte die R1 gebruikt ("R1 grondbasis"). Geen aparte rubriek-instructie voor
 * afronding in taak 4 → volgt de harde-regel-7-standaard (kwartpuntsafronding), zoals R2/R3.
 */
export function berekenR4(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const toelichting: string[] = [];
  const factor = zoekFactor(input.pand, tarievenset);

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const oppervlakte = vertrekOppervlakteRuw(ruimtes);
    const punten = rondAfOpKwartpunten(oppervlakte * factor);
    perKamer[kamer] = punten;

    toelichting.push(
      `R4 kamer ${kamer}: factor ${factor} (${input.pand.energielabel === 'Bouwjaar' ? `bouwjaar ${input.pand.bouwjaar}` : `label ${input.pand.energielabel}`}) × ${oppervlakte.toFixed(2)} m² (R1-basis) → ${punten} pt`,
    );
  }

  return { perKamer, toelichting };
}
