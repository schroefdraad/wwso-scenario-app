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

