import { describe, expect, it } from 'vitest';
import { alleKostencatalogi, getKostencatalogus, nieuwsteKostencatalogus } from './index.js';

describe('kostencatalogus — steekproeven tegen resources/Kostenkentallen_WWSO_optimalisatie.xlsx', () => {
  const catalogus = getKostencatalogus('0.1');

  it('bevat alle 49 maatregelen uit de xlsx', () => {
    expect(catalogus.maatregelen).toHaveLength(49);
  });

  it('leest de aannames exact, als fractie in plaats van percentage', () => {
    expect(catalogus.aannames.regioIndex).toBe(1);
    expect(catalogus.aannames.btwTariefBouwRegulier).toBe(0.21);
    expect(catalogus.aannames.btwTariefRenovatieArbeid).toBe(0.09);
    expect(catalogus.aannames.prijspeilJaar).toBe(2026);
    expect(catalogus.aannames.huurdervingPerKamerPerMaandEuro).toBe(550);
  });

  it('leest een keukenmaatregel exact', () => {
    const k01 = catalogus.maatregelen.find((m) => m.id === 'K-01');
    expect(k01).toMatchObject({
      rubriek: 'R5',
      categorie: 'Keuken',
      eenheid: 'per kamer',
      kostenMinEuro: 1200,
      kostenVerwachtEuro: 1900,
      kostenMaxEuro: 3000,
      status: 'schatting',
    });
  });

  it('leest een proceskostenmaatregel (rubriek PROC) exact', () => {
    const pr06 = catalogus.maatregelen.find((m) => m.id === 'PR-06');
    expect(pr06).toMatchObject({
      rubriek: 'PROC',
      categorie: 'Proces',
      kostenVerwachtEuro: 550,
    });
  });

  it('heeft geen dubbele ids', () => {
    const ids = catalogus.maatregelen.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gebruikt alleen de gedocumenteerde statuswaarden', () => {
    for (const m of catalogus.maatregelen) {
      expect(['schatting', 'offerte', 'bevestigd']).toContain(m.status);
    }
  });
});

describe('getKostencatalogus / nieuwsteKostencatalogus — versiekeuze', () => {
  it('geeft de gevraagde versie exact terug', () => {
    expect(getKostencatalogus('0.1').versie).toBe('0.1');
  });

  it('gooit een expliciete fout bij een onbekende versie — geen stille fallback', () => {
    expect(() => getKostencatalogus('9.9')).toThrow(/Geen kostencatalogus gevonden/);
  });

  it('nieuwsteKostencatalogus geeft de laatste van alleKostencatalogi terug', () => {
    const alle = alleKostencatalogi();
    expect(nieuwsteKostencatalogus()).toBe(alle.at(-1));
  });
});
