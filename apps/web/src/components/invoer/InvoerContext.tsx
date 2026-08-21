'use client';

import { createContext, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { invoerReducer, type InvoerActie } from '../../lib/invoer/reducer';
import { NIEUWE_INVOERSTATE, type InvoerState } from '../../lib/invoer/types';
import { haalConceptOp, slaConceptOp } from '../../lib/invoer/opslag';

interface InvoerContextWaarde {
  state: InvoerState;
  dispatch: Dispatch<InvoerActie>;
}

const InvoerContext = createContext<InvoerContextWaarde | null>(null);

export function InvoerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(invoerReducer, NIEUWE_INVOERSTATE);
  const eersteRenderKlaar = useRef(false);

  // sessionStorage bestaat niet tijdens SSR — het concept kan pas ná hydratie geladen worden.
  useEffect(() => {
    const concept = haalConceptOp();
    if (concept) dispatch({ soort: 'CONCEPT_GELADEN', state: concept });
  }, []);

  // Bewaart elke wijziging tijdens het typen (§backlog: refresh/terug vóór "Doorrekenen" verloor
  // tot nu toe alle invoer). De eerste keer overslaan: dat is de initiële, nog niet met een
  // eventueel concept samengevoegde render, en zou een bestaand concept blank overschrijven.
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
