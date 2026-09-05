'use client';

import { Fragment } from 'react';
import type { KandidaatWaardering } from '@wwso/engine';
import { groepeerPerRubriek } from '../../lib/vergelijking/rubriek-groepering';
import { formateerEuro } from '../../lib/vergelijking/formatteren';
import { alternatiefGroepSleutel } from '../../lib/vergelijking/scenario-bouw';
import type { ScenarioSlot } from '../../lib/vergelijking/useScenarioPakket';
import styles from './styles.module.css';

const VERGUNNING_LABEL: Record<string, string> = {
  'mogelijk-melding': 'melding',
  vergunning: 'vergunning',
};

/**
 * Maatregelen aan- en uitzetten per scenario-kolom (taak 14). Checkboxes zijn onafhankelijk,
 * BEHALVE binnen dezelfde `alternatiefGroep` + doel (Tussenfase-taak B, bijv. K-01/K-09
 * kitchenette in dezelfde kamer): `nieuweSelectieNaToggle` schakelt de andere daar al automatisch
 * uit (voorkomt de dubbele-mutatie-crash), maar zonder visuele groepering leek dat twee losstaande
 * checkboxen. Rijen die samen zo'n groep vormen krijgen een gedeelde markering, en zodra één
 * variant gekozen is wordt de andere voor dat scenario-slot uitgegrijsd i.p.v. een tweede,
 * ogenschijnlijk onafhankelijke keuze te tonen.
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
        <h2>Optimalisaties</h2>
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
                  {slot.soort === 'energielabel' && <span className={styles.vergunningBadge}>label {slot.doelLabel}</span>}
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
                {groep.kandidaten.map((k) => {
                  const groepSleutel = alternatiefGroepSleutel(k);
                  const alternatieven = groepSleutel
                    ? groep.kandidaten.filter((ander) => ander !== k && alternatiefGroepSleutel(ander) === groepSleutel)
                    : [];
                  return (
                    <tr key={k.kandidaat.sleutel} className={alternatieven.length > 0 ? `${styles.maatregelRij} ${styles.alternatiefRij}` : styles.maatregelRij}>
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
                      {slots.map((slot, i) => {
                        const gekozenAlternatief = alternatieven.find(
                          (ander) => slot.soort === 'kandidaten' && slot.sleutels.has(ander.kandidaat.sleutel),
                        );
                        return (
                          <td key={i} className={styles.checkCel}>
                            <input
                              type="checkbox"
                              checked={slot.soort === 'kandidaten' && slot.sleutels.has(k.kandidaat.sleutel)}
                              disabled={gekozenAlternatief !== undefined}
                              onChange={() => onToggle(i, k.kandidaat.sleutel)}
                              aria-label={`${k.kandidaat.omschrijving} in ${slot.naam}`}
                              title={
                                gekozenAlternatief
                                  ? `Kies eerst "${gekozenAlternatief.maatregel.id}" hierboven/onder uit — dit zijn alternatieven voor dezelfde plek.`
                                  : slot.soort === 'handmatig'
                                    ? 'Dit scenario is handmatig bewerkt — aanvinken zet het terug naar losse maatregelen.'
                                    : slot.soort === 'energielabel'
                                      ? 'Dit scenario is een energielabel-wisseling — aanvinken zet het terug naar losse maatregelen.'
                                      : alternatieven.length > 0
                                        ? 'Alternatieven voor dezelfde plek — kies er hoogstens één.'
                                        : undefined
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
