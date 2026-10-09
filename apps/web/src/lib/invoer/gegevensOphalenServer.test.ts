import { describe, expect, it } from 'vitest';
import { haalGegevensOp, parseOphaalVerzoek } from './gegevensOphalenServer';
import {
  BAG_PAND_1930,
  BAG_VBO_KLEIWEG_179B,
  LOCATIESERVER_49,
  LOCATIESERVER_KLEIWEG_179,
  LOCATIESERVER_KLEIWEG_179B,
  WOZ_404,
  WOZ_KLEIWEG_179B,
} from './fixtures/gegevensOphalen';

type Antwoord = { status: number; body: unknown } | 'netwerkfout';

/** Nep-fetch die per URL-onderdeel een vastgelegd antwoord geeft en alle aanroepen bijhoudt. */
function nepFetch(routes: Record<string, Antwoord | Antwoord[]>) {
  const aanroepen: string[] = [];
  const teller: Record<string, number> = {};
  const fn = async (url: string) => {
    aanroepen.push(url);
    const sleutel = Object.keys(routes).find((k) => url.includes(k));
    if (!sleutel) throw new Error(`onverwachte URL ${url}`);
    const r = routes[sleutel];
    const n = (teller[sleutel] = (teller[sleutel] ?? 0) + 1);
    const a = Array.isArray(r) ? r[Math.min(n - 1, r.length - 1)] : r;
    if (a === 'netwerkfout') throw new Error('netwerk');
    return { ok: a.status >= 200 && a.status < 300, status: a.status, json: async () => a.body };
  };
  return { fn, aanroepen };
}

const deps = (f: ReturnType<typeof nepFetch>) => ({ fetch: f.fn, datum: '2026-10-09', wacht: async () => {} });
const PAND_URL = 'collections/pand/items/83929dab';
const goedeRoutes = {
  'locatieserver/search': { status: 200, body: LOCATIESERVER_KLEIWEG_179B },
  'collections/verblijfsobject': { status: 200, body: BAG_VBO_KLEIWEG_179B },
  [PAND_URL]: { status: 200, body: BAG_PAND_1930 },
  'wozwaarde/nummeraanduiding/0599200001004841': { status: 200, body: WOZ_KLEIWEG_179B },
};

describe('parseOphaalVerzoek', () => {
  it('adres + stad, of een gekozen nummeraanduiding', () => {
    expect(parseOphaalVerzoek({ adres: ' Kleiweg 179-B ', stad: 'Rotterdam' })).toEqual({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' });
    expect(parseOphaalVerzoek({ adres: 'Kleiweg 1' })).toEqual({ adres: 'Kleiweg 1', stad: '' });
    expect(parseOphaalVerzoek({ nummeraanduidingId: '0599200001004841' })).toEqual({ nummeraanduidingId: '0599200001004841' });
  });

  it('weigert rommel', () => {
    for (const x of [null, 'x', {}, { adres: '' }, { adres: 5 }, { adres: 'a'.repeat(500) }, { nummeraanduidingId: '12' }, { nummeraanduidingId: '0599200001004841/../x' }]) {
      expect(parseOphaalVerzoek(x)).toBeNull();
    }
  });
});

describe('haalGegevensOp', () => {
  it('één adres: alle bronnen, gegevens terug', async () => {
    const f = nepFetch(goedeRoutes);
    const r = await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f));
    expect(r).toMatchObject({
      status: 'ok',
      gegevens: { adres: 'Kleiweg 179B', gemeente: 'Rotterdam', bouwjaar: 1930, wozWaarde: 490000, wozPeildatum: '2025-01-01', wozOppervlak: 157, datum: '2026-10-09', nietGevonden: [] },
    });
  });

  it('roept alleen de drie vaste, openbare API-hosts aan', async () => {
    const f = nepFetch(goedeRoutes);
    await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f));
    const hosts = new Set(f.aanroepen.map((u) => new URL(u).host));
    expect([...hosts].sort()).toEqual(['api.kadaster.nl', 'api.pdok.nl']);
  });

  it('meerdere woningen: geeft de kandidaten terug en haalt nog niets op', async () => {
    const f = nepFetch({ 'locatieserver/search': { status: 200, body: LOCATIESERVER_KLEIWEG_179 } });
    const r = await haalGegevensOp({ adres: 'Kleiweg 179', stad: 'Rotterdam' }, deps(f));
    expect(r.status).toBe('kiezen');
    expect(f.aanroepen).toHaveLength(1);
  });

  it('49-A/-B/-C geeft drie kandidaten', async () => {
    const f = nepFetch({ 'locatieserver/search': { status: 200, body: LOCATIESERVER_49 } });
    const r = await haalGegevensOp({ adres: 'Kanaalkade 49', stad: 'Alkmaar' }, deps(f));
    expect(r.status === 'kiezen' && r.kandidaten).toHaveLength(3);
  });

  it('na de keuze wordt het gekozen adres opgezocht op nummeraanduiding', async () => {
    const f = nepFetch(goedeRoutes);
    const r = await haalGegevensOp({ nummeraanduidingId: '0599200001004841' }, deps(f));
    expect(r.status).toBe('ok');
    expect(decodeURIComponent(f.aanroepen[0])).toContain('nummeraanduiding_id:0599200001004841');
  });

  it('adres onbekend: niet gevonden', async () => {
    const f = nepFetch({ 'locatieserver/search': { status: 200, body: { response: { docs: [] } } } });
    expect((await haalGegevensOp({ adres: 'Nergens 1', stad: '' }, deps(f))).status).toBe('niet_gevonden');
  });

  it('geen WOZ-waarde: een tweede poging (valse 404 van het Kadaster), daarna leeg met reden', async () => {
    const f = nepFetch({ ...goedeRoutes, 'wozwaarde/nummeraanduiding/0599200001004841': [{ status: 404, body: WOZ_404 }, { status: 404, body: WOZ_404 }] });
    const r = await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f));
    expect(f.aanroepen.filter((u) => u.includes('wozwaarde'))).toHaveLength(2);
    expect(r.status === 'ok' && r.gegevens).toMatchObject({ wozWaarde: null, wozPeildatum: null, bouwjaar: 1930 });
    expect(r.status === 'ok' && r.gegevens.nietGevonden.map((n) => n.veld)).toEqual(['wozWaarde']);
  });

  it('valse 404 die bij de tweede poging wel werkt', async () => {
    const f = nepFetch({ ...goedeRoutes, 'wozwaarde/nummeraanduiding/0599200001004841': [{ status: 404, body: WOZ_404 }, { status: 200, body: WOZ_KLEIWEG_179B }] });
    const r = await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f));
    expect(r.status === 'ok' && r.gegevens.wozWaarde).toBe(490000);
  });

  it('één bron onbereikbaar: de rest komt wel, met de reden "niet bereikbaar" (geen schatting)', async () => {
    const f = nepFetch({ ...goedeRoutes, 'wozwaarde/nummeraanduiding/0599200001004841': 'netwerkfout' });
    const r = await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f));
    expect(r.status === 'ok' && r.gegevens).toMatchObject({ wozWaarde: null, bouwjaar: 1930, wozOppervlak: 157 });
    expect(r.status === 'ok' && r.gegevens.nietGevonden[0].reden).toMatch(/niet bereikbaar/);
  });

  it('adreszoeker onbereikbaar: fout (niet "niet gevonden")', async () => {
    const f = nepFetch({ 'locatieserver/search': 'netwerkfout' });
    expect((await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: '' }, deps(f))).status).toBe('fout');
    const g = nepFetch({ 'locatieserver/search': { status: 500, body: {} } });
    expect((await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: '' }, deps(g))).status).toBe('fout');
  });

  it('alle bronnen na het adres onbereikbaar: fout', async () => {
    const f = nepFetch({
      'locatieserver/search': { status: 200, body: LOCATIESERVER_KLEIWEG_179B },
      'collections/verblijfsobject': 'netwerkfout',
      'wozwaarde/nummeraanduiding/0599200001004841': 'netwerkfout',
    });
    expect((await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f))).status).toBe('fout');
  });

  it('een pand-href buiten PDOK wordt nooit opgehaald', async () => {
    const vbo = { features: [{ properties: { oppervlakte: 157, 'pand.href': ['https://evil.example/pand'] } }] };
    const f = nepFetch({ ...goedeRoutes, 'collections/verblijfsobject': { status: 200, body: vbo } });
    const r = await haalGegevensOp({ adres: 'Kleiweg 179-B', stad: 'Rotterdam' }, deps(f));
    expect(f.aanroepen.some((u) => u.includes('evil'))).toBe(false);
    expect(r.status === 'ok' && r.gegevens.bouwjaar).toBeNull();
  });
});
