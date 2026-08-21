import type { Bandbreedte } from '@wwso/engine';

export function formateerEuro(bedrag: number, decimalen = 0): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimalen, minimumFractionDigits: decimalen }).format(bedrag);
}

export function formateerEuroBand(band: Bandbreedte): string {
  return `${formateerEuro(band.verwacht)} (${formateerEuro(band.optimistisch)}–${formateerEuro(band.pessimistisch)})`;
}

export function formateerJarenBand(band: Bandbreedte | null): string {
  if (!band) return '—';
  const fmt = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
  return `${fmt(band.verwacht)} jr (${fmt(band.optimistisch)}–${fmt(band.pessimistisch)})`;
}

export function formateerPctBand(band: Bandbreedte | null): string {
  if (!band) return '—';
  const fmt = (n: number) => n.toLocaleString('nl-NL', { maximumFractionDigits: 2 });
  return `${fmt(band.verwacht)}% (${fmt(band.pessimistisch)}–${fmt(band.optimistisch)}%)`;
}
