import { describe, expect, it } from 'vitest';
import { getTarievenset } from '@wwso/data';
import { testpand6Kamers } from '../fixtures/testpand-6kamers';
import { pasScenarioToe } from '../scenario/index';
import { berekenEindtelling } from '../eindtelling/index';
import { analyseerMarge } from './marge-analyse';
import { standaardRegistry } from './registry/index';
import type { MaatregelContext } from './types';

const tarievenset = getTarievenset('2026-01-01');
const peildatum = '2026-01-01';

function ctxVoor(pand: typeof testpand6Kamers): MaatregelContext {
  const eindtelling = berekenEindtelling(pand, tarievenset, peildatum);
  const marge = analyseerMarge(pand, tarievenset, eindtelling);
  return { pand, tarievenset, peildatum, eindtelling, marge };
}

/**
 * `pasMutatieToe` (taak 9) doet een ONDIEPE merge: een `keuken-wijzigen`-patch met een nieuw
 * `extra`-object VERVANGT het hele bestaande object. Twee maatregelen die allebei hun eigen
 * `{...huidigeExtra, X: true}` bouwen, clobberen elkaar dus als de tweede zijn patch baseert op
 * een VERouderde `huidigeExtra` die de eerste maatregel nog niet kende. §2/§3 van
 * `outputs/RAPPORT_taak11_2026-08-20.md` lost dit op door mutaties INCREMENTEEL tegen de
 * actuele staat te genereren — deze test bewijst dat dat werkt voor K-08 (vaatwasser) en K-05
 * (inductiekookplaat), allebei op de gedeelde keuken van de fixture.
 */
describe('patch-clobber — incrementele mutatie-opbouw', () => {
  it('K-08 en K-05 na elkaar toegepast overleven allebei in het eindscenario', () => {
    const k08 = standaardRegistry.get('K-08')!;
    const k05 = standaardRegistry.get('K-05')!;

    // Stap 1: K-08 tegen de as-is.
    const ctx1 = ctxVoor(testpand6Kamers);
    const kandidaat08 = k08.kandidaten(ctx1)[0];
    expect(kandidaat08).toBeDefined();
    const mutaties08 = k08.mutaties(ctx1, kandidaat08);
    const pandNa08 = pasScenarioToe(testpand6Kamers, mutaties08);

    // Stap 2: K-05 tegen de bijgewerkte staat (ná K-08) — dit is de incrementele regel.
    const ctx2 = ctxVoor(pandNa08);
    const kandidaat05 = k05.kandidaten(ctx2)[0];
    expect(kandidaat05).toBeDefined();
    const mutaties05 = k05.mutaties(ctx2, kandidaat05);
    const pandNaBeide = pasScenarioToe(pandNa08, mutaties05);

    const finaleKeuken = pandNaBeide.keukens.find((k) => k.ruimteNr === kandidaat08.doel.nr);
    expect(finaleKeuken).toBeDefined();

    // Beide voorzieningen moeten overleven — geen van beide mag door de ander zijn overschreven.
    expect(finaleKeuken!.extra.vaatwasmachine).toBe(true);
    expect(finaleKeuken!.extra.kookplaatInductie).toBe(true);
    // K-05 zet expliciet de andere kookplaattypen uit ("vervangen") — ook dat moet overleven.
    expect(finaleKeuken!.extra.kookplaatKeramisch).toBe(false);
    expect(finaleKeuken!.extra.kookplaatGas).toBe(false);
    // Voorzieningen die geen van beide maatregelen aanraakt, blijven ongewijzigd.
    expect(finaleKeuken!.extra.afzuiginstallatie).toBe(testpand6Kamers.keukens[0].extra.afzuiginstallatie);
    expect(finaleKeuken!.extra.koelkast).toBe(testpand6Kamers.keukens[0].extra.koelkast);
  });

  it('ter vergelijking: dezelfde twee mutaties allebei tegen de ONGEWIJZIGDE as-is gegenereerd clobberen elkaar wél', () => {
    const k08 = standaardRegistry.get('K-08')!;
    const k05 = standaardRegistry.get('K-05')!;
    const ctxAsIs = ctxVoor(testpand6Kamers);

    const mutaties08 = k08.mutaties(ctxAsIs, k08.kandidaten(ctxAsIs)[0]);
    const mutaties05 = k05.mutaties(ctxAsIs, k05.kandidaten(ctxAsIs)[0]);

    // Allebei toepassen zonder tussentijdse herberekening — de tweede patch (K-05) kent K-08's
    // wijziging niet en vervangt het hele extra-object met zijn EIGEN, verouderde momentopname.
    const pandGeclobberd = pasScenarioToe(testpand6Kamers, [...mutaties08, ...mutaties05]);
    const keukenGeclobberd = pandGeclobberd.keukens[0];

    expect(keukenGeclobberd.extra.kookplaatInductie).toBe(true);
    // De vaatwasser-wijziging van K-08 is verdwenen: K-05's patch was gebaseerd op de as-is
    // extra (vaatwasmachine: false) en overschrijft die met zijn eigen, oude momentopname.
    expect(keukenGeclobberd.extra.vaatwasmachine).toBe(false);
  });
});
