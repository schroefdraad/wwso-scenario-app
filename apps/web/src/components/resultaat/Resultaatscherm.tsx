'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { berekenEindtelling, voerControlesUit, type PandInvoer } from '@wwso/engine';
import type { Tarievenset } from '@wwso/data';
import { KamerRij } from './KamerRij';
import { ControlesPaneel } from './ControlesPaneel';
import styles from './styles.module.css';

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
}: {
  pand: PandInvoer;
  tarievenset: Tarievenset;
  peildatum: string;
  titel?: string;
}) {
  const eindtelling = useMemo(() => berekenEindtelling(pand, tarievenset, peildatum), [pand, tarievenset, peildatum]);
  const controles = useMemo(() => voerControlesUit(pand), [pand]);

  const kamers = Object.keys(eindtelling.perKamer)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={styles.wrap}>
      <header className={styles.kop}>
        <h1>{titel ?? pand.pand.adres}</h1>
        <span className={styles.kopSub}>
          {pand.pand.stad} · {pand.pand.aantalKamers} kamers · peildatum {peildatum}
        </span>
        <Link href="/pand/vergelijking" className={styles.vergelijkLink}>
          Vergelijk scenario&apos;s →
        </Link>
      </header>
      <main className={styles.main}>
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

        <ControlesPaneel controles={controles} />
      </main>
    </div>
  );
}
