-- Executar somente no Supabase exclusivo do FAROL GE, após temporary-access.sql.
begin;
alter table public."EmailsAutorizados" add column if not exists permissions text[];
alter table public."EmailsAutorizados"
  drop constraint if exists "EmailsAutorizados_permissions_check",
  add constraint "EmailsAutorizados_permissions_check" check (
    permissions is null or (
      array_position(permissions, null) is null and
      permissions <@ array['inicio','inspetores-monitores','radar','institucionais','pessoais','bi-seed','arquivo-morto','manutencao-sistema','configuracoes']::text[]
    )
  );
-- NULL conserva as permissões anteriores. Array vazio desabilita todos os módulos do cadastro.
notify pgrst, 'reload schema';
commit;
