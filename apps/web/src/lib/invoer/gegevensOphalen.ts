import { alleGemeentes, coropVoorGemeente } from '@wwso/data';
import type { OphaalConflict, OphaalHerkomst, OphaalMelding, OphaalVeld, PandVeldenState } from './types';

/**
 * "Gegevens ophalen" (besluit eigenaar 2026-10-09): zuivere logica, zonder netwerk en zonder
 * systeemdatum (harde regel 5 is hier geen eis, maar testbaarheid wel: de antwoorden van de
 * openbare API's zijn vastgelegd in `fixtures/gegevensOphalen.ts`). De route
 * (`app/api/gegevens-ophalen`) doet de netwerkcalls en geeft de ruwe JSON aan deze functies.
 *
 * Bronnen: PDOK Locatieserver (adres → objectId/nummeraanduiding, gemeente), BAG OGC API
 * (verblijfsobject: gebruiksoppervlakte; pand: bouwjaar), Kadaster WOZ-waardeloket (WOZ-waarde +
 * peildatum). Alles wat niet gevonden wordt blijft `null`: nooit 0 of een schatting (harde regel 6).
 *
 * INTERPRETATIE: het "WOZ-oppervlak" in het formulier is de gebruiksoppervlakte van het BAG-
 * verblijfsobject (NEN 2580), niet de grondoppervlakte uit het WOZ-loket.
 */

// ── Adres → kandidaten ───────────────────────────────────────────────────────

export interface AdresKandidaat {
  objectId: string;
  nummeraanduidingId: string;
  /** Straat + huisnummer + letter/toevoeging, zoals PDOK het schrijft, bijv. "Kleiweg 179B". */
  adres: string;
  postcode: string;
  woonplaats: string;
  gemeente: string | null;
  huisnummer: number;
  /** Genormaliseerd (kleine letters, alleen letters/cijfers): "179-B" → "b", "19A-01" → "a01". */
  toevoeging: string;
  straat: string;
}

const normaliseer = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Splitst een getypt adres in straat, huisnummer en toevoeging. Het huisnummer is het LAATSTE
 * getal dat los staat (na een spatie of komma): straatnamen kunnen cijfers bevatten ("Plein 1944 5",
 * "Laan 1940-1945 12"). Een getal na een streepje of letter hoort bij de toevoeging ("19A-01",
 * "179-2"). Een toevoeging met spatie en cijfer ("179 2") is dubbelzinnig en wordt als huisnummer 2
 * gelezen; wie dat bedoelt typt "179-2".
 */
export function parseAdresInvoer(adres: string): { straat: string; huisnummer: number | null; toevoeging: string } {
  const s = adres.trim();
  const treffers = [...s.matchAll(/(?:^|[\s,])(\d+)(?=[A-Za-z\-\s]|$)/g)];
  const laatste = treffers[treffers.length - 1];
  if (!laatste) return { straat: s, huisnummer: null, toevoeging: '' };
  const begin = laatste.index + laatste[0].length - laatste[1].length;
  return {
    straat: s.slice(0, begin).replace(/[\s,]+$/, ''),
    huisnummer: parseInt(laatste[1], 10),
    toevoeging: normaliseer(s.slice(begin + laatste[1].length)),
  };
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;
const tekst = (x: unknown): string => (typeof x === 'string' ? x : '');

export function parseLocatieserver(json: unknown): AdresKandidaat[] {
  const docs = isObject(json) && isObject(json.response) && Array.isArray(json.response.docs) ? json.response.docs : [];
  const uit: AdresKandidaat[] = [];
  for (const d of docs) {
    if (!isObject(d)) continue;
    const objectId = tekst(d.adresseerbaarobject_id);
    const nummeraanduidingId = tekst(d.nummeraanduiding_id);
    if (!/^\d{16}$/.test(objectId) || !/^\d{16}$/.test(nummeraanduidingId)) continue;
    if (typeof d.huisnummer !== 'number') continue;
    const straat = tekst(d.straatnaam);
    const nlt = tekst(d.huis_nlt) || String(d.huisnummer);
    uit.push({
      objectId,
      nummeraanduidingId,
      adres: `${straat} ${nlt}`.trim(),
      postcode: tekst(d.postcode),
      woonplaats: tekst(d.woonplaatsnaam),
      gemeente: tekst(d.gemeentenaam) || null,
      huisnummer: d.huisnummer,
      toevoeging: normaliseer(tekst(d.huisletter) + tekst(d.huisnummertoevoeging)),
      straat,
    });
  }
  return uit;
}

/** `waarschuwing`: het getypte adres klopte niet met stad of straat; de gebruiker moet bevestigen. */
export type Waarschuwing = 'stad' | 'straat';
export type Keuze =
  | { soort: 'een'; kandidaat: AdresKandidaat }
  | { soort: 'kiezen'; kandidaten: AdresKandidaat[]; waarschuwing?: Waarschuwing }
  | { soort: 'geen' };

const MAX_KEUZES = 12;

/**
 * Port van `kies_bag_adres` (scraper): exact op huisnummer + toevoeging, nooit het eerste resultaat
 * gokken. Verschil: staat er géén toevoeging getypt maar bestaat alleen 49-A/-B/-C, dan krijgt de
 * gebruiker de keuze (besluit eigenaar). Een getypte toevoeging die niet bestaat geeft 'geen'.
 */
export function kiesKandidaat(kandidaten: AdresKandidaat[], invoer: { adres: string; stad: string }): Keuze {
  const inv = parseAdresInvoer(invoer.adres);
  if (inv.huisnummer === null) return { soort: 'geen' };
  let pool = kandidaten.filter((k) => k.huisnummer === inv.huisnummer);
  let waarschuwing: Waarschuwing | undefined;

  // Nooit stil terugvallen op een andere stad of straat: levert het filter niets op, dan beslist
  // de gebruiker (met een waarschuwing), en pas na de keuze wordt er iets opgehaald.
  const stad = normaliseer(invoer.stad);
  if (stad) {
    const opStad = pool.filter((k) => normaliseer(k.woonplaats) === stad || normaliseer(k.gemeente ?? '') === stad);
    if (opStad.length > 0) pool = opStad;
    else if (pool.length > 0) waarschuwing = 'stad';
  }
  const straat = normaliseer(inv.straat);
  if (straat && !waarschuwing) {
    const opStraat = pool.filter((k) => normaliseer(k.straat) === straat);
    if (opStraat.length > 0) pool = opStraat;
    else if (pool.length > 0) waarschuwing = 'straat';
  }

  const exact = pool.filter((k) => k.toevoeging === inv.toevoeging);
  const kiezen = (kandidaten: AdresKandidaat[]): Keuze => ({ soort: 'kiezen', kandidaten: kandidaten.slice(0, MAX_KEUZES), ...(waarschuwing ? { waarschuwing } : {}) });
  if (exact.length === 1 && !waarschuwing) return { soort: 'een', kandidaat: exact[0] };
  if (exact.length > 0) return kiezen(exact);
  if (inv.toevoeging === '' && pool.length > 0) return kiezen(pool);
  return { soort: 'geen' };
}

// ── BAG en WOZ ───────────────────────────────────────────────────────────────

const PAND_HREF = /^https:\/\/api\.pdok\.nl\/kadaster\/bag\/ogc\/v2\/collections\/pand\/items\/[0-9a-f-]{36}$/i;

/** De pand-href komt uit een extern antwoord en wordt daarna door de server opgehaald: alleen de
 * BAG-pand-URL van PDOK is toegestaan (geen open proxy / SSRF). */
export function veiligePandHref(href: unknown): string | null {
  return typeof href === 'string' && PAND_HREF.test(href) ? href : null;
}

export interface VboGegevens {
  oppervlakte: number | null;
  pandHrefs: string[];
}

export function parseVbo(json: unknown): VboGegevens | null {
  const features = isObject(json) && Array.isArray(json.features) ? json.features : [];
  const p = features[0] && isObject(features[0]) && isObject(features[0].properties) ? features[0].properties : null;
  if (!p) return null;
  // BAG gebruikt 0/1 als plaatshouder voor "onbekend": dat is geen oppervlakte.
  const opp = typeof p.oppervlakte === 'number' && Number.isFinite(p.oppervlakte) && p.oppervlakte > 1 && p.oppervlakte < 100000 ? p.oppervlakte : null;
  const hrefs = Array.isArray(p['pand.href']) ? p['pand.href'].map(veiligePandHref).filter((h): h is string => h !== null) : [];
  return { oppervlakte: opp, pandHrefs: hrefs };
}

export function parsePand(json: unknown): { bouwjaar: number | null } {
  const p = isObject(json) && isObject(json.properties) ? json.properties : null;
  const bj = p?.bouwjaar;
  return { bouwjaar: typeof bj === 'number' && Number.isInteger(bj) && bj >= 1000 && bj <= 2100 ? bj : null };
}

/** Een verblijfsobject kan in meerdere panden liggen: alleen een eenduidig bouwjaar telt. */
export function bepaalBouwjaar(jaren: (number | null)[]): { bouwjaar: number | null; reden?: string } {
  const bekend = [...new Set(jaren.filter((j): j is number => j !== null))];
  if (bekend.length === 1) return { bouwjaar: bekend[0] };
  if (bekend.length > 1) return { bouwjaar: null, reden: 'meerdere panden met verschillend bouwjaar' };
  return { bouwjaar: null, reden: 'geen bouwjaar in de BAG' };
}

export function parseWoz(json: unknown): { waarde: number; peildatum: string } | null {
  const lijst = isObject(json) && Array.isArray(json.wozWaarden) ? json.wozWaarden : [];
  const geldig = lijst.flatMap((w) =>
    isObject(w) && typeof w.peildatum === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.peildatum) && typeof w.vastgesteldeWaarde === 'number' && w.vastgesteldeWaarde > 0
      ? [{ waarde: w.vastgesteldeWaarde, peildatum: w.peildatum }]
      : [],
  );
  geldig.sort((a, b) => (a.peildatum < b.peildatum ? 1 : -1));
  return geldig[0] ?? null;
}

// ── Samenvoegen tot één resultaat ────────────────────────────────────────────

export interface OpgehaaldePand {
  adres: string;
  stad: string;
  gemeente: string | null;
  bouwjaar: number | null;
  wozWaarde: number | null;
  wozPeildatum: string | null;
  wozOppervlak: number | null;
  /** YYYY-MM-DD van het ophalen (door de server meegegeven). */
  datum: string;
  nietGevonden: { veld: OphaalVeld; reden: string }[];
}

export function maakOpgehaaldePand(inv: {
  kandidaat: AdresKandidaat;
  vbo: VboGegevens | null;
  bouwjaar: { bouwjaar: number | null; reden?: string };
  woz: { waarde: number; peildatum: string } | null;
  datum: string;
}): OpgehaaldePand {
  const { kandidaat: k, vbo, bouwjaar, woz, datum } = inv;
  const nietGevonden: OpgehaaldePand['nietGevonden'] = [];
  if (!k.gemeente) nietGevonden.push({ veld: 'gemeente', reden: 'gemeente ontbreekt in het antwoord' });
  if (bouwjaar.bouwjaar === null) nietGevonden.push({ veld: 'bouwjaar', reden: bouwjaar.reden ?? 'geen bouwjaar in de BAG' });
  if (!woz) nietGevonden.push({ veld: 'wozWaarde', reden: 'geen WOZ-waarde gevonden (bijvoorbeeld bij nieuwbouw)' });
  if (!vbo || vbo.oppervlakte === null) nietGevonden.push({ veld: 'wozOppervlak', reden: 'geen gebruiksoppervlakte in de BAG' });
  return {
    adres: k.adres,
    stad: k.woonplaats,
    gemeente: k.gemeente,
    bouwjaar: bouwjaar.bouwjaar,
    wozWaarde: woz?.waarde ?? null,
    wozPeildatum: woz?.peildatum ?? null,
    wozOppervlak: vbo?.oppervlakte ?? null,
    datum,
    nietGevonden,
  };
}

// ── Wat vullen we, wat is een conflict ───────────────────────────────────────

export interface Toepassing {
  /** Alleen velden die leeg waren: direct toe te passen. */
  patch: Partial<PandVeldenState>;
  herkomst: Partial<Record<OphaalVeld, OphaalHerkomst>>;
  conflicten: OphaalConflict[];
  melding: OphaalMelding;
}

const MAANDEN = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** "WOZ-loket · 9 okt" voor de tooltip bij het vinkje. */
export function herkomstTekst(h: OphaalHerkomst): string {
  const [, m, d] = h.datum.split('-');
  return `${h.bron} · ${parseInt(d, 10)} ${MAANDEN[parseInt(m, 10) - 1]}`;
}

const LABELS: Record<OphaalVeld, string> = {
  adres: 'Adres',
  stad: 'Stad',
  gemeente: 'Gemeente',
  bouwjaar: 'Bouwjaar',
  wozWaarde: 'WOZ-waarde',
  wozPeildatum: 'WOZ-peildatum',
  wozOppervlak: 'WOZ-oppervlak',
};

/** De naam zoals die in de CBS-lijst staat, of `undefined` als er niets (eenduidigs) past. */
function canoniekeGemeente(naam: string): string | undefined {
  const sleutel = normaliseer(naam);
  const treffers = alleGemeentes().filter((g) => normaliseer(g) === sleutel);
  return treffers.length === 1 ? treffers[0] : undefined;
}

const euro = (n: number) => `€ ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const getal = (s: string): number | null => {
  const n = Number(s.trim().replace(',', '.'));
  return s.trim() !== '' && Number.isFinite(n) ? n : null;
};

/**
 * Bepaalt wat er gevuld wordt en wat een conflict is. Een veld dat leeg is wordt gevuld; een veld
 * dat al dezelfde waarde heeft krijgt alleen de "opgehaald"-markering; een veld met een andere
 * waarde wordt NOOIT overschreven: het wordt een conflict dat de gebruiker beslist.
 */
export function bepaalToepassing(huidig: PandVeldenState, o: OpgehaaldePand, opties: { taxatieModus: boolean; adresLeidend?: boolean }): Toepassing {
  const patch: Partial<PandVeldenState> = {};
  const herkomst: Toepassing['herkomst'] = {};
  const conflicten: OphaalConflict[] = [];
  const notities: string[] = [];
  const bagH: OphaalHerkomst = { bron: 'BAG', datum: o.datum };
  const wozH: OphaalHerkomst = { bron: 'WOZ-loket', datum: o.datum };

  const zet = (veld: OphaalVeld, h: OphaalHerkomst, p: Partial<PandVeldenState>, huidigTekst: string, opgehaaldTekst: string, status: 'leeg' | 'gelijk' | 'ander') => {
    if (status === 'leeg') {
      Object.assign(patch, p);
      herkomst[veld] = h;
    } else if (status === 'gelijk') {
      herkomst[veld] = h;
    } else {
      conflicten.push({ veld, huidig: huidigTekst, opgehaaldTekst, patch: p, herkomst: { [veld]: h } });
    }
  };

  // Tekstvelden: alleen een conflict bij een inhoudelijk ander adres/andere stad, niet bij spelling.
  // Na een expliciete keuze uit de kandidatenlijst (`adresLeidend`) is het gekozen adres leidend:
  // het hoort bij de opgehaalde objectgegevens en wordt dus ingevuld, geen conflict.
  for (const veld of ['adres', 'stad'] as const) {
    const nieuw = o[veld];
    const nu = huidig[veld];
    if (nu.trim() === '' || (opties.adresLeidend && nu !== nieuw)) zet(veld, bagH, { [veld]: nieuw }, nu, nieuw, 'leeg');
    else if (normaliseer(nu) !== normaliseer(nieuw)) zet(veld, bagH, { [veld]: nieuw }, nu, nieuw, 'ander');
    else if (opties.adresLeidend) zet(veld, bagH, {}, nu, nieuw, 'gelijk');
  }

  // Gemeente + COROP-gebied horen samen (zoals `zetGemeente` in het formulier). De naam uit de BAG
  // wordt hoofdletter- en leesteken-ongevoelig tegen de CBS-lijst gehouden ("Bergen (NH)" = "Bergen (NH.)").
  if (o.gemeente) {
    const gemeente = canoniekeGemeente(o.gemeente);
    const corop = gemeente === undefined ? undefined : coropVoorGemeente(gemeente);
    if (gemeente === undefined || corop === undefined) {
      notities.push(`De gemeente "${o.gemeente}" is niet herkend: kies die zelf.`);
    } else {
      const p = { gemeente, coropGebied: corop };
      // Ontbreekt een van beide, dan wordt het aangevuld zolang het aanwezige deel klopt.
      const gemeenteKlopt = huidig.gemeente === '' || huidig.gemeente === gemeente;
      const coropKlopt = huidig.coropGebied === '' || huidig.coropGebied === corop;
      zet('gemeente', bagH, p, huidig.gemeente || huidig.coropGebied, gemeente, gemeenteKlopt && coropKlopt ? 'leeg' : 'ander');
    }
  }

  const getalVeld = (veld: 'bouwjaar' | 'wozOppervlak' | 'wozWaarde', nieuw: number | null, h: OphaalHerkomst, tekstVan: (n: number) => string) => {
    if (nieuw === null) return;
    const nu = huidig[veld];
    const nuGetal = getal(nu);
    const p = { [veld]: String(nieuw) };
    zet(veld, h, p, nu, tekstVan(nieuw), nu.trim() === '' ? 'leeg' : nuGetal === nieuw ? 'gelijk' : 'ander');
  };
  getalVeld('bouwjaar', o.bouwjaar, bagH, String);
  getalVeld('wozOppervlak', o.wozOppervlak, bagH, (n) => `${n} m²`);

  if (opties.taxatieModus) {
    if (o.wozWaarde !== null) notities.push('De WOZ-waarde is niet ingevuld: je gebruikt nu de taxatiewaarde. Zet die schakelaar uit als je de WOZ-waarde wilt gebruiken.');
  } else {
    // Waarde en peildatum horen bij elkaar (één WOZ-beschikking): samen invullen, samen conflict.
    if (o.wozWaarde !== null && o.wozPeildatum !== null) {
      const nuWaarde = huidig.wozWaarde;
      const waardeLeeg = nuWaarde.trim() === '';
      // De standaard-peildatum is geen eigen invoer zolang er geen WOZ-waarde staat.
      const peilLeeg = huidig.wozPeildatum === '' || waardeLeeg;
      const waardeGelijk = !waardeLeeg && getal(nuWaarde) === o.wozWaarde;
      const peilGelijk = !peilLeeg && huidig.wozPeildatum === o.wozPeildatum;
      const p = { wozWaarde: String(o.wozWaarde), wozPeildatum: o.wozPeildatum };
      const beide = { wozWaarde: wozH, wozPeildatum: wozH };
      const tekst = `${euro(o.wozWaarde)} (1 januari ${o.wozPeildatum.slice(0, 4)})`;
      if (waardeLeeg) {
        Object.assign(patch, p);
        Object.assign(herkomst, beide);
      } else if (waardeGelijk && (peilGelijk || peilLeeg)) {
        if (peilLeeg) patch.wozPeildatum = o.wozPeildatum;
        Object.assign(herkomst, beide);
      } else {
        const peilTekst = huidig.wozPeildatum ? ` (1 januari ${huidig.wozPeildatum.slice(0, 4)})` : '';
        conflicten.push({ veld: 'wozWaarde', huidig: `${nuWaarde}${peilTekst}`, opgehaaldTekst: tekst, patch: p, herkomst: beide });
      }
    }
  }

  const gevonden = o.nietGevonden.filter((n) => !(opties.taxatieModus && n.veld === 'wozWaarde'));
  const aantal = Object.keys(herkomst).length;
  const delen: string[] = [];
  if (aantal > 0) delen.push(`${aantal} ${aantal === 1 ? 'veld' : 'velden'} opgehaald uit de BAG en het WOZ-loket.`);
  else delen.push('Er is niets nieuws opgehaald.');
  if (conflicten.length > 0) {
    const n = conflicten.length;
    delen.push(`Bij ${n} ${n === 1 ? 'veld' : 'velden'} had je zelf al iets anders ingevuld: dat is niet overschreven. Kies per veld.`);
  }
  if (gevonden.length > 0) {
    delen.push(`Niet gevonden: ${gevonden.map((n) => `${LABELS[n.veld]} (${n.reden})`).join(', ')}. Vul dit zelf in; er wordt niets geschat.`);
  }
  delen.push(...notities);
  if (conflicten.length === 0 && gevonden.length === 0 && notities.length === 0 && aantal > 0) delen.push('Je kunt alles aanpassen.');

  const ok = conflicten.length === 0 && gevonden.length === 0 && notities.length === 0 && aantal > 0;
  return { patch, herkomst, conflicten, melding: { soort: ok ? 'ok' : 'let', tekst: delen.join(' ') } };
}
