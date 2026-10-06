import { describe, expect, it } from 'vitest';
import { testpand6Kamers } from '@wwso/engine';
import { ScenarioSelectie } from '../deals/types';
import {
  kopieerSlot,
  meldingScenarioNietOpgeslagen,
  moetOpslaanNaScenarioBewerking,
  opslaanbareScenarios,
  slotsUitScenarios,
  standaardSlots,
  zetScenarioPand,
} from './scenarioSlots';

const asIs = testpand6Kamers;

function gevuld(naam: string, sleutel: string) {
  return { ...standaardSlots(asIs)[0]!, naam, sleutels: new Set([sleutel]) };
}

/** Zoals de database het teruggeeft: via JSON en het Zod-schema. */
function viaDatabase(scenarios: ScenarioSelectie[]): ScenarioSelectie[] {
  return JSON.parse(JSON.stringify(scenarios)).map((s: unknown) => ScenarioSelectie.parse(s));
}

// Regressietest (2026-10-06, review plan scenario opslaan/kopiëren): onaangeraakte slots werden bij
// opslaan weggelaten en bij laden op positie teruggezet. Alleen Scenario 2 gevuld → na laden op
// tabblad 1.
describe('slots opslaan en laden behouden hun positie', () => {
  it('alleen Scenario 2 gevuld blijft na laden op Scenario 2', () => {
    const slots = standaardSlots(asIs);
    slots[1] = gevuld('Scenario 2', 'a');
    const geladen = slotsUitScenarios(viaDatabase(opslaanbareScenarios(slots)), asIs);
    expect(geladen[0]!.sleutels.size).toBe(0);
    expect(geladen[0]!.naam).toBe('Scenario 1');
    expect([...geladen[1]!.sleutels]).toEqual(['a']);
  });

  it('alleen Scenario 3 gevuld blijft na laden op Scenario 3', () => {
    const slots = standaardSlots(asIs);
    slots[2] = gevuld('Mijn variant', 'b');
    const geladen = slotsUitScenarios(viaDatabase(opslaanbareScenarios(slots)), asIs);
    expect(geladen[2]!.naam).toBe('Mijn variant');
    expect(geladen[0]!.naam).toBe('Scenario 1');
    expect(geladen[1]!.naam).toBe('Scenario 2');
  });

  it('oude data zonder positie wordt nog op volgorde geladen', () => {
    const oud = opslaanbareScenarios([
      gevuld('Oud A', 'a'),
      gevuld('Oud B', 'b'),
      standaardSlots(asIs)[2]!,
    ]).map((s) => {
      const kaal: Record<string, unknown> = { ...s };
      delete kaal.slotIndex;
      return kaal;
    });
    const geladen = slotsUitScenarios(viaDatabase(oud as ScenarioSelectie[]), asIs);
    expect(geladen.map((s) => s.naam)).toEqual(['Oud A', 'Oud B', 'Scenario 3']);
  });
});

describe('kopieerSlot', () => {
  it('kopieert Scenario 1 naar een leeg Scenario 2, dat "Scenario 2" heet', () => {
    const slots = standaardSlots(asIs);
    slots[0] = {
      ...gevuld('Scenario 1', 'a'),
      handmatigeInvesteringEuro: 5000,
      maatregelPrijzenEuro: { a: 100 },
    };
    const uitkomst = kopieerSlot(slots, 0, 1, { overschrijvenBevestigd: false });
    expect(uitkomst.soort).toBe('gekopieerd');
    if (uitkomst.soort !== 'gekopieerd') return;
    const kopie = uitkomst.slots[1]!;
    expect(kopie.naam).toBe('Scenario 2');
    expect([...kopie.sleutels]).toEqual(['a']);
    expect(kopie.handmatigeInvesteringEuro).toBe(5000);
    expect(kopie.maatregelPrijzenEuro).toEqual({ a: 100 });
  });

  it('deelt geen gegevens met het origineel', () => {
    const slots = standaardSlots(asIs);
    slots[0] = { ...gevuld('Scenario 1', 'a'), maatregelPrijzenEuro: { a: 100 } };
    const uitkomst = kopieerSlot(slots, 0, 1, { overschrijvenBevestigd: false });
    if (uitkomst.soort !== 'gekopieerd') throw new Error('verwacht gekopieerd');
    const kopie = uitkomst.slots[1]!;
    expect(kopie.pand).not.toBe(slots[0]!.pand);
    expect(kopie.pand).toEqual(slots[0]!.pand);
    expect(kopie.sleutels).not.toBe(slots[0]!.sleutels);
    expect(kopie.maatregelPrijzenEuro).not.toBe(slots[0]!.maatregelPrijzenEuro);
    expect(uitkomst.slots[0]).toBe(slots[0]);
  });

  it('overschrijft een gevuld scenario alleen na bevestiging', () => {
    const slots = standaardSlots(asIs);
    slots[0] = gevuld('Scenario 1', 'a');
    slots[1] = gevuld('Scenario 2', 'b');
    expect(kopieerSlot(slots, 0, 1, { overschrijvenBevestigd: false })).toEqual({
      soort: 'bevestiging-nodig',
    });
    const bevestigd = kopieerSlot(slots, 0, 1, { overschrijvenBevestigd: true });
    expect(bevestigd.soort).toBe('gekopieerd');
  });

  it('weigert kopiëren naar zichzelf of van een leeg scenario', () => {
    const slots = standaardSlots(asIs);
    slots[0] = gevuld('Scenario 1', 'a');
    expect(kopieerSlot(slots, 0, 0, { overschrijvenBevestigd: true })).toEqual({
      soort: 'ongeldig',
    });
    expect(kopieerSlot(slots, 1, 2, { overschrijvenBevestigd: true })).toEqual({
      soort: 'ongeldig',
    });
  });
});

// Regressietest (2026-10-06): na "Gebruik als scenario" stond de kamerbewerking alleen in het
// geheugen; tabblad sluiten = bewerking kwijt.
describe('moetOpslaanNaScenarioBewerking', () => {
  it('slaat op als er een resultaat is en de woning bewerkbaar is', () => {
    expect(
      moetOpslaanNaScenarioBewerking({
        heeftResultaat: true,
        magBewerken: true,
        bewerkrechtenOnzeker: false,
      }),
    ).toBe(true);
  });
  it('slaat niet op zonder resultaat', () => {
    expect(
      moetOpslaanNaScenarioBewerking({
        heeftResultaat: false,
        magBewerken: true,
        bewerkrechtenOnzeker: false,
      }),
    ).toBe(false);
  });
  it('maakt nooit stil een kopie: niet opslaan bij alleen-lezen of onzekere rechten', () => {
    expect(
      moetOpslaanNaScenarioBewerking({
        heeftResultaat: true,
        magBewerken: false,
        bewerkrechtenOnzeker: false,
      }),
    ).toBe(false);
    expect(
      moetOpslaanNaScenarioBewerking({
        heeftResultaat: true,
        magBewerken: true,
        bewerkrechtenOnzeker: true,
      }),
    ).toBe(false);
  });
});

// Opslaan vanuit "Scenario bewerken" (feedback eigenaar 2026-10-06: topbar gelijk aan Woning
// bewerken). Alleen het pand van dít scenario verandert; de rest van de woning blijft staan.
describe('zetScenarioPand', () => {
  const ander = { ...testpand6Kamers, pand: { ...testpand6Kamers.pand, adres: 'Bewerkt 1' } };

  it('vervangt alleen het pand van het juiste scenario en behoudt maatregelen', () => {
    const slots = standaardSlots(asIs);
    slots[0] = gevuld('Scenario 1', 'a');
    slots[1] = { ...gevuld('Scenario 2', 'b'), handmatigeInvesteringEuro: 900 };
    const uit = zetScenarioPand(opslaanbareScenarios(slots), 1, 'Scenario 2', ander);
    const geladen = slotsUitScenarios(viaDatabase(uit), asIs);
    expect(geladen[1]!.pand.pand.adres).toBe('Bewerkt 1');
    expect(geladen[1]!.kamerBewerkt).toBe(true);
    expect([...geladen[1]!.sleutels]).toEqual(['b']);
    expect(geladen[1]!.handmatigeInvesteringEuro).toBe(900);
    expect(geladen[0]!.pand).toEqual(asIs);
    expect([...geladen[0]!.sleutels]).toEqual(['a']);
  });

  it('maakt het scenario aan als het slot nog leeg was, op de juiste plek', () => {
    const slots = standaardSlots(asIs);
    slots[0] = gevuld('Scenario 1', 'a');
    const uit = zetScenarioPand(opslaanbareScenarios(slots), 2, 'Scenario 3', ander);
    const geladen = slotsUitScenarios(viaDatabase(uit), asIs);
    expect(geladen[2]!.naam).toBe('Scenario 3');
    expect(geladen[2]!.pand.pand.adres).toBe('Bewerkt 1');
    expect(geladen[1]!.naam).toBe('Scenario 2');
    expect(geladen[1]!.kamerBewerkt).toBe(false);
  });

  it('werkt ook op oude data zonder positie', () => {
    const oud = viaDatabase([
      { soort: 'kandidaten', naam: 'Oud', sleutels: ['x'] } as ScenarioSelectie,
    ]);
    const geladen = slotsUitScenarios(viaDatabase(zetScenarioPand(oud, 0, 'Oud', ander)), asIs);
    expect(geladen[0]!.pand.pand.adres).toBe('Bewerkt 1');
    expect([...geladen[0]!.sleutels]).toEqual(['x']);
  });
});

// Regressietest (ultra-review 2026-10-06): bij onzekere rechten zei de melding "klik op Opslaan om
// een kopie te maken", terwijl die knop dan uitgeschakeld is.
describe('meldingScenarioNietOpgeslagen', () => {
  it('alleen-lezen: kopie maken via Opslaan', () => {
    expect(
      meldingScenarioNietOpgeslagen({ magBewerken: false, bewerkrechtenOnzeker: false }),
    ).toMatch(/alleen-lezen.*Opslaan/);
  });
  it('onzekere rechten: verversen, niet "klik op Opslaan"', () => {
    const m = meldingScenarioNietOpgeslagen({ magBewerken: true, bewerkrechtenOnzeker: true });
    expect(m).toMatch(/ververs de pagina/);
    expect(m).not.toMatch(/Klik op Opslaan/);
  });
});
