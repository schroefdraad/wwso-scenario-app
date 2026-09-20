import { supabase } from '../supabase/client';
import { haalConsoleBuffer } from './consoleBuffer';

export interface FeedbackInvoer {
  email: string;
  bericht: string;
}

/**
 * Slaat een feedbackmelding op (org_id vult zichzelf via huidige_org_id(), zelfde patroon als
 * deals) en stuurt daarna een e-mailmelding via de server-route — de Resend-API ondersteunt geen
 * CORS, dus die aanroep kan niet rechtstreeks vanuit de browser (zie de resend-skill).
 * Het versturen van de e-mail is bewust best-effort: een falende e-mailmelding mag de melder niet
 * laten denken dat de feedback zelf niet is aangekomen, die staat al in de database.
 */
export async function verstuurFeedback({ email, bericht }: FeedbackInvoer): Promise<void> {
  const url = window.location.href;
  const userAgent = navigator.userAgent;
  const consoleLog = haalConsoleBuffer();

  const { error } = await supabase.from('feedback').insert({
    email,
    url,
    user_agent: userAgent,
    console_log: consoleLog,
    bericht,
  });
  if (error) throw new Error(`Feedback versturen mislukt: ${error.message}`);

  try {
    await fetch('/api/feedback-notificatie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, url, bericht }),
    });
  } catch {
    // Best-effort: de feedback zelf staat al in de database, een gemiste e-mailmelding is geen
    // reden om de melder een foutmelding te tonen.
  }
}
