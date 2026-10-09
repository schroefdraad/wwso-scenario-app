import { coropVoorGemeente } from '@wwso/data';
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

export function parseAdresInvoer(adres: string): { straat: string; huisnummer: number | null; toevoeging: string } {
  const m = adres.trim().match(/^(?:(.*?)[\s,]+)?(\d+)\s*[-\s]?\s*([A-Za-z0-9\-\s]*)$/);
  if (!m) return { straat: adres.trim(), huisnummer: null, toevoeging: '' };
  return { straat: (m[1] ?? '').trim(), huisnummer: parseInt(m[2], 10), toevoeging: normaliseer(m[3] ?? '') };
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

export type Keuze = { soort: 'een'; kandidaat: AdresKandidaat } | { soort: 'kiezen'; kandidaten: AdresKandidaat[] } | { soort: 'geen' };

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

  const stad = normaliseer(invoer.stad);
  if (stad) {
    const opStad = pool.filter((k) => normaliseer(k.woonplaats) === stad || normaliseer(k.gemeente ?? '') === stad);
    if (opStad.length > 0) pool = opStad;
  }
  const straat = normaliseer(inv.straat);
  if (straat) {
    const opStraat = pool.filter((k) => normaliseer(k.straat) === straat);
    if (opStraat.length > 0) pool = opStraat;
  }

  const exact = pool.filter((k) => k.toevoeging === inv.toevoeging);
  if (exact.length === 1) return { soort: 'een', kandidaat: exact[0] };
  if (exact.length > 1) return { soort: 'kiezen', kandidaten: exact.slice(0, MAX_KEUZES) };
  if (inv.toevoeging === '' && pool.length > 0) return { soort: 'kiezen', kandidaten: pool.slice(0, MAX_KEUZES) };
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
export function bepaalToepassing(huidig: PandVeldenState, o: OpgehaaldePand, opties: { taxatieModus: boolean }): Toepassing {
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
      conflicten.push({ veld, huidig: huidigTekst, opgehaaldTekst, patch: p, herkomst: h });
    }
  };

  // Tekstvelden: alleen een conflict bij een inhoudelijk ander adres/andere stad, niet bij spelling.
  for (const veld of ['adres', 'stad'] as const) {
    const nieuw = o[veld];
    const nu = huidig[veld];
    if (nu.trim() === '') zet(veld, bagH, { [veld]: nieuw }, nu, nieuw, 'leeg');
    else if (normaliseer(nu) !== normaliseer(nieuw)) zet(veld, bagH, { [veld]: nieuw }, nu, nieuw, 'ander');
  }

  // Gemeente + COROP-gebied horen samen (zoals `zetGemeente` in het formulier).
  if (o.gemeente) {
    const corop = coropVoorGemeente(o.gemeente);
    if (corop === undefined) {
      notities.push(`De gemeente "${o.gemeente}" is niet herkend: kies die zelf.`);
    } else {
      const p = { gemeente: o.gemeente, coropGebied: corop };
      const leegNu = huidig.gemeente === '' && huidig.coropGebied === '';
      const gelijk = huidig.gemeente !== '' ? huidig.gemeente === o.gemeente : huidig.coropGebied === corop;
      zet('gemeente', bagH, p, huidig.gemeente || huidig.coropGebied, o.gemeente, leegNu ? 'leeg' : gelijk ? 'gelijk' : 'ander');
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
    getalVeld('wozWaarde', o.wozWaarde, wozH, euro);
    if (o.wozPeildatum !== null) {
      // De standaard-peildatum is geen eigen invoer zolang er geen WOZ-waarde staat.
      const nu = huidig.wozPeildatum;
      const status = nu === '' || huidig.wozWaarde.trim() === '' ? 'leeg' : nu === o.wozPeildatum ? 'gelijk' : 'ander';
      zet('wozPeildatum', wozH, { wozPeildatum: o.wozPeildatum }, nu, `1 januari ${o.wozPeildatum.slice(0, 4)}`, status);
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
