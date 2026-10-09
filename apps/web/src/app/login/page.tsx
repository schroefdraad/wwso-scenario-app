'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { CAPTCHA_SITE_KEY, Captcha } from './Captcha';
import { leesLoginFout, loginOpties } from './fouten';
import styles from './styles.module.css';

function LoginContent() {
  useDocumentTitle('Inloggen · Puntum');
  const searchParams = useSearchParams();
  const volgende = searchParams.get('volgende') ?? '/woningen';
  const fout = searchParams.get('fout');

  const [email, setEmail] = useState('');
  const [nieuwsbrief, setNieuwsbrief] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const [captchaReset, setCaptchaReset] = useState(0);
  const [status, setStatus] = useState<'idle' | 'bezig' | 'verstuurd' | 'fout'>('idle');
  const [foutmelding, setFoutmelding] = useState<string | undefined>(undefined);

  const captchaAan = CAPTCHA_SITE_KEY !== '';
  const wachtOpCaptcha = captchaAan && !captchaToken;

  const opCaptchaFout = useCallback(() => {
    setCaptchaToken(undefined);
    setFoutmelding(
      'De controle of je geen robot bent kon niet laden. Ververs de pagina en probeer het opnieuw.',
    );
    setStatus('fout');
  }, []);

  async function verstuurMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (wachtOpCaptcha) return;
    setStatus('bezig');
    setFoutmelding(undefined);
    const redirectTo = `${window.location.origin}/auth/callback?volgende=${encodeURIComponent(volgende)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: loginOpties({ redirectTo, nieuwsbrief, captchaToken }),
    });
    // Een token is maar één keer geldig: na elke poging een nieuwe vragen.
    if (captchaAan) setCaptchaReset((n) => n + 1);
    if (error) {
      setFoutmelding(leesLoginFout(error));
      setStatus('fout');
      return;
    }
    setStatus('verstuurd');
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.kaart}>
        <h1>Inloggen of account maken</h1>
        <p className={styles.sub}>
          Vul je e-mailadres in. Je krijgt een inloglink, geen wachtwoord nodig. Nieuw? Dan maken we
          meteen je account aan.
        </p>

        {fout && (
          <p className={styles.foutmelding}>
            De inloglink kon niet worden verwerkt. Probeer het opnieuw.
          </p>
        )}

        {status === 'verstuurd' ? (
          <p className={styles.melding}>
            Check je mail: er staat een inloglink klaar voor <strong>{email}</strong>. Open hem in
            deze browser.
          </p>
        ) : (
          <form onSubmit={verstuurMagicLink} className={styles.form}>
            <label htmlFor="email">E-mailadres</label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
            />
            <label className={styles.vinkje}>
              <input
                type="checkbox"
                checked={nieuwsbrief}
                onChange={(e) => setNieuwsbrief(e.target.checked)}
              />
              <span>Houd me op de hoogte van nieuwe functies. Afmelden kan in elke mail.</span>
            </label>
            {captchaAan && (
              <Captcha
                onToken={setCaptchaToken}
                onFout={opCaptchaFout}
                resetSleutel={captchaReset}
              />
            )}
            <button type="submit" disabled={status === 'bezig' || wachtOpCaptcha}>
              {status === 'bezig' ? 'Bezig…' : 'Stuur inloglink'}
            </button>
            {status === 'fout' && <p className={styles.foutmelding}>{foutmelding}</p>}
          </form>
        )}

        <p className={styles.hint}>
          Door verder te gaan ga je akkoord met de{' '}
          <Link href="/voorwaarden">gebruiksvoorwaarden</Link> en de{' '}
          <Link href="/privacy">privacyverklaring</Link>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPagina() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
