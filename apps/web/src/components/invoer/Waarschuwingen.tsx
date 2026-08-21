'use client';

import { bepaalWaarschuwingen } from '../../lib/invoer/afgeleide-staat';
import { useInvoer } from './InvoerContext';
import styles from './styles.module.css';

export function Waarschuwingen() {
  const { state } = useInvoer();
  if (state.ruimtes.length === 0) return null;

  const waarschuwingen = bepaalWaarschuwingen(state);

  if (waarschuwingen.length === 0) {
    return <div className={styles.geenWaarschuwingen}>✓ Geen waarschuwingen</div>;
  }

  return (
    <ul className={styles.waarschuwingen}>
      {waarschuwingen.slice(0, 8).map((w, i) => (
        <li key={i}>
          <span aria-hidden>⚠</span>
          <span>{w.tekst}</span>
          {w.ruimteId && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnKlein} ${styles.btnGhost}`}
              onClick={() => {
                const el = document.getElementById(`ruimte-${w.ruimteId}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el?.querySelector('input')?.focus();
              }}
            >
              Toon
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
