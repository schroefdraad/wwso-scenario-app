/**
 * De vier controles uit tab `Controles` van `resources/wwso.xlsx` (taak 13). Regelgebaseerd en
 * puur — geen afhankelijkheid van de eindtelling, alleen van `PandInvoer` zelf.
 */
export type ControleCode =
  | 'oppervlakte-afwijking'
  | 'ruimte-zonder-type'
  | 'ruimte-niet-toegewezen'
  | 'kamer-zonder-privevertrek';

export interface ControleBevinding {
  code: ControleCode;
  /** Mensleesbare uitleg van dit specifieke geval, bijv. "Ruimte 11 (Berging) is aan geen enkele kamer toegewezen." */
  omschrijving: string;
  ruimteNr?: number;
  kamer?: number;
}

export interface ControleResultaat {
  code: ControleCode;
  titel: string;
  /** Geen bevindingen = de controle is niet geschonden. */
  bevindingen: ControleBevinding[];
}
