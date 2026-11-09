# FAROL GE — orientações para agentes

Ler este arquivo e o README.md antes de iniciar trabalho. Este projeto sucede o protótipo Demandas: FAROL GE é a plataforma e Demandas é um dos seus módulos. Preservar as artes existentes em `arte/`.

## Comunicação e trabalho

- Responder a Marcos em português do Brasil, com clareza e objetividade.
- Preservar alterações do usuário. Não alterar arquivos, credenciais ou infraestrutura do PsicoTarefas.
- Não executar Git destrutivo sem pedido explícito.
- Testes visuais e demonstrações serão na nuvem, pela Vercel. Não iniciar servidor local ou abrir HTML local salvo novo pedido explícito. Verificações estáticas são permitidas.
- Quando houver alterações versionadas, fornecer comandos simples, sem `cd` e sem `git -C`: `git add .`, `git commit -m "Mensagem"`, `git push`.
- Ao concluir, informar arquivos alterados, verificações e limitações.

## Direção confirmada

- Marcos aprovou entrada com qualquer Conta Google, sem cadastro prévio, com usuário criado automaticamente no Supabase Auth e solicitação de Gmail/Drive na mesma jornada. Gmail somente consulta; Drive permite consultar/criar/alterar arquivos criados pelo FAROL ou explicitamente autorizados (drive.file), sem acesso irrestrito. A caixa geral mantém fluxo próprio e permissão específica de responsáveis. Implementação e configuração em CONEXOES_GOOGLE.md. Não ampliar o modelo de múltiplas escolas sem alinhamento.

- O quadro de conexões abaixo do breadcrumb deve mostrar a identidade e as permissões realmente verificadas. Nenhum sucesso simulado ou senha solicitada no portal. Backend depende de configuração exclusiva FAROL GE no Google/Vercel/Supabase; credenciais criptografadas no servidor e conexões vinculadas ao usuário autenticado, não a cookies legados sem proprietário.

- Em 06/11/2026, Marcos pediu “em Desenvolvimento” com textos específicos em Visão GERAL, Demandas INSTITUCIONAIS, Demandas PESSOAIS, BI SEED e Configurações. Preservar o fluxograma já solicitado no Radar. Esses pedidos complementam a simplificação inicial abaixo, sem implementar integrações ou indicadores reais.

- Em 05/11/2026, Marcos pediu telas vazias: ao selecionar qualquer opção, mostrar somente “Meu espaço / nome da opção”. Preservar logos e menu, sem avisos, perfil de demonstração, slogans inferiores, rodapé, dados de exemplo ou conteúdo nos módulos, inclusive Configurações. Construir os conteúdos com a equipe conforme novos pedidos.

- Uma aplicação, um repositório e um projeto Vercel. Menu definido: Visão GERAL, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; manter o divisor antes de Configurações. BI SEED exibe o texto de desenvolvimento solicitado; indicadores reais ainda aguardam definição.
- Demandas INSTITUCIONAIS usa a caixa geral; Demandas PESSOAIS usa a caixa individual institucional. As funções dos módulos serão detalhadas conforme os pedidos de Marcos.
- Identidade configurável por escola, com intenção de compartilhar a plataforma com outras instituições. A arquitetura para atender várias escolas ainda não foi aprovada.
- Demandas usa Gmail; contas pessoais e institucionais serão atendidas. Cada caixa exige autorização própria. Uma sessão no Gmail não comprova autorização do aplicativo.
- As três colunas e marcadores constam no README. Tratamento de marcadores simultâneos e precedência de arquivadas ainda pendem de validação.
- Iniciar com consulta a e-mails; não implementar envio, exclusão ou alteração sem definir o escopo com Marcos.
- E-mails permanecem no Gmail. Google Drive/Planilhas foi discutido para pequenos volumes adicionais, sem decisão de arquitetura fechada.
- Abertura automática e maximizada no Linux depende de configuração local.

## Segurança e protótipo

- Usar apenas dados fictícios no protótipo e indicar claramente integrações inexistentes.
- Senhas somente ao Google. Nunca registrar credenciais, tokens ou conteúdo de e-mails em logs; nunca versionar segredos ou colocá-los no frontend.
- Separar autenticação, autorização de Gmail/Drive e permissões por escola e pessoa.
- Não tratar níveis ilustrativos de frequência como critérios oficiais, diagnósticos ou avaliações automáticas de risco.
- Consultar documentação oficial atual antes de implementar as integrações do Google.
