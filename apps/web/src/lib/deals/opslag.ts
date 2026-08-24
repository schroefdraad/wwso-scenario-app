import type { PandInvoer, Versiestempel } from '@wwso/engine';
import { supabase } from '../supabase/client';
import { parseDealRij, type Deal, type ScenarioSelectie } from './types';

export interface DealInvoer {
  naam: string;
  pandInvoer: PandInvoer;
  scenarios: ScenarioSelectie[];
  versiestempel: Versiestempel;
}

function naarRij(invoer: DealInvoer) {
  return {
    naam: invoer.naam,
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
  if (error) throw new Error(`Deal opslaan mislukt: ${error.message}`);
  return parseDealRij(data);
}

export async function werkDealBij(id: string, invoer: DealInvoer): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .update({ ...naarRij(invoer), bijgewerkt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Deal bijwerken mislukt: ${error.message}`);
  return parseDealRij(data);
}

export async function haalDealenOp(): Promise<Deal[]> {
  const { data, error } = await supabase.from('deals').select().order('bijgewerkt', { ascending: false });
  if (error) throw new Error(`Deals ophalen mislukt: ${error.message}`);
  return data.map(parseDealRij);
}

export async function haalDealOp(id: string): Promise<Deal | null> {
  const { data, error } = await supabase.from('deals').select().eq('id', id).maybeSingle();
  if (error) throw new Error(`Deal ophalen mislukt: ${error.message}`);
  return data ? parseDealRij(data) : null;
}
