'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { berekenEindtelling, pandWaarderingVan, voerControlesUit, type PandInvoer } from '@wwso/engine';
import type { Tarievenset } from '@wwso/data';
import { HomeLogo } from '../HomeLogo';
import { KamerRij } from './KamerRij';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { puntenrapportBestandsnaam } from '../../lib/pdf/bestandsnaam';
import { formateerDatum } from '../../lib/datum';
import styles from './styles.module.css';

function formateerEuro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

/**
 * Resultaatscherm (taak 13) — bewust prop-driven, niet route-gekoppeld: `pand` komt van buitenaf
 * binnen, zodat taak 14 (scenariovergelijking) dit component meerdere keren naast elkaar kan
 * renderen (as-is + tot drie scenario's) zonder duplicatie.
 */
export function Resultaatscherm({
  pand,
  tarievenset,
  peildatum,
  titel,
  terugUrl = '/pand/vergelijking',
}: {
  pand: PandInvoer;
  tarievenset: Tarievenset;
  peildatum: string;
  titel?: string;
  /**
   * URL voor "Vergelijk scenario's →". Zonder `?deal=<id>` (de default) valt /pand/vergelijking
   * terug op een sessionStorage-restje i.p.v. de deal opnieuw uit Supabase te halen — dat restje
   * kan het zojuist bekeken SCENARIO-pand bevatten, wat dan abusievelijk als AS-IS verschijnt en
   * een niet-opgeslagen scenario-wijziging (bijv. een handmatig toegevoegde kamer) laat verdwijnen
   * zodra je nadien via een correcte ?deal=-link terugkeert. Zelfde bugklasse als de Topbar-fix
   * van 2026-08-22, hier gemist omdat Resultaatscherm nooit de dealId doorkreeg.
   */
  terugUrl?: string;
}) {
  const eindtelling = useMemo(() => berekenEindtelling(pand, tarievenset, peildatum), [pand, tarievenset, peildatum]);
  const waardering = useMemo(() => pandWaarderingVan(eindtelling), [eindtelling]);
  const controles = useMemo(() => voerControlesUit(pand), [pand]);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'bezig' | 'fout'>('idle');
  useDocumentTitle(`${titel ?? pand.pand.adres} · Resultaat · WWSO Scenario App`);

  const kamers = Object.keys(eindtelling.perKamer)
    .map(Number)
    .sort((a, b) => a - b);

  async function downloadPdf() {
    setPdfStatus('bezig');
    try {
      const [{ pdf }, { PuntenrapportDocument }] = await Promise.all([import('@react-pdf/renderer'), import('../../lib/pdf/PuntenrapportDocument')]);
      const blob = await pdf(
        <PuntenrapportDocument pand={pand} eindtelling={eindtelling} controles={controles} tarievensetPeildatum={peildatum} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = puntenrapportBestandsnaam(pand, peildatum);
      link.click();
      URL.revokeObjectURL(url);
      setPdfStatus('idle');
    } catch {
      setPdfStatus('fout');
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.kop}>
        <HomeLogo />
        <h1>{titel ?? pand.pand.adres}</h1>
        <span className={styles.kopSub}>
          {pand.pand.stad} · {pand.pand.aantalKamers} kamers · peildatum {formateerDatum(peildatum)}
        </span>
        <button type="button" className={styles.pdfKnop} onClick={downloadPdf} disabled={pdfStatus === 'bezig'}>
          {pdfStatus === 'bezig' ? 'PDF maken…' : 'PDF downloaden'}
        </button>
        {pdfStatus === 'fout' && <span className={styles.pdfFout}>PDF maken mislukt, probeer opnieuw</span>}
        <Link href={terugUrl} className={styles.vergelijkLink}>
          Vergelijk scenario&apos;s →
        </Link>
      </header>
      <main className={styles.main}>
        <section className={styles.totalenBlok}>
          <div className={styles.totalenCel}>
            <span className={styles.totalenLabel}>Totaal maandhuur</span>
            <span className={styles.totalenWaarde}>{formateerEuro(waardering.brutoJaarhuurEuro / 12)}</span>
          </div>
          <div className={styles.totalenCel}>
            <span className={styles.totalenLabel}>Totaal jaarhuur</span>
            <span className={styles.totalenWaarde}>{formateerEuro(waardering.brutoJaarhuurEuro)}</span>
          </div>
        </section>
        <section className={styles.blok}>
          <div className={styles.blokKop}>
            <h2>Punten en huurprijs per kamer</h2>
          </div>
          <div className={styles.blokInhoud}>
            {kamers.map((kamer) => (
              <KamerRij
                key={kamer}
                kamer={kamer}
                resultaat={eindtelling.perKamer[kamer]}
                pand={pand}
                rubriekToelichting={eindtelling.rubriekToelichting}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
