// Wordt geladen door src/instrumentation.ts wanneer NEXT_RUNTIME === "nodejs".
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Letterlijke DSN i.p.v. process.env.NEXT_PUBLIC_SENTRY_DSN: die env var is nog niet
  // gegarandeerd geladen op het moment dat instrumentation.ts's register() draait (Turbopack-
  // timing). Een DSN is geen geheim (vandaar de NEXT_PUBLIC_-prefix), dus letterlijk opnemen is
  // de door Sentry zelf aanbevolen aanpak.
  dsn: "https://38df5a5d30d724d419e127594a2412c2@o4512117618376704.ingest.de.sentry.io/4512117629976656",
  // Bewust geen tracesSampleRate: alleen foutregistratie, geen performance/tracing (zie plan/plan.md).
});
