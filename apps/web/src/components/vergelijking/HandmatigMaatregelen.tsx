'use client';

import { Fragment } from 'react';
import type { KandidaatWaardering } from '@wwso/engine';
import { groepeerPerRubriek } from '../../lib/vergelijking/rubriek-groepering';
import { formateerEuro } from '../../lib/vergelijking/formatteren';
import styles from './styles.module.css';

const VERGUNNING_LABEL: Record<string, string> = {
  'mogelijk-melding': 'melding',
  vergunning: 'vergunning',
};

/**
 * Standaardmaatregelen die specifiek van toepassing zijn op ÉÉN handmatig bewerkt TO-BE-pand
 * (backlog 2026-08-22: "handmatig een extra kamer realiseren en dan verder maatregelen
 * toevoegen, met kosten/terugverdientijd zichtbaar"). Losstaand van `MaatregelTabel` — die toont
 * de gedeelde as-is-kandidatenlijst voor de kandidaten-slots, waar een net toegevoegde kamer nog
 * niet in voorkomt; deze kandidatenlijst is opnieuw berekend tegen het bewerkte pand zelf.
 *
 * De handmatige investering (het kosten-veld voor de herindeling zelf, waar geen catalogusprijs
 * voor bestaat) staat hier los van de maatregelkosten — samen tellen ze op tot de Investering die
 * in `SamenvattingRij` verschijnt zodra dit slot geen "onbekend" meer is.
 */
export function HandmatigMaatregelen({
  slotNaam,
  kandidaten,
  geselecteerd,
  handmatigeInvesteringEuro,
  onToggle,
  onInvesteringWijzig,
}: {
  slotNaam: string;
  kandidaten: readonly KandidaatWaardering[];
  geselecteerd: ReadonlySet<string>;
  handmatigeInvesteringEuro: number;
  onToggle: (sleutel: string) => void;
  onInvesteringWijzig: (euro: number) => void;
}) {
  const groepen = groepeerPerRubriek(kandidaten);

  return (
    <section className={styles.blok}>
      <div className={styles.blokKop}>
        <h2>{slotNaam} — maatregelen op de handmatig bewerkte situatie</h2>
        <p className={styles.hint}>
          De kamer/herindeling zelf heeft geen catalogusprijs — vul die investering hieronder zelf in. Maatregelen die je hier aanvinkt (bijv. airco of een
          kitchenette in de nieuwe kamer) tellen met hun échte kosten mee bovenop dat bedrag.
        </p>
        <label className={styles.handmatigInvesteringVeld}>
          Investering herindeling (€)
          <input
            type="number"
            min={0}
            step={100}
            value={handmatigeInvesteringEuro || ''}
            placeholder="0"
            onChange={(e) => onInvesteringWijzig(e.target.value === '' ? 0 : Number(e.target.value))}
            aria-label={`Investering herindeling voor ${slotNaam}`}
          />
        </label>
      </div>
      {kandidaten.length === 0 ? (
        <p className={styles.hint} style={{ padding: '0.9rem 1.2rem' }}>
          Geen enkele standaardmaatregel is op deze bewerkte situatie van toepassing.
        </p>
      ) : (
        <div className={styles.tabelScroll}>
          <table className={styles.tabel}>
            <thead>
              <tr>
                <th>Maatregel</th>
                <th>Solo +€/jr</th>
                <th>Solo investering</th>
                <th>TVT</th>
                <th className={styles.checkCel}>Toepassen</th>
              </tr>
            </thead>
            <tbody>
              {groepen.map((groep) => (
                <Fragment key={groep.rubriek}>
                  <tr className={styles.rubriekRij}>
                    <td colSpan={5}>{groep.label}</td>
                  </tr>
                  {groep.kandidaten.map((k) => (
                    <tr key={k.kandidaat.sleutel} className={styles.maatregelRij}>
                      <td className={styles.maatregelOmschrijving}>
                        <span className={styles.maatregelId}>{k.maatregel.id}</span>
                        {k.kandidaat.omschrijving}
                        {VERGUNNING_LABEL[k.vergunningKlasse] && <span className={styles.vergunningBadge}>{VERGUNNING_LABEL[k.vergunningKlasse]}</span>}
                      </td>
                      <td className={styles.tvtCel}>+{formateerEuro(k.extraJaarhuurEuro)}</td>
                      <td className={styles.tvtCel}>{formateerEuro(k.investeringEuro.verwacht)}</td>
                      <td className={styles.tvtCel}>
                        {k.terugverdientijdJaren ? `${k.terugverdientijdJaren.verwacht.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} jr` : '—'}
                      </td>
                      <td className={styles.checkCel}>
                        <input
                          type="checkbox"
                          checked={geselecteerd.has(k.kandidaat.sleutel)}
                          onChange={() => onToggle(k.kandidaat.sleutel)}
                          aria-label={`${k.kandidaat.omschrijving} toepassen in ${slotNaam}`}
                        />
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
