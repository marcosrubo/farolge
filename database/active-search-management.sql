-- Executar no Supabase do FAROL GE, após database/active-search.sql.
begin;
alter table public."BuscaAtiva"
  add column if not exists edit_revision uuid not null default gen_random_uuid();
create index if not exists busca_ativa_por_registro
  on public."BuscaAtiva" (owner_id,"DataRegistro" desc,"HoraRegistro" desc,id desc);
grant delete on public."BuscaAtiva" to service_role;
grant update ("Acao",edit_revision) on public."BuscaAtiva" to service_role;
commit;
