-- Executar SOMENTE no projeto Supabase exclusivo do FAROL GE.
-- Sem conteúdo de e-mails. O payload é criptografado pelo backend antes da gravação.
create table if not exists public.farol_google_sessions (
  id text primary key,
  payload text not null,
  expires_at timestamptz not null
);
create index if not exists farol_google_sessions_expiry
  on public.farol_google_sessions (expires_at);
alter table public.farol_google_sessions enable row level security;
revoke all on public.farol_google_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.farol_google_sessions to service_role;
-- Nenhuma policy para clientes. Acesso exclusivamente pelo backend com service_role.

-- Conexões pertencem a um usuário real do Supabase Auth (criado pelo login Google).
-- auth.users é gerenciada pelo Supabase; não há cadastro manual nem senha local.
create table if not exists public.farol_google_connections (
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('general', 'personal')),
  payload text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, type)
);
alter table public.farol_google_connections enable row level security;
revoke all on public.farol_google_connections from public, anon, authenticated;
grant select, insert, update, delete on public.farol_google_connections to service_role;
