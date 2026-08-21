import { berekenEindtelling, type EindtellingResultaat, type PandInvoer } from '@wwso/engine';
import { alleTarievensets } from '@wwso/data';
import type { InvoerState } from './types';

export interface Waarschuwing {
  tekst: string;
  ruimteId?: string;
}

/** Ruimten zonder toegewezen kamers verdwijnen stil uit de telling (§0 van het UX-ontwerp) — dit is het belangrijkste stille risico van het scherm. */
export function bepaalWaarschuwingen(state: InvoerState): Waarschuwing[] {
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  const waarschuwingen: Waarschuwing[] = [];

  for (const r of state.ruimtes) {
    if (r.kamers.length === 0) {
      waarschuwingen.push({
        tekst: `Ruimte ${r.nr} (${r.naam || 'naamloos'}) is aan geen enkele kamer toegewezen en telt daardoor voor niemand mee.`,
        ruimteId: r.id,
      });
    }
  }

  for (let k = 1; k <= n; k++) {
    const ruimtenMetToegang = state.ruimtes.filter((r) => r.kamers.includes(k));
    if (ruimtenMetToegang.length === 0) {
      waarschuwingen.push({ tekst: `Kamer ${k} heeft nog geen enkele ruimte toegewezen gekregen.` });
      continue;
    }
    const heeftKeuken = ruimtenMetToegang.some((r) => r.type === 'Keuken' || r.keuken);
    const heeftBad = ruimtenMetToegang.some((r) => r.type === 'Badruimte' || r.sanitair);
    if (!heeftKeuken) waarschuwingen.push({ tekst: `Kamer ${k} heeft geen toegang tot een keuken.` });
    if (!heeftBad) waarschuwingen.push({ tekst: `Kamer ${k} heeft geen toegang tot een badruimte.` });
  }

  return waarschuwingen;
}

export interface PuntenPerKamer {
  totaalPunten: number;
  maxHuurEuro: number;
}

/**
 * Rekent de invoer, indien geldig, ECHT door via `@wwso/engine` — geen benadering. Draait
 * client-side (de rekenmotor is daarvoor gebouwd), dus dit kan bij elke wijziging opnieuw.
 * Gebruikt de nieuwste tarievenset en zijn eigen peildatum als rekendatum — dit scherm heeft
 * geen apart "peildatum van de berekening"-veld (dat hoort bij het opslaan van een deal, taak 15).
 */
export function berekenPuntenstrip(pand: PandInvoer | null): Record<number, PuntenPerKamer> | null {
  if (!pand) return null;
  const tarievensets = alleTarievensets();
  const tarievenset = tarievensets[tarievensets.length - 1];
  if (!tarievenset) return null;
  try {
    const eindtelling: EindtellingResultaat = berekenEindtelling(pand, tarievenset, tarievenset.peildatum);
    const resultaat: Record<number, PuntenPerKamer> = {};
    for (const [kamer, k] of Object.entries(eindtelling.perKamer)) {
      resultaat[Number(kamer)] = { totaalPunten: k.totaalPunten, maxHuurEuro: k.maxHuurEuro };
    }
    return resultaat;
  } catch {
    // Een tussentijds ongeldige combinatie (bijv. een bouwjaar buiten de tabel) mag de
    // puntenstrip niet laten crashen — de invoer zelf blijft gewoon bewerkbaar.
    return null;
  }
}
