import type { PandInvoer } from '../../types/index';
import { kleiweg179bKamer2 } from './kleiweg-179b-kamer2';

/**
 * Golden-master scenario — Kleiweg 179-B, Rotterdam, "6e slaapkamer" (11,3 m²).
 *
 * Bron: `resources/golden-master/Slaapkamer 6.pdf`, officiële "Resultaat Huurprijscheck",
 * ingevuld 23-6-2026 — twee weken vóór de andere twee Kleiweg-exports, met een ánder label
 * (A+++ i.p.v. A++). Behandeld als een apart scenario (mogelijk een eerdere "wat-als"-
 * doorrekening), niet als tegenstrijdig met kamer 2/3: `Pand.energielabel` geldt voor het
 * hele pand op één moment, en deze drie brondocumenten zijn kennelijk op verschillende
 * momenten met verschillende aannames ingevuld.
 *
 * Uitkomst volgens de site: 56 punten, € 570,54 (Woonruimte 25,50, Binnenruimtes 30,
 * Buitenruimtes 0). De gedeelde ruimten hebben dezelfde afmetingen als bij kamer 2/3, maar
 * de sanitaire uitrusting is in dit document op drie punten ánders ingevuld — deze export is
 * twee weken eerder gemaakt en kennelijk met andere aannames. De verschillen staan hieronder
 * bij `sanitair` en zijn stuk voor stuk terug te zien in de puntenregels op het document:
 * badkamer 2 → 0,88 (i.p.v. 1,00 afgetopt), badkamer 3 → 2,92 (i.p.v. 2,67) en beide
 * toiletruimten → 0,79 (i.p.v. 0,67). Samen brengen ze Sanitair op 6,50 i.p.v. 6,25.
 */
const basis = kleiweg179bKamer2;

/**
 * Sanitair volgens `Slaapkamer 6.pdf` zelf, niet overgenomen van kamer 2. Drie afwijkingen:
 *
 * 1. Badkamer 2 (ruimte 5) heeft hier een stopcontact in plaats van een wastafelkast. Het
 *    stopcontact levert niets op omdat deze badkamer geen wastafel heeft ("maximaal twee per
 *    (meerpersoons)wastafel", §2.6.2) — het document rekent net zo: 0,88 = 5,25/6, dus zonder
 *    het stopcontact en zonder aftopping (5,25 < 3 + 3).
 * 2. Badkamer 3 (ruimte 6) heeft een meerpersoonswastafel: 2,92 = 17,5/6 i.p.v. 16/6.
 * 3. Beide toiletruimten hebben een hangend toilet (3,75 i.p.v. 3 punten): 0,79 = 4,75/6.
 */
const sanitairKamer6 = basis.sanitair.map((post) => {
  if (post.ruimteNr === 5) {
    return {
      ...post,
      extra: { ...post.extra, aantalStopcontacten: 1, ingebouwdKastjeMetWastafel: false },
    };
  }
  if (post.ruimteNr === 6) {
    return { ...post, aantalMeerpersoonswastafels: 1 };
  }
  if (post.ruimteNr === 7 || post.ruimteNr === 8) {
    return { ...post, toiletType: 'Hangend in toiletruimte' as const };
  }
  return post;
});

export const kleiweg179bKamer6: PandInvoer = {
  ...basis,
  pand: { ...basis.pand, energielabel: 'A+++' },
  ruimtes: [
    { nr: 1, naam: '6e slaapkamer', type: 'Privévertrek', oppervlakteM2: 11.3, verdieping: 3, verwarmd: true, verkoeld: false },
    ...basis.ruimtes.slice(1, 8),
  ],
  toewijzing: basis.toewijzing.slice(0, 8),
  keukens: basis.keukens,
  sanitair: sanitairKamer6,
};
