'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { haalDealenOp } from '../../lib/deals/opslag';
import type { Deal } from '../../lib/deals/types';
import styles from './styles.module.css';

function formateerDatum(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DealsOverzicht() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);

  useEffect(() => {
    haalDealenOp()
      .then(setDeals)
      .catch((err) => setFoutmelding(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className={styles.wrap}>
      <header className={styles.kop}>
        <h1>Mijn deals</h1>
        <Link href="/pand/nieuw" className={styles.nieuwLink}>
          + Nieuw pand
        </Link>
      </header>
      <main className={styles.main}>
        {foutmelding && <p className={`${styles.melding} ${styles.foutmelding}`}>Deals ophalen mislukt: {foutmelding}</p>}
        {!foutmelding && deals === null && <p className={styles.melding}>Bezig met laden…</p>}
        {!foutmelding && deals !== null && deals.length === 0 && (
          <p className={styles.melding}>
            Nog geen deals opgeslagen. Ga naar <Link href="/pand/nieuw">een nieuw pand</Link>, reken door en sla het op vanaf het vergelijkingsscherm.
          </p>
        )}
        {!foutmelding && deals !== null && deals.length > 0 && (
          <section className={styles.blok}>
            <div className={styles.tabelScroll}>
              <table className={styles.tabel}>
                <thead>
                  <tr>
                    <th>Deal</th>
                    <th>Adres</th>
                    <th>Kamers</th>
                    <th>Scenario&apos;s</th>
                    <th>Tarieven-peildatum</th>
                    <th>Laatst bijgewerkt</th>
                  </tr>
                </thead>
                <tbody>
                  {deals.map((deal) => (
                    <tr key={deal.id} className={styles.rij}>
                      <td className={styles.naamCel}>
                        <Link href={`/pand/vergelijking?deal=${deal.id}`} className={styles.dealLink}>
                          {deal.naam}
                        </Link>
                      </td>
                      <td>
                        {deal.pandInvoer.pand.adres} · {deal.pandInvoer.pand.stad}
                      </td>
                      <td>{deal.pandInvoer.pand.aantalKamers}</td>
                      <td className={styles.dim}>{deal.scenarios.length === 0 ? 'geen' : deal.scenarios.length}</td>
                      <td className={styles.dim}>{deal.versiestempel.tarievensetPeildatum}</td>
                      <td className={styles.dim}>{formateerDatum(deal.bijgewerkt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
