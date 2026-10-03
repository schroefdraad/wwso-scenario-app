import type { Bandbreedte } from '@wwso/engine';

export function formateerEuro(bedrag: number, decimalen = 0): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimalen, minimumFractionDigits: decimalen }).format(bedrag);
}

// Alleen de verwachte waarde tonen, geen bandbreedte (feedback 2026-10-03: "we werken niet met
// range"). De engine rekent de band nog wel uit; hier wordt hij bewust niet meer weergegeven.

export function formateerEuroBand(band: Bandbreedte | null): string {
  if (!band) return '—';
  return formateerEuro(band.verwacht);
}

export function formateerJarenBand(band: Bandbreedte | null): string {
  if (!band) return '—';
  return `${band.verwacht.toLocaleString('nl-NL', { maximumFractionDigits: 1 })} jr`;
}

export function formateerPctBand(band: Bandbreedte | null): string {
  if (!band) return '—';
  return `${band.verwacht.toLocaleString('nl-NL', { maximumFractionDigits: 2 })}%`;
}
