'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Resultaatscherm } from '../../../components/resultaat/Resultaatscherm';
import { haalPandOp, type OpgeslagenPandContext } from '../../../lib/resultaat/opslag';
import { bepaalTarievenset } from '../../../lib/versiestempel/resolutie';

export default function ResultaatPagina() {
  const [context, setContext] = useState<OpgeslagenPandContext | null | undefined>(undefined);

  // sessionStorage bestaat niet tijdens SSR — deze lezing kan pas ná hydratie, dus effect +
  // setState is hier het juiste primitief, niet een te vermijden anti-patroon.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setContext(haalPandOp());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (context === undefined) return null;

  if (context === null) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'ui-sans-serif, sans-serif' }}>
        <p>Geen (geldige) invoer gevonden om door te rekenen.</p>
        <Link href="/pand/nieuw">← Terug naar het invoerscherm</Link>
      </div>
    );
  }

  const tarievenset = bepaalTarievenset(context.tarievensetPeildatum);
  const terugUrl = context.dealId ? `/pand/vergelijking?deal=${context.dealId}` : '/pand/vergelijking';

  return <Resultaatscherm pand={context.pand} tarievenset={tarievenset} peildatum={tarievenset.peildatum} terugUrl={terugUrl} />;
}
