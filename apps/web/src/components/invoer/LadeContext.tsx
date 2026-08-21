'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type LadeSegment = 'keuken' | 'sanitair' | 'parkeerplek' | 'zolder';

interface LadeState {
  ruimteId: string | null;
  segment: LadeSegment;
}

interface LadeContextWaarde {
  lade: LadeState;
  open: (ruimteId: string, segment?: LadeSegment) => void;
  sluit: () => void;
  zetSegment: (segment: LadeSegment) => void;
}

const LadeContext = createContext<LadeContextWaarde | null>(null);

export function LadeProvider({ children }: { children: ReactNode }) {
  const [lade, setLade] = useState<LadeState>({ ruimteId: null, segment: 'keuken' });

  const open = (ruimteId: string, segment: LadeSegment = 'keuken') => setLade({ ruimteId, segment });
  const sluit = () => setLade((huidig) => ({ ...huidig, ruimteId: null }));
  const zetSegment = (segment: LadeSegment) => setLade((huidig) => ({ ...huidig, segment }));

  return <LadeContext.Provider value={{ lade, open, sluit, zetSegment }}>{children}</LadeContext.Provider>;
}

export function useLade(): LadeContextWaarde {
  const ctx = useContext(LadeContext);
  if (!ctx) throw new Error('useLade moet binnen een LadeProvider gebruikt worden.');
  return ctx;
}
