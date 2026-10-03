# Briefing: Disclaimer + feedback verzamelen (beta) — Sessie 2026-09-13

## Wat er gedaan is
Met de gebruiker besproken hoe de app beta-klaar te maken op twee punten: een juridisch/inhoudelijk voorbehoud bij de rekenresultaten, en een manier om gestructureerde bugmeldingen/feedback van de 2 externe testgebruikers te verzamelen zonder dat ze zelf reproductiestappen hoeven te typen.

## Beslissingen
- **Disclaimer: nu bouwen**, niet uitstellen tot vermarkten. Reden: `wwso.xlsx` wijkt op 15 punten af van het beleidsboek (zie STATUS.md), en de uitkomst (punten/huurprijs) is wat een verhuurder aan een huurder voorlegt. Zonder disclaimer oogt elke uitkomst als autoritatief.
- **Algemene voorwaarden: nog niet.** Pas relevant bij een echt vermarkt product met betaalstroom/externe klant-rechtspersoon (fase 4/vermarkten). Nu nog "open testomgeving" met 3 bekende gebruikers. Dit is bovendien geen taak voor Claude Code — bij opstarten hoort een jurist, niet gegenereerde tekst.
- **Feedback verzamelen: twee complementaire mechanismen, beide nu bouwen, niet na elkaar:**
  1. Een feedbackknop in de app die automatisch context meestuurt (URL incl. `?deal=<id>`, e-mail, user agent, laatste console-errors/warnings) plus een vrij tekstveld, opgeslagen in een nieuwe Supabase-tabel.
  2. Sentry (gratis tier) voor automatische foutregistratie (stacktrace + breadcrumbs) van onverwerkte JS-errors — vangt stille crashes die niemand meldt, wat in de bestaande backlog meerdere keren de oorzaak was dat een bug pas laat opviel.
  - Volgorde: feedbackknop eerst (kleinste, direct bruikbaar), Sentry er meteen achteraan, allebei vóór taak 18.

## Technische wijzigingen (nog te doen door Claude Code)

### 1. Disclaimer
- Tekst (concept, mag verkort/aangepast): *"Indicatieve berekening op basis van [versie beleidsboek]. Geen rechten te ontlenen aan deze uitkomst — raadpleeg bij twijfel de officiële Huurprijscheck van de Huurcommissie."*
- Plek: `components/Footer.tsx` (naast de bestaande wijzigingslog-footer, `app/layout.tsx`), én op de PDF-export (taak 16, `@react-pdf/renderer`).
- Verificatie: zichtbaar op elke pagina en op een geëxporteerde PDF.

### 2. Feedbackknop
- Nieuwe Supabase-tabel `feedback`, org-scoped, zelfde RLS-patroon als `deals` (taak 17: `org_id` default via `huidige_org_id()`).
- Velden: `url` (incl. querystring), `email` (uit sessie), `user_agent`, `console_log_buffer` (laatste N entries uit een simpele `window.onerror`/`console.error`-buffer), `bericht` (vrij tekstveld), `org_id`, `created_at`.
- UI: kleine, altijd zichtbare knop/icoon (bijv. naast de Footer of als vaste widget), opent een klein formulier met alleen het vrije tekstveld — de rest wordt onzichtbaar voor de gebruiker meegestuurd.
- Verificatie: feedback insturen op een deal-pagina → rij verschijnt in `feedback` met correcte URL/org_id/user agent; geen persoonsgegevens buiten e-mail opslaan (past bij "geen persoonsgegevens in de MVP", check of e-mail hier een uitzondering moet zijn of vervangen kan worden door alleen org_id).

### 3. Sentry
- Sentry SDK toevoegen aan `apps/web` (Next.js-integratie), gratis tier.
- Alleen client- en server-side error capturing, geen performance/tracing nodig voor nu (scope klein houden).
- Verificatie: een bewust gegooide test-error in dev verschijnt in het Sentry-dashboard met stacktrace en breadcrumbs.

## Openstaande punten
- Moet het e-mailadres in de feedbacktabel blijven staan, gezien de "geen persoonsgegevens"-beslissing (STATUS.md)? Voorstel: wel bewaren, want zonder afzender is feedback niet opvolgbaar bij 2-3 gebruikers — maar dit expliciet als bewuste uitzondering vastleggen, niet stilzwijgend.
- Algemene voorwaarden blijven een openstaand punt richting vermarkten — geen actie nu.

## Volgende stap
Beide taken (disclaimer, feedbackknop, Sentry) toevoegen aan `plan/plan.md` onder Fase 3-nasleep/vóór taak 18, met lege checkboxen, en oppakken vóór taak 18 (gemeentelijke regels).

> Sla dit bestand op als `briefings/BRIEFING_sessie_20260913.md` in je WWSO Scenario App map.
