'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { alleTarievensets, nieuwsteKostencatalogus } from '@wwso/data';
import { huidigeVersiestempel } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { AppHeader, WoningContextStrook, headerKnop, kamersLabel } from '../AppHeader';
import { ontbrekendeStap, projecteerNaarPandInvoer } from '../../lib/invoer/projecteer';
import { slaPandOp } from '../../lib/resultaat/opslag';
import { slaScenarioBewerkResultaatOp } from '../../lib/vergelijking/scenarioBewerkBrug';
import { maakDealAan, werkDealBij } from '../../lib/deals/opslag';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { bepaalOpslaanActie } from '../../lib/deals/types';
import { resultaatUrl, woningBewerkenUrl } from '../../lib/navigatie';
import { markeerZojuistGekoppeld } from '../../lib/invoer/koppeling';

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
    const actie = bepaalOpslaanActie({ dealId: state.bewerktDeal?.id, magBewerken, bewerkrechtenOnzeker, forceerKopie });
    if (actie === 'geblokkeerd') {
      setDealOpslaanStatus('onzeker');
      return null;
    }
    setDealOpslaanStatus('bezig');
    try {
      const tarievenset = alleTarievensets().at(-1)!;
      const kostencatalogus = nieuwsteKostencatalogus();
      const naam = state.bewerktDeal
        ? actie === 'kopie'
          ? `${state.bewerktDeal.naam} (kopie)`
          : state.bewerktDeal.naam
        : pand.pand.adres || 'Naamloze woning';
      const invoer = {
        naam,
        notitie: state.notitieOntwerp,
        map: state.bewerktDeal?.map ?? '',
        pandInvoer: pand,
        scenarios: state.bewerktDeal?.scenarios ?? [],
        versiestempel: huidigeVersiestempel(tarievenset, kostencatalogus),
      };
      const deal = actie === 'bijwerken' && state.bewerktDeal ? await werkDealBij(state.bewerktDeal.id, invoer) : await maakDealAan(invoer);
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

  /** Na "Woning opslaan" of een kopie staat er een (nieuwe) woning achter dit scherm — zet die in
   * de URL, zodat een refresh hem terugvindt i.p.v. een leeg formulier (zie `koppeling.ts`). */
  function zetWoningInUrl(dealId: string) {
    if (new URLSearchParams(window.location.search).get('deal') === dealId) return;
    markeerZojuistGekoppeld(dealId);
    router.replace(woningBewerkenUrl(dealId), { scroll: false });
  }

  async function dealVroegOpslaan() {
    const deal = await slaWoningOp();
    if (deal) zetWoningInUrl(deal.id);
  }

  async function forceerKopieOpslaan() {
    const deal = await slaWoningOp(true);
    if (deal) zetWoningInUrl(deal.id);
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
      slaScenarioBewerkResultaatOp({ slotIndex: state.handmatigScenario.slotIndex, dealId: state.handmatigScenario.dealId, bewerktPand: pand });
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
    // `?deal=` in de URL (staat-navigatie-audit 2026-10-03): de woning is op dit punt altijd al
    // opgeslagen, dus het resultaat hoort ook in een nieuwe tab/bladwijzer te werken i.p.v. alleen
    // via de sessionStorage-brug van dit tabblad.
    router.push(resultaatUrl(deal.id));
  }

  // De topnavigatie is zuiver navigatie (feedback 2026-10-02: "topnavigatie is voor navigatie").
  // Statusinfo staat in de losse `WoningContext` hieronder; de sectiestatus (① Woning ✓/…) staat
  // sinds 2026-10-03 in de sectiekop op de pagina zelf, niet meer als ankerlinks in de header.
  const titel = state.handmatigScenario ? 'Scenario bewerken' : state.bewerktDeal ? 'Woning bewerken' : 'Nieuwe woning';
  return (
    <AppHeader
      titel={titel}
      sticky
      acties={
        <>
          {!state.handmatigScenario && (
            <>
              {dealOpslaanStatus === 'gelukt' && <span className={headerKnop.status}>Opgeslagen ✓</span>}
              {dealOpslaanStatus === 'fout' && <span className={headerKnop.fout}>Opslaan mislukt</span>}
              {bewerkrechtenOnzeker && (
                <>
                  <span className={headerKnop.fout} title='Probeer eerst de pagina te verversen — dat lost het meestal op als het een tijdelijke hapering was.'>
                    Bewerkrechten konden niet bevestigd worden
                  </span>
                  <button type="button" className={headerKnop.secundair} disabled={!pand || dealOpslaanStatus === 'bezig'} onClick={forceerKopieOpslaan}>
                    Toch opslaan als nieuwe kopie →
                  </button>
                </>
              )}
              <button
                type="button"
                className={headerKnop.secundair}
                disabled={!pand || dealOpslaanStatus === 'bezig' || bewerkrechtenOnzeker}
                title={
                  bewerkrechtenOnzeker
                    ? 'Bewerkrechten konden niet bevestigd worden — ververs de pagina'
                    : !pand
                      ? (stap ?? undefined)
                      : !magBewerken
                        ? 'Deze woning is alleen-lezen — opslaan maakt een nieuwe, eigen kopie.'
                        : undefined
                }
                onClick={dealVroegOpslaan}
              >
                {state.bewerktDeal ? 'Opslaan' : 'Woning opslaan'}
              </button>
            </>
          )}
          <button
            type="button"
            className={headerKnop.primair}
            disabled={!pand || (!state.handmatigScenario && dealOpslaanStatus === 'bezig') || (!state.handmatigScenario && bewerkrechtenOnzeker)}
            title={bewerkrechtenOnzeker ? 'Bewerkrechten konden niet bevestigd worden — ververs de pagina' : stap ?? undefined}
            onClick={doorrekenen}
          >
            {state.handmatigScenario ? 'Gebruik als scenario →' : dealOpslaanStatus === 'bezig' ? 'Opslaan…' : 'Doorrekenen →'}
          </button>
          {/* Alleen bij een nieuwe woning — bij het bewerken van een bestaande woning of scenario is
              alles wissen geen zinnige actie (feedback 2026-10-03). */}
          {!state.bewerktDeal && !state.handmatigScenario && state.ruimtes.length > 0 && (
            <button
              type="button"
              className={headerKnop.klein}
              onClick={() => {
                if (confirm('Alle ingevoerde gegevens wissen?')) dispatch({ soort: 'ALLES_GEWIST' });
              }}
            >
              Alles wissen
            </button>
          )}
        </>
      }
    />
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

  // Woningnaam eerst (identiteit), daarna het kameraantal als kenmerk (feedback 2026-10-03).
  return (
    <WoningContextStrook
      onderdelen={[
        state.bewerktDeal && (
          <span title={magBewerken ? undefined : 'Deze woning is alleen-lezen — opslaan maakt een nieuwe, eigen kopie.'}>
            &ldquo;{state.bewerktDeal.naam}&rdquo;{!magBewerken && ' (alleen-lezen)'}
          </span>
        ),
        kamersLabel(n),
        state.handmatigScenario && <>scenario &ldquo;{state.handmatigScenario.naam}&rdquo;</>,
      ]}
    />
  );
}
