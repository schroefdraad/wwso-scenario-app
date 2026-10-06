'use client';

import { useInvoer } from './InvoerContext';
import { RuimteRijRow } from './RuimteRijComponent';
import { ToewijzingsOverzicht } from './ToewijzingsOverzicht';
import { Waarschuwingen } from './Waarschuwingen';
import { QUICKADD_TYPES, TYPE_GROEPEN } from './typeGroepen';
import type { RuimteType } from '@wwso/engine';
import styles from './styles.module.css';

export function RuimteRaster() {
  const { state, dispatch } = useInvoer();
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
            {/* Terug na ultra-review 2026-10-06: zonder tekst was het een leeg grijs vlak. */}
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
                <th className={styles.colVoorz}>Voorzieningen</th>
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
          <span style={{ width: 1, height: '1.6rem', background: 'var(--line)' }} />
          {/* Generiek toevoegen voor elk type uit TYPE_GROEPEN, niet alleen de vijf QUICKADD_TYPES
           * hieronder (feedback Steven Kramer, 2026-09-08: een dropdown met alle typen "zoals in
           * het hoofdmenu" — dezelfde groepenlijst als de type-select per rij). */}
          <select
            className={styles.btn}
            disabled={state.ruimtes.length >= 40}
            value=""
            aria-label="Ruimte toevoegen"
            onChange={(e) => {
              const type = e.target.value as RuimteType;
              if (!type) return;
              const bestaand = state.ruimtes.filter((r) => r.type === type).length;
              const naam = bestaand === 0 ? type : `${type} ${bestaand + 1}`;
              dispatch({
                soort: 'RUIMTE_TOEGEVOEGD',
                ruimte: { type, naam, kamers: Array.from({ length: aantalKamers }, (_, i) => i + 1) },
              });
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              Ruimte toevoegen…
            </option>
            {TYPE_GROEPEN.map((groep) => (
              <optgroup key={groep.label} label={groep.label}>
                {groep.types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <span style={{ width: 1, height: '1.6rem', background: 'var(--line)' }} />
          <div className={styles.quickaddGroep}>
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
          </div>
          <span className={styles.tellerRechts}>{state.ruimtes.length}/40</span>
        </div>

        <ToewijzingsOverzicht />
        <Waarschuwingen />
      </div>
    </section>
  );
}
