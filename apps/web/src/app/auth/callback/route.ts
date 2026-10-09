import { NextResponse, type NextRequest } from 'next/server';
import { maakServerClient } from '../../../lib/supabase/server';

const STANDAARD = '/woningen';

/**
 * Alleen een pad binnen de app: begint met precies één "/". Review 2026-10-09: met
 * `${origin}${volgende}` was `@evil.com` of `//evil.com` een open redirect — met open inschrijving
 * kan iedereen zo'n link laten mailen vanaf `puntum.nl`.
 */
function veiligDoel(volgende: string | null, origin: string): URL {
  const standaard = new URL(STANDAARD, origin);
  if (!volgende || !volgende.startsWith('/')) return standaard;
  try {
    // Pas na het parsen controleren: de URL-parser haalt o.a. tabs en regeleinden weg, waardoor
    // "/<tab>/evil.com" alsnog "//evil.com" wordt.
    const doel = new URL(volgende, origin);
    return doel.origin === origin ? doel : standaard;
  } catch {
    return standaard;
  }
}

/**
 * Taak 17: wisselt de code uit de magic-linkmail om voor een sessie (PKCE-flow) en zet die als
 * cookie via de server-client. `volgende` komt mee vanaf /login (waar de gebruiker vandaan kwam
 * toen de proxy 'm naar /login stuurde), met een fallback naar /woningen.
 *
 * Open inschrijving (B5, 2026-10-09): met `nieuwsbrief=1` (vinkje op de loginpagina) wordt hier de
 * toestemming vastgelegd — pas nu, met een geldige sessie, dus nadat de eigenaar van het adres op de
 * link klikte. Lukt dat niet, dan gaat inloggen door met een melding (CLAUDE.md: nooit stil).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const doel = veiligDoel(searchParams.get('volgende'), origin);

  if (code) {
    const supabase = await maakServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (searchParams.get('nieuwsbrief') === '1') {
        const { error: toestemmingFout } = await supabase.rpc('geef_nieuwsbrief_toestemming');
        if (toestemmingFout) {
          doel.searchParams.set('melding', 'nieuwsbrief-mislukt');
          return NextResponse.redirect(doel.toString());
        }
      }
      return NextResponse.redirect(doel.toString());
    }
  }

  return NextResponse.redirect(`${origin}/login?fout=magic-link-mislukt`);
}
