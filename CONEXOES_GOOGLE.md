# Conexões Google do FAROL GE

## Implementação

O quadro aparece em todos os módulos, com conexões independentes Geral e Pessoal. Cada botão abre a explicação da integração e, quando o servidor estiver configurado, oferece **Continuar com Google**. O usuário escolhe a conta e autoriza somente consulta ao Gmail. Depois, retorna ao módulo de origem. O endereço só aparece após confirmação pela Gmail API.

Há opções de trocar e desconectar cada conta. Cancelar, usar conta errada ou negar a consulta não substitui a conexão existente. O estado é consultado ao abrir a aplicação e ao retornar à janela. Se o Google estiver indisponível, o painel indica que a conexão não foi verificada.

Backend: Vercel Functions em `api/google/[action].js`, biblioteca oficial `google-auth-library` e armazenamento de sessão em tabela dedicada do Supabase **exclusivo do FAROL GE**. Esta é uma implementação preparada para configuração; nenhuma tabela, credencial ou infraestrutura remota foi criada ou modificada por este trabalho.

## Limite desta etapa: sessão por navegador

Ainda não há login do portal ou modelo de permissões por pessoa/escola. Nesta etapa, cada autorização pertence apenas à sessão daquele navegador. A caixa geral NÃO é compartilhada automaticamente com outros usuários. O identificador aleatório da sessão fica em cookie HttpOnly, Secure e SameSite=Lax; tokens Google ficam somente no servidor/Supabase, criptografados com AES-256-GCM.

O piloto exige o endereço exato da caixa Geral e uma lista explícita de contas pessoais permitidas. Ter um endereço do domínio não basta. O usuário deve conseguir autenticar a conta e consentir com o acesso no Google. A arquitetura de várias escolas continua pendente; não habilitar esse backend para múltiplas escolas como se já houvesse isolamento por instituição.

A sessão expira em 30 dias ou antes se a autorização Google deixar de funcionar. Cookies não permitem separar duas pessoas que compartilham o mesmo perfil do navegador: é necessário desconectar antes da troca de operador. Não há importação ou armazenamento de mensagens nem recursos de envio/edição/exclusão.

## Configuração necessária

### 1. Google Cloud exclusivo do FAROL GE

1. Criar um projeto chamado FAROL GE no Google Cloud. Não usar o projeto do PsicoTarefas.
2. Em APIs e serviços, habilitar **Gmail API**.
3. Em Google Auth Platform, configurar Branding, Audience e Data Access. Usar External se o projeto não pertencer ao Workspace institucional; só é possível usar Internal quando a organização Workspace for proprietária e permitir essa configuração.
4. Para o piloto externo, adicionar como usuários de teste a conta geral e cada conta pessoal autorizada.
5. Cadastrar os escopos `openid`, `email` e `https://www.googleapis.com/auth/gmail.readonly`. O último permite consultar a caixa inteira, não só os e-mails com marcadores de demandas.
6. Criar um cliente OAuth do tipo **Web application**. Registrar a origem de produção escolhida, por exemplo `https://farolge.vercel.app`, e o redirect URI exato:

   `https://farolge.vercel.app/api/google/callback`

   Se for usar outro domínio, o callback e `FAROL_ORIGIN` devem usar esse mesmo domínio. Não cadastrar previews aleatórios.
7. Guardar Client ID e Client Secret nas variáveis de servidor da Vercel. Nunca colocar valores em `config.js`, arquivos versionados, capturas ou no chat.

A administração Workspace da SEED pode bloquear o aplicativo ou exigir sua liberação. `gmail.readonly` é um escopo restrito: antes da distribuição ampla, avaliar verificação Google e eventual avaliação de segurança aplicáveis. Em aplicações externas no modo Testing, refresh tokens com esse escopo normalmente expiram após sete dias; nesse caso será necessário reconectar. O código não contorna as políticas do domínio.

### 2. Armazenamento exclusivo do FAROL GE

1. Selecionar/criar o projeto Supabase exclusivo do FAROL GE. Não usar PROD ou DEV do PsicoTarefas.
2. Conferir e executar `database/google-sessions.sql` no SQL Editor desse projeto. O script cria apenas `farol_google_sessions`, habilita RLS e revoga acesso de `anon` e `authenticated`; somente o backend com `service_role` pode acessar a tabela.
3. Guardar URL do projeto e a chave legada `service_role` exclusivamente nas variáveis de servidor da Vercel.
4. Gerar uma chave aleatória de 32 bytes, codificada em base64, para `FAROL_TOKEN_KEY`. Gerá-la e armazená-la diretamente em ambiente seguro; não enviar pelo chat. Perder/trocar essa chave exige novas autorizações, pois os registros existentes não poderão ser decifrados.

O código grava estados OAuth de dez minutos e sessões de até 30 dias com payload criptografado; não grava conteúdo de mensagens. Estados são consumidos uma única vez com DELETE atômico. O início de uma conexão limpa registros vencidos. Definir rotina de expurgo periódico caso seja necessário garantir prazo fixo de remoção mesmo sem novos acessos. Enquanto o Supabase estiver pausado ou indisponível, as conexões não poderão ser verificadas/usadas.

### 3. Vercel: variáveis e publicação

Cadastrar em **Settings → Environment Variables**, somente no projeto FAROL GE e no ambiente Production:

| Variável | Conteúdo |
| --- | --- |
| `FAROL_GOOGLE_ENABLED` | `true` somente depois de completar os demais passos |
| `FAROL_ORIGIN` | Origem HTTPS de produção, sem caminhos |
| `GOOGLE_CLIENT_ID` | Client ID Web do FAROL GE |
| `GOOGLE_CLIENT_SECRET` | Client Secret do FAROL GE |
| `FAROL_TOKEN_KEY` | Chave AES de 32 bytes em base64 |
| `FAROL_SUPABASE_URL` | URL do Supabase exclusivo do FAROL GE |
| `FAROL_SUPABASE_SERVICE_ROLE_KEY` | Chave legada service_role exclusiva desse banco |
| `FAROL_GENERAL_EMAIL` | Endereço institucional exato da caixa geral |
| `FAROL_ALLOWED_PERSONAL_EMAILS` | E-mails individuais autorizados, separados por vírgula |

Manter Framework Preset Other e arquivos estáticos na raiz, com Node.js 24.x para as funções. O `package.json` instala a biblioteca Google; não há build do frontend. Fazer nova publicação depois de cadastrar variáveis. Confirmar na Vercel que as rotas `/api/google/*` foram criadas como Functions.

O fluxo fica desabilitado se faltar configuração ou se `FAROL_GOOGLE_ENABLED` não for `true`. A aplicação não simula sucesso. Preview deve permanecer desabilitado até ter callback, credenciais e armazenamento próprios de teste.

## Segurança e comportamento

- `start` e `disconnect` aceitam somente POST JSON com origem exata e cabeçalho próprio. O callback valida estado de dez minutos, vínculo ao navegador, uso único, PKCE S256, ID token (assinatura/audience/expiração), nonce, domínio Workspace, e-mail verificado, escopo e perfil Gmail.
- A caixa Geral precisa corresponder ao endereço configurado; Pessoal precisa estar na lista autorizada. O domínio `hd` no seletor é apenas uma sugestão e também é validado no retorno.
- Dados de sessão são separados por tipo e identificador aleatório; saber o endereço da conta não permite ler sua sessão. Nenhum token Google é devolvido ao JavaScript ou guardado em localStorage/sessionStorage.
- Ao consultar o estado, a biblioteca renova o access token se houver refresh token válido; o e-mail é confirmado novamente no Gmail. Falhas temporárias preservam as credenciais, mas não exibem conexão como confirmada.
- Desconectar remove a sessão e seus tokens deste navegador/servidor, sem revogar toda a concessão Google que pode atender outra conexão. Para revogar o aplicativo por completo, usar as conexões de terceiros da Conta Google; isso pode afetar as duas caixas quando a mesma conta tiver sido autorizada para ambas.
- Não registrar exceções OAuth: elas podem carregar segredos. Configurar a observabilidade da hospedagem para não capturar parâmetros sensíveis do callback, cabeçalhos de autorização ou cookies. As respostas têm `Cache-Control: no-store` e `Referrer-Policy: no-referrer`.

## Verificações

`npm test` executa testes sem servidor e sem contas reais, usando respostas controladas do Google e do armazenamento. Cobrem configuração inválida, adulteração da criptografia, validação da identidade, CSRF, estado de uso único, conta errada, consentimento insuficiente, cancelamento e independência das duas sessões.

Após configurar a nuvem, testar na Vercel: duas contas em ordens diferentes; troca e desconexão; conta não permitida; expiração/revogação; indisponibilidade do Supabase/Google; retorno ao módulo inicial; comportamento em outro navegador. Não confundir esses testes automatizados com validação real do OAuth ou aprovação da SEED.

## Documentação oficial consultada em 07/11/2026

- [Google OAuth para aplicações Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Validação OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Biblioteca oficial Node.js](https://googleapis.dev/nodejs/google-auth-library/latest/classes/OAuth2Client.html)
- [Escopos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Perfil da caixa Gmail](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile)
- [Controle de aplicativos pela administração Workspace](https://knowledge.workspace.google.com/admin/apps/control-which-third-party-and-internal-apps-access-google-workspace-data)
- [Functions Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js)
- [Segurança da API Supabase](https://supabase.com/docs/guides/api/securing-your-api)
