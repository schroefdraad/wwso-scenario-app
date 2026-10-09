-- Rollback voor 0008_open_inschrijving.sql.
--
-- Zet automatisch aanmaken van orgs uit en verwijdert de daglimiet voor "Gegevens ophalen".
-- Zet daarna ook in Supabase "Allow new users to sign up" uit en in de app
-- `LOGIN_OPTIES.shouldCreateUser` terug op false, anders kunnen nieuwe accounts inloggen zonder org
-- (lege app).
--
-- Bewust NIET teruggedraaid:
--   - de kolom allowed_emails.nieuwsbrief_toestemming: daarin staat gegeven toestemming, die mag
--     niet stil verdwijnen. Een lege kolom is onschadelijk.
--   - automatisch aangemaakte orgs en hun allowed_emails-rijen: daar hangen mogelijk al woningen
--     aan. Opruimen alleen bewust, per org, met een back-up.

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
drop function if exists public.nieuwe_gebruiker();

drop function if exists registreer_ophaalactie(int);
drop table if exists ophaal_log;
