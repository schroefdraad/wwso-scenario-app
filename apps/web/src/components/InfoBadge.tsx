'use client';

import { useState } from 'react';
import styles from './InfoBadge.module.css';

/**
 * Verbergt veldtoelichting achter een klein infopictogram i.p.v. altijd-zichtbare tekst onder elk
 * veld — het invoerscherm oogde te druk met alle toelichtingen permanent in beeld (feedback
 * 2026-09-05). Toont de tekst bij hover (muis) of klik/focus (toetsenbord/touch).
 */
export function InfoBadge({ children }: { children: React.ReactNode }) {
  // Hover/focus tonen puur via CSS (`.wrap:hover`/`:focus-within`) — losstaand van deze state,
  // die alleen de klik/tap-toggle bijhoudt (nodig op touch, waar geen hover-event bestaat). Beide
  // los houden voorkomt dat een klik tijdens het hoveren de popover meteen weer dichtklapt.
  const [open, setOpen] = useState(false);

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.badge}
        aria-label="Meer informatie"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      <span role="tooltip" className={`${styles.popover} ${open ? styles.popoverOpen : ''}`}>
        {children}
      </span>
    </span>
  );
}
