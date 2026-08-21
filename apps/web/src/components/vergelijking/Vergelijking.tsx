'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { huidigeVersiestempel, pasScenarioToe, type KandidaatWaardering, type Pakket, type PandInvoer, type PandWaardering } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { useScenarioPakket, type ScenarioSlot } from '../../lib/vergelijking/useScenarioPakket';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { maakDealAan, werkDealBij } from '../../lib/deals/opslag';
import type { ScenarioSelectie } from '../../lib/deals/types';
import { SamenvattingRij } from './SamenvattingRij';
import { MaatregelTabel } from './MaatregelTabel';
import styles from './styles.module.css';

const STANDAARD_NAMEN = ['Scenario 1', 'Scenario 2', 'Scenario 3'];

function standaardSlots(): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((naam) => ({ naam, sleutels: new Set<string>() }));
}

/** Vult de drie vaste slots met de scenario's van een geladen deal (taak 15); ontbrekende slots
 * blijven leeg met een standaardnaam. */
function slotsUitScenarios(scenarios: ScenarioSelectie[]): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((standaardNaam, i) => {
    const opgeslagen = scenarios[i];
    return opgeslagen ? { naam: opgeslagen.naam, sleutels: new Set(opgeslagen.sleutels) } : { naam: standaardNaam, sleutels: new Set<string>() };
  });
}

export interface GeladenDeal {
  id: string;
  naam: string;
  scenarios: ScenarioSelectie[];
}

/**
 * Scenariovergelijking (taak 14) + opslaan/laden als deal (taak 15). Precies drie vaste
 * scenario-slots (rules-of-hooks: drie expliciete `useScenarioPakket`-aanroepen, geen `.map`
 * over een hook) die elk live herrekenen via `bouwVrijScenario` — geen laadindicator, geen
 * API-call per klik.
 */
export function Vergelijking({
  pand,
  tarievenset,
  peildatum,
  kostencatalogus,
  verwervingswaardeEuro,
  kandidaten,
  pakketten,
  asIsWaardering,
  nietBeoordeeldAantal,
  geladenDeal,
}: {
  pand: PandInvoer;
  tarievenset: Tarievenset;
  peildatum: string;
  kostencatalogus: Kostencatalogus;
  verwervingswaardeEuro: number | undefined;
  kandidaten: readonly KandidaatWaardering[];
  pakketten: { basis: Pakket; comfort: Pakket; maximaal: Pakket };
  asIsWaardering: PandWaardering;
  nietBeoordeeldAantal: number;
  geladenDeal?: GeladenDeal;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<ScenarioSlot[]>(() => (geladenDeal ? slotsUitScenarios(geladenDeal.scenarios) : standaardSlots()));
  const [dealId, setDealId] = useState<string | undefined>(geladenDeal?.id);
  const [dealNaam, setDealNaam] = useState(geladenDeal?.naam ?? pand.pand.adres);
  const [opslaanStatus, setOpslaanStatus] = useState<'idle' | 'bezig' | 'gelukt' | 'fout'>('idle');
  const [opslaanFoutmelding, setOpslaanFoutmelding] = useState<string | undefined>(undefined);

  const pakket0 = useScenarioPakket(pand, slots[0], kandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const pakket1 = useScenarioPakket(pand, slots[1], kandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const pakket2 = useScenarioPakket(pand, slots[2], kandidaten, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const berekendePakketten = [pakket0, pakket1, pakket2];

  function toggle(slotIndex: number, sleutel: string) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIndex) return s;
        const nieuw = new Set(s.sleutels);
        if (nieuw.has(sleutel)) nieuw.delete(sleutel);
        else nieuw.add(sleutel);
        return { ...s, sleutels: nieuw };
      }),
    );
  }

  function naamWijzig(index: number, naam: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, naam } : s)));
  }

  function snelVullen(index: number, soort: 'basis' | 'comfort' | 'maximaal' | 'leeg') {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (soort === 'leeg') return { ...s, sleutels: new Set() };
        const bron = pakketten[soort];
        return { ...s, sleutels: new Set(bron.regels.map((r) => r.kandidaat.sleutel)) };
      }),
    );
  }

  function bekijkResultaat(index: number) {
    const pakket = berekendePakketten[index];
    if (!pakket) return;
    const scenarioPand = pasScenarioToe(pand, pakket.scenario.mutaties);
    slaPandOp({ pand: scenarioPand, tarievensetPeildatum: tarievenset.peildatum, kostencatalogusVersie: kostencatalogus.versie });
    router.push('/pand/resultaat');
  }

  async function dealOpslaan() {
    setOpslaanStatus('bezig');
    setOpslaanFoutmelding(undefined);
    try {
      const scenarios: ScenarioSelectie[] = slots.filter((s) => s.sleutels.size > 0).map((s) => ({ naam: s.naam, sleutels: [...s.sleutels] }));
      const invoer = { naam: dealNaam, pandInvoer: pand, scenarios, versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus) };
      const deal = dealId ? await werkDealBij(dealId, invoer) : await maakDealAan(invoer);
      setDealId(deal.id);
      setOpslaanStatus('gelukt');
      router.replace(`/pand/vergelijking?deal=${deal.id}`);
    } catch (err) {
      setOpslaanFoutmelding(err instanceof Error ? err.message : String(err));
      setOpslaanStatus('fout');
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.kop}>
        <h1>Scenariovergelijking</h1>
        <span className={styles.kopSub}>
          {pand.pand.adres} · {pand.pand.stad}
        </span>
        <div className={styles.dealOpslaan}>
          <input value={dealNaam} onChange={(e) => setDealNaam(e.target.value)} aria-label="Naam van de deal" className={styles.dealNaamVeld} />
          <button type="button" className={`${styles.btn} ${styles.btnPrimair}`} onClick={dealOpslaan} disabled={opslaanStatus === 'bezig'}>
            {dealId ? 'Deal bijwerken' : 'Deal opslaan'}
          </button>
          {opslaanStatus === 'gelukt' && <span className={styles.opslaanGelukt}>Opgeslagen ✓</span>}
          {opslaanStatus === 'fout' && <span className={styles.opslaanFout}>Opslaan mislukt: {opslaanFoutmelding}</span>}
        </div>
        <Link href="/deals" className={styles.dealenLink}>
          Mijn deals →
        </Link>
      </header>
      <main className={styles.main}>
        {nietBeoordeeldAantal > 0 && (
          <p className={styles.hint}>
            {nietBeoordeeldAantal} maatregel{nietBeoordeeldAantal === 1 ? '' : 'en'} vere{nietBeoordeeldAantal === 1 ? 'ist' : 'isen'} extra invoer en{' '}
            {nietBeoordeeldAantal === 1 ? 'wordt' : 'worden'} hier niet getoond.
          </p>
        )}
        <SamenvattingRij
          asIsWaardering={asIsWaardering}
          kolommen={slots.map((slot, i) => ({ naam: slot.naam, pakket: berekendePakketten[i] }))}
          onNaamWijzig={naamWijzig}
          onSnelVullen={snelVullen}
          onBekijkResultaat={bekijkResultaat}
          heeftVerwervingswaarde={verwervingswaardeEuro !== undefined}
        />
        <MaatregelTabel kandidaten={kandidaten} slots={slots} onToggle={toggle} />
      </main>
    </div>
  );
}
