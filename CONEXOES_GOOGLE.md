# Conexões institucionais — planejamento

## Situação atual

O quadro abaixo do breadcrumb aparece em todos os módulos. Geral e Pessoal possuem botões independentes. Ambos permanecem em “NÃO conectado”: os botões explicam a finalidade da caixa e a indisponibilidade da integração. Não abrem o Gmail nem simulam autorização. Fechar a explicação ou navegar entre módulos não altera o estado.

A exibição de um endereço conectado ainda não está implementada: depende de confirmação pelo servidor após a autorização real. Não há cliente OAuth, autenticação do portal, backend ou armazenamento de autorizações configurados neste repositório. Este documento propõe o fluxo; não fecha a arquitetura de armazenamento nem altera infraestrutura.

## Experiência proposta

1. O usuário entra no FAROL GE. A sessão do portal e as autorizações de caixas são verificadas separadamente.
2. Clica em Conectar na linha Geral ou Pessoal. O servidor verifica a permissão para conectar a caixa escolhida. Para Geral, exigir uma pessoa autorizada pela escola; Pessoal pertence ao usuário do portal.
3. O Google apresenta o seletor de contas. Usar `prompt=select_account` e a sugestão de domínio `hd=escola.pr.gov.br`. O domínio é apenas uma ajuda de seleção; não substitui a validação no servidor. Quando já houver endereço esperado configurado, usar `login_hint` para reduzir digitação.
4. Na primeira autorização, solicitar apenas os escopos necessários para identificação e consulta: `openid`, `email` e `https://www.googleapis.com/auth/gmail.readonly`. Não pedir envio, exclusão nem alteração de marcadores. Esse escopo permite leitura da caixa, não somente dos e-mails de demandas; o filtro de demandas será aplicado pelo aplicativo.
5. O servidor troca o código OAuth por tokens e confirma a identidade, os escopos e o endereço da caixa com `users.getProfile(me)`. Validar domínio exato `escola.pr.gov.br` e, para a caixa Geral, o endereço esperado cadastrado pela escola. Não deduzir caixa geral ou pessoal pelo prefixo do e-mail.
6. Só após essa validação, mostrar o endereço confirmado na linha correspondente. Nunca considerar como conectado um e-mail digitado, uma conta aberta no Gmail, um parâmetro da URL ou um valor salvo no navegador.
7. Voltar ao módulo de origem. Autorizar Geral não autoriza Pessoal e vice-versa. Falha, cancelamento, domínio inválido ou permissão negada preservam a outra caixa e mostram mensagem específica junto à linha afetada.
8. Ao revisitar o portal, recuperar o estado do servidor sem pedir consentimento novamente desnecessariamente. Renovar tokens no servidor quando permitido. Revogação ou expiração exige reconexão da caixa afetada. Fornecer opções de troca e desconexão, esclarecendo efeitos de revogar uma autorização Google usada em mais de uma conexão.

## Requisitos para ativar

- Projeto Google Cloud exclusivo do FAROL GE, Gmail API habilitada e cliente OAuth do tipo aplicação Web. Não usar recursos do PsicoTarefas.
- Confirmar a origem HTTPS de produção e registrar o callback exato no cliente OAuth; não usar endereços temporários de preview indiscriminadamente.
- Configurar consentimento e usuários de teste. `gmail.readonly` é um escopo restrito; avaliar as exigências de verificação do Google e eventual avaliação de segurança conforme a distribuição e o tratamento de dados. Modo externo de teste pode exigir nova autorização após expiração dos refresh tokens, normalmente sete dias para esse escopo.
- Confirmar se a administração do Google Workspace da SEED permite o cliente OAuth. Ser dono do endereço pessoal ou da caixa geral não garante permissão administrativa para o aplicativo.
- Definir autenticação do portal, permissões por usuário/escola e armazenamento seguro antes de implementar o backend. A conexão da caixa geral não concede acesso automaticamente a todos os usuários.
- Segredos e tokens somente no servidor; armazenamento persistente criptografado, isolado por escola, usuário e tipo da conexão. Nada de tokens em HTML, JavaScript público, localStorage, logs ou Git. Não armazenar conteúdo de e-mails como parte dessa configuração.
- Fluxo OAuth com `state` aleatório, de uso único, prazo curto e vinculado à sessão e à caixa; validar ID token e sessão. Usar cookies seguros HttpOnly/Secure/SameSite e biblioteca oficial para o fluxo. Não aceitar destino de retorno arbitrário.
- Pedir acesso offline somente se a persistência da autorização for aprovada; evitar pedir consentimento repetidamente quando uma autorização válida já existir.

## Validação na Vercel antes de liberar

Testar as duas caixas em ordens diferentes; contas Google simultâneas; conta externa ao domínio; endereço incorreto na caixa Geral; cancelamento/negação; tentativa sem permissão; expiração/revogação; troca de usuário; retorno ao módulo inicial; isolamento entre usuários/escolas. Confirmar que somente leitura é permitida e que segredos, códigos e tokens não aparecem em logs ou URLs após o callback.

## Referências oficiais consultadas em 07/11/2026

- [OAuth para aplicações Web e parâmetros do fluxo](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Escopos da Gmail API e classificação restrita](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Confirmação do endereço da caixa: users.getProfile](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile)
- [Controle de aplicativos pela administração do Google Workspace](https://knowledge.workspace.google.com/admin/apps/control-which-third-party-and-internal-apps-access-google-workspace-data)
