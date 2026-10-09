import { haalGegevensOp, parseOphaalVerzoek, type OphaalAntwoord } from '../../../lib/invoer/gegevensOphalenServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
/** Drie opeenvolgende externe stappen met elk een eigen time-out (zie `gegevensOphalenServer.ts`). */
export const maxDuration = 30;

/** Daglimiet per org (open inschrijving, plan B5, 2026-10-09). Telling in `registreer_ophaalactie`. */
const DAGLIMIET_OPHALEN = 50;

type ServerClient = Awaited<ReturnType<typeof import('../../../lib/supabase/server').maakServerClient>>;

/**
 * Is de aanvrager ingelogd? Zelfde schakelaar als `proxy.ts`: alleen `AUTH_VEREIST=false` zet de
 * controle uit (lokaal, en op de omgevingen waar inloggen bewust uit staat). Ontbreekt de variabele
 * dan geldt "ingelogd vereist" — een vergeten instelling opent de route nooit stilzwijgend.
 * Gelezen per request (niet bij het laden van de module) zodat dit testbaar is. Een fout bij het
 * controleren van de sessie telt als "niet ingelogd" (fail closed).
 *
 * Uitkomst: 'open' (inloggen uit, geen sessie en dus geen teller), de Supabase-client van de
 * ingelogde gebruiker, of null (niet ingelogd).
 */
async function aanvrager(): Promise<'open' | ServerClient | null> {
  if (process.env.AUTH_VEREIST === 'false') return 'open';
  try {
    const { maakServerClient } = await import('../../../lib/supabase/server');
    const supabase = await maakServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? supabase : null;
  } catch {
    return null;
  }
}

/**
 * Registreert de ophaalactie voor de org van de gebruiker en geeft een foutantwoord als dat niet
 * mag. Fail closed: is de teller onbereikbaar (bijv. migratie 0008 nog niet gedraaid), dan niet
 * ophalen.
 */
async function controleerDaglimiet(supabase: ServerClient): Promise<Response | null> {
  try {
    const { data, error } = await supabase.rpc('registreer_ophaalactie', { p_limiet: DAGLIMIET_OPHALEN });
    if (!error && data === 'ok') return null;
    if (!error && data === 'limiet') {
      return Response.json(
        {
          status: 'fout',
          code: 'daglimiet',
          bericht: `Je hebt in de afgelopen 24 uur ${DAGLIMIET_OPHALEN} keer gegevens opgehaald, het maximum.`,
        },
        { status: 429 },
      );
    }
    if (!error && data === 'geen_org') {
      return Response.json({ status: 'fout', bericht: 'Je account is nog niet compleet. Log opnieuw in.' }, { status: 403 });
    }
  } catch {
    // valt door naar 503
  }
  return Response.json({ status: 'fout', bericht: 'Gegevens ophalen is tijdelijk niet beschikbaar.' }, { status: 503 });
}

/**
 * "Gegevens ophalen" (Woning ①): zoekt een adres op in de openbare registers (PDOK, BAG, WOZ-loket)
 * en geeft bouwjaar, WOZ-waarde, gebruiksoppervlakte en gemeente terug. Server-side omdat het
 * WOZ-loket geen CORS toestaat. Geen open proxy: vaste hosts, streng gevalideerde invoer, en alleen
 * voor een ingelogde gebruiker (behalve waar inloggen bewust uit staat).
 */
export async function POST(request: Request) {
  // Op productie staat inloggen uit (`AUTH_VEREIST=false`): dan zou deze route een open doorgeefluik
  // naar PDOK/BAG/het WOZ-loket zijn. Bewust uitgeschakeld tot inloggen aan staat (CLAUDE.md:
  // bouw voor de omgeving zoals die nu is). Lokaal en op preview/test (VERCEL_ENV != production)
  // blijft hij werken. Met inloggen aan geldt een daglimiet per org (teller in de database, 0008).
  if (process.env.AUTH_VEREIST === 'false' && process.env.VERCEL_ENV === 'production') {
    return Response.json(
      { status: 'fout', code: 'niet_beschikbaar', bericht: 'Gegevens ophalen is nog niet beschikbaar. Vul de gegevens zelf in.' },
      { status: 503 },
    );
  }
  const wie = await aanvrager();
  if (!wie) return Response.json({ status: 'fout', bericht: 'Je bent niet ingelogd.' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: 'fout', bericht: 'Ongeldige aanvraag.' }, { status: 400 });
  }
  const verzoek = parseOphaalVerzoek(body);
  if (!verzoek) return Response.json({ status: 'fout', bericht: 'Ongeldige aanvraag.' }, { status: 400 });

  if (wie !== 'open') {
    const geweigerd = await controleerDaglimiet(wie);
    if (geweigerd) return geweigerd;
  }

  try {
    const antwoord: OphaalAntwoord = await haalGegevensOp(verzoek, { fetch, datum: new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' }) });
    return Response.json(antwoord);
  } catch {
    return Response.json({ status: 'fout', bericht: 'Ophalen lukte niet. Probeer het later opnieuw.' }, { status: 500 });
  }
}
