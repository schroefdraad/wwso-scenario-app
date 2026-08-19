# Rapport: Taak 1 — Repo opzetten — 2026-08-19

## Wat er gedaan is
- pnpm geactiveerd via corepack (v9.15.9), git-repo geïnitialiseerd (was nog geen repo)
- Monorepo opgezet met pnpm workspaces: `apps/*`, `packages/*`
- `apps/web`: Next.js 16.3.1 (App Router, TypeScript strict, src-dir, ESLint) via `create-next-app`, pakketnaam `@wwso/web`
- `packages/engine` en `packages/data`: lege TS-packages (`@wwso/engine`, `@wwso/data`) met eigen `tsconfig.json` (strict) en een placeholder `src/index.ts`
- Vitest op rootniveau (`vitest.config.ts`), dekt `packages/**` en `apps/**`, met `passWithNoTests: true` zodat nul tests geen falende run geeft
- ESLint + Prettier op rootniveau voor `packages/*` (typescript-eslint flat config); `apps/web` gebruikt zijn eigen `eslint-config-next`
- Supabase-client (`apps/web/src/lib/supabase.ts`) met env-vars uit `.env.local` (niet gecommit, staat al in `.gitignore`)
- Verificatiescript `apps/web/scripts/verify-supabase.mjs` — rechtstreekse fetch naar de PostgREST-API (niet via `@supabase/supabase-js` in Node, want die vereist Node 22+ voor de ingebouwde WebSocket die de Realtime-client aanroept)

## Bestanden gewijzigd
- Nieuw: `pnpm-workspace.yaml`, `package.json` (root), `.prettierrc.json`, `vitest.config.ts`, `eslint.config.mjs` (root)
- Nieuw: `apps/web/**` (volledige Next.js-scaffold), `apps/web/src/lib/supabase.ts`, `apps/web/scripts/verify-supabase.mjs`, `apps/web/.env.local` (niet gecommit)
- Nieuw: `packages/engine/**`, `packages/data/**`
- Git: repo geïnitialiseerd, nog geen eerste commit (volgt na dit rapport)

## Problemen / aandachtspunten
- **Next.js 16.3.1** is geïnstalleerd — nieuwer dan mijn trainingsdata. `create-next-app` genereert automatisch een `apps/web/AGENTS.md` met een waarschuwing hierover; ik heb de relevante docs (`node_modules/next/dist/docs/`) geraadpleegd voordat ik env-var-gerelateerde code schreef. Geen breaking changes gevonden die taak 1 raken.
- **Node 20** kan de `@supabase/supabase-js`-client niet in een los Node-script gebruiken (geen ingebouwde WebSocket, nodig voor de Realtime-laag die altijd meegeïnitialiseerd wordt). In de browser is dit geen probleem. Voor het verificatiescript is in plaats daarvan een directe `fetch` naar de REST-API gebruikt. Overweeg later Node 22 als de Realtime-functionaliteit van Supabase nodig wordt.
- De publishable key (`sb_publishable_...`) is het nieuwe Supabase-sleuteltype, functioneel gelijk aan de oude anon-key voor client-side gebruik.
- `apps/web/.env.local` bevat de Supabase-credentials in platte tekst — staat in `.gitignore`, wordt dus niet gecommit.

## Verificatie (hoe te testen)
- `pnpm test` → "No test files found, exiting with code 0" (nul tests, groen zoals gespecificeerd)
- `pnpm lint` → schoon, geen fouten
- `npx tsc --noEmit` in `packages/engine` en `packages/data` → geen fouten
- `pnpm dev` → server start, `http://localhost:3000` geeft HTTP 200, `.env.local` wordt geladen
- `node apps/web/scripts/verify-supabase.mjs` → `Verbinding OK — Supabase antwoordde met status 404 Not Found` met de verwachte PostgREST-foutcode `PGRST205` (probe-tabel bestaat niet) — bevestigt dat URL en key geldig zijn en de request de Postgres-laag bereikt

## Volgende stap
Taak 2: Datamodel (Pand, Ruimte, kamertoewijzing, handmatige posten) in TypeScript + Zod, gebaseerd op tab `Invoer` van `resources/wwso.xlsx`.
