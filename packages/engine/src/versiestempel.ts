import type { Kostencatalogus, Tarievenset } from '@wwso/data';
import { REGISTRY_VERSIE } from './suggesties/types';

/**
 * Versie van de rekenmotor zelf (rubrieken, eindtelling, suggestie-engine gezamenlijk) —
 * handmatig opgehoogd bij een inhoudelijke wijziging aan een rekenregel, niet gekoppeld aan
 * `package.json` (dat zou build-/publicatieversie vermengen met "welke rekenlogica gebruikt is").
 */
export const ENGINE_VERSIE = '0.0.0';

/**
 * Harde regel 6: elke opgeslagen berekening krijgt een stempel — peildatum tarieven + versie
 * kostencatalogus + versie registry + versie engine — zodat een uitkomst van maanden geleden
 * reproduceerbaar blijft, ook als er ondertussen een nieuwe tarievenset of kostencatalogus is
 * toegevoegd (taak 15).
 */
export interface Versiestempel {
  tarievensetPeildatum: string;
  kostencatalogusVersie: string;
  registryVersie: string;
  engineVersie: string;
}

export function huidigeVersiestempel(tarievenset: Tarievenset, kostencatalogus: Kostencatalogus): Versiestempel {
  return {
    tarievensetPeildatum: tarievenset.peildatum,
    kostencatalogusVersie: kostencatalogus.versie,
    registryVersie: REGISTRY_VERSIE,
    engineVersie: ENGINE_VERSIE,
  };
}
