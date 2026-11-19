-- Executar somente no Supabase exclusivo do FAROL GE, após temporary-access.sql.
begin;
alter table public."EmailsAutorizados"
  add column if not exists permissions text[] check (
    permissions is null or (
      array_position(permissions, null) is null and
      permissions <@ array['inicio','inspetores-monitores','radar','institucionais','pessoais','bi-seed','manutencao-sistema','configuracoes']::text[]
    )
  );
-- NULL conserva as permissões anteriores. Array vazio desabilita todos os módulos do cadastro.
notify pgrst, 'reload schema';
commit;
