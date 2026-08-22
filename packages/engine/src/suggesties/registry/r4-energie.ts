import { z } from 'zod';
import { Energielabel } from '../../types/index';
import { toetsLabelGeldigheid } from '../../rubrieken/r4-energieprestatie';
import type { MaatregelContext, MaatregelDefinitie } from '../types';
import { vereistParameter } from './hulp';

interface EnergieParams {
  doelLabel: Energielabel;
}

/**
 * E-01 t/m E-08 — isolatie-/installatiemaatregelen. De labelsprong is pandfysica, geen
 * catalogus-eigenschap (`puntenIndicatie` is in taak 10 al als onbetrouwbaar gedocumenteerd) —
 * daarom altijd een verplichte parameter, nooit een geraden sprong. `vereist: ['E-09']`: zonder
 * een opnieuw geregistreerd label door een EP-adviseur is een nieuw label niet verdedigbaar,
 * ook al zet de mutatie hieronder de ingangsdatum al goed.
 *
 * ALTERNATIEVENGROEP 'energielabel': R4 kent alleen het EINDLABEL, niet de onderliggende
 * bouwfysica — elke E-maatregel die hetzelfde doellabel krijgt, levert dus per definitie
 * identieke punten op. Zonder een alternatiefGroep zou de pakketopbouw dat toevallig ontdekken
 * via de generieke "geen marginale winst"-afwijzing; met de groep is het een bewuste,
 * benoembare keuze (de aanroeper kiest één doellabel, de engine wijst de goedkoopste weg erheen
 * aan — dit is ook hoe een EP-adviseur het in de praktijk aanpakt: eerst het doellabel, dan de
 * goedkoopste combinatie van maatregelen om daar te komen).
 *
 * Combineren van maatregelen om een HOGERE labelsprong te halen dan elk apart (bijv. spouw +
 * vloer + glas samen naar B in plaats van elk naar C) kan deze engine bewust niet: welke
 * combinatie tot welk label leidt is een formele NTA 8800-berekening, geen vuistregel om te
 * gokken (harde regel 4). Dat blijft mensenwerk — E-09 dekt het moment waarop dat werk
 * (een nieuwe EP-adviseur-opname) zelf als kostenpost meetelt.
 *
 * AANNAME: deze groepering werkt correct zolang alle E-maatregelen in één run hetzelfde
 * doellabel krijgen (de bedoelde werkwijze — zie hierboven). `doel` bevat geen `nr` (het gaat
 * om het hele pand), dus de dedup-sleutel in `pakketten.ts` (alternatiefGroep + doel) maakt geen
 * onderscheid tussen kandidaten met een verschillend doellabel. Worden de E-maatregelen ooit met
 * uiteenlopende doellabels tegelijk aangeroepen, dan blokkeren ze elkaar ten onrechte.
 */
function energieDefinitie(id: string, vergunningKlasse: MaatregelDefinitie['vergunningKlasse'], vergunningBrontekst: string): MaatregelDefinitie<EnergieParams> {
  return {
    id,
    doelSoort: 'pand',
    vergunningKlasse,
    vergunningBrontekst,
    puntenrelevant: true,
    vereist: ['E-09'],
    alternatiefGroep: 'energielabel',
    parameterSchema: z.object({ doelLabel: Energielabel }),
    nietBeoordeeldReden: vereistParameter('vereist een doellabel — de labelsprong volgt uit de fysieke staat van dit pand, niet uit de kostencatalogus'),
    kandidaten(ctx, parameters) {
      if (!parameters) return [];
      if (parameters.doelLabel === ctx.pand.pand.energielabel) return [];
      return [
        {
          sleutel: `${id}#label:${parameters.doelLabel}`,
          maatregelId: id,
          doel: { soort: 'pand' },
          hoeveelheid: 1,
          parameters,
          omschrijving: `Energielabel naar ${parameters.doelLabel}`,
        },
      ];
    },
    mutaties(ctx, kandidaat) {
      return [{ soort: 'pand-patch', patch: { energielabel: kandidaat.parameters!.doelLabel, energielabelIngangsdatum: ctx.peildatum } }];
    },
  };
}

// E-01 t/m E-08 delen allemaal de alternatiefGroep 'energielabel' (zie de toelichting hierboven
// bij `energieDefinitie`) — geen aparte 'glas'-subgroep meer nodig, die viel er toch al onder.
const E01 = energieDefinitie('E-01', 'geen', 'Nee');
const E02 = energieDefinitie('E-02', 'geen', 'Nee');
const E03 = energieDefinitie('E-03', 'geen', 'Nee');
const E04 = energieDefinitie('E-04', 'geen', 'Nee');
const E05 = energieDefinitie('E-05', 'mogelijk-melding', 'Soms melding');
const E06 = energieDefinitie('E-06', 'geen', 'Nee');
const E07 = energieDefinitie('E-07', 'geen', 'Nee');
const E08 = energieDefinitie('E-08', 'mogelijk-melding', 'Soms melding');

/**
 * E-09 — nieuw energielabel laten registreren. Uitzondering op de rest van R4: parametervrij
 * zodra het HUIDIGE label vervallen of vereenvoudigd is (§2.4.3) en er al een echt label was
 * (niet 'Bouwjaar') — simpelweg opnieuw registreren zonder iets aan het pand te wijzigen haalt
 * R4 dan al van de bouwjaarfactor terug naar de labelfactor. Is er geen bruikbaar label om te
 * herregistreren, dan wordt alsnog een doellabel gevraagd.
 */
function e09AutoKandidaat(ctx: MaatregelContext) {
  if (ctx.pand.pand.energielabel === 'Bouwjaar') return null;
  // energielabelIngangsdatum is altijd optioneel — ontbreekt hij, dan is de geldigheid van het
  // huidige label onbekend (niet aantoonbaar vervallen óf aantoonbaar geldig), dus geen
  // automatische herregistratie-suggestie: dat zou een geldigheid gokken die niemand kent.
  if (ctx.pand.pand.energielabelIngangsdatum === undefined) return null;
  const reden = toetsLabelGeldigheid(ctx.pand.pand.energielabelIngangsdatum, ctx.peildatum);
  if (reden === 'vervallen' || reden === 'vereenvoudigd-label') return ctx.pand.pand.energielabel;
  return null;
}

const E09: MaatregelDefinitie<EnergieParams> = {
  id: 'E-09',
  doelSoort: 'pand',
  vergunningKlasse: 'geen',
  vergunningBrontekst: 'Nee',
  puntenrelevant: true,
  parameterSchema: z.object({ doelLabel: Energielabel }),
  nietBeoordeeldReden(ctx, parameters) {
    if (e09AutoKandidaat(ctx) !== null) return undefined;
    return parameters === undefined
      ? 'huidig label is geldig of ontbreekt — vereist een doellabel om opnieuw te laten registreren'
      : undefined;
  },
  kandidaten(ctx, parameters) {
    const autoLabel = e09AutoKandidaat(ctx);
    const doelLabel = autoLabel ?? parameters?.doelLabel;
    if (!doelLabel) return [];
    return [
      {
        sleutel: `E-09#label:${doelLabel}`,
        maatregelId: 'E-09',
        doel: { soort: 'pand' },
        hoeveelheid: 1,
        parameters: { doelLabel },
        omschrijving:
          autoLabel !== null
            ? `Energielabel ${doelLabel} opnieuw laten registreren (huidige registratie is vervallen/vereenvoudigd)`
            : `Nieuw energielabel ${doelLabel} laten registreren`,
      },
    ];
  },
  mutaties(ctx, kandidaat) {
    return [{ soort: 'pand-patch', patch: { energielabel: kandidaat.parameters!.doelLabel, energielabelIngangsdatum: ctx.peildatum } }];
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const r4EnergieMaatregelen: MaatregelDefinitie<any>[] = [E01, E02, E03, E04, E05, E06, E07, E08, E09];
