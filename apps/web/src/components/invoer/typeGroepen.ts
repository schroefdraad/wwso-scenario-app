import { OVERIGE_RUIMTE_TYPES, VERKEERSRUIMTE_TYPES, VERTREK_TYPES, type RuimteType } from '@wwso/engine';

/**
 * Groepeert de ruimtetypen per rubriek (§4.3 van het UX-ontwerp), zodat de `<select>` de
 * gebruiker leert wat een type betekent voordat hij een fout maakt. R1/R2/R3 komen uit de
 * engine-exports (nooit overtypen — dat zou een toekomstige nieuwe ruimtetype stil kunnen
 * missen); voor R8/R9/R10 bestaat geen vergelijkbare geëxporteerde lijst omdat die rubrieken op
 * losse type-vergelijkingen filteren, dus die groepen staan hier expliciet.
 */
export const TYPE_GROEPEN: { label: string; types: RuimteType[] }[] = [
  { label: 'Vertrekken — tellen mee voor oppervlakte (R1)', types: [...VERTREK_TYPES] },
  { label: 'Overige ruimten — lagere oppervlaktewaardering (R2)', types: [...OVERIGE_RUIMTE_TYPES] },
  { label: 'Verkeersruimte — geen oppervlaktepunten, telt wel voor verwarming (R3)', types: [...VERKEERSRUIMTE_TYPES] },
  { label: 'Buitenruimte (R8)', types: ['Buitenruimte privé', 'Buitenruimte gemeenschappelijk'] },
  { label: 'Gemeenschappelijke ruimten (R9)', types: ['Gemeenschappelijk vertrek', 'Gemeenschappelijke overige ruimte'] },
  { label: 'Parkeren (R10)', types: ['Parkeerplek gemeenschappelijk'] },
];

export const QUICKADD_TYPES: RuimteType[] = ['Keuken', 'Badruimte', 'Toiletruimte', 'Berging', 'Overige ruimte'];
