import { supabase } from '../supabase/client';
import type { EigenProfiel } from './types';

export type { EigenProfiel } from './types';
export { magDealBewerken } from './types';

/**
 * `null` zonder ingelogde sessie (dezelfde auth-gating als `Footer`/`FeedbackKnop`) of als het
 * e-mailadres nog niet op de allowlist staat — beide gevallen zijn voor de aanroeper identiek aan
 * "geen bijzondere rechten, gewone org-scoping geldt", dus geen aparte foutafhandeling nodig. De
 * bestaande `eigen_rij_lezen`-policy (0002_auth_allowlist.sql) staat een ingelogde gebruiker al
 * toe zijn eigen rij te lezen; dit is puur een client-side gemak eromheen, geen nieuwe toegang.
 */
export async function haalEigenProfielOp(): Promise<EigenProfiel | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  if (!email) return null;

  const { data, error } = await supabase
    .from('allowed_emails')
    .select('org_id, is_eigenaar, features')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Profiel ophalen mislukt: ${error.message}`);
  if (!data) return null;

  return {
    email,
    orgId: data.org_id as string,
    isEigenaar: data.is_eigenaar as boolean,
    features: (data.features as string[]) ?? [],
  };
}
