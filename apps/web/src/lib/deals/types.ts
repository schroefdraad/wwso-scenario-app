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
 * PandInvoer; `sleutels` verwijst naar de kandidatenlijst tegen DAT pand (mét `energielabelDoel`
 * toegepast indien gezet), niet de as-is-lijst. `maatregelPrijzenEuro` (Tussenfase-taak D,
 * 2026-09-04): per-maatregel prijsoverschrijving, sleutel = kandidaat-sleutel. `.default({})` —
 * deals van vóór deze taak kennen het veld nog niet, en "geen overschrijvingen" is exact wat dat
 * toen betekende.
 *
 * `kamerBewerkt` (2026-09-05, uniforme scenario-vorm): `.default(true)`, niet `false` — vóór deze
 * datum was 'handmatig' het ENIGE pad met een `pand`-veld, en betekende dus per definitie altijd
 * een echte kamerbewerking; een ontbrekend veld op oudere data moet dus als "wél bewerkt" gelden.
 *
 * `energielabelDoel` (2026-09-07, feedback Emma Morrison: "ik kan helemaal niks meer als ik een
 * scenario selecteer, hij overschrijft ook mijn extra huuropbrengsten van extra gerealiseerde
 * kamers") — vóór deze datum sloot een energielabel-wisseling een handmatige kamerbewerking
 * volledig uit (apart, exclusief scenariotype, zie `ScenarioSelectieEnergielabel` hieronder); nu
 * een optioneel veld hier, dus vanaf nu bewaart elke nieuwe deal een eventuele labelwisseling
 * gewoon SAMEN met een eventueel bewerkt pand in dit ene scenariotype. `.optional()`: ontbreekt op
 * elke deal van vóór deze datum, wat toen altijd "geen labelwisseling" betekende. */
const ScenarioSelectieHandmatig = z.object({
  soort: z.literal('handmatig'),
  naam: z.string().min(1),
  pand: PandInvoer,
  kamerBewerkt: z.boolean().default(true),
  energielabelDoel: Energielabel.optional(),
  sleutels: z.array(z.string().min(1)),
  handmatigeInvesteringEuro: z.number(),
  maatregelPrijzenEuro: z.record(z.string(), z.number()).default({}),
});

/** Legacy: een energielabel-scenario zoals opgeslagen vóór 2026-09-07 — geen `pand`, alleen een
 * doellabel, exclusief van een handmatige kamerbewerking. Vanaf 2026-09-07 wordt dit type niet
 * meer NIEUW opgeslagen (zie `energielabelDoel` op `ScenarioSelectieHandmatig` hierboven); dit
 * blijft alleen bestaan om deals van vóór die datum nog te kunnen laden, gemigreerd naar de
 * uniforme vorm door `slotsUitScenarios` in `Vergelijking.tsx`. */
const ScenarioSelectieEnergielabel = z.object({
  soort: z.literal('energielabel'),
  naam: z.string().min(1),
  doelLabel: Energielabel,
  sleutels: z.array(z.string().min(1)).default([]),
  maatregelPrijzenEuro: z.record(z.string(), z.number()).default({}),
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
  /** Multi-tenant org-scheiding (2026-09-28, `0006_deals_demo_en_delen.sql`). `.default(false)`
   * als vangnet naast de DB-default, zelfde reden als hierboven: de migratie is handmatig
   * gedraaid, dus een omgeving die 'm nog niet draaide mag niet onnodig hard falen. */
  is_demo: z.boolean().default(false),
});

/** App-facing vorm (camelCase, met de PandInvoer al gevalideerd en het versiestempel gebundeld
 * zoals de rest van de engine hem kent — zie `packages/engine/src/versiestempel.ts`). */
export interface Deal {
  id: string;
  /** Multi-tenant org-scheiding (2026-09-28) — nodig om client-side te bepalen of deze woning van
   * de eigen org is (zie `lib/deals/profiel.ts`, `magDealBewerken`). Nooit gebruikt om zelf te
   * filteren wat zichtbaar is — dat doet RLS al, dit is puur UI-gedrag op wat al zichtbaar is. */
  orgId: string;
  /** De permanente voorbeeldwoning (2026-09-28) — zichtbaar in elke org, alleen door de eigenaar
   * bewerkbaar. Zie `magDealBewerken`. */
  isDemo: boolean;
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
/**
 * Het eigen profiel uit `allowed_emails` (multi-tenant org-scheiding, 2026-09-28 — zie
 * `outputs/RAPPORT_multi-tenant-architectuurplan_2026-09-28.md`). Het type staat hier (niet in
 * `lib/deals/profiel.ts`, waar de Supabase-ophaalfunctie zelf leeft) zodat dit bestand — en
 * `magDealBewerken` hieronder — geen module-level Supabase-clientinitialisatie meeslepen; die
 * gooit een harde fout zonder `.env.local` (zie `lib/supabase/client.ts`), wat een zuivere
 * unit-test van deze functie onnodig zou breken.
 */
export interface EigenProfiel {
  email: string;
  orgId: string;
  isEigenaar: boolean;
  features: string[];
}

/**
 * Mag deze gebruiker (`profiel`) de gegeven woning rechtstreeks bijwerken/verwijderen? Spiegelt
 * exact de `leden_bijwerken_eigen_org`/`leden_verwijderen_eigen_org`-policies uit
 * `0006_deals_demo_en_delen.sql`: eigen org + geen demo-rij, OF de eigenaar (die mag alles). Dit is
 * puur een UI-hint (welke knoppen/teksten tonen) — RLS blijft de daadwerkelijke afdwinging.
 */
export function magDealBewerken(deal: Pick<Deal, 'orgId' | 'isDemo'>, profiel: EigenProfiel | null): boolean {
  if (profiel?.isEigenaar) return true;
  if (!profiel) return false;
  return deal.orgId === profiel.orgId && !deal.isDemo;
}

export function parseDealRij(ruw: unknown): Deal {
  const rij = DealRij.parse(ruw);
  const pandInvoer = PandInvoer.parse(rij.pand_invoer);
  return {
    id: rij.id,
    orgId: rij.org_id,
    isDemo: rij.is_demo,
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
