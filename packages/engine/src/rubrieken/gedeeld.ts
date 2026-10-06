import type { PandInvoer } from '../types/index';
import type { Ruimte, RuimteType } from '../types/index';

/**
 * Vertrekken (§2.2.1). Het beleidsboek: "een ruimte die uitsluitend als keuken, badkamer of
 * doucheruimte is bestemd is altijd een vertrek". Gemeenschappelijke vertrekken vallen onder
 * rubriek 9 en horen hier dus niet bij.
 */
export const VERTREK_TYPES: readonly RuimteType[] = ['Privévertrek', 'Keuken', 'Badruimte'];

/** Overige ruimten (§2.2.2): bijkeuken, berging, wasruimte, kelder, toiletruimte. */
export const OVERIGE_RUIMTE_TYPES: readonly RuimteType[] = [
  'Berging',
  'Bijkeuken',
  'Wasruimte',
  'Overige ruimte',
  'Toiletruimte',
];

/**
 * Verkeersruimten (§2.2.3) krijgen géén oppervlaktepunten in R1/R2, maar tellen in R3 wél
 * mee voor verwarming (§2.3). Daarom een eigen constante in plaats van "gewoon weglaten".
 */
export const VERKEERSRUIMTE_TYPES: readonly RuimteType[] = ['Verkeersruimte'];

/**
 * Ruimtetypen waarin een keuken (R5) of sanitaire voorziening (R6) gewaardeerd wordt
 * (voorzieningen-audit 2026-10-03). Het beleid plaatst voorzieningen steeds in een vertrek of
 * overige ruimte: "wastafel in vertrek/overige ruimte", "douchecabine die in een ander vertrek of
 * overige ruimte staat" (§2.6.1), "open keuken in een vertrek of overige ruimte" (§2.3.2), en
 * voorzieningen "die zich bevinden in gemeenschappelijke vertrekken en overige ruimten" (§2.9.2).
 * Niet in: buitenruimte (R8, alleen m²), parkeerplek (R10) en verkeersruimte — die laatste is per
 * definitie niet bestemd om er duurzaam te verblijven (§2.2.3); een gang mét keuken is in de
 * praktijk een vertrek of overige ruimte en hoort dan ook zo ingevoerd te worden (INTERPRETATIE,
 * het beleid sluit verkeersruimte niet letterlijk uit).
 */
export const VOORZIENING_RUIMTE_TYPES: readonly RuimteType[] = [
  ...VERTREK_TYPES,
  ...OVERIGE_RUIMTE_TYPES,
  'Gemeenschappelijk vertrek',
  'Gemeenschappelijke overige ruimte',
];

/**
 * Ruimtetypen die een zolderruimte kunnen zijn (§2.2.1.3/§2.2.2.3): een zolder wordt
 * gewaardeerd als vertrek of als overige ruimte — in deze app dus een privévertrek, berging of
 * overige ruimte. Niet bij typen met een vaste functie (keuken, badruimte, toiletruimte,
 * bijkeuken, wasruimte): een badkamer op zolder is een badkamer, geen zolderruimte.
 * Gemeenschappelijke zolders staan nog open (rubriek 9 kent nog geen zolderregels).
 */
export const ZOLDER_RUIMTE_TYPES: readonly RuimteType[] = ['Privévertrek', 'Berging', 'Overige ruimte'];

export function waardeertVoorzieningen(type: RuimteType): boolean {
  return VOORZIENING_RUIMTE_TYPES.includes(type);
}

/**
 * Afronding per rubriek op kwartpunten (§2.1.6): "vanaf een achtste (1/8) punt naar boven",
 * ofwel FLOOR(x + 0,125; 0,25). Het beleidsboek geeft 4,81 → 4,75 als voorbeeld.
 * Geldt voor élke rubriek — ook R1, anders dan de taakomschrijving suggereerde.
 */
export function rondAfOpKwartpunten(x: number): number {
  return Math.floor((x + 0.125) / 0.25) * 0.25;
}

/**
 * Eindsaldering op hele punten (§2.1.7): vanaf 0,5 omhoog, daaronder omlaag.
 * Alleen voor het totaal van alle rubrieken samen, niet per rubriek.
 */
export function rondAfOpHelePunten(x: number): number {
  return Math.floor(x + 0.5);
}

/**
 * Afronding van vierkante meters (§2.1.1.1): "Bij een getal dat eindigt op 0,50 m² wordt
 * afgerond omhoog (28,51 → 29), bij 0,49 of lager naar beneden (15,43 → 15)."
 */
export function rondAfOpHeleM2(m2: number): number {
  return Math.floor(m2 + 0.5);
}

/** Afronding op twee decimalen (§2.8.6: oppervlakte per categorie buitenruimte). */
export function rondAfOp2Decimalen(x: number): number {
  return Math.round(x * 100) / 100;
}

export const MIN_VERTREK_M2 = 4;
export const MIN_OVERIGE_RUIMTE_M2 = 2;

/** Een ruimte die voor de waardering als een ander type telt dan ingevoerd (of helemaal niet). */
export interface Herindeling {
  ruimteNr: number;
  naam: string;
  ingevoerd: RuimteType;
  telt: RuimteType | null;
  reden: string;
}

/**
 * Als welk type telt deze ruimte voor de oppervlakte- en verwarmingsrubrieken (R1–R4, R9, R13)?
 * Audit 2026-10-06, besluit eigenaar "minder punten conform beleid":
 * - §2.2.1.3: een zolder is alleen een vertrek met een vaste trap én een beschoten dak.
 * - §2.2.1.2: een vertrek is "minimaal 4,00 m² groot"; anders kan het een overige ruimte zijn.
 * - §2.2.2.2: een overige ruimte heeft "een minimale oppervlakte van 2,00 m²"; anders telt hij niet.
 * - §2.2.1: een keuken of badkamer "is altijd een vertrek", ongeacht de grootte.
 * INTERPRETATIE: voor gemeenschappelijke ruimten gelden dezelfde minimummaten (§2.9.6 verwijst naar de
 * definities van §2.2). INTERPRETATIE: de minimummaat geldt na de meterkastcorrectie van §2.2.4 (de
 * gemeten oppervlakte is al zonder meterkast).
 * R5/R6 gebruiken bewust het ingevoerde type: een toilet in een kleine toiletruimte blijft een
 * toilet in een toiletruimte (§2.6.1).
 * Overige voorwaarden (breedte, hoogte, raam, ventilatie) zitten niet in de invoer en worden niet getoetst.
 */
export function waarderingsType(ruimte: Ruimte): { type: RuimteType | null; reden?: string } {
  const m2 = effectieveOppervlakteM2(ruimte);
  const alsOverige = (overigType: RuimteType, reden: string) =>
    m2 >= MIN_OVERIGE_RUIMTE_M2
      ? { type: overigType, reden: `${reden} → telt als ${overigType.toLowerCase()}` }
      : { type: null, reden: `${reden} en kleiner dan ${MIN_OVERIGE_RUIMTE_M2} m² → telt niet mee` };

  if (ruimte.type === 'Privévertrek') {
    if (ruimte.zolder && !(ruimte.zolder.vasteTrap && ruimte.zolder.beschotenDak)) {
      return alsOverige('Overige ruimte', 'zolder zonder vaste trap én beschoten dak is geen vertrek (§2.2.1.3)');
    }
    if (m2 < MIN_VERTREK_M2) {
      return alsOverige('Overige ruimte', `kleiner dan ${MIN_VERTREK_M2} m² is geen vertrek (§2.2.1.2)`);
    }
  }
  if (ruimte.type === 'Gemeenschappelijk vertrek' && m2 < MIN_VERTREK_M2) {
    return alsOverige('Gemeenschappelijke overige ruimte', `kleiner dan ${MIN_VERTREK_M2} m² is geen vertrek (§2.2.1.2)`);
  }
  if ((OVERIGE_RUIMTE_TYPES.includes(ruimte.type) || ruimte.type === 'Gemeenschappelijke overige ruimte') && m2 < MIN_OVERIGE_RUIMTE_M2) {
    return { type: null, reden: `kleiner dan ${MIN_OVERIGE_RUIMTE_M2} m² is geen overige ruimte (§2.2.2.2) → telt niet mee` };
  }
  return { type: ruimte.type };
}

/** Alle ruimtes die anders tellen dan ingevoerd, voor de toelichting en de waarschuwingen. */
export function herindelingen(input: PandInvoer): Herindeling[] {
  return input.ruimtes.flatMap((r) => {
    const { type, reden } = waarderingsType(r);
    return type === r.type ? [] : [{ ruimteNr: r.nr, naam: r.naam, ingevoerd: r.type, telt: type, reden: reden ?? '' }];
  });
}

/**
 * Toelichtingsregels voor de herindelingen, alleen voor ruimtes waar een kamer toegang toe heeft en
 * die voor deze rubriek uitmaken: R1 = ingevoerd als privévertrek, R2 = telt als (of was) een
 * privé overige ruimte. Gemeenschappelijke ruimtes staan in R9 en worden hier niet herhaald.
 */
export function herindelingToelichting(rubriek: 'R1' | 'R2', input: PandInvoer): string[] {
  const metToegang = new Set(input.toewijzing.filter((t) => t.kamers.length > 0).map((t) => t.ruimteNr));
  return herindelingen(input)
    .filter((h) => metToegang.has(h.ruimteNr))
    .filter((h) =>
      rubriek === 'R1'
        ? h.ingevoerd === 'Privévertrek'
        : h.telt === 'Overige ruimte' || OVERIGE_RUIMTE_TYPES.includes(h.ingevoerd),
    )
    .map((h) => `${rubriek}: ${h.naam || `ruimte ${h.ruimteNr}`} (${h.ingevoerd.toLowerCase()}) ${h.reden}`);
}

/** Een Map met alle kamernummers 1..aantalKamers, elk op 0 — startpunt voor "optellen per kamer". */
export function nulPerKamer(aantalKamers: number): Map<number, number> {
  const resultaat = new Map<number, number>();
  for (let kamer = 1; kamer <= aantalKamers; kamer++) {
    resultaat.set(kamer, 0);
  }
  return resultaat;
}

/** Eén ruimte met het aantal kamers dat er toegang toe heeft, gezien vanuit één kamer. */
export interface ToegankelijkeRuimte {
  ruimte: Ruimte;
  nKamersMetToegang: number;
}

/**
 * Voor elke kamer: welke ruimtes zijn toegankelijk, en door hoeveel kamers elke ruimte
 * gedeeld wordt. Die deler volgt uit §2.1.5: punten worden alleen verdeeld over de bewoners
 * die volgens het huurcontract toegang en gebruiksrecht hebben.
 */
export function ruimtesPerKamer(
  input: PandInvoer,
  opties: { herindelen?: boolean } = {},
): Map<number, ToegankelijkeRuimte[]> {
  // `herindelen: false` voor de suggesties: die zoeken een fysieke privékamer (bijv. "vergroot
  // deze kamer tot 8 m²"), ook als die voor de waardering als overige ruimte telt.
  const herindelen = opties.herindelen ?? true;
  const ruimteBijNr = new Map(input.ruimtes.map((r) => [r.nr, r] as const));

  const resultaat = new Map<number, ToegankelijkeRuimte[]>();
  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    resultaat.set(kamer, []);
  }

  for (const entry of input.toewijzing) {
    const ingevoerd = ruimteBijNr.get(entry.ruimteNr);
    if (!ingevoerd) continue; // referentiële integriteit is al geborgd door PandInvoer-validatie
    // Waarderingstype (§2.2.1.2/§2.2.1.3/§2.2.2.2): te kleine ruimtes en zolders zonder trap/dak
    // tellen als ander type of helemaal niet. Zie `waarderingsType`.
    const { type } = herindelen ? waarderingsType(ingevoerd) : { type: ingevoerd.type };
    if (type === null) continue;
    const ruimte = type === ingevoerd.type ? ingevoerd : { ...ingevoerd, type };
    const nKamersMetToegang = entry.kamers.length;
    for (const kamer of entry.kamers) {
      if (kamer > input.pand.aantalKamers) continue;
      resultaat.get(kamer)?.push({ ruimte, nKamersMetToegang });
    }
  }

  return resultaat;
}

/**
 * Per ruimtenummer de kamers die er toegang en gebruiksrecht toe hebben. Nodig voor R5 en R6,
 * die vanuit een voorziening naar de kamers redeneren in plaats van andersom.
 */
export function kamersPerRuimte(input: PandInvoer): Map<number, number[]> {
  return new Map(
    input.toewijzing.map(
      (t) => [t.ruimteNr, t.kamers.filter((k) => k <= input.pand.aantalKamers)] as const,
    ),
  );
}

/**
 * Correctie op de gemeten oppervlakte bij een gas-/elektrameter in de ruimte of een kast
 * daarin (§2.2.4, "Gas- en/of elektrameter"): 30 × 60 cm = 0,18 m² eraf, vóórdat een rubriek
 * met de oppervlakte rekent — dit is de minimale afmeting van een meterkast bij bestaande
 * bouw, geen losse puntenaftrek. Geldt voor vertrekken en overige ruimten (R1/R2) én
 * gemeenschappelijke vertrekken/overige ruimten (R9, §2.9.6 verwijst terug naar §2.2.4) — niet
 * voor buitenruimten of parkeerplekken, die hun eigen meetinstructie hebben (§2.8.5 resp.
 * §2.10).
 */
const METERKAST_AFTREK_M2 = 0.18;

export function effectieveOppervlakteM2(ruimte: Ruimte): number {
  return ruimte.heeftMeterkast ? Math.max(0, ruimte.oppervlakteM2 - METERKAST_AFTREK_M2) : ruimte.oppervlakteM2;
}

/**
 * De ruwe, ongeronde oppervlakte die één kamer "heeft": alle privéruimten van het gevraagde
 * type opgeteld, plus per gedeelde ruimte het aan de kamer toegerekende deel (§2.1.5: delen
 * door het aantal onzelfstandige woonruimten met toegang en gebruiksrecht).
 *
 * Een ruimte geldt hier als privé wanneer precies één kamer er toegang toe heeft.
 *
 * Dit is de grondslag zoals het beleidsboek hem beschrijft zónder rekenregel erbovenop —
 * gebruikt door R4 (§2.4.4). R1 en R2 leggen er hun eigen m²-afronding overheen, zie
 * `oppervlakteVolgensRekenregel`.
 */
export function ongerondeOppervlakte(
  ruimtes: ToegankelijkeRuimte[],
  types: readonly RuimteType[],
): { priveM2: number; gedeeldM2: number; totaalM2: number } {
  const relevant = ruimtes.filter((r) => types.includes(r.ruimte.type));

  const priveM2 = relevant
    .filter((r) => r.nKamersMetToegang === 1)
    .reduce((som, r) => som + effectieveOppervlakteM2(r.ruimte), 0);
  const gedeeldM2 = relevant
    .filter((r) => r.nKamersMetToegang > 1)
    .reduce((som, r) => som + effectieveOppervlakteM2(r.ruimte) / r.nKamersMetToegang, 0);

  return { priveM2, gedeeldM2, totaalM2: priveM2 + gedeeldM2 };
}

/**
 * De rekenregel van §2.2.1.1 (vertrekken) / §2.2.2.1 (overige ruimten), die op vierkante
 * meters afrondt en niet op punten:
 *
 * 1. bepaal de oppervlakte per ruimte
 * 2. tel alle *privé* ruimten op en rond af op hele m²
 * 3. doe hetzelfde voor de *gemeenschappelijke* ruimten (na deling door het aantal kamers
 *    met toegang)
 * 4. tel beide op en rond opnieuw af op hele m²
 *
 * LET OP: beide paragrafen staan in de brontekst genummerd als "2.1.1.1 Rekenregels
 * vertrekken" respectievelijk "2.2.2.1 Rekenregels vertrekken" — allebei fout (de eerste
 * hoort 2.2.1.1 te zijn, de tweede gaat blijkens zijn inhoud over overige ruimten). De
 * plaatsing in de documentstructuur is leidend, niet de kop.
 *
 * Deze rekenregel is expliciet gekoppeld aan rubriek 1 en 2 — elke variant sluit af met
 * "Bepaal het puntenaantal voor de vertrekken / de overige ruimtes op basis van de m²".
 * Andere rubrieken die met dezelfde oppervlakte rekenen (R4, §2.4.4) halen hem niet aan en
 * gebruiken daarom `ongerondeOppervlakte`; R13 doet dat wél, want §2.13 verwijst met zoveel
 * woorden naar "de totale oppervlakte van het onderdeel vertrekken (rubriek 1)".
 */
export function oppervlakteVolgensRekenregel(
  ruimtes: ToegankelijkeRuimte[],
  types: readonly RuimteType[],
): { priveM2: number; gedeeldM2: number; totaalM2: number } {
  const ruw = ongerondeOppervlakte(ruimtes, types);

  const priveM2 = rondAfOpHeleM2(ruw.priveM2);
  const gedeeldM2 = rondAfOpHeleM2(ruw.gedeeldM2);

  return { priveM2, gedeeldM2, totaalM2: rondAfOpHeleM2(priveM2 + gedeeldM2) };
}

/**
 * De vertrekoppervlakte in hele m² volgens de rekenregel van rubriek 1 — de grondslag voor
 * R1 zelf en voor R13, dat er in §2.13 letterlijk naar verwijst ("rubriek 1").
 * R4 gebruikt bewust een ándere grondslag, zie `ongerondeVertrekOppervlakteM2`.
 */
export function vertrekOppervlakteM2(ruimtes: ToegankelijkeRuimte[]): number {
  return oppervlakteVolgensRekenregel(ruimtes, VERTREK_TYPES).totaalM2;
}

/**
 * De vertrekoppervlakte zónder m²-afronding: "het totaal aantal m² oppervlakte die de huurder
 * heeft als privé vertrekken en de aan huurder toe te rekenen gemeenschappelijke vertrekken"
 * (§2.4.4), de grondslag voor R4.
 *
 * Waarom niet de afgeronde R1-uitkomst: de m²-afronding staat uitsluitend in de rekenregel
 * van rubriek 1 (§2.2.1.1), die eindigt met "Bepaal het puntenaantal voor de vertrekken op
 * basis van de m²" — een instructie voor rubriek 1, niet voor de rest van het stelsel. §2.4.4
 * haalt die rekenregel niet aan en beschrijft de oppervlakte zelfstandig. Waar het
 * beleidsboek de úitkomst van rubriek 1 bedoelt, zegt het dat expliciet (§2.13: "de totale
 * oppervlakte van het onderdeel vertrekken (rubriek 1)"). Drie officiële Huurprijscheck-
 * uitkomsten (golden master, Kleiweg 179-B) bevestigen dit: alleen de ongeronde grondslag
 * reproduceert alle drie exact. Zie `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`.
 */
export function ongerondeVertrekOppervlakteM2(ruimtes: ToegankelijkeRuimte[]): number {
  // §2.4.4 (letterlijk): "de aan huurder toe te rekenen gemeenschappelijke vertrekken" — ook het type
  // 'Gemeenschappelijk vertrek' (R9). INTERPRETATIE: dezelfde toerekening als R9, ÷ adressen ÷ kamers
  // (audit 2026-10-06, bevinding 3.1; voorbeeld §2.4.4: woonkamer 40 m² / 4).
  const gemeenschappelijk = ruimtes
    .filter((r) => r.ruimte.type === 'Gemeenschappelijk vertrek')
    .reduce((som, r) => som + effectieveOppervlakteM2(r.ruimte) / (r.ruimte.aantalAdressenMetToegang ?? 1) / r.nKamersMetToegang, 0);
  return ongerondeOppervlakte(ruimtes, VERTREK_TYPES).totaalM2 + gemeenschappelijk;
}
