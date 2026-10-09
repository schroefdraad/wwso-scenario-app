# Puntum, site (puntum.nl)

Statische one-page site. Geen build, geen formulier, geen cookies, geen tracking, geen externe scripts.
Lettertype: systeemfont (de Inter-fontbestanden zitten niet in de repo, alleen de licentie).

## Lokaal bekijken

    cd apps/site && python3 -m http.server 8000   # http://localhost:8000

## Schakelaar voor de knop

Bovenin `app.js`:

    const APP_LIVE = false;   // false: "Bèta start binnenkort" (niet klikbaar)
                              // true:  "Naar de app", link naar https://app.puntum.nl

Zet op `true` na de productie-switch van de app, commit en deploy. Zonder JavaScript blijft de
knop in de "binnenkort"-stand.

## Deployen (door de eigenaar)

1. Vercel: nieuw project aan dezelfde Git-repo koppelen, **Root Directory** `apps/site`, Framework Preset
   "Other", geen build command, output directory leeg.
2. Domein `puntum.nl` (en eventueel `www`) aan dit project koppelen; DNS bij de registrar.
3. Productiebranch kiezen (de branch `site` moet eerst naar die branch gemerged zijn).
4. Controleer na deploy: pagina, afbeeldingen en `assets/og.png` (bijv. in een link-preview).

`vercel.json` zet alleen veiligheidsheaders (CSP staat alleen eigen bestanden toe).
