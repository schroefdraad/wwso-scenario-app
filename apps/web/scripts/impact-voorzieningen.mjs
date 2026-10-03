// Eenmalige, read-only impactanalyse (2026-10-03): welke opgeslagen woningen hebben een keuken of
// sanitaire voorziening in een ruimte waar het beleid dat niet waardeert (buitenruimte,
// verkeersruimte, parkeerplek)? Draaien vanuit apps/web: `node scripts/impact-voorzieningen.mjs`.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((r) => r.includes('=') && !r.startsWith('#'))
    .map((r) => {
      const i = r.indexOf('=');
      return [r.slice(0, i).trim(), r.slice(i + 1).trim().replace(/^"|"$/g, '')];
    }),
);
const NIET_TOEGESTAAN = new Set(['Verkeersruimte', 'Buitenruimte privé', 'Buitenruimte gemeenschappelijk', 'Parkeerplek gemeenschappelijk']);

function vondsten(pand, context) {
  const typeBijNr = new Map(pand.ruimtes.map((r) => [r.nr, r]));
  const uit = [];
  for (const [soort, lijst] of [['keuken', pand.keukens ?? []], ['sanitair', pand.sanitair ?? []]]) {
    for (const v of lijst) {
      const r = typeBijNr.get(v.ruimteNr);
      if (r && NIET_TOEGESTAAN.has(r.type)) uit.push(`${context}: ${soort} in ruimte ${r.nr} "${r.naam}" (${r.type})`);
    }
  }
  return uit;
}

// Rechtstreeks via PostgREST: de supabase-js-client vereist Node 22+ (native WebSocket).
const antwoord = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/deals?select=id,naam,pand_invoer,scenarios`, {
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
});
if (!antwoord.ok) throw new Error(`${antwoord.status} ${await antwoord.text()}`);
const data = await antwoord.json();
let geraakt = 0;
for (const d of data) {
  const regels = [...vondsten(d.pand_invoer, 'as-is')];
  for (const s of d.scenarios ?? []) if (s.pand) regels.push(...vondsten(s.pand, `scenario "${s.naam}"`));
  if (regels.length) {
    geraakt++;
    console.log(`\n${d.naam} (${d.id})`);
    for (const r of regels) console.log('  - ' + r);
  }
}
console.log(`\n${data.length} woningen bekeken, ${geraakt} geraakt.`);
