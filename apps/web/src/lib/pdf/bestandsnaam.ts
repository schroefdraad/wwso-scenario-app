import type { PandInvoer } from '@wwso/engine';

const DIACRITISCHE_TEKENS = /[̀-ͯ]/g;

/**
 * Bestandsnaam voor het PDF-puntenrapport: adres + tarieven-peildatum, zodat een export van een
 * oude deal (mét een andere peildatum, taak 15) nooit een naamgelijke maar inhoudelijk andere
 * export overschrijft.
 */
export function puntenrapportBestandsnaam(pand: PandInvoer, tarievensetPeildatum: string): string {
  const slug =
    pand.pand.adres
      .normalize('NFD')
      .replace(DIACRITISCHE_TEKENS, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pand';
  return `puntentelling-${slug}-${tarievensetPeildatum}.pdf`;
}
