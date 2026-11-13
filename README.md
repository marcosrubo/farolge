# FAROL GE — Farol da Gestão Escolar

Protótipo para apresentar a proposta da plataforma à equipe da escola. Frontend em HTML, CSS e JavaScript, organizado por módulos, com backend de login e autorização Google em Vercel Functions. A biblioteca oficial Google é instalada pelo package.json; o frontend não tem etapa de compilação.

## Estrutura atual para apresentação

- Logos da plataforma e do colégio, com o nome da instituição em três linhas.
- Menu: Visão GERAL, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; um divisor separa Configurações.
- As opções mostram “Meu espaço / nome da opção”. Radar também apresenta o fluxo solicitado: RCO, SINAN, SERP, ATAS, Busca ATIVA e Alunos convergem para ANÁLISES, com saídas DOSSIÊ individual e Relação diária de FALTAS.
- Visão GERAL, BI SEED e Configurações exibem “em Desenvolvimento” e os textos definidos por Marcos em 06/11/2026. A Visão GERAL lista os quatro grupos de indicadores previstos. BI SEED apresenta o texto sobre os indicadores/resumos previstos para uma visão simplificada da situação da escola.
- O menu destaca a opção ativa e o título da aba acompanha a seleção.
- Abaixo do breadcrumb, o quadro apresenta duas conexões independentes, Geral e Pessoal, cada uma com Conectar/Desconectar. Não há etapa separada de entrada no FAROL GE: qualquer conexão pode ser feita primeiro. Cada conta é validada no Google e no Supabase Auth na mesma jornada de autorização de consulta ao Gmail e Drive com escopo drive.file. A conexão Pessoal prepara seus quatro marcadores. A GERAL solicita gmail.modify para preparar Classificadas/Arquivadas e permitir as movimentações institucionais por escolha do usuário. As permissões concedidas são indicadas separadamente. Em Geral, a pessoa escolhe/informa no Google a conta geral da sua escola; em Pessoal, escolhe a própria conta. Ambas aceitam uma Conta Google autorizada e verificada, sem endereço Geral fixo na Vercel. Configuração em [CONEXOES_GOOGLE.md](CONEXOES_GOOGLE.md).
- Foram retirados cartões, tabelas, exemplos, gráficos, filtros, datas, avisos, ajuda, roteiro de apresentação, formulários, rodapé e textos inferiores da barra lateral.

A simplificação foi solicitada por Marcos em 05/11/2026 para construir o conteúdo em conjunto com a equipe. Posteriormente, Marcos solicitou o fluxograma de Radar e os textos de desenvolvimento nas demais telas descritas acima. Os quadros dos demais módulos são uma estrutura visual, sem abertura de registros ou análises implementadas e sem integração aos sistemas citados. Em telas estreitas, o fluxo pode ser percorrido horizontalmente. Os endereços de e-mail nos textos são ilustrativos. Não preencher novamente as telas com exemplos ou sugestões de funcionalidades sem pedido. Não há dados de estudantes importados. Demandas PESSOAIS agora consulta conversas reais dos três marcadores, quando a conta Pessoal está autorizada. O backend OAuth foi implementado, mas depende de configuração externa e Marcos confirmou a conexão com duas contas Google reais. Cada conexão tem sessão própria verificada e autorização vinculada ao ID Supabase da própria conta Google. A conta Pessoal não herda a conexão Geral em outro navegador. Em 10/11/2026, Marcos pediu que as explicações de todos os módulos e o fluxograma do Radar sejam visíveis mesmo sem conexão, inclusive em caso de falha na verificação das contas. Esses conteúdos são estáticos e explicativos. Demandas INSTITUCIONAIS usa exclusivamente a GERAL para as três colunas, classificação com prazo confirmado e arquivamento descritos ao final deste README. Demandas PESSOAIS usa exclusivamente a Pessoal. As diferenças operacionais entre somente Geral, somente Pessoal e ambas nos demais módulos aguardam definição de Marcos.

## Publicação na nuvem

Os testes visuais e a demonstração de Marcos serão feitos sempre pela Vercel. Não iniciar servidor local ou abrir HTML local para testes, salvo novo pedido explícito.

1. Criar um repositório próprio chamado `farolge` no GitHub. Se for enviar esta pasta pelo Git, criar o repositório vazio, sem outro README.
2. Enviar o conteúdo desta pasta preservando a estrutura, inclusive `arte/`. O arquivo `index.html` deve ficar na raiz do repositório.
3. Na Vercel, criar um projeto e importar esse repositório.
4. Selecionar **Framework Preset: Other**; manter a raiz do projeto como `./`, sem comando de build. Para saída estática na raiz, usar `.` se for necessário preencher Output Directory.
5. Publicar e abrir o endereço retornado pela Vercel. O domínio personalizado `farolge.com.br` pode ser conectado depois de confirmar seu registro e a configuração DNS.

Referência oficial: [publicação estática sem build na Vercel](https://vercel.com/docs/builds/configure-a-build#skip-build-step).

Depois de conectar o repositório à Vercel, os próximos envios à branch de produção gerarão novas publicações. Este trabalho prepara os arquivos: não cria repositório remoto, não publica e não configura domínio.

Para iniciar o Git nesta pasta, depois de conferir os arquivos:

```sh
git init -b main
git add .
git commit -m "Cria protótipo do Farol GE"
```

Após criar o repositório remoto, usar o comando `git remote add origin` com o endereço exato fornecido pelo GitHub e executar `git push -u origin main`. Nas atualizações seguintes:

```sh
git add .
git commit -m "Atualiza protótipo do Farol GE"
git push
```

## Política de Privacidade

A página pública `privacidade.html` usa `privacidade.css`, abre sem autenticação e tem links na barra superior e no diálogo de conexão. Após publicar na Vercel, o endereço é `https://www.farolge.com.br/privacidade.html`, para cadastrar em Google Auth Platform → Branding → Privacy policy. A página informa o funcionamento atual, dados e permissões, fornecedores, retenção, Uso Limitado das APIs Google e pedidos de exclusão. Marcos confirmou em 10/11/2026 o responsável **Marcos Rubo** e o contato público **marcos.rubo@escola.pr.gov.br**. Rever a política antes de mudar operações ou finalidades; esta página não representa aprovação do aplicativo pelo Google ou pela SEED/NRE.

A revisão 2, de 10/11/2026, usa a identificação completa **FAROL GE — Farol da Gestão Escolar**, confirmada por Marcos no Branding Google. Detalha em tabela a coleta, finalidade e armazenamento por categoria, o papel de cada fornecedor, Uso Limitado e o atendimento administrativo da exclusão. Foi preparada após o verificador apontar conteúdo insuficiente; não foi aprovada pelo Google. A propriedade da página inicial foi confirmada por Marcos no Search Console por tag HTML. Preservar a tag de verificação no `index.html`. Publicar a revisão e respeitar o intervalo de 24 horas solicitado no painel após a comprovação de propriedade antes de tentar novamente o Branding.

## Personalização da escola

Editar `config.js` para definir o nome público, as iniciais, a descrição e o caminho do emblema da escola (`schoolLogo`). Sem descrição, a linha secundária fica oculta. Sem emblema, aparecem as iniciais como alternativa.

A identificação do colégio usa o emblema à esquerda e apenas “COLÉGIO ESTADUAL CÍVICO MILITAR THIAGO TERRA” ao lado. O arquivo `arte/thiago-terra-identidade-original.png` preserva o cabeçalho original enviado por Marcos; o CSS mostra somente o emblema da faixa esquerda, sem redesenhar a arte. O símbolo do farol continua sendo a marca da plataforma. As artes originais foram preservadas. A fonte DM Sans é carregada do Google Fonts; há alternativa com fontes do sistema.

Na conexão Pessoal, o backend verifica e cria somente os marcadores ausentes entre estes quatro:

| Marcador | Destino |
| --- | --- |
| `1-ME DEVEM` | 1-ME DEVEM |
| `2-MINHAS` | 2-MINHAS |
| `3-DEVO` | 3-DEVO |
| `9-Classificado` | Mensagens classificadas |

As três colunas mostram as conversas dos marcadores. Uma conversa com múltiplos marcadores aparece nas respectivas colunas com o mesmo prazo e conclusão, mas responsáveis por categoria. A precedência de arquivadas ainda não foi definida; não é aplicada exclusão de conversas por estarem fora da Caixa de entrada. Spam, lixeira e rascunhos não originam cartões. Não são renomeados/excluídos marcadores antigos. A Caixa de entrada abaixo do quadro permite adicionar uma das três etiquetas à mensagem escolhida, adicionando também 9-Classificado e removendo somente INBOX. A data de um e-mail não deve ser convertida automaticamente em prazo.

A Pessoal solicita adicionalmente `gmail.labels`. Após publicar, contas já conectadas precisam usar **Revisar autorização** e conceder essa permissão. O status mostra se as quatro labels existem; consultar status não cria marcadores. Falhas mantêm a conta conectada e pedem nova revisão para tentar novamente. A Geral não solicita esse escopo nem consulta/cria essas labels. Desconectar preserva os marcadores no Gmail. Marcos confirmou a criação real na Vercel com os nomes anteriores. A alteração para os nomes numerados ainda deve ser validada após publicação. Os nomes usados no servidor são fixos; editar `config.js` não altera as operações do backend.

A revisão 3 acrescentou a consulta e criação dos três marcadores na conexão Pessoal e sua retenção no Gmail. A revisão 4 atualiza seus nomes para `1-ME DEVEM`, `2-MINHAS` e `3-DEVO`, nessa ordem de criação. O backend não renomeia nem remove os marcadores anteriores; Marcos informou que os excluirá manualmente no Gmail.

## Limites e próximos passos

Há login Google integrado à solicitação de Gmail e Drive, condicionado à configuração de Google Cloud, Supabase Auth, tabelas e variáveis Vercel. Supabase Auth gerencia auth.users e cria usuários automaticamente; a aplicação não pede cadastro manual nem senha própria. Credenciais ficam criptografadas no backend. O quadro de conexões mostra endereço e permissões confirmadas; o módulo Pessoal mostra as conversas autorizadas.

Esta entrega não implementa lista/editor de arquivos, criação de documentos, edição de planilhas, envio de mensagens, notificações ou indicadores reais nos módulos. A autorização drive.file prepara essas operações nos arquivos criados ou explicitamente autorizados para o aplicativo. A plataforma se destina a qualquer escola do Paraná. O cadastro de escolas, seus vínculos e o compartilhamento/isolamento de dados institucionais ainda precisam ser definidos; permitir escolher contas de escolas diferentes nesta etapa não implementa essa arquitetura. Ver detalhes e migração em CONEXOES_GOOGLE.md.

Antes da ativação real, habilitar o provedor Google no Supabase exclusivo do FAROL GE, executar database/google-sessions.sql, configurar variáveis e validar o fluxo na Vercel. O modo Testing do Google continua exigindo contas de teste, mesmo com entrada aberta no código; uso amplo depende da configuração Production e das regras de verificação aplicáveis.

Este projeto é independente do PsicoTarefas. A abertura automática e maximizada no Linux será uma configuração do navegador na máquina, depois de existir um endereço publicado.

## Demandas PESSOAIS e prazos

Marcos autorizou implementar o quadro e o acompanhamento para conferir na Vercel. A página mostra três colunas, um cartão por conversa por coluna, até 20 conversas por carregamento, com paginação. Busca, contagem, filtros de não lidas/pendentes/concluídas e ordenação operam sobre as conversas carregadas. A seleção por marcadores pode ser feita pelo usuário no Gmail ou pelos botões da Caixa de entrada abaixo das colunas. Sem conexão, a explicação e a estrutura permanecem visíveis.

Ao abrir um cartão: leitura de mensagens em texto simples, remetente/destinatário e data; quando só há HTML ou texto externo à resposta da API, exibe prévia e link para o Gmail. HTML não é inserido na página, imagens remotas não são carregadas, anexos não são baixados e ler no FAROL não marca como lido. Uma resposta não conclui a demanda.

O formulário permite definir/editar/remover a data limite, informar responsável por categoria (nome/e-mail livre em 1-ME DEVEM e 3-DEVO; conta Pessoal em 2-MINHAS), concluir/reabrir o trabalho e consultar o histórico. Prazos são datas civis no fuso America/Sao_Paulo, sem hora limite; ficam visíveis como sem prazo, vence em data, vence hoje, atraso em dias ou concluída. Não há notificação nem envio automático; comunicar o prazo ao destinatário no texto do e-mail.

Uma demanda pertence à identidade da conta Pessoal e à conversa (`threadId`), com ID próprio e referência à mensagem de origem. Não correlaciona automaticamente cópias nas caixas de remetente/destinatário nem compartilha dados com outra pessoa ou escola. As respostas usam o acompanhamento da mesma conversa. Alterações concorrentes são rejeitadas por versão, para não perder histórico. O backend verifica a identidade e os marcadores antes de ler/gravar; a conta Geral não dá acesso.

### Ativação

1. No SQL Editor do Supabase **exclusivo FAROL GE**, executar `database/personal-demands.sql` (depois das tabelas de `database/google-sessions.sql`, já usadas pelas conexões).
2. Publicar os arquivos pelo Git/Vercel. Para leitura e prazos não há variável ou escopo Google novo: usa o `gmail.readonly` já autorizado. Para classificação da Caixa de entrada, acrescentar `gmail.modify` conforme a seção abaixo. Política atualizada para revisão 5, incluindo leitura de conversas, dados de acompanhamento, histórico e retenção.
3. Na Vercel, abrir Demandas PESSOAIS com a conta Pessoal conectada. Classificar um e-mail em `1-ME DEVEM` no Gmail, clicar Atualizar no FAROL, abrir o cartão e salvar um prazo. Atualizar/recarregar a página para confirmar persistência. Conferir edição/remoção, conclusão/reabertura, duas janelas e conta diferente. Nenhum teste visual local ou publicação remota foi realizado por esta entrega.

A tabela `farol_personal_demands` tem RLS, sem policies/acesso de anon/authenticated, com FK para auth.users e exclusão em cascata. O backend cifra prazo, responsável, conclusão, mensagem de origem e histórico com AES-GCM; IDs técnicos de proprietário/conversa, ID próprio, versão e horário permanecem metadados. Não grava corpo, assunto, trechos, anexos ou lista de participantes. Disconnect remove a conexão, mas preserva acompanhamento e histórico para a reconexão da mesma conta; exclusão integral é administrativa conforme política. Não manter cópias de e-mails em logs ou armazenamento local.

## Classificação atualizada — 12/11/2026

A conexão Pessoal prepara os marcadores ausentes `1-ME DEVEM`, `2-MINHAS`, `3-DEVO` e `9-Classificado`, nessa ordem. Geral permanece independente. Consultar status não cria marcadores. Depois de publicar, usar **Pessoal → Revisar autorização** para preparar o quarto marcador; não há novo escopo, SQL ou variável nesta atualização. Continuam necessários gmail.labels e gmail.modify já descritos acima.

A Caixa de entrada lista mensagens individuais em páginas de 20. Classificar usa users.messages.modify na mensagem escolhida com addLabelIds contendo a categoria e 9-Classificado, e removeLabelIds contendo somente INBOX. Preserva UNREAD e as outras etiquetas. A mensagem sai da lista após sucesso confirmado e a conversa aparece nas colunas correspondentes. Não duplica e-mails. Ao abrir uma conversa, cada mensagem elegível tem botões para adicionar categorias, inclusive depois de movida para 9-Classificado; múltiplas categorias são permitidas. Mensagens fora de INBOX e 9-Classificado, spam, lixeira e rascunhos são recusadas. Não há envio, edição de conteúdo, exclusão ou alteração de leitura.

Responsável é separado por categoria no payload criptografado (mapa responsibles). Em 2-MINHAS é derivado automaticamente da identidade Pessoal verificada e não editável. Em 1-ME DEVEM e 3-DEVO é textual e independente; registros antigos conservam o responsável como valor inicial até edição da categoria. Prazo e conclusão continuam compartilhados por conversa. Versão global protege alterações concorrentes e o histórico identifica a categoria alterada. Não é necessário migrar o banco; preserva os registros existentes.

A política pública e o diálogo passam à revisão 7. Publicar pelo Git/Vercel e validar na nuvem: preparação dos quatro marcadores sem duplicação; classificar e conferir saída de INBOX, presença em 9-Classificado e categoria, preservação de UNREAD e outras etiquetas; adicionar as outras categorias pela conversa; salvar responsáveis diferentes; conferir 2-MINHAS com o próprio e-mail, persistência e histórico; contas distintas, recusa de permissões e falhas de rede. Nenhuma classificação retroativa em lote é executada. Mensagens antigas que ainda estejam em INBOX podem ser classificadas novamente para completar a movimentação.

Referências oficiais: [marcadores Gmail](https://developers.google.com/workspace/gmail/api/guides/labels) e [users.messages.modify](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify).

## Lista de 9-Classificado no final da tela

Demandas PESSOAIS exibe, abaixo da Caixa de entrada, a relação de mensagens individuais de `9-Classificado`, com remetente, assunto, data, trecho, estado de leitura, categorias e link para o Gmail. Usa páginas de 20, botão Carregar mais, atualização própria e busca nos registros carregados, independente dos filtros das três colunas. Categorias já aplicadas aparecem com indicação e botão desabilitado. As demais podem ser acrescentadas individualmente, preservando sempre `9-Classificado`, UNREAD e todas as categorias anteriores. A classificação na entrada atualiza também essa lista e as colunas sem exigir recarga da página.

`GET /api/google/classified` exige a mesma identidade Pessoal e permissão de leitura dos demais endpoints; resolve o ID de 9-Classificado no servidor e lista somente metadados de mensagens desse marcador, sem spam, lixeira ou rascunhos. A consulta não cria marcadores e não depende da tabela de prazos. As ações continuam usando o endpoint classify existente, sem aceitar operações arbitrárias. Não há novo escopo, SQL ou variável. Política revisão 8. Publicar e validar na Vercel: listagem, paginação, categorias simultâneas, permanência em 9-Classificado, preservação de prazos/responsáveis e troca de conta.


## Demandas INSTITUCIONAIS — três colunas e prazo confirmado

Em 13/11/2026, Marcos definiu três colunas na conexão **GERAL**, com mensagens individuais:

- **Caixa de entrada:** todas as mensagens em INBOX, mais recentes primeiro, por data/hora de recebimento (`internalDate` do Gmail).
- **Classificadas:** mensagens com o marcador Classificadas, ordenadas pela data limite salva mais antiga primeiro. Mensagens com esse marcador aplicadas externamente, sem prazo no FAROL, aparecem ao final com indicação.
- **Arquivadas:** mensagens com o marcador Arquivadas, mais recentes primeiro pela data/hora da mensagem; não pela data do arquivamento.

Ao conectar/reautorizar GERAL, o callback verifica e cria somente os ausentes **Classificadas** e **Arquivadas**, nessa ordem, após validar a identidade Google/Supabase. Status e listagens não criam marcadores. Os quatro marcadores pessoais e a conexão Pessoal continuam independentes. Reconectar não duplica nem renomeia marcadores; desconectar não os exclui. O Google representa essas pastas como marcadores.

**Classificar** exige a escolha explícita de uma data limite válida no cartão da entrada. O backend salva o prazo vinculado ao e-mail GERAL verificado e ao ID da mensagem, depois adiciona Classificadas e remove somente INBOX. **Arquivar** está disponível na entrada e nas classificadas: adiciona Arquivadas e remove somente INBOX e Classificadas. Preserva UNREAD e todos os outros marcadores. A operação é da mensagem escolhida, não de toda a conversa; não envia, edita conteúdo, exclui nem marca como lida. Arquivar preserva o prazo. Não há reabertura, edição do prazo em Classificadas ou histórico institucional nesta versão.

A tabela `farol_institutional_demands` tem RLS e acesso exclusivo do backend/service_role. A chave composta é proprietário Supabase + ID da mensagem. O payload AES-GCM contém o e-mail verificado da conta GERAL e a data limite civil de Brasília. Versão e horário são metadados. Não guarda assunto, corpo, trechos ou anexos. O proprietário e o e-mail vêm da sessão verificada, não de parâmetros que concedam acesso. A atualização usa versão condicional. Registros permanecem ao desconectar/arquivar e são recuperados pela mesma identidade; excluir a identidade remove seus registros em cascata.

Supabase e Gmail não formam uma transação única. O prazo é salvo antes da movimentação: falha no banco impede mover; falha/tempo limite no Gmail mantém o prazo para conferência e repetição segura da mesma data. A interface só anuncia movimentação após confirmação do backend e descarta respostas antigas após troca/desconexão. Em concorrência com outro navegador ou com o próprio Gmail, atualizar o quadro para reconciliar a posição da mensagem. Não executa migração/classificação retroativa nem atribui datas automaticamente.

`GET /api/google/institutional?mailbox=...&column=0|1|2` consulta cada coluna, com páginas de 20. Entrada/Arquivadas usam a paginação Gmail e ordenam por recebimento. Classificadas lista todos os IDs do marcador (até 10 mil por requisição), consulta os prazos criptografados em lotes de 100, ordena a seleção completa **antes** de paginar e busca o corpo somente das mensagens da página. Se a seleção exceder o limite, informa o erro sem apresentar uma ordem parcial como completa. Alterações no marcador durante a paginação podem deslocar páginas; Atualizar quadro reinicia a seleção. Busca e contagens consideram apenas os cartões carregados. Mensagens em spam/lixeira/rascunhos são excluídas; revalida o marcador ao obter o corpo.

`POST /api/google/institutional-move` exige Origin/X-Farol-Request, sessão GERAL, gmail.modify, identidade esperada, ID de mensagem válido e operação fixa classify/archive. Classificar exige data e versão; nenhum marcador arbitrário é aceito. Exige que a mensagem esteja nos marcadores permitidos; classificar recusa mensagens já em Arquivadas. Labels, UNREAD e confirmação da movimentação são tratados no servidor.

Mantida a identificação de **possíveis** prazos por regras de texto, sem IA externa: texto simples ou HTML convertido em texto inerte, sem anexos/links/imagens. Usa corpo e, na ausência de indicação, assunto. Reconhece datas completas como 20/11/2026, 2026-11-20 e 20 de novembro de 2026. Hoje/amanhã usam o recebimento em Brasília com aviso. Ano ausente/abreviado, datas inválidas, negações, mudanças e múltiplas datas no mesmo trecho pedem conferência. Não interpreta todos os formatos, dias úteis ou dias da semana; não garante interpretação semântica geral. O texto é limitado a 100 mil caracteres, com aviso de limite/ausência. **Sugestões não preenchem nem salvam a data limite automaticamente.**

### Ativação na Vercel

1. No Supabase **exclusivo FAROL GE**, executar `database/institutional-demands.sql` após `database/google-sessions.sql`.
2. No Data Access do projeto Google FAROL GE, incluir `https://www.googleapis.com/auth/gmail.modify`, se ainda não estiver cadastrado por causa da Pessoal. Não há variável de ambiente nova. Publicar o código e a política revisão 10 pelo Git/Vercel.
3. Na conexão **GERAL**, usar **Revisar autorização**, conceder a nova permissão e conferir a criação somente dos dois marcadores ausentes.
4. Validar na nuvem: classificação com data obrigatória; persistência após recarregar/reconectar; ordenação por prazo entre páginas; entrada/arquivadas por recebimento; arquivamento das duas origens; preservação de UNREAD e etiquetas; marcadores existentes; conta diferente e preservação da Pessoal; recusa/falha de permissão, SQL ausente e repetição após falha de rede.

Foram executados testes automatizados com dados fictícios e verificações estáticas. SQL, OAuth real e validação visual não foram executados remotamente nesta entrega. Não foi iniciado servidor local.

Referências oficiais: [listar mensagens](https://developers.google.com/workspace/gmail/api/guides/list-messages), [marcadores](https://developers.google.com/workspace/gmail/api/guides/labels), [criar marcador](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/create) e [modificar marcadores da mensagem](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify).


Arquivos desta atualização: `institutional.js`, `server/institutional.cjs`, `server/google.cjs`, `database/institutional-demands.sql`, `app.js`, `index.html`, `styles.css`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/institutional.test.cjs`, `tests/google.test.cjs` e `tests/frontend.test.cjs`.
