import { describe, expect, it } from 'vitest';
import { testpand6Kamers } from '../fixtures/testpand-6kamers';
import { voerControlesUit } from './controles';
import type { PandInvoer } from '../types/index';

function vindResultaat(resultaten: ReturnType<typeof voerControlesUit>, code: string) {
  return resultaten.find((r) => r.code === code)!;
}

describe('controles — schoon testpand geeft geen enkele bevinding', () => {
  it('testpand6Kamers voldoet aan alle vier de controles', () => {
    const resultaten = voerControlesUit(testpand6Kamers);
    expect(resultaten).toHaveLength(4);
    for (const resultaat of resultaten) {
      expect(resultaat.bevindingen).toEqual([]);
    }
  });
});

describe('controles — vuren op een testpand waarin ze bewust geschonden zijn', () => {
  // Bewust NIET via `pasScenarioToe` opgebouwd: de mutatielijst is ontworpen om altijd een
  // geldig pand op te leveren, terwijl deze controles juist gevallen dekken die Zod toestaat
  // maar die inhoudelijk verdacht zijn (bijv. een ruimte zonder toewijzing). Rechtstreekse
  // objectconstructie is hier dus het juiste gereedschap, niet een omissie van het scenariomodel.
  const geschondenPand: PandInvoer = {
    ...testpand6Kamers,
    pand: {
      ...testpand6Kamers.pand,
      // Werkelijke binnenoppervlakte van dit testpand ligt rond de 90 m²; 300 m² WOZ-oppervlak
      // is ruim meer dan 20% afwijking.
      wozOppervlak: 300,
    },
    toewijzing: testpand6Kamers.toewijzing
      // Controle 3: ruimte 11 (Berging) helemaal geen toewijzing-entry meer geven.
      .filter((t) => t.ruimteNr !== 11)
      // Controle 4: ruimte 3 (Kamer 3, Privévertrek) naar kamer 2 verschuiven — kamer 3 verliest
      // daarmee zijn privévertrek, zonder dat ruimte 3 zelf onbeheerd raakt (geen overlap met
      // controle 3).
      .map((t) => (t.ruimteNr === 3 ? { ...t, kamers: [2] } : t)),
  };

  const resultaten = voerControlesUit(geschondenPand);

  it('controle 1 (oppervlakte) vuurt', () => {
    const r = vindResultaat(resultaten, 'oppervlakte-afwijking');
    expect(r.bevindingen).toHaveLength(1);
    expect(r.bevindingen[0].omschrijving).toContain('20%');
  });

  it('controle 2 (ruimte zonder type) blijft altijd leeg op een gevalideerd PandInvoer', () => {
    // Structureel bewijs, geen losse bewering: RuimteType is een verplicht Zod-enum-veld, dus
    // een geldig PandInvoer kan deze controle per definitie nooit schenden.
    const r = vindResultaat(resultaten, 'ruimte-zonder-type');
    expect(r.bevindingen).toEqual([]);
  });

  it('controle 3 (ruimte niet toegewezen) vuurt op ruimte 11', () => {
    const r = vindResultaat(resultaten, 'ruimte-niet-toegewezen');
    expect(r.bevindingen).toHaveLength(1);
    expect(r.bevindingen[0].ruimteNr).toBe(11);
  });

  it('controle 4 (kamer zonder privévertrek) vuurt op kamer 3', () => {
    const r = vindResultaat(resultaten, 'kamer-zonder-privevertrek');
    expect(r.bevindingen).toHaveLength(1);
    expect(r.bevindingen[0].kamer).toBe(3);
  });
});

describe('controles — grenswaarde van de oppervlakte-afwijking', () => {
  it('19% afwijking waarschuwt niet, 21% wel', () => {
    const basis: PandInvoer = { ...testpand6Kamers };
    const totaalM2 = basis.ruimtes
      .filter((r) => !['Buitenruimte privé', 'Buitenruimte gemeenschappelijk', 'Parkeerplek gemeenschappelijk'].includes(r.type))
      .reduce((som, r) => som + r.oppervlakteM2, 0);

    // De afwijking wordt gemeten relatief t.o.v. wozOppervlak (de noemer), dus wozOppervlak
    // moet zo gekozen worden dat (totaalM2 − wozOppervlak) / wozOppervlak exact het doelpercentage
    // oplevert: wozOppervlak = totaalM2 / (1 + doel).
    const binnenDrempel: PandInvoer = { ...basis, pand: { ...basis.pand, wozOppervlak: totaalM2 / 1.19 } };
    const buitenDrempel: PandInvoer = { ...basis, pand: { ...basis.pand, wozOppervlak: totaalM2 / 1.21 } };

    expect(vindResultaat(voerControlesUit(binnenDrempel), 'oppervlakte-afwijking').bevindingen).toEqual([]);
    expect(vindResultaat(voerControlesUit(buitenDrempel), 'oppervlakte-afwijking').bevindingen).toHaveLength(1);
  });
});
