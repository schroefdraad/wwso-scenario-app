/**
 * In welke omgeving draait de app (2026-10-04, testomgeving — zie supabase/TEST_OPZETTEN.md)?
 * Vercel zet `NEXT_PUBLIC_VERCEL_ENV` op 'production' (branch master), 'preview' (branch test en
 * andere branches, testdatabase) of 'development' (lokaal via `vercel env pull`). Ontbreekt de
 * waarde, dan draait de app lokaal zonder Vercel.
 */
export type Omgeving = 'productie' | 'test' | 'lokaal';

export function bepaalOmgeving(vercelEnv: string | undefined): Omgeving {
  if (vercelEnv === 'production') return 'productie';
  if (vercelEnv === 'preview') return 'test';
  return 'lokaal';
}

export const OMGEVING: Omgeving = bepaalOmgeving(process.env.NEXT_PUBLIC_VERCEL_ENV);

/** Voorvoegsel voor zichtbare teksten buiten productie (balk, e-mailonderwerp). Leeg op productie. */
export function omgevingLabel(omgeving: Omgeving): string {
  if (omgeving === 'test') return 'TEST';
  if (omgeving === 'lokaal') return 'LOKAAL';
  return '';
}
