import type { ReactNode } from 'react';
import Link from 'next/link';
import { HomeLogo } from './HomeLogo';
import styles from './AppHeader.module.css';

/**
 * Eén gedeelde topnavigatie voor alle schermen (topnav-audit 2026-10-03) — daarvoor had elke
 * pagina een eigen `.kop` met eigen padding/uitlijning/wrap-gedrag, waardoor de header bij elke
 * paginawissel versprong en "Mijn woningen" per scherm anders heette of ontbrak. Vaste opbouw:
 * logo · paginatitel · (ruimte) · "Mijn woningen" · acties. Alleen navigatie en acties horen
 * hier ("topnavigatie is voor navigatie", feedback 2026-10-02) — woningstatus gaat in de losse
 * `WoningContextStrook` hieronder, formuliervelden in de pagina zelf.
 *
 * `sticky` alleen op het invoerscherm: de enige lange pagina, waar "Doorrekenen →" altijd binnen
 * bereik moet blijven.
 */
export function AppHeader({
  titel,
  acties,
  sticky = false,
  toonMijnWoningen = true,
}: {
  titel: ReactNode;
  acties?: ReactNode;
  sticky?: boolean;
  /** Uit op `/woningen` zelf — daar is het een no-op-link naar de pagina waar je al bent. */
  toonMijnWoningen?: boolean;
}) {
  return (
    <header className={`${styles.kop} ${sticky ? styles.sticky : ''}`}>
      <HomeLogo />
      <h1 className={styles.titel}>{titel}</h1>
      <div className={styles.spacer} />
      {toonMijnWoningen && (
        <Link href="/woningen" className={styles.navLink}>
          Mijn woningen
        </Link>
      )}
      {acties}
    </header>
  );
}

/**
 * Gedeelde, niet-sticky statusstrook direct onder de `AppHeader`: woningnaam/adres, kamers en
 * andere context. Lege of `false`-onderdelen vallen weg; de rest wordt met " · " gescheiden.
 */
export function WoningContextStrook({ onderdelen }: { onderdelen: Array<ReactNode | false | null | undefined> }) {
  const zichtbaar = onderdelen.filter((o): o is ReactNode => o !== false && o !== null && o !== undefined && o !== '');
  if (zichtbaar.length === 0) return null;
  return (
    <div className={styles.context}>
      {zichtbaar.map((onderdeel, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {onderdeel}
        </span>
      ))}
    </div>
  );
}

export function kamersLabel(n: number): string {
  return `${n} kamer${n === 1 ? '' : 's'}`;
}

/** Knopstijlen voor `acties`, zodat elke pagina dezelfde knoppen in de header zet. */
export const headerKnop = {
  primair: `${styles.knop} ${styles.knopPrimair}`,
  secundair: styles.knop,
  klein: `${styles.knop} ${styles.knopKlein}`,
  status: styles.status,
  fout: `${styles.status} ${styles.statusFout}`,
};
