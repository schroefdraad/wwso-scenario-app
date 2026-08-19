import huurprijstabel_2026_01_01 from './2026-01-01/huurprijstabel_2026-01-01.json';
import energielabelfactoren_2026_01_01 from './2026-01-01/energielabelfactoren_2026-01-01.json';
import bouwjaargrenzen_2026_01_01 from './2026-01-01/bouwjaargrenzen_2026-01-01.json';
import corop_2026_01_01 from './2026-01-01/corop_2026-01-01.json';
import voorzieningen_2026_01_01 from './2026-01-01/voorzieningen_2026-01-01.json';
import rubrieken7_13_2026_01_01 from './2026-01-01/rubrieken7-13_2026-01-01.json';
import { Tarievenset } from './types.js';

export * from './types.js';

/**
 * Eén item per peildatum. Op 1 januari komt er een nieuwe dataset bij — dan wordt hier een
 * regel toegevoegd, niet een bestaande dataset overschreven (harde regel 1 en 6: een
 * opgeslagen berekening blijft reproduceerbaar met de tarieven van destijds).
 */
const RUWE_TARIEVENSETS = [
  {
    peildatum: '2026-01-01',
    huurprijstabel: huurprijstabel_2026_01_01,
    energielabelfactoren: energielabelfactoren_2026_01_01,
    bouwjaargrenzen: bouwjaargrenzen_2026_01_01,
    coropGebieden: corop_2026_01_01,
    ...voorzieningen_2026_01_01,
    ...rubrieken7_13_2026_01_01,
  },
] as const;

const TARIEVENSETS: Tarievenset[] = RUWE_TARIEVENSETS.map((set) => Tarievenset.parse(set)).sort((a, b) =>
  a.peildatum.localeCompare(b.peildatum),
);

/**
 * Geeft de tarievenset terug die op `peildatum` van kracht is: de laatst ingegane set met
 * een peildatum ≤ de gevraagde datum. Ligt de gevraagde datum vóór de eerste dataset, dan
 * gooit dit een expliciete fout — nooit een stille fallback op de vroegste of laatste set.
 */
export function getTarievenset(peildatum: string): Tarievenset {
  const kandidaten = TARIEVENSETS.filter((t) => t.peildatum <= peildatum);
  const gekozen = kandidaten.at(-1);
  if (!gekozen) {
    throw new Error(
      `Geen tarievenset beschikbaar voor peildatum ${peildatum} — de vroegste dataset gaat in op ${TARIEVENSETS[0].peildatum}.`,
    );
  }
  return gekozen;
}

export function alleTarievensets(): readonly Tarievenset[] {
  return TARIEVENSETS;
}
