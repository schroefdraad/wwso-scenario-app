'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  huidigeVersiestempel,
  pasScenarioToe,
  type Energielabel,
  type PandInvoer,
  type PandWaardering,
} from '@wwso/engine';
import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import {
  useHandmatigeKandidaten,
  useScenarioPakket,
  type ScenarioSlot,
} from '../../lib/vergelijking/useScenarioPakket';
import {
  beschikbareEnergielabelDoelen,
  nieuweSelectieNaToggle,
} from '../../lib/vergelijking/scenario-bouw';
import {
  isOnaangeraakt,
  kopieerSlot,
  leegSlot,
  moetOpslaanNaScenarioBewerking,
  opslaanbareScenarios as naarOpslaanbareScenarios,
  slotsUitScenarios,
  standaardSlots,
} from '../../lib/vergelijking/scenarioSlots';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { maakDealAan, werkDealBij, haalMappen } from '../../lib/deals/opslag';
import {
  haalEnWisScenarioBewerkResultaatOp,
  haalEnWisVergelijkingSnapshotOp,
  bepaalVergelijkingHerstel,
  maakScenarioBewerkStart,
  pasScenarioResultaatToe,
  slaScenarioBewerkStartOp,
  slaVergelijkingSnapshotOp,
  type VergelijkingSnapshot,
} from '../../lib/vergelijking/scenarioBewerkBrug';
import { AppHeader, WoningContextStrook, kamersLabel } from '../AppHeader';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { bepaalOpslaanActie, type ScenarioSelectie } from '../../lib/deals/types';
import {
  resultaatUrl,
  scenarioBewerkenUrl,
  vergelijkingUrl,
  woningBewerkenUrl,
} from '../../lib/navigatie';
import { SamenvattingRij } from './SamenvattingRij';
import { HandmatigMaatregelen } from './HandmatigMaatregelen';
import styles from './styles.module.css';

const NIEUWE_MAP_OPTIE = '__nieuwe_map__';

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
  /** Zie `bewerktDeal` in `lib/invoer/types.ts` — zelfde betekenis, zelfde bron (`magDealBewerken`). */
  magBewerken: boolean;
  bewerkrechtenOnzeker: boolean;
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
  const [slots, setSlots] = useState<ScenarioSlot[]>(() =>
    geladenDeal ? slotsUitScenarios(geladenDeal.scenarios, pand) : standaardSlots(pand),
  );
  const [actieveTab, setActieveTab] = useState(0);
  const [dealId, setDealId] = useState<string | undefined>(geladenDeal?.id);
  const [dealNaam, setDealNaam] = useState(geladenDeal?.naam ?? pand.pand.adres);
  const [dealNotitie, setDealNotitie] = useState(geladenDeal?.notitie ?? '');
  const [dealMap, setDealMap] = useState(geladenDeal?.map ?? '');
  // Een nog niet opgeslagen woning is altijd van jezelf; na een kopie (zie `bewaar`) ook.
  const [magBewerken, setMagBewerken] = useState(geladenDeal?.magBewerken ?? true);
  const bewerkrechtenOnzeker = geladenDeal?.bewerkrechtenOnzeker ?? false;
  const [mappen, setMappen] = useState<string[]>([]);
  const [nieuweMapModus, setNieuweMapModus] = useState(false);
  const [opslaanStatus, setOpslaanStatus] = useState<'idle' | 'bezig' | 'gelukt' | 'fout'>('idle');
  useDocumentTitle(`${dealNaam} · Vergelijking · WWSO Scenario App`);
  const [opslaanFoutmelding, setOpslaanFoutmelding] = useState<string | undefined>(undefined);
  // Opslaan ná de volgende render, zodat `bewaar` de zojuist gezette slots ziet (na "Gebruik als
  // scenario" en na kopiëren, 2026-10-06).
  const [opslaanGevraagd, setOpslaanGevraagd] = useState(false);
  const [nietOpgeslagenMelding, setNietOpgeslagenMelding] = useState<string | undefined>(undefined);
  const [kopieBevestiging, setKopieBevestiging] = useState<{ van: number; naar: number } | null>(
    null,
  );

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
    const { snapshot, resultaat } = bepaalVergelijkingHerstel(
      haalEnWisVergelijkingSnapshotOp(),
      haalEnWisScenarioBewerkResultaatOp(),
      geladenDeal?.id,
    );
    if (!snapshot && !resultaat) return;
    const basisSlots = snapshot ? slotsUitSnapshot(snapshot.slots) : slots;
    setSlots(pasScenarioResultaatToe(basisSlots, resultaat));
    if (snapshot) {
      setDealId(snapshot.dealId);
      setDealNaam(snapshot.dealNaam);
      setDealNotitie(snapshot.dealNotitie);
      setDealMap(snapshot.dealMap);
    }
    // Terug van "Scenario bewerken": meteen opslaan (2026-10-06), anders stond de kamerbewerking
    // alleen in het geheugen. Bij alleen-lezen/onzeker niet — dan zou opslaan een kopie maken.
    if (resultaat) {
      if (
        moetOpslaanNaScenarioBewerking({ heeftResultaat: true, magBewerken, bewerkrechtenOnzeker })
      )
        setOpslaanGevraagd(true);
      else
        setNietOpgeslagenMelding(
          'Scenario niet opgeslagen: deze woning is alleen-lezen. Klik op Opslaan om een eigen kopie te maken.',
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!opslaanGevraagd) return;
    setOpslaanGevraagd(false);
    void dealOpslaan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opslaanGevraagd]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Drie expliciete aanroepen (rules-of-hooks: geen .map over een hook), zelfde patroon als de
  // useScenarioPakket-aanroepen eronder. Elk scenario heeft nu altijd een `pand` (2026-09-05),
  // dus dit levert voor elk scenario de maatregelen op die specifiek op DAT pand van toepassing
  // zijn — voor een onaangeraakt scenario is dat het pand van de as-is zelf.
  const handmatigeKandidaten0 = useHandmatigeKandidaten(
    pand,
    slots[0],
    tarievenset,
    peildatum,
    kostencatalogus,
  );
  const handmatigeKandidaten1 = useHandmatigeKandidaten(
    pand,
    slots[1],
    tarievenset,
    peildatum,
    kostencatalogus,
  );
  const handmatigeKandidaten2 = useHandmatigeKandidaten(
    pand,
    slots[2],
    tarievenset,
    peildatum,
    kostencatalogus,
  );
  const handmatigeKandidatenPerSlot = [
    handmatigeKandidaten0,
    handmatigeKandidaten1,
    handmatigeKandidaten2,
  ];

  const pakket0 = useScenarioPakket(
    pand,
    slots[0],
    handmatigeKandidaten0,
    tarievenset,
    peildatum,
    kostencatalogus,
    verwervingswaardeEuro,
  );
  const pakket1 = useScenarioPakket(
    pand,
    slots[1],
    handmatigeKandidaten1,
    tarievenset,
    peildatum,
    kostencatalogus,
    verwervingswaardeEuro,
  );
  const pakket2 = useScenarioPakket(
    pand,
    slots[2],
    handmatigeKandidaten2,
    tarievenset,
    peildatum,
    kostencatalogus,
    verwervingswaardeEuro,
  );
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
    setSlots((prev) =>
      prev.map((s, i) => (i === slotIndex ? { ...s, handmatigeInvesteringEuro: euro } : s)),
    );
  }

  /** Per-maatregel prijsoverschrijving (Tussenfase-taak D) — voorgevuld in de UI met de
   * catalogusprijs, hier alleen de expliciete overschrijving zelf opgeslagen. Werkt voor beide
   * scenariosoorten, zelfde reden als `toggleHandmatigeMaatregel`. */
  function zetMaatregelPrijs(slotIndex: number, sleutel: string, euro: number) {
    setSlots((prev) =>
      prev.map((s, i) =>
        i === slotIndex
          ? { ...s, maatregelPrijzenEuro: { ...s.maatregelPrijzenEuro, [sleutel]: euro } }
          : s,
      ),
    );
  }

  function naamWijzig(index: number, naam: string) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, naam } : s)));
  }

  function leegmaken(index: number) {
    setSlots((prev) => prev.map((s, i) => (i === index ? leegSlot(s.naam, pand) : s)));
  }

  /** "Kopiëren naar" (2026-10-06): kopie in een ander slot, gevuld doel alleen na bevestiging,
   * daarna meteen opslaan en naar het tabblad van de kopie. */
  function kopieer(van: number, naar: number, overschrijvenBevestigd: boolean) {
    const uitkomst = kopieerSlot(slots, van, naar, { overschrijvenBevestigd });
    if (uitkomst.soort === 'bevestiging-nodig') {
      setKopieBevestiging({ van, naar });
      return;
    }
    setKopieBevestiging(null);
    if (uitkomst.soort !== 'gekopieerd') return;
    setSlots(uitkomst.slots);
    setActieveTab(naar);
    setOpslaanGevraagd(true);
  }

  /** Wisselknop (Tussenfase-taak C): zet alleen de energielabel-laag, boven op wat er verder al in
   * dit slot zit (kamerbewerking, maatregelen) — sinds 2026-09-07 (feedback Emma Morrison: "ik kan
   * helemaal niks meer als ik een scenario selecteer, hij overschrijft ook mijn extra
   * huuropbrengsten van extra gerealiseerde kamers") geen exclusieve vervanging meer. `null` (de
   * "Geen"-optie) haalt alleen de labelwisseling weer weg; voor een volledige reset is er de
   * losstaande "Leegmaken"-knop. */
  function wisselEnergielabel(index: number, doelLabel: Energielabel | null) {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, energielabelDoel: doelLabel } : s)),
    );
  }

  /** Slaat de huidige (mogelijk nog niet opgeslagen) slots-state op, te herstellen door de
   * useEffect hierboven zodra deze pagina na een volledige navigatie weg opnieuw mount. */
  function slaSnapshotOp(idVoorSnapshot: string | undefined) {
    slaVergelijkingSnapshotOp({
      dealId: idVoorSnapshot,
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

  async function bewerkHandmatig(index: number) {
    const vertrek = await bewaarVoorVertrek();
    if (!vertrek.gelukt) return;
    const id = vertrek.dealId;
    const terugUrl = vergelijkingUrl(id);
    slaSnapshotOp(id);
    // `slots[index].pand`, niet het top-level AS-IS `pand` (2026-10-02, gemeld tijdens testen):
    // voor een al eerder handmatig bewerkt scenario IS slots[index].pand al het bewerkte TO-BE
    // (zie regel ~181, `kamerBewerkt: true` zet 'm daarop) — een tweede keer "Bewerk handmatig"
    // moet daar verder bouwen, niet terugvallen naar AS-IS en alle eerdere edits aan dit scenario
    // verliezen. Voor een nog onaangeraakt slot is `slots[index].pand` toch al gelijk aan AS-IS
    // (zie `standaardSlots`/`leegScenario`), dus dit verandert niets aan het bestaande gedrag
    // voor een vers scenario.
    slaScenarioBewerkStartOp(
      maakScenarioBewerkStart(slots[index], index, id, terugUrl, {
        tarievensetPeildatum: tarievenset.peildatum,
        kostencatalogusVersie: kostencatalogus.versie,
      }),
    );
    router.push(scenarioBewerkenUrl(index));
  }

  function opslaanbareScenarios() {
    return naarOpslaanbareScenarios(slots);
  }

  async function bekijkResultaat(index: number) {
    const pakket = berekendePakketten[index];
    if (!pakket) return;
    const vertrek = await bewaarVoorVertrek();
    if (!vertrek.gelukt) return;
    const scenarioPand = pasScenarioToe(pand, pakket.scenario.mutaties);
    slaSnapshotOp(vertrek.dealId);
    slaPandOp({
      pand: scenarioPand,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      // Behoudt de deal-koppeling op de heen-en-terug-reis naar het resultaatscherm (backlog:
      // as-is bewerken) — anders verschijnt deze deal bij terugkeer hier als een nieuwe.
      dealId: vertrek.dealId,
      dealNaam,
      dealNotitie,
      dealMap,
      dealScenarios: opslaanbareScenarios(),
    });
    // Scenario-resultaat: bewust zonder `?deal=` (zie `resultaatUrl`) — loopt via `slaPandOp`.
    router.push(resultaatUrl(undefined));
  }

  /** Zelfde reis als `bekijkResultaat`, maar dan voor de as-is kolom zelf — voorheen alleen
   * bereikbaar via de browser-terugknop (feedback tijdens het testen, 2026-08-24). */
  async function bekijkAsIsResultaat() {
    const vertrek = await bewaarVoorVertrek();
    if (!vertrek.gelukt) return;
    slaSnapshotOp(vertrek.dealId);
    slaPandOp({
      pand,
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      dealId: vertrek.dealId,
      dealNaam,
      dealNotitie,
      dealMap,
      dealScenarios: opslaanbareScenarios(),
    });
    // Met een opgeslagen deal is /woning/resultaat?deal=<id> bruikbaar (bookmark, nieuwe tab,
    // gedeelde link) — navigatie-audit 2026-09-04. Zonder dealId (nog niet opgeslagen pand)
    // bestaat er niets om naar te verwijzen; dan blijft de sessionStorage-brug de enige route.
    router.push(resultaatUrl(vertrek.dealId));
  }

  /** "Woning bewerken →" bij de as-is — was een gewone link zonder opslaan of snapshot, waardoor
   * niet-opgeslagen scenariowijzigingen stil verdwenen (staat-navigatie-audit 2026-10-03). */
  async function bewerkAsIs() {
    const vertrek = await bewaarVoorVertrek();
    if (!vertrek.gelukt || !vertrek.dealId) return;
    slaSnapshotOp(vertrek.dealId);
    router.push(woningBewerkenUrl(vertrek.dealId));
  }

  /**
   * Slaat de woning op en geeft het (eventueel nieuwe) id terug, of `null` bij een fout — de
   * foutmelding staat dan al in beeld. Bij een woning die je niet mag bewerken (demo-woning, andere
   * org) wordt een eigen kopie gemaakt, zelfde gedrag als "Opslaan" op het invoerscherm; daarna is
   * de pagina aan die kopie gekoppeld.
   */
  async function bewaar(): Promise<string | null> {
    setOpslaanStatus('bezig');
    setOpslaanFoutmelding(undefined);
    try {
      const actie = bepaalOpslaanActie({ dealId, magBewerken, bewerkrechtenOnzeker });
      if (actie === 'geblokkeerd')
        throw new Error('Bewerkrechten konden niet bevestigd worden — ververs de pagina');
      const kopie = actie === 'kopie';
      const invoer = {
        naam: kopie ? `${dealNaam} (kopie)` : dealNaam,
        notitie: dealNotitie,
        map: dealMap,
        pandInvoer: pand,
        scenarios: opslaanbareScenarios(),
        versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
      };
      const deal =
        actie === 'bijwerken' && dealId
          ? await werkDealBij(dealId, invoer)
          : await maakDealAan(invoer);
      setDealId(deal.id);
      setDealNaam(deal.naam);
      setMagBewerken(true);
      setOpslaanStatus('gelukt');
      // Een net getypte nieuwe mapnaam is nu echt opgeslagen — terug naar de dropdown en die
      // meteen als keuzeoptie tonen, anders lijkt het net alsof er niets is gebeurd (feedback
      // Emma, 2026-09-04: "kun je niet meer terug naar dropdown").
      if (nieuweMapModus) {
        setNieuweMapModus(false);
        setMappen((huidig) =>
          dealMap && !huidig.includes(dealMap)
            ? [...huidig, dealMap].sort((a, b) => a.localeCompare(b))
            : huidig,
        );
      }
      return deal.id;
    } catch (err) {
      setOpslaanFoutmelding(err instanceof Error ? err.message : String(err));
      setOpslaanStatus('fout');
      return null;
    }
  }

  async function dealOpslaan() {
    const id = await bewaar();
    if (id) setNietOpgeslagenMelding(undefined);
    if (id) router.replace(vergelijkingUrl(id));
  }

  /**
   * Elke stap naar een volgend scherm slaat eerst op en gaat alleen door als dat gelukt is
   * (besluit gebruiker 2026-10-03: "automatisch opslaan en altijd checken dat er is opgeslagen als
   * je naar een volgende stap gaat"). Uitzondering: een woning die je niet mag bewerken of waarvan
   * de rechten niet bevestigd konden worden — daar wordt níet stilzwijgend een kopie gemaakt (dat
   * liet het aantal kopieën eerder uit de hand lopen); de snapshot dekt de terugweg dan af.
   */
  async function bewaarVoorVertrek(): Promise<
    { gelukt: true; dealId: string | undefined } | { gelukt: false }
  > {
    if (opslaanStatus === 'bezig') return { gelukt: false };
    if (bewerkrechtenOnzeker || !magBewerken) return { gelukt: true, dealId };
    const id = await bewaar();
    return id ? { gelukt: true, dealId: id } : { gelukt: false };
  }

  return (
    <div className={styles.wrap}>
      <AppHeader titel="Scenariovergelijking" />
      <WoningContextStrook
        onderdelen={[pand.pand.adres, pand.pand.stad, kamersLabel(pand.pand.aantalKamers)]}
        rechts={
          // Naam/map/opslaan rechts in de strook (feedback 2026-10-03); het notitieveld staat
          // alleen nog op het invoerscherm — `dealNotitie` gaat ongewijzigd mee bij opslaan.
          <div className={styles.dealOpslaan}>
            <input
              value={dealNaam}
              onChange={(e) => setDealNaam(e.target.value)}
              aria-label="Naam van de woning"
              className={styles.dealNaamVeld}
            />
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
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimair}`}
              onClick={dealOpslaan}
              disabled={opslaanStatus === 'bezig' || bewerkrechtenOnzeker}
              title={
                bewerkrechtenOnzeker
                  ? 'Bewerkrechten konden niet bevestigd worden — ververs de pagina'
                  : !magBewerken
                    ? 'Deze woning is alleen-lezen, opslaan maakt een nieuwe, eigen kopie.'
                    : undefined
              }
            >
              {dealId ? 'Opslaan' : 'Woning opslaan'}
            </button>
            {bewerkrechtenOnzeker && (
              <span className={styles.opslaanFout}>
                Bewerkrechten konden niet bevestigd worden — ververs de pagina
              </span>
            )}
            {opslaanStatus === 'gelukt' && (
              <span className={styles.opslaanGelukt}>Opgeslagen ✓</span>
            )}
            {opslaanStatus === 'fout' && (
              <span className={styles.opslaanFout}>Opslaan mislukt: {opslaanFoutmelding}</span>
            )}
            {nietOpgeslagenMelding && (
              <span className={styles.opslaanFout}>{nietOpgeslagenMelding}</span>
            )}
          </div>
        }
      />
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
          onBewerkAsIs={bewerkAsIs}
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
                <ScenarioKopieren
                  index={i}
                  slots={slots}
                  bevestiging={kopieBevestiging?.van === i ? kopieBevestiging.naar : null}
                  uitgeschakeld={!magBewerken || bewerkrechtenOnzeker || opslaanStatus === 'bezig'}
                  onKopieer={(naar, bevestigd) => kopieer(i, naar, bevestigd)}
                  onAnnuleer={() => setKopieBevestiging(null)}
                />
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

/** Knoppen "Kopiëren naar Scenario X" boven de maatregelen van het actieve tabblad (2026-10-06). */
function ScenarioKopieren({
  index,
  slots,
  bevestiging,
  uitgeschakeld,
  onKopieer,
  onAnnuleer,
}: {
  index: number;
  slots: ScenarioSlot[];
  bevestiging: number | null;
  uitgeschakeld: boolean;
  onKopieer: (naar: number, overschrijvenBevestigd: boolean) => void;
  onAnnuleer: () => void;
}) {
  const bron = slots[index];
  if (!bron) return null;
  if (bevestiging !== null) {
    return (
      <div className={styles.scenarioKopieren} role="alert">
        <span>
          &ldquo;{slots[bevestiging]?.naam}&rdquo; is niet leeg. Overschrijven met een kopie van
          &ldquo;{bron.naam}&rdquo;?
        </span>
        <button type="button" className={styles.btn} onClick={() => onKopieer(bevestiging, true)}>
          Ja, overschrijven
        </button>
        <button type="button" className={styles.btn} onClick={onAnnuleer}>
          Annuleren
        </button>
      </div>
    );
  }
  const leeg = isOnaangeraakt(bron);
  const uitleg = uitgeschakeld
    ? 'Deze woning is alleen-lezen. Sla eerst een eigen kopie op.'
    : leeg
      ? 'Dit scenario is nog leeg.'
      : undefined;
  return (
    <div className={styles.scenarioKopieren}>
      <span>Kopiëren naar:</span>
      {slots.map((doel, naar) =>
        naar === index ? null : (
          <button
            key={naar}
            type="button"
            className={styles.btn}
            disabled={uitgeschakeld || leeg}
            title={uitleg}
            onClick={() => onKopieer(naar, false)}
          >
            {doel.naam}
          </button>
        ),
      )}
    </div>
  );
}
