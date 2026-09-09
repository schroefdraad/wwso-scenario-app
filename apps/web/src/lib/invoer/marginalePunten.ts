import { berekenEindtelling, type Keuken, type PandInvoer, type SanitairVoorziening } from '@wwso/engine';
import type { Tarievenset } from '@wwso/data';

/**
 * "Hoeveel punten levert deze specifieke faciliteit op" — echt doorgerekend via de rekenmotor,
 * nooit een los tarief uit de tarievenset afgelezen. Dat onderscheid is hier niet cosmetisch:
 * extra sanitaire/keukenvoorzieningen worden gecapt (§2.6.2 capt op de douche/bad-punten) en
 * staan achter een alles-of-niets-poort (§2.5.1/§2.6.2) — een los tarief zou in die gevallen
 * een verkeerd getal tonen. Door de PandInvoer twee keer (facilteit aan/uit) door te rekenen en
 * het verschil te nemen, met alle andere velden ongewijzigd, klopt het altijd — ook als de
 * poort niet gehaald wordt of het plafond al bereikt is (dan is het verschil gewoon 0).
 */

/**
 * Telt de ONGERONDE rubriekpunten op (`rubriekenRuw`), niet de kwartpunt- of hele-punt-afgeronde
 * waarden. Een gedeelde ruimte (bijv. sanitair gedeeld door drie kamers) verdeelt een kleine
 * puntenwijziging over meerdere kamers — een stopcontact (0,25 pt, §2.6.2) gedeeld door drie
 * kamers is 0,083 pt per kamer, en dat tipt bij géén van de kamers een kwartpuntgrens. Met de
 * afgeronde waarden zou "punten per faciliteit" voor zulke voorzieningen dus bijna altijd 0
 * tonen — niet fout, maar wel nutteloos als diagnostisch signaal tijdens het invullen. De ruwe
 * som bestaat al in de motor precies voor dit doel (zie `RubriekPunten`/`rubriekenRuw` in
 * `eindtelling/types.ts`, gebouwd voor de suggestie-engine om "hoe dicht bij de volgende
 * kwartpuntgrens" te meten).
 *
 * Bekende beperking: dit telt R1 t/m R13 rechtstreeks op en past dus niet de zorgwoning-opslag
 * (+35% op R1 t/m R11, §2.12.1) toe die de motor pas ná afronding van het subtotaal berekent —
 * op een zorgwoning onderschat deze functie de marginale waarde van R1-R11-faciliteiten licht.
 * Voor R12/R13-voorzieningen (o.a. alle sanitair- en keukenextra's) speelt dit niet.
 */
function totaalPunten(pand: PandInvoer, tarievenset: Tarievenset, peildatum: string): number | null {
  try {
    const resultaat = berekenEindtelling(pand, tarievenset, peildatum);
    return Object.values(resultaat.perKamer).reduce((som, k) => {
      const ruwSom = Object.values(k.rubriekenRuw).reduce((s, p) => s + p, 0);
      return som + ruwSom;
    }, 0);
  } catch {
    return null;
  }
}

function marginaal(pandAan: PandInvoer, pandUit: PandInvoer, tarievenset: Tarievenset, peildatum: string): number | null {
  const aan = totaalPunten(pandAan, tarievenset, peildatum);
  const uit = totaalPunten(pandUit, tarievenset, peildatum);
  if (aan === null || uit === null) return null;
  return Math.round((aan - uit) * 100) / 100;
}

function patchKeuken(pand: PandInvoer, ruimteNr: number, extra: Partial<Keuken['extra']>): PandInvoer {
  return { ...pand, keukens: pand.keukens.map((k) => (k.ruimteNr === ruimteNr ? { ...k, extra: { ...k.extra, ...extra } } : k)) };
}

function patchSanitair(pand: PandInvoer, ruimteNr: number, patch: Partial<Omit<SanitairVoorziening, 'ruimteNr' | 'extra'>>): PandInvoer {
  return { ...pand, sanitair: pand.sanitair.map((s) => (s.ruimteNr === ruimteNr ? { ...s, ...patch } : s)) };
}

function patchSanitairExtra(pand: PandInvoer, ruimteNr: number, extra: Partial<SanitairVoorziening['extra']>): PandInvoer {
  return { ...pand, sanitair: pand.sanitair.map((s) => (s.ruimteNr === ruimteNr ? { ...s, extra: { ...s.extra, ...extra } } : s)) };
}

/** Marginale waarde van één boolean keukenvoorziening: verschil tussen "aan" en "uit", de rest van het pand ongewijzigd. */
export function marginaalKeukenBoolean(
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  ruimteNr: number,
  veld: keyof Omit<Keuken['extra'], 'extraKastruimteEenhedenVan60Cm'>,
): number | null {
  return marginaal(patchKeuken(pand, ruimteNr, { [veld]: true }), patchKeuken(pand, ruimteNr, { [veld]: false }), tarievenset, peildatum);
}

/** Marginale waarde van de eerstvolgende eenheid extra kastruimte (huidig aantal → +1). */
export function marginaalKeukenVolgendeKastruimte(pand: PandInvoer, tarievenset: Tarievenset, peildatum: string, ruimteNr: number, huidig: number): number | null {
  return marginaal(
    patchKeuken(pand, ruimteNr, { extraKastruimteEenhedenVan60Cm: huidig + 1 }),
    patchKeuken(pand, ruimteNr, { extraKastruimteEenhedenVan60Cm: huidig }),
    tarievenset,
    peildatum,
  );
}

/** Marginale waarde van één boolean sanitaire extra-voorziening (Comfort/Douche en bad). Sluit
 * naast de bestaande aantal-velden ook `eenhandsmengkraan`/`thermostatischeMengkraan` uit — die
 * zijn sinds 2026-09-09 ook een aantal, zie `marginaalSanitairVolgendeEenheid` hieronder. */
export function marginaalSanitairExtraBoolean(
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  ruimteNr: number,
  veld: keyof Omit<SanitairVoorziening['extra'], 'aantalHanddoekenradiatoren' | 'aantalStopcontacten' | 'eenhandsmengkraan' | 'thermostatischeMengkraan'>,
): number | null {
  return marginaal(patchSanitairExtra(pand, ruimteNr, { [veld]: true }), patchSanitairExtra(pand, ruimteNr, { [veld]: false }), tarievenset, peildatum);
}

/** Marginale waarde van de eerstvolgende handdoekenradiator, stopcontact of mengkraan. Voor de
 * twee mengkraan-velden (feedback Steven Kramer, 2026-09-09: "meerdere mengkranen kunnen
 * invoeren, maar de punten maar één keer toekennen") levert dit vanaf de tweede altijd 0 op —
 * `berekenSanitairExtra` telt ze eenmalig, niet vermenigvuldigd met het aantal (zie de
 * doc-comment bij `SanitairExtraVoorzieningen`). */
export function marginaalSanitairVolgendeEenheid(
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  ruimteNr: number,
  veld: 'aantalHanddoekenradiatoren' | 'aantalStopcontacten' | 'eenhandsmengkraan' | 'thermostatischeMengkraan',
  huidig: number,
): number | null {
  return marginaal(patchSanitairExtra(pand, ruimteNr, { [veld]: huidig + 1 }), patchSanitairExtra(pand, ruimteNr, { [veld]: huidig }), tarievenset, peildatum);
}

/**
 * Marginale waarde van de eerstvolgende (meerpersoons)wastafel — los van `extra`, want deze
 * velden staan direct op `SanitairVoorziening` (§2.6.1). Buiten de badkamer geldt een cap per
 * vertrek (`wastafelPuntenPerVertrekBuitenBadkamer`/meerpersoons-variant), en die punten tellen
 * altijd mee, ook als de vijf extra-eisen van §2.6.2 niet gehaald zijn — die eisen gaten alleen
 * `extra`. Voorheen ontbrak hier elke badge, waardoor het leek alsof een wastafel in een
 * niet-badkamer-ruimte 0 punten opleverde zolang de eisen-poort niet gehaald was.
 */
export function marginaalSanitairVolgendeWastafel(
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  ruimteNr: number,
  veld: 'aantalWastafels' | 'aantalMeerpersoonswastafels',
  huidig: number,
): number | null {
  return marginaal(patchSanitair(pand, ruimteNr, { [veld]: huidig + 1 }), patchSanitair(pand, ruimteNr, { [veld]: huidig }), tarievenset, peildatum);
}

/** Marginale waarde van douche, bad of de bad/douche-combinatie los. */
export function marginaalSanitairDoucheBad(
  pand: PandInvoer,
  tarievenset: Tarievenset,
  peildatum: string,
  ruimteNr: number,
  veld: 'douche' | 'bad' | 'badDoucheCombinatie',
): number | null {
  const uit: Partial<SanitairVoorziening> = { douche: false, bad: false, badDoucheCombinatie: false };
  return marginaal(patchSanitair(pand, ruimteNr, { ...uit, [veld]: true }), patchSanitair(pand, ruimteNr, uit), tarievenset, peildatum);
}

/** Punten van het huidige toilettype t.o.v. "Geen" — de enige echt losstaande, niet-gecapte sanitaire basispost. */
export function puntenToiletType(pand: PandInvoer, tarievenset: Tarievenset, peildatum: string, ruimteNr: number, toiletType: SanitairVoorziening['toiletType']): number | null {
  return marginaal(patchSanitair(pand, ruimteNr, { toiletType }), patchSanitair(pand, ruimteNr, { toiletType: 'Geen' }), tarievenset, peildatum);
}
