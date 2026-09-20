// Initialiseert Sentry op de client (draait vóór React hydration).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Letterlijke DSN, zelfde reden als sentry.server.config.ts.
  dsn: "https://38df5a5d30d724d419e127594a2412c2@o4512117618376704.ingest.de.sentry.io/4512117629976656",
  // Bewust geen tracesSampleRate/replaysSampleRate: alleen foutregistratie, geen
  // performance/tracing of session replay (zie plan/plan.md, bèta-gereedheidstaak Sentry).
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
