import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Taak 17: ververst de Supabase-sessiecookie op elk request en stuurt niet-ingelogde
 * gebruikers naar /login. Het `@supabase/ssr`-patroon voor Next.js Proxy (v16, hernoemd vanuit
 * "middleware" — zie `node_modules/next/dist/docs/.../proxy.md`) — een aparte client dan
 * `lib/supabase/server.ts`, omdat de cookie-API van `NextRequest`/`NextResponse` afwijkt van
 * `next/headers`.
 *
 * Inloggen zelf is open (iedereen kan een magic link aanvragen) — of een ingelogde gebruiker ook
 * daadwerkelijk data ziet, hangt af van `allowed_emails` via RLS (zie
 * supabase/migrations/0002_auth_allowlist.sql), niet van deze proxy.
 */
const PUBLIEKE_PADEN = ['/login', '/auth/callback'];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) supabaseResponse.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPubliekPad = PUBLIEKE_PADEN.some((pad) => request.nextUrl.pathname.startsWith(pad));

  if (!user && !isPubliekPad) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('volgende', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/deals';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
