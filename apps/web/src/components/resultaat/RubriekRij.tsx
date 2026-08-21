'use client';

import { useState } from 'react';
import type { RubriekPunten } from '@wwso/engine';
import { RUBRIEK_LABELS } from '../../lib/resultaat/rubriek-labels';
import styles from './styles.module.css';

export function RubriekRij({
  rubriekKey,
  punten,
  puntenRuw,
  toelichting,
}: {
  rubriekKey: keyof RubriekPunten;
  punten: number;
  puntenRuw: number;
  toelichting: string[];
}) {
  const [open, setOpen] = useState(false);
  const afgerond = puntenRuw !== punten;

  return (
    <div className={styles.rubriekRij}>
      <button type="button" className={styles.rubriekKop} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span aria-hidden>{open ? '▾' : '▸'}</span>
        <span className={styles.rubriekLabel}>{RUBRIEK_LABELS[rubriekKey]}</span>
        {afgerond && <span className={styles.rubriekPuntenRuw}>{puntenRuw.toFixed(4)} ruw</span>}
        <span className={styles.rubriekPunten}>{punten} pt</span>
      </button>
      {open &&
        (toelichting.length > 0 ? (
          <ul className={styles.rubriekToelichting}>
            {toelichting.map((regel, i) => (
              <li key={i}>{regel}</li>
            ))}
          </ul>
        ) : (
          <div className={styles.rubriekToelichtingLeeg}>Geen toelichting voor deze kamer bij deze rubriek.</div>
        ))}
    </div>
  );
}
