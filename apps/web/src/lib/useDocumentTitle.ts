'use client';

import { useEffect } from 'react';

/**
 * Zet de browsertab-titel voor deze pagina (navigatie-audit, 2026-09-04: alle pagina's toonden
 * altijd dezelfde titel uit `layout.tsx`, geen enkel onderscheid bij meerdere open tabs). Elke
 * route-pagina is een client component (sessionStorage/Supabase-fetch ná hydratie), dus
 * Next.js' server-only `generateMetadata` is hier geen optie — `document.title` in een effect is
 * de juiste plek. `undefined` betekent: nog niets bekend om te tonen, laat de vorige titel staan
 * (voorkomt een lege flits tijdens het laden).
 */
export function useDocumentTitle(titel: string | undefined): void {
  useEffect(() => {
    if (titel === undefined) return;
    document.title = titel;
  }, [titel]);
}
