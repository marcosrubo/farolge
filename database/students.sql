-- Executar somente no Supabase exclusivo FAROL GE, após google-sessions.sql.
-- Campos pessoais cifrados com AES-GCM pelo backend; cgm_key é HMAC do vínculo Escola/CGM/Serie/Turma/Turno por conta.
-- A conta GERAL delimita o conjunto de dados; não infere vínculo escolar.
begin;
create table if not exists public."Alunos" (
  owner_id uuid not null references auth.users(id) on delete cascade,
  cgm_key text not null check (cgm_key ~ '^[a-f0-9]{64}$'),
  "Escola" text not null,
  "CGM" text not null,
  "Nome" text not null,
  "Serie" text not null,
  "Turma" text not null,
  "Turno" text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id,cgm_key)
);
create table if not exists public."Ocorrencias" (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  cgm_key text not null,
  "Escola" text not null,
  "CGM" text not null,
  "Nome" text not null,
  "Data" date not null,
  "Hora" time not null,
  "Ocorrencia" text not null,
  "EmailAutor" text,
  "NomeAutor" text,
  created_at timestamptz not null default now(),
  primary key (owner_id,id),
  foreign key (owner_id,cgm_key) references public."Alunos"(owner_id,cgm_key)
);
alter table public."Alunos" enable row level security;
alter table public."Ocorrencias" enable row level security;
revoke all on public."Alunos",public."Ocorrencias" from public,anon,authenticated;
grant select,insert,update,delete on public."Alunos",public."Ocorrencias" to service_role;
-- Uma única chamada importa todo o arquivo: erro desfaz toda a carga.
create or replace function public.farol_load_students(p_owner uuid,p_rows jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 10000 then
    raise exception 'invalid_student_batch';
  end if;
  insert into public."Alunos"(owner_id,cgm_key,"Escola","CGM","Nome","Serie","Turma","Turno")
    select p_owner,r->>'cgm_key',r->>'Escola',r->>'CGM',r->>'Nome',r->>'Serie',r->>'Turma',r->>'Turno'
    from jsonb_array_elements(p_rows) as r
    on conflict(owner_id,cgm_key) do update
      set "Escola"=excluded."Escola","Serie"=excluded."Serie","Turno"=excluded."Turno","CGM"=excluded."CGM","Nome"=excluded."Nome","Turma"=excluded."Turma",updated_at=now();
  get diagnostics total = row_count;
  return total;
end;
$$;
revoke all on function public.farol_load_students(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.farol_load_students(uuid,jsonb) to service_role;
commit;
