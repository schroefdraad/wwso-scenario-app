import type { Tarievenset } from '@wwso/data';
import { rondAfOp2Decimalen } from '../rubrieken/gedeeld';

export interface HuurprijsUitkomst {
  maxHuurEuro: number;
  grondslag: string;
}

/**
 * Huurprijs-lookup (Bijlage 1) met de extrapolatie van §2.1.8: boven 250 punten wordt elk
 * punt gewaardeerd tegen het verschil tussen de tabelbedragen bij 249 en 250 punten, opgeteld
 * bij het bedrag bij 250 punten. De huurprijstabel zelf stopt bij 250 (briefing B15).
 *
 * `punten` moet een heel getal zijn — dat volgt uit de eindsaldering van §2.1.7, die hieraan
 * voorafgaat. Een punten-totaal onder 0 (mogelijk door de aftrekpunten van R13) wordt op 0
 * geklemd: de tabel zelf begint bij 0 punten = € 0 en het beleidsboek kent geen negatieve
 * huurprijs.
 */
export function bepaalMaxHuur(punten: number, tarievenset: Tarievenset): HuurprijsUitkomst {
  const tabel = tarievenset.huurprijstabel;
  const hoogsteInTabel = Math.max(...tabel.map((r) => r.punten));

  if (punten < 0) {
    const uitkomst = bepaalMaxHuur(0, tarievenset);
    return {
      maxHuurEuro: uitkomst.maxHuurEuro,
      grondslag: `${punten} pt is negatief (aftrekpunten R13) → geklemd op 0 pt → ${uitkomst.grondslag}`,
    };
  }

  if (punten <= hoogsteInTabel) {
    const regel = tabel.find((r) => r.punten === punten);
    if (!regel) {
      throw new Error(`Geen huurprijsregel gevonden voor ${punten} punten in de tabel van peildatum ${tarievenset.peildatum}.`);
    }
    return { maxHuurEuro: regel.maxHuurEuro, grondslag: `${punten} pt → tabel (peildatum ${tarievenset.peildatum})` };
  }

  const regelHoogste = tabel.find((r) => r.punten === hoogsteInTabel);
  const regelVoorHoogste = tabel.find((r) => r.punten === hoogsteInTabel - 1);
  if (!regelHoogste || !regelVoorHoogste) {
    throw new Error(`Huurprijstabel van peildatum ${tarievenset.peildatum} mist de regels bij ${hoogsteInTabel - 1} of ${hoogsteInTabel} punten, nodig voor extrapolatie.`);
  }
  const verschilPerPunt = regelHoogste.maxHuurEuro - regelVoorHoogste.maxHuurEuro;
  const maxHuurEuro = rondAfOp2Decimalen(regelHoogste.maxHuurEuro + (punten - hoogsteInTabel) * verschilPerPunt);

  return {
    maxHuurEuro,
    grondslag: `${punten} pt > ${hoogsteInTabel} pt → extrapolatie (§2.1.8): € ${regelHoogste.maxHuurEuro} + ${punten - hoogsteInTabel} × € ${verschilPerPunt.toFixed(2)} = € ${maxHuurEuro}`,
  };
}
