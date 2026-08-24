import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL of NEXT_PUBLIC_SUPABASE_ANON_KEY ontbreekt in .env.local');
}

/**
 * Browser-client voor client components (taak 17). Gebruikt cookies i.p.v. localStorage voor de
 * sessie, zodat de sessie ook zichtbaar is voor `middleware.ts` en server-side route handlers
 * (`@supabase/ssr`-patroon voor de Next.js App Router).
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
