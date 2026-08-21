import { RuimteType, type PandInvoer } from '../types/index';
import { rondAfOp2Decimalen } from '../rubrieken/gedeeld';
import type { ControleBevinding, ControleResultaat } from './types';

/**
 * Ruimtetypen die WOZ-oppervlak (gebruiksoppervlakte wonen, NEN 2580) niet meetelt — buiten- en
 * parkeerruimte staan los van het "totaal m²" waarmee controle 1 vergelijkt. Alle overige typen
 * (incl. de gemeenschappelijke vertrek-/overige-ruimte-varianten) tellen wél mee: dat is
 * binnenruimte die een bewoner feitelijk gebruikt.
 */
const BUITEN_WOZ_OPPERVLAK: readonly RuimteType[] = [
  'Buitenruimte privé',
  'Buitenruimte gemeenschappelijk',
  'Parkeerplek gemeenschappelijk',
];

const OPPERVLAKTE_AFWIJKING_DREMPEL = 0.2;

/**
 * Controle 1 (§Controles): som van alle binnenruimten vs. `pand.wozOppervlak`. Dit is een
 * PANDNIVEAU-optelling (elke ruimte volledig meegeteld, niet gedeeld door het aantal kamers met
 * toegang) — WOZ-oppervlak beschrijft het hele pand, niet een aandeel per kamer. Waarschuwt bij
 * meer dan 20% relatieve afwijking, in beide richtingen.
 */
function controleerOppervlakte(input: PandInvoer): ControleResultaat {
  const totaalM2 = rondAfOp2Decimalen(
    input.ruimtes
      .filter((r) => !BUITEN_WOZ_OPPERVLAK.includes(r.type))
      .reduce((som, r) => som + r.oppervlakteM2, 0),
  );
  const wozOppervlak = input.pand.wozOppervlak;
  const afwijking = wozOppervlak > 0 ? Math.abs(totaalM2 - wozOppervlak) / wozOppervlak : 0;

  const bevindingen: ControleBevinding[] = [];
  if (afwijking > OPPERVLAKTE_AFWIJKING_DREMPEL) {
    const percentage = Math.round(afwijking * 1000) / 10;
    bevindingen.push({
      code: 'oppervlakte-afwijking',
      omschrijving: `Totale binnenoppervlakte (${totaalM2} m²) wijkt ${percentage}% af van het WOZ-oppervlak (${wozOppervlak} m²) — meer dan de drempel van 20%.`,
    });
  }

  return { code: 'oppervlakte-afwijking', titel: 'Totaal m² versus WOZ-oppervlak', bevindingen };
}

/**
 * Controle 2 (§Controles): ruimten zonder (geldig) type. Op een `PandInvoer` die al door
 * `PandInvoer.safeParse` is gekomen, is dit STRUCTUREEL onmogelijk — `Ruimte.type` is een
 * verplicht Zod-enum-veld, anders dan de vrije/optionele dropdown in de xlsx. Deze controle
 * blijft niettemin een echte, uitvoerbare check (niet stilzwijgend weggelaten, harde regel 2)
 * en levert op elke geldige `PandInvoer` gegarandeerd 0 bevindingen op — puur als vangnet mocht
 * het model ooit een optioneel/nullable type-veld krijgen.
 */
function controleerRuimteType(input: PandInvoer): ControleResultaat {
  const bevindingen: ControleBevinding[] = [];
  for (const ruimte of input.ruimtes) {
    if (!RuimteType.safeParse(ruimte.type).success) {
      bevindingen.push({
        code: 'ruimte-zonder-type',
        ruimteNr: ruimte.nr,
        omschrijving: `Ruimte ${ruimte.nr} (${ruimte.naam}) heeft geen geldig type.`,
      });
    }
  }
  return { code: 'ruimte-zonder-type', titel: 'Ruimten zonder type', bevindingen };
}

/** Controle 3 (§Controles): ruimten die aan geen enkele kamer zijn toegewezen — het stille-verlies-risico uit taak 12. */
function controleerToewijzing(input: PandInvoer): ControleResultaat {
  const toegewezenRuimteNrs = new Set(input.toewijzing.map((t) => t.ruimteNr));
  const bevindingen: ControleBevinding[] = input.ruimtes
    .filter((r) => !toegewezenRuimteNrs.has(r.nr))
    .map((r) => ({
      code: 'ruimte-niet-toegewezen' as const,
      ruimteNr: r.nr,
      omschrijving: `Ruimte ${r.nr} (${r.naam}) is aan geen enkele kamer toegewezen en telt daardoor voor niemand mee.`,
    }));
  return { code: 'ruimte-niet-toegewezen', titel: 'Ruimten zonder toewijzing', bevindingen };
}

/** Controle 4 (§Controles): kamers zonder toegang tot een ruimte van het type Privévertrek. */
function controleerPrivevertrek(input: PandInvoer): ControleResultaat {
  const privevertrekRuimteNrs = new Set(
    input.ruimtes.filter((r) => r.type === 'Privévertrek').map((r) => r.nr),
  );
  const kamersMetPrivevertrek = new Set<number>();
  for (const entry of input.toewijzing) {
    if (!privevertrekRuimteNrs.has(entry.ruimteNr)) continue;
    for (const kamer of entry.kamers) kamersMetPrivevertrek.add(kamer);
  }

  const bevindingen: ControleBevinding[] = [];
  for (let kamer = 1; kamer <= input.pand.aantalKamers; kamer++) {
    if (!kamersMetPrivevertrek.has(kamer)) {
      bevindingen.push({
        code: 'kamer-zonder-privevertrek',
        kamer,
        omschrijving: `Kamer ${kamer} heeft geen toegang tot een ruimte van het type Privévertrek.`,
      });
    }
  }
  return { code: 'kamer-zonder-privevertrek', titel: 'Kamers zonder privévertrek', bevindingen };
}

/** Voert alle vier de controles uit tab `Controles` van `wwso.xlsx` uit (taak 13). Puur, geen berekening van punten nodig. */
export function voerControlesUit(input: PandInvoer): ControleResultaat[] {
  return [
    controleerOppervlakte(input),
    controleerRuimteType(input),
    controleerToewijzing(input),
    controleerPrivevertrek(input),
  ];
}
