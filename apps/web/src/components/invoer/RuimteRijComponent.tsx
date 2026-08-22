'use client';

import type { RuimteType } from '@wwso/engine';
import type { KeyboardEvent } from 'react';
import { KamerChipStrip } from './KamerChipStrip';
import { useInvoer } from './InvoerContext';
import { useLade } from './LadeContext';
import { useToast } from './ToastContext';
import { DUBBEL_GEDEELDE_RUIMTE_TYPES } from '@wwso/engine';
import { KOUD_TYPES } from '../../lib/invoer/reducer';
import { TYPE_GROEPEN } from './typeGroepen';
import styles from './styles.module.css';
import type { RuimteRij } from '../../lib/invoer/types';

function isDubbelGedeeld(type: RuimteType): boolean {
  return (DUBBEL_GEDEELDE_RUIMTE_TYPES as readonly string[]).includes(type);
}

export function RuimteRijRow({ rij, volgendeRijId }: { rij: RuimteRij; volgendeRijId?: string }) {
  const { state, dispatch } = useInvoer();
  const { open } = useLade();
  const { toon } = useToast();
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  const leeg = rij.kamers.length === 0;
  const dubbel = isDubbelGedeeld(rij.type);
  const koud = KOUD_TYPES.has(rij.type);

  const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      dispatch({ soort: 'RIJ_GEDUPLICEERD', id: rij.id });
    }
    if (e.key === 'Enter' && !volgendeRijId) {
      const dezeIndex = state.ruimtes.findIndex((r) => r.id === rij.id);
      if (dezeIndex === state.ruimtes.length - 1) {
        dispatch({ soort: 'RUIMTE_TOEGEVOEGD', ruimte: {} });
      }
    }
  };

  const verwijder = () => {
    dispatch({ soort: 'RUIMTE_VERWIJDERD', id: rij.id });
    toon(`Ruimte ${rij.nr} (${rij.naam || 'naamloos'}) verwijderd`, () => {
      dispatch({ soort: 'RUIMTE_HERSTELD', ruimte: rij, naVanId: null });
    });
  };

  return (
    <tr id={`ruimte-${rij.id}`} className={leeg ? styles.rijLeeg : undefined} onKeyDown={handleKeyDown}>
      <td className={styles.colNr}>{rij.nr}</td>
      <td className={styles.colNaam}>
        <input
          value={rij.naam}
          aria-label={`Naam, ruimte ${rij.nr}`}
          onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { naam: e.target.value } })}
        />
      </td>
      <td className={styles.colType}>
        <select
          value={rij.type}
          aria-label={`Type, ruimte ${rij.nr}`}
          onChange={(e) => dispatch({ soort: 'RUIMTE_TYPE_GEWIJZIGD', id: rij.id, type: e.target.value as RuimteType })}
        >
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
      </td>
      <td className={styles.colM2}>
        <input
          value={rij.oppervlakteM2}
          placeholder="0,0"
          aria-label={`Oppervlakte, ruimte ${rij.nr}`}
          onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { oppervlakteM2: e.target.value } })}
        />
      </td>
      <td className={styles.colVerd}>
        <input
          type="number"
          value={rij.verdieping}
          aria-label={`Verdieping, ruimte ${rij.nr}`}
          onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { verdieping: e.target.value } })}
        />
      </td>
      <td className={styles.colBool}>
        <input
          type="checkbox"
          checked={rij.verwarmd}
          disabled={koud}
          aria-label={`Verwarmd, ruimte ${rij.nr}`}
          onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { verwarmd: e.target.checked } })}
        />
      </td>
      <td className={styles.colBool}>
        <input
          type="checkbox"
          checked={rij.verkoeld}
          disabled={koud}
          aria-label={`Verkoeld, ruimte ${rij.nr}`}
          onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { verkoeld: e.target.checked } })}
        />
      </td>
      <td className={styles.colAdr}>
        {dubbel ? (
          <>
            <input
              type="number"
              min={1}
              value={rij.aantalAdressenMetToegang}
              // Bewust GEEN placeholder="1": die zag er in deze compacte tabel visueel bijna
              // hetzelfde uit als een echt ingevulde "1", waardoor een leeg (dus ongeldig) veld
              // per ongeluk als "al ingevuld" gelezen werd (gemeld door een gebruiker,
              // 2026-08-22 — "Doorrekenen" bleef geblokkeerd zonder zichtbare reden). De
              // amber-rand hieronder maakt een leeg verplicht veld nu wél in één oogopslag
              // herkenbaar, in plaats van een placeholder die op een waarde lijkt.
              className={!rij.aantalAdressenMetToegang ? styles.colAdrOntbreekt : undefined}
              aria-label={`Aantal adressen met toegang, ruimte ${rij.nr}`}
              onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { aantalAdressenMetToegang: e.target.value } })}
            />
            {rij.aantalAdressenOvergenomen && <span className={styles.overgenomen}>overgenomen</span>}
          </>
        ) : (
          <span aria-hidden style={{ color: 'var(--ink-dim)' }}>
            —
          </span>
        )}
      </td>
      <td className={`${styles.colToegang} ${leeg ? styles.colToegangLeeg : ''}`}>
        <KamerChipStrip
          aantalKamers={n}
          geselecteerd={rij.kamers}
          ariaLabel={`Kamers met toegang tot ruimte ${rij.nr} (${rij.naam || 'naamloos'})`}
          onToggle={(kamer) => dispatch({ soort: 'KAMER_GETOGGELD', id: rij.id, kamer })}
        />
      </td>
      <td className={styles.colVoorz}>
        <div className={styles.voorzBadges}>
          <button
            type="button"
            className={`${styles.voorzBadgeBtn} ${rij.keuken ? styles.voorzBadgeBtnActief : ''}`}
            title="Keuken"
            onClick={() => open(rij.id, 'keuken')}
          >
            🍳
          </button>
          <button
            type="button"
            className={`${styles.voorzBadgeBtn} ${rij.sanitair ? styles.voorzBadgeBtnActief : ''}`}
            title="Sanitair"
            onClick={() => open(rij.id, 'sanitair')}
          >
            🚿
          </button>
        </div>
      </td>
      <td className={styles.colActies}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`}
          title="Dupliceren (Ctrl+D)"
          onClick={() => dispatch({ soort: 'RIJ_GEDUPLICEERD', id: rij.id })}
        >
          ⧉
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`} title="Verwijderen" onClick={verwijder}>
          ✕
        </button>
      </td>
    </tr>
  );
}
