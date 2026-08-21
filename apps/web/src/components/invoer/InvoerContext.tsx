'use client';

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { invoerReducer, type InvoerActie } from '../../lib/invoer/reducer';
import { NIEUWE_INVOERSTATE, type InvoerState } from '../../lib/invoer/types';

interface InvoerContextWaarde {
  state: InvoerState;
  dispatch: Dispatch<InvoerActie>;
}

const InvoerContext = createContext<InvoerContextWaarde | null>(null);

export function InvoerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(invoerReducer, NIEUWE_INVOERSTATE);
  return <InvoerContext.Provider value={{ state, dispatch }}>{children}</InvoerContext.Provider>;
}

export function useInvoer(): InvoerContextWaarde {
  const ctx = useContext(InvoerContext);
  if (!ctx) throw new Error('useInvoer moet binnen een InvoerProvider gebruikt worden.');
  return ctx;
}
