# Briefing: maatregelen die niet naast elkaar kunnen leven — 2026-08-26

## Aanleiding

Bij het toevoegen van K-09 (kitchenette 240 cm, naast het bestaande K-01 van 122 cm) bleek dat twee catalogusmaatregelen voor dezelfde kamer allebei een `keuken-toevoegen`-mutatie produceren. `toepassen.ts` gooit dan een harde `mutatieFout` ("ruimte X heeft al een keuken"), onopgevangen midden in een render-`useMemo`, zonder dat ergens in de app een `error.tsx` of try/catch zit — dus een kapotte pagina zonder foutmelding, op de handmatige scenariopagina bereikbaar met twee gewone vinkjes.

Dat is gerepareerd (zie onderaan). Op verzoek van de gebruiker is daarna de hele registry (`packages/engine/src/suggesties/registry/`, 50 maatregelen) systematisch nagelopen op vergelijkbare paren, zodat een toekomstig maatregelpakket niet onterecht op zo'n fout uitkomt.

## Methode

`toepassen.ts` kent vier "-toevoegen"-mutaties met een "bestaat al"-guard: `ruimte-toevoegen`, `keuken-toevoegen`, `sanitair-toevoegen`, `parkeerplek-toevoegen`. Voor elke maatregel die zo'n mutatie produceert is nagegaan of het doel **vast** is (risico als een ander, niet-gegroepeerd id hetzelfde doel raakt) of **dynamisch vrijgemaakt** (nooit een botsing, welke combinatie dan ook). Overige mutatietypes (`ruimte-wijzigen`, `sanitair-wijzigen`, `pand-patch`, …) hebben geen guard — die zijn idempotent of optellend en crashen nooit, hooguit dubbeltellend.

## Resultaat

| Mutatie | Producenten | Doel | Risico |
|---|---|---|---|
| `keuken-toevoegen` | K-01, K-09 | vaste privé-ruimte van de kamer | **Enige echte geval** — nu gedeeld `alternatiefGroep: 'K-kitchenette'` (engine) + auto-uitvinken op de scenariopagina (UI) |
| `sanitair-toevoegen` | S-01 | vaste privé-ruimte van de kamer | Veilig: S-01 checkt zelf of er al sanitair staat en wisselt dan naar `sanitair-wijzigen` i.p.v. `-toevoegen` |
| `sanitair-toevoegen` | S-02, S-03 | altijd een nieuw ruimteNr (`volgendeVrijeRuimteNr`, herberekend op mutatiemoment) | Veilig, kan S-01's vaste doel niet raken |
| `ruimte-toevoegen` | S-02, S-03, B-01, B-02, B-03 | allemaal dynamisch vrijgemaakt nummer | Veilig — zelfde patroon dat `pakketten.test.ts` al bevestigt ("S-02, S-03 en B-01 samen in Maximaal krijgen elk een uniek ruimtenummer") |
| `parkeerplek-toevoegen` | *(niemand)* | — | Geen enkele maatregel voegt een parkeerplek toe; P-01 wijzigt alleen bestaande |

Al eerder correct gegroepeerd (dus sowieso geen risico, maar ter volledigheid): V-01/V-02 delen `alternatiefGroep: 'verwarmen'`, I-02/I-03/A-04 delen `'wand-weg'`, E-01 t/m E-08 delen `'energielabel'`.

**Conclusie:** na de K-01/K-09-fix is er geen resterend paar meer dat een harde crash kan geven — noch in de algoritmische Basis/Comfort/Maximaal-opbouw (respecteert `alternatiefGroep` al langer), noch op de handmatige scenariopagina (nu apart beschermd, want die pagina past bewust `alternatiefGroep`-dedup niet toe — de gebruiker kiest daar expliciet).

## Openstaande vragen — geen crash, wel een blik waard

1. **B-01/B-02/B-03 op dezelfde kamer** (Frans balkon / balkon achtergevel / dakterras). Botst nooit technisch (elk krijgt een eigen nieuw ruimteNr), maar drie buitenruimtes tegelijk voor één kamer aanvinken is fysiek onwaarschijnlijk. Onder een `alternatiefGroep` zetten, of is er een reëel scenario met meerdere tegelijk?
2. **De onderliggende kwetsbaarheid is structureel, niet alleen dit ene patroon.** `pasScenarioToe` gooit ook een harde fout bij élke combinatie die een schema-ongeldig pand oplevert — niet alleen bij dubbele toevoegingen — en nergens in de app zit een `error.tsx` of try/catch. Een toekomstige nieuwe maatregel met een vergelijkbaar patroon (vast doel + guard, geen `alternatiefGroep`) zou dezelfde soort crash weer kunnen introduceren, zonder dat de bijectie-test (registry ↔ catalogus) dat vangt — die toetst volledigheid, niet onderlinge verenigbaarheid. Voorstel, nog niet gebouwd: een `error.tsx` als vangnet, plus eventueel een registry-lint die per doelSoort controleert of concurrerende "-toevoegen"-producenten allemaal een `alternatiefGroep` hebben.

## Wat al gefixt is (2026-08-26)

- `packages/engine/src/suggesties/registry/r5-keuken.ts`: K-01 (122 cm) en K-09 (240 cm, nieuw) delen `alternatiefGroep: 'K-kitchenette'`, presets geëxporteerd (`KITCHENETTE_122_PRESET`/`KITCHENETTE_240_PRESET`) en hergebruikt door een nieuwe snelinvulling op de invoerpagina (`RuimteLade.tsx`).
- `packages/engine/src/suggesties/pakketten.ts`: `doelSleutel()` geëxporteerd (was lokaal) — gedeelde groepeersleutel tussen de algoritmische pakketopbouw en de nieuwe UI-logica.
- `apps/web/src/lib/vergelijking/scenario-bouw.ts`: nieuwe `nieuweSelectieNaToggle()` — vinkt bij het aanvinken van een `alternatiefGroep`-lid automatisch elk ander geselecteerd lid van dezelfde groep + hetzelfde doel uit. Gebruikt in `Vergelijking.tsx` door zowel `toggle()` als `toggleHandmatigeMaatregel()`.
- Kostencatalogus (`resources/Kostenkentallen_WWSO_optimalisatie.xlsx` → `kostencatalogus_0.1.json`, 49 → 50 maatregelen): K-01/K-02 op offerte gezet (`resources/Kosten per keukenblok.xlsx`), V-03 (verwarming/verkoeling) bijgewerkt naar een eigen inschatting van €1500.
- Nieuwe test `apps/web/src/lib/vergelijking/scenario-bouw.test.ts` (4 gevallen) dekt precies het bugscenario. Volledige suite: 253/253 groen, tsc/eslint schoon op alle gewijzigde bestanden.
