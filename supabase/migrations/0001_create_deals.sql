-- Taak 15: deals opslaan en laden met versiestempel.
--
-- Handmatig te runnen in de Supabase SQL-editor (project heeft nog geen CLI-link/migratie-
-- historie — zie outputs/RAPPORT_taak15_2026-08-20.md voor de afweging). Bij taak 17 wordt dit
-- bestand het startpunt voor een echte `supabase db push`-migratiegeschiedenis.
--
-- Harde regel 3: org_id vanaf regel één, ook nu er nog maar één organisatie is (er is nog geen
-- auth — taak 17 — dus de app gebruikt tot dan een vaste placeholder-org_id, zie
-- apps/web/src/lib/deals/org.ts).
-- Harde regel 5: geen persoonsgegevens — pand_invoer bevat alleen objectgegevens (adres, ruimten,
-- kamertoewijzing), nooit huurdernamen of contracten.
-- Harde regel 6: elke rij draagt het volledige versiestempel (tarieven-peildatum,
-- kostencatalogus-versie, registry-versie, engine-versie) waarmee hij is doorgerekend.

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  naam text not null,

  -- Volledige invoer-snapshot: de complete PandInvoer (Zod-gevalideerd door de app vóór opslag,
  -- hier bewust als jsonb zonder kolom-per-veld — het datamodel leeft in packages/engine, niet
  -- in het databaseschema).
  pand_invoer jsonb not null,

  -- De handmatig aan-/uitgevinkte maatregelen per scenario-slot uit taak 14 (ten hoogste 3):
  -- [{ "naam": "Scenario 1", "sleutels": ["K-03#keuken:7", ...] }, ...]. Bewust GEEN opgeslagen
  -- Pakket-resultaat (investering/huurwinst/etc.) — dat blijft afgeleide data, altijd opnieuw
  -- berekend uit pand_invoer + het versiestempel, nooit uit de database gelezen.
  scenarios jsonb not null default '[]'::jsonb,

  tarievenset_peildatum text not null,
  kostencatalogus_versie text not null,
  registry_versie text not null,
  engine_versie text not null,

  aangemaakt timestamptz not null default now(),
  bijgewerkt timestamptz not null default now()
);

create index if not exists deals_org_id_idx on deals (org_id);
create index if not exists deals_bijgewerkt_idx on deals (bijgewerkt desc);

-- RLS staat AAN, maar met een tijdelijk volledig open policy: er is nog geen Supabase Auth
-- (taak 17), dus er is nog geen `auth.jwt()`-claim om op te filteren. Bewust wél als expliciete,
-- leesbare policy neergezet (in plaats van RLS gewoon uit te laten staan) zodat taak 17 een
-- `drop policy` + een echte org_id-check is, niet een EERSTE keer nadenken over toegang.
--
-- LET OP: zolang deze policy actief is, kan iedereen met de (publieke) anon-key alle deals van
-- alle organisaties lezen én schrijven. Voor een gedeployde/publiek bereikbare app is dit een
-- bewuste, tijdelijke blootstelling — zie de risicomelding in outputs/RAPPORT_taak15_2026-08-20.md.
alter table deals enable row level security;

drop policy if exists "tijdelijk_open_tot_taak_17" on deals;
create policy "tijdelijk_open_tot_taak_17"
  on deals
  for all
  to anon, authenticated
  using (true)
  with check (true);
