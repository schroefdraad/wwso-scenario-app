'use client';

import { alleTarievensets } from '@wwso/data';
import { Energielabel, MonumentStatus } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { Toggle } from './Toggle';
import styles from './styles.module.css';
import type { PandVeldenState } from '../../lib/invoer/types';

const SOORT_WONING: PandVeldenState['soortWoning'][] = ['Meergezins', 'Eengezins'];
const ENERGIELABELS = Energielabel.options;
const MONUMENTSTATUSSEN = MonumentStatus.options;

/**
 * De WOZ-peildatum is per wet altijd 1 januari van het waarderingsjaar (Wet WOZ) — nooit een
 * andere dag/maand. Een vrije datepicker liet dus onmogelijke datums toe; een jaartallen-select
 * kan dat niet meer. Reikt 15 jaar terug, berekend vanaf het huidige jaar zodat de lijst niet
 * jaarlijks handmatig bijgewerkt hoeft te worden.
 */
const WOZ_PEILDATUM_JAREN = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i);

function labelTekst(label: PandVeldenState['energielabel']): string {
  return label === 'Bouwjaar' ? 'Geen label bekend (val terug op bouwjaar)' : label;
}

export function PandFormulier() {
  const { state, dispatch } = useInvoer();
  const { pand } = state;
  const coropGebieden = alleTarievensets()[alleTarievensets().length - 1]?.coropGebieden ?? [];

  const zet = <K extends keyof PandVeldenState>(veld: K, waarde: PandVeldenState[K]) =>
    dispatch({ soort: 'PAND_VELD_GEWIJZIGD', veld, waarde });

  return (
    <section className={styles.blok} id="sectie-pand">
      <div className={styles.blokKop}>
        <h2>① Pand</h2>
      </div>
      <div className={styles.blokInhoud}>
        <div className={styles.pandGrid}>
          <div className={styles.veld}>
            <label htmlFor="p-adres">Adres</label>
            <input id="p-adres" value={pand.adres} onChange={(e) => zet('adres', e.target.value)} />
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-stad">Stad</label>
            <input id="p-stad" value={pand.stad} onChange={(e) => zet('stad', e.target.value)} />
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-soort">Soort woning</label>
            <select id="p-soort" value={pand.soortWoning} onChange={(e) => zet('soortWoning', e.target.value as PandVeldenState['soortWoning'])}>
              {SOORT_WONING.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.veld} ${styles.veldGate}`}>
            <label htmlFor="p-kamers">Aantal kamers</label>
            <input
              id="p-kamers"
              type="number"
              min={1}
              max={12}
              value={pand.aantalKamers}
              onChange={(e) => zet('aantalKamers', e.target.value)}
            />
            <span className={styles.hint}>Bepaalt de kolommen in de toewijzing hieronder — de poort van dit scherm.</span>
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-woningen">Aantal woningen in complex</label>
            <input
              id="p-woningen"
              type="number"
              min={1}
              value={pand.aantalWoningenInComplex}
              onChange={(e) => zet('aantalWoningenInComplex', e.target.value)}
            />
          </div>

          <div className={styles.veld}>
            <label htmlFor="p-woz">WOZ-waarde (€)</label>
            <input id="p-woz" type="number" min={0} value={pand.wozWaarde} onChange={(e) => zet('wozWaarde', e.target.value)} />
          </div>
          {!pand.wozWaarde && (
            <div className={styles.veld}>
              <label htmlFor="p-taxatie">Taxatiewaarde (€)</label>
              <input
                id="p-taxatie"
                type="number"
                min={0}
                value={pand.taxatiewaardeEuro}
                onChange={(e) => zet('taxatiewaardeEuro', e.target.value)}
              />
              <span className={styles.hint}>Geen WOZ-waarde bekend? De motor rekent dan met 85% van de taxatiewaarde (§2.11.1).</span>
            </div>
          )}
          <div className={styles.veld}>
            <label htmlFor="p-wozpeildatum">WOZ-peildatum</label>
            <select
              id="p-wozpeildatum"
              value={pand.wozPeildatum.slice(0, 4)}
              onChange={(e) => zet('wozPeildatum', e.target.value ? `${e.target.value}-01-01` : '')}
            >
              <option value="">— kies —</option>
              {WOZ_PEILDATUM_JAREN.map((jaar) => (
                <option key={jaar} value={jaar}>
                  1 januari {jaar}
                </option>
              ))}
            </select>
            <span className={styles.hint}>Altijd 1 januari van het waarderingsjaar (Wet WOZ).</span>
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-wozopp">WOZ-oppervlak (m²)</label>
            <input
              id="p-wozopp"
              type="number"
              min={0}
              value={pand.wozOppervlak}
              onChange={(e) => zet('wozOppervlak', e.target.value)}
            />
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-corop">COROP-gebied</label>
            <select id="p-corop" value={pand.coropGebied} onChange={(e) => zet('coropGebied', e.target.value)}>
              <option value="">— kies —</option>
              {coropGebieden.map((c) => (
                <option key={c.gebied} value={c.gebied}>
                  {c.gebied}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.veld}>
            <label htmlFor="p-label">Energielabel</label>
            <select id="p-label" value={pand.energielabel} onChange={(e) => zet('energielabel', e.target.value as PandVeldenState['energielabel'])}>
              {ENERGIELABELS.map((l) => (
                <option key={l} value={l}>
                  {labelTekst(l)}
                </option>
              ))}
            </select>
            {pand.energielabel === 'Bouwjaar' && (
              <span className={styles.hint}>De motor valt terug op de bouwjaargrenzen (R4).</span>
            )}
          </div>
          {pand.energielabel !== 'Bouwjaar' && (
            <div className={styles.veld}>
              <label htmlFor="p-labeldatum">Ingangsdatum label (optioneel)</label>
              <input
                id="p-labeldatum"
                type="date"
                value={pand.energielabelIngangsdatum}
                onChange={(e) => zet('energielabelIngangsdatum', e.target.value)}
              />
              <span className={styles.hint}>
                Onbekend? Laat leeg — de motor valt dan terug op de bouwjaargrenzen (R4), net als bij een vervallen label.
              </span>
            </div>
          )}
          <div className={styles.veld}>
            <label htmlFor="p-label-kosten-aplus">Inschatting kosten label A+ (€)</label>
            <input
              id="p-label-kosten-aplus"
              type="number"
              min={0}
              value={pand.energielabelKostenAPlus}
              onChange={(e) => zet('energielabelKostenAPlus', e.target.value)}
            />
            <span className={styles.hint}>Leeg = niet haalbaar of niet relevant voor dit pand.</span>
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-label-kosten-aplusplus">Inschatting kosten label A++ (€)</label>
            <input
              id="p-label-kosten-aplusplus"
              type="number"
              min={0}
              value={pand.energielabelKostenAPlusPlus}
              onChange={(e) => zet('energielabelKostenAPlusPlus', e.target.value)}
            />
            <span className={styles.hint}>Leeg = niet haalbaar of niet relevant voor dit pand.</span>
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-label-kosten-aplusplusplus">Inschatting kosten label A+++ (€)</label>
            <input
              id="p-label-kosten-aplusplusplus"
              type="number"
              min={0}
              value={pand.energielabelKostenAPlusPlusPlus}
              onChange={(e) => zet('energielabelKostenAPlusPlusPlus', e.target.value)}
            />
            <span className={styles.hint}>Leeg = niet haalbaar of niet relevant voor dit pand.</span>
          </div>
          <div className={styles.veld}>
            <label htmlFor="p-bouwjaar">Bouwjaar</label>
            <input id="p-bouwjaar" type="number" value={pand.bouwjaar} onChange={(e) => zet('bouwjaar', e.target.value)} />
          </div>

          <div className={styles.veld}>
            <label htmlFor="p-monument">Monument</label>
            <select id="p-monument" value={pand.monument} onChange={(e) => zet('monument', e.target.value as PandVeldenState['monument'])}>
              {MONUMENTSTATUSSEN.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {pand.monument === 'Rijks' && (
            <div className={styles.veld}>
              <label htmlFor="p-huurdatum">Datum huurovereenkomst</label>
              <input
                id="p-huurdatum"
                type="date"
                value={pand.huurovereenkomstDatum}
                onChange={(e) => zet('huurovereenkomstDatum', e.target.value)}
              />
              <span className={styles.hint}>Bepaalt of de opslag +35% op de huurprijs is of +10 punten (§2.14.3).</span>
            </div>
          )}
          <div className={styles.veld}>
            <label>Zorgwoning</label>
            <Toggle checked={pand.zorgwoning} onChange={(v) => zet('zorgwoning', v)} label="Zorgwoning" />
            <span className={styles.hint}>+35% op R1 t/m R11 (§2.12.1)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
