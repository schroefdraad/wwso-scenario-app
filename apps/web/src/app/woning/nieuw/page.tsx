'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { InvoerProvider, type InitieelDeal, type InitieelScenario } from '../../../components/invoer/InvoerContext';
import { ToastProvider } from '../../../components/invoer/ToastContext';
import { LadeProvider } from '../../../components/invoer/LadeContext';
import { Topbar, WoningContext } from '../../../components/invoer/Topbar';
import { PandFormulier } from '../../../components/invoer/PandFormulier';
import { RuimteRaster } from '../../../components/invoer/RuimteRaster';
import { OverigePosten } from '../../../components/invoer/OverigePosten';
import { NotitieVeld } from '../../../components/invoer/NotitieVeld';
import { RuimteLade } from '../../../components/invoer/RuimteLade';
import { haalDealOp } from '../../../lib/deals/opslag';
import { haalEigenProfielOp, magDealBewerken } from '../../../lib/deals/profiel';
import { haalScenarioBewerkStartOp } from '../../../lib/vergelijking/scenarioBewerkBrug';
import { isZojuistGekoppeld } from '../../../lib/invoer/koppeling';
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
  // primitief, niet een te vermijden anti-patroon (zelfde patroon als /woning/vergelijking).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (scenarioParam !== null) {
      const slotIndex = Number(scenarioParam);
      const start = haalScenarioBewerkStartOp();
      if (!start || start.slotIndex !== slotIndex) {
        setStatus('niet-gevonden');
        return;
      }
      setInitieelScenario({ asIsPand: start.asIsPand, slotIndex: start.slotIndex, naam: start.naam, terugUrl: start.terugUrl, dealId: start.dealId });
      setStatus('klaar');
      return;
    }
    setInitieelScenario(undefined);

    // Deze `?deal=` is zojuist door het invoerscherm zelf gezet na de eerste opslag — de state is
    // al gelijk aan de database, dus niet opnieuw laden (zie `lib/invoer/koppeling.ts`).
    if (isZojuistGekoppeld(dealParam)) return;

    if (!dealParam) {
      setStatus('klaar');
      setInitieelDeal(undefined);
      return;
    }
    setStatus('laden');
    // Profiel + deal parallel ophalen: het profiel bepaalt alleen `magBewerken` (UI-gedrag), de
    // deal zelf blijft leidend voor of de pagina laadt — een profiel-ophaalfout mag het laden van
    // een woning niet blokkeren.
    //
    // `bewerkrechtenOnzeker` (2026-10-02) houdt bewust bij OF de profiel-call zelf faalde (na de
    // automatische retry in `haalEigenProfielOp`), los van `magDealBewerken`'s uitkomst — een
    // legitieme `profiel: null` (niet op de allowlist) is geen onzekerheid, dat IS het antwoord.
    // Alleen een echte fout maakt de uitkomst onbetrouwbaar; zie `Topbar.tsx` voor waarom dat
    // onderscheid ertoe doet (nooit een "ga door en maak een kopie"-keuze aanbieden als we het
    // gewoon niet weten).
    Promise.all([
      haalDealOp(dealParam),
      haalEigenProfielOp().then(
        (profiel) => ({ profiel, onzeker: false }),
        () => ({ profiel: null, onzeker: true }),
      ),
    ])
      .then(([deal, { profiel, onzeker }]) => {
        if (!deal) {
          setStatus('niet-gevonden');
          return;
        }
        setInitieelDeal({
          id: deal.id,
          naam: deal.naam,
          notitie: deal.notitie,
          map: deal.map,
          scenarios: deal.scenarios,
          pandInvoer: deal.pandInvoer,
          magBewerken: magDealBewerken(deal, profiel),
          bewerkrechtenOnzeker: onzeker,
        });
        setStatus('klaar');
      })
      .catch(() => setStatus('niet-gevonden'));
  }, [dealParam, scenarioParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status === 'laden') return null;

  if (status === 'niet-gevonden') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-sans-serif, sans-serif' }}>
        <p>{scenarioParam !== null ? 'Dit scenario kon niet geladen worden — begin opnieuw vanaf de vergelijkingspagina.' : 'Deze woning kon niet gevonden of geladen worden.'}</p>
        <Link href={scenarioParam !== null ? '/woning/vergelijking' : '/woningen'}>← {scenarioParam !== null ? 'Terug naar de vergelijking' : 'Terug naar mijn woningen'}</Link>
      </div>
    );
  }

  return (
    // `key`: wisselt de URL op dezelfde pagina naar een ándere woning (of naar een lege nieuwe),
    // dan wordt het formulier echt opnieuw opgebouwd i.p.v. dat de vorige woning blijft staan
    // (staat-navigatie-audit 2026-10-03). De eigen URL-wissel na de eerste opslag verandert
    // `initieelDeal` niet en laat het formulier dus staan.
    <InvoerProvider
      key={initieelDeal?.id ?? (initieelScenario ? `scenario-${initieelScenario.slotIndex}` : 'nieuw')}
      initieelDeal={initieelDeal}
      initieelScenario={initieelScenario}
    >
      <ToastProvider>
        <LadeProvider>
          <div className={styles.page}>
            <Topbar />
            <WoningContext />
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
