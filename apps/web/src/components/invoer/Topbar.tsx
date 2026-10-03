'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { alleTarievensets, nieuwsteKostencatalogus } from '@wwso/data';
import { huidigeVersiestempel } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { HomeLogo } from '../HomeLogo';
import { ontbrekendeStap, projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { slaScenarioBewerkResultaatOp } from '../../lib/vergelijking/scenarioBewerkBrug';
import { maakDealAan, werkDealBij } from '../../lib/deals/opslag';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import styles from './styles.module.css';

export function Topbar() {
  const { state, dispatch } = useInvoer();
  const router = useRouter();
  const stap = useMemo(() => ontbrekendeStap(state), [state]);
  const pand = useMemo(() => projecteerNaarPandInvoer(state), [state]);
  useDocumentTitle(`${state.pand.adres || 'Nieuwe woning'} · WWSO Scenario App`);
  const [dealOpslaanStatus, setDealOpslaanStatus] = useState<'idle' | 'bezig' | 'gelukt' | 'fout' | 'onzeker'>('idle');

  /**
   * Gedeelde opslaan-logica achter zowel de "Woning opslaan"-knop als "Doorrekenen →"
   * (backlog 2026-09-08, gemeld via Steven Kramer: "'s-Gravesandestraat 78" was na doorrekenen +
   * PDF downloaden nergens meer te vinden — hij had nooit apart op "Woning opslaan" geklikt, en
   * "Doorrekenen" sloeg tot dan toe alleen naar sessionStorage op, nooit naar Supabase). Geeft de
   * opgeslagen `Deal` terug, of `null` als opslaan mislukte — de aanroeper beslist dan zelf of
   * hij wel/niet verder navigeert (bij een mislukte save NIET wegnavigeren, anders is de invoer
   * alsnog kwijt).
   */
  // Multi-tenant org-scheiding (2026-09-28): een woning die wél zichtbaar is maar niet van de
  // eigen org (de permanente demo-woning, zie `magBewerken` op `bewerktDeal`) mag niet met
  // `werkDealBij` bijgewerkt worden — de RLS `with check` zou dat alsnog weigeren (42501), een
  // rauwe foutmelding voor iets dat de UI had moeten voorkomen. In plaats daarvan maakt "Opslaan"
  // dan gewoon een nieuwe, eigen kopie (zelfde patroon als de bestaande "⧉ Kopiëren"-knop op
  // /woningen), en de sessie koppelt vanaf dat moment aan díe nieuwe, wél bewerkbare woning.
  const magBewerken = !state.bewerktDeal || state.bewerktDeal.magBewerken;
  // Zie de uitleg bij `bewerkrechtenOnzeker` in `lib/invoer/types.ts`. Bewust los van `magBewerken`
  // gehouden: "bevestigd niet van mij" (demo-woning/andere org) mag gewoon forken zoals ontworpen,
  // alleen "kon niet bevestigd worden" wordt hier geblokkeerd.
  const bewerkrechtenOnzeker = state.bewerktDeal?.bewerkrechtenOnzeker ?? false;

  /**
   * `forceerKopie` (2026-10-02, vervolg op de vorige fix): bij onzekere bewerkrechten blokkeert
   * `slaWoningOp` zichzelf standaard (geen fork via de hoofdknoppen, zie hieronder) — maar
   * volledig blokkeren zonder ontsnapping is ook niet goed: bij een écht aanhoudende storing (niet
   * transiënt, retry in `profiel.ts` heeft al geen effect) zit je dan alsnog helemaal vast, ook
   * als je weloverwogen tóch verder wil als kopie. Daarom een losse, bewust secundaire knop
   * ("Toch opslaan als nieuwe kopie →", alleen zichtbaar bij onzekere bewerkrechten) die deze
   * functie met `forceerKopie: true` aanroept — een aparte, duidelijk gelabelde knop i.p.v. een
   * confirm()-dialoog die je per ongeluk wegklikt.
   */
  async function slaWoningOp(forceerKopie = false) {
    if (!pand) return null;
    if (bewerkrechtenOnzeker && !forceerKopie) {
      setDealOpslaanStatus('onzeker');
      return null;
    }
    setDealOpslaanStatus('bezig');
    try {
      const tarievenset = alleTarievensets().at(-1)!;
      const kostencatalogus = nieuwsteKostencatalogus();
      const naam = state.bewerktDeal
        ? magBewerken
          ? state.bewerktDeal.naam
          : `${state.bewerktDeal.naam} (kopie)`
        : pand.pand.adres || 'Naamloze woning';
      const invoer = {
        naam,
        notitie: state.notitieOntwerp,
        map: state.bewerktDeal?.map ?? '',
        pandInvoer: pand,
        scenarios: state.bewerktDeal?.scenarios ?? [],
        versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
      };
      const deal = state.bewerktDeal && magBewerken ? await werkDealBij(state.bewerktDeal.id, invoer) : await maakDealAan(invoer);
      // Na een kopie is de sessie voortaan aan de NIEUWE, eigen woning gekoppeld — magBewerken
      // is dan altijd true, ongeacht wat de bron was.
      dispatch({ soort: 'DEAL_GEKOPPELD', deal: { id: deal.id, naam: deal.naam, notitie: deal.notitie, map: deal.map, scenarios: deal.scenarios, magBewerken: true, bewerkrechtenOnzeker: false } });
      setDealOpslaanStatus('gelukt');
      return deal;
    } catch {
      setDealOpslaanStatus('fout');
      return null;
    }
  }

  async function dealVroegOpslaan() {
    await slaWoningOp();
  }

  async function forceerKopieOpslaan() {
    await slaWoningOp(true);
  }

  /**
   * "Doorrekenen →" slaat de as-is nu altijd eerst op (zie `slaWoningOp` hierboven) vóórdat er
   * naar het resultaatscherm genavigeerd wordt — bij een mislukte save blijft de gebruiker op het
   * invoerscherm staan (met de bestaande "Opslaan mislukt"-melding) i.p.v. door te lopen naar een
   * scherm waarvandaan de invoer alsnog nergens hersteld kan worden. Geldt niet voor "Gebruik als
   * scenario →" (`state.handmatigScenario`): dat pad hoort al bij een bestaande deal via de
   * scenario-bewerk-brug, en slaat daar op zijn eigen moment op (`Vergelijking.tsx`).
   */
  async function doorrekenen() {
    if (!pand) return;
    if (state.handmatigScenario) {
      slaScenarioBewerkResultaatOp({ slotIndex: state.handmatigScenario.slotIndex, bewerktPand: pand });
      router.push(state.handmatigScenario.terugUrl);
      return;
    }
    const deal = await slaWoningOp();
    if (!deal) return;
    slaPandOp({
      pand,
      dealId: deal.id,
      dealNaam: deal.naam,
      dealNotitie: deal.notitie,
      dealMap: deal.map,
      dealScenarios: deal.scenarios,
    });
    router.push('/woning/resultaat');
  }

  const pandCompleet = !!(
    state.pand.adres &&
    state.pand.stad &&
    state.pand.coropGebied &&
    state.pand.wozOppervlak &&
    state.pand.bouwjaar
  );

      // De topnavigatie is nu zuiver navigatie (feedback 2026-10-02: "topnavigatie is voor
  // navigatie") — alle statusinfo (kameraantal, woningnaam, alleen-lezen/scenario-context) staat
  // niet meer hier, maar in de losse, niet-sticky `WoningContext` hieronder in dit bestand
  // (gerenderd door de paginacomponent net onder deze header).
  return (
    <header className={styles.topbar}>
      <HomeLogo />
      <nav className={styles.sections}>
        <a className={styles.sectionLink} href="#sectie-woning">
          ① Woning <span className={`${styles.badge} ${pandCompleet ? styles.badgeOk : ''}`}>{pandCompleet ? '✓' : '…'}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-ruimten">
          ② Ruimten <span className={`${styles.badge} ${state.ruimtes.length > 0 ? styles.badgeOk : ''}`}>{state.ruimtes.length}</span>
        </a>
        <a className={styles.sectionLink} href="#sectie-overig">
          ③ Overige posten <span className={`${styles.badge} ${styles.badgeOk}`}>✓</span>
        </a>
      </nav>
      <div className={styles.spacer} />
      <Link href="/woningen" className={styles.sectionLink}>
        Mijn woningen
      </Link>
      {!state.handmatigScenario && (
        <>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`}
            disabled={!pand || dealOpslaanStatus === 'bezig' || bewerkrechtenOnzeker}
            title={bewerkrechtenOnzeker ? 'Bewerkrechten konden niet bevestigd worden — ververs de pagina' : !pand ? (stap ?? undefined) : undefined}
            onClick={dealVroegOpslaan}
          >
            {state.bewerktDeal ? (magBewerken ? 'Opslaan' : 'Opslaan als eigen woning') : 'Woning opslaan'}
          </button>
          {dealOpslaanStatus === 'gelukt' && <span className={styles.sub}>Opgeslagen ✓</span>}
          {dealOpslaanStatus === 'fout' && <span className={styles.sub}>Opslaan mislukt</span>}
          {bewerkrechtenOnzeker && (
            <>
              <span className={styles.sub} title='Probeer eerst de pagina te verversen — dat lost het meestal op als het een tijdelijke hapering was.'>
                Bewerkrechten konden niet bevestigd worden
              </span>
              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`} disabled={!pand || dealOpslaanStatus === 'bezig'} onClick={forceerKopieOpslaan}>
                Toch opslaan als nieuwe kopie →
              </button>
            </>
          )}
        </>
      )}
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimair}`}
        disabled={!pand || (!state.handmatigScenario && dealOpslaanStatus === 'bezig') || (!state.handmatigScenario && bewerkrechtenOnzeker)}
        title={bewerkrechtenOnzeker ? 'Bewerkrechten konden niet bevestigd worden — ververs de pagina' : stap ?? undefined}
        onClick={doorrekenen}
      >
        {state.handmatigScenario ? 'Gebruik als scenario →' : dealOpslaanStatus === 'bezig' ? 'Opslaan…' : 'Doorrekenen →'}
      </button>
      {state.ruimtes.length > 0 && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${styles.btnKlein}`}
          onClick={() => {
            if (confirm('Alle ingevoerde gegevens wissen?')) dispatch({ soort: 'ALLES_GEWIST' });
          }}
        >
          Alles wissen
        </button>
      )}
    </header>
  );
}

/**
 * De statusinfo die vóór 2026-10-02 in de sticky `Topbar` stond (kameraantal, woningnaam,
 * alleen-lezen/scenario-context) — losgetrokken op feedback ("topnavigatie is voor navigatie"):
 * dit is géén navigatie, dus hoort niet in de sticky header. Eigen, niet-sticky strook net
 * daaronder, gerenderd door de paginacomponent (`app/woning/nieuw/page.tsx`).
 */
export function WoningContext() {
  const { state } = useInvoer();
  const n = parseInt(state.pand.aantalKamers, 10) || 0;
  const magBewerken = !state.bewerktDeal || state.bewerktDeal.magBewerken;

  if (!state.bewerktDeal && !state.handmatigScenario && state.ruimtes.length === 0) return null;

  return (
    <div className={styles.woningContext}>
      <span className={styles.sub}>
        {n} kamer{n === 1 ? '' : 's'}
      </span>
      {state.bewerktDeal && (
        <span className={styles.sub} title={magBewerken ? undefined : 'Deze woning is alleen-lezen — opslaan maakt een nieuwe, eigen kopie.'}>
          · &ldquo;{state.bewerktDeal.naam}&rdquo;{!magBewerken && ' (alleen-lezen)'}
        </span>
      )}
      {state.handmatigScenario && <span className={styles.sub}>· scenario &ldquo;{state.handmatigScenario.naam}&rdquo;</span>}
    </div>
  );
}
