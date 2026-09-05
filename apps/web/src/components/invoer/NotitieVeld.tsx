'use client';

import { useInvoer } from './InvoerContext';
import styles from './styles.module.css';

/** Helemaal onderaan de pand-invoerpagina (feedback Emma, 2026-09-04) — een vrije notitie die al
 * vóór het bestaan van een deal ingevuld kan worden, en meegaat naar de scenariovergelijking. */
export function NotitieVeld() {
  const { state, dispatch } = useInvoer();
  if (state.handmatigScenario) return null;

  return (
    <section className={styles.blok}>
      <div className={styles.blokKop}>
        <h2>Notitie</h2>
      </div>
      <div className={styles.blokInhoud}>
        <textarea
          value={state.notitieOntwerp}
          onChange={(e) => dispatch({ soort: 'NOTITIE_GEWIJZIGD', notitie: e.target.value })}
          aria-label="Notitie bij deze woning"
          placeholder="Vrije notitie bij deze woning (optioneel, zichtbaar in het woningen-overzicht)…"
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
    </section>
  );
}
