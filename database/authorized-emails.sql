-- Executar SOMENTE no Supabase exclusivo do FAROL GE.
-- Cadastrar os e-mails necessários ANTES de publicar o controle de acesso.
-- Campos: Escola, Nome (pessoa do e-mail) e email.
-- A aplicação não inclui nem libera contas automaticamente.
begin;
create table if not exists public."EmailsAutorizados" (
  "Escola" text not null check (length(btrim("Escola")) between 1 and 200),
  "Nome" text not null check (length(btrim("Nome")) between 1 and 200),
  email text primary key check (
    email = lower(btrim(email)) and length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);
create or replace function public.farol_normalize_authorized_email()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end;
$$;
drop trigger if exists farol_normalize_authorized_email on public."EmailsAutorizados";
create trigger farol_normalize_authorized_email before insert or update of email
on public."EmailsAutorizados" for each row execute function public.farol_normalize_authorized_email();
alter table public."EmailsAutorizados" enable row level security;
revoke all on public."EmailsAutorizados" from public,anon,authenticated,service_role;
grant select, insert, delete on public."EmailsAutorizados" to service_role;
-- Sem policies de navegador. Administração pelo backend exige sessão Geral autorizada.
-- Escola e Nome são informações administrativas; o acesso é verificado pelo email.
-- Escola é informação administrativa: não concede acesso aos dados de outra conta.
commit;

-- Após executar, cadastrar as pessoas no Table Editor preenchendo os três campos.
-- Exemplo fictício (substituir pelos dados reais; não executar como está):
-- insert into public."EmailsAutorizados" ("Escola", "Nome", email)
-- values ('Nome da escola', 'Nome da pessoa', 'pessoa@exemplo.org');
