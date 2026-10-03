'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { stelSuggestiesOp, type PandInvoer } from '@wwso/engine';
import { Vergelijking, type GeladenDeal } from '../../../components/vergelijking/Vergelijking';
import { haalPandOp } from '../../../lib/resultaat/opslag';
import { bepaalTarievenset, bepaalKostencatalogus } from '../../../lib/versiestempel/resolutie';
import { haalDealOp } from '../../../lib/deals/opslag';
import { haalEigenProfielOp, magDealBewerken } from '../../../lib/deals/profiel';
import { bepaalVergelijkingBron } from '../../../lib/navigatie';
import { ruimOpVoorWoning } from '../../../lib/sessie/brug';

interface Geladen {
  pand: PandInvoer;
  tarievensetPeildatum?: string;
  kostencatalogusVersie?: string;
  deal?: GeladenDeal;
}

function VergelijkingContent() {
  const dealParam = useSearchParams().get('deal');
  const router = useRouter();
  const [geladen, setGeladen] = useState<Geladen | null | undefined>(undefined);

  // Een opgeslagen deal komt uit Supabase (async, ná hydratie); zonder `?deal=` valt dit terug
  // op de sessionStorage-brug van taak 12/13/14 — beide routes zetten pas na afloop state, dus
  // effect + setState is hier het juiste primitief.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (dealParam) {
      // Opent een opgeslagen woning: elk sessie-restje van een andere woning verdwijnt (zie `lib/sessie/brug.ts`).
      ruimOpVoorWoning(dealParam);
      // (zie `bepaalVergelijkingBron`: met `?deal=` altijd uit Supabase.)
      // Bewerkrechten hier net zo bepalen als op /woning/nieuw (staat-navigatie-audit 2026-10-03:
      // deze pagina kende ze niet, waardoor "Opslaan" op de demo-woning of een woning van een
      // andere org gewoon aanstond en pas bij de database op een rauwe RLS-fout strandde).
      Promise.all([
        haalDealOp(dealParam),
        haalEigenProfielOp().then(
          (profiel) => ({ profiel, onzeker: false }),
          () => ({ profiel: null, onzeker: true }),
        ),
      ])
        .then(([deal, { profiel, onzeker }]) => {
          if (!deal) {
            setGeladen(null);
            return;
          }
          setGeladen({
            pand: deal.pandInvoer,
            tarievensetPeildatum: deal.versiestempel.tarievensetPeildatum,
            kostencatalogusVersie: deal.versiestempel.kostencatalogusVersie,
            deal: {
              id: deal.id,
              naam: deal.naam,
              notitie: deal.notitie,
              map: deal.map,
              scenarios: deal.scenarios,
              magBewerken: magDealBewerken(deal, profiel),
              bewerkrechtenOnzeker: onzeker,
            },
          });
        })
        .catch(() => setGeladen(null));
      return;
    }
    const bron = bepaalVergelijkingBron(dealParam, haalPandOp());
    if (bron.soort === 'doorsturen') {
      router.replace(bron.url);
      return;
    }
    setGeladen(
      bron.soort === 'sessie'
        ? {
            pand: bron.context.pand,
            tarievensetPeildatum: bron.context.tarievensetPeildatum,
            kostencatalogusVersie: bron.context.kostencatalogusVersie,
          }
        : null,
    );
  }, [dealParam, router]);
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
