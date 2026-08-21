import type { MaatregelRegistry } from '../types';
import { r1r2IndelingMaatregelen } from './r1-r2-indeling';
import { r3KlimaatMaatregelen } from './r3-klimaat';
import { r4EnergieMaatregelen } from './r4-energie';
import { r5KeukenMaatregelen } from './r5-keuken';
import { r6SanitairMaatregelen } from './r6-sanitair';
import { r8BuitenruimteMaatregelen } from './r8-buitenruimte';
import { r10ParkerenMaatregelen } from './r10-parkeren';
import { r12BijzonderMaatregelen } from './r12-bijzonder';
import { r13AftrekpuntenMaatregelen } from './r13-aftrekpunten';
import { procMaatregelen } from './proc';

const ALLE_DEFINITIES = [
  ...r1r2IndelingMaatregelen,
  ...r3KlimaatMaatregelen,
  ...r4EnergieMaatregelen,
  ...r5KeukenMaatregelen,
  ...r6SanitairMaatregelen,
  ...r8BuitenruimteMaatregelen,
  ...r10ParkerenMaatregelen,
  ...r12BijzonderMaatregelen,
  ...r13AftrekpuntenMaatregelen,
  ...procMaatregelen,
];

/** De standaardregistry: één definitie per catalogusregel uit kostencatalogus 0.1 (49 maatregelen). */
export const standaardRegistry: MaatregelRegistry = new Map(ALLE_DEFINITIES.map((d) => [d.id, d]));

export * from './validatie';
