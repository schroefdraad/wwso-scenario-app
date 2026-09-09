'use client';

import { useMemo } from 'react';
import { MIN_OPPERVLAKTE_M2, ruimtesPerKamer, vertrekOppervlakteM2 } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { KamerChipStrip } from './KamerChipStrip';
import { Toggle } from './Toggle';
import { InfoBadge } from '../InfoBadge';
import styles from './styles.module.css';
import type { InvoerState } from '../../lib/invoer/types';
import { projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';

const AFTREK_KOLOMMEN: { key: keyof InvoerState['aftrekSituaties']; label: string; titel: string }[] = [
  { key: 'verhuurderCriterium', label: 'Verhuurder-criterium', titel: 'Hoofdverblijf verhuurder + woonruimte/sanitair alleen via diens vertrek bereikbaar' },
  { key: 'ruitoppervlakteOnvoldoende', label: 'Ruit < 0,75 m²', titel: 'Ruitoppervlakte hoofdwoonvertrek < 0,75 m²' },
  { key: 'raamkozijnTeHoog', label: 'Raamkozijn > 1,60 m', titel: 'Laagste raamkozijn hoofdwoonvertrek > 1,60 m boven de vloer' },
];

export function OverigePosten() {
  const { state, dispatch } = useInvoer();
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  const poortOpen = n > 0;

  /** Situatie 1 van §2.13 (oppervlakte < 8 m²) staat niet in `aftrekSituaties` — die wordt door de
   * motor zelf uit de ruimte-invoer afgeleid, niet handmatig aangevinkt (zie de doc-comment bij
   * `berekenR13`). Hier alleen ter INFORMATIE herberekend met dezelfde grondslag, zodat de tabel
   * niet de indruk geeft dat deze situatie nergens wordt meegenomen (feedback Emma, 2026-09-09). */
  const oppervlaktePerKamer = useMemo(() => {
    const pand = projecteerNaarPandInvoer(state);
    if (!pand) return new Map<number, number>();
    const resultaat = new Map<number, number>();
    for (const [kamer, ruimtes] of ruimtesPerKamer(pand)) {
      resultaat.set(kamer, vertrekOppervlakteM2(ruimtes));
    }
    return resultaat;
  }, [state]);

  return (
    <section className={styles.blok} id="sectie-overig">
      <div className={styles.blokKop}>
        <h2>③ Overige posten</h2>
      </div>
      <div className={styles.blokInhoud}>
        {!poortOpen && (
          <div className={styles.inertOverlay}>
            <span>Vul eerst het aantal kamers in (sectie ①)</span>
          </div>
        )}

        <div className={styles.postBlok}>
          <div className={styles.postKop}>
            <Toggle checked={state.aanbelfunctieAan} label="Aanbelfunctie met video" onChange={(v) => dispatch({ soort: 'AANBEL_GEWIJZIGD', aan: v })} />
            <strong>Aanbelfunctie met video- en audioverbinding aanwezig (R12.2)</strong>
          </div>
          {state.aanbelfunctieAan && (
            <div className={styles.postDetail}>
              <span className={styles.hint}>Kamers met toegang</span>
              <div style={{ marginTop: '0.3rem' }}>
                <KamerChipStrip
                  aantalKamers={n}
                  geselecteerd={state.aanbelfunctieKamers}
                  ariaLabel="Kamers met toegang tot de aanbelfunctie"
                  onToggle={(kamer) => dispatch({ soort: 'AANBEL_KAMER_GETOGGELD', kamer })}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.postBlok}>
          <div className={styles.postKop}>
            <Toggle checked={state.losseLaadpaalAan} label="Losse laadpaal" onChange={(v) => dispatch({ soort: 'LAADPAAL_GEWIJZIGD', aan: v })} />
            <strong>Losse laadpaal aanwezig (R12.3)</strong>
            <InfoBadge>Een laadpaal bij een gemeenschappelijke parkeerplek hoort niet hier maar bij die parkeerplek (R10).</InfoBadge>
          </div>
          {state.losseLaadpaalAan && (
            <div className={styles.postDetail}>
              <span className={styles.hint}>Kamers met toegang</span>
              <div style={{ marginTop: '0.3rem' }}>
                <KamerChipStrip
                  aantalKamers={n}
                  geselecteerd={state.losseLaadpaalKamers}
                  ariaLabel="Kamers met toegang tot de losse laadpaal"
                  onToggle={(kamer) => dispatch({ soort: 'LAADPAAL_KAMER_GETOGGELD', kamer })}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.postBlok}>
          <span className={styles.labelRij}>
            <strong>Aftrekpunten (§2.13)</strong>
            <InfoBadge>Elke situatie kost 4 punten per kamer; een kamer die in twee kolommen staat verliest 8 punten.</InfoBadge>
          </span>
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.aftrek}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Kamer</th>
                  <th title={`Automatisch bepaald uit de ruimte-invoer, niet handmatig aan te vinken: geldt zodra de oppervlakte van het vertrek (§2.1-grondslag) onder ${MIN_OPPERVLAKTE_M2} m² komt.`}>
                    Oppervlakte &lt; {MIN_OPPERVLAKTE_M2} m²
                  </th>
                  {AFTREK_KOLOMMEN.map((k) => (
                    <th key={k.key} title={k.titel}>
                      {k.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: n }, (_, i) => i + 1).map((kamer) => {
                  const oppervlakteM2 = oppervlaktePerKamer.get(kamer);
                  const teKlein = oppervlakteM2 !== undefined && oppervlakteM2 < MIN_OPPERVLAKTE_M2;
                  return (
                    <tr key={kamer}>
                      <td style={{ textAlign: 'left' }}>Kamer {kamer}</td>
                      <td
                        className={teKlein ? styles.aftrekAutomatisch : styles.dim}
                        title={oppervlakteM2 !== undefined ? `${oppervlakteM2} m²` : undefined}
                      >
                        {teKlein ? '✓ (automatisch)' : '—'}
                      </td>
                      {AFTREK_KOLOMMEN.map((k) => (
                        <td key={k.key}>
                          <input
                            type="checkbox"
                            checked={state.aftrekSituaties[k.key].includes(kamer)}
                            aria-label={`${k.label}, kamer ${kamer}`}
                            onChange={() => dispatch({ soort: 'AFTREKSITUATIE_GETOGGELD', situatie: k.key, kamer })}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
