'use client';

import { useEffect, useRef, useState } from 'react';
import { alleGemeentes, coropVoorGemeente, gemeentesVoorWoonplaats } from '@wwso/data';
import { Energielabel, MonumentStatus } from '@wwso/engine';
import { useInvoer } from './InvoerContext';
import { Toggle } from './Toggle';
import { InfoBadge } from '../InfoBadge';
import styles from './styles.module.css';
import type { OphaalVeld, PandVeldenState } from '../../lib/invoer/types';
import { bepaalToepassing, herkomstTekst, type AdresKandidaat, type OpgehaaldePand } from '../../lib/invoer/gegevensOphalen';
import type { OphaalAntwoord } from '../../lib/invoer/gegevensOphalenServer';

const ENERGIELABELS = Energielabel.options;
const MONUMENTSTATUSSEN = MonumentStatus.options;
const ALLE_GEMEENTES = alleGemeentes();

/**
 * De WOZ-peildatum is per wet altijd 1 januari van het waarderingsjaar (Wet WOZ) — nooit een
 * andere dag/maand. Een vrije datepicker liet dus onmogelijke datums toe; een jaartallen-select
 * kan dat niet meer. Reikt 15 jaar terug, berekend vanaf het huidige jaar zodat de lijst niet
 * jaarlijks handmatig bijgewerkt hoeft te worden.
 */
const WOZ_PEILDATUM_JAREN = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i);

function labelTekst(label: PandVeldenState['energielabel']): string {
  return label === 'Bouwjaar' ? 'Geen label bekend (val terug op bouwjaar)' : label;
}

export function PandFormulier() {
  const { state, dispatch } = useInvoer();
  const { pand } = state;

  const zet = <K extends keyof PandVeldenState>(veld: K, waarde: PandVeldenState[K]) =>
    dispatch({ soort: 'PAND_VELD_GEWIJZIGD', veld, waarde });

  /** Vervangt de vorige, reactief flikkerende weergave (Taxatiewaarde verscheen/verdween zodra je
   * in WOZ-waarde typte) door een bewuste, sticky keuze — rustiger tijdens het invullen (feedback
   * 2026-09-05). Bij het wisselen wordt het andere veld leeggemaakt, zodat de motor (§2.11.1:
   * geen WOZ-waarde → 85% van de taxatiewaarde) nooit op een verborgen, stale waarde rekent. */
  const [gebruikTaxatie, setGebruikTaxatie] = useState(() => !pand.wozWaarde && !!pand.taxatiewaardeEuro);
  const wisselWaardeModus = (naarTaxatie: boolean) => {
    setGebruikTaxatie(naarTaxatie);
    if (naarTaxatie) zet('wozWaarde', '');
    else zet('taxatiewaardeEuro', '');
  };

  /** Zet gemeente + COROP-gebied in één keer, zodat ze nooit los van elkaar raken (COROP-
   * automatisering, 2026-09-04). */
  const zetGemeente = (gemeente: string) => {
    zet('gemeente', gemeente);
    zet('coropGebied', coropVoorGemeente(gemeente) ?? '');
  };

  // ── Gegevens ophalen (BAG + WOZ-loket, besluit eigenaar 2026-10-09) ──────────────────────────
  const go = state.gegevensOphalen;
  const [bezig, setBezig] = useState(false);
  const [keuzes, setKeuzes] = useState<AdresKandidaat[] | null>(null);
  /** De respons komt pas na een seconde of meer: bepaal wat er gevuld wordt op basis van de invoer
   * van DAN, niet van het moment van klikken (de gebruiker kan intussen doortypen). */
  const pandRef = useRef(pand);
  const taxatieRef = useRef(gebruikTaxatie);
  pandRef.current = pand;
  taxatieRef.current = gebruikTaxatie;
  const aanwezig = useRef(true);
  useEffect(() => {
    aanwezig.current = true;
    return () => {
      aanwezig.current = false;
    };
  }, []);

  const meld = (soort: 'ok' | 'let', tekst: string) => dispatch({ soort: 'GEGEVENS_MELDING_GEZET', melding: { soort, tekst } });

  const haalOp = async (verzoek: { adres: string; stad: string } | { nummeraanduidingId: string }) => {
    setBezig(true);
    try {
      const res = await fetch('/api/gegevens-ophalen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(verzoek),
      });
      let antwoord: OphaalAntwoord | null = null;
      try {
        antwoord = (await res.json()) as OphaalAntwoord;
      } catch {
        antwoord = null;
      }
      if (!aanwezig.current) return;
      if (res.status === 401) return meld('let', 'Je bent niet (meer) ingelogd. Log opnieuw in en probeer het nog eens. Je kunt de gegevens ook zelf invullen.');
      if (!antwoord || antwoord.status === 'fout') {
        return meld('let', `${antwoord?.status === 'fout' ? antwoord.bericht : 'Ophalen lukte niet.'} Probeer het later nog eens of vul de gegevens zelf in.`);
      }
      if (antwoord.status === 'niet_gevonden') {
        setKeuzes(null);
        return meld('let', 'Geen woning gevonden op dit adres. Controleer straat, huisnummer (met toevoeging, bijvoorbeeld 49-A) en stad, of vul de gegevens zelf in.');
      }
      if (antwoord.status === 'kiezen') {
        setKeuzes(antwoord.kandidaten);
        return meld('let', 'Op dit adres staan meerdere woningen. Kies welke je bedoelt.');
      }
      setKeuzes(null);
      const gegevens: OpgehaaldePand = antwoord.gegevens;
      dispatch({ soort: 'GEGEVENS_OPGEHAALD', toepassing: bepaalToepassing(pandRef.current, gegevens, { taxatieModus: taxatieRef.current }) });
    } catch {
      if (aanwezig.current) meld('let', 'Ophalen lukte niet (geen verbinding?). Probeer het later nog eens of vul de gegevens zelf in.');
    } finally {
      if (aanwezig.current) setBezig(false);
    }
  };

  const klikOphalen = () => {
    setKeuzes(null);
    if (!pand.adres.trim()) return meld('let', 'Vul eerst een adres in (straat en huisnummer), dan kan Puntum de gegevens ophalen.');
    void haalOp({ adres: pand.adres, stad: pand.stad });
  };

  const herkomst = (v: OphaalVeld) => go?.herkomst[v];
  /** Klein vinkje achter het label, met de bron in een tooltip (geen bronteksten naast velden). */
  const vinkje = (v: OphaalVeld) => {
    const h = herkomst(v);
    return h ? (
      <span className={styles.ophaalVinkje} title={`Opgehaald: ${herkomstTekst(h)}`} role="img" aria-label={`Opgehaald uit ${herkomstTekst(h)}`}>
        {' '}
        ✓
      </span>
    ) : null;
  };
  const veldKlasse = (v: OphaalVeld) => (go?.conflicten.some((c) => c.veld === v) ? styles.veldConflict : herkomst(v) ? styles.veldOpgehaald : undefined);
  /** Gebruiker had zelf al een andere waarde: nooit stil overschrijven, de gebruiker beslist. */
  const conflictRegel = (v: OphaalVeld) => {
    const c = go?.conflicten.find((x) => x.veld === v);
    if (!c) return null;
    return (
      <span className={styles.conflictRegel}>
        Opgehaald: <strong>{c.opgehaaldTekst}</strong>
        <button type="button" className={`${styles.btn} ${styles.btnKlein}`} onClick={() => dispatch({ soort: 'GEGEVENS_CONFLICT_OPGELOST', veld: v, gebruik: true })}>
          Gebruik
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnKlein}`} onClick={() => dispatch({ soort: 'GEGEVENS_CONFLICT_OPGELOST', veld: v, gebruik: false })}>
          Houd mijne
        </button>
      </span>
    );
  };

  /** Suggereert een gemeente op basis van de VOLLEDIG getypte stad — alleen bij een EENDUIDIGE
   * match (harde regel 4: nooit gokken). Bij nul of meerdere kandidaten (bijv. "Aalst" ligt in
   * drie gemeentes) blijft de gemeente ongewijzigd en kiest de gebruiker zelf hieronder.
   *
   * Draait bewust pas op `onBlur`, niet op elke toetsaanslag: ~20% van de ~5.400 plaatsnamen
   * heeft een kortere plaatsnaam als exacte prefix (bijv. "Rott" is zelf een bestaand plaatsje in
   * Vaals, en typt zich vanzelf uit tijdens "Rotterdam"). Op `onChange` sloeg de suggestie dan
   * halverwege het typen al toe op die tussentijdse substring, en omdat een dáárna meerduidige
   * uitkomst (zoals "Rotterdam" zelf, met 2 gemeentes) de gemeente bewust ongewijzigd laat, bleef
   * die verkeerde tussentijdse gemeente stilzwijgend staan (bevinding gebruiker, 2026-09-19). */
  const zetStad = (stad: string) => zet('stad', stad);
  const suggereerGemeenteOpBlur = () => {
    const kandidaten = gemeentesVoorWoonplaats(pand.stad);
    if (kandidaten.length === 1) zetGemeente(kandidaten[0]);
  };

  const gemeenteKandidaten = pand.stad ? gemeentesVoorWoonplaats(pand.stad) : [];
  /** Bij een eenduidige of onbekende stad blijft de volledige lijst beschikbaar (vrij te
   * overschrijven); bij een meerduidige stad (bijv. "Aalst", drie gemeentes) heeft kiezen uit
   * alle 342 gemeentes geen toegevoegde waarde — de juiste zit toch al in de kandidatenlijst. */
  const gemeenteOpties =
    gemeenteKandidaten.length > 1
      ? pand.gemeente && !gemeenteKandidaten.includes(pand.gemeente)
        ? [pand.gemeente, ...gemeenteKandidaten]
        : gemeenteKandidaten
      : ALLE_GEMEENTES;

  // Sectiestatus staat sinds 2026-10-03 hier in de kop, niet meer als badge in de topnavigatie.
  const pandCompleet = !!(pand.adres && pand.stad && pand.coropGebied && pand.wozOppervlak && pand.bouwjaar);

  return (
    <section className={styles.blok} id="sectie-woning">
      <div className={styles.blokKop}>
        <h2>① Woning</h2>
        <span
          className={`${styles.badge} ${pandCompleet ? styles.badgeOk : ''}`}
          title={pandCompleet ? 'Alle verplichte woninggegevens zijn ingevuld' : 'Nog niet alle verplichte woninggegevens zijn ingevuld'}
        >
          {pandCompleet ? '✓' : '…'}
        </span>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnKlein} ${styles.ophaalKnop}`}
          onClick={klikOphalen}
          disabled={bezig}
          title="Haalt gemeente, bouwjaar, WOZ-waarde en oppervlak op uit de BAG en het WOZ-loket"
        >
          {bezig ? 'Ophalen…' : 'Gegevens ophalen'}
        </button>
      </div>
      <div className={styles.blokInhoud}>
        {go?.melding && (
          <div className={`${styles.ophaalMelding} ${go.melding.soort === 'ok' ? styles.ophaalOk : styles.ophaalLet}`} role="status">
            <span>{go.melding.tekst}</span>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnKlein} ${styles.btnGhost}`}
              aria-label="Melding sluiten"
              onClick={() => {
                setKeuzes(null);
                dispatch({ soort: 'GEGEVENS_MELDING_GEZET', melding: null });
              }}
            >
              ×
            </button>
          </div>
        )}
        {keuzes && (
          <div className={styles.ophaalKeuzes}>
            {keuzes.map((k) => (
              <button key={k.nummeraanduidingId} type="button" className={styles.btn} disabled={bezig} onClick={() => void haalOp({ nummeraanduidingId: k.nummeraanduidingId })}>
                {k.adres}, {k.postcode} {k.woonplaats}
              </button>
            ))}
          </div>
        )}
        <div className={styles.pandGrid}>
          <div className={styles.veldRij}>
            <div className={styles.veld}>
              <label htmlFor="p-adres">Adres{vinkje('adres')}</label>
              <input id="p-adres" className={veldKlasse('adres')} value={pand.adres} onChange={(e) => zet('adres', e.target.value)} />
              {conflictRegel('adres')}
            </div>
            <div className={styles.veld}>
              <label htmlFor="p-stad">Stad{vinkje('stad')}</label>
              <input id="p-stad" className={veldKlasse('stad')} value={pand.stad} onChange={(e) => zetStad(e.target.value)} onBlur={suggereerGemeenteOpBlur} />
              {conflictRegel('stad')}
            </div>
            <div className={styles.veld}>
              <span className={styles.labelRij}>
                <label htmlFor="p-gemeente">Gemeente{vinkje('gemeente')}</label>
                {/* Alleen nog bij een meerduidige stad (tekstreview 2026-10-03: de standaardtoelichting mocht weg). */}
                {gemeenteKandidaten.length > 1 && (
                  <InfoBadge>
                    &quot;{pand.stad}&quot; komt voor in meerdere gemeentes ({gemeenteKandidaten.join(', ')}) — kies de juiste.
                  </InfoBadge>
                )}
              </span>
              <select id="p-gemeente" className={veldKlasse('gemeente')} value={pand.gemeente} onChange={(e) => zetGemeente(e.target.value)}>
                <option value="">— kies —</option>
                {gemeenteOpties.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {conflictRegel('gemeente')}
            </div>
            <div className={`${styles.veld} ${styles.veldGate}`}>
              <span className={styles.labelRij}>
                <label htmlFor="p-kamers">Aantal kamers</label>
                <InfoBadge>Bepaalt het aantal kolommen in de toewijzing hieronder</InfoBadge>
              </span>
              <input
                id="p-kamers"
                type="number"
                min={1}
                max={12}
                value={pand.aantalKamers}
                onChange={(e) => zet('aantalKamers', e.target.value)}
              />
            </div>
          </div>
          <div className={styles.veldRij}>
            <div className={styles.veld}>
              {gebruikTaxatie ? (
                <>
                  <label htmlFor="p-taxatie">Taxatiewaarde (€)</label>
                  <input
                    id="p-taxatie"
                    type="number"
                    min={0}
                    value={pand.taxatiewaardeEuro}
                    onChange={(e) => zet('taxatiewaardeEuro', e.target.value)}
                  />
                </>
              ) : (
                <>
                  <label htmlFor="p-woz">WOZ-waarde (€){vinkje('wozWaarde')}</label>
                  <input id="p-woz" className={veldKlasse('wozWaarde')} type="number" min={0} value={pand.wozWaarde} onChange={(e) => zet('wozWaarde', e.target.value)} />
                  {conflictRegel('wozWaarde')}
                </>
              )}
              <span className={styles.wozTaxatieRij}>
                <Toggle checked={gebruikTaxatie} onChange={wisselWaardeModus} label="Geen WOZ-waarde bekend, alleen taxatiewaarde" />
                Geen WOZ-waarde bekend, alleen taxatiewaarde
                <InfoBadge>Zonder WOZ-waarde wordt er gerekend met 85% van de taxatiewaarde (Beleidsboek §2.11.1).</InfoBadge>
              </span>
            </div>
            <div className={styles.veld}>
              <span className={styles.labelRij}>
                <label htmlFor="p-wozpeildatum">WOZ-peildatum{vinkje('wozPeildatum')}</label>
                <InfoBadge>Altijd 1 januari van het waarderingsjaar (Wet WOZ).</InfoBadge>
              </span>
              <select
                id="p-wozpeildatum"
                className={veldKlasse('wozPeildatum')}
                value={pand.wozPeildatum.slice(0, 4)}
                onChange={(e) => zet('wozPeildatum', e.target.value ? `${e.target.value}-01-01` : '')}
              >
                <option value="">— kies —</option>
                {WOZ_PEILDATUM_JAREN.map((jaar) => (
                  <option key={jaar} value={jaar}>
                    1 januari {jaar}
                  </option>
                ))}
              </select>
              {conflictRegel('wozPeildatum')}
            </div>
            <div className={styles.veld}>
              <label htmlFor="p-wozopp">WOZ-oppervlak (m²){vinkje('wozOppervlak')}</label>
              <input
                id="p-wozopp"
                className={veldKlasse('wozOppervlak')}
                type="number"
                min={0}
                value={pand.wozOppervlak}
                onChange={(e) => zet('wozOppervlak', e.target.value)}
              />
              {conflictRegel('wozOppervlak')}
            </div>
          </div>
          <div className={styles.veldRij}>
            <div className={styles.veld}>
              <span className={styles.labelRij}>
                <label htmlFor="p-label">Energielabel</label>
                {pand.energielabel === 'Bouwjaar' && <InfoBadge>Alleen als er geen label bekend is, rekent de berekening met de bouwjaargrenzen (R4).</InfoBadge>}
              </span>
              <select id="p-label" value={pand.energielabel} onChange={(e) => zet('energielabel', e.target.value as PandVeldenState['energielabel'])}>
                {ENERGIELABELS.map((l) => (
                  <option key={l} value={l}>
                    {labelTekst(l)}
                  </option>
                ))}
              </select>
              {pand.energielabel !== 'Bouwjaar' && (
                <span className={styles.wozTaxatieRij}>
                  <Toggle
                    checked={pand.energielabelOnbekendOfVervallen}
                    onChange={(v) => zet('energielabelOnbekendOfVervallen', v)}
                    label="Ingangsdatum onbekend of ouder dan 10 jaar"
                  />
                  Ingangsdatum onbekend of ouder dan 10 jaar
                  <InfoBadge>Aangevinkt valt de berekening terug op de bouwjaargrenzen net als bij &quot;geen label bekend&quot;.</InfoBadge>
                </span>
              )}
            </div>
            <div className={styles.veld}>
              <label htmlFor="p-bouwjaar">Bouwjaar{vinkje('bouwjaar')}</label>
              <input id="p-bouwjaar" className={veldKlasse('bouwjaar')} type="number" value={pand.bouwjaar} onChange={(e) => zet('bouwjaar', e.target.value)} />
              {conflictRegel('bouwjaar')}
            </div>
          </div>
          <div className={styles.veldRij}>
            <div className={styles.veld}>
              <label htmlFor="p-monument">Monument</label>
              <select id="p-monument" value={pand.monument} onChange={(e) => zet('monument', e.target.value as PandVeldenState['monument'])}>
                {MONUMENTSTATUSSEN.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            {pand.monument === 'Rijks' && (
              <div className={styles.veld}>
                <span className={styles.labelRij}>
                  <label htmlFor="p-huurdatum">Datum huurovereenkomst</label>
                  <InfoBadge>Bepaalt of de opslag +35% op de huurprijs is of +10 punten (Beleidsboek §2.14.3).</InfoBadge>
                </span>
                <input
                  id="p-huurdatum"
                  type="date"
                  value={pand.huurovereenkomstDatum}
                  onChange={(e) => zet('huurovereenkomstDatum', e.target.value)}
                />
              </div>
            )}
            <div className={styles.veld}>
              <span className={styles.labelRij}>
                <label>Zorgwoning</label>
                <InfoBadge>+35% op R1 t/m R11 (Beleidsboek §2.12.1)</InfoBadge>
              </span>
              <Toggle checked={pand.zorgwoning} onChange={(v) => zet('zorgwoning', v)} label="Zorgwoning" />
            </div>
          </div>
        </div>

        <div className={styles.subKop}>
          <h3>Energielabel-kosteninschattingen</h3>
          <span className={styles.hint}>Eigen inschatting realisatie doellabel voor de scenariovergelijking (optioneel).</span>
        </div>
        <div className={styles.pandGrid}>
          <div className={styles.veldRij}>
            <div className={styles.veld}>
              <label htmlFor="p-label-kosten-aplus">Kosten label A+ (€)</label>
              <input
                id="p-label-kosten-aplus"
                type="number"
                min={0}
                value={pand.energielabelKostenAPlus}
                onChange={(e) => zet('energielabelKostenAPlus', e.target.value)}
              />
            </div>
            <div className={styles.veld}>
              <label htmlFor="p-label-kosten-aplusplus">Kosten label A++ (€)</label>
              <input
                id="p-label-kosten-aplusplus"
                type="number"
                min={0}
                value={pand.energielabelKostenAPlusPlus}
                onChange={(e) => zet('energielabelKostenAPlusPlus', e.target.value)}
              />
            </div>
            <div className={styles.veld}>
              <label htmlFor="p-label-kosten-aplusplusplus">Kosten label A+++ (€)</label>
              <input
                id="p-label-kosten-aplusplusplus"
                type="number"
                min={0}
                value={pand.energielabelKostenAPlusPlusPlus}
                onChange={(e) => zet('energielabelKostenAPlusPlusPlus', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
