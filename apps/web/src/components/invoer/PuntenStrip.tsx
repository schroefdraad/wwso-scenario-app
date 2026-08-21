'use client';

import { useMemo } from 'react';
import { useInvoer } from './InvoerContext';
import { berekenPuntenstrip } from '../../lib/invoer/afgeleide-staat';
import { projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';
import styles from './styles.module.css';

/**
 * Rekent ECHT door via `@wwso/engine` zodra de invoer geldig is (§6 van het UX-ontwerp) — geen
 * benadering, dezelfde `berekenEindtelling`-aanroep die taak 13 straks ook gebruikt.
 */
export function PuntenStrip() {
  const { state } = useInvoer();
  const pand = useMemo(() => projecteerNaarPandInvoer(state), [state]);
  const punten = useMemo(() => berekenPuntenstrip(pand), [pand]);

  if (!punten) {
    return <div className={styles.puntenstrip}>nog niet compleet</div>;
  }

  const kamers = Object.keys(punten)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={styles.puntenstrip} title="Live doorgerekend via de echte rekenmotor">
      {kamers.map((k) => (
        <span key={k}>
          K{k} {punten[k].totaalPunten}
        </span>
      ))}
    </div>
  );
}
