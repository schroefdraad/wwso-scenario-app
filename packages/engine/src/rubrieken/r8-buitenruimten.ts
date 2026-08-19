import type { Tarievenset } from '@wwso/data';
import type { PandInvoer } from '../types/index.js';
import { rondAfOp2Decimalen, rondAfOpKwartpunten, ruimtesPerKamer } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/**
 * R8 — Buitenruimten (§2.8).
 *
 * Privé-buitenruimte: 2 punten vast zodra er iets is, plus 0,35 punt per m², waarbij bij
 * méérdere privé-buitenruimten voor dezelfde kamer éérst de oppervlaktes worden opgeteld en
 * pas dán de formule wordt toegepast (§2.8.6) — anders zou de vaste 2 punten per ruimte
 * meetellen in plaats van per kamer. Geen deling: privé is per definitie exclusief één kamer.
 *
 * Gemeenschappelijke buitenruimte: 0,75 punt per m², gedeeld door het aantal adressen in het
 * woongebouw mét toegang, dáárna door het aantal kamers met toegang op het eigen adres
 * (§2.8.2). Per ruimte berekend en dan opgeteld, zodat ruimtes met verschillende
 * `aantalAdressenMetToegang` correct naast elkaar kunnen bestaan.
 *
 * Het maximum van 15 punten (§2.8/§2.8.6) geldt voor privé én gemeenschappelijk SAMEN — de
 * eerder gecorrigeerde fout uit `wwso.xlsx` (briefing B9), die het maximum alleen op privé
 * leek toe te passen.
 */
export function berekenR8(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];
  const t = tarievenset.buitenruimte;

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const priveRuimtes = ruimtes.filter((r) => r.ruimte.type === 'Buitenruimte privé');
    const priveM2 = rondAfOp2Decimalen(priveRuimtes.reduce((som, r) => som + r.ruimte.oppervlakteM2, 0));
    const privePunten = priveM2 > 0 ? t.priveBasispunten + t.privePuntenPerM2 * priveM2 : 0;

    const gemeenschappelijkeRuimtes = ruimtes.filter((r) => r.ruimte.type === 'Buitenruimte gemeenschappelijk');
    const gemeenschappelijkPunten = gemeenschappelijkeRuimtes.reduce((som, r) => {
      const adressen = r.ruimte.aantalAdressenMetToegang ?? 1;
      const m2 = rondAfOp2Decimalen(r.ruimte.oppervlakteM2);
      return som + (t.gemeenschappelijkPuntenPerM2 * m2) / adressen / r.nKamersMetToegang;
    }, 0);

    const totaalRuw = privePunten + gemeenschappelijkPunten;
    const totaalGecapt = Math.min(totaalRuw, t.maxPuntenTotaal);
    const punten = rondAfOpKwartpunten(totaalGecapt);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = totaalGecapt;

    if (priveRuimtes.length === 0 && gemeenschappelijkeRuimtes.length === 0) {
      toelichting.push(`R8 kamer ${kamer}: geen buitenruimte toegankelijk → 0 pt`);
    } else {
      const afgetopt = totaalRuw > totaalGecapt ? ` (afgetopt op ${t.maxPuntenTotaal})` : '';
      toelichting.push(
        `R8 kamer ${kamer}: privé ${priveM2} m² → ${privePunten.toFixed(2)} pt + gemeenschappelijk → ${gemeenschappelijkPunten.toFixed(2)} pt = ${totaalRuw.toFixed(2)} pt${afgetopt} → ${punten} pt`,
      );
    }
  }

  return { perKamer, perKamerRuw, toelichting };
}
