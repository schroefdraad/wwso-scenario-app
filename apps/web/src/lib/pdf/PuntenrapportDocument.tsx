import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { pandWaarderingVan, type ControleResultaat, type EindtellingResultaat, type PandInvoer } from '@wwso/engine';
import { RUBRIEK_LABELS, RUBRIEK_VOLGORDE } from '../resultaat/rubriek-labels';
import { filterToelichtingVoorKamer, toegankelijkeRuimteNrsVoorKamer } from '../resultaat/toelichting-filter';

/**
 * Statisch PDF-equivalent van `Resultaatscherm` (taak 13/14): dezelfde `EindtellingResultaat` en
 * `ControleResultaat[]`, al elders berekend — geen eigen doorrekening, om te garanderen dat de PDF
 * nooit kan afwijken van wat op het scherm staat. Op papier is er geen uit-/inklappen, dus alle
 * rubrieken en toelichtingsregels staan altijd volledig uitgeklapt.
 */

const KLEUR = {
  inkt: '#1a1d19',
  inktZacht: '#4d5249',
  inktZwak: '#8a8f83',
  lijn: '#d9d6cc',
  lijnSterk: '#b9b6a8',
  accent: '#1e4436',
  accentZacht: '#e2eae4',
  waarschuwing: '#8a4f14',
  waarschuwingZacht: '#f2e6d3',
};

const stijl = StyleSheet.create({
  pagina: {
    paddingTop: 44,
    paddingBottom: 40,
    paddingHorizontal: 42,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: KLEUR.inkt,
  },
  titel: { fontSize: 17, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  subtitel: { fontSize: 9.5, color: KLEUR.inktZacht, marginBottom: 2 },
  gegenereerd: {
    position: 'absolute',
    top: 20,
    right: 42,
    fontSize: 7.5,
    color: KLEUR.inktZwak,
  },
  headerLijn: { borderBottomWidth: 1.5, borderBottomColor: KLEUR.accent, marginTop: 10, marginBottom: 16 },

  totalenBlok: {
    flexDirection: 'row',
    gap: 28,
    backgroundColor: KLEUR.accentZacht,
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  totalenLabel: { fontSize: 7.5, color: KLEUR.inktZacht, textTransform: 'uppercase' },
  totalenWaarde: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: KLEUR.accent, marginTop: 1 },

  kamerBlok: { marginBottom: 16 },
  kamerKop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: KLEUR.accentZacht,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
    marginBottom: 4,
  },
  kamerNaam: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: KLEUR.accent },
  kamerMeta: { fontSize: 8.5, color: KLEUR.inktZacht, marginLeft: 8 },
  kamerSpacer: { flexGrow: 1 },
  kamerPunten: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: KLEUR.accent, marginLeft: 8 },
  kamerHuur: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: KLEUR.inkt, marginLeft: 10, minWidth: 62, textAlign: 'right' },

  tabelHoofd: {
    flexDirection: 'row',
    borderBottomWidth: 0.75,
    borderBottomColor: KLEUR.lijnSterk,
    paddingBottom: 3,
    marginBottom: 2,
  },
  tabelHoofdCel: { fontSize: 7.5, color: KLEUR.inktZwak, textTransform: 'uppercase' },

  rubriekRij: { borderBottomWidth: 0.5, borderBottomColor: KLEUR.lijn, paddingVertical: 3.5 },
  rubriekKop: { flexDirection: 'row', alignItems: 'baseline' },
  rubriekLabelCol: { flexGrow: 1, flexBasis: 0 },
  rubriekLabel: { fontSize: 9, color: KLEUR.inkt },
  rubriekRuw: { fontSize: 7.5, color: KLEUR.inktZwak, width: 78, textAlign: 'right' },
  rubriekPunten: { fontSize: 9, fontFamily: 'Helvetica-Bold', width: 52, textAlign: 'right' },
  toelichtingLijst: { marginTop: 3, paddingLeft: 6 },
  toelichtingRegel: { fontSize: 7.8, color: KLEUR.inktZacht, marginBottom: 1.5, lineHeight: 1.35 },

  subtotalenBlok: { marginTop: 6, paddingTop: 6, borderTopWidth: 0.75, borderTopColor: KLEUR.lijnSterk },
  subtotaalRij: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1.5 },
  subtotaalLabel: { fontSize: 8.5, color: KLEUR.inktZacht },
  subtotaalWaarde: { fontSize: 8.5, fontFamily: 'Helvetica-Bold' },
  eindtotaalRij: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4, marginTop: 2, borderTopWidth: 0.75, borderTopColor: KLEUR.lijnSterk },
  eindtotaalLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  eindtotaalWaarde: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: KLEUR.accent },

  controlesBlok: { marginTop: 6 },
  controlesTitel: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 8, color: KLEUR.accent },
  controleRij: { flexDirection: 'row', marginBottom: 7 },
  controleBadgeOk: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
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
    fontFamily: 'Helvetica-Bold',
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
  controleTitel: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  controleBevinding: { fontSize: 8, color: KLEUR.inktZacht, marginBottom: 1, lineHeight: 1.35 },

  paginanummer: {
    position: 'absolute',
    bottom: 20,
    right: 42,
    fontSize: 7.5,
    color: KLEUR.inktZwak,
  },
});

function euro(bedrag: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag);
}

export function PuntenrapportDocument({
  pand,
  eindtelling,
  controles,
  tarievensetPeildatum,
}: {
  pand: PandInvoer;
  eindtelling: EindtellingResultaat;
  controles: ControleResultaat[];
  tarievensetPeildatum: string;
}) {
  const kamers = Object.keys(eindtelling.perKamer)
    .map(Number)
    .sort((a, b) => a - b);
  const gegenereerdOp = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const waardering = pandWaarderingVan(eindtelling);

  return (
    <Document title={`Puntentelling ${pand.pand.adres}`}>
      <Page size="A4" style={stijl.pagina} wrap>
        <Text style={stijl.gegenereerd} fixed>
          WWSO puntentelling · gegenereerd op {gegenereerdOp}
        </Text>

        <Text style={stijl.titel}>{pand.pand.adres}</Text>
        <Text style={stijl.subtitel}>
          {pand.pand.stad} · {pand.pand.aantalKamers} kamer{pand.pand.aantalKamers === 1 ? '' : 's'} · tarieven peildatum {tarievensetPeildatum}
        </Text>
        <View style={stijl.headerLijn} />

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

              <View style={stijl.tabelHoofd}>
                <View style={stijl.rubriekLabelCol}>
                  <Text style={stijl.tabelHoofdCel}>Rubriek</Text>
                </View>
                <Text style={[stijl.tabelHoofdCel, { width: 78, textAlign: 'right' }]}>Ruw</Text>
                <Text style={[stijl.tabelHoofdCel, { width: 52, textAlign: 'right' }]}>Punten</Text>
              </View>

              {RUBRIEK_VOLGORDE.map((key) => {
                const punten = resultaat.rubrieken[key];
                const puntenRuw = resultaat.rubriekenRuw[key];
                const afgerond = puntenRuw !== punten;
                const toelichting = filterToelichtingVoorKamer(eindtelling.rubriekToelichting[key], kamer, toegankelijkeRuimteNrs);
                return (
                  <View key={key} style={stijl.rubriekRij}>
                    <View style={stijl.rubriekKop}>
                      <View style={stijl.rubriekLabelCol}>
                        <Text style={stijl.rubriekLabel}>{RUBRIEK_LABELS[key]}</Text>
                      </View>
                      <Text style={stijl.rubriekRuw}>{afgerond ? `${puntenRuw.toFixed(4)} ruw` : ''}</Text>
                      <Text style={stijl.rubriekPunten}>{punten} pt</Text>
                    </View>
                    {toelichting.length > 0 && (
                      <View style={stijl.toelichtingLijst}>
                        {toelichting.map((regel, i) => (
                          <Text key={i} style={stijl.toelichtingRegel}>
                            · {regel}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

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

        <View style={stijl.controlesBlok} wrap={false}>
          <Text style={stijl.controlesTitel}>Controles</Text>
          {controles.map((controle) => (
            <View key={controle.code} style={stijl.controleRij}>
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

        <Text style={stijl.paginanummer} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
