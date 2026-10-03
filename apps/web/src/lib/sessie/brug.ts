/**
 * Eén module voor alle tijdelijke overdracht tussen pagina's via sessionStorage (staat-navigatie-
 * audit 2026-10-03, stap 3). Daarvoor waren er vijf losse sleutels verspreid over drie bestanden,
 * elk met een eigen manier van lezen/valideren/wissen — en geen enkele wist bij welke woning hij
 * hoorde. Precies daardoor kwam het bugpatroon sinds augustus steeds terug: een achtergebleven
 * restje van woning A belandde op het scherm van woning B (8 incidenten, zie
 * `lib/navigatie.test.ts` en de tests naast de bruggen).
 *
 * Twee regels, hier centraal afgedwongen:
 * 1. Elke brug staat in `SESSIE_SLEUTELS` — één overzicht, niets meer verstopt.
 * 2. `ruimOpVoorWoning(id)`: zodra een scherm woning X laadt, verdwijnt elk restje dat bij een
 *    ándere woning (of bij een nooit opgeslagen woning) hoort. Alleen het concept van een nieuwe,
 *    nog niet opgeslagen woning blijft staan — dat hoort bij geen enkele woning, maar bij
 *    "+ Nieuwe woning".
 */

export const SESSIE_SLEUTELS = {
  /** Ruwe werkstate van een nieuwe, nog niet opgeslagen woning (`lib/invoer/opslag.ts`). */
  invoerConcept: 'wwso:invoer-concept',
  /** Pand + woning-koppeling op weg naar het resultaatscherm (`lib/resultaat/opslag.ts`). */
  huidigPand: 'wwso:huidig-pand',
  /** Heen- en terugweg van "Scenario bewerken" (`lib/vergelijking/scenarioBewerkBrug.ts`). */
  scenarioBewerkStart: 'wwso:scenario-bewerk-start',
  scenarioBewerkResultaat: 'wwso:scenario-bewerk-resultaat',
  /** Niet-opgeslagen staat van de vergelijking tijdens een uitstapje (zelfde bestand). */
  vergelijkingSnapshot: 'wwso:vergelijking-snapshot',
} as const;

type Sleutel = (typeof SESSIE_SLEUTELS)[keyof typeof SESSIE_SLEUTELS];

/** Bruggen die bij geen woning horen en dus nooit door `ruimOpVoorWoning` gewist worden. */
const WONINGLOOS: readonly Sleutel[] = [SESSIE_SLEUTELS.invoerConcept];

export interface Brug<T> {
  zet(waarde: T): void;
  haal(): T | null;
  /** Eenmalig afhalen: leest en wist meteen, ook als de waarde ongeldig blijkt. */
  haalEnWis(): T | null;
  wis(): void;
}

/**
 * `valideer` krijgt de geparste JSON en geeft de waarde terug, of `null` als die (niet meer)
 * geldig is — bijv. een `safeParse` van een Zod-schema, zodat een restje in een verouderd
 * formaat stil genegeerd wordt i.p.v. de pagina te laten crashen.
 */
export function maakBrug<T>(sleutel: Sleutel, valideer: (ruw: unknown) => T | null): Brug<T> {
  const lees = (): T | null => {
    const ruw = sessionStorage.getItem(sleutel);
    if (!ruw) return null;
    try {
      return valideer(JSON.parse(ruw));
    } catch {
      return null;
    }
  };
  return {
    zet: (waarde) => sessionStorage.setItem(sleutel, JSON.stringify(waarde)),
    haal: lees,
    haalEnWis: () => {
      const waarde = lees();
      sessionStorage.removeItem(sleutel);
      return waarde;
    },
    wis: () => sessionStorage.removeItem(sleutel),
  };
}

/** Bij welke woning hoort dit restje? `undefined` = een nooit opgeslagen woning. */
function woningVan(ruw: string): string | undefined | 'onleesbaar' {
  try {
    const waarde: unknown = JSON.parse(ruw);
    if (waarde && typeof waarde === 'object' && 'dealId' in waarde && typeof waarde.dealId === 'string') return waarde.dealId;
    return undefined;
  } catch {
    return 'onleesbaar';
  }
}

/**
 * Ruimt elk sessie-restje op dat niet bij `dealId` hoort. Aanroepen zodra een scherm een
 * opgeslagen woning laadt (`?deal=<id>`). Geeft de gewiste sleutels terug (voor tests/debuggen).
 */
export function ruimOpVoorWoning(dealId: string): Sleutel[] {
  const gewist: Sleutel[] = [];
  for (const sleutel of Object.values(SESSIE_SLEUTELS)) {
    if (WONINGLOOS.includes(sleutel)) continue;
    const ruw = sessionStorage.getItem(sleutel);
    if (ruw === null) continue;
    if (woningVan(ruw) !== dealId) {
      sessionStorage.removeItem(sleutel);
      gewist.push(sleutel);
    }
  }
  return gewist;
}
