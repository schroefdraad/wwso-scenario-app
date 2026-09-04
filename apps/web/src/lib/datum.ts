/**
 * Nederlands weergaveformaat DD-MM-YYYY voor alle aan de gebruiker getoonde datums (feedback
 * Emma, 2026-09-04: datumformaat overal consistent, bijv. "31-01-2026" i.p.v. de ruwe ISO-string).
 */
export function formateerDatum(iso: string): string {
  const [jaar, maand, dag] = iso.slice(0, 10).split('-');
  if (!jaar || !maand || !dag) return iso;
  return `${dag}-${maand}-${jaar}`;
}

/** Zelfde formaat, met tijdstip erachter — voor tijdstempels zoals "laatst bijgewerkt". */
export function formateerDatumTijd(iso: string): string {
  const datum = new Date(iso);
  if (Number.isNaN(datum.getTime())) return iso;
  const dag = String(datum.getDate()).padStart(2, '0');
  const maand = String(datum.getMonth() + 1).padStart(2, '0');
  const uur = String(datum.getHours()).padStart(2, '0');
  const minuut = String(datum.getMinutes()).padStart(2, '0');
  return `${dag}-${maand}-${datum.getFullYear()} ${uur}:${minuut}`;
}
