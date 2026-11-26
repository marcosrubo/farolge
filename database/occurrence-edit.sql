-- Executar somente no Supabase exclusivo do FAROL GE, após students.sql e access-management-authors.sql.
begin;
alter table public."Ocorrencias"
  add column if not exists "AutorId" text,
  add column if not exists edit_revision uuid not null default gen_random_uuid();
-- O identificador do cadastro temporário é cifrado pelo backend.
-- A autoria de registros anteriores permanece conforme foi gravada.
notify pgrst, 'reload schema';
commit;
