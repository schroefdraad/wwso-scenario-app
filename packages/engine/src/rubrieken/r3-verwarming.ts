import type { PandInvoer } from '../types/index.js';
import {
  OVERIGE_RUIMTE_TYPES,
  VERKEERSRUIMTE_TYPES,
  VERTREK_TYPES,
  rondAfOpKwartpunten,
  ruimtesPerKamer,
} from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

const PUNTEN_PER_VERWARMD_VERTREK = 2;
const PUNTEN_PER_VERWARMDE_OVERIGE_RUIMTE = 1;
const MAX_OVERIGE_VERWARMD_PUNTEN = 4;
const PUNTEN_PER_VERKOELD_VERTREK = 1;
const MAX_VERKOELD_PUNTEN = 2;

/**
 * R3 — Verwarming en verkoeling (§2.3).
 *
 * "Vertrekken, overige ruimtes én verkeersruimtes kunnen punten krijgen als deze zijn
 * verwarmd, namelijk 2 punten per verwarmd vertrek en 1 punt voor overige ruimtes en
 * verkeersruimten. Voor de laatste twee soorten binnenruimten geldt een maximum van 4
 * punten." (§2.3)
 *
 * Verkoeling is een *extra* punt bovenop een verwarmd vertrek: "1 punt extra per verwarmd
 * én verkoeld privévertrek (tot maximaal 2 punten)" (§2.3.1), en "Alleen vertrekken komen
 * in aanmerking voor een waardering door een verkoelingsfunctie" (§2.3.3). Een verkoelde
 * maar onverwarmde ruimte levert dus niets op, en een verkoelde overige ruimte evenmin.
 *
 * INTERPRETATIE: het maximum van 4 geldt hier als één gezamenlijke bovengrens voor overige
 * ruimten én verkeersruimten samen, conform de formulering "de laatste twee soorten
 * binnenruimten" in §2.3. §2.3.1 herhaalt het maximum apart bij de privé- en de
 * gemeenschappelijke variant, wat ook als twee losse maxima te lezen valt.
 */
export function berekenR3(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const vertrekkenVerwarmd = ruimtes.filter(
      (r) => VERTREK_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd,
    );
    const overigeVerwarmd = ruimtes.filter(
      (r) =>
        (OVERIGE_RUIMTE_TYPES.includes(r.ruimte.type) ||
          VERKEERSRUIMTE_TYPES.includes(r.ruimte.type)) &&
        r.ruimte.verwarmd,
    );
    const vertrekkenVerwarmdEnVerkoeld = ruimtes.filter(
      (r) => VERTREK_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd && r.ruimte.verkoeld,
    );

    const vertrekPunten = vertrekkenVerwarmd.reduce(
      (som, r) => som + PUNTEN_PER_VERWARMD_VERTREK / r.nKamersMetToegang,
      0,
    );
    const overigeRuw = overigeVerwarmd.reduce(
      (som, r) => som + PUNTEN_PER_VERWARMDE_OVERIGE_RUIMTE / r.nKamersMetToegang,
      0,
    );
    const overigePunten = Math.min(overigeRuw, MAX_OVERIGE_VERWARMD_PUNTEN);
    const verkoeldRuw = vertrekkenVerwarmdEnVerkoeld.reduce(
      (som, r) => som + PUNTEN_PER_VERKOELD_VERTREK / r.nKamersMetToegang,
      0,
    );
    const verkoeldPunten = Math.min(verkoeldRuw, MAX_VERKOELD_PUNTEN);

    const ruwPunten = vertrekPunten + overigePunten + verkoeldPunten;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;

    toelichting.push(
      `R3 kamer ${kamer}: verwarmde vertrekken ${vertrekPunten.toFixed(2)} pt + verwarmde overige/verkeersruimten ${overigePunten.toFixed(2)} pt (max ${MAX_OVERIGE_VERWARMD_PUNTEN}, ruw ${overigeRuw.toFixed(2)}) + verwarmd én verkoelde vertrekken ${verkoeldPunten.toFixed(2)} pt (max ${MAX_VERKOELD_PUNTEN}, ruw ${verkoeldRuw.toFixed(2)}) → ${punten} pt`,
    );
  }

  return { perKamer, perKamerRuw, toelichting };
}
