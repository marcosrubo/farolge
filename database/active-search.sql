-- Executar no Supabase do FAROL GE, após database/students.sql.
begin;
create table if not exists public."BuscaAtiva" (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  cgm_key text not null,
  "Escola" text not null,
  "Usuario" text not null,
  "DataRegistro" date not null,
  "HoraRegistro" time not null,
  "DataBusca" date not null,
  "HoraBusca" time not null,
  "Acao" text not null,
  primary key (owner_id,id),
  foreign key (owner_id,cgm_key) references public."Alunos"(owner_id,cgm_key)
);
alter table public."BuscaAtiva" enable row level security;
revoke all on public."BuscaAtiva" from public,anon,authenticated;
grant select,insert on public."BuscaAtiva" to service_role;
commit;
