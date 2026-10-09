import type { Metadata } from 'next';
import Link from 'next/link';
import { DISCLAIMER_TEKST } from '../../lib/disclaimer';
import { JURIDISCH, ONTBREEKT } from '../../lib/juridisch';
import { formateerDatum } from '../../lib/datum';
import styles from '../privacy/juridisch.module.css';

export const metadata: Metadata = { title: 'Gebruiksvoorwaarden' };

/** Openbare pagina (staat in `PUBLIEKE_PADEN` in `proxy.ts`). Gegevens in `lib/juridisch.ts`. */
export default function VoorwaardenPagina() {
  return (
    <main className={styles.wrap}>
      <h1>Gebruiksvoorwaarden</h1>
      <p className={styles.datum}>Bijgewerkt op {formateerDatum(JURIDISCH.BIJGEWERKT)}</p>
      {JURIDISCH.CONCEPT && (
        <p className={styles.concept}>
          Dit is een concepttekst. Hij wordt nog juridisch getoetst en kan veranderen.
        </p>
      )}

      <p>
        Deze voorwaarden gelden voor het gebruik van Puntum, aangeboden door{' '}
        {JURIDISCH.AANBIEDER ?? ONTBREEKT}.
      </p>

      <h2>Bèta</h2>
      <p>
        Puntum is in bèta. Tijdens de bèta is het gebruik gratis. Functies kunnen nog veranderen, en
        de dienst kan soms niet beschikbaar zijn. Voordat Puntum geld gaat kosten, hoor je dat ruim
        van tevoren; je beslist dan zelf of je doorgaat.
      </p>

      <h2>Uitkomsten zijn indicatief</h2>
      <p>{DISCLAIMER_TEKST}</p>
      <p>
        Puntum geeft geen juridisch, fiscaal of financieel advies. Bedragen voor kosten,
        terugverdientijd en rendement zijn schattingen. Je blijft zelf verantwoordelijk voor
        beslissingen over aankoop, verbouwing en huurprijs.
      </p>

      <h2>Wat we van je vragen</h2>
      <ul>
        <li>Je gebruikt een eigen e-mailadres en houdt de inloglinks voor jezelf.</li>
        <li>Je voert geen gegevens over huurders of andere personen in.</li>
        <li>
          Je gebruikt Puntum niet op een manier die de dienst verstoort, zoals geautomatiseerd
          ophalen van gegevens. Voor sommige functies geldt een daglimiet.
        </li>
      </ul>

      <h2>Aansprakelijkheid</h2>
      <p>
        Puntum wordt tijdens de bèta aangeboden zoals hij is. We zijn niet aansprakelijk voor schade
        door het gebruik van de uitkomsten of doordat de dienst tijdelijk niet beschikbaar is,
        behalve bij opzet of grove nalatigheid.
      </p>

      <h2>Stoppen</h2>
      <p>
        Je kunt op elk moment stoppen en je account laten verwijderen. Wij kunnen een account
        blokkeren bij misbruik. Hoe we met je gegevens omgaan staat in de{' '}
        <Link href="/privacy">privacyverklaring</Link>.
      </p>

      <h2>Recht</h2>
      <p>Op deze voorwaarden is Nederlands recht van toepassing.</p>

      <Link href="/login" className={styles.terug}>
        ← Terug naar inloggen
      </Link>
    </main>
  );
}
