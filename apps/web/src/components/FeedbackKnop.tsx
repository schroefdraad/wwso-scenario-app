'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { verstuurFeedback } from '../lib/feedback/opslag';
import styles from './FeedbackKnop.module.css';

/**
 * Kleine, altijd zichtbare knop rechtsonder — opent een formulier met alleen een vrij
 * tekstveld. URL, e-mailadres, user agent en de laatste console-fouten worden onzichtbaar
 * meegestuurd (zie lib/feedback/opslag.ts), zodat de melder zelf geen reproductiestappen hoeft
 * te typen. Alleen zichtbaar met een ingelogde sessie (zelfde check als Footer's uitlogknop) —
 * zonder e-mailadres is een melding niet opvolgbaar.
 */
export function FeedbackKnop() {
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [bericht, setBericht] = useState('');
  const [status, setStatus] = useState<'idle' | 'versturen' | 'verzonden' | 'fout'>('idle');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  if (!email) return null;

  async function versturen() {
    if (!bericht.trim() || !email) return;
    setStatus('versturen');
    try {
      await verstuurFeedback({ email, bericht: bericht.trim() });
      setStatus('verzonden');
      setBericht('');
      setTimeout(() => {
        setOpen(false);
        setStatus('idle');
      }, 1500);
    } catch {
      setStatus('fout');
    }
  }

  return (
    <div className={styles.wrapper}>
      {open && (
        <div className={styles.paneel}>
          {status === 'verzonden' ? (
            <p className={styles.bevestiging}>Bedankt voor je feedback!</p>
          ) : (
            <>
              <label className={styles.label} htmlFor="feedback-bericht">
                Opmerking, bug of idee?
              </label>
              <textarea
                id="feedback-bericht"
                className={styles.tekstveld}
                rows={4}
                value={bericht}
                onChange={(e) => setBericht(e.target.value)}
                placeholder="Wat wil je laten weten?"
              />
              {status === 'fout' && <p className={styles.foutmelding}>Versturen mislukt, probeer het nogmaals.</p>}
              <div className={styles.knoppenRij}>
                <button type="button" className={styles.annuleerKnop} onClick={() => setOpen(false)}>
                  Annuleren
                </button>
                <button
                  type="button"
                  className={styles.verstuurKnop}
                  onClick={versturen}
                  disabled={!bericht.trim() || status === 'versturen'}
                >
                  {status === 'versturen' ? 'Versturen…' : 'Versturen'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <button type="button" className={styles.knop} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Feedback
      </button>
    </div>
  );
}
