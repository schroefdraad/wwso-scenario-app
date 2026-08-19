import type { KeukenAanrechtBand, Tarievenset } from '@wwso/data';
import type { Keuken, PandInvoer } from '../types/index.js';
import { kamersPerRuimte, rondAfOpKwartpunten } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/** Alle vijf basiseisen van §2.5.1 moeten aanwezig zijn, anders vervalt de hele rubriek voor deze keuken. */
function voldoetAanBasiseisen(keuken: Keuken): boolean {
  return Object.values(keuken.basiseisen).every(Boolean);
}

/**
 * Basispunten op basis van de aanrechtlengte (§2.5.2). De bovenste band (13 punten) geldt
 * alleen "mits er minimaal 8 onzelfstandige wooneenheden toegang en gebruiksrecht hebben tot
 * de keuken"; wordt daar niet aan voldaan, dan zakt de keuken naar de eerstvolgende band.
 */
export function bepaalAanrechtBasispunten(
  aanrechtlengteM: number,
  nKamersMetToegang: number,
  banden: readonly KeukenAanrechtBand[],
): number {
  const past = (band: KeukenAanrechtBand) =>
    band.bovengrensM === null ||
    (band.inclusiefBovengrens ? aanrechtlengteM <= band.bovengrensM : aanrechtlengteM < band.bovengrensM);

  let index = banden.findIndex(past);
  if (index === -1) index = banden.length - 1;

  while (index > 0) {
    const band = banden[index];
    if (
      band.minWooneenhedenMetToegang === undefined ||
      nKamersMetToegang >= band.minWooneenhedenMetToegang
    ) {
      break;
    }
    index -= 1;
  }

  return banden[index].punten;
}

/** Ruwe som van de extra voorzieningen (§2.5.3), vóór de aftopping op de basispunten. */
function extraPuntenRuw(keuken: Keuken, tarieven: Tarievenset['keukenExtraPunten']): number {
  const e = keuken.extra;
  let som = 0;
  if (e.afzuiginstallatie) som += tarieven.afzuiginstallatie;
  if (e.kookplaatInductie) som += tarieven.kookplaatInductie;
  if (e.kookplaatKeramisch) som += tarieven.kookplaatKeramisch;
  if (e.kookplaatGas) som += tarieven.kookplaatGas;
  if (e.koelkast) som += tarieven.koelkast;
  if (e.vrieskast) som += tarieven.vrieskast;
  if (e.ovenElektrisch) som += tarieven.ovenElektrisch;
  if (e.ovenGas) som += tarieven.ovenGas;
  if (e.magnetron) som += tarieven.magnetron;
  if (e.vaatwasmachine) som += tarieven.vaatwasmachine;
  som += e.extraKastruimteEenhedenVan60Cm * tarieven.extraKastruimtePer60Cm;
  if (e.eenhandsmengkraan) som += tarieven.eenhandsmengkraan;
  if (e.thermostatischeMengkraan) som += tarieven.thermostatischeMengkraan;
  if (e.kokendWaterfunctie) som += tarieven.kokendWaterfunctie;
  return som;
}

export interface KeukenBerekening {
  ruimteNr: number;
  voldoetAanBasiseisen: boolean;
  basispunten: number;
  extraRuw: number;
  extraGecapt: number;
  totaal: number;
  nKamersMetToegang: number;
  perKamer: number;
}

/**
 * Berekent één keuken door, vóór verdeling over de kamers. Apart exporteerbaar omdat de
 * suggestie-engine (taak 11) moet kunnen zien wáár de ruimte zit: onder de basiseisen-poort,
 * of tegen de aftopping aan.
 */
export function berekenKeuken(
  keuken: Keuken,
  nKamersMetToegang: number,
  tarievenset: Tarievenset,
): KeukenBerekening {
  const basis = { ruimteNr: keuken.ruimteNr, nKamersMetToegang };

  if (!voldoetAanBasiseisen(keuken)) {
    return {
      ...basis,
      voldoetAanBasiseisen: false,
      basispunten: 0,
      extraRuw: 0,
      extraGecapt: 0,
      totaal: 0,
      perKamer: 0,
    };
  }

  const basispunten = bepaalAanrechtBasispunten(
    keuken.aanrechtlengteM,
    nKamersMetToegang,
    tarievenset.keukenAanrechtBasispunten,
  );
  const extraRuw = extraPuntenRuw(keuken, tarievenset.keukenExtraPunten);
  const extraGecapt = Math.min(extraRuw, basispunten);
  const totaal = basispunten + extraGecapt;

  return {
    ...basis,
    voldoetAanBasiseisen: true,
    basispunten,
    extraRuw,
    extraGecapt,
    totaal,
    perKamer: nKamersMetToegang > 0 ? totaal / nKamersMetToegang : 0,
  };
}

/**
 * R5 — Keukenvoorzieningen (§2.5). Per keuken: basispunten uit de aanrechtlengte, plus extra
 * voorzieningen die zijn afgetopt op die basispunten, gedeeld door het aantal onzelfstandige
 * woonruimten met toegang en gebruiksrecht. Een kamer met toegang tot meerdere keukens telt
 * de bijdragen op.
 *
 * Let op de poort van §2.5.1: ontbreekt één basiseis, dan is de hele keuken 0 punten waard —
 * inclusief alle extra voorzieningen. Een aanrecht korter dan 1 meter levert 0 basispunten op
 * en daarmee ook 0 extra punten, omdat de aftopping op nul uitkomt.
 */
export function berekenR5(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const kamersBijRuimte = kamersPerRuimte(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];

  const ruwPerKamer = new Map<number, number>();
  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    ruwPerKamer.set(kamer, 0);
  }

  for (const keuken of input.keukens) {
    const kamers = kamersBijRuimte.get(keuken.ruimteNr) ?? [];
    const berekening = berekenKeuken(keuken, kamers.length, tarievenset);

    for (const kamer of kamers) {
      ruwPerKamer.set(kamer, (ruwPerKamer.get(kamer) ?? 0) + berekening.perKamer);
    }

    if (!berekening.voldoetAanBasiseisen) {
      const ontbrekend = Object.entries(keuken.basiseisen)
        .filter(([, aanwezig]) => !aanwezig)
        .map(([eis]) => eis)
        .join(', ');
      toelichting.push(
        `R5 keuken (ruimte ${keuken.ruimteNr}): voldoet niet aan de basiseisen van §2.5.1 (ontbreekt: ${ontbrekend}) → 0 pt, ook geen extra voorzieningen`,
      );
    } else {
      const afgetopt = berekening.extraRuw > berekening.extraGecapt ? ' (afgetopt)' : '';
      toelichting.push(
        `R5 keuken (ruimte ${keuken.ruimteNr}): aanrecht ${keuken.aanrechtlengteM} m → ${berekening.basispunten} basispunten + ${berekening.extraGecapt} extra${afgetopt} van ${berekening.extraRuw} ruw = ${berekening.totaal} pt ÷ ${berekening.nKamersMetToegang} kamers = ${berekening.perKamer.toFixed(4)} pt per kamer`,
      );
    }
  }

  for (const [kamer, ruw] of ruwPerKamer) {
    perKamerRuw[kamer] = ruw;
    perKamer[kamer] = rondAfOpKwartpunten(ruw);
  }

  if (input.keukens.length === 0) {
    toelichting.push('R5: geen keukens ingevoerd → 0 pt voor alle kamers');
  }

  return { perKamer, perKamerRuw, toelichting };
}
