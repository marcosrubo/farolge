# FAROL GE — Farol da Gestão Escolar

Protótipo para apresentar a proposta da plataforma à equipe da escola. Frontend em HTML, CSS e JavaScript, organizado por módulos, com backend de login e autorização Google em Vercel Functions. A biblioteca oficial Google é instalada pelo package.json; o frontend não tem etapa de compilação.

## Estrutura atual para apresentação

- Logos da plataforma e do colégio, com o nome da instituição em três linhas.
- Menu: Visão GERAL, Inspetores/Monitores, Radar, Demandas INSTITUCIONAIS, Demandas PESSOAIS e BI SEED; abaixo do divisor ficam Arquivo Morto, Manutenção do Sistema e Configurações. Inspetores/Monitores apresenta alunos e registro manual de ocorrências. Manutenção do Sistema lista os nomes de arquivos da pasta FarolGE/FaltasSemanais da conta GERAL, conforme a seção ao final.
- As opções mostram “Meu espaço / nome da opção”. Radar também apresenta o fluxo solicitado: RCO, SINAN, SERP, ATAS, Busca ATIVA e Alunos convergem para ANÁLISES, com saídas DOSSIÊ individual e Relação diária de FALTAS.
- BI SEED e Configurações exibem “em Desenvolvimento” e os textos definidos por Marcos em 06/11/2026. A Visão GERAL apresenta os totais de mensagens dos marcadores da Escola e Pessoal descritos ao final deste README. BI SEED apresenta o texto sobre os indicadores/resumos previstos para uma visão simplificada da situação da escola.
- O menu destaca a opção ativa e o título da aba acompanha a seleção.
- O quadro abaixo do breadcrumb apresenta **Conexão temporária** para pessoas cadastradas e duas conexões Google (Geral e Pessoal) exclusivas da conta de Marcos. A seção de acesso de 18/11/2026 ao final descreve a autenticação e as permissões atuais.
- Foram retirados cartões, tabelas, exemplos, gráficos, filtros, datas, avisos, ajuda, roteiro de apresentação, formulários, rodapé e textos inferiores da barra lateral.

A simplificação foi solicitada por Marcos em 05/11/2026 para construir o conteúdo em conjunto com a equipe. Posteriormente, Marcos solicitou o fluxograma de Radar e os textos de desenvolvimento nas demais telas descritas acima. Os quadros dos demais módulos são uma estrutura visual, sem abertura de registros ou análises implementadas e sem integração aos sistemas citados. Em telas estreitas, o fluxo pode ser percorrido horizontalmente. Os endereços de e-mail nos textos são ilustrativos. Não preencher novamente as telas com exemplos ou sugestões de funcionalidades sem pedido. A carga de alunos depende do clique explícito na manutenção e do SQL descrito na seção Inspetores/Monitores ao final. Demandas PESSOAIS agora consulta conversas reais dos três marcadores, quando a conta Pessoal está autorizada. O backend OAuth foi implementado, mas depende de configuração externa e Marcos confirmou a conexão com duas contas Google reais. Cada conexão tem sessão própria verificada e autorização vinculada ao ID Supabase da própria conta Google. A conta Pessoal não herda a conexão Geral em outro navegador. Em 10/11/2026, Marcos pediu que as explicações de todos os módulos e o fluxograma do Radar sejam visíveis mesmo sem conexão, inclusive em caso de falha na verificação das contas. Esses conteúdos são estáticos e explicativos. Demandas INSTITUCIONAIS usa exclusivamente a GERAL para as três colunas, classificação com prazo confirmado e arquivamento descritos ao final deste README. Demandas PESSOAIS usa exclusivamente a Pessoal. As diferenças operacionais entre somente Geral, somente Pessoal e ambas nos demais módulos aguardam definição de Marcos.

## Publicação na nuvem

O atalho na Tela de Início do iPhone usa o logo existente em `arte/farol-ge-simbolo-quadrado.png`, indicado por `apple-touch-icon`, com o nome FAROL GE. Após publicar essa configuração, remover o atalho antigo e adicionar novamente pelo Safari para conferir o ícone. A arte original foi preservada.

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
| `GE_ME DEVEM` | GE_ME DEVEM |
| `GE_MINHAS` | GE_MINHAS |
| `GE_DEVO` | GE_DEVO |
| `GE_Despachadas` | Mensagens classificadas |

As três colunas mostram as conversas dos marcadores. Uma conversa com múltiplos marcadores aparece nas respectivas colunas com o mesmo prazo e conclusão, mas responsáveis por categoria. A precedência de arquivadas ainda não foi definida; não é aplicada exclusão de conversas por estarem fora da Caixa de entrada. Spam, lixeira e rascunhos não originam cartões. Não são renomeados/excluídos marcadores antigos. A Caixa de entrada abaixo do quadro permite adicionar uma das três etiquetas à mensagem escolhida, adicionando também GE_Despachadas e removendo somente INBOX. A data de um e-mail não deve ser convertida automaticamente em prazo.

A Pessoal solicita adicionalmente `gmail.labels`. Após publicar, contas já conectadas precisam usar **Revisar autorização** e conceder essa permissão. O status mostra se as quatro labels existem; consultar status não cria marcadores. Falhas mantêm a conta conectada e pedem nova revisão para tentar novamente. A Geral não solicita esse escopo nem consulta/cria essas labels. Desconectar preserva os marcadores no Gmail. Marcos confirmou a criação real na Vercel com os nomes anteriores. A alteração para os nomes numerados ainda deve ser validada após publicação. Os nomes usados no servidor são fixos; editar `config.js` não altera as operações do backend.

A revisão 3 acrescentou a consulta e criação dos três marcadores na conexão Pessoal e sua retenção no Gmail. A revisão 4 atualiza seus nomes para `GE_ME DEVEM`, `GE_MINHAS` e `GE_DEVO`, nessa ordem de criação. O backend não renomeia nem remove os marcadores anteriores; Marcos informou que os excluirá manualmente no Gmail.

## Limites e próximos passos

Há login Google integrado à solicitação de Gmail e Drive, condicionado à configuração de Google Cloud, Supabase Auth, tabelas e variáveis Vercel. Supabase Auth gerencia auth.users e cria usuários automaticamente; a aplicação não pede cadastro manual nem senha própria. Credenciais ficam criptografadas no backend. O quadro de conexões mostra endereço e permissões confirmadas; o módulo Pessoal mostra as conversas autorizadas.

A Manutenção do Sistema lista nomes de arquivos da pasta FarolGE/FaltasSemanais; não implementa editor de arquivos, criação de documentos, edição de planilhas, envio de mensagens, notificações ou indicadores reais nos módulos. A autorização drive.file prepara essas operações nos arquivos criados ou explicitamente autorizados para o aplicativo. A plataforma se destina a qualquer escola do Paraná. O cadastro de escolas, seus vínculos e o compartilhamento/isolamento de dados institucionais ainda precisam ser definidos; permitir escolher contas de escolas diferentes nesta etapa não implementa essa arquitetura. Ver detalhes e migração em CONEXOES_GOOGLE.md.

Antes da ativação real, habilitar o provedor Google no Supabase exclusivo do FAROL GE, executar database/google-sessions.sql, configurar variáveis e validar o fluxo na Vercel. O modo Testing do Google continua exigindo contas de teste, mesmo com entrada aberta no código; uso amplo depende da configuração Production e das regras de verificação aplicáveis.

Este projeto é independente do PsicoTarefas. A abertura automática e maximizada no Linux será uma configuração do navegador na máquina, depois de existir um endereço publicado.

## Demandas PESSOAIS e prazos

Marcos autorizou implementar o quadro e o acompanhamento para conferir na Vercel. A página mostra três colunas, um cartão por conversa por coluna, até 20 conversas por carregamento, com paginação. Busca, contagem, filtros de não lidas/pendentes/concluídas e ordenação operam sobre as conversas carregadas. A seleção por marcadores pode ser feita pelo usuário no Gmail ou pelos botões da Caixa de entrada abaixo das colunas. Sem conexão, a explicação e a estrutura permanecem visíveis.

Ao abrir um cartão: leitura de mensagens em texto simples, remetente/destinatário e data; quando só há HTML ou texto externo à resposta da API, exibe prévia e link para o Gmail. HTML não é inserido na página, imagens remotas não são carregadas, anexos não são baixados e ler no FAROL não marca como lido. Uma resposta não conclui a demanda.

O formulário permite definir/editar/remover a data limite, informar responsável por categoria (nome/e-mail livre em GE_ME DEVEM e GE_DEVO; conta Pessoal em GE_MINHAS), concluir/reabrir o trabalho e consultar o histórico. Prazos são datas civis no fuso America/Sao_Paulo, sem hora limite; ficam visíveis como sem prazo, vence em data, vence hoje, atraso em dias ou concluída. Não há notificação nem envio automático; comunicar o prazo ao destinatário no texto do e-mail.

Uma demanda pertence à identidade da conta Pessoal e à conversa (`threadId`), com ID próprio e referência à mensagem de origem. Não correlaciona automaticamente cópias nas caixas de remetente/destinatário nem compartilha dados com outra pessoa ou escola. As respostas usam o acompanhamento da mesma conversa. Alterações concorrentes são rejeitadas por versão, para não perder histórico. O backend verifica a identidade e os marcadores antes de ler/gravar; a conta Geral não dá acesso.

### Ativação

1. No SQL Editor do Supabase **exclusivo FAROL GE**, executar `database/personal-demands.sql` (depois das tabelas de `database/google-sessions.sql`, já usadas pelas conexões).
2. Publicar os arquivos pelo Git/Vercel. Para leitura e prazos não há variável ou escopo Google novo: usa o `gmail.readonly` já autorizado. Para classificação da Caixa de entrada, acrescentar `gmail.modify` conforme a seção abaixo. Política atualizada para revisão 5, incluindo leitura de conversas, dados de acompanhamento, histórico e retenção.
3. Na Vercel, abrir Demandas PESSOAIS com a conta Pessoal conectada. Classificar um e-mail em `GE_ME DEVEM` no Gmail, clicar Atualizar no FAROL, abrir o cartão e salvar um prazo. Atualizar/recarregar a página para confirmar persistência. Conferir edição/remoção, conclusão/reabertura, duas janelas e conta diferente. Nenhum teste visual local ou publicação remota foi realizado por esta entrega.

A tabela `farol_personal_demands` tem RLS, sem policies/acesso de anon/authenticated, com FK para auth.users e exclusão em cascata. O backend cifra prazo, responsável, conclusão, mensagem de origem e histórico com AES-GCM; IDs técnicos de proprietário/conversa, ID próprio, versão e horário permanecem metadados. Não grava corpo, assunto, trechos, anexos ou lista de participantes. Disconnect remove a conexão, mas preserva acompanhamento e histórico para a reconexão da mesma conta; exclusão integral é administrativa conforme política. Não manter cópias de e-mails em logs ou armazenamento local.

## Classificação atualizada — 12/11/2026

A conexão Pessoal prepara os marcadores ausentes `GE_ME DEVEM`, `GE_MINHAS`, `GE_DEVO` e `GE_Despachadas`, nessa ordem. Geral permanece independente. Consultar status não cria marcadores. Depois de publicar, usar **Pessoal → Revisar autorização** para preparar o quarto marcador; não há novo escopo, SQL ou variável nesta atualização. Continuam necessários gmail.labels e gmail.modify já descritos acima.

A Caixa de entrada lista mensagens individuais em páginas de 20. Classificar usa users.messages.modify na mensagem escolhida com addLabelIds contendo a categoria e GE_Despachadas, e removeLabelIds contendo somente INBOX. Preserva UNREAD e as outras etiquetas. A mensagem sai da lista após sucesso confirmado e a conversa aparece nas colunas correspondentes. Não duplica e-mails. Ao abrir uma conversa, cada mensagem elegível tem botões para adicionar categorias, inclusive depois de movida para GE_Despachadas; múltiplas categorias são permitidas. Mensagens fora de INBOX e GE_Despachadas, spam, lixeira e rascunhos são recusadas. Não há envio, edição de conteúdo, exclusão ou alteração de leitura.

Responsável é separado por categoria no payload criptografado (mapa responsibles). Em GE_MINHAS é derivado automaticamente da identidade Pessoal verificada e não editável. Em GE_ME DEVEM e GE_DEVO é textual e independente; registros antigos conservam o responsável como valor inicial até edição da categoria. Prazo e conclusão continuam compartilhados por conversa. Versão global protege alterações concorrentes e o histórico identifica a categoria alterada. Não é necessário migrar o banco; preserva os registros existentes.

A política pública e o diálogo passam à revisão 7. Publicar pelo Git/Vercel e validar na nuvem: preparação dos quatro marcadores sem duplicação; classificar e conferir saída de INBOX, presença em GE_Despachadas e categoria, preservação de UNREAD e outras etiquetas; adicionar as outras categorias pela conversa; salvar responsáveis diferentes; conferir GE_MINHAS com o próprio e-mail, persistência e histórico; contas distintas, recusa de permissões e falhas de rede. Nenhuma classificação retroativa em lote é executada. Mensagens antigas que ainda estejam em INBOX podem ser classificadas novamente para completar a movimentação.

Referências oficiais: [marcadores Gmail](https://developers.google.com/workspace/gmail/api/guides/labels) e [users.messages.modify](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify).

## Lista de GE_Despachadas no final da tela

Demandas PESSOAIS exibe, abaixo da Caixa de entrada, a relação de mensagens individuais de `GE_Despachadas`, com remetente, assunto, data, trecho, estado de leitura, categorias e link para o Gmail. Usa páginas de 20, botão Carregar mais, atualização própria e busca nos registros carregados, independente dos filtros das três colunas. Categorias já aplicadas aparecem com indicação e botão desabilitado. As demais podem ser acrescentadas individualmente, preservando sempre `GE_Despachadas`, UNREAD e todas as categorias anteriores. A classificação na entrada atualiza também essa lista e as colunas sem exigir recarga da página.

`GET /api/google/classified` exige a mesma identidade Pessoal e permissão de leitura dos demais endpoints; resolve o ID de GE_Despachadas no servidor e lista somente metadados de mensagens desse marcador, sem spam, lixeira ou rascunhos. A consulta não cria marcadores e não depende da tabela de prazos. As ações continuam usando o endpoint classify existente, sem aceitar operações arbitrárias. Não há novo escopo, SQL ou variável. Política revisão 8. Publicar e validar na Vercel: listagem, paginação, categorias simultâneas, permanência em GE_Despachadas, preservação de prazos/responsáveis e troca de conta.


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


## Correção de preparação de marcadores — 14/11/2026

Se a linha GERAL indicar Classificação autorizada, mas marcadores incompletos, a autorização de escrita já foi reconhecida pelo FAROL: o bloqueio é a ausência de confirmação de Classificadas e/ou Arquivadas. O status agora mostra exatamente quais desses dois nomes faltam. A imagem do Google não comprova, por si só, a preparação dos marcadores da conexão ativa.

O botão **Preparar marcadores** aparece no quadro institucional quando há permissão de escrita e os marcadores não estão confirmados. Ele usa `POST /api/google/institutional-labels`, com CSRF e sessão GERAL verificada, sem refazer OAuth: lista e cria somente os ausentes Classificadas/Arquivadas, confirma os nomes por nova listagem e atualiza o quadro e a conexão. Não movimenta e-mails, não altera a Pessoal e não aceita nomes arbitrários. GET de status e listagens continuam sem criar marcadores. A confirmação de criação faz uma nova leitura sem cache e uma conferência adicional se a primeira listagem ainda não refletir o resultado. Não libera ações com base apenas na resposta de criação.

Falhas são informadas por categorias seguras (permissão recusada, nome recusado, indisponibilidade ou nomes não confirmados), sem exibir respostas brutas do Google, tokens ou logs de conteúdo. Não foi possível determinar a causa remota da ausência dos marcadores somente pela captura de tela; o fluxo agora permite tentar a preparação diretamente e distinguir essas condições. A comparação dos nomes permanece exata, sem renomear ou adotar outros marcadores.

Para ativar, publicar os arquivos pelo Git/Vercel e clicar em **Preparar marcadores** na tela institucional. Não há SQL, variável ou escopo adicional nesta correção. O SQL institucional da entrega anterior continua necessário. Política revisão 11 informa a preparação explícita. Foram verificados testes automatizados com dados fictícios, sintaxe e diferenças Git; não houve acesso à sessão Google real, alteração de marcadores reais ou validação visual remota nesta correção.

Arquivos alterados nesta correção: `server/google.cjs`, `institutional.js`, `app.js`, `index.html`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/google.test.cjs`, `tests/institutional.test.cjs` e `tests/frontend.test.cjs`.


## Nomes definitivos dos marcadores — 15/11/2026

| Conexão | Marcadores utilizados |
| --- | --- |
| PESSOAL | `GE_ME DEVEM`, `GE_MINHAS`, `GE_DEVO`, `GE_Despachadas` |
| GERAL | Caixa de Entrada existente do Gmail (`INBOX`), `Classificadas`, `Arquivadas` |

O quarto marcador Pessoal passa a ser **GE_Despachadas** em criação, conferência, classificação, leitura de conversas, lista final, mensagens da interface e política. Classificar continua adicionando a categoria escolhida e esse marcador, retirando somente INBOX e preservando UNREAD e as outras etiquetas. A lista GE_Despachadas permite acrescentar categorias sem retirar as anteriores. O nome não significa envio de mensagem: não há alteração de conteúdo ou envio pelo FAROL.

Os nomes do backend estão em `server/mailbox-labels.cjs`, compartilhados pela preparação OAuth e pelos endpoints Pessoal/Geral. As rotas internas `classified` e os IDs técnicos de interface correspondentes foram preservados; elas agora consultam somente o novo marcador pessoal. A configuração pública espelha os quatro nomes pessoais, mas não concede operações arbitrárias ao frontend. O status Pessoal mostra quatro marcadores prontos (4/4).

Não há renomeação, exclusão, transferência de marcadores antigos ou classificação retroativa. Se o marcador anterior continuar no Gmail, não será usado como substituto de GE_Despachadas. Mensagens que tiverem somente o marcador anterior não passam automaticamente para a nova lista; suas demais etiquetas permanecem. Prazos existentes por conversa/identidade continuam no banco e são reutilizados quando as conversas voltam a ter os marcadores exigidos. A GERAL mantém seus nomes e não cria INBOX. Quando a mesma conta é usada nas duas conexões, cada tipo prepara apenas seus próprios marcadores.

Após publicar, Marcos pode testar a recriação dos marcadores que apagar manualmente: usar **Pessoal → Revisar autorização** para preparar os quatro pessoais e **GERAL → Revisar autorização** ou **Preparar marcadores** para os dois institucionais. Conferir os nomes, atualização da lista GE_Despachadas, status 4/4, inclusão de categorias simultâneas e preservação de UNREAD. As duas conexões continuam independentes.

Sem novo SQL, escopo ou variável. Política revisão 12. Testes automatizados cobrem a recriação por tipo após exclusão dos marcadores na mesma conta e a ausência de escrita pelo status. O teste com a conta real requer publicação na Vercel; nenhuma conta ou marcador real foi alterado nesta atualização. A falha anterior de criação automática de Arquivadas não teve sua causa determinada e não deve ser considerada corrigida por esta troca de nomes.

Arquivos desta atualização: `server/mailbox-labels.cjs`, `server/google.cjs`, `server/demands.cjs`, `server/institutional.cjs`, `demands.js`, `app.js`, `config.js`, `index.html`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/google.test.cjs`, `tests/demands.test.cjs` e `tests/frontend.test.cjs`.


## Visão GERAL e linguagem feminina — 15/11/2026

Marcos definiu que as demandas devem ser sempre tratadas no feminino: Classificadas, Arquivadas e Despachadas. O quarto marcador Pessoal é **GE_Despachadas** em todo o código, preparação, classificação, lista final e política. Corrigir brevemente referências masculinas que surgirem na conversa. Não renomear/excluir marcadores já existentes nem migrar mensagens automaticamente; usar Pessoal → Revisar autorização para criar o novo nome se estiver ausente. A nomenclatura geral permanece Classificadas e Arquivadas, com INBOX padrão.

Visão GERAL agora exibe oito caixas:

| Grupo | Contagens |
| --- | --- |
| E-mails da ESCOLA (GERAL) | Caixa de Entrada, Classificadas, Arquivadas |
| E-mails PESSOAIS | ME DEVEM, MINHAS, DEVO, Caixa de Entrada, Despachadas |

Os totais são **mensagens** (`messagesTotal` de `users.labels.get`), incluindo lidas e não lidas e todas as páginas. Não são conversas (`threadsTotal`), estimativas de busca, cartões carregados ou demandas únicas. Contagens por marcadores podem se sobrepor, incluindo GE_Despachadas e categorias pessoais; não há soma geral nem indicadores de risco ou conclusão. Cada grupo mostra o e-mail verificado da conexão que forneceu seus números e pode ser atualizado separadamente. Os dados são carregados ao entrar na tela ou mudar a identidade/permissão da conexão. Além de Atualizar totais, desde 17/11 há uma opção de atualização automática por minuto na Visão GERAL, conforme a seção ao final.

`GET /api/google/overview?type=general|personal&mailbox=...` exige a sessão própria do tipo solicitado, e-mail esperado e autorização de consulta ao Gmail. Geral nunca dá acesso a totais da Pessoal e vice-versa. O backend resolve somente os marcadores fixos da conexão e consulta as contagens com concorrência limitada. Não consulta mensagens/conversas, não lê corpo/assunto/anexos, não grava totais no banco/localStorage e não cria/modifica marcadores. Uma falha isolada de contagem pode ser mostrada no cartão sem apagar contagens válidas do mesmo grupo; falhas de autenticação/permissão interrompem a resposta do grupo. Ausência de marcador é sinalizada. Apenas um total zero confirmado pelo Gmail é apresentado como zero; demais estados exibem traço e explicação.

Os grupos e suas explicações ficam visíveis sem conexão e em falhas de status. Trocar/desconectar uma conta limpa imediatamente seus totais e invalida respostas pendentes, preservando o outro grupo. Os módulos Radar, BI SEED, Demandas e Configurações mantêm suas funções. A Visão GERAL mantém indicação do desenvolvimento futuro de acompanhamento de alunos e índices BI SEED, sem inventar indicadores adicionais.

Sem novo SQL, escopo ou variável. Política revisão 13 e diálogo de conexão atualizados. Publicar na Vercel, reautorizar Pessoal para preparar GE_Despachadas e validar: comparar os totais com mensagens por marcador no Gmail (a interface Gmail pode agrupar conversas); conta Geral e Pessoal distintas; somente uma conectada; marcadores ausentes; zero real; falha de rede; troca/desconexão durante consulta; atualização manual e categorias simultâneas. Não houve publicação nem validação visual/contagens na conta real nesta entrega. A falha anterior de criação automática de Arquivadas continua sem causa determinada; esta implementação de contadores não a corrige.

Arquivos principais: `overview.js`, `server/overview.cjs`, `server/google.cjs`, `server/mailbox-labels.cjs`, `app.js`, `demands.js`, `config.js`, `index.html`, `styles.css`, `privacidade.html`, documentação e testes. Testes da entrega: `tests/overview.test.cjs`, `tests/google.test.cjs`, `tests/frontend.test.cjs`, `tests/demands.test.cjs`.

Referências: [Label e messagesTotal](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels) e [users.labels.get](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.labels/get).


## Marcadores GE_ e títulos da interface — nomes confirmados

Marcos confirmou e corrigiu a distribuição por conexão em 15/11/2026. Esta seção substitui as nomenclaturas anteriores deste documento.

| Conexão | Nome exato no Gmail | Nome mostrado na interface |
| --- | --- | --- |
| PESSOAL | `GE_ME DEVEM` | ME DEVEM |
| PESSOAL | `GE_MINHAS` | MINHAS |
| PESSOAL | `GE_DEVO` | DEVO |
| PESSOAL | `GE_Despachadas` | Despachadas |
| GERAL | `GE_Classificadas` | Classificadas |
| GERAL | `GE_Anuais` | Anuais (desde 24/11/2026) |
| GERAL | `GE_Arquivadas` | Arquivadas |
| Ambas, cada qual na própria conta | `INBOX` do Gmail | Caixa de Entrada |

O prefixo GE_ identifica os marcadores do FAROL no Gmail. A INBOX padrão não é criada como marcador personalizado. Não inverter os tipos de conexão. O backend compartilha os nomes em `server/mailbox-labels.cjs`; os títulos das categorias Pessoais são separados dos nomes Gmail para que botões, categorias simultâneas e responsáveis por categoria continuem funcionando. As respostas de categorias Pessoais usam os títulos sem prefixo; os contadores resolvem nomes Gmail exatos, que o frontend associa aos títulos visuais.

Pessoal classifica a mensagem adicionando o ID da categoria GE_ escolhida e de GE_Despachadas, removendo apenas INBOX. A lista Despachadas consulta GE_Despachadas. Geral classifica com data confirmada em GE_Classificadas e arquiva em GE_Arquivadas, removendo somente INBOX e, no arquivamento, GE_Classificadas. Os outros marcadores e UNREAD são preservados. Visão GERAL mostra três caixas da Escola e cinco Pessoais com os nomes visuais solicitados e consulta os totais dos novos marcadores GE_. Nenhuma operação foi transferida de uma conexão à outra.

Preparação: no callback OAuth, cada tipo verifica/cria somente seus nomes ausentes. GERAL também mantém o botão Preparar marcadores com autorização existente. Status e contadores não criam. Se uma criação falhar, tenta os demais nomes fixos e retorna a falha sem simular sucesso completo; reconectar/preparar novamente tenta somente o que ainda falta. Conflitos ou respostas perdidas são reavaliados por nova listagem. Sucesso depende de confirmar todos os nomes reais no Gmail.

Marcadores sem GE_ e os nomes numéricos anteriores não são adotados como aliases nem renomeados ou excluídos. Não há migração automática de mensagens. Marcadores antigos, suas mensagens e dados de acompanhamento permanecem; mensagens precisam receber os novos marcadores para aparecer nas novas seleções. Não há alteração de SQL, variáveis ou escopos. Política revisão 14 e diálogo de conexão atualizados.

Após publicar na Vercel: reautorizar PESSOAL e confirmar os quatro nomes GE_ criados pela aplicação; reautorizar GERAL ou usar Preparar marcadores e confirmar GE_Classificadas e GE_Arquivadas criados pela aplicação. Conferir status 4/4 e nomes gerais prontos, contadores com títulos sem prefixo, classificação com categorias simultâneas, data institucional e arquivamento com preservação de UNREAD/outros marcadores. Testar também somente um marcador ausente, reconexão sem duplicação, mesma conta nas duas conexões e contas distintas. Não apagar/renomear marcadores para teste automaticamente.

Nesta entrega, a criação e as ações foram verificadas com testes automatizados e dados fictícios. Não houve criação manual ou automática na conta real, publicação ou validação visual na Vercel. O novo prefixo e o tratamento de falhas não comprovam a resolução da rejeição anterior do Google: a confirmação real precisa ser feita pela aplicação publicada, sem criar manualmente o marcador como substituto desse teste.

Arquivos alterados: `server/mailbox-labels.cjs`, `server/demands.cjs`, `server/google.cjs`, `demands.js`, `overview.js`, `institutional.js`, `app.js`, `config.js`, `index.html`, `privacidade.html`, `AGENTS.md`, `README.md`, `CONEXOES_GOOGLE.md`, `tests/demands.test.cjs`, `tests/google.test.cjs`, `tests/institutional.test.cjs`, `tests/overview.test.cjs`.


## Correção da atualização após arquivar — 15/11/2026

A captura enviada por Marcos mostrou sucesso no arquivamento e falha de consulta apenas na coluna de entrada, que passou a exibir zero e pedir nova autorização. Foi encontrado no código que a atualização esvaziava a lista antes de obter uma nova resposta e que o backend convertia qualquer 403 do Gmail em falta de escopo. Essas duas falhas foram corrigidas. A causa específica da resposta Google recebida na conta real não foi identificada pela captura; não afirmar que houve revogação, limite de consultas ou movimentação de todas as mensagens sem evidência.

A lista carregada agora é mantida durante a consulta e em falhas. A coluna sinaliza dados anteriores e bloqueia novas ações nela até atualizar, preservando as demais colunas e os rascunhos de datas. Uma consulta bem-sucedida substitui a primeira página; Carregar mais acrescenta sem duplicar. Falha antes do primeiro carregamento exibe traço, sem declarar caixa vazia. Troca de conta, login inválido e desconexão continuam limpando o estado e invalidando respostas antigas.

Após confirmar uma movimentação, o frontend retira somente a mensagem escolhida das origens e mostra seu cartão no destino com base nessa confirmação. Atualiza apenas a coluna de origem e a de destino, em sequência, em vez de reler as três simultaneamente. Se a atualização posterior falhar, mantém a movimentação confirmada e os demais cartões, com mensagem própria. Nenhum POST é repetido automaticamente.

`server/gmail-errors.cjs` distingue 403 por limite (`rateLimitExceeded`, `userRateLimitExceeded`, cota), falta efetiva de escopo (`insufficientPermissions`/`insufficientAuthenticationScopes`), política da organização (`domainPolicy`) e 403 sem motivo reconhecido. Erros desconhecidos não pedem nova autorização como diagnóstico automático. 429/limites retornam `gmail_rate_limit`; política retorna `gmail_domain_policy`. Na leitura institucional, limites transitórios, falhas 5xx e alguns erros de rede admitem somente mais uma tentativa GET, após um segundo; limite diário não é repetido. A resposta ao frontend contém somente códigos seguros, sem mensagens brutas do Google, tokens ou logs de conteúdo. As regras de autorização existentes continuam obrigatórias.

Arquivos alterados: `institutional.js`, `server/institutional.cjs`, `server/google.cjs`, `server/gmail-errors.cjs`, `tests/institutional.test.cjs`, `tests/google.test.cjs`, `tests/gmail-errors.test.cjs`, `README.md`, `AGENTS.md`. Sem SQL, escopos, variável ou finalidade nova de tratamento. Política revisão 14 permanece aplicável.

Validação: testes automatizados reproduzem duas mensagens arquivadas em sequência e falha na recarga da entrada, confirmando preservação da terceira mensagem, destino correto e recuperação por Atualizar quadro. Cobrem falha no primeiro carregamento, identidade alterada e razões de erro Google. Verificações estáticas e Git concluídas. Não houve publicação nem teste de movimentação em conta real. A verificação visual na sessão foi limitada pela ferramenta/revisão automática ao acessar controles de exibição do Firefox; não declarar essa tentativa como validação remota da correção. Após publicar na Vercel, conferir o mesmo fluxo com mensagens escolhidas pelo usuário e falhas de rede.

Referência oficial: [tratamento de erros Gmail](https://developers.google.com/workspace/gmail/api/guides/handle-errors).


## Manutenção do Sistema — arquivos do Drive GERAL (16/11/2026)

A tela consulta exclusivamente a conexão **GERAL** da escola, localiza uma pasta acessível com nome exato `FarolGE` (própria ou em Compartilhados comigo, inclusive se estiver dentro de outra pasta), resolve sua subpasta direta de nome exato `FaltasSemanais` e mostra os nomes dos arquivos diretamente em `FaltasSemanais`, em ordem alfabética. Exclui lixeira e subpastas, não abre conteúdo, segue atalhos ou modifica arquivos. Lista em páginas de 100 com **Carregar mais** e **Atualizar lista**. Se houver mais de uma pasta acessível FarolGE ou mais de uma FaltasSemanais diretamente nela, informa a duplicidade sem escolher silenciosamente. Pasta ausente, pasta vazia e falha são estados distintos.

GET `/api/google/maintenance?mailbox=...` exige sessão Geral verificada, identidade proprietária, conta esperada e capacidade `driveMetadata`. O servidor resolve as duas pastas fixas a cada chamada; não aceita pasta arbitrária. Paginação fica vinculada à pasta resolvida. Troca/desconexão da Geral, saída da tela e perda de autorização invalidam respostas pendentes e limpam a lista. Uma falha transitória de atualização preserva a lista anterior com aviso. A Pessoal não autoriza a consulta. Nomes são escapados antes de mostrar na tela. Os metadados ficam somente em memória, sem banco, armazenamento local ou logs de nomes/conteúdo.

**Ativação:** habilitar Google Drive API no projeto Google exclusivo FAROL GE; adicionar `https://www.googleapis.com/auth/drive.metadata.readonly` ao Data Access do Google Auth Platform; publicar código e política revisão 15; usar **Geral → Revisar autorização** e conceder a consulta de metadados. `drive.file` sozinho não dá acesso geral a nomes de arquivos preexistentes. A nova permissão permite consultar metadados em todo o Drive; o código resolve FarolGE e FaltasSemanais e limita a listagem de arquivos aos filhos diretos de FaltasSemanais. Não concede leitura de conteúdo nem alteração por essa permissão. A permissão é classificada como restrita pelo Google e pode exigir verificação adicional para uso em produção. Sem novo SQL ou variável Vercel. A Pessoal continua com seus escopos anteriores.

Validar na Vercel: conta Geral distinta da Pessoal, pasta FarolGE com arquivos reais em FaltasSemanais, mais de 100 arquivos, pasta vazia/ausente/duplicada, recusa do novo escopo, falha de consulta e troca/desconexão durante carregamento. Os testes usam dados fictícios, sem servidor local, publicação ou acesso a arquivos reais.

Referências oficiais: [escopos Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth) e [files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).

Arquivos desta implementação: `maintenance.js`, `server/maintenance.cjs`, `app.js`, `index.html`, `styles.css`, `server/google.cjs`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `tests/maintenance.test.cjs`, `tests/google.test.cjs` e `tests/frontend.test.cjs`.


### Pastas compartilhadas com a Geral — correção de 16/11/2026

A consulta anterior exigia `'me' in owners`, excluindo FarolGE quando a pasta pertencia a outra conta e aparecia em **Compartilhados comigo**. Esse filtro foi removido. A pesquisa continua no conjunto acessível à sessão Geral (`corpora=user`), usando os nomes exatos FarolGE/FaltasSemanais e a relação de pasta pai; não exige adicionar atalho ao Meu Drive, transferir propriedade nem mover arquivos. Pastas próprias e compartilhadas acessíveis são aceitas; nomes duplicados continuam sendo sinalizados.

Sem novo escopo, SQL ou variável. A captura mostra a consulta de nomes no Drive autorizada; depois de publicar a correção, clicar **Atualizar lista**. Não é necessário revisar a autorização apenas por essa correção. Testes fictícios cobrem pasta pertencente a outra conta, subpasta direta e arquivos compartilhados. Validar o arquivo real pela aplicação na Vercel; a captura não comprova por si só que as duas janelas usam a mesma Conta Google.

Arquivos desta correção: `server/maintenance.cjs`, `maintenance.js`, `tests/maintenance.test.cjs`, `index.html`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md` e `AGENTS.md`. Referência: [pesquisa de arquivos no Drive](https://developers.google.com/workspace/drive/api/guides/search-files).


## Carga de Faltas do RCO — 17/11/2026

A Manutenção do Sistema apresenta, abaixo do quadro de arquivos, o quadro **Carga de Faltas do RCO** com as quatro orientações solicitadas por Marcos: gerar relatórios por período e semana no RCO, renomear como `AAAA_MM_DDMM_DDMM_Periodo.PDF` (AAAA: ano; MM: mês; DD: dia; Periodo: Manha/Tarde), copiar para FarolGE/FaltasSemanais no Drive do Colégio e executar a captura no FAROL. As orientações permanecem visíveis sem conexão.

A relação **Arquivos disponíveis para captura** mostra os nomes com extensão `.pdf` (sem distinguir maiúsculas/minúsculas) entre os arquivos carregados da mesma consulta Geral. Ambos os quadros compartilham atualização, paginação e invalidação ao trocar/desconectar a conta. Se houver páginas restantes, informa que é preciso Carregar mais; falhas não declaram ausência de PDFs. Não valida o conteúdo nem o formato dos nomes nesta etapa.

Esta entrega exibe orientações e disponibilidade; a captura/importação de dados dos relatórios ainda não foi implementada, e a tela informa isso. Não abre PDFs nem grava dados de estudantes; sem novo escopo, SQL ou variável. Política revisão 15 permanece aplicável à consulta de nomes. Validação visual na Vercel pendente. Arquivos alterados: `maintenance.js`, `styles.css`, `tests/maintenance.test.cjs`, `README.md` e `AGENTS.md`.


## Inspetores/Monitores e Carga de Alunos — 17/11/2026

O menu mostra Inspetores/Monitores antes de Radar. A tela consulta os alunos da identidade **Geral**, em ordem alfabética em português, com série/turma/turno à direita; permite buscar por nome, CGM ou turma. Cada nome abre um diálogo para digitar a ocorrência. Escola, CGM e Nome derivam do vínculo selecionado, nunca de dados livres enviados pelo navegador. Data e Hora usam o instante do servidor no fuso America/Sao_Paulo. Cada envio tem um UUID para evitar duplicação se a resposta for perdida; não há repetição automática de POST. Não envia avisos nem faz avaliação automática do aluno. A consulta de ocorrências está na Visão GERAL e na aba **CONSULTAR** de Inspetores/Monitores, conforme a seção ao final.

Na manutenção, **Carga de Alunos** lista os arquivos diretamente em **FarolGE/ListaAlunos**, próprios ou compartilhados com a Geral, em páginas de 10. Mostra nome, geração identificada no PDF e criação no Drive (identificadas separadamente). A data de geração é buscada em `/CreationDate` nos últimos 64 KB do PDF, com concorrência 2; formatos que não a exponham nessa faixa aparecem como não identificados, sem usar a criação do Drive como substituta. Ao carregar, PDF.js confirma a geração pelo metadado completo. Arquivos incompatíveis ficam sem ação de carga.

O botão **Carregar** lê o PDF escolhido no backend e importa **Escola, CGM, Nome, Serie, Turma e Turno**. Usa o modelo Relação de Alunos por Turma do Sistema Escola fornecido por Marcos: cabeçalho escolar inicial, contexto de série/turma/turno por página e colunas CGM/Nome por coordenadas. O modelo tem uma linha sem número de ordem, reconhecida pelo CGM na coluna correta. Relatórios digitalizados, protegidos, incompletos ou com outro leiaute são recusados; não há OCR nem IA externa. Campos como RG, CPF, telefone, nascimento, idade, sexo e situação não são importados. Nomes/corpo do relatório não são registrados em logs nem persistidos no navegador.

Uma linha representa um vínculo Escola/CGM/Serie/Turma/Turno. O relatório tem alunos em programas e turmas simultâneos; esses vínculos são preservados, sem precedência inferida por situação de matrícula ou curso. Linhas repetidas do mesmo vínculo/nome são reunidas; nomes conflitantes no mesmo vínculo impedem a carga completa. Registros de transferidos e outros estados também constam no relatório e são importados, pois não foi definida filtragem por situação. Não restringir silenciosamente aos matriculados. Novos arquivos inserem/atualizam os vínculos presentes, sem remover os ausentes ou apagar ocorrências. A chave técnica é HMAC com a chave já usada no FAROL e com a identidade proprietária; não mistura dados de contas distintas.

### Ativação

1. No Supabase **exclusivo FAROL GE**, executar `database/students.sql`, após `database/google-sessions.sql`. Cria as tabelas **Alunos** e **Ocorrencias** com os nomes/campos solicitados e colunas técnicas de proprietário, chave/ID e atualização. Escola/CGM/Nome/Serie/Turma/Turno e o texto da ocorrência são cifrados com AES-GCM antes de gravar; portanto o Table Editor mostra os campos cifrados. RLS sem policies/acesso de anon/authenticated; somente o backend/service_role tem acesso. Uma RPC faz a carga inteira em uma transação. Não alterar tabelas de outro projeto.
2. No Data Access do Google Auth Platform do FAROL, incluir `https://www.googleapis.com/auth/drive.readonly` e manter os escopos anteriores. A permissão permite leitura ampla dos arquivos acessíveis à Geral; o código limita a consulta/carga às pastas fixas e aos PDFs escolhidos. A Pessoal continua sem esse novo escopo. Publicar código e política **revisão 16** e usar **Geral → Revisar autorização**. Sem nova variável Vercel.
3. Copiar o PDF para FarolGE/ListaAlunos. Na manutenção, Atualizar arquivos e Carregar. Em Inspetores/Monitores, Atualizar alunos, abrir o nome e salvar uma ocorrência. Testar contas distintas, permissão recusada, SQL ausente, arquivo alterado/movido, duplo clique, falha de rede e troca/desconexão durante consulta/salvamento.

GET `/api/google/students` e POST `/api/google/occurrence` exigem sessão Geral própria, mesmo sem permissão Gmail/Drive para acessar o cadastro já importado. GET `/api/google/student-files` exige consulta de metadados; consulta limitada da geração exige leitura. POST `/api/google/student-import` exige leitura de Drive e verifica novamente o caminho fixo, a pasta pai, o MIME PDF, o tamanho e a versão do arquivo antes da carga. Não aceita pasta arbitrária nem escola/identificação do aluno informadas pelo cliente. POST exige Origin/X-Farol-Request. Limites: 10 MB por arquivo, 100 páginas e 10.000 linhas; lista até 10.000 vínculos, sem truncar silenciosamente. Troca/desconexão ou saída da tela invalida respostas e limpa estado; requisições de escrita já aceitas pelo servidor podem terminar na conta de origem.

A conta Geral é a fronteira de acesso desta etapa. Não há novo cadastro de escola, vínculo de monitores por conta Pessoal ou perfis individuais; não inferir vínculo escolar pelo e-mail. Escola é o nome presente no relatório, usado como dado do registro, sem conceder acesso. Desconectar preserva alunos/ocorrências para reconectar a mesma identidade. Exclusão administrativa da identidade remove esses registros em cascata. Política detalha retenção e atendimento de correção/exclusão.

PDF.js foi acrescentado como dependência de produção. `vercel.json` inclui a biblioteca/worker no pacote da Function e define até 60 segundos. Os testes usam dados fictícios. A leitura local do modelo fornecido reconheceu 18 páginas, 374 linhas, 341 vínculos e 323 CGMs distintos, com geração em 17/11/2026 às 08:53:56 (Brasília), sem gravar dados reais no Supabase. O PDF e extrações reais não foram versionados. Não houve execução de SQL remoto, publicação ou validação visual na Vercel.

Arquivos: `database/students.sql`, `server/student-store.cjs`, `server/students.cjs`, `server/student-pdf.cjs`, `server/student-import.cjs`, `server/maintenance.cjs`, `server/google.cjs`, `students.js`, `student-import.js`, `maintenance.js`, `app.js`, `index.html`, `styles.css`, `package.json`, `package-lock.json`, `vercel.json`, `privacidade.html`, `CONEXOES_GOOGLE.md`, `AGENTS.md`, `README.md` e testes `tests/students.test.cjs`, `tests/students-frontend.test.cjs`, `tests/google.test.cjs`, `tests/frontend.test.cjs`.

Referências: [download e leitura parcial Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads), [escopos Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [PDF.js](https://mozilla.github.io/pdf.js/examples/) e [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).


## Falha genérica na carga de alunos — 17/11/2026

Após conceder leitura, Marcos mostrou a geração do PDF identificada e o botão habilitado, mas o POST de carga terminou com mensagem genérica. Confirmou que `database/students.sql` executou sem erro. A captura não identifica a etapa remota e o diagnóstico do POST não pôde ser lido pelas ferramentas de navegador desta sessão; não afirmar que os alunos foram ou não gravados, nem atribuir automaticamente a falha ao Google/Supabase.

Foi reproduzida, em pacote isolado com os arquivos PDF.js explicitamente incluídos anteriormente e sem sua dependência nativa, uma falha de importação `ReferenceError: DOMMatrix`. Ao incluir a dependência, o mesmo teste iniciou corretamente. `@napi-rs/canvas` agora é dependência direta, carregada explicitamente antes de PDF.js; `vercel.json` inclui PDF.js e `@napi-rs`/binários nativos. O worker usa caminho resolvido no servidor, sem depender da localização do bundle. A reprodução confirma essa condição de empacotamento, mas não confirma que ela causou o POST da captura na Vercel.

A inicialização do leitor agora fica protegida e retorna `pdf_runtime_unavailable`, sem confundir com leiaute incompatível. A carga identifica as etapas pasta, metadados, download, leitura e gravação. O armazenamento distingue SQL ausente/incompleto, acesso recusado, estrutura incompatível e indisponibilidade; respostas brutas, tokens, caminhos internos e dados pessoais não são devolvidos nem registrados. O frontend explica essas falhas e também sinaliza resposta inválida/timeout. Se a falha for de comunicação com Supabase ou resposta incerta, orienta conferir os alunos; não afirma rollback sem confirmação. Nenhum POST é repetido automaticamente, e a lista de arquivos é preservada.

Sem SQL, variável, escopo ou finalidade nova. Publicar a correção na Vercel e repetir a carga escolhida pelo usuário. Como o SQL já foi executado, não é necessário executá-lo novamente por esta correção. Se persistir, a mensagem específica permite prosseguir com evidência da etapa. Testes: 166 aprovados, incluindo inicialização/worker indisponíveis, erros seguros de armazenamento, ausência de repetição automática e preservação da lista. Verificação estática e diff sem erros. Não houve publicação, nova carga real ou confirmação do erro remoto.

Arquivos alterados nesta correção: `server/student-pdf.cjs`, `server/student-import.cjs`, `server/student-store.cjs`, `server/google.cjs`, `student-import.js`, `students.js`, `package.json`, `package-lock.json`, `vercel.json`, `tests/students.test.cjs`, `tests/students-frontend.test.cjs`, `tests/google.test.cjs`, `README.md` e `AGENTS.md`.


## Ocorrências na Visão GERAL — 17/11/2026

Ao lado de E-mails PESSOAIS em telas amplas, o quadro **Ocorrências dos alunos** mostra **Data, Hora, Aluno, Turma e Ocorrência**, em ordem decrescente de Data/Hora, com ID como desempate estável. Em telas menores, o quadro passa para a linha seguinte; a tabela permite rolagem horizontal. Textos de ocorrência preservam as quebras de linha e são escapados, sem interpretar HTML.

A consulta usa somente a identidade **Geral**, independentemente das permissões Gmail/Drive ou da conexão Pessoal. GET `/api/google/occurrences?mailbox=...` valida a caixa esperada antes de consultar. A tabela Ocorrencias é filtrada por owner_id da sessão; a turma (série/turma/turno) vem da relação existente com Alunos, pela chave composta de proprietário e vínculo, sem acrescentar colunas. Nome e texto da ocorrência são decifrados usando a chave da ocorrência; série/turma/turno usando a chave do vínculo. CGM, escola e campos pessoais adicionais não são enviados nesse endpoint.

Consulta em páginas de 20, com Atualizar ocorrências e Carregar mais. A paginação usa cursor validado por Data/Hora/ID, sem offset e sem aceitar proprietário do cliente. Novas ocorrências mais recentes aparecem ao atualizar. A atualização com falha mantém a lista anterior com aviso; conta desconectada/trocada, saída da tela e respostas de autenticação inválida limpam o estado e invalidam respostas antigas. Sem conexão, mantém o quadro com explicação. Ausência confirmada é diferente de falha de consulta. O quadro não altera as contagens de e-mail.

Sem novo SQL, variável ou escopo; usa as tabelas já criadas por students.sql. Política de Privacidade revisão 17 descreve a consulta. Testes automatizados verificam isolamento Geral/Pessoal, consulta sem Gmail/Drive, descriptografia, ordem, paginação, texto seguro, estados vazios/falha e troca de conta. Não houve publicação nem verificação visual na Vercel nesta entrega.

Arquivos alterados: `overview.js`, `styles.css`, `server/student-store.cjs`, `server/students.cjs`, `server/google.cjs`, `tests/overview.test.cjs`, `tests/students.test.cjs`, `tests/google.test.cjs`, `privacidade.html`, `README.md` e `AGENTS.md`.


## Atualização automática da Visão GERAL — 17/11/2026

A opção **Atualizar automaticamente a cada 1 minuto** permite deixar o painel aberto para acompanhamento da Diretora. Começa marcada por padrão, conforme solicitado por Marcos. Ao abrir a tela ou reativar a opção, consulta imediatamente os totais autorizados da Geral/Pessoal e as ocorrências da Geral; depois repete a cada 60 segundos enquanto a Visão GERAL estiver montada e a aba visível. Cada consulta já em andamento é respeitada, sem sobreposição no mesmo quadro. Não recarrega a página nem executa POST.

Abas ocultas pausam o temporizador. Ao voltar, consulta novamente e reinicia o intervalo; o navegador/computador suspenso pode atrasar atualizações. Sair do módulo cancela o temporizador e o listener. A escolha fica só em memória durante a página e é retomada ao retornar ao módulo; recarregar a página começa com a opção marcada, sem preferência ou dados gravados no navegador. Desmarcar interrompe os próximos ciclos; leituras já iniciadas podem concluir.

Os ciclos de ocorrências retornam à primeira página dos registros mais recentes (20); Carregar mais continua disponível. As contagens anteriores permanecem durante a atualização e em falhas transitórias, com aviso de dados anteriores, assim como as ocorrências. Falhas de identidade/autorização e troca/desconexão continuam removendo os dados correspondentes e invalidando respostas. Os controles manuais permanecem disponíveis.

Sem novo SQL, escopo ou variável. Política revisão 17 descreve a consulta automática como opção da mesma finalidade. Testes com temporizador simulado conferem os 60 segundos, consulta dos três quadros, bloqueio de sobreposição, pausa/retomada, interrupção ao desmarcar/sair, desconexão e preservação de dados em falha. 174 testes aprovados. Sem publicação nem validação visual na Vercel nesta entrega. Arquivos alterados: `overview.js`, `styles.css`, `tests/overview.test.cjs`, `privacidade.html`, `README.md` e `AGENTS.md`.


## Controle de acesso — EmailsAutorizados (17/11/2026)

Esta seção substitui a entrada aberta descrita nas seções anteriores. Somente e-mails na tabela **EmailsAutorizados**, com campos **Escola**, **Nome** e **email**, podem conectar ou continuar usando os dados/operações autenticadas do FAROL GE. Aplica-se a ambas as conexões Geral/Pessoal e a todos os domínios de Contas Google, inclusive Gmail e institucional. O endereço vem do ID token Google verificado (assinatura, audiência, nonce e email_verified), nunca de parâmetros ou campos do navegador. A verificação ocorre antes de criar usuário/sessão Supabase, consultar Gmail/Drive ou preparar marcadores da nova conta.

O backend também consulta a lista em cada requisição autenticada. Remover um e-mail bloqueia seus próximos acessos, inclusive por sessão existente; requisições já autorizadas em andamento podem concluir. Falha ou ausência da tabela bloqueia a operação com erro próprio, sem tratar indisponibilidade como “não cadastrado” nem liberar acesso por padrão. Sair/desconectar continua permitido. Nenhuma conta é automaticamente inserida na lista. A Escola é informação administrativa e não implementa vínculos de pessoas, compartilhamento de dados por escola ou transferência dos registros entre contas. O isolamento atual por identidade Geral/Pessoal permanece.

Após uma tentativa negada, a tela mostra: “Desculpe mas, esse E-mail não está autorizado a acessar o aplicativo FarolGE. Entre em contato com o suporte para pedir a liberação.” O botão **entrar em contato com o suporte** abre `https://wa.me/5543999525060` com o texto “Gostaria de solicitar acesso ao FarolGE para o E-mail ” seguido do endereço Google validado. A mensagem fica preenchida para confirmação de envio no WhatsApp; nenhum envio automático ocorre. **cancelar** apenas fecha o diálogo. Não há solicitação automática ao suporte nem liberação pelo botão.

O e-mail negado não vai na URL de retorno OAuth. Um ticket aleatório em cookie Secure/HttpOnly/SameSite=Lax referencia um payload cifrado temporário com expiração de 10 minutos. GET `/api/google/access-denied` consome esse ticket uma única vez e retorna somente o e-mail daquela tentativa ao próprio navegador; sem cookie ou após expiração retorna 404. Parâmetros `email` fornecidos pelo cliente não são usados. Tentativa negada de trocar uma conta preserva conexões anteriormente autorizadas. Se uma conta existente for retirada da lista, a interface limpa apenas seus dados quando recebe a negativa; a outra conexão autorizada continua disponível. Não há consulta pública da lista. A administração autenticada pela Geral está descrita na seção abaixo.

### Ativação

1. No Supabase **exclusivo FAROL GE**, executar `database/authorized-emails.sql`. A tabela tem RLS, sem policies para anon/authenticated; o backend/service_role recebe SELECT, INSERT e DELETE; somente rotas autenticadas da Geral administram a lista. E-mails são normalizados por trim/minúsculas por trigger, sem remover pontos ou sufixos `+`. Há uma linha por e-mail. O Table Editor mostra Escola/Nome/email como texto para administração. Nome identifica a pessoa do e-mail e é obrigatório, assim como Escola; a autorização verifica email; Nome também identifica a autoria das novas ocorrências.
2. **Antes de publicar**, cadastrar na tabela os e-mails que devem continuar usando Geral e Pessoal, inclusive os seus. A tabela nasce vazia: publicar sem cadastrar impedirá essas contas de acessar os dados, sem apagá-los. Usar o Table Editor para inserir Escola, Nome e email. Não copiar uma lista presumida de usuários anteriores nem migrar autorizações automaticamente.
3. Publicar código e Política de Privacidade revisão **18**. Não há novo escopo Google ou variável Vercel. Validar na Vercel: e-mail cadastrado, não cadastrado, institucional/Gmail, ambas as conexões, lista indisponível, retirada de autorização durante sessão, tentativa de troca negada preservando a outra conexão e botões Suporte/Cancelar. As telas estáticas e a política pública permanecem acessíveis; dados e ações exigem autorização.

Não foi executado SQL remoto nem cadastrada/liberada qualquer conta real. A criação automática da identidade Supabase continua para e-mails já liberados, sem cadastro Auth manual. A lista não faz diagnóstico, não determina vínculo escolar a partir do endereço e não dá acesso aos dados de outras identidades. A política descreve os dados administrativos, a negativa temporária e o compartilhamento opcional com WhatsApp.

Arquivos alterados: `database/authorized-emails.sql`, `server/google.cjs`, `app.js`, `index.html`, `styles.css`, `demands.js`, `institutional.js`, `overview.js`, `students.js`, `maintenance.js`, `student-import.js`, `tests/google.test.cjs`, `tests/frontend.test.cjs`, `privacidade.html`, `README.md`, `CONEXOES_GOOGLE.md` e `AGENTS.md`. 182 testes aprovados, incluindo bloqueio de callbacks, revogação de sessões existentes, ticket de uso único/expirado, falha fechada da tabela e suporte sem envio automático. Verificações de sintaxe e diff sem erros. Testes usam e-mails fictícios; sem servidor local ou validação visual na Vercel.

Referências oficiais: [validação OpenID Connect Google](https://developers.google.com/identity/openid-connect/openid-connect), [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security) e [link de conversa WhatsApp](https://faq.whatsapp.com/5913398998672934).


Marcos confirmou que ainda não executou o SQL nem enviou o controle de acesso pelo Git. O arquivo `database/authorized-emails.sql` está consolidado para a primeira criação da tabela, já incluindo Nome obrigatório; não é necessário executar um ALTER separado. Após executar o arquivo inteiro, preencher Escola, Nome e email para cada conta permitida antes de publicar.


## Exceção fixa de acesso — marcos.rubo@gmail.com

Por pedido explícito de Marcos, `server/google.cjs` mantém a constante `FIXED_AUTHORIZED_EMAIL` com `marcos.rubo@gmail.com`. Depois de validar a identidade Google, esse endereço é autorizado independentemente de estar em EmailsAutorizados ou de a consulta à lista estar disponível. A mesma regra vale no callback e nas sessões existentes, nas conexões Geral e Pessoal. Os demais endereços continuam sujeitos à lista e ao bloqueio em falhas.

A exceção compara o e-mail completo normalizado em minúsculas; não aceita aliases com `+`, alteração de pontos, domínio semelhante ou endereço vindo do navegador. Não dispensa assinatura/nonce/identidade Google, sessão Supabase ou permissões de cada serviço; não concede acesso a dados de outras contas. Não cria uma linha na tabela. Sem novo SQL, variável ou escopo. Política revisão 19 informa a conta de manutenção liberada no código.


## Cadastro de usuários e autoria das ocorrências — 17/11/2026

Configurações apresenta **Cadastro de E-mails usuários do aplicativo**, com Escola, Nome, E-mail, INCLUIR e EXCLUIR. Conforme confirmado por Marcos, qualquer conta **Geral autorizada** pode consultar e administrar a lista inteira, independentemente das permissões Gmail/Drive. Não há novo perfil de administrador nem filtro por Escola: esse campo continua administrativo, sem alterar o isolamento dos dados por identidade. A lista pagina 50 registros por vez. Inclusão duplicada é recusada; exclusão exige confirmação. Não há repetição automática de POST. Retirar o próprio e-mail encerra seu acesso nas próximas requisições. A exceção fixa de Marcos permanece mesmo se sua linha for excluída.

Para registrar uma ocorrência, são necessárias a Geral, proprietária dos alunos e registros, e a **Pessoal**, que identifica quem registra. O servidor valida ambas as sessões e a autorização de cada e-mail; obtém o endereço da identidade Pessoal verificada e o Nome de EmailsAutorizados, sem aceitar nome livre de autoria do navegador. Para a exceção fixa, usa Marcos Rubo como nome quando não houver nome disponível no cadastro. Sem Pessoal ou sem Nome cadastrado, a lista de alunos continua consultável, mas o registro exige completar essa identificação. Mudança de Pessoal fecha o diálogo e invalida a resposta anterior.

Cada nova ocorrência guarda **EmailAutor** e **NomeAutor**, cifrados com AES-GCM, como cópia da autoria no momento do salvamento. Alterar/excluir o cadastro de acesso ou desconectar a Pessoal não altera essa cópia vinculada à Geral. Registros anteriores permanecem sem autoria, exibidos como **Não informado**. A Visão GERAL acrescenta **Registrado por** como última coluna e recebe somente o nome do autor, sem expor seu e-mail nessa consulta. Nenhum novo escopo Google ou variável de ambiente é necessário.

Para atualizar um banco existente, executar integralmente **database/access-management-authors.sql** no Supabase exclusivo FAROL GE, depois dos SQLs de alunos e e-mails já existentes. A migração concede INSERT/DELETE ao backend na lista administrativa e adiciona as duas colunas nullable de autoria, sem apagar dados nem atribuir autores a registros antigos. Os scripts de primeira instalação também foram atualizados. Publicar o código e a política revisão **20** após o SQL. Não foi executado SQL remoto, alterado cadastro real ou publicado na Vercel nesta entrega.

Verificação: 192 testes automatizados aprovados, incluindo controle pela Geral, CSRF, inclusão/exclusão, paginação, troca de contas, autoria verificada pela Pessoal, campos cifrados e registros antigos. Sintaxe e diff verificados. Validação visual e teste com contas reais ficam para a Vercel, sem servidor local.


### Correção da inicialização das conexões — 17/11/2026

O endpoint público de status respondeu configurado durante a investigação da tela com botões indisponíveis. Foi reproduzida uma incompatibilidade quando app.js encontra um módulo de alunos anterior em cache, sem personalConnectionChanged: a exceção interrompia a atualização dos botões e também seu tratamento de falha. A chamada nova passa a tolerar esse método ausente, e as referências dos scripts em index.html têm versão de publicação para renovar o cache. Não altera autenticação nem autorizações. 193 testes aprovados, incluindo conexão Geral/Pessoal com módulo antigo; sintaxe e diff verificados. Após publicar na Vercel, recarregar a página para obter o HTML atualizado. Sem novo SQL, escopo ou variável. Não foi inspecionado o cache do navegador da captura; essa causa é compatível com o comportamento e foi reproduzida em teste.


## Carga de Faltas do RCO — 17/11/2026

Manutenção do Sistema mostra Carregar ao lado de cada PDF da pasta fixa FarolGE/FaltasSemanais, inclusive compartilhada com a conta Geral. Somente a Geral autorizada importa, com drive.readonly já previsto para Carga de Alunos; a Pessoal não é usada nesta carga. A listagem mostra **Já carregado** pelo nome do arquivo na tabela de controle da mesma Geral. O botão continua disponível para recarga. Ausência/falha da tabela de controle é exibida como erro, sem fingir arquivo não carregado. Não altera nem exclui arquivos no Drive.

Executar integralmente **database/attendance.sql** no Supabase exclusivo FAROL GE, após google-sessions.sql. Cria **FaltasDosAlunos** (Escola, CGM, data, faltas) e **ArquivosDeFaltasCarregados** (Escola, Arquivo), com proprietário, chaves e datas técnicas. Escola/CGM e Escola/Arquivo são cifrados com AES-GCM; aluno/dia usa HMAC de Escola+CGM por proprietário. Data e quantidade permanecem tipadas como date/integer, protegidas por RLS e sem acesso do navegador às tabelas. Não depende de correspondência prévia em Alunos nem cria vínculos de escola pelo e-mail. A RPC farol_load_attendance faz o upsert e registra o arquivo em uma única transação, serializada por Geral. Uma falha desfaz os dois; repetir manualmente não duplica nem incrementa as faltas anteriores.

Modelos validados: relatórios de frequência RCO fornecidos por Marcos, com tabelas em páginas rotacionadas e continuadas, inclusive CGM incorporado à linha da turma. Ano/mês são exclusivamente os do nome **AAAA_MM_DDMM_DDMM_Manha.pdf** ou **AAAA_MM_DDMM_DDMM_Tarde.pdf**; dias são os cabeçalhos das colunas. O período deve ter até sete dias no mesmo mês, com datas válidas. Só as datas efetivamente presentes são atualizadas. Não usa total semanal como falta diária. Confere as somas das colunas contra o total de cada linha; estrutura diferente/inconsistente impede toda a gravação. Campos diários vazios valem zero, permitindo corrigir faltas anteriores para zero. Nomes, nascimento, movimentação, turma e porcentagens são descartados.

**Marcos confirmou somar as faltas das linhas repetidas do mesmo aluno/dia dentro do arquivo**, mesmo em turmas diferentes. Depois de consolidar, insere ou substitui o valor existente por Escola/CGM/data da mesma Geral. Arquivos distintos, inclusive manhã/tarde, não são somados entre si: em datas sobrepostas, a última carga substitui o resultado anterior, conforme o pedido de atualização por aluno/dia. O histórico controla Escola+nome do arquivo, sem bloquear recarga; não indica que o conteúdo permanece inalterado após uma mudança no Drive. Não há remoção automática de alunos/dias ausentes no novo arquivo.

Limites: 10 MB, 100 páginas e 20.000 registros consolidados por arquivo. Backend resolve a pasta fixa, verifica permissão de download, tamanho, ID, versão e pertencimento antes/depois da leitura, recusando mudanças antes da transação. POST exige mesma origem/CSRF e ação explícita; não se repete automaticamente. Botões bloqueiam cliques simultâneos. Troca/desconexão/saída invalida respostas antigas. Faltas e histórico permanecem após desconexão; exclusão administrativa da identidade Geral remove ambos em cascata. Não há avaliação automática de risco nem alertas.

Ativação: executar o SQL, publicar código e política revisão **21**, abrir Manutenção na Vercel, conferir as permissões da Geral, carregar um relatório e conferir **Já carregado**, quantidade de aluno/datas e recarga sem duplicação. Nenhum SQL remoto, carga real ou publicação foi executado nesta entrega. Testes visuais apenas na Vercel. Sem nova variável, biblioteca ou escopo Google.

Referências oficiais consultadas: [download de arquivos no Drive](https://developers.google.com/workspace/drive/api/guides/manage-downloads) e [funções no Supabase](https://supabase.com/docs/guides/database/functions).


## Radar — análise diária de faltas (17/11/2026)

O botão **Analisar**, junto de Relação diária de FALTAS, abre a rota interna **#analise-faltas**, mantendo o menu Radar selecionado e oferecendo Voltar ao Radar. Preserva o fluxograma e os conteúdos estáticos sem conexão. A consulta usa exclusivamente a Geral autorizada, sem depender de Gmail, Drive ou Pessoal, e lê apenas as tabelas já carregadas no Supabase. Não há novo SQL, escopo ou variável; são necessárias as tabelas Alunos e FaltasDosAlunos dos scripts existentes.

Período inicial: hoje em Brasília e os 29 dias anteriores, inclusivos. Data inicial/final editáveis e botão Atualizar análise; limite de 366 dias. Matriz Aluno/CGM/Turma(s), dias em dd/mm e TOTAL, ordenada pelo total decrescente e nome em português como desempate. Busca por nome/CGM e lista de checagem para selecionar várias turmas, com todos os alunos do resultado em uma única tabela, sem paginação e sem novas consultas para filtrar, conforme ajuste posterior solicitado por Marcos. Desktop mantém identificação e total fixos nas laterais e cabeçalhos no topo; em telas estreitas fixa Aluno/TOTAL e permite rolar CGM/Turma junto aos dias, para preservar espaço. Não inclui impressão nesta entrega.

Junção por Escola+CGM da mesma Geral, sem multiplicar faltas pelos vários vínculos do cadastro; turmas distintas reunidas na mesma linha. Faltas sem nome cadastrado continuam visíveis pelo CGM, com Nome não cadastrado. Todas as datas do intervalo aparecem, inclusive sem registros: **—** é zero registrado; **?** é ausência de registro. TOTAL soma somente quantidades disponíveis; se o aluno não tem registros, mostra ?. Ausência de dados não comprova presença. Resumo reflete busca/filtro atual. Nomes e classes vêm do cadastro importado, não são o histórico de turma da data da falta. Não infere risco nem substitui a carga: arquivos sobrepostos continuam seguindo a regra previamente definida de última carga por aluno/data.

GET /api/google/attendance-analysis valida conta e calendário antes das leituras. Consulta faltas com filtro de proprietário/período em páginas internas de 500, decifra Escola/CGM no servidor e cruza com os alunos da mesma Geral. Limites de 100 mil registros e resposta de 3 MiB; ao exceder pede período menor e não mostra totais truncados. Não grava resultados ou preferências. Alterações simultâneas na carga exigem Atualizar análise para conferir o conjunto mais recente; esta consulta não é uma fotografia transacional de todas as páginas. Falhas transitórias preservam dados anteriores com período/aviso explícitos; troca/desconexão, falhas de sessão e saída invalidam respostas antigas e limpam os dados aplicáveis.

Verificação: 208 testes aprovados, incluindo calendário/Brasília, ordenação, alunos com vários vínculos, registros sem cadastro, zero/ausência, filtro/paginação, isolamento e autorização Geral sem permissões Gmail/Drive, falhas e troca de conta. Sintaxe e diff verificados. Política revisão **22**. Validação visual na Vercel e com dados reais ainda pendente, sem servidor local nem publicação nesta entrega.


A seleção de turmas da análise permite combinar várias turmas ao mesmo tempo (união: aluno aparece se pertencer a qualquer uma das marcadas, sem duplicar a linha). Sem marcações, mostra todas; Ver todas as turmas limpa a seleção. Busca e turmas são combinadas. A seleção disponível é preservada ao atualizar o período na mesma tela, removendo apenas turmas que deixaram de existir no resultado; troca de conta ou saída da tela limpa a seleção. A escolha filtra a visualização, sem criar restrição de acesso por pedagoga ou gravar preferências.


## Diagnóstico de IP público — 18/11/2026

Abaixo da marca, a aplicação consulta GET /api/network ao abrir e mostra o IP público observado pela Vercel (IPv4 ou IPv6), mesmo sem conta Google. Atualizar IP consulta novamente, assim como o evento online do navegador. Após trocar de Wi-Fi/dados móveis, usar o botão ou recarregar para conferir. A consulta de diagnóstico funciona sem cache da resposta e sem serviços externos de IP. A abertura da página gera um registro separado, descrito na seção Log do sistema. Falha mostra indisponível, nunca um IP fictício ou anterior como atual.

O endpoint usa x-vercel-forwarded-for, com fallback x-forwarded-for e validação de endereço. Não usa o endereço interno do socket. Não implementa bloqueio, identificação automática da escola nem autorização por IP. VPN, proxy, CGNAT, IPv6, troca de provedor e múltiplas saídas podem mudar ou compartilhar o endereço; nome do Wi-Fi e IP local do roteador não são consultados. Validar visualmente somente após publicação na Vercel. Sem SQL, variável ou escopo novo.

Referência: https://vercel.com/docs/headers/request-headers


## Cadastro de usuários em Configurações — 18/11/2026

O cadastro exige **Escola**, **Nome** e **Função**. **E-mail** e **Ordem** são opcionais. A lista apresenta os menores números primeiro, seguidos dos cadastros sem ordem. Em caso de empate, usa o identificador do cadastro para manter a ordenação estável entre páginas. Uma conta Geral autorizada pode incluir, editar e excluir cadastros, inclusive os que não têm e-mail. A exclusão exige confirmação.

Antes de publicar, executar o arquivo atualizado `database/authorized-emails.sql` no Supabase exclusivo do FAROL GE. O mesmo script instala ou migra a tabela. Os cadastros existentes preservam seus e-mails e ficam sem Função e Ordem até serem completados em Configurações. Cada cadastro possui um identificador próprio. E-mails preenchidos continuam únicos e normalizados, e a autorização Google continua consultando o endereço verificado. Cadastros sem e-mail ficam disponíveis na lista administrativa. A futura tela de identificação e sua forma de conexão ainda aguardam definição. Política revisão 23.


## Conexão temporária e acesso por módulo — 18/11/2026

Geral e Pessoal aceitam a identidade Google verificada de `marcos.rubo@gmail.com` e Contas Google Workspace com e-mail exatamente no domínio `@escola.pr.gov.br`. Com as duas conexões de sua própria conta ativas no mesmo navegador, Marcos pode usar todos os módulos. A conexão Pessoal institucional usa o cadastro do e-mail verificado para liberar módulos. Os usuários cadastrados também podem usar a Conexão temporária. Em **Configurações → Cadastro de usuários**, Marcos marca uma caixa para cada funcionalidade e salva o cadastro. O menu mostra todas as opções. Ao abrir um módulo sem permissão, apresenta um aviso. A **Visão GERAL** é aberta somente pelo clique no menu e com permissão ativa.

O servidor confere as permissões a cada requisição. Ao habilitar Demandas ou Manutenção, Marcos libera os dados e as ações daquele módulo usando as respectivas conexões armazenadas no servidor, conforme as permissões Google concedidas. Configurações permite administrar cadastros, permissões e senhas a quem tem o módulo habilitado na sessão Pessoal institucional ou temporária, inclusive sem Geral. Marcos também tem acesso com suas duas conexões. O BI SEED mantém sua tela explicativa pública. Para uma sessão temporária, o acesso ao BI SEED também pode ser marcado ou desmarcado.

Executar `database/module-access.sql` após `database/temporary-access.sql`. A migração conserva as permissões anteriores enquanto o cadastro existente não for salvo com suas caixas de seleção. Cadastros novos começam com todas as caixas desmarcadas. Uma lista vazia salva significa que nenhum módulo foi habilitado para aquela sessão temporária. Publicar com a política de privacidade revisão 33.

### Primeiro acesso presencial

1. Marcos conecta Geral e Pessoal em um navegador sob seu controle. Em **Configurações**, escolhe **Confirmar primeiro acesso** na linha da pessoa.
2. Marcos cria e confirma a primeira senha. O formulário vale por até dez minutos e depende de uma sessão que autorize Configurações. Ao salvar, a aplicação mostra **Senha cadastrada** e atualiza a lista. Marcos permanece conectado em Geral e Pessoal e pode cadastrar a próxima senha.
3. A pessoa usa **Conexão temporária**, seleciona o nome e digita a senha em **Entrar**. Com a conexão ativa, **Alterar senha** aparece ao lado do nome e pede a senha atual, a nova senha e a confirmação. O formulário indica se a nova senha atingiu seis caracteres e mostra **Senhas IGUAIS** ou **Senhas DIFERENTES** conforme a digitação. O servidor confere antes de gravar. **Encerrar conexão temporária** permite deixar o navegador livre para outra pessoa.

Em **Configurações → Cadastro de usuários**, **Resetar senha** aparece nos cadastros que já têm senha. Quem tem acesso a Configurações define e confirma a nova senha. Ao salvar, o servidor substitui a senha e invalida as sessões temporárias da pessoa. Fechar o formulário antes de salvar preserva a senha atual.

A senha tem pelo menos 6 caracteres, aceita qualquer tipo de caractere e é armazenada como hash scrypt com salt aleatório. O Supabase limita tentativas por cadastro e pela origem da requisição. A troca de senha invalida as sessões antigas. A exclusão do cadastro revoga o acesso e preserva as ocorrências já gravadas. A autoria temporária vem do nome do cadastro validado no servidor, inclusive para usuários sem e-mail. [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Reabertura do FAROL GE

A Conexão temporária é retomada ao reabrir ou atualizar o FAROL GE no mesmo navegador e endereço, com validade renovável de até 365 dias. A verificação ao abrir o FAROL renova o prazo quando já se passaram pelo menos 24 horas desde a última renovação. Sessões anteriores ainda válidas passam para o novo prazo ao abrir o FAROL. O navegador conserva apenas o cookie protegido, e o servidor confirma a sessão e as permissões. Se a primeira verificação falhar, a página tenta novamente e também verifica quando a rede volta. É preciso entrar novamente se a sessão vencer por falta de uso, se o navegador apagar o cookie ou se a pessoa escolher **Encerrar conexão temporária**. Publicar com a Política de Privacidade revisão 39. A renovação usa a tabela de sessões existente, sem migração SQL.

### Ativação na Vercel

Antes de publicar, executar `database/temporary-access.sql` no Supabase exclusivo FAROL GE, após a migração `database/authorized-emails.sql` já usada para os cadastros. O script acrescenta os campos de autenticação à tabela existente e mantém suas linhas. Publicar a política de privacidade junto com o código. Nenhum novo escopo Google ou variável Vercel é necessário.

A conexão temporária consulta alunos, faltas e ocorrências do proprietário verificado `marcos.rubo@gmail.com`. Dados carregados antes por outra conta Geral continuam vinculados àquele proprietário. Com a conta de Marcos, conferir o acervo que aparece nos módulos e a carga de alunos/faltas. Validar na Vercel o primeiro acesso presencial, entrada posterior, alteração de senha, permissões de cada módulo, bloqueio por URL e perda de acesso administrativo ao desconectar uma das duas contas. SQL remoto e validação visual ficam pendentes nesta entrega.

## Log do sistema — 18/11/2026

Cada carregamento da página principal, inclusive antes da identificação, envia uma requisição para registrar `Acessando o sistema` em **LogDoSistema**. Data e hora vêm do banco no fuso de Brasília. A coluna IP guarda o endereço público observado pela Vercel, em IPv4 ou IPv6. Se a Vercel estiver sem endereço válido, a coluna fica vazia. **Observacao** guarda categorias aproximadas, como `Celular · Android · Chrome`, quando o navegador fornece indícios. Quando a Vercel fornece a localização do IP, **Observacao** também registra cidade e sigla do estado ou região, por exemplo `Local aproximado: São Paulo/SP`. A operadora ou uma VPN pode fazer aparecer a localização da saída da rede. IPs podem ser compartilhados e as informações do navegador podem mudar. [Cabeçalhos de localização da Vercel](https://vercel.com/docs/headers/request-headers#x-vercel-ip-country-region)

A atualização manual do IP ou a troca de módulo não gera outra linha. Uma nova abertura ou recarga gera um novo registro. A escrita é feita pelo servidor, sem acesso direto do navegador à tabela. Se o registro falhar, a página continua disponível. A consulta é administrativa no Supabase, com remoção administrativa e sem expiração automática nesta versão.

Antes de publicar, executar `database/system-log.sql` no Supabase exclusivo do FAROL GE e publicar a política de privacidade revisão 27. A inclusão de cidade e estado usa a coluna Observacao já existente. Usa as variáveis existentes FAROL_ORIGIN, FAROL_SUPABASE_URL e FAROL_SUPABASE_SERVICE_ROLE_KEY. Na Vercel, abrir o endereço de FAROL_ORIGIN e conferir a linha no Table Editor ou com a consulta comentada no SQL.

## Conexões Google institucionais — 19/11/2026

A conta é escolhida no Google para Geral ou Pessoal. O FAROL valida o e-mail e a identidade Google, com e-mail verificado, assinatura, audiência, nonce e indicação de conta gerenciada pelo Workspace para endereços `@escola.pr.gov.br`. A autorização institucional é armazenada por identidade e tipo, e a pessoa pode desconectar a própria conta. Ao conectar, o FAROL confirma a identidade e os serviços concedidos. A preparação dos marcadores da Pessoal institucional depende do acesso a Demandas PESSOAIS. A preparação de GE_Anuais ocorre na conexão Geral, conforme a seção Demandas Anuais. A permissão Configurações permite administrar o cadastro sem Geral. A Conexão temporária permanece um fluxo distinto.

Sem novo SQL, escopo ou variável. Publicar código e política revisão 33 e validar as duas conexões na Vercel com uma conta institucional real. A autorização no domínio depende da política do Google Workspace da organização. [Validação de identidade Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)


### Permissões pela Pessoal institucional

Ao conectar uma Pessoal `@escola.pr.gov.br`, o backend busca o e-mail verificado em EmailsAutorizados e usa as permissões do cadastro em cada requisição. Com o e-mail ausente do cadastro, a conta pode conferir a conexão e acessar o BI SEED público. Alterar ou excluir o cadastro muda a liberação nas consultas seguintes. Com Configurações habilitada, a pessoa pode administrar cadastros, permissões e senhas sem Geral.

Demandas PESSOAIS e os totais pessoais da Visão GERAL usam a caixa institucional do próprio usuário e exigem as permissões Gmail correspondentes. Demandas PESSOAIS habilitada permite preparar os marcadores dessa caixa ao conectar ou revisar a autorização. Dados escolares e a fonte Geral dos módulos seguem o acervo e a autorização já usados na Conexão temporária. Desde 24/11/2026, a Geral institucional também pode atribuir permissões conforme a regra de acesso por módulo descrita ao final. Ocorrências usam o nome cadastrado e o e-mail Pessoal verificado na autoria.

Publicar com a política revisão 33. Sem novo SQL, variável ou escopo. Na Vercel, conferir perfil cadastrado, perfil sem cadastro, remoção de permissão, acesso por URL e resposta quando Gmail ainda não estiver autorizado.


## Inspetores/Monitores — abas de registro e consulta (24/11/2026)

**REGISTRAR** abre por padrão com a busca de alunos e o formulário de ocorrência. **CONSULTAR** carrega as ocorrências da mesma conta Geral usada pela Visão GERAL, em páginas de 20, das mais recentes para as mais antigas. Cada registro mostra data e hora de Brasília, aluno, turma, texto e autoria. Em telas estreitas, a consulta apresenta cartões e o registro posiciona a turma abaixo do nome do aluno.

`GET /api/google/inspector-occurrences` exige a permissão Inspetores/Monitores. A Visão GERAL continua usando sua rota e sua própria permissão. A nova rota reaproveita a consulta escolar e o cursor existentes. A lista é carregada ao abrir a aba e pode ser atualizada manualmente. Para publicar, enviar o código junto com a política de privacidade revisão 34. A entrega usa o banco, as variáveis e os escopos Google existentes.

### Exclusão de ocorrências (24/11/2026)

Em **Inspetores/Monitores → CONSULTAR**, **Excluir** aparece em cada linha ou cartão quando as conexões Geral e Pessoal verificadas são de `marcos.rubo@gmail.com`. Após a confirmação, o servidor verifica novamente as sessões e remove somente a ocorrência selecionada da conta Geral. A lista é atualizada após a resposta do servidor. A Visão GERAL reflete a remoção na próxima consulta.

A exclusão usa os filtros de proprietário e ID no Supabase e a autorização de escrita do servidor já configurada. Publicar com a Política de Privacidade revisão 38. Sem migração SQL ou mudança de escopos. [Filtros do Supabase](https://supabase.com/docs/reference/javascript/using-filters)

## Demandas Anuais (24/11/2026)

Demandas INSTITUCIONAIS apresenta **Caixa de Entrada**, **Classificadas**, **Anuais** e **Arquivadas**, nessa ordem. Marcar **Demanda ANUAL** em uma mensagem da entrada abre um formulário de observações e procedimentos. Após a confirmação, o servidor grava o texto e aplica o marcador `GE_Anuais` à mensagem individual, retirando-a da Caixa de Entrada. Cancelar fecha o formulário sem movimentar a mensagem.

As observações são obrigatórias, aceitam várias linhas e têm limite de 4.000 caracteres. Ficam vinculadas à mensagem em um campo criptografado da tabela de acompanhamento institucional já existente. O botão **Arquivar** retira `GE_Anuais` e aplica `GE_Arquivadas`, mantendo as observações disponíveis no cartão, os demais marcadores alheios ao fluxo e o estado de leitura. Anuais segue a ordem de recebimento da mais recente para a mais antiga e usa páginas de 20 mensagens.

A conexão Geral verifica e cria `GE_Anuais` se estiver ausente. Em uma conexão Geral já autorizada para Demandas INSTITUCIONAIS, **Preparar marcadores** também cria o marcador, caso esteja ausente. A preparação usa o escopo Gmail já concedido; a tabela existente recebe as observações no campo criptografado, sem migração de SQL.

Publicar com a Política de Privacidade revisão 35. Na Vercel, conferir a preparação de `GE_Anuais`, registrar uma demanda de teste e atualizar o quadro para conferir as observações. Arquivar a mesma demanda e conferir as observações e os marcadores no Gmail e no FAROL.


## Acesso por módulo pelas conexões Geral e Pessoal (24/11/2026)

Para cada módulo, o FAROL consulta primeiro a permissão do cadastro vinculado ao e-mail Google verificado da Geral e depois a da Pessoal. Uma permissão marcada em qualquer dos dois cadastros libera o módulo. Se nenhuma liberar, o menu exibe **Módulo indisponível**. A autorização é conferida no servidor a cada requisição protegida. As duas contas de Marcos continuam concedendo o acesso administrativo previsto anteriormente. A Conexão temporária continua usando seu cadastro, e o BI SEED mantém o acesso público.

Se o cadastro da Geral libera Demandas INSTITUCIONAIS, o quadro consulta e movimenta mensagens na caixa dessa Geral, e prazos e observações ficam associados à mesma identidade. O botão **Preparar marcadores** cria somente os ausentes nessa caixa. Quando a permissão para Demandas INSTITUCIONAIS vem apenas da Pessoal ou da Conexão temporária, o quadro usa a fonte escolar configurada anteriormente. Nas sessões Google, Demandas PESSOAIS utiliza a caixa Pessoal conectada. As ocorrências da Visão GERAL e os dados escolares de Radar, Manutenção e Inspetores/Monitores continuam usando a fonte escolar existente. Em Configurações e na autoria de ocorrências, vale o cadastro que concedeu a permissão, com prioridade da Geral.

Publicar com a Política de Privacidade revisão 36. Sem migração SQL, escopo ou variável novos.


## Contas e totais da Visão GERAL (24/11/2026)

Em uma sessão Google com Visão GERAL habilitada, o quadro **E-mails da ESCOLA** usa a conta conectada como Geral e o quadro **E-mails PESSOAIS** usa a conta conectada como Pessoal. Se não houver uma Geral ativa, permanece disponível a fonte escolar configurada para o acesso autorizado. Uma falha ao verificar a Geral ativa é sinalizada sem substituí-la por outra caixa. A Conexão temporária mantém sua fonte escolar, assim como o quadro de ocorrências.

O quadro da escola mostra **Caixa de Entrada**, **Classificadas**, **Anuais** e **Arquivadas**. O total de Anuais vem de `messagesTotal` para `GE_Anuais`, da mesma conta Geral que fornece os demais indicadores. Marcadores ausentes aparecem com traço. Publicar com a política de privacidade revisão 37. Sem novo SQL, variável ou escopo.

## Arquivo Morto nas demandas (26/11/2026)

Ao conectar ou revisar a autorização, a Geral verifica `GE_ArquivoMorto_Geral` e a Pessoal verifica `GE_ArquivoMorto_Pessoal`. Cada conexão cria seu marcador somente quando ele está ausente e a permissão Gmail correspondente foi concedida. **Preparar marcadores** também prepara o Arquivo Morto da caixa usada por Demandas INSTITUCIONAIS. Consultar status e abrir as listas são operações de leitura.

- **Demandas INSTITUCIONAIS:** **Arquivo Morto** aparece na Caixa de Entrada, em Classificadas, Anuais e Arquivadas. Aplica `GE_ArquivoMorto_Geral` e retira os marcadores dessas quatro listas da mensagem escolhida.
- **Demandas PESSOAIS:** **Arquivo Morto** aparece em ME DEVEM, MINHAS, DEVO, Caixa de entrada e Despachadas. Nas três categorias, o botão abre a conversa para escolher a mensagem. Aplica `GE_ArquivoMorto_Pessoal` e retira INBOX, Despachadas e as três categorias da mensagem escolhida. As demais mensagens mantêm suas etiquetas.

Os e-mails movidos ficam disponíveis no marcador correspondente no Gmail. As duas operações preservam o estado de leitura, os demais marcadores e os dados de acompanhamento no FAROL. Usam as permissões e fontes de caixa já definidas por módulo. Publicar com a Política de Privacidade revisão 40. Sem alteração de SQL, escopos ou variáveis. Na Vercel, usar **Revisar autorização** nas conexões já abertas e conferir o destino de uma mensagem de teste de cada lista no Gmail.

### Consulta e retorno do Arquivo Morto (26/11/2026)

Em **Demandas INSTITUCIONAIS**, a lista Arquivo Morto fica abaixo de Caixa de Entrada, Classificadas, Anuais e Arquivadas. Em **Demandas PESSOAIS**, Caixa de Entrada e Despachadas ficam lado a lado abaixo de ME DEVEM, MINHAS e DEVO. Em telas estreitas, Caixa de Entrada vem acima de Despachadas. A lista Arquivo Morto pessoal fica abaixo de ambas.

O Arquivo Morto usa o marcador da caixa autorizada de cada módulo e carrega até 20 mensagens por página. **Voltar p/ Cx Entrada** aplica `INBOX` e remove apenas o marcador de Arquivo Morto da mensagem escolhida. O servidor confirma a permissão e a conta e verifica a movimentação antes de atualizar as listas. A operação preserva as outras etiquetas, o estado de leitura e o acompanhamento salvo. [API de marcadores por mensagem do Gmail](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/modify)

Sem novo SQL, escopo ou variável. Publicar com a Política de Privacidade revisão 41. Na Vercel, conferir a ordem das listas em telas largas e estreitas e testar o retorno de uma mensagem em cada conexão.

### Arquivo Morto pelo menu (26/11/2026)

O menu **Arquivo Morto**, logo abaixo do divisor e acima de Manutenção do Sistema, abre uma confirmação que identifica a conta Pessoal. Depois da primeira confirmação, um diálogo sobreposto pede a confirmação final e destaca o aviso em vermelho sobre fundo amarelo. Cancelar na primeira tela volta à tela anterior. Cancelar no diálogo volta à primeira confirmação.

Após a confirmação final, o navegador solicita uma movimentação por vez. Cada requisição verifica a permissão **Arquivo Morto** e a conexão Pessoal própria, resolve `GE_ArquivoMorto_Pessoal` e consulta a próxima mensagem de INBOX. A consulta sempre parte do início da caixa, de modo que mensagens que chegam durante a execução também podem entrar na fila. A operação segue a movimentação individual do FAROL e preserva o estado de leitura, os demais marcadores e o acompanhamento. Rascunhos, spam e lixeira ficam fora da operação. [Listagem de mensagens no Gmail](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list)

A tela de acompanhamento lista remetente, destinatário, data em horário de Brasília e assunto das mensagens confirmadas, sem armazenar esses dados no FAROL. Cancelar interrompe o envio de novas requisições imediatamente. A requisição já iniciada ainda pode concluir, e o FAROL informa seu resultado quando o Gmail responde. As mensagens já movidas ficam disponíveis em **Demandas PESSOAIS → Arquivo Morto**, com a opção de retorno individual. Sair da tela também encerra o processamento da fila no navegador.

Antes de liberar a opção a outros usuários, executar o arquivo atualizado `database/module-access.sql` no Supabase exclusivo do FAROL GE e marcar **Arquivo Morto** no cadastro autorizado. A migração preserva os cadastros e suas permissões atuais. Marcos recebe a opção com suas duas conexões verificadas. Publicar com a Política de Privacidade revisão 42. A alteração usa os escopos e variáveis já configurados. Na Vercel, validar as confirmações, o uso da conexão Pessoal, a sequência das mensagens e o cancelamento com uma caixa de teste.
