import type { Metadata } from 'next';
import Link from 'next/link';
import { JURIDISCH, ONTBREEKT } from '../../lib/juridisch';
import { formateerDatum } from '../../lib/datum';
import styles from './juridisch.module.css';

export const metadata: Metadata = { title: 'Privacyverklaring' };

/** Openbare pagina (staat in `PUBLIEKE_PADEN` in `proxy.ts`). Gegevens in `lib/juridisch.ts`. */
export default function PrivacyPagina() {
  const contact = JURIDISCH.CONTACT_EMAIL ?? ONTBREEKT;
  return (
    <main className={styles.wrap}>
      <h1>Privacyverklaring</h1>
      <p className={styles.datum}>Bijgewerkt op {formateerDatum(JURIDISCH.BIJGEWERKT)}</p>
      {JURIDISCH.CONCEPT && (
        <p className={styles.concept}>
          Dit is een concepttekst. Hij wordt nog juridisch getoetst en kan veranderen.
        </p>
      )}

      <p>
        Puntum is een rekentool voor de puntentelling en het rendement van kamerverhuur. Puntum
        wordt aangeboden door {JURIDISCH.AANBIEDER ?? ONTBREEKT}. Hieronder staat welke gegevens we
        van je verwerken, waarom, en wat je rechten zijn.
      </p>

      <h2>Welke gegevens</h2>
      <ul>
        <li>Je e-mailadres, om je account te maken en je in te laten loggen.</li>
        <li>Of en wanneer je toestemming gaf voor mails over nieuwe functies.</li>
        <li>
          De gegevens over panden die je zelf invoert: adres, kamers, voorzieningen, kosten en
          scenario's. Puntum vraagt geen gegevens over huurders. Voer die ook niet in, bijvoorbeeld
          in een notitie.
        </li>
        <li>Feedback die je via de app stuurt, met je e-mailadres zodat we kunnen reageren.</li>
        <li>
          Technische gegevens die nodig zijn om de dienst te laten werken en te beveiligen, zoals je
          IP-adres bij het inloggen en foutmeldingen uit de app.
        </li>
      </ul>

      <h2>Waarvoor en op welke grond</h2>
      <ul>
        <li>
          Account, inloggen en de berekeningen bewaren: om de dienst te leveren die je gebruikt.
        </li>
        <li>
          Mails over je account en over de dienst, zoals inloglinks, storingen en belangrijke
          wijzigingen: om de dienst te leveren.
        </li>
        <li>
          Mails over nieuwe functies: alleen als je daar toestemming voor gaf. Afmelden kan in elke
          mail.
        </li>
        <li>
          Misbruik tegengaan en fouten oplossen: ons gerechtvaardigd belang bij een veilige,
          werkende dienst.
        </li>
      </ul>

      <h2>Wie de gegevens kan zien</h2>
      <p>
        Je panden zijn alleen zichtbaar binnen je eigen account. De beheerder van Puntum kan voor
        ondersteuning en beheer meekijken. We verkopen geen gegevens en delen ze niet met
        adverteerders.
      </p>
      <p>We gebruiken deze dienstverleners, die gegevens alleen voor ons verwerken:</p>
      <ul>
        <li>Supabase: database en inloggen.</li>
        <li>Vercel: hosting van de app.</li>
        <li>Resend: versturen van e-mail.</li>
        <li>Sentry: registratie van foutmeldingen.</li>
        <li>Cloudflare Turnstile: controle bij het inloggen dat je geen robot bent.</li>
      </ul>

      <h2>Hoe lang</h2>
      <p>
        We bewaren je gegevens zolang je account bestaat. Vraag je om verwijdering, dan verwijderen
        we je account en je panden binnen 30 dagen.
      </p>

      <h2>Cookies</h2>
      <p>
        Puntum gebruikt alleen een cookie die nodig is om ingelogd te blijven. Geen advertentie- of
        volgcookies.
      </p>

      <h2>Je rechten</h2>
      <p>
        Je kunt je gegevens inzien, laten corrigeren of laten verwijderen, en je toestemming voor
        mails intrekken. Mail daarvoor naar {contact}. Ben je het niet eens met hoe we met je
        gegevens omgaan, dan kun je een klacht indienen bij de Autoriteit Persoonsgegevens.
      </p>

      <Link href="/login" className={styles.terug}>
        ← Terug naar inloggen
      </Link>
    </main>
  );
}
