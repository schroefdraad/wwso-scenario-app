'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Resultaatscherm } from '../../../components/resultaat/Resultaatscherm';
import { haalPandOp, type OpgeslagenPandContext } from '../../../lib/resultaat/opslag';
import { haalDealOp } from '../../../lib/deals/opslag';
import { bepaalTarievenset } from '../../../lib/versiestempel/resolutie';

function ResultaatContent() {
  const dealParam = useSearchParams().get('deal');
  const [context, setContext] = useState<OpgeslagenPandContext | null | undefined>(undefined);

  // Een `?deal=<id>` maakt deze pagina deelbaar/te bookmarken/in een nieuwe tab te openen: dat
  // haalt de AS-IS rechtstreeks uit Supabase op, in plaats van uitsluitend te vertrouwen op de
  // sessionStorage-brug (die niet bestaat bij een verse tab zonder navigatiehistorie — bevinding
  // uit de navigatie-audit, 2026-09-04). Dekt alleen de AS-IS: een scenariokolom-resultaat is een
  // lokaal berekende mutatie, niet 1-op-1 uit de opgeslagen deal te reconstrueren zonder ook de
  // scenario-mutaties opnieuw toe te passen — dat blijft voorlopig sessionStorage-only.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (dealParam) {
      haalDealOp(dealParam)
        .then((deal) => {
          if (!deal) {
            setContext(null);
            return;
          }
          setContext({
            pand: deal.pandInvoer,
            tarievensetPeildatum: deal.versiestempel.tarievensetPeildatum,
            kostencatalogusVersie: deal.versiestempel.kostencatalogusVersie,
            dealId: deal.id,
            dealNaam: deal.naam,
            dealNotitie: deal.notitie,
            dealMap: deal.map,
            dealScenarios: deal.scenarios,
          });
        })
        .catch(() => setContext(null));
      return;
    }
    setContext(haalPandOp());
  }, [dealParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (context === undefined) return null;

  if (context === null) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-sans-serif, sans-serif' }}>
        <p>{dealParam ? 'Deze deal kon niet gevonden of geladen worden.' : 'Geen (geldige) invoer gevonden om door te rekenen.'}</p>
        <p>
          <Link href="/pand/nieuw">← Terug naar het invoerscherm</Link>
        </p>
        <p>
          <Link href="/deals">Mijn deals →</Link>
        </p>
      </div>
    );
  }

  const tarievenset = bepaalTarievenset(context.tarievensetPeildatum);
  const terugUrl = context.dealId ? `/pand/vergelijking?deal=${context.dealId}` : '/pand/vergelijking';

  return <Resultaatscherm pand={context.pand} tarievenset={tarievenset} peildatum={tarievenset.peildatum} terugUrl={terugUrl} />;
}

export default function ResultaatPagina() {
  return (
    <Suspense fallback={null}>
      <ResultaatContent />
    </Suspense>
  );
}
