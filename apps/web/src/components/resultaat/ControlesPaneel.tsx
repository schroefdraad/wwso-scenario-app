'use client';

import type { ControleResultaat } from '@wwso/engine';
import styles from './styles.module.css';

export function ControlesPaneel({ controles }: { controles: ControleResultaat[] }) {
  return (
    <section className={styles.blok}>
      <div className={styles.blokKop}>
        <h2>Controles</h2>
      </div>
      <div className={styles.blokInhoud}>
        {controles.map((controle) => (
          <div className={styles.controleRij} key={controle.code}>
            <span className={controle.bevindingen.length === 0 ? styles.controleIcoonOk : styles.controleIcoonWaarschuwing} aria-hidden>
              {controle.bevindingen.length === 0 ? '✓' : '⚠'}
            </span>
            <div>
              <div className={styles.controleTitel}>{controle.titel}</div>
              {controle.bevindingen.length > 0 && (
                <ul className={styles.controleBevindingen}>
                  {controle.bevindingen.map((b, i) => (
                    <li key={i}>{b.omschrijving}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
