'use client';

import { useState } from 'react';
import { APP_VERSIE, WIJZIGINGSLOG } from '../lib/wijzigingslog';
import styles from './Footer.module.css';

/** App-brede footer met versienummer + wijzigingslog — zichtbaar op elke pagina via layout.tsx. */
export function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <footer className={styles.footer}>
      <button type="button" className={styles.versieKnop} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        WWSO Scenario App · v{APP_VERSIE} {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className={styles.log}>
          {WIJZIGINGSLOG.map((entry) => (
            <div key={entry.versie} className={styles.logEntry}>
              <div className={styles.logKop}>
                <strong>v{entry.versie}</strong>
                <span>{entry.datum}</span>
              </div>
              <ul>
                {entry.wijzigingen.map((regel, i) => (
                  <li key={i}>{regel}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </footer>
  );
}
