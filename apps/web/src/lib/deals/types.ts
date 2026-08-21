import { z } from 'zod';
import { PandInvoer, type Versiestempel } from '@wwso/engine';

/** Eén scenario-slot uit taak 14: alleen de gekozen kandidaat-sleutels, nooit het afgeleide
 * Pakket-resultaat (dat wordt bij het laden altijd opnieuw doorgerekend). */
export const ScenarioSelectie = z.object({
  naam: z.string().min(1),
  sleutels: z.array(z.string().min(1)),
});
export type ScenarioSelectie = z.infer<typeof ScenarioSelectie>;

/** Rauwe rij zoals die uit de `deals`-tabel komt (snake_case, zie
 * `supabase/migrations/0001_create_deals.sql`). */
const DealRij = z.object({
  id: z.string(),
  org_id: z.string(),
  naam: z.string(),
  pand_invoer: z.unknown(),
  scenarios: z.array(ScenarioSelectie),
  tarievenset_peildatum: z.string(),
  kostencatalogus_versie: z.string(),
  registry_versie: z.string(),
  engine_versie: z.string(),
  aangemaakt: z.string(),
  bijgewerkt: z.string(),
});

/** App-facing vorm (camelCase, met de PandInvoer al gevalideerd en het versiestempel gebundeld
 * zoals de rest van de engine hem kent — zie `packages/engine/src/versiestempel.ts`). */
export interface Deal {
  id: string;
  naam: string;
  pandInvoer: PandInvoer;
  scenarios: ScenarioSelectie[];
  versiestempel: Versiestempel;
  aangemaakt: string;
  bijgewerkt: string;
}

/**
 * Zet een rauwe Supabase-rij om naar een `Deal`, met volledige Zod-validatie van de opgeslagen
 * invoer-snapshot. Gooit een fout in plaats van stil een corrupte/verouderde rij door te laten
 * (harde regel 4: nooit stilzwijgend gokken) — dat kan alleen gebeuren als de tabel buiten deze
 * app om is bewerkt, iets dat zichtbaar moet zijn, niet weggeslikt.
 */
export function parseDealRij(ruw: unknown): Deal {
  const rij = DealRij.parse(ruw);
  const pandInvoer = PandInvoer.parse(rij.pand_invoer);
  return {
    id: rij.id,
    naam: rij.naam,
    pandInvoer,
    scenarios: rij.scenarios,
    versiestempel: {
      tarievensetPeildatum: rij.tarievenset_peildatum,
      kostencatalogusVersie: rij.kostencatalogus_versie,
      registryVersie: rij.registry_versie,
      engineVersie: rij.engine_versie,
    },
    aangemaakt: rij.aangemaakt,
    bijgewerkt: rij.bijgewerkt,
  };
}
