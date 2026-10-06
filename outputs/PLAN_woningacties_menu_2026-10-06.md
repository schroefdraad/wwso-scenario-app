# Plan — acties per woning op "Mijn woningen" (kopiëren, verwijderen)

Status: **plan + mockup, wacht op keuze.** Opgesteld 2026-10-06. Geen code gewijzigd.
Bouwen: na de productie-switch (feedbackronde), tenzij de eigenaar anders kiest.

## Feedback (eigenaar, 2026-10-06)

1. "Kopiëren" en "Verwijderen" staan op elke rij altijd in beeld. Liever achter een
   optie-pictogram.
2. Bij de bevestiging is "Ja, verwijderen" rood en vet, "Nee" dun en onderstreept. Dat moet
   andersom: annuleren is de veilige keuze en hoort de nadruk te krijgen.

## Nu (`app/woningen/page.tsx`, `styles.module.css`)

- Per rij: `⧉ Kopiëren` (altijd) en `🗑 Verwijderen` (alleen als `magDealBewerken`).
- Verwijderen in twee klikken: knop wordt rood gevuld "Ja, verwijderen" + dun linkje "Nee".
- Twee kliks in dezelfde plek: een dubbelklik verwijdert al (eerste klik = vraag, tweede klik
  op dezelfde plek = ja). Dat is een extra reden om de bevestiging anders op te zetten.

## Drie opties (in de mockup te simuleren)

**A. Menu-pictogram per rij (⋯)** — aanbevolen
- Rechts op elke rij één knop `⋯`. Klik → klein menu: "Kopiëren", lijn, "Verwijderen…" (rode tekst).
- Bij een woning zonder bewerkrecht (demo, andere org): alleen "Kopiëren".
- "Verwijderen…" opent een bevestigingsvenster (zie hieronder).
- Pro: rustig, bekend patroon (Gmail, Drive), werkt op telefoon. Contra: één klik extra.

**B. Acties alleen zichtbaar bij aanwijzen**
- Knoppen verschijnen pas als je met de muis over de rij gaat of de rij met Tab selecteert.
- Pro: geen extra klik. Contra: op telefoon/tablet bestaat "aanwijzen" niet, dus daar moet toch
  een `⋯` komen; testers ontdekken de functie minder snel.

**C. Selecteren en een actiebalk**
- Selectievakje per rij; zodra er iets is geselecteerd verschijnt boven de tabel een balk
  "1 geselecteerd: Kopiëren · Verwijderen".
- Pro: meerdere woningen tegelijk. Contra: zwaarder te bouwen, meer dan nu nodig bij ~10 woningen.

## Bevestiging bij verwijderen (geldt voor alle opties)

- Venster in het midden: titel "Woning verwijderen?", tekst met de naam en "Dit kan niet ongedaan
  worden gemaakt."
- **"Annuleren": vet, gevulde knop, standaard gefocust** (Enter = annuleren).
- **"Verwijderen": dunne knop met rode rand en rode tekst.**
- Escape of klik naast het venster = annuleren.
- Niet meer op dezelfde plek als de knop die het venster opende, zodat een dubbelklik nooit
  verwijdert.

## Bouwen (na keuze)

- Code: `app/woningen/page.tsx` (rij-acties), nieuw klein component voor menu en
  bevestigingsvenster, `styles.module.css`.
- Rechten blijven via `magDealBewerken`; RLS blijft de echte afdwinging.
- Tests: pure functie die per woning de beschikbare acties bepaalt (demo / eigen / andere org);
  regressietest "bevestiging: standaardactie is annuleren". Browsercontrole op `test`.
- Wijzigingslog + versie. Geen engineversie.

## Keuzes

1. Optie A, B of C? Aanbevolen: **A**.
2. Bevestiging als venster (aanbevolen) of in het menu zelf?
3. Wanneer bouwen: na de switch (aanbevolen) of nog mee in de eerste productieversie?

Mockup: zie het gepubliceerde artifact "Woningacties mockup".
