-- Executar somente no Supabase exclusivo FAROL GE, após google-sessions.sql.
-- Uma data limite por mensagem da conexão GERAL e por identidade proprietária.
-- payload contém mailbox (e-mail GERAL verificado) e dueDate (data civil de Brasília),
-- criptografados no backend com AES-GCM. Não contém assunto/corpo/trechos/anexos.
create table if not exists public.farol_institutional_demands (
  owner_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null check (message_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  version integer not null check (version > 0),
  payload text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, message_id)
);
alter table public.farol_institutional_demands enable row level security;
revoke all on public.farol_institutional_demands from public, anon, authenticated;
grant select, insert, update, delete on public.farol_institutional_demands to service_role;
-- Sem policy de cliente. O backend deriva owner_id e mailbox da sessão GERAL.
