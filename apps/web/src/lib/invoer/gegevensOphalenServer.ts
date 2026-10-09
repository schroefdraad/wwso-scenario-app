import {
  bepaalBouwjaar,
  kiesKandidaat,
  maakOpgehaaldePand,
  parseLocatieserver,
  parsePand,
  parseVbo,
  parseWoz,
  type AdresKandidaat,
  type OpgehaaldePand,
} from './gegevensOphalen';

/**
 * Netwerkdeel van "Gegevens ophalen", los van Next.js zodat het met een nep-fetch te testen is.
 * Port van `fetch_woz_data` uit het scraperproject: PDOK Locatieserver → BAG OGC API
 * (verblijfsobject, dan pand) → Kadaster WOZ-waardeloket. Alle hosts staan hieronder vast; er
 * gaat niets van de gebruiker mee in een URL behalve de zoektekst (URL-gecodeerd) en een
 * nummeraanduiding van precies 16 cijfers.
 */

const PDOK = 'https://api.pdok.nl';
const LOCATIESERVER = `${PDOK}/bzk/locatieserver/search/v3_1/free`;
const BAG_VBO = `${PDOK}/kadaster/bag/ogc/v2/collections/verblijfsobject/items`;
const WOZ = 'https://api.kadaster.nl/lvwoz/wozwaardeloket-api/v1/wozwaarde/nummeraanduiding';
const TIMEOUT_MS = 8000;
const MAX_PANDEN = 3;
const FL = 'id,weergavenaam,type,adresseerbaarobject_id,nummeraanduiding_id,woonplaatsnaam,gemeentenaam,postcode,huis_nlt,huisnummer,huisletter,huisnummertoevoeging,straatnaam';

export type OphaalVerzoek = { adres: string; stad: string } | { nummeraanduidingId: string };

export type OphaalAntwoord =
  | { status: 'ok'; gegevens: OpgehaaldePand }
  | { status: 'kiezen'; kandidaten: AdresKandidaat[] }
  | { status: 'niet_gevonden' }
  | { status: 'fout'; bericht: string };

export function parseOphaalVerzoek(body: unknown): OphaalVerzoek | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.nummeraanduidingId !== undefined) {
    return typeof b.nummeraanduidingId === 'string' && /^\d{16}$/.test(b.nummeraanduidingId) ? { nummeraanduidingId: b.nummeraanduidingId } : null;
  }
  if (typeof b.adres !== 'string') return null;
  const adres = b.adres.trim();
  const stad = typeof b.stad === 'string' ? b.stad.trim() : '';
  if (adres === '' || adres.length > 120 || stad.length > 80) return null;
  return { adres, stad };
}

export interface FetchLike {
  (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}
export interface OphaalAfhankelijkheden {
  fetch: FetchLike;
  /** YYYY-MM-DD van vandaag, door de aanroeper meegegeven. */
  datum: string;
  wacht?: (ms: number) => Promise<void>;
}

type Antwoord = { status: number; json: unknown } | null;

async function haal(url: string, d: OphaalAfhankelijkheden): Promise<Antwoord> {
  try {
    const r = await d.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'application/json' } });
    let json: unknown = null;
    try {
      json = await r.json();
    } catch {
      /* geen JSON: status zegt genoeg */
    }
    return { status: r.status, json };
  } catch {
    return null;
  }
}

const zoekUrl = (q: string, rows: number) => `${LOCATIESERVER}?q=${encodeURIComponent(q)}&rows=${rows}&fq=${encodeURIComponent('type:adres')}&fl=${FL}`;

export async function haalGegevensOp(verzoek: OphaalVerzoek, d: OphaalAfhankelijkheden): Promise<OphaalAntwoord> {
  const wacht = d.wacht ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const FOUT: OphaalAntwoord = { status: 'fout', bericht: 'De adresdienst (PDOK) is nu niet bereikbaar.' };

  let kandidaat: AdresKandidaat;
  if ('nummeraanduidingId' in verzoek) {
    const r = await haal(zoekUrl(`nummeraanduiding_id:${verzoek.nummeraanduidingId}`, 1), d);
    if (!r || r.status !== 200) return FOUT;
    const gevonden = parseLocatieserver(r.json).find((k) => k.nummeraanduidingId === verzoek.nummeraanduidingId);
    if (!gevonden) return { status: 'niet_gevonden' };
    kandidaat = gevonden;
  } else {
    const r = await haal(zoekUrl(`${verzoek.adres} ${verzoek.stad}`.trim(), 15), d);
    if (!r || r.status !== 200) return FOUT;
    const keuze = kiesKandidaat(parseLocatieserver(r.json), verzoek);
    if (keuze.soort === 'geen') return { status: 'niet_gevonden' };
    if (keuze.soort === 'kiezen') return { status: 'kiezen', kandidaten: keuze.kandidaten };
    kandidaat = keuze.kandidaat;
  }

  // Verblijfsobject en WOZ-waarde hangen niet van elkaar af.
  const wozOphalen = async (): Promise<Antwoord> => {
    const url = `${WOZ}/${kandidaat.nummeraanduidingId}`;
    let r = await haal(url, d);
    // Het Kadaster geeft bij gelijktijdige belasting soms een valse 404 voor een adres dat wél
    // een WOZ-waarde heeft (scraperproject): één tweede poging.
    if (!r || r.status !== 200) {
      await wacht(1500);
      r = await haal(url, d);
    }
    return r;
  };
  const [vboR, wozR] = await Promise.all([haal(`${BAG_VBO}?identificatie=${kandidaat.objectId}&f=json&limit=1`, d), wozOphalen()]);
  const vboBereikbaar = !!vboR && vboR.status === 200;
  // 404 = het loket kent geen WOZ-waarde voor dit adres; alleen netwerkfout of 5xx is "onbereikbaar".
  const wozBereikbaar = !!wozR && (wozR.status === 200 || wozR.status === 404);
  if (!vboBereikbaar && !wozBereikbaar) return { status: 'fout', bericht: 'De BAG en het WOZ-loket zijn nu niet bereikbaar.' };

  const vbo = vboBereikbaar ? parseVbo(vboR.json) : null;
  const hrefs = (vbo?.pandHrefs ?? []).slice(0, MAX_PANDEN);
  const pandR = await Promise.all(hrefs.map((h) => haal(`${h}?f=json`, d)));
  const pandBereikbaar = pandR.some((p) => p && p.status === 200);
  const bouwjaar = bepaalBouwjaar(pandR.map((p) => (p && p.status === 200 ? parsePand(p.json).bouwjaar : null)));

  const gegevens = maakOpgehaaldePand({
    kandidaat,
    vbo,
    bouwjaar,
    woz: wozR && wozR.status === 200 ? parseWoz(wozR.json) : null,
    datum: d.datum,
  });

  // Een bron die niet antwoordde is iets anders dan "niet gevonden": zeg dat ook zo.
  const reden = (veld: OpgehaaldePand['nietGevonden'][number]['veld'], tekst: string) => {
    const n = gegevens.nietGevonden.find((x) => x.veld === veld);
    if (n) n.reden = tekst;
  };
  if (!vboBereikbaar) {
    reden('wozOppervlak', 'de BAG is niet bereikbaar');
    reden('bouwjaar', 'de BAG is niet bereikbaar');
  } else if (hrefs.length > 0 && !pandBereikbaar) {
    reden('bouwjaar', 'de BAG is niet bereikbaar');
  }
  if (!wozBereikbaar) reden('wozWaarde', 'het WOZ-loket is niet bereikbaar');

  return { status: 'ok', gegevens };
}
