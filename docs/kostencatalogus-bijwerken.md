# Kostencatalogus bijwerken

De optimalisatie-maatregelen en hun kosten komen uit `resources/Kostenkentallen_WWSO_optimalisatie.xlsx`
(tabblad "Maatregelen", plus "Aannames" en "Toelichting" voor het versienummer). Dat bestand wordt
nooit rechtstreeks door de app gelezen — alleen via een importscript dat er een versiedataset van maakt.

1. Bewerk `resources/Kostenkentallen_WWSO_optimalisatie.xlsx` (zelfde bestandsnaam en locatie laten staan).
2. Hoog op tabblad "Toelichting" de regel "Versie X.Y — ..." op als oude, al opgeslagen deals
   reproduceerbaar moeten blijven met de oude cijfers; laat de versie gelijk als je alleen een foutje
   herstelt (dan overschrijft de import gewoon dezelfde versiemap).
3. Run lokaal: `pnpm --filter @wwso/data run import:kostenkentallen` — schrijft naar
   `packages/data/src/kostencatalogus/<versie>/kostencatalogus_<versie>.json`. Het script faalt hard
   (geen stille aannames) bij een onbekende rubriek/status of een ontbrekend veld.
4. Run `pnpm -w test` om te controleren dat er niets breekt.
5. Commit het nieuwe/gewijzigde JSON-bestand en deploy (`vercel` voor preview, `vercel --prod` voor
   productie) — de JSON wordt gebundeld in de app; zonder commit + deploy verandert er live niets.

Dit vereist vandaag een lokale devomgeving (Node/pnpm), git en Vercel-toegang — dus alleen door een
developer te doen, niet zelfstandig door een niet-technische gebruiker.

## Open vraag: zelfstandig bijwerken door een toekomstige derde gebruiker

Nog niet ontworpen of gebouwd — hangt samen met het al bestaande, bewust uitgestelde actiepunt in
`plan/plan.md` ("bepalen wie de externe gebruiker is en welke rol die krijgt"). Zodra dat helder is,
is de kernvraag hier: blijft de catalogus een in git meegeversieerde JSON (huidige aanpak, vereist
developer + deploy per wijziging), of verhuist hij naar een database (bijv. Postgres via de Vercel
Marketplace) met een eigen beheerscherm in de app? Dat laatste maakt zelfstandig bijwerken zonder
developer mogelijk, maar kost een aparte auth/rollen-laag (taak 17) en een migratie van de huidige
versiedataset-aanpak (harde regel 6: reproduceerbaarheid van een opgeslagen deal moet overeind
blijven). Aanbeveling: dit pas ontwerpen ná de bèta-livegang (inloggen aan op productie).

