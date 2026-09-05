'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { stelSuggestiesOp, type PandInvoer } from '@wwso/engine';
import { Vergelijking, type GeladenDeal } from '../../../components/vergelijking/Vergelijking';
import { haalPandOp } from '../../../lib/resultaat/opslag';
import { bepaalTarievenset, bepaalKostencatalogus } from '../../../lib/versiestempel/resolutie';
import { haalDealOp } from '../../../lib/deals/opslag';

interface Geladen {
  pand: PandInvoer;
  tarievensetPeildatum?: string;
  kostencatalogusVersie?: string;
  deal?: GeladenDeal;
}

function VergelijkingContent() {
  const dealParam = useSearchParams().get('deal');
  const [geladen, setGeladen] = useState<Geladen | null | undefined>(undefined);

  // Een opgeslagen deal komt uit Supabase (async, ná hydratie); zonder `?deal=` valt dit terug
  // op de sessionStorage-brug van taak 12/13/14 — beide routes zetten pas na afloop state, dus
  // effect + setState is hier het juiste primitief.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (dealParam) {
      haalDealOp(dealParam)
        .then((deal) => {
          if (!deal) {
            setGeladen(null);
            return;
          }
          setGeladen({
            pand: deal.pandInvoer,
            tarievensetPeildatum: deal.versiestempel.tarievensetPeildatum,
            kostencatalogusVersie: deal.versiestempel.kostencatalogusVersie,
            deal: { id: deal.id, naam: deal.naam, notitie: deal.notitie, map: deal.map, scenarios: deal.scenarios },
          });
        })
        .catch(() => setGeladen(null));
      return;
    }
    const context = haalPandOp();
    setGeladen(
      context
        ? {
            pand: context.pand,
            tarievensetPeildatum: context.tarievensetPeildatum,
            kostencatalogusVersie: context.kostencatalogusVersie,
            // Draagt de deal-identiteit door vanuit /woning/nieuw?deal=<id> (backlog: as-is
            // bewerken) — zonder dit zou "Woning opslaan" hier een DUPLICAAT aanmaken in plaats
            // van de bestaande deal bij te werken.
            deal: context.dealId
              ? {
                  id: context.dealId,
                  naam: context.dealNaam ?? context.pand.pand.adres,
                  notitie: context.dealNotitie ?? '',
                  map: context.dealMap ?? '',
                  scenarios: context.dealScenarios ?? [],
                }
              : undefined,
          }
        : null,
    );
  }, [dealParam]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tarievenset = useMemo(() => bepaalTarievenset(geladen?.tarievensetPeildatum), [geladen?.tarievensetPeildatum]);
  const kostencatalogus = useMemo(() => bepaalKostencatalogus(geladen?.kostencatalogusVersie), [geladen?.kostencatalogusVersie]);

  const resultaat = useMemo(() => {
    if (!geladen) return null;
    return stelSuggestiesOp(geladen.pand, { tarievenset, peildatum: tarievenset.peildatum, kostencatalogus });
  }, [geladen, tarievenset, kostencatalogus]);

  if (geladen === undefined) return null;

  if (geladen === null || !resultaat) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-sans-serif, sans-serif' }}>
        <p>{dealParam ? 'Deze woning kon niet gevonden of geladen worden.' : "Geen (geldige) invoer gevonden om scenario's voor te vergelijken."}</p>
        <p>
          <Link href="/woning/nieuw">← Terug naar het invoerscherm</Link>
        </p>
        <p>
          <Link href="/woningen">Mijn woningen →</Link>
        </p>
      </div>
    );
  }

  return (
    <Vergelijking
      pand={geladen.pand}
      tarievenset={tarievenset}
      peildatum={tarievenset.peildatum}
      kostencatalogus={kostencatalogus}
      verwervingswaardeEuro={undefined}
      asIsWaardering={resultaat.asIs}
      geladenDeal={geladen.deal}
    />
  );
}

export default function VergelijkingPagina() {
  return (
    <Suspense fallback={null}>
      <VergelijkingContent />
    </Suspense>
  );
}
