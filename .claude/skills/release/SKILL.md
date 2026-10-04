---
name: release
description: Release van de Puntum-app. Draait de releasechecklist uit CLAUDE.md, zet versie en wijzigingslog, pusht naar branch test (testomgeving) en zet pas na akkoord van de gebruiker door naar master (productie). Gebruik bij "release", "deploy", "klaar voor productie" of "zet dit live".
disable-model-invocation: true
---

# Release

Doel: een wijziging die op de testomgeving werkt, veilig naar productie brengen. Dit is een
checklist met twee stopmomenten voor de gebruiker. Nooit naar `master` pushen zonder expliciete
goedkeuring in dit gesprek.

Omgevingen (zie `CLAUDE.md`): `test` → `web-git-test-skael.vercel.app` (testdatabase);
`master` → `web-skael.vercel.app` (productie, automatisch gedeployd bij push naar `master`).

## 0. Voorcontrole

1. `git status` moet schoon zijn. Zo niet: toon de wijzigingen en vraag wat erin hoort. Niets
   stilzwijgend committen.
2. Zit je op branch `test` (of werk je op een feature-branch die je eerst naar `test` brengt).
   Nooit op `master` werken.
3. `git pull --rebase origin test`.

## 1. Controles (moeten groen zijn)

```
pnpm typecheck
pnpm lint && pnpm --filter @wwso/web lint
pnpm test
```

Faalt iets: stop, toon de fout, los op of vraag de gebruiker. Geen release met rode controles.

## 2. Code-review

Vraag de gebruiker `/code-review` te draaien over de wijziging (voor grote wijzigingen
`/code-review ultra`). Dat kan de skill niet zelf starten. Wacht op de uitkomst en los
bevindingen op die relevant zijn.

## 3. Versie en wijzigingslog

- **Webapp-versie** (`APP_VERSIE` en een nieuw blok bovenaan `WIJZIGINGSLOG`) in
  `apps/web/src/lib/wijzigingslog.ts`. Elke release krijgt een nieuw versienummer: patch voor
  fixes en kleine wijzigingen, minor voor nieuwe functies.
- Schrijf de wijzigingen in gewone taal, in het Nederlands, zoals de bestaande blokken.
- **Rekenregel gewijzigd?** Dan ook `ENGINE_VERSIE` in `packages/engine/src/versiestempel.ts`
  ophogen. Vraag de gebruiker dit te bevestigen als je het niet zeker weet. Alleen de webapp
  veranderd: engineversie blijft gelijk.
- Vraag bij twijfel over het versienummer de gebruiker, en kies anders een patch-versie.

Commit op `test`:

```
git add -A && git commit -m "<korte titel> (v<versie>)" \
  -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin test
```

## 4. Testomgeving controleren

1. Wacht tot Vercel de preview heeft gebouwd (`vercel ls web --scope skael`, status Ready voor
   `web-git-test-skael.vercel.app`).
2. Controleer dat de testomgeving de nieuwe versie toont:
   `curl -s https://web-git-test-skael.vercel.app/woningen | grep -o "v<versie>"`.
   Ook de TEST-balk moet er staan.
3. Vraag de gebruiker de wijziging in de browser op de testomgeving te controleren. Dit is het
   **eerste stopmoment**: wacht op een expliciet akkoord ("ja, naar productie").

## 5. Productie (alleen na akkoord)

Het **tweede stopmoment**. Vraag letterlijk: "Zal ik `test` naar `master` zetten? Dit deployt
direct naar productie." Ga pas door bij een ja.

```
git checkout master
git pull --ff-only origin master
git merge --ff-only test
git push origin master
git checkout test
```

Gebruikt `--ff-only`: als dat faalt, is `master` niet meer een voorouder van `test`. Stop dan en
vraag wat er aan de hand is. Forceer nooit.

## 6. Productie controleren

1. Wacht tot de productiedeploy Ready is (`vercel ls web --scope skael`, Production, status Ready).
2. Controleer het nieuwe versienummer en dat er geen TEST-balk staat:
   `curl -s https://web-skael.vercel.app/woningen | grep -o "v<versie>"` en
   `curl -s https://web-skael.vercel.app/woningen | grep -c "TEST</strong>"` (moet `0` zijn).
3. Meld de uitkomst eerlijk. Staat de nieuwe versie er niet, dan is de release niet geslaagd, en
   zeg dat meteen.

## 7. Afronden

- Werk `plan/STATUS.md` bij: laatste versie, en wat er openstaat.
- Haal het afgeronde punt uit `plan/plan.md`.
- Commit en push dit naar `test` (nooit direct naar `master`).

## Niet doen

- Niet naar `master` pushen zonder akkoord van de gebruiker in dit gesprek.
- Niets verwijderen in productie (ook geen testwoningen of kopieën). Dat staat in een apart plan-punt.
- Niet `vercel --prod` gebruiken. Productie wordt via de Git-koppeling gedeployd.
- Niet de versie verhogen zonder wijzigingslog-tekst, en niet andersom.
