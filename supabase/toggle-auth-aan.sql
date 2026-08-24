-- Zet de tijdelijke open toegang voor `anon` weer dicht — tegenhanger van toggle-auth-uit.sql.
-- Draai dit in de Supabase SQL-editor, en zet op Vercel de env var `AUTH_VEREIST` weer op 'true'
-- (of verwijder 'm) zodat de app ook weer de login-redirect afdwingt.
--
-- De coalesce-default op org_id (uit toggle-auth-uit.sql) blijft bewust staan: onschadelijk voor
-- ingelogde gebruikers (huidige_org_id() resolvet dan gewoon normaal via allowed_emails), dus
-- geen reden om die terug te draaien.

drop policy if exists "tijdelijk_open_voor_testen" on deals;
