import type { NextConfig } from "next";

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

export default nextConfig;
