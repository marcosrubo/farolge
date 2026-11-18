-- Executar no Supabase exclusivo do FAROL GE, após database/authorized-emails.sql.
begin;
alter table public."EmailsAutorizados"
  add column if not exists password_hash text,
  add column if not exists activation_hash text,
  add column if not exists activation_expires_at timestamptz;

create table if not exists public.farol_temporary_attempts (
  bucket text primary key,
  expires_at timestamptz not null,
  attempts integer not null
);
alter table public.farol_temporary_attempts enable row level security;
revoke all on public.farol_temporary_attempts from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.farol_temporary_attempts to service_role;

create or replace function public.farol_temporary_attempt(p_user uuid, p_source text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  user_attempts integer;
  source_attempts integer;
  started timestamptz := statement_timestamp();
begin
  delete from public.farol_temporary_attempts where expires_at <= started;

  insert into public.farol_temporary_attempts as t values ('ip:' || p_source, started + interval '15 minutes', 1)
  on conflict (bucket) do update set attempts = least(t.attempts + 1, 51)
  returning attempts into source_attempts;
  if source_attempts > 50 then return false; end if;

  insert into public.farol_temporary_attempts as t values ('user:' || p_user::text, started + interval '15 minutes', 1)
  on conflict (bucket) do update set attempts = least(t.attempts + 1, 11)
  returning attempts into user_attempts;
  return user_attempts <= 10;
end;
$$;

-- Acesso temporário usa somente os dados do proprietário Google confirmado.
create or replace function public.farol_temporary_owner()
returns uuid language sql stable security definer set search_path = '' as $$
  select case when count(*) = 1 then (array_agg(u.id))[1] end
  from auth.users u
  where u.email = 'marcos.rubo@gmail.com' and u.email_confirmed_at is not null
    and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
$$;

revoke all on function public.farol_temporary_attempt(uuid, text) from public, anon, authenticated;
revoke all on function public.farol_temporary_owner() from public, anon, authenticated;
grant execute on function public.farol_temporary_attempt(uuid, text) to service_role;
grant execute on function public.farol_temporary_owner() to service_role;
notify pgrst, 'reload schema';
commit;
