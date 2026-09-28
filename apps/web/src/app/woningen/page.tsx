'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { haalDealenOp, kopieerDeal } from '../../lib/deals/opslag';
import { haalEigenProfielOp, type EigenProfiel } from '../../lib/deals/profiel';
import type { Deal } from '../../lib/deals/types';
import { formateerDatumTijd } from '../../lib/datum';
import { HomeLogo } from '../../components/HomeLogo';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './styles.module.css';

/** Zonder map ('') hoort een deal bij "Geen map" — een aparte, altijd aanwezige filteroptie i.p.v.
 * gewoon te verdwijnen uit elk map-specifiek filter (backlog 2026-09-04: persoonlijke ordening). */
const GEEN_MAP = '(geen map)';

export default function DealsOverzicht() {
  useDocumentTitle('Mijn woningen · WWSO Scenario App');
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [profiel, setProfiel] = useState<EigenProfiel | null>(null);
  const [foutmelding, setFoutmelding] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<string>('');
  const [kopieerBezigId, setKopieerBezigId] = useState<string | null>(null);

  useEffect(() => {
    haalDealenOp()
      .then(setDeals)
      .catch((err) => setFoutmelding(err instanceof Error ? err.message : String(err)));
    // Best-effort: zonder profiel (bijv. de call faalt) valt de mapfilter terug op "toon alle
    // mapnamen die zichtbaar zijn" — een lichte UX-onvolkomenheid, geen reden om de hele pagina
    // te laten falen.
    haalEigenProfielOp()
      .then(setProfiel)
      .catch(() => setProfiel(null));
  }, []);

  async function kopieer(id: string) {
    setKopieerBezigId(id);
    try {
      const kopie = await kopieerDeal(id);
      setDeals((huidig) => (huidig ? [kopie, ...huidig] : [kopie]));
    } catch (err) {
      setFoutmelding(err instanceof Error ? err.message : String(err));
    } finally {
      setKopieerBezigId(null);
    }
  }

  // Multi-tenant org-scheiding (2026-09-28): mappen zijn persoonlijke ordening (backlog
  // 2026-09-04), geen org-breed concept — sinds `deals` ook cross-org-woningen kan tonen (de
  // eigenaar ziet alles, iedereen ziet de demo-woning) zou een ongefilterde lijst mapnamen van
  // een andere org in de eigen dropdown laten verschijnen. Zonder profiel (nog aan het laden, of
  // de ophaalcall faalde) filteren we niet — beter een tijdelijk te ruime lijst dan een lege.
  const mappen = useMemo(() => {
    if (!deals) return [];
    const eigenDeals = profiel ? deals.filter((d) => d.orgId === profiel.orgId) : deals;
    const gevonden = new Set(eigenDeals.map((d) => d.map).filter((m) => m !== ''));
    return [...gevonden].sort((a, b) => a.localeCompare(b));
  }, [deals, profiel]);

  const zichtbareDeals = useMemo(() => {
    if (!deals || !mapFilter) return deals ?? [];
    if (mapFilter === GEEN_MAP) return deals.filter((d) => d.map === '');
    return deals.filter((d) => d.map === mapFilter);
  }, [deals, mapFilter]);

  return (
    <div className={styles.wrap}>
      <header className={styles.kop}>
        <HomeLogo />
        <h1>Mijn woningen</h1>
        {mappen.length > 0 && (
          <select value={mapFilter} onChange={(e) => setMapFilter(e.target.value)} className={styles.mapFilter} aria-label="Filter op map">
            <option value="">Alle mappen</option>
            {mappen.map((m) => (
              <option key={m} value={m}>
                📁 {m}
              </option>
            ))}
            <option value={GEEN_MAP}>Geen map</option>
          </select>
        )}
        <Link href="/woning/nieuw" className={styles.nieuwLink}>
          + Nieuwe woning
        </Link>
      </header>
      <main className={styles.main}>
        {foutmelding && <p className={`${styles.melding} ${styles.foutmelding}`}>Woningen ophalen mislukt: {foutmelding}</p>}
        {!foutmelding && deals === null && <p className={styles.melding}>Bezig met laden…</p>}
        {!foutmelding && deals !== null && deals.length === 0 && (
          <p className={styles.melding}>
            Nog geen woningen opgeslagen. Ga naar <Link href="/woning/nieuw">een nieuwe woning</Link>, reken door en sla het op vanaf het vergelijkingsscherm.
          </p>
        )}
        {!foutmelding && deals !== null && deals.length > 0 && (
          <section className={styles.blok}>
            <div className={styles.tabelScroll}>
              <table className={styles.tabel}>
                <thead>
                  <tr>
                    <th>Woning</th>
                    <th>Adres</th>
                    <th>Kamers</th>
                    <th>Scenario&apos;s</th>
                    <th>Notitie</th>
                    <th>Laatst bijgewerkt</th>
                    <th>Map</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {zichtbareDeals.map((deal) => (
                    <tr key={deal.id} className={styles.rij}>
                      <td className={styles.naamCel}>
                        <Link href={`/woning/vergelijking?deal=${deal.id}`} className={styles.dealLink}>
                          {deal.naam}
                        </Link>
                        {deal.isDemo && (
                          <span className={styles.dim} title="Permanente voorbeeldwoning — alleen-lezen, kopiëren maakt een eigen bewerkbare versie.">
                            {' '}
                            · Voorbeeld
                          </span>
                        )}
                      </td>
                      <td>
                        {deal.pandInvoer.pand.adres} · {deal.pandInvoer.pand.stad}
                      </td>
                      <td>{deal.pandInvoer.pand.aantalKamers}</td>
                      <td className={styles.dim}>{deal.scenarios.length === 0 ? 'geen' : deal.scenarios.length}</td>
                      <td className={styles.notitieCel} title={deal.notitie || undefined}>
                        {deal.notitie || '—'}
                      </td>
                      <td className={styles.dim}>{formateerDatumTijd(deal.bijgewerkt)}</td>
                      <td className={styles.dim}>{deal.map ? `📁 ${deal.map}` : '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.kopieerKnop}
                          disabled={kopieerBezigId === deal.id}
                          title="Kopiëren naar een nieuwe, losstaande woning"
                          onClick={() => kopieer(deal.id)}
                        >
                          {kopieerBezigId === deal.id ? '…' : '⧉ Kopiëren'}
                        </button>
                      </td>
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
