'use client';

import { Fragment } from 'react';
import type { KandidaatWaardering } from '@wwso/engine';
import { groepeerPerRubriek } from '../../lib/vergelijking/rubriek-groepering';
import { formateerEuro } from '../../lib/vergelijking/formatteren';
import type { ScenarioSlot } from '../../lib/vergelijking/useScenarioPakket';
import styles from './styles.module.css';

const VERGUNNING_LABEL: Record<string, string> = {
  'mogelijk-melding': 'melding',
  vergunning: 'vergunning',
};

/**
 * Maatregelen aan- en uitzetten per scenario-kolom (taak 14). Elke checkbox is onafhankelijk —
 * bewust géén alternatiefGroep-uitsluiting zoals bij de algoritmische pakketopbouw (taak 11):
 * hier kiest de gebruiker expliciet, dus `bouwVrijScenario` past toe wat is aangevinkt, ook als
 * dat economisch geen marginale winst oplevert.
 */
export function MaatregelTabel({
  kandidaten,
  slots,
  onToggle,
}: {
  kandidaten: readonly KandidaatWaardering[];
  slots: ScenarioSlot[];
  onToggle: (slotIndex: number, sleutel: string) => void;
}) {
  const groepen = groepeerPerRubriek(kandidaten);

  return (
    <section className={styles.blok}>
      <div className={styles.blokKop}>
        <h2>Maatregelen</h2>
      </div>
      <div className={styles.tabelScroll}>
        <table className={styles.tabel}>
          <thead>
            <tr>
              <th>Maatregel</th>
              <th>+€/jr</th>
              <th>Investering</th>
              <th>TVT</th>
              {slots.map((slot, i) => (
                <th key={i} className={styles.checkCel}>
                  {slot.naam}
                  {slot.soort === 'handmatig' && <span className={styles.vergunningBadge}>handmatig bewerkt</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groepen.map((groep) => (
              <Fragment key={groep.rubriek}>
                <tr className={styles.rubriekRij}>
                  <td colSpan={4 + slots.length}>{groep.label}</td>
                </tr>
                {groep.kandidaten.map((k) => (
                  <tr key={k.kandidaat.sleutel} className={styles.maatregelRij}>
                    <td className={styles.maatregelOmschrijving}>
                      <span className={styles.maatregelId}>{k.maatregel.id}</span>
                      {k.kandidaat.omschrijving}
                      {VERGUNNING_LABEL[k.vergunningKlasse] && (
                        <span className={styles.vergunningBadge} title={k.maatregel.vergunningOfMelding}>
                          {VERGUNNING_LABEL[k.vergunningKlasse]}
                        </span>
                      )}
                    </td>
                    <td className={styles.tvtCel}>+{formateerEuro(k.extraJaarhuurEuro)}</td>
                    <td className={styles.tvtCel}>{formateerEuro(k.investeringEuro.verwacht)}</td>
                    <td className={styles.tvtCel}>{k.terugverdientijdJaren ? `${k.terugverdientijdJaren.verwacht.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} jr` : '—'}</td>
                    {slots.map((slot, i) => (
                      <td key={i} className={styles.checkCel}>
                        <input
                          type="checkbox"
                          checked={slot.soort === 'kandidaten' && slot.sleutels.has(k.kandidaat.sleutel)}
                          onChange={() => onToggle(i, k.kandidaat.sleutel)}
                          aria-label={`${k.kandidaat.omschrijving} in ${slot.naam}`}
                          title={slot.soort === 'handmatig' ? 'Dit scenario is handmatig bewerkt — aanvinken zet het terug naar losse maatregelen.' : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
