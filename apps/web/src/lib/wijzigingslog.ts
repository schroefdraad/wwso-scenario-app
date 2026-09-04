/**
 * Versienummer en wijzigingslog van de WEBAPP zelf (UI/functionaliteit) — bewust losstaand van
 * `ENGINE_VERSIE` in `@wwso/engine` (packages/engine/src/versiestempel.ts), die specifiek de
 * REKENLOGICA versiet voor de reproduceerbaarheid van een opgeslagen deal (taak 15, harde regel
 * 6). Dit bestand is puur voor de gebruiker: "wat is er veranderd", getoond in de footer.
 */
export const APP_VERSIE = '0.5.2';

export interface WijzigingslogEntry {
  versie: string;
  datum: string;
  wijzigingen: string[];
}

/** Nieuwste release eerst. */
export const WIJZIGINGSLOG: WijzigingslogEntry[] = [
  {
    versie: '0.5.2',
    datum: '2026-09-04',
    wijzigingen: [
      'Vrije notitie per deal, zichtbaar in het deals-overzicht — te bewerken op de scenariovergelijkingspagina',
      'Deals kunnen nu in een map gezet worden (persoonlijke ordening) — het deals-overzicht heeft een mapfilter zodra er minstens één deal een map heeft',
    ],
  },
  {
    versie: '0.5.1',
    datum: '2026-09-04',
    wijzigingen: [
      'COROP-gebied wordt niet meer handmatig gekozen — typ de stad, en de gemeente (en daarmee het COROP-gebied) wordt automatisch gesuggereerd. Komt de plaatsnaam in meerdere gemeentes voor, dan blijft de keuze aan jou',
    ],
  },
  {
    versie: '0.5.0',
    datum: '2026-09-04',
    wijzigingen: [
      'De automatische Basis/Comfort/Maximaal-sneltoetsen op de scenariovergelijking zijn verwijderd (niet gebruikt door de externe gebruiker)',
      'Energielabel-scenario\'s: eigen kosteninschatting per doellabel (A+/A++/A+++) op het pandgegevens-scherm, en een wisselknop per scenariokolom die daarmee live doorrekent',
      'Handmatig bewerkte scenario\'s: elke aangevinkte maatregel heeft nu een eigen, overschrijfbaar prijsveld (voorgevuld met de catalogusprijs) naast het bestaande investeringsbedrag voor de herindeling — maakt zichtbaar welke maatregel een investeringsverschil tussen scenario\'s veroorzaakt',
    ],
  },
  {
    versie: '0.4.4',
    datum: '2026-08-24',
    wijzigingen: [
      'Bugfix: "Wastafel op kamer" (S-01) werd nog aangeboden als de kamer al aan de puntencap zat — leverde dan 0 extra huur op ondanks een investeringsbedrag',
    ],
  },
  {
    versie: '0.4.3',
    datum: '2026-08-24',
    wijzigingen: [
      'Inloggen via magic link (e-mail) — alleen bekende e-mailadressen krijgen toegang tot deals',
      'Maatregeltabel: de "melding"-badge (bijv. bij split-airco) toont nu bij hovering een tooltip met de reden',
      'Kolomkoppen "Solo +€/jr"/"Solo investering" ingekort naar "+€/jr"/"Investering"',
    ],
  },
  {
    versie: '0.4.2',
    datum: '2026-08-24',
    wijzigingen: [
      'Sanitair-lade: in een toiletruimte heet "wastafel" nu "fonteintje", max. 1 per toiletruimte, geen meerpersoonswastafel-optie meer',
      'Onder AS-IS op de scenariopagina staat nu ook "Bekijk volledig resultaat →" — voorheen alleen bereikbaar via de browser-terugknop',
      'Resultaatscherm en PDF tonen nu ook het totaal (som over alle kamers) aan maandhuur en jaarhuur, naast de puntenopbouw per kamer',
      'Knoppen per scenario-kolom herordend: "Bekijk volledig resultaat", "Bewerk handmatig" en "Leegmaken" staan nu als drie tekstlinks onder elkaar',
    ],
  },
  {
    versie: '0.4.1',
    datum: '2026-08-22',
    wijzigingen: [
      'Een handmatig bewerkt scenario (incl. de maatregelen daarbovenop en de handmatige investering) kan nu ook opgeslagen worden in een deal',
    ],
  },
  {
    versie: '0.4.0',
    datum: '2026-08-22',
    wijzigingen: [
      'Een handmatig bewerkt scenario (bijv. een extra kamer erbij) kan nu ook standaardmaatregelen krijgen mét een eigen kosten/terugverdientijd-berekening — inclusief maatregelen die specifiek op de nieuwe kamer van toepassing zijn',
    ],
  },
  {
    versie: '0.3.2',
    datum: '2026-08-22',
    wijzigingen: [
      'Bugfix: "Doorrekenen"/"Deal opslaan" kon uitgeschakeld blijven zonder enige zichtbare reden — de knop en de puntenstrip laten nu altijd zien wat er nog ontbreekt',
      'Bugfix: een leeg "aantal adressen met toegang"-veld bij een gedeelde ruimte zag eruit als al ingevuld — nu duidelijk herkenbaar met een amber rand zolang het leeg is',
    ],
  },
  {
    versie: '0.3.1',
    datum: '2026-08-22',
    wijzigingen: [
      'Bugfix: de suggestie-engine stelde soms voor om een buitenruimte of parkeerplek te "verwarmen" voor meer punten — dat leverde nooit punten op en kan niet meer voorgesteld worden',
      'Ingangsdatum van het energielabel is nu altijd optioneel — onbekend? Laat leeg, de motor valt dan terug op de bouwjaargrenzen',
    ],
  },
  {
    versie: '0.3.0',
    datum: '2026-08-21',
    wijzigingen: [
      'Nieuw pand kan al vóór Doorrekenen als deal opgeslagen worden, zodat het meteen op de deals-pagina staat',
      'Bugfix: een tweede scenario handmatig bewerken wiste niet langer het eerste — en de deal-koppeling ging niet meer verloren bij terugkeer van het bewerkscherm',
    ],
  },
  {
    versie: '0.2.0',
    datum: '2026-08-21',
    wijzigingen: [
      'AS-IS kopiëren naar een handmatig bewerkbaar TO-BE-scenario — "Bewerk handmatig →" op het vergelijkingsscherm opent een volledige, vrij te bewerken kopie van de as-is, en het resultaat verschijnt als scenario-kolom naast de as-is',
    ],
  },
  {
    versie: '0.1.0',
    datum: '2026-08-21',
    wijzigingen: [
      'PDF-export van de puntenopbouw, vanaf het resultaatscherm',
      'Autosave op het invoerscherm — een refresh of terug-navigatie kost geen ingevoerde gegevens meer',
      'De as-is van een opgeslagen deal is achteraf weer bewerkbaar via "Pandgegevens bewerken"',
      'Puntenweergave per faciliteit in de keuken- en sanitair-lade (bijv. stopcontact, handdoekenradiator)',
      'Sanitair-lade toont bij een toiletruimte alleen de relevante velden, geen overbodige douche/bad-opties',
      'WOZ-peildatum als jaartallen-keuze in plaats van een vrije datepicker',
      '"Overige ruimte" als snelknop bij ruimtes toevoegen, in plaats van "Verkeersruimte"',
      'Energielabel "geen label bekend" blokkeerde niet langer ten onrechte het doorrekenen',
    ],
  },
];
