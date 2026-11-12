# Entrada Google, Gmail e Drive — FAROL GE

## Fluxo implementado

1. O quadro apresenta duas conexões independentes: **Geral** e **Pessoal**, cada uma com Conectar/Desconectar. Não há uma etapa separada de entrada no FAROL GE. Qualquer uma pode ser conectada primeiro, ou usada sozinha.
2. Ao conectar uma delas, a pessoa escolhe a conta no Google e concede identificação, consulta ao Gmail e `drive.file` (consultar/criar/alterar arquivos criados pelo FAROL ou explicitamente abertos/autorizados para ele). Não se solicita acesso irrestrito ao Drive. A Geral solicita consulta ao Gmail; a Pessoal solicita também gmail.modify para aplicar etiquetas conforme a ação do usuário. O escopo é amplo, mas não há envio, exclusão ou edição do conteúdo de e-mails no aplicativo.
3. O callback valida a identidade Google. O backend usa o ID token para autenticar a própria conta no Supabase Auth, que cria o registro em `auth.users` automaticamente no primeiro acesso. Isso ocorre em ambas as conexões; não há formulário de cadastro nem senha do FAROL.
4. Cada conexão tem sua própria sessão em cookie opaco HttpOnly, Secure e SameSite=Lax. Tokens Google e Supabase ficam criptografados no banco, nunca no JavaScript ou localStorage. O servidor verifica cada sessão separadamente com Supabase Auth antes de expor a conexão correspondente.
5. Cada autorização pertence ao ID Supabase da própria conta Google e ao tipo Geral/Pessoal. Conectar, revisar, trocar ou desconectar uma delas preserva a outra. A conexão Geral não é vinculada ao usuário da Pessoal e não é recuperada automaticamente só por conectar uma conta Pessoal em outro navegador.
6. O quadro informa endereço e permissões realmente verificadas de Gmail e Drive por conexão. Recusar uma permissão mantém o serviço correspondente indisponível. O backend distingue `none`, `general`, `personal` e `both`, conforme as conexões verificadas.

Em **Geral**, a pessoa escolhe ou informa a conta geral da própria escola na página do Google. Em **Pessoal**, escolhe a própria conta. O endereço usado é obtido da identidade autorizada e validada no servidor, e confirmado nos serviços concedidos. Não há e-mail Geral fixo, filtro de domínio nem login pessoal obrigatório para Geral. `FAROL_GENERAL_EMAIL` e `FAROL_GENERAL_ADMIN_EMAILS` não são utilizadas, mesmo se permanecerem cadastradas na Vercel.

Em 09/11/2026, Marcos esclareceu que a plataforma poderá ser usada por qualquer escola do Paraná. As conexões ficam isoladas por identidade Google/Supabase e tipo. Escolher uma conta como Geral não concede acesso a conexões de outra conta nem comprova vínculo escolar. O cadastro/identificação de escolas, seus vínculos com pessoas e o compartilhamento/isolamento de dados por escola ainda serão definidos. A identidade visual configurada no frontend permanece como está; não é usada para autorizar contas.

As futuras operações de Demandas INSTITUCIONAIS dependem da Geral; o quadro de Demandas PESSOAIS usa a Pessoal. Conforme pedido de Marcos em 10/11/2026, as explicações estáticas de todos os módulos e o fluxograma do Radar permanecem visíveis mesmo sem conexão ou se a consulta de status falhar. Isso não concede autorização para dados ou operações das contas. As diferenças de comportamento em Visão GERAL, Radar e BI SEED ainda serão definidas por Marcos; não foram implementados dados nem regras adicionais nesses módulos.

## Escopo entregue e limites

- Login aberto no código: não há lista de usuários pessoais nem filtro por `escola.pr.gov.br`.
- Autenticação continua distinta de autorização, embora ambas ocorram na jornada de cada conexão, sem login separado no portal.
- Permissão Drive incluída e confirmada pela API `about`. Os módulos ainda não têm navegador/editor de arquivos, Google Picker, criação de documentos ou atualização de planilhas. Essas operações serão conectadas quando as funções de cada módulo forem definidas; esta entrega implementa login e autorizações. Arquivos preexistentes não ficam todos acessíveis só por conceder `drive.file`.
- Desconectar encerra somente a sessão do tipo escolhido e remove sua autorização armazenada no FAROL. A outra conexão é preservada. Não revoga a concessão Google inteira, que pode ser usada pela outra conexão. Revogação completa pode ser feita pela Conta Google. A rota interna de logout encerra as duas sessões do navegador sem apagar as autorizações; não há um botão separado de login/logout no quadro.
- Cada sessão de conexão é limitada a 30 dias; a sessão Supabase é verificada e renovada no servidor. As conexões persistem vinculadas ao usuário até desconexão, revogação ou exclusão do usuário. Definir posteriormente política administrativa de retenção e exclusão de contas; não há conteúdo de mensagens/arquivos armazenado nesta etapa.
- Falhas temporárias mostram conexão não verificada. Revogação da concessão Google pede reconexão. O aplicativo não registra exceções que possam conter segredos.

## Ativação na nuvem — somente recursos do FAROL GE

Nenhuma tabela ou configuração remota foi aplicada por esta alteração. Não usar bancos DEV/PROD, Google Cloud, credenciais ou Vercel do PsicoTarefas.

### 1. Google Cloud

No projeto exclusivo **FarolGE**:

1. Habilitar Gmail API e Google Drive API (Marcos já informou essa etapa concluída).
2. Manter o cliente Web **Farol GE Web**, com origem de produção e callback:

   `https://www.farolge.com.br/api/google/callback`

   A origem de produção é `https://www.farolge.com.br` e deve coincidir com `FAROL_ORIGIN` na Vercel. Endereços anteriores podem permanecer cadastrados no Google, mas o teste deve começar pela mesma origem configurada na aplicação.

3. Em **Data Access**, cadastrar os escopos `openid`, `email`, `profile`, `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/drive.file` e `https://www.googleapis.com/auth/gmail.labels`. O último é solicitado somente na conexão Pessoal, para listar e criar os quatro marcadores autorizados por Marcos; adicionar também `https://www.googleapis.com/auth/gmail.modify` para a classificação de mensagens, solicitada somente na Pessoal. Não adicionar `https://mail.google.com/`.
4. No modo **Testing**, adicionar as contas que testarão o acesso. Aceitar qualquer conta no código não remove as restrições do Google. Para liberar o uso amplo, configurar Production e cumprir as exigências de verificação/exceções aplicáveis. `gmail.readonly` é um escopo restrito; verificar exigências antes da distribuição ampla.
5. A administração Workspace da SEED pode exigir liberação do aplicativo. O código não contorna bloqueios administrativos.

6. Em **Branding**, cadastrar a página inicial `https://www.farolge.com.br/` e, após publicar os arquivos desta entrega, a política pública `https://www.farolge.com.br/privacidade.html`. O responsável e contato confirmados por Marcos são **Marcos Rubo** e **marcos.rubo@escola.pr.gov.br**. Verificar a propriedade do domínio e os demais requisitos indicados no painel. A página descreve a versão atual e não dispensa a análise de escopos, funcionalidades efetivamente implementadas nem a verificação aplicável do Google.

   Marcos confirmou a propriedade do prefixo `https://www.farolge.com.br/` no Search Console e salvou o nome **FAROL GE — Farol da Gestão Escolar** no Branding. A revisão 2 da política mantém esse nome e explicita as categorias de dados, suas finalidades, armazenamento, fornecedores, retenção e exclusão. O painel pediu aguardar 24 horas após verificar a propriedade antes de nova avaliação. A revisão não garante aprovação: se persistir o apontamento genérico de conteúdo insuficiente, conferir a versão realmente publicada e solicitar revisão manual com referência às seções da política, sem alegar aprovação ou funcionalidades inexistentes.

   Antes de solicitar verificação de acesso a dados para distribuição ampla, revisar a necessidade dos escopos contra as funções efetivamente implementadas. A política Google não permite solicitar permissões apenas para recursos futuros. O código atual ainda solicita `gmail.readonly` e `drive.file`, enquanto Demandas PESSOAIS consulta conversas por marcadores e a integração Drive ainda verifica somente a conta e suas autorizações. A leitura de mensagens já está implementada em Pessoal; operações de arquivos no Drive permanecem futuras.

A conta pessoal pode ser Gmail ou outro endereço com Conta Google. Gmail API só funcionará se essa conta tiver o serviço Gmail disponível e autorizado. O código solicita leitura da caixa inteira; Demandas PESSOAIS seleciona as conversas pelos três marcadores e permite classificar mensagens da Caixa de entrada adicionando etiquetas, sem envio ou edição do conteúdo.

### 2. Supabase exclusivo do FAROL GE

1. No projeto FAROL GE, conferir e executar **todo** o arquivo `database/google-sessions.sql`. Ele pode ser executado novamente e cria:
   - `farol_google_sessions`: estados OAuth temporários e sessões opacas do portal, com payload criptografado e expiração;
   - `farol_google_connections`: conexões criptografadas, chaveadas pelo `auth.users.id` da própria conta Google e tipo Geral/Pessoal, com remoção em cascata ao excluir o usuário.
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
| `FAROL_ORIGIN` | `https://www.farolge.com.br` (mesma origem usada no acesso e no callback Google) |
| `GOOGLE_CLIENT_ID` | Client ID Web do FAROL GE |
| `GOOGLE_CLIENT_SECRET` | Segredo atual do FAROL GE |
| `FAROL_TOKEN_KEY` | Chave aleatória de 32 bytes codificada em base64 |
| `FAROL_SUPABASE_URL` | URL do Supabase exclusivo do FAROL GE |
| `FAROL_SUPABASE_ANON_KEY` | Chave anon/publishable do mesmo projeto |
| `FAROL_SUPABASE_SERVICE_ROLE_KEY` | Chave legada service_role do mesmo projeto |

As oito variáveis acima atendem às duas conexões. `FAROL_ALLOWED_PERSONAL_EMAILS`, `FAROL_GENERAL_EMAIL` e `FAROL_GENERAL_ADMIN_EMAILS` não são mais utilizadas. Não cadastrar um endereço Geral na Vercel: a conta é escolhida na própria conexão Google. Na configuração inicial feita em 09/11/2026, as oito variáveis básicas foram cadastradas por Marcos. Nenhum valor secreto foi verificado pelo chat.

Não colocar segredos em `config.js` nem versionar arquivos de credenciais. Manter a chave de criptografia em armazenamento seguro: perdê-la/trocá-la exige encerrar sessões e refazer as conexões criptografadas com a chave anterior.

Após salvar variáveis, publicar novamente. Usar Node.js 24.x, Framework Other e frontend estático na raiz; as rotas `/api/google/*` devem ser reconhecidas como Vercel Functions. Não habilitar previews com credenciais de produção. Configurar observabilidade para não capturar códigos do callback, cookies, tokens ou cabeçalhos de autorização.

## Migração da versão anterior

O SQL não muda nesta correção. Se `database/google-sessions.sql` já foi executado integralmente, não é necessário criar novas tabelas ou policies.

A sessão única anterior (`__Host-farol-portal`) e os cookies do protótipo não são adotados pelo novo fluxo. Os estados OAuth anteriores também são recusados; será preciso conectar novamente as contas desejadas. Os cookies antigos são limpos no próximo callback bem-sucedido.

As novas sessões usam cookies e payloads separados por tipo, na mesma tabela de sessões criptografadas. Novas conexões Geral pertencem à identidade da própria conta geral escolhida no Google/Supabase, em vez de à conta pessoal de um responsável. O ajuste que remove o endereço Geral fixo mantém essas sessões independentes e não exige novas tabelas. Registros anteriores não são transferidos automaticamente, nem dão acesso pelo novo fluxo; permanecem no banco para revisão administrativa. Não foi aplicado expurgo remoto. Os registros temporários de sessões antigas vencem pelo prazo gravado; a limpeza ocorre ao iniciar novos fluxos. Para prazo fixo de expurgo mesmo sem novos acessos, definir rotina de limpeza no projeto FAROL GE.

## Marcadores da conexão Pessoal

Após validar a identidade no Google e Supabase, o callback Pessoal lista os marcadores em `users/me/labels` e cria somente os nomes ausentes: `1-ME DEVEM`, `2-MINHAS`, `3-DEVO` e `9-Classificado`. A criação segue essa ordem. O backend não renomeia nem exclui os marcadores anteriores; Marcos informou que fará a exclusão manual no Gmail. A permissão adicional `gmail.labels` é específica para gerenciar marcadores; não permite alterar mensagens. O código não renomeia/exclui marcadores e não chama essas operações na Geral. Aplicar etiquetas a mensagens é uma operação separada, autorizada depois por Marcos, descrita abaixo. Uma segunda conexão reaproveita os marcadores existentes. Em conflito concorrente, confirma novamente a existência antes de aceitar o resultado.

A listagem de nomes/IDs só é processada em memória. O payload criptografado guarda a indicação de permissão. O endpoint de status verifica a existência atual e informa `ready`, `missing`, `permission_required` ou `unavailable`, sem criar labels. Falha na preparação não apaga a conexão; usar **Revisar autorização** para tentar novamente. Recusar a permissão mantém os demais serviços concedidos. Desconectar não remove os marcadores do Gmail.

Para ativar: adicionar `https://www.googleapis.com/auth/gmail.labels` no Data Access do projeto FAROL GE, publicar código/política na Vercel e, na conexão **Pessoal**, clicar **Revisar autorização** e conceder o gerenciamento de marcadores. Não é necessário alterar variáveis Vercel nem executar SQL. A política (revisão 7) e o diálogo apresentam essa operação antes do consentimento. Validar na nuvem a criação, reconexão sem duplicatas, preservação das demais labels e da Geral. A verificação de acesso Google/SEED segue independente.

## Verificação

Pedidos de privacidade/exclusão chegam ao contato público da política. O atendimento é administrativo: confirmar a titularidade sem solicitar senhas ou tokens; localizar a identidade correta no Supabase Auth exclusivo do FAROL; atender o pedido e, quando couber exclusão integral, excluir esse usuário. A chave estrangeira remove suas conexões em cascata; as sessões restantes deixam de autorizar ao falhar a verificação da identidade e os registros temporários expiram conforme o prazo gravado. Não prometer exclusão imediata de backups ou registros dos fornecedores sem confirmar suas condições. Desconectar uma conta, isoladamente, não apaga o cadastro Auth. Nenhuma exclusão remota foi executada nesta entrega.

`npm test` executa testes sem servidor ou credenciais reais, incluindo criação das labels ausentes, reconexão sem duplicatas, conflitos concorrentes, recusa/falha de permissão, status sem escrita e preservação da Geral. Também cobre: entrada direta por Geral ou Pessoal; conexão em qualquer ordem; os quatro estados de conexão; troca/desconexão/expiração/revogação isoladas; escolha de contas Gerais de escolas diferentes, sem endereço fixo; isolamento entre essas contas; isolamento por conta/tipo; registro automático no Supabase; nonce/PKCE/estado de uso único; criptografia; consentimento parcial; cookies antigos; interface sem login separado; vínculo das Demandas à conexão correspondente e preservação do Radar.

Validar na Vercel após publicação: Geral primeiro, Pessoal primeiro, ambas, troca da Pessoal preservando Geral, desconexão de cada uma, seleção de contas Gerais diferentes e isolamento entre elas, recusa de cada escopo, falha/revogação/expiração isoladas e ausência de segredos nos logs. Os testes automatizados não equivalem a OAuth real nem a aprovação do Google/SEED. Não foram executados servidor local nem testes visuais locais.

## Referências oficiais consultadas

- [Google OAuth para aplicações Web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase: Google e nonce](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [Supabase: signInWithIdToken](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken)
- [Escopos Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Escopos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Regras de verificação Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification)

- [Gmail: listar marcadores](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/list)
- [Gmail: criar marcador](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/create)

## Quadro e acompanhamento Pessoal

Executar `database/personal-demands.sql` no Supabase exclusivo FAROL GE antes de usar prazos. As ações `/api/google/board` e `/api/google/thread` são GET; `/api/google/demand` é POST com Origin/X-Farol-Request. Todas exigem sessão Pessoal verificada, Gmail autorizado e confirmação da conta esperada. Os IDs e o proprietário nunca são aceitos como autorização por si só. O backend confere os marcadores da conversa e deriva o proprietário da sessão, sem herdar Geral. Erros de migração, autorização, indisponibilidade e conflito não simulam listas ou salvamentos bem-sucedidos.

A tabela é acessível somente pelo backend/service_role, com dados de acompanhamento criptografados e atualização condicional pela versão. Um acompanhamento por proprietário/threadId, referenciando a mensagem de origem, preserva o prazo quando chegam respostas. Responsável é separado por categoria, sem atribuir acesso a outra conta; em 2-MINHAS é o e-mail da conexão Pessoal. Não há correlação entre cópias da mesma mensagem em caixas diferentes, envio ou avisos de prazo. Retenção, histórico e exclusão constam da revisão 5 da política. A leitura e os prazos usam as permissões anteriores; a classificação da Caixa de entrada precisa de gmail.modify, conforme a seção abaixo.

Verificar na nuvem o roteiro de `README.md` → Demandas PESSOAIS e prazos. As novas verificações automatizadas cobrem autorização por sessão Pessoal, proprietário/conta, CSRF, SQL ausente, criptografia, gravação condicional, calendário de Brasília, histórico, múltiplos marcadores, paginação, respostas, conclusão manual e segurança do texto. Não houve teste visual local.

- [Gmail: listar conversas](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list)
- [Gmail: obter conversa](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get)

## Classificação da Caixa de entrada

## Classificação atualizada — 12/11/2026

A conexão Pessoal prepara os marcadores ausentes `1-ME DEVEM`, `2-MINHAS`, `3-DEVO` e `9-Classificado`, nessa ordem. Geral permanece independente. Consultar status não cria marcadores. Depois de publicar, usar **Pessoal → Revisar autorização** para preparar o quarto marcador; não há novo escopo, SQL ou variável nesta atualização. Continuam necessários gmail.labels e gmail.modify já descritos acima.

A Caixa de entrada lista mensagens individuais em páginas de 20. Classificar usa users.messages.modify na mensagem escolhida com addLabelIds contendo a categoria e 9-Classificado, e removeLabelIds contendo somente INBOX. Preserva UNREAD e as outras etiquetas. A mensagem sai da lista após sucesso confirmado e a conversa aparece nas colunas correspondentes. Não duplica e-mails. Ao abrir uma conversa, cada mensagem elegível tem botões para adicionar categorias, inclusive depois de movida para 9-Classificado; múltiplas categorias são permitidas. Mensagens fora de INBOX e 9-Classificado, spam, lixeira e rascunhos são recusadas. Não há envio, edição de conteúdo, exclusão ou alteração de leitura.

Responsável é separado por categoria no payload criptografado (mapa responsibles). Em 2-MINHAS é derivado automaticamente da identidade Pessoal verificada e não editável. Em 1-ME DEVEM e 3-DEVO é textual e independente; registros antigos conservam o responsável como valor inicial até edição da categoria. Prazo e conclusão continuam compartilhados por conversa. Versão global protege alterações concorrentes e o histórico identifica a categoria alterada. Não é necessário migrar o banco; preserva os registros existentes.

A política pública e o diálogo passam à revisão 7. Publicar pelo Git/Vercel e validar na nuvem: preparação dos quatro marcadores sem duplicação; classificar e conferir saída de INBOX, presença em 9-Classificado e categoria, preservação de UNREAD e outras etiquetas; adicionar as outras categorias pela conversa; salvar responsáveis diferentes; conferir 2-MINHAS com o próprio e-mail, persistência e histórico; contas distintas, recusa de permissões e falhas de rede. Nenhuma classificação retroativa em lote é executada. Mensagens antigas que ainda estejam em INBOX podem ser classificadas novamente para completar a movimentação.

Referências oficiais: [marcadores Gmail](https://developers.google.com/workspace/gmail/api/guides/labels) e [users.messages.modify](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify).
