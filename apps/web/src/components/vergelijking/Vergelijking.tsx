'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { huidigeVersiestempel, pasScenarioToe, type KandidaatWaardering, type Pakket, type PandInvoer, type PandWaardering } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { useHandmatigeKandidaten, useScenarioPakket, type ScenarioSlot } from '../../lib/vergelijking/useScenarioPakket';
import { nieuweSelectieNaToggle } from '../../lib/vergelijking/scenario-bouw';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { maakDealAan, werkDealBij } from '../../lib/deals/opslag';
import {
  haalEnWisScenarioBewerkResultaatOp,
  haalEnWisVergelijkingSnapshotOp,
  slaScenarioBewerkStartOp,
  slaVergelijkingSnapshotOp,
  type VergelijkingSnapshot,
} from '../../lib/vergelijking/scenarioBewerkBrug';
import type { ScenarioSelectie } from '../../lib/deals/types';
import { SamenvattingRij } from './SamenvattingRij';
import { MaatregelTabel } from './MaatregelTabel';
import { HandmatigMaatregelen } from './HandmatigMaatregelen';
import styles from './styles.module.css';

const STANDAARD_NAMEN = ['Scenario 1', 'Scenario 2', 'Scenario 3'];

function standaardSlots(): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((naam) => ({ naam, soort: 'kandidaten' as const, sleutels: new Set<string>() }));
}

/** Vult de drie vaste slots met de scenario's van een geladen deal (taak 15, uitgebreid
 * 2026-08-22 met handmatige scenario's); ontbrekende slots blijven leeg met een standaardnaam. */
function slotsUitScenarios(scenarios: ScenarioSelectie[]): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((standaardNaam, i) => {
    const opgeslagen = scenarios[i];
    if (!opgeslagen) return { naam: standaardNaam, soort: 'kandidaten' as const, sleutels: new Set<string>() };
    if (opgeslagen.soort === 'handmatig') {
      return {
        naam: opgeslagen.naam,
        soort: 'handmatig' as const,
        pand: opgeslagen.pand,
        sleutels: new Set(opgeslagen.sleutels),
        handmatigeInvesteringEuro: opgeslagen.handmatigeInvesteringEuro,
      };
    }
    return { naam: opgeslagen.naam, soort: 'kandidaten' as const, sleutels: new Set(opgeslagen.sleutels) };
  });
}

/** Herstelt de sessionStorage-snapshot (array van sleutels, JSON-serialiseerbaar) terug naar
 * `ScenarioSlot[]` (Set van sleutels) — het spiegelbeeld van de serialisatie in `bewerkHandmatig`. */
function slotsUitSnapshot(slots: VergelijkingSnapshot['slots']): ScenarioSlot[] {
  return slots.map((s) =>
    s.soort === 'kandidaten'
      ? { naam: s.naam, soort: 'kandidaten' as const, sleutels: new Set(s.sleutels) }
      : { naam: s.naam, soort: 'handmatig' as const, pand: s.pand, sleutels: new Set(s.sleutels), handmatigeInvesteringEuro: s.handmatigeInvesteringEuro },
  );
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

  // Vangt het resultaat op van "Bewerk handmatig →" (backlog: AS-IS kopiëren naar een handmatig
  // scenario, feedback Emma Morrison, 2026-08-21) — sessionStorage bestaat niet tijdens SSR, dus
  // dit kan pas ná hydratie, net als de deal-brug elders in deze pagina.
  //
  // `/pand/nieuw` is een VOLLEDIGE navigatie: dit component unmount en remount op de heen- én
  // de terugreis. Zonder de snapshot hieronder zou elke wijziging aan de andere twee slots, de
  // deal-naam of een nog niet opgeslagen deal-koppeling verloren gaan zodra je één slot handmatig
  // bewerkt — dat was de bug ("tweede scenario wist het eerste", "AS-IS-deal opslaan lukt niet").
  // De snapshot wordt alleen toegepast wanneer er ook een `resultaat` is: een snapshot zonder
  // resultaat is een verweesde snapshot van een afgebroken bewerking (Esc/browser-terug) en moet
  // de huidige, verse pagina-state niet overschrijven.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const resultaat = haalEnWisScenarioBewerkResultaatOp();
    const snapshot = haalEnWisVergelijkingSnapshotOp();
    if (!resultaat) return;
    const basisSlots = snapshot ? slotsUitSnapshot(snapshot.slots) : slots;
    setSlots(
      basisSlots.map((s, i) => {
        if (i !== resultaat.slotIndex) return s;
        // Was dit slot al handmatig bewerkt (bijv. de kamer nog wat verder aangepast), dan blijven
        // eerder gekozen maatregelen/investering behouden — alleen het pand zelf wordt vervangen.
        const behoud = s.soort === 'handmatig' ? { sleutels: s.sleutels, handmatigeInvesteringEuro: s.handmatigeInvesteringEuro } : { sleutels: new Set<string>(), handmatigeInvesteringEuro: 0 };
        return { naam: s.naam, soort: 'handmatig' as const, pand: resultaat.bewerktPand, ...behoud };
      }),
    );
    if (snapshot) {
      setDealId(snapshot.dealId);
      setDealNaam(snapshot.dealNaam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Drie expliciete aanroepen (rules-of-hooks: geen .map over een hook), zelfde patroon als de
  // useScenarioPakket-aanroepen eronder. `null` voor een kandidaten-slot, anders de maatregelen
  // die specifiek op DAT bewerkte pand van toepassing zijn (backlog 2026-08-22).
  const handmatigeKandidaten0 = useHandmatigeKandidaten(slots[0], tarievenset, peildatum, kostencatalogus);
  const handmatigeKandidaten1 = useHandmatigeKandidaten(slots[1], tarievenset, peildatum, kostencatalogus);
  const handmatigeKandidaten2 = useHandmatigeKandidaten(slots[2], tarievenset, peildatum, kostencatalogus);
  const handmatigeKandidatenPerSlot = [handmatigeKandidaten0, handmatigeKandidaten1, handmatigeKandidaten2];

  const pakket0 = useScenarioPakket(pand, slots[0], kandidaten, handmatigeKandidaten0, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const pakket1 = useScenarioPakket(pand, slots[1], kandidaten, handmatigeKandidaten1, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const pakket2 = useScenarioPakket(pand, slots[2], kandidaten, handmatigeKandidaten2, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const berekendePakketten = [pakket0, pakket1, pakket2];

  function toggle(slotIndex: number, sleutel: string) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIndex) return s;
        // Aanvinken van een losse maatregel zet een handmatig-bewerkt slot terug naar
        // kandidaten-modus — dezelfde discipline als "Leegmaken": een expliciete gebruikersactie
        // vervangt het vorige scenario, nooit een stille samenvoeging van twee bronnen.
        const huidigeSleutels = s.soort === 'kandidaten' ? s.sleutels : new Set<string>();
        const sleutels = nieuweSelectieNaToggle(kandidaten, huidigeSleutels, sleutel);
        return { naam: s.naam, soort: 'kandidaten' as const, sleutels };
      }),
    );
  }

  /** Zet een maatregel aan/uit op een handmatig-slot ZONDER het bewerkte pand te verliezen — in
   * tegenstelling tot `toggle()`, die een handmatig-slot juist terugzet naar kandidaten-modus
   * (dat blijft de manier om een handmatige bewerking helemaal los te laten). */
  function toggleHandmatigeMaatregel(slotIndex: number, sleutel: string) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIndex || s.soort !== 'handmatig') return s;
        const handmatigeKandidaten = handmatigeKandidatenPerSlot[i]?.kandidaten ?? [];
        const sleutels = nieuweSelectieNaToggle(handmatigeKandidaten, s.sleutels, sleutel);
        return { ...s, sleutels };
      }),
    );
  }

  function zetHandmatigeInvestering(slotIndex: number, euro: number) {
    setSlots((prev) => prev.map((s, i) => (i === slotIndex && s.soort === 'handmatig' ? { ...s, handmatigeInvesteringEuro: euro } : s)));
  }

  function naamWijzig(index: number, naam: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, naam } : s)));
  }

  function snelVullen(index: number, soort: 'basis' | 'comfort' | 'maximaal' | 'leeg') {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (soort === 'leeg') return { naam: s.naam, soort: 'kandidaten' as const, sleutels: new Set<string>() };
        const bron = pakketten[soort];
        return { naam: s.naam, soort: 'kandidaten' as const, sleutels: new Set(bron.regels.map((r) => r.kandidaat.sleutel)) };
      }),
    );
  }

  function bewerkHandmatig(index: number) {
    const terugUrl = dealId ? `/pand/vergelijking?deal=${dealId}` : '/pand/vergelijking';
    slaVergelijkingSnapshotOp({
      dealId,
      dealNaam,
      slots: slots.map((s) =>
        s.soort === 'kandidaten'
          ? { naam: s.naam, soort: 'kandidaten' as const, sleutels: [...s.sleutels] }
          : { naam: s.naam, soort: 'handmatig' as const, pand: s.pand, sleutels: [...s.sleutels], handmatigeInvesteringEuro: s.handmatigeInvesteringEuro },
      ),
    });
    slaScenarioBewerkStartOp({
      asIsPand: pand,
      slotIndex: index,
      naam: slots[index].naam,
      terugUrl,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
    });
    router.push(`/pand/nieuw?scenario=${index}`);
  }

  /** Een leeg kandidaten-slot (geen enkele maatregel aangevinkt) draagt geen informatie en wordt
   * overgeslagen; een handmatig-slot wordt altijd opgeslagen — de bewerkte kamer zelf is de
   * inhoud, ook zonder extra maatregelen erbovenop (backlog 2026-08-22). */
  function opslaanbareScenarios(): ScenarioSelectie[] {
    return slots.flatMap((s): ScenarioSelectie[] => {
      if (s.soort === 'handmatig') {
        return [{ soort: 'handmatig', naam: s.naam, pand: s.pand, sleutels: [...s.sleutels], handmatigeInvesteringEuro: s.handmatigeInvesteringEuro }];
      }
      return s.sleutels.size > 0 ? [{ soort: 'kandidaten', naam: s.naam, sleutels: [...s.sleutels] }] : [];
    });
  }

  function bekijkResultaat(index: number) {
    const pakket = berekendePakketten[index];
    if (!pakket) return;
    const scenarioPand = pasScenarioToe(pand, pakket.scenario.mutaties);
    slaPandOp({
      pand: scenarioPand,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      // Behoudt de deal-koppeling op de heen-en-terug-reis naar het resultaatscherm (backlog:
      // as-is bewerken) — anders verschijnt deze deal bij terugkeer hier als een nieuwe.
      dealId,
      dealNaam,
      dealScenarios: opslaanbareScenarios(),
    });
    router.push('/pand/resultaat');
  }

  /** Zelfde reis als `bekijkResultaat`, maar dan voor de as-is kolom zelf — voorheen alleen
   * bereikbaar via de browser-terugknop (feedback tijdens het testen, 2026-08-24). */
  function bekijkAsIsResultaat() {
    slaPandOp({
      pand,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      dealId,
      dealNaam,
      dealScenarios: opslaanbareScenarios(),
    });
    router.push('/pand/resultaat');
  }

  async function dealOpslaan() {
    setOpslaanStatus('bezig');
    setOpslaanFoutmelding(undefined);
    try {
      const scenarios = opslaanbareScenarios();
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
          asIsDealId={dealId}
          kolommen={slots.map((slot, i) => ({ naam: slot.naam, pakket: berekendePakketten[i] }))}
          onNaamWijzig={naamWijzig}
          onSnelVullen={snelVullen}
          onBekijkResultaat={bekijkResultaat}
          onBekijkAsIsResultaat={bekijkAsIsResultaat}
          onBewerkHandmatig={bewerkHandmatig}
          heeftVerwervingswaarde={verwervingswaardeEuro !== undefined}
        />
        <MaatregelTabel kandidaten={kandidaten} slots={slots} onToggle={toggle} />
        {slots.map((slot, i) => {
          if (slot.soort !== 'handmatig') return null;
          const resultaat = handmatigeKandidatenPerSlot[i];
          return (
            <div key={i} className={styles.handmatigBlok}>
              <HandmatigMaatregelen
                slotNaam={slot.naam}
                kandidaten={resultaat?.kandidaten ?? []}
                geselecteerd={slot.sleutels}
                handmatigeInvesteringEuro={slot.handmatigeInvesteringEuro}
                onToggle={(sleutel) => toggleHandmatigeMaatregel(i, sleutel)}
                onInvesteringWijzig={(euro) => zetHandmatigeInvestering(i, euro)}
              />
            </div>
          );
        })}
      </main>
    </div>
  );
}
