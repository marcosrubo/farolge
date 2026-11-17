-- Executar SOMENTE no Supabase exclusivo FAROL GE, após google-sessions.sql.
-- Escola/CGM/Arquivo cifrados pelo backend. Chaves HMAC por conta Geral.
begin;
create table if not exists public."FaltasDosAlunos" (
  owner_id uuid not null references auth.users(id) on delete cascade,
  student_key text not null check(student_key ~ '^[a-f0-9]{64}$'),
  "Escola" text not null,
  "CGM" text not null,
  data date not null,
  faltas integer not null check(faltas between 0 and 9999),
  updated_at timestamptz not null default now(),
  primary key(owner_id,student_key,data)
);
create table if not exists public."ArquivosDeFaltasCarregados" (
  owner_id uuid not null references auth.users(id) on delete cascade,
  school_key text not null check(school_key ~ '^[a-f0-9]{64}$'),
  file_key text not null check(file_key ~ '^[a-f0-9]{64}$'),
  "Escola" text not null,
  "Arquivo" text not null,
  loaded_at timestamptz not null default now(),
  primary key(owner_id,school_key,file_key)
);
alter table public."FaltasDosAlunos" enable row level security;
alter table public."ArquivosDeFaltasCarregados" enable row level security;
revoke all on public."FaltasDosAlunos",public."ArquivosDeFaltasCarregados" from public,anon,authenticated;
grant select,insert,update on public."FaltasDosAlunos",public."ArquivosDeFaltasCarregados" to service_role;
create or replace function public.farol_load_attendance(p_owner uuid,p_rows jsonb,p_file jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
  if p_owner is null or jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'invalid_attendance_batch'; end if;
  if jsonb_array_length(p_rows) not between 1 and 20000 or jsonb_typeof(p_file) is distinct from 'object' then raise exception 'invalid_attendance_batch'; end if;
  -- Serializa cargas da mesma Geral, inclusive arquivos sobrepostos; sem soma à base.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_owner::text, 0));
  insert into public."FaltasDosAlunos"(owner_id,student_key,"Escola","CGM",data,faltas)
    select p_owner,r->>'student_key',r->>'Escola',r->>'CGM',(r->>'data')::date,(r->>'faltas')::integer
    from jsonb_array_elements(p_rows) as r
    on conflict(owner_id,student_key,data) do update set
      "Escola"=excluded."Escola","CGM"=excluded."CGM",faltas=excluded.faltas,updated_at=now();
  get diagnostics total = row_count;
  insert into public."ArquivosDeFaltasCarregados"(owner_id,school_key,file_key,"Escola","Arquivo")
    values(p_owner,p_file->>'school_key',p_file->>'file_key',p_file->>'Escola',p_file->>'Arquivo')
    on conflict(owner_id,school_key,file_key) do update set
      "Escola"=excluded."Escola","Arquivo"=excluded."Arquivo",loaded_at=now();
  return total;
end;
$$;
revoke all on function public.farol_load_attendance(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.farol_load_attendance(uuid,jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
