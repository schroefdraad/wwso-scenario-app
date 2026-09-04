'use client';

import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import type { PandInvoer } from '@wwso/engine';
import { invoerReducer, type InvoerActie } from '../../lib/invoer/reducer';
import { NIEUWE_INVOERSTATE, type InvoerState } from '../../lib/invoer/types';
import { pandInvoerNaarState } from '../../lib/invoer/vanPandInvoer';
import { haalConceptOp, slaConceptOp } from '../../lib/invoer/opslag';
import type { ScenarioSelectie } from '../../lib/deals/types';

interface InvoerContextWaarde {
  state: InvoerState;
  dispatch: Dispatch<InvoerActie>;
}

const InvoerContext = createContext<InvoerContextWaarde | null>(null);

/** De as-is van een reeds opgeslagen deal, klaar om als bewerkbare `InvoerState` geladen te worden (backlog: as-is achteraf aanpasbaar maken via /pand/nieuw?deal=<id>). */
export interface InitieelDeal {
  id: string;
  naam: string;
  notitie: string;
  map: string;
  scenarios: ScenarioSelectie[];
  pandInvoer: PandInvoer;
}

/** Een AS-IS-kopie die als handmatig TO-BE-scenario bewerkt wordt (backlog: AS-IS kopiëren naar een handmatig scenario, feedback Emma Morrison, 2026-08-21 — via /pand/nieuw?scenario=<slot>). */
export interface InitieelScenario {
  asIsPand: PandInvoer;
  slotIndex: number;
  naam: string;
  terugUrl: string;
}

export function InvoerProvider({
  children,
  initieelDeal,
  initieelScenario,
}: {
  children: ReactNode;
  initieelDeal?: InitieelDeal;
  initieelScenario?: InitieelScenario;
}) {
  const [state, dispatch] = useReducer(invoerReducer, NIEUWE_INVOERSTATE);
  const eersteRenderKlaar = useRef(false);

  // sessionStorage bestaat niet tijdens SSR — laden kan pas ná hydratie. Een expliciet
  // meegegeven deal of scenario (navigatie via ?deal=<id> resp. ?scenario=<slot>) heeft
  // voorrang boven een eventueel achtergebleven concept van een andere as-is.
  useEffect(() => {
    if (initieelScenario) {
      dispatch({
        soort: 'CONCEPT_GELADEN',
        state: {
          ...pandInvoerNaarState(initieelScenario.asIsPand),
          handmatigScenario: {
            slotIndex: initieelScenario.slotIndex,
            naam: initieelScenario.naam,
            terugUrl: initieelScenario.terugUrl,
          },
        },
      });
      return;
    }
    if (initieelDeal) {
      dispatch({
        soort: 'CONCEPT_GELADEN',
        state: {
          ...pandInvoerNaarState(initieelDeal.pandInvoer),
          notitieOntwerp: initieelDeal.notitie,
          bewerktDeal: { id: initieelDeal.id, naam: initieelDeal.naam, notitie: initieelDeal.notitie, map: initieelDeal.map, scenarios: initieelDeal.scenarios },
        },
      });
      return;
    }
    const concept = haalConceptOp();
    if (concept) dispatch({ soort: 'CONCEPT_GELADEN', state: concept });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initieelDeal?.id, initieelScenario?.slotIndex]);

  // Bewaart elke wijziging tijdens het typen (§backlog: refresh/terug vóór "Doorrekenen" verloor
  // tot nu toe alle invoer). De eerste keer overslaan: dat is de initiële, nog niet met een
  // eventueel concept/deal samengevoegde render, en zou die anders blank overschrijven.
  useEffect(() => {
    if (!eersteRenderKlaar.current) {
      eersteRenderKlaar.current = true;
      return;
    }
    slaConceptOp(state);
  }, [state]);

  return <InvoerContext.Provider value={{ state, dispatch }}>{children}</InvoerContext.Provider>;
}

export function useInvoer(): InvoerContextWaarde {
  const ctx = useContext(InvoerContext);
  if (!ctx) throw new Error('useInvoer moet binnen een InvoerProvider gebruikt worden.');
  return ctx;
}
