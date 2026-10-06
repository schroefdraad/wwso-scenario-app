'use client';

import { useEffect, useRef, useState } from 'react';
import type { WoningMenuItem } from './acties';
import styles from './styles.module.css';

/**
 * ⋯-menu per woning (keuze eigenaar 2026-10-06, optie A). Het menu staat `position: fixed` op de
 * plek van de knop: de tabel scrollt horizontaal (`overflow-x: auto`), en daarbinnen zou een
 * absoluut menu bij de onderste rijen wegvallen.
 */
export function WoningActiesMenu({
  naam,
  items,
  isDemo,
  bezig,
  onKopieer,
  onVerwijder,
}: {
  naam: string;
  items: WoningMenuItem[];
  isDemo: boolean;
  bezig: boolean;
  onKopieer: () => void;
  onVerwijder: () => void;
}) {
  const [positie, setPositie] = useState<{ top: number; right: number } | null>(null);
  const knopRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = positie !== null;

  useEffect(() => {
    if (!open) return;
    const sluit = () => setPositie(null);
    const klik = (e: MouseEvent) => {
      const doel = e.target as Node;
      if (!menuRef.current?.contains(doel) && !knopRef.current?.contains(doel)) sluit();
    };
    const toets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        sluit();
        knopRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', klik);
    document.addEventListener('keydown', toets);
    window.addEventListener('scroll', sluit, true);
    window.addEventListener('resize', sluit);
    menuRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', klik);
      document.removeEventListener('keydown', toets);
      window.removeEventListener('scroll', sluit, true);
      window.removeEventListener('resize', sluit);
    };
  }, [open]);

  function wissel() {
    if (open) {
      setPositie(null);
      return;
    }
    const r = knopRef.current?.getBoundingClientRect();
    if (r) setPositie({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  function kies(actie: () => void) {
    setPositie(null);
    actie();
  }

  return (
    <>
      <button
        ref={knopRef}
        type="button"
        className={styles.menuKnop}
        aria-label={`Acties voor ${naam}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={bezig}
        onClick={wissel}
      >
        {bezig ? '…' : '⋯'}
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={styles.menu}
          style={{ top: positie.top, right: positie.right }}
        >
          {items.includes('kopieren') && (
            <button type="button" role="menuitem" onClick={() => kies(onKopieer)}>
              ⧉ Kopiëren
            </button>
          )}
          <hr className={styles.menuLijn} />
          {items.includes('verwijderen') && (
            <button
              type="button"
              role="menuitem"
              className={styles.menuGevaar}
              onClick={() => kies(onVerwijder)}
            >
              🗑 Verwijderen…
            </button>
          )}
          {items.includes('verwijderen-niet-toegestaan') && (
            <div className={styles.menuUitleg}>
              {isDemo
                ? 'Voorbeeldwoning: verwijderen kan niet'
                : 'Je kunt deze woning niet verwijderen'}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Bevestiging bij verwijderen (feedback eigenaar 2026-10-06): Annuleren is de vette, gevulde knop en
 * krijgt de focus (Enter = annuleren, zie `BEVESTIG_STANDAARD`); Verwijderen is dun met rode rand.
 * Esc of klikken naast het venster annuleert. Staat niet op de plek van de menuknop, dus een
 * dubbelklik kan niet meer per ongeluk verwijderen.
 */
export function BevestigVerwijderen({
  naam,
  onAnnuleer,
  onVerwijder,
}: {
  naam: string;
  onAnnuleer: () => void;
  onVerwijder: () => void;
}) {
  const annuleerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    annuleerRef.current?.focus();
    const toets = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onAnnuleer();
    };
    document.addEventListener('keydown', toets);
    return () => document.removeEventListener('keydown', toets);
  }, [onAnnuleer]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onAnnuleer();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="verwijder-titel"
        aria-describedby="verwijder-tekst"
        className={styles.venster}
      >
        <h2 id="verwijder-titel" className={styles.vensterTitel}>
          Woning verwijderen?
        </h2>
        <p id="verwijder-tekst" className={styles.vensterTekst}>
          <strong>{naam}</strong> wordt permanent verwijderd. Dit kan niet ongedaan worden gemaakt.
        </p>
        <div className={styles.vensterKnoppen}>
          <button type="button" className={styles.btnVerwijder} onClick={onVerwijder}>
            Verwijderen
          </button>
          <button
            ref={annuleerRef}
            type="button"
            className={styles.btnAnnuleren}
            onClick={onAnnuleer}
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
