-- Executar SOMENTE no Supabase exclusivo FAROL GE.
-- Complementa authorized-emails.sql e students.sql, sem apagar registros.
begin;
grant select, insert, delete on public."EmailsAutorizados" to service_role;
alter table public."Ocorrencias" add column if not exists "EmailAutor" text;
alter table public."Ocorrencias" add column if not exists "NomeAutor" text;
-- Autoria nova cifrada pelo backend. Registros anteriores permanecem NULL.
notify pgrst, 'reload schema';
commit;
