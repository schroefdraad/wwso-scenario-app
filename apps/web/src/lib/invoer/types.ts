import type {
  Energielabel,
  HandmatigePosten,
  Keuken,
  MonumentStatus,
  RuimteType,
  SanitairVoorziening,
  ZolderKenmerken,
} from '@wwso/engine';
import type { ScenarioSelectie } from '../deals/types';

/**
 * Gedenormaliseerde invoerstate (§7.2 van het UX-ontwerp, `outputs/RAPPORT_taak12_2026-08-20.md`):
 * toewijzing, keuken, sanitair en parkeerplek hangen aan de ruimte-rij zelf, niet in losse
 * arrays. `projecteerNaarPandInvoer` splitst dit uiteen naar het echte `PandInvoer`-model.
 * `id` is een stabiel, van `nr` losstaand sleutel voor React-keys en focusbeheer.
 */
export interface RuimteRij {
  id: string;
  nr: number;
  naam: string;
  type: RuimteType;
  oppervlakteM2: string;
  verdieping: string;
  verwarmd: boolean;
  verkoeld: boolean;
  aantalAdressenMetToegang: string;
  aantalAdressenOvergenomen: boolean;
  kamers: number[];
  zolder?: ZolderKenmerken;
  heeftMeterkast?: boolean;
  keuken?: Omit<Keuken, 'ruimteNr'>;
  sanitair?: Omit<SanitairVoorziening, 'ruimteNr'>;
  parkeerplek?: { type: 'I' | 'II' | 'III'; laadpaal: boolean };
}

export interface PandVeldenState {
  adres: string;
  stad: string;
  aantalKamers: string;
  wozWaarde: string;
  wozPeildatum: string;
  taxatiewaardeEuro: string;
  wozOppervlak: string;
  /** UI-only — niet onderdeel van `PandInvoer`. Aandrijft de `coropGebied`-suggestie
   * (COROP-automatisering, 2026-09-04); leeg zolang "Stad" geen eenduidige match oplevert of nog
   * niet is ingetypt. Gaat NIET mee terug uit een opgeslagen deal (`pandInvoerNaarState`) — alleen
   * `coropGebied` zelf is daar bewaard, `gemeente` staat dan weer leeg tot de gebruiker "Stad"
   * opnieuw aanraakt of zelf een gemeente kiest. */
  gemeente: string;
  coropGebied: string;
  energielabel: Energielabel;
  energielabelOnbekendOfVervallen: boolean;
  /** Eigen inschatting van de kosten om naar dit label te komen (Tussenfase-taak C). Leeg = niet
   * haalbaar of niet relevant — de scenariovergelijking biedt dan geen wisselknop naar dat label. */
  energielabelKostenAPlus: string;
  energielabelKostenAPlusPlus: string;
  energielabelKostenAPlusPlusPlus: string;
  bouwjaar: string;
  monument: MonumentStatus;
  huurovereenkomstDatum: string;
  zorgwoning: boolean;
}

/** Velden die "Gegevens ophalen" kan invullen (besluit eigenaar 2026-10-09). `gemeente` dekt ook
 * `coropGebied`. Aantal kamers, energielabel en monument horen er bewust niet bij. */
export type OphaalVeld = 'adres' | 'stad' | 'gemeente' | 'bouwjaar' | 'wozWaarde' | 'wozPeildatum' | 'wozOppervlak';

/** Waar een opgehaalde waarde vandaan komt, voor de tooltip bij het vinkje. `datum` = YYYY-MM-DD. */
export interface OphaalHerkomst {
  bron: 'WOZ-loket' | 'BAG';
  datum: string;
}

/** Een veld waar de gebruiker zelf al iets anders had staan: nooit stil overschrijven. `patch` en
 * `herkomst` worden pas toegepast als de gebruiker "Gebruik" kiest. Een conflict kan meerdere
 * samenhangende velden dekken (gemeente+COROP; WOZ-waarde+peildatum): `veld` is het veld waar het
 * getoond wordt, de sleutels van `herkomst` zijn alle velden die het dekt. */
export interface OphaalConflict {
  veld: OphaalVeld;
  huidig: string;
  opgehaaldTekst: string;
  patch: Partial<PandVeldenState>;
  herkomst: Partial<Record<OphaalVeld, OphaalHerkomst>>;
}

export interface OphaalMelding {
  soort: 'ok' | 'let';
  tekst: string;
}

/** Sessie-informatie over de laatste "Gegevens ophalen" — wordt NIET opgeslagen in de database en
 * is geen onderdeel van `PandInvoer` (projecteer.ts neemt het niet mee). */
export interface GegevensOphalenState {
  herkomst: Partial<Record<OphaalVeld, OphaalHerkomst>>;
  conflicten: OphaalConflict[];
  melding: OphaalMelding | null;
}

export interface InvoerState {
  pand: PandVeldenState;
  /** Zie `GegevensOphalenState`. Optioneel: een oud concept uit sessionStorage heeft dit niet. */
  gegevensOphalen?: GegevensOphalenState;
  ruimtes: RuimteRij[];
  aanbelfunctieAan: boolean;
  aanbelfunctieKamers: number[];
  losseLaadpaalAan: boolean;
  losseLaadpaalKamers: number[];
  aftrekSituaties: HandmatigePosten['aftrekSituaties'];
  woonvoorzieningenHandicap: HandmatigePosten['woonvoorzieningenHandicap'];
  volgendeRuimteId: number;
  /** Laatst ingevoerde waarde voor `aantalAdressenMetToegang`, overgenomen bij de volgende gedeelde ruimte (§4.4 van het UX-ontwerp). */
  laatsteAantalAdressen?: string;
  /** Vrije notitie bij de deal, al in te vullen vóórdat er een deal bestaat (feedback Emma,
   * 2026-09-04: notitieveld op de pand-invoerpagina zelf, niet pas op de vergelijkingspagina).
   * Bron van waarheid tijdens het invoeren — `bewerktDeal.notitie` wordt hier alleen ván
   * overgenomen bij het laden van een bestaande deal, nooit andersom. */
  notitieOntwerp: string;
  /**
   * Gezet zodra deze as-is via `/woning/nieuw?deal=<id>` geladen is vanuit een opgeslagen deal
   * (backlog: as-is achteraf aanpasbaar maken). "Doorrekenen" draagt dit door naar het
   * resultaat-/vergelijkingsscherm zodat "Woning opslaan" dezelfde deal bijwerkt in plaats van een
   * nieuwe aan te maken. Afwezig voor een nieuw, nog niet opgeslagen pand.
   *
   * `magBewerken` (multi-tenant org-scheiding, 2026-09-28): `false` bij een woning die wél
   * zichtbaar is maar niet van de eigen org (de permanente demo-woning, of een gedeelde kopie die
   * per ongeluk toch bewerkbaar leek) — "Opslaan" maakt dan een nieuwe, eigen kopie i.p.v. de
   * bestaande rij te proberen bijwerken (die zou de RLS `with check` alsnog weigeren, zie
   * `Topbar.tsx`).
   *
   * `bewerkrechtenOnzeker` (2026-10-02, gemeld tijdens testen: "ik vind het vervelend dat hij
   * forkt, dat laat het aantal kopieën uit de hand lopen"): bewust GESCHEIDEN van `magBewerken`.
   * `magBewerken: false` betekent hier "bevestigd niet van mij" (demo-woning, andere org) — dat
   * is een legitieme, herkende situatie en de fork-als-eigen-kopie blijft daar precies zo werken
   * als bedoeld. `bewerkrechtenOnzeker: true` betekent "kon niet bevestigd worden, geen idee of
   * dit wel/niet van mij is" (de profiel-ophaalcall faalde, zelfs na de automatische retry in
   * `lib/deals/profiel.ts`) — daarvoor biedt `Topbar.tsx` geen "ga door en maak een kopie"-optie
   * meer aan (een confirm-dialoog is te makkelijk weg te klikken), maar blokkeert opslaan
   * volledig met een foutmelding om opnieuw te proberen.
   */
  bewerktDeal?: { id: string; naam: string; notitie: string; map: string; scenarios: ScenarioSelectie[]; magBewerken: boolean; bewerkrechtenOnzeker: boolean };
  /**
   * Gezet zodra dit scherm een AS-IS-kopie is die als handmatig TO-BE-scenario bewerkt wordt
   * (via `/woning/nieuw?scenario=<slot>`, backlog: AS-IS kopiëren naar een handmatig scenario,
   * feedback Emma Morrison, 2026-08-21) — niet een echte nieuwe/bestaande pand-invoer. De
   * primaire knop draagt het bewerkte pand dan terug naar het vergelijkingsscherm in plaats van
   * naar het resultaatscherm te navigeren. Sluit elkaar uit met `bewerktDeal`: je bewerkt óf de
   * as-is van een deal, óf een los TO-BE-scenario, nooit allebei tegelijk.
   *
   * `terugUrl` is de exacte vergelijkingspagina-URL (met `?deal=<id>` indien van toepassing) om
   * naar terug te navigeren — een hardgecodeerd `/woning/vergelijking` verliest anders de
   * deal-koppeling van een reeds opgeslagen deal bij terugkeer.
   */
  handmatigScenario?: { slotIndex: number; naam: string; terugUrl: string; dealId?: string };
}

export const NIEUW_PAND_VELDEN: PandVeldenState = {
  adres: '',
  stad: '',
  aantalKamers: '6',
  wozWaarde: '',
  wozPeildatum: '2025-01-01',
  taxatiewaardeEuro: '',
  wozOppervlak: '',
  gemeente: '',
  coropGebied: '',
  energielabel: 'D',
  energielabelOnbekendOfVervallen: false,
  energielabelKostenAPlus: '',
  energielabelKostenAPlusPlus: '',
  energielabelKostenAPlusPlusPlus: '',
  bouwjaar: '',
  monument: 'Geen',
  huurovereenkomstDatum: '',
  zorgwoning: false,
};

export const NIEUWE_INVOERSTATE: InvoerState = {
  pand: NIEUW_PAND_VELDEN,
  ruimtes: [],
  aanbelfunctieAan: false,
  aanbelfunctieKamers: [],
  losseLaadpaalAan: false,
  losseLaadpaalKamers: [],
  aftrekSituaties: { verhuurderCriterium: [], ruitoppervlakteOnvoldoende: [], raamkozijnTeHoog: [] },
  woonvoorzieningenHandicap: [],
  volgendeRuimteId: 1,
  notitieOntwerp: '',
};
