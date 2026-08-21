'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { InvoerProvider, type InitieelDeal } from '../../../components/invoer/InvoerContext';
import { ToastProvider } from '../../../components/invoer/ToastContext';
import { LadeProvider } from '../../../components/invoer/LadeContext';
import { Topbar } from '../../../components/invoer/Topbar';
import { PandFormulier } from '../../../components/invoer/PandFormulier';
import { RuimteRaster } from '../../../components/invoer/RuimteRaster';
import { OverigePosten } from '../../../components/invoer/OverigePosten';
import { RuimteLade } from '../../../components/invoer/RuimteLade';
import { haalDealOp } from '../../../lib/deals/opslag';
import styles from '../../../components/invoer/styles.module.css';

function NieuwPandContent() {
  const dealParam = useSearchParams().get('deal');
  const [status, setStatus] = useState<'laden' | 'klaar' | 'niet-gevonden'>(dealParam ? 'laden' : 'klaar');
  const [initieelDeal, setInitieelDeal] = useState<InitieelDeal | undefined>(undefined);

  // Een deal komt uit Supabase (async, ná hydratie) — effect + setState is hier het juiste
  // primitief, niet een te vermijden anti-patroon (zelfde patroon als /pand/vergelijking).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
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
        setInitieelDeal({ id: deal.id, naam: deal.naam, scenarios: deal.scenarios, pandInvoer: deal.pandInvoer });
        setStatus('klaar');
      })
      .catch(() => setStatus('niet-gevonden'));
  }, [dealParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status === 'laden') return null;

  if (status === 'niet-gevonden') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-sans-serif, sans-serif' }}>
        <p>Deze deal kon niet gevonden of geladen worden.</p>
        <Link href="/deals">← Terug naar mijn deals</Link>
      </div>
    );
  }

  return (
    <InvoerProvider initieelDeal={initieelDeal}>
      <ToastProvider>
        <LadeProvider>
          <div className={styles.page}>
            <Topbar />
            <main className={styles.main}>
              <PandFormulier />
              <RuimteRaster />
              <OverigePosten />
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
