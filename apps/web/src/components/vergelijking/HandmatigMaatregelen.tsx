'use client';

import { Fragment } from 'react';
import type { KandidaatWaardering } from '@wwso/engine';
import { groepeerPerRubriek } from '../../lib/vergelijking/rubriek-groepering';
import { formateerEuro } from '../../lib/vergelijking/formatteren';
import { alternatiefGroepSleutel } from '../../lib/vergelijking/scenario-bouw';
import { InfoBadge } from '../InfoBadge';
import styles from './styles.module.css';

const VERGUNNING_LABEL: Record<string, string> = {
  'mogelijk-melding': 'melding',
  vergunning: 'vergunning',
};

/**
 * Optimalisaties voor ÉÉN scenario-tabblad (sinds 2026-09-05 het uniforme pad voor elk scenario,
 * niet meer alleen voor een handmatig bewerkte kamer — zie `useScenarioPakket.ts`'s doc-comment
 * voor de aanleiding). De kandidatenlijst is altijd berekend tegen HET PAND VAN DIT SCENARIO
 * (`slot.pand`, gelijk aan de as-is zolang er geen kamers bewerkt zijn), dus een net toegevoegde
 * kamer levert hier meteen z'n eigen kandidaten op (bijv. een kitchenette in die kamer) — iets
 * wat een gedeelde, alleen-tegen-de-as-is-berekende lijst nooit had kunnen tonen.
 *
 * De handmatige investering (het kosten-veld voor een eventuele herindeling zelf, waar geen
 * catalogusprijs voor bestaat) staat hier los van de maatregelkosten — samen tellen ze op tot de
 * Investering die in `SamenvattingRij` verschijnt zodra dit scenario geen "onbekend" meer is.
 *
 * De "Prijs (€)"-kolom (Tussenfase-taak D, 2026-09-04) is een overschrijfbaar prijsveld per
 * maatregel, voorgevuld met de catalogusprijs — bij het vergelijken van twee scenario's met deels
 * overlappende maatregelen maakt dit zichtbaar WELKE maatregel een investeringsverschil
 * veroorzaakt, niet alleen dát de totale investering verschilt.
 */
export function HandmatigMaatregelen({
  slotNaam,
  kandidaten,
  geselecteerd,
  handmatigeInvesteringEuro,
  maatregelPrijzenEuro,
  onToggle,
  onInvesteringWijzig,
  onPrijsWijzig,
}: {
  slotNaam: string;
  kandidaten: readonly KandidaatWaardering[];
  geselecteerd: ReadonlySet<string>;
  handmatigeInvesteringEuro: number;
  /** Per-maatregel prijsoverschrijving (Tussenfase-taak D) — sleutels zonder eigen entry tonen de
   * catalogusprijs als startpunt. */
  maatregelPrijzenEuro: Readonly<Record<string, number>>;
  onToggle: (sleutel: string) => void;
  onInvesteringWijzig: (euro: number) => void;
  onPrijsWijzig: (sleutel: string, euro: number) => void;
}) {
  const groepen = groepeerPerRubriek(kandidaten);

  return (
    <section>
      <div className={styles.blokKop}>
        <h2>Optimalisaties</h2>
        <label className={styles.handmatigInvesteringVeld}>
          Investering herindeling (€)
          <InfoBadge>
            De kamer/herindeling zelf heeft geen catalogusprijs — vul die investering hieronder zelf in. Maatregelen die je hier aanvinkt (bijv. airco of een
            kitchenette in de nieuwe kamer) tellen met hun échte kosten mee bovenop dat bedrag (plus de energielabel-kostenschatting, als dit scenario ook
            een labelwisseling bevat).
          </InfoBadge>
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
                <th>Prijs (€)</th>
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
                  {groep.kandidaten.map((k) => {
                    const groepSleutel = alternatiefGroepSleutel(k);
                    const alternatieven = groepSleutel
                      ? groep.kandidaten.filter((ander) => ander !== k && alternatiefGroepSleutel(ander) === groepSleutel)
                      : [];
                    const gekozenAlternatief = alternatieven.find((ander) => geselecteerd.has(ander.kandidaat.sleutel));
                    return (
                      <tr
                        key={k.kandidaat.sleutel}
                        className={alternatieven.length > 0 ? `${styles.maatregelRij} ${styles.alternatiefRij}` : styles.maatregelRij}
                      >
                        <td className={styles.maatregelOmschrijving}>
                          <span className={styles.maatregelId}>{k.maatregel.id}</span>
                          {k.kandidaat.omschrijving}
                          {VERGUNNING_LABEL[k.vergunningKlasse] && (
                            <span className={styles.vergunningBadge}>
                              {VERGUNNING_LABEL[k.vergunningKlasse]}
                              <InfoBadge>{k.maatregel.vergunningOfMelding}</InfoBadge>
                            </span>
                          )}
                        </td>
                        <td className={styles.tvtCel}>+{formateerEuro(k.extraJaarhuurEuro)}</td>
                        <td className={styles.tvtCel}>
                          <input
                            type="number"
                            min={0}
                            step={50}
                            value={maatregelPrijzenEuro[k.kandidaat.sleutel] ?? k.investeringEuro.verwacht}
                            onChange={(e) => onPrijsWijzig(k.kandidaat.sleutel, e.target.value === '' ? 0 : Number(e.target.value))}
                            aria-label={`Prijs voor ${k.kandidaat.omschrijving} in ${slotNaam}`}
                            className={styles.maatregelPrijsVeld}
                          />
                        </td>
                        <td className={styles.tvtCel}>
                          {k.terugverdientijdJaren ? `${k.terugverdientijdJaren.verwacht.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} jr` : '—'}
                        </td>
                        <td className={styles.checkCel}>
                          <input
                            type="checkbox"
                            checked={geselecteerd.has(k.kandidaat.sleutel)}
                            disabled={gekozenAlternatief !== undefined}
                            onChange={() => onToggle(k.kandidaat.sleutel)}
                            aria-label={`${k.kandidaat.omschrijving} toepassen in ${slotNaam}`}
                            title={
                              gekozenAlternatief
                                ? `Kies eerst "${gekozenAlternatief.maatregel.id}" uit — dit zijn alternatieven voor dezelfde plek.`
                                : alternatieven.length > 0
                                  ? 'Alternatieven voor dezelfde plek — kies er hoogstens één.'
                                  : undefined
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
