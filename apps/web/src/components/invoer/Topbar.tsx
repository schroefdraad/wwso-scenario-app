'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { alleTarievensets, nieuwsteKostencatalogus } from '@wwso/data';
import { huidigeVersiestempel } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { HomeLogo } from '../HomeLogo';
import { ontbrekendeStap, projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { slaScenarioBewerkResultaatOp } from '../../lib/vergelijking/scenarioBewerkBrug';
import { maakDealAan, werkDealBij } from '../../lib/deals/opslag';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './styles.module.css';

export function Topbar() {
  const { state, dispatch } = useInvoer();
  const router = useRouter();
  const stap = useMemo(() => ontbrekendeStap(state), [state]);
  const pand = useMemo(() => projecteerNaarPandInvoer(state), [state]);
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  useDocumentTitle(`${state.pand.adres || 'Nieuwe woning'} · WWSO Scenario App`);
  const [dealOpslaanStatus, setDealOpslaanStatus] = useState<'idle' | 'bezig' | 'gelukt' | 'fout'>('idle');

  /**
   * Gedeelde opslaan-logica achter zowel de "Woning opslaan"-knop als "Doorrekenen →"
   * (backlog 2026-09-08, gemeld via Steven Kramer: "'s-Gravesandestraat 78" was na doorrekenen +
   * PDF downloaden nergens meer te vinden — hij had nooit apart op "Woning opslaan" geklikt, en
   * "Doorrekenen" sloeg tot dan toe alleen naar sessionStorage op, nooit naar Supabase). Geeft de
   * opgeslagen `Deal` terug, of `null` als opslaan mislukte — de aanroeper beslist dan zelf of
   * hij wel/niet verder navigeert (bij een mislukte save NIET wegnavigeren, anders is de invoer
   * alsnog kwijt).
   */
  async function slaWoningOp() {
    if (!pand) return null;
    setDealOpslaanStatus('bezig');
    try {
      const tarievenset = alleTarievensets().at(-1)!;
      const kostencatalogus = nieuwsteKostencatalogus();
      const invoer = {
        naam: state.bewerktDeal?.naam ?? (pand.pand.adres || 'Naamloze woning'),
        notitie: state.notitieOntwerp,
        map: state.bewerktDeal?.map ?? '',
        pandInvoer: pand,
        scenarios: state.bewerktDeal?.scenarios ?? [],
        versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
      };
      const deal = state.bewerktDeal ? await werkDealBij(state.bewerktDeal.id, invoer) : await maakDealAan(invoer);
      dispatch({ soort: 'DEAL_GEKOPPELD', deal: { id: deal.id, naam: deal.naam, notitie: deal.notitie, map: deal.map, scenarios: deal.scenarios } });
      setDealOpslaanStatus('gelukt');
      return deal;
    } catch {
      setDealOpslaanStatus('fout');
      return null;
    }
  }

  async function dealVroegOpslaan() {
    await slaWoningOp();
  }

  /**
   * "Doorrekenen →" slaat de as-is nu altijd eerst op (zie `slaWoningOp` hierboven) vóórdat er
   * naar het resultaatscherm genavigeerd wordt — bij een mislukte save blijft de gebruiker op het
   * invoerscherm staan (met de bestaande "Opslaan mislukt"-melding) i.p.v. door te lopen naar een
   * scherm waarvandaan de invoer alsnog nergens hersteld kan worden. Geldt niet voor "Gebruik als
   * scenario →" (`state.handmatigScenario`): dat pad hoort al bij een bestaande deal via de
   * scenario-bewerk-brug, en slaat daar op zijn eigen moment op (`Vergelijking.tsx`).
   */
  async function doorrekenen() {
    if (!pand) return;
    if (state.handmatigScenario) {
      slaScenarioBewerkResultaatOp({ slotIndex: state.handmatigScenario.slotIndex, bewerktPand: pand });
      router.push(state.handmatigScenario.terugUrl);
      return;
    }
    const deal = await slaWoningOp();
    if (!deal) return;
    slaPandOp({
      pand,
      dealId: deal.id,
      dealNaam: deal.naam,
      dealNotitie: deal.notitie,
      dealMap: deal.map,
      dealScenarios: deal.scenarios,
    });
    router.push('/woning/resultaat');
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
      <HomeLogo />
      <span className={styles.titel}>{state.pand.adres || 'Nieuwe woning'}</span>
      <span className={styles.sub}>
        {n} kamer{n === 1 ? '' : 's'}
      </span>
      {state.bewerktDeal && <span className={styles.sub}>· bewerkt woning &ldquo;{state.bewerktDeal.naam}&rdquo;</span>}
      {state.handmatigScenario && <span className={styles.sub}>· scenario &ldquo;{state.handmatigScenario.naam}&rdquo;</span>}
      <nav className={styles.sections}>
        <a className={styles.sectionLink} href="#sectie-woning">
          ① Woning <span className={`${styles.badge} ${pandCompleet ? styles.badgeOk : ''}`}>{pandCompleet ? '✓' : '…'}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-ruimten">
          ② Ruimten <span className={`${styles.badge} ${state.ruimtes.length > 0 ? styles.badgeOk : ''}`}>{state.ruimtes.length}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-overig">
          ③ Overige posten <span className={`${styles.badge} ${styles.badgeOk}`}>✓</span>
        </a>
      </nav>
      <div className={styles.spacer} />
      <Link href="/woningen" className={styles.sectionLink}>
        Mijn woningen
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
            {state.bewerktDeal ? 'Opslaan' : 'Woning opslaan'}
          </button>
          {dealOpslaanStatus === 'gelukt' && <span className={styles.sub}>Opgeslagen ✓</span>}
          {dealOpslaanStatus === 'fout' && <span className={styles.sub}>Opslaan mislukt</span>}
        </>
      )}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimair}`}
        disabled={!pand || (!state.handmatigScenario && dealOpslaanStatus === 'bezig')}
        title={stap ?? undefined}
        onClick={doorrekenen}
      >
        {state.handmatigScenario ? 'Gebruik als scenario →' : dealOpslaanStatus === 'bezig' ? 'Opslaan…' : 'Doorrekenen →'}
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
