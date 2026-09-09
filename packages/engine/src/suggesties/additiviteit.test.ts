import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { testpand6Kamers } from '../fixtures/testpand-6kamers';
import { pasScenarioToe } from '../scenario/index';
import { berekenEindtelling } from '../eindtelling/index';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = '2026-01-01';

function jaarhuur(eindtelling: ReturnType<typeof berekenEindtelling>): number {
  return Object.values(eindtelling.perKamer).reduce((som, k) => som + k.maxHuurEuro * 12, 0);
}

/**
 * §3 van `outputs/RAPPORT_taak11_2026-08-20.md`: de bijdrage van een maatregel binnen een
 * pakket is leave-one-out, en de som van die bijdragen hoeft niet gelijk te zijn aan de
 * pakketwinst. Deze test bewijst dat met twee ECHTE catalogusmaatregelen (S-04 en K-08) op
 * badruimte achter / de gedeelde keuken: kamer 4 en 5 worden door ALLEBEI de maatregelen
 * onafhankelijk over dezelfde heelpuntgrens getild, dus wint het pakket niet twee keer.
 */
describe('additiviteit — restpost bij overlappende maatregelen', () => {
  it('S-04 (badruimte achter) en K-08 (gedeelde keuken) overlappen op kamer 4 en 5: de pakketwinst is niet de som van de losse bijdragen', () => {
    const asIs = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
    const ruimte9 = testpand6Kamers.sanitair.find((s) => s.ruimteNr === 9)!;
    const keuken = testpand6Kamers.keukens[0];

    const metS04 = pasScenarioToe(testpand6Kamers, [
      { soort: 'sanitair-wijzigen', ruimteNr: 9, patch: { extra: { ...ruimte9.extra, thermostatischeMengkraan: 1 } } },
    ]);
    const metK08 = pasScenarioToe(testpand6Kamers, [
      { soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { extra: { ...keuken.extra, vaatwasmachine: true } } },
    ]);
    const metBeide = pasScenarioToe(testpand6Kamers, [
      { soort: 'sanitair-wijzigen', ruimteNr: 9, patch: { extra: { ...ruimte9.extra, thermostatischeMengkraan: 1 } } },
      { soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { extra: { ...keuken.extra, vaatwasmachine: true } } },
    ]);

    const jAsIs = jaarhuur(asIs);
    const jS04 = jaarhuur(berekenEindtelling(metS04, tarievenset, peildatum));
    const jK08 = jaarhuur(berekenEindtelling(metK08, tarievenset, peildatum));
    const jBeide = jaarhuur(berekenEindtelling(metBeide, tarievenset, peildatum));

    const soloS04 = jS04 - jAsIs;
    const soloK08 = jK08 - jAsIs;
    const pakketwinst = jBeide - jAsIs;

    // Beide maatregelen leveren op zichzelf al winst op...
    expect(soloS04).toBeGreaterThan(0);
    expect(soloK08).toBeGreaterThan(0);

    // ...maar de pakketwinst is NIET de som van de losse winsten: kamer 4 en 5 worden door
    // beide maatregelen over dezelfde grens getild, dus de tweede levert daar niets extra's op.
    expect(pakketwinst).toBeLessThan(soloS04 + soloK08 - 1);

    // Leave-one-out: bijdrage(S-04) = pakket − pakket-zonder-S-04 (= K-08 alleen).
    const bijdrageS04 = pakketwinst - soloK08;
    const bijdrageK08 = pakketwinst - soloS04;
    const restpost = pakketwinst - (bijdrageS04 + bijdrageK08);

    // De restpost is precies het stuk dat aan geen van beide losse maatregelen is toe te
    // rekenen — hier positief, want de som van de bijdragen ONDERSCHAT de werkelijke winst
    // (elke bijdrage claimt alleen "wat de ANDER al niet had gedekt").
    expect(Math.abs(restpost)).toBeGreaterThan(0.01);
  });
});
