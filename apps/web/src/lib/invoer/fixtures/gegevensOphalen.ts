/**
 * Vastgelegde antwoorden van de openbare API's (opgehaald 2026-10-09, daarna ingekort tot de
 * velden waar de code naar kijkt). Geen live calls in tests. `LOCATIESERVER_49` is zelf
 * samengesteld in dezelfde vorm (meerdere woningen op één huisnummer).
 */

const doc = (
  huis_nlt: string,
  objectId: string,
  nummerId: string,
  extra: Record<string, unknown> = {},
) => ({
  type: 'adres',
  woonplaatsnaam: 'Rotterdam',
  gemeentenaam: 'Rotterdam',
  straatnaam: 'Kleiweg',
  huis_nlt,
  weergavenaam: `Kleiweg ${huis_nlt}, 3051XH Rotterdam`,
  postcode: '3051XH',
  huisnummer: parseInt(huis_nlt, 10),
  nummeraanduiding_id: nummerId,
  adresseerbaarobject_id: objectId,
  ...extra,
});

/** Echt antwoord op "Kleiweg 179 Rotterdam" (ingekort): twee woningen, 179A en 179B, plus ruis. */
export const LOCATIESERVER_KLEIWEG_179 = {
  response: {
    numFound: 400068,
    docs: [
      doc('179A', '0599010000054657', '0599200000333223', { huisletter: 'A' }),
      doc('179B', '0599010000482010', '0599200001004841', { huisletter: 'B' }),
      doc('305B-BG', '0599010000109443', '0599200000333437', {
        huisletter: 'B',
        huisnummertoevoeging: 'BG',
        huisnummer: 305,
        postcode: '3051XR',
      }),
    ],
  },
};

/** Echt antwoord op "Kleiweg 179-B Rotterdam" (ingekort). */
export const LOCATIESERVER_KLEIWEG_179B = {
  response: { docs: [doc('179B', '0599010000482010', '0599200001004841', { huisletter: 'B' }), doc('179A', '0599010000054657', '0599200000333223', { huisletter: 'A' })] },
};

/** Samengesteld: Kanaalkade 49 heeft alleen 49-A/-B/-C, geen kale 49. */
export const LOCATIESERVER_49 = {
  response: {
    docs: ['A', 'B', 'C'].map((l, i) => ({
      type: 'adres',
      woonplaatsnaam: 'Alkmaar',
      gemeentenaam: 'Alkmaar',
      straatnaam: 'Kanaalkade',
      huis_nlt: `49${l}`,
      weergavenaam: `Kanaalkade 49${l}, 1811LA Alkmaar`,
      postcode: '1811LA',
      huisnummer: 49,
      huisletter: l,
      nummeraanduiding_id: `036300000000000${i}`,
      adresseerbaarobject_id: `036301000000000${i}`,
    })),
  },
};

/** Echt BAG-antwoord voor verblijfsobject Kleiweg 179B (ingekort). */
export const BAG_VBO_KLEIWEG_179B = {
  features: [
    {
      properties: {
        identificatie: '0599010000482010',
        gebruiksdoel: 'woonfunctie',
        status: 'Verblijfsobject in gebruik',
        oppervlakte: 157,
        'pand.href': ['https://api.pdok.nl/kadaster/bag/ogc/v2/collections/pand/items/83929dab-d85a-53b2-96b2-097ba0348974'],
      },
    },
  ],
};

/** Echt BAG-pand (ingekort, zonder geometrie). */
export const BAG_PAND_1930 = {
  type: 'Feature',
  properties: { identificatie: '0599100000642341', bouwjaar: 1930, status: 'Pand in gebruik' },
};

/** Echt WOZ-antwoord voor Kleiweg 179B (ingekort); bewust in willekeurige volgorde gezet. */
export const WOZ_KLEIWEG_179B = {
  wozObject: { grondoppervlakte: 0 },
  wozWaarden: [
    { peildatum: '2024-01-01', vastgesteldeWaarde: 457000 },
    { peildatum: '2025-01-01', vastgesteldeWaarde: 490000 },
    { peildatum: '2023-01-01', vastgesteldeWaarde: 450000 },
  ],
};

/** Echt 404-antwoord van het WOZ-loket (Kleiweg 179A: geen WOZ-waarde beschikbaar). */
export const WOZ_404 = {
  status: 404,
  error: 'Not Found',
  path: '/wozwaardeloket/api/v1/wozwaarde/nummeraanduiding/0599200000333223',
};
