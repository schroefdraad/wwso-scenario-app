import { Document, Page, View, Text, Image, Font, StyleSheet } from '@react-pdf/renderer';
import { pandWaarderingVan, type ControleResultaat, type EindtellingResultaat, type PandInvoer } from '@wwso/engine';
import { RUBRIEK_LABELS, RUBRIEK_VOLGORDE } from '../resultaat/rubriek-labels';
import { filterToelichtingVoorKamer, toegankelijkeRuimteNrsVoorKamer } from '../resultaat/toelichting-filter';
import { formateerDatum } from '../datum';
import { PUNTUM_MERK_ACCENT, PUNTUM_MERK_WIT, PUNTUM_WOORDMERK_INKT, PUNTUM_WOORDMERK_WIT } from './merkbeelden';
import { INTER_BOLD, INTER_REGULAR } from './lettertype';

/**
 * Inter i.p.v. de ingebouwde Helvetica (2026-09-12, feedback gebruiker: "hoe moeilijk is het
 * lettertype te veranderen?"). Bijkomend, niet-cosmetisch voordeel: de rekenmotor gebruikt "→"
 * in toelichtingsteksten (bijv. R1: "... → privé 13 m² + gedeeld ..."), een teken dat niet in
 * de standaard PDF-lettertypen (Helvetica/Times/Courier, WinAnsi-encoding) zit — dat rendert nu
 * dus als een verkeerd glyph. Inter bevat dat teken wél. Zie `lettertype.ts` voor hoe het
 * lettertypebestand zelf tot stand is gekomen (self-hosted, statisch, gesubset).
 */
Font.register({
  family: 'Inter',
  fonts: [
    { src: INTER_REGULAR, fontWeight: 400 },
    { src: INTER_BOLD, fontWeight: 700 },
  ],
});

/**
 * Statisch PDF-equivalent van `Resultaatscherm` (taak 13/14): dezelfde `EindtellingResultaat` en
 * `ControleResultaat[]`, al elders berekend — geen eigen doorrekening, om te garanderen dat de PDF
 * nooit kan afwijken van wat op het scherm staat. Op papier is er geen uit-/inklappen, dus alle
 * rubrieken en toelichtingsregels staan altijd volledig uitgeklapt.
 *
 * `stijlVariant` (2026-09-12, herontwerp header/footer/tabellen op verzoek van de gebruiker):
 * beide varianten delen exact dezelfde inhoud/tabellen, alleen de kop-/voettekst-chrome
 * verschilt. Keuze gevallen op 'band' (de donkere lint) als standaard (2026-09-19), 'licht'
 * blijft beschikbaar als alternatief. Zie `outputs/RAPPORT_pdf-herontwerp_2026-09-12.md` voor de
 * twee mockups die hieraan vooraf zijn gegaan.
 */

const KLEUR = {
  inkt: '#1a1d19',
  inktZacht: '#4d5249',
  inktZwak: '#8a8f83',
  lijn: '#d9d6cc',
  lijnSterk: '#b9b6a8',
  accent: '#1e4436',
  accentZacht: '#e2eae4',
  zebra: '#f6f7f3',
  waarschuwing: '#8a4f14',
  waarschuwingZacht: '#f2e6d3',
  wit: '#ffffff',
};

const HEADER_HOOGTE = 74;
const FOOTER_HOOGTE = 34;
const PAGINA_ZIJKANT = 42;

const stijl = StyleSheet.create({
  pagina: {
    paddingTop: HEADER_HOOGTE + 14,
    paddingBottom: FOOTER_HOOGTE + 10,
    fontSize: 9.5,
    fontFamily: 'Inter',
    color: KLEUR.inkt,
  },
  inhoud: { paddingHorizontal: PAGINA_ZIJKANT },

  // Header (fixed, elke pagina identiek) — licht
  headerLicht: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HOOGTE,
    paddingHorizontal: PAGINA_ZIJKANT,
    paddingTop: 16,
    backgroundColor: KLEUR.wit,
    borderBottomWidth: 1.5,
    borderBottomColor: KLEUR.accent,
  },
  // Header — band (donkergroen, vol-breedte)
  headerBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HOOGTE,
    paddingHorizontal: PAGINA_ZIJKANT,
    paddingTop: 16,
    backgroundColor: KLEUR.accent,
  },
  headerRij: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  merkRij: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  merkIcoon: { width: 15, height: 15 },
  // Woordmerk-bronbeeld is 632x201 (verhouding ≈3,14:1) — hoogte gelijk aan het icoon, breedte in verhouding.
  merkWoord: { width: 15 * (632 / 201), height: 15 },
  headerAdresBlok: { alignItems: 'flex-end' },
  headerAdres: { fontSize: 10.5, fontFamily: 'Inter', fontWeight: 700 },
  headerAdresLicht: { color: KLEUR.inkt },
  headerAdresBand: { color: KLEUR.wit },
  headerSub: { fontSize: 7.5, marginTop: 2 },
  headerSubLicht: { color: KLEUR.inktZacht },
  headerSubBand: { color: KLEUR.accentZacht },

  // Footer (fixed, elke pagina identiek)
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FOOTER_HOOGTE,
    paddingHorizontal: PAGINA_ZIJKANT,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: KLEUR.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerTekst: { fontSize: 7, color: KLEUR.inktZwak },

  titel: { fontSize: 18, fontFamily: 'Inter', fontWeight: 700, marginBottom: 3, marginTop: 4 },
  subtitel: { fontSize: 9.5, color: KLEUR.inktZacht, marginBottom: 14 },

  totalenBlok: {
    flexDirection: 'row',
    gap: 28,
    backgroundColor: KLEUR.accentZacht,
    borderRadius: 3,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  totalenLabel: { fontSize: 7.5, color: KLEUR.inktZacht, textTransform: 'uppercase' },
  totalenWaarde: { fontSize: 13, fontFamily: 'Inter', fontWeight: 700, color: KLEUR.accent, marginTop: 1 },

  // Generieke tabel-look, gebruikt voor zowel het kameroverzicht als de rubriektabellen.
  tabel: { borderWidth: 0.75, borderColor: KLEUR.lijnSterk, borderRadius: 3, overflow: 'hidden' },
  tabelKop: {
    flexDirection: 'row',
    backgroundColor: KLEUR.accentZacht,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  tabelKopCel: { fontSize: 7.5, fontFamily: 'Inter', fontWeight: 700, color: KLEUR.inktZacht, textTransform: 'uppercase' },
  tabelRij: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderTopWidth: 0.5,
    borderTopColor: KLEUR.lijn,
  },
  tabelRijZebra: { backgroundColor: KLEUR.zebra },
  tabelRijSlot: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderTopWidth: 0.75,
    borderTopColor: KLEUR.lijnSterk,
    backgroundColor: KLEUR.accentZacht,
  },

  overzichtLabelCol: { flexGrow: 2, flexBasis: 0 },
  overzichtCel: { fontSize: 9, width: 90, textAlign: 'right' },
  overzichtCelBold: { fontSize: 9.5, fontFamily: 'Inter', fontWeight: 700, width: 90, textAlign: 'right' },
  overzichtNaam: { fontSize: 9.5 },
  overzichtNaamBold: { fontSize: 9.5, fontFamily: 'Inter', fontWeight: 700 },

  kamerBlok: { marginTop: 20, marginBottom: 4 },
  kamerKop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  kamerNaam: { fontFamily: 'Inter', fontWeight: 700, fontSize: 12.5, color: KLEUR.accent },
  kamerMeta: { fontSize: 8.5, color: KLEUR.inktZacht, marginLeft: 8 },
  kamerSpacer: { flexGrow: 1 },
  kamerPunten: { fontFamily: 'Inter', fontWeight: 700, fontSize: 11, color: KLEUR.accent, marginLeft: 8 },
  kamerHuur: { fontFamily: 'Inter', fontWeight: 700, fontSize: 11, color: KLEUR.inkt, marginLeft: 10, minWidth: 62, textAlign: 'right' },

  rubriekLabelCol: { flexGrow: 1, flexBasis: 0 },
  rubriekLabel: { fontSize: 9, color: KLEUR.inkt },
  rubriekRuw: { fontSize: 7.5, color: KLEUR.inktZwak, width: 78, textAlign: 'right' },
  rubriekPunten: { fontSize: 9, fontFamily: 'Inter', fontWeight: 700, width: 52, textAlign: 'right' },
  toelichtingLijst: { marginTop: 3, paddingLeft: 6 },
  toelichtingRegel: { fontSize: 7.8, color: KLEUR.inktZacht, marginBottom: 1.5, lineHeight: 1.35 },

  subtotalenBlok: { marginTop: 8, paddingHorizontal: 2 },
  subtotaalRij: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  subtotaalLabel: { fontSize: 8.5, color: KLEUR.inktZacht },
  subtotaalWaarde: { fontSize: 8.5, fontFamily: 'Inter', fontWeight: 700 },
  eindtotaalRij: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginTop: 4,
    backgroundColor: KLEUR.accentZacht,
    borderRadius: 3,
  },
  eindtotaalLabel: { fontSize: 9.5, fontFamily: 'Inter', fontWeight: 700 },
  eindtotaalWaarde: { fontSize: 9.5, fontFamily: 'Inter', fontWeight: 700, color: KLEUR.accent },

  controlesBlok: { marginTop: 22 },
  controlesTitel: { fontFamily: 'Inter', fontWeight: 700, fontSize: 12, marginBottom: 8, color: KLEUR.accent },
  controleRij: { flexDirection: 'row', marginBottom: 7 },
  controleBadgeOk: {
    fontSize: 7,
    fontFamily: 'Inter', fontWeight: 700,
    color: KLEUR.accent,
    backgroundColor: KLEUR.accentZacht,
    borderRadius: 2,
    paddingVertical: 2,
    paddingHorizontal: 5,
    marginRight: 8,
    minWidth: 42,
    textAlign: 'center',
  },
  controleBadgeWaarschuwing: {
    fontSize: 7,
    fontFamily: 'Inter', fontWeight: 700,
    color: KLEUR.waarschuwing,
    backgroundColor: KLEUR.waarschuwingZacht,
    borderRadius: 2,
    paddingVertical: 2,
    paddingHorizontal: 5,
    marginRight: 8,
    minWidth: 42,
    textAlign: 'center',
  },
  controleInhoud: { flexGrow: 1 },
  controleTitel: { fontSize: 9, fontFamily: 'Inter', fontWeight: 700, marginBottom: 2 },
  controleBevinding: { fontSize: 8, color: KLEUR.inktZacht, marginBottom: 1, lineHeight: 1.35 },
});

function euro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

function Kop({ adres, subtitel, band }: { adres: string; subtitel: string; band: boolean }) {
  return (
    <View style={band ? stijl.headerBand : stijl.headerLicht} fixed>
      <View style={stijl.headerRij}>
        {/* eslint-disable jsx-a11y/alt-text -- react-pdf's <Image>, geen DOM <img>; het component kent geen alt-prop. */}
        <View style={stijl.merkRij}>
          <Image style={stijl.merkIcoon} src={band ? PUNTUM_MERK_WIT : PUNTUM_MERK_ACCENT} />
          <Image style={stijl.merkWoord} src={band ? PUNTUM_WOORDMERK_WIT : PUNTUM_WOORDMERK_INKT} />
        </View>
        {/* eslint-enable jsx-a11y/alt-text */}
        <View style={stijl.headerAdresBlok}>
          <Text style={[stijl.headerAdres, band ? stijl.headerAdresBand : stijl.headerAdresLicht]}>{adres}</Text>
          <Text style={[stijl.headerSub, band ? stijl.headerSubBand : stijl.headerSubLicht]}>{subtitel}</Text>
        </View>
      </View>
    </View>
  );
}

function Voet({ adres }: { adres: string }) {
  const gegenereerdOp = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return (
    <View style={stijl.footer} fixed>
      <Text style={stijl.footerTekst}>
        Puntum · WWSO-puntentelling · {adres}
      </Text>
      <Text style={stijl.footerTekst}>Gegenereerd op {gegenereerdOp}</Text>
      <Text style={stijl.footerTekst} render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PuntenrapportDocument({
  pand,
  eindtelling,
  controles,
  tarievensetPeildatum,
  stijlVariant = 'band',
}: {
  pand: PandInvoer;
  eindtelling: EindtellingResultaat;
  controles: ControleResultaat[];
  tarievensetPeildatum: string;
  stijlVariant?: 'licht' | 'band';
}) {
  const band = stijlVariant === 'band';
  const kamers = Object.keys(eindtelling.perKamer)
    .map(Number)
    .sort((a, b) => a - b);
  const waardering = pandWaarderingVan(eindtelling);
  const subtitel = `${pand.pand.stad} · ${pand.pand.aantalKamers} kamer${pand.pand.aantalKamers === 1 ? '' : 's'} · tarieven peildatum ${formateerDatum(tarievensetPeildatum)}`;

  return (
    <Document title={`Puntentelling ${pand.pand.adres}`}>
      <Page size="A4" style={stijl.pagina} wrap>
        <Kop adres={pand.pand.adres} subtitel={subtitel} band={band} />
        <Voet adres={pand.pand.adres} />

        <View style={stijl.inhoud}>
          <Text style={stijl.titel}>{pand.pand.adres}</Text>
          <Text style={stijl.subtitel}>{subtitel}</Text>

          <View style={stijl.totalenBlok}>
            <View>
              <Text style={stijl.totalenLabel}>Totaal maandhuur</Text>
              <Text style={stijl.totalenWaarde}>{euro(waardering.brutoJaarhuurEuro / 12)}</Text>
            </View>
            <View>
              <Text style={stijl.totalenLabel}>Totaal jaarhuur</Text>
              <Text style={stijl.totalenWaarde}>{euro(waardering.brutoJaarhuurEuro)}</Text>
            </View>
          </View>

          <View style={stijl.tabel}>
            <View style={stijl.tabelKop}>
              <View style={stijl.overzichtLabelCol}>
                <Text style={stijl.tabelKopCel}>Overzicht per kamer</Text>
              </View>
              <Text style={[stijl.tabelKopCel, { width: 90, textAlign: 'right' }]}>Punten</Text>
              <Text style={[stijl.tabelKopCel, { width: 90, textAlign: 'right' }]}>Maandhuur</Text>
            </View>
            {kamers.map((kamer, i) => {
              const resultaat = eindtelling.perKamer[kamer];
              return (
                <View key={kamer} style={[stijl.tabelRij, i % 2 === 1 ? stijl.tabelRijZebra : undefined]}>
                  <View style={stijl.overzichtLabelCol}>
                    <Text style={stijl.overzichtNaam}>Kamer {kamer}</Text>
                  </View>
                  <Text style={stijl.overzichtCel}>{resultaat.totaalPunten} pt</Text>
                  <Text style={stijl.overzichtCel}>{euro(resultaat.maxHuurEuro / 12)}</Text>
                </View>
              );
            })}
            <View style={stijl.tabelRijSlot}>
              <View style={stijl.overzichtLabelCol}>
                <Text style={stijl.overzichtNaamBold}>Totaal ({kamers.length} kamers)</Text>
              </View>
              <Text style={stijl.overzichtCelBold}>
                {kamers.reduce((s, k) => s + eindtelling.perKamer[k].totaalPunten, 0)} pt
              </Text>
              <Text style={stijl.overzichtCelBold}>{euro(waardering.brutoJaarhuurEuro / 12)}</Text>
            </View>
          </View>

          {kamers.map((kamer) => {
            const resultaat = eindtelling.perKamer[kamer];
            const toegankelijkeRuimteNrs = toegankelijkeRuimteNrsVoorKamer(pand, kamer);
            return (
              <View key={kamer} style={stijl.kamerBlok} wrap={false}>
                <View style={stijl.kamerKop}>
                  <Text style={stijl.kamerNaam}>Kamer {kamer}</Text>
                  {resultaat.monumentPunten > 0 && <Text style={stijl.kamerMeta}>waarvan +{resultaat.monumentPunten} monument</Text>}
                  <View style={stijl.kamerSpacer} />
                  <Text style={stijl.kamerPunten}>{resultaat.totaalPunten} pt</Text>
                  <Text style={stijl.kamerHuur}>{euro(resultaat.maxHuurEuro)}</Text>
                </View>

                <View style={stijl.tabel}>
                  <View style={stijl.tabelKop}>
                    <View style={stijl.rubriekLabelCol}>
                      <Text style={stijl.tabelKopCel}>Rubriek</Text>
                    </View>
                    <Text style={[stijl.tabelKopCel, { width: 78, textAlign: 'right' }]}>Ruw</Text>
                    <Text style={[stijl.tabelKopCel, { width: 52, textAlign: 'right' }]}>Punten</Text>
                  </View>

                  {RUBRIEK_VOLGORDE.map((key, i) => {
                    const punten = resultaat.rubrieken[key];
                    const puntenRuw = resultaat.rubriekenRuw[key];
                    const afgerond = puntenRuw !== punten;
                    const toelichting = filterToelichtingVoorKamer(eindtelling.rubriekToelichting[key], kamer, toegankelijkeRuimteNrs);
                    return (
                      <View key={key} style={[stijl.tabelRij, i % 2 === 1 ? stijl.tabelRijZebra : undefined]}>
                        <View style={{ flexGrow: 1, flexBasis: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <View style={stijl.rubriekLabelCol}>
                              <Text style={stijl.rubriekLabel}>{RUBRIEK_LABELS[key]}</Text>
                            </View>
                            <Text style={stijl.rubriekRuw}>{afgerond ? `${puntenRuw.toFixed(4)} ruw` : ''}</Text>
                            <Text style={stijl.rubriekPunten}>{punten} pt</Text>
                          </View>
                          {toelichting.length > 0 && (
                            <View style={stijl.toelichtingLijst}>
                              {toelichting.map((regel, j) => (
                                <Text key={j} style={stijl.toelichtingRegel}>
                                  · {regel}
                                </Text>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>

                <View style={stijl.subtotalenBlok}>
                  <View style={stijl.subtotaalRij}>
                    <Text style={stijl.subtotaalLabel}>Subtotaal R1 t/m R11</Text>
                    <Text style={stijl.subtotaalWaarde}>{resultaat.subtotaalR1TotEnMet11.toFixed(2)} pt</Text>
                  </View>
                  {resultaat.zorgwoningOpslagPunten > 0 && (
                    <View style={stijl.subtotaalRij}>
                      <Text style={stijl.subtotaalLabel}>Zorgwoning-opslag (+35%)</Text>
                      <Text style={stijl.subtotaalWaarde}>+{resultaat.zorgwoningOpslagPunten.toFixed(2)} pt</Text>
                    </View>
                  )}
                  {resultaat.monumentPunten > 0 && (
                    <View style={stijl.subtotaalRij}>
                      <Text style={stijl.subtotaalLabel}>Monumentpunten (§2.14.3)</Text>
                      <Text style={stijl.subtotaalWaarde}>+{resultaat.monumentPunten} pt</Text>
                    </View>
                  )}
                  <View style={stijl.subtotaalRij}>
                    <Text style={stijl.subtotaalLabel}>Huurprijs-lookup ({resultaat.puntenVoorHuurprijs} pt)</Text>
                    <Text style={stijl.subtotaalWaarde}>{euro(resultaat.maxHuurExclOpslagEuro)}</Text>
                  </View>
                  {resultaat.opslagPercentage > 0 && (
                    <View style={stijl.subtotaalRij}>
                      <Text style={stijl.subtotaalLabel}>
                        Monumentopslag ({resultaat.opslagGrondslag}, +{resultaat.opslagPercentage}%)
                      </Text>
                      <Text style={stijl.subtotaalWaarde}>{euro(resultaat.maxHuurEuro)}</Text>
                    </View>
                  )}
                  <View style={stijl.eindtotaalRij}>
                    <Text style={stijl.eindtotaalLabel}>Totaal kamer {kamer}</Text>
                    <Text style={stijl.eindtotaalWaarde}>
                      {resultaat.totaalPunten} pt · {euro(resultaat.maxHuurEuro)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          <View style={stijl.controlesBlok}>
            <Text style={stijl.controlesTitel}>Controles</Text>
            {controles.map((controle) => (
              <View key={controle.code} style={stijl.controleRij} wrap={false}>
                <Text style={controle.bevindingen.length === 0 ? stijl.controleBadgeOk : stijl.controleBadgeWaarschuwing}>
                  {controle.bevindingen.length === 0 ? 'OK' : 'LET OP'}
                </Text>
                <View style={stijl.controleInhoud}>
                  <Text style={stijl.controleTitel}>{controle.titel}</Text>
                  {controle.bevindingen.map((b, i) => (
                    <Text key={i} style={stijl.controleBevinding}>
                      · {b.omschrijving}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
