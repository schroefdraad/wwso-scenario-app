import { z } from 'zod';
import { Energielabel, PandInvoer, type Versiestempel } from '@wwso/engine';

/** Eén scenario-slot uit taak 14: alleen de gekozen kandidaat-sleutels, nooit het afgeleide
 * Pakket-resultaat (dat wordt bij het laden altijd opnieuw doorgerekend). `soort` is optioneel en
 * valt terug op 'kandidaten' — alle vóór 2026-08-22 opgeslagen deals hebben dit veld nog niet, en
 * kenden toen alleen dit ene type scenario, dus dat is geen gok maar een correcte migratie. */
const ScenarioSelectieKandidaten = z.object({
  soort: z.literal('kandidaten').default('kandidaten'),
  naam: z.string().min(1),
  sleutels: z.array(z.string().min(1)),
});

/** Een handmatig bewerkt TO-BE-scenario (backlog 2026-08-22: handmatig een kamer realiseren en
 * dan verder standaardmaatregelen toevoegen) — `pand` is de volledige, al gevalideerde bewerkte
 * PandInvoer; `sleutels` verwijst naar de kandidatenlijst tegen DAT pand, niet de as-is-lijst.
 * `maatregelPrijzenEuro` (Tussenfase-taak D, 2026-09-04): per-maatregel prijsoverschrijving,
 * sleutel = kandidaat-sleutel. `.default({})` — deals van vóór deze taak kennen het veld nog
 * niet, en "geen overschrijvingen" is exact wat dat toen betekende.
 *
 * `kamerBewerkt` (2026-09-05, uniforme scenario-vorm): `.default(true)`, niet `false` — vóór deze
 * datum was 'handmatig' het ENIGE pad met een `pand`-veld, en betekende dus per definitie altijd
 * een echte kamerbewerking; een ontbrekend veld op oudere data moet dus als "wél bewerkt" gelden. */
const ScenarioSelectieHandmatig = z.object({
  soort: z.literal('handmatig'),
  naam: z.string().min(1),
  pand: PandInvoer,
  kamerBewerkt: z.boolean().default(true),
  sleutels: z.array(z.string().min(1)),
  handmatigeInvesteringEuro: z.number(),
  maatregelPrijzenEuro: z.record(z.string(), z.number()).default({}),
});

/** Een energielabel-scenario (Tussenfase-taak C, 2026-09-04): geen losse maatregelen, alleen een
 * doellabel — de kosten komen bij het laden opnieuw uit het pand-veld voor dát label, niet uit
 * een opgeslagen bedrag (zo blijft één plek de bron van waarheid voor de kosteninschatting). */
const ScenarioSelectieEnergielabel = z.object({
  soort: z.literal('energielabel'),
  naam: z.string().min(1),
  doelLabel: Energielabel,
});

/** Plain union (niet discriminatedUnion): `soort` heeft een default op de kandidaten-tak, en
 * discriminatedUnion staat dat niet overal betrouwbaar toe. `pand` disambigueert de twee takken
 * al voldoende. */
export const ScenarioSelectie = z.union([ScenarioSelectieHandmatig, ScenarioSelectieEnergielabel, ScenarioSelectieKandidaten]);
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
  /** Backlog (2026-09-04): vrije notitie + persoonlijke ordening (map). `.default('')` als extra
   * vangnet naast de DB-default (`supabase/migrations/0003_deals_notitie_map.sql`) — deze
   * migratie is handmatig te draaien, dus een omgeving die 'm nog niet draaide mag niet
   * onnodig hard falen. */
  notitie: z.string().default(''),
  map: z.string().default(''),
});

/** App-facing vorm (camelCase, met de PandInvoer al gevalideerd en het versiestempel gebundeld
 * zoals de rest van de engine hem kent — zie `packages/engine/src/versiestempel.ts`). */
export interface Deal {
  id: string;
  naam: string;
  /** Vrije notitie bij deze deal, zichtbaar in het deals-overzicht (backlog 2026-09-04). Lege
   * string = geen notitie, nooit `null` — de rest van de app hoeft dat onderscheid niet te maken. */
  notitie: string;
  /** Persoonlijke ordening: hoogstens één map per deal, vrije tekst (backlog 2026-09-04). Lege
   * string = geen map. */
  map: string;
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
    notitie: rij.notitie,
    map: rij.map,
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
