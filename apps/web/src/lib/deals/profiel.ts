import { supabase } from '../supabase/client';
import { ANONIEM, type Toegang } from './types';

export type { EigenProfiel, Toegang } from './types';
export { magDealBewerken, profielVan } from './types';

/**
 * `null` zonder ingelogde sessie (dezelfde auth-gating als `Footer`/`FeedbackKnop`) of als het
 * e-mailadres nog niet op de allowlist staat — beide gevallen zijn voor de aanroeper identiek aan
 * "geen bijzondere rechten, gewone org-scoping geldt", dus geen aparte foutafhandeling nodig. De
 * bestaande `eigen_rij_lezen`-policy (0002_auth_allowlist.sql) staat een ingelogde gebruiker al
 * toe zijn eigen rij te lezen; dit is puur een client-side gemak eromheen, geen nieuwe toegang.
 *
 * Eén automatische retry bij een fout (2026-10-02, gevonden tijdens het testen: een tijdelijke
 * hapering hier — bijv. vlak na inloggen, vóórdat de sessie volledig gehydrateerd is — werd door
 * `app/woning/nieuw/page.tsx`'s `.catch(() => null)` identiek behandeld als "geen bewerkrechten",
 * waarna `Topbar.tsx` stilzwijgend een nieuwe kopie van de woning aanmaakte i.p.v. de bestaande
 * bij te werken. Eén keer opnieuw proberen dekt het overgrote deel van zulke transiënte gevallen af
 * — bij een écht structurele fout (RLS, netwerk down) gooit de tweede poging alsnog, en blijft de
 * aanroeper verantwoordelijk voor het nooit-stilzwijgend-forken (zie `Topbar.tsx`).
 */
export async function haalEigenProfielOp(): Promise<Toegang> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  // Geen sessie = anoniem (tijdelijk, zie `ANONIEM` in types.ts) — niet hetzelfde als "ingelogd
  // maar niet op de allowlist" (`null` hieronder).
  if (!email) return ANONIEM;

  let laatsteFout: Error | undefined;
  for (let poging = 1; poging <= 2; poging++) {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('org_id, is_eigenaar, features')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (!error) {
      if (!data) return null;
      return {
        email,
        orgId: data.org_id as string,
        isEigenaar: data.is_eigenaar as boolean,
        features: (data.features as string[]) ?? [],
      };
    }
    laatsteFout = new Error(`Profiel ophalen mislukt: ${error.message}`);
  }
  throw laatsteFout;
}
