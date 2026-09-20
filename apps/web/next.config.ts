import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // @wwso/engine en @wwso/data zijn workspace-packages die hun eigen TS-broncode direct
  // exporteren (package.json "main"/"types" wijzen naar src/index.ts, geen build-stap).
  // Zonder transpilePackages behandelt Next.js ze als externe, al-gecompileerde node_modules
  // en faalt de resolutie van hun (geneste) `export *`-barrels in de client-/SSR-bundel.
  transpilePackages: ['@wwso/engine', '@wwso/data'],
  // Woning/Woningen-hernoeming (2026-09-04): oude gedeelde/bewaarde links naar /deals en
  // /pand/... moeten blijven werken, inclusief hun querystring (bijv. ?deal=<id>).
  async redirects() {
    return [
      { source: '/deals', destination: '/woningen', permanent: true },
      { source: '/pand/:pad*', destination: '/woning/:pad*', permanent: true },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "skael-2z",
  project: "sentry-fuchsia-globe",
  // Alleen sourcemap-upload tijdens CI, niet bij lokale builds.
  silent: !process.env.CI,
  // Groter deel van de clientbundel als bronbestand uploaden voor leesbare stacktraces.
  widenClientFileUpload: true,
});
