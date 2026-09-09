import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { testpand6Kamers } from '../fixtures/testpand-6kamers';
import { pasScenarioToe } from '../scenario/index';
import { berekenEindtelling } from '../eindtelling/index';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = '2026-01-01';

/**
 * Kernclaim van taak 11 (letterlijk uit de taakomschrijving): "rubrieken ronden op kwartpunten,
 * de eindsom op hele punten. Een maatregel van 0,25 punt levert daardoor soms niets op en soms
 * een vol punt, afhankelijk van waar de kamer staat." Deze test bewijst dat met een ECHTE
 * maatregel (S-04, thermostatische douchekraan) op een ECHTE fixture — niet met een
 * geconstrueerd getal — en dus dat de suggestie-engine altijd moet doorrekenen (laag A van
 * `outputs/RAPPORT_taak11_2026-08-20.md`) en nooit de `puntenIndicatie`-vuistregel uit de
 * catalogus mag gebruiken.
 */
describe('afronding — dezelfde maatregel, andere uitkomst per kamer', () => {
  it('S-04 (thermostatische douchekraan, badruimte achter) verhoogt de huur van kamer 4 maar niet van kamer 6', () => {
    const asIs = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
    const ruimte9 = testpand6Kamers.sanitair.find((s) => s.ruimteNr === 9)!;

    const naS04 = pasScenarioToe(testpand6Kamers, [
      { soort: 'sanitair-wijzigen', ruimteNr: 9, patch: { extra: { ...ruimte9.extra, thermostatischeMengkraan: 1 } } },
    ]);
    const eindtellingNa = berekenEindtelling(naS04, tarievenset, peildatum);

    // R6 stijgt voor kamer 4, 5 én 6 met dezelfde kwart punt — dat is geen verrassing.
    expect(eindtellingNa.perKamer[4].rubrieken.r6).toBeCloseTo(asIs.perKamer[4].rubrieken.r6 + 0.25, 4);
    expect(eindtellingNa.perKamer[6].rubrieken.r6).toBeCloseTo(asIs.perKamer[6].rubrieken.r6 + 0.25, 4);

    // Maar de HUUR verandert alleen voor kamer 4 (die net onder een heelpuntgrens zat) en niet
    // voor kamer 6 (die verder van de grens af zat) — exact de "soms niets, soms een vol punt"-claim.
    expect(eindtellingNa.perKamer[4].totaalPunten).toBe(asIs.perKamer[4].totaalPunten + 1);
    expect(eindtellingNa.perKamer[4].maxHuurEuro).toBeGreaterThan(asIs.perKamer[4].maxHuurEuro);

    expect(eindtellingNa.perKamer[6].totaalPunten).toBe(asIs.perKamer[6].totaalPunten);
    expect(eindtellingNa.perKamer[6].maxHuurEuro).toBe(asIs.perKamer[6].maxHuurEuro);
  });

  it('twee losse voorzieningen die elk apart geen enkele kamer over de grens duwen, doen dat samen wel', () => {
    // thermostatischeMengkraan (0,5 pt) en kokendWaterfunctie (0,5 pt) op de gedeelde keuken:
    // elk apart onvoldoende om de R5-kwartpuntgrens van kamer 1 te halen, samen wel.
    const asIs = berekenEindtelling(testpand6Kamers, tarievenset, peildatum);
    const keuken = testpand6Kamers.keukens[0];

    const metKraan = pasScenarioToe(testpand6Kamers, [
      { soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { extra: { ...keuken.extra, thermostatischeMengkraan: true } } },
    ]);
    const metKokendWater = pasScenarioToe(testpand6Kamers, [
      { soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { extra: { ...keuken.extra, kokendWaterfunctie: true } } },
    ]);
    const metBeide = pasScenarioToe(testpand6Kamers, [
      { soort: 'keuken-wijzigen', ruimteNr: keuken.ruimteNr, patch: { extra: { ...keuken.extra, thermostatischeMengkraan: true, kokendWaterfunctie: true } } },
    ]);

    const eKraan = berekenEindtelling(metKraan, tarievenset, peildatum);
    const eKokendWater = berekenEindtelling(metKokendWater, tarievenset, peildatum);
    const eBeide = berekenEindtelling(metBeide, tarievenset, peildatum);

    // Los: geen van beide verandert de huur van kamer 1.
    expect(eKraan.perKamer[1].maxHuurEuro).toBe(asIs.perKamer[1].maxHuurEuro);
    expect(eKokendWater.perKamer[1].maxHuurEuro).toBe(asIs.perKamer[1].maxHuurEuro);

    // Samen: R5 komt over de kwartpuntgrens en de huur van kamer 1 stijgt.
    expect(eBeide.perKamer[1].rubrieken.r5).toBeGreaterThan(eKraan.perKamer[1].rubrieken.r5);
    expect(eBeide.perKamer[1].maxHuurEuro).toBeGreaterThan(asIs.perKamer[1].maxHuurEuro);
  });
});
