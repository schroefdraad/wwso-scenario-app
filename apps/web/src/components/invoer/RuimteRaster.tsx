'use client';

import { useInvoer } from './InvoerContext';
import { useToast } from './ToastContext';
import { RuimteRijRow } from './RuimteRijComponent';
import { ToewijzingsOverzicht } from './ToewijzingsOverzicht';
import { Waarschuwingen } from './Waarschuwingen';
import { QUICKADD_TYPES } from './typeGroepen';
import styles from './styles.module.css';

export function RuimteRaster() {
  const { state, dispatch } = useInvoer();
  const { toon } = useToast();
  const aantalKamers = parseInt(state.pand.aantalKamers, 10) || 0;
  const poortOpen = aantalKamers > 0;

  return (
    <section className={styles.blok} id="sectie-ruimten">
      <div className={styles.blokKop}>
        <h2>② Ruimten</h2>
        <span className={styles.telling}>{state.ruimtes.length} / 40</span>
      </div>
      <div className={styles.blokInhoud}>
        {!poortOpen && (
          <div className={styles.inertOverlay}>
            <span>Vul eerst het aantal kamers in (sectie ①)</span>
          </div>
        )}
        <div className={styles.gridScroll}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th className={styles.colNr}>#</th>
                <th className={styles.colNaam}>Naam</th>
                <th className={styles.colType}>Type</th>
                <th className={styles.colM2}>m²</th>
                <th className={styles.colVerd}>Verd.</th>
                <th className={styles.colBool}>Verw.</th>
                <th className={styles.colBool}>Verk.</th>
                <th className={styles.colAdr}>Adress.</th>
                <th className={styles.colToegang}>Toegang</th>
                <th className={styles.colVoorz}>Voorz.</th>
                <th className={styles.colActies} />
              </tr>
            </thead>
            <tbody>
              {state.ruimtes.map((rij, i) => (
                <RuimteRijRow key={rij.id} rij={rij} volgendeRijId={state.ruimtes[i + 1]?.id} />
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.gridFooter}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimair}`}
            onClick={() => dispatch({ soort: 'SCAFFOLD_PRIVEVERTREKKEN' })}
          >
            Maak {aantalKamers || 0} privévertrekken aan
          </button>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              if (state.ruimtes.length > 0 && !confirm('Er staan al ruimten ingevoerd. Voorbeeldpand laden en overschrijven?')) return;
              dispatch({ soort: 'VOORBEELDPAND_GELADEN' });
              toon('Voorbeeldpand geladen (testpand6Kamers)');
            }}
          >
            Voorbeeldpand laden
          </button>
          <span style={{ width: 1, height: '1.6rem', background: 'var(--line)' }} />
          <span className={styles.hint}>Snel toevoegen:</span>
          <div className={styles.quickadd}>
            {QUICKADD_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`${styles.btn} ${styles.btnKlein}`}
                disabled={state.ruimtes.length >= 40}
                onClick={() => {
                  const bestaand = state.ruimtes.filter((r) => r.type === type).length;
                  const naam = bestaand === 0 ? type : `${type} ${bestaand + 1}`;
                  dispatch({
                    soort: 'RUIMTE_TOEGEVOEGD',
                    ruimte: { type, naam, kamers: Array.from({ length: aantalKamers }, (_, i) => i + 1) },
                  });
                }}
              >
                + {type}
              </button>
            ))}
          </div>
          <span className={styles.tellerRechts}>{state.ruimtes.length}/40</span>
        </div>

        <ToewijzingsOverzicht />
        <Waarschuwingen />
      </div>
    </section>
  );
}
