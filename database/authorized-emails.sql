-- Executar SOMENTE no Supabase exclusivo do FAROL GE.
-- Cadastrar os e-mails necessários ANTES de publicar o controle de acesso.
-- Cria ou atualiza o cadastro. Escola, Nome e Função são obrigatórios em novos cadastros.
-- A aplicação não inclui nem libera contas automaticamente.
begin;
create table if not exists public."EmailsAutorizados" (
  id uuid primary key default gen_random_uuid(),
  "Escola" text not null check (length(btrim("Escola")) between 1 and 200),
  "Nome" text not null check (length(btrim("Nome")) between 1 and 200),
  "Funcao" text not null check (length(btrim("Funcao")) between 1 and 200),
  "Ordem" integer check ("Ordem" > 0),
  email text unique check (
    email = lower(btrim(email)) and length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);
do $$
begin
  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public."EmailsAutorizados"'::regclass and attname = 'id' and not attisdropped
  ) then
    alter table public."EmailsAutorizados"
      add column id uuid default gen_random_uuid(),
      add column "Funcao" text,
      add column "Ordem" integer check ("Ordem" > 0),
      add unique (email);
    alter table public."EmailsAutorizados"
      drop constraint "EmailsAutorizados_pkey";
    alter table public."EmailsAutorizados"
      add primary key (id),
      alter column email drop not null,
      add constraint farol_authorized_function_required
        check ("Funcao" is not null and length(btrim("Funcao")) between 1 and 200) not valid;
  end if;
end;
$$;
create index if not exists farol_authorized_users_order on public."EmailsAutorizados" ("Ordem", id);

create or replace function public.farol_normalize_authorized_email()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.email := nullif(lower(btrim(new.email)), '');
  return new;
end;
$$;
drop trigger if exists farol_normalize_authorized_email on public."EmailsAutorizados";
create trigger farol_normalize_authorized_email before insert or update of email
on public."EmailsAutorizados" for each row execute function public.farol_normalize_authorized_email();
alter table public."EmailsAutorizados" enable row level security;
revoke all on public."EmailsAutorizados" from public,anon,authenticated,service_role;
grant select, insert, update, delete on public."EmailsAutorizados" to service_role;
-- Sem policies de navegador. Administração pelo backend exige sessão Geral autorizada.
-- Escola, Nome, Função e Ordem são informações administrativas.
-- Cadastros sem e-mail não liberam conexão Google.
commit;

-- Cadastros anteriores mantêm os e-mails. Preencha as funções reais em Configurações.
