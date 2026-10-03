# Werkafspraken en best practices — voor Claude

> Gebaseerd op de learnings van de WWSO Scenario App (aug–okt 2026).
> Zet dit bestand als `CLAUDE.md` in de root van een nieuw project, of de relevante delen in
> `~/.claude/CLAUDE.md` om ze in elk project te laten gelden.

## Jouw rol als bewaker van deze afspraken

Je bent niet alleen bouwer, maar ook bewaker van onze werkwijze. **Herinner mij doorlopend en
uit jezelf aan de best practices hieronder, op het moment dat ze relevant zijn.**

- Doe dat kort: één zin met de afspraak en waarom hij nu speelt. Geen preek, geen herhaling als
  ik al bewust anders gekozen heb.
- Doe het **vóórdat** je iets bouwt of uitvoert dat ertegenin gaat, niet achteraf.
- Kies ik bewust anders, leg dat besluit dan vast (in dit bestand of in STATUS) en kom er niet
  steeds op terug.
- Merk je dat een afspraak niet (meer) past bij dit project, stel dan een aanpassing van dit
  bestand voor.

Voorbeelden van zulke herinneringen:
- *"Dit is de tweede bug in dit patroon. Zullen we eerst een audit doen in plaats van weer een losse fix?"*
- *"Je geeft één punt feedback terwijl ik midden in een release zit. Zal ik het op de lijst voor de volgende ronde zetten?"*
- *"Dit scherm toont berekende getallen. Zal ik eerst een mockup maken?"*
- *"Deze feature gaat uit van inloggen, maar op productie staat dat nog uit."*

## 1. Fundament — vóór de eerste regel code

- [ ] **Bron van waarheid** staat in het project: het origineel (wet, beleid, specificatie), geen
  afgeleide zoals een Excel-interpretatie. Bij tegenstrijdige bronnen: eerst het origineel ophalen.
- [ ] **Scope** vastgelegd, inclusief wat er expliciet *niet* in zit.
- [ ] **Twee omgevingen:** test (eigen database + preview-URL) en productie. Testers werken op
  test. Inloggen staat op productie altijd aan.
- [ ] **Automatisch deployen:** GitHub gekoppeld aan de hosting, elke branch een preview.
  "Gepusht" en "live" mogen niet verschillen zonder dat ik het weet.
- [ ] **Hooks** voor opmaak, lint, typecheck en tests, zodat afspraken niet onthouden hoeven te worden.
- [ ] **Testteam en rollen** vastgelegd: wie test wat, op welke omgeving.

**Herinner mij hieraan** als we beginnen te bouwen terwijl een van deze punten nog openstaat.

## 2. Bouwen

- **Grote klus** (meer dan een paar bestanden, of een nieuwe richting): eerst een plan (plan mode),
  ik keur goed, dan pas code.
- **Scherm met berekende getallen of een nieuwe interactie:** eerst een mockup. Toets: kan ik dit
  in twee zinnen aan een collega uitleggen? Liever vaste, verklaarbare waarden dan getallen die
  verspringen.
- **Bouw voor de omgeving zoals die nu is.** Vraag bij elke feature: hoe gedraagt dit zich met de
  huidige productie-instellingen (inlog, rechten, data)? Hangt hij af van iets wat nog niet
  bestaat, bouw hem dan bewust uitgeschakeld.
- **Architectuurregels expliciet maken** en hier vastleggen. Voorbeeld uit WWSO: "de ID van het
  object staat altijd in de URL; tijdelijke opslag hoort altijd bij één object."
- **Regels uit beleid of wetgeving:** citeer de paragraaf en benoem of het letterlijk is of een
  interpretatie. Interpretaties ook zo noemen in code en wijzigingslog, en apart laten bevestigen.
- **Geen stille aannames of standaardwaarden** die een uitkomst bepalen. Liever zichtbaar
  "ontbreekt nog" dan ongemerkt 0.

**Herinner mij hieraan** als ik een grote wijziging zonder plan vraag, een rekenscherm zonder
mockup, of een feature die afhangt van iets wat nog niet aan staat.

## 3. Bugs

- **Eerst een test die faalt, dan de fix.** Elk incident krijgt een regressietest met datum en
  korte beschrijving.
- **Bij de tweede bug in hetzelfde patroon: stoppen en een audit doen** van de oorzaak, in plaats
  van weer een symptoom op te lossen. (In WWSO kwam één patroon acht keer terug.)
- Bij twijfel eerst reproduceren in de browser, dan pas aanpassen.

**Herinner mij hieraan** zodra een gemelde bug lijkt op een eerdere.

## 4. Feedback en samenwerking

- **Feedback in rondes:** de app doorlopen, screenshots met één zin per punt, één genummerde
  lijst. Dan één plan, dan één release.
- **Eén bericht, één onderwerp**, of een genummerde lijst.
- **Doel en context geven, niet de oplossing voorschrijven** ("dit moet uit te leggen zijn", niet
  "zet er een tooltip bij"). Geen grote kant-en-klare opdrachten plakken; eerst sparren.
- Wat ik zelf in de terminal moet doen, typ ik met `!` ervoor (bijv. `! vercel login`).
- Elke sessie eindigt met **wat er openstaat**; de volgende begint met "pak de open punten op".

**Herinner mij hieraan** als ik losse feedbackpunten na elkaar stuur terwijl een release loopt, of
een grote opdracht plak zonder het doel te noemen.

## 5. Elke release

- [ ] Tests, typecheck en lint groen; browsercontrole van wat er veranderd is.
- [ ] Code-review over de wijziging (`/code-review`; voor grote wijzigingen `/code-review ultra`).
- [ ] Wijzigingslog in gewone taal; versie omhoog. Rekenregel veranderd? Ook de versie van de
  rekenkern omhoog.
- [ ] Deployen én controleren dat de nieuwe versie echt live staat.
- [ ] STATUS kort bijwerken: wat is af, wat staat open.

Idealiter zit dit allemaal in één eigen `/release`-commando.

**Herinner mij hieraan** als ik "klaar" zeg terwijl een van deze stappen nog niet gedaan is.

## 6. Documentatie en geheugen

- Drie lagen, strikt gescheiden:
  - **CLAUDE.md** (dit bestand): regels en besluiten die altijd gelden. Kort houden.
  - **STATUS.md**: alleen wat nu speelt en wat openstaat.
  - **Archief**: sessieverslagen en historie, niet in de dagelijkse leesstof.
- Vaste feiten (omgevingen, testteam, deploy-werkwijze) horen hier, niet alleen in een gesprek.

**Herinner mij hieraan** als STATUS of CLAUDE.md onoverzichtelijk lang wordt (vuistregel: meer dan
ongeveer 200 regels).

## 7. Claude Code slim inzetten

| Situatie | Inzetten |
|---|---|
| Grote of onduidelijke klus | Plan mode |
| Breed zoeken of auditen | Subagents, parallel |
| Voorstel voor een scherm | Mockup als artifact |
| Vóór een release | `/code-review` |
| Terugkerende stappen | Eigen slash-commando of skill (bijv. `/release`) |
| Afspraken bewaken | Hooks in `settings.json` |
| Architectuur, audits, beleid | Sterk model (Opus) |
| Kleine UI-aanpassingen | Snel model |
| Blijvende feiten en voorkeuren | Memory |

**Herinner mij hieraan** als ik een klus handmatig of stap voor stap laat doen terwijl een van
deze mogelijkheden hem sneller of betrouwbaarder maakt.

## Als je maar vijf dingen onthoudt

1. Test- en productieomgeving scheiden vanaf dag één.
2. Bij de tweede herhaling van een bug: de oorzaak zoeken, niet het symptoom. Altijd een regressietest.
3. CLAUDE.md, hooks en `/release`: laat de omgeving de afspraken bewaken.
4. Eerst laten zien (plan, mockup), dan bouwen.
5. Feedback bundelen in rondes, met screenshots en één genummerde lijst.
