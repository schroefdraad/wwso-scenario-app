import type { Pand } from '../types/index';

export interface MonumentUitkomst {
  /** Percentage-opslag op de maximale huurprijs (0, 5, 15 of 35). */
  percentage: number;
  /** Alleen bij een Rijksmonument met een huurovereenkomst van vóór 1 juli 2024: +10 punten in plaats van een prijsopslag. */
  extraPunten: number;
  grondslag: string;
}

/** Peildatum van de Wet betaalbare huur, bepalend voor de vorm van de Rijksmonumentopslag (§2.14.3). */
const WET_BETAALBARE_HUUR_INGANGSDATUM = '2024-07-01';

/** §2.13.5 (ondanks de kop "2.14 Opslagen" in het beleidsboek zo genummerd): beschermd dorpsgezicht vervalt bij nieuwbouw. */
const BESCHERMD_DORPSGEZICHT_BOUWJAAR_GRENS = 1965;

/**
 * Monumentopslag (§2.14). `wwso.xlsx` had dit niet gemodelleerd; taak 7 implementeert het
 * volledig, inclusief de contractdatum-vertakking bij Rijksmonumenten (briefing B14).
 *
 * Rijks, Gemeente/Provinciaal en Beschermd dorpsgezicht sluiten elkaar structureel uit omdat
 * `Pand.monument` een enkelvoudig veld is (§2.14.1: "kunnen niet tegelijkertijd worden
 * toegekend") — er is dus nooit een percentage-cumulatie om op te tellen in dit model.
 */
export function bepaalMonumentopslag(pand: Pand): MonumentUitkomst {
  switch (pand.monument) {
    case 'Rijks': {
      if (pand.huurovereenkomstDatum === undefined) {
        throw new Error("Pand.monument is 'Rijks' maar 'huurovereenkomstDatum' ontbreekt — dit hoort al bij PandInvoer-validatie te zijn afgevangen.");
      }
      const opOfNaWetBetaalbareHuur = pand.huurovereenkomstDatum >= WET_BETAALBARE_HUUR_INGANGSDATUM;
      if (opOfNaWetBetaalbareHuur) {
        return {
          percentage: 35,
          extraPunten: 0,
          grondslag: `Rijksmonument, huurovereenkomst ${pand.huurovereenkomstDatum} (op/na ${WET_BETAALBARE_HUUR_INGANGSDATUM}) → +35% op de maximale huurprijs (§2.14.3)`,
        };
      }
      return {
        percentage: 0,
        extraPunten: 10,
        grondslag: `Rijksmonument, huurovereenkomst ${pand.huurovereenkomstDatum} (vóór ${WET_BETAALBARE_HUUR_INGANGSDATUM}) → +10 punten in plaats van een prijsopslag (§2.14.3)`,
      };
    }
    case 'Gemeente':
    case 'Provinciaal':
      return { percentage: 15, extraPunten: 0, grondslag: `${pand.monument === 'Gemeente' ? 'Gemeentelijk' : 'Provinciaal'} monument → +15% op de maximale huurprijs (§2.13.4)` };
    case 'Beschermd dorpsgezicht': {
      if (pand.bouwjaar >= BESCHERMD_DORPSGEZICHT_BOUWJAAR_GRENS) {
        return {
          percentage: 0,
          extraPunten: 0,
          grondslag: `Beschermd dorpsgezicht, maar bouwjaar ${pand.bouwjaar} ≥ ${BESCHERMD_DORPSGEZICHT_BOUWJAAR_GRENS} → geen opslag (§2.13.5, voorwaarde 2 niet gehaald)`,
        };
      }
      return {
        percentage: 5,
        extraPunten: 0,
        grondslag: `Beschermd dorpsgezicht, bouwjaar ${pand.bouwjaar} < ${BESCHERMD_DORPSGEZICHT_BOUWJAAR_GRENS} → +5% op de maximale huurprijs (§2.13.5)`,
      };
    }
    case 'Geen':
      return { percentage: 0, extraPunten: 0, grondslag: 'geen monumentstatus' };
  }
}
