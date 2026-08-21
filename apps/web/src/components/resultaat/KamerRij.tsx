'use client';

import { useState } from 'react';
import type { EindtellingKamer, PandInvoer, RubriekToelichting } from '@wwso/engine';
import { RUBRIEK_VOLGORDE } from '../../lib/resultaat/rubriek-labels';
import { filterToelichtingVoorKamer, toegankelijkeRuimteNrsVoorKamer } from '../../lib/resultaat/toelichting-filter';
import { RubriekRij } from './RubriekRij';
import styles from './styles.module.css';

function formateerEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

export function KamerRij({
  kamer,
  resultaat,
  pand,
  rubriekToelichting,
}: {
  kamer: number;
  resultaat: EindtellingKamer;
  pand: PandInvoer;
  rubriekToelichting: RubriekToelichting;
}) {
  const [open, setOpen] = useState(false);
  const toegankelijkeRuimteNrs = toegankelijkeRuimteNrsVoorKamer(pand, kamer);

  return (
    <div className={styles.kamerRij}>
      <button type="button" className={styles.kamerKop} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={styles.kamerNaam}>Kamer {kamer}</span>
        <span className={styles.kamerPunten}>{resultaat.totaalPunten} pt</span>
        <span className={styles.kamerHuur}>{formateerEuro(resultaat.maxHuurEuro)}</span>
        {resultaat.monumentPunten > 0 && <span className={styles.rubriekPuntenRuw}>waarvan +{resultaat.monumentPunten} monument</span>}
        <span className={`${styles.kamerChevron} ${open ? styles.kamerChevronOpen : ''}`} aria-hidden>
          ▸
        </span>
      </button>
      {open && (
        <div className={styles.rubriekTabel}>
          {RUBRIEK_VOLGORDE.map((key) => (
            <RubriekRij
              key={key}
              rubriekKey={key}
              punten={resultaat.rubrieken[key]}
              puntenRuw={resultaat.rubriekenRuw[key]}
              toelichting={filterToelichtingVoorKamer(rubriekToelichting[key], kamer, toegankelijkeRuimteNrs)}
            />
          ))}
          <div className={styles.subtotaal}>
            <span>Subtotaal R1 t/m R11</span>
            <strong>{resultaat.subtotaalR1TotEnMet11.toFixed(2)} pt</strong>
          </div>
          {resultaat.zorgwoningOpslagPunten > 0 && (
            <div className={styles.subtotaal}>
              <span>Zorgwoning-opslag (+35%)</span>
              <strong>+{resultaat.zorgwoningOpslagPunten.toFixed(2)} pt</strong>
            </div>
          )}
          <div className={styles.subtotaal}>
            <span>Eindsaldering op hele punten</span>
            <strong>{resultaat.totaalPunten} pt</strong>
          </div>
          {resultaat.monumentPunten > 0 && (
            <div className={styles.subtotaal}>
              <span>Monumentpunten (§2.14.3)</span>
              <strong>+{resultaat.monumentPunten} pt</strong>
            </div>
          )}
          <div className={styles.subtotaal}>
            <span>Huurprijs-lookup ({resultaat.puntenVoorHuurprijs} pt)</span>
            <strong>{formateerEuro(resultaat.maxHuurExclOpslagEuro)}</strong>
          </div>
          {resultaat.opslagPercentage > 0 && (
            <div className={styles.subtotaal}>
              <span>
                Monumentopslag ({resultaat.opslagGrondslag}, +{resultaat.opslagPercentage}%)
              </span>
              <strong>{formateerEuro(resultaat.maxHuurEuro)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
