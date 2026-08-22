/**
 * Versienummer en wijzigingslog van de WEBAPP zelf (UI/functionaliteit) — bewust losstaand van
 * `ENGINE_VERSIE` in `@wwso/engine` (packages/engine/src/versiestempel.ts), die specifiek de
 * REKENLOGICA versiet voor de reproduceerbaarheid van een opgeslagen deal (taak 15, harde regel
 * 6). Dit bestand is puur voor de gebruiker: "wat is er veranderd", getoond in de footer.
 */
export const APP_VERSIE = '0.4.0';

export interface WijzigingslogEntry {
  versie: string;
  datum: string;
  wijzigingen: string[];
}

/** Nieuwste release eerst. */
export const WIJZIGINGSLOG: WijzigingslogEntry[] = [
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
