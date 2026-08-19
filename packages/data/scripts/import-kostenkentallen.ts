/**
 * Herhaalbaar importscript voor `resources/Kostenkentallen_WWSO_optimalisatie.xlsx` (taak 10).
 *
 * Leest de xlsx uit `resources/` (nooit aanpassen, dat zijn de bronbestanden van de gebruiker)
 * en schrijft een versiedataset naar `packages/data/src/kostencatalogus/<versie>/`. Draaien:
 *
 *   pnpm --filter @wwso/data run import:kostenkentallen
 *
 * Herhaalbaar: een aangepast bedrag of status in de xlsx komt na opnieuw draaien terug in de
 * JSON. De versie komt uit tab `Toelichting` ("Versie X.Y — ...") — bij een nieuwe versie
 * schrijft dit script een NIEUWE map, net als bij de tarievensets (harde regel 6: een oude
 * dataset wordt nooit overschreven, zodat een opgeslagen deal reproduceerbaar blijft).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import XLSX from 'xlsx';
import { Kostencatalogus, Maatregel, MaatregelRubriek, MaatregelStatus } from '../src/kostencatalogus/types.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const XLSX_PAD = path.join(HIER, '../../../resources/Kostenkentallen_WWSO_optimalisatie.xlsx');
const UITVOER_ROOT = path.join(HIER, '../src/kostencatalogus');

function faal(reden: string): never {
  throw new Error(`Import van Kostenkentallen_WWSO_optimalisatie.xlsx mislukt: ${reden}`);
}

/** Zoekt de rij waar kolom A gelijk is aan `zoek` — de eerste échte headerrij, ongeacht hoeveel titelregels ervoor staan. */
function vindHeaderRijIndex(ws: XLSX.WorkSheet, zoek: string): number {
  const rijen = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const index = rijen.findIndex((rij) => rij[0] === zoek);
  if (index === -1) faal(`kon de headerrij met '${zoek}' in kolom A niet vinden.`);
  return index;
}

function leesVersie(wb: XLSX.WorkBook): string {
  const ws = wb.Sheets['Toelichting'];
  if (!ws) faal("tab 'Toelichting' ontbreekt.");
  const rijen = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const versieRegel = rijen.map((r) => String(r[0] ?? '')).find((r) => r.startsWith('Versie '));
  if (!versieRegel) faal("geen regel gevonden die begint met 'Versie ' op tab Toelichting.");
  const match = /^Versie\s+([\d.]+)/.exec(versieRegel);
  if (!match) faal(`kon geen versienummer uit '${versieRegel}' halen.`);
  return match[1];
}

const AANNAMES_PARAMETERS = {
  'Regio-index': 'regioIndex',
  'Btw-tarief bouw (regulier)': 'btwTariefBouwRegulier',
  'Btw-tarief renovatie arbeid': 'btwTariefRenovatieArbeid',
  Prijspeil: 'prijspeilJaar',
  'Indexatie bouwkosten p/j': 'indexatieBouwkostenPerJaar',
  'Standaard plafondhoogte': 'standaardPlafondhoogteM',
  'Huurderving per kamer p/mnd': 'huurdervingPerKamerPerMaandEuro',
} as const;

function leesAannames(wb: XLSX.WorkBook): Record<string, number> {
  const ws = wb.Sheets['Aannames'];
  if (!ws) faal("tab 'Aannames' ontbreekt.");
  const headerIndex = vindHeaderRijIndex(ws, 'Parameter');
  const rijen = XLSX.utils.sheet_to_json<{ Parameter?: string; Waarde?: number }>(ws, { range: headerIndex });

  const gevonden: Record<string, number> = {};
  for (const rij of rijen) {
    if (!rij.Parameter || !(rij.Parameter in AANNAMES_PARAMETERS)) continue;
    const veld = AANNAMES_PARAMETERS[rij.Parameter as keyof typeof AANNAMES_PARAMETERS];
    if (typeof rij.Waarde !== 'number') faal(`parameter '${rij.Parameter}' heeft geen numerieke waarde.`);
    gevonden[veld] = rij.Waarde;
  }

  const ontbrekend = Object.values(AANNAMES_PARAMETERS).filter((veld) => !(veld in gevonden));
  if (ontbrekend.length > 0) faal(`de volgende aannames ontbreken op tab Aannames: ${ontbrekend.join(', ')}.`);

  return gevonden;
}

interface RuweMaatregelRij {
  id?: string;
  Rubriek?: string;
  Categorie?: string;
  Maatregel?: string;
  Eenheid?: string;
  'Kosten min (€)'?: number;
  'Kosten verwacht (€)'?: number;
  'Kosten max (€)'?: number;
  'Effect op puntentelling'?: string;
  'Punten-indicatie'?: string;
  'Vergunning / melding'?: string;
  Doorlooptijd?: string;
  Bron?: string;
  Status?: string;
  'Laatst bijgewerkt'?: string;
}

function leesMaatregelen(wb: XLSX.WorkBook): Maatregel[] {
  const ws = wb.Sheets['Maatregelen'];
  if (!ws) faal("tab 'Maatregelen' ontbreekt.");
  const headerIndex = vindHeaderRijIndex(ws, 'id');
  const rijen = XLSX.utils.sheet_to_json<RuweMaatregelRij>(ws, { range: headerIndex });

  const maatregelen: Maatregel[] = [];
  const geziennIds = new Set<string>();

  for (const rij of rijen) {
    // Voetregels ("Aantal maatregelen...", disclaimer) hebben geen id — dat is het filter.
    if (!rij.id) continue;

    if (geziennIds.has(rij.id)) faal(`dubbel id '${rij.id}' in tab Maatregelen.`);
    geziennIds.add(rij.id);

    const rubriekResultaat = MaatregelRubriek.safeParse(rij.Rubriek);
    if (!rubriekResultaat.success) {
      faal(`maatregel ${rij.id} heeft een onbekende rubriek '${rij.Rubriek}' — voeg die toe aan MaatregelRubriek in types.ts als dit geen typefout is.`);
    }
    const statusResultaat = MaatregelStatus.safeParse(rij.Status);
    if (!statusResultaat.success) {
      faal(`maatregel ${rij.id} heeft een onbekende status '${rij.Status}'.`);
    }

    maatregelen.push({
      id: rij.id,
      rubriek: rubriekResultaat.data,
      categorie: rij.Categorie ?? faal(`maatregel ${rij.id} mist een categorie.`),
      maatregel: rij.Maatregel ?? faal(`maatregel ${rij.id} mist een omschrijving.`),
      eenheid: rij.Eenheid ?? faal(`maatregel ${rij.id} mist een eenheid.`),
      kostenMinEuro: rij['Kosten min (€)'] ?? faal(`maatregel ${rij.id} mist 'Kosten min'.`),
      kostenVerwachtEuro: rij['Kosten verwacht (€)'] ?? faal(`maatregel ${rij.id} mist 'Kosten verwacht'.`),
      kostenMaxEuro: rij['Kosten max (€)'] ?? faal(`maatregel ${rij.id} mist 'Kosten max'.`),
      effectOpPuntentelling: rij['Effect op puntentelling'] ?? '',
      puntenIndicatie: rij['Punten-indicatie'] ?? '',
      vergunningOfMelding: rij['Vergunning / melding'] ?? '',
      doorlooptijd: rij['Doorlooptijd'] ?? '',
      bron: rij['Bron'] ?? '',
      status: statusResultaat.data,
      laatstBijgewerkt: rij['Laatst bijgewerkt'] ?? faal(`maatregel ${rij.id} mist 'Laatst bijgewerkt'.`),
    });
  }

  if (maatregelen.length === 0) faal('geen enkele maatregel gevonden — klopt de kolomindeling nog?');
  return maatregelen;
}

function main() {
  const wb = XLSX.readFile(XLSX_PAD);
  const versie = leesVersie(wb);
  const aannames = leesAannames(wb);
  const maatregelen = leesMaatregelen(wb);

  const catalogus = Kostencatalogus.parse({ versie, aannames, maatregelen });

  const map = path.join(UITVOER_ROOT, versie);
  mkdirSync(map, { recursive: true });
  const bestand = path.join(map, `kostencatalogus_${versie}.json`);
  writeFileSync(bestand, JSON.stringify(catalogus, null, 2) + '\n', 'utf-8');

  console.log(`Kostencatalogus versie ${versie} geschreven: ${maatregelen.length} maatregelen → ${bestand}`);
}

main();
