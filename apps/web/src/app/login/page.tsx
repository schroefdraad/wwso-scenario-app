'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase/client';
import styles from './styles.module.css';

function LoginContent() {
  const searchParams = useSearchParams();
  const volgende = searchParams.get('volgende') ?? '/deals';
  const fout = searchParams.get('fout');

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'bezig' | 'verstuurd' | 'fout'>('idle');
  const [foutmelding, setFoutmelding] = useState<string | undefined>(undefined);

  async function verstuurMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('bezig');
    setFoutmelding(undefined);
    const redirectTo = `${window.location.origin}/auth/callback?volgende=${encodeURIComponent(volgende)}`;
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) {
      setFoutmelding(error.message);
      setStatus('fout');
      return;
    }
    setStatus('verstuurd');
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.kaart}>
        <h1>WWSO Scenario App</h1>
        <p className={styles.sub}>Log in met een magic link — geen wachtwoord nodig.</p>

        {fout && <p className={styles.foutmelding}>De magic link kon niet worden verwerkt. Probeer opnieuw.</p>}

        {status === 'verstuurd' ? (
          <p className={styles.melding}>
            Check je mail — er staat een inloglink klaar voor <strong>{email}</strong>.
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
            <button type="submit" disabled={status === 'bezig'}>
              {status === 'bezig' ? 'Bezig…' : 'Stuur magic link'}
            </button>
            {status === 'fout' && <p className={styles.foutmelding}>Versturen mislukt: {foutmelding}</p>}
          </form>
        )}

        <p className={styles.hint}>
          Alleen bekende e-mailadressen krijgen na het inloggen ook echt toegang tot deals — zie <code>allowed_emails</code>.
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
