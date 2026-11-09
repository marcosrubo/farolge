# Entrada Google, Gmail e Drive — FAROL GE

## Fluxo implementado

1. A pessoa clica em **Entrar com Google** e escolhe qualquer conta Google, pessoal ou institucional.
2. Na mesma jornada, o Google apresenta as permissões de identificação, consulta ao Gmail e `drive.file` (consultar/criar/alterar arquivos criados pelo FAROL ou explicitamente abertos/autorizados para ele). Não se solicita acesso irrestrito ao Drive nem envio/alteração/exclusão de e-mails.
3. O callback do FAROL valida a identidade Google. O backend usa o ID token para entrar no Supabase Auth, que cria o registro em `auth.users` automaticamente no primeiro acesso. Não há formulário de cadastro nem senha do FAROL.
4. A sessão do portal fica em cookie opaco HttpOnly, Secure e SameSite=Lax. Tokens Google e Supabase ficam criptografados no banco, nunca no JavaScript ou localStorage. O servidor confirma a sessão com Supabase Auth antes de expor conexões.
5. As autorizações pessoais são associadas ao ID do usuário, e não apenas ao navegador. Ao voltar com a mesma conta, o usuário recupera suas conexões. Trocar de conta não transfere autorizações.
6. O quadro informa o endereço e a situação das permissões de Gmail e Drive. Recusar alguma permissão permite a entrada, mas mantém o serviço correspondente indisponível. O conteúdo dos módulos fica oculto enquanto não houver sessão verificada.

A conexão **Geral** continua separada, pois pode ser outra conta. Só responsáveis configurados podem iniciá-la, e a conta Google escolhida deve corresponder exatamente ao endereço geral cadastrado. Essa autorização é vinculada ao responsável; não é compartilhada automaticamente com outros usuários. Continua sendo uma aplicação de uma escola: o modelo para várias escolas e acesso compartilhado aos dados institucionais ainda precisa ser definido.

## Escopo entregue e limites

- Login aberto no código: não há lista de usuários pessoais nem filtro por `escola.pr.gov.br`.
- Autenticação continua distinta de autorização, embora ambas ocorram na mesma jornada pessoal.
- Permissão Drive incluída e confirmada pela API `about`. Os módulos ainda não têm navegador/editor de arquivos, Google Picker, criação de documentos ou atualização de planilhas. Essas operações serão conectadas quando as funções de cada módulo forem definidas; esta entrega implementa login e autorizações. Arquivos preexistentes não ficam todos acessíveis só por conceder `drive.file`.
- Sair encerra a sessão local do portal, preservando autorizações do usuário para futuros acessos. Desconectar remove a autorização armazenada para aquela conta/serviço no FAROL, sem encerrar o login ou revogar a concessão Google inteira (que pode ser usada por outra conexão). Revogação completa pode ser feita pela Conta Google.
- Sessão do portal limitada a 30 dias; a sessão Supabase é verificada e renovada no servidor. As conexões persistem vinculadas ao usuário até desconexão, revogação ou exclusão do usuário. Definir posteriormente política administrativa de retenção e exclusão de contas; não há conteúdo de mensagens/arquivos armazenado nesta etapa.
- Falhas temporárias mostram conexão não verificada. Revogação da concessão Google pede reconexão. O aplicativo não registra exceções que possam conter segredos.

## Ativação na nuvem — somente recursos do FAROL GE

Nenhuma tabela ou configuração remota foi aplicada por esta alteração. Não usar bancos DEV/PROD, Google Cloud, credenciais ou Vercel do PsicoTarefas.

### 1. Google Cloud

No projeto exclusivo **FarolGE**:

1. Habilitar Gmail API e Google Drive API (Marcos já informou essa etapa concluída).
2. Manter o cliente Web **Farol GE Web**, com origem de produção e callback:

   `https://farolge.vercel.app/api/google/callback`

3. Em **Data Access**, cadastrar os escopos `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.readonly` e `https://www.googleapis.com/auth/drive.file`.
4. No modo **Testing**, adicionar as contas que testarão o acesso. Aceitar qualquer conta no código não remove as restrições do Google. Para liberar o uso amplo, configurar Production e cumprir as exigências de verificação/exceções aplicáveis. `gmail.readonly` é um escopo restrito; verificar exigências antes da distribuição ampla.
5. A administração Workspace da SEED pode exigir liberação do aplicativo. O código não contorna bloqueios administrativos.

A conta pessoal pode ser Gmail ou outro endereço com Conta Google. Gmail API só funcionará se essa conta tiver o serviço Gmail disponível e autorizado. O código solicita leitura da caixa inteira; a seleção das demandas por marcadores será implementada nos módulos.

### 2. Supabase exclusivo do FAROL GE

1. No projeto FAROL GE, conferir e executar **todo** o arquivo `database/google-sessions.sql`. Ele pode ser executado novamente e cria:
   - `farol_google_sessions`: estados OAuth temporários e sessões opacas do portal, com payload criptografado e expiração;
   - `farol_google_connections`: conexões criptografadas, chaveadas por `auth.users.id` e tipo Geral/Pessoal, com remoção em cascata ao excluir o usuário.
2. As duas tabelas têm RLS e acesso revogado para `anon` e `authenticated`; somente o backend com `service_role` pode acessá-las. Não criar policies públicas para expor tokens.
3. Em **Authentication → Sign In / Providers → Google**, habilitar o provedor e informar o mesmo Client ID Web e o Client Secret atual do FAROL GE. Manter a verificação de nonce habilitada. Este fluxo usa `signInWithIdToken` no servidor; o callback direto do FAROL permanece sendo usado.
4. Manter permitida a criação de novos usuários no Supabase Auth. Não há cadastro manual nem necessidade de tabela `profiles` nesta etapa. Caso existam outras opções de login habilitadas, isso não cria botões para elas no FAROL.
5. Copiar a URL do projeto, a chave `anon`/publishable e a chave legada `service_role` para as variáveis da Vercel, exclusivamente de servidor. Não enviar pelo chat.

Usuários, identidades e sessões de autenticação são gerenciados pelo Supabase Auth. A aplicação valida a identidade Google antes de entregá-la ao Auth, que também a verifica. O nonce original fica no servidor e sua versão SHA-256 é enviada ao Google, conforme a exigência do Supabase.

### 3. Variáveis de servidor na Vercel

No projeto **farolge**, ambiente **Production**:

| Variável | Conteúdo |
| --- | --- |
| `FAROL_GOOGLE_ENABLED` | `true` após concluir a configuração |
| `FAROL_ORIGIN` | `https://farolge.vercel.app` (ou o domínio definitivo, com callback correspondente) |
| `GOOGLE_CLIENT_ID` | Client ID Web do FAROL GE |
| `GOOGLE_CLIENT_SECRET` | Segredo atual do FAROL GE |
| `FAROL_TOKEN_KEY` | Chave aleatória de 32 bytes codificada em base64 |
| `FAROL_SUPABASE_URL` | URL do Supabase exclusivo do FAROL GE |
| `FAROL_SUPABASE_ANON_KEY` | Chave anon/publishable do mesmo projeto |
| `FAROL_SUPABASE_SERVICE_ROLE_KEY` | Chave legada service_role do mesmo projeto |
| `FAROL_GENERAL_EMAIL` | Opcional: endereço exato da caixa geral da escola |
| `FAROL_GENERAL_ADMIN_EMAILS` | Opcional: e-mails dos responsáveis que podem conectar a caixa geral, separados por vírgula |

`FAROL_ALLOWED_PERSONAL_EMAILS` não é mais utilizada. Não é necessário preencher as variáveis da caixa Geral para o login pessoal funcionar. Sem responsáveis configurados, a conexão Geral fica indisponível.

Não colocar segredos em `config.js` nem versionar arquivos de credenciais. Manter a chave de criptografia em armazenamento seguro: perdê-la/trocá-la exige encerrar sessões e refazer as conexões criptografadas com a chave anterior.

Após salvar variáveis, publicar novamente. Usar Node.js 24.x, Framework Other e frontend estático na raiz; as rotas `/api/google/*` devem ser reconhecidas como Vercel Functions. Não habilitar previews com credenciais de produção. Configurar observabilidade para não capturar códigos do callback, cookies, tokens ou cabeçalhos de autorização.

## Migração da versão anterior

Conexões da versão de navegador não são adotadas automaticamente, pois não tinham proprietário autenticado. Estados OAuth antigos são recusados e os cookies antigos são limpos no próximo login. As pessoas precisam entrar novamente com Google.

Aplicar o SQL adicional antes de habilitar o novo código. A tabela de sessões anterior é preservada; seus registros antigos vencem pelo prazo já gravado, e podem ser expurgados administrativamente depois de conferidos. O código limpa sessões vencidas ao iniciar novos fluxos. Para prazo fixo de expurgo mesmo sem novos acessos, definir rotina de limpeza no projeto FAROL GE.

## Verificação

`npm test` executa testes sem servidor ou credenciais reais: login sem lista/domínio; registro automático; nonce/PKCE/estado de uso único; criptografia; consentimento parcial; proteção de conexão geral; troca de pessoa; persistência por proprietário; logout/revogação; cookies legados; interface e preservação do Radar.

Validar na Vercel após configuração: primeiro acesso de duas contas diferentes, retorno da mesma conta em outro navegador, conta geral com responsável permitido e não permitido, recusa de cada escopo, indisponibilidade dos provedores, revogação e expiração, ausência de segredos nos logs. Esses testes locais não equivalem a OAuth real nem a aprovação do Google/SEED.

## Referências oficiais consultadas

- [Google OAuth para aplicações Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase: Google e nonce](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase: signInWithIdToken](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken)
- [Escopos Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Escopos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Regras de verificação Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)
