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
