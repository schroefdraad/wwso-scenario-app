import type { PandInvoer } from '../types/index';
import { PandInvoer as PandInvoerSchema } from '../types/pand-invoer';
import type { Mutatie } from './types';

/** Gooit een duidelijke fout met welke mutatie het was en waarom hij niet kon worden toegepast. */
function mutatieFout(mutatie: Mutatie, reden: string): never {
  throw new Error(`Mutatie '${mutatie.soort}' kon niet worden toegepast: ${reden}`);
}

/**
 * Past één mutatie toe op een `PandInvoer` en geeft een NIEUW object terug — de invoer wordt
 * nooit gemuteerd. Elke mutatie die naar een niet-bestaand ruimteNr of een reeds bestaand
 * ruimteNr verwijst, faalt expliciet in plaats van iets te negeren of te overschrijven (harde
 * regel 4: nooit stilzwijgend gokken).
 *
 * `ruimte-verwijderen` cascadeert bewust NIET naar toewijzing/keuken/sanitair/parkeerplek die
 * nog naar die ruimte verwijzen — dat zou een verrassende neveneffect zijn. De mutatielijst
 * moet die eerst zelf verwijderen, in een expliciete volgorde.
 */
function pasMutatieToe(pand: PandInvoer, mutatie: Mutatie): PandInvoer {
  switch (mutatie.soort) {
    case 'pand-patch':
      return { ...pand, pand: { ...pand.pand, ...mutatie.patch } };

    case 'ruimte-toevoegen': {
      if (pand.ruimtes.some((r) => r.nr === mutatie.ruimte.nr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimte.nr} bestaat al.`);
      }
      return {
        ...pand,
        ruimtes: [...pand.ruimtes, mutatie.ruimte],
        toewijzing: [...pand.toewijzing, { ruimteNr: mutatie.ruimte.nr, kamers: mutatie.kamers }],
      };
    }

    case 'ruimte-wijzigen': {
      if (!pand.ruimtes.some((r) => r.nr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} bestaat niet.`);
      }
      return {
        ...pand,
        ruimtes: pand.ruimtes.map((r) => (r.nr === mutatie.ruimteNr ? { ...r, ...mutatie.patch } : r)),
      };
    }

    case 'ruimte-verwijderen': {
      if (!pand.ruimtes.some((r) => r.nr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} bestaat niet.`);
      }
      const nogInGebruik =
        pand.keukens.some((k) => k.ruimteNr === mutatie.ruimteNr) ||
        pand.sanitair.some((s) => s.ruimteNr === mutatie.ruimteNr) ||
        pand.parkeerplekken.some((p) => p.ruimteNr === mutatie.ruimteNr);
      if (nogInGebruik) {
        mutatieFout(
          mutatie,
          `ruimte ${mutatie.ruimteNr} heeft nog een keuken, sanitair of parkeerplek — verwijder die eerst met een eigen mutatie.`,
        );
      }
      return {
        ...pand,
        ruimtes: pand.ruimtes.filter((r) => r.nr !== mutatie.ruimteNr),
        toewijzing: pand.toewijzing.filter((t) => t.ruimteNr !== mutatie.ruimteNr),
      };
    }

    case 'toewijzing-wijzigen': {
      if (!pand.ruimtes.some((r) => r.nr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} bestaat niet.`);
      }
      const bestaandeIndex = pand.toewijzing.findIndex((t) => t.ruimteNr === mutatie.ruimteNr);
      const nieuweEntry = { ruimteNr: mutatie.ruimteNr, kamers: mutatie.kamers };
      const toewijzing =
        bestaandeIndex === -1
          ? [...pand.toewijzing, nieuweEntry]
          : pand.toewijzing.map((t, i) => (i === bestaandeIndex ? nieuweEntry : t));
      return { ...pand, toewijzing };
    }

    case 'keuken-toevoegen': {
      if (pand.keukens.some((k) => k.ruimteNr === mutatie.keuken.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.keuken.ruimteNr} heeft al een keuken.`);
      }
      return { ...pand, keukens: [...pand.keukens, mutatie.keuken] };
    }
    case 'keuken-wijzigen': {
      if (!pand.keukens.some((k) => k.ruimteNr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} heeft geen keuken om te wijzigen.`);
      }
      return {
        ...pand,
        keukens: pand.keukens.map((k) => (k.ruimteNr === mutatie.ruimteNr ? { ...k, ...mutatie.patch } : k)),
      };
    }
    case 'keuken-verwijderen': {
      if (!pand.keukens.some((k) => k.ruimteNr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} heeft geen keuken om te verwijderen.`);
      }
      return { ...pand, keukens: pand.keukens.filter((k) => k.ruimteNr !== mutatie.ruimteNr) };
    }

    case 'sanitair-toevoegen': {
      if (pand.sanitair.some((s) => s.ruimteNr === mutatie.sanitair.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.sanitair.ruimteNr} heeft al een sanitaire voorziening.`);
      }
      return { ...pand, sanitair: [...pand.sanitair, mutatie.sanitair] };
    }
    case 'sanitair-wijzigen': {
      if (!pand.sanitair.some((s) => s.ruimteNr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} heeft geen sanitaire voorziening om te wijzigen.`);
      }
      return {
        ...pand,
        sanitair: pand.sanitair.map((s) => (s.ruimteNr === mutatie.ruimteNr ? { ...s, ...mutatie.patch } : s)),
      };
    }
    case 'sanitair-verwijderen': {
      if (!pand.sanitair.some((s) => s.ruimteNr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} heeft geen sanitaire voorziening om te verwijderen.`);
      }
      return { ...pand, sanitair: pand.sanitair.filter((s) => s.ruimteNr !== mutatie.ruimteNr) };
    }

    case 'parkeerplek-toevoegen': {
      if (pand.parkeerplekken.some((p) => p.ruimteNr === mutatie.parkeerplek.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.parkeerplek.ruimteNr} heeft al een parkeerplek.`);
      }
      return { ...pand, parkeerplekken: [...pand.parkeerplekken, mutatie.parkeerplek] };
    }
    case 'parkeerplek-wijzigen': {
      if (!pand.parkeerplekken.some((p) => p.ruimteNr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} heeft geen parkeerplek om te wijzigen.`);
      }
      return {
        ...pand,
        parkeerplekken: pand.parkeerplekken.map((p) =>
          p.ruimteNr === mutatie.ruimteNr ? { ...p, ...mutatie.patch } : p,
        ),
      };
    }
    case 'parkeerplek-verwijderen': {
      if (!pand.parkeerplekken.some((p) => p.ruimteNr === mutatie.ruimteNr)) {
        mutatieFout(mutatie, `ruimte ${mutatie.ruimteNr} heeft geen parkeerplek om te verwijderen.`);
      }
      return { ...pand, parkeerplekken: pand.parkeerplekken.filter((p) => p.ruimteNr !== mutatie.ruimteNr) };
    }

    case 'aanbelfunctie-toevoegen': {
      return {
        ...pand,
        handmatigePosten: {
          ...pand.handmatigePosten,
          aanbelfuncties: [...pand.handmatigePosten.aanbelfuncties, { kamersMetToegang: mutatie.kamersMetToegang }],
        },
      };
    }

    case 'aftreksituatie-wijzigen': {
      return {
        ...pand,
        handmatigePosten: {
          ...pand.handmatigePosten,
          aftrekSituaties: {
            ...pand.handmatigePosten.aftrekSituaties,
            [mutatie.situatie]: mutatie.kamers,
          },
        },
      };
    }
  }
}

/**
 * Past een volledige mutatielijst toe op de as-is invoer en levert een nieuwe, gevalideerde
 * `PandInvoer` op. Omdat elke stap teruggrijpt op de HUIDIGE as-is (niet op een bevroren
 * snapshot), werkt een correctie in de as-is automatisch door: dezelfde mutatielijst wordt
 * gewoon opnieuw op de bijgewerkte as-is toegepast (taak 9's kernvereiste).
 *
 * Het eindresultaat wordt door `PandInvoer.safeParse` gehaald — een scenario dat een ongeldig
 * pand oplevert (bijv. een toewijzing naar een kamer buiten `aantalKamers`) faalt hier
 * expliciet, in plaats van dat de ongeldigheid pas bij het doorrekenen aan het licht komt.
 *
 * `ruimte-verwijderen` neemt de bijbehorende toewijzing-entry automatisch mee weg: die heeft,
 * anders dan een keuken/sanitair/parkeerplek-record, geen zelfstandig bestaansrecht los van de
 * ruimte. Keuken/sanitair/parkeerplek zijn wél aparte beslissingen en moeten expliciet met hun
 * eigen mutatie worden verwijderd vóór de ruimte zelf weg mag.
 */
export function pasScenarioToe(asIs: PandInvoer, mutaties: readonly Mutatie[]): PandInvoer {
  const resultaat = mutaties.reduce(pasMutatieToe, asIs);
  const validatie = PandInvoerSchema.safeParse(resultaat);
  if (!validatie.success) {
    throw new Error(`Scenario levert een ongeldig pand op: ${validatie.error.message}`);
  }
  return validatie.data;
}
