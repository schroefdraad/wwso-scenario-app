import gemeentenRuw from './gemeenten.json';
import woonplaatsenRuw from './woonplaatsen.json';
import { alleTarievensets } from '../tarieven/index';
import { GemeenteCorop, WoonplaatsGemeenten } from './types';

export * from './types';

/**
 * Gemeente → COROP-gebied (342 gemeentes, CBS-indeling) en woonplaats → gemeente(n)
 * (~5.400 woonplaatsen). Bron: CBS "Gebieden in Nederland" (StatLine-tabel 85385NED, gemeente →
 * COROP-gebied) plus een community-onderhouden woonplaatsenlijst, samengevoegd en gevalideerd
 * op 2026-09-04 — zie het uitgewerkte verhaal in `plan/plan.md` bij de COROP-automatisering.
 *
 * De COROP-namen van CBS zijn NIET dezelfde schrijfwijze als de namen in de tarieventabel (die
 * volgt de oudere, in de Wet WWSO/huurprijscheck gebruikte namen, bijv. "Brabant (West-Noord)"
 * i.p.v. CBS' huidige "West-Noord-Brabant") — bij het samenstellen van `gemeenten.json` is dat
 * al vertaald naar de schrijfwijze van de tarieventabel, gevalideerd tegen exact diezelfde 40
 * namen. Deze module is bewust NIET gekoppeld aan een peildatum zoals de tarieven dat zijn
 * (§ taak 3): het is een hulpmiddel voor een suggestie in de UI, geen rekenregel — de
 * daadwerkelijke `coropGebied`-waarde op het pand blijft gewoon gevalideerd tegen de tarieven-
 * COROP-lijst van de gekozen peildatum, ongeacht welke gemeente 'm heeft gesuggereerd.
 */
const GEMEENTEN: GemeenteCorop[] = gemeentenRuw.map((g) => GemeenteCorop.parse(g));
const WOONPLAATSEN: WoonplaatsGemeenten[] = woonplaatsenRuw.map((w) => WoonplaatsGemeenten.parse(w));

// Bewaakt dat elke coropGebied-waarde hier ook echt bestaat in de nieuwste tarieven-COROP-lijst
// — zou dat niet zo zijn, dan zou een automatische suggestie een pand op een COROP-gebied
// kunnen zetten dat de tarievenset niet kent, en dat zwijgend pas bij het doorrekenen breken.
const geldigeCoropGebieden = new Set(alleTarievensets().at(-1)?.coropGebieden.map((c) => c.gebied) ?? []);
const onbekend = GEMEENTEN.filter((g) => !geldigeCoropGebieden.has(g.coropGebied));
if (onbekend.length > 0) {
  throw new Error(
    `${onbekend.length} gemeente(n) in geografie/gemeenten.json wijzen naar een COROP-gebied dat niet in de tarieven-COROP-lijst voorkomt, bijv. "${onbekend[0].gemeente}" → "${onbekend[0].coropGebied}".`,
  );
}

const GEMEENTE_NAAR_COROP = new Map(GEMEENTEN.map((g) => [g.gemeente, g.coropGebied]));
const WOONPLAATS_NAAR_GEMEENTEN = new Map(WOONPLAATSEN.map((w) => [w.woonplaats.toLowerCase(), w.gemeenten]));

/** Alle 342 gemeentes, alfabetisch — voor een handmatige keuzelijst. */
export function alleGemeentes(): readonly string[] {
  return GEMEENTEN.map((g) => g.gemeente);
}

/** `undefined` als `gemeente` niet in de lijst voorkomt — geen gok, de aanroeper beslist dan zelf. */
export function coropVoorGemeente(gemeente: string): string | undefined {
  return GEMEENTE_NAAR_COROP.get(gemeente);
}

/**
 * Kandidaat-gemeentes voor een getypte woonplaatsnaam (hoofdletterongevoelig, exacte match op
 * de volledige naam — geen fuzzy matching, dat zou verkeerde suggesties kunnen geven). Leeg als
 * de naam onbekend is; meerdere gemeentes als de plaatsnaam dubbel voorkomt (bijv. "Aalst" ligt
 * zowel in Zaltbommel als in Waalre als in Buren) — de aanroeper laat de gebruiker dan zelf
 * kiezen i.p.v. te gokken welke bedoeld is.
 */
export function gemeentesVoorWoonplaats(woonplaats: string): readonly string[] {
  return WOONPLAATS_NAAR_GEMEENTEN.get(woonplaats.trim().toLowerCase()) ?? [];
}
