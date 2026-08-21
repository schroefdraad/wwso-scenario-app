'use client';

import type { Pakket, PandWaardering } from '@wwso/engine';
import { formateerEuro, formateerEuroBand, formateerJarenBand, formateerPctBand } from '../../lib/vergelijking/formatteren';
import styles from './styles.module.css';

export interface ScenarioKolom {
  naam: string;
  pakket: Pakket | null;
}

/**
 * Bovenste vergelijkingsraster: as-is naast maximaal drie scenario's (taakomschrijving taak 14).
 * Toont exact de kolom uit taak 11 (investering, terugverdientijd, marginaal rendement, ΔBAR,
 * vergunningplicht) plus de resulterende jaarhuur — dat is de kern van de "directe hertelling".
 */
export function SamenvattingRij({
  asIsWaardering,
  kolommen,
  onNaamWijzig,
  onSnelVullen,
  onBekijkResultaat,
  onBewerkHandmatig,
  heeftVerwervingswaarde,
}: {
  asIsWaardering: PandWaardering;
  kolommen: ScenarioKolom[];
  onNaamWijzig: (index: number, naam: string) => void;
  onSnelVullen: (index: number, soort: 'basis' | 'comfort' | 'maximaal' | 'leeg') => void;
  onBekijkResultaat: (index: number) => void;
  onBewerkHandmatig: (index: number) => void;
  heeftVerwervingswaarde: boolean;
}) {
  return (
    <div className={styles.samenvatting}>
      <div className={styles.samenvattingLabel} />
      <div className={`${styles.samenvattingCel} ${styles.samenvattingKop}`}>As-is</div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={`${styles.samenvattingCel} ${styles.samenvattingKop}`}>
          <div className={styles.samenvattingKopNaam}>
            <input value={kolom.naam} onChange={(e) => onNaamWijzig(i, e.target.value)} aria-label={`Naam scenario ${i + 1}`} />
          </div>
          <div className={styles.snelStart}>
            <button type="button" className={styles.btn} onClick={() => onSnelVullen(i, 'basis')}>
              Basis
            </button>
            <button type="button" className={styles.btn} onClick={() => onSnelVullen(i, 'comfort')}>
              Comfort
            </button>
            <button type="button" className={styles.btn} onClick={() => onSnelVullen(i, 'maximaal')}>
              Maximaal
            </button>
            <button type="button" className={styles.btn} onClick={() => onBewerkHandmatig(i)}>
              Bewerk handmatig →
            </button>
            {kolom.pakket && (
              <button type="button" className={styles.btn} onClick={() => onSnelVullen(i, 'leeg')}>
                Leegmaken
              </button>
            )}
          </div>
        </div>
      ))}

      <div className={styles.samenvattingLabel}>Jaarhuur</div>
      <div className={`${styles.samenvattingCel} ${styles.samenvattingWaarde}`}>{formateerEuro(asIsWaardering.brutoJaarhuurEuro)}</div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={`${styles.samenvattingCel} ${styles.samenvattingWaarde}`}>
          {kolom.pakket ? formateerEuro(asIsWaardering.brutoJaarhuurEuro + kolom.pakket.extraJaarhuurEuro) : formateerEuro(asIsWaardering.brutoJaarhuurEuro)}
        </div>
      ))}

      <div className={styles.samenvattingLabel}>Extra jaarhuur</div>
      <div className={`${styles.samenvattingCel} ${styles.samenvattingWaarde}`}>—</div>
      {kolommen.map((kolom, i) => (
        <div
          key={i}
          className={`${styles.samenvattingCel} ${styles.samenvattingWaarde} ${
            kolom.pakket && kolom.pakket.extraJaarhuurEuro > 0 ? styles.samenvattingWaardePositief : ''
          }`}
        >
          {kolom.pakket ? `+${formateerEuro(kolom.pakket.extraJaarhuurEuro)}` : '—'}
        </div>
      ))}

      <div className={styles.samenvattingLabel}>Investering</div>
      <div className={styles.samenvattingCel}>—</div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={styles.samenvattingCel}>
          {kolom.pakket ? formateerEuroBand(kolom.pakket.investeringEuro) : '—'}
        </div>
      ))}

      <div className={styles.samenvattingLabel}>Terugverdientijd</div>
      <div className={styles.samenvattingCel}>—</div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={styles.samenvattingCel}>
          {kolom.pakket ? formateerJarenBand(kolom.pakket.terugverdientijdJaren) : '—'}
        </div>
      ))}

      <div className={styles.samenvattingLabel}>Marginaal bruto rendement</div>
      <div className={styles.samenvattingCel}>—</div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={styles.samenvattingCel}>
          {kolom.pakket ? formateerPctBand(kolom.pakket.marginaalBrutoRendementPct) : '—'}
        </div>
      ))}

      {heeftVerwervingswaarde && (
        <>
          <div className={styles.samenvattingLabel}>ΔBAR</div>
          <div className={styles.samenvattingCel}>—</div>
          {kolommen.map((kolom, i) => (
            <div key={i} className={styles.samenvattingCel}>
              {kolom.pakket ? formateerPctBand(kolom.pakket.deltaBarProcentpunt) : '—'}
            </div>
          ))}
        </>
      )}

      <div className={styles.samenvattingLabel}>Vergunningplichtig</div>
      <div className={styles.samenvattingCel}>—</div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={styles.samenvattingCel}>
          {kolom.pakket && kolom.pakket.vergunningplichtig.length > 0 ? `${kolom.pakket.vergunningplichtig.length} maatregel(en)` : kolom.pakket ? 'geen' : '—'}
        </div>
      ))}

      <div className={styles.samenvattingLabel} />
      <div className={styles.samenvattingCel} />
      {kolommen.map((kolom, i) => (
        <div key={i} className={styles.samenvattingCel}>
          {kolom.pakket && (
            <button type="button" className={styles.btnLink} onClick={() => onBekijkResultaat(i)}>
              Bekijk volledig resultaat →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
