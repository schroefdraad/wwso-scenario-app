import type { Tarievenset } from '@wwso/data';
import type { PandInvoer, Ruimte } from '../types/index';
import type { EindtellingResultaat, RubriekPunten } from '../eindtelling/index';
import { berekenKeuken } from '../rubrieken/r5-keuken';
import { berekenSanitair } from '../rubrieken/r6-sanitair';
import { kamersPerRuimte, rondAfOpHelePunten } from '../rubrieken/gedeeld';
import type { MargeAnalyse, MargeKamer, MargeRubriek, MargeSignaal } from './types';

const RUBRIEK_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13'] as const;

/** Hoeveel ruwe punten nog nodig zijn om het eerstvolgende kwartpunt te bereiken. */
function afstandTotVolgendeKwartpunt(ruw: number): number {
  const rest = (ruw + 0.125) % 0.25;
  const magNaBoven = rest === 0 ? 0 : 0.25 - rest;
  return Math.round(magNaBoven * 10000) / 10000;
}

/** Hoeveel de ruwe eindsom nog moet stijgen voor het eerstvolgende hele punt. */
function afstandTotVolgendHeelPunt(totaalVoorEindsaldering: number): number {
  const huidig = rondAfOpHelePunten(totaalVoorEindsaldering);
  return Math.round((huidig + 0.5 - totaalVoorEindsaldering) * 10000) / 10000;
}

/**
 * Diagnostische laag (§1, laag C van `outputs/RAPPORT_taak11_2026-08-20.md`): waar laat dit
 * pand punten liggen. Levert GEEN economische waarde op — dat gebeurt uitsluitend via een
 * echte herrekening in `waardering.ts`/`suggesties.ts` (laag A). Signalen van het type
 * 'gat-in-catalogus' worden hier niet gezet: die vergen kennis van de kostencatalogus en
 * worden door de orchestrator (`suggesties.ts`) toegevoegd nadat de kandidaten bekend zijn.
 */
export function analyseerMarge(
  input: PandInvoer,
  tarievenset: Tarievenset,
  eindtelling: EindtellingResultaat,
): MargeAnalyse {
  const perKamer: Record<number, MargeKamer> = {};

  for (const [kamerStr, kamerResultaat] of Object.entries(eindtelling.perKamer)) {
    const kamer = Number(kamerStr);
    const perRubriek = {} as Record<keyof RubriekPunten, MargeRubriek>;
    for (const key of RUBRIEK_KEYS) {
      const ruw = kamerResultaat.rubriekenRuw[key];
      const afgerond = kamerResultaat.rubrieken[key];
      perRubriek[key] = {
        ruw,
        afgerond,
        afstandTotVolgendeKwartpunt: afstandTotVolgendeKwartpunt(ruw),
        verlorenDoorAfronding: Math.round((ruw - afgerond) * 10000) / 10000,
      };
    }
    perKamer[kamer] = {
      kamer,
      perRubriek,
      totaalVoorEindsaldering: kamerResultaat.totaalVoorEindsaldering,
      afstandTotVolgendHeelPunt: afstandTotVolgendHeelPunt(kamerResultaat.totaalVoorEindsaldering),
    };
  }

  const signalen: MargeSignaal[] = [
    ...poortSignalen(input, tarievenset),
    ...plafondSignalen(input, tarievenset),
    ...afrondingsSignalen(perKamer),
  ];

  return { perKamer, signalen };
}

function poortSignalen(input: PandInvoer, tarievenset: Tarievenset): MargeSignaal[] {
  const kamersBijRuimte = kamersPerRuimte(input);
  const ruimteBijNr = new Map<number, Ruimte>(input.ruimtes.map((r) => [r.nr, r] as const));
  const signalen: MargeSignaal[] = [];

  for (const keuken of input.keukens) {
    const kamers = kamersBijRuimte.get(keuken.ruimteNr) ?? [];
    const berekening = berekenKeuken(keuken, kamers.length, tarievenset);
    if (!berekening.voldoetAanBasiseisen) {
      const ontbrekend = Object.entries(keuken.basiseisen)
        .filter(([, aanwezig]) => !aanwezig)
        .map(([eis]) => eis)
        .join(', ');
      signalen.push({
        soort: 'poort-niet-gehaald',
        rubriek: 'r5',
        ruimteNr: keuken.ruimteNr,
        omschrijving: `Keuken (ruimte ${keuken.ruimteNr}) voldoet niet aan de basiseisen van §2.5.1 (ontbreekt: ${ontbrekend}) — de hele rubriek is 0 pt voor alle ${kamers.length} kamer(s) met toegang.`,
      });
    }
  }

  for (const post of input.sanitair) {
    const kamers = kamersBijRuimte.get(post.ruimteNr) ?? [];
    const berekening = berekenSanitair(post, ruimteBijNr.get(post.ruimteNr), kamers.length, tarievenset);
    if (!berekening.voldoetAanExtraEisen && (post.douche || post.bad || post.badDoucheCombinatie)) {
      signalen.push({
        soort: 'poort-niet-gehaald',
        rubriek: 'r6',
        ruimteNr: post.ruimteNr,
        omschrijving: `Sanitair (ruimte ${post.ruimteNr}) voldoet niet aan de extra eisen van §2.6.2 — extra voorzieningen leveren hier 0 pt op, ongeacht wat er verder is aangebracht.`,
      });
    }
  }

  return signalen;
}

function plafondSignalen(input: PandInvoer, tarievenset: Tarievenset): MargeSignaal[] {
  const kamersBijRuimte = kamersPerRuimte(input);
  const signalen: MargeSignaal[] = [];

  for (const keuken of input.keukens) {
    const kamers = kamersBijRuimte.get(keuken.ruimteNr) ?? [];
    const berekening = berekenKeuken(keuken, kamers.length, tarievenset);
    if (berekening.voldoetAanBasiseisen && berekening.extraRuw > berekening.extraGecapt) {
      signalen.push({
        soort: 'plafond-bereikt',
        rubriek: 'r5',
        ruimteNr: keuken.ruimteNr,
        omschrijving: `Keuken (ruimte ${keuken.ruimteNr}): extra voorzieningen (${berekening.extraRuw} pt ruw) zijn afgetopt op de basispunten (${berekening.basispunten} pt) — een extra voorziening levert hier geen winst meer op.`,
      });
    }
  }

  for (const post of input.sanitair) {
    const kamers = kamersBijRuimte.get(post.ruimteNr) ?? [];
    const ruimte = input.ruimtes.find((r) => r.nr === post.ruimteNr);
    const berekening = berekenSanitair(post, ruimte, kamers.length, tarievenset);
    if (berekening.voldoetAanExtraEisen && berekening.extraRuw > berekening.extraGecapt) {
      signalen.push({
        soort: 'plafond-bereikt',
        rubriek: 'r6',
        ruimteNr: post.ruimteNr,
        omschrijving: `Sanitair (ruimte ${post.ruimteNr}): extra voorzieningen (${berekening.extraRuw} pt ruw) zijn afgetopt op de douche-/badpunten (${berekening.doucheBadPunten} pt) — een extra voorziening levert hier geen winst meer op.`,
      });
    }
  }

  return signalen;
}

/** Kamers die vlak onder een kwart- of heelpuntgrens zitten: een kleine maatregel is daar onevenredig veel waard. */
function afrondingsSignalen(perKamer: Record<number, MargeKamer>): MargeSignaal[] {
  const DREMPEL = 0.05;
  const signalen: MargeSignaal[] = [];

  for (const margeKamer of Object.values(perKamer)) {
    if (margeKamer.afstandTotVolgendHeelPunt <= DREMPEL) {
      signalen.push({
        soort: 'afrondingsverlies',
        rubriek: 'r1',
        kamer: margeKamer.kamer,
        omschrijving: `Kamer ${margeKamer.kamer} zit op ${margeKamer.afstandTotVolgendHeelPunt.toFixed(3)} pt van het volgende hele punt in de eindsaldering — een kleine maatregel in vrijwel elke rubriek kan hier al een vol punt opleveren.`,
      });
    }
    for (const key of RUBRIEK_KEYS) {
      const r = margeKamer.perRubriek[key];
      if (r.afstandTotVolgendeKwartpunt <= DREMPEL && r.afstandTotVolgendeKwartpunt > 0) {
        signalen.push({
          soort: 'afrondingsverlies',
          rubriek: key,
          kamer: margeKamer.kamer,
          omschrijving: `Kamer ${margeKamer.kamer}, ${key.toUpperCase()}: zit op ${r.afstandTotVolgendeKwartpunt.toFixed(3)} pt van het volgende kwartpunt.`,
        });
      }
    }
  }

  return signalen;
}
