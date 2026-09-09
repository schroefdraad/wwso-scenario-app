'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { huidigeVersiestempel, pasScenarioToe, type Energielabel, type PandInvoer, type PandWaardering } from '@wwso/engine';
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
import { HandmatigMaatregelen } from './HandmatigMaatregelen';
import styles from './styles.module.css';

const STANDAARD_NAMEN = ['Scenario 1', 'Scenario 2', 'Scenario 3'];
const NIEUWE_MAP_OPTIE = '__nieuwe_map__';

/** Een leeg, onaangeraakt scenario — `kamerBewerkt: false` en `energielabelDoel: null` is wat
 * `useScenarioPakket` herkent als "nog niets ingevuld" (i.p.v. een nietszeggend pakket met 0
 * overal); `pand` krijgt de as-is mee puur zodat er iets geldigs staat om kandidaten tegen te
 * berekenen. */
function leegSlot(naam: string, asIs: PandInvoer): ScenarioSlot {
  return { naam, pand: asIs, kamerBewerkt: false, energielabelDoel: null, sleutels: new Set<string>(), handmatigeInvesteringEuro: 0, maatregelPrijzenEuro: {} };
}

function standaardSlots(asIs: PandInvoer): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((naam) => leegSlot(naam, asIs));
}

/** Vult de drie vaste slots met de scenario's van een geladen deal (taak 15, uitgebreid
 * 2026-08-22 met handmatige scenario's); ontbrekende slots blijven leeg met een standaardnaam.
 * Een vóór 2026-09-05 opgeslagen `'kandidaten'`-scenario (de toen nog gedeelde, niet-per-scenario
 * checkboxmodus) migreert hier naar het uniforme pad: `pand` = as-is, sleutels behouden — precies
 * wat dat scenario toen betekende (alleen catalogusmaatregelen, geen kamers bewerkt). Een vóór
 * 2026-09-07 opgeslagen `'energielabel'`-scenario (toen nog exclusief van een kamerbewerking,
 * feedback Emma Morrison: "ik kan helemaal niks meer als ik een scenario selecteer") migreert naar
 * dezelfde uniforme vorm: `pand` = as-is (dat scenario kende geen bewerkt pand), `energielabelDoel`
 * = het opgeslagen doellabel. */
function slotsUitScenarios(scenarios: ScenarioSelectie[], asIs: PandInvoer): ScenarioSlot[] {
  return STANDAARD_NAMEN.map((standaardNaam, i) => {
    const opgeslagen = scenarios[i];
    if (!opgeslagen) return leegSlot(standaardNaam, asIs);
    if (opgeslagen.soort === 'handmatig') {
      return {
        naam: opgeslagen.naam,
        pand: opgeslagen.pand,
        kamerBewerkt: opgeslagen.kamerBewerkt,
        energielabelDoel: opgeslagen.energielabelDoel ?? null,
        sleutels: new Set(opgeslagen.sleutels),
        handmatigeInvesteringEuro: opgeslagen.handmatigeInvesteringEuro,
        maatregelPrijzenEuro: opgeslagen.maatregelPrijzenEuro,
      };
    }
    if (opgeslagen.soort === 'energielabel') {
      return {
        naam: opgeslagen.naam,
        pand: asIs,
        kamerBewerkt: false,
        energielabelDoel: opgeslagen.doelLabel,
        sleutels: new Set(opgeslagen.sleutels),
        handmatigeInvesteringEuro: 0,
        maatregelPrijzenEuro: opgeslagen.maatregelPrijzenEuro,
      };
    }
    return {
      naam: opgeslagen.naam,
      pand: asIs,
      kamerBewerkt: false,
      energielabelDoel: null,
      sleutels: new Set(opgeslagen.sleutels),
      handmatigeInvesteringEuro: 0,
      maatregelPrijzenEuro: {},
    };
  });
}

/** Herstelt de sessionStorage-snapshot terug naar `ScenarioSlot[]` (Set van sleutels) — het
 * spiegelbeeld van de serialisatie in `slaSnapshotOp`. Geen legacy-migratie nodig zoals bij
 * `slotsUitScenarios`: dit is ephemere sessionStorage, niet een langdurig opgeslagen deal, dus een
 * snapshot in een verouderd formaat faalt gewoon de `safeParse` en wordt genegeerd (zie
 * `haalEnWisVergelijkingSnapshotOp`). */
function slotsUitSnapshot(slots: VergelijkingSnapshot['slots']): ScenarioSlot[] {
  return slots.map((s) => ({
    naam: s.naam,
    pand: s.pand,
    kamerBewerkt: s.kamerBewerkt,
    energielabelDoel: s.energielabelDoel,
    sleutels: new Set(s.sleutels),
    handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
    maatregelPrijzenEuro: s.maatregelPrijzenEuro,
  }));
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
 * over een hook) die elk live herrekenen — geen laadindicator, geen API-call per klik. Elk
 * scenario heeft z'n eigen tabblad met optimalisaties (sinds 2026-09-05, zie
 * `useScenarioPakket.ts`); geen gedeelde checkboxtabel meer die niet samenwerkte met een
 * handmatige kamerbewerking.
 */
export function Vergelijking({
  pand,
  tarievenset,
  peildatum,
  kostencatalogus,
  verwervingswaardeEuro,
  asIsWaardering,
  geladenDeal,
}: {
  pand: PandInvoer;
  tarievenset: Tarievenset;
  peildatum: string;
  kostencatalogus: Kostencatalogus;
  verwervingswaardeEuro: number | undefined;
  asIsWaardering: PandWaardering;
  geladenDeal?: GeladenDeal;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<ScenarioSlot[]>(() => (geladenDeal ? slotsUitScenarios(geladenDeal.scenarios, pand) : standaardSlots(pand)));
  const [actieveTab, setActieveTab] = useState(0);
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
  // Twee routes zetten deze snapshot vóór vertrek: "Bewerk handmatig →" (naar /woning/nieuw) en
  // "Bekijk volledig resultaat →" (naar /woning/resultaat). Beide unmounten dit component; zonder
  // snapshot zou elke niet-opgeslagen wijziging (een net toegevoegde kamer, een andere slotnaam,
  // een nog niet opgeslagen deal-koppeling) verloren gaan zodra je terugkeert — dat was de bug
  // ("kamer toevoegen bij een scenario en dan het resultaat bekijken liet 'm weer verdwijnen").
  //
  // Een snapshot zónder `resultaat` is dus GEEN verweesde state meer om te negeren (dat was hij
  // vóór 2026-09-01 wél, toen alleen de /woning/nieuw-route deze snapshot zette): hij betekent nu
  // "kom terug van /woning/resultaat, of een afgebroken /woning/nieuw-bewerking" — in beide gevallen
  // is de snapshot precies de staat van vóór vertrek en dus veilig om toe te passen.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const resultaat = haalEnWisScenarioBewerkResultaatOp();
    const snapshot = haalEnWisVergelijkingSnapshotOp();
    if (!snapshot && !resultaat) return;
    const basisSlots = snapshot ? slotsUitSnapshot(snapshot.slots) : slots;
    setSlots(
      resultaat
        ? basisSlots.map((s, i) =>
            i === resultaat.slotIndex
              ? // Eerder gekozen labelwisseling/maatregelen/investering/prijzen blijven behouden —
                // alleen het pand zelf wordt vervangen door de kamer-bewerking.
                { ...s, pand: resultaat.bewerktPand, kamerBewerkt: true }
              : s,
          )
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
  // useScenarioPakket-aanroepen eronder. Elk scenario heeft nu altijd een `pand` (2026-09-05),
  // dus dit levert voor elk scenario de maatregelen op die specifiek op DAT pand van toepassing
  // zijn — voor een onaangeraakt scenario is dat het pand van de as-is zelf.
  const handmatigeKandidaten0 = useHandmatigeKandidaten(slots[0], tarievenset, peildatum, kostencatalogus);
  const handmatigeKandidaten1 = useHandmatigeKandidaten(slots[1], tarievenset, peildatum, kostencatalogus);
  const handmatigeKandidaten2 = useHandmatigeKandidaten(slots[2], tarievenset, peildatum, kostencatalogus);
  const handmatigeKandidatenPerSlot = [handmatigeKandidaten0, handmatigeKandidaten1, handmatigeKandidaten2];

  const pakket0 = useScenarioPakket(pand, slots[0], handmatigeKandidaten0, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const pakket1 = useScenarioPakket(pand, slots[1], handmatigeKandidaten1, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const pakket2 = useScenarioPakket(pand, slots[2], handmatigeKandidaten2, tarievenset, peildatum, kostencatalogus, verwervingswaardeEuro);
  const berekendePakketten = [pakket0, pakket1, pakket2];

  /** Zet een maatregel aan/uit op een scenario-tabblad zonder het (eventueel al bewerkte) pand of
   * een eventuele energielabel-wisseling te verliezen. */
  function toggleHandmatigeMaatregel(slotIndex: number, sleutel: string) {
    setSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIndex) return s;
        const handmatigeKandidaten = handmatigeKandidatenPerSlot[i]?.kandidaten ?? [];
        const sleutels = nieuweSelectieNaToggle(handmatigeKandidaten, s.sleutels, sleutel);
        return { ...s, sleutels };
      }),
    );
  }

  function zetHandmatigeInvestering(slotIndex: number, euro: number) {
    setSlots((prev) => prev.map((s, i) => (i === slotIndex ? { ...s, handmatigeInvesteringEuro: euro } : s)));
  }

  /** Per-maatregel prijsoverschrijving (Tussenfase-taak D) — voorgevuld in de UI met de
   * catalogusprijs, hier alleen de expliciete overschrijving zelf opgeslagen. Werkt voor beide
   * scenariosoorten, zelfde reden als `toggleHandmatigeMaatregel`. */
  function zetMaatregelPrijs(slotIndex: number, sleutel: string, euro: number) {
    setSlots((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, maatregelPrijzenEuro: { ...s.maatregelPrijzenEuro, [sleutel]: euro } } : s)),
    );
  }

  function naamWijzig(index: number, naam: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, naam } : s)));
  }

  function leegmaken(index: number) {
    setSlots((prev) => prev.map((s, i) => (i === index ? leegSlot(s.naam, pand) : s)));
  }

  /** Wisselknop (Tussenfase-taak C): zet alleen de energielabel-laag, boven op wat er verder al in
   * dit slot zit (kamerbewerking, maatregelen) — sinds 2026-09-07 (feedback Emma Morrison: "ik kan
   * helemaal niks meer als ik een scenario selecteer, hij overschrijft ook mijn extra
   * huuropbrengsten van extra gerealiseerde kamers") geen exclusieve vervanging meer. `null` (de
   * "Geen"-optie) haalt alleen de labelwisseling weer weg; voor een volledige reset is er de
   * losstaande "Leegmaken"-knop. */
  function wisselEnergielabel(index: number, doelLabel: Energielabel | null) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, energielabelDoel: doelLabel } : s)));
  }

  /** Slaat de huidige (mogelijk nog niet opgeslagen) slots-state op, te herstellen door de
   * useEffect hierboven zodra deze pagina na een volledige navigatie weg opnieuw mount. */
  function slaSnapshotOp() {
    slaVergelijkingSnapshotOp({
      dealId,
      dealNaam,
      dealNotitie,
      dealMap,
      slots: slots.map((s) => ({
        naam: s.naam,
        pand: s.pand,
        kamerBewerkt: s.kamerBewerkt,
        energielabelDoel: s.energielabelDoel,
        sleutels: [...s.sleutels],
        handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
        maatregelPrijzenEuro: s.maatregelPrijzenEuro,
      })),
    });
  }

  function bewerkHandmatig(index: number) {
    const terugUrl = dealId ? `/woning/vergelijking?deal=${dealId}` : '/woning/vergelijking';
    slaSnapshotOp();
    slaScenarioBewerkStartOp({
      asIsPand: pand,
      slotIndex: index,
      naam: slots[index].naam,
      terugUrl,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
    });
    router.push(`/woning/nieuw?scenario=${index}`);
  }

  /** Een onaangeraakt scenario (geen kamers bewerkt, geen energielabel-wisseling, geen
   * maatregelen, geen investering) draagt geen informatie en wordt overgeslagen — zelfde
   * discipline als de vroegere lege "kandidaten"-modus. Zodra er wél iets is (een bewerkte kamer,
   * een gekozen doellabel, een aangevinkte maatregel, een ingevuld investeringsbedrag) wordt het
   * scenario altijd opgeslagen, altijd als het uniforme `'handmatig'`-type (Tussenfase-taak C,
   * uitgebreid 2026-09-07: `'energielabel'` is alleen nog een leesbaar legacy-formaat). */
  function opslaanbareScenarios(): ScenarioSelectie[] {
    return slots.flatMap((s): ScenarioSelectie[] => {
      const onaangeraakt = !s.kamerBewerkt && !s.energielabelDoel && s.sleutels.size === 0 && s.handmatigeInvesteringEuro === 0;
      if (onaangeraakt) return [];
      return [
        {
          soort: 'handmatig',
          naam: s.naam,
          pand: s.pand,
          kamerBewerkt: s.kamerBewerkt,
          energielabelDoel: s.energielabelDoel ?? undefined,
          sleutels: [...s.sleutels],
          handmatigeInvesteringEuro: s.handmatigeInvesteringEuro,
          maatregelPrijzenEuro: s.maatregelPrijzenEuro,
        },
      ];
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
    router.push('/woning/resultaat');
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
    // Met een opgeslagen deal is /woning/resultaat?deal=<id> bruikbaar (bookmark, nieuwe tab,
    // gedeelde link) — navigatie-audit 2026-09-04. Zonder dealId (nog niet opgeslagen pand)
    // bestaat er niets om naar te verwijzen; dan blijft de sessionStorage-brug de enige route.
    router.push(dealId ? `/woning/resultaat?deal=${dealId}` : '/woning/resultaat');
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
      router.replace(`/woning/vergelijking?deal=${deal.id}`);
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
          <input value={dealNaam} onChange={(e) => setDealNaam(e.target.value)} aria-label="Naam van de woning" className={styles.dealNaamVeld} />
          {nieuweMapModus ? (
            <span className={styles.dealMapNieuw}>
              <input
                autoFocus
                value={dealMap}
                onChange={(e) => setDealMap(e.target.value)}
                onBlur={() => {
                  if (!dealMap) setNieuweMapModus(false);
                }}
                onKeyDown={(e) => {
                  // Enter direct laten opslaan (i.p.v. alleen de "Opslaan"-knop verderop in de
                  // rij) — op smalle schermen kan die knop buiten beeld staan zodra deze rij
                  // wrapt, waardoor het leek alsof een nieuwe map helemaal niet op te slaan was
                  // (feedback Emma, 2026-09-09).
                  if (e.key === 'Enter' && dealMap) {
                    e.preventDefault();
                    dealOpslaan();
                  }
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
            {dealId ? 'Opslaan' : 'Woning opslaan'}
          </button>
          {opslaanStatus === 'gelukt' && <span className={styles.opslaanGelukt}>Opgeslagen ✓</span>}
          {opslaanStatus === 'fout' && <span className={styles.opslaanFout}>Opslaan mislukt: {opslaanFoutmelding}</span>}
        </div>
        <Link href="/woningen" className={styles.dealenLink}>
          Mijn woningen →
        </Link>
        <textarea
          value={dealNotitie}
          onChange={(e) => setDealNotitie(e.target.value)}
          aria-label="Notitie bij deze woning"
          placeholder="Notitie bij deze woning (optioneel, zichtbaar in het woningen-overzicht)…"
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
            energielabelDoel: slot.energielabelDoel,
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
        <h2 className={styles.optimalisatiesTitel}>Optimalisaties</h2>
        <div className={styles.scenarioTabsBlok}>
          <div className={styles.tabBalk} role="tablist" aria-label="Scenario">
            {slots.map((slot, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={actieveTab === i}
                className={actieveTab === i ? `${styles.tab} ${styles.tabActief}` : styles.tab}
                onClick={() => setActieveTab(i)}
              >
                {slot.naam}
              </button>
            ))}
          </div>
          {slots.map((slot, i) => {
            if (i !== actieveTab) return null;
            const resultaat = handmatigeKandidatenPerSlot[i];
            return (
              <div key={i}>
                {slot.energielabelDoel && (
                  <p className={styles.hint} style={{ padding: '0.9rem 1.2rem 0' }}>
                    Dit scenario wisselt eerst naar label {slot.energielabelDoel}; de standaardmaatregelen hieronder (en een eventuele kamerbewerking)
                    tellen daar bovenop. Kies &quot;Geen energielabel-scenario&quot; in de kolomkop hierboven om de labelwisseling weer los te maken.
                  </p>
                )}
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
        </div>
      </main>
    </div>
  );
}
