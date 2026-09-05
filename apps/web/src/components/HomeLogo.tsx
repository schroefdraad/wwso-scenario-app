import Link from 'next/link';
import Image from 'next/image';
import styles from './HomeLogo.module.css';

/**
 * Vaste, consistent geplaatste "naar huis"-link (feedback Emma, 2026-09-04: "ik mis een
 * homebutton") — het overzicht (`/deals`) is de enige echte startpagina, dus dat is de
 * bestemming. Hergebruikt het favicon-beeldmerk (`app/icon.jpg`). Staat op elke pagina met een
 * eigen header, inclusief `/deals` zelf (voor herkenbaarheid van hetzelfde beeldmerk op dezelfde
 * plek overal) — klikken op `/deals` zelf is dan een no-op, niet een fout.
 */
export function HomeLogo() {
  return (
    <Link href="/deals" className={styles.logo} aria-label="Naar Mijn deals" title="Naar Mijn deals">
      <Image src="/icon.jpg" alt="" width={28} height={28} className={styles.beeldmerk} />
    </Link>
  );
}
