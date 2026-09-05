'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { huidigeVersiestempel, pasScenarioToe, type Energielabel, type KandidaatWaardering, type PandInvoer, type PandWaardering } from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { useHandmatigeKandidaten, useScenarioPakket, type ScenarioSlot } from '../../lib/vergelijking/useScenarioPakket';
import { beschikbareEnergielabelDoelen, nieuweSelectieNaToggle } from '../../lib/vergelijking/scenario-bouw';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { maakDealAan, werkDealBij, haalMappen } from '../../lib/deals/opslag';
import {
  haalEnWisScenarioBewerkResultaatOp,
  haalEnWisVergelijkingSnapshotOp,
  slaScenarioBewerkStartOp,
  slaVergelijkingSnapshotOp,
  type VergelijkingSnapshot,
} from '../../lib/vergelijking/scenarioBewerkBrug';
import type { ScenarioSelectie } from '../../lib/deals/types';
import { HomeLogo } from '../HomeLogo';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { SamenvattingRij } from './SamenvattingRij';
import { MaatregelTabel } from './MaatregelTabel';
import { HandmatigMaatregelen } from './HandmatigMaatregelen';
import styles from './styles.module.css';

const STANDAARD_NAMEN = ['Scenario 1', 'Scenario 2', 'Scenario 3'];
const NIEUWE_MAP_OPTIE = '__nieuwe_map__';

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
        maatregelPrijzenEuro: opgeslagen.maatregelPrijzenEuro,
      };
    }
    if (opgeslagen.soort === 'energielabel') {
      return { naam: opgeslagen.naam, soort: 'energielabel' as const, doelLabel: opgeslagen.doelLabel };
    }
    return { naam: opgeslagen.naam, soort: 'kandidaten' as const, sleutels: new Set(opgeslagen.sleutels) };
  });
}

/** Herstelt de sessionStorage-snapshot (array van sleutels, JSON-serialiseerbaar) terug naar
 * `ScenarioSlot[]` (Set van sleutels) — het spiegelbeeld van de serialisatie in `bewerkHandmatig`. */
function slotsUitSnapshot(slots: VergelijkingSnapshot['slots']): ScenarioSlot[] {
  return slots.map((s) => {
    if (s.soort === 'kandidaten') return { naam: s.naam, soort: 'kandidaten' as const, sleutels: new Set(s.sleutels) };
    if (s.soort === 'energielabel') return { naam: s.naam, soort: 'energielabel' as const, doelLabel: s.doelLabel };
    return {
      naam: s.naam,
      soort: 'handmatig' as const,
      pand: s.pand,
      sleutels: new Set(s.sleutels),
      handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
      maatregelPrijzenEuro: s.maatregelPrijzenEuro,
    };
  });
}

export interface GeladenDeal {
  id: string;
  naam: string;
  notitie: string;
  map: string;
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
  asIsWaardering,
  geladenDeal,
}: {
  pand: PandInvoer;
  tarievenset: Tarievenset;
  peildatum: string;
  kostencatalogus: Kostencatalogus;
  verwervingswaardeEuro: number | undefined;
  kandidaten: readonly KandidaatWaardering[];
  asIsWaardering: PandWaardering;
  geladenDeal?: GeladenDeal;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<ScenarioSlot[]>(() => (geladenDeal ? slotsUitScenarios(geladenDeal.scenarios) : standaardSlots()));
  const [dealId, setDealId] = useState<string | undefined>(geladenDeal?.id);
  const [dealNaam, setDealNaam] = useState(geladenDeal?.naam ?? pand.pand.adres);
  const [dealNotitie, setDealNotitie] = useState(geladenDeal?.notitie ?? '');
  const [dealMap, setDealMap] = useState(geladenDeal?.map ?? '');
  const [mappen, setMappen] = useState<string[]>([]);
  const [nieuweMapModus, setNieuweMapModus] = useState(false);
  const [opslaanStatus, setOpslaanStatus] = useState<'idle' | 'bezig' | 'gelukt' | 'fout'>('idle');
  useDocumentTitle(`${dealNaam} · Vergelijking · WWSO Scenario App`);
  const [opslaanFoutmelding, setOpslaanFoutmelding] = useState<string | undefined>(undefined);

  useEffect(() => {
    haalMappen()
      .then(setMappen)
      .catch(() => setMappen([]));
  }, []);

  // Herstelt lokale (mogelijk nog niet opgeslagen) slots-state na een volledige navigatie weg van
  // deze pagina en terug — sessionStorage bestaat niet tijdens SSR, dus dit kan pas ná hydratie.
  // Twee routes zetten deze snapshot vóór vertrek: "Bewerk handmatig →" (naar /pand/nieuw) en
  // "Bekijk volledig resultaat →" (naar /pand/resultaat). Beide unmounten dit component; zonder
  // snapshot zou elke niet-opgeslagen wijziging (een net toegevoegde kamer, een andere slotnaam,
  // een nog niet opgeslagen deal-koppeling) verloren gaan zodra je terugkeert — dat was de bug
  // ("kamer toevoegen bij een scenario en dan het resultaat bekijken liet 'm weer verdwijnen").
  //
  // Een snapshot zónder `resultaat` is dus GEEN verweesde state meer om te negeren (dat was hij
  // vóór 2026-09-01 wél, toen alleen de /pand/nieuw-route deze snapshot zette): hij betekent nu
  // "kom terug van /pand/resultaat, of een afgebroken /pand/nieuw-bewerking" — in beide gevallen
  // is de snapshot precies de staat van vóór vertrek en dus veilig om toe te passen.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const resultaat = haalEnWisScenarioBewerkResultaatOp();
    const snapshot = haalEnWisVergelijkingSnapshotOp();
    if (!snapshot && !resultaat) return;
    const basisSlots = snapshot ? slotsUitSnapshot(snapshot.slots) : slots;
    setSlots(
      resultaat
        ? basisSlots.map((s, i) => {
            if (i !== resultaat.slotIndex) return s;
            // Was dit slot al handmatig bewerkt (bijv. de kamer nog wat verder aangepast), dan
            // blijven eerder gekozen maatregelen/investering/prijzen behouden — alleen het pand
            // zelf wordt vervangen.
            const behoud = s.soort === 'handmatig'
              ? { sleutels: s.sleutels, handmatigeInvesteringEuro: s.handmatigeInvesteringEuro, maatregelPrijzenEuro: s.maatregelPrijzenEuro }
              : { sleutels: new Set<string>(), handmatigeInvesteringEuro: 0, maatregelPrijzenEuro: {} };
            return { naam: s.naam, soort: 'handmatig' as const, pand: resultaat.bewerktPand, ...behoud };
          })
        : basisSlots,
    );
    if (snapshot) {
      setDealId(snapshot.dealId);
      setDealNaam(snapshot.dealNaam);
      setDealNotitie(snapshot.dealNotitie);
      setDealMap(snapshot.dealMap);
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

  /** Per-maatregel prijsoverschrijving (Tussenfase-taak D) — voorgevuld in de UI met de
   * catalogusprijs, hier alleen de expliciete overschrijving zelf opgeslagen. */
  function zetMaatregelPrijs(slotIndex: number, sleutel: string, euro: number) {
    setSlots((prev) =>
      prev.map((s, i) => (i === slotIndex && s.soort === 'handmatig' ? { ...s, maatregelPrijzenEuro: { ...s.maatregelPrijzenEuro, [sleutel]: euro } } : s)),
    );
  }

  function naamWijzig(index: number, naam: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, naam } : s)));
  }

  function leegmaken(index: number) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { naam: s.naam, soort: 'kandidaten' as const, sleutels: new Set<string>() } : s)));
  }

  /** Wisselknop (Tussenfase-taak C): `null` (de "Geen"-optie) maakt het slot weer leeg, net als
   * `leegmaken` — kiezen van een label vervangt het scenario altijd volledig, nooit een stille
   * samenvoeging met eerder gekozen maatregelen. */
  function wisselEnergielabel(index: number, doelLabel: Energielabel | null) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (doelLabel === null) return { naam: s.naam, soort: 'kandidaten' as const, sleutels: new Set<string>() };
        return { naam: s.naam, soort: 'energielabel' as const, doelLabel };
      }),
    );
  }

  /** Slaat de huidige (mogelijk nog niet opgeslagen) slots-state op, te herstellen door de
   * useEffect hierboven zodra deze pagina na een volledige navigatie weg opnieuw mount. */
  function slaSnapshotOp() {
    slaVergelijkingSnapshotOp({
      dealId,
      dealNaam,
      dealNotitie,
      dealMap,
      slots: slots.map((s) => {
        if (s.soort === 'kandidaten') return { naam: s.naam, soort: 'kandidaten' as const, sleutels: [...s.sleutels] };
        if (s.soort === 'energielabel') return { naam: s.naam, soort: 'energielabel' as const, doelLabel: s.doelLabel };
        return {
          naam: s.naam,
          soort: 'handmatig' as const,
          pand: s.pand,
          sleutels: [...s.sleutels],
          handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
          maatregelPrijzenEuro: s.maatregelPrijzenEuro,
        };
      }),
    });
  }

  function bewerkHandmatig(index: number) {
    const terugUrl = dealId ? `/pand/vergelijking?deal=${dealId}` : '/pand/vergelijking';
    slaSnapshotOp();
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
        return [
          {
            soort: 'handmatig',
            naam: s.naam,
            pand: s.pand,
            sleutels: [...s.sleutels],
            handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
            maatregelPrijzenEuro: s.maatregelPrijzenEuro,
          },
        ];
      }
      if (s.soort === 'energielabel') {
        return [{ soort: 'energielabel', naam: s.naam, doelLabel: s.doelLabel }];
      }
      return s.sleutels.size > 0 ? [{ soort: 'kandidaten', naam: s.naam, sleutels: [...s.sleutels] }] : [];
    });
  }

  function bekijkResultaat(index: number) {
    const pakket = berekendePakketten[index];
    if (!pakket) return;
    const scenarioPand = pasScenarioToe(pand, pakket.scenario.mutaties);
    slaSnapshotOp();
    slaPandOp({
      pand: scenarioPand,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      // Behoudt de deal-koppeling op de heen-en-terug-reis naar het resultaatscherm (backlog:
      // as-is bewerken) — anders verschijnt deze deal bij terugkeer hier als een nieuwe.
      dealId,
      dealNaam,
      dealNotitie,
      dealMap,
      dealScenarios: opslaanbareScenarios(),
    });
    router.push('/pand/resultaat');
  }

  /** Zelfde reis als `bekijkResultaat`, maar dan voor de as-is kolom zelf — voorheen alleen
   * bereikbaar via de browser-terugknop (feedback tijdens het testen, 2026-08-24). */
  function bekijkAsIsResultaat() {
    slaSnapshotOp();
    slaPandOp({
      pand,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      dealId,
      dealNaam,
      dealNotitie,
      dealMap,
      dealScenarios: opslaanbareScenarios(),
    });
    // Met een opgeslagen deal is /pand/resultaat?deal=<id> bruikbaar (bookmark, nieuwe tab,
    // gedeelde link) — navigatie-audit 2026-09-04. Zonder dealId (nog niet opgeslagen pand)
    // bestaat er niets om naar te verwijzen; dan blijft de sessionStorage-brug de enige route.
    router.push(dealId ? `/pand/resultaat?deal=${dealId}` : '/pand/resultaat');
  }

  async function dealOpslaan() {
    setOpslaanStatus('bezig');
    setOpslaanFoutmelding(undefined);
    try {
      const scenarios = opslaanbareScenarios();
      const invoer = {
        naam: dealNaam,
        notitie: dealNotitie,
        map: dealMap,
        pandInvoer: pand,
        scenarios,
        versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
      };
      const deal = dealId ? await werkDealBij(dealId, invoer) : await maakDealAan(invoer);
      setDealId(deal.id);
      setOpslaanStatus('gelukt');
      // Een net getypte nieuwe mapnaam is nu echt opgeslagen — terug naar de dropdown en die
      // meteen als keuzeoptie tonen, anders lijkt het net alsof er niets is gebeurd (feedback
      // Emma, 2026-09-04: "kun je niet meer terug naar dropdown").
      if (nieuweMapModus) {
        setNieuweMapModus(false);
        setMappen((huidig) => (dealMap && !huidig.includes(dealMap) ? [...huidig, dealMap].sort((a, b) => a.localeCompare(b)) : huidig));
      }
      router.replace(`/pand/vergelijking?deal=${deal.id}`);
    } catch (err) {
      setOpslaanFoutmelding(err instanceof Error ? err.message : String(err));
      setOpslaanStatus('fout');
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.kop}>
        <HomeLogo />
        <h1>Scenariovergelijking</h1>
        <span className={styles.kopSub}>
          {pand.pand.adres} · {pand.pand.stad}
        </span>
        <div className={styles.dealOpslaan}>
          <input value={dealNaam} onChange={(e) => setDealNaam(e.target.value)} aria-label="Naam van de deal" className={styles.dealNaamVeld} />
          {nieuweMapModus ? (
            <span className={styles.dealMapNieuw}>
              <input
                autoFocus
                value={dealMap}
                onChange={(e) => setDealMap(e.target.value)}
                onBlur={() => {
                  if (!dealMap) setNieuweMapModus(false);
                }}
                aria-label="Naam van de nieuwe map"
                placeholder="Naam nieuwe map"
                className={styles.dealMapVeld}
              />
              <button
                type="button"
                className={styles.dealMapAnnuleren}
                title="Annuleren, terug naar bestaande mappen"
                aria-label="Annuleren, terug naar bestaande mappen"
                onClick={() => {
                  setDealMap('');
                  setNieuweMapModus(false);
                }}
              >
                ×
              </button>
            </span>
          ) : (
            <select
              value={dealMap}
              onChange={(e) => {
                if (e.target.value === NIEUWE_MAP_OPTIE) {
                  setDealMap('');
                  setNieuweMapModus(true);
                } else {
                  setDealMap(e.target.value);
                }
              }}
              aria-label="Map (persoonlijke ordening)"
              className={styles.dealMapVeld}
            >
              <option value="">📁 (geen map)</option>
              {mappen.map((m) => (
                <option key={m} value={m}>
                  📁 {m}
                </option>
              ))}
              {dealMap && !mappen.includes(dealMap) && (
                <option key={dealMap} value={dealMap}>
                  📁 {dealMap}
                </option>
              )}
              <option value={NIEUWE_MAP_OPTIE}>+ Nieuwe map…</option>
            </select>
          )}
          <button type="button" className={`${styles.btn} ${styles.btnPrimair}`} onClick={dealOpslaan} disabled={opslaanStatus === 'bezig'}>
            {dealId ? 'Opslaan' : 'Deal opslaan'}
          </button>
          {opslaanStatus === 'gelukt' && <span className={styles.opslaanGelukt}>Opgeslagen ✓</span>}
          {opslaanStatus === 'fout' && <span className={styles.opslaanFout}>Opslaan mislukt: {opslaanFoutmelding}</span>}
        </div>
        <Link href="/deals" className={styles.dealenLink}>
          Mijn deals →
        </Link>
        <textarea
          value={dealNotitie}
          onChange={(e) => setDealNotitie(e.target.value)}
          aria-label="Notitie bij deze deal"
          placeholder="Notitie bij deze deal (optioneel, zichtbaar in het deals-overzicht)…"
          className={styles.dealNotitieVeld}
          rows={2}
        />
      </header>
      <main className={styles.main}>
        <SamenvattingRij
          asIsWaardering={asIsWaardering}
          asIsDealId={dealId}
          kolommen={slots.map((slot, i) => ({
            naam: slot.naam,
            pakket: berekendePakketten[i],
            energielabelDoel: slot.soort === 'energielabel' ? slot.doelLabel : null,
          }))}
          energielabelOpties={beschikbareEnergielabelDoelen(pand)}
          onNaamWijzig={naamWijzig}
          onLeegmaken={leegmaken}
          onWisselEnergielabel={wisselEnergielabel}
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
                maatregelPrijzenEuro={slot.maatregelPrijzenEuro}
                onToggle={(sleutel) => toggleHandmatigeMaatregel(i, sleutel)}
                onInvesteringWijzig={(euro) => zetHandmatigeInvestering(i, euro)}
                onPrijsWijzig={(sleutel, euro) => zetMaatregelPrijs(i, sleutel, euro)}
              />
            </div>
          );
        })}
      </main>
    </div>
  );
}
