import { waarderingsType } from '@wwso/engine';
import { naarGetal } from './projecteer';
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

  // Audit 2026-10-06: te kleine ruimtes en zolders zonder vaste trap/beschoten dak tellen als ander
  // type of niet (§2.2.1.2, §2.2.1.3, §2.2.2.2). Dezelfde regel als de rekenmotor (`waarderingsType`).
  for (const r of state.ruimtes) {
    const m2 = naarGetal(r.oppervlakteM2);
    if (m2 === undefined) continue;
    const { type, reden } = waarderingsType({
      nr: r.nr,
      naam: r.naam,
      type: r.type,
      oppervlakteM2: m2,
      verdieping: 0,
      verwarmd: false,
      verkoeld: false,
      zolder: r.zolder,
      heeftMeterkast: r.heeftMeterkast,
    });
    if (type !== r.type && reden) {
      const voorzieningen = r.keuken || r.sanitair ? ' Een keuken of sanitair in deze ruimte telt wel mee in de rubrieken keuken en sanitair.' : '';
      waarschuwingen.push({ tekst: `Ruimte ${r.nr} (${r.naam || 'naamloos'}): ${reden}.${voorzieningen}`, ruimteId: r.id });
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

