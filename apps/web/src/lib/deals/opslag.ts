import type { PandInvoer, Versiestempel } from '@wwso/engine';
import { supabase } from '../supabase/client';
import { parseDealRij, type Deal, type ScenarioSelectie } from './types';

export interface DealInvoer {
  naam: string;
  /** Backlog 2026-09-04 — lege string, geen `undefined`: de aanroeper beslist expliciet wat de
   * notitie/map moeten worden, ook als dat "ongewijzigd laten" is (zie de aanroepers). */
  notitie: string;
  map: string;
  pandInvoer: PandInvoer;
  scenarios: ScenarioSelectie[];
  versiestempel: Versiestempel;
}

function naarRij(invoer: DealInvoer) {
  return {
    naam: invoer.naam,
    notitie: invoer.notitie,
    map: invoer.map,
    pand_invoer: invoer.pandInvoer,
    scenarios: invoer.scenarios,
    tarievenset_peildatum: invoer.versiestempel.tarievensetPeildatum,
    kostencatalogus_versie: invoer.versiestempel.kostencatalogusVersie,
    registry_versie: invoer.versiestempel.registryVersie,
    engine_versie: invoer.versiestempel.engineVersie,
  };
}

export async function maakDealAan(invoer: DealInvoer): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .insert(naarRij(invoer))
    .select()
    .single();
  if (error) throw new Error(`Woning opslaan mislukt: ${error.message}`);
  return parseDealRij(data);
}

export async function werkDealBij(id: string, invoer: DealInvoer): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .update({ ...naarRij(invoer), bijgewerkt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Woning bijwerken mislukt: ${error.message}`);
  return parseDealRij(data);
}

export async function haalDealenOp(): Promise<Deal[]> {
  const { data, error } = await supabase.from('deals').select().order('bijgewerkt', { ascending: false });
  if (error) throw new Error(`Woningen ophalen mislukt: ${error.message}`);
  return data.map(parseDealRij);
}

/** Alle bestaande mapnamen (voor de mapkeuze-dropdown op de scenariovergelijking — leeg/duplicaat-vrij, gesorteerd). */
export async function haalMappen(): Promise<string[]> {
  const { data, error } = await supabase.from('deals').select('map');
  if (error) throw new Error(`Mappen ophalen mislukt: ${error.message}`);
  const gevonden = new Set(data.map((r) => r.map as string).filter((m) => m !== ''));
  return [...gevonden].sort((a, b) => a.localeCompare(b));
}

export async function haalDealOp(id: string): Promise<Deal | null> {
  const { data, error } = await supabase.from('deals').select().eq('id', id).maybeSingle();
  if (error) throw new Error(`Woning ophalen mislukt: ${error.message}`);
  return data ? parseDealRij(data) : null;
}

/**
 * Kopieert een bestaande woning naar een nieuwe, losstaande deal (feedback Steven Kramer,
 * 2026-09-08: "het zou top zijn als je panden kan kopiëren") — bijv. om twee varianten van
 * dezelfde plattegrond naast elkaar te beheren zonder alles opnieuw in te tikken. Neemt
 * pand, scenario's, notitie en map letterlijk over; alleen de naam krijgt "(kopie)" zodat de
 * twee entries in "Mijn woningen" uit elkaar te houden zijn. Geen koppeling met het origineel
 * erna — wijzigen van de kopie raakt de bron nooit.
 */
export async function kopieerDeal(id: string): Promise<Deal> {
  const bron = await haalDealOp(id);
  if (!bron) throw new Error('Woning kopiëren mislukt: origineel niet gevonden.');
  return maakDealAan({
    naam: `${bron.naam} (kopie)`,
    notitie: bron.notitie,
    map: bron.map,
    pandInvoer: bron.pandInvoer,
    scenarios: bron.scenarios,
    versiestempel: bron.versiestempel,
  });
}
