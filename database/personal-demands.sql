-- Executar somente no Supabase exclusivo do FAROL GE, depois de google-sessions.sql.
-- Uma demanda por conversa e por proprietário da conexão Pessoal.
-- Prazo, responsável, conclusão, mensagem de origem e histórico são criptografados
-- no servidor. Não armazenamos assunto, corpo, trechos ou anexos dos e-mails.
create table if not exists public.farol_personal_demands (
  id uuid not null default gen_random_uuid() unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  thread_id text not null check (thread_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  version integer not null check (version > 0),
  payload text not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, thread_id)
);
alter table public.farol_personal_demands enable row level security;
revoke all on public.farol_personal_demands from public, anon, authenticated;
grant select, insert, update, delete on public.farol_personal_demands to service_role;
-- Nenhuma policy para clientes. Backend deriva owner_id da sessão verificada.
