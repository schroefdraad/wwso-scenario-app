import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

/**
 * Los stukje server-code, alleen voor het versturen van de e-mailmelding — de feedback zelf is al
 * opgeslagen door de client vóórdat deze route wordt aangeroepen (zie lib/feedback/opslag.ts).
 * Resend ondersteunt geen CORS, dus dit móét server-side.
 */
export async function POST(request: Request) {
  const { email, url, bericht } = (await request.json()) as { email: string; url: string; bericht: string };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: `Puntum feedback <feedback@${process.env.RESEND_EMAIL_DOMAIN}>`,
    to: ['myle.hoefdraad@gmail.com'],
    subject: 'Nieuwe feedback in Puntum',
    text: `Van: ${email}\nPagina: ${url}\n\n${bericht}`,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
