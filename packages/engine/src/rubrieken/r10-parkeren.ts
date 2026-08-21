import type { Tarievenset } from '@wwso/data';
import type { PandInvoer, ParkeerplekType } from '../types/index';
import { kamersPerRuimte, nulPerKamer, rondAfOpKwartpunten } from './gedeeld';
import type { RubriekResultaat } from './types';

function puntenVoorType(type: ParkeerplekType, tarievenset: Tarievenset): number {
  const t = tarievenset.parkeren;
  return { I: t.typeIPunten, II: t.typeIIPunten, III: t.typeIIIPunten }[type];
}

/**
 * R10 — Gemeenschappelijke parkeerruimten (§2.10). Punten per type parkeerplek (9/6/4,
 * §2.10.3, bevestigd tegen wwso.xlsx), gedeeld door het aantal adressen met toegang en dáárna
 * door het aantal kamers met toegang op het eigen adres (§2.10.4, briefing B10) — dezelfde
 * dubbele deling als R8 en R9.
 *
 * Een laadpaal (§2.10.5) geeft 2 extra punten, maar wordt UITSLUITEND door het aantal
 * adressen gedeeld, niet ook nog door het aantal kamers. Dat is geen omissie: de tekst noemt
 * expliciet alleen de adressen-deling bij de laadpaal, anders dan bij de basispunten van de
 * parkeerplek zelf.
 */
export function berekenR10(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const ruimteBijNr = new Map(input.ruimtes.map((r) => [r.nr, r] as const));
  const kamersBijRuimte = kamersPerRuimte(input);
  const ruwPerKamer = nulPerKamer(input.pand.aantalKamers);
  const toelichting: string[] = [];

  for (const plek of input.parkeerplekken) {
    const ruimte = ruimteBijNr.get(plek.ruimteNr);
    const adressen = ruimte?.aantalAdressenMetToegang ?? 1;
    const kamers = kamersBijRuimte.get(plek.ruimteNr) ?? [];
    const n = kamers.length;

    if (n === 0 || ruimte === undefined) {
      toelichting.push(`R10 parkeerplek (ruimte ${plek.ruimteNr}): geen kamers met toegang toegewezen → 0 pt`);
      continue;
    }

    const basisPunten = puntenVoorType(plek.type, tarievenset);
    const basisPerKamer = basisPunten / adressen / n;
    const laadpaalPerKamer = plek.laadpaal ? tarievenset.parkeren.laadpaalPunten / adressen : 0;
    const totaalPerKamer = basisPerKamer + laadpaalPerKamer;

    for (const kamer of kamers) {
      ruwPerKamer.set(kamer, (ruwPerKamer.get(kamer) ?? 0) + totaalPerKamer);
    }

    const laadpaalRegel = plek.laadpaal
      ? ` + laadpaal ${tarievenset.parkeren.laadpaalPunten} ÷ ${adressen} adressen = ${laadpaalPerKamer.toFixed(4)} pt (niet gedeeld door kamers, §2.10.5)`
      : '';
    toelichting.push(
      `R10 parkeerplek type ${plek.type} (ruimte ${plek.ruimteNr}): ${basisPunten} pt ÷ ${adressen} adressen ÷ ${n} kamers = ${basisPerKamer.toFixed(4)} pt${laadpaalRegel} = ${totaalPerKamer.toFixed(4)} pt per kamer`,
    );
  }

  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  for (const [kamer, ruw] of ruwPerKamer) {
    perKamerRuw[kamer] = ruw;
    perKamer[kamer] = rondAfOpKwartpunten(ruw);
  }

  if (input.parkeerplekken.length === 0) {
    toelichting.push('R10: geen gemeenschappelijke parkeerplekken ingevoerd → 0 pt voor alle kamers');
  }

  return { perKamer, perKamerRuw, toelichting };
}
