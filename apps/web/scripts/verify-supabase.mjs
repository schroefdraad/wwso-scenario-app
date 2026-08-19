// Bevestigt dat de Supabase-connectie werkt door rechtstreeks de PostgREST-API te bevragen.
// Een geslaagd antwoord (ook een "tabel bestaat niet"-fout, PGRST205) betekent dat URL + key
// geldig zijn en de request de Postgres-laag bereikt. Alleen een netwerkfout of 401/403
// betekent dat de connectie faalt.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter((line) => line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FOUT: NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt in .env.local');
  process.exit(1);
}

const probeUrl = `${supabaseUrl}/rest/v1/__wwso_connection_probe__?select=*&limit=1`;

let response;
try {
  response = await fetch(probeUrl, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
  });
} catch (err) {
  console.error('FOUT: geen antwoord van Supabase (netwerkprobleem?)', err.message);
  process.exit(1);
}

if (response.status === 401 || response.status === 403) {
  console.error(`FOUT: Supabase wees de key af (status ${response.status}). Klopt de anon/publishable key?`);
  process.exit(1);
}

const body = await response.json().catch(() => null);
console.log(`Verbinding OK — Supabase antwoordde met status ${response.status} ${response.statusText}`);
if (body?.code) {
  console.log(`(verwachte fout, want probe-tabel bestaat niet: ${body.code} — ${body.message})`);
}
process.exit(0);
