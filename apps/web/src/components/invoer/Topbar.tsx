'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { alleTarievensets, nieuwsteKostencatalogus } from '@wwso/data';
import { huidigeVersiestempel } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { ontbrekendeStap, projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';
import { PuntenStrip } from './PuntenStrip';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { slaScenarioBewerkResultaatOp } from '../../lib/vergelijking/scenarioBewerkBrug';
import { maakDealAan, werkDealBij } from '../../lib/deals/opslag';
import styles from './styles.module.css';

export function Topbar() {
  const { state, dispatch } = useInvoer();
  const router = useRouter();
  const stap = useMemo(() => ontbrekendeStap(state), [state]);
  const pand = useMemo(() => projecteerNaarPandInvoer(state), [state]);
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  const [dealOpslaanStatus, setDealOpslaanStatus] = useState<'idle' | 'bezig' | 'gelukt' | 'fout'>('idle');

  async function dealVroegOpslaan() {
    if (!pand) return;
    setDealOpslaanStatus('bezig');
    try {
      const tarievenset = alleTarievensets().at(-1)!;
      const kostencatalogus = nieuwsteKostencatalogus();
      const invoer = {
        naam: state.bewerktDeal?.naam ?? (pand.pand.adres || 'Naamloos pand'),
        notitie: state.bewerktDeal?.notitie ?? '',
        map: state.bewerktDeal?.map ?? '',
        pandInvoer: pand,
        scenarios: state.bewerktDeal?.scenarios ?? [],
        versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
      };
      const deal = state.bewerktDeal ? await werkDealBij(state.bewerktDeal.id, invoer) : await maakDealAan(invoer);
      dispatch({ soort: 'DEAL_GEKOPPELD', deal: { id: deal.id, naam: deal.naam, notitie: deal.notitie, map: deal.map, scenarios: deal.scenarios } });
      setDealOpslaanStatus('gelukt');
    } catch {
      setDealOpslaanStatus('fout');
    }
  }

  const pandCompleet = !!(
    state.pand.adres &&
    state.pand.stad &&
    state.pand.coropGebied &&
    state.pand.wozOppervlak &&
    state.pand.bouwjaar
  );

  return (
    <header className={styles.topbar}>
      <span className={styles.titel}>🏠 {state.pand.adres || 'Nieuw pand'}</span>
      <span className={styles.sub}>
        {n} kamer{n === 1 ? '' : 's'}
      </span>
      {state.bewerktDeal && <span className={styles.sub}>· bewerkt deal &ldquo;{state.bewerktDeal.naam}&rdquo;</span>}
      {state.handmatigScenario && <span className={styles.sub}>· scenario &ldquo;{state.handmatigScenario.naam}&rdquo;</span>}
      <nav className={styles.sections}>
        <a className={styles.sectionLink} href="#sectie-pand">
          ① Pand <span className={`${styles.badge} ${pandCompleet ? styles.badgeOk : ''}`}>{pandCompleet ? '✓' : '…'}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-ruimten">
          ② Ruimten <span className={`${styles.badge} ${state.ruimtes.length > 0 ? styles.badgeOk : ''}`}>{state.ruimtes.length}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-overig">
          ③ Overige posten <span className={`${styles.badge} ${styles.badgeOk}`}>✓</span>
        </a>
      </nav>
      <div className={styles.spacer} />
      <Link href="/deals" className={styles.sectionLink}>
        Mijn deals
      </Link>
      {!state.handmatigScenario && (
        <>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`}
            disabled={!pand || dealOpslaanStatus === 'bezig'}
            title={!pand ? (stap ?? undefined) : undefined}
            onClick={dealVroegOpslaan}
          >
            {state.bewerktDeal ? 'Deal bijwerken' : 'Deal opslaan'}
          </button>
          {dealOpslaanStatus === 'gelukt' && <span className={styles.sub}>Opgeslagen ✓</span>}
          {dealOpslaanStatus === 'fout' && <span className={styles.sub}>Opslaan mislukt</span>}
        </>
      )}
      <PuntenStrip />
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimair}`}
        disabled={!pand}
        title={stap ?? undefined}
        onClick={() => {
          if (!pand) return;
          if (state.handmatigScenario) {
            slaScenarioBewerkResultaatOp({ slotIndex: state.handmatigScenario.slotIndex, bewerktPand: pand });
            router.push(state.handmatigScenario.terugUrl);
            return;
          }
          slaPandOp({
            pand,
            dealId: state.bewerktDeal?.id,
            dealNaam: state.bewerktDeal?.naam,
            dealNotitie: state.bewerktDeal?.notitie,
            dealMap: state.bewerktDeal?.map,
            dealScenarios: state.bewerktDeal?.scenarios,
          });
          router.push('/pand/resultaat');
        }}
      >
        {state.handmatigScenario ? 'Gebruik als scenario →' : 'Doorrekenen →'}
      </button>
      {state.ruimtes.length > 0 && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`}
          onClick={() => {
            if (confirm('Alle ingevoerde gegevens wissen?')) dispatch({ soort: 'ALLES_GEWIST' });
          }}
        >
          Alles wissen
        </button>
      )}
    </header>
  );
}
