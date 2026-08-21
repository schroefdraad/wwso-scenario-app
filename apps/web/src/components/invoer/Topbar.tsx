'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInvoer } from './InvoerContext';
import { ontbrekendeStap, projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';
import { PuntenStrip } from './PuntenStrip';
import { slaPandOp } from '../../lib/resultaat/opslag';
import styles from './styles.module.css';

export function Topbar() {
  const { state, dispatch } = useInvoer();
  const router = useRouter();
  const stap = useMemo(() => ontbrekendeStap(state), [state]);
  const pand = useMemo(() => projecteerNaarPandInvoer(state), [state]);
  const n = parseInt(state.pand.aantalKamers, 10) || 0;

  const pandCompleet = !!(
    state.pand.adres &&
    state.pand.stad &&
    state.pand.coropGebied &&
    state.pand.wozOppervlak &&
    state.pand.bouwjaar &&
    (state.pand.energielabel === 'Bouwjaar' || state.pand.energielabelIngangsdatum)
  );

  return (
    <header className={styles.topbar}>
      <span className={styles.titel}>🏠 {state.pand.adres || 'Nieuw pand'}</span>
      <span className={styles.sub}>
        {n} kamer{n === 1 ? '' : 's'}
      </span>
      <nav className={styles.sections}>
        <a className={styles.sectionLink} href="#sectie-pand">
          ① Pand <span className={`${styles.badge} ${pandCompleet ? styles.badgeOk : ''}`}>{pandCompleet ? '✓' : '…'}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-ruimten">
          ② Ruimten <span className={`${styles.badge} ${state.ruimtes.length > 0 ? styles.badgeOk : ''}`}>{state.ruimtes.length}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-overig">
          ③ Overige posten <span className={`${styles.badge} ${styles.badgeOk}`}>✓</span>
        </a>
      </nav>
      <div className={styles.spacer} />
      <Link href="/deals" className={styles.sectionLink}>
        Mijn deals
      </Link>
      <PuntenStrip />
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimair}`}
        disabled={!pand}
        title={stap ?? undefined}
        onClick={() => {
          if (!pand) return;
          slaPandOp({ pand });
          router.push('/pand/resultaat');
        }}
      >
        Doorrekenen →
      </button>
      {state.ruimtes.length > 0 && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`}
          onClick={() => {
            if (confirm('Alle ingevoerde gegevens wissen?')) dispatch({ soort: 'ALLES_GEWIST' });
          }}
        >
          Alles wissen
        </button>
      )}
    </header>
  );
}
