import type { Kostencatalogus } from '@wwso/data';
import type { MaatregelRegistry } from '../types';

export interface RegistryValidatieResultaat {
  /** Catalogus-id's zonder registry-definitie. */
  ontbrekendInRegistry: string[];
  /** Registry-id's zonder catalogusregel. */
  onbekendInCatalogus: string[];
  brontekstDrift: { id: string; catalogusTekst: string; registryTekst: string }[];
}

/**
 * Bijectie- en brontekst-driftcheck (§2 van `outputs/RAPPORT_taak11_2026-08-20.md`). Elke
 * `Maatregel.id` in de catalogus moet precies één registry-entry hebben en omgekeerd — dat
 * dekt de verificatie-eis dat elke voorgestelde maatregel herleidbaar is naar een catalogusregel.
 * De vergunningtekst in de registry moet byte-identiek zijn aan de catalogustekst op het moment
 * van classificeren: wijzigt de xlsx-tekst, dan is de handmatige classificatie verdacht.
 */
export function valideerRegistry(registry: MaatregelRegistry, catalogus: Kostencatalogus): RegistryValidatieResultaat {
  const catalogusIds = new Set(catalogus.maatregelen.map((m) => m.id));
  const registryIds = new Set(registry.keys());

  const ontbrekendInRegistry = [...catalogusIds].filter((id) => !registryIds.has(id));
  const onbekendInCatalogus = [...registryIds].filter((id) => !catalogusIds.has(id));

  const brontekstDrift: RegistryValidatieResultaat['brontekstDrift'] = [];
  for (const maatregel of catalogus.maatregelen) {
    const def = registry.get(maatregel.id);
    if (!def) continue;
    if (def.vergunningBrontekst !== maatregel.vergunningOfMelding) {
      brontekstDrift.push({ id: maatregel.id, catalogusTekst: maatregel.vergunningOfMelding, registryTekst: def.vergunningBrontekst });
    }
  }

  return { ontbrekendInRegistry, onbekendInCatalogus, brontekstDrift };
}

/**
 * Gooit een duidelijke fout zodra de registry niet bijectief is met de catalogus, of een
 * vergunningtekst is gedrift — nooit stilzwijgend doorlopen (harde regel 2). Wordt aangeroepen
 * bij elke `stelSuggestiesOp`.
 */
export function valideerRegistryOfGooiFout(registry: MaatregelRegistry, catalogus: Kostencatalogus): void {
  const resultaat = valideerRegistry(registry, catalogus);
  const fouten: string[] = [];
  if (resultaat.ontbrekendInRegistry.length > 0) {
    fouten.push(`Catalogusregels zonder registry-definitie: ${resultaat.ontbrekendInRegistry.join(', ')}.`);
  }
  if (resultaat.onbekendInCatalogus.length > 0) {
    fouten.push(`Registry-definities zonder catalogusregel (versie ${catalogus.versie}): ${resultaat.onbekendInCatalogus.join(', ')}.`);
  }
  if (resultaat.brontekstDrift.length > 0) {
    const regels = resultaat.brontekstDrift.map((d) => `${d.id}: catalogus '${d.catalogusTekst}' ≠ registry '${d.registryTekst}'`);
    fouten.push(`Vergunningtekst gewijzigd sinds classificatie, her-beoordeel: ${regels.join('; ')}.`);
  }
  if (fouten.length > 0) {
    throw new Error(`Registry-validatie mislukt.\n${fouten.join('\n')}`);
  }
}
