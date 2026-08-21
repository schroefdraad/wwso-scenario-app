import type { Kostencatalogus } from '@wwso/data';
import type { Kandidaat, MaatregelContext, MaatregelDefinitie, MaatregelRegistry, SuggestieOpties } from './types';

export interface GegenereerdeKandidaat {
  kandidaat: Kandidaat;
  definitie: MaatregelDefinitie;
}

export interface KandidaatGeneratieResultaat {
  kandidaten: GegenereerdeKandidaat[];
  nietBeoordeeld: { maatregelId: string; reden: string }[];
}

/**
 * Genereert alle kandidaten in de vaste volgorde van de kostencatalogus (§7 van het ontwerp:
 * deterministisch, reproduceerbaar). Riders/PROC-regels (`puntenrelevant: false`) leveren nooit
 * zelfstandige kandidaten. Ontbreekt een verplichte parameter, dan verschijnt de maatregel in
 * `nietBeoordeeld` in plaats van stilzwijgend te worden overgeslagen (harde regel 2).
 */
export function genereerKandidaten(
  ctx: MaatregelContext,
  registry: MaatregelRegistry,
  kostencatalogus: Kostencatalogus,
  opties: SuggestieOpties,
): KandidaatGeneratieResultaat {
  const uitgesloten = new Set(opties.uitgeslotenMaatregelen ?? []);
  const kandidaten: GegenereerdeKandidaat[] = [];
  const nietBeoordeeld: { maatregelId: string; reden: string }[] = [];

  for (const maatregel of kostencatalogus.maatregelen) {
    if (uitgesloten.has(maatregel.id)) continue;
    const definitie = registry.get(maatregel.id);
    if (!definitie || !definitie.puntenrelevant) continue;

    const ruweParams = opties.maatregelParameters?.[maatregel.id];
    const parameters = definitie.parameterSchema && ruweParams !== undefined ? definitie.parameterSchema.parse(ruweParams) : ruweParams;

    const reden = definitie.nietBeoordeeldReden?.(ctx, parameters);
    if (reden) {
      nietBeoordeeld.push({ maatregelId: maatregel.id, reden });
      continue;
    }

    for (const kandidaat of definitie.kandidaten(ctx, parameters)) {
      kandidaten.push({ kandidaat, definitie });
    }
  }

  return { kandidaten, nietBeoordeeld };
}
