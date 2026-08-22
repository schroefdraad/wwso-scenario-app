import { PandInvoer as PandInvoerSchema, type PandInvoer } from '@wwso/engine';
import type { InvoerState, RuimteRij } from './types';

function naarGetal(waarde: string): number | undefined {
  if (waarde.trim() === '') return undefined;
  const genormaliseerd = waarde.replace(',', '.');
  const n = Number(genormaliseerd);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Zet de gedenormaliseerde invoerstate om naar het echte `PandInvoer`-model (§7.2 van het
 * UX-ontwerp). Een `RuimteRij` zonder toegewezen kamers levert GEEN toewijzing-entry op (anders
 * faalt `Toewijzing.min(1)` op die entry) — dat is precies het stille-verlies-risico dat de
 * waarschuwingenlijst in `afgeleideStaat.ts` los opvangt.
 */
export function projecteerNaarPandInvoer(state: InvoerState): PandInvoer | null {
  const aantalKamers = naarGetal(state.pand.aantalKamers);
  if (aantalKamers === undefined || state.ruimtes.length === 0) return null;

  const wozOppervlak = naarGetal(state.pand.wozOppervlak);
  const bouwjaar = naarGetal(state.pand.bouwjaar);
  if (wozOppervlak === undefined || bouwjaar === undefined) return null;
  if (!state.pand.adres || !state.pand.stad || !state.pand.coropGebied) return null;

  const ruimtes = state.ruimtes
    .map((r) => toRuimte(r))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (ruimtes.length !== state.ruimtes.length) return null;

  const toewijzing = state.ruimtes
    .filter((r) => r.kamers.length > 0)
    .map((r) => ({ ruimteNr: r.nr, kamers: r.kamers }));

  const keukens = state.ruimtes
    .filter((r) => r.keuken)
    .map((r) => ({ ruimteNr: r.nr, ...r.keuken! }));

  const sanitair = state.ruimtes
    .filter((r) => r.sanitair)
    .map((r) => ({ ruimteNr: r.nr, ...r.sanitair! }));

  const parkeerplekken = state.ruimtes
    .filter((r) => r.parkeerplek)
    .map((r) => ({ ruimteNr: r.nr, ...r.parkeerplek! }));

  const kandidaat: PandInvoer = {
    pand: {
      adres: state.pand.adres,
      stad: state.pand.stad,
      wozWaarde: naarGetal(state.pand.wozWaarde),
      wozPeildatum: state.pand.wozPeildatum,
      taxatiewaardeEuro: naarGetal(state.pand.taxatiewaardeEuro),
      wozOppervlak,
      coropGebied: state.pand.coropGebied,
      energielabel: state.pand.energielabel,
      energielabelIngangsdatum: state.pand.energielabelIngangsdatum || undefined,
      bouwjaar,
      soortWoning: state.pand.soortWoning,
      aantalKamers,
      aantalWoningenInComplex: naarGetal(state.pand.aantalWoningenInComplex) ?? 1,
      monument: state.pand.monument,
      huurovereenkomstDatum: state.pand.huurovereenkomstDatum || undefined,
    },
    ruimtes,
    toewijzing,
    keukens,
    sanitair,
    parkeerplekken,
    handmatigePosten: {
      woonvoorzieningenHandicap: state.woonvoorzieningenHandicap,
      aanbelfuncties: state.aanbelfunctieAan && state.aanbelfunctieKamers.length > 0 ? [{ kamersMetToegang: state.aanbelfunctieKamers }] : [],
      losseLaadpalen: state.losseLaadpaalAan && state.losseLaadpaalKamers.length > 0 ? [{ kamersMetToegang: state.losseLaadpaalKamers }] : [],
      aftrekSituaties: state.aftrekSituaties,
      zorgwoning: state.pand.zorgwoning,
    },
  };

  const resultaat = PandInvoerSchema.safeParse(kandidaat);
  return resultaat.success ? resultaat.data : null;
}

function toRuimte(r: RuimteRij) {
  const oppervlakteM2 = naarGetal(r.oppervlakteM2);
  const verdieping = naarGetal(r.verdieping);
  if (oppervlakteM2 === undefined || verdieping === undefined || !r.naam) return null;
  const aantalAdressenMetToegang = naarGetal(r.aantalAdressenMetToegang);
  return {
    nr: r.nr,
    naam: r.naam,
    type: r.type,
    oppervlakteM2,
    verdieping,
    verwarmd: r.verwarmd,
    verkoeld: r.verkoeld,
    zolder: r.zolder,
    aantalAdressenMetToegang,
  };
}

/** Geeft aan welke, voor de gebruiker herkenbare, stap nog ontbreekt om door te kunnen rekenen. */
export function ontbrekendeStap(state: InvoerState): string | null {
  if (!naarGetal(state.pand.aantalKamers)) return 'Vul het aantal kamers in';
  if (state.ruimtes.length === 0) return 'Voeg ten minste één ruimte toe';
  if (!state.pand.adres) return 'Vul het adres in';
  if (!state.pand.stad) return 'Vul de stad in';
  if (!state.pand.coropGebied) return 'Kies een COROP-gebied';
  if (naarGetal(state.pand.wozOppervlak) === undefined) return 'Vul het WOZ-oppervlak in';
  if (naarGetal(state.pand.bouwjaar) === undefined) return 'Vul het bouwjaar in';
  const onvolledigeRuimte = state.ruimtes.find((r) => !r.naam || naarGetal(r.oppervlakteM2) === undefined);
  if (onvolledigeRuimte) return `Ruimte ${onvolledigeRuimte.nr}: vul naam en oppervlakte in`;
  return null;
}
