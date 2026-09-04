import { describe, expect, it } from 'vitest';
import { Keuken } from './voorzieningen';

/**
 * Regressietest voor een productie-incident (2026-09-04, direct na het uitrollen van v0.5.4):
 * `verwarmd` werd als verplicht Zod-veld toegevoegd aan `Keuken`, maar deals die vóór die versie
 * zijn opgeslagen hebben dit veld niet in hun bewaarde `pand_invoer`-JSON staan — "Deals ophalen
 * mislukt" voor iedereen met een bestaande deal met een keuken. Zie `git log` voor de fix
 * (`.default(false)`) en `outputs/RAPPORT_huurcommissie-crossvalidatie_2026-09-04.md` voor de
 * achtergrond van het veld zelf.
 */
describe('Keuken.verwarmd — backwards compatibility', () => {
  it('valt terug op false als verwarmd ontbreekt in oude opgeslagen data', () => {
    const oud = {
      ruimteNr: 1,
      aanrechtlengteM: 2.5,
      basiseisen: {
        aanEnAfvoerWater: true,
        vastKookaansluitpunt: true,
        aanrechtbladMinimaal1MeterInEenStuk: true,
        tweeInbouwkastenVan50Cm: true,
        waterdichteWandafwerking: true,
      },
      extra: {
        afzuiginstallatie: false,
        kookplaatInductie: false,
        kookplaatKeramisch: false,
        kookplaatGas: false,
        koelkast: false,
        vrieskast: false,
        ovenElektrisch: false,
        ovenGas: false,
        magnetron: false,
        vaatwasmachine: false,
        extraKastruimteEenhedenVan60Cm: 0,
        eenhandsmengkraan: false,
        thermostatischeMengkraan: false,
        kokendWaterfunctie: false,
      },
    };
    const geparsed = Keuken.parse(oud);
    expect(geparsed.verwarmd).toBe(false);
  });
});
