-- Vóór taak 18 — bèta-gereedheid (2026-09-13/20): feedbackknop in de app.
--
-- Handmatig te draaien in de Supabase SQL-editor, zelfde patroon als 0001-0003 (project heeft
-- nog geen CLI-link/migratiegeschiedenis).
--
-- Ontwerp: append-only (geen update/delete-policy — feedback wijzig je niet achteraf, je voegt
-- een nieuwe rij toe). org_id vult zichzelf via huidige_org_id() (0002_auth_allowlist.sql),
-- zelfde patroon als deals.org_id.
--
-- Bewuste uitzondering op "geen persoonsgegevens" (zie "Vastgelegde beslissingen" in STATUS.md):
-- e-mailadres wordt bewaard, anders is feedback niet opvolgbaar bij 2-3 gebruikers. Vastgelegd
-- als expliciete uitzondering, niet stilzwijgend.
--
-- LET OP voor een latere multi-tenant-scheiding (zie STATUS.md, "Openstaande beslissingen"):
-- de leespolicy hieronder scoped op de EIGEN org, net als bij deals — zodra org_id's per
-- gebruiker uit elkaar getrokken worden, kan de app-eigenaar feedback van andere org's dan niet
-- meer via deze policy lezen. Voorlopig géén probleem: alle huidige gebruikers delen dezelfde org.

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default huidige_org_id(),

  email text not null,
  url text not null,
  user_agent text not null default '',
  -- Laatste N console-fouten/onafgehandelde JS-errors vóór het versturen (zie
  -- apps/web/src/lib/feedback/consoleBuffer.ts) — geeft directe reproductiecontext zonder dat de
  -- melder zelf iets hoeft te kopiëren.
  console_log jsonb not null default '[]'::jsonb,
  bericht text not null,

  aangemaakt timestamptz not null default now()
);

create index if not exists feedback_org_id_idx on feedback (org_id);
create index if not exists feedback_aangemaakt_idx on feedback (aangemaakt desc);

alter table feedback enable row level security;

drop policy if exists "leden_aanmaken_eigen_org" on feedback;
create policy "leden_aanmaken_eigen_org"
  on feedback
  for insert
  to authenticated
  with check (org_id = huidige_org_id());

drop policy if exists "leden_lezen_eigen_org" on feedback;
create policy "leden_lezen_eigen_org"
  on feedback
  for select
  to authenticated
  using (org_id = huidige_org_id());
