'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { InvoerProvider, type InitieelDeal, type InitieelScenario } from '../../../components/invoer/InvoerContext';
import { ToastProvider } from '../../../components/invoer/ToastContext';
import { LadeProvider } from '../../../components/invoer/LadeContext';
import { Topbar } from '../../../components/invoer/Topbar';
import { PandFormulier } from '../../../components/invoer/PandFormulier';
import { RuimteRaster } from '../../../components/invoer/RuimteRaster';
import { OverigePosten } from '../../../components/invoer/OverigePosten';
import { NotitieVeld } from '../../../components/invoer/NotitieVeld';
import { RuimteLade } from '../../../components/invoer/RuimteLade';
import { haalDealOp } from '../../../lib/deals/opslag';
import { haalScenarioBewerkStartOp } from '../../../lib/vergelijking/scenarioBewerkBrug';
import styles from '../../../components/invoer/styles.module.css';

function NieuwPandContent() {
  const zoekParams = useSearchParams();
  const dealParam = zoekParams.get('deal');
  const scenarioParam = zoekParams.get('scenario');
  const [status, setStatus] = useState<'laden' | 'klaar' | 'niet-gevonden'>(dealParam ? 'laden' : 'klaar');
  const [initieelDeal, setInitieelDeal] = useState<InitieelDeal | undefined>(undefined);
  const [initieelScenario, setInitieelScenario] = useState<InitieelScenario | undefined>(undefined);

  // Een deal komt uit Supabase (async, ná hydratie); een scenario komt synchroon uit
  // sessionStorage, maar leest ook pas ná hydratie — effect + setState is hier het juiste
  // primitief, niet een te vermijden anti-patroon (zelfde patroon als /pand/vergelijking).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (scenarioParam !== null) {
      const slotIndex = Number(scenarioParam);
      const start = haalScenarioBewerkStartOp();
      if (!start || start.slotIndex !== slotIndex) {
        setStatus('niet-gevonden');
        return;
      }
      setInitieelScenario({ asIsPand: start.asIsPand, slotIndex: start.slotIndex, naam: start.naam, terugUrl: start.terugUrl });
      setStatus('klaar');
      return;
    }
    setInitieelScenario(undefined);

    if (!dealParam) {
      setStatus('klaar');
      setInitieelDeal(undefined);
      return;
    }
    setStatus('laden');
    haalDealOp(dealParam)
      .then((deal) => {
        if (!deal) {
          setStatus('niet-gevonden');
          return;
        }
        setInitieelDeal({ id: deal.id, naam: deal.naam, notitie: deal.notitie, map: deal.map, scenarios: deal.scenarios, pandInvoer: deal.pandInvoer });
        setStatus('klaar');
      })
      .catch(() => setStatus('niet-gevonden'));
  }, [dealParam, scenarioParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status === 'laden') return null;

  if (status === 'niet-gevonden') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-sans-serif, sans-serif' }}>
        <p>{scenarioParam !== null ? 'Dit scenario kon niet geladen worden — begin opnieuw vanaf de vergelijkingspagina.' : 'Deze deal kon niet gevonden of geladen worden.'}</p>
        <Link href={scenarioParam !== null ? '/pand/vergelijking' : '/deals'}>← {scenarioParam !== null ? 'Terug naar de vergelijking' : 'Terug naar mijn deals'}</Link>
      </div>
    );
  }

  return (
    <InvoerProvider initieelDeal={initieelDeal} initieelScenario={initieelScenario}>
      <ToastProvider>
        <LadeProvider>
          <div className={styles.page}>
            <Topbar />
            <main className={styles.main}>
              <PandFormulier />
              <RuimteRaster />
              <OverigePosten />
              <NotitieVeld />
            </main>
            <RuimteLade />
          </div>
        </LadeProvider>
      </ToastProvider>
    </InvoerProvider>
  );
}

export default function NieuwPandPagina() {
  return (
    <Suspense fallback={null}>
      <NieuwPandContent />
    </Suspense>
  );
}
