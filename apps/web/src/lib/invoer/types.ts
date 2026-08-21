import type {
  Energielabel,
  HandmatigePosten,
  Keuken,
  MonumentStatus,
  RuimteType,
  SanitairVoorziening,
  SoortWoning,
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
  keuken?: Omit<Keuken, 'ruimteNr'>;
  sanitair?: Omit<SanitairVoorziening, 'ruimteNr'>;
  parkeerplek?: { type: 'I' | 'II' | 'III'; laadpaal: boolean };
}

export interface PandVeldenState {
  adres: string;
  stad: string;
  soortWoning: SoortWoning;
  aantalKamers: string;
  aantalWoningenInComplex: string;
  wozWaarde: string;
  wozPeildatum: string;
  taxatiewaardeEuro: string;
  wozOppervlak: string;
  coropGebied: string;
  energielabel: Energielabel;
  energielabelIngangsdatum: string;
  bouwjaar: string;
  monument: MonumentStatus;
  huurovereenkomstDatum: string;
  zorgwoning: boolean;
}

export interface InvoerState {
  pand: PandVeldenState;
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
  /**
   * Gezet zodra deze as-is via `/pand/nieuw?deal=<id>` geladen is vanuit een opgeslagen deal
   * (backlog: as-is achteraf aanpasbaar maken). "Doorrekenen" draagt dit door naar het
   * resultaat-/vergelijkingsscherm zodat "Deal opslaan" dezelfde deal bijwerkt in plaats van een
   * nieuwe aan te maken. Afwezig voor een nieuw, nog niet opgeslagen pand.
   */
  bewerktDeal?: { id: string; naam: string; scenarios: ScenarioSelectie[] };
  /**
   * Gezet zodra dit scherm een AS-IS-kopie is die als handmatig TO-BE-scenario bewerkt wordt
   * (via `/pand/nieuw?scenario=<slot>`, backlog: AS-IS kopiëren naar een handmatig scenario,
   * feedback Emma Morrison, 2026-08-21) — niet een echte nieuwe/bestaande pand-invoer. De
   * primaire knop draagt het bewerkte pand dan terug naar het vergelijkingsscherm in plaats van
   * naar het resultaatscherm te navigeren. Sluit elkaar uit met `bewerktDeal`: je bewerkt óf de
   * as-is van een deal, óf een los TO-BE-scenario, nooit allebei tegelijk.
   *
   * `terugUrl` is de exacte vergelijkingspagina-URL (met `?deal=<id>` indien van toepassing) om
   * naar terug te navigeren — een hardgecodeerd `/pand/vergelijking` verliest anders de
   * deal-koppeling van een reeds opgeslagen deal bij terugkeer.
   */
  handmatigScenario?: { slotIndex: number; naam: string; terugUrl: string };
}

export const NIEUW_PAND_VELDEN: PandVeldenState = {
  adres: '',
  stad: '',
  soortWoning: 'Meergezins',
  aantalKamers: '6',
  aantalWoningenInComplex: '1',
  wozWaarde: '',
  wozPeildatum: '2025-01-01',
  taxatiewaardeEuro: '',
  wozOppervlak: '',
  coropGebied: '',
  energielabel: 'D',
  energielabelIngangsdatum: '',
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
};
