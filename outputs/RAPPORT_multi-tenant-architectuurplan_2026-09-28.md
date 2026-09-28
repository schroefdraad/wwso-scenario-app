# Implementatieplan — multi-tenant org-scheiding (Puntum / WWSO Scenario App)

**Datum:** 2026-09-28
**Status:** ontwerp, niets gebouwd. Gemaakt op Opus (architectuurkeuze, zelfde criterium als de
vier bestaande `⬆ Opus`-taken in `plan/plan.md`), na een spar-gesprek met de gebruiker over zes
vastgestelde ontwerpkeuzes. Vervolg op "Openstaande beslissingen → Multi-tenant/gescheiden
org_id's" in `plan/STATUS.md`. Bouwt rechtstreeks voort op `supabase/migrations/0002_auth_allowlist.sql`.

**Operationele noot:** deze planningsrun liep drie keer vast op een platform-API-fout (Opus,
"response stopped arriving") vóórdat een vierde poging lukte — geen inhoudelijke oorzaak, puur
instabiliteit die weer verdween.

## Zes vastgestelde ontwerpkeuzes (input, niet heroverwogen door de planner)

1. **Org-indeling:** Myle, Emma en Steven blijven SAMEN in de bestaande gedeelde org. Daarnaast
   drie nieuwe, nog lege orgs voor drie toekomstige testers (e-mailadressen nog onbekend).
2. **Cross-org-overzicht voor Myle:** dwars door alle orgs heen kunnen kijken, als expliciete
   uitzondering op de normale org-scoping.
3. **Per-gebruiker featureflag, niet per-org:** de Shortlist→Puntum-importbrug mag wél voor Myle
   en Emma zichtbaar zijn, niet voor Steven — ondanks dat hij in dezelfde org zit.
4. Geen `org_members`-tabel op `auth.users.id` — blijf bij `allowed_emails`, tenzij een harde
   technische reden anders dwingt.
5. **Woningen moeten deelbaar zijn tussen orgs**, los van de normale org-scoping.
6. **Permanente demo-woning** (de bestaande "Crooswijkseweg 95-A03"-testdeal, met twee
   scenario's), zichtbaar in élke org inclusief nog niet bestaande toekomstige orgs, read-only
   voor iedereen behalve Myle.

---

## 0. Vertrekpunt en het belangrijkste risico-inzicht

De zes bevestigde keuzes betekenen samen dat **er geen enkele bestaande `allowed_emails`-rij van
org verandert**. Myle, Emma en Steven blijven op `00000000-0000-0000-0000-000000000001`. Het
klassieke multi-tenant-uitsluitingsrisico (iemand krijgt een andere org_id en ziet zijn woningen
niet meer) is daarmee **niet** het risico van deze taak. Het resterende risico zit volledig in het
**herschrijven van de RLS-policies op `deals`** — dezelfde incidentklasse als `Keuken.verwarmd`
(2026-09-04) en `toiletType` (v0.7.16): een nieuwe regel bovenop bestaande productiedata die de
testsuite niet dekt.

Twee vondsten in de bestaande code die het plan sturen:

1. **`supabase/toggle-auth-uit.sql` regel 16** zet permanent
   `deals.org_id default coalesce(huidige_org_id(), '…0001')`. Zodra er echt gescheiden orgs zijn,
   is dat een verkeerde default: een ingelogd e-mailadres dat *niet* op de allowlist staat krijgt
   `…0001` als default-org, en de insert-policy verwerpt dat dan met een onbegrijpelijke fout in
   plaats van met "je staat niet op de allowlist". Moet terug naar
   `set default huidige_org_id()` (hoort bij de auth-toggle-stap, maar de afhankelijkheid staat
   hier vastgelegd).
2. **De open anon-policy `tijdelijk_open_voor_testen` raakt `authenticated`-sessies niet.**
   RLS-policies zijn rolgebonden; een ingelogde gebruiker draait als `authenticated` en valt dus
   al vandaag onder de org-scoping. Gevolg: dit werk is **nu al volledig testbaar met echte
   logins**, zonder de toggle te sluiten. Keerzijde: zolang de toggle openstaat kan iedereen met
   de publieke anon-key álle woningen van álle orgs lezen én schrijven — org-scheiding is dan een
   papieren scheiding. Zie §5 voor de harde ordeningseis die daaruit volgt.

---

## 1. Schemawijzigingen

### 1.1 Nieuwe tabel `orgs` — ja, en waarom

Nu is `org_id` een losse uuid zonder rij. Dat werkt zolang er één org is, maar de opdracht vraagt
expliciet om **org_id's reserveren zonder dat er e-mailadressen bekend zijn**, en dat kán niet
zonder een plek om zo'n reservering vast te leggen. Drie bijkomende redenen:

- Een typefout in een uuid bij een handmatige insert in de SQL-editor levert nu een *stille*
  fantoom-org op: de nieuwe tester logt in, ziet een lege app, en niemand kan zien waarom. Met
  `allowed_emails.org_id references orgs(id)` faalt die insert meteen en luidruchtig.
- De demo-woning en de drie gereserveerde plekken hebben een leesbaar label nodig
  ("Bètatester 1", "Demo") — anders is de SQL-editor over drie maanden onleesbaar.
- Het is de enige plek waar "hoeveel orgs bestaan er" beantwoordbaar is; nu is dat
  `select distinct org_id from deals`, wat orgs zonder woningen niet toont.

Naam `orgs` (niet `organisaties`) voor consistentie met de bestaande kolomnaam `org_id`.

```sql
create table if not exists orgs (
  id uuid primary key,
  -- Bewust GEEN gen_random_uuid()-default: orgs worden hier met de hand aangemaakt in de
  -- SQL-editor en hun uuid wordt maanden later opnieuw met de hand in een insert getypt. Een
  -- leesbare, oplopende waarde (…0001, …0011) maakt een typefout zichtbaar; een random uuid niet.
  -- Dit is veilig omdat org_id nooit een geheim of een toegangsbewijs is: RLS leidt de org altijd
  -- af uit de JWT-e-mailclaim (huidige_org_id()), nooit uit een door de client aangeleverde waarde.
  naam text not null,
  aangemaakt timestamptz not null default now()
);
```

### 1.2 De vier (vijf) org_id-waarden

| org_id | naam | leden nu |
|---|---|---|
| `00000000-0000-0000-0000-000000000001` | Puntum kernteam (Myle, Emma, Steven) | 3, ongewijzigd |
| `00000000-0000-0000-0000-000000000011` | Bètatester 1 | 0, gereserveerd |
| `00000000-0000-0000-0000-000000000012` | Bètatester 2 | 0, gereserveerd |
| `00000000-0000-0000-0000-000000000013` | Bètatester 3 | 0, gereserveerd |
| `00000000-0000-0000-0000-000000000002` | Demo (permanente voorbeeldwoning) | 0, technisch |

**Antwoord op de vraag "kun je een org_id reserveren zonder allowed_emails-rij":** ja, en dat is
precies de winst van §1.1 — de `orgs`-rijen worden nu aangemaakt, de `allowed_emails`-rij volgt
zodra het e-mailadres bekend is en is dan één insert:

```sql
insert into allowed_emails (email, org_id) values ('nieuwe.tester@voorbeeld.nl', '…0011');
```

Geen migratie, geen policy-wijziging, geen deploy. De org `…0002` (Demo) is géén testerplek maar
een technische org — zie §4.3; dat is een te bevestigen keuze (§7).

### 1.3 `allowed_emails` uitbreiden

```sql
alter table allowed_emails add column if not exists is_eigenaar boolean not null default false;
alter table allowed_emails add column if not exists features text[] not null default '{}';

-- Normalisatie-vangnet: huidige_org_id() vergelijkt met lower(auth.jwt()->>'email'), dus een rij
-- die met een hoofdletter is ingevoerd matcht NOOIT — en het symptoom is "nieuwe tester ziet een
-- lege app", niet een foutmelding. Deze check maakt die fout onmogelijk in plaats van onzichtbaar.
alter table allowed_emails add constraint allowed_emails_email_lowercase check (email = lower(email));

alter table allowed_emails
  add constraint allowed_emails_org_fk foreign key (org_id) references orgs (id) on delete restrict;

update allowed_emails set is_eigenaar = true where email = 'myle.hoefdraad@gmail.com';
update allowed_emails set features = array['import']
  where email in ('myle.hoefdraad@gmail.com', 'emma@morrison-media.nl');
```

**`features text[]` op `allowed_emails`, niet op `orgs`** — dit is keuze 3: Steven zit in dezelfde
org als Myle en Emma, dus een org-kolom (zoals
`outputs/RAPPORT_brug_workflow_automatisering_2026-09-27.md` §7 voorstelde) zou hem de
import-brug wél tonen. `text[]` boven `jsonb`: de enige operatie is containment
(`'import' = any(features)`), en de bestaande `eigen_rij_lezen`-policy maakt de kolom zonder extra
werk leesbaar voor de client zelf.

**`is_eigenaar boolean` bewust NIET als feature-string.** Alternatief was het e-mailadres
hardcoden in de functie uit §2. Afweging: een kolom is op één plek op te zoeken en te auditen
(`select email, is_eigenaar from allowed_emails`), en `allowed_emails` heeft *geen enkele*
write-policy — clients kunnen die vlag dus nooit zetten, alleen de SQL-editor. Features en rechten
gescheiden houden is essentieel: zou "cross_org" gewoon een feature-string zijn, dan is een
typefout in een featurelijst een privilege-escalatie.

### 1.4 `deals` en `feedback` uitbreiden

```sql
-- Punt 6: één permanente voorbeeldwoning die in ELKE org zichtbaar is, ook in orgs die op dit
-- moment nog niet bestaan. Een koppeltabel (zoals deal_shares hieronder) zou voor elke nieuwe org
-- een nieuwe rij vergen — dus precies het onderhoud dat we niet willen. Een vlag op de rij zelf is
-- per definitie compleet: "iedereen" heeft geen ledenlijst nodig.
alter table deals add column if not exists is_demo boolean not null default false;
create index if not exists deals_is_demo_idx on deals (is_demo) where is_demo;

alter table deals
  add constraint deals_org_fk foreign key (org_id) references orgs (id) on delete restrict;
alter table feedback
  add constraint feedback_org_fk foreign key (org_id) references orgs (id) on delete restrict;
```

`on delete restrict`, nooit `cascade`: een org verwijderen mag nooit stilzwijgend woningen
meesleuren.

### 1.5 `deal_shares` (punt 5)

```sql
create table if not exists deal_shares (
  deal_id            uuid not null references deals (id) on delete cascade,
  gedeeld_met_org_id uuid not null references orgs (id)  on delete cascade,
  -- Nu altijd false en niet via de UI te zetten: zie de openstaande beslissing in §7. De kolom
  -- staat er wel al in, zodat "ook bewerkbaar" later één update is en geen migratie op een tabel
  -- waar dan al productierijen in staan.
  mag_bewerken boolean not null default false,
  gedeeld_door text not null default lower(coalesce(auth.jwt() ->> 'email', '')),
  aangemaakt   timestamptz not null default now(),
  -- Samengestelde PK: voorkomt dubbele shares én levert meteen de index voor de deal_id-lookup.
  primary key (deal_id, gedeeld_met_org_id)
);
-- De PK-index dekt alleen de leidende kolom; de RLS-lookup gaat de andere kant op.
create index if not exists deal_shares_org_idx on deal_shares (gedeeld_met_org_id);
```

---

## 2. Helperfuncties — en de recursie-valkuil

Alle nieuwe helpers volgen het `huidige_org_id()`-patroon uit `0002`:
`stable security definer set search_path = public`.

```sql
create or replace function is_eigenaar() returns boolean
language sql stable security definer set search_path = public as $$
  -- coalesce naar false, niet NULL: in een USING-clausule gedraagt NULL zich als false, maar zodra
  -- deze functie ooit in een NOT- of AND-combinatie belandt is drievoudige logica een valstrik.
  select coalesce((select is_eigenaar from allowed_emails
                    where email = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
$$;

create or replace function heeft_feature(sleutel text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select sleutel = any(features) from allowed_emails
                    where email = lower(coalesce(auth.jwt() ->> 'email', ''))), false)
$$;

-- KRITIEK: dit MOET een security definer-functie zijn en geen inline subquery in de policy.
-- Een inline `id in (select deal_id from deal_shares where …)` in de deals-policy laat óók de RLS
-- van deal_shares meelopen; en omdat de policies van deal_shares op hun beurt moeten controleren
-- of je de deal bezit, verwijzen de twee tabellen dan naar elkaar → Postgres-fout 42P17
-- (infinite recursion in policy). Een security definer-functie leest deal_shares buiten RLS om en
-- knipt die cyclus door. Zelfde motief als bij huidige_org_id() in 0002, maar hier dwingend.
create or replace function is_met_mij_gedeeld(p_deal_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deal_shares
                  where deal_id = p_deal_id and gedeeld_met_org_id = huidige_org_id())
$$;

-- Voor de policies ÓP deal_shares (wie mag een share aanmaken/zien/weghalen): leest deals buiten
-- RLS om, zelfde anti-recursie-argument.
create or replace function deal_hoort_bij_eigen_org(p_deal_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deals where id = p_deal_id and org_id = huidige_org_id())
$$;
```

Prestatienoot: in de nieuwe policies worden de parameterloze helpers als
`(select huidige_org_id())` gewrapt, zodat Postgres ze één keer als InitPlan evalueert in plaats
van per rij. Semantisch identiek, en bij 21 woningen irrelevant — maar het patroon hoort vast te
liggen voordat een tester er 200 heeft staan.

---

## 3. RLS op `allowed_emails` en `orgs`

`allowed_emails`: de bestaande `eigen_rij_lezen`-policy blijft precies zoals hij is. Hij dekt de
nieuwe kolommen automatisch, dus de client kan zijn eigen `features`/`is_eigenaar` lezen en méér
dan zijn eigen rij blijft onmogelijk. Eén toevoeging voor punt 2:

```sql
drop policy if exists "eigenaar_leest_alle_rijen" on allowed_emails;
create policy "eigenaar_leest_alle_rijen"
  on allowed_emails for select to authenticated
  using ((select is_eigenaar()));
```

`orgs`: RLS aan, alleen lezen, alleen je eigen org + alles voor de eigenaar (zodat de UI een
orglabel kan tonen bij een cross-org-lijst). Geen insert/update/delete-policy — orgs worden in de
SQL-editor beheerd, net als `allowed_emails`.

---

## 4. RLS op `deals` — de drie subsecties

### 4.1 Cross-org-inzage voor Myle (punt 2)

**Besloten (2026-09-28, tegen de aanbeveling in): ook schrijvend.** De planner adviseerde
alleen-lezend (argumentatie hieronder blijft staan als achtergrond, niet als geldende regel), de
gebruiker heeft expliciet gekozen voor volledige lees-/schrijftoegang dwars door alle orgs.

Consequentie voor het ontwerp: `is_eigenaar()` moet nu ook in de update/delete-policies staan, niet
alleen in select. Dat maakt de aparte `is_eigenaar() and is_demo`-uitzondering in §4.3 overbodig —
een onvoorwaardelijke `is_eigenaar()` in de update/delete-`using`/`with check` dekt de demo-rij al
mee. Zie de aangepaste policies in §4.3.

Achtergrond van de oorspronkelijke (niet gevolgde) aanbeveling, voor de context van de afweging:

- Support/debuggen is meestal lezen: de opgeslagen `pand_invoer`-JSON bekijken, reproduceren, de
  fout in de motor vinden.
- `deals` heeft geen `gewijzigd_door`-kolom (en die toevoegen botst met "geen persoonsgegevens in
  de MVP"). Een schrijfrecht dwars door orgs is dus per definitie **niet-attribueerbaar**: een
  tester zou zijn woning zien veranderen zonder zichtbaar spoor wie dat deed. Met de nu gekozen
  aanpak is dit een bewust geaccepteerd punt, geen blinde vlek — vastleggen in `plan/STATUS.md` als
  bekende beperking (geen `gewijzigd_door`-kolom) is voldoende, een aparte auditlog bouwen is
  overkill voor drie testers.

```sql
drop policy if exists "leden_lezen_eigen_org" on deals;
create policy "leden_lezen_eigen_org"
  on deals for select to authenticated
  using (
    org_id = (select huidige_org_id())   -- normale org-scoping, ongewijzigd voor iedereen
    or is_demo                           -- §4.3
    or (select is_eigenaar())            -- punt 2: uitzondering, alleen voor de eigenaar
    or is_met_mij_gedeeld(id)            -- §4.2
  );
```

### 4.2 Delen tussen orgs (punt 5)

Read-pad zoals hierboven (`is_met_mij_gedeeld(id)`). Update/delete van een gedeelde woning valt in
v1 **buiten** de policies: `mag_bewerken` staat er in het schema, maar wordt nergens in een
`using`-clausule gebruikt zolang de sub-keuze niet gemaakt is. Beter geen half recht dan een recht
dat niemand kan naspeuren.

Policies op `deal_shares` zelf:

```sql
alter table deal_shares enable row level security;
-- Delen doet de org die de woning bezit; de ontvanger mag zien dát er met hem gedeeld is.
create policy "eigen_org_beheert_shares" on deal_shares for all to authenticated
  using      (deal_hoort_bij_eigen_org(deal_id) or gedeeld_met_org_id = (select huidige_org_id()))
  with check (deal_hoort_bij_eigen_org(deal_id));
```

Let op de asymmetrie: `using` laat de ontvanger de rij zien, `with check` laat alleen de
bezittende org er één aanmaken — de ontvanger kan zichzelf dus geen toegang toekennen. Dit is een
`for all`-policy en niet het per-commando-patroon van `0002`; dat is hier verantwoord omdat de
logica voor alle vier commando's identiek is, maar wijkt af van de huisstijl → zo nodig
uitschrijven naar vier policies (het per-commando-patroon voor `authenticated` werkt bewezen, zie
de RLS-verrassing in `plan/plan.md` regel 157-166).

### 4.3 De permanente demo-woning (punt 6)

Zichtbaarheid: `or is_demo` in de select-policy. Compleet voor orgs die nog niet bestaan, en er
valt nooit iets bij te werken.

Read-only afdwingen voor iedereen BEHALVE Myle zit in **twee** plekken, en de tweede is de
belangrijkste. **Bijgewerkt na de beslissing in §4.1** (Myle krijgt onvoorwaardelijk schrijfrecht,
niet alleen op de demo-rij) — `is_eigenaar()` staat daarom hieronder zonder `and is_demo`:

```sql
drop policy if exists "leden_bijwerken_eigen_org" on deals;
create policy "leden_bijwerken_eigen_org"
  on deals for update to authenticated
  using      ((org_id = (select huidige_org_id()) and not is_demo)
              or (select is_eigenaar()))
  with check ((org_id = (select huidige_org_id()) and not is_demo)
              or (select is_eigenaar()));

drop policy if exists "leden_verwijderen_eigen_org" on deals;
create policy "leden_verwijderen_eigen_org"
  on deals for delete to authenticated
  using      ((org_id = (select huidige_org_id()) and not is_demo)
              or (select is_eigenaar()));

drop policy if exists "leden_aanmaken_eigen_org" on deals;
create policy "leden_aanmaken_eigen_org"
  on deals for insert to authenticated
  -- `and not is_demo` is hier GEEN detail voor een gewone gebruiker: zonder deze clausule kan
  -- elke gebruiker zijn eigen woning op is_demo = true zetten en daarmee zijn adres/notities aan
  -- iedere org uitzenden. Myle mag dat via `is_eigenaar()` wél (hij is degene die de demo-rij
  -- onderhoudt), dus zijn tak heeft geen `not is_demo`-restrictie.
  with check ((org_id = (select huidige_org_id()) and not is_demo) or (select is_eigenaar()));
```

De `with check`-kant is de leaktest voor iedereen behalve Myle: een gewone gebruiker kan `is_demo`
niet naar `true` zetten (zijn tak faalt op `not is_demo`), Myle kan dat wel — bewust, want hij is nu
de enige die de demo-rij mag aanmaken/muteren/weer terugzetten.

**Consequentie van "ook schrijven" voor de demo-locatie-vraag:** ook al staat de demo in een eigen
org (zie hieronder), de bescherming ertegen dat een GEWONE gebruiker 'm bewerkt zit nu volledig in
`and not is_demo` in de policies hierboven — de org-scheiding zelf beschermt dat niet meer apart,
want Myle's `is_eigenaar()`-tak doorbreekt org-scheiding sowieso overal. De eigen demo-org blijft
dus vooral zinvol om de demo-data gescheiden te houden van Myle's eigen echte werk in "Mijn
woningen", niet meer als extra beveiligingslaag tegen Myle zelf (die had hij met "ook schrijven"
toch niet).

**Waar woont de demo-woning?** Aanbeveling: in een eigen org `…0002`, niet in org `…0001`. Reden:
staat hij in org 1, dan is `org_id = huidige_org_id()` waar voor Emma en Steven en hangt de
read-only-bescherming volledig aan de `and not is_demo`-clausule. In een eigen org is die clausule
*extra* bescherming in plaats van de enige. Bijkomend: de demo-data raakt niet vermengd met echt
werk in "Mijn woningen" van het kernteam.

**Voorbereiden van de rij (migratie 0007), niet blind uitvoeren:** `plan/plan.md` regel 94
vermeldt "meerdere Crooswijkseweg-duplicaten". Een `where naam ilike '%crooswijk%'` raakt dus de
verkeerde of meerdere rijen. Eerst opzoeken, dan de uuid hardcoderen:

```sql
-- Stap 1 (handmatig, uitkomst in de migratiecomment vastleggen):
--   select id, naam, aangemaakt, bijgewerkt, jsonb_array_length(scenarios) from deals
--    where naam ilike '%crooswijk%' order by aangemaakt;
-- Stap 2: KOPIE naar de demo-org, origineel blijft onaangeroerd in org …0001 als Myle's eigen
-- werkexemplaar. Een kopie i.p.v. een verplaatsing houdt de terugweg triviaal (delete de kopie).
insert into deals (org_id, naam, pand_invoer, scenarios, notitie, map,
                   tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie,
                   is_demo)
select '00000000-0000-0000-0000-000000000002', 'Voorbeeldwoning (demo) — Crooswijkseweg 95-A03',
       pand_invoer, scenarios,
       -- notitie/map bewust LEEG: de privacy-check van 2026-09-20 vond voornamen van testers in
       -- het map-veld. Een rij die in elke org zichtbaar wordt, mag geen tekstveld meenemen dat
       -- ooit voor persoonlijke ordening is gebruikt.
       '', '',
       tarievenset_peildatum, kostencatalogus_versie, registry_versie, engine_versie, true
  from deals where id = '<hier de opgezochte uuid>';
```

Sequencing-detail: de twee scenario's horen **vóór** deze kopie via de normale app op het
origineel te worden gebouwd (gewoon app-gebruik in org 1, geen RLS-subtiliteiten). Dan bevat de
demo-snapshot ze meteen. Daarna kan Myle de demo-rij nog steeds bijwerken via de app, want zijn
`is_eigenaar and is_demo`-tak dekt dat.

### 4.4 `feedback`

Precies de situatie die de `LET OP`-comment in `0004_feedback.sql` (regel 14-17) voorzag:

```sql
drop policy if exists "leden_lezen_eigen_org" on feedback;
create policy "leden_lezen_eigen_org"
  on feedback for select to authenticated
  using (org_id = (select huidige_org_id()) or (select is_eigenaar()));
```

Insert-policy ongewijzigd, blijft append-only (geen update/delete). Let op: dit verbreedt Myle's
inzage naar de e-mailadressen in feedback van andere orgs — bewuste verbreding van de bestaande
uitzondering op "geen persoonsgegevens", hoort in STATUS.md vastgelegd (§7).

---

## 5. Sequencing

Drie migratiebestanden, doorlopende nummering, handmatig in de SQL-editor zoals 0001-0004. De
split is bewust:

| # | Bestand | Inhoud | Risico |
|---|---|---|---|
| 1 | `0005_orgs_en_gebruikersvlaggen.sql` | `orgs` + 5 rijen, `allowed_emails`-kolommen + FK + lowercase-check, `is_eigenaar()`/`heeft_feature()`, RLS op `orgs`, `deals`/`feedback`-FK | Puur additief. Raakt geen enkele bestaande policy. Kan los gedeployd en geverifieerd worden. |
| 2 | `0006_deals_demo_en_delen.sql` | `deals.is_demo`, `deal_shares`, `is_met_mij_gedeeld()`/`deal_hoort_bij_eigen_org()`, **alle vervangen policies** op `deals`, `feedback`, `allowed_emails` | De enige risicovolle stap. |
| 3 | `0006_rollback.sql` | Letterlijk de policy-blokken uit `0002`/`0004` terug + `drop policy` op de nieuwe | Vangnet, wordt één keer droog geoefend (§6). |
| 4 | *app-deploy* | `lib/deals/profiel.ts`, `is_demo`/`mag_bewerken` door `parseDealRij`, read-only-gedrag in `Topbar.tsx` + `Vergelijking.tsx`, badge in `woningen/page.tsx` | Moet vóór stap 5 live zijn. |
| 5 | `0007_demo_woning.sql` | De demo-rij (§4.3) | Maakt de demo pas zichtbaar. |

Volgorde-eisen:

- **0005 vóór 0006** — de helperfuncties en de FK's moeten bestaan voordat de policies ernaar
  verwijzen.
- **App-deploy vóór 0007.** Doe je 0007 eerder, dan zien Emma en Steven een woning waarvan
  "Opslaan" een rauwe RLS-fout gooit (`werkDealBij` doet `.update().select().single()`; 0 geraakte
  rijen → PostgREST-fout → "Woning bijwerken mislukt: …"). Zichtbaar, niet stil, maar wel een
  onnodige bèta-melding.
- **Auth-toggle dichtzetten vóór het uitnodigen van de drie nieuwe testers.** Niet vóór deze
  migraties — die zijn onafhankelijk — maar wél vóórdat er data van gescheiden orgs naast elkaar
  staat. Zolang `tijdelijk_open_voor_testen` bestaat is elke org-scheiding cosmetisch voor wie de
  publieke anon-key heeft. Dit is de enige harde koppeling met die aparte, al geplande stap.
  Daarbij hoort ook `alter table deals alter column org_id set default huidige_org_id()` (de
  coalesce uit §0 punt 1 terugdraaien).
- De drie `allowed_emails`-inserts voor de nieuwe testers zijn **geen** migratiestap maar
  dagelijks beheer, uitvoerbaar op het moment dat een e-mailadres bekend is.

Rollback-overwegingen: alles is idempotent (`if not exists`, `drop policy if exists`). De FK's en
de lowercase-check zijn de enige constraints die kunnen falen op bestaande data — daarom de
pre-flight-checks in §6 stap 1. Kolommen worden nooit gedropt bij een rollback (`is_demo` laten
staan is onschadelijk); alleen policies worden teruggezet.

---

## 6. Testplan

Doel: nooit de drie huidige gebruikers buitensluiten. Uitgangspunt is dat elke policy-test in de
SQL-editor **binnen `begin … rollback`** draait, met een nagebootste JWT-claim, zodat er geen
enkele schrijfactie blijft staan en geen productie-sessie wordt geraakt.

**Stap 0 — nulmeting, vóór alles.** `select org_id, count(*) from deals group by 1;` ·
`select count(*) from feedback;` · `select * from allowed_emails;` · en cruciaal:
`select tablename, policyname, cmd, qual, with_check from pg_policies where tablename in ('deals','feedback','allowed_emails');`
— de huidige policy-tekst letterlijk wegschrijven, zodat de rollback een kopie is en geen
reconstructie. Plus het aantal woningen dat elk van de drie gebruikers nú in "Mijn woningen" ziet
(met de hand, ingelogd) — dat getal is de acceptatietoets.

**Stap 1 — constraint-preflight (de `toiletType`-les).** Vóór het toevoegen van de FK's:
`select distinct org_id from deals where org_id not in (select id from orgs);` en idem voor
`feedback`; plus `select email from allowed_emails where email <> lower(email);`. Elke non-lege
uitkomst eerst oplossen, nooit de constraint forceren.

**Stap 2 — policy-matrix per rol, transactioneel.**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"email":"info@energielabelverduurzamen.nl","role":"authenticated"}';
  select count(*) from deals;                                    -- verwacht: org-1-telling + 1 demo
  update deals set naam = 'x' where is_demo;                     -- verwacht: 0 rijen
  update deals set is_demo = true where org_id = huidige_org_id(); -- verwacht: 0 rijen  ← de leaktest
rollback;
```

Vijf rollen doorlopen: Myle (verwacht: alles, lezend; schrijven alleen in org 1 + de demo-rij),
Emma en Steven (org 1 + demo; geen schrijfrecht op de demo), een fictief adres in `…0011`
(**alleen** de demo, verder een lege lijst — dit is de test die bewijst dat een nieuwe tester
meteen iets nuttigs ziet), en een onbekend adres (0 rijen, `huidige_org_id()` is NULL).

**Stap 3 — deelpad.** Binnen dezelfde transactiestijl: een `deal_shares`-rij van org 1 naar
`…0011`, dan controleren dat de tester-rol die ene woning erbij ziet en niets meer, dat hij hem
niet kan bijwerken, en dat hij zichzelf geen tweede share kan toekennen (`with check` op
`deal_shares`). En expliciet: **geen** 42P17-recursiefout — dat is de test die bewijst dat de
security-definer-omweg uit §2 nodig en werkend is.

**Stap 4 — browser-rondgang met echte logins**, na 0005+0006+app-deploy, vóór 0007: alle drie de
huidige gebruikers laten "Woningen ophalen" doen en de telling vergelijken met stap 0. Wijkt er
één af, dan `0006_rollback.sql`.

**Stap 5 — demo-gedrag, na 0007.** Als Emma: de demo-woning openen, scenario's zien, "Opslaan"
moet niet in een rauwe fout eindigen maar in het kopieerpad (`kopieerDeal`/`maakDealAan` zet geen
`org_id` en geen `is_demo`, dus een kopie landt automatisch in de eigen org en is bewerkbaar — het
gewenste "naspelen"-gedrag, zonder extra backend-werk). Als Myle: de demo-woning wél kunnen
bijwerken.

**Stap 6 — feedback.** Myle ziet nu ook feedback van andere orgs; Steven kan nog steeds versturen
(insert-policy ongewijzigd).

**Stap 7 — rollback-oefening.** `0006_rollback.sql` één keer in een transactie draaien,
`pg_policies` vergelijken met de stap-0-snapshot, en terugdraaien. Pas dán is het vangnet echt een
vangnet.

**Stap 8 — repo-tests.** `apps/web/src/lib/deals/types.test.ts` draait op een fixture zonder de
nieuwe kolommen; `DealRij` is niet `.strict()`, dus bestaande tests blijven groen en oude rijen
blijven leesbaar. Toevoegen: één test die een rij met `is_demo: true` parseert en de afgeleide
read-only-vlag oplevert. De nieuwe velden in `DealRij` krijgen `.default(false)`/`.default([])` —
zelfde vangnet-motief als `notitie`/`map` in `types.ts` regel 77-82, omdat de migraties handmatig
gedraaid worden.

---

## 7. Openstaande beslissingen — voorleggen vóór implementatie

**Besloten (2026-09-28):**

1. ~~Cross-org: alleen lezen of ook schrijven?~~ → **Ook schrijven** (tegen de aanbeveling in §4.1
   in — geaccepteerde consequentie: geen `gewijzigd_door`-kolom, dus niet-navolgbaar wie een
   wijziging in andermans org deed; zie §4.1). Policies in §4.1/§4.3 bijgewerkt.
2. ~~Demo-woning in een eigen org of in de bestaande org?~~ → **Eigen, aparte org `…0002`**
   (conform de aanbeveling in §4.3, al is de beveiligingswinst t.o.v. Myle zelf door beslissing 1
   komen te vervallen — de scheiding blijft zinvol om demo-data en Myle's eigen werk uit elkaar te
   houden).

3. **Welke exacte `deals.id` is dé Crooswijkseweg-demo?** → **De rij van 2026-09-22** (er staan
   duplicaten sinds 2026-09-04, zie `plan/plan.md`; bij implementatie eerst opzoeken met
   `select id, naam, aangemaakt, bijgewerkt from deals where naam ilike '%crooswijk%' order by aangemaakt`
   en de rij met wijzig-/aanmaakdatum 2026-09-22 aanwijzen — geen exacte uuid nu vastgelegd, dat
   volgt bij implementatie). **Kopie**, niet verplaatsen (conform §4.3) — origineel blijft
   onaangeroerd in org `…0001`.
4. **Delen — vier sub-keuzes, alle vastgesteld**: (a) **doelgroep = specifieke org** — de
   bezittende org kiest expliciet welke org de woning te zien krijgt, sluit aan op de bestaande
   org_id-sleutel; (b) **read-only** voor v1 — geen bewerkrecht voor de ontvanger; (c) **kopie
   sturen**, geen live-gedeeld origineel — de ontvanger krijgt een eigen, losse snapshot
   (`kopieerDeal` bestaat al); (d) **alleen de bezittende org mag delen** — je kunt alleen delen
   wat je zelf bezit.

   **Ontwerpconsequentie van (c):** omdat delen een kopie stuurt i.p.v. doorlopende toegang, is de
   `deal_shares`-koppeltabel uit §1.5/§4.2 niet meer nodig als *permanent* zichtbaarheidsmechanisme
   — een simpelere vorm volstaat: een eenmalige server-actie "deel naar org X" die een kopie van de
   woning met de doel-`org_id` invoegt (zelfde patroon als `kopieerDeal`, maar met een expliciet
   gekozen `org_id` i.p.v. de eigen). Dat scheelt de hele `is_met_mij_gedeeld()`-RLS-laag en de
   recursie-valkuil in §2 voor dit onderdeel. **Dit is een vereenvoudiging t.o.v. het oorspronkelijke
   plan, nog niet in §1.5/§2/§4.2 doorgevoerd** — bij implementatie die secties herzien: `deal_shares`
   kan vervallen, tenzij er alsnog behoefte blijkt aan een audit-trail van "wat is met wie gedeeld"
   (dan blijft de tabel bestaan, maar puur als log, niet als RLS-bron).
5. **Delen: featureflag.** → **Ja, eerst achter dezelfde `features`-kolom als de Shortlist-brug**
   (`heeft_feature('delen')`), gepilot met Myle/Emma voordat het breder gaat.
6. **Feedback cross-org lezen door Myle** → **Ja**, consistent met de "ook schrijven"-keuze bij
   punt 1. Vastleggen in `plan/STATUS.md` als verbreding van de bestaande persoonsgegevens-
   uitzondering (`0004_feedback.sql` regel 10-12).
7. **UI-scope** → **Akkoord met het voorstel**: geen org-switcher, wel een "Voorbeeld"/
   "alleen-lezen"-badge op de demo/gedeelde rij en "Opslaan" wordt "Opslaan als eigen woning"
   zodra er op een niet-bewerkbare rij gewijzigd wordt. `haalMappen()`/het mapfilter (punt 8
   hieronder) volgt hier automatisch uit.
8. **`haalMappen()` en het mapfilter** — geen aparte beslissing nodig, volgt rechtstreeks uit punt
   7: mapnamen filteren op de eigen org zodra cross-org-zichtbare woningen (demo + gedeelde
   kopieën) een vreemde mapnaam zouden kunnen inbrengen. Voor de demo-rij al opgelost door
   notitie/map leeg te laten (§4.3); voor gedeelde kopieën is dit vanzelf geen probleem zodra (c)
   hierboven bevestigt dat delen een KOPIE is — de kopie krijgt gewoon de eigen org_id en dus het
   eigen mapfilter, geen los mechanisme nodig.
9. **Demo-woning verbergen** → **Nu niet bouwen**, pas oppakken als een tester hier daadwerkelijk
   over valt.
10. **Labels voor de drie gereserveerde orgs** → **Nu al aanmaken** met een generiek label
    ("Bètatester 1/2/3"); hernoemen naar de echte naam is later één `update`-statement.
11. **Featureflag-sleutel** → **`'import'`**, zoals voorgesteld in §7 van het brug-rapport.

Alle elf punten zijn hiermee besloten (2026-09-28). Enige nog openstaande actie vóór implementatie:
bij het schrijven van migratie 0007 de exacte uuid van de 2026-09-22-Crooswijkseweg-rij opzoeken
(triviaal, één `select`), en §1.5/§2/§4.2 herzien in het licht van de "kopie i.p.v. live delen"-
vereenvoudiging bij punt 4.

### Wat geen open vraag meer is (keuze 4, expliciet getoetst)

Geen `org_members`-tabel op `auth.users.id`, ook niet bij cross-org-toegang: elke policy en helper
hierboven leidt de identiteit af uit `auth.jwt() ->> 'email'`, nooit uit `auth.users.id`, dus er is
geen technische reden om van `allowed_emails` af te wijken. De enige zwakte die daarbij hoort is
pre-existent en niet nieuw: verandert een gebruiker zijn e-mailadres in Supabase Auth, dan
verliest hij stil zijn toegang. De lowercase-check uit §1.3 dekt de veel waarschijnlijkere variant
van dat faalpad af.

### Kritieke bestanden voor implementatie

- `supabase/migrations/0002_auth_allowlist.sql`
- `supabase/migrations/0004_feedback.sql`
- `supabase/toggle-auth-uit.sql`
- `apps/web/src/lib/deals/types.ts`
- `apps/web/src/lib/deals/opslag.ts`
