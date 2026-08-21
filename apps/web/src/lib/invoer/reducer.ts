import type { RuimteType } from '@wwso/engine';
import { DUBBEL_GEDEELDE_RUIMTE_TYPES, testpand6Kamers } from '@wwso/engine';
import { NIEUWE_INVOERSTATE, type InvoerState, type PandVeldenState, type RuimteRij } from './types';
import { pandInvoerNaarState } from './vanPandInvoer';

export const VERWARMD_DEFAULT = new Set<RuimteType>([
  'Privévertrek',
  'Keuken',
  'Badruimte',
  'Gemeenschappelijk vertrek',
  'Verkeersruimte',
]);
export const KOUD_TYPES = new Set<RuimteType>([
  'Buitenruimte privé',
  'Buitenruimte gemeenschappelijk',
  'Parkeerplek gemeenschappelijk',
]);

function isDubbelGedeeld(type: RuimteType): boolean {
  return (DUBBEL_GEDEELDE_RUIMTE_TYPES as readonly string[]).includes(type);
}

export type InvoerActie =
  | { soort: 'PAND_VELD_GEWIJZIGD'; veld: keyof PandVeldenState; waarde: PandVeldenState[keyof PandVeldenState] }
  | { soort: 'RUIMTE_TOEGEVOEGD'; ruimte: Partial<RuimteRij> }
  | { soort: 'RUIMTE_GEWIJZIGD'; id: string; patch: Partial<RuimteRij> }
  | { soort: 'RUIMTE_TYPE_GEWIJZIGD'; id: string; type: RuimteType }
  | { soort: 'RUIMTE_VERWIJDERD'; id: string }
  | { soort: 'RUIMTE_HERSTELD'; ruimte: RuimteRij; naVanId: string | null }
  | { soort: 'RIJ_GEDUPLICEERD'; id: string }
  | { soort: 'KAMER_GETOGGELD'; id: string; kamer: 'alle' | number }
  | { soort: 'SCAFFOLD_PRIVEVERTREKKEN' }
  | { soort: 'VOORBEELDPAND_GELADEN' }
  | { soort: 'ALLES_GEWIST' }
  | { soort: 'CONCEPT_GELADEN'; state: InvoerState }
  | { soort: 'DEAL_GEKOPPELD'; deal: NonNullable<InvoerState['bewerktDeal']> }
  | { soort: 'AANBEL_GEWIJZIGD'; aan: boolean }
  | { soort: 'AANBEL_KAMER_GETOGGELD'; kamer: 'alle' | number }
  | { soort: 'LAADPAAL_GEWIJZIGD'; aan: boolean }
  | { soort: 'LAADPAAL_KAMER_GETOGGELD'; kamer: 'alle' | number }
  | {
      soort: 'AFTREKSITUATIE_GETOGGELD';
      situatie: keyof InvoerState['aftrekSituaties'];
      kamer: number;
    };

function aantalKamers(state: InvoerState): number {
  const n = parseInt(state.pand.aantalKamers, 10);
  return Number.isFinite(n) && n > 0 ? Math.min(12, n) : 1;
}

function toggleKamerLijst(lijst: number[], kamer: 'alle' | number, n: number): number[] {
  if (kamer === 'alle') {
    return lijst.length === n ? [] : Array.from({ length: n }, (_, i) => i + 1);
  }
  return lijst.includes(kamer) ? lijst.filter((k) => k !== kamer) : [...lijst, kamer].sort((a, b) => a - b);
}

function volgendNr(ruimtes: RuimteRij[]): number {
  return ruimtes.reduce((max, r) => Math.max(max, r.nr), 0) + 1;
}

function maakRuimte(state: InvoerState, overrides: Partial<RuimteRij>): RuimteRij {
  const type = overrides.type ?? 'Privévertrek';
  const dubbel = isDubbelGedeeld(type);
  return {
    id: `r${state.volgendeRuimteId}`,
    nr: volgendNr(state.ruimtes),
    naam: '',
    type,
    oppervlakteM2: '',
    verdieping: '0',
    verwarmd: KOUD_TYPES.has(type) ? false : VERWARMD_DEFAULT.has(type),
    verkoeld: false,
    aantalAdressenMetToegang: dubbel ? (state.laatsteAantalAdressen ?? '') : '',
    aantalAdressenOvergenomen: dubbel && state.laatsteAantalAdressen !== undefined,
    kamers: [],
    ...overrides,
  };
}

export function invoerReducer(state: InvoerState, actie: InvoerActie): InvoerState {
  switch (actie.soort) {
    case 'PAND_VELD_GEWIJZIGD': {
      const pand = { ...state.pand, [actie.veld]: actie.waarde };
      const n = (() => {
        const parsed = parseInt(String(pand.aantalKamers), 10);
        return Number.isFinite(parsed) && parsed > 0 ? Math.min(12, parsed) : 1;
      })();
      const ruimtes = state.ruimtes.map((r) => ({ ...r, kamers: r.kamers.filter((k) => k <= n) }));
      return { ...state, pand, ruimtes };
    }

    case 'RUIMTE_TOEGEVOEGD': {
      const ruimte = maakRuimte(state, actie.ruimte);
      return { ...state, ruimtes: [...state.ruimtes, ruimte], volgendeRuimteId: state.volgendeRuimteId + 1 };
    }

    case 'RUIMTE_GEWIJZIGD': {
      const laatsteAantalAdressen =
        actie.patch.aantalAdressenMetToegang !== undefined && actie.patch.aantalAdressenMetToegang !== ''
          ? actie.patch.aantalAdressenMetToegang
          : state.laatsteAantalAdressen;
      return {
        ...state,
        laatsteAantalAdressen,
        ruimtes: state.ruimtes.map((r) =>
          r.id === actie.id ? { ...r, ...actie.patch, aantalAdressenOvergenomen: false } : r,
        ),
      };
    }

    case 'RUIMTE_TYPE_GEWIJZIGD': {
      const n = aantalKamers(state);
      return {
        ...state,
        ruimtes: state.ruimtes.map((r) => {
          if (r.id !== actie.id) return r;
          const dubbel = isDubbelGedeeld(actie.type);
          const koud = KOUD_TYPES.has(actie.type);
          return {
            ...r,
            type: actie.type,
            aantalAdressenMetToegang: dubbel ? r.aantalAdressenMetToegang || state.laatsteAantalAdressen || '' : '',
            aantalAdressenOvergenomen: dubbel && !r.aantalAdressenMetToegang && state.laatsteAantalAdressen !== undefined,
            verwarmd: koud ? false : VERWARMD_DEFAULT.has(actie.type),
            verkoeld: false,
            kamers: r.kamers.filter((k) => k <= n),
          };
        }),
      };
    }

    case 'RUIMTE_VERWIJDERD':
      return { ...state, ruimtes: state.ruimtes.filter((r) => r.id !== actie.id) };

    case 'RUIMTE_HERSTELD': {
      const index = actie.naVanId ? state.ruimtes.findIndex((r) => r.id === actie.naVanId) : -1;
      const ruimtes = [...state.ruimtes];
      ruimtes.splice(index === -1 ? ruimtes.length : index + 1, 0, actie.ruimte);
      return { ...state, ruimtes };
    }

    case 'RIJ_GEDUPLICEERD': {
      const bron = state.ruimtes.find((r) => r.id === actie.id);
      if (!bron) return state;
      const opgehoogdeNaam = bron.naam.replace(/(\d+)\s*$/, (_, getal: string) => String(parseInt(getal, 10) + 1));
      const nieuw: RuimteRij = {
        ...bron,
        id: `r${state.volgendeRuimteId}`,
        nr: volgendNr(state.ruimtes),
        naam: opgehoogdeNaam === bron.naam ? `${bron.naam} (kopie)` : opgehoogdeNaam,
        oppervlakteM2: '',
      };
      const index = state.ruimtes.findIndex((r) => r.id === actie.id);
      const ruimtes = [...state.ruimtes];
      ruimtes.splice(index + 1, 0, nieuw);
      return { ...state, ruimtes, volgendeRuimteId: state.volgendeRuimteId + 1 };
    }

    case 'KAMER_GETOGGELD': {
      const n = aantalKamers(state);
      return {
        ...state,
        ruimtes: state.ruimtes.map((r) =>
          r.id === actie.id ? { ...r, kamers: toggleKamerLijst(r.kamers, actie.kamer, n) } : r,
        ),
      };
    }

    case 'SCAFFOLD_PRIVEVERTREKKEN': {
      const n = aantalKamers(state);
      let volgendId = state.volgendeRuimteId;
      let volgendNrWaarde = volgendNr(state.ruimtes);
      const nieuwe: RuimteRij[] = [];
      for (let k = 1; k <= n; k++) {
        nieuwe.push({
          id: `r${volgendId}`,
          nr: volgendNrWaarde,
          naam: `Kamer ${k}`,
          type: 'Privévertrek',
          oppervlakteM2: '',
          verdieping: '0',
          verwarmd: true,
          verkoeld: false,
          aantalAdressenMetToegang: '',
          aantalAdressenOvergenomen: false,
          kamers: [k],
        });
        volgendId += 1;
        volgendNrWaarde += 1;
      }
      return { ...state, ruimtes: [...state.ruimtes, ...nieuwe], volgendeRuimteId: volgendId };
    }

    case 'VOORBEELDPAND_GELADEN':
      return pandInvoerNaarState(testpand6Kamers);

    case 'ALLES_GEWIST':
      return { ...NIEUWE_INVOERSTATE };

    case 'CONCEPT_GELADEN':
      return actie.state;

    case 'DEAL_GEKOPPELD':
      return { ...state, bewerktDeal: actie.deal };

    case 'AANBEL_GEWIJZIGD':
      return { ...state, aanbelfunctieAan: actie.aan, aanbelfunctieKamers: actie.aan ? Array.from({ length: aantalKamers(state) }, (_, i) => i + 1) : [] };

    case 'AANBEL_KAMER_GETOGGELD':
      return { ...state, aanbelfunctieKamers: toggleKamerLijst(state.aanbelfunctieKamers, actie.kamer, aantalKamers(state)) };

    case 'LAADPAAL_GEWIJZIGD':
      return { ...state, losseLaadpaalAan: actie.aan, losseLaadpaalKamers: actie.aan ? Array.from({ length: aantalKamers(state) }, (_, i) => i + 1) : [] };

    case 'LAADPAAL_KAMER_GETOGGELD':
      return { ...state, losseLaadpaalKamers: toggleKamerLijst(state.losseLaadpaalKamers, actie.kamer, aantalKamers(state)) };

    case 'AFTREKSITUATIE_GETOGGELD': {
      const huidig = state.aftrekSituaties[actie.situatie];
      const nieuw = huidig.includes(actie.kamer) ? huidig.filter((k) => k !== actie.kamer) : [...huidig, actie.kamer].sort((a, b) => a - b);
      return { ...state, aftrekSituaties: { ...state.aftrekSituaties, [actie.situatie]: nieuw } };
    }
  }
}
