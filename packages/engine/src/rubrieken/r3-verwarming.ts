import type { PandInvoer } from '../types/index.js';
import { OVERIGE_RUIMTE_TYPES, VERTREK_TYPES, rondAfOpKwartpunten, ruimtesPerKamer } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

const MAX_OVERIGE_VERWARMD_PUNTEN = 4;
const MAX_VERKOELD_PUNTEN = 2;

/**
 * R3 — Verwarming en verkoeling (§2.3). Drie componenten per kamer:
 * 1. 2 pt per verwarmd privévertrek/keuken/badruimte
 * 2. 1 pt per verwarmde overige ruimte (§2.2.2-typen), gezamenlijk gemaximeerd op 4 pt
 * 3. 1 pt per verkoelde ruimte (vertrek- of overige-typen), gezamenlijk gemaximeerd op 2 pt —
 *    telt onafhankelijk van (1) en (2) mee, een ruimte kan zowel verwarmd als verkoeld zijn
 *
 * INTERPRETATIEKEUZE (geen letterlijke xlsx-formule beschikbaar, zie rapport taak 4):
 * net als bij R1/R2 wordt elke ruimte gedeeld door het aantal kamers met toegang, óók bij de
 * componenten 2 en 3. Dat is de reden dat R3 — net als R2 — op kwartpunten afrondt: bij een
 * ongedeelde ruimte (n_kamers=1) zijn de punten altijd hele getallen, dus deze afronding doet
 * dan niets. De maxima (4 resp. 2) worden toegepast op de gedeelde som per kamer, niet op het
 * aantal ruimten — met een niet-gedeelde ruimte komt dat op hetzelfde neer als "tellen tot 4/2".
 */
export function berekenR3(input: PandInvoer): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const toelichting: string[] = [];

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const vertrekVerwarmd = ruimtes.filter((r) => VERTREK_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd);
    const overigeVerwarmd = ruimtes.filter((r) => OVERIGE_RUIMTE_TYPES.includes(r.ruimte.type) && r.ruimte.verwarmd);
    const verkoeld = ruimtes.filter(
      (r) => [...VERTREK_TYPES, ...OVERIGE_RUIMTE_TYPES].includes(r.ruimte.type) && r.ruimte.verkoeld,
    );

    const vertrekPunten = vertrekVerwarmd.reduce((som, r) => som + 2 / r.nKamersMetToegang, 0);
    const overigePuntenRuw = overigeVerwarmd.reduce((som, r) => som + 1 / r.nKamersMetToegang, 0);
    const overigePunten = Math.min(overigePuntenRuw, MAX_OVERIGE_VERWARMD_PUNTEN);
    const verkoeldPuntenRuw = verkoeld.reduce((som, r) => som + 1 / r.nKamersMetToegang, 0);
    const verkoeldPunten = Math.min(verkoeldPuntenRuw, MAX_VERKOELD_PUNTEN);

    const punten = rondAfOpKwartpunten(vertrekPunten + overigePunten + verkoeldPunten);
    perKamer[kamer] = punten;

    toelichting.push(
      `R3 kamer ${kamer}: vertrek verwarmd ${vertrekPunten.toFixed(2)} pt + overige verwarmd ${overigePunten.toFixed(2)} pt (max ${MAX_OVERIGE_VERWARMD_PUNTEN}, ruw ${overigePuntenRuw.toFixed(2)}) + verkoeld ${verkoeldPunten.toFixed(2)} pt (max ${MAX_VERKOELD_PUNTEN}, ruw ${verkoeldPuntenRuw.toFixed(2)}) → ${punten} pt`,
    );
  }

  return { perKamer, toelichting };
}
