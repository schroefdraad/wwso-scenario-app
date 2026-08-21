import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { nieuwsteKostencatalogus } from '@wwso/data';
import { huidigeVersiestempel, ENGINE_VERSIE } from './versiestempel';
import { REGISTRY_VERSIE } from './suggesties/types';

describe('huidigeVersiestempel — harde regel 6', () => {
  it('bundelt tarieven-peildatum, kostencatalogus-versie, registry-versie en engine-versie', () => {
    const tarievenset = getTarievenset('2026-01-01');
    const kostencatalogus = nieuwsteKostencatalogus();

    const stempel = huidigeVersiestempel(tarievenset, kostencatalogus);

    expect(stempel).toEqual({
      tarievensetPeildatum: tarievenset.peildatum,
      kostencatalogusVersie: kostencatalogus.versie,
      registryVersie: REGISTRY_VERSIE,
      engineVersie: ENGINE_VERSIE,
    });
  });
});
