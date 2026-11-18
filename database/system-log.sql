-- Executar somente no Supabase exclusivo do FAROL GE, antes de publicar.
begin;

create table if not exists public."LogDoSistema" (
  "IP" inet,
  data date not null default ((statement_timestamp() at time zone 'America/Sao_Paulo')::date),
  hora time not null default ((statement_timestamp() at time zone 'America/Sao_Paulo')::time),
  movimento text not null default 'Acessando o sistema',
  "Observacao" text
);

alter table public."LogDoSistema" enable row level security;
revoke all on public."LogDoSistema" from public, anon, authenticated, service_role;
grant insert ("IP", "Observacao") on public."LogDoSistema" to service_role;
notify pgrst, 'reload schema';
commit;

-- Consulta administrativa no SQL Editor:
-- select * from public."LogDoSistema" order by data desc, hora desc limit 100;
