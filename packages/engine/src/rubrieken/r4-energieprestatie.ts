import type { Tarievenset } from '@wwso/data';
import type { MonumentStatus, PandInvoer } from '../types/index';
import {
  ongerondeVertrekOppervlakteM2,
  rondAfOp2Decimalen,
  rondAfOpKwartpunten,
  ruimtesPerKamer,
} from './gedeeld';
import type { RubriekResultaat } from './types';

/** Monumentsoorten die de uitzondering van §2.4.6.1 krijgen. Beschermd dorpsgezicht hoort er niet bij. */
const MONUMENT_ZONDER_MINPUNTEN: readonly MonumentStatus[] = ['Rijks', 'Gemeente', 'Provinciaal'];

interface FactorUitkomst {
  factor: number;
  grondslag: string;
}

/**
 * Bepaalt de punten per m². Volgorde: energielabel → anders het bouwjaar (§2.4.5). Een gekozen
 * label wordt altijd gebruikt, TENZIJ de gebruiker `energielabelOnbekendOfVervallen` heeft
 * aangevinkt — dan valt R4 terug op de bouwjaargrens, net als bij "geen label bekend".
 *
 * Bewust géén exacte datum-/geldigheidstoets meer (§2.4.3, tot 2026-09-05 hier geïmplementeerd
 * als `toetsLabelGeldigheid`): in de praktijk staat op bijv. Funda vaak alleen de labelletter,
 * niet de ingangsdatum, en de motor viel dan onterecht terug op het bouwjaar (feedback Emma
 * Morrison, 2026-09-05). Eén expliciet vinkje vervangt de exacte datum; de aparte uitzondering
 * voor "vereenvoudigde labels" uit 2015-2021 (§2.4.3 lid 4) is daarbij bewust losgelaten — die
 * vereiste toch al exacte datumkennis die in de praktijk niemand paraat heeft.
 * De monumentuitzondering van §2.4.6.1 zet een negatieve uitkomst op 0.
 */
function bepaalFactor(pand: PandInvoer['pand'], tarievenset: Tarievenset): FactorUitkomst {
  let factor: number;
  let grondslag: string;

  const gebruikLabel = pand.energielabel !== 'Bouwjaar' && !pand.energielabelOnbekendOfVervallen;

  if (gebruikLabel) {
    const regel = tarievenset.energielabelfactoren.find((f) => f.label === pand.energielabel);
    if (!regel) {
      throw new Error(`Geen energielabelfactor gevonden voor label '${pand.energielabel}'.`);
    }
    factor = regel.factorPerM2;
    grondslag = `label ${pand.energielabel}`;
  } else {
    const passend = tarievenset.bouwjaargrenzen
      .filter((b) => b.totEnMetBouwjaar >= pand.bouwjaar)
      .sort((a, b) => a.totEnMetBouwjaar - b.totEnMetBouwjaar)[0];
    if (!passend) {
      const hoogsteGrens = Math.max(...tarievenset.bouwjaargrenzen.map((b) => b.totEnMetBouwjaar));
      throw new Error(
        `Geen bouwjaargrens gevonden voor bouwjaar ${pand.bouwjaar} — de tabel dekt alleen bouwjaar t/m ${hoogsteGrens}.`,
      );
    }
    factor = passend.factorPerM2;
    grondslag =
      pand.energielabel === 'Bouwjaar'
        ? `bouwjaar ${pand.bouwjaar} (geen label)`
        : `bouwjaar ${pand.bouwjaar} (label ${pand.energielabel}, ingangsdatum onbekend of vervallen)`;
  }

  if (factor < 0 && MONUMENT_ZONDER_MINPUNTEN.includes(pand.monument)) {
    return { factor: 0, grondslag: `${grondslag}, minpunten vervallen wegens monument (§2.4.6.1)` };
  }

  return { factor, grondslag };
}

/**
 * R4 — Energieprestatie (§2.4). Punten per m² over "het totaal aantal m² oppervlakte die de
 * huurder heeft als privé vertrekken en de aan huurder toe te rekenen gemeenschappelijke
 * vertrekken" (§2.4.4).
 *
 * Die oppervlakte is bewust *niet* de afgeronde R1-uitkomst: de m²-afronding van §2.2.1.1
 * hoort bij de rekenregel van rubriek 1 ("Bepaal het puntenaantal voor de vertrekken op basis
 * van de m²") en wordt in §2.4.4 niet aangehaald. Waar het beleidsboek wél de uitkomst van
 * rubriek 1 bedoelt, benoemt het die (§2.13). Er wordt dus één keer afgerond: op kwartpunten
 * per rubriek (§2.1.6), na vermenigvuldiging met de labelfactor — precies zoals §2.8.2 het
 * ook voordoet voor een gedeelde buitenruimte (30 m² / 4 → punten → kwartpuntsafronding).
 * Drie officiële Huurprijscheck-uitkomsten bevestigen dit exact; zie
 * `outputs/RAPPORT_taak8-r4-opus-beoordeling_2026-08-19.md`.
 */
export function berekenR4(input: PandInvoer, tarievenset: Tarievenset): RubriekResultaat {
  const perKamerRuimtes = ruimtesPerKamer(input);
  const perKamer: Record<number, number> = {};
  const perKamerRuw: Record<number, number> = {};
  const toelichting: string[] = [];
  const { factor, grondslag } = bepaalFactor(input.pand, tarievenset);

  for (const [kamer, ruimtes] of perKamerRuimtes) {
    const oppervlakteM2 = ongerondeVertrekOppervlakteM2(ruimtes);
    const ruwPunten = oppervlakteM2 * factor;
    const punten = rondAfOpKwartpunten(ruwPunten);

    perKamer[kamer] = punten;
    perKamerRuw[kamer] = ruwPunten;
    toelichting.push(
      `R4 kamer ${kamer}: ${rondAfOp2Decimalen(oppervlakteM2)} m² (privé + toegerekend gedeeld, ongerond, §2.4.4) × ${factor} pt/m² [${grondslag}] → ${punten} pt`,
    );
  }

  return { perKamer, perKamerRuw, toelichting };
}
