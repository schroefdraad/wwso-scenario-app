import type { PandInvoer, RuimteType } from '../types/index';
import {
  OVERIGE_RUIMTE_TYPES,
  VERKEERSRUIMTE_TYPES,
  VERTREK_TYPES,
  rondAfOpKwartpunten,
  ruimtesPerKamer,
} from './gedeeld';
import type { RubriekResultaat } from './types';

const PUNTEN_PER_VERWARMD_VERTREK = 2;
const PUNTEN_PER_VERWARMDE_OVERIGE_RUIMTE = 1;
const MAX_OVERIGE_VERWARMD_PUNTEN = 4;
const PUNTEN_PER_VERKOELD_VERTREK = 1;
const MAX_VERKOELD_PUNTEN = 2;

/**
 * §2.9.2 (ontdekt bij het bouwen van R9, taak 6): "Punten voor voorzieningen, zoals verkoeling
 * en verwarming, [...] die zich bevinden in gemeenschappelijke vertrekken en overige ruimten
 * worden gewaardeerd volgens het woningwaarderingsstelsel." Een gemeenschappelijk vertrek is
 * voor déze telling dus gewoon een vertrek, en een gemeenschappelijke overige ruimte gewoon
 * een overige ruimte — de m²-punten van R9 zelf blijven apart (die tellen niet hier mee).
 */
export const VERWARMING_VERTREK_TYPES: readonly RuimteType[] = [...VERTREK_TYPES, 'Gemeenschappelijk vertrek'];
export const VERWARMING_OVERIGE_TYPES: readonly RuimteType[] = [
  ...OVERIGE_RUIMTE_TYPES,
  ...VERKEERSRUIMTE_TYPES,
  'Gemeenschappelijke overige ruimte',
];

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
 *
 * OPEN KEUKEN (§2.3.2, cross-validatie tegen de Huurcommissie Huurprijscheck, 2026-09-04): een
 * ruimte met een eigen aanrecht (een `Keuken`-voorziening waarvan `ruimte.type !== 'Keuken'`,
 * bijv. een kitchenette in een slaapkamer) wordt voor déze rubriek als twee losse binnenruimten
 * gewaardeerd — het vertrek zelf, én de open keuken erin — mits allebei verwarmd. "Een privé
 * verwarmde woonkamer met open keuken wordt dus gewaardeerd met 4 punten." Een standalone
 * `Keuken`-type ruimte valt hier NIET onder: die is al volledig gedekt door haar eigen
 * vertrek-waardering (`Keuken` zit al in `VERWARMING_VERTREK_TYPES`), er is dan maar één
 * binnenruimte, geen twee verbonden ruimtes.
 */
export function berekenR3(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const keukenPerRuimteNr = new Map(input.keukens.map((k) => [k.ruimteNr, k] as const));
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const vertrekkenVerwarmd = ruimtes.filter(
      (r) => VERWARMING_VERTREK_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd,
    );
    const overigeVerwarmd = ruimtes.filter(
      (r) => VERWARMING_OVERIGE_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd,
    );
    const vertrekkenVerwarmdEnVerkoeld = ruimtes.filter(
      (r) => VERWARMING_VERTREK_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd && r.ruimte.verkoeld,
    );
    const openKeukensVerwarmd = ruimtes.filter((r) => {
      if (r.ruimte.type === 'Keuken') return false;
      const keuken = keukenPerRuimteNr.get(r.ruimte.nr);
      return keuken?.verwarmd === true;
    });

    const vertrekPunten = vertrekkenVerwarmd.reduce(
      (som, r) => som + PUNTEN_PER_VERWARMD_VERTREK / r.nKamersMetToegang,
      0,
    );
    const openKeukenPunten = openKeukensVerwarmd.reduce(
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

    const ruwPunten = vertrekPunten + openKeukenPunten + overigePunten + verkoeldPunten;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;

    toelichting.push(
      `R3 kamer ${kamer}: verwarmde vertrekken ${vertrekPunten.toFixed(2)} pt + verwarmde open keukens ${openKeukenPunten.toFixed(2)} pt (§2.3.2) + verwarmde overige/verkeersruimten ${overigePunten.toFixed(2)} pt (max ${MAX_OVERIGE_VERWARMD_PUNTEN}, ruw ${overigeRuw.toFixed(2)}) + verwarmd én verkoelde vertrekken ${verkoeldPunten.toFixed(2)} pt (max ${MAX_VERKOELD_PUNTEN}, ruw ${verkoeldRuw.toFixed(2)}) → ${punten} pt`,
    );
  }

  return { perKamer, perKamerRuw, toelichting };
}
