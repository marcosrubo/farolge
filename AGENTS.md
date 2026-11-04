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

- Uma aplicação, um repositório e um projeto Vercel, com módulos Demandas, Agenda Institucional, Frequência e Radar.
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
