import { NextResponse, type NextRequest } from 'next/server';
import { maakServerClient } from '../../../lib/supabase/server';

/**
 * Taak 17: wisselt de code uit de magic-linkmail om voor een sessie (PKCE-flow) en zet die als
 * cookie via de server-client. `volgende` komt mee vanaf /login (waar de gebruiker vandaan kwam
 * toen de middleware 'm naar /login stuurde), met een fallback naar /woningen.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const volgende = searchParams.get('volgende') ?? '/woningen';

  if (code) {
    const supabase = await maakServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${volgende}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?fout=magic-link-mislukt`);
}
