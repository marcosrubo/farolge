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

- Marcos autorizou verificar e criar, ao conectar/reautorizar Pessoal, somente os marcadores Gmail ausentes `FarolGE_Devo`, `FarolGE_MeDevem` e `FarolGE_Minhas`. Usar `gmail.labels` exclusivamente na Pessoal; preservar a Geral e todos os marcadores existentes. Não aplicar marcadores às mensagens, enviar, alterar ou excluir e-mails. Mostrar situação real; falhas ou recusa não devem simular sucesso. Consultar status não cria marcadores. Contas antigas precisam revisar a autorização. Política de Privacidade atualizada para essa operação.

- Em 10/11/2026, Marcos autorizou criar a Política de Privacidade pública em `https://www.farolge.com.br/privacidade.html`, com responsável **Marcos Rubo** e contato público **marcos.rubo@escola.pr.gov.br**. Manter o texto coerente com os dados, fornecedores, retenção e operações realmente implementados. Atualizar a política antes de novas finalidades. A página tem links na barra superior e no diálogo de conexão; preservar esses acessos, sem restaurar rodapé ou conteúdos de exemplo.

- Em 10/11/2026, Marcos pediu que as explicações de todos os módulos e o fluxograma do Radar apareçam mesmo sem conexão, inclusive durante falhas de status. Não esconder esses conteúdos estáticos com base na autenticação. Dados e operações reais continuam sujeitos às autorizações de cada conexão.

- Em 09/11/2026, Marcos confirmou duas conexões independentes, Geral e Pessoal: qualquer uma pode ser conectada primeiro, sem uma entrada separada no FAROL GE. Conectar/trocar/desconectar uma preserva a outra. Demandas INSTITUCIONAIS usa Geral; Demandas PESSOAIS usa Pessoal. As diferenças em Visão GERAL, Radar e BI SEED ainda serão definidas; preservar seus conteúdos de desenvolvimento e fluxograma, sem inventar regras ou indicadores.

- Cada conexão valida sua própria Conta Google e cria automaticamente sua identidade no Supabase Auth, sem cadastro prévio. Gmail somente consulta; Drive permite consultar/criar/alterar arquivos criados pelo FAROL ou explicitamente autorizados (drive.file), sem acesso irrestrito. Em 09/11/2026, Marcos esclareceu que a plataforma poderá ser usada por qualquer escola do Paraná: a conta Geral é escolhida/informada na própria conexão com Google, sem e-mail fixo na Vercel, login pessoal prévio ou lista de responsáveis pessoais. O e-mail exibido deve vir da identidade autorizada e verificada pelo Google. Implementação e configuração em CONEXOES_GOOGLE.md. Não ampliar o modelo de múltiplas escolas sem alinhamento.

- O quadro de conexões abaixo do breadcrumb deve mostrar a identidade e as permissões realmente verificadas. Nenhum sucesso simulado ou senha solicitada no portal. Backend depende de configuração exclusiva FAROL GE no Google/Vercel/Supabase; credenciais criptografadas no servidor e conexões vinculadas ao usuário autenticado, não a cookies legados sem proprietário.

- Em 06/11/2026, Marcos pediu “em Desenvolvimento” com textos específicos em Visão GERAL, Demandas INSTITUCIONAIS, Demandas PESSOAIS, BI SEED e Configurações. Preservar o fluxograma já solicitado no Radar. Esses pedidos complementam a simplificação inicial abaixo, sem implementar integrações ou indicadores reais.

- Em 05/11/2026, Marcos pediu telas vazias: ao selecionar qualquer opção, mostrar somente “Meu espaço / nome da opção”. Preservar logos e menu, sem avisos, perfil de demonstração, slogans inferiores, rodapé, dados de exemplo ou conteúdo nos módulos, inclusive Configurações. Construir os conteúdos com a equipe conforme novos pedidos.

- Uma aplicação, um repositório e um projeto Vercel. Menu definido: Visão GERAL, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; manter o divisor antes de Configurações. BI SEED exibe o texto de desenvolvimento solicitado; indicadores reais ainda aguardam definição.
- Demandas INSTITUCIONAIS usa a caixa geral; Demandas PESSOAIS usa a caixa individual institucional. As funções dos módulos serão detalhadas conforme os pedidos de Marcos.
- Plataforma destinada a qualquer escola do Paraná. As contas são selecionadas em cada conexão; a arquitetura de cadastro/identificação das escolas, vínculos de pessoas e isolamento de dados por escola ainda será definida. Não inferir vínculo escolar somente pelo endereço de e-mail.
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
