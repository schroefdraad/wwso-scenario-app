import type { MaatregelDefinitie } from '../types';

/**
 * PR-01 t/m PR-06 — proceskosten (§5 van het ontwerp). Geen enkele is zelfstandig kandidaat:
 * PR-02 loopt als kostenrider mee met I-03/I-05, PR-03/PR-04/PR-05 verschijnen in
 * `pakket.ontbrekendeKosten` zodra een pakket een vergunning-/meldingplichtige maatregel bevat
 * (zie `pakketten.ts`), PR-06 (huurderving) is opt-in via `SuggestieOpties.huurderving`, en
 * PR-01 is nooit meer dan een margesignaal. Ze staan hier alleen geregistreerd zodat de
 * bijectie-check tegen de kostencatalogus (49 regels) sluitend is.
 */
function procDefinitie(id: string): MaatregelDefinitie {
  return {
    id,
    doelSoort: 'pand',
    vergunningKlasse: 'niet-van-toepassing',
    vergunningBrontekst: PROC_BRONTEKST[id],
    puntenrelevant: false,
    kandidaten: () => [],
    mutaties: () => [],
  };
}

const PROC_BRONTEKST: Record<string, string> = {
  'PR-01': 'Nee',
  'PR-02': 'Nee',
  'PR-03': 'N.v.t.',
  'PR-04': 'Vergunningvoorwaarde',
  'PR-05': 'Vergunningvoorwaarde',
  'PR-06': 'N.v.t.',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const procMaatregelen: MaatregelDefinitie<any>[] = ['PR-01', 'PR-02', 'PR-03', 'PR-04', 'PR-05', 'PR-06'].map(procDefinitie);
