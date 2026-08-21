'use client';

import { useInvoer } from './InvoerContext';
import styles from './styles.module.css';

/**
 * De xlsx-matrix terug, maar als CONTROLEmiddel (§4.6 van het UX-ontwerp) — niet als
 * invoermiddel. Standaard ingeklapt, met een waarschuwing zodra een ruimte aan geen enkele
 * kamer is toegewezen.
 */
export function ToewijzingsOverzicht() {
  const { state, dispatch } = useInvoer();
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  const leegeRuimten = state.ruimtes.filter((r) => r.kamers.length === 0);

  if (state.ruimtes.length === 0) return null;

  return (
    <details className={styles.overzicht}>
      <summary className={styles.overzichtSummary}>
        Toewijzingsoverzicht
        {leegeRuimten.length > 0 && <span className={styles.overzichtWarn}>⚠ {leegeRuimten.length} ruimte(n) zonder kamers</span>}
      </summary>
      <div className={styles.overzichtInhoud}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th className={styles.matrixRownaam}>Ruimte</th>
              {Array.from({ length: n }, (_, i) => i + 1).map((k) => (
                <th
                  key={k}
                  onClick={() => {
                    const alleAan = state.ruimtes.every((r) => r.kamers.includes(k));
                    for (const r of state.ruimtes) {
                      const heeft = r.kamers.includes(k);
                      if (alleAan && heeft) dispatch({ soort: 'KAMER_GETOGGELD', id: r.id, kamer: k });
                      if (!alleAan && !heeft) dispatch({ soort: 'KAMER_GETOGGELD', id: r.id, kamer: k });
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  K{k}
                </th>
              ))}
              <th>n</th>
            </tr>
          </thead>
          <tbody>
            {state.ruimtes.map((r) => (
              <tr key={r.id} className={r.kamers.length === 0 ? styles.matrixRijLeeg : undefined}>
                <td className={styles.matrixRownaam}>
                  {r.nr} · {r.naam || '(naamloos)'}
                </td>
                {Array.from({ length: n }, (_, i) => i + 1).map((k) => (
                  <td
                    key={k}
                    className={`${styles.matrixCel} ${r.kamers.includes(k) ? styles.matrixCelOn : ''}`}
                    onClick={() => dispatch({ soort: 'KAMER_GETOGGELD', id: r.id, kamer: k })}
                  >
                    {r.kamers.includes(k) ? '✓' : '·'}
                  </td>
                ))}
                <td>{r.kamers.length}</td>
              </tr>
            ))}
            <tr>
              <td className={styles.matrixRownaam}>Ruimten per kamer</td>
              {Array.from({ length: n }, (_, i) => i + 1).map((k) => (
                <td key={k}>{state.ruimtes.filter((r) => r.kamers.includes(k)).length}</td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  );
}
