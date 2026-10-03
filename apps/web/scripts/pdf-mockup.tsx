/**
 * Eenmalig hulpscript om PDF-mockups te genereren buiten de browser om, voor visuele review
 * (2026-09-12, herontwerp PuntenrapportDocument.tsx). Draaien:
 *
 *   npx tsx apps/web/scripts/pdf-mockup.tsx
 *
 * Niet onderdeel van de productie-app — puur een renderscript voor `PuntenrapportDocument` met
 * de bestaande `testpand6Kamers`-fixture, in beide stijlvarianten.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderToFile } from '@react-pdf/renderer';
import { berekenEindtelling, testpand6Kamers, voerControlesUit } from '@wwso/engine';
import { getTarievenset } from '@wwso/data';
import { PuntenrapportDocument } from '../src/lib/pdf/PuntenrapportDocument';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const UITVOER = path.join(HIER, '../../../outputs/pdf-mockups');

async function main() {
  mkdirSync(UITVOER, { recursive: true });

  const peildatum = '2026-01-01';
  const tarievenset = getTarievenset(peildatum);
  const pand = testpand6Kamers;
  const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
  const controles = voerControlesUit(pand);

  for (const stijlVariant of ['licht', 'band'] as const) {
    const bestand = path.join(UITVOER, `puntenrapport-mockup-${stijlVariant}.pdf`);
    await renderToFile(
      <PuntenrapportDocument pand={pand} eindtelling={eindtelling} controles={controles} tarievensetPeildatum={peildatum} stijlVariant={stijlVariant} />,
      bestand,
    );
    console.log('geschreven:', bestand);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
