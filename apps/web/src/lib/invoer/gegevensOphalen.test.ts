import { describe, expect, it } from 'vitest';
import { coropVoorGemeente } from '@wwso/data';
import { NIEUW_PAND_VELDEN, type PandVeldenState } from './types';
import {
  bepaalBouwjaar,
  bepaalToepassing,
  herkomstTekst,
  kiesKandidaat,
  maakOpgehaaldePand,
  parseAdresInvoer,
  parseLocatieserver,
  parsePand,
  parseVbo,
  parseWoz,
  veiligePandHref,
  type OpgehaaldePand,
} from './gegevensOphalen';
import {
  BAG_PAND_1930,
  BAG_VBO_KLEIWEG_179B,
  LOCATIESERVER_49,
  LOCATIESERVER_KLEIWEG_179,
  LOCATIESERVER_KLEIWEG_179B,
  WOZ_404,
  WOZ_KLEIWEG_179B,
} from './fixtures/gegevensOphalen';

const DATUM = '2026-10-09';

describe('parseAdresInvoer', () => {
  it.each([
    ['Kleiweg 179-B', 'Kleiweg', 179, 'b'],
    ['Kleiweg 179B', 'Kleiweg', 179, 'b'],
    ['Kleiweg 179 b', 'Kleiweg', 179, 'b'],
    ['Kanaalkade 49', 'Kanaalkade', 49, ''],
    ['Kleiweg 19A-01', 'Kleiweg', 19, 'a01'],
    ['Van Hogendorpstraat 3', 'Van Hogendorpstraat', 3, ''],
    // Review 2026-10-09: cijfers in de straatnaam; het LAATSTE getal is het huisnummer.
    ['Plein 1944 5', 'Plein 1944', 5, ''],
    ['Plein 1944 5b', 'Plein 1944', 5, 'b'],
    ['Laan 1940-1945 12', 'Laan 1940-1945', 12, ''],
    ['Laan 1940-1945 12-A', 'Laan 1940-1945', 12, 'a'],
    ['Burgemeester 1e Weg, 7', 'Burgemeester 1e Weg', 7, ''],
    ['Kleiweg 179-2', 'Kleiweg', 179, '2'],
  ])('%s', (invoer, straat, huisnummer, toevoeging) => {
    expect(parseAdresInvoer(invoer)).toEqual({ straat, huisnummer, toevoeging });
  });

  it('zonder huisnummer is er niets te zoeken', () => {
    expect(parseAdresInvoer('Kleiweg').huisnummer).toBeNull();
    expect(parseAdresInvoer('').huisnummer).toBeNull();
  });
});

describe('parseLocatieserver + kiesKandidaat', () => {
  it('leest de kandidaten uit een echt PDOK-antwoord', () => {
    const k = parseLocatieserver(LOCATIESERVER_KLEIWEG_179);
    expect(k).toHaveLength(3);
    expect(k[1]).toMatchObject({
      objectId: '0599010000482010',
      nummeraanduidingId: '0599200001004841',
      adres: 'Kleiweg 179B',
      woonplaats: 'Rotterdam',
      gemeente: 'Rotterdam',
      huisnummer: 179,
      toevoeging: 'b',
    });
  });

  it('negeert rommel en documenten zonder objectId', () => {
    expect(parseLocatieserver(null)).toEqual([]);
    expect(parseLocatieserver({})).toEqual([]);
    expect(parseLocatieserver({ response: { docs: [{ weergavenaam: 'x' }] } })).toEqual([]);
  });

  it('exacte match op huisnummer + toevoeging: één woning, geen vraag', () => {
    const k = parseLocatieserver(LOCATIESERVER_KLEIWEG_179B);
    const keuze = kiesKandidaat(k, { adres: 'Kleiweg 179-B', stad: 'Rotterdam' });
    expect(keuze).toMatchObject({ soort: 'een', kandidaat: { adres: 'Kleiweg 179B' } });
  });

  it('huisnummer zonder toevoeging terwijl er alleen -A/-B bestaan: de gebruiker kiest', () => {
    const k = parseLocatieserver(LOCATIESERVER_KLEIWEG_179);
    const keuze = kiesKandidaat(k, { adres: 'Kleiweg 179', stad: 'Rotterdam' });
    expect(keuze.soort).toBe('kiezen');
    if (keuze.soort === 'kiezen') expect(keuze.kandidaten.map((c) => c.adres)).toEqual(['Kleiweg 179A', 'Kleiweg 179B']);
  });

  it('49-A/-B/-C: de gebruiker kiest', () => {
    const k = parseLocatieserver(LOCATIESERVER_49);
    const keuze = kiesKandidaat(k, { adres: 'Kanaalkade 49', stad: 'Alkmaar' });
    expect(keuze.soort).toBe('kiezen');
    if (keuze.soort === 'kiezen') expect(keuze.kandidaten).toHaveLength(3);
  });

  it('een getypte toevoeging die niet bestaat: geen gok (nooit het eerste resultaat)', () => {
    const k = parseLocatieserver(LOCATIESERVER_KLEIWEG_179);
    expect(kiesKandidaat(k, { adres: 'Kleiweg 179-C', stad: 'Rotterdam' })).toEqual({ soort: 'geen' });
  });

  it('zonder huisnummer of zonder kandidaten: geen', () => {
    const k = parseLocatieserver(LOCATIESERVER_KLEIWEG_179);
    expect(kiesKandidaat(k, { adres: 'Kleiweg', stad: 'Rotterdam' })).toEqual({ soort: 'geen' });
    expect(kiesKandidaat([], { adres: 'Kleiweg 1', stad: '' })).toEqual({ soort: 'geen' });
  });

  it('kandidaten in een andere plaats vallen af als de stad is ingevuld en er wel matches zijn', () => {
    const k = [
      ...parseLocatieserver(LOCATIESERVER_KLEIWEG_179B),
      ...parseLocatieserver({ response: { docs: [{ ...LOCATIESERVER_KLEIWEG_179B.response.docs[0], woonplaatsnaam: 'Elders', gemeentenaam: 'Elders', adresseerbaarobject_id: '0000010000000001', nummeraanduiding_id: '0000200000000001' }] } }),
    ];
    const keuze = kiesKandidaat(k, { adres: 'Kleiweg 179-B', stad: 'Rotterdam' });
    expect(keuze).toMatchObject({ soort: 'een', kandidaat: { objectId: '0599010000482010' } });
  });

  it('zelfde adres in twee plaatsen en geen stad ingevuld: de gebruiker kiest', () => {
    const d = LOCATIESERVER_KLEIWEG_179B.response.docs[0];
    const k = parseLocatieserver({ response: { docs: [d, { ...d, woonplaatsnaam: 'Elders', gemeentenaam: 'Elders', adresseerbaarobject_id: '0000010000000001', nummeraanduiding_id: '0000200000000001' }] } });
    expect(kiesKandidaat(k, { adres: 'Kleiweg 179-B', stad: '' }).soort).toBe('kiezen');
  });
});

describe('BAG en WOZ antwoorden', () => {
  it('parseVbo: gebruiksoppervlakte en pand-href', () => {
    expect(parseVbo(BAG_VBO_KLEIWEG_179B)).toEqual({
      oppervlakte: 157,
      pandHrefs: ['https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items/83929dab-d85a-53b2-96b2-097ba0348974'],
    });
  });

  it('parseVbo: onbekende oppervlakte (BAG-plaatshouder 1, of 0) wordt null, nooit een getal', () => {
    for (const opp of [0, 1, null, undefined, '157']) {
      const vbo = { features: [{ properties: { oppervlakte: opp, 'pand.href': [] } }] };
      expect(parseVbo(vbo)?.oppervlakte).toBeNull();
    }
  });

  it('parseVbo: geen features is null', () => {
    expect(parseVbo({ features: [] })).toBeNull();
    expect(parseVbo(null)).toBeNull();
  });

  it('parsePand: bouwjaar', () => {
    expect(parsePand(BAG_PAND_1930)).toEqual({ bouwjaar: 1930 });
  });

  it('parsePand: onmogelijk of ontbrekend bouwjaar wordt null', () => {
    expect(parsePand({ properties: { bouwjaar: 9999 } }).bouwjaar).toBeNull();
    expect(parsePand({ properties: { bouwjaar: 0 } }).bouwjaar).toBeNull();
    expect(parsePand({ properties: {} }).bouwjaar).toBeNull();
    expect(parsePand(undefined).bouwjaar).toBeNull();
  });

  it('bepaalBouwjaar: één pand, of meerdere panden met hetzelfde bouwjaar', () => {
    expect(bepaalBouwjaar([1930])).toEqual({ bouwjaar: 1930 });
    expect(bepaalBouwjaar([1930, 1930])).toEqual({ bouwjaar: 1930 });
  });

  it('bepaalBouwjaar: panden die verschillen of niets weten: geen waarde, wel een reden', () => {
    expect(bepaalBouwjaar([1930, 1990])).toEqual({ bouwjaar: null, reden: 'meerdere panden met verschillend bouwjaar' });
    expect(bepaalBouwjaar([])).toEqual({ bouwjaar: null, reden: 'geen bouwjaar in de BAG' });
    expect(bepaalBouwjaar([null])).toEqual({ bouwjaar: null, reden: 'geen bouwjaar in de BAG' });
  });

  it('parseWoz: pakt de nieuwste peildatum, ook als de volgorde anders is', () => {
    expect(parseWoz(WOZ_KLEIWEG_179B)).toEqual({ waarde: 490000, peildatum: '2025-01-01' });
  });

  it('parseWoz: een 404-antwoord, lege lijst of waarde 0 is geen WOZ-waarde', () => {
    expect(parseWoz(WOZ_404)).toBeNull();
    expect(parseWoz({ wozWaarden: [] })).toBeNull();
    expect(parseWoz({ wozWaarden: [{ peildatum: '2025-01-01', vastgesteldeWaarde: 0 }] })).toBeNull();
  });

  it('veiligePandHref: alleen de BAG-pand-URL van PDOK', () => {
    const goed = 'https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items/83929dab-d85a-53b2-96b2-097ba0348974';
    expect(veiligePandHref(goed)).toBe(goed);
    expect(veiligePandHref('https://evil.example/pand/items/x')).toBeNull();
    expect(veiligePandHref('http://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items/x')).toBeNull();
    expect(veiligePandHref('https://api.pdok.nl.evil.example/kadaster/bag/ogc/v2/collections/pand/items/x')).toBeNull();
  });
});

function volledig(extra: Partial<OpgehaaldePand> = {}): OpgehaaldePand {
  const kandidaat = parseLocatieserver(LOCATIESERVER_KLEIWEG_179B)[0];
  return {
    ...maakOpgehaaldePand({
      kandidaat,
      vbo: parseVbo(BAG_VBO_KLEIWEG_179B),
      bouwjaar: { bouwjaar: 1930 },
      woz: parseWoz(WOZ_KLEIWEG_179B),
      datum: DATUM,
    }),
    ...extra,
  };
}

describe('maakOpgehaaldePand', () => {
  it('zet de gevonden velden en noteert wat ontbreekt', () => {
    const o = volledig();
    expect(o).toMatchObject({
      adres: 'Kleiweg 179B',
      stad: 'Rotterdam',
      gemeente: 'Rotterdam',
      bouwjaar: 1930,
      wozWaarde: 490000,
      wozPeildatum: '2025-01-01',
      wozOppervlak: 157,
      datum: DATUM,
      nietGevonden: [],
    });
  });

  it('geen WOZ (nieuwbouw): wozWaarde en peildatum null, nooit 0, met reden', () => {
    const o = maakOpgehaaldePand({
      kandidaat: parseLocatieserver(LOCATIESERVER_KLEIWEG_179B)[0],
      vbo: parseVbo(BAG_VBO_KLEIWEG_179B),
      bouwjaar: { bouwjaar: 1930 },
      woz: null,
      datum: DATUM,
    });
    expect(o.wozWaarde).toBeNull();
    expect(o.wozPeildatum).toBeNull();
    expect(o.nietGevonden.map((n) => n.veld)).toEqual(['wozWaarde']);
  });

  it('geen vbo-gegevens: oppervlak en bouwjaar ontbreken met reden', () => {
    const o = maakOpgehaaldePand({
      kandidaat: parseLocatieserver(LOCATIESERVER_KLEIWEG_179B)[0],
      vbo: null,
      bouwjaar: { bouwjaar: null, reden: 'geen bouwjaar in de BAG' },
      woz: parseWoz(WOZ_KLEIWEG_179B),
      datum: DATUM,
    });
    expect(o.wozOppervlak).toBeNull();
    expect(o.bouwjaar).toBeNull();
    expect(o.nietGevonden.map((n) => n.veld).sort()).toEqual(['bouwjaar', 'wozOppervlak']);
  });
});

const leeg: PandVeldenState = { ...NIEUW_PAND_VELDEN, adres: 'Kleiweg 179-B', stad: 'Rotterdam' };

describe('bepaalToepassing', () => {
  it('leeg formulier: alles ingevuld, met herkomst, zonder conflicten', () => {
    const t = bepaalToepassing(leeg, volledig(), { taxatieModus: false });
    expect(t.conflicten).toEqual([]);
    expect(t.patch).toMatchObject({
      gemeente: 'Rotterdam',
      coropGebied: coropVoorGemeente('Rotterdam'),
      bouwjaar: '1930',
      wozWaarde: '490000',
      wozPeildatum: '2025-01-01',
      wozOppervlak: '157',
    });
    expect(Object.keys(t.herkomst).sort()).toEqual(['bouwjaar', 'gemeente', 'wozOppervlak', 'wozPeildatum', 'wozWaarde']);
    expect(t.herkomst.wozWaarde).toEqual({ bron: 'WOZ-loket', datum: DATUM });
    expect(t.herkomst.bouwjaar).toEqual({ bron: 'BAG', datum: DATUM });
    expect(t.melding.soort).toBe('ok');
    expect(t.melding.tekst).toContain('5');
  });

  it('raakt nooit aantal kamers, energielabel of monument aan', () => {
    const t = bepaalToepassing({ ...leeg, aantalKamers: '4', energielabel: 'B', monument: 'Rijks' }, volledig(), { taxatieModus: false });
    for (const k of ['aantalKamers', 'energielabel', 'monument', 'energielabelOnbekendOfVervallen']) expect(t.patch).not.toHaveProperty(k);
  });

  it('een ander ingevulde waarde wordt NOOIT stil overschreven: conflict met voorstel', () => {
    const t = bepaalToepassing({ ...leeg, wozWaarde: '300000', bouwjaar: '1925' }, volledig(), { taxatieModus: false });
    expect(t.patch).not.toHaveProperty('wozWaarde');
    expect(t.patch).not.toHaveProperty('bouwjaar');
    expect(t.herkomst).not.toHaveProperty('wozWaarde');
    expect(t.conflicten.map((c) => c.veld).sort()).toEqual(['bouwjaar', 'wozWaarde']);
    const woz = t.conflicten.find((c) => c.veld === 'wozWaarde')!;
    expect(woz).toMatchObject({ huidig: '300000 (1 januari 2025)', opgehaaldTekst: '€ 490.000 (1 januari 2025)', patch: { wozWaarde: '490000', wozPeildatum: '2025-01-01' }, herkomst: { wozWaarde: { bron: 'WOZ-loket', datum: DATUM }, wozPeildatum: { bron: 'WOZ-loket', datum: DATUM } } });
    expect(t.melding.soort).toBe('let');
    expect(t.melding.tekst).toContain('2');
  });

  it('dezelfde waarde als al ingevuld: geen conflict, wel markering als opgehaald', () => {
    const t = bepaalToepassing({ ...leeg, bouwjaar: '1930', wozOppervlak: '157.0' }, volledig(), { taxatieModus: false });
    expect(t.conflicten).toEqual([]);
    expect(t.herkomst.bouwjaar).toBeDefined();
    expect(t.herkomst.wozOppervlak).toBeDefined();
  });

  it('de standaard-peildatum telt niet als eigen invoer zolang er geen WOZ-waarde staat', () => {
    const t = bepaalToepassing({ ...leeg, wozPeildatum: '2025-01-01' }, volledig({ wozPeildatum: '2024-01-01' }), { taxatieModus: false });
    expect(t.conflicten).toEqual([]);
    expect(t.patch.wozPeildatum).toBe('2024-01-01');
  });

  it('wel een conflict op de peildatum als er al een eigen WOZ-waarde staat', () => {
    const t = bepaalToepassing({ ...leeg, wozWaarde: '490000', wozPeildatum: '2024-01-01' }, volledig(), { taxatieModus: false });
    expect(t.conflicten.map((c) => c.veld)).toEqual(['wozWaarde']);
  });

  it('WOZ ontbreekt: velden blijven leeg/ongemoeid, melding zegt het, niets geschat', () => {
    const o = volledig({ wozWaarde: null, wozPeildatum: null, nietGevonden: [{ veld: 'wozWaarde', reden: 'geen WOZ-waarde gevonden (bijv. nieuwbouw)' }] });
    const t = bepaalToepassing({ ...leeg, wozWaarde: '' }, o, { taxatieModus: false });
    expect(t.patch).not.toHaveProperty('wozWaarde');
    expect(t.patch).not.toHaveProperty('wozPeildatum');
    expect(t.melding.soort).toBe('let');
    expect(t.melding.tekst).toMatch(/WOZ/);
    expect(t.melding.tekst).toMatch(/niet gevonden|Geen WOZ/i);
  });

  it('in taxatiemodus wordt de WOZ-waarde niet ingevuld (zou een tweede waarde naast de taxatie zijn)', () => {
    const t = bepaalToepassing({ ...leeg, taxatiewaardeEuro: '400000' }, volledig(), { taxatieModus: true });
    expect(t.patch).not.toHaveProperty('wozWaarde');
    expect(t.patch).not.toHaveProperty('wozPeildatum');
    expect(t.conflicten).toEqual([]);
    expect(t.melding.tekst).toMatch(/taxatiewaarde/);
  });

  it('gemeente die niet in de geografie staat: niet invullen, melding', () => {
    const t = bepaalToepassing(leeg, volledig({ gemeente: 'Bestaatniet' }), { taxatieModus: false });
    expect(t.patch).not.toHaveProperty('gemeente');
    expect(t.patch).not.toHaveProperty('coropGebied');
    expect(t.melding.tekst).toMatch(/gemeente/i);
  });

  it('andere gemeente dan de eigen keuze: conflict, "Gebruik" zet gemeente én COROP samen', () => {
    const t = bepaalToepassing({ ...leeg, gemeente: 'Delft', coropGebied: coropVoorGemeente('Delft') ?? '' }, volledig(), { taxatieModus: false });
    const c = t.conflicten.find((x) => x.veld === 'gemeente')!;
    expect(c.patch).toEqual({ gemeente: 'Rotterdam', coropGebied: coropVoorGemeente('Rotterdam') });
    expect(t.patch).not.toHaveProperty('gemeente');
  });

  it('een opgeslagen woning heeft wel een COROP maar geen gemeente: zelfde COROP is geen conflict', () => {
    const t = bepaalToepassing({ ...leeg, gemeente: '', coropGebied: coropVoorGemeente('Rotterdam') ?? '' }, volledig(), { taxatieModus: false });
    expect(t.conflicten.find((x) => x.veld === 'gemeente')).toBeUndefined();
    expect(t.herkomst.gemeente).toBeDefined();
  });

  it('adres: ander spelling van hetzelfde adres is geen conflict, een ander adres wel', () => {
    expect(bepaalToepassing(leeg, volledig(), { taxatieModus: false }).conflicten.find((c) => c.veld === 'adres')).toBeUndefined();
    const t = bepaalToepassing({ ...leeg, adres: 'Kleiweg 179' }, volledig(), { taxatieModus: false });
    expect(t.conflicten.find((c) => c.veld === 'adres')).toMatchObject({ opgehaaldTekst: 'Kleiweg 179B', patch: { adres: 'Kleiweg 179B' } });
  });

  it('adres en stad worden alleen stilzwijgend gevuld als ze leeg zijn', () => {
    const t = bepaalToepassing({ ...leeg, adres: '', stad: '' }, volledig(), { taxatieModus: false });
    expect(t.patch).toMatchObject({ adres: 'Kleiweg 179B', stad: 'Rotterdam' });
    expect(t.herkomst.adres).toBeDefined();
  });

  it('niets gevonden dat past: melding zonder velden', () => {
    const o: OpgehaaldePand = {
      adres: 'Kleiweg 179B', stad: 'Rotterdam', gemeente: null, bouwjaar: null, wozWaarde: null, wozPeildatum: null, wozOppervlak: null, datum: DATUM,
      nietGevonden: [{ veld: 'gemeente', reden: 'x' }, { veld: 'bouwjaar', reden: 'x' }, { veld: 'wozWaarde', reden: 'x' }, { veld: 'wozOppervlak', reden: 'x' }],
    };
    const t = bepaalToepassing(leeg, o, { taxatieModus: false });
    expect(t.melding.soort).toBe('let');
    expect(t.patch).toEqual({});
  });
});

describe('herkomstTekst', () => {
  it('bron en korte datum voor in de tooltip', () => {
    expect(herkomstTekst({ bron: 'WOZ-loket', datum: '2026-10-09' })).toBe('WOZ-loket · 9 okt');
    expect(herkomstTekst({ bron: 'BAG', datum: '2026-01-05' })).toBe('BAG · 5 jan');
  });
});


// ── Review 2026-10-09 ────────────────────────────────────────────────────────

describe('review: kiesKandidaat valt niet stil terug op andere stad/straat (punt 8)', () => {
  const k = parseLocatieserver(LOCATIESERVER_KLEIWEG_179B);
  it('stad komt niet overeen: de gebruiker kiest, met waarschuwing; nooit automatisch', () => {
    const keuze = kiesKandidaat(k, { adres: 'Kleiweg 179-B', stad: 'Utrecht' });
    expect(keuze).toMatchObject({ soort: 'kiezen', waarschuwing: 'stad' });
  });
  it('straat komt niet overeen: de gebruiker kiest, met waarschuwing', () => {
    const keuze = kiesKandidaat(k, { adres: 'Dorpsstraat 179-B', stad: 'Rotterdam' });
    expect(keuze).toMatchObject({ soort: 'kiezen', waarschuwing: 'straat' });
  });
  it('geen kandidaat met die toevoeging: nog steeds geen', () => {
    expect(kiesKandidaat(k, { adres: 'Kleiweg 179-C', stad: 'Utrecht' })).toEqual({ soort: 'geen' });
  });
  it('een normale match heeft geen waarschuwing', () => {
    expect(kiesKandidaat(k, { adres: 'Kleiweg 179-B', stad: 'Rotterdam' })).not.toHaveProperty('waarschuwing');
  });
});

describe('review: gemeente en COROP (punt 3, gemeentenaam-match)', () => {
  it('gemeente leeg maar COROP gelijk: de gemeente wordt wél ingevuld', () => {
    const t = bepaalToepassing({ ...leeg, gemeente: '', coropGebied: coropVoorGemeente('Rotterdam') ?? '' }, volledig(), { taxatieModus: false });
    expect(t.patch.gemeente).toBe('Rotterdam');
    expect(t.conflicten.find((x) => x.veld === 'gemeente')).toBeUndefined();
    expect(t.herkomst.gemeente).toBeDefined();
  });
  it('gemeente gelijk maar COROP leeg: het COROP-gebied wordt aangevuld', () => {
    const t = bepaalToepassing({ ...leeg, gemeente: 'Rotterdam', coropGebied: '' }, volledig(), { taxatieModus: false });
    expect(t.patch.coropGebied).toBe(coropVoorGemeente('Rotterdam'));
  });
  it('gemeente anders dan de COROP van de gebruiker: conflict', () => {
    const t = bepaalToepassing({ ...leeg, gemeente: '', coropGebied: coropVoorGemeente('Delft') ?? '' }, volledig(), { taxatieModus: false });
    expect(t.conflicten.find((x) => x.veld === 'gemeente')).toBeDefined();
  });
  it.each([
    ['rotterdam', 'Rotterdam'],
    ['ROTTERDAM', 'Rotterdam'],
    ["'s-Gravenhage", "'s-Gravenhage"],
    ['Bergen (NH)', 'Bergen (NH.)'],
    ['bergen (nh.)', 'Bergen (NH.)'],
  ])('gemeentenaam "%s" wordt herkend als "%s"', (uitPdok, canoniek) => {
    const t = bepaalToepassing(leeg, volledig({ gemeente: uitPdok }), { taxatieModus: false });
    expect(t.patch.gemeente).toBe(canoniek);
    expect(t.patch.coropGebied).toBe(coropVoorGemeente(canoniek));
  });
});

describe('review: WOZ-waarde en -peildatum zijn één conflict (punt 5)', () => {
  it('andere waarde én andere peildatum: één conflict dat beide vervangt', () => {
    const t = bepaalToepassing({ ...leeg, wozWaarde: '300000', wozPeildatum: '2024-01-01' }, volledig(), { taxatieModus: false });
    const woz = t.conflicten.filter((c) => c.veld === 'wozWaarde' || c.veld === 'wozPeildatum');
    expect(woz).toHaveLength(1);
    expect(woz[0].patch).toEqual({ wozWaarde: '490000', wozPeildatum: '2025-01-01' });
    expect(Object.keys(woz[0].herkomst).sort()).toEqual(['wozPeildatum', 'wozWaarde']);
    expect(t.patch).not.toHaveProperty('wozPeildatum');
  });
  it('zelfde waarde maar andere peildatum: ook één conflict (waarde hoort bij zijn jaar)', () => {
    const t = bepaalToepassing({ ...leeg, wozWaarde: '490000', wozPeildatum: '2024-01-01' }, volledig(), { taxatieModus: false });
    expect(t.conflicten).toHaveLength(1);
    expect(t.conflicten[0].patch).toEqual({ wozWaarde: '490000', wozPeildatum: '2025-01-01' });
  });
  it('leeg: beide direct gevuld, beide met herkomst', () => {
    const t = bepaalToepassing(leeg, volledig(), { taxatieModus: false });
    expect(t.patch).toMatchObject({ wozWaarde: '490000', wozPeildatum: '2025-01-01' });
    expect(t.herkomst.wozWaarde).toBeDefined();
    expect(t.herkomst.wozPeildatum).toBeDefined();
  });
  it('alles gelijk: geen conflict, beide gemarkeerd', () => {
    const t = bepaalToepassing({ ...leeg, wozWaarde: '490000', wozPeildatum: '2025-01-01' }, volledig(), { taxatieModus: false });
    expect(t.conflicten).toEqual([]);
    expect(t.herkomst.wozPeildatum).toBeDefined();
  });
});

describe('review: een expliciet gekozen adres is leidend (punt 7)', () => {
  const o = volledig({ adres: 'Kleiweg 179B' });
  it('zonder keuze: een ander getypt adres is een conflict (ongewijzigd)', () => {
    const t = bepaalToepassing({ ...leeg, adres: 'Kleiweg 179' }, o, { taxatieModus: false });
    expect(t.conflicten.find((c) => c.veld === 'adres')).toBeDefined();
  });
  it('na een keuze uit de lijst: adres en stad worden ingevuld, geen conflict', () => {
    const t = bepaalToepassing({ ...leeg, adres: 'Kleiweg 179', stad: 'Roterdam' }, o, { taxatieModus: false, adresLeidend: true });
    expect(t.patch).toMatchObject({ adres: 'Kleiweg 179B', stad: 'Rotterdam' });
    expect(t.conflicten.find((c) => c.veld === 'adres' || c.veld === 'stad')).toBeUndefined();
    expect(t.herkomst.adres).toBeDefined();
    expect(t.herkomst.stad).toBeDefined();
  });
});
