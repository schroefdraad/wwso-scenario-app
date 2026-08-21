'use client';

import { ToiletType, type Keuken, type SanitairVoorziening } from '@wwso/engine';
import { useEffect, type ReactNode } from 'react';
import { useInvoer } from './InvoerContext';
import { useLade, type LadeSegment } from './LadeContext';
import { Toggle } from './Toggle';
import { nieuweKeuken, nieuwSanitair } from './ladeDefaults';
import styles from './styles.module.css';
import type { RuimteRij } from '../../lib/invoer/types';

const KEUKEN_BASISEISEN: [keyof Keuken['basiseisen'], string][] = [
  ['aanEnAfvoerWater', 'Aan- en afvoer water'],
  ['vastKookaansluitpunt', 'Vast kookaansluitpunt'],
  ['aanrechtbladMinimaal1MeterInEenStuk', 'Aanrechtblad ≥ 1 m in één stuk'],
  ['tweeInbouwkastenVan50Cm', 'Twee inbouwkasten van 50 cm'],
  ['waterdichteWandafwerking', 'Waterdichte wandafwerking'],
];

const SANITAIR_EISEN: [keyof SanitairVoorziening['extraEisen'], string][] = [
  ['waterdichteVloerafwerking', 'Waterdichte vloerafwerking'],
  ['vrijeHoogte2MeterOverHelft', 'Vrije hoogte 2,00 m over ≥ 50%'],
  ['waterdichteWandafwerking', 'Waterdichte wandafwerking'],
  ['wastafelMetMengkraanEnSpiegel', 'Wastafel met mengkraan en spiegel'],
  ['doucheOfBadMetWarmEnKoudWater', 'Douche/bad met warm én koud water'],
];

export function RuimteLade() {
  const { state } = useInvoer();
  const { lade, sluit, zetSegment } = useLade();
  const rij = state.ruimtes.find((r) => r.id === lade.ruimteId);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') sluit();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sluit]);

  if (!rij) return null;

  const segmenten: { key: LadeSegment; label: string; aan: boolean }[] = [
    { key: 'keuken', label: 'Keuken', aan: !!rij.keuken },
    { key: 'sanitair', label: 'Sanitair', aan: !!rij.sanitair },
    { key: 'parkeerplek', label: 'Parkeerplek', aan: !!rij.parkeerplek },
    { key: 'zolder', label: 'Zolder', aan: !!rij.zolder },
  ];

  return (
    <>
      <div className={styles.scrim} onClick={sluit} />
      <div className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="drawer-titel">
        <div className={styles.drawerKop}>
          <div>
            <h3 id="drawer-titel">
              Ruimte {rij.nr} · {rij.naam || '(naamloos)'}
            </h3>
            <div className={styles.sub}>
              {rij.type} · {rij.oppervlakteM2 || '0'} m²
            </div>
          </div>
          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`} onClick={sluit}>
            Esc ✕
          </button>
        </div>
        <div className={styles.drawerBody}>
          <div className={styles.segmenten}>
            {segmenten.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`${styles.segmentBtn} ${s.aan ? styles.segmentBtnAan : ''} ${lade.segment === s.key ? styles.segmentBtnActief : ''}`}
                onClick={() => zetSegment(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {lade.segment === 'keuken' && <KeukenPanel rij={rij} />}
          {lade.segment === 'sanitair' && <SanitairPanel rij={rij} />}
          {lade.segment === 'parkeerplek' && <ParkeerplekPanel rij={rij} />}
          {lade.segment === 'zolder' && <ZolderPanel rij={rij} />}
        </div>
        <div className={styles.drawerFooter}>
          <button type="button" className={`${styles.btn} ${styles.btnPrimair}`} onClick={sluit}>
            Klaar
          </button>
        </div>
      </div>
    </>
  );
}

function KeukenPanel({ rij }: { rij: RuimteRij }) {
  const { dispatch } = useInvoer();
  const keuken = rij.keuken;
  const zetKeuken = (patch: Partial<Omit<Keuken, 'ruimteNr'>>) =>
    dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { keuken: keuken ? { ...keuken, ...patch } : undefined } });

  if (!keuken) {
    return (
      <div className={styles.veldrij}>
        <label>Keuken aanwezig</label>
        <Toggle
          checked={false}
          label="Keuken aanwezig"
          onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { keuken: v ? nieuweKeuken() : undefined } })}
        />
      </div>
    );
  }

  const alleEisen = KEUKEN_BASISEISEN.every(([k]) => keuken.basiseisen[k]);
  const extraAantal = Object.entries(keuken.extra).filter(([, v]) => (typeof v === 'boolean' ? v : Number(v) > 0)).length;

  return (
    <div>
      <div className={styles.veldrij}>
        <label>Keuken aanwezig</label>
        <Toggle checked label="Keuken aanwezig" onChange={(v) => !v && dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { keuken: undefined } })} />
      </div>
      <div className={styles.veldrij}>
        <label htmlFor="k-aanrecht">Aanrechtlengte (m)</label>
        <input
          id="k-aanrecht"
          type="number"
          step="0.1"
          min={0}
          value={keuken.aanrechtlengteM}
          onChange={(e) => zetKeuken({ aanrechtlengteM: Number(e.target.value) || 0 })}
        />
      </div>

      <div className={styles.poortBlok}>
        <div className={styles.poortMaster}>
          <input
            type="checkbox"
            id="k-master"
            checked={alleEisen}
            onChange={(e) => {
              const waarde = e.target.checked;
              zetKeuken({ basiseisen: Object.fromEntries(KEUKEN_BASISEISEN.map(([k]) => [k, waarde])) as Keuken['basiseisen'] });
            }}
          />
          <label htmlFor="k-master">Voldoet aan alle vijf de basiseisen (§2.5.1)</label>
        </div>
        {KEUKEN_BASISEISEN.map(([key, label]) => (
          <div className={styles.poortEis} key={key}>
            <input
              type="checkbox"
              id={`k-eis-${key}`}
              checked={keuken.basiseisen[key]}
              onChange={(e) => zetKeuken({ basiseisen: { ...keuken.basiseisen, [key]: e.target.checked } })}
            />
            <label htmlFor={`k-eis-${key}`}>{label}</label>
          </div>
        ))}
        <div className={`${styles.poortStatus} ${alleEisen ? styles.poortStatusOk : styles.poortStatusFout}`}>
          {alleEisen
            ? '✓ Voldoet. De extra voorzieningen hieronder tellen mee.'
            : '✕ Voldoet niet aan §2.5.1. Deze keuken levert 0 punten — ook de extra voorzieningen hieronder tellen dan niet mee.'}
        </div>
      </div>

      <div className={alleEisen ? undefined : styles.extraBlokDim}>
        <ExtraGroep titel="Kookplaat">
          <ExtraCheck label="Inductie" checked={keuken.extra.kookplaatInductie} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, kookplaatInductie: v } })} />
          <ExtraCheck label="Keramisch" checked={keuken.extra.kookplaatKeramisch} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, kookplaatKeramisch: v } })} />
          <ExtraCheck label="Gas" checked={keuken.extra.kookplaatGas} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, kookplaatGas: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Koelen en vriezen">
          <ExtraCheck label="Koelkast" checked={keuken.extra.koelkast} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, koelkast: v } })} />
          <ExtraCheck label="Vrieskast" checked={keuken.extra.vrieskast} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, vrieskast: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Oven en magnetron">
          <ExtraCheck label="Oven elektrisch" checked={keuken.extra.ovenElektrisch} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, ovenElektrisch: v } })} />
          <ExtraCheck label="Oven gas" checked={keuken.extra.ovenGas} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, ovenGas: v } })} />
          <ExtraCheck label="Magnetron" checked={keuken.extra.magnetron} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, magnetron: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Overige apparatuur">
          <ExtraCheck label="Afzuiginstallatie" checked={keuken.extra.afzuiginstallatie} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, afzuiginstallatie: v } })} />
          <ExtraCheck label="Vaatwasmachine" checked={keuken.extra.vaatwasmachine} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, vaatwasmachine: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Kranen">
          <ExtraCheck label="Eenhandsmengkraan" checked={keuken.extra.eenhandsmengkraan} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, eenhandsmengkraan: v } })} />
          <ExtraCheck label="Thermostatische mengkraan" checked={keuken.extra.thermostatischeMengkraan} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, thermostatischeMengkraan: v } })} />
          <ExtraCheck label="Kokendwaterfunctie" checked={keuken.extra.kokendWaterfunctie} onChange={(v) => zetKeuken({ extra: { ...keuken.extra, kokendWaterfunctie: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Kastruimte">
          <div className={styles.extraRij}>
            <label>Extra eenheden van 60 cm (boven het minimum van 1 m)</label>
            <input
              type="number"
              min={0}
              style={{ width: '4rem' }}
              value={keuken.extra.extraKastruimteEenhedenVan60Cm}
              onChange={(e) => zetKeuken({ extra: { ...keuken.extra, extraKastruimteEenhedenVan60Cm: Number(e.target.value) || 0 } })}
            />
          </div>
        </ExtraGroep>
        <div className={styles.extraCount}>{extraAantal} extra voorziening(en) geselecteerd</div>
      </div>
    </div>
  );
}

function SanitairPanel({ rij }: { rij: RuimteRij }) {
  const { dispatch } = useInvoer();
  const sanitair = rij.sanitair;
  const zetSanitair = (patch: Partial<Omit<SanitairVoorziening, 'ruimteNr'>>) =>
    dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { sanitair: sanitair ? { ...sanitair, ...patch } : undefined } });

  if (!sanitair) {
    return (
      <div className={styles.veldrij}>
        <label>Sanitair aanwezig</label>
        <Toggle
          checked={false}
          label="Sanitair aanwezig"
          onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { sanitair: v ? nieuwSanitair() : undefined } })}
        />
      </div>
    );
  }

  const alleEisen = SANITAIR_EISEN.every(([k]) => sanitair.extraEisen[k]);
  const extraAantal = Object.entries(sanitair.extra).filter(([, v]) => (typeof v === 'boolean' ? v : Number(v) > 0)).length;

  return (
    <div>
      <div className={styles.veldrij}>
        <label>Sanitair aanwezig</label>
        <Toggle checked label="Sanitair aanwezig" onChange={(v) => !v && dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { sanitair: undefined } })} />
      </div>
      <div className={styles.veldrij}>
        <label htmlFor="s-toilet">Toilettype</label>
        <select id="s-toilet" value={sanitair.toiletType} onChange={(e) => zetSanitair({ toiletType: e.target.value as SanitairVoorziening['toiletType'] })}>
          {ToiletType.options.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.veldrij}>
        <label htmlFor="s-wastafels">Aantal wastafels</label>
        <input id="s-wastafels" type="number" min={0} value={sanitair.aantalWastafels} onChange={(e) => zetSanitair({ aantalWastafels: Number(e.target.value) || 0 })} />
      </div>
      <div className={styles.veldrij}>
        <label htmlFor="s-meerpersoons">Meerpersoonswastafels</label>
        <input
          id="s-meerpersoons"
          type="number"
          min={0}
          value={sanitair.aantalMeerpersoonswastafels}
          onChange={(e) => zetSanitair({ aantalMeerpersoonswastafels: Number(e.target.value) || 0 })}
        />
      </div>
      <div className={styles.veldrij}>
        <label>Douche / bad</label>
        <span style={{ display: 'flex', gap: '1rem' }}>
          <label>
            <input type="checkbox" checked={sanitair.douche} disabled={sanitair.badDoucheCombinatie} onChange={(e) => zetSanitair({ douche: e.target.checked })} /> Douche
          </label>
          <label>
            <input type="checkbox" checked={sanitair.bad} disabled={sanitair.badDoucheCombinatie} onChange={(e) => zetSanitair({ bad: e.target.checked })} /> Bad
          </label>
          <label>
            <input
              type="checkbox"
              checked={sanitair.badDoucheCombinatie}
              onChange={(e) => zetSanitair({ badDoucheCombinatie: e.target.checked, ...(e.target.checked ? { douche: false, bad: false } : {}) })}
            />{' '}
            Combinatie
          </label>
        </span>
      </div>

      <div className={styles.poortBlok}>
        <div className={styles.poortMaster}>
          <input
            type="checkbox"
            id="s-master"
            checked={alleEisen}
            onChange={(e) => {
              const waarde = e.target.checked;
              zetSanitair({ extraEisen: Object.fromEntries(SANITAIR_EISEN.map(([k]) => [k, waarde])) as SanitairVoorziening['extraEisen'] });
            }}
          />
          <label htmlFor="s-master">Voldoet aan alle vijf de extra-eisen (§2.6.2)</label>
        </div>
        {SANITAIR_EISEN.map(([key, label]) => (
          <div className={styles.poortEis} key={key}>
            <input
              type="checkbox"
              id={`s-eis-${key}`}
              checked={sanitair.extraEisen[key]}
              onChange={(e) => zetSanitair({ extraEisen: { ...sanitair.extraEisen, [key]: e.target.checked } })}
            />
            <label htmlFor={`s-eis-${key}`}>{label}</label>
          </div>
        ))}
        <div className={`${styles.poortStatus} ${alleEisen ? styles.poortStatusOk : styles.poortStatusFout}`}>
          {alleEisen
            ? '✓ Voldoet. De extra voorzieningen hieronder tellen mee.'
            : '✕ Voldoet niet. De basispunten voor toilet, wastafel en douche/bad blijven staan; de extra voorzieningen hieronder tellen niet mee.'}
        </div>
      </div>

      <div className={alleEisen ? undefined : styles.extraBlokDim}>
        <ExtraGroep titel="Douche en bad">
          <ExtraCheck label="Volledige doucheafscheiding" checked={sanitair.extra.doucheafscheidingVolledig} onChange={(v) => zetSanitair({ extra: { ...sanitair.extra, doucheafscheidingVolledig: v } })} />
          <ExtraCheck label="Bubbelfunctie bad" checked={sanitair.extra.bubbelfunctieBad} onChange={(v) => zetSanitair({ extra: { ...sanitair.extra, bubbelfunctieBad: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Comfort">
          <div className={styles.extraRij}>
            <label>Handdoekenradiatoren</label>
            <input
              type="number"
              min={0}
              style={{ width: '4rem' }}
              value={sanitair.extra.aantalHanddoekenradiatoren}
              onChange={(e) => zetSanitair({ extra: { ...sanitair.extra, aantalHanddoekenradiatoren: Number(e.target.value) || 0 } })}
            />
          </div>
          <div className={styles.extraRij}>
            <label>Stopcontacten (max. 2 per wastafel)</label>
            <input
              type="number"
              min={0}
              style={{ width: '4rem' }}
              value={sanitair.extra.aantalStopcontacten}
              onChange={(e) => zetSanitair({ extra: { ...sanitair.extra, aantalStopcontacten: Number(e.target.value) || 0 } })}
            />
          </div>
          <ExtraCheck label="Ingebouwd kastje bij wastafel" checked={sanitair.extra.ingebouwdKastjeMetWastafel} onChange={(v) => zetSanitair({ extra: { ...sanitair.extra, ingebouwdKastjeMetWastafel: v } })} />
          <ExtraCheck label="Kastruimte ≥ 40×40 cm" checked={sanitair.extra.kastruimte} onChange={(v) => zetSanitair({ extra: { ...sanitair.extra, kastruimte: v } })} />
        </ExtraGroep>
        <ExtraGroep titel="Kranen">
          <ExtraCheck label="Eenhandsmengkraan" checked={sanitair.extra.eenhandsmengkraan} onChange={(v) => zetSanitair({ extra: { ...sanitair.extra, eenhandsmengkraan: v } })} />
          <ExtraCheck label="Thermostatische mengkraan" checked={sanitair.extra.thermostatischeMengkraan} onChange={(v) => zetSanitair({ extra: { ...sanitair.extra, thermostatischeMengkraan: v } })} />
        </ExtraGroep>
        <div className={styles.extraCount}>{extraAantal} extra voorziening(en) geselecteerd</div>
      </div>
    </div>
  );
}

function ParkeerplekPanel({ rij }: { rij: RuimteRij }) {
  const { dispatch } = useInvoer();
  const parkeerplek = rij.parkeerplek;

  if (!parkeerplek) {
    return (
      <div className={styles.veldrij}>
        <label>Parkeerplek aanwezig</label>
        <Toggle
          checked={false}
          label="Parkeerplek aanwezig"
          onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { parkeerplek: v ? { type: 'II', laadpaal: false } : undefined } })}
        />
      </div>
    );
  }
  return (
    <div>
      <div className={styles.veldrij}>
        <label>Parkeerplek aanwezig</label>
        <Toggle checked label="Parkeerplek aanwezig" onChange={(v) => !v && dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { parkeerplek: undefined } })} />
      </div>
      <div className={styles.veldrij}>
        <label htmlFor="pk-type">Type</label>
        <select
          id="pk-type"
          value={parkeerplek.type}
          onChange={(e) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { parkeerplek: { ...parkeerplek, type: e.target.value as 'I' | 'II' | 'III' } } })}
        >
          <option value="I">I — 9 punten</option>
          <option value="II">II — 6 punten</option>
          <option value="III">III — 4 punten</option>
        </select>
      </div>
      <div className={styles.veldrij}>
        <label>Laadpaal</label>
        <Toggle
          checked={parkeerplek.laadpaal}
          label="Laadpaal"
          onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { parkeerplek: { ...parkeerplek, laadpaal: v } } })}
        />
        <span className={styles.hint}>+2 pt, alleen gedeeld door adressen (§2.10.5)</span>
      </div>
    </div>
  );
}

function ZolderPanel({ rij }: { rij: RuimteRij }) {
  const { dispatch } = useInvoer();
  const zolder = rij.zolder;

  if (!zolder) {
    return (
      <div className={styles.veldrij}>
        <label>Dit is een zolderruimte</label>
        <Toggle
          checked={false}
          label="Zolderruimte"
          onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { zolder: v ? { vasteTrap: false, beschotenDak: false } : undefined } })}
        />
      </div>
    );
  }
  const isVertrek = rij.type === 'Privévertrek';
  const hint =
    isVertrek && !(zolder.vasteTrap && zolder.beschotenDak)
      ? "Een zolder telt alleen als vertrek bij een vaste trap én een beschoten dak (§2.2.1.3). Overweeg het type 'Overige ruimte'."
      : !isVertrek && !zolder.vasteTrap
        ? 'Levert 5 aftrekpunten op (§2.2.2.3), begrensd op de waarde van de zolder zelf.'
        : '';
  return (
    <div>
      <div className={styles.veldrij}>
        <label>Dit is een zolderruimte</label>
        <Toggle checked label="Zolderruimte" onChange={(v) => !v && dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { zolder: undefined } })} />
      </div>
      <div className={styles.veldrij}>
        <label>Vaste trap</label>
        <Toggle checked={zolder.vasteTrap} label="Vaste trap" onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { zolder: { ...zolder, vasteTrap: v } } })} />
      </div>
      <div className={styles.veldrij}>
        <label>Beschoten dak</label>
        <Toggle checked={zolder.beschotenDak} label="Beschoten dak" onChange={(v) => dispatch({ soort: 'RUIMTE_GEWIJZIGD', id: rij.id, patch: { zolder: { ...zolder, beschotenDak: v } } })} />
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

function ExtraGroep({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className={styles.extraGroep}>
      <h4>{titel}</h4>
      {children}
    </div>
  );
}

function ExtraCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={styles.extraRij}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} id={`chk-${label}`} />
      <label htmlFor={`chk-${label}`}>{label}</label>
    </div>
  );
}
