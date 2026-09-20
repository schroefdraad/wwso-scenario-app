// Wordt geladen door src/instrumentation.ts wanneer NEXT_RUNTIME === "edge"
// (middleware/edge routes; ook nodig bij lokaal draaien, los van de Vercel Edge Runtime).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Letterlijke DSN, zelfde reden als sentry.server.config.ts.
  dsn: "https://38df5a5d30d724d419e127594a2412c2@o4512117618376704.ingest.de.sentry.io/4512117629976656",
  // Bewust geen tracesSampleRate: alleen foutregistratie, geen performance/tracing (zie plan/plan.md).
});
