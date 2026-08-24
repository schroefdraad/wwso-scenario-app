'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';
import { APP_VERSIE, WIJZIGINGSLOG } from '../lib/wijzigingslog';
import styles from './Footer.module.css';

/** App-brede footer met versienummer + wijzigingslog — zichtbaar op elke pagina via layout.tsx.
 * Toont sinds taak 17 ook de ingelogde gebruiker + een uitlogknop, als er een sessie is (niet op
 * /login zelf, waar nog niemand is ingelogd). */
export function Footer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    return () => subscription.unsubscribe();
  }, []);

  async function logUit() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.rij}>
        <button type="button" className={styles.versieKnop} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          WWSO Scenario App · v{APP_VERSIE} {open ? '▾' : '▸'}
        </button>
        {email && (
          <span className={styles.gebruiker}>
            {email}
            <button type="button" className={styles.uitlogKnop} onClick={logUit}>
              Uitloggen
            </button>
          </span>
        )}
      </div>
      {open && (
        <div className={styles.log}>
          {WIJZIGINGSLOG.map((entry) => (
            <div key={entry.versie} className={styles.logEntry}>
              <div className={styles.logKop}>
                <strong>v{entry.versie}</strong>
                <span>{entry.datum}</span>
              </div>
              <ul>
                {entry.wijzigingen.map((regel, i) => (
                  <li key={i}>{regel}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </footer>
  );
}
