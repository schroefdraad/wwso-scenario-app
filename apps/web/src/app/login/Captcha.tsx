'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile op het loginformulier (plan B5, 2026-10-09): met open inschrijving kan een
 * bot anders inloglinks naar willekeurige adressen laten sturen en zo de mail-limiet voor iedereen
 * opmaken. Supabase controleert het token zelf (Authentication → Attack Protection).
 *
 * Bewust uitgeschakeld zolang `NEXT_PUBLIC_TURNSTILE_SITE_KEY` ontbreekt (CLAUDE.md: bouw voor de
 * omgeving zoals die nu is): dan geen widget en geen token, en zolang captcha in Supabase uit staat
 * werkt inloggen gewoon. Zet de sleutel en Attack Protection dus tegelijk aan.
 */
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type Turnstile = {
  render: (el: HTMLElement, opties: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptBelofte: Promise<void> | null = null;
function laadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptBelofte ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptBelofte = null;
      reject(new Error('Turnstile laden mislukt'));
    };
    document.head.appendChild(s);
  });
  return scriptBelofte;
}

/**
 * `resetSleutel` ophogen = nieuw token vragen (een token is maar één keer bruikbaar, dus na elke
 * verzendpoging opnieuw).
 */
export function Captcha({
  onToken,
  onFout,
  resetSleutel,
}: {
  onToken: (token: string | undefined) => void;
  onFout: () => void;
  resetSleutel: number;
}) {
  const houder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callbacks = useRef({ onToken, onFout });

  useEffect(() => {
    callbacks.current = { onToken, onFout };
  }, [onToken, onFout]);

  useEffect(() => {
    let actief = true;
    laadScript()
      .then(() => {
        if (!actief || !houder.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(houder.current, {
          sitekey: CAPTCHA_SITE_KEY,
          language: 'nl',
          callback: (token: string) => callbacks.current.onToken(token),
          'expired-callback': () => callbacks.current.onToken(undefined),
          'error-callback': () => callbacks.current.onFout(),
        });
      })
      .catch(() => {
        if (actief) callbacks.current.onFout();
      });
    return () => {
      actief = false;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetSleutel > 0 && widgetId.current && window.turnstile) {
      callbacks.current.onToken(undefined);
      window.turnstile.reset(widgetId.current);
    }
  }, [resetSleutel]);

  return <div ref={houder} />;
}
