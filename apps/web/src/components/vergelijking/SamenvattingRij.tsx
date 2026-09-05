'use client';

import Link from 'next/link';
import type { Energielabel, Pakket, PandWaardering } from '@wwso/engine';
import type { EnergielabelScenarioDoel } from '../../lib/vergelijking/scenario-bouw';
import { formateerEuro, formateerEuroBand, formateerJarenBand, formateerPctBand } from '../../lib/vergelijking/formatteren';
import styles from './styles.module.css';

export interface ScenarioKolom {
  naam: string;
  pakket: Pakket | null;
  /** `null` als deze kolom geen energielabel-scenario is (Tussenfase-taak C). */
  energielabelDoel: Energielabel | null;
}

/**
 * Bovenste vergelijkingsraster: as-is naast maximaal drie scenario's (taakomschrijving taak 14).
 * Toont exact de kolom uit taak 11 (investering, terugverdientijd, marginaal rendement, ΔBAR,
 * vergunningplicht) plus de resulterende jaarhuur — dat is de kern van de "directe hertelling".
 */
export function SamenvattingRij({
  asIsWaardering,
  asIsDealId,
  kolommen,
  energielabelOpties,
  onNaamWijzig,
  onLeegmaken,
  onWisselEnergielabel,
  onBekijkResultaat,
  onBekijkAsIsResultaat,
  onBewerkHandmatig,
  heeftVerwervingswaarde,
}: {
  asIsWaardering: PandWaardering;
  /** Alleen gezet als de as-is al als deal is opgeslagen — "Bewerk handmatig" voor as-is
   * navigeert naar de bewerkbare kopie van díe deal, net als het vroegere "Pandgegevens
   * bewerken"-linkje uit de paginakop (nu hier, naast de scenario-links, voor consistentie). */
  asIsDealId: string | undefined;
  kolommen: ScenarioKolom[];
  /** Doellabels met een ingevulde kosteninschatting op dit pand (Tussenfase-taak C) — leeg ⇒ geen
   * wisselknop tonen, er is niets om naar te wisselen. */
  energielabelOpties: EnergielabelScenarioDoel[];
  onNaamWijzig: (index: number, naam: string) => void;
  onLeegmaken: (index: number) => void;
  onWisselEnergielabel: (index: number, doelLabel: Energielabel | null) => void;
  onBekijkResultaat: (index: number) => void;
  onBekijkAsIsResultaat: () => void;
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
          {energielabelOpties.length > 0 && (
            <select
              value={kolom.energielabelDoel ?? ''}
              onChange={(e) => onWisselEnergielabel(i, e.target.value ? (e.target.value as Energielabel) : null)}
              aria-label={`Energielabel-scenario ${i + 1}`}
              className={styles.energielabelWissel}
            >
              <option value="">Geen energielabel-scenario</option>
              {energielabelOpties.map((doel) => (
                <option key={doel} value={doel}>
                  Label {doel}
                </option>
              ))}
            </select>
          )}
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
      <div className={styles.samenvattingCel}>
        <div className={styles.linkStapel}>
          <button type="button" className={styles.btnLink} onClick={onBekijkAsIsResultaat}>
            Bekijk volledig resultaat →
          </button>
          {asIsDealId && (
            <Link href={`/woning/nieuw?deal=${asIsDealId}`} className={styles.btnLink}>
              Bewerk handmatig →
            </Link>
          )}
        </div>
      </div>
      {kolommen.map((kolom, i) => (
        <div key={i} className={styles.samenvattingCel}>
          <div className={styles.linkStapel}>
            {kolom.pakket && (
              <button type="button" className={styles.btnLink} onClick={() => onBekijkResultaat(i)}>
                Bekijk volledig resultaat →
              </button>
            )}
            <button type="button" className={styles.btnLink} onClick={() => onBewerkHandmatig(i)}>
              Bewerk handmatig →
            </button>
            {kolom.pakket && (
              <button type="button" className={styles.btnLink} onClick={() => onLeegmaken(i)}>
                Leegmaken
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
