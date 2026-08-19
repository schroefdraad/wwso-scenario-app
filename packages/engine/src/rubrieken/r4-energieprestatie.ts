import type { Tarievenset } from '@wwso/data';
import type { MonumentStatus, PandInvoer } from '../types/index.js';
import { rondAfOpKwartpunten, ruimtesPerKamer, vertrekOppervlakteM2 } from './gedeeld.js';
import type { RubriekResultaat } from './types.js';

/** Monumentsoorten die de uitzondering van §2.4.6.1 krijgen. Beschermd dorpsgezicht hoort er niet bij. */
const MONUMENT_ZONDER_MINPUNTEN: readonly MonumentStatus[] = ['Rijks', 'Gemeente', 'Provinciaal'];

/** Periode waarin alleen 'vereenvoudigde' labels zijn afgegeven; die tellen niet mee (§2.4.3 lid 4). */
const VEREENVOUDIGD_LABEL_VANAF = '2015-01-01';
const VEREENVOUDIGD_LABEL_TOT = '2021-01-01';

/** Een energielabel is maximaal 10 jaar geldig (§2.4.3 lid 3). */
const GELDIGHEIDSDUUR_JAREN = 10;

function telJarenOp(isoDatum: string, jaren: number): string {
  const [jaar, rest] = [isoDatum.slice(0, 4), isoDatum.slice(4)];
  return `${String(Number(jaar) + jaren).padStart(4, '0')}${rest}`;
}

export type LabelOngeldigReden = 'na-peildatum' | 'vervallen' | 'vereenvoudigd-label';

/**
 * Toetst of een energielabel op de peildatum meetelt voor de woningwaardering (§2.4.2/§2.4.3).
 * Geeft `null` als het label geldig is, anders de reden waarom niet.
 */
export function toetsLabelGeldigheid(
  ingangsdatum: string,
  peildatum: string,
): LabelOngeldigReden | null {
  if (ingangsdatum > peildatum) return 'na-peildatum';
  if (telJarenOp(ingangsdatum, GELDIGHEIDSDUUR_JAREN) <= peildatum) return 'vervallen';
  if (ingangsdatum >= VEREENVOUDIGD_LABEL_VANAF && ingangsdatum < VEREENVOUDIGD_LABEL_TOT) {
    return 'vereenvoudigd-label';
  }
  return null;
}

interface FactorUitkomst {
  factor: number;
  grondslag: string;
}

/**
 * Bepaalt de punten per m². Volgorde: geldig energielabel → anders het bouwjaar (§2.4.5).
 * De monumentuitzondering van §2.4.6.1 zet een negatieve uitkomst op 0.
 */
function bepaalFactor(
  pand: PandInvoer['pand'],
  tarievenset: Tarievenset,
  peildatum: string,
): FactorUitkomst {
  let factor: number;
  let grondslag: string;

  const ongeldigReden =
    pand.energielabel === 'Bouwjaar'
      ? 'geen-label'
      : toetsLabelGeldigheid(pand.energielabelIngangsdatum, peildatum);

  if (ongeldigReden === null) {
    const regel = tarievenset.energielabelfactoren.find((f) => f.label === pand.energielabel);
    if (!regel) {
      throw new Error(`Geen energielabelfactor gevonden voor label '${pand.energielabel}'.`);
    }
    factor = regel.factorPerM2;
    grondslag = `label ${pand.energielabel}`;
  } else {
    const passend = tarievenset.bouwjaargrenzen
      .filter((b) => b.totEnMetBouwjaar >= pand.bouwjaar)
      .sort((a, b) => a.totEnMetBouwjaar - b.totEnMetBouwjaar)[0];
    if (!passend) {
      const hoogsteGrens = Math.max(...tarievenset.bouwjaargrenzen.map((b) => b.totEnMetBouwjaar));
      throw new Error(
        `Geen bouwjaargrens gevonden voor bouwjaar ${pand.bouwjaar} — de tabel dekt alleen bouwjaar t/m ${hoogsteGrens}.`,
      );
    }
    factor = passend.factorPerM2;
    grondslag =
      ongeldigReden === 'geen-label'
        ? `bouwjaar ${pand.bouwjaar} (geen label)`
        : `bouwjaar ${pand.bouwjaar} (label ${ongeldigReden})`;
  }

  if (factor < 0 && MONUMENT_ZONDER_MINPUNTEN.includes(pand.monument)) {
    return { factor: 0, grondslag: `${grondslag}, minpunten vervallen wegens monument (§2.4.6.1)` };
  }

  return { factor, grondslag };
}

/**
 * R4 — Energieprestatie (§2.4). Punten per m² over "het totaal aantal m² oppervlakte die de
 * huurder heeft als privé vertrekken en de aan huurder toe te rekenen gemeenschappelijke
 * vertrekken" (§2.4.4) — dezelfde grondslag als R1, inclusief de m²-afronding.
 *
 * `peildatum` bepaalt of het energielabel nog meetelt en welke tarievenset geldt; de engine
 * leidt die nooit zelf af uit de systeemklok (harde regel 2).
 */
export function berekenR4(
  input: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];
  const { factor, grondslag } = bepaalFactor(input.pand, tarievenset, peildatum);

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const oppervlakteM2 = vertrekOppervlakteM2(ruimtes);
    const ruwPunten = oppervlakteM2 * factor;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;
    toelichting.push(
      `R4 kamer ${kamer}: ${oppervlakteM2} m² (R1-grondslag) × ${factor} pt/m² [${grondslag}] → ${punten} pt`,
    );
  }

  return { perKamer, perKamerRuw, toelichting };
}
