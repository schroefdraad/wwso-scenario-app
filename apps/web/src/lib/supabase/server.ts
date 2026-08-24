import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt in .env.local');
}

/**
 * Server-client voor route handlers (taak 17) — o.a. `/auth/callback`, dat de magic-link code
 * omwisselt voor een sessie en die als cookie moet kunnen zetten. Nieuwe instantie per request
 * (i.t.t. de browser-client, die één singleton is): de cookie-store is request-gebonden.
 */
export async function maakServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
